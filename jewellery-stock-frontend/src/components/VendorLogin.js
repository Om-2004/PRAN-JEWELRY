import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../AuthContext'; // Import useAuth hook
import './VendorLogin.css'; // Assuming this handles the styling for login/register forms

/**
 * VendorLogin Component
 * Handles the login functionality for vendors.
 * Integrates with AuthContext for persistent login session management.
 * Allows users to input their shop name and BIS number to authenticate.
 * Provides a link to the registration page if the user doesn't have an account.
 * Browser autofill/autocomplete is explicitly disabled for cleaner UI and security.
 */
function VendorLogin() {
  // State variables for shop name, BIS number, and display messages
  const [shopName, setShopName] = useState('');
  const [bisNumber, setBisNumber] = useState('');
  const [message, setMessage] = useState('');

  // Hook for programmatic navigation
  const navigate = useNavigate();
  // Get the login function from AuthContext
  const { login } = useAuth(); // Destructure the login function

  /**
   * Handles the form submission for vendor login.
   * Prevents default form behavior, sends login credentials to the backend,
   * updates the global authentication state via AuthContext, and navigates to the dashboard.
   * Displays appropriate messages for success or failure.
   * @param {Event} e - The form submission event.
   */
  const handleLogin = async (e) => {
    e.preventDefault(); // Prevent default form submission to handle it with JavaScript
    setMessage(''); // Clear any previous messages

    try {
      // Send login request to the backend API
      const response = await fetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopName, bisNumber }) // Send shopName and bisNumber as JSON
      });

      const data = await response.json(); // Parse the JSON response from the server

      if (response.ok) {
        // If login is successful (HTTP status 200-299)
        // Use the login function from AuthContext to update global state and localStorage
        login(data.token, { shopName: shopName, bisNumber: bisNumber }); // Assuming data.token contains the JWT

        setMessage('Login Successful!'); // Set success message
        // Navigate to the dashboard page after successful login.
        // The PrivateRoute will handle actual redirection if login() doesn't navigate itself.
        setTimeout(() => { // Optional: A small delay to show success message before navigating
          navigate('/dashboard');
        }, 1000);

      } else {
        // If login fails (e.g., invalid credentials)
        setMessage(data.error || 'Invalid credentials'); // Display error message from backend or a default one
      }
    } catch (error) {
      // Catch any network or other unexpected errors
      console.error('Login error:', error); // Log the error to console for debugging
      setMessage('Login failed: ' + error.message); // Display a user-friendly error message
    }
  };

  return (
    <div className="login-container">
      <h2>Vendor Login</h2>
      {/* Conditionally render messages based on the 'message' state */}
      {message && (
        <div className={`message ${message.includes('Successful') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}
      <form className="login-form" onSubmit={handleLogin}>
        <div>
          <label htmlFor="shopName">Shop Name</label>
          <input
            id="shopName"
            type="text"
            value={shopName}
            onChange={(e) => setShopName(e.target.value)}
            required
            autoComplete="off" // Prevents browser autofill suggestions for shop name
            aria-label="Shop Name"
          />
        </div>
        <div>
          <label htmlFor="bisNumber">BIS Hallmark Registration Number</label>
          <input
            id="bisNumber"
            type="text"
            value={bisNumber}
            onChange={(e) => setBisNumber(e.target.value)}
            required
            autoComplete="off" // Prevents browser autofill suggestions for BIS number
            aria-label="BIS Hallmark Registration Number"
          />
        </div>
        <button type="submit">Login</button>
      </form>
      {/* Link to the registration page */}
      <div className="create-account-link">
        Don't have an account?{' '}
        <Link to="/register" className="register-text-link"> {/* Using Link component */}
          Create One
        </Link>
      </div>
    </div>
  );
}

export default VendorLogin;
