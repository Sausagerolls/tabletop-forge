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
TableTop Forge is the player companion for self-hosted tabletop RPG sessions. Open it on your phone, tap your character, and you've got the whole sheet — stats, spells, dice, inventory, conditions — in your hand instead of crammed onto the GM's laptop screen.

Built for 5e tabletop RPGs (5e SRD compatible). No accounts, no subscriptions, no data leaving your network. Free, forever, open source.

⚙ HOW IT WORKS

The app is a window into a TableTop Forge server. The GM (or you, if you're hosting) runs the server — a free open-source bundle from forge.giantmushroom.studio. Install it with Docker on Windows, macOS, or Linux, or grab the single double-clickable .app on macOS. Type the server's address into the app's login screen and you're in.

Everything that happens in the campaign — character sheets, dice rolls, GM whispers, plugin data, AI-generated tokens — lives on that server. Nothing routes through us. Nothing is sold. No third-party SDKs, no telemetry, no ads.

📋 ONE TAB PER THING YOU NEED

• Stats — HP, hit dice, AC, abilities, saves, every non-zero movement speed, equipped weapons with computed attack bonuses, active conditions, GM whispers, death saves when you're down.

• Skills — every skill in alphabetical order with proficiency, expertise, and Reliable Talent markers.

• Spells — slot tracker (tap to spend, tap again to restore), per-spell quick-cast, full description sheet, prepared / always-prepared markers, Bardic Inspiration die spending.

• Inventory — items, currency in copper / silver / gold / platinum, equipped state that auto-updates your AC and attack rolls, light-source toggles for torches and lanterns.

• Dice & Settings — d4 / d6 / d8 / d10 / d12 / d20 / d100 with modifiers, recent-roll log, theme picker, and the exact .local URL the GM should hand to other players.

🔄 SESSION SWITCHER

Every session you've joined gets remembered. Open the app on a new game night and it auto-rejoins the last campaign you were in; tap "Switch Session" in Settings to jump between two ongoing campaigns without retyping anything. The character you played last time, the server URL, the session code — all there, one tap to rejoin.

📡 LAN, INTERNET, OR ANYWHERE IN BETWEEN

The app talks only to the server URL you give it. Typical setups:

• Wi-Fi at the table — connect via the .local hostname the GM's panel prints automatically. No IP-typing.
• Internet over HTTPS — for remote players, point the app at the tunnel the GM has set up (Cloudflare, Tailscale, ngrok, your own reverse proxy).
• Air-gapped game night — the server runs on the GM's laptop and never needs internet at all.

The app follows Play Store cleartext rules: plain HTTP is permitted only to known-private destinations (.local hostnames, loopback, the Android emulator's host loopback). Public-internet servers must use HTTPS.

🔒 PERMISSIONS WE ASK FOR

• Internet — to reach the GM's server.
• Notifications — for GM whispers and "your turn" alerts when the app is in the background.

We don't ask for storage, contacts, location, microphone, camera, or anything else the app doesn't actively use.

📱 SUPPORTED DEVICES

• Phones and tablets running Android 8.0 (API 26) or newer.
• A companion app for iPhone, iPad, and Mac is on the App Store.
• Any modern browser also works — the web client ships with every TableTop Forge server.

🐛 SOURCE & ISSUES

Open source on GitHub at github.com/Sausagerolls/tabletop-forge. Bug reports and feature requests welcome — that's how every release of this app has been built so far.

NOT AFFILIATED

TableTop Forge is an independent fan project from Giant Mushroom Studio. It is not affiliated with, endorsed by, or sponsored by Wizards of the Coast or Hasbro. The 5e SRD content the app references is licensed under Creative Commons Attribution 4.0 (CC-BY 4.0); everything else — the UI, the code, the plugin system, the server — is the work of one independent developer in Britain.
```

(approx. 3050 / 4000)

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
