# Relatório de implementação — Fase 1

Data: 28 de julho de 2026  
Escopo: VLT-001 a VLT-007  
Ambiente: somente repositório local

## 1. Resultado executivo

As correções da Fase 1 foram implementadas no código local e estão prontas para
revisão técnica. Isso **não torna o aplicativo apto para lançamento**: a
migration ainda não foi aplicada nem exercitada em Postgres local, as Edge
Functions não foram implantadas, Stripe test não foi validado com os produtos
regionais reais e permanecem decisões jurídicas/operacionais externas.

Não houve deploy, commit, migration remota, acesso a dados de produção, cobrança,
e-mail real ou chamada real à Stripe ou Anthropic.

## 2. Arquivos alterados e criados

### Frontend

- `src/components/AppFooter.jsx`
- `src/components/BillingOffers.jsx` (novo)
- `src/components/Paywall.jsx`
- `src/components/SafeMarkdown.jsx` (novo)
- `src/lib/api.js`
- `src/lib/billing.js`
- `src/lib/safe-markdown.js` (novo)
- `src/pages/Account.jsx`
- `src/pages/Auth.jsx`
- `src/pages/Cookies.jsx`
- `src/pages/Landing.jsx`
- `src/pages/NewReading.jsx`
- `src/pages/Privacy.jsx`
- `src/pages/ReadingDetail.jsx`
- `src/pages/Subprocessors.jsx`
- `src/pages/Subscription.jsx`
- `src/pages/Terms.jsx`
- `src/styles.css`
- `vercel.json`

### Backend e banco

- `supabase/functions/_shared/billing-config.js` (novo)
- `supabase/functions/_shared/deletion-core.js` (novo)
- `supabase/functions/_shared/limits.js` (novo)
- `supabase/functions/_shared/stripe-state.js` (novo)
- `supabase/functions/create-checkout/index.ts`
- `supabase/functions/delete-account/index.ts`
- `supabase/functions/generate-reading/index.ts`
- `supabase/functions/manage-subscription/index.ts`
- `supabase/functions/reconcile-stripe/index.ts` (novo)
- `supabase/functions/stripe-webhook/index.ts`
- `supabase/migrations/20260728120000_phase1_security_integrity.sql` (nova)

### Testes e documentação

- `tests/billing-catalog.test.js`
- `tests/consents.test.js`
- `tests/delete-account.test.js`
- `tests/fixtures/stripe-events.js`
- `tests/quota.test.js`
- `tests/safe-markdown.test.js`
- `tests/stripe-events.test.js`
- `docs/juridico/PENDENCIAS_ANTES_DO_LANCAMENTO.md`
- `docs/correcoes-fase-1/CHANGESET_SUMMARY.md`
- `docs/correcoes-fase-1/FASE_1_IMPLEMENTATION_REPORT.md`
- `README.md`
- `package.json`
- `package-lock.json`

O diretório preexistente e não rastreado `docs/auditoria-seguranca/` foi usado
somente como fonte e não foi alterado.

## 3. Migration criada

`20260728120000_phase1_security_integrity.sql` adiciona:

- `user_consents`, append-only para usuários finais, com criação pelo trigger de
  Auth e versões/timestamp/user ID determinados no servidor;
- `reading_reservations`, chave de idempotência, reserva semanal, expiração,
  estorno e conclusão transacional da leitura;
- índice único da leitura gratuita por usuário/semana;
- RPCs de reserva, liberação e gravação atômica;
- metadados temporais, preço, moeda e mercado no estado Stripe local;
- `stripe_payment_purchases` para pacotes e reversões;
- RPC transacional de evento + concessão de pacote;
- RPC transacional de evento + sincronização de assinatura;
- RPC de reversão por reembolso/chargeback;
- RPC de reconciliação Stripe → Supabase;
- grants apenas para `service_role` nas RPCs sensíveis.

Status: **migration local não aplicada**. O Supabase local não pôde iniciar
porque Docker/Colima não estava disponível. Nenhuma tentativa de aplicação
remota foi feita.

## 4. Dependências adicionadas

- Runtime: `dompurify`, para sanitização consolidada de Markdown/HTML.
- Desenvolvimento: `jsdom`, para executar os testes DOMPurify em Node.

O `npm audit` exibido durante a instalação continuou indicando 3 alertas high já
contextualizados pela auditoria original; não foi executado `npm audit fix`
automático.

## 5. Correção por VLT

### VLT-001 — Exclusão de conta e Stripe

- autenticação pelo JWT e revalidação por senha preservadas;
- customer consultado diretamente na Stripe;
- paginação de todas as assinaturas com `status=all`;
- cancelamento defensivo de qualquer estado não terminal, incluindo active,
  trialing, past_due, unpaid, paused e incomplete;
- resposta Stripe precisa voltar como `canceled` antes de qualquer exclusão;
- falha Stripe retorna 503 e mantém perfil/IDs para retry;
- customer ausente/deletado e assinatura já cancelada são no-op previsível;
- fluxo retomável depois de falha parcial;
- logs estruturados contêm apenas request ID, hash curto do UUID, código,
  contagem e erro técnico sanitizado;
