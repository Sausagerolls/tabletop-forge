#!/usr/bin/env node
// Pack a session out of the live server so it can be run offline.
//
// Produces one directory (or .zip) holding
//   manifest.json   what this is, when, from where, and the row counts
//   rows.json       every row the session needs, table by table, in insert order
//   uploads/        every file those rows point at
//
// WHAT "EVERYTHING THE SESSION NEEDS" MEANS
//
// A session is the root of a graph, not a row: maps hang off it, and off those
// hang walls, doors, lights, terrain, tiles, levels, portals, spawn points, fog,
// ships and markers. Tokens hang off maps AND off creatures, creatures carry
// images, companions, loot tables and custom races/classes/backgrounds, and a
// loot table carries its rows. Miss one edge and the import lands a map with no
// walls, or a token pointing at a creature that isn't there.
//
// So the graph is walked explicitly, and the walk is stated in ORDER: a parent is
// always packed before anything that references it, because that is the order the
// importer has to insert them in for the foreign keys to hold.
//
// WHAT IS DELIBERATELY LEFT OUT
//
// The SRD spell and item libraries. They are thousands of rows that every install
// seeds for itself, and the desktop app does that on first boot. Homebrew rows in
// those tables ARE taken — anything whose source is not an SRD import — because
// nobody can re-seed the Dagger of Polymorph.
//
// Usage
//   node scripts/pack-session.mjs --code 38S3XS [--out ./holiday] [--host http://…]
//   node scripts/pack-session.mjs --list

import fs from 'fs';
import path from 'path';
import { execFile, spawn } from 'child_process';
import { promisify } from 'util';

const run = promisify(execFile);

const args = process.argv.slice(2);
const flag = (name, fallback = null) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : fallback;
};

const HOST = flag('host', 'http://192.168.50.131:8899');
const SSH_HOST = flag('ssh', '192.168.50.131');
const CODE = flag('code');
const OUT = path.resolve(flag('out', `./session-${CODE || 'pack'}`));
const LIST = args.includes('--list');

// The live database and uploads live inside Docker on the server, so both are
// read through `docker exec`/`docker cp` over ssh. Credentials come from
// .deploy-env, the same file the deploy scripts read.
const envPath = path.resolve(import.meta.dirname, '../../.deploy-env');
const env = Object.fromEntries(
  fs.existsSync(envPath)
    ? fs.readFileSync(envPath, 'utf8').split('\n').filter((l) => l.includes('=') && !l.startsWith('#'))
        .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
    : []
);
const SSHPASS = env.DEPLOY_PASSWORD;
const DB_CONTAINER = 'tabletopforge-db-1';
const BACKEND_CONTAINER = 'tabletopforge-backend-1';

async function ssh(command, stdin = null) {
  // The SQL goes in on STDIN, never in the command line. Three layers of shell
  // (ssh, docker exec, psql -c) each want their own quoting, and a query with an
  // apostrophe in it — which is most of them — cannot survive all three intact.
  return await new Promise((resolve, reject) => {
    const child = spawn('sshpass', ['-e', 'ssh', '-o', 'LogLevel=ERROR', '-o', 'PubkeyAuthentication=no',
      '-o', 'PreferredAuthentications=password', `root@${SSH_HOST}`, command],
      { env: { ...process.env, SSHPASS } });
    let out = '', err = '';
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { err += d; });
    child.on('close', (code) => {
      if (code !== 0) return reject(new Error(err.trim() || `exit ${code}`));
      resolve(out);
    });
    if (stdin !== null) { child.stdin.write(stdin); }
    child.stdin.end();
  });
}

// Rows come back as one JSON document, which survives newlines, quotes and
// apostrophes inside text columns — the thing that makes CSV or \t-separated
// output unusable for descriptions and backstories.
async function sql(query) {
  const wrapped = `SELECT COALESCE(json_agg(t), '[]'::json)::text FROM (${query}) t;`;
  const text = (await ssh(
    `docker exec -i ${DB_CONTAINER} psql -U vtt -d dndvtt -t -A -v ON_ERROR_STOP=1 -f -`,
    wrapped
  )).trim();
  try { return JSON.parse(text || '[]'); }
  catch { throw new Error(`Could not parse rows for: ${query.slice(0, 80)}…\n${text.slice(0, 300)}`); }
}

