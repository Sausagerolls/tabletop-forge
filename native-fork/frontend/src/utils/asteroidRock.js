// asteroidRock.js — surface maps and lumpy geometry for the shipped space rocks.
//
// Sibling of planetTexture.js, and the same reasoning applies to the texture:
// the flat marker art is an orthographic picture with its lighting already
// painted in, so wrapping it round a solid would bake the shadow into the rock.
// These get their own equirectangular map with no lighting in it, and the
// shader lights it.
//
// The difference from a planet is the SHAPE. A world is a sphere and looks
// wrong as anything else; an asteroid is defined by not being one. So this also
// deforms the geometry — the silhouette is the whole character of a rock, and a
// lumpy texture on a perfect ball still reads as a ball.
//
// Palettes mirror backend/src/asteroidArt.js so a rock is the same colour on
// the flat map and in 3D. Duplicated rather than imported for the same reason
// the planet palettes are: that module is CommonJS and runs server-side.

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// `lumpy` is how far the geometry is pushed off a sphere, as a fraction of the
// radius; `facets` swaps smooth shading for flat, which is what makes crystal
// read as crystal.
export const ROCK_PALETTES = {
  rocky:   { base: '#7d7871', hi: '#a9a49b', lo: '#3f3c38', craters: 1.0, lumpy: 0.26 },
  iron:    { base: '#6b6560', hi: '#b8a89a', lo: '#2f2b28', craters: 0.5, lumpy: 0.30, metal: true },
  icy:     { base: '#7ba7c0', hi: '#dceffa', lo: '#2f4c63', craters: 0.4, lumpy: 0.34, icy: true },
  carbon:  { base: '#55504a', hi: '#7d766c', lo: '#26231f', craters: 1.2, lumpy: 0.24 },
  crystal: { base: '#8a76c8', hi: '#d6c6ff', lo: '#3b3068', craters: 0.0, lumpy: 0.34, facets: true },
  rubble:  { base: '#6f6a63', hi: '#9b958b', lo: '#35322e', craters: 0.8, lumpy: 0.38 },
};

// Which palette each shipped rock uses. Several share a type on purpose — an
// Asteroid and a Space Boulder are the same stuff at different sizes, and the
// seed is what makes them different rocks.
const ROCK_TYPES = {
  'asteroid': 'rocky',
  'asteroid-large': 'rocky',
  'boulder': 'rocky',
  'iron-chunk': 'iron',
  'ice-shard': 'icy',
  'carbon-rock': 'carbon',
  'crystal-shard': 'crystal',
  'rubble-cluster': 'rubble',
};

function hashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Is this terrain art one of the shipped space rocks?
 *
 * Keyed on the seeded filename the backend writes (`terrain/asteroid-<x>.svg`
 * — see seedAsteroidMarkers in backend/src/index.js), so a GM's own uploaded
 * scenery is left alone and keeps its flat plane.
 *
 * @returns {{ key: string, seed: number } | null}
 */
export function asteroidArtInfo(artPath) {
  if (!artPath) return null;
  const m = String(artPath).match(/(?:^|\/)asteroid-([a-z0-9-]+)\.svg$/i);
  if (!m) return null;
  const key = ROCK_TYPES[m[1].toLowerCase()];
  if (!key) return null;
  return { key, seed: hashString(m[1].toLowerCase()) };
}

// ── Surface map ─────────────────────────────────────────────────────────────
// Equirectangular, same as the planets: x is 360° of longitude, y runs pole to
// pole, and anything crossing the seam has to be drawn at -W, 0 and +W.

const TAU = Math.PI * 2;

function wrapped(ctx, W, draw) {
  for (const dx of [-W, 0, W]) {
    ctx.save();
    ctx.translate(dx, 0);
    draw();
    ctx.restore();
  }
}

function ellipse(ctx, cx, cy, rx, ry, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(cx, cy, Math.max(0.5, rx), Math.max(0.5, ry), rot, 0, TAU);
  ctx.fill();
}

/**
 * Draw one rock's surface.
 *
 * @param {object} opts
 * @param {string} opts.key   a key of ROCK_PALETTES
 * @param {number} opts.seed
 * @param {number} [opts.width] texture width; height is half, as equirect requires
 * @returns {HTMLCanvasElement}
 */
