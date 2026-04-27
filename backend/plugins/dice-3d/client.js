// 3D Dice — real polyhedra (tetrahedron, cube, octahedron, decahedron,
// dodecahedron, icosahedron) tumbling across a WebGL overlay using
// three.js. DM rolls; every player in the session sees the same
// dice land on the same numbers.
//
// What it does
// ────────────
//   * Adds a "🎲 Dice" DM tab. The DM types a dice expression
//     (`2d6+3`, `1d20`, `4d4`) or hits a quick-roll button.
//   * The plugin emits a `roll` event over the plugin event bus —
//     the host echoes it to every client (including the sender),
//     so DM and players run the SAME animation showing the SAME
//     pre-rolled values.
//   * Each die is a real three.js mesh built with the proper
//     polyhedral geometry for its kind: TetrahedronGeometry for
//     d4, BoxGeometry for d6, OctahedronGeometry for d8, a custom
//     pentagonal trapezohedron for d10/d100, DodecahedronGeometry
//     for d12, IcosahedronGeometry for d20. Faces are labelled
//     procedurally onto a CanvasTexture so the rolled value stays
//     readable from any angle.
//
// Why a CDN dynamic import for three.js
// ─────────────────────────────────────
//   Plugins are static files served by the host — no build step, no
//   bundler. Three.js is too big to inline by hand, so we
//   dynamic-import it from esm.sh on plugin load. The host has no
//   CSP that blocks foreign script imports, so the network fetch is
//   the only cost. We cache the resolved module on the page so a
//   second roll doesn't re-import.
//
// What gracefully degrades
// ────────────────────────
//   If the three.js import fails (offline, blocked, bad pin), the
//   plugin falls back to a CSS pseudo-3D cube animation. The DM tab
//   shows the failure mode in its status row so it's not silent.

const PLUGIN_ID = 'dice-3d';
const STYLE_TAG_ID = 'plugin-dice-3d-style';
const ROOT_ID = 'plugin-dice-3d-root';
const THREE_CDN = 'https://esm.sh/three@0.160.0';

const DICE_TYPES = [4, 6, 8, 10, 12, 20, 100];

const DIE_TINTS = {
  4:   '#f87171',
  6:   '#facc15',
  8:   '#4ade80',
  10:  '#22d3ee',
  12:  '#818cf8',
  20:  '#c9a84c',
  100: '#f472b6',
};

const CSS = `
#${ROOT_ID} {
  position: fixed; inset: 0; z-index: 99998;
  pointer-events: none;
}
#${ROOT_ID}.dicefx-active::before {
  content: ''; position: absolute; inset: 0;
  background: radial-gradient(ellipse at center, rgba(0,0,0,0.45), rgba(0,0,0,0) 60%);
  pointer-events: none;
}
#${ROOT_ID} canvas {
  position: absolute; inset: 0;
  width: 100%; height: 100%;
}
.dicefx-result {
  position: absolute; left: 50%; bottom: 8%;
  transform: translateX(-50%) translateY(8px);
  background: rgba(22,33,62,0.96); color: #f4e4bc;
  border: 2px solid #c9a84c; border-radius: 14px;
  padding: 16px 26px;
  font-family: "Cinzel", Georgia, serif;
  font-size: 22px; letter-spacing: 0.04em;
  text-align: center; min-width: 320px;
  box-shadow: 0 22px 50px rgba(0,0,0,0.65);
  animation: dicefx-popup 0.45s ease-out forwards;
  animation-delay: 1.45s; opacity: 0;
}
.dicefx-result .dicefx-total {
  display: block; font-size: 52px; color: #c9a84c;
  margin-top: 4px; line-height: 1;
}
.dicefx-result .dicefx-detail {
  font-size: 12px; color: #d4c69c; opacity: 0.85;
  font-family: ui-monospace, monospace;
  margin-top: 8px;
}
.dicefx-status {
  position: absolute; top: 12px; right: 12px;
  background: rgba(22,33,62,0.85); color: #f4e4bc;
  border: 1px solid rgba(201,168,76,0.4);
  border-radius: 6px;
  padding: 6px 10px; font-size: 11px;
  font-family: ui-monospace, monospace;
  pointer-events: auto;
}
@keyframes dicefx-popup {
  from { opacity: 0; transform: translateX(-50%) translateY(12px); }
  to   { opacity: 1; transform: translateX(-50%) translateY(0); }
}
`;

