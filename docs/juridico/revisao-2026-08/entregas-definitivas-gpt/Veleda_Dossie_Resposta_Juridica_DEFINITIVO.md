# Veleda — Dossiê definitivo de resposta à revisão jurídica (agosto/2026)

Resposta definitiva, ponto por ponto (A–I), às observações da revisão jurídica de 13/08/2026. O presente dossiê consolida a situação técnica verificada, as decisões adotadas e os documentos finais produzidos. As versões anteriores permanecem apenas como histórico.

---

## A) Responsabilidade pela operação

**Verificado:** os documentos publicados identificam a operadora como pessoa
singular (Jussara Derly Rodrigues de Oliveira Grota, NIF 302020250, Ericeira).
O sistema suporta mudança de entidade: republicar os legais com nova versão
força reaceite provado de todos os utilizadores.

**Decisão adotada:** a operação permanece, nesta fase, em nome da pessoa singular identificada nos documentos. Qualquer futura passagem para sociedade unipessoal por quotas dependerá de instrumento escrito de transferência ou licença dos ativos e de atualização dos documentos, contratos, faturação e contas dos fornecedores.

## B) Proteção de dados e IA — minimização

**Verificado:** a IA recebe **apenas** pergunta + 3 cartas + instruções fixas
+ idioma. Nunca recebe nome, e-mail, ID, diário, histórico ou pagamento. O
diário nunca sai do Supabase (UE). A pergunta não aparece em logs. Anti
prompt-injection na entrada e saída. Deteção de crise local (sem terceiros)
com recursos de apoio por país. Aviso fixo antes do envio e no fim de cada
leitura. Perguntas compostas bloqueadas.

**Texto definitivo do aviso de interface:**
> "Evite incluir na pergunta nomes completos, documentos ou dados de
> terceiros. A pergunta é enviada de forma anónima ao fornecedor de IA apenas
> para gerar a sua leitura."

**Redação incorporada à Política de Privacidade 2.4:**
A pergunta é transmitida ao fornecedor de inteligência artificial sem nome, e-mail ou identificador da conta. Segundo as condições aplicáveis ao serviço comercial, esses conteúdos não são utilizados, por padrão, para treinamento geral dos modelos e são conservados e eliminados conforme os prazos e condições do serviço contratado.

## C) Fornecedores e transferências internacionais

**Verificado:** cinco fornecedores em uso — Supabase (UE-Irlanda; dados
primários), Anthropic (EUA; payload minimizado), Stripe (EEE/EUA; pagamentos),
Vercel (EUA; hospedagem + analytics anónimo sem cookies), Resend (EUA;
e-mails de autenticação). Todos oferecem DPA com SCCs/DPF (links na pasta C).

**Lacuna corrigida na versão definitiva:** o **Resend não consta da página /subprocessadores**
(entrou em uso a 31/07, após a versão publicada). **Linha incorporada aos Subprocessadores 2.3:**
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
retenção e eliminação segundo as condições aplicáveis ao serviço comercial contratado; a opção Zero Data Retention pode ser disponibilizada por acordo
(https://www.anthropic.com/legal/commercial-terms).

**Redação incorporada à Política de Privacidade 2.4:**
> "As leituras são geradas por um fornecedor de inteligência artificial
> (Anthropic, EUA), que recebe apenas o texto da pergunta e as cartas
> sorteadas, sem nome, e-mail ou identificadores da conta. Nos termos da
> política comercial do fornecedor, esses conteúdos não são utilizados para
> treinar modelos de IA e são conservados e eliminados conforme os prazos e condições aplicáveis ao serviço comercial contratado."

## E) Pagamentos e direito do consumidor

**Verificado:** sem divergência entre os Termos vigentes e o sistema.
Cancelamento self-service (portal Stripe; fim do período); arrependimento de
7 dias por e-mail (sem fluxo automático — Termos §8 descrevem exatamente
isto); reembolso/chargeback retiram Premium ou apenas os créditos **não
usados** do lote reembolsado; exclusão de conta cancela a assinatura antes
(falha-fechada); preços consistentes código↔Termos↔Stripe (com teste
automático).

**Decisões adotadas:** (1) no Brasil, o arrependimento tempestivo gera reembolso integral, inclusive se o serviço já tiver sido iniciado; (2) no EEE, o início imediato e eventual perda do direito de livre resolução dependem de consentimento e reconhecimento expressos no checkout; (3) pedidos de reembolso serão tratados em até sete dias úteis, sem prejuízo de prazo legal inferior.

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

**Decisão adotada:** a Política 2.4 descreve apenas backups efetivamente disponíveis e condiciona a recuperação a um ponto no tempo à ativação real. O Supabase Pro permanece requisito operacional antes da divulgação em escala.

## H) Propriedade intelectual

**Confirmado pela titular (13/08):** todas as artes foram produzidas com
ferramentas da **OpenAI**, sob direção criativa dela (prompts, seleção,
curadoria), e descarregadas diretamente. Os termos da OpenAI atribuem ao
utilizador os direitos sobre o output, compatível com a reivindicação.

**Texto definitivo incorporado aos Termos 2.3** : cláusula completa de PI/conteúdo
assistido por IA — expande o atual §11 dos Termos — + **Declaração de Direção
Criativa** para assinatura da titular. Publicação (nova versão dos Termos +
hash + reaceite) fica com o técnico após revisão jurídica independente.

**Pendências:** arquivar históricos/prompts da OpenAI como acervo de prova
(Jussara); estratégia de **registo de marca** — hoje "Veleda" não tem registo
INPI-BR/PT nem EUIPO (advogada).

## I) RIPD / DPIA

**RIPD/DPIA definitivo elaborado** (`Veleda_RIPD_DPIA_v1.0_DEFINITIVO.md`), estruturada
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
| 1 | Revisar e aprovar o pacote jurídico definitivo | Advogada | pronto para revisão e assinatura |
| 2 | Publicar Termos 2.3, Privacidade 2.4, Subprocessadores 2.3 e aviso da interface; registrar hashes e exigir reaceite | Técnico | documentos e hashes prontos |
| 3 | Ativar Supabase Pro (backups §9) | Jussara | antes de divulgar |
| 4 | Arquivar DPAs datados dos 5 fornecedores | Jussara + advogada | — |
| 5 | Arquivar históricos/prompts OpenAI + assinar Declaração | Jussara | — |
| 6 | Reavaliar anualmente a necessidade de DPO e formalizar qualquer futura mudança para sociedade | Jussara + advogada | canal de privacidade ativo; operação mantida em nome pessoal |
| 7 | Registo de marca (INPI-BR/PT, EUIPO) | Advogada | — |
| 8 | Executar e documentar bateria de perguntas sensíveis: crise, menores, saúde, violência, dados pessoais e tentativas de contornar salvaguardas | Técnico + Jussara | antes de divulgar e após mudança relevante de modelo/prompt |
