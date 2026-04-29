# Writing TableTop Forge Plugins

This guide is for plugin authors. If you just want to install a plugin, use the **Plugins** section of the **Session** tab in the DM view.

A plugin is a folder of static files. The backend never executes plugin code; it only stores metadata, serves your files, and provides a generic key/value store. Your code runs in the browser, on both DM and player views, using the host's React + Konva instances.

---

## 1. The mental model

A plugin can do three kinds of things, alone or in combination:

1. **Decorate** existing objects — overlay animated effects on a spell template, draw extra Konva shapes on the map, add fields to a built-in popup, add tabs to the DM panel.
2. **Persist data** in a per-plugin JSONB key/value store via `data.read/write/delete`. The host writes are auto-broadcast to **every client in the session including the sender**, so DM ↔ player sync is free.
3. **Listen for and emit events** between clients in the same session via `subscribe(handler)` and `emitEvent(type, payload)`.

What a plugin cannot do:

- Run code on the backend (no SQL access, no filesystem writes outside its own dir).
- Modify core React components, the login screen, or anyone else's data.
- Persist data outside its own KV namespace.
- Outlive itself: when disabled or deleted, every registry entry it added is stripped. Its stored data persists by design — re-installing restores everything.

### Before you build

The base app already includes a fair number of features. Check that whatever you're about to build isn't already shipping — building a plugin to recreate something the host does natively is wasted effort. As of this writing the app has built-in: per-player fog of war / line of sight, full creature library with AI generation, spell library with PDF scanner, combat tracker with initiative, walls / doors / lights / magical-darkness / water zones, multi-floor maps, dice roller, sounds (one-shot effects + ambient), DM markers / pins on the map, treasure chest, handouts to players, and PDF export of character sheets. The plugin system is for the things on top of those.

### Calling host endpoints from a plugin

Plugins run as ordinary JavaScript on the same origin as the host, so any same-origin `fetch()` works. Some endpoints worth knowing about:

```js
// Read the creature library
const creatures = await fetch('/api/creatures').then((r) => r.json());

// Generate a stat block via the host's AI proxy (uses the AI settings
// the DM configured in Session → AI Integration; pull them with
// context.getAiSettings)
const ai = context.getAiSettings();
const generated = await fetch('/api/ai/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    provider: ai.provider, baseUrl: ai.baseUrl, apiKey: ai.apiKey, model: ai.model,
    promptData: { name: 'Goblin' },
  }),
}).then((r) => r.json());

// Insert a new creature (multipart form — JSON-stringify objects;
// optionally attach a binary `image` file under the same field name)
const fd = new FormData();
for (const [k, v] of Object.entries(generated)) {
  if (v == null) continue;
  fd.append(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
}
// fd.append('image', someBlobOrFile);   // ← optional portrait
const inserted = await fetch('/api/creatures', { method: 'POST', body: fd }).then((r) => r.json());

// Generate a portrait via SwarmUI (only if the DM has enabled image
// generation in Session → AI Integration). Returns a data: URL you
// can decode to a Blob and attach to /api/creatures as `image`.
if (ai.imageEnabled && ai.imageBaseUrl) {
  const { image } = await fetch('/api/ai/generate-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider:       ai.imageProvider || 'swarmui',
      baseUrl:        ai.imageBaseUrl,
      model:          ai.imageModel || '',         // blank = first installed
      name:           generated.name,              // substituted into {name}
      appearance:     '',                          // substituted into {appearance}
      promptTemplate: ai.imagePromptTemplate || '',// or pass `rawPrompt` to bypass
      negativePrompt: ai.imageNegativePrompt || '',
      allowNsfw:      !!ai.imageAllowNsfw,
      width:          ai.imageWidth,  height: ai.imageHeight,
      steps:          ai.imageSteps,  cfgScale: ai.imageCfgScale,
    }),
  }).then((r) => r.json());
  // image === 'data:image/png;base64,...' — decode + attach as `image` File
}
```

These endpoints aren't part of the plugin contract — they're internal host APIs the plugin manager doesn't version-stabilise. They might rename between releases. Use them sparingly and check the host's `backend/src/routes/*.js` for the current shape if your plugin breaks after an update. The bundled `encounter-builder` plugin uses all four of the above (LLM stat block + SwarmUI portrait + library insert) as a worked example.

#### Bulk import / export (content packs)

For content-pack plugins that ship a curated set of creatures or spells, the host has matching bulk endpoints. They take a multipart `file` form field carrying the JSON payload, the same shape the corresponding `/export` endpoint emits.

```js
// Export — JSON dump with embedded image_data (creatures) for offline reuse.
//   /api/creatures/export?ids=1,2,3   (or ids=all for everything)
//   /api/spell-library/export?ids=u1,u2,u3
const dump = await fetch('/api/creatures/export?ids=1,2,3').then((r) => r.json());

// Import — POST the JSON back as a `file` upload field.
const fd = new FormData();
fd.append('file', new Blob([JSON.stringify(dump)], { type: 'application/json' }), 'creatures.json');
const imported = await fetch('/api/creatures/import', { method: 'POST', body: fd }).then((r) => r.json());
// imported = { imported: <count>, creatures: [{ id, name, ... }, ...] }
```

`/api/creatures/import` returns the inserted rows so a content-pack plugin can stash their `id`s in plugin KV and delete them on `unregister`. `/api/spell-library/import` returns `{ imported, skipped, total }` only — to track ids for cleanup, follow up with `GET /api/spell-library` and match by `name` (the column has a UNIQUE constraint, so name is a stable key).

The full creature column list — including which fields are JSONB and need `JSON.stringify(...)` before they hit `POST /api/creatures` — lives in `backend/src/routes/creatures.js` (`CREATURE_FIELDS` and `JSONB_FIELDS`). The bundled `srd-pack-2024` plugin demonstrates the install-on-enable / delete-on-disable pattern.

#### Languages registry

The host exposes a first-class language table at `/api/languages`. The SRD set (Common, Dwarvish, Draconic, etc.) is seeded on startup; DMs can `POST` custom entries which become available across the creature editor, the AI generator's prompt, and any plugin that reads from this endpoint.

