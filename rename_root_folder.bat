@echo off
echo ========================================================
echo   WisdomFlow AI - Workspace Directory Renamer
echo ========================================================
echo.
echo Please ensure you have closed your IDE or editor workspace
echo before continuing, so Windows file locks are released.
echo.
pause

cd ..
if exist "LearnFlow AI" (
    echo Renaming "LearnFlow AI" to "WisdomFlow AI"...
    rename "LearnFlow AI" "WisdomFlow AI"
    if errorlevel 1 (
        echo.
        echo [ERROR] Could not rename directory. Please close any programs
        echo (VS Code, Antigravity, terminals) holding files open in this folder.
    ) else (
        echo.
        echo [SUCCESS] Successfully renamed folder to "WisdomFlow AI"!
        echo You can now reopen your workspace in:
        echo   %CD%\WisdomFlow AI
    )
) else (
    echo "LearnFlow AI" folder not found in parent directory.
    if exist "WisdomFlow AI" (
        echo "WisdomFlow AI" folder already exists!
    )
)
echo.
pause
