#!/usr/bin/env node
// Re-derive the native fork from the live app.
//
// WHY THIS EXISTS
//
// The fork is not a different product — it is the same app with the Docker
// assumptions removed (Postgres → PGlite, nginx → Express static, one port,
// writable paths outside the read-only .app bundle). Every previous sync was
// done by hand, and hand-syncing a 10,000-line server loses things quietly: by
// the time I looked, the fork had drifted to HALF the live backend and had
// silently lost its SPA-serving patch altogether, so a bundled .app would have
// served /api but no user interface.
//
// So the deltas live here as code. Running this script replaces the fork's
// source with the live source and re-applies each delta, and it FAILS LOUDLY if
// an anchor it expects is missing — which is what turns "the patch silently
// stopped applying" into "the sync refused to finish".
//
// Usage:  node scripts/sync-from-live.mjs [--dry-run]
//
// It never touches: src-tauri/ (the Rust shell), backend/src/db.js and
// paths.js (native-only), or frontend/public/loading.html (the Tauri splash).

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FORK = path.resolve(HERE, '..');
const LIVE = path.resolve(FORK, '..', 'restored-live');
const DRY = process.argv.includes('--dry-run');

if (!fs.existsSync(path.join(LIVE, 'backend/src/index.js'))) {
  console.error(`No live tree at ${LIVE} — nothing to sync from.`);
  process.exit(1);
}

let copied = 0;
let skipped = 0;
const notes = [];

// Files the fork owns outright. Copying the live version over these is how the
// fork stops being the fork.
const KEEP = new Set([
  'backend/src/db.js',        // PGlite in place of pg.Pool
  'backend/src/paths.js',     // writable-path resolver
  'frontend/public/loading.html',
]);

// Never worth carrying across.
const IGNORE = /(^|\/)(node_modules|dist|\.DS_Store|uploads)(\/|$)|\.bak[-.\d]*$|\.map$/;

function copyTree(rel) {
  const from = path.join(LIVE, rel);
  const to = path.join(FORK, rel);
  if (!fs.existsSync(from)) return;
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const childRel = path.join(rel, entry.name);
    if (IGNORE.test(childRel)) continue;
    if (entry.isDirectory()) { copyTree(childRel); continue; }
    if (KEEP.has(childRel)) { skipped++; continue; }
    const src = path.join(LIVE, childRel);
    const dst = path.join(FORK, childRel);
    const next = fs.readFileSync(src);
    if (fs.existsSync(dst) && fs.readFileSync(dst).equals(next)) continue;
    if (!DRY) {
      fs.mkdirSync(path.dirname(dst), { recursive: true });
      fs.writeFileSync(dst, next);
    }
    copied++;
  }
  void to;
}

// ── 1. The source itself ────────────────────────────────────────────────────
for (const tree of ['backend/src', 'frontend/src', 'frontend/public', 'sounds']) copyTree(tree);
for (const file of ['frontend/vite.config.js', 'frontend/index.html', 'frontend/tailwind.config.js',
                    'frontend/postcss.config.js', 'init.sql']) {
  const src = path.join(LIVE, file);
  const dst = path.join(FORK, file);
  if (!fs.existsSync(src)) continue;
  const next = fs.readFileSync(src);
  if (fs.existsSync(dst) && fs.readFileSync(dst).equals(next)) continue;
  if (!DRY) { fs.mkdirSync(path.dirname(dst), { recursive: true }); fs.writeFileSync(dst, next); }
  copied++;
}

// ── 2. package.json: live dependencies, native database ─────────────────────
//
// Taking live's file wholesale keeps new dependencies (three.js, adm-zip, …)
// arriving automatically — the fork was missing `three`, so the 3D view could
// not have built at all — while the swap below keeps PGlite in and pg out.
function syncBackendPackage() {
  const live = JSON.parse(fs.readFileSync(path.join(LIVE, 'backend/package.json'), 'utf8'));
  const forkPath = path.join(FORK, 'backend/package.json');
  const fork = JSON.parse(fs.readFileSync(forkPath, 'utf8'));
  const next = { ...live, name: 'dnd-vtt-backend-native', version: live.version };
  next.dependencies = { ...live.dependencies };
  delete next.dependencies.pg;
  next.dependencies['@electric-sql/pglite'] =
    fork.dependencies?.['@electric-sql/pglite'] || '^0.2.17';
  next.dependencies = Object.fromEntries(Object.entries(next.dependencies).sort());
  const text = JSON.stringify(next, null, 2) + '\n';
  if (fs.readFileSync(forkPath, 'utf8') !== text) {
    if (!DRY) fs.writeFileSync(forkPath, text);
    notes.push(`backend/package.json → version ${live.version}, pg swapped for PGlite`);
  }
}
function syncFrontendPackage() {
  const livePath = path.join(LIVE, 'frontend/package.json');
  const forkPath = path.join(FORK, 'frontend/package.json');
  const text = fs.readFileSync(livePath, 'utf8');
  if (fs.readFileSync(forkPath, 'utf8') !== text) {
    if (!DRY) fs.writeFileSync(forkPath, text);
    notes.push('frontend/package.json → taken from live (brings three.js and friends)');
  }
}
syncBackendPackage();
syncFrontendPackage();

