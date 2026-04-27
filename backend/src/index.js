require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const db = require('./db');

const mapsRouter = require('./routes/maps');
const makeCreaturesRouter = require('./routes/creatures');
const sessionsRouter = require('./routes/sessions');
const aiRouter = require('./routes/ai');
const wallsRouter = require('./routes/walls');
const doorsRouter = require('./routes/doors');
const lightsRouter = require('./routes/lights');
const dd2vttRouter = require('./routes/dd2vtt');
const spellLibraryRouter = require('./routes/spell_library');
const languagesRouter = require('./routes/languages');
const settingsRouter = require('./routes/settings');
const { router: pluginsRouter, reconcilePluginsTable } = require('./routes/plugins');

const app = express();
const server = http.createServer(app);
// pingInterval/pingTimeout tuned for mobile reliability:
// — pingInterval (25 s) keeps the WebSocket "active" ahead of the
//   ~60 s idle timeouts on Cloudflare and most reverse proxies.
// — pingTimeout (60 s, up from the 20 s default) tolerates the brief
//   stalls iOS WebKit and Brave-on-iOS hit during cell-tower handover,
//   memory-pressure pauses, and the lock-screen suspend that fires
//   even on actively-used tabs. The trade-off is that a permanently
//   gone client takes ~85 s to be evicted server-side; that's fine
//   for a small-room VTT where there's almost never reconnect storm.
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingInterval: 25000,
  pingTimeout: 60000,
});

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

const SOUNDS_DIR = path.join(__dirname, '../sounds');
const AMBIENT_DIR = path.join(SOUNDS_DIR, 'ambient');
const SOUND_EXTS = new Set(['.mp3', '.ogg', '.wav', '.m4a', '.webm', '.flac']);
app.use('/sounds', express.static(SOUNDS_DIR));
app.get('/api/sounds', (_req, res) => {
  try {
    const results = [];
    // Root-level audio files (legacy flat layout)
    for (const f of fs.readdirSync(SOUNDS_DIR)) {
      const full = path.join(SOUNDS_DIR, f);
      if (fs.statSync(full).isFile() && SOUND_EXTS.has(path.extname(f).toLowerCase()))
        results.push(f);
    }
    // Subdirectory files (excluding ambient which has its own endpoint)
    for (const dir of fs.readdirSync(SOUNDS_DIR)) {
      if (dir === 'ambient') continue;
      const full = path.join(SOUNDS_DIR, dir);
      if (!fs.statSync(full).isDirectory()) continue;
      for (const f of fs.readdirSync(full)) {
        if (SOUND_EXTS.has(path.extname(f).toLowerCase()))
          results.push(`${dir}/${f}`);
      }
    }
    results.sort();
    res.json(results);
  } catch { res.json([]); }
});
app.get('/api/sounds/ambient', (_req, res) => {
  try {
    const files = fs.readdirSync(AMBIENT_DIR)
      .filter(f => SOUND_EXTS.has(path.extname(f).toLowerCase()))
      .sort();
    res.json(files);
  } catch { res.json([]); }
});

// ── Sound upload ──────────────────────────────────────────────────────────────
const soundUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      let dest;
      if (req.body.category === 'ambient') {
        dest = AMBIENT_DIR;
      } else {
        const subcat = (req.body.category || 'other')
          .replace(/[^a-zA-Z0-9_\-]/g, '-').toLowerCase() || 'other';
        dest = path.join(SOUNDS_DIR, subcat);
      }
      fs.mkdirSync(dest, { recursive: true });
      cb(null, dest);
    },
    filename: (req, file, cb) => {
      // sanitize: strip path separators and spaces
      const safe = file.originalname
        .replace(/[/\\]/g, '_')
        .replace(/\s+/g, '-')
        .replace(/[^a-zA-Z0-9._\-]/g, '_');
      cb(null, safe);
    },
  }),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    cb(null, SOUND_EXTS.has(path.extname(file.originalname).toLowerCase()));
  },
});

app.post('/api/sounds/upload', soundUpload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No valid audio file uploaded' });
  const cat = req.body.category || 'other';
  const isAmbient = cat === 'ambient';
  const subcat = isAmbient ? 'ambient' : (cat.replace(/[^a-zA-Z0-9_\-]/g, '-').toLowerCase() || 'other');
  res.json({ filename: req.file.filename, relpath: `${subcat}/${req.file.filename}`, category: subcat });
});

app.delete('/api/sounds/*', (req, res) => {
  const relpath = req.params[0];
  if (!relpath || relpath.includes('..'))
    return res.status(400).json({ error: 'Invalid path' });
  const filepath = path.join(SOUNDS_DIR, relpath);
  if (!filepath.startsWith(SOUNDS_DIR + path.sep))
    return res.status(400).json({ error: 'Invalid path' });
  try {
    fs.unlinkSync(filepath);
    res.json({ ok: true });
  } catch {
    res.status(404).json({ error: 'File not found' });
  }
});

