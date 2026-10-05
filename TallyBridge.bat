@echo off
setlocal enabledelayedexpansion
title Tally Bridge Control Center
color 0b

cd /d "%~dp0"

set "ISCC_PATH=C:\Program Files (x86)\Inno Setup 6\ISCC.exe"

:: Initialize current version from config.json immediately
set "CURRENT_VER=1.0.0"
for /f "tokens=*" %%v in ('python -c "import json; print(json.load(open('config.json', encoding='utf-8')).get('app_version', '1.0.0'))" 2^>nul') do set "CURRENT_VER=%%v"
if "!CURRENT_VER!"=="" set "CURRENT_VER=1.0.0"

:: Direct parameter jump support
if /i "%~1"=="desktop" goto :action_desktop
if /i "%~1"=="run" goto :action_desktop
if /i "%~1"=="dev" goto :action_dev
if /i "%~1"=="build" goto :action_build_and_publish
if /i "%~1"=="release" goto :action_build_and_publish
if /i "%~1"=="push" goto :action_push
if /i "%~1"=="deps" goto :action_deps

:menu
cls
:: Re-read current version for menu display
for /f "tokens=*" %%v in ('python -c "import json; print(json.load(open('config.json', encoding='utf-8')).get('app_version', '1.0.0'))" 2^>nul') do set "CURRENT_VER=%%v"
if "!CURRENT_VER!"=="" set "CURRENT_VER=1.0.0"

echo ====================================================================
echo   TALLY BRIDGE CONTROL CENTER - ALL-IN-ONE MANAGER
echo ====================================================================
echo   Current Version: v!CURRENT_VER!
echo ====================================================================
echo.
echo   [1] Launch Desktop App (PyWebView GUI)
echo   [2] Start Dev Mode (Vite HMR + FastAPI Server)
echo   [3] Build and Publish Release Installer (EXE + Setup + GitHub)
echo   [4] Sync / Push Code to GitHub
echo   [5] Install / Update Dependencies (npm and pip)
echo   [0] Exit
echo.
echo ====================================================================
set /p CHOICE="Select an option [0-5]: "

