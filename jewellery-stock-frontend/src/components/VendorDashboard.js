import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ItemsManager from './ItemsManager';
import KaragirForm from './KaragirForm';
import CustomerForm from './CustomerForm';
import './Dashboard.css';

function VendorDashboard() {
  const [view, setView] = useState('items');
  const navigate = useNavigate();

  // Retrieve stored vendor info (if you saved it after login)
  const vendor = JSON.parse(localStorage.getItem('vendor'));

  // ──────────────────────────────────────────────────────────────────────────────
  // LOG OUT HANDLER: clears stored vendor/token and returns to login page
  // ──────────────────────────────────────────────────────────────────────────────
  const handleLogout = () => {
    localStorage.removeItem('vendor');
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h2>Welcome, {vendor?.shopName || 'Vendor'}</h2>
        <button className="logout-button" onClick={handleLogout}>
          Log Out
        </button>
      </div>

      <div className="dashboard-buttons">
        <button className="dashboard-button" onClick={() => setView('items')}>
          Items
        </button>
        <button className="dashboard-button" onClick={() => setView('karagir')}>
          Karagir In-Out
        </button>
        <button className="dashboard-button" onClick={() => setView('customer')}>
          Customer In-Out
        </button>
      </div>

      <div className="dashboard-content">
        {view === 'items' && <ItemsManager />}
        {view === 'karagir' && <KaragirForm />}
        {view === 'customer' && <CustomerForm />}
      </div>
    </div>
  );
}

export default VendorDashboard;
