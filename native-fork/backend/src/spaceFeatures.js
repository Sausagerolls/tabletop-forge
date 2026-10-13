// spaceFeatures.js — the rest of what sits in a system.
//
// Third of the trio: systemMap.js draws the system, planetArt.js draws the
// worlds, this draws everything else you'd pin to a hex — rocks, wrecks,
// stations and ships.
//
// Framing note: a terrain marker is circle-cropped AND given a framing ring
// (see MapStage, is_marker branch), so these are discs of void with the
// feature inside, exactly like the shipped system markers. A transparent
// background would show the map through a bordered coin, which reads as a
// hole. Planets are the deliberate exception — they ARE the disc.
//
// Palette is the system markers' one throughout: #141a33 → #05070f void,
// #a8c4ff for cold structural highlights.

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

// ── shared pieces ────────────────────────────────────────────────────────────

function defsVoid(uid, extra = '') {
  return (
    '<defs>' +
    `<radialGradient id="space${uid}" cx="50%" cy="50%" r="50%">` +
    `<stop offset="0%" stop-color="#141a33"/><stop offset="100%" stop-color="#05070f"/>` +
    `</radialGradient>` +
    `<clipPath id="clip${uid}"><circle cx="256" cy="256" r="256"/></clipPath>` +
    extra +
    '</defs>'
  );
}

function starfield(rnd, count = 70) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const r = [0.9, 1.2, 1.6, 2.2][Math.floor(rnd() * 4)];
    out.push(
      `<circle cx="${n(rnd() * 512)}" cy="${n(rnd() * 512)}" r="${r}" fill="#fff" ` +
      `opacity="${(0.25 + rnd() * 0.6).toFixed(2)}"/>`
    );
  }
  return out.join('\n');
}

// An irregular rock. Lit from the upper left, with a shadowed underside and a
// couple of craters, so a field of them doesn't read as grey confetti.
function rock(cx, cy, r, rnd, tint = '#8a8a92') {
  const pts = [];
  const sides = 7 + Math.floor(rnd() * 4);
  for (let i = 0; i < sides; i++) {
    const a = (i / sides) * Math.PI * 2;
    const rr = r * (0.68 + rnd() * 0.5);
    pts.push(`${n(cx + Math.cos(a) * rr)},${n(cy + Math.sin(a) * rr)}`);
  }
  const out = [`<polygon points="${pts.join(' ')}" fill="${tint}"/>`];
  // shadowed side
  out.push(
    `<polygon points="${pts.join(' ')}" fill="#000" opacity="0.35" ` +
    `clip-path="none" transform="translate(${n(r * 0.10)} ${n(r * 0.12)})"/>`
  );
  out.push(`<polygon points="${pts.join(' ')}" fill="none" stroke="#c9c9d2" stroke-width="${n(Math.max(0.4, r * 0.06))}" opacity="0.28"/>`);
  const pits = 1 + Math.floor(rnd() * 3);
  for (let i = 0; i < pits; i++) {
    out.push(
      `<circle cx="${n(cx + (rnd() - 0.5) * r)}" cy="${n(cy + (rnd() - 0.5) * r)}" ` +
      `r="${n(r * (0.10 + rnd() * 0.18))}" fill="#000" opacity="0.28"/>`
    );
  }
  return out.join('\n');
}

// A top-down hull: pointed bow, swept flanks, engine block aft. Drawn around
// the origin pointing "up", so callers rotate it wherever they want.
// ── Spelljammer hulls ────────────────────────────────────────────────────────
//
// These are sailing ships, not spacecraft: timber hulls, canvas sails, brass
// fittings, and a spelljamming helm glowing somewhere aft. Deliberately no
// rocket exhaust — a ship under way is driven by the helm, so the magic is the
// light source, and the wake behind it is arcane rather than burnt fuel.
//
// Every hull is drawn top-down around the origin pointing "up", so callers
// rotate and scale freely. Silhouette is what identifies a class at token
// size, so each shape is exaggerated: the hammership's crossbar bow, the squid
// ship's trailing tentacles, the nautiloid's spiral and prongs.

const WOOD = { dark: '#4a3222', mid: '#6b4a2f', light: '#8a6039', deck: '#a97d4a' };
const CANVAS = '#e6d9bd';
const BRASS = '#c9a24b';

