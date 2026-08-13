# Relatório de Impacto à Proteção de Dados (RIPD / DPIA) — Veleda Tarô Simbólico

**Versão definitiva 1.0** · Emitida em 13/08/2026 pela equipe técnica · Elaborada com base na LGPD, especialmente arts. 5.º, XVII, e 38, e no RGPD, especialmente art. 35. A seção 8 é reservada ao parecer e à assinatura da revisão jurídica.

---

## 1. Identificação

| Campo | Valor |
|---|---|
| Serviço | Veleda Tarô Simbólico — leituras de tarot reflexivas geradas por IA (https://veledataro.com) |
| Controladora | Jussara Derly Rodrigues de Oliveira Grota, pessoa singular, NIF 302020250, Ericeira, Portugal |
| Encarregado/DPO | Não designado. O canal contact@veledataro.com atende titulares e autoridades. A necessidade de designação será reavaliada diante de mudança de escala, risco ou enquadramento legal. |
| Canal do titular | contact@veledataro.com (página /privacidade) |
| Público-alvo | Consumidores no Brasil, maiores de 18 anos (autodeclaração no cadastro) |
| Data / versão do relatório | 13/08/2026 · versão 1.0 |

## 2. Descrição do tratamento

### 2.1 Natureza e finalidades

1. **Prestar o serviço**: gerar leituras de tarot a partir de uma pergunta do
   utilizador e três cartas sorteadas, mediante conta autenticada.
2. **Diário pessoal**: notas livres do utilizador, opcionalmente ligadas a leituras.
3. **Cobrança**: assinatura mensal/anual ou pacote avulso (Stripe).
4. **Obrigações legais**: prova de consentimento, faturação/fiscal.
5. **Segurança e operação**: logs técnicos sem conteúdo, quotas antiabuso.
6. **Medição de audiência**: analytics agregado e anónimo, sem cookies.

### 2.2 Dados tratados (inventário)

| Categoria | Dados | Origem | Onde ficam |
|---|---|---|---|
| Conta | e-mail, senha (hash), nome de exibição | titular | Supabase (UE) |
| Consentimentos | versão + hash SHA-256 do texto aceite + hora do servidor + idioma + mercado + declaração 18+ | sistema | Supabase (UE) |
| Conteúdo | pergunta, cartas sorteadas, texto da leitura, diário | titular / IA | Supabase (UE) |
| Pagamento | ID de cliente Stripe, plano, estado; dados de cartão só no Stripe | titular → Stripe | Stripe |
| Técnicos | logs de erro/segurança com códigos (sem conteúdo), IP nos logs de infraestrutura | sistema | Supabase/Vercel |

**Dados sensíveis:** o serviço não pede dados sensíveis, mas a pergunta e o
diário são texto livre e **podem conter, por iniciativa do titular**,
informações íntimas (saúde emocional, vida afetiva, religião). A Política
(v2.2/2.3 §4–§5, redação revista juridicamente) trata este cenário com base no
consentimento e desaconselha a inclusão de dados de terceiros.

### 2.3 Fluxo de dados (do clique à leitura)

1. O utilizador autentica-se (Supabase Auth, UE) e escreve a pergunta.
2. O servidor valida sessão, consentimentos vigentes e quota (reserva atómica).
3. Segue para a Anthropic (EUA) **apenas**: pergunta + 3 cartas + instruções
   fixas + idioma. **Sem identificadores** (nem nome, nem e-mail, nem ID, nem
   IP do utilizador) — pedidos são impessoais e não correlacionáveis.
4. A leitura volta, é validada/sanitizada e gravada no Supabase (UE), ligada à
   conta **apenas dentro do Veleda**.
5. O diário nunca sai do Supabase. Pagamentos correm inteiramente no Stripe.
6. E-mails de autenticação saem via Resend (EUA) — só e-mail e conteúdo
   transacional.

### 2.4 Operadores e transferências internacionais

Ver inventário completo com DPAs na pasta `C-fornecedores-transferencias/`.
Resumo: Supabase (UE-Irlanda, armazenamento primário), Anthropic (EUA, IA,
payload minimizado), Stripe (EEE/EUA, pagamentos), Vercel (EUA, hospedagem),
Resend (EUA, e-mail). Mecanismos: DPAs com SCCs/DPF dos fornecedores
(LGPD art. 33 / RGPD cap. V).

### 2.5 Retenção

Por critério/finalidade (Política v2.3 §8): dados de conta/conteúdo enquanto a
conta existir; exclusão de conta = eliminação imediata e total (verificada);
dados fiscais 10 anos (Stripe); backups conforme o plano efetivamente contratado; recuperação a um ponto no tempo ainda não ativada; na Anthropic, retenção e eliminação segundo as condições do serviço comercial contratado, sem uso padrão para treinamento geral de modelos.

## 3. Necessidade e proporcionalidade

| Teste | Avaliação |
|---|---|
| Finalidade legítima e específica | Sim — entretenimento/reflexão contratado pelo titular |
| Minimização | Cadastro pede só e-mail+senha (+nome de exibição opcional na 1.ª leitura); a IA recebe payload mínimo sem identificadores; sem cookies de tracking |
| Base legal (LGPD) | Execução de contrato (art. 7 V) para o serviço; consentimento (art. 7 I / art. 11 I para sensíveis inseridos pelo titular); obrigação legal (fiscal); legítimo interesse (segurança/logs)  |
| Transparência | Política + Subprocessadores + Cookies públicos; aviso pré-envio e pós-leitura permanentes; exportação self-service |
| Direitos do titular | Acesso/portabilidade (exportação), eliminação (exclusão total), retificação (nome/senha/e-mail), informação (páginas legais) — operacionais hoje |
| Alternativas menos intrusivas | Geração sem IA externa (modelo local) foi considerada e rejeitada por inviabilidade de qualidade/custo; a mitigação escolhida foi minimizar o payload |

## 4. Medidas de segurança implementadas (verificadas no código/produção)

**Técnicas**
1. RLS (Row-Level Security) em todas as tabelas; RPCs financeiras/quota só
   `service_role`; colunas sensíveis de perfil bloqueadas a escrita do titular.
2. Cifra em trânsito (TLS) e em repouso (Supabase/Stripe padrão).
3. Senhas com hash (Supabase Auth); recuperação de senha com fluxo restrito.
4. Pergunta tratada como dado não confiável (anti prompt-injection, entrada e
   saída); saída da IA sanitizada (DOMPurify) antes de renderizar.
5. Logs sem conteúdo de perguntas/diário (só códigos técnicos + request_id).
6. CSP, X-Frame-Options, nosniff, HSTS, Referrer/Permissions-Policy.
7. CORS por origem exata; quotas e rate-limits atómicos no servidor; teto
   global de gasto operacional (budget) para abuso.
8. Exclusão de conta falha-fechada (cancela Stripe antes; tudo-ou-nada).
9. Idempotência e reservas atómicas nos pagamentos/leituras (sem dupla cobrança).
10. Deteção local de sinais de crise com recursos de apoio por país (CVV 188…).

**Organizacionais**
11. Consentimentos com prova forte (hash do texto + hora do servidor).
12. Segredos fora do repositório; chaves só no servidor (Supabase secrets).
13. Auditorias de segurança independentes (jul/2026: 2 rondas, 14+17 achados,
    fechados no código — relatórios em `docs/auditoria-seguranca/`).
14. Testes automatizados de invariantes de segurança (RLS, grants, consents)
    correndo contra Postgres real (`npm run test:db`).

## 5. Avaliação de riscos

Escala: probabilidade e impacto Baixo/Médio/Alto; risco residual após medidas.

| # | Risco | Prob. | Impacto | Medidas em vigor | Residual |
|---|---|---|---|---|---|
| R1 | Exposição de perguntas/diário íntimos por violação de dados | B | **A** | RLS, cifra, logs sem conteúdo, auditorias, CSP | **Médio-baixo** |
| R2 | Reidentificação dos conteúdos enviados à IA | **B** | M | payload sem identificadores; pedidos impessoais; sem treino; eliminação curta no fornecedor | **Baixo** |
| R3 | Transferência internacional (Anthropic/Resend/Vercel, EUA) sem salvaguarda | B | M | DPAs/SCCs dos fornecedores; minimização; armazenamento primário na UE | **Baixo** (validar arquivo dos DPAs) |
| R4 | Utilizador em sofrimento psíquico usa o serviço como apoio | M | **A** | deteção de crise + recursos por país; avisos fixos; tom acolhedor imposto no prompt; sem conselhos médicos | **Médio** — monitorizar; rever bateria de perguntas sensíveis |
| R5 | Uso por menores (autodeclaração falsa) | M | M | declaração 18+ com prova; suspensão perante indícios; sem marketing dirigido a menores | **Médio-baixo** (limite conhecido e documentado) |
| R6 | Backups prometidos na Política ainda não contratados | certo | B | pendência única e conhecida; checklist de lançamento | **Baixo** — fechar com Supabase Pro |
| R7 | Dependência de fornecedor único de IA | M | B | erro tratado com estorno automático da quota; retry; sem dados retidos no fornecedor | **Baixo** |
| R8 | Ausência de Encarregado/DPO designado | — | M | canal de privacidade existe (contact@) | **Baixo** — canal ativo; necessidade de designação será reavaliada por escala, risco e enquadramento |
| R9 | Prestador de IA altera política de dados | B | M | políticas arquivadas com data; revisão periódica anual sugerida | **Baixo** |

Nenhum risco residual classificado como Alto. Os dois "Médios" (R4, R5) são
inerentes ao tipo de serviço e estão mitigados ao nível praticável; ficam
sob monitorização.

## 6. Consulta a titulares / partes

Não realizada (serviço em piloto). A transparência é assegurada pelos
documentos públicos e pelos avisos permanentes na interface.

## 7. Recomendações da equipa técnica

1. Ativar **Supabase Pro** antes da divulgação (fecha R6 e a frase do §9).
2. Arquivar (PDF datado) os **DPAs/termos** dos 5 fornecedores (fecha R3).
3. Reavaliar anualmente a necessidade de **designação formal de Encarregado/DPO** (R8), mantendo o canal de atendimento ativo.
4. Publicar a linha do **Resend** nos Subprocessadores (pasta C).
5. Rodar a **bateria de perguntas sensíveis** à IA antes da divulgação (R4) e
   repetir a cada mudança relevante de prompt/modelo.
6. Rever este RIPD anualmente ou a cada mudança material (novo fornecedor,
   novo mercado, novo tipo de dado).

## 8. Parecer jurídico e aprovação

Espaço reservado ao parecer independente da revisão jurídica e às assinaturas de aprovação.

- Enquadramento das bases legais (secção 3): ______
- Suficiência das medidas (secção 4) face aos riscos (secção 5): ______
- Necessidade de consulta à ANPD/medidas adicionais: ______

| Papel | Nome | Data | Assinatura |
|---|---|---|---|
| Controladora | Jussara Derly Rodrigues de Oliveira Grota | | |
| Revisão jurídica | | | |
