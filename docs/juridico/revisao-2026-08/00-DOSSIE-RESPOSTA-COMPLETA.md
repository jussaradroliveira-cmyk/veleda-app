# Veleda — Dossiê de resposta à revisão jurídica (agosto/2026)

Resposta completa, ponto por ponto (A–I), às observações da revisão jurídica
de 13/08/2026. Cada ponto traz **(1) a situação técnica verificada em
produção** e **(2) a minuta jurídica proposta, para revisão da advogada** —
nenhuma minuta foi publicada. Detalhe completo de cada ponto nas pastas
`A-…` a `I-…` deste diretório.

---

## A) Responsabilidade pela operação

**Verificado:** os documentos publicados identificam a operadora como pessoa
singular (Jussara Derly Rodrigues de Oliveira Grota, NIF 302020250, Ericeira).
O sistema suporta mudança de entidade: republicar os legais com nova versão
força reaceite provado de todos os utilizadores.

**Para a advogada:** parecer sobre forma societária (manter pessoa singular
vs. unipessoal Lda com transferência escrita dos ativos — já prevista na
cláusula 8 da minuta de PI, ponto H) e o momento ideal (antes da divulgação
em escala evita reaceite em massa).

## B) Proteção de dados e IA — minimização

**Verificado:** a IA recebe **apenas** pergunta + 3 cartas + instruções fixas
+ idioma. Nunca recebe nome, e-mail, ID, diário, histórico ou pagamento. O
diário nunca sai do Supabase (UE). A pergunta não aparece em logs. Anti
prompt-injection na entrada e saída. Deteção de crise local (sem terceiros)
com recursos de apoio por país. Aviso fixo antes do envio e no fim de cada
leitura. Perguntas compostas bloqueadas.

**Minuta (aviso na interface, a validar):**
> "Evite incluir na pergunta nomes completos, documentos ou dados de
> terceiros. A pergunta é enviada de forma anónima ao fornecedor de IA apenas
> para gerar a sua leitura."

**Minuta (Política de Privacidade, a validar):**
> "A pergunta é transmitida ao fornecedor de inteligência artificial sem nome,
> e-mail ou qualquer identificador da conta. O fornecedor não utiliza estes
> conteúdos para treinar modelos e elimina-os automaticamente nos prazos da
> sua política comercial (ver secção Fornecedores)."

## C) Fornecedores e transferências internacionais

**Verificado:** cinco fornecedores em uso — Supabase (UE-Irlanda; dados
primários), Anthropic (EUA; payload minimizado), Stripe (EEE/EUA; pagamentos),
Vercel (EUA; hospedagem + analytics anónimo sem cookies), Resend (EUA;
e-mails de autenticação). Todos oferecem DPA com SCCs/DPF (links na pasta C).

**⚠️ Lacuna encontrada:** o **Resend não consta da página /subprocessadores**
(entrou em uso a 31/07, após a versão publicada). **Minuta da linha a
adicionar (a validar):**
> **Resend, Inc.** — Envio de e-mails transacionais de autenticação
> (recuperação de senha, confirmações de conta). — E-mail do destinatário,
> conteúdo da mensagem transacional e metadados de entrega. — Estados Unidos
> e infraestrutura indicada pelo fornecedor.

**Ação da Jussara + advogada:** arquivar cópia datada dos DPAs dos cinco.

## D) Anthropic / Claude

**Verificado (técnico):** API comercial (não o Claude.ai de consumidor);
payload mínimo sem identificadores; sem feedback enviado ao fornecedor.

