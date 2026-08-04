const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { UPLOADS_DIR, ensureDir } = require('../paths');

const router = express.Router();

const TERRAIN_DIR = ensureDir(path.join(UPLOADS_DIR, 'terrain'));

const storage = multer.diskStorage({
  destination: TERRAIN_DIR,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

// SVG, PNG, JPEG, WebP, GIF. Same-ish set as map upload, plus SVG since
// the terrain pieces ship as SVG by default.
const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.svg', '.png', '.jpg', '.jpeg', '.webp', '.gif'];
    cb(null, allowed.includes(path.extname(file.originalname).toLowerCase()));
  },
});

// GET /api/terrain-library — every library piece, default first then by id.
// Defaults sit pinned at the top of the panel so the GM can always grab
// rock-wall / rubble / tree quickly.
router.get('/library', async (_req, res) => {
  try {
    const r = await db.query(
      `SELECT * FROM terrain_library
        ORDER BY is_default DESC, id ASC`
    );
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/terrain-library — multipart upload for the image plus JSON
// metadata (sent as form fields — multer parses both). Returns the new
// library row so the client can update its panel without a refetch.
router.post('/library', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
    const imagePath = `terrain/${req.file.filename}`;
    const name = String(req.body.name || '').slice(0, 120) || 'Terrain';
    const default_w = Number(req.body.default_w) || 2;
    const default_h = Number(req.body.default_h) || 2;
    const blocks_vision = req.body.blocks_vision === 'true';
    const blocks_light  = req.body.blocks_light  === 'true';
    const blocks_movement = req.body.blocks_movement === 'true';
    const hide_until_revealed = req.body.hide_until_revealed === 'true';
    let custom_walls = null;
    if (req.body.custom_walls) {
      try { custom_walls = JSON.parse(req.body.custom_walls); } catch {}
    }
    const r = await db.query(
      `INSERT INTO terrain_library
         (name, image_path, default_w, default_h,
          blocks_vision, blocks_light, blocks_movement,
          hide_until_revealed, custom_walls)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [name, imagePath, default_w, default_h,
       blocks_vision, blocks_light, blocks_movement,
       hide_until_revealed, custom_walls ? JSON.stringify(custom_walls) : null]
    );
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/terrain-library/:id — update any subset of the library
// metadata. Image-only updates (re-uploading the same piece's art)
// route through POST /:id/image below to keep the MIME handling tidy.
router.patch('/library/:id', express.json(), async (req, res) => {
  try {
    const fields = [];
    const values = [];
    const push = (k, v) => { values.push(v); fields.push(`${k}=$${values.length}`); };
    if (req.body.name !== undefined) push('name', String(req.body.name).slice(0, 120));
    if (req.body.default_w !== undefined) push('default_w', Number(req.body.default_w) || 1);
    if (req.body.default_h !== undefined) push('default_h', Number(req.body.default_h) || 1);
    if (req.body.blocks_vision !== undefined) push('blocks_vision', !!req.body.blocks_vision);
    if (req.body.blocks_light !== undefined)  push('blocks_light',  !!req.body.blocks_light);
    if (req.body.blocks_movement !== undefined) push('blocks_movement', !!req.body.blocks_movement);
    if (req.body.hide_until_revealed !== undefined) push('hide_until_revealed', !!req.body.hide_until_revealed);
    if (req.body.custom_walls !== undefined) {
      push('custom_walls', req.body.custom_walls ? JSON.stringify(req.body.custom_walls) : null);
    }
    if (!fields.length) return res.status(400).json({ error: 'No fields to update' });
    values.push(req.params.id);
    const r = await db.query(
      `UPDATE terrain_library SET ${fields.join(', ')} WHERE id=$${values.length} RETURNING *`,
      values
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/terrain-library/:id — removes the library row, the
// image file on disk, and (via FK ON DELETE SET NULL) leaves any
// already-placed instances on the map but disconnected from the
// library. We could cascade-remove placed instances instead — left as
// SET NULL so a deleted library piece doesn't silently wipe in-progress
// scenes. Front-end shows orphaned placed pieces as red-ringed.
router.delete('/library/:id', async (req, res) => {
  try {
    const r = await db.query(
      'DELETE FROM terrain_library WHERE id=$1 RETURNING image_path, is_default',
      [req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    // Don't delete shipping default art on disk — the next startup's
    // seed-skip relies on the row, not the file. (We allow deleting
    // the row though, since a GM may genuinely not want a default in
    // their library.)
    if (!r.rows[0].is_default && r.rows[0].image_path) {
      const filePath = path.join(UPLOADS_DIR, r.rows[0].image_path);
      fs.unlink(filePath, () => {}); // best-effort
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// MIME hints used when round-tripping image bytes through base64. The
// extension is what actually matters on disk; this keeps the data:
// URL payload viewable in a browser if the JSON is opened directly.
const EXT_TO_MIME = {
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif':  'image/gif',
};

// GET /api/terrain/library/export?ids=1,2,3 — returns a JSON dump of
// the selected library pieces (or every piece if `ids` is omitted),
// each with its image embedded as a base64 data: URL so the dump is
// fully self-contained and re-importable on a different host.
router.get('/library/export', async (req, res) => {
  try {
    const idsParam = String(req.query.ids || '').trim();
    let rows;
    if (idsParam) {
      const idList = idsParam.split(',').map((s) => parseInt(s, 10)).filter((n) => Number.isFinite(n));
      if (!idList.length) return res.json({ terrain: [] });
      rows = (await db.query(
        'SELECT * FROM terrain_library WHERE id = ANY($1::int[]) ORDER BY id',
        [idList]
      )).rows;
    } else {
      rows = (await db.query('SELECT * FROM terrain_library ORDER BY id')).rows;
    }
    const out = [];
    for (const r of rows) {
      const piece = {
        name: r.name,
        default_w: r.default_w,
        default_h: r.default_h,
        hide_until_revealed: !!r.hide_until_revealed,
        custom_walls: r.custom_walls || null,
        // Stash the original filename so importers can preserve the
        // extension; the actual on-disk path on import is fresh.
        image_filename: r.image_path ? path.basename(r.image_path) : null,
      };
      if (r.image_path) {
        const filePath = path.join(UPLOADS_DIR, r.image_path);
        if (fs.existsSync(filePath)) {
          const buf = fs.readFileSync(filePath);
          const ext = path.extname(filePath).toLowerCase();
          const mime = EXT_TO_MIME[ext] || 'application/octet-stream';
          piece.image_data = `data:${mime};base64,${buf.toString('base64')}`;
        }
      }
      out.push(piece);
    }
    res.json({ terrain: out });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/terrain/library/import — accepts a JSON body shaped like
// the export's output (or just a bare `[...]` array). For each entry
// with embedded image_data the bytes are decoded and saved fresh in
// /uploads/terrain/, then a new library row is inserted. Returns the
// list of newly-created rows so the client can stitch them into its
// state without a full refetch.
router.post('/library/import', express.json({ limit: '50mb' }), async (req, res) => {
  try {
    const body = req.body;
    const list = Array.isArray(body?.terrain) ? body.terrain
               : (Array.isArray(body) ? body : []);
    if (!list.length) return res.status(400).json({ error: 'No terrain entries in payload' });
    const inserted = [];
    for (const raw of list) {
      const name = String(raw?.name || '').trim();
      if (!name) continue;
      let imagePath = null;
      if (typeof raw.image_data === 'string') {
        // Strip the data: URL header if present, then decode.
        const m = raw.image_data.match(/^data:([^;]+);base64,(.+)$/);
        const b64 = m ? m[2] : raw.image_data;
        try {
          const buf = Buffer.from(b64, 'base64');
          if (buf.length === 0) continue;
          // Prefer the original filename's extension; fall back to a
          // mime-derived one if the importer dropped the filename.
          let ext = '';
          if (raw.image_filename && typeof raw.image_filename === 'string') {
            ext = path.extname(raw.image_filename).toLowerCase();
          }
          if (!ext && m) {
            const mime = m[1];
            for (const [e, mm] of Object.entries(EXT_TO_MIME)) {
              if (mm === mime) { ext = e; break; }
            }
          }
          if (!ext) ext = '.png';
          const filename = `${uuidv4()}${ext}`;
          fs.writeFileSync(path.join(TERRAIN_DIR, filename), buf);
          imagePath = `terrain/${filename}`;
        } catch (decodeErr) {
          console.warn('terrain import: bad image_data for', name, decodeErr.message);
          continue;
        }
      }
      if (!imagePath) continue; // can't insert a piece without art
      const r = await db.query(
        `INSERT INTO terrain_library
           (name, image_path, default_w, default_h, hide_until_revealed, custom_walls)
         VALUES ($1,$2,$3,$4,$5,$6)
         RETURNING *`,
        [
          name.slice(0, 120),
          imagePath,
          Number(raw.default_w) || 2,
          Number(raw.default_h) || 2,
          !!raw.hide_until_revealed,
          raw.custom_walls ? JSON.stringify(raw.custom_walls) : null,
        ]
      );
      inserted.push(r.rows[0]);
    }
    res.json({ imported: inserted.length, terrain: inserted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
