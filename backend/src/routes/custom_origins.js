// /api/custom-races and /api/custom-backgrounds
//
// CRUD + JSON export for GM-authored content. The `data` column is
// the entire race / background object (same shape as the frontend's
// hardcoded SRD entries) so the editor doesn't need its own column
// per field — adding a new field is a frontend change only.

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');

const router = express.Router();

// ─── RACES ─────────────────────────────────────────────────────

router.get('/races', async (req, res) => {
  try {
    const rows = (await db.query(
      `SELECT id, name, edition, parent_id, data, created_at, updated_at
       FROM custom_races ORDER BY parent_id NULLS FIRST, name`
    )).rows;
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/races', async (req, res) => {
  try {
    const { name, edition, parent_id, data } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'name required' });
    }
    const id = uuidv4();
    await db.query(
      `INSERT INTO custom_races (id, name, edition, parent_id, data)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, name, edition || 'custom', parent_id || null, JSON.stringify(data || {})]
    );
    res.json({ id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/races/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, edition, parent_id, data } = req.body;
    await db.query(
      `UPDATE custom_races
         SET name = COALESCE($2, name),
             edition = COALESCE($3, edition),
             parent_id = $4,
             data = COALESCE($5, data),
             updated_at = now()
       WHERE id = $1`,
      [id, name, edition, parent_id || null, data ? JSON.stringify(data) : null]
    );
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/races/:id', async (req, res) => {
  try {
    await db.query(`DELETE FROM custom_races WHERE id = $1`, [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/races/export', async (req, res) => {
  try {
    const ids = String(req.query.ids || '').split(',').filter(Boolean);
    let rows;
    if (ids.length > 0) {
      rows = (await db.query(
        `SELECT id, name, edition, parent_id, data FROM custom_races WHERE id = ANY($1::uuid[])`,
        [ids]
      )).rows;
    } else {
      rows = (await db.query(
        `SELECT id, name, edition, parent_id, data FROM custom_races`
      )).rows;
    }
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="custom-races.json"');
    res.send(JSON.stringify({ kind: 'races', rows }, null, 2));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── BACKGROUNDS ───────────────────────────────────────────────

router.get('/backgrounds', async (req, res) => {
  try {
    const rows = (await db.query(
      `SELECT id, name, data, created_at, updated_at FROM custom_backgrounds ORDER BY name`
    )).rows;
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/backgrounds', async (req, res) => {
  try {
    const { name, data } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'name required' });
    }
    const id = uuidv4();
    await db.query(
      `INSERT INTO custom_backgrounds (id, name, data) VALUES ($1, $2, $3)`,
      [id, name, JSON.stringify(data || {})]
    );
    res.json({ id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/backgrounds/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, data } = req.body;
    await db.query(
      `UPDATE custom_backgrounds
         SET name = COALESCE($2, name),
             data = COALESCE($3, data),
             updated_at = now()
       WHERE id = $1`,
      [id, name, data ? JSON.stringify(data) : null]
    );
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/backgrounds/:id', async (req, res) => {
  try {
    await db.query(`DELETE FROM custom_backgrounds WHERE id = $1`, [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/backgrounds/export', async (req, res) => {
  try {
    const ids = String(req.query.ids || '').split(',').filter(Boolean);
    let rows;
    if (ids.length > 0) {
      rows = (await db.query(
        `SELECT id, name, data FROM custom_backgrounds WHERE id = ANY($1::uuid[])`,
        [ids]
      )).rows;
    } else {
      rows = (await db.query(
        `SELECT id, name, data FROM custom_backgrounds`
      )).rows;
    }
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="custom-backgrounds.json"');
    res.send(JSON.stringify({ kind: 'backgrounds', rows }, null, 2));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── CLASSES ───────────────────────────────────────────────────
// Mirror of races/backgrounds. The `data` column carries the whole
// class kit (primary ability, hit die, saves, armor/weapons,
// starting equipment, multiclass prereq+grants, subclasses,
// per-level features, custom resources). The frontend reads it via
// /api/custom/classes and feeds the existing customClasses /
// customSubclasses / customClassChoices registries so dropdowns +
// the apply machinery automatically include them.

router.get('/classes', async (req, res) => {
  try {
    const rows = (await db.query(
      `SELECT id, name, data, created_at, updated_at FROM custom_classes ORDER BY name`
    )).rows;
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/classes', async (req, res) => {
  try {
    const { name, data } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'name required' });
    }
    const id = uuidv4();
    await db.query(
      `INSERT INTO custom_classes (id, name, data) VALUES ($1, $2, $3)`,
      [id, name, JSON.stringify(data || {})]
    );
    res.json({ id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/classes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, data } = req.body;
    await db.query(
      `UPDATE custom_classes
         SET name = COALESCE($2, name),
             data = COALESCE($3, data),
             updated_at = now()
       WHERE id = $1`,
      [id, name, data ? JSON.stringify(data) : null]
    );
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/classes/:id', async (req, res) => {
  try {
    await db.query(`DELETE FROM custom_classes WHERE id = $1`, [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/classes/export', async (req, res) => {
  try {
    const ids = String(req.query.ids || '').split(',').filter(Boolean);
    let rows;
    if (ids.length > 0) {
      rows = (await db.query(
        `SELECT id, name, data FROM custom_classes WHERE id = ANY($1::uuid[])`,
        [ids]
      )).rows;
    } else {
      rows = (await db.query(
        `SELECT id, name, data FROM custom_classes`
      )).rows;
    }
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="custom-classes.json"');
    res.send(JSON.stringify({ kind: 'classes', rows }, null, 2));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
