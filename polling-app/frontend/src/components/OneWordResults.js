import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import cloud from 'd3-cloud';
import { motion, AnimatePresence } from 'framer-motion';
import './OneWordResults.css';

const OneWordResults = ({ results }) => {
  const svgRef = useRef(null);
  const [displayMode, setDisplayMode] = useState('bubbles'); // 'bubbles', 'wordcloud', 'list'
  const [wordFrequency, setWordFrequency] = useState({});

  useEffect(() => {
    // Calculate word frequency
    const frequency = {};
    results.forEach(item => {
      const word = item.text.toLowerCase();
      frequency[word] = (frequency[word] || 0) + 1;
    });
    setWordFrequency(frequency);
  }, [results]);

  useEffect(() => {
    if (displayMode === 'wordcloud' && Object.keys(wordFrequency).length > 0) {
      renderWordCloud();
    } else if (displayMode === 'bubbles' && results.length > 0) {
      renderBubbles();
    }
  }, [displayMode, wordFrequency, results]);

  const renderWordCloud = () => {
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = svgRef.current.clientWidth;
    const height = 400;

    // Limit word display length and calculate sizes
    const words = Object.entries(wordFrequency).map(([text, value]) => ({
      text: text.length > 20 ? text.substring(0, 18) + '...' : text,
      fullText: text,
      size: Math.min(60, 18 + (value * 8)), // Cap max size
      count: value
    }));

    const layout = cloud()
      .size([width, height])
      .words(words)
      .padding(8)
      .rotate(() => (Math.random() > 0.8 ? 90 : 0)) // Some vertical words
      .font('Inter')
      .fontSize(d => d.size)
      .on('end', draw);

    layout.start();

    function draw(words) {
      // Use Echos brand colors
      const colorScale = d3.scaleSequential()
        .domain([1, d3.max(Object.values(wordFrequency)) || 1])
        .interpolator(d3.interpolateRgb('#A3B085', '#6F7D56'));

      svg
        .attr('width', width)
        .attr('height', height)
        .append('g')
        .attr('transform', `translate(${width / 2}, ${height / 2})`)
        .selectAll('text')
        .data(words)
        .enter()
        .append('text')
        .style('font-size', d => `${d.size}px`)
        .style('font-family', 'Inter, sans-serif')
        .style('font-weight', '600')
        .style('fill', d => colorScale(d.count))
        .style('cursor', 'pointer')
        .style('text-shadow', '0 2px 4px rgba(0,0,0,0.2)')
        .attr('text-anchor', 'middle')
        .attr('transform', d => `translate(${d.x}, ${d.y}) rotate(${d.rotate})`)
        .text(d => d.text)
        .style('opacity', 0)
        .on('mouseover', function() {
          d3.select(this).style('transform', 'scale(1.1)');
        })
        .on('mouseout', function() {
          d3.select(this).style('transform', 'scale(1)');
        })
        .transition()
        .duration(800)
        .delay((d, i) => i * 50)
        .style('opacity', 1);

      // Add tooltips for full text
      svg.selectAll('text')
        .append('title')
        .text(d => `${d.fullText} (${d.count}x)`);
    }
  };

  const renderBubbles = () => {
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = svgRef.current.clientWidth;
    const height = 500;

    // Calculate bubble radius based on text length
    const calculateRadius = (text) => {
      const baseRadius = 35;
      const charWidth = 7; // approximate width per character
      const textLength = text.length;
      // Minimum radius that fits the text with some padding
      const neededRadius = Math.max(baseRadius, (textLength * charWidth) / 2 + 15);
      // Add some randomness but ensure minimum size
      return neededRadius + Math.random() * 10;
    };

    // Calculate font size based on bubble radius and text length
    const calculateFontSize = (text, radius) => {
      const maxFontSize = 16;
      const minFontSize = 10;
      // Calculate font size that fits in bubble
      const fittingSize = (radius * 1.6) / Math.max(text.length * 0.5, 3);
      return Math.max(minFontSize, Math.min(maxFontSize, fittingSize));
    };

    const nodes = results.map((item, i) => {
      const radius = calculateRadius(item.text);
      return {
        id: i,
        text: item.text,
        radius: radius,
        fontSize: calculateFontSize(item.text, radius)
      };
    });

    // Use Echos brand colors
    const colorScale = d3.scaleOrdinal()
      .domain(nodes.map(d => d.id))
      .range(['#8B9A6D', '#9AAD7A', '#A3B085', '#6F7D56', '#7A8961']);

    const simulation = d3.forceSimulation(nodes)
      .force('charge', d3.forceManyBody().strength(5))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(d => d.radius + 3));

    const svgElement = svg
      .attr('width', width)
      .attr('height', height);

    const bubbles = svgElement
      .selectAll('g')
      .data(nodes)
      .enter()
      .append('g')
      .call(d3.drag()
        .on('start', dragStarted)
        .on('drag', dragged)
        .on('end', dragEnded));

    bubbles
      .append('circle')
      .attr('r', 0)
      .style('fill', d => colorScale(d.id))
      .style('opacity', 0.9)
      .style('stroke', 'rgba(255,255,255,0.3)')
      .style('stroke-width', 2)
      .style('filter', 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))')
      .style('cursor', 'grab')
      .transition()
      .duration(800)
      .ease(d3.easeBounceOut)
      .attr('r', d => d.radius);

    // Add text with proper sizing
    bubbles
      .append('text')
      .text(d => d.text.length > 15 ? d.text.substring(0, 13) + '...' : d.text)
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .style('fill', '#fff')
      .style('font-size', d => `${d.fontSize}px`)
      .style('font-weight', '600')
      .style('pointer-events', 'none')
      .style('user-select', 'none')
      .style('text-shadow', '0 1px 2px rgba(0,0,0,0.3)')
      .style('opacity', 0)
      .transition()
      .delay(400)
      .duration(400)
      .style('opacity', 1);

    // Add tooltip for long text
    bubbles
      .append('title')
      .text(d => d.text);

    simulation.on('tick', () => {
      bubbles.attr('transform', d => `translate(${d.x}, ${d.y})`);
    });

    function dragStarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
      d3.select(event.sourceEvent.target).style('cursor', 'grabbing');
    }

    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragEnded(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
      d3.select(event.sourceEvent.target).style('cursor', 'grab');
    }
  };

  if (results.length === 0) {
    return (
      <div className="no-results">
        <p>No responses yet. Be the first to answer!</p>
      </div>
    );
  }

  return (
    <div className="one-word-results">
      <div className="display-mode-selector">
        <button
          className={`mode-btn ${displayMode === 'bubbles' ? 'active' : ''}`}
          onClick={() => setDisplayMode('bubbles')}
        >
          🫧 Bubbles
        </button>
        <button
          className={`mode-btn ${displayMode === 'wordcloud' ? 'active' : ''}`}
          onClick={() => setDisplayMode('wordcloud')}
        >
          ☁️ Word Cloud
        </button>
        <button
          className={`mode-btn ${displayMode === 'list' ? 'active' : ''}`}
          onClick={() => setDisplayMode('list')}
        >
          📝 List
        </button>
      </div>

      {(displayMode === 'bubbles' || displayMode === 'wordcloud') && (
        <div className="visualization-container">
          <svg ref={svgRef} className="visualization-svg"></svg>
        </div>
      )}

      {displayMode === 'list' && (
        <div className="list-view">
          <AnimatePresence>
            {results.slice().reverse().map((item, index) => (
              <motion.div
                key={`${item.userId}-${item.timestamp}-${index}`}
                className="list-item"
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 50 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <div className="item-bubble">
                  <span className="item-text">{item.text}</span>
                  <span className="item-time">
                    {new Date(item.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <div className="frequency-summary">
        <h3>Most Popular Responses:</h3>
        <div className="frequency-list">
          {Object.entries(wordFrequency)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([word, count], index) => (
              <div key={word} className="frequency-item">
                <span className="rank">#{index + 1}</span>
                <span className="word">{word}</span>
                <span className="count">{count}x</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default OneWordResults;
