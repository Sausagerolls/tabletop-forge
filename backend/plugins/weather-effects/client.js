// Weather Effects — per-map, layered, maskable weather.
//
// What it does
// ────────────
//   GM tab where each map gets its own weather: any combination of rain,
//   snow and fog stacked together, a shared wind direction, a visibility
//   slider that washes the scene out, and GM-drawn exclusion polygons so
//   interiors stay dry.
//
// How it stays in sync
// ────────────────────
//   One KV key per map — `map_<mapId>` holding
//   `{ layers, windAngle, visibility, masks }`. data.write auto-broadcasts
//   to every client in the session, so a slider drag lands on the players'
//   maps without polling. Writes are debounced so dragging a slider
//   doesn't fire a broadcast per pixel.
//
//   The map id arrives via the mapDecorations ctx (`ctx.mapId`). Player
//   clients get it from whichever map they're actually rendering, so a
//   split party on two maps sees two different skies.
//
// Rendering
// ─────────
//   Everything draws into ONE Konva Shape via sceneFunc using raw canvas
//   calls, rather than one Konva node per particle. Layering multiplies
//   particle counts, and hundreds of nodes per frame is the expensive
//   way to do this. It also gives direct access to `clip('evenodd')`,
//   which is what makes the exclusion masks work: fill the map rect,
//   subtract each polygon, clip, then draw. No compositing tricks.

const PLUGIN_ID = 'weather-effects';

const KINDS = [
  { id: 'rain', label: 'Rain', icon: '🌧️' },
  { id: 'snow', label: 'Snow', icon: '❄️' },
  { id: 'fog',  label: 'Fog',  icon: '🌫️' },
];
// Fog renders beneath precipitation — rain falling in front of a fog bank
// reads correctly; the reverse looks like the rain is behind glass.
const DRAW_ORDER = ['fog', 'rain', 'snow'];
// Closing a polygon by clicking near its first vertex. Map pixels.
const CLOSE_SNAP_PX = 14;
const MAX_MASK_POINTS = 64;

function defaultState() {
  return { layers: [], windAngle: 200, visibility: 0, masks: [] };
}

// Tolerate anything the KV row throws at us — a half-written value from an
// older build shouldn't take the map's weather down with it.
function normalise(raw) {
  const d = defaultState();
  if (!raw || typeof raw !== 'object') return d;
  const layers = Array.isArray(raw.layers) ? raw.layers : [];
  return {
    layers: layers
      .filter((l) => l && KINDS.some((k) => k.id === l.kind))
      .map((l) => ({
        id: l.id || `${l.kind}-${Math.random().toString(36).slice(2, 8)}`,
        kind: l.kind,
        intensity: clamp01(Number(l.intensity)) || 0.5,
      })),
    windAngle: Number.isFinite(Number(raw.windAngle)) ? Number(raw.windAngle) : d.windAngle,
    visibility: clamp01(Number(raw.visibility)) || 0,
    masks: (Array.isArray(raw.masks) ? raw.masks : [])
      .filter((m) => m && Array.isArray(m.points) && m.points.length >= 6)
      .map((m) => ({ id: m.id || `m-${Math.random().toString(36).slice(2, 8)}`, points: m.points.slice(0, MAX_MASK_POINTS * 2) })),
  };
}

function clamp01(n) { return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0; }
function frac(n) { return n - Math.floor(n); }

// Wind angle convention: degrees clockwise from East.
//   0 = East (+x) · 90 = South (+y, canvas-y is down) · 180 = West · 270 = North
function windVector(deg) {
  const r = (deg * Math.PI) / 180;
  return { x: Math.cos(r), y: Math.sin(r) };
}

