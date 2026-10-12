@echo off
cd /d "%~dp0"
set PUPPETEER_SKIP_DOWNLOAD=true
npm install
pause
