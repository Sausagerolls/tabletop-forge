const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');

const router = express.Router();

// GET /api/walls?mapId=xxx
router.get('/', async (req, res) => {
  const { mapId } = req.query;
  if (!mapId) return res.json([]);
  try {
    const result = await db.query(
      'SELECT * FROM walls WHERE map_id=$1 ORDER BY created_at',
      [mapId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/walls
router.post('/', async (req, res) => {
  const { map_id, type, points } = req.body;
  if (!map_id || !type || !points) return res.status(400).json({ error: 'Missing fields' });
  try {
    const result = await db.query(
      'INSERT INTO walls (id, map_id, type, points) VALUES ($1,$2,$3,$4) RETURNING *',
      [uuidv4(), map_id, type, JSON.stringify(points)]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/walls/:id
router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM walls WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/walls?mapId=xxx  (clear all walls for a map)
router.delete('/', async (req, res) => {
  const { mapId } = req.query;
  if (!mapId) return res.status(400).json({ error: 'mapId required' });
  try {
    await db.query('DELETE FROM walls WHERE map_id=$1', [mapId]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
