#!/bin/bash
# Publica a Veleda na Vercel a partir do ÚLTIMO COMMIT — nunca da working
# tree, para não arriscar publicar trabalho não commitado.
set -e
cd "$(dirname "$0")/.."
ROOT=$(pwd)
COMMIT=$(git rev-parse --short HEAD)

if [ -n "$(git status --porcelain)" ]; then
  echo "⚠️  Há alterações não commitadas — serão IGNORADAS. O deploy usa o commit $COMMIT."
fi

TMP=$(mktemp -d)
cleanup() { git worktree remove --force "$TMP" 2>/dev/null || rm -rf "$TMP"; }
trap cleanup EXIT
git worktree add --detach "$TMP" HEAD >/dev/null

# liga o worktree ao projeto Vercel (as env vars vivem na Vercel)
cp -R "$ROOT/.vercel" "$TMP/.vercel"

(cd "$TMP" && npx vercel deploy --prod --yes 2>&1 | tail -3)
echo "✦ publicado (commit $COMMIT): https://veledataro.com (e veleda-app.vercel.app)"
