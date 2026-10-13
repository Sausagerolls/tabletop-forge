// /api/item-library — read API for the SRD-imported equipment +
// magic items. Mirror of the spell-library route's edition filter:
// players see only the active SRD edition the GM has selected; GMs
// see every row.

const express = require('express');
const db = require('../db');
const { asksAsDm } = require('../itemSecrets');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { search, type, rarity, edition, sessionCode, role } = req.query;
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
    // Explicit edition filter, for a GM narrowing the library by hand. The
    // session-driven filter below is a different thing: that one HIDES the
    // other edition from players, and is not a choice they make.
    if (edition === '2014' || edition === '2024') {
      params.push(edition);
      conds.push(`edition = $${params.length}`);
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
    // A library row can carry a GM secret, and this endpoint is reachable by a
    // player client (it already filters editions for them). Removed rather than
    // blanked, for the reason given in itemSecrets.js: an empty `gm_secret`
    // would itself announce that the item has something to find.
    if (asksAsDm(req)) return res.json(rows);
    res.json(rows.map((r) => {
      if (!r || !('gm_secret' in r)) return r;
      const out = { ...r };
      delete out.gm_secret;
      return out;
    }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
