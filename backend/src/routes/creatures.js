const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { visibleCreature, asksAsDm, parseInventory, mergeSecrets, restoreHidden } = require('../itemSecrets');

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
  'name', 'pronouns', 'size', 'size_squares', 'is_swarm', 'swarm_creature_size', 'creature_type', 'subtype', 'alignment',
  'loot_table_id',
  'armor_class', 'armor_desc', 'ac_misc_bonus', 'shield_equipped', 'hit_points', 'hit_dice',
  'hit_dice_qty', 'hit_dice_type', 'hit_dice_used',
  'hit_dice_pool', 'hit_dice_bonus',
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
  'hide_token_name', 'hide_token_hp', 'wildshape_forms', 'wildshape_eligible', 'wildshape_keep_hp',
  'char_class', 'char_subclass',
  'heroic_inspiration', 'death_save_successes', 'death_save_failures',
  'prof_light_armor', 'prof_medium_armor', 'prof_heavy_armor', 'prof_shields',
  'concentrating_on',
  'char_level', 'char_xp', 'player_notes', 'backstory',
  'inventory', 'currency_cp', 'currency_sp', 'currency_gp',
  'spells', 'spell_slots', 'loot', 'movement_actions',
  'race_state',
  'background', 'background_state', 'tool_proficiencies', 'weapon_proficiencies',
  'class_state', 'multiclasses', 'resource_state', 'crawler_state', 'inspiration_die',
  'hit_dice_used_by_type',
  'base_color', 'base_opacity', 'token_height_ft',
];

const JSONB_FIELDS = ['wildshape_forms', 'special_abilities', 'actions', 'bonus_actions', 'reactions', 'legendary_actions', 'senses', 'inventory', 'spells', 'spell_slots', 'loot', 'movement_actions', 'class_features', 'feats', 'skill_expertise', 'race_state', 'background_state', 'class_state', 'multiclasses', 'resource_state', 'crawler_state', 'hit_dice_used_by_type', 'hit_dice_pool'];

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
  // Footprint override, in squares. Same clamp the live-token path applies, so
  // a creature edited through the API can't seed tokens smaller than their own
  // size category or big enough to bury the map. Only gargantuan carries one —
  // every other category has a fixed footprint, and a stale override left on a
  // creature that was downgraded would spawn tokens at the wrong size.
  const sizeGiven = data.size !== undefined ? String(data.size).toLowerCase() : null;
  if (data.size_squares !== undefined) {
    const n = Number(data.size_squares);
    // A value only survives on a creature that is (or is becoming) gargantuan.
    const keeps = sizeGiven === null || sizeGiven === 'gargantuan';
    data.size_squares = (keeps && Number.isFinite(n) && n > 0)
      ? Math.min(40, Math.max(4, Math.round(n * 2) / 2))
      : null;
  } else if (sizeGiven !== null && sizeGiven !== 'gargantuan') {
    // Category changed to one with a fixed footprint: drop any stale override
    // rather than leaving it to spawn wrongly-sized tokens. A partial update
    // that only re-states 'gargantuan' is left alone.
    data.size_squares = null;
  }
  return data;
}

