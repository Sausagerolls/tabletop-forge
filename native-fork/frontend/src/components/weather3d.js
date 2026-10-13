// Weather in the 3D view.
//
// Reads the weather-effects plugin's state through the view-agnostic
// `mapWeather` registry (see pluginRegistry.js) and renders it in this
// view's own terms. The flat map draws the same state as canvas particles;
// this draws it on the GPU. One state, two renderers, so the GM's slider
// moves both skies at once.
//
//
// WHY IT IS BUILT THIS WAY
// ────────────────────────
// Two constraints decided nearly every choice here.
//
// 1. The camera never drops below the horizon — Map3DView pins
//    OrbitControls at maxPolarAngle = PI * 0.49. Players always look DOWN at
//    the board and are never stood inside the weather looking through it. So
//    precipitation only ever sits between the camera and the ground, which is
//    a much smaller problem than weather in a first-person game.
//
// 2. This app ships as an iOS build, so a phone or tablet GPU has to run it
//    at the same time as the rest of the scene. On those tile-based parts the
//    cost that matters is OVERDRAW — alpha-blended fragments stacked on each
//    other — not particle count. Everything below is shaped around spending
//    as few blended fragments as possible.
//
//
// COST
// ────
// Two draw calls: one LineSegments for rain, one Points for snow. Nothing is
// allocated per frame and nothing loops over particles on the CPU — a frame
// updates a handful of uniforms and the vertex shader does the rest. The
// buffers are allocated once at full size and `uActive` scales how many of
// them are alive, so changing intensity never touches a buffer.
//
// Cost is also INDEPENDENT OF MAP SIZE. The particles live in a box that
// rides with the camera and wrap around it modulo the box, so a 200x200
// board costs exactly what a 20x20 one does. Filling a whole map with
// particles would have made big maps unplayable, and this app has them.
//
//
// STAYING OUT OF THE WAY
// ──────────────────────
// A VTT is not a screensaver: players have to read token names, judge
// distances and spot terrain through whatever this draws. Four terms in the
// shader protect that, and all four are free because they only scale an
// alpha that is being computed anyway.
//
//   * near-field cull — nothing renders within a few feet of the camera.
//     This is the one that matters most. Without it you get drops apparently
//     stuck to the lens, which is the single thing that makes weather in a
//     top-down game unusable.
//   * centre falloff — alpha drops toward the middle of the screen, where
//     the player is actually looking, and comes up at the edges. The mood
//     lands in peripheral vision and the tactical picture stays clear.
//   * ceiling clip — nothing draws above the storey the viewer is on, so
//     rain does not fall through the floor above them.
//   * exclusion masks — the GM's dry areas, honoured per particle. See below.
//
// On top of that the viewer's own clamp (`intensityScale`) scales the lot,
// down to nothing. The GM says what the weather IS; the player decides how
// much of it their eyes and their device take.
//
//
// THE MASKS
// ─────────
// The plugin lets a GM draw freehand polygons where weather must not fall —
// the inn's roof, a cave mouth, an awning. Honouring `layers` while ignoring
// `masks` would be worse than drawing no weather at all, because it would
// quietly contradict something the GM deliberately set up.
//
// Testing a particle against a polygon set per frame is far too expensive, so
// the polygons are rasterised ONCE into a small alpha texture in map space
// (rebuilt only when the GM edits one) and the vertex shader samples it at
// the particle's own XZ. Exact, one texture fetch, and it reuses the mask
// data that already exists rather than inventing a second way to say it.
//
// The blur applied when rasterising is the plugin's own `feather` value, so
// mask edges soften in 3D the same way and by the same amount as on the flat
// map.
import * as THREE from 'three';

// Allocated once, then `uActive` decides how many are alive. Sized for the
// heaviest storm a GM can dial in; a light drizzle uses the same buffers.
const MAX_RAIN = 3000;
const MAX_SNOW = 2000;

// Resolution of the rasterised mask. The masks are soft-edged blobs, not
// text — 256 across a whole map is plenty, and it keeps the texture at 64KB
// so rebuilding one mid-session is not felt.
const MASK_RES = 256;

