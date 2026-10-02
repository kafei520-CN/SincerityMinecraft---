@echo off
cd /d "%~dp0"
echo 正在清理损坏的 node_modules...
rmdir /s /q node_modules 2>nul
del package-lock.json 2>nul

echo.
echo 正在安装依赖（需要 1-2 分钟）...
call npm install --legacy-peer-deps

echo.
echo 安装完成！现在可以运行：npm run dev
pause