export function makeRockCanvas({ key, seed = 1, width = 512, palette = null }) {
  const t = palette || ROCK_PALETTES[key] || ROCK_PALETTES.rocky;
  const rnd = mulberry32(seed);
  const W = width;
  const H = width / 2;

  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');

  ctx.fillStyle = t.base;
  ctx.fillRect(0, 0, W, H);

  // Broad tonal variation, so the rock isn't one flat colour before the
  // craters go on.
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = rnd() > 0.5 ? t.hi : t.lo;
    ctx.globalAlpha = 0.05 + rnd() * 0.09;
    wrapped(ctx, W, () => ellipse(ctx, rnd() * W, rnd() * H, W * (0.05 + rnd() * 0.14), H * (0.06 + rnd() * 0.16)));
  }
  ctx.globalAlpha = 1;

  // Craters: a dark floor with a lighter rim, the same two-part shape the flat
  // art draws.
  const craters = Math.round(t.craters * (28 + rnd() * 26));
  for (let i = 0; i < craters; i++) {
    const cx = rnd() * W;
    const cy = H * (0.05 + rnd() * 0.9);
    const r = H * (0.02 + rnd() * 0.07);
    wrapped(ctx, W, () => {
      ctx.fillStyle = t.lo;
      // Craters are pits, not holes. At the old 0.35-0.65 they stacked into a
      // near-black field on any dark palette.
      ctx.globalAlpha = 0.22 + rnd() * 0.22;
      ellipse(ctx, cx, cy, r * (0.9 + rnd() * 0.3), r);
      ctx.globalAlpha = 0.30;
      ctx.strokeStyle = t.hi;
      ctx.lineWidth = Math.max(0.8, r * 0.22);
      ctx.beginPath();
      ctx.ellipse(cx, cy, r * 0.85, r * 0.8, 0, Math.PI * 0.15, Math.PI * 1.05);
      ctx.stroke();
    });
  }
  ctx.globalAlpha = 1;

  if (t.metal) {
    // Exposed metal: bright slivers.
    for (let i = 0; i < 26; i++) {
      const x = rnd() * W, y = rnd() * H;
      const len = W * (0.02 + rnd() * 0.05);
      const a = rnd() * TAU;
      ctx.strokeStyle = t.hi;
      ctx.globalAlpha = 0.25 + rnd() * 0.35;
      ctx.lineWidth = Math.max(1, H * 0.006);
      ctx.lineCap = 'round';
      wrapped(ctx, W, () => {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
        ctx.stroke();
      });
    }
    ctx.globalAlpha = 1;
  }

  if (t.icy) {
    for (let i = 0; i < 22; i++) {
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = 0.08 + rnd() * 0.16;
      wrapped(ctx, W, () => ellipse(ctx, rnd() * W, rnd() * H, W * (0.02 + rnd() * 0.06), H * (0.03 + rnd() * 0.08)));
    }
    ctx.globalAlpha = 1;
  }

  if (t.facets) {
    // Crystal: broad flat bands of alternating tone, so the flat-shaded
    // geometry below has something to catch.
    for (let i = 0; i < 16; i++) {
      ctx.fillStyle = i % 2 ? t.hi : t.lo;
      ctx.globalAlpha = 0.12 + rnd() * 0.18;
      const x = rnd() * W;
      wrapped(ctx, W, () => {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + W * 0.1, H);
        ctx.lineTo(x + W * 0.2, H);
        ctx.lineTo(x + W * 0.1, 0);
        ctx.closePath();
        ctx.fill();
      });
    }
    ctx.globalAlpha = 1;
  }

  // Fine speckle over everything — this is what stops the surface looking
  // painted when the camera comes close.
  const img = ctx.getImageData(0, 0, W, H);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (rnd() - 0.5) * 26;
    img.data[i] = Math.max(0, Math.min(255, img.data[i] + n));
    img.data[i + 1] = Math.max(0, Math.min(255, img.data[i + 1] + n));
    img.data[i + 2] = Math.max(0, Math.min(255, img.data[i + 2] + n));
  }
  ctx.putImageData(img, 0, 0);

  // The poles are sampled from a single row, so flatten each to its average or
  // one stray crater smears across the whole cap.
  for (const top of [true, false]) {
    const bands = Math.max(2, Math.round(H * 0.02));
    const y0 = top ? 0 : H - bands;
    const strip = ctx.getImageData(0, y0, W, bands);
    let r = 0, g = 0, b = 0;
    const count = W * bands;
    for (let i = 0; i < count; i++) {
      r += strip.data[i * 4];
      g += strip.data[i * 4 + 1];
      b += strip.data[i * 4 + 2];
    }
    ctx.fillStyle = `rgb(${Math.round(r / count)}, ${Math.round(g / count)}, ${Math.round(b / count)})`;
    ctx.fillRect(0, y0, W, bands);
  }

  return c;
}

