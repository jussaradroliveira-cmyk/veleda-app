# Veleda Tarô — Segunda Auditoria Completa de Segurança

Data da auditoria: 29 de julho de 2026
Commit auditado: `ffa3ce493cd73c62b0ac883cf8e47bb1c6f34e11` (`main`, igual a `origin/main`)
Natureza: auditoria independente, local, sem correções, deploy, rede ou acesso a produção

## 1. Resumo executivo

O projeto **não está apto para produção, beta fechado ou utilização por usuários
reais**. O hardening da Fase 1 corrigiu problemas importantes — RLS básico,
autoatribuição de benefícios, XSS ativo, CORS por prefixo, idempotência concorrente
do mesmo evento e cancelamento de assinaturas antes da exclusão — mas a revisão
direta encontrou regressões e lacunas materiais em pagamentos, consentimentos,
mercados e transparência jurídica.

Os bloqueadores principais são:

1. assinatura `active` ou `trialing` com Price ID desconhecido ou de outro produto
   concede Premium;
2. a reconciliação Stripe escolhe somente a assinatura mais recente, não percorre
   todas as assinaturas e não remove Premium quando não encontra assinatura;
3. reembolso/chargeback recebido antes do evento de compra não impede concessão
   posterior dos créditos;
4. qualquer usuário pode escolher o mercado BR, inclusive após declarar PT/EEE;
5. perguntas potencialmente sensíveis são enviadas à Anthropic sem o aviso
   destacado e consentimento específico que os documentos públicos afirmam existir;
6. contas anteriores à versão 2.1 não são obrigadas a aceitar os documentos atuais.

Foram identificados **20 achados**: 0 Críticos, 6 Altos, 11 Médios, 3 Baixos e
0 Informativos. Há ainda configurações externas importantes que não puderam ser
verificadas.

### Contagem por severidade

| Severidade | Quantidade | Bloqueadores de produção |
|---|---:|---:|
| Crítica | 0 | 0 |
| Alta | 6 | 6 |
| Média | 11 | 7 |
| Baixa | 3 | 0 |
| Informativa | 0 | 0 |
| **Total** | **20** | **13** |

## 2. Escopo

Foram inventariados os 200 arquivos rastreados e examinados os 103 arquivos
relevantes de código, configuração, migrations, testes, scripts e documentação:

- 36 arquivos em `src/`;
- 13 migrations;
- 11 arquivos de Edge Functions e módulos compartilhados;
- 7 arquivos de testes/fixtures;
- 21 documentos em `docs/` e `DOCS JURIDICOS/`, incluindo extração local dos
  dois DOCX;
- 4 scripts;
- 11 arquivos raiz/configuração/PWA, incluindo `package.json`, lockfile,
  `vercel.json`, Vite, env example e README.

O escopo cobriu frontend React/Vite, Auth, Supabase/RLS/RPC, quota, Anthropic,
Stripe, catálogo e mercados, Premium, pacotes, diário, histórico, exportação,
exclusão, webhooks, reconciliação, CSP, dependências, logs, scripts, documentos
jurídicos e testes.

## 3. Limitações

- Não houve acesso a Supabase remoto, Vercel, Stripe, Anthropic, SMTP, DNS,
  produção ou dados de usuários.
- Nenhuma migration foi aplicada.
- Não havia Deno nem TypeScript CLI local; Edge Functions não foram type-checked
  ou servidas.
- Não foi executado Postgres local. RLS, grants, triggers, rollback e
  concorrência SQL foram analisados estaticamente, não exercitados.
- Stripe test não foi chamado. Os cenários Stripe existentes usam mocks e
  inspeção textual.
- `npm audit` foi executado somente com `--offline`; o resultado não prova
  ausência de advisories publicados depois do cache local.
- Flags `verify_jwt`, schema live, buckets, Auth/SMTP/CAPTCHA, backups/PITR,
  secrets, produtos, Price IDs, eventos inscritos, Portal, Adaptive Pricing,
  scheduler e contratos/DPA são externos ou não versionados.
- Não existe `docs/correcoes-fase-1/FASE_1B_REVIEW_FIXES.md`.
- Não existe `docs/juridico/documentos-finais/`. Os DOCX existentes ficam em
  `DOCS JURIDICOS/` e têm `MINUTA-2` no nome e placeholders internos; não são
  documentos definitivos.
- Não foi feita conclusão jurídica autônoma: foram apontadas divergências
  factuais entre texto público, código e decisões ainda pendentes.

## 4. Estado do repositório

### 4.1 Estado inicial

Comandos executados antes da análise:

- `git status --short`: sem saída;
- `git diff --stat`: sem saída;
- `git diff --no-ext-diff --binary`: sem saída;
- `git ls-files --others --exclude-standard`: sem saída.

Portanto, **não havia trabalho não commitado no início da auditoria**. As
correções estão em commits de `main`; não seria verdadeiro registrar o contrário.
O relatório desta rodada, por exigência da tarefa, ficará como único arquivo novo
e não commitado ao final.

Arquivos ignorados preexistentes encontrados, sem alteração: `.env`,
`.env.local`, `docs/.DS_Store`, `supabase/.DS_Store`, `DOCS JURIDICOS/.DS_Store`
e `supabase/.temp/`. Os nomes de variáveis foram inspecionados com valores
redigidos. `.env` contém somente variáveis públicas Vite/Supabase; `.env.local`
contém `VERCEL_OIDC_TOKEN` e permanece ignorado.

### 4.2 Arquivos anteriores e posteriores às correções

O baseline imediatamente anterior à Fase 1 é o commit `7601386`. Já existiam,
entre outros: frontend principal, `create-checkout`, `generate-reading`,
`stripe-webhook`, `delete-account`, migrations iniciais, scripts, páginas legais
React, os dois DOCX `MINUTA-2` e configurações raiz.

Foram criados depois desse baseline:

- módulos compartilhados de billing, quota, Stripe e exclusão;
- `reconcile-stripe` e `export-data`;
- migrations da Fase 1, limites do diário, FK composta, limite Premium e hash
  jurídico v2.1;
- `BillingOffers`, `SafeMarkdown`, `LegalDoc` e bibliotecas associadas;
- fontes Markdown públicas v2.1;
- toda a suíte atual em `tests/`;
- relatórios da primeira auditoria/correções, changelog e documento mestre
  jurídico.

O diff histórico `7601386..HEAD` mostra esses arquivos como adicionados ou
modificados. Os relatórios da Fase 1 entraram no commit `91eb64d`; alterações
posteriores foram commitadas separadamente até `ffa3ce4`.

## 5. Achados confirmados

### VLT2-001 — Assinatura fora do catálogo concede Premium

- **Severidade:** Alta
- **Confiança:** Alta
- **Categoria:** Stripe / autorização de benefício
- **Arquivo e linhas:** `supabase/functions/_shared/stripe-state.js:20-29`;
  `supabase/functions/stripe-webhook/index.ts:78-101`;
  `supabase/functions/reconcile-stripe/index.ts:53-69`;
  `supabase/migrations/20260728120000_phase1_security_integrity.sql:575-658`
- **Comportamento observado:** `subscriptionSnapshot()` define
  `is_premium` apenas por `active`/`trialing`. O webhook localiza o Price ID no
  catálogo, mas passa `premium_value: snapshot.is_premium` mesmo quando
  `catalogItem` é `null`. A RPC aceita Price ID/mercado nulos e grava Premium.
- **Cenário:** um customer Veleda possui assinatura ativa de outro produto Stripe
  ou Price ID desconhecido; qualquer evento dessa assinatura ativa Premium.
