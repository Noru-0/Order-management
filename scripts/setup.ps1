# Order Management System Setup
# Simplified setup script for Event Sourcing demo

Write-Host "🚀 Order Management System Setup" -ForegroundColor Blue
Write-Host "===============================" -ForegroundColor Blue

# Install dependencies
Write-Host "`n📦 Installing dependencies..." -ForegroundColor Green
try {
    Set-Location ".."
    npm install
    Set-Location "Order-management"
    npm install
    Set-Location "../frontend" 
    npm install
    Set-Location "../scripts"
    Write-Host "✅ Dependencies installed" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    exit 1
}

# Setup database (optional)
$setupDb = Read-Host "`n🐘 Setup PostgreSQL database? (y/N)"
if ($setupDb -eq 'y' -or $setupDb -eq 'Y') {
    try {
        & .\database-setup.bat
        Write-Host "✅ Database setup completed" -ForegroundColor Green
    } catch {
        Write-Host "⚠️  Database setup failed, will use in-memory store" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  Skipping database setup - will use in-memory store" -ForegroundColor Yellow
}

Write-Host "`n🎉 Setup complete!" -ForegroundColor Green
Write-Host "`nTo start the system:" -ForegroundColor Cyan
Write-Host "  .\start-dev.ps1            # Start in separate terminals" -ForegroundColor White
Write-Host "  npm run dev                # Start both frontend & backend" -ForegroundColor White
Write-Host "`nAccess URLs:" -ForegroundColor Cyan  
Write-Host "  Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "  Backend:  http://localhost:3001" -ForegroundColor White
