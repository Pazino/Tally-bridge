@echo off
setlocal enabledelayedexpansion
title Tally Bridge Control Center
color 0b

cd /d "%~dp0"

:: Set Inno Setup compiler path
set "ISCC_PATH=C:\Program Files (x86)\Inno Setup 6\ISCC.exe"

:: If an argument was passed, jump straight to the action
if /i "%~1"=="desktop" goto :action_desktop
if /i "%~1"=="run" goto :action_desktop
if /i "%~1"=="dev" goto :action_dev
if /i "%~1"=="build" goto :action_build
if /i "%~1"=="installer" goto :action_installer
if /i "%~1"=="setup" goto :action_installer
if /i "%~1"=="release" goto :action_release
if /i "%~1"=="push" goto :action_push
if /i "%~1"=="deps" goto :action_deps

:menu
cls
echo ====================================================================
echo   TALLY BRIDGE CONTROL CENTER - ALL-IN-ONE MANAGER
echo ====================================================================
echo.
echo   [1] Launch Desktop App (PyWebView GUI)
echo   [2] Start Dev Mode (Vite HMR + FastAPI Server)
echo   [3] Build Desktop Files (PyInstaller)
echo   [4] Build Windows Setup Installer EXE (Inno Setup)
echo   [5] Package and Publish GitHub Release (Setup EXE + Tag Push)
echo   [6] Sync / Push to GitHub Repository
echo   [7] Install / Update Dependencies (npm and pip)
echo   [0] Exit
echo.
echo ====================================================================
set /p CHOICE="Select an option [0-7]: "

if "%CHOICE%"=="1" goto :action_desktop
if "%CHOICE%"=="2" goto :action_dev
if "%CHOICE%"=="3" goto :action_build
if "%CHOICE%"=="4" goto :action_installer
if "%CHOICE%"=="5" goto :action_release
if "%CHOICE%"=="6" goto :action_push
if "%CHOICE%"=="7" goto :action_deps
if "%CHOICE%"=="0" exit /b 0

echo.
echo [!] Invalid selection. Please choose a valid number.
timeout /t 2 >nul
goto :menu


:: ====================================================================
:: [1] LAUNCH DESKTOP APP
:: ====================================================================
:action_desktop
cls
title Tally Bridge Desktop App
color 0a
echo ====================================================================
echo   LAUNCHING TALLY BRIDGE MODERN DESKTOP APP
echo ====================================================================
echo.
echo [*] Checking and freeing port 19876...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :19876') do taskkill /f /pid %%a >nul 2>&1

echo [*] Starting PyWebView desktop application...
python desktop_app.py
if %errorlevel% neq 0 (
    echo.
    echo [X] Desktop app exited with error code %errorlevel%.
    pause
)
goto :menu


:: ====================================================================
:: [2] START DEV MODE
:: ====================================================================
:action_dev
cls
title Tally Bridge Dev Server
color 0b
echo ====================================================================
echo   STARTING TALLY BRIDGE DEV ENVIRONMENT (REACT + FASTAPI)
echo ====================================================================
echo.
echo [*] Launching FastAPI backend server in background window...
start "Tally Bridge Backend" cmd /k "python backend.py"

echo [*] Launching Vite development server with Hot-Module-Reload...
cd frontend
call npm.cmd run dev
cd ..
goto :menu


:: ====================================================================
:: [3] BUILD DESKTOP APPLICATION (PYINSTALLER)
:: ====================================================================
:action_build
cls
title Building Tally Bridge Desktop Application
color 0a
echo ====================================================================
echo   STEP 1: BUILDING REACT PRODUCTION BUNDLE
echo ====================================================================
echo.
cd frontend
call npm.cmd run build
if %errorlevel% neq 0 (
    echo [X] Frontend build failed!
    cd ..
    pause
    goto :menu
)
cd ..

echo.
echo ====================================================================
echo   STEP 2: COMPILING STANDALONE DESKTOP APPLICATION WITH PYINSTALLER
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

if %errorlevel% neq 0 (
    echo [X] PyInstaller compilation failed!
    pause
    goto :menu
)

echo.
echo ====================================================================
echo   STEP 3: CONFIGURING ASSETS IN ROOT DISTRIBUTION FOLDER
echo ====================================================================
copy /y "config.json" "dist\TallyBridge\config.json" >nul
copy /y "app_icon.ico" "dist\TallyBridge\app_icon.ico" >nul
copy /y "app_icon.png" "dist\TallyBridge\app_icon.png" >nul

echo.
echo ====================================================================
echo [OK] Build completed! Files are in: dist\TallyBridge\
echo ====================================================================
if "%~1"=="" pause
if "%~1"=="" goto :menu
exit /b 0


:: ====================================================================
:: [4] BUILD WINDOWS SETUP INSTALLER EXE (INNO SETUP)
:: ====================================================================
:action_installer
cls
title Building Windows Setup Installer EXE
color 0a
echo ====================================================================
echo   BUILDING STANDALONE WINDOWS SETUP INSTALLER (INNO SETUP)
echo ====================================================================
echo.

if not exist "dist\TallyBridge\TallyBridge.exe" (
    echo [*] Compiled application not found. Running build first...
    call :action_build "batch"
)

