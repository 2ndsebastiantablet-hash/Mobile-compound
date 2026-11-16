@echo off
REM Double-click to start the OVERTIME test server and open the launcher (needs Node.js: https://nodejs.org)
cd /d "%~dp0"
start "" http://localhost:8080
node tools\serve.mjs 8080
pause
