# Auditoria — UX e Funcional

**Data:** 2026-07-25 · **Modo:** read-only

## Testado ao longo do desenvolvimento (desktop 1440 + mobile 390, browser real)
- Fluxo completo: boas-vindas → cadastro (com aceite) → nome → pergunta → tiragem → leitura real → histórico → detalhe → diário → conta. ✅
- Fundos ornamentais, logo, fontes locais, cartas — coerentes nos dois tamanhos.
- Leque de cartas: contido nas laterais, escolha com animação, sem scroll; cartas reveladas de tamanho uniforme; invertidas rodam 180°. ✅
- Espera da leitura: animação celestial + texto pt-BR; `prefers-reduced-motion` respeitado.
- Recuperação de senha: botão fica cinza com aviso, cooldown 60s, sem "erro" no 429. ✅
- Convite de instalação PWA pós-cadastro: Android um toque, iPhone guiado; não aparece em desktop/instalado/dispensado. ✅
- Diário no telemóvel com arte vertical; secção vinho da landing com contraste corrigido.

## Achados

### V-026 — [P2] Acessibilidade não auditada formalmente
- Há bom uso de `aria-label`, `role`, `sr-only`, foco visível (`:focus-visible`), e `prefers-reduced-motion`. Mas **não foi feita** uma auditoria a11y completa (navegação só por teclado ponta a ponta, leitores de ecrã, contraste medido em todos os textos sobre a arte, ordem de foco no leque).
- **Risco:** médio-baixo. Alguns textos claros sobre fundos ornamentais podem não atingir o rácio de contraste AA.
- **Recomendação:** passar um Axe/Lighthouse a11y e corrigir o que sair.

### V-027 — [P3] Duplo-clique / estados de carregamento
- Botões críticos (revelar leitura, guardar, pagar) têm `disabled` durante `busy` — bom. O leque impede escolher >3. Não há proteção explícita contra duplo-envio em todos os formulários, mas a idempotência da leitura cobre o caso caro.

### V-028 — [P3] Internet lenta / offline
- Sem estados de "sem ligação" dedicados; o service worker não faz cache (é mínimo, só para instalabilidade), por isso offline a app não abre. Aceitável para v1.

## Não testado
- Safari real (só Chrome + emulação de viewport), dispositivos físicos, teclado móvel, redes lentas reais. Risco residual baixo-médio.
