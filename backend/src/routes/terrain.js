const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');

const router = express.Router();

const TERRAIN_DIR = path.join(__dirname, '../../uploads/terrain');
if (!fs.existsSync(TERRAIN_DIR)) fs.mkdirSync(TERRAIN_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: TERRAIN_DIR,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

// ── Imported 3D models ──────────────────────────────────────────────────────
// Kept in their own directory rather than beside the sprites: a .glb is tens of
// megabytes where a terrain sprite is tens of kilobytes, and the delete/replace
// guards below whitelist by directory, so one dir per kind of file keeps those
// guards from ever pointing at the wrong thing.
const MODEL_DIR = path.join(__dirname, '../../uploads/terrain-models');
if (!fs.existsSync(MODEL_DIR)) fs.mkdirSync(MODEL_DIR, { recursive: true });

// .glb is the format to hand people: one file with its meshes, materials and
// textures packed inside, which is what "File > Export > glTF 2.0 (.glb)" out
// of Blender produces by default. .gltf is accepted too, but only the embedded
// flavour works — a .gltf that references sibling .bin/.png files will load
// with missing geometry, since those siblings were never uploaded.
const MODEL_EXTS = ['.glb', '.gltf'];
const modelUpload = multer({
  storage: multer.diskStorage({
    destination: MODEL_DIR,
    filename: (req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: 128 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, MODEL_EXTS.includes(path.extname(file.originalname).toLowerCase())),
});

// Unlink a model file, but only from inside MODEL_DIR — the same directory
// guard the image replace/delete paths use, so a bad row can't reach out of the
// uploads tree.
function unlinkModel(rel) {
  if (!rel) return;
  const abs = path.resolve(path.join(__dirname, '../../uploads'), rel);
  if (path.dirname(abs) === path.resolve(MODEL_DIR)) fs.unlink(abs, () => { /* already gone */ });
}

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
const uploadArt = upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'source_image', maxCount: 1 },
]);

