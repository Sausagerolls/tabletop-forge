// Damage Pop-Ups — built from PLUGINS.md alone.
//
// What it does
// ────────────
//   DM enters a value + kind (Damage / Healing / Temp HP) in the
//   plugin's side-panel tab, hits Apply, then clicks a token on the
//   map. The plugin emits a custom `pop` event over the plugin event
//   bus; every client (DM and players) shows a colour-coded floating
//   number above that token that drifts up and fades out over ~2.4s.
//
// Why this plugin shape
// ─────────────────────
//   It exercises parts of the contract the bundled examples don't:
//     * a custom (non-`data`) event type via emitEvent + subscribe
//     * transient state with no persistence — popups live entirely in
//       memory and self-clean via setTimeout
//     * per-popup React components running their own RAF loops in
//       parallel, with proper cleanup on unmount
//     * token hit-testing from a click handler (not just placement)
//
// HP is actually applied
// ──────────────────────
//   Damage / healing / temp HP are committed to the token's HP via
//   the host's existing socket events (`update_token_hp` and
//   `update_token_temp_hp`) — those are gated DM-only by the host, so
//   the plugin only emits them in the DM-only click handler. Per 5e:
//     * Damage  — temp HP absorbs first, overflow drops current HP
//     * Healing — adds to current HP, capped at max HP
//     * Temp HP — replace if the new value is higher (no stacking)

const PLUGIN_ID = 'damage-popups';
const POP_DURATION_MS = 2400;
const POP_RISE_PX     = 70;     // distance the number floats upward

// Module-level state. Re-mounted across browser tabs but shared
// between every register() call within one tab (per docs §8 — one
// module instance per tab).
let popups = [];                 // [{ id, tokenId, value, kind, spawnTime }]
let pickingFor = null;           // { value, kind } when DM is in pick mode
let lastCtx = null;              // latest mapDecorations ctx — used for hit-test

// Local notify pump so the DM tab re-renders without re-rendering the
// whole map (per docs §7's optional fine-grained pattern).
const tabSubs = new Set();
function pingTab() { for (const fn of tabSubs) try { fn(); } catch {} }

// Per docs §5 Token shape — cell footprint per size string.
const SIZE_TO_CELLS = { tiny: 1, small: 1, medium: 1, large: 2, huge: 3, gargantuan: 4 };
function tokenCells(t) { return SIZE_TO_CELLS[t.size] || 1; }

// Returns the front-most token whose footprint contains (x, y), or null.
// Iterates last-to-first so visually-on-top tokens win when stacked
// (matches the implicit Konva paint order from earlier indices to later).
function tokenAt(x, y, ctx) {
  if (!ctx || !ctx.tokens) return null;
  for (let i = ctx.tokens.length - 1; i >= 0; i--) {
    const t = ctx.tokens[i];
    if (t.is_hidden && !ctx.isPlayer === false) continue; // never hit hidden
    const cells = tokenCells(t);
    const tx = ctx.offsetX + Number(t.grid_col) * ctx.gridSize;
    const ty = ctx.offsetY + Number(t.grid_row) * ctx.gridSize;
    const tw = cells * ctx.gridSize;
    const th = cells * ctx.gridSize;
    if (x >= tx && x < tx + tw && y >= ty && y < ty + th) return t;
  }
  return null;
}

const KIND_OPTIONS = [
  { id: 'damage',  label: 'Damage',  color: '#f87171', sign: '−' },
  { id: 'healing', label: 'Healing', color: '#4ade80', sign: '+' },
  { id: 'temp',    label: 'Temp HP', color: '#60a5fa', sign: '+' },
];
const KIND_BY_ID = Object.fromEntries(KIND_OPTIONS.map((k) => [k.id, k]));

