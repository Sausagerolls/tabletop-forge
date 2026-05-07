# App Store listing copy — TableTop Forge (companion app)

Paste these blocks straight into App Store Connect → 1.9.17 →
**Edit Localization** → English (U.K.). Field-by-field, top to
bottom of the form.

Pre-checked against:
- **Length limits**: name ≤ 30, subtitle ≤ 30, promo ≤ 170,
  description ≤ 4000, keywords ≤ 100 (combined, comma-separated).
- **Trademark caution**: no "Dungeons & Dragons" or "D&D" verbatim
  — references the 5e SRD (CC-BY 4.0) and "5e tabletop RPGs"
  instead. Includes an explicit not-affiliated disclaimer in the
  description so first review can't object.
- **Apple review patterns**: declares the app's server-dependency
  upfront in the description so reviewers don't reject it as
  "broken — won't sign in", and the App Review Notes block at the
  bottom answers the local-network-access question that comes up
  for every LAN companion app.

---

## App Name *(public, on the listing)*

```
TableTop Forge
```

(14 / 30)

## Subtitle *(below the name on the listing)*

```
Player companion for self-hosted 5e RPGs
```

(40 / 30) — too long, use the 30-char trim:

```
5e tabletop RPG companion app
```

(28 / 30) ✓

## Promotional Text *(updateable without re-review, ≤ 170)*

```
Live character sheets, dice, spells, and inventory for 5e tabletop RPGs. Connects to your own self-hosted TableTop Forge server — no accounts, no subscriptions.
```

(165 / 170) ✓

## Keywords *(comma-separated, no spaces, ≤ 100 total)*

```
ttrpg,tabletop,rpg,5e,srd,dice,character,sheet,dnd,dungeon,master,gm,vtt,companion,roleplay
```

(99 / 100) ✓ — using "dnd" as a search term (lowercase, no
ampersand) is allowed; the *trademarked phrase* "Dungeons & Dragons"
verbatim in user-facing text is what triggers the issue. Keywords
are discovery hints, not display copy.

## Description *(≤ 4000 chars)*

```
TableTop Forge is the player companion for self-hosted virtual tabletop sessions, built around the 5e SRD ruleset (CC-BY 4.0). Connect from your iPhone, iPad, or Mac to the GM's TableTop Forge server, then run your character sheet, manage spells and inventory, roll dice, and stay in sync with the table — without crowding the GM's laptop or hogging the projector.

REQUIRES A TABLETOP FORGE SERVER

This app is a companion to a TableTop Forge server. The server is a free, open-source, self-hosted bundle the GM (or a friend) runs on a laptop, desktop, or home server. Download it from forge.giantmushroom.studio — there's a Docker-based release that runs on Windows, macOS, and Linux, and a self-contained macOS .dmg that ships everything inside one app. The server holds the campaign — characters, maps, plugins, history. This app is the player's window into it.

WHAT YOU GET PER TAB

• Stats — HP, hit dice, AC, abilities, saves, every non-zero movement speed, equipped weapons with computed attack bonuses, conditions, GM whispers.
• Skills — full skill bonus table with proficiency and expertise marked.
• Spells — slot tracker (tap to spend / restore), per-spell quick-cast, full description in a sheet.
• Inventory — items, currency (cp / sp / gp), light-source toggles, equip / unequip with stat updates.
• Dice & Settings — d4 / d6 / d8 / d10 / d12 / d20 / d100 with modifiers, roll log, theme picker, server connection details.

ONE BINARY, EVERY APPLE DEVICE

The same app installs on iPhone, iPad, and Mac (Mac Catalyst). Install once, sign in to any device on your Apple ID, your character travels with you. The Mac build is a real desktop app — full window controls, keyboard shortcuts, no awkward "phone in a window" feel.

WHY SELF-HOSTED

Your characters, dice rolls, plugin data, AI-generated tokens, and chat all live on the server you (or your GM) run. Nothing is sent to us. Nothing is sold. There is no account, no subscription, no telemetry, and no third-party SDK in the app.

LAN, MDNS, OR INTERNET

The app talks only to the server URL you type in. Typical setups:
  • Pure LAN — everyone on the same Wi-Fi, GM's IP address.
  • mDNS — `tabletopforge.local` from any device on the LAN. The app surfaces the right URL automatically in Settings.
  • Tunnel — Cloudflare, Tailscale, or ngrok if you want remote players.

iOS uses the local-network permission to find the GM's server on your home Wi-Fi. The first time you open the app, iOS asks "Allow TableTop Forge to find devices on your local network?" — that's required for the app to reach a server on the same Wi-Fi. The app never sends anything off your network.

PERMISSIONS WE ASK FOR

• Local network — to find the GM's server on Wi-Fi.
• Notifications — for GM whispers and "your turn" alerts when the app is in the background.

NO PERMISSIONS WE DON'T NEED

We don't ask for camera, microphone, contacts, location, photo library, or any other capability the app doesn't actively use.

SUPPORTED DEVICES

• iPhone running iOS 17 or newer.
• iPad running iPadOS 17 or newer.
• Mac running macOS 14 (Sonoma) or newer (Mac Catalyst).

SOURCE & ISSUES

Open source on GitHub at github.com/Sausagerolls/tabletop-forge. Bug reports and feature requests welcome.

NOT AFFILIATED

TableTop Forge is an independent fan project. It is not affiliated with, endorsed by, or sponsored by Wizards of the Coast or Hasbro. The 5e SRD content the app references is licensed under Creative Commons Attribution 4.0 (CC-BY 4.0); everything else (UI, code, plugin system, server) is the work of Giant Mushroom Studio.
```

