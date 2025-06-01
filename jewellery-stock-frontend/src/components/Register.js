import React, { useState } from 'react';

function Register() {
  // State variables for form fields and message
  const [shopName, setShopName] = useState('');
  const [HUID_no, setHUIDNo] = useState('');
  const [contact, setContact] = useState('');
  const [address, setAddress] = useState('');
  const [type, setType] = useState('');
  const [message, setMessage] = useState('');

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    const vendorData = { shopName, HUID_no, contact, address, type };
    try {
      const response = await fetch('/api/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vendorData),
      });
      if (response.ok) {
        setMessage('Vendor registered successfully');
        // (Optional) Clear the form fields
        setShopName('');
        setHUIDNo('');
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
            onChange={e => setShopName(e.target.value)}
            required
          />
        </div>
        <div>
          <label>HUID No:</label><br />
          <input
            type="text"
            value={HUID_no}
            onChange={e => setHUIDNo(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Contact:</label><br />
          <input
            type="text"
            value={contact}
            onChange={e => setContact(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Address:</label><br />
          <input
            type="text"
            value={address}
            onChange={e => setAddress(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Type:</label><br />
          <input
            type="text"
            value={type}
            onChange={e => setType(e.target.value)}
            required
          />
        </div>
        <button type="submit">Register</button>
      </form>
    </div>
  );
}

export default Register;
