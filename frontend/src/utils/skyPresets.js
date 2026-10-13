// Built-in skies for maps with no panorama uploaded.
//
// The 3D view only raises its sky sphere when a map has a `sky_image_path`, so
// a map without one has no sky at all — you look out past the board's edge into
// the flat background colour. These fill that in without anyone having to find,
// convert and upload an equirectangular photograph for every map.
//
// DRAWN, NOT SHIPPED
// ──────────────────
// Each sky is painted onto a canvas at load time rather than being an image
// file in the repo. Nothing to host, nothing to fetch, no licensing to check,
// and a 2048x1024 panorama that would be a megabyte as a JPEG costs a few
// hundred lines of drawing instead. They are cached after the first build, so a
// map switching back and forth pays for it once.
//
// EQUIRECTANGULAR ORIENTATION
// ───────────────────────────
// three.js maps a SphereGeometry's V coordinate to 1 at the top pole, and a
// texture's V=1 is the TOP row of the image. So the top of the canvas becomes
// the zenith and the bottom becomes the nadir: these are drawn sky-at-the-top,
// which is also how they read while being written.
//
// The left and right edges meet behind the viewer, so anything placed near one
// edge is drawn again at the other — see `wrapped`. Without that there is a
// visible seam running up the sky at one bearing.
import * as THREE from 'three';

const W = 2048;
const H = 1024;

// The horizon sits at the vertical middle of an equirectangular panorama.
const HORIZON = H / 2;

// Deterministic pseudo-random, so a given sky looks identical every time it is
// built rather than reshuffling its stars on every map change.
function rnd(seed) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

// Draws something at x, and again a full width either side when it is close
// enough to an edge to be cut in half by the seam.
function wrapped(ctx, x, margin, draw) {
  draw(x);
  if (x < margin) draw(x + W);
  if (x > W - margin) draw(x - W);
}

function vertical(ctx, stops) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  for (const [at, color] of stops) g.addColorStop(at, color);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

// A soft blob — the building block for clouds, nebulae and glows.
function blob(ctx, x, y, r, inner, outer) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, inner);
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