```js
const langs = await fetch('/api/languages').then((r) => r.json());
// [{ id, slug, name, category: 'standard'|'exotic'|'rare'|'custom', script, is_custom }, ...]
```

Creature rows still store their language list as **comma-separated names** in `creatures.languages` (the existing TEXT column). Names match the canonical entries; trailing qualifiers like `" (understands but cannot speak)"` stay attached to whichever language they qualify and are preserved across save/load. Match the `name` field of `/api/languages` rows against parsed entries to know which are canonical vs custom — the bundled `npc-chat` plugin uses this pattern to colour-code language chips and decide which players understand a given line.

---

## 2. Filesystem layout

A plugin lives in a single directory under `backend/plugins/<your-plugin-id>/`:

```
backend/plugins/my-plugin/
├── plugin.json        # required — see §3
└── client.js          # required by default — your frontend module
```

You can include any other files the plugin needs (images, sounds, additional JS modules). Reach them at runtime via:

```
/api/plugins/<your-plugin-id>/asset/<relative-path>
```

The backend serves these with sensible MIME types (audio/mpeg for `.mp3`, image/png for `.png`, application/json for `.json`, etc.) and a path-traversal guard. Symlinks and `..` segments are rejected.

#### Loading static assets — concrete patterns

```js
// Audio (sound effects, music)
const audio = new Audio(`/api/plugins/${pluginId}/asset/sounds/thunder.mp3`);
audio.preload = 'auto';
audio.play();   // see autoplay note below

// Image (decoration sprites, icons)
const img = new Image();
img.src = `/api/plugins/${pluginId}/asset/sprites/skull.png`;
// then pass to a Konva.Image, or use react-konva's <Image image={img} />

// JSON data file (encounter tables, lookup data)
const data = await fetch(`/api/plugins/${pluginId}/asset/tables/encounters.json`)
  .then((r) => r.json());
```

**Browser autoplay policy.** Modern browsers refuse to play audio (or video with sound) until the user has interacted with the page — clicked, tapped, or pressed a key. The DM clicking a button in your plugin counts as interaction, so DM-side audio always works. But on the **player** side, if your audio is triggered by a `subscribe` event the browser may reject `audio.play()` with `NotAllowedError` until the player has clicked anywhere on their tab. Catch the rejection and either log a one-time warning or surface a "Click to enable audio" prompt in your plugin's UI.

### Distribution

To share a plugin, zip its directory contents (the manifest must be at the zip root or one level deep). Users install via **Plugins → Upload plugin .zip** in the Session tab. Uploaded plugins are extracted into `backend/plugins/<id>/` (overwriting any prior install of the same id).

### Escape hatch

If a plugin breaks your app so badly that the in-app manager can't disable it, stop the backend and delete `backend/plugins/<id>/` on the host filesystem. On next start the host reconciles its records with what's on disk. Stored KV data is not touched, so re-installing the plugin later restores its state.

### Library content imported by a plugin

If a plugin imports creatures or spells into the host library — the **content-pack pattern** — it should track the inserted ids in plugin KV under these well-known keys so the host's `DELETE /api/plugins/<id>` route can clean them up:

| Key | Type | Meaning |
| --- | --- | --- |
| `inserted_creature_ids` | `number[]` | Row ids in `creatures` to remove on uninstall |
| `inserted_spell_ids`    | `number[]` | Row ids in `spell_library` to remove on uninstall |
| `content_loaded_v1`     | `true`     | Once-flag — set after first successful import so reloads don't re-import duplicates |
| `treasure_loaded_v1`    | `true`     | Once-flag for any treasure-chest items pushed via `window.__tabletopForge.treasure.addItems` |
| `install_status`        | `object`   | Last install state, surfaced in your tab UI |

When a DM clicks **Delete** in the plugin manager:

1. The host reads `inserted_creature_ids` + `inserted_spell_ids` from plugin KV.
2. Deletes the listed rows from `creatures` and `spell_library`.
3. Removes the five tracking keys above from plugin KV.
4. Removes the plugin's files and registry row.
5. Other KV keys (per-DM preferences, caches) are preserved so a later re-install restores them.

The DM also has a **Clean up orphaned plugin content** button in the manager that runs the same cleanup for any tracking rows whose plugin row is already gone — useful after upgrading from a host version that didn't auto-clean on Delete.

**For plugin authors:** if your plugin imports library content, follow the once-flag pattern. Set `content_loaded_v1` after the first successful `/api/creatures/import` + `/api/spell-library/import` call, gate further imports on it, and clear it inside `unregister` only when your tracked-ids array is empty (i.e. the cleanup actually finished). The bundled `content-exporter` plugin's runtime template is the canonical example.

---

## 3. The manifest — `plugin.json`

```json
{
  "id": "lowercase-with-hyphens",
  "name": "Display Name",
  "version": "1.0.0",
  "description": "One-line description shown in the manager.",
  "author": "Your Name",
  "requires": [],
  "frontend_entry": "client.js",
  "extension_points": ["spell_template_decorator"]
}
```

| Field | Required | Notes |
|---|---|---|
| `id` | yes | Must match the directory name. Regex: `^[a-z0-9][a-z0-9_\-]*$`. |
| `name` | recommended | Falls back to `id`. |
| `version` | recommended | String. Cosmetic; the host doesn't enforce semver. |
| `description` | recommended | Plain text. |
| `author` | optional | Plain text. |
| `requires` | optional | Array of plugin ids that must be enabled before this plugin can enable. |
| `frontend_entry` | optional | Path to your frontend ES module, relative to the plugin dir. Default `client.js`. |
| `extension_points` | optional | Cosmetic — names of extension points you use. The host ignores this field; it's for humans reading the manifest. |

### Dependencies

If `requires: ["other-plugin"]`:

- The host refuses to enable your plugin if any required plugin is missing or disabled, with a message naming the missing/disabled ids.
- The host refuses to disable or delete a plugin if any **enabled** plugin requires it.

This is the only inter-plugin coordination the host enforces. There is no shared symbol table — your plugin can't directly call functions exported by another plugin. If you need cross-plugin coordination, use the event bus (see §6).