- **Impacto:** concessão indevida de benefício pago, custo de IA e quebra do
  isolamento comercial entre produtos.
- **Prova técnica:** `market_value: catalogItem?.market ?? null` é independente de
  `premium_value`. A mesma falha existe na reconciliação.
- **Teste existente/ausente:** ausente. O teste atual valida apenas
  `subscriptionEntitled(status)` e não testa catálogo desconhecido.
- **Correção recomendada:** derivar Premium de
  `catalogItem != null && plan recorrente compatível && status elegível`; validar
  produto, Price ID, moeda, valor, intervalo e modo antes da RPC; falhar fechado.
- **Bloqueia produção:** sim
- **Depende de staging:** não para confirmar; sim para aceite SQL
- **Depende de decisão jurídica/comercial:** não

### VLT2-002 — Reconciliação não representa todas as assinaturas nem remove Premium órfão

- **Severidade:** Alta
- **Confiança:** Alta
- **Categoria:** Stripe / reconciliação / estado
- **Arquivo e linhas:** `supabase/functions/reconcile-stripe/index.ts:30-49`;
  `supabase/functions/reconcile-stripe/index.ts:50-74`;
  `supabase/migrations/20260728120000_phase1_security_integrity.sql:692-731`
- **Comportamento observado:** lista no máximo 100 assinaturas sem paginar,
  ordena por criação e usa somente a mais recente. Se não houver assinatura,
  registra `no_subscription` na resposta, mas não atualiza o perfil.
- **Cenário:** customer tem uma assinatura antiga ativa e outra mais recente
  cancelada; a reconciliação remove Premium indevidamente. No cenário inverso,
  uma assinatura mais recente desconhecida pode conceder Premium. Se todas forem
  removidas, um `is_premium=true` local permanece.
- **Impacto:** acesso pago indevido ou bloqueio de cliente legítimo; snapshot
  local não converge com a Stripe.
- **Prova técnica:** `subscriptions.data.sort(...)[0]` e o ramo `if (!current) {
  ... continue; }`.
- **Teste existente/ausente:** ausente; fixtures não exercitam a Edge Function.
- **Correção recomendada:** paginar todas as assinaturas, filtrar exclusivamente
  produtos/Prices do catálogo, definir regra determinística para múltiplas
  assinaturas e aplicar snapshot explícito “sem assinatura válida” que remova
  Premium.
- **Bloqueia produção:** sim
- **Depende de staging:** sim
- **Depende de Stripe test:** sim
- **Depende de decisão jurídica/comercial:** sim, para regra de múltiplas assinaturas

### VLT2-003 — Reembolso/chargeback anterior à compra não impede concessão posterior

- **Severidade:** Alta
- **Confiança:** Alta
- **Categoria:** Stripe / eventos fora de ordem / reversão
- **Arquivo e linhas:**
  `supabase/migrations/20260728120000_phase1_security_integrity.sql:498-539`;
  `supabase/migrations/20260728120000_phase1_security_integrity.sql:416-495`;
  `supabase/functions/stripe-webhook/index.ts:206-237`
- **Comportamento observado:** quando a reversão chega antes de
  `stripe_payment_purchases`, ela é gravada como `purchase_not_found` e retorna
  sucesso. A concessão posterior verifica somente duplicidade de event ID e
  PaymentIntent já concedido; não verifica reversão anterior pelo PaymentIntent.
- **Cenário:** Stripe entrega `charge.refunded` ou disputa antes do
  `checkout.session.completed`; os créditos são concedidos depois para um
  pagamento já revertido.
- **Impacto:** benefício financeiro após reembolso/chargeback e divergência
  contábil.
- **Prova técnica:** o ramo `purchase_not_found` retorna sem criar tombstone na
  tabela de compras; `process_stripe_pack_event` não consulta eventos de reversão.
- **Teste existente/ausente:** fixtures contêm refund/chargeback, mas nenhum teste
  executa esta ordem nem SQL real.
- **Correção recomendada:** persistir tombstone por PaymentIntent e estado mais
  recente; a concessão deve consultar/serializar esse estado e recusar PaymentIntent
  já reembolsado/disputado. Testar ambas as ordens.
- **Bloqueia produção:** sim
- **Depende de staging:** sim
- **Depende de Stripe test:** sim
- **Depende de decisão jurídica/comercial:** não

### VLT2-004 — Saldo e validade de pacotes podem reativar créditos expirados ou retirar o pacote errado

- **Severidade:** Média
- **Confiança:** Alta
- **Categoria:** Stripe / créditos pagos
- **Arquivo e linhas:**
  `supabase/migrations/20260728120000_phase1_security_integrity.sql:482-489`;
  `supabase/migrations/20260728120000_phase1_security_integrity.sql:556-569`
- **Comportamento observado:** nova compra soma `qty` ao saldo mesmo se o saldo
  anterior expirou, e redefine a validade inteira para `agora + 30 dias`. A
  reversão subtrai cinco do saldo global atual, sem identificar quais créditos
  daquele pacote foram consumidos.
- **Cenário:** cinco créditos expirados + nova compra resulta em dez créditos
  válidos. Em outro caso, pacote A é consumido, pacote B é comprado e o reembolso
  de A subtrai créditos legítimos de B.
- **Impacto:** concessão indevida ou perda de benefício pago; disputas de consumo.
- **Prova técnica:** `greatest(reading_credits, 0) + qty` ignora
  `reading_credits_expire_at`; não existe ledger por crédito/pacote.
- **Teste existente/ausente:** ausente.
- **Correção recomendada:** ledger por lote com quantidade restante, validade e
  PaymentIntent; consumo FIFO/critério definido; reversão limitada ao lote.
- **Bloqueia produção:** sim
- **Depende de staging:** sim
- **Depende de Stripe test:** sim
- **Depende de decisão jurídica/comercial:** sim, para FIFO/validade/reembolso parcial

### VLT2-005 — Retry prometido após falha da IA reutiliza chave permanentemente liberada

- **Severidade:** Média
- **Confiança:** Alta
- **Categoria:** quota / idempotência / regressão
- **Arquivo e linhas:**
  `supabase/migrations/20260729124416_premium_daily_limit.sql:32-57`;
  `supabase/functions/generate-reading/index.ts:229-239`;
  `src/pages/NewReading.jsx:93-98`; `src/pages/NewReading.jsx:104-125`;
  `src/lib/api.js:37-48`
- **Comportamento observado:** falha da Anthropic libera a reserva; a mesma chave
  passa a retornar `reservation_released`. A UI mantém a chave e manda tocar
  novamente em “Revelar”. O retry automático também reutiliza a chave.
- **Cenário:** primeira chamada recebe 502; o retry automático recebe 409, e todos
  os retries manuais da mesma tiragem continuam falhando.
- **Impacto:** indisponibilidade e experiência enganosa; o usuário precisa
  reiniciar a tiragem/recarregar para obter nova chave.
- **Prova técnica:** o SQL nunca reabre registro `released`; a UI só gera chave em
  `startSpread()`.
- **Teste existente/ausente:** o mock afirma que falha libera e uma **nova** chave
  funciona; não testa a mesma chave usada pelo frontend.
- **Correção recomendada:** definir semântica de retry: reabrir com segurança a
  mesma chave e hash, ou gerar nova chave explicitamente na UI após liberação.
- **Bloqueia produção:** não isoladamente
- **Depende de staging:** sim
- **Depende de decisão jurídica/comercial:** não

