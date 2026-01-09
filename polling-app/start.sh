#!/bin/bash

# Echos Polling App - Docker Startup Script
# This script sets up and starts the application using Docker

echo "🌊 Echos Polling App - Docker Setup"
echo "===================================="
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed!"
    echo "Please install Docker Desktop from: https://www.docker.com/products/docker-desktop"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed!"
    echo "Please install Docker Compose from: https://docs.docker.com/compose/install/"
    exit 1
fi

echo "✅ Docker is installed"
echo "✅ Docker Compose is installed"
echo ""

# Check if .env files exist, if not create them
if [ ! -f "backend/.env" ]; then
    echo "📝 Creating backend/.env from template..."
    cp backend/.env.example backend/.env
    echo "✅ Created backend/.env"
else
    echo "✅ backend/.env already exists"
fi

if [ ! -f "frontend/.env" ]; then
    echo "📝 Creating frontend/.env from template..."
    cp frontend/.env.example frontend/.env
    echo "✅ Created frontend/.env"
else
    echo "✅ frontend/.env already exists"
fi

echo ""
echo "🐳 Starting Docker Compose..."
echo "This may take 5-10 minutes on first run (downloading and building images)"
echo ""

# Stop any existing containers
docker-compose down 2>/dev/null

# Build and start services
docker-compose up --build

# Note: Use Ctrl+C to stop the application
