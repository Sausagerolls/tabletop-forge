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
const { UPLOADS_DIR, ensureDir } = require('../paths');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 300 * 1024 * 1024 },
});

const UPLOADS_MAPS = ensureDir(path.join(UPLOADS_DIR, 'maps'));

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
    pushLOS(data.line_of_sight);
    pushLOS(data.objects_line_of_sight);

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
    const portals = toArray(data.portals);
    for (const batch of chunk(portals, 500)) {
      const vals = [], params = [];
      batch.forEach((portal, i) => {
        const bounds = toArray(portal.bounds);
        if (bounds.length < 2) return; // skip malformed portal
        const [x1, y1] = toXY(bounds[0]);
        const [x2, y2] = toXY(bounds[1]);
        // scale from grid units → pixels
        const b = i * 4; // 4 params per row
        vals.push(`($${b+1},$${b+2},'standard',$${b+3}::jsonb,$${b+4})`);
        params.push(uuidv4(), mapId, JSON.stringify([x1 * scale, y1 * scale, x2 * scale, y2 * scale]), !portal.closed);
      });
      if (vals.length)
        await db.query(
          `INSERT INTO doors (id, map_id, style, points, is_open) VALUES ${vals.join(',')}`,
          params
        );
    }

    // ── 6. Lights ─────────────────────────────────────────────────────────────
    // range is the total illumination radius in pixels.
    // bright = inner half, dim = full range (standard D&D convention).
    const srcLights = toArray(data.lights);
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
          light.color || '#fbbf24',
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
    });

  } catch (err) {
    console.error('dd2vtt import error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