### VLT2-006 — Orçamento global e abuso por múltiplas contas não são atômicos

- **Severidade:** Média
- **Confiança:** Alta
- **Categoria:** quota / abuso / custo
- **Arquivo e linhas:** `supabase/migrations/20260729124416_premium_daily_limit.sql:30`;
  `supabase/migrations/20260729124416_premium_daily_limit.sql:89-112`;
  `src/pages/Auth.jsx:92-106`
- **Comportamento observado:** o advisory lock é por usuário. A contagem global de
  5.000 reservas não usa lock/contador global; várias contas podem observar o
  mesmo valor e ultrapassá-lo. Não há controle por IP/dispositivo no repositório.
- **Cenário:** automação cria/usa várias contas e dispara requisições
  simultâneas perto do teto, excedendo o orçamento e multiplicando a quota grátis.
- **Impacto:** custo Anthropic e indisponibilidade.
- **Prova técnica:** `pg_advisory_xact_lock` usa `uid`; o `count(*)` global é uma
  leitura sem serialização.
- **Teste existente/ausente:** ausente. O mock de 20 chamadas usa um único usuário
  e uma fila JavaScript.
- **Correção recomendada:** contador/bucket global atômico, rate limit de borda,
  controles antifraude proporcionais e alertas/orçamento no fornecedor.
- **Bloqueia produção:** sim
- **Depende de staging:** sim
- **Depende de decisão jurídica/comercial:** sim, para orçamento e controles

**Conclusão específica de concorrência:** se a migration final estiver aplicada
como escrita, 20 chamadas simultâneas da **mesma conta gratuita** não devem
ultrapassar uma reserva semanal: advisory lock + índice parcial único serializam
o caso. Uma conta Premium pode completar no máximo dez reservas válidas no dia,
e no máximo duas ficam ativas simultaneamente. Isso é conclusão de análise
estática, não prova transacional. Vinte contas diferentes podem ultrapassar o
teto global por corrida.

### VLT2-007 — Usuário pode escolher arbitrariamente o mercado mais barato

- **Severidade:** Alta
- **Confiança:** Alta
- **Categoria:** preços / mercado / autorização comercial
- **Arquivo e linhas:** `src/components/BillingOffers.jsx:21-32`;
  `src/components/BillingOffers.jsx:52-59`; `src/lib/billing.js:26-30`;
  `supabase/functions/create-checkout/index.ts:65-74`;
  `src/pages/Auth.jsx:181-189`
- **Comportamento observado:** o catálogo abre em BR sempre que BR está habilitado;
  a seleção do signup não vincula a conta, e o servidor aceita qualquer mercado
  habilitado enviado no body.
- **Cenário:** residente PT/EEE declara PT no cadastro e contrata BRL/BR
  selecionando BR na UI ou enviando `{market:"BR"}` diretamente.
- **Impacto:** arbitragem de preço, moeda/oferta incorreta e risco fiscal/consumerista.
- **Prova técnica:** não há coluna de mercado contratual no perfil nem validação
  por customer, país de cobrança ou elegibilidade.
- **Teste existente/ausente:** ausente; os testes confirmam apenas que o catálogo
  server-side resolve valores.
- **Correção recomendada:** definir e aplicar regra server-side de elegibilidade e
  mudança de mercado; não usar mera escolha do cliente como autorização.
- **Bloqueia produção:** sim para lançamento multirregional
- **Depende de staging:** não
- **Depende de Stripe test:** sim
- **Depende de decisão jurídica/comercial:** sim

### VLT2-008 — Termos públicos divergem do preço anual efetivo

- **Severidade:** Média
- **Confiança:** Alta
- **Categoria:** jurídico / preço / transparência
- **Arquivo e linhas:** `src/pages/legal/termos.md:53-59`;
  `supabase/functions/_shared/billing-config.js:1-5`;
  `docs/juridico/PENDENCIAS_ANTES_DO_LANCAMENTO.md:22-28`
- **Comportamento observado:** Termos afirmam preço anual vigente de R$ 399,00;
  catálogo e teste fixam R$ 383,04. Os Termos também mencionam possível primeiro
  mês por R$ 29,90, sem mecanismo promocional versionado.
- **Cenário:** usuário aceita um preço contratual e recebe checkout com outro.
- **Impacto:** ambiguidade da oferta e contestação de preço/renovação.
- **Prova técnica:** valores literais divergentes. O documento interno ainda pede
  confirmação de R$ 383,04.
- **Teste existente/ausente:** teste do catálogo passa, mas não compara catálogo
  com os Termos.
- **Correção recomendada:** decisão comercial única e teste de consistência entre
  catálogo, checkout e texto jurídico; só mencionar promoção se tecnicamente ativa.
- **Bloqueia produção:** sim
- **Depende de staging:** não
- **Depende de decisão jurídica/comercial:** sim

### VLT2-009 — Consentimento específico para pergunta sensível é afirmado, mas não existe

- **Severidade:** Alta
- **Confiança:** Alta
- **Categoria:** privacidade / dados sensíveis / IA
- **Arquivo e linhas:** `src/pages/legal/privacidade.md:37-56`;
  `src/pages/legal/termos.md:85-94`; `src/pages/NewReading.jsx:145-160`;
  `supabase/functions/generate-reading/index.ts:187-216`
- **Comportamento observado:** Política e Termos afirmam aviso destacado e
  consentimento específico ao submeter pergunta sensível. A tela mostra apenas
  orientação de foco; não há aviso, checkbox, registro ou classificação antes do
  envio. O disclaimer completo aparece depois da primeira leitura.
- **Cenário:** usuário escreve saúde, religião, sexualidade ou crise; o texto é
  enviado integralmente à Anthropic sem o gesto específico descrito.
- **Impacto:** divergência de transparência/base jurídica para dados potencialmente
  sensíveis e exposição internacional não esperada.
- **Prova técnica:** o payload é enviado diretamente após validação sintática.
- **Teste existente/ausente:** ausente.
- **Correção recomendada:** decisão jurídica sobre base adequada; aviso pré-envio
  realmente destacado e, se a base for consentimento explícito, gesto e registro
  granular antes de cada tratamento pertinente.
- **Bloqueia produção:** sim
- **Depende de staging:** não
- **Depende de decisão jurídica/comercial:** sim

### VLT2-010 — Versão 2.1 não é aceita por contas existentes

- **Severidade:** Alta
- **Confiança:** Alta
- **Categoria:** consentimentos / versionamento jurídico
- **Arquivo e linhas:**
  `supabase/migrations/20260729132430_consent_v21_text_hash.sql:10-55`;
  `src/pages/Auth.jsx:86-106`; `src/App.jsx:30-35`
- **Comportamento observado:** a v2.1 é gravada somente no trigger
  `after insert on auth.users`. Não há backfill confiável, tela de reaceite ou
  gate de versão para contas já existentes.
- **Cenário:** usuário criado antes de 29/07 continua gerando leituras e comprando
  sob a v2.1 sem registro de aceite dessa versão.
- **Impacto:** falta de prova do documento vigente e contradição com a afirmação
  de que a versão aceita é registrada.
- **Prova técnica:** nenhuma rota consulta `user_consents`; a migration apenas
  substitui `handle_new_user`.
- **Teste existente/ausente:** ausente; teste de consentimento cobre apenas signup.
- **Correção recomendada:** fluxo de reaceite versionado, append-only, com hash
  canônico, servidor, idioma, mercado e bloqueio proporcional até aceite.
