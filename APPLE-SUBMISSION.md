# Apple submission playbook

Two TableTop Forge products go through Apple, each with its own
bundle id, provisioning profile, and App Store Connect record:

| Product | Bundle ID | Source | Apple platform |
| --- | --- | --- | --- |
| **TableTop Forge Companion** (player app) | `com.giantmushroom.tabletopforgecomp` | `ios/` | iPhone + iPad + Mac Catalyst |
| **TableTop Forge Server** (standalone) | `studio.giantmushroom.tabletopforge` | `native-fork/` | Mac (Catalyst-free) — direct `.dmg` and Mac App Store |

Team ID for both: `J4UJD4Z33J` (paid Developer Program).

Once-only setup (~30 min) is identical for both — three certs +
one app-specific password live in your Apple Developer account
and your local keychain. After that, every build just runs the
wrapper script.

---

## Step 1 — Create the certs

You need three. All are issued from
<https://developer.apple.com/account/resources/certificates>.

| Certificate | Used for | Backup as |
| --- | --- | --- |
| **Developer ID Application** | Notarized `.dmg` (`forge.giantmushroom.studio` direct download) | `DeveloperID.p12` |
| **Apple Distribution** | Mac App Store + iOS App Store submissions | `AppleDistribution.p12` |
| **Apple Development** (this team) | Local builds + TestFlight uploads from this Mac | already in your keychain once Xcode runs the new team |

The fastest path is **Xcode → Settings → Accounts → Manage
Certificates → `+`**. Click each cert type once; Xcode generates
the private key in your login keychain and registers the cert
with Apple in the same step.

After they're created:

```bash
security find-identity -p codesigning -v
# Expected output (in some order):
#   Apple Development: Jake Watts (J4UJD4Z33J)
#   Apple Distribution: Jake Watts (J4UJD4Z33J)
#   Developer ID Application: Jake Watts (J4UJD4Z33J)
```

**Back up the private keys to `.p12` files.** Lose the keys and
you can't sign updates to the same App Store record without
regenerating them, which trips Mac/iOS users who already
installed your app:

1. Open Keychain Access.app → "login" keychain.
2. Right-click each of the three certs → Export → `.p12`.
3. Pick a strong password.
4. Copy each to iCloud + Nextcloud, alongside your existing
   Android keystore backup folder.

```bash
mkdir -p ~/Library/Mobile\ Documents/com~apple~CloudDocs/TableTop\ Forge\ Apple\ Signing
mkdir -p ~/Nextcloud/TableTop\ Forge\ Apple\ Signing
# After exporting via Keychain Access:
cp ~/Desktop/AppleDistribution.p12 ~/Library/Mobile\ Documents/com~apple~CloudDocs/TableTop\ Forge\ Apple\ Signing/
cp ~/Desktop/AppleDistribution.p12 ~/Nextcloud/TableTop\ Forge\ Apple\ Signing/
# Repeat for the other two .p12 files.
```

---

## Step 2 — App-specific password for `notarytool`

`notarytool` (used both for direct-distribution notarization and
for the App Store upload pre-flight) authenticates with your
Apple ID — but Apple won't let you use your real Apple ID
password from the command line. You need an app-specific
password instead.

1. <https://appleid.apple.com> → Sign-In and Security →
   App-Specific Passwords → `+`.
2. Label it `TableTop Forge notary` (or anything memorable).
3. Apple shows the password ONCE. Format `abcd-efgh-ijkl-mnop`.
4. Copy it into `native-fork/.signing-env` (next step).

Lose it later? It's regenerable from the same page; old one
gets revoked.

---

## Step 3 — Fill in `.signing-env`

```bash
cd native-fork
cp .signing-env.example .signing-env
$EDITOR .signing-env
```

Set `APPLE_PASSWORD` to the app-specific password from step 2.
Confirm `APPLE_TEAM_ID` matches your paid team
(`J4UJD4Z33J`). Confirm `APPLE_SIGNING_IDENTITY` matches the
Developer ID Application cert from step 1 — the wrapper script
verifies this against the keychain before it builds, so a
typo gets caught immediately.

`.signing-env` is gitignored. Keep a copy in your password
manager so a fresh checkout on a different Mac just needs you
to paste it.

---

## Step 4 — Register the apps in App Store Connect

Both apps need an App Store Connect record. Create them from
<https://appstoreconnect.apple.com/apps> → `+` → New App.

### TableTop Forge Companion (player app)
- **Platforms**: iOS + macOS (Mac Catalyst)
- **Bundle ID**: `com.giantmushroom.tabletopforgecomp` (register on
  Developer → Identifiers first if it's not there, then pick it
  from the dropdown)
