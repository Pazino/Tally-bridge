@echo off
title 🏢 Building Tally Bridge Modern Desktop EXE
color 0a
echo ====================================================================
echo   STEP 1: BUILDING REACT PRODUCTION FRONTEND
echo ====================================================================
echo.

cd /d "%~dp0"
cd frontend
call npm.cmd run build
if %errorlevel% neq 0 (
    echo [X] Frontend build failed!
    pause
    exit /b %errorlevel%
)

cd /d "%~dp0"

echo.
echo ====================================================================
echo   STEP 2: COMPILING STANDALONE DESKTOP EXECUTABLE WITH PYINSTALLER
echo ====================================================================
echo.

pyinstaller --noconfirm --onedir --windowed ^
  --icon "app_icon.ico" ^
  --name "TallyBridge" ^
  --add-data "frontend/dist;frontend/dist" ^
  --add-data "config.json;." ^
  --add-data "app_icon.ico;." ^
  --add-data "app_icon.png;." ^
  --hidden-import "psycopg2" ^
  --hidden-import "openpyxl" ^
  --hidden-import "webview" ^
  --hidden-import "uvicorn" ^
  --hidden-import "fastapi" ^
  --hidden-import "pythonnet" ^
  --hidden-import "clr_loader" ^
  --hidden-import "PIL" ^
  desktop_app.py
echo.
echo ====================================================================
echo   STEP 3: CONFIGURING ASSETS IN ROOT DISTRIBUTION FOLDER
echo ====================================================================
copy /y "config.json" "dist\TallyBridge\config.json" >nul
copy /y "app_icon.ico" "dist\TallyBridge\app_icon.ico" >nul
copy /y "app_icon.png" "dist\TallyBridge\app_icon.png" >nul

echo.
echo ====================================================================
echo [✓] Build completed! Standalone EXE is in: dist\TallyBridge\TallyBridge.exe
echo ====================================================================
pause