/**
 * Build a rock palette from a piece of uploaded art.
 *
 * The art itself is NOT used as the texture. An uploaded asteroid is an
 * orthographic picture with its own lighting baked in and a transparent
 * background, and wrapping that round a lump gives exactly what you would
 * expect: the shading smeared across the surface and the empty corners painted
 * on as solid blocks of colour.
 *
 * What the art is good for is its COLOUR. Sampling the opaque pixels gives the
 * rock's real tone, and a generated surface in that tone matches the flat map
 * without inheriting any of its lighting.
 *
 * @param {HTMLImageElement} img
 * @param {string} baseKey a key of ROCK_PALETTES to inherit behaviour from
 */
export function paletteFromImage(img, baseKey = 'rocky') {
  const base = ROCK_PALETTES[baseKey] || ROCK_PALETTES.rocky;
  try {
    const S = 64;
    const c = document.createElement('canvas');
    c.width = S;
    c.height = S;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, S, S);
    const d = ctx.getImageData(0, 0, S, S).data;

    let r = 0, g = 0, b = 0, n = 0;
    const lums = [];
    for (let i = 0; i < d.length; i += 4) {
      // Transparent pixels are the cut-out background, not the rock.
      if (d[i + 3] < 200) continue;
      r += d[i]; g += d[i + 1]; b += d[i + 2];
      lums.push(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
      n++;
    }
    if (n < 40) return base;
    r = r / n; g = g / n; b = b / n;

    // Hold the tone inside a readable band.
    //
    // The average of a dark rock photographed against black lands near enough
    // to black that the generated surface came out as a silhouette — the shader
    // lights it from one side and there is simply nothing there to light. This
    // keeps the art's HUE and rebalances only its lightness, so a slate rock
    // stays slate and a rust one stays rust.
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    // Floor set at the shipped rocks' own lightness (rocky's base is ~120),
    // since those are the ones that demonstrably read as rock under this
    // shader. Anything dimmer disappears into the board.
    const MIN_LUM = 118, MAX_LUM = 195;
    if (lum > 0) {
      const target = Math.max(MIN_LUM, Math.min(MAX_LUM, lum));
      const f = target / lum;
      r *= f; g *= f; b *= f;
    }
    r = Math.round(r); g = Math.round(g); b = Math.round(b);

    // Spread from the art's own contrast rather than a fixed amount, so a
    // near-black carbonaceous rock doesn't come back looking chalky.
    lums.sort((x, y) => x - y);
    const lo = lums[Math.floor(lums.length * 0.1)];
    const hi = lums[Math.floor(lums.length * 0.9)];
    const mid = (lo + hi) / 2 || 1;
    const spread = Math.max(0.35, Math.min(1.6, (hi - lo) / Math.max(1, mid)));

    const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
    const hex = (rr, gg, bb) => `#${[rr, gg, bb].map((v) => clamp(v).toString(16).padStart(2, '0')).join('')}`;
    const k = (f) => hex(r * f, g * f, b * f);

    // Ratios matched to the shipped palettes, which are the ones proven to read
    // as rock: hi is roughly 1.35x the base and lo roughly half of it. Letting
    // the art's own contrast drive those unbounded sent `lo` to a quarter of
    // base, and since the craters are painted in `lo` the whole surface came
    // out near-black whatever the base was.
    const contrast = Math.max(0.7, Math.min(1.3, spread));
    return {
      ...base,
      base: hex(r, g, b),
      hi: k(1 + 0.35 * contrast),
      lo: k(1 - 0.38 * contrast),
    };
  } catch (_) {
    // A cross-origin or not-yet-decoded image just falls back to the default.
    return base;
  }
}

