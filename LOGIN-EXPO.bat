@echo off
title Sign in to Expo
cd /d "%~dp0"
echo.
echo  ==== Sign in to Expo on this laptop ====
echo  Use the same account as the Expo Go app on your iPhone: whitefang23
echo  Type the username, press Enter, then the password (it stays invisible as you type), press Enter.
echo.
call npx expo login
echo.
call npx expo whoami
echo.
echo If your username shows above, close this window and double-click START-UNMUTE.
pause
