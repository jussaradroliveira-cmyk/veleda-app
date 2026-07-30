# Proposta — Retenção e backups na Política de Privacidade (VLT2-012)

> **Estado: PROPOSTA. NÃO aplicada ao site.** Levar à advogada antes de publicar.
> Objetivo: alinhar o texto da Política ao que a operação **consegue mesmo cumprir
> hoje**, sem depender de rotinas automáticas de eliminação (que ainda não existem),
> e descrever os backups de forma condizente com o **Supabase Pro** (backup diário +
> recuperação a um ponto no tempo / PITR).

## Porquê mudar (o achado)

A auditoria (VLT2-012) apontou que a Política **publica prazos fixos** — "até 30
dias", "até 90 dias", "até 12 meses", "até 24 meses" — que **dão a entender uma
eliminação automática** dessas categorias em cada prazo. Não existem, hoje, tarefas
automáticas que apaguem logs aos 12 meses ou tickets de suporte aos 24 meses. Além
disso, a secção de Segurança afirma "backups" sem descrever o ciclo real.

Duas correções, ambas **honestas e cumpríveis já**:
1. **Retenção** por *critério/finalidade* (e prazos legais), em vez de prazos-limite
   que implicam automação. Onde a eliminação é de facto imediata (exclusão de conta
   processada pelo servidor), mantém-se; onde não há automação, descreve-se por
   finalidade.
2. **Backups** descritos como o que o Supabase Pro oferece: backup diário + PITR,
   com sobrescrita automática pelo fornecedor.

---

## §8 — Conservação e eliminação

### Texto ATUAL

> Tipo de dado — Prazo ou critério
> - Conta e perfil — Durante a conta; após pedido de exclusão, remoção dos sistemas ativos normalmente em até 30 dias, salvo impedimento legal ou incidente.
> - Perguntas, leituras, diário e histórico — Até o Usuário apagar ou encerrar a conta. Cópias residuais de backup são substituídas no ciclo técnico, normalmente em até 90 dias.
> - Assinaturas, compras e eventos de pagamento — Pelo período necessário ao contrato, reembolsos, chargebacks, prevenção de fraude e obrigações legais.
> - Documentos fiscais e contabilísticos — Pelo prazo obrigatório aplicável; em Portugal, geralmente até 10 anos.
> - Aceites, consentimentos e pedidos de direitos — Enquanto necessários para demonstrar conformidade e durante os prazos legais de prescrição ou defesa.
> - Registos técnicos e de segurança — Normalmente até 12 meses; por período superior quando relacionados a incidente, fraude ou litígio.
> - Suporte — Até 24 meses após encerramento do pedido, salvo necessidade de defesa ou obrigação legal.
> - Dados anonimizados — Podem ser mantidos por prazo indeterminado quando não permitam razoavelmente identificar uma pessoa.

### Texto PROPOSTO

> A Veleda conserva cada categoria de dados apenas enquanto necessária para a
> finalidade que a justifica e pelos prazos legais aplicáveis. Terminada a
> finalidade e esgotados os prazos legais, os dados são eliminados ou anonimizados.
>
> Tipo de dado — Prazo ou critério
> - **Conta e perfil** — Enquanto a conta existir. Quando o Usuário solicita a
>   exclusão, os dados são removidos dos sistemas ativos no processamento do pedido
>   (em regra, de imediato; em qualquer caso, em prazo não superior a 30 dias),
>   salvo impedimento legal ou incidente de segurança em curso.
> - **Perguntas, leituras, diário e histórico** — Enquanto a conta existir ou até
>   o Usuário os apagar. A eliminação nos sistemas ativos ocorre no processamento
>   do pedido; as cópias de segurança deixam de os conter no decurso do ciclo de
>   backup descrito na secção "Segurança".
> - **Assinaturas, compras e eventos de pagamento** — Pelo período necessário à
>   execução do contrato e, depois, pelos prazos de prevenção de fraude, gestão de
>   reembolsos/chargebacks e obrigações legais aplicáveis. O processador de
>   pagamento conserva os próprios registos segundo os termos dele.
> - **Documentos fiscais e contabilísticos** — Pelo prazo obrigatório aplicável;
>   em Portugal, em regra, 10 anos.
> - **Aceites, consentimentos e pedidos de direitos** — Enquanto necessários para
>   demonstrar conformidade e durante os prazos legais de prescrição ou de defesa.
> - **Registos técnicos e de segurança** — Pelo tempo necessário às finalidades de
>   segurança, deteção e prevenção de fraude e diagnóstico, e pelos prazos legais
>   aplicáveis. Parte destes registos é conservada pelos subcontratantes de
>   infraestrutura (por exemplo, Supabase e Vercel) segundo os ciclos e planos
>   deles. Podem ser conservados por mais tempo quando associados a incidente,
>   fraude ou litígio.
> - **Suporte** — Pelo tempo necessário ao atendimento e, depois, enquanto
>   necessário para prova, exercício de direitos ou cumprimento de obrigação legal.
> - **Dados anonimizados** — Podem ser mantidos por prazo indeterminado quando não
>   permitam razoavelmente identificar uma pessoa.
>
> Uma solicitação de eliminação não alcança dados cuja conservação seja obrigatória
> ou necessária para exercício de direitos, prevenção de fraude, segurança ou defesa
> em processo. Nesses casos, o uso fica restrito à finalidade de retenção.

