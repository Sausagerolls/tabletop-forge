import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register the PWA service worker. Only runs in production builds —
// in `vite dev` we skip registration so HMR isn't fighting the worker
// for control of /index.html. The check is deferred to `load` so the
// app boots first; the worker installing on a slow phone can take a
// few seconds and we don't want to block the first paint on it.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('Service worker registration failed:', err);
    });
  });
}
