# Play Store listing copy — TableTop Forge (Android)

Paste these straight into Play Console → Store presence → Main store
listing. Both descriptions are pre-checked against:

* **Length limits**: short ≤ 80 chars, long ≤ 4000 chars.
* **Trademark caution**: no "Dungeons & Dragons" or "D&D" verbatim;
  references the 5e SRD (CC-BY 4.0) and "5e tabletop RPGs" instead.
  Includes an explicit not-affiliated disclaimer in the long
  description so first review can't object on grounds of implied
  endorsement.
* **Listing-policy compliance**: declares that the app needs a
  separate self-hosted server to be useful (Play sometimes rejects
  apps that "fail to provide value without external setup" if the
  dependency isn't disclosed up-front).

---

## App title

```
TableTop Forge
```

(14 / 30)

## Short description

```
Live character sheets for 5e tabletop RPGs. Sheets, dice, spells, inventory.
```

(75 / 80)

## Full description

```
TableTop Forge is the player companion app for self-hosted virtual tabletop sessions, built for the 5e SRD ruleset (CC-BY 4.0). Connect from your phone or tablet to the GM's TableTop Forge server, then run your character sheet, manage spells and inventory, roll dice, and stay in sync with the table — without crowding the GM's laptop or tying up the projector.

REQUIRES A TABLETOP FORGE SERVER

This app needs a TableTop Forge server to connect to. The server is a free, open-source, self-hosted bundle that you (or your GM) run on a laptop, desktop, or home server. Download it from forge.giantmushroom.studio — there's a Docker-based release that runs on Windows, macOS, and Linux, and a self-contained macOS .dmg that ships everything inside one app. The server is what holds the campaign — characters, maps, plugins, history. The app is just the player's window into it.

WHAT YOU GET PER TAB

• Stats — HP, hit dice, AC, abilities, saves, every non-zero movement speed, equipped weapons with computed attack bonuses, conditions, GM whispers.
• Skills — full skill bonus table with proficiency / expertise marked.
• Spells — slot tracker (tap to spend / restore), per-spell quick-cast, full description in a sheet.
• Inventory — items, currency (cp / sp / gp), light-source toggles, equip / unequip with stat updates.
• Dice & Settings — d4 / d6 / d8 / d10 / d12 / d20 / d100 with modifiers, roll log, theme picker, server connection details.

WHY SELF-HOSTED

Your characters, dice rolls, plugin data, AI-generated tokens, and chat all live on the server you run. Nothing is sent to us. Nothing is sold. There is no account, no subscription, no telemetry, and no third-party SDK in the app.

LAN / INTERNET

The app talks only to the server URL you type in. Typical setups:
  • Pure LAN — everyone on the same Wi-Fi, GM's IP address.
  • mDNS — `forgeserver.local` from any device on the LAN.
  • Tunnel — Cloudflare, Tailscale, or ngrok if you want remote players.

The app uses your device's local-network access to reach the GM's server on Wi-Fi. Cleartext (HTTP) is permitted only for loopback, mDNS .local hostnames, and the Android emulator's host loopback. Reaching a server over the open internet requires HTTPS.

PERMISSIONS WE ASK FOR

• Internet — to talk to the GM's server.
• Notifications — for GM whispers and "your turn" alerts when the app is in the background.

NO PERMISSIONS WE DON'T NEED

We don't ask for storage, contacts, location, microphone, camera, or any other capability the app doesn't actively use.

SUPPORTED DEVICES

• Phones and tablets running Android 8.0 (API 26) or newer.
• Companion iOS / iPadOS / macOS app available separately.
• Web client at any browser — players who don't want to install anything use that.

SOURCE & ISSUES

Open source on GitHub at github.com/Sausagerolls/tabletop-forge. Bug reports and feature requests welcome.

NOT AFFILIATED

TableTop Forge is an independent fan project. It is not affiliated with, endorsed by, or sponsored by Wizards of the Coast or Hasbro. The 5e SRD content the app references is licensed under Creative Commons Attribution 4.0 (CC-BY 4.0); everything else (UI, code, plugin system, server) is the work of Giant Mushroom Studio.
```

(approx. 2700 / 4000)

---

## Category + tags

* **App category**: Entertainment
* **Tags**: TTRPG · Tabletop RPG · Game tool · Dice roller · Character sheet
* **Content rating** (IARC): expect PEGI 7 / ESRB E10+ — answer "Mild
  fantasy violence" on the questionnaire (combat tracking is the
  only relevant content). Everything else is "no".

## Data safety form answers

* **Data collected**: None (the app stores everything locally, talks only to the user-supplied server).
* **Data shared with third parties**: None.
* **Data encrypted in transit**: Yes — for any HTTPS endpoint. App also supports cleartext to LAN-private destinations (loopback / mDNS) where TLS isn't practical; this is documented in the privacy policy.
* **Users can request data deletion**: Yes — Logout clears every key the app stores. Server-side data deletion is the GM's responsibility.

## Target audience

* Primary: 13+

## Privacy policy URL

```
https://forge.giantmushroom.studio/privacy.html
```

## Contact email

```
jakewatts809@googlemail.com
```
