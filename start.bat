@echo off
title Albion Market Scanner
echo Starting Server...
echo Open your browser to: http://localhost:3000
echo ------------------------------------------

:: Ensure we are running in the correct folder
cd /d "%~dp0"

:: Run the server
node server.js

:: Keep window open if it crashes so you can see errors
pause