// ── 3. The deltas, re-applied ───────────────────────────────────────────────
//
// Each patch states its anchor. A missing anchor is a hard error: it means the
// live file changed shape and the delta needs rewriting, which is exactly the
// moment a hand-sync would have dropped it on the floor.
function patch(rel, edits) {
  const file = path.join(FORK, rel);
  // A dry run has copied nothing, so the fork's copy is still the OLD file and
  // its anchors would all be missing. Check against the live text instead —
  // verifying the anchors is the whole point of running this dry.
  const source = DRY ? path.join(LIVE, rel) : file;
  let text = fs.readFileSync(source, 'utf8');
  for (const { find, replace, skipIf, label } of edits) {
    if (skipIf && text.includes(skipIf)) continue;
    const count = text.split(find).length - 1;
    if (count !== 1) {
      console.error(`\nFAILED: ${rel} — anchor for "${label}" found ${count} times, expected 1.`);
      console.error(`The live file has changed shape. Fix the anchor in scripts/sync-from-live.mjs.`);
      process.exit(2);
    }
    text = text.replace(find, replace);
    notes.push(`${rel} → ${label}`);
  }
  if (!DRY) fs.writeFileSync(file, text);
}

patch('backend/src/index.js', [
  {
    label: 'uploads served from the writable data dir',
    // The exact line this patch inserts, not just "./paths" anywhere in the
    // file. The loose marker matched ANY require of paths.js, so the moment
    // live code picked one up for its own reasons this patch decided it had
    // already run — and the fork shipped without the UPLOADS_DIR/ensureDir
    // import at all, dying on boot with "ensureDir is not defined".
    skipIf: "const { UPLOADS_DIR, SOUNDS_WRITE_DIR, ensureDir } = require('./paths');",
    find: "app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {",
    replace:
      "// Native build: everything written at runtime lives under $VTT_DATA_DIR,\n" +
      "// because the .app bundle's Resources are read-only once codesigned and a\n" +
      "// write into them fails with EPERM. Docker leaves the variable unset and\n" +
      "// paths.js falls back to the backend dir, so behaviour there is unchanged.\n" +
      "const { UPLOADS_DIR, SOUNDS_WRITE_DIR, ensureDir } = require('./paths');\n" +
      "app.use('/uploads', express.static(UPLOADS_DIR, {",
  },
  {
    // The shipped sounds ride along inside the bundle (read-only, fine), but
    // anything the GM uploads has to land in the writable dir, so both are
    // mounted and the writable one wins.
    label: 'uploaded sounds alongside the shipped ones',
    skipIf: 'SOUNDS_WRITE_DIR)',
    find: "app.use('/sounds', express.static(SOUNDS_DIR));",
    replace:
      "app.use('/sounds', express.static(ensureDir(SOUNDS_WRITE_DIR)));\n" +
      "app.use('/sounds', express.static(SOUNDS_DIR));",
  },
  {
    // The transfer router writes imported art into uploads/, which in a bundled
    // .app is read-only. It takes the dir as an argument precisely so this can be
    // pointed at the writable one.
    label: 'session packs written to the writable uploads dir',
    skipIf: 'makeTransferRouter(UPLOADS_DIR)',
    find: "app.use('/api/transfer',      makeTransferRouter(path.join(__dirname, '../uploads')));",
    replace: "app.use('/api/transfer',      makeTransferRouter(UPLOADS_DIR));",
  },
  {
    label: 'the built frontend and the SPA fallback',
    skipIf: 'FRONTEND_DIST',
    find: "const PORT = process.env.PORT || 3001;",
    replace:
      "// ── The user interface ───────────────────────────────────────────────────\n" +
      "//\n" +
      "// No nginx in the native build: this process serves the built React app as\n" +
      "// well as the API, on one port. The fallback hands index.html to any path\n" +
      "// that is not an API route, an upload or a socket, because React Router owns\n" +
      "// /dm, /play, /sheet and the rest — without it a reload on any of those\n" +
      "// returns a 404 from Express.\n" +
      "//\n" +
      "// Mounted here, after every API route, so it can never shadow one.\n" +
      "const FRONTEND_DIST = path.join(__dirname, '../../frontend/dist');\n" +
      "if (fs.existsSync(FRONTEND_DIST)) {\n" +
      "  app.use(express.static(FRONTEND_DIST));\n" +
      "  app.get(/^\\/(?!api|uploads|sounds|socket\\.io|plugins)(.*)/, (req, res, next) => {\n" +
      "    const index = path.join(FRONTEND_DIST, 'index.html');\n" +
      "    if (!fs.existsSync(index)) return next();\n" +
      "    res.sendFile(index);\n" +
      "  });\n" +
      "} else {\n" +
      "  console.warn('[native] frontend/dist missing — build it with: npm --prefix ../frontend run build');\n" +
      "}\n\n" +
      "const PORT = process.env.PORT || 3001;",
  },
]);

