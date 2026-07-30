# Changelog — Veleda

Registo do que entrou em **produção** (migrations aplicadas ao live, Edge Functions
redeployadas, frontend publicado na Vercel). Referências = commits em `main`.

---

## 30 de julho de 2026 — Auditoria Round 2: segurança da IA (VLT2-015)

- **VLT2-015** Fronteira pergunta↔IA endurecida. Módulo partilhado
  `_shared/ai-safety.js` (edge + frontend): (1) **escape do delimitador** — a
  pergunta já não consegue fechar `</PERGUNTA_NAO_CONFIAVEL>` e passar como
  instrução (prompt injection); aplicado à entrada e à saída (remove tags ecoadas).
  (2) **Aviso antes do envio** — nota de reflexão/entretenimento sempre visível no
  passo da pergunta. (3) **Deteção de crise** (pt-BR): quando a pergunta sugere
  risco à vida ou violência, mostra acolhimento com **CVV 188** e emergência (192/190),
  e reforça o system prompt para responder com cuidado e apontar apoio (sem registar
  o conteúdo da pergunta). `crisis` sinalizado na resposta. `npm test` 76/76.
  Redeploy `generate-reading` + frontend. Stripe intocado.

## 30 de julho de 2026 — Auditoria Round 2: ledger de créditos (VLT2-004)

- **VLT2-004** Créditos de pacote avulso passam a **ledger por lote**. Cada compra
  (`stripe_payment_purchases`) tem saldo (`credits_remaining`) e validade
  (`expires_at`) próprios. `profiles.reading_credits`/`_expire_at` viram cache
  derivada. Regras: **consumo FIFO por validade**; **estorno (opção A)** remove só
  os créditos NÃO usados daquele lote (`credits_remaining:=0`), sem tocar noutros
  lotes nem em créditos já gastos. `reading_reservations.credit_purchase_id` lembra
  o lote consumido, para a devolução (falha da IA / reserva expirada) voltar ao
  lote certo. Corrige: (1) nova compra ressuscitava créditos expirados; (2) estorno
  atingia o lote errado. Migration `20260730120000`. Provado no Postgres descartável
  (bug1: 5≠10; FIFO; opção A; release ao lote). `npm test` 69/69. Stripe intocado.

## 29 de julho de 2026 — Auditoria Round 2, lote de médios (2/N: pagamento/quota)

- **VLT2-005** Retry após falha da IA: quando o servidor libera a reserva, a UI
  gera **nova** idempotency_key para o próximo "Revelar" (numa falha ambígua de
  rede mantém a chave, preservando idempotência). `src/lib/reading-retry.js` + teste.
- **VLT2-006** Teto operacional global (5000/24h) agora **atómico entre contas**
  (advisory lock global, forma de 2 inteiros) — antes o count(*) só corria sob o
  lock por-utilizador e N contas ultrapassavam por corrida. Provado com concorrência
  real (sem lock→6, com lock→5). Migration `20260729202000`.
- **VLT2-020** Webhook: pagamentos **assíncronos** (Pix/boleto) passam a conceder
  via `checkout.session.async_payment_succeeded` (antes caíam em unsupported_event);
  `async_payment_failed` registado. Customer não mapeado deixa de ser 200 silencioso
  — mapeia por metadados+backfill e, se não houver perfil, lança (→500 p/ reenvio).
  Webhooks live+teste com os 2 eventos async. Caminho Pix async a validar no teste real.

## 29 de julho de 2026 — Auditoria Round 2, lote de médios/baixos (1/N)

Primeiro lote de correções dos achados Médios/Baixos (todos os Altos já fechados).
Ordem: migrations → frontend. **Stripe intocado.**

- **VLT2-008** Preço anual nos Termos corrigido de R$ 399,00 → **R$ 383,04** (bate com
  catálogo e Stripe live/teste = 38304). Fingerprint da 2.2 dos Termos atualizado
  in-place (0 aceites reais). Novo teste de consistência catálogo↔Termos.
- **VLT2-013** Sanitizador de markdown deixa de aceitar `//host` (protocol-relative)
  e o truque `/\host`; mantém http(s)/mailto, âncoras e caminhos internos. +Testes.
- **VLT2-016** Política de Cookies passa a listar `veleda_install_dismissed` e
  `veleda_disclaimer_seen`. Teste que falha se uma chave `veleda_*` ficar por documentar.
