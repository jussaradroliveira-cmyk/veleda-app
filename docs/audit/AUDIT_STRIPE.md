# Auditoria — Stripe e Assinaturas

**Data:** 2026-07-25 · **Modo:** read-only
**Estado:** Stripe configurado em **MODO DE TESTE** (entidade PT, acct_1Twpx3I0mUEibA0d, liquida em EUR, cobra em BRL).

## Preços (fonte de verdade, verificada)
- Mensal: R$ 39,90 (`price` BRL 3990/mês) ✅
- Anual: R$ 383,04 (BRL 38304/ano) — confere 12×39,90×0,80 = 383,04 ✅ (20% sobre 12 mensalidades)
- Avulso: R$ 49,90 (BRL 4990, pagamento único) ✅
Preços no app (paywall/assinatura/landing) e nos Termos coincidem com o Stripe.

## Invariantes verificadas (testes reais em modo teste)
- **success_url NÃO concede Premium.** O redirect `/leitura?premium=1` é cosmético; o `is_premium` vem do perfil (webhook). O frontend não confia no parâmetro. ✅
- **Só o webhook validado atualiza a assinatura.** Assinatura paga com cartão de teste → webhook → `is_premium=true`. ✅
- **Webhook verifica assinatura Stripe.** Evento com assinatura inválida → **400 rejeitado**. ✅
- **price_id vem de allowlist server-side** (env `STRIPE_PRICE_ID_*`), nunca do frontend (o cliente só envia `plan` ∈ {mensal,anual,avulso}). ✅
- **Idempotência do webhook:** tabela `processed_stripe_events`; reenvio do mesmo evento avulso **não** concede créditos de novo. ✅
- Consulta avulsa: evento `checkout.session.completed` (mode=payment, plan=avulso) → `grant_reading_pack(5,30d)`. ✅
- Checkout do avulso mostra **Cartão + Pix**; assinatura só cartão (Pix não é recorrente). ✅

## Achados

### V-013 — [P1/estado] Stripe em modo de teste — pagamentos reais impossíveis
- Não é defeito, é estado. Para lançamento comercial falta o **go-live**: chaves live, produtos/prices live, webhook live, confirmar elegibilidade Pix em produção, e (Supabase) trocar os secrets. Enquanto assim, ninguém paga a sério.

### V-014 — [P2] Cobertura de eventos de ciclo de vida limitada
- **Evidência:** o webhook trata `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`. **Não** trata explicitamente `invoice.payment_failed` / `past_due` / `unpaid`.
- **Impacto:** uma renovação falhada mantém `is_premium=true` até o Stripe emitir `subscription.updated` (status≠active) ou `deleted`. O handler de `updated` já desliga o premium se `status` não for active/trialing, o que cobre a maioria dos casos — mas convém confirmar que o Stripe envia `updated` em `past_due`.
- **Não testado:** reembolso, chargeback, troca mensal↔anual, cancelamento no fim do período (portal). O Billing Portal (Stripe-hosted) trata do cancelamento e emite `subscription.deleted`, cujo caminho está provado (desliga premium). **Risco residual:** médio até testar no go-live.

### V-015 — [P2] Billing Portal do Stripe pode não estar ativado
- Para o botão "Gerenciar/cancelar" funcionar em live, é preciso ativar o Customer Portal em Stripe → Settings → Billing. A verificar no go-live.

## Nota
Todo o código de checkout/webhook está pronto; os testes acima foram em modo teste com cartão `4242…` e eventos assinados. O go-live é sobretudo troca de chaves + verificação, não reescrita.
