// 3D Dice — three.js polyhedra (and optional GLTF models bundled with
// the plugin) tumbling across a WebGL overlay. GM rolls; every player
// in the session sees the same dice land on the same numbers.
//
// Asset loading
// ─────────────
//   * Three.js itself is dynamic-imported from esm.sh (no build step
//     for plugins).
//   * Per-die GLB models, if present in the plugin folder
//     (`d4.glb`, `d6.glb`, …, `d20.glb`), are loaded via
//     three.js's GLTFLoader and used in place of the procedural
//     polyhedral geometry. The d20 ships in this plugin; missing
//     models fall back to TetrahedronGeometry / BoxGeometry / etc.
//
// Number reveal
// ─────────────
//   The dice tumble with **blank** faces — only the body colour is
//   visible during the roll. After the dice settle (~1.6 s), a
//   per-die DOM overlay positioned over the mesh's projected screen
//   coordinates fades in showing the rolled value. This is closer to
//   how a physical die works than painting the value on every face.

const PLUGIN_ID = 'dice-3d';
const STYLE_TAG_ID = 'plugin-dice-3d-style';
const ROOT_ID = 'plugin-dice-3d-root';
const THREE_CDN = 'https://esm.sh/three@0.160.0';
const GLTFLOADER_CDN = 'https://esm.sh/three@0.160.0/examples/jsm/loaders/GLTFLoader.js';

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

const ROLL_DURATION_MS = 1600;
const REVEAL_GRACE_MS  = 200;     // after raf loop ends, before number fades in

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
/* Dicefx-number is no longer a DOM overlay — see the Plane decal
   approach inside the THREE scene (spawnFaceDecals + makeNumberTexture).
   Selector kept here so any stale DOM nodes from older builds get
   styled inertly while they hang around. */
