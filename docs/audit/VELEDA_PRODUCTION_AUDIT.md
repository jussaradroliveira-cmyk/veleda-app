# Veleda — Auditoria de Prontidão para Produção

**Data:** 2026-07-25 · **HEAD:** 204b810 · **Auditor:** Claude (modo read-only)
**Atualização 2026-07-25:** o P0 **V-001** (e V-002, mesma causa) foi corrigido e re-testado — migration `20260725150000_lock_profile_columns.sql`. Os restantes P1 aguardam decisões da Jussara (Stripe live, Resend, Supabase Pro, jurídico).
**Site:** https://veledataro.com · **Supabase:** phixumwuktqabcngncrk (EU) · **Stripe:** entidade PT, **modo teste**

---

## 1. Resumo executivo

A Veleda é um produto **funcionalmente completo e bem construído**: o fluxo de leitura (cadastro → pergunta → tiragem → leitura com IA → histórico → diário) funciona de ponta a ponta, o design está polido em desktop e mobile, os textos estão em pt-BR, os documentos legais estão preenchidos, o Stripe está montado (em teste) com cartão + Pix, e a PWA instala-se. O RLS está ligado em todas as tabelas e o isolamento entre utilizadores está correto.

**Porém, há um furo de segurança crítico e confirmado** (V-001) que permite a qualquer utilizador com conta obter o produto pago de graça, além de vários bloqueadores de lançamento comercial (email não fiável, infraestrutura no plano grátis, Stripe ainda em teste, documentos por rever juridicamente).

A **experiência gratuita** está pronta para um piloto pequeno. O **lançamento comercial / divulgação em massa** não está — precisa de fechar 1 P0 e ~5 P1 primeiro.

## 2. Nota de prontidão (0–10)
- **Experiência gratuita (piloto, grupo pequeno):** 8/10
- **Prontidão comercial (venda pública):** 5/10

## 3. Arquitetura real
Ver `AUDIT_SYSTEM_MAP.md`. SPA React na Vercel → Supabase (Auth, Postgres+RLS, Edge Functions) → Anthropic (leituras) → Stripe (pagamentos) → Resend (email, só SARA por agora).

## 4. Divergências documentação vs. código
Nenhuma divergência relevante encontrada: preços (39,90/383,04/49,90), 1 leitura grátis/semana, 78 cartas + verso, Anthropic como provedor, contact@veledataro.com — **tudo consistente** entre código, Termos e Stripe. (As armadilhas do escopo — OpenAI, €9,90 principal, 22 arcanos, 1 grátis total — **não** se aplicam à versão atual.)

## 5. P0 — Lançamento proibido
| ID | Título | Estado |
|---|---|---|
| **V-001** | Utilizador concede `reading_credits` a si próprio via Data API → leituras pagas ilimitadas de graça | ✅ **CORRIGIDO 2026-07-25** (grants de coluna; re-testado — bloqueado 42501) |

## 6. P1 — Corrigir antes de aceitar pagamentos
| ID | Título |
|---|---|
| V-002 | `stripe_customer_id` alterável pelo utilizador (IDOR potencial no portal) |
| V-003 | Email da Veleda no SMTP embutido (2/h, spam) — recuperação de senha não fiável |
| V-004 | Supabase plano grátis — pausa por inatividade + 5xx de arranque frio nas leituras |
| V-005 | Documentos legais ainda MINUTA (sem revisão jurídica) |
| V-013 | Stripe em modo de teste — pagamentos reais impossíveis (falta go-live) |

## 7. P2 — Corrigir antes ou logo após o lançamento
V-006 (teto de gasto Anthropic) · V-007→ na verdade P3 · V-011 (segurança IA adversarial não testada) · V-012 (corrida na quota semanal) · V-014 (eventos Stripe de ciclo de vida parciais) · V-015 (ativar Billing Portal) · V-016 (3 vulns "high" em deps, não exploitáveis na config atual) · V-024 (emails de confirmação cancelamento/exclusão) · V-025 (confirmar repo==live no schema) · V-026 (a11y não auditada).

## 8. P3 / P4 — Melhoria / cosmético
V-007 (marked sem sanitização — self-XSS) · V-008 (`mailer_autoconfirm`) · V-009 (grants amplos) · V-010 (sem monitorização) · V-017 (comentário obsoleto) · V-018 (proporções de cartas) · V-019 (stats do sorteio) · V-020 (robots/sitemap/OG) · V-021 (sem staging) · V-022 (NIF público) · V-023 (morada incompleta) · V-027 (duplo-clique) · V-028 (offline).

## 9. Testes executados
- Segurança RLS runtime: auto-concessão de créditos (❌ bypass), auto-premium (✅ bloqueado), leitura cruzada de perfil/leituras (✅ isolado), anon (✅ bloqueado), RPCs de crédito (✅ só service_role).
- Paywall: consumo/refund/expiração/idempotência de créditos (✅).
- Stripe (teste): checkout dos 3 planos, pagamento cartão→premium, evento avulso→créditos, assinatura inválida→400, idempotência (✅).
- Segredos no bundle (✅ nenhum server-side).
- Recuperação de senha, lock, exclusão de conta, ícones/PWA, deck 79 ficheiros (✅).

## 10. Testes falhados
- **V-001**: auto-concessão de créditos teve sucesso (deveria falhar).

## 11. Testes não executados
- Segurança conversacional adversarial da IA (crise/médico/etc.).
- Ciclo Stripe completo (reembolso, chargeback, past_due, troca de plano, portal em live).
- Acessibilidade formal (teclado ponta a ponta, leitores de ecrã, contraste medido).
- Safari real / dispositivos físicos / redes lentas.
- Token/sessão expirados a meio de operações; concorrência de sessões.

## 12. Riscos residuais
Deliverabilidade de email da Veleda; falhas intermitentes de leitura no plano grátis sob carga; comportamento da IA em temas sensíveis; contraste a11y em textos sobre a arte.

## 13. Plano de correção recomendado (ordem)
**P0 (obrigatório antes de qualquer pagamento real):**
1. **V-001/V-002** — restringir escrita de colunas em `profiles`: `REVOKE UPDATE ON profiles FROM authenticated` + `GRANT UPDATE (display_name) TO authenticated` (ou tabela de créditos separada só-service_role). Re-testar o exploit.

**P1 (antes de divulgar / vender):**
2. **V-013** — go-live do Stripe (chaves/produtos/webhook live + Pix live).
3. **V-003** — Resend na Veleda (email fiável) + template pt-BR.
4. **V-004** — Supabase Pro.
5. **V-005** — revisão jurídica → remover "provisório".

**P2 (logo a seguir):** teto Anthropic, testar segurança IA, eventos Stripe, `npm audit fix`, a11y, confirmar schema repo==live.

## 14. Ordem P0 → P1 → P2
Conforme secção 13.

## 15. Decisão final

> ## GO para piloto
> **(gratuito, grupo pequeno e de confiança)** — a experiência gratuita está pronta e segura para testar com utilizadores reais.
>
> **NO-GO para produção comercial / divulgação em massa** até: (a) corrigir o P0 **V-001** (obrigatório — sem isto, assim que os pagamentos forem reais, o produto pago é roubável), e (b) fechar os P1 (Stripe live, email fiável, Supabase Pro, revisão jurídica).

---
*Auditoria read-only. Nenhum código, base de dados, Stripe, DNS ou deploy foi alterado. Aguarda aprovação para iniciar o plano de correção.*
