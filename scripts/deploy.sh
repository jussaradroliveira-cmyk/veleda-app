#!/bin/bash
# Publica a Veleda no GitHub Pages: npm run deploy
set -e
cd "$(dirname "$0")/.."
npm run build
cp dist/index.html dist/404.html   # fallback SPA para o GitHub Pages
cd dist
git init -q
git checkout -q -b gh-pages
git add -A
git commit -qm "deploy $(date +%Y-%m-%d_%H%M)"
git push -f "https://jussaradroliveira-cmyk@github.com/jussaradroliveira-cmyk/veleda-app.git" gh-pages
cd ..
rm -rf dist/.git
echo "✦ publicado: https://jussaradroliveira-cmyk.github.io/veleda-app/"