// Stars thin out towards the horizon, where atmosphere and terrain would eat
// them, and cluster towards the zenith. `band` adds a milky-way style drift.
function stars(ctx, count, seed, { maxSize = 1.9, band = null, warmth = 0 } = {}) {
  for (let i = 0; i < count; i++) {
    const x = rnd(seed + i * 1.7) * W;
    // Biased upward: squaring pushes the distribution towards the zenith.
    const v = rnd(seed + i * 3.1 + 0.5) ** 1.6;
    let y = v * HORIZON;
    if (band) {
      // Pull a share of the stars onto a great circle for a galactic band.
      const onBand = rnd(seed + i * 5.3) < band.share;
      if (onBand) {
        const bandY = band.at + Math.sin((x / W) * Math.PI * 2 + band.phase) * band.amp;
        y = bandY + (rnd(seed + i * 7.9) - 0.5) * band.thickness;
      }
    }
    if (y < 0 || y > HORIZON * 1.02) continue;
    // Fainter near the horizon.
    const fade = 1 - Math.min(1, (y / HORIZON) ** 2 * 0.85);
    const b = (0.35 + rnd(seed + i * 11.3) * 0.65) * fade;
    const r = 0.4 + rnd(seed + i * 13.7) ** 3 * maxSize;
    const tint = rnd(seed + i * 17.1);
    const col = warmth && tint > 0.9 ? `255,${Math.round(210 + tint * 30)},190`
      : tint > 0.82 ? '200,220,255'
      : '255,255,255';
    ctx.fillStyle = `rgba(${col},${b.toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    // A glint on the brightest few, so the sky has some structure to it.
    if (b > 0.85 && r > 1.4) {
      ctx.strokeStyle = `rgba(255,255,255,${(b * 0.35).toFixed(3)})`;
      ctx.lineWidth = 0.6;
      const len = r * 4;
      ctx.beginPath();
      ctx.moveTo(x - len, y); ctx.lineTo(x + len, y);
      ctx.moveTo(x, y - len); ctx.lineTo(x, y + len);
      ctx.stroke();
    }
  }
}

// Cloud built from many faint, WIDE puffs.
//
// The first version used nine opaque circles and looked exactly like nine
// circles — a cluster of bubbles rather than cloud. Three things fix that:
// many more puffs at much lower alpha so they merge instead of stacking
// visibly; squashing each one horizontally, because clouds are far wider than
// they are tall; and spreading them along a shallow arc rather than a blob.
function cloud(ctx, cx, cy, scale, seed, inner, outer) {
  const puffs = 26;
  for (let i = 0; i < puffs; i++) {
    const t = i / (puffs - 1);
    // Along the cloud, with jitter — a drift, not a disc.
    const dx = (t - 0.5) * scale * 3.4 + (rnd(seed + i * 2.3) - 0.5) * scale * 0.8;
    // Bunched vertically: the top is domed, the base flat-ish.
    const dy = (rnd(seed + i * 4.7) - 0.5) * scale * 0.45
             - Math.sin(t * Math.PI) * scale * 0.25;
    const r = scale * (0.35 + rnd(seed + i * 6.1) * 0.5) * (0.55 + Math.sin(t * Math.PI) * 0.75);
    wrapped(ctx, cx + dx, scale * 4, (x) => {
      ctx.save();
      ctx.translate(x, cy + dy);
      // Wider than tall.
      ctx.scale(1.7, 0.62);
      blob(ctx, 0, 0, r, inner, outer);
      ctx.restore();
    });
  }
}

// Rock, for a ceiling rather than a sky.
//
// Large soft blobs alone read as mud — the eye needs high-frequency detail and
// hard edges to call something stone. So this is three passes: broad tonal
// variation, then fine grain, then dark cracks with actual corners in them.
function mottle(ctx, seed, count, colors) {
  // Broad shading.
  for (let i = 0; i < count; i++) {
    const x = rnd(seed + i * 1.3) * W;
    const y = rnd(seed + i * 2.9) * H;
    const r = 40 + rnd(seed + i * 5.1) * 220;
    const c = colors[Math.floor(rnd(seed + i * 7.7) * colors.length)];
    wrapped(ctx, x, r * 1.2, (px) => blob(ctx, px, y, r, c, 'rgba(0,0,0,0)'));
  }
  // Grain: small specks, light and dark, which is what stops it looking blurred.
  for (let i = 0; i < 2600; i++) {
    const x = rnd(seed + 900 + i * 1.7) * W;
    const y = rnd(seed + 900 + i * 3.1) * H;
    const r = 1 + rnd(seed + 900 + i * 5.9) ** 2 * 7;
    const light = rnd(seed + 900 + i * 7.3) > 0.6;
    ctx.fillStyle = light
      ? `rgba(150,128,104,${(0.05 + rnd(seed + i) * 0.13).toFixed(3)})`
      : `rgba(12,9,7,${(0.06 + rnd(seed + i) * 0.16).toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // Cracks: jagged dark lines, a few of them, following a wandering path.
  ctx.lineCap = 'round';
  for (let i = 0; i < 26; i++) {
    const x0 = rnd(seed + 1700 + i * 2.1) * W;
    const y0 = rnd(seed + 1700 + i * 4.3) * H;
    const segs = 4 + Math.floor(rnd(seed + 1700 + i * 6.7) * 6);
    let dir = rnd(seed + 1700 + i * 8.9) * Math.PI * 2;
    ctx.strokeStyle = `rgba(8,6,5,${(0.22 + rnd(seed + i * 3.3) * 0.3).toFixed(3)})`;
    ctx.lineWidth = 1 + rnd(seed + i * 5.5) * 2.6;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    let x = x0, y = y0;
    for (let sgm = 0; sgm < segs; sgm++) {
      dir += (rnd(seed + 1700 + i * 11 + sgm) - 0.5) * 1.5;
      const len = 20 + rnd(seed + 1700 + i * 13 + sgm) * 90;
      x += Math.cos(dir) * len;
      y += Math.sin(dir) * len * 0.6;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}

// ── The skies ───────────────────────────────────────────────────────────────
//
// Each is `{ id, label, hint, draw(ctx) }`. Order is the order they appear in
// the picker, commonest first.
export const SKY_PRESETS = [
  {
    id: 'night',
    label: 'Night sky',
    hint: 'Deep blue, stars, a faint galactic band',
    draw(ctx) {
      vertical(ctx, [
        [0, '#04060f'], [0.32, '#0a1122'], [0.5, '#16233c'], [0.52, '#0d1524'], [1, '#05070d'],
      ]);
      stars(ctx, 900, 11, { band: { at: HORIZON * 0.45, amp: HORIZON * 0.16, thickness: 120, share: 0.35, phase: 1.1 } });
      // The band's own haze, behind the stars on it.
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 26; i++) {
        const x = (i / 26) * W;
        const y = HORIZON * 0.45 + Math.sin((x / W) * Math.PI * 2 + 1.1) * HORIZON * 0.16;
        wrapped(ctx, x, 260, (px) => blob(ctx, px, y, 230, 'rgba(120,140,200,0.055)', 'rgba(120,140,200,0)'));
      }
      ctx.globalCompositeOperation = 'source-over';
      // Horizon lift, as if from a distant settlement.
      blob(ctx, W * 0.62, HORIZON, W * 0.3, 'rgba(90,110,160,0.16)', 'rgba(90,110,160,0)');
    },
  },
  {
    id: 'day',
    label: 'Clear day',
    hint: 'Blue sky with high cloud',
    draw(ctx) {
      vertical(ctx, [
        [0, '#2c6fd0'], [0.3, '#5b9be0'], [0.48, '#a8cdea'], [0.5, '#c3d8e6'], [0.55, '#8fa4b3'], [1, '#4a5a68'],
      ]);
      // Cumulus along a band above the horizon, thinning with height.
      for (let i = 0; i < 16; i++) {
        const x = rnd(31 + i * 3.3) * W;
        const y = HORIZON * (0.30 + rnd(31 + i * 5.9) * 0.62);
        const s = 46 + rnd(31 + i * 7.1) * 120;
        cloud(ctx, x, y, s, 61 + i * 9, 'rgba(255,255,255,0.92)', 'rgba(255,255,255,0)');
        cloud(ctx, x, y + s * 0.35, s * 0.9, 97 + i * 5, 'rgba(196,214,232,0.5)', 'rgba(196,214,232,0)');
      }
      // Sun glow, no disc — a disc in a panorama looks pasted on.
      blob(ctx, W * 0.28, HORIZON * 0.34, W * 0.16, 'rgba(255,250,225,0.5)', 'rgba(255,250,225,0)');
    },
  },
  {
    id: 'dusk',
    label: 'Sunset',
    hint: 'Warm horizon fading to deep blue overhead',
    draw(ctx) {
      vertical(ctx, [
        [0, '#101a3a'], [0.22, '#33356b'], [0.36, '#8a4a6a'], [0.45, '#d4713f'], [0.49, '#f0a052'],
        [0.5, '#e8944a'], [0.56, '#5c4038'], [1, '#1d1a1f'],
      ]);
      // The sun's afterglow, low and wide.
      blob(ctx, W * 0.5, HORIZON * 1.0, W * 0.34, 'rgba(255,190,120,0.55)', 'rgba(255,150,90,0)');
      blob(ctx, W * 0.5, HORIZON * 0.98, W * 0.14, 'rgba(255,235,190,0.6)', 'rgba(255,200,130,0)');
      // Cloud bars lit from beneath, which is what sells a sunset.
      // Alpha is LOW here on purpose. `cloud` lays down 26 overlapping puffs;
      // at the 0.72 the first version used they stacked into a solid dark mass
      // with visible circular lobes — a pile of bubbles, not cloud. Thin layers
      // that accumulate is the whole idea.
      for (let i = 0; i < 15; i++) {
        const x = rnd(211 + i * 4.1) * W;
        const y = HORIZON * (0.36 + rnd(211 + i * 6.3) * 0.6);
        const s = 34 + rnd(211 + i * 8.7) * 96;
        // Lit from the sun's bearing: near it they catch the light, away from
        // it they fall into silhouette.
        const warm = Math.max(0, 1 - Math.abs(x / W - 0.5) * 1.9);
        cloud(ctx, x, y, s, 307 + i * 11,
          `rgba(${Math.round(96 + warm * 150)},${Math.round(74 + warm * 96)},${Math.round(92 + warm * 46)},0.15)`,
          'rgba(50,38,46,0)');
      }
      // A few darker bars right on the horizon, where cloud stacks up.
      for (let i = 0; i < 6; i++) {
        const x = rnd(913 + i * 5.7) * W;
        const s = 60 + rnd(913 + i * 7.3) * 120;
        cloud(ctx, x, HORIZON * 0.94, s, 1009 + i * 13,
          'rgba(70,44,52,0.16)', 'rgba(70,44,52,0)');
      }
      stars(ctx, 220, 401, { maxSize: 1.2 });
    },
  },
  {
    id: 'overcast',
    label: 'Overcast',
    hint: 'Flat grey cloud, no sun',
    draw(ctx) {
      vertical(ctx, [
        [0, '#5c636e'], [0.34, '#79818c'], [0.48, '#9aa2ac'], [0.5, '#8d949d'], [1, '#3f444b'],
      ]);
      // Broken cloud base: many overlapping soft blobs, some light, some dark.
      for (let i = 0; i < 46; i++) {
        const x = rnd(509 + i * 2.7) * W;
        const y = HORIZON * (0.1 + rnd(509 + i * 4.3) * 0.88);
        const s = 70 + rnd(509 + i * 6.9) * 200;
        const light = rnd(509 + i * 9.1) > 0.55;
        cloud(ctx, x, y, s, 601 + i * 7,
          light ? 'rgba(186,193,201,0.30)' : 'rgba(74,80,88,0.30)',
          'rgba(0,0,0,0)');
      }
    },
  },
  {
    id: 'wildspace',
    label: 'Wildspace',
    hint: 'Black, dense stars, nebulae — for spelljammer maps',
    draw(ctx) {
      ctx.fillStyle = '#02030a';
      ctx.fillRect(0, 0, W, H);
      // Nebulae first, so stars sit in front of them.
      ctx.globalCompositeOperation = 'lighter';
      const clouds = [
        [W * 0.18, H * 0.30, W * 0.26, 'rgba(120,60,180,0.16)'],
        [W * 0.30, H * 0.42, W * 0.18, 'rgba(200,70,140,0.13)'],
        [W * 0.70, H * 0.24, W * 0.30, 'rgba(40,120,190,0.15)'],
        [W * 0.82, H * 0.40, W * 0.16, 'rgba(70,190,190,0.11)'],
        [W * 0.50, H * 0.62, W * 0.34, 'rgba(60,50,140,0.10)'],
      ];
      for (const [x, y, r, c] of clouds) {
        wrapped(ctx, x, r * 1.2, (px) => blob(ctx, px, y, r, c, 'rgba(0,0,0,0)'));
      }
      ctx.globalCompositeOperation = 'source-over';
      // Wildspace has no horizon and no atmosphere, so stars fill the sphere
      // evenly — the usual upward bias would look wrong out here.
      for (let i = 0; i < 1800; i++) {
        const x = rnd(701 + i * 1.9) * W;
        const y = rnd(701 + i * 3.7) * H;
        const b = 0.25 + rnd(701 + i * 5.1) ** 2 * 0.75;
        const r = 0.35 + rnd(701 + i * 7.3) ** 3 * 1.9;
        const t = rnd(701 + i * 9.7);
        const col = t > 0.93 ? '255,220,190' : t > 0.86 ? '200,220,255' : '255,255,255';
        ctx.fillStyle = `rgba(${col},${b.toFixed(3)})`;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
        if (b > 0.9 && r > 1.5) {
          ctx.strokeStyle = `rgba(255,255,255,${(b * 0.3).toFixed(3)})`;
          ctx.lineWidth = 0.7;
          const len = r * 5;
          ctx.beginPath();
          ctx.moveTo(x - len, y); ctx.lineTo(x + len, y);
          ctx.moveTo(x, y - len); ctx.lineTo(x, y + len);
          ctx.stroke();
        }
      }
    },
  },
  {
    id: 'cavern',
    label: 'Cavern',
    hint: 'Rock overhead, for underground maps',
    draw(ctx) {
      vertical(ctx, [
        [0, '#14100e'], [0.35, '#241d18'], [0.5, '#2e251d'], [0.62, '#1d1713'], [1, '#0b0908'],
      ]);
      mottle(ctx, 811, 90, [
        'rgba(66,53,42,0.45)', 'rgba(26,20,16,0.55)', 'rgba(88,70,54,0.3)', 'rgba(16,12,10,0.5)',
      ]);
      // A faint warm wash near the horizon, as if from lamps on the floor.
      blob(ctx, W * 0.5, HORIZON * 1.06, W * 0.55, 'rgba(180,120,60,0.10)', 'rgba(180,120,60,0)');
      blob(ctx, W * 0.14, HORIZON * 1.02, W * 0.18, 'rgba(200,140,70,0.09)', 'rgba(200,140,70,0)');
    },
  },
];

export const SKY_PRESET_IDS = SKY_PRESETS.map((p) => p.id);

export function skyPresetById(id) {
  return SKY_PRESETS.find((p) => p.id === id) || null;
}

// Built once per preset and kept. Switching maps back and forth should not
// repaint two megapixels of stars each time.
const cache = new Map();

/**
 * The texture for a preset, or null for an unknown id. Safe to call every
 * render: the result is cached.
 */
export function skyPresetTexture(id) {
  if (!id) return null;
  if (cache.has(id)) return cache.get(id);
  const preset = skyPresetById(id);
  if (!preset) return null;

  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');
  try {
    preset.draw(ctx);
  } catch (err) {
    // A half-drawn sky is still better than none, and a broken preset must not
    // take the 3D view down with it.
    console.warn(`sky preset "${id}" failed to draw:`, err);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  // Wraps horizontally — it is a full 360 panorama. Vertically it must clamp,
  // or the poles bleed the opposite end of the gradient into themselves.
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  cache.set(id, tex);
  return tex;
}

// Thumbnails, drawn once and kept.
//
// NOT "cheap" as the old comment claimed. Each call draws a procedural sky —
// mottle() alone is a per-pixel noise pass — and then PNG-encodes it through
// toDataURL, which is one of the most expensive things a browser can be asked
// to do synchronously on the main thread.
//
// The picker calls this INLINE in its JSX, once per preset, so it ran on every
// render of the GM panel. With a patrol ticking the token list four times a
// second that was roughly twenty-four PNG encodes per second: measured on the
// live GM view, `toDataURL` accounted for 7.5 SECONDS of main thread in a
// 15-second drag. That is the lag on the toolbar, the stutter while dragging,
// and — since every call returns a fresh multi-kilobyte base64 string for the
// browser to decode into a fresh image — the memory too.
//
// A preset's drawing never changes, so the answer is the same every time. Six
// entries, computed once each, keyed by size because the picker may ask for
// more than one. Returning the SAME string also matters: an identical `src`
// leaves the <img> alone instead of decoding a new image on every render.
const previewUrlCache = new Map();

/** A small preview of a preset, for the picker. Generated once per (id, size). */
export function skyPresetPreviewUrl(id, w = 128, h = 64) {
  const cacheKey = `${id}|${w}x${h}`;
  if (previewUrlCache.has(cacheKey)) return previewUrlCache.get(cacheKey);
  const preset = skyPresetById(id);
  if (!preset) { previewUrlCache.set(cacheKey, null); return null; }
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  // The presets draw at full size, so scale the whole thing down.
  ctx.scale(w / W, h / H);
  try { preset.draw(ctx); } catch { /* preview only */ }
  const url = c.toDataURL('image/png');
  previewUrlCache.set(cacheKey, url);
  return url;
}

// Let the 3D view hand the sky back.
//
// These are full-screen equirectangular textures and they live in a module
// cache, which is exactly right while the 3D view is open and exactly wrong
// once it closes: measured on the live GM view, everything the 3D view holds
// came to 1.26GB of GPU memory that was never released on the way out.
export function disposeSkyTextures() {
  for (const tex of cache.values()) tex?.dispose?.();
  cache.clear();
}
