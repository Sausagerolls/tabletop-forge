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
    await db.query('UPDATE plugins SET enabled=false WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
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

// DELETE /api/plugins/:id — remove the plugin's directory and DB row, but
// leave its plugin_data rows in place per the no-data-loss rule.
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
    rmDirSafe(path.join(PLUGINS_DIR, req.params.id));
    await db.query('DELETE FROM plugins WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
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
