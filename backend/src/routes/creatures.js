const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');

module.exports = function makeCreaturesRouter(io) {
const router = express.Router();

const storage = multer.diskStorage({
  destination: path.join(__dirname, '../../uploads/creatures'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  },
});

const CREATURE_FIELDS = [
  'name', 'size', 'creature_type', 'subtype', 'alignment',
  'armor_class', 'armor_desc', 'shield_equipped', 'hit_points', 'hit_dice',
  'hit_dice_qty', 'hit_dice_type', 'hit_dice_used',
  'speed_walk', 'speed_fly', 'speed_swim', 'speed_burrow', 'speed_climb',
  'strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma',
  'save_str', 'save_dex', 'save_con', 'save_int', 'save_wis', 'save_cha',
  'skill_acrobatics', 'skill_animal_handling', 'skill_arcana', 'skill_athletics',
  'skill_deception', 'skill_history', 'skill_insight', 'skill_intimidation',
  'skill_investigation', 'skill_medicine', 'skill_nature', 'skill_perception',
  'skill_performance', 'skill_persuasion', 'skill_religion', 'skill_sleight_of_hand',
  'skill_stealth', 'skill_survival', 'skill_expertise',
  'damage_vulnerabilities', 'damage_resistances', 'damage_immunities', 'condition_immunities',
  'senses', 'passive_perception', 'languages', 'challenge_rating', 'xp', 'proficiency_bonus', 'initiative_bonus',
  'special_abilities', 'actions', 'bonus_actions', 'reactions',
  'legendary_actions', 'legendary_action_count',
  'class_features', 'feats',
  'is_player_character', 'player_owner',
  'char_class', 'char_subclass',
  'heroic_inspiration', 'death_save_successes', 'death_save_failures',
  'prof_light_armor', 'prof_medium_armor', 'prof_heavy_armor', 'prof_shields',
  'concentrating_on',
  'inventory', 'currency_cp', 'currency_sp', 'currency_gp',
  'spells', 'spell_slots', 'loot', 'movement_actions',
];

const JSONB_FIELDS = ['special_abilities', 'actions', 'bonus_actions', 'reactions', 'legendary_actions', 'senses', 'inventory', 'spells', 'spell_slots', 'loot', 'movement_actions', 'class_features', 'feats', 'skill_expertise'];

function parseBody(body) {
  const data = {};
  for (const field of CREATURE_FIELDS) {
    if (body[field] !== undefined) {
      if (JSONB_FIELDS.includes(field)) {
        data[field] = typeof body[field] === 'string' ? JSON.parse(body[field]) : body[field];
      } else {
        data[field] = body[field] === '' ? null : body[field];
      }
    }
  }
  return data;
}

// GET /api/creatures
router.get('/', async (req, res) => {
  try {
    const { search, filter, player_owner } = req.query;
    const conditions = [];
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`name ILIKE $${params.length}`);
    }
    if (filter === 'characters') {
      conditions.push(`is_player_character = true`);
    } else if (filter === 'monsters') {
      conditions.push(`(is_player_character = false OR is_player_character IS NULL)`);
    }
    if (player_owner) {
      params.push(player_owner);
      conditions.push(`player_owner = $${params.length}`);
    }

    let query = 'SELECT * FROM creatures';
    if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY name';

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/creatures/export?ids=1,2,3  OR  ids=all
const UPLOADS_DIR = path.join(__dirname, '../../uploads');
const CREATURES_DIR = path.join(UPLOADS_DIR, 'creatures');
const IMG_MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif' };

router.get('/export', async (req, res) => {
  try {
    const { ids } = req.query;
    let rows;
    if (!ids || ids === 'all') {
      rows = (await db.query('SELECT * FROM creatures ORDER BY name')).rows;
    } else {
      const idList = ids.split(',').map(Number).filter(n => Number.isFinite(n));
      if (!idList.length) return res.status(400).json({ error: 'Invalid ids' });
      rows = (await db.query('SELECT * FROM creatures WHERE id = ANY($1) ORDER BY name', [idList])).rows;
    }

    const creatures = await Promise.all(rows.map(async (c) => {
      const { id, ...data } = c;
      if (data.image_path) {
        try {
          const imgBuf = fs.readFileSync(path.join(UPLOADS_DIR, data.image_path));
          const ext = path.extname(data.image_path).toLowerCase();
          const mime = IMG_MIME[ext] || 'image/png';
          data.image_data = `data:${mime};base64,${imgBuf.toString('base64')}`;
        } catch { /* image missing — skip */ }
        delete data.image_path;
      }
      return data;
    }));

    const payload = JSON.stringify({ version: 1, exported_at: new Date().toISOString(), creatures });
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="tokens-export.json"');
    res.send(payload);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/creatures/import
const importUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 200 * 1024 * 1024 } });

router.post('/import', importUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    let parsed;
    try { parsed = JSON.parse(req.file.buffer.toString()); }
    catch { return res.status(400).json({ error: 'Invalid JSON file' }); }
    if (!parsed.creatures || !Array.isArray(parsed.creatures))
      return res.status(400).json({ error: 'Invalid token export format' });

    fs.mkdirSync(CREATURES_DIR, { recursive: true });

    const created = [];
    for (const raw of parsed.creatures) {
      // Decode embedded image
      let imagePath = null;
      if (raw.image_data) {
        const m = raw.image_data.match(/^data:([a-z/]+);base64,(.+)$/);
        if (m) {
          const ext = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp', 'image/gif': '.gif' }[m[1]] || '.png';
          const filename = `${uuidv4()}${ext}`;
          fs.writeFileSync(path.join(CREATURES_DIR, filename), Buffer.from(m[2], 'base64'));
          imagePath = `creatures/${filename}`;
        }
      }

      // Only pick known fields
      const fields = [];
      const values = [];
      for (const field of CREATURE_FIELDS) {
        if (raw[field] !== undefined) {
          fields.push(field);
          values.push(serializeValue(field, raw[field]));
        }
      }
      if (imagePath) { fields.push('image_path'); values.push(imagePath); }
      if (!fields.length) continue;

      const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');
      const result = await db.query(
        `INSERT INTO creatures (${fields.join(', ')}) VALUES (${placeholders}) RETURNING *`,
        values
      );
      created.push(result.rows[0]);
    }

    res.json({ imported: created.length, creatures: created });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/creatures/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM creatures WHERE id=$1', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function serializeValue(field, value) {
  if (JSONB_FIELDS.includes(field)) return JSON.stringify(value);
  return value;
}

// POST /api/creatures
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const data = parseBody(req.body);
    const imagePath = req.file ? `creatures/${req.file.filename}` : null;

    const fields = Object.keys(data);
    if (imagePath) fields.push('image_path');

    const values = fields.map((f) => f === 'image_path' ? imagePath : serializeValue(f, data[f]));
    const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');
    const cols = fields.join(', ');

    const result = await db.query(
      `INSERT INTO creatures (${cols}) VALUES (${placeholders}) RETURNING *`,
      values
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/creatures/:id
router.put('/:id', upload.single('image'), async (req, res) => {
  try {
    const data = parseBody(req.body);
    if (req.file) data.image_path = `creatures/${req.file.filename}`;

    const fields = Object.keys(data);
    if (!fields.length) return res.status(400).json({ error: 'No fields to update' });

    const setClauses = fields.map((f, i) => `${f}=$${i + 1}`).join(', ');
    const values = fields.map((f) => serializeValue(f, data[f]));
    values.push(req.params.id);

    const result = await db.query(
      `UPDATE creatures SET ${setClauses} WHERE id=$${values.length} RETURNING *`,
      values
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });

    // If senses changed, push the update to any linked session tokens in real-time
    if (data.senses !== undefined && io) {
      const newSenses = data.senses; // already parsed by parseBody
      const linkedTokens = await db.query(
        `SELECT st.id, s.session_code
         FROM session_tokens st
         JOIN sessions s ON st.session_id = s.id
         WHERE st.creature_id = $1`,
        [req.params.id]
      );
      for (const tok of linkedTokens.rows) {
        await db.query(
          'UPDATE session_tokens SET senses=$1 WHERE id=$2',
          [JSON.stringify(newSenses), tok.id]
        );
        io.to(tok.session_code).emit('token_vision_changed', { tokenId: tok.id, senses: newSenses });
      }
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/creatures/:id
router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM creatures WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

  return router;
};
