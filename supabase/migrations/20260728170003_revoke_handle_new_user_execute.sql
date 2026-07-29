-- Hardening (advisors 0028/0029): handle_new_user é SECURITY DEFINER e ficou
-- com o EXECUTE por defeito do Postgres (PUBLIC), exposta em
-- /rest/v1/rpc/handle_new_user para anon/authenticated. É função de trigger
-- (o Postgres impede a chamada direta), mas não deve ser um endpoint público.
-- As restantes funções financeiras já tinham este revoke desde 20260724120000.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- O trigger on_auth_user_created dispara independentemente do EXECUTE do
-- chamador (verificado na criação do trigger, não no disparo); o grant abaixo
-- é cinto-e-suspensórios para o fluxo de signup do GoTrue.
grant execute on function public.handle_new_user() to supabase_auth_admin;
