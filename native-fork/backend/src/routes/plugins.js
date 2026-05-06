// Plugin system — filesystem-based plugin registry.
//
// Plugins are directories under PLUGINS_DIR, each containing a `plugin.json`
// manifest plus arbitrary asset files (typically a `client.js` that the
// frontend dynamically imports). Plugins NEVER run on the backend; we only
// store metadata, serve files, and provide a generic JSONB key/value store
// keyed by plugin id.
//
// Safety properties intentionally enforced here:
//   - Plugin code is never exec'd in node — backend just shovels files.
//   - Asset paths are resolved to ensure they stay inside the plugin's own
//     directory (no `..` path traversal).
//   - DELETE removes the plugin's filesystem dir + plugins-table row, but
//     LEAVES `plugin_data` rows alone. Disabling does the same — no data
//     loss when a plugin goes away.
//   - Enabling refuses if any declared `requires` plugin is missing or
//     itself disabled, preventing half-loaded dependency chains.
//
// The PLUGINS_DIR is bind-mounted from the host (see docker-compose.yml),
// so a misbehaving plugin can always be removed with `rm -rf` even if the
// in-app manager UI is broken — that is the documented escape hatch.

const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const AdmZip = require('adm-zip');
const db = require('../db');

const router = express.Router();
const PLUGINS_DIR = path.resolve(__dirname, '../../plugins');
const MANIFEST_FILE = 'plugin.json';

function ensurePluginsDir() {
  fs.mkdirSync(PLUGINS_DIR, { recursive: true });
}

// Read + validate a plugin manifest from a directory. Returns null if the
// directory has no manifest or the manifest is structurally invalid.
function readManifest(pluginDir) {
  const file = path.join(pluginDir, MANIFEST_FILE);
  if (!fs.existsSync(file)) return null;
  let raw;
  try { raw = JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return null; }
  if (!raw || typeof raw.id !== 'string' || !/^[a-z0-9][a-z0-9_\-]*$/.test(raw.id)) return null;
  return {
    id: raw.id,
    name: String(raw.name || raw.id),
    version: String(raw.version || '0.0.1'),
    description: String(raw.description || ''),
    author: String(raw.author || ''),
    requires: Array.isArray(raw.requires) ? raw.requires.map(String) : [],
    frontend_entry: typeof raw.frontend_entry === 'string' ? raw.frontend_entry : 'client.js',
    extension_points: Array.isArray(raw.extension_points) ? raw.extension_points.map(String) : [],
    builtin: !!raw.builtin,
  };
}

