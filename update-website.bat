@echo off
echo ===== AISH Calculator Website Updater =====
echo.

echo Step 1: Checking for changes...
git status

echo.
echo Step 2: Adding all changes to Git...
git add .

echo.
set /p commit_msg="Step 3: Enter a brief description of your changes: "
git commit -m "%commit_msg%"

echo.
echo Step 4: Pushing changes to GitHub...
git push

echo.
echo ===== Update Complete =====
echo Your changes have been uploaded to GitHub.
echo The website will update in 1-3 minutes.
echo Visit: https://Mimicry500.github.io/aish-calculator/
echo.
pause 