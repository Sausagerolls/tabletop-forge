// The account for this browser — a GM's, a player's, or one person who is both.
//
// One login, every table. For a GM the token below is what the server checks
// instead of a session's GM password, so a paired session opens without a
// code-and-password pair per game. For a player it carries their SEATS: which
// table, under what name, as which character — the thing they used to have to
// retype on every new device.
//
// The token lives in localStorage and NEVER in a URL: a ?pass= ends up in
// history, in a screenshot of the address bar and in whatever is watching the
// screen at the table. `knownSessions` keeps on doing what it did for GMs who
// have not signed in — the two systems sit side by side on purpose, because a
// guest GM running one game from someone else's laptop should not have to make
// an account to do it.

const TOKEN_KEY = 'ttf_gm_token';
const ACCOUNT_KEY = 'ttf_gm_account';

export function gmToken() {
  try { return localStorage.getItem(TOKEN_KEY) || null; } catch { return null; }
}

export function gmAccount() {
  try { return JSON.parse(localStorage.getItem(ACCOUNT_KEY) || 'null'); } catch { return null; }
}

export function setGmSession(token, account) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    if (account) localStorage.setItem(ACCOUNT_KEY, JSON.stringify(account));
  } catch { /* private mode — the session still works until the tab closes */ }
}

export function clearGmSession() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ACCOUNT_KEY);
  } catch {}
}

// fetch with the token attached. Returns parsed JSON, or { error } — callers
// show the message rather than guessing at a status code.
export async function gmFetch(path, { method = 'GET', body } = {}) {
  const token = gmToken();
  try {
    const res = await fetch(path, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    // A dead or revoked token should not leave the screen insisting it is
    // signed in. Cleared here, once, wherever it is noticed.
    if (res.status === 401) { clearGmSession(); return { error: 'Signed out — sign in again.', signedOut: true }; }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: data.error || 'That did not work.' };
    return data;
  } catch {
    return { error: 'Connection failed' };
  }
}

export const register = (username, password, displayName) =>
  gmFetch('/api/gm/register', { method: 'POST', body: { username, password, displayName } });

export const login = (username, password) =>
  gmFetch('/api/gm/login', { method: 'POST', body: { username, password } });

export const me = () => gmFetch('/api/account/me');

// ── A player's seats ───────────────────────────────────────────────────────

export const listSeats = () => gmFetch('/api/account/seats');

export const saveSeat = (sessionCode, playerName, creatureId) =>
  gmFetch('/api/account/seats', { method: 'POST', body: { sessionCode, playerName, creatureId } });

export const forgetSeat = (id) =>
  gmFetch(`/api/account/seats/${id}`, { method: 'DELETE' });

// Remember where this player just sat down, if they are signed in at all.
//
// Fire-and-forget on purpose: entering the game is the point, and a seat that
// failed to save is a row missing from a list, not a reason to stop somebody
// getting to the table.
export function rememberSeat(sessionCode, playerName, creatureId) {
  if (!gmToken()) return Promise.resolve(null);
  return saveSeat(sessionCode, playerName, creatureId).catch(() => null);
}

export const pairSession = (code, dmPassword) =>
  gmFetch(`/api/gm/sessions/${encodeURIComponent(code)}/pair`, { method: 'POST', body: { dmPassword } });

export const unpairSession = (code) =>
  gmFetch(`/api/gm/sessions/${encodeURIComponent(code)}/pair`, { method: 'DELETE' });

export async function logout() {
  await gmFetch('/api/gm/logout', { method: 'POST' });
  clearGmSession();
}
