# Mac App Store listing — TableTop Forge (macOS server app)

Paste into App Store Connect → your app → App Information / Version.
This app is the **self-hosted VTT itself** (the GM runs the whole tabletop
on their Mac; players connect from a browser, phone, iPad, or the companion
app). It is a different product from "TableTop Forge Companion" (the player
client already on the store).

Checked against Apple's limits: Name ≤30, Subtitle ≤30, Promotional Text ≤170,
Keywords ≤100, Description ≤4000. Trademark-safe: no "Dungeons & Dragons" /
"D&D" verbatim — uses "5e tabletop RPGs" + the 5e SRD (CC-BY 4.0), with a
not-affiliated disclaimer.

---

## App Name
```
TableTop Forge
```
(14 / 30)

## Subtitle
```
Self-hosted tabletop for 5e
```
(27 / 30)

Alternatives:
- `Run your 5e table on your Mac` (29)
- `Self-hosted VTT for 5e RPGs` (27)

## Promotional Text  (editable later without review)
```
Run your entire 5e tabletop from your Mac — maps, dynamic lighting, fog of war, dice and spells. No accounts, no subscriptions, nothing leaves your network.
```
(155 / 170)

## Keywords
```
vtt,tabletop,rpg,5e,srd,gamemaster,dice,character,maps,fog,lighting,initiative,ttrpg,grid,spells
```
(96 / 100)

## Description
```
TableTop Forge turns your Mac into the whole table. It's a self-hosted virtual tabletop for 5e tabletop RPGs — maps, dynamic lighting, tokens, dice, spells and character sheets — running entirely on your own machine. Your players connect from any web browser, phone or tablet on the same Wi-Fi; nothing routes through a cloud, nothing is sold, and there are no accounts or subscriptions. Free and open source.

JUST OPEN IT
No Docker, no terminal, no database to install. The app bundles its own Postgres-compatible database and web server inside one signed Mac app. Launch it and it's ready — it even prints the address your players type into their devices.

EVERYTHING THE GM NEEDS
• Battle maps — upload your own art or import Dungeondraft .dd2vtt files (walls, doors and lights come across automatically).
• Dynamic lighting & fog of war — line-of-sight walls, openable doors, torch and lantern light sources, per-player reveal.
• Tokens & combat — drag tokens on a snapping grid, track initiative, HP, conditions and death saves, run encounters turn by turn.
• Libraries — a built-in 5e SRD spell and creature catalogue, plus your own custom creatures, items and treasure.
• Dice & whispers — roll d4–d100 with modifiers; send private GM whispers to a single player.

PLAYERS JUST CONNECT
Anyone at the table opens the printed link in a browser — or uses the free TableTop Forge Companion app on iPhone, iPad and Mac — and gets a live character sheet: stats, skills, spell slots, inventory and dice in their own hands.

ON-DEVICE AI (OPTIONAL)
Generate full 5e stat blocks with Apple Intelligence — on-device, no API key, no model download, and nothing leaves your Mac. Prefer your own setup? Point it at a local or hosted model (LM Studio, Ollama, or any OpenAI-compatible endpoint) instead. Optional creature-portrait generation works through an image service you provide. AI is entirely optional — the app is fully usable with it switched off.

BUNDLED EXTENSIONS
A library of optional plugins ships built in — elemental spell templates, weather effects, 3D dice, an encounter builder, a theme customiser and more. They're disabled by default; turn on only what you want.

PRIVATE BY DESIGN
TableTop Forge has no user accounts and collects no analytics. Game data lives in a database on your Mac. The app reaches the internet only for things you opt into: a one-time download of the open 5e SRD reference data on first launch, and any AI provider you choose to configure. On-device Apple Intelligence stays on the device.

WORKS ANYWHERE
At the table over Wi-Fi, across the internet via your own tunnel, or completely offline on a laptop with no connection at all.

NOT AFFILIATED
TableTop Forge is an independent project from Giant Mushroom Studio. It is not affiliated with, endorsed by, or sponsored by Wizards of the Coast or Hasbro. The 5e SRD content it references is licensed under Creative Commons Attribution 4.0 (CC-BY 4.0).
```
(approx. 3,150 / 4,000)

## What's New (version 1.9.21)
```
First App Store release of the full TableTop Forge tabletop for Mac.

• Run the whole self-hosted VTT from one signed Mac app — no Docker, no setup.
• Generate 5e stat blocks on-device with Apple Intelligence — no API key, nothing leaves your Mac.
• A library of optional plugins now ships built in; enable the ones you want.
• Maps with dynamic lighting and fog of war, Dungeondraft import, combat tracking, SRD spell + creature libraries, dice and GM whispers.
```

---

## App Review information (notes to reviewer)
```
WHAT THIS APP IS
TableTop Forge is a self-hosted virtual tabletop for 5e tabletop RPGs. The user (a game master) runs it on their own Mac; their own players then connect from a web browser or our companion app on the SAME local network. It is not an unsupervised background service and does not connect to any service we operate.

WHY IT LISTENS ON A LOCAL PORT
The app runs a small local web server so the GM's own players (on their phones/tablets/laptops on the same Wi-Fi) can open their character sheets. This is the core purpose of the app. It binds to the local network only.

NO ACCOUNT NEEDED
There is no login to App Review. Launch the app, click "New Session" (the default GM password is shown in-app), and the full tabletop is usable immediately. SRD reference data downloads once on first launch from api.open5e.com (open game content); if offline, the app still runs.

APPLE INTELLIGENCE FEATURE
The optional "Apple Intelligence (on-device)" AI provider requires an Apple-silicon Mac with Apple Intelligence enabled (Settings → Apple Intelligence & Siri). On other Macs the option simply doesn't appear and every other feature works normally.

PRIVACY
No accounts, no analytics, no third-party SDKs. All game data is stored locally on the user's Mac.
```

## App Store Connect metadata
- **Category:** Primary = Entertainment. Secondary = Games (optional).
- **Price:** Free.
- **Age rating:** answer "Infrequent/Mild Cartoon or Fantasy Violence" (combat tracking); everything else No → expect 9+.
- **Support URL:** https://forge.giantmushroom.studio
- **Marketing URL:** https://forge.giantmushroom.studio
- **Privacy Policy URL:** https://forge.giantmushroom.studio/privacy.html
- **Copyright:** © 2026 Giant Mushroom Studio

## App Privacy ("nutrition label")
- **Data collected:** None.
- **Data linked to user:** None.
- **Tracking:** No.
- Note in the privacy policy: optional first-launch fetch of open 5e SRD data from api.open5e.com (no personal data), and optional AI calls to a provider the user configures (their own keys/endpoint). On-device Apple Intelligence sends nothing off-device.

## Export compliance
- Uses only standard HTTPS / exempt encryption → answer "uses exempt encryption".
  (Consider adding `ITSAppUsesNonExemptEncryption=false` to skip the prompt on future uploads.)
