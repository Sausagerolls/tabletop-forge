import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { RollerProvider } from './roller.jsx';
import './style.css';

createRoot(document.getElementById('root')).render(
  <RollerProvider><App /></RollerProvider>,
);
