# Resultado da auditoria

**Conclusão: não apto para lançamento público ou comercial.**

O isolamento por RLS e a gestão de segredos estão bem encaminhados, mas há bloqueadores materiais: cobrança não cancelada na exclusão de conta, XSS armazenado por conteúdo da IA, abuso concorrente da quota, inconsistências transacionais nos webhooks Stripe, consentimentos manipuláveis e documentos legais ainda provisórios/divergentes da implementação.

A auditoria foi estritamente read-only. O branch continua limpo em `main`, sem arquivos alterados, migrations aplicadas, deploys ou testes com usuários reais.

Como “não alterar arquivos” foi uma exigência explícita, os seis documentos abaixo não foram gravados no repositório. O conteúdo correspondente é entregue nesta resposta.

---

# 1. SECURITY_AUDIT.md

## Resumo executivo

Escopo examinado:

- React/Vite, rotas, formulários, renderização e armazenamento local;
- Supabase Auth, migrations, RLS, funções SQL, triggers e grants;
- cinco Edge Functions;
- Anthropic, Stripe, Vercel e evidências sobre e-mail;
- dependências, lockfile, scripts e histórico Git;
- páginas e minutas legais;
- metadados remotos read-only do Supabase e cabeçalhos do deploy público.

Estado externo confirmado:

