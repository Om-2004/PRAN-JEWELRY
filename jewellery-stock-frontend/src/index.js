// index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import App from './App';
import './index.css'; // Global styles, likely defining .app-container

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode> {/* Good practice for development */}
    <Router>
      <App /> {/* No initialPath prop needed here */}
    </Router>
  </React.StrictMode>
);