// Even-odd ray cast. Used for "did the GM click inside this mask".
function pointInPoly(x, y, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 2; i < pts.length; j = i, i += 2) {
    const xi = pts[i], yi = pts[i + 1], xj = pts[j], yj = pts[j + 1];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// ── Module state ───────────────────────────────────────────────────────
const statesByMap = new Map();   // mapId -> state
const loadedMaps  = new Set();   // maps we've already issued a read for
let currentMapId  = null;        // last map the GM's own stage rendered
let drawMode      = null;        // null | 'draw' | 'erase'
let draftPoints   = null;        // flat [x,y,...] while drawing

const tabSubs = new Set();
function pingTab() { for (const fn of tabSubs) try { fn(); } catch {} }

function getState(mapId) {
  if (mapId == null) return defaultState();
  return statesByMap.get(mapId) || defaultState();
}

// ── Particle painters (raw canvas 2d context) ──────────────────────────
function drawRain(c, intensity, wind, w, h, t) {
  const n = Math.floor(80 + intensity * 220);
  const cycle = 1.4 - intensity * 0.35;
  const tiltX = wind.x * 0.45;
  const totalY = h + 80;
  const totalX = totalY * tiltX;
  const span = w + Math.abs(totalX) + 100;
  const tail = 14 + intensity * 12;
  const mag = Math.hypot(totalX, totalY) || 1;
  c.strokeStyle = 'rgba(160,200,240,0.55)';
  c.lineWidth = 1;
  c.beginPath();
  for (let i = 0; i < n; i++) {
    const phase = frac(t / cycle + frac(i * 0.61803398));
    const startX = -Math.max(0, totalX) - 50 + frac(i * 0.137 + 0.21) * span;
    const px = startX + totalX * phase;
    const py = -40 + totalY * phase;
    c.moveTo(px, py);
    c.lineTo(px - (totalX / mag) * tail, py - (totalY / mag) * tail);
  }
  c.stroke();
}

function drawSnow(c, intensity, wind, w, h, t) {
  const n = Math.floor(60 + intensity * 160);
  const cycle = 14 - intensity * 5;
  const tiltX = wind.x * 0.6;
  const totalY = h + 40;
  const totalX = totalY * tiltX;
  const span = w + Math.abs(totalX) + 60;
  c.fillStyle = 'rgba(255,255,255,0.85)';
  c.beginPath();
  for (let i = 0; i < n; i++) {
    const phase = frac(t / cycle + frac(i * 0.61803398));
    const startX = -Math.max(0, totalX) - 30 + frac(i * 0.137 + 0.31) * span;
    const sway = Math.sin(t * 0.5 + i * 1.7) * 22;
    const px = startX + totalX * phase + sway;
    const py = -20 + totalY * phase;
    const r = 1.4 + (i % 4) * 0.45;
    c.moveTo(px + r, py);
    c.arc(px, py, r, 0, Math.PI * 2);
  }
  c.fill();
}

function drawFog(c, intensity, wind, w, h, t) {
  const n = Math.floor(8 + intensity * 16);
  const cycle = 32 - intensity * 12;
  let dirX = wind.x, dirY = wind.y;
  // A dead-calm sky shouldn't look frozen — drift east by default.
  if (Math.abs(dirX) < 0.01 && Math.abs(dirY) < 0.01) { dirX = 1; dirY = 0; }
  const len = Math.hypot(dirX, dirY) || 1;
  dirX /= len; dirY /= len;
  const span = Math.hypot(w, h) + 800;
  const prevOp = c.globalCompositeOperation;
  c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const phase = frac(t / cycle + frac(i * 0.61803398));
    const perpX = -dirY, perpY = dirX;
    const offset = (frac(i * 0.137 + 0.41) - 0.5) * Math.max(w, h) * 1.2;
    const sx = w * 0.5 - dirX * span * 0.5 + perpX * offset;
    const sy = h * 0.5 - dirY * span * 0.5 + perpY * offset;
    const px = sx + dirX * span * phase;
    const py = sy + dirY * span * phase;
    const radius = 240 + (i % 3) * 80;
    const g = c.createRadialGradient(px, py, 0, px, py, radius);
    g.addColorStop(0,    `rgba(225,230,240,${0.22 * intensity})`);
    g.addColorStop(0.55, `rgba(200,210,225,${0.13 * intensity})`);
    g.addColorStop(1,    'rgba(200,210,225,0)');
    c.fillStyle = g;
    c.beginPath();
    c.arc(px, py, radius, 0, Math.PI * 2);
    c.fill();
  }
  c.globalCompositeOperation = prevOp;
}

