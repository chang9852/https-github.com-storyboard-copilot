@echo off
echo ===================================
echo   Storyboard Copilot
echo ===================================
echo.

cd /d "%~dp0"

echo [1/2] Installing frontend dependencies...
call npm install

echo [2/2] Starting development server...
call npm run tauri dev

pause
