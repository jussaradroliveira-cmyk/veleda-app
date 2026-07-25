# Auditoria — Privacidade e Documentos Legais (implementação)

**Data:** 2026-07-25 · **Modo:** read-only

## Presença e ligação
- Páginas: **/termos, /privacidade, /cookies, /subprocessadores** — todas existem e ligadas no rodapé. ✅
- Cadastro com **duas caixas obrigatórias, separadas e não pré-marcadas**: "Declaro ter 18 anos ou mais" e "Li e aceito os Termos de Uso e a Política de Privacidade" (com links). Criação bloqueada sem elas. **Versão e data do aceite gravadas** (`terms_version`, `terms_accepted_at`). ✅ (testado)

## Identificação da operadora (preenchida)
- **Jussara D R Oliveira · NIF 302020250 · Ericeira, Portugal · contact@veledataro.com** nos Termos e Privacidade.
- Lei aplicável: **Portugal**; foro: **Comarca de Lisboa** (com ressalva das normas obrigatórias do consumidor). ✅
- Provedor de IA: **Anthropic (Claude)** identificado. ✅
- **0 placeholders** por preencher nas 4 páginas legais.

## Conteúdo alinhado com o produto
- Preços: R$ 39,90 / R$ 383,04 / **consulta avulsa R$ 49,90 = 5 leituras, 30 dias** (com aviso CDC). ✅
- 1 leitura gratuita/semana. ✅ 18+. ✅ Tarô simbólico não determinista. ✅
- Cookies: declara ausência de cookies não essenciais e de rastreamento (correto — a auditoria não encontrou analytics/pixels). localStorage essencial documentado. ✅
- Exclusão de conta e exportação de dados: implementadas e documentadas. ✅

## Achados

### V-005 — [P1] Documentos ainda são MINUTA (sem revisão jurídica)
- As 4 páginas têm o aviso "Documento provisório em preparação, sujeito a revisão jurídica antes do lançamento comercial". Os dados estão preenchidos, mas **nenhum advogado validou** — sobretudo a cláusula PT-a-vender-para-BR (jurisdição, CDC, IVA/faturação, LGPD vs. RGPD).
- **Impacto:** cobrar clientes sob termos provisórios é risco legal. **Recomendação:** revisão jurídica → remover o aviso. Bloqueia lançamento **comercial**, não um piloto gratuito.

### V-022 — [P3] NIF pessoal público
- O NIF (302020250) da empresária em nome individual aparece publicamente nos Termos/Privacidade — exigência legal de identificação, mas a Jussara está ciente. Sem ação, só registo.

### V-023 — [P3] Morada incompleta
- "Ericeira, Portugal" sem rua/código postal. O advogado deve indicar se a morada completa é exigida.

### V-024 — [P2] Confirmação de cancelamento/exclusão por email ainda inativa
- Os Termos referem confirmação por email do cancelamento; os ganchos existem no código mas dependem de: Stripe live (emails do Stripe) e email transacional na Veleda (ver V-003). Alinhar antes do go-live.
