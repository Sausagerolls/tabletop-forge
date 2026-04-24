# TableTop Forge

**A self-hosted virtual tabletop for D&D 5e.**  
Per-player instanced fog of war, AI-powered token generation, full combat tracking, and complete DM control — running entirely on your own machine.

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

## Changelog

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
