@echo off
title 🌉 Tally Bridge Modern Desktop App
color 0a
echo ====================================================================
echo   LAUNCHING TALLY BRIDGE MODERN DESKTOP APP (PYWEBVIEW)
echo ====================================================================
echo.

cd /d "%~dp0"
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :19876') do taskkill /f /pid %%a >nul 2>&1
python desktop_app.py

