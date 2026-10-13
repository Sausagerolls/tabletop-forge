// The cast effects, in 3D.
//
// The flat map paints these on a 2D canvas (FX_PAINTERS in MapStage). That
// canvas does not exist in the 3D view, so vines, fire, frost and blink all
// did nothing there — the GM fired one off and the board simply sat still.
//
// Same idea as weather3d.js: the effect is defined once as data on the server
// (`{ tokenId, effect, ts }`) and each view says it in its own vocabulary.
// Durations are IMPORTED from MapStage rather than restated, so an effect
// cannot run for one length flat and another in 3D — and colours are matched
// to the 2D painters so the same spell reads as the same spell in both views.
//
// GENUINELY 3D, AND OCCLUSION IS THE POINT
// ─────────────────────────────────────────
// Two earlier attempts got this wrong in opposite directions.
//
// The first ringed the token's BASE in the horizontal plane. Seen from a camera
// looking down, the near half of such a ring projects below the token and the
// far half is depth-rejected, so all that showed was a low arc under its feet.
//
// The second laid the particles out in the camera's own plane and stepped them
// towards it. That did put them in front — and it looked exactly like what it
// was: a flat 2D animation swivelling to face the viewer. It also could not
// work for a standee, which is a yaw-only VERTICAL plane rather than one
// perpendicular to the view, so its depth varies over its height and no single
// forward nudge clears it.
//
// So these are now real 3D: particles at real world positions, ORBITING the
// token's vertical axis, with no reference to the camera at all. Each particle
// passes in front of the token and then behind it, and the depth buffer hides
// it for the half of that circuit it spends behind. That occlusion is not a
// problem to be defeated — it is the entire reason it reads as three
// dimensional. Fighting it is what made the last version look flat.
//
// What keeps enough of it visible is the RADIUS: particles orbit at a little
// over the token's half-width, so the near arc is clearly outside the token's
// silhouette as well as in front of it, and is never hidden.
//
// EVERYTHING IS TRANSIENT
// ───────────────────────
// Effects last under two seconds and then must leave nothing behind. Each one
// builds its own little group, animates off a progress value, and is disposed
// the moment it expires — geometry, materials and all. They are keyed by
// `tokenId|ts` so re-casting on the same token starts a second, independent
// effect rather than restarting the first.
import * as THREE from 'three';
import { FX_SPECS } from './MapStage.jsx';

// One soft radial sprite, shared by every puff and flash. Built once.
let _puffTex = null;
function puffTexture() {
  if (_puffTex) return _puffTex;
  const S = 64;
  const c = document.createElement('canvas');
  c.width = S; c.height = S;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.45, 'rgba(255,255,255,0.5)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  _puffTex = new THREE.CanvasTexture(c);
  return _puffTex;
}

