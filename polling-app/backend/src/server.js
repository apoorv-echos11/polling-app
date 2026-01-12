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

// CORS configuration - allow multiple origins
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  process.env.FRONTEND_URL
].filter(Boolean);

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(null, true); // Allow all origins for now, log for debugging
    }
  },
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
    origin: function(origin, callback) {
      // Allow all origins for WebSocket connections
      callback(null, true);
    },
    methods: ['GET', 'POST'],
    credentials: true
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
const getVoteKey = (pollId, questionIndex, userId) => `vote:${pollId}:${questionIndex}:${userId}`;

// Master Admin Password (change this in production!)
const MASTER_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'echos2026';

// API Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Get the currently active poll
app.get('/api/active-poll', async (req, res) => {
  try {
    // Check memory first
    for (const [pollId, poll] of polls.entries()) {
      if (poll.active) {
        return res.json({ pollId, title: poll.title });
      }
    }

    // Check Redis for active poll
    const pollKeys = await redisClient.keys('poll:*');
    for (const key of pollKeys) {
      const pollData = await redisClient.get(key);
      if (pollData) {
        const poll = JSON.parse(pollData);
        if (poll.active) {
          polls.set(poll.id, poll);
          return res.json({ pollId: poll.id, title: poll.title });
        }
      }
    }

    return res.status(404).json({ error: 'No active poll found' });
  } catch (error) {
    console.error('Error getting active poll:', error);
    res.status(500).json({ error: 'Failed to get active poll' });
  }
});

// Create a new poll with multiple questions
app.post('/api/polls', async (req, res) => {
  try {
    const { title, questions } = req.body;
    
    if (!title || !questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: 'Title and at least one question are required' });
    }

    if (questions.length > 7) {
      return res.status(400).json({ error: 'Maximum 7 questions allowed per poll' });
    }

    // Validate each question
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question || !q.type) {
        return res.status(400).json({ error: `Question ${i + 1}: Question text and type are required` });
      }
      if (q.type === 'multiple-choice' && (!q.options || q.options.length < 2)) {
        return res.status(400).json({ error: `Question ${i + 1}: Multiple choice needs at least 2 options` });
      }
    }

    const pollId = uuidv4();
    const adminToken = uuidv4(); // Secret token for admin access

    // Initialize questions with vote tracking
    const processedQuestions = questions.map((q, index) => ({
      id: index,
      question: q.question,
      type: q.type,
      options: q.type === 'multiple-choice' ? q.options : null,
      votes: q.type === 'multiple-choice' 
        ? q.options.reduce((acc, opt) => ({ ...acc, [opt]: 0 }), {}) 
        : [],
      totalVotes: 0
    }));

    // Deactivate all existing polls
    for (const [existingPollId, existingPoll] of polls.entries()) {
      if (existingPoll.active) {
        existingPoll.active = false;
        polls.set(existingPollId, existingPoll);
        await redisClient.set(getPollKey(existingPollId), JSON.stringify(existingPoll));
      }
    }

    // Also deactivate polls in Redis that might not be in memory
    const pollKeys = await redisClient.keys('poll:*');
    for (const key of pollKeys) {
      const pollData = await redisClient.get(key);
      if (pollData) {
        const existingPoll = JSON.parse(pollData);
        if (existingPoll.active) {
          existingPoll.active = false;
          await redisClient.set(key, JSON.stringify(existingPoll));
        }
      }
    }

    const poll = {
      id: pollId,
      adminToken,
      title,
      questions: processedQuestions,
      totalParticipants: 0,
      createdAt: new Date().toISOString(),
      active: true
    };

    polls.set(pollId, poll);
    
    // Store in Redis
    await redisClient.set(getPollKey(pollId), JSON.stringify(poll));

    console.log(`📊 New active poll created: ${pollId} (${title}). All other polls deactivated.`);

    res.status(201).json({ 
      pollId, 
      adminToken,
      voterLink: `/poll/${pollId}`,
      adminLink: `/poll/${pollId}/admin/${adminToken}`
    });
  } catch (error) {
    console.error('Error creating poll:', error);
    res.status(500).json({ error: 'Failed to create poll' });
  }
});

// Get poll by ID (for voters - excludes admin token)
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

    // Check if poll is active
    if (!poll.active) {
      return res.status(403).json({ error: 'This poll is no longer active', inactive: true });
    }

    // Return poll without admin token
    const { adminToken, ...publicPoll } = poll;
    res.json({ poll: publicPoll });
  } catch (error) {
    console.error('Error fetching poll:', error);
    res.status(500).json({ error: 'Failed to fetch poll' });
  }
});

