@echo off
echo =================================
echo Order Management System Setup
echo =================================

echo.
echo Installing dependencies...
echo.

REM Install root dependencies
echo Installing root dependencies...
cd ..
call npm install
if errorlevel 1 (
    echo Failed to install root dependencies
    pause
    exit /b 1
)

REM Install backend dependencies
echo Installing backend dependencies...
cd Order-management
call npm install
if errorlevel 1 (
    echo Failed to install backend dependencies
    pause
    exit /b 1
)

REM Install frontend dependencies
echo Installing frontend dependencies...
cd ..\frontend
call npm install
if errorlevel 1 (
    echo Failed to install frontend dependencies
    pause
    exit /b 1
)

cd ..\scripts

echo.
echo Dependencies installed successfully!
echo.

REM Ask about database setup
set /p setupdb="Setup PostgreSQL database? (y/N): "
if /i "%setupdb%"=="y" (
    echo Setting up database...
    call database-setup.bat
    if errorlevel 1 (
        echo Database setup failed, will use in-memory store
    ) else (
        echo Database setup completed
    )
) else (
    echo Skipping database setup - will use in-memory store
)

echo.
echo ========================================
echo Setup complete!
echo ========================================
echo.
echo  All dependencies installed successfully
echo  Project ready for development
echo.
echo To start the system:
echo   scripts\start-dev.bat      ^(Start in separate terminals^)
echo   npm run dev                ^(Start both frontend ^& backend^)
echo.
echo Access URLs:
echo   Frontend: http://localhost:3000
echo   Backend:  http://localhost:3001
echo.
echo  Use quick-start.bat from project root for easier access
echo.
pause
