import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './EditPoll.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const EditPoll = () => {
  const { pollId, adminToken } = useParams();
  const navigate = useNavigate();
  const [poll, setPoll] = useState(null);
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [draggedIndex, setDraggedIndex] = useState(null);

  useEffect(() => {
    loadPoll();
  }, [pollId, adminToken]);

  const loadPoll = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/polls/${pollId}/admin/${adminToken}`);
      const pollData = response.data.poll;
      setPoll(pollData);
      setTitle(pollData.title);
      setQuestions(pollData.questions.map(q => ({
        question: q.question,
        type: q.type,
        options: q.options || ['', ''],
        totalVotes: q.totalVotes || 0
      })));
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load poll');
      setLoading(false);
    }
  };

  const handleQuestionChange = (index, field, value) => {
    const newQuestions = [...questions];
    newQuestions[index][field] = value;
    
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

  const handleAddQuestion = () => {
    if (questions.length < 7) {
      setQuestions([...questions, {
        question: '',
        type: 'multiple-choice',
        options: ['', ''],
        totalVotes: 0
      }]);
    }
  };

  const handleRemoveQuestion = (index) => {
    if (questions.length > 1) {
      setQuestions(questions.filter((_, i) => i !== index));
    }
  };

  // Drag and Drop handlers
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.target.classList.add('dragging');
  };

  const handleDragEnd = (e) => {
    e.target.classList.remove('dragging');
    setDraggedIndex(null);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    
    const newQuestions = [...questions];
    const draggedItem = newQuestions[draggedIndex];
    newQuestions.splice(draggedIndex, 1);
    newQuestions.splice(index, 0, draggedItem);
    
    setDraggedIndex(index);
    setQuestions(newQuestions);
  };

  // Move question up/down (alternative to drag)
  const moveQuestion = (index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= questions.length) return;
    
    const newQuestions = [...questions];
    const temp = newQuestions[index];
    newQuestions[index] = newQuestions[newIndex];
    newQuestions[newIndex] = temp;
    setQuestions(newQuestions);
  };

  const handleSave = async () => {
    setError('');
    setSuccess('');

    if (!title.trim()) {
      setError('Please enter a poll title');
      return;
    }

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

    setSaving(true);

    try {
      const cleanedQuestions = questions.map(q => ({
        question: q.question.trim(),
        type: q.type,
        options: q.type === 'multiple-choice' ? q.options.filter(opt => opt.trim()) : null
      }));

      await axios.put(`${API_URL}/api/polls/${pollId}`, {
        adminToken,
        title: title.trim(),
        questions: cleanedQuestions
      });

      setSuccess('Poll updated successfully!');
      setSaving(false);
      
      // Redirect to admin dashboard after short delay
      setTimeout(() => {
        navigate(`/poll/${pollId}/admin/${adminToken}`);
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update poll');
      setSaving(false);
    }
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
        <div className="error-message">⚠️ {error}</div>
        <button className="btn btn-primary" onClick={() => navigate('/admin')}>
          Back to Admin
        </button>
      </div>
    );
  }

  return (
    <div className="edit-poll-page fade-in">
      <div className="edit-poll-container card">
        <div className="edit-header">
          <h1 className="page-title">✏️ Edit Poll</h1>
          <p className="page-subtitle">Rearrange questions by dragging or using arrows. Edit text and options as needed.</p>
        </div>

        {error && <div className="error-message">⚠️ {error}</div>}
        {success && <div className="success-message">✅ {success}</div>}

        <div className="edit-form">
          {/* Poll Title */}
          <div className="input-group">
            <label className="input-label">Poll Title</label>
            <input
              type="text"
              className="input-field"
              placeholder="Enter poll title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Questions */}
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

            <div className="questions-list">
              {questions.map((q, qIndex) => (
                <div
                  key={qIndex}
                  className={`question-card ${draggedIndex === qIndex ? 'dragging' : ''}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, qIndex)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => handleDragOver(e, qIndex)}
                >
                  {/* Question Header with Drag Handle and Reorder Buttons */}
                  <div className="question-header">
                    <div className="drag-handle" title="Drag to reorder">
                      ⋮⋮
                    </div>
                    <span className="question-number">Question {qIndex + 1}</span>
                    {q.totalVotes > 0 && (
                      <span className="votes-badge">{q.totalVotes} votes</span>
                    )}
                    <div className="reorder-buttons">
                      <button
                        type="button"
                        className="btn-reorder"
                        onClick={() => moveQuestion(qIndex, -1)}
                        disabled={qIndex === 0}
                        title="Move up"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        className="btn-reorder"
                        onClick={() => moveQuestion(qIndex, 1)}
                        disabled={qIndex === questions.length - 1}
                        title="Move down"
                      >
                        ▼
                      </button>
                    </div>
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

                  {/* Question Text */}
                  <div className="input-group">
                    <textarea
                      className="textarea-field"
                      placeholder="Enter your question..."
                      value={q.question}
                      onChange={(e) => handleQuestionChange(qIndex, 'question', e.target.value)}
                      rows="2"
                    />
                  </div>

                  {/* Question Type */}
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

                  {/* Options for Multiple Choice */}
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
          </div>

          {/* Actions */}
          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate(`/poll/${pollId}/admin/${adminToken}`)}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <>
                  <span className="spinner" style={{ width: '20px', height: '20px', borderWidth: '3px' }}></span>
                  Saving...
                </>
              ) : (
                <>💾 Save Changes</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditPoll;

