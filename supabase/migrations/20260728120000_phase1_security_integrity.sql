-- Veleda Fase 1 — VLT-003, VLT-004, VLT-005 e VLT-006.
-- Migration LOCAL. Não aplicar automaticamente a nenhum projeto remoto.

-- ---------------------------------------------------------------------------
-- Consentimentos/aceites append-only, criados pelo trigger de Auth.
-- ---------------------------------------------------------------------------

create table public.user_consents (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  document_type text not null check (document_type in (
    'terms_acceptance',
    'privacy_acknowledgement',
    'age_18_declaration',
    'optional_consent'
  )),
  document_version text not null,
  document_fingerprint text not null,
  accepted boolean not null check (accepted),
  recorded_at timestamptz not null default clock_timestamp(),
  origin text not null check (origin in ('signup_web', 'reauth_web', 'account_web')),
  locale text not null check (locale in ('pt-BR', 'pt-PT')),
  market text check (market in ('BR', 'PT_EU')),
  context jsonb not null default '{}'::jsonb,
  unique (user_id, document_type, document_version)
);

alter table public.user_consents enable row level security;

create policy "ver os proprios aceites"
  on public.user_consents for select
  to authenticated
  using (auth.uid() = user_id);

revoke all on public.user_consents from public, anon, authenticated;
grant select on public.user_consents to authenticated;

-- Os valores abaixo correspondem aos documentos públicos desta fase.
-- O cliente informa somente o gesto de aceite; versão, hash, user e data
-- são determinados aqui, no servidor.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  requested_locale text;
  requested_market text;
begin
  if coalesce((new.raw_user_meta_data->>'accept_terms')::boolean, false) is not true
     or coalesce((new.raw_user_meta_data->>'acknowledge_privacy')::boolean, false) is not true
     or coalesce((new.raw_user_meta_data->>'declare_age_18')::boolean, false) is not true then
    raise exception using errcode = '23514', message = 'required_acceptances_missing';
  end if;

  requested_locale := case
    when new.raw_user_meta_data->>'locale' = 'pt-PT' then 'pt-PT'
    else 'pt-BR'
  end;
  requested_market := case
    when new.raw_user_meta_data->>'market' in ('BR', 'PT_EU')
      then new.raw_user_meta_data->>'market'
    else null
  end;

  insert into public.profiles (id, display_name)
  values (new.id, nullif(new.raw_user_meta_data->>'display_name', ''));

  insert into public.user_consents (
    user_id, document_type, document_version, document_fingerprint,
    accepted, origin, locale, market
  )
  values
    (new.id, 'terms_acceptance', 'terms-2026-07-28',
      'version:terms-2026-07-28', true, 'signup_web', requested_locale, requested_market),
    (new.id, 'privacy_acknowledgement', 'privacy-2026-07-28',
      'version:privacy-2026-07-28', true, 'signup_web', requested_locale, requested_market),
    (new.id, 'age_18_declaration', 'age-18-declaration-2026-07-28',
      'version:declaro-ter-18-anos-ou-mais-2026-07-28', true, 'signup_web', requested_locale, requested_market);

  return new;
end;
$$;

revoke update (terms_version, terms_accepted_at) on public.profiles from authenticated, anon;

-- ---------------------------------------------------------------------------
-- Reserva atômica de quota antes da chamada à IA.
-- Semana civil: segunda 00:00 UTC até a segunda seguinte.
-- ---------------------------------------------------------------------------

create table public.reading_reservations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  idempotency_key text not null,
  request_hash text not null,
  entitlement text not null check (entitlement in ('free', 'premium', 'credit')),
  quota_week_start date,
  status text not null check (status in ('reserved', 'completed', 'released')),
  reading_id uuid references public.readings(id) on delete set null,
  created_at timestamptz not null default clock_timestamp(),
  expires_at timestamptz not null,
  completed_at timestamptz,
  released_at timestamptz,
  unique (user_id, idempotency_key)
);

create unique index reading_reservations_free_week_uidx
  on public.reading_reservations (user_id, quota_week_start)
  where entitlement = 'free' and status in ('reserved', 'completed');

