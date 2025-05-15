@echo off
echo Committing calendar fix changes to GitHub...

:: Add all changes
git add .

:: Commit with specific message about calendar fixes
git commit -m "Fix calendar display issues with comprehensive updates to calendar rendering and styling"

:: Push to GitHub
git push

echo.
echo Calendar fixes committed and pushed to GitHub successfully!
echo.

pause 