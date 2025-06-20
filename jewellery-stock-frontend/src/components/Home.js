import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Home.css';

function Home() {
  const navigate = useNavigate();

  useEffect(() => {
    // Check if splash screen was shown
    if (!sessionStorage.getItem('splashShown')) {
      sessionStorage.setItem('splashShown', 'true');
      navigate('/splash');
    }
  }, [navigate]);

  return (
    <div className="home-background">
      <div className="home-container">
        <h1>Welcome to PRAN Jewellery Stock Management</h1>
        <div className="home-buttons">
          <Link to="/login" className="home-button">Login</Link>
          <Link to="/register" className="home-button">Register</Link>
        </div>
      </div>
    </div>
  );
}

export default Home;