const express = require('express');
const { UPLOADS_DIR, ensureDir } = require('../paths');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');

// ─── Tile maps: the library and the decks ────────────────────────────────────
//
// The map itself and everything that happens to it live on the socket (see
// index.js) because they are shared, live state the whole table watches. This
// file is the GM's workshop: stocking the tile library and building piles out
// of it. Same split every other library in this app uses.

const router = express.Router();

const TILE_DIR = path.join(UPLOADS_DIR, 'tiles');
if (!fs.existsSync(TILE_DIR)) fs.mkdirSync(TILE_DIR, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: TILE_DIR,
    filename: (req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: 24 * 1024 * 1024 },
});

// Only ever unlink inside the tiles directory. The path comes out of the DB,
// but a bad row must not be able to reach anywhere else on disk.
function safeUnlinkTile(imagePath) {
  if (!imagePath) return;
  const abs = path.resolve(UPLOADS_DIR, imagePath);
  if (path.dirname(abs) !== path.resolve(TILE_DIR)) return;
  fs.unlink(abs, () => { /* already gone */ });
}

const bool = (v) => v === true || v === 'true' || v === 1 || v === '1';
const clampSquares = (v, d) => Math.max(1, Math.min(20, parseInt(v, 10) || d));
// Wall height in feet. Floored at 1 (a kerb) and capped at 200 (a chasm
// wall) — beyond that it is a typo, not a room.
const clampHeight = (v, d = 10) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.max(1, Math.min(200, n)) : d;
};

// ── Library ─────────────────────────────────────────────────────────────────