// Routes that write into uploads/ get the same redirect.
//
// Done by rewriting the ROOT expression wherever it appears, in whichever of the
// shapes the routes use:
//
//   path.join(__dirname, '../../uploads')              -> UPLOADS_DIR
//   path.join(__dirname, '../../uploads/creatures')    -> path.join(UPLOADS_DIR, 'creatures')
//   path.join(__dirname, '../../uploads', row.image)   -> path.join(UPLOADS_DIR, row.image)
//
// Two traps, both hit on the first attempt and both worth stating:
//
//  * The bare form is often nested — `path.resolve(path.join(__dirname,
//    '../../uploads'), rel)`. The match consumes path.join's own closing paren,
//    so the replacement must NOT put one back, or the outer call loses its
//    argument list and the file stops parsing.
//  * creatures.js already declares `const UPLOADS_DIR = path.join(__dirname,
//    '../../uploads')`. Rewriting that line yields `const UPLOADS_DIR =
//    UPLOADS_DIR`, and the injected require then declares it twice. Such a
//    declaration is dropped instead, since paths.js provides the same name.
const UPLOAD_SUB = /path\.join\(__dirname, ['"]\.\.\/\.\.\/uploads\/([A-Za-z0-9_-]+)['"]\)/g;
const UPLOAD_WITH_ARG = /path\.join\(__dirname, ['"]\.\.\/\.\.\/uploads['"]\s*,/g;
const UPLOAD_BARE = /path\.join\(__dirname, ['"]\.\.\/\.\.\/uploads['"]\)/g;
const OWN_DECL = /^const UPLOADS_DIR = path\.join\(__dirname, ['"]\.\.\/\.\.\/uploads['"]\);\s*$/m;

let routesPatched = 0;
for (const entry of fs.readdirSync(path.join(FORK, 'backend/src/routes'))) {
  if (!entry.endsWith('.js')) continue;
  const rel = `backend/src/routes/${entry}`;
  // Same reason as patch(): a dry run has copied nothing, so the fork's copy is
  // still the old file and would report the wrong answer.
  const source = DRY ? path.join(LIVE, rel) : path.join(FORK, rel);
  if (!fs.existsSync(source)) continue;
  let text = fs.readFileSync(source, 'utf8');
  if (text.includes("require('../paths')")) continue;
  const before = text;
  text = text.replace(OWN_DECL, '// UPLOADS_DIR now comes from ../paths (native build).')
             .replace(UPLOAD_SUB, (_m, seg) => `path.join(UPLOADS_DIR, '${seg}')`)
             .replace(UPLOAD_WITH_ARG, 'path.join(UPLOADS_DIR,')
             .replace(UPLOAD_BARE, 'UPLOADS_DIR');
  if (text === before) continue;
  // Inserted after the first require, so ordering cannot matter and no anchor
  // has to survive a refactor of the route's own imports.
  text = text.replace(/^(const .*= require\([^)]*\);)/m,
    "$1\nconst { UPLOADS_DIR, ensureDir } = require('../paths');");
  if (!DRY) fs.writeFileSync(path.join(FORK, rel), text);
  routesPatched++;
  notes.push(`${rel} -> uploads under the data dir`);
}
if (routesPatched === 0) {
  console.error('\nFAILED: no route file needed the uploads redirect.');
  console.error('Either they all moved to paths.js upstream (good - drop this step) or the');
  console.error('convention changed and the writable-path fix is silently not applying.');
  process.exit(2);
}

console.log(`${DRY ? '[dry run] ' : ''}${copied} file(s) ${DRY ? 'would be ' : ''}copied from live, ${skipped} native-only file(s) left alone.`);
for (const n of notes) console.log('  · ' + n);
console.log('\nNext: (cd backend && npm install) && (cd frontend && npm install && npm run build)');
