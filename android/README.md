# TableTop Forge — Android (native)

Kotlin + Jetpack Compose port of `ios/TableTopForge`. Same backend
(Socket.IO + REST), same data model, same screens. Mirrors are kept
**by hand** — when a feature lands on iOS, the matching change goes
into the corresponding `Models.kt` / `*Screen.kt` here. Each Kotlin
file has a top-of-file comment pointing to its iOS counterpart.

## Layout

```
android/
├── app/
│   ├── build.gradle.kts             # module config (compose, ktor, socket.io)
│   └── src/main/
│       ├── AndroidManifest.xml
│       ├── java/com/tabletopforge/
│       │   ├── MainActivity.kt
│       │   ├── data/Models.kt       # ← mirrors ios/.../Models.swift
│       │   ├── services/
│       │   │   ├── ApiClient.kt     # ← APIClient.swift
│       │   │   ├── SessionStore.kt  # ← SessionStore.swift
│       │   │   ├── SocketClient.kt  # ← SocketClient.swift
│       │   │   └── NotificationManager.kt
│       │   └── ui/
│       │       ├── AppRoot.kt
│       │       ├── LoginScreen.kt   # ← LoginView.swift
│       │       ├── HomeScreen.kt    # ← HomeView.swift
│       │       └── StatsScreen.kt   # ← StatsView.swift  (initial scaffold)
│       └── res/                     # icons, themes, strings
├── settings.gradle.kts
├── build.gradle.kts
├── gradle.properties
├── local.properties                 # SDK path (gitignored)
├── gradlew                          # generated wrapper
└── setup-env.sh                     # source this to put JDK + SDK on PATH
```

## SDK location

The Android SDK lives on the external SSD: `/Volumes/DevSSD/dev/android-sdk`.
That path is recorded in `local.properties` (gitignored). `setup-env.sh`
exports `JAVA_HOME` (Homebrew OpenJDK 17) and `ANDROID_HOME` so the
gradle wrapper, `adb`, `sdkmanager`, etc. all work without further
config in any shell that sources it.

## First-time setup on a fresh machine

```bash
brew install --cask openjdk@17 gradle
# (SDK already on the SSD; if not, replicate the cmdline-tools install)
cd android
source setup-env.sh
./gradlew assembleDebug   # downloads deps + builds
```

## Running on a device

```bash
source setup-env.sh
# plug in an Android device with USB debugging enabled
adb devices
./gradlew installDebug
adb shell am start -n com.tabletopforge/.MainActivity
```

For an emulator:

```bash
sdkmanager --install "system-images;android-34;google_apis;arm64-v8a"
avdmanager create avd -n Pixel7 -k "system-images;android-34;google_apis;arm64-v8a"
$ANDROID_HOME/emulator/emulator @Pixel7 &
./gradlew installDebug
```

## Mirroring policy

- Every Kotlin file at `services/` and `ui/` opens with a comment naming
  its iOS counterpart.
- The wire format (JSON keys) is the source of truth; both ports
  consume the same backend payloads.
- Screen ports are landing iteratively. Today: `LoginScreen`,
  `HomeScreen` (tabbed shell), `StatsScreen` (header + HP + AC).
  Pending: full Stats body, Abilities, Inventory, Spells, Dice & Light,
  Settings, Character Picker.