- **SKU**: `tabletopforge-companion`
- **Primary language**: English (U.K.)

### TableTop Forge Server (standalone Mac)
- **Platforms**: macOS
- **Bundle ID**: `studio.giantmushroom.tabletopforge` (register
  this on Developer → Identifiers first if it's not there;
  the existing scaffolding uses it for the Tauri build)
- **SKU**: `tabletopforge-server`
- **Primary language**: English (U.K.)

Listing copy for each lives at `android/play-store/listing.md`
— reuse the long description with light edits (drop the
Android-specific bits about sideload + Play Store, mention the
companion-vs-server difference where it matters).

---

## Step 5 — Build it

### Path A — Notarized `.dmg` for the website

```bash
cd native-fork
npm run tauri:build:signed
```

That's it. The wrapper script:
1. Verifies `.signing-env` exists + every var is filled in.
2. Verifies the Developer ID cert is in your keychain.
3. Patches `tauri.conf.json` to point at the
   `Entitlements.DeveloperID.plist` file.
4. Runs `tauri build` with the four env vars exported.
5. Tauri's bundler signs the `.app`, runs `notarytool submit
   … --wait`, then staples the notarization ticket.
6. Verifies the signature + Gatekeeper status of the output.

Expected runtime on this machine: ~3 minutes for the build +
1–5 minutes for Apple's notary service to finish.

### Path B — Mac App Store `.pkg`

```bash
cd native-fork
# .signing-env: temporarily change APPLE_SIGNING_IDENTITY to the
# Apple Distribution cert:
#   APPLE_SIGNING_IDENTITY=Apple Distribution: Jake Watts (J4UJD4Z33J)
npm run tauri:build:appstore
```

The wrapper flips `tauri.conf.json` to use the App Sandbox
entitlements (`Entitlements.AppStore.plist`) for this build.
Output is at
`native-fork/src-tauri/target/release/bundle/macos/`. Upload
the `.pkg` via **Transporter.app** (free from the Mac App
Store) or `xcrun altool --upload-app -f`.

### Path C — iOS / iPadOS / Mac Catalyst (the existing Xcode app)

The Xcode app at `ios/` doesn't go through the Tauri pipeline —
Xcode handles the upload to TestFlight + App Store Connect:

1. Open `ios/TableTopForge.xcodeproj` in Xcode 15+.
2. Pick the `TableTopForge` scheme + the `Any iOS Device (arm64)`
   destination.
3. Product → Archive. Wait for the upload pre-flight.
4. Organizer window opens; pick the new archive → "Distribute
   App" → "App Store Connect" → "Upload".
5. The build appears in App Store Connect → TestFlight tab in
   ~10 min for processing.

No `.signing-env` for this path — Xcode pulls credentials from
`Config.xcconfig` (team ID) + your Apple ID account in
Settings → Accounts.

---

## Step 6 — First-review notes (every product, every store)

The same answer fits every reviewer asking "why does your app act
as a server?" or "why does it need local-network access?":

> TableTop Forge is a self-hosted virtual tabletop. The user voluntarily runs the server on their own machine, then connects their own iPhones / iPads / Macs / browsers to it on their LAN. The server isn't a background daemon and never starts without the user opening the app.

Paste it into App Review Notes when you submit. It's the same
copy that's in your Play Store listing's "App overview" field.

---

## Step 7 — When it works

Update `forge.giantmushroom.studio`'s landing page:
- Swap the `App Store (iOS / macOS) — Coming Soon` pill for a
  real `<a href="https://apps.apple.com/...">` link.
- Mac App Store gets a separate badge alongside the .dmg
  download — same product, two distribution paths, same way the
  Android section will show "APK + Play Store" once Play
  approves.

The .dmg path also gets a notarization upgrade — current users
seeing "developer cannot be verified" Gatekeeper warnings won't
see them anymore on the next download.

---

## Cheat-sheet

| Need this | Run this |
| --- | --- |
| Build a notarized `.dmg` | `cd native-fork && npm run tauri:build:signed` |
| Build a Mac App Store `.pkg` | `cd native-fork && npm run tauri:build:appstore` |
| Verify the bundle is signed | `codesign --verify --verbose=4 path/to/app` |
| Verify Gatekeeper accepts it | `spctl --assess --verbose=4 path/to/app` |
| Verify the notarization ticket is stapled | `xcrun stapler validate path/to.dmg` |
| Re-issue a cert | Xcode → Settings → Accounts → Manage Certificates → `+` |
| New app-specific password | <https://appleid.apple.com> → Sign-In and Security |