// Feet of clearance in front of the camera where nothing draws. Below this
// the particles read as dirt on the lens rather than weather in the world.
const NEAR_CULL_FT = 14;

// How much of full alpha survives at the dead centre of the screen. The
// remainder fades back in toward the edges.
const CENTRE_CLEAR = 0.3;

// Shared by both shaders: turns a particle's world position into an alpha,
// applying every "stay out of the way" rule in one place so rain and snow
// cannot drift apart on the ones that matter.
const ALPHA_CHUNK = /* glsl */`
uniform vec2  uMapSize;     // map pixels
uniform float uFtPerPx;
uniform sampler2D uMask;    // 1 = weather allowed, 0 = GM marked it dry
uniform float uHasMask;
uniform float uCeilingY;    // world Y of the storey above, or huge
uniform float uNearCull;
uniform float uCentreClear;
uniform float uOpacity;   // the layer's own strength, applied by the caller

float weatherAlpha(vec3 wp, vec4 clipPos) {
  // Nothing on the lens.
  float d = distance(wp, cameraPosition);
  float a = smoothstep(uNearCull, uNearCull * 2.4, d);

  // Nothing above the ceiling of the storey being viewed.
  a *= step(wp.y, uCeilingY);

  // Nothing where the GM drew a roof. World XZ back to map pixels, then to
  // UV — the inverse of the transform Map3DView uses to place everything
  // else, so a mask lands exactly where the GM drew it on the flat map.
  if (uHasMask > 0.5) {
    vec2 mp = vec2(wp.x / uFtPerPx + uMapSize.x * 0.5,
                   wp.z / uFtPerPx + uMapSize.y * 0.5);
    a *= texture2D(uMask, mp / uMapSize).r;
  }

  // Thinner where the player is looking, fuller at the edges.
  vec2 ndc = clipPos.xy / max(abs(clipPos.w), 0.0001);
  a *= mix(uCentreClear, 1.0, smoothstep(0.15, 1.05, length(ndc)));

  return a;
}
`;

// Position within the camera-anchored box, wrapped modulo the box so the
// particles are anchored to the WORLD (they scroll past on the wind) while
// the set of them always surrounds wherever the camera is looking. Without
// the wrap the weather would either be glued to the camera, which reads as
// fake the moment you pan, or would have to cover the whole map, which does
// not survive a big one.
const PLACE_CHUNK = /* glsl */`
uniform float uTime;
uniform vec2  uAnchor;      // camera target, world XZ
uniform vec3  uBox;         // extent of the live volume, feet
uniform vec2  uWind;        // unit vector, direction it blows toward
uniform float uFall;        // feet per second, straight down
uniform float uDrift;       // feet per second, along the wind
uniform float uGroundY;
uniform float uActive;      // 0..1 of the buffer that is alive

vec3 placeParticle(vec4 seed, float sway) {
  vec2 drift = uWind * uTime * uDrift;
  float y = uGroundY + mod(seed.y * uBox.y - uTime * uFall, uBox.y);
  vec2 xz = mod(seed.xz * uBox.xz + drift - uAnchor + uBox.xz * 0.5, uBox.xz)
            - uBox.xz * 0.5 + uAnchor;
  // Snow wanders on the way down; rain passes 0 and falls straight.
  xz += sway * vec2(sin(uTime * 0.7 + seed.w * 6.283),
                    cos(uTime * 0.5 + seed.w * 6.283));
  return vec3(xz.x, y, xz.y);
}
`;

