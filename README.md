# Veleda ✦ Tarot

Leituras de tarot com IA — React + Vite + Supabase + Claude.

## Correr localmente

```bash
cd ~/Desktop/veleda-app
npm install
npm run dev
```

Abre http://localhost:5173

## Arquitetura

- **Frontend** (`src/`): React + Vite. Páginas: landing, auth, nova leitura (pergunta → leque → leitura), histórico, detalhe com diário, diário livre.
- **Base de dados** (Supabase, projeto `veleda`, ref `phixumwuktqabcngncrk`):
  - `cards` — 78 cartas (22 maiores + 56 menores), leitura pública
  - `profiles` — criado automaticamente no signup; `is_premium` controla a quota
  - `readings` — só a Edge Function escreve; o dono lê (RLS)
  - `journal_entries` — diário do utilizador (RLS total)
  - Migration em `supabase/migrations/`
- **Edge Function** `generate-reading` (`supabase/functions/generate-reading/`):
  valida sessão → verifica quota semanal (1 grátis/semana, segunda-feira, hora de Lisboa) →
  chama Claude (`claude-sonnet-5`) → guarda no histórico.
  A `ANTHROPIC_API_KEY` vive só nos secrets do Supabase.

## Segredos

- `.env` local (gitignored): URL + anon key do Supabase — só valores públicos de cliente.
- `~/Desktop/veleda-secrets.env`: cópia de todas as chaves (Anthropic, service_role, senha da BD). **Não partilhar nem commitar.**

## Imagens das cartas

As imagens ficam organizadas em `public/cards/`:
- `verso.jpg` — verso da carta (usado no leque)
- `maiores/<slug>.png` — 22 Arcanos Maiores
- `copas/<slug>.png`, `ouros/<slug>.png`, `espadas/<slug>.png` e `paus/<slug>.png` — 56 Arcanos Menores

Exemplos: `maiores/o-louco.png`, `copas/as-de-copas.png`.

Enquanto não existirem, o app mostra placeholders com moldura dourada.

## Testes

```bash
node scripts/e2e.mjs   # e2e completo contra o backend real (cria e apaga utilizadores de teste)
```

## Site publicado

**https://jussaradroliveira-cmyk.github.io/veleda-app/** (GitHub Pages)

Publicar alterações do frontend:

```bash
npm run deploy
```

Deploy de alterações nas funções:

```bash
supabase functions deploy generate-reading --project-ref phixumwuktqabcngncrk --use-api
supabase functions deploy create-checkout --project-ref phixumwuktqabcngncrk --use-api
supabase functions deploy stripe-webhook --project-ref phixumwuktqabcngncrk --use-api --no-verify-jwt
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
BILLING_MARKETS_ENABLED=BR                 # BR, PT_EU ou BR,PT_EU
STRIPE_PRICE_ID_BR_MONTHLY
STRIPE_PRICE_ID_BR_ANNUAL
STRIPE_PRICE_ID_BR_AVULSO
STRIPE_PRICE_ID_EU_MONTHLY
STRIPE_PRICE_ID_EU_ANNUAL
STRIPE_PRICE_ID_EU_AVULSO
STRIPE_EU_MONTHLY_UNIT_AMOUNT              # cêntimos; sem valor padrão
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
reembolso e disputa/chargeback; consultar o relatório da Fase 1)

## Por fazer

- Criar/confirmar produtos e Price IDs regionais no Stripe test
- Aplicar e validar migrations num ambiente Supabase descartável antes de qualquer ambiente remoto
- Imagens reais das cartas → `public/cards/` + `npm run deploy`
