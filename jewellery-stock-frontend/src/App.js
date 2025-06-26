import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom'; // Import Navigate for PrivateRoute
import Home from './components/Home';
import SplashScreen from './components/SplashScreen';
import Register from './components/Register';
import VendorLogin from './components/VendorLogin';
import VendorDashboard from './components/VendorDashboard';
import { AuthProvider, useAuth } from './AuthContext'; // Import AuthProvider and useAuth

import './App.css'; // Your existing App.css import

/**
 * PrivateRoute Component
 * This component acts as a wrapper for routes that require authentication.
 * If the user is not authenticated, it redirects them to the login page.
 * It uses the AuthContext to check the authentication status.
 *
 * This is defined here for simplicity, but could be in its own file (e.g., components/PrivateRoute.js).
 */
const PrivateRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth(); // Get auth state from context

  if (loading) {
    // Optionally render a loading spinner or placeholder while auth state is being determined
    // This is important because the initial check from localStorage is asynchronous.
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#1a1a1a', // Dark background to match theme
        color: '#ffd700', // Gold loading text
        fontSize: '1.5rem',
        fontWeight: 'bold'
      }}>
        Loading authentication...
      </div>
    );
  }

  // If authenticated, render the children (the protected component)
  // If not authenticated, redirect to the login page
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

function App() {
  return (
    // Wrap the entire application with AuthProvider to make authentication context
    // (vendor data, login/logout functions) available to all components.
    <AuthProvider>
      <div className="app-container"> {/* Your main app content container */}
        <Routes>
          {/* Public Routes - accessible to everyone */}
          {/* Splash screen is the initial entry point */}
          <Route path="/splash" element={<SplashScreen />} />
          <Route path="/" element={<Home />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<VendorLogin />} />

          {/* Protected Routes - only accessible if authenticated */}
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <VendorDashboard />
              </PrivateRoute>
            }
          />
          {/* Add other protected routes here if you create them, e.g.: */}
          {/*
          <Route
            path="/items-manager"
            element={
              <PrivateRoute>
                <ItemsManager />
              </PrivateRoute>
            }
          />
          <Route
            path="/add-item"
            element={
              <PrivateRoute>
                <AddItem />
              </PrivateRoute>
            }
          />
          */}

          {/* Fallback for any unmatched routes (e.g., 404 page) */}
          {/* You might want a dedicated NotFound component for this */}
          <Route path="*" element={<Navigate to="/" replace />} /> {/* Redirects unknown routes to Home */}
        </Routes>
      </div>
    </AuthProvider>
  );
}

export default App;
