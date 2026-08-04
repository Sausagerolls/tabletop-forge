# Apple Intelligence sidecar

A small Swift executable, `apple-intelligence-server`, that lets the TableTop
Forge backend use Apple's **on-device** model (Apple Intelligence) as an AI
provider — no API key, no model download, nothing leaves the Mac.

It exposes an OpenAI-compatible HTTP API on loopback, so the backend talks to it
with the exact same `callOpenAICompat()` path it uses for LM Studio / OpenAI:

| Method | Path | Purpose |
| ------ | ---- | ------- |
| `GET`  | `/health` | `{ status, available, reason? }` — is the model usable now? |
| `POST` | `/v1/chat/completions` | OpenAI Chat Completions (non-streaming) backed by `FoundationModels` |

## How it fits together

```
Tauri shell (Rust)            Node backend            Swift sidecar
  pick free loopback port  ─┐
  spawn sidecar  ───────────┼──────────────────────▶  apple-intelligence-server
  APPLE_AI_URL=...  ────────┴─▶  GET /api/ai/native      (FoundationModels)
                                  └─ probes /health ─────▶  /health
  provider:'apple' request  ───▶  callLLM('apple')  ────▶  /v1/chat/completions
```

- The sidecar listens on `127.0.0.1` only — the on-device model is never exposed
  to the LAN.
- It binds instantly and loads the model lazily on the first request.
- On an ineligible Mac (no Apple silicon / Apple Intelligence off) it still runs
  but `/health` reports `available:false` with a reason, which the GM sees in the
  AI settings panel.

## Requirements

- **Build:** macOS 26 SDK / **Xcode 26+** (FoundationModels framework).
- **Run:** Apple-silicon Mac, macOS 26+, Apple Intelligence enabled.

The host `.app` keeps `minimumSystemVersion: 12.0`. On older macOS the sidecar
simply fails to launch (or fails its health probe) and the provider isn't
offered — the rest of the app is unaffected.

## Building

It is **opt-in** — the default `.dmg` does not include it. Build via the signing
wrapper with the flag:

```bash
# from native-fork/
./scripts/build-signed.sh --apple-intelligence              # notarized .dmg
./scripts/build-signed.sh appstore --apple-intelligence     # App Store build
```

That script:
1. `swift build -c release --package-path apple-intelligence`
2. copies the binary to `src-tauri/binaries/apple-intelligence-server-<target-triple>`
   (the name Tauri's `externalBin` resolver expects)
3. runs `tauri build` with `--config src-tauri/tauri.apple.conf.json`
   (adds the externalBin) and `--features apple-intelligence`
   (enables the Rust spawn wiring).

To build just the sidecar by hand:

```bash
swift build -c release --package-path apple-intelligence
.build/release/apple-intelligence-server   # PORT=11535 by default
curl localhost:11535/health
```