function puff(color, size, opacity) {
  const m = new THREE.SpriteMaterial({
    map: puffTexture(),
    color: new THREE.Color(color),
    transparent: true,
    opacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  // Flagged so the disposer leaves the shared texture alone.
  m.userData.sharedMap = true;
  const s = new THREE.Sprite(m);
  s.scale.set(size, size, 1);
  // After the token (renderOrder 10) so ordering is deterministic, but depth
  // testing stays on — the token writes depth, so whatever is behind it is
  // hidden and the effect reads as surrounding the creature.
  s.renderOrder = 11;
  return s;
}

// Deterministic jitter, so a given effect looks the same every time it runs
// rather than reshuffling on each frame. Mirrors fxRand in MapStage.
function rand(seed) {
  const x = Math.sin(seed * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

const easeOut = (t) => 1 - Math.pow(1 - t, 3);

// Radii are generous on purpose: an effect that only clears the token's edge by
// a few inches reads as a fringe round a disc, not as something happening to a
// creature. These span roughly twice the token's width.

// ── vines: tendrils spiralling up and gripping ──────────────────────────────
//
// Real tube geometry, not a line and not a string of blobs. A THREE.Line is one
// device pixel wide whatever you ask for, and a chain of soft sprites reads as
// dots on a string — neither looks like a vine. A tube swept along the helix
// has actual thickness, takes the scene's lighting, and turns as it winds, so
// it reads as a solid thing wrapping the creature.
function buildVines(g, r, h) {
  const TENDRILS = 6;
  const tubes = [];
  for (let i = 0; i < TENDRILS; i++) {
    const turns = 1.0 + rand(i) * 0.7;
    const lean = 0.75 + rand(i + 9) * 0.45;
    const phase = (i / TENDRILS) * Math.PI * 2;
    const pts = [];
    for (let k = 0; k <= 22; k++) {
      const t = k / 22;
      const a = phase + t * Math.PI * 2 * turns;
      const rad = r * (1.5 - t * 0.4);
      pts.push(new THREE.Vector3(Math.cos(a) * rad, t * h * lean, Math.sin(a) * rad));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    // Tapering slightly along its length would need a custom geometry; a
    // constant radius is close enough at token scale and far cheaper.
    const geo = new THREE.TubeGeometry(curve, 40, r * 0.13, 6, false);
    const mat = new THREE.MeshLambertMaterial({
      color: new THREE.Color(i % 3 === 0 ? '#4ade80' : '#15803d'),
      transparent: true, opacity: 1, depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.renderOrder = 11;
    // Grown by revealing the index buffer, which runs along the tube — the
    // same trick the line version used, and the reason it looks like it is
    // climbing rather than switching on.
    const total = geo.index ? geo.index.count : 0;
    geo.setDrawRange(0, 0);
    g.add(mesh);
    tubes.push({ mesh, geo, mat, total });
  }
  // Leaves: real geometry too, small and flat, scattered up the tendrils.
  const leaves = [];
  for (let i = 0; i < 10; i++) {
    const m = new THREE.Mesh(
      new THREE.ConeGeometry(r * 0.16, r * 0.4, 5),
      new THREE.MeshLambertMaterial({ color: new THREE.Color('#166534'),
        transparent: true, opacity: 1, depthWrite: false })
    );
    m.renderOrder = 11;
    m.rotation.z = rand(i) * Math.PI;
    m.visible = false;
    g.add(m);
    leaves.push({ m, a: (i / 10) * Math.PI * 2, t: 0.25 + rand(i + 5) * 0.6 });
  }
  return (p) => {
    const grow = easeOut(Math.min(1, p / 0.55));
    const settle = Math.max(0, (p - 0.55) / 0.45);
    for (const T of tubes) {
      // Index counts must stay whole triangles.
      T.geo.setDrawRange(0, Math.floor((T.total * grow) / 3) * 3);
      T.mat.opacity = 1 - settle * 0.85;
    }
    for (const L of leaves) {
      L.m.visible = grow >= L.t;
      if (!L.m.visible) continue;
      L.m.material.opacity = 1 - settle * 0.9;
      const rad = r * (1.5 - L.t * 0.4);
      const a = L.a + p * 0.4;
      L.m.position.set(Math.cos(a) * rad, L.t * h * 0.9, Math.sin(a) * rad);
      L.m.rotation.y = a;
    }
  };
}

// ── fire: flames that orbit as they rise ────────────────────────────────────
//
// The loudest of the four on purpose — it is the effect that destroys a token,
// so it should look like it. Dense, hot, and bright: a white core at the base
// with the flame going yellow, orange and finally red as it climbs and dies,
// plus a glow at the creature's feet so the whole thing sits in a pool of light
// rather than floating.
function buildFire(g, r, h) {
  const N = 26;
  const parts = [];
  for (let i = 0; i < N; i++) {
    // Hottest at the bottom of each flame's life, cooling as it rises. Colour
    // is per-particle so the column is not one flat orange.
    const tier = i % 4;
    const color = tier === 0 ? '#fffbe8' : tier === 1 ? '#fde047' : tier === 2 ? '#fb923c' : '#dc2626';
    const s = puff(color, r, 0);
    g.add(s);
    parts.push({
      s,
      a0: (i / N) * Math.PI * 2 * 1.7,
      rad: r * (1.15 + rand(i + 11) * 0.55),
      sweep: 2.0 + rand(i + 41) * 1.6,
      rise: h * (0.75 + rand(i + 21) * 0.75),
      // Shorter lags: the fire arrives all at once rather than easing in.
      lag: rand(i + 31) * 0.28,
      hot: tier <= 1,
    });
  }
  // The base pool. Bright, additive, and short-lived.
  const base = puff('#fff3c4', r * 2.6, 0);
  base.position.y = h * 0.06;
  g.add(base);
  // A second, brighter core that flares early.
  const core = puff('#ffffff', r * 1.6, 0);
  core.position.y = h * 0.3;
  g.add(core);

  return (p) => {
    const flare = Math.max(0, 1 - p / 0.35);
    base.material.opacity = 0.85 * Math.sin(Math.min(1, p / 0.75) * Math.PI);
    base.scale.setScalar(r * (2.2 + p * 1.4));
    core.material.opacity = 0.9 * flare * flare;
    core.scale.setScalar(r * (1.3 + (1 - flare) * 1.2));

    for (const f of parts) {
      const t = Math.max(0, Math.min(1, (p - f.lag) / (1 - f.lag)));
      const e = easeOut(t);
      const a = f.a0 + e * f.sweep;
      // Draws inward as it rises, so the column tapers like a real flame.
      const rad = f.rad * (1 - e * 0.35);
      f.s.position.set(Math.cos(a) * rad, e * f.rise, Math.sin(a) * rad);
      // Full brightness, and the hot tiers stay bright for longer.
      const curve = f.hot ? Math.sin(t * Math.PI) ** 0.6 : Math.sin(t * Math.PI);
      f.s.material.opacity = t <= 0 || t >= 1 ? 0 : (f.hot ? 1 : 0.9) * curve;
      f.s.scale.setScalar(r * (0.75 + t * 0.65));
    }
  };
}

// ── frost: ice closing in, then shattering ─────────────────────────────────
//
// The crystals are octahedra — actual faceted geometry, lit by the scene, so
// they catch highlights and read as ice rather than as pale dots.
function buildFrost(g, r, h) {
  // A soft volume of cold behind the crystals. This one IS a sprite: a glow has
  // no surface, and a mesh would only look like a ball of plastic.
  const glow = puff('#7dd3fc', r * 2.6, 0);
  glow.position.y = h * 0.5;
  g.add(glow);

  const mkCrystal = (size, color) => {
    const m = new THREE.Mesh(
      new THREE.OctahedronGeometry(size, 0),
      new THREE.MeshLambertMaterial({
        color: new THREE.Color(color),
        transparent: true, opacity: 0, depthWrite: false,
      })
    );
    m.renderOrder = 11;
    g.add(m);
    return m;
  };
  const RING = 12;
  const ring = [];
  for (let i = 0; i < RING; i++) ring.push(mkCrystal(r * (0.26 + rand(i) * 0.16), '#e0f2fe'));
  const shards = [];
  for (let i = 0; i < 8; i++) shards.push(mkCrystal(r * 0.2, '#bae6fd'));

  return (p) => {
    const freeze = easeOut(Math.min(1, p / 0.55));
    const shatter = Math.max(0, (p - 0.6) / 0.4);
    glow.material.opacity = 0.28 * freeze * (1 - shatter);
    glow.scale.setScalar(r * (3.0 - freeze * 0.7));

    const rad = r * (1.9 - freeze * 0.45);
    ring.forEach((c, i) => {
      const a = (i / RING) * Math.PI * 2 + p * 1.1;
      const band = Math.sin(a * 2) * 0.35;
      c.material.opacity = 0.95 * freeze * (1 - shatter);
      c.position.set(Math.cos(a) * rad, h * (0.5 + band * 0.55), Math.sin(a) * rad);
      // Tumbling, so the facets turn through the light.
      c.rotation.set(p * 1.6 + i, a, p * 1.1);
    });
    shards.forEach((sh, i) => {
      const a = (i / shards.length) * Math.PI * 2 + shatter * 0.9;
      const d = rad + shatter * r * 1.3;
      sh.material.opacity = Math.min(1, 0.9 * shatter * (1 - shatter) * 4);
      sh.position.set(Math.cos(a) * d,
                      Math.max(0.1, h * (0.5 + Math.sin(i * 1.7) * 0.32)),
                      Math.sin(a) * d);
      sh.rotation.set(shatter * 5 + i, a, shatter * 4);
    });
  };
}

// ── blink: a teleport flash ────────────────────────────────────────────────
function buildBlink(g, r, h) {
  // A TORUS, not a flat disc. A RingGeometry is a two-dimensional annulus: seen
  // edge-on it collapses to a line, and it never looks like an object. A torus
  // has a cross-section, so it stays a solid hoop from every angle.
  const mkRing = (color, opacity) => {
    const m = new THREE.Mesh(
      new THREE.TorusGeometry(1, 0.14, 8, 40),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(color),
        transparent: true, opacity, depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    m.rotation.x = -Math.PI / 2;
    m.renderOrder = 11;
    g.add(m);
    return m;
  };
  const burst = mkRing('#c4b5fd', 0);
  const halo = mkRing('#ede9fe', 0);
  const core = puff('#ede9fe', r * 2, 0);
  core.position.y = h * 0.5;
  g.add(core);
  const sparks = [];
  for (let i = 0; i < 10; i++) {
    const m = new THREE.Mesh(
      new THREE.OctahedronGeometry(r * 0.17, 0),
      new THREE.MeshLambertMaterial({ color: new THREE.Color('#c4b5fd'),
        transparent: true, opacity: 0, depthWrite: false })
    );
    m.renderOrder = 11;
    g.add(m);
    sparks.push(m);
  }
  return (p) => {
    const e = easeOut(p);
    burst.scale.setScalar(r * (1.1 + e * 1.9));
    burst.position.y = h * 0.5;
    burst.material.opacity = 0.9 * (1 - p);
    const haloR = r * 1.5;
    halo.scale.setScalar(haloR);
    halo.position.y = e * h;
    halo.material.opacity = 0.85 * (1 - p);
    core.material.opacity = 0.5 * (1 - p) * (1 - p);
    core.scale.setScalar(r * (1.6 + e * 0.8));
    sparks.forEach((sp, i) => {
      const a0 = (i / sparks.length) * Math.PI * 2;
      const a = a0 + e * 1.5;
      const d = r * (1.5 + e * 1.2);
      const tilt = Math.sin(a0 * 2.3) * 0.6;
      sp.material.opacity = 0.85 * (1 - p);
      sp.position.set(Math.cos(a) * d * Math.cos(tilt),
                      Math.max(0.1, h * (0.5 + tilt * 0.45)),
                      Math.sin(a) * d * Math.cos(tilt));
      sp.rotation.set(e * 6 + i, a, e * 4);
    });
  };
}

// ── dissolve: disintegration ────────────────────────────────────────────────
//
// The creature goes to ash. Motes lift off it and drift outward while what is
// left thins away — no blast, no fire, just absence. The motes are real
// octahedra so they catch the light and read as fragments rather than smoke.
function buildDissolve(g, r, h) {
  const N = 34;
  const motes = [];
  for (let i = 0; i < N; i++) {
    const m = new THREE.Mesh(
      // Bigger than they look like they should be: ash read as nothing at
      // all at the first sizing, the same mistake the fire made.
      new THREE.OctahedronGeometry(r * (0.14 + rand(i) * 0.13), 0),
      new THREE.MeshLambertMaterial({
        color: new THREE.Color(i % 4 === 0 ? '#d6d3d1' : '#78716c'),
        transparent: true, opacity: 0, depthWrite: false,
      })
    );
    m.renderOrder = 11;
    g.add(m);
    motes.push({
      m,
      a: (i / N) * Math.PI * 2 + rand(i + 3) * 1.2,
      // Starts inside the creature's own volume and works outward.
      r0: r * (0.15 + rand(i + 11) * 0.5),
      r1: r * (1.3 + rand(i + 17) * 1.0),
      y0: h * rand(i + 23),
      rise: h * (0.5 + rand(i + 31) * 0.9),
      // Staggered so the body erodes rather than bursting all at once.
      lag: rand(i + 41) * 0.55,
      spin: 2 + rand(i + 47) * 5,
    });
  }
  // The dust left where it stood, sinking and spreading.
  const dust = puff('#a8a29e', r * 2.4, 0);
  dust.position.y = h * 0.08;
  g.add(dust);

  return (p) => {
    dust.material.opacity = 0.62 * Math.sin(Math.min(1, p / 0.8) * Math.PI);
    dust.scale.setScalar(r * (1.8 + p * 1.6));
    for (const d of motes) {
      const t = Math.max(0, Math.min(1, (p - d.lag) / (1 - d.lag)));
      const e = easeOut(t);
      const rad = d.r0 + (d.r1 - d.r0) * e;
      d.m.position.set(Math.cos(d.a) * rad, d.y0 + e * d.rise, Math.sin(d.a) * rad);
      d.m.rotation.set(t * d.spin, t * d.spin * 0.7, t * d.spin * 0.4);
      // Shrinking as it goes, so a mote thins out instead of just fading.
      const k = 1 - t * 0.75;
      d.m.scale.setScalar(Math.max(0.05, k));
      d.m.material.opacity = t <= 0 || t >= 1 ? 0 : Math.sin(t * Math.PI) ** 0.7;
    }
  };
}

// ── explode: outward ────────────────────────────────────────────────────────
//
// A hard flash, a shock ring that expands past the creature, and debris thrown
// clear. Colours match the flat map's ship explosion so the two read as the
// same kind of event at different scales.
function buildExplode(g, r, h) {
  const flash = puff('#fff7d6', r * 2, 0);
  flash.position.y = h * 0.5;
  const fireball = puff('#ff9e30', r * 3, 0);
  fireball.position.y = h * 0.5;
  g.add(flash, fireball);

  const shock = new THREE.Mesh(
    new THREE.TorusGeometry(1, 0.09, 8, 44),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color('#ffdca0'),
      transparent: true, opacity: 0, depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  shock.rotation.x = -Math.PI / 2;
  shock.position.y = h * 0.45;
  shock.renderOrder = 11;
  g.add(shock);

  const DEBRIS = 20;
  const debris = [];
  for (let i = 0; i < DEBRIS; i++) {
    const m = new THREE.Mesh(
      new THREE.TetrahedronGeometry(r * (0.1 + rand(i) * 0.11), 0),
      new THREE.MeshLambertMaterial({
        color: new THREE.Color(i % 3 === 0 ? '#78350f' : '#292524'),
        transparent: true, opacity: 0, depthWrite: false,
      })
    );
    m.renderOrder = 11;
    g.add(m);
    debris.push({
      m,
      a: (i / DEBRIS) * Math.PI * 2 + rand(i + 5) * 0.5,
      // Some fly up, some flat, some down — a sphere of fragments.
      tilt: (rand(i + 13) - 0.4) * 1.1,
      dist: r * (1.6 + rand(i + 19) * 2.2),
      spin: 4 + rand(i + 27) * 7,
    });
  }
  return (p) => {
    const e = easeOut(p);
    flash.material.opacity = 0.95 * Math.max(0, 1 - p / 0.28) ** 2;
    flash.scale.setScalar(r * (1.4 + e * 1.6));
    fireball.material.opacity = 0.8 * (1 - p) * Math.min(1, p / 0.12);
    fireball.scale.setScalar(r * (1.2 + e * 2.6));
    shock.scale.setScalar(r * (0.6 + e * 3.4));
    shock.material.opacity = 0.85 * (1 - p) ** 1.5;
    for (const d of debris) {
      const dist = d.dist * e;
      // Gravity on the way out, so fragments arc instead of flying straight.
      const y = h * 0.5 + Math.sin(d.tilt) * dist - 9 * p * p * r * 0.14;
      d.m.position.set(Math.cos(d.a) * dist * Math.cos(d.tilt),
                       Math.max(0.08, y),
                       Math.sin(d.a) * dist * Math.cos(d.tilt));
      d.m.rotation.set(p * d.spin, p * d.spin * 0.6, p * d.spin * 0.3);
      d.m.material.opacity = Math.min(1, p / 0.1) * (1 - p) ** 0.8;
    }
  };
}

// ── implode: inward ─────────────────────────────────────────────────────────
//
// The mirror of explode, and deliberately a different colour so the two are
// never confused at a glance: fragments rush IN from well outside the creature,
// a ring contracts onto it, and it ends in one hard flash as everything meets.
function buildImplode(g, r, h) {
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1, 0.1, 8, 44),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color('#a5b4fc'),
      transparent: true, opacity: 0, depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = h * 0.5;
  ring.renderOrder = 11;
  const flash = puff('#e0e7ff', r * 2.4, 0);
  flash.position.y = h * 0.5;
  g.add(ring, flash);

  const N = 22;
  const shards = [];
  for (let i = 0; i < N; i++) {
    const m = new THREE.Mesh(
      new THREE.TetrahedronGeometry(r * (0.09 + rand(i) * 0.1), 0),
      new THREE.MeshLambertMaterial({
        color: new THREE.Color(i % 3 === 0 ? '#c7d2fe' : '#6366f1'),
        transparent: true, opacity: 0, depthWrite: false,
      })
    );
    m.renderOrder = 11;
    g.add(m);
    shards.push({
      m,
      a: (i / N) * Math.PI * 2 + rand(i + 5) * 0.4,
      tilt: (rand(i + 13) - 0.5) * 1.2,
      from: r * (2.6 + rand(i + 19) * 1.6),
      spin: 5 + rand(i + 27) * 6,
    });
  }
  return (p) => {
    // Accelerating inward — slow at the edges, snapping shut at the end.
    const pull = p * p;
    ring.scale.setScalar(r * (3.2 * (1 - pull) + 0.15));
    ring.material.opacity = 0.9 * Math.min(1, p / 0.12) * (1 - pull);
    // The flash only at the moment of collapse.
    const collapse = Math.max(0, (p - 0.72) / 0.28);
    flash.material.opacity = 0.95 * Math.sin(collapse * Math.PI);
    flash.scale.setScalar(r * (0.5 + collapse * 2.4));
    for (const sh of shards) {
      const dist = sh.from * (1 - pull);
      sh.m.position.set(Math.cos(sh.a) * dist * Math.cos(sh.tilt),
                        Math.max(0.08, h * 0.5 + Math.sin(sh.tilt) * dist),
                        Math.sin(sh.a) * dist * Math.cos(sh.tilt));
      sh.m.rotation.set(p * sh.spin, p * sh.spin * 0.6, p * sh.spin * 0.4);
      // Gone the instant they meet, rather than piling up in the middle.
      sh.m.material.opacity = Math.min(1, p / 0.1) * (1 - collapse);
    }
  };
}

const BUILDERS = {
  vines: buildVines, fire: buildFire, frost: buildFrost, blink: buildBlink,
  dissolve: buildDissolve, explode: buildExplode, implode: buildImplode,
};

function disposeGroup(g) {
  g.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) {
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      // The puff texture is shared by every effect and outlives all of them.
      mats.forEach((m) => { if (m.map && !m.userData?.sharedMap) m.map.dispose(); m.dispose(); });
    }
  });
}

/**
 * Effects layer for the 3D board.
 *
 * `sync` is called every frame with the live effect list and a way to find
 * where a token currently is. It creates what is new, advances what is
 * running, and disposes what has finished.
 */
export function createTokenFx3D({ scene }) {
  const root = new THREE.Group();
  root.name = 'tokenFx3d';
  scene.add(root);

  const live = new Map();   // "tokenId|ts" -> { group, update, spec, ts }

  function sync(list, anchorFor, nowMs) {
    const seen = new Set();

    for (const fx of (list || [])) {
      if (!fx || fx.tokenId == null) continue;
      const spec = FX_SPECS[fx.effect];
      const build = BUILDERS[fx.effect];
      if (!spec || !build) continue;
      const elapsed = nowMs - fx.ts;
      if (elapsed < 0 || elapsed >= spec.duration) continue;

      const key = `${fx.tokenId}|${fx.ts}`;
      seen.add(key);

      let entry = live.get(key);
      if (!entry) {
        // Anchored where the token actually IS in this view — on its storey,
        // on a ship's deck, wherever the token pass drew it. An effect keyed
        // to a token that is not on screen simply never starts.
        const a = anchorFor(fx.tokenId);
        if (!a) continue;
        const group = new THREE.Group();
        group.position.copy(a.position);
        const update = build(group, Math.max(0.5, a.radius), Math.max(1, a.height));
        root.add(group);
        entry = { group, update, spec, ts: fx.ts, tokenId: fx.tokenId };
        live.set(key, entry);
      }
      // Follow the token if it moves mid-effect.
      const a = anchorFor(entry.tokenId);
      if (a) entry.group.position.copy(a.position);
      // No camera reference at all. The effect lives in world space and the
      // depth buffer decides what is visible, which is what makes it read as
      // 3D. See the header for why the two camera-relative versions of this
      // both failed.
      entry.update(Math.max(0, Math.min(1, (nowMs - entry.ts) / entry.spec.duration)));
    }

    for (const [key, entry] of live) {
      if (seen.has(key)) continue;
      root.remove(entry.group);
      disposeGroup(entry.group);
      live.delete(key);
    }
  }

  function dispose() {
    for (const [, entry] of live) {
      root.remove(entry.group);
      disposeGroup(entry.group);
    }
    live.clear();
    scene.remove(root);
  }

  return { sync, dispose };
}
