# ⚡ Quick Start Guide

## 🚀 Run with Docker (Easiest Method)

### One-Command Setup:

**Mac/Linux:**
```bash
cd polling-app
chmod +x start.sh
./start.sh
```

**Windows:**
```bash
cd polling-app
start.bat
```

**Or manually:**
```bash
cd polling-app
docker-compose up --build
```

### Access the App:
- 🌐 **Open browser**: http://localhost:3000
- 🎯 **Create a poll**: http://localhost:3000/create
- 📊 **API Health**: http://localhost:5000/api/health

### Stop the App:
- Press `Ctrl + C` in terminal
- Or run: `docker-compose down`

---

## 📝 Step-by-Step Instructions

### 1️⃣ **Prerequisites**
- Install [Docker Desktop](https://www.docker.com/products/docker-desktop)
- Verify: `docker --version` and `docker-compose --version`

### 2️⃣ **Setup Environment**
```bash
cd polling-app

# Create environment files (if not exist)
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

### 3️⃣ **Start Application**
```bash
docker-compose up --build
```

Wait for output:
```
✅ Echos Polling Server Running!
✅ Connected to Redis
```

### 4️⃣ **Open Application**
Navigate to: http://localhost:3000

---

## 🎮 Using the App

### Create a Poll:
1. Click **"Create Poll"** button
2. Enter your question
3. Choose **Multiple Choice** or **One Word**
4. Add options (for multiple choice)
5. Click **"Create Poll"**
6. Share the generated link!

### Vote on a Poll:
1. Open the poll link
2. Select your answer
3. Click **"Submit Vote"**
4. Watch real-time results! 🎉

---

## 🛠️ Common Commands

| Action | Command |
|--------|---------|
| **Start** | `docker-compose up` |
| **Start (background)** | `docker-compose up -d` |
| **Stop** | `docker-compose down` |
| **View logs** | `docker-compose logs -f` |
| **Restart** | `docker-compose restart` |
| **Rebuild** | `docker-compose up --build` |
| **Clean up** | `docker-compose down -v` |

---

## 🔧 Troubleshooting

### Port Already in Use?
```bash
# Change port in docker-compose.yml
frontend:
  ports:
    - "3001:80"  # Use 3001 instead of 3000
```

### Not seeing changes?
```bash
# Rebuild the application
docker-compose up --build
```

### Redis connection error?
```bash
# Wait 10 seconds and restart
docker-compose restart backend
```

### Complete reset?
```bash
docker-compose down -v
docker-compose up --build
```

---

## 📱 Testing with Multiple Users

1. Open poll in regular browser
2. Open same poll in incognito/private mode
3. Open on your phone (use computer's IP: http://192.168.x.x:3000)
4. Watch results update in real-time across all devices!

---

## 🎯 What's Next?

- ✅ Test multiple choice polls
- ✅ Test one-word answer polls
- ✅ Try different visualization modes (Bubbles, Word Cloud, List)
- ✅ Share with friends and colleagues
- ✅ Deploy to production (see README.md)

---

## 📞 Need Help?

Check `DOCKER_SETUP.md` for detailed troubleshooting and deployment guides.

**Enjoy your Echos Polling App!** 🌊🎉