---

## 4. The `client.js` module

The host loads your module via dynamic `import()` from `/api/plugins/<id>/asset/<frontend_entry>`. It must be a valid ES module with a default export shaped like this:

```js
export default {
  register({ React, ReactKonva, registries, context }) {
    // ... wire up your contributions
  },
  unregister({ registries }) {
    // ... optional cleanup hook (the host already removes per-plugin
    // registry entries by your pluginId, so most plugins don't need this)
  },
};
```

`register()` is called once when the plugin loads (per browser tab, per session). It's also re-called if the DM disables and re-enables the plugin without refreshing — design your `register()` so re-running it is idempotent.

### What `register` receives

```js
register({ React, ReactKonva, registries, context })
```

#### `React`
The host's React instance. **Use this, not your own bundled React.** Hooks, context, and reconciliation only work if you share the host's instance.

#### `ReactKonva`
The host's `react-konva` exports — `Group`, `Layer`, `Circle`, `Rect`, `Line`, `Text`, `Image`, `Wedge`, etc. Use these for any canvas drawing. Same instance-sharing rule applies.

#### `registries`
The set of extension-point maps you can register contributions on. See §5.

#### `context`
Runtime environment for your plugin. Fields:

| Field | Type | What it is |
|---|---|---|
| `pluginId` | `string` | Your plugin id. Already scoped into `data` and event helpers — useful for keys. |
| `manifest` | `object` | The parsed manifest (handy for the `version` field, etc.). |
| `sessionId` | `number` | Database id of the current session. |
| `role` | `'dm' \| 'player'` | Which view called `loadPlugins()`. **The same plugin module loads on both sides** — this tells you which side this run is. |
| `socket` | `socket.io-client Socket` | The shared session socket. You usually don't need to touch this directly; use `data` and the event helpers below. |
| `data` | `{ read, readPrefix, write, delete }` | Per-plugin KV store, scoped to your `pluginId`. See §6. |
| `notifyChange` | `() => void` | Forces every host component subscribed to the registry to re-render. Call this after a state change that should be visible immediately. See §7. |
| `subscribe` | `(handler) => unsubscribe` | Subscribe to incoming `plugin_event` frames addressed to your plugin. See §6. |
| `emitEvent` | `(type, payload) => void` | Broadcast a custom event to every other client in the session. See §6. |
| `setPanelTab` | `(tabId: string) => void` | DM only. Programmatically switch the active panel tab. Works for built-in tab ids (`'map'`, `'session'`, etc.), plugin-supplied tab ids (`'plugin:<pluginId>'`), and tabs currently hidden via `panelTabHidden`. |
| `subscribeRegistry` | `(handler) => unsubscribe` | Subscribe to *every* registry version bump in the host. Use this when your plugin's UI needs to react to OTHER plugins' contributions changing (e.g. a tab manager listing every plugin's `dmTabs` — when a new plugin loads its tab should show up live without a page refresh). Don't use this for re-rendering on your own state changes — call your local notify pump for that. |
| `getAiSettings` | `() => (object \| null)` | DM only. Returns the host's currently-configured AI settings (the same object the Session tab's AI Integration panel writes). Reads fresh on every call so a config change mid-session is picked up without reloading the plugin. Returns `null` when AI hasn't been configured yet. Stat-block fields: `provider`, `baseUrl`, `apiKey`, `model`. Image-generation fields (only meaningful when the DM has enabled image gen): `imageEnabled`, `imageProvider`, `imageBaseUrl`, `imageModel`, `imagePromptTemplate`, `imageNegativePrompt`, `imageAllowNsfw`, `imageWidth`, `imageHeight`, `imageSteps`, `imageCfgScale`. Use it together with `fetch('/api/ai/generate', {...})` and `fetch('/api/ai/generate-image', {...})` to ask the host's AI proxies for content. |

### What `unregister` receives

```js
unregister({ registries })
```

Optional. The host already removes your contributions from every registry by `pluginId` (and from `templateOverlays` by matching the `pluginId` field in each entry's value), and clears your event subscriptions. Override this only if you need to release resources you allocated outside the registries (e.g., a `setInterval` you started — though if you do, prefer cleaning up via React `useEffect` returns inside your components).

> **`unregister` does NOT receive `context`.** That means no `data`, `socket`, `subscribe`, or `emitEvent` inside this hook — only `registries`. Plugins that need to flush KV state during cleanup (because they own host-DB rows that survive disable, like content packs) should capture the `data` API to a module-level variable during `register()` and reach for it from `unregister()`:
>
> ```js
> let savedDataApi = null;
> let insertedIds  = [];
>
> export default {
>   async register({ context }) {
>     savedDataApi = context.data;
>     // ... insert rows, push their ids into insertedIds, persist via savedDataApi.write
>   },
>   async unregister() {
>     for (const id of insertedIds.splice(0)) {
>       await fetch(`/api/creatures/${id}`, { method: 'DELETE' }).catch(() => {});
>     }
>     if (savedDataApi) await savedDataApi.write('inserted_ids', insertedIds);
>   },
> };
> ```
>
> The KV write at the end is important: cleanup fetches are fire-and-forget, so persist whatever ids you couldn't delete on this pass — the next enable will see them in KV and retry. Without that you can leak host-DB rows if the user disables while offline.
>
> The host does **not** await your `unregister` — it strips your registry entries immediately and continues, so an `async unregister` is essentially a background job that races against any subsequent re-enable. That's fine for cleanup work (fetches keep running, the worst case is duplicate-ID DELETEs returning 404 on the next enable's retry), but don't expect the disable button to block on you.

---

## 5. Extension points (registries)

Each registry is a `Map`. Your plugin adds entries via `register({ registries }) { registries.<name>.set(pluginId, contribution) }`. The host calls every contribution at the appropriate time. Per-plugin removal is automatic on unload.

### `spellTemplateDecorators`

```js
registries.spellTemplateDecorators.set(pluginId, (template, baseProps) => ReactNode)
```

For every spell template currently on the map (including those placed by the DM and visible to all clients), the host calls your function with:

