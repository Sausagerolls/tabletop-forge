// /api/settings — generic key/value JSONB store for global app settings.
//
// Currently used by the GM view for AI config (LM Studio / Ollama /
// SwarmUI URLs, models, prompt templates). Stored server-side so the
// values follow the GM across phones, browsers, and incognito tabs —
// localStorage couldn't promise any of that.
//
// Auth model: same as the rest of /api/* — there's no per-route auth in
// this codebase yet, the assumption is the deploy is reverse-proxied
// to a known audience. If you tighten that later, gate writes here on
// the GM master password.

const express = require('express');
const db = require('../db');

const router = express.Router();

const SLUG_RE = /^[a-z0-9][a-z0-9_.\-]{0,119}$/;

router.get('/:key', async (req, res) => {
  try {
    const key = String(req.params.key || '');
    if (!SLUG_RE.test(key)) return res.status(400).json({ error: 'Invalid key' });
    const r = await db.query('SELECT value FROM app_settings WHERE key=$1', [key]);
    if (!r.rows.length) return res.status(404).json({ error: 'Not set' });
    res.json({ key, value: r.rows[0].value });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:key', async (req, res) => {
  try {
    const key = String(req.params.key || '');
    if (!SLUG_RE.test(key)) return res.status(400).json({ error: 'Invalid key' });
    if (req.body == null || !Object.prototype.hasOwnProperty.call(req.body, 'value')) {
      return res.status(400).json({ error: 'Body must include `value`' });
    }
    const { value } = req.body;
    await db.query(
      `INSERT INTO app_settings (key, value, updated_at) VALUES ($1, $2, NOW())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      [key, JSON.stringify(value)]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:key', async (req, res) => {
  try {
    const key = String(req.params.key || '');
    if (!SLUG_RE.test(key)) return res.status(400).json({ error: 'Invalid key' });
    await db.query('DELETE FROM app_settings WHERE key=$1', [key]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
