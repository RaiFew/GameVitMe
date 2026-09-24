@echo off
echo ===================================================
echo Starting Party Game Platform
echo ===================================================
cd /d "%~dp0"

echo Ensuring Docker containers (PostgreSQL + Redis) are up...
docker compose up -d

echo.
echo Starting Web + Server (Turbo Dev)...
pnpm dev
