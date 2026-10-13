#!/usr/bin/env node
// Load a packed session into the local desktop app.
//
// Run this with the app CLOSED — PGlite is a single-process database and the
// server holds a lock on it while it is running.
//
//   node scripts/unpack-session.mjs --in ./session-6VI3S2
//   node scripts/unpack-session.mjs --in ./session-6VI3S2 --data-dir ~/.tabletopforge
//
// HOW IT WORKS, AND WHY IT IS NOT A pg_dump RESTORE
//
// The local database is not empty: the app creates its whole schema on first
// boot, seeds languages, ships builtin plugins and (given a network) SRD spells.
// A dump restore would fight all of that. So this replays rows table by table in
// the order the pack recorded, with the id columns PRESERVED — every row in the
// pack refers to others by id, and renumbering them would mean rewriting every
// foreign key in flight, including the ones buried in JSONB (wildshape_forms,
// class_state, plugin data).
//
// Keeping the ids means colliding with rows the local app made for itself, so
// each row is written as an upsert on the primary key: the packed row wins. On a
// laptop whose only job is to run this session that is exactly right.
//
// Afterwards the sequences are bumped past the highest id in each table —
// without that, the next creature the GM makes on holiday is handed id 1 and
// collides with something imported.

import fs from 'fs';
import path from 'path';
import os from 'os';

const args = process.argv.slice(2);
const flag = (name, fallback = null) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : fallback;
};

const IN = path.resolve(flag('in', './session-pack'));
const DATA_DIR = path.resolve((flag('data-dir', process.env.VTT_DATA_DIR || path.join(os.homedir(), '.tabletopforge')))
  .replace(/^~(?=$|\/)/, os.homedir()));
const DRY = args.includes('--dry-run');

if (!fs.existsSync(path.join(IN, 'manifest.json'))) {
  console.error(`No pack at ${IN} — expected manifest.json and rows.json inside it.`);
  process.exit(1);
}
const manifest = JSON.parse(fs.readFileSync(path.join(IN, 'manifest.json'), 'utf8'));
const data = JSON.parse(fs.readFileSync(path.join(IN, 'rows.json'), 'utf8'));
if (manifest.kind !== 'tabletopforge-session-pack') {
  console.error('That directory is not a TableTop Forge session pack.');
  process.exit(1);
}

console.log(`Pack: "${manifest.session.name}" (${manifest.session.code}), packed ${manifest.packedAt.slice(0, 16).replace('T', ' ')}`);
console.log(`Into: ${DATA_DIR}`);
if (DRY) console.log('(dry run — nothing will be written)\n');

// ── The database ────────────────────────────────────────────────────────────
const dbPath = path.join(DATA_DIR, 'db');
if (!fs.existsSync(dbPath)) {
  console.error(`\nNo database at ${dbPath}.`);
  console.error('Start the app once and close it again — that is what creates the schema this pack loads into.');
  process.exit(1);
}
const { PGlite } = await import(path.join(import.meta.dirname, '../backend/node_modules/@electric-sql/pglite/dist/index.js'));
let db;
async function open() { return PGlite.create(dbPath); }
try {
  db = await open();
} catch (err) {
  // A crash or a force-quit leaves postmaster.pid behind, and PGlite then refuses
  // to open with an unhelpful `Aborted()`. If nothing is actually running, the
  // file is a gravestone rather than a lock — say so and clear it, because the
  // alternative is a holiday spent staring at "Aborted()".
  const lock = path.join(dbPath, 'postmaster.pid');
  const stale = fs.existsSync(lock);
  if (!stale) {
    console.error(`\nCould not open the database: ${err.message}`);
    console.error('If the app is running, quit it first — PGlite allows one process at a time.');
    process.exit(1);
  }
  console.log('  (clearing a stale lock left by a previous crash or force-quit)');
  try { fs.rmSync(lock); } catch { /* fall through to the error below */ }
  try {
    db = await open();
  } catch (err2) {
    console.error(`\nStill could not open the database: ${err2.message}`);
    console.error('Quit the app if it is running. If it is not, the database may be damaged —');
    console.error(`move ${dbPath} aside, start the app once to rebuild it, then run this again.`);
    process.exit(1);
  }
}

