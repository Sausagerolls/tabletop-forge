// asteroidArt.js — procedural asteroid and space-rock art.
//
// Companion to planetArt.js. Same universe, same palette family, but a
// different shape constraint, and the difference matters:
//
// A planet marker is seeded with is_marker = true, and MapStage draws markers
// circle-cropped inside their box (see the is_marker branch in the terrain
// layer). That is exactly right for a world — it IS a disc. An asteroid is not.
// So these are seeded as SCENERY, drawn flat and uncropped, and the art carries
// its own irregular silhouette against a transparent background. Anything drawn
// outside the rock's outline would show, so nothing is.
//
// Every type is seeded, so "Iron Chunk" generated twice gives two different
// rocks of the same kind rather than the same picture.

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const n = (v) => Number(v.toFixed(1));

// Palettes. `base` is the rock body, `hi`/`lo` the lit and shadowed extremes,
// `spec` the colour of any glint — metal and ice catch light, carbon does not.
const TYPES = {
  rocky:   { label: 'Asteroid',        base: '#7d7871', hi: '#a9a49b', lo: '#3f3c38', spec: '#cfcabf', craters: 1.0, jag: 0.52 },
  iron:    { label: 'Iron Chunk',      base: '#6b6560', hi: '#b8a89a', lo: '#2f2b28', spec: '#e8d9c4', craters: 0.5, jag: 0.62, metal: true },
  icy:     { label: 'Ice Shard',       base: '#7ba7c0', hi: '#dceffa', lo: '#2f4c63', spec: '#ffffff', craters: 0.4, jag: 0.70, icy: true },
  carbon:  { label: 'Carbon Rock',     base: '#3a3733', hi: '#5b564f', lo: '#141312', spec: '#6e685f', craters: 1.2, jag: 0.50 },
  crystal: { label: 'Crystal Shard',   base: '#6d5aa8', hi: '#c4b0f0', lo: '#2c2350', spec: '#efe6ff', craters: 0.0, jag: 0.70, crystal: true },
  rubble:  { label: 'Rubble Cluster',  base: '#6f6a63', hi: '#9b958b', lo: '#35322e', spec: '#c2bcb1', craters: 0.8, jag: 0.58, cluster: true },
};

const TYPE_KEYS = Object.keys(TYPES);

