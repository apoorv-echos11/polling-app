import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './CreatePoll.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const CreatePoll = () => {
  const [question, setQuestion] = useState('');
  const [pollType, setPollType] = useState('multiple-choice');
  const [options, setOptions] = useState(['', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleAddOption = () => {
    if (options.length < 6) {
      setOptions([...options, '']);
    }
  };

  const handleRemoveOption = (index) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!question.trim()) {
      setError('Please enter a question');
      return;
    }

    if (pollType === 'multiple-choice') {
      const validOptions = options.filter(opt => opt.trim());
      if (validOptions.length < 2) {
        setError('Please provide at least 2 options');
        return;
      }
    }

    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/api/polls`, {
        question: question.trim(),
        type: pollType,
        options: pollType === 'multiple-choice' ? options.filter(opt => opt.trim()) : null
      });

      const { pollId } = response.data;
      navigate(`/poll/${pollId}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create poll');
      setLoading(false);
    }
  };

  return (
    <div className="create-poll-page fade-in">
      <div className="create-poll-container card">
        <h1 className="page-title">Create a New Poll</h1>
        <p className="page-subtitle">Design your question and watch responses come in real-time</p>

        {error && (
          <div className="error-message">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="poll-form">
          <div className="input-group">
            <label className="input-label">Poll Question *</label>
            <textarea
              className="textarea-field"
              placeholder="What would you like to ask?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows="3"
              required
            />
          </div>

          <div className="input-group">
            <label className="input-label">Poll Type *</label>
            <div className="poll-type-selector">
              <button
                type="button"
                className={`poll-type-btn ${pollType === 'multiple-choice' ? 'active' : ''}`}
                onClick={() => setPollType('multiple-choice')}
              >
                <span className="type-icon">✓</span>
                <div>
                  <div className="type-title">Multiple Choice</div>
                  <div className="type-desc">Participants select from options</div>
                </div>
              </button>
              
              <button
                type="button"
                className={`poll-type-btn ${pollType === 'one-word' ? 'active' : ''}`}
                onClick={() => setPollType('one-word')}
              >
                <span className="type-icon">💬</span>
                <div>
                  <div className="type-title">One Word Answer</div>
                  <div className="type-desc">Free text responses</div>
                </div>
              </button>
            </div>
          </div>

          {pollType === 'multiple-choice' && (
            <div className="input-group">
              <label className="input-label">Answer Options *</label>
              <div className="options-list">
                {options.map((option, index) => (
                  <div key={index} className="option-input-group">
                    <input
                      type="text"
                      className="input-field"
                      placeholder={`Option ${index + 1}`}
                      value={option}
                      onChange={(e) => handleOptionChange(index, e.target.value)}
                    />
                    {options.length > 2 && (
                      <button
                        type="button"
                        className="btn-remove-option"
                        onClick={() => handleRemoveOption(index)}
                        title="Remove option"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
              
              {options.length < 6 && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleAddOption}
                >
                  + Add Option
                </button>
              )}
            </div>
          )}

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate('/')}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner" style={{ width: '20px', height: '20px', borderWidth: '3px' }}></span>
                  Creating...
                </>
              ) : (
                <>🚀 Create Poll</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePoll;
