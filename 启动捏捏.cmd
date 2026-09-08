@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Please install Node.js 22.12+ from https://nodejs.org/ and try again.
  pause
  exit /b 1
)
if not exist "node_modules\vite\bin\vite.js" (
  call npm install
  if errorlevel 1 (
    echo Dependency installation failed. Check your network and try again.
    pause
    exit /b 1
  )
)
echo Opening Crunchy Squish Lab. Keep this window open while playing.
call npm run dev -- --open
if errorlevel 1 pause
