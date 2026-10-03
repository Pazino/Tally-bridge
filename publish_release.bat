@echo off
setlocal enabledelayedexpansion
title 🚀 Tally Bridge - GitHub Release Publisher
color 0b
echo ====================================================================
echo   TALLY BRIDGE • GITHUB RELEASES AUTOMATED PUBLISHER
echo ====================================================================
echo.

set /p NEW_VERSION="Enter new release version tag (e.g. 1.0.1): "
if "%NEW_VERSION%"=="" (
    echo [X] Version cannot be empty!
    pause
    exit /b 1
)

:: Strip leading 'v' if user typed it
if "%NEW_VERSION:~0,1%"=="v" set NEW_VERSION=%NEW_VERSION:~1%

echo.
echo [*] Bumping version to v%NEW_VERSION% in backend.py and config.json...
python -c "import re; c=open('backend.py','r',encoding='utf-8').read(); c=re.sub(r'APP_VERSION = \".*?\"', f'APP_VERSION = \"'%NEW_VERSION%'\"', c, count=1); open('backend.py','w',encoding='utf-8').write(c)"
python -c "import json; d=json.load(open('config.json', 'r', encoding='utf-8')); d['app_version']='%NEW_VERSION%'; json.dump(d, open('config.json', 'w', encoding='utf-8'), indent=2)"

echo [✓] Version successfully synchronized!
echo.
echo [*] Building and packaging release package v%NEW_VERSION%...
echo.

cd /d "%~dp0"
call build_exe.bat

if %errorlevel% neq 0 (
    echo [X] Build process failed!
    pause
    exit /b %errorlevel%
)

echo.
echo ====================================================================
echo   CREATING RELEASE ZIP ARCHIVE FOR GITHUB ASSET
echo ====================================================================
echo.

set ZIP_NAME=TallyBridge-v%NEW_VERSION%.zip

powershell -NoProfile -ExecutionPolicy Bypass -Command "Compress-Archive -Path 'dist\TallyBridge\*' -DestinationPath '%ZIP_NAME%' -Force"

echo.
echo [✓] Release asset created: %ZIP_NAME%
echo.
echo ====================================================================
echo   NEXT STEPS TO PUBLISH TO GITHUB RELEASES:
echo ====================================================================
echo.
echo 1. Commit and push any code updates:
echo    git add -A
echo    git commit -m "Prepare release v%NEW_VERSION%"
echo    git push origin main
echo.
echo 2. Create and push the Git tag:
echo    git tag -a v%NEW_VERSION% -m "Release v%NEW_VERSION%"
echo    git push origin v%NEW_VERSION%
echo.
echo 3. Open GitHub Releases and upload '%ZIP_NAME%':
echo    https://github.com/Pazino/Tally-Bridge/releases/new
echo    - Tag: v%NEW_VERSION%
echo    - Release Title: Tally Bridge v%NEW_VERSION%
echo    - Attach: %ZIP_NAME%
echo.
echo Once uploaded, all staff running Tally Bridge desktop will
echo automatically detect the update, show the upgrade banner, and
echo seamlessly install the update with 1 click!
echo.
pause
