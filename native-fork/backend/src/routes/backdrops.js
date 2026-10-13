const express = require('express');
const { UPLOADS_DIR, ensureDir } = require('../paths');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');

const router = express.Router();

// Backdrops are scene art pushed to the players' screens when there's no map
// to run — a tavern interior, a cutscene still, a villain's portrait. They
// deliberately carry none of a map's machinery (no grid, walls, tokens or
// fog), because the whole point is the moments between encounters.
// Created here as well as in the Dockerfile: multer throws rather than
// creating a missing destination, and an existing install's uploads volume
// predates this directory.
const BACKDROPS_DIR = path.join(UPLOADS_DIR, 'backdrops');
fs.mkdirSync(BACKDROPS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: BACKDROPS_DIR,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  },
});

// GET /api/backdrops?session_id=X
router.get('/', async (req, res) => {
  try {
    const { session_id } = req.query;
    const result = session_id
      ? await db.query('SELECT * FROM backdrops WHERE session_id=$1 ORDER BY sort_order, id', [session_id])
      : await db.query('SELECT * FROM backdrops ORDER BY sort_order, id');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/backdrops  (multipart: image, name, session_id)
// Accepts several files at once so a GM can drop a whole scene folder in.
router.post('/', upload.array('images', 24), async (req, res) => {
  try {
    const files = req.files || [];
    if (!files.length) return res.status(400).json({ error: 'No images uploaded' });
    const { session_id, name } = req.body;

    const nextRes = await db.query(
      'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM backdrops WHERE session_id=$1',
      [session_id || null]
    );
    let order = nextRes.rows[0].next;

    const created = [];
    for (const f of files) {
      // A single upload can be named; a batch falls back to each file's own
      // name, minus the extension, so the list reads as scene titles rather
      // than a column of UUIDs.
      const label = (files.length === 1 && name)
        ? name
        : path.basename(f.originalname, path.extname(f.originalname));
      const r = await db.query(
        'INSERT INTO backdrops (session_id, name, image_path, sort_order) VALUES ($1,$2,$3,$4) RETURNING *',
        [session_id || null, label, `backdrops/${f.filename}`, order++]
      );
      created.push(r.rows[0]);
    }
    res.status(201).json(created);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/backdrops/:id — rename
router.patch('/:id', async (req, res) => {
  try {
    const { name } = req.body;
    const result = await db.query(
      'UPDATE backdrops SET name=COALESCE($1,name) WHERE id=$2 RETURNING *',
      [name, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/backdrops/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await db.query('SELECT image_path FROM backdrops WHERE id=$1', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });

    // sessions.backdrop_id is ON DELETE SET NULL, so a session showing this
    // backdrop simply falls back to its map — no dangling reference, and the
    // socket broadcast below is what actually clears the players' screens.
    await db.query('DELETE FROM backdrops WHERE id=$1', [req.params.id]);

    const abs = path.resolve(UPLOADS_DIR, result.rows[0].image_path);
    if (path.dirname(abs) === path.resolve(BACKDROPS_DIR)) fs.unlink(abs, () => { /* already gone */ });

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
