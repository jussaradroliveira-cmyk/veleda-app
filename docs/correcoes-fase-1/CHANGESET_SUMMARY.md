# Changeset summary — Fase 1

- Exclusão agora cancela e confirma todas as assinaturas Stripe antes de apagar
  perfil/IDs, falhando de forma fechada e idempotente.
- Markdown de IA passa por componente único com HTML bruto desabilitado,
  DOMPurify e CSP restritiva.
- Nova reserva SQL atômica aplica quota semanal UTC, idempotência, estorno,
  concorrência, rate limit, payload e orçamento operacional antes da Anthropic.
- Eventos Stripe usam RPCs transacionais para idempotência, benefício, reversão
  e sincronização ordenada pelo tempo, com snapshot atual da Stripe.
- Reconciliação Stripe → Supabase foi preparada, mas não ativada.
- Cadastro gera aceites append-only no trigger de Auth, inclusive com
  confirmação de e-mail; idade continua sendo simples declaração 18+.
- Catálogo regional fixo suporta BRL e EUR no mesmo app; BR preservado, EUR
  desativado sem valores/Price IDs, nenhum ID exposto ao frontend.
- Termos, Privacidade, Cookies, subprocessadores, preços, conta, checkout,
  rodapé e avisos de IA foram alinhados ao código.
- Dependências: `dompurify` (runtime) e `jsdom` (testes).
- Migration local: `20260728120000_phase1_security_integrity.sql`.
- Nenhum deploy, commit, migration remota, chamada Stripe/Anthropic, e-mail ou
  acesso a produção foi realizado.

Status: pronto para revisão local; não apto para lançamento até validação em
Supabase descartável, Stripe test, configuração externa e revisão jurídica.

