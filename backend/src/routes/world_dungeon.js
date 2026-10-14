// /api/world-dungeon — storage for the World Dungeon GM tools (the rules
// site's Dungeon Builder at /rules/gm/dungeon-builder.html).
//
// Two kinds of document, both plain JSON the tool owns:
//   • kit  — the GM's physical tiles and props (one per server)
//   • map  — a generated dungeon map, kept until the GM deletes it
// The server never interprets the contents, so the tool can change its format
// without a migration here.
const express = require('express');
const db = require('../db');

const router = express.Router();

const ready = db.query(`
  CREATE TABLE IF NOT EXISTS wd_documents (
    id SERIAL PRIMARY KEY,
    kind VARCHAR(40) NOT NULL,
    name VARCHAR(255) NOT NULL DEFAULT '',
    data JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  )
`).then(() => db.query('CREATE INDEX IF NOT EXISTS wd_documents_kind ON wd_documents (kind)'))
  .catch((err) => console.error('wd_documents migration error:', err));

const wrap = (fn) => async (req, res) => {
  try { await ready; await fn(req, res); } catch (err) { res.status(500).json({ error: err.message }); }
};

// GET /api/world-dungeon/kit — the GM's tiles and props ({} until saved).
router.get('/kit', wrap(async (req, res) => {
  const r = await db.query("SELECT data, updated_at FROM wd_documents WHERE kind = 'kit' ORDER BY id LIMIT 1");
  res.json(r.rows[0] ? { data: r.rows[0].data, updated_at: r.rows[0].updated_at } : { data: {} });
}));

// PUT /api/world-dungeon/kit { data }
router.put('/kit', wrap(async (req, res) => {
  const data = JSON.stringify(req.body?.data || {});
  const r = await db.query(
    "UPDATE wd_documents SET data = $1, updated_at = NOW() WHERE id = (SELECT id FROM wd_documents WHERE kind = 'kit' ORDER BY id LIMIT 1) RETURNING id",
    [data]
  );
  if (!r.rowCount) await db.query("INSERT INTO wd_documents (kind, name, data) VALUES ('kit', 'Kit', $1)", [data]);
  res.json({ ok: true });
}));

// GET /api/world-dungeon/maps — list without the map data.
router.get('/maps', wrap(async (req, res) => {
  const r = await db.query("SELECT id, name, created_at, updated_at FROM wd_documents WHERE kind = 'map' ORDER BY updated_at DESC");
  res.json(r.rows);
}));

router.get('/maps/:id', wrap(async (req, res) => {
  const r = await db.query("SELECT * FROM wd_documents WHERE kind = 'map' AND id = $1", [Number(req.params.id)]);
  if (!r.rows[0]) return res.status(404).json({ error: 'Map not found' });
  res.json(r.rows[0]);
}));

// POST /api/world-dungeon/maps { name, data }
router.post('/maps', wrap(async (req, res) => {
  const r = await db.query(
    "INSERT INTO wd_documents (kind, name, data) VALUES ('map', $1, $2) RETURNING id, name, created_at, updated_at",
    [String(req.body?.name || 'Untitled map').slice(0, 255), JSON.stringify(req.body?.data || {})]
  );
  res.json(r.rows[0]);
}));

// PUT /api/world-dungeon/maps/:id { name?, data? } — rename, or save edits.
router.put('/maps/:id', wrap(async (req, res) => {
  const id = Number(req.params.id);
  const name = req.body?.name != null ? String(req.body.name).slice(0, 255) : null;
  const data = req.body?.data != null ? JSON.stringify(req.body.data) : null;
  const r = await db.query(
    `UPDATE wd_documents SET name = COALESCE($2, name), data = COALESCE($3::jsonb, data), updated_at = NOW()
      WHERE kind = 'map' AND id = $1 RETURNING id, name, created_at, updated_at`,
    [id, name, data]
  );
  if (!r.rows[0]) return res.status(404).json({ error: 'Map not found' });
  res.json(r.rows[0]);
}));

router.delete('/maps/:id', wrap(async (req, res) => {
  await db.query("DELETE FROM wd_documents WHERE kind = 'map' AND id = $1", [Number(req.params.id)]);
  res.json({ ok: true });
}));

module.exports = router;
