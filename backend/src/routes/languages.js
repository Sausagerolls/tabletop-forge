// /api/languages — first-class language registry.
//
// Standard SRD entries are seeded at startup (see backend/src/index.js).
// DMs can add their own; only custom entries (`is_custom = true`) can
// be deleted via this route, so a stray DELETE never wipes the SRD set.
//
// Creatures still store their list of known languages as comma-separated
// names in `creatures.languages` (the existing TEXT column). The picker
// UI and AI normaliser match those names against rows in this table to
// distinguish canonical from custom — no migration of existing creature
// rows required.

const express = require('express');
const db = require('../db');

const router = express.Router();

function slugify(name) {
  return String(name || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

// GET /api/languages — full list, ordered by category then name so the
// picker can group standard / exotic / rare / custom together.
router.get('/', async (req, res) => {
  try {
    const rows = (await db.query(
      `SELECT id, slug, name, category, script, is_custom
       FROM languages
       ORDER BY
         CASE category
           WHEN 'standard' THEN 1
           WHEN 'exotic'   THEN 2
           WHEN 'rare'     THEN 3
           WHEN 'custom'   THEN 4
           ELSE 5
         END,
         name`
    )).rows;
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/languages — add a custom entry. Body: { name, script? }.
// Slug is derived automatically; collision returns the existing row.
router.post('/', async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    if (!name) return res.status(400).json({ error: 'name is required' });
    if (name.length > 120) return res.status(400).json({ error: 'name too long' });
    const slug = slugify(name);
    if (!slug) return res.status(400).json({ error: 'name must contain at least one alphanumeric character' });
    const script = String(req.body?.script || '').trim().slice(0, 40);

    // ON CONFLICT returns the existing row so the DM can keep typing
    // even if they re-add a name that's already there.
    const result = await db.query(
      `INSERT INTO languages (slug, name, category, script, is_custom)
       VALUES ($1, $2, 'custom', $3, true)
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
       RETURNING id, slug, name, category, script, is_custom`,
      [slug, name, script]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/languages/:slug — only allowed for custom entries.
// Standard / exotic / rare rows are protected so a careless DELETE
// can't poison the seed set.
router.delete('/:slug', async (req, res) => {
  try {
    const slug = String(req.params.slug || '').toLowerCase();
    const existing = (await db.query('SELECT * FROM languages WHERE slug = $1', [slug])).rows[0];
    if (!existing) return res.status(404).json({ error: 'Not found' });
    if (!existing.is_custom) return res.status(400).json({ error: 'Cannot delete a built-in language' });
    await db.query('DELETE FROM languages WHERE slug = $1', [slug]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
