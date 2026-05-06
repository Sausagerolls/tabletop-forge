// Weather Effects — built from PLUGINS.md alone.
//
// What it does
// ────────────
//   GM tab with four weather modes (Off / Rain / Snow / Fog), an
//   intensity slider, and a wind-angle slider. Animated effect renders
//   across the entire map for GM and players. Per-session — two
//   simultaneous sessions on the same backend get independent weather.
//
// How it stays in sync
// ────────────────────
//   Single KV key `current_<sessionId>` stores `{ kind, intensity,
//   windAngle }`. data.write auto-broadcasts every change to all
//   clients in the session, so the GM's slider drag shows up on every
//   player's map without anyone polling.

const PLUGIN_ID = 'weather-effects';

// Module-level state mirrors the KV row. Re-hydrated from the server
// on each register() and updated whenever a `data` plugin_event lands.
const DEFAULT_STATE = { kind: 'off', intensity: 0.5, windAngle: 200 };
let state = { ...DEFAULT_STATE };

// Local notify pump for the GM tab (the host's notifyChange re-renders
// every registry consumer including the active tab, but a private set
// keeps the tab fluid even when the map decorator is animating heavily).
const tabSubs = new Set();
function pingTab() { for (const fn of tabSubs) try { fn(); } catch {} }

// Helper — golden-ratio fractional part, used for stable but
// uncorrelated per-particle seeds.
function frac(n) { return n - Math.floor(n); }

// Wind angle convention: degrees clockwise from East.
//   0   = East   ( +x, 0)
//   90  = South  ( 0, +y)   ← canvas-y is down
//   180 = West   (-x, 0)
//   270 = North  ( 0,-y)
function windVector(deg) {
  const r = (deg * Math.PI) / 180;
  return { x: Math.cos(r), y: Math.sin(r) };
}

const KIND_OPTIONS = [
  { id: 'off',  label: 'Off',  icon: '☀️' },
  { id: 'rain', label: 'Rain', icon: '🌧️' },
  { id: 'snow', label: 'Snow', icon: '❄️' },
  { id: 'fog',  label: 'Fog',  icon: '🌫️' },
];