if (LIST) {
  const rows = await sql(`SELECT s.id, s.name, s.session_code,
      (SELECT count(*) FROM maps m WHERE m.session_id = s.id) AS maps,
      (SELECT count(*) FROM session_tokens t WHERE t.session_id = s.id) AS tokens
    FROM sessions s ORDER BY s.id DESC`);
  console.log('Sessions on the live server:\n');
  for (const r of rows) {
    console.log(`  ${String(r.session_code).padEnd(8)} ${String(r.name).slice(0, 34).padEnd(36)} ${String(r.maps).padStart(3)} maps  ${String(r.tokens).padStart(4)} tokens`);
  }
  console.log('\nThen: node scripts/pack-session.mjs --code <CODE>');
  process.exit(0);
}

if (!CODE) {
  console.error('Which session? Pass --code <SESSION CODE>, or --list to see them.');
  process.exit(1);
}

const session = (await sql(`SELECT * FROM sessions WHERE session_code = '${CODE.replace(/'/g, "''")}'`))[0];
if (!session) { console.error(`No session with code ${CODE}.`); process.exit(1); }
console.log(`Packing "${session.name}" (${CODE})…`);

const mapIds = (await sql(`SELECT id FROM maps WHERE session_id = ${session.id}`)).map((r) => r.id);
const inMaps = mapIds.length ? `(${mapIds.join(',')})` : '(NULL)';
const S = session.id;

// The creatures this session actually uses: everything a token points at, plus
// every player character (they may not be on a map right now — a character
// sheet is not a token), plus anything bound as a companion to those, plus the
// wild-shape forms they can turn into.
const creatureIds = new Set();
for (const r of await sql(`SELECT DISTINCT creature_id AS id FROM session_tokens WHERE session_id = ${S} AND creature_id IS NOT NULL`)) creatureIds.add(r.id);
for (const r of await sql(`SELECT id FROM creatures WHERE is_player_character = true`)) creatureIds.add(r.id);
const seed = [...creatureIds];
if (seed.length) {
  for (const r of await sql(`SELECT creature_id AS id FROM creature_companions WHERE owner_creature_id IN (${seed.join(',')})`)) creatureIds.add(r.id);
  // wildshape_forms is a JSONB array of creature ids on the character.
  for (const r of await sql(`SELECT jsonb_array_elements_text(wildshape_forms)::int AS id
                               FROM creatures WHERE id IN (${seed.join(',')})
                                AND wildshape_forms IS NOT NULL AND jsonb_typeof(wildshape_forms) = 'array'`)) creatureIds.add(r.id);
}
const inCreatures = creatureIds.size ? `(${[...creatureIds].join(',')})` : '(NULL)';