// Square sails seen from above: a bellied bar across the hull, with the yard
// drawn as a hard line through it.
function sailRig(L, W, opts = {}) {
  const { canvas = CANVAS, torn = false, masts = 3 } = opts;
  const out = [];
  for (let i = 0; i < masts; i++) {
    const y = -L * 0.26 + (i / Math.max(1, masts - 1)) * L * 0.52;
    const span = W * (i === masts - 1 ? 0.92 : 1.22) * (1 - Math.abs(i - 1) * 0.05);
    const belly = L * 0.105;
    if (torn) {
      // Shredded canvas: two ragged stubs instead of a full sail.
      out.push(
        `<path d="M ${n(-span / 2)} ${n(y)} Q ${n(-span * 0.25)} ${n(y - belly)} ${n(-span * 0.06)} ${n(y - belly * 0.3)} ` +
        `L ${n(-span * 0.12)} ${n(y + belly * 0.2)} Z" fill="${canvas}" opacity="0.45"/>`
      );
      out.push(
        `<path d="M ${n(span * 0.10)} ${n(y + belly * 0.1)} Q ${n(span * 0.3)} ${n(y - belly * 0.8)} ${n(span * 0.46)} ${n(y)} ` +
        `L ${n(span * 0.3)} ${n(y + belly * 0.3)} Z" fill="${canvas}" opacity="0.35"/>`
      );
    } else {
      // Bellied toward the BOW (-y). A following wind pushes canvas forward,
      // so a sail bulging sternward reads as sailing backwards.
      out.push(
        `<path d="M ${n(-span / 2)} ${n(y)} Q 0 ${n(y - belly * 2.0)} ${n(span / 2)} ${n(y)} ` +
        `Q 0 ${n(y + belly * 0.45)} ${n(-span / 2)} ${n(y)} Z" fill="${canvas}" opacity="0.95"/>`
      );
      // Shadow where the foot of the sail falls away from the yard.
      out.push(
        `<path d="M ${n(-span / 2)} ${n(y)} Q 0 ${n(y + belly * 0.45)} ${n(span / 2)} ${n(y)}" ` +
        `fill="none" stroke="#000" stroke-width="${n(W * 0.016)}" opacity="0.22"/>`
      );
    }
    // Yard
    out.push(`<line x1="${n(-span / 2)}" y1="${n(y)}" x2="${n(span / 2)}" y2="${n(y)}" stroke="${WOOD.dark}" stroke-width="${n(W * 0.028)}"/>`);
    // Mast
    out.push(`<circle cx="0" cy="${n(y)}" r="${n(W * 0.035)}" fill="${WOOD.dark}"/>`);
  }
  return out.join('\n');
}

// Planking + gunwale, shared by every timber hull.
function timber(pathD, L, W, opts = {}) {
  const { fill = WOOD.mid, broken = false } = opts;
  const out = [`<path d="${pathD}" fill="${fill}"/>`];
  out.push(`<path d="${pathD}" fill="none" stroke="${WOOD.dark}" stroke-width="${n(W * 0.05)}" opacity="0.9"/>`);
  // Deck strake down the centre
  out.push(`<path d="M 0 ${n(-L * 0.36)} L 0 ${n(L * 0.40)}" stroke="${WOOD.deck}" stroke-width="${n(W * 0.16)}" opacity="0.55" stroke-linecap="round"/>`);
  for (let i = 0; i < 5; i++) {
    const y = -L * 0.28 + (i / 4) * L * 0.62;
    out.push(`<line x1="${n(-W * 0.22)}" y1="${n(y)}" x2="${n(W * 0.22)}" y2="${n(y)}" stroke="${WOOD.dark}" stroke-width="${n(W * 0.016)}" opacity="0.35"/>`);
  }
  if (broken) {
    out.push(
      `<path d="M ${n(-W * 0.34)} ${n(L * 0.02)} L ${n(-W * 0.04)} ${n(-L * 0.06)} ` +
      `L ${n(W * 0.10)} ${n(L * 0.12)} L ${n(-W * 0.02)} ${n(L * 0.28)} ` +
      `L ${n(-W * 0.30)} ${n(L * 0.22)} Z" fill="#05070f"/>`
    );
    for (let i = 0; i < 4; i++) {
      const y = L * 0.0 + i * L * 0.06;
      out.push(`<path d="M ${n(-W * 0.30)} ${n(y)} L ${n(W * 0.02)} ${n(y - L * 0.02)}" stroke="${WOOD.light}" stroke-width="${n(W * 0.018)}" opacity="0.5"/>`);
    }
  }
  return out.join('\n');
}