- **Bloqueia produção:** sim
- **Depende de staging:** sim
- **Depende de decisão jurídica/comercial:** sim

### VLT2-011 — Trigger de consentimento e exclusão não suportam autenticação sem senha

- **Severidade:** Média
- **Confiança:** Alta
- **Categoria:** autenticação / ciclo de vida
- **Arquivo e linhas:**
  `supabase/migrations/20260729132430_consent_v21_text_hash.sql:20-24`;
  `supabase/functions/delete-account/index.ts:80-95`;
  `src/pages/Account.jsx:146-176`
- **Comportamento observado:** toda criação de `auth.users` exige três metadados.
  OAuth, convite ou criação administrativa padrão sem esses campos falha no
  trigger. Usuário OAuth-only não possui senha para a reautenticação da exclusão.
- **Cenário:** ativar OAuth/invite/admin sem adaptar o fluxo impede criar conta;
  conta sem senha não consegue usar a exclusão self-service.
- **Impacto:** indisponibilidade de cadastro e exercício incompleto do direito de
  exclusão em métodos futuros/administrativos.
- **Prova técnica:** exceção `required_acceptances_missing` é incondicional para
  toda inserção de Auth; exclusão chama somente `signInWithPassword`.
- **Teste existente/ausente:** ausente; não há testes OAuth/invite/admin.
- **Correção recomendada:** desenhar estados de conta pendente/aceite para cada
  provedor e reautenticação compatível com o método autenticador.
- **Bloqueia produção:** sim se qualquer fluxo sem senha for habilitado
- **Depende de staging:** sim
- **Depende de decisão jurídica/comercial:** sim, sobre provedores suportados

### VLT2-012 — Prazos de retenção e backups públicos não são comprovados

- **Severidade:** Média
- **Confiança:** Alta quanto à divergência; Baixa quanto à configuração externa
- **Categoria:** jurídico / retenção / operação
- **Arquivo e linhas:** `src/pages/legal/privacidade.md:74-90`;
  `docs/juridico/PENDENCIAS_ANTES_DO_LANCAMENTO.md:40-57`;
  `src/pages/Account.jsx:137-142`
- **Comportamento observado:** a Política publica 30 dias para ativos, 90 para
  backups, 12 meses para logs e 24 meses para suporte, e afirma backups/resposta
  a incidentes como medidas adotadas. O documento interno diz que prazos, plano,
  PITR, restore, retenção, DPA e resposta ainda precisam ser definidos.
- **Cenário:** titular ou autoridade recebe prazo específico que a operação não
  consegue demonstrar.
- **Impacto:** transparência inexata e obrigação operacional não suportada.
- **Prova técnica:** contradição textual direta; nenhum código implementa esses
  ciclos e a configuração externa não foi acessada.
- **Teste existente/ausente:** ausente.
- **Correção recomendada:** verificar contratos/configuração e alinhar texto a
  prazos realmente executáveis; criar política operacional e testes de restore.
- **Bloqueia produção:** sim
- **Depende de staging:** não
- **Depende de decisão jurídica/comercial:** sim

### VLT2-013 — Markdown permite links externos iniciados por `//`

- **Severidade:** Média
- **Confiança:** Alta
- **Categoria:** conteúdo / phishing / sanitização
- **Arquivo e linhas:** `src/lib/safe-markdown.js:20`;
  `src/lib/safe-markdown.js:48-56`; `src/lib/legal-doc.js:15`
- **Comportamento observado:** a allowlist de URI aceita qualquer valor iniciado
  por `/`, inclusive `//evil.example`. Teste local produziu
  `<a href="//evil.example/path">`.
- **Cenário:** prompt adversarial induz resposta armazenada com link de aparência
  legítima; clique navega para domínio externo no mesmo esquema.
- **Impacto:** phishing e saída para destino não confiável; não foi demonstrada
  execução de script.
- **Prova técnica:** `SAFE_URL = /...|[#/]/` e execução local com JSDOM/DOMPurify.
  `javascript:` e `data:` foram removidos.
- **Teste existente/ausente:** testes cobrem `javascript:`, mas não `//`.
- **Correção recomendada:** distinguir `/caminho` de `//host`, remover links da
  saída da IA ou aplicar allowlist explícita de destinos.
- **Bloqueia produção:** não isoladamente
- **Depende de staging:** não
- **Depende de decisão jurídica/comercial:** não

### VLT2-014 — Exportação não é “completa” para todos os dados pessoais do ciclo

- **Severidade:** Média
- **Confiança:** Alta
- **Categoria:** privacidade / acesso / portabilidade
- **Arquivo e linhas:** `supabase/functions/export-data/index.ts:82-116`;
  `src/pages/Account.jsx:109-114`;
  `supabase/migrations/20260728120000_phase1_security_integrity.sql:377-385`
- **Comportamento observado:** a função inclui seis tabelas e parte de
  `auth.users`, mas omite `processed_stripe_events`, metadados/identidades Auth,
  logs e dados mantidos por terceiros. O arquivo avisa parte das omissões, enquanto
  a UI o chama de “arquivo completo”.
- **Cenário:** titular interpreta o download como resposta integral e não recebe
  eventos técnicos/financeiros vinculáveis ou metadados de autenticação.
- **Impacto:** atendimento incompleto ou comunicação enganosa sobre direito de
  acesso; a ferramenta é melhor que a anterior, mas não fecha o ciclo.
- **Prova técnica:** lista fixa de consultas; `processed_stripe_events` não tem
  `user_id` e não é correlacionado.
- **Teste existente/ausente:** não existe teste de exportação.
- **Correção recomendada:** inventário jurídico versionado por categoria, joins
  seguros para eventos, dados Auth pertinentes e distinção clara entre download
  self-service e resposta integral por solicitação.
- **Bloqueia produção:** sim antes de usuários reais
- **Depende de staging:** sim
- **Depende de decisão jurídica/comercial:** sim, para escopo de retenção/acesso

### VLT2-015 — Segurança conversacional continua dependente do modelo

- **Severidade:** Média
- **Confiança:** Alta
- **Categoria:** IA / prompt injection / crise
- **Arquivo e linhas:** `supabase/functions/generate-reading/index.ts:187-200`;
  `supabase/functions/generate-reading/index.ts:235-240`;
  `src/pages/NewReading.jsx:219-225`
- **Comportamento observado:** há system prompt e delimitação, mas a pergunta pode
  conter a própria tag `</PERGUNTA_NAO_CONFIAVEL>`. Não há moderação pré/pós,
  schema estruturado, detecção/roteamento de crise ou validação semântica. O
  disclaimer completo ocorre somente depois da primeira resposta.
- **Cenário:** usuário fecha o delimitador e injeta instruções, ou relata crise;
  o sistema depende exclusivamente da obediência probabilística do modelo.
- **Impacto:** resposta inadequada em saúde mental/violência e orientação excessiva.
  A sanitização reduz XSS, não risco semântico.
- **Prova técnica:** interpolação literal da pergunta e validação apenas de
  string/tamanho.
- **Teste existente/ausente:** não há corpus adversarial de IA; Anthropic real não
  foi chamada.
- **Correção recomendada:** escapar/estruturar input, validação de saída, fluxo
  seguro para crise e suíte adversarial sem registrar conteúdo pessoal.
- **Bloqueia produção:** sim para usuários reais
- **Depende de staging:** sim
- **Depende de decisão jurídica/comercial:** sim, para política de conteúdo

### VLT2-016 — Política de Cookies omite duas chaves locais

