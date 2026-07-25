# Auditoria — Leitura Gratuita e Paywall

**Data:** 2026-07-25 · **Modo:** read-only

## Regra de negócio (fonte de verdade)
1 leitura gratuita por semana (segunda-feira, fuso America/Sao_Paulo). 2ª leitura na mesma semana exige Premium **ou** crédito de consulta avulsa. Premium = ilimitado.

## Onde é validado
**No backend** (`supabase/functions/generate-reading/index.ts`), sempre. O frontend nunca decide autorização — apenas mostra o paywall quando a função devolve 402. ✅

Ordem de elegibilidade na função:
1. `is_premium` → ilimitado.
2. Senão, conta leituras da semana (`readings` desde início da semana SP); se `< 1` → permite.
3. Senão, `consume_reading_credit` (atómico) → se houver crédito válido, consome e permite.
4. Senão → 402 `quota_exceeded`.

## Robustez verificada (testes reais)
- Consumo de crédito **atómico**, 1 por leitura (5→0 exato). ✅
- **Refund** do crédito se a leitura falha (IA/gravação/exceção — inclui o `catch`). ✅
- **Idempotência** de 2 min: pedido repetido idêntico devolve a mesma leitura, sem gastar 2º crédito nem duplicar. ✅ (protege contra retry do cliente / timeout do gateway)
- Expiração: créditos expirados não são consumidos → cai no paywall. ✅
- Pergunta composta (2 perguntas numa) recusada no app **e** na função. ✅

## Achados

### V-001 (repetido de AUTH_AND_RLS) — [P0] Bypass do paywall por auto-concessão de créditos
O paywall é sólido na função, mas é **contornável pela Data API**: o utilizador põe `reading_credits=999` no próprio perfil (ver AUDIT_AUTH_AND_RLS V-001, CONFIRMADO) e passa a ter leituras ilimitadas. **Este é o furo mais grave da app.** A lógica da função está correta; o problema é a permissão de escrita na coluna.

### V-012 — [P2] Quota semanal por contagem de linhas tem corrida teórica
- **Evidência:** o passo 2 conta linhas em `readings` e só depois gera/insere. Dois pedidos simultâneos podem ambos passar a verificação antes de qualquer inserção → 2 leituras grátis na mesma semana.
- **Impacto:** baixo (uma leitura extra ocasional; custo de IA marginal). A idempotência de 2 min reduz o caso de duplo-clique idêntico, mas não o de duas perguntas diferentes em paralelo.
- **Recomendação:** aceitável para lançamento; se preocupar, reservar a quota atomicamente (ex.: contador dedicado com update condicional) como se fez para os créditos.

## Respostas às perguntas do escopo
- **Uma falha consome a leitura?** Não — a inserção só acontece após sucesso; créditos têm refund. ✅
- **Resposta duplicada consome duas?** Não — idempotência de 2 min. ✅
- **O utilizador contorna o paywall?** **Sim, via V-001** (Data API). ❌
- **O frontend decide autorização?** Não. ✅
- **Histórico diverge do contador?** Não — a quota conta as próprias `readings`.
