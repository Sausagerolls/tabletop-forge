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

1. **Tauri shell** — wraps the Express+PGlite process as a sidecar
   inside a webview-only Mac/Windows/Linux app. Needs Rust
   toolchain (`brew install rustup-init && rustup-init`) and
   `npm install --save-dev @tauri-apps/cli`. Wire-up: `tauri.conf.json`
   declares the Node binary as a sidecar, the splash command runs
   `node src/index.js` on a free port, and the webview loads
   `http://127.0.0.1:<port>/`. Ports the app icon in too so the
   .dmg / .msi looks native.
2. **Bundled Node runtime.** Right now the user needs Node
   installed. Two options once Tauri's in: Tauri's `binaries`
   config bundles a per-platform Node binary, OR replace Node
   with `bun build --compile` to produce a single x86_64 / arm64
   executable.
3. **Uploads + plugins dir.** Today both live next to the backend
   (`backend/uploads/`, `backend/plugins/`). For a packaged app
   they should redirect to `~/.tabletopforge/uploads` and
   `~/.tabletopforge/plugins` — the .app bundle's resources are
   read-only on macOS once codesigned. Hook lives at the top of
   `backend/src/index.js` where the multer dest is set.
4. **PDF parsing.** The spell-scanner imports a Python script
   path for SRD parsing (`parseSrd2024.py`). On a packaged app
   we'd either bundle a Python sidecar too or rewrite that step
   in JS. Not on the critical path — first-boot SRD seed already
   pulls from Open5e over HTTP, so the scanner is GM-side optional.

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