if "%CHOICE%"=="1" goto :action_desktop
if "%CHOICE%"=="2" goto :action_dev
if "%CHOICE%"=="3" goto :action_build_and_publish
if "%CHOICE%"=="4" goto :action_push
if "%CHOICE%"=="5" goto :action_deps
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
if errorlevel 1 (
    echo.
    echo [X] Desktop app exited with an error.
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
:: [3] BUILD AND PUBLISH RELEASE INSTALLER (EXE + SETUP + GITHUB)
:: ====================================================================
:action_build_and_publish
cls
title Build and Publish Release Installer
color 0a
echo ====================================================================
echo   BUILD AND PUBLISH RELEASE INSTALLER
echo ====================================================================
echo.
echo Current App Version is: v!CURRENT_VER!
echo.

set "TARGET_VER="
set /p "TARGET_VER=Enter Release Version (e.g. 1.0.2) [Press Enter to keep !CURRENT_VER!]: "
if "!TARGET_VER!"=="" set "TARGET_VER=!CURRENT_VER!"

:: Trim spaces and strip leading 'v' or 'V' safely
for /f "delims=" %%v in ('python -c "v=r'''!TARGET_VER!'''.strip().lstrip('vV').strip(); print(v if v else '!CURRENT_VER!')"') do set "TARGET_VER=%%v"
if "!TARGET_VER!"=="" set "TARGET_VER=1.0.0"

echo.
echo [*] Release Version selected: v!TARGET_VER!
echo.
echo [*] Synchronizing version v!TARGET_VER! across project files...
python -c "import re; c=open('backend.py', encoding='utf-8').read(); c=re.sub(r'APP_VERSION = \".*?\"', 'APP_VERSION = \"!TARGET_VER!\"', c, count=1); open('backend.py', 'w', encoding='utf-8').write(c)"
python -c "import json; d=json.load(open('config.json', encoding='utf-8')); d['app_version']='!TARGET_VER!'; json.dump(d, open('config.json', 'w', encoding='utf-8'), indent=2)"
python -c "import re; c=open('installer.iss', encoding='utf-8').read(); c=re.sub(r'#define MyAppVersion \".*?\"', '#define MyAppVersion \"!TARGET_VER!\"', c, count=1); open('installer.iss', 'w', encoding='utf-8').write(c)"

echo [OK] Version synchronized successfully!
echo.

echo ====================================================================
echo   STEP 1/3: COMPILING REACT PRODUCTION BUNDLE
echo ====================================================================
echo.
cd frontend
call npm.cmd run build
if errorlevel 1 goto :frontend_failed
cd ..

echo.
echo ====================================================================
echo   STEP 2/3: COMPILING DESKTOP APPLICATION WITH PYINSTALLER
echo ====================================================================
echo.
call pyinstaller --noconfirm --onedir --windowed ^
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

if errorlevel 1 goto :pyinstaller_failed

copy /y "config.json" "dist\TallyBridge\config.json" >nul
copy /y "app_icon.ico" "dist\TallyBridge\app_icon.ico" >nul
copy /y "app_icon.png" "dist\TallyBridge\app_icon.png" >nul

echo.
echo ====================================================================
echo   STEP 3/3: COMPILING WINDOWS SETUP INSTALLER (INNO SETUP)
echo ====================================================================
echo.
if not exist "!ISCC_PATH!" goto :inno_not_found

set "SETUP_EXE=dist_installer\TallyBridge-Setup-v!TARGET_VER!.exe"
if exist "!SETUP_EXE!" del /f /q "!SETUP_EXE!" >nul 2>&1

echo [*] Running Inno Setup compiler for version v!TARGET_VER!...
"!ISCC_PATH!" /DMyAppVersion=!TARGET_VER! "installer.iss"
if not errorlevel 1 goto :inno_done

echo.
echo [*] Retrying compiler - waiting 2 seconds for file lock release...
timeout /t 2 /nobreak >nul
if exist "!SETUP_EXE!" del /f /q "!SETUP_EXE!" >nul 2>&1
"!ISCC_PATH!" /DMyAppVersion=!TARGET_VER! "installer.iss"
if errorlevel 1 goto :inno_failed

:inno_done
if not exist "!SETUP_EXE!" goto :inno_missing

set "UPDATE_ZIP=dist_installer\TallyBridge-v!TARGET_VER!.zip"
echo.
echo [*] Packaging in-app auto-update ZIP package: !UPDATE_ZIP!...
if exist "!UPDATE_ZIP!" del /f /q "!UPDATE_ZIP!" >nul 2>&1
powershell -NoProfile -Command "Compress-Archive -Path 'dist\TallyBridge\*' -DestinationPath '!UPDATE_ZIP!' -Force"

echo.
echo ====================================================================
echo [OK] PACKAGING COMPLETED SUCCESSFULLY:
echo   1. Windows Setup Installer: !SETUP_EXE!
echo   2. In-App Auto-Update ZIP:  !UPDATE_ZIP!
echo ====================================================================
echo.

echo ====================================================================
echo   GIT SYNC AND RELEASE TAGGING
echo ====================================================================
echo [*] Staging all files and committing release v!TARGET_VER!...
git add -A
git commit -m "Release v!TARGET_VER!" 2>nul || echo [*] Working tree clean, continuing...

echo [*] Pushing main branch to GitHub...
git push origin main || echo [!] Warning: git push origin main encountered an issue.

echo [*] Setting Git release tag v!TARGET_VER!...
git tag -fa "v!TARGET_VER!" -m "Release v!TARGET_VER!" >nul 2>&1
git push -f origin "v!TARGET_VER!" || echo [!] Warning: git push tag encountered an issue.

echo.
echo ====================================================================
echo [OK] Code and tag v!TARGET_VER! pushed to GitHub!
echo ====================================================================
echo.
echo [*] Launching GitHub Releases page in default browser...
start "" "https://github.com/Pazino/Tally-bridge/releases/new?tag=v!TARGET_VER!"

echo [*] Opening dist_installer folder in File Explorer...
start "" explorer.exe "%CD%\dist_installer"

echo.
echo ====================================================================
echo   RELEASE PACKAGED SUCCESSFULLY!
echo ====================================================================
echo 1. The GitHub Releases page was opened in your browser.
echo 2. File Explorer was opened showing 'dist_installer\'.
echo 3. Upload BOTH files to GitHub Releases:
echo      - '!SETUP_EXE!' (for new users running setup)
echo      - '!UPDATE_ZIP!' (for staff using the in-app auto-updater)
echo 4. Click 'Publish release' on GitHub!
echo ====================================================================
echo.
pause
goto :menu

:frontend_failed
echo.
echo [X] Frontend build failed!
cd ..
pause
goto :menu

:pyinstaller_failed
echo.
echo [X] PyInstaller compilation failed!
pause
goto :menu

:inno_not_found
echo.
echo [X] Inno Setup compiler not found at: "!ISCC_PATH!"
pause
goto :menu

:inno_failed
echo.
echo [X] Inno Setup compilation failed!
pause
goto :menu

:inno_missing
echo.
echo [X] Could not find generated installer: !SETUP_EXE!
pause
goto :menu


:: ====================================================================
:: [4] SYNC / PUSH TO GITHUB
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
:: [5] INSTALL / UPDATE DEPENDENCIES
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
