# Veleda — Respostas técnicas aos pontos da revisão jurídica (agosto/2026)

Documento preparado para responder, ponto por ponto, às observações da advogada
(mensagem de 13/08/2026). Cada resposta reflete o que o sistema **efetivamente
faz em produção** (https://veledataro.com), verificado no código e na base de
dados nesta data.

---

## A) Responsabilidade pela operação (nome pessoal)

Confirmado: os documentos publicados identificam a operadora como pessoa
singular (Jussara D R Oliveira, NIF 302020250, Ericeira, Portugal). A eventual
constituição de sociedade é decisão jurídica/fiscal da operadora. **Nota
técnica:** quando a entidade mudar, o sistema já suporta republicar os
documentos legais com nova versão — os utilizadores existentes são bloqueados
até reaceitar a nova versão, e o novo aceite fica registado (ver ponto F).

## B) Proteção de dados e IA — minimização do que vai ao fornecedor

O que é **efetivamente enviado à Anthropic** em cada leitura (verificado na
função `generate-reading`):

- o texto da pergunta;
- as 3 cartas sorteadas (nome, arcano, naipe, palavras-chave);
- instruções técnicas fixas (o "prompt" da taróloga) e o idioma da leitura.

O que **nunca é enviado**: nome, e-mail, identificador do utilizador, diário,
histórico de leituras, dados de pagamento ou qualquer outro dado da conta.

Salvaguardas adicionais já em produção:

- O diário nunca sai da base de dados (Supabase, região UE/Irlanda).
- A pergunta **não aparece nos logs** do servidor (os logs registam apenas
  códigos técnicos e um identificador de pedido).
- A pergunta é tratada como dado não confiável (delimitada e com escape) para
  impedir que o seu conteúdo manipule as instruções da IA (anti prompt
  injection), na entrada e na saída.
- Deteção de sinais de crise é feita **localmente** (expressões regulares, sem
  chamada a terceiros); quando detetada, a interface mostra recursos de apoio
  (ex.: CVV 188 no Brasil) e a IA recebe instrução de acolhimento — sem
  registar o conteúdo da pergunta em logs.
- Antes de enviar a pergunta há um aviso fixo e sempre visível de que o
  serviço é reflexão simbólica/entretenimento e não substitui apoio
  profissional.

## C) Fornecedores e transferências internacionais

Fornecedores efetivamente em uso e o que recebem (a página pública
/subprocessadores já lista os quatro primeiros, com localizações):

| Fornecedor | Função | Dados | Local |
|---|---|---|---|
| Supabase | Base de dados, autenticação, backend | conta, perfil, perguntas, leituras, diário, consentimentos | UE (Irlanda) |
| Anthropic | Geração das leituras (IA) | só pergunta + cartas + instruções (ver B) | EUA |
| Stripe | Pagamentos, faturação, reembolso | e-mail, ID de cliente, plano, valores | EEE/EUA |
| Vercel | Hospedagem do site/PWA, CDN | IP, navegador, logs técnicos | EUA/CDN global |
| **Resend** | **Envio de e-mails de autenticação** (recuperação de senha etc.) | e-mail do destinatário, metadados de entrega | EUA |

⚠️ **Lacuna identificada nesta verificação:** o Resend entrou em uso a
31/07/2026 (depois da última versão da página /subprocessadores) e **ainda não
consta da lista pública**. Proposta: adicionar a linha acima na próxima versão
do documento, com redação validada pela advogada.

Todos os cinco oferecem DPA (acordo de tratamento de dados) padrão para
assinatura/aceite: Supabase, Stripe, Vercel e Resend por aceite online;
Anthropic via termos comerciais.

## D) Anthropic/Claude — envio, retenção e treino

- **O que é enviado:** ver ponto B (mínimo necessário; sem identificadores).
- **Treino de modelos:** por padrão a Anthropic **não usa inputs/outputs da
  API comercial para treinar modelos**. Fonte oficial: "By default, we will
  not use your inputs or outputs from our commercial products (e.g. Claude
  for Work, Anthropic API…) to train our models" —
  https://privacy.claude.com/en/articles/7996868-is-my-data-used-for-model-training
- **Retenção:** política comercial de eliminação automática dos inputs/outputs
  no backend em prazo curto (padrão histórico de 30 dias; logs de API
  reduzidos para 7 dias desde set/2025). Existe modalidade **Zero Data
  Retention** para clientes que qualifiquem. Termos:
  https://www.anthropic.com/legal/commercial-terms
- A conta Anthropic usada pelo Veleda é conta de API comercial (não é o
  Claude.ai de consumidor, cujo regime é diferente).

## E) Pagamentos e direito do consumidor — funcionamento real

- **Cancelamento:** self-service pelo portal do cliente Stripe (acessível na
  área da conta). Cancela no fim do período pago; sem troca de plano no
  portal; acesso mantido até o fim do período. Também aceito por e-mail.
- **Reembolso/chargeback:** processado via Stripe; o webhook do Veleda retira
  o Premium ou remove **apenas os créditos não usados do lote reembolsado**
  (créditos já gastos não são cobrados de volta; outros lotes não são
  afetados).
- **Direito de arrependimento (7 dias, CDC):** atendido **por pedido a
  contact@veledataro.com** (sem fluxo automático na interface). Os Termos §8
  já descrevem exatamente este funcionamento.
- Preços em vigor: mensal R$ 39,90 · anual R$ 383,04 · avulso R$ 49,90
  (5 leituras, 30 dias) — consistentes entre código, Termos e Stripe.

## F) Prova da aceitação e da declaração de maioridade

**Já implementado integralmente.** Cada aceite (Termos, Privacidade e
declaração de 18+) gera um registo permanente (append-only) com:

- versão do documento aceite;
- **hash SHA-256 do texto exato** que a pessoa aceitou (prova de conteúdo);
- **data e hora do servidor** (não do navegador);
- origem (cadastro, reaceite ou conta), idioma e mercado.

O cadastro **exige** os três aceites (o servidor recusa criação de conta sem
eles). Quando uma nova versão de documento é publicada, o sistema **bloqueia o
uso até reaceitar** e regista o novo aceite com os mesmos elementos. Os
registos saem na exportação de dados do titular.

## G) Retenção e exclusão — o que o sistema efetivamente faz

- **Exclusão de conta:** imediata e total — remove diário, leituras,
  consentimentos, perfil, reservas, registos de compra e a própria conta de
  autenticação (verificado; assinaturas Stripe ativas são canceladas antes,
  de forma falha-fechada). Compatível com o prazo de 30 dias da Política.
- **Dados fiscais:** eventos de pagamento permanecem na Stripe pelos prazos
  legais (10 anos), como a Política descreve.
- **Backups:** a Política v2.3 §9 descreve backups diários + PITR do plano
  **Supabase Pro, que ainda não foi ativado** (está na checklist para a
  véspera da divulgação pública). ⚠️ Até lá, esta frase da Política descreve
  capacidade ainda não contratada. Dados apagados desaparecem dos backups
  pelo ciclo natural de sobrescrita.
- A Política v2.3 foi deliberadamente redigida por **critério/finalidade**
  (sem prazos automáticos numéricos), precisamente porque não existem rotinas
  automáticas de expurgo — não há divergência entre texto e sistema.

## H) Propriedade intelectual

Pendente de documentação pela operadora: titularidade/cessão sobre marca
"Veleda", ilustrações das 78 cartas (pastas `art-originais/` e
`cards-originais/` do projeto), software e demais elementos. Não há registos
no repositório sobre autoria/licenças das artes. **Ação da operadora**, com
apoio da advogada (eventual registo de marca no INPI/EUIPO).

## I) RIPD/DPIA

Recomendação acolhida. A parte técnica (mapa de fluxos de dados, inventário de
fornecedores e transferências, medidas de segurança implementadas — RLS,
minimização à IA, logs sem conteúdo, exclusão total, prova de consentimento —
e riscos residuais) pode ser preparada pela equipa técnica como insumo, para a
advogada completar a avaliação jurídica de necessidade/proporcionalidade e
parecer final.

---

## Resumo das ações em aberto

| # | Ação | De quem |
|---|---|---|
| 1 | Adicionar **Resend** à página /subprocessadores (redação a validar) | Advogada valida → técnico publica |
| 2 | Ativar **Supabase Pro** antes de divulgar (torna plena a frase de backups da Política v2.3) | Jussara |
| 3 | Confirmar/assinar **DPAs** dos 5 fornecedores | Jussara + advogada |
| 4 | Documentar **titularidade/cessão de PI** (marca, artes, software) | Jussara + advogada |
| 5 | **RIPD/DPIA** — insumo técnico + avaliação jurídica | Técnico + advogada |
| 6 | Decisão sobre **forma societária** da operação | Jussara + advogada |
