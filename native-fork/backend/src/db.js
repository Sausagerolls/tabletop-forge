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
// Inside db/, not beside it.
//
// It used to live in the data dir next to the database folder, which meant the
// two could disagree: move or delete `db/` — to reset, or to set a damaged one
// aside — and the sentinel stayed behind saying "already initialised", so the
// fresh database came up with NO SCHEMA and every query failed with
// `relation "creatures" does not exist`. Keeping it in the folder it describes
// means they are moved, copied and deleted together, always.
const SCHEMA_SENTINEL = path.join(dataDir, 'db', '.schema_initialised');

// Anything left by an older build, so this migration only has to happen once.
const LEGACY_SENTINEL = path.join(dataDir, '.schema_initialised');
try {
  if (fs.existsSync(LEGACY_SENTINEL) && fs.existsSync(path.join(dataDir, 'db'))
      && !fs.existsSync(SCHEMA_SENTINEL)) {
    fs.mkdirSync(path.join(dataDir, 'db'), { recursive: true });
    fs.renameSync(LEGACY_SENTINEL, SCHEMA_SENTINEL);
  } else if (fs.existsSync(LEGACY_SENTINEL) && !fs.existsSync(path.join(dataDir, 'db'))) {
    // A sentinel with no database is the lie described above.
    fs.rmSync(LEGACY_SENTINEL);
  }
} catch { /* best effort — worst case init.sql runs again, which is idempotent */ }


// Run init.sql the way psql does — statement by statement, not all-or-nothing.
//
// `db.exec(wholeFile)` aborts on the first error, and init.sql is not a clean
// standalone schema: it ALTERs several tables that index.js creates at RUNTIME
// (terrain_library, map_terrain), so those statements fail on a fresh database.
// Under Docker that is invisible, because the postgres entrypoint runs the file
// through psql WITHOUT `ON_ERROR_STOP` — each failing statement logs and the run
// continues, and index.js then creates the tables properly a moment later. The
// native build was the only place that treated it as fatal, and the symptom was
// a server that answered nothing at all: `relation "terrain_library" does not
// exist` on boot, then exit.
//
// So: tolerate exactly the class of errors psql tolerates here — a statement
// about something that does not exist yet, or that already does — and keep
// anything else fatal, because a genuinely broken schema should not boot.
//
// Safe to split on semicolons: init.sql has no dollar-quoted bodies (no
// functions, no DO blocks, no triggers). Asserted rather than assumed — if one
// ever lands, the check below stops the naive split from cutting it in half.
const BENIGN = new Set([
  '42P01', // undefined_table      — index.js creates it later
  '42703', // undefined_column
  '42P07', // duplicate_table      — re-running over an existing schema
  '42710', // duplicate_object
  '42P16', // invalid_table_definition
  '42704', // undefined_object
]);

async function runInitSql(db, sql) {
  if (sql.includes('$$')) {
    throw new Error('init.sql now contains a dollar-quoted block; the statement splitter in db.js must be taught about it before it can be trusted.');
  }
  // Strip line comments so a trailing `;` inside one cannot split a statement.
  const cleaned = sql.split('\n').map((line) => line.replace(/--.*$/, '')).join('\n');
  const statements = cleaned.split(';').map((s) => s.trim()).filter(Boolean);
  let ran = 0;
  const skipped = [];
  for (const statement of statements) {
    try {
      await db.exec(statement);
      ran++;
    } catch (err) {
      if (BENIGN.has(err?.code)) { skipped.push(`${err.code}: ${err.message}`); continue; }
      console.error('[db] init.sql failed on:', statement.slice(0, 120));
      throw err;
    }
  }
  console.log(`[db] schema initialised — ${ran} statement(s) applied`
    + (skipped.length ? `, ${skipped.length} deferred to the runtime migrations` : ''));
  if (skipped.length) for (const s of skipped) console.log('      · ' + s);
}

let dbInstance = null;
const ready = (async () => {
  const PGlite = await pgPromise;
  const dbDir = path.join(dataDir, 'db');
  let db;
  try {
    db = await PGlite.create(dbDir);
  } catch (err) {
    // A crash or a force-quit leaves postmaster.pid behind and PGlite then refuses
    // to open, with `Aborted()` as its only explanation. If nothing is running, the
    // file is a gravestone, not a lock.
    const lock = path.join(dbDir, 'postmaster.pid');
    if (!fs.existsSync(lock)) throw err;
    console.warn('[db] clearing a stale lock left by a previous crash');
    try { fs.rmSync(lock); } catch { /* fall through */ }
    db = await PGlite.create(dbDir);
  }

  if (!fs.existsSync(SCHEMA_SENTINEL) && fs.existsSync(INIT_SQL_PATH)) {
    await runInitSql(db, fs.readFileSync(INIT_SQL_PATH, 'utf8'));
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
