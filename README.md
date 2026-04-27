# TableTop Forge

**A self-hosted virtual tabletop for D&D 5e.**  
Per-player instanced fog of war, AI-powered token generation, PDF spell library import, full combat tracking, an extensible plugin system, and complete DM control — running entirely on your own machine.

---

## Table of Contents

- [Requirements](#requirements)
- [Quick Start](#quick-start)
- [Docker Setup](#docker-setup)
  - [Windows](#windows)
  - [macOS](#macos)
  - [Linux](#linux)
- [Configuration](#configuration)
- [AI Setup](#ai-setup)
  - [LM Studio](#lm-studio)
  - [Ollama](#ollama)
  - [OpenAI / Compatible API](#openai--compatible-api)
- [Spell Library — PDF Scanner](#spell-library--pdf-scanner)
- [Plugin System](#plugin-system)
- [Changelog](#changelog)

---

## Requirements

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows / macOS) or Docker Engine + Docker Compose (Linux)
- A modern browser (Chrome, Firefox, Edge, Safari)
- Optional: [LM Studio](https://lmstudio.ai/) or [Ollama](https://ollama.com/) for local AI stat-block generation
- Optional: [SwarmUI](https://github.com/mcmonkeyprojects/SwarmUI) for local AI image generation (auto-portraits when creatures are AI-generated)

---

## Quick Start

1. Download and extract `TabletopForge.zip`
2. Open a terminal in the extracted folder
3. Run:

```bash
docker compose up -d
```

4. Open your browser and go to `http://localhost`
5. Create a new session and share the session code with your players

---

## Docker Setup

### Windows

1. Download and install [Docker Desktop for Windows](https://docs.docker.com/desktop/install/windows-install/)
   - Requires Windows 10/11 with WSL 2 enabled
   - During install, enable the **WSL 2 backend** option
2. Start Docker Desktop and wait for it to show **"Engine running"** in the system tray
3. Open **PowerShell** or **Command Prompt** and navigate to the extracted folder:
   ```powershell
   cd C:\path\to\TabletopForge
   ```
4. Start the app:
   ```powershell
   docker compose up -d
   ```
5. Open `http://localhost` in your browser

**To stop:** `docker compose down`  
**To update:** `docker compose down && docker compose build --no-cache && docker compose up -d`

---

### macOS

1. Download and install [Docker Desktop for Mac](https://docs.docker.com/desktop/install/mac-install/)
   - Choose the correct version for your chip: **Apple Silicon (M1/M2/M3/M4)** or **Intel**
2. Open Docker Desktop from your Applications folder and wait for it to start
3. Open **Terminal** and navigate to the extracted folder:
   ```bash
   cd ~/Downloads/TabletopForge
   ```
4. Start the app:
   ```bash
   docker compose up -d
   ```
5. Open `http://localhost` in your browser

**To stop:** `docker compose down`  
**To update:** `docker compose down && docker compose build --no-cache && docker compose up -d`

---

### Linux

1. Install Docker Engine and the Compose plugin:
   ```bash
   # Ubuntu / Debian
   sudo apt update
   sudo apt install docker.io docker-compose-plugin -y
   sudo systemctl enable --now docker
   sudo usermod -aG docker $USER   # log out and back in after this
   ```
   For other distributions follow the [official Docker Engine install guide](https://docs.docker.com/engine/install/).

2. Navigate to the extracted folder:
   ```bash
   cd /path/to/TabletopForge
   ```
3. Start the app:
   ```bash
   docker compose up -d
   ```
4. Open `http://localhost` in your browser

**To stop:** `docker compose down`  
**To update:** `docker compose down && docker compose build --no-cache && docker compose up -d`

---

## Configuration

Create a `.env` file in the project root to override defaults:

```env
# Password required to log in as DM or create sessions
DM_MASTER_PASSWORD=your_secure_password

# Database password (internal only — players never see this)
DB_PASSWORD=your_db_password

# Port to expose the app on the host (default: 8080)
# If running behind a reverse proxy, point the proxy at this port.
PORT=8080
```

If no `.env` file is present the app starts with safe defaults (`DM_MASTER_PASSWORD=dungeonmaster`). **Change this before sharing with players.**

---

## Reverse Proxy Setup (Server Hosting)

If you are hosting behind a domain (e.g. with Caddy or nginx on the host), point your reverse proxy at the port in `.env` (`8080` by default). TableTop Forge runs plain HTTP inside Docker — SSL termination is handled by the proxy.

**Caddy example** (`/etc/caddy/Caddyfile`):
```
forgeserver.giantmushroom.studio {
    reverse_proxy localhost:8080
}
```

**nginx example** (`/etc/nginx/sites-available/tabletopforge`):
```nginx
server {
    listen 80;
    server_name forgeserver.giantmushroom.studio;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name forgeserver.giantmushroom.studio;

    # ssl_certificate / ssl_certificate_key set by certbot or your cert provider

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 86400;
    }
}
```

---

## AI Setup

TableTop Forge can generate fully-statted creature tokens using a local AI model or OpenAI. Configure AI in the **Session** tab of the DM view.

### LM Studio

[LM Studio](https://lmstudio.ai/) runs large language models locally with a built-in OpenAI-compatible server. Recommended model: **Gemma 3** (latest version).

1. Download and install LM Studio from [lmstudio.ai](https://lmstudio.ai/)
2. Inside LM Studio, go to the **Discover** tab and search for `gemma-3` — download any variant your hardware can run (e.g. `gemma-3-12b-it` for a good balance)
3. Load the model by clicking on it in your model list
4. Go to the **Local Server** tab (the `<->` icon) and click **Start Server**
   - The server runs on `http://localhost:1234` by default
5. In TableTop Forge DM view → **Session** tab → AI Settings:
   - **Provider:** OpenAI Compatible
   - **Base URL:** `http://localhost:1234`
   - **API Key:** leave blank
   - **Model:** leave blank (LM Studio uses whichever model is loaded)
6. Click **Test Connection** — you should see a success message
7. Go to the **Library** tab and click **✨ AI** to generate a creature

> **Note for network play:** if your players are on other machines, replace `localhost` with your machine's local IP address (e.g. `192.168.1.50`). The AI server must be reachable from the Docker container — use your LAN IP, not `localhost`.

---

### Ollama

[Ollama](https://ollama.com/) is a lightweight local model runner that works from the command line.

1. Install Ollama from [ollama.com](https://ollama.com/) and follow the instructions for your OS
2. Pull a model — Gemma 3 is recommended:
   ```bash
   ollama pull gemma3
   ```
3. Ollama runs automatically as a background service on `http://localhost:11434`
4. In TableTop Forge DM view → **Session** tab → AI Settings:
   - **Provider:** Ollama
   - **Base URL:** `http://host.docker.internal:11434`
     *(use `host.docker.internal` so Docker can reach your host machine — on Linux use your machine's LAN IP instead)*
   - **Model:** `gemma3` (or whichever model you pulled)
5. Click **Test Connection** — you should see a success message

---

### OpenAI / Compatible API

Any OpenAI-compatible API (OpenAI, Groq, Together, etc.) works.

1. In TableTop Forge DM view → **Session** tab → AI Settings:
   - **Provider:** OpenAI Compatible
   - **Base URL:** `https://api.openai.com` (or your provider's base URL)
   - **API Key:** your API key
   - **Model:** `gpt-4o` or your preferred model
2. Click **Test Connection**

---

## Spell Library — PDF Scanner

The DM panel's **Spells** tab can ingest a sourcebook PDF and turn it into a shared spell library that players can learn from.

How it works:

1. Configure a vision-capable AI (LM Studio / Ollama / GPT-4o) — see [AI Setup](#ai-setup). The PDF scanner needs a **vision model** and a **context window of at least 16k tokens** (32k+ recommended for whole-book scans).
2. Open **DM view → Spells tab → Scan PDF** and pick a `.pdf`.
3. The backend rasterises every page, runs deterministic regex header detection on the text layer, then asks the AI to fill body fields. Multi-pass consensus voting filters out hallucinated spells.
4. After a scan completes, a **Review names** panel surfaces any imported spells whose names don't match a canonical 5e list, with one-click replacements.
5. Missing or short descriptions are backfilled from the **open5e SRD** — toggle between the **2014** (5.1) and **2024** (5.2) rulesets in the panel header. Aliases for SRD-renamed spells (Bigby's Hand → Arcane Hand etc.) are applied automatically.
6. **Export / Import** buttons in the library let you ship a curated subset of spells between sessions as JSON.

⚠ AI scans aren't perfect. Review the imported spells before relying on them at the table.

---

## Plugin System

TableTop Forge has a filesystem-based plugin system. Plugins extend the app with new map effects, custom DM tabs, click-to-place tools, and shared state that auto-syncs between the DM and players.

**Quick facts:**

- Plugins live in `backend/plugins/<plugin-id>/` — each is a folder with a `plugin.json` manifest and a `client.js` ES module.
- The backend never executes plugin code; it only stores metadata, serves plugin assets, and provides a generic JSONB key/value store keyed by plugin id.
- Plugin code runs in the browser using the host's React + Konva instances passed in via `register({ React, ReactKonva, registries, context })`.
- Disabling a plugin keeps its data; deleting a plugin keeps its data; only an explicit table wipe removes it. Re-installing later restores everything.
- Plugins **cannot** modify core React components, the login screen, or anyone else's data. The login screen never loads plugins, so a misbehaving plugin can never break DM auth.

**Managing plugins:** open **DM view → Session tab → Plugins**. From there you can upload a plugin `.zip`, toggle enabled/disabled, see dependency status, and delete plugins.

**If a plugin breaks the app so badly that the in-app manager can't help**, stop the backend and delete `backend/plugins/<id>/` on the host filesystem. On next start the host reconciles its records with what's on disk. Stored data is not touched.

**Bundled plugin — Elemental Templates:** ships enabled by default. Adds an "Elemental Effect" select to the spell-template-edit popup with six options (fire / water / ice / lightning / void / acid-poison / none), each rendered as a custom animated overlay. Disablable from the Plugins UI.

**Writing your own plugins:** see the **[Plugin Authoring Guide](PLUGINS.md)** — covers the manifest, lifecycle, every extension point, the data API + event bus, common pitfalls, and a complete worked example.

---

## Changelog

### v1.4.1 — Mobile reconnect resilience, server-side AI settings, cone hit-test fix

**Mobile reconnect resilience:**
- Server: `pingInterval: 25 s`, `pingTimeout: 60 s` (up from the 20 s default). Tolerates the 30–45 s heartbeat gaps iOS WebKit and Brave-on-iOS introduce during cell-tower handover and lock-screen suspend, even on actively-used tabs.
- Client: dropped the explicit `transports: ['websocket','polling']` override. The default polling-first / WS-upgrade order probes reliably through transparent proxies and cellular networks where the upfront WS handshake can silently fail. Reconnection knobs added: forever, 500 ms → 5 s with 50% jitter.
- DMView + PlayerView no longer kick the user back to the connecting spinner on every brief socket drop. Once `session` is loaded, a small top banner ("Reconnecting (attempt N)…") shows during a drop and disappears the moment the socket reconnects.

**AI settings persistence:**
- AI config (LM Studio / Ollama / SwarmUI URLs, models, prompt templates) used to live in `localStorage` only, which is per-origin per-browser. New device, incognito tab, or aggressive iOS storage cleanup wiped it.
- New generic `app_settings` table (key TEXT pk, JSONB value) + `/api/settings/:key` routes (GET / PUT / DELETE). DMView writes-through to the server on every change and hydrates from there on mount; localStorage is kept as a first-paint cache and as the read source for plugins, so `context.getAiSettings()` still works unchanged.
- Settings now follow the DM across phones, browsers, and incognito sessions.

**Cone template hit-test bug fix:**
- `findNearestTemplate`'s cone branch returned hypot-from-apex, so a click 30 px from the cone's apex in any direction (including the half-plane behind the caster) registered as a hit on `tpl-edit` / `tpl-erase`. Replaced with a proper inside-the-wedge test plus perpendicular distance to the nearest cone edge for outside hits.

### v1.4.0 — Languages registry, Fog colour, six new plugins

**First-class languages:**
- New `languages` table seeded with the SRD set on startup (8 standard, 8 exotic, 2 rare). DMs can add custom entries via the picker; the SRD seed is protected from deletion.
- New `LanguagePicker` component replaces the freeform Languages text input on creatures — multi-select, grouped by category, fluency qualifier dropdown ("understands but cannot speak" etc).
- AI stat-block prompt now embeds the canonical language list at request time and tells the model to ONLY use those names; output is canonicalised to match casing before insert, so the picker recognises every value.
- Plugins can read `/api/languages`. The bundled `npc-chat` plugin uses this as its language source instead of hard-coding a list.

**Fog of War — configurable colour:**
- New `sessions.fow_color` column (default `#000000`). DM-only `set_fow_color` socket; live re-tints the player view as the picker drags.
- Picker added to **Session tab → Fog of War** (under the edge-feather slider) with hex text input and Reset.

**New bundled plugins (downloadable from the Plugin Store):**
- **Theme Customizer** — accent colour, panel + window backdrop (gradients: Forest, Ember, Nebula, Cinnabar dusk, Deep ocean, plus solid presets), UI font family. Live-syncs to every player in the session and reverts cleanly on disable.
- **NPC Chat** — one-way DM-to-player speech with per-language scrambling. Pulls the canonical language list from the host; per-token knowledge derived from each character's `creature.languages`, no separate KV needed. Players who don't understand see "Speaks in a tongue you do not know" so they can't deduce the language from the popup.
- **3D Dice** — three.js polyhedra (Tetrahedron / Cube / Octahedron / custom d10 trapezohedron / Dodecahedron / Icosahedron) tumbling across every player's screen. Faces are blank during the roll; once the dice settle, the rolled value fades in as a textured plane locked to the camera-facing face — rotated to match the die's own orientation. GLB models bundled for d6 / d20 / d100; drop other GLBs in the plugin folder to swap any procedural shape. Per-die colour overrides persist per session and sync to all players. Plugin hijacks the host's built-in dice roller so quick-rolls and character-sheet rolls also get the full 3D animation.
- **SRD 2024 Content Pack / SRD 2014 Content Pack** — pull the full WotC SRD set (creatures + magic items) from Open5e on enable. Creatures land in the host library tagged by edition; magic items live in the plugin tab with **Send to player** (uses the existing `send_treasure` socket) and **Treasure JSON** download (matches the format the Treasure tab's **Load** button accepts). Disabling the plugin deletes every creature it inserted by tracked ID — clean test of the disable/cleanup contract.
- **Content Exporter** — multi-select creatures and spells from your library, fill in a manifest, download a self-contained installable plugin .zip. The exported pack auto-imports its content on enable and removes it on disable using the same install/cleanup pattern the bundled SRD packs use. Zip is built in-browser with an inline STORE-method ZIP encoder — no external dependencies.

**Plugin API + docs:**
- New section in `PLUGINS.md` covering bulk import/export endpoints (`/api/creatures/{export,import}`, `/api/spell-library/{export,import}`) with the multipart `file` shape both routes accept.
- Documented that `unregister` receives only `{ registries }` (no `context`), with the module-scope `savedDataApi` capture pattern for plugins that need to flush KV state during cleanup.
- Documented "no `playerTabs` registry" — DOM-injection pattern for player-side UI, with the `react-dom/client` caveat.
- Documented the `/api/languages` endpoint and the canonical-vs-custom matching pattern.

### v1.3.0 — SwarmUI image generation, Random Encounter Builder, AI generator hardening

**AI image generation (optional, via [SwarmUI](https://github.com/mcmonkeyprojects/SwarmUI)):**
- Configurable from the **Session → AI Integration** panel: SwarmUI base URL, model, dimensions, steps, CFG, prompt template (with `{name}` and `{appearance}` placeholders), negative prompt, and an explicit **Allow NSFW content** toggle (off by default — when off, safe-content terms are appended to the negative prompt).
- Auto-fires whenever a creature is AI-generated — both the manual **✨ AI Generator** in the Token Library and the new Encounter Builder plugin attach a portrait to the inserted creature.
- Each saved creature has a **🎨 Regenerate Image** button in its detail view that opens a prompt-edit modal, letting you bypass the session-level template for that one creature.
- **Test Image Connection** lists every Stable-Diffusion model SwarmUI knows about as clickable chips, so you can pick one with one click.
- New backend endpoints: `POST /api/ai/test-image`, `POST /api/ai/generate-image` (called by both the host and plugins).

**New bundled plugin — Random Encounter Builder:**
- Pick a biome (forest / cave / road / city / swamp), party size, and party level → roll → get a random encounter with a flavour line and a creature draw.
- Matches each rolled creature against the existing creature library; missing ones get a per-row **Generate now** button that fires the LLM (and, if configured, SwarmUI) to insert a fresh creature with a portrait into the library. Generation is opt-in per row so AI tokens aren't burned on encounters you'll never use.

**AI stat-block generator:**
- Bumped `max_tokens` to 4096 and dropped temperature to 0.3 — fixes the "Expected ',' or '}' at position ~1273" mid-JSON truncation on local servers that defaulted to 1024 tokens.
- Added a one-shot LLM JSON-repair retry on parse failure.
- Strengthened the system prompt around skills + saves: most creatures now get 0–4 skill proficiencies and 0–2 save proficiencies instead of every slot filled.
- Server-side guardrail: if the model still over-assigns (≥10/18 skills or ≥5/6 saves), all skills/saves are reset to null so the DM can hand-pick.
- New **Legendary creature** checkbox in the AI Generator modal — off by default, with server-side enforcement that strips legendary actions when not requested.
- New **Appearance** field is now passed into image generation alongside the creature name (substitutes `{appearance}` in the prompt template, or appends if no placeholder).

**Plugin API additions:**
- `context.getAiSettings()` now also exposes the image-generation fields (`imageEnabled`, `imageProvider`, `imageBaseUrl`, `imageModel`, `imagePromptTemplate`, `imageNegativePrompt`, `imageAllowNsfw`, `imageWidth`, `imageHeight`, `imageSteps`, `imageCfgScale`).
- See [`PLUGINS.md`](PLUGINS.md) §1 for a worked image-gen example.

**Bug fix:**
- Saving an AI-generated creature occasionally crashed with "Unexpected token '<'" because the prefilled `image_data` data URL was being re-uploaded as a multipart text field, blowing past multer's default 1MB text-field cap. The form now strips it before submit (the binary file is still attached as a real upload).

### v1.2.0 — Plugin store + three new plugins, panel-tab extension API

**New plugins (downloadable from the Plugin Store on the website):**
- **Weather Effects** — DM-controlled animated rain / snow / fog across the whole map, with intensity and wind-angle controls. Per-session, particles scale with map size.
- **Damage Pop-Ups** — DM picks a token and announces a damage / healing / temp HP value. Floating colour-coded chip animates above the token while HP is updated using 5e rules (temp HP absorbs first, healing caps at max, temp HP doesn't stack).
- **Tab Controller** — adds a Tab Visibility section to the Session tab so you can hide rarely-used built-in tabs from the bar (Spells / Markers / Treasure / Handouts). Hidden tabs stay reachable via an "Open" button. Map / Token Library / Token List / Session are protected.

**Plugin API additions:**
- `panelTabHidden` registry — `Map<pluginId, Set<tabId>>`. Plugins can hide built-in DM panel tabs from the bar. The host filters the bar by the union of every plugin's set; hidden tabs still render their body when active so plugins can navigate to them via `setPanelTab`.
- `panelTabExtensions` registry — `Map<pluginId, { tabId, render }>`. Plugins can append content inside the body of a specific built-in tab (currently the Session tab; other tabs need a one-line host insertion to enable).
- `context.setPanelTab(tabId)` — DM-only callback so plugins can switch the active panel tab programmatically.

**Bug fix:**
- Spell templates' tpl-edit / tpl-erase tools were silently no-oping on freshly-drawn templates because the mousedown handler captured a stale closure of the templates array. Fixed via a ref, matching the existing pattern for tokens / walls / doors.

### v1.1.0 — Plugin system, PDF spell scanner, big combat + spell-template improvements

**Plugin system**
- New extension points: spell-template decorators, template-editor extensions, DM tabs, template overlays (host-rendered effects via canvas), map decorations, and map click handlers
- Per-plugin JSONB key/value store (`/api/plugins/:id/data`), auto-broadcasting writes via socket so DM ↔ player views stay in sync
- Generic `plugin_event` socket relay so plugins can ship arbitrary cross-client events
- Plugin manager UI in the DM Session tab — install zips, enable/disable, dependency status, delete
- Bundled **Elemental Templates** plugin (fire / water / ice / lightning / void / acid-poison effects on spell templates, cone-aware)
- See [`PLUGINS.md`](PLUGINS.md) for the authoring guide

**Spell library + PDF scanner**
- Upload a sourcebook PDF — deterministic regex header detection + LLM body fill + multi-pass consensus voting against hallucinations
- Cross-page body merging so spells whose description spans a page break aren't truncated
- Open5e SRD fallback for missing/short descriptions, with a 2014 / 2024 ruleset toggle
- 17-entry alias map for SRD-renamed spells (Bigby's Hand → Arcane Hand, Tasha's Hideous Laughter → Hideous Laughter, etc.)
- Post-scan **Review names** panel with one-click rename + open5e refresh
- Bulk **Refresh all from open5e** for backfilling existing rows
- Spell library **Export / Import** with class + level filters

**Combat improvements**
- Pulse animation on the current-turn token
- Add tokens to active combat mid-fight (per-token "+ Add to combat" button + bulk add modal)
- Auto-select tokens visible to the currently selected token when starting combat (with a viewer-picker dropdown inside the modal so you can switch viewer without cancelling)

**Character / inventory**
- New **Magic Item** inventory type (separate from weapons), with attunement flag preserved through treasure transfers
- Player journal, currency tracking, level / XP fields
- Concentration tracking, heroic inspiration, death saves, hit dice, armor proficiencies
- Group token select-and-move (drag-rectangle marquee)
- Token export with selection modal; treasure list export-selected

**Spell templates**
- DM-only place / edit / move / colour controls for cones, circles, lines, squares
- Spell templates broadcast to players (read-only) so plugin overlays are visible at the table
- Live feet readout while drawing — chip matches the existing Measurement-tool style (radius for circles, side dimensions for squares, length for cones and lines)

**Map / world**
- Multi-floor map labels
- Per-token light source colour
- Magical darkness / heavy fog / **water** zones (water uses a real slice-distortion canvas effect)
- Light source visibility polygon clipping fixes

**PDF export**
- Print pagination respecting `:has()` so the character sheet flows over multiple pages cleanly
- Two-column spell grid in the export

**Stack**
- nginx `^~ /api/` route prefix so plugin assets (`.js` paths under `/api/plugins/`) bypass the static-asset cache regex
- Bind-mounted `./backend/plugins` so the host filesystem is the source of truth for installed plugins

---

### v1.0.0 — Initial Release

**Core Features**
- Session-based multiplayer with unique session codes and DM password protection
- Per-player instanced fog of war with ray-cast line-of-sight (LOS)
- Ambient light modes: Bright, Dim, Dark
- Vision types: Normal, Darkvision, Blindsight, Truesight, Devil's Sight

**Maps**
- Upload and switch battle maps
- Per-session map libraries (maps are not shared between sessions)
- Per-map state: tokens, walls, doors, lights, magical darkness and spawn point all remembered per map
- Configurable grid with colour and opacity controls

**Tokens & Creatures**
- Full creature stat block editor with AI generation support
- Player character creator with class, stats, skills, saving throws, senses, spells, and inventory
- Token sizing (Tiny → Gargantuan)
- Token visibility toggle (DM-only hidden tokens)
- Conditions tracker on each token
- Initiative and HP management per token

**Combat**
- Combat tracker with initiative order strip
- Choose which tokens are included when starting combat
- Next Turn control visible to all players

**DM Tools**
- Wall placement (line, rectangle, circle, polygon) for LOS occlusion
- Door placement with open/close/flip controls
- Light source placement with configurable bright/dim radii
- Magical darkness zones
- Player spawn point per map
- Dice roller with roll history overlay

**Character Sheets**
- Inventory tab with items, quantities, equipped state, currency (GP/SP/CP)
- Spells tab: spells organised by level (Cantrips–9th), combat vs utility split, spell slot tracking
- Export character sheet to PDF (stat block format)

**Creature Library**
- Searchable creature library with monster/character filter
- AI-powered stat block generation (LM Studio, Ollama, OpenAI compatible)
- Loot tables per creature with drop chance percentages
- View inventory, spells, and loot from the DM token viewer

**Stat Block**
- Full D&D 5e stat block display including senses, spells, inventory, and loot
- Cinzel + Crimson Pro typography matching the TableTop Forge brand
