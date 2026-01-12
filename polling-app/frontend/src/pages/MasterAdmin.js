import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';
import './MasterAdmin.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const MasterAdmin = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({ totalPolls: 0, totalMemoryUsed: '0 KB' });
  const [expandedPoll, setExpandedPoll] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await axios.post(`${API_URL}/api/admin/verify`, { password });
      setIsAuthenticated(true);
      localStorage.setItem('adminPassword', password);
      fetchPolls(password);
    } catch (err) {
      setError('Invalid admin password');
      setLoading(false);
    }
  };

  const fetchPolls = async (pwd) => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/admin/polls?password=${pwd}`);
      setPolls(response.data.polls);
      setStats({
        totalPolls: response.data.totalPolls,
        totalMemoryUsed: response.data.totalMemoryUsed
      });
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch polls');
      setLoading(false);
    }
  };

  const handleDeletePoll = async (pollId, pollTitle) => {
    if (deleteConfirm !== pollId) {
      setDeleteConfirm(pollId);
      return;
    }

    try {
      const pwd = localStorage.getItem('adminPassword');
      await axios.delete(`${API_URL}/api/admin/polls/${pollId}?password=${pwd}`);
      setPolls(polls.filter(p => p.id !== pollId));
      setStats(prev => ({ ...prev, totalPolls: prev.totalPolls - 1 }));
      setDeleteConfirm(null);
    } catch (err) {
      setError('Failed to delete poll');
    }
  };

  const handleDeleteAllPolls = async () => {
    if (!window.confirm('⚠️ Are you sure you want to delete ALL polls? This cannot be undone!')) {
      return;
    }
    if (!window.confirm('⚠️ FINAL WARNING: This will permanently delete all polls and votes. Continue?')) {
      return;
    }

    try {
      const pwd = localStorage.getItem('adminPassword');
      await axios.delete(`${API_URL}/api/admin/polls?password=${pwd}&confirm=DELETE_ALL_POLLS`);
      setPolls([]);
      setStats({ totalPolls: 0, totalMemoryUsed: '0 KB' });
      alert('All polls deleted successfully');
    } catch (err) {
      setError('Failed to delete all polls');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  useEffect(() => {
    const savedPassword = localStorage.getItem('adminPassword');
    if (savedPassword) {
      setPassword(savedPassword);
      setIsAuthenticated(true);
      fetchPolls(savedPassword);
    }
  }, []);

  // Login Screen
  if (!isAuthenticated) {
    return (
      <div className="master-admin-page fade-in">
        <div className="login-container card">
          <div className="login-header">
            <span className="admin-icon">🔐</span>
            <h1>Master Admin Panel</h1>
            <p>Enter the admin password to manage all polls</p>
          </div>

          {error && <div className="error-message">⚠️ {error}</div>}

          <form onSubmit={handleLogin} className="login-form">
            <div className="input-group">
              <label className="input-label">Admin Password</label>
              <input
                type="password"
                className="input-field"
                placeholder="Enter admin password..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary btn-large" disabled={loading}>
              {loading ? 'Verifying...' : '🔓 Access Admin Panel'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Admin Dashboard
  return (
    <div className="master-admin-page fade-in">
      <div className="admin-container">
        {/* Header */}
        <div className="admin-header card">
          <div className="header-content">
            <div>
              <span className="admin-badge">🔐 Master Admin</span>
              <h1>Poll Management</h1>
            </div>
            <div className="header-stats">
              <div className="stat-item">
                <span className="stat-value">{stats.totalPolls}</span>
                <span className="stat-label">Total Polls</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{stats.totalMemoryUsed}</span>
                <span className="stat-label">Memory Used</span>
              </div>
            </div>
          </div>
          <div className="header-actions">
            <button className="btn btn-primary" onClick={() => navigate('/create')}>
              + Create New Poll
            </button>
            <button className="btn btn-secondary" onClick={() => fetchPolls(password)}>
              🔄 Refresh
            </button>
            {polls.length > 0 && (
              <button className="btn btn-danger" onClick={handleDeleteAllPolls}>
                🗑️ Delete All
              </button>
            )}
            <button 
              className="btn btn-outline" 
              onClick={() => {
                localStorage.removeItem('adminPassword');
                setIsAuthenticated(false);
                setPassword('');
              }}
            >
              🚪 Logout
            </button>
          </div>
        </div>

        {error && <div className="error-message">⚠️ {error}</div>}

        {/* Polls List */}
        {loading ? (
          <div className="loading">
            <div className="spinner"></div>
            <p>Loading polls...</p>
          </div>
        ) : polls.length === 0 ? (
          <div className="empty-state card">
            <span className="empty-icon">📭</span>
            <h2>No Polls Yet</h2>
            <p>Create your first poll to get started</p>
            <button className="btn btn-primary" onClick={() => navigate('/create')}>
              + Create Poll
            </button>
          </div>
        ) : (
          <div className="polls-list">
            {polls.map((poll) => (
              <div key={poll.id} className="poll-card card">
                <div className="poll-card-header">
                  <div className="poll-info">
                    <h3 className="poll-title">{poll.title}</h3>
                    <div className="poll-meta">
                      <span className="meta-item">📝 {poll.questionsCount} questions</span>
                      <span className="meta-item">👥 {poll.totalParticipants} participants</span>
                      <span className="meta-item">📅 {formatDate(poll.createdAt)}</span>
                      <span className={`status-badge ${poll.active ? 'active' : 'inactive'}`}>
                        {poll.active ? '🟢 Active' : '🔴 Inactive'}
                      </span>
                    </div>
                  </div>
                  <div className="poll-actions">
                    <button
                      className="btn btn-small btn-secondary"
                      onClick={() => setExpandedPoll(expandedPoll === poll.id ? null : poll.id)}
                    >
                      {expandedPoll === poll.id ? '▲ Hide' : '▼ Details'}
                    </button>
                    <button
                      className="btn btn-small btn-outline"
                      onClick={() => navigate(`/poll/${poll.id}/edit/${poll.adminToken}`)}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      className="btn btn-small btn-primary"
                      onClick={() => navigate(`/poll/${poll.id}/admin/${poll.adminToken}`)}
                    >
                      📊 Results
                    </button>
                    <button
                      className={`btn btn-small ${deleteConfirm === poll.id ? 'btn-danger-confirm' : 'btn-danger'}`}
                      onClick={() => handleDeletePoll(poll.id, poll.title)}
                    >
                      {deleteConfirm === poll.id ? '⚠️ Confirm' : '🗑️'}
                    </button>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedPoll === poll.id && (
                  <div className="poll-details">
                    <div className="details-section">
                      <h4>Questions:</h4>
                      <div className="questions-list">
                        {poll.questions.map((q, index) => (
                          <div key={index} className="question-item">
                            <span className="q-number">Q{index + 1}</span>
                            <span className="q-text">{q.question}</span>
                            <span className="q-type">{q.type === 'multiple-choice' ? '✓ MC' : '💬 Text'}</span>
                            <span className="q-votes">{q.totalVotes} votes</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="details-section">
                      <h4>QR Code & Links:</h4>
                      <div className="qr-links-row">
                        <div className="qr-mini-box">
                          <QRCodeSVG 
                            value={`${window.location.origin}/poll/${poll.id}`}
                            size={100}
                            bgColor="#0D1B2A"
                            fgColor="#8B9A6D"
                            level="H"
                            includeMargin={true}
                          />
                          <span className="qr-mini-label">Scan to Vote</span>
                        </div>
                        <div className="links-list">
                          <div className="link-item">
                            <span className="link-label">Voter Link:</span>
                            <code>{window.location.origin}/poll/{poll.id}</code>
                            <button 
                              className="btn btn-tiny"
                              onClick={() => copyToClipboard(`${window.location.origin}/poll/${poll.id}`)}
                            >
                              📋
                            </button>
                          </div>
                          <div className="link-item">
                            <span className="link-label">Admin Link:</span>
                            <code>{window.location.origin}/poll/{poll.id}/admin/{poll.adminToken}</code>
                            <button 
                              className="btn btn-tiny"
                              onClick={() => copyToClipboard(`${window.location.origin}/poll/${poll.id}/admin/${poll.adminToken}`)}
                            >
                              📋
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MasterAdmin;

