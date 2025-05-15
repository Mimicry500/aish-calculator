@echo off
setlocal EnableDelayedExpansion

echo AISH Calculator File Watcher and Auto-Commit Tool
echo ================================================
echo.
echo This script will watch for changes to key files and automatically commit them to GitHub.
echo Press Ctrl+C to stop watching.
echo.

:watch_loop
echo Checking for changes... %time%

:: Check if there are changes to commit
git status --porcelain > temp_status.txt
findstr /r /c:"[^ ]" temp_status.txt > nul
if %errorlevel% equ 0 (
    echo Changes detected! Committing...
    
    :: Get current date and time for commit message
    for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /format:list') do set datetime=%%I
    set YEAR=!datetime:~0,4!
    set MONTH=!datetime:~4,2!
    set DAY=!datetime:~6,2!
    set HOUR=!datetime:~8,2!
    set MINUTE=!datetime:~10,2!
    
    :: Format date for commit message
    set TIMESTAMP=!YEAR!-!MONTH!-!DAY! !HOUR!:!MINUTE!
    
    :: Reset changed files variable
    set CHANGED_FILES=
    
    :: Get list of changed files (limited to first 3)
    set COUNT=0
    for /f "tokens=2" %%a in (temp_status.txt) do (
        if !COUNT! lss 3 (
            set CHANGED_FILES=!CHANGED_FILES! %%a
            set /a COUNT+=1
        ) else if !COUNT!==3 (
            set CHANGED_FILES=!CHANGED_FILES! and more...
            set /a COUNT+=1
        )
    )
    
    :: Add all changes
    git add .
    
    :: Commit with timestamp and changed files info
    git commit -m "Auto-commit: AISH calculator updates !TIMESTAMP! - Changed:!CHANGED_FILES!"
    
    :: Push to GitHub
    git push
    
    echo Changes committed and pushed successfully!
) else (
    echo No changes detected.
)

:: Clean up
del temp_status.txt

:: Wait for 30 seconds before checking again
echo Waiting 30 seconds before next check...
timeout /t 30 /nobreak > nul

goto watch_loop 