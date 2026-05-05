# Android OTA hosting

Drop the signed `site` APK and an `updates.json` into this folder
each release. The Android client (site flavor only) polls
`updates.json` on every cold launch and prompts the user to
download + sideload the new APK.

## Manifest format

`updates.json` must match `UpdateChecker.UpdateManifest`:

```json
{
  "version_code": 3,
  "version_name": "1.9.6",
  "url": "https://forge.giantmushroom.studio/android/TableTopForge-1.9.6.apk",
  "sha256": "<sha256 of the apk>",
  "release_notes": "...",
  "released_at": "2026-05-05",
  "min_supported_version_code": 1
}
```

`version_code` MUST monotonically increase. The client compares it
against `BuildConfig.VERSION_CODE` and only prompts when strictly
greater. `sha256` is verified after download — a mismatch aborts
the install.

## Release recipe

```bash
# 1. Bump versionCode + versionName in android/app/build.gradle.kts
# 2. Build a SIGNED site release APK (your release keystore)
cd android
./gradlew :app:assembleSiteRelease
# 3. Sign + zipalign as usual, then:
APK=app/build/outputs/apk/site/release/app-site-release.apk
SHA=$(shasum -a 256 "$APK" | cut -d' ' -f1)
cp "$APK" ../website/android/TableTopForge-<VERSION>.apk
# 4. Write updates.json (substituting VERSION + SHA above)
# 5. Deploy the website as usual.
```

The Play Store build has its own pipeline — `assemblePlayRelease`
+ App Bundle upload. Don't ship the play APK to the site, and
don't upload the site APK to Play (the install permission would
cause Play to reject it).