// Walk PLUGINS_DIR, return manifests for every directory that has one.
function listPluginDirs() {
  ensurePluginsDir();
  const out = [];
  for (const entry of fs.readdirSync(PLUGINS_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const m = readManifest(path.join(PLUGINS_DIR, entry.name));
    if (!m) continue;
    if (m.id !== entry.name) continue;     // manifest id must match dir name
    out.push(m);
  }
  return out;
}

// Resolve an asset request against a plugin's directory, refusing any path
// that escapes via `..` or absolute lookups. Returns the absolute path on
// success, or null on rejection.
function resolveAsset(pluginId, relPath) {
  if (!/^[a-z0-9][a-z0-9_\-]*$/.test(pluginId)) return null;
  const base = path.join(PLUGINS_DIR, pluginId);
  const target = path.resolve(base, relPath);
  if (!target.startsWith(base + path.sep) && target !== base) return null;
  return target;
}

// Delete a directory tree. Used by uninstall and by upload-overwrite. Wraps
// fs.rmSync with a guard so we never accidentally rm -rf the plugins root.
function rmDirSafe(dir) {
  if (!dir || !dir.startsWith(PLUGINS_DIR + path.sep)) return;
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
}

// Reconcile the filesystem with the `plugins` table:
//   - any folder on disk gets a row (enabled=true if new, or whatever the
//     row already has if it existed);
//   - any DB row with no folder is deleted (the user removed it externally
//     via `rm -rf` — that is a supported escape hatch).
async function reconcilePluginsTable() {
  const onDisk = listPluginDirs();
  const onDiskById = new Map(onDisk.map(m => [m.id, m]));
  const rows = (await db.query('SELECT id FROM plugins')).rows;
  const inDb = new Set(rows.map(r => r.id));

  // Insert or update by id
  for (const m of onDisk) {
    const existing = (await db.query('SELECT id FROM plugins WHERE id=$1', [m.id])).rows[0];
    if (!existing) {
      await db.query(
        `INSERT INTO plugins (id, manifest, enabled, source, installed_at)
         VALUES ($1, $2, true, $3, NOW())`,
        [m.id, JSON.stringify(m), m.builtin ? 'builtin' : 'upload']
      );
    } else {
      await db.query(
        `UPDATE plugins SET manifest=$1 WHERE id=$2`,
        [JSON.stringify(m), m.id]
      );
    }
  }
  // Drop rows whose dir is gone — but leave plugin_data so it survives.
  for (const id of inDb) {
    if (!onDiskById.has(id)) {
      await db.query('DELETE FROM plugins WHERE id=$1', [id]);
    }
  }
}

async function fetchPluginRow(id) {
  return (await db.query('SELECT * FROM plugins WHERE id=$1', [id])).rows[0] || null;
}

// Determine whether `id` can be enabled given current state. Returns
// { ok: true } or { ok: false, reason }.
async function checkDependencies(id) {
  const row = await fetchPluginRow(id);
  if (!row) return { ok: false, reason: 'Plugin not found' };
  const requires = (row.manifest && row.manifest.requires) || [];
  if (!requires.length) return { ok: true };
  const missing = [];
  const disabled = [];
  for (const dep of requires) {
    const r = await fetchPluginRow(dep);
    if (!r) missing.push(dep);
    else if (!r.enabled) disabled.push(dep);
  }
  if (missing.length || disabled.length) {
    const parts = [];
    if (missing.length) parts.push(`missing: ${missing.join(', ')}`);
    if (disabled.length) parts.push(`disabled: ${disabled.join(', ')}`);
    return { ok: false, reason: `Dependency problem — ${parts.join('; ')}` };
  }
  return { ok: true };
}

// ── REST API ───────────────────────────────────────────────────────────────

// GET /api/plugins  — list installed plugins with current enabled state.
router.get('/', async (req, res) => {
  try {
    const rows = (await db.query('SELECT id, manifest, enabled, source, installed_at FROM plugins ORDER BY id')).rows;
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/plugins/:id/enable
router.post('/:id/enable', async (req, res) => {
  try {
    const row = await fetchPluginRow(req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    const dep = await checkDependencies(req.params.id);
    if (!dep.ok) return res.status(409).json({ error: dep.reason });
    await db.query('UPDATE plugins SET enabled=true WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/plugins/:id/disable
//
// Mirrors DELETE in cleanup behaviour: any tracked library content
// (creatures + spells stored under inserted_creature_ids /
// inserted_spell_ids) is deleted server-side, and the matching KV
// rows that drove the tracking are cleared. The plugin's own
// frontend unregister() also tries to clean up but is fire-and-
// forget — if the GM closes the tab mid-disable the async DELETEs
// never finish and the imported content lingers in the library.
// Doing it server-side makes the contract reliable: clicking
// Disable always wipes the plugin's tracked content, just like a
// Delete would. Re-enabling later sees an empty slate and re-imports
// from scratch (which is the same path a fresh install takes).
router.post('/:id/disable', async (req, res) => {
  try {
    const row = await fetchPluginRow(req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    // Refuse to disable a plugin that another *enabled* plugin requires —
    // would leave a broken chain. The caller is told who depends on this
    // so they can disable those first.
    const dependents = (await db.query(
      `SELECT id FROM plugins WHERE enabled=true AND manifest->'requires' ? $1`,
      [req.params.id]
    )).rows.map(r => r.id);
    if (dependents.length) {
      return res.status(409).json({
        error: `Cannot disable — required by: ${dependents.join(', ')}. Disable those first.`,
      });
    }
    const cleanup = await cleanupTrackedContent(req.params.id);
    await db.query(
      `DELETE FROM plugin_data WHERE plugin_id=$1 AND key = ANY($2::text[])`,
      [req.params.id, TRACKING_KEYS]
    );
    await db.query('UPDATE plugins SET enabled=false WHERE id=$1', [req.params.id]);
    res.json({ ok: true, ...cleanup });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/plugins/upload — multipart .zip with a top-level plugin.json
// (or a single top-level dir containing one). Extracts to PLUGINS_DIR/<id>,
// overwriting any prior install of the same id.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    let zip;
    try { zip = new AdmZip(req.file.buffer); }
    catch { return res.status(400).json({ error: 'Not a valid zip archive' }); }
    const entries = zip.getEntries();
    if (!entries.length) return res.status(400).json({ error: 'Zip is empty' });

    // Manifests can be at zip root or one level deep — we sniff for either.
    let manifestEntry = entries.find(e => !e.isDirectory && e.entryName === MANIFEST_FILE);
    let stripPrefix = '';
    if (!manifestEntry) {
      manifestEntry = entries.find(e => !e.isDirectory && e.entryName.endsWith(`/${MANIFEST_FILE}`)
        && e.entryName.split('/').length === 2);
      if (manifestEntry) stripPrefix = manifestEntry.entryName.split('/')[0] + '/';
    }
    if (!manifestEntry) return res.status(400).json({ error: 'No plugin.json found at zip root or top-level dir' });

    let manifest;
    try { manifest = JSON.parse(manifestEntry.getData().toString('utf8')); }
    catch { return res.status(400).json({ error: 'Manifest is not valid JSON' }); }
    if (!manifest || !/^[a-z0-9][a-z0-9_\-]*$/.test(String(manifest.id || ''))) {
      return res.status(400).json({ error: 'Manifest must declare a valid `id` (lowercase, a-z 0-9 _ -)' });
    }

    ensurePluginsDir();
    const targetDir = path.join(PLUGINS_DIR, manifest.id);
    rmDirSafe(targetDir);
    fs.mkdirSync(targetDir, { recursive: true });

    for (const entry of entries) {
      if (entry.isDirectory) continue;
      let rel = entry.entryName;
      if (stripPrefix) {
        if (!rel.startsWith(stripPrefix)) continue;
        rel = rel.slice(stripPrefix.length);
      }
      if (!rel) continue;
      // Path-traversal guard.
      const out = path.resolve(targetDir, rel);
      if (!out.startsWith(targetDir + path.sep)) continue;
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.writeFileSync(out, entry.getData());
    }

    await reconcilePluginsTable();
    const row = await fetchPluginRow(manifest.id);
    res.json({ installed: row });
  } catch (err) {
    console.error('plugin upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Clean up library content a plugin imported via the well-known
// `inserted_<bucket>_(ids|slugs)` KV tracking keys (the pattern the
// `content-exporter` plugin's runtime template uses, followed by every
// content-pack plugin built on top of it). Runs server-side so a
// frontend that's never opened the session with the plugin enabled
// still gets a tidy disable + delete. Returns counts so callers can
// surface what was removed. Safe to call when the keys are missing
// or empty — each branch no-ops cleanly.
//
// Buckets covered (must stay aligned with the content-exporter
// runtime + the docs in PLUGINS.md → Library content imported by a
// plugin):
//   * inserted_creature_ids   → creatures
//   * inserted_spell_ids      → spell_library
//   * inserted_terrain_ids    → terrain_library
//   * inserted_race_ids       → custom_races          (UUID-keyed; sub-races cascade via FK)
//   * inserted_bg_ids         → custom_backgrounds    (UUID-keyed)
//   * inserted_class_ids      → custom_classes        (UUID-keyed)
//   * inserted_lang_slugs     → languages             (slug-keyed)
//
// Adding a new bucket here is the canonical extension point: drop in
// another entry, expose the matching `inserted_<x>_ids` key in the
// content-exporter runtime, document it in PLUGINS.md, done.
async function cleanupTrackedContent(pluginId) {
  const out = {
    creatures: 0, spells: 0, terrain: 0,
    races: 0, backgrounds: 0, classes: 0, languages: 0,
  };

  // ── Integer-id buckets ──────────────────────────────────────────
  const intBuckets = [
    { key: 'inserted_creature_ids', table: 'creatures',       field: 'creatures' },
    { key: 'inserted_spell_ids',    table: 'spell_library',   field: 'spells' },
    { key: 'inserted_terrain_ids',  table: 'terrain_library', field: 'terrain' },
  ];
  for (const b of intBuckets) {
    try {
      const row = await db.query(
        'SELECT value FROM plugin_data WHERE plugin_id=$1 AND key=$2',
        [pluginId, b.key],
      );
      const ids = (row.rows[0]?.value || []).filter((n) => Number.isFinite(Number(n))).map(Number);
      if (ids.length) {
        const r = await db.query(`DELETE FROM ${b.table} WHERE id = ANY($1::int[])`, [ids]);
        out[b.field] = r.rowCount || 0;
      }
    } catch (err) {
      console.warn(`cleanupTrackedContent (${pluginId}) ${b.field}:`, err.message);
    }
  }

  // ── UUID-id buckets (custom races / backgrounds / classes) ──────
  // Stored as text uuids in the JSON array; pg parses them via the
  // ::uuid[] cast. Sub-races cascade off custom_races via the FK on
  // parent_id, so deleting a parent kills its children automatically
  // — that's why we don't have to order parents-first here even
  // though the content-exporter import did.
  const uuidBuckets = [
    { key: 'inserted_race_ids', table: 'custom_races',       field: 'races' },
    { key: 'inserted_bg_ids',   table: 'custom_backgrounds', field: 'backgrounds' },
    { key: 'inserted_class_ids',table: 'custom_classes',     field: 'classes' },
  ];
  for (const b of uuidBuckets) {
    try {
      const row = await db.query(
        'SELECT value FROM plugin_data WHERE plugin_id=$1 AND key=$2',
        [pluginId, b.key],
      );
      const ids = (row.rows[0]?.value || [])
        .filter((s) => typeof s === 'string' && /^[0-9a-f-]{36}$/i.test(s));
      if (ids.length) {
        const r = await db.query(`DELETE FROM ${b.table} WHERE id = ANY($1::uuid[])`, [ids]);
        out[b.field] = r.rowCount || 0;
      }
    } catch (err) {
      console.warn(`cleanupTrackedContent (${pluginId}) ${b.field}:`, err.message);
    }
  }

  // ── Slug-keyed bucket (languages) ───────────────────────────────
  try {
    const row = await db.query(
      'SELECT value FROM plugin_data WHERE plugin_id=$1 AND key=$2',
      [pluginId, 'inserted_lang_slugs'],
    );
    const slugs = (row.rows[0]?.value || []).filter((s) => typeof s === 'string' && s.length);
    if (slugs.length) {
      const r = await db.query('DELETE FROM languages WHERE slug = ANY($1::text[])', [slugs]);
      out.languages = r.rowCount || 0;
    }
  } catch (err) {
    console.warn(`cleanupTrackedContent (${pluginId}) languages:`, err.message);
  }

  return out;
}

// All KV keys cleanupTrackedContent reads from (or pairs with). Stripped
// alongside the row deletes so a re-enable starts from an empty slate
// — otherwise the next install would dedupe-by-name against ids that
// already pointed at deleted rows and skip everything.
const TRACKING_KEYS = [
  'inserted_creature_ids',
  'inserted_spell_ids',
  'inserted_terrain_ids',
  'inserted_race_ids',
  'inserted_bg_ids',
  'inserted_class_ids',
  'inserted_lang_slugs',
  'content_loaded_v1',
  'treasure_loaded_v1',
  'install_status',
];

// POST /api/plugins/cleanup-orphans — find plugin_data tracking rows
// whose plugin_id is no longer installed, delete the listed library
// content, and drop the orphan KV rows. Surfaces what was cleaned so
// the caller can confirm. Safe to call repeatedly — second run finds
// nothing.
router.post('/cleanup-orphans', async (req, res) => {
  try {
    const ids = (await db.query(
      `SELECT DISTINCT plugin_id FROM plugin_data
        WHERE key = ANY($1::text[])
          AND plugin_id NOT IN (SELECT id FROM plugins)`,
      [TRACKING_KEYS]
    )).rows.map(r => r.plugin_id);
    const total = { creatures: 0, spells: 0, terrain: 0, races: 0, backgrounds: 0, classes: 0, languages: 0 };
    for (const pid of ids) {
      const out = await cleanupTrackedContent(pid);
      for (const k of Object.keys(total)) total[k] += out[k] || 0;
      await db.query(
        `DELETE FROM plugin_data WHERE plugin_id=$1 AND key = ANY($2::text[])`,
        [pid, TRACKING_KEYS]
      );
    }
    res.json({
      orphanPlugins: ids.length,
      creaturesRemoved: total.creatures,
      spellsRemoved: total.spells,
      terrainRemoved: total.terrain,
      racesRemoved: total.races,
      backgroundsRemoved: total.backgrounds,
      classesRemoved: total.classes,
      languagesRemoved: total.languages,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/plugins/:id — remove the plugin's directory and DB row.
// Tracked library content (creatures + spells imported via the content-
// exporter runtime pattern) is removed alongside the plugin so a
// "Delete" from the manager actually fulfils the user's expectation
// of "this plugin and its content are gone". The plugin_data KV that
// drove that tracking is also removed in the same transaction; if the
// GM re-installs later the runtime sees an empty slate and re-imports.
// Other plugin_data keys (per-GM preferences, etc.) are still kept
// because the no-data-loss rule applies to non-tracking state.
router.delete('/:id', async (req, res) => {
  try {
    const row = await fetchPluginRow(req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    // Same dependency guard as disable — don't break enabled dependents.
    const dependents = (await db.query(
      `SELECT id FROM plugins WHERE enabled=true AND manifest->'requires' ? $1`,
      [req.params.id]
    )).rows.map(r => r.id);
    if (dependents.length) {
      return res.status(409).json({
        error: `Cannot delete — required by: ${dependents.join(', ')}. Disable/delete those first.`,
      });
    }
    const cleanup = await cleanupTrackedContent(req.params.id);
    await db.query(
      `DELETE FROM plugin_data WHERE plugin_id=$1 AND key = ANY($2::text[])`,
      [req.params.id, TRACKING_KEYS]
    );
    rmDirSafe(path.join(PLUGINS_DIR, req.params.id));
    await db.query('DELETE FROM plugins WHERE id=$1', [req.params.id]);
    res.json({ ok: true, ...cleanup });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/plugins/:id/asset/* — serve a file from the plugin's directory.
// Used by the frontend loader's dynamic `import()` and by any plugin asset
// (images, sounds, etc.). Disabled plugins still serve assets — the frontend
// chooses whether to load them.
router.get('/:id/asset/*', (req, res) => {
  const id = req.params.id;
  const rel = req.params[0] || '';
  const abs = resolveAsset(id, rel);
  if (!abs) return res.status(400).json({ error: 'Invalid asset path' });
  if (!fs.existsSync(abs) || fs.statSync(abs).isDirectory()) return res.status(404).end();
  // Best-guess content types for the common plugin asset formats.
  const ext = path.extname(abs).toLowerCase();
  const TYPES = {
    '.js':   'application/javascript; charset=utf-8',
    '.mjs':  'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.css':  'text/css; charset=utf-8',
    '.png':  'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml',
    '.mp3':  'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg',
    '.html': 'text/html; charset=utf-8',
  };
  res.setHeader('Content-Type', TYPES[ext] || 'application/octet-stream');
  res.setHeader('Cache-Control', 'no-cache');
  fs.createReadStream(abs).pipe(res);
});

// ── Plugin KV store ────────────────────────────────────────────────────────
// Plugins use this as their backing store. Survives disable + delete; only
// removed if the operator wipes the table directly. Keys can be any string
// the plugin chooses (we recommend prefixing with a domain like
// `tmpl_<id>` so the plugin can do prefix-scoped reads).

router.get('/:id/data', async (req, res) => {
  try {
    const id = req.params.id;
    const { key, prefix } = req.query;
    let rows;
    if (key !== undefined) {
      rows = (await db.query('SELECT key, value FROM plugin_data WHERE plugin_id=$1 AND key=$2',
        [id, String(key)])).rows;
    } else if (prefix !== undefined) {
      rows = (await db.query('SELECT key, value FROM plugin_data WHERE plugin_id=$1 AND key LIKE $2',
        [id, String(prefix) + '%'])).rows;
    } else {
      rows = (await db.query('SELECT key, value FROM plugin_data WHERE plugin_id=$1', [id])).rows;
    }
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id/data/:key', async (req, res) => {
  try {
    const id = req.params.id;
    const key = req.params.key;
    const value = req.body && Object.prototype.hasOwnProperty.call(req.body, 'value') ? req.body.value : req.body;
    await db.query(
      `INSERT INTO plugin_data (plugin_id, key, value) VALUES ($1, $2, $3)
       ON CONFLICT (plugin_id, key) DO UPDATE SET value = EXCLUDED.value`,
      [id, key, JSON.stringify(value ?? null)]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id/data/:key', async (req, res) => {
  try {
    await db.query('DELETE FROM plugin_data WHERE plugin_id=$1 AND key=$2',
      [req.params.id, req.params.key]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = { router, reconcilePluginsTable, PLUGINS_DIR };