// The spelljamming helm: an arcane glow at the sternward end of the deck, and
// the wake it leaves. This is what says "magic drive" instead of "engine".
function helmGlow(L, W, hue = '#8fd4ff') {
  return [
    `<circle cx="0" cy="${n(L * 0.24)}" r="${n(W * 0.16)}" fill="${hue}" opacity="0.30"/>`,
    `<circle cx="0" cy="${n(L * 0.24)}" r="${n(W * 0.07)}" fill="${hue}" opacity="0.85"/>`,
    `<ellipse cx="0" cy="${n(L * 0.60)}" rx="${n(W * 0.30)}" ry="${n(L * 0.14)}" fill="${hue}" opacity="0.10"/>`,
  ].join('\n');
}

// ── Hammership: blunt hammerhead bow, the classic military spelljammer ──
function hullHammership(L, W, opts = {}) {
  const { broken = false, hue = '#8fd4ff', war = false } = opts;
  const hw = W / 2;
  const body =
    `M ${n(-hw * 0.30)} ${n(-L * 0.50)} L ${n(hw * 0.30)} ${n(-L * 0.50)} ` +
    `L ${n(hw * 0.34)} ${n(-L * 0.34)} L ${n(hw * 0.52)} ${n(-L * 0.10)} ` +
    `L ${n(hw * 0.48)} ${n(L * 0.30)} L ${n(hw * 0.30)} ${n(L * 0.46)} ` +
    `L ${n(-hw * 0.30)} ${n(L * 0.46)} L ${n(-hw * 0.48)} ${n(L * 0.30)} ` +
    `L ${n(-hw * 0.52)} ${n(-L * 0.10)} L ${n(-hw * 0.34)} ${n(-L * 0.34)} Z`;
  const out = [];
  // The hammer head itself — a wide crossbar forward of the hull.
  out.push(`<rect x="${n(-hw * 0.92)}" y="${n(-L * 0.56)}" width="${n(hw * 1.84)}" height="${n(L * 0.15)}" rx="${n(L * 0.03)}" fill="${WOOD.light}"/>`);
  out.push(`<rect x="${n(-hw * 0.92)}" y="${n(-L * 0.56)}" width="${n(hw * 1.84)}" height="${n(L * 0.15)}" rx="${n(L * 0.03)}" fill="none" stroke="${WOOD.dark}" stroke-width="${n(W * 0.035)}"/>`);
  // Ram spikes on the hammer face
  for (const sx of [-0.62, -0.2, 0.2, 0.62]) {
    out.push(`<path d="M ${n(hw * sx - hw * 0.06)} ${n(-L * 0.56)} L ${n(hw * sx)} ${n(-L * 0.63)} L ${n(hw * sx + hw * 0.06)} ${n(-L * 0.56)} Z" fill="${BRASS}" opacity="0.85"/>`);
  }
  out.push(timber(body, L, W, { fill: war ? '#3d2819' : WOOD.mid, broken }));
  if (war) {
    // What separates a hammership from a WARship is what's bolted to the deck,
    // not the hull underneath: ballistae along both rails, and red canvas.
    for (const sy of [-0.16, 0.04, 0.24]) {
      for (const sx of [-1, 1]) {
        out.push(`<rect x="${n(sx * hw * 0.42 - hw * 0.05)}" y="${n(L * sy)}" width="${n(hw * 0.10)}" height="${n(L * 0.05)}" fill="${BRASS}" opacity="0.95"/>`);
        out.push(`<line x1="${n(sx * hw * 0.48)}" y1="${n(L * sy + L * 0.025)}" x2="${n(sx * hw * 0.70)}" y2="${n(L * sy + L * 0.025)}" stroke="${WOOD.dark}" stroke-width="${n(W * 0.024)}"/>`);
      }
    }
  }
  if (!broken) {
    out.push(sailRig(L, W, { masts: 3, canvas: war ? '#b0503f' : CANVAS }));
    out.push(helmGlow(L, W, hue));
  } else {
    out.push(sailRig(L, W, { masts: 2, torn: true }));
  }
  return out.join('\n');
}

