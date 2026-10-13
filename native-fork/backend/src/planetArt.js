// planetArt.js — procedural planet token faces.
//
// Companion to systemMap.js: that draws the system, this draws the worlds the
// GM drops onto it. Same universe, same palette family.
//
// The one hard constraint is the token frame. MapStage draws token art with
// cornerRadius = width/2 (see TokenImage), i.e. the image is CIRCLE-CROPPED.
// So the planet is a disc of radius exactly w/2 centred in a square viewBox:
// it touches all four edges, the crop lands precisely on the limb, and the
// token is full of planet with no dead space. Nothing is drawn outside that
// disc — rings and moons would simply be cropped away, so there are none.
//
// Every type is seeded, so "Ashen World" generated twice gives two different
// worlds of the same kind rather than the same picture twice.

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

// Palettes. `base` is the ocean/rock ground, `land` the features on top,
// `hi`/`lo` push the lit and shadowed extremes of the same world.
const TYPES = {
  terran:   { label: 'Terran World',    base: '#2f6ea8', land: ['#4f7f4a', '#6b8f52', '#8a7a4e'], cloud: 0.55, ice: true },
  ocean:    { label: 'Ocean World',     base: '#1d5c93', land: ['#2a6ea3', '#37809f'],            cloud: 0.75, ice: true },
  desert:   { label: 'Desert World',    base: '#b8823f', land: ['#a06a30', '#cf9d55', '#8d5a29'], cloud: 0.15, ice: false },
  jungle:   { label: 'Verdant World',   base: '#2f7a4a', land: ['#256b3c', '#489a5b', '#7d8f3c'], cloud: 0.45, ice: true },
  ice:      { label: 'Ice World',       base: '#cfe3f2', land: ['#a9cbe4', '#e8f4fb'],            cloud: 0.30, ice: false },
  barren:   { label: 'Barren Moon',     base: '#8b8b93', land: ['#75757d', '#a2a2aa'],            cloud: 0,    ice: false, craters: true },
  volcanic: { label: 'Volcanic World',  base: '#3a2320', land: ['#2a1917', '#4a2d26'],            cloud: 0.12, ice: false, lava: true },
  toxic:    { label: 'Toxic World',     base: '#9aa83f', land: ['#8b9a35', '#b7c25a'],            cloud: 0.65, ice: false },
  gas:      { label: 'Gas Giant',       base: '#c08f5e', bands: ['#a97748', '#d8ab74', '#8d6238', '#e3c193'], storm: true },
  icegiant: { label: 'Ice Giant',       base: '#4f8fbf', bands: ['#3f7cab', '#6fa9d2', '#356b96', '#8cc0e0'], storm: false },
};

const TYPE_KEYS = Object.keys(TYPES);

