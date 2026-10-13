/**
 * POST /api/dd2vtt/import
 *
 * Accepts a Dungeondraft .dd2vtt export file and imports it as a fully-wired map.
 * Handles both array and object-with-numeric-keys formats produced by different
 * Dungeondraft versions, and both [x,y] and {x,y} coordinate styles.
 */
const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const { v4: uuidv4 } = require('uuid');
const db      = require('../db');
const { getDoorDefault } = require('../doorDefaults');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 300 * 1024 * 1024 },
});

const UPLOADS_MAPS = path.join(__dirname, '../../uploads/maps');

// ── Helpers ───────────────────────────────────────────────────────────────────

// Dungeondraft sometimes serialises arrays as objects with numeric keys.
// This normalises either form to a proper JS array.
function toArray(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === 'object') return Object.values(val);
  return [];
}

// Normalise a coordinate pair — either [x,y] or {x,y}
function toXY(pt) {
  if (Array.isArray(pt)) return [Number(pt[0]), Number(pt[1])];
  if (pt && typeof pt === 'object') return [Number(pt.x), Number(pt.y)];
  return [0, 0];
}

// Dungeondraft writes light colours as a bare 8-digit hex with no '#', and the
// alpha byte comes FIRST: AARRGGBB. The exports confirm it — every value in a
// real file starts 'ff' (opaque) and the remaining six are the hue, so
// 'ffe00808' is an opaque red brazier, not a 3%-alpha gold one. The rest of
// this app stores and renders '#rrggbb', and the raw value produced either an
// invalid CSS colour or, once parsed as a 32-bit int, a completely different
// hue. Alpha is dropped: brightness here is the bright/dim radius pair.
function normaliseColor(raw, fallback = '#fbbf24') {
  if (typeof raw !== 'string') return fallback;
  let h = raw.trim().replace(/^#/, '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  if (h.length === 8) h = h.slice(2);      // AARRGGBB — drop the leading alpha
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return fallback;
  return `#${h.toLowerCase()}`;
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function pngDimensions(buf) {
  if (buf.length < 24) return null;
  const sig = buf.slice(1, 4).toString('ascii');
  if (sig !== 'PNG') return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

// ── Shared import steps ───────────────────────────────────────────────────────
//
// Pulled out of the single-file route so the multilevel one can run them per
// level rather than growing a second copy that drifts.

// Decode the embedded image and write it into uploads/maps. Returns the stored
// relative path plus the dimensions the rest of the import needs.
function writeLevelImage(dataUrl) {
  const mimeMatch = dataUrl.match(/^data:(image\/(\w+));base64,/);
  const ext = mimeMatch ? `.${mimeMatch[2] === 'jpeg' ? 'jpg' : mimeMatch[2]}` : '.png';
  const buf = Buffer.from(dataUrl.replace(/^data:image\/\w+;base64,/, ''), 'base64');
  const fname = `${uuidv4()}${ext}`;
  fs.writeFileSync(path.join(UPLOADS_MAPS, fname), buf);
  return { rel: `maps/${fname}`, buf, ext };
}

// Is this opening in an EXTERIOR wall?
//
// A .dd2vtt portal says where the opening is and whether it is shut, and
// nothing else — there is no flag anywhere in the format saying "window". But a
// window is almost always in an outside wall and a door usually is not, so the
// geometry answers it well enough to be worth guessing from. The GM corrects
// the guess afterwards; it only has to be right often enough to save clicking.
//
// The test is ESCAPE, not parity.
//
// The obvious approach — cast one ray and call an odd crossing count "inside" —
// is wrong here, and wrong in a way that produces confident nonsense. Parity
// only holds when every segment belongs to a closed loop, and an interior
// partition running wall to wall is a chord: crossing it flips the parity of
// everything beyond it. On a two-room cottage that marked the interior door as
// exterior and the front door as interior, which is precisely backwards.
//
// So instead: from a point, can you get out? Cast rays in a fan; if ANY of them
// reaches open space without crossing a wall, that point is outside the
// building. A point in a room is enclosed in every direction no matter how many
// partitions are around it. A portal with one side enclosed and the other able
// to escape is in an exterior wall.
//
// Only structural walls are used — `line_of_sight`, never
// `objects_line_of_sight`. Furniture stands inside rooms and would wall a point
// in that should have escaped.
const ESCAPE_RAYS = 24;

function canEscape(px, py, wallSegs) {
  for (let i = 0; i < ESCAPE_RAYS; i++) {
    // Off-axis by half a step so a ray never runs exactly along a wall, where
    // the intersection maths is meaningless.
    const a = ((i + 0.5) / ESCAPE_RAYS) * Math.PI * 2;
    const rdx = Math.cos(a), rdy = Math.sin(a);
    let blocked = false;
    for (const [ax, ay, bx, by] of wallSegs) {
      const rx = bx - ax, ry = by - ay;
      const den = rdx * ry - rdy * rx;
      if (Math.abs(den) < 1e-12) continue;
      const t = ((ax - px) * ry - (ay - py) * rx) / den;
      const u = ((ax - px) * rdy - (ay - py) * rdx) / den;
      if (t > 1e-6 && u >= 0 && u <= 1) { blocked = true; break; }
    }
    if (!blocked) return true;   // a clear line out
  }
  return false;                  // enclosed in every direction
}

function isExteriorPortal(portalPts, wallSegs) {
  const [x1, y1, x2, y2] = portalPts;
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return false;
  // Unit normal to the opening.
  const nx = -dy / len, ny = dx / len;
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  // Far enough off the wall to be clear of it, close enough to still be in the
  // room it belongs to.
  const step = Math.max(len * 0.75, 1e-3);

  const outA = canEscape(mx + nx * step, my + ny * step, wallSegs);
  const outB = canEscape(mx - nx * step, my - ny * step, wallSegs);
  // Enclosed on one side, open air on the other.
  return outA !== outB;
}

// Everything geometric in one .dd2vtt, converted into this app's pixel space.
//
// dd2vtt coordinates are in GRID UNITS; multiplying by pixels-per-grid gives
// the pixel coords stored here. `offset` shifts a level that was exported on a
// differently-placed canvas into agreement with level 0.
function parseLevelGeometry(data, want, { offsetX = 0, offsetY = 0 } = {}) {
  const resolution = data.resolution || {};
  const scale = Math.round(Number(resolution.pixels_per_grid) || 0) || 140;
  const ox = Number(offsetX) || 0;
  const oy = Number(offsetY) || 0;

  const walls = [];
  const pushLOS = (raw) => {
    for (const polyline of toArray(raw)) {
      const pts = toArray(polyline);
      for (let i = 0; i < pts.length - 1; i++) {
        const [x1, y1] = toXY(pts[i]);
        const [x2, y2] = toXY(pts[i + 1]);
        walls.push([x1 * scale + ox, y1 * scale + oy, x2 * scale + ox, y2 * scale + oy]);
      }
    }
  };
  if (want.walls) {
    pushLOS(data.line_of_sight);
    pushLOS(data.objects_line_of_sight);
  }

  const doors = [];
  if (want.doors) {
    // Structural walls only — see isExteriorPortal for why furniture is left
    // out of the parity test.
    const structural = [];
    for (const polyline of toArray(data.line_of_sight)) {
      const pts = toArray(polyline);
      for (let i = 0; i < pts.length - 1; i++) {
        const [ax, ay] = toXY(pts[i]);
        const [bx, by] = toXY(pts[i + 1]);
        structural.push([ax * scale + ox, ay * scale + oy, bx * scale + ox, by * scale + oy]);
      }
    }
    for (const portal of toArray(data.portals)) {
      const bounds = toArray(portal.bounds);
      if (bounds.length < 2) continue;
      const [x1, y1] = toXY(bounds[0]);
      const [x2, y2] = toXY(bounds[1]);
      const pts = [x1 * scale + ox, y1 * scale + oy, x2 * scale + ox, y2 * scale + oy];
      let kind = 'door';
      try {
        if (isExteriorPortal(pts, structural)) kind = 'window';
      } catch { /* a guess that throws is just a door */ }
      doors.push({ points: pts, isOpen: !portal.closed, kind });
    }
  }

  const lights = [];
  if (want.lights) {
    for (const light of toArray(data.lights)) {
      const pos = light.position || {};
      const [lx, ly] = toXY(pos.x !== undefined ? pos : [pos[0], pos[1]]);
      const range = Number(light.range) || 0;
      lights.push({
        x: lx * scale + ox,
        y: ly * scale + oy,
        bright: Math.round(range * scale / 2),
        dim: Math.round(range * scale),
        color: normaliseColor(light.color),
      });
    }
  }

  return { scale, walls, doors, lights, resolution };
}

// Write one level's geometry, tagged with its storey.
async function insertLevelGeometry(mapId, levelIndex, geo) {
  for (const batch of chunk(geo.walls, 500)) {
    const vals = [], params = [];
    batch.forEach((pts, i) => {
      const b = i * 4;
      vals.push(`($${b+1},$${b+2},'line',$${b+3}::jsonb,$${b+4})`);
      params.push(uuidv4(), mapId, JSON.stringify(pts), levelIndex);
    });
    if (vals.length) {
      await db.query(
        `INSERT INTO walls (id, map_id, type, points, level_index) VALUES ${vals.join(',')}`,
        params
      );
    }
  }
  // The GM's default look, applied as the doors are imported. Read once for
  // the whole import rather than per row — a floor can carry hundreds.
  const dflt = await getDoorDefault();
  for (const batch of chunk(geo.doors, 500)) {
    const vals = [], params = [];
    batch.forEach((d, i) => {
      const b = i * 8;
      vals.push(`($${b+1},$${b+2},'standard',$${b+3}::jsonb,$${b+4},$${b+5},$${b+6},$${b+7},$${b+8})`);
      const kind = d.kind || 'door';
      // Windows stay plain; only real doors take the door art.
      const sp = kind === 'door' ? dflt.spritePath : null;
      params.push(uuidv4(), mapId, JSON.stringify(d.points), d.isOpen, levelIndex, kind,
        sp, kind === 'door' ? dflt.spriteMotion : 'swing');
    });
    if (vals.length) {
      await db.query(
        `INSERT INTO doors (id, map_id, style, points, is_open, level_index, portal_kind,
                            sprite_path, sprite_motion) VALUES ${vals.join(',')}`,
        params
      );
    }
  }
  for (const batch of chunk(geo.lights, 500)) {
    const vals = [], params = [];
    batch.forEach((l, i) => {
      const b = i * 9;
      vals.push(`($${b+1},$${b+2},$${b+3},$${b+4},$${b+5},$${b+6},$${b+7},$${b+8},$${b+9})`);
      params.push(uuidv4(), mapId, l.x, l.y, l.bright, l.dim, '', l.color, levelIndex);
    });
    if (vals.length) {
      await db.query(
        `INSERT INTO light_sources (id, map_id, x, y, bright_radius, dim_radius, label, color, level_index)
         VALUES ${vals.join(',')}`,
        params
      );
    }
  }
}

// ── Route ─────────────────────────────────────────────────────────────────────

router.post('/import', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  let data;
  try {
    data = JSON.parse(req.file.buffer.toString('utf8'));
  } catch (e) {
    return res.status(400).json({ error: 'Invalid .dd2vtt file — not valid JSON' });
  }

  const { session_id, name } = req.body;

  // Opt-outs from the GM's import dialog. Multipart values arrive as strings,
  // and anything not explicitly switched off stays on — an import with no
  // options set behaves exactly as it always did.
  const isOff = (v) => v === 'false' || v === '0' || v === 'off';
  const want = {
    walls:  !isOff(req.body.import_walls),
    doors:  !isOff(req.body.import_doors),
    lights: !isOff(req.body.import_lights),
  };

  try {
    // ── 1. Extract map image ──────────────────────────────────────────────────
    const dataUrl = data.image || '';
    if (!dataUrl) return res.status(400).json({ error: 'No image found in .dd2vtt file' });

    const mimeMatch = dataUrl.match(/^data:(image\/(\w+));base64,/);
    const ext    = mimeMatch ? `.${mimeMatch[2] === 'jpeg' ? 'jpg' : mimeMatch[2]}` : '.png';
    const imgBuf = Buffer.from(dataUrl.replace(/^data:image\/\w+;base64,/, ''), 'base64');
    const fname  = `${uuidv4()}${ext}`;
    fs.writeFileSync(path.join(UPLOADS_MAPS, fname), imgBuf);

    // ── 2. Dimensions + grid ──────────────────────────────────────────────────
    const resolution    = data.resolution || {};
    const pixelsPerGrid = Math.round(Number(resolution.pixels_per_grid) || 0) || 140;
    const mapSize       = resolution.map_size || { x: 0, y: 0 };

    const pngDims   = ext === '.png' ? pngDimensions(imgBuf) : null;
    const imgWidth  = pngDims?.width  || Math.round((mapSize.x || 0) * pixelsPerGrid) || 2000;
    const imgHeight = pngDims?.height || Math.round((mapSize.y || 0) * pixelsPerGrid) || 1500;
    const mapName   = (name && name.trim()) ? name.trim() : 'Dungeondraft Import';

    // ── 3. Create map record ──────────────────────────────────────────────────
    const mapRow = (await db.query(
      `INSERT INTO maps (session_id, name, image_path, width, height, grid_size)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [session_id || null, mapName, `maps/${fname}`, imgWidth, imgHeight, pixelsPerGrid]
    )).rows[0];
    const mapId = mapRow.id;

    // ── 4. Walls ──────────────────────────────────────────────────────────────
    // dd2vtt coordinates are in GRID UNITS (e.g. 0–40 for a 40-grid map).
    // Multiply by pixelsPerGrid to get the pixel-space coords our system stores.
    const scale = pixelsPerGrid;

    const wallSegs = [];
    const pushLOS = (raw) => {
      for (const polyline of toArray(raw)) {
        const pts = toArray(polyline);
        for (let i = 0; i < pts.length - 1; i++) {
          const [x1, y1] = toXY(pts[i]);
          const [x2, y2] = toXY(pts[i + 1]);
          wallSegs.push([x1 * scale, y1 * scale, x2 * scale, y2 * scale]);
        }
      }
    };
    if (want.walls) {
      pushLOS(data.line_of_sight);
      pushLOS(data.objects_line_of_sight);
    }

    for (const batch of chunk(wallSegs, 500)) {
      const vals = [], params = [];
      batch.forEach((pts, i) => {
        const b = i * 3; // 3 params per row: id, map_id, points ('line' is literal)
        vals.push(`($${b+1},$${b+2},'line',$${b+3}::jsonb)`);
        params.push(uuidv4(), mapId, JSON.stringify(pts));
      });
      if (vals.length)
        await db.query(
          `INSERT INTO walls (id, map_id, type, points) VALUES ${vals.join(',')}`,
          params
        );
    }

    // ── 5. Portals → doors ────────────────────────────────────────────────────
    const portals = want.doors ? toArray(data.portals) : [];
    // Read once for the import, not per portal.
    const dflt2 = await getDoorDefault();
    // Structural walls only, for the door/window guess — see isExteriorPortal.
    const structuralSegs = [];
    if (want.doors) {
      for (const polyline of toArray(data.line_of_sight)) {
        const pts = toArray(polyline);
        for (let i = 0; i < pts.length - 1; i++) {
          const [ax, ay] = toXY(pts[i]);
          const [bx, by] = toXY(pts[i + 1]);
          structuralSegs.push([ax * scale, ay * scale, bx * scale, by * scale]);
        }
      }
    }
    for (const batch of chunk(portals, 500)) {
      const vals = [], params = [];
      let n = 0;
      batch.forEach((portal) => {
        const bounds = toArray(portal.bounds);
        if (bounds.length < 2) return; // skip malformed portal
        const [x1, y1] = toXY(bounds[0]);
        const [x2, y2] = toXY(bounds[1]);
        // scale from grid units → pixels
        const pts = [x1 * scale, y1 * scale, x2 * scale, y2 * scale];
        let kind = 'door';
        try {
          if (isExteriorPortal(pts, structuralSegs)) kind = 'window';
        } catch { /* a guess that throws is just a door */ }
        // Indexed by ROWS ACTUALLY PUSHED, not by position in the batch: a
        // malformed portal returns early, and numbering from the loop index
        // would leave a gap in the placeholders and shift every later row's
        // parameters by one.
        const b = n * 7;
        n++;
        vals.push(`($${b+1},$${b+2},'standard',$${b+3}::jsonb,$${b+4},$${b+5},$${b+6},$${b+7})`);
        params.push(uuidv4(), mapId, JSON.stringify(pts), !portal.closed, kind,
          kind === 'door' ? dflt2.spritePath : null,
          kind === 'door' ? dflt2.spriteMotion : 'swing');
      });
      if (vals.length)
        await db.query(
          `INSERT INTO doors (id, map_id, style, points, is_open, portal_kind,
                              sprite_path, sprite_motion) VALUES ${vals.join(',')}`,
          params
        );
    }

    // ── 6. Lights ─────────────────────────────────────────────────────────────
    // range is the total illumination radius in pixels.
    // bright = inner half, dim = full range (standard D&D convention).
    const srcLights = want.lights ? toArray(data.lights) : [];
    for (const batch of chunk(srcLights, 500)) {
      const vals = [], params = [];
      batch.forEach((light, i) => {
        const pos = light.position || {};
        const [lx, ly] = toXY(pos.x !== undefined ? pos : [pos[0], pos[1]]);
        const range = Number(light.range) || 0;
        const b = i * 8; // 8 params per row
        vals.push(`($${b+1},$${b+2},$${b+3},$${b+4},$${b+5},$${b+6},$${b+7},$${b+8})`);
        params.push(
          uuidv4(), mapId,
          lx * scale, ly * scale,           // position: grid units → pixels
          Math.round(range * scale / 2),    // bright_radius
          Math.round(range * scale),        // dim_radius
          '',
          normaliseColor(light.color),
        );
      });
      if (vals.length)
        await db.query(
          `INSERT INTO light_sources (id, map_id, x, y, bright_radius, dim_radius, label, color)
           VALUES ${vals.join(',')}`,
          params
        );
    }

    res.status(201).json({
      map:       mapRow,
      wallCount: wallSegs.length,
      doorCount: portals.length,
      lightCount: srcLights.length,
      skipped: Object.entries(want).filter(([, on]) => !on).map(([k]) => k),
    });

  } catch (err) {
    console.error('dd2vtt import error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/dd2vtt/import-multi
 *
 * Several .dd2vtt files, ground floor first, imported as ONE map with a stack
 * of levels.
 *
 * The Universal VTT format has no concept of levels — one file is one storey —
 * so a multi-storey building necessarily arrives as N files and is stitched
 * together here. Level 0's image is also the map's own image, so every existing
 * reader of a map keeps working and a one-file import is just the N=1 case.
 *
 * Ordering is the CALLER's, not the filesystem's: browsers hand back
 * multi-selected files in an arbitrary order, and "which of these is the ground
 * floor" is a question only the GM can answer.
 */
router.post('/import-multi', upload.array('files', 12), async (req, res) => {
  const files = req.files || [];
  if (!files.length) return res.status(400).json({ error: 'No files uploaded' });

  const isOff = (v) => v === 'false' || v === '0' || v === 'off';
  const want = {
    walls:  !isOff(req.body.import_walls),
    doors:  !isOff(req.body.import_doors),
    lights: !isOff(req.body.import_lights),
  };

  // Per-level metadata, parallel to the file list. Multipart repeats a field
  // name once per value, and multer gives back a string for one and an array
  // for several — normalise both to an array so index N always lines up with
  // file N.
  const asList = (v) => (v === undefined ? [] : (Array.isArray(v) ? v : [v]));
  const names = asList(req.body.level_names);
  const heights = asList(req.body.level_heights);
  // The GM's ordering, as indices into the uploaded file list.
  const order = asList(req.body.level_order).map((n) => parseInt(n, 10));

  try {
    const ordered = order.length === files.length && order.every((n) => Number.isInteger(n) && files[n])
      ? order.map((n) => ({ file: files[n], meta: n }))
      : files.map((f, i) => ({ file: f, meta: i }));

    // Parse everything BEFORE writing anything. A bad file in the middle of the
    // stack should fail the whole import rather than leave a half-built map
    // with three of its five floors.
    const parsed = [];
    for (const { file, meta } of ordered) {
      let data;
      try {
        data = JSON.parse(file.buffer.toString('utf8'));
      } catch {
        return res.status(400).json({ error: `${file.originalname} is not valid JSON` });
      }
      if (!data.image) {
        return res.status(400).json({ error: `${file.originalname} has no image` });
      }
      parsed.push({ data, meta, originalname: file.originalname });
    }

    // Level 0 sets the map's dimensions and grid; the rest are aligned to it.
    const base = parsed[0].data;
    const baseRes = base.resolution || {};
    const pixelsPerGrid = Math.round(Number(baseRes.pixels_per_grid) || 0) || 140;
    const baseSize = baseRes.map_size || { x: 0, y: 0 };

    const written = [];
    for (const p of parsed) written.push(writeLevelImage(p.data.image));

    const baseDims = written[0].ext === '.png' ? pngDimensions(written[0].buf) : null;
    const imgWidth = baseDims?.width || Math.round((baseSize.x || 0) * pixelsPerGrid) || 2000;
    const imgHeight = baseDims?.height || Math.round((baseSize.y || 0) * pixelsPerGrid) || 1500;
    const mapName = (req.body.name && req.body.name.trim()) ? req.body.name.trim() : 'Dungeondraft Import';

    const mapRow = (await db.query(
      `INSERT INTO maps (session_id, name, image_path, width, height, grid_size)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [req.body.session_id || null, mapName, written[0].rel, imgWidth, imgHeight, pixelsPerGrid]
    )).rows[0];
    const mapId = mapRow.id;

    let wallCount = 0, doorCount = 0, lightCount = 0;
    const levels = [];
    for (let i = 0; i < parsed.length; i++) {
      const { data, meta, originalname } = parsed[i];
      const img = written[i];
      const dims = img.ext === '.png' ? pngDimensions(img.buf) : null;

      // Alignment. Each level is centred against level 0 rather than pinned to
      // a shared origin: Dungeondraft crops each storey to its own content, so
      // an upper floor is usually a smaller canvas, and lining up their
      // top-left corners would shunt it into the corner of the building.
      const w = dims?.width || imgWidth;
      const h = dims?.height || imgHeight;
      const offsetX = (imgWidth - w) / 2;
      const offsetY = (imgHeight - h) / 2;

      const rawName = names[meta];
      const levelName = (typeof rawName === 'string' && rawName.trim())
        ? rawName.trim().slice(0, 80)
        : (i === 0 ? 'Ground' : `Level ${i}`);
      const rawH = Number(heights[meta]);
      const heightFt = Number.isFinite(rawH) && rawH > 0 ? Math.min(200, rawH) : 10;

      await db.query(
        `INSERT INTO map_levels (map_id, level_index, name, image_path, width, height, offset_x, offset_y, height_ft)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [mapId, i, levelName, img.rel, w, h, offsetX, offsetY, heightFt]
      );

      const geo = parseLevelGeometry(data, want, { offsetX, offsetY });
      await insertLevelGeometry(mapId, i, geo);
      wallCount += geo.walls.length;
      doorCount += geo.doors.length;
      lightCount += geo.lights.length;
      levels.push({ level_index: i, name: levelName, height_ft: heightFt, source: originalname });
    }

    res.status(201).json({
      map: mapRow,
      levels,
      wallCount,
      doorCount,
      lightCount,
      skipped: Object.entries(want).filter(([, on]) => !on).map(([k]) => k),
    });
  } catch (err) {
    console.error('dd2vtt multilevel import error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
// Shared with the tile importer, which needs the same reading of a .dd2vtt's
// walls, doors and lights but lays them into a TILE rather than a whole map.
// Exported rather than copied: the parsing has a lot of judgement in it (the
// escape test for windows, structural-only line of sight) and two readings of
// the same format would drift apart on the next Dungeondraft change.
module.exports.parseLevelGeometry = parseLevelGeometry;
module.exports.pngDimensions = pngDimensions;
