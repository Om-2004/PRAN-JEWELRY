import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom'; // Import useNavigate and Link for proper navigation
import './Register.css'; // Assuming this handles the styling for register forms

/**
 * Register Component
 * Handles the registration functionality for new vendors.
 * Allows users to input their shop details to create a new account.
 * Provides a link to the login page if the user already has an account.
 * Browser autofill/autocomplete is explicitly disabled for cleaner UI and security.
 */
function Register() {
  // State variables for form fields and display messages
  const [shopName, setShopName] = useState('');
  const [bisNumber, setBisNumber] = useState('');
  const [contact, setContact] = useState('');
  const [address, setAddress] = useState('');
  const [type, setType] = useState(''); // E.g., "Wholesale", "Retail", "Manufacturer"
  const [message, setMessage] = useState('');

  // Hook for programmatic navigation
  const navigate = useNavigate();

  /**
   * Handles the form submission for vendor registration.
   * Prevents default form behavior, sends registration data to the backend,
   * and displays appropriate messages for success or failure.
   * @param {Event} e - The form submission event.
   */
  const handleSubmit = async (e) => {
    e.preventDefault(); // Prevent default form submission
    setMessage(''); // Clear any previous messages

    // Construct vendorData, converting 'type' to lowercase for case-insensitivity
    const vendorData = {
      shopName,
      bisNumber,
      contact,
      address,
      type: type.toLowerCase() // Convert input to lowercase for backend matching
    };

    try {
      // Send registration request to the backend API
      const response = await fetch('/api/vendors', { // Assuming /api/vendors is the registration endpoint
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vendorData) // Send vendor data as JSON
      });

      if (response.ok) {
        // If registration is successful (HTTP status 200-299)
        setMessage('Vendor registered successfully'); // Set success message
        // Clear form fields after successful submission
        setShopName('');
        setBisNumber('');
        setContact('');
        setAddress('');
        setType('');
        // Optional: Navigate to login page after successful registration
        setTimeout(() => {
          navigate('/login');
        }, 1500); // Redirect after 1.5 seconds to show success message
      } else {
        // If registration fails (e.g., duplicate BIS number, validation errors)
        const errorData = await response.json(); // Parse error response from backend
        setMessage('Registration failed: ' + (errorData.message || response.status)); // Display error message
      }
    } catch (error) {
      // Catch any network or other unexpected errors
      console.error('Error during registration:', error); // Log the error to console for debugging
      setMessage('Registration failed: ' + error.message); // Display a user-friendly error message
    }
  };

  return (
    <div className="register-container">
      <h2>Register Vendor</h2>
      {/* Conditionally render messages based on the 'message' state */}
      {message && (
        <div className={`message ${message.includes('successfully') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}
      <form className="register-form" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="registerShopName">Shop Name</label>
          <input
            id="registerShopName"
            type="text"
            value={shopName}
            onChange={(e) => setShopName(e.target.value)}
            required
            autoComplete="off" // Prevents browser autofill
            aria-label="Shop Name"
          />
        </div>
        <div>
          <label htmlFor="registerBisNumber">BIS Hallmark Registration Number</label>
          <input
            id="registerBisNumber"
            type="text"
            value={bisNumber}
            onChange={(e) => setBisNumber(e.target.value)}
            required
            autoComplete="off" // Prevents browser autofill
            aria-label="BIS Hallmark Registration Number"
          />
        </div>
        <div>
          <label htmlFor="registerContact">Contact</label>
          <input
            id="registerContact"
            type="text"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            required
            autoComplete="off" // Prevents browser autofill
            aria-label="Contact Number"
          />
        </div>
        <div>
          <label htmlFor="registerAddress">Address</label>
          <input
            id="registerAddress"
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            required
            autoComplete="off" // Prevents browser autofill
            aria-label="Address"
          />
        </div>
        <div>
          <label htmlFor="registerType">Type</label>
          <input
            id="registerType"
            type="text"
            value={type}
            onChange={(e) => setType(e.target.value)}
            required
            autoComplete="off" // Prevents browser autofill
            placeholder="wholesaler / retailer" // Added placeholder
            aria-label="Vendor Type"
          />
        </div>
        <button type="submit">Register</button>
      </form>

      {/* Link to the login page */}
      <div className="sign-in-link">
        Already have an account?{' '}
        <Link to="/login" className="login-text-link"> {/* Using Link component */}
          Sign In
        </Link>
      </div>
    </div>
  );
}

export default Register;
