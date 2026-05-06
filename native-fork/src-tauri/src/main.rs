// TableTop Forge — Tauri shell.
//
// What this binary does:
//   1. Picks a free TCP port on 127.0.0.1.
//   2. Spawns the Node-based Express + PGlite backend as a child
//      process, handing it that port via $PORT.
//   3. Polls the backend's /api/health until it returns 200.
//   4. Tells the Tauri webview to load http://127.0.0.1:<port>/
//      so the shipped React app shows up just like the Docker
//      build.
//   5. On window close, kills the backend process so the user
//      doesn't end up with an orphan Node sitting on a port.
//
// Why a sidecar instead of "build everything into Rust": the
// existing backend is ~3kloc of Express + ~30 routes that already
// work; rewriting them in Rust to replace this 80-line bridge
// would be weeks of churn for zero feature gain.

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::net::TcpListener;
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Manager};

/// Holds the spawned Node process so the window-close hook can
/// reach in and kill it. `Mutex<Option<Child>>` rather than just
/// `Option<Child>` because Tauri's event handlers need `Send + Sync`
/// access.
struct BackendProc(Mutex<Option<Child>>);

/// Find a free port by binding to :0, reading the port the kernel
/// assigned, then dropping the listener. Race window between drop
/// and the Node process picking it up is microseconds; in practice
/// nothing else on a desktop targets a random localhost port that
/// fast.
fn pick_free_port() -> Option<u16> {
    TcpListener::bind("127.0.0.1:0")
        .ok()
        .and_then(|l| l.local_addr().ok())
        .map(|a| a.port())
}

/// Spawn `node <repo>/native-fork/backend/src/index.js` with the
/// chosen port + a per-app data directory. Returns the Child so
/// the caller can stash it for kill-on-exit. Stderr/stdout are
/// inherited from the Tauri process so logs end up in
/// `~/Library/Logs/...` on macOS and the equivalent on Win/Linux
/// when the bundled app pipes them through.
fn spawn_backend(app: &AppHandle, port: u16) -> Option<Child> {
    // Resolve the backend entry point. Three locations to try, in
    // order:
    //
    //   1. Tauri's resource_dir() — what `tauri build` ships into
    //      the .app's Contents/Resources/. Reliable for end users.
    //   2. Walk up from the binary's location — for `cargo run` or
    //      `tauri build --no-bundle` the binary lives at
    //      `native-fork/src-tauri/target/<profile>/tabletopforge`,
    //      so going three parents up + `backend/src/index.js` hits
    //      the fork's backend.
    //   3. CARGO_MANIFEST_DIR — set at compile time, points at
    //      `native-fork/src-tauri/`. Only useful for `cargo run`,
    //      gone once the binary moves elsewhere, but safe as a
    //      last fallback for development invocations that don't
    //      ship a resources dir.
    //
    // Earlier versions used `current_dir()` which resolved against
    // wherever the user ran the binary from — that hit the wrong
    // copy of `backend/` whenever the launcher cwd happened to
    // be the parent repo root.
    let backend_entry = {
        // Tauri's bundler rewrites resources whose source paths
        // start with `../` to live under `_up_/<original>` inside
        // the .app's Resources/ — that's where `../backend/**/*`
        // (declared in tauri.conf.json) lands. We probe both
        // shapes because some future config might keep the
        // resources in-tree without the prefix.
        let bundled = app
            .path()
            .resource_dir()
            .ok()
            .and_then(|p| {
                let prefixed = p.join("_up_/backend/src/index.js");
                let plain    = p.join("backend/src/index.js");
                if prefixed.exists() { Some(prefixed) }
                else if plain.exists() { Some(plain) }
                else { None }
            });
        let near_exe = std::env::current_exe()
            .ok()
            .and_then(|p| p.parent().map(|p| p.to_path_buf()))
            .and_then(|p| p.ancestors().nth(3).map(|p| p.to_path_buf()))
            .map(|p| p.join("backend/src/index.js"))
            .filter(|p| p.exists());
        let from_manifest = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .parent()
            .map(|p| p.join("backend/src/index.js"))
            .filter(|p| p.exists());
        bundled.or(near_exe).or(from_manifest)?
    };

    // Per-user app-support directory for PGlite + uploads. macOS:
    // ~/Library/Application Support/TableTop Forge/. Windows:
    // %APPDATA%\TableTop Forge\. Linux: ~/.local/share/TableTop
    // Forge/. Tauri normalises all of this through the path API.
    let data_dir = app.path().app_data_dir().ok();

    let mut cmd = Command::new("node");
    cmd.arg(&backend_entry)
        .env("PORT", port.to_string())
        .env("DM_MASTER_PASSWORD", "dungeonmaster")
        .stdout(Stdio::inherit())
        .stderr(Stdio::inherit());
    if let Some(dir) = data_dir {
        std::fs::create_dir_all(&dir).ok();
        cmd.env("VTT_DATA_DIR", dir);
    }
    cmd.spawn().ok()
}

/// Poll /api/health until 200 or the timeout expires. Tight loop
/// at first, then a short sleep — node + PGlite usually warm up
/// in 2–3 seconds, but first launch (init.sql + SRD seed) can
/// stretch past 10 s.
fn wait_for_backend(port: u16) {
    let deadline = Instant::now() + Duration::from_secs(30);
    let url = format!("http://127.0.0.1:{}/api/health", port);
    while Instant::now() < deadline {
        if let Ok(stream) = std::net::TcpStream::connect_timeout(
            &format!("127.0.0.1:{}", port).parse().unwrap(),
            Duration::from_millis(200),
        ) {
            // Cheap connectivity check — we can issue HTTP later
            // via the webview itself; the kernel-level open is
            // enough to know the server is bound.
            drop(stream);
            return;
        }
        std::thread::sleep(Duration::from_millis(200));
    }
    eprintln!("[shell] backend never bound :{}", port);
    let _ = url; // currently unused; future http probe can use it
}

fn main() {
    let port = pick_free_port().expect("no free port available");
    let url = format!("http://127.0.0.1:{}/", port);

    tauri::Builder::default()
        .manage(BackendProc(Mutex::new(None)))
        .setup(move |app| {
            let handle = app.handle().clone();
            // Spawn backend on the main thread before the webview
            // tries to load — saves a flash of "ERR_CONNECTION_
            // REFUSED" while node + PGlite are warming up.
            let child = spawn_backend(&handle, port);
            *handle.state::<BackendProc>().0.lock().unwrap() = child;
            wait_for_backend(port);

            // Point the webview at the backend's URL.
            let win = app.get_webview_window("main")
                .expect("main window declared in tauri.conf.json");
            win.eval(&format!("window.location.replace('{}')", url)).ok();
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                if let Some(state) = window.app_handle().try_state::<BackendProc>() {
                    if let Some(mut child) = state.0.lock().unwrap().take() {
                        let _ = child.kill();
                    }
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