- interface distingue renovação, assinatura, exclusão, reembolso e
  arrependimento e não promete reembolso automático.

### VLT-002 — XSS em leituras

- único componente `SafeMarkdown` para leitura nova e histórico;
- HTML bruto removido antes do parser;
- DOMPurify aplicado novamente ao HTML produzido;
- allowlist reduzida a Markdown textual;
- bloqueio de scripts, imagens, SVG, MathML, frames, objetos, formulários,
  inputs, estilos, mídia, eventos e protocolos ativos;
- leituras antigas passam pela mesma pipeline;
- CSP, `nosniff`, Referrer Policy, Permissions Policy, HSTS e anti-framing
  adicionados no `vercel.json`;
- CSP restringe conexão ao próprio domínio e ao projeto Supabase confirmado.

### VLT-003 — Quota atômica e rate limiting

- reserva é feita por RPC antes da Anthropic;
- `pg_advisory_xact_lock` por usuário + índices únicos protegem múltiplas
  instâncias;
- idempotência vincula chave a hash da pergunta/cartas;
- mesma chave concluída devolve a leitura existente;
- falha da IA ou validação libera reserva e estorna crédito uma vez;
- conclusão insere leitura e fecha reserva na mesma transação;
- limites centralizados: 16 KiB de corpo, 500 caracteres, 2 concorrentes,
  5/minuto, 20/hora, 100/dia Premium e teto operacional de 5.000 reservas/dia;
- semana documentada como segunda-feira 00:00 UTC;
- Premium continua sujeito a uso razoável e abuso, sem coleta adicional.

### VLT-004 — Idempotência atômica Stripe

- `processed_stripe_events` e concessão/reversão ocorrem na mesma RPC;
- conflito de event ID retorna duplicidade idempotente;
- exceção faz rollback integral;
- produto, Price ID, moeda, amount, quantity, market, customer, user metadata e
  estado atual do PaymentIntent/charge são revalidados;
- pacote reembolsado ou disputado não pode ser concedido depois por evento
  atrasado;
- moeda, valor, Price ID e mercado efetivos são persistidos.

### VLT-005 — Ordem e falhas de webhook

- qualquer falha de persistência/sincronização retorna 500 para retry;
- duplicados retornam sucesso idempotente;
- assinatura é recuperada diretamente na Stripe antes de persistir;
- `event.created` impede estado antigo de sobrescrever novo;
- tratados: checkout pago/expirado, assinatura criada/atualizada/cancelada/
  pausada/retomada/trial, invoice pago/falho, reembolso e chargeback;
- fixtures incluem duplicados, ordem invertida, atraso, BRL e EUR;
- função local de reconciliação paginada foi preparada e protegida por segredo;
- nenhum job de reconciliação foi ativado.

### VLT-006 — Integridade dos consentimentos

- três registros separados: Termos, ciência de Privacidade e declaração 18+;
- trigger de `auth.users` cria os registros mesmo sem sessão pós-signup;
- user ID, versões, fingerprints e timestamp vêm do servidor;
- usuários autenticados têm somente SELECT sobre os próprios aceites;
- não há coleta de documento, CPF, RG, passaporte, data de nascimento,
  fotografia, reconhecimento facial ou biometria;
- texto preservado exatamente: “Declaro ter 18 anos ou mais.”;
- a documentação deixa claro que não existe verificação documental.

### VLT-007 — Documentos jurídicos e mercados

- removidas marcações públicas de minuta/provisoriedade;
- preservados nome, NIF, localidade e e-mail já confirmados no projeto;
- incluídas seções “Regras gerais”, “Portugal e União Europeia” e “Brasil”;
- corrigido o fluxo de IA: pergunta/cartas são enviadas; nome/e-mail/diário não;
- removidos Resend e EBANX da lista de fornecedores confirmados;
- removidos prazos inventados de backup/retenção;
- esclarecidos IA, conteúdo íntimo, emergência, natureza reflexiva,
  cancelamento, exclusão, Stripe, cartão, transferências e direitos;
- catálogo regional server-side preserva preços BR atuais, não inventa EUR e
  não expõe Price IDs;
- mercado PT/UE só fica disponível com três valores e três Price IDs completos;
- Adaptive Pricing não foi habilitado;
- pendências não confirmadas ficaram somente no documento interno jurídico.

## 6. Testes executados e aprovados

- `npm test`: suíte Node com sanitização, catálogo, exclusão, quota,
  consentimentos e Stripe.
- `npm run lint`: aprovado; permanece um warning preexistente de Fast Refresh
  em `src/App.jsx`.
- `npm run build`: aprovado.
- `git diff --check`: aprovado após normalização de EOF.
- buscas por `dangerouslySetInnerHTML`, logs com conteúdo pessoal, termos
  provisórios, Price IDs no frontend e preços manipuláveis.

O único `dangerouslySetInnerHTML` restante está encapsulado em `SafeMarkdown`
e recebe somente o resultado da pipeline DOMPurify.

