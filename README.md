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
- Optional: [LM Studio](https://lmstudio.ai/) or [Ollama](https://ollama.com/) for local AI token generation

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