// GET /api/creatures
router.get('/', async (req, res) => {
  try {
    const { search, filter, player_owner, include_crawlers, crawlers_only } = req.query;
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
    // Crawler sheet characters (World Dungeon) are not for use in Tabletop Forge:
    // hidden unless the crawler app asks for them.
    if (crawlers_only === '1') {
      conditions.push(`(crawler_state IS NOT NULL AND crawler_state <> '{}'::jsonb)`);
    } else if (include_crawlers !== '1') {
      conditions.push(`(crawler_state IS NULL OR crawler_state = '{}'::jsonb)`);
    }

    let query = 'SELECT * FROM creatures';
    if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY name';

    const result = await db.query(query, params);
    // The library listing is read by player clients too.
    res.json(asksAsDm(req) ? result.rows : result.rows.map(visibleCreature));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/creatures/export?ids=1,2,3  OR  ids=all
const UPLOADS_DIR = path.join(__dirname, '../../uploads');
const CREATURES_DIR = path.join(UPLOADS_DIR, 'creatures');
const IMG_MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif' };

// An export is a single self-contained JSON file — it travels to another
// install that shares no uploads dir, so every image goes in as a data URL.
// Returns null when the file is missing, which is not an error: the row
// outlives a deleted file and the creature is still worth exporting.
function embedImage(relPath) {
  if (!relPath) return null;
  try {
    const buf = fs.readFileSync(path.join(UPLOADS_DIR, relPath));
    const mime = IMG_MIME[path.extname(relPath).toLowerCase()] || 'image/png';
    return `data:${mime};base64,${buf.toString('base64')}`;
  } catch {
    return null;
  }
}

// Inverse of embedImage: write a data URL into the creature uploads dir and
// hand back the stored relative path.
const DATA_URL_EXT = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp', 'image/gif': '.gif' };
function decodeImage(dataUrl) {
  if (typeof dataUrl !== 'string') return null;
  const m = dataUrl.match(/^data:([a-z/]+);base64,(.+)$/);
  if (!m) return null;
  const filename = `${uuidv4()}${DATA_URL_EXT[m[1]] || '.png'}`;
  fs.writeFileSync(path.join(CREATURES_DIR, filename), Buffer.from(m[2], 'base64'));
  return `creatures/${filename}`;
}

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

    // Alternate token art for the whole batch in one query, grouped by
    // creature — an "export all" on a big library would otherwise fire a
    // query per creature.
    const altsByCreature = new Map();
    if (rows.length) {
      const altRows = (await db.query(
        `SELECT creature_id, image_path, label FROM creature_images
          WHERE creature_id = ANY($1) AND kind='face'
          ORDER BY creature_id, sort_order, id`,
        [rows.map(r => r.id)]
      )).rows;
      for (const a of altRows) {
        if (!altsByCreature.has(a.creature_id)) altsByCreature.set(a.creature_id, []);
        altsByCreature.get(a.creature_id).push(a);
      }
    }

    const creatures = await Promise.all(rows.map(async (c) => {
      const { id, ...data } = c;
      if (data.image_path) {
        const embedded = embedImage(data.image_path);
        if (embedded) data.image_data = embedded;
        delete data.image_path;
      }
      if (data.display_image_path) {
        const embedded = embedImage(data.display_image_path);
        if (embedded) data.display_image_data = embedded;
        delete data.display_image_path;
      }
      // Extras ride along as their own data URLs so a shared creature keeps
      // its whole cast of token art, not just the stat block face.
      const extras = [];
      for (const a of (altsByCreature.get(id) || [])) {
        const embedded = embedImage(a.image_path);
        if (embedded) extras.push({ image_data: embedded, label: a.label || '' });
      }
      if (extras.length) data.extra_images = extras;
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
      const imagePath = decodeImage(raw.image_data);
      // Presentation art travels with the export the same way.
      const displayPath = decodeImage(raw.display_image_data);

      // Alternate token art, if this export carried any. Written to disk
      // before the INSERT so a decode failure doesn't leave a half-imported
      // creature pointing at files that were never created.
      const extraPaths = [];
      if (Array.isArray(raw.extra_images)) {
        for (const extra of raw.extra_images) {
          const p = decodeImage(typeof extra === 'string' ? extra : extra?.image_data);
          if (p) extraPaths.push({ path: p, label: (typeof extra === 'object' && extra?.label) || '' });
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
      if (displayPath) { fields.push('display_image_path'); values.push(displayPath); }
      if (!fields.length) continue;

      const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');
      const result = await db.query(
        `INSERT INTO creatures (${fields.join(', ')}) VALUES (${placeholders}) RETURNING *`,
        values
      );
      const newCreature = result.rows[0];

      // An import with alternates but no primary (the source creature's
      // portrait file had gone missing) promotes the first alternate, so the
      // imported row isn't left faceless with art sitting behind it.
      let alts = extraPaths;
      if (!newCreature.image_path && alts.length) {
        await db.query('UPDATE creatures SET image_path=$1 WHERE id=$2', [alts[0].path, newCreature.id]);
        newCreature.image_path = alts[0].path;
        alts = alts.slice(1);
      }
      for (let i = 0; i < alts.length; i++) {
        await db.query(
          `INSERT INTO creature_images (creature_id, image_path, label, sort_order, kind)
             VALUES ($1,$2,$3,$4,'face')`,
          [newCreature.id, alts[i].path, alts[i].label, i]
        );
      }

      created.push(newCreature);
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
    // A player's phone reads its character through here, so an undiscovered
    // item secret must not be in the response at all. ?role=dm opts out.
    res.json(asksAsDm(req) ? result.rows[0] : visibleCreature(result.rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Integer columns that are legitimately empty sometimes.
//
// A cleared <select> submits an empty STRING, and Postgres will not take '' for
// an integer — it rejects the whole UPDATE, so clearing a loot table appeared to
// do nothing at all while quietly failing. Mapped to null here rather than in
// each caller, because every future nullable-integer field has this trap.
const NULLABLE_INT_FIELDS = ['loot_table_id'];

// The creature table's boolean columns.
//
// A multipart form sends everything as a string, and Postgres happily reads
// 'true' / 'false' as a boolean — so this never mattered on the server. PGlite,
// which the desktop build runs on, does NOT: it answers "Invalid input for
// boolean type" and the whole insert fails. The visible symptom was that a
// player could not create a character in the desktop app at all, while the
// identical request worked on the web. Coercing here makes one answer for both.
const BOOLEAN_FIELDS = [
  'heroic_inspiration', 'hide_token_hp', 'hide_token_name', 'is_player_character',
  'is_swarm', 'prof_heavy_armor', 'prof_light_armor', 'prof_medium_armor',
  'prof_shields', 'shield_equipped', 'token_light_flicker', 'wildshape_eligible',
  'wildshape_keep_hp',
];

// Everything a form, a checkbox or a JSON body might send for "yes".
function toBool(value) {
  if (typeof value === 'boolean') return value;
  if (value === null || value === undefined || value === '') return null;
  const v = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'on', 't'].includes(v)) return true;
  if (['false', '0', 'no', 'off', 'f'].includes(v)) return false;
  // Unrecognised is treated as "not set" rather than as false: a typo must not
  // quietly clear a flag the caller never meant to touch.
  return null;
}

function serializeValue(field, value) {
  if (JSONB_FIELDS.includes(field)) return JSON.stringify(value);
  if (BOOLEAN_FIELDS.includes(field)) return toBool(value);
  if (NULLABLE_INT_FIELDS.includes(field)) {
    if (value === '' || value === null || value === undefined || value === 'null') return null;
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
  }
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

    // Snapshot the row BEFORE the write. Needed to tell whether a token is
    // still using the creature's default art (and should follow it) or the GM
    // picked an alternate for that token (and shouldn't be overwritten) — and
    // to put back any item secret the writer was not allowed to see.
    const beforeRes = await db.query('SELECT * FROM creatures WHERE id=$1', [req.params.id]);
    const before = beforeRes.rows[0] || null;

    // A player's sheet rewrites its whole pack to equip one thing, from the
    // censored copy it was given — so without this, putting on a shield would
    // quietly delete the GM's secrets. Applied to GM writes too, in the narrower
    // form that still lets a GM clear a secret on purpose: see mergeSecrets.
    if (before && data.inventory !== undefined) {
      // Order matters: put the hidden entries back FIRST, then reattach the
      // secrets. A hidden item may carry a secret of its own, and reattaching
      // by name only works once the item is in the array to attach it to.
      data.inventory = restoreHidden(before.inventory, data.inventory, asksAsDm(req));
      data.inventory = mergeSecrets(before.inventory, data.inventory, asksAsDm(req));
    }

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

    // ── Push the edit onto every token of this creature, live ────────────────
    //
    // Previously only `senses` did this, so editing a creature's hit points,
    // name, size or art left every token already on a map showing the old
    // values until someone reloaded — the bug this replaces.
    //
    // Only fields a token actually snapshots are pushed, and each is guarded:
    //  • current HP is clamped to a reduced maximum, never topped up
    //  • a token whose art the GM changed by hand keeps it
    //  • a token given a nickname keeps that; `name` is the underlying identity
    if (io) {
      const after = result.rows[0];
      const linkedTokens = await db.query(
        `SELECT st.*, s.session_code
           FROM session_tokens st
           JOIN sessions s ON st.session_id = s.id
          WHERE st.creature_id = $1`,
        [req.params.id]
      );

      for (const tok of linkedTokens.rows) {
        const sets = [];
        const vals = [];
        const push = (col, val) => { vals.push(val); sets.push(`${col}=$${vals.length}`); };

        if (data.senses !== undefined) push('senses', JSON.stringify(data.senses));
        if (data.name !== undefined && after.name) push('name', after.name);
        if (data.size !== undefined && after.size) push('size', after.size);
        if (data.size_squares !== undefined) push('size_squares', after.size_squares ?? null);

        if (data.hit_points !== undefined && Number(after.hit_points) > 0) {
          const newMax = Number(after.hit_points);
          push('max_hp', newMax);
          // Raising the maximum must not heal, and lowering it must not leave
          // a token above its own cap.
          if (Number(tok.current_hp) > newMax) push('current_hp', newMax);
        }

        // Art follows only while the token was using the creature's default.
        if (data.image_path !== undefined || req.file) {
          const wasDefault = !tok.image_path || (before && tok.image_path === before.image_path);
          if (wasDefault && after.image_path) push('image_path', after.image_path);
        }

        for (const col of ['token_light_bright', 'token_light_dim', 'token_light_color', 'token_light_flicker', 'tracker_reminder']) {
          if (data[col] !== undefined) push(col, after[col]);
        }

        if (!sets.length) continue;
        vals.push(tok.id);
        await db.query(`UPDATE session_tokens SET ${sets.join(', ')} WHERE id=$${vals.length}`, vals);

        // Re-read enriched so the payload matches what a client gets on join,
        // then reuse token_refreshed — every view already merges that.
        const enriched = await db.query(
          `SELECT st.*, c.image_path AS creature_image, c.display_image_path AS creature_display_image, c.standee_image_path AS creature_standee, c.base_color AS creature_base_color, c.base_opacity AS creature_base_opacity, c.token_height_ft AS creature_token_height,
                  c.dexterity AS creature_dex, COALESCE(c.speed_walk, 30) AS creature_speed,
                  COALESCE(c.initiative_bonus, 0) AS initiative_bonus
             FROM session_tokens st LEFT JOIN creatures c ON st.creature_id = c.id
            WHERE st.id = $1`,
          [tok.id]
        );
        if (enriched.rows[0]) {
          io.to(tok.session_code).emit('token_refreshed', { token: enriched.rows[0] });
        }
        if (data.senses !== undefined) {
          io.to(tok.session_code).emit('token_vision_changed', { tokenId: tok.id, senses: data.senses });
        }
      }
    }

    // Broadcast a generic "creature_updated" so any connected
    // clients (mobile apps, GM panels, the spectator view) re-pull
    // the row. Mobile listens for this and bumps its
    // requestCreatureRefresh counter, which kicks off a fresh REST
    // fetch — without it, a sheet edit via the WebView editor never
    // makes it onto the player's iPhone / Android until they
    // pull-to-refresh manually. We emit globally because creatures
    // aren't session-scoped (one row can be tokenised in many
    // sessions); subscribers filter by their own creature id.
    if (io) {
      io.emit('creature_updated', { creatureId: Number(req.params.id) });

      // Revealing an item's secret is just a field on the inventory, so it
      // arrives here as an ordinary creature save. A player's phone cannot
      // learn it from `creature_updated` alone — it never held the text, so
      // there is nothing to patch — hence the dedicated event that tells it to
      // re-read the sheet. Emitted on un-revealing too, so the text goes back
      // off the phone when the GM decides the party never actually found out.
      const wasRevealed = (inv, i) => !!(parseInventory(inv)[i] || {}).secret_revealed;
      const nextInv = parseInventory(result.rows[0].inventory);
      for (let i = 0; i < nextInv.length; i++) {
        const it = nextInv[i] || {};
        if (!String(it.gm_secret || '').trim()) continue;
        if (!!it.secret_revealed === wasRevealed(before && before.inventory, i)) continue;
        io.emit('item_secret_revealed', {
          creatureId: Number(req.params.id),
          itemIndex: i,
          itemName: it.name || 'item',
          revealed: !!it.secret_revealed,
        });
      }
    }

    // The player's own sheet saves through here too (currency, hit dice,
    // death saves), and it feeds this response straight back into its state —
    // so the echoed row has to be censored exactly like a GET, or a save the
    // player made would hand them the secret they haven't discovered. The GM's
    // editors ask with ?role=dm, because they must keep the text they're editing.
    res.json(asksAsDm(req) ? result.rows[0] : visibleCreature(result.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/creatures/:id/duplicate
//
// Copy a library entry so it can be edited into a variant — "Goblin" →
// "Goblin (Copy)", ready to become "Goblin Archer". Everything on the row is
// copied except the identity columns (id, created_at) and the name, which
// gets a free suffix so the two are tellable apart in the list.
//
// Images are shared by path rather than copied on disk: the file lives in
// uploads/ and is referenced by path from creatures, creature_images and
// session_tokens alike. Deleting a creature row never unlinks the file, and
// the alternate-art routes check imageStillInUse() before removing one, so a
// duplicate pointing at the same art can't strand the original.
router.post('/:id/duplicate', async (req, res) => {
  try {
    const srcRes = await db.query('SELECT * FROM creatures WHERE id=$1', [req.params.id]);
    if (!srcRes.rows.length) return res.status(404).json({ error: 'Not found' });
    const src = srcRes.rows[0];

    // "Goblin" → "Goblin (Copy)" → "Goblin (Copy 2)" → … Names aren't unique
    // in the schema, but two identically-named rows are useless in a picker.
    const baseName = String(src.name || 'Creature').replace(/ \(Copy( \d+)?\)$/, '');
    const takenRes = await db.query(
      `SELECT name FROM creatures WHERE name = $1 OR name LIKE $2`,
      [`${baseName} (Copy)`, `${baseName} (Copy %)`]
    );
    const taken = new Set(takenRes.rows.map((r) => r.name));
    let newName = `${baseName} (Copy)`;
    for (let n = 2; taken.has(newName); n++) newName = `${baseName} (Copy ${n})`;

    // Copy every column the editor knows about, plus the portrait. Anything
    // outside CREATURE_FIELDS is either identity (id/created_at) or derived,
    // so leaving it to the column default is correct.
    const cols = CREATURE_FIELDS.filter((f) => f !== 'name' && src[f] !== undefined);
    // A JSONB column holding SQL NULL must stay SQL NULL — serialising it
    // would write the JSON literal `null` instead, which reads back as a
    // value rather than an absence and defeats the column defaults.
    const values = cols.map((f) => (src[f] === null ? null : serializeValue(f, src[f])));
    const allCols = ['name', ...cols, 'image_path', 'display_image_path', 'standee_image_path'];
    const allValues = [newName, ...values, src.image_path || null, src.display_image_path || null, src.standee_image_path || null];
    const placeholders = allCols.map((_, i) => `$${i + 1}`).join(', ');

    const insRes = await db.query(
      `INSERT INTO creatures (${allCols.join(', ')}) VALUES (${placeholders}) RETURNING *`,
      allValues
    );
    const copy = insRes.rows[0];

    // Alternate token art comes along — a variant of a wolf pack wants the
    // same six faces to pick from.
    await db.query(
      `INSERT INTO creature_images (creature_id, image_path, label, sort_order, kind)
       SELECT $1, image_path, label, sort_order, kind FROM creature_images WHERE creature_id=$2`,
      [copy.id, src.id]
    );

    res.status(201).json(copy);
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

// ─── Alternate token art ─────────────────────────────────────────────────────
//
// A creature has one primary portrait (creatures.image_path — the stat block
// face, and what every existing token already points at) plus any number of
// alternates in creature_images. The GM picks between them when placing a
// token, so six goblins can look like six goblins.
//
// The primary is deliberately NOT duplicated into creature_images: keeping one
// row as the canonical default means nothing has to migrate, and a creature
// with no alternates behaves exactly as it did before. Callers that want the
// whole set ask for it here and get the primary stitched on at the front.

// Only ever unlink files that live in the creature uploads dir — the stored
// path comes from the DB, but a bad row shouldn't be able to reach outside it.
function safeUnlinkCreatureImage(imagePath) {
  if (!imagePath) return;
  const abs = path.resolve(UPLOADS_DIR, imagePath);
  if (path.dirname(abs) !== path.resolve(CREATURES_DIR)) return;
  fs.unlink(abs, () => { /* already gone — nothing to do */ });
}

// Is this path still referenced anywhere? The same file can be the primary and
// have been re-added as an alternate, and tokens already on a map keep their
// own copy of the path. Deleting the file out from under them would leave
// blank tokens mid-session, so the file is only removed once nothing points at
// it.
async function imageStillInUse(imagePath, { exceptImageId = null, exceptDisplayFor = null, exceptStandeeFor = null } = {}) {
  const [prim, alt, tok, disp, stand] = await Promise.all([
    db.query('SELECT 1 FROM creatures WHERE image_path=$1 LIMIT 1', [imagePath]),
    db.query(
      `SELECT 1 FROM creature_images WHERE image_path=$1 AND ($2::int IS NULL OR id <> $2) LIMIT 1`,
      [imagePath, exceptImageId]
    ),
    db.query('SELECT 1 FROM session_tokens WHERE image_path=$1 LIMIT 1', [imagePath]),
    // Presentation art counts as a reference too, or replacing an alternate
    // would delete the file still being shown to players.
    db.query(
      `SELECT 1 FROM creatures WHERE display_image_path=$1 AND ($2::int IS NULL OR id <> $2) LIMIT 1`,
      [imagePath, exceptDisplayFor]
    ),
    // The 3D standing art is a reference too, for the same reason.
    db.query(
      `SELECT 1 FROM creatures WHERE standee_image_path=$1 AND ($2::int IS NULL OR id <> $2) LIMIT 1`,
      [imagePath, exceptStandeeFor]
    ),
  ]);
  return !!(prim.rows.length || alt.rows.length || tok.rows.length || disp.rows.length || stand.rows.length);
}

// ─── Presentation art ────────────────────────────────────────────────────────
//
// creatures.image_path is the token face: small, square, cropped to read at
// map scale. "Show image to players" pushes a creature's picture onto every
// screen, and that wants the full artwork instead. This is that second image;
// when unset, the push falls back to the token art exactly as before.

// PUT /api/creatures/:id/display-image  (multipart, field `image`)
router.put('/:id/display-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const newPath = `creatures/${req.file.filename}`;

    const cur = await db.query('SELECT display_image_path FROM creatures WHERE id=$1', [req.params.id]);
    if (!cur.rows.length) {
      safeUnlinkCreatureImage(newPath);
      return res.status(404).json({ error: 'Not found' });
    }

    await db.query('UPDATE creatures SET display_image_path=$1 WHERE id=$2', [newPath, req.params.id]);

    const old = cur.rows[0].display_image_path;
    if (old && old !== newPath && !(await imageStillInUse(old, { exceptDisplayFor: Number(req.params.id) }))) {
      safeUnlinkCreatureImage(old);
    }

    if (io) io.emit('creature_updated', { creatureId: Number(req.params.id) });
    res.json({ display_image_path: newPath });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/creatures/:id/display-image — back to using the token art.
router.delete('/:id/display-image', async (req, res) => {
  try {
    const cur = await db.query('SELECT display_image_path FROM creatures WHERE id=$1', [req.params.id]);
    if (!cur.rows.length) return res.status(404).json({ error: 'Not found' });

    await db.query('UPDATE creatures SET display_image_path=NULL WHERE id=$1', [req.params.id]);

    const old = cur.rows[0].display_image_path;
    if (old && !(await imageStillInUse(old))) safeUnlinkCreatureImage(old);

    if (io) io.emit('creature_updated', { creatureId: Number(req.params.id) });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ─── 3D standing art ─────────────────────────────────────────────────────────
//
// The same shape as the presentation art above, and for a related reason:
// image_path is one specific thing — the top-down token face — and two other
// places want a different picture of the same creature. This one is the figure
// the 3D view stands up on the board. Unset, that view falls back to the face.

// PUT /api/creatures/:id/standee-image  (multipart, field `image`)
router.put('/:id/standee-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const newPath = `creatures/${req.file.filename}`;

    const cur = await db.query('SELECT standee_image_path FROM creatures WHERE id=$1', [req.params.id]);
    if (!cur.rows.length) {
      safeUnlinkCreatureImage(newPath);
      return res.status(404).json({ error: 'Not found' });
    }

    await db.query('UPDATE creatures SET standee_image_path=$1 WHERE id=$2', [newPath, req.params.id]);

    const old = cur.rows[0].standee_image_path;
    if (old && old !== newPath && !(await imageStillInUse(old, { exceptStandeeFor: Number(req.params.id) }))) {
      safeUnlinkCreatureImage(old);
    }

    if (io) io.emit('creature_updated', { creatureId: Number(req.params.id) });
    broadcastStandee(req.params.id, newPath);
    res.json({ standee_image_path: newPath });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/creatures/:id/standee-image — back to using the token face.
router.delete('/:id/standee-image', async (req, res) => {
  try {
    const cur = await db.query('SELECT standee_image_path FROM creatures WHERE id=$1', [req.params.id]);
    if (!cur.rows.length) return res.status(404).json({ error: 'Not found' });

    await db.query('UPDATE creatures SET standee_image_path=NULL WHERE id=$1', [req.params.id]);

    const old = cur.rows[0].standee_image_path;
    if (old && !(await imageStillInUse(old))) safeUnlinkCreatureImage(old);

    if (io) io.emit('creature_updated', { creatureId: Number(req.params.id) });
    // Back to standing the token face up — the boards need telling, same as
    // any other change to what this creature looks like in 3D.
    broadcastStandee(req.params.id, null);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/creatures/:id/images → [{ id, image_path, label, is_primary }]
// `id` is null for the primary so the client can tell the two apart.
router.get('/:id/images', async (req, res) => {
  try {
    const cRes = await db.query('SELECT image_path FROM creatures WHERE id=$1', [req.params.id]);
    if (!cRes.rows.length) return res.status(404).json({ error: 'Not found' });

    const altRes = await db.query(
      `SELECT id, image_path, label FROM creature_images
        WHERE creature_id=$1 AND kind='face' ORDER BY sort_order, id`,
      [req.params.id]
    );

    const primary = cRes.rows[0].image_path;
    const out = [];
    if (primary) out.push({ id: null, image_path: primary, label: '', is_primary: true });
    for (const r of altRes.rows) out.push({ ...r, is_primary: false });
    res.json(out);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/creatures/:id/images  (multipart, field `images`, up to 12 at once)
// Uploading to a creature that has no primary yet promotes the first file, so
// the GM doesn't end up with alternates and an empty stat block portrait.
router.post('/:id/images', upload.array('images', 12), async (req, res) => {
  try {
    const files = req.files || [];
    if (!files.length) return res.status(400).json({ error: 'No files uploaded' });

    const cRes = await db.query('SELECT image_path FROM creatures WHERE id=$1', [req.params.id]);
    if (!cRes.rows.length) return res.status(404).json({ error: 'Not found' });

    let queue = files.map(f => `creatures/${f.filename}`);
    if (!cRes.rows[0].image_path) {
      await db.query('UPDATE creatures SET image_path=$1 WHERE id=$2', [queue[0], req.params.id]);
      queue = queue.slice(1);
    }

    if (queue.length) {
      const nextRes = await db.query(
        `SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM creature_images
          WHERE creature_id=$1 AND kind='face'`,
        [req.params.id]
      );
      let order = nextRes.rows[0].next;
      for (const p of queue) {
        await db.query(
          `INSERT INTO creature_images (creature_id, image_path, sort_order, kind)
             VALUES ($1,$2,$3,'face')`,
          [req.params.id, p, order++]
        );
      }
    }

    if (io) io.emit('creature_updated', { creatureId: Number(req.params.id) });
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/creatures/:id/images/:imageId/primary
// Swap: the chosen alternate becomes the stat block portrait and the outgoing
// primary drops into the alternates, taking the promoted row's slot. Nothing
// is deleted, so this is always reversible with a second click.
router.put('/:id/images/:imageId/primary', async (req, res) => {
  try {
    const imgRes = await db.query(
      `SELECT image_path, sort_order FROM creature_images
        WHERE id=$1 AND creature_id=$2 AND kind='face'`,
      [req.params.imageId, req.params.id]
    );
    if (!imgRes.rows.length) return res.status(404).json({ error: 'Not found' });

    const cRes = await db.query('SELECT image_path FROM creatures WHERE id=$1', [req.params.id]);
    if (!cRes.rows.length) return res.status(404).json({ error: 'Not found' });

    const promoted = imgRes.rows[0];
    const demoted = cRes.rows[0].image_path;

    await db.query('UPDATE creatures SET image_path=$1 WHERE id=$2', [promoted.image_path, req.params.id]);
    if (demoted) {
      await db.query(
        'UPDATE creature_images SET image_path=$1 WHERE id=$2',
        [demoted, req.params.imageId]
      );
    } else {
      await db.query('DELETE FROM creature_images WHERE id=$1', [req.params.imageId]);
    }

    if (io) io.emit('creature_updated', { creatureId: Number(req.params.id) });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/creatures/:id/images/:imageId/file  (multipart, field `image`)
//
// Replaces an alternate's artwork in place, keeping its id and sort_order, so
// re-framing an image doesn't shuffle it to the end of the strip. The old file
// is removed only once nothing else points at it — a token placed with that
// art keeps working (see imageStillInUse).
router.put('/:id/images/:imageId/file', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
    const imgRes = await db.query(
      `SELECT image_path FROM creature_images
        WHERE id=$1 AND creature_id=$2 AND kind='face'`,
      [req.params.imageId, req.params.id]
    );
    if (!imgRes.rows.length) return res.status(404).json({ error: 'Not found' });

    const oldPath = imgRes.rows[0].image_path;
    const newPath = `creatures/${req.file.filename}`;
    await db.query('UPDATE creature_images SET image_path=$1 WHERE id=$2', [newPath, req.params.imageId]);

    if (!(await imageStillInUse(oldPath))) safeUnlinkCreatureImage(oldPath);

    if (io) io.emit('creature_updated', { creatureId: Number(req.params.id) });
    res.json({ ok: true, image_path: newPath });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/creatures/:id/images/:imageId — alternates only. Removing the
// primary is done by promoting a different image first.
router.delete('/:id/images/:imageId', async (req, res) => {
  try {
    const imgRes = await db.query(
      `SELECT image_path FROM creature_images
        WHERE id=$1 AND creature_id=$2 AND kind='face'`,
      [req.params.imageId, req.params.id]
    );
    if (!imgRes.rows.length) return res.status(404).json({ error: 'Not found' });

    await db.query('DELETE FROM creature_images WHERE id=$1', [req.params.imageId]);
    if (!(await imageStillInUse(imgRes.rows[0].image_path))) {
      safeUnlinkCreatureImage(imgRes.rows[0].image_path);
    }

    if (io) io.emit('creature_updated', { creatureId: Number(req.params.id) });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ─── 3D standing art: a wardrobe, not a single slot ──────────────────────────
//
// Same shape as the face alternates above, and deliberately so: one standee is
// the live one (creatures.standee_image_path — what every view already reads,
// so nothing downstream changes) and the rest wait in creature_images under
// kind='standee'. Switching is a swap between the two, which means it is
// always reversible and never deletes anything.
//
// This is what lets a character have several looks — armoured, wounded, wild
// shaped, out of uniform — and the GM change which one is standing on the
// board mid-session without re-uploading anything.

// Tell every open board which art this creature now stands up.
//
// Tokens carry `creature_standee` from a JOIN made when the map loaded, so
// changing the creature row alone leaves every client drawing the old figure
// until someone reloads. `creature_updated` does not cover it — that only
// refreshes a player's own character sheet.
function broadcastStandee(creatureId, standeeImagePath) {
  if (!io) return;
  io.emit('creature_standee_changed', {
    creatureId: Number(creatureId),
    standeeImagePath: standeeImagePath || null,
  });
}

// GET /api/creatures/:id/standees → [{ id, image_path, is_primary }]
// `id` is null for the live one, exactly as the face list marks its primary.
router.get('/:id/standees', async (req, res) => {
  try {
    const cRes = await db.query('SELECT standee_image_path FROM creatures WHERE id=$1', [req.params.id]);
    if (!cRes.rows.length) return res.status(404).json({ error: 'Not found' });

    const altRes = await db.query(
      `SELECT id, image_path, label FROM creature_images
        WHERE creature_id=$1 AND kind='standee' ORDER BY sort_order, id`,
      [req.params.id]
    );

    const primary = cRes.rows[0].standee_image_path;
    const out = [];
    if (primary) out.push({ id: null, image_path: primary, label: '', is_primary: true });
    for (const r of altRes.rows) out.push({ ...r, is_primary: false });
    res.json(out);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/creatures/:id/standees  (multipart, field `images`, up to 12)
// Uploading to a creature with no standee yet promotes the first file, so the
// GM never ends up with a shelf of alternates and nothing actually standing.
router.post('/:id/standees', upload.array('images', 12), async (req, res) => {
  try {
    const files = req.files || [];
    if (!files.length) return res.status(400).json({ error: 'No files uploaded' });

    const cRes = await db.query('SELECT standee_image_path FROM creatures WHERE id=$1', [req.params.id]);
    if (!cRes.rows.length) {
      for (const f of files) safeUnlinkCreatureImage(`creatures/${f.filename}`);
      return res.status(404).json({ error: 'Not found' });
    }

    let queue = files.map(f => `creatures/${f.filename}`);
    if (!cRes.rows[0].standee_image_path) {
      await db.query('UPDATE creatures SET standee_image_path=$1 WHERE id=$2', [queue[0], req.params.id]);
      queue = queue.slice(1);
    }

    if (queue.length) {
      const nextRes = await db.query(
        `SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM creature_images
          WHERE creature_id=$1 AND kind='standee'`,
        [req.params.id]
      );
      let order = nextRes.rows[0].next;
      for (const p of queue) {
        await db.query(
          `INSERT INTO creature_images (creature_id, image_path, sort_order, kind)
             VALUES ($1,$2,$3,'standee')`,
          [req.params.id, p, order++]
        );
      }
    }

    if (io) io.emit('creature_updated', { creatureId: Number(req.params.id) });
    // Only actually changed if the slot had been empty, but re-sending the
    // current value costs nothing and keeps every client in step.
    const nowRes = await db.query('SELECT standee_image_path FROM creatures WHERE id=$1', [req.params.id]);
    broadcastStandee(req.params.id, nowRes.rows[0]?.standee_image_path);
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/creatures/:id/standees/:imageId/primary
// The chosen alternate stands up and the outgoing one takes its place on the
// shelf. A swap, not a move: nothing is deleted, so a second click puts it
// back. This is the control the GM uses mid-session.
router.put('/:id/standees/:imageId/primary', async (req, res) => {
  try {
    const imgRes = await db.query(
      `SELECT image_path FROM creature_images
        WHERE id=$1 AND creature_id=$2 AND kind='standee'`,
      [req.params.imageId, req.params.id]
    );
    if (!imgRes.rows.length) return res.status(404).json({ error: 'Not found' });

    const cRes = await db.query('SELECT standee_image_path FROM creatures WHERE id=$1', [req.params.id]);
    if (!cRes.rows.length) return res.status(404).json({ error: 'Not found' });

    const promoted = imgRes.rows[0].image_path;
    const demoted = cRes.rows[0].standee_image_path;

    await db.query('UPDATE creatures SET standee_image_path=$1 WHERE id=$2', [promoted, req.params.id]);
    if (demoted) {
      await db.query('UPDATE creature_images SET image_path=$1 WHERE id=$2', [demoted, req.params.imageId]);
    } else {
      // Nothing was standing, so there is nothing to demote into the freed
      // slot — the row would otherwise sit there duplicating the live art.
      await db.query('DELETE FROM creature_images WHERE id=$1', [req.params.imageId]);
    }

    if (io) io.emit('creature_updated', { creatureId: Number(req.params.id) });
    broadcastStandee(req.params.id, promoted);
    res.json({ ok: true, standee_image_path: promoted });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/creatures/:id/standees/:imageId — shelved art only. Removing the
// one that is standing is done by promoting another first, or by the existing
// DELETE /standee-image, which clears the slot entirely.
router.delete('/:id/standees/:imageId', async (req, res) => {
  try {
    const imgRes = await db.query(
      `SELECT image_path FROM creature_images
        WHERE id=$1 AND creature_id=$2 AND kind='standee'`,
      [req.params.imageId, req.params.id]
    );
    if (!imgRes.rows.length) return res.status(404).json({ error: 'Not found' });

    await db.query('DELETE FROM creature_images WHERE id=$1', [req.params.imageId]);
    // Same guard the face alternates use: the file goes only once nothing —
    // another creature, another slot, a token already on a map — points at it.
    if (!(await imageStillInUse(imgRes.rows[0].image_path))) {
      safeUnlinkCreatureImage(imgRes.rows[0].image_path);
    }

    if (io) io.emit('creature_updated', { creatureId: Number(req.params.id) });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

  // ── Companions bound to a character ─────────────────────────────────────
  //
  // A binding, not a token: the owl exists on the wizard's sheet whether or not
  // it is currently on a map. Spawning one is a socket call (`spawn_companion`),
  // because that puts something on the board and the board is live.
  const KINDS = new Set(['familiar', 'summon', 'companion', 'mount', 'duplicate']);
  const safeKind = (k) => (KINDS.has(String(k)) ? String(k) : 'familiar');

  // GET /api/creatures/:id/companions — the roster, with enough of each
  // companion's own sheet to draw a row without a second request per companion.
  router.get('/:id/companions', async (req, res) => {
    try {
      const rows = (await db.query(
        `SELECT cc.id, cc.owner_creature_id, cc.creature_id, cc.nickname, cc.companion_kind, cc.sort_order,
                c.name, c.image_path, c.size, c.creature_type, c.hit_points, c.armor_class, c.challenge_rating
           FROM creature_companions cc
           JOIN creatures c ON c.id = cc.creature_id
          WHERE cc.owner_creature_id = $1
          ORDER BY cc.sort_order, cc.id`,
        [req.params.id]
      )).rows;
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/creatures/:id/companions  { creature_id, nickname?, companion_kind? }
  router.post('/:id/companions', async (req, res) => {
    try {
      const owner = Number(req.params.id);
      const creatureId = Number(req.body?.creature_id);
      if (!Number.isFinite(owner) || !Number.isFinite(creatureId)) {
        return res.status(400).json({ error: 'owner and creature_id are required' });
      }
      // A character cannot be its own familiar. Easy to do from a picker, and
      // the result is a token that owns itself.
      if (owner === creatureId) return res.status(400).json({ error: "A character can't be its own companion." });
      const exists = await db.query('SELECT 1 FROM creatures WHERE id=$1', [creatureId]);
      if (!exists.rows.length) return res.status(404).json({ error: 'No such creature' });
      const row = (await db.query(
        `INSERT INTO creature_companions (owner_creature_id, creature_id, nickname, companion_kind, sort_order)
         VALUES ($1,$2,$3,$4,COALESCE((SELECT MAX(sort_order)+1 FROM creature_companions WHERE owner_creature_id=$1),0))
         RETURNING *`,
        [owner, creatureId, String(req.body?.nickname || '').slice(0, 120), safeKind(req.body?.companion_kind)]
      )).rows[0];
      if (io) io.emit('companions_changed', { ownerCreatureId: owner });
      res.status(201).json(row);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // PUT /api/creatures/:id/companions/:rowId  — nickname and kind only; which
  // creature it is cannot be swapped out from under a token already on the map.
  router.put('/:id/companions/:rowId', async (req, res) => {
    try {
      const sets = [];
      const vals = [];
      if (req.body?.nickname !== undefined) { vals.push(String(req.body.nickname).slice(0, 120)); sets.push(`nickname=$${vals.length}`); }
      if (req.body?.companion_kind !== undefined) { vals.push(safeKind(req.body.companion_kind)); sets.push(`companion_kind=$${vals.length}`); }
      if (!sets.length) return res.status(400).json({ error: 'Nothing to update' });
      vals.push(req.params.rowId, req.params.id);
      const row = (await db.query(
        `UPDATE creature_companions SET ${sets.join(', ')}
          WHERE id=$${vals.length - 1} AND owner_creature_id=$${vals.length} RETURNING *`,
        vals
      )).rows[0];
      if (!row) return res.status(404).json({ error: 'Not found' });
      if (io) io.emit('companions_changed', { ownerCreatureId: Number(req.params.id) });
      res.json(row);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE /api/creatures/:id/companions/:rowId
  //
  // Unbinds only. Any token already summoned from it stays on the map — it is a
  // creature standing in a room, and deleting a row on a character sheet is not
  // a reason for something to vanish mid-fight. The token simply stops pointing
  // back at a binding.
  router.delete('/:id/companions/:rowId', async (req, res) => {
    try {
      const r = await db.query(
        'DELETE FROM creature_companions WHERE id=$1 AND owner_creature_id=$2 RETURNING id',
        [req.params.rowId, req.params.id]
      );
      if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
      await db.query('UPDATE session_tokens SET companion_row_id=NULL WHERE companion_row_id=$1', [req.params.rowId]);
      if (io) io.emit('companions_changed', { ownerCreatureId: Number(req.params.id) });
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
