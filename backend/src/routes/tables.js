// /api/tables — rollable tables.
//
// A table is a name plus weighted rows. Weight rather than dice ranges because
// it's the same thing expressed without arithmetic: "1-3 nothing, 4-5 goblins,
// 6 dragon" is weights 3/2/1, and a GM adding a row to a weighted table doesn't
// have to renumber every row below it.
//
// Rolling happens over the socket (roll_table) so the result reaches the whole
// table and the roll log; this route is CRUD only.
const express = require('express');
const db = require('../db');

const router = express.Router();

// POST /api/tables/import-treasure — pull the DMG's treasure tables in.
//
// Idempotent by NAME: run it twice and the second run creates nothing, so the
// GM can press the button again after adding a book without ending up with two
// copies of Magic Item Table A.
router.post('/import-treasure', async (req, res) => {
  try {
    const { importTreasureTables } = require('../treasureTables');
    const result = await importTreasureTables(
      req.body?.source ? { source: String(req.body.source) } : {}
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tables — list with row counts, or ?full=1 for rows inline.
router.get('/', async (req, res) => {
  try {
    // ?kind=loot or ?kind=general narrows the list; no kind returns everything,
    // which is what the Tables tab wants so it can group them itself.
    const kind = String(req.query.kind || '').trim();
    const tables = (await db.query(
      `SELECT t.*, COUNT(r.id)::int AS row_count, COALESCE(SUM(r.weight), 0)::int AS weight_total
         FROM rollable_tables t
         LEFT JOIN rollable_table_rows r ON r.table_id = t.id
        ${kind ? 'WHERE t.kind = $1' : ''}
        GROUP BY t.id
        ORDER BY t.name`,
      kind ? [kind] : []
    )).rows;
    if (req.query.full) {
      const rows = (await db.query('SELECT * FROM rollable_table_rows ORDER BY table_id, sort_order, id')).rows;
      const byTable = new Map();
      for (const r of rows) {
        if (!byTable.has(r.table_id)) byTable.set(r.table_id, []);
        byTable.get(r.table_id).push(r);
      }
      for (const t of tables) t.rows = byTable.get(t.id) || [];
    }
    res.json(tables);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const t = (await db.query('SELECT * FROM rollable_tables WHERE id=$1', [req.params.id])).rows[0];
    if (!t) return res.status(404).json({ error: 'Not found' });
    t.rows = (await db.query(
      'SELECT * FROM rollable_table_rows WHERE table_id=$1 ORDER BY sort_order, id',
      [req.params.id]
    )).rows;
    res.json(t);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, description, rows, kind } = req.body;
    if (!name || !String(name).trim()) return res.status(400).json({ error: 'Name required' });
    const useKind = kind === 'loot' ? 'loot' : 'general';
    const t = (await db.query(
      'INSERT INTO rollable_tables (name, description, kind) VALUES ($1,$2,$3) RETURNING *',
      [String(name).trim(), description || '', useKind]
    )).rows[0];
    await replaceRows(t.id, rows);
    t.rows = await rowsFor(t.id);
    res.status(201).json(t);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, description, rows, kind } = req.body;
    const t = (await db.query(
      `UPDATE rollable_tables
          SET name = COALESCE($1, name), description = COALESCE($2, description),
              kind = COALESCE($4, kind)
        WHERE id=$3 RETURNING *`,
      [name ? String(name).trim() : null, description ?? null, req.params.id,
       kind === 'loot' || kind === 'general' ? kind : null]
    )).rows[0];
    if (!t) return res.status(404).json({ error: 'Not found' });
    // rows omitted = leave them alone; rows present = they are the new truth.
    if (Array.isArray(rows)) await replaceRows(t.id, rows);
    t.rows = await rowsFor(t.id);
    res.json(t);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM rollable_tables WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function rowsFor(id) {
  return (await db.query(
    'SELECT * FROM rollable_table_rows WHERE table_id=$1 ORDER BY sort_order, id',
    [id]
  )).rows;
}

async function replaceRows(tableId, rows) {
  if (!Array.isArray(rows)) return;
  await db.query('DELETE FROM rollable_table_rows WHERE table_id=$1', [tableId]);
  let order = 0;
  for (const r of rows) {
    const text = String(r?.text ?? '').trim();
    if (!text) continue;
    await db.query(
      'INSERT INTO rollable_table_rows (table_id, text, weight, sort_order) VALUES ($1,$2,$3,$4)',
      [tableId, text, Math.max(1, parseInt(r.weight, 10) || 1), order++]
    );
  }
}

module.exports = router;
