@echo off
echo Committing changes to GitHub...

:: Get current date and time for commit message
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /format:list') do set datetime=%%I
set YEAR=%datetime:~0,4%
set MONTH=%datetime:~4,2%
set DAY=%datetime:~6,2%
set HOUR=%datetime:~8,2%
set MINUTE=%datetime:~10,2%
set SECOND=%datetime:~12,2%

:: Format date for commit message
set TIMESTAMP=%YEAR%-%MONTH%-%DAY% %HOUR%:%MINUTE%:%SECOND%

:: Add all changes
git add .

:: Commit with timestamp
git commit -m "Auto-commit: AISH calculator updates %TIMESTAMP%"

:: Push to GitHub
git push

echo.
echo Changes committed and pushed to GitHub successfully!
echo Timestamp: %TIMESTAMP%
echo.

pause 