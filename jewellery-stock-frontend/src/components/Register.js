import React, { useState } from 'react';
import './Register.css';

function Register() {
  const [shopName, setShopName] = useState('');
  const [bisNumber, setBisNumber] = useState('');
  const [contact, setContact] = useState('');
  const [address, setAddress] = useState('');
  const [type, setType] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const vendorData = {
      shopName,
      bisNumber,
      contact,
      address,
      type
    };

    try {
      const response = await fetch('/api/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vendorData)
      });

      if (response.ok) {
        setMessage('Vendor registered successfully');
        setShopName('');
        setBisNumber('');
        setContact('');
        setAddress('');
        setType('');
      } else {
        const errorData = await response.json();
        setMessage('Registration failed: ' + (errorData.message || response.status));
      }
    } catch (error) {
      console.error('Error during registration:', error);
      setMessage('Registration failed: ' + error.message);
    }
  };

  return (
    <div className="register-container">
      <h2>Register Vendor</h2>
      {message && (
        <div className={`message ${message.includes('successfully') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}
      <form className="register-form" onSubmit={handleSubmit}>
        <div>
          <label>Shop Name</label>
          <input
            type="text"
            value={shopName}
            onChange={(e) => setShopName(e.target.value)}
            required
          />
        </div>
        <div>
          <label>BIS Hallmark Registration Number</label>
          <input
            type="text"
            value={bisNumber}
            onChange={(e) => setBisNumber(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Contact</label>
          <input
            type="text"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Address</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Type</label>
          <input
            type="text"
            value={type}
            onChange={(e) => setType(e.target.value)}
            required
          />
        </div>
        <button type="submit">Register</button>
      </form>
    </div>
  );
}

export default Register;