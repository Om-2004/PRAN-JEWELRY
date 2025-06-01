import React from 'react';
import { Link } from 'react-router-dom';

function Home() {
  return (
    <div className="container">
      <h1>Welcome to the Jewellery Stock Management System</h1>
      <p>
        <Link to="/login">Login</Link> or <Link to="/register">Register</Link> as a vendor.
      </p>
    </div>
  );
}

export default Home;
