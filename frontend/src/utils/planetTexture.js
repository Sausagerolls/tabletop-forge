// planetTexture.js — equirectangular surface maps for the shipped planet
// markers, so a world that is a flat disc on the 2D board becomes a real
// sphere in the 3D view.
//
// Why a fresh render rather than the marker's own art:
//
// The shipped SVG (backend/src/planetArt.js) is an ORTHOGRAPHIC picture of one
// hemisphere with the lighting already painted into it — a limb-darkening
// gradient over the top and a rim highlight on the edge. Wrapping that image
// round a sphere paints the shadow onto the geography: the terminator stops
// being where the light isn't and becomes a permanent dark ring baked into the
// surface, rotating with the planet. So the sphere gets its own map, drawn in
// lon/lat with no lighting in it at all, and the shading is done by the shader
// where it belongs.
//
// The palettes and the feature vocabulary below are deliberately the same as
// planetArt.js's, so "Verdant World" is the same green in both views. They are
// duplicated rather than imported because that module is CommonJS and runs
// server-side; the constant that matters is the colour, and a mismatch would
// be obvious the moment someone toggled between 2D and 3D.

// Same generator as the backend's, so a given seed gives a repeatable world.
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Palettes lifted from planetArt.js. `atmo` is new — the flat art fakes an
// atmosphere with a fixed rim gradient, but a sphere needs to know what colour
// its air is so the limb can catch light only on the lit side.
export const PLANET_PALETTES = {
  terran:   { base: '#2f6ea8', land: ['#4f7f4a', '#6b8f52', '#8a7a4e'], cloud: 0.55, ice: true,  atmo: '#bcd8ff', atmoAmt: 0.85 },
  ocean:    { base: '#1d5c93', land: ['#2a6ea3', '#37809f'],            cloud: 0.75, ice: true,  atmo: '#bcd8ff', atmoAmt: 0.90 },
  desert:   { base: '#b8823f', land: ['#a06a30', '#cf9d55', '#8d5a29'], cloud: 0.15, ice: false, atmo: '#e8c89a', atmoAmt: 0.40 },
  jungle:   { base: '#2f7a4a', land: ['#256b3c', '#489a5b', '#7d8f3c'], cloud: 0.45, ice: true,  atmo: '#c6e6c0', atmoAmt: 0.75 },
  ice:      { base: '#cfe3f2', land: ['#a9cbe4', '#e8f4fb'],            cloud: 0.30, ice: false, atmo: '#d8f0ff', atmoAmt: 0.55 },
  barren:   { base: '#8b8b93', land: ['#75757d', '#a2a2aa'],            cloud: 0,    ice: false, craters: true, atmo: '#000000', atmoAmt: 0 },
  volcanic: { base: '#3a2320', land: ['#2a1917', '#4a2d26'],            cloud: 0.12, ice: false, lava: true,    atmo: '#ff9060', atmoAmt: 0.45 },
  toxic:    { base: '#9aa83f', land: ['#8b9a35', '#b7c25a'],            cloud: 0.65, ice: false, atmo: '#c8e07a', atmoAmt: 0.80 },
  gas:      { base: '#c08f5e', bands: ['#a97748', '#d8ab74', '#8d6238', '#e3c193'], storm: true,  atmo: '#f0d2a8', atmoAmt: 0.85 },
  icegiant: { base: '#4f8fbf', bands: ['#3f7cab', '#6fa9d2', '#356b96', '#8cc0e0'], storm: false, atmo: '#a8d4f0', atmoAmt: 0.85 },
};

// Which palette each shipped marker uses. Several files share a type on
// purpose — "Desert World" and "Dune World" are the same kind of place with
// different seeds, and the seed is what makes them different pictures.
const MARKER_TYPES = {
  'terran-world': 'terran',
  'cradle-world': 'terran',
  'ocean-world': 'ocean',
  'verdant-world': 'jungle',
  'desert-world': 'desert',
  'dune-world': 'desert',
  'ice-world': 'ice',
  'barren-moon': 'barren',
  'cratered-moon': 'barren',
  'volcanic-world': 'volcanic',
  'toxic-world': 'toxic',
  'gas-giant': 'gas',
  'banded-giant': 'gas',
  'ice-giant': 'icegiant',
};

// Stable per-marker seed, so a given world looks the same every time the
// scene is rebuilt rather than reshuffling its continents on every render.
function hashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Is this terrain art one of the shipped planet markers?
 *
 * Keyed on the seeded filename the backend writes (`terrain/planet-<x>.svg` —
 * see seedPlanetMarkers in backend/src/index.js), so a GM's own uploaded
 * artwork is left alone and keeps its flat plane.
 *
 * @param {string} artPath value of terrain.lib_image_path / image_path
 * @returns {{ key: string, seed: number } | null}
 */
