const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { imageSizeFromFile } = require('image-size');
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

// POST /api/maps — upload a map
router.post('/', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
    const { name, grid_size, session_id } = req.body;
    const imagePath = `maps/${req.file.filename}`;
    const filePath = req.file.path;

    // Detect natural image dimensions
    let imgWidth = 2000, imgHeight = 1500;
    try {
      const dims = await imageSizeFromFile(filePath);
      if (dims.width && dims.height) {
        imgWidth = dims.width;
        imgHeight = dims.height;
      }
    } catch (sizeErr) {
      console.warn('Could not detect image size:', sizeErr.message);
    }

    const result = await db.query(
      'INSERT INTO maps (session_id, name, image_path, width, height, grid_size) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [session_id || null, name || req.file.originalname, imagePath, imgWidth, imgHeight, parseInt(grid_size) || 50]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/maps/:id
router.patch('/:id', async (req, res) => {
  try {
    const { name, grid_size } = req.body;
    const result = await db.query(
      'UPDATE maps SET name=COALESCE($1,name), grid_size=COALESCE($2,grid_size) WHERE id=$3 RETURNING *',
      [name, grid_size, req.params.id]
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
