#!/bin/bash
# Publica a Veleda na Vercel a partir do ÚLTIMO COMMIT — nunca da working
# tree, para não arriscar publicar trabalho não commitado.
set -e
set -o pipefail
cd "$(dirname "$0")/.."
ROOT=$(pwd)
COMMIT=$(git rev-parse --short HEAD)
BRANCH=$(git rev-parse --abbrev-ref HEAD)

# VLT2-017: allowlist do projeto — este script SÓ publica no projeto Veleda.
# Se o .vercel apontar para outro projeto (swap acidental), aborta.
EXPECTED_PROJECT_ID="prj_eq6jNfx8sQB6DIaHPdQXNf1sMZrU"
PROJECT_ID=$(sed -nE 's/.*"projectId":"([^"]+)".*/\1/p' .vercel/project.json 2>/dev/null || true)
if [ "$PROJECT_ID" != "$EXPECTED_PROJECT_ID" ]; then
  echo "❌ Recusado: .vercel aponta para '$PROJECT_ID', esperado o projeto Veleda ($EXPECTED_PROJECT_ID)."
  exit 1
fi

# VLT2-017: confirmação de alvo — --prod sem confirmação era deploy acidental.
if [ "$VELEDA_CONFIRM_DEPLOY" != "1" ]; then
  echo "Recusado: isto PUBLICA EM PRODUÇÃO (https://veledataro.com)."
  echo "  Projeto: veleda-app ($PROJECT_ID)"
  echo "  Commit:  $COMMIT  (branch $BRANCH)"
  echo "  Para confirmar: VELEDA_CONFIRM_DEPLOY=1 bash scripts/deploy.sh"
  exit 1
fi

# CLI da Vercel FIXADA (VLT-016): sem pin, um `npx vercel` puxava a última versão
# publicada no momento do deploy — não reprodutível. --no-install (VLT2-017) impede
# um fetch remoto silencioso no momento do deploy: usa só a versão já instalada.
VERCEL_CLI="${VERCEL_CLI:-vercel@58.1.0}"

echo "▶ Deploy de PRODUÇÃO — projeto veleda-app, commit $COMMIT (branch $BRANCH)"

if [ -n "$(git status --porcelain)" ]; then
  echo "⚠️  Há alterações não commitadas — serão IGNORADAS. O deploy usa o commit $COMMIT."
fi

TMP=$(mktemp -d)
cleanup() { git worktree remove --force "$TMP" 2>/dev/null || rm -rf "$TMP"; }
trap cleanup EXIT
git worktree add --detach "$TMP" HEAD >/dev/null

# liga o worktree ao projeto Vercel (as env vars vivem na Vercel)
cp -R "$ROOT/.vercel" "$TMP/.vercel"

if ! (cd "$TMP" && npx --no-install "$VERCEL_CLI" deploy --prod --yes 2>&1 | tail -3); then
  echo "❌ Falhou. Se for por o pacote não estar instalado/em cache, corre primeiro:"
  echo "   npx $VERCEL_CLI --version   (instala/faz cache da versão fixada)"
  exit 1
fi
echo "✦ publicado (commit $COMMIT): https://veledataro.com (e veleda-app.vercel.app)"
