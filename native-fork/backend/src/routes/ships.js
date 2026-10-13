const express = require('express');
const { UPLOADS_DIR, ensureDir } = require('../paths');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');

const router = express.Router();

const SHIP_DIR = path.join(UPLOADS_DIR, 'ships');
if (!fs.existsSync(SHIP_DIR)) fs.mkdirSync(SHIP_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: SHIP_DIR,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.svg', '.png', '.jpg', '.jpeg', '.webp', '.gif'];
    cb(null, allowed.includes(path.extname(file.originalname).toLowerCase()));
  },
});

// Dungeondraft levels arrive as .dd2vtt JSON, held in memory: each carries its
// deck art as a base64 image, so writing the upload to disk first would only
// mean reading it straight back.
const dd2vttUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 60 * 1024 * 1024, files: 24 },
  fileFilter: (req, file, cb) => {
    cb(null, /\.(dd2vtt|json|uvtt)$/i.test(file.originalname));
  },
});

// Dungeondraft sometimes serialises arrays as objects with numeric keys.
const ddArray = (v) => (Array.isArray(v) ? v : (v && typeof v === 'object' ? Object.values(v) : []));
const ddXY = (pt) => (Array.isArray(pt) ? [Number(pt[0]), Number(pt[1])] : [Number(pt?.x), Number(pt?.y)]);

// A level's own name, in the order the GM gave them.
//
// Dungeondraft doesn't record a level name in the export, so it comes from the
// filename — "Orca - 2 Main Deck.dd2vtt" becomes "Main Deck". Any leading
// numbering is stripped and used for ORDER, which is what makes "10" sort after
// "9" instead of between "1" and "2".
function deckNameFromFile(originalname, index) {
  const base = String(originalname || '').replace(/\.(dd2vtt|json|uvtt)$/i, '');
  const tail = base.includes(' - ') ? base.slice(base.lastIndexOf(' - ') + 3) : base;
  const m = tail.match(/^\s*(\d+)\s*[-_.)]?\s*(.*)$/);
  const order = m ? Number(m[1]) : null;
  const name = ((m && m[2]) || tail).trim();
  return { name: name || `Deck ${index + 1}`, order };
}