// Order matters: parents first. The importer replays this list top to bottom.
const PLAN = [
  // Referenced libraries and the custom origins a character may be built from.
  ['terrain_library',     `SELECT * FROM terrain_library WHERE id IN (SELECT library_id FROM map_terrain WHERE map_id IN ${inMaps})`],
  ['tile_library',        `SELECT * FROM tile_library WHERE id IN (SELECT tile_id FROM map_tiles WHERE map_id IN ${inMaps})`],
  ['ship_library',        `SELECT * FROM ship_library WHERE id IN (SELECT library_id FROM map_ships WHERE map_id IN ${inMaps})`],
  ['custom_races',        `SELECT * FROM custom_races`],
  ['custom_classes',      `SELECT * FROM custom_classes`],
  ['custom_backgrounds',  `SELECT * FROM custom_backgrounds`],
  ['languages',           `SELECT * FROM languages WHERE is_custom = true`],
  // Loot tables before creatures, because a creature references one.
  ['rollable_tables',     `SELECT * FROM rollable_tables`],
  ['rollable_table_rows', `SELECT * FROM rollable_table_rows`],
  // The spell and item libraries, WHOLE — not just the homebrew rows.
  //
  // A first boot seeds the SRD from Open5e over HTTP. On a laptop in a cottage
  // with no signal that seed silently does nothing, and the party sits down to a
  // spell list with 5 entries in it. The libraries are 2,000 rows and a couple of
  // megabytes of JSON; carrying them is the difference between a VTT that works
  // on holiday and one that needs the internet it was packed to do without.
  ['item_library',        `SELECT * FROM item_library`],
  ['spell_library',       `SELECT * FROM spell_library`],
  // The characters and monsters themselves.
  ['creatures',           `SELECT * FROM creatures WHERE id IN ${inCreatures}`],
  ['creature_images',     `SELECT * FROM creature_images WHERE creature_id IN ${inCreatures}`],
  ['creature_companions', `SELECT * FROM creature_companions WHERE owner_creature_id IN ${inCreatures}`],
  // The session and its maps.
  ['sessions',            `SELECT * FROM sessions WHERE id = ${S}`],
  ['maps',                `SELECT * FROM maps WHERE session_id = ${S}`],
  ['map_levels',          `SELECT * FROM map_levels WHERE map_id IN ${inMaps}`],
  ['map_terrain',         `SELECT * FROM map_terrain WHERE map_id IN ${inMaps}`],
  ['map_tiles',           `SELECT * FROM map_tiles WHERE map_id IN ${inMaps}`],
  ['map_ships',           `SELECT * FROM map_ships WHERE map_id IN ${inMaps}`],
  ['ship_decks',          `SELECT * FROM ship_decks WHERE ship_id IN (SELECT id FROM map_ships WHERE map_id IN ${inMaps})`],
  ['walls',               `SELECT * FROM walls WHERE map_id IN ${inMaps}`],
  ['doors',               `SELECT * FROM doors WHERE map_id IN ${inMaps}`],
  ['light_sources',       `SELECT * FROM light_sources WHERE map_id IN ${inMaps}`],
  ['map_portals',         `SELECT * FROM map_portals WHERE map_id IN ${inMaps}`],
  ['map_spawn_points',    `SELECT * FROM map_spawn_points WHERE map_id IN ${inMaps}`],
  ['map_fog_blocks',      `SELECT * FROM map_fog_blocks WHERE map_id IN ${inMaps}`],
  ['magical_darkness',    `SELECT * FROM magical_darkness WHERE map_id IN ${inMaps}`],
  ['dm_markers',          `SELECT * FROM dm_markers WHERE map_id IN ${inMaps}`],
  ['backdrops',           `SELECT * FROM backdrops`],
  ['door_sprites',        `SELECT * FROM door_sprites`],
  // Tokens last: they reference maps, creatures and companion bindings.
  ['session_tokens',      `SELECT * FROM session_tokens WHERE session_id = ${S}`],
  ['player_map_overrides',`SELECT * FROM player_map_overrides WHERE session_id = ${S}`],
];

const data = {};
const counts = {};
// Tables that could not be read at all. Tracked so the summary can say the pack
// is incomplete rather than leaving it to whoever scrolls back up.
const failed = new Map();
for (const [table, query] of PLAN) {
  try {
    const rows = await sql(query);
    data[table] = rows;
    counts[table] = rows.length;
    process.stdout.write(`  ${table.padEnd(22)} ${String(rows.length).padStart(5)}\n`);
  } catch (err) {
    // A table the live server does not have (an older release) is not a reason
    // to abandon the pack — it is a reason to say so and carry on.
    console.warn(`  ${table.padEnd(22)}  skipped: ${err.message.split('\n')[0]}`);
    failed.set(table, err.message.split('\n').pop().trim());
    data[table] = [];
    counts[table] = 0;
  }
}

