@echo off

REM Check if we're in the right directory
if not exist "scripts" (
    echo Error: scripts folder not found!
    echo Please run this script from the project root directory.
    echo Expected structure: project-root\quick-start.bat
    pause
    exit /b 1
)

echo ==================================
echo Order Management System Launcher
echo ==================================
echo.
echo Choose an option:
echo 1. Setup project (first time)
echo 2. Start development servers
echo 3. Setup database only
echo 4. Exit
echo.
set /p choice="Enter your choice (1-5): "

if "%choice%"=="1" (
    echo Starting setup...
    cd scripts
    call setup.bat
    cd ..
) else if "%choice%"=="2" (
    echo Starting development servers...
    cd scripts
    call start-dev.bat
    cd ..
) else if "%choice%"=="3" (
    echo Setting up database...
    cd scripts
    call database-setup.bat
    cd ..
) else if "%choice%"=="4" (
    echo Goodbye!
    exit /b 0
) else (
    echo Invalid choice. Please try again.
    pause
    goto :eof
)

echo.
echo Press any key to exit...
pause >nul
