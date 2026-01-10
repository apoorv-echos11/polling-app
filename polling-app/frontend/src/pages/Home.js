import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Home.css';

const Home = () => {
  const [pollId, setPollId] = useState('');
  const navigate = useNavigate();

  const handleJoinPoll = (e) => {
    e.preventDefault();
    if (pollId.trim()) {
      navigate(`/poll/${pollId.trim()}`);
    }
  };

  return (
    <div className="home-page fade-in">
      <div className="hero-section">
        <div className="hero-content card card-light">
          <h1 className="hero-title">
            Real-time Polling Made Simple
          </h1>
          <p className="hero-subtitle">
            Create engaging polls and get instant feedback from hundreds of participants simultaneously
          </p>
          
          <div className="hero-actions">
            <button 
              className="btn btn-primary btn-large"
              onClick={() => navigate('/create')}
            >
              Create New Poll →
            </button>
          </div>

          <div className="divider">
            <span>or</span>
          </div>

          <form onSubmit={handleJoinPoll} className="join-poll-form">
            <div className="input-group">
              <label className="input-label input-label-dark">Join an Existing Poll</label>
              <div className="input-with-button">
                <input
                  type="text"
                  className="input-field"
                  placeholder="Enter poll ID..."
                  value={pollId}
                  onChange={(e) => setPollId(e.target.value)}
                />
                <button type="submit" className="btn btn-primary">
                  Join →
                </button>
              </div>
            </div>
          </form>
        </div>

        <div className="features-grid">
          <div className="feature-card card">
            <div className="feature-icon">⚡</div>
            <h3>Real-time Results</h3>
            <p>Watch results update instantly as participants vote</p>
          </div>
          
          <div className="feature-card card">
            <div className="feature-icon">👥</div>
            <h3>500+ Users</h3>
            <p>Support for hundreds of concurrent participants</p>
          </div>
          
          <div className="feature-card card">
            <div className="feature-icon">🎨</div>
            <h3>Beautiful Animations</h3>
            <p>Engaging visualizations for every response</p>
          </div>
          
          <div className="feature-card card">
            <div className="feature-icon">🔒</div>
            <h3>No Sign-up</h3>
            <p>Quick and anonymous participation</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
