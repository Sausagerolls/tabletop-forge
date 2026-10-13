// systemMap.js — procedural star-system map art.
//
// A hexcrawl across a solar system: the map IS the system, seen from above.
// A star (or several) sits at the centre, orbital rings mark the tracks, and
// the GM drops planet tokens wherever they want them. Nothing here draws a
// planet — that's the whole point, the planets are tokens.
//
// SVG rather than raster for the same reason the shipped system markers are
// (see seedSystemMarkers in index.js): a map gets zoomed from fit-to-screen
// down to a single hex, and vector stays sharp at both ends for a few KB.
// The palette is deliberately the markers' one, so a system map and a system
// marker on an overland map read as the same universe.

// Deterministic PRNG, so a seed reproduces a starfield exactly. A GM who
// regenerates at a different size gets the same sky, which matters when the
// map has already been shown to the table.
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Star colours by type. Ordered so a multi-star system reads as a hierarchy:
// the primary is the big yellow one, companions are visibly different.
const STAR_TYPES = [
  { core: '#fff6cf', glow: '#ffd873' }, // yellow primary
  { core: '#dbe9ff', glow: '#9fc4ff' }, // blue-white companion
  { core: '#ffd2b0', glow: '#ff9d6b' }, // red dwarf
  { core: '#ffffff', glow: '#e6ccff' }, // white/violet oddity
];

const RING_STROKE = '#a8c4ff';

function esc(n) {
  return Number(n.toFixed(1));
}

/**
 * Render a system map as an SVG string.
 *
 * @param {object} opts
 * @param {number} opts.width      px
 * @param {number} opts.height     px
 * @param {number} opts.stars      how many stars at the centre (1–4)
 * @param {number} opts.rings      how many orbital rings (1–12)
 * @param {number} [opts.seed]     starfield seed
 * @param {boolean} [opts.labelRings] number the rings in the margin
 */
/**
 * The system's geometry, in map pixels.
 *
 * Split out from the SVG so the 3D view can build real spheres and rings from
 * the same numbers the flat art was drawn with. Persisted with the map at
 * generation time rather than recomputed client-side: a mirrored copy of these
 * formulas would drift the first time one of them was tuned, and the symptom
 * would be orbits that don't line up with the picture underneath them.
 */
function systemGeometry({ width, height, stars = 1, rings = 4 }) {
  const w = Math.max(256, Math.round(width));
  const h = Math.max(256, Math.round(height));
  const cx = w / 2;
  const cy = h / 2;

  const starCount = Math.min(STAR_TYPES.length, Math.max(1, Math.round(stars)));
  const ringCount = Math.min(12, Math.max(1, Math.round(rings)));

  // Star geometry first: the innermost ring has to clear the glow, or the
  // first orbit is drawn through the fire it's meant to be orbiting.
  const coreR = Math.min(w, h) * (starCount > 1 ? 0.028 : 0.036);
  const baryR = starCount > 1 ? Math.min(w, h) * 0.035 : 0;
  const glowOuter = baryR + coreR * 3.4;

  // The outermost ring keeps a margin so tokens parked on it aren't half off
  // the map.
  const maxR = (Math.min(w, h) / 2) * 0.92;
  const minR = Math.max(Math.min(w, h) * 0.11, glowOuter * 1.25);
  const ringGap = ringCount > 1 ? (maxR - minR) / (ringCount - 1) : 0;
  const ringRadii = Array.from({ length: ringCount }, (_, i) => minR + i * ringGap);

  // One star sits dead centre. Several orbit a common barycentre, spaced
  // evenly around a small circle so the system still reads as centred.
  const starList = Array.from({ length: starCount }, (_, i) => {
    const t = STAR_TYPES[i];
    const ang = (i / starCount) * Math.PI * 2 - Math.PI / 2;
    return {
      x: cx + Math.cos(ang) * baryR,
      y: cy + Math.sin(ang) * baryR,
      // Companions are a touch smaller than the primary.
      r: coreR * (i === 0 ? 1 : 0.78),
      core: t.core,
      glow: t.glow,
    };
  });

  return { w, h, cx, cy, coreR, baryR, glowOuter, ringRadii, stars: starList, ringColor: RING_STROKE };
}

