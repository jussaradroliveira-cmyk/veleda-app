# Auditoria — Operação, Logs e Recuperação

**Data:** 2026-07-25 · **Modo:** read-only

## Email transacional

### V-003 — [P1] Veleda ainda no SMTP embutido do Supabase (não fiável)
- **Evidência:** config auth da Veleda **sem SMTP próprio** → usa o embutido: ~**2 emails/hora**, remetente genérico, cai facilmente no spam. O Resend está configurado **só na SARA** (sarabars.com), não na Veleda.
- **Impacto:** com utilizadores reais, a recuperação de senha vai falhar/atrasar para muitos — o exato problema vivido na SARA (o dono do Vibes). Também bloqueia confirmação de email no cadastro se um dia for ativada.
- **Recomendação:** configurar Resend para `veledataro.com` (o plano grátis do Resend só permite 1 domínio — já ocupado pelo sarabars; será preciso 2ª conta grátis ou plano pago). Personalizar o template (assunto/corpo pt-BR, como se fez na SARA).
- **Nota:** o cooldown de 60s no reenvio (já implementado) evita o pior da confusão, mas não resolve a entrega.

## Infraestrutura

### V-004 — [P1] Supabase no plano grátis — pausa por inatividade + erros 5xx a frio
- **Evidência:** o projeto **pausa** após inatividade (observado: uma query devolveu lista incompleta ao "acordar"); e a geração de leitura teve **502/500 de arranque frio** do worker (observado durante os testes). O cliente e a função têm retentativas que mitigam, mas não eliminam.
- **Impacto:** sob tráfego real, uma fração das leituras falha na primeira tentativa; contas podem ver erros.
- **Recomendação:** **Supabase Pro** (limites de worker maiores, sem pausa, backups melhores) antes de divulgar.

## Logs, backups, recuperação
- Logs das Edge Functions no plano grátis: retenção curta (~1h) — dificultou o diagnóstico do bug do Vibes. A função `generate-reading` tem instrumentação por etapa (bom).
- Sem monitorização de erros (Sentry) — **V-010 [P3]**.
- Backups: dependem do plano Supabase (grátis = limitado). Sem rollback testado.
- Migrations: em `supabase/migrations/`, mas **algumas alterações de schema foram aplicadas via Management API** durante o desenvolvimento (colunas de créditos, trigger, tabela de idempotência) — os ficheiros de migração existem mas convém confirmar que repo == live antes do lançamento (`supabase db diff`). **V-025 [P2]**.

## Rotação de chaves / segredos
- Segredos em `~/Desktop/veleda-secrets.env` (fora do git) e nos secrets do Supabase. A **chave live do Stripe** está comentada nesse ficheiro local. Sem processo formal de rotação.

## Contacto / resposta a incidentes
- Canal: contact@veledataro.com (email Namecheap Private Email, ativo). Sem runbook de incidentes.