// Verify admin access
app.get('/api/polls/:pollId/admin/:adminToken', async (req, res) => {
  try {
    const { pollId, adminToken } = req.params;
    
    let poll = polls.get(pollId);
    
    if (!poll) {
      const pollData = await redisClient.get(getPollKey(pollId));
      if (pollData) {
        poll = JSON.parse(pollData);
        polls.set(pollId, poll);
      }
    }

    if (!poll) {
      return res.status(404).json({ error: 'Poll not found' });
    }

    if (poll.adminToken !== adminToken) {
      return res.status(403).json({ error: 'Invalid admin token' });
    }

    res.json({ poll, isAdmin: true });
  } catch (error) {
    console.error('Error fetching admin poll:', error);
    res.status(500).json({ error: 'Failed to fetch poll' });
  }
});

// ============ MASTER ADMIN ENDPOINTS ============

// Verify master admin password
app.post('/api/admin/verify', (req, res) => {
  const { password } = req.body;
  if (password === MASTER_ADMIN_PASSWORD) {
    res.json({ success: true, message: 'Admin access granted' });
  } else {
    res.status(401).json({ error: 'Invalid admin password' });
  }
});

// Get all polls (requires master admin password)
app.get('/api/admin/polls', async (req, res) => {
  try {
    const { password } = req.query;
    
    if (password !== MASTER_ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Invalid admin password' });
    }

    // Get all polls from Redis
    const keys = await redisClient.keys('poll:*') || [];
    const allPolls = [];

    for (const key of keys) {
      try {
        const pollData = await redisClient.get(key);
        if (pollData) {
          const poll = JSON.parse(pollData);
          // Add to memory map if not present
          if (!polls.has(poll.id)) {
            polls.set(poll.id, poll);
          }
          // Include summary info for admin view
          allPolls.push({
            id: poll.id,
            title: poll.title || 'Untitled Poll',
            questionsCount: poll.questions ? poll.questions.length : 0,
            totalParticipants: poll.totalParticipants || 0,
            createdAt: poll.createdAt || new Date().toISOString(),
            active: poll.active !== false,
            adminToken: poll.adminToken,
            questions: poll.questions ? poll.questions.map(q => ({
              question: q.question || '',
              type: q.type || 'multiple-choice',
              totalVotes: q.totalVotes || 0
            })) : []
          });
        }
      } catch (parseError) {
        console.error(`Error parsing poll data for key ${key}:`, parseError);
      }
    }

    // Sort by creation date (newest first)
    allPolls.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ 
      polls: allPolls,
      totalPolls: allPolls.length,
      totalMemoryUsed: `${(JSON.stringify(allPolls).length / 1024).toFixed(2)} KB`
    });
  } catch (error) {
    console.error('Error fetching all polls:', error);
    res.status(500).json({ error: 'Failed to fetch polls' });
  }
});

// Delete a poll (requires master admin password)
app.delete('/api/admin/polls/:pollId', async (req, res) => {
  try {
    const { pollId } = req.params;
    const { password } = req.query;
    
    if (password !== MASTER_ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Invalid admin password' });
    }

    // Check if poll exists
    let poll = polls.get(pollId);
    if (!poll) {
      const pollData = await redisClient.get(getPollKey(pollId));
      if (pollData) {
        poll = JSON.parse(pollData);
      }
    }

    if (!poll) {
      return res.status(404).json({ error: 'Poll not found' });
    }

    // Delete from memory
    polls.delete(pollId);

    // Delete from Redis
    await redisClient.del(getPollKey(pollId));

    // Delete all vote keys for this poll
    const voteKeys = await redisClient.keys(`vote:${pollId}:*`);
    const pollVoteKeys = await redisClient.keys(`pollvote:${pollId}:*`);
    
    if (voteKeys.length > 0) {
      await redisClient.del(voteKeys);
    }
    if (pollVoteKeys.length > 0) {
      await redisClient.del(pollVoteKeys);
    }

    console.log(`🗑️ Poll deleted: ${pollId} (${poll.title})`);

    res.json({ 
      success: true, 
      message: `Poll "${poll.title}" deleted successfully`,
      deletedVoteKeys: voteKeys.length + pollVoteKeys.length
    });
  } catch (error) {
    console.error('Error deleting poll:', error);
    res.status(500).json({ error: 'Failed to delete poll' });
  }
});

