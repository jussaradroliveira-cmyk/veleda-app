# C) Fornecedores e transferências internacionais

## Situação verificada (13/08/2026)

Fornecedores efetivamente em uso (todos com DPA disponível):

| Fornecedor | Função | Dados pessoais tratados | Localização | DPA / mecanismo |
|---|---|---|---|---|
| Supabase Inc. | BD, autenticação, backend | conta, perfil, perguntas, leituras, diário, consentimentos, logs | **UE (Irlanda)** — projeto fixado na região | DPA online (SCCs para suporte fora da UE) — https://supabase.com/legal/dpa |
| Anthropic PBC | Geração das leituras (IA) | pergunta + cartas, **sem identificadores** (ver pasta D) | EUA | Commercial Terms + Data Processing Addendum — https://www.anthropic.com/legal/commercial-terms |
| Stripe | Pagamentos, faturação, antifraude | e-mail, ID cliente, plano, valores, dados de cartão (inseridos direto no Stripe) | EEE/EUA (entidade contratante Stripe conforme país) | DPA online + SCCs / DPF — https://stripe.com/legal/dpa |
| Vercel Inc. | Hospedagem do site/PWA, CDN, analytics anónimo | IP, navegador, logs técnicos; analytics **sem cookies e sem ID** | EUA + CDN global | DPA online + SCCs / DPF — https://vercel.com/legal/dpa |
| **Resend** | E-mails de autenticação (recuperação de senha, etc.) | e-mail do destinatário, metadados de entrega | EUA | DPA online — https://resend.com/legal/dpa |

Notas:
- **Brasil (LGPD art. 33):** transferências internacionais suportadas por
  cláusulas contratuais dos fornecedores; a Política de Privacidade já divulga
  os fornecedores e locais na página /subprocessadores.
- **⚠️ Lacuna: o Resend não consta da página /subprocessadores** (entrou em
  uso a 31/07/2026, depois da versão 2.2 da página). Minuta de correção abaixo.
- O frontend não usa cookies de tracking; analytics da Vercel é agregado e
  anónimo (sem cookies, documentado na página /cookies).

## Minuta para revisão da advogada — linha a adicionar à página /subprocessadores

> **Resend, Inc.** — Envio de e-mails transacionais de autenticação
> (recuperação de senha, confirmações de conta). — E-mail do destinatário,
> conteúdo da mensagem transacional e metadados de entrega. — Estados Unidos
> e infraestrutura indicada pelo fornecedor.

(Entra como nova versão do documento Subprocessadores, com atualização do
marcador de versão; não exige reaceite — página informativa referida pela
Política.)

## Ações

| Ação | Responsável |
|---|---|
| Confirmar/arquivar os DPAs aceites dos 5 fornecedores (PDF/print) | Jussara (aceites online) + advogada (arquivo) |
| Validar a linha do Resend | Advogada |
| Publicar Subprocessadores v2.3 | Técnico |
