@echo off
title WisdomFlow AI - Local Server
echo ========================================================
echo         Starting WisdomFlow AI (Local Hosting)
echo ========================================================
echo.

echo [1/2] Building Frontend...
cd /d "%~dp0frontend"
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Frontend build failed.
    pause
    exit /b %errorlevel%
)

echo.
echo [2/2] Starting Unified Server on http://localhost:8000 ...
echo (Access from phone/devices on same Wi-Fi via your laptop IP)
cd /d "%~dp0backend"
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
pause
