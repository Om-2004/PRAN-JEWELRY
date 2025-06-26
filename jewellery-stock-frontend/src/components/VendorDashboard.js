import React, { useState } from 'react';
// useNavigate is no longer directly used for logout, as AuthContext handles navigation
// Link is not needed in this component directly
import ItemsManager from './ItemsManager'; // Component for managing items
import KaragirForm from './KaragirForm'; // Component for Karagir (artisan) forms
import CustomerForm from './CustomerForm'; // Component for customer forms
import { useAuth } from '../AuthContext'; // Import useAuth hook
import './Dashboard.css'; // Styles for the dashboard layout and sticky elements

/**
 * VendorDashboard Component
 * This is the main dashboard for the vendor, displaying different sections
 * (Items, Karagir, Customers) based on the selected view.
 * It features a sticky header with the welcome message, navigation buttons,
 * and buttons for logging out and deleting the account, all managed via AuthContext.
 */
function VendorDashboard() {
  // State to manage which content view is currently active (e.g., 'items', 'karagir', 'customer')
  const [view, setView] = useState('items'); // Default view is 'items'

  // Use the useAuth hook to access authentication state and functions
  const { vendor, logout, deleteAccount } = useAuth();

  /**
   * Handles the logout process.
   * Calls the logout function provided by AuthContext, which handles
   * clearing local storage and redirecting the user to the login page.
   */
  const handleLogout = () => {
    logout(); // Call the logout function from AuthContext
  };

  /**
   * Handles the account deletion process.
   * Calls the deleteAccount function provided by AuthContext, which handles
   * confirming with the user, sending a DELETE request to the backend,
   * and logging out the user upon success.
   */
  const handleDeleteAccount = () => {
    deleteAccount(); // Call the deleteAccount function from AuthContext
  };

  return (
    <div className="dashboard-container">
      {/*
        dashboard-sticky-wrapper
        This div acts as the sticky container for both the header and the
        navigation buttons. It will stick to the top of the viewport as
        the user scrolls, ensuring these critical elements are always visible.
        The padding and background color of this wrapper are defined in Dashboard.css.
      */}
      <div className="dashboard-sticky-wrapper">
        {/*
          dashboard-header: Contains the welcome message and action buttons.
          It uses flexbox to position these elements.
        */}
        <div className="dashboard-header">
          {/* Displaying the welcome message with the vendor's shop name */}
          <h2>Welcome, {vendor?.shopName || 'Vendor'}</h2>
          <div className="header-actions"> {/* Container for logout and delete buttons */}
            {/* Logout button */}
            <button className="logout-button" onClick={handleLogout}>
              Log Out
            </button>
            {/* New: Delete Account button */}
            <button className="delete-account-button" onClick={handleDeleteAccount}>
              Delete Account
            </button>
          </div>
        </div>

        {/*
          dashboard-buttons: Contains the navigation buttons for switching views.
          It is now a direct child of dashboard-sticky-wrapper, sibling to dashboard-header.
          This separation allows for distinct styling and layout of these two sections
          while keeping them together in the sticky area.
        */}
        <div className="dashboard-buttons">
          {/* Button to switch to Items Manager view */}
          <button
            className={`dashboard-button ${view === 'items' ? 'active' : ''}`}
            onClick={() => setView('items')}
          >
            Items
          </button>
          {/* Button to switch to Karagir In-Out view */}
          <button
            className={`dashboard-button ${view === 'karagir' ? 'active' : ''}`}
            onClick={() => setView('karagir')}
          >
            Karagir In-Out
          </button>
          {/* Button to switch to Customer In-Out view */}
          <button
            className={`dashboard-button ${view === 'customer' ? 'active' : ''}`}
            onClick={() => setView('customer')}
          >
            Customer In-Out
          </button>
        </div>
      </div> {/* End dashboard-sticky-wrapper */}

      {/*
        dashboard-content: This div holds the main content of the dashboard
        (ItemsManager, KaragirForm, CustomerForm). This content will scroll
        underneath the sticky header and navigation.
        The negative margin-top in Dashboard.css ensures it visually starts
        just below the sticky area.
      */}
      <div className="dashboard-content">
        {/* Conditionally render components based on the 'view' state */}
        {view === 'items' && <ItemsManager />}
        {view === 'karagir' && <KaragirForm />}
        {view === 'customer' && <CustomerForm />}
      </div>
    </div>
  );
}

export default VendorDashboard;