// A 1x1 opaque white texture, standing in whenever the GM has drawn no
// exclusion masks.
//
// This is not a nicety. Binding `null` to a sampler2D leaves the uniform
// pointing at texture unit 0 with nothing complete bound to it. The sample is
// guarded by `if (uHasMask > 0.5)`, but that branch is evaluated at RUN time,
// not eliminated at compile time, so the draw call still references an
// incomplete texture — and Metal-backed WebGL (Safari, the iOS build, and
// Chrome on macOS) rejects the whole draw rather than ignoring it. The result
// is silent: no error in the console, and no weather at all.
//
// White means "weather falls here", so the stand-in is also the correct
// no-masks answer rather than a special case in the shader.
let _blankMask = null;
function blankMask() {
  if (!_blankMask) {
    _blankMask = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
    // Explicit rather than defaulted: a 1x1 texture with mipmaps requested and
    // none generated is itself incomplete, which would reintroduce the very
    // problem this stand-in exists to avoid.
    _blankMask.minFilter = THREE.NearestFilter;
    _blankMask.magFilter = THREE.NearestFilter;
    _blankMask.generateMipmaps = false;
    _blankMask.needsUpdate = true;
  }
  return _blankMask;
}

function baseUniforms() {
  return {
    uTime:        { value: 0 },
    uAnchor:      { value: new THREE.Vector2() },
    uBox:         { value: new THREE.Vector3(160, 90, 160) },
    uWind:        { value: new THREE.Vector2(0, 1) },
    uFall:        { value: 60 },
    uDrift:       { value: 21 },
    uGroundY:     { value: 0 },
    uActive:      { value: 1 },
    uOpacity:     { value: 1 },
    uColor:       { value: new THREE.Color('#cfe0f5') },
    uMapSize:     { value: new THREE.Vector2(1000, 1000) },
    uFtPerPx:     { value: 0.1 },
    uMask:        { value: blankMask() },
    uHasMask:     { value: 0 },
    uCeilingY:    { value: 1e6 },
    uNearCull:    { value: NEAR_CULL_FT },
    uCentreClear: { value: CENTRE_CLEAR },
  };
}

// ── Rain ────────────────────────────────────────────────────────────────────
//
// LineSegments rather than Points: a raindrop is a streak, and a round point
// sprite stretched into one would cost a quad's worth of blended fragments
// per drop for a shape that is mostly empty. Two verts and a thin line is
// both cheaper and more like rain. The tail is offset up-wind in the vertex
// shader, so the streak leans with the wind for free.
function makeRain() {
  const g = new THREE.BufferGeometry();
  const seed = new Float32Array(MAX_RAIN * 2 * 4);
  const end = new Float32Array(MAX_RAIN * 2);
  for (let i = 0; i < MAX_RAIN; i++) {
    const s = [Math.random(), Math.random(), Math.random(), Math.random()];
    for (let v = 0; v < 2; v++) {
      const o = (i * 2 + v) * 4;
      seed[o] = s[0]; seed[o + 1] = s[1]; seed[o + 2] = s[2]; seed[o + 3] = s[3];
      end[i * 2 + v] = v; // 0 = head, 1 = tail
    }
  }
  // Positions are computed in the shader; this only has to exist and be the
  // right length for three.js to know how many vertices there are.
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAX_RAIN * 2 * 3), 3));
  g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
  g.setAttribute('aEnd', new THREE.BufferAttribute(end, 1));
  // The box moves with the camera, so a bounding volume computed from the
  // dummy positions above would cull the whole system the moment the camera
  // left the origin.
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e7);

  const uniforms = { ...baseUniforms(), uTail: { value: 3.2 } };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    fog: false,
    blending: THREE.NormalBlending,
    vertexShader: /* glsl */`
      attribute vec4 aSeed;
      attribute float aEnd;
      uniform float uTail;
      varying float vAlpha;
      ${PLACE_CHUNK}
      ${ALPHA_CHUNK}
      void main() {
        vec3 wp = placeParticle(aSeed, 0.0);
        // Tail trails up and up-wind from the head.
        vec3 dir = normalize(vec3(-uWind.x * 0.55, 1.0, -uWind.y * 0.55));
        wp += dir * (aEnd * uTail);
        vec4 mv = modelViewMatrix * vec4(wp, 1.0);
        vec4 clip = projectionMatrix * mv;
        vAlpha = weatherAlpha(wp, clip) * uOpacity * step(aSeed.w, uActive);
        gl_Position = clip;
      }
    `,
    fragmentShader: /* glsl */`
      uniform vec3 uColor;
      varying float vAlpha;
      void main() {
        if (vAlpha <= 0.003) discard;
        gl_FragColor = vec4(uColor, vAlpha);
      }
    `,
  });
  const mesh = new THREE.LineSegments(g, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = 8;
  return mesh;
}