// The rock's outline: a closed loop of points at a wobbling radius, joined with
// short curves. `jag` decides how far the radius may swing — low for a weathered
// lump, high for a splinter of ice or crystal.
function outlinePoints(cx, cy, r, rnd, jag, points) {
  const pts = [];
  for (let i = 0; i < points; i++) {
    const a = (i / points) * Math.PI * 2;
    const rr = r * (1 - jag / 2 + rnd() * jag);
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  return pts;
}

// Curves rather than straight lines: a polygon reads as a gem, and only the
// crystal type wants that.
function blobPath(pts, sharp) {
  let d = `M ${n(pts[0][0])} ${n(pts[0][1])}`;
  if (sharp) {
    for (let i = 1; i < pts.length; i++) d += ` L ${n(pts[i][0])} ${n(pts[i][1])}`;
    return d + ' Z';
  }
  // Ease the midpoint only a short way toward the next vertex, so each corner
  // survives as a corner. Interpolating all the way (the planet blob's rule)
  // is right for a coastline and wrong for a rock: it sanded every one of
  // these back into a potato.
  const K = 0.22;
  for (let i = 0; i < pts.length; i++) {
    const p0 = pts[i];
    const p1 = pts[(i + 1) % pts.length];
    const mx = p0[0] + (p1[0] - p0[0]) * (1 - K);
    const my = p0[1] + (p1[1] - p0[1]) * (1 - K);
    d += ` Q ${n(p0[0])} ${n(p0[1])} ${n(mx)} ${n(my)}`;
  }
  return d + ' Z';
}

/**
 * Render one rock.
 *
 * @param {object} opts
 * @param {string} [opts.type] key of TYPES; random when omitted
 * @param {number} [opts.seed]
 * @param {number} [opts.size] px, square
 */
function renderAsteroidSvg({ type, seed = 1, size = 512 } = {}) {
  const rnd = mulberry32(seed);
  const key = TYPES[type] ? type : TYPE_KEYS[Math.floor(rnd() * TYPE_KEYS.length)];
  const t = TYPES[key];
  const S = size;
  const c = S / 2;
  // Short of the edge: the rock is drawn with a rim light and a little shadow
  // spill, and both need room inside the box.
  const R = S * 0.44;
  const uid = `a${(seed >>> 0).toString(36)}`;

  // Light direction, so a field of rocks isn't lit identically.
  const lightAng = rnd() * Math.PI * 2;
  const lx = c + Math.cos(lightAng) * R * 0.55;
  const ly = c + Math.sin(lightAng) * R * 0.55;

  const o = [];
  o.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}">`);
  o.push('<defs>');

  const pts = outlinePoints(c, c, R, rnd, t.jag, t.crystal ? 9 : 13);
  const path = blobPath(pts, !!t.crystal);
  o.push(`<clipPath id="clip${uid}"><path d="${path}"/></clipPath>`);

  // Body shading: lit toward the sub-solar point, falling to near-black away
  // from it. This is what makes a flat outline read as a solid lump.
  o.push(
    `<radialGradient id="shade${uid}" cx="${n((lx / S) * 100)}%" cy="${n((ly / S) * 100)}%" r="80%">` +
    `<stop offset="0%" stop-color="${t.hi}" stop-opacity="0.85"/>` +
    `<stop offset="38%" stop-color="${t.hi}" stop-opacity="0.20"/>` +
    `<stop offset="70%" stop-color="${t.lo}" stop-opacity="0.45"/>` +
    `<stop offset="100%" stop-color="${t.lo}" stop-opacity="0.90"/>` +
    `</radialGradient>`
  );
  o.push('</defs>');

  o.push(`<g clip-path="url(#clip${uid})">`);
  o.push(`<path d="${path}" fill="${t.base}"/>`);

  if (t.crystal) {
    // Facets: straight slivers from the centre outward, alternately lit and
    // shadowed, so the shard reads as faceted rather than blobby.
    // Facets meet at an apex OFF the centre. Radiating from the middle gave
    // every shard the same symmetric parasol; an offset apex reads as a broken
    // crystal seen from an angle.
    const ax = c + (rnd() - 0.5) * R * 0.7;
    const ay = c + (rnd() - 0.5) * R * 0.7;
    for (let i = 0; i < pts.length; i++) {
      const p0 = pts[i];
      const p1 = pts[(i + 1) % pts.length];
      // Lit where the facet faces the light, dark where it turns away.
      const fx = (p0[0] + p1[0]) / 2 - ax;
      const fy = (p0[1] + p1[1]) / 2 - ay;
      const towards = (fx * (lx - c) + fy * (ly - c)) > 0;
      o.push(
        `<path d="M ${n(ax)} ${n(ay)} L ${n(p0[0])} ${n(p0[1])} L ${n(p1[0])} ${n(p1[1])} Z" ` +
        `fill="${towards ? t.hi : t.lo}" opacity="${(0.22 + rnd() * 0.26).toFixed(2)}"/>`
      );
    }
  }

  if (t.cluster) {
    // A cluster is several smaller rocks sharing one silhouette — draw the
    // companions as their own lumps inside the outline.
    const lumps = 3 + Math.floor(rnd() * 3);
    for (let i = 0; i < lumps; i++) {
      const a = rnd() * Math.PI * 2;
      const d = rnd() * R * 0.55;
      const lp = outlinePoints(c + Math.cos(a) * d, c + Math.sin(a) * d, R * (0.28 + rnd() * 0.26), rnd, 0.4, 11);
      o.push(`<path d="${blobPath(lp, false)}" fill="${rnd() > 0.5 ? t.hi : t.lo}" opacity="${(0.20 + rnd() * 0.25).toFixed(2)}"/>`);
    }
  }

  // Craters: a dark floor with a lit rim arc offset toward the light.
  const craters = Math.round(t.craters * (7 + rnd() * 9));
  for (let i = 0; i < craters; i++) {
    const a = rnd() * Math.PI * 2;
    const d = Math.sqrt(rnd()) * R * 0.82;
    const px = c + Math.cos(a) * d;
    const py = c + Math.sin(a) * d;
    const pr = R * (0.05 + rnd() * 0.15);
    o.push(`<ellipse cx="${n(px)}" cy="${n(py)}" rx="${n(pr)}" ry="${n(pr * (0.72 + rnd() * 0.28))}" fill="${t.lo}" opacity="${(0.30 + rnd() * 0.30).toFixed(2)}"/>`);
    o.push(
      `<path d="M ${n(px - pr)} ${n(py)} A ${n(pr)} ${n(pr)} 0 0 1 ${n(px + pr)} ${n(py)}" ` +
      `fill="none" stroke="${t.hi}" stroke-width="${n(Math.max(0.8, pr * 0.20))}" opacity="0.35" ` +
      `transform="rotate(${n((lightAng * 180) / Math.PI)} ${n(px)} ${n(py)})"/>`
    );
  }

  // Mottling, so the fill doesn't read as a flat vector shape.
  for (let i = 0; i < 26; i++) {
    const a = rnd() * Math.PI * 2;
    const d = Math.sqrt(rnd()) * R * 0.92;
    o.push(
      `<ellipse cx="${n(c + Math.cos(a) * d)}" cy="${n(c + Math.sin(a) * d)}" ` +
      `rx="${n(R * (0.05 + rnd() * 0.16))}" ry="${n(R * (0.03 + rnd() * 0.10))}" ` +
      `fill="${rnd() > 0.5 ? t.hi : t.lo}" opacity="${(0.05 + rnd() * 0.09).toFixed(2)}"/>`
    );
  }

  if (t.metal) {
    // Exposed metal: bright slivers that catch the light.
    for (let i = 0; i < 7; i++) {
      const a = rnd() * Math.PI * 2;
      const d = rnd() * R * 0.7;
      const px = c + Math.cos(a) * d, py = c + Math.sin(a) * d;
      const len = R * (0.12 + rnd() * 0.28);
      const ang = rnd() * Math.PI * 2;
      o.push(
        `<path d="M ${n(px)} ${n(py)} L ${n(px + Math.cos(ang) * len)} ${n(py + Math.sin(ang) * len)}" ` +
        `stroke="${t.spec}" stroke-width="${n(R * (0.02 + rnd() * 0.03))}" opacity="${(0.25 + rnd() * 0.30).toFixed(2)}" stroke-linecap="round"/>`
      );
    }
  }

  if (t.icy) {
    // Ice reads as broad pale patches rather than glints.
    for (let i = 0; i < 5; i++) {
      const a = rnd() * Math.PI * 2;
      const d = rnd() * R * 0.62;
      const lp = outlinePoints(c + Math.cos(a) * d, c + Math.sin(a) * d, R * (0.12 + rnd() * 0.16), rnd, 0.6, 9);
      o.push(`<path d="${blobPath(lp, false)}" fill="${t.spec}" opacity="${(0.10 + rnd() * 0.14).toFixed(2)}"/>`);
    }
  }

  // Lighting last, over everything.
  o.push(`<path d="${path}" fill="url(#shade${uid})"/>`);
  o.push('</g>');

  // Rim light, on the LIT SIDE ONLY.
  //
  // Stroking the whole outline drew a bright ring all the way round, which
  // reads as a cartoon outline rather than a rock catching the sun. Clipping
  // the stroke to a disc centred toward the light leaves a crescent, which is
  // what a lit limb actually looks like.
  o.push(`<clipPath id="lit${uid}"><circle cx="${n(lx)}" cy="${n(ly)}" r="${n(R * 0.78)}"/></clipPath>`);
  o.push(
    `<g clip-path="url(#lit${uid})">` +
    `<path d="${path}" fill="none" stroke="${t.spec}" stroke-width="${n(R * 0.035)}" opacity="0.32" ` +
    `stroke-linejoin="round"/>` +
    `</g>`
  );

  o.push('</svg>');
  return o.join('\n');
}

module.exports = { renderAsteroidSvg, ASTEROID_TYPES: TYPES, ASTEROID_TYPE_KEYS: TYPE_KEYS };
