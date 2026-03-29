@echo off
echo ==============================================
echo Narmada Yield Phase II - Startup Script
echo ==============================================

cd backend

:: Check if the virtual environment exists, if not, create it and install dependencies
if not exist ".venv" (
    echo [1/3] Creating Python Virtual Environment in backend folder...
    python -m venv .venv
    echo [2/3] Installing required packages...
    call .venv\Scripts\activate.bat
    pip install -r requirements.txt
) else (
    echo [1/3] Virtual Environment found.
)

echo [3/3] Starting servers...

:: Start the Flask backend API in a new window
echo Starting Backend on port 5005...
start "Narmada Yield Backend" cmd /k "call .venv\Scripts\activate.bat && python app.py"

:: Go back to root, then to frontend
cd ..\frontend

:: Start the Frontend local server in a new window
echo Starting Frontend on port 8085...
start "Narmada Yield Frontend" cmd /k "python -m http.server 8085"

echo.
echo ==============================================
echo Success! Both servers should now be starting.
echo Please open your browser and navigate to:
echo http://localhost:8085
echo ==============================================
pause
