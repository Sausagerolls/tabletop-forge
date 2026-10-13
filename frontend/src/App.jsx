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
// The GM's tablet companion. Lazy like the rest: its own chunk is a few KB, and
// it pulls in neither DMView (~550KB) nor the three.js chunk (~350KB).
//
// It does NOT escape everything — Konva currently lands in the shared entry
// chunk, so every route pays for it whether it draws a map or not. Splitting
// that out is a build-config change for another day, not something this route
// can do from here.
const StatBlockView   = lazy(() => import('./components/StatBlockView.jsx'));
// The player's phone companion. Same reasoning as the GM's above.
const PlayerSheetView = lazy(() => import('./components/PlayerSheetView.jsx'));

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
          {/* Stat blocks only, for a second screen beside the GM. Same session
              and same GM password as /dm; no board, nothing writable. */}
          <Route path="/blocks" element={<StatBlockView />} />
          {/* A player's own sheet, controls and companions — no map. Joins by
              name like /play does; needs no password. */}
          <Route path="/sheet" element={<PlayerSheetView />} />
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
