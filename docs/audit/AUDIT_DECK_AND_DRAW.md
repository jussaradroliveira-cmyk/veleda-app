# Auditoria — Cartas e Sorteio

**Data:** 2026-07-25 · **Modo:** read-only

## Baralho
- **78 cartas** (22 Arcanos Maiores + 4 naipes × 14: copas, ouros, espadas, paus) + **1 verso**. Confirmado em `public/cards/` e na BD (`cards`). ✅
- Imagens WebP ~450px, todas servem **200** em produção (spot-check nos 4 naipes + maiores + verso + logo/fundos).
- `verso.webp` presente. ✅

## Sorteio
- `shuffleDeck` (Fisher–Yates) em `src/lib/api.js`; cada carta com `reversed` (~35% probabilidade).
- `FanSpread`: 26 cartas no desktop / 19 no mobile, escolha de 3, sem repetição na mesma tiragem (guarda por `id`).
- A função `generate-reading` valida: exatamente 3 cartas, `card_id` numérico, `reversed` booleano, **3 ids distintos** (`new Set(ids).size !== 3` → erro). ✅ (não dá para enviar cartas repetidas).

## Correspondência nome/imagem
- `TarotCard.frontPath` deriva o caminho por `slug`/naipe → `/cards/<pasta>/<slug>.webp`; fallback para placeholder com moldura se a imagem falhar. Cartas invertidas rodam 180°. ✅

## Achados
### V-018 — [P3] Proporções de imagem heterogéneas
- Algumas artes têm proporção diferente (56 a 450×675, 13 a 450×750, 9 a 450×600). Resolvido visualmente com `object-fit: cover` numa caixa 2:3 (corte simétrico ~5%). Regenerar as 22 fora do padrão em 2:3 seria o ideal — cosmético, não bloqueia.

### V-019 — [P4] Distribuição estatística do sorteio não medida
- O Fisher–Yates + `Math.random()` é adequado; não foi feita análise estatística formal. Risco negligenciável.