- **Severidade:** Baixa
- **Confiança:** Alta
- **Categoria:** privacidade / armazenamento local
- **Arquivo e linhas:** `src/pages/Cookies.jsx:25-60`;
  `src/components/InstallPrompt.jsx:3-4`;
  `src/pages/NewReading.jsx:110-116`
- **Comportamento observado:** a tabela lista token Supabase,
  `veleda_recovery_pending` e `veleda_install_hint`, mas omite
  `veleda_install_dismissed` e `veleda_disclaimer_seen`.
- **Cenário:** usuário não recebe inventário completo das preferências persistentes.
- **Impacto:** transparência menor; não há dado íntimo nessas duas chaves.
- **Prova técnica:** busca de todas as chamadas `localStorage`.
- **Teste existente/ausente:** ausente.
- **Correção recomendada:** inventário único e teste automatizado das chaves.
- **Bloqueia produção:** não
- **Depende de staging:** não
- **Depende de decisão jurídica/comercial:** não

### VLT2-017 — Scripts continuam capazes de atingir produção

- **Severidade:** Baixa
- **Confiança:** Alta
- **Categoria:** operação / supply chain
- **Arquivo e linhas:** `scripts/deploy.sh:9-25`;
  `scripts/dev-reset-quota.mjs:9-24`; `scripts/e2e.mjs:6-19`
- **Comportamento observado:** E2E/reset têm flag de confirmação, mas apontam
  explicitamente para o único projeto real. O deploy executa `--prod` sem
  confirmação e `npx vercel@58.1.0` pode buscar o pacote fora do lockfile.
- **Cenário:** operador executa `npm run deploy`, ou define a flag no ambiente
  errado, publicando/alterando produção.
- **Impacto:** deploy acidental, exclusão de leituras ou chamada paga à IA.
- **Prova técnica:** alvos e `--prod` literais nos scripts.
- **Teste existente/ausente:** ausente.
- **Correção recomendada:** staging separado, project-ref allowlist, confirmação
  de alvo/commit e CLI como devDependency/lockfile.
- **Bloqueia produção:** não como vulnerabilidade do runtime
- **Depende de staging:** sim para operação segura
- **Depende de decisão jurídica/comercial:** não

### VLT2-018 — Suíte falha e não exercita SQL, RLS ou concorrência real

- **Severidade:** Média
- **Confiança:** Alta
- **Categoria:** garantia de segurança / testes
- **Arquivo e linhas:** `tests/consents.test.js:20-25`;
  `tests/quota.test.js:10-47`; `tests/stripe-events.test.js:23-39`;
  `tests/stripe-events.test.js:105-120`
- **Comportamento observado:** `npm test` falhou 1 de 52 porque o teste ainda
  espera versões de 28/07. Quota/Stripe concorrentes são filas JavaScript; vários
  testes apenas procuram regex no SQL.
- **Cenário:** regressão transacional ou de RLS passa na suíte porque o Postgres
  nunca é executado.
- **Impacto:** falsa confiança em controles financeiros e de isolamento.
- **Prova técnica:** saída local: 51 pass, 1 fail; nenhuma conexão Postgres.
- **Teste existente/ausente:** faltam testes SQL, RLS cross-user, locks reais,
  rollback, migrations desde zero e upgrade com dados legados.
- **Correção recomendada:** banco descartável em CI/staging, clientes anon/auth A/B,
  20 conexões reais e Stripe test para estados/ordens.
- **Bloqueia produção:** sim
- **Depende de staging:** sim
- **Depende de decisão jurídica/comercial:** não

### VLT2-019 — Limites de perfil/diário não são totalmente resistentes à concorrência

- **Severidade:** Baixa
- **Confiança:** Alta
- **Categoria:** integridade / disponibilidade
- **Arquivo e linhas:** `supabase/migrations/20260728171816_journal_entry_limits.sql:14-31`;
  `supabase/migrations/20260704120000_init.sql:25-29`;
  `supabase/migrations/20260725150000_lock_profile_columns.sql:9-10`
- **Comportamento observado:** o cap de 2.000 faz `count(*)` em trigger sem lock ou
  constraint agregada, permitindo inserções concorrentes acima do teto. A coluna
  `display_name` não tem CHECK de tamanho; o cliente autenticado pode ignorar o
  `maxLength=60`.
- **Cenário:** chamadas paralelas perto de 2.000 ultrapassam o cap; requisição
  direta grava nome muito grande.
- **Impacto:** consumo de banco e degradação/UX, limitado por conta.
- **Prova técnica:** trigger check-then-insert e coluna `text` sem constraint.
- **Teste existente/ausente:** ausente.
- **Correção recomendada:** limite de nome no banco e contador/lock transacional
  para volume do diário.
- **Bloqueia produção:** não
- **Depende de staging:** sim
- **Depende de decisão jurídica/comercial:** sim para teto final

### VLT2-020 — Pagamentos assíncronos ou customer não mapeado podem ser reconhecidos sem benefício

- **Severidade:** Média
- **Confiança:** Alta no código; Média na alcançabilidade externa
- **Categoria:** Stripe / disponibilidade / retry
- **Arquivo e linhas:** `supabase/functions/stripe-webhook/index.ts:117-120`;
  `supabase/functions/stripe-webhook/index.ts:157-163`;
  `supabase/functions/stripe-webhook/index.ts:246-248`;
  `supabase/migrations/20260728120000_phase1_security_integrity.sql:641-647`
- **Comportamento observado:** checkout de pagamento ainda não pago é registrado e
  reconhecido; `checkout.session.async_payment_succeeded` cai em
  `unsupported_event`. Customer sem perfil mapeado vira `customer_not_mapped` e
  retorna 200; a reconciliação só percorre customers já presentes em `profiles`.
- **Cenário:** método assíncrono aprova depois, ou assinatura legítima existe sem
  customer conhecido localmente; Stripe não reenvia o evento reconhecido e o
  benefício nunca é concedido.
- **Impacto:** cliente pago sem Premium/créditos e suporte manual.
- **Prova técnica:** eventos não lançam 500 e não existe fila de pendências por
  customer desconhecido.
- **Teste existente/ausente:** ausente; depende dos métodos realmente habilitados.
- **Correção recomendada:** tratar eventos assíncronos suportados, manter fila
  reconciliável de mappings pendentes e reconciliar também a partir de objetos
  Stripe autorizados, com proteção contra tomada de conta.
- **Bloqueia produção:** sim se métodos assíncronos/fluxos externos estiverem ativos
- **Depende de staging:** sim
- **Depende de Stripe test:** sim
- **Depende de decisão jurídica/comercial:** sim, para meios de pagamento

## 6. Separação obrigatória

### 6.1 Vulnerabilidades e defeitos confirmados

VLT2-001 a VLT2-020 são confirmados no código/documentos, com a ressalva de
alcançabilidade externa indicada em VLT2-012 e VLT2-020. Não foi confirmado IDOR
de leitura/diário no schema final; RLS e FK final estão corretamente orientados
na análise estática.

### 6.2 Regressões introduzidas ou reveladas pelas correções

- VLT2-001/002: o novo snapshot/reconciliador não fecha o catálogo nem múltiplas
  assinaturas;
- VLT2-003/004: as novas RPCs transacionais não modelam ordem inversa nem lotes;
- VLT2-005: a nova reserva impede o retry que a UI promete;
- VLT2-010/011: o novo trigger v2.1 cobre só novos signups e quebra fluxos Auth
  sem metadados;
- VLT2-012: documentos “definitivos” reintroduziram prazos que a Fase 1 disse ter
  removido;