create index reading_reservations_rate_idx
  on public.reading_reservations (user_id, created_at desc);

alter table public.reading_reservations enable row level security;
revoke all on public.reading_reservations from public, anon, authenticated;

-- Não reabre quota para quem já leu na semana da implantação.
insert into public.reading_reservations (
  user_id, idempotency_key, request_hash, entitlement,
  quota_week_start, status, reading_id, expires_at, completed_at, created_at
)
select distinct on (r.user_id, date_trunc('week', timezone('UTC', r.created_at))::date)
  r.user_id,
  'migration:' || r.id::text,
  'migration:' || r.id::text,
  'free',
  date_trunc('week', timezone('UTC', r.created_at))::date,
  'completed',
  r.id,
  r.created_at,
  r.created_at,
  r.created_at
from public.readings r
order by r.user_id, date_trunc('week', timezone('UTC', r.created_at))::date, r.created_at;

create or replace function public.reserve_reading_request(
  uid uuid,
  idem text,
  req_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  existing public.reading_reservations%rowtype;
  profile_row public.profiles%rowtype;
  reservation_id uuid;
  entitlement_value text;
  week_start date := date_trunc('week', timezone('UTC', clock_timestamp()))::date;
  now_value timestamptz := clock_timestamp();
  expired_credit_count int;
begin
  if uid is null or idem is null or length(idem) < 16 or length(idem) > 128
     or idem !~ '^[A-Za-z0-9._:-]+$'
     or req_hash is null or length(req_hash) < 16 or length(req_hash) > 128 then
    raise exception using errcode = '22023', message = 'invalid_reservation_arguments';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(uid::text, 8217));

  select * into existing
    from public.reading_reservations
   where user_id = uid and idempotency_key = idem;

  if found then
    if existing.request_hash <> req_hash then
      return jsonb_build_object('result', 'idempotency_conflict');
    end if;
    if existing.status = 'completed' then
      return jsonb_build_object(
        'result', 'completed',
        'reservation_id', existing.id,
        'reading_id', existing.reading_id
      );
    end if;
    if existing.status = 'reserved' and existing.expires_at > now_value then
      return jsonb_build_object(
        'result', 'in_progress',
        'reservation_id', existing.id,
        'entitlement', existing.entitlement
      );
    end if;
    if existing.status = 'released' then
      return jsonb_build_object('result', 'reservation_released');
    end if;
  end if;

  -- Libera reservas abandonadas uma única vez e estorna créditos pagos.
  with released as (
    update public.reading_reservations
       set status = 'released', released_at = now_value
     where user_id = uid and status = 'reserved' and expires_at <= now_value
     returning entitlement
  )
  select count(*) filter (where entitlement = 'credit')
    into expired_credit_count
    from released;

  select * into profile_row
    from public.profiles
   where id = uid
   for update;
  if not found then
    return jsonb_build_object('result', 'user_not_found');
  end if;

  if expired_credit_count > 0 then
    update public.profiles
       set reading_credits = reading_credits + expired_credit_count
     where id = uid;
    profile_row.reading_credits := profile_row.reading_credits + expired_credit_count;
  end if;

  if existing.id is not null then
    return jsonb_build_object('result', 'reservation_expired');
  end if;

  if (
    select count(*) from public.reading_reservations
     where user_id = uid and created_at > now_value - interval '1 minute'
  ) >= 5 then
    return jsonb_build_object('result', 'rate_limited', 'window', 'minute');
  end if;
  if (
    select count(*) from public.reading_reservations
     where user_id = uid and created_at > now_value - interval '1 hour'
  ) >= 20 then
    return jsonb_build_object('result', 'rate_limited', 'window', 'hour');
  end if;
  if (
    select count(*) from public.reading_reservations
     where user_id = uid and status = 'reserved' and expires_at > now_value
  ) >= 2 then
    return jsonb_build_object('result', 'concurrency_limited');
  end if;
  if (
    select count(*) from public.reading_reservations
     where created_at > now_value - interval '1 day'
  ) >= 5000 then
    return jsonb_build_object('result', 'operational_budget_exhausted');
  end if;

  if profile_row.is_premium then
    if (
      select count(*) from public.reading_reservations
       where user_id = uid and created_at > now_value - interval '1 day'
    ) >= 100 then
      return jsonb_build_object('result', 'rate_limited', 'window', 'day');
    end if;
    entitlement_value := 'premium';
  elsif not exists (
    select 1 from public.reading_reservations
     where user_id = uid
       and entitlement = 'free'
       and quota_week_start = week_start
       and status in ('reserved', 'completed')
  ) then
    entitlement_value := 'free';
  elsif profile_row.reading_credits > 0
    and profile_row.reading_credits_expire_at > now_value then
    update public.profiles
       set reading_credits = reading_credits - 1
     where id = uid;
    entitlement_value := 'credit';
  else
    return jsonb_build_object('result', 'quota_exceeded');
  end if;

  insert into public.reading_reservations (
    user_id, idempotency_key, request_hash, entitlement,
    quota_week_start, status, expires_at
  )
  values (
    uid, idem, req_hash, entitlement_value,
    case when entitlement_value = 'free' then week_start else null end,
    'reserved', now_value + interval '3 minutes'
  )
  returning id into reservation_id;

  return jsonb_build_object(
    'result', 'reserved',
    'reservation_id', reservation_id,
    'entitlement', entitlement_value
  );