export default {
  register({ React, ReactKonva, registries, context }) {
    const { Group, Rect, Text } = ReactKonva;
    const { notifyChange, subscribe, emitEvent, socket } = context;

    // Apply the 5e math + emit the host's HP-update socket events.
    // Returns the values actually written so the visual chip can use
    // the after-resolution number (e.g. damage clipped by temp HP).
    function applyHpChange(token, kind, value) {
      const cur  = Number(token.current_hp) || 0;
      const max  = Number(token.max_hp)     || 0;
      const temp = Number(token.temp_hp)    || 0;
      const v = Math.max(0, Math.floor(value || 0));
      let newHp = cur, newTemp = temp;
      if (kind === 'damage') {
        let remaining = v;
        if (temp > 0) {
          const absorbed = Math.min(temp, remaining);
          newTemp -= absorbed;
          remaining -= absorbed;
        }
        // 5e: HP can't go below 0 from damage (death saves handle the
        // rest). The host clamps anyway, but we mirror it locally so
        // the visual matches reality.
        newHp = Math.max(0, cur - remaining);
      } else if (kind === 'healing') {
        newHp = max > 0 ? Math.min(max, cur + v) : cur + v;
      } else if (kind === 'temp') {
        // Don't stack — take the higher value.
        newTemp = Math.max(temp, v);
      }
      // Only emit when something changed, so we don't spam the host
      // with no-op writes (and trigger redundant broadcasts).
      if (socket && newHp !== cur) {
        // Host event signature: { tokenId, currentHp } — NOT { hp }.
        socket.emit('update_token_hp', { tokenId: token.id, currentHp: newHp });
      }
      if (socket && newTemp !== temp) {
        socket.emit('update_token_temp_hp', { tokenId: token.id, tempHp: newTemp });
      }
      return { newHp, newTemp };
    }

    // ── Subscribe to inbound pop events from any client ──────────────
    // Custom event type 'pop' — distinct from the auto-broadcast 'data'
    // events, so other plugins' subscribe handlers won't see ours and
    // vice-versa (they're keyed by pluginId on the relay).
    if (typeof subscribe === 'function') {
      subscribe(({ type, payload }) => {
        if (type !== 'pop' || !payload) return;
        const id = payload.popId || `${performance.now()}-${Math.random()}`;
        popups = [...popups, {
          id,
          tokenId: payload.tokenId,
          value: Number(payload.value) || 0,
          kind: payload.kind || 'damage',
          spawnTime: performance.now(),
        }];
        notifyChange();
        // Self-purge after the animation finishes. Slight grace period
        // so the final frame renders before we yank the entry.
        setTimeout(() => {
          popups = popups.filter((p) => p.id !== id);
          notifyChange();
        }, POP_DURATION_MS + 250);
      });
    }

    // ── A single popup as its own React component ────────────────────
    // Each popup runs its own RAF loop so animations are independent
    // and the cleanup return cancels the RAF cleanly when the popup
    // is unmounted (either by setTimeout above or by plugin disable).
    function Popup({ popup, ctx }) {
      const [, force] = React.useState(0);
      React.useEffect(() => {
        let raf, last = 0;
        const tick = (now) => {
          if (now - last > 33) { force((x) => (x + 1) | 0); last = now; }
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
      }, []);
      const token = (ctx.tokens || []).find((t) => t.id === popup.tokenId);
      if (!token) return null;
      const elapsed = performance.now() - popup.spawnTime;
      if (elapsed > POP_DURATION_MS) return null;
      const phase = Math.max(0, Math.min(1, elapsed / POP_DURATION_MS));
      // Fast vertical lift early, then ease out. Opacity fades in last 40%.
      const yLift = -8 - POP_RISE_PX * (1 - Math.pow(1 - phase, 2));
      const opacity = phase < 0.6 ? 1 : 1 - (phase - 0.6) / 0.4;
      const cells = tokenCells(token);
      const cx = ctx.offsetX + (Number(token.grid_col) + cells / 2) * ctx.gridSize;
      const cy = ctx.offsetY + Number(token.grid_row) * ctx.gridSize;
      const kindDef = KIND_BY_ID[popup.kind] || KIND_BY_ID.damage;
      const text = `${kindDef.sign}${Math.abs(popup.value)}`;
      const FONT_SIZE = 32;
      const PAD_X = 14;
      const CHIP_H = 44;
      const approxW = Math.max(60, text.length * FONT_SIZE * 0.62 + PAD_X * 2);
      const x = cx - approxW / 2;
      const y = cy + yLift - CHIP_H;
      return React.createElement(
        Group,
        { x: 0, y: 0, opacity, listening: false },
        React.createElement(Rect, {
          x, y, width: approxW, height: CHIP_H,
          fill: 'rgba(0,0,0,0.78)',
          stroke: kindDef.color, strokeWidth: 2,
          cornerRadius: 8,
        }),
        React.createElement(Text, {
          x, y: y + 6,
          width: approxW,
          align: 'center',
          text,
          fill: kindDef.color,
          fontSize: FONT_SIZE,
          fontStyle: 'bold',
        })
      );
    }

    // ── mapDecorations: one Popup component per active popup ─────────
    registries.mapDecorations.set(PLUGIN_ID, (ctx) => {
      lastCtx = ctx;
      if (popups.length === 0) return null;
      return React.createElement(
        Group,
        { listening: false },
        popups.map((p) =>
          React.createElement(Popup, { key: p.id, popup: p, ctx })
        )
      );
    });

    // ── mapClickHandlers: pick a token while in pick mode (DM only) ──
    // Returns true to consume the click whenever the DM is mid-pick,
    // so the click doesn't fall through to whatever the active toolbar
    // tool happens to be. Empty-space clicks while picking just cancel.
    registries.mapClickHandlers.set(PLUGIN_ID, {
      role: 'dm',
      handler: ({ x, y }) => {
        if (!pickingFor || !lastCtx) return false;
        const target = tokenAt(x, y, lastCtx);
        if (!target) {
          // Clicked empty space — cancel the pending pop.
          pickingFor = null;
          pingTab();
          return true;
        }
        // Commit the HP change first, then announce the visual. Doing
        // it in this order means the chip always reflects what the
        // resolved HP actually became — e.g. a damage value that was
        // partially absorbed by temp HP still shows the rolled total,
        // because the chip is `value`, not `delta`.
        applyHpChange(target, pickingFor.kind, pickingFor.value);
        const popId = `pop-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`;
        // Custom event — every other plugin's subscribe handler will
        // ignore this because they filter on type. Our own subscribe
        // handler picks it up too (the relay echoes to the sender),
        // which is exactly what we want — no special-casing needed.
        emitEvent('pop', {
          popId,
          tokenId: target.id,
          value: pickingFor.value,
          kind: pickingFor.kind,
        });
        pickingFor = null;
        pingTab();
        return true;
      },
    });

    // ── DM tab UI ────────────────────────────────────────────────────
    function DamageTab() {
      const [value, setValue] = React.useState(10);
      const [kind, setKind]   = React.useState('damage');
      const [, setTick]       = React.useState(0);
      // Subscribe to local pings so the "Picking…" status flips off
      // when a click resolves (or cancels via empty-space click).
      React.useEffect(() => {
        const fn = () => setTick((x) => x + 1);
        tabSubs.add(fn);
        return () => tabSubs.delete(fn);
      }, []);

      function apply() {
        if (!Number.isFinite(value) || value <= 0) return;
        pickingFor = { value: Math.floor(value), kind };
        pingTab();
      }
      function cancel() {
        pickingFor = null;
        pingTab();
      }

      const inPickMode = pickingFor !== null;

      return React.createElement(
        'div',
        { className: 'p-4 space-y-3' },
        React.createElement(
          'div',
          null,
          React.createElement('h3', { className: 'text-sm font-semibold text-dnd-gold mb-1' }, 'Damage Pop-Ups'),
          React.createElement('p', { className: 'text-xs text-gray-400 mb-2 leading-snug' },
            "Announce damage, healing, or temp HP. A coloured number floats above the chosen token and fades; the token's HP is updated at the same time (5e rules: temp HP absorbs damage first, healing caps at max, temp HP doesn't stack).")
        ),
        // Value input
        React.createElement(
          'div',
          null,
          React.createElement('label', { className: 'block text-xs text-gray-400 mb-1' }, 'Value'),
          React.createElement('input', {
            type: 'number', min: 1, max: 999,
            value: value,
            disabled: inPickMode,
            onChange: (e) => setValue(parseInt(e.target.value, 10) || 0),
            className: 'w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-white disabled:opacity-50',
          })
        ),
        // Kind picker
        React.createElement(
          'div',
          { className: 'grid grid-cols-3 gap-1.5' },
          KIND_OPTIONS.map((opt) =>
            React.createElement('button', {
              key: opt.id,
              onClick: () => setKind(opt.id),
              disabled: inPickMode,
              className: kind === opt.id
                ? 'bg-dnd-gold text-gray-900 px-2 py-1.5 rounded text-xs font-semibold disabled:opacity-50'
                : 'bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-200 px-2 py-1.5 rounded text-xs disabled:opacity-50',
            }, opt.label)
          )
        ),
        // Action button — flips to Cancel when in pick mode
        inPickMode
          ? React.createElement(
              'div',
              { className: 'space-y-2' },
              React.createElement('div', { className: 'text-xs text-yellow-200 bg-yellow-900/30 border border-yellow-700/50 rounded px-2 py-1.5 leading-snug' },
                `Click a token on the map to apply ${pickingFor.kind === 'healing' ? '+' : pickingFor.kind === 'temp' ? '+' : '−'}${Math.abs(pickingFor.value)} ${KIND_BY_ID[pickingFor.kind]?.label || ''}. Click empty space to cancel.`),
              React.createElement('button', {
                onClick: cancel,
                className: 'w-full bg-red-700 hover:bg-red-600 text-white py-2 rounded text-sm font-semibold',
              }, 'Cancel')
            )
          : React.createElement('button', {
              onClick: apply,
              disabled: !Number.isFinite(value) || value <= 0,
              className: 'w-full bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white py-2 rounded text-sm font-semibold',
            }, `Apply ${KIND_BY_ID[kind]?.sign || ''}${Math.abs(value || 0)} ${KIND_BY_ID[kind]?.label || ''}`)
      );
    }

    registries.dmTabs.set(PLUGIN_ID, {
      label: '💥 Damage',
      render: () => React.createElement(DamageTab, null),
    });
  },
};