- VLT2-013: a allowlist criada para corrigir XSS aceita URL `//`;
- VLT2-018: teste de consentimento ficou obsoleto após a v2.1.

### 6.3 Riscos jurídicos confirmados por divergência com o código

- preço anual R$ 399,00 versus R$ 383,04;
- aviso/consentimento específico de dado sensível inexistente;
- falta de reaceite v2.1 para contas existentes;
- prazos de retenção/backups publicados, mas ainda pendentes internamente;
- exportação chamada de completa, embora declare e tenha categorias omitidas;
- Cookie Policy omite duas chaves;
- “Histórico e diário sem limites” na oferta (`Subscription.jsx:84-87`) diverge
  do cap de 2.000 entradas e 8.000 caracteres, ainda que possa ser entendido como
  ausência de limite por plano.

### 6.4 Configurações externas não verificadas

- schema/migrations/grants/RLS live e buckets Storage;
- `verify_jwt` de cada Edge Function; não existe `supabase/config.toml`;
- Auth: confirmação de e-mail, SMTP, CAPTCHA, política de senha, redirects,
  sessões e OAuth;
- plano Supabase, backups, PITR, restore, logs e acesso administrativo;
- chaves test/live, produtos, Price IDs, product IDs, métodos, impostos, Portal,
  eventos do webhook, scheduler e Adaptive Pricing;
- DPA/SCC/ANPD, ZDR/retenção Anthropic, suboperadores e entidade Stripe;
- monitoramento do e-mail `contact@veledataro.com`;
- conteúdo remoto efetivamente implantado.

Adaptive Pricing **não pode ser confirmado como desativado**: o repositório não
passa configuração explícita na criação da sessão e o painel não foi acessado.

### 6.5 Itens que exigem Supabase staging

- aplicar migrations do zero e por upgrade com dados legados;
- validar migrations que podem falhar com diário >8.000 ou relação cross-tenant;
- RLS A/B para SELECT/INSERT/UPDATE/DELETE;
- grants/EXECUTE de todas as funções;
- trigger de signup por senha, confirmação, convite, OAuth e admin;
- 20 conexões reais para quota grátis, Premium, TTL, expiração e orçamento;
- rollback/falha injetada das RPCs Stripe;
- concorrência do cap de diário;
- exportação e exclusão parcial/retry.

### 6.6 Itens que exigem Stripe test

- produto/Price ID/moeda/valor/intervalo exatos;
- Price desconhecido e outro produto;
- múltiplas assinaturas e todos os status;
- eventos duplicados, mesma data, atrasados e fora de ordem;
- refund/dispute antes e depois da concessão;
- parcial, falha DB, retry e pagamento assíncrono;
- customer conhecido/desconhecido;
- ausência de assinatura removendo Premium;
- exclusão cancelando todas as páginas de assinaturas;
- reconciliação completa e Portal;
- Adaptive Pricing e métodos por mercado.

### 6.7 Decisões comerciais

- preço anual BR e eventual promoção;
- valores EUR e ordem dos mercados;
- elegibilidade/mudança de mercado;
- métodos de pagamento e pagamentos assíncronos;
- múltiplas assinaturas;
- saldo, FIFO, expiração e reembolso parcial de pacotes;
- orçamento Anthropic e controles multiaccount;
- limites finais do diário/uso Premium.

### 6.8 Decisões jurídicas

- base e UX para dados sensíveis voluntários;
- reaceite v2.1 e preservação de evidências;
- retenção por categoria, backups, logs, suporte e Stripe;
- livre resolução/conteúdo digital e reembolso;
- DPA/transferências internacionais;
- canal de privacidade, RAL/Livro de Reclamações e revisão profissional;
- conteúdo e versão canônica dos documentos.

### 6.9 Falsos positivos/achados anteriores efetivamente corrigidos

- autoatribuição de Premium, créditos e IDs Stripe via `profiles`: corrigida por
  grants de coluna;
- XSS por `script`, evento HTML, SVG, iframe, `javascript:` e `data:`: corrigido
  para os payloads testados;
- CORS por `startsWith`: corrigido por `URL.origin` + Set exato;
- framing, `object-src`, `base-uri`, `nosniff`, referrer e permissões: presentes
  em `vercel.json`;
- e-mail integral nos logs de exclusão: removido;
- FK diário/leitura cross-tenant: corrigida estaticamente pela FK composta;
- hash SHA-256 de Termos, Privacidade e frase 18+: confirmado byte a byte;
- coleta documental de idade: não existe e não foi tratada como vulnerabilidade;
- frontend não envia Price ID, valor ou moeda: confirmado;
- Hotmart, EBANX, App Store e Google Play não têm integração técnica ativa.

### 6.10 VLT-008 em diante ainda não tratados integralmente

- VLT-008: exportação melhorou, mas permanece parcial — VLT2-014;
- VLT-009: corrigido no código; staging pendente;
- VLT-010: corrigido no código; headers remotos não verificados;
- VLT-011: limites parciais; concorrência do cap permanece — VLT2-019;
- VLT-012: continua externo/não verificável;
- VLT-013: parcialmente corrigido; VLT2-013 e VLT2-015;
- VLT-014: corrigido no código;
- VLT-015: audit offline limpo; advisories atuais de rede não verificados;
- VLT-016: parcialmente corrigido — VLT2-017;
- VLT-017: continua não verificável.

## 7. Matriz VLT-001 a VLT-017

| ID anterior | Classificação Round 2 | Evidência direta |
|---|---|---|
| VLT-001 | Corrigido | `deletion-core.js:7-51` pagina e cancela estados não terminais antes de `delete-account/index.ts:129-149` |
| VLT-002 | Regressão encontrada | XSS ativo removido em `safe-markdown.js:37-57`, mas URL `//` passa em `:20` — VLT2-013 |
| VLT-003 | Parcialmente corrigido | lock/índice em `premium_daily_limit.sql:30,128-154`; retry/global/multiaccount falham — VLT2-005/006 |
| VLT-004 | Regressão encontrada | evento+grant atômicos em `phase1...sql:454-495`; reversão fora de ordem/lotes falham — VLT2-003/004 |
| VLT-005 | Regressão encontrada | falha retorna 500 em `stripe-webhook:253-256`, mas catálogo/reconciliação/pagamentos pendentes falham — VLT2-001/002/020 |
| VLT-006 | Parcialmente corrigido | append-only/hash em `phase1...sql:8-36` e `consent_v21...sql:39-52`; contas existentes e Auth alternativo falham — VLT2-010/011 |
| VLT-007 | Regressão encontrada | páginas públicas v2.1, mas preços/consentimento/retensão divergem — VLT2-008/009/012 |
| VLT-008 | Parcialmente corrigido | `export-data:82-116` falha-fechado, mas omite categorias — VLT2-014 |
| VLT-009 | Corrigido | FK composta em `20260729102621...sql:7-20`; aplicação real requer staging |
| VLT-010 | Corrigido | origens exatas nas Edge Functions e headers em `vercel.json:2-18`; remoto não verificado |
| VLT-011 | Parcialmente corrigido | CHECK 8.000/cap em `journal_entry_limits.sql:8-31`; cap concorrente e nome sem CHECK — VLT2-019 |
| VLT-012 | Não verificável | confirmação, SMTP/CAPTCHA e painel não estão versionados |
| VLT-013 | Parcialmente corrigido | prompt/disclaimers em `generate-reading:187-200` e header; falta crise/validação — VLT2-015 |
| VLT-014 | Corrigido | logs pseudonimizados em `delete-account:31-65`; busca não encontrou e-mail/pergunta/diário em logs |
| VLT-015 | Corrigido localmente | `npm audit --offline` = 0; `jsdom` está em devDependencies; exceção Router documentada; rede não verificada |
| VLT-016 | Parcialmente corrigido | flags nos scripts destrutivos, mas deploy `--prod` e alvos reais permanecem — VLT2-017 |
| VLT-017 | Não verificável | schema, Storage, backups, Auth e painéis externos não acessados |

