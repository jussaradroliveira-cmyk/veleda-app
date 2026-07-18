#!/bin/bash
# Publica a Veleda no GitHub Pages a partir do ÚLTIMO COMMIT — nunca da
# working tree, para não arriscar publicar trabalho não commitado.
set -e
cd "$(dirname "$0")/.."
ROOT=$(pwd)
COMMIT=$(git rev-parse --short HEAD)

if [ -n "$(git status --porcelain)" ]; then
  echo "⚠️  Há alterações não commitadas — serão IGNORADAS. O deploy usa o commit $COMMIT."
fi

# checkout limpo do HEAD num worktree temporário
TMP=$(mktemp -d)
cleanup() { git worktree remove --force "$TMP" 2>/dev/null || rm -rf "$TMP"; }
trap cleanup EXIT
git worktree add --detach "$TMP" HEAD >/dev/null

# o .env (chaves VITE_*) e as dependências não estão no git
cp "$ROOT/.env" "$TMP/.env"
ln -s "$ROOT/node_modules" "$TMP/node_modules"

(cd "$TMP" && npm run build)
cp "$TMP/dist/index.html" "$TMP/dist/404.html"   # fallback SPA para o GitHub Pages

cd "$TMP/dist"
git init -q
git checkout -q -b gh-pages
git add -A
git commit -qm "deploy $COMMIT $(date +%Y-%m-%d_%H%M)"
git push -f "https://jussaradroliveira-cmyk@github.com/jussaradroliveira-cmyk/veleda-app.git" gh-pages
cd "$ROOT"
echo "✦ publicado (commit $COMMIT): https://jussaradroliveira-cmyk.github.io/veleda-app/"
