import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import Confetti from 'react-confetti';
import './Poll.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const Poll = () => {
  const { pollId } = useParams();
  const [socket, setSocket] = useState(null);
  const [poll, setPoll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hasVoted, setHasVoted] = useState(false);
  const [answers, setAnswers] = useState({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [userId] = useState(() => {
    let id = localStorage.getItem('oderId');
    if (!id) {
      id = uuidv4();
      localStorage.setItem('oderId', id);
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
      // Initialize answers object for all questions
      const initialAnswers = {};
      pollData.questions.forEach((q, index) => {
        initialAnswers[index] = '';
      });
      setAnswers(initialAnswers);
      setLoading(false);
    });

    // Listen for vote success
    newSocket.on('vote-success', () => {
      setHasVoted(true);
      setShowConfetti(true);
      localStorage.setItem(`voted_${pollId}`, 'true');
      setTimeout(() => setShowConfetti(false), 5000);
      setSubmitting(false);
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
      
      // Initialize answers
      const initialAnswers = {};
      response.data.poll.questions.forEach((q, index) => {
        initialAnswers[index] = '';
      });
      setAnswers(initialAnswers);
      
      setLoading(false);
    } catch (err) {
      if (err.response?.data?.inactive) {
        setError('This poll is no longer active. Please contact the poll administrator.');
      } else {
        setError(err.response?.data?.error || 'Failed to load poll');
      }
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionIndex, value) => {
    setAnswers(prev => ({
      ...prev,
      [questionIndex]: value
    }));
  };

  const handleNext = () => {
    if (currentQuestion < poll.questions.length - 1) {
      setCurrentQuestion(curr => curr + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(curr => curr - 1);
    }
  };

  const handleSubmit = () => {
    setError('');

    // Validate all answers
    for (let i = 0; i < poll.questions.length; i++) {
      const q = poll.questions[i];
      const answer = answers[i];
      
      if (!answer || !answer.trim()) {
        setError(`Please answer question ${i + 1}`);
        setCurrentQuestion(i);
        return;
      }

      if (q.type === 'one-word' && answer.trim().split(' ').length > 5) {
        setError(`Question ${i + 1}: Please keep your answer to 5 words or less`);
        setCurrentQuestion(i);
        return;
      }
    }

    setSubmitting(true);

    // Format answers for submission
    const formattedAnswers = Object.entries(answers).map(([index, value]) => ({
      questionIndex: parseInt(index),
      value: value.trim()
    }));

    socket.emit('submit-votes', {
      pollId,
      userId,
      answers: formattedAnswers
    });
  };

  const copyPollLink = () => {
    const link = window.location.href;
    navigator.clipboard.writeText(link).then(() => {
      alert('Poll link copied to clipboard!');
    });
  };

  const getProgress = () => {
    const answered = Object.values(answers).filter(a => a && a.trim()).length;
    return Math.round((answered / poll.questions.length) * 100);
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

  const currentQ = poll.questions[currentQuestion];

  return (
    <div className="poll-page fade-in">
      {showConfetti && <Confetti recycle={false} numberOfPieces={500} />}
      
      <div className="poll-container">
        <div className="poll-header card">
          <h1 className="poll-title">{poll.title}</h1>
        </div>

        {!hasVoted ? (
          <div className="voting-section card">
            {/* Progress Bar */}
            <div className="progress-indicator">
              <div className="progress-bar-container">
                <div 
                  className="progress-bar-fill" 
                  style={{ width: `${getProgress()}%` }}
                ></div>
              </div>
              <span className="progress-text">
                Question {currentQuestion + 1} of {poll.questions.length}
              </span>
            </div>

            {error && (
              <div className="error-message">
                ⚠️ {error}
              </div>
            )}

            {/* Question Card */}
            <div className="question-display">
              <h2 className="current-question">{currentQ.question}</h2>

              {currentQ.type === 'multiple-choice' ? (
                <div className="options-container">
                  {currentQ.options.map((option, index) => (
                    <label 
                      key={index} 
                      className={`option-card ${answers[currentQuestion] === option ? 'selected' : ''}`}
                    >
                      <input
                        type="radio"
                        name={`question-${currentQuestion}`}
                        value={option}
                        checked={answers[currentQuestion] === option}
                        onChange={(e) => handleAnswerChange(currentQuestion, e.target.value)}
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
                    placeholder="Type your answer (max 5 words)..."
                    value={answers[currentQuestion] || ''}
                    onChange={(e) => handleAnswerChange(currentQuestion, e.target.value)}
                    maxLength={100}
                  />
                </div>
              )}
            </div>

            {/* Navigation */}
            <div className="question-navigation">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handlePrevious}
                disabled={currentQuestion === 0}
              >
                ← Previous
              </button>

              {/* Question Dots */}
              <div className="question-dots">
                {poll.questions.map((_, index) => (
                  <button
                    key={index}
                    className={`dot ${index === currentQuestion ? 'active' : ''} ${answers[index] && answers[index].trim() ? 'answered' : ''}`}
                    onClick={() => setCurrentQuestion(index)}
                    title={`Question ${index + 1}`}
                  />
                ))}
              </div>

              {currentQuestion < poll.questions.length - 1 ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleNext}
                >
                  Next →
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <span className="spinner" style={{ width: '20px', height: '20px', borderWidth: '3px' }}></span>
                      Submitting...
                    </>
                  ) : (
                    <>🚀 Submit All</>
                  )}
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="success-screen card">
            <div className="success-icon">🎉</div>
            <h2>Thank You!</h2>
            <p className="success-text">Your responses have been submitted successfully.</p>
            <p className="success-subtext">The poll admin can see all responses in real-time.</p>
            
            <div className="explore-section">
              <p className="explore-text">Want to learn more about what we do?</p>
              <a 
                href="https://echo-s.ai/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="btn btn-primary"
              >
                🌐 Explore Echos
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Poll;
