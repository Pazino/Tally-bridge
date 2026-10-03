@echo off
title 🌉 Tally Bridge Modern - Dev Mode
color 0b
echo ====================================================================
echo   STARTING TALLY BRIDGE (REACT + FASTAPI DEV SERVER)
echo ====================================================================
echo.

cd /d "%~dp0"

start "Tally Bridge Backend" cmd /k "python backend.py"
cd frontend
npm.cmd run dev

