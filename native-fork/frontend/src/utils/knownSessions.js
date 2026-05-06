// Persisted "known sessions" — drives the session-switcher screen on
// the Landing page so a returning user sees their previous logins
// (player + GM) instead of the empty join form. Stored in
// localStorage under a single JSON blob so the whole list rewrites
// atomically and we don't fight the per-session entries that already
// live in `dndvtt_player_setup_<code>`.
//
// Two entry types:
//   - "player": one row per (sessionCode, playerName, creatureId)
//   - "gm":     one row per (sessionCode, sessionName)
//
// We deliberately keep the GM password too so the row is one-tap
// rejoin — same trust model the URL params already use (?pass=…
// gets baked into history). If a paranoid user wants it gone they
// hit Forget.
//
// Server URL is omitted on the web client because the web app is
// always served from one origin; the native apps record it in their
// own SessionStore.

const KEY = 'dndvtt_known_sessions';
const VERSION = 1;

function safeParse(raw) {
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

function read() {
  const blob = safeParse(localStorage.getItem(KEY));
  if (!blob || blob.version !== VERSION || !Array.isArray(blob.entries)) {
    return { version: VERSION, entries: [] };
  }
  return blob;
}

function write(blob) {
  try { localStorage.setItem(KEY, JSON.stringify(blob)); } catch {}
}

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function listKnownSessions() {
  return read().entries
    .slice()
    .sort((a, b) => (b.lastUsedAt || 0) - (a.lastUsedAt || 0));
}

export function listPlayerSessions() {
  return listKnownSessions().filter((e) => e.type === 'player');
}

export function listGmSessions() {
  return listKnownSessions().filter((e) => e.type === 'gm');
}

// Insert or refresh a player entry. Identity = (code + playerName +
// creatureId) so swapping characters within the same session creates
// a new row instead of mutating the existing one. Refresh just bumps
// lastUsedAt and updates the cached creature name / image.
export function rememberPlayerSession({ code, playerName, creatureId, creatureName, creatureImagePath }) {
  if (!code || !playerName || !creatureId) return;
  const blob = read();
  const idx = blob.entries.findIndex(
    (e) => e.type === 'player' && e.code === code && e.playerName === playerName && e.creatureId === creatureId,
  );
  const row = {
    id: idx >= 0 ? blob.entries[idx].id : uid(),
    type: 'player',
    code,
    playerName,
    creatureId,
    creatureName: creatureName || null,
    creatureImagePath: creatureImagePath || null,
    lastUsedAt: Date.now(),
  };
  if (idx >= 0) blob.entries[idx] = row; else blob.entries.push(row);
  write(blob);
}

// Insert or refresh a GM entry. Identity = (code + sessionName) so
// re-using a code with a freshly-renamed session adds a new row, and
// repeated logins to the same session just bump the timestamp.
export function rememberGmSession({ code, pass, sessionName }) {
  if (!code) return;
  const blob = read();
  const idx = blob.entries.findIndex((e) => e.type === 'gm' && e.code === code);
  const row = {
    id: idx >= 0 ? blob.entries[idx].id : uid(),
    type: 'gm',
    code,
    pass: pass || '',
    sessionName: sessionName || null,
    lastUsedAt: Date.now(),
  };
  if (idx >= 0) blob.entries[idx] = row; else blob.entries.push(row);
  write(blob);
}

export function forgetSession(id) {
  const blob = read();
  blob.entries = blob.entries.filter((e) => e.id !== id);
  write(blob);
}

export function forgetAllSessions() {
  write({ version: VERSION, entries: [] });
}
