# WisdomFlow AI - Local Hosting Launcher
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "         Starting WisdomFlow AI (Local Hosting)         " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "[1/2] Building Frontend..." -ForegroundColor Yellow
Set-Location "$ScriptDir\frontend"
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Frontend build failed." -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host ""
Write-Host "[2/2] Starting Unified Server on http://localhost:8000 ..." -ForegroundColor Green
Write-Host "(Access from phone/devices on same Wi-Fi via http://<your-laptop-ip>:8000)" -ForegroundColor Gray
Set-Location "$ScriptDir\backend"
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
