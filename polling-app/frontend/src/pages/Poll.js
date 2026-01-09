import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import MultipleChoiceResults from '../components/MultipleChoiceResults';
import OneWordResults from '../components/OneWordResults';
import Confetti from 'react-confetti';
import './Poll.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const Poll = () => {
  const { pollId } = useParams();
  const [socket, setSocket] = useState(null);
  const [poll, setPoll] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hasVoted, setHasVoted] = useState(false);
  const [selectedOption, setSelectedOption] = useState('');
  const [oneWordAnswer, setOneWordAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [userId] = useState(() => {
    // Get or create user ID
    let id = localStorage.getItem('userId');
    if (!id) {
      id = uuidv4();
      localStorage.setItem('userId', id);
    }
    return id;
  });

  useEffect(() => {
    // Check if user has already voted
    const voted = localStorage.getItem(`voted_${pollId}`);
    if (voted) {
      setHasVoted(true);
    }

    // Initialize Socket.io connection
    const newSocket = io(API_URL);
    setSocket(newSocket);

    // Load poll data
    loadPoll();

    // Join poll room
    newSocket.emit('join-poll', pollId);

    // Listen for poll data
    newSocket.on('poll-data', (pollData) => {
      setPoll(pollData);
      setLoading(false);
    });

    // Listen for results updates
    newSocket.on('results-update', (resultsData) => {
      setResults(resultsData);
    });

    // Listen for vote success
    newSocket.on('vote-success', () => {
      setHasVoted(true);
      setShowConfetti(true);
      localStorage.setItem(`voted_${pollId}`, 'true');
      setTimeout(() => setShowConfetti(false), 5000);
    });

    // Listen for vote errors
    newSocket.on('vote-error', (data) => {
      setError(data.error);
      setSubmitting(false);
    });

    return () => {
      if (newSocket) {
        newSocket.emit('leave-poll', pollId);
        newSocket.disconnect();
      }
    };
  }, [pollId]);

  const loadPoll = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/polls/${pollId}`);
      setPoll(response.data.poll);
      
      const resultsResponse = await axios.get(`${API_URL}/api/polls/${pollId}/results`);
      setResults(resultsResponse.data);
      
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load poll');
      setLoading(false);
    }
  };

  const handleVote = (e) => {
    e.preventDefault();
    setError('');

    if (poll.type === 'multiple-choice' && !selectedOption) {
      setError('Please select an option');
      return;
    }

    if (poll.type === 'one-word' && !oneWordAnswer.trim()) {
      setError('Please enter your answer');
      return;
    }

    if (poll.type === 'one-word' && oneWordAnswer.trim().split(' ').length > 3) {
      setError('Please keep your answer to 3 words or less');
      return;
    }

    setSubmitting(true);

    const answer = poll.type === 'multiple-choice' ? selectedOption : oneWordAnswer.trim();
    
    socket.emit('submit-vote', {
      pollId,
      userId,
      answer
    });
  };

  const copyPollLink = () => {
    const link = window.location.href;
    navigator.clipboard.writeText(link).then(() => {
      alert('Poll link copied to clipboard!');
    });
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Loading poll...</p>
      </div>
    );
  }

  if (error && !poll) {
    return (
      <div className="error-container card">
        <div className="error-message">
          ⚠️ {error}
        </div>
      </div>
    );
  }

  return (
    <div className="poll-page fade-in">
      {showConfetti && <Confetti recycle={false} numberOfPieces={500} />}
      
      <div className="poll-container">
        <div className="poll-header card">
          <h1 className="poll-question">{poll.question}</h1>
          <div className="poll-meta">
            <span className="poll-type-badge">
              {poll.type === 'multiple-choice' ? '✓ Multiple Choice' : '💬 Open Response'}
            </span>
            <span className="poll-votes">
              👥 {results?.totalVotes || 0} {results?.totalVotes === 1 ? 'response' : 'responses'}
            </span>
          </div>
          <button className="btn-share" onClick={copyPollLink} title="Copy poll link">
            📋 Share Poll
          </button>
        </div>

        {!hasVoted ? (
          <div className="voting-section card">
            <h2 className="section-title">Cast Your Vote</h2>
            
            {error && (
              <div className="error-message">
                ⚠️ {error}
              </div>
            )}

            <form onSubmit={handleVote} className="vote-form">
              {poll.type === 'multiple-choice' ? (
                <div className="options-container">
                  {poll.options.map((option, index) => (
                    <label key={index} className={`option-card ${selectedOption === option ? 'selected' : ''}`}>
                      <input
                        type="radio"
                        name="option"
                        value={option}
                        checked={selectedOption === option}
                        onChange={(e) => setSelectedOption(e.target.value)}
                        className="option-radio"
                      />
                      <span className="option-text">{option}</span>
                      <span className="option-check">✓</span>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="input-group">
                  <input
                    type="text"
                    className="input-field input-large"
                    placeholder="Type your answer (1-3 words)..."
                    value={oneWordAnswer}
                    onChange={(e) => setOneWordAnswer(e.target.value)}
                    maxLength={50}
                  />
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary btn-large"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <span className="spinner" style={{ width: '20px', height: '20px', borderWidth: '3px' }}></span>
                    Submitting...
                  </>
                ) : (
                  <>🚀 Submit Vote</>
                )}
              </button>
            </form>
          </div>
        ) : (
          <div className="success-message">
            ✓ Thank you for voting! Watch the results update in real-time below.
          </div>
        )}

        {results && (
          <div className="results-section card">
            <h2 className="section-title">Live Results</h2>
            {poll.type === 'multiple-choice' ? (
              <MultipleChoiceResults results={results.results} totalVotes={results.totalVotes} />
            ) : (
              <OneWordResults results={results.results} />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Poll;