// ── Snow ────────────────────────────────────────────────────────────────────
//
// Points, because a snowflake IS a round blob, and one point sprite is the
// cheapest possible way to draw one. Falls slower than rain and sways on the
// way down.
function makeSnow() {
  const g = new THREE.BufferGeometry();
  const seed = new Float32Array(MAX_SNOW * 4);
  for (let i = 0; i < MAX_SNOW * 4; i++) seed[i] = Math.random();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAX_SNOW * 3), 3));
  g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e7);

  const uniforms = { ...baseUniforms(), uSize: { value: 26 }, uSway: { value: 1.6 } };
  uniforms.uFall.value = 11;
  const mat = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    fog: false,
    blending: THREE.NormalBlending,
    vertexShader: /* glsl */`
      attribute vec4 aSeed;
      uniform float uSize;
      uniform float uSway;
      varying float vAlpha;
      ${PLACE_CHUNK}
      ${ALPHA_CHUNK}
      void main() {
        vec3 wp = placeParticle(aSeed, uSway);
        vec4 mv = modelViewMatrix * vec4(wp, 1.0);
        vec4 clip = projectionMatrix * mv;
        vAlpha = weatherAlpha(wp, clip) * uOpacity * step(aSeed.w, uActive);
        // Perspective size, with a ceiling so a flake near the camera cannot
        // become a screen-filling disc.
        gl_PointSize = clamp(uSize * (0.6 + aSeed.z * 0.8) / max(-mv.z, 1.0) * 40.0, 1.0, 9.0);
        gl_Position = clip;
      }
    `,
    fragmentShader: /* glsl */`
      uniform vec3 uColor;
      varying float vAlpha;
      void main() {
        if (vAlpha <= 0.003) discard;
        // Soft round flake — a hard square would read as static.
        float d = length(gl_PointCoord - 0.5);
        float a = vAlpha * (1.0 - smoothstep(0.22, 0.5, d));
        if (a <= 0.003) discard;
        gl_FragColor = vec4(uColor, a);
      }
    `,
  });
  const pts = new THREE.Points(g, mat);
  pts.frustumCulled = false;
  pts.renderOrder = 8;
  return pts;
}

// ── Ground mist ─────────────────────────────────────────────────────────────
//
// The weather 'fog' layer. This started life as scene.fog alone, on the
// reasoning that a fog bank drawn as geometry is the one effect certain to sit
// between a player and what they are trying to look at. That reasoning was
// right about DENSE fog and wrong about this: distance fog on a camera that
// always looks down at the board only ever hazes the far edges, so the fog
// setting appeared to do nothing at all.
//
// So fog is mist that hugs the floor — big, very soft, very faint blobs
// confined to a low band and drifting on the wind. Faint individually and
// built up by overlap, which is how real mist reads and also what keeps the
// overdraw bounded: no single puff costs much, and `uActive` scales how many
// exist with the GM's intensity.
//
// It keeps every protection the precipitation has — masks, ceiling clip,
// near-field cull — and carries a gentler centre falloff of its own, because
// mist that thins in the middle of the screen looks like mist, whereas rain
// that does is simply less rain.
const MAX_MIST = 320;