.dicefx-number { display: none; }
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
  animation-delay: ${(ROLL_DURATION_MS + REVEAL_GRACE_MS) / 1000}s; opacity: 0;
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
@keyframes dicefx-numfade {
  0%   { opacity: 0; transform: translate(-50%, -50%) scale(0.35); }
  55%  { opacity: 1; transform: translate(-50%, -50%) scale(1.15); }
  100% { opacity: 1; transform: translate(-50%, -50%) scale(1.0); }
}
`;

let rootEl = null;
let canvasEl = null;
let resultEl = null;
let pendingTimer = null;
let raf = null;
let scene = null, camera = null, renderer = null;
let activeDice = [];          // [{ mesh, start, end, delay, duration, sides, value, slotIndex }]

let threePromise = null;
let THREE = null;
let threeFailed = false;

let gltfLoaderPromise = null;
let GLTFLoaderClass = null;

// Map sides → loaded `THREE.Object3D` (root scene from the GLB). null
// means "no model available, use procedural geometry". We attempt to
// load every well-known size; missing files are fine — failure just
// drops back to the polyhedral primitive.
const dieModels = new Map();

const tabSubs = new Set();
function pingTab() { for (const fn of tabSubs) try { fn(); } catch {} }

// ── Per-session colour overrides ───────────────────────────────────
// `dieColors[sides]` overrides DIE_TINTS for that die kind. Persisted
// in plugin KV under `colors_<sessionId>` so each campaign gets its
// own palette. Cross-client sync rides on the host's `data` write
// auto-broadcast (PLUGINS.md §6).
let dieColors = {};
let savedDataApi = null;
let savedSocket = null;
let hostRollListener = null;       // socket handler we register so we can detach in unregister
function tintFor(sides) {
  return dieColors[sides] || DIE_TINTS[sides] || '#facc15';
}

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

async function loadGLTFLoader() {
  if (GLTFLoaderClass) return GLTFLoaderClass;
  if (!gltfLoaderPromise) {
    gltfLoaderPromise = import(/* @vite-ignore */ GLTFLOADER_CDN).then((mod) => {
      GLTFLoaderClass = mod.GLTFLoader;
      return GLTFLoaderClass;
    });
  }
  return gltfLoaderPromise;
}

// Try to load a GLB file from the plugin's static-asset path. Resolves
// to `null` if the file isn't there (404 / parse fail / etc.) — the
// caller falls back to procedural geometry. We only attempt this once
// per side per page-load and memoise the result.
async function tryLoadDieModel(sides) {
  if (dieModels.has(sides)) return dieModels.get(sides);
  // First check the file exists. The plugin manager 404s missing
  // assets, and GLTFLoader's own onError callback fires too late to
  // cleanly fall through.
  const url = `/api/plugins/${PLUGIN_ID}/asset/d${sides}.glb`;
  const head = await fetch(url, { method: 'HEAD' }).catch(() => null);
  if (!head || !head.ok) {
    dieModels.set(sides, null);
    return null;
  }
  try {
    const Loader = await loadGLTFLoader();
    const loader = new Loader();
    const gltf = await new Promise((resolve, reject) => {
      loader.load(url, resolve, undefined, reject);
    });
    const root = gltf.scene || gltf.scenes?.[0] || null;
    dieModels.set(sides, root);
    return root;
  } catch (err) {
    console.warn(`dice-3d: failed to load d${sides}.glb`, err);
    dieModels.set(sides, null);
    return null;
  }
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
  rootEl = null; canvasEl = null; resultEl = null;
}

function clearActive() {
  if (raf) { cancelAnimationFrame(raf); raf = null; }
  activeDice = [];
  if (rootEl) rootEl.classList.remove('dicefx-active');
  if (canvasEl) canvasEl.remove(); canvasEl = null;
  if (resultEl) resultEl.remove(); resultEl = null;
  // Strip any stale number overlays.
  if (rootEl) {
    rootEl.querySelectorAll('.dicefx-number').forEach((n) => n.remove());
  }
  if (renderer) { try { renderer.dispose(); } catch {} renderer = null; }
  scene = null; camera = null;
}

// ── Geometry / mesh construction ───────────────────────────────────

function lightenHex(hex, amount) {
  const m = hex.match(/^#?([a-f0-9]{2})([a-f0-9]{2})([a-f0-9]{2})$/i);
  if (!m) return hex;
  const mix = (c) => Math.round(c + (255 - c) * amount);
  const r = mix(parseInt(m[1], 16));
  const g = mix(parseInt(m[2], 16));
  const b = mix(parseInt(m[3], 16));
  return `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`;
}

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

// Build an Object3D for a single die: clone the loaded GLB scene if
// available, otherwise build from primitive geometry. In both cases
// the body colour is the only thing visible during the roll — face
// numbering is handled by the post-roll DOM overlay.
function buildDieMesh(sides) {
  const tint = tintFor(sides);
  const material = new THREE.MeshStandardMaterial({
    color: tint,
    flatShading: true,
    roughness: 0.5,
    metalness: 0.15,
  });

  const model = dieModels.get(sides);
  if (model) {
    // Clone deep so each die gets its own transform. Override every
    // mesh material so the model's bundled materials don't render with
    // their pre-baked numbers (which we don't want during the tumble).
    const root = model.clone(true);
    root.traverse((node) => {
      if (node.isMesh) node.material = material;
    });
    // Normalise scale so the model fits the same envelope the
    // procedural primitives use. Bounding-sphere diagonal ≈ 2.2 is
    // about right for "dice next to each other in a row".
    const bbox = new THREE.Box3().setFromObject(root);
    const size = bbox.getSize(new THREE.Vector3()).length();
    if (size > 0) root.scale.setScalar(2.2 / size);
    return root;
  }

  return new THREE.Mesh(geometryForSides(sides), material);
}

function buildDie(sides, value, slotIndex, totalDice) {
  const mesh = buildDieMesh(sides);

  const totalSpan = (totalDice - 1) * 1.6;
  const finalX = -totalSpan / 2 + slotIndex * 1.6;
  const finalY = 0;
  const finalZ = 0;

  const startX = -7 - Math.random() * 2;
  const startY =  3 + Math.random() * 2;
  const startZ = -3 - Math.random() * 2;

  mesh.position.set(startX, startY, startZ);
  mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);

  const spinX = (4 + Math.random() * 2) * Math.PI * 2;
  const spinY = (4 + Math.random() * 2) * Math.PI * 2;
  const spinZ = (2 + Math.random() * 2) * Math.PI * 2;

  return {
    mesh,
    sides,
    value,
    slotIndex,
    delay: slotIndex * 80,
    duration: ROLL_DURATION_MS,
    start: { x: startX, y: startY, z: startZ, rx: mesh.rotation.x, ry: mesh.rotation.y, rz: mesh.rotation.z },
    end:   { x: finalX, y: finalY, z: finalZ, rx: mesh.rotation.x + spinX, ry: mesh.rotation.y + spinY, rz: mesh.rotation.z + spinZ },
  };
}

function easeOutBack(t) {
  const c1 = 1.30; const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}
function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

// ── Number reveal (face decals) ────────────────────────────────────
// After the dice come to rest, drop a small textured plane on top of
// the visible face of each die. The plane is COPLANAR with the face
// (its normal matches the face normal), positioned at the face centre
// with a tiny offset along the normal to avoid z-fighting, and
// oriented so the digit reads upright from the camera's POV. Material
// opacity tweens 0 → 1 in the raf loop so the digit "fades in" once
// the dice settle. The face is selected by camera-facing dot product
// (not world-up) — that's the face the player sees, and the one a
// physical d20 would call "the rolled value".

// Approximate face size per die kind. The cube has the largest face
// (~1.3 wide); polyhedra with many small triangular faces (icosa, octa)
// use smaller decals so the digit doesn't bleed past the edges.
const FACE_DECAL_SIZE = {
  4:   0.55,
  6:   1.05,
  8:   0.55,
  10:  0.60,
  12:  0.85,
  20:  0.55,
  100: 0.60,
};

const REVEAL_FADE_MS = 650;

// Scratch vectors allocated lazily after THREE has loaded. `new
// THREE.Vector3()` at module scope would throw at parse time — `let`
// + lazy init keeps the file syntactically valid before the dynamic
// import resolves.
let _vA, _vB, _vC, _ab, _ac, _normal, _camPos, _camForward, _faceUp, _faceRight;
function ensureScratch() {
  if (_vA) return;
  _vA = new THREE.Vector3();
  _vB = new THREE.Vector3();
  _vC = new THREE.Vector3();
  _ab = new THREE.Vector3();
  _ac = new THREE.Vector3();
  _normal = new THREE.Vector3();
  _camPos = new THREE.Vector3();
  _camForward = new THREE.Vector3();
  _faceUp = new THREE.Vector3();
  _faceRight = new THREE.Vector3();
}

