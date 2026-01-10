import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';
import './CreatePoll.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const emptyQuestion = () => ({
  question: '',
  type: 'multiple-choice',
  options: ['', '']
});

const CreatePoll = () => {
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState([emptyQuestion()]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdPoll, setCreatedPoll] = useState(null);
  const navigate = useNavigate();

  const handleAddQuestion = () => {
    if (questions.length < 7) {
      setQuestions([...questions, emptyQuestion()]);
    }
  };

  const handleRemoveQuestion = (index) => {
    if (questions.length > 1) {
      setQuestions(questions.filter((_, i) => i !== index));
    }
  };

  const handleQuestionChange = (index, field, value) => {
    const newQuestions = [...questions];
    newQuestions[index][field] = value;
    
    // Reset options when switching to one-word type
    if (field === 'type' && value === 'one-word') {
      newQuestions[index].options = [];
    } else if (field === 'type' && value === 'multiple-choice') {
      newQuestions[index].options = ['', ''];
    }
    
    setQuestions(newQuestions);
  };

  const handleAddOption = (questionIndex) => {
    const newQuestions = [...questions];
    if (newQuestions[questionIndex].options.length < 6) {
      newQuestions[questionIndex].options.push('');
      setQuestions(newQuestions);
    }
  };

  const handleRemoveOption = (questionIndex, optionIndex) => {
    const newQuestions = [...questions];
    if (newQuestions[questionIndex].options.length > 2) {
      newQuestions[questionIndex].options = newQuestions[questionIndex].options.filter((_, i) => i !== optionIndex);
      setQuestions(newQuestions);
    }
  };

  const handleOptionChange = (questionIndex, optionIndex, value) => {
    const newQuestions = [...questions];
    newQuestions[questionIndex].options[optionIndex] = value;
    setQuestions(newQuestions);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Please enter a poll title');
      return;
    }

    // Validate all questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question.trim()) {
        setError(`Question ${i + 1}: Please enter a question`);
        return;
      }
      if (q.type === 'multiple-choice') {
        const validOptions = q.options.filter(opt => opt.trim());
        if (validOptions.length < 2) {
          setError(`Question ${i + 1}: Please provide at least 2 options`);
          return;
        }
      }
    }

    setLoading(true);

    try {
      // Clean up questions before sending
      const cleanedQuestions = questions.map(q => ({
        question: q.question.trim(),
        type: q.type,
        options: q.type === 'multiple-choice' ? q.options.filter(opt => opt.trim()) : null
      }));

      const response = await axios.post(`${API_URL}/api/polls`, {
        title: title.trim(),
        questions: cleanedQuestions
      });

      const { pollId, adminToken, voterLink, adminLink } = response.data;
      
      // Show the created poll info with links
      setCreatedPoll({
        pollId,
        adminToken,
        voterLink: `${window.location.origin}${voterLink}`,
        adminLink: `${window.location.origin}${adminLink}`
      });
      
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create poll');
      setLoading(false);
    }
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text).then(() => {
      alert(`${label} copied to clipboard!`);
    });
  };

  // Show success screen after poll is created
  if (createdPoll) {
    return (
      <div className="create-poll-page fade-in">
        <div className="create-poll-container card">
          <div className="success-screen">
            <div className="success-icon">🎉</div>
            <h1 className="page-title">Poll Created Successfully!</h1>
            <p className="page-subtitle">Share the voter link with participants and use the admin link to view live results</p>
            
            <div className="links-section">
              {/* QR Code Section */}
              <div className="qr-code-section">
                <label className="input-label">Scan to Vote</label>
                <div className="qr-code-container">
                  <QRCodeSVG 
                    value={createdPoll.voterLink}
                    size={200}
                    bgColor="#1B2838"
                    fgColor="#8B9A6D"
                    level="H"
                    includeMargin={true}
                  />
                </div>
                <p className="qr-hint">Display this QR code for participants to scan</p>
              </div>

              <div className="link-box">
                <label className="input-label">Voter Link (Share with participants)</label>
                <div className="link-display">
                  <input 
                    type="text" 
                    className="input-field" 
                    value={createdPoll.voterLink} 
                    readOnly 
                  />
                  <button 
                    className="btn btn-primary"
                    onClick={() => copyToClipboard(createdPoll.voterLink, 'Voter link')}
                  >
                    📋 Copy
                  </button>
                </div>
              </div>

              <div className="link-box">
                <label className="input-label">Admin Link (View live results)</label>
                <div className="link-display">
                  <input 
                    type="text" 
                    className="input-field" 
                    value={createdPoll.adminLink} 
                    readOnly 
                  />
                  <button 
                    className="btn btn-primary"
                    onClick={() => copyToClipboard(createdPoll.adminLink, 'Admin link')}
                  >
                    📋 Copy
                  </button>
                </div>
                <p className="link-warning">⚠️ Keep this link private - it gives access to all responses</p>
              </div>
            </div>

            <div className="success-actions">
              <button 
                className="btn btn-secondary"
                onClick={() => navigate('/')}
              >
                ← Back to Home
              </button>
              <button 
                className="btn btn-primary"
                onClick={() => navigate(createdPoll.adminLink.replace(window.location.origin, ''))}
              >
                Open Admin Dashboard →
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="create-poll-page fade-in">
      <div className="create-poll-container card">
        <h1 className="page-title">Create a New Poll</h1>
        <p className="page-subtitle">Add up to 7 questions and watch responses come in real-time</p>

        {error && (
          <div className="error-message">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="poll-form">
          <div className="input-group">
            <label className="input-label">Poll Title *</label>
            <input
              type="text"
              className="input-field"
              placeholder="Give your poll a title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="questions-section">
            <div className="questions-header">
              <label className="input-label">Questions ({questions.length}/7)</label>
              {questions.length < 7 && (
                <button
                  type="button"
                  className="btn btn-secondary btn-small"
                  onClick={handleAddQuestion}
                >
                  + Add Question
                </button>
              )}
            </div>

            {questions.map((q, qIndex) => (
              <div key={qIndex} className="question-card">
                <div className="question-header">
                  <span className="question-number">Question {qIndex + 1}</span>
                  {questions.length > 1 && (
                    <button
                      type="button"
                      className="btn-remove-question"
                      onClick={() => handleRemoveQuestion(qIndex)}
                      title="Remove question"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="input-group">
                  <textarea
                    className="textarea-field"
                    placeholder="What would you like to ask?"
                    value={q.question}
                    onChange={(e) => handleQuestionChange(qIndex, 'question', e.target.value)}
                    rows="2"
                  />
                </div>

                <div className="input-group">
                  <label className="input-label input-label-small">Question Type</label>
                  <div className="poll-type-selector compact">
                    <button
                      type="button"
                      className={`poll-type-btn compact ${q.type === 'multiple-choice' ? 'active' : ''}`}
                      onClick={() => handleQuestionChange(qIndex, 'type', 'multiple-choice')}
                    >
                      <span className="type-icon">✓</span>
                      <span className="type-title">Multiple Choice</span>
                    </button>
                    
                    <button
                      type="button"
                      className={`poll-type-btn compact ${q.type === 'one-word' ? 'active' : ''}`}
                      onClick={() => handleQuestionChange(qIndex, 'type', 'one-word')}
                    >
                      <span className="type-icon">💬</span>
                      <span className="type-title">Open Text</span>
                    </button>
                  </div>
                </div>

                {q.type === 'multiple-choice' && (
                  <div className="input-group">
                    <label className="input-label input-label-small">Answer Options</label>
                    <div className="options-list">
                      {q.options.map((option, oIndex) => (
                        <div key={oIndex} className="option-input-group">
                          <input
                            type="text"
                            className="input-field"
                            placeholder={`Option ${oIndex + 1}`}
                            value={option}
                            onChange={(e) => handleOptionChange(qIndex, oIndex, e.target.value)}
                          />
                          {q.options.length > 2 && (
                            <button
                              type="button"
                              className="btn-remove-option"
                              onClick={() => handleRemoveOption(qIndex, oIndex)}
                              title="Remove option"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    
                    {q.options.length < 6 && (
                      <button
                        type="button"
                        className="btn btn-outline btn-small"
                        onClick={() => handleAddOption(qIndex)}
                      >
                        + Add Option
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

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