router.post('/library', uploadArt, async (req, res) => {
  try {
    const art = req.files?.image?.[0];
    if (!art) return res.status(400).json({ error: 'No image uploaded' });
    const imagePath = `terrain/${art.filename}`;
    // Only present when the client framed the art — otherwise the drawn image
    // IS the original and there's nothing extra to keep.
    const src = req.files?.source_image?.[0];
    const sourcePath = src ? `terrain/${src.filename}` : null;
    const name = String(req.body.name || '').slice(0, 120) || 'Terrain';
    const default_w = Number(req.body.default_w) || 2;
    const default_h = Number(req.body.default_h) || 2;
    const blocks_vision = req.body.blocks_vision === 'true';
    const blocks_light  = req.body.blocks_light  === 'true';
    const blocks_movement = req.body.blocks_movement === 'true';
    const hide_until_revealed = req.body.hide_until_revealed === 'true';
    // Marker: a ship / settlement / point of interest rather than scenery.
    // Placed instances of one draw their name on the map and are listed
    // separately in the GM's library.
    const is_marker = req.body.is_marker === 'true';
    let custom_walls = null;
    if (req.body.custom_walls) {
      try { custom_walls = JSON.parse(req.body.custom_walls); } catch {}
    }
    const r = await db.query(
      `INSERT INTO terrain_library
         (name, image_path, default_w, default_h,
          blocks_vision, blocks_light, blocks_movement,
          hide_until_revealed, custom_walls, is_marker, source_image_path)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [name, imagePath, default_w, default_h,
       blocks_vision, blocks_light, blocks_movement,
       hide_until_revealed, custom_walls ? JSON.stringify(custom_walls) : null, is_marker, sourcePath]
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
    if (req.body.is_marker !== undefined) push('is_marker', !!req.body.is_marker);
    // Whitelisted rather than passed through: this lands in a VARCHAR the
    // renderer switches on, and an unknown value would silently draw nothing.
    if (req.body.three_d_shape !== undefined) {
      const want = String(req.body.three_d_shape);
      push('three_d_shape', [
        'flat', 'rock', 'sphere', 'model', 'cloud', 'gate',
        'blackhole', 'wormhole', 'ionstorm', 'debris',
        // Grown pieces. Missing from this list, a GM who picked one in the
        // library editor had it silently saved as 'flat' — the whitelist is
        // the thing that has to be updated when a shape is added, and it is
        // nowhere near the renderer that defines them.
        'vine', 'tentacle',
      ].includes(want) ? want : 'flat');
    }
    // Which volume a cloud builds in 3D. Whitelisted for the same reason as
    // three_d_shape: the renderer switches on this string, and an unknown value
    // would silently fall back rather than erroring anywhere visible.
    if (req.body.cloud_form !== undefined) {
      const want = String(req.body.cloud_form);
      push('cloud_form', ['bank', 'ground', 'column', 'wisps', 'ring', 'wall'].includes(want) ? want : 'bank');
    }
    // Which VARIATION of a shape — the general form of cloud_form, for shapes
    // whose art and geometry come in poses. Whitelisted for the same reason;
    // an empty string is "this shape has no variations", which is most of them.
    if (req.body.piece_form !== undefined) {
      const want = String(req.body.piece_form);
      push('piece_form', ['', 'rearing', 'coiled', 'nest'].includes(want) ? want : '');
    }
    // Multiplier on top of the auto-fit, for a model exported with padding
    // around it or with an atmosphere shell that shouldn't drive the fit.
    if (req.body.model_scale !== undefined) {
      const sc = Number(req.body.model_scale);
      push('model_scale', Number.isFinite(sc) && sc > 0 ? Math.min(sc, 100) : 1);
    }
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

// POST /api/terrain/library/:id/image — swap a piece's artwork in place.
//
// This is what "Adjust framing" lands on: ImageFramer re-crops and hands back a
// new file, which replaces the drawn art while the row (and every placement of
// it) stays put. The unframed original is kept in step when one is sent, so
// re-framing repeatedly always crops from the picture rather than from the
// previous crop.
router.post('/library/:id/image', uploadArt, async (req, res) => {
  try {
    const art = req.files?.image?.[0];
    if (!art) return res.status(400).json({ error: 'No image uploaded' });
    const prev = await db.query('SELECT image_path, source_image_path FROM terrain_library WHERE id=$1', [req.params.id]);
    if (!prev.rows.length) return res.status(404).json({ error: 'Not found' });

    const src = req.files?.source_image?.[0];
    const fields = ['image_path=$1'];
    const values = [`terrain/${art.filename}`];
    if (src) { values.push(`terrain/${src.filename}`); fields.push(`source_image_path=$${values.length}`); }
    values.push(req.params.id);
    const r = await db.query(
      `UPDATE terrain_library SET ${fields.join(', ')} WHERE id=$${values.length} RETURNING *`,
      values
    );

    // Drop the superseded file, but only from inside the terrain dir — the same
    // guard the delete route uses, so a bad row can't unlink something else.
    // The original is only replaced when a new one came with it.
    const stale = [prev.rows[0].image_path];
    if (src && prev.rows[0].source_image_path) stale.push(prev.rows[0].source_image_path);
    for (const rel of stale) {
      if (!rel) continue;
      const abs = path.resolve(path.join(__dirname, '../../uploads'), rel);
      if (path.dirname(abs) === path.resolve(TERRAIN_DIR)) fs.unlink(abs, () => { /* already gone */ });
    }
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/terrain/library/:id/model — attach or replace the piece's 3D mesh.
//
// Separate from the art upload on purpose. The model does NOT replace
// `image_path`: the flat board still draws the sprite, and this is only what
// the 3D view stands up in its place. So one library entry is a picture from
// above and a mesh in perspective, and the GM sets both.
//
// Attaching a model also flips `three_d_shape` to 'model' unless the piece is
// already set to something explicit — otherwise you upload a Blender planet and
// the 3D view carries on drawing the flat sprite with no clue why.
router.post('/library/:id/model', modelUpload.single('model'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No model uploaded (.glb or embedded .gltf)' });
    const prev = await db.query('SELECT model_path, three_d_shape FROM terrain_library WHERE id=$1', [req.params.id]);
    if (!prev.rows.length) {
      unlinkModel(`terrain-models/${req.file.filename}`);
      return res.status(404).json({ error: 'Not found' });
    }
    const fields = ['model_path=$1'];
    const values = [`terrain-models/${req.file.filename}`];
    if (req.body.model_scale !== undefined) {
      const sc = Number(req.body.model_scale);
      values.push(Number.isFinite(sc) && sc > 0 ? Math.min(sc, 100) : 1);
      fields.push(`model_scale=$${values.length}`);
    }
    if (prev.rows[0].three_d_shape === 'flat') fields.push("three_d_shape='model'");
    values.push(req.params.id);
    const r = await db.query(
      `UPDATE terrain_library SET ${fields.join(', ')} WHERE id=$${values.length} RETURNING *`,
      values
    );
    unlinkModel(prev.rows[0].model_path);
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/terrain/library/:id/model — drop the mesh, keep the piece.
// Falls the 3D shape back to 'flat' when it was only 'model' because a model
// was attached, so the piece doesn't become invisible in 3D.
router.delete('/library/:id/model', async (req, res) => {
  try {
    // Read the path BEFORE clearing it: RETURNING hands back the row after the
    // update, by which point model_path is already NULL and the file on disk
    // would have nothing pointing at it.
    const prev = await db.query('SELECT model_path FROM terrain_library WHERE id=$1', [req.params.id]);
    if (!prev.rows.length) return res.status(404).json({ error: 'Not found' });
    const r = await db.query(
      `UPDATE terrain_library
          SET model_path=NULL,
              three_d_shape = CASE WHEN three_d_shape='model' THEN 'flat' ELSE three_d_shape END
        WHERE id=$1
      RETURNING *`,
      [req.params.id]
    );
    unlinkModel(prev.rows[0].model_path);
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
      'DELETE FROM terrain_library WHERE id=$1 RETURNING image_path, source_image_path, model_path, is_default',
      [req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    // Don't delete shipping default art on disk — the next startup's
    // seed-skip relies on the row, not the file. (We allow deleting
    // the row though, since a GM may genuinely not want a default in
    // their library.)
    //
    // A framed marker owns TWO files: the disc drawn on the map and the
    // unframed original behind it. Both go, or deleting markers slowly fills
    // uploads/terrain with orphaned originals nothing references.
    if (!r.rows[0].is_default) {
      for (const rel of [r.rows[0].image_path, r.rows[0].source_image_path]) {
        if (!rel) continue;
        fs.unlink(path.join(__dirname, '../../uploads', rel), () => {}); // best-effort
      }
    }
    // The mesh goes whether or not the piece was a shipped default: models are
    // never seeded, so one always belongs to the row being deleted.
    unlinkModel(r.rows[0].model_path);
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
        const filePath = path.join(__dirname, '../../uploads', r.image_path);
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