// Numeric body fields, so a blank string from the form doesn't become NaN.
function num(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

// ── Library ──────────────────────────────────────────────────────────────────

// GET /api/ships/library — every ship class, each with its decks attached.
// Decks ride along because the builder modal and the map renderer both always
// need them; a ship with no decks can't be placed at all.
router.get('/library', async (_req, res) => {
  try {
    const ships = await db.query('SELECT * FROM ship_library ORDER BY name ASC, id ASC');
    if (!ships.rows.length) return res.json([]);
    const decks = await db.query(
      `SELECT * FROM ship_decks WHERE ship_id = ANY($1::int[]) ORDER BY deck_index ASC`,
      [ships.rows.map(s => s.id)]
    );
    const byShip = new Map();
    for (const d of decks.rows) {
      if (!byShip.has(d.ship_id)) byShip.set(d.ship_id, []);
      byShip.get(d.ship_id).push(d);
    }
    res.json(ships.rows.map(s => ({ ...s, decks: byShip.get(s.id) || [] })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/ships/library/:id
router.get('/library/:id', async (req, res) => {
  try {
    const s = await db.query('SELECT * FROM ship_library WHERE id=$1', [req.params.id]);
    if (!s.rows.length) return res.status(404).json({ error: 'Not found' });
    const d = await db.query(
      'SELECT * FROM ship_decks WHERE ship_id=$1 ORDER BY deck_index ASC',
      [req.params.id]
    );
    res.json({ ...s.rows[0], decks: d.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ships/library — create a ship class. Decks are added separately
// so the GM can build the hull first and upload deck art as they go.
router.post('/library', async (req, res) => {
  try {
    const b = req.body || {};
    const r = await db.query(
      `INSERT INTO ship_library
         (name, ship_class, armor_class, hull_hp, damage_threshold, speed,
          maneuverability, crew_min, crew_max, cargo_tons, keel_length,
          beam_width, weapons, notes, air_bubble_ft, armor_type)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`,
      [
        b.name || 'New Ship',
        b.ship_class || '',
        num(b.armor_class, 15),
        num(b.hull_hp, 300),
        num(b.damage_threshold, 0),
        num(b.speed, 0),
        b.maneuverability || '',
        num(b.crew_min, 0),
        num(b.crew_max, 0),
        num(b.cargo_tons, 0),
        num(b.keel_length, 0),
        num(b.beam_width, 0),
        JSON.stringify(b.weapons || []),
        b.notes || '',
        num(b.air_bubble_ft, 0),
        b.armor_type || '',
      ]
    );
    res.status(201).json({ ...r.rows[0], decks: [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/ships/library/:id — COALESCE so a partial edit from the stats
// panel doesn't blank every field the form didn't send.
router.patch('/library/:id', async (req, res) => {
  try {
    const b = req.body || {};
    const r = await db.query(
      `UPDATE ship_library SET
         name             = COALESCE($1, name),
         ship_class       = COALESCE($2, ship_class),
         armor_class      = COALESCE($3, armor_class),
         hull_hp          = COALESCE($4, hull_hp),
         damage_threshold = COALESCE($5, damage_threshold),
         speed            = COALESCE($6, speed),
         maneuverability  = COALESCE($7, maneuverability),
         crew_min         = COALESCE($8, crew_min),
         crew_max         = COALESCE($9, crew_max),
         cargo_tons       = COALESCE($10, cargo_tons),
         keel_length      = COALESCE($11, keel_length),
         beam_width       = COALESCE($12, beam_width),
         weapons          = COALESCE($13, weapons),
         notes            = COALESCE($14, notes),
         air_bubble_ft    = COALESCE($15, air_bubble_ft),
         armor_type       = COALESCE($16, armor_type)
       WHERE id=$17 RETURNING *`,
      [
        b.name ?? null,
        b.ship_class ?? null,
        b.armor_class ?? null,
        b.hull_hp ?? null,
        b.damage_threshold ?? null,
        b.speed ?? null,
        b.maneuverability ?? null,
        b.crew_min ?? null,
        b.crew_max ?? null,
        b.cargo_tons ?? null,
        b.keel_length ?? null,
        b.beam_width ?? null,
        b.weapons ? JSON.stringify(b.weapons) : null,
        b.notes ?? null,
        // Bare number so 0 is a real value — turning the envelope off has to
        // stick, and `|| null` would silently keep the old radius.
        b.air_bubble_ft != null ? num(b.air_bubble_ft, 0) : null,
        b.armor_type ?? null,
        req.params.id,
      ]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/ships/library/:id — decks cascade. Placed instances keep
// working with library_id nulled (ON DELETE SET NULL) rather than vanishing
// mid-session, but they lose their deck art, so the UI warns first.
router.delete('/library/:id', async (req, res) => {
  try {
    const decks = await db.query('SELECT image_path FROM ship_decks WHERE ship_id=$1', [req.params.id]);
    const r = await db.query('DELETE FROM ship_library WHERE id=$1 RETURNING id', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    for (const d of decks.rows) {
      if (!d.image_path) continue;
      fs.unlink(path.join(UPLOADS_DIR, d.image_path), () => {});
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Decks ────────────────────────────────────────────────────────────────────

// Deck headroom, in feet. One square is 5 ft, so a deck shorter than that has
// no room to stand in; the ceiling is arbitrary but stops a typo turning a
// hull into a mile-high tower in the 3D stack.
function clampHeight(v) {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return 10;
  return Math.min(200, Math.max(1, n));
}

// POST /api/ships/import-dd2vtt — a whole ship from Dungeondraft.
//
// One .dd2vtt per level, which is how Dungeondraft exports a multi-level build:
// each file carries that level's art, its walls (line_of_sight) and its doors
// (portals). They arrive together and become one ship class with one deck per
// file, in order, keeping their names.
//
// COORDINATES. dd2vtt geometry is in GRID UNITS — squares — which is exactly
// how a deck stores its own walls, because deck art is scaled to grid_cols x
// grid_rows squares of whatever map the ship is dropped on. So the geometry is
// kept as squares and never converted here; regenerateShipWalls turns it into
// map pixels at the point of use, when the host map's grid size is known.
// Converting to pixels at import would bake in one map's scale and break the
// ship everywhere else.
router.post('/import-dd2vtt', dd2vttUpload.array('files', 24), async (req, res) => {
  const files = req.files || [];
  if (!files.length) return res.status(400).json({ error: 'No .dd2vtt files uploaded' });

  const isOff = (v) => v === 'false' || v === '0' || v === 'off';
  const isOn = (v) => v === 'true' || v === '1' || v === 'on';
  // Both off unless explicitly asked for. A Dungeondraft hull's walls and doors
  // are already drawn into the deck art, so importing them as real geometry
  // added nothing you could see while making every ship move rewrite it — and a
  // change to either invalidates line of sight for the whole board.
  const want = {
    walls: isOn(req.body.import_walls),
    doors: isOn(req.body.import_doors),
  };

  // Parse everything BEFORE writing anything, so a bad file in the middle of a
  // set doesn't leave half a ship in the library.
  const levels = [];
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    let data;
    try {
      data = JSON.parse(f.buffer.toString('utf8'));
    } catch (_) {
      return res.status(400).json({ error: `${f.originalname} is not valid .dd2vtt JSON` });
    }
    const dataUrl = data.image || '';
    if (!dataUrl) return res.status(400).json({ error: `${f.originalname} has no image in it` });

    const resolution = data.resolution || {};
    const perGrid = Math.round(Number(resolution.pixels_per_grid) || 0) || 140;
    const mapSize = resolution.map_size || {};
    const cols = Math.max(1, Math.round(Number(mapSize.x) || 0));
    const rows = Math.max(1, Math.round(Number(mapSize.y) || 0));
    if (!cols || !rows) return res.status(400).json({ error: `${f.originalname} has no map size` });

    // Walls are DELIBERATELY not imported.
    //
    // A Dungeondraft hull carries hundreds of line-of-sight segments per level.
    // Projecting those into real wall rows meant every ship move rewrote them,
    // and a wall change invalidates line of sight for the whole board — so
    // nudging one ship made every other ship on the map rebuild. The hull art
    // already reads as walls, and no ship feature depended on them.
    //
    // The parsing is kept, off by default, because the geometry is the only
    // part that is awkward to recover later: pass import_walls=true to store it
    // and it will be there if this is ever worth revisiting.
    const hullWalls = [];
    if (want.walls) {
      for (const src of [data.line_of_sight, data.objects_line_of_sight]) {
        for (const line of ddArray(src)) {
          const pts = ddArray(line).map(ddXY).filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
          if (pts.length >= 2) hullWalls.push(pts.map(([col, row]) => ({ col, row })));
        }
      }
    }

    // Doors, off by default for the same reason as walls above. The parsing
    // stays so import_doors=true still works if this is ever wanted.
    //
    // Dungeondraft's `closed` is the door's state, so an open door imports open
    // rather than every door slamming shut on arrival.
    const hullDoors = [];
    if (want.doors) {
      for (const portal of ddArray(data.portals)) {
        const bounds = ddArray(portal.bounds).map(ddXY);
        if (bounds.length < 2) continue;
        hullDoors.push({
          from: { col: bounds[0][0], row: bounds[0][1] },
          to: { col: bounds[1][0], row: bounds[1][1] },
          style: 'standard',
          is_open: portal.closed === false,
        });
      }
    }

    const { name, order } = deckNameFromFile(f.originalname, i);
    levels.push({ data, dataUrl, perGrid, cols, rows, hullWalls, hullDoors, name, order, seq: i });
  }

  // Lowest level first. A number in the filename wins; otherwise the order the
  // files were given. deck_index 0 is the bottom of the ship.
  levels.sort((a, b) => {
    if (a.order != null && b.order != null && a.order !== b.order) return a.order - b.order;
    if (a.order != null && b.order == null) return -1;
    if (a.order == null && b.order != null) return 1;
    return a.seq - b.seq;
  });

  const written = [];
  try {
    const shipName = (req.body.name || '').trim() || 'Dungeondraft Ship';
    const shipRow = (await db.query(
      `INSERT INTO ship_library (name, speed, armor_class, hull_hp, air_bubble_ft)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [shipName, num(req.body.speed, 0), num(req.body.armor_class, 0),
       num(req.body.hull_hp, 0), num(req.body.air_bubble_ft, 0)]
    )).rows[0];

    const decks = [];
    for (let i = 0; i < levels.length; i++) {
      const lv = levels[i];
      const m = lv.dataUrl.match(/^data:image\/(\w+);base64,/);
      const ext = m ? `.${m[1] === 'jpeg' ? 'jpg' : m[1]}` : '.png';
      const fname = `${uuidv4()}${ext}`;
      fs.writeFileSync(path.join(SHIP_DIR, fname), Buffer.from(lv.dataUrl.replace(/^data:image\/\w+;base64,/, ''), 'base64'));
      written.push(path.join(SHIP_DIR, fname));

      const r = await db.query(
        `INSERT INTO ship_decks
           (ship_id, deck_index, name, image_path, grid_cols, grid_rows, hull_walls, hull_doors, transitions, is_main)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'[]'::jsonb,$9) RETURNING *`,
        [
          shipRow.id, i, lv.name, `ships/${fname}`, lv.cols, lv.rows,
          JSON.stringify(lv.hullWalls), JSON.stringify(lv.hullDoors),
          // The main deck is where boarders arrive. With no way to know which
          // level that is, the lowest is the safe guess — it is what boarding
          // did before the flag existed — and the GM can move it in the builder.
          i === 0,
        ]
      );
      decks.push(r.rows[0]);
    }

    res.status(201).json({
      ...shipRow,
      decks,
      imported: decks.map((d, i) => ({
        name: d.name,
        deck_index: d.deck_index,
        squares: `${d.grid_cols}x${d.grid_rows}`,
        walls: levels[i].hullWalls.length,
        doors: levels[i].hullDoors.length,
      })),
    });
  } catch (err) {
    // Don't leave orphaned art behind if the write fails part way.
    for (const f of written) { try { fs.unlinkSync(f); } catch (_) {} }
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ships/library/:id/decks — add a deck with its art.
//
// grid_cols/grid_rows size the deck in SQUARES, not pixels: the art is scaled
// to fit that many squares of whatever map it's placed on, which is what makes
// a deck "respect the scale of the map it's placed on" regardless of how big
// the image file happens to be.
router.post('/library/:id/decks', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No deck image uploaded' });
    const b = req.body || {};
    const shipId = req.params.id;

    const exists = await db.query('SELECT id FROM ship_library WHERE id=$1', [shipId]);
    if (!exists.rows.length) return res.status(404).json({ error: 'Ship not found' });

    // Default to the next free index so decks stack in upload order.
    let deckIndex = b.deck_index != null ? num(b.deck_index, 0) : null;
    if (deckIndex == null) {
      const max = await db.query(
        'SELECT COALESCE(MAX(deck_index), -1) AS m FROM ship_decks WHERE ship_id=$1',
        [shipId]
      );
      deckIndex = Number(max.rows[0].m) + 1;
    }

    const r = await db.query(
      `INSERT INTO ship_decks
         (ship_id, deck_index, name, image_path, grid_cols, grid_rows, hull_walls, transitions, height_ft)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [
        shipId,
        deckIndex,
        b.name || `Deck ${deckIndex + 1}`,
        `ships/${req.file.filename}`,
        Math.max(1, num(b.grid_cols, 4)),
        Math.max(1, num(b.grid_rows, 8)),
        b.hull_walls ? JSON.stringify(JSON.parse(b.hull_walls)) : null,
        JSON.stringify(b.transitions ? JSON.parse(b.transitions) : []),
        // Headroom in feet. Clamped rather than trusted: the 3D stack spaces
        // levels by it, and a zero or a negative would sit two decks inside
        // each other.
        clampHeight(b.height_ft),
      ]
    );
    // Close any gaps the ship already had, so the new deck's number follows on
    // from the one below it rather than from a stale MAX.
    await renumberDecks(shipId);
    const fresh = await db.query('SELECT * FROM ship_decks WHERE id=$1', [r.rows[0].id]);
    res.status(201).json(fresh.rows[0] || r.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Rewrite a ship's deck_index values to a clean 0..n-1 run, preserving current
// order (deck_index first, then id so a duplicated index resolves the same way
// every time).
//
// Reordering used to be a plain PATCH of one deck's own index, +1 or -1. That
// never touched the deck it was displacing, so two decks would land on the same
// number and the run would grow holes — a ship ending up with a 2, a 4 and two
// 3s, where the arrows then appeared to jump several places at once because
// "the next index" was no longer "the next deck". Renumbering here means the
// stored order is always contiguous, and it repairs any ship that already drifted
// the first time its decks are touched.
async function renumberDecks(shipId) {
  await db.query(
    `WITH ordered AS (
       SELECT id, (ROW_NUMBER() OVER (ORDER BY deck_index, id) - 1) AS idx
         FROM ship_decks WHERE ship_id = $1
     )
     UPDATE ship_decks d SET deck_index = o.idx
       FROM ordered o
      WHERE d.id = o.id AND d.deck_index IS DISTINCT FROM o.idx`,
    [shipId]
  );
}

// POST /api/ships/decks/:deckId/move  { dir: 'up' | 'down' }
//
// Swaps a deck with its neighbour and renumbers. Decks stack bottom-up, so
// "up" means a HIGHER deck_index. Doing this server-side keeps the swap and the
// renumber in one place — the client only has to say which way.
router.post('/decks/:deckId/move', async (req, res) => {
  try {
    const dir = String((req.body || {}).dir || '').toLowerCase();
    if (dir !== 'up' && dir !== 'down') {
      return res.status(400).json({ error: "dir must be 'up' or 'down'" });
    }
    const deckId = Number(req.params.deckId);
    const own = await db.query('SELECT ship_id FROM ship_decks WHERE id=$1', [deckId]);
    if (!own.rows.length) return res.status(404).json({ error: 'Not found' });
    const shipId = own.rows[0].ship_id;

    // Repair first, so a ship that already has duplicates swaps predictably.
    await renumberDecks(shipId);

    const list = await db.query(
      'SELECT id FROM ship_decks WHERE ship_id=$1 ORDER BY deck_index, id',
      [shipId]
    );
    const ids = list.rows.map(r => r.id);
    const pos = ids.indexOf(deckId);
    const swapWith = dir === 'up' ? pos + 1 : pos - 1;
    if (pos < 0 || swapWith < 0 || swapWith >= ids.length) {
      // Already at the end of the stack — nothing to do, but the renumber above
      // may still have fixed something, so report the current state.
      const cur = await db.query('SELECT * FROM ship_decks WHERE ship_id=$1 ORDER BY deck_index', [shipId]);
      return res.json(cur.rows);
    }
    [ids[pos], ids[swapWith]] = [ids[swapWith], ids[pos]];

    // One statement, so the swap can't half-apply and leave a duplicate.
    await db.query(
      `UPDATE ship_decks d SET deck_index = v.idx
         FROM (SELECT * FROM unnest($1::int[], $2::int[]) AS t(id, idx)) v
        WHERE d.id = v.id`,
      [ids, ids.map((_, i) => i)]
    );

    const out = await db.query('SELECT * FROM ship_decks WHERE ship_id=$1 ORDER BY deck_index', [shipId]);
    res.json(out.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/ships/decks/:deckId — rename, resize, reorder, or rewrite the
// hull outline / transitions. JSON body (art is replaced via DELETE + POST).
router.patch('/decks/:deckId', async (req, res) => {
  try {
    const b = req.body || {};
    const r = await db.query(
      `UPDATE ship_decks SET
         name        = COALESCE($1, name),
         deck_index  = COALESCE($2, deck_index),
         grid_cols   = COALESCE($3, grid_cols),
         grid_rows   = COALESCE($4, grid_rows),
         hull_walls  = COALESCE($5, hull_walls),
         transitions = COALESCE($6, transitions),
         offset_col  = COALESCE($7, offset_col),
         offset_row  = COALESCE($8, offset_row),
         helm        = CASE WHEN $10::boolean THEN $11::jsonb ELSE helm END,
         is_sails    = COALESCE($12, is_sails),
         height_ft   = COALESCE($13, height_ft)
       WHERE id=$9 RETURNING *`,
      [
        b.name ?? null,
        b.deck_index ?? null,
        b.grid_cols != null ? Math.max(1, num(b.grid_cols, 4)) : null,
        b.grid_rows != null ? Math.max(1, num(b.grid_rows, 8)) : null,
        b.hull_walls ? JSON.stringify(b.hull_walls) : null,
        b.transitions ? JSON.stringify(b.transitions) : null,
        // Alignment nudge, in squares. Sent as a bare number so 0 is a real
        // value — `?? null` rather than `|| null`, or resetting a deck back to
        // flush would silently do nothing.
        b.offset_col != null ? num(b.offset_col, 0) : null,
        b.offset_row != null ? num(b.offset_row, 0) : null,
        req.params.deckId,
        // The helm needs a real "clear it" path, and COALESCE can't express
        // one: sending null to remove the helm is indistinguishable from not
        // mentioning it. So the write is gated on the key being PRESENT, and
        // `helm: null` then genuinely erases it.
        Object.prototype.hasOwnProperty.call(b, 'helm'),
        b.helm ? JSON.stringify(b.helm) : null,
        b.is_sails != null ? !!b.is_sails : null,
        b.height_ft != null ? clampHeight(b.height_ft) : null,
      ]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });

    // Main deck is exclusive per ship, so setting one clears the rest. Done as
    // a second statement rather than in the UPDATE above because it has to
    // touch that deck's SIBLINGS, and it only runs when the caller actually
    // sent the flag — a rename must not quietly move the main deck.
    if (Object.prototype.hasOwnProperty.call(b, 'is_main')) {
      const row = r.rows[0];
      if (b.is_main) {
        await db.query('UPDATE ship_decks SET is_main = (id = $1) WHERE ship_id = $2', [row.id, row.ship_id]);
        row.is_main = true;
      } else {
        await db.query('UPDATE ship_decks SET is_main = FALSE WHERE id = $1', [row.id]);
        row.is_main = false;
      }
      return res.json(row);
    }
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/ships/decks/:deckId
router.delete('/decks/:deckId', async (req, res) => {
  try {
    const r = await db.query(
      'DELETE FROM ship_decks WHERE id=$1 RETURNING image_path, ship_id',
      [req.params.deckId]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    if (r.rows[0].image_path) {
      fs.unlink(path.join(UPLOADS_DIR, r.rows[0].image_path), () => {});
    }
    // Deleting from the middle of the stack leaves a hole; close it.
    if (r.rows[0].ship_id != null) await renumberDecks(r.rows[0].ship_id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Placed instances ─────────────────────────────────────────────────────────

// GET /api/ships/placed?map_id=X — every ship on a map, decks attached.
// The map renderer needs the deck geometry to draw the active level and to
// project aboard tokens, so it always comes bundled.
router.get('/placed', async (req, res) => {
  try {
    const { map_id } = req.query;
    if (!map_id) return res.json([]);
    const ships = await db.query(
      `SELECT ms.*, sl.name AS class_name, sl.speed, sl.armor_class, sl.hull_hp, sl.air_bubble_ft
         FROM map_ships ms
         LEFT JOIN ship_library sl ON ms.library_id = sl.id
        WHERE ms.map_id=$1
        ORDER BY ms.z_index, ms.id`,
      [map_id]
    );
    if (!ships.rows.length) return res.json([]);
    const libIds = [...new Set(ships.rows.map(s => s.library_id).filter(Boolean))];
    const decks = libIds.length
      ? await db.query(
          'SELECT * FROM ship_decks WHERE ship_id = ANY($1::int[]) ORDER BY deck_index ASC',
          [libIds]
        )
      : { rows: [] };
    const byShip = new Map();
    for (const d of decks.rows) {
      if (!byShip.has(d.ship_id)) byShip.set(d.ship_id, []);
      byShip.get(d.ship_id).push(d);
    }
    res.json(ships.rows.map(s => ({ ...s, decks: byShip.get(s.library_id) || [] })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
