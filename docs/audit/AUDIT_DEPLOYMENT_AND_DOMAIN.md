# Auditoria — Deploy, Domínio e Ambientes

**Data:** 2026-07-25 · **Modo:** read-only

## Domínio & HTTPS
- **veledataro.com** (Vercel, entidade PT). HTTPS Let's Encrypt válido; http→https 308; **www→raiz 308** (sem loop). ✅
- Domínios verificados na Vercel (`misconfigured:false`). DNS na Namecheap; MX/SPF/DKIM do email **intactos**.
- SPA rewrite (`vercel.json`) → rotas internas (/auth, /termos, etc.) respondem 200 e sobrevivem a refresh. ✅

## Deploy
- `scripts/deploy.sh` publica a partir do **último commit** (worktree temporário) — trabalho não commitado nunca vai para produção. ✅
- Base `/` (Vite) — corrigido da era GitHub Pages. Todos os assets (79 cartas, fundos, logo, fontes, ícones PWA, manifest) servem 200. ✅
- Baseline preservado: tag `vercel-domain-baseline-2026-07`.

## PWA
- `manifest.webmanifest` válido ("Veleda Tarô", standalone, tema vinho), ícones 192/512 + maskable (margem segura), apple-touch-icon, favicon. Service worker mínimo para instalabilidade. Convite pós-cadastro (um toque no Android, guiado no iPhone). ✅

## Ambientes
- Produção (veledataro.com) e alias técnico (veleda-app.vercel.app). Sem ambiente de staging separado.

## Achados
### V-020 — [P3] Sem robots.txt / sitemap / OG image
- Não há `robots.txt`, `sitemap.xml`, nem imagem Open Graph (cartão de partilha no WhatsApp/redes). Favicon já existe. **Recomendação:** adicionar OG image + meta antes de divulgar (impacto de marketing, não técnico).

### V-021 — [P3] Sem staging
- Alterações vão de local → produção. Para um produto com clientes, um ambiente de preview/staging reduz risco. A Vercel oferece previews por commit — por ativar/usar.

### V-013 (ver AUDIT_STRIPE) — produção aponta para Stripe **teste**
- Enquanto o Stripe estiver em teste, um visitante real que tente pagar cai num checkout de teste. Aceitável em piloto; bloqueia venda real.
