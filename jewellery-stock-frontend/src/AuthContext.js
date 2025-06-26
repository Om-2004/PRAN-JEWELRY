import React, { createContext, useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom'; // To redirect after logout/delete

// 1. Create the Auth Context
export const AuthContext = createContext(null);

/**
 * 2. AuthProvider Component
 * This component will wrap your entire application (or the part that needs auth)
 * and provide the auth state and functions to all its children.
 */
export const AuthProvider = ({ children }) => {
  const [vendor, setVendor] = useState(null); // Stores logged-in vendor data
  const [loading, setLoading] = useState(true); // To indicate if initial auth check is done
  const navigate = useNavigate();

  // On initial load, try to retrieve auth state from localStorage
  useEffect(() => {
    const loadVendorFromStorage = () => {
      const storedToken = localStorage.getItem('token');
      const storedVendor = localStorage.getItem('vendor');

      if (storedToken && storedVendor) {
        try {
          const parsedVendor = JSON.parse(storedVendor);
          // In a real app, you'd want to validate the token with your backend here
          // e.g., fetch('/api/validate-token', { headers: { Authorization: `Bearer ${storedToken}` } })
          // For now, we'll assume a valid token means the vendor data is good.
          setVendor(parsedVendor);
        } catch (e) {
          console.error("Failed to parse vendor data from localStorage", e);
          // Clear invalid data
          localStorage.removeItem('token');
          localStorage.removeItem('vendor');
        }
      }
      setLoading(false); // Mark loading as complete
    };

    loadVendorFromStorage();
  }, []); // Empty dependency array means this runs only once on mount

  // Function to handle user login
  const login = (token, vendorData) => {
    localStorage.setItem('token', token);
    localStorage.setItem('vendor', JSON.stringify(vendorData));
    setVendor(vendorData);
    // You might want to navigate to dashboard immediately after login here,
    // or let the calling component handle it. For now, we'll let the calling component navigate.
  };

  // Function to handle user logout
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('vendor');
    setVendor(null);
    navigate('/login'); // Redirect to login page after logout
  };

  // Function to handle account deletion
  const deleteAccount = async () => {
    if (!vendor || !vendor.bisNumber) { // Assuming BIS number is unique ID
      console.error("No vendor logged in or missing BIS number for deletion.");
      return;
    }

    const confirmDeletion = window.confirm("Are you sure you want to delete your account? This action cannot be undone.");
    if (!confirmDeletion) {
      return; // User cancelled
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/vendors/${vendor.bisNumber}`, { // Adjust endpoint as per your backend
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` // Send token for authentication
        }
      });

      if (response.ok) {
        alert("Account deleted successfully!"); // Use alert for simplicity here, replace with custom modal
        logout(); // Log out the user after successful deletion
      } else {
        const errorData = await response.json();
        alert("Failed to delete account: " + (errorData.message || "Unknown error")); // Use alert for simplicity
      }
    } catch (error) {
      console.error("Error deleting account:", error);
      alert("An error occurred while deleting your account."); // Use alert for simplicity
    }
  };

  // The value provided to consumers of this context
  const authContextValue = {
    vendor,
    loading,
    login,
    logout,
    deleteAccount,
    isAuthenticated: !!vendor, // Convenience boolean
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * 3. Custom Hook for Easy Access (Optional but recommended)
 * This makes it cleaner to use the context in components.
 */
export const useAuth = () => {
  return useContext(AuthContext);
};