(approx. 2900 / 4000)

## Support URL

```
https://forge.giantmushroom.studio/
```

## Marketing URL *(optional)*

```
https://forge.giantmushroom.studio/
```

## Privacy Policy URL *(required)*

```
https://forge.giantmushroom.studio/privacy.html
```

## Category

- **Primary**: Entertainment
- **Secondary**: Utilities

## Age Rating

Pick **9+**. Answer the IARC questionnaire as:
- **Cartoon or Fantasy Violence**: Infrequent / Mild
  *(combat tracking — HP up and down, tagging tokens with conditions)*
- **All other categories**: None

---

## App Review Notes

This is the field reviewers READ when assessing the app. Paste
this in App Store Connect → Version → App Review Information →
Notes:

```
TableTop Forge is a self-hosted virtual tabletop. The user voluntarily runs a TableTop Forge server on their own machine (laptop, desktop, home server) — that server is a separate free download from forge.giantmushroom.studio. This iOS / iPadOS / Mac Catalyst app is the player's companion: it connects to that server URL the user types into the login screen and runs the character sheet UI.

The app uses the local-network permission to find the GM's server on the same Wi-Fi (typical setup at a tabletop game). It can also reach a server over the public internet via HTTPS if the GM has set up a tunnel. No data is sent anywhere except to the server URL the user has provided.

To test: please install + run a TableTop Forge server on a Mac on the same Wi-Fi network, then enter that server's URL into the app's login screen. The server is a free Docker stack or a single-binary .dmg available at forge.giantmushroom.studio. Alternatively, we can provide reviewer credentials to a hosted demo server — please reach out via the support email and we'll spin one up for the duration of the review.
```

(stays well under the 4000-char field limit)

## Demo account *(only fill in if Apple asks)*

Skip this. The app's "demo account" is the same setup any user
goes through — type a server URL + a session code. If the
reviewer asks, hand them a hosted-demo URL via email rather than
trying to fit credentials into the form fields.

---

## What to do AFTER the listing is approved

- [ ] Update `website/index.html` Player Companion Apps row:
      Replace the `App Store (iOS / macOS) — Coming Soon` pill with
      a real link. The URL is at App Store Connect → Distribution →
      "View on App Store" — looks like
      `https://apps.apple.com/gb/app/tabletop-forge/id<numeric-id>`.
- [ ] Update `website/privacy.html` to reference the live App Store
      listing in section 3.
- [ ] Tell players. Each one already has the
      Settings → "Reachable as" tappable URL that lands in v1.9.17,
      so the GM-to-player URL handoff is one tap from each end.
