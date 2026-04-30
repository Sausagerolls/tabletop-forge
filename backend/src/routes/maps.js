const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { imageSize } = require('image-size');
const db = require('../db');

const router = express.Router();

const storage = multer.diskStorage({
  destination: path.join(__dirname, '../../uploads/maps'),
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

    const [wallsRes, doorsRes, lightsRes, darknessRes, markersRes, tokensRes, spawnPointsRes] = await Promise.all([
      db.query('SELECT * FROM walls WHERE map_id=$1 ORDER BY created_at', [mapId]),
      db.query('SELECT * FROM doors WHERE map_id=$1 ORDER BY created_at', [mapId]),
      db.query('SELECT * FROM light_sources WHERE map_id=$1 ORDER BY created_at', [mapId]),
      db.query('SELECT * FROM magical_darkness WHERE session_id=$1 AND map_id=$2 ORDER BY created_at', [session_id, mapId]),
      db.query('SELECT * FROM dm_markers WHERE session_id=$1 AND map_id=$2 ORDER BY created_at', [session_id, mapId]),
      db.query(
        `SELECT st.*, c.image_path AS creature_image, c.dexterity AS creature_dex,
                COALESCE(c.initiative_bonus, 0) AS initiative_bonus
           FROM session_tokens st
           LEFT JOIN creatures c ON st.creature_id = c.id
          WHERE st.session_id = $1 AND st.map_id = $2
          ORDER BY st.z_index, st.id`,
        [session_id, mapId]
      ),
      db.query('SELECT * FROM map_spawn_points WHERE map_id=$1 ORDER BY created_at', [mapId]),
    ]);

    res.json({
      map,
      walls: wallsRes.rows,
      doors: doorsRes.rows,
      lights: lightsRes.rows,
      magicalDarkness: darknessRes.rows,
      dmMarkers: markersRes.rows,
      tokens: tokensRes.rows,
      spawnPoints: spawnPointsRes.rows,
      spawnPoint: { col: map.spawn_col ?? 0, row: map.spawn_row ?? 0, radius: map.spawn_radius ?? 0 },
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

// PATCH /api/maps/:id
router.patch('/:id', async (req, res) => {
  try {
    const { name, grid_size, floor_label } = req.body;
    const result = await db.query(
      'UPDATE maps SET name=COALESCE($1,name), grid_size=COALESCE($2,grid_size), floor_label=COALESCE($3,floor_label) WHERE id=$4 RETURNING *',
      [name, grid_size, floor_label, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
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
    const filePath = path.join(__dirname, '../../uploads', imagePath);
    fs.unlink(filePath, (err) => {
      if (err) console.warn('Could not delete map file:', filePath, err.message);
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
