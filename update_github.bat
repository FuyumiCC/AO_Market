@echo off
title GitHub Updater
echo ==========================================
echo      UPDATING GITHUB REPOSITORY
echo ==========================================
echo.

:: 1. Navigate to the current folder (just to be safe)
cd /d "%~dp0"

:: 2. Stage all changes
echo [1/3] Adding files...
git add .

:: 3. Ask for a commit message
set /p commitMsg="Enter commit message (Press Enter for 'Update'): "
if "%commitMsg%"=="" set commitMsg=Update

:: 4. Commit changes
echo [2/3] Committing changes...
git commit -m "%commitMsg%"

:: 5. Push to GitHub
echo [3/3] Pushing to cloud...
git push

echo.
echo ==========================================
echo      SUCCESS! WEBSITE UPDATING...
echo ==========================================
echo.
pause