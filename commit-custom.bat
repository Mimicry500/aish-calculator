@echo off
echo AISH Calculator GitHub Commit Tool
echo ================================
echo.

:: Prompt for commit message
set /p COMMIT_MSG="Enter commit message: "

:: Check if commit message is empty
if "%COMMIT_MSG%"=="" (
    echo Commit message cannot be empty!
    pause
    exit /b 1
)

:: Add all changes
git add .

:: Commit with custom message
git commit -m "%COMMIT_MSG%"

:: Push to GitHub
git push

echo.
echo Changes committed and pushed to GitHub successfully!
echo Message: %COMMIT_MSG%
echo.

pause 