// ── Squid ship: bulbous forward body, tentacles trailing aft ──
function hullSquid(L, W, opts = {}) {
  const { broken = false, hue = '#a8ffd4' } = opts;
  const hw = W / 2;
  const out = [];
  // Tentacles first so the mantle overlaps their roots.
  const arms = 7;
  for (let i = 0; i < arms; i++) {
    const t = (i / (arms - 1)) - 0.5;
    const x0 = t * hw * 0.7;
    const curl = t * hw * 1.5;
    out.push(
      `<path d="M ${n(x0)} ${n(L * 0.16)} Q ${n(x0 + curl * 0.5)} ${n(L * 0.40)} ${n(x0 + curl)} ${n(L * 0.60)}" ` +
      `fill="none" stroke="${WOOD.mid}" stroke-width="${n(W * (0.075 - Math.abs(t) * 0.03))}" ` +
      `stroke-linecap="round" opacity="${broken ? 0.55 : 1}"/>`
    );
  }
  const body =
    `M 0 ${n(-L * 0.50)} ` +
    `C ${n(hw * 0.62)} ${n(-L * 0.34)} ${n(hw * 0.66)} ${n(L * 0.02)} ${n(hw * 0.42)} ${n(L * 0.22)} ` +
    `L ${n(-hw * 0.42)} ${n(L * 0.22)} ` +
    `C ${n(-hw * 0.66)} ${n(L * 0.02)} ${n(-hw * 0.62)} ${n(-L * 0.34)} 0 ${n(-L * 0.50)} Z`;
  out.push(timber(body, L, W, { fill: WOOD.light, broken }));
  // Eye blisters, which is what makes it read as a squid rather than a pod.
  for (const sx of [-1, 1]) {
    out.push(`<circle cx="${n(sx * hw * 0.34)}" cy="${n(-L * 0.16)}" r="${n(W * 0.075)}" fill="${WOOD.dark}"/>`);
    out.push(`<circle cx="${n(sx * hw * 0.34)}" cy="${n(-L * 0.16)}" r="${n(W * 0.038)}" fill="${broken ? '#2a2a30' : BRASS}"/>`);
  }
  if (!broken) {
    out.push(sailRig(L * 0.82, W * 0.86, { masts: 2 }));
    out.push(helmGlow(L * 0.9, W, hue));
  } else {
    out.push(sailRig(L * 0.82, W * 0.86, { masts: 2, torn: true }));
  }
  return out.join('\n');
}

// ── Nautiloid: spiral shell aft, prongs forward ──
function hullNautiloid(L, W, opts = {}) {
  const { broken = false, hue = '#c9a8ff' } = opts;
  const hw = W / 2;
  const out = [];
  // Four forward prongs, long enough to be the thing you notice first.
  for (const sx of [-1, -0.42, 0.42, 1]) {
    const tipX = sx * hw * (Math.abs(sx) > 0.6 ? 0.86 : 0.40);
    out.push(
      `<path d="M ${n(sx * hw * 0.26)} ${n(-L * 0.10)} ` +
      `Q ${n(tipX * 0.9)} ${n(-L * 0.40)} ${n(tipX)} ${n(-L * 0.62)} ` +
      `L ${n(tipX * 0.62)} ${n(-L * 0.40)} ` +
      `Q ${n(sx * hw * 0.20)} ${n(-L * 0.24)} ${n(sx * hw * 0.10)} ${n(-L * 0.08)} Z" ` +
      `fill="${WOOD.mid}" stroke="${WOOD.dark}" stroke-width="${n(W * 0.022)}"/>`
    );
  }
  // Shell body: fat and round, wound to one side.
  const body =
    `M 0 ${n(-L * 0.22)} ` +
    `C ${n(hw * 0.80)} ${n(-L * 0.18)} ${n(hw * 0.86)} ${n(L * 0.26)} ${n(hw * 0.22)} ${n(L * 0.44)} ` +
    `C ${n(-hw * 0.42)} ${n(L * 0.58)} ${n(-hw * 0.90)} ${n(L * 0.06)} ${n(-hw * 0.56)} ${n(-L * 0.16)} ` +
    `C ${n(-hw * 0.36)} ${n(-L * 0.30)} ${n(-hw * 0.16)} ${n(-L * 0.28)} 0 ${n(-L * 0.22)} Z`;
  out.push(timber(body, L, W, { fill: WOOD.light, broken }));
  // The spiral: three tightening whorls, drawn heavy so it survives at token
  // size. This is the whole identity of the class.
  const whorls = [
    [0.62, 0.30], [0.42, 0.20], [0.24, 0.12],
  ];
  for (const [rx, ry] of whorls) {
    out.push(
      `<ellipse cx="${n(hw * 0.06)}" cy="${n(L * 0.06)}" rx="${n(hw * rx)}" ry="${n(L * ry)}" ` +
      `fill="none" stroke="${WOOD.dark}" stroke-width="${n(W * 0.038)}" opacity="0.75" ` +
      `transform="rotate(-18 ${n(hw * 0.06)} ${n(L * 0.06)})"/>`
    );
  }
  out.push(`<circle cx="${n(hw * 0.06)}" cy="${n(L * 0.06)}" r="${n(W * 0.05)}" fill="${WOOD.dark}" opacity="0.85"/>`);
  if (!broken) out.push(helmGlow(L * 0.72, W, hue));
  return out.join('\n');
}

