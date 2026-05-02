// /api/item-library — read API for the SRD-imported equipment +
// magic items. Mirror of the spell-library route's edition filter:
// players see only the active SRD edition the DM has selected; DMs
// see every row.

const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { search, type, rarity, sessionCode, role } = req.query;
    const params = [];
    const conds = [];
    if (search) {
      params.push(`%${search}%`);
      conds.push(`name ILIKE $${params.length}`);
    }
    if (type) {
      params.push(String(type));
      conds.push(`item_type = $${params.length}`);
    }
    if (rarity) {
      params.push(String(rarity));
      conds.push(`rarity = $${params.length}`);
    }
    if (sessionCode && role && role !== 'dm') {
      const sess = await db.query(
        'SELECT active_srd_edition FROM sessions WHERE session_code=$1',
        [sessionCode]
      );
      const ed = sess.rows[0]?.active_srd_edition || 'both';
      if (ed === '2014' || ed === '2024') {
        params.push(ed);
        conds.push(`edition = $${params.length}`);
      }
    }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const rows = (await db.query(
      `SELECT * FROM item_library ${where} ORDER BY item_type, name`,
      params
    )).rows;
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
