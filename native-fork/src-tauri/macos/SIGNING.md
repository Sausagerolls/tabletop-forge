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

```bash
# Same identity env var, but pointing at the Apple Distribution cert
# this time, NOT Developer ID:
export APPLE_SIGNING_IDENTITY="Apple Distribution: Jake Watts (ABCDE12345)"

# Optional: tell Tauri to use the App Store entitlements file instead
# of the Developer ID one. Set MACOSX_DEPLOYMENT_TARGET to match the
# minimum macOS version your codebase actually compiles for.
export MACOSX_DEPLOYMENT_TARGET=12.0

# Edit tauri.conf.json before running — flip the entitlement path
# to Entitlements.AppStore.plist:
#
#   "entitlements": "macos/Entitlements.AppStore.plist"
#
# Then build:
npm run tauri:build -- --target aarch64-apple-darwin

# The .pkg installer Tauri produces alongside the .app is what
# Transporter / xcrun altool uploads to App Store Connect.
```

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