// What the local schema actually has. A pack from a newer server can carry
// columns this build has never heard of; those are dropped per row rather than
// failing the import, and reported at the end so the difference is visible.
async function columnsOf(table) {
  const r = await db.query(
    `SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1`, [table]);
  return new Set(r.rows.map((x) => x.column_name));
}

// Unique constraints other than the primary key.
//
// Upserting on `id` alone is not enough: the local app seeds some of these tables
// itself (six magic pistols into item_library, the SRD languages), and those rows
// have DIFFERENT ids but the SAME natural key. Inserting the packed row then fails
// on the unique constraint rather than the primary key, so the fallback retries
// the upsert against the natural key instead and the packed row still wins.
const NATURAL_KEYS = {
  item_library: ['name', 'edition'],
  spell_library: ['name', 'edition'],
  languages: ['slug'],
  sessions: ['session_code'],
};

// Columns that point FORWARD, into a table that has to be inserted later.
//
// sessions.map_id references maps, and maps.session_id references sessions — a
// cycle, so whichever goes first violates the other. The session is written with
// these left null and they are filled in at the end, which is the same thing a
// deferred constraint would do if these keys had been declared deferrable.
const DEFERRED = { sessions: ['map_id', 'spawn_map_id'] };
const deferredWrites = [];

const order = manifest.order.filter((t) => Array.isArray(data[t]) && data[t].length);
const droppedColumns = new Map();
const failures = [];
let written = 0;

for (const table of order) {
  const rows = data[table];
  const local = await columnsOf(table);
  if (!local.size) { failures.push(`${table}: no such table in this build — ${rows.length} row(s) skipped`); continue; }

  const packed = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const cols = packed.filter((c) => local.has(c));
  const dropped = packed.filter((c) => !local.has(c));
  if (dropped.length) droppedColumns.set(table, dropped);

  const pk = local.has('id') ? 'id' : null;
  const deferHere = (DEFERRED[table] || []).filter((c) => cols.includes(c));
  const natural = (NATURAL_KEYS[table] || []).filter((c) => cols.includes(c));
  let ok = 0;
  for (const row of rows) {
    const value = (c) => {
      if (deferHere.includes(c)) return null;          // filled in after the cycle closes
      const v = row[c];
      // json_agg gives objects and arrays back as real JS values; JSONB columns
      // want text going in.
      return (v !== null && typeof v === 'object') ? JSON.stringify(v) : v;
    };
    const values = cols.map(value);
    const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
    const setFrom = (key) => cols.filter((c) => !key.includes(c)).map((c) => `${c} = EXCLUDED.${c}`).join(', ');
    const insert = (conflict) => conflict
      ? `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})
         ON CONFLICT (${conflict.join(', ')}) DO UPDATE SET ${setFrom(conflict)}`
      : `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`;

    if (deferHere.length && row.id != null) {
      const patch = Object.fromEntries(deferHere.filter((c) => row[c] != null).map((c) => [c, row[c]]));
      if (Object.keys(patch).length) deferredWrites.push({ table, id: row.id, patch });
    }
    if (DRY) { ok++; continue; }
    try {
      await db.query(insert(pk ? [pk] : null), values);
      ok++;
    } catch (err) {
      // A unique constraint other than the primary key: retry against it.
      if (String(err.code) === '23505' && natural.length) {
        try { await db.query(insert(natural), values); ok++; continue; }
        catch (err2) { failures.push(`${table} id=${row.id ?? '?'}: ${String(err2.message).split('\n')[0]}`); continue; }
      }
      failures.push(`${table} id=${row.id ?? '?'}: ${String(err.message).split('\n')[0]}`);
    }
  }
  written += ok;
  console.log(`  ${table.padEnd(22)} ${String(ok).padStart(5)}/${String(rows.length).padEnd(5)}${dropped.length ? `  (${dropped.length} unknown column(s) dropped)` : ''}`);
}

