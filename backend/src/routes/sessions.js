const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');

const router = express.Router();

function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// POST /api/sessions — create session
router.post('/', async (req, res) => {
  try {
    const { name, dmPassword } = req.body;
    if (!name || !dmPassword) return res.status(400).json({ error: 'Name and GM password required' });

    const hash = await bcrypt.hash(dmPassword, 10);
    let code;
    let attempts = 0;
    do {
      code = generateCode();
      attempts++;
      if (attempts > 20) return res.status(500).json({ error: 'Could not generate unique code' });
      const exists = await db.query('SELECT id FROM sessions WHERE session_code=$1', [code]);
      if (!exists.rows.length) break;
    } while (true);

    const result = await db.query(
      'INSERT INTO sessions (name, session_code, dm_password_hash) VALUES ($1,$2,$3) RETURNING id, name, session_code',
      [name, code, hash]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sessions/:code — get session info (public)
router.get('/:code', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT s.id, s.name, s.session_code, s.map_id, s.grid_size,
              m.image_path AS map_image, m.name AS map_name, m.width, m.height
       FROM sessions s LEFT JOIN maps m ON s.map_id = m.id
       WHERE s.session_code = $1`,
      [req.params.code.toUpperCase()]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Session not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sessions/:code/verify-dm — verify GM password
router.post('/:code/verify-dm', async (req, res) => {
  try {
    const { dmPassword } = req.body;
    const result = await db.query(
      'SELECT dm_password_hash FROM sessions WHERE session_code=$1',
      [req.params.code.toUpperCase()]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Session not found' });
    const valid = await bcrypt.compare(dmPassword || '', result.rows[0].dm_password_hash);
    res.json({ valid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sessions/:code/tokens — get all tokens for a session
router.get('/:code/tokens', async (req, res) => {
  try {
    const session = await db.query(
      'SELECT id FROM sessions WHERE session_code=$1',
      [req.params.code.toUpperCase()]
    );
    if (!session.rows.length) return res.status(404).json({ error: 'Not found' });

    const tokens = await db.query(
      `SELECT st.*, c.image_path AS creature_image
       FROM session_tokens st
       LEFT JOIN creatures c ON st.creature_id = c.id
       WHERE st.session_id = $1
       ORDER BY st.z_index, st.id`,
      [session.rows[0].id]
    );
    res.json(tokens.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sessions/:id/spawn-points — every named spawn point across
// every map in this session. Used by the GM-only right-click "Send to
// map → spawn point" submenu so it can list points for maps the GM
// isn't currently viewing without firing one fetch per map.
router.get('/:id/spawn-points', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT sp.*
         FROM map_spawn_points sp
         JOIN maps m ON sp.map_id = m.id
        WHERE m.session_id = $1
        ORDER BY sp.map_id, sp.created_at`,
      [req.params.id]
    );
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
