# Auditoria — Build e Qualidade de Código

**Data:** 2026-07-25 · **Modo:** read-only

## Build & lint
- `npm run build`: ✅ sucesso.
- `npm run lint` (oxlint): 1 warning benigno (`App.jsx` exporta `useAuth` além de componentes — só afeta o fast-refresh do dev). Sem erros.
- Bundle: **546 KB JS** (~170 KB gzip estimado) + 36 KB CSS. Aceitável para uma SPA; um único chunk (sem code-splitting) — otimização futura, não bloqueia.

## Segurança de segredos
- **0 segredos server-side no bundle** publicado (verificado: `service_role`, `sk_live`, `sk_test`, `whsec`, chave Resend → 0 ocorrências). Só a **anon key** (pública por design) e a URL do Supabase. ✅

## XSS / injeção
- `dangerouslySetInnerHTML` com `marked.parse(reading_text)` sem sanitização (ver AUDIT_AI_SAFETY V-007). Self-XSS, âmbito limitado.
- Sem outros `dangerouslySetInnerHTML`.

## Higiene
- Sem `console.log` com senha/token/email/chave. ✅
- Sem URLs hardcoded do GitHub Pages / `http://` no `src/` (só um comentário obsoleto em `TarotCard.jsx:3` a mencionar `/veleda-app/` — inofensivo, mas desatualizado).

## Achados

### V-016 — [P2] 3 vulnerabilidades "high" em dependências
- **Evidência (`npm audit`):**
  - `postcss` (high) — Path Traversal no auto-load de source map. **Dev/build-only** (não vai para produção).
  - `react-router` / `react-router-dom` (high) — "RSC Mode CSRF Bypass". **Aplica-se ao modo RSC**, que esta app **não usa** (SPA client-side). Exposição real: baixa.
- **Recomendação:** correr `npm audit fix` (atualizar react-router-dom para a versão corrigida) antes do lançamento; validar que o build passa. Prioridade P2 porque nenhuma é exploitável na configuração atual, mas convém não lançar com "high" por resolver.

### V-017 — [P3] Comentário desatualizado
- `TarotCard.jsx:3` refere `/veleda-app/` (era GitHub Pages). Cosmético.

## Deck
78 cartas (22 maiores + 4×14 menores) + verso = 79 ficheiros webp, todos servidos (200 em produção). ✅ Ver AUDIT_DECK_AND_DRAW.
