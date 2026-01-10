import React from 'react';
import { Link } from 'react-router-dom';

const Header = () => {
  return (
    <header className="app-header">
      <div className="header-content">
        <Link to="/" className="logo">
          <div className="logo-icon">E</div>
          <span className="logo-text">echos Polling</span>
        </Link>
        <div className="header-nav">
          <Link to="/admin" className="btn btn-outline">
            🔐 Admin
          </Link>
          <Link to="/create" className="btn btn-secondary">
            + Create Poll
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Header;
