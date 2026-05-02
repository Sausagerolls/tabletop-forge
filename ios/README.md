# TableTop Forge — iOS / iPadOS / Mac companion app

Native player companion app for the TableTop Forge VTT. Built with SwiftUI as a single codebase that targets iPhone, iPad, and Mac (Designed-for-iPad on Mac for v1).

## What's here

```
ios/
├── README.md                   ← this file
└── TableTopForge/
    ├── TableTopForgeApp.swift  ← @main app entry
    ├── ContentView.swift       ← root view (Login or Home)
    ├── Models/                 ← Swift models matching server payloads
    ├── Services/               ← persistence + REST + Socket.IO
    ├── Views/                  ← Login, Home tab bar, per-tab screens
    └── Components/             ← reusable UI (HP bar, etc.)
```

## Setting up the Xcode project (one-time)

The Swift sources are here but the `.xcodeproj` isn't (avoids merge churn on a generated file). To make a runnable project:

1. **Open Xcode** → `File → New → Project…`
2. Pick **iOS → App**, click Next.
3. Product Name: `TableTopForge`. Interface: **SwiftUI**. Language: **Swift**. Storage: **None**. Click Next, save the new project anywhere — you can throw it away after this step.
4. In Finder, **drag the `TableTopForge/` folder from this repo into the Xcode project navigator** (replacing the auto-generated `TableTopForgeApp.swift` and `ContentView.swift`). Tick "Copy items if needed" off — leave them as references to this repo so edits sync.
5. Add the Socket.IO dependency: `File → Add Package Dependencies…` → paste `https://github.com/socketio/socket.io-client-swift` → Up to Next Major `16.1.0` → Add `SocketIO` to the `TableTopForge` target.
6. **Targets**: in the project settings, add iPad and Mac (Designed for iPad) under Supported Destinations.
7. Build and run.

Same project ships to all three platforms — pick the destination from the run-target dropdown.

## Running against your server

The Login screen asks for:
- **Server URL** — e.g. `http://192.168.50.131` for your live deploy, or `http://localhost` if you're running the Docker stack on the same Mac as the simulator.
- **Session Code** — same code players use in the web app.
- **Player Name** — same name they'd type on the Landing page.

These persist in `UserDefaults` under the keys defined in `SessionStore.swift` (`vtt.serverUrl`, `vtt.sessionCode`, `vtt.playerName`, `vtt.lastCreatureId`). Logout clears them and bounces back to the Login screen.

The auth model mirrors the web app: trust-by-name, no per-player password.

## What's wired in v1

- **Login** with persistence + Logout
- **Stats tab** — HP / temp HP edit, ability scores, AC. Live socket sync.
- **Dice / Light tab** — d4–d20 quick rolls, torch preset picker (Candle / Torch / Lantern / No Light)
- **Spells, Inventory tabs** — placeholder views with a clear pattern to extend
- **Whisper notifications** — DM whispers pop a native banner via `UNUserNotificationCenter`

Every state-changing event round-trips through the Socket.IO session room, so any change made here updates the web DM/player/spectator clients instantly, and any change there shows up here without a refresh.

## Porting to Android later

The architectural decisions (UserDefaults key names, socket event list, screen flow, sync contract) are saved alongside this app in the project memory file `native_app_spec.md`. The Android port should mirror those exactly — same SharedPreferences keys, same screens, same Socket.IO event surface — so behaviour matches across platforms.
