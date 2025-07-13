@echo off
echo ==========================================
echo PostgreSQL Setup for Order Management
echo ==========================================

REM Check if PostgreSQL is installed
psql --version >nul 2>&1
if errorlevel 1 (
    echo PostgreSQL not found. Please install PostgreSQL first.
    echo Download from: https://www.postgresql.org/download/
    echo Or use chocolatey: choco install postgresql
    pause
    exit /b 1
)

echo PostgreSQL found
echo.
echo Database Setup Instructions:
echo 1. Make sure PostgreSQL service is running
echo 2. Default credentials will be used (postgres/password)
echo 3. Database 'order_management' will be created
echo.

set /p continue="Press Enter to continue or 'q' to quit: "
if /i "%continue%"=="q" exit /b 0

echo.
echo Creating database...
psql -U postgres -h localhost -c "CREATE DATABASE order_management;" 2>nul
if errorlevel 1 (
    echo Database might already exist or credentials need adjustment
) else (
    echo Database 'order_management' created successfully
)

echo.
echo Creating tables and functions...
psql -U postgres -h localhost -d order_management -f "..\Order-management\database\schema.sql"
if errorlevel 1 (
    echo Failed to create schema. Please check:
    echo - PostgreSQL is running
    echo - Credentials are correct (postgres/password)
    echo - Database permissions are set
    pause
    exit /b 1
)

echo Schema created successfully

echo.
echo Testing database connection...
psql -U postgres -h localhost -d order_management -c "SELECT COUNT(*) FROM events;" >nul 2>&1
if errorlevel 1 (
    echo Database connection test failed
) else (
    echo Database connection successful
    echo Events table ready with sample data
)

echo.
echo ========================================
echo PostgreSQL setup completed!
echo ========================================
echo.
echo Next steps:
echo 1. Start the backend with: npm run dev
echo 2. Backend will connect to PostgreSQL automatically
echo 3. Check logs for database connection status
echo.
echo Database Info:
echo Database: order_management
echo Host: localhost:5432
echo User: postgres
echo Tables: events, snapshots
echo.
pause