// Delete all polls (requires master admin password) - USE WITH CAUTION
app.delete('/api/admin/polls', async (req, res) => {
  try {
    const { password, confirm } = req.query;
    
    if (password !== MASTER_ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Invalid admin password' });
    }

    if (confirm !== 'DELETE_ALL_POLLS') {
      return res.status(400).json({ error: 'Confirmation required. Add ?confirm=DELETE_ALL_POLLS' });
    }

    // Clear memory
    const pollCount = polls.size;
    polls.clear();

    // Delete all poll-related keys from Redis
    const pollKeys = await redisClient.keys('poll:*');
    const voteKeys = await redisClient.keys('vote:*');
    const pollVoteKeys = await redisClient.keys('pollvote:*');

    if (pollKeys.length > 0) await redisClient.del(pollKeys);
    if (voteKeys.length > 0) await redisClient.del(voteKeys);
    if (pollVoteKeys.length > 0) await redisClient.del(pollVoteKeys);

    console.log(`🗑️ All polls deleted! Count: ${pollKeys.length}`);

    res.json({ 
      success: true, 
      message: 'All polls deleted successfully',
      deletedPolls: pollKeys.length,
      deletedVoteKeys: voteKeys.length + pollVoteKeys.length
    });
  } catch (error) {
    console.error('Error deleting all polls:', error);
    res.status(500).json({ error: 'Failed to delete polls' });
  }
});

// Clear poll results (reset votes to 0) - requires admin token
app.post('/api/polls/:pollId/clear-results', async (req, res) => {
  try {
    const { pollId } = req.params;
    const { adminToken } = req.body;

    // Get poll
    let poll = polls.get(pollId);
    if (!poll) {
      const pollData = await redisClient.get(getPollKey(pollId));
      if (pollData) {
        poll = JSON.parse(pollData);
        polls.set(pollId, poll);
      }
    }

    if (!poll) {
      return res.status(404).json({ error: 'Poll not found' });
    }

    // Verify admin token
    if (poll.adminToken !== adminToken) {
      return res.status(403).json({ error: 'Invalid admin token' });
    }

    // Reset all question votes
    poll.questions = poll.questions.map(q => ({
      ...q,
      votes: q.type === 'multiple-choice' 
        ? q.options.reduce((acc, opt) => ({ ...acc, [opt]: 0 }), {})
        : [],
      totalVotes: 0
    }));

    // Reset total participants
    poll.totalParticipants = 0;

    // Save to memory and Redis
    polls.set(pollId, poll);
    await redisClient.set(getPollKey(pollId), JSON.stringify(poll));

    // Delete all vote tracking keys for this poll
    const voteKeys = await redisClient.keys(`vote:${pollId}:*`);
    const pollVoteKeys = await redisClient.keys(`pollvote:${pollId}:*`);
    
    if (voteKeys.length > 0) {
      await redisClient.del(voteKeys);
    }
    if (pollVoteKeys.length > 0) {
      await redisClient.del(pollVoteKeys);
    }

    // Emit updated results to all connected clients
    io.to(pollId).emit('results-update', {
      results: poll.questions.map(q => ({
        questionId: q.id,
        question: q.question,
        type: q.type,
        options: q.options,
        votes: q.votes,
        totalVotes: q.totalVotes
      })),
      totalParticipants: 0
    });

    console.log(`🔄 Poll results cleared: ${pollId} (${poll.title})`);

    res.json({ 
      success: true, 
      message: 'Poll results cleared successfully',
      poll
    });
  } catch (error) {
    console.error('Error clearing poll results:', error);
    res.status(500).json({ error: 'Failed to clear poll results' });
  }
});

// Activate a poll (deactivates all others) - requires admin token or master password
app.post('/api/polls/:pollId/activate', async (req, res) => {
  try {
    const { pollId } = req.params;
    const { adminToken, adminPassword } = req.body;

    // Get poll
    let poll = polls.get(pollId);
    if (!poll) {
      const pollData = await redisClient.get(getPollKey(pollId));
      if (pollData) {
        poll = JSON.parse(pollData);
        polls.set(pollId, poll);
      }
    }

    if (!poll) {
      return res.status(404).json({ error: 'Poll not found' });
    }

    // Verify authorization (either poll's admin token or master password)
    if (poll.adminToken !== adminToken && adminPassword !== MASTER_ADMIN_PASSWORD) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Deactivate all other polls
    for (const [existingPollId, existingPoll] of polls.entries()) {
      if (existingPollId !== pollId && existingPoll.active) {
        existingPoll.active = false;
        polls.set(existingPollId, existingPoll);
        await redisClient.set(getPollKey(existingPollId), JSON.stringify(existingPoll));
      }
    }

    // Also check Redis for polls not in memory
    const pollKeys = await redisClient.keys('poll:*');
    for (const key of pollKeys) {
      if (key !== getPollKey(pollId)) {
        const pollData = await redisClient.get(key);
        if (pollData) {
          const existingPoll = JSON.parse(pollData);
          if (existingPoll.active) {
            existingPoll.active = false;
            await redisClient.set(key, JSON.stringify(existingPoll));
          }
        }
      }
    }

    // Activate this poll
    poll.active = true;
    polls.set(pollId, poll);
    await redisClient.set(getPollKey(pollId), JSON.stringify(poll));

    console.log(`✅ Poll activated: ${pollId} (${poll.title}). All other polls deactivated.`);

    res.json({ 
      success: true, 
      message: 'Poll activated successfully',
      poll
    });
  } catch (error) {
    console.error('Error activating poll:', error);
    res.status(500).json({ error: 'Failed to activate poll' });
  }
});