// An irregular blob, as a closed cubic path around a wobbling radius. Cheaper
// and rounder than a polygon, which reads as a crystal rather than a coastline.
function blobPath(cx, cy, r, rnd, wobble = 0.42, points = 9) {
  const pts = [];
  for (let i = 0; i < points; i++) {
    const a = (i / points) * Math.PI * 2;
    const rr = r * (1 - wobble / 2 + rnd() * wobble);
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  let d = `M ${n(pts[0][0])} ${n(pts[0][1])}`;
  for (let i = 0; i < pts.length; i++) {
    const p0 = pts[i];
    const p1 = pts[(i + 1) % pts.length];
    const mx = (p0[0] + p1[0]) / 2;
    const my = (p0[1] + p1[1]) / 2;
    d += ` Q ${n(p0[0])} ${n(p0[1])} ${n(mx)} ${n(my)}`;
  }
  return d + ' Z';
}

/**
 * Render one planet face.
 * @param {object} opts
 * @param {string} [opts.type] key of TYPES; random when omitted
 * @param {number} [opts.seed]
 * @param {number} [opts.size] px, square
 */
function renderPlanetSvg({ type, seed = 1, size = 512 } = {}) {
  const rnd = mulberry32(seed);
  const key = TYPES[type] ? type : TYPE_KEYS[Math.floor(rnd() * TYPE_KEYS.length)];
  const t = TYPES[key];
  const S = size;
  const c = S / 2;
  const R = S / 2;           // touches all four edges — the crop rides the limb
  const uid = `p${(seed >>> 0).toString(36)}`;

  // Light direction, so a row of planets isn't uniformly lit from one side.
  const lightAng = rnd() * Math.PI * 2;
  const lx = c + Math.cos(lightAng) * R * 0.42;
  const ly = c + Math.sin(lightAng) * R * 0.42;

  const o = [];
  o.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}">`);
  o.push('<defs>');
  // Surface clip: everything is drawn against this, so nothing spills past the
  // limb and the token stays a clean circle.
  o.push(`<clipPath id="clip${uid}"><circle cx="${c}" cy="${c}" r="${R}"/></clipPath>`);
  // Limb darkening — lit near the sub-solar point, falling to near-black at
  // the edge. This is what makes a flat disc read as a sphere.
  o.push(
    `<radialGradient id="shade${uid}" cx="${n((lx / S) * 100)}%" cy="${n((ly / S) * 100)}%" r="75%">` +
    `<stop offset="0%" stop-color="#fff" stop-opacity="0.30"/>` +
    `<stop offset="42%" stop-color="#fff" stop-opacity="0.03"/>` +
    `<stop offset="72%" stop-color="#000" stop-opacity="0.34"/>` +
    `<stop offset="100%" stop-color="#000" stop-opacity="0.80"/>` +
    `</radialGradient>`
  );
  // Thin atmospheric rim, brightest on the lit limb.
  o.push(
    `<radialGradient id="rim${uid}" cx="50%" cy="50%" r="50%">` +
    `<stop offset="88%" stop-color="#bcd8ff" stop-opacity="0"/>` +
    `<stop offset="100%" stop-color="#bcd8ff" stop-opacity="${t.bands ? 0.5 : 0.42}"/>` +
    `</radialGradient>`
  );
  // Polar caps fade into the surface instead of ending in a hard white edge.
  o.push(
    `<linearGradient id="capN${uid}" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0%" stop-color="#f4fbff" stop-opacity="0.92"/>` +
    `<stop offset="60%" stop-color="#e6f3fb" stop-opacity="0.55"/>` +
    `<stop offset="100%" stop-color="#dceefa" stop-opacity="0"/>` +
    `</linearGradient>`
  );
  o.push(
    `<linearGradient id="capS${uid}" x1="0" y1="1" x2="0" y2="0">` +
    `<stop offset="0%" stop-color="#f4fbff" stop-opacity="0.92"/>` +
    `<stop offset="60%" stop-color="#e6f3fb" stop-opacity="0.55"/>` +
    `<stop offset="100%" stop-color="#dceefa" stop-opacity="0"/>` +
    `</linearGradient>`
  );
  o.push('</defs>');

  o.push(`<g clip-path="url(#clip${uid})">`);
  o.push(`<circle cx="${c}" cy="${c}" r="${R}" fill="${t.base}"/>`);

  if (t.bands) {
    // ── Gas giant: latitude bands ──
    // Drawn as full-width ellipses so each band bulges at the equator the way
    // a banded sphere does, rather than reading as flat stripes.
    let y = -R * 0.05;
    while (y < S) {
      const h = R * (0.07 + rnd() * 0.16);
      const col = t.bands[Math.floor(rnd() * t.bands.length)];
      const op = 0.5 + rnd() * 0.45;
      o.push(
        `<ellipse cx="${c}" cy="${n(y + h / 2)}" rx="${n(R * 1.02)}" ry="${n(h / 2)}" ` +
        `fill="${col}" opacity="${op.toFixed(2)}"/>`
      );
      y += h * (0.85 + rnd() * 0.5);
    }
    // Turbulence: faint darker streaks smeared along the bands.
    for (let i = 0; i < 14; i++) {
      const sy = rnd() * S;
      const sw = R * (0.3 + rnd() * 0.9);
      const sh = R * (0.012 + rnd() * 0.03);
      o.push(
        `<ellipse cx="${n(rnd() * S)}" cy="${n(sy)}" rx="${n(sw)}" ry="${n(sh)}" ` +
        `fill="#000" opacity="${(0.05 + rnd() * 0.10).toFixed(2)}"/>`
      );
    }
    if (t.storm && rnd() > 0.35) {
      // The great storm. Off-centre, elliptical, with an eye.
      const sx = c + (rnd() - 0.5) * R * 1.0;
      const sy = c + (rnd() - 0.5) * R * 1.1;
      const rx = R * (0.16 + rnd() * 0.12);
      const ry = rx * (0.55 + rnd() * 0.25);
      o.push(`<ellipse cx="${n(sx)}" cy="${n(sy)}" rx="${n(rx)}" ry="${n(ry)}" fill="#d9694a" opacity="0.75"/>`);
      o.push(`<ellipse cx="${n(sx)}" cy="${n(sy)}" rx="${n(rx * 0.6)}" ry="${n(ry * 0.6)}" fill="#f0a077" opacity="0.6"/>`);
      o.push(`<ellipse cx="${n(sx)}" cy="${n(sy)}" rx="${n(rx * 0.22)}" ry="${n(ry * 0.22)}" fill="#ffd9bf" opacity="0.5"/>`);
    }
  } else {
    // ── Rocky / watery world: landmasses ──
    // A continent is a CLUSTER of overlapping blobs, not one round one — a
    // single blob reads as a splodge, three overlapping ones read as a coast
    // with bays and peninsulas.
    const landCount = 3 + Math.floor(rnd() * 3);
    for (let i = 0; i < landCount; i++) {
      const a = rnd() * Math.PI * 2;
      const d = rnd() * R * 0.72;
      const bx = c + Math.cos(a) * d;
      const by = c + Math.sin(a) * d;
      const br = R * (0.15 + rnd() * 0.22);
      const col = t.land[Math.floor(rnd() * t.land.length)];
      const op = (0.80 + rnd() * 0.20).toFixed(2);
      const lobes = 2 + Math.floor(rnd() * 3);
      for (let j = 0; j < lobes; j++) {
        const la = rnd() * Math.PI * 2;
        const ld = br * (rnd() * 0.85);
        o.push(
          `<path d="${blobPath(bx + Math.cos(la) * ld, by + Math.sin(la) * ld, br * (0.55 + rnd() * 0.5), rnd, 0.55, 11)}" ` +
          `fill="${col}" opacity="${op}"/>`
        );
      }
    }
    // Surface mottling — breaks up flat fills so the disc doesn't look like
    // vector shapes on a coloured circle.
    for (let i = 0; i < 26; i++) {
      const a = rnd() * Math.PI * 2;
      const d = Math.sqrt(rnd()) * R * 0.95;
      o.push(
        `<ellipse cx="${n(c + Math.cos(a) * d)}" cy="${n(c + Math.sin(a) * d)}" ` +
        `rx="${n(R * (0.05 + rnd() * 0.18))}" ry="${n(R * (0.03 + rnd() * 0.10))}" ` +
        `fill="${rnd() > 0.5 ? '#fff' : '#000'}" opacity="${(0.03 + rnd() * 0.05).toFixed(2)}"/>`
      );
    }

    if (t.craters) {
      // ── Moon: craters, each a dark floor with a lit rim arc ──
      const craters = 12 + Math.floor(rnd() * 14);
      for (let i = 0; i < craters; i++) {
        const a = rnd() * Math.PI * 2;
        const d = Math.sqrt(rnd()) * R * 0.94;
        const px = c + Math.cos(a) * d;
        const py = c + Math.sin(a) * d;
        const pr = R * (0.02 + rnd() * 0.10);
        o.push(`<circle cx="${n(px)}" cy="${n(py)}" r="${n(pr)}" fill="#000" opacity="${(0.10 + rnd() * 0.16).toFixed(2)}"/>`);
        o.push(
          `<circle cx="${n(px - pr * 0.15)}" cy="${n(py - pr * 0.15)}" r="${n(pr * 0.82)}" ` +
          `fill="none" stroke="#fff" stroke-width="${n(Math.max(0.6, pr * 0.14))}" opacity="0.13"/>`
        );
      }
    }

    if (t.lava) {
      // ── Volcanic: glowing fissures, brightest at the hairline ──
      const veins = 7 + Math.floor(rnd() * 7);
      for (let i = 0; i < veins; i++) {
        const a = rnd() * Math.PI * 2;
        const d = rnd() * R * 0.72;
        const vx = c + Math.cos(a) * d;
        const vy = c + Math.sin(a) * d;
        let dPath = `M ${n(vx)} ${n(vy)}`;
        let px = vx, py = vy, ang = rnd() * Math.PI * 2;
        const segs = 3 + Math.floor(rnd() * 4);
        for (let s = 0; s < segs; s++) {
          ang += (rnd() - 0.5) * 1.5;
          const len = R * (0.06 + rnd() * 0.16);
          px += Math.cos(ang) * len;
          py += Math.sin(ang) * len;
          dPath += ` L ${n(px)} ${n(py)}`;
        }
        o.push(`<path d="${dPath}" fill="none" stroke="#ff7a2f" stroke-width="${n(R * (0.014 + rnd() * 0.02))}" opacity="0.85" stroke-linecap="round"/>`);
        o.push(`<path d="${dPath}" fill="none" stroke="#ffd08a" stroke-width="${n(R * 0.006)}" opacity="0.75" stroke-linecap="round"/>`);
      }
    }

    if (t.ice) {
      // ── Polar caps ── clipped by the disc, so they read as caps not stripes.
      const capTop = R * (0.20 + rnd() * 0.16);
      const capBot = R * (0.16 + rnd() * 0.18);
      o.push(`<ellipse cx="${n(c + (rnd() - 0.5) * R * 0.2)}" cy="${n(-R * 0.06)}" rx="${n(R * (0.60 + rnd() * 0.28))}" ry="${n(capTop)}" fill="url(#capN${uid})"/>`);
      o.push(`<ellipse cx="${n(c + (rnd() - 0.5) * R * 0.2)}" cy="${n(S + R * 0.06)}" rx="${n(R * (0.55 + rnd() * 0.3))}" ry="${n(capBot)}" fill="url(#capS${uid})"/>`);
    }

    // ── Cloud deck ──
    if (t.cloud > 0) {
      // Clouds run along latitudes, so they're wide and shallow rather than
      // round — a round white blob reads as a hole in the planet.
      const clouds = Math.round(t.cloud * (16 + rnd() * 12));
      for (let i = 0; i < clouds; i++) {
        const a = rnd() * Math.PI * 2;
        const d = Math.sqrt(rnd()) * R * 0.9;
        const wx = c + Math.cos(a) * d;
        const wy = c + Math.sin(a) * d;
        const rx = R * (0.10 + rnd() * 0.24);
        const ry = rx * (0.22 + rnd() * 0.28);
        const tilt = (rnd() - 0.5) * 26;
        o.push(
          `<ellipse cx="${n(wx)}" cy="${n(wy)}" rx="${n(rx)}" ry="${n(ry)}" fill="#fff" ` +
          `opacity="${(0.10 + rnd() * 0.22).toFixed(2)}" transform="rotate(${n(tilt)} ${n(wx)} ${n(wy)})"/>`
        );
      }
    }
  }

  // ── Lighting, last, over everything ──
  o.push(`<circle cx="${c}" cy="${c}" r="${R}" fill="url(#shade${uid})"/>`);
  o.push(`<circle cx="${c}" cy="${c}" r="${R}" fill="url(#rim${uid})"/>`);
  o.push('</g>');
  o.push('</svg>');
  return o.join('\n');
}

module.exports = { renderPlanetSvg, PLANET_TYPES: TYPES, PLANET_TYPE_KEYS: TYPE_KEYS };
