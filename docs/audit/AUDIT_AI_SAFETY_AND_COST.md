# Auditoria — IA (Anthropic), Prompts, Custo e Segurança

**Data:** 2026-07-25 · **Modo:** read-only

## Configuração (verificada no código)
- Provedor: **Anthropic / Claude** (`claude-sonnet-5`), via `generate-reading`.
- **Chave só no servidor:** `ANTHROPIC_API_KEY` em Deno.env; **0 ocorrências no bundle** (verificado). ✅
- `max_tokens: 1500`; pergunta limitada a **500 caracteres**; alvo 280–380 palavras.
- **Timeout de 45s** por tentativa + até 3 tentativas com backoff (429/529/5xx). ✅
- Prompt de sistema responsável: tom simbólico, **não fatalista**; proíbe previsões médicas/legais/financeiras absolutas; pt-BR tratando por "você"; uma pergunta por leitura.

## Achados

### V-006 — [P2] Sem limite/alerta de gasto na Anthropic
- **Evidência:** a quota semanal (1 grátis) limita o custo por utilizador, mas não há teto global nem alerta configurado do lado da conta Anthropic (fora do repo, não verificável aqui).
- **Agravado por V-001:** enquanto o bypass de créditos existir, um utilizador pode gerar leituras ilimitadas → custo direto à Jussara.
- **Recomendação:** definir limite de gasto + alerta na consola Anthropic antes de divulgar; confirmar saldo/faturação.

### V-007 — [P3] Saída da IA renderizada sem sanitização (self-XSS via prompt injection)
- **Evidência:** `reading.reading_text` é renderizado com `marked.parse(...)` dentro de `dangerouslySetInnerHTML` (`NewReading.jsx:206`, `ReadingDetail.jsx:74`); o `marked` **não sanitiza HTML** e não há DOMPurify.
- **Cenário:** por prompt injection, a pessoa poderia levar a IA a devolver `<img onerror=...>`/`<script>` no texto, que seria executado.
- **Impacto: baixo** — a leitura só é mostrada ao **próprio** utilizador que a pediu (readings isoladas por RLS), logo é **self-XSS** (a pessoa ataca-se a si). Não há caminho para atingir outro utilizador.
- **Recomendação:** sanitizar (DOMPurify) ou desligar HTML no `marked`. Prioridade baixa pelo âmbito self-only, mas é higiene devida.

### V-011 — [P2] Segurança conversacional adversarial não testada formalmente
- O prompt instrui a não diagnosticar, não dar certezas, não substituir profissionais. **Não foram executados** os testes adversariais do escopo (crise, morte, doença, gravidez, pensamentos de terceiros, dependência emocional, prompt injection para quebrar o tom).
- **Risco residual:** médio. Uma leitura pode, em teoria, tocar temas sensíveis de forma inadequada.
- **Recomendação:** correr uma bateria de ~15 perguntas sensíveis antes do lançamento e afinar o prompt; considerar uma nota de segurança/emergência visível na leitura.

## Dados enviados à Anthropic
Pergunta + cartas + nome de tratamento + contexto mínimo. Declarado na Política de Privacidade e na página de Subprocessadores. ✅
