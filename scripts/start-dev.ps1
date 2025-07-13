# PowerShell script to start both frontend and backend
Write-Host "🚀 Starting Order Management System..." -ForegroundColor Blue
Write-Host "=====================================" -ForegroundColor Blue

# Start Backend
Write-Host "`n📦 Starting Backend (Order-management) on port 3001..." -ForegroundColor Green
$backendPath = Join-Path $PSScriptRoot "..\Order-management"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendPath'; npm run dev" -WindowStyle Normal

# Wait a moment for backend to start
Write-Host "⏳ Waiting for backend to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# Start Frontend
Write-Host "`n🌐 Starting Frontend on port 3000..." -ForegroundColor Green
$frontendPath = Join-Path $PSScriptRoot "..\frontend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontendPath'; npm run dev" -WindowStyle Normal

Write-Host "`n✅ Both services are starting..." -ForegroundColor Green
Write-Host "Backend:  http://localhost:3001" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "`n💡 Press Ctrl+C in each terminal to stop the services" -ForegroundColor Yellow

Write-Host "`nPress any key to exit this script..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
