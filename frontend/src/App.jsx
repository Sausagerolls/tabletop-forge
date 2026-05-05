import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './components/Landing.jsx';
import PlayerView from './components/PlayerView.jsx';
import DMView from './components/DMView.jsx';
import SpectatorView from './components/SpectatorView.jsx';
import CharacterEditor from './components/CharacterEditor.jsx';

export default function App() {
  return (
    <BrowserRouter>
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
    </BrowserRouter>
  );
}