// ── The forward references, now that their targets exist ────────────────────
if (!DRY && deferredWrites.length) {
  let closed = 0;
  for (const { table, id, patch } of deferredWrites) {
    const cols = Object.keys(patch);
    const sets = cols.map((c, i) => `${c} = $${i + 1}`).join(', ');
    try {
      await db.query(`UPDATE ${table} SET ${sets} WHERE id = $${cols.length + 1}`, [...cols.map((c) => patch[c]), id]);
      closed++;
    } catch (err) {
      failures.push(`${table} id=${id} (${cols.join(', ')}): ${String(err.message).split('\n')[0]}`);
    }
  }
  console.log(`  ${closed} forward reference(s) filled in (the session's current map)`);
}

// ── Sequences ───────────────────────────────────────────────────────────────
//
// Imported rows keep their ids, so every SERIAL sequence is now behind. The next
// insert would reuse an id that is already taken and fail on the primary key —
// which would look like "the app is broken" on the first thing the GM does.
if (!DRY) {
  const seqs = await db.query(`
    SELECT c.relname AS seq, t.relname AS tbl, a.attname AS col
      FROM pg_class c
      JOIN pg_depend d ON d.objid = c.oid AND d.deptype = 'a'
      JOIN pg_class t ON t.oid = d.refobjid
      JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = d.refobjsubid
     WHERE c.relkind = 'S'`);
  let bumped = 0;
  for (const s of seqs.rows) {
    try {
      await db.query(
        `SELECT setval('${s.seq}', GREATEST((SELECT COALESCE(MAX(${s.col}), 0) FROM ${s.tbl}), 1))`);
      bumped++;
    } catch { /* a sequence for a table this build lacks */ }
  }
  console.log(`\n  ${bumped} sequence(s) moved past the imported ids`);
}

await db.close?.();

// ── The files ───────────────────────────────────────────────────────────────
const uploadsFrom = path.join(IN, 'uploads');
const uploadsTo = path.join(DATA_DIR, 'uploads');
let files = 0;
if (fs.existsSync(uploadsFrom)) {
  const walk = (rel = '') => {
    for (const entry of fs.readdirSync(path.join(uploadsFrom, rel), { withFileTypes: true })) {
      const childRel = path.join(rel, entry.name);
      if (entry.isDirectory()) { walk(childRel); continue; }
      const dst = path.join(uploadsTo, childRel);
      if (!DRY) {
        fs.mkdirSync(path.dirname(dst), { recursive: true });
        fs.copyFileSync(path.join(uploadsFrom, childRel), dst);
      }
      files++;
    }
  };
  walk();
}
console.log(`  ${files} file(s) copied into ${uploadsTo}`);

// ── What to know afterwards ─────────────────────────────────────────────────
console.log(`\n${DRY ? 'Would have written' : 'Wrote'} ${written} row(s).`);
if (droppedColumns.size) {
  console.log('\nColumns in the pack that this build does not have (ignored):');
  for (const [t, cols] of droppedColumns) console.log(`  ${t}: ${cols.join(', ')}`);
  console.log('That means the pack came from a newer server than this app. Sync the fork and rebuild.');
}
if (failures.length) {
  console.log(`\n${failures.length} row(s) did not load:`);
  for (const f of failures.slice(0, 20)) console.log('  ' + f);
  if (failures.length > 20) console.log(`  …and ${failures.length - 20} more`);
  process.exitCode = 1;
} else if (!DRY) {
  console.log(`\nDone. Start the app and open session ${manifest.session.code} — the GM password is the one from the live server.`);
}
