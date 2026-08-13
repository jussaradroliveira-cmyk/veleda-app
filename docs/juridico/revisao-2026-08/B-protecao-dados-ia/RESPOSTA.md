# B) Proteção de dados e IA — consentimento, envio e minimização

## Situação verificada (13/08/2026, código em produção)

**O que vai à IA (Anthropic) em cada leitura** — função `generate-reading`:

| Enviado | Nunca enviado |
|---|---|
| Texto da pergunta | Nome / display name |
| 3 cartas (nome, arcano, naipe, palavras-chave) | E-mail, ID de utilizador |
| Instruções fixas (prompt) e idioma | Diário, histórico, dados de pagamento |

**Salvaguardas implementadas:**

1. **Minimização** — o payload acima é o mínimo funcional; não há
   identificadores, pelo que a Anthropic não consegue ligar perguntas a
   pessoas nem perguntas entre si (cada pedido é isolado).
2. **Logs sem conteúdo** — os logs do servidor registam apenas códigos
   técnicos e request_id; a pergunta nunca aparece em logs.
3. **Armazenamento na UE** — perguntas, leituras e diário ficam no Supabase
   (Irlanda), cifrados em repouso e em trânsito (TLS).
4. **Anti prompt-injection** — a pergunta é delimitada e escapada como dado
   não confiável (entrada e saída), impedindo que conteúdo malicioso vire
   instrução.
5. **Sinais de crise** — deteção local (regex, sem terceiros); mostra recursos
   de apoio (CVV 188 no BR, 3114 FR, Samaritans UK) e instrui a IA a acolher;
   sem registo do conteúdo em logs.
6. **Aviso pré-envio permanente** — antes de submeter a pergunta, aviso fixo
   de que o serviço é reflexão simbólica/entretenimento e não substitui apoio
   profissional; aviso equivalente fixo no fim de cada leitura.
7. **Uma pergunta por leitura** — perguntas compostas são bloqueadas (limita o
   volume de texto livre enviado).
8. **Dados sensíveis** — a Privacidade (v2.2→2.3, §4/§5, redação já revista
   pela advogada em julho) trata as perguntas/diário como podendo conter dados
   sensíveis fornecidos por iniciativa do titular, com base no consentimento.

## Minuta para revisão da advogada

Reforço proposto (se a advogada entender necessário) — acrescentar ao aviso
pré-envio, na interface:

> "Evite incluir na pergunta nomes completos, documentos ou dados de terceiros.
> A pergunta é enviada de forma anónima ao fornecedor de IA apenas para gerar
> a sua leitura."

E, na Política de Privacidade (§ do tratamento pela IA), explicitar:

> "A pergunta é transmitida ao fornecedor de inteligência artificial sem nome,
> e-mail ou qualquer identificador da conta. O fornecedor não utiliza estes
> conteúdos para treinar modelos e elimina-os automaticamente nos prazos da
> sua política comercial (ver secção Fornecedores)."

## Ações

| Ação | Responsável |
|---|---|
| Validar/ajustar os dois textos acima | Advogada |
| Publicar aviso na UI (3 idiomas) + Política (nova versão + reaceite se aplicável) | Técnico |
