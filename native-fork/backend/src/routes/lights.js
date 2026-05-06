const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');

const router = express.Router();

router.get('/', async (req, res) => {
  const { mapId } = req.query;
  if (!mapId) return res.json([]);
  try {
    const result = await db.query(
      'SELECT * FROM light_sources WHERE map_id=$1 ORDER BY created_at',
      [mapId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const { map_id, x, y, bright_radius, dim_radius, label, color } = req.body;
  if (!map_id || x == null || y == null) return res.status(400).json({ error: 'Missing fields' });
  try {
    const result = await db.query(
      `INSERT INTO light_sources (id, map_id, x, y, bright_radius, dim_radius, label, color)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [uuidv4(), map_id, x, y, bright_radius || 60, dim_radius || 120, label || '', color || '#fbbf24']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM light_sources WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/', async (req, res) => {
  const { mapId } = req.query;
  if (!mapId) return res.status(400).json({ error: 'mapId required' });
  try {
    await db.query('DELETE FROM light_sources WHERE map_id=$1', [mapId]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
