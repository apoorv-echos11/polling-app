import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';
import MultipleChoiceResults from '../components/MultipleChoiceResults';
import OneWordResults from '../components/OneWordResults';
import './AdminDashboard.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const AdminDashboard = () => {
  const { pollId, adminToken } = useParams();
  const navigate = useNavigate();
  const [socket, setSocket] = useState(null);
  const [poll, setPoll] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeQuestion, setActiveQuestion] = useState(0);

  useEffect(() => {
    // Verify admin access and load poll
    verifyAdmin();

    // Initialize Socket.io connection
    const newSocket = io(API_URL);
    setSocket(newSocket);

    // Join admin room
    newSocket.emit('join-admin', { pollId, adminToken });

    // Listen for poll data
    newSocket.on('poll-data', (pollData) => {
      setPoll(pollData);
      setLoading(false);
    });

    // Listen for results updates
    newSocket.on('results-update', (resultsData) => {
      setResults(resultsData);
    });

    // Listen for admin errors
    newSocket.on('admin-error', (data) => {
      setError(data.error);
      setLoading(false);
    });

    return () => {
      if (newSocket) {
        newSocket.emit('leave-poll', pollId);
        newSocket.disconnect();
      }
    };
  }, [pollId, adminToken]);

  const verifyAdmin = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/polls/${pollId}/admin/${adminToken}`);
      setPoll(response.data.poll);
      
      const resultsResponse = await axios.get(`${API_URL}/api/polls/${pollId}/results`);
      setResults(resultsResponse.data);
      
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to verify admin access');
      setLoading(false);
    }
  };

  const copyVoterLink = () => {
    const link = `${window.location.origin}/vote`;
    navigator.clipboard.writeText(link).then(() => {
      alert('Voter link copied to clipboard!');
    });
  };

  const copyAdminLink = () => {
    const link = window.location.href;
    navigator.clipboard.writeText(link).then(() => {
      alert('Admin link copied to clipboard!');
    });
  };

  const clearResults = async () => {
    if (!window.confirm('⚠️ Clear all results? This will reset all votes to 0 and cannot be undone.')) {
      return;
    }

    try {
      await axios.post(`${API_URL}/api/polls/${pollId}/clear-results`, { adminToken });
      alert('✅ Results cleared successfully!');
    } catch (err) {
      alert('Failed to clear results: ' + (err.response?.data?.error || 'Unknown error'));
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Loading admin dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container card">
        <div className="error-message">
          ⚠️ {error}
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/')}>
          Back to Home
        </button>
      </div>
    );
  }

  const currentResult = results?.results?.[activeQuestion];

  return (
    <div className="admin-dashboard fade-in">
      <div className="admin-container">
        {/* Header */}
        <div className="admin-header card">
          <div className="admin-header-content">
            <div>
              <span className="admin-badge">👑 Admin Dashboard</span>
              <h1 className="admin-title">{poll.title}</h1>
            </div>
            <div className="admin-stats">
              <div className="stat-box">
                <span className="stat-number">{results?.totalParticipants || 0}</span>
                <span className="stat-label">Participants</span>
              </div>
              <div className="stat-box">
                <span className="stat-number">{poll.questions.length}</span>
                <span className="stat-label">Questions</span>
              </div>
            </div>
          </div>
          
          <div className="admin-actions">
            <button 
              className="btn btn-outline" 
              onClick={() => navigate(`/poll/${pollId}/edit/${adminToken}`)}
            >
              ✏️ Edit Poll
            </button>
            <button className="btn btn-primary" onClick={copyVoterLink}>
              📋 Copy Voter Link
            </button>
            <button className="btn btn-secondary" onClick={copyAdminLink}>
              🔗 Copy Admin Link
            </button>
            <button className="btn btn-danger" onClick={clearResults}>
              🔄 Clear Results
            </button>
          </div>
        </div>

        {/* Live Indicator & QR Code */}
        <div className="live-qr-section">
          <div className="live-indicator">
            <span className="live-dot"></span>
            <span>Live - Results update in real-time</span>
          </div>
          
          <div className="qr-code-box">
            <div className="qr-code-wrapper">
              <QRCodeSVG 
                value={`${window.location.origin}/vote`}
                size={120}
                bgColor="#1B2838"
                fgColor="#8B9A6D"
                level="H"
                includeMargin={true}
              />
            </div>
            <div className="qr-info">
              <span className="qr-label">Scan to Vote</span>
              <button 
                className="btn btn-small btn-primary"
                onClick={copyVoterLink}
              >
                📋 Copy Link
              </button>
            </div>
          </div>
        </div>

        {/* Question Tabs */}
        <div className="question-tabs">
          {poll.questions.map((q, index) => (
            <button
              key={index}
              className={`question-tab ${activeQuestion === index ? 'active' : ''}`}
              onClick={() => setActiveQuestion(index)}
            >
              <span className="tab-number">Q{index + 1}</span>
              <span className="tab-type">
                {q.type === 'multiple-choice' ? '✓' : '💬'}
              </span>
            </button>
          ))}
        </div>

        {/* Active Question Results */}
        {currentResult && (
          <div className="results-panel card">
            <div className="results-header">
              <div className="results-question-info">
                <h2 className="results-question">{currentResult.question}</h2>
              </div>
              <div className="results-votes-count">
                <span className="votes-number">{currentResult.totalVotes}</span>
                <span className="votes-label">responses</span>
              </div>
            </div>

            <div className="results-content">
              {currentResult.type === 'multiple-choice' ? (
                <MultipleChoiceResults 
                  results={currentResult.votes} 
                  totalVotes={currentResult.totalVotes} 
                />
              ) : (
                <OneWordResults results={currentResult.votes} />
              )}
            </div>
          </div>
        )}

        {/* All Questions Overview */}
        <div className="overview-section">
          <h3 className="overview-title">All Questions Overview</h3>
          <div className="overview-grid">
            {results?.results?.map((result, index) => (
              <div 
                key={index} 
                className={`overview-card ${activeQuestion === index ? 'active' : ''}`}
                onClick={() => setActiveQuestion(index)}
              >
                <div className="overview-card-header">
                  <span className="overview-number">Q{index + 1}</span>
                  <span className="overview-type">
                    {result.type === 'multiple-choice' ? '✓' : '💬'}
                  </span>
                </div>
                <p className="overview-question">{result.question}</p>
                <div className="overview-stats">
                  <span className="overview-responses">{result.totalVotes} responses</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;

