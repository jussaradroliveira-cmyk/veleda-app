# D) Anthropic / Claude — o que é enviado, retenção e treino

## Confirmação técnica (código em produção, 13/08/2026)

O Veleda usa a **API comercial** da Anthropic (modelo `claude-sonnet-5`), com
chave de API guardada só no servidor. **Não** é o Claude.ai de consumidor
(regime de dados diferente).

Payload de cada pedido (verificado na função `generate-reading`):
- instruções fixas do sistema (persona da taróloga, regras de segurança, idioma);
- o texto da pergunta (delimitado e escapado como dado não confiável);
- as 3 cartas sorteadas (nome, arcano, naipe, palavras-chave).

**Sem** nome, e-mail, ID de utilizador, IP do utilizador, diário, histórico ou
qualquer identificador de conta. A resposta gerada é validada e guardada no
Supabase (UE); a Anthropic não recebe callback nem webhook.

## Confirmação contratual (fontes oficiais)

1. **Treino de modelos:** por padrão a Anthropic **não usa inputs/outputs da
   API comercial para treinar modelos**. Fonte: "By default, we will not use
   your inputs or outputs from our commercial products (e.g. Claude for Work,
   Anthropic API…) to train our models." —
   https://privacy.claude.com/en/articles/7996868-is-my-data-used-for-model-training
   (A exceção — feedback explícito com opt-in — não se aplica: o Veleda não
   envia feedback à Anthropic.)
2. **Retenção:** política comercial de eliminação automática dos inputs/outputs
   no backend em prazo curto (padrão histórico de 30 dias; logs de API
   reduzidos para 7 dias desde setembro/2025). Termos:
   https://www.anthropic.com/legal/commercial-terms
3. **Zero Data Retention (ZDR):** existe para clientes que qualifiquem, por
   acordo. Pode ser pedido quando o volume justificar.
4. **DPA:** a Anthropic disponibiliza Data Processing Addendum aos termos
   comerciais (transferências com SCCs).

## Minuta para revisão da advogada — parágrafo para a Política de Privacidade

> "As leituras são geradas por um fornecedor de inteligência artificial
> (Anthropic, EUA), que recebe apenas o texto da pergunta e as cartas
> sorteadas, sem nome, e-mail ou identificadores da conta. Nos termos da
> política comercial do fornecedor, esses conteúdos não são utilizados para
> treinar modelos de IA e são automaticamente eliminados dos sistemas do
> fornecedor em prazo curto após o processamento."

## Ações

| Ação | Responsável |
|---|---|
| Arquivar cópia datada dos termos comerciais/DPA da Anthropic | Advogada |
| Validar o parágrafo da Política | Advogada |
| Avaliar pedido de ZDR quando houver escala | Jussara + técnico |
