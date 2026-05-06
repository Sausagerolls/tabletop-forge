// Theme Customizer — runtime override of the host's accent colour,
// panel/background tones, and UI font family.
//
// What it does
// ────────────
//   * Adds a "Theme" GM tab. The GM tweaks colours / fonts / wallpaper;
//     changes are live for the GM and every player in the session.
//   * Persists the theme under `theme_<sessionId>` so every campaign on
//     one backend gets its own palette.
//   * Loads on both GM and player views (the plugin runs on both); the
//     player view never shows the tab, but it still applies whatever
//     theme the GM has picked.
//
// How the override works
// ──────────────────────
//   The host bakes its colours into Tailwind utility classes at build
//   time, e.g. `.bg-dnd-gold { background-color: #c9a84c }`. We inject
//   a single `<style>` element AFTER the page's stylesheet so its
//   rules win by load order — it remaps every dnd-gold / dnd-panel /
//   dnd-dark utility to a CSS variable, then sets the variables to
//   whatever the GM picked. Resetting to defaults removes the tag, so
//   the plugin never permanently mutates the host's CSS.

const PLUGIN_ID = 'theme-customizer';
const STYLE_TAG_ID = 'plugin-theme-customizer-style';

// Built-in font stacks. Keys map to CSS-side --theme-font value; the
// font-family fallback chain handles browsers that don't have the
// primary font installed (we don't ship webfonts — relying on what
// the host already loads or the OS provides).
const FONT_PRESETS = {
  default: { label: 'Default (Crimson Pro)', stack: '"Crimson Pro", Georgia, serif' },
  cinzel:  { label: 'Cinzel (fantasy serif)', stack: '"Cinzel", "Palatino Linotype", Georgia, serif' },
  modern:  { label: 'System sans',            stack: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' },
  mono:    { label: 'Monospace',              stack: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' },
  uncial:  { label: 'Cursive (Papyrus-like)', stack: 'Papyrus, "Luminari", cursive' },
};

// Background presets. Colours are deliberately several stops away
// from the host default (#111827 / #1a1a2e) so the change is visible
// at a glance — earlier iterations were close enough to the defaults
// that GMs thought the picker was broken.
const BG_PRESETS = {
  classic:  { label: 'Classic dark',    kind: 'solid',   color: '#1a1a2e' },
  obsidian: { label: 'Obsidian',        kind: 'solid',   color: '#05050a' },
  slate:    { label: 'Slate blue',      kind: 'solid',   color: '#1e293b' },
  forest:   { label: 'Forest gradient', kind: 'image',   image: 'linear-gradient(135deg,#0a3320 0%,#143d2e 50%,#1f4d3a 100%)' },
  ember:    { label: 'Ember gradient',  kind: 'image',   image: 'linear-gradient(135deg,#3d0e08 0%,#5c1a0d 55%,#2a0a05 100%)' },
  parchment:{ label: 'Old parchment',   kind: 'image',   image: 'radial-gradient(ellipse at top,#5a4520 0%,#3a2810 55%,#1a0f05 100%)' },
  nebula:   { label: 'Nebula',          kind: 'image',   image: 'linear-gradient(135deg,#1a0d3d 0%,#3a1a6b 50%,#0d1a4d 100%)' },
  ocean:    { label: 'Deep ocean',      kind: 'image',   image: 'linear-gradient(180deg,#0a2030 0%,#0d3550 60%,#062028 100%)' },
  cinnabar: { label: 'Cinnabar dusk',   kind: 'image',   image: 'linear-gradient(135deg,#4a1f1a 0%,#7a2a1f 50%,#2a0d08 100%)' },
};

// Default theme — matches the host's baseline so an empty save is a
// no-op visually.
const DEFAULTS = {
  accent: '#c9a84c',     // dnd-gold
  panel:  '#16213e',     // dnd-panel
  dark:   '#1a1a2e',     // dnd-dark
  text:   '#f4e4bc',     // parchment
  font:   'default',
  bg:     'classic',
};

// Module-level state. Holds the currently-applied theme. Both views
// import the same module per tab, so this is shared between any
// register() re-runs in the same browser tab.
let theme = { ...DEFAULTS };

// Local notify pump — same finer-grained pattern documented in
// PLUGINS.md §7.
const tabSubs = new Set();
function pingTab() { for (const fn of tabSubs) try { fn(); } catch {} }

// Build the CSS that overrides the host's compiled-in colour utilities.
// Specificity is identical to the original (single class), so order in
// the cascade decides — and we append last, so we win.
//
// Why so many selectors for the backdrop
// ──────────────────────────────────────
//   The host's outermost view wrappers use plain Tailwind utilities
//   like `bg-gray-900` and `bg-dnd-dark`. Setting `body { background }`
//   alone is invisible because those wrappers cover the whole
//   viewport. We have to override the wrapper utilities too. We
//   intentionally DON'T touch `bg-gray-800` — that's the panel /
//   card colour used dozens of places and overriding it would tint
//   every popup. Same for `bg-gray-900/90` (Tailwind's slash-alpha
//   syntax compiles to a different class so our `.bg-gray-900` rule
//   ignores it, which is what we want).
function buildCss(t) {
  const fontStack = (FONT_PRESETS[t.font] || FONT_PRESETS.default).stack;
  const bgPreset = BG_PRESETS[t.bg] || BG_PRESETS.classic;
  const isImage = bgPreset.kind === 'image';
  const bgValue = isImage ? bgPreset.image : bgPreset.color;
  // For solid colours, set background-color; for gradients, set
  // background (shorthand that includes the gradient) plus a fixed
  // attachment so the gradient doesn't scroll with the content.
  // !important needed on the wrapper override because some downstream
  // styles (e.g. modal overlays that use `bg-gray-900/40` via Tailwind)
  // share a base specificity with `.bg-gray-900` and could win the
  // cascade depending on stylesheet order.
  const bgRule = isImage
    ? `background: ${bgValue} fixed !important; background-size: cover !important;`
    : `background-color: ${bgValue} !important;`;
  // Body / html stay without !important — nothing else competes there.
  const bodyBgRule = isImage
    ? `background: ${bgValue} fixed; background-size: cover;`
    : `background-color: ${bgValue};`;
  return `
    :root {
      --theme-accent: ${t.accent};
      --theme-panel:  ${t.panel};
      --theme-dark:   ${t.dark};
      --theme-text:   ${t.text};
    }
    body, body * { font-family: ${fontStack}; }
    body, html { ${bodyBgRule} }
    /* Outer-view wrappers — match the host's two roots. */
    .bg-dnd-dark, .bg-gray-900 { ${bgRule} }
    .bg-dnd-gold     { background-color: var(--theme-accent) !important; }
    .text-dnd-gold   { color:            var(--theme-accent) !important; }
    .border-dnd-gold { border-color:     var(--theme-accent) !important; }
    .bg-dnd-panel    { background-color: var(--theme-panel)  !important; }
    .border-dnd-panel{ border-color:     var(--theme-panel)  !important; }
    .text-parchment  { color:            var(--theme-text)   !important; }
    /* Hover variants of the accent so buttons feel alive. */
    .hover\\:bg-yellow-500:hover { background-color: color-mix(in srgb, var(--theme-accent) 80%, white) !important; }
  `;
}

// Idempotent style-tag installer. Removes the tag if the theme matches
// defaults, so a "reset" really is a clean state.
function applyTheme(t) {
  theme = { ...DEFAULTS, ...t };
  const isDefault =
    theme.accent === DEFAULTS.accent &&
    theme.panel  === DEFAULTS.panel  &&
    theme.dark   === DEFAULTS.dark   &&
    theme.text   === DEFAULTS.text   &&
    theme.font   === DEFAULTS.font   &&
    theme.bg     === DEFAULTS.bg;
  let tag = document.getElementById(STYLE_TAG_ID);
  if (isDefault) {
    if (tag) tag.remove();
    return;
  }
  if (!tag) {
    tag = document.createElement('style');
    tag.id = STYLE_TAG_ID;
    document.head.appendChild(tag);
  }
  tag.textContent = buildCss(theme);
}

// Cleanup helper for unregister — strip every trace.
function removeStyleTag() {
  const tag = document.getElementById(STYLE_TAG_ID);
  if (tag) tag.remove();
}

export default {
  register({ React, registries, context }) {
    const { data, sessionId, role, subscribe } = context;
    const KEY = `theme_${sessionId != null ? sessionId : 'global'}`;

    // ── Hydrate from KV ─────────────────────────────────────────────
    data.read(KEY).then((row) => {
      if (row && typeof row === 'object') applyTheme(row);
      pingTab();
    }).catch(() => { /* network blip */ });

    // ── Cross-client sync ───────────────────────────────────────────
    subscribe(({ type, payload }) => {
      if (type !== 'data' || !payload || payload.key !== KEY) return;
      if (payload.op === 'delete') applyTheme(DEFAULTS);
      if (payload.op === 'write')  applyTheme(payload.value || DEFAULTS);
      pingTab();
    });

    // Player view loads the plugin to receive theme broadcasts but
    // doesn't need a tab — the GM is the only one who edits.
    if (role !== 'dm') return;

    function ThemeTab() {
      const [, force] = React.useState(0);
      React.useEffect(() => {
        const fn = () => force((x) => (x + 1) | 0);
        tabSubs.add(fn);
        return () => tabSubs.delete(fn);
      }, []);

      function set(field, value) {
        const next = { ...theme, [field]: value };
        applyTheme(next);
        pingTab();
        data.write(KEY, next);    // auto-broadcasts to players
      }
      function reset() {
        applyTheme(DEFAULTS);
        pingTab();
        data.write(KEY, DEFAULTS);
      }

      const colorRow = (label, field, hint) =>
        React.createElement('div', { className: 'flex items-center gap-2' },
          React.createElement('span', { className: 'flex-1 text-xs text-gray-300' }, label),
          React.createElement('input', {
            type: 'color',
            value: theme[field],
            onChange: (e) => set(field, e.target.value),
            className: 'w-10 h-7 rounded cursor-pointer bg-transparent border border-gray-700',
          }),
          React.createElement('input', {
            type: 'text',
            value: theme[field],
            onChange: (e) => /^#[0-9a-fA-F]{0,6}$/.test(e.target.value) && set(field, e.target.value),
            className: 'w-20 bg-gray-800 border border-gray-700 rounded px-1.5 py-0.5 text-[11px] text-white font-mono',
            title: hint || '',
          })
        );

      return React.createElement(
        'div',
        { className: 'p-4 space-y-4' },
        React.createElement('h3', { className: 'text-sm font-semibold text-dnd-gold mb-1' }, 'Theme Customizer'),
        React.createElement('p', { className: 'text-xs text-gray-400 leading-snug' },
          'Edit colours, fonts, and backdrop. Changes apply live to the GM and every player in the session.'),

        // ── Colours ──
        React.createElement('div', { className: 'space-y-2 bg-gray-800 border border-gray-700 rounded-lg p-3' },
          React.createElement('div', { className: 'text-[11px] uppercase tracking-wider text-gray-500 mb-1' }, 'Palette'),
          colorRow('Accent (gold)',     'accent', 'Used for headings, highlights, primary buttons.'),
          colorRow('Panel background',  'panel',  'Side-panel fill behind tab content.'),
          colorRow('Window background', 'dark',   'Outer frame / chrome around the panel.'),
          colorRow('Parchment text',    'text',   'Body text colour where the parchment palette is used.'),
        ),

        // ── Font ──
        React.createElement('div', { className: 'space-y-2 bg-gray-800 border border-gray-700 rounded-lg p-3' },
          React.createElement('div', { className: 'text-[11px] uppercase tracking-wider text-gray-500 mb-1' }, 'Font'),
          React.createElement('select', {
            value: theme.font,
            onChange: (e) => set('font', e.target.value),
            className: 'w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-sm text-white',
          }, Object.entries(FONT_PRESETS).map(([id, p]) =>
            React.createElement('option', { key: id, value: id }, p.label)))
        ),

        // ── Background ──
        React.createElement('div', { className: 'space-y-2 bg-gray-800 border border-gray-700 rounded-lg p-3' },
          React.createElement('div', { className: 'text-[11px] uppercase tracking-wider text-gray-500 mb-1' }, 'Backdrop'),
          React.createElement('select', {
            value: theme.bg,
            onChange: (e) => set('bg', e.target.value),
            className: 'w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-sm text-white',
          }, Object.entries(BG_PRESETS).map(([id, p]) =>
            React.createElement('option', { key: id, value: id }, p.label)))
        ),

        // ── Reset ──
        React.createElement('button', {
          onClick: reset,
          className: 'w-full bg-gray-700 hover:bg-gray-600 text-gray-200 py-1.5 rounded text-xs',
        }, 'Reset to defaults')
      );
    }

    registries.dmTabs.set(PLUGIN_ID, {
      label: '🎨 Theme',
      render: () => React.createElement(ThemeTab, null),
    });
  },

  // Strip the injected style tag when the GM disables the plugin so the
  // host's original colours come back without a refresh.
  unregister() {
    removeStyleTag();
    theme = { ...DEFAULTS };
  },
};