function makeMist() {
  const g = new THREE.BufferGeometry();
  const seed = new Float32Array(MAX_MIST * 4);
  for (let i = 0; i < MAX_MIST * 4; i++) seed[i] = Math.random();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAX_MIST * 3), 3));
  g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e7);

  const uniforms = { ...baseUniforms(), uSize: { value: 150 }, uSway: { value: 3.2 } };
  uniforms.uFall.value = 0.6;      // barely settles
  uniforms.uDrift.value = 3.5;     // ambles along the wind
  uniforms.uCentreClear.value = 0.55;
  const mat = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    fog: false,
    blending: THREE.NormalBlending,
    vertexShader: /* glsl */`
      attribute vec4 aSeed;
      uniform float uSize;
      uniform float uSway;
      varying float vAlpha;
      ${PLACE_CHUNK}
      ${ALPHA_CHUNK}
      void main() {
        vec3 wp = placeParticle(aSeed, uSway);
        vec4 mv = modelViewMatrix * vec4(wp, 1.0);
        vec4 clip = projectionMatrix * mv;
        vAlpha = weatherAlpha(wp, clip) * uOpacity * step(aSeed.w, uActive);
        // Big on screen, and capped so a puff the camera is sitting inside
        // cannot become an opaque wall.
        gl_PointSize = clamp(uSize * (0.55 + aSeed.z * 0.9) / max(-mv.z, 1.0) * 40.0, 12.0, 150.0);
        gl_Position = clip;
      }
    `,
    fragmentShader: /* glsl */`
      uniform vec3 uColor;
      varying float vAlpha;
      void main() {
        if (vAlpha <= 0.002) discard;
        // A much softer falloff than snow: the edge has to be invisible or the
        // mist reads as a field of grey discs.
        float d = length(gl_PointCoord - 0.5);
        float a = vAlpha * (1.0 - smoothstep(0.0, 0.5, d));
        if (a <= 0.002) discard;
        gl_FragColor = vec4(uColor, a);
      }
    `,
  });
  const pts = new THREE.Points(g, mat);
  pts.frustumCulled = false;
  // Under the precipitation: rain falls through mist, not behind it.
  pts.renderOrder = 7;
  return pts;
}

