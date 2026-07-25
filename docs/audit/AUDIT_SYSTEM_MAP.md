# Auditoria — Arquitetura e Mapa do Sistema

**Data:** 2026-07-25 · **HEAD:** 204b810

## Stack
React 19 + Vite 8 + React Router 7 (SPA), Supabase (Postgres + Auth + Edge Functions Deno), Anthropic (Claude), Stripe (entidade PT, modo teste), Resend (email — **só SARA**, Veleda ainda não), Vercel (hosting, domínio veledataro.com).

## Caminho completo do utilizador
```
utilizador (browser/PWA)
 → frontend React (veledataro.com, Vercel)
 → Supabase Auth (signup/login, chave anon pública)
 → [Protected] rotas privadas
 → NewReading: escolhe nome → pergunta → tiragem (FanSpread)
 → generate-reading (Edge Function, service_role)
     → verifica auth (JWT) → elegibilidade (premium / grátis semanal / crédito)
     → busca cartas → chama Anthropic (chave server-side) com retry/timeout
     → grava em readings → devolve texto
 → histórico (readings, RLS próprio) / diário (journal_entries, RLS próprio)
 → paywall → create-checkout → Stripe Checkout → webhook → is_premium / créditos
```

## Componentes / rotas
- Páginas: Landing, Auth, NewReading, History, ReadingDetail, Journal, Account, Subscription, Cookies, Terms, Privacy, Subprocessors.
- Componentes: AppHeader, AppFooter, FanSpread, TarotCard, StepIndicator, Paywall, VeledaLogo, InstallPrompt.
- Lib: supabase, auth-context, api (generateReading, readingsThisWeek, shuffleDeck, fetchCards), billing.

## Tabelas (public)
`profiles` (id, display_name, is_premium, stripe_customer_id, stripe_subscription_id, reading_credits, reading_credits_expire_at, terms_version, terms_accepted_at), `readings`, `journal_entries`, `cards` (78 + verso), `processed_stripe_events`.

## Edge Functions
`generate-reading`, `create-checkout`, `stripe-webhook` (--no-verify-jwt), `manage-subscription`, `delete-account`.

## Funções BD
`handle_new_user` (trigger), `consume_reading_credit`, `refund_reading_credit`, `grant_reading_pack` (as três SECURITY DEFINER, execute só service_role).

## Serviços externos
Anthropic, Stripe (+EBANX p/ Pix), Supabase, Vercel, Resend (SARA). Ver `/subprocessadores`.
