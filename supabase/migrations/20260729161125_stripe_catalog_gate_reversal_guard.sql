-- Round 2 — núcleo de pagamento na raiz (defesa em profundidade no SQL).
-- VLT2-001: RPC de assinatura recusa Premium sem assinatura+preço de catálogo.
-- VLT2-002: RPC aceita "sem assinatura válida" (assinatura/estado nulos) e remove Premium.
-- VLT2-003: tabela de reversões (tombstone por PaymentIntent) + verificação antes
--           de conceder crédito, independente da ordem dos eventos.

-- ---------------------------------------------------------------------------
-- VLT2-003: tombstone de reembolso/chargeback, independente da compra existir.
-- ---------------------------------------------------------------------------
create table if not exists public.stripe_payment_reversals (
  payment_intent_id text primary key,
  reason text not null check (reason in ('refunded', 'disputed')),
  event_created bigint not null,
  recorded_at timestamptz not null default clock_timestamp()
);
alter table public.stripe_payment_reversals enable row level security;
revoke all on public.stripe_payment_reversals from public, anon, authenticated;

-- Concessão de pacote: recusa se o PaymentIntent já foi revertido (qualquer ordem).
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

  -- VLT2-003: pagamento já revertido nunca concede crédito, mesmo que o evento
  -- de reversão tenha chegado antes deste.
  if exists (
    select 1 from public.stripe_payment_reversals where payment_intent_id = payment_intent_value
  ) then
    update public.processed_stripe_events set result_code = 'reversed_before_grant' where id = event_id;
    return jsonb_build_object('result', 'reversed_before_grant');
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

-- Reversão: grava SEMPRE o tombstone (mesmo sem a compra existir), mantendo o
-- evento mais recente; e estorna créditos se a compra já existia e estava paga.
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

  -- VLT2-003: tombstone por PaymentIntent, criado independentemente de existir
  -- compra. Uma concessão futura consulta esta tabela e recusa.
  insert into public.stripe_payment_reversals (payment_intent_id, reason, event_created)
  values (payment_intent_value, reason_value, event_created)
  on conflict (payment_intent_id) do update
    set reason = excluded.reason,
        event_created = greatest(public.stripe_payment_reversals.event_created, excluded.event_created),
        recorded_at = clock_timestamp();

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

-- ---------------------------------------------------------------------------
-- VLT2-001/002: evento de assinatura. Premium só com correspondência de catálogo
-- (assinatura + preço + mercado não nulos); aceita "sem assinatura válida"
-- (nulos) para REMOVER Premium. Falha fechada.
-- ---------------------------------------------------------------------------
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
     or (subscription_id_value is not null and subscription_id_value !~ '^sub_')
     or (status_value is not null and status_value not in (
       'active', 'trialing', 'past_due', 'unpaid', 'paused',
       'canceled', 'incomplete', 'incomplete_expired'
     ))
     or (currency_value is not null and currency_value not in ('brl', 'eur'))
     or (market_value is not null and market_value not in ('BR', 'PT_EU')) then
    raise exception using errcode = '22023', message = 'invalid_subscription_event';
  end if;

  -- Falha fechada: não conceder Premium sem assinatura + preço + mercado de catálogo.
  if premium_value is true and (
       subscription_id_value is null or price_id_value is null
       or price_id_value !~ '^price_' or currency_value is null or market_value is null
     ) then
    raise exception using errcode = '22023', message = 'premium_without_catalog_match';
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
    update public.processed_stripe_events set result_code = 'customer_not_mapped' where id = event_id;
    return jsonb_build_object('result', 'customer_not_mapped');
  end if;

  if affected = 0 then
    update public.processed_stripe_events set result_code = 'stale_ignored' where id = event_id;
    return jsonb_build_object('result', 'stale_ignored');
  end if;

  return jsonb_build_object('result', 'processed');
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
     or (subscription_id_value is not null and subscription_id_value !~ '^sub_')
     or (status_value is not null and status_value not in (
       'active', 'trialing', 'past_due', 'unpaid', 'paused',
       'canceled', 'incomplete', 'incomplete_expired'
     ))
     or reconciled_at_value <= 0 then
    raise exception using errcode = '22023', message = 'invalid_reconciliation_snapshot';
  end if;
  if premium_value is true and (
       subscription_id_value is null or price_id_value is null
       or price_id_value !~ '^price_' or currency_value is null or market_value is null
     ) then
    raise exception using errcode = '22023', message = 'premium_without_catalog_match';
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
