// Player View Preview — DM-only plugin that lets the DM see exactly
// what a specific player sees on the map, fog-of-war and hidden-token
// filters included.
//
// How the preview works
// ─────────────────────
//   Rather than re-implement the player render inside the DM panel
//   (which would duplicate FoW visibility math, plugin overlays, the
//   character sheet, every socket subscription, etc.), the plugin
//   mounts a full-screen iframe pointed at the host's existing
//   `/play?code=…&name=…&creatureId=…` URL. That route IS the player
//   view, so the preview is bit-for-bit accurate by construction.
//   The CharacterSetup screen the host now ships with treats `?name=`
//   as a legacy deep-link and skips the setup form, so the preview
//   loads straight into the live map.
//
// Caveat — the duplicate-user effect
// ──────────────────────────────────
//   The iframe's socket joins as a regular player, so if the real
//   player is currently online they'll briefly see two of themselves
//   in the Connected Players list. The plugin appends a `(preview)`
//   suffix to the iframe's `name` so the duplicate is recognisable
//   and the host's `create_player_token` reuses the same token bound
//   to that name (we'd need a server-side change to truly avoid the
//   second connection — out of scope for a static-asset plugin).
//
// What "Switch back" does
// ───────────────────────
//   Just removes the overlay from the DOM. The iframe's React tree
//   tears down, its socket disconnects, and the DM panel becomes
//   interactive again. No state in the host view was modified.

const PLUGIN_ID = 'player-preview';
const STYLE_TAG_ID = 'plugin-player-preview-style';
const OVERLAY_ID = 'plugin-player-preview-overlay';

const CSS = `
#${OVERLAY_ID} {
  position: fixed; inset: 0; z-index: 99998;
  background: #0a0a14;
  display: flex; flex-direction: column;
}
#${OVERLAY_ID} .ppv-bar {
  flex: 0 0 auto;
  display: flex; align-items: center; gap: 12px;
  background: linear-gradient(180deg, #1a1a2e, #14141f);
  border-bottom: 1px solid #c9a84c;
  padding: 8px 14px;
  font-family: "Cinzel", Georgia, serif;
  color: #f4e4bc;
  box-shadow: 0 4px 14px rgba(0,0,0,0.5);
}
#${OVERLAY_ID} .ppv-bar-title {
  font-size: 14px; font-weight: 700; letter-spacing: 0.04em;
}
#${OVERLAY_ID} .ppv-bar-sub {
  font-size: 11px; color: #d4c69c; opacity: 0.85;
  font-family: ui-monospace, monospace;
}
#${OVERLAY_ID} .ppv-spacer { flex: 1; }
#${OVERLAY_ID} .ppv-btn {
  background: #c9a84c; color: #1a1a2e;
  border: none; border-radius: 8px;
  padding: 6px 14px; cursor: pointer;
  font-weight: 700; font-size: 13px;
  font-family: "Cinzel", Georgia, serif;
}
#${OVERLAY_ID} .ppv-btn:hover { background: #e0bb5a; }
#${OVERLAY_ID} .ppv-btn-ghost {
  background: transparent; color: #d4c69c;
  border: 1px solid rgba(201,168,76,0.4);
}
#${OVERLAY_ID} .ppv-btn-ghost:hover { background: rgba(201,168,76,0.12); }
#${OVERLAY_ID} iframe {
  flex: 1 1 auto;
  width: 100%; height: 100%;
  border: 0;
  background: #0a0a14;
}
`;

let lastCtx = null;
let overlayEl = null;
let savedSocket = null;

const tabSubs = new Set();
function pingTab() { for (const fn of tabSubs) try { fn(); } catch {} }

function ensureStyleTag() {
  if (document.getElementById(STYLE_TAG_ID)) return;
  const tag = document.createElement('style');
  tag.id = STYLE_TAG_ID;
  tag.textContent = CSS;
  document.head.appendChild(tag);
}

function tearDownOverlay() {
  if (overlayEl && overlayEl.parentNode) overlayEl.parentNode.removeChild(overlayEl);
  overlayEl = null;
}

function buildPlayerUrl(token) {
  // Read the current session code from the DM's URL — the only
  // bit of "host state" a plugin can lift without a context API.
  const code = new URL(window.location.href).searchParams.get('code') || '';
  // `previewTokenId` is the key knob — PlayerView treats it as
  // observe-only mode: skip the create_player_token emit and bind
  // playerTokenId directly to this id, so MapStage's FoW / vision
  // math runs from the existing token without ever spawning a
  // duplicate. The host added this in the same release as this
  // plugin's first version, so a stale host won't recognise it —
  // older deploys would fall back to spawning a "(preview)" token.
  const baseName = token.nickname || token.player_name || token.name || 'Player';
  const params = new URLSearchParams({
    code,
    previewTokenId: String(token.id),
    name: `${baseName} (preview)`,
  });
  return `/play?${params.toString()}`;
}

