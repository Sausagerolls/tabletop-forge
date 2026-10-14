// Talks to a Tabletop Forge server. Characters are TTF creatures owned by the
// player's name, so the GM sees them in Tabletop Forge too.

const CONN_KEY = 'wd_connection';
const RECENT_KEY = 'wd_recent_characters';

export function loadConnection() {
  try { return JSON.parse(localStorage.getItem(CONN_KEY) || 'null'); } catch { return null; }
}
export function saveConnection(c) {
  try { localStorage.setItem(CONN_KEY, JSON.stringify(c)); } catch { /* storage unavailable */ }
}
export function recentCharacters() {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch { return []; }
}
export function rememberCharacter(entry) {
  const list = recentCharacters().filter((r) => !(r.server === entry.server && r.id === entry.id));
  list.unshift({ ...entry, at: Date.now() });
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 12))); } catch { /* storage unavailable */ }
}
export function forgetCharacter(server, id) {
  const list = recentCharacters().filter((r) => !(r.server === server && r.id === id));
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(list)); } catch { /* storage unavailable */ }
}

export const normaliseServer = (url) => {
  let u = String(url || '').trim().replace(/\/+$/, '');
  if (u && !/^https?:\/\//i.test(u)) u = 'http://' + u;
  return u;
};

async function call(server, path, opts = {}) {
  const res = await fetch(server + path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
  const text = await res.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!res.ok) throw new Error((body && body.error) || `${res.status} ${res.statusText}`);
  return body;
}

export const api = {
  health: (s) => call(s, '/api/health'),
  session: (s, code) => call(s, `/api/sessions/${encodeURIComponent(String(code).toUpperCase())}`),
  // Crawlers are hidden from Tabletop Forge's own library; this app asks for them by name.
  characters: (s, owner) => call(s, `/api/creatures?filter=characters&include_crawlers=1&player_owner=${encodeURIComponent(owner)}`),
  get: (s, id) => call(s, `/api/creatures/${id}`),
  create: (s, data) => call(s, '/api/creatures', { method: 'POST', body: JSON.stringify(data) }),
  update: (s, id, data) => call(s, `/api/creatures/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  spells: (s, q = {}) => call(s, `/api/spell-library?${new URLSearchParams(q)}`),
  items: (s, q = {}) => call(s, `/api/item-library?${new URLSearchParams(q)}`),
  creatures: (s, q = {}) => call(s, `/api/creatures?${new URLSearchParams(q)}`),
  tokens: (s, code) => call(s, `/api/sessions/${encodeURIComponent(code)}/tokens`),
  // 5eTools mirror, through Tabletop Forge (the same search the main app uses).
  compendiumSearch: (s, q, limit = 60) => call(s, `/api/compendium/creatures?${new URLSearchParams({ q, limit })}`),
  compendiumGet: (s, source, name) => call(s, `/api/compendium/creatures/${encodeURIComponent(source)}/${encodeURIComponent(name)}`),
};