**O que muda e porquê**
- Sai o "até 90 dias" das cópias de leituras/diário → passa a remeter para o ciclo
  real de backup (secção Segurança). *Não prometemos um número que não controlamos.*
- Sai o "normalmente até 12 meses" (registos técnicos) e o "até 24 meses" (suporte)
  → passam a *finalidade + prazos legais*. *Deixa de implicar apagamento automático.*
- Mantém-se o **30 dias** para exclusão de conta (é um teto folgado; na prática a
  função de exclusão remove de imediato dos sistemas ativos).
- Mantêm-se os **10 anos** fiscais (obrigação legal) e o critério dos anonimizados.

---

## §9 — Segurança (frase dos backups)

### Texto ATUAL (frase)

> …registos técnicos, gestão de vulnerabilidades, **backups e resposta a incidentes**.

### Texto PROPOSTO

Manter a frase, e **acrescentar um parágrafo** a seguir:

> As cópias de segurança (backups) da base de dados são geridas pelo subcontratante
> de infraestrutura (Supabase). No plano contratado existem **backups automáticos
> diários** e **recuperação a um ponto no tempo (point-in-time recovery)**, com
> retenção de curto prazo definida pelo plano; as cópias mais antigas são
> **sobrescritas automaticamente** segundo esse ciclo. Por esse motivo, após a
> eliminação de dados dos sistemas ativos, as cópias de segurança deixam de os
> conter no decurso do ciclo de retenção do fornecedor.

> **Nota operacional (não vai para o texto):** esta redação assume o **Supabase Pro
> ativo** (backup diário + PITR). Evitei fixar um número exato de dias de PITR
> porque depende da configuração do plano; "retenção de curto prazo definida pelo
> plano" cobre 7 dias ou o que configurares, sem prometer a mais.

---

## §14 — Incidentes de segurança

Sem alteração necessária. O texto atual ("investigados, contidos e documentados;
titulares e autoridades comunicados quando exigido, nos prazos legais, incluindo
RGPD e ANPD") já é condizente e não promete prazos internos fixos.

---

## O que passas a ter de cumprir na prática (sem automação)

Com este texto, o compromisso operacional fica realista e **manual**:
1. **Exclusão de conta:** já é automática (o botão "excluir conta" chama a função
   do servidor que apaga dos sistemas ativos e cancela assinatura antes). ✔ nada a fazer.
2. **Backups:** ativar o **Supabase Pro** (backup diário + PITR). Depois de ativo, a
   frase proposta passa a ser verdadeira sem mais nada. ✔
3. **Pedidos de acesso/eliminação por email:** responder dentro dos prazos legais
   (RGPD ~1 mês; LGPD 15 dias para a declaração completa). É trabalho manual teu.
4. **Registos técnicos/suporte:** não prometemos apagá-los num prazo fixo; ficam
   "enquanto necessários". Quando quiseres, mais tarde, podemos automatizar uma
   limpeza periódica e então voltar a publicar prazos concretos.

## Para dizer à advogada
- O objetivo foi **não publicar prazos automáticos que a operação não cumpre hoje**,
  mantendo a base legal (finalidade + prazos legais) e a obrigação fiscal (10 anos).
- Confirmar se, no mercado-alvo (Brasil) e no estabelecimento (Portugal/UE), ela
  prefere **manter** alguns prazos numéricos (ex.: logs 12 meses) — nesse caso eu
  **implemento a rotina automática** que os cumpre, e voltamos a pôr os números.
- Se aprovado, isto entra como **Política de Privacidade v2.3** (bump de versão +
  novo hash + o mecanismo de reaceite genérico pede o reaceite às contas existentes,
  tal como fizemos na 2.2).