if not exist "!ISCC_PATH!" (
    echo [X] Inno Setup compiler not found at: "!ISCC_PATH!"
    echo Please install Inno Setup 6 to compile the installer.
    pause
    goto :menu
)

echo [*] Compiling Inno Setup script installer.iss...
"!ISCC_PATH!" "installer.iss"

if errorlevel 1 (
    echo.
    echo [X] Inno Setup compilation failed!
    pause
    goto :menu
)

echo.
echo ====================================================================
echo [OK] Standalone Windows Setup Installer created successfully!
echo Output file is located in: dist_installer\
echo ====================================================================
echo.
if /i "%~1"=="batch" exit /b 0
pause
goto :menu


:: ====================================================================
:: [5] PACKAGE AND PUBLISH GITHUB RELEASE
:: ====================================================================
:action_release
cls
title Tally Bridge Release Publisher
color 0b
echo ====================================================================
echo   TALLY BRIDGE - GITHUB RELEASE PUBLISHER AND PACKAGER
echo ====================================================================
echo.

set NEW_VERSION=%~2
if "%NEW_VERSION%"=="" (
    set /p NEW_VERSION="Enter release version tag (e.g. 1.0.1): "
)
if "%NEW_VERSION%"=="" (
    echo [X] Version cannot be empty!
    pause
    goto :menu
)

if "%NEW_VERSION:~0,1%"=="v" set NEW_VERSION=%NEW_VERSION:~1%

echo.
echo [*] Synchronizing version v%NEW_VERSION% across backend, config, and installer...
python -c "import re; c=open('backend.py','r',encoding='utf-8').read(); c=re.sub(r'APP_VERSION = \".*?\"', f'APP_VERSION = \"'%NEW_VERSION%'\"', c, count=1); open('backend.py','w',encoding='utf-8').write(c)"
python -c "import json; d=json.load(open('config.json', 'r', encoding='utf-8')); d['app_version']='%NEW_VERSION%'; json.dump(d, open('config.json', 'w', encoding='utf-8'), indent=2)"
python -c "import re; c=open('installer.iss','r',encoding='utf-8').read(); c=re.sub(r'#define MyAppVersion \".*?\"', f'#define MyAppVersion \"'%NEW_VERSION%'\"', c, count=1); open('installer.iss','w',encoding='utf-8').write(c)"

echo [OK] Version updated to v%NEW_VERSION%!
echo.

echo [*] Compiling production build and standalone setup installer...
call :action_build "batch"
call :action_installer "batch"

set SETUP_EXE=dist_installer\TallyBridge-Setup-v%NEW_VERSION%.exe

if not exist "%SETUP_EXE%" (
    echo [X] Could not find generated installer: %SETUP_EXE%
    pause
    goto :menu
)

echo.
echo ====================================================================
echo   AUTOMATED GIT SYNC AND RELEASE TAGGING
echo ====================================================================
echo.

echo [*] Staging and committing release v%NEW_VERSION%...
git add -A
git commit -m "Release v%NEW_VERSION%"

echo [*] Pushing changes to origin main...
git push origin main

echo [*] Creating and pushing Git tag v%NEW_VERSION%...
git tag -a v%NEW_VERSION% -m "Release v%NEW_VERSION%"
git push origin v%NEW_VERSION%

echo.
echo ====================================================================
echo [OK] Code and tag v%NEW_VERSION% pushed to GitHub!
echo ====================================================================
echo.
echo [*] Opening GitHub Releases page in your browser...
start https://github.com/Pazino/Tally-Bridge/releases/new?tag=v%NEW_VERSION%

echo [*] Opening Setup Installer in File Explorer...
explorer /select,"%SETUP_EXE%"

echo.
echo Final step: Just drag and drop '%SETUP_EXE%' into the GitHub Releases
echo page and click 'Publish release'!
echo.
pause
goto :menu


:: ====================================================================
:: [6] SYNC / PUSH TO GITHUB
:: ====================================================================
:action_push
cls
title Sync Tally Bridge with GitHub
color 0e
echo ====================================================================
echo   SYNC / PUSH TO GITHUB REPOSITORY
echo ====================================================================
echo.
set /p COMMIT_MSG="Enter commit message (Press Enter for default): "
if "%COMMIT_MSG%"=="" set COMMIT_MSG="Update Tally Bridge application"

echo.
echo [*] Staging all changes...
git add -A

echo [*] Committing changes...
git commit -m "%COMMIT_MSG%"

echo [*] Pushing to origin main...
git push origin main

echo.
echo ====================================================================
echo [OK] Git sync complete!
echo ====================================================================
pause
goto :menu


:: ====================================================================
:: [7] INSTALL / UPDATE DEPENDENCIES
:: ====================================================================
:action_deps
cls
title Install / Update Dependencies
color 0d
echo ====================================================================
echo   INSTALLING DEPENDENCIES (PYTHON AND NODE.JS)
echo ====================================================================
echo.
echo [*] Installing required Python libraries...
pip install pywebview uvicorn fastapi requests psycopg2-binary openpyxl pythonnet Pillow pyinstaller

echo.
echo [*] Installing Node.js frontend packages...
cd frontend
call npm.cmd install
cd ..

echo.
echo ====================================================================
echo [OK] All dependencies are verified and installed!
echo ====================================================================
pause
goto :menu
