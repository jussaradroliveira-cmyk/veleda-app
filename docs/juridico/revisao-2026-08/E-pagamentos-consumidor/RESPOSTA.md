# E) Pagamentos e direito do consumidor

## Funcionamento real da plataforma (verificado, 13/08/2026)

| Tema | Como funciona de facto | Onde está nos Termos |
|---|---|---|
| Preços | Mensal R$ 39,90 · Anual R$ 383,04 (12×39,90 −20%) · Avulso R$ 49,90 = 5 leituras válidas 30 dias | §6 — consistente (há teste automático código↔Termos) |
| Cancelamento | Self-service no portal Stripe (link na área da conta): cancela no fim do período pago, mantém acesso até lá; sem troca de plano no portal; também aceito por e-mail | §7 — alinhado |
| Renovação | Automática via Stripe; falha de pagamento não concede acesso (webhook só ativa com pagamento confirmado, incl. pagamento assíncrono Pix) | §7 — alinhado |
| Arrependimento 7 dias (CDC art. 49) | **Sem fluxo automático** — pedido por e-mail a contact@veledataro.com; reembolso via Stripe | §8 — descreve exatamente isto |
| Reembolso/chargeback | Webhook retira o Premium ou zera **apenas os créditos não usados do lote reembolsado** (créditos gastos não são retirados; outros lotes intactos) | §8 — alinhado |
| Mudança de preço | Só para períodos futuros, com aviso | §7 — alinhado; tecnicamente exigiria novo checkout/atualização Stripe |
| Exclusão de conta vs. cancelamento | Excluir a conta **cancela antes** as assinaturas ativas na Stripe (falha-fechada: se o cancelamento falhar, a exclusão não prossegue) | §7/§13 — alinhado |
| Quota grátis | 1 leitura/semana civil; Premium até 10/dia (reset UTC) | §5/§6 — alinhado |

Conclusão técnica: **não encontrei divergência entre os Termos vigentes (v2.2)
e o comportamento real**. Os pontos que a advogada quiser apertar são de
redação, não de sistema.

## Pontos abertos para a advogada decidir

1. **Arrependimento com serviço já consumido** — se a pessoa assina, faz
   leituras e pede arrependimento no dia 6: os Termos permitem restituição
   "quando aplicável". Definir a regra prática (reembolso integral? dedução
   proporcional? — CDC tende ao integral no prazo de 7 dias) para a equipa
   aplicar de forma uniforme.
2. **Consentimento para execução imediata do serviço digital** (relevante para
   consumidores PT/UE no futuro): incluir no checkout a declaração de início
   imediato com perda/limitação do direito de livre resolução, se aplicável.
3. Confirmar que o e-mail de suporte responde a pedidos de reembolso em prazo
   definido (sugerido: 7 dias úteis) — hoje não há SLA publicado.

## Ações

| Ação | Responsável |
|---|---|
| Definir regra prática de reembolso no arrependimento | Advogada |
| Ajustes de redação nos Termos §7/§8 (se necessário) | Advogada → técnico publica |
