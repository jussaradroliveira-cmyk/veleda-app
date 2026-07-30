-- VLT2-018: verificações COMPORTAMENTAIS contra as RPCs reais (após aplicar
-- todas as migrações desde zero). Determinístico, numa transação; qualquer
-- assert falso aborta. Corrido por scripts/db-integration-test.sh.

\set ON_ERROR_STOP on
set client_min_messages = warning;

create or replace function pg_temp.assert(cond boolean, msg text) returns void
language plpgsql as $$
begin
  if cond is distinct from true then
    raise exception 'ASSERT FALHOU: %', msg;
  end if;
end;$$;

begin;

-- Cadastro real: o trigger handle_new_user cria perfil + consentimentos 2.2.
insert into auth.users(id, raw_user_meta_data) values
 ('11111111-1111-1111-1111-111111111111',
  '{"accept_terms":true,"acknowledge_privacy":true,"declare_age_18":true,"locale":"pt-BR","market":"BR"}');

select pg_temp.assert(
  (select count(*) from public.user_consents
    where user_id='11111111-1111-1111-1111-111111111111' and document_version='2.2') = 2,
  'cadastro deve gravar Termos+Privacidade 2.2');

-- ── VLT2-004: ledger de crédito (FIFO + estorno opção A) ───────────────────
select public.process_stripe_pack_event('evt_a',1000,'pi_a','11111111-1111-1111-1111-111111111111',5,30,'brl',4990,'price_x','BR',false);
select public.process_stripe_pack_event('evt_b',1001,'pi_b','11111111-1111-1111-1111-111111111111',5,30,'brl',4990,'price_x','BR',false);
select pg_temp.assert(
  (select reading_credits from public.profiles where id='11111111-1111-1111-1111-111111111111') = 10,
  'duas compras = 10 créditos na cache');

-- consome 2 (FIFO → lote pi_a, o mais antigo)
select public.consume_credit_fifo('11111111-1111-1111-1111-111111111111');
select public.consume_credit_fifo('11111111-1111-1111-1111-111111111111');
select public.refresh_reading_credit_cache('11111111-1111-1111-1111-111111111111');
select pg_temp.assert(
  (select credits_remaining from public.stripe_payment_purchases where payment_intent_id='pi_a') = 3,
  'FIFO consome primeiro o lote mais antigo (pi_a=3)');

-- estorna pi_a (opção A: remove só o não-usado desse lote; pi_b intacto)
select public.reverse_stripe_pack_event('evt_ra',2000,'pi_a','refunded',false);
select pg_temp.assert(
  (select credits_remaining from public.stripe_payment_purchases where payment_intent_id='pi_a') = 0,
  'estorno zera o saldo do lote estornado');
select pg_temp.assert(
  (select credits_remaining from public.stripe_payment_purchases where payment_intent_id='pi_b') = 5,
  'estorno NÃO toca noutro lote (pi_b=5)');
select pg_temp.assert(
  (select reading_credits from public.profiles where id='11111111-1111-1111-1111-111111111111') = 5,
  'cache após estorno = 5 (só o lote B)');

-- ── VLT2-010: reaceite genérico ───────────────────────────────────────────
-- Simula uma conta ANTIGA (só aceitou a 2.1): cria via trigger (grava 2.2),
-- depois substitui os consentimentos por 2.1 — como uma conta pré-v2.2.
insert into auth.users(id, raw_user_meta_data) values
 ('22222222-2222-2222-2222-222222222222',
  '{"accept_terms":true,"acknowledge_privacy":true,"declare_age_18":true,"locale":"pt-BR","market":"BR"}');
delete from public.user_consents where user_id='22222222-2222-2222-2222-222222222222';
insert into public.user_consents(user_id,document_type,document_version,document_fingerprint,accepted,origin,locale,market) values
 ('22222222-2222-2222-2222-222222222222','terms_acceptance','2.1','sha256:old',true,'signup_web','pt-BR','BR'),
 ('22222222-2222-2222-2222-222222222222','privacy_acknowledgement','2.1','sha256:old',true,'signup_web','pt-BR','BR');
select set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222', true);
select pg_temp.assert(
  (select count(*) from public.pending_consents()) = 2,
  'conta 2.1 deve ter 2 documentos pendentes');
select public.accept_current_consents('pt-BR','BR');
select pg_temp.assert(
  (select count(*) from public.pending_consents()) = 0,
  'após reaceite não deve haver pendências');

-- ── VLT2-019: cap do diário rejeita acima de 2000 ─────────────────────────
insert into public.journal_entries(user_id, content)
  select '11111111-1111-1111-1111-111111111111', 'e'||g from generate_series(1,2000) g;
do $$
begin
  begin
    insert into public.journal_entries(user_id, content)
      values ('11111111-1111-1111-1111-111111111111','a 2001a');
    raise exception 'ASSERT FALHOU: cap do diário deveria ter bloqueado a 2001a';
  exception when check_violation then
    null; -- esperado
  end;
end$$;

rollback;

\echo 'DB-BEHAVIORAL: OK'
