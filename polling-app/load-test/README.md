# 🧪 Echos Polling - Load Testing Script

Simulate 50-500+ concurrent users voting on your poll to test performance before a live session.

## 📋 Prerequisites

1. Backend server running (`npm start` in backend folder)
2. A poll created via the frontend (http://localhost:3000/create)
3. The Poll ID from the created poll

## 🚀 Quick Start

### Interactive Mode (Recommended)
```bash
cd load-test
node load-test.js
```
Follow the prompts to enter your Poll ID and number of users.

### Command Line Mode
```bash
# Test with 100 users
node load-test.js --pollId=YOUR_POLL_ID --users=100

# Test with 500 users
node load-test.js --pollId=YOUR_POLL_ID --users=500
```

### Using npm scripts
```bash
npm run test:50   # 50 users
npm run test:100  # 100 users
npm run test:250  # 250 users
npm run test:500  # 500 users
```

## 📊 What the Test Does

1. **Connects** 500 simulated users to your poll via WebSocket
2. **Joins** each user to the poll room
3. **Generates** random answers for all questions
4. **Submits** votes simultaneously
5. **Reports** detailed performance metrics

## 📈 Metrics Reported

| Metric | Description |
|--------|-------------|
| Success Rate | % of users who successfully voted |
| Votes/Second | Throughput of your server |
| Avg Connection Time | How fast users connect |
| Avg Vote Time | Total time from connect to vote |

## 🎯 How to Use

1. **Create a poll** at http://localhost:3000/create
2. **Copy the Poll ID** from the URL (e.g., `abc123-def456-...`)
3. **Open Admin Dashboard** to watch live results
4. **Run the load test** in another terminal
5. **Watch** votes flood in on the admin dashboard!

## ⚠️ Tips

- Start with 50 users, then increase gradually
- Watch your terminal running the backend for errors
- Monitor system resources (CPU, memory)
- Test on your actual deployment environment before live events

