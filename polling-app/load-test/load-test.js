/**
 * 🧪 Echos Polling App - Load Testing Script
 * 
 * Simulates multiple concurrent users voting on a poll.
 * 
 * Usage:
 *   node load-test.js --pollId=YOUR_POLL_ID --users=100
 * 
 * Or interactive mode:
 *   node load-test.js
 */

const { io } = require('socket.io-client');
const { v4: uuidv4 } = require('uuid');
const readline = require('readline');

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:5000';

// Parse command line arguments
const args = process.argv.slice(2).reduce((acc, arg) => {
  const [key, value] = arg.replace('--', '').split('=');
  acc[key] = value;
  return acc;
}, {});

// Statistics tracking
const stats = {
  totalUsers: 0,
  connected: 0,
  votesSubmitted: 0,
  errors: 0,
  startTime: null,
  endTime: null,
  connectionTimes: [],
  voteTimes: []
};

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  red: '\x1b[31m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logProgress() {
  const progress = Math.round((stats.votesSubmitted / stats.totalUsers) * 100);
  const bar = '█'.repeat(Math.floor(progress / 5)) + '░'.repeat(20 - Math.floor(progress / 5));
  process.stdout.write(`\r${colors.cyan}Progress: [${bar}] ${progress}% | Connected: ${stats.connected} | Votes: ${stats.votesSubmitted}/${stats.totalUsers} | Errors: ${stats.errors}${colors.reset}`);
}

async function fetchPollData(pollId) {
  const response = await fetch(`${API_URL}/api/polls/${pollId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch poll: ${response.statusText}`);
  }
  return (await response.json()).poll;
}

function generateRandomAnswer(question) {
  if (question.type === 'multiple-choice') {
    // Pick a random option
    const randomIndex = Math.floor(Math.random() * question.options.length);
    return question.options[randomIndex];
  } else {
    // Generate a random word/phrase for open text (including long words)
    const words = [
      // Short words
      'Great', 'Awesome', 'Good', 'Nice', 'Yes', 'No', 'OK', 'Fine', 'Cool',
      // Medium words
      'Excellent', 'Amazing', 'Fantastic', 'Wonderful', 'Perfect', 'Helpful',
      'Absolutely', 'Definitely', 'Positive', 'Negative', 'Neutral',
      // Long words (9+ characters) - testing bubble sizing
      'Outstanding', 'Incredible', 'Magnificent', 'Extraordinary', 
      'Phenomenal', 'Spectacular', 'Impressive', 'Remarkable',
      'Educational', 'Informative', 'Interactive', 'Interesting',
      'Professional', 'Comprehensive', 'Entertaining', 'Enlightening',
      // Very long words (15+ characters)
      'Thought-provoking', 'Mind-blowing', 'Life-changing', 'Eye-opening',
      'Revolutionary', 'Groundbreaking', 'Transformative', 'Inspirational',
      // Phrases
      'Love it', 'Very good', 'Well done', 'Keep going', 'More please'
    ];
    return words[Math.floor(Math.random() * words.length)];
  }
}

async function simulateUser(pollId, poll, userIndex, delayMs) {
  return new Promise((resolve) => {
    // Add random delay to simulate real-world staggered connections
    setTimeout(async () => {
      const userId = uuidv4();
      const connectionStart = Date.now();
      
      const socket = io(API_URL, {
        transports: ['websocket'],
        forceNew: true
      });

      let resolved = false;
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          stats.errors++;
          socket.disconnect();
          resolve({ success: false, error: 'Timeout' });
        }
      }, 30000); // 30 second timeout

      socket.on('connect', () => {
        const connectionTime = Date.now() - connectionStart;
        stats.connectionTimes.push(connectionTime);
        stats.connected++;
        
        // Join the poll
        socket.emit('join-poll', pollId);
      });

      socket.on('poll-data', (pollData) => {
        // Generate random answers for all questions
        const answers = poll.questions.map((q, index) => ({
          questionIndex: index,
          value: generateRandomAnswer(q)
        }));

        // Small random delay before voting (simulates user reading questions)
        const thinkTime = Math.random() * 2000 + 500; // 0.5-2.5 seconds
        
        setTimeout(() => {
          const voteStart = Date.now();
          
          socket.emit('submit-votes', {
            pollId,
            userId,
            answers
          });
        }, thinkTime);
      });

      socket.on('vote-success', () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          stats.votesSubmitted++;
          stats.voteTimes.push(Date.now() - connectionStart);
          logProgress();
          
          // Disconnect after successful vote
          setTimeout(() => {
            socket.disconnect();
            resolve({ success: true });
          }, 500);
        }
      });

      socket.on('vote-error', (data) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          stats.errors++;
          logProgress();
          socket.disconnect();
          resolve({ success: false, error: data.error });
        }
      });

      socket.on('connect_error', (error) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          stats.errors++;
          logProgress();
          resolve({ success: false, error: error.message });
        }
      });

    }, delayMs);
  });
}