// ── The files those rows point at ───────────────────────────────────────────
//
// Collected from every column that holds a path rather than by copying the whole
// uploads tree, which on this server is gigabytes of maps from campaigns that are
// not going on holiday.
const wanted = new Set();
const addPath = (v) => {
  if (typeof v !== 'string' || !v) return;
  const clean = v.replace(/^\/?uploads\//, '').trim();
  if (!clean || clean.startsWith('data:') || clean.startsWith('http')) return;
  if (/\.(png|jpg|jpeg|webp|gif|svg|mp3|ogg|wav|m4a|webm|glb|gltf|json|pdf)$/i.test(clean)) wanted.add(clean);
};
for (const rows of Object.values(data)) {
  for (const row of rows) {
    for (const [key, value] of Object.entries(row)) {
      if (/(image|path|file|sprite|art|src|backdrop|model)/i.test(key)) addPath(value);
      // Inventory and spell JSON can carry art paths too.
      if (value && typeof value === 'object') {
        try { JSON.stringify(value).match(/[\w/-]+\.(png|jpg|jpeg|webp|gif|svg)/gi)?.forEach(addPath); } catch { /* ignore */ }
      }
    }
  }
}

fs.mkdirSync(path.join(OUT, 'uploads'), { recursive: true });
console.log(`\n${wanted.size} file(s) referenced — copying…`);

// One tar over ssh rather than one docker cp per file: a session with 400 tokens
// references hundreds of images and a round trip each would take minutes.
let filesCopied = 0;
if (wanted.size) {
  const list = [...wanted].map((f) => `./${f}`).join('\n');
  fs.writeFileSync(path.join(OUT, '.filelist'), list);
  const remoteList = '/tmp/ttf-pack-files.txt';
  await run('sshpass', ['-e', 'scp', '-o', 'LogLevel=ERROR', '-o', 'PubkeyAuthentication=no',
    '-o', 'PreferredAuthentications=password', path.join(OUT, '.filelist'), `root@${SSH_HOST}:${remoteList}`],
    { env: { ...process.env, SSHPASS } });
  // Missing files are skipped rather than fatal: a row can point at art that was
  // deleted from disk, and that must not stop a holiday.
  await ssh(`docker cp ${remoteList} ${BACKEND_CONTAINER}:${remoteList} && ` +
    `docker exec ${BACKEND_CONTAINER} sh -c "cd /app/uploads && tar czf /tmp/ttf-pack.tgz -T ${remoteList} 2>/dev/null; true" && ` +
    `docker cp ${BACKEND_CONTAINER}:/tmp/ttf-pack.tgz /tmp/ttf-pack.tgz`);
  await run('sshpass', ['-e', 'scp', '-o', 'LogLevel=ERROR', '-o', 'PubkeyAuthentication=no',
    '-o', 'PreferredAuthentications=password', `root@${SSH_HOST}:/tmp/ttf-pack.tgz`, path.join(OUT, 'uploads.tgz')],
    { env: { ...process.env, SSHPASS } });
  await run('tar', ['xzf', path.join(OUT, 'uploads.tgz'), '-C', path.join(OUT, 'uploads')]);
  fs.rmSync(path.join(OUT, 'uploads.tgz'));
  fs.rmSync(path.join(OUT, '.filelist'));
  await ssh(`rm -f ${remoteList} /tmp/ttf-pack.tgz; docker exec ${BACKEND_CONTAINER} rm -f ${remoteList} /tmp/ttf-pack.tgz`);
  filesCopied = (await run('sh', ['-c', `find ${JSON.stringify(path.join(OUT, 'uploads'))} -type f | wc -l`])).stdout.trim();
}

const missing = [...wanted].filter((f) => !fs.existsSync(path.join(OUT, 'uploads', f)));

fs.writeFileSync(path.join(OUT, 'rows.json'), JSON.stringify(data, null, 1));
fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify({
  kind: 'tabletopforge-session-pack',
  version: 1,
  packedAt: new Date().toISOString(),
  from: HOST,
  session: { id: session.id, name: session.name, code: session.session_code },
  order: PLAN.map(([t]) => t),
  counts,
  files: { referenced: wanted.size, copied: Number(filesCopied) || 0, missing },
}, null, 2));

const skippedTables = Object.entries(counts).filter(([t, n]) => n === 0 && data[t] && failed.has(t)).map(([t]) => t);
console.log(`\nPacked into ${OUT}`);
if (failed.size) {
  console.log(`\n  ${failed.size} table(s) could not be read — the pack is INCOMPLETE:`);
  for (const [t, why] of failed) console.log(`     ${t}: ${why}`);
}
void skippedTables;
console.log(`  rows: ${Object.values(counts).reduce((a, b) => a + b, 0)} across ${Object.keys(counts).length} tables`);
console.log(`  files: ${filesCopied} copied${missing.length ? `, ${missing.length} referenced but not on disk` : ''}`);
if (missing.length) for (const m of missing.slice(0, 8)) console.log(`     missing: ${m}`);
console.log(`\nOn the laptop:  node scripts/unpack-session.mjs --in ${OUT}`);
