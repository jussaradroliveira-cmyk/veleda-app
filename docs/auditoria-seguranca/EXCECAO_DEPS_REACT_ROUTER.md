# Exceção documentada — VLT-015 / react-router (RSC CSRF)

**Data:** 2026-07-29 · **Estado:** aceite, com prova de não alcançabilidade.

## O aviso
`npm audit` reporta 2 "high" em `react-router` / `react-router-dom`
(GHSA-qwww-vcr4-c8h2 — "RSC Mode CSRF Bypass Allows Action Execution Before 400
Response"). Intervalo afetado: `7.12.0 - 8.2.0`.

## Por que NÃO é alcançável na Veleda
A vulnerabilidade só existe no **modo RSC (React Server Components)** do React
Router, com Server Actions. A Veleda é uma **SPA client-side** (Vite + React,
sem SSR/RSC, sem `react-router` server runtime, sem actions do lado do
servidor). O caminho de código vulnerável não é carregado nem alcançável.

## Por que NÃO se corrige agora
- O único "fix" que o `npm audit fix --force` propõe é o **downgrade cego** para
  `react-router-dom@7.11.0` — perde 7 versões menores de correções e é
  desaconselhado pela auditoria original (VLT-015).
- **Não existe versão estável corrigida**: o `latest` é `7.18.2` (usado aqui) e
  ainda cai no intervalo do aviso; não há release estável `> 8.2.0`.

## O que foi feito
- `postcss` atualizado (era o 3.º "high", build-time) via `npm audit fix` → resolvido.
- `react-router-dom` fixado no patch mais recente do ramo 7 (`7.18.2`).

## Reavaliar quando
Sair uma versão estável de `react-router-dom` fora do intervalo `7.12.0 - 8.2.0`
que não seja downgrade → atualizar e remover esta exceção. Se algum dia a app
adotar SSR/RSC ou Server Actions, isto passa a ser **explorável** e tem de ser
corrigido antes.
