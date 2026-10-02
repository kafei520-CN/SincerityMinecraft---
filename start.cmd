@echo off
cd /d "%~dp0"
set CI=
title SincerityMinecraft
echo Starting SincerityMinecraft...
echo Leave this window open.

set "RUN="
call corepack pnpm --version >nul 2>&1
if errorlevel 1 goto try_pnpm
set "RUN=corepack pnpm"
goto ready

:try_pnpm
call pnpm --version >nul 2>&1
if errorlevel 1 goto no_pnpm
set "RUN=pnpm"
goto ready

:no_pnpm
echo pnpm was not found. Install Node.js, then run this script again.
pause
exit /b 1

:ready
where node >nul 2>&1
if errorlevel 1 goto no_node
set "NODE=node"
goto have_node

:no_node
if exist "D:\Program Files\nodejs\node.exe" set "NODE=D:\Program Files\nodejs\node.exe"
if not defined NODE goto missing_node
goto have_node

:missing_node
echo node was not found.
pause
exit /b 1

:have_node
if exist "node_modules\astro\bin\astro.mjs" goto serve
echo Installing dependencies...
call %RUN% install
if errorlevel 1 goto install_fail

:serve
echo Waiting for http://127.0.0.1:4321/
start "open-site" /min "%NODE%" "%~dp0wait-open.mjs"
"%NODE%" "%~dp0node_modules\astro\bin\astro.mjs" dev --host 127.0.0.1 --port 4321
echo Server stopped.
pause
exit /b 0

:install_fail
echo Dependency install failed.
pause
exit /b 1