// Visibility wash — tinted by whatever's falling. Snow and fog grey out
// toward white; rain toward a darker blue-grey.
function washRgb(st) {
  const kinds = new Set(st.layers.map((l) => l.kind));
  if (kinds.has('snow') || kinds.has('fog')) return '214,222,232';
  if (kinds.has('rain')) return '120,138,160';
  return '150,160,175';
}

function drawScene(c, st, w, h, t) {
  c.save();
  // Clip to "the whole map MINUS every exclusion polygon". Even-odd means
  // the inner subpaths punch holes rather than union.
  c.beginPath();
  c.rect(0, 0, w, h);
  for (const m of st.masks) {
    const p = m.points;
    c.moveTo(p[0], p[1]);
    for (let i = 2; i < p.length; i += 2) c.lineTo(p[i], p[i + 1]);
    c.closePath();
  }
  // Konva's Context wrapper forwards the fill-rule; guard in case a future
  // version doesn't, in which case masks stop cutting but weather still runs.
  try { c.clip('evenodd'); } catch { c.clip(); }

  const wind = windVector(st.windAngle);
  for (const kind of DRAW_ORDER) {
    for (const L of st.layers) {
      if (L.kind !== kind) continue;
      if (kind === 'rain') drawRain(c, L.intensity, wind, w, h, t);
      else if (kind === 'snow') drawSnow(c, L.intensity, wind, w, h, t);
      else if (kind === 'fog') drawFog(c, L.intensity, wind, w, h, t);
    }
  }
  if (st.visibility > 0) {
    c.fillStyle = `rgba(${washRgb(st)},${st.visibility * 0.75})`;
    c.fillRect(0, 0, w, h);
  }
  c.restore();
}

