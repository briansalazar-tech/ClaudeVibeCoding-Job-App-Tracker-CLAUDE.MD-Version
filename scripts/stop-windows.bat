@echo off
echo Stopping Job Application Tracker...

:: Kill process on port 5173 (Vite dev server)
echo   Stopping Vite dev server (port 5173)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173 " 2^>nul') do (
    taskkill /F /PID %%a >nul 2>&1
)

:: Kill process on port 3001 (API server)
echo   Stopping API server (port 3001)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3001 " 2^>nul') do (
    taskkill /F /PID %%a >nul 2>&1
)

echo Done.
