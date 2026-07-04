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

Colocar em `public/cards/`:
- `verso.jpg` — verso da carta (usado no leque)
- `<slug>.jpg` por carta — ex.: `o-louco.jpg`, `as-de-copas.jpg` (slugs na tabela `cards`)

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

## Stripe (pronto a ligar)

O código completo já está no ar: `create-checkout` (abre o Checkout de subscrição),
`stripe-webhook` (liga/desliga `profiles.is_premium`). Sem chaves configuradas, o
botão Premium mostra "quase a chegar" e nada rebenta.

Para ativar, definir os secrets no projeto Supabase:

```bash
supabase secrets set --project-ref phixumwuktqabcngncrk \
  STRIPE_SECRET_KEY=sk_test_... STRIPE_PRICE_ID=price_... STRIPE_WEBHOOK_SECRET=whsec_...
```

Webhook do Stripe a apontar para:
`https://phixumwuktqabcngncrk.supabase.co/functions/v1/stripe-webhook`
(eventos: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`)

## Por fazer

- Colar as chaves Stripe (ver acima) — o resto já está feito
- Imagens reais das cartas → `public/cards/` + `npm run deploy`
