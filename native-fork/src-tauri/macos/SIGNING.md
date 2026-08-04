# Signing + notarizing the macOS .dmg

Two distribution paths, two certs to create. Pick whichever you're
shipping. The Tauri config + entitlement plists are already wired up;
these are the steps you take *once* in your Apple Developer account
plus the env vars you set at build time.

## Path 1 — Direct distribution (.dmg on forge.giantmushroom.studio)

What ends users see if you skip this: the `.dmg` opens, but on first
launch the OS shows *"TableTop Forge.app cannot be opened because the
developer cannot be verified"*. They have to right-click → Open and
confirm an OK button. Notarization removes that warning entirely.

### Cert + creds (one-time, ~10 minutes)

1. **Apple Developer Program** ($99/year).
2. **Create a Developer ID Application certificate**:
   * Open Xcode → Settings → Accounts.
   * Pick your team → Manage Certificates.
   * Click `+` → "Developer ID Application".
   * Xcode generates the cert + private key in your login keychain.
3. **Create an app-specific password** for `notarytool`:
   * Sign in to <https://appleid.apple.com>.
   * Sign-In and Security → App-Specific Passwords → `+`.
   * Label it `TableTop Forge notary`, copy the generated password.
4. **Note your Team ID** at <https://developer.apple.com/account>
   → Membership Details. Looks like `ABCDE12345`.

### Build with signing + notarization

Set four env vars before `npm run tauri:build`:

```bash
# The signing identity name as it appears in `security find-identity`.
# For Developer ID Application this looks like:
#   "Developer ID Application: Jake Watts (ABCDE12345)"
export APPLE_SIGNING_IDENTITY="Developer ID Application: Jake Watts (ABCDE12345)"

# Your Apple ID email + the app-specific password from step 3.
export APPLE_ID="jakewatts809@googlemail.com"
export APPLE_PASSWORD="abcd-efgh-ijkl-mnop"

# Team ID from step 4.
export APPLE_TEAM_ID="ABCDE12345"

# Then run the bundle as usual:
npm run tauri:build
```

Tauri's macOS bundler reads these env vars during `tauri build`,
codesigns the .app, calls `notarytool submit … --wait`, then
staples the notarization ticket so Gatekeeper can verify offline.

### Verify

```bash
spctl --assess --verbose=4 \
  "src-tauri/target/release/bundle/macos/TableTop Forge.app"
# Expected: "accepted source=Notarized Developer ID"
```

---

## Path 2 — Mac App Store

Higher bar. The App Sandbox + entitlements file
(`Entitlements.AppStore.plist` next to this README) covers the
runtime side; what's left is the cert + provisioning profile + a
review pass.

### Cert + provisioning profile (one-time, ~30 minutes)

1. **Mac App Store + Developer ID needs DIFFERENT certs from
   regular Apple Distribution.** From <https://developer.apple.com/account>
   → Certificates, ID & Profiles:
   * Create an **"Apple Distribution"** certificate (or a legacy
     "Mac App Distribution" + "Mac Installer Distribution" pair —
     newer accounts use the unified "Apple Distribution").
2. **Register the app's bundle id** if it's not there yet:
   `studio.giantmushroom.tabletopforge`. App Services: enable
   nothing (we don't use iCloud / Push / etc.).
3. **Create a Mac App Store provisioning profile** for the bundle
   id, signed by the Apple Distribution cert.
4. **Download the profile** + place at `src-tauri/macos/embedded.provisionprofile`.
   Tauri's bundler uses it automatically when present.

### Build for App Store

Point `.signing-env`'s `APPLE_SIGNING_IDENTITY` at the **Apple
Distribution** cert (not Developer ID):

```
APPLE_SIGNING_IDENTITY=Apple Distribution: Jake Watts (J4UJD4Z33J)
```

Then run the wrapper with the `appstore` target (add
`--apple-intelligence` to include the on-device AI sidecar):

```bash
./scripts/build-signed.sh appstore --apple-intelligence
```

The wrapper does everything the App Store path needs:

1. Flips `tauri.conf.json` to `Entitlements.AppStore.plist` (sandbox on).
2. Builds + signs the bundle with the Apple Distribution cert.
3. **Re-signs each nested helper** (`node`, `apple-intelligence-server`)
   with `Entitlements.AppStore.Helper.plist`, then re-seals the `.app`.
   This step is essential — see the JIT note below.
4. Wraps the `.app` in an installer `.pkg` signed with the **3rd Party
   Mac Developer Installer** cert → `target/release/bundle/TableTop Forge.pkg`.

#### The JIT entitlement gotcha (why step 3 exists)

The bundled Node aborts at `V8::Initialize()` (a `brk 1` trap in
`pthread_jit_write_protect_np` → `ThreadIsolation::Initialize`) the
moment it runs under the App Sandbox — UNLESS `com.apple.security.cs.allow-jit`
is set **on the node binary itself**. `com.apple.security.inherit` does
*not* propagate hardened-runtime (`cs.*`) entitlements to spawned
children, so declaring allow-jit only on the main app is not enough.

Verified on macOS 26: `allow-jit` alone is sufficient for both V8 and
PGlite's WebAssembly. We do **not** use
`com.apple.security.cs.allow-unsigned-executable-memory` or
`com.apple.security.cs.disable-library-validation` — both are Mac App
Store rejection triggers and neither is needed (all helpers are signed
with the same team ID, so library validation passes).

#### Build number

App Store Connect rejects an upload whose `CFBundleVersion` isn't higher
than the last accepted build. Tauri derives it from `version` in
`tauri.conf.json` — bump that (or the build component) before each
resubmission.

### Upload + review

* Upload via **Transporter.app** (free from the Mac App Store) or
  `xcrun altool --upload-app -f <pkg>`.
* Listing copy lives in `android/play-store/listing.md` — you can
  reuse the long description with minor tweaks (drop Android-specific
  bits about sideload, add Mac-specific bits about Apple Account
  install). Re-use the privacy-policy URL + content rating.
* **First review** typically asks: *"Why does this app act as a
  server?"* Answer: TableTop Forge is a self-hosted virtual tabletop
  — the user runs it on their own Mac, then their own iPad / phone /
  laptop / spectator TV connect to it on their LAN. Not an unsupervised
  background service. Use the same wording in the App Review Notes.

---

## What to back up

Same rule as the Android keystore: lose the cert + private key, lose
the ability to sign. Both certs (Developer ID Application + Apple
Distribution) live in your **login keychain** — back up by exporting
to a `.p12` and stashing copies in iCloud + Nextcloud the same way
you did for the Android keystore.

```bash
# In Keychain Access.app: right-click each cert → Export → .p12
# Save under a strong password, then copy:
cp ~/Desktop/AppleDevID.p12 ~/Library/Mobile\ Documents/com~apple~CloudDocs/TableTop\ Forge\ Apple\ Signing/
cp ~/Desktop/AppleDevID.p12 ~/Nextcloud/TableTop\ Forge\ Apple\ Signing/
```

Apple lets you generate new certs from your account if you lose them
(within reason — abuse the recovery flow and they'll throttle), but
having the .p12 backed up means you skip the regenerate-and-update-
references dance entirely.