**Verificado (contratual, fontes oficiais):** por padrão a Anthropic **não usa
inputs/outputs da API para treinar modelos**
(https://privacy.claude.com/en/articles/7996868-is-my-data-used-for-model-training);
eliminação automática em prazo curto (padrão histórico 30 dias; logs de API
7 dias desde set/2025); Zero Data Retention disponível por acordo
(https://www.anthropic.com/legal/commercial-terms).

**Minuta (parágrafo para a Política, a validar):**
> "As leituras são geradas por um fornecedor de inteligência artificial
> (Anthropic, EUA), que recebe apenas o texto da pergunta e as cartas
> sorteadas, sem nome, e-mail ou identificadores da conta. Nos termos da
> política comercial do fornecedor, esses conteúdos não são utilizados para
> treinar modelos de IA e são automaticamente eliminados dos sistemas do
> fornecedor em prazo curto após o processamento."

## E) Pagamentos e direito do consumidor

**Verificado:** sem divergência entre os Termos vigentes e o sistema.
Cancelamento self-service (portal Stripe; fim do período); arrependimento de
7 dias por e-mail (sem fluxo automático — Termos §8 descrevem exatamente
isto); reembolso/chargeback retiram Premium ou apenas os créditos **não
usados** do lote reembolsado; exclusão de conta cancela a assinatura antes
(falha-fechada); preços consistentes código↔Termos↔Stripe (com teste
automático).

**Três decisões para a advogada:** (1) regra prática de reembolso quando o
arrependimento chega com o serviço já usado (CDC tende ao integral em 7 dias);
(2) declaração de execução imediata no checkout para consumidores UE, quando
esse mercado abrir; (3) definir SLA de resposta a pedidos de reembolso
(sugerido: 7 dias úteis).

## F) Maioridade e prova de aceitação

**Verificado — já implementado integralmente.** Cada aceite (Termos,
Privacidade, declaração 18+) grava: versão + **hash SHA-256 do texto exato** +
**data-hora do servidor** + origem + idioma + mercado, em tabela append-only.
O cadastro é recusado pelo servidor sem os três aceites. Nova versão de
documento bloqueia o uso até reaceite (também no servidor). Hashes vigentes:
Termos 2.2 `3ac8169d…`, Privacidade 2.3 `e6bc65fe…`, 18+ `1e2ab0c0…`.
Limite documentado nos Termos §2: a maioridade é autodeclarada (sem
verificação documental). Podemos emitir extrato de prova de qualquer conta.

## G) Retenção e exclusão

**Verificado:** exclusão de conta imediata e total (testada em produção,
"zero rasto"); dados fiscais ficam na Stripe (10 anos); a Política v2.3 §8 foi
redigida por critério/finalidade precisamente porque não há rotinas
automáticas de expurgo — texto e sistema estão alinhados.

**⚠️ Única pendência:** o §9 descreve backups (diário + PITR) do **Supabase
Pro, ainda não ativado**. Ativar antes de divulgar (checklist) ou ajustar
temporariamente o §9 — decisão da advogada.

## H) Propriedade intelectual

**Confirmado pela titular (13/08):** todas as artes foram produzidas com
ferramentas da **OpenAI**, sob direção criativa dela (prompts, seleção,
curadoria), e descarregadas diretamente. Os termos da OpenAI atribuem ao
utilizador os direitos sobre o output, compatível com a reivindicação.

**Minuta pronta para revisão** (pasta H): cláusula completa de PI/conteúdo
assistido por IA — expande o atual §11 dos Termos — + **Declaração de Direção
Criativa** para assinatura da titular. Publicação (nova versão dos Termos +
hash + reaceite) fica com o técnico após aprovação.

**Pendências:** arquivar históricos/prompts da OpenAI como acervo de prova
(Jussara); estratégia de **registo de marca** — hoje "Veleda" não tem registo
INPI-BR/PT nem EUIPO (advogada).

## I) RIPD / DPIA

**Minuta completa elaborada** (pasta I, `RIPD_DPIA_MINUTA.md`), estruturada
por LGPD art. 38 + RGPD art. 35: identificação; descrição do tratamento
(inventário de dados, fluxo do clique à leitura, operadores/transferências,
retenção); necessidade e proporcionalidade (bases legais propostas — a
validar); 14 medidas de segurança verificadas; **matriz de 9 riscos** com
mitigação e residual (nenhum residual Alto; R4 sofrimento psíquico e R5
menores = Médios inerentes, mitigados e monitorizados); recomendações; secção
de parecer em branco para a advogada.

Destaques da matriz: a ausência de **Encarregado/DPO designado** (R8) precisa
de decisão jurídica (ANPD dispensa agentes de pequeno porte, mas o canal
existe — contact@); os DPAs devem ser arquivados com data (R3); a bateria de
perguntas sensíveis à IA deve rodar antes da divulgação (R4).

---

## Quadro-resumo de ações

| # | Ação | Responsável | Estado |
|---|---|---|---|
| 1 | Validar minutas: aviso IA (B), Política (B/D), linha Resend (C), cláusula PI + declaração (H), RIPD (I) | Advogada | minutas prontas |
| 2 | Publicar o que for aprovado (UI, Política, Subprocessadores, Termos §11, com versões+hash+reaceite) | Técnico | processo pronto |
| 3 | Ativar Supabase Pro (backups §9) | Jussara | antes de divulgar |
| 4 | Arquivar DPAs datados dos 5 fornecedores | Jussara + advogada | — |
| 5 | Arquivar históricos/prompts OpenAI + assinar Declaração | Jussara | — |
| 6 | Decidir DPO/Encarregado (R8) e forma societária (A) | Advogada | — |
| 7 | Registo de marca (INPI-BR/PT, EUIPO) | Advogada | — |
| 8 | Bateria de perguntas sensíveis à IA | Técnico | antes de divulgar |