// Build a transparent 256×256 canvas texture with the digit centred,
// outlined for legibility, and a soft tint glow. Re-applied per die
// per roll — small enough that texture creation is cheap.
function makeNumberTexture(value, tintHex) {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, size, size);

  const fontSize = String(value).length >= 3 ? 130 : 175;
  ctx.font = `800 ${fontSize}px "Cinzel", Georgia, serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Soft tinted glow under the numeral.
  ctx.shadowColor = tintHex;
  ctx.shadowBlur  = 32;
  ctx.fillStyle   = 'rgba(0,0,0,0.0)';
  ctx.fillText(String(value), size / 2, size / 2 + 8);

  // Hard outline so the digit reads on any face colour.
  ctx.shadowBlur = 0;
  ctx.lineJoin = 'round';
  ctx.lineWidth = 14;
  ctx.strokeStyle = '#1a1a2e';
  ctx.strokeText(String(value), size / 2, size / 2 + 8);

  // Underline 6 / 9 so the player can tell which way is up.
  ctx.fillStyle = '#f4e4bc';
  ctx.fillText(String(value), size / 2, size / 2 + 8);
  if (value === 6 || value === 9) {
    ctx.fillRect(size / 2 - 32, size / 2 + fontSize * 0.42, 64, 8);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

// Walk every triangle in `root` and return the camera-facing face's
// world-space centre + outward normal. "Camera-facing" beats "world
// up" here — the player wants the digit on the face they SEE, not on
// whichever face is closest to +Y. Co-planar triangles (e.g. the two
// halves of a cube quad, the five wedges of a dodecahedron pentagon)
// are merged into a single face so the centre lands on the face's
// geometric centre, not on one of the sub-triangle centroids.
const COPLANAR_DOT = 0.985;       // ~10° tolerance — generous enough for normalised GLB faces
function findCameraFacingFace(root) {
  if (!root || !THREE || !camera) return null;
  ensureScratch();
  root.updateMatrixWorld(true);
  camera.getWorldPosition(_camPos);

  // First pass: collect per-triangle world-space normal + centroid.
  const tris = [];
  root.traverse((node) => {
    if (!node.isMesh || !node.geometry) return;
    const geom = node.geometry;
    const positions = geom.attributes.position;
    if (!positions) return;
    const indexAttr = geom.index;
    const triCount = indexAttr ? Math.floor(indexAttr.count / 3) : Math.floor(positions.count / 3);
    const matrixWorld = node.matrixWorld;
    for (let i = 0; i < triCount; i++) {
      const i0 = indexAttr ? indexAttr.getX(i * 3)     : i * 3;
      const i1 = indexAttr ? indexAttr.getX(i * 3 + 1) : i * 3 + 1;
      const i2 = indexAttr ? indexAttr.getX(i * 3 + 2) : i * 3 + 2;
      _vA.fromBufferAttribute(positions, i0).applyMatrix4(matrixWorld);
      _vB.fromBufferAttribute(positions, i1).applyMatrix4(matrixWorld);
      _vC.fromBufferAttribute(positions, i2).applyMatrix4(matrixWorld);
      _ab.subVectors(_vB, _vA);
      _ac.subVectors(_vC, _vA);
      _normal.crossVectors(_ab, _ac);
      const len = _normal.length();
      if (len < 1e-6) continue;
      _normal.divideScalar(len);
      tris.push({
        normal: _normal.clone(),
        centroid: new THREE.Vector3(
          (_vA.x + _vB.x + _vC.x) / 3,
          (_vA.y + _vB.y + _vC.y) / 3,
          (_vA.z + _vB.z + _vC.z) / 3,
        ),
      });
    }
  });
  if (tris.length === 0) return null;

  // Pick the triangle whose normal points most directly at the camera.
  // Vector from triangle centroid → camera, dotted with the normal.
  let best = null;
  let bestDot = -Infinity;
  for (const t of tris) {
    const toCam = _camPos.clone().sub(t.centroid).normalize();
    const dot = t.normal.dot(toCam);
    if (dot > bestDot) {
      bestDot = dot;
      best = t;
    }
  }
  if (!best) return null;

  // Second pass: average the centroids of every triangle whose normal
  // lies within COPLANAR_DOT of the chosen face. For a cube quad this
  // picks up both halves; for a dodecahedron pentagon all five wedges.
  let sumX = 0, sumY = 0, sumZ = 0, count = 0;
  for (const t of tris) {
    if (t.normal.dot(best.normal) >= COPLANAR_DOT) {
      sumX += t.centroid.x; sumY += t.centroid.y; sumZ += t.centroid.z;
      count += 1;
    }
  }
  return {
    center: new THREE.Vector3(sumX / count, sumY / count, sumZ / count),
    normal: best.normal.clone(),
  };
}

// Mount per-die decal planes on the camera-facing face. Plane geometry
// has its normal along +Z by default, so we orient it via a
// world-basis matrix: face normal → +Z, world-up projected onto the
// face plane → +Y. The opacity tween is driven inside the raf loop.
function spawnFaceDecals() {
  if (!scene || !camera || !THREE) return;
  ensureScratch();
  const SURFACE_LIFT = 0.012;       // tiny offset along face normal to dodge z-fighting

  for (const die of activeDice) {
    if (die.decal) continue;        // already mounted (defensive)
    const face = findCameraFacingFace(die.mesh);
    if (!face) continue;

    const tint = tintFor(die.sides);
    const tex = makeNumberTexture(die.value, tint);
    const decalSize = FACE_DECAL_SIZE[die.sides] || 0.55;
    const geom = new THREE.PlaneGeometry(decalSize, decalSize);
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      opacity: 0,
      depthTest: true,
      depthWrite: false,            // sit on top of the die without hiding it during fade
      side: THREE.DoubleSide,
    });
    const plane = new THREE.Mesh(geom, mat);

    // Orient the plane: face normal becomes +Z, the in-face "up"
    // direction becomes +Y. The "up" reference is anchored to the
    // DIE's local frame (not world up), so the digit rotates with the
    // die — if the die lands tilted, the number tilts with it.
    //
    // Strategy: try each of the die's local axes (+Y, then +Z, then
    // +X) and pick whichever is most perpendicular to the face normal
    // — that's the axis that projects most cleanly onto the face
    // plane. For a cube this avoids the degenerate "face normal IS
    // local +Y" case naturally; for icosa/dodeca every axis is far
    // from the face normal so the first try wins.
    const dieMatrix = die.mesh.matrixWorld;
    const localCandidates = [
      [0, 1, 0],   // prefer the die's local up
      [0, 0, 1],
      [1, 0, 0],
    ];
    let bestPerp = -Infinity;
    let bestWorldRef = null;
    const tmpRef = new THREE.Vector3();
    for (const [lx, ly, lz] of localCandidates) {
      tmpRef.set(lx, ly, lz).transformDirection(dieMatrix);
      // 1 - |dot(face_normal, axis)| → 1 when axis lies in face plane,
      // 0 when axis is parallel to the face normal.
      const perp = 1 - Math.abs(tmpRef.dot(face.normal));
      if (perp > bestPerp) {
        bestPerp = perp;
        bestWorldRef = tmpRef.clone();
      }
    }
    // Project the chosen reference axis onto the face plane.
    _faceUp.copy(bestWorldRef).addScaledVector(face.normal, -face.normal.dot(bestWorldRef));
    if (_faceUp.lengthSq() < 1e-4) {
      // Vanishingly rare, but cover it: face normal is somehow exactly
      // every local axis. Pick any in-face direction so we don't NaN.
      _faceUp.set(0, 1, 0).cross(face.normal);
      if (_faceUp.lengthSq() < 1e-4) _faceUp.set(1, 0, 0).cross(face.normal);
    }
    _faceUp.normalize();
    _faceRight.crossVectors(_faceUp, face.normal).normalize();

    const basis = new THREE.Matrix4().makeBasis(_faceRight, _faceUp, face.normal);
    plane.setRotationFromMatrix(basis);
    plane.position.copy(face.center).addScaledVector(face.normal, SURFACE_LIFT);

    scene.add(plane);
    die.decal = plane;
    die.decalSpawnedAt = performance.now();
  }
}

function startScene(roll) {
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

  activeDice = [];
  for (let i = 0; i < roll.values.length; i++) {
    const die = buildDie(roll.sides[i], roll.values[i], i, roll.values.length);
    scene.add(die.mesh);
    activeDice.push(die);
  }

  const startTs = performance.now();
  let decalsSpawned = false;
  function frame(now) {
    const elapsed = now - startTs;
    let tumbleDone = true;
    for (const die of activeDice) {
      const localT = Math.max(0, Math.min(1, (elapsed - die.delay) / die.duration));
      if (localT < 1) tumbleDone = false;
      const tEase = easeOutCubic(localT);
      const tBack = easeOutBack(localT);
      die.mesh.position.x = die.start.x + (die.end.x - die.start.x) * tBack;
      die.mesh.position.y = die.start.y + (die.end.y - die.start.y) * tEase;
      die.mesh.position.z = die.start.z + (die.end.z - die.start.z) * tEase;
      die.mesh.rotation.x = die.start.rx + (die.end.rx - die.start.rx) * tEase;
      die.mesh.rotation.y = die.start.ry + (die.end.ry - die.start.ry) * tEase;
      die.mesh.rotation.z = die.start.rz + (die.end.rz - die.start.rz) * tEase;
    }

    // Once the dice have come to rest, mount the face decals (the
    // numerals) and tween their opacity over REVEAL_FADE_MS. Decals
    // are mounted ONCE — guarded by `decalsSpawned`. A short grace
    // before mounting makes the dice visibly settle before the
    // numbers appear.
    if (tumbleDone && !decalsSpawned && elapsed >= ROLL_DURATION_MS + REVEAL_GRACE_MS) {
      spawnFaceDecals();
      decalsSpawned = true;
    }
    if (decalsSpawned) {
      for (const die of activeDice) {
        if (!die.decal) continue;
        const fadeT = Math.max(0, Math.min(1,
          (now - die.decalSpawnedAt) / REVEAL_FADE_MS));
        // EaseOutCubic so the digit settles instead of linearly stamping in.
        die.decal.material.opacity = easeOutCubic(fadeT);
      }
    }

    renderer.render(scene, camera);

    // Keep the loop alive through the tumble + grace + fade, then
    // stop. The scene is static after the fade completes so we don't
    // need to keep re-rendering — the canvas keeps the last frame.
    const totalAnimMs = ROLL_DURATION_MS + REVEAL_GRACE_MS + REVEAL_FADE_MS + 80;
    if (elapsed < totalAnimMs) {
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

  try {
    await loadThree();
  } catch (err) {
    showFallbackBanner(err);
    showResult(roll);
    pendingTimer = setTimeout(clearActive, 4000);
    return;
  }

  // Best-effort try to load any GLB models for the sides in this roll.
  // tryLoadDieModel is memoised, so a second roll skips the fetches.
  const uniqueSides = Array.from(new Set(roll.sides));
  await Promise.all(uniqueSides.map((s) => tryLoadDieModel(s).catch(() => null)));

  startScene(roll);
  showResult(roll);
  // 1.6s tumble + ~0.7s number fade + ~3s read time.
  pendingTimer = setTimeout(() => {
    clearActive();
    pendingTimer = null;
  }, ROLL_DURATION_MS + REVEAL_GRACE_MS + 3500);
}

function showFallbackBanner(err) {
  const banner = document.createElement('div');
  banner.className = 'dicefx-status';
  banner.textContent = `3D engine failed to load (${err.message || 'network'}). Showing result only.`;
  rootEl.appendChild(banner);
}

// ── Roll mechanics (GM side only) ──────────────────────────────────
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
    const { role, subscribe, emitEvent, data, sessionId, socket } = context;
    savedDataApi = data;
    savedSocket = socket;
    const COLORS_KEY = `colors_${sessionId != null ? sessionId : 'global'}`;

    ensureStyleTag();

    // Pre-warm three.js so the first roll is instant. Failure is
    // logged but doesn't block — presentRoll's catch will show the
    // fallback banner if the import is still bad at roll time.
    loadThree().catch(() => {});
    // Pre-warm the d20 model too (the only one we ship right now).
    loadThree().then(() => tryLoadDieModel(20)).catch(() => {});

    // ── Hydrate per-die colour overrides from KV ───────────────────
    data.read(COLORS_KEY).then((row) => {
      if (row && typeof row === 'object') dieColors = { ...row };
      pingTab();
    }).catch(() => { /* network blip — leave defaults */ });

    subscribe(({ type, payload }) => {
      if (type === 'roll' && payload) {
        presentRoll({
          id: payload.id,
          sides: payload.sides || [],
          values: payload.values || [],
          modifier: payload.modifier || 0,
          total: payload.total,
          label: payload.label || null,
        });
        return;
      }
      // Cross-client colour sync. The host's auto-broadcast on
      // data.write echoes our own write back too — re-applying the
      // same colours is idempotent so we don't filter sender.
      if (type === 'data' && payload?.key === COLORS_KEY) {
        if (payload.op === 'delete') dieColors = {};
        if (payload.op === 'write')  dieColors = { ...(payload.value || {}) };
        pingTab();
      }
    });

    // ── Hijack the host's built-in dice roller ─────────────────────
    // The host emits `dice_rolled` to every client whenever someone
    // uses the built-in DiceRoller (Session tab → Dice). We listen
    // and replay that roll through our 3D presenter so even the
    // built-in roller animates. Translates the host's payload shape
    // ({dice:'d20', count, modifier, rolls, total}) into the plugin's
    // ({sides:[...], values:[...], modifier, total}) shape.
    if (socket) {
      hostRollListener = (host) => {
        if (!host || !host.dice) return;
        const sides = parseInt(String(host.dice).replace(/^d/i, ''), 10);
        if (!Number.isFinite(sides) || sides < 2) return;
        const values = Array.isArray(host.rolls) ? host.rolls.slice() : [];
        if (values.length === 0) return;
        const speakerLabel = host.userName
          ? `${host.userName}${host.label ? ' — ' + host.label : ''}`
          : (host.label || null);
        presentRoll({
          id: `host-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
          sides: Array(values.length).fill(sides),
          values,
          modifier: Number(host.modifier) || 0,
          total: Number(host.total) || values.reduce((a, b) => a + b, 0) + (host.modifier || 0),
          label: speakerLabel,
        });
      };
      socket.on('dice_rolled', hostRollListener);
    }

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

      function setDieColor(sides, color) {
        const next = { ...dieColors };
        if (color && color.toLowerCase() !== (DIE_TINTS[sides] || '').toLowerCase()) {
          next[sides] = color;
        } else {
          delete next[sides];        // user re-selected the default → remove the override
        }
        dieColors = next;
        pingTab();
        if (savedDataApi) {
          if (Object.keys(next).length === 0) savedDataApi.delete(COLORS_KEY);
          else                                 savedDataApi.write(COLORS_KEY, next);
        }
      }
      function resetAllColors() {
        dieColors = {};
        pingTab();
        if (savedDataApi) savedDataApi.delete(COLORS_KEY);
      }

      const engineLabel = threeFailed ? 'three.js failed (no animation)' :
                          THREE        ? 'three.js loaded'                :
                                         'three.js loading…';
      const d20ModelStatus = dieModels.has(20)
        ? (dieModels.get(20) ? 'd20 model: loaded' : 'd20 model: not present (procedural)')
        : 'd20 model: pending';

      return React.createElement('div',
        { className: 'p-4 space-y-3' },
        React.createElement('h3', { className: 'text-sm font-semibold text-dnd-gold mb-1' }, '3D Dice'),
        React.createElement('p', { className: 'text-xs text-gray-400 leading-snug' },
          'Roll polyhedral dice that tumble across every player\'s screen. Faces are blank during the roll; the result fades in once the dice come to rest. Drop GLB files into the plugin folder (`d4.glb`, `d6.glb`, … `d20.glb`) to use real 3D models in place of the procedural geometry.'),
        React.createElement('div', { className: 'text-[11px] text-gray-500 -mt-1' }, `Engine: ${engineLabel} · ${d20ModelStatus}`),

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
        ),

        // ── Per-die colour overrides ──
        React.createElement('div', { className: 'space-y-2 bg-gray-800 border border-gray-700 rounded-lg p-3' },
          React.createElement('div', { className: 'flex items-center justify-between' },
            React.createElement('span', { className: 'text-[11px] uppercase tracking-wider text-gray-500' }, 'Dice colours'),
            Object.keys(dieColors).length > 0 && React.createElement('button', {
              onClick: resetAllColors,
              className: 'text-[10px] text-gray-500 hover:text-red-300',
            }, 'Reset all')),
          React.createElement('p', { className: 'text-[11px] text-gray-500 leading-snug -mt-1' },
            'Each die kind keeps its own colour. Synced to every player in the session — no rebuild needed.'),
          React.createElement('div', { className: 'grid grid-cols-2 gap-1.5' },
            DICE_TYPES.map((s) => {
              const current = tintFor(s);
              const isCustom = !!dieColors[s];
              return React.createElement('label',
                { key: s, className: 'flex items-center gap-2 bg-gray-900 border border-gray-700 rounded px-2 py-1' },
                React.createElement('span', {
                  className: 'text-xs text-gray-200 w-10 shrink-0',
                  style: { color: current },
                }, `d${s}`),
                React.createElement('input', {
                  type: 'color',
                  value: current,
                  onChange: (e) => setDieColor(s, e.target.value),
                  className: 'w-7 h-6 rounded cursor-pointer bg-transparent border border-gray-700',
                }),
                React.createElement('input', {
                  type: 'text',
                  value: current,
                  onChange: (e) => /^#[0-9a-fA-F]{0,6}$/.test(e.target.value) && setDieColor(s, e.target.value),
                  className: 'flex-1 min-w-0 bg-gray-800 border border-gray-700 rounded px-1.5 py-0.5 text-[11px] text-white font-mono',
                }),
                isCustom && React.createElement('button', {
                  onClick: () => setDieColor(s, DIE_TINTS[s] || '#facc15'),
                  className: 'text-[10px] text-gray-500 hover:text-gray-300 shrink-0',
                  title: 'Reset this die to default colour',
                }, '↺')
              );
            }))
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
    // Detach the host-roll listener so the built-in DiceRoller stops
    // triggering 3D animations once the plugin is off.
    if (savedSocket && hostRollListener) {
      try { savedSocket.off('dice_rolled', hostRollListener); } catch {}
    }
    hostRollListener = null;
    savedSocket = null;
    teardownRoot();
    const tag = document.getElementById(STYLE_TAG_ID);
    if (tag) tag.remove();
  },
};
