import React from 'react';
import { Link } from 'react-router-dom';

const Header = () => {
  return (
    <header className="app-header">
      <div className="header-content">
        <Link to="/" className="logo">
          <img 
            src="/images/echos-logo.png" 
            alt="Echos" 
            className="logo-image"
          />
          <span className="logo-text">Polling</span>
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
