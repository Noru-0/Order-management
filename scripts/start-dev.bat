@echo off
echo =====================================
echo Starting Order Management System...
echo =====================================

echo.
echo Starting Backend (Order-management) on port 3001...
start "Backend Server" cmd /k "cd ..\Order-management && npm run dev"

echo.
echo Waiting for backend to start...
timeout /t 3 /nobreak >nul

echo Starting Frontend on port 3000...
start "Frontend Server" cmd /k "cd ..\frontend && npm run dev"

echo.
echo ========================================
echo Both services are starting...
echo ========================================
echo Backend:  http://localhost:3001
echo Frontend: http://localhost:3000
echo.
echo Press Ctrl+C in each terminal to stop the services
echo Press any key to exit this script...
pause >nul
