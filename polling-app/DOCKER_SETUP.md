# 🐳 Docker Setup Guide for Echos Polling App

This guide will help you run the Echos Polling App using Docker.

## Prerequisites

Before you begin, ensure you have installed:
- **Docker Desktop** (includes Docker and Docker Compose)
  - [Download for Mac](https://docs.docker.com/desktop/install/mac-install/)
  - [Download for Windows](https://docs.docker.com/desktop/install/windows-install/)
  - [Download for Linux](https://docs.docker.com/desktop/install/linux-install/)

Verify installation:
```bash
docker --version
docker-compose --version
```

## 🚀 Quick Start (3 Steps)

### Step 1: Navigate to the Project Directory

```bash
# From your terminal, navigate to the polling-app folder
cd polling-app
```

### Step 2: Create Environment Files

Create the backend `.env` file:
```bash
# Copy the example environment file
cp backend/.env.example backend/.env
```

The default values should work for Docker, but you can edit `backend/.env` if needed:
```env
PORT=5000
NODE_ENV=production
REDIS_URL=redis://redis:6379
FRONTEND_URL=http://localhost:3000
```

Create the frontend `.env` file:
```bash
cp frontend/.env.example frontend/.env
```

The `frontend/.env` should contain:
```env
REACT_APP_API_URL=http://localhost:5000
```

### Step 3: Start the Application

```bash
# Build and start all services
docker-compose up --build
```

This command will:
1. ✅ Pull the Redis image
2. ✅ Build the backend Node.js application
3. ✅ Build the frontend React application
4. ✅ Start all services

**First build may take 5-10 minutes** as it downloads dependencies.

## 🌐 Access the Application

Once Docker Compose finishes starting (you'll see logs), open your browser:

- **Frontend Application**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Redis**: localhost:6379 (internal use only)

You should see the Echos Polling homepage! 🎉

## 📋 Useful Docker Commands

### View Running Containers
```bash
docker-compose ps
```

### View Logs
```bash
# All services
docker-compose logs -f

# Backend only
docker-compose logs -f backend

# Frontend only
docker-compose logs -f frontend

# Redis only
docker-compose logs -f redis
```

### Stop the Application
```bash
# Stop but keep containers
docker-compose stop

# Stop and remove containers
docker-compose down

# Stop and remove everything (including volumes)
docker-compose down -v
```

### Restart Services
```bash
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart backend
docker-compose restart frontend
```

### Run in Background (Detached Mode)
```bash
docker-compose up -d
```

### Rebuild After Code Changes
```bash
# Rebuild and restart
docker-compose up --build

# Or rebuild specific service
docker-compose up --build backend
```

## 🔍 Troubleshooting

### Issue: Port Already in Use

**Error:** `Bind for 0.0.0.0:3000 failed: port is already allocated`

**Solution:** Stop the service using that port or change the port in `docker-compose.yml`:
```yaml
frontend:
  ports:
    - "3001:80"  # Change 3000 to 3001
```

### Issue: Backend Can't Connect to Redis

**Error:** `Redis Client Error ECONNREFUSED`

**Solution:** 
1. Make sure Redis service is running: `docker-compose ps`
2. Wait for Redis health check to pass (about 10 seconds)
3. Restart backend: `docker-compose restart backend`

### Issue: Frontend Shows "Cannot connect to server"

**Solution:**
1. Check backend is running: `docker-compose logs backend`
2. Verify `REACT_APP_API_URL` in `frontend/.env` is `http://localhost:5000`
3. Rebuild frontend: `docker-compose up --build frontend`

### Issue: Changes Not Reflected

**Solution:** Rebuild the specific service:
```bash
docker-compose up --build backend  # For backend changes
docker-compose up --build frontend # For frontend changes
```

### View Container Details
```bash
# Execute commands inside containers
docker-compose exec backend sh
docker-compose exec frontend sh

# Check Redis
docker-compose exec redis redis-cli ping
# Should return: PONG
```

## 🧹 Clean Up

### Remove Containers and Networks
```bash
docker-compose down
```

### Remove Everything (including volumes and images)
```bash
docker-compose down -v --rmi all
```

### Free Up Disk Space
```bash
docker system prune -a
```

## 📊 Production Deployment

### Update Environment Variables

For production, update `backend/.env`:
```env
NODE_ENV=production
FRONTEND_URL=https://your-domain.com
REDIS_URL=redis://redis:6379
```

And `frontend/.env`:
```env
REACT_APP_API_URL=https://api.your-domain.com
```

### Use Docker Compose Override

Create `docker-compose.prod.yml`:
```yaml
version: '3.8'
services:
  backend:
    environment:
      - NODE_ENV=production
  frontend:
    environment:
      - REACT_APP_API_URL=https://api.yourdomain.com
```

Run with:
```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## ✅ Verification Checklist

After running `docker-compose up`, verify:

- [ ] No error messages in logs
- [ ] Three containers running: `docker-compose ps`
- [ ] Frontend accessible at http://localhost:3000
- [ ] Backend API responds at http://localhost:5000/api/health
- [ ] Can create a poll
- [ ] Can vote on a poll
- [ ] Results update in real-time

## 🎯 Next Steps

1. **Create your first poll** - Go to http://localhost:3000/create
2. **Share the poll link** - Copy the URL and share with participants
3. **Watch results** - See live updates as votes come in
4. **Test with multiple browsers** - Open in incognito/different browsers to simulate multiple users

## 📞 Need Help?

If you encounter issues:
1. Check logs: `docker-compose logs -f`
2. Verify all containers are running: `docker-compose ps`
3. Restart services: `docker-compose restart`
4. Rebuild from scratch: `docker-compose down -v && docker-compose up --build`

Enjoy your Echos Polling App! 🚀🎉
