#!/usr/bin/env bash
# Regression suite: drives the real game in headless Chromium (Playwright) and prints each test's last lines.
# Every test should end with "errors []" (or "errs []" / "ERRORS []"). Screenshots land in tools/tests/out/.
# Needs: node 18+, `npm i -D playwright` (or a global playwright with Chromium), and the dev server:
#   node tools/serve.mjs 8080      (in another terminal)
set -u
cd "$(dirname "$0")"
mkdir -p out && cd out
TESTS=${*:-"phase1 meta perks p4 modes twists upg mut wpn od ride ngp roam roam2 fin v19 sp2 ngp2 fr frk logall"}
for t in $TESTS; do
  echo "=== $t"
  NODE_PATH="${NODE_PATH:-}" timeout 400 node "../$t.js" 2>&1 | grep -v "^\s*'" | tail -4 | cut -c1-220
done