// ── Shape ───────────────────────────────────────────────────────────────────

// Value noise on the unit sphere, seeded. Deliberately the CPU twin of the
// fbm in Map3DView's star shader — the geometry has to be deformed before it
// reaches the GPU, so this cannot be done in a vertex shader without also
// recomputing normals there.
function noise3(seed) {
  const rnd = mulberry32(seed);
  const perm = new Float32Array(512);
  for (let i = 0; i < 512; i++) perm[i] = rnd();
  const hash = (x, y, z) => {
    const h = (Math.imul(x, 73856093) ^ Math.imul(y, 19349663) ^ Math.imul(z, 83492791)) >>> 0;
    return perm[h & 511];
  };
  const smooth = (t) => t * t * (3 - 2 * t);
  return (x, y, z) => {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const xf = smooth(x - xi), yf = smooth(y - yi), zf = smooth(z - zi);
    const lerp = (a, b, t) => a + (b - a) * t;
    const c000 = hash(xi, yi, zi),         c100 = hash(xi + 1, yi, zi);
    const c010 = hash(xi, yi + 1, zi),     c110 = hash(xi + 1, yi + 1, zi);
    const c001 = hash(xi, yi, zi + 1),     c101 = hash(xi + 1, yi, zi + 1);
    const c011 = hash(xi, yi + 1, zi + 1), c111 = hash(xi + 1, yi + 1, zi + 1);
    return lerp(
      lerp(lerp(c000, c100, xf), lerp(c010, c110, xf), yf),
      lerp(lerp(c001, c101, xf), lerp(c011, c111, xf), yf),
      zf,
    );
  };
}

/**
 * Push a sphere's vertices around until it looks like a rock.
 *
 * Mutates the geometry in place and returns it. UVs are left alone: they are
 * still the sphere's, which is what the equirectangular map above expects, and
 * displacing along the normal barely disturbs them.
 *
 * @param {object} geo a THREE.BufferGeometry from SphereGeometry
 * @param {object} opts { key, seed }
 */
export function deformRock(geo, { key, seed = 1 }) {
  const t = ROCK_PALETTES[key] || ROCK_PALETTES.rocky;
  const n = noise3(seed);
  const pos = geo.attributes.position;
  const v = { x: 0, y: 0, z: 0 };

  for (let i = 0; i < pos.count; i++) {
    v.x = pos.getX(i); v.y = pos.getY(i); v.z = pos.getZ(i);
    const len = Math.hypot(v.x, v.y, v.z) || 1;
    const ux = v.x / len, uy = v.y / len, uz = v.z / len;

    // Two octaves: the coarse one gives the rock its overall lopsidedness, the
    // fine one its bumps. Sampled on the UNIT sphere so the seam at the UV
    // wrap gets the same displacement from both sides and cannot split open.
    const coarse = n(ux * 1.7 + 11.3, uy * 1.7 + 5.1, uz * 1.7 + 2.7);
    const fine = n(ux * 5.3 + 3.7, uy * 5.3 + 9.2, uz * 5.3 + 6.1);
    const d = 1 + (coarse - 0.5) * t.lumpy * 2 + (fine - 0.5) * t.lumpy * 0.7;

    pos.setXYZ(i, ux * len * d, uy * len * d, uz * len * d);
  }
  pos.needsUpdate = true;

  // Faceting has to come from the GEOMETRY here, not the material.
  //
  // `material.flatShading` is honoured by three's built-in materials, which
  // recompute the normal from screen-space derivatives. These rocks are drawn
  // with a custom ShaderMaterial that reads the `normal` attribute, so the flag
  // did nothing and crystal came out as a smooth purple lump. Splitting the
  // geometry so no vertex is shared makes computeVertexNormals produce one
  // normal per face, which is flat shading by construction.
  if (t.facets) {
    const faceted = geo.toNonIndexed();
    faceted.computeVertexNormals();
    geo.dispose();
    return faceted;
  }
  geo.computeVertexNormals();
  return geo;
}

export function rockIsFaceted(key) {
  return !!(ROCK_PALETTES[key] || {}).facets;
}
