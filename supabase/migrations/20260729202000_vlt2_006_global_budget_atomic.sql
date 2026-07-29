-- VLT2-006: o teto operacional global (5000 reservas/24h) era um count(*) lido
-- apenas sob o advisory lock POR-UTILIZADOR. Contas diferentes não serializavam,
-- logo N contas podiam ler o mesmo valor abaixo do teto e ultrapassá-lo por corrida.
--
-- Correção: um advisory lock GLOBAL (forma de 2 inteiros — espaço separado do
-- lock por-utilizador, que usa a forma de 1 bigint) torna a contagem do orçamento
-- + a inserção atómicas ENTRE contas. É o único ponto que precisa de serialização
-- global; as reservas são operações rápidas (sem chamadas externas), por isso o
-- custo é aceitável para um teto tão baixo.
--
-- Ordem de locks consistente (por-utilizador → global) => sem deadlock: nenhuma
-- transação pede um lock por-utilizador enquanto detém o global.
--
-- (Rate-limit de borda por IP/dispositivo e alertas de orçamento no fornecedor
-- ficam como controlos de infra/decisão, fora desta migração.)
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

  -- VLT2-006: serialização GLOBAL do orçamento operacional (entre todas as contas).
  perform pg_advisory_xact_lock(8217, 1);
  if (
    select count(*) from public.reading_reservations
     where created_at > now_value - interval '1 day'
  ) >= 5000 then
    return jsonb_build_object('result', 'operational_budget_exhausted');
  end if;

  if profile_row.is_premium then
    -- Premium: até 10 leituras/dia, reset à meia-noite UTC (mesma convenção da
    -- quota semanal). Só conta as que ocupam quota (reservadas/concluídas); as
    -- liberadas por falha da IA não são cobradas contra o dia.
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
