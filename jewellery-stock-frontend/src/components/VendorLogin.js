import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function VendorLogin() {
  const [shopName, setShopName] = useState('');
  const [bisNumber, setBisNumber] = useState('');  // Updated from HUID_no
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopName, bisNumber }) // Updated key here too
      });
      const data = await response.json();
      if (response.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('vendor', JSON.stringify({
          shopName: shopName,
          bisNumber: bisNumber
        }));
        setMessage('Login Successful!');
        navigate('/dashboard');
      } else {
        setMessage(data.error || 'Invalid credentials');
      }
    } catch (error) {
      console.error('Login error:', error);
      setMessage('Login failed: ' + error.message);
    }
  };

  return (
    <div>
      <h2>Vendor Login</h2>
      {message && <p>{message}</p>}
      <form onSubmit={handleLogin}>
        <div>
          <label>Shop Name:</label><br />
          <input
            type="text"
            value={shopName}
            onChange={(e) => setShopName(e.target.value)}
            required
          />
        </div>
        <div>
          <label>BIS Hallmark Registration Number:</label><br />
          <input
            type="text"
            value={bisNumber}
            onChange={(e) => setBisNumber(e.target.value)}
            required
          />
        </div>
        <button type="submit">Login</button>
      </form>
    </div>
  );
}

export default VendorLogin;
