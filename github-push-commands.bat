@echo off
REM ESP32 Pump Web - GitHub Push Commands
REM Replace YOUR_REPO_URL with your actual GitHub repository URL

set REPO_URL=YOUR_REPO_URL

echo Adding remote origin...
git remote add origin %REPO_URL%

echo Pushing to GitHub...
git push -u origin master

echo.
echo Done! Your code is now on GitHub.
pause
