@echo off
title Albion Market Scanner
echo Starting Albion Market Scanner Application...
echo ------------------------------------------

:: Ensure we are running in the correct folder
cd /d "%~dp0"

:: Launch Electron App
npm start

:: Keep window open if it crashes so you can see errors
pause