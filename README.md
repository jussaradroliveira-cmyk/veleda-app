# Veleda ✦ Tarot

Leituras de tarô simbólico com IA — React + Vite + Supabase + Claude. Em produção em **https://veledataro.com** (Vercel, PWA instalável).

## Correr localmente

```bash
cd ~/Desktop/veleda-app
npm install
npm run dev            # http://localhost:5173
```

## Arquitetura

- **Frontend** (`src/`): React + Vite. Páginas: landing, auth, nova leitura (pergunta → leque → leitura), histórico, detalhe com diário, diário livre, conta, assinatura, e páginas legais (/termos, /privacidade, /subprocessadores, /cookies).
- **Base de dados** (Supabase, projeto `veleda`, ref `phixumwuktqabcngncrk`, região UE/Irlanda). RLS ativo em todas as tabelas:
  - `cards` — 78 cartas (22 maiores + 56 menores), leitura pública
  - `profiles` — criado no signup pelo trigger; `is_premium`, créditos e IDs Stripe (só o service role escreve estes; o dono só edita `display_name`)
  - `readings` — só a Edge Function escreve; o dono lê e pode apagar ("apagar histórico"; a quota não é devolvida — conta por `reading_reservations`)
  - `journal_entries` — diário (RLS total; FK composta garante que um diário ligado a leitura é do mesmo dono; limite de tamanho por entrada e por conta)
  - `user_consents` — aceites append-only (Termos/Privacidade/18+): versão + **hash SHA-256** do texto + data-hora do servidor + idioma + mercado
  - `reading_reservations` — reserva atómica de quota (grátis semanal, Premium diário, créditos), com idempotência e estorno
  - `stripe_payment_purchases` / `processed_stripe_events` — pacotes avulsos e idempotência de eventos Stripe
  - Migrations em `supabase/migrations/`
- **Edge Functions** (`supabase/functions/`):
  - `generate-reading` — valida sessão → reserva quota atómica → chama Claude (`claude-sonnet-5`) → grava. Prompt endurecido, pergunta delimitada como dado não confiável. A leitura interpreta as cartas **para a pergunta** (síntese dá a tendência/resposta), no idioma do utilizador, sem avisos no texto (o aviso fixo é da app) e termina com o convite a nova tiragem.
  - `delete-account` — cancela assinaturas na Stripe antes de apagar (falha-fechada), reautenticação por senha, logs sem PII
  - `export-data` — exportação server-side completa (conta + 6 tabelas), falha-fechada, inventário versionado
  - `create-checkout` / `manage-subscription` — checkout e portal Stripe (catálogo regional server-side)
  - `stripe-webhook` — RPCs transacionais, ordenação por `event.created`, refund/chargeback (deploy com `--no-verify-jwt`)
  - `reconcile-stripe` — reconciliação Stripe → Supabase (preparada, **não ativada**)
- A `ANTHROPIC_API_KEY` e as chaves Stripe/service-role vivem só nos secrets do Supabase.

## Regras de negócio (quota)

- **Grátis:** 1 leitura por semana civil (segunda-feira 00:00 **UTC** até à segunda seguinte).
- **Premium:** até **10 leituras por dia**, com reset diário à meia-noite UTC. Não acumula para o dia seguinte.
- **Pacote avulso:** 5 leituras, válidas 30 dias, sem renovação.
- Tudo validado no servidor de forma atómica; falhas da IA libertam a reserva (não gastam a quota).

## Segurança

- RLS em todas as tabelas; RPCs de quota e financeiras exclusivas do `service_role`.
- CSP + X-Frame-Options + nosniff + Referrer/Permissions-Policy + HSTS no `vercel.json`.
- Markdown da IA sanitizado (DOMPurify), sem HTML bruto.
- CORS por origem exata nas Edge Functions autenticadas.
- Ver relatórios em `docs/auditoria-seguranca/` e o histórico em `docs/CHANGELOG.md`.

## Segredos

