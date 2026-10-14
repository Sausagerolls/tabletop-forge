// A live connection to the player's Tabletop Forge session, used for actions that
// act on the player's token on the map (Wild Shape). Joins as a spectator under the
// player's name, the same way Tabletop Forge's own phone sheet does.
import { io } from 'socket.io-client';
import { api } from './api.js';

let sock = null;
let joinedKey = '';

function connect(conn) {
  const key = `${conn.server}|${conn.session}|${conn.player}`;
  if (sock && joinedKey === key) return sock;
  if (sock) sock.disconnect();
  sock = io(conn.server, { reconnection: true, timeout: 20000 });
  joinedKey = key;
  sock.on('connect', () => sock.emit('join_session', { sessionCode: conn.session, role: 'spectator', name: conn.player }));
  return sock;
}

// The player's token in the session: the one for this character (even while
// transformed), or the one with the player's name on it.
export async function findMyToken(conn, creatureId) {
  if (!conn.session) return null;
  const tokens = await api.tokens(conn.server, conn.session);
  const mine = (t) => Number(t.pretransform?.creature_id ?? t.creature_id) === Number(creatureId);
  return tokens.find(mine) || tokens.find((t) => t.is_player && String(t.player_name || '').toLowerCase() === conn.player.toLowerCase()) || null;
}

function emitWhenReady(conn, event, payload) {
  const s = connect(conn);
  return new Promise((resolve, reject) => {
    const onErr = (e) => { s.off('error', onErr); reject(new Error(e?.message || 'Tabletop Forge refused that.')); };
    s.on('error', onErr);
    const go = () => { s.emit(event, payload); setTimeout(() => { s.off('error', onErr); resolve(); }, 2500); };
    if (s.connected) setTimeout(go, 300); else s.once('connect', () => setTimeout(go, 500));
  });
}

export async function wildShapeOnMap(conn, creatureId, formId) {
  const tok = await findMyToken(conn, creatureId);
  if (!tok) throw new Error('No token for you on the map in this session yet.');
  await emitWhenReady(conn, 'player_wildshape', { tokenId: tok.id, creatureId: formId });
}

export async function revertOnMap(conn, creatureId) {
  const tok = await findMyToken(conn, creatureId);
  if (!tok) return;
  await emitWhenReady(conn, 'player_wildshape_revert', { tokenId: tok.id });
}
