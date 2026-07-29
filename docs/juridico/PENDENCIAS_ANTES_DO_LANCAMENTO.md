# Pendências antes do lançamento

Este documento reúne somente decisões ou informações que não estão confirmadas
no repositório. Não copiar estes itens como placeholders para páginas públicas.

## Identificação e atendimento

- Confirmar a morada profissional completa que legalmente deve ser divulgada.
  O projeto confirma apenas Ericeira, Portugal.
- Confirmar se `contact@veledataro.com` está operacional, monitorado e será o
  canal definitivo de suporte, privacidade, cobrança e exercício de direitos,
  ou definir canais separados.
- Confirmar quais informações fiscais, além do NIF 302020250 já presente no
  projeto, precisam ser publicadas em cada oferta.
- Definir o procedimento proporcional de confirmação de identidade para
  solicitações de acesso, correção, exportação e eliminação.
- Confirmar a autoridade de proteção de dados competente e os mecanismos de
  resolução alternativa de litígios que precisam constar da oferta final.

## Mercados, preços e Stripe

- Definir o preço fixo em EUR para mensal, anual e compra avulsa. Nenhum valor
  EUR está definido no repositório.
- Criar ou confirmar no Stripe test os Price IDs BR e PT/UE. Nenhum Price ID
  real está versionado.
- Confirmar se os valores BR já documentados (R$ 39,90 mensal, R$ 383,04 anual
  e R$ 49,90 por 5 leituras/30 dias) serão a oferta efetiva no lançamento.
- Definir a ordem de lançamento: Brasil, Portugal/UE ou ambos.
- Confirmar explicitamente o modo Stripe de cada ambiente e o processo
  controlado de passagem de test para live.
- Confirmar métodos de pagamento disponíveis por mercado e a entidade Stripe
  contratante. A integração direta com EBANX não está confirmada.
- Decidir a política comercial de cancelamento, direito de arrependimento,
  reembolso total/parcial, consumo de créditos após reembolso e chargeback.
- Confirmar configuração e texto do Customer Portal e os eventos inscritos no
  endpoint de webhook.
- Não ativar Stripe Adaptive Pricing sem decisão expressa e nova revisão.

## Retenção, fornecedores e operação

- Definir prazos reais de retenção por categoria: conta, leituras, diário,
  consentimentos, eventos Stripe, logs, suporte e solicitações de direitos.
- Confirmar o plano Supabase, política de backups, PITR, prazo de cópias,
  procedimento de restore e testes periódicos.
- Confirmar o provedor SMTP. Resend não está confirmado no código ou nos
  secrets descritos pela auditoria.
- Confirmar DPA, cláusulas de transferência internacional e contratos com
  Supabase, Anthropic, Stripe e Vercel.
- Confirmar a política e o contrato de retenção da Anthropic, inclusive eventual
  elegibilidade para Zero Data Retention.
- Definir quem pode acessar administrativamente perguntas e diário, em quais
  hipóteses, com qual registro e revisão de acesso.
- Definir limites finais de uso razoável do Premium e orçamento/alertas
  operacionais da Anthropic. Os limites defensivos locais desta fase precisam
  de aprovação de produto antes do lançamento.
- Confirmar plano de resposta a incidentes, contatos internos e procedimento
  de comunicação a titulares e autoridades.

## Ativação técnica pendente

- Subir Supabase local ou ambiente descartável e executar os testes SQL e de
  concorrência real antes de aplicar a migration desta fase.
- Aplicar manualmente a migration somente após revisão e backup adequados.
- Configurar e implantar as Edge Functions alteradas e a nova função de
  reconciliação; nenhuma foi implantada nesta fase.
- Definir scheduler, segredo e monitoramento para o job Stripe → Supabase.
- Executar fixtures no Stripe test e confirmar estados finais antes de live.
- Confirmar SMTP, confirmação de e-mail, CAPTCHA, política de senha e redirects
  no painel Supabase.

