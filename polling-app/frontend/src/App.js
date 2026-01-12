import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Home from './pages/Home';
import CreatePoll from './pages/CreatePoll';
import Poll from './pages/Poll';
import Vote from './pages/Vote';
import AdminDashboard from './pages/AdminDashboard';
import MasterAdmin from './pages/MasterAdmin';
import EditPoll from './pages/EditPoll';
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
            <Route path="/vote" element={<Vote />} />
            <Route path="/poll/:pollId" element={<Poll />} />
            <Route path="/poll/:pollId/admin/:adminToken" element={<AdminDashboard />} />
            <Route path="/poll/:pollId/edit/:adminToken" element={<EditPoll />} />
            <Route path="/admin" element={<MasterAdmin />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
