# G) Retenção e exclusão de dados — Política × sistema

## Situação verificada (13/08/2026)

| O que a Política v2.3 diz | O que o sistema faz | Estado |
|---|---|---|
| §8: conservação por critério/finalidade, sem prazos automáticos numéricos | Não existem rotinas automáticas de expurgo — os dados vivem enquanto a conta existir | ✅ coerente (a v2.3 foi redigida assim de propósito) |
| Exclusão de conta em até 30 dias | Exclusão **imediata e total**: diário, leituras, consentimentos, perfil, reservas, compras e a conta de autenticação (cascatas verificadas); assinaturas Stripe canceladas **antes**, falha-fechada | ✅ cumpre com folga |
| Dados fiscais/pagamento: 10 anos | Ficam na Stripe (faturação) — não são apagados pela exclusão da conta | ✅ coerente |
| §9: backups diários + PITR com sobrescrita automática | **Supabase Pro ainda não ativado** — hoje só há os backups do plano atual | ⚠️ pendente: ativar o Pro antes de divulgar (já na checklist de lançamento) |
| Dados apagados desaparecem dos backups pelo ciclo de sobrescrita | Correto por desenho (retenção de backup do Supabase é rotativa) | ✅ quando o Pro estiver ativo |

Verificações de suporte:
- A exclusão foi testada em produção (julho/2026) com resultado "zero rasto"
  em todas as tabelas.
- A exportação de dados (`export-data`) devolve tudo o que existe sobre o
  titular (conta, 6 tabelas, eventos Stripe correlacionados), com rótulo
  honesto de "download self-service" distinto do pedido de resposta integral.

## Para a advogada

1. **Única pendência real: Supabase Pro** — a frase de backups do §9 só se
   torna plena com o plano ativo. Recomendação: ativar na véspera da
   divulgação (custo ~US$25/mês) ou, se a ativação for adiada, ajustar
   temporariamente a redação do §9.
2. Se no futuro forem criadas rotinas automáticas de retenção (ex.: apagar
   contas inativas há X anos), republicar a Política com os prazos numéricos —
   o desenho atual da v2.3 foi feito para não prometer o que não há.

## Ações

| Ação | Responsável |
|---|---|
| Ativar Supabase Pro antes de divulgar | Jussara |
| Decidir se mantém §9 como está até lá | Advogada |
