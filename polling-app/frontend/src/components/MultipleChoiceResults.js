import React from 'react';
import './MultipleChoiceResults.css';

const MultipleChoiceResults = ({ results, totalVotes }) => {
  const options = Object.keys(results);
  const votes = Object.values(results);
  const percentages = votes.map(v => totalVotes > 0 ? Math.round((v / totalVotes) * 100) : 0);

  return (
    <div className="multiple-choice-results">
      <div className="results-bars">
        {options.map((option, index) => (
          <div key={option} className="result-bar-container">
            <div className="result-label">
              <span className="option-name">{option}</span>
              <span className="vote-count">{votes[index]} votes</span>
            </div>
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ 
                  width: `${percentages[index]}%`,
                  animationDelay: `${index * 0.1}s`
                }}
              >
                <span className="percentage-label">{percentages[index]}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MultipleChoiceResults;
