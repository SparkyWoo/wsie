import React from 'react';
import ReactDOM from 'react-dom/client';
// Remove this line:
// import './index.css';
import App from './App';
// Remove this import as it's already in App.js
// import { Analytics } from '@vercel/analytics/react';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
    {/* Remove this line as Analytics is already in App.js */}
    {/* <Analytics /> */}
  </React.StrictMode>
);