- `template` — the persisted template object: `{ id, type: 'circle'|'cone'|'line'|'square', points: number[], color, label, ... }`.
- `baseProps` — `{ kind, x, y, radius?, width?, height?, angle?, rotation?, points? }` describing the base shape geometry the host already rendered. Use this to position your overlay relative to the template without re-deriving its shape.

Return a single Konva node (often a `Group` containing several shapes) or `null` to render nothing. Your nodes are drawn **above** the base template inside the same Layer, which has `listening: false`.

Wrap the returned node in a React component if you need state or animation hooks — the host re-renders your decorator whenever the registry version bumps (see `notifyChange` in §7).

### `templateEditorExtensions`

```js
registries.templateEditorExtensions.set(pluginId, (template) => ReactNode)
```

DM-only. The host renders your returned node inside the template-edit popup, after its built-in fields. Use this to add controls bound to the selected template — element pickers, custom labels, anything specific to one template.

The host renders this with normal DOM React (not Konva) — return `<div>`, `<select>`, etc. as JSX or `React.createElement` calls.

### `dmTabs`

```js
registries.dmTabs.set(pluginId, {
  label: 'Display Name',     // optional; falls back to pluginId
  icon: ReactNode,           // optional — currently unused but reserved
  render: (ctx) => ReactNode // called when the tab is active
})
```

DM-only. Adds a new tab to the right-hand DM panel. The render function is called with `{ sessionId, role, socket }` and should return the full tab content (the host wraps it in a scroll container).

This is **DOM React, not Konva** — return ordinary HTML elements (`<div>`, `<button>`, `<select>` …) created with `React.createElement`. The host's CSS is already loaded into the page, so plugin tabs can use Tailwind utility classes (`text-sm`, `bg-gray-800`, `rounded-lg`, etc.) and the project's branded colour tokens (`text-dnd-gold`, `bg-dnd-panel`) directly. Don't reach for Konva primitives here — those only work inside `mapDecorations` / `spellTemplateDecorators`, which render to the canvas Stage.

#### Player-side DOM UI (no `playerTabs` registry exists)

There is **no** player-side equivalent of `dmTabs`, `panelTabExtensions`, or any other tab registry. The player view has no plugin-supplied UI surface in the panel. If your plugin needs to show DOM UI to players (a chat popup, a notification, a roll result modal, etc.), the supported pattern is to append your own node to `document.body` from `register()` and render into it manually:

```js
let modalRoot = null;

function ensureModalRoot() {
  if (modalRoot) return modalRoot;
  modalRoot = document.createElement('div');
  modalRoot.id = `plugin-${pluginId}-root`;
  Object.assign(modalRoot.style, {
    position: 'fixed', inset: '0', zIndex: '99999',
    pointerEvents: 'none',          // let it pass clicks through by default
  });
  document.body.appendChild(modalRoot);
  return modalRoot;
}

context.subscribe(({ type, payload }) => {
  if (type !== 'show-popup') return;
  const root = ensureModalRoot();
  // … render with vanilla DOM, or your own React.createRoot if you want React.
});
```

The host doesn't pass `ReactDOM` through `register`, and `React.createRoot` lives on `react-dom/client` — so a plugin can't mount a React tree into its own DOM root without bundling its own `react-dom`. Drive the node with **vanilla DOM** (`element.appendChild`, `style`, `textContent`, `addEventListener`) — that's cheap, ship-friendly, and avoids the duplicate-React hazard. Tear the node back down in `unregister` so a disabled plugin doesn't leave orphan elements behind. The bundled `npc-chat` and `dice-3d` plugins use this pattern.

### `templateOverlays`

```js
registries.templateOverlays.set(templateId, { kind: 'water', pluginId })
```

This registry is keyed by `templateId`, not `pluginId` — every entry must have a `pluginId` field so the host can clean up your entries on unload. Currently the only host-supported `kind` is `'water'`, which feeds the template into the host's slice-distortion water canvas (the same effect the Water tool produces). Set this when your plugin wants the host to render a template using a built-in canvas effect that pure Konva can't replicate.

### `mapDecorations`

```js
registries.mapDecorations.set(pluginId, (ctx) => ReactNode)
```

General-purpose "draw stuff on the map". Your function is called every render with:

