// What a tile map actually looks like to the server.
//
// Written because three rounds of diagnosing "players can see the whole map"
// from the symptoms alone landed on three different causes. The symptoms do
// not distinguish them; this does. It joins as the GM over the same socket the
// real client uses, so what it prints is exactly what the browser was handed.
//
//   node tools/diagnose-tiles.mjs <base-url> <session-code> <gm-password>
//   node tools/diagnose-tiles.mjs http://192.168.50.131:PORT ABC123 hunter2
//
// Read-only: it joins, reads, and disconnects. It changes nothing.

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const [baseUrl, code, pass] = process.argv.slice(2);
if (!baseUrl || !code || !pass) {
  console.error('usage: node tools/diagnose-tiles.mjs <base-url> <session-code> <gm-password>');
  process.exit(2);
}

// socket.io-client comes from whichever frontend tree is present.
let io;
for (const p of ['../restored-live/frontend/node_modules/socket.io-client',
                 '../frontend/node_modules/socket.io-client',
                 '../native-fork/frontend/node_modules/socket.io-client',
                 'socket.io-client']) {
  try { ({ io } = require(new URL(p, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'))); break; }
  catch { try { ({ io } = require(p)); break; } catch { /* keep looking */ } }
}
if (!io) { console.error('socket.io-client not found — run this from the repo root'); process.exit(2); }

const socket = io(baseUrl, { transports: ['websocket'], reconnection: false, timeout: 15000 });
const done = (msg, codeOut = 0) => { if (msg) console.error(msg); socket.close(); process.exit(codeOut); };
setTimeout(() => done('timed out waiting for the server', 1), 20000);

socket.on('connect_error', (e) => done(`could not connect to ${baseUrl}: ${e.message}`, 1));
socket.on('error', (e) => done(`server refused the join: ${JSON.stringify(e)}`, 1));

socket.on('connect', () => {
  socket.emit('join_session', { sessionCode: code.toUpperCase(), role: 'dm', name: 'diagnostic', dmPassword: pass });
});

socket.on('session_joined', ({ state }) => {
  const s = state || {};
  const sess = s.session || {};
  const tiles = s.tiles || [];
  const walls = s.walls || [];
  const doors = s.doors || [];
  const lights = s.lights || [];
  const tokens = s.tokens || [];

  const line = (k, v) => console.log(`  ${String(k).padEnd(22)} ${v}`);
  console.log(`\n=== ${sess.name || code} — map "${sess.map_name || sess.map_id}" ===`);
  line('map_type', sess.map_type ?? '(none)');
  line('map size', `${sess.map_width}x${sess.map_height} px, grid ${sess.grid_size || sess.map_grid_size}`);

  console.log('\nVISION SETTINGS');
  // The two switches that decide whether a player sees anything at all.
  // The MAP's flag wins over the session's; the server has already resolved
  // that into session.fow_enabled before sending it.
  const fow = !!sess.fow_enabled;
  line('fog of war', fow ? 'ON' : '*** OFF *** (every player sees the whole map)');
  const amb = sess.ambient_light || 'bright';
  line('ambient light', amb + (amb === 'dark'
    ? '  <-- 2D shows only what a light or darkvision reaches; 3D ignores this entirely'
    : ''));
  line('light sources', lights.length);

  console.log('\nGEOMETRY');
  line('tiles laid', tiles.length);
  line('walls on map', walls.length + (walls.length === 0 && tiles.length
    ? '  *** none — nothing blocks sight, so the visibility polygon is the whole board ***' : ''));
  line('doors on map', doors.length);
  const tileWalls = new Map();
  for (const w of walls) if (w.tile_id != null) tileWalls.set(w.tile_id, (tileWalls.get(w.tile_id) || 0) + 1);

  if (tiles.length) {
    console.log('\nPER TILE');
    console.log('  id     at        size  rot  has_geometry  walls  open edges');
    for (const t of tiles) {
      const open = ['n', 'e', 's', 'w'].filter((d) => t[`edge_${d}`]).join(',') || '(sealed)';
      const n = tileWalls.get(t.id) || 0;
      console.log(
        `  ${String(t.id).padEnd(6)} ${String(`${t.grid_col},${t.grid_row}`).padEnd(9)} `
        + `${String(`${t.grid_w}x${t.grid_h}`).padEnd(5)} ${String(t.rotation || 0).padEnd(4)} `
        + `${String(!!t.has_geometry).padEnd(13)} ${String(n).padEnd(6)} ${open}`
        + (n === 0 ? '   <-- contributes no walls' : ''));
    }
  }

  // is_player is what the Preview button binds to; fall back to showing
  // every token on this map when none is flagged, which is itself the
  // answer to "why does my preview look wrong".
  const players = tokens.filter((t) => t.is_player);
  const shown = players.length ? players : tokens.filter((t) => t.map_id === sess.map_id);
  console.log('\nPLAYER TOKENS');
  if (!players.length) {
    console.log(`  (no token is flagged is_player — listing all ${shown.length} token(s) on this map)`);
  }
  for (const t of shown) {
    console.log(`  #${t.id} ${t.name} at ${t.grid_col},${t.grid_row} on map ${t.map_id}`
      + `  vision=${t.vision_type || 'normal'} range=${t.vision_range ?? '-'}`
      + `  light=${t.token_light_bright || 0}/${t.token_light_dim || 0}`);
  }

  console.log('\nVERDICT');
  const bad = [];
  if (!fow) bad.push('Fog of war is OFF for this map — turn it on (Light/Dark panel); nothing else matters until then.');
  if (tiles.length && walls.length === 0) bad.push('No walls exist, so sight is not blocked anywhere. Tiles laid before the edge-wall fix need the backend restarted so the backfill runs.');
  const naked = tiles.filter((t) => !tileWalls.has(t.id));
  if (naked.length && walls.length) bad.push(`${naked.length} tile(s) contribute no walls (ids ${naked.slice(0, 8).map((t) => t.id).join(', ')}) — either every edge is open, or they predate the fix.`);
  if (amb === 'dark' && !lights.length) bad.push('Ambient is dark with no light sources: the 2D map is correctly black for a player without darkvision, while 3D stays lit because it is never told the ambient level.');
  if (!bad.length) console.log('  Nothing obviously wrong with the vision setup on this map.');
  for (const b of bad) console.log('  - ' + b);
  console.log('');
  done(null, 0);
});
