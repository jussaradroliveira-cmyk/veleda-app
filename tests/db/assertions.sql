-- VLT2-018: invariantes de segurança/integridade verificados contra um Postgres
-- REAL (imagem supabase/postgres), depois de aplicar TODAS as migrações desde
-- zero. Corrido por scripts/db-integration-test.sh. Qualquer falha aborta (psql
-- ON_ERROR_STOP) — o assert() levanta exceção quando a condição é falsa.

\set ON_ERROR_STOP on
set client_min_messages = warning;

create or replace function pg_temp.assert(cond boolean, msg text) returns void
language plpgsql as $$
begin
  if cond is distinct from true then
    raise exception 'ASSERT FALHOU: %', msg;
  end if;
end;$$;

-- ── RLS ligado nas tabelas sensíveis ──────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','readings','journal_entries','user_consents','reading_reservations',
    'stripe_payment_purchases','stripe_payment_reversals','legal_documents'
  ] loop
    perform pg_temp.assert(
      (select relrowsecurity from pg_class where oid = ('public.'||t)::regclass),
      'RLS deve estar ligado em '||t);
  end loop;
end$$;

-- ── SECURITY DEFINER em public tem search_path fixado ──────────────────────
-- (evita sequestro de search_path — checklist Supabase)
do $$
declare r record;
begin
  for r in
    select p.proname
      from pg_proc p join pg_namespace n on n.oid=p.pronamespace
     where n.nspname='public' and p.prosecdef
       and (p.proconfig is null or not exists (
             select 1 from unnest(p.proconfig) c where c like 'search_path=%'))
  loop
    raise exception 'ASSERT FALHOU: % é SECURITY DEFINER sem search_path fixado', r.proname;
  end loop;
end$$;

-- ── funções de crédito/reserva não são executáveis por anon/authenticated ──
do $$
declare fn text;
begin
  foreach fn in array array[
    'public.reserve_reading_request(uuid,text,text)',
    'public.consume_credit_fifo(uuid)',
    'public.process_stripe_pack_event(text,bigint,text,uuid,int,int,text,bigint,text,text,boolean)'
  ] loop
    perform pg_temp.assert(not has_function_privilege('anon', fn, 'EXECUTE'), fn||' não deve ser anon-executável');
    perform pg_temp.assert(not has_function_privilege('authenticated', fn, 'EXECUTE'), fn||' não deve ser authenticated-executável');
  end loop;
end$$;

-- ── consentimento: versão vigente 2.2 semeada em legal_documents ───────────
do $$
begin
  perform pg_temp.assert(
    (select count(*) from public.legal_documents where is_current) = 2,
    'devem existir exatamente 2 documentos vigentes');
  perform pg_temp.assert(
    (select bool_and(version='2.2') from public.legal_documents where is_current),
    'a versão vigente deve ser 2.2');
end$$;

\echo 'DB-ASSERTIONS: OK'
