// PGlite-backed db shim for the native (Docker-less) build.
//
// The Docker stack uses Postgres 16 over TCP via the `pg` package.
// In the native build we swap that for PGlite — a build of Postgres
// compiled to WebAssembly that runs in-process and persists to a
// local directory. No Postgres install required, no daemon, no
// network sockets. The disk format is portable, so the same data
// dir works on macOS / Windows / Linux when wrapped by Tauri later.
//
// API contract — same as the original `db.js`:
//   * `query(text, params)` — returns `{ rows, rowCount, fields }`
//     so callers using `r.rowCount` keep working unchanged.
//   * Returned promise resolves only after PGlite has finished its
//     async init + first-run schema bootstrap, so callers don't
//     need to know about the readiness window.

const path = require('path');
const fs = require('fs');
const os = require('os');

// PGlite ships ESM-only. Use a top-level import-promise we can
// await from query() so the rest of the backend can stay CJS.
const pgPromise = import('@electric-sql/pglite').then(({ PGlite }) => PGlite);

// Persistent data dir — overrideable so the future Tauri shell can
// point this at the macOS / Windows app-support directory it
// manages itself. Default lives under the user's home so a vanilla
// `node src/index.js` works without touching the system.
const dataDir = process.env.VTT_DATA_DIR
  || path.join(os.homedir(), '.tabletopforge');
fs.mkdirSync(dataDir, { recursive: true });

// init.sql lives at the repo root. Ship it next to backend/ so the
// path resolution works the same when the future Tauri sidecar runs
// from inside an .app bundle. First run executes it once and writes
// a sentinel file; subsequent launches skip the schema bootstrap.
// Schema migrations beyond the initial dump are handled by the
// existing CREATE TABLE IF NOT EXISTS blocks in index.js.
const INIT_SQL_PATH   = path.join(__dirname, '..', '..', 'init.sql');
const SCHEMA_SENTINEL = path.join(dataDir, '.schema_initialised');

let dbInstance = null;
const ready = (async () => {
  const PGlite = await pgPromise;
  const db = await PGlite.create(path.join(dataDir, 'db'));

  if (!fs.existsSync(SCHEMA_SENTINEL) && fs.existsSync(INIT_SQL_PATH)) {
    const sql = fs.readFileSync(INIT_SQL_PATH, 'utf8');
    try {
      await db.exec(sql);
    } catch (err) {
      // Surface the failing SQL in dev so the porting work has a
      // clear error trail. We rethrow to abort startup — booting the
      // server with a half-applied schema would just produce mystery
      // 500s on every route.
      console.error('[db] init.sql failed:', err.message);
      throw err;
    }
    fs.writeFileSync(SCHEMA_SENTINEL, new Date().toISOString());
  }

  dbInstance = db;
  return db;
})();

ready.catch((err) => {
  console.error('[db] PGlite failed to initialise:', err);
  process.exit(1);
});

async function query(text, params) {
  const db = dbInstance || (await ready);
  const r = await db.query(text, params || []);
  // Normalise to the `pg` Pool result shape so the existing codebase
  // (which checks `r.rowCount` and iterates `r.rows`) doesn't need
  // to change. PGlite returns `affectedRows` on writes; for SELECTs
  // we fall back to the row count.
  return {
    rows:     r.rows || [],
    rowCount: typeof r.affectedRows === 'number' ? r.affectedRows
              : (r.rows ? r.rows.length : 0),
    fields:   r.fields || [],
  };
}

module.exports = {
  query,
  // Expose readiness so index.js can await the schema bootstrap
  // before binding the HTTP server — without this the first request
  // races against init.sql and returns a 500.
  ready,
  // Re-exported for transactions; callers can do
  //   const { db } = require('./db');
  //   const t = await db.transaction(async (tx) => …);
  // but no current call site uses it.
  get db() { return dbInstance; },
};
