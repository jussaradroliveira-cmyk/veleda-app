-- Endurecimento: as RPCs de consentimento são SECURITY DEFINER em public. O
-- Supabase concede EXECUTE a anon/authenticated por DEFAULT PRIVILEGES no momento
-- da criação, pelo que o "revoke ... from public" da migração do mecanismo não
-- retira o grant direto ao anon. As funções já falham-fechadas para anon
-- (auth.uid() nulo => accept_current_consents faz raise; pending_consents só
-- devolveria as versões vigentes, que são públicas), mas removemos o acesso do
-- anon por princípio de menor privilégio. Ficam executáveis apenas por
-- authenticated.
revoke all on function public.pending_consents() from anon;
revoke all on function public.accept_current_consents(text, text) from anon;

grant execute on function public.pending_consents() to authenticated;
grant execute on function public.accept_current_consents(text, text) to authenticated;