end;
$$;

create or replace function public.release_reading_request(
  uid uuid,
  reservation uuid
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  released_entitlement text;
begin
  perform pg_advisory_xact_lock(hashtextextended(uid::text, 8217));
  update public.reading_reservations
     set status = 'released', released_at = clock_timestamp()
   where id = reservation and user_id = uid and status = 'reserved'
  returning entitlement into released_entitlement;
  if not found then return false; end if;
  if released_entitlement = 'credit' then
    update public.profiles set reading_credits = reading_credits + 1 where id = uid;
  end if;
  return true;
end;
$$;

create or replace function public.complete_reading_request(
  uid uuid,
  reservation uuid,
  question_value text,
  cards_value jsonb,
  reading_text_value text,
  model_value text
)
returns public.readings
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  reservation_row public.reading_reservations%rowtype;
  reading_row public.readings%rowtype;
begin
  perform pg_advisory_xact_lock(hashtextextended(uid::text, 8217));
  select * into reservation_row
    from public.reading_reservations
   where id = reservation and user_id = uid
   for update;

  if not found or reservation_row.status <> 'reserved'
     or reservation_row.expires_at <= clock_timestamp() then
    raise exception using errcode = 'P0001', message = 'reservation_not_active';
  end if;
  if length(question_value) < 1 or length(question_value) > 500
     or jsonb_typeof(cards_value) <> 'array'
     or jsonb_array_length(cards_value) <> 3
     or length(reading_text_value) < 1
     or length(reading_text_value) > 20000 then
    raise exception using errcode = '22023', message = 'invalid_reading_result';
  end if;

  insert into public.readings (user_id, question, cards, reading_text, model)
  values (uid, question_value, cards_value, reading_text_value, model_value)
  returning * into reading_row;

  update public.reading_reservations
     set status = 'completed',
         reading_id = reading_row.id,
         completed_at = clock_timestamp()
   where id = reservation;

  return reading_row;
end;
$$;

revoke execute on function public.reserve_reading_request(uuid, text, text) from public, anon, authenticated;
revoke execute on function public.release_reading_request(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.complete_reading_request(uuid, uuid, text, jsonb, text, text) from public, anon, authenticated;
grant execute on function public.reserve_reading_request(uuid, text, text) to service_role;
grant execute on function public.release_reading_request(uuid, uuid) to service_role;
grant execute on function public.complete_reading_request(uuid, uuid, text, jsonb, text, text) to service_role;

-- ---------------------------------------------------------------------------
-- Stripe: evento + benefício/estado na mesma transação e ordenação temporal.
-- ---------------------------------------------------------------------------

alter table public.processed_stripe_events
  add column if not exists event_created bigint,
  add column if not exists object_id text,
  add column if not exists result_code text,
  add column if not exists livemode boolean,
  add column if not exists currency text,
  add column if not exists unit_amount bigint,
  add column if not exists price_id text,
  add column if not exists market text;

alter table public.profiles
  add column if not exists stripe_subscription_status text,
  add column if not exists stripe_event_created_at bigint,
  add column if not exists stripe_price_id text,
  add column if not exists stripe_currency text,
  add column if not exists stripe_unit_amount bigint,
  add column if not exists stripe_market text,
  add column if not exists stripe_current_period_end timestamptz,
  add column if not exists last_payment_currency text,
  add column if not exists last_payment_unit_amount bigint,
  add column if not exists last_payment_price_id text,
  add column if not exists last_payment_market text;

create table public.stripe_payment_purchases (
  payment_intent_id text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  granted_quantity int not null check (granted_quantity > 0),
  currency text not null check (currency in ('brl', 'eur')),
  unit_amount bigint not null check (unit_amount > 0),
  price_id text not null,
  market text not null check (market in ('BR', 'PT_EU')),
  status text not null check (status in ('paid', 'refunded', 'disputed')),
  stripe_event_created_at bigint not null,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp()
);
alter table public.stripe_payment_purchases enable row level security;
revoke all on public.stripe_payment_purchases from public, anon, authenticated;

create or replace function public.process_stripe_pack_event(
  event_id text,
  event_created bigint,
  payment_intent_value text,
  uid uuid,
  qty int,
  valid_days int,
  currency_value text,
  unit_amount_value bigint,
  price_id_value text,
  market_value text,
  livemode_value boolean
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  inserted_event text;
begin
  if event_id is null or event_id !~ '^evt_'
     or event_created <= 0
     or payment_intent_value is null or payment_intent_value !~ '^pi_'
     or uid is null
     or qty <> 5 or valid_days <> 30
     or currency_value not in ('brl', 'eur')
     or unit_amount_value <= 0
     or price_id_value is null or price_id_value !~ '^price_'
     or market_value not in ('BR', 'PT_EU')
     or (market_value = 'BR' and currency_value <> 'brl')
     or (market_value = 'PT_EU' and currency_value <> 'eur') then
    raise exception using errcode = '22023', message = 'invalid_pack_event';
  end if;
  if not exists (select 1 from public.profiles where id = uid) then
    raise exception using errcode = '23503', message = 'pack_user_not_found';
  end if;

  insert into public.processed_stripe_events (
    id, kind, event_created, object_id, result_code, livemode,
    currency, unit_amount, price_id, market
  )
  values (
    event_id, 'pack_grant', event_created, payment_intent_value, 'processed', livemode_value,
    currency_value, unit_amount_value, price_id_value, market_value
  )
  on conflict (id) do nothing
  returning id into inserted_event;

  if inserted_event is null then
    return jsonb_build_object('result', 'duplicate');
  end if;

  insert into public.stripe_payment_purchases (
    payment_intent_id, user_id, granted_quantity, currency, unit_amount,
    price_id, market, status, stripe_event_created_at
  )
  values (
    payment_intent_value, uid, qty, currency_value, unit_amount_value,
    price_id_value, market_value, 'paid', event_created
  )
  on conflict (payment_intent_id) do nothing;
  if not found then
    raise exception using errcode = '23505', message = 'payment_intent_already_granted';
  end if;

  update public.profiles
     set reading_credits = greatest(reading_credits, 0) + qty,
         reading_credits_expire_at = clock_timestamp() + make_interval(days => valid_days),
         last_payment_currency = currency_value,
         last_payment_unit_amount = unit_amount_value,
         last_payment_price_id = price_id_value,
         last_payment_market = market_value
   where id = uid;
  if not found then
    raise exception using errcode = 'P0001', message = 'pack_grant_failed';
  end if;

  return jsonb_build_object('result', 'processed', 'quantity', qty);
end;
$$;

create or replace function public.reverse_stripe_pack_event(
  event_id text,
  event_created bigint,
  payment_intent_value text,
  reason_value text,
  livemode_value boolean
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  purchase_row public.stripe_payment_purchases%rowtype;
  inserted_event text;
begin
  if event_id is null or event_id !~ '^evt_'
     or event_created <= 0
     or payment_intent_value is null or payment_intent_value !~ '^pi_'
     or reason_value not in ('refunded', 'disputed') then
    raise exception using errcode = '22023', message = 'invalid_pack_reversal';
  end if;

  select * into purchase_row
    from public.stripe_payment_purchases
   where payment_intent_id = payment_intent_value
   for update;
  if not found then
    insert into public.processed_stripe_events (
      id, kind, event_created, object_id, result_code, livemode
    )
    values (
      event_id, 'payment_' || reason_value, event_created, payment_intent_value,
      'purchase_not_found', livemode_value
    )
    on conflict (id) do nothing
    returning id into inserted_event;
    if inserted_event is null then
      return jsonb_build_object('result', 'duplicate');
    end if;
    return jsonb_build_object('result', 'purchase_not_found');
  end if;

  insert into public.processed_stripe_events (
    id, kind, event_created, object_id, result_code, livemode,
    currency, unit_amount, price_id, market
  )
  values (
    event_id, 'pack_' || reason_value, event_created, payment_intent_value,
    'processed', livemode_value, purchase_row.currency,
    purchase_row.unit_amount, purchase_row.price_id, purchase_row.market
  )
  on conflict (id) do nothing
  returning id into inserted_event;
  if inserted_event is null then
    return jsonb_build_object('result', 'duplicate');
  end if;

  if purchase_row.status = 'paid' then
    update public.profiles
       set reading_credits = greatest(reading_credits - purchase_row.granted_quantity, 0)
     where id = purchase_row.user_id;
    if not found then
      raise exception using errcode = 'P0001', message = 'pack_reversal_failed';
    end if;
  end if;

  update public.stripe_payment_purchases
     set status = reason_value,
         stripe_event_created_at = greatest(stripe_event_created_at, event_created),
         updated_at = clock_timestamp()
   where payment_intent_id = payment_intent_value;

  return jsonb_build_object('result', 'processed');
end;
$$;

create or replace function public.process_stripe_subscription_event(
  event_id text,
  event_created bigint,
  customer_id_value text,
  subscription_id_value text,
  status_value text,
  premium_value boolean,
  price_id_value text,
  currency_value text,
  unit_amount_value bigint,
  market_value text,
  current_period_end_value timestamptz,
  livemode_value boolean
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  inserted_event text;
  affected int;
begin
  if event_id is null or event_id !~ '^evt_'
     or event_created <= 0
     or customer_id_value is null or customer_id_value !~ '^cus_'
     or subscription_id_value is null or subscription_id_value !~ '^sub_'
     or status_value not in (
       'active', 'trialing', 'past_due', 'unpaid', 'paused',
       'canceled', 'incomplete', 'incomplete_expired'
     )
     or (currency_value is not null and currency_value not in ('brl', 'eur'))
     or (market_value is not null and market_value not in ('BR', 'PT_EU')) then
    raise exception using errcode = '22023', message = 'invalid_subscription_event';
  end if;

  insert into public.processed_stripe_events (
    id, kind, event_created, object_id, result_code, livemode,
    currency, unit_amount, price_id, market
  )
  values (
    event_id, 'subscription_sync', event_created, subscription_id_value,
    'processed', livemode_value, currency_value, unit_amount_value,
    price_id_value, market_value
  )
  on conflict (id) do nothing
  returning id into inserted_event;

  if inserted_event is null then
    return jsonb_build_object('result', 'duplicate');
  end if;

  update public.profiles
     set is_premium = premium_value,
         stripe_subscription_id = subscription_id_value,
         stripe_subscription_status = status_value,
         stripe_event_created_at = event_created,
         stripe_price_id = price_id_value,
         stripe_currency = currency_value,
         stripe_unit_amount = unit_amount_value,
         stripe_market = market_value,
         stripe_current_period_end = current_period_end_value
   where stripe_customer_id = customer_id_value
     and coalesce(stripe_event_created_at, 0) <= event_created;
  get diagnostics affected = row_count;

  if affected = 0 and not exists (
    select 1 from public.profiles where stripe_customer_id = customer_id_value
  ) then
    update public.processed_stripe_events
       set result_code = 'customer_not_mapped'
     where id = event_id;
    return jsonb_build_object('result', 'customer_not_mapped');
  end if;

  if affected = 0 then
    update public.processed_stripe_events
       set result_code = 'stale_ignored'
     where id = event_id;
    return jsonb_build_object('result', 'stale_ignored');
  end if;

  return jsonb_build_object('result', 'processed');
end;
$$;

create or replace function public.record_stripe_event(
  event_id text,
  event_created bigint,
  kind_value text,
  object_id_value text,
  result_value text,
  livemode_value boolean
)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare inserted_event text;
begin
  if event_id is null or event_id !~ '^evt_' or event_created <= 0
     or length(kind_value) > 80 or length(result_value) > 80 then
    raise exception using errcode = '22023', message = 'invalid_stripe_event';
  end if;
  insert into public.processed_stripe_events (
    id, kind, event_created, object_id, result_code, livemode
  )
  values (
    event_id, kind_value, event_created, object_id_value, result_value, livemode_value
  )
  on conflict (id) do nothing
  returning id into inserted_event;
  return case when inserted_event is null then 'duplicate' else result_value end;
end;
$$;

create or replace function public.reconcile_stripe_subscription(
  customer_id_value text,
  subscription_id_value text,
  status_value text,
  premium_value boolean,
  price_id_value text,
  currency_value text,
  unit_amount_value bigint,
  market_value text,
  current_period_end_value timestamptz,
  reconciled_at_value bigint
)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if customer_id_value is null or customer_id_value !~ '^cus_'
     or subscription_id_value is null or subscription_id_value !~ '^sub_'
     or status_value not in (
       'active', 'trialing', 'past_due', 'unpaid', 'paused',
       'canceled', 'incomplete', 'incomplete_expired'
     )
     or reconciled_at_value <= 0 then
    raise exception using errcode = '22023', message = 'invalid_reconciliation_snapshot';
  end if;
  update public.profiles
     set is_premium = premium_value,
         stripe_subscription_id = subscription_id_value,
         stripe_subscription_status = status_value,
         stripe_event_created_at = greatest(coalesce(stripe_event_created_at, 0), reconciled_at_value),
         stripe_price_id = price_id_value,
         stripe_currency = currency_value,
         stripe_unit_amount = unit_amount_value,
         stripe_market = market_value,
         stripe_current_period_end = current_period_end_value
   where stripe_customer_id = customer_id_value;
  return case when found then 'reconciled' else 'customer_not_mapped' end;
end;
$$;

revoke execute on function public.process_stripe_pack_event(text, bigint, text, uuid, int, int, text, bigint, text, text, boolean) from public, anon, authenticated;
revoke execute on function public.reverse_stripe_pack_event(text, bigint, text, text, boolean) from public, anon, authenticated;
revoke execute on function public.process_stripe_subscription_event(text, bigint, text, text, text, boolean, text, text, bigint, text, timestamptz, boolean) from public, anon, authenticated;
revoke execute on function public.record_stripe_event(text, bigint, text, text, text, boolean) from public, anon, authenticated;
revoke execute on function public.reconcile_stripe_subscription(text, text, text, boolean, text, text, bigint, text, timestamptz, bigint) from public, anon, authenticated;
grant execute on function public.process_stripe_pack_event(text, bigint, text, uuid, int, int, text, bigint, text, text, boolean) to service_role;
grant execute on function public.reverse_stripe_pack_event(text, bigint, text, text, boolean) to service_role;
grant execute on function public.process_stripe_subscription_event(text, bigint, text, text, text, boolean, text, text, bigint, text, timestamptz, boolean) to service_role;
grant execute on function public.record_stripe_event(text, bigint, text, text, text, boolean) to service_role;
grant execute on function public.reconcile_stripe_subscription(text, text, text, boolean, text, text, bigint, text, timestamptz, bigint) to service_role;
