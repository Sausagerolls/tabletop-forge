// Writable-path resolver — keeps runtime writes out of the app bundle.
//
// The macOS .app bundle is read-only (and the Mac App Store sandbox enforces
// that hard — writing into Contents/Resources/ fails with EPERM and crashes
// the backend on boot). So anything the server writes at runtime — uploaded
// maps, creature art, terrain, sounds — must live under a per-user writable
// dir, not next to the bundled source.
//
// The native shell sets $VTT_DATA_DIR to that dir (~/.tabletopforge for the
// .dmg, the sandbox container for the App Store build). Docker leaves it unset,
// so we fall back to the backend dir and behaviour is unchanged there.

const path = require('path');
const fs = require('fs');

const DATA_ROOT = (process.env.VTT_DATA_DIR && process.env.VTT_DATA_DIR.trim())
  ? process.env.VTT_DATA_DIR
  : path.join(__dirname, '..');

// User uploads (maps, creatures, terrain) and uploaded sounds.
const UPLOADS_DIR = path.join(DATA_ROOT, 'uploads');
const SOUNDS_WRITE_DIR = path.join(DATA_ROOT, 'sounds');

function ensureDir(dir) {
  try { fs.mkdirSync(dir, { recursive: true }); } catch { /* best effort */ }
  return dir;
}

ensureDir(UPLOADS_DIR);

module.exports = { DATA_ROOT, UPLOADS_DIR, SOUNDS_WRITE_DIR, ensureDir };