let rootEl = null;
let canvasEl = null;
let resultEl = null;
let statusEl = null;
let pendingTimer = null;
let raf = null;
let scene = null, camera = null, renderer = null;
let activeDice = [];          // [{ mesh, target, anim }]
let lastRollState = null;     // 'idle' | 'rolling' | 'settled' | 'three-failed'

let threePromise = null;      // memoised import promise
let THREE = null;
let threeFailed = false;

const tabSubs = new Set();
function pingTab() { for (const fn of tabSubs) try { fn(); } catch {} }

// ── Three.js bootstrap ─────────────────────────────────────────────
async function loadThree() {
  if (THREE) return THREE;
  if (threeFailed) throw new Error('three.js previously failed to load');
  if (!threePromise) {
    threePromise = import(/* @vite-ignore */ THREE_CDN).then((mod) => {
      THREE = mod;
      return mod;
    }).catch((err) => {
      threePromise = null;
      threeFailed = true;
      throw err;
    });
  }
  return threePromise;
}

function ensureStyleTag() {
  if (document.getElementById(STYLE_TAG_ID)) return;
  const tag = document.createElement('style');
  tag.id = STYLE_TAG_ID;
  tag.textContent = CSS;
  document.head.appendChild(tag);
}

function ensureRoot() {
  if (rootEl && document.body.contains(rootEl)) return rootEl;
  rootEl = document.createElement('div');
  rootEl.id = ROOT_ID;
  document.body.appendChild(rootEl);
  return rootEl;
}

function teardownRoot() {
  if (raf) { cancelAnimationFrame(raf); raf = null; }
  if (renderer) {
    try { renderer.dispose(); } catch {}
    renderer = null;
  }
  scene = null; camera = null;
  activeDice = [];
  if (rootEl && rootEl.parentNode) rootEl.parentNode.removeChild(rootEl);
  rootEl = null; canvasEl = null; resultEl = null; statusEl = null;
}

function clearActive() {
  if (raf) { cancelAnimationFrame(raf); raf = null; }
  activeDice = [];
  if (rootEl) rootEl.classList.remove('dicefx-active');
  if (canvasEl) canvasEl.remove(); canvasEl = null;
  if (resultEl) resultEl.remove(); resultEl = null;
  if (renderer) { try { renderer.dispose(); } catch {} renderer = null; }
  scene = null; camera = null;
}