// Update/Edit a poll (requires admin token)
app.put('/api/polls/:pollId', async (req, res) => {
  try {
    const { pollId } = req.params;
    const { adminToken, title, questions } = req.body;
    
    // Get existing poll
    let poll = polls.get(pollId);
    if (!poll) {
      const pollData = await redisClient.get(getPollKey(pollId));
      if (pollData) {
        poll = JSON.parse(pollData);
        polls.set(pollId, poll);
      }
    }

    if (!poll) {
      return res.status(404).json({ error: 'Poll not found' });
    }

    // Verify admin token
    if (poll.adminToken !== adminToken) {
      return res.status(403).json({ error: 'Invalid admin token' });
    }

    // Validate new data
    if (!title || !questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: 'Title and at least one question are required' });
    }

    if (questions.length > 7) {
      return res.status(400).json({ error: 'Maximum 7 questions allowed per poll' });
    }

    // Validate each question
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question || !q.type) {
        return res.status(400).json({ error: `Question ${i + 1}: Question text and type are required` });
      }
      if (q.type === 'multiple-choice' && (!q.options || q.options.length < 2)) {
        return res.status(400).json({ error: `Question ${i + 1}: Multiple choice needs at least 2 options` });
      }
    }

    // Update poll - preserve votes where possible, reset where structure changed
    const updatedQuestions = questions.map((q, index) => {
      const existingQuestion = poll.questions[index];
      
      // If question type changed or options changed significantly, reset votes
      if (!existingQuestion || existingQuestion.type !== q.type) {
        // New question or type changed - initialize fresh
        return {
          id: index,
          question: q.question,
          type: q.type,
          options: q.type === 'multiple-choice' ? q.options : null,
          votes: q.type === 'multiple-choice' 
            ? q.options.reduce((acc, opt) => ({ ...acc, [opt]: 0 }), {}) 
            : [],
          totalVotes: 0
        };
      }
      
      // Same type - try to preserve votes
      if (q.type === 'multiple-choice') {
        // Preserve votes for options that still exist
        const newVotes = {};
        q.options.forEach(opt => {
          newVotes[opt] = existingQuestion.votes[opt] || 0;
        });
        return {
          id: index,
          question: q.question,
          type: q.type,
          options: q.options,
          votes: newVotes,
          totalVotes: Object.values(newVotes).reduce((a, b) => a + b, 0)
        };
      } else {
        // one-word type - preserve all votes
        return {
          id: index,
          question: q.question,
          type: q.type,
          options: null,
          votes: existingQuestion.votes || [],
          totalVotes: existingQuestion.totalVotes || 0
        };
      }
    });

    // Update poll object
    poll.title = title;
    poll.questions = updatedQuestions;
    poll.updatedAt = new Date().toISOString();

    // Save to memory and Redis
    polls.set(pollId, poll);
    await redisClient.set(getPollKey(pollId), JSON.stringify(poll));

    console.log(`✏️ Poll updated: ${pollId} (${title})`);

    res.json({ 
      success: true, 
      message: 'Poll updated successfully',
      poll: { ...poll, adminToken: undefined } // Don't send admin token in response
    });
  } catch (error) {
    console.error('Error updating poll:', error);
    res.status(500).json({ error: 'Failed to update poll' });
  }
});

// ============ END MASTER ADMIN ENDPOINTS ============

