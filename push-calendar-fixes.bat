@echo off
echo Pushing AISH Calendar Fixes to GitHub...

:: Add all files
git add .

:: Commit with specific message about the calendar fixes
git commit -m "Fix calendar display issues with comprehensive updates to calendar rendering and styling"

:: Push to GitHub
git push

echo.
echo Calendar fixes pushed to GitHub successfully!
echo.

pause 