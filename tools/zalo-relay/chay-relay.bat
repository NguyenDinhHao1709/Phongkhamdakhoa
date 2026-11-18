@echo off
REM Bấm đúp để chạy relay Zalo + ngrok (2 cửa sổ). Đóng 2 cửa sổ đó để tắt.
chcp 65001 >nul
cd /d "%~dp0"
if not exist ".env" (
  echo Chua co file .env - hay copy .env.example thanh .env va dien RELAY_KEY, ZALO_APP_SECRET.
  pause
  exit /b 1
)
start "Zalo relay" cmd /k node relay.js
timeout /t 2 /nobreak >nul
start "ngrok" cmd /k ngrok http --url=breath-dragonfly-kerchief.ngrok-free.dev 8788
echo Da mo relay va ngrok. Kiem tra: https://breath-dragonfly-kerchief.ngrok-free.dev/health
timeout /t 5 >nul
