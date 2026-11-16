@echo off
title UNMUTE app
cd /d "%~dp0"
echo.
echo  ==== UNMUTE: getting ready ====
echo.
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed yet. Installing it now (free, one time only^)...
  winget install -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
  set "PATH=%PATH%;C:\Program Files\nodejs"
)
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo Node.js finished installing. Please CLOSE this window and double-click START-UNMUTE again.
  pause
  exit /b
)
if not exist node_modules (
  echo Downloading the app's building blocks. This takes 2-5 minutes the first time...
  call npm install --no-audit --no-fund
)
call npx expo whoami >nul 2>nul
if errorlevel 1 (
  echo.
  echo  ==== Sign in to your free Expo account ====
  echo  iPhones need this. Use the SAME account you sign in with in the Expo Go app.
  echo  No account yet? Create one free at https://expo.dev/signup first.
  echo.
  call npx expo login
)
echo.
echo Starting UNMUTE. When the QR code appears, scan it with Expo Go on your phone.
echo Keep this window open while you use the app. Close it to stop.
echo.
call npx expo start
pause
