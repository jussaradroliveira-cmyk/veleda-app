-- VLT2-004: ledger de créditos POR LOTE (pacote avulso). Antes, os créditos eram
-- um único inteiro no perfil com uma única validade global:
--   (bug 1) nova compra somava qty e REDEFINIA a validade de tudo → créditos
--           expirados "ressuscitavam";
--   (bug 2) o estorno subtraía a quantidade do lote do saldo GLOBAL, podendo
--           retirar créditos legítimos de outro lote.
--
-- Agora cada compra (linha em stripe_payment_purchases) é um lote com o seu
-- próprio saldo restante e a sua própria validade. Regras confirmadas:
--   • Consumo FIFO por validade (gasta primeiro o lote que expira mais cedo).
--   • Estorno/chargeback (opção A): remove só os créditos NÃO USADOS daquele lote
--     (credits_remaining := 0); nunca toca em lotes diferentes nem em créditos já
--     consumidos.
--
-- profiles.reading_credits / reading_credits_expire_at passam a ser uma CACHE
-- derivada (para leitura barata na UI e no gate rápido), recalculada a partir do
-- ledger a cada mutação. O ledger é a fonte de verdade.

-- 1) Colunas do ledger ------------------------------------------------------
alter table public.stripe_payment_purchases
  add column if not exists credits_remaining int not null default 0,
  add column if not exists expires_at timestamptz;

-- guarda de integridade: nunca abaixo de 0 nem acima do concedido
alter table public.stripe_payment_purchases
  drop constraint if exists spp_credits_remaining_range;
alter table public.stripe_payment_purchases
  add constraint spp_credits_remaining_range
  check (credits_remaining >= 0 and credits_remaining <= granted_quantity);

-- qual lote uma reserva de crédito consumiu (para devolver ao lote certo)
alter table public.reading_reservations
  add column if not exists credit_purchase_id text;

-- 2) Backfill (pré-lançamento: 0 linhas, mas seguro se houver) --------------
-- Aproxima o estado antigo: cada compra paga fica com validade = validade global
-- do perfil (ou created_at + 30 dias) e saldo = min(concedido, saldo global).
do $$
begin
  update public.stripe_payment_purchases s
     set expires_at = coalesce(p.reading_credits_expire_at, s.created_at + interval '30 days'),
         credits_remaining = least(s.granted_quantity, greatest(coalesce(p.reading_credits, 0), 0))
    from public.profiles p
   where p.id = s.user_id and s.status = 'paid' and s.expires_at is null;
end $$;

-- 3) Helpers internos (só service_role) -------------------------------------
-- Recalcula a cache do perfil a partir dos lotes válidos.
create or replace function public.refresh_reading_credit_cache(uid uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  update public.profiles p
     set reading_credits = coalesce((
           select sum(credits_remaining) from public.stripe_payment_purchases
            where user_id = uid and status = 'paid'
              and credits_remaining > 0 and expires_at > clock_timestamp()
         ), 0),
         reading_credits_expire_at = (
           select max(expires_at) from public.stripe_payment_purchases
            where user_id = uid and status = 'paid'
              and credits_remaining > 0 and expires_at > clock_timestamp()
         )
   where p.id = uid;
end;
$$;

-- Consome 1 crédito do lote válido que expira mais cedo (FIFO). Devolve o
-- payment_intent do lote consumido, ou null se não havia crédito válido.
-- NÃO recalcula a cache — quem chama fá-lo no momento certo.
create or replace function public.consume_credit_fifo(uid uuid)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  chosen text;
begin
  select payment_intent_id into chosen
    from public.stripe_payment_purchases
   where user_id = uid and status = 'paid'
     and credits_remaining > 0 and expires_at > clock_timestamp()
   order by expires_at asc, created_at asc, payment_intent_id asc
   limit 1
   for update;
  if chosen is null then
    return null;
  end if;
  update public.stripe_payment_purchases
     set credits_remaining = credits_remaining - 1, updated_at = clock_timestamp()
   where payment_intent_id = chosen;
  return chosen;
end;
$$;

-- Devolve 1 crédito ao lote indicado, se ainda for válido e tiver espaço.
-- Se o lote expirou ou já está cheio, o crédito perde-se (justo: expirou).
create or replace function public.restore_credit_to_batch(uid uuid, pi text)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if pi is null then return; end if;
  update public.stripe_payment_purchases
     set credits_remaining = least(credits_remaining + 1, granted_quantity),
         updated_at = clock_timestamp()
   where payment_intent_id = pi and user_id = uid and status = 'paid'
     and expires_at > clock_timestamp();
end;
$$;

revoke all on function public.refresh_reading_credit_cache(uuid) from public, anon, authenticated;
revoke all on function public.consume_credit_fifo(uuid) from public, anon, authenticated;
revoke all on function public.restore_credit_to_batch(uuid, text) from public, anon, authenticated;
grant execute on function public.refresh_reading_credit_cache(uuid) to service_role;
grant execute on function public.consume_credit_fifo(uuid) to service_role;
grant execute on function public.restore_credit_to_batch(uuid, text) to service_role;

-- 4) Concessão de pacote: grava o lote (saldo + validade próprios) ----------
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

  -- VLT2-003: pagamento já revertido nunca concede crédito.
  if exists (
    select 1 from public.stripe_payment_reversals where payment_intent_id = payment_intent_value
  ) then
    update public.processed_stripe_events set result_code = 'reversed_before_grant' where id = event_id;
    return jsonb_build_object('result', 'reversed_before_grant');
  end if;

  -- VLT2-004: o lote nasce com o seu próprio saldo e validade (não mexe noutros).
  insert into public.stripe_payment_purchases (
    payment_intent_id, user_id, granted_quantity, credits_remaining, expires_at,
    currency, unit_amount, price_id, market, status, stripe_event_created_at
  )
  values (
    payment_intent_value, uid, qty, qty,
    clock_timestamp() + make_interval(days => valid_days),
    currency_value, unit_amount_value, price_id_value, market_value, 'paid', event_created
  )
  on conflict (payment_intent_id) do nothing;
  if not found then
    raise exception using errcode = '23505', message = 'payment_intent_already_granted';
  end if;

  update public.profiles
     set last_payment_currency = currency_value,
         last_payment_unit_amount = unit_amount_value,
         last_payment_price_id = price_id_value,
         last_payment_market = market_value
   where id = uid;
  if not found then
    raise exception using errcode = 'P0001', message = 'pack_grant_failed';
  end if;

  perform public.refresh_reading_credit_cache(uid);
  return jsonb_build_object('result', 'processed', 'quantity', qty);
