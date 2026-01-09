# Echos Polling App 🎯

A real-time polling application with support for 500+ concurrent users, featuring beautiful animations and Echos branding.

## Features

- 🚀 Real-time results using WebSockets
- 👥 Support for 500+ concurrent users
- 🎨 Multiple choice questions with animated charts
- 💬 One-word answers with word cloud visualization
- 🎭 No sign-up required
- 🔒 Duplicate vote prevention
- 📱 Fully responsive design
- 🌊 Echos brand colors throughout

## Tech Stack

**Frontend:**
- React 18
- Socket.io Client
- Chart.js (for bar charts)
- D3.js (for word clouds)
- Framer Motion (for animations)

**Backend:**
- Node.js + Express
- Socket.io Server
- Redis (for session management)
- MongoDB (optional, for persistence)

## Installation

### Prerequisites
- Node.js 16+ and npm
- Redis server (or use Redis Cloud free tier)

### Setup

1. **Install dependencies for both frontend and backend:**

```bash
# Backend
cd polling-app/backend
npm install

# Frontend
cd ../frontend
npm install
```

2. **Configure environment variables:**

Create `backend/.env`:
```env
PORT=5000
REDIS_URL=redis://localhost:6379
NODE_ENV=development
```

3. **Start Redis:**
```bash
redis-server
```

4. **Run the application:**

```bash
# Terminal 1: Start backend
cd backend
npm run dev

# Terminal 2: Start frontend
cd frontend
npm start
```

5. **Access the app:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## Project Structure

```
polling-app/
├── backend/
│   ├── src/
│   │   ├── server.js          # Express + Socket.io setup
│   │   ├── controllers/       # Business logic
│   │   ├── models/           # Data models
│   │   └── utils/            # Helper functions
│   ├── package.json
│   └── .env
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── pages/           # Page components
│   │   ├── styles/          # CSS/styling
│   │   └── utils/           # Utilities
│   └── package.json
└── README.md
```

## Usage

### Creating a Poll (Admin)
1. Navigate to `/admin`
2. Create a new poll with question and options
3. Share the poll link with participants

### Voting
1. Open the shared poll link
2. Select your answer
3. Submit and see real-time results

## Deployment

### Heroku
```bash
heroku create echos-polling-app
heroku addons:create heroku-redis:hobby-dev
git push heroku main
```

### Docker
```bash
docker-compose up -d
```

## Contributing

Built with ❤️ for Echos

## License

Proprietary - Echos Company
