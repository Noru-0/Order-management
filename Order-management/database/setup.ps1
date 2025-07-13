# PostgreSQL Setup Script for Order Management System

Write-Host "🐘 Setting up PostgreSQL for Order Management System..." -ForegroundColor Blue
Write-Host "=================================================" -ForegroundColor Blue

# Check if PostgreSQL is installed
$pgVersion = $null
try {
    $pgVersion = & psql --version 2>$null
    if ($pgVersion) {
        Write-Host "✅ PostgreSQL found: $pgVersion" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ PostgreSQL not found. Please install PostgreSQL first." -ForegroundColor Red
    Write-Host "Download from: https://www.postgresql.org/download/" -ForegroundColor Yellow
    Write-Host "Or use chocolatey: choco install postgresql" -ForegroundColor Yellow
    exit 1
}

Write-Host "`n📋 Database Setup Instructions:" -ForegroundColor Yellow
Write-Host "1. Make sure PostgreSQL service is running" -ForegroundColor White
Write-Host "2. Default credentials will be used (postgres/password)" -ForegroundColor White
Write-Host "3. Database 'order_management' will be created" -ForegroundColor White

Write-Host "`n🔐 Please ensure PostgreSQL is running and accessible" -ForegroundColor Cyan
Write-Host "Default connection: postgresql://postgres:password@localhost:5432" -ForegroundColor Gray

$response = Read-Host "`nPress Enter to continue or 'q' to quit"
if ($response -eq 'q') {
    exit 0
}

# Create database
Write-Host "`n📊 Creating database..." -ForegroundColor Green
try {
    & psql -U postgres -h localhost -c "CREATE DATABASE order_management;" 2>$null
    Write-Host "✅ Database 'order_management' created (or already exists)" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Database might already exist or credentials need adjustment" -ForegroundColor Yellow
}

# Run schema
Write-Host "`n🏗️  Creating tables and functions..." -ForegroundColor Green
$schemaPath = Join-Path $PSScriptRoot "schema.sql"

try {
    & psql -U postgres -h localhost -d order_management -f $schemaPath
    Write-Host "✅ Database schema created successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to create schema. Please check:" -ForegroundColor Red
    Write-Host "   - PostgreSQL is running" -ForegroundColor Red
    Write-Host "   - Credentials are correct (postgres/password)" -ForegroundColor Red
    Write-Host "   - Database permissions are set" -ForegroundColor Red
    exit 1
}

# Test connection
Write-Host "`n🧪 Testing database connection..." -ForegroundColor Green
try {
    $result = & psql -U postgres -h localhost -d order_management -c "SELECT COUNT(*) FROM events;" 2>$null
    if ($result) {
        Write-Host "✅ Database connection successful" -ForegroundColor Green
        Write-Host "📊 Events table ready with sample data" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Database connection test failed" -ForegroundColor Red
}

Write-Host "`n🎉 PostgreSQL setup completed!" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "1. Start the backend with: npm run dev" -ForegroundColor White
Write-Host "2. Backend will connect to PostgreSQL automatically" -ForegroundColor White
Write-Host "3. Check logs for database connection status" -ForegroundColor White

Write-Host "`n📝 Database Info:" -ForegroundColor Cyan
Write-Host "Database: order_management" -ForegroundColor White
Write-Host "Host: localhost:5432" -ForegroundColor White
Write-Host "User: postgres" -ForegroundColor White
Write-Host "Tables: events, snapshots" -ForegroundColor White

Write-Host "`nPress any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