export default {
  register({ React, ReactKonva, registries, context }) {
    const { Group, Line, Circle, Shape } = ReactKonva;
    const { data, notifyChange, subscribe } = context;

    // ── Persistence ──────────────────────────────────────────────────
    let writeTimer = null;
    let pendingMapId = null;
    function scheduleWrite(mapId) {
      pendingMapId = mapId;
      clearTimeout(writeTimer);
      writeTimer = setTimeout(() => {
        const st = statesByMap.get(pendingMapId);
        if (st) data.write(`map_${pendingMapId}`, st);
      }, 150);
    }

    function patch(mapId, updates) {
      if (mapId == null) return;
      const next = { ...getState(mapId), ...updates };
      statesByMap.set(mapId, next);
      notifyChange();
      pingTab();
      scheduleWrite(mapId);
    }

    function ensureLoaded(mapId) {
      if (mapId == null || loadedMaps.has(mapId)) return;
      loadedMaps.add(mapId);
      data.read(`map_${mapId}`).then((row) => {
        if (!row) return;
        statesByMap.set(mapId, normalise(row));
        notifyChange();
        pingTab();
      }).catch(() => { /* network blip — defaults stand */ });
    }

    if (typeof subscribe === 'function') {
      subscribe(({ type, payload }) => {
        if (type !== 'data' || !payload) return;
        const m = /^map_(\d+)$/.exec(payload.key || '');
        if (!m) return;
        const mapId = Number(m[1]);
        statesByMap.set(mapId, payload.op === 'delete' ? defaultState() : normalise(payload.value));
        loadedMaps.add(mapId);
        notifyChange();
        pingTab();
      });
    }

    // ── Animated layer ───────────────────────────────────────────────
    function WeatherShape({ st, mapWidth, mapHeight }) {
      const [, force] = React.useState(0);
      const active = st.layers.length > 0 || st.visibility > 0;
      React.useEffect(() => {
        if (!active) return;
        let raf, last = 0;
        const tick = (now) => {
          // ~30fps cap — ambient weather doesn't need more and it halves cost.
          if (now - last > 33) { force((x) => (x + 1) | 0); last = now; }
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
      }, [active]);

      if (!active || !mapWidth || !mapHeight) return null;
      const t = performance.now() / 1000;
      return React.createElement(Shape, {
        listening: false,
        perfectDrawEnabled: false,
        sceneFunc: (ctx) => drawScene(ctx._context || ctx, st, mapWidth, mapHeight, t),
      });
    }

    // ── Map decoration ───────────────────────────────────────────────
    registries.mapDecorations.set(PLUGIN_ID, (ctx) => {
      ensureLoaded(ctx.mapId);
      if (!ctx.isPlayer && ctx.mapId != null && ctx.mapId !== currentMapId) {
        currentMapId = ctx.mapId;
        // Defer — we're inside another component's render pass.
        setTimeout(pingTab, 0);
      }
      const st = getState(ctx.mapId);
      const nodes = [React.createElement(WeatherShape, {
        key: 'weather', st, mapWidth: ctx.mapWidth, mapHeight: ctx.mapHeight,
      })];

      // GM-only editing chrome: existing masks outlined, plus the polygon
      // being drawn right now. Players see neither.
      if (!ctx.isPlayer) {
        if (drawMode) {
          st.masks.forEach((m) => nodes.push(React.createElement(Line, {
            key: `mask-${m.id}`, points: m.points, closed: true,
            stroke: 'rgba(120,200,255,0.9)', strokeWidth: 1.5, dash: [8, 6],
            fill: 'rgba(120,200,255,0.10)', listening: false,
          })));
        }
        if (draftPoints && draftPoints.length >= 2) {
          nodes.push(React.createElement(Line, {
            key: 'draft', points: draftPoints, closed: false,
            stroke: 'rgba(255,220,120,0.95)', strokeWidth: 2, listening: false,
          }));
          for (let i = 0; i < draftPoints.length; i += 2) {
            nodes.push(React.createElement(Circle, {
              key: `dv-${i}`, x: draftPoints[i], y: draftPoints[i + 1],
              radius: i === 0 ? 6 : 3.5,
              fill: i === 0 ? 'rgba(255,220,120,1)' : 'rgba(255,220,120,0.8)',
              listening: false,
            }));
          }
        }
      }
      return React.createElement(Group, { listening: false }, nodes);
    });

    // ── Map clicks (GM only, and only while a draw mode is armed) ─────
    registries.mapClickHandlers.set(PLUGIN_ID, {
      role: 'dm',
      handler: ({ x, y }) => {
        if (!drawMode || currentMapId == null) return false;
        const st = getState(currentMapId);

        if (drawMode === 'erase') {
          const hit = [...st.masks].reverse().find((m) => pointInPoly(x, y, m.points));
          if (hit) patch(currentMapId, { masks: st.masks.filter((m) => m.id !== hit.id) });
          return true;
        }

        // Draw: clicking near the first vertex closes the shape.
        if (draftPoints && draftPoints.length >= 6) {
          const dx = x - draftPoints[0], dy = y - draftPoints[1];
          if (Math.hypot(dx, dy) <= CLOSE_SNAP_PX) { commitDraft(); return true; }
        }
        if (draftPoints && draftPoints.length >= MAX_MASK_POINTS * 2) { commitDraft(); return true; }
        // Raw map coords straight from the host — deliberately NOT snapped
        // to the grid, so an exclusion area can follow a building's walls.
        draftPoints = draftPoints ? [...draftPoints, x, y] : [x, y];
        notifyChange();
        pingTab();
        return true;
      },
    });

    function commitDraft() {
      if (!draftPoints || draftPoints.length < 6 || currentMapId == null) {
        draftPoints = null; drawMode = null; notifyChange(); pingTab(); return;
      }
      const st = getState(currentMapId);
      const mask = { id: `m-${Date.now().toString(36)}`, points: draftPoints };
      draftPoints = null;
      drawMode = null;
      patch(currentMapId, { masks: [...st.masks, mask] });
    }

    function setDrawMode(mode) {
      drawMode = mode;
      if (mode !== 'draw') draftPoints = null;
      notifyChange();
      pingTab();
    }

    // ── GM control panel ─────────────────────────────────────────────
    function WeatherTab() {
      const [, setTick] = React.useState(0);
      React.useEffect(() => {
        const fn = () => setTick((x) => x + 1);
        tabSubs.add(fn);
        return () => tabSubs.delete(fn);
      }, []);

      const mapId = currentMapId;
      const st = getState(mapId);
      const h = React.createElement;

      if (mapId == null) {
        return h('div', { className: 'p-4' },
          h('h3', { className: 'text-sm font-semibold text-dnd-gold mb-1' }, 'Weather'),
          h('p', { className: 'text-xs text-gray-400' },
            'No map loaded. Open a map and its weather controls appear here.'));
      }

      const usedKinds = new Set(st.layers.map((l) => l.kind));
      const spare = KINDS.find((k) => !usedKinds.has(k.id));

      function addLayer() {
        if (!spare) return;
        patch(mapId, { layers: [...st.layers, { id: `${spare.id}-${Date.now().toString(36)}`, kind: spare.id, intensity: 0.5 }] });
      }
      function setLayer(id, updates) {
        patch(mapId, { layers: st.layers.map((l) => (l.id === id ? { ...l, ...updates } : l)) });
      }
      function removeLayer(id) {
        patch(mapId, { layers: st.layers.filter((l) => l.id !== id) });
      }

      return h('div', { className: 'p-4 space-y-4' },
        h('div', null,
          h('h3', { className: 'text-sm font-semibold text-dnd-gold mb-1' }, 'Weather'),
          h('p', { className: 'text-xs text-gray-400 leading-snug' },
            'Per-map and layered — stack rain with fog. Players on this map see it live.')),

        // ── Layers ──
        h('div', { className: 'space-y-2' },
          st.layers.length === 0 && h('p', { className: 'text-xs text-gray-500 italic' }, 'Clear skies. Add a layer to start.'),
          ...st.layers.map((L) => h('div', {
            key: L.id, className: 'bg-gray-800/60 border border-gray-700 rounded-lg p-2 space-y-1.5',
          },
            h('div', { className: 'flex items-center gap-2' },
              h('select', {
                className: 'flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-gray-200',
                value: L.kind,
                onChange: (e) => setLayer(L.id, { kind: e.target.value }),
              }, KINDS.map((k) => h('option', { key: k.id, value: k.id }, `${k.icon} ${k.label}`))),
              h('button', {
                onClick: () => removeLayer(L.id),
                className: 'text-xs text-red-300 hover:text-red-100 px-1.5 py-1',
                title: 'Remove this layer',
              }, '✕')),
            h('label', { className: 'block text-[11px] text-gray-400' }, `Intensity: ${Math.round(L.intensity * 100)}%`),
            h('input', {
              type: 'range', min: 0.1, max: 1, step: 0.05, value: L.intensity,
              onChange: (e) => setLayer(L.id, { intensity: parseFloat(e.target.value) }),
              className: 'w-full',
            }))),
          h('button', {
            onClick: addLayer,
            disabled: !spare,
            className: spare
              ? 'w-full text-xs bg-gray-800 hover:bg-gray-700 border border-gray-600 text-gray-200 px-2 py-1.5 rounded'
              : 'w-full text-xs bg-gray-900 border border-gray-800 text-gray-600 px-2 py-1.5 rounded cursor-not-allowed',
          }, spare ? `+ Add ${spare.label}` : 'All weather types in use')),

        // ── Shared wind + visibility ──
        (st.layers.length > 0 || st.visibility > 0) && h('div', { className: 'space-y-3 pt-1' },
          h('div', null,
            h('label', { className: 'block text-xs text-gray-400 mb-1' }, `Wind: ${st.windAngle}°`),
            h('input', {
              type: 'range', min: 0, max: 359, step: 5, value: st.windAngle,
              onChange: (e) => patch(mapId, { windAngle: parseInt(e.target.value, 10) }),
              className: 'w-full',
            }),
            h('div', { className: 'text-[10px] text-gray-500 mt-0.5' },
              '0° = East · 90° = South · 180° = West · 270° = North — shared by every layer')),
          h('div', null,
            h('label', { className: 'block text-xs text-gray-400 mb-1' },
              `Visibility reduction: ${Math.round(st.visibility * 100)}%`),
            h('input', {
              type: 'range', min: 0, max: 1, step: 0.05, value: st.visibility,
              onChange: (e) => patch(mapId, { visibility: parseFloat(e.target.value) }),
              className: 'w-full',
            }),
            h('div', { className: 'text-[10px] text-gray-500 mt-0.5 leading-snug' },
              'Washes the scene out, tokens included. Cosmetic — it does not shorten line of sight.'))),

        // ── Exclusion areas ──
        h('div', { className: 'pt-2 border-t border-gray-700 space-y-2' },
          h('div', { className: 'text-xs font-semibold text-gray-200' },
            `Exclusion areas (${st.masks.length})`),
          h('p', { className: 'text-[10px] text-gray-500 leading-snug' },
            'Draw around interiors to keep them dry. Click to drop each corner — no grid snapping, so you can trace walls exactly. Click the first point again (or Finish) to close.'),
          drawMode === 'draw'
            ? h('div', { className: 'space-y-1.5' },
                h('div', { className: 'text-[11px] text-amber-300' },
                  `Drawing — ${(draftPoints ? draftPoints.length / 2 : 0)} point(s). Click the map to add corners.`),
                h('div', { className: 'flex gap-1.5' },
                  h('button', {
                    onClick: commitDraft,
                    disabled: !draftPoints || draftPoints.length < 6,
                    className: 'flex-1 text-xs bg-emerald-800 hover:bg-emerald-700 disabled:opacity-40 text-white px-2 py-1.5 rounded',
                  }, 'Finish'),
                  h('button', {
                    onClick: () => {
                      if (draftPoints && draftPoints.length > 2) draftPoints = draftPoints.slice(0, -2);
                      else draftPoints = null;
                      notifyChange(); pingTab();
                    },
                    className: 'text-xs bg-gray-800 hover:bg-gray-700 border border-gray-600 text-gray-200 px-2 py-1.5 rounded',
                  }, 'Undo point'),
                  h('button', {
                    onClick: () => setDrawMode(null),
                    className: 'text-xs bg-gray-800 hover:bg-gray-700 border border-gray-600 text-gray-400 px-2 py-1.5 rounded',
                  }, 'Cancel')))
            : h('div', { className: 'flex gap-1.5' },
                h('button', {
                  onClick: () => setDrawMode('draw'),
                  className: 'flex-1 text-xs bg-gray-800 hover:bg-gray-700 border border-gray-600 text-gray-200 px-2 py-1.5 rounded',
                }, '+ Draw area'),
                h('button', {
                  onClick: () => setDrawMode(drawMode === 'erase' ? null : 'erase'),
                  disabled: st.masks.length === 0,
                  className: drawMode === 'erase'
                    ? 'text-xs bg-red-800 hover:bg-red-700 text-white px-2 py-1.5 rounded'
                    : 'text-xs bg-gray-800 hover:bg-gray-700 border border-gray-600 disabled:opacity-40 text-gray-200 px-2 py-1.5 rounded',
                }, drawMode === 'erase' ? 'Erasing — click an area' : 'Erase'),
                st.masks.length > 0 && h('button', {
                  onClick: () => { if (window.confirm('Remove every exclusion area on this map?')) patch(mapId, { masks: [] }); },
                  className: 'text-xs bg-gray-800 hover:bg-gray-700 border border-gray-600 text-gray-400 px-2 py-1.5 rounded',
                }, 'Clear')),
          drawMode && h('p', { className: 'text-[10px] text-gray-500' },
            'While a mode is armed this plugin consumes map clicks — turn it off to use the normal map tools.')));
    }

    registries.dmTabs.set(PLUGIN_ID, {
      label: '🌦 Weather',
      render: () => React.createElement(WeatherTab, null),
    });
  },

  unregister({ registries }) {
    registries.mapDecorations.delete(PLUGIN_ID);
    registries.mapClickHandlers.delete(PLUGIN_ID);
    registries.dmTabs.delete(PLUGIN_ID);
    statesByMap.clear();
    loadedMaps.clear();
    currentMapId = null;
    drawMode = null;
    draftPoints = null;
  },
};