// ── Tradesman: the merchant. Round-bellied and beamy where the hammership is
// narrow, with a raised stern castle and cargo hatches instead of weapons.
function hullTradesman(L, W, opts = {}) {
  const { broken = false, hue = '#8fd4ff' } = opts;
  const hw = W / 2;
  const body =
    `M 0 ${n(-L * 0.46)} ` +
    `C ${n(hw * 0.46) } ${n(-L * 0.36)} ${n(hw * 0.76)} ${n(-L * 0.06)} ${n(hw * 0.72)} ${n(L * 0.18)} ` +
    `C ${n(hw * 0.68)} ${n(L * 0.36)} ${n(hw * 0.50)} ${n(L * 0.44)} ${n(hw * 0.38)} ${n(L * 0.46)} ` +
    `L ${n(-hw * 0.38)} ${n(L * 0.46)} ` +
    `C ${n(-hw * 0.50)} ${n(L * 0.44)} ${n(-hw * 0.68)} ${n(L * 0.36)} ${n(-hw * 0.72)} ${n(L * 0.18)} ` +
    `C ${n(-hw * 0.76)} ${n(-L * 0.06)} ${n(-hw * 0.46)} ${n(-L * 0.36)} 0 ${n(-L * 0.46)} Z`;
  const out = [timber(body, L, W, { fill: WOOD.mid, broken })];
  out.push(
    `<rect x="${n(-hw * 0.30)}" y="${n(L * 0.24)}" width="${n(hw * 0.60)}" height="${n(L * 0.17)}" ` +
    `rx="${n(L * 0.02)}" fill="${WOOD.light}" stroke="${WOOD.dark}" stroke-width="${n(W * 0.022)}"/>`
  );
  for (let i = 0; i < 2; i++) {
    out.push(
      `<rect x="${n(-hw * 0.14)}" y="${n(-L * 0.08 + i * L * 0.17)}" width="${n(hw * 0.28)}" ` +
      `height="${n(L * 0.10)}" fill="${WOOD.dark}" opacity="0.5"/>`
    );
  }
  if (!broken) {
    out.push(sailRig(L * 0.92, W * 0.94, { masts: 3 }));
    out.push(helmGlow(L * 0.84, W, hue));
  } else {
    out.push(sailRig(L * 0.92, W * 0.94, { masts: 3, torn: true }));
  }
  return out.join('\n');
}

const HULLS = { hammership: hullHammership, squid: hullSquid, nautiloid: hullNautiloid, tradesman: hullTradesman };

// Back-compat shim: `hull(len, wid, opts)` still works, and picks a class.
function hull(len, wid, opts = {}) {
  const kind = opts.kind && HULLS[opts.kind] ? opts.kind : 'hammership';
  return HULLS[kind](len, wid, opts);
}

function wrap(uid, inner, rnd, stars = 70) {
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">',
    defsVoid(uid),
    '<circle cx="256" cy="256" r="256" fill="url(#space' + uid + ')"/>',
    `<g clip-path="url(#clip${uid})">`,
    starfield(rnd, stars),
    inner,
    '</g>',
    '</svg>',
  ].join('\n');
}

// ── features ─────────────────────────────────────────────────────────────────