## 7. Testes que não puderam ser executados

- aplicação da migration e testes SQL em Supabase local: Docker/Colima indisponível;
- concorrência real entre duas instâncias Postgres/Edge: requer ambiente
  descartável com a migration aplicada;
- type-check/serve de Edge Functions com Deno: binário Deno ausente e Supabase
  local indisponível;
- fixtures assinadas pelo Stripe CLI: proibido usar Stripe real e não havia
  ambiente Stripe test local conectado;
- E2E de cadastro com confirmação de e-mail: depende da configuração do painel
  e SMTP;
- reconciliação real: não ativada e não executada.

Os testes Node de concorrência são mocks determinísticos; a garantia
cross-instance real depende dos locks/constraints SQL e precisa da etapa local
Postgres acima.

## 8. Pendências de configuração externa

- produtos/Prices regionais e respectivas variáveis;
- escolha/validação de `STRIPE_MODE`;
- segredos do webhook e reconciliação;
- seleção dos eventos do webhook;
- Customer Portal;
- scheduler e monitoramento de reconciliação;
- aplicação controlada da migration;
- implantação das seis Edge Functions afetadas/nova função;
- confirmação de e-mail, SMTP, CAPTCHA, redirects e política de Auth;
- plano Supabase, backups, restore, retenção e alertas Anthropic.

## 9. Pendências jurídicas

Estão detalhadas exclusivamente em
`docs/juridico/PENDENCIAS_ANTES_DO_LANCAMENTO.md`: morada profissional a
divulgar, canais operacionais, preços EUR, Price IDs, ordem de mercados, política
de reembolso/arrependimento, retenção, DPA/transferências, SMTP, direitos,
acesso administrativo e limites finais de uso razoável.

Os textos públicos precisam de revisão por profissional jurídico antes do
lançamento, especialmente consumo Portugal/UE e Brasil.

## 10. Passos manuais no Stripe

1. Permanecer em test.
2. Confirmar/criar mensal, anual e avulso BR com os valores já encontrados.
3. Após decisão comercial, criar os três preços fixos EUR sem Adaptive Pricing.
4. Copiar IDs para os secrets server-side; nunca para `VITE_*`.
5. Definir `BILLING_MARKETS_ENABLED` e `STRIPE_MODE`.
6. Configurar Customer Portal e os eventos descritos na seção VLT-005.
7. Rodar fixtures test para sucesso, falha, cancelamento, pausa, trial,
   expiração, refund e dispute, inclusive fora de ordem.
8. Confirmar moeda/amount/Price ID persistidos no banco.
9. Só depois avaliar live mediante aprovação expressa.

## 11. Passos manuais no Supabase

1. Iniciar ambiente local/descartável.
2. Aplicar todas as migrations e revisar o diff.
3. Exercitar RLS, grants, trigger de signup e 20 conexões concorrentes reais.
4. Verificar rollback de todas as RPCs Stripe com falhas injetadas.
5. Configurar secrets regionais e de reconciliação.
6. Implantar funções somente após revisão; manter JWT nas funções autenticadas,
   webhook sem JWT com assinatura Stripe e reconciliação restrita por segredo.
7. Agendar reconciliação em lotes, com retry/alerta sem PII.
8. Validar schema remoto read-only antes de qualquer aplicação posterior.

## 12. Portugal/UE versus Brasil

| Tema | Portugal/UE | Brasil |
|---|---|---|
| Mercado | `PT_EU` | `BR` |
| Moeda | EUR | BRL |
| Valores | não definidos; mercado fica desativado | 39,90 mensal; 383,04 anual; 49,90 avulso |
| Price IDs | pendentes | pendentes no repositório |
| Proteção de dados | RGPD/GDPR | LGPD |
| Consumo | regras UE/Portugal aplicáveis à oferta | CDC e comércio eletrônico aplicáveis à oferta |
| Seleção | configuração server-side | configuração server-side |

O domínio e a base de código permanecem únicos. O acesso geográfico isolado não
troca automaticamente a seção contratual; prevalecem mercado e oferta selecionados.

## 13. Riscos residuais

- migration extensa ainda sem execução real;
- possíveis ajustes de tipos da versão Stripe/Deno só aparecerão no serve local;
- política de reembolso parcial exige decisão e revisão; hoje fica marcada para
  revisão manual;
- reconciliação ainda não está agendada;
- catálogo EUR e Price IDs inexistentes;
- limites técnicos precisam de aprovação e monitoramento de custo;
- confirmação de e-mail/SMTP/backups/restore não comprovados;
- revisão jurídica profissional pendente;
- VLT-008 e demais achados fora do escopo desta fase continuam relevantes;
- bundle principal ultrapassa 500 kB minificado (warning de build, não falha).

## 14. Recomendação de aptidão

**Pronto para revisão local; não apto para lançamento.**

Próximo gate: Supabase descartável com migration aplicada, concorrência real,
Edge Functions servidas/type-checked, Stripe test com produtos reais e revisão
jurídica/operacional. Somente depois desses gates deve haver nova avaliação de
aptidão.

