// Moving a whole install of this app onto another machine.
//
// One module, both directions, because a pack written by one set of rules and read
// by another is a pack that works until it doesn't. Both sides run against
// `db.query`, so the same code serves Postgres in Docker and PGlite in the desktop
// build.
//
// EVERYTHING, NOT A SUBGRAPH
//
// This started as a careful walk out from one session — its maps, their walls, the
// creatures its tokens pointed at. Every edge that walk missed was a hole on the
// far side: the creature library arrived with 36 of 178 rows, the terrain library
// with 2 of 68, the tile decks not at all. A GM away from their server does not
// want one session, they want their VTT.
//
// So: every table except the migration backups, every row, and the entire uploads
// tree. About 7,000 rows and half a gigabyte of art — nothing, next to the cost of
// finding a gap in a cottage with no internet.

const path = require('path');
const fs = require('fs');

const PACK_KIND = 'tabletopforge-session-pack';
const PACK_VERSION = 1;

// Unique constraints that are not the primary key.
//
// Upserting on `id` is not enough: a fresh install seeds some of these itself —
// six magic pistols into item_library, the SRD languages — with DIFFERENT ids but
// the SAME natural key, so the insert fails on the unique constraint rather than
// the primary key. The import retries against the natural key and the packed row
// wins.
const NATURAL_KEYS = {
  item_library: ['name', 'edition'],
  spell_library: ['name', 'edition'],
  languages: ['slug'],
  sessions: ['session_code'],
};

// Columns that point forward, into a table inserted later.
//
// sessions.map_id references maps, and maps.session_id references sessions: a
// cycle, so whichever goes first violates the other. The session is written with
// these null and they are filled in at the end — what a deferrable constraint
// would do, had these been declared deferrable.
const DEFERRED = { sessions: ['map_id', 'spawn_map_id'] };

// Tables NOT to carry.
//
// Only the hand-made backups — `creatures_ac_bak`, `spell_library_bak_5et` and
// friends, left behind by past migrations. They are snapshots of rows that are
// already being copied in their live form, and restoring them on the far side
// would resurrect data the GM deliberately moved on from.
const EXCLUDE_TABLE = /(_bak(?:$|[-_\d])|_backup|_old$|^pg_)/i;

/** Every table in this database worth copying. */
async function allTables(db) {
  const r = await db.query(`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`);
  return r.rows.map((x) => x.tablename).filter((t) => !EXCLUDE_TABLE.test(t));
}

