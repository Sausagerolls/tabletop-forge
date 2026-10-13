const express = require('express');
const { UPLOADS_DIR, ensureDir } = require('../paths');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { imageSize } = require('image-size');
const db = require('../db');
const { renderSystemSvg, systemGeometry } = require('../systemMap');
const { terrainForPlayer } = require('../terrainVisibility');

const router = express.Router();

const storage = multer.diskStorage({
  destination: path.join(UPLOADS_DIR, 'maps'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  },
});

// Sky panoramas are a different filter to battlemaps: .hdr is the format
// people actually have for this (Poly Haven and friends), and it is NOT an
// image type the map uploader accepts — dropping one on the map uploader
// silently discarded it, which is exactly what it looked like from outside.
const skyUpload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 }, // HDRs are big
  fileFilter: (req, file, cb) => {
    const allowed = ['.hdr', '.jpg', '.jpeg', '.png', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  },
});

// POST /api/maps/:id/sky  — attach a panorama to this map
router.post('/:id/sky', skyUpload.single('sky'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Need a .hdr, .jpg, .png or .webp file' });
    }
    const rel = `maps/${req.file.filename}`;
    const result = await db.query(
      'UPDATE maps SET sky_image_path=$1 WHERE id=$2 RETURNING *',
      [rel, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/maps/:id/sky-preset  — { preset: 'night' | ... | null }
//
// A built-in sky, for maps with nothing uploaded. Only an id is stored: the
// client draws the panorama, so there is no file to serve or clean up.
//
// The id list is duplicated here rather than imported from the frontend — the
// server has no business loading a React-side module, and an unknown id must be
// rejected here rather than silently stored and quietly ignored later.
const SKY_PRESETS = ['night', 'day', 'dusk', 'overcast', 'wildspace', 'cavern'];

router.put('/:id/sky-preset', async (req, res) => {
  try {
    const raw = req.body?.preset;
    const preset = raw === null || raw === undefined || raw === '' ? null : String(raw);
    if (preset !== null && !SKY_PRESETS.includes(preset)) {
      return res.status(400).json({ error: `Unknown sky preset "${preset}"` });
    }
    const result = await db.query(
      'UPDATE maps SET sky_preset=$1 WHERE id=$2 RETURNING *',
      [preset, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/maps/:id/sky — back to a flat board
router.delete('/:id/sky', async (req, res) => {
  try {
    const prev = await db.query('SELECT sky_image_path FROM maps WHERE id=$1', [req.params.id]);
    const result = await db.query(
      'UPDATE maps SET sky_image_path=NULL WHERE id=$1 RETURNING *',
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    // Best-effort cleanup; a missing file is not an error worth failing on.
    const old = prev.rows[0]?.sky_image_path;
    if (old) {
      fs.unlink(path.join(UPLOADS_DIR, old), () => {});
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/maps?session_id=X
router.get('/', async (req, res) => {
  try {
    const { session_id } = req.query;
    if (!session_id) return res.json([]);
    const result = await db.query(
      'SELECT * FROM maps WHERE session_id=$1 ORDER BY created_at DESC',
      [session_id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/maps/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM maps WHERE id=$1', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/maps/:id/state?session_id=Y
//   Full per-map slice: walls, doors, lights, magical darkness, dm markers,
//   and tokens. Used by the player view when the split-the-party plugin
//   has overridden which map this player should be looking at — instead
//   of the session's current map_id.
//
//   `session_id` is required so we can scope tokens (which live under
//   a session) to the right campaign. Walls/doors/lights/etc. are
//   per-map-not-per-session in the schema, so they need no extra filter.
router.get('/:id/state', async (req, res) => {
  try {
    const mapId = req.params.id;
    const { session_id } = req.query;
    if (!session_id) return res.status(400).json({ error: 'session_id is required' });

    const mapRes = await db.query('SELECT * FROM maps WHERE id=$1', [mapId]);
    if (!mapRes.rows.length) return res.status(404).json({ error: 'Map not found' });
    const map = mapRes.rows[0];
    // Fog of war is per map, falling back to the session flag for maps the GM
    // has never toggled. Resolved here so the caller doesn't have to.
    const sessFow = await db.query('SELECT fow_enabled FROM sessions WHERE id=$1', [session_id]);
    const effectiveFow = map.fow_enabled ?? (sessFow.rows[0]?.fow_enabled || false);

    const [wallsRes, doorsRes, lightsRes, darknessRes, markersRes, tokensRes, spawnPointsRes, portalsRes, terrainRes, shipsRes] = await Promise.all([
      db.query('SELECT * FROM walls WHERE map_id=$1 ORDER BY created_at', [mapId]),
      db.query('SELECT * FROM doors WHERE map_id=$1 ORDER BY created_at', [mapId]),
      db.query('SELECT * FROM light_sources WHERE map_id=$1 ORDER BY created_at', [mapId]),
      db.query('SELECT * FROM magical_darkness WHERE session_id=$1 AND map_id=$2 ORDER BY created_at', [session_id, mapId]),
      db.query('SELECT * FROM dm_markers WHERE session_id=$1 AND map_id=$2 ORDER BY created_at', [session_id, mapId]),
      db.query(
        `SELECT st.*, c.image_path AS creature_image, c.dexterity AS creature_dex, COALESCE(c.speed_walk, 30) AS creature_speed, COALESCE(c.speed_fly, 0) AS creature_speed_fly,
                -- The other three speeds ride along too. The socket layer's
                -- copy of this query already carried them, so a client that
                -- joined saw a creature's swim speed and the same client after
                -- a MAP SWITCH did not — which is exactly when the Sneak
                -- panel's speed picker would start quoting the wrong figure.
                COALESCE(c.speed_swim, 0) AS creature_speed_swim,
                COALESCE(c.speed_climb, 0) AS creature_speed_climb,
                COALESCE(c.speed_burrow, 0) AS creature_speed_burrow,
                COALESCE(c.initiative_bonus, 0) AS initiative_bonus
           FROM session_tokens st
           LEFT JOIN creatures c ON st.creature_id = c.id
          WHERE st.session_id = $1 AND st.map_id = $2
          ORDER BY st.z_index, st.id`,
        [session_id, mapId]
      ),
      db.query('SELECT * FROM map_spawn_points WHERE map_id=$1 ORDER BY created_at', [mapId]),
      db.query('SELECT * FROM map_portals WHERE map_id=$1 ORDER BY created_at', [mapId]),
      // Terrain, with the same joined columns the socket layer sends — the
      // renderer reads lib_image_path to find the art, and the visibility
      // flags decide what a player is allowed to see.
      db.query(
        `SELECT mt.*, tl.image_path AS lib_image_path, tl.name AS lib_name, tl.is_marker,
                tl.three_d_shape AS lib_three_d_shape,
                tl.model_path AS lib_model_path, tl.model_scale AS lib_model_scale,
                tl.cloud_form AS lib_cloud_form,
                tl.source_image_path AS lib_source_image_path,
                tl.blocks_vision, tl.blocks_light, tl.blocks_movement,
                tl.hide_until_revealed, tl.custom_walls
           FROM map_terrain mt
           LEFT JOIN terrain_library tl ON mt.library_id = tl.id
          WHERE mt.map_id=$1
          ORDER BY mt.z_index, mt.id`,
        [mapId]
      ),
      // Ships carry their decks so the renderer can draw the active level and
      // project aboard tokens without a second round trip.
      db.query(
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
      ),
    ]);

    // The map's storeys. Empty for an ordinary single-floor map, which the
    // clients read as "one level".
    const levelsRes = await db.query(
      'SELECT * FROM map_levels WHERE map_id=$1 ORDER BY level_index',
      [mapId]
    );

    res.json({
      map,
      levels: levelsRes.rows,
      // Laid tiles travel with the map state: after the board is shifted to
      // make room, this is how clients pick up their new positions.
      tiles: (await db.query('SELECT * FROM map_tiles WHERE map_id=$1 ORDER BY id', [mapId])).rows,
      walls: wallsRes.rows,
      doors: doorsRes.rows,
      lights: lightsRes.rows,
      magicalDarkness: darknessRes.rows,
      dmMarkers: markersRes.rows,
      tokens: tokensRes.rows,
      spawnPoints: spawnPointsRes.rows,
      // Hidden portals are stripped unless the caller says it's the GM. This
      // mirrors the socket-side filter so a player's client never holds a
      // secret portal; it is not an auth boundary (this route has none — see
      // dmMarkers above), just the same default as every other channel.
      portals: String(req.query.role || '') === 'dm'
        ? portalsRes.rows
        : portalsRes.rows.filter(p => !p.hidden),
      // Same GM/player split as portals above: hidden pieces go to the GM
      // only. Without this the route returned no terrain at all, so a player
      // rendering an override map (their token is on a different board from
      // the session's) fell back to the SESSION map's terrain — which is how
      // a star system's planets turned up on a dockside map.
      terrain: String(req.query.role || '') === 'dm'
        ? terrainRes.rows
        : terrainForPlayer(terrainRes.rows),
      ships: shipsRes.rows,
      spawnPoint: { col: map.spawn_col ?? 0, row: map.spawn_row ?? 0, radius: map.spawn_radius ?? 0 },
      fowEnabled: effectiveFow,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/maps — upload a map
router.post('/', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
    const { name, grid_size, session_id, floor_label } = req.body;
    const imagePath = `maps/${req.file.filename}`;
    const filePath = req.file.path;

    // Detect natural image dimensions. The package exports `imageSize`
    // (sync, takes a Buffer/Uint8Array); the older `imageSizeFromFile`
    // export was removed. Read the file, parse, fall back to defaults.
    let imgWidth = 2000, imgHeight = 1500;
    try {
      const buf = fs.readFileSync(filePath);
      const dims = imageSize(buf);
      if (dims && dims.width && dims.height) {
        imgWidth = dims.width;
        imgHeight = dims.height;
      }
    } catch (sizeErr) {
      console.warn('Could not detect image size:', sizeErr.message);
    }

    const result = await db.query(
      'INSERT INTO maps (session_id, name, image_path, width, height, grid_size, floor_label) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [session_id || null, name || req.file.originalname, imagePath, imgWidth, imgHeight, parseInt(grid_size) || 50, floor_label || '']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/maps/wildspace — create a grid-defined map with a fixed backdrop.
//
// Unlike an ordinary map, the uploaded image is NOT the play surface: it is a
// distant starscape pinned to the viewport behind the stage. The grid alone
// defines the play area, sized in squares rather than pixels, so a 1000ft
// encounter costs one screen-sized image instead of a 10,000px one.
//
// width/height are still written (cols/rows * grid_size) because the whole
// downstream stack — LOS bounds, fog fill, fit-to-map — reads map pixel
// extents. Deriving them here keeps every one of those callers unchanged.
const MAX_SQUARES = 200; // 200 * 5ft = 1000ft per side

router.post('/wildspace', upload.single('image'), async (req, res) => {
  try {
    const { name, grid_size, session_id, grid_cols, grid_rows, floor_label } = req.body;
    if (!req.file) return res.status(400).json({ error: 'No backdrop image uploaded' });

    const gridSize = parseInt(grid_size) || 50;
    const cols = Math.min(MAX_SQUARES, Math.max(1, parseInt(grid_cols) || 0));
    const rows = Math.min(MAX_SQUARES, Math.max(1, parseInt(grid_rows) || 0));
    if (!cols || !rows) return res.status(400).json({ error: 'grid_cols and grid_rows are required' });

    const result = await db.query(
      `INSERT INTO maps (session_id, name, image_path, width, height, grid_size,
                         floor_label, map_type, grid_cols, grid_rows)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'wildspace',$8,$9) RETURNING *`,
      [
        session_id || null,
        name || req.file.originalname,
        `maps/${req.file.filename}`,
        cols * gridSize,
        rows * gridSize,
        gridSize,
        floor_label || '',
        cols,
        rows,
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/maps/system — generate a star-system map.
//
// A hexcrawl across a system: the art is a star (or several) and a set of
// orbital rings, and the GM places planets as tokens on the rings. Nothing
// about the planets is baked into the image, which is what makes it usable —
// a generated planet in the wrong place would be permanent.
//
// The SVG is written into uploads/maps like any other map image, so every
// downstream consumer (fit-to-map, LOS bounds, the image server) treats it as
// an ordinary map and needs no special case.
const MAX_SYSTEM_PX = 6000;

router.post('/system', async (req, res) => {
  try {
    const {
      name, session_id, grid_size, grid_cols, grid_rows,
      stars, rings, grid_type, seed,
    } = req.body;

    const gridSize = parseInt(grid_size) || 50;
    const cols = Math.min(200, Math.max(4, parseInt(grid_cols) || 0));
    const rows = Math.min(200, Math.max(4, parseInt(grid_rows) || 0));
    if (!cols || !rows) return res.status(400).json({ error: 'grid_cols and grid_rows are required' });

    const width = Math.min(MAX_SYSTEM_PX, cols * gridSize);
    const height = Math.min(MAX_SYSTEM_PX, rows * gridSize);

    const starCount = parseInt(stars) || 1;
    const ringCount = parseInt(rings) || 4;
    // The same numbers the art is drawn from, kept with the map so the 3D view
    // can raise real spheres and rings on top of them.
    const geom = systemGeometry({ width, height, stars: starCount, rings: ringCount });
    const svg = renderSystemSvg({
      width,
      height,
      stars: starCount,
      rings: ringCount,
      // A fresh seed per generation unless one is pinned, so pressing the
      // button twice gives two different skies rather than the same one.
      seed: parseInt(seed) || Math.floor(Math.random() * 1e9),
    });

    const dir = path.join(UPLOADS_DIR, 'maps');
    fs.mkdirSync(dir, { recursive: true });
    const filename = `${uuidv4()}.svg`;
    fs.writeFileSync(path.join(dir, filename), svg, 'utf8');

    const result = await db.query(
      `INSERT INTO maps (session_id, name, image_path, width, height, grid_size,
                         map_type, grid_type, grid_cols, grid_rows, system_data)
       VALUES ($1,$2,$3,$4,$5,$6,'image',$7,$8,$9,$10) RETURNING *`,
      [
        session_id || null,
        name || 'Star System',
        `maps/${filename}`,
        width,
        height,
        gridSize,
        grid_type === 'square' ? 'square' : 'hex',
        cols,
        rows,
        JSON.stringify(geom),
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/maps/tiles — a blank lattice for a tile map.
//
// Nothing is drawn on it: a tile map starts as unexplored dark and gains floor
// only as the GM lays cards. The "image" is therefore a flat dark field the
// exact size of the lattice, generated here for two reasons — maps.image_path
// is NOT NULL and every downstream reader (the flat map, the 3D floor, the
// thumbnail) expects a real file, and a solid ground behind the tiles is what
// makes an unplaced square read as "not explored yet" rather than as a hole.
router.post('/tiles', async (req, res) => {
  try {
    const { session_id, name, grid_size, grid_cols, grid_rows, floor_label } = req.body || {};
    const gridSize = parseInt(grid_size, 10) || 50;
    const cols = Math.min(MAX_SQUARES, Math.max(4, parseInt(grid_cols, 10) || 40));
    const rows = Math.min(MAX_SQUARES, Math.max(4, parseInt(grid_rows, 10) || 40));
    const width = cols * gridSize;
    const height = rows * gridSize;

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" `
      + `viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#0d0f14"/></svg>`;

    const dir = path.join(UPLOADS_DIR, 'maps');
    fs.mkdirSync(dir, { recursive: true });
    const filename = `${uuidv4()}.svg`;
    fs.writeFileSync(path.join(dir, filename), svg, 'utf8');

    const result = await db.query(
      `INSERT INTO maps (session_id, name, image_path, width, height, grid_size,
                         floor_label, map_type, grid_cols, grid_rows)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'tiles',$8,$9) RETURNING *`,
      [
        session_id || null,
        (name || 'Tile Map').slice(0, 255),
        `maps/${filename}`,
        width,
        height,
        gridSize,
        floor_label || '',
        cols,
        rows,
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/maps/:id
router.patch('/:id', async (req, res) => {
  try {
    const {
      name, grid_size, floor_label, grid_cols, grid_rows,
      grid_type, grid_scale, grid_unit, grid_scale_visible,
    } = req.body;
    // Only two lattices exist; anything else is dropped rather than stored, so
    // a bad value can't reach the renderer and blank the grid.
    const gridType = grid_type === 'hex' || grid_type === 'square' ? grid_type : null;
    // Scale key. The unit is free text (a hex can be "10 days travel"), so it's
    // only length-capped — the column is VARCHAR(24) and an over-long value
    // would throw rather than save. The amount must be a positive finite
    // number; "1 cell = 0" or a NaN would render a nonsense key.
    const gridScale = Number.isFinite(Number(grid_scale)) && Number(grid_scale) > 0
      ? Number(grid_scale) : null;
    const gridUnit = typeof grid_unit === 'string' ? grid_unit.trim().slice(0, 24) : null;
    const gridScaleVisible = typeof grid_scale_visible === 'boolean' ? grid_scale_visible : null;
    const result = await db.query(
      `UPDATE maps SET name=COALESCE($1,name), grid_size=COALESCE($2,grid_size),
                       floor_label=COALESCE($3,floor_label), grid_type=COALESCE($4,grid_type),
                       grid_scale=COALESCE($5,grid_scale), grid_unit=COALESCE($6,grid_unit),
                       grid_scale_visible=COALESCE($7,grid_scale_visible)
         WHERE id=$8 RETURNING *`,
      [name, grid_size, floor_label, gridType, gridScale, gridUnit, gridScaleVisible, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });

    // Resizing a wildspace map means changing its square count, not its art.
    // width/height are derived, so they must be rewritten alongside — as must
    // they when grid_size alone changes, since the pixel extent is cols*size.
    const map = result.rows[0];
    if (map.map_type === 'wildspace') {
      const cols = Math.min(MAX_SQUARES, Math.max(1, parseInt(grid_cols) || map.grid_cols || 1));
      const rows = Math.min(MAX_SQUARES, Math.max(1, parseInt(grid_rows) || map.grid_rows || 1));
      const resized = await db.query(
        'UPDATE maps SET grid_cols=$1, grid_rows=$2, width=$3, height=$4 WHERE id=$5 RETURNING *',
        [cols, rows, cols * map.grid_size, rows * map.grid_size, map.id]
      );
      return res.json(resized.rows[0]);
    }
    res.json(map);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/maps/:id/image — swap the artwork under an existing map.
//
// Everything anchored to the map survives: walls, doors, lights, terrain,
// portals, spawn points and the tokens standing on it. That is the whole
// point — a day/night or before/after version of the same room drops straight
// in without rebuilding the LOS.
//
// The map keeps its ORIGINAL pixel extent even when the new art is a different
// size. Every wall and token position on this map is stored in that pixel
// space, so adopting the new image's dimensions would slide the entire map's
// geometry off the art. A differently-sized image is reported back so the
// caller can say so; it renders scaled to the existing extent.
router.put('/:id/image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
    const cur = await db.query('SELECT * FROM maps WHERE id=$1', [req.params.id]);
    if (!cur.rows.length) return res.status(404).json({ error: 'Map not found' });
    const map = cur.rows[0];
    const oldPath = map.image_path;
    const newPath = `maps/${req.file.filename}`;

    let newW = null, newH = null;
    try {
      const dims = imageSize(fs.readFileSync(req.file.path));
      if (dims && dims.width && dims.height) { newW = dims.width; newH = dims.height; }
    } catch (sizeErr) {
      console.warn('Could not detect swapped image size:', sizeErr.message);
    }

    const updated = await db.query(
      'UPDATE maps SET image_path=$1 WHERE id=$2 RETURNING *',
      [newPath, req.params.id]
    );

    // The old file goes only after the row points at the new one, so a failed
    // update can't leave the map pointing at a deleted image.
    if (oldPath && oldPath !== newPath) {
      fs.unlink(path.join(UPLOADS_DIR, oldPath), (err) => {
        if (err) console.warn('Could not delete replaced map file:', oldPath, err.message);
      });
    }

    res.json({
      map: updated.rows[0],
      sizeChanged: newW != null && (newW !== map.width || newH !== map.height),
      naturalWidth: newW,
      naturalHeight: newH,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/maps/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await db.query('SELECT image_path FROM maps WHERE id=$1', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    const imagePath = result.rows[0].image_path;
    await db.query('DELETE FROM maps WHERE id=$1', [req.params.id]);
    // Delete file from disk (non-fatal if missing)
    const filePath = path.join(UPLOADS_DIR, imagePath);
    fs.unlink(filePath, (err) => {
      if (err) console.warn('Could not delete map file:', filePath, err.message);
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Levels ───────────────────────────────────────────────────────────────────
//
// Managing the storeys of a map after import: renaming them, changing a storey
// height, reordering the stack, and removing one.
//
// Reordering is the one with teeth. A level's index is not just a label — the
// walls, doors, lights and tokens on that storey all carry it — so moving a
// floor has to carry its contents with it or the building comes apart. Every
// one of those tables is renumbered in the same transaction, in two phases,
// because (map_id, level_index) is unique and a direct swap would collide
// with itself halfway through.
const LEVEL_TABLES = ['walls', 'doors', 'light_sources', 'session_tokens'];

router.patch('/:mapId/levels/:levelIndex', express.json(), async (req, res) => {
  try {
    const fields = [];
    const values = [];
    const push = (k, v) => { values.push(v); fields.push(`${k}=$${values.length}`); };
    if (req.body.name !== undefined) push('name', String(req.body.name).slice(0, 80));
    if (req.body.height_ft !== undefined) {
      const h = Number(req.body.height_ft);
      push('height_ft', Number.isFinite(h) && h > 0 ? Math.min(200, h) : 10);
    }
    // Stairs, ladders and hatches. Same shape as ship_decks.transitions, with
    // to_level where a deck has to_deck — one idea, not two.
    //
    // Coordinates are in MAP grid units rather than anything local: every
    // storey of a building shares the map's coordinate space, which is what
    // makes a staircase usually land at the same spot on both floors.
    if (req.body.transitions !== undefined) {
      const list = Array.isArray(req.body.transitions) ? req.body.transitions : [];
      const KINDS = new Set(['stairs', 'ladder', 'hatch']);
      const clean = list.slice(0, 200).map((t) => ({
        col: Number(t.col) || 0,
        row: Number(t.row) || 0,
        w: Number(t.w) > 0 ? Number(t.w) : 1,
        h: Number(t.h) > 0 ? Number(t.h) : 1,
        kind: KINDS.has(String(t.kind)) ? String(t.kind) : 'stairs',
        to_col: Number(t.to_col) || 0,
        to_row: Number(t.to_row) || 0,
        to_level: Math.max(0, Math.trunc(Number(t.to_level) || 0)),
      }));
      push('transitions', JSON.stringify(clean));
    }
    if (!fields.length) return res.status(400).json({ error: 'No fields to update' });
    values.push(req.params.mapId, req.params.levelIndex);
    const r = await db.query(
      `UPDATE map_levels SET ${fields.join(', ')}
        WHERE map_id=$${values.length - 1} AND level_index=$${values.length}
      RETURNING *`,
      values
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Level not found' });
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/maps/:mapId/levels/reorder  { order: [2, 0, 1] }
// `order` lists the CURRENT level indices in their new ground-up order.
router.post('/:mapId/levels/reorder', express.json(), async (req, res) => {
  const mapId = Number(req.params.mapId);
  const order = Array.isArray(req.body.order) ? req.body.order.map(Number) : [];
  const client = await db.pool.connect();
  try {
    const existing = (await client.query(
      'SELECT level_index FROM map_levels WHERE map_id=$1 ORDER BY level_index', [mapId]
    )).rows.map((r) => r.level_index);
    // Must be a permutation of exactly what is there — anything else would
    // leave storeys stranded on indices nothing points at.
    const sameSet = order.length === existing.length
      && new Set(order).size === order.length
      && order.every((n) => existing.includes(n));
    if (!sameSet) return res.status(400).json({ error: 'order must be a permutation of the existing levels' });

    await client.query('BEGIN');
    // Phase 1: park everything in negative space, which no real index uses, so
    // phase 2 can assign final numbers without ever colliding.
    const park = `level_index = -1 - level_index`;
    await client.query(`UPDATE map_levels SET ${park} WHERE map_id=$1`, [mapId]);
    for (const t of LEVEL_TABLES) {
      await client.query(`UPDATE ${t} SET ${park} WHERE map_id=$1`, [mapId]);
    }
    // Phase 2: old index -> its position in the new order.
    for (let newIdx = 0; newIdx < order.length; newIdx++) {
      const parked = -1 - order[newIdx];
      await client.query(
        'UPDATE map_levels SET level_index=$1 WHERE map_id=$2 AND level_index=$3',
        [newIdx, mapId, parked]
      );
      for (const t of LEVEL_TABLES) {
        await client.query(
          `UPDATE ${t} SET level_index=$1 WHERE map_id=$2 AND level_index=$3`,
          [newIdx, mapId, parked]
        );
      }
    }
    // The ground floor's image is also the map's own, so a reorder that changes
    // which storey is level 0 has to move it too.
    const ground = (await client.query(
      'SELECT image_path FROM map_levels WHERE map_id=$1 AND level_index=0', [mapId]
    )).rows[0];
    if (ground) await client.query('UPDATE maps SET image_path=$1 WHERE id=$2', [ground.image_path, mapId]);
    await client.query('UPDATE maps SET active_level=0 WHERE id=$1', [mapId]);
    await client.query('COMMIT');

    const levels = (await db.query(
      'SELECT * FROM map_levels WHERE map_id=$1 ORDER BY level_index', [mapId]
    )).rows;
    res.json({ levels });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

router.delete('/:mapId/levels/:levelIndex', async (req, res) => {
  const mapId = Number(req.params.mapId);
  const idx = Number(req.params.levelIndex);
  const client = await db.pool.connect();
  try {
    const existing = (await client.query(
      'SELECT level_index FROM map_levels WHERE map_id=$1 ORDER BY level_index', [mapId]
    )).rows.map((r) => r.level_index);
    if (!existing.includes(idx)) return res.status(404).json({ error: 'Level not found' });
    if (existing.length <= 1) return res.status(400).json({ error: 'A map must keep at least one level' });

    await client.query('BEGIN');
    // The storey and everything standing on it.
    await client.query('DELETE FROM map_levels WHERE map_id=$1 AND level_index=$2', [mapId, idx]);
    for (const t of ['walls', 'doors', 'light_sources']) {
      await client.query(`DELETE FROM ${t} WHERE map_id=$1 AND level_index=$2`, [mapId, idx]);
    }
    // Tokens are NOT deleted with the floor they were standing on — losing a
    // creature because a level was tidied up would be unforgivable. They drop
    // to the ground floor instead.
    await client.query('UPDATE session_tokens SET level_index=0 WHERE map_id=$1 AND level_index=$2', [mapId, idx]);
    // Close the gap so the indices stay contiguous.
    await client.query('UPDATE map_levels SET level_index = level_index - 1 WHERE map_id=$1 AND level_index > $2', [mapId, idx]);
    for (const t of LEVEL_TABLES) {
      await client.query(`UPDATE ${t} SET level_index = level_index - 1 WHERE map_id=$1 AND level_index > $2`, [mapId, idx]);
    }
    const ground = (await client.query(
      'SELECT image_path FROM map_levels WHERE map_id=$1 AND level_index=0', [mapId]
    )).rows[0];
    if (ground) await client.query('UPDATE maps SET image_path=$1 WHERE id=$2', [ground.image_path, mapId]);
    await client.query('UPDATE maps SET active_level=0 WHERE id=$1', [mapId]);
    await client.query('COMMIT');

    const levels = (await db.query(
      'SELECT * FROM map_levels WHERE map_id=$1 ORDER BY level_index', [mapId]
    )).rows;
    res.json({ levels });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;
