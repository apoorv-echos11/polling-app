import React, { useEffect, useRef } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import './MultipleChoiceResults.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const MultipleChoiceResults = ({ results, totalVotes }) => {
  const chartRef = useRef(null);

  const options = Object.keys(results);
  const votes = Object.values(results);
  const percentages = votes.map(v => totalVotes > 0 ? ((v / totalVotes) * 100).toFixed(1) : 0);

  const chartData = {
    labels: options,
    datasets: [
      {
        label: 'Votes',
        data: votes,
        backgroundColor: 'rgba(74, 157, 143, 0.8)',
        borderColor: 'rgba(74, 157, 143, 1)',
        borderWidth: 2,
        borderRadius: 8,
        hoverBackgroundColor: 'rgba(90, 176, 158, 0.9)',
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 1000,
      easing: 'easeOutQuart'
    },
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(45, 93, 82, 0.95)',
        padding: 12,
        titleFont: {
          size: 14,
          weight: 'bold'
        },
        bodyFont: {
          size: 13
        },
        callbacks: {
          label: function(context) {
            const value = context.parsed.y;
            const percent = totalVotes > 0 ? ((value / totalVotes) * 100).toFixed(1) : 0;
            return `${value} votes (${percent}%)`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
          font: {
            size: 12
          },
          color: '#4a9d8f'
        },
        grid: {
          color: 'rgba(74, 157, 143, 0.1)'
        }
      },
      x: {
        ticks: {
          font: {
            size: 12,
            weight: 'bold'
          },
          color: '#2d5d52'
        },
        grid: {
          display: false
        }
      }
    }
  };

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

      <div className="chart-container">
        <Bar ref={chartRef} data={chartData} options={chartOptions} />
      </div>
    </div>
  );
};

export default MultipleChoiceResults;