// Get poll results
app.get('/api/polls/:pollId/results', async (req, res) => {
  try {
    const { pollId } = req.params;
    let poll = polls.get(pollId);

    if (!poll) {
      const pollData = await redisClient.get(getPollKey(pollId));
      if (pollData) {
        poll = JSON.parse(pollData);
        polls.set(pollId, poll);
      }
    }

    if (!poll) {
      return res.status(404).json({ error: 'Poll not found' });
    }

    const results = poll.questions.map(q => ({
      questionId: q.id,
      question: q.question,
      type: q.type,
      options: q.options,
      votes: q.votes,
      totalVotes: q.totalVotes
    }));

    res.json({ 
      results,
      totalParticipants: poll.totalParticipants
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
    
    let poll = polls.get(pollId);
    if (!poll) {
      const pollData = await redisClient.get(getPollKey(pollId));
      if (pollData) {
        poll = JSON.parse(pollData);
        polls.set(pollId, poll);
      }
    }
    
    if (poll) {
      const { adminToken, ...publicPoll } = poll;
      socket.emit('poll-data', publicPoll);
      
      const results = poll.questions.map(q => ({
        questionId: q.id,
        question: q.question,
        type: q.type,
        options: q.options,
        votes: q.votes,
        totalVotes: q.totalVotes
      }));
      
      socket.emit('results-update', {
        results,
        totalParticipants: poll.totalParticipants
      });
    }
  });

  // Join admin room for a poll
  socket.on('join-admin', async ({ pollId, adminToken }) => {
    let poll = polls.get(pollId);
    if (!poll) {
      const pollData = await redisClient.get(getPollKey(pollId));
      if (pollData) {
        poll = JSON.parse(pollData);
        polls.set(pollId, poll);
      }
    }

    if (poll && poll.adminToken === adminToken) {
      socket.join(`${pollId}-admin`);
      socket.join(pollId);
      console.log(`Admin ${socket.id} joined poll: ${pollId}`);
      
      socket.emit('poll-data', poll);
      
      const results = poll.questions.map(q => ({
        questionId: q.id,
        question: q.question,
        type: q.type,
        options: q.options,
        votes: q.votes,
        totalVotes: q.totalVotes
      }));
      
      socket.emit('results-update', {
        results,
        totalParticipants: poll.totalParticipants
      });
    } else {
      socket.emit('admin-error', { error: 'Invalid admin credentials' });
    }
  });

  // Submit votes for all questions
  socket.on('submit-votes', async ({ pollId, userId, answers }) => {
    try {
      let poll = polls.get(pollId);
      
      if (!poll) {
        const pollData = await redisClient.get(getPollKey(pollId));
        if (pollData) {
          poll = JSON.parse(pollData);
          polls.set(pollId, poll);
        }
      }
      
      if (!poll) {
        socket.emit('vote-error', { error: 'Poll not found' });
        return;
      }

      if (!poll.active) {
        socket.emit('vote-error', { error: 'Poll is closed' });
        return;
      }

      // Check if user has already voted on this poll
      const pollVoteKey = `pollvote:${pollId}:${userId}`;
      const hasVotedOnPoll = await redisClient.get(pollVoteKey);
      
      if (hasVotedOnPoll) {
        socket.emit('vote-error', { error: 'You have already submitted your responses' });
        return;
      }

      // Process each answer
      for (const answer of answers) {
        const { questionIndex, value } = answer;
        const question = poll.questions[questionIndex];
        
        if (!question) continue;

        // Process vote based on question type
        if (question.type === 'multiple-choice') {
          if (question.votes.hasOwnProperty(value)) {
            question.votes[value]++;
            question.totalVotes++;
          }
        } else if (question.type === 'one-word') {
          // Filter profanity
          const cleanAnswer = filter.isProfane(value) ? '***' : value;
          question.votes.push({
            text: cleanAnswer,
            timestamp: new Date().toISOString(),
            oderId: socket.id.substring(0, 8)
          });
          question.totalVotes++;
        }
      }

      poll.totalParticipants++;

      // Mark user as voted on this poll
      await redisClient.set(pollVoteKey, 'true', { EX: 86400 * 7 }); // Expire after 7 days

      // Update poll in storage
      polls.set(pollId, poll);
      await redisClient.set(getPollKey(pollId), JSON.stringify(poll));

      // Prepare results for broadcast
      const results = poll.questions.map(q => ({
        questionId: q.id,
        question: q.question,
        type: q.type,
        options: q.options,
        votes: q.votes,
        totalVotes: q.totalVotes
      }));

      // Broadcast results to all users in the poll room (including admin room)
      io.to(pollId).emit('results-update', {
        results,
        totalParticipants: poll.totalParticipants
      });

      // Send success to the voter
      socket.emit('vote-success', { message: 'All responses recorded successfully' });
      
    } catch (error) {
      console.error('Error submitting votes:', error);
      socket.emit('vote-error', { error: 'Failed to submit votes' });
    }
  });

  // Leave poll room
  socket.on('leave-poll', (pollId) => {
    socket.leave(pollId);
    socket.leave(`${pollId}-admin`);
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