- **VLT2-017** `deploy.sh` exige `VELEDA_CONFIRM_DEPLOY=1`, mostra alvo/commit, valida
  o projeto Vercel (allowlist) e não faz fetch remoto da CLI (`npx --no-install`).
- **VLT2-019** `display_name` com CHECK de 60 no banco (inescapável pela Data API);
  cap de 2000 do diário agora atómico (advisory lock por utilizador) — provado com
  duas ligações concorrentes (final 2000, não 2001). Migrations `20260729200000`,
  `20260729201000`. `npm test` 67/67.

## 29 de julho de 2026 — Lançamento só-BR, legais v2.2 e reaceite genérico (VLT2-007/009/010)

Aplicado na ordem segura: migrations → Edge Functions → frontend. **Stripe intocado.**

- **VLT2-007** Lançamento só Brasil. `create-checkout` impõe o mercado quando há um
  único ativo (hoje BR) — o cliente não escolhe nem força outro pelo body. Seletor
  de mercado removido do cadastro (BR/pt-BR fixos). PT/EEE reativa-se por config
  (`BILLING_MARKETS_ENABLED` + preços EU) sem reescrever. Live sem esses secrets.
- **VLT2-009** Cláusula de dados sensíveis alinhada (revisão jurídica): deixa de
  prometer "consentimento específico com mecanismo próprio" e passa a "coberto pelo
  consentimento prestado no cadastro". Termos §9 e Privacidade §4/§5. Fonte verbatim
  em `DOCS JURIDICOS/*.docx`.
- **Documentos legais v2.2** Termos, Privacidade e Subprocessadores → 2.2 (os dois
  primeiros com texto ajustado; o terceiro só marcador). Novos SHA-256 publicados.
- **VLT2-010** Mecanismo **genérico** de reaceite. Tabela `legal_documents` como
  fonte de verdade da versão vigente; RPCs `pending_consents()` e
  `accept_current_consents()` (gravam versão+hash do servidor, append-only,
  `origin='reaccept_web'`); `handle_new_user` passa a ler a versão vigente (sem
  hardcode). Gate no `App.jsx` bloqueia o uso até reaceitar, deixando ler
  /termos e /privacidade. Reforço server-side: `generate-reading` recusa
  (`reaccept_required`) enquanto houver reaceite pendente — não confia só no front.
  Publicar a 2.2 ativou o reaceite para as contas 2.1.
- Migrations `20260729180000` (mecanismo), `20260729190000` (publica 2.2),
  `20260729193000` (menor privilégio: só `authenticated` executa as RPCs).
  Verificado no live (transação revertida): conta 2.1 barrada→reaceita grava
  2.2+hash real; conta 2.2 entra direto; cadastro novo grava 2.2+hash; só BR no
  checkout. `npm test` 62/62.
- **Correção de redação (mesmo dia)** nos Termos §9: "nos termos desta Política" →
  "nos termos destes Termos". Feita **in-place na 2.2** (0 aceites reais no momento),
  novo hash `sha256:3ac8169d…` — migration `20260729194500`. Frontend redeployado.

## 29 de julho de 2026 — Round 2: núcleo de pagamento (VLT2-001/002/003)

Correção na raiz dos 3 achados Altos de pagamento da segunda auditoria
(`docs/auditoria-seguranca/VELEDA_SECURITY_AUDIT_ROUND_2.md`), com **evidência
real** (Stripe test + Postgres real), não mocks. Aplicado: migration → redeploy
`stripe-webhook`.

- **VLT2-001** Premium só com correspondência **exata** ao catálogo (Price ID +
  moeda + valor + intervalo + recorrência) e status elegível. Novo módulo
  `_shared/entitlement.js` (`customerEntitlement`), usado pelo webhook e pela
  reconciliação. Guarda fail-closed também no SQL (`premium_without_catalog_match`).
  Provado com entrega real: assinatura de outro produto → **não** liga Premium.
- **VLT2-002** Webhook/reconciliação decidem por **TODAS** as assinaturas do
  customer (paginadas, filtradas pelo catálogo), regra determinística (maior
  `current_period_end`), e **removem** Premium quando não há assinatura válida.
- **VLT2-003** Tabela `stripe_payment_reversals` (tombstone por PaymentIntent):
  reembolso/chargeback grava sempre; a concessão de crédito consulta e recusa
  (`reversed_before_grant`) — independente da ordem dos eventos.
- Suíte: `tests/entitlement.test.js` (fixtures fiéis) + correção do teste
  obsoleto de consentimentos (VLT2-018). `npm test` 60/60.

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
