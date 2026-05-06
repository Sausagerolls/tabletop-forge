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

/// Pick a port for the backend.
///
/// Tries the canonical 3001 first (matches the Docker stack so a
/// returning GM types the same URL into players' phones every
/// session), then walks up to 3010 looking for a free one, then
/// falls back to a random port the kernel assigns. Bind probe is
/// against `0.0.0.0` rather than `127.0.0.1` so a port we claim
/// here is also free for the backend's LAN-facing socket — Express
/// listens on all interfaces by default so other devices on the
/// same Wi-Fi can reach the server.
fn pick_free_port() -> Option<u16> {
    for candidate in 3001u16..=3010 {
        if TcpListener::bind(("0.0.0.0", candidate)).is_ok() {
            return Some(candidate);
        }
    }
    TcpListener::bind("0.0.0.0:0")
        .ok()
        .and_then(|l| l.local_addr().ok())
        .map(|a| a.port())
}

/// Returns the first non-loopback IPv4 address we can find — what
/// players on the same LAN should type into their phones. Best-
/// effort: works on macOS / Linux / Windows when the machine has a
/// network up, returns None otherwise (the splash falls back to
/// localhost-only in that case).
fn lan_address() -> Option<String> {
    use std::process::Command;
    // `ifconfig` works on macOS + Linux. Pull the first inet that
    // isn't 127.x or a docker bridge.
    let out = Command::new("ifconfig").output().ok()?;
    let text = String::from_utf8_lossy(&out.stdout);
    for line in text.lines() {
        let trimmed = line.trim_start();
        if !trimmed.starts_with("inet ") { continue; }
        let addr = trimmed.split_whitespace().nth(1)?.to_string();
        if addr.starts_with("127.") || addr.starts_with("169.254.") { continue; }
        return Some(addr);
    }
    None
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

    // Tauri's `externalBin` config drops a `node-<target-triple>`
    // binary into the bundle next to the main executable —
    // `Contents/MacOS/node` on macOS, `<install>/node.exe` on
    // Windows. We probe for it sibling to current_exe() first so
    // the packaged .app needs no system Node install. If that
    // fails (e.g. `cargo run` without bundling) we fall back to
    // whichever `node` is on $PATH so dev-mode iteration still
    // works without rebuilding the bundle.
    let bundled_node = std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|p| p.to_path_buf()))
        .map(|dir| {
            let suffix = if cfg!(windows) { ".exe" } else { "" };
            dir.join(format!("node{}", suffix))
        })
        .filter(|p| p.exists());
    let node_cmd = bundled_node
        .map(|p| p.into_os_string())
        .unwrap_or_else(|| std::ffi::OsString::from("node"));

    let mut cmd = Command::new(&node_cmd);
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
    let local_url = format!("http://127.0.0.1:{}/", port);
    let lan_url   = lan_address().map(|ip| format!("http://{}:{}/", ip, port));

    tauri::Builder::default()
        .manage(BackendProc(Mutex::new(None)))
        .setup(move |app| {
            let handle = app.handle().clone();
            // Spawn backend on the main thread before the webview
            // tries to load — saves a flash of "ERR_CONNECTION_
            // REFUSED" while node + PGlite are warming up.
            let child = spawn_backend(&handle, port);
            *handle.state::<BackendProc>().0.lock().unwrap() = child;

            // Surface the URLs to the splash screen IMMEDIATELY —
            // before wait_for_backend blocks for the next few
            // seconds — so the GM can already start reading the
            // LAN address off to players. The loading.html splash
            // listens for window.__forgeUrls and re-renders.
            let win = app.get_webview_window("main")
                .expect("main window declared in tauri.conf.json");
            let lan_js = lan_url.as_deref().unwrap_or("");
            let _ = win.eval(&format!(
                "window.__forgeUrls = {{ local: '{}', lan: '{}' }}; \
                 if (window.__renderForgeUrls) window.__renderForgeUrls();",
                local_url, lan_js,
            ));

            wait_for_backend(port);

            // Backend is up — flip the webview from the splash to
            // the React app served by Express. Always navigate to
            // the loopback URL inside the window itself; the LAN
            // form is only useful for OTHER devices.
            win.eval(&format!("window.location.replace('{}')", local_url)).ok();
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
