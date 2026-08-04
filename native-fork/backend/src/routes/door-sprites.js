const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');

const router = express.Router();

const SPRITE_DIR = path.join(__dirname, '../../uploads/door-sprites');
if (!fs.existsSync(SPRITE_DIR)) fs.mkdirSync(SPRITE_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: SPRITE_DIR,
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

// GET /api/door-sprites — every sprite in the library.
router.get('/', async (_req, res) => {
  try {
    const r = await db.query('SELECT * FROM door_sprites ORDER BY id ASC');
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/door-sprites — multipart upload; returns the new row.
router.post('/', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
    const imagePath = `door-sprites/${req.file.filename}`;
    const name = String(req.body.name || '').slice(0, 120) || 'Door';
    const r = await db.query(
      'INSERT INTO door_sprites (name, image_path) VALUES ($1,$2) RETURNING *',
      [name, imagePath]
    );
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/door-sprites/:id — removes the row and the file on disk.
router.delete('/:id', async (req, res) => {
  try {
    const r = await db.query('DELETE FROM door_sprites WHERE id=$1 RETURNING image_path', [req.params.id]);
    if (r.rows[0]) {
      const filePath = path.join(__dirname, '../../uploads', r.rows[0].image_path);
      fs.unlink(filePath, () => {}); // best-effort; ignore if already gone
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
