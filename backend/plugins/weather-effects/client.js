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
  return { layers: [], windAngle: 200, visibility: 0, masks: [], feather: 24 };
}
const MAX_FEATHER = 160;

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
    // Older rows predate feathering — fall back to the default rather
    // than 0 so existing masks pick up soft edges too.
    feather: Number.isFinite(Number(raw.feather))
      ? Math.max(0, Math.min(MAX_FEATHER, Number(raw.feather)))
      : d.feather,
    masks: (Array.isArray(raw.masks) ? raw.masks : [])
      .filter((m) => m && Array.isArray(m.points) && m.points.length >= 6)
      .map((m) => ({ id: m.id || `m-${Math.random().toString(36).slice(2, 8)}`, points: m.points.slice(0, MAX_MASK_POINTS * 2) })),
  };
}

function clamp01(n) { return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0; }
function frac(n) { return n - Math.floor(n); }

// Stable scattered pseudo-random in [0,1) for particle i. The old layout used
// frac(i * 0.137), which advances in a straight line and wraps every ~7
// particles — that regularity was visible as columns and marching wave fronts.
// Same value every frame, so particles don't jitter between frames.
function hash01(i, salt) {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}
// Depth layers. Each is stroked separately because line width and colour are
// canvas state, not per-subpath — one path can only ever be one thickness.
const RAIN_DEPTHS = 3;

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
function drawRain(c, intensity, wind, w, h, t, unit) {
  const n = Math.floor(80 + intensity * 220);
  const baseCycle = 1.4 - intensity * 0.35;
  const tiltX = wind.x * 0.45;
  const totalY = h + 80;
  const totalX = totalY * tiltX;
  const span = w + Math.abs(totalX) + 100;
  const mag = Math.hypot(totalX, totalY) || 1;
  const ux = totalX / mag, uy = totalY / mag;
  const baseTail = (18 + intensity * 16) * unit;
  c.lineCap = 'round';

  // Three depth layers: near drops are bigger, faster and brighter, far ones
  // thin and dim. Varying the fall speed per drop is what actually breaks the
  // marching-wave look — drops at different speeds can't stay in formation.
  for (let b = 0; b < RAIN_DEPTHS; b++) {
    const depth = (b + 0.5) / RAIN_DEPTHS;
    c.beginPath();
    for (let i = b; i < n; i += RAIN_DEPTHS) {
      const rx = hash01(i, 1);
      const rp = hash01(i, 2);
      const rs = hash01(i, 3);
      const rt = hash01(i, 4);
      // Nearer falls faster, plus a per-drop jitter so even one layer's drops
      // drift out of phase with each other.
      const cycle = baseCycle * (1.3 - 0.55 * depth) * (0.82 + 0.4 * rs);
      const phase = frac(t / cycle + rp);
      const startX = -Math.max(0, totalX) - 50 + rx * span;
      const px = startX + totalX * phase;
      const py = -40 + totalY * phase;
      const tail = baseTail * (0.55 + 0.9 * depth) * (0.75 + 0.55 * rt);
      c.moveTo(px, py);
      c.lineTo(px - ux * tail, py - uy * tail);
    }
    c.strokeStyle = `rgba(150,195,240,${(0.16 + 0.3 * depth).toFixed(3)})`;
    c.lineWidth = Math.max(0.9, (1.1 + 2.4 * depth + intensity * 1.0) * unit);
    c.stroke();
    c.strokeStyle = `rgba(215,235,255,${(0.35 + 0.5 * depth).toFixed(3)})`;
    c.lineWidth = Math.max(0.5, (0.5 + 1.0 * depth + intensity * 0.4) * unit);
    c.stroke();
  }
}