function renderSystemSvg({ width, height, stars = 1, rings = 4, seed = 1, labelRings = true }) {
  const geom = systemGeometry({ width, height, stars, rings });
  const { w, h, cx, cy, coreR, ringRadii } = geom;
  const rnd = mulberry32(seed);
  const starCount = geom.stars.length;
  const maxR = (Math.min(w, h) / 2) * 0.92;

  const out = [];
  out.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">`);

  // ── defs: the void, plus one glow per star ──
  out.push('<defs>');
  out.push(
    `<radialGradient id="space" cx="50%" cy="50%" r="70%">` +
    `<stop offset="0%" stop-color="#141a33"/><stop offset="100%" stop-color="#05070f"/>` +
    `</radialGradient>`
  );
  for (let i = 0; i < starCount; i++) {
    const t = STAR_TYPES[i];
    const { x: gx, y: gy, r: gr } = geom.stars[i];
    out.push(
      `<radialGradient id="glow${i}" cx="50%" cy="50%" r="50%">` +
      `<stop offset="0%" stop-color="${t.glow}" stop-opacity="0.85"/>` +
      `<stop offset="45%" stop-color="${t.glow}" stop-opacity="0.30"/>` +
      `<stop offset="100%" stop-color="${t.glow}" stop-opacity="0"/>` +
      `</radialGradient>`
    );
    // Keeps the granulation on the star instead of spraying it across the void.
    out.push(`<clipPath id="starClip${i}"><circle cx="${esc(gx)}" cy="${esc(gy)}" r="${esc(gr)}"/></clipPath>`);
    // Limb darkening, in the star's own colour rather than grey: the edge of a
    // star's disc is dimmer AND redder than its centre, and that gradient is
    // the whole reason a flat circle reads as a ball.
    out.push(
      `<radialGradient id="limb${i}" cx="42%" cy="38%" r="72%">` +
      `<stop offset="0%" stop-color="#fff" stop-opacity="0.40"/>` +
      `<stop offset="45%" stop-color="#fff" stop-opacity="0.05"/>` +
      `<stop offset="76%" stop-color="${t.glow}" stop-opacity="0.44"/>` +
      `<stop offset="100%" stop-color="${t.glow}" stop-opacity="0.92"/>` +
      `</radialGradient>`
    );
    // Blur over the whole surface pass. Without it the convection cells are
    // hard-edged ovals — the first attempt read as bubbles stuck to the disc,
    // and the sunspots as craters. Blurred, the same shapes are mottling.
    out.push(
      `<filter id="gran${i}" x="-20%" y="-20%" width="140%" height="140%">` +
      `<feGaussianBlur stdDeviation="${esc(Math.max(0.6, gr * 0.075))}"/>` +
      `</filter>`
    );
  }
  out.push('</defs>');

  out.push(`<rect width="${w}" height="${h}" fill="url(#space)"/>`);

  // ── starfield ──
  // Density by area so a 4000px map isn't as sparse as a 1000px one.
  const fieldCount = Math.round((w * h) / 9000);
  for (let i = 0; i < fieldCount; i++) {
    const x = rnd() * w;
    const y = rnd() * h;
    // Thin the field near the centre — the star's glare would wash it out.
    const d = Math.hypot(x - cx, y - cy) / maxR;
    if (d < 0.35 && rnd() > d * 2) continue;
    const r = [0.9, 1.2, 1.6, 2.2][Math.floor(rnd() * 4)];
    const op = (0.25 + rnd() * 0.65).toFixed(2);
    out.push(`<circle cx="${esc(x)}" cy="${esc(y)}" r="${r}" fill="#fff" opacity="${op}"/>`);
  }

  // ── orbital rings ──
  // Stroke scales with the map so the tracks stay visible when zoomed out to
  // fit, without turning into hoops when zoomed in.
  const stroke = Math.max(1.2, Math.min(w, h) / 900);
  ringRadii.forEach((r) => {
    out.push(
      `<circle cx="${esc(cx)}" cy="${esc(cy)}" r="${esc(r)}" fill="none" ` +
      `stroke="${RING_STROKE}" stroke-width="${esc(stroke)}" opacity="0.3"/>`
    );
  });

  // ── the star(s) ──
  // One star sits dead centre. Several orbit a common barycentre, spaced
  // evenly around a small circle so the system still reads as centred.
  for (let i = 0; i < starCount; i++) {
    const { x: sx, y: sy, r, core } = geom.stars[i];
    const t = STAR_TYPES[i];
    out.push(`<circle cx="${esc(sx)}" cy="${esc(sy)}" r="${esc(r * 3.4)}" fill="url(#glow${i})"/>`);
    // The core disc is left EXACTLY as it was — flat fill, no extra attributes.
    // parseSystemFromSvg below recovers a star by matching this element, so
    // anything added to it would make old art unreadable. The surface detail
    // goes on top as separate shapes instead.
    out.push(`<circle cx="${esc(sx)}" cy="${esc(sy)}" r="${esc(r)}" fill="${core}"/>`);

    // ── Granulation ──
    // Convection cells: a scatter of soft warm and hot patches. Ellipses, not
    // circles, because a field of circles reads as bubbles. Clipped to the
    // disc, so nothing spills into the void the glow occupies.
    out.push(`<g clip-path="url(#starClip${i})" filter="url(#gran${i})">`);
    for (let j = 0; j < 26; j++) {
      const a = rnd() * Math.PI * 2;
      const d = Math.sqrt(rnd()) * r * 0.95;
      const hot = rnd() > 0.45;
      out.push(
        `<ellipse cx="${esc(sx + Math.cos(a) * d)}" cy="${esc(sy + Math.sin(a) * d)}" ` +
        `rx="${esc(r * (0.10 + rnd() * 0.26))}" ry="${esc(r * (0.07 + rnd() * 0.18))}" ` +
        `fill="${hot ? '#ffffff' : t.glow}" opacity="${(0.10 + rnd() * 0.22).toFixed(2)}"/>`
      );
    }
    // A couple of sunspots on the bigger stars. Below about 14px across they
    // land as single dark pixels and just look like dirt, so they are skipped.
    // One soft patch each, not an outline round a fill: a ring plus a centre
    // is a crater, and the first pass turned every star into a moon.
    if (r > 14) {
      const spots = 1 + Math.floor(rnd() * 2);
      for (let j = 0; j < spots; j++) {
        const a = rnd() * Math.PI * 2;
        const d = Math.sqrt(rnd()) * r * 0.64;
        const pr = r * (0.09 + rnd() * 0.10);
        out.push(
          `<ellipse cx="${esc(sx + Math.cos(a) * d)}" cy="${esc(sy + Math.sin(a) * d)}" ` +
          `rx="${esc(pr * 1.35)}" ry="${esc(pr)}" fill="${t.glow}" opacity="0.55"/>`
        );
      }
    }
    out.push('</g>');

    // Limb darkening last, over the texture — it has to dim the granulation
    // near the edge too, or the cells stay bright right up to the rim and the
    // sphere flattens back out.
    out.push(`<circle cx="${esc(sx)}" cy="${esc(sy)}" r="${esc(r)}" fill="url(#limb${i})" opacity="0.9"/>`);
  }

  // ── ring numbers ──
  // Placed on the ring itself at the 12 o'clock crossing, so the GM and the
  // players can say "third orbit" and mean the same circle.
  if (labelRings) {
    const fs = Math.max(10, Math.min(w, h) / 60);
    ringRadii.forEach((r, i) => {
      const ty = cy - r;
      out.push(
        `<text x="${esc(cx + fs * 0.6)}" y="${esc(ty - fs * 0.4)}" fill="${RING_STROKE}" ` +
        `opacity="0.55" font-family="serif" font-size="${esc(fs)}">${i + 1}</text>`
      );
    });
  }

  out.push('</svg>');
  return out.join('\n');
}

