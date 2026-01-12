import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Header = () => {
  const location = useLocation();
  
  // Hide nav buttons on voter poll page (but show on admin/edit pages)
  const isVoterPage = /^\/poll\/[^/]+$/.test(location.pathname);

  return (
    <header className="app-header">
      <div className="header-content">
        <Link to="/" className="logo">
          <img 
            src="/images/echos-logo-white.png" 
            alt="Echos" 
            className="logo-image"
          />
        </Link>
        {!isVoterPage && (
          <div className="header-nav">
            <Link to="/admin" className="btn btn-outline">
              🔐 Admin
            </Link>
            <Link to="/create" className="btn btn-secondary">
              + Create Poll
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
