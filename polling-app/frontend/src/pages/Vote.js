import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const Vote = () => {
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchActivePoll = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/active-poll`);
        // Redirect to the active poll
        navigate(`/poll/${response.data.pollId}`, { replace: true });
      } catch (err) {
        setError('No active poll available at the moment.');
      }
    };

    fetchActivePoll();
  }, [navigate]);

  if (error) {
    return (
      <div className="vote-page fade-in">
        <div className="error-container card" style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📭</div>
          <h2 style={{ marginBottom: '1rem' }}>No Active Poll</h2>
          <p style={{ color: 'var(--echos-text-light)' }}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="loading">
      <div className="spinner"></div>
      <p>Loading poll...</p>
    </div>
  );
};

export default Vote;

