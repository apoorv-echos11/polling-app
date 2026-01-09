import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Home from './pages/Home';
import CreatePoll from './pages/CreatePoll';
import Poll from './pages/Poll';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Header />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/create" element={<CreatePoll />} />
            <Route path="/poll/:pollId" element={<Poll />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
