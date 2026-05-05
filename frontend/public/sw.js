// TableTop Forge — minimal service worker for PWA install eligibility.
//
// What this does
// ──────────────
//   * Satisfies the browser's "has a fetch handler" install requirement
//     so Chrome/Edge offer the Install button and Safari iOS shows
//     "Add to Home Screen" with the manifest icon.
//   * Hands the user a quick-open cached `index.html` if they launch
//     the installed app while offline. The shell loads, then the app's
//     own socket reconnect / "no connection" banner kicks in once
//     network is back.
//
// What this DOES NOT do
// ─────────────────────
//   * Cache anything other than the navigation shell. The app is
//     realtime — sockets, /api/, /uploads/, /sounds/, plugin assets —
//     and stale cached responses for those would silently break the
//     game. We hard-pass them through to network.
//   * Self-update silently. New shells are picked up on next reload
//     (skipWaiting on activate), but the old tab finishes its session
//     on the version it loaded with — no mid-session swap.
//
// Versioning: bump CACHE_NAME on any breaking change to this file.
// Old caches are evicted on activate.
const CACHE_NAME = 'forge-shell-v3';
const SHELL = ['/', '/index.html', '/manifest.webmanifest',
               '/icons/icon-192.png', '/icons/icon-512.png',
               '/icons/apple-touch-icon.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL).catch(() => null))
  );
  // Take over from any older worker on the next page load.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Pass through anything that must be live: API, sockets, uploads,
  // plugin assets, sound files. The app's existing reconnect logic
  // surfaces network failures cleanly, so silent caching here would
  // hide bugs and stale state.
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/socket.io/') ||
    url.pathname.startsWith('/uploads/') ||
    url.pathname.startsWith('/sounds/')
  ) {
    return; // default network handling
  }

  // Navigations: try network first so the latest build is always
  // served when online; fall back to the cached shell for installs
  // launched offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Static assets baked into the build (hashed by Vite). Try cache
  // first for speed, fall back to network on miss, then cache it for
  // next time. Failures bubble up unchanged.
  event.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;
    try {
      const fresh = await fetch(req);
      // Only cache same-origin, successful, basic responses. Avoids
      // caching opaque cross-origin responses that we can't validate.
      if (fresh.ok && url.origin === self.location.origin) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, fresh.clone()).catch(() => {});
      }
      return fresh;
    } catch (err) {
      return cached || Response.error();
    }
  })());
});
