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

    const words = Object.entries(wordFrequency).map(([text, value]) => ({
      text,
      size: 20 + (value * 10)
    }));

    const layout = cloud()
      .size([width, height])
      .words(words)
      .padding(5)
      .rotate(() => 0)
      .font('Inter')
      .fontSize(d => d.size)
      .on('end', draw);

    layout.start();

    function draw(words) {
      const colorScale = d3.scaleSequential()
        .domain([1, d3.max(Object.values(wordFrequency))])
        .interpolator(d3.interpolateRgb('#6bb5a7', '#2d5d52'));

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
        .style('fill', d => colorScale(wordFrequency[d.text]))
        .attr('text-anchor', 'middle')
        .attr('transform', d => `translate(${d.x}, ${d.y})`)
        .text(d => d.text)
        .style('opacity', 0)
        .transition()
        .duration(1000)
        .style('opacity', 1);
    }
  };

  const renderBubbles = () => {
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = svgRef.current.clientWidth;
    const height = 500;

    const nodes = results.map((item, i) => ({
      id: i,
      text: item.text,
      radius: 30 + Math.random() * 20
    }));

    const colorScale = d3.scaleOrdinal()
      .domain(nodes.map(d => d.id))
      .range(['#4a9d8f', '#5ab09e', '#6bb5a7', '#3a7d6f', '#2d5d52']);

    const simulation = d3.forceSimulation(nodes)
      .force('charge', d3.forceManyBody().strength(5))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(d => d.radius + 2));

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
      .attr('r', d => d.radius)
      .style('fill', d => colorScale(d.id))
      .style('opacity', 0.8)
      .style('stroke', '#fff')
      .style('stroke-width', 2)
      .style('filter', 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))')
      .transition()
      .duration(1000)
      .attr('r', d => d.radius);

    bubbles
      .append('text')
      .text(d => d.text)
      .attr('text-anchor', 'middle')
      .attr('dy', '0.3em')
      .style('fill', '#fff')
      .style('font-size', '14px')
      .style('font-weight', '600')
      .style('pointer-events', 'none')
      .style('user-select', 'none');

    simulation.on('tick', () => {
      bubbles.attr('transform', d => `translate(${d.x}, ${d.y})`);
    });

    function dragStarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragEnded(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
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
