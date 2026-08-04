// swift-tools-version: 6.2
//
// Apple Intelligence sidecar for the TableTop Forge native macOS app.
//
// Produces a single executable, `apple-intelligence-server`, that exposes an
// OpenAI-compatible /v1/chat/completions endpoint backed by Apple's on-device
// model via the FoundationModels framework. The Node backend talks to it
// exactly like it talks to LM Studio / Ollama / OpenAI — no special client.
//
// Requires the macOS 26 SDK (Xcode 26+) to build, and runs only on
// Apple-silicon Macs with Apple Intelligence enabled. On any other machine the
// process exits cleanly so the Tauri shell's fallback (no APPLE_AI_URL → the
// provider simply isn't offered) kicks in.
import PackageDescription

let package = Package(
    name: "AppleIntelligenceServer",
    platforms: [.macOS(.v26)],
    targets: [
        .executableTarget(
            name: "apple-intelligence-server",
            path: "Sources/apple-intelligence-server"
        )
    ]
)
