# native-fork — TableTop Forge without Docker

Standalone fork of the VTT backend + frontend that runs on plain
Node.js with no external Postgres install. Goal: a single double-
clickable native app per platform once the Tauri shell lands on
top. This folder is the staging area; if it survives soak-testing
it'll merge back into the main app (or replace its release path).

## What changed vs the main app

* **Postgres → PGlite.** `backend/src/db.js` swaps `pg.Pool` for
  `@electric-sql/pglite` — Postgres compiled to WebAssembly that
  runs in-process and persists to `~/.tabletopforge/db/` (override
  with `VTT_DATA_DIR`). The result-shape shim returns
  `{ rows, rowCount, fields }` so the rest of the codebase didn't
  need any changes — every `db.query(...)` call site keeps working.
  init.sql runs once on first launch via a sentinel file.
* **nginx → Express static.** The Docker frontend container is
  gone; the same Express process now serves `frontend/dist/` plus
  a SPA fallback so `/`, `/dm`, `/play`, `/spectate`,
  `/edit-character` all hand back `index.html` and let React
  Router take over. `/api/*`, `/uploads/*`, `/sounds/*`,
  `/socket.io/*` keep their existing routes.
* **Single port.** Backend + frontend both on `:3001` (overridable
  via `PORT`). No proxy, no inter-container network.

## Smoke-test checklist (verified on macOS, Node 22)

* Boot to `/api/health` returning 200 — clean
* `/api/version` reports `1.9.13` — clean
* Catch-all returns the React index.html — clean
* `POST /api/sessions` → bcrypt-hash insert into PGlite — clean
* `POST /api/sessions/:code/verify-dm` → bcrypt compare — clean
* `GET /api/sessions/:code` → JOIN with maps table — clean
* `GET /api/plugins` → reconcile + JSONB manifest read — clean
* SRD-2014 + SRD-2024 spell seed kicks off automatically on first
  boot. Network-dependent (Open5e); idempotent on re-runs.

## How to run it locally

```bash
cd native-fork

# 1. Install deps once.
(cd backend  && npm install)
(cd frontend && npm install)

# 2. Build the React app — Express serves it statically.
(cd frontend && npm run build)

# 3. Start the backend. PORT defaults to 3001.
cd backend
DM_MASTER_PASSWORD=devpass node src/index.js
```

Then open <http://localhost:3001/> — same Landing screen as the
Docker stack, talking to the same Socket.IO server.

Persistent data lives at `~/.tabletopforge/`:
* `db/` — PGlite's data dir (drop it to reset).
* `.schema_initialised` — sentinel; rerun init.sql by deleting.

## What's left before this can ship as a native app

### Phase 2 — Tauri shell (DONE)

* `src-tauri/` is a Rust crate that wraps the Express + PGlite
  process as a sidecar. On launch it picks a free port, spawns
  `node ../backend/src/index.js` with `PORT` + `VTT_DATA_DIR`
  set, polls until the server binds, then redirects the webview
  at `http://127.0.0.1:<port>/`. On window close the `Child`
  handle stored in Tauri state gets `.kill()`d so node doesn't
  outlive the shell.
* `tauri.conf.json` ships `backend/`, `frontend/dist/`,
  `init.sql`, `sounds/`, and `default_player.png` as bundled
  resources under `Contents/Resources/_up_/`. The bundled
  Node app reads from there at runtime.
* App icons regenerated from `frontend/public/icons/icon-512.png`
  via `npx tauri icon`, covers macOS .icns + Windows .ico +
  Linux PNGs + the Android / iOS sets it produces as a side
  effect.
* macOS smoke test: `tauri build` produces a 50MB .app + 19MB
  .dmg. Double-click the .app, backend warms up in ~3s, the
  webview loads the React Landing screen, character creation
  + GM session create + plugin manager all work.

```bash
# From native-fork/
source ~/.cargo/env       # cargo + rustc on PATH
npm install               # Tauri CLI
npm run tauri:build       # produces src-tauri/target/release/bundle/...
```

The .app currently still requires `node` on the user's PATH —
Tauri spawns it via `Command::new("node")`. Bundling Node as a
sidecar is the next-up Phase 2.5 task below.

### Phase 2.5 — Bundle Node binary as sidecar

Tauri's `bundle.externalBin` config drops platform-specific
binaries into the .app/Contents/MacOS/ directory at bundle
time. We'd download Node 22.x for `aarch64-apple-darwin`,
`x86_64-apple-darwin`, `x86_64-pc-windows-msvc`, and
`x86_64-unknown-linux-gnu` from <https://nodejs.org/dist/>,
rename them to `node-<target-triple>`, drop into
`src-tauri/binaries/`, and reference via `externalBin` so each
platform-specific bundle gets the right one. The Rust shell
swaps `Command::new("node")` for the resolved sidecar path.

Cleaner alternative: replace Node with `bun build --compile`
to produce a single self-contained executable that bakes in
the entire backend + node_modules. ~70MB extra per platform vs
~30MB for raw Node + bundled JS, but no spawn-the-runtime step.

### Phase 3 — productionising for end users

1. **Uploads + plugins dir relocation.** Today both live next
   to the backend (`backend/uploads/`, `backend/plugins/`). For
   a packaged app they should redirect to the per-user
   `app_data_dir` Tauri exposes (already passed in via
   `VTT_DATA_DIR`) — the .app bundle's resources are read-only
   on macOS once codesigned. Hook lives at the top of
   `backend/src/index.js` where the multer dest is set.
2. **PDF parsing.** The spell-scanner imports a Python script
   path for SRD parsing (`parseSrd2024.py`). On a packaged app
   we'd either bundle a Python sidecar too or rewrite that step
   in JS. Not on the critical path — first-boot SRD seed already
   pulls from Open5e over HTTP, so the scanner is GM-side optional.
3. **Code-signing + notarisation.** macOS Gatekeeper will warn
   on first launch until the .app is signed with the team's
   Developer ID and notarised by Apple. Same for Windows
   SmartScreen with an EV cert. Both feed off the same Tauri
   bundle output so the integration is mostly CI plumbing.
4. **Auto-update.** Tauri has a built-in updater plugin that
   reads a JSON manifest similar to the Android OTA flow. Wire
   it to a release URL on `forge.giantmushroom.studio/desktop/`
   and the .app self-updates without re-downloading from the
   marketing site.

## Things tested *not* to be issues

* `pg.query`'s `$1, $2` placeholders work as-is in PGlite.
* JSONB columns round-trip correctly (plugin manifests, conditions
  arrays, multiclasses array).
* `NOW()`, `SERIAL`, `UUID PRIMARY KEY`, `REFERENCES … ON DELETE
  CASCADE`, `ON CONFLICT … DO UPDATE`, `ARRAY` ops — all PGlite-
  compatible (it really is Postgres, just compiled to WASM).
* bcryptjs hashes encode + verify normally.

## Things to watch for during soak

* `pg`'s `result.rowCount === 0` semantics on no-op UPDATE/DELETE —
  the shim maps PGlite's `affectedRows` to `rowCount`, but verify
  every `if (r.rowCount === 0)` branch in routes/.
* Concurrent writes — PGlite is single-threaded; if Socket.IO
  bursts hit it hard during combat we'll see queueing. Likely fine
  for the small-table scale this app targets, but worth a stress
  test before merging.
* PGlite's `.exec()` swallows individual statement errors silently
  in some versions — init.sql failure surfaces clearly here, but
  watch for that on schema migrations added later.
