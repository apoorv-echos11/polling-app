require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { createClient } = require('redis');
const { v4: uuidv4 } = require('uuid');
const Filter = require('bad-words');

const app = express();
const server = http.createServer(app);
const filter = new Filter();

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Socket.io setup
const io = socketIO(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// Redis client setup
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));
redisClient.on('connect', () => console.log('✅ Connected to Redis'));

// Initialize Redis
(async () => {
  await redisClient.connect();
})();

// In-memory storage (use Redis or MongoDB for production)
const polls = new Map();
const userVotes = new Map(); // Track user votes to prevent duplicates

// Helper functions
const getPollKey = (pollId) => `poll:${pollId}`;
const getVoteKey = (pollId, userId) => `vote:${pollId}:${userId}`;

// API Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Create a new poll
app.post('/api/polls', async (req, res) => {
  try {
    const { question, type, options } = req.body;
    
    if (!question || !type) {
      return res.status(400).json({ error: 'Question and type are required' });
    }

    if (type === 'multiple-choice' && (!options || options.length < 2)) {
      return res.status(400).json({ error: 'Multiple choice polls need at least 2 options' });
    }

    const pollId = uuidv4();
    const poll = {
      id: pollId,
      question,
      type,
      options: type === 'multiple-choice' ? options : null,
      votes: type === 'multiple-choice' ? options.reduce((acc, opt) => ({ ...acc, [opt]: 0 }), {}) : [],
      totalVotes: 0,
      createdAt: new Date().toISOString(),
      active: true
    };

    polls.set(pollId, poll);
    
    // Store in Redis
    await redisClient.set(getPollKey(pollId), JSON.stringify(poll));

    res.status(201).json({ pollId, poll });
  } catch (error) {
    console.error('Error creating poll:', error);
    res.status(500).json({ error: 'Failed to create poll' });
  }
});

// Get poll by ID
app.get('/api/polls/:pollId', async (req, res) => {
  try {
    const { pollId } = req.params;
    
    let poll = polls.get(pollId);
    
    if (!poll) {
      // Try to get from Redis
      const pollData = await redisClient.get(getPollKey(pollId));
      if (pollData) {
        poll = JSON.parse(pollData);
        polls.set(pollId, poll);
      }
    }

    if (!poll) {
      return res.status(404).json({ error: 'Poll not found' });
    }

    res.json({ poll });
  } catch (error) {
    console.error('Error fetching poll:', error);
    res.status(500).json({ error: 'Failed to fetch poll' });
  }
});

// Get poll results
app.get('/api/polls/:pollId/results', async (req, res) => {
  try {
    const { pollId } = req.params;
    const poll = polls.get(pollId);

    if (!poll) {
      return res.status(404).json({ error: 'Poll not found' });
    }

    res.json({ 
      results: poll.votes,
      totalVotes: poll.totalVotes,
      type: poll.type
    });
  } catch (error) {
    console.error('Error fetching results:', error);
    res.status(500).json({ error: 'Failed to fetch results' });
  }
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`👤 User connected: ${socket.id}`);

  // Join a poll room
  socket.on('join-poll', async (pollId) => {
    socket.join(pollId);
    console.log(`User ${socket.id} joined poll: ${pollId}`);
    
    const poll = polls.get(pollId);
    if (poll) {
      socket.emit('poll-data', poll);
      socket.emit('results-update', {
        results: poll.votes,
        totalVotes: poll.totalVotes
      });
    }
  });

  // Submit a vote
  socket.on('submit-vote', async ({ pollId, userId, answer }) => {
    try {
      const poll = polls.get(pollId);
      
      if (!poll) {
        socket.emit('vote-error', { error: 'Poll not found' });
        return;
      }

      if (!poll.active) {
        socket.emit('vote-error', { error: 'Poll is closed' });
        return;
      }

      // Check if user already voted
      const voteKey = getVoteKey(pollId, userId);
      const hasVoted = await redisClient.get(voteKey);
      
      if (hasVoted) {
        socket.emit('vote-error', { error: 'You have already voted' });
        return;
      }

      // Process vote based on poll type
      if (poll.type === 'multiple-choice') {
        if (!poll.votes.hasOwnProperty(answer)) {
          socket.emit('vote-error', { error: 'Invalid option' });
          return;
        }
        poll.votes[answer]++;
      } else if (poll.type === 'one-word') {
        // Filter profanity
        const cleanAnswer = filter.isProfane(answer) ? '***' : answer;
        poll.votes.push({
          text: cleanAnswer,
          timestamp: new Date().toISOString(),
          userId: socket.id.substring(0, 8)
        });
      }

      poll.totalVotes++;

      // Mark user as voted
      await redisClient.set(voteKey, 'true', { EX: 86400 }); // Expire after 24 hours

      // Update poll in storage
      polls.set(pollId, poll);
      await redisClient.set(getPollKey(pollId), JSON.stringify(poll));

      // Broadcast results to all users in the poll room
      io.to(pollId).emit('results-update', {
        results: poll.votes,
        totalVotes: poll.totalVotes,
        type: poll.type
      });

      socket.emit('vote-success', { message: 'Vote recorded successfully' });
      
    } catch (error) {
      console.error('Error submitting vote:', error);
      socket.emit('vote-error', { error: 'Failed to submit vote' });
    }
  });

  // Leave poll room
  socket.on('leave-poll', (pollId) => {
    socket.leave(pollId);
    console.log(`User ${socket.id} left poll: ${pollId}`);
  });

  socket.on('disconnect', () => {
    console.log(`👋 User disconnected: ${socket.id}`);
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`
  🚀 Echos Polling Server Running!
  
  📡 Port: ${PORT}
  🌐 Environment: ${process.env.NODE_ENV || 'development'}
  🔗 Frontend: ${process.env.FRONTEND_URL || 'http://localhost:3000'}
  
  `);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await redisClient.quit();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
