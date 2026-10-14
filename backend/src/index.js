require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { imageSize } = require('image-size');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const db = require('./db');
const mdns = require('./mdns');
const { isTerrainHidden, stripTerrainLabelForPlayer, terrainForPlayer } = require('./terrainVisibility');
const { ensureMapCovers } = require('./mapGrow');

const mapsRouter = require('./routes/maps');
const backdropsRouter = require('./routes/backdrops');
const terrainRouter = require('./routes/terrain');
const tilesRouter = require('./routes/tiles');
const shipsRouter = require('./routes/ships');
const shipMath = require('./ships');
const { canPilotHelm } = require('./piloting');
const makeCreaturesRouter = require('./routes/creatures');
const sessionsRouter = require('./routes/sessions');
const aiRouter = require('./routes/ai');
const wallsRouter = require('./routes/walls');
const doorsRouter = require('./routes/doors');
const doorSpritesRouter = require('./routes/door-sprites');
const lightsRouter = require('./routes/lights');
const dd2vttRouter = require('./routes/dd2vtt');
const spellLibraryRouter = require('./routes/spell_library');
const itemLibraryRouter = require('./routes/item_library');
const makeTransferRouter = require('./routes/transfer');
const patrols = require('./patrols');
const detection = require('./detection');
const movement = require('./movement');
const shops = require('./shops');
const gmAccounts = require('./gmAccounts');
const tablesRouter = require('./routes/tables');
const customOriginsRouter = require('./routes/custom_origins');
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

// Sneak mode's one entry point from the rest of the server.
//
// `sneakWatch(sessionCode)` says "something on this board moved" and nothing
// else. The scheduler coalesces a burst of them into one evaluation, and does
// nothing at all for a session that has sneak mode switched off — so the calls
// scattered through the move handlers below cost a map lookup and a return.
const { schedule: sneakWatch } = detection.createScheduler(db, io);

app.use(cors());
app.use(express.json());
// Uploads are content-addressed by name: every file is written under a fresh
// uuid, and replacing a map's art writes a NEW name rather than overwriting an
// old one. So a URL here can never mean two different things, and the default
// `max-age=0` — which makes the browser revalidate on every single request —
// buys nothing and costs a round trip per asset. A panorama is tens of
// megabytes; being told "still the same" is not the expensive part, but it is
// the part that happens on every map switch.
//
// The shipped sets (terrain/planet-*.svg and friends) DO get rewritten in place
// when their art is redrawn, so they are held for an hour rather than a year:
// long enough to stop the churn, short enough that a redraw reaches people.
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
  setHeaders: (res, filePath) => {
    const shipped = /[\\/](terrain|ships|doors)[\\/](planet|asteroid|system|space|ship|door)-/.test(filePath);
    res.setHeader(
      'Cache-Control',
      shipped ? 'public, max-age=3600' : 'public, max-age=31536000, immutable'
    );
  },
}));

const SOUNDS_DIR = path.join(__dirname, '../sounds');
const AMBIENT_DIR = path.join(SOUNDS_DIR, 'ambient');
const SOUND_EXTS = new Set(['.mp3', '.ogg', '.wav', '.m4a', '.webm', '.flac']);
app.use('/sounds', express.static(SOUNDS_DIR));

// /api/version — read from this server's package.json so the
// version cascades automatically on every release_release.sh bump.
// Mobile clients call this from their Settings tab to display
// "Server: x.y.z" (and to power the easter-egg trigger).
const SERVER_VERSION = (() => {
  try { return require('../package.json').version || 'unknown'; }
  catch { return 'unknown'; }
})();
// /api/discovery — what host names the server thinks it's reachable
// at, surfaced to the GM Connection panel so it can render a player-
// friendly `.local` URL alongside the LAN IP. Updated by mdns.js
// after server.listen() — until that fires the response shows the
// fallback host name based on os.hostname().
app.get('/api/version', (_req, res) => {
  res.json({ version: SERVER_VERSION, ...mdns.status() });
});
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
app.use('/api/backdrops', backdropsRouter);
app.use('/api/terrain', terrainRouter);
app.use('/api/tiles', tilesRouter);
app.use('/api/ships', shipsRouter);
app.use('/api/creatures', makeCreaturesRouter(io));
// Read-only window onto the self-hosted 5etools mirror. Set COMPENDIUM_URL to
// point it somewhere other than the default; see src/compendium.js.
app.use('/api/compendium', require('./routes/compendium')());
// One search box over the GM's libraries and the 5etools mirror together.
app.use('/api/search', require('./routes/search'));
// One router, two names: /api/gm is what the GM screens already call, and
// /api/account is what it actually is now that players have seats on it.
// Art for locally-written rules (see reference-local/). Served from the
// source tree rather than uploads/ on purpose: uploads is a mounted volume on
// a server and a per-install data directory in the desktop app, so a picture
// that ships WITH the rules has to travel with them.
//
// Under /api/ because that is the one prefix every front door already sends
// here — nginx in front of the container, and the dev server's proxy. A new
// top-level path would have to be added to both, and the first anyone would
// know of a missed one is a class page with no picture on it.
app.use('/api/reference-img', express.static(path.join(__dirname, 'reference-local/img'), {
  maxAge: '7d',
}));
app.use('/api/gm', require('./routes/gm'));
app.use('/api/account', require('./routes/gm'));
app.use('/api/sessions', sessionsRouter);
app.use('/api/ai', aiRouter);
app.use('/api/walls', wallsRouter);
app.use('/api/doors', doorsRouter);
app.use('/api/door-sprites', doorSpritesRouter);
app.use('/api/lights', lightsRouter);
app.use('/api/dd2vtt', dd2vttRouter);
app.use('/api/spell-library', spellLibraryRouter);
app.use('/api/item-library',  itemLibraryRouter);
// Carrying a session to another install. Given the uploads dir explicitly, since
// the desktop build puts it somewhere else entirely (see paths.js there).
app.use('/api/transfer',      makeTransferRouter(path.join(__dirname, '../uploads')));
app.use('/api/tables',        tablesRouter);
app.use('/api/custom',        customOriginsRouter);

// Read once at startup — package.json doesn't change at runtime.
const APP_VERSION = (() => {
  try { return require('../package.json').version || 'unknown'; }
  catch { return 'unknown'; }
})();
app.get('/api/version', (req, res) => res.json({ version: APP_VERSION }));
app.use('/api/languages', languagesRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/plugins', pluginsRouter);

app.get('/api/health', (req, res) => res.json({ ok: true }));

// ─── Add movement_actions column to creatures if missing ─────────────────────
db.query(`ALTER TABLE creatures ADD COLUMN IF NOT EXISTS movement_actions JSONB DEFAULT '[]'`)
  .catch(err => console.error('movement_actions migration error:', err));
db.query(`ALTER TABLE creatures ADD COLUMN IF NOT EXISTS initiative_bonus INTEGER DEFAULT 0`)
  .catch(err => console.error('initiative_bonus migration error:', err));
// Swarms: `size` stays the swarm's own footprint (a Medium swarm occupies a
// Medium square), and swarm_creature_size records how big the individuals in
// it are — "Medium Swarm of Tiny Monstrosities".
// What a rollable table is FOR.
//
// Loot tables and the GM's own tables share one mechanism — weighted rows, one
// roller — but they are not the same list. Importing the DMG's 29 treasure
// tables buried a GM's handful of rumour and wandering-monster tables among
// them, and the loot picker offered every table whether or not it was loot.
// So they are tagged, and each list shows its own kind.
db.query(`ALTER TABLE rollable_tables ADD COLUMN IF NOT EXISTS kind VARCHAR(20) NOT NULL DEFAULT 'general'`)
  .then(() => db.query(
    // The already-imported treasure tables, identified by the description the
    // importer stamped on them.
    `UPDATE rollable_tables SET kind='loot'
      WHERE kind <> 'loot' AND description LIKE 'Imported from the Dungeon Master%'`
  ))
  .then((r) => { if (r?.rowCount) console.log(`Tagged ${r.rowCount} imported treasure table(s) as loot.`); })
  .catch(err => console.error('rollable_tables.kind migration error:', err));

// Which table this creature's remains are rolled on. SET NULL rather than
// CASCADE: deleting a loot table must not delete the monsters that used it.
db.query(`ALTER TABLE creatures ADD COLUMN IF NOT EXISTS loot_table_id INTEGER
            REFERENCES rollable_tables(id) ON DELETE SET NULL`)
  .catch(err => console.error('loot_table_id migration error:', err));
db.query(`ALTER TABLE creatures ADD COLUMN IF NOT EXISTS is_swarm BOOLEAN DEFAULT false`)
  .catch(err => console.error('is_swarm migration error:', err));
db.query(`ALTER TABLE creatures ADD COLUMN IF NOT EXISTS swarm_creature_size VARCHAR(20)`)
  .catch(err => console.error('swarm_creature_size migration error:', err));
// Free text rather than an enum — "she/her", "they/them", "he/they", or
// anything else the player uses. Never inferred, only ever what was typed.
// Art for the 3D view only.
//
// image_path is the token FACE: cropped square and read from directly above,
// which is what the flat map wants. The 3D view stands a token up as a
// billboard facing the camera, and a top-down face standing on its edge reads
// as a coin on a shelf rather than a figure. This is the standing artwork,
// used only there; unset, the 3D view falls back to the face exactly as before.
// How tall this creature stands in the 3D view, in feet.
//
// Separate from `size`, which is the FOOTPRINT: a halfling and a human both
// occupy one five-foot square, so size alone cannot make one shorter than the
// other. NULL means "derive it as before" — from the artwork's proportions for
// a standee, or the footprint for a plain token.
db.query(`ALTER TABLE creatures ADD COLUMN IF NOT EXISTS token_height_ft REAL`)
  .catch(err => console.error('token_height_ft migration error:', err));
// The ring drawn under a token on the board in 3D. NULL means "use the
// default" — blue for a player, red for anything else, at 70% — so an
// untouched creature looks exactly as it always has.
db.query(`ALTER TABLE creatures ADD COLUMN IF NOT EXISTS base_color VARCHAR(20)`)
  .catch(err => console.error('base_color migration error:', err));
// Stored 0-100 rather than 0-1: it is a percentage in the UI, and an integer
// column cannot drift the way a float round-trip can.
db.query(`ALTER TABLE creatures ADD COLUMN IF NOT EXISTS base_opacity INTEGER`)
  .catch(err => console.error('base_opacity migration error:', err));
db.query(`ALTER TABLE creatures ADD COLUMN IF NOT EXISTS standee_image_path VARCHAR(500)`)
  .catch(err => console.error('standee_image_path migration error:', err));
db.query(`ALTER TABLE creatures ADD COLUMN IF NOT EXISTS pronouns VARCHAR(50)`)
// Default footprint override for gargantuan library creatures, in squares.
// NULL = use the size preset. Copied onto each token spawned from the
// creature, so a tarrasque comes out the right size without the GM having
// to resize it every time it's placed.
db.query(`ALTER TABLE creatures ADD COLUMN IF NOT EXISTS size_squares FLOAT`)
  .catch(err => console.error('pronouns migration error:', err));

// ─── Familiars (migration for existing installs) ─────────────────────────────
// A familiar token is an ordinary token bound to a player by name rather than
// by token id: the binding has to survive the owning token being respawned or
// re-created on a new map, and `player_name` is the identity every other
// player-scoped feature already keys on. NULL means "not a familiar".
db.query(`ALTER TABLE session_tokens ADD COLUMN IF NOT EXISTS familiar_of VARCHAR(255)`)
  .catch(err => console.error('familiar_of migration error:', err));

// ─── Per-token label visibility (migration for existing installs) ────────────
// Independent of `is_hidden`, which removes the token entirely. These hide
// only the label card's two halves from the players' view — an unidentified
// creature the party hasn't named yet, or a boss whose HP shouldn't be a
// readout. The GM always sees both. Combat does NOT override these — a hidden
// name stays hidden in the initiative order, which is usually the whole point.
db.query(`ALTER TABLE session_tokens ADD COLUMN IF NOT EXISTS hide_name_from_players BOOLEAN DEFAULT false`)
  .catch(err => console.error('hide_name_from_players migration error:', err));
db.query(`ALTER TABLE session_tokens ADD COLUMN IF NOT EXISTS hide_hp_from_players BOOLEAN DEFAULT false`)
  .catch(err => console.error('hide_hp_from_players migration error:', err));

// ─── Backdrop provenance (migration for existing installs) ───────────────────
// Set when a backdrop was generated from a token's art rather than uploaded.
// Holds the ORIGINAL image path (e.g. "creatures/<uuid>.png"), which lets a
// repeat push of the same token reuse the backdrop it already made instead of
// stacking near-identical rows in the GM's list. NULL for uploaded backdrops.
db.query(`ALTER TABLE backdrops ADD COLUMN IF NOT EXISTS source_image_path VARCHAR(500)`)
  .catch(err => console.error('backdrops.source_image_path migration error:', err));

// ─── Transformation memory (migration for existing installs) ─────────────────
// What a token looked like before the GM transformed it — creature, name, art,
// size and HP. Kept so "Revert" restores the original rather than the GM having
// to rebuild a player's token by hand after the cocoon opens. NULL = the token
// is in its original form. Only the FIRST transform records this, so a chain of
// transforms still reverts all the way back to the real character.
db.query(`ALTER TABLE session_tokens ADD COLUMN IF NOT EXISTS pretransform JSONB`)
  .catch(err => console.error('pretransform migration error:', err));

// ─── Companion kind (migration for existing installs) ────────────────────────
// `familiar_of` binds a token to a player; this says WHAT it is, so the same
// binding covers a familiar, a summoned creature, an animal companion, a
// mount, or a duplicate (Invoke Duplicity, Mirror Image, Simulacrum). Purely
// descriptive — every kind behaves the same: the owner sees through it and can
// open its stat block.
db.query(`ALTER TABLE session_tokens ADD COLUMN IF NOT EXISTS companion_kind VARCHAR(20) DEFAULT 'familiar'`)
  .catch(err => console.error('companion_kind migration error:', err));

// ── Companions bound to a character, whether or not they are on a map ────────
//
// `familiar_of` can only describe a token, so a familiar could not exist until
// it had been placed and right-clicked — which is backwards: a wizard HAS an owl
// between fights, and the owl appears when it is called for. This table is the
// binding itself; a token is what happens when one is summoned.
//
// Owned by the CREATURE, not the player name: names are self-asserted and change
// (a player renames themselves, or hands the character over), while the character
// sheet is the durable thing the owl belongs to.
db.query(`
  CREATE TABLE IF NOT EXISTS creature_companions (
    id SERIAL PRIMARY KEY,
    owner_creature_id INTEGER NOT NULL REFERENCES creatures(id) ON DELETE CASCADE,
    creature_id INTEGER NOT NULL REFERENCES creatures(id) ON DELETE CASCADE,
    nickname VARCHAR(120) DEFAULT '',
    companion_kind VARCHAR(20) DEFAULT 'familiar',
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
  )
`).then(() => db.query(
  `CREATE INDEX IF NOT EXISTS idx_creature_companions_owner ON creature_companions(owner_creature_id)`
)).catch(err => console.error('creature_companions migration error:', err));

// Which binding a token was summoned from. Lets a sheet say "this one is already
// on the map" without guessing from names, and stops a second tap on Summon
// putting a duplicate owl on the board.
db.query(`ALTER TABLE session_tokens ADD COLUMN IF NOT EXISTS companion_row_id INTEGER`)
  .catch(err => console.error('companion_row_id migration error:', err));

// ─── Auras, marks and exhaustion (migration for existing installs) ───────────
// auras: rings anchored to the token and drawn under it — Paladin Aura of
// Protection, Spirit Guardians, Wrath of the Sea. Each entry is
// { id, label, radius (feet), color }. They follow the token because their
// position is derived from it at draw time rather than stored.
db.query(`ALTER TABLE session_tokens ADD COLUMN IF NOT EXISTS auras JSONB DEFAULT '[]'`)
  .catch(err => console.error('auras migration error:', err));
// marked_by: who has this creature marked (Hunter's Mark, Hex, Vow of Enmity).
// Stored as the marker's display name so the badge can say whose mark it is.
db.query(`ALTER TABLE session_tokens ADD COLUMN IF NOT EXISTS marked_by VARCHAR(255)`)
  .catch(err => console.error('marked_by migration error:', err));
db.query(`ALTER TABLE session_tokens ADD COLUMN IF NOT EXISTS mark_label VARCHAR(60)`)
  .catch(err => console.error('mark_label migration error:', err));
// Exhaustion is a LEVEL (0-6) in the 2024 rules, not a yes/no condition.
db.query(`ALTER TABLE session_tokens ADD COLUMN IF NOT EXISTS exhaustion INTEGER DEFAULT 0`)
  .catch(err => console.error('exhaustion migration error:', err));
// A darkness zone that travels with a token — Shadow Arts' movable Darkness.
db.query(`ALTER TABLE magical_darkness ADD COLUMN IF NOT EXISTS attached_token_id INTEGER REFERENCES session_tokens(id) ON DELETE CASCADE`)
  .catch(err => console.error('attached_token_id migration error:', err));

// ─── Session-wide label defaults (migration for existing installs) ───────────
// What newly added library tokens start with, so a GM running a mystery isn't
// re-hiding every monster by hand as they drop it. Deliberately NOT applied to
// player tokens — a party expects to see each other's names and health.
db.query(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS default_hide_token_names BOOLEAN DEFAULT false`)
  .catch(err => console.error('default_hide_token_names migration error:', err));
db.query(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS default_hide_token_hp BOOLEAN DEFAULT false`)
  .catch(err => console.error('default_hide_token_hp migration error:', err));

// ─── Lair actions (migration for existing installs) ──────────────────────────
// Lair actions fire on initiative count 20, which the tracker had no slot for.
// Stored on the session: a note describing what the lair does, and a flag for
// whether this fight has one at all.
db.query(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS lair_action_enabled BOOLEAN DEFAULT false`)
  .catch(err => console.error('lair_action_enabled migration error:', err));
db.query(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS lair_action_note TEXT DEFAULT ''`)
  .catch(err => console.error('lair_action_note migration error:', err));

// ─── Library-level label defaults (migration for existing installs) ──────────
// Set on the CREATURE, so every token spawned from it starts with its name or
// health hidden from players. This is where an "unidentified horror" belongs:
// define it once in the library and every copy you drop is already masked.
db.query(`ALTER TABLE creatures ADD COLUMN IF NOT EXISTS hide_token_name BOOLEAN DEFAULT false`)
  .catch(err => console.error('hide_token_name migration error:', err));
db.query(`ALTER TABLE creatures ADD COLUMN IF NOT EXISTS hide_token_hp BOOLEAN DEFAULT false`)
  .catch(err => console.error('hide_token_hp migration error:', err));

// ─── Wild Shape (migration for existing installs) ────────────────────────────
// The GM-curated list of forms a druid can take, as an array of creature ids
// on the PLAYER's character row. Curated rather than rule-derived so homebrew
// beasts and Circle-specific forms work without the server having to model the
// whole CR table.
db.query(`ALTER TABLE creatures ADD COLUMN IF NOT EXISTS wildshape_forms JSONB DEFAULT '[]'`)
  .catch(err => console.error('wildshape_forms migration error:', err));

// Marks a library creature as a legitimate Wild Shape form. This is a
// LIBRARY-level tag, not a permission: it filters the GM's picker down to the
// things worth shifting into, while the per-character curated list stays the
// authority on what any given druid may actually become.
db.query(`ALTER TABLE creatures ADD COLUMN IF NOT EXISTS wildshape_eligible BOOLEAN DEFAULT false`)
  .catch(err => console.error('wildshape_eligible migration error:', err));

// A flat AC adjustment the GM can dial in on top of the gear-derived value —
// cover, a class feature, a homebrew ruling. The derived part is recomputed
// from equipment and DEX, so this is the only piece a human sets by hand.
db.query(`ALTER TABLE creatures ADD COLUMN IF NOT EXISTS ac_misc_bonus INTEGER DEFAULT 0`)
  .catch(err => console.error('ac_misc_bonus migration error:', err));

// Forms where the character KEEPS their own hit points instead of taking the
// form's — Circle of the Titan's Titan Forms work this way ("your HP doesn't
// change", the form grants temporary hit points on top). Normal Wild Shape
// beasts leave this false and swap HP as before.
db.query(`ALTER TABLE creatures ADD COLUMN IF NOT EXISTS wildshape_keep_hp BOOLEAN DEFAULT false`)
  .catch(err => console.error('wildshape_keep_hp migration error:', err));

// ─── Lobby (migration for existing installs) ─────────────────────────────────
// Whether players are at the table or still in the waiting room. Defaults to
// TRUE so every session that already exists keeps letting players straight in
// — only sessions created from now on start closed (see routes/sessions.js).
db.query(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS session_started BOOLEAN DEFAULT true`)
  .catch(err => console.error('session_started migration error:', err));

// ─── Backdrops (migration for existing installs) ─────────────────────────────
// Full-screen scene art for the stretches with no map — a tavern, a cutscene,
// a villain's portrait. Created before the sessions column that references it.
db.query(`
  CREATE TABLE IF NOT EXISTS backdrops (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    image_path VARCHAR(500) NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
  )
`)
  .then(() => db.query(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS backdrop_id INTEGER REFERENCES backdrops(id) ON DELETE SET NULL`))
  .catch(err => console.error('backdrops migration error:', err));

// ─── Presentation art (migration for existing installs) ──────────────────────
// The token face is a small square crop. "Show image to players" wants the
// full picture, so creatures can carry a second, larger image just for that.
db.query(`ALTER TABLE creatures ADD COLUMN IF NOT EXISTS display_image_path VARCHAR(500)`)
  .catch(err => console.error('creatures.display_image_path migration error:', err));

// ─── Extra token art (migration for existing installs) ───────────────────────
// creatures.image_path remains the primary portrait; these are alternates the
// GM chooses between at token-placement time.
db.query(`
  CREATE TABLE IF NOT EXISTS creature_images (
    id SERIAL PRIMARY KEY,
    creature_id INTEGER REFERENCES creatures(id) ON DELETE CASCADE,
    image_path VARCHAR(500) NOT NULL,
    label VARCHAR(100) DEFAULT '',
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
  )
`)
  .then(() => db.query(`CREATE INDEX IF NOT EXISTS creature_images_creature_idx ON creature_images (creature_id, sort_order)`))
  // Which slot these alternates belong to: the top-down token face, or the 3D
  // standing art. One table rather than two because everything that already
  // guards a face alternate has to guard a standee alternate identically —
  // `imageStillInUse` refusing to unlink art a placed token still points at,
  // the cascade when a creature is deleted, and the copy made when a creature
  // is duplicated or exported. A second table would have had to re-earn all
  // three, and the one that matters (the unlink guard) fails by deleting a
  // file that is still on someone's map.
  //
  // Defaulted to 'face' so every existing row keeps its current meaning; every
  // query that reads face alternates is scoped to match.
  .then(() => db.query(`ALTER TABLE creature_images ADD COLUMN IF NOT EXISTS kind VARCHAR(16) NOT NULL DEFAULT 'face'`))
  .then(() => db.query(`CREATE INDEX IF NOT EXISTS creature_images_kind_idx ON creature_images (creature_id, kind, sort_order)`))
  .catch(err => console.error('creature_images migration error:', err));

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

// ─── Named per-map spawn points (Phase 2 of split-the-party) ─────────────────
// A map can have many labelled spawn points — the "Send to map" right-click
// flow surfaces them as a sub-submenu so the GM can land a token at a
// specific location ("Throne Room") rather than the map's default spawn.
// Chain CREATE → ALTER so the radius column is added only once the
// table exists. Firing both as parallel promises raced on a fresh DB
// and the ALTER would error with "relation does not exist".
db.query(`
  CREATE TABLE IF NOT EXISTS map_spawn_points (
    id SERIAL PRIMARY KEY,
    map_id INTEGER REFERENCES maps(id) ON DELETE CASCADE,
    label VARCHAR(100) NOT NULL DEFAULT '',
    grid_col FLOAT NOT NULL DEFAULT 0,
    grid_row FLOAT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
  )
`)
  .then(() => db.query(`ALTER TABLE map_spawn_points ADD COLUMN IF NOT EXISTS radius INTEGER DEFAULT 0`))
  .then(() => db.query(`ALTER TABLE map_spawn_points ADD COLUMN IF NOT EXISTS shape_points JSONB`))
  .catch(err => console.error('map_spawn_points migration error:', err));

// ─── Portals ────────────────────────────────────────────────────────────────
// Two squares on the same map wired together: step on one (or click it) and
// the token comes out of the other. Both ends of a link share a `pair_id`, so
// a portal is always found by looking for the other row with the same pair —
// no self-referencing foreign key to keep symmetric on delete.
//
// The two flags are deliberately separate levers:
//   hidden       — players don't see it and can't click it. The GM sees a
//                  ghost. It still fires when something steps on it, which is
//                  what makes a secret/trap portal work.
//   exit_enabled — whether this end *sends*. Turn it off on one end for a
//                  one-way gate, or on both while dressing the map.
db.query(`
  CREATE TABLE IF NOT EXISTS map_portals (
    id SERIAL PRIMARY KEY,
    map_id INTEGER REFERENCES maps(id) ON DELETE CASCADE,
    pair_id UUID NOT NULL,
    label VARCHAR(100) NOT NULL DEFAULT '',
    grid_col FLOAT NOT NULL DEFAULT 0,
    grid_row FLOAT NOT NULL DEFAULT 0,
    color VARCHAR(20) NOT NULL DEFAULT '#a855f7',
    hidden BOOLEAN NOT NULL DEFAULT false,
    exit_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
  )
`)
  .then(() => db.query(`CREATE INDEX IF NOT EXISTS idx_map_portals_map ON map_portals(map_id)`))
  .then(() => db.query(`CREATE INDEX IF NOT EXISTS idx_map_portals_pair ON map_portals(pair_id)`))
  .catch(err => console.error('map_portals migration error:', err));

db.query(`ALTER TABLE maps ADD COLUMN IF NOT EXISTS spawn_radius INTEGER DEFAULT 0`)
  .catch(err => console.error('maps.spawn_radius migration error:', err));

// Per-map fog of war. NULL means "not decided for this map", which falls back
// to the session-wide flag — so every map that existed before this column
// keeps behaving exactly as it did, and only a map the GM has actually
// toggled pins its own value. sessions.fow_enabled stays as the default for
// new maps rather than being retired.
db.query(`ALTER TABLE maps ADD COLUMN IF NOT EXISTS fow_enabled BOOLEAN`)
  .catch(err => console.error('maps.fow_enabled migration error:', err));
// Default spawn aboard a ship. When spawn_ship_id is set the deck-local coords
// are the truth and spawn_col/spawn_row are a cache of where that currently
// lands in world space — the same relationship tokens aboard have. Players then
// arrive standing on the deck wherever the hull happens to be, instead of at a
// fixed patch of sea the ship sailed away from.
db.query(`ALTER TABLE maps ADD COLUMN IF NOT EXISTS spawn_ship_id INTEGER REFERENCES map_ships(id) ON DELETE SET NULL`)
  .then(() => db.query(`ALTER TABLE maps ADD COLUMN IF NOT EXISTS spawn_deck_index INTEGER`))
  .then(() => db.query(`ALTER TABLE maps ADD COLUMN IF NOT EXISTS spawn_deck_col FLOAT`))
  .then(() => db.query(`ALTER TABLE maps ADD COLUMN IF NOT EXISTS spawn_deck_row FLOAT`))
  .catch(err => console.error('maps.spawn_ship migration error:', err));

// ─── Wildspace maps (migration for existing installs) ────────────────────────
// A wildspace map's grid, not its art, defines the play area: `image_path`
// holds a distant starscape pinned to the viewport behind the stage, which
// never pans, zooms or scales with the grid. That lets a 1000ft engagement run
// on a screen-sized image instead of a 10,000px one. grid_cols/grid_rows are
// the authoritative extent (width/height are kept in sync as cols*grid_size so
// every existing consumer of map pixel bounds keeps working). NULL cols/rows
// and map_type 'image' mean an ordinary map — the default for every existing
// row, so behaviour is unchanged for maps made before this.
db.query(`ALTER TABLE maps ADD COLUMN IF NOT EXISTS map_type VARCHAR(20) DEFAULT 'image'`)
  .then(() => db.query(`ALTER TABLE maps ADD COLUMN IF NOT EXISTS grid_cols INTEGER`))
  .then(() => db.query(`ALTER TABLE maps ADD COLUMN IF NOT EXISTS grid_rows INTEGER`))
  .catch(err => console.error('maps wildspace migration error:', err));

// ─── Hex grids (migration for existing installs) ─────────────────────────────
// Per-map lattice shape: 'square' (default, every existing row) or 'hex' —
// flat-top hexes, columns spaced 3/4 of a hex width apart with odd columns
// stepped down half a row. Deliberately per-MAP rather than per-session: an
// overland hexcrawl and the dungeon it leads into live in the same campaign.
//
// Purely a rendering choice. Token positions stay fractional grid_col/grid_row
// in the same pixel frame as a square grid, so walls, LOS, fog, templates,
// ships and measurement are all untouched and a map can be flipped between
// square and hex at any time without moving anything on it.
// ─── Projected map view ──────────────────────────────────────────────────────
// The GM putting the live map on the party's screens: whole map revealed, and
// every follower framed on the GM's own camera. Session-level (it's a mode the
// table is in, not a property of a map) and persisted so a reconnecting player
// rejoins into it rather than dropping back to their own fogged view.
// The panorama wrapped around a 3D view of this map. Separate from image_path
// because it is a different KIND of picture: the board is drawn top-down, a sky
// is an equirectangular panorama, and a map has no reason to have both the same.
// Generated star systems keep the geometry their art was drawn from, so the
// 3D view can raise real spheres and orbit rings that line up with the picture.
db.query(`ALTER TABLE maps ADD COLUMN IF NOT EXISTS system_data JSONB`)
  .catch(err => console.error('maps.system_data migration error:', err));

// A built-in sky, for maps with no uploaded panorama. Holds a preset id
// ('night', 'wildspace', ...) rather than a path; the client draws it. NULL
// means no sky at all, which is how every map behaved before.
db.query(`ALTER TABLE maps ADD COLUMN IF NOT EXISTS sky_preset VARCHAR(30)`)
  .catch(err => console.error('maps.sky_preset migration error:', err));
db.query(`ALTER TABLE maps ADD COLUMN IF NOT EXISTS sky_image_path VARCHAR(255)`)
  .catch(err => console.error('maps.sky_image_path migration error:', err));

// Backfill geometry for systems generated before the column existed. Their art
// is machine-written, so it can be read back rather than asking a GM to
// regenerate a map the table has already played on. Runs once at boot; maps
// that aren't ours parse to null and are left alone.
db.query(`ALTER TABLE maps ADD COLUMN IF NOT EXISTS system_data JSONB`)
  .then(() => db.query(
    `SELECT id, image_path, width, height FROM maps
      WHERE system_data IS NULL AND image_path LIKE '%.svg'`
  ))
  .then(async ({ rows }) => {
    const { parseSystemSvg } = require('./systemMap');
    let done = 0;
    for (const m of rows) {
      try {
        const svg = fs.readFileSync(path.join(__dirname, '../uploads', m.image_path), 'utf8');
        const geom = parseSystemSvg(svg, m.width, m.height);
        if (!geom) continue;
        await db.query('UPDATE maps SET system_data=$1 WHERE id=$2', [JSON.stringify(geom), m.id]);
        done++;
      } catch { /* unreadable file — skip it */ }
    }
    if (done) console.log(`system_data backfilled for ${done} map(s)`);
  })
  .catch(err => console.error('system_data backfill error:', err));

db.query(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS live_map_view BOOLEAN DEFAULT false`)
  .catch(err => console.error('sessions.live_map_view migration error:', err));

// ── When the group next meets ───────────────────────────────────────────────
//
// The lobby counts down to this and offers it as a calendar invite. NULL means
// nothing is scheduled, which is the normal state between campaigns — the
// lobby simply shows no countdown rather than a zeroed one.
//
// TIMESTAMPTZ, not TIMESTAMP. The GM picks a wall-clock time in their own zone
// and the players are not necessarily in it; storing a naive timestamp would
// hand every client the same digits and let each interpret them locally, so a
// player one zone over would be told the wrong hour and the countdown would be
// off by exactly that offset. With a zone-aware column the instant is absolute
// and each client renders it in its own local time.
db.query(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS next_session_at TIMESTAMPTZ`)
  .catch(err => console.error('sessions.next_session_at migration error:', err));
// What to call it — "Session 12: The Sunless Citadel". Shown under the
// countdown and used as the calendar event's title.
db.query(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS next_session_note TEXT DEFAULT ''`)
  .catch(err => console.error('sessions.next_session_note migration error:', err));
// How long the session is expected to run, in minutes. Exists only so the
// calendar invite has an end: a VEVENT with no duration imports as a zero
// length blip that most calendars draw as a single line and some hide.
db.query(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS next_session_minutes INTEGER DEFAULT 180`)
  .catch(err => console.error('sessions.next_session_minutes migration error:', err));

db.query(`ALTER TABLE maps ADD COLUMN IF NOT EXISTS grid_type VARCHAR(10) DEFAULT 'square'`)
  // What one cell is WORTH, and the key that says so. `grid_unit` is free text
  // because a hex isn't always a distance — an overland map's hex is as likely
  // to be "10 days travel" as it is "6 miles", and nothing downstream parses
  // it. The pair is a label for the scale key and for the ruler readout only.
  //
  // Feet-denominated game objects — spell template radii, light and vision
  // ranges, auras, air bubbles — are deliberately NOT scaled by this. A
  // fireball is 20 ft whatever the GM decides a hex means, so those keep their
  // own 5-ft-per-cell conversion and are unaffected by anything set here.
  .then(() => db.query(`ALTER TABLE maps ADD COLUMN IF NOT EXISTS grid_scale FLOAT DEFAULT 5`))
  .then(() => db.query(`ALTER TABLE maps ADD COLUMN IF NOT EXISTS grid_unit VARCHAR(24) DEFAULT 'ft'`))
  .then(() => db.query(`ALTER TABLE maps ADD COLUMN IF NOT EXISTS grid_scale_visible BOOLEAN DEFAULT false`))
  .catch(err => console.error('maps grid_type migration error:', err));

// ─── Spelljammer ships (migration for existing installs) ─────────────────────
// ship_library (class) → ship_decks (levels) → map_ships (placed instance),
// mirroring terrain_library/map_terrain. Chained because session_tokens.ship_id
// carries an FK onto map_ships, so map_ships must exist before that ALTER runs.
db.query(`
  CREATE TABLE IF NOT EXISTS ship_library (
    id SERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL DEFAULT '',
    ship_class VARCHAR(80) DEFAULT '',
    armor_class INTEGER DEFAULT 15,
    hull_hp INTEGER DEFAULT 300,
    damage_threshold INTEGER DEFAULT 0,
    speed INTEGER DEFAULT 0,
    maneuverability VARCHAR(20) DEFAULT '',
    crew_min INTEGER DEFAULT 0,
    crew_max INTEGER DEFAULT 0,
    cargo_tons FLOAT DEFAULT 0,
    keel_length INTEGER DEFAULT 0,
    beam_width INTEGER DEFAULT 0,
    weapons JSONB DEFAULT '[]',
    notes TEXT DEFAULT '',
    created_at TIMESTAMP DEFAULT NOW()
  )
`)
  .then(() => db.query(`
    CREATE TABLE IF NOT EXISTS ship_decks (
      id SERIAL PRIMARY KEY,
      ship_id INTEGER REFERENCES ship_library(id) ON DELETE CASCADE,
      deck_index INTEGER NOT NULL DEFAULT 0,
      name VARCHAR(80) NOT NULL DEFAULT '',
      image_path VARCHAR(500) NOT NULL,
      grid_cols FLOAT NOT NULL DEFAULT 4,
      grid_rows FLOAT NOT NULL DEFAULT 8,
      hull_walls JSONB,
      transitions JSONB DEFAULT '[]',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `))
  .then(() => db.query(`
    CREATE TABLE IF NOT EXISTS map_ships (
      id SERIAL PRIMARY KEY,
      session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
      map_id INTEGER REFERENCES maps(id) ON DELETE CASCADE,
      library_id INTEGER REFERENCES ship_library(id) ON DELETE SET NULL,
      name VARCHAR(255) NOT NULL DEFAULT '',
      grid_col FLOAT NOT NULL DEFAULT 0,
      grid_row FLOAT NOT NULL DEFAULT 0,
      rotation FLOAT NOT NULL DEFAULT 0,
      active_deck INTEGER NOT NULL DEFAULT 0,
      current_hp INTEGER,
      attuned_player VARCHAR(255),
      z_index INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `))
  // Per-deck alignment offset. Decks are rarely the same size, so without an
  // offset they all pin to the ship's top-left and the hull jumps when the GM
  // switches level. Deck 0 is the reference and stays at 0,0.
  // Air envelope in feet beyond the hull. Oval, because it's drawn outward
  // from an oblong hull. 0 = none.
  .then(() => db.query(`ALTER TABLE ship_library ADD COLUMN IF NOT EXISTS air_bubble_ft INTEGER DEFAULT 0`))
  // What the hull is made of — "Wooden hull", "Adamantine", "Bone". Free text
  // rather than an enum: it's flavour that feeds the stat line, and every
  // setting names its materials differently.
  .then(() => db.query(`ALTER TABLE ship_library ADD COLUMN IF NOT EXISTS armor_type VARCHAR(80) DEFAULT ''`))
  // The spelljamming helm: {"col":n,"row":n} in deck-local squares, or NULL for
  // a deck without one. Stored per deck rather than per ship because which
  // level the helm sits on is part of the ship's layout, and the same library
  // hull is reused by every placed copy.
  .then(() => db.query(`ALTER TABLE ship_decks ADD COLUMN IF NOT EXISTS helm JSONB`))
  // Footprint override, in squares. NULL means "use whatever the size preset
  // says". Gargantuan is defined as 20 feet OR MORE, so its 4x4 is a floor and
  // a tarrasque or a dragon turtle needs to be bigger than it without becoming
  // a different size category.
  .then(() => db.query(`ALTER TABLE session_tokens ADD COLUMN IF NOT EXISTS size_squares FLOAT`))
  .then(() => db.query(`ALTER TABLE ship_decks ADD COLUMN IF NOT EXISTS offset_col FLOAT NOT NULL DEFAULT 0`))
  .then(() => db.query(`ALTER TABLE ship_decks ADD COLUMN IF NOT EXISTS offset_row FLOAT NOT NULL DEFAULT 0`))
  // The deck someone boarding arrives on, and the floor everything else stacks
  // above. Not necessarily deck 0: a ship can carry small decks above its main
  // one. Nothing is marked on an existing ship, so mainDeck() falls back to the
  // lowest deck_index — which is what every ship built before this did anyway.
  .then(() => db.query(`ALTER TABLE ship_decks ADD COLUMN IF NOT EXISTS is_main BOOLEAN NOT NULL DEFAULT FALSE`))
  // Decoration, not a level: sails, rigging, masts — the bits you see from
  // outside a ship. Never carries tokens, never appears in the deck switcher,
  // and is hidden from anyone standing aboard (you don't see your own sails
  // from on deck, and they'd cover the deck you're standing on).
  .then(() => db.query(`ALTER TABLE ship_decks ADD COLUMN IF NOT EXISTS is_sails BOOLEAN NOT NULL DEFAULT FALSE`))
  // How much headroom a deck has, in feet. Used by the 3D view to space the
  // levels when a hull is shown expanded — a cargo hold and a crow's nest are
  // not the same height apart, and stacking every ship on one constant made
  // tall ships look squat and low ones look like scaffolding. 10 ft is the
  // default because that is what the stack assumed before this column existed,
  // so every ship already built keeps exactly the spacing it had.
  .then(() => db.query(`ALTER TABLE ship_decks ADD COLUMN IF NOT EXISTS height_ft NUMERIC(6,2) NOT NULL DEFAULT 10`))
  // Doors cut into a deck, in the same deck-local squares hull_walls uses.
  // Dungeondraft exports them as `portals`, and a ship without them is a hull
  // with doorways painted on.
  .then(() => db.query(`ALTER TABLE ship_decks ADD COLUMN IF NOT EXISTS hull_doors JSONB`))
  // Placed-ship geometry is projected into REAL wall and door rows, the same
  // way terrain pieces are (see walls.terrain_id). Without a link back to the
  // ship there is nothing to delete when it moves, turns, changes level or
  // leaves — so a hull would smear a trail of walls across the board.
  .then(() => db.query(`ALTER TABLE walls ADD COLUMN IF NOT EXISTS ship_id INTEGER REFERENCES map_ships(id) ON DELETE CASCADE`))
  .then(() => db.query(`ALTER TABLE doors ADD COLUMN IF NOT EXISTS ship_id INTEGER REFERENCES map_ships(id) ON DELETE CASCADE`))
  .then(() => db.query(`CREATE INDEX IF NOT EXISTS idx_walls_ship ON walls(ship_id)`))
  .then(() => db.query(`CREATE INDEX IF NOT EXISTS idx_doors_ship ON doors(ship_id)`))
  .then(() => db.query(`ALTER TABLE session_tokens ADD COLUMN IF NOT EXISTS ship_id INTEGER REFERENCES map_ships(id) ON DELETE SET NULL`))
  .then(() => db.query(`ALTER TABLE session_tokens ADD COLUMN IF NOT EXISTS deck_index INTEGER DEFAULT 0`))
  .then(() => db.query(`ALTER TABLE session_tokens ADD COLUMN IF NOT EXISTS deck_col FLOAT`))
  .then(() => db.query(`ALTER TABLE session_tokens ADD COLUMN IF NOT EXISTS deck_row FLOAT`))
  // Ships roll their own initiative in ship-to-ship combat, so a placed hull
  // needs the same two fields a token has: where it sits in the order, and
  // whether it's in this fight at all. On map_ships rather than ship_library —
  // two Hammerheads slugging it out each roll separately.
  .then(() => db.query(`ALTER TABLE map_ships ADD COLUMN IF NOT EXISTS initiative INTEGER`))
  .then(() => db.query(`ALTER TABLE map_ships ADD COLUMN IF NOT EXISTS in_combat BOOLEAN NOT NULL DEFAULT FALSE`))
  .then(() => db.query(`CREATE INDEX IF NOT EXISTS idx_ship_decks_ship ON ship_decks(ship_id, deck_index)`))
  .then(() => db.query(`CREATE INDEX IF NOT EXISTS idx_map_ships_map ON map_ships(map_id)`))
  .then(() => db.query(`CREATE INDEX IF NOT EXISTS idx_session_tokens_ship ON session_tokens(ship_id)`))
  .catch(err => console.error('ships migration error:', err));

// ─── Map levels (multi-storey buildings) ─────────────────────────────────────
//
// The storeys of a building, modelled on ship_decks — which already solves this
// exact problem for hulls: several stacked floors, one of them drawn at a time,
// tokens that belong to a particular one, and stairs between them. Two parallel
// systems for "a thing with levels" would drift, so this deliberately borrows
// the same shape: level_index, a per-level image, an alignment offset, a height,
// and a transitions list for the stairs.
//
// A map with no levels row is a perfectly ordinary single-storey map, which is
// every map that exists today. Level 0 is the ground floor and its image is
// also maps.image_path, so nothing that reads a map the old way changes.
db.query(`
  CREATE TABLE IF NOT EXISTS map_levels (
    id SERIAL PRIMARY KEY,
    map_id INTEGER REFERENCES maps(id) ON DELETE CASCADE,
    level_index INTEGER NOT NULL DEFAULT 0,
    name VARCHAR(80) NOT NULL DEFAULT '',
    image_path VARCHAR(500) NOT NULL,
    width INTEGER,
    height INTEGER,
    -- Alignment against level 0, in map pixels. Dungeondraft exports each level
    -- on its own canvas and they are not always the same size or origin, so
    -- without this an upper floor can sit a few feet off the walls below it.
    offset_x FLOAT NOT NULL DEFAULT 0,
    offset_y FLOAT NOT NULL DEFAULT 0,
    -- Storey height in feet: what the 3D view stacks them by, and what a fall
    -- from this level costs.
    height_ft FLOAT NOT NULL DEFAULT 10,
    -- Stairs, ladders and hatches. Same shape as ship_decks.transitions.
    transitions JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT NOW()
  )
`)
  .then(() => db.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_map_levels_unique ON map_levels(map_id, level_index)`))
  // Which storey is drawn. A scene control like a ship's active_deck, not a
  // per-viewer preference: it changes what everyone at the table is looking at.
  .then(() => db.query(`ALTER TABLE maps ADD COLUMN IF NOT EXISTS active_level INTEGER NOT NULL DEFAULT 0`))
  // Which storey a token is standing on. Independent of ship_id/deck_index —
  // a token can be on the first floor of an inn, or on the second deck of a
  // ship, and the two are different questions.
  .then(() => db.query(`ALTER TABLE session_tokens ADD COLUMN IF NOT EXISTS level_index INTEGER NOT NULL DEFAULT 0`))
  // Geometry belongs to a storey, not to the map. Walls on the first floor must
  // not block sight on the ground floor, and a door upstairs is not a door
  // down here. Defaulting to 0 puts every existing wall on the ground floor,
  // which for a single-storey map is the only floor there is.
  .then(() => db.query(`ALTER TABLE walls ADD COLUMN IF NOT EXISTS level_index INTEGER NOT NULL DEFAULT 0`))
  .then(() => db.query(`ALTER TABLE doors ADD COLUMN IF NOT EXISTS level_index INTEGER NOT NULL DEFAULT 0`))
  // Door or window.
  //
  // A Universal VTT `portal` says only where the opening is and whether it is
  // shut — nothing about what KIND of opening it is. So the importer guesses
  // from the geometry (see isExteriorPortal) and the GM corrects it, which is
  // the honest split: the guess is right often enough to save a lot of clicking
  // and wrong often enough that it must never be the last word.
  .then(() => db.query(`ALTER TABLE doors ADD COLUMN IF NOT EXISTS portal_kind VARCHAR(12) NOT NULL DEFAULT 'door'`))
  .then(() => db.query(`ALTER TABLE light_sources ADD COLUMN IF NOT EXISTS level_index INTEGER NOT NULL DEFAULT 0`))
  .then(() => db.query(`CREATE INDEX IF NOT EXISTS idx_walls_map_level ON walls(map_id, level_index)`))
  .then(() => db.query(`CREATE INDEX IF NOT EXISTS idx_doors_map_level ON doors(map_id, level_index)`))
  .then(() => db.query(`CREATE INDEX IF NOT EXISTS idx_lights_map_level ON light_sources(map_id, level_index)`))
  .catch(err => console.error('map levels migration error:', err));

// ─── Terrain library + placed instances ──────────────────────────────────────
// Library is global (not per-session) — GM-curated reusable pieces. The
// shipping defaults (rock wall / rubble / tree) are auto-seeded on first
// startup so a fresh install has something to drop on the map.
// Chain CREATE map_terrain after CREATE terrain_library — the FK on
// library_id needs terrain_library to exist first. Seed runs once both
// are in place so the row inserts can be referenced cleanly.
db.query(`
  CREATE TABLE IF NOT EXISTS terrain_library (
    id SERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL DEFAULT '',
    image_path VARCHAR(500) NOT NULL,
    default_w FLOAT NOT NULL DEFAULT 1,
    default_h FLOAT NOT NULL DEFAULT 1,
    blocks_vision BOOLEAN DEFAULT false,
    blocks_light BOOLEAN DEFAULT false,
    blocks_movement BOOLEAN DEFAULT false,
    hide_until_revealed BOOLEAN DEFAULT false,
    custom_walls JSONB,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
  )
`)
  .then(() => db.query(`
    CREATE TABLE IF NOT EXISTS map_terrain (
      id SERIAL PRIMARY KEY,
      map_id INTEGER REFERENCES maps(id) ON DELETE CASCADE,
      library_id INTEGER REFERENCES terrain_library(id) ON DELETE SET NULL,
      grid_col FLOAT NOT NULL DEFAULT 0,
      grid_row FLOAT NOT NULL DEFAULT 0,
      width FLOAT NOT NULL DEFAULT 1,
      height FLOAT NOT NULL DEFAULT 1,
      rotation FLOAT NOT NULL DEFAULT 0,
      is_revealed BOOLEAN DEFAULT true,
      z_index INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `))
  // ── Map markers ────────────────────────────────────────────────────────
  // Ships, settlements, points of interest — the things an overland/hex map is
  // made of. They are terrain mechanically (free-scaled artwork the GM places,
  // moves and hides) and are deliberately NOT tokens: they have no HP, no
  // conditions and no place in the initiative order, which is exactly the
  // machinery a token drags along with it.
  //
  // Two additions carry the whole feature:
  //   is_marker — a library flag. Splits the library into "scenery" and
  //               "markers" in the GM's UI, and is what makes a placed piece
  //               draw its name on the map.
  //   label     — a per-PLACEMENT name, so one "town" image can be Waterdeep
  //               here and Neverwinter there. Falls back to the library name.
  .then(() => db.query(`ALTER TABLE terrain_library ADD COLUMN IF NOT EXISTS is_marker BOOLEAN DEFAULT false`))
  // The UNFRAMED original behind a marker's circular art. ImageFramer bakes its
  // crop into the saved file, so once a marker is framed the square 512px
  // version is all that's left — and "show the players the full image" wants
  // the picture, not the coin. Kept alongside rather than instead: image_path
  // stays the thing drawn on the map. NULL for scenery and for markers uploaded
  // without framing, where the two are the same file.
  .then(() => db.query(`ALTER TABLE terrain_library ADD COLUMN IF NOT EXISTS source_image_path VARCHAR(500)`))
  .then(() => db.query(`ALTER TABLE map_terrain ADD COLUMN IF NOT EXISTS label VARCHAR(120)`))
  .then(() => db.query(`ALTER TABLE walls ADD COLUMN IF NOT EXISTS terrain_id INTEGER REFERENCES map_terrain(id) ON DELETE CASCADE`))
  // How a library entry is drawn in the 3D view: 'flat' lies on the board as a
  // plane (the default, and right for a rug, a crate, a painted sigil), 'rock'
  // becomes a deformed lump, 'sphere' a world.
  //
  // A flag rather than a filename rule. The shipped sets were detected by their
  // seeded names, which meant a GM's OWN uploaded asteroid — the common case,
  // since most groups bring their own art — stayed a flat picture lying face-up
  // on the floor with no way to say otherwise.
  .then(() => db.query(`ALTER TABLE terrain_library ADD COLUMN IF NOT EXISTS three_d_shape VARCHAR(12) NOT NULL DEFAULT 'flat'`))
  // Backfill the shipped sets, so they keep behaving as they already do.
  .then(() => db.query(`UPDATE terrain_library SET three_d_shape='rock' WHERE image_path LIKE 'terrain/asteroid-%' AND three_d_shape='flat'`))
  .then(() => db.query(`UPDATE terrain_library SET three_d_shape='sphere' WHERE image_path LIKE 'terrain/planet-%' AND three_d_shape='flat'`))
  // ── Imported 3D models ─────────────────────────────────────────────────
  // A GM who models a world in Blender wants THAT world in the 3D view, not a
  // procedural ball tinted to match their sprite. `model_path` is a glTF file
  // (.glb preferred — it carries its textures and materials inside the one
  // file) sitting alongside the piece's flat art rather than replacing it: the
  // 2D board still draws `image_path`, so the same library entry is a picture
  // on the flat map and a mesh in 3D.
  //
  // `model_scale` is a plain multiplier on top of the auto-fit. The auto-fit
  // sizes the model to the placement's grid footprint, which is right most of
  // the time and wrong for anything exported with a lot of empty space around
  // it (or with a halo/atmosphere shell that shouldn't count towards the fit).
  // Which VARIATION of a shape a library entry is. The general version of
  // cloud_form: a tentacle is 'rearing', 'coiled' or 'nest', and most shapes
  // have no variations at all, which is the empty default.
  //
  // NOT cloud_form reused — that one is whitelisted to cloud volumes and
  // defaults to 'bank', so a tentacle would have arrived pre-set to a value
  // from another shape's vocabulary.
  //
  // On the library entry rather than the placement, for the reason cloud_form
  // is: each form ships with overhead art drawn to match it, and a placement
  // that could re-pose itself would leave the flat map showing a limb the 3D
  // view no longer grows.
  .then(() => db.query(`ALTER TABLE terrain_library ADD COLUMN IF NOT EXISTS piece_form VARCHAR(16) NOT NULL DEFAULT ''`))
  .then(() => db.query(`ALTER TABLE terrain_library ADD COLUMN IF NOT EXISTS model_path VARCHAR(500)`))
  .then(() => db.query(`ALTER TABLE terrain_library ADD COLUMN IF NOT EXISTS model_scale FLOAT NOT NULL DEFAULT 1`))
  // Which VOLUME a cloud piece builds in 3D. Only read when three_d_shape is
  // 'cloud'; every form is the same billboard-scatter machinery with different
  // placement rules (see CLOUD_FORMS in Map3DView).
  //
  // On the library entry rather than the placement, because each shipped cloud
  // ships with 2D art drawn to match its form — a Fog Wall's overhead art is a
  // long band, and letting a placement re-form it to a column would leave the
  // flat map showing something the 3D view no longer draws.
  .then(() => db.query(`ALTER TABLE terrain_library ADD COLUMN IF NOT EXISTS cloud_form VARCHAR(16) NOT NULL DEFAULT 'bank'`))
  // The shipped Wildspace Gate stands up as a real ring in 3D rather than lying
  // on the floor as a symbol. Same one-way backfill the planets and rocks get:
  // it only ever touches a row still on the 'flat' default, so a GM who has
  // deliberately changed this piece keeps their choice.
  .then(() => db.query(`UPDATE terrain_library SET three_d_shape='gate' WHERE image_path='terrain/space-gate.svg' AND three_d_shape='flat'`))
  // ── Per-placement 3D properties ────────────────────────────────────────
  // Height off the board, in FEET, matching session_tokens.elevation and the
  // rest of the 3D view's units. The flat map ignores it entirely — a piece
  // 200 ft up is still drawn at its grid square there, which is what an
  // overhead view should show.
  .then(() => db.query(`ALTER TABLE map_terrain ADD COLUMN IF NOT EXISTS elevation FLOAT NOT NULL DEFAULT 0`))
  // Locked pieces can't be dragged, resized or rotated, and don't take clicks
  // meant for the map or the tokens standing on them. Right-click still finds
  // them, or there'd be no way to unlock one.
  .then(() => db.query(`ALTER TABLE map_terrain ADD COLUMN IF NOT EXISTS locked BOOLEAN NOT NULL DEFAULT false`))
  // Name tag in the 3D view. NULL means "auto": markers are named, scenery
  // isn't — which is exactly what the flat map already does. true/false is the
  // GM overriding that for this one placement.
  .then(() => db.query(`ALTER TABLE map_terrain ADD COLUMN IF NOT EXISTS show_label BOOLEAN`))
  // GM sees the tag, players don't. The name is stripped SERVER-side (see
  // stripTerrainLabelForPlayer) rather than hidden in the client, so a secret
  // name never reaches a player's machine at all.
  .then(() => db.query(`ALTER TABLE map_terrain ADD COLUMN IF NOT EXISTS hide_label_from_players BOOLEAN NOT NULL DEFAULT false`))
  // Per-placement colour, as a #rrggbb string. NULL is the artwork's own
  // colours, which is why this isn't defaulted to white: "untinted" and "tinted
  // pure white" are different requests, and a default would make every existing
  // piece claim to have been deliberately coloured.
  //
  // Applied by MULTIPLYING the art rather than replacing it, in both views, so
  // a cloud keeps its internal shading and soft edges and just changes hue —
  // flat-filling the silhouette turns a vapour bank into a coloured blob.
  .then(() => db.query(`ALTER TABLE map_terrain ADD COLUMN IF NOT EXISTS tint VARCHAR(9)`))
  // How fast this placement's 3D animation runs, as a multiplier. 0 freezes it.
  //
  // Per-placement rather than per-library-entry because it is a pacing choice
  // about one scene: the same Storm Column is a lazy smoke plume over a
  // burned-out village and a churning vortex above a volcano, and a GM running
  // a quiet scene may want everything on the board to hold still.
  .then(() => db.query(`ALTER TABLE map_terrain ADD COLUMN IF NOT EXISTS anim_speed FLOAT NOT NULL DEFAULT 1`))
  // Switched on or off. Currently only a wildspace gate reads it — a dormant
  // gate is a dark ring you can see straight through — but it is deliberately
  // named for the general case rather than `gate_active`, because "this hazard
  // is dormant right now" is the same question for a rift or a storm.
  //
  // Defaults to true so every piece already on a board keeps working.
  .then(() => db.query(`ALTER TABLE map_terrain ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true`))
  .then(() => db.query(`CREATE INDEX IF NOT EXISTS idx_walls_terrain ON walls(terrain_id)`))
  .then(() => removeSeededTerrainDefaults())
  .then(() => seedSystemMarkers())
  .then(() => seedPlanetMarkers())
  .then(() => seedAsteroidMarkers())
  .then(() => seedSpaceFeatureMarkers())
  .then(() => seedCloudMarkers())
  .then(() => seedHazardMarkers())
  .then(() => seedTerrainFeatures())
  .then(() => backfillMapDimensions())
  .then(() => regenAllTerrainWallsOnce())
  .catch(err => console.error('terrain migration error:', err));

// ─── Tile maps ───────────────────────────────────────────────────────────────
//
// A map built a piece at a time from a deck, rather than one drawn in advance:
// the GM turns a card, the card names a tile, and the tile goes down on the
// lattice. The dungeon exists only as far as the party has explored it.
//
// Three tables, matching the three things that are genuinely different:
//
//   tile_library    the GM's stock of tiles, like the creature and terrain
//                   libraries — campaign-wide, reusable across maps.
//   tile_decks      a pile built out of that stock. Cards live in the deck,
//                   not the library, so the same tile can appear five times
//                   in one deck and once in another.
//   map_tiles       what has actually been laid down, per map.
db.query(`
  CREATE TABLE IF NOT EXISTS tile_library (
    id SERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL DEFAULT '',
    image_path VARCHAR(500) NOT NULL,
    -- Footprint in grid squares. Most tiles are square, but a corridor
    -- section is a perfectly reasonable 1x2.
    grid_w INTEGER NOT NULL DEFAULT 2,
    grid_h INTEGER NOT NULL DEFAULT 2,
    -- Which edges are OPEN, read at rotation 0, clockwise from north.
    --
    -- Placement is manual, so these do not gate where a tile may go — the GM
    -- puts it where they want it. What they do is tell the 3D view where the
    -- WALLS are: a closed edge gets one, an open edge is a doorway through to
    -- whatever is laid next to it. Without them a tile map in 3D is a set of
    -- floating floor panels.
    edge_n BOOLEAN NOT NULL DEFAULT false,
    edge_e BOOLEAN NOT NULL DEFAULT false,
    edge_s BOOLEAN NOT NULL DEFAULT false,
    edge_w BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
  )
`)
  .then(() => db.query(`
    CREATE TABLE IF NOT EXISTS tile_decks (
      id SERIAL PRIMARY KEY,
      session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
      name VARCHAR(120) NOT NULL DEFAULT 'Dungeon Deck',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `))
  .then(() => db.query(`
    CREATE TABLE IF NOT EXISTS tile_deck_cards (
      id SERIAL PRIMARY KEY,
      deck_id INTEGER REFERENCES tile_decks(id) ON DELETE CASCADE,
      tile_id INTEGER REFERENCES tile_library(id) ON DELETE CASCADE,
      -- Which pile this card is in. A deck that DEPLETES is the whole point:
      -- 'draw' is face down, 'pending' is the one card turned and waiting to
      -- be placed, 'discard' is spent. Reshuffling moves discard back to draw.
      --
      -- Modelled as a column on the card rather than as three tables because
      -- a card moving between piles is then one UPDATE, and a card can never
      -- be in two piles or in none.
      pile VARCHAR(10) NOT NULL DEFAULT 'draw',
      sort_order INTEGER NOT NULL DEFAULT 0
    )
  `))
  .then(() => db.query(`CREATE INDEX IF NOT EXISTS tile_deck_cards_idx ON tile_deck_cards (deck_id, pile)`))
  .then(() => db.query(`
    CREATE TABLE IF NOT EXISTS map_tiles (
      id SERIAL PRIMARY KEY,
      map_id INTEGER REFERENCES maps(id) ON DELETE CASCADE,
      -- SET NULL, not CASCADE: deleting a tile from the library must not tear
      -- laid tiles out of a dungeon the party is standing in. The row keeps
      -- its own copy of the art path for exactly that reason.
      tile_id INTEGER REFERENCES tile_library(id) ON DELETE SET NULL,
      image_path VARCHAR(500) NOT NULL DEFAULT '',
      grid_col INTEGER NOT NULL DEFAULT 0,
      grid_row INTEGER NOT NULL DEFAULT 0,
      grid_w INTEGER NOT NULL DEFAULT 2,
      grid_h INTEGER NOT NULL DEFAULT 2,
      -- 0/90/180/270. Rotating a tile rotates its edges with it.
      rotation INTEGER NOT NULL DEFAULT 0,
      edge_n BOOLEAN NOT NULL DEFAULT false,
      edge_e BOOLEAN NOT NULL DEFAULT false,
      edge_s BOOLEAN NOT NULL DEFAULT false,
      edge_w BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `))
  .then(() => db.query(`CREATE INDEX IF NOT EXISTS map_tiles_map_idx ON map_tiles (map_id)`))
  // ── What a tile CARRIES ────────────────────────────────────────────────────
  //
  // A tile imported from Dungeondraft brings its own walls and doors, and the
  // GM can stock it with creatures. Both are stored on the LIBRARY row in the
  // tile's own local coordinates, measured in GRID SQUARES from its top-left
  // corner — not pixels.
  //
  // Grid units on purpose. The tile's artwork was drawn at Dungeondraft's
  // pixels-per-grid, and the map it eventually lands on may use a different
  // grid_size entirely. In squares, a wall two squares along the north edge is
  // two squares along the north edge on any map, at any zoom.
  //
  //   geometry  { walls: [[x1,y1,x2,y2], …], doors: [{ points, isOpen, kind }] }
  //   spawns    [{ creature_id, col, row }]
  .then(() => db.query(`ALTER TABLE tile_library ADD COLUMN IF NOT EXISTS geometry JSONB NOT NULL DEFAULT '{}'::jsonb`))
  .then(() => db.query(`ALTER TABLE tile_library ADD COLUMN IF NOT EXISTS spawns JSONB NOT NULL DEFAULT '[]'::jsonb`))
  // Walls and doors materialised BY a laid tile, tagged with it so lifting the
  // tile takes them with it. Without the link a removed tile would leave its
  // walls standing in mid-air, invisible and still blocking sight.
  .then(() => db.query(`ALTER TABLE walls ADD COLUMN IF NOT EXISTS tile_id INTEGER REFERENCES map_tiles(id) ON DELETE CASCADE`))
  .then(() => db.query(`ALTER TABLE doors ADD COLUMN IF NOT EXISTS tile_id INTEGER REFERENCES map_tiles(id) ON DELETE CASCADE`))
  // Tokens spawned by a tile are tagged too, but SET NULL rather than CASCADE.
  //
  // Deliberately different from the walls. A wall is scenery and belongs to
  // its tile; a creature is something the table is interacting with, and may
  // by now be damaged, moved, or halfway through its turn. Lifting a tile must
  // not silently delete it — the GM can remove a stray monster in one click,
  // but cannot get back one that vanished mid-fight.
  .then(() => db.query(`ALTER TABLE session_tokens ADD COLUMN IF NOT EXISTS tile_id INTEGER REFERENCES map_tiles(id) ON DELETE SET NULL`))
  // Does this laid tile carry REAL walls, imported with it?
  //
  // The 3D view draws a wall on every edge a tile says is closed — a decent
  // approximation for a hand-made tile that only knows about its four sides.
  // An imported Dungeondraft tile knows far better: it brings the room's
  // actual walls, doorways included. Boxing that in would seal every opening
  // the import just described, so the crude edges are skipped for these.
  .then(() => db.query(`ALTER TABLE map_tiles ADD COLUMN IF NOT EXISTS has_geometry BOOLEAN NOT NULL DEFAULT false`))
  // What KIND of tile this is — room, corridor, entrance, and whatever else a
  // GM finds useful. Free text rather than an enum: every dungeon set divides
  // itself differently, and a fixed list would be wrong for the second one.
  // Blank means uncategorised, which is where everything starts.
  .then(() => db.query(`ALTER TABLE tile_library ADD COLUMN IF NOT EXISTS category VARCHAR(40) NOT NULL DEFAULT ''`))
  // How tall this tile's walls stand, in feet.
  //
  // Per TILE rather than per map, because that is the unit that actually has a
  // height: a crawlspace, a cellar and a cathedral can all be laid on the same
  // board, and one storey height for the whole dungeon makes every one of them
  // the same room. 10ft is the ordinary interior the renderer already assumed.
  .then(() => db.query(`ALTER TABLE tile_library ADD COLUMN IF NOT EXISTS wall_height_ft FLOAT NOT NULL DEFAULT 10`))
  .then(() => db.query(`ALTER TABLE map_tiles ADD COLUMN IF NOT EXISTS wall_height_ft FLOAT NOT NULL DEFAULT 10`))
  // Carried on the wall and door rows themselves, so a wall that came off a
  // tile keeps that tile's height wherever it ends up — the extruder groups by
  // height and does not have to know anything about tiles.
  .then(() => db.query(`ALTER TABLE walls ADD COLUMN IF NOT EXISTS height_ft FLOAT`))
  .then(() => db.query(`ALTER TABLE doors ADD COLUMN IF NOT EXISTS height_ft FLOAT`))
  // Backfill for tiles laid before the flag existed.
  //
  // Without this, every tile already on a board keeps its four-edge box —
  // which for an imported room means walls straight across the doorways the
  // import itself created. The doors are there and were simply bricked up.
  //
  // Derived from what each tile actually PUT on the board rather than from its
  // library row: a tile whose library entry has since been edited or deleted
  // still has its walls standing, and those are the truth about whether it
  // needs the crude box.
  // ── Merging geometry imported before the merge existed ────────────────────
  //
  // Dungeondraft writes a four-square opening as four one-square portals, and
  // the importer now folds those into one door. Tiles imported BEFORE that
  // still hold the unmerged run, and re-importing them would mean rebuilding
  // every deck that references them — so they are merged in place instead.
  //
  // Safe to run every boot: merging an already-merged run changes nothing, and
  // nothing is written unless the count actually drops.
  .then(async () => {
    const { mergeSegments } = require('./tileSegments');
    const rows = (await db.query(
      `SELECT id, geometry FROM tile_library
        WHERE jsonb_array_length(COALESCE(geometry->'doors','[]'::jsonb)) > 0
           OR jsonb_array_length(COALESCE(geometry->'walls','[]'::jsonb)) > 0`
    )).rows;
    let fixed = 0;
    for (const r of rows) {
      const g = r.geometry || {};
      const walls = mergeSegments(g.walls || []);
      // Grouped by kind and open-state, so a window is never folded into the
      // door beside it.
      const groups = new Map();
      for (const d of (g.doors || [])) {
        const key = `${d.kind || 'door'}|${!!d.isOpen}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(d.points || []);
      }
      const doors = [];
      for (const [key, segs] of groups) {
        const [kind, open] = key.split('|');
        for (const pts of mergeSegments(segs)) doors.push({ points: pts, isOpen: open === 'true', kind });
      }
      if (walls.length === (g.walls || []).length && doors.length === (g.doors || []).length) continue;
      await db.query('UPDATE tile_library SET geometry=$1 WHERE id=$2',
        [JSON.stringify({ ...g, walls, doors }), r.id]);
      fixed++;
    }
    if (fixed) console.log(`Merged tile geometry for ${fixed} tile${fixed === 1 ? '' : 's'}.`);
  })

  // The same merge for doors ALREADY LAID on a board.
  //
  // The library fix only helps the next placement; a dungeon the party is
  // standing in would keep its four-doors-per-doorway until every tile was
  // lifted and re-laid. These are real rows on a real map, so they are merged
  // where they stand — one door per gap, keeping the widest span.
  .then(async () => {
    const { mergeSegments } = require('./tileSegments');
    const tiles = (await db.query(
      `SELECT DISTINCT tile_id FROM doors WHERE tile_id IS NOT NULL`
    )).rows.map((r) => r.tile_id);
    let merged = 0;
    for (const tid of tiles) {
      const rows = (await db.query(
        `SELECT id, map_id, points, is_open, portal_kind, level_index, sprite_path, sprite_motion
           FROM doors WHERE tile_id=$1`, [tid]
      )).rows;
      if (rows.length < 2) continue;
      const groups = new Map();
      for (const d of rows) {
        const key = `${d.map_id}|${d.level_index || 0}|${d.portal_kind || 'door'}|${!!d.is_open}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(d);
      }
      for (const [key, list] of groups) {
        const segs = list.map((d) => (d.points || []).map(Number)).filter((p) => p.length >= 4);
        // Tolerance in PIXELS here, not grid squares — these rows are in map
        // coordinates, where a square is grid_size across.
        const out = mergeSegments(segs, 1.5);
        if (out.length >= segs.length) continue;
        const [mapId, li, kind, open] = key.split('|');
        // Carry the texture across the merge. These rows are deleted and
        // re-inserted, so without this a GM who had textured a doorway would
        // find it plain again after a restart — the merge would look like it
        // had quietly undone their work.
        const kept = list.find((d) => d.sprite_path) || list[0] || {};
        await db.query('DELETE FROM doors WHERE id = ANY($1::uuid[])', [list.map((d) => d.id)]);
        for (const pts of out) {
          await db.query(
            `INSERT INTO doors (id, map_id, style, points, is_open, portal_kind, level_index, tile_id,
                                sprite_path, sprite_motion)
             VALUES (gen_random_uuid(), $1, 'standard', $2, $3, $4, $5, $6, $7, $8)`,
            [Number(mapId), JSON.stringify(pts), open === 'true', kind, Number(li), tid,
             kept.sprite_path || null, kept.sprite_motion || 'swing']
          );
        }
        merged += segs.length - out.length;
      }
    }
    if (merged) console.log(`Merged ${merged} duplicate door${merged === 1 ? '' : 's'} on existing boards.`);
  })

  // Tokens a tile spawned before the session id was being written. They are
  // on the right map and simply invisible to the loader; the map knows which
  // session it belongs to, so the link can be rebuilt exactly.
  .then(() => db.query(`
    UPDATE session_tokens st SET session_id = m.session_id
      FROM maps m
     WHERE st.map_id = m.id
       AND st.session_id IS NULL
       AND st.tile_id IS NOT NULL
       AND m.session_id IS NOT NULL
  `))
  .then(() => db.query(`
    UPDATE map_tiles SET has_geometry = true
     WHERE has_geometry = false
       AND (id IN (SELECT DISTINCT tile_id FROM walls WHERE tile_id IS NOT NULL)
         OR id IN (SELECT DISTINCT tile_id FROM doors WHERE tile_id IS NOT NULL))
  `))
  .then(() => backfillTileEdgeWalls())
  .then(() => repairGrownTileGrounds())
  .catch(err => console.error('tile map migration error:', err));

// Ground images left behind by a board that outgrew them.
//
// A tile map's ground is generated at creation and, until the fix in
// mapGrow.js, was never repainted when the board grew. The flat map measures
// the board by that image — `imgDims?.w || mapWidth` in MapStage — so every
// grown tile map has been telling its clients the wrong extent, and a party
// standing outside the ORIGINAL rectangle got a visibility polygon clipped to
// nothing: no hole in the fog, and a black screen where the dungeon should be.
//
// Growing happens on placement, so nothing re-runs on its own; the boards
// already on the table are repainted here.
async function repairGrownTileGrounds() {
  const { redrawGroundImage } = require('./mapGrow');
  const fs = require('fs');
  const path = require('path');
  // Same resolution mapGrow uses — see the note on uploadsDir there.
  let uploadsRoot;
  try { uploadsRoot = require('./paths').UPLOADS_DIR; }
  catch { uploadsRoot = path.join(__dirname, '../uploads'); }
  const maps = (await db.query(
    "SELECT id, image_path, width, height FROM maps WHERE map_type='tiles'"
  )).rows;
  let fixed = 0;
  for (const m of maps) {
    const rel = m.image_path;
    if (!rel || !/\.svg$/i.test(rel)) continue;
    const file = path.join(uploadsRoot, rel);
    if (!fs.existsSync(file)) continue;
    // Only when the picture and the row actually disagree — this runs on every
    // boot and there is no reason to rewrite a file that is already right.
    const head = fs.readFileSync(file, 'utf8').slice(0, 400);
    const w = Number((/\bwidth="([\d.]+)"/.exec(head) || [])[1]);
    const h = Number((/\bheight="([\d.]+)"/.exec(head) || [])[1]);
    if (w === Number(m.width) && h === Number(m.height)) continue;
    await redrawGroundImage(m.id, Number(m.width), Number(m.height));
    console.log(`[tiles] map ${m.id}: ground image was ${w}x${h}, board is ${m.width}x${m.height} — repainted`);
    fixed++;
  }
  if (fixed) console.log(`[tiles] repainted ${fixed} stale tile-map ground image(s)`);
}

// Walls for tiles that were laid before a closed edge meant anything.
//
// A tile built in the panel used to put nothing on the board but its picture:
// the 3D view drew a box along each closed edge, and sight went straight
// through it. Placement now writes a real wall instead (see the tiles_place
// handler), but a dungeon already on the table would keep its old behaviour
// until every tile in it was lifted and laid again — so the boards are brought
// up to date here instead.
//
// Anything already carrying walls or doors is left alone: that is either an
// imported tile or one this pass has already done, and the flag says which.
async function backfillTileEdgeWalls() {
  const seg = require('./tileSegments');
  const rows = (await db.query(`
    SELECT t.id, t.map_id, t.grid_col, t.grid_row, t.grid_w, t.grid_h,
           t.edge_n, t.edge_e, t.edge_s, t.edge_w, t.wall_height_ft,
           COALESCE(m.grid_size, 50) AS grid_size
      FROM map_tiles t JOIN maps m ON m.id = t.map_id
     WHERE t.has_geometry = false
     ORDER BY t.map_id, t.id
  `)).rows;
  if (!rows.length) return;

  // Walls already standing, per map — the neighbour test, and what stops two
  // tiles sharing a join from each writing the wall between them.
  const byMap = new Map();
  const wallsFor = async (mapId) => {
    if (!byMap.has(mapId)) {
      byMap.set(mapId, (await db.query('SELECT points FROM walls WHERE map_id=$1', [mapId]))
        .rows.map((r) => (r.points || []).map(Number)));
    }
    return byMap.get(mapId);
  };

  let walls = 0, tiles = 0;
  for (const t of rows) {
    const gridSize = Number(t.grid_size) || 50;
    const cands = seg.edgeWallSegments(t, gridSize);
    const known = await wallsFor(t.map_id);
    const wallH = Number(t.wall_height_ft) > 0 ? Number(t.wall_height_ft) : 10;
    for (const cand of cands) {
      if (known.some((pts) => pts.length >= 4 && seg.coincides(cand, pts, gridSize * 0.3))) continue;
      await db.query(
        `INSERT INTO walls (id, map_id, type, points, tile_id, height_ft)
         VALUES (gen_random_uuid(), $1, 'line', $2, $3, $4)`,
        [t.map_id, JSON.stringify(cand), t.id, wallH]
      );
      known.push(cand);
      walls++;
    }
    await db.query('UPDATE map_tiles SET has_geometry=true WHERE id=$1', [t.id]);
    tiles++;
  }
  console.log(`[tiles] backfilled ${walls} edge wall(s) across ${tiles} laid tile(s)`);
}

// Earlier versions stored 2000/1500 placeholder dimensions when
// `image-size` couldn't read the file (the package's API moved from
// `imageSizeFromFile` to `imageSize`). The frontend renders terrain
// using the loaded image's true natural dimensions, the backend
// computes wall offsets using these stored values — a mismatch puts
// the walls 10–30 px off the terrain. This pass re-derives the real
// dimensions for any map that still has the placeholder.
// One-shot startup pass that regenerates every terrain piece's walls
// using the freshly-backfilled map dimensions. Walls created before the
// dimension fix were positioned with the placeholder 2000×1500 offset
// — running this rewrites them at the correct offset matching what the
// frontend renders. No broadcast needed: there are no connected
// clients yet at this point in startup.
async function regenAllTerrainWallsOnce() {
  try {
    const rows = await db.query(
      `SELECT mt.*, tl.custom_walls
         FROM map_terrain mt
         LEFT JOIN terrain_library tl ON mt.library_id = tl.id`
    );
    let regen = 0;
    for (const t of rows.rows) {
      await regenTerrainWallsStandalone(t);
      regen++;
    }
    if (rows.rows.length) {
      console.log(`Regenerated terrain walls for ${regen} placed piece${regen === 1 ? '' : 's'}.`);
    }
  } catch (err) {
    console.error('regenAllTerrainWallsOnce error:', err);
  }
}

// Terrain visibility now lives in its own module, shared with the per-map REST
// slice in routes/maps.js — see terrainVisibility.js for the two rules.

async function regenTerrainWallsStandalone(t) {
  if (!t || t.map_id == null) return;
  await db.query('DELETE FROM walls WHERE terrain_id=$1', [t.id]);
  const hidden = isTerrainHidden(t);
  const hasCustom = Array.isArray(t.custom_walls) && t.custom_walls.length;
  if (hidden || !hasCustom) return;
  const mapRes = await db.query(
    `SELECT m.width, m.height, COALESCE(m.grid_size, s.grid_size, 50) AS grid_size
       FROM maps m
       LEFT JOIN sessions s ON m.session_id = s.id
      WHERE m.id=$1`,
    [t.map_id]
  );
  if (!mapRes.rows.length) return;
  const m = mapRes.rows[0];
  const gs = Number(m.grid_size) || 50;
  const offsetX = gs > 0 ? (Number(m.width || 0)  % gs) / 2 : 0;
  const offsetY = gs > 0 ? (Number(m.height || 0) % gs) / 2 : 0;
  const px = offsetX + Number(t.grid_col) * gs;
  const py = offsetY + Number(t.grid_row) * gs;
  const pw = Number(t.width)  * gs;
  const ph = Number(t.height) * gs;
  const cx = px + pw / 2;
  const cy = py + ph / 2;
  const rad = (Number(t.rotation) || 0) * Math.PI / 180;
  const cosA = Math.cos(rad), sinA = Math.sin(rad);
  const { v4: uuidv4 } = require('uuid');
  for (const poly of t.custom_walls) {
    if (!Array.isArray(poly) || poly.length < 2) continue;
    const flat = [];
    for (const p of poly) {
      const lx = Number(p.col) * pw - pw / 2;
      const ly = Number(p.row) * ph - ph / 2;
      flat.push(cx + lx * cosA - ly * sinA, cy + lx * sinA + ly * cosA);
    }
    await db.query(
      `INSERT INTO walls (id, map_id, terrain_id, type, points)
       VALUES ($1,$2,$3,$4,$5)`,
      [uuidv4(), t.map_id, t.id, poly.length >= 3 ? 'polygon' : 'line', JSON.stringify(flat)]
    );
  }
}

// Project a placed ship's ACTIVE deck into real walls and doors.
//
// Same approach as regenTerrainWallsStandalone above, and for the same reason:
// line of sight, door opening and movement blocking all work off the `walls`
// and `doors` tables, so deck geometry has to exist there or it may as well not
// exist at all. `hull_walls` was being stored by the ship API and read by
// nothing.
//
// Only the deck the table is looking at is projected. A hull's lower decks are
// underneath the one on screen — their bulkheads must not block sight on the
// deck above — so switching level tears these down and rebuilds them.
//
// Deck geometry is stored in deck-local SQUARES, which is what makes it survive
// being placed on maps of different grid sizes: one square is one square
// wherever the ship is dropped.
async function regenerateShipWalls(shipId) {
  const { v4: uuidv4 } = require('uuid');
  // Report what changed so the table can be patched in place. Clients hold
  // walls and doors in local state; without this a hull's bulkheads would only
  // appear after a reload.
  const out = { added: [], deletedIds: [], doorsAdded: [], doorsDeletedIds: [] };
  const oldWalls = await db.query('SELECT id FROM walls WHERE ship_id=$1', [shipId]);
  const oldDoors = await db.query('SELECT id FROM doors WHERE ship_id=$1', [shipId]);
  out.deletedIds = oldWalls.rows.map(r => r.id);
  out.doorsDeletedIds = oldDoors.rows.map(r => r.id);
  await db.query('DELETE FROM walls WHERE ship_id=$1', [shipId]);
  await db.query('DELETE FROM doors WHERE ship_id=$1', [shipId]);

  const shipRes = await db.query(
    `SELECT ms.*, m.width AS map_width, m.height AS map_height,
            COALESCE(m.grid_size, s.grid_size, 50) AS grid_size
       FROM map_ships ms
       JOIN maps m ON m.id = ms.map_id
       LEFT JOIN sessions s ON m.session_id = s.id
      WHERE ms.id=$1`,
    [shipId]
  );
  if (!shipRes.rows.length) return out;
  const ship = shipRes.rows[0];
  if (ship.map_id == null) return out;

  const decksRes = await db.query(
    'SELECT * FROM ship_decks WHERE ship_id=$1 ORDER BY deck_index',
    [ship.library_id]
  );
  const decks = decksRes.rows;
  if (!decks.length) return out;

  const standable = decks.filter(d => !d.is_sails);
  const deck = standable.find(d => d.deck_index === (ship.active_deck ?? 0)) || standable[0];
  if (!deck) return out;

  // Nothing is projected today — see the note at the end of this function.
  // The deck lookup above stays because it is what decides WHICH level's
  // geometry would be placed, and getting that wrong is the subtle bug.
  return out;

  // Deck-local square -> map pixel, through the hull's shared pivot. Must agree
  // with utils/ships.js and its backend twin, or the walls sit somewhere the
  // deck art isn't.
  const gs = Number(ship.grid_size) || 50;
  const ox = gs > 0 ? (Number(ship.map_width || 0) % gs) / 2 : 0;
  const oy = gs > 0 ? (Number(ship.map_height || 0) % gs) / 2 : 0;
  const ref = shipMath.referenceDeck(decks) || deck;
  const pivX = ox + (Number(ship.grid_col) + Number(ref.offset_col || 0)) * gs + (Number(ref.grid_cols) * gs) / 2;
  const pivY = oy + (Number(ship.grid_row) + Number(ref.offset_row || 0)) * gs + (Number(ref.grid_rows) * gs) / 2;
  const tlx = ox + (Number(ship.grid_col) + Number(deck.offset_col || 0)) * gs;
  const tly = oy + (Number(ship.grid_row) + Number(deck.offset_row || 0)) * gs;
  const rad = ((Number(ship.rotation) || 0) * Math.PI) / 180;
  const cosA = Math.cos(rad), sinA = Math.sin(rad);

  const toMap = (col, row) => {
    const lx = tlx + Number(col) * gs - pivX;
    const ly = tly + Number(row) * gs - pivY;
    return [pivX + lx * cosA - ly * sinA, pivY + lx * sinA + ly * cosA];
  };

  // Walls are not projected.
  //
  // They were, and it was the wrong trade: a hull's line-of-sight geometry runs
  // to hundreds of segments, every ship move rewrote all of it, and a wall
  // change invalidates line of sight board-wide — so moving one ship forced
  // every other ship to rebuild. The DELETE above stays, so any walls a hull
  // projected before this are cleared the next time it moves.
  //
  // hull_walls is still stored and still transformed by toMap when something
  // wants it; nothing does today.

  // Doors are not projected either.
  //
  // Same reasoning as the walls above: a hull's doors are drawn into the deck
  // art, so placing real door rows added nothing visible, and every ship move
  // rewrote them — which invalidates line of sight board-wide and made every
  // other ship on the map rebuild.
  //
  // What remains of this function is the CLEANUP: the deletes at the top clear
  // anything a hull projected before this, the first time it moves. It is kept
  // wired into place/move/rotate/deck-change so that stays true, and so there
  // is one place to restore projection if it is ever wanted.
  return out;
}

// Push a ship's regenerated geometry to the table. Walls and doors are held in
// client state, so each change has to be announced individually.
function broadcastShipGeometry(sessionCode, changes) {
  if (!sessionCode || !changes) return;
  for (const id of changes.deletedIds) io.to(sessionCode).emit('wall_deleted', { wallId: id });
  for (const w of changes.added) io.to(sessionCode).emit('wall_added', { wall: w });
  for (const id of changes.doorsDeletedIds) io.to(sessionCode).emit('door_deleted', { doorId: id });
  for (const d of changes.doorsAdded) io.to(sessionCode).emit('door_added', { door: d });
}

async function backfillMapDimensions() {
  try {
    const rows = await db.query('SELECT id, image_path FROM maps WHERE width=2000 AND height=1500');
    for (const m of rows.rows) {
      const filePath = path.join(__dirname, '../uploads', m.image_path);
      if (!fs.existsSync(filePath)) continue;
      try {
        const buf = fs.readFileSync(filePath);
        const dims = imageSize(buf);
        if (dims && dims.width && dims.height) {
          await db.query(
            'UPDATE maps SET width=$1, height=$2 WHERE id=$3',
            [dims.width, dims.height, m.id]
          );
          console.log(`Backfilled map ${m.id} dimensions: ${dims.width}x${dims.height}`);
        }
      } catch (err) {
        console.warn(`Backfill failed for map ${m.id}:`, err.message);
      }
    }
  } catch (err) {
    console.error('backfillMapDimensions error:', err);
  }
}

const TERRAIN_UPLOADS_DIR = path.join(__dirname, '../uploads/terrain');
// Earlier v1.6.0 builds auto-seeded three default terrain pieces (rock
// wall / rubble / tree). The art wasn't ready for shipping, so the
// scenery library is empty out of the box — the GM uploads pieces
// themselves. This pass cleans up any rows + on-disk images left
// behind by the previous seed so existing installs match new ones.
//
// Scoped to `is_marker = false` so it only takes that old scenery seed. The
// shipped system markers below are also is_default, and without this scope the
// two passes would fight: seed on boot, purge on the next one, forever.
async function removeSeededTerrainDefaults() {
  try {
    // Space rocks are exempt.
    //
    // This purge clears an OLD set of seeded scenery, and its test is "default
    // and not a marker" — which is precisely what an asteroid is, since markers
    // are circle-cropped and a rock must not be. So every boot deleted the rocks
    // (and unlinked their art), the seeder put them straight back, and any
    // placed instance lost the library row it pointed at.
    // Clouds are exempt for the same reason, and it is the same bug: a cloud
    // bank is default scenery that must NOT be a marker (markers are
    // circle-cropped, and a cloud has no silhouette to crop), so it matches
    // this purge exactly. Without the exemption every boot deleted it, the
    // seeder put it back, and any placed cloud lost the library row it pointed
    // at — taking its 3D shape with it.
    // Every shipped scenery set has to be listed here.
    //
    // This is the third time the same bug has been fixed by adding a prefix —
    // asteroids, then clouds, then hazards — and the shape of it never changes:
    // a new set is seeded as default non-marker scenery, this purge matches it
    // exactly, and from then on every boot deletes the rows, unlinks the art and
    // lets the seeder put them back under NEW ids. Any placed piece is left with
    // library_id NULL (ON DELETE SET NULL), which on the board means art and 3D
    // shape simply gone.
    //
    // A list rather than three more AND clauses, so the next set is one entry
    // and not another archaeology session.
    const SHIPPED_PREFIXES = [
      'terrain/asteroid-',
      'terrain/cloud-',
      'terrain/hazard-',
      'terrain/feature-',   // crystal vine, tentacles, broken glass — see seedTerrainFeatures
    ];
    const KEEP = SHIPPED_PREFIXES
      .map((p) => `image_path NOT LIKE '${p}%'`)
      .join(' AND ');
    const r = await db.query(`SELECT id, image_path FROM terrain_library WHERE is_default = true AND is_marker = false AND ${KEEP}`);
    for (const row of r.rows) {
      // Best-effort delete of the image file; the row goes regardless.
      if (row.image_path) {
        const p = path.join(__dirname, '../uploads', row.image_path);
        fs.unlink(p, () => {});
      }
    }
    if (r.rows.length) {
      await db.query(`DELETE FROM terrain_library WHERE is_default = true AND is_marker = false AND ${KEEP}`);
      console.log(`Removed ${r.rows.length} previously-seeded default terrain piece${r.rows.length === 1 ? '' : 's'}.`);
    }
  } catch (err) {
    console.error('terrain default cleanup error:', err);
  }
}

// ─── Shipped system markers ──────────────────────────────────────────────────
//
// A starter set of wildspace/overland map markers: a system seen from far
// enough away that it's a star, a few orbits and some planets. Drawn as SVG
// rather than shipped as raster art because a marker renders inside a disc
// that the GM scales freely — vector stays crisp from a 40px speck at
// fit-to-map zoom up to filling several hexes, at a few KB each.
const SYSTEM_MARKER_DIR = path.join(__dirname, '../assets/system-markers');
const SYSTEM_MARKERS = [
  { file: 'star-system.svg',         name: 'Star System' },
  { file: 'binary-system.svg',       name: 'Binary System' },
  { file: 'red-giant-system.svg',    name: 'Red Giant System' },
  { file: 'ringed-giant-system.svg', name: 'Ringed Giant System' },
  { file: 'asteroid-system.svg',     name: 'Asteroid System' },
  { file: 'nebula-system.svg',       name: 'Nebula-Shrouded System' },
];

// ─── Shipped planet markers ──────────────────────────────────────────────────
//
// The worlds that go ON a generated system map (see systemMap.js). Same
// reasoning as the system markers above — SVG so they stay sharp at any
// scale — but drawn to a different constraint: a marker is rendered inside a
// disc, so each planet is a full-bleed sphere that touches all four edges of
// its square. Nothing is drawn outside that circle, because anything there
// (rings, moons) would simply be clipped away.
//
// Several types ship twice with different seeds, so a system can hold two
// desert worlds that aren't the same picture.
const PLANET_MARKER_DIR = path.join(__dirname, '../assets/planet-markers');
const PLANET_MARKERS = [
  { file: 'terran-world.svg',    name: 'Terran World' },
  { file: 'cradle-world.svg',    name: 'Cradle World' },
  { file: 'ocean-world.svg',     name: 'Ocean World' },
  { file: 'verdant-world.svg',   name: 'Verdant World' },
  { file: 'desert-world.svg',    name: 'Desert World' },
  { file: 'dune-world.svg',      name: 'Dune World' },
  { file: 'ice-world.svg',       name: 'Ice World' },
  { file: 'barren-moon.svg',     name: 'Barren Moon' },
  { file: 'cratered-moon.svg',   name: 'Cratered Moon' },
  { file: 'volcanic-world.svg',  name: 'Volcanic World' },
  { file: 'toxic-world.svg',     name: 'Toxic World' },
  { file: 'gas-giant.svg',       name: 'Gas Giant' },
  { file: 'banded-giant.svg',    name: 'Banded Giant' },
  { file: 'ice-giant.svg',       name: 'Ice Giant' },
];

// ─── Shipped asteroids and space rocks ───────────────────────────────────────
//
// Scenery to scatter round a wildspace board. Seeded as is_marker = FALSE,
// unlike the planets above, and that is deliberate: MapStage draws a marker
// circle-cropped inside its box, which is right for a world and wrong for a
// rock. As scenery the art keeps its own irregular silhouette.
//
// Sizes are the default footprint in squares; a GM resizes from there.
const ASTEROID_MARKER_DIR = path.join(__dirname, '../assets/asteroid-markers');
const ASTEROID_MARKERS = [
  { file: 'asteroid.svg',        name: 'Asteroid',        w: 2, h: 2 },
  { file: 'asteroid-large.svg',  name: 'Large Asteroid',  w: 4, h: 4 },
  { file: 'boulder.svg',         name: 'Space Boulder',   w: 1, h: 1 },
  { file: 'iron-chunk.svg',      name: 'Iron Chunk',      w: 2, h: 2 },
  { file: 'ice-shard.svg',       name: 'Ice Shard',       w: 3, h: 3 },
  { file: 'carbon-rock.svg',     name: 'Carbon Rock',     w: 2, h: 2 },
  { file: 'crystal-shard.svg',   name: 'Crystal Shard',   w: 3, h: 3 },
  { file: 'rubble-cluster.svg',  name: 'Rubble Cluster',  w: 4, h: 4 },
];

// Has a shipped asset changed since it was copied into uploads/?
//
// Compares CONTENT, not size. Size alone silently skips a redraw that happens
// to land on the same byte count — which it did: two redrawn ship markers were
// the same length as the versions they replaced, so the old art kept being
// served while the source file said otherwise. These are a few KB each, so
// reading both is cheaper than the class of bug it avoids.
function assetDiffers(src, dest) {
  try {
    if (!fs.existsSync(dest)) return true;
    return !fs.readFileSync(src).equals(fs.readFileSync(dest));
  } catch {
    return true;
  }
}

// ─── Map state snapshots ─────────────────────────────────────────────────────
// "Save the board" at the end of a session: where every token stood, its HP,
// conditions and combat state. Restoring puts them back, so a map poked at
// between sessions can be returned to exactly how the party left it.
//
// One snapshot per (session, map) name, so re-saving overwrites rather than
// growing a pile the GM has to curate.
db.query(`
  CREATE TABLE IF NOT EXISTS map_snapshots (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
    map_id INTEGER REFERENCES maps(id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL DEFAULT 'End of session',
    tokens JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMP DEFAULT NOW()
  )
`)
  .then(() => db.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_map_snapshot_unique ON map_snapshots(session_id, map_id, name)`))
  .catch(err => console.error('map_snapshots migration error:', err));

// ─── Rollable tables ─────────────────────────────────────────────────────────
// Weighted rows rather than dice ranges: adding a row to a weighted table
// doesn't force a renumber of everything under it.
db.query(`
  CREATE TABLE IF NOT EXISTS rollable_tables (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT DEFAULT '',
    created_at TIMESTAMP DEFAULT NOW()
  )
`)
  .then(() => db.query(`
    CREATE TABLE IF NOT EXISTS rollable_table_rows (
      id SERIAL PRIMARY KEY,
      table_id INTEGER REFERENCES rollable_tables(id) ON DELETE CASCADE,
      text TEXT NOT NULL,
      weight INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0
    )
  `))
  .then(() => db.query(`CREATE INDEX IF NOT EXISTS idx_table_rows ON rollable_table_rows(table_id)`))
  .catch(err => console.error('rollable table migration error:', err));

// ─── Shipped space-feature markers ───────────────────────────────────────────
//
// Everything in a system that isn't a star or a world: rocks, wrecks, stations
// and ships. Same disc-of-void framing as the system markers (a marker is
// circle-cropped and given a framing ring), which is why these keep their
// starfield background while the planets don't — a planet IS the disc, a ship
// sits in one.
const SPACE_FEATURE_DIR = path.join(__dirname, '../assets/space-features');
const SPACE_FEATURES = [
  { file: 'asteroid-field.svg',   name: 'Asteroid Field' },
  { file: 'asteroid-field-2.svg', name: 'Boulder Field' },
  { file: 'dense-belt.svg',       name: 'Dense Asteroid Belt' },
  { file: 'debris-field.svg',     name: 'Debris Field' },
  { file: 'derelict-hulk.svg',    name: 'Derelict Hammership' },
  { file: 'derelict-hulk-2.svg',  name: 'Derelict Trader' },
  { file: 'space-station.svg',    name: 'Space Station' },
  { file: 'shipyard.svg',         name: 'Shipyard Dock' },
  { file: 'ship.svg',             name: 'Tradesman' },
  { file: 'warship.svg',          name: 'Warship' },
  { file: 'hammership.svg',       name: 'Hammership' },
  { file: 'squid-ship.svg',       name: 'Squid Ship' },
  { file: 'nautiloid.svg',        name: 'Nautiloid' },
  { file: 'fleet.svg',            name: 'Fleet' },
  { file: 'comet.svg',            name: 'Comet' },
  { file: 'gate.svg',             name: 'Wildspace Gate' },
];

// Three markers were seeded under names that no longer describe their art
// (the ships were redrawn as spelljammers and the variants re-specced). The
// seeder never touches an existing row's name — a GM renaming "Gas Giant" to
// "Bral" must stick — so these are corrected once, and ONLY while the row
// still carries the old default name.
const SPACE_FEATURE_RENAMES = [
  ['terrain/space-asteroid-field-2.svg', 'Asteroid Field II', 'Boulder Field'],
  ['terrain/space-derelict-hulk-2.svg',  'Derelict Hulk II',  'Derelict Trader'],
  ['terrain/space-derelict-hulk.svg',    'Derelict Hulk',     'Derelict Hammership'],
  ['terrain/space-ship.svg',             'Ship',              'Tradesman'],
];

async function seedSpaceFeatureMarkers() {
  try {
    if (!fs.existsSync(SPACE_FEATURE_DIR)) return;
    fs.mkdirSync(TERRAIN_UPLOADS_DIR, { recursive: true });
    let added = 0;
    for (const m of SPACE_FEATURES) {
      const src = path.join(SPACE_FEATURE_DIR, m.file);
      if (!fs.existsSync(src)) continue;
      const rel = `terrain/space-${m.file}`;
      const dest = path.join(TERRAIN_UPLOADS_DIR, `space-${m.file}`);
      if (assetDiffers(src, dest)) fs.copyFileSync(src, dest);
      const existing = await db.query(
        'SELECT id FROM terrain_library WHERE is_default = true AND image_path = $1',
        [rel]
      );
      if (existing.rows.length) continue;
      await db.query(
        `INSERT INTO terrain_library
           (name, image_path, default_w, default_h, is_marker, is_default)
         VALUES ($1, $2, 2, 2, true, true)`,
        [m.name, rel]
      );
      added++;
    }
    if (added) console.log(`Seeded ${added} default space-feature marker${added === 1 ? '' : 's'}.`);

    let renamed = 0;
    for (const [rel, oldName, newName] of SPACE_FEATURE_RENAMES) {
      const r = await db.query(
        'UPDATE terrain_library SET name = $1 WHERE is_default = true AND image_path = $2 AND name = $3',
        [newName, rel, oldName]
      );
      renamed += r.rowCount || 0;
    }
    if (renamed) console.log(`Renamed ${renamed} space-feature marker${renamed === 1 ? '' : 's'} to match redrawn art.`);
  } catch (err) {
    console.error('space feature seed error:', err);
  }
}

async function seedPlanetMarkers() {
  try {
    if (!fs.existsSync(PLANET_MARKER_DIR)) return;
    fs.mkdirSync(TERRAIN_UPLOADS_DIR, { recursive: true });
    let added = 0;
    for (const m of PLANET_MARKERS) {
      const src = path.join(PLANET_MARKER_DIR, m.file);
      if (!fs.existsSync(src)) continue;
      const rel = `terrain/planet-${m.file}`;
      const dest = path.join(TERRAIN_UPLOADS_DIR, `planet-${m.file}`);
      if (assetDiffers(src, dest)) fs.copyFileSync(src, dest);
      // Keyed on image_path, same as the system markers: renaming "Gas Giant"
      // to "Bral" must not make the next boot add a second copy.
      const existing = await db.query(
        'SELECT id FROM terrain_library WHERE is_default = true AND image_path = $1',
        [rel]
      );
      if (existing.rows.length) continue;
      await db.query(
        `INSERT INTO terrain_library
           (name, image_path, default_w, default_h, is_marker, is_default, three_d_shape)
         VALUES ($1, $2, 2, 2, true, true, 'sphere')`,
        [m.name, rel]
      );
      added++;
    }
    if (added) console.log(`Seeded ${added} default planet marker${added === 1 ? '' : 's'}.`);
  } catch (err) {
    console.error('planet marker seed error:', err);
  }
}

async function seedAsteroidMarkers() {
  try {
    if (!fs.existsSync(ASTEROID_MARKER_DIR)) return;
    fs.mkdirSync(TERRAIN_UPLOADS_DIR, { recursive: true });
    let added = 0;
    for (const m of ASTEROID_MARKERS) {
      const src = path.join(ASTEROID_MARKER_DIR, m.file);
      if (!fs.existsSync(src)) continue;
      const rel = `terrain/asteroid-${m.file}`;
      const dest = path.join(TERRAIN_UPLOADS_DIR, `asteroid-${m.file}`);
      if (assetDiffers(src, dest)) fs.copyFileSync(src, dest);
      // Keyed on image_path, same as the other shipped sets: renaming a rock
      // must not make the next boot add a second copy of it.
      const existing = await db.query(
        'SELECT id FROM terrain_library WHERE is_default = true AND image_path = $1',
        [rel]
      );
      if (existing.rows.length) continue;
      await db.query(
        `INSERT INTO terrain_library
           (name, image_path, default_w, default_h, is_marker, is_default, three_d_shape)
         VALUES ($1, $2, $3, $4, false, true, 'rock')`,
        [m.name, rel, m.w, m.h]
      );
      added++;
    }
    if (added) console.log(`Seeded ${added} default space rock${added === 1 ? '' : 's'}.`);
  } catch (err) {
    console.error('asteroid marker seed error:', err);
  }
}

// ─── Shipped cloud banks ─────────────────────────────────────────────────────
//
// Obscuring clouds are the one 3D shape with nothing to draw on the flat map:
// the 3D view builds its own billboard bank and never looks at the artwork, so
// a GM wanting a cloud had to go find a picture of one purely to satisfy the
// upload form, then flip the shape in Edit afterwards. Shipping the piece makes
// it one click from the Terrain tab.
//
// Scenery, not a marker: markers are cropped to a disc and draw a name, and a
// cloud bank is a soft edgeless mass that must stay the shape it was drawn.
const CLOUD_MARKER_DIR = path.join(__dirname, '../assets/cloud-markers');
// Each entry's w/h matches its art's viewBox aspect — a bank stretched into a
// square comes out as a ball of smoke — and its `form` is the volume the 3D
// view builds. The two are drawn to agree: the overhead art of a wall is a long
// band, of a ring an annulus, and so on.
const CLOUD_MARKERS = [
  { file: 'cloud-bank.svg',   name: 'Cloud Bank',   w: 6, h: 4, form: 'bank'   },
  { file: 'fog-bank.svg',     name: 'Fog Bank',     w: 8, h: 6, form: 'ground' },
  { file: 'storm-column.svg', name: 'Storm Column', w: 3, h: 3, form: 'column' },
  { file: 'wisps.svg',        name: 'Wisps',        w: 5, h: 3, form: 'wisps'  },
  { file: 'smoke-ring.svg',   name: 'Smoke Ring',   w: 4, h: 4, form: 'ring'   },
  { file: 'fog-wall.svg',     name: 'Fog Wall',     w: 8, h: 2, form: 'wall'   },
];

async function seedCloudMarkers() {
  try {
    if (!fs.existsSync(CLOUD_MARKER_DIR)) return;
    fs.mkdirSync(TERRAIN_UPLOADS_DIR, { recursive: true });
    let added = 0;
    for (const m of CLOUD_MARKERS) {
      const src = path.join(CLOUD_MARKER_DIR, m.file);
      if (!fs.existsSync(src)) continue;
      const rel = `terrain/cloud-${m.file}`;
      const dest = path.join(TERRAIN_UPLOADS_DIR, `cloud-${m.file}`);
      if (assetDiffers(src, dest)) fs.copyFileSync(src, dest);
      // Keyed on image_path, same as every other shipped set: a GM renaming
      // "Cloud Bank" to "The Murk" must not make the next boot add a second.
      const existing = await db.query(
        'SELECT id FROM terrain_library WHERE is_default = true AND image_path = $1',
        [rel]
      );
      if (existing.rows.length) continue;
      await db.query(
        `INSERT INTO terrain_library
           (name, image_path, default_w, default_h, is_marker, is_default, three_d_shape, cloud_form)
         VALUES ($1, $2, $3, $4, false, true, 'cloud', $5)`,
        [m.name, rel, m.w, m.h, m.form]
      );
      added++;
    }
    if (added) console.log(`Seeded ${added} default cloud bank${added === 1 ? '' : 's'}.`);
  } catch (err) {
    console.error('cloud marker seed error:', err);
  }
}

// ─── Shipped hazards ─────────────────────────────────────────────────────────
//
// Wildspace dangers whose whole character is MOTION — an accretion disc
// turning, arcs crackling, rocks tumbling past. Drawn still they are a coloured
// smudge, so the 3D view builds each one procedurally (see HAZARD_BUILDERS in
// Map3DView) and the art here is only what the flat board shows from overhead.
//
// Scenery rather than markers: a hazard is a region you fly INTO, and markers
// are cropped to a disc and draw a name.
const HAZARD_MARKER_DIR = path.join(__dirname, '../assets/hazard-markers');
const HAZARD_MARKERS = [
  { file: 'black-hole.svg',   name: 'Black Hole',   w: 6, h: 6, shape: 'blackhole' },
  { file: 'wormhole.svg',     name: 'Wormhole',     w: 5, h: 5, shape: 'wormhole'  },
  { file: 'ion-storm.svg',    name: 'Ion Storm',    w: 7, h: 7, shape: 'ionstorm'  },
  { file: 'debris-field.svg', name: 'Debris Field', w: 8, h: 8, shape: 'debris'    },
];

async function seedHazardMarkers() {
  try {
    if (!fs.existsSync(HAZARD_MARKER_DIR)) return;
    fs.mkdirSync(TERRAIN_UPLOADS_DIR, { recursive: true });
    let added = 0;
    for (const m of HAZARD_MARKERS) {
      const src = path.join(HAZARD_MARKER_DIR, m.file);
      if (!fs.existsSync(src)) continue;
      const rel = `terrain/hazard-${m.file}`;
      const dest = path.join(TERRAIN_UPLOADS_DIR, `hazard-${m.file}`);
      if (assetDiffers(src, dest)) fs.copyFileSync(src, dest);
      // Keyed on image_path like every other shipped set, so renaming one does
      // not make the next boot add a second copy.
      const existing = await db.query(
        'SELECT id FROM terrain_library WHERE is_default = true AND image_path = $1',
        [rel]
      );
      if (existing.rows.length) continue;
      await db.query(
        `INSERT INTO terrain_library
           (name, image_path, default_w, default_h, is_marker, is_default, three_d_shape)
         VALUES ($1, $2, $3, $4, false, true, $5)`,
        [m.name, rel, m.w, m.h, m.shape]
      );
      added++;
    }
    if (added) console.log(`Seeded ${added} default hazard${added === 1 ? '' : 's'}.`);
  } catch (err) {
    console.error('hazard seed error:', err);
  }
}

// ─── Shipped terrain features ────────────────────────────────────────────────
//
// Scenery for ordinary ground maps, as opposed to the wildspace sets above.
// Each ships with overhead art for the flat board and a `three_d_shape` that
// the 3D view grows as real geometry (see PIECE_BUILDERS in Map3DView) — the
// same split the hazards use, and for the same reason: a thing whose character
// is its HEIGHT is a smudge when drawn from directly above, so the two views
// each get the version that suits them.
const TERRAIN_FEATURE_DIR = path.join(__dirname, '../assets/terrain-features');
const TERRAIN_FEATURES = [
  {
    file: 'tentacle-rearing.svg',
    name: 'Alien Tentacle — Rearing',
    w: 3, h: 3,
    shape: 'tentacle', form: 'rearing',
    blocksMovement: true,
  },
  {
    file: 'tentacle-coiled.svg',
    name: 'Alien Tentacle — Coiled',
    w: 3, h: 3,
    shape: 'tentacle', form: 'coiled',
    blocksMovement: true,
  },
  {
    file: 'tentacle-nest.svg',
    name: 'Alien Tentacle — Nest',
    w: 4, h: 4,
    shape: 'tentacle', form: 'nest',
    blocksMovement: true,
  },
  {
    file: 'crystal-vine.svg',
    name: 'Crystal Vine',
    w: 3, h: 3,
    shape: 'vine',
    // Big enough to matter on the board and to walk around: it is a plant the
    // size of a tree, and 3x3 is the footprint of its coil, not of its shards.
    blocksMovement: true,
  },
  // ── Aftermath ─────────────────────────────────────────────────────────────
  //
  // Three ways a fight leaves the floor, kept as separate pieces rather than
  // one because they say different things: someone bled out here, someone was
  // opened up here, someone was moved from here.
  //
  // All 'flat' and all passable — dressing that tells the players what
  // happened in a room, not something that stops them crossing it.
  {
    file: 'blood-pool.svg',
    name: 'Blood Pool',
    w: 3, h: 3,
    shape: 'flat',
    blocksMovement: false,
  },
  {
    file: 'blood-spatter.svg',
    name: 'Blood Spatter',
    w: 3, h: 3,
    shape: 'flat',
    blocksMovement: false,
  },
  {
    file: 'blood-trail.svg',
    name: 'Blood Trail',
    // Drawn corner to corner, so rotating the piece points the drag any way
    // the GM needs without it having to be a long thin footprint.
    w: 3, h: 3,
    shape: 'flat',
    blocksMovement: false,
  },
  {
    file: 'broken-glass.svg',
    name: 'Broken Glass',
    // 3x3 is the spread of the scatter itself — the art fills that footprint,
    // and anything smaller crops the outlying splinters that make it read as a
    // break rather than a pile. Resize like any other piece.
    w: 3, h: 3,
    // 'flat' rather than a builder: glass lies ON the floor, so the 3D view
    // drawing the same overhead art on the ground plane is not a compromise —
    // it is what the thing actually looks like from any angle worth having.
    shape: 'flat',
    // Difficult ground and a reason to keep your boots on, not a wall. Left
    // passable so it can be laid across a corridor without sealing it; the GM
    // can flip it in Edit for a piece meant to stop movement.
    blocksMovement: false,
  },
];

async function seedTerrainFeatures() {
  try {
    if (!fs.existsSync(TERRAIN_FEATURE_DIR)) return;
    fs.mkdirSync(TERRAIN_UPLOADS_DIR, { recursive: true });
    let added = 0;
    for (const m of TERRAIN_FEATURES) {
      const src = path.join(TERRAIN_FEATURE_DIR, m.file);
      if (!fs.existsSync(src)) continue;
      const rel = `terrain/feature-${m.file}`;
      const dest = path.join(TERRAIN_UPLOADS_DIR, `feature-${m.file}`);
      // Copied into uploads/ rather than served from assets/, and refreshed when
      // the shipped file changes — the same rule every other set follows, so
      // redrawing the art reaches installs that seeded it months ago.
      if (assetDiffers(src, dest)) fs.copyFileSync(src, dest);
      const existing = await db.query(
        'SELECT id FROM terrain_library WHERE is_default = true AND image_path = $1',
        [rel]
      );
      if (existing.rows.length) continue;
      await db.query(
        `INSERT INTO terrain_library
           (name, image_path, default_w, default_h, is_marker, is_default,
            three_d_shape, piece_form, blocks_movement)
         VALUES ($1, $2, $3, $4, false, true, $5, $6, $7)`,
        [m.name, rel, m.w, m.h, m.shape, m.form || '', !!m.blocksMovement]
      );
      added++;
    }
    if (added) console.log(`Seeded ${added} terrain feature${added === 1 ? '' : 's'}.`);
  } catch (err) {
    console.error('terrain feature seed error:', err);
  }
}

async function seedSystemMarkers() {
  try {
    if (!fs.existsSync(SYSTEM_MARKER_DIR)) return;
    fs.mkdirSync(TERRAIN_UPLOADS_DIR, { recursive: true });
    let added = 0;
    for (const m of SYSTEM_MARKERS) {
      const src = path.join(SYSTEM_MARKER_DIR, m.file);
      if (!fs.existsSync(src)) continue;
      const rel = `terrain/system-${m.file}`;
      const dest = path.join(TERRAIN_UPLOADS_DIR, `system-${m.file}`);
      // uploads/ is a volume that outlives the image, so the art is COPIED in
      // rather than served from assets/ — and refreshed when the shipped file
      // changes, so redrawing a marker reaches installs that already seeded.
      if (assetDiffers(src, dest)) fs.copyFileSync(src, dest);
      // Keyed on image_path, not name: the GM is free to rename "Star System"
      // to "Greyspace" without the next boot deciding it's missing and adding
      // a second copy.
      const existing = await db.query(
        'SELECT id FROM terrain_library WHERE is_default = true AND image_path = $1',
        [rel]
      );
      if (existing.rows.length) continue;
      await db.query(
        `INSERT INTO terrain_library
           (name, image_path, default_w, default_h, is_marker, is_default)
         VALUES ($1, $2, 2, 2, true, true)`,
        [m.name, rel]
      );
      added++;
    }
    if (added) console.log(`Seeded ${added} default system marker${added === 1 ? '' : 's'}.`);
  } catch (err) {
    console.error('system marker seed error:', err);
  }
}

// ─── GM-set per-player map overrides (Split the Party, native) ───────────────
// One row per (session, player_name). When set, that player's view is pinned
// to map_id regardless of which map the GM is currently viewing. Replaces
// the `assignment_*` KV rows the bundled split-the-party plugin used.
db.query(`
  CREATE TABLE IF NOT EXISTS player_map_overrides (
    session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
    player_name VARCHAR(255) NOT NULL,
    map_id INTEGER REFERENCES maps(id) ON DELETE CASCADE,
    updated_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (session_id, player_name)
  )
`).catch(err => console.error('player_map_overrides migration error:', err));

// ─── Socket.io ───────────────────────────────────────────────────────────────

// Track connected users per session
const sessionUsers = {}; // sessionCode -> Map<socketId, {name, role}>

// Is anyone actually looking at this map?
//
// The patrol runner asks before walking anything. A patrol exists to be seen,
// and running one on a map with no GM and no logged-in player is work nobody
// can observe — with a real cost: the guard drifts on for hours while the map
// is closed and is found at the far end of its route, having "patrolled"
// through a session that never happened. A character standing on the map whose
// player is not connected is scenery, not an audience.
//
// Read from `socket.data.activeMapId`, which every screen already reports via
// `set_player_active_map_id` — the channel that routes per-map ambient audio.
// Deliberately NOT inferred from the session's map_id: a player on a
// split-party override map is looking at a different board, and the GM can be
// previewing one. What the screen SAYS it is showing is the only honest answer.
//
// A socket that has not reported a map yet counts for nothing, which is the
// safe direction: a patrol that has not started is easier to explain than a
// guard who walked off while nobody was connected.
function mapHasWatcher(sessionCode, mapId) {
  if (mapId == null) return false;
  const room = io.sockets.adapter.rooms.get(sessionCode);
  if (!room) return false;
  for (const id of room) {
    const sock = io.sockets.sockets.get(id);
    // Spectator screens count: a board on the television is being watched by
    // the whole table, and freezing the guards on it would be a strange
    // reading of "nobody is here".
    if (sock && Number(sock.data.activeMapId) === Number(mapId)) return true;
  }
  return false;
}

const sessionConnectionLog = {}; // sessionCode -> Map<name, {name, role, socketId, connectedAt, disconnectedAt}>
const sessionTemplates = {}; // sessionCode -> Array<{ id, type, points, color, label }> — GM-only
const sessionUserColors = {}; // sessionCode -> { name: color }

// ── Dice roll log ────────────────────────────────────────────────────────────
// Every roll the table has seen this session, oldest first. In memory beside
// sessionTemplates for the same reason: it describes a live session, not the
// campaign, and a restart legitimately clears it. Capped so a long night of
// rolling can't grow without bound.
const sessionRollLog = {}; // sessionCode -> Array<entry>
const ROLL_LOG_MAX = 200;

function pushRoll(sessionCode, entry) {
  if (!sessionRollLog[sessionCode]) sessionRollLog[sessionCode] = [];
  const log = sessionRollLog[sessionCode];
  log.push(entry);
  if (log.length > ROLL_LOG_MAX) log.splice(0, log.length - ROLL_LOG_MAX);
  return entry;
}

// ── Freehand drawing layer ───────────────────────────────────────────────────
// Strokes are per MAP, so switching maps doesn't drag last scene's scribbles
// along, and they're keyed by author so a player can undo their own without
// touching anyone else's. Players draw as well as the GM — that's the point of
// the layer — so this is one of the few map mutations not gated on role.
const sessionDrawings = {}; // sessionCode -> Array<stroke>
const DRAW_MAX_PER_SESSION = 800;
const DRAW_MAX_POINTS = 600;

// A stable colour per person, so a player's ink is recognisable without anyone
// configuring anything. The GM's chosen colours win when set (set_user_color);
// otherwise a name hash picks from a palette that stays legible on a dark map.
const DRAW_PALETTE = [
  '#ef4444', '#f59e0b', '#22c55e', '#06b6d4',
  '#8b5cf6', '#ec4899', '#84cc16', '#f97316',
];
// Strokes belonging to one map. mapId is compared loosely because the session
// carries a number and a lobby carries null, and both must match their own.
function drawingsForMap(sessionCode, mapId) {
  const all = sessionDrawings[sessionCode] || [];
  const want = mapId == null ? null : Number(mapId);
  return all.filter((d) => (d.mapId == null ? null : Number(d.mapId)) === want);
}

// Templates belonging to one map, same rule as the ink above. Templates were
// stored per SESSION with no map on them, so an elemental effect placed on one
// board reappeared on every other board the party visited — and on the lobby.
function templatesForMap(sessionCode, mapId) {
  const all = sessionTemplates[sessionCode] || [];
  const want = mapId == null ? null : Number(mapId);
  return all.filter((t) => (t.mapId == null ? null : Number(t.mapId)) === want);
}

// Colours are ALLOCATED per session, not hashed from the name. A hash is
// stable but collides — "Game Master" and "Applejack" landed on the same
// amber in testing — and two people sharing a colour defeats the entire point
// of colouring the ink. First come, first served from the palette; stable for
// the rest of the session once assigned; a GM-set colour always wins and is
// treated as taken so nobody else is handed it.
const sessionInkColors = {}; // sessionCode -> { name: color }

function drawColorFor(sessionCode, name) {
  const explicit = (sessionUserColors[sessionCode] || {})[name];
  if (explicit) return explicit;

  if (!sessionInkColors[sessionCode]) sessionInkColors[sessionCode] = {};
  const mine = sessionInkColors[sessionCode];
  if (mine[name]) return mine[name];

  const taken = new Set([
    ...Object.values(mine),
    ...Object.values(sessionUserColors[sessionCode] || {}),
  ]);
  let color = DRAW_PALETTE.find((c) => !taken.has(c));
  if (!color) {
    // More people than palette entries: fall back to a hash so the choice is
    // at least stable, and accept the duplicate.
    let h = 0;
    for (let i = 0; i < String(name).length; i++) h = (h * 31 + String(name).charCodeAt(i)) >>> 0;
    color = DRAW_PALETTE[h % DRAW_PALETTE.length];
  }
  mine[name] = color;
  return color;
}

// Per-session, per-map ambient state. The GM can layer multiple
// ambient loops on a map ("Forest" + "Bird Song" + "Wind Blowing")
// to build a scene; each map keeps an array of currently-playing
// tracks with their own volume. A player who later switches to that
// map (Send-to, auto-follow, GM map change) gets every track
// auto-replayed in sync — see set_player_active_map_id below.
// Stop clears every map for the session (a "stop everything" button).
const sessionAmbients = {}; // sessionCode -> { [mapId]: Array<{ filename, volume }> }

// Pick a random tile inside a spawn area, avoiding tiles already
// occupied by existing tokens. The area is either a polygon (when
// shape_points is provided — an array of { col, row } vertices) or
// a circular bubble (legacy radius). Tokens are treated as 1x1 for
// avoidance — larger creatures are rare and worst case the new token
// visually overlaps a flank tile.
//
// Falls back to the centroid (or original centre) if every random
// attempt collides with another token, so a tightly-packed area still
// produces a valid landing tile.
function pointInPolygon(col, row, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = Number(poly[i].col), yi = Number(poly[i].row);
    const xj = Number(poly[j].col), yj = Number(poly[j].row);
    const intersect = ((yi > row) !== (yj > row)) &&
      (col < (xj - xi) * (row - yi) / ((yj - yi) || 1e-9) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

// Distance from point (px,py) to a line segment (ax,ay)→(bx,by).
function distPointToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 1e-9) return Math.hypot(px - ax, py - ay);
  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

// Minimum distance from a map-pixel point to a wall row (any type).
// Returns Infinity for malformed walls so they never reject candidates.
function minDistToWall(px, py, wall) {
  const pts = wall.points;
  if (!Array.isArray(pts) || pts.length < 2) return Infinity;
  switch (wall.type) {
    case 'line':
    case 'ledge':
    case 'window':
      return pts.length >= 4
        ? distPointToSegment(px, py, pts[0], pts[1], pts[2], pts[3])
        : Infinity;
    case 'rect': {
      if (pts.length < 4) return Infinity;
      const minX = Math.min(pts[0], pts[2]), maxX = Math.max(pts[0], pts[2]);
      const minY = Math.min(pts[1], pts[3]), maxY = Math.max(pts[1], pts[3]);
      return Math.min(
        distPointToSegment(px, py, minX, minY, maxX, minY),
        distPointToSegment(px, py, maxX, minY, maxX, maxY),
        distPointToSegment(px, py, maxX, maxY, minX, maxY),
        distPointToSegment(px, py, minX, maxY, minX, minY),
      );
    }
    case 'polygon': {
      if (pts.length < 6) return Infinity;
      let minD = Infinity;
      for (let i = 0; i < pts.length; i += 2) {
        const j = (i + 2) % pts.length;
        const d = distPointToSegment(px, py, pts[i], pts[i + 1], pts[j], pts[j + 1]);
        if (d < minD) minD = d;
      }
      return minD;
    }
    case 'circle':
      if (pts.length < 3) return Infinity;
      return Math.abs(Math.hypot(px - pts[0], py - pts[1]) - pts[2]);
    default:
      return Infinity;
  }
}

// Pick a random landing tile inside a spawn area while respecting two
// hard rules:
//   1. The token's centre must be at least `wallBufferPx` away from
//      every wall — touching a wall breaks the line-of-sight system
//      (the ray-cast clips both sides of the wall and the player can
//      see straight through).
//   2. Don't overlap an existing token if avoidable. Same-tile
//      overlap is allowed as a last resort so a tight, fully-walled
//      pocket still produces a valid landing tile.
//
// Coordinates are fractional grid units throughout — no integer-tile
// snap — so a token can squeeze between walls in zones smaller than
// a single cell.
function scatterSpawnPosition(centerCol, centerRow, radius, occupiedTiles, polygon, walls, gridSize, offsetX, offsetY, bounds = null) {
  const cx = Number(centerCol) || 0;
  const cy = Number(centerRow) || 0;
  const gs = Number(gridSize) || 50;
  const ox = Number(offsetX) || 0;
  const oy = Number(offsetY) || 0;
  // Buffer is measured from the token's CENTRE. A 1x1 token's visible
  // edge sits half a grid cell from its centre, so the buffer needs to
  // be JUST past that — otherwise the token spawns with its edge on a
  // wall and the LoS ray-cast clips both sides. We sit ~1px past the
  // half-cell line; the previous gs*0.55 (a 5% overshoot on every wall)
  // was wide enough to invalidate most cells in corridor-sized zones,
  // forcing tokens onto the centroid fallback. 4px floor for tiny grids.
  const wallBufferPx = Math.max(4, gs * 0.5 + 1);
  // Keep candidates on the map. Without this the ring search happily walks
  // into negative columns — which is exactly what happened on a map with no
  // spawn point set, where the search centre defaults to the top-left corner
  // and half of every ring is off the edge.
  const maxCol = bounds && bounds.cols > 0 ? bounds.cols - 1 : null;
  const maxRow = bounds && bounds.rows > 0 ? bounds.rows - 1 : null;
  function inBounds(col, row) {
    if (col < 0 || row < 0) return false;
    if (maxCol != null && col > maxCol) return false;
    if (maxRow != null && row > maxRow) return false;
    return true;
  }
  const allWalls = Array.isArray(walls) ? walls : [];
  const others = Array.isArray(occupiedTiles) ? occupiedTiles : [];

  // Convert a candidate's (col, row) to its pixel centre and reject
  // when it sits inside the wall-buffer of any wall.
  function clearOfWalls(col, row) {
    if (!allWalls.length) return true;
    const px = ox + (col + 0.5) * gs;
    const py = oy + (row + 0.5) * gs;
    for (const w of allWalls) {
      if (minDistToWall(px, py, w) < wallBufferPx) return false;
    }
    return true;
  }
  // Soft "don't share a tile" check — fractional distance test rather
  // than an integer-tile bucket so close-but-not-overlapping spots
  // pass.
  function clearOfTokens(col, row, minDistGrid) {
    for (const t of others) {
      if (Math.hypot(col - Number(t.col), row - Number(t.row)) < minDistGrid) return false;
    }
    return true;
  }

  // Walk whole-tile rings outward from a square, returning the first
  // candidate that clears the walls, isn't already stood on, and passes
  // the caller's `accept` (used to stay inside a spawn polygon).
  //
  // This is the spread of last resort — and the only spread there is when
  // the spawn has no radius at all, which is the default for every map.
  // Candidates inside a ring are shuffled so a party arriving together
  // fans out around the marker instead of always filling the same corner.
  function ringSearch(baseCol, baseRow, maxRing, accept) {
    for (let ring = 1; ring <= maxRing; ring++) {
      const cands = [];
      for (let dc = -ring; dc <= ring; dc++) {
        for (let dr = -ring; dr <= ring; dr++) {
          if (Math.abs(dc) !== ring && Math.abs(dr) !== ring) continue;
          cands.push({ col: baseCol + dc, row: baseRow + dr });
        }
      }
      for (let i = cands.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cands[i], cands[j]] = [cands[j], cands[i]];
      }
      for (const c of cands) {
        if (!inBounds(c.col, c.row)) continue;
        if (accept && !accept(c.col, c.row)) continue;
        if (!clearOfWalls(c.col, c.row)) continue;
        if (clearOfTokens(c.col, c.row, 0.9)) return c;
      }
    }
    return null;
  }

  // Polygon mode — rejection-sample inside the polygon's bounding box.
  if (Array.isArray(polygon) && polygon.length >= 3) {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    let sumX = 0, sumY = 0;
    for (const p of polygon) {
      const x = Number(p.col), y = Number(p.row);
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
      sumX += x; sumY += y;
    }
    const centroidCol = sumX / polygon.length;
    const centroidRow = sumY / polygon.length;
    let bestNoToken = null; // best wall-clear candidate even if a token is on it
    for (let i = 0; i < 80; i++) {
      const col = minX + Math.random() * (maxX - minX);
      const row = minY + Math.random() * (maxY - minY);
      if (!pointInPolygon(col, row, polygon)) continue;
      if (!clearOfWalls(col, row)) continue;
      if (clearOfTokens(col, row, 0.7)) return { col, row };
      if (!bestNoToken) bestNoToken = { col, row };
    }
    // Random sampling found nothing free: sweep tiles outward from the
    // centroid before settling for an overlap.
    const spread = ringSearch(Math.round(centroidCol), Math.round(centroidRow),
      Math.max(2, Math.ceil(Math.max(maxX - minX, maxY - minY))),
      (col, row) => pointInPolygon(col, row, polygon));
    if (spread) return spread;
    if (bestNoToken) return bestNoToken;       // tokens overlap, but at least no walls
    return { col: centroidCol, row: centroidRow }; // fallback
  }

  // Circle mode (legacy bubble).
  const r = Math.max(0, Number(radius) || 0);
  // No radius — the map's default spawn, and the common case. A single
  // point can only hold one token, so everyone the GM spawns lands on
  // the same square and the party reads as one token. Give the marker
  // itself to whoever gets there first, then ring outward for the rest.
  // The marker keeps its no-walls-check exemption: the GM placed it, so
  // it's a valid square by definition even if it hugs a wall.
  if (r === 0) {
    if (clearOfTokens(cx, cy, 0.9)) return { col: cx, row: cy };
    const spread = ringSearch(Math.round(cx), Math.round(cy), 8, null);
    return spread || { col: cx, row: cy };
  }
  let bestNoToken = null;
  for (let i = 0; i < 80; i++) {
    const dx = (Math.random() * 2 - 1) * r;
    const dy = (Math.random() * 2 - 1) * r;
    if (dx * dx + dy * dy > r * r) continue;
    const col = cx + dx;
    const row = cy + dy;
    if (!clearOfWalls(col, row)) continue;
    if (clearOfTokens(col, row, 0.7)) return { col, row };
    if (!bestNoToken) bestNoToken = { col, row };
  }
  // Bubble full. Spill outside it rather than stack — a token a square
  // past the ring is obviously placed, two tokens on one square aren't.
  const spread = ringSearch(Math.round(cx), Math.round(cy), Math.ceil(r) + 4, null);
  if (spread) return spread;
  if (bestNoToken) return bestNoToken;
  return { col: cx, row: cy };
}

// Ship context for a map's default spawn, or null when the spawn isn't aboard
// one. Kept separate from loadShipContext (which lives in the connection scope)
// so spawn resolution can run from anywhere.
async function loadSpawnShip(map) {
  if (!map || map.spawn_ship_id == null) return null;
  const shipRes = await db.query(
    `SELECT ms.* FROM map_ships ms WHERE ms.id=$1 AND ms.map_id=$2`,
    [map.spawn_ship_id, map.id]
  );
  if (!shipRes.rows.length) return null;
  const ship = shipRes.rows[0];
  const decks = await db.query(
    'SELECT * FROM ship_decks WHERE ship_id=$1 ORDER BY deck_index ASC',
    [ship.library_id]
  );
  if (!decks.rows.length) return null;
  const deck = decks.rows.find(d => d.deck_index === (map.spawn_deck_index ?? 0)) || decks.rows[0];
  return { ship, decks: decks.rows, deck };
}

// Where should a token arriving on this map land?
//
// Two shapes of answer. Ordinarily it's a world square, scattered inside
// spawn_radius and kept off walls. When the GM has put the spawn on a ship it's
// a DECK square instead, and the caller binds the token to the ship — so the
// arrival rides the hull from that moment, and a ship that sails on doesn't
// leave newcomers treading water where it used to be.
//
// `occupied` is mutated by callers between tokens so a group arriving together
// doesn't stack; deck spawns track their own taken squares for the same reason.
// Which ship's deck covers this world square, in deck-local coords — or null
// for open map. Uses the ship's ACTIVE deck, the one actually drawn, so what
// the GM clicked is what gets recorded.
async function findDeckSquare(mapId, worldCol, worldRow) {
  if (worldCol == null || worldRow == null) return null;
  const mapRes = await db.query(
    `SELECT m.id,
            CASE WHEN m.map_type = 'wildspace' AND m.grid_cols > 0
                 THEN m.grid_cols * m.grid_size ELSE m.width END AS width,
            CASE WHEN m.map_type = 'wildspace' AND m.grid_rows > 0
                 THEN m.grid_rows * m.grid_size ELSE m.height END AS height,
            COALESCE(m.grid_size, s.grid_size, 50) AS grid_size
       FROM maps m LEFT JOIN sessions s ON m.session_id = s.id
      WHERE m.id=$1`,
    [mapId]
  );
  const map = mapRes.rows[0];
  if (!map) return null;
  const ships = await db.query('SELECT * FROM map_ships WHERE map_id=$1 ORDER BY z_index, id', [mapId]);
  // Reverse order: the ship drawn last is the one on top, and the one the GM
  // believes they clicked.
  for (let i = ships.rows.length - 1; i >= 0; i--) {
    const ship = ships.rows[i];
    const decks = await db.query(
      'SELECT * FROM ship_decks WHERE ship_id=$1 ORDER BY deck_index ASC',
      [ship.library_id]
    );
    if (!decks.rows.length) continue;
    const deck = decks.rows.find(d => d.deck_index === (ship.active_deck ?? 0)) || decks.rows[0];
    const local = shipMath.worldToDeck({
      ship, deck,
      refDeck: shipMath.referenceDeck(decks.rows),
      gridSize: map.grid_size,
      mapWidth: map.width,
      mapHeight: map.height,
      worldCol, worldRow,
    });
    if (!shipMath.isOnDeck(deck, local.col, local.row)) continue;
    return {
      shipId: ship.id,
      deckIndex: deck.deck_index,
      // Snapped, so the spawn sits in a square rather than between four. The
      // epsilon matters: the rotation round-trip lands exact squares a hair
      // under the integer (2.9999999999), which bare flooring would drop into
      // the neighbouring square — off by one, and only on the boundaries.
      deckCol: Math.floor(local.col + 1e-6),
      deckRow: Math.floor(local.row + 1e-6),
    };
  }
  return null;
}

async function resolveMapSpawn(mapId, { occupied = [], walls = [], deckTaken = null, sessionId = null, excludeTokenIds = [] } = {}) {
  // Loaded here rather than taken from the caller so every spawn path agrees on
  // the map's extent. A wildspace field is sized cols*gridSize, not by its
  // stored pixels — the same correction loadShipContext makes, and the grid
  // offset falls out of it, so a mismatch would land tokens half a square off
  // the deck they were aimed at.
  const mapRes = await db.query(
    `SELECT m.id, m.spawn_col, m.spawn_row, m.spawn_radius,
            m.spawn_ship_id, m.spawn_deck_index, m.spawn_deck_col, m.spawn_deck_row,
            CASE WHEN m.map_type = 'wildspace' AND m.grid_cols > 0
                 THEN m.grid_cols * m.grid_size ELSE m.width END AS width,
            CASE WHEN m.map_type = 'wildspace' AND m.grid_rows > 0
                 THEN m.grid_rows * m.grid_size ELSE m.height END AS height,
            COALESCE(m.grid_size, s.grid_size, 50) AS grid_size
       FROM maps m LEFT JOIN sessions s ON m.session_id = s.id
      WHERE m.id=$1`,
    [mapId]
  );
  const map = mapRes.rows[0];
  if (!map) {
    return { col: 0, row: 0, shipId: null, deckIndex: null, deckCol: null, deckRow: null, gridSize: 50, offX: 0, offY: 0 };
  }
  const radius = Number(map.spawn_radius ?? 0);
  const gs = Number(map.grid_size) || 50;
  const offX = gs > 0 ? (Number(map.width || 0) % gs) / 2 : 0;
  const offY = gs > 0 ? (Number(map.height || 0) % gs) / 2 : 0;

  const aboard = await loadSpawnShip(map);
  if (aboard) {
    const { ship, decks, deck } = aboard;
    const baseCol = Number(map.spawn_deck_col ?? 0);
    const baseRow = Number(map.spawn_deck_row ?? 0);
    const taken = deckTaken || new Set();
    // Tokens already standing on this deck are taken squares too. Without
    // this, players who arrive one at a time (each its own resolveMapSpawn
    // call, with no shared deckTaken) all land on the spawn square.
    if (sessionId != null) {
      const standing = await db.query(
        `SELECT deck_col, deck_row FROM session_tokens
          WHERE session_id=$1 AND map_id=$2 AND ship_id=$3 AND deck_index=$4
            AND deck_col IS NOT NULL AND deck_row IS NOT NULL
            AND NOT (id = ANY($5::int[]))`,
        [sessionId, mapId, ship.id, deck.deck_index, excludeTokenIds]
      );
      for (const t of standing.rows) taken.add(`${t.deck_col},${t.deck_row}`);
    }
    // Search outward from the chosen square: the spawn tile first, then rings
    // up to the radius. Deck-local, so it needs no wall data — the hull edge is
    // the only boundary, and isOnDeck is that test.
    //
    // The floor of 6 rings is what keeps a radius-less shipboard spawn (the
    // default) from being a single square everyone piles onto — inner rings are
    // still consumed first, so a GM-set radius keeps its intended shape.
    let pick = null;
    const maxRing = Math.max(6, Math.floor(radius));
    for (let ring = 0; ring <= maxRing && !pick; ring++) {
      for (let dc = -ring; dc <= ring && !pick; dc++) {
        for (let dr = -ring; dr <= ring && !pick; dr++) {
          if (ring > 0 && Math.abs(dc) !== ring && Math.abs(dr) !== ring) continue;
          const c = baseCol + dc, r = baseRow + dr;
          if (!shipMath.isOnDeck(deck, c, r)) continue;
          if (taken.has(`${c},${r}`)) continue;
          pick = { col: c, row: r };
        }
      }
    }
    // Every candidate taken: stack on the spawn square rather than refusing to
    // place the token. A doubled-up token can be dragged apart; a missing one
    // looks like the join failed.
    if (!pick) pick = { col: baseCol, row: baseRow };
    taken.add(`${pick.col},${pick.row}`);

    const world = shipMath.deckToWorld({
      ship,
      deck,
      refDeck: shipMath.referenceDeck(decks),
      gridSize: gs,
      mapWidth: map.width,
      mapHeight: map.height,
      deckCol: pick.col,
      deckRow: pick.row,
    });
    return {
      col: world.col,
      row: world.row,
      shipId: ship.id,
      deckIndex: deck.deck_index,
      deckCol: pick.col,
      deckRow: pick.row,
      gridSize: gs, offX, offY,
    };
  }

  // No spawn point set (every freshly-made map) used to mean "spawn at column
  // 0, row 0" — the top-left corner, with half the search ring off the map.
  // The middle of the map is the sane default.
  const colsOnMap = gs > 0 ? Math.max(1, Math.floor(Number(map.width || 0) / gs)) : 0;
  const rowsOnMap = gs > 0 ? Math.max(1, Math.floor(Number(map.height || 0) / gs)) : 0;
  // The column defaults to 0, not NULL, so an unset spawn point is
  // indistinguishable from one deliberately placed in the very top-left
  // square. Treat 0,0 as unset: nobody marks the corner on purpose, and the
  // GM who wants it there can move it one square and back.
  const spawnUnset = (map.spawn_col == null || Number(map.spawn_col) === 0)
                  && (map.spawn_row == null || Number(map.spawn_row) === 0);
  const centreCol = spawnUnset ? Math.floor(colsOnMap / 2) : Number(map.spawn_col);
  const centreRow = spawnUnset ? Math.floor(rowsOnMap / 2) : Number(map.spawn_row);

  const picked = scatterSpawnPosition(
    centreCol, centreRow, radius,
    occupied, null, walls, gs, offX, offY,
    { cols: colsOnMap, rows: rowsOnMap },
  );
  return { col: picked.col, row: picked.row, shipId: null, deckIndex: null, deckCol: null, deckRow: null, gridSize: gs, offX, offY };
}

async function loadOccupiedTiles(sessionId, mapId) {
  const r = await db.query(
    'SELECT grid_col AS col, grid_row AS row FROM session_tokens WHERE session_id=$1 AND map_id=$2',
    [sessionId, mapId]
  );
  return r.rows;
}

// Lobby roster — who is waiting, which character they've picked, and whether
// they've said they're ready. Deliberately in-memory alongside sessionUsers:
// it's per-connection state with no meaning once everyone has disconnected,
// and persisting it would only create stale rows to reconcile on restart.
const lobbyRoster = {}; // sessionCode -> Map(socket.id -> { name, characterName })

function getLobbyRoster(sessionCode) {
  const m = lobbyRoster[sessionCode];
  return m ? Array.from(m.values()) : [];
}

function emitLobby(io, sessionCode) {
  io.to(sessionCode).emit('lobby_updated', { roster: getLobbyRoster(sessionCode) });
}

// ─── Portal traversal ───────────────────────────────────────────────────────
//
// Both entry points (a click on the portal, and a token being moved onto one)
// end up here, so the rules live in one place.
//
// The cooldown is what stops a portal pair from becoming a loop: the token
// lands on the far pad, which is itself a portal, and a step-on check on that
// square would send it straight back. Keyed per token — two players using the
// same gate in the same second must both get through.
const PORTAL_COOLDOWN_MS = 1500;
const portalCooldowns = new Map(); // tokenId -> epoch ms the token is free again

function portalOnCooldown(tokenId) {
  const until = portalCooldowns.get(String(tokenId));
  if (!until) return false;
  if (until <= Date.now()) { portalCooldowns.delete(String(tokenId)); return false; }
  return true;
}

// Send a token through `portal` to the other end of its pair. Returns the
// destination on success, or null when nothing happened (no partner, this end
// doesn't send, token isn't on this map, still cooling down).
async function runPortal(sessionCode, portal, tokenId, io) {
  if (!portal) { console.log('[portal] no portal'); return null; }
  if (!portal.exit_enabled) { console.log(`[portal] ${portal.id} exit disabled`); return null; }
  if (portalOnCooldown(tokenId)) { console.log(`[portal] token ${tokenId} on cooldown`); return null; }

  const partnerRes = await db.query(
    'SELECT * FROM map_portals WHERE pair_id=$1 AND id<>$2 ORDER BY created_at LIMIT 1',
    [portal.pair_id, portal.id]
  );
  if (!partnerRes.rows.length) { console.log(`[portal] ${portal.id} has no partner`); return null; }
  const partner = partnerRes.rows[0];

  const tokRes = await db.query(
    'SELECT id, map_id, ship_id, size, size_squares FROM session_tokens WHERE id=$1',
    [tokenId]
  );
  if (!tokRes.rows.length) { console.log(`[portal] token ${tokenId} not found`); return null; }
  const token = tokRes.rows[0];
  if (Number(token.map_id) !== Number(portal.map_id)) {
    console.log(`[portal] token ${tokenId} on map ${token.map_id}, portal on ${portal.map_id}`);
    return null;
  }

  // Land the token's CENTRE on the destination pad. For a Medium token that
  // is the pad square itself; a Large one has to start half a square up and
  // left or it arrives hanging off the corner of the gate it came out of.
  const tokExt = shipMath.tokenExtent(token);
  const gridCol = Number(partner.grid_col) + 0.5 - tokExt / 2;
  const gridRow = Number(partner.grid_row) + 0.5 - tokExt / 2;

  // Stepping through a gate takes you off the ship you were standing on. A
  // token that keeps its ship binding has deck coords as its truth, and the
  // next hull move would re-project it back aboard — teleported and then
  // yanked home.
  if (token.ship_id != null) {
    await db.query(
      `UPDATE session_tokens
          SET grid_col=$1, grid_row=$2, ship_id=NULL, deck_index=NULL, deck_col=NULL, deck_row=NULL
        WHERE id=$3`,
      [gridCol, gridRow, tokenId]
    );
  } else {
    await db.query(
      'UPDATE session_tokens SET grid_col=$1, grid_row=$2 WHERE id=$3',
      [gridCol, gridRow, tokenId]
    );
  }

  portalCooldowns.set(String(tokenId), Date.now() + PORTAL_COOLDOWN_MS);

  io.to(sessionCode).emit('token_moved', { tokenId, gridCol, gridRow });
  sneakWatch(sessionCode);
  // Separate event so clients can play the arrival effect without having to
  // guess which of the many token_moved events was a teleport.
  io.to(sessionCode).emit('portal_used', {
    tokenId,
    fromPortalId: portal.id,
    toPortalId: partner.id,
    gridCol,
    gridRow,
    // The destination pad's centre, in grid units. gridCol/gridRow are the
    // token's top-left and go fractional for anything bigger than Medium, so a
    // client that wants to look at the exit — the player's camera — would have
    // to know the traveller's footprint to work out where that is.
    padCol: Number(partner.grid_col) + 0.5,
    padRow: Number(partner.grid_row) + 0.5,
    color: partner.color,
  });
  return { gridCol, gridRow, partner };
}

// Portals for a map, cached. Every token move has to ask "did that land on a
// portal?", and the answer changes only when the GM edits one — so the query
// would otherwise run on every drag on every map, portals or not.
const portalCache = new Map(); // mapId -> rows
async function portalsForMap(mapId) {
  const key = String(mapId);
  if (portalCache.has(key)) return portalCache.get(key);
  const res = await db.query('SELECT * FROM map_portals WHERE map_id=$1', [mapId]);
  portalCache.set(key, res.rows);
  return res.rows;
}
function invalidatePortalCache(mapId) {
  if (mapId == null) portalCache.clear();
  else portalCache.delete(String(mapId));
}

// The portal (if any) whose square the token's footprint covers after landing
// on (col,row). Footprint matters: a Large creature straddling the pad is
// standing on it as far as everyone looking at the map is concerned.
// Which portal is this token standing on, if any?
//
// Measured from the token's CENTRE, not its stored corner. grid_col/grid_row
// are the top-left of the footprint and are routinely fractional (a token
// dropped at 2.83 spans 2.83→3.83), so testing the corner square answers a
// question nobody asked: the pad the art is sitting on is the one under the
// middle of it. A Large token's centre is a full square in from its corner,
// which is why the extent is part of the sum.
function portalCovering(rows, token, col, row) {
  const ext = shipMath.tokenExtent(token);
  // Token centre, in grid units.
  const cc = Number(col) + ext / 2;
  const cr = Number(row) + ext / 2;
  let best = null, bestD = Infinity;
  for (const p of rows) {
    // Portals are placed freely, so "standing on it" is a distance test
    // against the pad's centre rather than a square-index match. Half a
    // square in each axis — the area the ring is drawn over.
    const pc = Number(p.grid_col) + 0.5;
    const pr = Number(p.grid_row) + 0.5;
    const dc = Math.abs(cc - pc), dr = Math.abs(cr - pr);
    if (dc > 0.5 || dr > 0.5) continue;
    const d = dc * dc + dr * dr;
    if (d < bestD) { bestD = d; best = p; }
  }
  return best;
}

async function portalUnderToken(mapId, token, col, row) {
  const rows = await portalsForMap(mapId);
  if (!rows.length) return null;
  return portalCovering(rows, token, col, row);
}

// Card counts per pile, for the GM's draw controls. One query rather than
// three so the three numbers are always from the same instant.
// A point in TILE-LOCAL grid squares -> map pixels, for a tile laid at
// (col,row) and turned by `rot` degrees.
//
// Rotation is about the tile's own centre, which is exactly what the renderers
// do (both Konva and three.js spin the art about its middle with the footprint
// left alone). Deriving the walls any other way would put them somewhere the
// floor is not.
//
// Screen axes: y runs DOWN, so this formula is a clockwise turn — the same
// direction the art turns.
function tilePointToMap(x, y, tile, gridSize) {
  const cx = (Number(tile.grid_w) || 2) / 2;
  const cy = (Number(tile.grid_h) || 2) / 2;
  const th = ((Number(tile.rotation) || 0) * Math.PI) / 180;
  const cos = Math.cos(th);
  const sin = Math.sin(th);
  const dx = x - cx;
  const dy = y - cy;
  const rx = cx + dx * cos - dy * sin;
  const ry = cy + dx * sin + dy * cos;
  return [
    (Number(tile.grid_col) + rx) * gridSize,
    (Number(tile.grid_row) + ry) * gridSize,
  ];
}

// Is this doorway on the tile's OUTER EDGE?
//
// The distinction matters because the two kinds of opening mean different
// things. A doorway inside a tile is a door in a room — it stands on its own.
// A doorway on the edge is only half of something: it is where this tile
// expects to meet another, and until it does it is an opening onto nothing.
//
// Measured in the tile's own coordinates, before any rotation, because that is
// where "the north edge" is a fixed idea rather than one that moves with the
// card.
function doorwayOnTileEdge(pts, tile, eps = 0.15) {
  const w = Number(tile.grid_w) || 0;
  const h = Number(tile.grid_h) || 0;
  const [x1, y1, x2, y2] = pts.map(Number);
  const near = (a, b) => Math.abs(a - b) <= eps;
  return (near(x1, 0) && near(x2, 0)) || (near(x1, w) && near(x2, w))
      || (near(y1, 0) && near(y2, 0)) || (near(y1, h) && near(y2, h));
}

// Every doorway DESCRIBED BY the other tiles already on this map, in map
// pixels — whether or not each one actually produced a door.
//
// Read from the tiles' own geometry rather than from the doors table on
// purpose: under the pairing rule below, a tile laid on its own creates no
// door at its edges, so the doors table cannot answer "does the tile next door
// have an opening here?". Its geometry can.
async function tileDoorwaysOnMap(mapId, exceptTileId, gridSize) {
  const rows = (await db.query(
    `SELECT mt.grid_col, mt.grid_row, mt.rotation, mt.grid_w, mt.grid_h, tl.geometry
       FROM map_tiles mt JOIN tile_library tl ON tl.id = mt.tile_id
      WHERE mt.map_id = $1 AND mt.id <> $2`,
    [mapId, exceptTileId]
  )).rows;
  const out = [];
  for (const t of rows) {
    for (const d of (((t.geometry || {}).doors) || [])) {
      const p = d.points || [];
      if (p.length < 4) continue;
      const [ax, ay] = tilePointToMap(Number(p[0]), Number(p[1]), t, gridSize);
      const [bx, by] = tilePointToMap(Number(p[2]), Number(p[3]), t, gridSize);
      out.push([ax, ay, bx, by]);
    }
  }
  return out;
}

async function tileDeckCounts(deckId) {
  const r = await db.query(
    `SELECT pile, COUNT(*)::int AS n FROM tile_deck_cards WHERE deck_id=$1 GROUP BY pile`,
    [deckId]
  );
  const out = { draw: 0, pending: 0, discard: 0 };
  for (const row of r.rows) out[row.pile] = row.n;
  return out;
}

async function getSessionState(sessionCode) {
  const sessionRes = await db.query(
    `SELECT s.*, m.image_path AS map_image, m.name AS map_name, m.width AS map_width, m.height AS map_height,
            -- Wildspace identity. Without these the map comes back as a plain
            -- image map on every join: mapType falls back to 'image', the
            -- starscape gets scaled to the map instead of pinned behind it,
            -- and the extent collapses to the art's size.
            m.map_type AS map_type, m.grid_cols AS map_grid_cols, m.grid_rows AS map_grid_rows,
            -- The 3D view's surrounding panorama, when one has been uploaded.
            m.sky_image_path AS map_sky_image, m.sky_preset AS map_sky_preset,
            -- Star/ring geometry for generated system maps.
            m.system_data AS map_system,
            -- The map's own grid size, and the ONLY thing that sizes its grid.
            -- sessions.grid_size used to win for ordinary maps, which meant one
            -- pixels-per-square had to serve every map in the campaign: a
            -- dockside battlemap drawn at 256 and a starfield at 20 cannot
            -- share a value, and whichever lost had every token on it bunched
            -- into a corner. It now survives only as the default for newly
            -- uploaded maps and a fallback for rows predating this column.
            m.grid_size AS map_grid_size,
            -- Square or hex lattice. Per-map, so an overland hexcrawl and the
            -- dungeon it leads into can sit in the same campaign.
            m.grid_type AS map_grid_type,
            -- Which storey of a multi-level map is drawn. A scene control, like
            -- a ship's active deck: it changes what everyone is looking at.
            m.active_level AS map_active_level,
            -- What one cell is worth, and whether the key saying so is shown.
            m.grid_scale AS map_grid_scale, m.grid_unit AS map_grid_unit,
            m.grid_scale_visible AS map_grid_scale_visible,
            m.spawn_col AS map_spawn_col, m.spawn_row AS map_spawn_row, m.spawn_radius AS map_spawn_radius,
            m.fow_enabled AS map_fow_enabled,
            m.patrols_paused AS map_patrols_paused,
            b.image_path AS backdrop_image, b.name AS backdrop_name,
            b.source_image_path AS backdrop_source
     FROM sessions s
     LEFT JOIN maps m ON s.map_id = m.id
     LEFT JOIN backdrops b ON s.backdrop_id = b.id
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
  let fogBlockRows = [];
  // The map's storeys, when it has any. An ordinary single-floor map has no
  // rows here at all, and the clients read an empty list as "one level".
  let levelRows = [];
  if (session.map_id) {
    levelRows = (await db.query(
      'SELECT * FROM map_levels WHERE map_id=$1 ORDER BY level_index',
      [session.map_id]
    )).rows;
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
      `SELECT st.*, c.image_path AS creature_image, c.display_image_path AS creature_display_image, c.standee_image_path AS creature_standee, c.base_color AS creature_base_color, c.base_opacity AS creature_base_opacity, c.token_height_ft AS creature_token_height, c.dexterity AS creature_dex, COALESCE(c.speed_walk, 30) AS creature_speed, COALESCE(c.speed_fly, 0) AS creature_speed_fly, COALESCE(c.speed_swim, 0) AS creature_speed_swim, COALESCE(c.speed_climb, 0) AS creature_speed_climb, COALESCE(c.speed_burrow, 0) AS creature_speed_burrow, COALESCE(c.initiative_bonus, 0) AS initiative_bonus
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
    var spawnPointsRows = (await db.query(
      'SELECT * FROM map_spawn_points WHERE map_id=$1 ORDER BY created_at',
      [session.map_id]
    )).rows;
    var portalRows = (await db.query(
      'SELECT * FROM map_portals WHERE map_id=$1 ORDER BY created_at',
      [session.map_id]
    )).rows;
    var terrainRows = (await db.query(
      `SELECT mt.*, tl.image_path AS lib_image_path, tl.name AS lib_name, tl.is_marker,
              tl.three_d_shape AS lib_three_d_shape,
              tl.model_path AS lib_model_path, tl.model_scale AS lib_model_scale,
              tl.cloud_form AS lib_cloud_form,
              tl.piece_form AS lib_piece_form,
              tl.source_image_path AS lib_source_image_path,
              tl.blocks_vision, tl.blocks_light, tl.blocks_movement,
              tl.hide_until_revealed, tl.custom_walls
         FROM map_terrain mt
         LEFT JOIN terrain_library tl ON mt.library_id = tl.id
        WHERE mt.map_id=$1
        ORDER BY mt.z_index, mt.id`,
      [session.map_id]
    )).rows;
    // Tiles laid on a tile map. Read from map_tiles rather than joined out of
    // the library: a laid tile keeps its own art path and edges so it survives
    // the library row being edited or deleted under it.
    var tileRows = (await db.query(
      'SELECT * FROM map_tiles WHERE map_id=$1 ORDER BY id',
      [session.map_id]
    )).rows;
    fogBlockRows = (await db.query(
      'SELECT * FROM map_fog_blocks WHERE map_id=$1 ORDER BY created_at',
      [session.map_id]
    )).rows;
    // Ships on the current map, decks attached. This is the payload every
    // client gets on join/refresh — the REST /state route is only used for
    // mid-session map switches, so ships have to be here too or they vanish
    // the moment anyone reloads.
    var shipRows = (await db.query(
      `SELECT ms.*, sl.name AS class_name, sl.speed, sl.armor_class, sl.hull_hp, sl.air_bubble_ft,
              COALESCE(
                (SELECT json_agg(sd.* ORDER BY sd.deck_index)
                   FROM ship_decks sd WHERE sd.ship_id = ms.library_id),
                '[]'::json
              ) AS decks
         FROM map_ships ms
         LEFT JOIN ship_library sl ON ms.library_id = sl.id
        WHERE ms.map_id=$1
        ORDER BY ms.z_index, ms.id`,
      [session.map_id]
    )).rows;
  } else {
    // No map selected — still load tokens that have no map association. These
    // are the lobby's combatants: a fight with no battlemap (a social scene
    // turning ugly, a chase, theatre-of-the-mind) still needs an initiative
    // order, so the same columns the map branch selects are needed here or the
    // tracker has no Dex tiebreak and no initiative bonus to offer.
    const tokensRes = await db.query(
      `SELECT st.*, c.image_path AS creature_image, c.display_image_path AS creature_display_image, c.standee_image_path AS creature_standee, c.base_color AS creature_base_color, c.base_opacity AS creature_base_opacity, c.token_height_ft AS creature_token_height,
              c.dexterity AS creature_dex, COALESCE(c.speed_walk, 30) AS creature_speed, COALESCE(c.speed_fly, 0) AS creature_speed_fly, COALESCE(c.speed_swim, 0) AS creature_speed_swim, COALESCE(c.speed_climb, 0) AS creature_speed_climb, COALESCE(c.speed_burrow, 0) AS creature_speed_burrow,
              COALESCE(c.initiative_bonus, 0) AS initiative_bonus
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
      // Whether the GM has the patrols held. In the session payload so the
      // button shows the right state the moment the screen opens, rather than
      // after a round trip.
      // The MAP's setting, not the session's — pausing is per board now. The
      // session column is left in place for older clients and packs.
      patrols_paused: session.map_patrols_paused || false,
      // The map's own setting wins; the session flag is the fallback for maps
      // that have never been toggled.
      fow_enabled: session.map_fow_enabled ?? (session.fow_enabled || false),
      fow_blur: session.fow_blur ?? 16,
      fow_color: session.fow_color || '#000000',
      ambient_light: session.ambient_light || 'bright',
      sneak_mode: !!session.sneak_mode,
      treasure_chest: Array.isArray(session.treasure_chest) ? session.treasure_chest : [],
      sneak_round_at: session.sneak_round_at ? new Date(session.sneak_round_at).getTime() : null,
      token_name_font_size: session.token_name_font_size ?? 45,
      spawn_map_id: session.spawn_map_id ?? null,
      active_srd_edition: session.active_srd_edition || 'both',
    },
    tokens: tokensRows,
    walls: wallsRows,
    doors: doorsRows,
    lights: lightsRows,
    // Walls, doors and lights each carry a level_index; the clients draw the
    // active storey's and ignore the rest. Filtering here instead would mean
    // re-broadcasting the whole map every time the GM changed floor, for
    // geometry that is not secret.
    levels: levelRows,
    magicalDarkness: darknessRows,
    dmMarkers: dmMarkersRows,
    spawnPoints: typeof spawnPointsRows !== 'undefined' ? spawnPointsRows : [],
    portals: typeof portalRows !== 'undefined' ? portalRows : [],
    terrain: typeof terrainRows !== 'undefined' ? terrainRows : [],
    tiles: typeof tileRows !== 'undefined' ? tileRows : [],
    ships: typeof shipRows !== 'undefined' ? shipRows : [],
    fogBlocks: fogBlockRows,
    spawnPoint: { col: session.map_spawn_col ?? 0, row: session.map_spawn_row ?? 0, radius: session.map_spawn_radius ?? 0 },
    playerMapOverrides: await loadPlayerMapOverrides(session.id),
  };
}

// Read every GM-set per-player override for a session as a flat
// { [playerName]: mapId } map — easier for clients to consume than
// raw rows. Returns {} when the table is empty.
async function loadPlayerMapOverrides(sessionId) {
  const r = await db.query(
    'SELECT player_name, map_id FROM player_map_overrides WHERE session_id=$1',
    [sessionId]
  );
  const out = {};
  for (const row of r.rows) {
    if (row.player_name && row.map_id != null) out[row.player_name] = row.map_id;
  }
  return out;
}

function getConnectionLog(sessionCode) {
  const log = sessionConnectionLog[sessionCode];
  if (!log) return [];
  const cutoff = Date.now() - 2 * 60 * 60 * 1000;
  return Array.from(log.values()).filter(e =>
    e.disconnectedAt && new Date(e.disconnectedAt).getTime() > cutoff
  );
}

// Latest projected-map camera per session code, for the GM's "show the map to
// the players" mode. In memory only and intentionally so: it changes on every
// frame of a pan, and is worthless the instant it's superseded. Held purely so
// a player joining mid-projection is framed straight away instead of waiting
// for the GM's next camera move. Dropped when the mode is switched off.
const liveMapCameras = new Map();

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  // ── Join session ──────────────────────────────────────────────────────────
  socket.on('join_session', async ({ sessionCode, role, name, dmPassword, gmToken, companion }) => {
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
        // TWO WAYS IN, AND THE ACCOUNT IS TRIED FIRST.
        //
        // The session password still works and always will — a guest GM, a
        // pack shared with a friend, a browser that has never signed in. An
        // account token is the other way: the GM proved they knew this
        // session's password once, when they paired it, and from then on their
        // login opens it on any machine. See gmAccounts.js.
        let valid = false;
        if (gmToken) {
          const account = await gmAccounts.accountForToken(db, gmToken);
          valid = !!account && await gmAccounts.ownsSession(db, account.id, { sessionId: session.id });
          if (valid) socket.data.gmAccountId = account.id;
        }
        if (!valid) valid = await bcrypt.compare(dmPassword || '', session.dm_password_hash);
        if (!valid) {
          socket.emit('error', { message: gmToken && !dmPassword
            ? 'This session is not paired to your GM account.'
            : 'Invalid GM password' });
          return;
        }
      }

      // Spectator: read-only TV view. No password, no character setup.
      // All write-side handlers gate on role === 'dm', so a spectator
      // socket can listen to broadcasts but cannot mutate anything.
      const safeRole = (role === 'dm' || role === 'spectator') ? role : 'player';

      socket.join(sessionCode);
      socket.data.sessionCode = sessionCode;
      // A COMPANION SCREEN: the player's own phone, open alongside their seat at
      // the table. It joins as a spectator on purpose — it must not occupy a
      // player slot, claim a token or count as somebody watching the map — but it
      // belongs to a named player, and things addressed to that player by name
      // (whispers, for one) have to reach it or the feature simply does not exist
      // on mobile.
      socket.data.companion = !!companion;
      socket.data.role = safeRole;
      socket.data.name = name || (safeRole === 'spectator' ? 'TV' : 'Adventurer');

      if (!sessionUsers[sessionCode]) sessionUsers[sessionCode] = new Map();
      sessionUsers[sessionCode].set(socket.id, { name: socket.data.name, role: safeRole });

      // Players (not the GM, not the TV) occupy a lobby seat. The seat exists
      // whether or not the session has started — the GM can send everyone back
      // to the lobby mid-game and the roster is already there.
      // A COMPANION SCREEN takes a seat only when its player has no other.
      //
      // A player at the table with a laptop AND a phone is one person and must
      // appear in the GM's roster once. But a player who joined on the phone
      // ALONE still has to be able to pick a character, and the roster is how
      // the GM learns what they picked — so the phone seats itself when, and
      // only when, nothing else is holding that name.
      const nameAlreadySeated = safeRole !== 'player'
        && !!socket.data.companion
        && ![...(lobbyRoster[sessionCode]?.values() || [])].some((x) => x.name === socket.data.name);

      if (safeRole === 'player' || nameAlreadySeated) {
        if (!lobbyRoster[sessionCode]) lobbyRoster[sessionCode] = new Map();
        // Seed the seat from whatever token this player already has. The seat
        // is keyed by socket id, so a reconnect (or a server restart) builds a
        // fresh empty one — without this the GM's roster reads "no character
        // yet" for players who are demonstrably holding a sheet, and can't be
        // added to a mapless combat. The client re-announces on connect too;
        // this covers clients running older JS that don't.
        let seededName = null;
        let seededCreature = null;
        try {
          const prior = await db.query(
            `SELECT st.id AS token_id, st.creature_id, COALESCE(c.name, st.name) AS char_name
               FROM session_tokens st
               LEFT JOIN creatures c ON st.creature_id = c.id
              WHERE st.session_id=$1 AND st.is_player=true AND st.player_name=$2
              ORDER BY st.id DESC LIMIT 1`,
            [session.id, socket.data.name]
          );
          if (prior.rows.length) {
            seededCreature = prior.rows[0].creature_id ?? null;
            seededName = prior.rows[0].char_name || null;
          }

          // ADOPT A CHARACTER THIS PLAYER ALREADY OWNS.
          //
          // The token is bound by `lobby_set_character`, which the phone fires
          // once, when the character is built. One missed emit — a socket that
          // had dropped, a client running older JS, a character built before
          // the GM spawned the seat — and the token keeps creature_id NULL
          // forever. The sheet then re-reads the token on every login, finds
          // no character, and says so; building another one announces just as
          // fragilely, which is how a player ends up with three copies of
          // themselves and no sheet.
          //
          // So the binding is re-established here, on every join, from state
          // that is already durable: the character rows this player owns. Only
          // an unambiguous single character is adopted — a player with several
          // is asked on the sheet rather than guessed at.
          // No prior token is no longer a reason to skip this. bindTokenToCharacter
          // creates the mapless seat when the player has none, so a phone-only
          // player who built a character last session gets their sheet back by
          // logging in — rather than having to re-pick it from the attach list
          // every time, which is what left Joris showing nothing but Edit.
          if (!seededCreature) {
            const owned = await db.query(
              `SELECT id, name FROM creatures
                WHERE is_player_character = true AND player_owner = $1
                  AND (crawler_state IS NULL OR crawler_state = '{}'::jsonb)
                ORDER BY id DESC`,
              [socket.data.name]
            );
            if (owned.rows.length === 1) {
              seededCreature = owned.rows[0].id;
              seededName = owned.rows[0].name || seededName;
              await bindTokenToCharacter(sessionCode, socket.data.name, seededCreature);
            }
          }
        } catch (err) {
          console.error('lobby seat seed failed:', err.message);
        }
        lobbyRoster[sessionCode].set(socket.id, {
          socketId: socket.id,
          name: socket.data.name,
          characterName: seededName,
          creatureId: seededCreature,
        });
      }

      if (!sessionConnectionLog[sessionCode]) sessionConnectionLog[sessionCode] = new Map();
      sessionConnectionLog[sessionCode].set(socket.data.name, {
        name: socket.data.name,
        role: safeRole,
        socketId: socket.id,
        connectedAt: new Date().toISOString(),
        disconnectedAt: null,
      });

      const state = await getSessionState(sessionCode);
      // Strip GM markers from non-GM state but include spell templates so
      // both players and spectators see plugin-driven AOE effects on the
      // map. Templates are non-interactive — write-side socket handlers
      // gate on socket.data.role === 'dm'.
      // Players only see terrain that's revealed OR not flagged as
      // hide_until_revealed. The GM sees everything (with a ghosted
      // tint client-side for the still-hidden ones). Spectators get the
      // same filtered slice as players — they're a TV-side audience
      // view, not a back-channel into hidden content.
      // See the note on `tokens:` below.
      const stripSneakForPlayer = (t) => {
        const { awareness, awareness_at, stealth_dc,
                last_contact_col, last_contact_row, ...rest } = t;
        return rest;
      };
      const visibleTerrain = terrainForPlayer(state.terrain);
      // Hidden portals are withheld the same way: a player who never receives
      // the row can't render it, and can't click a portal they can't see.
      const visiblePortals = (state.portals || []).filter(p => !p.hidden);
      const sendState = safeRole === 'dm'
        ? { ...state, spellTemplates: templatesForMap(sessionCode, state.session && state.session.map_id),
            inkColor: drawColorFor(sessionCode, socket.data.name),
            rollLog: sessionRollLog[sessionCode] || [],
            drawings: drawingsForMap(sessionCode, state.session && state.session.map_id) }
        : { ...state, spellTemplates: templatesForMap(sessionCode, state.session && state.session.map_id), dmMarkers: [], terrain: visibleTerrain, portals: visiblePortals,
            // Sneak mode's bookkeeping is GM-only, and has to be stripped here
            // rather than merely left undrawn: `awareness` on the wire is
            // `awareness` in the browser's console, and the player it concerns
            // is exactly the person who must not be able to read whether the
            // guard has noticed them. Same for the Stealth DC they are being
            // judged against and the spot a guard is walking over to inspect.
            tokens: (state.tokens || []).map(stripSneakForPlayer),
            // Secret table rolls stay out of the players' copy of the log —
            // otherwise a wandering-monster check the party wasn't told about
            // leaks to the next player who reconnects.
            inkColor: drawColorFor(sessionCode, socket.data.name),
            rollLog: (sessionRollLog[sessionCode] || []).filter((e) => !e.secret),
            drawings: drawingsForMap(sessionCode, state.session && state.session.map_id) };
      // Where this player's own token lives.
      //
      // A player stays on their token's map rather than following the GM
      // around, and the client tracks that in a dedicated state because the
      // broadcast `tokens` array only carries the SESSION map's tokens — a
      // token on another board simply isn't in it, so it can't be derived
      // client-side. That state was only ever set by `player_token_ready`, so
      // any join or reconnect that didn't re-fire that event left the client
      // with no idea where its token was, and it fell back to the GM's map.
      // Answering it here makes the join itself authoritative.
      // Answered for any non-GM join, not just role 'player'.
      //
      // The player's phone companion (/sheet) joins as a spectator on purpose:
      // it wants no lobby seat and needs no password, and the write handlers
      // grant a token to whoever carries its player_name rather than to a role.
      // It still has to be told WHICH token is its own, and on which board —
      // that is this lookup. A genuine TV spectator has a name no token
      // carries, so it matches nothing and the field is simply absent.
      if (safeRole !== 'dm' && socket.data.name) {
        try {
          const own = await db.query(
            `SELECT id, map_id FROM session_tokens
              WHERE session_id=$1 AND is_player=true AND player_name=$2
              ORDER BY id LIMIT 1`,
            [session.id, socket.data.name]
          );
          if (own.rows.length) {
            sendState.ownToken = {
              id: own.rows[0].id,
              mapId: own.rows[0].map_id ?? null,
            };
          }
        } catch (err) { console.error('ownToken lookup error:', err); }
      }

      const colors = sessionUserColors[sessionCode] || {};
      const currentUsers = Array.from(sessionUsers[sessionCode].values());
      socket.emit('session_joined', {
        state: sendState,
        role: safeRole,
        userColors: colors,
        users: currentUsers,
        // Frame a joiner immediately if the GM is already projecting the map.
        liveMapCamera: liveMapCameras.get(sessionCode) || null,
        ...(safeRole === 'dm' ? { connectionLog: getConnectionLog(sessionCode) } : {}),
      });
      // A shop already open when someone joins. Sent after the state so a
      // player who reconnects mid-haggle walks back into the same shop rather
      // than an empty counter.
      try {
        const openShop = (await db.query(
          'SELECT id FROM shops WHERE session_id=$1 AND is_open=true LIMIT 1', [session.id]
        )).rows[0];
        if (openShop) {
          const gmShop = await shopForGm(openShop.id);
          socket.emit(safeRole === 'dm' ? 'shop_changed' : 'shop_opened',
            safeRole === 'dm' ? gmShop : shopForPlayers(gmShop));
        }
      } catch (err) { console.error('open shop on join:', err.message); }

      // Re-attach the GM to whatever per-map ambients are currently
      // running so the GM panel can render the running list.
      if (role === 'dm') {
        socket.emit('session_ambients_changed', sessionAmbients[sessionCode] || {});
      }

      // Broadcast updated user list
      io.to(sessionCode).emit('users_updated', {
        users: Array.from(sessionUsers[sessionCode].values()),
        connectionLog: getConnectionLog(sessionCode),
      });
      // And the lobby roster, so the joiner sees who's already waiting and
      // everyone else sees them arrive.
      emitLobby(io, sessionCode);
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
      // ── A round's worth of movement ─────────────────────────────────────
      //
      // Only during a sneak sequence, and only for players. The GM is
      // adjudicating and has to be able to put anything anywhere; a budget
      // that argued with them would be a bug, not a rule. See movement.js.
      //
      // Read before the write, because the cost is measured from where the
      // token IS, and after this point that is gone.
      {
        const tok = (await db.query(
          `SELECT t.id, t.grid_col, t.grid_row, t.move_spent, t.move_window_at, t.sneaking,
                  t.move_mode, t.is_flying, t.elevation,
                  COALESCE(c.speed_walk, 30)   AS creature_speed,
                  COALESCE(c.speed_fly, 0)     AS creature_speed_fly,
                  COALESCE(c.speed_swim, 0)    AS creature_speed_swim,
                  COALESCE(c.speed_climb, 0)   AS creature_speed_climb,
                  COALESCE(c.speed_burrow, 0)  AS creature_speed_burrow,
                  s.sneak_mode, s.sneak_round_at
             FROM session_tokens t
             LEFT JOIN creatures c ON c.id = t.creature_id
             LEFT JOIN sessions s ON s.id = t.session_id
            WHERE t.id=$1`, [tokenId]
        )).rows[0];
        // Only tokens actually in the sequence, and only while one is running.
        if (tok && tok.sneak_mode && tok.sneaking) {
          const isGM = socket.data.role === 'dm';
          // EVERY mover is counted, including the GM. Counting only players was
          // the bug behind "no timer appears": the GM drags the party's tokens
          // from the DM view, nothing was recorded, so the round never started
          // and each new drag began from a full budget.
          //
          // The GM is still never REFUSED — they are adjudicating — they are
          // just charged for it.
          const verdict = isGM
            ? movement.considerUncapped(tok, gridCol, gridRow, tok.sneak_round_at)
            : movement.consider(tok, gridCol, gridRow, tok.sneak_round_at);
          if (!verdict.allowed) {
            // Put it back where it was. The mover's client has already drawn
            // the token at the new spot, so saying no has to include saying
            // where it actually is.
            socket.emit('token_moved', {
              tokenId, gridCol: tok.grid_col, gridRow: tok.grid_row,
            });
            socket.emit('move_blocked', {
              tokenId,
              costFt: Math.round(verdict.costFt),
              remaining: Math.round(verdict.remaining),
              budget: verdict.budget,
              resetsAt: verdict.resetsAt,
            });
            return;
          }
          await movement.commit(db, tokenId, verdict);
          io.to(sessionCode).emit('move_budget', {
            tokenId,
            spent: verdict.spent,
            budget: verdict.budget,
            remaining: verdict.remaining,
            resetsAt: verdict.resetsAt,
            overridden: !!verdict.overridden,
            mode: movement.speedOf(tok, tok.move_mode).mode,
          });
        }
      }

      await db.query(
        'UPDATE session_tokens SET grid_col=$1, grid_row=$2 WHERE id=$3',
        [gridCol, gridRow, tokenId]
      );
      io.to(sessionCode).emit('token_moved', { tokenId, gridCol, gridRow });
      sneakWatch(sessionCode);

      // Land on a portal and it fires. The move is broadcast first either way,
      // so every client sees the token walk onto the pad and then vanish —
      // rather than teleporting from wherever it started.
      const tokRes = await db.query(
        'SELECT id, map_id, size, size_squares FROM session_tokens WHERE id=$1',
        [tokenId]
      );
      if (!tokRes.rows.length) return;
      const token = tokRes.rows[0];
      if (token.map_id == null) return;
      const portal = await portalUnderToken(token.map_id, token, gridCol, gridRow);
      if (portal) await runPortal(sessionCode, portal, tokenId, io);
    } catch (err) {
      console.error(err);
    }
  });

  // ── Ships ─────────────────────────────────────────────────────────────────
  //
  // A ship carries its crew: aboard tokens store deck-local coords
  // (deck_col/deck_row) as the source of truth, and their world position
  // (grid_col/grid_row) is re-projected here every time the hull moves or
  // turns. Everything downstream — LOS, fog, auras, measurement — keeps
  // reading world coords and never learns ships exist.

  // Load a placed ship together with the map's grid metrics and its decks.
  // Everything the projection needs in one round trip.
  async function loadShipContext(shipId) {
    // Map extent must be derived the way MapStage derives it, because the grid
    // offset (half of extent % gridSize) comes out of it and both sides have to
    // land on the same squares. For a wildspace map the client sizes the field
    // as cols*gridSize — the stored width was frozen at whatever grid_size
    // applied when the map was made, so once the GM touches the grid slider the
    // stored pixels and the drawn field disagree, and crew would settle up to
    // half a square off the deck they were standing on.
    const r = await db.query(
      `SELECT ms.*,
              CASE WHEN m.map_type = 'wildspace' AND m.grid_cols > 0
                   THEN m.grid_cols * m.grid_size ELSE m.width END AS map_width,
              CASE WHEN m.map_type = 'wildspace' AND m.grid_rows > 0
                   THEN m.grid_rows * m.grid_size ELSE m.height END AS map_height,
              COALESCE(m.grid_size, s.grid_size, 50) AS grid_size
         FROM map_ships ms
         JOIN maps m ON ms.map_id = m.id
         LEFT JOIN sessions s ON m.session_id = s.id
        WHERE ms.id=$1`,
      [shipId]
    );
    if (!r.rows.length) return null;
    const ship = r.rows[0];
    const decks = await db.query(
      'SELECT * FROM ship_decks WHERE ship_id=$1 ORDER BY deck_index ASC',
      [ship.library_id]
    );
    return { ship, decks: decks.rows };
  }

  // Rewrite world coords for everyone aboard. Returns the patches so the
  // broadcast can carry them and clients don't each have to re-fetch.
  async function reprojectShipTokens(ctx) {
    if (!ctx) return [];
    const { ship, decks } = ctx;
    const tokens = await db.query(
      'SELECT id, deck_index, deck_col, deck_row, size, size_squares FROM session_tokens WHERE ship_id=$1',
      [ship.id]
    );
    const patches = [];
    for (const t of tokens.rows) {
      const deck = decks.find(d => d.deck_index === (t.deck_index ?? 0)) || decks[0];
      if (!deck || t.deck_col == null || t.deck_row == null) continue;
      // Size matters here: a large token's centre is a full square in from its
      // corner, so rotating without its footprint slides it further than a
      // medium one.
      const extent = shipMath.tokenExtent(t);
      const { col, row } = shipMath.deckToWorld({
        ship,
        deck,
        refDeck: shipMath.referenceDeck(decks),
        gridSize: ship.grid_size,
        mapWidth: ship.map_width,
        mapHeight: ship.map_height,
        deckCol: t.deck_col,
        deckRow: t.deck_row,
        extentCols: extent,
        extentRows: extent,
      });
      await db.query('UPDATE session_tokens SET grid_col=$1, grid_row=$2 WHERE id=$3', [col, row, t.id]);
      patches.push({ tokenId: t.id, gridCol: col, gridRow: row });
    }
    return patches;
  }

  // ── Templates anchored to a deck ──────────────────────────────────────────
  //
  // A spell template aboard a ship is the same problem the crew are: the thing
  // the GM placed belongs to the DECK, and its map position is a derived value
  // that has to be rewritten every time the hull moves or turns. So templates
  // get the same treatment tokens get — deck-local coords are the truth,
  // `points` is the projection — and every renderer downstream keeps reading
  // `points` in map pixels and never learns ships exist.
  //
  // How a template's geometry maps to deck-local points, by type:
  //
  //   circle  one centre, plus a radius that rotation cannot change.
  //   cone    origin and tip. Transforming BOTH is what makes a cone swing
  //           round with the hull, which is the whole point of anchoring it.
  //   line    both ends, same reason.
  //   square  centre ONLY, with its half-extents carried alongside. The
  //           renderer draws a square axis-aligned from two opposite corners,
  //           so transforming those corners would shrink the box to nothing at
  //           45° instead of turning it. Carrying the centre means an anchored
  //           square rides the deck without rotating — the honest answer for a
  //           shape the renderer cannot draw turned.
  function templateDeckAnchor(tpl, ctx, deckIndex) {
    const { ship, decks } = ctx;
    const deck = decks.find((d) => d.deck_index === deckIndex) || decks[0];
    if (!deck) return null;
    const p = tpl.points || [];
    const toDeck = (x, y) => {
      const r = shipMath.worldPxToDeckPx({
        ship, deck, refDeck: shipMath.referenceDeck(decks),
        gridSize: ship.grid_size, mapWidth: ship.map_width, mapHeight: ship.map_height,
        x, y,
      });
      return [r.dx, r.dy];
    };
    if (tpl.type === 'square') {
      if (p.length < 4) return null;
      const cx = (p[0] + p[2]) / 2, cy = (p[1] + p[3]) / 2;
      return {
        shipId: ship.id, deckIndex: deck.deck_index,
        pts: [toDeck(cx, cy)],
        boxHalf: [Math.abs(p[2] - p[0]) / 2, Math.abs(p[3] - p[1]) / 2],
      };
    }
    if (tpl.type === 'circle') {
      if (p.length < 3) return null;
      return { shipId: ship.id, deckIndex: deck.deck_index, pts: [toDeck(p[0], p[1])], boxHalf: null };
    }
    if (p.length < 4) return null;
    return {
      shipId: ship.id, deckIndex: deck.deck_index,
      pts: [toDeck(p[0], p[1]), toDeck(p[2], p[3])],
      boxHalf: null,
    };
  }

  // Deck-local anchor -> map pixels. Returns the new `points`, or null when the
  // anchor can no longer be resolved (deck removed, ship gone).
  function templatePointsFromAnchor(tpl, ctx) {
    const a = tpl.ship;
    if (!a || !Array.isArray(a.pts) || !a.pts.length) return null;
    const { ship, decks } = ctx;
    const deck = decks.find((d) => d.deck_index === a.deckIndex) || decks[0];
    if (!deck) return null;
    const toWorld = ([dx, dy]) => {
      const r = shipMath.deckPxToWorldPx({
        ship, deck, refDeck: shipMath.referenceDeck(decks),
        gridSize: ship.grid_size, mapWidth: ship.map_width, mapHeight: ship.map_height,
        dx, dy,
      });
      return [r.x, r.y];
    };
    if (tpl.type === 'square' && a.boxHalf) {
      const [cx, cy] = toWorld(a.pts[0]);
      const [hw, hh] = a.boxHalf;
      return [cx - hw, cy - hh, cx + hw, cy + hh];
    }
    if (tpl.type === 'circle') {
      const [cx, cy] = toWorld(a.pts[0]);
      // The radius rides along untouched — it is the one part of a template's
      // geometry a rotation cannot affect.
      return [cx, cy, tpl.points[2]];
    }
    if (a.pts.length < 2) return null;
    const [ax, ay] = toWorld(a.pts[0]);
    const [bx, by] = toWorld(a.pts[1]);
    return [ax, ay, bx, by];
  }

  // Rewrite every template riding this hull, and tell the room. Called from the
  // same two places the crew are re-projected from.
  function reprojectShipTemplates(sessionCode, ctx) {
    if (!ctx) return;
    const list = sessionTemplates[sessionCode];
    if (!list || !list.length) return;
    for (const tpl of list) {
      if (!tpl.ship || tpl.ship.shipId !== ctx.ship.id) continue;
      const pts = templatePointsFromAnchor(tpl, ctx);
      if (!pts) continue;
      tpl.points = pts;
      io.to(sessionCode).emit('template_updated', tpl);
    }
  }

  // Which ship's visible deck is under this map-pixel point, if any.
  //
  // The ACTIVE deck specifically: that is the level drawn on the board, so it
  // is the one the GM was looking at when they dragged the template out. Top
  // hull first, matching findDeckSquare — the ship drawn last is the one the
  // GM believes they clicked.
  async function shipDeckAtMapPx(mapId, x, y) {
    if (mapId == null) return null;
    const mapRes = await db.query(
      `SELECT m.id,
              CASE WHEN m.map_type = 'wildspace' AND m.grid_cols > 0
                   THEN m.grid_cols * m.grid_size ELSE m.width END AS width,
              CASE WHEN m.map_type = 'wildspace' AND m.grid_rows > 0
                   THEN m.grid_rows * m.grid_size ELSE m.height END AS height,
              COALESCE(m.grid_size, s.grid_size, 50) AS grid_size
         FROM maps m LEFT JOIN sessions s ON m.session_id = s.id
        WHERE m.id=$1`,
      [mapId]
    );
    if (!mapRes.rows.length) return null;
    const map = mapRes.rows[0];
    const ships = await db.query('SELECT * FROM map_ships WHERE map_id=$1 ORDER BY z_index, id', [mapId]);
    for (let i = ships.rows.length - 1; i >= 0; i--) {
      const ship = { ...ships.rows[i], grid_size: map.grid_size, map_width: map.width, map_height: map.height };
      const decks = await db.query(
        'SELECT * FROM ship_decks WHERE ship_id=$1 ORDER BY deck_index ASC',
        [ship.library_id]
      );
      if (!decks.rows.length) continue;
      const deck = decks.rows.find((d) => d.deck_index === (ship.active_deck ?? 0)) || decks.rows[0];
      const local = shipMath.worldPxToDeckPx({
        ship, deck, refDeck: shipMath.referenceDeck(decks.rows),
        gridSize: map.grid_size, mapWidth: map.width, mapHeight: map.height,
        x, y,
      });
      if (!shipMath.isPxOnDeck(deck, local.dx, local.dy, map.grid_size)) continue;
      return { ctx: { ship, decks: decks.rows }, deckIndex: deck.deck_index };
    }
    return null;
  }

  // A default spawn set aboard this ship is anchored to the deck the same way
  // the crew are, so it has to be re-projected on the same events. Without it
  // the marker stays where the ship used to be and players arrive in open water
  // — the exact failure putting the spawn aboard was meant to prevent.
  async function reprojectShipSpawn(ctx) {
    if (!ctx) return null;
    const { ship, decks } = ctx;
    const mapRes = await db.query(
      `SELECT id, spawn_deck_index, spawn_deck_col, spawn_deck_row
         FROM maps WHERE id=$1 AND spawn_ship_id=$2`,
      [ship.map_id, ship.id]
    );
    if (!mapRes.rows.length) return null;
    const m = mapRes.rows[0];
    if (m.spawn_deck_col == null) return null;
    const deck = decks.find(d => d.deck_index === (m.spawn_deck_index ?? 0)) || decks[0];
    if (!deck) return null;
    const { col, row } = shipMath.deckToWorld({
      ship, deck,
      refDeck: shipMath.referenceDeck(decks),
      gridSize: ship.grid_size,
      mapWidth: ship.map_width,
      mapHeight: ship.map_height,
      deckCol: m.spawn_deck_col,
      deckRow: m.spawn_deck_row,
    });
    await db.query('UPDATE maps SET spawn_col=$1, spawn_row=$2 WHERE id=$3', [col, row, m.id]);
    return { col, row };
  }

  // Is this player's token standing on the ship's helm right now? Deck-local
  // coords are the truth, so this is a plain square test that needs no
  // knowledge of where the hull happens to be pointing.
  //
  // A token covers its footprint, so a Large creature at the helm's edge is
  // still at the helm — matching what the player sees, which is their token's
  // box sitting over the lit square.
  async function tokenAtHelm(ctx, playerName) {
    if (!playerName) return false;
    const helmDecks = (ctx.decks || []).filter(d => d.helm && d.helm.col != null);
    if (!helmDecks.length) return false;
    // The creature is joined in because standing on the helm is only half the
    // test: a spelljamming helm is an attuned magic item, so the pilot needs
    // spell slots. `spell_slots` comes along because a homebrew or custom class
    // carries its slots there rather than in any table we know about — see
    // piloting.js.
    const r = await db.query(
      `SELECT st.deck_index, st.deck_col, st.deck_row, st.size, st.size_squares,
              c.char_class, c.char_subclass, c.char_level, c.multiclasses, c.spell_slots
         FROM session_tokens st
         LEFT JOIN creatures c ON st.creature_id = c.id
        WHERE st.ship_id=$1 AND st.player_name=$2 AND st.deck_col IS NOT NULL`,
      [ctx.ship.id, playerName]
    );
    for (const t of r.rows) {
      const deck = helmDecks.find(d => d.deck_index === (t.deck_index ?? 0));
      if (!shipMath.isAtHelm(deck, t.deck_col, t.deck_row, t)) continue;
      if (!canPilotHelm(t)) continue;
      return true;
    }
    return false;
  }

  // May this socket drive the ship? The GM always can. A player can if they're
  // attuned to the ship's helm, or — the physical version of the same thing —
  // if their token is standing on the helm square right now. Standing at the
  // wheel is what the fiction actually describes, and it means a ship can
  // change hands mid-session without the GM re-assigning attunement.
  async function canPilot(socket, ctx) {
    if (socket.data.role === 'dm') return true;
    const ship = ctx.ship;
    if (ship.attuned_player && ship.attuned_player === socket.data.name) return true;
    return tokenAtHelm(ctx, socket.data.name);
  }

  socket.on('place_ship', async ({ libraryId, mapId, gridCol, gridRow, name }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      const lib = await db.query('SELECT * FROM ship_library WHERE id=$1', [libraryId]);
      if (!lib.rows.length) return;
      // Session comes from the map rather than the payload — the client
      // already told us which map, and deriving it here means a wrong or
      // missing sessionId can't orphan the row.
      const mapRow = await db.query('SELECT session_id FROM maps WHERE id=$1', [mapId]);
      if (!mapRow.rows.length) return;
      const r = await db.query(
        `INSERT INTO map_ships (session_id, map_id, library_id, name, grid_col, grid_row, current_hp)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [
          mapRow.rows[0].session_id,
          mapId,
          libraryId,
          name || lib.rows[0].name || 'Ship',
          gridCol || 0,
          gridRow || 0,
          lib.rows[0].hull_hp ?? null,
        ]
      );
      // Re-read through the library join rather than shipping the bare INSERT
      // row: clients need hull_hp, armor_class, speed and the class name, and a
      // ship placed mid-session would otherwise carry none of them until the
      // next full refresh — which is what made the GM's hull controls think a
      // 300 HP ship had a maximum of zero.
      const enriched = await db.query(
        `SELECT ms.*, sl.name AS class_name, sl.speed, sl.armor_class, sl.hull_hp, sl.air_bubble_ft,
                COALESCE(
                  (SELECT json_agg(sd.* ORDER BY sd.deck_index)
                     FROM ship_decks sd WHERE sd.ship_id = ms.library_id),
                  '[]'::json
                ) AS decks
           FROM map_ships ms
           LEFT JOIN ship_library sl ON ms.library_id = sl.id
          WHERE ms.id=$1`,
        [r.rows[0].id]
      );
      const ctx = await loadShipContext(r.rows[0].id);
      const placed = enriched.rows[0] || r.rows[0];
      // Deck bulkheads and doors follow the hull — see regenerateShipWalls.
      broadcastShipGeometry(sessionCode, await regenerateShipWalls(r.rows[0].id));
      io.to(sessionCode).emit('ship_placed', { ship: { ...placed, decks: ctx ? ctx.decks : (placed.decks || []) } });
    } catch (err) {
      console.error('place_ship error:', err);
    }
  });

  socket.on('move_ship', async ({ shipId, gridCol, gridRow }) => {
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      const ctx = await loadShipContext(shipId);
      if (!ctx) return;
      if (!(await canPilot(socket, ctx))) {
        // Bounce the hull back on the refused client. It moved the ship
        // optimistically while dragging, so returning in silence left it
        // showing a position the server never accepted — the player saw
        // themselves sail a ship they are not allowed to steer, and nothing
        // corrected it until the next unrelated broadcast.
        socket.emit('ship_moved', {
          shipId, gridCol: ctx.ship.grid_col, gridRow: ctx.ship.grid_row, tokenPatches: [],
        });
        return;
      }
      await db.query('UPDATE map_ships SET grid_col=$1, grid_row=$2 WHERE id=$3', [gridCol, gridRow, shipId]);
      ctx.ship.grid_col = gridCol;
      ctx.ship.grid_row = gridRow;
      const tokenPatches = await reprojectShipTokens(ctx);
      const spawnMoved = await reprojectShipSpawn(ctx);
      reprojectShipTemplates(sessionCode, ctx);
      // Deck bulkheads and doors follow the hull — see regenerateShipWalls.
      broadcastShipGeometry(sessionCode, await regenerateShipWalls(shipId));
      io.to(sessionCode).emit('ship_moved', { shipId, gridCol, gridRow, tokenPatches });
      if (spawnMoved) io.to(sessionCode).emit('spawn_point_set', spawnMoved);
    } catch (err) {
      console.error('move_ship error:', err);
    }
  });

  socket.on('rotate_ship', async ({ shipId, rotation }) => {
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      const ctx = await loadShipContext(shipId);
      if (!ctx) return;
      if (!(await canPilot(socket, ctx))) {
        // Same correction as move_ship: the client turned the hull locally
        // while dragging the handle, so send the real heading back.
        socket.emit('ship_rotated', { shipId, rotation: ctx.ship.rotation, tokenPatches: [] });
        return;
      }
      const rot = Number(rotation) || 0;
      await db.query('UPDATE map_ships SET rotation=$1 WHERE id=$2', [rot, shipId]);
      ctx.ship.rotation = rot;
      const tokenPatches = await reprojectShipTokens(ctx);
      const spawnMoved = await reprojectShipSpawn(ctx);
      reprojectShipTemplates(sessionCode, ctx);
      // Deck bulkheads and doors follow the hull — see regenerateShipWalls.
      broadcastShipGeometry(sessionCode, await regenerateShipWalls(shipId));
      io.to(sessionCode).emit('ship_rotated', { shipId, rotation: rot, tokenPatches });
      if (spawnMoved) io.to(sessionCode).emit('spawn_point_set', spawnMoved);
    } catch (err) {
      console.error('rotate_ship error:', err);
    }
  });

  // Which level is drawn in place on the map. GM-only: it changes what every
  // player is looking at, so it's a scene control rather than a personal view.
  // Which storey of a multi-level map is drawn.
  //
  // GM-only and broadcast to the room, exactly like set_ship_deck: changing
  // floor changes what every player is looking at, so it is a scene control
  // rather than a personal view. Tokens are NOT moved — a token belongs to the
  // level it is standing on, and the GM looking at the floor above does not
  // carry the party up there with them.
  // Move a token to another storey.
  //
  // Separate from move_token because changing floor is not a move in the plane:
  // the token can land at the same square on a different level, and everything
  // that watches positions must not treat that as a step taken. The GM may send
  // any token anywhere; a player may only move their OWN token, and only onto a
  // level the map actually has.
  socket.on('set_token_level', async ({ tokenId, levelIndex, gridCol, gridRow }) => {
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      const sessionRes = await db.query('SELECT id, map_id FROM sessions WHERE session_code=$1', [sessionCode]);
      if (!sessionRes.rows.length) return;
      const { id: sessionId, map_id: mapId } = sessionRes.rows[0];
      if (mapId == null) return;

      const tokRes = await db.query(
        'SELECT id, player_name, is_player FROM session_tokens WHERE id=$1 AND session_id=$2',
        [tokenId, sessionId]
      );
      if (!tokRes.rows.length) return;
      const tok = tokRes.rows[0];
      if (socket.data.role !== 'dm') {
        // A player moves their own token and nothing else.
        if (!tok.is_player || tok.player_name !== socket.data.name) return;
      }

      const levels = await db.query(
        'SELECT level_index FROM map_levels WHERE map_id=$1', [mapId]
      );
      const want = Math.max(0, Math.trunc(Number(levelIndex) || 0));
      // A map with no levels has exactly one, and it is 0.
      if (levels.rows.length && !levels.rows.some((r) => r.level_index === want)) return;
      if (!levels.rows.length && want !== 0) return;

      const fields = ['level_index=$1'];
      const values = [want];
      if (gridCol !== undefined && gridRow !== undefined) {
        values.push(Number(gridCol) || 0); fields.push(`grid_col=$${values.length}`);
        values.push(Number(gridRow) || 0); fields.push(`grid_row=$${values.length}`);
      }
      values.push(tokenId);
      await db.query(`UPDATE session_tokens SET ${fields.join(', ')} WHERE id=$${values.length}`, values);

      // The SAME joined shape every other token query returns.
      //
      // A bare `SELECT *` on session_tokens carries none of the creature
      // columns — image_path, speeds, initiative — and the clients replace the
      // whole token object with whatever arrives. So a token that took the
      // stairs came back stripped of its artwork and its stats: it kept its
      // position and lost its face.
      const row = (await db.query(
        `SELECT st.*, c.image_path AS creature_image, c.display_image_path AS creature_display_image, c.standee_image_path AS creature_standee, c.base_color AS creature_base_color, c.base_opacity AS creature_base_opacity, c.token_height_ft AS creature_token_height,
                c.dexterity AS creature_dex, COALESCE(c.speed_walk, 30) AS creature_speed,
                COALESCE(c.speed_fly, 0) AS creature_speed_fly, COALESCE(c.speed_swim, 0) AS creature_speed_swim, COALESCE(c.speed_climb, 0) AS creature_speed_climb, COALESCE(c.speed_burrow, 0) AS creature_speed_burrow,
                COALESCE(c.initiative_bonus, 0) AS initiative_bonus
           FROM session_tokens st
           LEFT JOIN creatures c ON st.creature_id = c.id
          WHERE st.id=$1`,
        [tokenId]
      )).rows[0];
      if (row) io.to(sessionCode).emit('token_level_changed', { token: row });
    } catch (err) {
      console.error('set_token_level error:', err);
    }
  });

  // Reclassify an opening. GM only — it changes what everyone can see through.
  socket.on('set_door_kind', async ({ doorId, kind }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      const want = kind === 'window' ? 'window' : 'door';
      const res = await db.query(
        'UPDATE doors SET portal_kind=$1 WHERE id=$2 RETURNING id, portal_kind',
        [want, doorId]
      );
      // Narrow event carrying just the field that changed, matching
      // door_toggled and door_dir_flipped. A general 'door_updated' was a name
      // nothing was listening for.
      if (res.rows.length) {
        io.to(sessionCode).emit('door_kind_changed', {
          doorId: res.rows[0].id,
          portalKind: res.rows[0].portal_kind,
        });
      }
    } catch (err) {
      console.error('set_door_kind error:', err);
    }
  });

  socket.on('set_map_level', async ({ levelIndex }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      const mapId = await dmCurrentMapId();
      if (mapId == null) return;
      const levels = await db.query(
        'SELECT level_index FROM map_levels WHERE map_id=$1 ORDER BY level_index',
        [mapId]
      );
      if (!levels.rows.length) return;
      // Whitelisted against the levels this map actually has, so a stale client
      // cannot leave the map showing a floor that does not exist.
      const want = Number(levelIndex);
      if (!levels.rows.some((r) => r.level_index === want)) return;
      await db.query('UPDATE maps SET active_level=$1 WHERE id=$2', [want, mapId]);
      io.to(sessionCode).emit('map_level_changed', { mapId, levelIndex: want });
    } catch (err) {
      console.error('set_map_level error:', err);
    }
  });

  socket.on('set_ship_deck', async ({ shipId, deckIndex }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      await db.query('UPDATE map_ships SET active_deck=$1 WHERE id=$2', [deckIndex, shipId]);
      // Deck bulkheads and doors follow the hull — see regenerateShipWalls.
      broadcastShipGeometry(sessionCode, await regenerateShipWalls(shipId));
      io.to(sessionCode).emit('ship_deck_changed', { shipId, deckIndex });
    } catch (err) {
      console.error('set_ship_deck error:', err);
    }
  });

  // Hull damage, applied by the GM mid-fight. Clamped to the class's hull_hp
  // so a heal can't push a ship past full, and floored at 0 — a wreck is 0 HP,
  // not negative. current_hp starts NULL (meaning "undamaged"), so the clamp
  // resolves that against the library row rather than trusting the client.
  // `delta` (damage/repair) is the preferred form and `currentHp` (set to an
  // exact value) the fallback. Deltas are applied against the SERVER's current
  // value, never the client's: a client whose ship row is missing hull_hp — or
  // simply stale — would otherwise compute its new total from a wrong baseline
  // and write that over a healthy hull.
  socket.on('update_ship_hp', async ({ shipId, currentHp, delta }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      const cur = await db.query(
        `SELECT ms.id, ms.current_hp, COALESCE(sl.hull_hp, 0) AS hull_hp
           FROM map_ships ms LEFT JOIN ship_library sl ON ms.library_id = sl.id
          WHERE ms.id=$1`,
        [shipId]
      );
      if (!cur.rows.length) return;
      const maxHp = Number(cur.rows[0].hull_hp) || 0;
      // NULL current_hp means "undamaged", which is the class's full hull.
      const base = cur.rows[0].current_hp == null ? maxHp : Number(cur.rows[0].current_hp) || 0;

      let hp;
      if (delta != null && delta !== '') {
        const d = Math.floor(Number(delta));
        if (!Number.isFinite(d)) return;
        hp = base + d;
      } else {
        hp = Math.floor(Number(currentHp));
        if (!Number.isFinite(hp)) return;
      }
      hp = Math.max(0, maxHp > 0 ? Math.min(maxHp, hp) : hp);

      await db.query('UPDATE map_ships SET current_hp=$1 WHERE id=$2', [hp, shipId]);
      io.to(sessionCode).emit('ship_hp_changed', { shipId, currentHp: hp });
    } catch (err) {
      console.error('update_ship_hp error:', err);
    }
  });

  socket.on('update_ship_initiative', async ({ shipId, initiative }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      const init = initiative == null || initiative === '' ? null : Math.floor(Number(initiative));
      if (init != null && !Number.isFinite(init)) return;
      await db.query('UPDATE map_ships SET initiative=$1 WHERE id=$2', [init, shipId]);
      io.to(sessionCode).emit('ship_initiative_changed', { shipId, initiative: init });
    } catch (err) {
      console.error('update_ship_initiative error:', err);
    }
  });

  // Put a hull into the running fight, or pull it out. Separate from
  // set_combat's token list because ships get added mid-battle as often as
  // they start in one — a second raider decloaking is the normal case.
  socket.on('set_ship_combat', async ({ shipId, inCombat }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      await db.query('UPDATE map_ships SET in_combat=$1 WHERE id=$2', [!!inCombat, shipId]);
      io.to(sessionCode).emit('ship_combat_changed', { shipId, inCombat: !!inCombat });
    } catch (err) {
      console.error('set_ship_combat error:', err);
    }
  });

  socket.on('set_ship_attunement', async ({ shipId, playerName }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      await db.query('UPDATE map_ships SET attuned_player=$1 WHERE id=$2', [playerName || null, shipId]);
      io.to(sessionCode).emit('ship_attunement_changed', { shipId, playerName: playerName || null });
    } catch (err) {
      console.error('set_ship_attunement error:', err);
    }
  });

  // Board / move-about-deck / disembark are one event: the client reports
  // where the drag ended in world coords and which ship (if any) it landed on,
  // and the server works out which side of the rail that is.
  socket.on('token_deck_move', async ({ tokenId, shipId, deckIndex, gridCol, gridRow }) => {
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      if (shipId == null) {
        // Disembarked — world coords become the truth again.
        await db.query(
          // deck_index is cleared with the binding: a token that leaves the
          // ship must forget which level it was on, or re-boarding later would
          // silently drop it back onto a deck it never walked to — and while
          // off-ship a stale index makes the viewer follow a level of a ship
          // they aren't on.
          'UPDATE session_tokens SET ship_id=NULL, deck_index=0, deck_col=NULL, deck_row=NULL, grid_col=$1, grid_row=$2 WHERE id=$3',
          [gridCol, gridRow, tokenId]
        );
        io.to(sessionCode).emit('token_deck_moved', {
          tokenId, shipId: null, deckIndex: 0, gridCol, gridRow, deckCol: null, deckRow: null,
        });
        return;
      }

      const ctx = await loadShipContext(shipId);
      if (!ctx) return;

      // Same footprint the reprojection will use when the ship next turns —
      // if these two disagree the token lands one place on boarding and
      // another on the first rotation. The current binding comes back with it
      // so we can tell boarding from moving about a deck already underfoot.
      const sizeRow = await db.query(
        'SELECT size, size_squares, ship_id, deck_index FROM session_tokens WHERE id=$1',
        [tokenId]
      );
      const prev = sizeRow.rows[0] || {};
      const moveExtent = shipMath.tokenExtent(prev);

      // Which level does this token land on?
      //
      //   * Coming aboard from open map — you arrive on the MAIN deck. You
      //     can't step straight onto a topgallant from outside; use the stairs.
      //   * Already aboard — you keep the deck you were on. Walking around
      //     doesn't change level; only a transition does.
      //   * The GM is exempt from both. They place tokens deliberately, using
      //     the deck buttons to pick the level first, so their choice wins.
      const isDM = socket.data.role === 'dm';
      const boarding = prev.ship_id == null || prev.ship_id !== shipId;
      let idx;
      if (isDM) {
        idx = deckIndex ?? ctx.ship.active_deck ?? 0;
      } else if (boarding) {
        const md = shipMath.mainDeck(ctx.decks);
        idx = md ? md.deck_index : 0;
      } else {
        idx = prev.deck_index ?? 0;
      }
      // Sails are decoration — nobody stands on them, so they're never a
      // landing candidate however the client labelled the drop.
      const standable = ctx.decks.filter(d => !d.is_sails);
      const deck = standable.find(d => d.deck_index === idx) || standable[0];
      if (!deck) return;

      const local = shipMath.worldToDeck({
        ship: ctx.ship,
        deck,
        refDeck: shipMath.referenceDeck(ctx.decks),
        gridSize: ctx.ship.grid_size,
        mapWidth: ctx.ship.map_width,
        mapHeight: ctx.ship.map_height,
        worldCol: gridCol,
        worldRow: gridRow,
        extentCols: moveExtent,
        extentRows: moveExtent,
      });

      // The chosen deck might not be the one under the drop at all.
      //
      // The client names the deck it was DRAWING, and the GM's is whichever
      // level they last clicked. Decks are different sizes and sit at different
      // offsets — the upper decks here are 4 wide at offset_col 3 against a
      // 10-wide main deck — so dragging a token that stands on the main deck
      // while an upper deck is selected tested the drop against the small box,
      // landed outside it, and threw the crew overboard. Whole parties came off
      // the ship just from the GM flicking levels.
      //
      // So before concluding "over the rail", ask every other deck whether the
      // drop is on it, nearest first: the deck the token was already on, then
      // the main deck, then the rest.
      let landedDeck = deck;
      let landedLocal = local;
      if (!shipMath.isOnDeck(deck, local.col, local.row)) {
        const md = shipMath.mainDeck(ctx.decks);
        const order = [
          ...(prev.deck_index != null ? standable.filter(d => d.deck_index === prev.deck_index) : []),
          ...(md ? [md] : []),
          ...standable,
        ].filter((d, i, arr) => d !== deck && arr.indexOf(d) === i);
        for (const cand of order) {
          const l = shipMath.worldToDeck({
            ship: ctx.ship,
            deck: cand,
            refDeck: shipMath.referenceDeck(ctx.decks),
            gridSize: ctx.ship.grid_size,
            mapWidth: ctx.ship.map_width,
            mapHeight: ctx.ship.map_height,
            worldCol: gridCol,
            worldRow: gridRow,
            extentCols: moveExtent,
            extentRows: moveExtent,
          });
          if (shipMath.isOnDeck(cand, l.col, l.row)) { landedDeck = cand; landedLocal = l; break; }
        }
      }

      // Dragged past the rail — treat as stepping off rather than clamping,
      // so a token can always be pulled back onto open map.
      if (!shipMath.isOnDeck(landedDeck, landedLocal.col, landedLocal.row)) {
        await db.query(
          // deck_index is cleared with the binding: a token that leaves the
          // ship must forget which level it was on, or re-boarding later would
          // silently drop it back onto a deck it never walked to — and while
          // off-ship a stale index makes the viewer follow a level of a ship
          // they aren't on.
          'UPDATE session_tokens SET ship_id=NULL, deck_index=0, deck_col=NULL, deck_row=NULL, grid_col=$1, grid_row=$2 WHERE id=$3',
          [gridCol, gridRow, tokenId]
        );
        io.to(sessionCode).emit('token_deck_moved', {
          tokenId, shipId: null, deckIndex: 0, gridCol, gridRow, deckCol: null, deckRow: null,
        });
        return;
      }

      // Whatever deck the drop actually landed on — which is the requested one
      // unless the fallback above had to go looking.
      const finalIdx = landedDeck.deck_index;
      await db.query(
        `UPDATE session_tokens
            SET ship_id=$1, deck_index=$2, deck_col=$3, deck_row=$4, grid_col=$5, grid_row=$6
          WHERE id=$7`,
        [shipId, finalIdx, landedLocal.col, landedLocal.row, gridCol, gridRow, tokenId]
      );
      io.to(sessionCode).emit('token_deck_moved', {
        tokenId, shipId, deckIndex: finalIdx, gridCol, gridRow,
        deckCol: landedLocal.col, deckRow: landedLocal.row,
      });
    } catch (err) {
      console.error('token_deck_move error:', err);
    }
  });

  // Taking the stairs. The transition already knows the paired square on the
  // target deck, so the token lands where the stairwell comes out rather than
  // at the same coords on a differently-shaped level.
  socket.on('token_change_deck', async ({ tokenId, shipId, toDeck, toCol, toRow }) => {
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      const ctx = await loadShipContext(shipId);
      if (!ctx) return;
      const deck = ctx.decks.find(d => d.deck_index === toDeck);
      if (!deck) return;
      const stairsRow = await db.query('SELECT size, size_squares FROM session_tokens WHERE id=$1', [tokenId]);
      const stairsExtent = shipMath.tokenExtent(stairsRow.rows[0]);
      const { col, row } = shipMath.deckToWorld({
        ship: ctx.ship,
        deck,
        refDeck: shipMath.referenceDeck(ctx.decks),
        gridSize: ctx.ship.grid_size,
        mapWidth: ctx.ship.map_width,
        mapHeight: ctx.ship.map_height,
        deckCol: toCol,
        deckRow: toRow,
        extentCols: stairsExtent,
        extentRows: stairsExtent,
      });
      await db.query(
        `UPDATE session_tokens
            SET ship_id=$1, deck_index=$2, deck_col=$3, deck_row=$4, grid_col=$5, grid_row=$6
          WHERE id=$7`,
        [shipId, toDeck, toCol, toRow, col, row, tokenId]
      );
      io.to(sessionCode).emit('token_deck_moved', {
        tokenId, shipId, deckIndex: toDeck, gridCol: col, gridRow: row, deckCol: toCol, deckRow: toRow,
      });
    } catch (err) {
      console.error('token_change_deck error:', err);
    }
  });

  // Re-read every placed ship on a map and push it to the room.
  //
  // Placed ships carry a snapshot of their library row and decks, so editing
  // the class — air envelope, stats, deck art, alignment offsets — leaves the
  // map showing stale values until someone reloads. The builder fires this
  // after any library mutation so the change lands on the table immediately.
  socket.on('refresh_ships', async ({ mapId }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode || mapId == null) return;
    try {
      const r = await db.query(
        `SELECT ms.*, sl.name AS class_name, sl.speed, sl.armor_class, sl.hull_hp, sl.air_bubble_ft,
                COALESCE(
                  (SELECT json_agg(sd.* ORDER BY sd.deck_index)
                     FROM ship_decks sd WHERE sd.ship_id = ms.library_id),
                  '[]'::json
                ) AS decks
           FROM map_ships ms
           LEFT JOIN ship_library sl ON ms.library_id = sl.id
          WHERE ms.map_id=$1
          ORDER BY ms.z_index, ms.id`,
        [mapId]
      );
      io.to(sessionCode).emit('ships_refreshed', { ships: r.rows });
    } catch (err) {
      console.error('refresh_ships error:', err);
    }
  });

  // Take a ship off the map.
  //
  //   effect — how it goes: 'none' (just gone), 'explosion', 'magical',
  //            'implosion'. Purely presentational; the ship is equally deleted
  //            either way, but the table gets to watch.
  //   crew   — 'adrift' leaves everyone aboard floating at their last world
  //            position, 'delete' takes them with the ship. Losing a hull
  //            shouldn't silently lose the party, so 'adrift' is the default
  //            for anything that doesn't say.
  // Rename a PLACED hull.
  //
  // map_ships.name is the individual ship; ship_library.name is its class. The
  // helm readout, the deck panel and the combat list all show the placed name,
  // so renaming the class in the builder — which is what a GM naturally
  // reaches for — left the hull on the board still called whatever it was
  // named when it was dropped.
  socket.on('rename_ship', async ({ shipId, name }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      const clean = String(name || '').trim().slice(0, 120);
      if (!clean) return;
      const r = await db.query(
        'UPDATE map_ships SET name=$1 WHERE id=$2 RETURNING id, name',
        [clean, shipId]
      );
      if (!r.rows.length) return;
      io.to(sessionCode).emit('ship_renamed', { shipId, name: r.rows[0].name });
    } catch (err) { console.error('rename_ship error:', err); }
  });

  socket.on('remove_ship', async ({ shipId, effect, crew }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      // Geometry has to be read BEFORE the delete — the animation is anchored
      // to where the ship was, and by the time clients receive this it's gone.
      const ctx = await loadShipContext(shipId);
      const ref = ctx ? shipMath.referenceDeck(ctx.decks) : null;

      const aboard = await db.query('SELECT id FROM session_tokens WHERE ship_id=$1', [shipId]);
      const crewIds = aboard.rows.map(r => r.id);

      if (crew === 'delete' && crewIds.length) {
        await db.query('DELETE FROM session_tokens WHERE id = ANY($1::int[])', [crewIds]);
        for (const tokenId of crewIds) {
          io.to(sessionCode).emit('token_removed', { tokenId });
        }
      } else if (crewIds.length) {
        await db.query(
          'UPDATE session_tokens SET ship_id=NULL, deck_index=0, deck_col=NULL, deck_row=NULL WHERE ship_id=$1',
          [shipId]
        );
      }

      await db.query('DELETE FROM map_ships WHERE id=$1', [shipId]);
      if (effect && effect !== 'none' && ctx && ref) {
        io.to(sessionCode).emit('ship_destroyed', {
          shipId,
          effect,
          ts: Date.now(),
          gridCol: Number(ctx.ship.grid_col),
          gridRow: Number(ctx.ship.grid_row),
          cols: Number(ref.grid_cols),
          rows: Number(ref.grid_rows),
          offsetCol: Number(ref.offset_col || 0),
          offsetRow: Number(ref.offset_row || 0),
        });
      }
      io.to(sessionCode).emit('ship_removed', { shipId });
    } catch (err) {
      console.error('remove_ship error:', err);
    }
  });

  // ── GM "Send to map" — physically relocate a token to another map.
  // Used by the right-click context menu and by warp-point activation.
  // Token's session_tokens.map_id is updated, and grid_col/grid_row are
  // reset to the destination map's spawn point so the token doesn't
  // land out of bounds. Broadcast carries the from/to map ids so each
  // client can patch its own view: the source map removes the token,
  // the destination map (if anyone is on it) re-fetches.
  socket.on('dm_send_token_to_map', async ({ tokenId, mapId, spawnPointId }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      const prev = await db.query(
        'SELECT map_id, session_id, is_player, player_name FROM session_tokens WHERE id=$1',
        [tokenId]
      );
      if (!prev.rows.length) return;
      const fromMapId = prev.rows[0].map_id ?? null;
      const sessionId = prev.rows[0].session_id;
      const movedPlayerName = prev.rows[0].is_player ? prev.rows[0].player_name : null;
      const mapRes = await db.query(
        `SELECT m.id, m.spawn_col, m.spawn_row, m.spawn_radius, m.width, m.height,
                COALESCE(m.grid_size, s.grid_size, 50) AS grid_size
           FROM maps m LEFT JOIN sessions s ON m.session_id = s.id
          WHERE m.id=$1`,
        [mapId]
      );
      if (!mapRes.rows.length) return;
      const m = mapRes.rows[0];
      // Default landing: the map's spawn_col/spawn_row. If the GM picked
      // a named spawn point we look its coords up and use those instead;
      // a missing/foreign spawn point silently falls back to the default
      // so a stale UI can't strand a token off-map. When the chosen
      // landing zone has a non-zero radius we scatter inside the bubble
      // so multiple tokens don't pile on the same tile.
      let centerCol = m.spawn_col ?? 0;
      let centerRow = m.spawn_row ?? 0;
      let radius = m.spawn_radius ?? 0;
      let polygon = null;
      if (spawnPointId != null) {
        const sp = await db.query(
          'SELECT grid_col, grid_row, radius, shape_points FROM map_spawn_points WHERE id=$1 AND map_id=$2',
          [spawnPointId, mapId]
        );
        if (sp.rows.length) {
          centerCol = sp.rows[0].grid_col;
          centerRow = sp.rows[0].grid_row;
          radius = sp.rows[0].radius ?? 0;
          polygon = Array.isArray(sp.rows[0].shape_points) ? sp.rows[0].shape_points : null;
        }
      }
      // Skip the moving token's own current tile when computing
      // collisions — otherwise a same-map move could see itself as
      // an obstacle and refuse every nearby tile.
      const occupiedRows = await db.query(
        'SELECT grid_col AS col, grid_row AS row FROM session_tokens WHERE session_id=$1 AND map_id=$2 AND id<>$3',
        [sessionId, mapId, tokenId]
      );
      const wallsRes = await db.query('SELECT type, points FROM walls WHERE map_id=$1', [mapId]);
      const gs = Number(m.grid_size) || 50;
      const offX = gs > 0 ? (Number(m.width  || 0) % gs) / 2 : 0;
      const offY = gs > 0 ? (Number(m.height || 0) % gs) / 2 : 0;
      const { col: sc, row: sr } = scatterSpawnPosition(
        centerCol, centerRow, radius, occupiedRows.rows, polygon,
        wallsRes.rows, gs, offX, offY,
      );
      await db.query(
        'UPDATE session_tokens SET map_id=$1, grid_col=$2, grid_row=$3 WHERE id=$4',
        [mapId, sc, sr, tokenId]
      );
      // A warp is a teleport — flash at the origin before the token vanishes,
      // and again once it has landed. Clients ignore effects for tokens they
      // can't place, so each map only draws the half it can see.
      io.to(sessionCode).emit('token_fx', { tokenId, effect: 'blink', ts: Date.now() });
      io.to(sessionCode).emit('token_map_changed', {
        tokenId,
        fromMapId,
        toMapId: mapId,
        gridCol: sc,
        gridRow: sr,
      });
      setTimeout(() => {
        io.to(sessionCode).emit('token_fx', { tokenId, effect: 'blink', ts: Date.now() });
      }, 250);

      // Familiars travel with their owner. Sending a player to another map
      // and leaving their familiar behind would strand the player's second
      // vision origin on a map nobody is looking at, so the bound tokens are
      // scattered in alongside them.
      if (movedPlayerName) {
        const famRes = await db.query(
          'SELECT id, map_id FROM session_tokens WHERE session_id=$1 AND familiar_of=$2 ORDER BY id',
          [sessionId, movedPlayerName]
        );
        const taken = occupiedRows.rows.concat([{ col: sc, row: sr }]);
        for (const fam of famRes.rows) {
          const picked = scatterSpawnPosition(
            centerCol, centerRow, radius, taken, polygon,
            wallsRes.rows, gs, offX, offY,
          );
          taken.push({ col: picked.col, row: picked.row });
          const famFrom = fam.map_id ?? null;
          await db.query(
            'UPDATE session_tokens SET map_id=$1, grid_col=$2, grid_row=$3 WHERE id=$4',
            [mapId, picked.col, picked.row, fam.id]
          );
          io.to(sessionCode).emit('token_map_changed', {
            tokenId: fam.id,
            fromMapId: famFrom,
            toMapId: mapId,
            gridCol: picked.col,
            gridRow: picked.row,
          });
        }
      }
    } catch (err) {
      console.error(err);
    }
  });

  // ── HP update — GM, or the player who owns the token ────────────────────
  socket.on('update_token_hp', async ({ tokenId, currentHp }) => {
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;

    try {
      // Permission: GM can update any token; a player can only update their own.
      const prev = await db.query(
        'SELECT current_hp, max_hp, creature_id, player_name, familiar_of, pretransform FROM session_tokens WHERE id=$1',
        [tokenId]
      );
      if (!prev.rows.length) return;
      const row = prev.rows[0];
      const isDM = socket.data.role === 'dm';
      // A player owns their own token AND anything bound to them — a familiar
      // takes damage like everything else on the board, and its owner is the
      // one watching it happen. Without this the phone could show the owl's
      // hit points but not change them.
      const isOwner = (!!row.player_name && row.player_name === socket.data.name)
        || (!!row.familiar_of && row.familiar_of === socket.data.name);
      if (!isDM && !isOwner) return;

      const oldHp = Number(row.current_hp) || 0;

      // CLAMPED TO THE TOKEN'S MAXIMUM.
      //
      // Excess healing is lost in 5e — the pool that goes above your maximum
      // is temporary hit points, which is a separate field. Enforced here as
      // well as in the controls so that no client, and no future one, can put
      // a 44 hit point fighter on 300. A maximum of 0 means the token has not
      // been given one yet, and is left alone rather than pinned to zero.
      const maxHp = Number(row.max_hp) || 0;
      const asked = Math.trunc(Number(currentHp));
      if (!Number.isFinite(asked)) return;
      const safeHp = maxHp > 0 ? Math.min(asked, maxHp) : asked;

      await db.query('UPDATE session_tokens SET current_hp=$1 WHERE id=$2', [safeHp, tokenId]);
      io.to(sessionCode).emit('token_hp_changed', { tokenId, currentHp: safeHp });

      // Concentration auto-prompt: if HP went down and the creature is
      // concentrating on a spell, broadcast a check with DC = max(10, dmg/2).
      const damage = oldHp - safeHp;
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

      // ── The doll crumbles ────────────────────────────────────────────────
      //
      // "If the doll drops to 0 hit points, it crumbles to dust. If you are
      // still possessing it, make a DC 15 Dexterity saving throw. On a
      // failure, you take 2d6 psychic damage as you are forced back into your
      // body."
      //
      // The return happens here rather than being left to the player: at 0 hit
      // points the possession is over by the rules, and a sheet still showing
      // the doll's controls would let them keep acting as a thing that no
      // longer exists. The saving throw is announced, not rolled — whether it
      // is failed, and what that costs, belongs at the table.
      if (safeHp <= 0 && row.pretransform?.possession) {
        const memory = row.pretransform;
        await db.query(
          `UPDATE session_tokens
              SET creature_id=$1, name=$2, image_path=$3, size=$4,
                  max_hp=$5, current_hp=$6, temp_hp=$7, pretransform=NULL,
                  hide_name_from_players=$8, hide_hp_from_players=$9, senses=$10
            WHERE id=$11`,
          [
            memory.creature_id, memory.name, memory.image_path || null,
            memory.size,
            // The body was catatonic, not hurt. It comes back exactly as it
            // was left — the psychic damage below is applied separately, if
            // the save is failed.
            memory.max_hp, memory.current_hp, memory.temp_hp || 0,
            !!memory.hide_name_from_players, !!memory.hide_hp_from_players,
            memory.senses ? JSON.stringify(memory.senses) : null,
            tokenId,
          ]
        );
        const back = await enrichToken(tokenId);
        if (back) io.to(sessionCode).emit('token_refreshed', { token: back });
        io.to(sessionCode).emit('possession_broken', {
          tokenId,
          itemName: memory.possession_item || 'The doll',
          dc: 15,
          ability: 'DEX',
          damage: '2d6',
          damageType: 'psychic',
        });
      }
    } catch (err) {
      console.error(err);
    }
  });

  // ── Temp HP update — GM, or the player who owns the token ───────────────
  socket.on('update_token_temp_hp', async ({ tokenId, tempHp }) => {
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;

    try {
      const prev = await db.query(
        'SELECT player_name, familiar_of FROM session_tokens WHERE id=$1',
        [tokenId]
      );
      if (!prev.rows.length) return;
      const row = prev.rows[0];
      const isDM = socket.data.role === 'dm';
      const isOwner = (!!row.player_name && row.player_name === socket.data.name)
        || (!!row.familiar_of && row.familiar_of === socket.data.name);
      if (!isDM && !isOwner) return;

      const safeTempHp = Math.max(0, Number(tempHp) || 0);
      await db.query('UPDATE session_tokens SET temp_hp=$1 WHERE id=$2', [safeTempHp, tokenId]);
      io.to(sessionCode).emit('token_temp_hp_changed', { tokenId, tempHp: safeTempHp });
    } catch (err) {
      console.error(err);
    }
  });

  // ── GM whisper (GM → single player) ───────────────────────────────────────
  // Private GM-to-player text. Server-side routing is essential — broadcasting
  // to the session room and filtering client-side would leak the message to
  // every player via DevTools. Instead we resolve the target socket(s) from
  // the session room (a player may have more than one tab open) and emit
  // only to those.
  socket.on('dm_whisper', ({ targetName, message }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    const trimmed = (typeof message === 'string' ? message : '').trim();
    if (!trimmed) return;
    // Cap length so a runaway paste doesn't flood the wire.
    const safeMessage = trimmed.slice(0, 2000);
    if (typeof targetName !== 'string' || !targetName) return;
    const room = io.sockets.adapter.rooms.get(sessionCode);
    if (!room) return;
    let delivered = 0;
    for (const sockId of room) {
      const s = io.sockets.sockets.get(sockId);
      if (!s) continue;
      // The player's seat AND any companion screen of theirs — the phone is
      // the same person, and a whisper that only lands on the laptop they are
      // not looking at has not been delivered.
      if (s.data.role !== 'player' && !s.data.companion) continue;
      if (s.data.name !== targetName) continue;
      s.emit('whisper_received', { message: safeMessage, fromDm: true, ts: Date.now() });
      delivered += 1;
    }
    // Echo back to the sender so the GM has a record of what was sent.
    socket.emit('whisper_sent', { targetName, message: safeMessage, delivered, ts: Date.now() });
  });

  // ── Skill-check mini games (GM → one player, player → the table) ──────────
  //
  // The GM sends a challenge to one phone; that player plays it; the outcome
  // comes back and is announced to the room the way a roll would be.
  //
  // Routed socket-to-socket for the same reason a whisper is: broadcasting and
  // filtering in the client would put every challenge in every player's
  // DevTools, and half the point of a lock is not knowing whether the other
  // one is picking it too.
  //
  // Nothing is stored. A challenge is a moment at the table, not a record: if
  // the phone is asleep when it arrives the GM is told it was not delivered and
  // can send it again, which is a better answer than a queue of stale locks
  // waiting to be picked.
  socket.on('dm_minigame', ({ targetName, gameId, dc, note }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    if (typeof targetName !== 'string' || !targetName) return;
    if (typeof gameId !== 'string' || !/^[a-z]{3,16}$/.test(gameId)) return;
    const safeDc = Math.max(5, Math.min(30, Number(dc) || 15));
    const safeNote = String(note || '').trim().slice(0, 300);
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const room = io.sockets.adapter.rooms.get(sessionCode);
    if (!room) return;
    let delivered = 0;
    for (const sockId of room) {
      const s = io.sockets.sockets.get(sockId);
      if (!s) continue;
      // The player's seat and their own phone — the same person, and the phone
      // is the screen this is built for.
      if (s.data.role !== 'player' && !s.data.companion) continue;
      if (s.data.name !== targetName) continue;
      s.emit('minigame_received', { id, gameId, dc: safeDc, note: safeNote, ts: Date.now() });
      delivered += 1;
    }
    socket.emit('minigame_sent', { id, targetName, gameId, dc: safeDc, delivered, ts: Date.now() });
  });

  // The outcome, from the player who played it. Sent to the GM, and to the
  // room as a roll-shaped line so the table sees it land.
  socket.on('minigame_result', ({ id, gameId, dc, won, detail, seconds, skillTotal }) => {
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    if (socket.data.role === 'dm') return;              // the GM does not play these
    const payload = {
      id: String(id || '').slice(0, 40),
      gameId: String(gameId || '').slice(0, 16),
      playerName: socket.data.name,
      dc: Math.max(5, Math.min(30, Number(dc) || 15)),
      won: !!won,
      detail: String(detail || '').slice(0, 120),
      seconds: Math.max(0, Math.min(999, Number(seconds) || 0)),
      skillTotal: Math.max(-5, Math.min(30, Number(skillTotal) || 0)),
      ts: Date.now(),
    };
    io.to(sessionCode).emit('minigame_result', payload);
  });

  // ── Conditions update (GM only) ───────────────────────────────────────────
  socket.on('update_token_conditions', async ({ tokenId, conditions }) => {
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    // Players may set conditions on their OWN token: Rage, Invisible from
    // Nature's Veil or Cloak of Shadows, Prone after a fall. Anything else
    // stays with the GM.
    if (socket.data.role !== 'dm') {
      const own = await db.query('SELECT player_name, is_player FROM session_tokens WHERE id=$1', [tokenId]);
      if (!own.rows.length || !ownsToken(socket, own.rows[0])) return;
    }

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

  // ── Initiative update (GM only) ───────────────────────────────────────────
  // GM, or the player whose token it is.
  //
  // Rolling your own initiative and reading the number out for the GM to type
  // in is the one bit of table admin a phone can obviously do itself, so the
  // sheet now writes it — which means this can no longer be GM-only. Same
  // ownership test as the hit-point handlers: your own token, or a companion
  // bound to you.
  socket.on('update_token_initiative', async ({ tokenId, initiative }) => {
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;

    try {
      const prev = await db.query(
        'SELECT player_name, familiar_of FROM session_tokens WHERE id=$1',
        [tokenId]
      );
      if (!prev.rows.length) return;
      const row = prev.rows[0];
      const isDM = socket.data.role === 'dm';
      const isOwner = (!!row.player_name && row.player_name === socket.data.name)
        || (!!row.familiar_of && row.familiar_of === socket.data.name);
      if (!isDM && !isOwner) return;

      // Whatever the sheet sends is a die roll plus modifiers, so it is a
      // number or it is nothing — a blank clears the entry, which is how the
      // GM resets the order between fights.
      const value = initiative === null || initiative === '' || initiative === undefined
        ? null
        : Math.trunc(Number(initiative));
      if (value !== null && !Number.isFinite(value)) return;

      await db.query(
        'UPDATE session_tokens SET initiative=$1 WHERE id=$2',
        [value, tokenId]
      );
      io.to(sessionCode).emit('token_initiative_changed', { tokenId, initiative: value });
    } catch (err) {
      console.error(err);
    }
  });

  // ── Toggle visibility (GM only) ───────────────────────────────────────────
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
      // Include the full enriched token on reveal — players filter hidden
      // tokens out of their local list entirely, so they need the complete
      // row (not just the id) to re-add it without a page refresh.
      const enrichedRes = await db.query(
        `SELECT st.*, c.image_path AS creature_image, c.display_image_path AS creature_display_image, c.standee_image_path AS creature_standee, c.base_color AS creature_base_color, c.base_opacity AS creature_base_opacity, c.token_height_ft AS creature_token_height, c.dexterity AS creature_dex, COALESCE(c.speed_walk, 30) AS creature_speed, COALESCE(c.speed_fly, 0) AS creature_speed_fly, COALESCE(c.speed_swim, 0) AS creature_speed_swim, COALESCE(c.speed_climb, 0) AS creature_speed_climb, COALESCE(c.speed_burrow, 0) AS creature_speed_burrow, COALESCE(c.initiative_bonus, 0) AS initiative_bonus
         FROM session_tokens st LEFT JOIN creatures c ON st.creature_id = c.id WHERE st.id = $1`,
        [tokenId]
      );
      io.to(sessionCode).emit('token_visibility_changed', { tokenId, isHidden, token: enrichedRes.rows[0] || null });
    } catch (err) {
      console.error(err);
    }
  });

  // ── Toggle flying flag (GM only) ─────────────────────────────────────────
  socket.on('toggle_token_flying', async ({ tokenId }) => {
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    // Same reasoning as resizing: Fly and Levitate are the player's own spells.
    if (socket.data.role !== 'dm') {
      const own = await db.query('SELECT player_name, is_player FROM session_tokens WHERE id=$1', [tokenId]);
      if (!own.rows.length || !ownsToken(socket, own.rows[0])) return;
    }
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

  // ── Add token to map (GM only) ────────────────────────────────────────────
  // Put a creature on the board WITHOUT being told where.
  //
  // `add_token` needs a grid square, which the desktop gets from the GM
  // clicking the map. A screen with no map — the tablet at /blocks — has no
  // such click to offer, so this resolves the spot the same way spawning the
  // party does: the map's own spawn point, its radius, and the squares already
  // taken. One placement rule for every path, rather than a phone inventing
  // its own idea of "somewhere sensible".
  socket.on('place_creature', async ({ sessionId, creatureId, imagePath }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      const sessRow = (await db.query(
        'SELECT id, map_id, default_hide_token_names, default_hide_token_hp FROM sessions WHERE id=$1',
        [sessionId]
      )).rows[0];
      if (!sessRow) return;
      const creature = (await db.query('SELECT * FROM creatures WHERE id=$1', [creatureId])).rows[0];
      if (!creature) return;

      // A SESSION WITH NO MAP IS STILL A SESSION.
      //
      // This used to refuse outright when `sessions.map_id` was null, while
      // every other way of adding a token — add_token, add_lobby_token — makes
      // a mapless one quite happily. A table running theatre-of-the-mind has
      // no map by design, so the one control on the GM's phone for adding a
      // creature was the only thing that would not work for them.
      //
      // Mapless means there is no grid to find a free square on, so the spawn
      // search is skipped and the token lands in the tray the same way the
      // other paths leave it.
      const mapless = sessRow.map_id == null;

      // Only a face this creature actually owns — same rule add_token applies,
      // and for the same reason: a client-supplied path must never be able to
      // point a token at an arbitrary file.
      let tokenImage = creature.image_path;
      if (imagePath && imagePath !== creature.image_path) {
        const ok = await db.query(
          `SELECT 1 FROM creature_images
            WHERE creature_id=$1 AND image_path=$2 AND kind='face' LIMIT 1`,
          [creatureId, imagePath]
        );
        if (ok.rows.length) tokenImage = imagePath;
      }

      // What is already standing there, so a second goblin does not land on
      // the first.
      let spot = { col: 0, row: 0, shipId: null, deckIndex: null };
      if (!mapless) {
        const occupied = (await db.query(
          'SELECT grid_col, grid_row, size, size_squares FROM session_tokens WHERE map_id=$1',
          [sessRow.map_id]
        )).rows.map((t) => ({
          col: Number(t.grid_col), row: Number(t.grid_row),
          extent: shipMath.tokenExtent(t),
        }));
        const wallRows = (await db.query(
          'SELECT points FROM walls WHERE map_id=$1', [sessRow.map_id]
        )).rows;

        spot = await resolveMapSpawn(sessRow.map_id, {
          occupied,
          walls: wallRows,
          sessionId: sessRow.id,
        });
      }

      const tokenRes = await db.query(
        `INSERT INTO session_tokens
           (session_id, map_id, creature_id, name, image_path, size, size_squares, grid_col, grid_row, current_hp, max_hp,
            hide_name_from_players, hide_hp_from_players,
            token_light_bright, token_light_dim, token_light_color, token_light_flicker, tracker_reminder,
            ship_id, deck_index)
         VALUES ($1,$2,$3,$4,$5,$6,$13,$7,$8,$9,$10,$11,$12,$14,$15,$16,$17,$18,$19,$20)
         RETURNING *`,
        [
          sessionId, sessRow.map_id, creatureId, creature.name, tokenImage,
          creature.size, spot.col, spot.row,
          creature.hit_points, creature.hit_points,
          !!creature.hide_token_name || !!sessRow.default_hide_token_names,
          !!creature.hide_token_hp   || !!sessRow.default_hide_token_hp,
          creature.size_squares ?? null,
          creature.token_light_bright ?? 0,
          creature.token_light_dim ?? 0,
          creature.token_light_color || '#fbbf24',
          creature.token_light_flicker ?? true,
          creature.tracker_reminder || '',
          spot.shipId ?? null,
          spot.deckIndex ?? null,
        ]
      );
      const token = { ...tokenRes.rows[0], creature_image: tokenImage };
      io.to(sessionCode).emit('token_added', { token });
      socket.emit('creature_placed', { token, name: creature.name });
      sneakWatch(sessionCode);
    } catch (err) {
      console.error('place_creature error:', err);
      socket.emit('error', { message: 'Could not place that creature.' });
    }
  });

  socket.on('add_token', async ({ sessionId, creatureId, gridCol, gridRow, mapId, imagePath }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;

    try {
      const creatureRes = await db.query('SELECT * FROM creatures WHERE id=$1', [creatureId]);
      if (!creatureRes.rows.length) return;
      const creature = creatureRes.rows[0];

      // The GM may have picked one of the creature's alternate portraits. Only
      // ever accept a path that actually belongs to this creature — the client
      // sends a plain string, and an arbitrary one would let a token point at
      // any file under uploads/.
      let tokenImage = creature.image_path;
      if (imagePath && imagePath !== creature.image_path) {
        // Scoped to the FACE slot. The same table now also holds the 3D
        // standing art, and an unscoped check would accept a standee path as
        // a map token's face — a tall cut-out figure squeezed into the
        // top-down circle, from a picker that never offered it.
        const ok = await db.query(
          `SELECT 1 FROM creature_images
            WHERE creature_id=$1 AND image_path=$2 AND kind='face' LIMIT 1`,
          [creatureId, imagePath]
        );
        if (ok.rows.length) tokenImage = imagePath;
      }

      // Resolve mapId from session if not provided. The same row carries the
      // session's label defaults, so a GM who has switched "new tokens start
      // hidden" on doesn't have to hide each monster as it lands.
      const sessRow = (await db.query(
        'SELECT map_id, default_hide_token_names, default_hide_token_hp FROM sessions WHERE id=$1',
        [sessionId]
      )).rows[0] || {};
      const resolvedMapId = mapId || sessRow.map_id || null;

      const tokenRes = await db.query(
        `INSERT INTO session_tokens
           (session_id, map_id, creature_id, name, image_path, size, size_squares, grid_col, grid_row, current_hp, max_hp,
            hide_name_from_players, hide_hp_from_players,
            token_light_bright, token_light_dim, token_light_color, token_light_flicker, tracker_reminder)
         VALUES ($1,$2,$3,$4,$5,$6,$13,$7,$8,$9,$10,$11,$12,$14,$15,$16,$17,$18)
         RETURNING *`,
        [
          sessionId, resolvedMapId, creatureId, creature.name, tokenImage,
          creature.size, gridCol, gridRow,
          creature.hit_points, creature.hit_points,
          // Hidden if the creature itself says so, or the session default does.
          !!creature.hide_token_name || !!sessRow.default_hide_token_names,
          !!creature.hide_token_hp   || !!sessRow.default_hide_token_hp,
          creature.size_squares ?? null,
          // Light and tracker note are creature-level defaults: a fire
          // elemental should be alight the moment it lands, without the GM
          // configuring the same two numbers every time they place one.
          creature.token_light_bright ?? 0,
          creature.token_light_dim ?? 0,
          creature.token_light_color || '#fbbf24',
          creature.token_light_flicker ?? true,
          creature.tracker_reminder || '',
        ]
      );
      const token = { ...tokenRes.rows[0], creature_image: tokenImage };
      io.to(sessionCode).emit('token_added', { token });
    } catch (err) {
      console.error(err);
    }
  });

  // ── Add a mapless combatant (GM only) ─────────────────────────────────────
  //
  // Combat with no battlemap: the GM builds an initiative roster in the lobby
  // and never places anything. Deliberately NOT `add_token` with a null mapId —
  // that handler falls back to the session's current map, which is exactly the
  // wrong thing here, and it would drop a token onto a map nobody asked to
  // populate. map_id IS NULL is what buildSessionState reads when the session
  // has no map, so these rows are the lobby's combatants and nothing else.
  // `playerName` set means this is a player character joining the fight from
  // the lobby: flagged is_player so it reads as a PC everywhere, and never
  // hidden — a player's own character is not a surprise to reveal.
  socket.on('add_lobby_token', async ({ sessionId, creatureId, playerName }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;

    try {
      const isPlayer = !!playerName;

      // Reusing an existing player token is tried FIRST and needs no creature:
      // the token itself carries the character. A player whose seat lost its
      // creature id on reconnect can still be added this way.
      if (isPlayer) {
        const existing = await db.query(
          `SELECT st.*, c.image_path AS creature_image, c.dexterity AS creature_dex,
                  COALESCE(c.speed_walk, 30) AS creature_speed, COALESCE(c.speed_fly, 0) AS creature_speed_fly, COALESCE(c.speed_swim, 0) AS creature_speed_swim, COALESCE(c.speed_climb, 0) AS creature_speed_climb, COALESCE(c.speed_burrow, 0) AS creature_speed_burrow,
                  COALESCE(c.initiative_bonus, 0) AS initiative_bonus
             FROM session_tokens st
             LEFT JOIN creatures c ON st.creature_id = c.id
            WHERE st.session_id=$1 AND st.is_player=true AND st.player_name=$2
            ORDER BY st.id LIMIT 1`,
          [sessionId, playerName]
        );
        if (existing.rows.length) {
          const row = existing.rows[0];
          await db.query('UPDATE session_tokens SET map_id=NULL WHERE id=$1', [row.id]);
          io.to(sessionCode).emit('token_added', { token: { ...row, map_id: null } });
          return;
        }
      }

      const creatureRes = await db.query('SELECT * FROM creatures WHERE id=$1', [creatureId]);
      if (!creatureRes.rows.length) return;
      const creature = creatureRes.rows[0];

      const sessRow = (await db.query(
        'SELECT default_hide_token_names, default_hide_token_hp FROM sessions WHERE id=$1',
        [sessionId]
      )).rows[0] || {};

      const tokenRes = await db.query(
        `INSERT INTO session_tokens
           (session_id, map_id, creature_id, name, image_path, size, size_squares,
            grid_col, grid_row, current_hp, max_hp,
            is_player, player_name,
            hide_name_from_players, hide_hp_from_players,
            token_light_bright, token_light_dim, token_light_color, token_light_flicker, tracker_reminder)
         VALUES ($1, NULL, $2, $3, $4, $5, $6, 0, 0, $7, $7, $10, $11, $8, $9, $12, $13, $14, $15, $16)
         RETURNING *`,
        [
          sessionId, creatureId, creature.name, creature.image_path,
          creature.size, creature.size_squares ?? null,
          creature.hit_points,
          !isPlayer && (!!creature.hide_token_name || !!sessRow.default_hide_token_names),
          !isPlayer && (!!creature.hide_token_hp   || !!sessRow.default_hide_token_hp),
          isPlayer,
          playerName || null,
          // Same creature-level defaults the map placement path uses, so a
          // lobby combatant glows and carries its note too.
          creature.token_light_bright ?? 0,
          creature.token_light_dim ?? 0,
          creature.token_light_color || '#fbbf24',
          creature.token_light_flicker ?? true,
          creature.tracker_reminder || '',
        ]
      );
      const token = {
        ...tokenRes.rows[0],
        creature_image: creature.image_path,
        creature_dex: creature.dexterity,
        creature_speed: creature.speed_walk ?? 30,
        initiative_bonus: creature.initiative_bonus ?? 0,
      };
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
      // Same override the creature carries, so a player token spawned from a
      // resized library creature isn't silently snapped back to the preset.
      let tokenSquares = null;
      let tokenName = playerName;
      let tokenSenses = [];
      if (creatureId) {
        const cRes = await db.query('SELECT * FROM creatures WHERE id=$1', [creatureId]);
        if (cRes.rows.length) {
          const c = cRes.rows[0];
          tokenHp = c.hit_points || tokenHp;
          tokenSize = c.size || tokenSize;
          tokenSquares = c.size_squares ?? null;
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
            'UPDATE session_tokens SET creature_id=$1, max_hp=$2, size=$3, name=$4, size_squares=$6 WHERE id=$5',
            [creatureId, tokenHp, tokenSize, tokenName, tok.id, tokenSquares]
          );
        }
        // Re-fetch enriched token so creature_image is included, then broadcast to all clients
        const enrichedRes = await db.query(
          `SELECT st.*, c.image_path AS creature_image, c.display_image_path AS creature_display_image, c.standee_image_path AS creature_standee, c.base_color AS creature_base_color, c.base_opacity AS creature_base_opacity, c.token_height_ft AS creature_token_height, c.dexterity AS creature_dex, COALESCE(c.speed_walk, 30) AS creature_speed, COALESCE(c.speed_fly, 0) AS creature_speed_fly, COALESCE(c.speed_swim, 0) AS creature_speed_swim, COALESCE(c.speed_climb, 0) AS creature_speed_climb, COALESCE(c.speed_burrow, 0) AS creature_speed_burrow, COALESCE(c.initiative_bonus, 0) AS initiative_bonus
           FROM session_tokens st LEFT JOIN creatures c ON st.creature_id = c.id WHERE st.id = $1`,
          [tok.id]
        );
        const enrichedTok = enrichedRes.rows[0];
        io.to(sessionCode).emit('token_refreshed', { token: enrichedTok });
        socket.emit('player_token_ready', { tokenId: tok.id, mapId: tok.map_id ?? null });
        return;
      }

      // Use the GM-configured spawn map (sessions.spawn_map_id) when set —
      // lets a GM stage incoming players on a "lobby" map while the rest
      // of the party is mid-encounter on a different one. Falls back to
      // the session's current map_id if no spawn map has been picked.
      const sessionInfoRes = await db.query(
        'SELECT map_id, spawn_map_id FROM sessions WHERE id=$1', [sessionId]
      );
      const currentMapId = sessionInfoRes.rows[0]?.spawn_map_id
        ?? sessionInfoRes.rows[0]?.map_id
        ?? null;
      let spawnCol = 0, spawnRow = 0;
      let spawnBerth = null;
      if (currentMapId) {
        const occupied = await loadOccupiedTiles(sessionId, currentMapId);
        const wallsRes = await db.query('SELECT type, points FROM walls WHERE map_id=$1', [currentMapId]);
        const picked = await resolveMapSpawn(currentMapId, { occupied, walls: wallsRes.rows, sessionId });
        spawnCol = picked.col;
        spawnRow = picked.row;
        // A spawn set aboard a ship hands back a deck square too; carrying it
        // onto the token is what makes the arrival actually be ON the ship
        // rather than merely standing where the ship currently is.
        spawnBerth = picked;
      }

      const tokenRes = await db.query(
        `INSERT INTO session_tokens
           (session_id, map_id, name, size, size_squares, grid_col, grid_row, current_hp, max_hp, is_player, player_name, creature_id, senses)
         VALUES ($1,$2,$3,$4,$11,$9,$10,$5,$5,true,$6,$7,$8)
         RETURNING *`,
        [sessionId, currentMapId, tokenName, tokenSize, tokenHp, playerName, creatureId || null, JSON.stringify(tokenSenses), spawnCol, spawnRow, tokenSquares]
      );
      const newTokenId = tokenRes.rows[0].id;
      // Spawn set aboard a ship: bind the new token to the deck it landed on,
      // so it turns and sails with the hull from the moment it appears.
      if (spawnBerth && spawnBerth.shipId) {
        await db.query(
          `UPDATE session_tokens SET ship_id=$1, deck_index=$2, deck_col=$3, deck_row=$4 WHERE id=$5`,
          [spawnBerth.shipId, spawnBerth.deckIndex, spawnBerth.deckCol, spawnBerth.deckRow, newTokenId]
        );
      }
      // Re-fetch with creature_image join so the image is included from the start
      const enrichedNewRes = await db.query(
        `SELECT st.*, c.image_path AS creature_image, c.display_image_path AS creature_display_image, c.standee_image_path AS creature_standee, c.base_color AS creature_base_color, c.base_opacity AS creature_base_opacity, c.token_height_ft AS creature_token_height, c.dexterity AS creature_dex, COALESCE(c.speed_walk, 30) AS creature_speed, COALESCE(c.speed_fly, 0) AS creature_speed_fly, COALESCE(c.speed_swim, 0) AS creature_speed_swim, COALESCE(c.speed_climb, 0) AS creature_speed_climb, COALESCE(c.speed_burrow, 0) AS creature_speed_burrow, COALESCE(c.initiative_bonus, 0) AS initiative_bonus
         FROM session_tokens st LEFT JOIN creatures c ON st.creature_id = c.id WHERE st.id = $1`,
        [newTokenId]
      );
      const token = enrichedNewRes.rows[0];
      io.to(sessionCode).emit('token_added', { token });

      // Address the OWNING player, not the caller. When the GM creates a
      // player's token from session settings the caller is the GM, so the
      // player never bound to it and sat there with a token they couldn't
      // control until they reloaded. The caller still hears it when the caller
      // is that player, because they're matched by name below.
      const readyUsers = sessionUsers[sessionCode];
      let delivered = false;
      if (readyUsers) {
        for (const [sid, u] of readyUsers.entries()) {
          if (u.name === playerName) {
            io.to(sid).emit('player_token_ready', { tokenId: token.id, mapId: token.map_id ?? null });
            delivered = true;
          }
        }
      }
      // Nobody by that name is connected (spawned ahead of the player joining):
      // tell the caller so their own UI still settles.
      if (!delivered) socket.emit('player_token_ready', { tokenId: token.id, mapId: token.map_id ?? null });
    } catch (err) {
      console.error(err);
    }
  });

  // ── GM: force-respawn a player token (re-creates if deleted) ────────────
  socket.on('dm_respawn_player_token', async ({ playerName }) => {
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode || socket.data.role !== 'dm') return;
    try {
      const sessionRes = await db.query(
        'SELECT * FROM sessions WHERE session_code=$1', [sessionCode]
      );
      if (!sessionRes.rows.length) return;
      const session = sessionRes.rows[0];
      // Match the new-token spawn rule: prefer the configured spawn map.
      const currentMapId = session.spawn_map_id || session.map_id || null;

      // Check if token already exists ON THE CURRENT MAP
      const existing = await db.query(
        `SELECT * FROM session_tokens
         WHERE session_id=$1 AND player_name=$2 AND is_player=true
           AND (map_id=$3 OR ($3::integer IS NULL AND map_id IS NULL))`,
        [session.id, playerName, currentMapId]
      );
      if (existing.rows.length) {
        // Token exists on this map — notify the player to reconnect to it
        // and broadcast it so the GM panel refreshes
        const tok = existing.rows[0];
        io.to(sessionCode).emit('token_added', { token: tok });
        const users = sessionUsers[sessionCode];
        if (users) {
          for (const [sid, u] of users.entries()) {
            if (u.name === playerName) {
              io.to(sid).emit('player_token_ready', { tokenId: tok.id, mapId: tok.map_id ?? null });
              break;
            }
          }
        }
        return;
      }

      // Get spawn point — scatter inside spawn_radius if set so a
      // re-spawned token doesn't pile back onto the original tile,
      // and respect walls so the centre never lands flush against
      // one (would break line-of-sight ray-casts).
      let spawnCol = 0, spawnRow = 0;
      let spawnBerth = null;
      if (currentMapId) {
        const occupied = await loadOccupiedTiles(session.id, currentMapId);
        const wallsRes = await db.query('SELECT type, points FROM walls WHERE map_id=$1', [currentMapId]);
        const picked = await resolveMapSpawn(currentMapId, { occupied, walls: wallsRes.rows, sessionId: session.id });
        spawnCol = picked.col;
        spawnRow = picked.row;
        // A spawn set aboard a ship hands back a deck square too; carrying it
        // onto the token is what makes the arrival actually be ON the ship
        // rather than merely standing where the ship currently is.
        spawnBerth = picked;
      }

      // Try to inherit stats from a creature linked to this player's token on any map
      let tokenHp = 20, tokenSize = 'medium', tokenName = playerName, tokenSenses = [];
      let tokenSquares = null;
      let creatureId = null;
      const anyToken = await db.query(
        `SELECT st.*, c.hit_points, c.size AS c_size, c.size_squares AS c_squares, c.name AS c_name, c.senses AS c_senses
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
        tokenSquares = prev.c_squares ?? prev.size_squares ?? null;
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
           (session_id, map_id, creature_id, name, size, size_squares, grid_col, grid_row,
            current_hp, max_hp, is_player, player_name, senses)
         VALUES ($1,$2,$3,$4,$5,$11,$6,$7,$8,$8,true,$9,$10)
         RETURNING *`,
        [session.id, currentMapId, creatureId, tokenName, tokenSize,
         spawnCol, spawnRow, tokenHp, playerName, JSON.stringify(tokenSenses), tokenSquares]
      );
      const token = tokenRes.rows[0];
      // Spawn set aboard a ship: bind the new token to the deck it landed on,
      // so it turns and sails with the hull from the moment it appears.
      if (spawnBerth && spawnBerth.shipId) {
        await db.query(
          `UPDATE session_tokens SET ship_id=$1, deck_index=$2, deck_col=$3, deck_row=$4 WHERE id=$5`,
          [spawnBerth.shipId, spawnBerth.deckIndex, spawnBerth.deckCol, spawnBerth.deckRow, token.id]
        );
        // The row was read before the binding was written, and it's what goes
        // out on the wire — without this the clients get a token that looks
        // adrift until something else refreshes it.
        token.ship_id = spawnBerth.shipId;
        token.deck_index = spawnBerth.deckIndex;
        token.deck_col = spawnBerth.deckCol;
        token.deck_row = spawnBerth.deckRow;
      }

      io.to(sessionCode).emit('token_added', { token });

      const users = sessionUsers[sessionCode];
      if (users) {
        for (const [sid, u] of users.entries()) {
          if (u.name === playerName) {
            io.to(sid).emit('player_token_ready', { tokenId: token.id, mapId: token.map_id ?? null });
            break;
          }
        }
      }
    } catch (err) {
      console.error('dm_respawn_player_token error:', err);
    }
  });

  // ── GM Markers ───────────────────────────────────────────────────────────
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

  // ── Map terrain CRUD (GM only) ──────────────────────────────────────────
  // Wall regeneration for a terrain piece. Called on every lifecycle
  // event that could change the piece's geometry or its
  // visibility-to-players (place / move / resize / reveal). Walls are
  // tied to the terrain via walls.terrain_id with ON DELETE CASCADE,
  // so a remove_terrain wipes them automatically (we still emit
  // per-wall deletion events for the FoW renderer).
  //
  // - hide_until_revealed && !is_revealed → no walls (the piece is
  //   invisible to players, so its walls shouldn't be either).
  // - blocks_vision || blocks_light || blocks_movement || custom_walls
  //   → walls. custom_walls (normalised 0-1 vertices relative to the
  //     piece's bbox) wins over the auto-perimeter. Otherwise we drop
  //     a single 'rect' wall around the piece's bounding box.
  //
  // Returns { added: [walls], deletedIds: [ids] } so the caller can
  // broadcast surgical wall_added / wall_deleted events.
  async function regenerateTerrainWalls(terrainRow) {
    const t = terrainRow;
    if (!t) return { added: [], deletedIds: [] };
    // Capture existing walls so we can broadcast deletions before
    // the new walls land.
    const existing = await db.query(
      'SELECT id FROM walls WHERE terrain_id=$1',
      [t.id]
    );
    const deletedIds = existing.rows.map((r) => r.id);
    await db.query('DELETE FROM walls WHERE terrain_id=$1', [t.id]);

    // Walls are absent for hidden pieces — players never see them
    // and the GM doesn't need their FoW to be partially blocked by
    // a piece nobody can see yet. Walls only ever come from the
    // piece's custom_walls list (set in the wall-editor modal). No
    // auto-perimeter — GM owns the geometry explicitly.
    const hidden = isTerrainHidden(t);
    const hasCustom = Array.isArray(t.custom_walls) && t.custom_walls.length;
    if (hidden || !hasCustom) {
      return { added: [], deletedIds };
    }

    // Convert grid-unit terrain coords into the map-pixel coords that
    // walls.points use, against the MAP's own grid size — the same value the
    // renderer uses. These two have to agree or the walls land off the
    // artwork; they previously agreed on the session's value, and now agree on
    // the map's.
    const mapRes = await db.query(
      `SELECT m.width, m.height, COALESCE(m.grid_size, s.grid_size, 50) AS grid_size
         FROM maps m
         LEFT JOIN sessions s ON m.session_id = s.id
        WHERE m.id=$1`,
      [t.map_id]
    );
    if (!mapRes.rows.length) return { added: [], deletedIds };
    const m = mapRes.rows[0];
    const gs = Number(m.grid_size) || 50;
    const offsetX = gs > 0 ? (Number(m.width || 0)  % gs) / 2 : 0;
    const offsetY = gs > 0 ? (Number(m.height || 0) % gs) / 2 : 0;
    const px = offsetX + Number(t.grid_col) * gs;
    const py = offsetY + Number(t.grid_row) * gs;
    const pw = Number(t.width)  * gs;
    const ph = Number(t.height) * gs;

    const { v4: uuidv4 } = require('uuid');
    const inserts = [];
    // custom_walls is an array of polygons, each a list of {col, row}
    // points in 0-1 normalised space relative to the piece's bbox.
    // Transform each polygon to map-pixel coords with the piece's
    // rotation applied around its centre — so a rotated piece's
    // walls rotate with it.
    const cx = px + pw / 2;
    const cy = py + ph / 2;
    const rad = (Number(t.rotation) || 0) * Math.PI / 180;
    const cosA = Math.cos(rad), sinA = Math.sin(rad);
    for (const poly of t.custom_walls) {
      if (!Array.isArray(poly) || poly.length < 2) continue;
      const flat = [];
      for (const p of poly) {
        // Local-frame offset from piece centre, in map pixels.
        const lx = Number(p.col) * pw - pw / 2;
        const ly = Number(p.row) * ph - ph / 2;
        // Rotate then translate to world coords.
        flat.push(cx + lx * cosA - ly * sinA, cy + lx * sinA + ly * cosA);
      }
      const id = uuidv4();
      inserts.push({ id, type: poly.length >= 3 ? 'polygon' : 'line', points: flat });
    }
    const added = [];
    for (const w of inserts) {
      const r = await db.query(
        `INSERT INTO walls (id, map_id, terrain_id, type, points)
         VALUES ($1,$2,$3,$4,$5)
         RETURNING *`,
        [w.id, t.map_id, t.id, w.type, JSON.stringify(w.points)]
      );
      added.push(r.rows[0]);
    }
    return { added, deletedIds };
  }
  // Broadcasts wall mutations from a regenerateTerrainWalls() call to
  // every socket in the session. Walls aren't filtered per-role —
  // they exist once the piece is revealed; before that we don't insert
  // them at all, so there's nothing to filter.
  function broadcastWallChanges(sessionCode, { added, deletedIds }) {
    if (!sessionCode) return;
    for (const id of deletedIds) {
      io.to(sessionCode).emit('wall_deleted', { wallId: id });
    }
    for (const w of added) {
      io.to(sessionCode).emit('wall_added', { wall: w });
    }
  }
  // Helper that fetches a terrain row joined with its library piece
  // (so the broadcast carries the image_path, blocks_*, etc. that the
  // client renderer needs without an extra round-trip).
  async function fetchTerrainRow(id) {
    const r = await db.query(
      `SELECT mt.*, tl.image_path AS lib_image_path, tl.name AS lib_name, tl.is_marker,
              tl.three_d_shape AS lib_three_d_shape,
              tl.model_path AS lib_model_path, tl.model_scale AS lib_model_scale,
              tl.cloud_form AS lib_cloud_form,
              tl.piece_form AS lib_piece_form,
              tl.source_image_path AS lib_source_image_path,
              tl.blocks_vision, tl.blocks_light, tl.blocks_movement,
              tl.hide_until_revealed, tl.custom_walls
         FROM map_terrain mt
         LEFT JOIN terrain_library tl ON mt.library_id = tl.id
        WHERE mt.id=$1`,
      [id]
    );
    return r.rows[0] || null;
  }
  // Broadcasts a terrain event to everyone in the session, except hidden
  // pieces, which go to the GM only — players don't get a 'terrain_added'
  // for a piece they shouldn't know exists, and don't get position updates
  // for one either. See isTerrainHidden for the two rules.
  function broadcastTerrain(sessionCode, eventName, terrainRow) {
    const room = io.sockets.adapter.rooms.get(sessionCode);
    if (!room) return;
    const isHidden = terrainRow ? isTerrainHidden(terrainRow) : false;
    for (const sid of room) {
      const s = io.sockets.sockets.get(sid);
      if (!s) continue;
      if (isHidden && s.data?.role !== 'dm') continue;
      // The GM gets the row as it is; a player gets it with a GM-only name
      // removed, so a secret name never lands in their client at all.
      s.emit(eventName, {
        terrain: s.data?.role === 'dm' ? terrainRow : stripTerrainLabelForPlayer(terrainRow),
      });
    }
  }

  socket.on('place_terrain', async ({ libraryId, gridCol, gridRow, width, height }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      const sessionRes = await db.query('SELECT id, map_id FROM sessions WHERE session_code=$1', [sessionCode]);
      if (!sessionRes.rows.length) return;
      const mapId = sessionRes.rows[0].map_id;
      if (!mapId) return; // can't place without an active map
      const lib = await db.query('SELECT * FROM terrain_library WHERE id=$1', [libraryId]);
      if (!lib.rows.length) return;
      const piece = lib.rows[0];
      const w = Number(width)  || piece.default_w || 1;
      const h = Number(height) || piece.default_h || 1;
      const r = await db.query(
        `INSERT INTO map_terrain (map_id, library_id, grid_col, grid_row, width, height)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
        [mapId, libraryId, Number(gridCol) || 0, Number(gridRow) || 0, w, h]
      );
      const row = await fetchTerrainRow(r.rows[0].id);
      broadcastTerrain(sessionCode, 'terrain_added', row);
      broadcastWallChanges(sessionCode, await regenerateTerrainWalls(row));
    } catch (err) { console.error(err); }
  });

  socket.on('move_terrain', async ({ id, gridCol, gridRow }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      await db.query(
        'UPDATE map_terrain SET grid_col=$1, grid_row=$2 WHERE id=$3',
        [Number(gridCol) || 0, Number(gridRow) || 0, id]
      );
      const row = await fetchTerrainRow(id);
      if (row) {
        broadcastTerrain(sessionCode, 'terrain_updated', row);
        broadcastWallChanges(sessionCode, await regenerateTerrainWalls(row));
      }
    } catch (err) { console.error(err); }
  });

  socket.on('resize_terrain', async ({ id, width, height, gridCol, gridRow, rotation }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      const fields = [];
      const values = [];
      const push = (k, v) => { values.push(v); fields.push(`${k}=$${values.length}`); };
      if (width !== undefined)  push('width',  Math.max(0.1, Number(width) || 1));
      if (height !== undefined) push('height', Math.max(0.1, Number(height) || 1));
      if (gridCol !== undefined) push('grid_col', Number(gridCol) || 0);
      if (gridRow !== undefined) push('grid_row', Number(gridRow) || 0);
      if (rotation !== undefined) push('rotation', Number(rotation) || 0);
      if (!fields.length) return;
      values.push(id);
      await db.query(`UPDATE map_terrain SET ${fields.join(', ')} WHERE id=$${values.length}`, values);
      const row = await fetchTerrainRow(id);
      if (row) {
        broadcastTerrain(sessionCode, 'terrain_updated', row);
        broadcastWallChanges(sessionCode, await regenerateTerrainWalls(row));
      }
    } catch (err) { console.error(err); }
  });

  socket.on('reveal_terrain', async ({ id, isRevealed }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      await db.query('UPDATE map_terrain SET is_revealed=$1 WHERE id=$2', [!!isRevealed, id]);
      const row = await fetchTerrainRow(id);
      if (!row) return;
      // Reveal: send terrain_added to non-GMs (they didn't have it).
      // Hide: send terrain_removed to non-GMs (they shouldn't see it).
      const room = io.sockets.adapter.rooms.get(sessionCode);
      if (!room) return;
      for (const sid of room) {
        const s = io.sockets.sockets.get(sid);
        if (!s) continue;
        if (s.data?.role === 'dm') {
          s.emit('terrain_updated', { terrain: row });
        } else if (!isTerrainHidden(row)) {
          s.emit('terrain_added', { terrain: stripTerrainLabelForPlayer(row) });
        } else {
          s.emit('terrain_removed', { id });
        }
      }
      // Walls follow visibility — regenerate so reveal grows the
      // FoW occluders and hide pulls them.
      broadcastWallChanges(sessionCode, await regenerateTerrainWalls(row));
    } catch (err) { console.error(err); }
  });

  // Push a marker's artwork to the players as a backdrop — "here's what the
  // fleet on the horizon actually looks like".
  //
  // Same contract as dm_push_token_image_as_backdrop, including copying the
  // file into uploads/backdrops/ rather than pointing at it where it sits:
  // deleting a backdrop unlinks its file, and the terrain routes only ever
  // check the terrain dir before unlinking, so a shared file would let either
  // side pull it out from under the other.
  socket.on('dm_push_terrain_image_as_backdrop', async ({ sessionId, terrainId }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      const r = await db.query(
        `SELECT mt.id, mt.label, tl.name AS lib_name,
                tl.image_path, tl.source_image_path
           FROM map_terrain mt
           LEFT JOIN terrain_library tl ON mt.library_id = tl.id
          WHERE mt.id=$1`,
        [terrainId]
      );
      if (!r.rows.length) return;
      const row = r.rows[0];
      // The unframed original wins: image_path is the circular coin drawn on
      // the map, and showing the party a cropped disc isn't "the full image".
      const sourcePath = row.source_image_path || row.image_path || null;
      if (!sourcePath) {
        socket.emit('error', { message: 'That marker has no image to show.' });
        return;
      }

      const existing = await db.query(
        'SELECT * FROM backdrops WHERE session_id=$1 AND source_image_path=$2 ORDER BY id LIMIT 1',
        [sessionId, sourcePath]
      );
      let backdrop = existing.rows[0] || null;

      if (!backdrop) {
        const uploadsDir = path.join(__dirname, '../uploads');
        const absSource = path.resolve(uploadsDir, sourcePath);
        if (!absSource.startsWith(path.resolve(uploadsDir) + path.sep) || !fs.existsSync(absSource)) {
          socket.emit('error', { message: "That marker's image file is missing." });
          return;
        }
        const backdropsDir = path.join(uploadsDir, 'backdrops');
        fs.mkdirSync(backdropsDir, { recursive: true });
        const ext = path.extname(absSource).toLowerCase() || '.png';
        const filename = `marker-${terrainId}-${Date.now()}${ext}`;
        fs.copyFileSync(absSource, path.join(backdropsDir, filename));

        const nextRes = await db.query(
          'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM backdrops WHERE session_id=$1',
          [sessionId]
        );
        const label = row.label || row.lib_name || 'Marker';
        const ins = await db.query(
          `INSERT INTO backdrops (session_id, name, image_path, sort_order, source_image_path)
           VALUES ($1,$2,$3,$4,$5) RETURNING *`,
          [sessionId, label, `backdrops/${filename}`, nextRes.rows[0].next, sourcePath]
        );
        backdrop = ins.rows[0];
      }

      await db.query('UPDATE sessions SET backdrop_id=$1 WHERE id=$2', [backdrop.id, sessionId]);
      io.to(sessionCode).emit('backdrop_changed', { backdrop });
    } catch (err) {
      console.error(err);
      socket.emit('error', { message: 'Failed to show that marker image.' });
    }
  });

  // Rename a PLACED marker. The library name is the default ("Town"); this is
  // what this particular one is called ("Waterdeep"). Blank clears the override
  // and falls back to the library name.
  socket.on('set_terrain_label', async ({ id, label }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      const clean = typeof label === 'string' && label.trim()
        ? label.trim().slice(0, 120)
        : null;
      await db.query('UPDATE map_terrain SET label=$1 WHERE id=$2', [clean, id]);
      const row = await fetchTerrainRow(id);
      if (!row) return;
      // Same visibility rule as reveal_terrain: a hidden piece isn't on the
      // players' clients at all, so renaming it must not leak the new name.
      const room = io.sockets.adapter.rooms.get(sessionCode);
      if (!room) return;
      for (const sid of room) {
        const sk = io.sockets.sockets.get(sid);
        if (!sk) continue;
        if (sk.data?.role === 'dm') {
          sk.emit('terrain_updated', { terrain: row });
        } else if (!isTerrainHidden(row)) {
          sk.emit('terrain_updated', { terrain: stripTerrainLabelForPlayer(row) });
        }
      }
    } catch (err) { console.error(err); }
  });

  // Per-placement 3D properties: height off the board, the movement lock, and
  // whether this piece wears a name tag.
  //
  // One handler rather than four, because they share every line of the plumbing
  // (GM gate, whitelist, fetch the joined row, broadcast) and differ only in
  // which column they write. Anything absent from the payload is left alone,
  // so the caller can send one field or all of them.
  //
  // No wall regeneration: none of these change the piece's footprint. Elevation
  // deliberately does NOT lift a piece's walls off the floor — the flat map
  // still shows the piece at its grid square, and its blocking geometry belongs
  // to that square whatever height the 3D view draws it at.
  socket.on('set_terrain_props', async ({ id, elevation, locked, showLabel, hideLabelFromPlayers, tint, animSpeed, isActive }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      const fields = [];
      const values = [];
      const push = (k, v) => { values.push(v); fields.push(`${k}=$${values.length}`); };
      if (elevation !== undefined) {
        // Clamped rather than free: the 3D camera frames the board, and a piece
        // parked at 10^6 ft is gone with no way to find it again short of the
        // database. Negative is allowed — below the board is a legitimate place
        // for a seabed or a cavern floor.
        const ft = Number(elevation);
        push('elevation', Number.isFinite(ft) ? Math.max(-5000, Math.min(5000, ft)) : 0);
      }
      if (locked !== undefined) push('locked', !!locked);
      // Tri-state: null is "auto" (markers named, scenery not), true/false is
      // the GM overriding that for this placement.
      if (showLabel !== undefined) push('show_label', showLabel === null ? null : !!showLabel);
      if (hideLabelFromPlayers !== undefined) push('hide_label_from_players', !!hideLabelFromPlayers);
      // Whitelisted to #rrggbb. This string is handed straight to a canvas
      // fillStyle and to THREE.Color on the clients, and anything else would
      // either be ignored silently or — for the canvas — be interpreted as some
      // other CSS colour syntax. Empty/null clears back to the art's own
      // colours.
      if (tint !== undefined) {
        const hex = typeof tint === 'string' ? tint.trim() : '';
        push('tint', /^#[0-9a-fA-F]{6}$/.test(hex) ? hex.toLowerCase() : null);
      }
      // Clamped, and 0 is a legitimate value — it is how the GM stops the
      // animation. The ceiling is there because the drift rates are tuned to
      // be barely perceptible, and past about 4x a cloud stops reading as
      // vapour and starts reading as a fault.
      if (animSpeed !== undefined) {
        const v = Number(animSpeed);
        push('anim_speed', Number.isFinite(v) ? Math.max(0, Math.min(4, v)) : 1);
      }
      // Broadcast like everything else here, so shutting a gate reaches every
      // player's screen the moment the GM flips it.
      if (isActive !== undefined) push('is_active', !!isActive);
      if (!fields.length) return;
      values.push(id);
      await db.query(`UPDATE map_terrain SET ${fields.join(', ')} WHERE id=$${values.length}`, values);
      const row = await fetchTerrainRow(id);
      if (row) broadcastTerrain(sessionCode, 'terrain_updated', row);
    } catch (err) { console.error(err); }
  });

  socket.on('remove_terrain', async ({ id }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      // Capture wall ids first so we can broadcast deletions; the
      // ON DELETE CASCADE on terrain_id wipes them once we delete
      // the terrain row.
      const wallsRes = await db.query('SELECT id FROM walls WHERE terrain_id=$1', [id]);
      const wallIds = wallsRes.rows.map((r) => r.id);
      await db.query('DELETE FROM map_terrain WHERE id=$1', [id]);
      io.to(sessionCode).emit('terrain_removed', { id });
      for (const wid of wallIds) io.to(sessionCode).emit('wall_deleted', { wallId: wid });
    } catch (err) { console.error(err); }
  });

  // ── GM sends treasure items to a player's creature inventory ────────────
  socket.on('send_treasure', async ({ creatureId, items }) => {
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode || socket.data.role !== 'dm') return;
    if (!Array.isArray(items) || !creatureId) return;
    try {
      const cRes = await db.query('SELECT inventory FROM creatures WHERE id=$1', [creatureId]);
      if (!cRes.rows.length) return;
      let inv = cRes.rows[0].inventory || [];
      if (typeof inv === 'string') { try { inv = JSON.parse(inv); } catch { inv = []; } }
      // Stack onto what they already carry rather than appending a second row.
      //
      // Now that the GM can send three of five potions, the other two arriving
      // later would otherwise leave the player with "Potion of Healing ×3" and
      // "Potion of Healing ×2" as separate lines. Only a genuinely identical
      // item merges — same name, same type, same description — so a +1 dagger
      // never absorbs a plain one, and anything carrying its own state (a
      // hidden clause, charges, attunement) is left as its own row.
      const mergeable = (a, b) => String(a.name || '') === String(b.name || '')
        && String(a.item_type || 'item') === String(b.item_type || 'item')
        && String(a.desc || a.description || '') === String(b.desc || b.description || '')
        && !a.gm_secret && !b.gm_secret
        && !a.gm_hidden && !b.gm_hidden
        && !a.charges && !b.charges
        && !a.attuned && !b.attuned
        && !a.equipped;

      const newInv = [...inv];
      for (const raw of items) {
        const incoming = { item_type: 'item', qty: 1, ...raw, equipped: false };
        const at = newInv.findIndex((existing) => mergeable(existing, incoming));
        if (at >= 0) {
          const have = Number(newInv[at].qty) || 1;
          const add = Number(incoming.qty) || 1;
          newInv[at] = { ...newInv[at], qty: have + add };
        } else {
          newInv.push(incoming);
        }
      }
      await db.query('UPDATE creatures SET inventory=$1 WHERE id=$2', [JSON.stringify(newInv), creatureId]);

      // Emitted per socket rather than to the room, because an item the GM
      // planted hidden must not reach a player client at all — not in the
      // notification, and not in the inventory that replaces their sheet's
      // copy. A send that is nothing but hidden items is silent for players:
      // no toast, no inventory churn, nothing to notice.
      const { visibleInventory, visibleItem, isHidden } = require('./itemSecrets');
      const shownItems = items.filter((it) => !isHidden(it)).map(visibleItem);
      const playerInv = visibleInventory(newInv);
      const room = io.sockets.adapter.rooms.get(sessionCode);
      for (const sid of room || []) {
        const sk = io.sockets.sockets.get(sid);
        if (!sk) continue;
        if (sk.data?.role === 'dm') {
          sk.emit('treasure_received', { creatureId, items, newInventory: newInv });
        } else if (shownItems.length) {
          sk.emit('treasure_received', { creatureId, items: shownItems, newInventory: playerInv });
        }
      }
    } catch (err) { console.error('send_treasure error:', err); }
  });

  // ── GM sends currency to a player's creature ────────────────────────────
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

  // ── Players hand inventory items to each other ──────────────────────────
  // Both ends are identified by token, not creature: the token carries the
  // owning player's name, which is what ownership is checked against. The
  // sender must own their token; the recipient only has to be a player token
  // in the same session, so handing something over needs no confirmation from
  // them — the same as passing an item across the table.
  socket.on('player_give_item', async ({ fromTokenId, toTokenId, itemIndex, itemName, qty }) => {
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode || !fromTokenId || !toTokenId) return;
    if (String(fromTokenId) === String(toTokenId)) return;
    try {
      const tokRes = await db.query(
        'SELECT id, session_id, creature_id, player_name, name, is_player FROM session_tokens WHERE id = ANY($1::int[])',
        [[Number(fromTokenId), Number(toTokenId)]]
      );
      const from = tokRes.rows.find((t) => String(t.id) === String(fromTokenId));
      const to = tokRes.rows.find((t) => String(t.id) === String(toTokenId));
      if (!from || !to) return;

      if (socket.data.role !== 'dm' && !ownsToken(socket, from)) {
        socket.emit('error', { message: 'That is not your character.' });
        return;
      }
      // Cross-session transfers would move an item into a table nobody here
      // is playing at.
      if (String(from.session_id) !== String(to.session_id)) return;
      if (!from.creature_id || !to.creature_id) {
        socket.emit('error', { message: 'That token has no character sheet to move items between.' });
        return;
      }

      const cRes = await db.query('SELECT id, name, inventory FROM creatures WHERE id = ANY($1::int[])',
        [[from.creature_id, to.creature_id]]);
      const parseInv = (row) => {
        let inv = row?.inventory || [];
        if (typeof inv === 'string') { try { inv = JSON.parse(inv); } catch { inv = []; } }
        return Array.isArray(inv) ? inv : [];
      };
      const fromCre = cRes.rows.find((c) => String(c.id) === String(from.creature_id));
      const toCre = cRes.rows.find((c) => String(c.id) === String(to.creature_id));
      if (!fromCre || !toCre) return;

      const fromInv = parseInv(fromCre);
      // A PLAYER'S INDEX IS AN INDEX INTO THEIR OWN LIST.
      //
      // Hidden items are absent from the pack a player was sent, so their
      // position 2 is not necessarily the stored position 2. Translated here
      // rather than trusted: untranslated, giving away the second potion would
      // either move the wrong thing or fail the name check below — and a player
      // being told "that item has moved" when nothing moved is exactly how they
      // would learn something was being kept from them.
      const { storedIndexFor } = require('./itemSecrets');
      const idx = socket.data.role === 'dm'
        ? Number(itemIndex)
        : storedIndexFor(fromInv, itemIndex);
      const item = fromInv[idx];
      // The name is re-checked because the index came from a client-side list
      // that may have been reordered or edited since it was rendered.
      if (!item || String(item.name || '') !== String(itemName || '')) {
        socket.emit('error', { message: 'That item is no longer where it was — reopen the panel and try again.' });
        return;
      }

      const have = Math.max(1, Number(item.qty) || 1);
      const moving = Math.max(1, Math.min(have, Number(qty) || 1));

      const nextFrom = [...fromInv];
      if (moving >= have) nextFrom.splice(idx, 1);
      else nextFrom[idx] = { ...item, qty: have - moving };

      // Handing an item over drops any equipped/attuned state: the recipient
      // has to don or attune it themselves.
      const given = { ...item, qty: moving, equipped: false, attuned: false };
      const toInv = parseInv(toCre);
      const stackIdx = toInv.findIndex((it) =>
        String(it?.name || '') === String(given.name || '') &&
        String(it?.item_type || '') === String(given.item_type || '') &&
        !it?.equipped && !it?.attuned);
      const nextTo = [...toInv];
      if (stackIdx >= 0) {
        nextTo[stackIdx] = { ...nextTo[stackIdx], qty: (Number(nextTo[stackIdx].qty) || 1) + moving };
      } else {
        nextTo.push({ ...given, id: Date.now() + Math.floor(Math.random() * 1000) });
      }

      await db.query('UPDATE creatures SET inventory=$1 WHERE id=$2', [JSON.stringify(nextFrom), fromCre.id]);
      await db.query('UPDATE creatures SET inventory=$1 WHERE id=$2', [JSON.stringify(nextTo), toCre.id]);

      // Stripped: this goes to the whole session, so an undiscovered secret
      // riding along on a handed-over item would reach every player's client.
      // The GM's panels read secrets through ?role=dm when they need them.
      const { visibleInventory } = require('./itemSecrets');
      io.to(sessionCode).emit('inventory_transferred', {
        fromCreatureId: fromCre.id,
        toCreatureId: toCre.id,
        fromInventory: visibleInventory(nextFrom),
        toInventory: visibleInventory(nextTo),
        fromName: from.name || fromCre.name || from.player_name,
        toName: to.name || toCre.name || to.player_name,
        item: { name: given.name, qty: moving },
      });
    } catch (err) { console.error('player_give_item error:', err); }
  });

  // ── Spell templates — persistent on-map AOE shapes ────────────────────
  // Templates are placed/edited only by the GM (every handler below
  // gates on role === 'dm'), but the resulting shapes broadcast to every
  // socket in the room so players see plugin-driven elemental effects
  // (fire/water/etc.) on the map.

  socket.on('place_template', async ({ type, points, color, label }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    if (!Array.isArray(points) || points.length < 3) return;
    const allowed = new Set(['cone', 'circle', 'line', 'square']);
    if (!allowed.has(type)) return;
    // The board this belongs to. Without it a template is a property of the
    // session, which is why they followed the party from map to map.
    const placedOn = await dmCurrentMapId();
    const tpl = {
      id: require('crypto').randomUUID(),
      mapId: placedOn == null ? null : Number(placedOn),
      type,
      points: points.slice(0, 8).map(Number),
      color: typeof color === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(color) ? color : '#a855f7',
      label: typeof label === 'string' ? label.slice(0, 60) : '',
    };
    // Aboard a ship? Bound automatically when the template's ORIGIN lands on
    // the deck currently drawn — the same rule that boards a token dropped on a
    // hull, and for the same reason: the GM dragged it out over that deck, so
    // that deck is what they meant. The origin rather than the whole shape,
    // because a cone cast from the quarterdeck legitimately reaches past the
    // rail and out over open water.
    //
    // Squares carry their centre (see templateDeckAnchor), so theirs is tested
    // instead — a square has no origin corner that means anything.
    try {
      const ox = tpl.type === 'square' ? (tpl.points[0] + tpl.points[2]) / 2 : tpl.points[0];
      const oy = tpl.type === 'square' ? (tpl.points[1] + tpl.points[3]) / 2 : tpl.points[1];
      const hit = await shipDeckAtMapPx(tpl.mapId, ox, oy);
      if (hit) {
        const anchored = templateDeckAnchor(tpl, hit.ctx, hit.deckIndex);
        if (anchored) tpl.ship = anchored;
      }
    } catch (err) {
      // A template that fails to bind is still a perfectly good template
      // sitting on the board — never lose the placement over it.
      console.error('template ship-anchor error:', err);
    }
    if (!sessionTemplates[sessionCode]) sessionTemplates[sessionCode] = [];
    sessionTemplates[sessionCode].push(tpl);
    emitToMap(sessionCode, tpl.mapId, 'template_placed', tpl);
  });

  socket.on('update_template', async ({ id, points, color, label, detachShip }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    const list = sessionTemplates[sessionCode];
    if (!list) return;
    const t = list.find(x => x.id === id);
    if (!t) return;
    // Cut it loose. The shape stays exactly where it is on the board — only
    // its habit of following the hull goes.
    if (detachShip) delete t.ship;
    if (Array.isArray(points) && points.length >= 3) {
      t.points = points.slice(0, 8).map(Number);
      // The geometry just moved in MAP space, so the deck-local anchor is now
      // stale — leave it and the next nudge of the wheel would snap the
      // template back to where it used to be. Re-derive it from where the GM
      // has actually put the shape.
      //
      // Re-derived from the CURRENT hull position, so this also handles the
      // case of the GM dragging a bound template off the ship entirely: the
      // origin no longer lands on the deck, and it comes unbound.
      if (t.ship) {
        try {
          const ctx = await loadShipContext(t.ship.shipId);
          const ox = t.type === 'square' ? (t.points[0] + t.points[2]) / 2 : t.points[0];
          const oy = t.type === 'square' ? (t.points[1] + t.points[3]) / 2 : t.points[1];
          const hit = ctx ? await shipDeckAtMapPx(ctx.ship.map_id, ox, oy) : null;
          if (hit && hit.ctx.ship.id === t.ship.shipId) {
            const anchored = templateDeckAnchor(t, hit.ctx, hit.deckIndex);
            if (anchored) t.ship = anchored;
          } else {
            delete t.ship;
          }
        } catch (err) {
          console.error('template re-anchor error:', err);
        }
      }
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

  socket.on('clear_templates', async () => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    // Only the board in front of the GM. Wiping the session's whole list threw
    // away effects still standing on maps the party would come back to.
    const mapId = await dmCurrentMapId();
    const want = mapId == null ? null : Number(mapId);
    sessionTemplates[sessionCode] = (sessionTemplates[sessionCode] || [])
      .filter((t) => (t.mapId == null ? null : Number(t.mapId)) !== want);
    emitToMap(sessionCode, want, 'templates_cleared', { mapId: want });
  });

  // ── Send a handout (GM only) — broadcast to room or whisper to player ───
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

  // ── Set token light source (player: their own token; GM: any) ────────────
  socket.on('set_token_light', async ({ tokenId, brightFt, dimFt, color, flicker }) => {
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      const safeColor = typeof color === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(color) ? color : '#fbbf24';
      const safeFlicker = flicker !== false;
      await db.query(
        'UPDATE session_tokens SET token_light_bright=$1, token_light_dim=$2, token_light_color=$3, token_light_flicker=$4 WHERE id=$5',
        [brightFt || 0, dimFt || 0, safeColor, safeFlicker, tokenId]
      );
      io.to(sessionCode).emit('token_light_changed', {
        tokenId,
        brightFt: brightFt || 0,
        dimFt: dimFt || 0,
        color: safeColor,
        flicker: safeFlicker,
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

  // ── Remove token (GM only) ────────────────────────────────────────────────
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

  // ── Change map (GM only) ──────────────────────────────────────────────────
  // ── Backdrop: full-screen scene art in place of the map ───────────────────
  // backdropId null clears it and drops the players back to whatever map the
  // session is on. The GM's own view never changes — they keep working on the
  // map behind the curtain.
  // ── Lobby ────────────────────────────────────────────────────────────────
  // A player announcing which character they're bound to, so the GM's roster
  // shows who's actually holding which sheet.
  // Bind a player's token to the character sheet they have just chosen.
  //
  // A player who joins before picking gets a nameless 20 hp token, and picking
  // afterwards only ever updated the lobby seat — the token kept no creature at
  // all. Everything that reads the sheet through the token then failed, and
  // failed obscurely: Wild Shape answered "No character sheet linked to that
  // token", the companion summon found no owner, and HP edits had nothing to
  // write to. This is the same adoption `create_player_token` already does when
  // the character is known at join time.
  async function bindTokenToCharacter(sessionCode, playerName, creatureId) {
    if (!sessionCode || !playerName || !creatureId) return;
    try {
      const sess = (await db.query(
        'SELECT id FROM sessions WHERE session_code=$1', [sessionCode]
      )).rows[0];
      if (!sess) return;
      const tok = (await db.query(
        `SELECT * FROM session_tokens
          WHERE session_id=$1 AND player_name=$2 AND is_player=true
          ORDER BY id LIMIT 1`,
        [sess.id, playerName]
      )).rows[0];

      // NO SEAT YET? TAKE ONE.
      //
      // This used to return here, and the comment said "not on a map yet" as
      // though that were a waiting room. It is not: a phone-only player has no
      // token until the GM makes one, so announcing the character they had just
      // built bound nothing, and their sheet stayed on "<name> is ready,
      // waiting for your GM" with an Edit button and no sheet behind it. The GM
      // had no way to know either — an unseated player is not in the roster.
      //
      // The seat created here is mapless (map_id NULL), which is exactly what
      // the GM's own "add to lobby" makes: a place at the table, not a figure
      // on the board. The GM still decides when it goes down on a map.
      if (!tok) {
        const own = (await db.query(
          'SELECT * FROM creatures WHERE id=$1 AND is_player_character=true',
          [creatureId]
        )).rows[0];
        if (!own) return;
        let ownSenses = [];
        try {
          ownSenses = typeof own.senses === 'string' ? JSON.parse(own.senses) : (own.senses || []);
        } catch { ownSenses = []; }
        const seatHp = own.hit_points || 20;
        const seat = (await db.query(
          `INSERT INTO session_tokens
             (session_id, map_id, creature_id, name, image_path, size, size_squares,
              grid_col, grid_row, current_hp, max_hp, is_player, player_name, senses,
              token_light_bright, token_light_dim, token_light_color, token_light_flicker,
              tracker_reminder)
           VALUES ($1, NULL, $2, $3, $4, $5, $6, 0, 0, $7, $7, true, $8, $9, $10, $11, $12, $13, $14)
           RETURNING *`,
          [
            sess.id, creatureId, own.name || playerName, own.image_path,
            own.size, own.size_squares ?? null, seatHp, playerName,
            JSON.stringify(ownSenses),
            own.token_light_bright ?? 0, own.token_light_dim ?? 0,
            own.token_light_color || '#fbbf24', own.token_light_flicker ?? true,
            own.tracker_reminder || '',
          ]
        )).rows[0];
        io.to(sessionCode).emit('token_added', {
          token: {
            ...seat,
            creature_image: own.image_path,
            creature_display_image: own.display_image_path,
            creature_standee: own.standee_image_path,
            creature_dex: own.dexterity,
            creature_speed: own.speed_walk ?? 30,
            creature_speed_fly: own.speed_fly ?? 0,
            creature_speed_swim: own.speed_swim ?? 0,
            creature_speed_climb: own.speed_climb ?? 0,
            creature_speed_burrow: own.speed_burrow ?? 0,
            initiative_bonus: own.initiative_bonus ?? 0,
          },
        });
        return;
      }
      if (Number(tok.creature_id) === Number(creatureId)) return;
      // A token wearing a beast is mid-Wild-Shape; rebinding it underneath
      // would strand the character in the animal.
      if (tok.pretransform) return;

      const c = (await db.query('SELECT * FROM creatures WHERE id=$1', [creatureId])).rows[0];
      if (!c) return;
      let senses = [];
      try {
        senses = typeof c.senses === 'string' ? JSON.parse(c.senses) : (c.senses || []);
      } catch { senses = []; }
      const maxHp = c.hit_points || tok.max_hp || 20;
      // A token that was on full health stays on full health — the default
      // 20/20 placeholder becoming 20/44 would read as a character who had
      // already been chewed on. Anything actually damaged keeps its wounds,
      // capped at the new maximum.
      const wasFull = Number(tok.current_hp) >= Number(tok.max_hp);
      const currentHp = wasFull ? maxHp : Math.min(Number(tok.current_hp) || maxHp, maxHp);

      await db.query(
        `UPDATE session_tokens
            SET creature_id=$1, name=$2, size=$3, size_squares=$4,
                max_hp=$5, current_hp=$6, senses=$7
          WHERE id=$8`,
        [creatureId, c.name || playerName, c.size || tok.size, c.size_squares ?? null,
          maxHp, currentHp, JSON.stringify(senses), tok.id]
      );

      const enriched = (await db.query(
        `SELECT st.*, c.image_path AS creature_image, c.display_image_path AS creature_display_image, c.standee_image_path AS creature_standee, c.base_color AS creature_base_color, c.base_opacity AS creature_base_opacity, c.token_height_ft AS creature_token_height, c.dexterity AS creature_dex, COALESCE(c.speed_walk, 30) AS creature_speed, COALESCE(c.speed_fly, 0) AS creature_speed_fly, COALESCE(c.speed_swim, 0) AS creature_speed_swim, COALESCE(c.speed_climb, 0) AS creature_speed_climb, COALESCE(c.speed_burrow, 0) AS creature_speed_burrow, COALESCE(c.initiative_bonus, 0) AS initiative_bonus
           FROM session_tokens st LEFT JOIN creatures c ON st.creature_id = c.id WHERE st.id=$1`,
        [tok.id]
      )).rows[0];
      io.to(sessionCode).emit('token_refreshed', { token: enriched });
    } catch (err) {
      console.error('bindTokenToCharacter failed:', err.message);
    }
  }

  socket.on('lobby_set_character', ({ characterName, creatureId }) => {
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    if (socket.data.role !== 'player' && !socket.data.companion) return;
    // The seat this socket holds, or failing that the one its PLAYER holds —
    // a phone and a laptop belonging to the same person share one seat, and
    // whichever screen the character was picked on has to update it.
    // THE TOKEN BINDS WHETHER OR NOT THERE IS A LOBBY SEAT.
    //
    // A player who only ever uses their phone has no seat: the sheet joins as
    // a spectator/companion socket, which is not in lobbyRoster, and the
    // by-name fallback below only finds a seat if the same person is ALSO
    // logged in on a second device. Returning early on a missing seat meant
    // that for a phone-only player the creature id never reached their token,
    // so the character they had just built was forgotten the moment they
    // reloaded — the sheet re-read the token, found creature_id NULL, and
    // showed "This token has no character sheet attached". Building another
    // character did the same thing again.
    //
    // The seat is an optional extra here. The binding is the part that has to
    // happen, so it runs first and unconditionally.
    bindTokenToCharacter(sessionCode, socket.data.name, creatureId ?? null);

    let seat = lobbyRoster[sessionCode]?.get(socket.id);
    if (!seat && socket.data.companion) {
      seat = [...(lobbyRoster[sessionCode]?.values() || [])]
        .find((x) => x.name === socket.data.name) || null;
    }
    if (!seat) return;
    seat.characterName = characterName || null;
    // Carried so the GM can add this player to a mapless combat directly from
    // the lobby roster. Older clients don't send it; the seat just keeps null
    // and the GM falls back to adding the creature from the library.
    seat.creatureId = creatureId ?? null;
    emitLobby(io, sessionCode);
  });

  // GM drops every player onto the map they're currently looking at.
  //
  // Player tokens persist across map changes — they keep whichever map_id they
  // were last on — so "spawn to current map" is a bulk move rather than a
  // create. Positions are scattered inside the map's spawn radius, and each
  // pick is added to the occupied set as we go so a six-player party doesn't
  // land in one stack.
  socket.on('spawn_players_to_map', async ({ sessionId }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      const sessRes = await db.query('SELECT id, map_id FROM sessions WHERE id=$1', [sessionId]);
      const session = sessRes.rows[0];
      if (!session) return;
      const mapId = session.map_id;
      if (!mapId) {
        socket.emit('error', { message: 'No map is loaded — pick a map first.' });
        return;
      }

      // Anyone in the lobby who has a character but NO token yet gets one made
      // first. This used to be a pure bulk-move, which quietly did nothing for
      // a player who had never been spawned — the GM pressed the button, the
      // party arrived, and whoever was new stayed invisible until the GM built
      // their token by hand.
      const seats = getLobbyRoster(sessionCode);
      for (const seat of seats) {
        if (!seat?.name) continue;
        const has = await db.query(
          'SELECT 1 FROM session_tokens WHERE session_id=$1 AND is_player=true AND player_name=$2 LIMIT 1',
          [sessionId, seat.name]
        );
        if (has.rows.length) continue;

        // Build from their bound sheet where there is one; a player who hasn't
        // picked a character still gets a token so they aren't left off the
        // map entirely.
        let hp = 20, size = 'medium', squares = null, tokName = seat.name, senses = [], creatureId = null;
        if (seat.creatureId) {
          const cRes = await db.query('SELECT * FROM creatures WHERE id=$1', [seat.creatureId]);
          if (cRes.rows.length) {
            const c = cRes.rows[0];
            creatureId = c.id;
            hp = c.hit_points || hp;
            size = c.size || size;
            squares = c.size_squares ?? null;
            tokName = c.name || tokName;
            try { senses = typeof c.senses === 'string' ? JSON.parse(c.senses) : (c.senses || []); } catch { senses = []; }
          }
        }
        await db.query(
          `INSERT INTO session_tokens
             (session_id, map_id, name, size, size_squares, grid_col, grid_row,
              current_hp, max_hp, is_player, player_name, creature_id, senses)
           VALUES ($1, NULL, $2, $3, $4, 0, 0, $5, $5, true, $6, $7, $8)`,
          [sessionId, tokName, size, squares, hp, seat.name, creatureId, JSON.stringify(senses)]
        );
      }

      // Familiars come along with the party — they're player-side tokens in
      // everything but `is_player`. Their player_name is NULL, so the
      // player_token_ready rebind below simply never matches them.
      const tokensRes = await db.query(
        `SELECT id, player_name, size, map_id FROM session_tokens
          WHERE session_id=$1 AND (is_player=true OR familiar_of IS NOT NULL)
          ORDER BY id`,
        [sessionId]
      );
      if (!tokensRes.rows.length) {
        socket.emit('error', { message: 'No players in the lobby, and no player tokens to move.' });
        return;
      }

      // Anyone ALREADY standing on this map is left exactly where they are.
      //
      // The button means "bring the party to this map", not "line everyone up
      // at the door again". A GM pressing it because one player was still in
      // the lobby was picking the whole party up off the board and dropping
      // them back at the spawn point — losing marching order, losing anyone
      // scouting ahead, and doing it mid-scene.
      //
      // Their squares still count as occupied below, so the players who ARE
      // arriving spread out around them rather than landing on top.
      const staying = tokensRes.rows.filter((t) => Number(t.map_id) === Number(mapId));
      const moving = tokensRes.rows.filter((t) => Number(t.map_id) !== Number(mapId));

      const wallsRes = await db.query('SELECT type, points FROM walls WHERE map_id=$1', [mapId]);
      // The party's own current squares don't count as occupied — they're
      // about to be vacated. Counting them would push the group out into a
      // ring around where they already stand.
      const movingIds = moving.map(t => t.id);
      const occupiedRes = await db.query(
        `SELECT grid_col AS col, grid_row AS row FROM session_tokens
          WHERE session_id=$1 AND map_id=$2 AND NOT (id = ANY($3::int[]))`,
        [sessionId, mapId, movingIds]
      );
      const occupied = occupiedRes.rows;
      // Shared across the group so a party arriving together spreads out
      // instead of stacking — one set of taken deck squares for a shipboard
      // spawn, one growing occupied list for an ordinary one.
      const deckTaken = new Set();

      const users = sessionUsers[sessionCode];

      // The ones who stayed still need their client pointed at their token —
      // a player who was on this map but had never been bound (a reconnect, a
      // fresh tab) would otherwise be looking at the board with nothing to
      // move. Nothing about the token itself changes, so no move is broadcast.
      if (users) {
        for (const tok of staying) {
          if (!tok.player_name) continue;
          for (const [sid, u] of users.entries()) {
            if (u.name === tok.player_name) {
              io.to(sid).emit('player_token_ready', { tokenId: tok.id, mapId });
              break;
            }
          }
        }
      }

      for (const tok of moving) {
        const picked = await resolveMapSpawn(mapId, {
          occupied, walls: wallsRes.rows, deckTaken, sessionId, excludeTokenIds: movingIds,
        });
        occupied.push({ col: picked.col, row: picked.row });
        await db.query(
          `UPDATE session_tokens
              SET map_id=$1, grid_col=$2, grid_row=$3,
                  ship_id=$5, deck_index=$6, deck_col=$7, deck_row=$8
            WHERE id=$4`,
          [mapId, picked.col, picked.row, tok.id,
           picked.shipId, picked.deckIndex, picked.deckCol, picked.deckRow]
        );
        io.to(sessionCode).emit('token_map_changed', {
          tokenId: tok.id, fromMapId: null, toMapId: mapId,
          gridCol: picked.col, gridRow: picked.row,
        });
        // token_map_changed only patches a token a client already holds. A
        // player arriving from a different map isn't in anyone's list yet, so
        // send the full row too — the handlers upsert.
        const enriched = await db.query(
          `SELECT st.*, c.image_path AS creature_image, c.display_image_path AS creature_display_image, c.standee_image_path AS creature_standee, c.base_color AS creature_base_color, c.base_opacity AS creature_base_opacity, c.token_height_ft AS creature_token_height, c.dexterity AS creature_dex, COALESCE(c.speed_walk, 30) AS creature_speed, COALESCE(c.speed_fly, 0) AS creature_speed_fly, COALESCE(c.speed_swim, 0) AS creature_speed_swim, COALESCE(c.speed_climb, 0) AS creature_speed_climb, COALESCE(c.speed_burrow, 0) AS creature_speed_burrow,
                  COALESCE(c.initiative_bonus, 0) AS initiative_bonus
             FROM session_tokens st LEFT JOIN creatures c ON st.creature_id = c.id
            WHERE st.id=$1`,
          [tok.id]
        );
        if (enriched.rows.length) {
          io.to(sessionCode).emit('token_added', { token: enriched.rows[0] });
        }
        // Point the owning player's client at its token on this map, so a
        // player whose token was parked on another map rebinds instead of
        // sitting there with nothing to control.
        if (users) {
          for (const [sid, u] of users.entries()) {
            if (u.name === tok.player_name) {
              io.to(sid).emit('player_token_ready', { tokenId: tok.id, mapId });
              break;
            }
          }
        }
      }

      // Opening the doors is part of the same action — the button is the one
      // gesture that means "you're all on the map now".
      await db.query('UPDATE sessions SET session_started=true WHERE id=$1', [sessionId]);
      io.to(sessionCode).emit('session_started_changed', { started: true });
      emitLobby(io, sessionCode);
    } catch (err) {
      console.error(err);
    }
  });

  // GM sends everyone back to the lobby.
  socket.on('set_session_started', async ({ sessionId, started }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      const val = !!started;
      await db.query('UPDATE sessions SET session_started=$1 WHERE id=$2', [val, sessionId]);
      io.to(sessionCode).emit('session_started_changed', { started: val });
      emitLobby(io, sessionCode);
    } catch (err) {
      console.error(err);
    }
  });

  socket.on('set_backdrop', async ({ sessionId, backdropId }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;

    try {
      if (!backdropId) {
        await db.query('UPDATE sessions SET backdrop_id=NULL WHERE id=$1', [sessionId]);
        io.to(sessionCode).emit('backdrop_changed', { backdrop: null });
        return;
      }
      const r = await db.query('SELECT * FROM backdrops WHERE id=$1', [backdropId]);
      if (!r.rows.length) return;
      await db.query('UPDATE sessions SET backdrop_id=$1 WHERE id=$2', [backdropId, sessionId]);
      io.to(sessionCode).emit('backdrop_changed', { backdrop: r.rows[0] });
    } catch (err) {
      console.error(err);
    }
  });

  // ── Projected map view ────────────────────────────────────────────────────
  //
  // "Everyone look at the map" — the live board, not a still: tokens move on
  // the players' screens as the GM moves them, and every follower is framed on
  // the GM's own camera.
  //
  // Turning it on reveals the WHOLE map to the party, fog included. That's the
  // point on an overland hexcrawl, but it is a real reveal, so it's an explicit
  // GM toggle and never implied by anything else.
  socket.on('set_live_map_view', async ({ sessionId, on }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      await db.query('UPDATE sessions SET live_map_view=$1 WHERE id=$2', [!!on, sessionId]);
      if (!on) liveMapCameras.delete(sessionCode);
      io.to(sessionCode).emit('live_map_view_changed', {
        on: !!on,
        camera: on ? (liveMapCameras.get(sessionCode) || null) : null,
      });
    } catch (err) {
      console.error(err);
    }
  });

  // The GM's visible map rectangle, relayed to the room.
  //
  // Deliberately NOT written to the DB: this fires on every frame of a pan and
  // would be thousands of writes per minute for state that is worthless the
  // moment it's superseded. The latest value is held in memory instead, purely
  // so a player joining mid-projection is framed immediately rather than
  // staring at an unpositioned map until the GM next nudges the view.
  socket.on('live_map_camera', ({ camera }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode || !camera) return;
    const cam = {
      cx: Number(camera.cx), cy: Number(camera.cy),
      w: Number(camera.w), h: Number(camera.h),
    };
    // A NaN here would propagate into every follower's transform and blank
    // their map, so a malformed frame is dropped rather than relayed.
    if (!Object.values(cam).every(Number.isFinite) || cam.w <= 0 || cam.h <= 0) return;
    liveMapCameras.set(sessionCode, cam);
    socket.to(sessionCode).emit('live_map_camera', { camera: cam });
  });

  // ── Transformations & token effects ───────────────────────────────────────
  //
  // Three GM actions share one animation pipeline:
  //   transform — swap a token's identity for another creature's (the cocoon)
  //   revert    — put it back the way it was
  //   effect    — pure spectacle, optionally destroying the token (fire)
  //
  // Every one broadcasts `token_fx` FIRST so all clients start the animation
  // together, then mutates the DB partway through the animation so the swap
  // lands while the token is visually obscured. The client animation and this
  // timing table have to agree — see FX_SPECS in MapStage.jsx.
  const FX_SPECS = {
    blink: { duration: 900,  applyAt:  450 },
    vines: { duration: 1800, applyAt: 1000 },
    fire:  { duration: 1500, applyAt:  750 },
    frost: { duration: 1600, applyAt:  850 },
    none:  { duration: 0,    applyAt:    0 },
  };

  async function enrichToken(tokenId) {
    const r = await db.query(
      `SELECT st.*, c.image_path AS creature_image, c.display_image_path AS creature_display_image, c.standee_image_path AS creature_standee, c.base_color AS creature_base_color, c.base_opacity AS creature_base_opacity, c.token_height_ft AS creature_token_height, c.dexterity AS creature_dex, COALESCE(c.speed_walk, 30) AS creature_speed, COALESCE(c.speed_fly, 0) AS creature_speed_fly, COALESCE(c.speed_swim, 0) AS creature_speed_swim, COALESCE(c.speed_climb, 0) AS creature_speed_climb, COALESCE(c.speed_burrow, 0) AS creature_speed_burrow,
              COALESCE(c.initiative_bonus, 0) AS initiative_bonus
         FROM session_tokens st LEFT JOIN creatures c ON st.creature_id = c.id
        WHERE st.id = $1`,
      [tokenId]
    );
    return r.rows[0] || null;
  }

  socket.on('dm_transform_token', async ({ tokenId, creatureId, effect }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;

    const spec = FX_SPECS[effect] || FX_SPECS.vines;
    try {
      const tokRes = await db.query('SELECT * FROM session_tokens WHERE id=$1', [tokenId]);
      if (!tokRes.rows.length) return;
      const tok = tokRes.rows[0];

      const cRes = await db.query('SELECT * FROM creatures WHERE id=$1', [creatureId]);
      if (!cRes.rows.length) {
        socket.emit('error', { message: 'That creature no longer exists.' });
        return;
      }
      const c = cRes.rows[0];

      io.to(sessionCode).emit('token_fx', { tokenId, effect: effect || 'vines', ts: Date.now() });

      setTimeout(async () => {
        try {
          // Only the first transform records the original — transforming a
          // cocoon into something else still reverts to the real character.
          const memory = tok.pretransform || {
            creature_id: tok.creature_id,
            name: tok.name,
            image_path: tok.image_path,
            size: tok.size,
            max_hp: tok.max_hp,
            current_hp: tok.current_hp,
            // Recorded so reverting restores how the ORIGINAL form was masked,
            // not how the thing it turned into was.
            hide_name_from_players: tok.hide_name_from_players,
            hide_hp_from_players: tok.hide_hp_from_players,
            // Senses travel with the form. A player who becomes something with
            // darkvision SEES with darkvision — fog of war reads the token's
            // senses — so the original set has to come back on revert.
            senses: tok.senses,
            vision_type: tok.vision_type,
            vision_range: tok.vision_range,
          };
          // The new form's senses, straight off the creature. Empty/absent
          // falls back to the token's own so a creature with no senses recorded
          // doesn't blind whatever transformed into it.
          let newSenses = c.senses;
          if (typeof newSenses === 'string') {
            try { newSenses = JSON.parse(newSenses); } catch { newSenses = null; }
          }
          if (!Array.isArray(newSenses) || newSenses.length === 0) newSenses = tok.senses;
          // The new form brings its own library defaults with it: turning into
          // an unidentified horror should mask the token the same way placing
          // that horror from the library would.
          await db.query(
            `UPDATE session_tokens
                SET creature_id=$1, name=$2, image_path=NULL, size=$3,
                    max_hp=$4, current_hp=$5, pretransform=$6,
                    hide_name_from_players=$7, hide_hp_from_players=$8,
                    senses=$9
              WHERE id=$10`,
            [
              c.id, c.name, c.size || tok.size,
              c.hit_points || tok.max_hp, c.hit_points || tok.current_hp,
              JSON.stringify(memory),
              !!c.hide_token_name, !!c.hide_token_hp,
              newSenses ? JSON.stringify(newSenses) : null,
              tokenId,
            ]
          );
          const enriched = await enrichToken(tokenId);
          if (enriched) io.to(sessionCode).emit('token_refreshed', { token: enriched });
        } catch (err) {
          console.error('transform apply error:', err);
        }
      }, spec.applyAt);
    } catch (err) {
      console.error(err);
    }
  });

  socket.on('dm_revert_token', async ({ tokenId, effect }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;

    const spec = FX_SPECS[effect] || FX_SPECS.vines;
    try {
      const tokRes = await db.query('SELECT * FROM session_tokens WHERE id=$1', [tokenId]);
      if (!tokRes.rows.length) return;
      const memory = tokRes.rows[0].pretransform;
      if (!memory) {
        socket.emit('error', { message: 'That token has nothing to revert to.' });
        return;
      }

      io.to(sessionCode).emit('token_fx', { tokenId, effect: effect || 'vines', ts: Date.now() });

      setTimeout(async () => {
        try {
          // Tokens transformed before label memory existed have no flags
          // recorded — those keep whatever they currently have rather than
          // being silently unmasked.
          const tokNow = tokRes.rows[0];
          const revertHideName = memory.hide_name_from_players ?? tokNow.hide_name_from_players;
          const revertHideHp   = memory.hide_hp_from_players   ?? tokNow.hide_hp_from_players;
          await db.query(
            `UPDATE session_tokens
                SET creature_id=$1, name=$2, image_path=$3, size=$4,
                    max_hp=$5, current_hp=$6, pretransform=NULL,
                    hide_name_from_players=$7, hide_hp_from_players=$8,
                    senses=$9,
                    vision_type=COALESCE($10, vision_type),
                    vision_range=COALESCE($11, vision_range)
              WHERE id=$12`,
            [
              memory.creature_id ?? null, memory.name, memory.image_path ?? null,
              memory.size || 'medium', memory.max_hp, memory.current_hp,
              !!revertHideName, !!revertHideHp,
              memory.senses !== undefined && memory.senses !== null
                ? JSON.stringify(memory.senses)
                : (tokNow.senses ? JSON.stringify(tokNow.senses) : null),
              memory.vision_type ?? null,
              memory.vision_range ?? null,
              tokenId,
            ]
          );
          const enriched = await enrichToken(tokenId);
          if (enriched) io.to(sessionCode).emit('token_refreshed', { token: enriched });
        } catch (err) {
          console.error('revert apply error:', err);
        }
      }, spec.applyAt);
    } catch (err) {
      console.error(err);
    }
  });

  // ── Wild Shape ────────────────────────────────────────────────────────────
  //
  // Player-driven transformation into one of the forms the GM curated on their
  // character sheet. Shares the transform pipeline above (animation first, swap
  // partway through, senses and art carried across), with two differences:
  //   - the player triggers it, so ownership and the curated list are checked
  //     server-side rather than trusting the client
  //   - the 2024 rules grant Temporary Hit Points equal to the druid's level,
  //     applied to the beast form on top of its own HP
  //
  // Druid level for a multiclassed character is the DRUID portion only, which
  // is what the temp HP scales with.
  function druidLevelOf(creature) {
    if (!creature) return 0;
    let level = 0;
    if (String(creature.char_class || '').toLowerCase() === 'druid') {
      level += Math.max(1, Number(creature.char_level) || 1);
    }
    const mcs = Array.isArray(creature.multiclasses) ? creature.multiclasses : [];
    for (const mc of mcs) {
      if (String(mc?.class || '').toLowerCase() === 'druid') {
        level += Math.max(1, Number(mc.level) || 1);
      }
    }
    // A non-druid the GM handed shapes to still gets something sane rather
    // than zero temp HP.
    return level || Math.max(1, Number(creature.char_level) || 1);
  }

  // Wild Shape temporary hit points scale by subclass. Checked against the base
  // class and any druid multiclass slot, since either can carry the subclass.
  // Mirrored client-side in data/subclasses.js — keep the two in step.
  //   Circle of the Moon  — Circle Forms: 3 × druid level
  //   Circle of the Titan — Titan Form:   4 × druid level
  //   anything else       — the base 2024 rule: 1 × druid level
  const TEMP_HP_MULTIPLIER = {
    'circle of the moon': 3,
    'circle of the titan': 4,
  };

  function druidSubclassOf(creature) {
    if (!creature) return '';
    if (String(creature.char_class || '').toLowerCase() === 'druid') {
      return String(creature.char_subclass || '').trim().toLowerCase();
    }
    const mcs = Array.isArray(creature.multiclasses) ? creature.multiclasses : [];
    const druidSlot = mcs.find((mc) => String(mc?.class || '').toLowerCase() === 'druid');
    return String(druidSlot?.subclass || '').trim().toLowerCase();
  }

  function wildShapeTempHpFor(creature) {
    const level = druidLevelOf(creature);
    return level * (TEMP_HP_MULTIPLIER[druidSubclassOf(creature)] || 1);
  }

  // Valid token sizes, so a player-supplied value can't write junk into the
  // column that MapStage keys its footprint maths on.
  const TOKEN_SIZE_NAMES = new Set(['tiny', 'small', 'medium', 'large', 'huge', 'gargantuan']);

  // Names are self-asserted at join (as they are everywhere else in this app),
  // so this is an "is this yours" check against typos and stale clients rather
  // than an authentication boundary.
  function ownsToken(sock, tok) {
    const a = String(sock.data.name || '').trim().toLowerCase();
    const b = String(tok.player_name || '').trim().toLowerCase();
    return !!a && a === b;
  }

  // The GM's player-preview iframe runs PlayerView bound to a REAL player's
  // token, but joins under the name "Preview" — so every ownership check would
  // otherwise refuse it. This binds the preview socket to the token's owner for
  // the rest of its life. It changes only this socket's identity for ownership
  // purposes: no lobby roster entry, no broadcast. Names are self-asserted at
  // join anyway, so this grants nothing a typed name couldn't already claim.
  socket.on('player_preview_bind', async ({ tokenId }) => {
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      const r = await db.query(
        'SELECT player_name FROM session_tokens WHERE id=$1 AND is_player=true',
        [tokenId]
      );
      const owner = r.rows[0]?.player_name;
      if (owner) socket.data.name = owner;
    } catch (err) {
      console.error(err);
    }
  });

  // Temporary senses on your own token — the Diviner's Third Eye (Darkvision
  // 120 ft), a Darkvision potion, a spell that grants Blindsight. Fog of war
  // reads the token's senses, so this genuinely changes what the player sees.
  // The client sends the full replacement array (and sends the character's own
  // senses back to revert), so the server keeps no memory of its own.
  socket.on('player_set_token_senses', async ({ tokenId, senses }) => {
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      const tokRes = await db.query('SELECT * FROM session_tokens WHERE id=$1', [tokenId]);
      if (!tokRes.rows.length) return;
      const tok = tokRes.rows[0];
      if (socket.data.role !== 'dm' && !ownsToken(socket, tok)) {
        socket.emit('error', { message: 'That is not your token.' });
        return;
      }

      // Accept only well-formed sense entries — this drives LOS maths, and a
      // junk range would corrupt the player's whole view of the map.
      const VALID = new Set(['normal', 'darkvision', 'blindsight', 'truesight', 'tremorsense', 'devilsight']);
      const clean = (Array.isArray(senses) ? senses : [])
        .map((sn) => {
          const type = VALID.has(String(sn?.type || '').toLowerCase())
            ? String(sn.type).toLowerCase() : 'normal';
          const out = {
            type,
            range: Math.max(0, Math.min(1000, Number(sn?.range) || 0)),
          };
          // Carry the sense's own arc through. It was being dropped here, so
          // editing a creature's senses silently wiped every cone the GM had
          // set on it — the arcs would vanish the next time anyone touched the
          // vision editor. Absent stays absent, which means "inherit".
          if (sn?.arc != null && Number.isFinite(Number(sn.arc))) {
            out.arc = Math.max(10, Math.min(360, Number(sn.arc)));
          }
          return out;
        })
        .slice(0, 6);
      const next = clean.length ? clean : [{ type: 'normal', range: 0 }];

      await db.query('UPDATE session_tokens SET senses=$1 WHERE id=$2', [JSON.stringify(next), tokenId]);
      io.to(sessionCode).emit('token_vision_changed', { tokenId, senses: next });
      const enriched = await enrichToken(tokenId);
      if (enriched) io.to(sessionCode).emit('token_refreshed', { token: enriched });
    } catch (err) {
      console.error(err);
    }
  });

  socket.on('player_wildshape', async ({ tokenId, creatureId }) => {
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      const tokRes = await db.query('SELECT * FROM session_tokens WHERE id=$1', [tokenId]);
      if (!tokRes.rows.length) return;
      const tok = tokRes.rows[0];

      // Only the player who owns the token (or the GM) may reshape it.
      // Compared trimmed + case-insensitively: the name is self-asserted at
      // join time, and "testdruid" vs "TestDruid" is a typo, not an intruder.
      if (socket.data.role !== 'dm' && !ownsToken(socket, tok)) {
        console.warn(
          `wildshape denied: socket name=${JSON.stringify(socket.data.name)} ` +
          `role=${socket.data.role} token=${tok.id} player_name=${JSON.stringify(tok.player_name)}`
        );
        socket.emit('error', { message: 'That is not your token.' });
        return;
      }

      // The character sheet is the authority on which forms are allowed. For an
      // already-transformed token that's the ORIGINAL character, not the beast
      // it is currently wearing — otherwise shifting once would strand them.
      const sheetId = tok.pretransform?.creature_id ?? tok.creature_id;
      const sheetRes = await db.query('SELECT * FROM creatures WHERE id=$1', [sheetId]);
      if (!sheetRes.rows.length) {
        socket.emit('error', {
          message: 'That token is not linked to a character sheet. Pick your character on '
            + 'the lobby screen, or ask your GM to place your token from the library.',
        });
        return;
      }
      const sheet = sheetRes.rows[0];
      const allowed = Array.isArray(sheet.wildshape_forms) ? sheet.wildshape_forms.map(Number) : [];
      if (!allowed.includes(Number(creatureId))) {
        socket.emit('error', { message: 'That form is not on your Wild Shape list.' });
        return;
      }

      const cRes = await db.query('SELECT * FROM creatures WHERE id=$1', [creatureId]);
      if (!cRes.rows.length) return;
      const c = cRes.rows[0];

      const tempHp = wildShapeTempHpFor(sheet);
      io.to(sessionCode).emit('token_fx', { tokenId, effect: 'vines', ts: Date.now() });

      setTimeout(async () => {
        try {
          const memory = tok.pretransform || {
            creature_id: tok.creature_id,
            name: tok.name,
            image_path: tok.image_path,
            size: tok.size,
            max_hp: tok.max_hp,
            current_hp: tok.current_hp,
            temp_hp: tok.temp_hp,
            hide_name_from_players: tok.hide_name_from_players,
            hide_hp_from_players: tok.hide_hp_from_players,
            senses: tok.senses,
            vision_type: tok.vision_type,
            vision_range: tok.vision_range,
          };
          let newSenses = c.senses;
          if (typeof newSenses === 'string') {
            try { newSenses = JSON.parse(newSenses); } catch { newSenses = null; }
          }
          if (!Array.isArray(newSenses) || newSenses.length === 0) newSenses = tok.senses;

          await db.query(
            `UPDATE session_tokens
                SET creature_id=$1, name=$2, image_path=NULL, size=$3,
                    max_hp=$4, current_hp=$5, temp_hp=$6, pretransform=$7,
                    hide_name_from_players=$8, hide_hp_from_players=$9, senses=$10
              WHERE id=$11`,
            [
              // The token KEEPS the character's name through a Wild Shape: the
              // party is looking at their friend wearing a bear, and a name tag
              // that suddenly reads "Brown Bear" loses track of who that is.
              // The form is identified by its art, size and stat block instead.
              // (The GM's own Transform still renames — see dm_transform_token.)
              c.id, tok.name, c.size || tok.size,
              // THE DRUID KEEPS THEIR OWN HIT POINTS.
              //
              // 2024 rules: shifting no longer hands you the beast's hit point
              // pool. You stay on your own hit points and the form grants
              // TEMPORARY hit points on top — druid level, or three times that
              // for Circle of the Moon, which is what `tempHp` below already
              // works out. The old behaviour swapped the pool for the beast's,
              // so a wounded druid healed up by turning into a rat and a
              // healthy one was gutted by turning into a bear.
              //
              // (It read the flag off the FORM's row, too, where it means
              // whether that beast is a legal Wild Shape target — so it was
              // never going to be true on a bear regardless.)
              tok.max_hp,
              tok.current_hp,
              tempHp, JSON.stringify(memory),
              !!c.hide_token_name, !!c.hide_token_hp,
              newSenses ? JSON.stringify(newSenses) : null,
              tokenId,
            ]
          );
          const enriched = await enrichToken(tokenId);
          if (enriched) io.to(sessionCode).emit('token_refreshed', { token: enriched });
          io.to(sessionCode).emit('token_temp_hp_changed', { tokenId, tempHp });
        } catch (err) {
          console.error('wildshape apply error:', err);
        }
      }, FX_SPECS.vines.applyAt);
    } catch (err) {
      console.error(err);
    }
  });

  // Drop out of a form. Temp HP from the shape goes with it — it was granted
  // by the form, not earned by the druid. The hit points themselves were
  // always the druid's and stay exactly as the fight left them.
  // ── Possessing a magic item ───────────────────────────────────────────
  //
  // A Twinkle Doll is worn the way a druid wears a bear, so this reuses the
  // Wild Shape machinery: the token's creature_id is swapped for the form's
  // and `pretransform` remembers who they were. Reverting is the same event.
  //
  // What it deliberately does NOT do is add the doll to wildshape_forms. That
  // list is gated by Wild Shape uses, and possessing a doll is not a Wild
  // Shape — a druid holding one would otherwise be able to spend a charge to
  // become it, and a Fighter could not use it at all.
  //
  // Two rules differ from Wild Shape and are why this is its own handler:
  //   * The doll has its OWN hit points (2). A druid keeps theirs; a possessor
  //     is risking the doll's, and that is the whole tension of the item.
  //   * The memory is stamped `possession: true`, which is what tells the
  //     crumble rule in update_token_hp that a body is waiting to be returned
  //     to.
  socket.on('player_possess_item', async ({ tokenId, itemName }) => {
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      const tokRes = await db.query('SELECT * FROM session_tokens WHERE id=$1', [tokenId]);
      if (!tokRes.rows.length) return;
      const tok = tokRes.rows[0];
      if (socket.data.role !== 'dm' && !ownsToken(socket, tok)) {
        socket.emit('error', { message: 'That is not your token.' });
        return;
      }
      if (tok.pretransform) {
        socket.emit('error', { message: 'You are already in another form.' });
        return;
      }

      const sheetId = tok.creature_id;
      const sheetRes = await db.query('SELECT * FROM creatures WHERE id=$1', [sheetId]);
      if (!sheetRes.rows.length) {
        socket.emit('error', { message: 'That token is not linked to a character sheet.' });
        return;
      }
      const sheet = sheetRes.rows[0];

      // The item has to be in the pack, and attuned if it asks for attunement.
      let inv = sheet.inventory;
      if (typeof inv === 'string') { try { inv = JSON.parse(inv); } catch { inv = []; } }
      if (!Array.isArray(inv)) inv = [];
      const item = inv.find((it) => {
        if (!String(it?.possession_form || '').trim()) return false;
        if (itemName && String(it.name || '') !== String(itemName)) return false;
        return true;
      });
      if (!item) {
        socket.emit('error', { message: 'You are not carrying anything you can possess.' });
        return;
      }
      const needsAttunement = !!(item.attunement_required || item.attunement || item.attunement_req);
      if (needsAttunement && !item.attuned) {
        socket.emit('error', { message: `You must be attuned to the ${item.name} first.` });
        return;
      }

      const formRes = await db.query(
        'SELECT * FROM creatures WHERE name=$1 ORDER BY id LIMIT 1',
        [item.possession_form]
      );
      if (!formRes.rows.length) {
        socket.emit('error', { message: `No stat block found for ${item.possession_form}.` });
        return;
      }
      const form = formRes.rows[0];

      const memory = {
        creature_id: tok.creature_id,
        name: tok.name,
        image_path: tok.image_path,
        size: tok.size,
        max_hp: tok.max_hp,
        current_hp: tok.current_hp,
        temp_hp: tok.temp_hp,
        hide_name_from_players: tok.hide_name_from_players,
        hide_hp_from_players: tok.hide_hp_from_players,
        senses: tok.senses,
        vision_type: tok.vision_type,
        vision_range: tok.vision_range,
        // Read by the crumble rule and by the sheet, which shows a different
        // set of buttons for a possession than for a Wild Shape.
        possession: true,
        possession_item: item.name || '',
      };
      let newSenses = form.senses;
      if (typeof newSenses === 'string') {
        try { newSenses = JSON.parse(newSenses); } catch { newSenses = null; }
      }

      const formHp = Number(form.hit_points) || 1;
      await db.query(
        `UPDATE session_tokens
            SET creature_id=$1, name=$2, image_path=NULL, size=$3,
                max_hp=$4, current_hp=$5, temp_hp=0, pretransform=$6,
                hide_name_from_players=$7, hide_hp_from_players=$8, senses=$9
          WHERE id=$10`,
        [
          form.id, tok.name, form.size || tok.size,
          // The doll's own two hit points, not the character's. Nothing is
          // carried over: the body is elsewhere, catatonic and untouched.
          formHp, formHp,
          JSON.stringify(memory),
          !!form.hide_token_name, !!form.hide_token_hp,
          newSenses ? JSON.stringify(newSenses) : null,
          tokenId,
        ]
      );
      const enriched = await enrichToken(tokenId);
      if (enriched) io.to(sessionCode).emit('token_refreshed', { token: enriched });
      io.to(sessionCode).emit('token_temp_hp_changed', { tokenId, tempHp: 0 });
    } catch (err) {
      console.error('player_possess_item error:', err);
    }
  });

  socket.on('player_wildshape_revert', async ({ tokenId }) => {
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      const tokRes = await db.query('SELECT * FROM session_tokens WHERE id=$1', [tokenId]);
      if (!tokRes.rows.length) return;
      const tok = tokRes.rows[0];
      if (socket.data.role !== 'dm' && !ownsToken(socket, tok)) {
        console.warn(
          `wildshape revert denied: socket name=${JSON.stringify(socket.data.name)} ` +
          `role=${socket.data.role} token=${tok.id} player_name=${JSON.stringify(tok.player_name)}`
        );
        socket.emit('error', { message: 'That is not your token.' });
        return;
      }
      const memory = tok.pretransform;
      if (!memory) return;

      io.to(sessionCode).emit('token_fx', { tokenId, effect: 'vines', ts: Date.now() });

      setTimeout(async () => {
        try {
          await db.query(
            `UPDATE session_tokens
                SET creature_id=$1, name=$2, image_path=$3, size=$4,
                    max_hp=$5, current_hp=$6, temp_hp=$7, pretransform=NULL,
                    hide_name_from_players=$8, hide_hp_from_players=$9,
                    senses=$10,
                    vision_type=COALESCE($11, vision_type),
                    vision_range=COALESCE($12, vision_range)
              WHERE id=$13`,
            [
              memory.creature_id ?? null, memory.name, memory.image_path ?? null,
              memory.size || 'medium',
              // The character's own maximum, which a 2024 shift never touched.
              memory.max_hp,
              // And whatever is LEFT of it. Damage taken in beast form is damage
              // to the druid once the form's temporary hit points are gone, so
              // restoring the remembered figure would undo the fight. A token
              // shifted under the old rules — where the beast's pool replaced the
              // character's — is spotted by its maximum no longer matching, and
              // falls back to the remembered value.
              Number(tok.max_hp) === Number(memory.max_hp)
                ? tok.current_hp
                : memory.current_hp,
              memory.temp_hp ?? 0,
              !!(memory.hide_name_from_players ?? tok.hide_name_from_players),
              !!(memory.hide_hp_from_players ?? tok.hide_hp_from_players),
              memory.senses !== undefined && memory.senses !== null
                ? JSON.stringify(memory.senses)
                : (tok.senses ? JSON.stringify(tok.senses) : null),
              memory.vision_type ?? null,
              memory.vision_range ?? null,
              tokenId,
            ]
          );
          const enriched = await enrichToken(tokenId);
          if (enriched) io.to(sessionCode).emit('token_refreshed', { token: enriched });
          io.to(sessionCode).emit('token_temp_hp_changed', { tokenId, tempHp: memory.temp_hp ?? 0 });
        } catch (err) {
          console.error('wildshape revert error:', err);
        }
      }, FX_SPECS.vines.applyAt);
    } catch (err) {
      console.error(err);
    }
  });

  // Pure effect. `destroy` removes the token once the animation has covered
  // it — the fire blast that leaves nothing behind. `condition` tags the token
  // instead, which is what freezing someone in place amounts to mechanically.
  socket.on('dm_token_fx', async ({ tokenId, effect, destroy, condition }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;

    const spec = FX_SPECS[effect] || FX_SPECS.fire;
    try {
      const exists = await db.query('SELECT conditions FROM session_tokens WHERE id=$1', [tokenId]);
      if (!exists.rows.length) return;

      io.to(sessionCode).emit('token_fx', { tokenId, effect: effect || 'fire', ts: Date.now() });

      setTimeout(async () => {
        try {
          if (destroy) {
            await db.query('DELETE FROM session_tokens WHERE id=$1', [tokenId]);
            io.to(sessionCode).emit('token_removed', { tokenId });
            return;
          }
          if (condition) {
            const current = Array.isArray(exists.rows[0].conditions) ? exists.rows[0].conditions : [];
            if (!current.includes(condition)) {
              const next = [...current, condition];
              await db.query('UPDATE session_tokens SET conditions=$1 WHERE id=$2', [JSON.stringify(next), tokenId]);
              io.to(sessionCode).emit('token_conditions_changed', { tokenId, conditions: next });
            }
          }
        } catch (err) {
          console.error('token fx apply error:', err);
        }
      }, spec.applyAt);
    } catch (err) {
      console.error(err);
    }
  });

  // ── Push a token's art to the players as a backdrop ───────────────────────
  //
  // "Everyone look at this" — the villain's portrait, the statue they're
  // staring at — without the GM having to find the file and upload it as
  // scene art first. The token's current image (its own override, else its
  // creature's portrait) becomes a backdrop and goes live in one action.
  //
  // The file is COPIED into uploads/backdrops/ rather than referenced where it
  // sits. Backdrop deletion unlinks the file, but only inside its own
  // directory, and the creature-art routes only check creatures/creature_images
  // /session_tokens before unlinking — not backdrops. Sharing one file between
  // the two systems would let either side pull it out from under the other.
  socket.on('dm_push_token_image_as_backdrop', async ({ sessionId, tokenId }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;

    try {
      const tokRes = await db.query(
        `SELECT st.id, st.name, st.nickname, st.image_path,
                c.image_path AS creature_image, c.display_image_path AS creature_display_image, c.standee_image_path AS creature_standee, c.base_color AS creature_base_color, c.base_opacity AS creature_base_opacity, c.token_height_ft AS creature_token_height
           FROM session_tokens st
           LEFT JOIN creatures c ON st.creature_id = c.id
          WHERE st.id=$1`,
        [tokenId]
      );
      if (!tokRes.rows.length) return;
      const tok = tokRes.rows[0];
      // Presentation art wins: it's the full picture, where both the token
      // override and the creature portrait are small square token faces.
      const sourcePath = tok.creature_display_image || tok.image_path || tok.creature_image || null;
      if (!sourcePath) {
        socket.emit('error', { message: 'That token has no image to show.' });
        return;
      }

      // Reuse the backdrop this token's art already produced, so pushing the
      // same portrait twice doesn't litter the list.
      const existing = await db.query(
        'SELECT * FROM backdrops WHERE session_id=$1 AND source_image_path=$2 ORDER BY id LIMIT 1',
        [sessionId, sourcePath]
      );

      let backdrop = existing.rows[0] || null;

      if (!backdrop) {
        const uploadsDir = path.join(__dirname, '../uploads');
        const absSource = path.resolve(uploadsDir, sourcePath);
        // The path comes from the DB, but a bad row shouldn't be able to reach
        // outside uploads/ and copy something arbitrary into a served folder.
        if (!absSource.startsWith(path.resolve(uploadsDir) + path.sep) || !fs.existsSync(absSource)) {
          socket.emit('error', { message: "That token's image file is missing." });
          return;
        }

        const backdropsDir = path.join(uploadsDir, 'backdrops');
        fs.mkdirSync(backdropsDir, { recursive: true });
        const ext = path.extname(absSource).toLowerCase() || '.png';
        const filename = `token-${tokenId}-${Date.now()}${ext}`;
        fs.copyFileSync(absSource, path.join(backdropsDir, filename));

        const nextRes = await db.query(
          'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM backdrops WHERE session_id=$1',
          [sessionId]
        );
        const label = tok.nickname || tok.name || 'Token';
        const ins = await db.query(
          `INSERT INTO backdrops (session_id, name, image_path, sort_order, source_image_path)
           VALUES ($1,$2,$3,$4,$5) RETURNING *`,
          [sessionId, label, `backdrops/${filename}`, nextRes.rows[0].next, sourcePath]
        );
        backdrop = ins.rows[0];
      }

      await db.query('UPDATE sessions SET backdrop_id=$1 WHERE id=$2', [backdrop.id, sessionId]);
      io.to(sessionCode).emit('backdrop_changed', { backdrop });
    } catch (err) {
      console.error(err);
      socket.emit('error', { message: 'Failed to show that token image.' });
    }
  });

  socket.on('change_map', async ({ sessionId, mapId }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;

    try {
      await db.query('UPDATE sessions SET map_id=$1 WHERE id=$2', [mapId || null, sessionId]);
      if (!mapId) {
        io.to(sessionCode).emit('map_changed', { map: null, levels: [], walls: [], doors: [], lights: [], tokens: [], magicalDarkness: [], portals: [], tiles: [] });
        return;
      }
      const mapRes = await db.query('SELECT * FROM maps WHERE id=$1', [mapId]);
      if (!mapRes.rows.length) return;
      // Read from map_tiles rather than joined out of the library, for the same
      // reason the join path does: a laid tile keeps its own art and edges.
      const tilesRes = await db.query(
        'SELECT * FROM map_tiles WHERE map_id=$1 ORDER BY id', [mapId]
      );
      const map = mapRes.rows[0];
      // Fog of war belongs to the map now, with the session flag as the
      // fallback for maps never toggled. Resolved here so no client has to
      // re-implement the precedence.
      const sessFow = await db.query('SELECT fow_enabled FROM sessions WHERE id=$1', [sessionId]);
      const effectiveFow = map.fow_enabled ?? (sessFow.rows[0]?.fow_enabled || false);
      const wallsRes    = await db.query('SELECT * FROM walls WHERE map_id=$1 ORDER BY created_at', [mapId]);
      const doorsRes    = await db.query('SELECT * FROM doors WHERE map_id=$1 ORDER BY created_at', [mapId]);
      const shipsRes    = await db.query(
        `SELECT ms.*, sl.name AS class_name, sl.speed, sl.armor_class, sl.hull_hp, sl.air_bubble_ft,
                COALESCE(
                  (SELECT json_agg(sd.* ORDER BY sd.deck_index)
                     FROM ship_decks sd WHERE sd.ship_id = ms.library_id),
                  '[]'::json
                ) AS decks
           FROM map_ships ms
           LEFT JOIN ship_library sl ON ms.library_id = sl.id
          WHERE ms.map_id=$1
          ORDER BY ms.z_index, ms.id`,
        [mapId]
      );
      const lightsRes   = await db.query('SELECT * FROM light_sources WHERE map_id=$1 ORDER BY created_at', [mapId]);
      const tokensRes   = await db.query(
        `SELECT st.*, c.image_path AS creature_image, c.display_image_path AS creature_display_image, c.standee_image_path AS creature_standee, c.base_color AS creature_base_color, c.base_opacity AS creature_base_opacity, c.token_height_ft AS creature_token_height
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
      const spawnPointsRes = await db.query(
        'SELECT * FROM map_spawn_points WHERE map_id=$1 ORDER BY created_at',
        [mapId]
      );
      const portalsRes = await db.query(
        'SELECT * FROM map_portals WHERE map_id=$1 ORDER BY created_at',
        [mapId]
      );
      const terrainRes = await db.query(
        `SELECT mt.*, tl.image_path AS lib_image_path, tl.name AS lib_name, tl.is_marker,
              tl.three_d_shape AS lib_three_d_shape,
              tl.model_path AS lib_model_path, tl.model_scale AS lib_model_scale,
              tl.cloud_form AS lib_cloud_form,
              tl.piece_form AS lib_piece_form,
              tl.source_image_path AS lib_source_image_path,
                tl.blocks_vision, tl.blocks_light, tl.blocks_movement,
                tl.hide_until_revealed, tl.custom_walls
           FROM map_terrain mt
           LEFT JOIN terrain_library tl ON mt.library_id = tl.id
          WHERE mt.map_id=$1
          ORDER BY mt.z_index, mt.id`,
        [mapId]
      );
      // Per-recipient terrain filter: players don't get hidden terrain.
      const allTerrain = terrainRes.rows;
      const visibleTerrain = terrainForPlayer(allTerrain);
      const allPortals = portalsRes.rows;
      const visiblePortals = allPortals.filter(p => !p.hidden);
      const room = io.sockets.adapter.rooms.get(sessionCode);
      // The board's storeys travel with it, like its walls do.
      const levelsRes = await db.query(
        'SELECT * FROM map_levels WHERE map_id=$1 ORDER BY level_index',
        [mapId]
      );
      if (room) {
        for (const sid of room) {
          const s = io.sockets.sockets.get(sid);
          if (!s) continue;
          s.emit('map_changed', {
            map,
            levels: levelsRes.rows,
            walls: wallsRes.rows,
            doors: doorsRes.rows,
            lights: lightsRes.rows,
            tokens: tokensRes.rows,
            magicalDarkness: darknessRes.rows,
            spawnPoints: spawnPointsRes.rows,
            ships: shipsRes.rows,
            terrain: s.data?.role === 'dm' ? allTerrain : visibleTerrain,
            portals: s.data?.role === 'dm' ? allPortals : visiblePortals,
            spawnPoint: { col: map.spawn_col ?? 0, row: map.spawn_row ?? 0, radius: map.spawn_radius ?? 0 },
            fowEnabled: effectiveFow,
            // Map-scoped session state travels WITH the map change. Both of
            // these were only ever filtered at join, so switching boards
            // mid-session carried the old board's templates and ink across.
            spellTemplates: templatesForMap(sessionCode, mapId),
            // Tiles are map-scoped too, and were the one thing left out of this
            // payload. The clients keep whatever they were last given, so a
            // board change left the previous map's tiles sitting on the new one
            // — the dungeon appeared to have been laid onto every map at once.
            // Same query the join path uses, so both arrive identically shaped.
            tiles: tilesRes.rows,
            skyImage: map.sky_image_path || null,
            skyPreset: map.sky_preset || null,
            systemData: map.system_data || null,
            drawings: drawingsForMap(sessionCode, mapId),
          });
        }
      }
    } catch (err) {
      console.error(err);
    }
  });

  // ── Map spawn points CRUD (GM only) ───────────────────────────────────────
  // Named spawn points per map. The right-click "Send to map → spawn point"
  // submenu pulls labels from here, and `dm_send_token_to_map` accepts an
  // optional spawnPointId that overrides the map's default landing tile.
  // Sanitise a polygon coming from the client into the JSONB shape we
  // store. Drops bad rows; returns null when fewer than 3 valid
  // vertices remain (a polygon needs at least a triangle).
  function sanitisePolygon(raw) {
    if (!Array.isArray(raw)) return null;
    const out = [];
    for (const p of raw) {
      if (p == null) continue;
      const c = Number(p.col), r = Number(p.row);
      if (Number.isFinite(c) && Number.isFinite(r)) out.push({ col: c, row: r });
    }
    return out.length >= 3 ? out : null;
  }
  socket.on('add_spawn_point', async ({ mapId, label, gridCol, gridRow, radius, shapePoints }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      const poly = sanitisePolygon(shapePoints);
      const r = await db.query(
        'INSERT INTO map_spawn_points (map_id, label, grid_col, grid_row, radius, shape_points) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
        [
          mapId,
          String(label || '').slice(0, 100),
          gridCol,
          gridRow,
          Math.max(0, Math.floor(Number(radius) || 0)),
          poly ? JSON.stringify(poly) : null,
        ]
      );
      io.to(sessionCode).emit('spawn_point_added', { spawnPoint: r.rows[0] });
    } catch (err) {
      console.error(err);
    }
  });

  socket.on('update_spawn_point', async ({ id, label, gridCol, gridRow, radius, shapePoints }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      const oldRes = await db.query(
        'SELECT grid_col, grid_row, label, radius, shape_points FROM map_spawn_points WHERE id=$1',
        [id]
      );
      if (!oldRes.rows.length) return;
      const old = oldRes.rows[0];
      const next = {
        label:        label    !== undefined ? String(label).slice(0, 100) : old.label,
        grid_col:     gridCol  !== undefined ? Number(gridCol) : Number(old.grid_col),
        grid_row:     gridRow  !== undefined ? Number(gridRow) : Number(old.grid_row),
        radius:       radius   !== undefined ? Math.max(0, Math.floor(Number(radius) || 0)) : (old.radius ?? 0),
        shape_points: old.shape_points,
      };
      if (shapePoints !== undefined) {
        next.shape_points = sanitisePolygon(shapePoints);
      } else if ((gridCol !== undefined || gridRow !== undefined) && Array.isArray(old.shape_points)) {
        // Drag-to-relocate: translate the polygon by the same delta as
        // the anchor so the shape moves with the centre dot.
        const dCol = next.grid_col - Number(old.grid_col);
        const dRow = next.grid_row - Number(old.grid_row);
        if (dCol !== 0 || dRow !== 0) {
          next.shape_points = old.shape_points.map(p => ({
            col: Number(p.col) + dCol,
            row: Number(p.row) + dRow,
          }));
        }
      }
      const r = await db.query(
        `UPDATE map_spawn_points
            SET label=$1, grid_col=$2, grid_row=$3, radius=$4, shape_points=$5
          WHERE id=$6
          RETURNING *`,
        [
          next.label,
          next.grid_col,
          next.grid_row,
          next.radius,
          next.shape_points ? JSON.stringify(next.shape_points) : null,
          id,
        ]
      );
      if (!r.rows.length) return;
      io.to(sessionCode).emit('spawn_point_updated', { spawnPoint: r.rows[0] });
    } catch (err) {
      console.error(err);
    }
  });

  socket.on('remove_spawn_point', async ({ id }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      const r = await db.query('DELETE FROM map_spawn_points WHERE id=$1 RETURNING map_id', [id]);
      if (!r.rows.length) return;
      io.to(sessionCode).emit('spawn_point_removed', { id, mapId: r.rows[0].map_id });
    } catch (err) {
      console.error(err);
    }
  });

  // ── Portals ───────────────────────────────────────────────────────────────
  //
  // CRUD is GM-only; `use_portal` is open to players, because using a portal
  // is the whole point. Two ends share a pair_id (see the migration above for
  // what hidden/exit_enabled each mean).

  // A hidden portal must never reach a player's client, so every portal
  // broadcast goes out per-recipient rather than to the room. A portal that
  // has just been hidden is sent to players as a removal, which is exactly
  // what it is from where they're standing.
  function emitPortal(sessionCode, event, portal) {
    const room = io.sockets.adapter.rooms.get(sessionCode);
    if (!room) return;
    for (const sid of room) {
      const s = io.sockets.sockets.get(sid);
      if (!s) continue;
      if (s.data?.role === 'dm' || !portal.hidden) s.emit(event, { portal });
      else s.emit('portal_removed', { id: portal.id, mapId: portal.map_id });
    }
  }

  socket.on('add_portal', async ({ mapId, pairId, label, gridCol, gridRow, color, hidden, exitEnabled }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode || !mapId || !pairId) return;
    try {
      // Two ends per link, no more: a third portal sharing a pair_id would
      // make "the other end" ambiguous and the exit would depend on row order.
      const existing = await db.query('SELECT COUNT(*)::int AS n FROM map_portals WHERE pair_id=$1', [pairId]);
      if (existing.rows[0].n >= 2) return;
      const r = await db.query(
        `INSERT INTO map_portals (map_id, pair_id, label, grid_col, grid_row, color, hidden, exit_enabled)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [
          mapId,
          pairId,
          String(label || '').slice(0, 100),
          // Free placement: portals sit wherever the GM dropped them, not on
          // whole squares. Stored as the square-corner anchor (centre is
          // +0.5), which is the same convention the renderer uses.
          Number(gridCol) || 0,
          Number(gridRow) || 0,
          String(color || '#a855f7').slice(0, 20),
          hidden === true,
          exitEnabled !== false,
        ]
      );
      invalidatePortalCache(mapId);
      emitPortal(sessionCode, 'portal_added', r.rows[0]);
    } catch (err) { console.error(err); }
  });

  socket.on('update_portal', async ({ id, label, gridCol, gridRow, color, hidden, exitEnabled }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      const oldRes = await db.query('SELECT * FROM map_portals WHERE id=$1', [id]);
      if (!oldRes.rows.length) return;
      const old = oldRes.rows[0];
      const r = await db.query(
        `UPDATE map_portals
            SET label=$1, grid_col=$2, grid_row=$3, color=$4, hidden=$5, exit_enabled=$6
          WHERE id=$7 RETURNING *`,
        [
          label       !== undefined ? String(label).slice(0, 100) : old.label,
          gridCol     !== undefined ? Number(gridCol) : Number(old.grid_col),
          gridRow     !== undefined ? Number(gridRow) : Number(old.grid_row),
          color       !== undefined ? String(color).slice(0, 20)  : old.color,
          hidden      !== undefined ? hidden === true             : old.hidden,
          exitEnabled !== undefined ? exitEnabled === true        : old.exit_enabled,
          id,
        ]
      );
      if (r.rows.length) {
        invalidatePortalCache(r.rows[0].map_id);
        emitPortal(sessionCode, 'portal_updated', r.rows[0]);
      }
    } catch (err) { console.error(err); }
  });

  // Deleting one end deletes both. A portal with nowhere to go is a trap for
  // the GM: it renders, it's clickable, and it silently does nothing.
  socket.on('remove_portal', async ({ id }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      const one = await db.query('SELECT pair_id FROM map_portals WHERE id=$1', [id]);
      if (!one.rows.length) return;
      const r = await db.query(
        'DELETE FROM map_portals WHERE pair_id=$1 RETURNING id, map_id',
        [one.rows[0].pair_id]
      );
      for (const row of r.rows) {
        invalidatePortalCache(row.map_id);
        io.to(sessionCode).emit('portal_removed', { id: row.id, mapId: row.map_id });
      }
    } catch (err) { console.error(err); }
  });

  socket.on('clear_portals', async ({ mapId }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode || !mapId) return;
    try {
      await db.query('DELETE FROM map_portals WHERE map_id=$1', [mapId]);
      invalidatePortalCache(mapId);
      io.to(sessionCode).emit('portals_cleared', { mapId });
    } catch (err) { console.error(err); }
  });

  socket.on('use_portal', async ({ portalId, tokenId }) => {
    const sessionCode = socket.data.sessionCode;
    console.log(`[portal] use_portal from ${socket.data.role || '?'} portal=${portalId} token=${tokenId ?? 'none'}`);
    if (!sessionCode || !portalId) return;
    try {
      const pRes = await db.query('SELECT * FROM map_portals WHERE id=$1', [portalId]);
      if (!pRes.rows.length) return;
      const portal = pRes.rows[0];
      // A player can't click what they were never sent.
      if (portal.hidden && socket.data.role !== 'dm') return;

      // No token nominated (nothing selected client-side): the pad picks its
      // own passenger. One token standing on it is unambiguous; a crowd is
      // not, so that case waits for a selection rather than guessing.
      if (!tokenId) {
        const standing = await db.query(
          'SELECT id, size, size_squares, grid_col, grid_row FROM session_tokens WHERE map_id=$1',
          [portal.map_id]
        );
        const onPad = standing.rows.filter(t => portalCovering([portal], t, t.grid_col, t.grid_row));
        if (onPad.length !== 1) {
          socket.emit('portal_needs_token', { portalId, standing: onPad.length });
          return;
        }
        tokenId = onPad[0].id;
      }

      // Which end does the traveller leave from? If the token is already
      // standing on one end of this pair, that end is the departure — so
      // clicking the far pad sends them *there* rather than dragging them
      // back to where they already are. Otherwise the clicked end is the
      // departure and they come out the other side.
      let from = portal;
      const tokRes = await db.query(
        'SELECT id, map_id, size, size_squares, grid_col, grid_row FROM session_tokens WHERE id=$1',
        [tokenId]
      );
      if (tokRes.rows.length) {
        const token = tokRes.rows[0];
        const pair = (await portalsForMap(portal.map_id)).filter(p => p.pair_id === portal.pair_id);
        const standing = portalCovering(pair, token, token.grid_col, token.grid_row);
        if (standing) from = standing;
      }
      await runPortal(sessionCode, from, tokenId, io);
    } catch (err) { console.error(err); }
  });

  // ── Wall CRUD (GM only) ───────────────────────────────────────────────────
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

  // ── Fog Block CRUD ──────────────────────────────────────────────────────
  socket.on('add_fog_block', async ({ mapId, points, label }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      const result = await db.query(
        `INSERT INTO map_fog_blocks (map_id, label, points)
         VALUES ($1,$2,$3) RETURNING *`,
        [mapId, label || '', JSON.stringify(points || [])]
      );
      io.to(sessionCode).emit('fog_block_added', { fogBlock: result.rows[0] });
    } catch (err) { console.error(err); }
  });

  socket.on('reveal_fog_block', async ({ id }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      const result = await db.query(
        'UPDATE map_fog_blocks SET is_revealed=true WHERE id=$1 RETURNING *',
        [id]
      );
      if (result.rows[0]) io.to(sessionCode).emit('fog_block_updated', { fogBlock: result.rows[0] });
    } catch (err) { console.error(err); }
  });

  socket.on('hide_fog_block', async ({ id }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      const result = await db.query(
        'UPDATE map_fog_blocks SET is_revealed=false WHERE id=$1 RETURNING *',
        [id]
      );
      if (result.rows[0]) io.to(sessionCode).emit('fog_block_updated', { fogBlock: result.rows[0] });
    } catch (err) { console.error(err); }
  });

  socket.on('delete_fog_block', async ({ id }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      await db.query('DELETE FROM map_fog_blocks WHERE id=$1', [id]);
      io.to(sessionCode).emit('fog_block_deleted', { id });
    } catch (err) { console.error(err); }
  });

  // ── Door CRUD + toggle ───────────────────────────────────────────────────
  socket.on('add_door', async ({ mapId, style, points }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      const { v4: uuidv4 } = require('uuid');
      // Born with the GM's chosen look rather than bare, so a door is already
      // textured for the players the moment it appears.
      const dd = await require('./doorDefaults').doorDefaultFor('door');
      const result = await db.query(
        `INSERT INTO doors (id, map_id, style, points, open_dir, sprite_path, sprite_motion)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [uuidv4(), mapId, style || 'standard', JSON.stringify(points), 1,
         dd.spritePath, dd.spriteMotion]
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

  // GM renames a door for easy identification in the door list.
  socket.on('set_door_label', async ({ doorId, label }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      const res = await db.query(
        'UPDATE doors SET label=$1 WHERE id=$2 RETURNING id, label',
        [String(label || '').slice(0, 100), doorId]
      );
      if (res.rows.length) {
        io.to(sessionCode).emit('door_label_changed', { doorId: res.rows[0].id, label: res.rows[0].label });
      }
    } catch (err) { console.error(err); }
  });

  // GM sets a door's emitted light (fireplace glow). radius 0 = off.
  socket.on('set_door_light', async ({ doorId, radius, color, side }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      const r = Math.max(0, Math.min(200, Number(radius) || 0));
      const s = side === -1 ? -1 : 1;
      const res = await db.query(
        'UPDATE doors SET light_radius=$1, light_color=$2, light_side=$3 WHERE id=$4 RETURNING id, light_radius, light_color, light_side',
        [r, String(color || '').slice(0, 20), s, doorId]
      );
      if (res.rows.length) {
        io.to(sessionCode).emit('door_light_changed', {
          doorId: res.rows[0].id,
          lightRadius: res.rows[0].light_radius,
          lightColor: res.rows[0].light_color,
          lightSide: res.rows[0].light_side,
        });
      }
    } catch (err) { console.error(err); }
  });

  // GM assigns/clears a door's sprite + motion. spritePath null clears it.
  socket.on('set_door_sprite', async ({ doorId, spritePath, spriteMotion }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      // Whitelisted against the one canonical list, shared with the default
      // and the importers. Kept in a single place because an unknown value
      // here is silently coerced to 'swing', so a motion missing from the list
      // looks like the GM's click did nothing rather than like an error.
      const motion = require('./doorDefaults').normaliseMotion(spriteMotion);
      const res = await db.query(
        'UPDATE doors SET sprite_path=$1, sprite_motion=$2 WHERE id=$3 RETURNING id, sprite_path, sprite_motion',
        [spritePath || null, motion, doorId]
      );
      if (res.rows.length) {
        io.to(sessionCode).emit('door_sprite_changed', {
          doorId: res.rows[0].id,
          spritePath: res.rows[0].sprite_path,
          spriteMotion: res.rows[0].sprite_motion,
        });
      }
    } catch (err) { console.error(err); }
  });

  // Players and GM can toggle doors open/closed
  socket.on('toggle_door', async ({ doorId }) => {
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      // A SHUT secret door is not a door to a player, and this is where that
      // has to be enforced: the map already declines to offer it, but a client
      // can emit whatever it likes, and "the wall opened when I clicked it" is
      // the whole secret gone. Once open it is an ordinary doorway again, so
      // anyone may close it behind them.
      if (socket.data.role !== 'dm') {
        const cur = (await db.query(
          'SELECT is_open, sprite_motion FROM doors WHERE id=$1', [doorId]
        )).rows[0];
        if (!cur) return;
        if (!cur.is_open && cur.sprite_motion === 'secret') return;
      }
      const res = await db.query(
        'UPDATE doors SET is_open = NOT is_open WHERE id=$1 RETURNING id, is_open',
        [doorId]
      );
      if (res.rows.length) {
        io.to(sessionCode).emit('door_toggled', { doorId: res.rows[0].id, isOpen: res.rows[0].is_open });
        // A door is an occluder: opening one can hand a guard a sight line
        // down a corridor without anybody having moved a step.
        sneakWatch(sessionCode);
      }
    } catch (err) { console.error(err); }
  });

  // GM can flip the swing direction of a door
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

  // ── Light source CRUD (GM only) ──────────────────────────────────────────
  socket.on('add_light', async ({ mapId, x, y, brightRadius, dimRadius, label, color, direction, spreadAngle, flicker }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      const { v4: uuidv4 } = require('uuid');
      const result = await db.query(
        `INSERT INTO light_sources (id, map_id, x, y, bright_radius, dim_radius, label, color, direction, spread_angle, flicker)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
        [uuidv4(), mapId, x, y, brightRadius || 60, dimRadius || brightRadius * 2 || 120, label || '', color || '#fbbf24', direction || 0, spreadAngle || 360, flicker !== false]
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

  socket.on('update_light', async ({ lightId, brightRadius, dimRadius, color, label, direction, spreadAngle, flicker }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      const result = await db.query(
        `UPDATE light_sources SET bright_radius=$1, dim_radius=$2, color=$3, label=$4, direction=$5, spread_angle=$6, flicker=$7 WHERE id=$8 RETURNING *`,
        [brightRadius, dimRadius, color || '#fbbf24', label || '', direction || 0, spreadAngle || 360, flicker !== false, lightId]
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

  // ── Magical darkness CRUD (GM only) ─────────────────────────────────────
  socket.on('add_magical_darkness', async ({ sessionId, mapId, x, y, radius, zoneType, shape, polyPoints, levelIndex }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      const { v4: uuidv4 } = require('uuid');
      const resolvedMapId = mapId || (await db.query('SELECT map_id FROM sessions WHERE id=$1', [sessionId])).rows[0]?.map_id || null;
      const type = (zoneType === 'heavy-fog') ? 'heavy-fog' : (zoneType === 'water') ? 'water' : 'darkness';
      const shapeVal = (shape === 'polygon') ? 'polygon' : 'circle';
      const polyPtsVal = (shapeVal === 'polygon' && Array.isArray(polyPoints)) ? JSON.stringify(polyPoints) : '[]';
      // The storey the GM was working on when they drew it. Falls back to the
      // ground floor, which is both the old behaviour and the right answer for
      // a map with no storeys at all.
      const lvl = Number.isFinite(Number(levelIndex)) ? Math.trunc(Number(levelIndex)) : 0;
      const result = await db.query(
        `INSERT INTO magical_darkness (id, session_id, map_id, x, y, radius, zone_type, shape, poly_points, level_index)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
        [uuidv4(), sessionId, resolvedMapId, x || 0, y || 0, Math.round(radius) || 0, type, shapeVal, polyPtsVal, lvl]
      );
      io.to(sessionCode).emit('magical_darkness_added', { darkness: result.rows[0] });
    } catch (err) { console.error(err); }
  });

  // Create a zone already anchored to a token, in one action. The centre is
  // computed here rather than sent by the client so it uses the same grid
  // maths as spawning — the client's idea of the offset can't drift into it.
  // Footprint widths mirror TOKEN_SIZES in MapStage.
  const SIZE_GRID_W = { tiny: 1, small: 1, medium: 1, large: 2, huge: 3, gargantuan: 4 };
  socket.on('dm_add_darkness_on_token', async ({ sessionId, tokenId, radiusFt, zoneType }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      const tokRes = await db.query(
        `SELECT st.grid_col, st.grid_row, st.size, st.size_squares, st.map_id,
                COALESCE(m.grid_size, s.grid_size, 50) AS grid_size,
                m.width, m.height
           FROM session_tokens st
           LEFT JOIN maps m ON st.map_id = m.id
           LEFT JOIN sessions s ON s.id = st.session_id
          WHERE st.id=$1`,
        [tokenId]
      );
      if (!tokRes.rows.length) return;
      const t = tokRes.rows[0];
      const gs = Number(t.grid_size) || 50;
      const offX = gs > 0 ? (Number(t.width || 0) % gs) / 2 : 0;
      const offY = gs > 0 ? (Number(t.height || 0) % gs) / 2 : 0;
      const w = shipMath.tokenExtent(t);
      const cx = offX + Number(t.grid_col) * gs + (w * gs) / 2;
      const cy = offY + Number(t.grid_row) * gs + (w * gs) / 2;
      // Feet → pixels on the 5-ft grid, matching the client's conversion.
      const radiusPx = Math.round(((Number(radiusFt) || 15) / 5) * gs);

      const { v4: uuidv4 } = require('uuid');
      const type = (zoneType === 'heavy-fog') ? 'heavy-fog' : (zoneType === 'water') ? 'water' : 'darkness';
      const result = await db.query(
        `INSERT INTO magical_darkness (id, session_id, map_id, x, y, radius, zone_type, shape, poly_points, attached_token_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'circle','[]',$8) RETURNING *`,
        [uuidv4(), sessionId, t.map_id, cx, cy, radiusPx, type, tokenId]
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

  socket.on('update_zone_height', async ({ darknessId, heightFt }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      // Clamped, and null-able. A bank taller than the storey it stands in
      // pushes up through the floor above, which is the whole reason this is
      // adjustable — but the ceiling here is only a sanity bound, since the
      // GM may well want fog filling a stairwell or an atrium.
      let h = heightFt == null ? null : Number(heightFt);
      if (h != null && !Number.isFinite(h)) return;
      if (h != null) h = Math.max(0, Math.min(500, h));
      await db.query('UPDATE magical_darkness SET height_ft=$1 WHERE id=$2', [h, darknessId]);
      io.to(sessionCode).emit('zone_height_updated', { darknessId, heightFt: h });
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

  // ── Sound effects (GM only) ─────────────────────────────────────────────
  // We route per-map at the server: only sockets whose activeMapId
  // matches the source map get the play_* event. Sockets that haven't
  // reported an activeMapId yet (older client, or pre-set_player_active
  // race window) are included as a safety fallback so they don't go
  // silent on a partial roll-out.
  async function dmCurrentMapId() {
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return null;
    try {
      const r = await db.query(
        'SELECT map_id FROM sessions WHERE session_code=$1',
        [sessionCode]
      );
      return r.rows[0]?.map_id ?? null;
    } catch { return null; }
  }
  function emitToMap(sessionCode, mapId, eventName, payload) {
    const room = io.sockets.adapter.rooms.get(sessionCode);
    if (!room) return;
    const target = mapId == null ? null : Number(mapId);
    for (const sid of room) {
      const s = io.sockets.sockets.get(sid);
      if (!s) continue;
      // The socket that asked for this always gets it. Routing is a filter for
      // the AUDIENCE, not for the person pressing the button: a GM whose
      // reported activeMapId had gone stale was filtering themselves out of
      // their own sound effects while every player heard them.
      if (s.id === socket.id) { s.emit(eventName, payload); continue; }
      const ami = s.data.activeMapId;
      if (target == null || ami == null || Number(ami) === target) {
        s.emit(eventName, payload);
      }
    }
  }
  socket.on('play_sound', async ({ filename, volume }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    const mapId = await dmCurrentMapId();
    emitToMap(sessionCode, mapId, 'play_sound', { filename, volume: volume ?? 1.0 });
  });

  socket.on('stop_sounds', () => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    // Stop is global — harmless no-op for clients with nothing to stop.
    io.to(sessionCode).emit('stop_sounds');
  });

  // ── Ambient music (GM only) ──────────────────────────────────────────────
  // Push the full per-map ambient snapshot to every GM socket in this
  // session. Players don't need it — they only hear their own map.
  function broadcastAmbientState(sessionCode) {
    const state = sessionAmbients[sessionCode] || {};
    const room = io.sockets.adapter.rooms.get(sessionCode);
    if (!room) return;
    for (const sid of room) {
      const s = io.sockets.sockets.get(sid);
      if (s?.data?.role === 'dm') s.emit('session_ambients_changed', state);
    }
  }
  // Additive: starts a track if not already playing on the current
  // map, OR live-updates the volume of a track already in the layer.
  // Multiple tracks coexist on the same map.
  socket.on('play_ambient', async ({ filename, volume }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode || !filename) return;
    const mapId = await dmCurrentMapId();
    const vol = Math.max(0, Math.min(1, Number(volume ?? 0.5)));
    if (mapId != null) {
      if (!sessionAmbients[sessionCode]) sessionAmbients[sessionCode] = {};
      const list = sessionAmbients[sessionCode][mapId] || [];
      const existing = list.find(t => t.filename === filename);
      if (existing) existing.volume = vol;
      else list.push({ filename, volume: vol });
      sessionAmbients[sessionCode][mapId] = list;
    }
    emitToMap(sessionCode, mapId, 'play_ambient', { filename, volume: vol });
    broadcastAmbientState(sessionCode);
  });

  // Stop ONE specific ambient track on the GM's current map. Other
  // tracks in the same layer keep playing.
  socket.on('stop_ambient_track', async ({ filename }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode || !filename) return;
    const mapId = await dmCurrentMapId();
    if (mapId == null) return;
    const list = sessionAmbients[sessionCode]?.[mapId];
    if (!list) return;
    const filtered = list.filter(t => t.filename !== filename);
    if (filtered.length === 0) delete sessionAmbients[sessionCode][mapId];
    else sessionAmbients[sessionCode][mapId] = filtered;
    emitToMap(sessionCode, mapId, 'stop_ambient_track', { filename });
    broadcastAmbientState(sessionCode);
  });

  // Stop every ambient track on a specific map (GM only). The
  // targeted map's audience hears the stop; other maps' layers keep
  // playing.
  socket.on('stop_ambient_on_map', ({ mapId }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode || mapId == null) return;
    const id = Number(mapId);
    if (sessionAmbients[sessionCode]) delete sessionAmbients[sessionCode][id];
    emitToMap(sessionCode, id, 'stop_ambient');
    broadcastAmbientState(sessionCode);
  });

  socket.on('stop_ambient', () => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    // Stop everything across the session — every map, every track.
    delete sessionAmbients[sessionCode];
    io.to(sessionCode).emit('stop_ambient');
    broadcastAmbientState(sessionCode);
  });

  // Each connected client (GM + players) tells the server which map
  // it's currently rendering so the server can route per-map audio
  // to the right sockets. Fires on session join, every Send-to /
  // auto-follow / GM map switch.
  socket.on('set_player_active_map_id', ({ mapId }) => {
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    const id = mapId == null ? null : Number(mapId);
    if (socket.data.activeMapId === id) return;
    socket.data.activeMapId = id;
    // Always stop any locally-playing ambients first — if the client
    // wasn't playing anything the handler is a no-op. Then start every
    // stored track on the new map (in original layer order) so a player
    // joining mid-loop picks up the full scene the rest of the map's
    // audience already has running.
    socket.emit('stop_ambient');
    const tracks = id != null ? (sessionAmbients[sessionCode]?.[id] || []) : [];
    for (const t of tracks) {
      socket.emit('play_ambient', { filename: t.filename, volume: t.volume, mapId: id });
    }
  });

  // ── Spawn point (GM only) ────────────────────────────────────────────────
  socket.on('set_spawn_point', async ({ mapId, col, row, radius }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode || !mapId) return;
    try {
      if (radius === undefined) {
        // Coords-only update (existing tool behaviour). If the square clicked
        // is on a ship's deck, the spawn is stored ABOARD it: deck-local coords
        // that ride the hull, with the world square kept as a cache of where
        // that lands right now. Clicking open map clears any previous berth, so
        // the same tool does both without a mode switch.
        const berth = await findDeckSquare(mapId, col, row);
        await db.query(
          `UPDATE maps SET spawn_col=$1, spawn_row=$2,
                  spawn_ship_id=$4, spawn_deck_index=$5, spawn_deck_col=$6, spawn_deck_row=$7
             WHERE id=$3`,
          [col, row, mapId,
           berth?.shipId ?? null, berth?.deckIndex ?? null, berth?.deckCol ?? null, berth?.deckRow ?? null]
        );
        io.to(sessionCode).emit('spawn_point_set', { col, row, shipId: berth?.shipId ?? null });
      } else if (col === undefined && row === undefined) {
        // Radius-only update from the Map tab slider.
        const safe = Math.max(0, Math.floor(Number(radius) || 0));
        await db.query('UPDATE maps SET spawn_radius=$1 WHERE id=$2', [safe, mapId]);
        io.to(sessionCode).emit('spawn_point_set', { radius: safe });
      } else {
        const safe = Math.max(0, Math.floor(Number(radius) || 0));
        const berth = await findDeckSquare(mapId, col, row);
        await db.query(
          `UPDATE maps SET spawn_col=$1, spawn_row=$2, spawn_radius=$3,
                  spawn_ship_id=$5, spawn_deck_index=$6, spawn_deck_col=$7, spawn_deck_row=$8
             WHERE id=$4`,
          [col, row, safe, mapId,
           berth?.shipId ?? null, berth?.deckIndex ?? null, berth?.deckCol ?? null, berth?.deckRow ?? null]
        );
        io.to(sessionCode).emit('spawn_point_set', { col, row, radius: safe, shipId: berth?.shipId ?? null });
      }
    } catch (err) { console.error(err); }
  });

  // ── Ambient light (GM only) ───────────────────────────────────────────────
  socket.on('set_ambient_light', async ({ sessionId, ambientLight }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      await db.query('UPDATE sessions SET ambient_light=$1 WHERE id=$2', [ambientLight, sessionId]);
      io.to(sessionCode).emit('ambient_light_changed', { ambientLight });
    } catch (err) { console.error(err); }
  });

  // ── Active SRD edition for the spell library (GM only) ────────────────
  // Drives whether players see 2014, 2024, or every spell when they
  // browse the spell library. Stored on the session row so it can be
  // changed mid-session and surveyed by the spell-library REST query.
  socket.on('set_active_srd_edition', async ({ sessionId, edition }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    const safe = (edition === '2014' || edition === '2024' || edition === 'both') ? edition : 'both';
    try {
      await db.query('UPDATE sessions SET active_srd_edition=$1 WHERE id=$2', [safe, sessionId]);
      io.to(sessionCode).emit('active_srd_edition_changed', { edition: safe });
    } catch (err) { console.error(err); }
  });

  // ── Toggle fog of war (GM only) ───────────────────────────────────────────
  // Fog of war is per map. The toggle flips the map the GM is looking at and
  // leaves every other map alone; without a map loaded there is nothing to
  // flip but the session default.
  socket.on('toggle_fow', async ({ sessionId, mapId }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      if (mapId == null) {
        const res = await db.query(
          'UPDATE sessions SET fow_enabled = NOT fow_enabled WHERE id=$1 RETURNING fow_enabled',
          [sessionId]
        );
        if (!res.rows.length) return;
        io.to(sessionCode).emit('fow_changed', { enabled: res.rows[0].fow_enabled, mapId: null });
        return;
      }
      // First toggle on a map has no stored value to negate, so the flip is
      // measured against whatever that map was already showing — the session
      // default. COALESCE does that in one statement.
      const res = await db.query(
        `UPDATE maps
            SET fow_enabled = NOT COALESCE(
              maps.fow_enabled,
              (SELECT s.fow_enabled FROM sessions s WHERE s.id = $2),
              false
            )
          WHERE id = $1
          RETURNING id, fow_enabled`,
        [mapId, sessionId]
      );
      if (!res.rows.length) return;
      io.to(sessionCode).emit('fow_changed', {
        enabled: res.rows[0].fow_enabled,
        mapId: res.rows[0].id,
      });
    } catch (err) {
      console.error(err);
    }
  });

  // ── FOW blur change (GM only) ─────────────────────────────────────────────
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

  // ── Rotate session code (GM only — kicks all current players) ────────────
  // The GM hits "Rotate" when they need to evict a player they've already
  // told off / banned. Generates a fresh 6-char code, swaps it on the
  // session row, broadcasts the change to everyone in the old room, then
  // hard-disconnects every socket so each client decides what to do
  // (GM auto-rejoins on the new code; players are bounced to the lobby).
  socket.on('rotate_session_code', async ({ sessionId }) => {
    if (socket.data.role !== 'dm') return;
    const oldCode = socket.data.sessionCode;
    if (!oldCode || !sessionId) return;
    try {
      // Generate a unique code; bail after 20 collisions so we don't loop.
      let newCode = null;
      for (let i = 0; i < 20; i++) {
        const candidate = Math.random().toString(36).substring(2, 8).toUpperCase();
        const exists = await db.query('SELECT id FROM sessions WHERE session_code=$1', [candidate]);
        if (!exists.rows.length) { newCode = candidate; break; }
      }
      if (!newCode) {
        socket.emit('error', { message: 'Could not generate a unique session code — try again.' });
        return;
      }
      await db.query('UPDATE sessions SET session_code=$1 WHERE id=$2', [newCode, sessionId]);
      io.to(oldCode).emit('session_code_changed', { oldCode, newCode });
      // Brief delay so the emit lands before we tear connections — the
      // emit goes out on the same event loop tick but the socket close
      // can race the deliver if we disconnect synchronously.
      setTimeout(() => {
        const ids = io.sockets.adapter.rooms.get(oldCode);
        if (ids) {
          for (const sid of Array.from(ids)) {
            const s = io.sockets.sockets.get(sid);
            if (s) s.disconnect(true);
          }
        }
      }, 250);
    } catch (err) {
      console.error('rotate_session_code error:', err);
    }
  });

  // ── FOW colour change (GM only) ───────────────────────────────────────────
  // Validates the input as a 3- or 6-digit hex literal — anything else is
  // rejected silently. Empty / null clears back to the default black so the
  // GM can recover a borked picker state without re-creating the session.
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

  // ── Grid size change (GM only) ────────────────────────────────────────────
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

  // ── Grid style change (GM only) ───────────────────────────────────────────
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

  // ── Default spawn-map for new player tokens (GM only) ────────────────
  // Set to null to clear the default (revert to "use whatever map_id the
  // session currently points at"). Broadcast so the GM panel UI in
  // other open tabs reflects the change live.
  socket.on('change_spawn_map', async ({ sessionId, mapId }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      const value = mapId == null ? null : Number(mapId);
      await db.query('UPDATE sessions SET spawn_map_id=$1 WHERE id=$2', [value, sessionId]);
      io.to(sessionCode).emit('spawn_map_changed', { spawnMapId: value });
    } catch (err) { console.error(err); }
  });

  // ── GM-set per-player map overrides (Split the Party, native) ────────
  // mapId === null clears the override. Stored as upsert on
  // (session_id, player_name) so re-routing the same player just
  // overwrites their current row. Broadcast lets every other client
  // (GM tabs, the player themselves) react without polling.
  socket.on('set_player_map_override', async ({ sessionId, playerName, mapId }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    if (!playerName) return;
    try {
      if (mapId == null) {
        await db.query(
          'DELETE FROM player_map_overrides WHERE session_id=$1 AND player_name=$2',
          [sessionId, playerName]
        );
      } else {
        await db.query(
          `INSERT INTO player_map_overrides (session_id, player_name, map_id, updated_at)
                VALUES ($1,$2,$3,NOW())
           ON CONFLICT (session_id, player_name)
           DO UPDATE SET map_id=EXCLUDED.map_id, updated_at=NOW()`,
          [sessionId, playerName, Number(mapId)]
        );
      }
      io.to(sessionCode).emit('player_map_override_changed', {
        playerName,
        mapId: mapId == null ? null : Number(mapId),
      });
    } catch (err) { console.error(err); }
  });

  socket.on('clear_player_map_overrides', async ({ sessionId }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      await db.query('DELETE FROM player_map_overrides WHERE session_id=$1', [sessionId]);
      io.to(sessionCode).emit('player_map_overrides_cleared', {});
    } catch (err) { console.error(err); }
  });

  // ── Token name font size change (GM only) ────────────────────────────────
  socket.on('change_token_name_font_size', async ({ sessionId, tokenNameFontSize }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;

    try {
      const size = Math.max(10, Math.min(100, Math.round(Number(tokenNameFontSize) || 45)));
      await db.query(
        'UPDATE sessions SET token_name_font_size=$1 WHERE id=$2',
        [size, sessionId]
      );
      io.to(sessionCode).emit('token_name_font_size_changed', { tokenNameFontSize: size });
    } catch (err) {
      console.error(err);
    }
  });

  // ── Update token size (GM only) ───────────────────────────────────────────
  socket.on('update_token_size', async ({ tokenId, size, sizeSquares }) => {
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    // Players may resize their OWN token — Enlarge/Reduce is a standard spell,
    // and a Titan druid growing to Huge is now a normal part of play. Anything
    // else stays GM-only.
    if (socket.data.role !== 'dm') {
      const own = await db.query('SELECT player_name, is_player FROM session_tokens WHERE id=$1', [tokenId]);
      if (!own.rows.length || !ownsToken(socket, own.rows[0])) return;
    }
    if (!TOKEN_SIZE_NAMES.has(String(size))) return;

    // Footprint override. Sent as a number to set it, null/undefined to drop
    // back to the preset — which is also what a plain size change does, so
    // shrinking a resized tarrasque to Large doesn't leave it 8 squares wide.
    // Clamped at both ends: below the preset it would be a different size
    // category, and the upper bound stops a typo turning one creature into a
    // map-covering slab nobody can select past.
    const preset = shipMath.footprintSquares(String(size).toLowerCase());
    let squares = null;
    if (sizeSquares != null) {
      const n = Number(sizeSquares);
      if (!Number.isFinite(n)) return;
      squares = Math.min(40, Math.max(preset, Math.round(n * 2) / 2));
    }

    try {
      await db.query('UPDATE session_tokens SET size=$1, size_squares=$2 WHERE id=$3', [size, squares, tokenId]);
      io.to(sessionCode).emit('token_size_changed', { tokenId, size, sizeSquares: squares });
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

  // Lair actions — GM-only. Broadcast so the players' combat strip can show the
  // marker too; the lair's own text stays with the GM.
  socket.on('dm_set_lair_action', async ({ sessionId, enabled, note }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      const res = await db.query(
        `UPDATE sessions
            SET lair_action_enabled = COALESCE($1, lair_action_enabled),
                lair_action_note    = COALESCE($2, lair_action_note)
          WHERE id=$3
      RETURNING lair_action_enabled, lair_action_note`,
        [
          typeof enabled === 'boolean' ? enabled : null,
          typeof note === 'string' ? note.slice(0, 2000) : null,
          sessionId,
        ]
      );
      if (!res.rows.length) return;
      io.to(sessionCode).emit('lair_action_changed', {
        enabled: res.rows[0].lair_action_enabled,
        note: res.rows[0].lair_action_note || '',
      });
    } catch (err) {
      console.error(err);
    }
  });

  // ── Tile maps ─────────────────────────────────────────────────────────────
  //
  // The loop: draw a card, place the tile it names, repeat. Everything here is
  // GM-only and broadcast to the room, because the whole point is that the
  // players watch the dungeon appear.
  //
  // The DECK is authoritative and lives on the server. Drawing client-side and
  // telling the server what came up would let two GM tabs draw the same card,
  // and would make "how many are left" a number each client guessed for itself.

  // Turn the top card. Random rather than ordered: the deck is shuffled by
  // construction, so there is no state to keep and a reshuffle is just moving
  // the discards back.
  socket.on('tiles_draw_card', async ({ deckId }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      // One card is turned at a time. Drawing again while a card is waiting
      // would silently bury the first one, so the pending card is returned
      // instead — the GM sees what they already have rather than losing it.
      const pending = await db.query(
        `SELECT c.id, c.tile_id, t.name, t.image_path, t.grid_w, t.grid_h,
                t.edge_n, t.edge_e, t.edge_s, t.edge_w
           FROM tile_deck_cards c JOIN tile_library t ON t.id=c.tile_id
          WHERE c.deck_id=$1 AND c.pile='pending' LIMIT 1`,
        [deckId]
      );
      let card = pending.rows[0] || null;

      if (!card) {
        const drawn = await db.query(
          `SELECT c.id, c.tile_id, t.name, t.image_path, t.grid_w, t.grid_h,
                  t.edge_n, t.edge_e, t.edge_s, t.edge_w
             FROM tile_deck_cards c JOIN tile_library t ON t.id=c.tile_id
            WHERE c.deck_id=$1 AND c.pile='draw'
            ORDER BY random() LIMIT 1`,
          [deckId]
        );
        if (!drawn.rows.length) {
          io.to(sessionCode).emit('tiles_deck_changed', { deckId, counts: await tileDeckCounts(deckId), empty: true });
          return;
        }
        card = drawn.rows[0];
        await db.query(`UPDATE tile_deck_cards SET pile='pending' WHERE id=$1`, [card.id]);
      }

      io.to(sessionCode).emit('tiles_card_drawn', {
        deckId, card, counts: await tileDeckCounts(deckId),
      });
    } catch (err) {
      console.error(err);
    }
  });

  // Put the pending card's tile down. The GM has clicked a square.
  socket.on('tiles_place', async ({ deckId, tileId, mapId, col, row, rotation }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      // Two ways in, one placement.
      //
      //   * From the DECK: a card has been turned and is waiting. Playing it
      //     spends it.
      //   * DIRECTLY: the GM picked a tile out of the library. Nothing is
      //     spent — this is map building, not drawing.
      //
      // Everything after this point is identical, which is the point of
      // resolving them to the same shape here rather than writing the
      // materialisation twice.
      let c = null;
      const direct = tileId != null;
      if (direct) {
        const lib = await db.query(
          `SELECT id AS tile_id, name, image_path, grid_w, grid_h,
                  edge_n, edge_e, edge_s, edge_w
             FROM tile_library WHERE id=$1`,
          [tileId]
        );
        if (!lib.rows.length) return;
        c = { ...lib.rows[0], id: null };
      } else {
        const p = await db.query(
          `SELECT c.id, c.tile_id, t.name, t.image_path, t.grid_w, t.grid_h,
                  t.edge_n, t.edge_e, t.edge_s, t.edge_w
             FROM tile_deck_cards c JOIN tile_library t ON t.id=c.tile_id
            WHERE c.deck_id=$1 AND c.pile='pending' LIMIT 1`,
          [deckId]
        );
        if (!p.rows.length) return;
        c = p.rows[0];
      }
      // Quarter turns only, normalised — the renderer and the edge rotation
      // below both assume one of exactly four values.
      const rot = ((Math.round((Number(rotation) || 0) / 90) * 90) % 360 + 360) % 360;

      // Edges rotate WITH the tile. Stored already-rotated so every reader
      // (the 3D wall builder, any future auto-matching) sees where the
      // openings actually are, rather than each having to re-derive it.
      const e = [c.edge_n, c.edge_e, c.edge_s, c.edge_w];
      const steps = rot / 90;
      const rotated = e.map((_, i) => e[(i - steps + 8) % 4]);

      // Make room first. A tile map has no fixed extent — it grows as the
      // dungeon does — and everything that reads the map's declared size (the
      // grid, the fog polygons, the 3D ground) stops at the old edge, so a
      // tile laid past it would sit on nothing.
      //
      // Growing LEFT or UP moves the origin, which moves every coordinate on
      // the board; `grow.dCol/dRow` is what it shifted by, and this placement
      // has to shift with it or it lands where the GM clicked on the OLD grid.
      const wantCol = Math.round(Number(col) || 0);
      const wantRow = Math.round(Number(row) || 0);
      const grow = await ensureMapCovers(
        mapId, wantCol, wantRow, wantCol + c.grid_w, wantRow + c.grid_h
      );

      const ins = await db.query(
        `INSERT INTO map_tiles (map_id, tile_id, image_path, grid_col, grid_row,
                                grid_w, grid_h, rotation, edge_n, edge_e, edge_s, edge_w)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
        [
          mapId, c.tile_id, c.image_path,
          wantCol + (grow.dCol || 0), wantRow + (grow.dRow || 0),
          c.grid_w, c.grid_h, rot,
          rotated[0], rotated[1], rotated[2], rotated[3],
        ]
      );
      // Spent — but only if it came off a deck. A tile placed straight from
      // the library costs nothing.
      if (c.id != null) {
        await db.query(`UPDATE tile_deck_cards SET pile='discard' WHERE id=$1`, [c.id]);
      }

      const laid = ins.rows[0];

      // ── What the tile brings with it ──────────────────────────────────────
      //
      // An imported Dungeondraft tile carries its own walls and doors, and the
      // GM may have stocked it with creatures. All three are stored in the
      // tile's own grid-square coordinates and are converted here, once, to
      // this map's pixels — so the same tile works on a map drawn at any
      // grid size, at any rotation.
      const lib = (await db.query(
        'SELECT geometry, spawns, wall_height_ft FROM tile_library WHERE id=$1', [c.tile_id]
      )).rows[0] || {};
      // The tile's own wall height, handed to everything it puts on the board.
      const wallH = Number(lib.wall_height_ft) > 0 ? Number(lib.wall_height_ft) : 10;
      await db.query('UPDATE map_tiles SET wall_height_ft=$1 WHERE id=$2', [wallH, laid.id]);
      laid.wall_height_ft = wallH;
      const mapRow = (await db.query(
        'SELECT grid_size, session_id FROM maps WHERE id=$1', [mapId]
      )).rows[0] || {};
      const gridSize = Number(mapRow.grid_size) || 50;
      // Taken from the map rather than from socket.data, which is not set on
      // this handler. It was writing NULL, and getSessionState loads tokens
      // with `WHERE session_id = $1` — so every creature a tile spawned was
      // on the board until the first refresh and then gone, with no error
      // anywhere to say why.
      const tokenSessionId = mapRow.session_id || null;

      const geometry = lib.geometry || {};

      // ── What is already along this join ───────────────────────────────────
      //
      // Two tiles laid edge to edge each describe the wall between them, and a
      // doorway that lines up is described by both. Inserted literally that is
      // two coplanar walls z-fighting in 3D, and two doors in one gap.
      //
      // So each candidate is checked against what is already on the map, and a
      // DOOR always wins: a wall coinciding with an existing door is dropped
      // rather than sealing it, and a door landing on an existing wall removes
      // that wall. Otherwise whether the gap was a doorway or a dead end would
      // depend on which tile the GM happened to lay first.
      const seg = require('./tileSegments');
      const coincides = (a, b) => seg.coincides(a, b, gridSize * 0.3);
      const existingWalls = (await db.query(
        'SELECT id, points FROM walls WHERE map_id=$1', [mapId]
      )).rows.map((r) => ({ id: r.id, pts: (r.points || []).map(Number) }));
      const existingDoors = (await db.query(
        'SELECT id, points FROM doors WHERE map_id=$1', [mapId]
      )).rows.map((r) => ({ id: r.id, pts: (r.points || []).map(Number) }));
      // What this tile walls itself in with.
      //
      // An imported tile brought the room's real outline. A tile built in the
      // panel brings four edge flags instead, and those are just as much a
      // description of where the walls are — so they become wall rows too, by
      // the same path and with the same de-duplication. Before this they
      // became nothing at all on the server: the 3D view drew a box along
      // each closed edge and no other reader ever heard about it, so sight
      // passed straight through every room on the board. See
      // `edgeWallSegments` for what that looked like.
      const hasOwnGeometry = !!((geometry.walls || []).length || (geometry.doors || []).length);
      const wallCands = hasOwnGeometry
        ? (geometry.walls || []).map((s) => {
            const [x1, y1] = tilePointToMap(s[0], s[1], laid, gridSize);
            const [x2, y2] = tilePointToMap(s[2], s[3], laid, gridSize);
            return [x1, y1, x2, y2];
          })
        // Already in map pixels: the flags are stored rotated, so the
        // footprint is read straight off the laid tile.
        : seg.edgeWallSegments(laid, gridSize);

      // Flagged before the walls go in, so the client that receives
      // `tiles_placed` already knows not to box this tile in.
      // Doors count as much as walls. A tile whose import produced only
      // portals is still a room that describes its own openings, and boxing it
      // in would wall off every one of them.
      if (hasOwnGeometry || wallCands.length) {
        await db.query('UPDATE map_tiles SET has_geometry=true WHERE id=$1', [laid.id]);
        laid.has_geometry = true;
      }
      for (const cand of wallCands) {
        const [x1, y1, x2, y2] = cand;
        // Already walled by the NEIGHBOUR — skip, or the two coplanar faces
        // flicker against each other from every angle.
        //
        // `!e.own` is what keeps a tile from eating itself. Every wall inserted
        // below is pushed onto this list, so without the guard each segment is
        // also tested against the ones this same tile just laid — and on a tile
        // whose walls are shorter than the join tolerance that means the second
        // half of the outline is read as a repeat of the first. The tile's own
        // geometry was already merged at import; there is nothing left in it to
        // deduplicate against itself.
        if (existingWalls.some((e) => !e.own && e.pts.length >= 4 && coincides(cand, e.pts))) continue;
        // Already a doorway — a wall here would brick up the neighbour's door.
        if (existingDoors.some((e) => e.pts.length >= 4 && coincides(cand, e.pts))) continue;
        const w = (await db.query(
          `INSERT INTO walls (id, map_id, type, points, tile_id, height_ft)
           VALUES (gen_random_uuid(), $1, 'line', $2, $3, $4) RETURNING *`,
          [mapId, JSON.stringify([x1, y1, x2, y2]), laid.id, wallH]
        )).rows[0];
        // Tagged as this tile's own: invisible to the wall test above, but the
        // door pass below still sees it, so a doorway can clear a wall the same
        // tile laid.
        existingWalls.push({ id: w.id, pts: cand, own: true });
        io.to(sessionCode).emit('wall_added', { wall: w });
      }
      // What the neighbours say their openings are. Fetched once for the tile
      // rather than per doorway.
      const neighbourDoorways = await tileDoorwaysOnMap(mapId, laid.id, gridSize);

      for (const d of (geometry.doors || [])) {
        const pts = d.points || [];
        if (pts.length < 4) continue;
        const [x1, y1] = tilePointToMap(pts[0], pts[1], laid, gridSize);
        const [x2, y2] = tilePointToMap(pts[2], pts[3], laid, gridSize);
        const cand = [x1, y1, x2, y2];

        // What this doorway is, resolved before anything decides whether it
        // exists — because for a secret door that answer changes the decision.
        const pk = d.kind === 'window' ? 'window' : 'door';
        // The tile's own choice wins. A tile that says nothing falls back to
        // the global default, which is what every tile did before doors could
        // be typed per tile — so an untouched tile behaves exactly as before.
        const dd0 = await require('./doorDefaults').doorDefaultFor(pk);
        const dd = {
          spritePath: d.sprite_path !== undefined ? d.sprite_path : dd0.spritePath,
          spriteMotion: require('./doorDefaults').normaliseMotion(d.sprite_motion || dd0.spriteMotion),
        };

        // A doorway on the tile's edge only becomes a DOOR when the tile it
        // meets has an opening there too. On its own it is the frontier of the
        // dungeon — an archway onto ground nobody has laid yet — and hanging a
        // door in it gave every unfinished edge a door to nowhere.
        //
        // This works in either order without any retroactive pass: whichever
        // of the two tiles is laid SECOND finds the first one's opening and
        // makes the single door for the pair. The first tile made none, so
        // there is nothing to clean up and nothing to double.
        //
        // Interior doorways are untouched — a door inside a room answers to
        // nothing but itself.
        //
        // SECRET doors are exempt, and have to be. "Nothing on the other side"
        // is not an accident for a secret door, it is the entire point: it is
        // a hidden way into somewhere not built yet, or never meant to connect
        // to a neighbouring room at all. It also cannot look like a door to
        // nowhere, because it does not look like a door. Without this a GM who
        // marked a doorway secret got no door at all — just the open gap the
        // door was supposed to be hiding.
        if (dd.spriteMotion !== 'secret'
            && doorwayOnTileEdge(pts, laid)
            && !neighbourDoorways.some((n) => coincides(cand, n))) {
          continue;
        }
        // The neighbour already put a door in this gap — one doorway, one door.
        if (existingDoors.some((e) => e.pts.length >= 4 && coincides(cand, e.pts))) continue;
        // A wall is standing where this doorway goes, because the neighbour was
        // laid first and had no opening here. The door wins: take the wall out
        // rather than leave a door buried inside it.
        for (const e of existingWalls.filter((x) => x.pts.length >= 4 && coincides(cand, x.pts))) {
          await db.query('DELETE FROM walls WHERE id=$1', [e.id]);
          io.to(sessionCode).emit('wall_deleted', { wallId: e.id });
        }
        const row = (await db.query(
          `INSERT INTO doors (id, map_id, style, points, is_open, portal_kind, tile_id, height_ft,
                              sprite_path, sprite_motion)
           VALUES (gen_random_uuid(), $1, 'standard', $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
          [mapId, JSON.stringify([x1, y1, x2, y2]), !!d.isOpen,
           pk, laid.id, wallH, dd.spritePath, dd.spriteMotion]
        )).rows[0];
        existingDoors.push({ id: row.id, pts: cand });
        io.to(sessionCode).emit('door_added', { door: row });
      }

      // Creatures the GM stocked the tile with. Placed as ordinary tokens —
      // once they are on the board they are just monsters, and everything that
      // already works on a token works on these.
      const { tokenFieldsFor } = require('./tileSpawns');
      for (const sp of (Array.isArray(lib.spawns) ? lib.spawns : [])) {
        const cr = (await db.query('SELECT * FROM creatures WHERE id=$1', [sp.creature_id])).rows[0];
        if (!cr) continue;
        const [px, py] = tilePointToMap(Number(sp.col) || 0, Number(sp.row) || 0, laid, gridSize);
        // The creature is the floor; anything the GM set while stocking the
        // tile overrides it. Built as columns rather than a fixed statement so
        // a field the GM never touched keeps its column default instead of
        // being written as null.
        const fields = tokenFieldsFor(sp, cr);
        // The editor records the centre of a square; grid_col/grid_row are a
        // token's TOP-LEFT. Without backing off half a footprint every spawned
        // creature sat half a square down and right of the square it was
        // placed in. Uses the FOOTPRINT ACTUALLY BEING PLACED, so a spawn the
        // GM resized lands centred on its square too.
        const foot = Number(fields.size_squares) || 1;
        fields.session_id = tokenSessionId;
        fields.map_id = mapId;
        fields.tile_id = laid.id;
        fields.grid_col = px / gridSize - foot / 2;
        fields.grid_row = py / gridSize - foot / 2;

        const cols = Object.keys(fields);
        const tk = (await db.query(
          `INSERT INTO session_tokens (${cols.join(', ')})
           VALUES (${cols.map((_, i) => '$' + (i + 1)).join(', ')}) RETURNING *`,
          cols.map((k) => fields[k])
        )).rows[0];
        io.to(sessionCode).emit('token_added', { token: { ...tk, creature_image: cr.image_path } });
      }

      if (grow.changed) {
        io.to(sessionCode).emit('map_resized', {
          mapId,
          width: grow.width, height: grow.height,
          gridCols: grow.cols, gridRows: grow.rows,
          // Only a shift invalidates what clients already hold. A grow to the
          // right or down leaves every existing coordinate exactly where it
          // was, so there is nothing to re-read.
          shifted: grow.shifted,
        });
      }

      io.to(sessionCode).emit('tiles_placed', { tile: laid });

      // Deck bookkeeping, and only when a deck was involved.
      //
      // The card has been played, so it is no longer pending — say so, exactly
      // as the discard path does. Without this the GM was left holding the
      // tile they had just laid: the board updated, but nothing ever cleared
      // the turned card, so the panel kept showing it and the Draw button
      // never came back. `pending` is a pile on the server, not a client-side
      // idea, so clearing it locally would also have left a second GM tab
      // holding a card that no longer exists.
      if (!direct && deckId != null) {
        const counts = await tileDeckCounts(deckId);
        io.to(sessionCode).emit('tiles_card_drawn', { deckId, card: null, counts });
        io.to(sessionCode).emit('tiles_deck_changed', { deckId, counts });
      }
    } catch (err) {
      console.error(err);
    }
  });

  // Throw the pending card away without laying it.
  socket.on('tiles_discard_card', async ({ deckId }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      await db.query(`UPDATE tile_deck_cards SET pile='discard' WHERE deck_id=$1 AND pile='pending'`, [deckId]);
      io.to(sessionCode).emit('tiles_card_drawn', { deckId, card: null, counts: await tileDeckCounts(deckId) });
    } catch (err) {
      console.error(err);
    }
  });

  // Discards back into the draw pile.
  socket.on('tiles_reshuffle', async ({ deckId }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      await db.query(`UPDATE tile_deck_cards SET pile='draw' WHERE deck_id=$1 AND pile='discard'`, [deckId]);
      io.to(sessionCode).emit('tiles_deck_changed', { deckId, counts: await tileDeckCounts(deckId) });
    } catch (err) {
      console.error(err);
    }
  });

  // Lift a laid tile back off the board. The card is NOT returned to the deck:
  // it was spent when it was played, and a GM removing a misplaced tile wants
  // the board fixed, not the pile silently re-stocked.
  socket.on('tiles_remove', async ({ tileId, keepTokens }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      // Read what this tile put on the board BEFORE deleting it. The FKs
      // cascade the walls and doors away for us, but the clients hold their
      // own copies and would go on drawing — and blocking sight with — walls
      // that no longer exist.
      const wallIds = (await db.query('SELECT id FROM walls WHERE tile_id=$1', [tileId])).rows.map((x) => x.id);
      const doorIds = (await db.query('SELECT id FROM doors WHERE tile_id=$1', [tileId])).rows.map((x) => x.id);

      // The creatures STANDING ON the tile — by position, not by origin.
      //
      // Lifting a room takes what is in it at that moment. A monster that came
      // with the tile and has since walked off is somewhere else in the
      // dungeon and stays; one that wandered in from next door is standing in
      // the room being removed and goes. Origin would get both of those
      // backwards.
      //
      // Tested on the token's CENTRE against the tile's footprint. A token's
      // grid_col/grid_row is its top-left corner, so half its footprint is
      // added first — otherwise a token would count as being on a tile while
      // its middle was over the next one.
      //
      // Player characters are exempt, always. A GM lifting a tile means the
      // scenery and the monsters; deleting someone's character out from under
      // them is not recoverable and is never what was meant.
      //
      // The FK stays SET NULL rather than CASCADE so this remains the ONLY
      // path that can destroy a creature — nothing else does it as a side
      // effect — and `keepTokens` covers the case where the fight is already
      // under way and only the floor is wrong.
      let tokenIds = [];
      if (!keepTokens) {
        const t = (await db.query(
          'SELECT grid_col, grid_row, grid_w, grid_h, map_id FROM map_tiles WHERE id=$1', [tileId]
        )).rows[0];
        if (t) {
          tokenIds = (await db.query(
            `DELETE FROM session_tokens st
              WHERE st.map_id = $1
                AND COALESCE(st.is_player, false) = false
                AND st.grid_col + COALESCE(st.size_squares, 1) / 2.0 >= $2
                AND st.grid_col + COALESCE(st.size_squares, 1) / 2.0 <= $3
                AND st.grid_row + COALESCE(st.size_squares, 1) / 2.0 >= $4
                AND st.grid_row + COALESCE(st.size_squares, 1) / 2.0 <= $5
              RETURNING id`,
            [
              t.map_id,
              Number(t.grid_col), Number(t.grid_col) + Number(t.grid_w),
              Number(t.grid_row), Number(t.grid_row) + Number(t.grid_h),
            ]
          )).rows.map((x) => x.id);
        }
      }

      const r = await db.query('DELETE FROM map_tiles WHERE id=$1 RETURNING id, map_id', [tileId]);
      if (!r.rows.length) return;

      for (const id of wallIds) io.to(sessionCode).emit('wall_deleted', { wallId: id });
      for (const id of doorIds) io.to(sessionCode).emit('door_deleted', { doorId: id });
      for (const id of tokenIds) io.to(sessionCode).emit('token_removed', { tokenId: id });
      io.to(sessionCode).emit('tiles_removed', { tileId: r.rows[0].id });
    } catch (err) {
      console.error(err);
    }
  });

  // ── Renaming the session ──────────────────────────────────────────────────
  //
  // The name is on the players' lobby, their top bar and the GM's own header,
  // so it is broadcast rather than returned — everyone is looking at it.
  socket.on('dm_rename_session', async ({ sessionId, name }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      // Trimmed, capped to the column, and refused when empty. A blank name
      // would leave every player looking at an untitled bar with no way to ask
      // for it back — the GM has to pick something.
      const clean = String(name ?? '').trim().slice(0, 255);
      if (!clean) return;
      const res = await db.query(
        'UPDATE sessions SET name=$1 WHERE id=$2 RETURNING name',
        [clean, sessionId]
      );
      if (!res.rows.length) return;
      io.to(sessionCode).emit('session_renamed', { name: res.rows[0].name });
    } catch (err) {
      console.error(err);
    }
  });

  // ── When the group next meets ─────────────────────────────────────────────
  //
  // GM-only, like every other session setting. Broadcast to the whole room
  // rather than returned to the caller: the countdown lives on the players'
  // lobby screen, and they are exactly the people who are not the one setting
  // it.
  //
  // `at` arrives as an ISO instant from the browser (the GM's local pick,
  // already resolved to UTC by the client) or null to clear the schedule.
  socket.on('dm_set_next_session', async ({ sessionId, at, note, minutes }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      // Validated here rather than trusted: an unparseable date would other-
      // wise reach Postgres as a cast error and take the handler down, and a
      // silently-dropped update is a schedule the GM thinks they set.
      let when = null;
      if (at !== null && at !== undefined && at !== '') {
        const d = new Date(at);
        if (Number.isNaN(d.getTime())) return;
        when = d.toISOString();
      }
      // Clamped so a typo can't create a month-long calendar event, and
      // floored at a quarter hour so the invite always has real duration.
      const mins = minutes === null || minutes === undefined
        ? null
        : Math.max(15, Math.min(24 * 60, Math.round(Number(minutes) || 180)));

      const res = await db.query(
        `UPDATE sessions
            SET next_session_at      = $1,
                next_session_note    = COALESCE($2, next_session_note),
                next_session_minutes = COALESCE($3, next_session_minutes)
          WHERE id=$4
      RETURNING next_session_at, next_session_note, next_session_minutes`,
        [
          // Deliberately NOT COALESCEd: null is a meaningful value here — it
          // is how the GM clears the schedule. Coalescing it would make
          // "unset" silently mean "leave as it was", and the countdown could
          // never be taken down again.
          when,
          typeof note === 'string' ? note.slice(0, 200) : null,
          mins,
          sessionId,
        ]
      );
      if (!res.rows.length) return;
      io.to(sessionCode).emit('next_session_changed', {
        at: res.rows[0].next_session_at,
        note: res.rows[0].next_session_note || '',
        minutes: res.rows[0].next_session_minutes ?? 180,
      });
    } catch (err) {
      console.error(err);
    }
  });

  // ── Label visibility ──────────────────────────────────────────────────────
  // Hide a token's name and/or HP bar from the players' view. Either flag can
  // be set on its own — an unnamed horror with a visible HP bar, or a named
  // NPC whose health is nobody's business. Pass only the fields you're
  // changing; omitted ones keep their current value.
  socket.on('dm_set_token_label_visibility', async ({ tokenId, hideName, hideHp }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      const res = await db.query(
        `UPDATE session_tokens
            SET hide_name_from_players = COALESCE($1, hide_name_from_players),
                hide_hp_from_players   = COALESCE($2, hide_hp_from_players)
          WHERE id=$3
      RETURNING hide_name_from_players, hide_hp_from_players`,
        [
          typeof hideName === 'boolean' ? hideName : null,
          typeof hideHp === 'boolean' ? hideHp : null,
          tokenId,
        ]
      );
      if (!res.rows.length) return;
      io.to(sessionCode).emit('token_label_visibility_changed', {
        tokenId,
        hideName: res.rows[0].hide_name_from_players,
        hideHp: res.rows[0].hide_hp_from_players,
      });
    } catch (err) {
      console.error(err);
    }
  });

  // Session-wide defaults for the two label flags above. Applies to tokens
  // added from the library FROM NOW ON — existing tokens keep whatever they
  // have, since retroactively hiding a monster the party has already met would
  // be a surprise rather than a convenience.
  socket.on('dm_set_token_label_defaults', async ({ sessionId, hideName, hideHp }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      const res = await db.query(
        `UPDATE sessions
            SET default_hide_token_names = COALESCE($1, default_hide_token_names),
                default_hide_token_hp    = COALESCE($2, default_hide_token_hp)
          WHERE id=$3
      RETURNING default_hide_token_names, default_hide_token_hp`,
        [
          typeof hideName === 'boolean' ? hideName : null,
          typeof hideHp === 'boolean' ? hideHp : null,
          sessionId,
        ]
      );
      if (!res.rows.length) return;
      socket.emit('token_label_defaults_changed', {
        hideName: res.rows[0].default_hide_token_names,
        hideHp: res.rows[0].default_hide_token_hp,
      });
    } catch (err) {
      console.error(err);
    }
  });

  // ── Auras ─────────────────────────────────────────────────────────────────
  // Rings anchored to a token. Stored on the token so they move with it for
  // free — the client derives the centre from the token's position each frame.
  socket.on('set_token_auras', async ({ tokenId, auras }) => {
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      const tokRes = await db.query('SELECT player_name, is_player FROM session_tokens WHERE id=$1', [tokenId]);
      if (!tokRes.rows.length) return;
      // A paladin's aura is the paladin's business; everything else is the GM's.
      if (socket.data.role !== 'dm' && !ownsToken(socket, tokRes.rows[0])) return;

      const clean = (Array.isArray(auras) ? auras : []).slice(0, 4).map((a, i) => ({
        id: String(a?.id || `aura-${i}`).slice(0, 40),
        label: String(a?.label || '').slice(0, 40),
        radius: Math.max(0, Math.min(200, Number(a?.radius) || 0)),
        color: /^#[0-9a-f]{6}$/i.test(String(a?.color)) ? String(a.color) : '#facc15',
      })).filter((a) => a.radius > 0);

      await db.query('UPDATE session_tokens SET auras=$1 WHERE id=$2', [JSON.stringify(clean), tokenId]);
      io.to(sessionCode).emit('token_auras_changed', { tokenId, auras: clean });
    } catch (err) {
      console.error(err);
    }
  });

  // ── Marks ─────────────────────────────────────────────────────────────────
  // Hunter's Mark, Hex, Vow of Enmity: "this creature is marked by me". Any
  // player can mark a target; only the marker (or the GM) can clear it, so one
  // player can't quietly drop another's mark.
  socket.on('set_token_mark', async ({ tokenId, label, clear }) => {
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      const tokRes = await db.query('SELECT marked_by FROM session_tokens WHERE id=$1', [tokenId]);
      if (!tokRes.rows.length) return;
      const existing = tokRes.rows[0].marked_by;

      if (clear) {
        const mine = String(existing || '').trim().toLowerCase() === String(socket.data.name || '').trim().toLowerCase();
        if (socket.data.role !== 'dm' && !mine) return;
        await db.query('UPDATE session_tokens SET marked_by=NULL, mark_label=NULL WHERE id=$1', [tokenId]);
        io.to(sessionCode).emit('token_mark_changed', { tokenId, markedBy: null, markLabel: null });
        return;
      }

      const by = socket.data.name || 'GM';
      const lbl = String(label || "Hunter's Mark").slice(0, 60);
      await db.query('UPDATE session_tokens SET marked_by=$1, mark_label=$2 WHERE id=$3', [by, lbl, tokenId]);
      io.to(sessionCode).emit('token_mark_changed', { tokenId, markedBy: by, markLabel: lbl });
    } catch (err) {
      console.error(err);
    }
  });

  // ── Exhaustion ────────────────────────────────────────────────────────────
  // A level from 0 to 6 rather than a condition, per the 2024 rules.
  socket.on('set_token_exhaustion', async ({ tokenId, level }) => {
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      const tokRes = await db.query('SELECT player_name, is_player FROM session_tokens WHERE id=$1', [tokenId]);
      if (!tokRes.rows.length) return;
      if (socket.data.role !== 'dm' && !ownsToken(socket, tokRes.rows[0])) return;

      const lvl = Math.max(0, Math.min(6, Math.round(Number(level) || 0)));
      await db.query('UPDATE session_tokens SET exhaustion=$1 WHERE id=$2', [lvl, tokenId]);
      io.to(sessionCode).emit('token_exhaustion_changed', { tokenId, exhaustion: lvl });
    } catch (err) {
      console.error(err);
    }
  });

  // ── Darkness that follows a token ─────────────────────────────────────────
  // Shadow Arts and the Warrior of Shadow both create Darkness the caster
  // moves each turn. Attaching the zone to a token means it simply travels.
  socket.on('dm_attach_darkness', async ({ darknessId, tokenId }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      await db.query(
        'UPDATE magical_darkness SET attached_token_id=$1 WHERE id=$2',
        [tokenId || null, darknessId]
      );
      io.to(sessionCode).emit('darkness_attached', { darknessId, tokenId: tokenId || null });
    } catch (err) {
      console.error(err);
    }
  });

  // ── Familiars ─────────────────────────────────────────────────────────────
  // Bind a token to a player as their familiar (or unbind with a null name).
  // The owning player's client then draws fog-of-war from the familiar's
  // senses as well as their own, and can open its stat block. A player token
  // can't itself be a familiar — that would let two clients claim the same
  // vision origin and makes "whose sheet is this" ambiguous.
  // ── Summon a bound companion onto the board ───────────────────────────────
  //
  // The other half of creature_companions: the binding says the wizard has an
  // owl, this puts the owl on the map. Built from the creature the same way
  // `add_token` builds any token — light, size override, hidden-name defaults and
  // all — so a summoned familiar is not a second-class token missing half its
  // fields, plus the three things that make it a companion: whose it is, what
  // kind it is, and which binding it came from.
  //
  // A player may summon their OWN companion. That is the point of the feature —
  // Find Familiar is cast by the player, at the moment they choose — and it is
  // the same trust model as elevation: the sheet can act for the character whose
  // name it joined under, and nothing else.
  socket.on('spawn_companion', async ({ companionId, mapId }) => {
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      const row = (await db.query(
        `SELECT cc.*, c.name AS companion_name FROM creature_companions cc
           JOIN creatures c ON c.id = cc.creature_id WHERE cc.id=$1`,
        [companionId]
      )).rows[0];
      if (!row) return;

      const sess = (await db.query(
        `SELECT id, map_id, default_hide_token_names, default_hide_token_hp
           FROM sessions WHERE session_code=$1`, [sessionCode]
      )).rows[0];
      if (!sess) return;
      const resolvedMapId = mapId || sess.map_id || null;

      // The owner's token in THIS session, which is both the permission check
      // and where the companion appears.
      //
      // A wild-shaped druid's token carries the BEAST's creature id, with the
      // character it came from parked in `pretransform`. Matching only on
      // creature_id therefore lost the owner the moment they turned into a
      // panther, and the player was told their own familiar was not theirs to
      // summon. The transformed token is still the same person standing in the
      // same square, so it counts.
      const ownerTok = (await db.query(
        `SELECT * FROM session_tokens
          WHERE session_id=$1 AND is_player=true
            AND (creature_id=$2 OR (pretransform->>'creature_id')::int = $2)
          ORDER BY (map_id = $3) DESC, id LIMIT 1`,
        [sess.id, row.owner_creature_id, resolvedMapId]
      )).rows[0] || null;

      if (socket.data.role !== 'dm') {
        if (!ownerTok || ownerTok.player_name !== socket.data.name) {
          socket.emit('error', { message: 'That companion is not yours to summon.' });
          return;
        }
      }

      // Already out? Then this is a double tap, not a second owl.
      const present = (await db.query(
        'SELECT id FROM session_tokens WHERE session_id=$1 AND companion_row_id=$2',
        [sess.id, row.id]
      )).rows[0];
      if (present) {
        socket.emit('error', { message: `${row.nickname || row.companion_name} is already on the board.` });
        return;
      }

      const creature = (await db.query('SELECT * FROM creatures WHERE id=$1', [row.creature_id])).rows[0];
      if (!creature) return;

      // Beside the owner, which is where a familiar appears when it is called.
      // Without a token to stand next to (the owner is on another map, or the
      // session has none), it lands at the top-left rather than nowhere.
      const col = ownerTok && ownerTok.map_id === resolvedMapId ? Number(ownerTok.grid_col) + 1 : 1;
      const rowNo = ownerTok && ownerTok.map_id === resolvedMapId ? Number(ownerTok.grid_row) : 1;

      const tokenRes = await db.query(
        `INSERT INTO session_tokens
           (session_id, map_id, creature_id, name, image_path, size, size_squares, grid_col, grid_row,
            current_hp, max_hp, hide_name_from_players, hide_hp_from_players,
            token_light_bright, token_light_dim, token_light_color, token_light_flicker, tracker_reminder,
            familiar_of, companion_kind, companion_row_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
         RETURNING *`,
        [
          sess.id, resolvedMapId, creature.id,
          row.nickname || creature.name, creature.image_path,
          creature.size, creature.size_squares ?? null,
          Math.max(0, col), Math.max(0, rowNo),
          creature.hit_points, creature.hit_points,
          !!creature.hide_token_name || !!sess.default_hide_token_names,
          !!creature.hide_token_hp || !!sess.default_hide_token_hp,
          creature.token_light_bright ?? 0, creature.token_light_dim ?? 0,
          creature.token_light_color || '#fbbf24', creature.token_light_flicker ?? true,
          creature.tracker_reminder || '',
          ownerTok ? ownerTok.player_name : null,
          row.companion_kind || 'familiar',
          row.id,
        ]
      );
      // Just `token_added`. The token it carries already says whose it is and
      // what kind it is, so a `token_familiar_changed` behind it announces nothing
      // new — and one event that adds a row followed by another that re-evaluates
      // it is two chances to disagree about the same token.
      const token = { ...tokenRes.rows[0], creature_image: creature.image_path };
      io.to(sessionCode).emit('token_added', { token });
    } catch (err) {
      console.error('spawn_companion error:', err);
    }
  });

  // ── Patrols ───────────────────────────────────────────────────────────────
  //
  // GM only, all of it. A patrol moves a token without anyone touching it, which
  // is exactly the power a player must not have over the guard walking towards
  // them.

  socket.on('set_token_patrol', async ({ tokenId, waypoints, speedFt, mode, active }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      const tok = (await db.query(
        'SELECT id, session_id, map_id, grid_col, grid_row FROM session_tokens WHERE id=$1', [tokenId])).rows[0];
      if (!tok) return;

      const points = patrols.cleanWaypoints(waypoints);
      if (points.length < 2) {
        socket.emit('error', { message: 'A patrol needs at least two waypoints.' });
        return;
      }

      // The route starts from where the token is standing, so the first leg is
      // "walk to the first waypoint" rather than a jump onto it.
      const row = (await db.query(
        `INSERT INTO token_patrols (session_id, token_id, waypoints, speed_ft, mode, active, next_index, direction)
         VALUES ($1,$2,$3,$4,$5,$6,0,1)
         ON CONFLICT (token_id) DO UPDATE
            SET waypoints=EXCLUDED.waypoints, speed_ft=EXCLUDED.speed_ft, mode=EXCLUDED.mode,
                active=EXCLUDED.active, next_index=0, direction=1, updated_at=NOW()
         RETURNING *`,
        [tok.session_id, tok.id, JSON.stringify(points),
         patrols.cleanSpeed(speedFt), patrols.cleanMode(mode), active !== false]
      )).rows[0];

      io.to(sessionCode).emit('patrol_changed', { tokenId: tok.id, patrol: row });
    } catch (err) {
      console.error('set_token_patrol error:', err);
    }
  });

  socket.on('clear_token_patrol', async ({ tokenId }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      await db.query('DELETE FROM token_patrols WHERE token_id=$1', [tokenId]);
      io.to(sessionCode).emit('patrol_changed', { tokenId, patrol: null });
    } catch (err) {
      console.error('clear_token_patrol error:', err);
    }
  });

  // One token's route on or off, without losing it.
  socket.on('set_token_patrol_active', async ({ tokenId, active }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      const row = (await db.query(
        'UPDATE token_patrols SET active=$1, updated_at=NOW() WHERE token_id=$2 RETURNING *',
        [!!active, tokenId])).rows[0];
      if (row) io.to(sessionCode).emit('patrol_changed', { tokenId, patrol: row });
    } catch (err) {
      console.error('set_token_patrol_active error:', err);
    }
  });

  // The GM's treasure chest, shared across every screen they have open.
  //
  // Whole-list writes rather than per-item edits: the chest is a scratchpad the
  // GM rearranges freely — rolling a table into it, renaming things, splitting
  // a hoard — and a diff protocol for that would be more moving parts than the
  // thing is worth. It is a handful of rows, saved when it settles.
  socket.on('set_treasure_chest', async ({ sessionId, items }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      const list = Array.isArray(items) ? items.slice(0, 200) : [];
      await db.query('UPDATE sessions SET treasure_chest=$1 WHERE id=$2',
        [JSON.stringify(list), sessionId]);
      // To the GM's OTHER screens, not to the sender — the sender already has
      // it, and echoing would fight whatever they are typing.
      const room = io.sockets.adapter.rooms.get(sessionCode);
      if (!room) return;
      for (const sid of room) {
        if (sid === socket.id) continue;
        const sk = io.sockets.sockets.get(sid);
        // GM screens only. The chest is unopened loot; the players find out
        // when it is handed to them.
        if (sk?.data?.role === 'dm') sk.emit('treasure_chest_changed', { items: list });
      }
    } catch (err) {
      console.error('set_treasure_chest error:', err);
    }
  });

  // ══ Shops ═════════════════════════════════════════════════════════════════
  //
  // The rules and the money are in shops.js; this is the wiring. Two audiences
  // see different things and that is the whole design: the GM gets the real
  // item and the real name, the party gets whatever the shopkeeper is claiming.

  // What a shop looks like to the GM: everything.
  async function shopForGm(shopId) {
    const shop = (await db.query('SELECT * FROM shops WHERE id=$1', [shopId])).rows[0];
    if (!shop) return null;
    const items = (await db.query(
      'SELECT * FROM shop_items WHERE shop_id=$1 ORDER BY sort_index, id', [shopId]
    )).rows;
    return { ...shop, items };
  }

  // What it looks like to the party: the sign in the window.
  //
  // The real name and the real stats are stripped HERE rather than hidden in
  // the client. A disguised item whose true name travels to the browser is not
  // disguised — it is one console away from being read, by exactly the person
  // it is being kept from.
  function shopForPlayers(gmShop) {
    if (!gmShop) return null;
    return {
      id: gmShop.id,
      name: gmShop.name,
      blurb: gmShop.blurb,
      is_open: gmShop.is_open,
      allow_haggle: gmShop.allow_haggle,
      allow_selling: gmShop.allow_selling,
      items: (gmShop.items || []).map((row) => {
        const item = typeof row.item === 'string' ? JSON.parse(row.item) : (row.item || {});
        const shown = row.player_name || item.name || 'Item';
        return {
          id: row.id,
          name: shown,
          desc: row.player_desc || (row.show_stats ? item.desc : '') || '',
          price_cp: row.price_cp,
          qty: row.qty,
          item_type: item.item_type || 'item',
          // Only when the GM says so, and only ever the fields a buyer could
          // reasonably inspect on the counter.
          stats: row.show_stats ? {
            weight: item.weight, properties: item.properties, mastery: item.mastery,
            damage_entries: item.damage_entries, weapon_range: item.weapon_range,
            attunement_required: item.attunement_required,
            ac_base: item.ac_base, ac_bonus: item.ac_bonus,
          } : null,
        };
      }),
    };
  }

  /**
   * Send an offer straight to the player it belongs to.
   *
   * The room broadcast is not enough on its own. A player view only keeps the
   * offer it remembers sending, so a counter that arrives after they refreshed
   * — or while their phone was asleep — lands on a client with nothing to
   * match it against and is dropped, leaving them staring at a shop with no
   * sign that the shopkeeper ever answered. Addressing the owner directly sets
   * their state whatever it was before.
   *
   * Matched on creature first and player name second: two people can share a
   * name at a table, but the character being paid for is the one negotiating.
   */
  function emitOfferToOwner(sessionCode, offer) {
    const room = io.sockets.adapter.rooms.get(sessionCode);
    if (!room || !offer) return;
    for (const sid of room) {
      const sk = io.sockets.sockets.get(sid);
      if (!sk || sk.data?.role === 'dm') continue;
      const byCreature = offer.creature_id && sk.data?.creatureId
        && Number(sk.data.creatureId) === Number(offer.creature_id);
      const byName = offer.player_name && sk.data?.name === offer.player_name;
      if (byCreature || byName) sk.emit('shop_offer_sent', { offer });
    }
  }

  async function pushShop(sessionCode, shopId) {
    const gmShop = await shopForGm(shopId);
    if (!gmShop) return;
    const playerShop = shopForPlayers(gmShop);
    const room = io.sockets.adapter.rooms.get(sessionCode);
    if (!room) return;
    for (const sid of room) {
      const sk = io.sockets.sockets.get(sid);
      if (!sk) continue;
      sk.emit('shop_changed', sk.data?.role === 'dm' ? gmShop : playerShop);
    }
  }

  socket.on('shop_list', async ({ sessionId }) => {
    if (socket.data.role !== 'dm') return;
    try {
      const rows = (await db.query(
        'SELECT id, name, blurb, is_open, allow_haggle, allow_selling FROM shops WHERE session_id=$1 ORDER BY id',
        [sessionId]
      )).rows;
      socket.emit('shop_list', { shops: rows });
    } catch (err) { console.error('shop_list error:', err); }
  });

  socket.on('shop_save', async ({ sessionId, shopId, name, blurb, allowHaggle, allowSelling }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      let id = shopId;
      if (id) {
        await db.query(
          `UPDATE shops SET name=$1, blurb=$2, allow_haggle=$3, allow_selling=$4 WHERE id=$5`,
          [String(name || 'Shop').slice(0, 120), String(blurb || ''), !!allowHaggle, !!allowSelling, id]
        );
      } else {
        id = (await db.query(
          `INSERT INTO shops (session_id, name, blurb, allow_haggle, allow_selling)
           VALUES ($1,$2,$3,$4,$5) RETURNING id`,
          [sessionId, String(name || 'Shop').slice(0, 120), String(blurb || ''),
           allowHaggle !== false, allowSelling !== false]
        )).rows[0].id;
      }
      const gmShop = await shopForGm(id);
      socket.emit('shop_changed', gmShop);
      if (gmShop?.is_open) await pushShop(sessionCode, id);
    } catch (err) { console.error('shop_save error:', err); }
  });

  socket.on('shop_open', async ({ shopId, sessionId, open }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      // One shop on the table at a time: "open the shop" is something that
      // happens to the room, and two counters at once is a UI nobody asked for.
      await db.query('UPDATE shops SET is_open=false WHERE session_id=$1', [sessionId]);
      if (open) await db.query('UPDATE shops SET is_open=true WHERE id=$1', [shopId]);
      const gmShop = await shopForGm(shopId);
      const room = io.sockets.adapter.rooms.get(sessionCode);
      if (room) {
        for (const sid of room) {
          const sk = io.sockets.sockets.get(sid);
          if (!sk) continue;
          if (sk.data?.role === 'dm') sk.emit('shop_changed', gmShop);
          else sk.emit('shop_opened', open ? shopForPlayers(gmShop) : null);
        }
      }
    } catch (err) { console.error('shop_open error:', err); }
  });

  socket.on('shop_item_save', async ({ shopId, itemId, item, playerName, playerDesc, showStats, priceCp: priceCpIn, price, qty }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      const priceCp = shops.priceFromInput({ cp: priceCpIn, text: price });
      const stock = qty === null || qty === undefined || qty === ''
        ? shops.UNLIMITED
        : Math.max(shops.UNLIMITED, Math.round(Number(qty) || 0));
      if (itemId) {
        await db.query(
          `UPDATE shop_items
              SET item=COALESCE($1, item), player_name=$2, player_desc=$3,
                  show_stats=$4, price_cp=$5, qty=$6
            WHERE id=$7`,
          [item ? JSON.stringify(item) : null, playerName || null, playerDesc || null,
           showStats !== false, priceCp, stock, itemId]
        );
      } else {
        await db.query(
          `INSERT INTO shop_items (shop_id, item, player_name, player_desc, show_stats, price_cp, qty, sort_index)
           VALUES ($1,$2,$3,$4,$5,$6,$7, COALESCE((SELECT MAX(sort_index)+1 FROM shop_items WHERE shop_id=$1), 0))`,
          [shopId, JSON.stringify(item || {}), playerName || null, playerDesc || null,
           showStats !== false, priceCp, stock]
        );
      }
      await pushShop(sessionCode, shopId);
    } catch (err) { console.error('shop_item_save error:', err); }
  });

  socket.on('shop_item_remove', async ({ shopId, itemId }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      await db.query('DELETE FROM shop_items WHERE id=$1 AND shop_id=$2', [itemId, shopId]);
      await pushShop(sessionCode, shopId);
    } catch (err) { console.error('shop_item_remove error:', err); }
  });

  socket.on('shop_delete', async ({ shopId, sessionId }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      await db.query('DELETE FROM shops WHERE id=$1 AND session_id=$2', [shopId, sessionId]);
      io.to(sessionCode).emit('shop_opened', null);
      socket.emit('shop_deleted', { shopId });
    } catch (err) { console.error('shop_delete error:', err); }
  });

  // ── Offers ────────────────────────────────────────────────────────────────

  // A player proposing something. Buy, sell, and haggling are the same act with
  // different lines on it, so they are one event and one table.
  socket.on('shop_offer', async ({ shopId, creatureId, kind, lines, offerCp: offerCpIn, offerPrice, note }) => {
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      const shop = (await db.query('SELECT * FROM shops WHERE id=$1', [shopId])).rows[0];
      if (!shop || !shop.is_open) {
        socket.emit('error', { message: 'The shop is closed.' });
        return;
      }
      const wantKind = kind === 'sell' ? 'sell' : 'buy';
      if (wantKind === 'sell' && !shop.allow_selling) {
        socket.emit('error', { message: 'This shopkeeper is not buying.' });
        return;
      }
      // An offered price is only meaningful where haggling is allowed;
      // otherwise the asking price stands and the offer is a plain purchase.
      const named = [offerCpIn, offerPrice].some((v) => v !== null && v !== undefined && v !== '');
      const offerCp = !named
        ? null
        : (shop.allow_haggle || wantKind === 'sell'
            ? shops.priceFromInput({ cp: offerCpIn, text: offerPrice })
            : null);

      // A player's sell lines point into the pack as *they* see it, which has
      // any GM-hidden items stripped out of it (see itemSecrets.js). Translated
      // here, once, so the stored offer indexes the real pack: left alone, a
      // shifted index trips the name check in removeSoldItems and answers the
      // player with "their pack changed", which is exactly the hint hiding an
      // item is supposed to avoid.
      let offerLines = Array.isArray(lines) ? lines.slice(0, 60) : [];
      if (wantKind === 'sell' && socket.data.role !== 'dm' && creatureId) {
        const { storedIndexFor } = require('./itemSecrets');
        const invRow = (await db.query('SELECT inventory FROM creatures WHERE id=$1', [creatureId])).rows[0];
        if (invRow) {
          offerLines = offerLines.map((line) => {
            const i = storedIndexFor(invRow.inventory, line?.index);
            return i < 0 ? line : { ...line, index: i };
          });
        }
      }

      const row = (await db.query(
        `INSERT INTO shop_offers (shop_id, session_id, player_name, creature_id, kind, lines, offer_cp, note)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [shopId, shop.session_id, socket.data.name || '', creatureId || null, wantKind,
         JSON.stringify(offerLines),
         offerCp, String(note || '').slice(0, 400)]
      )).rows[0];

      // Remembered so a later counter can be addressed to this exact seat.
      if (creatureId) socket.data.creatureId = Number(creatureId);

      // The GM is the only one who needs to see it arrive; the other players
      // are not part of this negotiation.
      const room = io.sockets.adapter.rooms.get(sessionCode);
      if (room) {
        for (const sid of room) {
          const sk = io.sockets.sockets.get(sid);
          if (sk?.data?.role === 'dm') sk.emit('shop_offer_received', { offer: row });
        }
      }
      socket.emit('shop_offer_sent', { offer: row });
    } catch (err) {
      console.error('shop_offer error:', err);
      socket.emit('error', { message: 'Could not send that offer.' });
    }
  });

  // Settling an accepted offer: the money and the goods, together.
  //
  // Everything is checked before anything is written. A purchase that deducts
  // gold and then fails to hand over the sword is worse than one that never
  // happened, and the checks (stock, funds, whether the pack still holds what
  // was promised) can all fail for ordinary reasons mid-session.
  async function settleOffer(offer, sessionCode) {
    const stock = (await db.query('SELECT * FROM shop_items WHERE shop_id=$1', [offer.shop_id])).rows;
    const lines = typeof offer.lines === 'string' ? JSON.parse(offer.lines) : (offer.lines || []);
    const creature = (await db.query(
      'SELECT id, name, inventory, currency_cp, currency_sp, currency_gp FROM creatures WHERE id=$1',
      [offer.creature_id]
    )).rows[0];
    if (!creature) return { ok: false, error: 'That character no longer exists.' };

    let inv = creature.inventory || [];
    if (typeof inv === 'string') { try { inv = JSON.parse(inv); } catch { inv = []; } }

    const asking = shops.askingPriceCp(lines, stock);
    const agreed = shops.agreedCp(offer, asking);
    const purse = shops.purseCp(creature);

    let nextInv;
    if (offer.kind === 'buy') {
      const stocked = shops.checkStock(lines, stock);
      if (!stocked.ok) return { ok: false, error: stocked.error };
      if (agreed > purse) {
        return { ok: false, error: `${creature.name} only has ${shops.formatCp(purse)}.` };
      }
      nextInv = [...inv, ...shops.itemsForBuy(lines, stock)];
    } else {
      const removed = shops.removeSoldItems(inv, lines);
      if (!removed.ok) return { ok: false, error: removed.error };
      nextInv = removed.inventory;
    }

    const purseAfter = offer.kind === 'buy' ? purse - agreed : purse + agreed;
    const coins = shops.splitCp(purseAfter);

    await db.query(
      `UPDATE creatures SET inventory=$1, currency_gp=$2, currency_sp=$3, currency_cp=$4 WHERE id=$5`,
      [JSON.stringify(nextInv), coins.gp, coins.sp, coins.cp, creature.id]
    );
    if (offer.kind === 'buy') {
      for (const { id, qty } of shops.stockAfter(lines, stock)) {
        await db.query('UPDATE shop_items SET qty=$1 WHERE id=$2', [qty, id]);
      }
    }
    // The sheet is watching this event already — it is how treasure lands.
    io.to(sessionCode).emit('treasure_received', {
      creatureId: creature.id, items: [], newInventory: nextInv,
    });
    io.to(sessionCode).emit('creature_currency_changed', {
      creatureId: creature.id, gp: coins.gp, sp: coins.sp, cp: coins.cp,
    });
    return { ok: true, agreed, creatureName: creature.name };
  }

  // The GM's verdict: take it, refuse it, or name a different number.
  socket.on('shop_offer_respond', async ({ offerId, action, counterCp: counterCpIn, counterPrice, note }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      const offer = (await db.query('SELECT * FROM shop_offers WHERE id=$1', [offerId])).rows[0];
      if (!offer || offer.status !== 'pending') return;

      if (action === 'counter') {
        const counterCp = shops.priceFromInput({ cp: counterCpIn, text: counterPrice });
        const row = (await db.query(
          `UPDATE shop_offers SET status='countered', counter_cp=$1, counter_note=$2, updated_at=NOW()
            WHERE id=$3 RETURNING *`,
          [counterCp, String(note || '').slice(0, 400), offerId]
        )).rows[0];
        io.to(sessionCode).emit('shop_offer_updated', { offer: row });
        emitOfferToOwner(sessionCode, row);
        return;
      }

      if (action === 'decline') {
        const row = (await db.query(
          `UPDATE shop_offers SET status='declined', counter_note=$1, updated_at=NOW()
            WHERE id=$2 RETURNING *`,
          [String(note || '').slice(0, 400), offerId]
        )).rows[0];
        io.to(sessionCode).emit('shop_offer_updated', { offer: row });
        return;
      }

      const result = await settleOffer(offer, sessionCode);
      if (!result.ok) {
        socket.emit('error', { message: result.error });
        return;
      }
      const row = (await db.query(
        `UPDATE shop_offers SET status='accepted', updated_at=NOW() WHERE id=$1 RETURNING *`, [offerId]
      )).rows[0];
      io.to(sessionCode).emit('shop_offer_updated', { offer: row, settled: shops.formatCp(result.agreed) });
      await pushShop(sessionCode, offer.shop_id);
    } catch (err) {
      console.error('shop_offer_respond error:', err);
      socket.emit('error', { message: 'Could not settle that.' });
    }
  });

  // The player taking or refusing the GM's counter. Accepting settles at the
  // counter — see agreedCp, which is the single place that decides the number.
  socket.on('shop_counter_respond', async ({ offerId, accept }) => {
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      const offer = (await db.query('SELECT * FROM shop_offers WHERE id=$1', [offerId])).rows[0];
      if (!offer || offer.status !== 'countered') return;
      // Only the player who made it, or the GM acting for them.
      if (socket.data.role !== 'dm' && offer.player_name !== socket.data.name) return;

      if (!accept) {
        const row = (await db.query(
          `UPDATE shop_offers SET status='declined', updated_at=NOW() WHERE id=$1 RETURNING *`, [offerId]
        )).rows[0];
        io.to(sessionCode).emit('shop_offer_updated', { offer: row });
        return;
      }
      const result = await settleOffer(offer, sessionCode);
      if (!result.ok) {
        socket.emit('error', { message: result.error });
        return;
      }
      const row = (await db.query(
        `UPDATE shop_offers SET status='accepted', updated_at=NOW() WHERE id=$1 RETURNING *`, [offerId]
      )).rows[0];
      io.to(sessionCode).emit('shop_offer_updated', { offer: row, settled: shops.formatCp(result.agreed) });
      await pushShop(sessionCode, offer.shop_id);
    } catch (err) {
      console.error('shop_counter_respond error:', err);
    }
  });

  // Everything still on the table, for a GM who just connected.
  socket.on('shop_offers_pending', async ({ sessionId }) => {
    if (socket.data.role !== 'dm') return;
    try {
      const rows = (await db.query(
        `SELECT * FROM shop_offers WHERE session_id=$1 AND status IN ('pending','countered')
          ORDER BY created_at`, [sessionId]
      )).rows;
      socket.emit('shop_offers_pending', { offers: rows });
    } catch (err) { console.error('shop_offers_pending error:', err); }
  });

  /**
   * A player asking what offer of theirs is still outstanding.
   *
   * Sent on join and whenever a shop opens. Without it a refresh — or a phone
   * that slept through the answer — leaves the party with an offer they can
   * neither see nor withdraw, blocking every further purchase while the GM
   * looks at a screen that says the ball is in the player's court.
   */
  socket.on('shop_my_offer', async ({ creatureId }) => {
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode || socket.data.role === 'dm') return;
    try {
      if (creatureId) socket.data.creatureId = Number(creatureId);
      // The session comes from the socket, not the client. A player view that
      // has just reconnected may not have the session id to hand yet, and this
      // is the one call it has to be able to make at exactly that moment.
      const row = (await db.query(
        `SELECT o.* FROM shop_offers o
           JOIN sessions se ON se.id = o.session_id
          WHERE se.session_code=$1 AND o.status IN ('pending','countered')
            AND (($2::int IS NOT NULL AND o.creature_id=$2) OR ($2::int IS NULL AND o.player_name=$3))
          ORDER BY o.created_at DESC LIMIT 1`,
        [sessionCode, creatureId ? Number(creatureId) : null, socket.data.name || '']
      )).rows[0] || null;
      socket.emit('shop_offer_sent', { offer: row });
    } catch (err) { console.error('shop_my_offer error:', err); }
  });

  /**
   * The party taking an unanswered offer back.
   *
   * Their own offer only, and only while it is still unanswered: withdrawing
   * something the GM has already accepted would be undoing a sale.
   */
  socket.on('shop_offer_withdraw', async ({ offerId }) => {
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode || socket.data.role === 'dm') return;
    try {
      const offer = (await db.query('SELECT * FROM shop_offers WHERE id=$1', [offerId])).rows[0];
      if (!offer || offer.status !== 'pending') return;
      const mine = (offer.creature_id && socket.data.creatureId
                    && Number(offer.creature_id) === Number(socket.data.creatureId))
                || (offer.player_name && offer.player_name === socket.data.name);
      if (!mine) return;

      const row = (await db.query(
        `UPDATE shop_offers SET status='withdrawn', updated_at=NOW() WHERE id=$1 RETURNING *`,
        [offerId]
      )).rows[0];
      socket.emit('shop_offer_sent', { offer: null });
      // The GM's list is keyed on status, so it drops off their screen too.
      io.to(sessionCode).emit('shop_offer_updated', { offer: row });
    } catch (err) { console.error('shop_offer_withdraw error:', err); }
  });

  // ── Sneak mode ────────────────────────────────────────────────────────────
  //
  // The rules engine is detection.js; these are just the switches that feed it.
  // Every one is GM-only, and deliberately so: a player who could set their own
  // Stealth DC has not so much bypassed the feature as deleted it.

  socket.on('set_sneak_mode', async ({ sessionId, enabled }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      // Turning it on starts the round clock; turning it off stops it. Both
      // are one write, and every client derives the rest from the anchor.
      await db.query(
        'UPDATE sessions SET sneak_mode=$1, sneak_round_at=$2 WHERE id=$3',
        [!!enabled, enabled ? new Date() : null, sessionId]
      );
      const anchorRow = (await db.query(
        'SELECT sneak_round_at FROM sessions WHERE id=$1', [sessionId]
      )).rows[0] || {};
      // Switching OFF puts every guard back to unaware and drops every sneak
      // flag. Leaving them set would mean a board that still behaves as though
      // it were sneaking — guards frozen mid-route by a suspicion that nothing
      // can now clear, because the sweep that clears it has been turned off.
      if (!enabled) {
        const reset = (await db.query(
          `UPDATE session_tokens
              SET awareness='unaware', awareness_at=NULL, sneaking=false,
                  last_contact_col=NULL, last_contact_row=NULL
            WHERE session_id=$1 AND (awareness <> 'unaware' OR sneaking = true)
            RETURNING id`, [sessionId]
        )).rows;
        for (const r of reset) {
          detection.announce(io, sessionCode, { tokenId: r.id, awareness: 'unaware', lastContact: null }, false);
          io.to(sessionCode).emit('token_sneak_changed', { tokenId: r.id, sneaking: false });
        }
        // And everyone gets their legs back. A half-spent window left behind
        // would sit there until it aged out, so the first drag after a sneak
        // sequence ended could still be refused.
        await movement.clearAll(db, sessionId);
        io.to(sessionCode).emit('move_budgets_cleared', {});
      }
      io.to(sessionCode).emit('sneak_mode_changed', {
        enabled: !!enabled,
        roundAt: enabled ? new Date(anchorRow.sneak_round_at).getTime() : null,
      });
      if (enabled) sneakWatch(sessionCode);
    } catch (err) {
      console.error('set_sneak_mode error:', err);
    }
  });

  // Who is sneaking, and what they rolled.
  //
  // `stealthDc` is accepted as undefined (leave it alone) or null (clear it),
  // so "start sneaking" and "here is the roll" are the same handler without one
  // wiping the other.
  socket.on('set_token_sneaking', async ({ tokenId, sneaking, stealthDc }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      const dcGiven = stealthDc !== undefined;
      const dc = stealthDc == null ? null : Math.max(0, Math.min(50, Math.round(Number(stealthDc) || 0)));
      const row = (await db.query(
        `UPDATE session_tokens
            SET sneaking = COALESCE($1, sneaking),
                stealth_dc = CASE WHEN $2 THEN $3 ELSE stealth_dc END
          WHERE id=$4 RETURNING id, sneaking, stealth_dc`,
        [sneaking === undefined ? null : !!sneaking, dcGiven, dc, tokenId]
      )).rows[0];
      if (!row) return;
      io.to(sessionCode).emit('token_sneak_changed', {
        tokenId: row.id, sneaking: row.sneaking, stealthDc: row.stealth_dc,
      });
      sneakWatch(sessionCode);
    } catch (err) {
      console.error('set_token_sneaking error:', err);
    }
  });

  // Which of its speeds a token uses while sneaking.
  //
  // `auto` — the default, and what every token does outside a sequence — reads
  // the board: airborne with a fly speed means flying, anything else walks.
  // Forcing a mode is for the cases the board cannot see, like a character
  // deliberately crawling, or swimming a flooded corridor the map draws as
  // floor.
  socket.on('set_token_move_mode', async ({ tokenId, mode }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      const want = movement.MOVE_MODES.includes(mode) ? mode : 'auto';
      // 'auto' is stored as NULL so a token that has never been touched and one
      // explicitly set back to auto are the same thing.
      const row = (await db.query(
        'UPDATE session_tokens SET move_mode=$1 WHERE id=$2 RETURNING id, move_mode',
        [want === 'auto' ? null : want, tokenId]
      )).rows[0];
      if (!row) return;
      io.to(sessionCode).emit('token_move_mode_changed', {
        tokenId: row.id, mode: row.move_mode || 'auto',
      });
    } catch (err) {
      console.error('set_token_move_mode error:', err);
    }
  });

  // Which way a token is looking, and how wide its cone is.
  socket.on('set_token_facing', async ({ tokenId, facing, arc }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      const f = facing == null ? null : ((Number(facing) % 360) + 360) % 360;
      // An arc of 0 would be a token that can see nothing at all, which is a
      // way to break a guard rather than to configure one; 360 is the way to
      // say "no cone".
      const a = arc == null ? null : Math.max(10, Math.min(360, Number(arc) || 360));
      const row = (await db.query(
        `UPDATE session_tokens
            SET facing = COALESCE($1, facing), vision_arc = COALESCE($2, vision_arc)
          WHERE id=$3 RETURNING id, facing, vision_arc`,
        [f, a, tokenId]
      )).rows[0];
      if (!row) return;
      io.to(sessionCode).emit('token_facing_changed', {
        tokenId: row.id, facing: row.facing, arc: row.vision_arc,
      });
      sneakWatch(sessionCode);
    } catch (err) {
      console.error('set_token_facing error:', err);
    }
  });

  // One sense's arc.
  //
  // A creature is usually several sensors at once and they do not share a
  // shape: eyes in a wedge in front, blindsight in a bubble all round. The arc
  // therefore lives on the sense rather than on the token, and `vision_arc`
  // stays as the fallback for anything sight-based that has not been given one.
  socket.on('set_token_sense_arc', async ({ tokenId, index, arc }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      const row = (await db.query(
        'SELECT id, senses, vision_type, vision_range FROM session_tokens WHERE id=$1', [tokenId]
      )).rows[0];
      if (!row) return;
      // A token that has never had an explicit sense list is described by
      // vision_type/vision_range instead. Materialise that into a real list
      // before writing to it, exactly as every reader already interprets it —
      // otherwise there is nothing to hang the arc on.
      const list = Array.isArray(row.senses) && row.senses.length
        ? row.senses.map((x) => ({ ...x }))
        : [{ type: row.vision_type || 'normal', range: Number(row.vision_range) || 0 }];
      const i = Number(index);
      if (!Number.isInteger(i) || i < 0 || i >= list.length) return;
      // 360 is stored as "no cone" rather than as null, so that an explicit
      // all-round sense overrides the token-wide arc instead of falling back to
      // it. Null clears the override and hands the sense back to that default.
      list[i].arc = arc == null ? null : Math.max(10, Math.min(360, Number(arc) || 360));
      const saved = (await db.query(
        'UPDATE session_tokens SET senses=$1 WHERE id=$2 RETURNING id, senses',
        [JSON.stringify(list), tokenId]
      )).rows[0];
      io.to(sessionCode).emit('token_senses_changed', { tokenId: saved.id, senses: saved.senses });
      sneakWatch(sessionCode);
    } catch (err) {
      console.error('set_token_sense_arc error:', err);
    }
  });

  // Stand a guard down. Alerted never decays on its own — this is the only way
  // back, and it restarts the patrol as a side effect.
  socket.on('clear_awareness', async ({ tokenId, sessionId }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      const rows = (await db.query(
        `UPDATE session_tokens
            SET awareness='unaware', awareness_at=NULL,
                last_contact_col=NULL, last_contact_row=NULL
          WHERE ($1::int IS NULL OR id=$1) AND ($2::int IS NULL OR session_id=$2)
            AND awareness <> 'unaware'
          RETURNING id`,
        [tokenId ?? null, sessionId ?? null]
      )).rows;
      for (const r of rows) {
        detection.announce(io, sessionCode, { tokenId: r.id, awareness: 'unaware', lastContact: null }, false);
      }
    } catch (err) {
      console.error('clear_awareness error:', err);
    }
  });

  // Everything at once — the button on the GM's screen.
  // The patrols on ONE map. `mapId` is required in spirit but defaulted to the
  // session's current map, so a client that hasn't been updated still pauses the
  // board the GM is looking at rather than silently doing nothing.
  socket.on('set_patrols_paused', async ({ paused, mapId }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      let target = Number(mapId);
      if (!Number.isFinite(target)) {
        const sres = await db.query('SELECT map_id FROM sessions WHERE session_code=$1', [sessionCode]);
        target = sres.rows.length ? Number(sres.rows[0].map_id) : NaN;
      }
      if (!Number.isFinite(target)) return;
      // Scoped to this session's own maps, so a map id from elsewhere cannot be
      // toggled by guessing a number.
      const r = await db.query(
        `UPDATE maps m SET patrols_paused=$1
           FROM sessions s
          WHERE m.id=$2 AND m.session_id = s.id AND s.session_code=$3
        RETURNING m.patrols_paused`,
        [!!paused, target, sessionCode]);
      if (r.rows.length) {
        io.to(sessionCode).emit('patrols_paused_changed',
          { mapId: target, paused: !!r.rows[0].patrols_paused });
      }
    } catch (err) {
      console.error('set_patrols_paused error:', err);
    }
  });

  socket.on('list_patrols', async () => {
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      const rows = (await db.query(
        `SELECT p.* FROM token_patrols p
           JOIN sessions s ON s.id = p.session_id
          WHERE s.session_code = $1`, [sessionCode])).rows;
      socket.emit('patrols_list', { patrols: rows });
    } catch (err) {
      console.error('list_patrols error:', err);
    }
  });

  socket.on('dm_set_token_familiar', async ({ tokenId, playerName, kind }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      const owner = playerName ? String(playerName).slice(0, 255) : null;
      const tokRes = await db.query(
        'SELECT is_player FROM session_tokens WHERE id=$1', [tokenId]
      );
      if (!tokRes.rows.length) return;
      if (owner && tokRes.rows[0].is_player) {
        socket.emit('error', { message: "A player's own token can't be a familiar." });
        return;
      }
      const KINDS = new Set(['familiar', 'summon', 'companion', 'mount', 'duplicate']);
      const safeKind = KINDS.has(String(kind)) ? String(kind) : 'familiar';
      await db.query(
        'UPDATE session_tokens SET familiar_of=$1, companion_kind=$2 WHERE id=$3',
        [owner, owner ? safeKind : 'familiar', tokenId]
      );
      io.to(sessionCode).emit('token_familiar_changed', {
        tokenId, familiarOf: owner, companionKind: owner ? safeKind : null,
      });
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

  // ── Roll a table (GM only) ────────────────────────────────────────────────
  //
  // Rolled server-side so everyone sees the same result and it lands in the
  // shared log next to the dice. `secret` keeps it off the players' screens —
  // a wandering-monster check the party shouldn't know happened is the normal
  // case for half these tables.
  // Roll one table and announce it. Shared by the Tables tab and by rolling a
  // slain creature's loot, so both produce the same log entry and the same
  // weighted maths.
  async function rollTableInto(sessionCode, tableId, { secret = false, prefix = '' } = {}) {
    const t = (await db.query('SELECT * FROM rollable_tables WHERE id=$1', [tableId])).rows[0];
    if (!t) return null;
    const rows = (await db.query(
      'SELECT * FROM rollable_table_rows WHERE table_id=$1 ORDER BY sort_order, id',
      [tableId]
    )).rows;
    if (!rows.length) return null;

    const total = rows.reduce((a, r) => a + Math.max(1, r.weight || 1), 0);
    const roll = Math.floor(Math.random() * total) + 1;
    let acc = 0;
    let hit = rows[rows.length - 1];
    for (const r of rows) {
      acc += Math.max(1, r.weight || 1);
      if (roll <= acc) { hit = r; break; }
    }

    const entry = pushRoll(sessionCode, {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      kind: 'table',
      userName: socket.data.name,
      role: 'dm',
      color: drawColorFor(sessionCode, socket.data.name),
      tableName: prefix ? `${prefix} — ${t.name}` : t.name,
      result: hit.text,
      rolls: [roll],
      total: roll,
      outOf: total,
      secret: !!secret,
      timestamp: Date.now(),
    });
    if (secret) socket.emit('table_rolled', entry);
    else io.to(sessionCode).emit('table_rolled', entry);
    return entry;
  }

  // What this creature was carrying. Looked up server-side from the token, so
  // the client never has to know whether a loot table is set — it just asks.
  // The party has worked out what the item does.
  //
  // Flips one item's secret to revealed, which is what lets it through the
  // stripper from then on. GM only, and it broadcasts the creature id so an
  // open player sheet refreshes itself rather than waiting for a reload.
  socket.on('reveal_item_secret', async ({ creatureId, itemIndex, revealed }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      const row = (await db.query('SELECT id, name, inventory FROM creatures WHERE id=$1', [creatureId])).rows[0];
      if (!row) return;
      const { parseInventory } = require('./itemSecrets');
      const inv = parseInventory(row.inventory);
      const i = Number(itemIndex);
      if (!inv[i]) return;
      inv[i] = { ...inv[i], secret_revealed: revealed !== false };
      await db.query('UPDATE creatures SET inventory=$1 WHERE id=$2', [JSON.stringify(inv), creatureId]);
      io.to(sessionCode).emit('item_secret_revealed', {
        creatureId,
        itemIndex: i,
        itemName: inv[i].name || 'item',
        revealed: revealed !== false,
      });
    } catch (err) {
      console.error('reveal_item_secret error:', err);
    }
  });

  socket.on('roll_creature_loot', async ({ tokenId, secret }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      const row = (await db.query(
        `SELECT st.name AS token_name, c.name AS creature_name, c.loot_table_id
           FROM session_tokens st
           LEFT JOIN creatures c ON c.id = st.creature_id
          WHERE st.id = $1`,
        [tokenId]
      )).rows[0];
      if (!row) return;
      if (!row.loot_table_id) {
        socket.emit('creature_loot_missing', {
          tokenId,
          name: row.creature_name || row.token_name || 'This creature',
        });
        return;
      }
      // SECRET unless the GM explicitly asks otherwise.
      //
      // What a monster was carrying is the GM's to reveal, in their own words,
      // after the party has searched the body. Defaulting this the other way
      // meant the roll appeared in everyone's log the instant the GM was
      // curious — the players learning there is a Potion of Healing before
      // anyone has looked for it, and learning it from a dice log.
      //
      // Decided here rather than in the client so no caller can leak it by
      // omission, which is exactly how it leaked in the first place.
      await rollTableInto(sessionCode, row.loot_table_id, {
        secret: secret !== false,
        prefix: row.token_name || row.creature_name || 'Loot',
      });
    } catch (err) {
      console.error('roll_creature_loot error:', err);
    }
  });

  socket.on('roll_table', async ({ tableId, secret }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      const t = (await db.query('SELECT * FROM rollable_tables WHERE id=$1', [tableId])).rows[0];
      if (!t) return;
      const rows = (await db.query(
        'SELECT * FROM rollable_table_rows WHERE table_id=$1 ORDER BY sort_order, id',
        [tableId]
      )).rows;
      if (!rows.length) return;

      // Weighted pick. Expressed as "roll 1..total, walk until the running
      // weight passes it" so the reported roll is a real number the GM can
      // sanity-check against the table.
      const total = rows.reduce((a, r) => a + Math.max(1, r.weight || 1), 0);
      const roll = Math.floor(Math.random() * total) + 1;
      let acc = 0;
      let hit = rows[rows.length - 1];
      for (const r of rows) {
        acc += Math.max(1, r.weight || 1);
        if (roll <= acc) { hit = r; break; }
      }

      const entry = pushRoll(sessionCode, {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        kind: 'table',
        userName: socket.data.name,
        role: 'dm',
        color: drawColorFor(sessionCode, socket.data.name),
        tableName: t.name,
        result: hit.text,
        rolls: [roll],
        total: roll,
        outOf: total,
        secret: !!secret,
        timestamp: Date.now(),
      });

      if (secret) socket.emit('table_rolled', entry);
      else io.to(sessionCode).emit('table_rolled', entry);
    } catch (err) {
      console.error('roll_table error:', err);
    }
  });

  // ── Map state snapshots (GM only) ─────────────────────────────────────────
  //
  // Saves the board as it stands: position, HP, conditions, combat membership.
  // Deliberately keyed by token id AND player_name/creature_id, so a restore
  // can still find a token that was deleted and recreated between sessions.
  const SNAPSHOT_FIELDS = [
    'grid_col', 'grid_row', 'current_hp', 'max_hp', 'temp_hp', 'conditions',
    'is_hidden', 'is_dead', 'in_combat', 'initiative', 'exhaustion',
    'is_flying', 'elevation', 'z_index', 'ship_id', 'deck_index', 'deck_col', 'deck_row',
    'hide_name_from_players', 'hide_hp_from_players', 'tracker_reminder',
    'sneaking', 'stealth_dc', 'awareness', 'facing', 'vision_arc', 'move_mode',
  ];

  socket.on('save_map_state', async ({ sessionId, name }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      const sess = (await db.query('SELECT id, map_id FROM sessions WHERE id=$1', [sessionId])).rows[0];
      if (!sess) return;
      if (!sess.map_id) {
        socket.emit('error', { message: 'No map is loaded — nothing to save.' });
        return;
      }
      const label = String(name || 'End of session').slice(0, 120);
      const toks = (await db.query(
        'SELECT * FROM session_tokens WHERE session_id=$1 AND map_id=$2',
        [sessionId, sess.map_id]
      )).rows;

      const snapshot = toks.map((t) => {
        const row = { id: t.id, name: t.name, player_name: t.player_name, creature_id: t.creature_id };
        for (const f of SNAPSHOT_FIELDS) row[f] = t[f];
        return row;
      });

      await db.query(
        `INSERT INTO map_snapshots (session_id, map_id, name, tokens, created_at)
         VALUES ($1,$2,$3,$4,NOW())
         ON CONFLICT (session_id, map_id, name)
         DO UPDATE SET tokens = EXCLUDED.tokens, created_at = NOW()`,
        [sessionId, sess.map_id, label, JSON.stringify(snapshot)]
      );
      socket.emit('map_state_saved', { name: label, mapId: sess.map_id, count: snapshot.length, savedAt: Date.now() });
    } catch (err) {
      console.error('save_map_state error:', err);
      socket.emit('error', { message: 'Could not save the map state.' });
    }
  });

  socket.on('list_map_states', async ({ sessionId }) => {
    if (socket.data.role !== 'dm') return;
    try {
      const rows = (await db.query(
        `SELECT ms.id, ms.name, ms.map_id, ms.created_at, jsonb_array_length(ms.tokens) AS token_count,
                m.name AS map_name
           FROM map_snapshots ms LEFT JOIN maps m ON ms.map_id = m.id
          WHERE ms.session_id=$1 ORDER BY ms.created_at DESC`,
        [sessionId]
      )).rows;
      socket.emit('map_states', { snapshots: rows });
    } catch (err) {
      console.error('list_map_states error:', err);
    }
  });

  socket.on('restore_map_state', async ({ sessionId, snapshotId }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      const snap = (await db.query(
        'SELECT * FROM map_snapshots WHERE id=$1 AND session_id=$2',
        [snapshotId, sessionId]
      )).rows[0];
      if (!snap) return;

      const live = (await db.query(
        'SELECT * FROM session_tokens WHERE session_id=$1',
        [sessionId]
      )).rows;

      let restored = 0;
      const missing = [];
      for (const saved of (snap.tokens || [])) {
        // Match on id first; fall back to the player's name, then the creature
        // + token name. A token deleted and re-placed between sessions has a
        // new id but is obviously the same character.
        const match = live.find((t) => t.id === saved.id)
          || (saved.player_name && live.find((t) => t.is_player && t.player_name === saved.player_name))
          || (saved.creature_id && live.find((t) => t.creature_id === saved.creature_id && t.name === saved.name));
        if (!match) { missing.push(saved.name || saved.player_name || `#${saved.id}`); continue; }

        const sets = ['map_id=$1'];
        const vals = [snap.map_id];
        for (const f of SNAPSHOT_FIELDS) {
          if (saved[f] === undefined) continue;
          vals.push(f === 'conditions' ? JSON.stringify(saved[f] ?? []) : saved[f]);
          sets.push(`${f}=$${vals.length}`);
        }
        vals.push(match.id);
        await db.query(`UPDATE session_tokens SET ${sets.join(', ')} WHERE id=$${vals.length}`, vals);
        restored++;
      }

      // Re-broadcast the whole board rather than a patch per field: a restore
      // touches nearly everything about a token, and the clients already merge
      // token_refreshed.
      const after = (await db.query(
        `SELECT st.*, c.image_path AS creature_image, c.display_image_path AS creature_display_image, c.standee_image_path AS creature_standee, c.base_color AS creature_base_color, c.base_opacity AS creature_base_opacity, c.token_height_ft AS creature_token_height,
                c.dexterity AS creature_dex, COALESCE(c.speed_walk, 30) AS creature_speed, COALESCE(c.speed_fly, 0) AS creature_speed_fly, COALESCE(c.speed_swim, 0) AS creature_speed_swim, COALESCE(c.speed_climb, 0) AS creature_speed_climb, COALESCE(c.speed_burrow, 0) AS creature_speed_burrow,
                COALESCE(c.initiative_bonus, 0) AS initiative_bonus
           FROM session_tokens st LEFT JOIN creatures c ON st.creature_id = c.id
          WHERE st.session_id=$1 AND st.map_id=$2`,
        [sessionId, snap.map_id]
      )).rows;
      for (const t of after) io.to(sessionCode).emit('token_refreshed', { token: t });

      socket.emit('map_state_restored', { name: snap.name, restored, missing });
    } catch (err) {
      console.error('restore_map_state error:', err);
      socket.emit('error', { message: 'Could not restore the map state.' });
    }
  });

  socket.on('delete_map_state', async ({ sessionId, snapshotId }) => {
    if (socket.data.role !== 'dm') return;
    try {
      await db.query('DELETE FROM map_snapshots WHERE id=$1 AND session_id=$2', [snapshotId, sessionId]);
      socket.emit('map_state_deleted', { snapshotId });
    } catch (err) {
      console.error('delete_map_state error:', err);
    }
  });

  // ── Token elevation ───────────────────────────────────────────────────────
  // The GM can set anyone's height; a player can set their own, because the
  // player flying the broom is the one who knows how high they went. Clamped
  // to a sane band so a typo can't put someone 40 miles up and wreck the
  // vertical scale of the 3D view.
  socket.on('set_token_elevation', async ({ tokenId, elevation }) => {
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      const tok = (await db.query('SELECT * FROM session_tokens WHERE id=$1', [tokenId])).rows[0];
      if (!tok) return;
      if (socket.data.role !== 'dm') {
        if (!tok.is_player || tok.player_name !== socket.data.name) return;
      }
      const ft = Math.max(-500, Math.min(5000, Math.round(Number(elevation) || 0)));
      // Above the ground implies airborne; back on the deck implies not. The
      // GM can still toggle is_flying by hand afterwards for oddities like a
      // creature hovering at 0 or one buried below ground.
      await db.query(
        // Both casts are load-bearing: without them Postgres tries to deduce a
        // single type for $1 from a float assignment AND an integer comparison,
        // and refuses with "inconsistent types deduced for parameter $1".
        'UPDATE session_tokens SET elevation=$1::float, is_flying = CASE WHEN $1::float > 0 THEN true ELSE false END WHERE id=$2',
        [ft, tokenId]
      );
      io.to(sessionCode).emit('token_elevation_changed', { tokenId, elevation: ft, isFlying: ft > 0 });
    } catch (err) {
      console.error('set_token_elevation error:', err);
    }
  });

  // ── Tracker reminder (GM only) ────────────────────────────────────────────
  // A short note pinned after this token in the GM's initiative strip. Never
  // sent as a turn — it must not enter buildCombatOrder, because combat_turn
  // is an INDEX into that list and inserting anything would point the GM and
  // the players at different combatants.
  socket.on('dm_set_tracker_reminder', async ({ tokenId, text }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    try {
      const note = String(text || '').slice(0, 60);
      await db.query('UPDATE session_tokens SET tracker_reminder=$1 WHERE id=$2', [note, tokenId]);
      io.to(sessionCode).emit('tracker_reminder_changed', { tokenId, text: note });
    } catch (err) {
      console.error('tracker reminder error:', err);
    }
  });

  // ── Freehand drawing (everyone) ───────────────────────────────────────────
  //
  // Players draw as well as the GM: marking a route, circling the thing they
  // mean, sketching the room the ranger describes. Each person's ink carries
  // their own colour, so "the red arrow" is an unambiguous sentence at the
  // table.
  socket.on('draw_stroke', ({ mapId, points, width }) => {
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    if (!Array.isArray(points) || points.length < 4) return; // needs 2 xy pairs

    if (!sessionDrawings[sessionCode]) sessionDrawings[sessionCode] = [];
    const list = sessionDrawings[sessionCode];

    const stroke = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      mapId: mapId == null ? null : Number(mapId),
      author: socket.data.name,
      role: socket.data.role,
      color: drawColorFor(sessionCode, socket.data.name),
      width: Math.min(24, Math.max(1, Number(width) || 4)),
      // Trimmed rather than rejected: a long drag is a legitimate stroke, it
      // just doesn't need every sampled point to read correctly.
      points: points.slice(0, DRAW_MAX_POINTS * 2).map((n) => Math.round(Number(n) * 10) / 10),
      timestamp: Date.now(),
    };
    list.push(stroke);
    if (list.length > DRAW_MAX_PER_SESSION) list.splice(0, list.length - DRAW_MAX_SESSION);
    io.to(sessionCode).emit('draw_stroke', stroke);
  });

  // Undo removes the author's own most recent stroke on this map. Never
  // anyone else's, whoever asks — the GM has draw_clear for that.
  socket.on('draw_undo', ({ mapId }) => {
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    const list = sessionDrawings[sessionCode] || [];
    const want = mapId == null ? null : Number(mapId);
    for (let i = list.length - 1; i >= 0; i--) {
      const d = list[i];
      if (d.author === socket.data.name && (d.mapId == null ? null : Number(d.mapId)) === want) {
        list.splice(i, 1);
        io.to(sessionCode).emit('draw_removed', { ids: [d.id] });
        return;
      }
    }
  });

  // `scope: 'mine'` wipes the caller's ink; anything else is a GM-only wipe of
  // the whole map, because clearing another player's marks is a GM decision.
  socket.on('draw_clear', ({ mapId, scope }) => {
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    const mine = scope === 'mine';
    if (!mine && socket.data.role !== 'dm') return;

    const list = sessionDrawings[sessionCode] || [];
    const want = mapId == null ? null : Number(mapId);
    const removed = [];
    for (let i = list.length - 1; i >= 0; i--) {
      const d = list[i];
      if ((d.mapId == null ? null : Number(d.mapId)) !== want) continue;
      if (mine && d.author !== socket.data.name) continue;
      removed.push(d.id);
      list.splice(i, 1);
    }
    if (removed.length) io.to(sessionCode).emit('draw_removed', { ids: removed });
  });

  // ── Combat control (GM only) ──────────────────────────────────────────────
  socket.on('set_combat', async ({ sessionId, active, tokenIds, shipIds }) => {
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

      // Ships ride the same switch. Ending combat drops every hull out of the
      // order too, otherwise the next fight opens with last fight's ships
      // already in it — they're placed on the map, not spawned per encounter,
      // so nothing else would ever clear the flag.
      if (!active) {
        await db.query(
          'UPDATE map_ships SET in_combat=false WHERE session_id=$1',
          [sessionId]
        );
      } else if (Array.isArray(shipIds)) {
        await db.query(
          'UPDATE map_ships SET in_combat = (id = ANY($1::int[])) WHERE session_id=$2',
          [shipIds, sessionId]
        );
      }

      io.to(sessionCode).emit('combat_changed', {
        active, currentTurn: 0,
        tokenIds: tokenIds || null,
        shipIds: Array.isArray(shipIds) ? shipIds : null,
      });
    } catch (err) {
      console.error(err);
    }
  });

  // Add additional tokens to an active combat without resetting the turn
  // counter or kicking anyone out — used when reinforcements walk into a
  // fight or the GM forgot a token at start.
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

  // ── User color (GM only) ──────────────────────────────────────────────────
  socket.on('set_user_color', ({ name, color }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;

    if (!sessionUserColors[sessionCode]) sessionUserColors[sessionCode] = {};
    sessionUserColors[sessionCode][name] = color;
    io.to(sessionCode).emit('user_color_changed', { name, color });
  });

  // ── Dice roll ─────────────────────────────────────────────────────────────
  socket.on('roll_dice', ({ dice, count, modifier, label, mode }) => {
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;

    // Defensive: the protocol-canonical form is the string "d20" but
    // accept a bare integer too (the iOS app emitted the int and the
    // unguarded .replace below was throwing inside the socket handler,
    // which propagated and bounced every other client to reconnect).
    let sides;
    if (typeof dice === 'string') {
      sides = parseInt(dice.replace('d', ''), 10);
    } else if (typeof dice === 'number') {
      sides = Math.floor(dice);
    }
    if (!Number.isFinite(sides) || sides < 2) return;
    // Echo the canonical "dN" string back so all clients see the same
    // shape regardless of which client raised the roll.
    const diceStr = `d${sides}`;

    // Advantage and disadvantage: throw two, keep one.
    //
    // Only meaningful for a single die — "2d6 with advantage" is not a thing, so
    // a multi-die roll ignores the flag rather than quietly rolling four dice.
    // Both dice are reported, along with which was kept, so the shared log shows
    // the real throw instead of a number the table has to take on trust.
    const asked = String(mode || '').toLowerCase();
    const adv = (asked === 'advantage' || asked === 'adv') ? 'advantage'
      : (asked === 'disadvantage' || asked === 'dis') ? 'disadvantage'
      : null;
    const howMany = count || 1;
    const twoOfThem = !!adv && howMany === 1;

    const rolls = [];
    for (let i = 0; i < (twoOfThem ? 2 : howMany); i++) {
      rolls.push(Math.floor(Math.random() * sides) + 1);
    }
    let kept = null;
    let dropped = null;
    if (twoOfThem) {
      const hi = Math.max(rolls[0], rolls[1]);
      const lo = Math.min(rolls[0], rolls[1]);
      kept = adv === 'advantage' ? hi : lo;
      dropped = adv === 'advantage' ? lo : hi;
    }
    const total = (twoOfThem ? kept : rolls.reduce((a, b) => a + b, 0)) + (modifier || 0);

    // One object, logged and broadcast, so the log can never disagree with what
    // the table saw pop up on screen.
    const entry = pushRoll(sessionCode, {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      kind: 'dice',
      userName: socket.data.name,
      role: socket.data.role,
      color: drawColorFor(sessionCode, socket.data.name),
      dice: diceStr,
      count: count || 1,
      modifier: modifier || 0,
      rolls,
      total,
      // Null on an ordinary roll, so a client that knows nothing about advantage
      // reads the entry exactly as it always did.
      mode: twoOfThem ? adv : null,
      kept,
      dropped,
      label: label || null,
      timestamp: Date.now(),
    });
    io.to(sessionCode).emit('dice_rolled', entry);
  });

  // ── Disconnect ────────────────────────────────────────────────────────────
  // ── Plugin event bus ───────────────────────────────────────────────────
  // Generic relay for plugin-to-plugin coordination between clients in the
  // same session. The backend never inspects the payload — plugins ship
  // arbitrary JSON. Used by the host's data-write wrapper to broadcast
  // KV changes so GM + player views stay in sync without each plugin
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

  // Sizes a ping may be sent at. Validated rather than relayed as given: this
  // string is echoed to every client in the session, and the views index a
  // lookup table with it.
  const PING_SIZE_IDS = new Set(['small', 'medium', 'large']);

  socket.on('dm_ping', ({ x, y, mapId, level, size }) => {
    if (socket.data.role !== 'dm') return;
    const sessionCode = socket.data.sessionCode;
    if (!sessionCode) return;
    // Which storey the GM was pointing at.
    //
    // The flat map shows one floor at a time, so a ping there needs no height —
    // but the 3D view stacks them, and a ping with nowhere to sit landed on the
    // ground whichever floor the GM meant. It travels so the 3D view can raise
    // it to the right storey; every client still receives the ping regardless
    // of the floor it is on, because "look here" is worth seeing even when
    // "here" is upstairs.
    const lvl = Number(level);
    io.to(sessionCode).emit('map_ping', {
      id: `ping-${socket.id}-${Date.now()}`,
      x, y, mapId,
      level: Number.isFinite(lvl) ? lvl : 0,
      // How big the GM wants it — a normal ping is a speck on a board hundreds
      // of squares across. Anything unrecognised falls back to the normal size
      // rather than reaching the clients as a value they can't look up.
      size: PING_SIZE_IDS.has(size) ? size : 'small',
    });
  });

  // Is this socket still in a session, as far as the server is concerned?
  //
  // Asked by clients when they come back from sleep. The answer distinguishes
  // the two failure modes that look identical on the device: a transport that
  // has quietly died (no reply at all, the client reconnects) and a live
  // connection whose session binding is gone because the server restarted
  // under it (inSession:false, the client re-joins). Without this a phone
  // could sit "connected" all evening while every roll it sent was dropped by
  // the `if (!sessionCode) return` guard every write handler starts with.
  socket.on('session_heartbeat', (_payload, ack) => {
    if (typeof ack !== 'function') return;
    ack({
      inSession: !!socket.data.sessionCode,
      sessionCode: socket.data.sessionCode || null,
      name: socket.data.name || null,
      role: socket.data.role || null,
      serverTime: Date.now(),
    });
  });

  socket.on('disconnect', () => {
    const sessionCode = socket.data.sessionCode;
    if (sessionCode) {
      if (sessionConnectionLog[sessionCode]) {
        for (const [, entry] of sessionConnectionLog[sessionCode]) {
          if (entry.socketId === socket.id) {
            entry.disconnectedAt = new Date().toISOString();
            break;
          }
        }
      }
      if (lobbyRoster[sessionCode]) {
        if (lobbyRoster[sessionCode].delete(socket.id)) {
          if (lobbyRoster[sessionCode].size === 0) delete lobbyRoster[sessionCode];
          else emitLobby(io, sessionCode);
        }
      }
      if (sessionUsers[sessionCode]) {
        sessionUsers[sessionCode].delete(socket.id);
        if (sessionUsers[sessionCode].size === 0) {
          delete sessionUsers[sessionCode];
        } else {
          io.to(sessionCode).emit('users_updated', {
            users: Array.from(sessionUsers[sessionCode].values()),
            connectionLog: getConnectionLog(sessionCode),
          });
        }
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, async () => {
  console.log(`VTT backend running on :${PORT}`);
  // Advertise via mDNS so player phones / iPads on the LAN can reach
  // the server via tabletopforge.local instead of the GM having to
  // dictate a numeric IP. Best-effort — see mdns.js for the failure
  // modes (Docker Desktop on Mac/Win drops multicast, etc.). The
  // advertised name shows up in /api/version so the GM panel can
  // render it alongside the LAN IP.
  mdns.startAdvertise(Number(PORT));
  try {
    await db.query(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS grid_color VARCHAR(50) DEFAULT 'rgba(0,0,0,0.35)'`);
    await db.query(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS grid_thickness FLOAT DEFAULT 0.7`);
    await db.query(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS token_name_font_size INTEGER DEFAULT 45`);
    // Default map for newly-spawned player tokens. NULL = fall back to the
    // session's current map_id (legacy behaviour). The GM Map tab picker
    // and the split-the-party plugin both read/write this column.
    await db.query(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS spawn_map_id INTEGER REFERENCES maps(id) ON DELETE SET NULL`);
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

    // Generic key/value settings table. Currently used to persist GM AI
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
    // Tracks what the race picker auto-applied (senses, spells,
    // resistances, languages) so a race-swap can revert just those
    // values without nuking anything the user added by hand. Shape:
    //   { race_id, sub_id, added: {senses, spells, resistances, languages, cantrips} }
    await db.query(`ALTER TABLE creatures ADD COLUMN IF NOT EXISTS race_state JSONB DEFAULT '{}'`);
    // Player background (SRD 2024 backgrounds: Acolyte, Criminal,
    // Sage, Soldier). `background` stores the canonical id; the
    // jsonb tracks every value the picker auto-applied (skills,
    // ability bumps, feat name, equipment items appended) so a
    // background swap reverts exactly those without touching the
    // player's own picks.
    await db.query(`ALTER TABLE creatures ADD COLUMN IF NOT EXISTS background VARCHAR(60) DEFAULT ''`);
    await db.query(`ALTER TABLE creatures ADD COLUMN IF NOT EXISTS background_state JSONB DEFAULT '{}'`);
    // CSV of tool / instrument / vehicle proficiencies. Edited
    // free-form on the character sheet and auto-populated by the
    // background picker.
    await db.query(`ALTER TABLE creatures ADD COLUMN IF NOT EXISTS tool_proficiencies TEXT DEFAULT ''`);
    await db.query(`ALTER TABLE creatures ADD COLUMN IF NOT EXISTS weapon_proficiencies TEXT DEFAULT ''`);
    // Records the class-level choices the player picked when they
    // took the class — Cleric's Divine Order, Fighter's Weapon
    // Mastery weapons, Rogue's Expertise skills, etc. Mirror of how
    // race_state / background_state work.
    await db.query(`ALTER TABLE creatures ADD COLUMN IF NOT EXISTS class_state JSONB DEFAULT '{}'`);
    // Per-resource usage counter — Bardic Inspiration / Ki / Sorcery
    // Points / Channel Divinity etc. Shape: { <resource_id>: { used: int } }
    // The resource catalog (totals, rest behaviour) is computed
    // client-side from the character's class + level; only the
    // mutable "used" count needs to round-trip.
    await db.query(`ALTER TABLE creatures ADD COLUMN IF NOT EXISTS resource_state JSONB DEFAULT '{}'`);
    // World Dungeon crawler sheet: setting-specific state (Crawler Skills, loot boxes, mana, levels).
    // A creature with a non-empty crawler_state belongs to the crawler sheet app and is hidden from
    // Tabletop Forge's own library and lobby.
    await db.query(`ALTER TABLE creatures ADD COLUMN IF NOT EXISTS crawler_state JSONB DEFAULT '{}'`);
    // A single Bardic Inspiration die granted by a Bard. Any character
    // can hold one at a time; "" / null when none. Format is just the
    // die label ("d6" / "d8" / "d10" / "d12") so the UI can render
    // and roll it without a lookup.
    await db.query(`ALTER TABLE creatures ADD COLUMN IF NOT EXISTS inspiration_die VARCHAR(8) DEFAULT ''`);
    // Multiclass rows. Each entry is one extra class on top of the
    // primary char_class/char_subclass/char_level. Shape:
    //   [{ id, class, subclass, level, class_state }]
    // The character's total level = char_level + sum(level).
    await db.query(`ALTER TABLE creatures ADD COLUMN IF NOT EXISTS multiclasses JSONB DEFAULT '[]'`);
    // Per-die-type spent count for the multi-pool hit dice system.
    // Shape: { "d10": 2, "d6": 1 }. Populated only on PCs — non-PC
    // monsters keep using the scalar hit_dice_used since their dice
    // come from the stat block, not class levels.
    await db.query(`ALTER TABLE creatures ADD COLUMN IF NOT EXISTS hit_dice_used_by_type JSONB DEFAULT '{}'`);
    // The hit dice themselves, as countable rows: [{ die: 'd10', qty: 4 }].
    // `hit_dice` stays the printed formula ("4d10 + 8") that stat blocks and
    // exports read; this is what the rest trackers tick, and what the editor
    // writes when the GM picks die types instead of typing a string. Empty
    // means "derive it" — class + multiclass levels for a player character,
    // the formula for a monster.
    await db.query(`ALTER TABLE creatures ADD COLUMN IF NOT EXISTS hit_dice_pool JSONB DEFAULT '[]'`);
    await db.query(`ALTER TABLE creatures ADD COLUMN IF NOT EXISTS hit_dice_bonus INTEGER DEFAULT 0`);

    // ── Custom GM-authored races + backgrounds ──
    // Free-form JSONB so the editor can grow without migrations. The
    // shape mirrors frontend/src/data/races.js / backgrounds.js so the
    // race / background pickers can merge static SRD content with these.
    await db.query(`
      CREATE TABLE IF NOT EXISTS custom_races (
        id UUID PRIMARY KEY,
        name VARCHAR(120) NOT NULL,
        edition VARCHAR(16) DEFAULT 'custom',
        parent_id UUID NULL REFERENCES custom_races(id) ON DELETE CASCADE,
        data JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMP DEFAULT now(),
        updated_at TIMESTAMP DEFAULT now()
      )
    `);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_custom_races_parent ON custom_races(parent_id)`);

    await db.query(`
      CREATE TABLE IF NOT EXISTS custom_backgrounds (
        id UUID PRIMARY KEY,
        name VARCHAR(120) NOT NULL,
        data JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMP DEFAULT now(),
        updated_at TIMESTAMP DEFAULT now()
      )
    `);
    // Full custom-class storage. The `data` JSONB carries everything
    // a class needs to slot into the existing CLASS_BUILD pipeline:
    //   {
    //     primary: { abilities: ['STR'], mode: 'all' },
    //     hitDie: 'd10',
    //     saves: ['STR','CON'],
    //     armor: ['Light','Medium'],
    //     weapons: ['Simple','Martial'],
    //     startingEquipment: { optionA: { items, gp }, optionB: { gp } },
    //     multiclass: { prereq: {...}, grants: {...} },
    //     subclasses: ['Path of X', 'Path of Y'],
    //     features:    [{ at_level, name, desc, subclass }],
    //     resources:   [{ id, label, total: '<formula>', rest: 'short'|'long', action: 'spend'|'grant', die }],
    //   }
    // The legacy custom-classes plugin (KV-backed) still works in
    // parallel — both feed the customClasses / customSubclasses /
    // customClassChoices registries through different code paths.
    await db.query(`
      CREATE TABLE IF NOT EXISTS custom_classes (
        id UUID PRIMARY KEY,
        name VARCHAR(120) NOT NULL,
        data JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMP DEFAULT now(),
        updated_at TIMESTAMP DEFAULT now()
      )
    `);
    await db.query(`ALTER TABLE session_tokens ADD COLUMN IF NOT EXISTS token_light_bright FLOAT DEFAULT 0`);
    await db.query(`ALTER TABLE session_tokens ADD COLUMN IF NOT EXISTS token_light_dim FLOAT DEFAULT 0`);
    await db.query(`ALTER TABLE session_tokens ADD COLUMN IF NOT EXISTS token_light_color VARCHAR(20) DEFAULT '#fbbf24'`);
    await db.query(`ALTER TABLE session_tokens ADD COLUMN IF NOT EXISTS token_light_flicker BOOLEAN NOT NULL DEFAULT TRUE`);
    // Creature-level defaults so a glowing monster glows the moment it's
    // placed. Tokens keep their own light columns — these only seed them, and
    // the GM can still change a single token afterwards.
    await db.query(`ALTER TABLE creatures ADD COLUMN IF NOT EXISTS token_light_bright FLOAT DEFAULT 0`);
    await db.query(`ALTER TABLE creatures ADD COLUMN IF NOT EXISTS token_light_dim FLOAT DEFAULT 0`);
    await db.query(`ALTER TABLE creatures ADD COLUMN IF NOT EXISTS token_light_color VARCHAR(20) DEFAULT '#fbbf24'`);
    await db.query(`ALTER TABLE creatures ADD COLUMN IF NOT EXISTS token_light_flicker BOOLEAN DEFAULT TRUE`);
    // A short GM-only note pinned after this creature in the initiative order:
    // "Burn", "Regenerates", "Lair action". Recurring end-of-turn effects are
    // the ones that get forgotten, and the tracker is where the GM is looking.
    await db.query(`ALTER TABLE creatures ADD COLUMN IF NOT EXISTS tracker_reminder VARCHAR(60) DEFAULT ''`);
    await db.query(`ALTER TABLE session_tokens ADD COLUMN IF NOT EXISTS tracker_reminder VARCHAR(60) DEFAULT ''`);
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
    await db.query(`ALTER TABLE light_sources ADD COLUMN IF NOT EXISTS flicker BOOLEAN NOT NULL DEFAULT TRUE`);
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
    await db.query(`ALTER TABLE doors ADD COLUMN IF NOT EXISTS label VARCHAR(100) DEFAULT ''`);
    // Fireplace-style doors can emit directional light out the "fire" side.
    await db.query(`ALTER TABLE doors ADD COLUMN IF NOT EXISTS light_radius FLOAT DEFAULT 0`);
    await db.query(`ALTER TABLE doors ADD COLUMN IF NOT EXISTS light_color VARCHAR(20) DEFAULT ''`);
    await db.query(`ALTER TABLE doors ADD COLUMN IF NOT EXISTS light_side INTEGER DEFAULT 1`);
    // Per-door sprite overlay that animates with the door open/close.
    // sprite_path → uploads-relative image; sprite_motion → 'swing' | 'slide'.
    await db.query(`ALTER TABLE doors ADD COLUMN IF NOT EXISTS sprite_path VARCHAR(255) DEFAULT NULL`);
    await db.query(`ALTER TABLE doors ADD COLUMN IF NOT EXISTS sprite_motion VARCHAR(12) DEFAULT 'swing'`);
    // Reusable door-sprite library — upload art once, assign to any door.
    await db.query(`
      CREATE TABLE IF NOT EXISTS door_sprites (
        id SERIAL PRIMARY KEY,
        name VARCHAR(120) NOT NULL DEFAULT 'Door',
        image_path VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
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
    // Height above the ground in feet. `is_flying` stays as the coarse
    // "is it airborne" flag other systems already key off (blips, ground
    // effects); elevation is how FAR up, which is what the map has to draw and
    // what 3D needs. Kept separate rather than derived so a GM can mark a
    // creature airborne without committing to a number.
    await db.query(`ALTER TABLE session_tokens ADD COLUMN IF NOT EXISTS elevation FLOAT DEFAULT 0`);
    await db.query(`ALTER TABLE session_tokens ADD COLUMN IF NOT EXISTS nickname VARCHAR(255)`);
    await db.query(`ALTER TABLE magical_darkness ADD COLUMN IF NOT EXISTS shape VARCHAR(20) DEFAULT 'circle'`);
    await db.query(`ALTER TABLE magical_darkness ADD COLUMN IF NOT EXISTS poly_points JSONB DEFAULT '[]'`);
    await db.query(`ALTER TABLE magical_darkness ADD COLUMN IF NOT EXISTS feather_amount FLOAT DEFAULT 0`);
    // How tall a zone stands, in feet. Only the 3D view has any use for it —
    // the flat map has no third axis — but it lives with the zone because it
    // is a property of the fog bank, not of a viewer.
    //
    // NULL means "not set": the 3D view then picks a height from the zone's
    // own size, which is what every zone drawn before this column existed
    // gets. A stored 0 would be a zone the GM had flattened on purpose.
    await db.query(`ALTER TABLE magical_darkness ADD COLUMN IF NOT EXISTS height_ft FLOAT`);
    // Which storey the zone stands on. Walls, doors, lights and tokens have
    // carried this for a while; zones never did, so a fog bank laid on a first
    // floor was a map-wide object that the 3D view could only draw at ground
    // level — it had nothing else to go on.
    //
    // Defaults to 0, which is where every zone drawn before this column
    // existed already was.
    await db.query(`ALTER TABLE magical_darkness ADD COLUMN IF NOT EXISTS level_index INTEGER DEFAULT 0`);
    // Item library — analog of spell_library for equipment + magic
    // items. Same shape: per-edition rows, idempotent imports keyed
    // by (name, edition), GM session toggles which edition the
    // players see via the same active_srd_edition session column the
    // spell library already reads from.
    await db.query(`
      CREATE TABLE IF NOT EXISTS item_library (
        id UUID PRIMARY KEY,
        name VARCHAR(120) NOT NULL,
        item_type VARCHAR(20) NOT NULL DEFAULT 'item',
        description TEXT DEFAULT '',
        source VARCHAR(200) DEFAULT '',
        edition VARCHAR(8) NOT NULL DEFAULT '2014',
        weight FLOAT DEFAULT 0,
        cost VARCHAR(40) DEFAULT '',
        damage_entries JSONB DEFAULT '[]',
        weapon_range VARCHAR(80) DEFAULT '',
        attack_stat VARCHAR(8) DEFAULT 'STR',
        attack_bonus_misc INTEGER DEFAULT 0,
        properties VARCHAR(400) DEFAULT '',
        mastery VARCHAR(40) DEFAULT '',
        ac_base INTEGER DEFAULT 0,
        armor_category VARCHAR(20) DEFAULT '',
        str_req INTEGER,
        stealth_disadvantage BOOLEAN DEFAULT false,
        ac_bonus INTEGER DEFAULT 0,
        attunement BOOLEAN DEFAULT false,
        attunement_req VARCHAR(200) DEFAULT '',
        rarity VARCHAR(20) DEFAULT '',
        created_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT item_library_name_edition_key UNIQUE (name, edition)
      )
    `);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_item_library_type    ON item_library(item_type)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_item_library_edition ON item_library(edition)`);

    // ── item_library's later columns ──────────────────────────────────────
    //
    // Below the CREATE above, deliberately. These two used to sit ~180 lines
    // earlier, which worked on every existing database (the table was already
    // there from an older release) and broke every NEW one: the whole migration
    // block shares one try/catch, so `ALTER TABLE item_library` against a table
    // that did not exist yet threw and skipped everything after it — taking
    // item_library itself, languages, map_fog_blocks and the plugin tables with
    // it. Invisible in Docker, where nobody creates a fresh database; fatal on a
    // first run of the desktop build, which is nothing but fresh databases.

    // Flat damage bonus on a weapon, separate from the attack bonus.
    //
    // A +1 weapon in 5e adds its bonus to BOTH the attack roll and the damage
    // roll. The sheet already had attack_bonus_misc, but damage was computed
    // from the ability modifier alone — so a magic weapon hit more often and
    // hurt exactly as much as a mundane one.
    await db.query(`ALTER TABLE item_library ADD COLUMN IF NOT EXISTS damage_bonus_misc INTEGER DEFAULT 0`);

    // The same field an inventory entry carries (see itemSecrets.js), kept on
    // the library row so a homebrew item with a hidden clause keeps that clause
    // when it is handed out. Without it the GM would retype the secret onto
    // every copy of the cursed dagger they ever placed.
    await db.query(`ALTER TABLE item_library ADD COLUMN IF NOT EXISTS gm_secret TEXT DEFAULT ''`);

    // ── Behavioural magic items ───────────────────────────────────────────
    //
    // Two kinds of item do something the sheet has to know about, rather than
    // only describing it in prose:
    //
    //   grants_spells    — a Bell of the Unseen Servant puts Unseen Servant on
    //                      the wielder's list while they hold it, with its own
    //                      once-per-dawn use. Shaped like the race and
    //                      background spell grants: [{ name, requires, uses,
    //                      recharge }], where `requires` is 'held' or 'attuned'.
    //   possession_form  — a Twinkle Doll names the creature whose stat block
    //                      the possessor wears. Read by the same transform
    //                      machinery Wild Shape uses.
    //
    // Both default empty, so every existing item behaves exactly as before.
    await db.query(`ALTER TABLE item_library ADD COLUMN IF NOT EXISTS grants_spells JSONB DEFAULT '[]'::jsonb`);
    await db.query(`ALTER TABLE item_library ADD COLUMN IF NOT EXISTS possession_form VARCHAR(120) DEFAULT ''`);

    // A shared pool of charges, for an item whose spells cost different
    // amounts out of one reservoir — a Staff of Defence spends one charge on
    // Mage Armor and two on Shield, which "N uses of a spell" cannot express.
    // { max, recharge, regain, volatile: { die, on } }.
    await db.query(`ALTER TABLE item_library ADD COLUMN IF NOT EXISTS charges JSONB`);



    // ── Magic pistols ────────────────────────────────────────────────────
    //
    // The library ships the mundane Pistol but no magical versions, and the
    // firearm rules give no guidance for enchanting one — so these follow the
    // ordinary magic-weapon pattern exactly: +N to attack rolls and damage
    // rolls, rarity by bonus (uncommon / rare / very rare), no attunement.
    // That is what a +1 Longsword is, applied to a 1d10 firearm.
    //
    // Stocked for both editions because the base Pistol exists in both, and a
    // 2024 table should not have to reach into the 2014 list for its loot.
    // Idempotent: seeded once per name+edition, so a restart cannot duplicate
    // them and a GM's edits to an existing row are never overwritten.
    for (const ed of ['2014', '2024']) {
      const base2024 = ed === '2024';
      for (const [bonus, rarity] of [[1, 'uncommon'], [2, 'rare'], [3, 'very rare']]) {
        const name = `Pistol, +${bonus}`;
        const exists = await db.query(
          'SELECT 1 FROM item_library WHERE name=$1 AND edition=$2',
          [name, ed]
        );
        if (exists.rows.length) continue;
        await db.query(
          `INSERT INTO item_library
             (id, name, item_type, description, source, edition, weight, cost,
              damage_entries, weapon_range, attack_stat, attack_bonus_misc,
              damage_bonus_misc, properties, rarity, attunement)
           VALUES (gen_random_uuid(), $1, 'weapon', $2, 'Homebrew', $3, 3, $4,
                   $5, '30/90 ft.', 'DEX', $6, $6, $7, $8, false)`,
          [
            name,
            `You have a +${bonus} bonus to attack and damage rolls made with this `
            + 'magic firearm.',
            ed,
            // Priced off the base Pistol at 250 gp, climbing with the bonus the
            // way the DMG's sale values for magic weapons do.
            ['', '1,250 gp', '5,000 gp', '20,000 gp'][bonus],
            JSON.stringify([{ damage: '1d10', damage_type: 'Piercing' }]),
            bonus,
            base2024 ? 'Ammunition (30/90 ft.), Loading' : 'AF, Loading',
            rarity,
          ]
        );
      }
    }
    // ── Gunslinger firearms ──────────────────────────────────────────────
    //
    // The weapon table from Matt Mercer's Gunslinger (1.3), stocked so a
    // player of that archetype can pick their gun out of the library instead
    // of typing one in by hand. Its reload and misfire scores are the
    // archetype's own rules, not the DMG's firearm block — see the Gunslinger
    // subclass in reference-local/.
    //
    // TWO OF THESE SHARE A NAME WITH SOMETHING ALREADY IN THE LIBRARY.
    //
    // The DMG prints a Pistol and a Musket with different numbers, and the
    // unique key here is (name, edition), so the Gunslinger's versions carry a
    // suffix rather than overwriting rows a GM may already be using. The other
    // five have the table to themselves.
    //
    // Both editions, for the reason the magic pistols above are: the archetype
    // is played at 2014 and 2024 tables alike, and a 2024 game should not have
    // to switch its library filter to arm its gunslinger.
    //
    // Idempotent per name+edition: a restart adds nothing, and an edit a GM
    // makes to one of these rows is never undone.
    const GUNSLINGER_FIREARMS = [
      { name: 'Palm Pistol (Gunslinger)', cost: '50 gp', weight: 1, damage: '1d8', type: 'Piercing',
        range: '40/160 ft.', props: 'Light, Reload 1, Misfire 1', ammo: { name: 'Palm Pistol Bullets (20)', cost: '2 gp' } },
      { name: 'Pistol (Gunslinger)', cost: '150 gp', weight: 3, damage: '1d10', type: 'Piercing',
        range: '60/240 ft.', props: 'Reload 4, Misfire 1', ammo: { name: 'Pistol Bullets (20)', cost: '4 gp' } },
      { name: 'Musket (Gunslinger)', cost: '300 gp', weight: 10, damage: '1d12', type: 'Piercing',
        range: '120/480 ft.', props: 'Two-Handed, Reload 1, Misfire 2', ammo: { name: 'Musket Balls (20)', cost: '5 gp' } },
      { name: 'Pepperbox', cost: '250 gp', weight: 5, damage: '1d10', type: 'Piercing',
        range: '80/320 ft.', props: 'Reload 6, Misfire 2', ammo: { name: 'Pepperbox Bullets (20)', cost: '4 gp' } },
      { name: 'Blunderbuss', cost: '300 gp', weight: 10, damage: '2d8', type: 'Piercing',
        range: '15/60 ft.', props: 'Reload 1, Misfire 2', ammo: { name: 'Blunderbuss Shot (5)', cost: '5 gp' } },
      { name: 'Bad News', cost: 'Crafted', weight: 25, damage: '2d12', type: 'Piercing',
        range: '200/800 ft.', props: 'Two-Handed, Reload 1, Misfire 3', ammo: { name: 'Bad News Rounds (5)', cost: '10 gp' } },
      { name: 'Hand Mortar', cost: 'Crafted', weight: 10, damage: '2d8', type: 'Fire',
        range: '30/60 ft.', props: 'Reload 1, Misfire 3, Explosive', ammo: { name: 'Hand Mortar Shell (1)', cost: '10 gp' } },
    ];
    const firearmBlurb = (g) => {
      const reload = /Reload (\d+)/.exec(g.props)?.[1];
      const misfire = /Misfire (\d+)/.exec(g.props)?.[1];
      const lines = [
        `A firearm from the Gunslinger's weapon table. Ammunition: ${g.ammo.name} at ${g.ammo.cost}.`,
        reload ? `Reload ${reload}. Fires ${reload} time${reload === '1' ? '' : 's'} before you spend one attack or one action reloading it, with a free hand.` : '',
        misfire ? `Misfire ${misfire}. An attack roll of ${misfire} or lower misses and jams the weapon: an action and a Tinker's Tools check (DC ${8 + Number(misfire)}) clears it, and a failure breaks it until it is mended out of combat for a quarter of its cost. Firing one without proficiency raises its misfire score by 1.` : '',
      ];
      if (/Explosive/.test(g.props)) {
        lines.push('Explosive. On a hit, each creature within 5 feet of the target makes a Dexterity saving throw (DC 8 + your proficiency bonus + your Dexterity modifier) or takes 1d8 Fire damage.');
      }
      if (g.cost === 'Crafted') {
        lines.push('Not sold: this one has to be built, with Tinker\'s Tools and your GM\'s say-so.');
      }
      return lines.filter(Boolean).join('\n\n');
    };
    for (const ed of ['2014', '2024']) {
      for (const g of GUNSLINGER_FIREARMS) {
        const exists = await db.query(
          'SELECT 1 FROM item_library WHERE name=$1 AND edition=$2', [g.name, ed]
        );
        if (!exists.rows.length) {
          await db.query(
            `INSERT INTO item_library
               (id, name, item_type, description, source, edition, weight, cost,
                damage_entries, weapon_range, attack_stat, properties)
             VALUES (gen_random_uuid(), $1, 'weapon', $2, 'Gunslinger 1.3', $3, $4, $5, $6, $7, 'DEX', $8)`,
            [g.name, firearmBlurb(g), ed, g.weight, g.cost,
             JSON.stringify([{ damage: g.damage, damage_type: g.type }]), g.range, g.props]
          );
        }
        // Its ammunition, as its own row: every firearm takes its own, and a
        // shop or a pack needs something to put the rounds in.
        const ammoExists = await db.query(
          'SELECT 1 FROM item_library WHERE name=$1 AND edition=$2', [g.ammo.name, ed]
        );
        if (!ammoExists.rows.length) {
          await db.query(
            `INSERT INTO item_library
               (id, name, item_type, description, source, edition, weight, cost)
             VALUES (gen_random_uuid(), $1, 'item', $2, 'Gunslinger 1.3', $3, 1, $4)`,
            [g.ammo.name, `Ammunition for the ${g.name.replace(' (Gunslinger)', '')}. Rare enough that it is usually crafted with Tinker's Tools at half cost rather than bought.`, ed, g.ammo.cost]
          );
        }
      }
    }

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
    await db.query(`ALTER TABLE creatures ADD COLUMN IF NOT EXISTS backstory TEXT DEFAULT ''`);
    await db.query(`ALTER TABLE maps ADD COLUMN IF NOT EXISTS floor_label VARCHAR(60) DEFAULT ''`);
    await db.query(`DROP TABLE IF EXISTS map_fog_blocks`);
    await db.query(`
      CREATE TABLE IF NOT EXISTS map_fog_blocks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        map_id INTEGER REFERENCES maps(id) ON DELETE CASCADE,
        label VARCHAR(100) DEFAULT '',
        points JSONB NOT NULL DEFAULT '[]',
        is_revealed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
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


    await db.query(`CREATE INDEX IF NOT EXISTS idx_item_library_rarity  ON item_library(rarity)`);
    // edition: tags each spell with the SRD it came from. Lets the
    // GM toggle which set of spells players see (2014 vs 2024 SRD).
    // Existing rows default to '2014' since the historical plugin/
    // import path only ever loaded the 2014 SRD set.
    await db.query(`ALTER TABLE spell_library ADD COLUMN IF NOT EXISTS edition VARCHAR(8) NOT NULL DEFAULT '2014'`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_spell_library_edition ON spell_library(edition)`);
    // Widen the freeform-string columns — the original sizes were
    // tuned against hand-entered spells. Open5e's SRD payloads have
    // longer casting_time strings ("1 reaction, which you take when
    // you see a creature within 60 feet of you casting a spell")
    // and material-component descriptions ("a tiny pearl worth at
    // least 100 gp and a piece of polymorph paper") that exceeded
    // the historical 80 / 200 char limits and broke the importer on
    // 5 spells (Counterspell / Hellish Rebuke / Clone / Imprisonment
    // / Simulacrum).
    await db.query(`ALTER TABLE spell_library ALTER COLUMN casting_time TYPE VARCHAR(200)`);
    await db.query(`ALTER TABLE spell_library ALTER COLUMN comp_m_text TYPE TEXT`);
    // Drop the old name-only UNIQUE in favour of (name, edition) so a
    // spell that appears in both SRDs (e.g. Fireball) can have a row
    // for each edition with edition-specific text. Wrapped in a try
    // because the constraint name varies by Postgres install history.
    try { await db.query(`ALTER TABLE spell_library DROP CONSTRAINT IF EXISTS spell_library_name_key`); } catch {}
    try {
      await db.query(`ALTER TABLE spell_library ADD CONSTRAINT spell_library_name_edition_key UNIQUE (name, edition)`);
    } catch (e) {
      // Constraint already exists from a prior run — fine.
      if (!String(e.message || '').includes('already exists')) throw e;
    }
    // Per-session "active SRD" filter the GM controls. 'both' shows
    // every edition; '2014' / '2024' show only that set. Players see
    // whatever the GM has selected.
    await db.query(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS active_srd_edition VARCHAR(8) NOT NULL DEFAULT 'both'`);

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

    // Patrols: tokens that walk their route on their own. The table and the
    // session-level pause flag; the runner starts after the migrations below, so
    // it can never query a table that does not exist yet.
    // GM accounts: one login, with the sessions it is paired to. Runs before
    // the rest so a session row can carry its owner from the first boot.
    await gmAccounts.migrate(db);

    // WHERE THE 5ETOOLS MIRROR IS, AS THE GM SET IT.
    //
    // Read once at boot and handed to the compendium, so a server that has
    // been pointed at a different mirror comes back up pointed at the same
    // one. Saving a new address through /api/settings applies it immediately;
    // this is only for the restart after.
    try {
      const saved = (await db.query(
        "SELECT value FROM app_settings WHERE key='compendium_url'"
      )).rows[0]?.value;
      const url = typeof saved === 'string' ? saved : saved?.url;
      if (url) {
        require('./compendium').setBaseUrl(url);
        console.log('Compendium mirror:', require('./compendium').baseUrl(), '(from settings)');
      }
    } catch (err) {
      console.warn('Could not read the saved compendium URL:', err.message);
    }
    await patrols.migrate(db);
    await detection.migrate(db);
    await movement.migrate(db);
    await shops.migrate(db);
    // THE TREASURE CHEST IS SESSION STATE, not one browser's.
    //
    // It lived in localStorage keyed by session id, which meant the chest the
    // GM filled on their laptop did not exist on their tablet — two screens,
    // two different piles, and no way to hand out from the one you were
    // holding. Moving it here makes it the session's.
    await db.query(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS treasure_chest JSONB DEFAULT '[]'::jsonb`)
      .catch((err) => console.error('treasure_chest migration:', err.message));
    // One clock for the table. Set when a sneak sequence starts; every round
    // after that is derived from it, so no client can drift.
    await db.query(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS sneak_round_at TIMESTAMPTZ`)
      .catch((err) => console.error('[move] sneak_round_at migration:', err.message));

    // ── Second pass: columns whose table is created later than they are ─────
    //
    // A dozen columns are added by `ALTER TABLE` chains at the top of this file,
    // which run at module load — BEFORE the CREATE TABLE statements above have
    // run. On an existing database that is invisible, because the tables have
    // been there since an older release. On a database created from scratch every
    // one of those ALTERs fails, and each chain ends in `.catch()` that logs and
    // moves on, so the columns are lost permanently and nothing says so again.
    //
    // Nobody noticed for the obvious reason: nobody creates a fresh Docker
    // database. The desktop build is nothing but fresh databases, and the missing
    // columns are not cosmetic — level_index is multi-storey, portal_kind is door
    // types, tile_id is imported tiles, kind and loot_table_id are the loot
    // tables. A first run would have quietly shipped a VTT with holes in it.
    //
    // So they are re-applied here, where every table exists. IF NOT EXISTS makes
    // this a no-op on any database that already has them, which is every
    // database that has ever run this server before now. The backfills in the
    // original chains are NOT repeated: they exist to migrate old rows, and a
    // fresh database has none.
    const LATE_COLUMNS = [
      `ALTER TABLE rollable_tables ADD COLUMN IF NOT EXISTS kind VARCHAR(20) NOT NULL DEFAULT 'general'`,
      `ALTER TABLE creatures ADD COLUMN IF NOT EXISTS loot_table_id INTEGER REFERENCES rollable_tables(id) ON DELETE SET NULL`,
      `ALTER TABLE backdrops ADD COLUMN IF NOT EXISTS source_image_path VARCHAR(500)`,
      `ALTER TABLE walls ADD COLUMN IF NOT EXISTS ship_id INTEGER REFERENCES map_ships(id) ON DELETE CASCADE`,
      `ALTER TABLE doors ADD COLUMN IF NOT EXISTS ship_id INTEGER REFERENCES map_ships(id) ON DELETE CASCADE`,
      `ALTER TABLE walls ADD COLUMN IF NOT EXISTS level_index INTEGER NOT NULL DEFAULT 0`,
      `ALTER TABLE doors ADD COLUMN IF NOT EXISTS level_index INTEGER NOT NULL DEFAULT 0`,
      `ALTER TABLE light_sources ADD COLUMN IF NOT EXISTS level_index INTEGER NOT NULL DEFAULT 0`,
      `ALTER TABLE doors ADD COLUMN IF NOT EXISTS portal_kind VARCHAR(20) NOT NULL DEFAULT 'door'`,
      `ALTER TABLE walls ADD COLUMN IF NOT EXISTS terrain_id INTEGER REFERENCES map_terrain(id) ON DELETE CASCADE`,
      `ALTER TABLE walls ADD COLUMN IF NOT EXISTS tile_id INTEGER REFERENCES map_tiles(id) ON DELETE CASCADE`,
      `ALTER TABLE doors ADD COLUMN IF NOT EXISTS tile_id INTEGER REFERENCES map_tiles(id) ON DELETE CASCADE`,
      `ALTER TABLE walls ADD COLUMN IF NOT EXISTS height_ft FLOAT`,
      `ALTER TABLE doors ADD COLUMN IF NOT EXISTS height_ft FLOAT`,
      `CREATE INDEX IF NOT EXISTS idx_walls_ship ON walls(ship_id)`,
      `CREATE INDEX IF NOT EXISTS idx_doors_ship ON doors(ship_id)`,
      `CREATE INDEX IF NOT EXISTS idx_walls_tile ON walls(tile_id)`,
      `CREATE INDEX IF NOT EXISTS idx_doors_tile ON doors(tile_id)`,
    ];
    const added = [];
    for (const sql of LATE_COLUMNS) {
      // One at a time: a failure here must not take the rest with it, which is
      // the mistake being corrected in the first place.
      try { await db.query(sql); }
      catch (e) { added.push(`${sql.slice(0, 60)}… → ${e.message}`); }
    }
    if (added.length) {
      console.warn(`[migrations] ${added.length} late column(s) could not be applied:`);
      for (const a of added) console.warn('   · ' + a);
    }

    // Seed the SRD 5.1 (2014) + SRD 5.2 (2024) spell catalogues on
    // first boot. The importers are idempotent (UPSERT on
    // (name, edition)) so re-runs are safe, but to keep startup
    // quiet we only fire when the matching edition has 0 rows.
    // Open5e network reach is required for first-boot — if it
    // can't be reached we log + carry on; the GM can re-run the
    // CLI scripts later.
    try {
      const counts = await db.query(
        `SELECT edition, COUNT(*)::int AS n
           FROM spell_library
          WHERE edition IN ('2014', '2024')
          GROUP BY edition`
      );
      const by = Object.fromEntries(counts.rows.map((r) => [r.edition, r.n]));
      if (!by['2014']) {
        console.log('SRD 2014 spells missing — importing from Open5e v1…');
        try { await require('./import_srd_spells').main(); }
        catch (e) { console.warn('SRD 2014 seed failed:', e.message); }
      }
      if (!by['2024']) {
        console.log('SRD 2024 spells missing — importing from Open5e v2…');
        try { await require('./import_srd_spells_2024').main(); }
        catch (e) { console.warn('SRD 2024 seed failed:', e.message); }
      }
    } catch (e) { console.warn('SRD seed check failed:', e.message); }

    patrols.startRunner({ db, io, hasWatcher: mapHasWatcher, onMoved: sneakWatch });
    console.log('[patrols] runner started');
    // The sweep underneath detection exists only so suspicion can time out;
    // every real evaluation is asked for by whatever moved. See detection.js.
    detection.startRunner({ db, io, hasWatcher: mapHasWatcher });
    console.log('[sneak] detection runner started');
  } catch (err) {
    console.warn('Migration warning:', err.message);
  }
});
