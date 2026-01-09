@echo off
REM Echos Polling App - Docker Startup Script for Windows

echo.
echo 🌊 Echos Polling App - Docker Setup
echo ====================================
echo.

REM Check if Docker is installed
docker --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker is not installed!
    echo Please install Docker Desktop from: https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)

docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker Compose is not installed!
    echo Please install Docker Desktop which includes Docker Compose
    pause
    exit /b 1
)

echo ✅ Docker is installed
echo ✅ Docker Compose is installed
echo.

REM Check if .env files exist, if not create them
if not exist "backend\.env" (
    echo 📝 Creating backend\.env from template...
    copy "backend\.env.example" "backend\.env" >nul
    echo ✅ Created backend\.env
) else (
    echo ✅ backend\.env already exists
)

if not exist "frontend\.env" (
    echo 📝 Creating frontend\.env from template...
    copy "frontend\.env.example" "frontend\.env" >nul
    echo ✅ Created frontend\.env
) else (
    echo ✅ frontend\.env already exists
)

echo.
echo 🐳 Starting Docker Compose...
echo This may take 5-10 minutes on first run (downloading and building images)
echo.
echo Press Ctrl+C to stop the application
echo.

REM Stop any existing containers
docker-compose down >nul 2>&1

REM Build and start services
docker-compose up --build

pause
