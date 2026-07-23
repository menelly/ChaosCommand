@echo off
echo 🧃⚡ CHAOS COMMAND CENTER STARTUP ⚡🧃
echo.
echo Starting Flask backend...
start "Flask Backend" cmd /k "cd backend && python app.py"

echo Waiting for backend to start...
timeout /t 3 /nobreak >nul

echo Starting React frontend...
start "React Frontend" cmd /k "npm run dev"

echo.
echo 🎯 READY TO TEST! 🎯
echo.
echo Flask Backend: http://localhost:5000
echo React Frontend: http://localhost:3000
echo.
echo Press any key to close this window...
pause >nul
