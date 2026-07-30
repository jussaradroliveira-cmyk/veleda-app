#!/bin/bash
# VLT2-018: testes de integração contra um Postgres REAL (não regex sobre SQL).
# Sobe um container descartável com a MESMA imagem de produção, aplica TODAS as
# migrações desde zero (prova que a árvore de migrações é aplicável de raiz) e
# corre asserções de invariantes (RLS, search_path, grants, versão vigente) e
# comportamentais (ledger de crédito FIFO/estorno, reaceite, cap do diário).
#
# Uso:  bash scripts/db-integration-test.sh
# Requer: docker (ou colima) a correr. Não toca em produção nem em segredos.
set -euo pipefail
cd "$(dirname "$0")/.."

IMAGE="public.ecr.aws/supabase/postgres:17.6.1.106"
CT="veleda_dbint_$$"
PSQL() { docker exec -i "$CT" psql -U postgres -d postgres "$@"; }

cleanup() { docker rm -f "$CT" >/dev/null 2>&1 || true; }
trap cleanup EXIT

echo "▶ a subir Postgres descartável ($IMAGE)…"
docker run -d --name "$CT" -e POSTGRES_PASSWORD=postgres "$IMAGE" >/dev/null
for i in $(seq 1 40); do
  [ "$(docker inspect -f '{{.State.Health.Status}}' "$CT" 2>/dev/null)" = "healthy" ] && break
  sleep 3
done
sleep 6

echo "▶ a aplicar TODAS as migrações desde zero…"
for f in supabase/migrations/*.sql; do
  if ! PSQL -v ON_ERROR_STOP=1 -q < "$f" >/tmp/veleda_mig.out 2>&1; then
    echo "❌ falhou a migração $(basename "$f"):"; tail -5 /tmp/veleda_mig.out; exit 1
  fi
done
echo "  ✓ árvore de migrações aplica de raiz"

echo "▶ asserções de invariantes…"
PSQL -v ON_ERROR_STOP=1 -q < tests/db/assertions.sql

echo "▶ asserções comportamentais…"
PSQL -v ON_ERROR_STOP=1 -q < tests/db/behavioral.sql

echo "✦ DB integration test: TUDO OK"