function drawSnow(c, intensity, wind, w, h, t, unit) {
  const n = Math.floor(60 + intensity * 160);
  const cycle = 14 - intensity * 5;
  const tiltX = wind.x * 0.6;
  const totalY = h + 40;
  const totalX = totalY * tiltX;
  const span = w + Math.abs(totalX) + 60;
  c.fillStyle = 'rgba(255,255,255,0.85)';
  c.beginPath();
  for (let i = 0; i < n; i++) {
    const rx = hash01(i, 5);
    const rp = hash01(i, 6);
    const rs = hash01(i, 7);
    const rr = hash01(i, 8);
    const flakeCycle = cycle * (0.75 + 0.5 * rs);
    const phase = frac(t / flakeCycle + rp);
    const startX = -Math.max(0, totalX) - 30 + rx * span;
    const sway = Math.sin(t * (0.35 + 0.4 * rs) + rp * 12) * (14 + 18 * rr) * unit;
    const px = startX + totalX * phase + sway;
    const py = -20 + totalY * phase;
    const r = (1.1 + rr * 2.2) * unit;
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

// The weather itself, unclipped. Shared by both the hard-edged and the
// feathered paths so the two can never drift apart.
function drawLayers(c, st, w, h, t, unit) {
  const wind = windVector(st.windAngle);
  for (const kind of DRAW_ORDER) {
    for (const L of st.layers) {
      if (L.kind !== kind) continue;
      if (kind === 'rain') drawRain(c, L.intensity, wind, w, h, t, unit);
      else if (kind === 'snow') drawSnow(c, L.intensity, wind, w, h, t, unit);
      else if (kind === 'fog') drawFog(c, L.intensity, wind, w, h, t);
    }
  }
  if (st.visibility > 0) {
    c.fillStyle = `rgba(${washRgb(st)},${st.visibility * 0.75})`;
    c.fillRect(0, 0, w, h);
  }
}

function tracePolys(c, masks) {
  for (const m of masks) {
    const p = m.points;
    c.moveTo(p[0], p[1]);
    for (let i = 2; i < p.length; i += 2) c.lineTo(p[i], p[i + 1]);
    c.closePath();
  }
}

// ── Offscreen scratch, reused across frames ────────────────────────────
// A canvas clip() edge is always hard — there is no feathered clip. So for
// soft edges we draw the weather to an offscreen canvas, punch the mask
// holes out of it, then composite the result. The alpha mask only changes
// when the polygons or the feather change, so it's cached and the
// per-frame cost is one extra composite plus one drawImage.
let _weatherCv = null;
let _maskCv = null;
let _maskKey = '';

// Number of concentric passes used to build the soft edge. More is
// smoother; 16 is indistinguishable from a true blur at these radii and
// only runs when the mask is rebuilt.
const FEATHER_STEPS = 16;

function sizedCanvas(cv, w, h) {
  if (!cv) cv = document.createElement('canvas');
  if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
  return cv;
}

// White where weather should show, transparent inside the exclusions,
// with a soft ramp between. Used as a destination-in alpha mask.
//
// The ramp is built from concentric strokes rather than `ctx.filter =
// blur(...)`. Canvas filters combined with destination-out compositing
// are unreliable across browsers (notably Safari, where the filter is
// silently ignored and the edge comes out hard), and a feature check
// can't catch that because `filter` reports as supported either way.
//
// A stroke of width W straddles the path, reaching W/2 either side, so
// pass i of N (W = 2*feather*(i/N)) covers everything within
// feather*(i/N) of the edge. destination-out with alpha a multiplies the
// remaining alpha by (1-a), so a point d px out ends up with
// prod_{j >= d*N/feather} (1 - a_j).
//
// Setting that product equal to the linear target d/feather telescopes
// to a_i = 1/(i+1). A constant 1/N per pass looks like it should work but
// leaves ~0.37 alpha at the edge — a visible step against the fully
// erased interior.
//
// Strokes also bleed inward, but the interior is already fully erased by
// the fill, so that costs nothing.
function getMaskCanvas(masks, feather, w, h) {
  const key = `${w}x${h}|${feather}|${JSON.stringify(masks.map((m) => m.points))}`;
  if (_maskCv && _maskKey === key) return _maskCv;
  _maskCv = sizedCanvas(_maskCv, w, h);
  const mc = _maskCv.getContext('2d');
  mc.setTransform(1, 0, 0, 1, 0, 0);
  mc.globalCompositeOperation = 'source-over';
  mc.globalAlpha = 1;
  mc.clearRect(0, 0, w, h);
  mc.fillStyle = '#fff';
  mc.fillRect(0, 0, w, h);

  mc.globalCompositeOperation = 'destination-out';
  mc.fillStyle = '#fff';
  mc.strokeStyle = '#fff';
  mc.lineJoin = 'round';
  mc.lineCap = 'round';

  // Hard interior first.
  mc.globalAlpha = 1;
  mc.beginPath();
  tracePolys(mc, masks);
  mc.fill('evenodd');

  if (feather > 0) {
    for (let i = FEATHER_STEPS; i >= 1; i--) {
      mc.globalAlpha = 1 / (i + 1);
      mc.lineWidth = 2 * feather * (i / FEATHER_STEPS);
      mc.beginPath();
      tracePolys(mc, masks);
      mc.stroke();
    }
  }

  mc.globalAlpha = 1;
  mc.globalCompositeOperation = 'source-over';
  _maskKey = key;
  return _maskCv;
}

function drawScene(c, st, w, h, t, unit) {
  const feather = st.feather || 0;

  // Fast path — no masks, or feather dialled to zero. Hard clip straight
  // onto the real context, which also keeps the particles at full device
  // resolution when the GM is zoomed in.
  if (st.masks.length === 0 || feather <= 0) {
    c.save();
    c.beginPath();
    c.rect(0, 0, w, h);
    tracePolys(c, st.masks);
    // Konva's Context wrapper forwards the fill-rule; guard in case a
    // future version doesn't, in which case masks stop cutting but the
    // weather still runs.
    try { c.clip('evenodd'); } catch { c.clip(); }
    drawLayers(c, st, w, h, t, unit);
    c.restore();
    return;
  }

  // Feathered path. The offscreen is map-resolution, so weather softens
  // slightly when zoomed right in — acceptable for ambient effects that
  // are half blur anyway, and it keeps the buffer bounded on big maps.
  _weatherCv = sizedCanvas(_weatherCv, w, h);
  const wc = _weatherCv.getContext('2d');
  wc.setTransform(1, 0, 0, 1, 0, 0);
  wc.globalCompositeOperation = 'source-over';
  wc.filter = 'none';
  wc.clearRect(0, 0, w, h);
  drawLayers(wc, st, w, h, t, unit);
  wc.globalCompositeOperation = 'destination-in';
  wc.drawImage(getMaskCanvas(st.masks, feather, w, h), 0, 0);
  wc.globalCompositeOperation = 'source-over';
  c.drawImage(_weatherCv, 0, 0);
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
    function WeatherShape({ st, mapWidth, mapHeight, unit }) {
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
        sceneFunc: (ctx) => drawScene(ctx._context || ctx, st, mapWidth, mapHeight, t, unit),
      });
    }

    // ── View-agnostic state ──────────────────────────────────────────
    //
    // The Konva decoration below is the FLAT map's weather and nothing else —
    // the 3D renderer cannot run Konva nodes, so before this hook existed,
    // switching to 3D silently turned the weather off.
    //
    // So the state also goes out as plain data and each view renders it in
    // its own terms. Both read the same `getState(mapId)`, which means the
    // GM's slider moves both skies at once and the two cannot drift apart.
    //
    // The masks travel with it. They are the whole point of this plugin's
    // interior handling, and a view that dropped them would put rain inside
    // the tavern the GM explicitly roofed over.
    console.log('[weather-effects] registering; host registry has mapWeather:',
      !!(registries && registries.mapWeather));
    registries.mapWeather.set(PLUGIN_ID, (ctx) => {
      ensureLoaded(ctx.mapId);
      const st = getState(ctx.mapId);
      if (!st.layers.length && !st.visibility) return null;
      return {
        layers: st.layers.map((l) => ({ kind: l.kind, intensity: l.intensity })),
        windAngle: st.windAngle,
        visibility: st.visibility,
        masks: st.masks,
        feather: st.feather,
      };
    });

    // ── Map decoration ───────────────────────────────────────────────
    registries.mapDecorations.set(PLUGIN_ID, (ctx) => {
      ensureLoaded(ctx.mapId);
      if (!ctx.isPlayer && ctx.mapId != null && ctx.mapId !== currentMapId) {
        currentMapId = ctx.mapId;
        // Defer — we're inside another component's render pass.
        setTimeout(pingTab, 0);
      }
      const st = getState(ctx.mapId);
      // Particle sizes are in map pixels, so on a map with big grid squares
      // a fixed size renders as hairlines. Normalise against a 50px cell —
      // a standard map is unchanged, a coarser one gets proportionally
      // chunkier drops. Clamped so extreme grids stay sane.
      const unit = Math.max(0.7, Math.min(3, (Number(ctx.gridSize) || 50) / 50));
      const nodes = [React.createElement(WeatherShape, {
        key: 'weather', st, mapWidth: ctx.mapWidth, mapHeight: ctx.mapHeight, unit,
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
          st.masks.length > 0 && h('div', { className: 'pt-1' },
            h('label', { className: 'block text-[11px] text-gray-400 mb-1' },
              `Edge feather: ${Math.round(st.feather)}px`),
            h('input', {
              type: 'range', min: 0, max: MAX_FEATHER, step: 2, value: st.feather,
              onChange: (e) => patch(mapId, { feather: parseInt(e.target.value, 10) }),
              className: 'w-full',
            }),
            h('div', { className: 'text-[10px] text-gray-500 mt-0.5 leading-snug' },
              'Softens where weather meets an excluded area, so a porch or broken roof fades instead of cutting off. 0 = hard edge.')),
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
    registries.mapWeather.delete(PLUGIN_ID);
    registries.mapClickHandlers.delete(PLUGIN_ID);
    registries.dmTabs.delete(PLUGIN_ID);
    statesByMap.clear();
    loadedMaps.clear();
    currentMapId = null;
    drawMode = null;
    draftPoints = null;
    // Release the offscreen buffers — on a big map these are several MB each.
    _weatherCv = null;
    _maskCv = null;
    _maskKey = '';
  },
};