// The GM's exclusion polygons, rasterised into map space. White = weather
// falls here, black = the GM roofed it over. Blurred by the plugin's own
// feather so the edge softens exactly as it does on the flat map.
function buildMaskTexture(masks, feather, mapW, mapH, previous) {
  if (previous) { previous.image = null; previous.dispose(); }
  if (!masks || !masks.length || !mapW || !mapH) return null;

  const cv = document.createElement('canvas');
  cv.width = MASK_RES;
  cv.height = MASK_RES;
  const c = cv.getContext('2d');
  c.fillStyle = '#fff';
  c.fillRect(0, 0, MASK_RES, MASK_RES);

  // Feather is in map pixels; the texture is MASK_RES across the same span.
  const px = MASK_RES / Math.max(1, mapW);
  const blur = Math.max(0, Number(feather) || 0) * px;
  if (blur > 0.4) c.filter = `blur(${Math.min(blur, 40).toFixed(1)}px)`;

  c.fillStyle = '#000';
  for (const m of masks) {
    const p = m?.points;
    if (!Array.isArray(p) || p.length < 6) continue;
    c.beginPath();
    c.moveTo((p[0] / mapW) * MASK_RES, (p[1] / mapH) * MASK_RES);
    for (let i = 2; i < p.length - 1; i += 2) {
      c.lineTo((p[i] / mapW) * MASK_RES, (p[i + 1] / mapH) * MASK_RES);
    }
    c.closePath();
    c.fill();
  }

  const tex = new THREE.CanvasTexture(cv);
  // Clamped: a particle sampled fractionally off the map edge takes the edge
  // value rather than wrapping a mask around to the far side.
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

// Cheap identity for "have the masks changed" — rebuilding the texture every
// frame would defeat the point of rasterising it.
function maskKey(masks, feather, mapW, mapH) {
  if (!masks || !masks.length) return `none:${feather}`;
  let n = 0;
  for (const m of masks) n += (m?.points?.length || 0);
  return `${masks.length}:${n}:${masks.map((m) => m?.id).join(',')}:${feather}:${mapW}x${mapH}`;
}

// The wash colour each kind pulls the scene toward. Same values the flat map
// uses, so switching view does not change the colour of the storm.
function washFor(kinds) {
  if (kinds.has('snow') || kinds.has('fog')) return new THREE.Color(0.839, 0.871, 0.910);
  if (kinds.has('rain')) return new THREE.Color(0.471, 0.541, 0.627);
  // Visibility on its own, with no precipitation: still haze, and haze is grey.
  //
  // This returned null, which left the fog COLOUR as the scene's own
  // night-horizon black while the fog DISTANCE was pulled in for the weather —
  // so a map with nothing but the visibility slider raised faded to black
  // instead of hazing. The control washes the scene out; washing out is
  // lighter, not darker.
  return new THREE.Color(0.72, 0.76, 0.82);
}

/**
 * Build the weather system for a scene. Nothing renders until `update` is
 * given a spec.
 *
 * Returns { update, dispose }.
 */
// The viewer's own weather clamp, read from and written to local storage.
//
// Lives here, next to the renderer it governs, and is exported so it can be
// tested directly — the first version of it defaulted every new viewer to
// "weather off" and the only symptom was an empty sky.
//
// THE KEY IS VERSIONED, and must stay that way. `Number(localStorage.getItem(
// missingKey))` is `Number(null)`, which is 0 — a finite number inside the
// valid 0..1 range, so it passed the range check and became the default. Worse,
// the value was then persisted, so anyone who loaded that build has a genuine
// "0" stored and would keep getting a clear sky even after the parse was fixed.
// Moving to a new key is what actually clears it.
export const WEATHER_CLAMP_KEY = 'ttf.weather3d.clamp.v2';

export function readWeatherClamp(storage) {
  try {
    const store = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    if (!store) return 1;
    const raw = store.getItem(WEATHER_CLAMP_KEY);
    // Absent, empty or non-numeric all mean "never set" — full weather.
    if (raw === null || raw === undefined || raw === '') return 1;
    const v = Number(raw);
    return Number.isFinite(v) && v >= 0 && v <= 1 ? v : 1;
  } catch {
    return 1;
  }
}

export function writeWeatherClamp(value, storage) {
  try {
    const store = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    if (store) store.setItem(WEATHER_CLAMP_KEY, String(value));
  } catch { /* private mode, quota, blocked cookies — the clamp is not worth throwing over */ }
}

export function createWeather3D({ scene, camera, groundMat, ftPerPx, mapWidth, mapHeight }) {
  const group = new THREE.Group();
  group.name = 'weather3d';
  scene.add(group);

  const rain = makeRain();
  const snow = makeSnow();
  const mist = makeMist();
  group.add(mist, rain, snow);
  rain.visible = false;
  snow.visible = false;
  mist.visible = false;

  // The scene's own fog and ground colour are borrowed while weather is on
  // and handed back exactly as they were when it stops — this module must not
  // permanently change how the map looks.
  const baseFog = scene.fog
    ? { near: scene.fog.near, far: scene.fog.far, color: scene.fog.color.clone() }
    : null;
  const baseGround = groundMat?.color ? groundMat.color.clone() : null;

  let maskTex = null;
  let lastMaskKey = '';
  let touchedScene = false;

  function restoreScene() {
    if (!touchedScene) return;
    if (baseFog && scene.fog) {
      scene.fog.near = baseFog.near;
      scene.fog.far = baseFog.far;
      scene.fog.color.copy(baseFog.color);
    }
    if (baseGround && groundMat?.color) groundMat.color.copy(baseGround);
    touchedScene = false;
  }

  /**
   * @param spec           what the plugin published, or null for none
   * @param timeSec        seconds, monotonic — the animation clock
   * @param anchor         THREE.Vector3 the camera is looking at
   * @param camDist        camera distance to that point, feet
   * @param groundY        world Y of the storey the viewer is on
   * @param ceilingY       world Y of the storey above it, or Infinity
   * @param intensityScale the viewer's own 0..1 clamp
   */
  function update({ spec, timeSec, anchor, camDist, groundY = 0,
                    ceilingY = Infinity, intensityScale = 1 }) {
    const scale = Math.max(0, Math.min(1, Number(intensityScale) ?? 1));
    if (!spec || !scale) {
      rain.visible = false;
      snow.visible = false;
      mist.visible = false;
      restoreScene();
      return;
    }

    const kinds = new Map();
    for (const l of (spec.layers || [])) {
      if (!l?.kind) continue;
      kinds.set(l.kind, Math.max(kinds.get(l.kind) || 0, Math.max(0, Math.min(1, Number(l.intensity) || 0))));
    }
    const kindSet = new Set(kinds.keys());

    // ── Masks ────────────────────────────────────────────────────────────
    const key = maskKey(spec.masks, spec.feather, mapWidth, mapHeight);
    if (key !== lastMaskKey) {
      maskTex = buildMaskTexture(spec.masks, spec.feather, mapWidth, mapHeight, maskTex);
      lastMaskKey = key;
    }

    // ── The live volume ──────────────────────────────────────────────────
    //
    // Sized from how far out the camera is, so zooming out widens the weather
    // rather than leaving a patch of it in the middle of the board. Kept
    // continuous rather than stepped: a stepped size pops visibly, a
    // continuous one drifts imperceptibly.
    const boxXZ = Math.max(90, Math.min(620, (Number(camDist) || 200) * 1.7));
    // Height of the falling column. Under a storey this is the HEADROOM, not
    // the open-sky height: the ceiling clip removes anything above it, so a
    // tall column indoors would cull most of its own particles and leave a
    // storm looking like a light drizzle. Filling the space that actually
    // exists keeps the density the GM asked for wherever the viewer stands.
    const headroom = Number.isFinite(ceilingY) ? Math.max(6, ceilingY - groundY) : Infinity;
    const boxY = Math.min(Math.max(45, Math.min(220, boxXZ * 0.55)), headroom);

    const windRad = ((Number(spec.windAngle) || 0) * Math.PI) / 180;
    const wx = Math.cos(windRad);
    const wz = Math.sin(windRad);

    for (const mesh of [rain, snow, mist]) {
      const u = mesh.material.uniforms;
      u.uTime.value = timeSec;
      u.uAnchor.value.set(anchor?.x || 0, anchor?.z || 0);
      u.uBox.value.set(boxXZ, boxY, boxXZ);
      u.uWind.value.set(wx, wz);
      u.uGroundY.value = groundY;
      u.uCeilingY.value = Number.isFinite(ceilingY) ? ceilingY : 1e6;
      u.uMapSize.value.set(Number(mapWidth) || 1000, Number(mapHeight) || 1000);
      u.uFtPerPx.value = ftPerPx || 0.1;
      u.uMask.value = maskTex || blankMask();
      u.uHasMask.value = maskTex ? 1 : 0;
    }

    // ── Rain / snow ──────────────────────────────────────────────────────
    const rainI = kinds.get('rain') || 0;
    rain.visible = rainI > 0;
    if (rain.visible) {
      const u = rain.material.uniforms;
      u.uActive.value = (0.25 + rainI * 0.75) * scale;
      u.uOpacity.value = 0.28 + rainI * 0.34;
      u.uFall.value = 55 + rainI * 45;
      u.uDrift.value = (55 + rainI * 45) * 0.35;
      u.uTail.value = 2.2 + rainI * 3.4;
      u.uColor.value.setRGB(0.72, 0.79, 0.9);
    }

    const snowI = kinds.get('snow') || 0;
    snow.visible = snowI > 0;
    if (snow.visible) {
      const u = snow.material.uniforms;
      u.uActive.value = (0.25 + snowI * 0.75) * scale;
      u.uOpacity.value = 0.4 + snowI * 0.45;
      u.uFall.value = 8 + snowI * 9;
      u.uDrift.value = (8 + snowI * 9) * 0.35;
      u.uSway.value = 1.2 + snowI * 1.6;
      u.uColor.value.setRGB(0.96, 0.98, 1.0);
    }

    // ── Ground mist ──────────────────────────────────────────────────────
    const fogI = kinds.get('fog') || 0;
    mist.visible = fogI > 0;
    if (mist.visible) {
      const u = mist.material.uniforms;
      // A low band rather than the full column: mist sits on the floor. Capped
      // by the headroom so it never pours through the storey above.
      const bandFt = Math.min(Number.isFinite(ceilingY) ? Math.max(4, ceilingY - groundY) : Infinity,
                              10 + fogI * 12);
      u.uBox.value.set(boxXZ, bandFt, boxXZ);
      u.uActive.value = (0.35 + fogI * 0.65) * scale;
      // Faint per puff — the density comes from overlap, not opacity, which is
      // both how mist looks and what keeps the blending cost down.
      u.uOpacity.value = 0.05 + fogI * 0.10;
      u.uSize.value = 110 + fogI * 70;
      u.uColor.value.setRGB(0.87, 0.90, 0.94);
    }

    // ── Atmosphere ───────────────────────────────────────────────────────
    //
    // The cheapest and most readable half of the whole feature. scene.fog is
    // already compiled into every material in the scene, so pulling its near
    // plane in costs two floats and instantly reads as "you cannot see as far
    // in this". It is also the ONLY thing the weather 'fog' layer does here:
    // a fog bank drawn as geometry would be the one effect guaranteed to sit
    // between a player and the thing they are trying to look at.
    const vis = Math.max(0, Math.min(1, Number(spec.visibility) || 0));
    const murk = Math.max(fogI, vis, rainI * 0.45, snowI * 0.5) * scale;

    if (baseFog && scene.fog) {
      touchedScene = true;
      const wash = washFor(kindSet);
      // Measured against the CAMERA's distance, not the map's span.
      //
      // The first version lerped from the scene's own fog planes, which are
      // derived from map size — so on a large map "light fog" put the fogged
      // band a thousand feet behind the board and did nothing visible, while
      // the same setting on a small map was strong. Distance from the camera is
      // what decides whether a player can see something, so that is what this
      // scales with, and the setting now means the same thing at every zoom
      // level and on every map.
      //
      // The far plane stays beyond the focus point so the board does not
      // vanish into the wash: this is a depth cue supporting the mist, not the
      // fog effect on its own.
      const d = Math.max(30, Number(camDist) || 200);
      // Light weather keeps the haze well beyond the focus point, so only the
      // far edge of the board softens; heavy weather brings it in close. The
      // near multiplier used to start at 1.35, which put the haze right on top
      // of whatever the camera was looking at even at the gentlest setting.
      const near = d * THREE.MathUtils.lerp(2.2, 0.30, murk);
      const far = d * THREE.MathUtils.lerp(5.0, 1.15, murk);
      scene.fog.near = Math.min(baseFog.near, near);
      scene.fog.far = Math.min(baseFog.far, far);
      // Colour is the MEDIUM, thickness is the weather.
      //
      // Fog takes the haze colour almost as soon as there is any weather at
      // all, because a thin haze is still grey — it is thin, not dark. How
      // much of it you see is carried by the near/far planes above. Scaling
      // the colour by murk instead left light weather blending the board
      // toward the near-black base, which is how this went dark.
      scene.fog.color.copy(baseFog.color);
      if (wash) scene.fog.color.lerp(wash, Math.min(1, murk * 4));
    }

    // Wet ground goes darker, snow-covered ground goes lighter. One material,
    // one colour multiply over the map texture that is already there.
    if (baseGround && groundMat?.color) {
      touchedScene = true;
      groundMat.color.copy(baseGround);
      if (snowI > 0) groundMat.color.lerp(new THREE.Color(1, 1, 1), snowI * 0.45 * scale);
      else if (rainI > 0) groundMat.color.lerp(new THREE.Color(0.42, 0.47, 0.58), rainI * 0.3 * scale);
    }
  }

  function dispose() {
    restoreScene();
    for (const mesh of [rain, snow, mist]) {
      group.remove(mesh);
      mesh.geometry.dispose();
      mesh.material.dispose();
    }
    if (maskTex) { maskTex.image = null; maskTex.dispose(); maskTex = null; }
    scene.remove(group);
  }

  return { update, dispose };
}