app.use('/api/maps', mapsRouter);
app.use('/api/creatures', makeCreaturesRouter(io));
app.use('/api/sessions', sessionsRouter);
app.use('/api/ai', aiRouter);
app.use('/api/walls', wallsRouter);
app.use('/api/doors', doorsRouter);
app.use('/api/lights', lightsRouter);
app.use('/api/dd2vtt', dd2vttRouter);
app.use('/api/spell-library', spellLibraryRouter);
app.use('/api/languages', languagesRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/plugins', pluginsRouter);

app.get('/api/health', (req, res) => res.json({ ok: true }));

// ─── Add movement_actions column to creatures if missing ─────────────────────
db.query(`ALTER TABLE creatures ADD COLUMN IF NOT EXISTS movement_actions JSONB DEFAULT '[]'`)
  .catch(err => console.error('movement_actions migration error:', err));
db.query(`ALTER TABLE creatures ADD COLUMN IF NOT EXISTS initiative_bonus INTEGER DEFAULT 0`)
  .catch(err => console.error('initiative_bonus migration error:', err));

// ─── Ensure dm_markers table exists (migration for existing installs) ─────────
db.query(`
  CREATE TABLE IF NOT EXISTS dm_markers (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
    map_id INTEGER REFERENCES maps(id) ON DELETE CASCADE,
    marker_type VARCHAR(50) NOT NULL DEFAULT 'note',
    label VARCHAR(100) NOT NULL DEFAULT '',
    note TEXT DEFAULT '',
    grid_col FLOAT NOT NULL DEFAULT 0,
    grid_row FLOAT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
  )
`).catch(err => console.error('dm_markers migration error:', err));

// ─── Socket.io ───────────────────────────────────────────────────────────────

// Track connected users per session
const sessionUsers = {}; // sessionCode -> Map<socketId, {name, role}>
const sessionTemplates = {}; // sessionCode -> Array<{ id, type, points, color, label }> — DM-only
const sessionUserColors = {}; // sessionCode -> { name: color }

async function getSessionState(sessionCode) {
  const sessionRes = await db.query(
    `SELECT s.*, m.image_path AS map_image, m.name AS map_name, m.width AS map_width, m.height AS map_height,
            m.spawn_col AS map_spawn_col, m.spawn_row AS map_spawn_row
     FROM sessions s LEFT JOIN maps m ON s.map_id = m.id
     WHERE s.session_code = $1`,
    [sessionCode]
  );
  if (!sessionRes.rows.length) return null;
  const session = sessionRes.rows[0];

  let wallsRows = [];
  let doorsRows = [];
  let lightsRows = [];
  let tokensRows = [];
  let darknessRows = [];
  let dmMarkersRows = [];
  if (session.map_id) {
    const wallsRes = await db.query(
      'SELECT * FROM walls WHERE map_id=$1 ORDER BY created_at',
      [session.map_id]
    );
    wallsRows = wallsRes.rows;
    const doorsRes = await db.query(
      'SELECT * FROM doors WHERE map_id=$1 ORDER BY created_at',
      [session.map_id]
    );
    doorsRows = doorsRes.rows;
    const lightsRes = await db.query(
      'SELECT * FROM light_sources WHERE map_id=$1 ORDER BY created_at',
      [session.map_id]
    );
    lightsRows = lightsRes.rows;
    const tokensRes = await db.query(
      `SELECT st.*, c.image_path AS creature_image, c.dexterity AS creature_dex, COALESCE(c.initiative_bonus, 0) AS initiative_bonus
       FROM session_tokens st
       LEFT JOIN creatures c ON st.creature_id = c.id
       WHERE st.session_id = $1 AND st.map_id = $2
       ORDER BY st.z_index, st.id`,
      [session.id, session.map_id]
    );
    tokensRows = tokensRes.rows;
    const darknessRes = await db.query(
      'SELECT * FROM magical_darkness WHERE session_id=$1 AND map_id=$2 ORDER BY created_at',
      [session.id, session.map_id]
    );
    darknessRows = darknessRes.rows;
    const dmMarkersRes = await db.query(
      'SELECT * FROM dm_markers WHERE session_id=$1 AND map_id=$2 ORDER BY created_at',
      [session.id, session.map_id]
    );
    dmMarkersRows = dmMarkersRes.rows;
  } else {
    // No map selected — still load player tokens that have no map association
    const tokensRes = await db.query(
      `SELECT st.*, c.image_path AS creature_image
       FROM session_tokens st
       LEFT JOIN creatures c ON st.creature_id = c.id
       WHERE st.session_id = $1 AND st.map_id IS NULL
       ORDER BY st.z_index, st.id`,
      [session.id]
    );
    tokensRows = tokensRes.rows;
  }

  return {
    session: {
      ...session,
      combat_active: session.combat_active || false,
      combat_turn: session.combat_turn || 0,
      fow_enabled: session.fow_enabled || false,
      fow_blur: session.fow_blur ?? 16,
      fow_color: session.fow_color || '#000000',
      ambient_light: session.ambient_light || 'bright',
    },
    tokens: tokensRows,
    walls: wallsRows,
    doors: doorsRows,
    lights: lightsRows,
    magicalDarkness: darknessRows,
    dmMarkers: dmMarkersRows,
    spawnPoint: { col: session.map_spawn_col ?? 0, row: session.map_spawn_row ?? 0 },
  };
}

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  // ── Join session ──────────────────────────────────────────────────────────
  socket.on('join_session', async ({ sessionCode, role, name, dmPassword }) => {
    try {
      const res = await db.query(
        'SELECT * FROM sessions WHERE session_code = $1',
        [sessionCode]
      );
      if (!res.rows.length) {
        socket.emit('error', { message: 'Session not found' });
        return;
      }
      const session = res.rows[0];

      if (role === 'dm') {
        const valid = await bcrypt.compare(dmPassword || '', session.dm_password_hash);
        if (!valid) {
          socket.emit('error', { message: 'Invalid DM password' });
          return;
        }
      }

      socket.join(sessionCode);
      socket.data.sessionCode = sessionCode;
      socket.data.role = role;
      socket.data.name = name;

      if (!sessionUsers[sessionCode]) sessionUsers[sessionCode] = new Map();
      sessionUsers[sessionCode].set(socket.id, { name, role });

      const state = await getSessionState(sessionCode);
      // Strip DM markers from player state but include spell templates so
      // players see plugin-driven AOE effects (fire/water/etc.) on the map.
      // Templates are non-interactive for players — write-side socket
      // handlers all gate on socket.data.role === 'dm'.
      const sendState = role === 'dm'
        ? { ...state, spellTemplates: sessionTemplates[sessionCode] || [] }
        : { ...state, spellTemplates: sessionTemplates[sessionCode] || [], dmMarkers: [] };
      const colors = sessionUserColors[sessionCode] || {};
      const currentUsers = Array.from(sessionUsers[sessionCode].values());
      socket.emit('session_joined', { state: sendState, role, userColors: colors, users: currentUsers });

      // Broadcast updated user list
      io.to(sessionCode).emit('users_updated', {
        users: Array.from(sessionUsers[sessionCode].values()),
      });
    } catch (err) {
      console.error(err);
      socket.emit('error', { message: 'Failed to join session' });
    }
  });

  // ── Token movement ────────────────────────────────────────────────────────
  socket.on('move_token', async ({ tokenId, gridCol, gridRow }) => {
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;

    try {
      await db.query(
        'UPDATE session_tokens SET grid_col=$1, grid_row=$2 WHERE id=$3',
        [gridCol, gridRow, tokenId]
      );
      io.to(sessionCode).emit('token_moved', { tokenId, gridCol, gridRow });
    } catch (err) {
      console.error(err);
    }
  });

  // ── HP update — DM, or the player who owns the token ────────────────────
  socket.on('update_token_hp', async ({ tokenId, currentHp }) => {
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;

    try {
      // Permission: DM can update any token; a player can only update their own.
      const prev = await db.query(
        'SELECT current_hp, creature_id, player_name FROM session_tokens WHERE id=$1',
        [tokenId]
      );
      if (!prev.rows.length) return;
      const row = prev.rows[0];
      const isDM = socket.data.role === 'dm';
      const isOwner = !!row.player_name && row.player_name === socket.data.name;
      if (!isDM && !isOwner) return;

      const oldHp = Number(row.current_hp) || 0;
      await db.query('UPDATE session_tokens SET current_hp=$1 WHERE id=$2', [currentHp, tokenId]);
      io.to(sessionCode).emit('token_hp_changed', { tokenId, currentHp });

      // Concentration auto-prompt: if HP went down and the creature is
      // concentrating on a spell, broadcast a check with DC = max(10, dmg/2).
      const damage = oldHp - Number(currentHp);
      if (damage > 0 && row.creature_id) {
        const cre = await db.query(
          'SELECT concentrating_on, save_con FROM creatures WHERE id=$1',
          [row.creature_id]
        );
        const c = cre.rows[0];
        if (c && c.concentrating_on) {
          const dc = Math.max(10, Math.floor(damage / 2));
          io.to(sessionCode).emit('concentration_check', {
            tokenId,
            creatureId: row.creature_id,
            dc,
            damage,
            spellName: c.concentrating_on,
            conSaveBonus: c.save_con,
          });
        }
      }
    } catch (err) {
      console.error(err);
    }
  });

  // ── Temp HP update — DM, or the player who owns the token ───────────────
  socket.on('update_token_temp_hp', async ({ tokenId, tempHp }) => {
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;

    try {
      const prev = await db.query(
        'SELECT player_name FROM session_tokens WHERE id=$1',
        [tokenId]
      );
      if (!prev.rows.length) return;
      const isDM = socket.data.role === 'dm';
      const isOwner = !!prev.rows[0].player_name && prev.rows[0].player_name === socket.data.name;
      if (!isDM && !isOwner) return;

      const safeTempHp = Math.max(0, Number(tempHp) || 0);
      await db.query('UPDATE session_tokens SET temp_hp=$1 WHERE id=$2', [safeTempHp, tokenId]);
      io.to(sessionCode).emit('token_temp_hp_changed', { tokenId, tempHp: safeTempHp });
    } catch (err) {
      console.error(err);
    }
  });

  // ── Conditions update (DM only) ───────────────────────────────────────────
  socket.on('update_token_conditions', async ({ tokenId, conditions }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;

    try {
      await db.query(
        'UPDATE session_tokens SET conditions=$1 WHERE id=$2',
        [JSON.stringify(conditions), tokenId]
      );
      io.to(sessionCode).emit('token_conditions_changed', { tokenId, conditions });
    } catch (err) {
      console.error(err);
    }
  });

  // ── Initiative update (DM only) ───────────────────────────────────────────
  socket.on('update_token_initiative', async ({ tokenId, initiative }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;

    try {
      await db.query(
        'UPDATE session_tokens SET initiative=$1 WHERE id=$2',
        [initiative, tokenId]
      );
      io.to(sessionCode).emit('token_initiative_changed', { tokenId, initiative });
    } catch (err) {
      console.error(err);
    }
  });

  // ── Toggle visibility (DM only) ───────────────────────────────────────────
  socket.on('toggle_token_visibility', async ({ tokenId }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;

    try {
      const res = await db.query(
        'UPDATE session_tokens SET is_hidden = NOT is_hidden WHERE id=$1 RETURNING is_hidden',
        [tokenId]
      );
      const isHidden = res.rows[0].is_hidden;
      io.to(sessionCode).emit('token_visibility_changed', { tokenId, isHidden });
    } catch (err) {
      console.error(err);
    }
  });

  // ── Toggle flying flag (DM only) ─────────────────────────────────────────
  socket.on('toggle_token_flying', async ({ tokenId }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      const res = await db.query(
        'UPDATE session_tokens SET is_flying = NOT is_flying WHERE id=$1 RETURNING is_flying',
        [tokenId]
      );
      const isFlying = res.rows[0].is_flying;
      io.to(sessionCode).emit('token_flying_changed', { tokenId, isFlying });
    } catch (err) {
      console.error(err);
    }
  });

  // ── Add token to map (DM only) ────────────────────────────────────────────
  socket.on('add_token', async ({ sessionId, creatureId, gridCol, gridRow, mapId }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;

    try {
      const creatureRes = await db.query('SELECT * FROM creatures WHERE id=$1', [creatureId]);
      if (!creatureRes.rows.length) return;
      const creature = creatureRes.rows[0];

      // Resolve mapId from session if not provided
      const resolvedMapId = mapId || (await db.query('SELECT map_id FROM sessions WHERE id=$1', [sessionId])).rows[0]?.map_id || null;

      const tokenRes = await db.query(
        `INSERT INTO session_tokens
           (session_id, map_id, creature_id, name, image_path, size, grid_col, grid_row, current_hp, max_hp)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         RETURNING *`,
        [
          sessionId, resolvedMapId, creatureId, creature.name, creature.image_path,
          creature.size, gridCol, gridRow,
          creature.hit_points, creature.hit_points,
        ]
      );
      const token = { ...tokenRes.rows[0], creature_image: creature.image_path };
      io.to(sessionCode).emit('token_added', { token });
    } catch (err) {
      console.error(err);
    }
  });

  // ── Create player token ───────────────────────────────────────────────────
  socket.on('create_player_token', async ({ sessionId, playerName, maxHp, size, creatureId }) => {
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;

    try {
      // Resolve stats (and name/senses) from creature if provided
      let tokenHp = maxHp || 20;
      let tokenSize = size || 'medium';
      let tokenName = playerName;
      let tokenSenses = [];
      if (creatureId) {
        const cRes = await db.query('SELECT * FROM creatures WHERE id=$1', [creatureId]);
        if (cRes.rows.length) {
          const c = cRes.rows[0];
          tokenHp = c.hit_points || tokenHp;
          tokenSize = c.size || tokenSize;
          tokenName = c.name || playerName;
          if (c.senses) {
            try {
              tokenSenses = typeof c.senses === 'string' ? JSON.parse(c.senses) : c.senses;
            } catch { tokenSenses = []; }
          }
        }
      }

      const existing = await db.query(
        'SELECT * FROM session_tokens WHERE session_id=$1 AND player_name=$2 AND is_player=true',
        [sessionId, playerName]
      );
      if (existing.rows.length) {
        const tok = existing.rows[0];
        // Always update senses on reconnect
        await db.query(
          'UPDATE session_tokens SET senses=$1 WHERE id=$2',
          [JSON.stringify(tokenSenses), tok.id]
        );
        // Sync name, stats from creature if provided
        if (creatureId) {
          await db.query(
            'UPDATE session_tokens SET creature_id=$1, max_hp=$2, size=$3, name=$4 WHERE id=$5',
            [creatureId, tokenHp, tokenSize, tokenName, tok.id]
          );
        }
        // Re-fetch enriched token so creature_image is included, then broadcast to all clients
        const enrichedRes = await db.query(
          `SELECT st.*, c.image_path AS creature_image, c.dexterity AS creature_dex, COALESCE(c.initiative_bonus, 0) AS initiative_bonus
           FROM session_tokens st LEFT JOIN creatures c ON st.creature_id = c.id WHERE st.id = $1`,
          [tok.id]
        );
        const enrichedTok = enrichedRes.rows[0];
        io.to(sessionCode).emit('token_refreshed', { token: enrichedTok });
        socket.emit('player_token_ready', { tokenId: tok.id });
        return;
      }

      // Use map spawn point and current map for new player tokens
      const sessionInfoRes = await db.query('SELECT map_id FROM sessions WHERE id=$1', [sessionId]);
      const currentMapId = sessionInfoRes.rows[0]?.map_id || null;
      let spawnCol = 0, spawnRow = 0;
      if (currentMapId) {
        const mapInfo = await db.query('SELECT spawn_col, spawn_row FROM maps WHERE id=$1', [currentMapId]);
        spawnCol = Math.floor(mapInfo.rows[0]?.spawn_col ?? 0);
        spawnRow = Math.floor(mapInfo.rows[0]?.spawn_row ?? 0);
      }

      const tokenRes = await db.query(
        `INSERT INTO session_tokens
           (session_id, map_id, name, size, grid_col, grid_row, current_hp, max_hp, is_player, player_name, creature_id, senses)
         VALUES ($1,$2,$3,$4,$9,$10,$5,$5,true,$6,$7,$8)
         RETURNING *`,
        [sessionId, currentMapId, tokenName, tokenSize, tokenHp, playerName, creatureId || null, JSON.stringify(tokenSenses), spawnCol, spawnRow]
      );
      const newTokenId = tokenRes.rows[0].id;
      // Re-fetch with creature_image join so the image is included from the start
      const enrichedNewRes = await db.query(
        `SELECT st.*, c.image_path AS creature_image, c.dexterity AS creature_dex, COALESCE(c.initiative_bonus, 0) AS initiative_bonus
         FROM session_tokens st LEFT JOIN creatures c ON st.creature_id = c.id WHERE st.id = $1`,
        [newTokenId]
      );
      const token = enrichedNewRes.rows[0];
      socket.emit('player_token_ready', { tokenId: token.id });
      io.to(sessionCode).emit('token_added', { token });
    } catch (err) {
      console.error(err);
    }
  });

  // ── DM: force-respawn a player token (re-creates if deleted) ────────────
  socket.on('dm_respawn_player_token', async ({ playerName }) => {
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode || socket.data.role !== 'dm') return;
    try {
      const sessionRes = await db.query(
        'SELECT * FROM sessions WHERE session_code=$1', [sessionCode]
      );
      if (!sessionRes.rows.length) return;
      const session = sessionRes.rows[0];
      const currentMapId = session.map_id || null;

      // Check if token already exists ON THE CURRENT MAP
      const existing = await db.query(
        `SELECT * FROM session_tokens
         WHERE session_id=$1 AND player_name=$2 AND is_player=true
           AND (map_id=$3 OR ($3::integer IS NULL AND map_id IS NULL))`,
        [session.id, playerName, currentMapId]
      );
      if (existing.rows.length) {
        // Token exists on this map — notify the player to reconnect to it
        // and broadcast it so the DM panel refreshes
        const tok = existing.rows[0];
        io.to(sessionCode).emit('token_added', { token: tok });
        const users = sessionUsers[sessionCode];
        if (users) {
          for (const [sid, u] of users.entries()) {
            if (u.name === playerName) {
              io.to(sid).emit('player_token_ready', { tokenId: tok.id });
              break;
            }
          }
        }
        return;
      }

      // Get spawn point
      let spawnCol = 0, spawnRow = 0;
      if (currentMapId) {
        const mapInfo = await db.query('SELECT spawn_col, spawn_row FROM maps WHERE id=$1', [currentMapId]);
        spawnCol = Math.floor(mapInfo.rows[0]?.spawn_col ?? 0);
        spawnRow = Math.floor(mapInfo.rows[0]?.spawn_row ?? 0);
      }

      // Try to inherit stats from a creature linked to this player's token on any map
      let tokenHp = 20, tokenSize = 'medium', tokenName = playerName, tokenSenses = [];
      let creatureId = null;
      const anyToken = await db.query(
        `SELECT st.*, c.hit_points, c.size AS c_size, c.name AS c_name, c.senses AS c_senses
         FROM session_tokens st
         LEFT JOIN creatures c ON st.creature_id = c.id
         WHERE st.session_id=$1 AND st.player_name=$2 AND st.is_player=true
         ORDER BY st.id DESC LIMIT 1`,
        [session.id, playerName]
      );
      if (anyToken.rows.length) {
        const prev = anyToken.rows[0];
        tokenHp   = prev.hit_points || prev.max_hp || tokenHp;
        tokenSize = prev.c_size     || prev.size   || tokenSize;
        tokenName = prev.c_name     || prev.name   || tokenName;
        creatureId = prev.creature_id || null;
        try {
          tokenSenses = prev.c_senses
            ? (typeof prev.c_senses === 'string' ? JSON.parse(prev.c_senses) : prev.c_senses)
            : (prev.senses ? (typeof prev.senses === 'string' ? JSON.parse(prev.senses) : prev.senses) : []);
        } catch { tokenSenses = []; }
      }

      const tokenRes = await db.query(
        `INSERT INTO session_tokens
           (session_id, map_id, creature_id, name, size, grid_col, grid_row,
            current_hp, max_hp, is_player, player_name, senses)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8,true,$9,$10)
         RETURNING *`,
        [session.id, currentMapId, creatureId, tokenName, tokenSize,
         spawnCol, spawnRow, tokenHp, playerName, JSON.stringify(tokenSenses)]
      );
      const token = tokenRes.rows[0];

      io.to(sessionCode).emit('token_added', { token });

      const users = sessionUsers[sessionCode];
      if (users) {
        for (const [sid, u] of users.entries()) {
          if (u.name === playerName) {
            io.to(sid).emit('player_token_ready', { tokenId: token.id });
            break;
          }
        }
      }
    } catch (err) {
      console.error('dm_respawn_player_token error:', err);
    }
  });

  // ── DM Markers ───────────────────────────────────────────────────────────
  socket.on('add_dm_marker', async ({ markerType, label, note, gridCol, gridRow }) => {
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode || socket.data.role !== 'dm') return;
    try {
      const sessionRes = await db.query('SELECT * FROM sessions WHERE session_code=$1', [sessionCode]);
      if (!sessionRes.rows.length) return;
      const session = sessionRes.rows[0];
      const res = await db.query(
        `INSERT INTO dm_markers (session_id, map_id, marker_type, label, note, grid_col, grid_row)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [session.id, session.map_id || null, markerType, label || '', note || '', gridCol, gridRow]
      );
      socket.emit('dm_marker_added', { marker: res.rows[0] });
    } catch (err) { console.error(err); }
  });

  socket.on('remove_dm_marker', async ({ markerId }) => {
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode || socket.data.role !== 'dm') return;
    try {
      await db.query('DELETE FROM dm_markers WHERE id=$1', [markerId]);
      socket.emit('dm_marker_removed', { markerId });
    } catch (err) { console.error(err); }
  });

  socket.on('update_dm_marker', async ({ markerId, note, label }) => {
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode || socket.data.role !== 'dm') return;
    try {
      const res = await db.query(
        'UPDATE dm_markers SET note=$1, label=$2 WHERE id=$3 RETURNING *',
        [note || '', label || '', markerId]
      );
      if (res.rows.length) socket.emit('dm_marker_updated', { marker: res.rows[0] });
    } catch (err) { console.error(err); }
  });

  // ── DM sends treasure items to a player's creature inventory ────────────
  socket.on('send_treasure', async ({ creatureId, items }) => {
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode || socket.data.role !== 'dm') return;
    if (!Array.isArray(items) || !creatureId) return;
    try {
      const cRes = await db.query('SELECT inventory FROM creatures WHERE id=$1', [creatureId]);
      if (!cRes.rows.length) return;
      let inv = cRes.rows[0].inventory || [];
      if (typeof inv === 'string') { try { inv = JSON.parse(inv); } catch { inv = []; } }
      const newInv = [...inv, ...items.map(it => ({ item_type: 'item', qty: 1, ...it, equipped: false }))];
      await db.query('UPDATE creatures SET inventory=$1 WHERE id=$2', [JSON.stringify(newInv), creatureId]);
      io.to(sessionCode).emit('treasure_received', { creatureId, items, newInventory: newInv });
    } catch (err) { console.error('send_treasure error:', err); }
  });

  // ── DM sends currency to a player's creature ────────────────────────────
  socket.on('send_currency', async ({ creatureId, gp, sp, cp }) => {
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode || socket.data.role !== 'dm') return;
    if (!creatureId) return;
    const addGp = parseInt(gp) || 0;
    const addSp = parseInt(sp) || 0;
    const addCp = parseInt(cp) || 0;
    if (addGp === 0 && addSp === 0 && addCp === 0) return;
    try {
      const result = await db.query(
        `UPDATE creatures
         SET currency_gp = currency_gp + $1,
             currency_sp = currency_sp + $2,
             currency_cp = currency_cp + $3
         WHERE id = $4
         RETURNING currency_gp, currency_sp, currency_cp`,
        [addGp, addSp, addCp, creatureId]
      );
      if (result.rows.length) {
        io.to(sessionCode).emit('currency_received', {
          creatureId,
          gp: addGp, sp: addSp, cp: addCp,
          newGp: result.rows[0].currency_gp,
          newSp: result.rows[0].currency_sp,
          newCp: result.rows[0].currency_cp,
        });
      }
    } catch (err) { console.error('send_currency error:', err); }
  });

  // ── Spell templates — persistent on-map AOE shapes ────────────────────
  // Templates are placed/edited only by the DM (every handler below
  // gates on role === 'dm'), but the resulting shapes broadcast to every
  // socket in the room so players see plugin-driven elemental effects
  // (fire/water/etc.) on the map.

  socket.on('place_template', ({ type, points, color, label }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    if (!Array.isArray(points) || points.length < 3) return;
    const allowed = new Set(['cone', 'circle', 'line', 'square']);
    if (!allowed.has(type)) return;
    const tpl = {
      id: require('crypto').randomUUID(),
      type,
      points: points.slice(0, 8).map(Number),
      color: typeof color === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(color) ? color : '#a855f7',
      label: typeof label === 'string' ? label.slice(0, 60) : '',
    };
    if (!sessionTemplates[sessionCode]) sessionTemplates[sessionCode] = [];
    sessionTemplates[sessionCode].push(tpl);
    io.to(sessionCode).emit('template_placed', tpl);
  });

  socket.on('update_template', ({ id, points, color, label }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    const list = sessionTemplates[sessionCode];
    if (!list) return;
    const t = list.find(x => x.id === id);
    if (!t) return;
    if (Array.isArray(points) && points.length >= 3) {
      t.points = points.slice(0, 8).map(Number);
    }
    if (typeof color === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(color)) {
      t.color = color;
    }
    if (typeof label === 'string') {
      t.label = label.slice(0, 60);
    }
    io.to(sessionCode).emit('template_updated', t);
  });

  socket.on('delete_template', ({ id }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    const list = sessionTemplates[sessionCode];
    if (!list) return;
    const idx = list.findIndex(t => t.id === id);
    if (idx === -1) return;
    list.splice(idx, 1);
    io.to(sessionCode).emit('template_deleted', { id });
  });

  socket.on('clear_templates', () => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    sessionTemplates[sessionCode] = [];
    io.to(sessionCode).emit('templates_cleared');
  });

  // ── Send a handout (DM only) — broadcast to room or whisper to player ───
  socket.on('send_handout', ({ target, title, body, imageUrl }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    const payload = {
      title: String(title || '').slice(0, 200),
      body: String(body || '').slice(0, 8000),
      imageUrl: typeof imageUrl === 'string' ? imageUrl.slice(0, 1000) : '',
      sentAt: Date.now(),
    };
    if (!target || target === 'all') {
      io.to(sessionCode).emit('handout_received', payload);
      return;
    }
    // Find sockets in the room with the matching player name and emit only to them.
    const room = io.sockets.adapter.rooms.get(sessionCode);
    if (!room) return;
    for (const sid of room) {
      const s = io.sockets.sockets.get(sid);
      if (s && s.data && s.data.name === target) {
        s.emit('handout_received', payload);
      }
    }
  });

  // ── Set token light source (player: their own token; DM: any) ────────────
  socket.on('set_token_light', async ({ tokenId, brightFt, dimFt, color }) => {
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      const safeColor = typeof color === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(color) ? color : '#fbbf24';
      await db.query(
        'UPDATE session_tokens SET token_light_bright=$1, token_light_dim=$2, token_light_color=$3 WHERE id=$4',
        [brightFt || 0, dimFt || 0, safeColor, tokenId]
      );
      io.to(sessionCode).emit('token_light_changed', {
        tokenId,
        brightFt: brightFt || 0,
        dimFt: dimFt || 0,
        color: safeColor,
      });
    } catch (err) {
      console.error(err);
    }
  });

  // ── Update player token stats from creature (player only) ─────────────────
  socket.on('update_player_token_from_creature', async ({ tokenId, creatureId }) => {
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;

    try {
      const cRes = await db.query('SELECT * FROM creatures WHERE id=$1', [creatureId]);
      if (!cRes.rows.length) return;
      const creature = cRes.rows[0];

      await db.query(
        'UPDATE session_tokens SET creature_id=$1, max_hp=$2, size=$3, name=$4 WHERE id=$5',
        [creatureId, creature.hit_points, creature.size, creature.name, tokenId]
      );
      io.to(sessionCode).emit('token_size_changed', { tokenId, size: creature.size });
      io.to(sessionCode).emit('token_max_hp_changed', { tokenId, maxHp: creature.hit_points });
      io.to(sessionCode).emit('token_name_changed', { tokenId, name: creature.name });
    } catch (err) {
      console.error(err);
    }
  });

  // ── Remove token (DM only) ────────────────────────────────────────────────
  socket.on('remove_token', async ({ tokenId }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;

    try {
      await db.query('DELETE FROM session_tokens WHERE id=$1', [tokenId]);
      io.to(sessionCode).emit('token_removed', { tokenId });
    } catch (err) {
      console.error(err);
    }
  });

  // ── Change map (DM only) ──────────────────────────────────────────────────
  socket.on('change_map', async ({ sessionId, mapId }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;

    try {
      await db.query('UPDATE sessions SET map_id=$1 WHERE id=$2', [mapId || null, sessionId]);
      if (!mapId) {
        io.to(sessionCode).emit('map_changed', { map: null, walls: [], doors: [], lights: [], tokens: [], magicalDarkness: [] });
        return;
      }
      const mapRes = await db.query('SELECT * FROM maps WHERE id=$1', [mapId]);
      if (!mapRes.rows.length) return;
      const map = mapRes.rows[0];
      const wallsRes    = await db.query('SELECT * FROM walls WHERE map_id=$1 ORDER BY created_at', [mapId]);
      const doorsRes    = await db.query('SELECT * FROM doors WHERE map_id=$1 ORDER BY created_at', [mapId]);
      const lightsRes   = await db.query('SELECT * FROM light_sources WHERE map_id=$1 ORDER BY created_at', [mapId]);
      const tokensRes   = await db.query(
        `SELECT st.*, c.image_path AS creature_image
         FROM session_tokens st
         LEFT JOIN creatures c ON st.creature_id = c.id
         WHERE st.session_id = $1 AND st.map_id = $2
         ORDER BY st.z_index, st.id`,
        [sessionId, mapId]
      );
      const darknessRes = await db.query(
        'SELECT * FROM magical_darkness WHERE session_id=$1 AND map_id=$2 ORDER BY created_at',
        [sessionId, mapId]
      );
      io.to(sessionCode).emit('map_changed', {
        map,
        walls: wallsRes.rows,
        doors: doorsRes.rows,
        lights: lightsRes.rows,
        tokens: tokensRes.rows,
        magicalDarkness: darknessRes.rows,
        spawnPoint: { col: map.spawn_col ?? 0, row: map.spawn_row ?? 0 },
      });
    } catch (err) {
      console.error(err);
    }
  });

  // ── Wall CRUD (DM only) ───────────────────────────────────────────────────
  socket.on('add_wall', async ({ mapId, type, points }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      const { v4: uuidv4 } = require('uuid');
      const result = await db.query(
        'INSERT INTO walls (id, map_id, type, points) VALUES ($1,$2,$3,$4) RETURNING *',
        [uuidv4(), mapId, type, JSON.stringify(points)]
      );
      io.to(sessionCode).emit('wall_added', { wall: result.rows[0] });
    } catch (err) {
      console.error(err);
    }
  });

  socket.on('delete_wall', async ({ wallId }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      await db.query('DELETE FROM walls WHERE id=$1', [wallId]);
      io.to(sessionCode).emit('wall_deleted', { wallId });
    } catch (err) {
      console.error(err);
    }
  });

  socket.on('clear_walls', async ({ mapId }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      await db.query('DELETE FROM walls WHERE map_id=$1', [mapId]);
      io.to(sessionCode).emit('walls_cleared');
    } catch (err) {
      console.error(err);
    }
  });

  // ── Door CRUD + toggle ───────────────────────────────────────────────────
  socket.on('add_door', async ({ mapId, style, points }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      const { v4: uuidv4 } = require('uuid');
      const result = await db.query(
        'INSERT INTO doors (id, map_id, style, points, open_dir) VALUES ($1,$2,$3,$4,$5) RETURNING *',
        [uuidv4(), mapId, style || 'standard', JSON.stringify(points), 1]
      );
      io.to(sessionCode).emit('door_added', { door: result.rows[0] });
    } catch (err) { console.error(err); }
  });

  socket.on('delete_door', async ({ doorId }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      await db.query('DELETE FROM doors WHERE id=$1', [doorId]);
      io.to(sessionCode).emit('door_deleted', { doorId });
    } catch (err) { console.error(err); }
  });

  // Players and DM can toggle doors open/closed
  socket.on('toggle_door', async ({ doorId }) => {
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      const res = await db.query(
        'UPDATE doors SET is_open = NOT is_open WHERE id=$1 RETURNING id, is_open',
        [doorId]
      );
      if (res.rows.length) {
        io.to(sessionCode).emit('door_toggled', { doorId: res.rows[0].id, isOpen: res.rows[0].is_open });
      }
    } catch (err) { console.error(err); }
  });

  // DM can flip the swing direction of a door
  socket.on('flip_door_dir', async ({ doorId }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      const res = await db.query(
        'UPDATE doors SET open_dir = open_dir * -1 WHERE id=$1 RETURNING id, open_dir',
        [doorId]
      );
      if (res.rows.length) {
        io.to(sessionCode).emit('door_dir_flipped', { doorId: res.rows[0].id, openDir: res.rows[0].open_dir });
      }
    } catch (err) { console.error(err); }
  });

  socket.on('clear_doors', async ({ mapId }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      await db.query('DELETE FROM doors WHERE map_id=$1', [mapId]);
      io.to(sessionCode).emit('doors_cleared');
    } catch (err) { console.error(err); }
  });

  // ── Light source CRUD (DM only) ──────────────────────────────────────────
  socket.on('add_light', async ({ mapId, x, y, brightRadius, dimRadius, label, color, direction, spreadAngle }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      const { v4: uuidv4 } = require('uuid');
      const result = await db.query(
        `INSERT INTO light_sources (id, map_id, x, y, bright_radius, dim_radius, label, color, direction, spread_angle)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
        [uuidv4(), mapId, x, y, brightRadius || 60, dimRadius || brightRadius * 2 || 120, label || '', color || '#fbbf24', direction || 0, spreadAngle || 360]
      );
      io.to(sessionCode).emit('light_added', { light: result.rows[0] });
    } catch (err) { console.error(err); }
  });

  socket.on('delete_light', async ({ lightId }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      await db.query('DELETE FROM light_sources WHERE id=$1', [lightId]);
      io.to(sessionCode).emit('light_deleted', { lightId });
    } catch (err) { console.error(err); }
  });

  socket.on('update_light', async ({ lightId, brightRadius, dimRadius, color, label, direction, spreadAngle }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      const result = await db.query(
        `UPDATE light_sources SET bright_radius=$1, dim_radius=$2, color=$3, label=$4, direction=$5, spread_angle=$6 WHERE id=$7 RETURNING *`,
        [brightRadius, dimRadius, color || '#fbbf24', label || '', direction || 0, spreadAngle || 360, lightId]
      );
      if (result.rows.length) io.to(sessionCode).emit('light_updated', { light: result.rows[0] });
    } catch (err) { console.error(err); }
  });

  socket.on('clear_lights', async ({ mapId }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      await db.query('DELETE FROM light_sources WHERE map_id=$1', [mapId]);
      io.to(sessionCode).emit('lights_cleared');
    } catch (err) { console.error(err); }
  });

  // ── Magical darkness CRUD (DM only) ─────────────────────────────────────
  socket.on('add_magical_darkness', async ({ sessionId, mapId, x, y, radius, zoneType, shape, polyPoints }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      const { v4: uuidv4 } = require('uuid');
      const resolvedMapId = mapId || (await db.query('SELECT map_id FROM sessions WHERE id=$1', [sessionId])).rows[0]?.map_id || null;
      const type = (zoneType === 'heavy-fog') ? 'heavy-fog' : (zoneType === 'water') ? 'water' : 'darkness';
      const shapeVal = (shape === 'polygon') ? 'polygon' : 'circle';
      const polyPtsVal = (shapeVal === 'polygon' && Array.isArray(polyPoints)) ? JSON.stringify(polyPoints) : '[]';
      const result = await db.query(
        `INSERT INTO magical_darkness (id, session_id, map_id, x, y, radius, zone_type, shape, poly_points)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [uuidv4(), sessionId, resolvedMapId, x || 0, y || 0, Math.round(radius) || 0, type, shapeVal, polyPtsVal]
      );
      io.to(sessionCode).emit('magical_darkness_added', { darkness: result.rows[0] });
    } catch (err) { console.error(err); }
  });

  socket.on('delete_magical_darkness', async ({ darknessId }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      await db.query('DELETE FROM magical_darkness WHERE id=$1', [darknessId]);
      io.to(sessionCode).emit('magical_darkness_deleted', { darknessId });
    } catch (err) { console.error(err); }
  });

  socket.on('clear_magical_darkness', async ({ sessionId, mapId }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      if (mapId) {
        await db.query('DELETE FROM magical_darkness WHERE session_id=$1 AND map_id=$2', [sessionId, mapId]);
      } else {
        await db.query('DELETE FROM magical_darkness WHERE session_id=$1 AND map_id IS NULL', [sessionId]);
      }
      io.to(sessionCode).emit('magical_darkness_cleared');
    } catch (err) { console.error(err); }
  });

  socket.on('update_zone_feather', async ({ darknessId, featherAmount }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      await db.query('UPDATE magical_darkness SET feather_amount=$1 WHERE id=$2', [featherAmount, darknessId]);
      io.to(sessionCode).emit('zone_feather_updated', { darknessId, featherAmount });
    } catch (err) { console.error(err); }
  });

  // ── Sound effects (DM only) ─────────────────────────────────────────────
  socket.on('play_sound', ({ filename, volume }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    io.to(sessionCode).emit('play_sound', { filename, volume: volume ?? 1.0 });
  });

  socket.on('stop_sounds', () => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    io.to(sessionCode).emit('stop_sounds');
  });

  // ── Ambient music (DM only) ──────────────────────────────────────────────
  socket.on('play_ambient', ({ filename, volume }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    io.to(sessionCode).emit('play_ambient', { filename, volume: volume ?? 0.5 });
  });

  socket.on('stop_ambient', () => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    io.to(sessionCode).emit('stop_ambient');
  });

  // ── Spawn point (DM only) ────────────────────────────────────────────────
  socket.on('set_spawn_point', async ({ mapId, col, row }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode || !mapId) return;
    try {
      await db.query('UPDATE maps SET spawn_col=$1, spawn_row=$2 WHERE id=$3', [col, row, mapId]);
      io.to(sessionCode).emit('spawn_point_set', { col, row });
    } catch (err) { console.error(err); }
  });

  // ── Ambient light (DM only) ───────────────────────────────────────────────
  socket.on('set_ambient_light', async ({ sessionId, ambientLight }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      await db.query('UPDATE sessions SET ambient_light=$1 WHERE id=$2', [ambientLight, sessionId]);
      io.to(sessionCode).emit('ambient_light_changed', { ambientLight });
    } catch (err) { console.error(err); }
  });

  // ── Toggle fog of war (DM only) ───────────────────────────────────────────
  socket.on('toggle_fow', async ({ sessionId }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      const res = await db.query(
        'UPDATE sessions SET fow_enabled = NOT fow_enabled WHERE id=$1 RETURNING fow_enabled',
        [sessionId]
      );
      const enabled = res.rows[0].fow_enabled;
      io.to(sessionCode).emit('fow_changed', { enabled });
    } catch (err) {
      console.error(err);
    }
  });

  // ── FOW blur change (DM only) ─────────────────────────────────────────────
  socket.on('set_fow_blur', async ({ sessionId, blur }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      await db.query('UPDATE sessions SET fow_blur=$1 WHERE id=$2', [blur, sessionId]);
      io.to(sessionCode).emit('fow_blur_changed', { blur });
    } catch (err) {
      console.error(err);
    }
  });

  // ── FOW colour change (DM only) ───────────────────────────────────────────
  // Validates the input as a 3- or 6-digit hex literal — anything else is
  // rejected silently. Empty / null clears back to the default black so the
  // DM can recover a borked picker state without re-creating the session.
  socket.on('set_fow_color', async ({ sessionId, color }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    const value = (color === null || color === '') ? '#000000' : String(color || '');
    if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value)) return;
    try {
      await db.query('UPDATE sessions SET fow_color=$1 WHERE id=$2', [value, sessionId]);
      io.to(sessionCode).emit('fow_color_changed', { color: value });
    } catch (err) {
      console.error(err);
    }
  });

  // ── Grid size change (DM only) ────────────────────────────────────────────
  socket.on('change_grid_size', async ({ sessionId, gridSize }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;

    try {
      const clamped = Math.max(20, Math.min(300, gridSize));
      await db.query('UPDATE sessions SET grid_size=$1 WHERE id=$2', [clamped, sessionId]);
      io.to(sessionCode).emit('grid_size_changed', { gridSize: clamped });
    } catch (err) {
      console.error(err);
    }
  });

  // ── Grid style change (DM only) ───────────────────────────────────────────
  socket.on('change_grid_style', async ({ sessionId, gridColor, gridThickness }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;

    try {
      const thickness = Math.max(0.3, Math.min(6, Number(gridThickness) || 0.7));
      await db.query(
        'UPDATE sessions SET grid_color=$1, grid_thickness=$2 WHERE id=$3',
        [gridColor || 'rgba(0,0,0,0.35)', thickness, sessionId]
      );
      io.to(sessionCode).emit('grid_style_changed', { gridColor, gridThickness: thickness });
    } catch (err) {
      console.error(err);
    }
  });

  // ── Update token size (DM only) ───────────────────────────────────────────
  socket.on('update_token_size', async ({ tokenId, size }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;

    try {
      await db.query('UPDATE session_tokens SET size=$1 WHERE id=$2', [size, tokenId]);
      io.to(sessionCode).emit('token_size_changed', { tokenId, size });
    } catch (err) {
      console.error(err);
    }
  });

  socket.on('update_token_nickname', async ({ tokenId, nickname }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      await db.query('UPDATE session_tokens SET nickname=$1 WHERE id=$2', [nickname || null, tokenId]);
      io.to(sessionCode).emit('token_nickname_changed', { tokenId, nickname: nickname || null });
    } catch (err) {
      console.error(err);
    }
  });

  // ── Measurement broadcast ─────────────────────────────────────────────────
  socket.on('measure_update', ({ meas, color }) => {
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    const name = socket.data.name || 'Unknown';
    socket.to(sessionCode).emit('measure_update', { meas, color, name });
  });

  // ── Combat control (DM only) ──────────────────────────────────────────────
  socket.on('set_combat', async ({ sessionId, active, tokenIds }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;

    try {
      await db.query(
        'UPDATE sessions SET combat_active=$1, combat_turn=0 WHERE id=$2',
        [active, sessionId]
      );

      if (active && Array.isArray(tokenIds)) {
        // Mark only selected tokens as in_combat
        await db.query(
          'UPDATE session_tokens SET in_combat = (id = ANY($1::int[])) WHERE session_id=$2',
          [tokenIds, sessionId]
        );
      } else if (!active) {
        // Clear all in_combat flags when combat ends
        await db.query(
          'UPDATE session_tokens SET in_combat=false WHERE session_id=$1',
          [sessionId]
        );
      }

      io.to(sessionCode).emit('combat_changed', { active, currentTurn: 0, tokenIds: tokenIds || null });
    } catch (err) {
      console.error(err);
    }
  });

  // Add additional tokens to an active combat without resetting the turn
  // counter or kicking anyone out — used when reinforcements walk into a
  // fight or the DM forgot a token at start.
  socket.on('add_tokens_to_combat', async ({ sessionId, tokenIds }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    if (!Array.isArray(tokenIds) || tokenIds.length === 0) return;
    try {
      await db.query(
        'UPDATE session_tokens SET in_combat=true WHERE id = ANY($1::int[]) AND session_id=$2',
        [tokenIds, sessionId]
      );
      io.to(sessionCode).emit('tokens_added_to_combat', { tokenIds });
    } catch (err) {
      console.error(err);
    }
  });

  socket.on('next_combat_turn', async ({ sessionId, currentTurn }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;

    try {
      await db.query(
        'UPDATE sessions SET combat_turn=$1 WHERE id=$2',
        [currentTurn, sessionId]
      );
      io.to(sessionCode).emit('combat_turn_changed', { currentTurn });
    } catch (err) {
      console.error(err);
    }
  });

  // ── User color (DM only) ──────────────────────────────────────────────────
  socket.on('set_user_color', ({ name, color }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;

    if (!sessionUserColors[sessionCode]) sessionUserColors[sessionCode] = {};
    sessionUserColors[sessionCode][name] = color;
    io.to(sessionCode).emit('user_color_changed', { name, color });
  });

  // ── Dice roll ─────────────────────────────────────────────────────────────
  socket.on('roll_dice', ({ dice, count, modifier, label }) => {
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;

    const sides = parseInt(dice.replace('d', ''), 10);
    if (isNaN(sides) || sides < 2) return;

    const rolls = [];
    for (let i = 0; i < (count || 1); i++) {
      rolls.push(Math.floor(Math.random() * sides) + 1);
    }
    const total = rolls.reduce((a, b) => a + b, 0) + (modifier || 0);

    io.to(sessionCode).emit('dice_rolled', {
      userName: socket.data.name,
      role: socket.data.role,
      dice,
      count: count || 1,
      modifier: modifier || 0,
      rolls,
      total,
      label: label || null,
      timestamp: Date.now(),
    });
  });

  // ── Disconnect ────────────────────────────────────────────────────────────
  // ── Plugin event bus ───────────────────────────────────────────────────
  // Generic relay for plugin-to-plugin coordination between clients in the
  // same session. The backend never inspects the payload — plugins ship
  // arbitrary JSON. Used by the host's data-write wrapper to broadcast
  // KV changes so DM + player views stay in sync without each plugin
  // having to wire up its own socket protocol.
  socket.on('plugin_event', ({ pluginId, type, payload }) => {
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode || !pluginId) return;
    // Echo to everyone in the room INCLUDING the sender — keeps the API
    // simple (a plugin can rely on its own write to round-trip and apply
    // optimistic updates uniformly).
    io.to(sessionCode).emit('plugin_event', {
      pluginId: String(pluginId),
      type: typeof type === 'string' ? type : 'data',
      payload: payload ?? null,
      from: socket.id,
    });
  });

  socket.on('disconnect', () => {
    const sessionCode = socket.data.sessionCode;
    if (sessionCode && sessionUsers[sessionCode]) {
      sessionUsers[sessionCode].delete(socket.id);
      if (sessionUsers[sessionCode].size === 0) {
        delete sessionUsers[sessionCode];
      } else {
        io.to(sessionCode).emit('users_updated', {
          users: Array.from(sessionUsers[sessionCode].values()),
        });
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, async () => {
  console.log(`VTT backend running on :${PORT}`);
  try {
    await db.query(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS grid_color VARCHAR(50) DEFAULT 'rgba(0,0,0,0.35)'`);
    await db.query(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS grid_thickness FLOAT DEFAULT 0.7`);
    await db.query(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS combat_active BOOLEAN DEFAULT false`);
    await db.query(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS combat_turn INTEGER DEFAULT 0`);
    await db.query(`ALTER TABLE session_tokens ADD COLUMN IF NOT EXISTS temp_hp INTEGER DEFAULT 0`);
    await db.query(`ALTER TABLE session_tokens ADD COLUMN IF NOT EXISTS conditions JSONB DEFAULT '[]'`);
    await db.query(`ALTER TABLE session_tokens ADD COLUMN IF NOT EXISTS is_player BOOLEAN DEFAULT false`);
    await db.query(`ALTER TABLE session_tokens ADD COLUMN IF NOT EXISTS player_name VARCHAR(255)`);
    await db.query(`ALTER TABLE creatures ADD COLUMN IF NOT EXISTS is_player_character BOOLEAN DEFAULT false`);
    await db.query(`ALTER TABLE creatures ADD COLUMN IF NOT EXISTS player_owner VARCHAR(255)`);
    await db.query(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS fow_enabled BOOLEAN DEFAULT false`);
    await db.query(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS fow_blur INTEGER DEFAULT 16`);
    await db.query(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS fow_color VARCHAR(9) DEFAULT '#000000'`);

    // Generic key/value settings table. Currently used to persist DM AI
    // configuration across devices / browser clears (it used to live in
    // localStorage only); designed so future "global app settings" can
    // share the same store without another migration. Values are JSONB
    // so callers can stash whatever shape they like.
    await db.query(`
      CREATE TABLE IF NOT EXISTS app_settings (
        key VARCHAR(120) PRIMARY KEY,
        value JSONB NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await db.query(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS ambient_light VARCHAR(10) DEFAULT 'bright'`);
    await db.query(`ALTER TABLE session_tokens ADD COLUMN IF NOT EXISTS vision_type VARCHAR(20) DEFAULT 'normal'`);
    await db.query(`ALTER TABLE session_tokens ADD COLUMN IF NOT EXISTS vision_range INTEGER DEFAULT 0`);
    await db.query(`ALTER TABLE session_tokens ADD COLUMN IF NOT EXISTS senses JSONB`);
    await db.query(`ALTER TABLE creatures ADD COLUMN IF NOT EXISTS passive_perception INTEGER DEFAULT 10`);
    await db.query(`ALTER TABLE session_tokens ADD COLUMN IF NOT EXISTS token_light_bright FLOAT DEFAULT 0`);
    await db.query(`ALTER TABLE session_tokens ADD COLUMN IF NOT EXISTS token_light_dim FLOAT DEFAULT 0`);
    await db.query(`ALTER TABLE session_tokens ADD COLUMN IF NOT EXISTS token_light_color VARCHAR(20) DEFAULT '#fbbf24'`);
    await db.query(`ALTER TABLE session_tokens ALTER COLUMN grid_col TYPE FLOAT USING grid_col::FLOAT`);
    await db.query(`ALTER TABLE session_tokens ALTER COLUMN grid_row TYPE FLOAT USING grid_row::FLOAT`);
    await db.query(`ALTER TABLE creatures ADD COLUMN IF NOT EXISTS inventory JSONB DEFAULT '[]'`);
    await db.query(`ALTER TABLE creatures ADD COLUMN IF NOT EXISTS currency_cp INTEGER DEFAULT 0`);
    await db.query(`ALTER TABLE creatures ADD COLUMN IF NOT EXISTS currency_sp INTEGER DEFAULT 0`);
    await db.query(`ALTER TABLE creatures ADD COLUMN IF NOT EXISTS currency_gp INTEGER DEFAULT 0`);
    await db.query(`
      CREATE TABLE IF NOT EXISTS light_sources (
        id UUID PRIMARY KEY,
        map_id INTEGER REFERENCES maps(id) ON DELETE CASCADE,
        x FLOAT NOT NULL,
        y FLOAT NOT NULL,
        bright_radius FLOAT NOT NULL DEFAULT 60,
        dim_radius FLOAT NOT NULL DEFAULT 120,
        label VARCHAR(100) NOT NULL DEFAULT '',
        color VARCHAR(20) NOT NULL DEFAULT '#fbbf24',
        direction FLOAT NOT NULL DEFAULT 0,
        spread_angle FLOAT NOT NULL DEFAULT 360,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await db.query(`ALTER TABLE light_sources ADD COLUMN IF NOT EXISTS direction FLOAT NOT NULL DEFAULT 0`);
    await db.query(`ALTER TABLE light_sources ADD COLUMN IF NOT EXISTS spread_angle FLOAT NOT NULL DEFAULT 360`);
    await db.query(`
      CREATE TABLE IF NOT EXISTS doors (
        id UUID PRIMARY KEY,
        map_id INTEGER REFERENCES maps(id) ON DELETE CASCADE,
        style VARCHAR(20) NOT NULL DEFAULT 'standard',
        points JSONB NOT NULL DEFAULT '[]',
        is_open BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await db.query(`ALTER TABLE doors ADD COLUMN IF NOT EXISTS open_dir INTEGER DEFAULT 1`);
    await db.query(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS spawn_col FLOAT DEFAULT 0`);
    await db.query(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS spawn_row FLOAT DEFAULT 0`);
    await db.query(`ALTER TABLE maps ADD COLUMN IF NOT EXISTS session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE`);
    await db.query(`ALTER TABLE maps ADD COLUMN IF NOT EXISTS spawn_col FLOAT DEFAULT 0`);
    await db.query(`ALTER TABLE maps ADD COLUMN IF NOT EXISTS spawn_row FLOAT DEFAULT 0`);
    await db.query(`ALTER TABLE session_tokens ADD COLUMN IF NOT EXISTS map_id INTEGER REFERENCES maps(id) ON DELETE CASCADE`);
    await db.query(`ALTER TABLE magical_darkness ADD COLUMN IF NOT EXISTS map_id INTEGER REFERENCES maps(id) ON DELETE CASCADE`);
    await db.query(`ALTER TABLE magical_darkness ADD COLUMN IF NOT EXISTS zone_type VARCHAR(20) DEFAULT 'darkness'`);
    await db.query(`ALTER TABLE session_tokens ADD COLUMN IF NOT EXISTS in_combat BOOLEAN DEFAULT false`);
    await db.query(`ALTER TABLE session_tokens ADD COLUMN IF NOT EXISTS is_flying BOOLEAN DEFAULT false`);
    await db.query(`ALTER TABLE session_tokens ADD COLUMN IF NOT EXISTS nickname VARCHAR(255)`);
    await db.query(`ALTER TABLE magical_darkness ADD COLUMN IF NOT EXISTS shape VARCHAR(20) DEFAULT 'circle'`);
    await db.query(`ALTER TABLE magical_darkness ADD COLUMN IF NOT EXISTS poly_points JSONB DEFAULT '[]'`);
    await db.query(`ALTER TABLE magical_darkness ADD COLUMN IF NOT EXISTS feather_amount FLOAT DEFAULT 0`);
    await db.query(`ALTER TABLE creatures ADD COLUMN IF NOT EXISTS spells JSONB DEFAULT '[]'`);
    await db.query(`ALTER TABLE creatures ADD COLUMN IF NOT EXISTS spell_slots JSONB DEFAULT '{}'`);
    await db.query(`ALTER TABLE creatures ADD COLUMN IF NOT EXISTS loot JSONB DEFAULT '[]'`);

    // Languages — first-class table seeded with the standard SRD set.
    // Creatures still store their language list as comma-separated names
    // in the existing `creatures.languages` TEXT column (no schema break);
    // the picker UI and AI normaliser match those names against this
    // table to know which entries are canonical vs custom.
    await db.query(`
      CREATE TABLE IF NOT EXISTS languages (
        id SERIAL PRIMARY KEY,
        slug VARCHAR(64) UNIQUE NOT NULL,
        name VARCHAR(120) NOT NULL,
        category VARCHAR(20) NOT NULL DEFAULT 'standard',
        script VARCHAR(40) DEFAULT '',
        is_custom BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    // Seed the SRD set if the table is empty. ON CONFLICT keeps a
    // re-seed harmless even if a row was renamed manually.
    const SEED_LANGUAGES = [
      // Standard
      { slug: 'common',       name: 'Common',       category: 'standard', script: 'Common' },
      { slug: 'dwarvish',     name: 'Dwarvish',     category: 'standard', script: 'Dwarvish' },
      { slug: 'elvish',       name: 'Elvish',       category: 'standard', script: 'Elvish' },
      { slug: 'giant',        name: 'Giant',        category: 'standard', script: 'Dwarvish' },
      { slug: 'gnomish',      name: 'Gnomish',      category: 'standard', script: 'Dwarvish' },
      { slug: 'goblin',       name: 'Goblin',       category: 'standard', script: 'Dwarvish' },
      { slug: 'halfling',     name: 'Halfling',     category: 'standard', script: 'Common' },
      { slug: 'orc',          name: 'Orc',          category: 'standard', script: 'Dwarvish' },
      // Exotic
      { slug: 'abyssal',      name: 'Abyssal',      category: 'exotic',   script: 'Infernal' },
      { slug: 'celestial',    name: 'Celestial',    category: 'exotic',   script: 'Celestial' },
      { slug: 'deep-speech',  name: 'Deep Speech',  category: 'exotic',   script: '' },
      { slug: 'draconic',     name: 'Draconic',     category: 'exotic',   script: 'Draconic' },
      { slug: 'infernal',     name: 'Infernal',     category: 'exotic',   script: 'Infernal' },
      { slug: 'primordial',   name: 'Primordial',   category: 'exotic',   script: 'Dwarvish' },
      { slug: 'sylvan',       name: 'Sylvan',       category: 'exotic',   script: 'Elvish' },
      { slug: 'undercommon',  name: 'Undercommon',  category: 'exotic',   script: 'Elvish' },
      // Rare / class-specific
      { slug: 'druidic',      name: 'Druidic',      category: 'rare',     script: 'Druidic' },
      { slug: 'thieves-cant', name: "Thieves' Cant", category: 'rare',    script: '' },
    ];
    for (const lang of SEED_LANGUAGES) {
      await db.query(
        `INSERT INTO languages (slug, name, category, script, is_custom)
         VALUES ($1, $2, $3, $4, false)
         ON CONFLICT (slug) DO NOTHING`,
        [lang.slug, lang.name, lang.category, lang.script]
      );
    }
    await db.query(`
      CREATE TABLE IF NOT EXISTS walls (
        id UUID PRIMARY KEY,
        map_id INTEGER REFERENCES maps(id) ON DELETE CASCADE,
        type VARCHAR(20) NOT NULL DEFAULT 'line',
        points JSONB NOT NULL DEFAULT '[]',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    // Player-character extensions
    await db.query(`ALTER TABLE creatures ADD COLUMN IF NOT EXISTS shield_equipped BOOLEAN DEFAULT false`);
    await db.query(`ALTER TABLE creatures ADD COLUMN IF NOT EXISTS hit_dice_qty INTEGER DEFAULT 0`);
    await db.query(`ALTER TABLE creatures ADD COLUMN IF NOT EXISTS hit_dice_type VARCHAR(10) DEFAULT ''`);
    await db.query(`ALTER TABLE creatures ADD COLUMN IF NOT EXISTS hit_dice_used INTEGER DEFAULT 0`);
    await db.query(`ALTER TABLE creatures ADD COLUMN IF NOT EXISTS skill_expertise JSONB DEFAULT '{}'`);
    await db.query(`ALTER TABLE creatures ADD COLUMN IF NOT EXISTS class_features JSONB DEFAULT '[]'`);
    await db.query(`ALTER TABLE creatures ADD COLUMN IF NOT EXISTS feats JSONB DEFAULT '[]'`);
    await db.query(`ALTER TABLE creatures ADD COLUMN IF NOT EXISTS char_class VARCHAR(100) DEFAULT ''`);
    await db.query(`ALTER TABLE creatures ADD COLUMN IF NOT EXISTS char_subclass VARCHAR(100) DEFAULT ''`);
    await db.query(`ALTER TABLE creatures ADD COLUMN IF NOT EXISTS heroic_inspiration BOOLEAN DEFAULT false`);
    await db.query(`ALTER TABLE creatures ADD COLUMN IF NOT EXISTS death_save_successes INTEGER DEFAULT 0`);
    await db.query(`ALTER TABLE creatures ADD COLUMN IF NOT EXISTS death_save_failures INTEGER DEFAULT 0`);
    await db.query(`ALTER TABLE creatures ADD COLUMN IF NOT EXISTS prof_light_armor BOOLEAN DEFAULT false`);
    await db.query(`ALTER TABLE creatures ADD COLUMN IF NOT EXISTS prof_medium_armor BOOLEAN DEFAULT false`);
    await db.query(`ALTER TABLE creatures ADD COLUMN IF NOT EXISTS prof_heavy_armor BOOLEAN DEFAULT false`);
    await db.query(`ALTER TABLE creatures ADD COLUMN IF NOT EXISTS prof_shields BOOLEAN DEFAULT false`);
    await db.query(`ALTER TABLE creatures ADD COLUMN IF NOT EXISTS concentrating_on VARCHAR(120) DEFAULT ''`);
    await db.query(`ALTER TABLE creatures ADD COLUMN IF NOT EXISTS char_level INTEGER DEFAULT 1`);
    await db.query(`ALTER TABLE creatures ADD COLUMN IF NOT EXISTS char_xp INTEGER DEFAULT 0`);
    await db.query(`ALTER TABLE creatures ADD COLUMN IF NOT EXISTS player_notes TEXT DEFAULT ''`);
    await db.query(`ALTER TABLE maps ADD COLUMN IF NOT EXISTS floor_label VARCHAR(60) DEFAULT ''`);
    await db.query(`
      CREATE TABLE IF NOT EXISTS spell_library (
        id UUID PRIMARY KEY,
        name VARCHAR(120) NOT NULL UNIQUE,
        level INTEGER NOT NULL DEFAULT 0,
        type VARCHAR(20) NOT NULL DEFAULT 'utility',
        school VARCHAR(40) DEFAULT '',
        casting_time VARCHAR(80) DEFAULT '',
        range_area VARCHAR(120) DEFAULT '',
        duration VARCHAR(80) DEFAULT '',
        comp_v BOOLEAN DEFAULT false,
        comp_s BOOLEAN DEFAULT false,
        comp_m BOOLEAN DEFAULT false,
        comp_m_text VARCHAR(200) DEFAULT '',
        attack_save VARCHAR(20) DEFAULT '',
        save_ability VARCHAR(8) DEFAULT '',
        damage_entries JSONB DEFAULT '[]',
        extra_effects TEXT DEFAULT '',
        description TEXT DEFAULT '',
        source VARCHAR(200) DEFAULT '',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_spell_library_level ON spell_library(level)`);
    await db.query(`ALTER TABLE spell_library ADD COLUMN IF NOT EXISTS allowed_classes JSONB DEFAULT '[]'`);

    // Plugin system. `plugins` tracks installed plugins and their enabled
    // state; `plugin_data` is a generic JSONB KV store keyed by plugin id
    // so plugins can persist their own data without touching core tables.
    // plugin_data rows are intentionally NEVER deleted automatically — even
    // when a plugin is removed, its data stays so re-installing it later
    // restores everything (the user explicitly asked for this).
    await db.query(`
      CREATE TABLE IF NOT EXISTS plugins (
        id           TEXT PRIMARY KEY,
        manifest     JSONB NOT NULL,
        enabled      BOOLEAN NOT NULL DEFAULT true,
        source       TEXT DEFAULT 'upload',
        installed_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await db.query(`
      CREATE TABLE IF NOT EXISTS plugin_data (
        plugin_id TEXT NOT NULL,
        key       TEXT NOT NULL,
        value     JSONB NOT NULL,
        PRIMARY KEY (plugin_id, key)
      )
    `);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_plugin_data_prefix ON plugin_data(plugin_id, key)`);
    // Sync the plugins table with whatever's currently on disk in PLUGINS_DIR.
    // Newly-discovered dirs land enabled by default; manually-removed dirs
    // (the documented `rm -rf` escape hatch) get their plugins-table row
    // dropped here too. plugin_data is left alone in either case.
    try { await reconcilePluginsTable(); }
    catch (e) { console.warn('Plugin reconcile warning:', e.message); }
  } catch (err) {
    console.warn('Migration warning:', err.message);
  }
});
