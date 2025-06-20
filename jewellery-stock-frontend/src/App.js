import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from './components/Home';
import SplashScreen from './components/SplashScreen';
import Register from './components/Register';
import VendorLogin from './components/VendorLogin';
import VendorDashboard from './components/VendorDashboard';
import './App.css';

function App() {
  return (
    <div className="app-container">
      <Routes>
        {/* Initial route - only place where sound plays */}
        <Route path="/splash" element={<SplashScreen />} />
        
        {/* Main routes (sound completely disabled) */}
        <Route path="/" element={<Home />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<VendorLogin />} />
        <Route path="/dashboard" element={<VendorDashboard />} />
      </Routes>
    </div>
  );
}

export default App;