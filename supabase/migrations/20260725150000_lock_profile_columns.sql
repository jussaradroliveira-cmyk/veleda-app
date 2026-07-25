-- P0 (auditoria V-001/V-002): impedir que o utilizador escreva colunas sensíveis
-- do próprio perfil via Data API. Antes, o role `authenticated` tinha UPDATE em
-- todas as colunas e a política RLS só protegia `is_premium` — permitindo
-- auto-conceder `reading_credits` (leituras pagas grátis) e alterar
-- `stripe_customer_id` (IDOR no portal).
--
-- Agora: só display_name e o aceite dos termos são escritos pelo cliente; tudo
-- o resto (créditos, premium, ids Stripe) é exclusivo do service_role (Edge Functions).
revoke update on public.profiles from authenticated, anon;
grant update (display_name, terms_version, terms_accepted_at) on public.profiles to authenticated;