- `ctx.tokens` — current token list. See **Token shape** below for fields.
- `ctx.gridSize`, `ctx.offsetX`, `ctx.offsetY` — grid sizing in pixels (use `(grid_col + 0.5) * gridSize + offsetX` for a 1×1 token's centre x).
- `ctx.mapWidth`, `ctx.mapHeight` — map natural size in pixels.
- `ctx.isPlayer` — whether this is the player view.
- `ctx.playerTokenId` — id of the player's own character token (player view only).

Returned nodes are drawn in a single non-interactive Konva Layer **above the token layer**, so you can occlude tokens. The Layer has `listening: false` — players cannot click your decorations. If you need clicks (e.g. DM-side editing), use `mapClickHandlers` to do your own hit-testing.

If you want different content for the DM and players, branch on `ctx.isPlayer` and return different nodes (or `null`).

#### Decorations follow tokens automatically

Your function is called every render with a fresh `ctx.tokens` snapshot. If the host updates a token's `grid_col` / `grid_row` (because the DM dragged it, or a player-owned token moved), your next call gets the new coordinates and the decoration re-renders at the new position. You don't need to subscribe to anything or maintain your own copy of token positions — just compute from `ctx.tokens` each time and the host re-renders for you.

#### Map-spanning effects

Decorations don't have to anchor to a specific point. For ambient effects that cover the whole map (weather, parallax sky, tinted lighting overlays, scrolling textures), use `ctx.mapWidth` and `ctx.mapHeight` as your canvas bounds and lay particles out across them. The bundled `weather-effects` plugin uses this pattern — it spawns hundreds of particles across `(0, 0)` → `(mapWidth, mapHeight)` and lets each one drift with a per-particle seed.

#### Token shape

Each entry in `ctx.tokens` is an object with these fields you'll commonly need:

| Field | Type | Notes |
|---|---|---|
| `id` | `number` | Stable token id within the session. Compare with `===`; player ids may arrive as numbers but climb-state keys you store yourself should `String(id)` to be safe. |
| `name` | `string` | Display name. |
| `nickname` | `string` | DM-set override; usually shown to players in place of `name` if present. |
| `grid_col`, `grid_row` | `number` | Top-left grid cell of the token. May be fractional (smooth movement). |
| `size` | `string` | One of `'tiny' \| 'small' \| 'medium' \| 'large' \| 'huge' \| 'gargantuan'`. Cell footprint is 1×1 for tiny/small/medium, 2×2 for large, 3×3 for huge, 4×4 for gargantuan. |
| `is_player` | `boolean` | True if the token represents a PC. |
| `is_hidden` | `boolean` | DM-only flag. Hidden tokens are not in the player's `ctx.tokens` at all — but they ARE in the DM's, so filter `!t.is_hidden` if you want to ignore them on the DM side. |
| `is_dead` | `boolean` | Useful if you want effects to drop off dead targets. |
| `current_hp`, `max_hp`, `temp_hp` | `number` | HP state, useful for damage indicators / health-bar plugins. |
| `conditions` | `string[]` | Array of condition ids (e.g. `'invisible'`, `'prone'`). |
| `creature_image`, `image_path` | `string` | Relative URLs under `/uploads/...`. The host already renders the token portrait — read these only if you need to draw your own token-aware artwork. |

Other fields exist on tokens but aren't part of the supported plugin contract — they may move around between releases. Treat anything not listed here as best-effort.

Tokens with multi-cell footprints centre at `(grid_col + cells/2) * gridSize`, where `cells` is `1` / `2` / `3` / `4` from the table above. Use the longer axis for radius-style hit tests.

#### Hit-testing tokens from a click

A common need: given a click at `(x, y)` in map-pixel coordinates, which token did the player click? The `Token shape` table above has the cell footprint per size, so a tight loop does it in a few lines:

```js
const SIZE_TO_CELLS = { tiny: 1, small: 1, medium: 1, large: 2, huge: 3, gargantuan: 4 };

function tokenAt(x, y, ctx) {
  // Iterate last-to-first so visually-on-top tokens win when stacked.
  for (let i = ctx.tokens.length - 1; i >= 0; i--) {
    const t = ctx.tokens[i];
    const cells = SIZE_TO_CELLS[t.size] || 1;
    const tx = ctx.offsetX + Number(t.grid_col) * ctx.gridSize;
    const ty = ctx.offsetY + Number(t.grid_row) * ctx.gridSize;
    const tw = cells * ctx.gridSize;
    const th = cells * ctx.gridSize;
    if (x >= tx && x < tx + tw && y >= ty && y < ty + th) return t;
  }
  return null;
}
```

Use this from a `mapClickHandlers` callback (after caching `lastCtx`, see below) when your plugin's UX is "click a token to do X".

#### Reaching map state from a click handler

`mapClickHandlers` callbacks receive only `{ x, y, tool, isPlayer }` — they don't get `ctx.tokens` or grid sizing. The standard pattern is to **cache the latest mapDecorations ctx** at module scope and read it from the handler:

```js
let lastCtx = null;

registries.mapDecorations.set(pluginId, (ctx) => {
  lastCtx = ctx;
  return /* ... */;
});

registries.mapClickHandlers.set(pluginId, {
  handler: ({ x, y, isPlayer }) => {
    if (!lastCtx) return false;       // map hasn't rendered yet
    const me = lastCtx.tokens.find(t => t.id === lastCtx.playerTokenId);
    // ... use lastCtx.gridSize, lastCtx.offsetX, etc.
  },
});
```

`lastCtx.tokens` and `playerTokenId` reflect whatever was current the last time the map drew, which is fresh enough for any UX driven by clicking.

### `panelTabHidden`

```js
registries.panelTabHidden.set(pluginId, new Set(['spells', 'markers']))
```

Plugins can hide built-in DM panel tabs from the tab bar. The host filters the bar by the **union** of every plugin's set, so multiple plugins can independently mark tabs hidden without trampling each other.

Hiding only removes the BUTTON. The corresponding tab body is still rendered when active — i.e. you can call `context.setPanelTab('spells')` to land the user inside a hidden tab even though it's missing from the bar. This is the standard pattern for a tab-management plugin: "hide from clutter, but keep reachable via plugin UI".

Registry value is a `Set<string>` of tab ids. Built-in tab ids are `'map' | 'library' | 'spells' | 'tokens' | 'markers' | 'treasure' | 'handouts' | 'session'`. **Plugin-supplied tabs (added via `dmTabs`) are also hideable** — use the id `'plugin:<pluginId>'` to refer to them. The host filters both the built-in tab bar and the plugin tab buttons by the same set, so a tab-management plugin can hide either kind uniformly.

### `customClasses`

```js
registries.customClasses.set(pluginId, ['Blood Hunter', 'Mystic'])
```

Adds character class names to the host's class list. The host's `getAllClasses()` (in `frontend/src/utils/classes.js`) merges every plugin's contribution with the SRD base list, de-duplicates case-insensitively, and components consume it via the `useAllClasses()` hook so additions/removals show up live.

The classes appear in every dropdown the host renders for class choice:

- Spell Library — top class filter
- Spell Library — Allowed-classes checkboxes inside the spell editor
- Spell Library — Export modal class filter
- Character sheet — Class field on player characters
- Character sheet — Spell Library picker (Learn From Library)

Update the registry whenever your plugin's stored class list changes, then call `notifyChange()` so existing renders pick up the new entries. The bundled `custom-classes` plugin shows the full pattern (KV persistence + cross-client `subscribe()` sync).

This registry only affects rendering — the host still stores `char_class` as a free-text column in the database, so plugin-added classes survive even if the plugin is later disabled (the value sticks; the dropdown just shows it as a `(custom)` option until re-enabled).

### `customSubclasses`

```js
registries.customSubclasses.set(pluginId, {
  Wizard:        ['Bladesinger', 'Order of Scribes'],
  'Blood Hunter': ['Order of the Mutant', 'Order of the Lycan'],
})
```

Adds subclass names per class. Keys can be base SRD classes (`'Wizard'`, `'Cleric'`) or plugin-supplied classes from `customClasses` (`'Blood Hunter'`). Lookups in the host (`getAllSubclasses(charClass)`) match keys case-insensitively, so capitalisation drift between your plugin's stored data and the host's class list won't drop entries.

The subclass dropdown on the player character sheet pulls from this registry plus the host's `BASE_SUBCLASSES` map (curated SRD 2014/2024 set, no edition suffixes — duplicates dropped). The dropdown re-renders whenever any plugin updates the registry, so DM-side additions reflect on every player's sheet without a reload.

Same persistence rules as `customClasses`: only affects rendering. Existing `char_subclass` values in the database stay even if your plugin is later disabled — the dropdown shows them as a `(custom)` fallback option.

### `sessionSectionHidden`

```js
registries.sessionSectionHidden.set(pluginId, new Set(['ai_integration', 'connected_players']))
```

Plugins can completely hide built-in collapsible sub-sections inside the Session tab. The host's `<CollapsibleSection id=… />` checks the union of every plugin's set and short-circuits to `null` if its id is in there — the section is removed from the layout, not just collapsed.

Built-in section ids:

- `'session_info'` — Session Info (name, code, join link)
- `'connected_players'` — Connected Players list
- `'dice_reference'` — Quick Dice Reference
- `'ai_integration'` — AI Integration settings

Plugins / Plugin Manager / Leave Session render outside the collapsible wrappers, so hiding sections never locks the DM out of plugin management. Use this together with `panelTabHidden` (whole-tab hide) for a tab-management plugin that gives the DM coarse + fine declutter controls.

### `playerMapOverride`

```js
registries.playerMapOverride.set(pluginId, (ctx) => mapId | null)
```

Player-side only. The host's `PlayerView` walks every entry on each registry-version bump and picks the first non-null `mapId` returned. When that's set, PlayerView fetches `/api/maps/<id>/state?session_id=<sid>` and renders the resulting slice (map image, walls, doors, lights, magical darkness, dm markers, tokens) instead of the session's current map. Real-time socket events for the override map are mirrored into the rendered snapshot; events for any other map fall through to the session-state buckets and stay out of the player's view.

`ctx` carries `{ sessionId, playerTokenId, defaultMapId }`. Returning `null` means "no override — render the session map" (which is what every player gets by default; the registry is empty until a plugin populates it).

Use this together with the `window.__tabletopForge.player` getters (player-side bridge) so the plugin knows whose override to apply:

```js
const myName = window.__tabletopForge?.player?.getName?.();
```

The bundled `split-the-party` plugin is the canonical user — it persists DM-set assignments in plugin KV and registers a getter that returns the current player's mapId.

**Server endpoint pairing:** `GET /api/maps/:id/state?session_id=<sid>` returns the full per-map slice `{ map, walls, doors, lights, magicalDarkness, dmMarkers, tokens, spawnPoint }` for a map belonging to the named session. Plugins driving overrides don't usually call this directly — PlayerView fetches it whenever the override changes — but it's available if you need it for previews / DM-side thumbnails.

### `panelTabExtensions`

```js
registries.panelTabExtensions.set(pluginId, {
  tabId: 'session',                 // built-in tab id to extend
  render: (ctx) => ReactNode,       // DOM React, not Konva
})
```

Plugins can append content inside the body of a specific built-in tab. The host renders the extension at the end of that tab's content, just before any host-defined trailing UI (e.g. the **Leave Session** button on the Session tab).

`ctx` includes `{ sessionId, role, socket, setPanelTab }` — same fields plugins receive in `register({ context })`.

One extension per plugin per tab. If you need multiple chunks, return a Fragment.

> **Currently only the Session tab honours panelTabExtensions.** The other built-in tabs don't yet have the host-side render slot wired up — that's a one-line `<PluginPanelTabExtensions tabId="..." />` insertion per tab in `DMView.jsx`. If you need to extend a different tab, open an issue or PR.

#### Session tab layout — collapsible sections

As of v1.4.3 the host's built-in Session tab sections (**Session Info**, **Connected Players**, **Quick Dice Reference**, **AI Integration**) are wrapped in collapsible panels. Each has a `▼/▶` chevron header and the open/closed state is persisted per-DM in `localStorage` under the `dndvtt_session_section_collapsed_v1` key, keyed by section id.

What this means for `panelTabExtensions` targeting `tabId: 'session'`:

- Your extension renders **as a sibling** of those collapsible panels, not inside one. Wrapping behaviour for host sections does not apply to your node — you control your own visibility/layout.
- If your plugin renders a long form, consider mirroring the host's pattern (a clickable gold header with a chevron, body hidden when closed) so the Session tab keeps a consistent feel. The host helper is not exported, but a 20-line `useState` + `localStorage` shim is enough; pick a unique storage key (e.g. `myplugin_section_collapsed`) so you don't collide with the host's `dndvtt_session_section_collapsed_v1`.
- Don't try to slot your UI inside one of the host's collapsible panels — there's no API for that. Render at the top level and the host will place you correctly.

### `mapClickHandlers`

```js
registries.mapClickHandlers.set(pluginId, {
  handler: ({ x, y, tool, isPlayer }) => boolean,
  role: 'dm',   // optional; omit to run for both
})
```

Called on map left-click. `x` and `y` are in map-pixel coordinates; `tool` is the currently active toolbar tool id. Return `true` to **consume** the click (the host skips its built-in tool handling for this click); return `false` to let it through. Plugin click handlers run in registration order before any built-in tool code, so a buggy handler can swallow normal interactions — only return `true` when you actually meant to.

`role` lets you scope the handler to one side (`'dm'` or `'player'`). With no role it runs for both.

This is the standard way to implement "click to place" UX. Toggle a flag in your plugin state, register the handler when in placement mode, return `true` when consuming the click, and unset the flag (or unregister the handler) when done.

> **Keep the handler synchronous.** Returning a `Promise` (e.g. by marking the function `async`) will *always* consume the click, because the host evaluates the returned value with `if (entry.handler(...))` and a Promise is truthy. Update your local cache and call `notifyChange()` synchronously, then fire-and-forget the `data.write` / `data.delete` — auto-broadcast still happens after the request lands.

---

## 6. The data API and event bus

Your plugin gets two complementary mechanisms for state.

### `data` — persistent KV store

```js
await context.data.write(key, value);     // any JSON-serialisable value
const v = await context.data.read(key);   // returns the stored value or null
const rows = await context.data.readPrefix(prefix);  // [{ key, value }, ...]
await context.data.delete(key);
```

- Scoped to your `pluginId` — your keys never collide with another plugin's.
- Survives plugin disable, plugin delete, and backend restarts.
- Re-installing your plugin restores the data exactly as it was.
- `write` and `delete` **automatically broadcast** a `plugin_event` of type `'data'` to every client in the session — **including the sender**. Your own `subscribe` handler will fire for your own writes. The simplest pattern is to make your handler idempotent (just re-apply the same value) so this round-trip is harmless. Don't try to update local state only on inbound events and skip the local update — your UI will lag a server round-trip behind the user's interaction.

> **Per-session vs global keys.** The KV store is scoped to your plugin id, not to the active session. If two campaigns are running on the same backend they share the same `plugin_data` rows. For state that should be per-session (weather, scene flags, anything tied to one game), include `context.sessionId` in your key — e.g. `current_${sessionId}` or `tag_${sessionId}_${tokenId}`. The bundled examples avoid this issue by accident: they key on template/token ids which are session-unique already.

### `subscribe` and `emitEvent` — cross-client coordination

```js
const off = context.subscribe(({ type, payload }) => {
  // handle inbound events for this plugin from any client (including yourself)
});

context.emitEvent('my-event-type', { ... });   // broadcast to everyone in the session
```

Use this for state that doesn't fit the KV model — transient signals like "shake the screen", "play a sound", "flash this token's outline".

> **Subscriptions are scoped per-plugin.** The relay routes events by `pluginId`, so your `subscribe` handler will only ever see events emitted by your own plugin (across any client). Other plugins' `data` events and custom events are invisible to you and vice-versa. You don't need to namespace-prefix your event types like `'my-plugin:fire'` — `'fire'` is fine, it can never collide with another plugin's `'fire'`.

Auto-broadcast `data` events have this shape, so a single subscribe handler can react to both KV writes and your own events:

```js
{ type: 'data', payload: { op: 'write' | 'delete', key, value } }
```

`subscribe` returns an unsubscribe function. The host also clears all your event subscriptions automatically on plugin unload — you only need the return value if you want to remove a handler mid-session.

### Pattern: keeping a local cache in sync

Most plugins want a local in-memory cache mirroring their KV store, plus a way to react to changes from other clients:

```js
const cache = new Map();

export default {
  register({ React, ReactKonva, registries, context }) {
    // Hydrate from server on load.
    context.data.readPrefix('thing_').then(rows => {
      for (const r of rows) cache.set(r.key, r.value);
      context.notifyChange();
    });

    // Keep the cache in sync with edits made on other clients.
    context.subscribe(({ type, payload }) => {
      if (type !== 'data' || !payload?.key?.startsWith('thing_')) return;
      if (payload.op === 'write')  cache.set(payload.key, payload.value);
      if (payload.op === 'delete') cache.delete(payload.key);
      context.notifyChange();
    });

    // Local writer used by your UI:
    async function setThing(key, value) {
      cache.set(key, value);
      context.notifyChange();
      await context.data.write(key, value);   // auto-broadcasts to others
    }
    // ... wire setThing into your registries
  },
};
```

This is the canonical pattern that lets a DM-side change appear on every player's view without anyone polling.

---

## 7. Triggering re-renders — `notifyChange`

The host components that call your registry contributions only re-render when **registry version** bumps. This avoids re-rendering every map frame — but it also means your plugin's internal state changes are invisible until you tell the host.

Call `context.notifyChange()` after any state change that should be reflected immediately:

- After your initial KV cache hydrate completes.
- After `subscribe` fires and you mutate your cache.
- After your own UI writes new values locally (do this **before** the awaited `data.write` for snappy UX).

Forgetting `notifyChange` is the single most common bug in plugins. Symptoms: "it works after a refresh but not live."

If your plugin stores per-template tagging in `templateOverlays`, also call `notifyChange` so MapStage re-derives its synthetic zone list.

### What `notifyChange` actually re-renders

A single call re-renders every host component that consumes a registry, in one pass:

- All `spellTemplateDecorators` outputs on the map.
- The template-edit popup's plugin-extension area, if open.
- The currently-active `dmTabs` content.
- All `mapDecorations` outputs.
- The `templateOverlays` consumer (the host's water-canvas effect re-derives its synthetic zones).

That's almost always what you want. If you specifically need finer-grained re-render control — e.g. updating a piece of your DM tab without redrawing the map — keep a private subscriber set inside your plugin module and only fire that one:

```js
const tabSubs = new Set();
function pingTab() { for (const fn of tabSubs) fn(); }

function MyTab() {
  const [, force] = React.useState(0);
  React.useEffect(() => {
    const fn = () => force(x => x + 1);
    tabSubs.add(fn);
    return () => tabSubs.delete(fn);
  }, []);
  // ...
}
```

This is a pure performance optimisation; reaching for it before you measure a problem is overkill.

---

## 8. Patterns and pitfalls

### Use additive blending for glow / particle effects

Konva supports `globalCompositeOperation: 'lighter'` per node, plus radial-gradient fills via `fillRadialGradientStartPoint`, `fillRadialGradientEndPoint`, `fillRadialGradientColorStops`. Combining the two lets you build flame, fog, and aura effects that look like a continuous body instead of stacked discs.

### Animate via `requestAnimationFrame` inside React components

Wrap animated content in a small component the plugin defines:

```js
function MyAnim({ template, baseProps }) {
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => {
    let raf;
    const start = performance.now();
    const loop = (now) => {
      // ~30fps is plenty for ambient effects and halves the CPU.
      if (now - start > 33) setTick(t => (t + 1) | 0);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  // ... derive positions/alphas from `performance.now()`
}
```

The cleanup return is mandatory — your component unmounts when the plugin is disabled, and a leaked RAF loop will keep firing setState on an unmounted component.

### Pattern: transient one-shot effects (damage numbers, explosions, etc.)

For event-fired finite-duration effects — a damage pop-up that floats up and fades, an explosion at a hit location, a brief screen shake — the canonical shape is:

```js
let active = [];                            // [{ id, /* whatever */, spawnTime }]
const DUR = 2400;                           // ms

context.subscribe(({ type, payload }) => {
  if (type !== 'pop') return;
  const id = payload.popId || `${performance.now()}-${Math.random()}`;
  active = [...active, { id, ...payload, spawnTime: performance.now() }];
  context.notifyChange();                   // map re-renders, picks up new entry
  setTimeout(() => {
    active = active.filter((p) => p.id !== id);
    context.notifyChange();                 // map re-renders, drops the entry
  }, DUR + 250);                            // grace period so the final frame paints
});

registries.mapDecorations.set(pluginId, (ctx) =>
  React.createElement(Group, { listening: false },
    active.map((p) => React.createElement(Effect, { key: p.id, item: p, ctx })))
);
```

Each `<Effect>` runs its own RAF loop (per the pattern above) and reads `performance.now() - item.spawnTime` to derive its phase. `key={p.id}` so React mounts a fresh component per entry — when `setTimeout` purges the entry, the component unmounts, its `useEffect` cleanup cancels the RAF, no leaks. The DM-side trigger emits `context.emitEvent('pop', { tokenId, value, ... })` — every client (including the sender) sees the event and renders the effect, so you don't need separate "show locally" logic.

### Mode-switch animation pattern

If your effect has multiple distinct modes (rain / snow / fog, fire / ice / etc.) and you want a clean RAF restart when the user switches modes, set `key={mode}` on the animated component:

```js
React.createElement(Weather, { key: state.kind, kind: state.kind, ... })
```

A different `key` makes React unmount the prior instance and mount a fresh one — your `useEffect` cleanup runs, the old RAF cancels, and the new instance starts its own clock. Without the key you'd be re-using the same component across modes and any internal state (start times, accumulated phase) carries over awkwardly.

### Always set `listening: false` on Konva nodes inside `mapDecorations`

The `mapDecorations` Layer is itself non-listening, so this is belt-and-braces, but it documents intent and protects you if the Layer policy ever changes.

### Don't write your own React import

```js
// WRONG — your plugin will crash with "invalid hook call":
import React from 'react';

// RIGHT — use the host's React passed into register:
register({ React, ... }) {
  function MyComponent() {
    const [v, setV] = React.useState(0);
    // ...
  }
}
```

If you want JSX, use `React.createElement(...)` — Vite isn't compiling your plugin code, so your `client.js` is shipped as-is to the browser.

### Listening to template lifecycle

If your plugin attaches state to spell templates (like the bundled `elemental-templates`), templates can be deleted by the DM at any time — but `data.delete` for the template's key won't be auto-fired by the host. Either:

- Subscribe to the host's broadcast for template deletion (currently not exposed via the plugin API; track template ids you've seen and prune).
- Live with stale KV entries (cheap — they take effect again if the template id is ever reused, which never happens because ids are UUIDs).

The bundled elemental-templates plugin takes the latter approach.

### One module instance per browser tab

Your `client.js` is loaded once per tab. Module-level state (`const cache = new Map()`) is shared across every `register()` call in that tab but **not** between tabs. Two browser windows = two cache instances. Use the event bus (§6) for cross-client coordination.

### Disabling a plugin live

When the DM toggles your plugin off, the host calls `unregister`, strips your registry entries, drops your event subscriptions, and bumps the registry version (forcing a re-render so your overlays vanish). Your KV data is left intact. Re-enabling re-imports your module and re-runs `register` — make sure `register` is idempotent.

---

## 9. Worked example — minimal animated decorator

A complete plugin that adds a slowly-pulsing yellow ring around every Large+ token visible to both DM and players. Two files:

`plugin.json`:
```json
{
  "id": "big-token-glow",
  "name": "Big Token Glow",
  "version": "1.0.0",
  "description": "Pulsing yellow ring around every Large or larger token.",
  "author": "Example",
  "frontend_entry": "client.js"
}
```

`client.js`:
```js
const PLUGIN_ID = 'big-token-glow';

export default {
  register({ React, ReactKonva, registries }) {
    const { Group, Circle } = ReactKonva;

    function GlowRing({ token, gridSize, offsetX, offsetY }) {
      const [tick, setTick] = React.useState(0);
      React.useEffect(() => {
        let raf;
        const loop = () => { setTick(t => (t + 1) | 0); raf = requestAnimationFrame(loop); };
        raf = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(raf);
      }, []);
      const sizeMap = { large: 2, huge: 3, gargantuan: 4 };
      const span = sizeMap[token.size] || 1;
      if (span < 2) return null;
      const cx = offsetX + (Number(token.grid_col) + span / 2) * gridSize;
      const cy = offsetY + (Number(token.grid_row) + span / 2) * gridSize;
      const r  = span * gridSize * 0.6;
      const t  = performance.now() / 1000;
      const pulse = 0.5 + 0.3 * Math.sin(t * 2);
      return React.createElement(Circle, {
        x: cx, y: cy, radius: r,
        stroke: 'rgba(250,204,21,0.9)', strokeWidth: 2,
        opacity: pulse, listening: false,
      });
    }

    registries.mapDecorations.set(PLUGIN_ID, (ctx) =>
      React.createElement(
        ReactKonva.Group,
        { listening: false },
        ctx.tokens
          .filter(t => !t.is_hidden)
          .map(t => React.createElement(GlowRing, { key: t.id, token: t, ...ctx }))
      )
    );
  },
};
```

That's it. Drop those two files in `backend/plugins/big-token-glow/`, restart the backend (or upload as a zip via the manager), enable in the Plugins UI. The DM and every player immediately see a pulsing ring around every Large+ token.