- `.env` local (gitignored): URL + anon key do Supabase — só valores públicos de cliente.
- `~/Desktop/veleda-secrets.env`: cópia de todas as chaves (Anthropic, service_role, senha da BD, Stripe). **Não partilhar nem commitar.**

## Imagens das cartas

Em `public/cards/` (WebP):
- `verso.webp` — verso da carta (leque)
- `maiores/<slug>.webp` — 22 Arcanos Maiores
- `copas/`, `ouros/`, `espadas/`, `paus/` `<slug>.webp` — 56 Arcanos Menores

O frontend deriva o caminho pelo `slug`; se a imagem falhar, mostra placeholder com moldura dourada.

## Testes

```bash
npm test          # suíte unitária (sanitização, catálogo, exclusão, quota, consentimentos, Stripe)
npm run lint
npm run build
VELEDA_CONFIRM_E2E=1 node scripts/e2e.mjs   # e2e contra o backend real (cria/apaga contas de teste)
```

Migrations testam-se num Postgres descartável antes de qualquer ambiente remoto:
`docker run public.ecr.aws/supabase/postgres:<versão>` → aplicar todas as migrations → exercitar.

## Deploy

`scripts/deploy.sh` publica na Vercel **a partir do último commit** — commitar antes.
Exige `VELEDA_CONFIRM_DEPLOY=1` e a CLI fixada em cache (se falhar por falta dela:
`npx -y vercel@58.1.0 --version` primeiro).

```bash
git commit -am "…" && VELEDA_CONFIRM_DEPLOY=1 bash scripts/deploy.sh   # frontend (Vercel)
supabase db push                                       # migrations (ordem: migrations → funções → frontend)
supabase functions deploy generate-reading             # funções (JWT on por defeito)
supabase functions deploy stripe-webhook --no-verify-jwt
```

## Stripe regional (configuração manual)

O servidor mantém um catálogo fixo por mercado. O frontend envia somente
`market` (`BR` ou `PT_EU`) e `plan` (`mensal`, `anual` ou `avulso`); moeda,
valor e Price ID são resolvidos e revalidados no servidor. Adaptive Pricing
não está habilitado.

Variáveis server-side:

```text
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_MODE=test                             # test ou live; deve corresponder à chave
BILLING_MARKETS_ENABLED=BR                   # BR, PT_EU ou BR,PT_EU
STRIPE_PRICE_ID_BR_MONTHLY
STRIPE_PRICE_ID_BR_ANNUAL
STRIPE_PRICE_ID_BR_AVULSO
STRIPE_PRICE_ID_EU_MONTHLY
STRIPE_PRICE_ID_EU_ANNUAL
STRIPE_PRICE_ID_EU_AVULSO
STRIPE_EU_MONTHLY_UNIT_AMOUNT                # cêntimos; sem valor padrão
STRIPE_EU_ANNUAL_UNIT_AMOUNT
STRIPE_EU_AVULSO_UNIT_AMOUNT
RECONCILIATION_SECRET
```

Os nomes legados `STRIPE_PRICE_ID_MONTHLY`, `STRIPE_PRICE_ID_ANNUAL`,
`STRIPE_PRICE_ID_AVULSO` e `STRIPE_PRICE_ID` continuam aceitos somente para
o catálogo BR. Não há Price ID ou valor EUR inventado no repositório.

Webhook do Stripe a apontar para:
`https://phixumwuktqabcngncrk.supabase.co/functions/v1/stripe-webhook`
(eventos: checkout concluído/expirado, ciclo de assinatura, invoice pago/falho,
reembolso e disputa/chargeback).

## Por fazer (não-código, decisões da Jussara)

Já feito: go-live do Stripe (live, Pix, Customer Portal), Resend/SMTP próprio,
legais revistos (Termos 2.2 · Privacidade 2.3). Falta:

- **Supabase Pro:** backups diário + PITR (torna plena a frase de backups da Privacidade v2.3). Ativar na véspera de divulgar.
- **Teste do cartão real** no Stripe live: concluir uma cobrança → webhook liga Premium → reembolso/cancelamento.
- Imagens reais das cartas em `public/cards/` quando definitivas.