## 8. Matriz dos problemas críticos/altos encontrados após a Fase 1

Não existe relatório `FASE_1B_REVIEW_FIXES.md`; a matriz abaixo cobre os achados
Altos desta segunda revisão que recaem sobre a Fase 1 ou alterações posteriores.

| ID Round 2 | Severidade | Relação com Fase 1 | Estado |
|---|---|---|---|
| VLT2-001 | Alta | regressão no novo snapshot/webhook/reconciliação | Não corrigido |
| VLT2-002 | Alta | reconciliação criada na Fase 1 | Não corrigido |
| VLT2-003 | Alta | lacuna nas novas RPCs transacionais | Não corrigido |
| VLT2-007 | Alta | regressão no catálogo regional | Não corrigido |
| VLT2-009 | Alta | divergência dos documentos “definitivos” posteriores | Não corrigido |
| VLT2-010 | Alta | lacuna da migration de consentimento v2.1 | Não corrigido |

## 9. Autenticação, autorização e isolamento

### Matriz estática final

| Recurso | anon | authenticated próprio | authenticated alheio | Escrita cliente |
|---|---|---|---|---|
| `cards` | SELECT | SELECT | n/a | sem policy de escrita |
| `profiles` | negado | SELECT; UPDATE `display_name` | negado por RLS | coluna limitada por grant |
| `readings` | negado | SELECT | negado por RLS | nenhuma |
| `journal_entries` | negado | CRUD próprio | negado por RLS/FK composta | conteúdo ≤8.000 |
| `user_consents` | negado | SELECT próprio | negado | sem INSERT/UPDATE/DELETE |
| reservas/compras/eventos | negado | negado | negado | service role/RPC |

Todas as tabelas versionadas têm RLS habilitado. Não foi encontrado IDOR direto
no schema final. `SECURITY DEFINER` usa `search_path` explícito; RPCs sensíveis
têm EXECUTE revogado de `public`, `anon` e `authenticated`. O `handle_new_user`
também foi revogado e preserva execução para `supabase_auth_admin`.

Riscos residuais: grants/default privileges live não verificados, customer Stripe
não tem constraint UNIQUE, funções/triggers precisam de execução real, service role
bypassa RLS por desenho e acesso administrativo/logs não foi auditado externamente.

## 10. IA, conteúdo e dados enviados

### Campos efetivamente enviados à Anthropic

| Campo | Enviado? | Evidência |
|---|---|---|
| Pergunta integral | Sim | `generate-reading:193-200` |
| Cartas | Sim | nome, posição, orientação e palavras-chave em `:182-200` |
| Nome/display name | Não | não aparece no body Anthropic |
| E-mail | Não | não aparece no body |
| UUID | Não | usado apenas nas RPCs Supabase |
| Histórico | Não | não é consultado pela função |
| Diário | Não | não é consultado pela função |
| Dados da conta/Stripe | Não | não aparecem no body |
| Metadata do usuário | Não | não aparece no body |
| Prompt do sistema/modelo/parâmetros | Sim | `:187-201` |

O fornecedor recebe ainda metadados técnicos normais da chamada server-to-server.
O IP do navegador não é colocado no payload de aplicação. Não há logging explícito
de pergunta, leitura ou body Anthropic.

## 11. Privacidade, logs e armazenamento local

Logs do código contêm request ID, códigos técnicos, timestamps, hash curto do UUID
na exclusão/exportação e event ID Stripe. Não foram encontrados e-mail, nome,
pergunta, leitura, diário, JWT, headers ou payload Stripe integral em
`console.*`. Retenção, log drains e acesso externo não são verificáveis.

### Chaves locais encontradas

| Chave | Finalidade | Duração aparente |
|---|---|---|
| `sb-<project>-auth-token` | sessão/refresh Supabase | persistente até logout, expiração/invalidação ou limpeza |
| `veleda_recovery_pending` | bloquear navegação durante recovery | até concluir, sign-out, sessão ausente ou limpeza |
| `veleda_install_hint` | mostrar convite PWA pós-signup | até instalar, dispensar ou limpeza |
| `veleda_install_dismissed` | não repetir convite | sem TTL; até limpeza |
| `veleda_disclaimer_seen` | não repetir disclaimer completo | sem TTL; até limpeza |

Não foi encontrado `sessionStorage`, analytics, marketing, Sentry, PostHog,
telemetria ou cookies próprios no código. O service worker não faz cache.

Não há coleta de CPF, RG, cartão de cidadão, passaporte, data de nascimento,
fotografia, reconhecimento facial ou biometria. A única ocorrência de “biometria”
no app é recomendação jurídica para não inserir dados sensíveis.

## 12. Consistência jurídica

Confirmado nas páginas públicas:

- prestadora pessoa singular com atividade aberta em Portugal, nome, NIF, endereço
  e e-mail;
- RGPD/GDPR e LGPD;
- proteção imperativa de consumidores brasileiros e lei portuguesa sem foro
  exclusivo inválido;
- declaração exata “Declaro ter 18 anos ou mais.”;
- natureza simbólica/entretenimento e ausência de aconselhamento profissional;
- 1 leitura grátis/semana UTC, Premium até 10/dia UTC e pacote 5/30 dias;
- cancelamento, renovação, exclusão, arrependimento, conteúdo digital;
- pergunta/cartas enviadas à Anthropic e diário/histórico/nome/e-mail não enviados;
- DPO não designado; canal é ponto de contato;
- Livro de Reclamações e RAL.

Divergências confirmadas estão em VLT2-008/009/010/012/014/016.

O arquivo `DOCS JURIDICOS/VELEDA_DOCS_LEGAIS_FINAIS.md` contém instruções internas
“Texto final aprovado” e “integrar palavra por palavra”. Seus rodapés de
Privacidade e Subprocessadores dizem versão 2.0, enquanto as páginas públicas
dizem 2.1; o conteúdo restante coincide nos diffs executados. Os DOCX
`MINUTA-2` contêm “MINUTA PARA REVISÃO JURÍDICA”, colchetes, `[●]`, fornecedores
a confirmar, App Stores planejadas, placeholders de entidade/endereço/e-mails e
não correspondem às páginas públicas. Eles não estão na pasta de documentos
finais solicitada e não foram tratados como fonte vigente.

Subprocessadores tecnicamente ativos no repositório: Supabase, Anthropic, Stripe
e Vercel. Resend/SMTP próprio, EBANX, Hotmart, App Store e Google Play não têm
prova técnica de integração ativa.

## 13. Dependências e configuração

- `jsdom` está somente em `devDependencies`.
- Runtime: Supabase JS, DOMPurify, Marked, React, React DOM e React Router.
- `npm ls --all` concluiu sem dependência obrigatória quebrada; mensagens
  `UNMET OPTIONAL DEPENDENCY` são variantes opcionais/plataformas não instaladas.
- `npm audit --offline` e `npm audit --offline --omit=dev`: 0 vulnerabilidades no
  cache local.