function asteroidField(rnd, { dense = false, chunky = false } = {}) {
  const out = [];
  const count = dense ? 46 : (chunky ? 9 : 18);
  for (let i = 0; i < count; i++) {
    // Clustered toward a drifting band rather than evenly scattered — an even
    // spread reads as noise, a band reads as a belt.
    const t = rnd();
    const bandY = 256 + Math.sin(t * Math.PI * 2) * 40 + (rnd() - 0.5) * (dense ? 120 : 300);
    const x = 40 + rnd() * 432;
    const r = (dense ? 6 : (chunky ? 22 : 10)) + rnd() * (dense ? 16 : (chunky ? 40 : 34));
    out.push(rock(x, bandY, r, rnd, rnd() > 0.75 ? '#9a8f80' : '#8a8a92'));
  }
  // dust
  for (let i = 0; i < 40; i++) {
    out.push(`<circle cx="${n(rnd() * 512)}" cy="${n(rnd() * 512)}" r="${n(1 + rnd() * 2)}" fill="#b9b9c4" opacity="${(0.2 + rnd() * 0.4).toFixed(2)}"/>`);
  }
  return out.join('\n');
}

function debrisField(rnd) {
  const out = [];
  // Wreckage: flat plates and spars rather than rounded rocks.
  for (let i = 0; i < 26; i++) {
    const x = 60 + rnd() * 392;
    const y = 60 + rnd() * 392;
    const w = 8 + rnd() * 46;
    const h = 3 + rnd() * 10;
    const rot = rnd() * 360;
    out.push(
      `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" fill="#6d7686" ` +
      `opacity="${(0.55 + rnd() * 0.4).toFixed(2)}" transform="rotate(${n(rot)} ${n(x)} ${n(y)})"/>`
    );
    out.push(
      `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h * 0.35)}" fill="#a8c4ff" ` +
      `opacity="0.25" transform="rotate(${n(rot)} ${n(x)} ${n(y)})"/>`
    );
  }
  for (let i = 0; i < 10; i++) out.push(rock(60 + rnd() * 392, 60 + rnd() * 392, 5 + rnd() * 12, rnd));
  return out.join('\n');
}

function derelict(rnd, { kind = 'hammership' } = {}) {
  const rot = -25 + rnd() * 50;
  const out = [
    `<g transform="translate(256 262) rotate(${n(rot)}) scale(1.05)">`,
    hull(240, 158, { kind, broken: true }),
    '</g>',
  ];
  // Torn-off pieces drifting alongside — what makes it read as WRECKED rather
  // than merely dark.
  for (let i = 0; i < 12; i++) {
    const a = rnd() * Math.PI * 2;
    const d = 120 + rnd() * 130;
    out.push(rock(256 + Math.cos(a) * d, 256 + Math.sin(a) * d, 4 + rnd() * 11, rnd, '#5c6270'));
  }
  return out.join('\n');
}

function station(rnd, { dock = false } = {}) {
  const out = [];
  const R = 150;
  // Torus
  out.push(`<circle cx="256" cy="256" r="${R}" fill="none" stroke="#707a8c" stroke-width="34"/>`);
  out.push(`<circle cx="256" cy="256" r="${R}" fill="none" stroke="#96a3b8" stroke-width="10" opacity="0.7"/>`);
  // Lit windows around the ring
  const wins = 34;
  for (let i = 0; i < wins; i++) {
    const a = (i / wins) * Math.PI * 2;
    if (rnd() > 0.78) continue;
    out.push(
      `<circle cx="${n(256 + Math.cos(a) * R)}" cy="${n(256 + Math.sin(a) * R)}" r="4.5" ` +
      `fill="#ffd873" opacity="${(0.5 + rnd() * 0.5).toFixed(2)}"/>`
    );
  }
  // Spokes + hub
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    out.push(
      `<line x1="${n(256 + Math.cos(a) * 34)}" y1="${n(256 + Math.sin(a) * 34)}" ` +
      `x2="${n(256 + Math.cos(a) * R)}" y2="${n(256 + Math.sin(a) * R)}" ` +
      `stroke="#7d8798" stroke-width="16"/>`
    );
  }
  out.push('<circle cx="256" cy="256" r="46" fill="#5f6878"/>');
  out.push('<circle cx="256" cy="256" r="46" fill="none" stroke="#a8c4ff" stroke-width="4" opacity="0.5"/>');
  out.push('<circle cx="256" cy="256" r="18" fill="#a8c4ff" opacity="0.35"/>');
  if (dock) {
    // Gantries and a ship in for repair, which is what makes it a shipyard
    // rather than a station.
    out.push('<rect x="60" y="238" width="120" height="14" fill="#6d7686"/>');
    out.push('<rect x="332" y="260" width="120" height="14" fill="#6d7686"/>');
    out.push(`<g transform="translate(118 245) rotate(90) scale(0.42)">${hull(215, 150, { kind: 'squid' })}</g>`);
  }
  return out.join('\n');
}

