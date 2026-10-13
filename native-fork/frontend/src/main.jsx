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

// A chunk that will never arrive.
//
// Every build renames its script bundles, and the old ones are deleted from
// the server. A page that came up from a stale shell — an installed app on a
// phone, a tab restored from cache — asks for names that are gone: the import
// fails, React never mounts that part of the screen, and the result looks like
// a feature with no data in it rather than an error. Vite fires an event when
// a lazy import fails, which is the one reliable signal that this has
// happened. Clear the worker's caches and reload ONCE, tracked in
// sessionStorage so a genuinely broken deploy cannot put the phone in a loop.
window.addEventListener('vite:preloadError', async (event) => {
  event.preventDefault();
  const KEY = 'forge_stale_reload';
  let already = false;
  try { already = sessionStorage.getItem(KEY) === '1'; } catch { /* private mode */ }
  if (already) return;
  try { sessionStorage.setItem(KEY, '1'); } catch { /* ignore */ }
  try {
    if (window.caches) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
    const regs = await navigator.serviceWorker?.getRegistrations?.() || [];
    await Promise.all(regs.map((r) => r.unregister()));
  } catch { /* best effort — the reload is what matters */ }
  window.location.reload();
});