export function planetArtInfo(artPath) {
  if (!artPath) return null;
  const m = String(artPath).match(/(?:^|\/)planet-([a-z0-9-]+)\.svg$/i);
  if (!m) return null;
  const key = MARKER_TYPES[m[1].toLowerCase()];
  if (!key) return null;
  return { key, seed: hashString(m[1].toLowerCase()) };
}

// ── Drawing helpers, all in equirectangular space ───────────────────────────
//
// x runs 0..W over 360° of longitude, y runs 0..H from the north pole to the
// south. Two things follow from that and both matter:
//
//   1. The map wraps at x = 0 / x = W, so anything crossing the seam has to be
//      drawn three times (at -W, 0, +W) or it gets cut in half.
//   2. Longitude is squeezed towards the poles, so a shape drawn at a constant
//      pixel width gets stretched wider the further from the equator it sits.
//      Dividing its width by cos(latitude) cancels that out.

const TAU = Math.PI * 2;

function lonStretch(y, H) {
  const lat = (0.5 - y / H) * Math.PI;   // +π/2 at the north pole
  return 1 / Math.max(0.18, Math.cos(lat));
}

// Run a draw three times so shapes near the seam appear on both edges.
function wrapped(ctx, W, draw) {
  for (const dx of [-W, 0, W]) {
    ctx.save();
    ctx.translate(dx, 0);
    draw();
    ctx.restore();
  }
}