function openPreview(token) {
  ensureStyleTag();
  tearDownOverlay();

  const root = document.createElement('div');
  root.id = OVERLAY_ID;

  const bar = document.createElement('div');
  bar.className = 'ppv-bar';

  const title = document.createElement('div');
  title.className = 'ppv-bar-title';
  title.textContent = `Player Preview — ${token.nickname || token.player_name || token.name}`;
  bar.appendChild(title);

  const sub = document.createElement('div');
  sub.className = 'ppv-bar-sub';
  sub.textContent = `${token.size || 'medium'} · HP ${token.current_hp ?? '?'}/${token.max_hp ?? '?'}`;
  bar.appendChild(sub);

  const spacer = document.createElement('div');
  spacer.className = 'ppv-spacer';
  bar.appendChild(spacer);

  // Reload the iframe — useful if the player just moved or HP changed
  // and you want a fresh snapshot.
  const reloadBtn = document.createElement('button');
  reloadBtn.className = 'ppv-btn ppv-btn-ghost';
  reloadBtn.textContent = '↻ Reload';
  reloadBtn.addEventListener('click', () => {
    const ifr = root.querySelector('iframe');
    if (ifr) ifr.src = ifr.src;
  });
  bar.appendChild(reloadBtn);

  // Switch back to the DM view — just removes the overlay; the iframe
  // unmounts, its socket disconnects, the DM panel underneath was
  // never touched so nothing else needs to re-hydrate.
  const backBtn = document.createElement('button');
  backBtn.className = 'ppv-btn';
  backBtn.textContent = '← Back to DM view';
  backBtn.addEventListener('click', tearDownOverlay);
  bar.appendChild(backBtn);

  const iframe = document.createElement('iframe');
  iframe.src = buildPlayerUrl(token);
  iframe.title = `Player Preview — ${token.nickname || token.player_name || token.name}`;
  iframe.allow = 'autoplay';

  root.appendChild(bar);
  root.appendChild(iframe);
  document.body.appendChild(root);
  overlayEl = root;

  // Escape key closes the preview — matches how every other modal in
  // the host behaves. Listener is one-shot per overlay so we don't
  // leak handlers across previews.
  function onKey(e) {
    if (e.key === 'Escape') {
      window.removeEventListener('keydown', onKey);
      tearDownOverlay();
    }
  }
  window.addEventListener('keydown', onKey);
}

export default {
  register({ React, ReactKonva, registries, context }) {
    const { role, socket } = context;
    savedSocket = socket;

    // Hook into mapDecorations purely to receive the latest tokens
    // list — we render nothing on the canvas. Group with no children
    // is the cheapest "valid Konva node that displays nothing".
    registries.mapDecorations.set(PLUGIN_ID, (ctx) => {
      lastCtx = ctx;
      return React.createElement(ReactKonva.Group, { listening: false });
    });

    if (role !== 'dm') return;

    function PreviewTab() {
      const [, force] = React.useState(0);
      React.useEffect(() => {
        const fn = () => force((x) => (x + 1) | 0);
        tabSubs.add(fn);
        return () => tabSubs.delete(fn);
      }, []);
      // Re-render every second so newly-arriving players show up
      // without needing to leave + return to the tab.
      React.useEffect(() => {
        const id = setInterval(() => force((x) => (x + 1) | 0), 1000);
        return () => clearInterval(id);
      }, []);

      const playerTokens = (lastCtx?.tokens || []).filter((t) => t.is_player && !t.is_hidden);

      return React.createElement('div',
        { className: 'p-4 space-y-3' },
        React.createElement('h3', { className: 'text-sm font-semibold text-dnd-gold mb-1' }, 'Player View Preview'),
        React.createElement('p', { className: 'text-xs text-gray-400 leading-snug' },
          'See exactly what a specific player sees — fog of war, hidden tokens, light radius, plugin overlays. The preview opens fullscreen; the "Back to DM view" button (or Escape) closes it.'),
        React.createElement('p', { className: 'text-[11px] text-gray-500 leading-snug' },
          'Heads up: the preview connects as a separate player socket. If the real player is online, they\'ll briefly see "(preview)" appear in the Connected Players list while the overlay is open.'),

        playerTokens.length === 0
          ? React.createElement('div', { className: 'text-xs text-gray-500 italic bg-gray-800 border border-gray-700 rounded-lg p-3 text-center' },
              'No player tokens on the current map.')
          : React.createElement('div', { className: 'space-y-1.5' },
              playerTokens.map((t) => React.createElement('div',
                { key: t.id, className: 'bg-gray-800 border border-gray-700 rounded-lg p-2 flex items-center gap-2' },
                React.createElement('div', { className: 'flex-1 min-w-0' },
                  React.createElement('div', { className: 'text-sm text-white font-semibold truncate' },
                    t.nickname || t.player_name || t.name),
                  React.createElement('div', { className: 'text-[11px] text-gray-400 truncate' },
                    `${t.size || 'medium'} · HP ${t.current_hp ?? '?'}/${t.max_hp ?? '?'}` +
                    (t.player_name && t.player_name !== (t.nickname || t.name) ? ` · player ${t.player_name}` : ''))),
                React.createElement('button', {
                  onClick: () => openPreview(t),
                  className: 'text-[11px] bg-dnd-gold hover:bg-yellow-500 text-gray-900 px-3 py-1 rounded font-semibold shrink-0',
                }, 'Preview')))),

        React.createElement('div',
          { className: 'text-[11px] text-gray-500 leading-snug bg-gray-800/50 border border-gray-700 rounded-lg p-2 mt-2' },
          'Tip: while the preview is open, switch to your other browser tab / window for the actual DM controls — moves you make there reflect live in the preview iframe via the same socket events the real player gets.')
      );
    }

    registries.dmTabs.set(PLUGIN_ID, {
      label: '👁 Preview',
      render: () => React.createElement(PreviewTab, null),
    });
  },

  // Tear down the overlay if the DM disables the plugin while a
  // preview is open — otherwise the iframe sticks around as a
  // headless fullscreen layer covering the actual DM view.
  unregister() {
    tearDownOverlay();
    const tag = document.getElementById(STYLE_TAG_ID);
    if (tag) tag.remove();
    savedSocket = null;
    lastCtx = null;
  },
};
