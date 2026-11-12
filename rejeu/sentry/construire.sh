#!/usr/bin/env bash
# Reconstruit js/vendor/sentry-aura.min.js depuis le SDK officiel (GO SENTRY · 12/11/2026).
# Usage : bash rejeu/sentry/construire.sh   (depuis la racine du dépôt)
set -euo pipefail
VER=11.12.0
RACINE="$(cd "$(dirname "$0")/../.." && pwd)"
B=/tmp/aura-sentry-build
mkdir -p "$B"
cd "$B"
[ -f package.json ] || npm init -y >/dev/null
npm i --no-audit --no-fund --save-exact "@sentry/browser@$VER" esbuild@0.25.12 >/dev/null
cp "$RACINE/rejeu/sentry/entree.js" "$B/entree.js"
npx esbuild entree.js --bundle --format=iife --global-name=__auraSentrySdk --minify --legal-comments=none \
  --target=chrome80 --define:__SENTRY_DEBUG__=false --define:__SENTRY_TRACING__=false --log-level=warning --outfile=out.js
{
  echo "/*! @sentry/browser $VER (MIT, Functional Software, Inc. dba Sentry) — sous-ensemble construit par rejeu/sentry/construire.sh pour AURA8 (GO SENTRY 12/11/2026). Ne pas éditer à la main. */"
  cat out.js
} > "$RACINE/js/vendor/sentry-aura.min.js"
sha256sum "$RACINE/js/vendor/sentry-aura.min.js"
wc -c "$RACINE/js/vendor/sentry-aura.min.js"