// A closed wobbling blob — the same coastline shape the flat art uses, so
// continents read as continents in both views.
function blobPath(ctx, cx, cy, rx, ry, rnd, wobble = 0.55, points = 11) {
  const pts = [];
  for (let i = 0; i < points; i++) {
    const a = (i / points) * TAU;
    const k = 1 - wobble / 2 + rnd() * wobble;
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 0; i < pts.length; i++) {
    const p0 = pts[i];
    const p1 = pts[(i + 1) % pts.length];
    ctx.quadraticCurveTo(p0[0], p0[1], (p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2);
  }
  ctx.closePath();
  ctx.fill();
}

// Canvas blur, where the browser has it.
//
// Clouds and mottling are meant to be soft edges. Drawn crisp they read as a
// scatter of ovals stuck to the planet — which is what a first pass looked
// like. ctx.filter is unsupported on older Safari, so it is feature-checked
// and simply skipped there: the world is a little harder-edged, not broken.
function withBlur(ctx, px, draw) {
  const supported = typeof ctx.filter === 'string';
  if (supported) ctx.filter = `blur(${px}px)`;
  draw();
  if (supported) ctx.filter = 'none';
}

function ellipse(ctx, cx, cy, rx, ry, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(cx, cy, Math.max(0.5, rx), Math.max(0.5, ry), rot, 0, TAU);
  ctx.fill();
}

/**
 * Draw one world's surface map.
 *
 * @param {object} opts
 * @param {string} opts.key   a key of PLANET_PALETTES
 * @param {number} opts.seed
 * @param {number} [opts.width] texture width; height is half, as equirect requires
 * @returns {HTMLCanvasElement}
 */
export function makePlanetCanvas({ key, seed = 1, width = 1024 }) {
  const t = PLANET_PALETTES[key] || PLANET_PALETTES.barren;
  const rnd = mulberry32(seed);
  const W = width;
  const H = width / 2;

  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');

  ctx.fillStyle = t.base;
  ctx.fillRect(0, 0, W, H);

  if (t.bands) {
    // ── Gas giant ──
    // Latitude bands, which equirect renders as plain horizontal stripes —
    // this is the one case where the projection does the work for free. The
    // wobble along each edge is what stops them reading as a barcode.
    let y = -H * 0.05;
    while (y < H) {
      const h = H * (0.04 + rnd() * 0.11);
      ctx.fillStyle = t.bands[Math.floor(rnd() * t.bands.length)];
      ctx.globalAlpha = 0.5 + rnd() * 0.45;
      const amp = h * (0.10 + rnd() * 0.30);
      const freq = 1 + Math.floor(rnd() * 3);
      const phase = rnd() * TAU;
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x <= W; x += W / 128) {
        ctx.lineTo(x, y + Math.sin((x / W) * TAU * freq + phase) * amp);
      }
      for (let x = W; x >= 0; x -= W / 128) {
        ctx.lineTo(x, y + h + Math.sin((x / W) * TAU * freq + phase + 1.7) * amp);
      }
      ctx.closePath();
      ctx.fill();
      y += h * (0.8 + rnd() * 0.5);
    }
    ctx.globalAlpha = 1;

    // Turbulence, smeared along the bands.
    for (let i = 0; i < 40; i++) {
      const sy = rnd() * H;
      ctx.fillStyle = rnd() > 0.5 ? '#000' : '#fff';
      ctx.globalAlpha = 0.04 + rnd() * 0.09;
      wrapped(ctx, W, () => ellipse(ctx, rnd() * W, sy, W * (0.03 + rnd() * 0.10), H * (0.004 + rnd() * 0.012)));
    }
    ctx.globalAlpha = 1;

    if (t.storm && rnd() > 0.3) {
      // The great storm, parked in one band well off the equator.
      const sx = rnd() * W;
      const sy = H * (0.30 + rnd() * 0.40);
      const rx = W * (0.05 + rnd() * 0.04);
      const ry = rx * (0.42 + rnd() * 0.2);
      wrapped(ctx, W, () => {
        ctx.fillStyle = '#d9694a'; ctx.globalAlpha = 0.8;  ellipse(ctx, sx, sy, rx, ry);
        ctx.fillStyle = '#f0a077'; ctx.globalAlpha = 0.65; ellipse(ctx, sx, sy, rx * 0.6, ry * 0.6);
        ctx.fillStyle = '#ffd9bf'; ctx.globalAlpha = 0.55; ellipse(ctx, sx, sy, rx * 0.22, ry * 0.22);
      });
      ctx.globalAlpha = 1;
    }
  } else {
    // ── Rocky / watery world ──
    // A continent is a cluster of overlapping lobes, not one round blob: three
    // overlapping shapes read as a coast with bays, one reads as a splodge.
    const landCount = 4 + Math.floor(rnd() * 4);
    for (let i = 0; i < landCount; i++) {
      const cx = rnd() * W;
      // Kept off the poles: a continent centred on one wraps all the way round
      // the top of the sphere and looks like a hat.
      const cy = H * (0.15 + rnd() * 0.70);
      const br = H * (0.10 + rnd() * 0.14);
      const stretch = lonStretch(cy, H);
      ctx.fillStyle = t.land[Math.floor(rnd() * t.land.length)];
      ctx.globalAlpha = 0.8 + rnd() * 0.2;
      const lobes = 3 + Math.floor(rnd() * 3);
      for (let j = 0; j < lobes; j++) {
        const la = rnd() * TAU;
        const ld = br * rnd() * 0.9;
        const lx = cx + Math.cos(la) * ld * stretch;
        const ly = cy + Math.sin(la) * ld;
        const lr = br * (0.55 + rnd() * 0.5);
        wrapped(ctx, W, () => blobPath(ctx, lx, ly, lr * stretch, lr, mulberry32(seed + i * 31 + j), 0.55, 11));
      }
    }
    ctx.globalAlpha = 1;

    // Mottling, so flat fills don't read as vector shapes on a coloured field.
    withBlur(ctx, W * 0.006, () => {
      for (let i = 0; i < 90; i++) {
        const my = rnd() * H;
        const stretch = lonStretch(my, H);
        ctx.fillStyle = rnd() > 0.5 ? '#fff' : '#000';
        ctx.globalAlpha = 0.03 + rnd() * 0.05;
        wrapped(ctx, W, () => ellipse(ctx, rnd() * W, my, H * (0.03 + rnd() * 0.10) * stretch, H * (0.02 + rnd() * 0.06)));
      }
    });
    ctx.globalAlpha = 1;

    if (t.craters) {
      const craters = 60 + Math.floor(rnd() * 50);
      for (let i = 0; i < craters; i++) {
        const py = H * (0.03 + rnd() * 0.94);
        const stretch = lonStretch(py, H);
        const px = rnd() * W;
        const pr = H * (0.012 + rnd() * 0.055);
        wrapped(ctx, W, () => {
          ctx.fillStyle = '#000';
          ctx.globalAlpha = 0.10 + rnd() * 0.16;
          ellipse(ctx, px, py, pr * stretch, pr);
          // Lit rim arc, offset so every crater catches the light the same way
          // — it is the offset, not the ring, that reads as a bowl.
          ctx.globalAlpha = 0.14;
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = Math.max(0.6, pr * 0.16);
          ctx.beginPath();
          ctx.ellipse(px - pr * 0.15 * stretch, py - pr * 0.15, pr * 0.82 * stretch, pr * 0.82, 0, 0, TAU);
          ctx.stroke();
        });
      }
      ctx.globalAlpha = 1;
    }

    if (t.lava) {
      const veins = 22 + Math.floor(rnd() * 18);
      for (let i = 0; i < veins; i++) {
        const vy0 = H * (0.08 + rnd() * 0.84);
        const stretch = lonStretch(vy0, H);
        const vx0 = rnd() * W;
        const pts = [[vx0, vy0]];
        let ang = rnd() * TAU;
        const segs = 3 + Math.floor(rnd() * 4);
        for (let s = 0; s < segs; s++) {
          ang += (rnd() - 0.5) * 1.5;
          const len = H * (0.03 + rnd() * 0.08);
          pts.push([
            pts[pts.length - 1][0] + Math.cos(ang) * len * stretch,
            pts[pts.length - 1][1] + Math.sin(ang) * len,
          ]);
        }
        const stroke = (col, w, alpha) => {
          ctx.strokeStyle = col;
          ctx.lineWidth = w;
          ctx.globalAlpha = alpha;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(pts[0][0], pts[0][1]);
          for (const p of pts.slice(1)) ctx.lineTo(p[0], p[1]);
          ctx.stroke();
        };
        wrapped(ctx, W, () => {
          stroke('#ff7a2f', Math.max(1, H * 0.012), 0.85);
          stroke('#ffd08a', Math.max(0.8, H * 0.004), 0.8);
        });
      }
      ctx.globalAlpha = 1;
    }

    if (t.ice) {
      // Polar caps. In equirect a cap IS the top and bottom edge of the map,
      // so they're gradient bands rather than the ellipses the flat art uses.
      const capN = H * (0.08 + rnd() * 0.08);
      const capS = H * (0.07 + rnd() * 0.08);
      const gN = ctx.createLinearGradient(0, 0, 0, capN);
      gN.addColorStop(0, 'rgba(244,251,255,0.95)');
      gN.addColorStop(0.55, 'rgba(230,243,251,0.55)');
      gN.addColorStop(1, 'rgba(220,238,250,0)');
      ctx.fillStyle = gN;
      ctx.fillRect(0, 0, W, capN);
      const gS = ctx.createLinearGradient(0, H, 0, H - capS);
      gS.addColorStop(0, 'rgba(244,251,255,0.95)');
      gS.addColorStop(0.55, 'rgba(230,243,251,0.55)');
      gS.addColorStop(1, 'rgba(220,238,250,0)');
      ctx.fillStyle = gS;
      ctx.fillRect(0, H - capS, W, capS);
      // Ragged edge, so the cap doesn't end on a ruled line.
      ctx.fillStyle = 'rgba(240,249,255,0.7)';
      for (let i = 0; i < 40; i++) {
        const px = rnd() * W;
        ellipse(ctx, px, capN * (0.85 + rnd() * 0.5), W * 0.02, H * 0.012);
        ellipse(ctx, px, H - capS * (0.85 + rnd() * 0.5), W * 0.02, H * 0.012);
      }
    }

    if (t.cloud > 0) {
      // Clouds run along latitudes — wide and shallow. A round white blob
      // reads as a hole punched in the planet.
      const clouds = Math.round(t.cloud * (90 + rnd() * 60));
      withBlur(ctx, W * 0.008, () => {
        for (let i = 0; i < clouds; i++) {
          const wy = H * (0.04 + rnd() * 0.92);
          const stretch = lonStretch(wy, H);
          const wx = rnd() * W;
          const rx = W * (0.02 + rnd() * 0.06) * Math.min(3, stretch);
          const ry = rx * (0.16 + rnd() * 0.22) / Math.min(3, stretch);
          ctx.fillStyle = '#fff';
          ctx.globalAlpha = 0.10 + rnd() * 0.22;
          wrapped(ctx, W, () => ellipse(ctx, wx, wy, rx, ry, (rnd() - 0.5) * 0.4));
        }
      });
      ctx.globalAlpha = 1;
    }
  }

  // Poles get sampled from a single row of pixels, so whatever colour sits in
  // the top and bottom rows becomes the whole pole cap. Flattening each to its
  // own average stops one stray continent pixel smearing over the pole.
  flattenPoleRows(ctx, W, H);

  return c;
}

// Average the top and bottom few rows across their full width. Cheap, and it
// is the difference between a clean pole and a pinwheel of stretched pixels.
function flattenPoleRows(ctx, W, H) {
  const bands = Math.max(2, Math.round(H * 0.015));
  for (const top of [true, false]) {
    const y0 = top ? 0 : H - bands;
    const img = ctx.getImageData(0, y0, W, bands);
    let r = 0, g = 0, b = 0;
    const n = W * bands;
    for (let i = 0; i < n; i++) {
      r += img.data[i * 4];
      g += img.data[i * 4 + 1];
      b += img.data[i * 4 + 2];
    }
    ctx.fillStyle = `rgb(${Math.round(r / n)}, ${Math.round(g / n)}, ${Math.round(b / n)})`;
    ctx.fillRect(0, y0, W, bands);
  }
}