/**
 * Recover a system's geometry from art that was generated before the geometry
 * was stored alongside it.
 *
 * The SVG is machine-written by renderSystemSvg above and its shapes are
 * unambiguous — orbit rings are the only stroked circles, and a star core is
 * the only circle filled with one of the STAR_TYPES colours. Parsing it back
 * beats asking a GM to regenerate a map their table has already seen.
 *
 * Returns null when the file isn't one of ours, so a hand-drawn SVG map is
 * left alone.
 */
function parseSystemSvg(svg, width, height) {
  if (typeof svg !== 'string' || !svg.includes('id="space"')) return null;
  const cores = new Set(STAR_TYPES.map((t) => t.core.toLowerCase()));

  const ringRadii = [];
  let cx = null, cy = null;
  const ringRe = /<circle cx="([\d.]+)" cy="([\d.]+)" r="([\d.]+)" fill="none" stroke="([^"]+)"/g;
  let m;
  while ((m = ringRe.exec(svg)) !== null) {
    if (m[4].toLowerCase() !== RING_STROKE.toLowerCase()) continue;
    cx = Number(m[1]); cy = Number(m[2]);
    ringRadii.push(Number(m[3]));
  }

  const stars = [];
  const starRe = /<circle cx="([\d.]+)" cy="([\d.]+)" r="([\d.]+)" fill="(#[0-9a-fA-F]{6})"\/>/g;
  while ((m = starRe.exec(svg)) !== null) {
    const fill = m[4].toLowerCase();
    if (!cores.has(fill)) continue;   // starfield dots are #fff with opacity
    const type = STAR_TYPES.find((t) => t.core.toLowerCase() === fill);
    stars.push({
      x: Number(m[1]), y: Number(m[2]), r: Number(m[3]),
      core: type.core, glow: type.glow,
    });
  }

  if (!ringRadii.length && !stars.length) return null;
  const w = Number(width) || 0, h = Number(height) || 0;
  return {
    w, h,
    cx: cx ?? w / 2,
    cy: cy ?? h / 2,
    ringRadii,
    stars,
    ringColor: RING_STROKE,
    recovered: true,
  };
}

module.exports = { renderSystemSvg, systemGeometry, parseSystemSvg };
