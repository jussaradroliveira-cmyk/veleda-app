# Changelog — Veleda

Registo do que entrou em **produção** (migrations aplicadas ao live, Edge Functions
redeployadas, frontend publicado na Vercel). Referências = commits em `main`.

---

## 28–29 de julho de 2026 — ronda de segurança e conformidade

Correções da auditoria (VLT-001..017) e ajustes de produto. Ordem de aplicação
em cada passo: **migration → Edge Functions → frontend**, para nunca haver um
instante em que o código chama algo que ainda não existe.

### Fase 1 de segurança — VLT-001 a VLT-007
Commits `a1dd899` (db) · `2212f8c` (funções) · `7d0b662` (frontend/CSP) ·
`14b5fa2` (aceites) · `685322f` (billing) · `26eb952` (legal) · `91eb64d` (testes/docs) · `2be0ea8` (api).
Migration `20260728120000_phase1_security_integrity.sql`.

- **VLT-001** Exclusão de conta cancela assinaturas na Stripe antes de apagar (falha-fechada, retomável).
- **VLT-002** Markdown da IA sanitizado (DOMPurify, sem HTML bruto) + CSP/nosniff/anti-framing/Referrer/Permissions-Policy no `vercel.json`.
- **VLT-003** Quota atómica antes da IA (`reserve_reading_request`): advisory lock por utilizador, idempotência, rate limits, estorno.
- **VLT-004/005** Webhook Stripe transacional e ordenado por `event.created`; refund/chargeback; falha → 500 (retry).
- **VLT-006** Consentimentos append-only (`user_consents`) gravados pelo trigger do servidor; idade 18+ registada.
- **VLT-007** Textos legais alinhados ao produto; sem "provisório".
- Também: revoke de EXECUTE em `handle_new_user` (`20260728170003`) e limites do diário (`20260728171816`).

### VLT-009 — Integridade diário↔leitura
Commit `d7306bb`. Migration `20260729102621_journal_reading_same_owner.sql`.
FK composta `journal_entries(reading_id, user_id) → readings(id, user_id)`: um diário
ligado a uma leitura tem de ser do mesmo dono.

### VLT-016 — Guardas nos scripts
Commit `e0852dd`. CLI da Vercel fixada (`vercel@58.1.0`); `dev-reset-quota.mjs`/`e2e.mjs`
exigem `VELEDA_CONFIRM_*` e mostram o alvo antes de correr.

### VLT-015 — Dependências
Commit `074fb99`. `postcss` corrigido; `react-router-dom` fixado em 7.18.2. Aviso RSC CSRF
documentado como exceção não-alcançável (SPA) em `docs/auditoria-seguranca/EXCECAO_DEPS_REACT_ROUTER.md`.

### VLT-013 — Aviso de reflexão / não substitui aconselhamento
Commits `be8d8a9` (rodapé + 1ª leitura) e `b32867e` (cabeçalho, ao lado do nome).
Nota discreta em pt-BR, sem pop-up repetitivo.

### Premium — até 10 leituras por dia
Commit `b572c20`. Migration `20260729124416_premium_daily_limit.sql`.
O ramo Premium passa de ~ilimitado para **10/dia com reset UTC**, servidor/atómico,
com mensagem gentil ao atingir o limite. Textos de benefício atualizados. Nota de
uso pessoal antes de pagar.

### Documentos legais definitivos v2.1
Commit `62fa982`. Migration `20260729132430_consent_v21_text_hash.sql`.
- /termos, /privacidade, /subprocessadores substituídos **palavra por palavra**
  (fonte verbatim em `src/pages/legal/*.md`). Marcador "Versão 2.1 · vigente 29/07/2026".
- Consentimento passa a guardar **versão 2.1 + hash SHA-256 do texto aceite** +
  data-hora do servidor + idioma + mercado (exigido pelos Termos).

### VLT-008 — Exportação de dados server-side
Commit `b41eaf3`. Nova Edge Function `export-data`: reúne conta + as 6 tabelas do
titular com a service role, **falha-fechada** (erro em qualquer consulta aborta tudo,
nada de ficheiro parcial), inventário versionado. Antes era client-side e incompleto.

---

## 25 de julho de 2026 — P0

Commit `7601386`. Lockdown de colunas sensíveis de `profiles`: o utilizador deixa de
poder auto-conceder `reading_credits`/`is_premium`/IDs Stripe via Data API.

---

## Ainda aberto (não-código)

- **VLT-012** e-mail fiável (SMTP/Resend na Veleda) — configuração de painel + secrets.
- Go-live do Stripe · Supabase Pro · confirmação da revisão jurídica.
