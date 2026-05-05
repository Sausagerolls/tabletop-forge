import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './components/Landing.jsx';

// Route-level code splitting. The heavy views (DMView is the
// 5k-line GM panel, PlayerView pulls in the whole Konva map
// layer, SpectatorView is read-only-but-still-Konva, the
// character editor re-uses CreatureForm in full) are lazy-loaded
// so the initial bundle for someone landing on `/` stays small —
// the player who only opens `/play` no longer pays the cost of
// importing the GM's edit machinery, and vice-versa. Vite emits
// a separate chunk per import() boundary at build time.
//
// Landing stays eager because it's the most-hit route and tiny;
// adding a Suspense flicker there would just slow the first
// paint for no win.
const PlayerView      = lazy(() => import('./components/PlayerView.jsx'));
const DMView          = lazy(() => import('./components/DMView.jsx'));
const SpectatorView   = lazy(() => import('./components/SpectatorView.jsx'));
const CharacterEditor = lazy(() => import('./components/CharacterEditor.jsx'));

// Suspense fallback while the route chunk is fetched + parsed.
// Matches the dark backdrop the rest of the app uses so there's
// no white-flash on slow networks.
function RouteLoading() {
  return (
    <div className="h-screen w-screen flex items-center justify-center bg-gray-900 text-gray-300 text-sm">
      Loading…
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteLoading />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/play" element={<PlayerView />} />
          <Route path="/dm" element={<DMView />} />
          <Route path="/spectate" element={<SpectatorView />} />
          {/* Mounted in the mobile apps' WebView from the Settings
              "Edit Stat Block" button. Browsers can hit the URL
              directly too, which is handy for debugging. */}
          <Route path="/edit-character" element={<CharacterEditor />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