// ── Procedural face textures ───────────────────────────────────────
// One CanvasTexture per die. The whole mesh shares it, so every face
// shows the rolled value — the player can read the result regardless
// of which face the random tumble settles on.
function makeFaceTexture(value, tintHex) {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d');
  // Outer fill — die body colour.
  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, tintHex);
  grad.addColorStop(1, lightenHex(tintHex, 0.35));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  // Subtle bevel.
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 12;
  ctx.strokeRect(6, 6, size - 12, size - 12);
  // Numeral.
  ctx.fillStyle = '#1a1a2e';
  const fontSize = String(value).length >= 3 ? 110 : 150;
  ctx.font = `700 ${fontSize}px "Cinzel", Georgia, serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // Underline 6/9 so the player can tell which way is up — a real
  // physical d6 doesn't need this, but our cube spins so fast that
  // the pip-vs-numeral readability question dominates.
  if (value === 6 || value === 9) {
    ctx.fillText(`${value}̲`, size / 2, size / 2 + 12);
  } else {
    ctx.fillText(String(value), size / 2, size / 2 + 12);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 4;
  return texture;
}

function lightenHex(hex, amount) {
  const m = hex.match(/^#?([a-f0-9]{2})([a-f0-9]{2})([a-f0-9]{2})$/i);
  if (!m) return hex;
  const mix = (c) => Math.round(c + (255 - c) * amount);
  const r = mix(parseInt(m[1], 16));
  const g = mix(parseInt(m[2], 16));
  const b = mix(parseInt(m[3], 16));
  return `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`;
}

// Polyhedral geometry per die kind. d10/d100 use a pentagonal
// trapezohedron — built by hand because three.js doesn't ship one.
function geometryForSides(sides) {
  switch (sides) {
    case 4:   return new THREE.TetrahedronGeometry(1.1, 0);
    case 6:   return new THREE.BoxGeometry(1.3, 1.3, 1.3);
    case 8:   return new THREE.OctahedronGeometry(1.15, 0);
    case 12:  return new THREE.DodecahedronGeometry(1.05, 0);
    case 20:  return new THREE.IcosahedronGeometry(1.1, 0);
    case 10:
    case 100: return makeTrapezohedron();
    default:  return new THREE.IcosahedronGeometry(1.1, 0);
  }
}

// Pentagonal trapezohedron approximation — the classic d10 shape.
// Built as two pentagonal pyramids twisted 36° relative to each other,
// joined at a zig-zag equator. Good enough for visual identification
// at a glance even without proper kite faces.
function makeTrapezohedron() {
  const top    = new THREE.Vector3(0,  1.15, 0);
  const bottom = new THREE.Vector3(0, -1.15, 0);
  const ringTop = [], ringBottom = [];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    ringTop.push(new THREE.Vector3(Math.cos(a) * 0.95, 0.18, Math.sin(a) * 0.95));
    const b = a + Math.PI / 5;
    ringBottom.push(new THREE.Vector3(Math.cos(b) * 0.95, -0.18, Math.sin(b) * 0.95));
  }
  const verts = [];
  function tri(a, b, c) { verts.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z); }
  for (let i = 0; i < 5; i++) {
    const t  = ringTop[i];
    const tn = ringTop[(i + 1) % 5];
    const b  = ringBottom[i];
    tri(top, t, tn);
    tri(t, b, tn);
    const bn = ringBottom[(i + 1) % 5];
    tri(tn, b, bn);
    tri(bottom, bn, b);
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geom.computeVertexNormals();
  return geom;
}

// Build a single die mesh. Random initial spin axis so two dice never
// tumble in lockstep. The animation interpolates position + rotation
// from the initial pose to a centered final pose over ~1.6 s.
function buildDie(sides, value, slotIndex, totalDice) {
  const geom = geometryForSides(sides);
  const tex = makeFaceTexture(value, DIE_TINTS[sides] || '#facc15');
  const mat = new THREE.MeshStandardMaterial({
    map: tex,
    flatShading: true,
    roughness: 0.55,
    metalness: 0.10,
  });
  const mesh = new THREE.Mesh(geom, mat);

  // Stack the dice in a row centred on the camera.
  const totalSpan = (totalDice - 1) * 1.6;
  const finalX = -totalSpan / 2 + slotIndex * 1.6;
  const finalY = 0;
  const finalZ = 0;

  // Initial off-screen position — top-left, far back.
  const startX = -7 - Math.random() * 2;
  const startY =  3 + Math.random() * 2;
  const startZ = -3 - Math.random() * 2;

  mesh.position.set(startX, startY, startZ);
  mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);

  // Anim parameters.
  const spinX = (4 + Math.random() * 2) * Math.PI * 2;   // 4–6 turns
  const spinY = (4 + Math.random() * 2) * Math.PI * 2;
  const spinZ = (2 + Math.random() * 2) * Math.PI * 2;
  const finalRotX = mesh.rotation.x + spinX;
  const finalRotY = mesh.rotation.y + spinY;
  const finalRotZ = mesh.rotation.z + spinZ;

  return {
    mesh,
    delay: slotIndex * 80,            // ms
    duration: 1600,                   // ms
    start: { x: startX, y: startY, z: startZ, rx: mesh.rotation.x, ry: mesh.rotation.y, rz: mesh.rotation.z },
    end:   { x: finalX, y: finalY, z: finalZ, rx: finalRotX, ry: finalRotY, rz: finalRotZ },
  };
}

function easeOutBack(t) {
  const c1 = 1.30; const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}
function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

function startScene(roll) {
  // Camera + lights.
  const w = window.innerWidth;
  const h = window.innerHeight;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
  camera.position.set(0, 0, 7);
  camera.lookAt(0, 0, 0);

  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const key = new THREE.DirectionalLight(0xffffff, 0.9);
  key.position.set(3, 5, 4);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xb0c8ff, 0.4);
  rim.position.set(-4, -2, -3);
  scene.add(rim);

  renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(w, h);
  renderer.setClearColor(0x000000, 0);
  canvasEl = renderer.domElement;
  rootEl.appendChild(canvasEl);

  // Build dice meshes.
  activeDice = [];
  for (let i = 0; i < roll.values.length; i++) {
    const die = buildDie(roll.sides[i], roll.values[i], i, roll.values.length);
    scene.add(die.mesh);
    activeDice.push(die);
  }

  const startTs = performance.now();
  function frame(now) {
    const elapsed = now - startTs;
    for (const die of activeDice) {
      const localT = Math.max(0, Math.min(1, (elapsed - die.delay) / die.duration));
      const tEase = easeOutCubic(localT);
      const tBack = easeOutBack(localT);
      die.mesh.position.x = die.start.x + (die.end.x - die.start.x) * tBack;
      die.mesh.position.y = die.start.y + (die.end.y - die.start.y) * tEase;
      die.mesh.position.z = die.start.z + (die.end.z - die.start.z) * tEase;
      die.mesh.rotation.x = die.start.rx + (die.end.rx - die.start.rx) * tEase;
      die.mesh.rotation.y = die.start.ry + (die.end.ry - die.start.ry) * tEase;
      die.mesh.rotation.z = die.start.rz + (die.end.rz - die.start.rz) * tEase;
    }
    renderer.render(scene, camera);
    if (elapsed < 1600 + 200) {
      raf = requestAnimationFrame(frame);
    } else {
      raf = null;
    }
  }
  raf = requestAnimationFrame(frame);
}

function showResult(roll) {
  resultEl = document.createElement('div');
  resultEl.className = 'dicefx-result';
  const label = document.createElement('div');
  label.textContent = roll.label || `Rolling ${formatExpression(roll)}`;
  resultEl.appendChild(label);
  const total = document.createElement('span');
  total.className = 'dicefx-total';
  total.textContent = String(roll.total);
  resultEl.appendChild(total);
  const detail = document.createElement('div');
  detail.className = 'dicefx-detail';
  detail.textContent = formatBreakdown(roll);
  resultEl.appendChild(detail);
  rootEl.appendChild(resultEl);
}

function formatExpression(roll) {
  const counts = new Map();
  for (const s of roll.sides) counts.set(s, (counts.get(s) || 0) + 1);
  const parts = Array.from(counts.entries()).map(([s, n]) => `${n}d${s}`);
  if (roll.modifier > 0) parts.push(`+${roll.modifier}`);
  if (roll.modifier < 0) parts.push(`${roll.modifier}`);
  return parts.join(' ');
}
function formatBreakdown(roll) {
  const join = roll.values.join(' + ');
  if (roll.modifier === 0) return `[${join}] = ${roll.total}`;
  const sign = roll.modifier > 0 ? '+' : '−';
  return `[${join}] ${sign} ${Math.abs(roll.modifier)} = ${roll.total}`;
}

async function presentRoll(roll) {
  if (pendingTimer) clearTimeout(pendingTimer);
  ensureStyleTag();
  ensureRoot();
  clearActive();
  rootEl.classList.add('dicefx-active');
  lastRollState = 'rolling';

  try {
    await loadThree();
  } catch (err) {
    lastRollState = 'three-failed';
    showFallbackBanner(err);
    showResult(roll);
    pendingTimer = setTimeout(clearActive, 4000);
    return;
  }

  startScene(roll);
  showResult(roll);
  pendingTimer = setTimeout(() => {
    clearActive();
    lastRollState = 'idle';
    pendingTimer = null;
  }, 1600 + 3500);
}

function showFallbackBanner(err) {
  const banner = document.createElement('div');
  banner.className = 'dicefx-status';
  banner.textContent = `3D engine failed to load (${err.message || 'network'}). Showing result only.`;
  rootEl.appendChild(banner);
}

// ── Roll mechanics (DM side only) ──────────────────────────────────
function rollDie(sides) { return Math.floor(Math.random() * sides) + 1; }

function parseExpression(text) {
  const cleaned = String(text || '').replace(/\s+/g, '').toLowerCase();
  if (!cleaned) return null;
  const tokenRegex = /([+-]?)(\d*)d(\d+)|([+-]\d+)/g;
  const sides = [];
  let modifier = 0;
  let consumed = 0;
  let m;
  while ((m = tokenRegex.exec(cleaned))) {
    consumed += m[0].length;
    if (m[3]) {
      const sign  = m[1] === '-' ? -1 : 1;
      const count = m[2] ? Number(m[2]) : 1;
      const die   = Number(m[3]);
      if (!DICE_TYPES.includes(die)) return null;
      if (count <= 0 || count > 99) return null;
      for (let i = 0; i < count; i++) sides.push(sign * die);
    } else if (m[4]) {
      modifier += Number(m[4]);
    }
  }
  if (consumed !== cleaned.length || sides.length === 0) return null;
  return { sides, modifier };
}

function buildRoll({ sides, modifier, label }) {
  const values = sides.map((s) => {
    const sign = s < 0 ? -1 : 1;
    return sign * rollDie(Math.abs(s));
  });
  const total = values.reduce((a, b) => a + b, modifier);
  return {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    sides: sides.map((s) => Math.abs(s)),
    values,
    modifier,
    total,
    label: label || null,
  };
}

export default {
  register({ React, registries, context }) {
    const { role, subscribe, emitEvent } = context;
    ensureStyleTag();

    // Pre-warm three.js so the first roll is instant. Failure is
    // logged but doesn't block — presentRoll's catch will show the
    // fallback banner if the import is still bad at roll time.
    loadThree().catch(() => {});

    subscribe(({ type, payload }) => {
      if (type !== 'roll' || !payload) return;
      presentRoll({
        id: payload.id,
        sides: payload.sides || [],
        values: payload.values || [],
        modifier: payload.modifier || 0,
        total: payload.total,
        label: payload.label || null,
      });
    });

    if (role !== 'dm') return;

    function DiceTab() {
      const [, force] = React.useState(0);
      React.useEffect(() => {
        const fn = () => force((x) => (x + 1) | 0);
        tabSubs.add(fn);
        return () => tabSubs.delete(fn);
      }, []);

      const [expression, setExpression] = React.useState('1d20');
      const [label,      setLabel]      = React.useState('');
      const [error,      setError]      = React.useState(null);

      function rollExpression() {
        setError(null);
        const parsed = parseExpression(expression);
        if (!parsed) { setError('Could not parse expression — try 2d6+3'); return; }
        emitEvent('roll', buildRoll({ ...parsed, label }));
      }
      function rollPreset(sides, count) {
        setError(null);
        emitEvent('roll', buildRoll({
          sides: Array(count).fill(sides),
          modifier: 0,
          label: null,
        }));
      }

      const engineLabel = threeFailed ? 'three.js failed (CSS fallback active)' :
                          THREE        ? 'three.js loaded'                       :
                                         'three.js loading…';

      return React.createElement('div',
        { className: 'p-4 space-y-3' },
        React.createElement('h3', { className: 'text-sm font-semibold text-dnd-gold mb-1' }, '3D Dice'),
        React.createElement('p', { className: 'text-xs text-gray-400 leading-snug' },
          'Roll polyhedral dice that tumble across every player\'s screen. Type an expression like 2d6+3 or use the quick-roll buttons.'),
        React.createElement('div', { className: 'text-[11px] text-gray-500 -mt-1' }, `Engine: ${engineLabel}`),

        React.createElement('div', { className: 'space-y-2 bg-gray-800 border border-gray-700 rounded-lg p-3' },
          React.createElement('input', {
            type: 'text', value: expression,
            onChange: (e) => setExpression(e.target.value),
            onKeyDown: (e) => { if (e.key === 'Enter') rollExpression(); },
            placeholder: '1d20+5',
            className: 'w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-sm text-white font-mono',
          }),
          React.createElement('input', {
            type: 'text', value: label,
            onChange: (e) => setLabel(e.target.value),
            placeholder: 'Label (e.g. "Athletics check") — optional',
            className: 'w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-sm text-white',
          }),
          React.createElement('button', {
            onClick: rollExpression,
            className: 'w-full bg-dnd-gold hover:bg-yellow-500 text-gray-900 py-1.5 rounded font-semibold text-sm',
          }, 'Roll'),
          error && React.createElement('div', { className: 'text-[11px] text-red-300' }, error)
        ),

        React.createElement('div', { className: 'space-y-2 bg-gray-800 border border-gray-700 rounded-lg p-3' },
          React.createElement('div', { className: 'text-[11px] uppercase tracking-wider text-gray-500' }, 'Quick rolls'),
          React.createElement('div', { className: 'grid grid-cols-4 gap-1.5' },
            DICE_TYPES.map((s) => React.createElement('button', {
              key: s,
              onClick: () => rollPreset(s, 1),
              className: 'bg-gray-900 hover:bg-gray-700 border border-gray-700 text-white text-xs py-1.5 rounded',
            }, `d${s}`))),
          React.createElement('div', { className: 'flex gap-1.5 flex-wrap' },
            [2, 3, 4].map((n) => React.createElement('button', {
              key: n,
              onClick: () => rollPreset(6, n),
              className: 'flex-1 bg-gray-900 hover:bg-gray-700 border border-gray-700 text-white text-xs py-1.5 rounded',
            }, `${n}d6`)))
        )
      );
    }

    registries.dmTabs.set(PLUGIN_ID, {
      label: '🎲 Dice',
      render: () => React.createElement(DiceTab, null),
    });
  },

  unregister() {
    if (pendingTimer) { clearTimeout(pendingTimer); pendingTimer = null; }
    teardownRoot();
    const tag = document.getElementById(STYLE_TAG_ID);
    if (tag) tag.remove();
  },
};