export default {
  register({ React, ReactKonva, registries, context }) {
    const { Group, Circle, Line, Rect } = ReactKonva;
    const { data, notifyChange, subscribe, sessionId } = context;

    // KV is per-plugin globally, not per-session — scope ourselves with
    // the session id so two parallel campaigns don't share weather.
    const STATE_KEY = sessionId != null ? `current_${sessionId}` : 'current';

    // ── Initial cache hydrate ────────────────────────────────────────
    data.read(STATE_KEY).then((row) => {
      if (row && typeof row === 'object') state = { ...DEFAULT_STATE, ...row };
      notifyChange();
      pingTab();
    }).catch(() => { /* network blip — leave defaults */ });

    // ── Cross-client sync ───────────────────────────────────────────
    // Every data.write/delete auto-broadcasts a `data` plugin_event to
    // every other client in the session. Mirror that here so a slider
    // drag on the GM side updates the player view without polling.
    if (typeof subscribe === 'function') {
      subscribe(({ type, payload }) => {
        if (type !== 'data' || !payload || payload.key !== STATE_KEY) return;
        if (payload.op === 'delete') state = { ...DEFAULT_STATE };
        else if (payload.op === 'write') state = { ...DEFAULT_STATE, ...(payload.value || {}) };
        notifyChange();
        pingTab();
      });
    }

    // ── Animated weather component (full map area) ───────────────────
    function Weather({ kind, intensity, windAngle, mapWidth, mapHeight }) {
      const [, force] = React.useState(0);
      React.useEffect(() => {
        if (kind === 'off') return;
        let raf, last = 0;
        const tick = (now) => {
          // ~30fps cap — plenty for ambient weather and halves the cost.
          if (now - last > 33) { force(x => (x + 1) | 0); last = now; }
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
      }, [kind]);

      if (kind === 'off' || !mapWidth || !mapHeight) return null;

      const t = performance.now() / 1000;
      const wind = windVector(windAngle);
      const nodes = [];

      if (kind === 'rain') {
        // Each drop covers the full map height per cycle. Wind tilts the
        // drop's path; tilt magnitude is "how far horizontally the drop
        // moves while it falls one map-height" — the tail vector is the
        // same direction so streaks visually align with the motion.
        const dropCount = Math.floor(80 + intensity * 220);
        const cycleDur = 1.4 - intensity * 0.35;          // heavy = faster
        const tiltX = wind.x * 0.45;                       // x/y motion ratio
        const totalY = mapHeight + 80;
        const totalX = totalY * tiltX;
        const spawnSpan = mapWidth + Math.abs(totalX) + 100;
        for (let i = 0; i < dropCount; i++) {
          const seed = frac(i * 0.61803398);
          const phase = frac(t / cycleDur + seed);
          const xSlot = frac(i * 0.137 + 0.21);
          const startX = -Math.max(0, totalX) - 50 + xSlot * spawnSpan;
          const startY = -40;
          const px = startX + totalX * phase;
          const py = startY + totalY * phase;
          const tailLen = 14 + intensity * 12;
          const dirMag = Math.hypot(totalX, totalY) || 1;
          const tx = px - (totalX / dirMag) * tailLen;
          const ty = py - (totalY / dirMag) * tailLen;
          nodes.push(React.createElement(Line, {
            key: `r-${i}`,
            points: [px, py, tx, ty],
            stroke: 'rgba(160,200,240,0.55)',
            strokeWidth: 1,
            listening: false,
          }));
        }

      } else if (kind === 'snow') {
        // Slow drifting flakes — full map height per cycle, but the
        // cycle is much longer than rain, plus a per-flake sinusoidal
        // sway gives them lazy weight.
        const flakeCount = Math.floor(60 + intensity * 160);
        const cycleDur = 14 - intensity * 5;               // heavy = faster
        const tiltX = wind.x * 0.6;
        const totalY = mapHeight + 40;
        const totalX = totalY * tiltX;
        const spawnSpan = mapWidth + Math.abs(totalX) + 60;
        for (let i = 0; i < flakeCount; i++) {
          const seed = frac(i * 0.61803398);
          const phase = frac(t / cycleDur + seed);
          const xSlot = frac(i * 0.137 + 0.31);
          const startX = -Math.max(0, totalX) - 30 + xSlot * spawnSpan;
          const startY = -20;
          const sway = Math.sin(t * 0.5 + i * 1.7) * 22;
          const px = startX + totalX * phase + sway;
          const py = startY + totalY * phase;
          const r = 1.4 + (i % 4) * 0.45;
          nodes.push(React.createElement(Circle, {
            key: `s-${i}`,
            x: px, y: py, radius: r,
            fill: 'rgba(255,255,255,0.85)',
            listening: false,
          }));
        }

      } else if (kind === 'fog') {
        // A handful of large, soft, overlapping radial-gradient blobs.
        // For fog, the entire motion follows the wind direction (no
        // gravity). Each blob crosses the map's bounding box per cycle,
        // re-spawning on the upwind side once it leaves the downwind side.
        const blobCount = Math.floor(8 + intensity * 16);
        const cycleDur = 32 - intensity * 12;              // 20-32s drift
        // Default to a slow eastward drift if wind is exactly zero so the
        // sky never looks frozen.
        let dirX = wind.x, dirY = wind.y;
        if (Math.abs(dirX) < 0.01 && Math.abs(dirY) < 0.01) { dirX = 1; dirY = 0; }
        const dirLen = Math.hypot(dirX, dirY) || 1;
        dirX /= dirLen; dirY /= dirLen;
        // Total displacement spans the diagonal of the map plus margin so
        // a blob that enters from one side fully exits the other.
        const span = Math.hypot(mapWidth, mapHeight) + 800;
        for (let i = 0; i < blobCount; i++) {
          const seed = frac(i * 0.61803398);
          const phase = frac(t / cycleDur + seed);
          // Pick a perpendicular spawn line on the upwind side, scattered
          // along its length so blobs don't all enter from one point.
          const perpX = -dirY, perpY = dirX;
          const ySlot = frac(i * 0.137 + 0.41) - 0.5;     // -0.5..0.5
          const baseX = mapWidth * 0.5 - dirX * span * 0.5;
          const baseY = mapHeight * 0.5 - dirY * span * 0.5;
          const offset = ySlot * Math.max(mapWidth, mapHeight) * 1.2;
          const sx = baseX + perpX * offset;
          const sy = baseY + perpY * offset;
          const px = sx + dirX * span * phase;
          const py = sy + dirY * span * phase;
          const radius = 240 + (i % 3) * 80;
          nodes.push(React.createElement(Circle, {
            key: `f-${i}`,
            x: px, y: py, radius,
            fillRadialGradientStartPoint: { x: 0, y: 0 },
            fillRadialGradientStartRadius: 0,
            fillRadialGradientEndPoint:   { x: 0, y: 0 },
            fillRadialGradientEndRadius:  radius,
            fillRadialGradientColorStops: [
              0,    `rgba(225,230,240,${0.22 * intensity})`,
              0.55, `rgba(200,210,225,${0.13 * intensity})`,
              1,    'rgba(200,210,225,0)',
            ],
            globalCompositeOperation: 'lighter',
            listening: false,
          }));
        }
      }

      return React.createElement(Group, { listening: false }, nodes);
    }

    registries.mapDecorations.set(PLUGIN_ID, (ctx) =>
      // key on `kind` so a mode switch unmounts the prior animation and
      // mounts a fresh one — guarantees the RAF clock and useEffect cleanup
      // run cleanly between modes.
      React.createElement(Weather, {
        key: state.kind,
        kind: state.kind,
        intensity: state.intensity,
        windAngle: state.windAngle,
        mapWidth: ctx.mapWidth,
        mapHeight: ctx.mapHeight,
      }));

    // ── GM control panel ─────────────────────────────────────────────
    function WeatherTab() {
      const [, setTick] = React.useState(0);
      React.useEffect(() => {
        const fn = () => setTick(x => x + 1);
        tabSubs.add(fn);
        return () => tabSubs.delete(fn);
      }, []);

      // Helper: mutate state, refresh both the local UI and remote
      // clients in one place so we don't drift between local + KV.
      function patch(updates) {
        state = { ...state, ...updates };
        notifyChange();
        pingTab();
        // Fire-and-forget — auto-broadcast handles GM↔player sync.
        data.write(STATE_KEY, state);
      }

      return React.createElement(
        'div',
        { className: 'p-4 space-y-4' },
        React.createElement(
          'div',
          null,
          React.createElement('h3', { className: 'text-sm font-semibold text-dnd-gold mb-1' }, 'Weather'),
          React.createElement('p', { className: 'text-xs text-gray-400 mb-2 leading-snug' },
            'Animated weather across the whole map. Both GM and players see the effect.')
        ),
        // Mode picker — 4-up grid of toggle buttons
        React.createElement(
          'div',
          { className: 'grid grid-cols-2 gap-2' },
          KIND_OPTIONS.map((opt) =>
            React.createElement('button', {
              key: opt.id,
              onClick: () => patch({ kind: opt.id }),
              className: state.kind === opt.id
                ? 'bg-dnd-gold text-gray-900 px-3 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2'
                : 'bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-200 px-3 py-2 rounded-lg text-sm flex items-center justify-center gap-2',
            }, React.createElement('span', null, opt.icon), opt.label)
          )
        ),
        // Intensity + wind sliders only show when weather is active.
        state.kind !== 'off' && React.createElement(
          'div',
          { className: 'space-y-3 pt-2' },
          React.createElement(
            'div',
            null,
            React.createElement('label', { className: 'block text-xs text-gray-400 mb-1' },
              `Intensity: ${Math.round(state.intensity * 100)}%`),
            React.createElement('input', {
              type: 'range', min: 0.1, max: 1, step: 0.05,
              value: state.intensity,
              onChange: (e) => patch({ intensity: parseFloat(e.target.value) }),
              className: 'w-full',
            })
          ),
          React.createElement(
            'div',
            null,
            React.createElement('label', { className: 'block text-xs text-gray-400 mb-1' },
              `Wind: ${state.windAngle}°`),
            React.createElement('input', {
              type: 'range', min: 0, max: 359, step: 5,
              value: state.windAngle,
              onChange: (e) => patch({ windAngle: parseInt(e.target.value, 10) }),
              className: 'w-full',
            }),
            React.createElement('div', { className: 'text-[10px] text-gray-500 mt-0.5 leading-snug' },
              '0° = East · 90° = South · 180° = West · 270° = North')
          )
        )
      );
    }

    registries.dmTabs.set(PLUGIN_ID, {
      label: '🌦 Weather',
      render: () => React.createElement(WeatherTab, null),
    });
  },
};
