import React, { useState } from 'react';

function Register() {
  const [shopName, setShopName] = useState('');
  const [bisNumber, setBisNumber] = useState(''); // Renamed from HUID_no
  const [contact, setContact] = useState('');
  const [address, setAddress] = useState('');
  const [type, setType] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const vendorData = {
      shopName,
      bisNumber, // Make sure this matches backend key
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
    <div>
      <h2>Register Vendor</h2>
      {message && <p>{message}</p>}
      <form onSubmit={handleSubmit}>
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
        <div>
          <label>Contact:</label><br />
          <input
            type="text"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Address:</label><br />
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Type:</label><br />
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
