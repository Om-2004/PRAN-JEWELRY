import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function VendorLogin() {
  const [shopName, setShopName] = useState('');
  const [HUID_no, setHUIDNo] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

const handleLogin = async (e) => {
  e.preventDefault();
  try {
    const response = await fetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shopName, HUID_no })
    });
    const data = await response.json();
    if (response.ok) {
      localStorage.setItem('token', data.token);
      // Store vendor data including shopName
      localStorage.setItem('vendor', JSON.stringify({
        shopName: shopName,
        HUID_no: HUID_no
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
          <label>HUID No:</label><br />
          <input
            type="text"
            value={HUID_no}
            onChange={(e) => setHUIDNo(e.target.value)}
            required
          />
        </div>
        <button type="submit">Login</button>
      </form>
    </div>
  );
}

export default VendorLogin;