function ship(rnd, { count = 1, warship = false, kind = null } = {}) {
  const out = [];
  const pick = kind || (warship ? 'hammership' : 'tradesman');
  const hue = warship ? '#ffb36b' : '#8fd4ff';
  if (count === 1) {
    out.push(
      `<g transform="translate(256 262) rotate(${n(-16 + rnd() * 32)}) scale(1.05)">` +
      `${hull(240, 158, { kind: pick, hue, war: warship })}</g>`
    );
  } else {
    // A mixed squadron — one of each class, so the group reads as a fleet
    // rather than three copies of the same ship.
    const kinds = ['hammership', 'tradesman', 'squid'];
    const spots = [[250, 208, 0.72], [166, 330, 0.52], [346, 342, 0.48]];
    for (let i = 0; i < Math.min(count, spots.length); i++) {
      const [x, y, sc] = spots[i];
      out.push(
        `<g transform="translate(${x} ${y}) rotate(${n(-16 + rnd() * 32)}) scale(${sc})">` +
        `${hull(240, 158, { kind: kinds[i], hue })}</g>`
      );
    }
  }
  return out.join('\n');
}

function comet(rnd) {
  const ang = rnd() * 360;
  const out = [];
  out.push(
    `<defs><linearGradient id="tail${n(ang)}" x1="0" y1="0" x2="1" y2="0">` +
    `<stop offset="0%" stop-color="#9fe4ff" stop-opacity="0.75"/>` +
    `<stop offset="45%" stop-color="#7fc8ff" stop-opacity="0.30"/>` +
    `<stop offset="100%" stop-color="#6aa8ff" stop-opacity="0"/>` +
    `</linearGradient>` +
    `<radialGradient id="coma${n(ang)}" cx="50%" cy="50%" r="50%">` +
    `<stop offset="0%" stop-color="#eafaff" stop-opacity="0.95"/>` +
    `<stop offset="45%" stop-color="#a8e0ff" stop-opacity="0.45"/>` +
    `<stop offset="100%" stop-color="#a8e0ff" stop-opacity="0"/>` +
    `</radialGradient></defs>`
  );
  out.push(`<g transform="rotate(${n(ang)} 256 256)">`);
  // Broad dust tail, then a tighter ion tail inside it.
  out.push(`<path d="M 250 256 L 520 130 L 520 382 Z" fill="url(#tail${n(ang)})"/>`);
  out.push(`<path d="M 250 256 L 520 216 L 520 296 Z" fill="#dff4ff" opacity="0.30"/>`);
  out.push(`<circle cx="216" cy="256" r="70" fill="url(#coma${n(ang)})"/>`);
  out.push('</g>');
  // Nucleus sits inside the coma, lit hard on the sunward side.
  out.push(rock(216, 256, 30, rnd, '#cfd8e2'));
  out.push('<circle cx="206" cy="246" r="11" fill="#ffffff" opacity="0.5"/>');
  return out.join('\n');
}

