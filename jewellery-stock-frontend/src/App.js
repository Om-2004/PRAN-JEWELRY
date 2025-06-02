import React from 'react';
import { Routes, Route } from 'react-router-dom';

import Home from './components/Home';
import Register from './components/Register';
import VendorLogin from './components/VendorLogin';
import VendorDashboard from './components/VendorDashboard';

function App() {
  return (
    <div style={{ maxWidth: '600px', margin: 'auto', padding: '20px' }}>
      <Routes>
        {/* Home page */}
        <Route path="/" element={<Home />} />

        {/* Registration page */}
        <Route path="/register" element={<Register />} />

        {/* Login page */}
        <Route path="/login" element={<VendorLogin />} />

        {/* Dashboard (protected) */}
        <Route path="/dashboard" element={<VendorDashboard />} />
      </Routes>
    </div>
  );
}

export default App;
