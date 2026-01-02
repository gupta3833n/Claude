@echo off
title SwiftConnect Server
echo ==========================================
echo    SwiftConnect Server
echo ==========================================
echo.

cd /d "%~dp0server"

if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
)

if not exist "dist" (
    echo Building server...
    call npm run build
)

echo Starting server on http://localhost:3000
echo.
echo Press Ctrl+C to stop
echo.

node dist/index.js
pause