function gate(rnd) {
  const out = [];
  out.push('<defs><radialGradient id="gg" cx="50%" cy="50%" r="50%">' +
    '<stop offset="0%" stop-color="#b98cff" stop-opacity="0.85"/>' +
    '<stop offset="70%" stop-color="#7f5bd6" stop-opacity="0.35"/>' +
    '<stop offset="100%" stop-color="#7f5bd6" stop-opacity="0"/></radialGradient></defs>');
  out.push('<circle cx="256" cy="256" r="140" fill="url(#gg)"/>');
  out.push('<circle cx="256" cy="256" r="120" fill="#1a1030" opacity="0.85"/>');
  // A vortex inside, or the gate is just a dark hole in a wheel: arcs that
  // tighten toward the centre, plus a few sparks being drawn in.
  for (let i = 0; i < 7; i++) {
    const r0 = 108 - i * 13;
    const a0 = rnd() * Math.PI * 2;
    const sweep = 1.6 + rnd() * 2.2;
    const x0 = 256 + Math.cos(a0) * r0, y0 = 256 + Math.sin(a0) * r0;
    const x1 = 256 + Math.cos(a0 + sweep) * r0 * 0.82;
    const y1 = 256 + Math.sin(a0 + sweep) * r0 * 0.82;
    out.push(
      `<path d="M ${n(x0)} ${n(y0)} A ${n(r0)} ${n(r0 * 0.9)} 0 0 1 ${n(x1)} ${n(y1)}" ` +
      `fill="none" stroke="#c9a8ff" stroke-width="${n(1.5 + rnd() * 2.5)}" opacity="${(0.14 + rnd() * 0.22).toFixed(2)}"/>`
    );
  }
  out.push('<circle cx="256" cy="256" r="26" fill="#e8d7ff" opacity="0.35"/>');
  out.push('<circle cx="256" cy="256" r="12" fill="#ffffff" opacity="0.45"/>');
  for (let i = 0; i < 10; i++) {
    const a = rnd() * Math.PI * 2;
    const d = 30 + rnd() * 80;
    out.push(`<circle cx="${n(256 + Math.cos(a) * d)}" cy="${n(256 + Math.sin(a) * d)}" r="${n(1 + rnd() * 2)}" fill="#f0e4ff" opacity="${(0.3 + rnd() * 0.5).toFixed(2)}"/>`);
  }
  // The ring itself: segmented, so it reads as built rather than drawn.
  const segs = 12;
  for (let i = 0; i < segs; i++) {
    const a0 = (i / segs) * Math.PI * 2;
    const a1 = a0 + (Math.PI * 2 / segs) * 0.76;
    const r0 = 120, r1 = 152;
    const x0 = 256 + Math.cos(a0) * r0, y0 = 256 + Math.sin(a0) * r0;
    const x1 = 256 + Math.cos(a0) * r1, y1 = 256 + Math.sin(a0) * r1;
    const x2 = 256 + Math.cos(a1) * r1, y2 = 256 + Math.sin(a1) * r1;
    const x3 = 256 + Math.cos(a1) * r0, y3 = 256 + Math.sin(a1) * r0;
    out.push(
      `<path d="M ${n(x0)} ${n(y0)} L ${n(x1)} ${n(y1)} A ${r1} ${r1} 0 0 1 ${n(x2)} ${n(y2)} ` +
      `L ${n(x3)} ${n(y3)} A ${r0} ${r0} 0 0 0 ${n(x0)} ${n(y0)} Z" fill="#6f7a90"/>`
    );
  }
  out.push('<circle cx="256" cy="256" r="152" fill="none" stroke="#c9a8ff" stroke-width="3" opacity="0.55"/>');
  return out.join('\n');
}

const FEATURES = {
  'asteroid-field':   { name: 'Asteroid Field',      draw: (r) => asteroidField(r) },
  'boulder-field':    { name: 'Boulder Field',       draw: (r) => asteroidField(r, { chunky: true }) },
  'dense-belt':       { name: 'Dense Asteroid Belt', draw: (r) => asteroidField(r, { dense: true }) },
  'debris-field':     { name: 'Debris Field',        draw: (r) => debrisField(r) },
  'derelict-hulk':    { name: 'Derelict Hammership', draw: (r) => derelict(r, { kind: 'hammership' }) },
  'derelict-trader':  { name: 'Derelict Trader',     draw: (r) => derelict(r, { kind: 'tradesman' }) },
  'space-station':    { name: 'Space Station',       draw: (r) => station(r) },
  'shipyard':         { name: 'Shipyard Dock',       draw: (r) => station(r, { dock: true }) },
  'ship':             { name: 'Tradesman',           draw: (r) => ship(r, { kind: 'tradesman' }) },
  'warship':          { name: 'Warship',             draw: (r) => ship(r, { warship: true }) },
  'hammership':       { name: 'Hammership',          draw: (r) => ship(r, { kind: 'hammership' }) },
  'squid-ship':       { name: 'Squid Ship',          draw: (r) => ship(r, { kind: 'squid' }) },
  'nautiloid':        { name: 'Nautiloid',           draw: (r) => ship(r, { kind: 'nautiloid' }) },
  'fleet':            { name: 'Fleet',               draw: (r) => ship(r, { count: 3 }) },
  'comet':            { name: 'Comet',               draw: (r) => comet(r) },
  'gate':             { name: 'Wildspace Gate',      draw: (r) => gate(r) },
};

function renderFeatureSvg({ feature, seed = 1 }) {
  const f = FEATURES[feature];
  if (!f) throw new Error(`unknown feature: ${feature}`);
  const rnd = mulberry32(seed);
  const uid = `f${(seed >>> 0).toString(36)}`;
  return wrap(uid, f.draw(rnd), rnd);
}

module.exports = { renderFeatureSvg, FEATURES };
