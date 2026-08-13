# F) Maioridade e prova da aceitação dos Termos

## Situação verificada (13/08/2026) — **já implementado integralmente**

Cada aceite gera um registo permanente e imutável (append-only, RLS ativa) na
tabela `user_consents`, com as colunas:

| Campo | Conteúdo | Valor probatório |
|---|---|---|
| `document_type` | `terms_acceptance`, `privacy_acknowledgement`, **`age_18_declaration`** | o quê |
| `document_version` | versão vigente no momento (ex.: Termos 2.2, Privacidade 2.3) | qual versão |
| `document_fingerprint` | **hash SHA-256 do texto exato aceite** | prova do conteúdo (qualquer alteração de 1 carácter muda o hash) |
| `recorded_at` | **data-hora do servidor** (`clock_timestamp()`, não do navegador) | quando |
| `origin` | `signup_web` / `reauth_web` / `account_web` | em que contexto |
| `locale` / `market` | idioma e mercado | como foi apresentado |

Garantias adicionais:
1. **O cadastro exige os três aceites** — o trigger do servidor recusa criar
   conta sem eles (não é só validação de interface).
2. **Reaceite automático** — quando uma nova versão de Termos/Privacidade é
   publicada (tabela `legal_documents`), o utilizador fica bloqueado até
   reaceitar; a leitura por IA também é recusada no servidor
   (`reaccept_required`), como reforço.
3. **A versão/hash gravados vêm do servidor**, nunca do cliente (não é
   possível forjar aceite de versão antiga).
4. Os registos saem na **exportação de dados** do titular (transparência) e
   são eliminados apenas com a exclusão da conta.
5. Hashes vigentes: Termos 2.2 `3ac8169d…` · Privacidade 2.3 `e6bc65fe…` ·
   Declaração 18+ `1e2ab0c0…` (verificáveis a qualquer momento recalculando o
   SHA-256 dos textos publicados).

Limite conhecido (já refletido nos Termos §2): a declaração de maioridade é
autodeclaratória — não há verificação documental/biométrica de idade. Perante
indícios de uso por menor, a conta pode ser suspensa e os dados eliminados.

## Para a advogada

Nada a implementar — este ponto está concluído tecnicamente. Se ela quiser,
podemos fornecer um **extrato de prova** de qualquer conta (registos de
consentimento com hash e hora) para juntar a um processo, via exportação de
dados ou consulta administrativa.

## Ações

| Ação | Responsável |
|---|---|
| Validar que o mecanismo satisfaz o requisito probatório | Advogada |
| (Opcional) definir template de "extrato de prova de aceite" | Advogada + técnico |