end;
$$;

-- 5) Reversão (opção A): zera só o saldo NÃO USADO daquele lote -------------
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

  -- VLT2-003: tombstone por PaymentIntent (mesmo sem a compra existir ainda).
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

  -- VLT2-004 (opção A): retira só o que ainda não foi usado deste lote.
  if purchase_row.status = 'paid' then
    update public.stripe_payment_purchases
       set credits_remaining = 0, updated_at = clock_timestamp()
     where payment_intent_id = payment_intent_value;
    perform public.refresh_reading_credit_cache(purchase_row.user_id);
  end if;

  update public.stripe_payment_purchases
     set status = reason_value,
         stripe_event_created_at = greatest(stripe_event_created_at, event_created),
         updated_at = clock_timestamp()
   where payment_intent_id = payment_intent_value;

  return jsonb_build_object('result', 'processed');
end;
$$;

-- 6) Reserva: consumo de crédito por FIFO + memória do lote -----------------
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
  credit_pi text;
  week_start date := date_trunc('week', timezone('UTC', clock_timestamp()))::date;
  now_value timestamptz := clock_timestamp();
  rec record;
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

  -- Libera reservas abandonadas uma única vez; devolve cada crédito ao seu lote.
  for rec in
    update public.reading_reservations
       set status = 'released', released_at = now_value
     where user_id = uid and status = 'reserved' and expires_at <= now_value
     returning entitlement, credit_purchase_id
  loop
    if rec.entitlement = 'credit' then
      perform public.restore_credit_to_batch(uid, rec.credit_purchase_id);
    end if;
  end loop;
  perform public.refresh_reading_credit_cache(uid);

  select * into profile_row
    from public.profiles
   where id = uid
   for update;
  if not found then
    return jsonb_build_object('result', 'user_not_found');
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

  -- VLT2-006: serialização GLOBAL do orçamento operacional (entre todas as contas).
  perform pg_advisory_xact_lock(8217, 1);
  if (
    select count(*) from public.reading_reservations
     where created_at > now_value - interval '1 day'
  ) >= 5000 then
    return jsonb_build_object('result', 'operational_budget_exhausted');
  end if;

  if profile_row.is_premium then
    if (
      select count(*) from public.reading_reservations
       where user_id = uid
         and entitlement = 'premium'
         and status in ('reserved', 'completed')
         and created_at >= (date_trunc('day', timezone('UTC', now_value)) at time zone 'UTC')
    ) >= 10 then
      return jsonb_build_object('result', 'premium_daily_reached');
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
  else
    -- VLT2-004: crédito consumido do lote que expira mais cedo (FIFO).
    credit_pi := public.consume_credit_fifo(uid);
    if credit_pi is not null then
      entitlement_value := 'credit';
      perform public.refresh_reading_credit_cache(uid);
    else
      return jsonb_build_object('result', 'quota_exceeded');
    end if;
  end if;

  insert into public.reading_reservations (
    user_id, idempotency_key, request_hash, entitlement,
    quota_week_start, status, expires_at, credit_purchase_id
  )
  values (
    uid, idem, req_hash, entitlement_value,
    case when entitlement_value = 'free' then week_start else null end,
    'reserved', now_value + interval '3 minutes', credit_pi
  )
  returning id into reservation_id;

  return jsonb_build_object(
    'result', 'reserved',
    'reservation_id', reservation_id,
    'entitlement', entitlement_value
  );
end;
$$;

-- 7) Release explícito (falha da IA): devolve o crédito ao lote -------------
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
  released_pi text;
begin
  perform pg_advisory_xact_lock(hashtextextended(uid::text, 8217));
  update public.reading_reservations
     set status = 'released', released_at = clock_timestamp()
   where id = reservation and user_id = uid and status = 'reserved'
  returning entitlement, credit_purchase_id into released_entitlement, released_pi;
  if not found then return false; end if;
  if released_entitlement = 'credit' then
    perform public.restore_credit_to_batch(uid, released_pi);
    perform public.refresh_reading_credit_cache(uid);
  end if;
  return true;
end;
$$;

-- grants (recriar funções não altera privilégios, mas reafirmamos por clareza)
revoke execute on function public.reserve_reading_request(uuid, text, text) from public, anon, authenticated;
revoke execute on function public.release_reading_request(uuid, uuid) from public, anon, authenticated;
grant execute on function public.reserve_reading_request(uuid, text, text) to service_role;
grant execute on function public.release_reading_request(uuid, uuid) to service_role;