async function runLoadTest(pollId, numUsers) {
  log('\n' + '═'.repeat(60), colors.cyan);
  log('  🧪 ECHOS POLLING - LOAD TEST', colors.bright + colors.cyan);
  log('═'.repeat(60), colors.cyan);
  
  log(`\n📋 Poll ID: ${pollId}`, colors.yellow);
  log(`👥 Simulating: ${numUsers} users`, colors.yellow);
  log(`🔗 Server: ${API_URL}`, colors.yellow);
  
  // Fetch poll data
  log('\n⏳ Fetching poll data...', colors.blue);
  let poll;
  try {
    poll = await fetchPollData(pollId);
    log(`✅ Poll found: "${poll.title}"`, colors.green);
    log(`📝 Questions: ${poll.questions.length}`, colors.green);
    poll.questions.forEach((q, i) => {
      log(`   ${i + 1}. ${q.question.substring(0, 50)}${q.question.length > 50 ? '...' : ''} (${q.type})`, colors.reset);
    });
  } catch (error) {
    log(`❌ Error: ${error.message}`, colors.red);
    process.exit(1);
  }

  // Initialize stats
  stats.totalUsers = numUsers;
  stats.startTime = Date.now();

  log('\n🚀 Starting load test...\n', colors.magenta);

  // Create all user simulations with staggered start times
  // Spread connections over 10 seconds to avoid overwhelming the server
  const spreadTimeMs = Math.min(numUsers * 20, 10000); // Max 10 seconds spread
  const promises = [];

  for (let i = 0; i < numUsers; i++) {
    const delay = (i / numUsers) * spreadTimeMs;
    promises.push(simulateUser(pollId, poll, i, delay));
  }

  // Wait for all users to complete
  await Promise.all(promises);
  
  stats.endTime = Date.now();

  // Print results
  printResults();
}

function printResults() {
  const duration = (stats.endTime - stats.startTime) / 1000;
  const avgConnectionTime = stats.connectionTimes.length > 0 
    ? Math.round(stats.connectionTimes.reduce((a, b) => a + b, 0) / stats.connectionTimes.length)
    : 0;
  const avgVoteTime = stats.voteTimes.length > 0
    ? Math.round(stats.voteTimes.reduce((a, b) => a + b, 0) / stats.voteTimes.length)
    : 0;
  const successRate = ((stats.votesSubmitted / stats.totalUsers) * 100).toFixed(1);
  const votesPerSecond = (stats.votesSubmitted / duration).toFixed(1);

  console.log('\n');
  log('═'.repeat(60), colors.cyan);
  log('  📊 LOAD TEST RESULTS', colors.bright + colors.cyan);
  log('═'.repeat(60), colors.cyan);
  
  log(`\n  Total Users:          ${stats.totalUsers}`, colors.reset);
  log(`  Successful Votes:     ${stats.votesSubmitted}`, colors.green);
  log(`  Errors:               ${stats.errors}`, stats.errors > 0 ? colors.red : colors.green);
  log(`  Success Rate:         ${successRate}%`, parseFloat(successRate) >= 95 ? colors.green : colors.yellow);
  
  log(`\n  ⏱️  Performance:`, colors.magenta);
  log(`  Total Duration:       ${duration.toFixed(2)}s`, colors.reset);
  log(`  Votes/Second:         ${votesPerSecond}`, colors.reset);
  log(`  Avg Connection Time:  ${avgConnectionTime}ms`, colors.reset);
  log(`  Avg Vote Time:        ${avgVoteTime}ms`, colors.reset);

  // Performance assessment
  log('\n  📈 Assessment:', colors.yellow);
  if (parseFloat(successRate) >= 99 && avgConnectionTime < 500) {
    log('  ✅ EXCELLENT - Your app handles this load perfectly!', colors.green);
  } else if (parseFloat(successRate) >= 95 && avgConnectionTime < 1000) {
    log('  ✅ GOOD - Your app handles this load well.', colors.green);
  } else if (parseFloat(successRate) >= 80) {
    log('  ⚠️  FAIR - Some users may experience delays.', colors.yellow);
  } else {
    log('  ❌ NEEDS IMPROVEMENT - Consider optimizing your server.', colors.red);
  }

  log('\n' + '═'.repeat(60) + '\n', colors.cyan);
}

async function interactiveMode() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (prompt) => new Promise((resolve) => rl.question(prompt, resolve));

  log('\n' + '═'.repeat(60), colors.cyan);
  log('  🧪 ECHOS POLLING - LOAD TEST (Interactive Mode)', colors.bright + colors.cyan);
  log('═'.repeat(60), colors.cyan);

  log('\n📌 First, create a poll at http://localhost:3000/create', colors.yellow);
  log('   Then copy the Poll ID from the URL or success screen.\n', colors.yellow);

  const pollId = await question(`${colors.cyan}Enter Poll ID: ${colors.reset}`);
  
  if (!pollId.trim()) {
    log('❌ Poll ID is required!', colors.red);
    rl.close();
    process.exit(1);
  }

  const usersInput = await question(`${colors.cyan}Number of users to simulate (default: 100): ${colors.reset}`);
  const numUsers = parseInt(usersInput) || 100;

  rl.close();

  await runLoadTest(pollId.trim(), numUsers);
}

// Main execution
async function main() {
  if (args.pollId) {
    const numUsers = parseInt(args.users) || 100;
    await runLoadTest(args.pollId, numUsers);
  } else {
    await interactiveMode();
  }
}

main().catch(console.error);