/** Every file path the packed rows point at, relative to the uploads dir. */
function collectFiles(rows) {
  const wanted = new Set();
  const add = (v) => {
    if (typeof v !== 'string' || !v) return;
    const clean = v.replace(/^\/?uploads\//, '').trim();
    if (!clean || clean.startsWith('data:') || clean.startsWith('http') || clean.includes('..')) return;
    if (/\.(png|jpg|jpeg|webp|gif|svg|mp3|ogg|wav|m4a|webm|glb|gltf|pdf)$/i.test(clean)) wanted.add(clean);
  };
  for (const list of Object.values(rows)) {
    for (const row of list || []) {
      for (const [key, value] of Object.entries(row)) {
        if (/(image|path|file|sprite|art|src|backdrop|model)/i.test(key)) add(value);
        // Inventory and spell JSON can carry art paths of their own.
        if (value && typeof value === 'object') {
          try { (JSON.stringify(value).match(/[\w/-]+\.(?:png|jpg|jpeg|webp|gif|svg)/gi) || []).forEach(add); }
          catch { /* not serialisable; nothing to find */ }
        }
      }
    }
  }
  return [...wanted];
}

/**
 * Read the WHOLE database out.
 *
 * Not the session's subgraph. The first version of this walked the graph from one
 * session — maps, its tokens, the creatures those tokens point at — and the result
 * was a laptop with a campaign on it and no creature library to build encounters
 * from, two of sixty-eight terrain pieces, and no tile decks. A GM away from their
 * server does not want the session, they want their VTT.
 *
 * So every table goes, minus the migration backups, and every upload with it. The
 * whole thing is ~7,000 rows and half a gigabyte of art, which is nothing next to
 * the cost of discovering a gap on holiday.
 *
 * `sessionCode` is optional and only labels the pack, for the filename and the
 * "log in with this code" hint after importing.
 */
async function buildPack(db, sessionCode = null) {
  const tables = await allTables(db);
  const rows = {};
  const counts = {};
  const skipped = {};
  for (const table of tables) {
    try {
      const r = await db.query(`SELECT * FROM ${table}`);
      rows[table] = r.rows;
      counts[table] = r.rows.length;
    } catch (err) {
      rows[table] = [];
      counts[table] = 0;
      skipped[table] = err.message.split('\n')[0];
    }
  }

  const sessions = (rows.sessions || []).map((r) => ({ id: r.id, name: r.name, code: r.session_code }));
  const named = sessionCode ? sessions.find((x) => x.code === sessionCode) : null;

  const manifest = {
    kind: PACK_KIND,
    version: PACK_VERSION,
    packedAt: new Date().toISOString(),
    scope: 'everything',
    session: named || sessions[0] || null,
    sessions,
    order: tables,
    counts,
    skipped,
  };
  return { manifest, rows, tables };
}

/**
 * Replay a pack into this database.
 *
 * Ids are PRESERVED. Every row refers to others by id, including ids buried in
 * JSONB (wildshape_forms, class_state), so renumbering would mean rewriting
 * foreign keys in flight. Rows are upserted, which means a packed row wins over
 * whatever this install seeded for itself — right for a machine whose job is to
 * run what was sent to it.
 *
 * ORDER, AND WHY IT IS SOLVED BY REPETITION
 *
 * Copying a whole database has no single safe insert order: `creature_images`
 * needs `creatures`, `maps` needs `sessions`, and `sessions.map_id` needs `maps` —
 * a cycle no ordering can satisfy.
 *
 * The first attempt turned referential integrity off for the load
 * (`session_replication_role = replica`, which is how Postgres restores a dump).
 * That silently does nothing here: PGlite runs every `query()` in its own implicit
 * transaction, so the SET is discarded before the next statement. It appeared to
 * work on a fresh database and then dropped 37 rows — maps, tokens, lights, doors —
 * on a real one.
 *
 * So instead: insert everything, keep what failed, and go round again. A row whose
 * parent arrives later in pass 1 succeeds in pass 2. Passes stop as soon as one
 * makes no progress, which is the only honest definition of "as far as this can
 * get" — and whatever is left then is genuinely unsatisfiable, not merely early.
 * Cheap, since only the failures are retried, and it needs nothing of the engine.
 */
async function applyPack(db, manifest, rows) {
  if (manifest?.kind !== PACK_KIND) throw Object.assign(new Error('Not a session pack'), { status: 400 });

  const order = (manifest.order || Object.keys(rows)).filter((t) => Array.isArray(rows[t]) && rows[t].length);
  const droppedColumns = {};
  const perTable = {};
  const deferredWrites = [];
  const notes = [];

  // Every write, prepared before any of it runs, so a retry costs nothing but the
  // round trip.
  const pending = [];
  for (const table of order) {
    const list = rows[table];
    const localCols = new Set((await db.query(
      `SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1`,
      [table])).rows.map((r) => r.column_name));
    if (!localCols.size) {
      notes.push(`${table}: no such table here — ${list.length} row(s) skipped`);
      continue;
    }

    const packedCols = [...new Set(list.flatMap((r) => Object.keys(r)))];
    const cols = packedCols.filter((c) => localCols.has(c));
    const dropped = packedCols.filter((c) => !localCols.has(c));
    if (dropped.length) droppedColumns[table] = dropped;

    const pk = localCols.has('id') ? ['id'] : null;
    const natural = (NATURAL_KEYS[table] || []).filter((c) => cols.includes(c));
    const deferHere = (DEFERRED[table] || []).filter((c) => cols.includes(c));
    const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
    const setFrom = (key) => cols.filter((c) => !key.includes(c)).map((c) => `${c} = EXCLUDED.${c}`).join(', ');
    const statement = (conflict) => (conflict && setFrom(conflict)
      ? `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})
         ON CONFLICT (${conflict.join(', ')}) DO UPDATE SET ${setFrom(conflict)}`
      : `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`);

    perTable[table] = { written: 0, of: list.length };
    for (const row of list) {
      const values = cols.map((c) => {
        if (deferHere.includes(c)) return null;
        const v = row[c];
        // Rows arrive with JSONB columns already parsed; going back in they are text.
        return (v !== null && typeof v === 'object') ? JSON.stringify(v) : v;
      });
      if (deferHere.length && row.id != null) {
        const patch = Object.fromEntries(deferHere.filter((c) => row[c] != null).map((c) => [c, row[c]]));
        if (Object.keys(patch).length) deferredWrites.push({ table, id: row.id, patch });
      }
      pending.push({ table, id: row.id, primary: statement(pk), fallback: natural.length ? statement(natural) : null, values });
    }
  }

  let queue = pending;
  let written = 0;
  const passes = [];
  for (let pass = 1; pass <= 8 && queue.length; pass++) {
    const stillFailing = [];
    for (const op of queue) {
      try {
        await db.query(op.primary, op.values);
        perTable[op.table].written++;
        written++;
      } catch (err) {
        // A unique constraint that is not the primary key — the local install's own
        // seeded row under a different id. Retry against the natural key.
        if (String(err.code) === '23505' && op.fallback) {
          try {
            await db.query(op.fallback, op.values);
            perTable[op.table].written++;
            written++;
            continue;
          } catch (err2) { op.lastError = String(err2.message).split('\n')[0]; stillFailing.push(op); continue; }
        }
        op.lastError = String(err.message).split('\n')[0];
        stillFailing.push(op);
      }
    }
    passes.push({ pass, attempted: queue.length, failed: stillFailing.length });
    // No progress means no amount of further passes will help.
    if (stillFailing.length >= queue.length) { queue = stillFailing; break; }
    queue = stillFailing;
  }

  const failures = [...notes, ...queue.map((op) => `${op.table} id=${op.id ?? '?'}: ${op.lastError}`)];

  // The forward references, now that their targets exist.
  for (const { table, id, patch } of deferredWrites) {
    const cols = Object.keys(patch);
    const sets = cols.map((c, i) => `${c} = $${i + 1}`).join(', ');
    try { await db.query(`UPDATE ${table} SET ${sets} WHERE id = $${cols.length + 1}`, [...cols.map((c) => patch[c]), id]); }
    catch (err) { failures.push(`${table} id=${id} (${cols.join(', ')}): ${String(err.message).split('\n')[0]}`); }
  }

  // Sequences, which are all now behind the imported ids. Without this the next
  // creature the GM makes is handed an id that is already taken, and the app looks
  // broken on the first thing they do.
  try {
    const seqs = await db.query(`
      SELECT c.relname AS seq, t.relname AS tbl, a.attname AS col
        FROM pg_class c
        JOIN pg_depend d ON d.objid = c.oid AND d.deptype = 'a'
        JOIN pg_class t ON t.oid = d.refobjid
        JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = d.refobjsubid
       WHERE c.relkind = 'S'`);
    for (const sq of seqs.rows) {
      try {
        await db.query(`SELECT setval('${sq.seq}', GREATEST((SELECT COALESCE(MAX(${sq.col}), 0) FROM ${sq.tbl}), 1))`);
      } catch { /* a sequence for a table this build lacks */ }
    }
  } catch (err) {
    failures.push(`sequences: ${err.message.split('\n')[0]}`);
  }

  return { written, perTable, failures, droppedColumns, passes };
}

/** Copy the pack's files into this install's uploads dir. */
function applyFiles(fromDir, uploadsDir) {
  let copied = 0;
  const walk = (rel) => {
    const abs = path.join(fromDir, rel);
    if (!fs.existsSync(abs)) return;
    for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
      const childRel = path.join(rel, entry.name);
      if (entry.isDirectory()) { walk(childRel); continue; }
      // A pack is a file from elsewhere: never let an entry escape the uploads dir.
      const dst = path.resolve(uploadsDir, childRel);
      if (!dst.startsWith(path.resolve(uploadsDir) + path.sep)) continue;
      fs.mkdirSync(path.dirname(dst), { recursive: true });
      fs.copyFileSync(path.join(fromDir, childRel), dst);
      copied++;
    }
  };
  walk('');
  return copied;
}

module.exports = { PACK_KIND, PACK_VERSION, buildPack, applyPack, applyFiles, collectFiles };
