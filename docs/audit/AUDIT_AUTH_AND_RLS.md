# Auditoria — Autenticação, Sessão e RLS

**Data:** 2026-07-25 · **HEAD:** 204b810 · **Modo:** read-only (sem correções)
**Projeto Supabase:** phixumwuktqabcngncrk (EU)

## Estado do RLS (evidência real da BD)

Todas as 5 tabelas públicas têm RLS **ligado**: `profiles`, `readings`, `journal_entries`, `cards`, `processed_stripe_events`.

Políticas verificadas (`pg_policies`):
- `cards`: SELECT `true` para anon/authenticated (catálogo público — correto). Sem política de escrita → escrita negada pelo RLS. ✅
- `readings`: SELECT `auth.uid() = user_id`. Sem INSERT/UPDATE/DELETE → só o service_role (Edge Function) grava. ✅
- `journal_entries`: SELECT/INSERT/UPDATE/DELETE todas com `auth.uid() = user_id` (+ with_check em insert/update). ✅
- `profiles`: SELECT próprio; UPDATE próprio com with_check que **impede alterar `is_premium`**. Sem INSERT/DELETE (INSERT via trigger, DELETE via Edge Function). ⚠️ ver V-001.
- `processed_stripe_events`: RLS ligado, **sem políticas** → tudo negado a anon/authenticated (só service_role). ✅

## Testes de runtime executados (contas descartáveis)

| Ataque | Resultado |
|---|---|
| Utilizador dá `is_premium=true` a si próprio | ✅ **bloqueado** (erro 42501) |
| Utilizador lê o perfil de outro | ✅ isolado (0 linhas) |
| Utilizador lê leituras de outro | ✅ isolado |
| anon lê `readings` | ✅ 0 linhas |
| **Utilizador dá `reading_credits=999` a si próprio** | ❌ **BYPASS CONFIRMADO** (ver V-001) |
| `consume/refund/grant_reading_pack` chamável por utilizador | ✅ bloqueado (só service_role no ACL) |

---

## V-001 — [P0] Utilizador concede créditos pagos a si próprio via Data API

- **Componente:** BD `public.profiles` (política UPDATE + grant de coluna) → `supabase/migrations/20260724120000_reading_credits.sql`
- **Evidência (runtime, CONFIRMADO):** com a chave anon pública e uma sessão de utilizador normal, `PATCH profiles set reading_credits=999, reading_credits_expire_at=<futuro> where id=<próprio>` **teve sucesso, sem erro**; os créditos ficaram a 999.
- **Causa:** a política UPDATE de `profiles` só valida no `with_check` que `is_premium` não muda; **não restringe `reading_credits`**. O role `authenticated` tem UPDATE (a nível de tabela, todas as colunas). O PostgREST expõe esse UPDATE.
- **Cenário de exploração:** qualquer pessoa com conta faz um pedido HTTP à Data API e fica com leituras avulsas ilimitadas — sem pagar. `generate-reading` honra esses créditos (chama `consume_reading_credit`, que vê `reading_credits>0`). Bypass total do produto pago "consulta avulsa" e da quota semanal.
- **Impacto:** perda de receita direta + custo de IA descontrolado. **Probabilidade:** alta (exploração trivial, uma linha).
- **Recomendação (não aplicada):** restringir as colunas que o utilizador pode atualizar — `REVOKE UPDATE ON profiles FROM authenticated` e `GRANT UPDATE (display_name) ON profiles TO authenticated` (grants a nível de coluna); ou mover créditos/stripe para tabela separada só-service_role; ou trigger que rejeite alterações a colunas sensíveis. `is_premium` já está protegido — aplicar o mesmo padrão a `reading_credits`, `reading_credits_expire_at`, `stripe_customer_id`, `stripe_subscription_id`, `terms_*`.
- **Teste para provar a correção:** repetir o PATCH acima → deve devolver 42501/0 linhas e os créditos permanecerem inalterados.

## V-002 — [P1] `profiles.stripe_customer_id` alterável pelo utilizador (IDOR potencial no portal)

- **Componente:** mesma política UPDATE de `profiles`.
- **Evidência:** a política só bloqueia `is_premium`; `stripe_customer_id` é atualizável (mesma via do V-001).
- **Cenário:** se um utilizador puser no seu perfil o `stripe_customer_id` de outra pessoa e abrir "Gerenciar assinatura", a função `manage-subscription` cria um portal Stripe para **esse customer** → poderia ver/cancelar a assinatura alheia. Requer conhecer um customer id (baixa probabilidade), mas é uma porta aberta.
- **Recomendação:** incluído na correção de coluna do V-001 (o utilizador não deve poder escrever `stripe_customer_id`).
- **Teste:** PATCH de `stripe_customer_id` por utilizador → deve falhar.

## V-008 — [P3] Cadastro sem verificação de posse do email (`mailer_autoconfirm=true`)

- **Evidência:** config auth do Supabase Veleda tem `mailer_autoconfirm: true` — a conta ativa sem confirmar o email.
- **Impacto:** alguém pode registar-se com um email que não é seu; contas falsas. Baixo risco de segurança direto, mas relevante para qualidade da base e LGPD.
- **Recomendação:** decidir conscientemente (menos fricção vs. verificação). Se ativar confirmação, depende de email fiável (ver V-003).

## V-009 — [P3] Grants amplos (INSERT/UPDATE/DELETE/TRUNCATE) a anon/authenticated em todas as tabelas

- **Evidência:** `role_table_grants` mostra privilégios completos, incluindo TRUNCATE, para anon e authenticated em todas as tabelas.
- **Análise:** é o padrão por defeito do Supabase; o RLS gate SELECT/INSERT/UPDATE/DELETE, e o PostgREST **não expõe TRUNCATE/DDL**, por isso não é alcançável pela API. Não exploitável hoje, mas fere o princípio do menor privilégio e amplifica o impacto de qualquer política RLS mal escrita (foi o que aconteceu no V-001).
- **Recomendação:** rever grants para o mínimo necessário; grants a nível de coluna onde aplicável.

## Fluxos de sessão (verificados ao longo do desenvolvimento)

- Login, logout, recuperação de senha (link → ecrã de nova senha → troca → login) — testados ponta a ponta em produção.
- **Link de recuperação NÃO vale como login** (fica preso no ecrã de nova senha até trocar) — testado desktop+mobile.
- Exclusão de conta: re-autenticação por senha, ordem segura (diário→leituras→perfil→Auth), idempotente — testado.
- **Não testado:** token/sessão expirados a meio de operações longas; duas sessões simultâneas em conflito. Risco residual baixo.
