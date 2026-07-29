@echo off
echo Starting Job Application Tracker...

:: Change to project root (parent of scripts folder)
cd /d "%~dp0\.."

echo Running database migration...
call npm run db:migrate
if %ERRORLEVEL% neq 0 (
    echo Migration failed. Aborting.
    exit /b 1
)

echo.
echo   API  -^> http://localhost:3001
echo   App  -^> http://localhost:5173
echo.
call npm run dev
