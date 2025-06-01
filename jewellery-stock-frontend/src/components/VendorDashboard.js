import React, { useState } from 'react';
import ItemsManager from './ItemsManager';
import KaragirForm from './KaragirForm';
import CustomerForm from './CustomerForm';
import './Dashboard.css';

function VendorDashboard() {
  const [view, setView] = useState('items');

  // ✅ Get vendor data from localStorage
  const vendor = JSON.parse(localStorage.getItem('vendor'));

  return (
    <div>
      <h2>Welcome, {vendor?.name || "Vendor"}</h2>

      <button onClick={() => setView('items')}>Items</button>
      <button onClick={() => setView('karagir')}>Karagir In-Out</button>
      <button onClick={() => setView('customer')}>Customer In-Out</button>

      {view === 'items' && <ItemsManager vendorId={vendor?._id} />}
      {view === 'karagir' && <KaragirForm vendorId={vendor?._id} />}
      {view === 'customer' && <CustomerForm vendorId={vendor?._id} />}
    </div>
  );
}

export default VendorDashboard;