// GET /api/tiles → the whole tile library.
router.get('/', async (_req, res) => {
  try {
    const r = await db.query('SELECT * FROM tile_library ORDER BY category, name, id');
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tiles  (multipart, field `image`)
router.post('/', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
    const b = req.body || {};
    const r = await db.query(
      `INSERT INTO tile_library (name, image_path, grid_w, grid_h, edge_n, edge_e, edge_s, edge_w, category, wall_height_ft)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [
        (b.name || req.file.originalname || 'Tile').slice(0, 120),
        `tiles/${req.file.filename}`,
        clampSquares(b.grid_w, 2),
        clampSquares(b.grid_h, 2),
        bool(b.edge_n), bool(b.edge_e), bool(b.edge_s), bool(b.edge_w),
        String(b.category || '').slice(0, 40),
        clampHeight(b.wall_height_ft),
      ]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/tiles/:id — rename, resize, change which edges are open.
router.patch('/:id', async (req, res) => {
  try {
    const b = req.body || {};
    const sets = [];
    const vals = [];
    const put = (col, val) => { vals.push(val); sets.push(`${col}=$${vals.length}`); };
    if (b.name !== undefined) put('name', String(b.name).slice(0, 120));
    if (b.grid_w !== undefined) put('grid_w', clampSquares(b.grid_w, 2));
    if (b.grid_h !== undefined) put('grid_h', clampSquares(b.grid_h, 2));
    if (b.category !== undefined) put('category', String(b.category || '').slice(0, 40));
    if (b.wall_height_ft !== undefined) put('wall_height_ft', clampHeight(b.wall_height_ft));
    for (const e of ['edge_n', 'edge_e', 'edge_s', 'edge_w']) {
      if (b[e] !== undefined) put(e, bool(b[e]));
    }
    if (!sets.length) return res.status(400).json({ error: 'Nothing to update' });
    vals.push(req.params.id);
    const r = await db.query(
      `UPDATE tile_library SET ${sets.join(', ')} WHERE id=$${vals.length} RETURNING *`, vals
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/tiles/:id
//
// Tiles already laid on a map keep working: map_tiles holds its own copy of
// the art path and its FK is ON DELETE SET NULL, so a dungeon the party is
// standing in does not lose its floor because the GM tidied the library. The
// file is therefore only unlinked once nothing points at it.
router.delete('/:id', async (req, res) => {
  try {
    const cur = await db.query('SELECT image_path FROM tile_library WHERE id=$1', [req.params.id]);
    if (!cur.rows.length) return res.status(404).json({ error: 'Not found' });
    const p = cur.rows[0].image_path;
    await db.query('DELETE FROM tile_library WHERE id=$1', [req.params.id]);

    const stillUsed = await db.query(
      `SELECT 1 FROM map_tiles WHERE image_path=$1 LIMIT 1`, [p]
    );
    if (!stillUsed.rows.length) safeUnlinkTile(p);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Importing a tile from Dungeondraft ──────────────────────────────────────
//
// A .dd2vtt carries the artwork AND the geometry: line-of-sight walls, portals
// and lights, all in grid units. Importing one as a tile keeps the walls, so a
// room laid on the board blocks sight the way it was drawn instead of being a
// picture of a room.
//
// Parsed by the SAME reader the whole-map importer uses (see dd2vtt.js) — that
// code carries real judgement about the format, and a second copy here would
// drift from it the next time Dungeondraft changes.
const ddImport = require('./dd2vtt');
const { mergeSegments, sameSegment } = require('../tileSegments');
const { cleanSpawns } = require('../tileSpawns');
const { normaliseMotion } = require('../doorDefaults');

router.post('/import-dd2vtt', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const raw = fs.readFileSync(req.file.path, 'utf8');
    // The upload lands in the tiles dir as a .dd2vtt; the artwork is written
    // beside it below and this is not needed once parsed.
    fs.unlink(req.file.path, () => {});

    let data;
    try { data = JSON.parse(raw); }
    catch { return res.status(400).json({ error: 'That is not a .dd2vtt / Universal VTT file' }); }

    const resolution = data.resolution || {};
    const scale = Math.round(Number(resolution.pixels_per_grid) || 0) || 140;
    const mapSize = resolution.map_size || {};
    const cols = Math.max(1, Math.min(20, Math.round(Number(mapSize.x) || 0) || 2));
    const rows = Math.max(1, Math.min(20, Math.round(Number(mapSize.y) || 0) || 2));

    if (!data.image) return res.status(400).json({ error: 'That file carries no image' });
    const mime = String(data.image).match(/^data:image\/(\w+);base64,/);
    const ext = mime ? `.${mime[1] === 'jpeg' ? 'jpg' : mime[1]}` : '.png';
    const filename = `${uuidv4()}${ext}`;
    fs.writeFileSync(
      path.join(TILE_DIR, filename),
      Buffer.from(String(data.image).replace(/^data:image\/\w+;base64,/, ''), 'base64')
    );

    // Pixels from the parser, converted straight back to GRID SQUARES — the
    // tile has to survive being laid on a map with a different grid_size, and
    // squares are the only unit that means the same thing on both.
    const geo = ddImport.parseLevelGeometry(data, { walls: true, doors: true, lights: false });
    // Merged before storing, not at placement: this is a property of the tile,
    // so doing it once at import means every placement, every rotation and
    // every future reader gets the tidy version.
    //
    // Dungeondraft writes a four-square opening as FOUR one-square portals.
    // Taken literally that is four doors in one doorway, each opening on its
    // own — which is what "it makes a separate door for each tile" was. Runs
    // that are collinear and touching become one door across the whole gap.
    const rawDoors = (geo.doors || []).map((d) => ({
      points: (d.points || []).map((v) => v / scale),
      isOpen: !!d.isOpen,
      kind: d.kind || 'door',
    }));
    // Grouped by kind and open-state before merging, so a window is never
    // absorbed into the door beside it and a shut door never into an open one.
    const doorGroups = new Map();
    for (const d of rawDoors) {
      const key = `${d.kind}|${d.isOpen}`;
      if (!doorGroups.has(key)) doorGroups.set(key, []);
      doorGroups.get(key).push(d.points);
    }
    const doors = [];
    for (const [key, segs] of doorGroups) {
      const [kind, open] = key.split('|');
      for (const pts of mergeSegments(segs)) {
        doors.push({ points: pts, isOpen: open === 'true', kind });
      }
    }

    const geometry = {
      // Walls get the same treatment — a room drawn as a run of one-square
      // segments becomes a handful of long ones, which is fewer boxes to
      // extrude and fewer seams to z-fight along.
      walls: mergeSegments((geo.walls || []).map(([x1, y1, x2, y2]) =>
        [x1 / scale, y1 / scale, x2 / scale, y2 / scale])),
      doors,
    };

    const r = await db.query(
      `INSERT INTO tile_library (name, image_path, grid_w, grid_h, geometry, category, wall_height_ft)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [
        (req.body?.name || req.file.originalname.replace(/\.[^.]+$/, '') || 'Tile').slice(0, 120),
        `tiles/${filename}`,
        cols, rows,
        JSON.stringify(geometry),
        String(req.body?.category || '').slice(0, 40),
        clampHeight(req.body?.wall_height_ft),
      ]
    );
    res.status(201).json({
      ...r.rows[0],
      imported: { walls: geometry.walls.length, doors: geometry.doors.length },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/tiles/:id/doors — what this tile's doorways are, and whether they
// exist at all.
//
// Stored on the geometry's own door entries rather than in a table beside
// them, because these ARE the doors: the tile carries a list of openings, and
// this says what each one is made of.
//
// The payload is the doorways the tile should END UP with, and anything absent
// from it is deleted — which is how an imported tile sheds the doorways the
// artist drew but the GM does not want. Entries are matched to what is already
// stored BY THEIR POINTS, and an entry matching nothing is ignored: a client
// may reorder, retype or drop a doorway, but it cannot invent one at
// coordinates of its choosing, which would let a stray request write geometry
// that no wall was ever cut for.
router.put('/:id/doors', async (req, res) => {
  try {
    const r = await db.query('SELECT geometry FROM tile_library WHERE id=$1', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    const geo = r.rows[0].geometry || {};
    const have = Array.isArray(geo.doors) ? geo.doors : [];
    const want = Array.isArray(req.body?.doors) ? req.body.doors : [];

    const used = new Set();
    const next = [];
    for (const w of want) {
      const wp = (w?.points || []).map(Number);
      if (wp.length < 4) continue;
      const at = have.findIndex((d, i) => !used.has(i)
        && Array.isArray(d.points) && d.points.length >= 4
        && sameSegment(wp, d.points.map(Number)));
      if (at < 0) continue;             // not a doorway this tile has
      used.add(at);

      const out = { ...have[at] };      // keep the stored points, not the sent ones
      if (Object.prototype.hasOwnProperty.call(w, 'sprite_path')) {
        if (w.sprite_path === null) delete out.sprite_path;
        else if (typeof w.sprite_path === 'string') out.sprite_path = w.sprite_path.slice(0, 255);
      }
      if (typeof w.sprite_motion === 'string') out.sprite_motion = normaliseMotion(w.sprite_motion);
      else if (w.sprite_motion === null) delete out.sprite_motion;
      if (w.kind === 'door' || w.kind === 'window') out.kind = w.kind;
      next.push(out);
    }

    const saved = await db.query(
      "UPDATE tile_library SET geometry = jsonb_set(COALESCE(geometry,'{}'::jsonb), '{doors}', $1::jsonb) WHERE id=$2 RETURNING *",
      [JSON.stringify(next), req.params.id]
    );
    res.json(saved.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/tiles/:id/spawns — the creatures this tile brings with it.
//
// Positions are in grid squares from the tile's own top-left, so they rotate
// and translate with it exactly as the walls do.
router.put('/:id/spawns', async (req, res) => {
  try {
    // Whitelisted in one shared place — this used to keep only the creature
    // and its position, silently discarding every other field the editor sent.
    const clean = cleanSpawns(req.body?.spawns);
    const r = await db.query(
      'UPDATE tile_library SET spawns=$1 WHERE id=$2 RETURNING *',
      [JSON.stringify(clean), req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Decks ───────────────────────────────────────────────────────────────────

// Card counts by pile, for the deck list and the GM's draw button.
async function deckSummary(deckId) {
  const r = await db.query(
    `SELECT pile, COUNT(*)::int AS n FROM tile_deck_cards WHERE deck_id=$1 GROUP BY pile`,
    [deckId]
  );
  const out = { draw: 0, pending: 0, discard: 0 };
  for (const row of r.rows) out[row.pile] = row.n;
  return out;
}

// GET /api/tiles/decks/list?session_id=
//
// Under /decks/ rather than at the router root so it cannot collide with
// GET /api/tiles/:id — an id route and a word route on the same segment is a
// bug waiting for someone to name a deck "decks".
router.get('/decks/list', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT * FROM tile_decks WHERE ($1::int IS NULL OR session_id=$1) ORDER BY name, id`,
      [req.query.session_id ? Number(req.query.session_id) : null]
    );
    const decks = [];
    for (const d of r.rows) decks.push({ ...d, counts: await deckSummary(d.id) });
    res.json(decks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tiles/decks/:id — the deck, with its cards grouped by pile.
router.get('/decks/:id', async (req, res) => {
  try {
    const d = await db.query('SELECT * FROM tile_decks WHERE id=$1', [req.params.id]);
    if (!d.rows.length) return res.status(404).json({ error: 'Not found' });
    const cards = await db.query(
      `SELECT c.*, t.name, t.image_path, t.grid_w, t.grid_h,
              t.edge_n, t.edge_e, t.edge_s, t.edge_w
         FROM tile_deck_cards c
         JOIN tile_library t ON t.id = c.tile_id
        WHERE c.deck_id=$1
        ORDER BY c.sort_order, c.id`,
      [req.params.id]
    );
    res.json({ ...d.rows[0], cards: cards.rows, counts: await deckSummary(req.params.id) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tiles/decks — create a deck.
router.post('/decks', async (req, res) => {
  try {
    const b = req.body || {};
    const r = await db.query(
      'INSERT INTO tile_decks (session_id, name) VALUES ($1,$2) RETURNING *',
      [b.session_id || null, (b.name || 'Dungeon Deck').slice(0, 120)]
    );
    res.status(201).json({ ...r.rows[0], counts: { draw: 0, pending: 0, discard: 0 } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/tiles/decks/:id/cards — set what is IN the deck.
//
// Takes { tiles: [{ tile_id, count }] } and rebuilds the pile from scratch.
// Editing the deck's contents is a between-sessions activity, so replacing it
// wholesale is simpler than reconciling adds and removes — and it means the
// GM's screen is always what the deck actually holds.
router.put('/decks/:id/cards', async (req, res) => {
  try {
    const rows = Array.isArray(req.body?.tiles) ? req.body.tiles : [];
    const d = await db.query('SELECT id FROM tile_decks WHERE id=$1', [req.params.id]);
    if (!d.rows.length) return res.status(404).json({ error: 'Not found' });

    await db.query('DELETE FROM tile_deck_cards WHERE deck_id=$1', [req.params.id]);
    let order = 0;
    for (const row of rows) {
      const tileId = Number(row?.tile_id);
      const count = Math.max(0, Math.min(50, parseInt(row?.count, 10) || 0));
      if (!tileId || !count) continue;
      for (let i = 0; i < count; i++) {
        await db.query(
          `INSERT INTO tile_deck_cards (deck_id, tile_id, pile, sort_order)
           VALUES ($1,$2,'draw',$3)`,
          [req.params.id, tileId, order++]
        );
      }
    }
    res.json({ ok: true, counts: await deckSummary(req.params.id) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/tiles/decks/:id
router.delete('/decks/:id', async (req, res) => {
  try {
    const r = await db.query('DELETE FROM tile_decks WHERE id=$1 RETURNING id', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
module.exports.deckSummary = deckSummary;
