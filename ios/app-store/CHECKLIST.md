# TableTop Forge — iOS / iPadOS / Mac Catalyst submission checklist

Bundle ID: `com.jakewatts.tabletopforge`  ·  Team ID: `J4UJD4Z33J`
App Store record name: `TableTop Forge`

This is the single-app companion. The standalone Tauri server
(`studio.giantmushroom.tabletopforge`) is a separate submission
covered in `APPLE-SUBMISSION.md` at the repo root — leave it for
later, this checklist is just the iOS / iPadOS / Mac Catalyst
companion.

Tick each box as you go.

---

## Phase A — Apple-side setup (~15 min, all in browser)

- [ ] **Apple Distribution certificate**
  - Xcode → Settings (⌘,) → Accounts.
  - Pick the Apple ID associated with team `J4UJD4Z33J`.
  - Click **Manage Certificates…** at the bottom.
  - `+` → **Apple Distribution**. Xcode generates the cert + private
    key in the login keychain.
  - Result check: `security find-identity -p codesigning -v` shows
    a row matching `Apple Distribution: Jake Watts (J4UJD4Z33J)`.

- [ ] **Apple Development certificate** *(only if you don't already
      have one for this team — older free-team cert doesn't count)*
  - Same Manage Certificates dialog.
  - `+` → **Apple Development**. One per Mac, fine to skip if it
    already exists for `J4UJD4Z33J`.

- [ ] **Bundle ID registration**
  - <https://developer.apple.com/account/resources/identifiers> → `+`.
  - Pick **App IDs** → Continue → **App** → Continue.
  - Description: `TableTop Forge Companion`.
  - Bundle ID: **Explicit** → `com.jakewatts.tabletopforge`.
  - Capabilities: leave everything off (we don't use Push, iCloud,
    HealthKit, etc.).
  - Continue → Register.

- [ ] **App Store Connect record**
  - <https://appstoreconnect.apple.com/apps> → `+` → New App.
  - Platforms: tick **iOS** AND **macOS** (the Mac Catalyst build
    rides on the iOS record — single submission, three platforms).
  - Name: `TableTop Forge`.
  - Primary Language: `English (U.K.)`.
  - Bundle ID: pick `com.jakewatts.tabletopforge` from the dropdown
    (it appears once you finished the previous step).
  - SKU: `tabletopforge-companion`.
  - User Access: Full Access.
  - Create.

- [ ] **App-specific password** *(only needed if you ever upload via
      `xcrun altool` / `notarytool` from the command line — Xcode
      Organizer auth doesn't need it. Skip unless you script it.)*

---

## Phase B — Listing assets (~1–2 hours)

The slow bit. Most of this is design work that only you can do —
copy is in `listing.md` next to this file.

### B1. Screenshots (required, per device class)

Apple needs at least one set; the more device classes covered, the
more devices the listing surfaces on. Each set is "3 to 10
screenshots". You can re-use the same content across iPhone sizes
— Apple just needs the resolution to match.

- [ ] **iPhone 6.9"** (iPhone 16 Pro Max) — `1290 × 2796 px` portrait
- [ ] **iPhone 6.5"** (older Plus / Pro Max) — `1242 × 2688 px`
      portrait *(optional but recommended for older-device coverage)*
- [ ] **iPad 13"** (iPad Pro M4) — `2064 × 2752 px` portrait
- [ ] **Mac** (Catalyst window) — `1280 × 800` or `2880 × 1800` —
      either resolution works, App Store auto-scales.

How to capture:
- Build TableTop Forge to the simulator at each device size.
- Walk through Stats / Skills / Spells / Inventory / Dice tabs.
- Screenshot with **⌘ + S** in the simulator (saves to Desktop).
- For Mac: build with the Mac Catalyst destination and screenshot
  the running window with **⌘ + ⇧ + 4 + Space**.

### B2. App icon

- [ ] **1024 × 1024 PNG** with no alpha — already exists at
      `ios/TableTopForge/Assets.xcassets/AppIcon.appiconset/icon-1024.png`.
      Apple Connect pulls it automatically from the build, no
      manual upload needed.

### B3. Listing copy

- [ ] Open `ios/app-store/listing.md` (in this folder).
- [ ] Paste each block into the matching App Store Connect field:
      App Name → Subtitle → Promotional Text → Description → Keywords →
      Support URL → Marketing URL.
- [ ] Privacy Policy URL: `https://forge.giantmushroom.studio/privacy.html`
- [ ] Support URL: `https://forge.giantmushroom.studio/`
- [ ] Marketing URL (optional): `https://forge.giantmushroom.studio/`

### B4. Age rating + content

- [ ] App Store Connect → App Information → **Age Rating** → Edit.
- [ ] Answer the questionnaire honestly. For TableTop Forge:
      - Cartoon or Fantasy Violence: **Infrequent/Mild** (combat tracking)
      - All other categories: **None**
- [ ] Result: **9+** is the typical band.

### B5. Privacy nutrition label

- [ ] App Store Connect → App Privacy → **Edit**.
- [ ] Data collected: **No, we do not collect data from this app.**
- [ ] If asked about each category, mark "Not Collected" — matches
      what `privacy.html` already declares.

### B6. Pricing + availability

- [ ] App Store Connect → Pricing and Availability.
- [ ] Price: **Free**.
- [ ] Availability: **All countries** (or restrict if you want).

---

## Phase C — Bump version + regen project (~2 min)

The iOS project is still pinned at v1.9.2 — bump to match the
rest of the codebase before archiving.

- [ ] Edit `ios/project.yml`:
      - `MARKETING_VERSION` → `1.9.17`
      - `CURRENT_PROJECT_VERSION` → next integer (currently `2` →
        bump to `3`. Apple wants this strictly monotonically
        increasing across uploads; if `3` was already used, bump to
        `4`.)
      - The `CFBundleShortVersionString` and `CFBundleVersion`
        Info.plist keys mirror the same numbers — same edit.
- [ ] Regenerate the Xcode project so the bumped values land:
      ```bash
      cd ios && xcodegen generate
      ```
- [ ] Open `ios/TableTopForge.xcodeproj` in Xcode and confirm the
      "General" tab shows `1.9.17` for both Version + Build.

*(Or just say "bump it" to me and I'll do this step.)*

---

## Phase D — Archive + upload (~15 min)

- [ ] In Xcode, top-bar destination dropdown → **Any iOS Device
      (arm64)**. *(Not a simulator — App Store builds need a real
      device target.)*
- [ ] **Product → Archive**. Build runs, ~3 min on Apple Silicon.
- [ ] **Window → Organizer** opens automatically when done.
- [ ] Pick the new archive in the Archives tab → click
      **Distribute App** on the right.
- [ ] Choose **App Store Connect** → Next.
- [ ] Choose **Upload** (not Export — we want it on Apple's servers,
      not as a local .ipa) → Next.
- [ ] Distribution options: leave defaults (Include bitcode if asked
      = irrelevant on iOS 17+, Strip Swift symbols = on, Manage
      Version & Build Number = off). → Next.
- [ ] Re-sign: **Automatically manage signing** → Next.
- [ ] Review the summary → Upload.
- [ ] Watch the upload progress. Pre-flight validation runs in the
      background; if anything is wrong (missing icon, bad
      entitlement, version conflict) it tells you here, BEFORE
      Apple reviews.

After upload completes: App Store Connect → TestFlight tab. The
build appears as "Processing" for ~10–30 min, then becomes
available.

---

## Phase E — TestFlight (1–3 days)

- [ ] App Store Connect → Your app → **TestFlight** tab.
- [ ] Pick the processed build → **Test Information**:
      - Beta App Description: short, ~3 sentences.
      - Email: your email.
      - Privacy Policy: `https://forge.giantmushroom.studio/privacy.html`
- [ ] **Internal Testing** group → Add yourself + up to 99 internal
      testers.
- [ ] On your phone / iPad / Mac: install **TestFlight** (free
      from the App Store) → accept the invite email → install the
      build.
- [ ] Run through the GM connect → join session → roll dice → swap
      character → switch session loop end-to-end. Catch real-device-
      only issues (mDNS resolution, push notifications, network
      permission prompt copy).
- [ ] Optional: open External Testing → invite a few non-internal
      friends. External Testing requires a brief Apple review
      (~24 hours), but no full App Store review.

---

## Phase F — Submit for review (Apple takes 1–7 days)

- [ ] App Store Connect → Your app → **App Store** tab.
- [ ] Make sure the version (`1.9.17`) shows "Prepare for Submission".
- [ ] Build → pick the TestFlight build you've been testing.
- [ ] App Review Information:
      - Sign-In: **Sign-in not required**.
      - Notes: paste the App Review Notes from the bottom of
        `listing.md` (it answers the "why local-network access?"
        / "why server behaviour?" questions Apple's reviewers
        commonly ask for self-hosted apps).
      - Contact Info: your name + email + phone.
- [ ] Version Release: pick **Manually release this version** if
      you want to control the go-live timing, or **Automatically
      release** to push it live the moment Apple approves.
- [ ] Click **Add for Review** → confirm.

Apple's response timeline (typical): 1–3 days for the first review,
sometimes longer. They'll either:
- **Approve** → app goes live (or sits as Pending Developer Release
  if you picked manual).
- **Reject** → reasons listed in the resolution center. Fix, upload
  a new build, resubmit. The `App Review Information` notes carry
  through; you don't have to redo Phase B copy unless something
  about the listing was the issue.

---

## Phase G — When it's live

- [ ] Update `forge.giantmushroom.studio` landing page:
      - Swap the `App Store (iOS / macOS) — Coming Soon` pill for a
        real `<a href="https://apps.apple.com/...">` link. The URL
        appears in App Store Connect → Distribution → App Store
        Connect Information → "View on App Store".
- [ ] Update `website/privacy.html` to mention the live App Store
      listing in section 3 if it doesn't already.
- [ ] Tell players. The Settings → "Reachable as" tappable row
      that lands in v1.9.17 surfaces the `.local` URL automatically,
      so the GM-to-player handoff is one tap from each end.

---

## Files in this folder

- `CHECKLIST.md` — this file.
- `listing.md` — App Store listing copy, ready to paste into App
  Store Connect's text fields.