- Nenhum segredo server-side foi encontrado em arquivos rastreados/bundle.
- `.env` contém apenas Vite URL/anon key; `.env.local` contém token OIDC ignorado.
- `supabase/.temp/linked-project.json`, `project-ref` e `cli-latest` existem
  localmente/ignorados e expõem apenas identificadores/metadados, não segredo.
- Source maps não foram gerados no build de produção.
- Bundle JS principal: 595,85 kB minificado / 176,30 kB gzip, com warning >500 kB.
- CSP restringe scripts/fontes/imagens/conexões, bloqueia framing, objetos e base;
  `style-src 'unsafe-inline'` permanece por causa dos estilos inline do app.
- O catálogo só habilita um mercado quando os três itens têm valores/Price IDs;
  isso é positivo. Porém `assertStripePriceMatches()` não valida o Product ID e a
  escolha de mercado não é autorizada.

## 14. Testes e validações locais

| Comando/validação | Resultado | Natureza |
|---|---|---|
| `npm test` | **Falhou**: 51/52 passaram | Node; mocks/regex, sem SQL/RLS |
| `npm run lint` | Passou com 1 warning Fast Refresh | estático |
| `npm run build -- --outDir /tmp/veleda-round2-build --emptyOutDir` | Passou; warning bundle 595,85 kB | build local fora do repo |
| `git diff --check` | Passou | worktree |
| `npm ls --all` | Passou | árvore local |
| `npm audit --offline` | 0 no cache | sem rede |
| hashes SHA-256 | Termos, Privacidade e frase 18+ conferem | byte a byte |
| prova SafeMarkdown | `//evil.example` sobrevive; `javascript:`/`data:` removidos | JSDOM/DOMPurify |
| diff mestre jurídico ↔ páginas | Termos iguais; rodapés Privacidade/Subprocessadores 2.0↔2.1 | local |
| busca de segredos/logs/storage | nenhum segredo rastreado; logs sem conteúdo íntimo | estática |
| source maps | nenhum `.map` no build | local |

Falha de teste:

- `tests/consents.test.js:20-25` ainda procura `terms-2026-07-28` e
  `privacy-2026-07-28` nos componentes React, embora a implementação use Markdown
  v2.1 e hashes na migration posterior.

Não executados:

- SQL/migrations/RLS/concorrência real;
- Deno type-check/serve;
- Stripe CLI/test;
- E2E, pois o script atinge o projeto real e chama Anthropic;
- `dev-reset-quota`, deploy ou qualquer script mutante;
- npm audit de rede;
- confirmação de e-mail/SMTP/OAuth;
- headers e bundle remotos.

## 15. Riscos externos

Até confirmação independente, considerar não comprovados: banco igual ao Git,
funções iguais ao Git, JWT gateway correto, ausência de Storage desconhecido,
segredos/mode Stripe corretos, Adaptive Pricing desativado, catálogo Stripe
correto, webhook inscrito, reconciliação agendada, Portal configurado, SMTP e
confirmação de e-mail, backups/restore, retenção/logs, DPA/SCC/ZDR, acesso
administrativo e canais jurídicos operacionais.

## 16. Plano de correção priorizado

### P0 — antes de qualquer usuário real ou Stripe test amplo

1. Fechar Premium ao catálogo e produto exatos (VLT2-001).
2. Redesenhar reconciliação para todas as assinaturas e ausência explícita
   (VLT2-002).
3. Corrigir ordem de reversão e ledger por pacote (VLT2-003/004).
4. Vincular/elegibilizar mercado no servidor (VLT2-007).
5. Decidir e implementar tratamento de pergunta sensível (VLT2-009).
6. Criar reaceite v2.1 de contas existentes (VLT2-010).
7. Alinhar preço anual e textos (VLT2-008).
8. Remover ou comprovar prazos de retenção/backups (VLT2-012).

### P1 — antes de beta

9. Corrigir retry idempotente e orçamento multiaccount/global (VLT2-005/006).
10. Cobrir Auth sem senha ou declarar tecnicamente não suportado (VLT2-011).
11. Fechar links `//` e segurança conversacional/crise (VLT2-013/015).
12. Completar escopo da exportação (VLT2-014).
13. Corrigir suíte e adicionar testes reais (VLT2-018).
14. Tratar pagamentos assíncronos e mappings pendentes (VLT2-020).

### P2 — antes do go-live operacional

15. Completar Cookie Policy (VLT2-016).
16. Isolar scripts e CLI de produção (VLT2-017).
17. Tornar limites de perfil/diário transacionais (VLT2-019).
18. Validar todas as configurações externas e revisão jurídica.

## 17. Gates para staging

1. Aceitar somente ambiente descartável sem dados reais.
2. Corrigir o teste v2.1 ou documentar falha esperada antes do gate.
3. Aplicar migrations do zero e por upgrade; nenhuma migration em produção.
4. Executar matriz RLS A/B/anon/service role.
5. Executar 20 conexões Postgres reais por cenário de quota.
6. Testar TTL, retry, semana/dia UTC e rollback.
7. Injetar falhas nas RPCs Stripe.
8. Validar Auth por todos os métodos pretendidos.
9. Confirmar funções/flags JWT versionadas no staging.

## 18. Gates para produção

1. Todos os P0/P1 resolvidos e testes verdes.
2. Stripe test completo para catálogo, produto, estados, múltiplas assinaturas,
   reversões, async e reconciliação.
3. Mercado/price/comercial/jurídico decididos e consistentes.
4. Reaceite v2.1 e dados sensíveis juridicamente validados.
5. SMTP, confirmação de e-mail, CAPTCHA/rate limits e recovery validados.
6. Backups/PITR/restore/retenção e acesso administrativo documentados/testados.
7. DPA/transferências/subprocessadores confirmados.
8. Adaptive Pricing explicitamente verificado como desativado.
9. Schema/config/functions remotos comparados read-only ao Git.
10. Monitoramento, orçamento, alertas e runbooks sem PII.
11. Revisão jurídica profissional para Brasil e Portugal/EEE.
12. Auditoria final independente após as correções.

## 19. Conclusão de aptidão

| Destino | Resultado | Fundamentação |
|---|---|---|
| Supabase staging | **Apto com condições** | somente ambiente descartável, sem dados reais, para executar os testes ausentes e reproduzir falhas |
| Stripe test | **Apto com condições** | exclusivamente test mode e cenários controlados; lógica atual não pode ser promovida |
| Usuários internos | **Não apto** | conteúdo sensível, consentimento v2.1, IA e pagamentos ainda têm bloqueadores |
| Beta fechado | **Não apto** | bloqueadores Altos e garantia SQL/RLS ausente |
| Lançamento no Brasil | **Não apto** | preços, mercado, dados sensíveis, consentimentos, Stripe e retenção |
| Lançamento Portugal/EEE | **Não apto** | mercado, consentimento explícito, livre resolução/operação, Stripe e retenção |
| Produção | **Não apto** | seis achados Altos, testes falhando e configurações críticas não verificadas |

## 20. Estado final da tarefa

Antes da criação deste arquivo, o worktree permanecia limpo. Nenhum código,
migration, frontend, Edge Function, documento jurídico, lockfile, configuração
ou dado foi alterado. Nenhuma dependência foi instalada. Não houve commit, push,
deploy, rede, produção, Stripe, Anthropic ou e-mail.

O único arquivo criado por esta tarefa é:

`docs/auditoria-seguranca/VELEDA_SECURITY_AUDIT_ROUND_2.md`

Ele permanece deliberadamente **não commitado**.
