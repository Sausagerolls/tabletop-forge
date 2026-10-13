const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const gm = require('../gmAccounts');

const router = express.Router();

function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// POST /api/sessions — create session
router.post('/', async (req, res) => {
  try {
    const { name, dmPassword } = req.body;
    // A SIGNED-IN GM NEEDS NO SESSION PASSWORD.
    //
    // Their account is the credential, and the new session is paired to it on
    // the spot. One is still generated and stored, because a session password
    // remains the way a guest GM or a second screen gets in without the
    // account — it is simply not something anyone has to invent or remember.
    const account = await gm.accountForToken(db, gm.tokenFrom(req));
    if (!name) return res.status(400).json({ error: 'Name required' });
    if (!dmPassword && !account) return res.status(400).json({ error: 'Name and GM password required' });

    const password = dmPassword || require('crypto').randomBytes(6).toString('base64url');
    const hash = await bcrypt.hash(password, 10);
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
      // session_started=false explicitly: the column defaults to true so that
      // pre-existing sessions are untouched by the migration, but every NEW
      // session opens in the lobby.
      `INSERT INTO sessions (name, session_code, dm_password_hash, session_started, owner_account_id)
       VALUES ($1,$2,$3,false,$4)
       RETURNING id, name, session_code, session_started, owner_account_id`,
      [name, code, hash, account ? account.id : null]
    );
    // The generated password goes back ONCE, to the GM who just made the
    // session, so they can hand it to a co-GM or keep it somewhere. It is not
    // readable afterwards — only its hash is stored.
    res.status(201).json({
      ...result.rows[0],
      ...(dmPassword ? {} : { generated_dm_password: password }),
      paired: !!account,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sessions/:code — get session info (public)
router.get('/:code', async (req, res) => {
  try {
    const result = await db.query(
      // backdrop_* rides along so a player joining (or refreshing) mid-scene
      // lands straight on the art rather than flashing the map first.
      `SELECT s.id, s.name, s.session_code, s.map_id, s.grid_size, s.session_started,
              m.image_path AS map_image, m.name AS map_name, m.width, m.height,
              -- Aliased to match what every view actually reads (session.map_width).
              -- Image-backed maps never noticed the gap because MapStage falls back
              -- to the loaded image's natural size; a wildspace map has no such
              -- image, so these must arrive correct on the very first load.
              m.width AS map_width, m.height AS map_height, m.map_type AS map_type,
              m.grid_cols AS map_grid_cols, m.grid_rows AS map_grid_rows,
              m.grid_size AS map_grid_size,
              s.backdrop_id, b.image_path AS backdrop_image, b.name AS backdrop_name,
              b.source_image_path AS backdrop_source
       FROM sessions s
       LEFT JOIN maps m ON s.map_id = m.id
       LEFT JOIN backdrops b ON s.backdrop_id = b.id
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
      'SELECT id, dm_password_hash, owner_account_id FROM sessions WHERE session_code=$1',
      [req.params.code.toUpperCase()]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Session not found' });
    // A paired account passes without a password, so the screens that check
    // before navigating can use the same endpoint whichever way the GM got in.
    const account = await gm.accountForToken(db, gm.tokenFrom(req));
    if (account && result.rows[0].owner_account_id === account.id) {
      return res.json({ valid: true, via: 'account' });
    }
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
      `SELECT st.*, c.image_path AS creature_image, c.display_image_path AS creature_display_image, c.standee_image_path AS creature_standee, c.base_color AS creature_base_color, c.base_opacity AS creature_base_opacity, c.token_height_ft AS creature_token_height
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