- projeto Supabase `phixumwuktqabcngncrk` ativo em `eu-west-1`, correspondente a Irlanda ([regiões Supabase](https://supabase.com/docs/guides/platform/regions));
- cinco Edge Functions ativas;
- `verify_jwt=true` para `generate-reading`, `create-checkout`, `manage-subscription` e `delete-account`;
- `verify_jwt=false` apenas para `stripe-webhook`, coerente com autenticação por assinatura Stripe;
- secrets Anthropic e Stripe configurados; nenhum secret Resend listado;
- deploy público servido pela Vercel com HTTPS e HSTS;
- HTML e bundle JS locais possuem ETag idêntico ao deploy público;
- sem CSP, proteção contra framing, `nosniff`, Referrer Policy ou Permissions Policy;
- nenhum segredo server-side encontrado no bundle público;
- scan Git cobriu 41 de 45 commits antes do timeout. O único alerta foi uma anon key Supabase em bundle antigo, confirmada por decodificação como `role=anon`, pública por design.

Classificação:

- Crítica: 0
- Alta: 7
- Média: 7
- Baixa: 2
- Informativa/não verificável: 1

## Achados

### VLT-001 — Exclusão de conta não cancela a assinatura

- **Severidade/status:** Alta — Confirmado.
- **Componente:** `delete-account`, Stripe e interface de conta.
- **Arquivo/linha:** [delete-account/index.ts:58](/Users/jussaraoliveira/Desktop/veleda-app/supabase/functions/delete-account/index.ts:58), [Account.jsx:124](/Users/jussaraoliveira/Desktop/veleda-app/src/pages/Account.jsx:124).
- **Evidência técnica:** o código contém apenas um `TODO` para cancelamento Stripe e prossegue apagando `profiles`, inclusive os IDs necessários ao cancelamento. A interface afirma que a renovação será cancelada.
- **Exploração/cenário:** assinante exclui a conta; perfil e login desaparecem, mas a assinatura pode continuar renovando sem acesso ao portal.
- **Dados afetados:** e-mail, customer/subscription IDs, cobrança e histórico contratual.
- **Impacto/probabilidade:** cobrança indevida, disputa, chargeback e infração consumerista; probabilidade alta quando houver assinantes.
- **Recomendação/exemplo:** recuperar o status diretamente na Stripe, cancelar ou encerrar a renovação, confirmar sucesso e somente depois iniciar a exclusão. Em falha, retornar 5xx e preservar o vínculo mínimo para nova tentativa.
- **Esforço/prioridade:** Médio — bloqueador de lançamento, P0.
- **Teste de aceite:** assinatura ativa de teste → excluir conta → Stripe mostra cancelada/não renovável → perfil/Auth removidos → segunda chamada não causa efeito duplicado.

### VLT-002 — XSS armazenado por Markdown gerado pela IA

- **Severidade/status:** Alta — Confirmado.
- **Componente:** renderização das leituras.
- **Arquivo/linha:** [NewReading.jsx:206](/Users/jussaraoliveira/Desktop/veleda-app/src/pages/NewReading.jsx:206), [ReadingDetail.jsx:74](/Users/jussaraoliveira/Desktop/veleda-app/src/pages/ReadingDetail.jsx:74), [generate-reading/index.ts:173](/Users/jussaraoliveira/Desktop/veleda-app/supabase/functions/generate-reading/index.ts:173).
- **Evidência técnica:** `marked.parse()` é passado diretamente a `dangerouslySetInnerHTML`. Teste local confirmou que `marked` preserva `<img ... onerror=...>`.
- **Exploração/cenário:** uma pergunta adversarial induz Claude a devolver HTML ativo. O payload fica em `readings.reading_text` e executa na geração e em cada abertura do histórico.
- **Dados afetados:** token Supabase em `localStorage`, diário, perguntas, histórico, perfil e assinatura.
- **Impacto/probabilidade:** sequestro da sessão e exfiltração de dados íntimos; impacto alto, probabilidade média.
- **Recomendação/exemplo:** sanitizar com DOMPurify em modo restrito ou renderizar Markdown com HTML bruto desabilitado. Adicionar CSP com `script-src 'self'`, `object-src 'none'`, `base-uri 'self'` e `frame-ancestors 'none'`.
- **Esforço/prioridade:** Pequeno a Médio — P0.
- **Teste de aceite:** respostas contendo `script`, `iframe`, `svg/onload`, `img/onerror`, URLs `javascript:` e atributos de evento devem aparecer como texto ou ser removidas, sem execução.

### VLT-003 — Quota gratuita vulnerável a corrida e ausência de rate limit

- **Severidade/status:** Alta — Confirmado.
- **Componente:** geração de leituras e custos Anthropic.
- **Arquivo/linha:** [generate-reading/index.ts:100](/Users/jussaraoliveira/Desktop/veleda-app/supabase/functions/generate-reading/index.ts:100), [generate-reading/index.ts:116](/Users/jussaraoliveira/Desktop/veleda-app/supabase/functions/generate-reading/index.ts:116), [generate-reading/index.ts:238](/Users/jussaraoliveira/Desktop/veleda-app/supabase/functions/generate-reading/index.ts:238).
- **Evidência técnica:** a função conta leituras, chama Anthropic e só depois insere. Chamadas simultâneas podem observar contagem zero. Não há limite por usuário, IP, janela, concorrência ou orçamento global; Premium é ilimitado tecnicamente.
- **Exploração/cenário:** automação dispara dezenas de perguntas/cartas diferentes em paralelo, todas antes do primeiro insert.
- **Dados afetados:** perguntas enviadas à Anthropic, registros e métricas de uso.
- **Impacto/probabilidade:** abuso da API, custo financeiro e indisponibilidade; probabilidade alta.
- **Recomendação/exemplo:** RPC transacional que reserve a leitura com lock/registro semanal único, rate limit por usuário/IP, limite de concorrência e orçamento/alerta na Anthropic.
- **Esforço/prioridade:** Médio — P0.
- **Teste de aceite:** 20 requisições simultâneas de conta gratuita devem produzir exatamente uma reserva/leitura cobrável.

### VLT-004 — Idempotência Stripe não atômica concede créditos duplicados

- **Severidade/status:** Alta — Confirmado.
- **Componente:** webhook de consulta avulsa.
- **Arquivo/linha:** [stripe-webhook/index.ts:54](/Users/jussaraoliveira/Desktop/veleda-app/supabase/functions/stripe-webhook/index.ts:54), [stripe-webhook/index.ts:58](/Users/jussaraoliveira/Desktop/veleda-app/supabase/functions/stripe-webhook/index.ts:58).
- **Evidência técnica:** o webhook faz `SELECT` do event ID, concede créditos e depois insere o ID. Duas entregas concorrentes podem passar pelo `SELECT`, conceder duas vezes e somente depois competir pela PK. O erro do insert nem é verificado.
- **Exploração/cenário:** reentrega concorrente do mesmo evento produz dez créditos para uma compra de cinco.
- **Dados afetados:** créditos, evento de pagamento e receita.
- **Impacto/probabilidade:** concessão indevida do produto; impacto alto, probabilidade média.
- **Recomendação/exemplo:** RPC única e transacional `process_stripe_pack_event(event_id, uid, qty, days)` que insira o evento e conceda créditos na mesma transação.
- **Esforço/prioridade:** Médio — P0.
- **Teste de aceite:** 20 processamentos concorrentes do mesmo fixture assinado devem conceder somente cinco créditos.

### VLT-005 — Webhook reconhece falhas e não trata eventos fora de ordem

- **Severidade/status:** Alta — Confirmado.
- **Componente:** sincronização de assinatura Stripe.
- **Arquivo/linha:** [stripe-webhook/index.ts:36](/Users/jussaraoliveira/Desktop/veleda-app/supabase/functions/stripe-webhook/index.ts:36), [stripe-webhook/index.ts:44](/Users/jussaraoliveira/Desktop/veleda-app/supabase/functions/stripe-webhook/index.ts:44), [stripe-webhook/index.ts:86](/Users/jussaraoliveira/Desktop/veleda-app/supabase/functions/stripe-webhook/index.ts:86).
- **Evidência técnica:** falha ao atualizar `profiles` é apenas logada e o endpoint retorna 200, impedindo retry. Eventos antigos podem sobrescrever estados novos. A Stripe não garante ordem de entrega e pode reenviar eventos ([documentação oficial](https://docs.stripe.com/webhooks)).
- **Exploração/cenário:** `subscription.deleted` é processado e depois um `subscription.updated` antigo reativa Premium; ou a atualização falha e o 200 perde definitivamente o evento.
- **Dados afetados:** estado Premium, subscription/customer IDs e cobrança.
- **Impacto/probabilidade:** acesso pago indevido ou bloqueio de cliente pagante; impacto alto, probabilidade média.
- **Recomendação/exemplo:** lançar erro/500 quando persistência falhar; armazenar `event.created`; buscar o estado atual da assinatura na Stripe; implementar reconciliação periódica e tratar falha de pagamento, reembolso e chargeback.
- **Esforço/prioridade:** Médio a Grande — P0.
- **Teste de aceite:** entregar fixtures duplicados, atrasados e fora de ordem; o estado final deve coincidir sempre com o recurso atual da Stripe.

### VLT-006 — Consentimento e declaração de idade não geram evidência confiável

- **Severidade/status:** Alta — Confirmado.
- **Componente:** cadastro, perfil e LGPD/GDPR.
- **Arquivo/linha:** [Auth.jsx:87](/Users/jussaraoliveira/Desktop/veleda-app/src/pages/Auth.jsx:87), [Auth.jsx:106](/Users/jussaraoliveira/Desktop/veleda-app/src/pages/Auth.jsx:106), [lock_profile_columns.sql:9](/Users/jussaraoliveira/Desktop/veleda-app/supabase/migrations/20260725150000_lock_profile_columns.sql:9).
- **Evidência técnica:** idade só existe em estado React. O aceite é gravado por update do cliente, com erro ignorado. `authenticated` pode alterar livremente `terms_version` e `terms_accepted_at`. Com confirmação de e-mail ativada, o update pós-signup pode ocorrer sem sessão e falhar.
- **Exploração/cenário:** usuário ou script altera retroativamente versão/data; o controlador não consegue provar qual texto foi aceito. A declaração 18+ não é registrada.
- **Dados afetados:** versão do documento, timestamp, usuário e evidência de maioridade.
- **Impacto/probabilidade:** perda de accountability e base probatória; impacto alto, probabilidade alta.
- **Recomendação/exemplo:** tabela append-only `user_consents`, timestamp do servidor, hash/versão imutável, finalidade e origem; trigger/RPC server-side. Registrar separadamente declaração 18+ e aceite contratual.
- **Esforço/prioridade:** Médio — P0.
- **Teste de aceite:** cliente não consegue editar registro existente; cadastro cria exatamente um evento com timestamp do servidor mesmo com confirmação de e-mail ativa.

### VLT-007 — Avisos legais provisórios e divergentes da implementação

- **Severidade/status:** Alta — Confirmado.
- **Componente:** privacidade, cookies, IA, retenção e exclusão.
- **Arquivo/linha:** [Privacy.jsx:124](/Users/jussaraoliveira/Desktop/veleda-app/src/pages/Privacy.jsx:124), [Privacy.jsx:184](/Users/jussaraoliveira/Desktop/veleda-app/src/pages/Privacy.jsx:184), [Privacy.jsx:236](/Users/jussaraoliveira/Desktop/veleda-app/src/pages/Privacy.jsx:236), [Privacy.jsx:400](/Users/jussaraoliveira/Desktop/veleda-app/src/pages/Privacy.jsx:400), [Cookies.jsx:13](/Users/jussaraoliveira/Desktop/veleda-app/src/pages/Cookies.jsx:13), [Subprocessors.jsx:15](/Users/jussaraoliveira/Desktop/veleda-app/src/pages/Subprocessors.jsx:15).
- **Evidência técnica:** documentos publicados se declaram provisórios. Privacidade promete painel de cookies inexistente, enquanto Cookies afirma corretamente que não há cookies não essenciais. Política/subprocessadores dizem que o nome é enviado à Anthropic, mas o código envia apenas pergunta e cartas. A UI promete backup em 30 dias; a política fala em 90. A exclusão promete cancelamento Stripe não implementado.
- **Exploração/cenário:** titular toma decisão com base em informação inexata; aceite registrado não corresponde à operação real.
- **Dados afetados:** todas as categorias pessoais e evidências de consentimento.
- **Impacto/probabilidade:** transparência inadequada, risco LGPD/GDPR e consumerista; probabilidade certa enquanto os textos estiverem publicados.
- **Recomendação/exemplo:** congelar uma versão jurídica revisada após fechar retenção, subprocessadores, exclusão, e-mail e pagamentos. Remover promessas não comprovadas.
- **Esforço/prioridade:** Médio, com jurídico — P0.
- **Teste de aceite:** matriz automatizada ou checklist demonstra correspondência entre cada afirmação e código/configuração vigente.

### VLT-008 — Exportação e exclusão não cobrem todo o ciclo de vida

- **Severidade/status:** Média — Confirmado.
- **Componente:** direitos de acesso, portabilidade e eliminação.
- **Arquivo/linha:** [Account.jsx:18](/Users/jussaraoliveira/Desktop/veleda-app/src/pages/Account.jsx:18), [delete-account/index.ts:73](/Users/jussaraoliveira/Desktop/veleda-app/supabase/functions/delete-account/index.ts:73).
- **Evidência técnica:** exportação omite consentimentos, créditos, IDs Stripe, modelo/IDs das leituras e logs; não verifica os campos `.error` do Supabase. Exclusão não coordena Stripe, Anthropic, logs, backups ou eventual suporte/e-mail.
- **Exploração/cenário:** falha parcial gera arquivo vazio/incompleto apresentado como completo; titular não recebe confirmação real de propagação da exclusão.
- **Dados afetados:** todos os dados de conta e derivados.
- **Impacto/probabilidade:** atendimento incompleto a direitos; impacto médio, probabilidade alta.
- **Recomendação/exemplo:** endpoint server-side de exportação com inventário versionado e falha fechada; workflow de exclusão com estados `requested/processing/completed/exception`.
- **Esforço/prioridade:** Grande — antes de usuários reais.
- **Teste de aceite:** fixtures por categoria devem aparecer na exportação; falha em qualquer origem precisa produzir erro, não arquivo “bem-sucedido”.

### VLT-009 — Integridade multiusuário incompleta entre diário e leitura

- **Severidade/status:** Média — Confirmado.
- **Componente:** banco e RLS.
- **Arquivo/linha:** [init.sql:85](/Users/jussaraoliveira/Desktop/veleda-app/supabase/migrations/20260704120000_init.sql:85), [init.sql:99](/Users/jussaraoliveira/Desktop/veleda-app/supabase/migrations/20260704120000_init.sql:99).
- **Evidência técnica:** INSERT do diário valida somente `auth.uid()=user_id`; a FK `reading_id` não prova que leitura e diário pertencem ao mesmo usuário.
- **Exploração/cenário:** conhecendo UUID de leitura alheia, atacante cria diário próprio ligado a ela, obtém oráculo de existência por FK e fica sujeito a cascade quando a leitura for apagada.
- **Dados afetados:** relacionamento entre diário e leitura; não foi identificado acesso direto ao texto da vítima.
- **Impacto/probabilidade:** quebra de integridade tenant-to-tenant; impacto médio, probabilidade baixa.
- **Recomendação/exemplo:** `UNIQUE(id,user_id)` em `readings` e FK composta `(reading_id,user_id)`.
- **Esforço/prioridade:** Pequeno — antes de usuários reais.
- **Teste de aceite:** inserir diário A referenciando leitura B deve falhar por FK/RLS.

### VLT-010 — CORS amplo, validação de origem defeituosa e headers ausentes

- **Severidade/status:** Média — Confirmado.
- **Componente:** Edge Functions e Vercel.
- **Arquivo/linha:** [create-checkout/index.ts:8](/Users/jussaraoliveira/Desktop/veleda-app/supabase/functions/create-checkout/index.ts:8), [create-checkout/index.ts:73](/Users/jussaraoliveira/Desktop/veleda-app/supabase/functions/create-checkout/index.ts:73), [manage-subscription/index.ts:51](/Users/jussaraoliveira/Desktop/veleda-app/supabase/functions/manage-subscription/index.ts:51), [vercel.json:1](/Users/jussaraoliveira/Desktop/veleda-app/vercel.json:1).
- **Evidência técnica:** CORS `*`; origem validada com `startsWith`, aceitando, por exemplo, domínio cujo nome comece com `https://veledataro.com`; deploy sem CSP, anti-framing, `nosniff`, Referrer e Permissions Policy.
- **Exploração/cenário:** combinações com token roubado/XSS permitem chamadas de qualquer origem e redirecionamentos Stripe para domínio prefixado; clickjacking permanece possível.
- **Dados afetados:** sessão, URLs de checkout/portal e metadados de navegação.
- **Impacto/probabilidade:** amplia impacto de XSS/roubo de token; impacto médio, probabilidade média.
- **Recomendação/exemplo:** comparação exata de `new URL(origin).origin`, CORS dinâmico apenas para origens aprovadas e headers Vercel.
- **Esforço/prioridade:** Pequeno — antes de usuários reais.
- **Teste de aceite:** origem legítima recebe CORS; `veledataro.com.evil.example` não; framing externo é bloqueado.

### VLT-011 — Conteúdo do diário e corpos de requisição sem limites defensivos

- **Severidade/status:** Média — Confirmado.
- **Componente:** diário, banco e Edge Functions.
- **Arquivo/linha:** [Journal.jsx:23](/Users/jussaraoliveira/Desktop/veleda-app/src/pages/Journal.jsx:23), [init.sql:89](/Users/jussaraoliveira/Desktop/veleda-app/supabase/migrations/20260704120000_init.sql:89), [generate-reading/index.ts:78](/Users/jussaraoliveira/Desktop/veleda-app/supabase/functions/generate-reading/index.ts:78).
- **Evidência técnica:** `content text` não tem limite; textarea não tem `maxLength`; usuários autenticados podem criar entradas ilimitadas. Funções fazem parse completo do JSON antes de validar campos.
- **Exploração/cenário:** conta automatizada grava payloads muito grandes/repetidos ou envia JSON volumoso com campos ignorados.
- **Dados afetados:** diário e infraestrutura.
- **Impacto/probabilidade:** esgotamento de banco/memória e degradação; impacto médio, probabilidade média.
- **Recomendação/exemplo:** checks de tamanho no banco, limite por entrada/conta, `Content-Length`, rate limit e quotas.
- **Esforço/prioridade:** Pequeno a Médio — antes de usuários reais.
- **Teste de aceite:** conteúdo acima do limite retorna 413/constraint sem gravar linha.

### VLT-012 — Confirmação de e-mail e SMTP permanecem incertos/provavelmente inadequados

- **Severidade/status:** Média — Provável.
- **Componente:** Supabase Auth e e-mail.
- **Arquivo/linha:** [AUDIT_AUTH_AND_RLS.md:48](/Users/jussaraoliveira/Desktop/veleda-app/docs/audit/AUDIT_AUTH_AND_RLS.md:48), [AUDIT_OPERATIONS_AND_RECOVERY.md:7](/Users/jussaraoliveira/Desktop/veleda-app/docs/audit/AUDIT_OPERATIONS_AND_RECOVERY.md:7).
- **Evidência técnica:** auditoria de 25/07 registrou `mailer_autoconfirm=true` e SMTP padrão Supabase. Não há secret/código Resend no Veleda. A configuração atual do painel não pôde ser consultada novamente.
- **Exploração/cenário:** criação de conta com e-mail de terceiro; recuperação/confirmacão sofre limite ou spam.
- **Dados afetados:** e-mail, conta e recuperação.
- **Impacto/probabilidade:** fraude de identidade leve e indisponibilidade de conta; impacto médio, probabilidade média.
- **Recomendação/exemplo:** SMTP próprio verificado, confirmação de e-mail, CAPTCHA/rate limits, templates neutros contra enumeração.
- **Esforço/prioridade:** Pequeno a Médio — bloqueador operacional.
- **Teste de aceite:** signup não autenticado antes da confirmação; entrega real em múltiplos provedores; respostas uniformes para e-mail existente/inexistente.

### VLT-013 — Prompt injection e segurança conversacional insuficientes

- **Severidade/status:** Média — Confirmado.
- **Componente:** Anthropic/Claude.
- **Arquivo/linha:** [generate-reading/index.ts:159](/Users/jussaraoliveira/Desktop/veleda-app/supabase/functions/generate-reading/index.ts:159), [generate-reading/index.ts:177](/Users/jussaraoliveira/Desktop/veleda-app/supabase/functions/generate-reading/index.ts:177).
- **Evidência técnica:** pergunta é interpolada diretamente na instrução. Não há delimitação robusta, schema de saída, validação semântica, moderação ou detecção de crise. O prompt só proíbe previsões médicas, legais e financeiras absolutas.
- **Exploração/cenário:** usuário instrui o modelo a ignorar regras, gerar HTML ou oferecer orientação perigosa em saúde mental/violência.
- **Dados afetados:** pergunta potencialmente sensível e resposta derivada.
- **Impacto/probabilidade:** conteúdo inseguro e encadeamento com VLT-002; impacto médio/alto, probabilidade média.
- **Recomendação/exemplo:** tratar pergunta como dado não confiável, delimitá-la, exigir saída estruturada, validar antes de armazenar e manter suíte adversarial.
- **Esforço/prioridade:** Médio — antes de usuários reais.
- **Teste de aceite:** corpus com jailbreak, crise, medicina, finanças, violência e solicitação de HTML deve produzir respostas seguras e sem markup ativo.

### VLT-014 — E-mail pessoal registrado em logs de exclusão

- **Severidade/status:** Média — Confirmado.
- **Componente:** logs Supabase Edge.
- **Arquivo/linha:** [delete-account/index.ts:87](/Users/jussaraoliveira/Desktop/veleda-app/supabase/functions/delete-account/index.ts:87), [delete-account/index.ts:97](/Users/jussaraoliveira/Desktop/veleda-app/supabase/functions/delete-account/index.ts:97).
- **Evidência técnica:** `console.log` registra o e-mail integral depois da exclusão.
- **Exploração/cenário:** pessoas com acesso ao painel/log drain obtêm lista de contas excluídas.
- **Dados afetados:** e-mail, timestamp e evento de exclusão.
- **Impacto/probabilidade:** exposição interna e retenção posterior à exclusão; impacto médio, probabilidade alta.
- **Recomendação/exemplo:** log estruturado com request ID e UUID pseudonimizado; redigir mensagens de fornecedores.
- **Esforço/prioridade:** Pequeno — antes de usuários reais.
- **Teste de aceite:** varredura de logs não encontra e-mail, pergunta, diário, token ou payload Stripe.

### VLT-015 — Dependências com três alertas “high”, mas baixa explorabilidade atual

- **Severidade/status:** Baixa — Confirmado.
- **Componente:** supply chain/build.
- **Arquivo/linha:** [package-lock.json:1249](/Users/jussaraoliveira/Desktop/veleda-app/package-lock.json:1249), [package-lock.json:1299](/Users/jussaraoliveira/Desktop/veleda-app/package-lock.json:1299).
- **Evidência técnica:** `npm audit` reportou PostCSS path traversal e React Router RSC CSRF. PostCSS é build-time; Veleda é SPA e não usa RSC/actions.
- **Exploração/cenário:** risco cresce se build processar sourcemap não confiável ou se a aplicação adotar RSC.
- **Dados afetados:** ambiente de build; não há exploit confirmado no runtime atual.
- **Impacto/probabilidade:** contextual baixo.
- **Recomendação/exemplo:** atualizar PostCSS via Vite quando disponível; acompanhar versão corrigida de React Router, sem aplicar downgrade cego sugerido pelo npm.
- **Esforço/prioridade:** Pequeno — até 30 dias.
- **Teste de aceite:** `npm audit` limpo ou exceção documentada com prova de não alcançabilidade.

### VLT-016 — Scripts operacionais podem atingir produção

- **Severidade/status:** Baixa — Confirmado.
- **Componente:** scripts.
- **Arquivo/linha:** [dev-reset-quota.mjs:22](/Users/jussaraoliveira/Desktop/veleda-app/scripts/dev-reset-quota.mjs:22), [e2e.mjs:26](/Users/jussaraoliveira/Desktop/veleda-app/scripts/e2e.mjs:26), [deploy.sh:21](/Users/jussaraoliveira/Desktop/veleda-app/scripts/deploy.sh:21).
- **Evidência técnica:** E2E cria usuários/chama IA no backend real; reset apaga leituras via service role; deploy usa `npx vercel` não fixado e `--prod`.
- **Exploração/cenário:** execução no ambiente errado apaga dados de teste em produção, gera custo ou publica com CLI não pinado.
- **Dados afetados:** contas de teste, leituras, deploy e credenciais administrativas.
- **Impacto/probabilidade:** operacional baixo/médio.
- **Recomendação/exemplo:** exigir `ENVIRONMENT=test`, project-ref test-only, confirmação de ref e CLI Vercel fixada em devDependencies.
- **Esforço/prioridade:** Pequeno — até 30 dias.
- **Teste de aceite:** scripts recusam projeto/ref de produção.

### VLT-017 — Schema live, Storage, backups e configurações do painel não foram revalidados

- **Severidade/status:** Informativa — Não verificável.
- **Componente:** Supabase/Stripe/Vercel externos.
- **Arquivo/linha:** [linked-project.json:1](/Users/jussaraoliveira/Desktop/veleda-app/supabase/.temp/linked-project.json:1), [AUDIT_OPERATIONS_AND_RECOVERY.md:20](/Users/jussaraoliveira/Desktop/veleda-app/docs/audit/AUDIT_OPERATIONS_AND_RECOVERY.md:20).
- **Evidência técnica:** o CLI atual não reconhece o projeto como linked porque faltam os metadados/configuração esperados. Criá-los ou executar `supabase link` violaria read-only.
- **Risco:** migrations locais podem divergir do banco; buckets/policies, plano, PITR, logs, SMTP, CAPTCHA e redirects podem existir somente no painel.
- **Recomendação:** próxima fase read-only com acesso SQL/Management API e export de configuração, sem dados de usuários.
- **Esforço/prioridade:** Pequeno — pré-condição de go-live.
- **Teste de aceite:** dump somente de schema/ACL/config comparado ao Git e assinado por hash.

## Verificações executadas

- `rg --files`, `find`, `git status`, `git log`: inventário e estado.
- `nl`, `rg`: revisão linha a linha de frontend, migrations, funções e scripts.
- `supabase projects list`: projeto ativo, `eu-west-1`.
- `supabase functions list`: cinco funções ativas e flags JWT.
- `supabase secrets list`: apenas nomes/digests; nenhum valor revelado.
- `supabase db advisors --linked`: não executado, pois o CLI não reconheceu o link.
- `npm ls --all`: uma instalação extraneous de `playwright-core`; não está no manifest.
- `npm audit`: 3 high contextuais.
- `npm outdated`: atualizações menores para Supabase, React, Vite, Marked e oxlint.
- `npm run lint`: passou com um warning de Fast Refresh.
- teste de `marked`: confirmou preservação de HTML ativo.
- `gitleaks git --redact=100`: 41/45 commits, somente anon key pública.
- `curl` público read-only: HTTPS/HSTS e ausência dos demais headers.
- nenhuma execução de build, E2E, função de IA, checkout, webhook ou escrita no banco.

---

# 2. DATA_FLOW_AND_INVENTORY.md

## Diagrama textual

```text
Usuário
  └─ navegador/PWA
      ├─ Vercel/CDN: entrega HTML, JS, CSS e imagens
      │   └─ pode tratar IP, User-Agent, horário e URL em logs técnicos
      ├─ Supabase Auth
      │   ├─ cadastro/login/reset/refresh/logout
      │   ├─ auth.users, tokens e audit logs
      │   └─ e-mail transacional: provedor atual não confirmado; Resend não aparece no código/secrets
      ├─ Supabase Data API com JWT + RLS
      │   ├─ profiles
      │   ├─ readings
      │   ├─ journal_entries
      │   └─ cards
      └─ Supabase Edge Functions
          ├─ generate-reading
          │   ├─ valida JWT e quota
          │   ├─ envia pergunta + cartas à Anthropic
          │   └─ guarda pergunta, cartas e resposta em readings
          ├─ create-checkout / manage-subscription
          │   ├─ valida JWT
          │   └─ envia e-mail, UUID e dados de plano à Stripe
          ├─ stripe-webhook
          │   ├─ valida assinatura Stripe
          │   └─ atualiza Premium/créditos no Supabase
          └─ delete-account
              ├─ reautentica senha via Supabase Auth
              ├─ apaga diário, leituras, perfil e Auth
              └─ NÃO cancela nem elimina o customer Stripe
```

## Dados enviados à Anthropic

Confirmado em [generate-reading/index.ts:152](/Users/jussaraoliveira/Desktop/veleda-app/supabase/functions/generate-reading/index.ts:152):

- pergunta integral;
- nome, posição, orientação e palavras-chave das três cartas;
- system prompt editorial;
- modelo e parâmetros técnicos.

Não são enviados:

- e-mail;
- UUID Supabase;
- display name;
- diário;
- histórico;
- customer/subscription IDs;
- endereço IP real do usuário — a chamada parte da Edge Function.

A Anthropic informa retenção padrão de inputs/outputs da API por até 30 dias, com exceções, e não usa API comercial para treinamento por padrão ([retenção](https://privacy.claude.com/en/articles/7996866-how-long-do-you-store-my-organization-s-data), [treinamento](https://privacy.anthropic.com/en/articles/7996868-is-my-data-used-for-model-training)). O código não comprova DPA, opt-out especial ou zero data retention. Dados podem ser processados em EUA, Europa, Ásia e Austrália, com armazenamento nos EUA por padrão ([localização](https://privacy.claude.com/en/articles/7996890-where-are-your-servers-located-do-you-host-your-models-on-eu-servers)).

## Inventário

Legenda: **C** confirmado; **P** parcialmente implementado; **NF** não verificável.

| Dado | Categoria/origem/finalidade | Armazenamento e acesso | Terceiro/região | Retenção/exclusão | Sensibilidade e risco |
|---|---|---|---|---|---|
| E-mail | Identificação; cadastro; autenticação e cobrança | `auth.users`; Auth admins; Stripe recebe ao criar customer | Supabase Irlanda; Stripe internacional | Durante conta; Auth delete C; Stripe externo não apagado | Alta; conta falsa se autoconfirm |
| Senha | Credencial fornecida pelo usuário | Hash no Supabase Auth; senha em claro transita por TLS no login e reauth | Supabase | Até troca/exclusão Auth | Crítica; política/força bruta NF |
| JWT/refresh token | Credencial técnica automática | `localStorage` pelo padrão Supabase JS | Supabase | Até logout/expiração/config externa | Crítica; acessível a XSS |
| UUID | Identificador | Auth, profiles/readings/journal; metadados Stripe | Supabase/Stripe | Conta; Stripe pode reter | Média; correlação entre sistemas |
| Display name | Perfil, informado pelo usuário | `profiles`; dono e service role | Nenhum envio real à Anthropic | Conta; correção direta por UI é limitada | Média; documentos dizem incorretamente que vai à IA |
| Pergunta | Conteúdo do usuário; geração de leitura | `readings`; dono/service role | Anthropic, armazenamento EUA por padrão | Banco até conta; Anthropic até 30 dias padrão | Muito alta; pode conter saúde, religião, sexualidade etc. |
| Cartas/orientação | Conteúdo da leitura | `readings.cards` | Anthropic | Igual à leitura | Baixa isolada; média quando associada |
| Interpretação da IA | Dado inferido/derivado | `readings.reading_text` | Anthropic e Supabase | Até conta; sem delete individual | Alta; risco XSS e inferências íntimas |
| Diário | Conteúdo voluntário | `journal_entries`; dono/service role | Não enviado à Anthropic | Até delete da entrada/conta; backups NF | Muito alta; sem limite de tamanho |
| Datas de uso | Metadado | `created_at`, `updated_at`, logs | Supabase/Vercel/Stripe | Variável por plano; NF | Média; perfil comportamental |
| Aceite de termos | Compliance | `profiles.terms_*` | Supabase | Apagado com conta; contraria possível necessidade de prova | Média; manipulável pelo usuário |
| Declaração 18+ | Estado transient React | Não armazenada | Nenhum | Perdida imediatamente | Alta relevância regulatória; sem evidência |
| Premium/créditos | Contratual | `profiles` | Stripe/Supabase | Conta; Stripe externo retém | Média; webhooks inconsistentes |
| Customer/subscription IDs | Identificador financeiro | `profiles`; Stripe | Stripe | Perfil é apagado; Stripe não | Alta; vínculo perdido antes do cancelamento |
| Cartão/Pix/dados financeiros | Pagamento | Não armazenados no Veleda; Stripe | Stripe e parceiros configurados | Conforme Stripe/obrigações legais, NF | Muito alta; minimização no app é positiva |
| IP/dispositivo/User-Agent | Dados técnicos automáticos | Logs de Vercel, Supabase Auth/API/Edge e Stripe | Rede global | Dependente do plano/config, NF | Média; não exportado nem apagado pelo fluxo |
| Comunicação por e-mail | Transacional | Supabase Auth/provedor SMTP | Resend não confirmado | NF | Média; templates/logs externos NF |
| Flags PWA | Preferência técnica | `localStorage` | Nenhum | Até limpeza local | Baixa |

## Correção, exportação e exclusão

- Display name: update tecnicamente permitido, mas não há interface geral de edição após o primeiro ritual.
- E-mail: nenhuma interface de alteração.
- Perguntas/leituras: imutáveis e sem exclusão individual.
- Diário livre: pode ser criado e apagado; edição não existe na tela geral.
- Diário ligado à leitura: pode ser atualizado.
- Exportação: existe, mas é incompleta e não falha corretamente.
- Exclusão: banco/Auth parcial; Stripe, Anthropic, logs e backups não são coordenados.

---

# 3. RLS_ACCESS_MATRIX.md

Base local confirmada nas migrations; banco live não reconsultado nesta rodada. Auditoria anterior registra RLS ativo nas cinco tabelas e isolamento em runtime em [AUDIT_AUTH_AND_RLS.md:6](/Users/jussaraoliveira/Desktop/veleda-app/docs/audit/AUDIT_AUTH_AND_RLS.md:6).

| Tabela | anon SELECT/I/U/D | authenticated SELECT | INSERT | UPDATE | DELETE | service_role | Avaliação |
|---|---|---|---|---|---|---|---|
| `cards` | S permitido; escrita negada | Todos os registros | Negado | Negado | Negado | Bypass RLS | Correto, catálogo público |
| `profiles` | Negado | `auth.uid()=id` | Negado | Próprio; colunas `display_name`, `terms_version`, `terms_accepted_at` | Negado | Bypass | Financeiro protegido; consentimentos indevidamente editáveis |
| `readings` | Negado | `auth.uid()=user_id` | Negado | Negado | Negado | Bypass | Bom isolamento; sem delete individual |
| `journal_entries` | Negado | Próprio | Próprio | Próprio | Próprio | Bypass | Falta validar dono de `reading_id` |
| `processed_stripe_events` | Tudo negado | Tudo negado | Negado | Negado | Negado | Bypass | Correto, mas idempotência da aplicação não é atômica |
| `auth.users` | Não exposto diretamente | Via Auth API | Auth | Auth | Admin only | Admin | Config externa NF |
| Storage | NF | NF | NF | NF | NF | NF | Nenhum bucket/policy/uso encontrado no repositório |

Funções SQL:

- `handle_new_user`: `SECURITY DEFINER`, `search_path=public`; usada por trigger.
- `consume_reading_credit`, `refund_reading_credit`, `grant_reading_pack`: `SECURITY DEFINER`; execute revogado de `public`, `anon` e `authenticated`, concedido a `service_role`.
- Views/materialized views: não encontradas.
- RPC pública adicional: não encontrada.
- Cascades: Auth → profile/readings/journal; reading → journal.
- Órfãos: FKs evitam órfãos básicos, mas não garantem igualdade de tenant entre leitura e diário.
- Grants amplos padrão foram vistos na auditoria anterior; mesmo com RLS, devem ser reduzidos.

Testes obrigatórios antes do go-live:

1. usuário A não lê/edita/apaga linhas de B;
2. A não altera `is_premium`, créditos ou IDs Stripe;
3. A não altera retrospectivamente consentimentos;
4. A não cria diário ligado à leitura de B;
5. anon só lê `cards`;
6. RPCs de crédito retornam `42501` para anon/authenticated;
7. service role não aparece no bundle/logs;
8. schema live e migrations devem produzir diff vazio;
9. listar buckets e policies remotos;
10. testar cascades em banco descartável, não em produção.

---

# 4. THREAT_MODEL.md

## Ativos

- perguntas, diário e interpretações potencialmente sensíveis;
- tokens e contas;
- estado Premium, créditos e cobrança;
- API key Anthropic e service role;
- evidência de consentimento;
- disponibilidade e orçamento de IA;
- reputação e conformidade LGPD/GDPR.

## STRIDE

| Ameaça | Cenário | Controle existente | Lacuna |
|---|---|---|---|
| Spoofing | Cadastro com e-mail de terceiro | Senha e Supabase Auth | Confirmação de e-mail provavelmente desativada; CAPTCHA/MFA NF |
| Spoofing | Token roubado por XSS | JWT validado server-side | Token em localStorage e HTML da IA sem sanitização |
| Tampering | Autoatribuir Premium/créditos | Grants financeiros restringidos | Consentimentos continuam editáveis |
| Tampering | Duplicar créditos Stripe | PK de eventos | Check/grant/insert não transacional |
| Repudiation | Contestar aceite | `terms_version` e timestamp | Timestamp fornecido/editável pelo cliente; idade não registrada |
| Repudiation | Contestar cancelamento/exclusão | Logs e interface | Fluxo não cancela Stripe; log contém PII, sem workflow auditável |
| Information disclosure | Leitura/diário de outro usuário | RLS por `auth.uid()` | Relação cruzada de `reading_id`; equipe/service role e backups NF |
| Information disclosure | XSS exfiltra diário e token | React escapa conteúdo normal | `dangerouslySetInnerHTML` rompe a proteção |
| Information disclosure | Logs/fornecedores | Pergunta não é logada explicitamente pela função | e-mail é logado; retenção e acesso de fornecedores NF |
| Denial of service | Spam de diário/JSON | Quota de leitura | Sem limites de tamanho/rate limit |
| Denial of service | Rajada de chamadas Claude | Uma leitura gratuita/semana | Corrida antes do insert e Premium sem fair-use técnico |
| Elevation of privilege | Evento Stripe antigo reativa Premium | Assinatura de webhook | Sem ordenação/reconciliação |
| Supply chain | Dependência ou `npx` comprometido | Lockfile/integrity | CLI Vercel não fixada; advisories pendentes |
| Insider | Operador acessa dados íntimos | RLS para usuários finais | service role/dashboard, logs de acesso e least privilege NF |
| Terceiro comprometido | Supabase/Anthropic/Stripe/Vercel | TLS, fornecedores conhecidos | DPA, ZDR, SCC, incident response e exclusão externa NF |
| Exclusão incompleta | DB apaga, Stripe/backups mantêm | Cascade no banco | Sem orquestração por sistema |

---

# 5. REMEDIATION_PLAN.md

## Bloqueadores de lançamento

| Ordem | Correção | Responsável sugerido | Dependência | Esforço | Critério de aceite |
|---|---|---|---|---|---|
| 1 | Suspender pagamentos/go-live até fechar Stripe | Produto + pagamentos | Decisão de lançamento | Pequeno | nenhum cliente real exposto |
| 2 | Cancelar assinatura antes de excluir conta | Backend/Stripe | Stripe sandbox | Médio | teste E2E de exclusão sem renovação |
| 3 | Sanitizar Markdown e aplicar CSP | Frontend + DevOps | Biblioteca/sanitizador | Pequeno/Médio | suíte XSS passa |
| 4 | Tornar quota atômica e aplicar rate limits/custos | Backend/Supabase | RPC/migration | Médio | 20 chamadas concorrentes → 1 |
| 5 | Webhook transacional, ordenado e reconciliável | Backend/Stripe | migration + fixtures | Grande | duplicidade/out-of-order/falha passam |
| 6 | Consentimento append-only e registro 18+ | Backend + privacidade | versão jurídica final | Médio | cliente não edita evidência |
| 7 | Finalizar textos legais e eliminar divergências | Jurídico + privacidade | decisões de retenção/terceiros | Médio | textos sem “minuta” e fiéis ao produto |
| 8 | Validar schema/configuração live read-only | Supabase/DevOps | acesso Management API/SQL | Pequeno | diff vazio e relatório de ACL |

## Antes de receber usuários reais

- confirmar e-mail com SMTP próprio e entrega monitorada;
- decidir plano Supabase, backups e teste de restore; planos pagos têm backups diários, enquanto Free não inclui backup automático ([Supabase Backups](https://supabase.com/docs/guides/platform/backups));
- implementar exportação e workflow de exclusão completos;
- corrigir FK multiusuário do diário;
- limitar tamanho e volume do diário;
- aplicar CORS por origem exata e headers;
- remover PII dos logs;
- confirmar Stripe live/test, Customer Portal, métodos de pagamento e eventos cadastrados;
- confirmar DPA/SCC e retenção da Anthropic;
- confirmar ausência de buckets Storage desconhecidos;
- definir política de acesso administrativo aos dados íntimos.

## Primeiros 30 dias

- atualizar dependências e documentar exceção React Router RSC;
- criar monitoramento de erro/custo sem conteúdo pessoal;
- runbook de incidentes LGPD/GDPR;
- testes de restore e continuidade;
- secret scanning e dependency scanning no CI;
- staging isolado;
- testes de sessão expirada, sessões simultâneas, brute force e recuperação;
- reconciliation job diário Stripe ↔ Supabase.

## Melhorias posteriores

- criptografia de campo ou envelope encryption para diário/perguntas, com desenho de chaves;
- ZDR Anthropic, se elegível;
- retenção configurável pelo usuário;
- exclusão individual de leituras;
- MFA opcional;
- trilha auditável de acesso administrativo;
- DPIA/RIPD formal para conteúdo íntimo e IA;
- pseudonimização de identificadores enviados à Stripe.

## Ordem exata recomendada

1. congelar go-live/pagamentos;
2. exclusão + cancelamento Stripe;
3. XSS + CSP;
4. quota atômica + rate limiting;
5. webhook Stripe transacional/reconciliação;
6. consentimentos/idade server-side;
7. fechar documentos legais;
8. validar banco/configuração live;
9. SMTP/confirmação de e-mail;
10. exportação/exclusão multioperador;
11. FK/limites do diário;
12. CORS/headers/log redaction;
13. dependências/CI/staging;
14. backups, restore, incident response e DPIA.

---

# 6. LEGAL_SECURITY_INPUTS.md

## Fatos técnicos confirmados

- Controlador declarado no frontend: Jussara D R Oliveira, Portugal.
- Supabase: banco, Auth e Edge Functions; região primária Irlanda.
- Anthropic: gera leituras a partir de pergunta e cartas; display name, e-mail, diário e histórico não são enviados.
- Stripe: recebe e-mail, UUID em metadata, plano e dados de pagamento; app não armazena número integral do cartão.
- Vercel: hospeda apenas frontend estático/PWA.
- Resend: não encontrado no código nem nos secrets Edge; provedor SMTP atual não confirmado.
- EBANX: aparece somente na página de subprocessadores; integração direta não encontrada.
- Analytics/marketing: nenhum script encontrado.
- Storage/uploads: nenhum uso ou bucket versionado.
- IA é informada na landing, nos Termos e na Privacidade.
- Conteúdo da IA não é usado para decisão com efeito jurídico no código.
- Perguntas e diário podem conter dados sensíveis por iniciativa do titular.
- Diário não é enviado à IA.
- Auth token fica em localStorage; flags PWA/recovery também.
- Service worker não armazena respostas/dados, o que é positivo.

## Bases e decisões ainda necessárias

- definir base do tratamento de dados sensíveis voluntários; o aceite genérico dos Termos não equivale automaticamente a consentimento explícito do art. 9 GDPR;
- decidir se o produto rejeitará, apagará ou processará saúde, religião, sexualidade e crise emocional;
- definir países de lançamento e entidade Stripe contratante;
- confirmar DPA/SCC/ANPD com Supabase, Anthropic, Stripe e Vercel;
- definir retenção por categoria, incluindo logs, backups, Auth audit logs, Stripe e solicitações de direitos;
- definir se consentimentos serão preservados após exclusão para defesa de direitos e em qual base;
- confirmar plano Supabase e política real de backup;
- confirmar provider de e-mail e retenção;
- definir canal, SLA e verificação de identidade para direitos dos titulares;
- definir política de reembolso, chargeback, cancelamento e arrependimento;
- decidir limites “uso razoável” do Premium;
- definir acesso de suporte/funcionários ao diário;
- realizar DPIA/RIPD antes de escala, dada a previsibilidade de conteúdo íntimo.

## Cookies e tecnologias

Confirmado:

- Supabase Auth em localStorage;
- flags de instalação/recovery;
- cookies necessários da Stripe somente na página Stripe;
- sem analytics, publicidade ou marketing no bundle.

A Política de Privacidade deve remover a promessa de banner enquanto não houver tecnologia não essencial. Se analytics forem adicionados, o banner e bloqueio pré-consentimento passam a ser necessários.

---

# Síntese final solicitada

## A. Dez maiores riscos

1. assinatura continua após exclusão;
2. XSS armazenado pela resposta da IA;
3. webhooks Stripe não transacionais;
4. eventos Stripe fora de ordem/perdidos;
5. corrida e abuso de custo Anthropic;
6. consentimentos manipuláveis e idade não registrada;
7. textos legais provisórios/inexatos;
8. exportação e exclusão incompletas;
9. e-mail/Auth provavelmente sem confirmação e SMTP adequado;
10. configuração live, backups e Storage ainda não revalidados.

## B. Bloqueadores de lançamento

- VLT-001 a VLT-007;
- Stripe possivelmente ainda em sandbox, conforme auditoria interna de 25/07;
- SMTP/confirmação de e-mail não comprovados;
- schema live não comparado à migration mais recente;
- backups/restore e retenção não definidos;
- revisão jurídica pendente.

## C. O que está seguro e foi comprovado

- secrets server-side não estão no bundle;
- anon key é pública por design;
- JWT obrigatório nas quatro funções autenticadas;
- webhook valida assinatura Stripe sobre corpo bruto;
- preço/price ID é selecionado no servidor;
- frontend não concede Premium por query string;
- migrations habilitam RLS nas cinco tabelas;
- leituras são somente leitura para o usuário;
- RPCs financeiras são exclusivas de service role;
- colunas Premium/créditos/Stripe foram retiradas do UPDATE do usuário;
- pergunta enviada à IA está minimizada; diário/e-mail/UUID não são enviados;
- React escapa pergunta, diário e display name fora do caminho Markdown;
- nenhum upload/Storage/analytics foi encontrado;
- HTTPS e HSTS ativos;
- service worker não cacheia conteúdo sensível;
- licenças de runtime são permissivas.

## D. O que parece seguro, mas não pôde ser comprovado

- banco live igual às migrations;
- policies/grants live atuais após último commit;
- ausência de buckets Storage remotos;
- confirmação de e-mail, CAPTCHA, política de senha e sessão;
- SMTP/Resend;
- plano Supabase, backups, PITR e retenção de logs;
- modo live/test atual da Stripe e Customer Portal;
- eventos efetivamente inscritos no webhook;
- DPA, SCC, ZDR e subprocessadores contratuais;
- acesso administrativo e logs de auditoria;
- código exato das Edge Functions igual ao Git — metadados/versões estão ativos, mas o conteúdo remoto não foi baixado.

## E. Perguntas para a responsável

1. O lançamento será Brasil, UE ou ambos?
2. Stripe continuará em teste ou já há data para live?
3. Qual plano Supabase será usado?
4. Qual prazo real de backups: 0, 7, 30 ou 90 dias?
5. Resend já foi contratado/configurado fora dos Edge secrets?
6. A conta deve ser confirmada por e-mail antes do primeiro uso?
7. Como serão canceladas cobranças ao excluir conta?
8. Conteúdo sensível será aceito, bloqueado ou processado sob consentimento explícito?
9. Quem poderá acessar diário/perguntas para suporte?
10. Quais limites de uso e orçamento Anthropic serão aceitos?
11. Qual entidade responde por suporte, privacidade e cobrança?
12. Qual política de reembolso, chargeback e arrependimento?
13. Consentimentos serão mantidos após exclusão para prova legal?
14. Há DPA/SCC assinados com os fornecedores?
15. Qual será o processo de incidente e comunicação em 72 horas?

## F. Ordem de correções

Exatamente a sequência de 1 a 14 apresentada em `REMEDIATION_PLAN.md`.

## G. Conclusão

> **Não apto para lançamento.**

Justificativa: existem riscos confirmados que podem gerar cobrança após exclusão, execução de JavaScript no contexto autenticado, consumo indevido da API de IA, concessão duplicada ou estado incorreto de benefícios pagos e incapacidade de provar consentimento/maioridade. Além disso, retenção, e-mail, backups, configuração live e documentos jurídicos não estão suficientemente comprovados para receber dados íntimos de usuários reais.