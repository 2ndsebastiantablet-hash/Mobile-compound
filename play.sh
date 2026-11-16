#!/bin/sh
# Start the OVERTIME test server and open the launcher (needs Node.js: https://nodejs.org)
cd "$(dirname "$0")"
( sleep 1; (xdg-open http://localhost:8080 || open http://localhost:8080) >/dev/null 2>&1 ) &
node tools/serve.mjs 8080
