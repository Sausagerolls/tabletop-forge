import React, { useRef, useState, useEffect, useLayoutEffect, useCallback, useMemo } from 'react';
import Konva from 'konva';
import { Stage, Layer, Line, Image as KonvaImage, Group, Circle, Ellipse, Rect, Text, Wedge, Shape } from 'react-konva';

// Cap layer-canvas pixel density. On retina (dpr=2) every Konva layer canvas
// carries 4x the pixels of a 1x screen; long sessions on big monitors were
// hitting browser tab memory limits. 1.5 keeps text/token edges crisp while
// nearly halving total canvas memory.
Konva.pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
import useImage from 'use-image';
import { loadCappedImage } from '../utils/cappedImage.js';
import { wallToSegments, wallsToSegments, doorsToSegments, computeVisibilityPolygon, ledgeData, ledgeFarSidePolygon, windowData, windowFarSideData, fogBlocksToSegments } from '../utils/los.js';
import {
  referenceDeck as shipReferenceDeck,
  deckToWorld as shipDeckToWorld,
  tokenExtent as shipTokenExtent,
  isAtHelm as shipIsAtHelm,
} from '../utils/ships.js';
import { registries as pluginRegistries, useRegistryVersion } from '../plugins/pluginRegistry.js';
import { PING_TOOLS, pingSizeForTool, pingSize } from '../utils/ping.js';
import { isTokenDown, tokenLabelInfo, hpColor } from '../utils/tokenState.js';
import { doorMotion, doorIsHidden, doorIsUsableBy } from '../utils/doorMotion.js';
import DoorMenu from './DoorMenu.jsx';
import {
  FEET_PER_SQUARE,
  hexLattice, hexCenter, nearestHexCenter, traceHexLattice,
  DEFAULT_SCALE, scaleOf, formatCells,
} from '../utils/grid.js';

// Where the GM's deck-switch buttons hang: clear of the ship, whatever shape it
// is and whichever way it's pointing.
//
// They used to be pinned to the REFERENCE deck's right edge, which is only the
// ship's right edge when that deck is the widest and sits at offset 0. On a hull
// whose reference is a narrow upper deck — 4 wide at offset_col 3, against a
// 10-wide main deck at -3 — the column landed on top of the art. It also ignored
// rotation, so turning the ship swung the hull out over the buttons.
//
// So: take the union of every deck box (sails included — they're part of what's
// drawn), rotate its corners about the ship's pivot, and hang the column off the
// right edge of THAT, vertically centred on it.
function shipButtonAnchor({ ship, decks, refDeck, gs, ox, oy, slots, size, gap }) {
  const boxes = decks.map((d) => {
    const x1 = ox + (Number(ship.grid_col) + Number(d.offset_col || 0)) * gs;
    const y1 = oy + (Number(ship.grid_row) + Number(d.offset_row || 0)) * gs;
    return { x1, y1, x2: x1 + Number(d.grid_cols) * gs, y2: y1 + Number(d.grid_rows) * gs };
  });
  if (!boxes.length) return null;
  const ux1 = Math.min(...boxes.map(b => b.x1)), ux2 = Math.max(...boxes.map(b => b.x2));
  const uy1 = Math.min(...boxes.map(b => b.y1)), uy2 = Math.max(...boxes.map(b => b.y2));

  const px = ox + (Number(ship.grid_col) + Number(refDeck.offset_col || 0)) * gs + (Number(refDeck.grid_cols) * gs) / 2;
  const py = oy + (Number(ship.grid_row) + Number(refDeck.offset_row || 0)) * gs + (Number(refDeck.grid_rows) * gs) / 2;
  const rad = ((Number(ship.rotation) || 0) * Math.PI) / 180;
  const cos = Math.cos(rad), sin = Math.sin(rad);
  const xs = [], ys = [];
  for (const [cx, cy] of [[ux1, uy1], [ux2, uy1], [ux2, uy2], [ux1, uy2]]) {
    const dx = cx - px, dy = cy - py;
    xs.push(px + dx * cos - dy * sin);
    ys.push(py + dx * sin + dy * cos);
  }
  const stack = slots * (size + gap) - gap;
  return {
    bx: Math.max(...xs) + gap,
    by: (Math.min(...ys) + Math.max(...ys)) / 2 - stack / 2,
  };
}

// A single deck's artwork, optionally out of focus.
//
// Konva can only blur a cached node, so this caches itself whenever a blur is
// asked for and drops the cache when it isn't — caching an unblurred deck would
// cost memory and gain nothing. Re-caches only when the image, its size or the
// radius changes, so a blurred deck below you is rasterised once and then just
// blits, rather than re-filtering every frame the ship moves.
function DeckArt({ img, x, y, w, h, blur }) {
  const ref = useRef(null);
  useEffect(() => {
    const node = ref.current;
    if (!node || !img) return;
    if (blur > 0) {
      // Cache at pixelRatio 1 so one unit of blurRadius is one MAP pixel — the
      // filter runs on the cached bitmap, in node space, and the stage's zoom is
      // applied afterwards when that bitmap is drawn. Scaling the radius by the
      // zoom (which this used to do) inflated it until the deck below smeared
      // into an unreadable ghost and looked like it wasn't drawn at all.
      //
      // `offset` pads the cache so the blur has somewhere to bleed; without it
      // the filter clips at the deck's edge and leaves a hard border around a
      // soft interior.
      node.cache({ pixelRatio: 1, offset: Math.ceil(blur) + 2 });
      node.filters([Konva.Filters.Blur]);
      node.blurRadius(blur);
    } else {
      node.filters([]);
      node.clearCache();
    }
    node.getLayer()?.batchDraw();
  }, [img, w, h, blur]);
  return (
    <KonvaImage
      ref={ref}
      image={img}
      x={x} y={y}
      width={w} height={h}
      // Softened as well as blurred: a deck you are standing over should read as
      // underneath you, not as a second deck competing with your own.
      opacity={blur > 0 ? 0.85 : 1}
      listening={false}
    />
  );
}

export const TOKEN_SIZES = {
  tiny:       { gridW: 1, gridH: 1, scale: 0.45, label: 'Tiny' },
  small:      { gridW: 1, gridH: 1, scale: 0.85, label: 'Small' },
  medium:     { gridW: 1, gridH: 1, scale: 0.85, label: 'Medium' },
  large:      { gridW: 2, gridH: 2, scale: 0.92, label: 'Large' },
  huge:       { gridW: 3, gridH: 3, scale: 0.92, label: 'Huge' },
  // Gargantuan is a FLOOR, not a size: the rules say 20 feet or more, so the
  // 4×4 here is the smallest a gargantuan creature can be, not the only one it
  // can be. `size_squares` on the token overrides it — see tokenFootprint.
  gargantuan: { gridW: 4, gridH: 4, scale: 0.92, label: 'Gargantuan' },
};

// The footprint a token actually occupies, in squares. The size preset is the
// default; `size_squares` overrides it for creatures whose category sets only a
// minimum. Everything that needs a token's extent goes through here — the
// renderer, marquee hit-testing, vision origins, aura centres and the ship
// deck maths — so a resized tarrasque is one size everywhere rather than
// drawing large and being hit-tested small.
// How far a token's art is raised off its square, in pixels.
//
// Elevation is stored in feet and a grid square is 5 ft, so a foot is
// gridSize/5 pixels. Damped to 45% so a token at a realistic flying height
// stays near its own square instead of sailing off the top of the viewport,
// and capped at three squares.
//
// Shared with the fog pass, which has to know exactly where the lifted art
// lands in order to keep it out of the shadow.
export function elevationLiftPx(elevationFt, gridSize) {
  const ft = Number(elevationFt) || 0;
  return ft > 0 ? Math.min(gridSize * 3, (ft / 5) * gridSize * 0.45) : 0;
}

export function tokenFootprint(token) {
  const base = TOKEN_SIZES[token?.size] || TOKEN_SIZES.medium;
  const n = Number(token?.size_squares);
  // The art inset (`scale`) is deliberately kept from the preset: it's a
  // proportion of the footprint, so it holds at any number of squares.
  return Number.isFinite(n) && n > 0 ? { ...base, gridW: n, gridH: n } : base;
}

// GM marker visual config — kept in sync with DMView's DM_MARKER_TYPES
export const DM_MARKER_ICONS = {
  trap:        '🪤',
  hazard:      '⚠️',
  patrol:      '👁️',
  secret_door: '🔒',
  encounter:   '💀',
  treasure:    '💰',
  magic:       '🔮',
  note:        '📝',
  reminder:    '🔔',
  poison:      '🧪',
  ambush:      '🏹',
  npc:         '🧙',
  text_label:  '✏️',
};
export const DM_MARKER_COLORS = {
  trap:        '#ef4444',
  hazard:      '#f97316',
  patrol:      '#3b82f6',
  secret_door: '#8b5cf6',
  encounter:   '#dc2626',
  treasure:    '#eab308',
  magic:       '#a855f7',
  note:        '#6b7280',
  reminder:    '#22d3ee',
  poison:      '#84cc16',
  ambush:      '#f59e0b',
  npc:         '#10b981',
  text_label:  '#facc15',
};


// Grid size the token-label slider is calibrated against. Label sizes are
// expressed relative to this so they hold their proportion to the token when
// the map's grid is larger or smaller.
const REFERENCE_GRID = 50;
// Default label height as a fraction of one grid square, at slider = 45.
// Calibrated against what a 256-grid battlemap looked like with the old flat
// 43px label (~0.17 squares) — small enough to sit under the token rather than
// smother it. The slider scales this, so a GM who wants chunkier labels still
// gets them.
const NAME_LABEL_SQUARES = 0.2;
// HP bar thickness, as a fraction of the token's DRAWN width — and the HP
// digits as a fraction of that bar.
//
// Measured against the token, not the label's font. The font is grid-relative
// and small in absolute terms on a fine grid (0.2 squares = 4px on a 20 grid),
// so a bar defined as a fraction of it collapsed to a couple of pixels under
// small tokens while the token itself was still perfectly legible. The bar is
// read against the token it belongs to, so that is what it should scale with.
// 0.2 puts a medium on a 50 grid at ~8.5px, which is where the old
// `max(8, round(font/2) + 4)` sat before any of this — the difference being
// that it now holds that proportion on every grid and every token size instead
// of pinning to a floor.
const HP_BAR_TOKEN_FRACTION = 0.2;
const HP_TEXT_RATIO = 0.72;
const MEASURE_TOOLS = new Set(['ruler', 'cone', 'circle']);

// Transformation / destruction effects. Durations must match FX_SPECS on the
// server, which swaps the token's identity at `applyAt` — partway through, while
// the animation is covering the token, so the change is never seen happening.
export const FX_SPECS = {
  blink: { duration: 900 },
  vines: { duration: 1800 },
  fire:  { duration: 1500 },
  frost: { duration: 1600 },
  // Ways for a creature to stop existing.
  dissolve: { duration: 1700 },
  explode:  { duration: 1400 },
  implode:  { duration: 1300 },
};
// Shared empty array for optional id-list props — a fresh `[]` default would
// be a new reference every render and invalidate the memos that depend on it.
const EMPTY_IDS = [];
// Same reasoning as EMPTY_IDS — a fresh [] default would break memo identity
// on every render for maps with no ships on them, which is most of them.
const EMPTY_SHIPS = [];
// GM deck-switch button geometry, in SCREEN pixels. Divided by the stage scale
// at use so the buttons stay a constant, clickable size — at wildspace zoom a
// map-space button would be a couple of pixels across.
const SHIP_DECK_BTN = 22;
const SHIP_DECK_GAP = 4;

// ── Transformation effect painters ───────────────────────────────────────────
// Each takes a 2D context, the token's centre in SCREEN pixels, the token's
// on-screen radius, and progress 0→1. All drawing is self-contained: save and
// restore around any state change so effects can't leak into each other.
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeIn  = (t) => t * t * t;
// Deterministic per-index jitter — particles must not re-randomise every frame.
const rand = (seed) => {
  const s = Math.sin(seed * 127.1) * 43758.5453;
  return s - Math.floor(s);
};

// Green vines spiralling up and around the token, closing into a cocoon pod.
function drawVines(ctx, cx, cy, r, p) {
  const TENDRILS = 7;
  const grow  = easeOut(Math.min(1, p / 0.5));      // tendrils reaching around
  const pod   = easeOut(Math.max(0, (p - 0.35) / 0.4)); // cocoon filling in
  const settle = Math.max(0, (p - 0.75) / 0.25);

  ctx.save();

  // Ground glow — the magic under it all.
  const glow = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * 1.9);
  glow.addColorStop(0, `rgba(74,222,128,${0.28 * (1 - settle * 0.6)})`);
  glow.addColorStop(1, 'rgba(74,222,128,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 1.9, 0, Math.PI * 2);
  ctx.fill();

  // Cocoon body — a pod that swells to swallow the token.
  if (pod > 0) {
    const podW = r * (0.55 + 0.62 * pod);
    const podH = r * (0.75 + 0.95 * pod);
    const podGrad = ctx.createLinearGradient(cx - podW, cy - podH, cx + podW, cy + podH);
    podGrad.addColorStop(0, `rgba(20,83,45,${0.92 * pod})`);
    podGrad.addColorStop(0.5, `rgba(34,120,60,${0.92 * pod})`);
    podGrad.addColorStop(1, `rgba(12,60,32,${0.94 * pod})`);
    ctx.fillStyle = podGrad;
    ctx.beginPath();
    ctx.ellipse(cx, cy, podW, podH, 0, 0, Math.PI * 2);
    ctx.fill();

    // Fibre seams running the length of the pod.
    ctx.strokeStyle = `rgba(134,239,172,${0.5 * pod})`;
    ctx.lineWidth = Math.max(1, r * 0.045);
    for (let i = -2; i <= 2; i++) {
      const off = (i / 2.4) * podW * 0.8;
      ctx.beginPath();
      ctx.ellipse(cx + off * 0.35, cy, Math.abs(podW * 0.55 - Math.abs(off) * 0.35), podH * 0.94, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // Tendrils — spirals climbing from the base and wrapping the token.
  for (let i = 0; i < TENDRILS; i++) {
    const baseAngle = (i / TENDRILS) * Math.PI * 2 + p * 1.6;
    const wobble = 0.5 + rand(i) * 0.9;
    ctx.beginPath();
    const STEPS = 26;
    for (let s = 0; s <= STEPS; s++) {
      const t = (s / STEPS) * grow;
      const rad = r * (0.18 + 1.15 * t);
      const ang = baseAngle + t * 3.4 * wobble;
      const x = cx + Math.cos(ang) * rad;
      const y = cy + Math.sin(ang) * rad * 0.92 - t * r * 0.25;
      if (s === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = i % 2 ? 'rgba(34,197,94,0.95)' : 'rgba(21,128,61,0.95)';
    ctx.lineWidth = Math.max(1.4, r * (0.11 - 0.04 * settle));
    ctx.lineCap = 'round';
    ctx.stroke();

    // Leaves budding along the vine.
    const leaves = 3;
    for (let l = 1; l <= leaves; l++) {
      const t = (l / (leaves + 0.5)) * grow;
      if (t <= 0.02) continue;
      const rad = r * (0.18 + 1.15 * t);
      const ang = baseAngle + t * 3.4 * wobble;
      const x = cx + Math.cos(ang) * rad;
      const y = cy + Math.sin(ang) * rad * 0.92 - t * r * 0.25;
      const lr = r * 0.16 * Math.min(1, grow * 1.4);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(ang + 1.2);
      ctx.fillStyle = `rgba(74,222,128,${0.85})`;
      ctx.beginPath();
      ctx.ellipse(0, 0, lr, lr * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // Spores drifting off once the pod has closed.
  if (settle > 0) {
    for (let i = 0; i < 12; i++) {
      const a = rand(i * 3.7) * Math.PI * 2;
      const d = r * (0.8 + rand(i * 5.1) * 1.4) * settle;
      const x = cx + Math.cos(a) * d;
      const y = cy + Math.sin(a) * d - settle * r * 0.7;
      ctx.fillStyle = `rgba(187,247,208,${0.75 * (1 - settle)})`;
      ctx.beginPath();
      ctx.arc(x, y, Math.max(0.8, r * 0.05), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

// A blast that consumes the token: shockwave, flame column, embers, smoke.
function drawFire(ctx, cx, cy, r, p) {
  const wave = easeOut(Math.min(1, p / 0.45));
  const burn = Math.min(1, p / 0.6);
  const fade = Math.max(0, (p - 0.55) / 0.45);

  ctx.save();

  // Shockwave ring.
  if (wave < 1) {
    ctx.strokeStyle = `rgba(251,191,36,${0.9 * (1 - wave)})`;
    ctx.lineWidth = Math.max(1.5, r * 0.22 * (1 - wave));
    ctx.beginPath();
    ctx.arc(cx, cy, r * (0.4 + 2.1 * wave), 0, Math.PI * 2);
    ctx.stroke();
  }

  // Core fireball, cooling and shrinking as it burns out.
  const coreR = r * (1.25 * burn) * (1 - fade * 0.55);
  if (coreR > 0) {
    const g = ctx.createRadialGradient(cx, cy - r * 0.1, r * 0.05, cx, cy, coreR);
    g.addColorStop(0, `rgba(255,247,214,${0.95 * (1 - fade)})`);
    g.addColorStop(0.35, `rgba(251,146,60,${0.9 * (1 - fade)})`);
    g.addColorStop(0.7, `rgba(220,38,38,${0.75 * (1 - fade)})`);
    g.addColorStop(1, 'rgba(120,20,10,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
    ctx.fill();
  }

  // Flame tongues licking upward.
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + rand(i) * 0.6;
    const rise = r * (0.6 + rand(i * 2.3) * 1.5) * burn;
    const x = cx + Math.cos(a) * r * 0.55;
    const y = cy + Math.sin(a) * r * 0.45 - rise * (0.4 + p);
    const fr = r * (0.3 + rand(i * 4.1) * 0.25) * (1 - fade);
    if (fr <= 0) continue;
    const fg = ctx.createRadialGradient(x, y, 0, x, y, fr);
    fg.addColorStop(0, `rgba(254,215,170,${0.85 * (1 - fade)})`);
    fg.addColorStop(1, 'rgba(239,68,68,0)');
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.arc(x, y, fr, 0, Math.PI * 2);
    ctx.fill();
  }

  // Embers thrown clear of the blast.
  for (let i = 0; i < 16; i++) {
    const a = rand(i * 1.7) * Math.PI * 2;
    const d = r * (0.5 + rand(i * 2.9) * 2.4) * easeOut(p);
    const x = cx + Math.cos(a) * d;
    const y = cy + Math.sin(a) * d - easeIn(p) * r * 1.3;
    ctx.fillStyle = `rgba(253,186,116,${Math.max(0, 0.9 - p)})`;
    ctx.beginPath();
    ctx.arc(x, y, Math.max(0.7, r * 0.06 * (1 - p * 0.6)), 0, Math.PI * 2);
    ctx.fill();
  }

  // Smoke left behind at the end.
  if (fade > 0.3) {
    const sm = (fade - 0.3) / 0.7;
    ctx.fillStyle = `rgba(60,60,66,${0.35 * (1 - sm)})`;
    ctx.beginPath();
    ctx.ellipse(cx, cy - sm * r * 1.1, r * (0.7 + sm * 0.7), r * (0.5 + sm * 0.6), 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

// Ice climbing over the token, then cracking apart.
function drawFrost(ctx, cx, cy, r, p) {
  const freeze  = easeOut(Math.min(1, p / 0.55));
  const shatter = Math.max(0, (p - 0.7) / 0.3);

  ctx.save();

  // Cold aura.
  const aura = ctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r * 1.8);
  aura.addColorStop(0, `rgba(186,230,253,${0.35 * freeze * (1 - shatter)})`);
  aura.addColorStop(1, 'rgba(186,230,253,0)');
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 1.8, 0, Math.PI * 2);
  ctx.fill();

  // Ice shell over the token.
  if (freeze > 0 && shatter < 1) {
    ctx.fillStyle = `rgba(224,242,254,${0.5 * freeze * (1 - shatter)})`;
    ctx.strokeStyle = `rgba(125,211,252,${0.9 * freeze * (1 - shatter)})`;
    ctx.lineWidth = Math.max(1, r * 0.06);
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.05 * freeze, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // Crystal needles spiking outward.
  const NEEDLES = 11;
  for (let i = 0; i < NEEDLES; i++) {
    const a = (i / NEEDLES) * Math.PI * 2 + rand(i) * 0.25;
    const len = r * (0.8 + rand(i * 3.3) * 0.9) * freeze;
    const w = r * 0.14 * (1 - shatter);
    if (len <= 0 || w <= 0) continue;
    const dx = Math.cos(a), dy = Math.sin(a);
    // Fly apart on shatter.
    const push = shatter * r * 1.6;
    const bx = cx + dx * (r * 0.2 + push);
    const by = cy + dy * (r * 0.2 + push);
    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(a);
    const g = ctx.createLinearGradient(0, 0, len, 0);
    g.addColorStop(0, `rgba(255,255,255,${0.95 * (1 - shatter)})`);
    g.addColorStop(1, `rgba(56,189,248,${0.25 * (1 - shatter)})`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, -w);
    ctx.lineTo(len, 0);
    ctx.lineTo(0, w);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // Cracks just before it goes.
  if (shatter > 0 && shatter < 0.9) {
    ctx.strokeStyle = `rgba(255,255,255,${0.9 * (1 - shatter)})`;
    ctx.lineWidth = Math.max(1, r * 0.05);
    for (let i = 0; i < 6; i++) {
      const a = rand(i * 6.1) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * r * 1.0, cy + Math.sin(a) * r * 1.0);
      ctx.stroke();
    }
  }

  ctx.restore();
}

// Teleport: the token folds out of the world and a rune-lit ring collapses
// behind it. Short and bright — this fires twice for a hop (origin and
// destination), so it must not outstay its welcome.
function drawBlink(ctx, cx, cy, r, p) {
  const out = easeOut(p);
  ctx.save();

  // Collapsing ring.
  const ringR = r * (1.6 - 1.2 * out);
  ctx.strokeStyle = `rgba(196,181,253,${0.9 * (1 - p)})`;
  ctx.lineWidth = Math.max(1.5, r * 0.16 * (1 - p * 0.5));
  ctx.beginPath();
  ctx.arc(cx, cy, Math.max(0, ringR), 0, Math.PI * 2);
  ctx.stroke();

  // Vertical shaft of light.
  const shaftW = r * 0.5 * (1 - out);
  if (shaftW > 0) {
    const g = ctx.createLinearGradient(cx, cy - r * 2.2, cx, cy + r * 0.6);
    g.addColorStop(0, 'rgba(221,214,254,0)');
    g.addColorStop(0.5, `rgba(233,213,255,${0.7 * (1 - p)})`);
    g.addColorStop(1, 'rgba(221,214,254,0)');
    ctx.fillStyle = g;
    ctx.fillRect(cx - shaftW, cy - r * 2.2, shaftW * 2, r * 2.8);
  }

  // Motes pulled inward.
  for (let i = 0; i < 14; i++) {
    const a = rand(i * 2.1) * Math.PI * 2;
    const d = r * (1.8 * (1 - out)) + r * 0.15;
    const x = cx + Math.cos(a) * d;
    const y = cy + Math.sin(a) * d;
    ctx.fillStyle = `rgba(237,233,254,${0.9 * (1 - p)})`;
    ctx.beginPath();
    ctx.arc(x, y, Math.max(0.8, r * 0.06), 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

// Disintegration: the creature goes to ash. Motes lift off it and drift away
// while the shape underneath thins out — no fire, no blast, just absence.
function drawDissolve(ctx, x, y, r, t) {
  const lift = easeOut(t);
  // The body thinning: a shrinking, fading disc of dust where it stood.
  ctx.fillStyle = `rgba(120,113,108,${0.5 * (1 - t)})`;
  ctx.beginPath();
  ctx.arc(x, y + r * lift * 0.3, r * (0.9 - lift * 0.55), 0, Math.PI * 2);
  ctx.fill();
  // Motes, lifting and spreading.
  for (let i = 0; i < 30; i++) {
    const a = (i / 30) * Math.PI * 2 + fxRand(i) * 1.2;
    const spread = r * (0.2 + lift * (1.1 + fxRand(i + 7) * 0.9));
    const rise = r * lift * (0.9 + fxRand(i + 21) * 1.5);
    const sz = r * (0.10 + fxRand(i + 40) * 0.09) * (1 - t * 0.7);
    const fade = Math.sin(Math.min(1, t / (0.35 + fxRand(i + 60) * 0.5)) * Math.PI);
    ctx.fillStyle = i % 4 === 0
      ? `rgba(214,211,209,${0.85 * fade})`
      : `rgba(120,113,108,${0.8 * fade})`;
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * spread, y + Math.sin(a) * spread * 0.55 - rise, sz, 0, Math.PI * 2);
    ctx.fill();
  }
}

const FX_PAINTERS = {
  vines: drawVines, fire: drawFire, frost: drawFrost, blink: drawBlink,
  dissolve: drawDissolve,
  // Assigned after the ship painters are declared — see below. A blast is a
  // blast whatever its size, and these are already written and tuned.
};

// ── Ship destruction effects ────────────────────────────────────────────────
// Anchored to where the hull was, in map space, and painted on the same FX
// canvas the token effects use. Each takes a 0..1 progress.
export const SHIP_FX_SPECS = {
  explosion: { duration: 1600 },
  magical:   { duration: 1900 },
  implosion: { duration: 1500 },
};

// Deterministic jitter so debris doesn't reshuffle every frame.
function fxRand(seed) {
  const x = Math.sin(seed * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

function drawShipExplosion(ctx, x, y, r, t) {
  const ease = 1 - Math.pow(1 - t, 2);
  // Fireball: hot core fading to smoke.
  const rad = r * (0.35 + ease * 1.5);
  const g = ctx.createRadialGradient(x, y, rad * 0.1, x, y, rad);
  g.addColorStop(0, `rgba(255,247,214,${0.95 * (1 - t)})`);
  g.addColorStop(0.4, `rgba(255,158,48,${0.75 * (1 - t)})`);
  g.addColorStop(0.75, `rgba(190,60,20,${0.5 * (1 - t)})`);
  g.addColorStop(1, 'rgba(60,40,35,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill();
  // Shock ring.
  ctx.strokeStyle = `rgba(255,220,160,${0.6 * (1 - t)})`;
  ctx.lineWidth = Math.max(1, r * 0.06 * (1 - t));
  ctx.beginPath(); ctx.arc(x, y, r * (0.5 + ease * 2.1), 0, Math.PI * 2); ctx.stroke();
  // Debris thrown outward.
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2 + fxRand(i) * 0.5;
    const d = r * (0.6 + ease * (1.4 + fxRand(i + 40) * 1.4));
    const sz = r * 0.06 * (1 - t * 0.7);
    ctx.fillStyle = `rgba(40,30,26,${0.8 * (1 - t)})`;
    ctx.fillRect(x + Math.cos(a) * d - sz / 2, y + Math.sin(a) * d - sz / 2, sz, sz);
  }
}

function drawShipMagical(ctx, x, y, r, t) {
  const ease = 1 - Math.pow(1 - t, 2.2);
  const rad = r * (0.3 + ease * 1.6);
  const g = ctx.createRadialGradient(x, y, rad * 0.05, x, y, rad);
  g.addColorStop(0, `rgba(245,230,255,${0.95 * (1 - t)})`);
  g.addColorStop(0.35, `rgba(167,139,250,${0.8 * (1 - t)})`);
  g.addColorStop(0.7, `rgba(56,189,248,${0.45 * (1 - t)})`);
  g.addColorStop(1, 'rgba(30,10,60,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill();
  // Two counter-rotating rune rings — reads as arcane rather than ordnance.
  for (const [dir, tint] of [[1, '167,139,250'], [-1, '125,211,252']]) {
    ctx.strokeStyle = `rgba(${tint},${0.7 * (1 - t)})`;
    ctx.lineWidth = Math.max(1, r * 0.04);
    const rr = r * (0.7 + ease * 1.3);
    ctx.beginPath();
    for (let i = 0; i < 12; i++) {
      const a0 = dir * t * 5 + (i / 12) * Math.PI * 2;
      ctx.arc(x, y, rr, a0, a0 + 0.22);
    }
    ctx.stroke();
  }
  // Motes drifting out.
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2 + fxRand(i) * 1.2;
    const d = r * (0.3 + ease * (1.2 + fxRand(i + 7) * 1.6));
    ctx.fillStyle = `rgba(233,213,255,${0.9 * (1 - t)})`;
    ctx.beginPath(); ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, Math.max(0.6, r * 0.03), 0, Math.PI * 2); ctx.fill();
  }
}

function drawShipImplosion(ctx, x, y, r, t) {
  // Everything rushes INWARD, then a single hard flash as it collapses.
  const pull = 1 - t;
  ctx.strokeStyle = `rgba(148,163,184,${0.5 * pull})`;
  ctx.lineWidth = Math.max(1, r * 0.03);
  ctx.beginPath(); ctx.arc(x, y, r * (0.2 + pull * 2.2), 0, Math.PI * 2); ctx.stroke();
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2 + fxRand(i) * 0.4;
    const d0 = r * (1.9 + fxRand(i + 3) * 0.8);
    const d = d0 * pull;
    const sz = r * 0.05;
    ctx.fillStyle = `rgba(70,60,80,${0.85 * pull})`;
    ctx.fillRect(x + Math.cos(a) * d - sz / 2, y + Math.sin(a) * d - sz / 2, sz, sz);
  }
  // Collapse flash in the last fifth.
  if (t > 0.8) {
    const f = (t - 0.8) / 0.2;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * (0.1 + f * 1.4));
    g.addColorStop(0, `rgba(255,255,255,${0.9 * (1 - f)})`);
    g.addColorStop(1, 'rgba(120,80,200,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r * (0.1 + f * 1.4), 0, Math.PI * 2); ctx.fill();
  }
}

const SHIP_FX_PAINTERS = {
  explosion: drawShipExplosion,
  magical:   drawShipMagical,
  implosion: drawShipImplosion,
};

// A creature exploding and a hull exploding differ only in scale, and every
// painter here takes its radius as an argument. Reusing them means the two
// cannot drift apart, and saves a second set of numbers to tune.
FX_PAINTERS.explode = drawShipExplosion;
FX_PAINTERS.implode = drawShipImplosion;



// Clip a 2D canvas context to a wedge (directional light cone). No-op for full circles.
function clipToWedge(ctx, cx, cy, r, dirDeg, spreadDeg) {
  if (spreadDeg >= 360) return;
  const half = (spreadDeg / 2) * (Math.PI / 180);
  const dirRad = dirDeg * (Math.PI / 180);
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, r, dirRad - half, dirRad + half);
  ctx.closePath();
  ctx.clip();
}
function pointInPolygon(px, py, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i].x, yi = pts[i].y, xj = pts[j].x, yj = pts[j].y;
    if (((yi > py) !== (yj > py)) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
// Point-in-polygon for a FLAT [x0,y0,x1,y1,…] array (the LOS polygon format).
function pointInFlatPoly(px, py, pts) {
  let inside = false;
  const n = pts.length / 2;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = pts[i * 2], yi = pts[i * 2 + 1], xj = pts[j * 2], yj = pts[j * 2 + 1];
    if (((yi > py) !== (yj > py)) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
// The footprint quad(s) a door's sprite actually covers, in its committed
// (non-animated) pose — used to clear fog over thick door art so the sprite
// isn't half-buried in shadow. Returns an array of flat quads [x0,y0,…,x3,y3].
function doorSpriteQuads(door, img) {
  const pts = door.points;
  if (!pts || pts.length < 4) return [];
  const [x1, y1, x2, y2] = pts;
  const len = Math.hypot(x2 - x1, y2 - y1);
  if (len < 2) return [];
  const ux = (x2 - x1) / len, uy = (y2 - y1) / len;
  const dir = door.open_dir === -1 ? -1 : 1;
  const px = -uy * dir, py = ux * dir;
  const aspect = (img && img.width && img.height) ? img.height / img.width : 0.25;
  const t = len * aspect;              // sprite thickness
  const hx = px * t / 2, hy = py * t / 2; // half-thickness offset vector

  // Rectangle spanning [a..b] along the leaf axis, centred on the line ±t/2.
  const rect = (ax, ay, bx, by) => [
    ax - hx, ay - hy, bx - hx, by - hy, bx + hx, by + hy, ax + hx, ay + hy,
  ];

  const motion = doorMotion(door);

  if (!door.is_open) {
    return [rect(x1, y1, x2, y2)];
  }
  // Nothing to draw: the leaf is gone while the door stands open.
  if (motion === 'vanish') return [];
  if (motion === 'slide') {
    // Slid into the wall alongside the opening.
    return [rect(x1 + ux * len, y1 + uy * len, x2 + ux * len, y2 + uy * len)];
  }
  if (motion === 'double') {
    const half = len / 2;
    return [
      rect(x1, y1, x1 + px * half, y1 + py * half),
      rect(x2, y2, x2 + px * half, y2 + py * half),
    ];
  }
  // Swing: single leaf perpendicular from the hinge.
  return [rect(x1, y1, x1 + px * len, y1 + py * len)];
}
// Dungeondraft and other Universal VTT exports write colours as a bare 8-digit
// AARRGGBB — no leading '#', alpha first. Everything downstream assumes
// '#rrggbb': the light shapes concatenate an alpha suffix onto the string, and
// hexToRgb's shift on an 8-digit value sign-extends into nonsense. Normalise
// once, here.
function normaliseHexColor(raw, fallback = '#fbbf24') {
  if (typeof raw !== 'string') return fallback;
  let h = raw.trim().replace(/^#/, '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  if (h.length === 8) h = h.slice(2);      // AARRGGBB — drop the leading alpha
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return fallback;
  return `#${h}`;
}

function hexToRgb(hex) {
  const h = normaliseHexColor(hex).slice(1);
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// Overall flicker depth, applied to both the radius wobble and the brightness
// wobble. 1 = the original amplitude, 0 = dead steady. The per-frame random
// term is the harshest part of the effect (white noise at 30fps rather than a
// smooth sine), so its own coefficient was cut roughly in half on top of this.
const FLICKER_STRENGTH = 0.45;

// Paint every light's warm radial gradient, clipped to its cone and its own LOS
// polygon. Shared by the glow canvas and by the door-sprite overlay so a door's
// art is lit by exactly the same math as the wall it sits in — otherwise the
// overlay copy (which sits above the glow canvas) reads as a shadowed panel and
// gives a secret door away.
// Every light on the board, in map pixels, as paintLightGlow wants them:
// the placed lights plus any token carrying its own (a torch, a lantern, a
// light cantrip). Extracted from MapStage's memo so the 3D view builds its
// light list from the same code rather than a second implementation that
// drifts.
export function buildGlowLights({ lights = [], tokens = [], gridSize, mW, mH }) {
    const isFiniteNum = (n) => typeof n === 'number' && Number.isFinite(n);
    // Flicker phase, derived from the id so two lights at the same spot don't
    // pulse in lockstep.
    //
    // Placed lights carry a UUID, and Number('f02682d0-…') is NaN — which
    // propagated through the flicker sines into a NaN radius, and
    // paintLightGlow's finite-guard then skipped the light entirely. Every
    // GM-placed light was silently dropped from the glow pass; only
    // token-carried lights (integer ids) ever drew. Hash non-numeric ids
    // instead of coercing them.
    const seedOf = (id, x, y) => {
      const n = Number(id);
      let base;
      if (Number.isFinite(n)) {
        base = n;
      } else if (id != null) {
        base = 0;
        const str = String(id);
        for (let i = 0; i < str.length; i++) base = (base * 31 + str.charCodeAt(i)) % 100000;
      } else {
        base = x * 13 + y * 31;
      }
      return (base * 0.1731) % (Math.PI * 2);
    };
    return [
      ...lights.map(l => ({
        // Stable per-light seed for the flicker phase. Two lights with the
        // same coords would otherwise pulse in lockstep, so we mix the id
        // (or a derived hash if the id is missing) into the seed.
        seed: seedOf(l.id, Number(l.x), Number(l.y)),
        x: Number(l.x), y: Number(l.y),
        brightR: Number(l.bright_radius) || 60,
        dimR: Number(l.dim_radius) || 120,
        color: normaliseHexColor(l.color),
        dir: l.direction ?? 0,
        spread: l.spread_angle ?? 360,
        // GM-controlled per-light: false → render as a steady glow (sun
        // shafts, magical continual flame, daylight spell, etc).
        flicker: l.flicker !== false,
      })),
      ...(tokens || []).flatMap(t => {
        const brightFt = Number(t.token_light_bright) || 0;
        const dimFt    = Number(t.token_light_dim)    || 0;
        if (brightFt <= 0 && dimFt <= 0) return [];
        const col = Number(t.grid_col), row = Number(t.grid_row);
        if (!Number.isFinite(col) || !Number.isFinite(row)) return [];
        const sz = tokenFootprint(t);
        const pxPerFt = gridSize / FEET_PER_SQUARE;
        const ox = gridSize > 0 ? (mW % gridSize) / 2 : 0;
        const oy = gridSize > 0 ? (mH % gridSize) / 2 : 0;
        const cx = ox + col * gridSize + (sz.gridW * gridSize) / 2;
        const cy = oy + row * gridSize + (sz.gridH * gridSize) / 2;
        return [{
          seed: ((Number(t.id) || 0) * 0.2389 + 1.7) % (Math.PI * 2),
          x: cx, y: cy,
          brightR: brightFt * pxPerFt,
          dimR: (dimFt || brightFt * 2) * pxPerFt,
          color: t.token_light_color || '#fbbf24',
          dir: 0, spread: 360,
          // Per-token flicker flag — defaults to true for legacy tokens
          // (torches / lanterns) and turns off for inventory items the
          // player has marked as steady (magical light, sunblade, etc).
          flicker: t.token_light_flicker !== false,
        }];
      }),
    ].filter(g => isFiniteNum(g.x) && isFiniteNum(g.y)
                  && isFiniteNum(g.brightR) && isFiniteNum(g.dimR));
}

// `bounds` — {w, h} of the board, optional.
//
// A light is clipped to the visibility polygon it casts. When that polygon
// comes back degenerate (fewer than two points) the glow was drawn with NO clip
// at all, which is how a lamp near the edge of the map painted a huge yellow
// disc across the void beyond it. Clipping to the board as well means the
// fallback is "the whole map", never "the whole canvas".
//
// Optional rather than required because the 3D view paints glows into its own
// light texture with its own extent and passes no bounds; omitting it keeps
// exactly the old behaviour for that caller.
export function paintLightGlow(ctx, glowLights, lightPolyFor, tNow, bounds = null) {
  const F = FLICKER_STRENGTH;
  for (const { seed, x, y, brightR, dimR, color, dir, spread, flicker, alphaScale } of glowLights) {
    // Lights with flicker disabled render as steady glows — useful
    // for sun shafts, magical continual flame, daylight spell, etc.
    const flickerR = flicker
      ? 1
        + (Math.sin(tNow * 6.7  + seed)        * 0.05
        +  Math.sin(tNow * 3.1  + seed * 1.7)  * 0.035
        +  Math.sin(tNow * 11.3 + seed * 0.5)  * 0.02
        +  (Math.random() - 0.5)               * 0.008) * F
      : 1;
    // Brightness modulates a touch more than radius — the rim shimmer
    // comes from the radial gradient, but the perceived flame
    // intensity comes from the alpha at the centre.
    const flickerA = flicker
      ? 1
        + (Math.sin(tNow * 8.9  + seed * 2.3)  * 0.10
        +  Math.sin(tNow * 4.2  + seed)        * 0.05
        +  (Math.random() - 0.5)               * 0.02) * F
      : 1;

    const fBrightR = Math.max(0, brightR * flickerR);
    const fDimR    = Math.max(0, dimR    * flickerR);
    const outerR   = Math.max(fDimR, fBrightR);
    if (outerR <= 0) continue;
    // Defence-in-depth — even though the light list filters non-finite
    // entries, a future contributor could feed NaN through brightR/dimR
    // via a new code path. createRadialGradient throws "non-finite
    // double" the moment one slips in and that tears the whole canvas
    // down for every other light too, so skip the entry instead.
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(outerR)) continue;
    const [r, g, b] = hexToRgb(color);
    ctx.save();
    if (bounds && bounds.w > 0 && bounds.h > 0) {
      ctx.beginPath();
      ctx.rect(0, 0, bounds.w, bounds.h);
      ctx.clip();
    }
    clipToWedge(ctx, x, y, outerR, dir, spread);
    const lp = lightPolyFor(x, y);
    if (lp && lp.length >= 4) {
      ctx.beginPath();
      ctx.moveTo(lp[0], lp[1]);
      for (let i = 2; i < lp.length; i += 2) ctx.lineTo(lp[i], lp[i + 1]);
      ctx.closePath();
      ctx.clip();
    }
    const a = Math.max(0.5, Math.min(1.4, flickerA))
      * (Number.isFinite(alphaScale) ? alphaScale : 1);
    const grad = ctx.createRadialGradient(x, y, 0, x, y, outerR);
    grad.addColorStop(0,                       `rgba(${r}, ${g}, ${b}, ${(0.40 * a).toFixed(3)})`);
    grad.addColorStop(fBrightR / outerR * 0.6, `rgba(${r}, ${g}, ${b}, ${(0.24 * a).toFixed(3)})`);
    grad.addColorStop(fBrightR / outerR,       `rgba(${r}, ${g}, ${b}, ${(0.12 * a).toFixed(3)})`);
    grad.addColorStop(1,                       `rgba(${r}, ${g}, ${b}, 0.00)`);
    ctx.beginPath();
    ctx.arc(x, y, outerR, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.restore();
  }
}

// How much fog a vision pass has erased at (px,py) — 1 = fully revealed,
// 0 = untouched fog. Mirrors the fog canvas's destination-out passes so an
// overlay drawn ABOVE the fog can be dimmed to match its surroundings.
function passLitAlphaAt(px, py, vp) {
  let best = 0;
  for (const pass of (vp.passes || [])) {
    if (pass.kind === 'full') {
      best = Math.max(best, pass.alpha);
    } else if (pass.kind === 'range') {
      if (Math.hypot(px - pass.ox, py - pass.oy) <= pass.r) best = Math.max(best, pass.alpha);
    } else if (pass.kind === 'light') {
      if (Math.hypot(px - pass.lx, py - pass.ly) > pass.lr) continue;
      const spread = pass.lspread ?? 360;
      if (spread < 360) {
        const ang = Math.atan2(py - pass.ly, px - pass.lx);
        let d = ang - (pass.ldir ?? 0) * (Math.PI / 180);
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        if (Math.abs(d) > (spread / 2) * (Math.PI / 180)) continue;
      }
      if (pass.lightPts && pass.lightPts.length >= 6 && !pointInFlatPoly(px, py, pass.lightPts)) continue;
      best = Math.max(best, pass.alpha);
    }
  }
  return Math.min(1, best);
}

// How much of the view is cut on the far side of a see-through wall.
// A ledge lets only dim light past; a window merely obscures.
const LEDGE_DIM_ALPHA = 0.5;
const WINDOW_DIM_ALPHA = 0.28;
// How far sight carries past the glass before the view is fully fogged.
const WINDOW_SEE_THROUGH_FT = 10;
// Screen-space blur applied behind a window. Frosted, not opaque.
const WINDOW_BLUR_PX = 6;
// Fake refraction. Light reaching a window re-emits from the glass as a wide,
// softer fan on the far side, rather than only continuing in a straight line.
const WINDOW_SPILL_SPREAD_DEG = 150;
const WINDOW_SPILL_STRENGTH = 0.5;
// Every spill emitter costs a full visibility polygon, which is quadratic in
// occluder count (~3ms at 200 wall segments, ~12ms at 400). Emitting one per
// (light x window) pair meant a lantern-lined dockside scaled multiplicatively
// and spent most of a second raycasting on every wall/door/token-light change.
// One emitter per window per side is visually indistinguishable — the fan is
// wide and dim, and overlapping fans from neighbouring lamps just brightened
// the same patch of glass — but turns the cost linear in window count.
const WINDOW_SPILL_MAX = 24;
// Spill emitters snap to this grid so a lamp-carrying token drifting along a
// pane reuses one cached polygon instead of minting a fresh one per pixel.
const WINDOW_SPILL_SNAP_PX = 8;
// Each blurred window cone is its own compositor layer with a full backdrop
// snapshot behind it, so the cost is per layer regardless of cone size.
const WINDOW_BLUR_MAX_LAYERS = 6;
// Door brightness is sampled off the fog canvas, which forces a GPU->CPU
// readback and stalls the frame. Doors don't change brightness fast enough to
// need this often, and samples are staggered so they never land on one frame.
const DOOR_FOG_SAMPLE_MS = 400;
const LOS_CACHE_MAX = 768;
const WALL_DRAW_TOOLS = new Set(['wall-line', 'wall-rect', 'wall-polygon', 'wall-circle', 'wall-ledge', 'wall-window', 'wall-erase']);
const TEMPLATE_TOOLS = new Set(['tpl-cone', 'tpl-circle', 'tpl-line', 'tpl-square']);
const DOOR_DRAW_TOOLS = new Set(['door-std', 'door-heavy', 'door-port']);
const LIGHT_DRAW_TOOLS = new Set(['light']);
const DOOR_ERASE_TOOLS = new Set(['door-erase']);
const DARKNESS_DRAW_TOOLS = new Set(['magical-darkness', 'heavy-fog', 'darkness-polygon', 'fog-polygon', 'water-circle', 'water-polygon']);
const DARKNESS_POLY_TOOLS = new Set(['darkness-polygon', 'fog-polygon', 'water-polygon']);
const SPAWN_TOOLS = new Set(['spawn-point', 'spawn-named']);
// Tools that may pick a ship up. Everything else is a drawing/placing tool
// whose click belongs to the map underneath, hull or no hull.
const SHIP_DRAG_TOOLS = new Set(['pan', 'move']);

// Distance from point (px,py) to segment (ax,ay)-(bx,by)
function distToSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - ax, py - ay);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function findNearestWall(mapX, mapY, walls, threshold) {
  let nearest = null, minDist = threshold;
  for (const wall of walls) {
    let d = Infinity;
    if (wall.type === 'circle' && wall.points.length >= 3) {
      const [cx, cy, r] = wall.points;
      d = Math.abs(Math.hypot(mapX - cx, mapY - cy) - r);
    } else if ((wall.type === 'ledge' || wall.type === 'window') && wall.points.length >= 4) {
      const [ax, ay, bx, by] = wall.points;
      d = distToSeg(mapX, mapY, ax, ay, bx, by);
    } else {
      const segs = wallToSegments(wall);
      for (const seg of segs) d = Math.min(d, distToSeg(mapX, mapY, seg.ax, seg.ay, seg.bx, seg.by));
    }
    if (d < minDist) { minDist = d; nearest = { wall, dist: d }; }
  }
  return nearest;
}

function findNearestLight(mapX, mapY, lights, threshold) {
  let nearest = null, minDist = threshold;
  for (const light of lights) {
    const d = Math.hypot(mapX - light.x, mapY - light.y);
    if (d < minDist) { minDist = d; nearest = { light, dist: d }; }
  }
  return nearest;
}

function findNearestDarkness(mapX, mapY, darknesses, threshold) {
  // Primary: check if the click is inside any zone (handles circles and polygons correctly)
  for (const dz of darknesses) {
    if (pointInZone(mapX, mapY, dz)) return { darkness: dz, dist: 0 };
  }
  // Fallback: proximity to anchor point (catches circles the cursor just missed)
  let nearest = null, minDist = threshold;
  for (const dz of darknesses) {
    const d = Math.hypot(mapX - dz.x, mapY - dz.y);
    if (d < minDist) { minDist = d; nearest = { darkness: dz, dist: d }; }
  }
  return nearest;
}

function findNearestDoor(mapX, mapY, doors, threshold) {
  let nearest = null, minDist = threshold;
  for (const door of doors) {
    const pts = door.points;
    if (!pts || pts.length < 4) continue;
    const d = distToSeg(mapX, mapY, pts[0], pts[1], pts[2], pts[3]);
    if (d < minDist) { minDist = d; nearest = { door, dist: d }; }
  }
  return nearest;
}

// The portal under a map-space point. Pads are placed freely rather than on
// whole squares, so this is a distance test against the pad's centre — the
// nearest one within half a square, which is the area the ring covers.
function findPortalAt(mapX, mapY, portals, offsetX, offsetY, gridSize) {
  const col = (mapX - offsetX) / gridSize;
  const row = (mapY - offsetY) / gridSize;
  let best = null, bestD = Infinity;
  for (const p of portals) {
    const dc = Math.abs(col - (Number(p.grid_col) + 0.5));
    const dr = Math.abs(row - (Number(p.grid_row) + 0.5));
    if (dc > 0.5 || dr > 0.5) continue;
    const d = dc * dc + dr * dr;
    if (d < bestD) { bestD = d; best = p; }
  }
  return best;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// Ray-cast point-in-polygon test. pts is a flat [x1,y1,x2,y2,...] array.
function pointInPoly(x, y, pts) {
  const n = pts.length >> 1;
  let inside = false;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = pts[i * 2], yi = pts[i * 2 + 1];
    const xj = pts[j * 2], yj = pts[j * 2 + 1];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

// Containment check that supports both circle and polygon magical-darkness/fog zones.
function pointInZone(px, py, dz) {
  if (dz.shape === 'polygon' && Array.isArray(dz.poly_points) && dz.poly_points.length >= 6) {
    return pointInPoly(px, py, dz.poly_points);
  }
  return Math.hypot(px - dz.x, py - dz.y) <= dz.radius;
}

// Centroid of a zone (used for LOS origin of fog/darkness zones).
function zoneCentroid(dz) {
  if (dz.shape === 'polygon' && Array.isArray(dz.poly_points) && dz.poly_points.length >= 4) {
    const pts = dz.poly_points;
    const n = pts.length / 2;
    let sx = 0, sy = 0;
    for (let i = 0; i < pts.length; i += 2) { sx += pts[i]; sy += pts[i + 1]; }
    return { x: sx / n, y: sy / n };
  }
  return { x: dz.x, y: dz.y };
}

// Approximate bounding radius for a zone (used for truesight range checks).
function zoneEffectiveRadius(dz) {
  if (dz.shape === 'polygon' && Array.isArray(dz.poly_points) && dz.poly_points.length >= 4) {
    const pts = dz.poly_points;
    const n = pts.length / 2;
    let sx = 0, sy = 0;
    for (let i = 0; i < pts.length; i += 2) { sx += pts[i]; sy += pts[i + 1]; }
    const cx = sx / n, cy = sy / n;
    let maxR = 0;
    for (let i = 0; i < pts.length; i += 2) maxR = Math.max(maxR, Math.hypot(pts[i] - cx, pts[i + 1] - cy));
    return maxR;
  }
  return dz.radius || 0;
}

// Returns true if any visOrigin can see through invisibility (truesight always; blindsight within range)
// Which tokens the visibility solution actually depends on, as a string.
//
// Everything that raycasts — where you can see, where the light reaches — used to
// depend on the whole `tokens` array, so ANY token moving rebuilt all of it. A
// patrolling guard moves four times a second and usually neither sees nor carries
// a light, and the client was redoing the entire visibility solution four times a
// second to arrive at the same answer. That is what made patrols stutter: the
// animation was fine, the main thread was not.
//
// A token belongs in here if it SEES (the viewer's own token, or one the GM has
// granted vision through) or if it CARRIES A LIGHT — a lantern changes what
// everyone can see even when its bearer is blind.
export function visionSignature(tokens, { fogOfWar, isSpectator, playerTokenId, visionTokenIds }) {
  if (!fogOfWar || !tokens) return '';
  const ids = new Set((visionTokenIds || []).filter((id) => id != null));
  const parts = [];
  for (const t of tokens) {
    const sees = isSpectator
      ? ((t.is_player || t.familiar_of) && !t.is_hidden)
      : ((playerTokenId != null && t.id === playerTokenId) || ids.has(t.id));
    const lights = Number(t.token_light_bright) > 0 || Number(t.token_light_dim) > 0;
    if (!sees && !lights) continue;
    parts.push([
      t.id, t.grid_col, t.grid_row, t.vision_type, t.vision_range,
      t.token_light_bright, t.token_light_dim, t.token_light_color,
      Array.isArray(t.senses) ? JSON.stringify(t.senses) : '',
    ].join(':'));
  }
  return parts.join('|');
}

function canSeeInvisible(token, visOrigins, offsetX, offsetY, gridSize) {
  const sz = tokenFootprint(token);
  const cx = offsetX + Number(token.grid_col) * gridSize + (sz.gridW * gridSize) / 2;
  const cy = offsetY + Number(token.grid_row) * gridSize + (sz.gridH * gridSize) / 2;
  return visOrigins.some(origin => {
    if (origin.visionType === 'truesight' || origin.visionType === 'blindsight') {
      const d = Math.hypot(cx - origin.x, cy - origin.y);
      return origin.visionRangePx <= 0 || d <= origin.visionRangePx;
    }
    return false;
  });
}

// HP-bar fill colour by remaining-HP fraction. Thresholds:
//   ≥ 50%  → green   (#22c55e)
//   ≥ 25%  → orange  (#f59e0b)
//   > 0%   → red     (#ef4444)
//   dead   → black   (handled by caller — see Token render)
// Text colour that contrasts with `bgHex`. Uses standard luminance from sRGB
// — white for dark backgrounds, near-black for bright ones. Used to keep
// the HP text readable over both the bar fill and the dark track.
function contrastTextColor(bgHex) {
  const m = /^#([0-9a-f]{6})$/i.exec(bgHex || '');
  if (!m) return '#fff';
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 0xff, g = (n >> 8) & 0xff, b = n & 0xff;
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 150 ? '#0a0a0a' : '#ffffff';
}

function dist(a, b) {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
}


// The round clock — ONE for the table.
//
// Anchored on a single timestamp the server sets when the sequence starts, so
// every client derives the same round from it and nothing has to be broadcast
// each tick. Sits at the top of the map, in front of everybody, because the
// question it answers ("how long have I got") is one the whole table asks at
// once.
//
// This replaced a pill per token. Six invisible stopwatches could not be shown
// on screen, could not be planned around, and — since a per-token window only
// existed once that token had moved — usually meant there was nothing on screen
// at all.
const MOVE_ROUND_MS = 6000;

function roundStartAt(anchor, now) {
  if (!anchor) return null;
  const a = Number(anchor);
  if (!Number.isFinite(a)) return null;
  if (now < a) return a;
  return a + Math.floor((now - a) / MOVE_ROUND_MS) * MOVE_ROUND_MS;
}

// Which speed this token moves at.
//
// MIRRORED FROM speedOf() in backend/src/movement.js — the drag readout and the
// drag clamp both use this, and the server enforces its own copy, so the two
// have to agree or the number under the cursor is not the number being applied.
//
// `auto` reads the board: a token that is airborne AND has a fly speed flies,
// everything else walks. Airborne means the GM's flying flag OR any elevation,
// because a creature ten feet up is flying whether or not anyone ticked the
// box. A forced mode with no speed behind it falls back to walking rather than
// pinning the creature in place.
const SPEED_FIELD = {
  walk: 'creature_speed',
  fly: 'creature_speed_fly',
  swim: 'creature_speed_swim',
  climb: 'creature_speed_climb',
  burrow: 'creature_speed_burrow',
};

function speedForToken(token, mode) {
  const walk = Number(token?.creature_speed);
  const walkFt = Number.isFinite(walk) && walk > 0 ? walk : 30;
  const want = SPEED_FIELD[mode] ? mode : 'auto';

  if (want === 'auto') {
    const airborne = !!token?.is_flying || (Number(token?.elevation) || 0) > 0;
    const fly = Number(token?.creature_speed_fly) || 0;
    if (airborne && fly > 0) return { ft: fly, mode: 'fly' };
    return { ft: walkFt, mode: 'walk' };
  }
  const ft = Number(token?.[SPEED_FIELD[want]]) || 0;
  return ft > 0 ? { ft, mode: want } : { ft: walkFt, mode: 'walk' };
}

// What this token has left in the current round. Mirrors stateOf() in
// backend/src/movement.js.
function moveRemainingFt(token, anchor, now = Date.now()) {
  const budget = speedForToken(token, token?.move_mode || 'auto').ft;
  const start = roundStartAt(anchor, now);
  if (start == null) return { budget, remaining: budget, resetsAt: null };
  const spentAt = token?.move_window_at ? new Date(token.move_window_at).getTime() : 0;
  const spent = spentAt >= start ? (Number(token.move_spent) || 0) : 0;
  return { budget, remaining: Math.max(0, budget - spent), resetsAt: start + MOVE_ROUND_MS };
}

function SneakRoundBar({ anchor, tokens, viewerTokenId, isPlayer, topInset = 8 }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const h = setInterval(() => tick((n) => n + 1), 100);
    return () => clearInterval(h);
  }, []);

  const now = Date.now();
  const start = roundStartAt(anchor, now);
  if (start == null) return null;
  const msLeft = Math.max(0, start + MOVE_ROUND_MS - now);
  const frac = msLeft / MOVE_ROUND_MS;

  // What this viewer is entitled to see about their own legs. A player sees
  // their own token's; the GM sees whichever sneaking token is lowest, because
  // that is the one about to run out and stop the party.
  const sneaking = (tokens || []).filter((t) => t.sneaking && !t.is_dead);
  let mine = null;
  if (isPlayer && viewerTokenId != null) {
    mine = sneaking.find((t) => t.id === viewerTokenId) || null;
  } else if (sneaking.length) {
    mine = sneaking.reduce((lo, t) =>
      moveRemainingFt(t, anchor, now).remaining < moveRemainingFt(lo, anchor, now).remaining ? t : lo);
  }
  const left = mine ? Math.round(moveRemainingFt(mine, anchor, now).remaining) : null;
  const spent = left === 0;

  return (
    <div
      // Pushed clear of whatever chrome the host view keeps along the top —
      // the GM's toolbar sits dead centre, which is exactly where a clock
      // belongs, so the caller says how far down to start.
      style={{ position: 'absolute', top: topInset, left: '50%', transform: 'translateX(-50%)',
               zIndex: 32, pointerEvents: 'none', minWidth: 210 }}
      className="px-3 py-1.5 rounded-lg bg-gray-900/92 border border-gray-700 shadow-lg"
    >
      <div className="flex items-baseline justify-between gap-3 text-[11px] font-mono">
        <span className="uppercase tracking-wider text-gray-400">Sneaking</span>
        <span className={spent ? 'text-red-300 font-semibold' : 'text-gray-100 font-semibold'}>
          {left == null ? '—' : spent ? 'no movement left' : `${left} ft left`}
        </span>
        <span className="text-gray-300 tabular-nums">{(msLeft / 1000).toFixed(1)}s</span>
      </div>
      <div className="mt-1 h-1.5 rounded-full bg-black/60 overflow-hidden">
        <div
          className={spent ? 'h-full bg-red-500' : 'h-full bg-sky-400'}
          style={{ width: `${frac * 100}%`, transition: 'width 100ms linear' }}
        />
      </div>
    </div>
  );
}

function pxToFt(px, gridSize) {
  return Math.round((px / gridSize) * FEET_PER_SQUARE);
}

// ── Measurement overlay ───────────────────────────────────────────────────────

// Everything here is drawn in map space, so the stage transform shrinks it as
// the GM zooms out — on a wildspace map, fit-zoom is around 0.14 and a 13px
// label lands under 2 screen pixels. `k` counter-scales every screen-furniture
// size (chip, text, stroke weights, handles) by the inverse of the stage scale
// so the readout keeps a constant apparent size at any zoom. Distances that
// carry meaning in map space — the line itself, the cone, the radius, the
// per-square tick spacing — are deliberately left alone.
function MeasureOverlay({ meas, gridSize, tint, scale = 1, mapScale = DEFAULT_SCALE }) {
  if (!meas?.start || !meas?.end) return null;
  const { type, start, end } = meas;
  const d = dist(start, end);
  // The ruler reports in the MAP's units so it agrees with the scale key,
  // rather than insisting every map is measured in feet.
  const ft = formatCells(d / gridSize, mapScale);
  const k = 1 / Math.max(scale, 0.01);

  if (type === 'ruler') {
    if (d < 1) return null;
    const mx = (start.x + end.x) / 2;
    const my = (start.y + end.y) / 2;
    const STROKE = tint || 'rgba(255,220,50,0.9)';
    return (
      <>
        <Line points={[start.x, start.y, end.x, end.y]} stroke={STROKE} strokeWidth={2.5 * k} listening={false} />
        <Circle x={start.x} y={start.y} radius={5 * k} fill={STROKE} listening={false} />
        <Circle x={end.x} y={end.y} radius={5 * k} fill={STROKE} listening={false} />
        {Array.from({ length: Math.floor(d / gridSize) }, (_, i) => {
          const t = ((i + 1) * gridSize) / d;
          const tx = start.x + (end.x - start.x) * t;
          const ty = start.y + (end.y - start.y) * t;
          const ux = (end.x - start.x) / d, uy = (end.y - start.y) / d;
          const px = -uy * 7 * k, py = ux * 7 * k;
          return <Line key={i} points={[tx - px, ty - py, tx + px, ty + py]} stroke={STROKE} strokeWidth={1.5 * k} listening={false} />;
        })}
        <Rect x={mx - 38 * k} y={my - 14 * k} width={76 * k} height={22 * k} fill="rgba(0,0,0,0.7)" cornerRadius={4 * k} listening={false} />
        <Text x={mx - 38 * k} y={my - 10 * k} width={76 * k} align="center" text={ft} fill={STROKE} fontSize={13 * k} fontStyle="bold" listening={false} />
      </>
    );
  }

  if (type === 'cone') {
    if (d < 2) return null;
    const ux = (end.x - start.x) / d, uy = (end.y - start.y) / d;
    const px = -uy, py = ux;
    const halfW = d / 2;
    const v1x = end.x + px * halfW, v1y = end.y + py * halfW;
    const v2x = end.x - px * halfW, v2y = end.y - py * halfW;
    const lx = end.x + ux * 20 * k, ly = end.y + uy * 20 * k;
    const STROKE = tint || 'rgba(255,140,0,0.9)';
    const FILL = tint ? (tint + '38') : 'rgba(255,140,0,0.22)';
    return (
      <>
        <Line points={[start.x, start.y, v1x, v1y, v2x, v2y, start.x, start.y]}
          closed fill={FILL} stroke={STROKE} strokeWidth={2 * k} listening={false} />
        <Rect x={lx - 38 * k} y={ly - 11 * k} width={76 * k} height={22 * k} fill="rgba(0,0,0,0.7)" cornerRadius={4 * k} listening={false} />
        <Text x={lx - 38 * k} y={ly - 7 * k} width={76 * k} align="center" text={ft} fill={STROKE} fontSize={13 * k} fontStyle="bold" listening={false} />
      </>
    );
  }

  if (type === 'circle') {
    if (d < 2) return null;
    const STROKE = tint || 'rgba(100,180,255,0.9)';
    const FILL = tint ? (tint + '26') : 'rgba(100,180,255,0.15)';
    return (
      <>
        <Circle x={start.x} y={start.y} radius={d} fill={FILL} stroke={STROKE} strokeWidth={2 * k} listening={false} />
        <Line points={[start.x, start.y, end.x, end.y]} stroke={STROKE} strokeWidth={1.5 * k} dash={[6 * k, 4 * k]} listening={false} />
        <Circle x={start.x} y={start.y} radius={4 * k} fill={STROKE} listening={false} />
        <Rect x={start.x - 52 * k} y={start.y - 14 * k} width={104 * k} height={22 * k} fill="rgba(0,0,0,0.7)" cornerRadius={4 * k} listening={false} />
        <Text x={start.x - 52 * k} y={start.y - 10 * k} width={104 * k} align="center" text={`r = ${ft}`} fill={STROKE} fontSize={13 * k} fontStyle="bold" listening={false} />
      </>
    );
  }

  return null;
}

// ── Token ─────────────────────────────────────────────────────────────────────

const CONDITIONS = {
  blinded:      { color: '#9ca3af' },
  charmed:      { color: '#f9a8d4' },
  deafened:     { color: '#6b7280' },
  exhaustion:   { color: '#dc2626' },
  frightened:   { color: '#7c3aed' },
  grappled:     { color: '#d97706' },
  incapacitated:{ color: '#f97316' },
  invisible:    { color: '#e5e7eb' },
  paralyzed:    { color: '#60a5fa' },
  petrified:    { color: '#a3a3a3' },
  poisoned:     { color: '#4ade80' },
  prone:        { color: '#92400e' },
  restrained:   { color: '#ea580c' },
  stunned:      { color: '#2dd4bf' },
  unconscious:  { color: '#374151' },
  submerged:    { color: '#06b6d4' },
};

// `prone` turns the art on its side — the standard VTT reading of a creature
// that has gone down, and the one cue that survives being scaled to a 32px
// token on a phone. The condition ring says WHICH condition; the orientation
// is what makes it legible at a glance without counting ring colours.
//
// Drawn with its width and height SWAPPED before rotating. A quarter turn
// about the centre maps a W×H box to an H×W one, so passing the footprint
// through unchanged would make any non-square token (a 2×1 mount, a 1×2
// serpent) stick out past its own square once it went down. Swapping first
// means the rotated bounding box lands back on exactly the footprint it had.
const TokenArt = React.memo(function TokenArt({ src, w, h, x, y, prone = false }) {
  const [img] = useImage(src, 'anonymous');
  if (!img) return <Circle x={x + w / 2} y={y + h / 2} radius={w / 2} fill="#6366f1" listening={false} />;
  // Rotation is about the centre, so the node is positioned there and its
  // origin offset to match, rather than at the top-left corner.
  const dw = prone ? h : w;
  const dh = prone ? w : h;
  return (
    <KonvaImage
      image={img}
      x={x + w / 2}
      y={y + h / 2}
      width={dw}
      height={dh}
      offsetX={dw / 2}
      offsetY={dh / 2}
      rotation={prone ? 90 : 0}
      // Half the SHORT side, so the crop stays a circle (or a stadium on an
      // oblong token) instead of turning into a lozenge when the sides swap.
      cornerRadius={Math.min(dw, dh) / 2}
      listening={false}
    />
  );
});

// Token is purely visual — all interaction handled at the DOM level in MapStage.
// offset: { x, y } is the grid origin in map-space (so token at col,row renders
// at map position offset + col*gridSize, offset + row*gridSize).
// dragVisPos, when set, is already in map-space (includes the offset).
//
// Wrapped in React.memo with a field-level equality below so a parent re-render
// (which happens on every socket event in this app) doesn't redraw 30+ tokens
// when only one moved. Hot path on crowded maps.
function TokenInner({ token, gridSize, offset, isPlayer, isSelected, isCurrentTurn = false, dragVisPos, carryPos = null, playerTokenId, showLabel = true, overrideOpacity = null, tokenNameFontSize = 45 }) {
  const sz = tokenFootprint(token);
  const tW = sz.gridW * gridSize;
  const tH = sz.gridH * gridSize;
  const iW = tW * sz.scale;
  const iH = tH * sz.scale;
  const iOff = (tW - iW) / 2;
  const conditions = Array.isArray(token.conditions) ? token.conditions : [];
  // Down on the floor — the prone condition, zero HP, or dead. Drives the
  // art's orientation below; the dashed ring the condition already draws
  // stays as the colour cue when it is the condition doing it.
  const isProne = isTokenDown(token);
  const tempHp = token.temp_hp || 0;
  const isOwnToken = playerTokenId != null && token.id === playerTokenId;

  const imgUrl = token.image_path
    ? `/uploads/${token.image_path}`
    : token.creature_image
    ? `/uploads/${token.creature_image}`
    : token.is_player
    ? '/uploads/creatures/default_player.png'
    : null;

  const hpPct = token.max_hp > 0 ? Math.max(0, token.current_hp / token.max_hp) : 0;
  const isDead = token.is_dead;
  // The caller resolves `tokenNameFontSize` against the grid (see
  // effectiveNameFont), which keeps a label the same size relative to a SQUARE
  // on any map — but every token then got that one size regardless of how many
  // squares it covers. A gargantuan's card stretched to `tW` while its name and
  // bar stayed medium-sized: a wide, near-empty plate under the biggest token
  // on the map, and a proportionally oversized one under a tiny.
  //
  // So scale by the token's DRAWN width — footprint × art inset — relative to a
  // medium's, since that is the token the slider is calibrated against. A 4×4
  // gargantuan draws ~4.3× wider than a medium and now names itself ~4.3×
  // bigger; large is ~2.2×, tiny ~0.5×.
  //
  // Deliberately no clamp: a floor or ceiling in screen pixels is the bug the
  // grid-relative sizing above was written to kill (text staying put while the
  // token grows under it on zoom). Everything below — bar height, HP digits,
  // card height, wrap width — derives from `fontSize`, so they all follow.
  const labelScale = (sz.gridW * sz.scale) / TOKEN_SIZES.medium.scale;
  const fontSize = tokenNameFontSize * labelScale;
  // HP digits sit a little under the bar's interior height so they get vertical
  // breathing room — Konva's verticalAlign 'middle' uses the full font box
  // (ascender + descender) for centring, which shoves the cap-height portion
  // toward the top edge when text height equals bar height. Expressed as a
  // fraction of the bar rather than a pixel subtraction so it holds at every
  // token size.
  const hpFontSize = iW * HP_BAR_TOKEN_FRACTION * HP_TEXT_RATIO;

  // Position derived purely from props — no internal state to cause stale snaps
  // `carryPos` is the same kind of override as dragVisPos — map-space, already
  // offset — but it means "something is carrying this token" (a ship turning
  // under it) rather than "someone has hold of it", so it moves the token
  // without the drag chrome below.
  const posOverride = dragVisPos || carryPos;
  // Where the token is TOLD to be.
  const targetX = offset.x + Number(token.grid_col) * gridSize;
  const targetY = offset.y + Number(token.grid_row) * gridSize;

  // Position comes straight from the token, with no interpolation here.
  //
  // Three attempts at client-side smoothing were removed from this spot, and each
  // failed differently: a tween fighting react-konva's own x/y props (which
  // produced backward jumps), the same with a layout-effect re-assert (which
  // narrowed the race without closing it), and a Konva tween owning the position
  // outright (which froze the node and then snapped two squares at a time).
  //
  // The lesson was that this is the wrong layer for it. The server's step stream
  // is metronomic — measured on the live board at 0.125 squares every 250ms, no
  // jitter — so smoothness is better bought by making the steps SMALL than by
  // animating between big ones in a component that re-renders for a dozen other
  // reasons. See patrols.js: the tick is now short enough that each step is a
  // fraction of a square and the motion reads as continuous on its own.
  const x = posOverride ? posOverride.x : targetX;
  const y = posOverride ? posOverride.y : targetY;


  // Hidden tokens are filtered out entirely before they reach a player or the
  // TV view, so this only ever renders for the GM — but gate on isPlayer
  // anyway so a future caller can't leak the marker to the table.
  const elevationFt = Number(token.elevation) || 0;
  const liftPx = elevationLiftPx(elevationFt, gridSize);

  const isHiddenFromPlayers = !isPlayer && !!token.is_hidden;

  const groupOpacity = overrideOpacity !== null
    ? overrideOpacity
    : isDead ? 0.5
    : isHiddenFromPlayers ? 0.55
    : 1;

  // Subtle breathing pulse when this token's turn is up — scales the whole
  // token (image + outline + conditions) around its centre by ±4% at a slow
  // sine. Only one token typically pulses at once so the per-frame React
  // updates are negligible.
  const [pulseScale, setPulseScale] = useState(1);
  useEffect(() => {
    if (!isCurrentTurn) { setPulseScale(1); return; }
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const t = (now - start) / 1000;
      // ω ≈ 2.4 rad/s → ~2.6s per breath cycle, ±4% scale.
      setPulseScale(1 + 0.04 * Math.sin(t * 2.4));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isCurrentTurn]);

  // Inner Group does the scaling — outer Group stays at the unscaled (x,y)
  // grid position so layout/coordinates downstream don't shift.
  const innerProps = isCurrentTurn
    ? {
        x: tW / 2, y: tH / 2,
        offsetX: tW / 2, offsetY: tH / 2,
        scaleX: pulseScale, scaleY: pulseScale,
      }
    : {};

  return (
    <Group x={x} y={y} opacity={groupOpacity} listening={false}>
      {/* ── Height ────────────────────────────────────────────────────────────
          A token above the ground is drawn RAISED, with its shadow left on the
          square it actually occupies and a leader line between the two. The
          shadow is the truth for range and movement — the token art is just
          lifted so the table can see it's airborne and by how much.
          Pixels-per-foot comes off the grid, so this reads correctly at any
          zoom or grid size. Capped so a creature at 500 ft doesn't fly off the
          top of the screen. */}
      {liftPx > 0 && (
        <>
          <Ellipse
            x={tW / 2}
            y={tH / 2}
            radiusX={iW * 0.34}
            radiusY={iW * 0.17}
            fill="rgba(0,0,0,0.45)"
            listening={false}
          />
          <Line
            points={[tW / 2, tH / 2, tW / 2, tH / 2 - liftPx]}
            stroke="rgba(148,197,255,0.75)"
            strokeWidth={Math.max(1, gridSize * 0.03)}
            dash={[gridSize * 0.12, gridSize * 0.1]}
            listening={false}
          />
        </>
      )}
      <Group y={-liftPx} listening={false}>
      <Group {...innerProps} listening={false}>
      {isCurrentTurn && (
        <Rect width={tW} height={tH} stroke="#22d3ee" strokeWidth={3}
          fill="rgba(34,211,238,0.08)" cornerRadius={4} listening={false} />
      )}
      {isSelected && (
        <Rect width={tW} height={tH} stroke="#fbbf24" strokeWidth={3}
          fill="rgba(251,191,36,0.08)" cornerRadius={4} dash={[6, 3]} listening={false} />
      )}
      {/* Familiar marker — a bound token belongs to a player even though it
          isn't a player token, so it reads differently from both a PC and a
          monster at a glance. */}
      {!!token.familiar_of && !isSelected && (
        <Rect width={tW} height={tH} stroke="#a78bfa" strokeWidth={2}
          cornerRadius={4} dash={[3, 3]} listening={false} />
      )}
      {dragVisPos && (
        <Rect width={tW} height={tH} stroke="white" strokeWidth={2}
          fill="rgba(255,255,255,0.05)" cornerRadius={4} listening={false} />
      )}
      {imgUrl
        ? <TokenArt src={imgUrl} w={iW} h={iH} x={iOff} y={iOff} prone={isProne} />
        : <Circle x={tW / 2} y={tH / 2} radius={iW / 2} fill={isDead ? '#4b5563' : '#6366f1'}
            listening={false} />
      }
      {isDead && <>
        <Line points={[iOff, iOff, iOff + iW, iOff + iH]} stroke="red" strokeWidth={3} listening={false} />
        <Line points={[iOff + iW, iOff, iOff, iOff + iH]} stroke="red" strokeWidth={3} listening={false} />
      </>}
      {/* ── Hidden-from-players marker ─────────────────────────────────────
          Violet is unused elsewhere on a token: selection is gold, the active
          turn is cyan, drag is white, conditions are their own palette. The
          dimming alone is ambiguous (dead tokens dim too), so the ring and the
          crossed-out eye are what actually carry the meaning. Inset by 2px so
          it reads as a separate ring when a hidden token is also selected. */}
      {isHiddenFromPlayers && (() => {
        // Badge scales with the token so a Gargantuan doesn't get a pinprick
        // and a Tiny doesn't get a dinner plate.
        const r  = Math.max(5, Math.min(tW, tH) * 0.15);
        const cx = r + 1;
        const cy = r + 1;
        const eyeR = r * 0.52;
        return (
          <>
            <Rect
              x={2} y={2} width={tW - 4} height={tH - 4}
              stroke="#a78bfa" strokeWidth={2}
              fill="rgba(139,92,246,0.14)"
              cornerRadius={4} dash={[4, 3]}
              listening={false}
            />
            <Circle x={cx} y={cy} radius={r} fill="rgba(17,10,32,0.92)"
              stroke="#a78bfa" strokeWidth={1} listening={false} />
            <Circle x={cx} y={cy} radius={eyeR} stroke="#ddd6fe" strokeWidth={1.2}
              fill="transparent" listening={false} />
            <Circle x={cx} y={cy} radius={eyeR * 0.38} fill="#ddd6fe" listening={false} />
            <Line
              points={[cx - r * 0.62, cy + r * 0.62, cx + r * 0.62, cy - r * 0.62]}
              stroke="#ddd6fe" strokeWidth={1.6} lineCap="round" listening={false}
            />
          </>
        );
      })()}
      {conditions.map((cond, i) => {
        const c = CONDITIONS[cond];
        if (!c) return null;
        const r = Math.max(tW, tH) / 2 + 4 + i * 5;
        return (
          <Circle
            key={cond}
            x={tW / 2}
            y={tH / 2}
            radius={r}
            stroke={c.color}
            strokeWidth={2.5}
            fill="transparent"
            dash={[5, 3]}
            listening={false}
          />
        );
      })}
      {/* Marked by another creature (Hunter's Mark, Hex, Vow of Enmity) and
          exhaustion level — both belong on the token itself, since they're
          about this creature rather than about the party's view of it. */}
      {!!token.marked_by && (
        <Group listening={false}>
          <Circle x={tW - 6} y={6} radius={Math.max(7, tW * 0.12)} fill="#7f1d1d" stroke="#fca5a5" strokeWidth={1.5} listening={false} />
          <Text
            text="✦"
            x={tW - 6 - Math.max(7, tW * 0.12)} y={6 - Math.max(7, tW * 0.12) / 1.4}
            width={Math.max(14, tW * 0.24)} align="center"
            fill="#fecaca" fontSize={Math.max(10, tW * 0.2)} listening={false}
          />
        </Group>
      )}
      {Number(token.exhaustion) > 0 && (
        <Group listening={false}>
          <Rect x={2} y={2} width={Math.max(18, tW * 0.3)} height={Math.max(12, tH * 0.2)}
            fill="rgba(120,20,20,0.9)" cornerRadius={3} listening={false} />
          <Text
            text={`E${token.exhaustion}`}
            x={2} y={3} width={Math.max(18, tW * 0.3)} align="center"
            fill="#fecaca" fontSize={Math.max(9, tH * 0.15)} fontStyle="bold" listening={false}
          />
        </Group>
      )}

      {/* ── Label card ──────────────────────────────────────────────────────── */}
      {showLabel && (() => {
        // Per-token label suppression, players only. The GM's own view is never
        // suppressed.
        //
        // Combat does NOT override this. It used to — the theory being that a
        // token in the initiative order is being looked at anyway — but that
        // made the GM's hide toggles do nothing during the exact scene they
        // exist for: an unidentified horror the party is fighting, or a boss
        // whose remaining HP shouldn't be a readout mid-fight. A GM who wants
        // the name shown can untick it.
        // Who may read what is decided in one place, shared with the 3D
        // view's hover card — see tokenLabelInfo. Only the drawing is local.
        const label = tokenLabelInfo(token, { isPlayer });
        const showNamePart = label.showName;
        const showHpPart   = label.showHp;
        if (!showNamePart && !showHpPart) return null;
        // Height is public: everyone can see the dragon is up there, and
        // arguing about how high wastes more time than hiding it saves.
        const heightLabel = elevationFt !== 0
          ? `${elevationFt > 0 ? '\u2191' : '\u2193'}${Math.abs(elevationFt)} ft`
          : '';

        // HP text is rendered INSIDE the bar. When dead it reads "Dead"
        // regardless of whether GM/player visibility would otherwise hide the
        // numbers — death is public information.
        const hpText = label.hpText;

        // The height rides on the name so it inherits the card's sizing and
        // its player-visibility rules, instead of needing its own plate.
        const baseName = token.nickname || token.name;
        const displayName = heightLabel ? `${baseName}  ${heightLabel}` : baseName;
        // With the name hidden the card no longer has to fit the text, so it
        // shrinks back to the token's own width rather than leaving a gap
        // where the name used to be.
        const estTextW = showNamePart ? displayName.length * fontSize * 0.62 : 0;
        const cardW    = Math.max(tW + 4, estTextW + 14);
        const cardX    = (tW - cardW) / 2;
        const cardY    = tH + 5;
        const bPad     = 6;
        const bW       = cardW - bPad * 2;
        const nameH    = fontSize + 2;
        // The bar sits under the name when there is one, and at the top of
        // the card when there isn't.
        const barOff   = showNamePart ? nameH + 5 : 4;
        const barH     = iW * HP_BAR_TOKEN_FRACTION;
        const cardH    = showHpPart ? barOff + barH + 5 : nameH + 8;
        // Filled-portion colour (green/orange/red) and the matching text
        // colour for letters that fall over it. Empty track (#1e293b) and
        // dead-bar (#000) are dark, so their text stays white.
        const fillHex     = hpColor(token.current_hp, token.max_hp);
        const filledTextC = isDead ? '#fff' : contrastTextColor(fillHex);
        const trackTextC  = '#fff';
        const fillW       = isDead ? bW : bW * hpPct;
        const barX        = cardX + bPad;
        const barY        = cardY + barOff;

        return (
          <>
            {/* Card background */}
            <Rect
              x={cardX} y={cardY}
              width={cardW} height={cardH}
              fill="rgba(8,10,18,0.86)"
              stroke="rgba(255,255,255,0.10)"
              strokeWidth={0.75}
              cornerRadius={5}
              listening={false}
            />
            {/* Name */}
            {showNamePart && (
              <Text
                text={displayName}
                x={cardX + 3} y={cardY + 4}
                width={cardW - 6}
                align="center"
                fill="white"
                fontSize={fontSize}
                fontStyle="bold"
                wrap="word"
                listening={false}
              />
            )}
            {/* HP bar track. When dead this is the full black bar — no
                green/orange/red fill is layered on top. */}
            {showHpPart && (
              <Rect
                x={barX} y={barY}
                width={bW} height={barH}
                fill={isDead ? '#000' : '#1e293b'}
                cornerRadius={2}
                listening={false}
              />
            )}
            {/* HP bar fill — only when alive. */}
            {showHpPart && !isDead && fillW > 0 && (
              <Rect
                x={barX} y={barY}
                width={fillW} height={barH}
                fill={fillHex}
                cornerRadius={2}
                listening={false}
              />
            )}
            {/* Temp HP extension — only when alive and there's empty space. */}
            {showHpPart && !isDead && tempHp > 0 && (
              <Rect
                x={barX + fillW}
                y={barY}
                width={Math.min(bW - fillW, (tempHp / Math.max(1, token.max_hp)) * bW)}
                height={barH}
                fill="#22d3ee"
                cornerRadius={[0, 2, 2, 0]}
                listening={false}
              />
            )}
            {/* HP text inside the bar. To keep contrast across the
                fill/track boundary we render the text twice — once
                clipped to the filled portion (with a colour that
                contrasts against the fill) and once clipped to the empty
                portion (always white over the dark track). When the
                boundary crosses a glyph, each half picks up the right
                colour automatically. */}
            {showHpPart && hpText && (() => {
              // Bar is ~4px taller than the text (see barH + hpFontSize
              // above), so verticalAlign:'middle' has enough slack to
              // visually centre regardless of how Konva measures the
              // font box.
              const tProps = {
                text: hpText,
                x: barX, y: barY,
                width: bW, height: barH,
                align: 'center',
                verticalAlign: 'middle',
                fontSize: hpFontSize,
                fontStyle: 'bold',
                listening: false,
              };
              if (isDead) {
                // Solid black bar — single render, white text.
                return <Text {...tProps} fill={trackTextC} />;
              }
              return (
                <>
                  <Group
                    clipX={barX} clipY={barY}
                    clipWidth={fillW} clipHeight={barH}
                    listening={false}
                  >
                    <Text {...tProps} fill={filledTextC} />
                  </Group>
                  <Group
                    clipX={barX + fillW} clipY={barY}
                    clipWidth={Math.max(0, bW - fillW)} clipHeight={barH}
                    listening={false}
                  >
                    <Text {...tProps} fill={trackTextC} />
                  </Group>
                </>
              );
            })()}
          </>
        );
      })()}
      </Group>
      </Group>
    </Group>
  );
}

// React.memo wrapper for Token. The default shallow compare wouldn't
// help — the `token` prop is a fresh object on every parent render
// (sortByZBump returns a new array, etc.), so we'd skip nothing. The
// custom comparator below short-circuits when nothing the renderer
// actually reads has changed: scalar tokenInner props + the specific
// fields TokenInner pulls off `token`. Saves the dominant render
// cost on crowded maps where one token moves and the parent
// re-renders 30+ untouched tokens for free.
function tokenPropsEqual(a, b) {
  if (a.gridSize !== b.gridSize) return false;
  if (a.offset.x !== b.offset.x || a.offset.y !== b.offset.y) return false;
  if (a.isPlayer !== b.isPlayer) return false;
  if (a.isSelected !== b.isSelected) return false;
  if (a.isCurrentTurn !== b.isCurrentTurn) return false;
  if (a.playerTokenId !== b.playerTokenId) return false;
  if (a.showLabel !== b.showLabel) return false;
  if (a.overrideOpacity !== b.overrideOpacity) return false;
  if (a.tokenNameFontSize !== b.tokenNameFontSize) return false;
  // dragVisPos: ref equality on the position object is enough — the
  // parent rebuilds the map every drag tick so changed positions
  // come through with a fresh reference.
  if (a.dragVisPos !== b.dragVisPos) return false;
  // Same reasoning for the carry override: a fresh Map of fresh points is
  // built each frame a ship moves or turns under its crew.
  if (a.carryPos !== b.carryPos) return false;
  // Token shape — compare just the fields TokenInner reads.
  const x = a.token, y = b.token;
  if (x === y) return true;
  if (x.id !== y.id) return false;
  if (x.size !== y.size) return false;
  // The `size_squares` override is half of tokenFootprint's answer, so a
  // resized gargantuan changes its drawn extent — and now its label size —
  // without `size` ever changing. Missing here, the token kept its old
  // footprint until some unrelated field happened to repaint it.
  if (x.size_squares !== y.size_squares) return false;
  if (x.grid_col !== y.grid_col || x.grid_row !== y.grid_row) return false;
  if (x.image_path !== y.image_path) return false;
  if (x.creature_image !== y.creature_image) return false;
  if (x.is_player !== y.is_player) return false;
  if (x.familiar_of !== y.familiar_of) return false;
  if (x.is_dead !== y.is_dead) return false;
  // Label suppression + the combat flag that overrides it. Without these a
  // toggle from the context menu wouldn't repaint until something else moved.
  if (x.marked_by !== y.marked_by) return false;
  if (x.exhaustion !== y.exhaustion) return false;
  if (x.auras !== y.auras) return false;
  if (x.hide_name_from_players !== y.hide_name_from_players) return false;
  if (x.hide_hp_from_players !== y.hide_hp_from_players) return false;
  if (x.in_combat !== y.in_combat) return false;
  // Drives the GM's hidden-from-players marker. Without it, toggling hide
  // repaints nothing until some unrelated prop happens to change.
  if (x.is_hidden !== y.is_hidden) return false;
  if (x.current_hp !== y.current_hp || x.max_hp !== y.max_hp) return false;
  if (x.temp_hp !== y.temp_hp) return false;
  if (x.name !== y.name) return false;
  if (x.nickname !== y.nickname) return false;
  // conditions array — different reference is fine; compare length + items.
  const xc = x.conditions || [], yc = y.conditions || [];
  if (xc.length !== yc.length) return false;
  for (let i = 0; i < xc.length; i++) if (xc[i] !== yc[i]) return false;
  return true;
}
const Token = React.memo(TokenInner, tokenPropsEqual);

// ── Wall shapes ───────────────────────────────────────────────────────────────

const WALL_STROKE = 'rgba(255,110,30,0.92)';
const WALL_FILL   = 'rgba(255,110,30,0.08)';
const WALL_SW     = 2.5;
// Pale glass blue — reads as see-through against the orange of solid walls.
const WINDOW_STROKE = 'rgba(125,200,255,0.95)';

// Mirrors isTerrainHidden on the server. Markers hide on a plain toggle;
// scenery keeps the hidden-until-revealed rule. Players never receive a hidden
// piece at all, so this only ever decides whether the GM sees it ghosted.
function terrainHidden(t) {
  return t.is_marker ? !t.is_revealed : !!(t.hide_until_revealed && !t.is_revealed);
}

function WallShape({ wall }) {
  const pts = wall.points;
  if (!pts || pts.length < 2) return null;

  if (wall.type === 'line') {
    return pts.length >= 4
      ? <Line points={pts} stroke={WALL_STROKE} strokeWidth={WALL_SW} lineCap="round" listening={false} />
      : null;
  }
  if (wall.type === 'rect') {
    if (pts.length < 4) return null;
    const x = Math.min(pts[0], pts[2]), y = Math.min(pts[1], pts[3]);
    const w = Math.abs(pts[2] - pts[0]),  h = Math.abs(pts[3] - pts[1]);
    return <Rect x={x} y={y} width={w} height={h} stroke={WALL_STROKE} strokeWidth={WALL_SW} fill={WALL_FILL} listening={false} />;
  }
  if (wall.type === 'polygon') {
    return pts.length >= 4
      ? <Line points={pts} closed stroke={WALL_STROKE} strokeWidth={WALL_SW} fill={WALL_FILL} lineCap="round" lineJoin="round" listening={false} />
      : null;
  }
  if (wall.type === 'circle') {
    return pts.length >= 3
      ? <Circle x={pts[0]} y={pts[1]} radius={pts[2]} stroke={WALL_STROKE} strokeWidth={WALL_SW} fill={WALL_FILL} listening={false} />
      : null;
  }
  // Window — pale glass line. No direction marker, unlike a ledge: a window
  // obscures both ways, so there's no "above" side to point at.
  if (wall.type === 'window') {
    if (pts.length < 4) return null;
    return (
      <>
        <Line points={pts} stroke={WINDOW_STROKE} strokeWidth={WALL_SW} lineCap="round" listening={false} />
        <Line points={pts} stroke="rgba(255,255,255,0.55)" strokeWidth={Math.max(1, WALL_SW / 3)}
          dash={[5, 4]} lineCap="round" listening={false} />
      </>
    );
  }
  if (wall.type === 'ledge') {
    if (pts.length < 4) return null;
    const [ax, ay, bx, by] = pts;
    // Perpendicular arrow pointing to the "above" (unimpeded) side = LEFT of A→B
    // (canvas y-down → above-pointing normal is (dy_unit, -dx_unit)).
    const dx = bx - ax, dy = by - ay;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len, uy = dy / len;
    const nx = uy, ny = -ux; // above-side normal
    const mx = (ax + bx) / 2, my = (ay + by) / 2;
    const arrowLen = 18;
    const tx = mx + nx * arrowLen, ty = my + ny * arrowLen;
    const LEDGE_STROKE = 'rgba(180,120,60,0.95)';
    return (
      <>
        <Line points={pts} stroke={LEDGE_STROKE} strokeWidth={WALL_SW} dash={[6, 3]} lineCap="round" listening={false} />
        <Line points={[mx, my, tx, ty]} stroke={LEDGE_STROKE} strokeWidth={1.5} lineCap="round" listening={false} />
        <Circle x={tx} y={ty} radius={3} fill={LEDGE_STROKE} listening={false} />
      </>
    );
  }
  return null;
}

const PREV_STROKE = 'rgba(255,210,50,0.95)';
const PREV_FILL   = 'rgba(255,210,50,0.06)';

function WallPreview({ preview }) {
  if (!preview) return null;
  const pts = preview.points;
  if (!pts || pts.length < 2) return null;

  if (preview.type === 'line') {
    return pts.length >= 4
      ? <Line points={pts} stroke={PREV_STROKE} strokeWidth={2} dash={[8, 4]} lineCap="round" listening={false} />
      : null;
  }
  if (preview.type === 'rect') {
    if (pts.length < 4) return null;
    const x = Math.min(pts[0], pts[2]), y = Math.min(pts[1], pts[3]);
    const w = Math.abs(pts[2] - pts[0]),  h = Math.abs(pts[3] - pts[1]);
    return <Rect x={x} y={y} width={w} height={h} stroke={PREV_STROKE} strokeWidth={2} dash={[8, 4]} fill={PREV_FILL} listening={false} />;
  }
  if (preview.type === 'polygon') {
    const n = Math.floor(pts.length / 2);
    return (
      <>
        {pts.length >= 4 && <Line points={pts} stroke={PREV_STROKE} strokeWidth={2} lineCap="round" lineJoin="round" listening={false} />}
        {Array.from({ length: n }, (_, i) => (
          <Circle key={i} x={pts[i * 2]} y={pts[i * 2 + 1]} radius={4} fill={PREV_STROKE} listening={false} />
        ))}
        {preview.cursorX !== undefined && pts.length >= 2 && (
          <Line points={[pts[pts.length - 2], pts[pts.length - 1], preview.cursorX, preview.cursorY]}
            stroke={PREV_STROKE} strokeWidth={2} dash={[6, 4]} lineCap="round" listening={false} />
        )}
        {n >= 3 && (
          <Line points={[pts[pts.length - 2], pts[pts.length - 1], pts[0], pts[1]]}
            stroke="rgba(255,210,50,0.25)" strokeWidth={1} dash={[4, 4]} listening={false} />
        )}
      </>
    );
  }
  if (preview.type === 'circle') {
    const r = pts.length >= 4 ? Math.hypot(pts[2] - pts[0], pts[3] - pts[1]) : 0;
    return (
      <>
        <Circle x={pts[0]} y={pts[1]} radius={Math.max(4, r)} stroke={PREV_STROKE} strokeWidth={2} dash={[8, 4]} fill={PREV_FILL} listening={false} />
        {r > 0 && <Line points={[pts[0], pts[1], pts[0] + r, pts[1]]} stroke={PREV_STROKE} strokeWidth={1} dash={[4, 4]} listening={false} />}
        <Circle x={pts[0]} y={pts[1]} radius={4} fill={PREV_STROKE} listening={false} />
      </>
    );
  }
  if (preview.type === 'window') {
    if (pts.length < 4) return null;
    return <Line points={pts} stroke={WINDOW_STROKE} strokeWidth={WALL_SW} dash={[5, 4]} lineCap="round" listening={false} />;
  }
  if (preview.type === 'ledge') {
    if (pts.length < 4) return null;
    const [ax, ay, bx, by] = pts;
    const dx = bx - ax, dy = by - ay;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len, uy = dy / len;
    const nx = uy, ny = -ux;
    const mx = (ax + bx) / 2, my = (ay + by) / 2;
    const tx = mx + nx * 18, ty = my + ny * 18;
    return (
      <>
        <Line points={pts} stroke={PREV_STROKE} strokeWidth={2} dash={[6, 3]} lineCap="round" listening={false} />
        <Line points={[mx, my, tx, ty]} stroke={PREV_STROKE} strokeWidth={1.5} lineCap="round" listening={false} />
      </>
    );
  }
  return null;
}

// ── Door shapes ───────────────────────────────────────────────────────────────

// Approximate an arc as a flat point array for Konva Line
function arcPts(cx, cy, r, a0, a1, n = 20) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + (a1 - a0) * (i / n);
    pts.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  return pts;
}

const DOOR_COLORS = {
  standard:  { closed: '#a16207', open: '#16a34a' },
  heavy:     { closed: '#475569', open: '#16a34a' },
  portcullis:{ closed: '#6b7280', open: '#16a34a' },
};

function DoorShape({ door, spriteImg = null, progress = null, isPlayer = false }) {
  const pts = door.points;
  if (!pts || pts.length < 4) return null;

  const [x1, y1, x2, y2] = pts;
  const len = Math.hypot(x2 - x1, y2 - y1);
  if (len < 2) return null;

  const ux = (x2 - x1) / len, uy = (y2 - y1) / len;
  const dir = door.open_dir === -1 ? -1 : 1;
  const px = -uy * dir, py = ux * dir; // perpendicular (swing direction)

  // ── Windows ──────────────────────────────────────────────────────────────
  //
  // A window is not a door in a different colour: it has no hinge, no swing and
  // no open state, so none of the machinery below applies to it. Drawn as
  // glazing set in the wall — a pale bar with mullions across it — which reads
  // as something you see through rather than something you go through.
  if (door.portal_kind === 'window') {
    const ux2 = (x2 - x1) / len, uy2 = (y2 - y1) / len;
    const nx2 = -uy2, ny2 = ux2;
    const t = Math.max(2, len * 0.18);          // glazing thickness
    const ang = (Math.atan2(uy2, ux2) * 180) / Math.PI;
    return (
      <Group>
        {/* The reveal: the wall opening the glazing sits in. */}
        <Line
          points={[x1, y1, x2, y2]}
          stroke="#6b7280"
          strokeWidth={Math.max(3, t * 1.5)}
          lineCap="butt"
        />
        {/* The glass. */}
        <Rect
          x={x1 - nx2 * (t / 2)}
          y={y1 - ny2 * (t / 2)}
          width={len}
          height={t}
          rotation={ang}
          fill="rgba(186,230,253,0.75)"
          stroke="#7dd3fc"
          strokeWidth={1}
        />
        {/* Mullions — two bars across the light. Without them a pale rectangle
            in a wall reads as a gap rather than as glazing. */}
        {[0.33, 0.66].map((f) => (
          <Line
            key={f}
            points={[
              x1 + ux2 * len * f - nx2 * (t / 2), y1 + uy2 * len * f - ny2 * (t / 2),
              x1 + ux2 * len * f + nx2 * (t / 2), y1 + uy2 * len * f + ny2 * (t / 2),
            ]}
            stroke="#38bdf8"
            strokeWidth={1}
          />
        ))}
      </Group>
    );
  }

  // ── Secret doors ────────────────────────────────────────────────────────
  // Shut, this IS wall: the same stroke the wall either side of it is drawn
  // with, so there is no seam, no colour shift and no leaf to notice. Drawn
  // before the sprite branch below on purpose — a secret door with art
  // assigned must still show the wall, or the art is the giveaway.
  if (doorMotion(door) === 'secret') {
    if (door.is_open) return null;   // opened: an ordinary gap in the wall
    return (
      <Group>
        <Line points={[x1, y1, x2, y2]} stroke={WALL_STROKE} strokeWidth={WALL_SW}
              lineCap="round" listening={false} />
        {/* The GM has to be able to find it again. Players never get this. */}
        {!isPlayer && (
          <Line points={[x1, y1, x2, y2]} stroke="#c084fc"
                strokeWidth={Math.max(1, WALL_SW * 0.45)} dash={[3, 3]} listening={false} />
        )}
      </Group>
    );
  }

  const isOpen  = door.is_open;
  const style   = door.style || 'standard';
  const palette = DOOR_COLORS[style] || DOOR_COLORS.standard;
  const color   = isOpen ? palette.open : palette.closed;

  // Angles
  const doorAngle = Math.atan2(uy, ux);
  const perpAngle = Math.atan2(py, px);
  const doorAngleDeg = doorAngle * 180 / Math.PI;

  // ── Sprite overlay ──────────────────────────────────────────────────────
  // When a sprite is assigned, it replaces the schematic panel and animates
  // with `progress` (0 closed → 1 open). GM still gets a faint hinge + arc
  // guide so the swing direction is readable while editing.
  if (spriteImg) {
    const prog = progress == null ? (isOpen ? 1 : 0) : progress;
    // Preserve the art's aspect ratio; the width spans the opening.
    const aspect = spriteImg.height && spriteImg.width ? spriteImg.height / spriteImg.width : 0.4;
    const thickness = len * aspect;
    const motion = doorMotion(door);
    // A vanishing door has no leaf to animate once it is open.
    if (motion === 'vanish' && prog >= 1) return null;
    const imgW = spriteImg.naturalWidth || spriteImg.width || 100;
    const imgH = spriteImg.naturalHeight || spriteImg.height || 40;

    // ── Double doors — split the sprite down the middle; each half swings
    // from its own jamb so the leaves part at the centre. ──────────────────
    if (motion === 'double') {
      const half = len / 2;
      const mx = x1 + ux * half, my = y1 + uy * half; // meeting point (centre)
      return (
        <Group>
          {!isPlayer && (
            <Line points={[x1, y1, x2, y2]} stroke="#37415188" strokeWidth={1} dash={[5, 4]} listening={false} />
          )}
          {/* Left leaf — hinge at (x1,y1), left half of the art, swings +dir */}
          <KonvaImage
            image={spriteImg}
            x={x1} y={y1}
            width={half} height={thickness}
            offsetY={thickness / 2}
            crop={{ x: 0, y: 0, width: imgW / 2, height: imgH }}
            rotation={doorAngleDeg + prog * dir * 90}
            listening={false}
          />
          {/* Right leaf — hinge at (x2,y2), right half of the art, swings -dir.
              offsetX = half puts the pivot on the leaf's outer (jamb) edge so
              the body extends back toward the centre when closed. */}
          <KonvaImage
            image={spriteImg}
            x={x2} y={y2}
            width={half} height={thickness}
            offsetX={half} offsetY={thickness / 2}
            crop={{ x: imgW / 2, y: 0, width: imgW / 2, height: imgH }}
            rotation={doorAngleDeg - prog * dir * 90}
            listening={false}
          />
        </Group>
      );
    }

    let imgProps;
    if (motion === 'slide') {
      // Leaf slides along the door line into the adjacent wall.
      imgProps = {
        x: x1 + ux * prog * len,
        y: y1 + uy * prog * len,
        rotation: doorAngleDeg,
      };
    } else {
      // Leaf swings around the hinge at (x1,y1) toward the swing side.
      imgProps = {
        x: x1,
        y: y1,
        rotation: doorAngleDeg + prog * dir * 90,
      };
    }
    return (
      <Group>
        {!isPlayer && (
          <>
            <Line points={[x1, y1, x2, y2]} stroke="#37415188" strokeWidth={1} dash={[5, 4]} listening={false} />
            {motion === 'swing' && (
              <Line points={arcPts(x1, y1, len, doorAngle, perpAngle)} stroke={color + '44'} strokeWidth={1} listening={false} />
            )}
          </>
        )}
        <KonvaImage
          image={spriteImg}
          x={imgProps.x}
          y={imgProps.y}
          width={len}
          height={thickness}
          offsetY={thickness / 2}
          rotation={imgProps.rotation}
          listening={false}
        />
      </Group>
    );
  }

  // ── Portcullis ────────────────────────────────────────────────────────────
  if (style === 'portcullis') {
    const numBars  = Math.max(2, Math.round(len / 14));
    const barReach = Math.max(5, Math.min(14, len * 0.13));
    const bars = Array.from({ length: numBars + 1 }, (_, i) => {
      const t  = i / numBars;
      const bx = x1 + t * (x2 - x1);
      const by = y1 + t * (y2 - y1);
      // When open, bars are offset to simulate raised portcullis
      const shift = isOpen ? -barReach * 1.2 : 0;
      return (
        <Line key={i}
          points={[bx + px * (shift - barReach), by + py * (shift - barReach),
                   bx + px * (shift + barReach), by + py * (shift + barReach)]}
          stroke={color} strokeWidth={isOpen ? 1.5 : 2.5} lineCap="round" listening={false} />
      );
    });
    return (
      <Group>
        <Line points={[x1, y1, x2, y2]} stroke={color} strokeWidth={2.5} lineCap="round" listening={false} />
        {bars}
        {/* Second crossbar when closed */}
        {!isOpen && (
          <Line points={[x1 + px * barReach * 0.6, y1 + py * barReach * 0.6,
                         x2 + px * barReach * 0.6, y2 + py * barReach * 0.6]}
            stroke={color} strokeWidth={1.5} lineCap="round" listening={false} />
        )}
      </Group>
    );
  }

  // ── Standard / Heavy ──────────────────────────────────────────────────────
  const sw = style === 'heavy' ? 5 : 3.5;

  if (isOpen) {
    // Panel swung 90° from hinge at (x1,y1)
    const panelX = x1 + px * len;
    const panelY = y1 + py * len;
    const swingArc = arcPts(x1, y1, len, doorAngle, perpAngle);

    return (
      <Group>
        {/* Ghost of door frame */}
        <Line points={[x1, y1, x2, y2]}
          stroke="#374151" strokeWidth={1} dash={[5, 4]} lineCap="round" listening={false} />
        {/* Swing arc */}
        <Line points={swingArc} stroke={color + '55'} strokeWidth={1} listening={false} />
        {/* Open panel */}
        <Line points={[x1, y1, panelX, panelY]}
          stroke={color} strokeWidth={sw} lineCap="round" listening={false} />
        {/* Hinge */}
        <Circle x={x1} y={y1} radius={3} fill={color} listening={false} />
        {/* Handle */}
        <Circle x={panelX} y={panelY} radius={2.5} fill={color} listening={false} />
      </Group>
    );
  }

  // Closed
  const swingArc = arcPts(x1, y1, len, doorAngle, perpAngle);

  return (
    <Group>
      {/* Swing arc */}
      <Line points={swingArc} stroke={color + '55'} strokeWidth={1} listening={false} />
      {/* Door panel */}
      <Line points={[x1, y1, x2, y2]}
        stroke={color} strokeWidth={sw} lineCap="round" listening={false} />
      {style === 'heavy' && (
        // Reinforcement edge line
        <Line points={[x1 + px * 2, y1 + py * 2, x2 + px * 2, y2 + py * 2]}
          stroke={color + '80'} strokeWidth={1.5} lineCap="round" listening={false} />
      )}
      {/* Hinge */}
      <Circle x={x1} y={y1} radius={3} fill={color} listening={false} />
      {/* Handle — offset slightly to one side so it's visible */}
      <Circle x={(x1 + x2) / 2 + px * 4} y={(y1 + y2) / 2 + py * 4}
        radius={2.5} fill={color} listening={false} />
    </Group>
  );
}

// ── Light source shapes ───────────────────────────────────────────────────────

function LightShape({ light }) {
  const brightR = light.bright_radius || 60;
  const dimR    = light.dim_radius    || brightR * 2;
  const col     = normaliseHexColor(light.color);
  const spread  = light.spread_angle ?? 360;
  const dir     = light.direction ?? 0;
  const isDirectional = spread < 360;
  // Konva Wedge: rotation is start angle (degrees, clockwise from east); angle is the sweep
  const wedgeRot = dir - spread / 2;
  return (
    <Group>
      {isDirectional ? (
        <>
          <Wedge x={light.x} y={light.y} radius={dimR} angle={spread} rotation={wedgeRot}
            fill={col + '0d'} stroke={col + '59'} strokeWidth={1.5} dash={[6, 4]} listening={false} />
          <Wedge x={light.x} y={light.y} radius={brightR} angle={spread} rotation={wedgeRot}
            fill={col + '21'} stroke={col + 'bf'} strokeWidth={1.5} listening={false} />
          {/* Direction indicator line */}
          <Line
            points={[light.x, light.y, light.x + Math.cos(dir * Math.PI / 180) * dimR, light.y + Math.sin(dir * Math.PI / 180) * dimR]}
            stroke={col + '80'} strokeWidth={1} dash={[4, 3]} listening={false}
          />
        </>
      ) : (
        <>
          <Circle x={light.x} y={light.y} radius={dimR}
            fill={col + '0d'} stroke={col + '59'}
            strokeWidth={1.5} dash={[6, 4]} listening={false} />
          <Circle x={light.x} y={light.y} radius={brightR}
            fill={col + '21'} stroke={col + 'bf'}
            strokeWidth={1.5} listening={false} />
        </>
      )}
      <Circle x={light.x} y={light.y} radius={4} fill={col} listening={false} />
    </Group>
  );
}

function LightPreview({ preview, gridSize }) {
  if (!preview) return null;
  const { cx, cy, brightR, direction = 0, spread = 360 } = preview;
  const dimR = brightR * 2;
  const brightFt = pxToFt(brightR, gridSize);
  const dimFt    = pxToFt(dimR, gridSize);
  const isDirectional = spread < 360;
  // Konva Wedge: rotation = start angle (clockwise from east), angle = sweep
  const wedgeRot = direction - spread / 2;
  // Guide line tip in drag direction
  const dirRad = direction * Math.PI / 180;
  const tipX = cx + Math.max(4, brightR) * Math.cos(dirRad);
  const tipY = cy + Math.max(4, brightR) * Math.sin(dirRad);
  // Label placed just past the tip
  const labelX = cx + (Math.max(4, brightR) + 6) * Math.cos(dirRad);
  const labelY = cy + (Math.max(4, brightR) + 6) * Math.sin(dirRad) - 11;
  const labelW = 96;

  return (
    <Group>
      {isDirectional ? (
        <>
          <Wedge x={cx} y={cy} radius={Math.max(4, dimR)} angle={spread} rotation={wedgeRot}
            fill="rgba(251,191,36,0.04)" stroke="rgba(251,191,36,0.4)"
            strokeWidth={1.5} dash={[6, 4]} listening={false} />
          <Wedge x={cx} y={cy} radius={Math.max(4, brightR)} angle={spread} rotation={wedgeRot}
            fill="rgba(251,191,36,0.10)" stroke="rgba(251,191,36,0.8)"
            strokeWidth={1.5} dash={[4, 3]} listening={false} />
        </>
      ) : (
        <>
          <Circle x={cx} y={cy} radius={Math.max(4, dimR)}
            fill="rgba(251,191,36,0.04)" stroke="rgba(251,191,36,0.4)"
            strokeWidth={1.5} dash={[6, 4]} listening={false} />
          <Circle x={cx} y={cy} radius={Math.max(4, brightR)}
            fill="rgba(251,191,36,0.10)" stroke="rgba(251,191,36,0.8)"
            strokeWidth={1.5} dash={[4, 3]} listening={false} />
        </>
      )}
      {/* Direction guide line */}
      {brightR > 4 && (
        <Line points={[cx, cy, tipX, tipY]}
          stroke="rgba(251,191,36,0.5)" strokeWidth={1} dash={[4, 3]} listening={false} />
      )}
      {/* Centre dot */}
      <Circle x={cx} y={cy} radius={4} fill="#fbbf24" listening={false} />
      {/* Radius label */}
      {brightR > 4 && (
        <>
          <Rect x={labelX} y={labelY} width={labelW} height={22}
            fill="rgba(0,0,0,0.72)" cornerRadius={4} listening={false} />
          <Text x={labelX} y={labelY + 4} width={labelW} align="center"
            text={`${brightFt} / ${dimFt} ft`}
            fill="#fbbf24" fontSize={12} fontStyle="bold" listening={false} />
        </>
      )}
    </Group>
  );
}

// ── Spell template shapes (GM-only) ─────────────────────────────────────────
function colorToFillStroke(color) {
  const c = typeof color === 'string' && color.startsWith('#') ? color : '#a855f7';
  // Use the hex color directly for stroke; build a translucent fill from it.
  // Simple approach: parse rgb and emit rgba.
  const h = c.replace('#', '');
  const norm = h.length === 3 ? h.split('').map(x => x + x).join('') : (h.length === 8 ? h.slice(0, 6) : h);
  const n = parseInt(norm, 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return {
    fill:   `rgba(${r},${g},${b},0.18)`,
    stroke: `rgba(${r},${g},${b},0.95)`,
    previewFill:   `rgba(${r},${g},${b},0.10)`,
    previewStroke: `rgba(${r},${g},${b},0.75)`,
  };
}

// `gridSize` is needed for line templates (1ft width = gridSize/5).
// Callers without grid context can fall back to the default 50 px/cell
// the host ships with — the line still renders correctly, just at
// whatever the default cell size implies.
// Exported so the 3D view resolves templates through exactly the same
// geometry the flat map uses — a cone that's 60 degrees here must be 60
// degrees there, and a line template's 1ft width must match.
export function templateShapeProps(t, fill, stroke, dash, gridSize = 50) {
  if (!t || !t.points) return null;
  const p = t.points;
  if (t.type === 'circle' && p.length >= 3) {
    return { kind: 'circle', x: p[0], y: p[1], radius: Math.max(2, p[2]), fill, stroke, dash };
  }
  if (t.type === 'square' && p.length >= 4) {
    const x = Math.min(p[0], p[2]), y = Math.min(p[1], p[3]);
    const w = Math.abs(p[2] - p[0]), h = Math.abs(p[3] - p[1]);
    return { kind: 'rect', x, y, width: w, height: h, fill, stroke, dash };
  }
  if (t.type === 'line' && p.length >= 4) {
    // Line templates are rendered as a thin rotated rectangle: 1 ft
    // wide (gridSize / 5 since one cell = 5 ft in 5e), with the
    // length being whatever the GM dragged. Plugins (e.g. elemental-
    // templates) read `ax/ay` as the source point and `bx/by` as the
    // tip so directional effects can flow along the line.
    const ax = p[0], ay = p[1], bx = p[2], by = p[3];
    const dx = bx - ax, dy = by - ay;
    const length = Math.hypot(dx, dy);
    const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
    const LINE_WIDTH_FT = 1;
    const widthPx = (LINE_WIDTH_FT / 5) * (gridSize || 50);
    return {
      kind: 'line',
      ax, ay, bx, by, length, angleDeg, widthPx,
      points: [ax, ay, bx, by],         // legacy callers still expect this
      fill, stroke, dash,
    };
  }
  if (t.type === 'cone' && p.length >= 4) {
    const dx = p[2] - p[0], dy = p[3] - p[1];
    const len = Math.hypot(dx, dy) || 1;
    const ang = Math.atan2(dy, dx) * 180 / Math.PI;
    return { kind: 'wedge', x: p[0], y: p[1], radius: len, angle: 60, rotation: ang - 30, fill, stroke, dash };
  }
  return null;
}

function TemplateShape({ template, isSelected = false, gridSize = 50 }) {
  const { fill, stroke } = colorToFillStroke(template.color);
  const dash = isSelected ? [3, 2] : [6, 3];
  const sw = isSelected ? 2.5 : 1.5;
  const props = templateShapeProps(template, fill, stroke, dash, gridSize);
  if (!props) return null;
  return (
    <>
      {props.kind === 'circle' && <Circle x={props.x} y={props.y} radius={props.radius} fill={props.fill} stroke={props.stroke} strokeWidth={sw} dash={props.dash} listening={false} />}
      {props.kind === 'rect'   && <Rect x={props.x} y={props.y} width={props.width} height={props.height} fill={props.fill} stroke={props.stroke} strokeWidth={sw} dash={props.dash} listening={false} />}
      {props.kind === 'wedge'  && <Wedge x={props.x} y={props.y} radius={props.radius} angle={props.angle} rotation={props.rotation} fill={props.fill} stroke={props.stroke} strokeWidth={sw} dash={props.dash} listening={false} />}
      {/* Line is now a rotated 1ft-wide rectangle: positioned at the
          line's start (ax, ay), rotated by angleDeg, with offsetY set
          to half-width so the rect's vertical centre sits exactly on
          the dragged line. Length = the user's drag distance. */}
      {props.kind === 'line'   && <Rect
        x={props.ax} y={props.ay}
        width={props.length} height={props.widthPx}
        offsetY={props.widthPx / 2}
        rotation={props.angleDeg}
        fill={props.fill} stroke={props.stroke} strokeWidth={sw} dash={props.dash} listening={false} />}
      {template.label && (
        <Text x={(template.points[0] || 0) + 6} y={(template.points[1] || 0) + 6}
          text={template.label} fill={props.stroke} fontSize={11} fontStyle="bold" listening={false} />
      )}
    </>
  );
}

// Wraps a TemplateShape with any plugin-supplied decorators. Plugins
// register a function (template, baseProps) => ReactNode in the
// spellTemplateDecorators registry; we render its output above the base
// shape inside the same Group, so plugin overlays move with the template
// and respect the same Layer ordering. Decorators that throw are swallowed
// so a single bad plugin can't crash the whole map.
function TemplateShapeWithDecorators({ template, isSelected = false, gridSize = 50 }) {
  // Subscribe so live-disabled plugins drop out of the render immediately.
  useRegistryVersion();
  const decorators = pluginRegistries.spellTemplateDecorators;
  // Compute the same shape props the base TemplateShape would, so plugin
  // decorators can position relative to the underlying geometry without
  // re-deriving it.
  const { fill, stroke } = colorToFillStroke(template.color);
  const baseProps = templateShapeProps(template, fill, stroke, isSelected ? [3, 2] : [6, 3], gridSize);
  return (
    <>
      <TemplateShape template={template} isSelected={isSelected} gridSize={gridSize} />
      {decorators.size > 0 && Array.from(decorators.entries()).map(([pid, fn]) => {
        try {
          const node = fn(template, baseProps);
          return node ? <React.Fragment key={pid}>{node}</React.Fragment> : null;
        } catch (err) {
          console.warn(`spellTemplateDecorator "${pid}" threw:`, err);
          return null;
        }
      })}
    </>
  );
}

function TemplatePreview({ preview, gridSize }) {
  const { previewFill, previewStroke } = colorToFillStroke(preview?.color || '#a855f7');
  if (!preview) return null;
  const props = templateShapeProps(preview, previewFill, previewStroke, [4, 3], gridSize);
  if (!props) return null;

  // Live feet readout while dragging — matches the style used by the
  // measurement tool's MeasureOverlay (black rounded chip + bold label).
  // Position varies per shape so the label sits next to the bit the GM
  // is actually adjusting (centre for circles, far corner for squares,
  // tip for cones, midpoint for lines).
  function readoutNode() {
    if (!gridSize) return null;
    // Big, easily-readable chip — sized for a GM zoomed out to see the
    // whole battlefield rather than zoomed in on the click. Tweak both
    // CHIP_H and FONT_SIZE together to keep the text vertically centred.
    const FONT_SIZE = 36;
    const CHIP_H    = 54;
    const TEXT_PAD  = 8;        // vertical offset to centre text in chip
    const CHIP_PAD  = 20;       // horizontal padding inside chip
    const APPROX_CHAR_W = FONT_SIZE * 0.62;
    const chipFor = (text) => Math.max(140, Math.ceil(text.length * APPROX_CHAR_W) + CHIP_PAD * 2);

    const labelStyle = {
      fill: 'rgba(0,0,0,0.82)',
      stroke: 'rgba(255,255,255,0.18)',
      strokeWidth: 1,
      cornerRadius: 6,
      listening: false,
    };
    const textStyle = {
      fill: props.stroke,
      fontSize: FONT_SIZE,
      fontStyle: 'bold',
      listening: false,
    };

    if (props.kind === 'circle') {
      const ft = pxToFt(props.radius, gridSize);
      const text = `r = ${ft} ft`;
      const w = chipFor(text);
      const lx = props.x - w / 2;
      const ly = props.y - props.radius - CHIP_H - 8;
      return (
        <>
          <Rect x={lx} y={ly} width={w} height={CHIP_H} {...labelStyle} />
          <Text x={lx} y={ly + TEXT_PAD} width={w} align="center" text={text} {...textStyle} />
        </>
      );
    }
    if (props.kind === 'rect') {
      // Squares are drawn corner-to-corner — show width × height in ft so
      // the GM gets both axes if they're not perfectly square.
      const wFt = pxToFt(props.width,  gridSize);
      const hFt = pxToFt(props.height, gridSize);
      const text = wFt === hFt ? `${wFt} ft` : `${wFt} × ${hFt} ft`;
      const w = chipFor(text);
      const lx = props.x + props.width / 2 - w / 2;
      const ly = props.y - CHIP_H - 8;
      return (
        <>
          <Rect x={lx} y={ly} width={w} height={CHIP_H} {...labelStyle} />
          <Text x={lx} y={ly + TEXT_PAD} width={w} align="center" text={text} {...textStyle} />
        </>
      );
    }
    if (props.kind === 'wedge') {
      // Cone: place the chip at the tip along the cone's centerline so
      // the reading sits next to the part the GM is dragging.
      const ft = pxToFt(props.radius, gridSize);
      const text = `${ft} ft`;
      const w = chipFor(text);
      const midRad = (props.rotation + props.angle / 2) * Math.PI / 180;
      const tipX = props.x + Math.cos(midRad) * (props.radius + 40);
      const tipY = props.y + Math.sin(midRad) * (props.radius + 40);
      return (
        <>
          <Rect x={tipX - w / 2} y={tipY - CHIP_H / 2} width={w} height={CHIP_H} {...labelStyle} />
          <Text x={tipX - w / 2} y={tipY - CHIP_H / 2 + TEXT_PAD} width={w} align="center" text={text} {...textStyle} />
        </>
      );
    }
    if (props.kind === 'line') {
      const [x1, y1, x2, y2] = props.points;
      const len = Math.hypot(x2 - x1, y2 - y1);
      if (len < 1) return null;
      const ft = pxToFt(len, gridSize);
      const text = `${ft} ft`;
      const w = chipFor(text);
      // Offset the chip perpendicular to the line so it doesn't sit
      // directly on top of the line.
      const ux = (x2 - x1) / len, uy = (y2 - y1) / len;
      const off = CHIP_H / 2 + 6;
      const px = -uy * off, py = ux * off;
      const mx = (x1 + x2) / 2 + px;
      const my = (y1 + y2) / 2 + py;
      return (
        <>
          <Rect x={mx - w / 2} y={my - CHIP_H / 2} width={w} height={CHIP_H} {...labelStyle} />
          <Text x={mx - w / 2} y={my - CHIP_H / 2 + TEXT_PAD} width={w} align="center" text={text} {...textStyle} />
        </>
      );
    }
    return null;
  }

  return (
    <>
      {props.kind === 'circle' && <Circle x={props.x} y={props.y} radius={props.radius} fill={props.fill} stroke={props.stroke} strokeWidth={1.5} dash={props.dash} listening={false} />}
      {props.kind === 'rect'   && <Rect x={props.x} y={props.y} width={props.width} height={props.height} fill={props.fill} stroke={props.stroke} strokeWidth={1.5} dash={props.dash} listening={false} />}
      {props.kind === 'wedge'  && <Wedge x={props.x} y={props.y} radius={props.radius} angle={props.angle} rotation={props.rotation} fill={props.fill} stroke={props.stroke} strokeWidth={1.5} dash={props.dash} listening={false} />}
      {/* Live preview while drawing — rotated 1ft-wide rectangle so
          the player sees the actual area-of-effect shape, not a thin
          line that the final render would replace. */}
      {props.kind === 'line'   && <Rect
        x={props.ax} y={props.ay}
        width={props.length} height={props.widthPx}
        offsetY={props.widthPx / 2}
        rotation={props.angleDeg}
        fill={props.fill} stroke={props.stroke} strokeWidth={1.5} dash={[4, 3]} listening={false} />}
      {readoutNode()}
    </>
  );
}

function findNearestTemplate(mapX, mapY, templates, threshold, gridSize = 50) {
  let nearest = null, minDist = threshold;
  for (const t of templates) {
    const p = t.points || [];
    let d = Infinity;
    if (t.type === 'circle' && p.length >= 3) {
      const distFromCentre = Math.hypot(mapX - p[0], mapY - p[1]);
      d = distFromCentre <= p[2] ? 0 : distFromCentre - p[2];
    } else if (t.type === 'square' && p.length >= 4) {
      const x1 = Math.min(p[0], p[2]), y1 = Math.min(p[1], p[3]);
      const x2 = Math.max(p[0], p[2]), y2 = Math.max(p[1], p[3]);
      if (mapX >= x1 && mapX <= x2 && mapY >= y1 && mapY <= y2) d = 0;
      else d = Math.min(Math.abs(mapX - x1), Math.abs(mapX - x2), Math.abs(mapY - y1), Math.abs(mapY - y2));
    } else if (t.type === 'line' && p.length >= 4) {
      // Line templates are now rotated 1ft-wide rectangles. Hit-test
      // by rotating the click into the rect's local frame, where the
      // rect spans (0..length, -halfW..halfW). Click "inside" → 0;
      // click "outside" → distance to the nearest rect edge.
      const ax = p[0], ay = p[1], bx = p[2], by = p[3];
      const dx = bx - ax, dy = by - ay;
      const len = Math.hypot(dx, dy);
      if (len < 1e-3) {
        d = Math.hypot(mapX - ax, mapY - ay);
      } else {
        const halfW = ((1 / 5) * (gridSize || 50)) / 2;
        const ux = dx / len, uy = dy / len;
        const vx = mapX - ax, vy = mapY - ay;
        const along = vx * ux + vy * uy;
        const perp  = vx * (-uy) + vy * ux;
        if (along >= 0 && along <= len && Math.abs(perp) <= halfW) {
          d = 0;
        } else {
          const cAlong = Math.max(0, Math.min(len, along));
          const cPerp  = Math.max(-halfW, Math.min(halfW, perp));
          d = Math.hypot(along - cAlong, perp - cPerp);
        }
      }
    } else if (t.type === 'cone' && p.length >= 4) {
      // Old version returned `hypot(mapX-p[0], mapY-p[1])` — distance
      // from the cone's apex only. That meant clicking ANY direction
      // 30 px away from the apex registered as a hit, including the
      // half of the map BEHIND the caster, which is why the GM saw
      // templates jump when they thought they were clicking empty
      // ground. Proper hit-test:
      //   - inside the 60° wedge AND within range  → 0
      //   - outside the wedge angular range        → perp distance to
      //                                              the nearest cone edge
      //   - past the cone's tip but still inside
      //     the wedge angular range                → distance past the arc
      const dx = p[2] - p[0], dy = p[3] - p[1];
      const len = Math.hypot(dx, dy);
      const vx = mapX - p[0], vy = mapY - p[1];
      const distFromApex = Math.hypot(vx, vy);
      const HALF_ANG = Math.PI / 6;       // 30° → 60° total wedge
      if (len === 0 || distFromApex === 0) {
        d = 0;
      } else {
        const coneAng  = Math.atan2(dy, dx);
        const clickAng = Math.atan2(vy, vx);
        let delta = clickAng - coneAng;
        while (delta >  Math.PI) delta -= 2 * Math.PI;
        while (delta < -Math.PI) delta += 2 * Math.PI;
        if (Math.abs(delta) <= HALF_ANG) {
          d = distFromApex <= len ? 0 : distFromApex - len;
        } else {
          // Perpendicular distance to whichever edge is on the
          // click's side. Edge runs from apex out to (cos*len, sin*len).
          const sign = delta > 0 ? 1 : -1;
          const edgeAng = coneAng + sign * HALF_ANG;
          const ex = Math.cos(edgeAng), ey = Math.sin(edgeAng);
          const along = vx * ex + vy * ey;
          if (along <= 0)        d = distFromApex;
          else if (along >= len) d = Math.hypot(vx - ex * len, vy - ey * len);
          else                   d = Math.abs(vx * (-ey) + vy * ex);
        }
      }
    }
    if (d < minDist) { minDist = d; nearest = { template: t, dist: d }; }
  }
  return nearest;
}

function DarknessZone({ dz }) {
  const isPolygon = dz.shape === 'polygon' && Array.isArray(dz.poly_points) && dz.poly_points.length >= 6;
  const { x: cx, y: cy } = zoneCentroid(dz);
  return (
    <Group>
      {isPolygon
        ? <Line points={dz.poly_points} closed fill="rgba(88,28,135,0.30)" stroke="rgba(147,51,234,0.75)" strokeWidth={2} dash={[6, 3]} listening={false} />
        : <Circle x={dz.x} y={dz.y} radius={dz.radius} fill="rgba(88,28,135,0.30)" stroke="rgba(147,51,234,0.75)" strokeWidth={2} dash={[6, 3]} listening={false} />
      }
      <Circle x={cx} y={cy} radius={5} fill="rgba(167,139,250,0.9)" stroke="none" listening={false} />
    </Group>
  );
}

function FogZone({ dz }) {
  const isPolygon = dz.shape === 'polygon' && Array.isArray(dz.poly_points) && dz.poly_points.length >= 6;
  const { x: cx, y: cy } = zoneCentroid(dz);
  return (
    <Group>
      {isPolygon
        ? <Line points={dz.poly_points} closed fill="rgba(100,116,139,0.28)" stroke="rgba(148,163,184,0.80)" strokeWidth={2} dash={[6, 3]} listening={false} />
        : <Circle x={dz.x} y={dz.y} radius={dz.radius} fill="rgba(100,116,139,0.28)" stroke="rgba(148,163,184,0.80)" strokeWidth={2} dash={[6, 3]} listening={false} />
      }
      <Circle x={cx} y={cy} radius={5} fill="rgba(203,213,225,0.9)" stroke="none" listening={false} />
    </Group>
  );
}

function WaterZone({ dz }) {
  const isPolygon = dz.shape === 'polygon' && Array.isArray(dz.poly_points) && dz.poly_points.length >= 6;
  const { x: cx, y: cy } = zoneCentroid(dz);
  return (
    <Group>
      {isPolygon
        ? <Line points={dz.poly_points} closed fill="rgba(14,116,144,0.18)" stroke="rgba(6,182,212,0.75)" strokeWidth={2} dash={[6, 3]} listening={false} />
        : <Circle x={dz.x} y={dz.y} radius={dz.radius} fill="rgba(14,116,144,0.18)" stroke="rgba(6,182,212,0.75)" strokeWidth={2} dash={[6, 3]} listening={false} />
      }
      <Circle x={cx} y={cy} radius={5} fill="rgba(103,232,249,0.9)" stroke="none" listening={false} />
    </Group>
  );
}

function DarknessPreview({ preview, gridSize, isFog = false, isWater = false }) {
  if (!preview) return null;
  const fillColor   = isWater ? 'rgba(14,116,144,0.18)'  : isFog ? 'rgba(100,116,139,0.18)' : 'rgba(88,28,135,0.18)';
  const strokeColor = isWater ? 'rgba(6,182,212,0.85)'   : isFog ? 'rgba(148,163,184,0.85)' : 'rgba(147,51,234,0.85)';
  const lineColor   = isWater ? 'rgba(6,182,212,0.5)'    : isFog ? 'rgba(148,163,184,0.5)'  : 'rgba(147,51,234,0.5)';
  const dotColor    = isWater ? 'rgba(103,232,249,0.9)'  : isFog ? 'rgba(203,213,225,0.9)'  : 'rgba(167,139,250,0.9)';
  const textColor   = isWater ? '#22d3ee'                : isFog ? '#94a3b8'                : '#c084fc';

  // Polygon drawing in-progress
  if (preview.isPolygon) {
    const { points, cursorX, cursorY } = preview;
    const n = points.length / 2;
    const livePts = (cursorX != null && n > 0) ? [...points, cursorX, cursorY] : points;
    return (
      <Group>
        {livePts.length >= 4 && (
          <Line points={livePts} closed={false}
            fill="transparent" stroke={strokeColor}
            strokeWidth={2} dash={[6, 3]} listening={false} />
        )}
        {/* Faint closing segment so you can see where the polygon will close */}
        {cursorX != null && n >= 2 && (
          <Line points={[cursorX, cursorY, points[0], points[1]]}
            stroke={strokeColor} strokeWidth={1} dash={[4, 3]} opacity={0.35} listening={false} />
        )}
        {/* Vertex dots */}
        {Array.from({ length: n }, (_, i) => (
          <Circle key={i} x={points[i * 2]} y={points[i * 2 + 1]}
            radius={i === 0 ? 6 : 4}
            fill={i === 0 ? strokeColor : dotColor}
            stroke={i === 0 ? 'white' : 'none'} strokeWidth={1}
            listening={false} />
        ))}
      </Group>
    );
  }

  // Circle drawing
  const { cx, cy, r } = preview;
  const ft = pxToFt(r, gridSize);
  const labelX = cx + Math.max(4, r) + 6;
  const labelY = cy - 11;
  const labelW = 82;
  return (
    <Group>
      <Circle x={cx} y={cy} radius={Math.max(4, r)}
        fill={fillColor} stroke={strokeColor}
        strokeWidth={2} dash={[6, 3]} listening={false} />
      {r > 4 && (
        <Line points={[cx, cy, cx + r, cy]}
          stroke={lineColor} strokeWidth={1} dash={[4, 3]} listening={false} />
      )}
      <Circle x={cx} y={cy} radius={4} fill={dotColor} listening={false} />
      {r > 4 && (
        <>
          <Rect x={labelX} y={labelY} width={labelW} height={22}
            fill="rgba(0,0,0,0.72)" cornerRadius={4} listening={false} />
          <Text x={labelX} y={labelY + 4} width={labelW} align="center"
            text={`r = ${ft} ft`}
            fill={textColor} fontSize={12} fontStyle="bold" listening={false} />
        </>
      )}
    </Group>
  );
}

// ── Map image — uses natural dimensions ───────────────────────────────────────

function MapImage({ src, onDims }) {
  // Not `useImage`: a board's art is the largest thing this app decodes, and the
  // hook hands back a full-resolution bitmap that is then drawn at a fraction of
  // its size. `loadCappedImage` returns the ORIGINAL dimensions with a smaller
  // surface behind them, so the board is still measured in its own pixels while
  // the memory is bounded. One generated backdrop on the live server was a
  // 150-byte SVG declaring 10240×10240 — 400MB of one grey rectangle.
  const [art, setArt] = useState(null);
  useEffect(() => {
    if (!src) { setArt(null); return; }
    let cancelled = false;
    // 8192, not the default 2048: a photographic battlemap is meant to be
    // zoomed into, and capping it was a visible softening for no measured win —
    // the renderer's memory did not move. The cap still catches the case that
    // matters here, because SVG art is limited separately and much harder:
    // Cragdor's backdrop declares 10240×10240 and contains one grey rectangle.
    loadCappedImage(src, 8192).then((a) => { if (!cancelled) setArt(a); }).catch(() => {});
    return () => { cancelled = true; };
  }, [src]);
  useEffect(() => {
    if (art && art.width && art.height) onDims(art.width, art.height);
  }, [art, onDims]);
  if (!art) return null;
  // Explicit size: the source may be smaller than the board it covers.
  return <KonvaImage image={art.source} width={art.width} height={art.height} listening={false} />;
}

// The whole lattice as ONE Konva node.
//
// A square grid is cols+rows lines; a hex grid is cols·rows cells, which on a
// 4000px map at 50px/hex is ~5,500 hexes. That many <Line> nodes stalls the
// stage, so this strokes the lot as a single canvas path instead. The path
// itself comes from utils/grid.js, shared with the player handout renderer.
function HexGrid({ mW, mH, gridSize, color, thickness }) {
  const sceneFunc = useCallback((ctx, shape) => {
    if (!(gridSize > 0) || !(mW > 0) || !(mH > 0)) return;
    const lat = hexLattice(mW, mH, gridSize);
    // Below a couple of pixels a hex is a smudge, and the cell count explodes.
    if (lat.colStep < 3) return;

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, mW, mH);
    ctx.clip();
    ctx.beginPath();
    traceHexLattice(ctx, lat);
    ctx.strokeShape(shape);
    ctx.restore();
  }, [mW, mH, gridSize]);

  return (
    <Shape
      sceneFunc={sceneFunc}
      stroke={color}
      strokeWidth={thickness}
      listening={false}
      perfectDrawEnabled={false}
    />
  );
}

// ── Scale key ────────────────────────────────────────────────────────────────
//
// "1 hex = 10 days travel", with a swatch of the actual cell and a bar showing
// how far that reaches on screen right now.
//
// Lives in the DOM rather than on the stage, for the same reason the wildspace
// backdrop does: the pan/zoom transform is applied to the Stage, and a key that
// scaled and slid away with the map would be useless. Sitting outside costs no
// Konva node and keeps the text crisp at any zoom.
//
// The BAR is the part that has to track the transform, since it's the only bit
// making a claim about on-screen distance. It spans a whole number of cells,
// picked so it lands in a readable range of screen pixels at the current zoom,
// and it's relabelled to match — so zooming out steps it 1 → 2 → 5 → 10 cells
// rather than shrinking into nothing.
const BAR_STEPS = [1, 2, 3, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000];
const BAR_MIN_PX = 64;
const BAR_MAX_PX = 190;

function ScaleKey({ isHex, gridSize, scale, mapScale, gridColor }) {
  const cellPx = (isHex ? 1.5 * (gridSize / Math.sqrt(3)) : gridSize) * scale;
  if (!(cellPx > 0)) return null;

  // Widest step that still fits, else the narrowest one — so a map zoomed far
  // out still gets a bar rather than nothing.
  let cells = BAR_STEPS.find(n => n * cellPx >= BAR_MIN_PX && n * cellPx <= BAR_MAX_PX);
  if (cells == null) cells = cellPx > BAR_MAX_PX ? 1 : BAR_STEPS[BAR_STEPS.length - 1];
  const barPx = Math.min(cells * cellPx, BAR_MAX_PX * 1.6);

  const cellWord = isHex ? 'hex' : 'square';
  // A flat-top hex drawn at the same proportions as the lattice, or a square.
  const swatch = isHex
    ? <polygon points="5,1 13,1 17,8 13,15 5,15 1,8" fill="none" stroke="currentColor" strokeWidth="1.5" />
    : <rect x="2" y="2" width="14" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" />;

  return (
    <div
      style={{
        position: 'absolute', left: 12, bottom: 12, zIndex: 5,
        pointerEvents: 'none', userSelect: 'none',
        background: 'rgba(0,0,0,0.62)', color: '#f3f4f6',
        border: '1px solid rgba(255,255,255,0.14)', borderRadius: 8,
        padding: '7px 10px', font: '600 12px/1.35 system-ui, sans-serif',
        backdropFilter: 'blur(2px)', maxWidth: '46%',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <svg width="18" height="16" viewBox="0 0 18 16" style={{ color: gridColor || '#f3f4f6', flexShrink: 0 }}>
          {swatch}
        </svg>
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          1 {cellWord} = {formatCells(1, mapScale)}
        </span>
      </div>
      <div style={{ marginTop: 5 }}>
        {/* End ticks and a spanning rule, the usual map-scale-bar idiom. */}
        <svg width={barPx} height="9" style={{ display: 'block' }}>
          <path
            d={`M0.5 0.5 L0.5 8.5 M0.5 4.5 L${barPx - 0.5} 4.5 M${barPx - 0.5} 0.5 L${barPx - 0.5} 8.5`}
            stroke="rgba(255,255,255,0.85)" strokeWidth="1" fill="none"
          />
        </svg>
        <div style={{ marginTop: 2, fontWeight: 500, opacity: 0.85, whiteSpace: 'nowrap' }}>
          {formatCells(cells, mapScale)}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function MapStage({
  mapUrl, mapWidth, mapHeight, gridSize,
  // Id of the map currently on screen. Surfaced to plugins through the
  // mapDecorations ctx so per-map plugin state (weather, ambience) can
  // key off it. Null when the session has no map selected.
  mapId = null,
  // 'image' — mapUrl is the play surface and defines the map's pixel extent.
  // 'wildspace' — mapUrl is a distant starscape pinned to the viewport behind
  // the stage. It never pans, zooms or scales with the grid, so the map's
  // extent comes from mapWidth/mapHeight (cols/rows * gridSize) instead.
  mapType = 'image',
  // Wildspace extent, in squares. Authoritative over mapWidth/mapHeight so the
  // play area stays exactly this many squares however the GM moves the grid-size
  // slider — the stored pixel width was frozen at whatever grid_size applied
  // when the map was made.
  gridCols = null, gridRows = null,
  // Placed ships on this map, each with its `decks` array attached. Only the
  // ship's active_deck is drawn; tokens standing on any other level are
  // hidden, since the deck below is physically under the one on screen.
  ships = EMPTY_SHIPS,
  selectedShipId = null, onShipSelect, onShipMove, onShipRotate, onShipDeckChange,
  // May THIS viewer drive a ship they're standing at the helm of? The rule is
  // spell slots (see utils/piloting.js) and the parent owns the character sheet,
  // so it decides. GM views leave it default-true. Gating it here as well as in
  // the parent keeps a hull from moving under someone the server will refuse.
  canPilot = true,
  // Who this client is playing as. Used to decide whether they're the one
  // attuned to a ship's helm and may therefore steer it. GM passes nothing.
  playerName = null,
  // Called instead of onTokenMove when a drag ends on (or leaves) a deck.
  // Signature: (tokenId, shipId | null, deckIndex, worldCol, worldRow).
  onTokenDeckMove,
  // Taking the stairs. Signature: (tokenId, shipId, toDeck, toCol, toRow).
  onTokenChangeDeck,
  tokens, isPlayer, isSpectator = false,
  onTokenMove, selectedTokenId, onTokenSelect,
  onMapClick, placingToken,
  activeTool = 'pan',
  gridColor = 'rgba(0,0,0,0.35)',
  gridThickness = 0.7,
  // 'square' (default) or 'hex' — flat-top hexes at one hex per 5ft. Purely
  // the shape of the lattice drawn over the map: token coords, walls, LOS,
  // fog, templates and measurement all stay in the same pixel frame either
  // way, so a map can be flipped between the two at any point.
  gridType = 'square',
  // What one cell is worth, and whether to show the key saying so. The unit is
  // whatever the GM typed — "ft", "miles", "10 days travel" — so it's only ever
  // multiplied and appended, never converted. Drives the scale key and the
  // ruler readout; feet-based game objects (spell radii, light, vision, auras)
  // ignore it and keep their own 5ft-per-cell conversion.
  gridScale = 5,
  gridUnit = 'ft',
  showScaleKey = false,
  playerTokenId = null,
  // Extra tokens whose senses feed this client's fog-of-war on top of
  // `playerTokenId` — familiars the player is currently seeing through.
  // Player view only; the spectator display already unions the party.
  visionTokenIds = EMPTY_IDS,
  // Walls / doors / lights / fog
  walls = [],
  doors = [],
  lights = [],
  fogOfWar: fogOfWarProp = false,
  // Show the whole map regardless of fog — the GM projecting the map to the
  // party. Kept separate from `fogOfWar` because that prop also gates GM-only
  // chrome; this one only switches off the OCCLUSION.
  revealAll = false,
  // When set, this client does not drive its own camera: it frames the map
  // rectangle {cx, cy, w, h} (centre + extent, in map pixels) that the GM is
  // looking at, and pan/zoom input is ignored. See the `cameraRect` block.
  cameraRect = null,
  // Reports this client's visible map rectangle, throttled, so the GM can
  // broadcast it. Only wired up on the GM's own stage.
  onCameraRect = null,
  sneakMode = false,
  sneakRoundAt = null,
  sneakBarInset = 8,
  fowBlur = 16,
  fowColor = '#000000',
  ambientLight = 'bright',
  onWallAdd = null,
  onWallDelete = null,
  onDoorAdd = null,
  onDoorDelete = null,
  onDoorToggle = null,
  onDoorFlip = null,
  onDoorSpriteSet = null,
  doorSprites = [],
  onLightAdd = null,
  onLightDelete = null,
  onLightSelect = null,
  magicalDarkness = [],
  onMagicalDarknessAdd = null,
  onMagicalDarknessDelete = null,
  onZoneFeatherChange = null,
  spawnPoint = null,
  onSetSpawnPoint = null,
  dmMarkers = [],
  onDmMarkerClick = null,
  centerOnMapPoint = null,
  activeLightSpread = 360,
  fitToMap = false,
  currentCombatTokenId = null,
  onMeasureChange = null,
  // Freehand ink. `drawings` is every stroke on this map from everyone;
  // onDrawStroke fires once per finished stroke, in map coordinates.
  drawings = [],
  // This client's own ink colour, for the live preview before the server
  // echoes the stroke back with the authoritative colour.
  myInkColor = '#ef4444',
  onDrawStroke = null,
  onDrawUndo = null,
  remoteMeasurements = [],
  spellTemplates = [],
  onTemplatePlace = null,
  onTemplateDelete = null,
  onTemplateUpdate = null,
  onTemplateSelect = null,
  selectedTemplateId = null,
  tokenNameFontSize = 45,
  onTokenContextMenu = null,
  // Named per-map spawn points (Phase 2 — split-the-party):
  // an array of { id, label, grid_col, grid_row }. Glyphs are GM-only.
  // The 'spawn-named' tool fires `onSpawnNamedAdd(col, row)` on click;
  // the parent prompts for a label and emits the socket event itself.
  spawnPoints = [],
  // Patrol routes, GM-only. `patrolRoutes` is [{ tokenId, points, active, draft }]
  // — the same shape whether it is a saved route or the one being drawn, so the
  // renderer below does not care which it is looking at.
  patrolRoutes = [],
  // Fired when the GM finalises a polygon (Enter / double-click) with
  // the spawn-named tool. Parent collects the points + label and
  // persists via add_spawn_point.
  onSpawnNamedAdd = null,
  // Fired when the GM drags an existing named spawn-point glyph to a
  // new tile. Parent persists via the update_spawn_point socket event.
  onSpawnPointMove = null,
  // Portals: linked pairs of squares on this map. Rows carry
  // { id, pair_id, label, grid_col, grid_row, color, hidden, exit_enabled }.
  // Players are never sent hidden ones, so anything here is renderable —
  // `hidden` only affects how the GM's own copy is drawn.
  portals = [],
  // A click on a portal glyph (pan/move tools only). The parent decides
  // which token travels and emits use_portal.
  onPortalUse = null,
  // 'portal-place' tool: fires with the clicked square. The parent pairs
  // the first click with the second and persists both ends.
  onPortalPlace = null,
  // 'portal-erase' tool: fires with the portal under the cursor. Deleting
  // either end removes the whole pair (server-side).
  onPortalErase = null,
  // Square the GM clicked first while placing a pair, so the half-placed
  // end can be ghosted until the second click lands: { col, row }.
  portalPendingAnchor = null,
  // Right-click menu actions. `onPortalUpdate(id, patch)` changes one end;
  // `onPortalPairUpdate(pairId, patch)` changes both, which is what enabling
  // or disabling a gate as a whole means.
  onPortalUpdate = null,
  onPortalPairUpdate = null,
  // Map-terrain rendering. Each item carries its library-joined
  // metadata (lib_image_path, blocks_*, hide_until_revealed, etc.).
  // Players never receive hidden terrain at the network layer, so
  // every item we get here is renderable. The parent owns
  // drag/resize/right-click callbacks below.
  terrain = [],
  onTerrainMove = null,
  onTerrainResize = null,
  onTerrainContextMenu = null,
  // Stairs between storeys of a building. `levelTransitions` is the active
  // level's list; clicking one takes the token standing on it to the far end.
  // `onStairPlace` is the GM's placement mode — when set, the next map click is
  // a placement rather than anything else.
  levelTransitions = [],
  onStairUse = null,
  onStairPlace = null,
  onStairRemove = null,
  // Adjust one storey's own copy of a staircase. A stair's footprint is not
  // the same on both floors — the flight that starts at the landing above ends
  // somewhere else below — so each end is edited independently and only the
  // level being looked at is written.
  onStairAdjust = null,
  onDoorKindSet = null,
  // When non-null the GM is in "place from library" mode — clicking
  // the canvas drops a piece at the click point.
  pendingTerrain = null,
  onTerrainPlace = null,
  // ── Tile maps ──────────────────────────────────────────────────────────
  // `tiles` is what has been laid; `pendingTile` is the card the GM has
  // turned and not yet put down, which arms the next click as a placement.
  tiles = [],
  pendingTile = null,
  // Where the turned card is currently sitting, GM-side only, before it is
  // committed: { col, row } or null. Held by the parent rather than here so
  // the panel can offer a Lay-it-down button for the same position.
  stagedTile = null,
  onTileMenu = null,
  // The quarter turn the GM has dialled in for the staged tile, so the ghost
  // shows the orientation that will actually be committed.
  tileRotation = 0,
  onTileStage = null,
  onTileRemove = null,
  // The id of the currently-selected terrain (null = none). Used by
  // the canvas to render resize handles around the selected piece.
  selectedTerrainId = null,
  onTerrainSelect = null,
  // The piece currently in free resize/rotate mode, or null. Deliberately
  // separate from selection: handles that arm on mere selection swallow clicks
  // all around a piece, so resizing is something the GM opts into.
  resizingTerrainId = null,
  pings = [],
  // Transformation / destruction animations: [{ tokenId, effect, ts }].
  tokenFx = EMPTY_IDS,
  // Ship destruction animations: [{ shipId, effect, ts, gridCol, gridRow, cols,
  // rows, offsetCol, offsetRow }]. Geometry travels with the event because the
  // ship is already deleted by the time this renders.
  shipFx = EMPTY_IDS,
  // GM-only: (shipId, effect, crew) => void. effect: none|explosion|magical|
  // implosion. crew: 'adrift' | 'delete'.
  onShipRemove = null,
  onShipRename = null,
  // GM-only ship combat controls, all from the hull's right-click menu:
  // hull damage/healing, its initiative roll, and whether it's in the fight.
  onShipHpChange = null,
  onShipInitiativeChange = null,
  onShipCombatToggle = null,
  combatActive = false,
  onPingMap = null,
  fogBlocks = [],
  onFogBlockAdd = null,
  onFogBlockDelete = null,
  onFogBlockReveal = null,
  onFogBlockHide = null,
}) {
  // Fog occlusion. The `fogOfWar` PROP means "this viewer is subject to fog",
  // which is also what tells the renderer this isn't the GM; `revealAll` turns
  // the occlusion off without changing that. Everything below reads this.
  //
  // Declared FIRST, ahead of every other binding in this component: refs and
  // memos further down close over it, and a `const` declared after them is in
  // its temporal dead zone when they run, which throws on the very first
  // render rather than failing quietly.
  const fogOfWar = fogOfWarProp && !revealAll;

  const stageRef = useRef(null);
  const containerRef = useRef(null);
  const submergedTokensLayerRef = useRef(null);
  const aboveWaterTokensLayerRef = useRef(null);
  const onZoneFeatherChangeRef = useRef(onZoneFeatherChange);
  useEffect(() => { onZoneFeatherChangeRef.current = onZoneFeatherChange; }, [onZoneFeatherChange]);

  const pingCanvasRef = useRef(null);
  const pingsRef = useRef(pings);
  useEffect(() => { pingsRef.current = pings; }, [pings]);

  const fxCanvasRef = useRef(null);
  const tokenFxRef = useRef(tokenFx);
  useEffect(() => { tokenFxRef.current = tokenFx; }, [tokenFx]);
  const shipFxRef = useRef(shipFx);
  useEffect(() => { shipFxRef.current = shipFx; }, [shipFx]);
  // Where each effect is playing, in map coordinates, resolved once when the
  // effect first renders. A fire blast DELETES its token halfway through, so
  // looking the position up live would strand the animation mid-explosion.
  const fxAnchorsRef = useRef(new Map());
  const onPingMapRef = useRef(onPingMap);
  useEffect(() => { onPingMapRef.current = onPingMap; }, [onPingMap]);

  const fogBlocksRef = useRef(fogBlocks);
  useEffect(() => { fogBlocksRef.current = fogBlocks; }, [fogBlocks]);
  const onFogBlockAddRef = useRef(onFogBlockAdd);
  useEffect(() => { onFogBlockAddRef.current = onFogBlockAdd; }, [onFogBlockAdd]);
  const onFogBlockDeleteRef = useRef(onFogBlockDelete);
  useEffect(() => { onFogBlockDeleteRef.current = onFogBlockDelete; }, [onFogBlockDelete]);
  const onFogBlockRevealRef = useRef(onFogBlockReveal);
  useEffect(() => { onFogBlockRevealRef.current = onFogBlockReveal; }, [onFogBlockReveal]);
  const onFogBlockHideRef = useRef(onFogBlockHide);
  useEffect(() => { onFogBlockHideRef.current = onFogBlockHide; }, [onFogBlockHide]);
  // Polygon fog block drawing: freeform {x,y} map-pixel points
  const [fogPolyPoints, setFogPolyPoints] = useState([]);
  const fogPolyRef = useRef([]);
  const [fogCursorGrid, setFogCursorGrid] = useState(null); // {x,y} cursor in map space
  const [fogBlockMenu, setFogBlockMenu] = useState(null); // { id, is_revealed, clientX, clientY }
  const fogBlockMenuRef = useRef(null);
  const [doorMenu, setDoorMenu] = useState(null); // { door, clientX, clientY }
  const [portalMenu, setPortalMenu] = useState(null); // { portal, clientX, clientY }
  // GM ship removal menu. Two steps: pick how the ship goes, then say what
  // happens to anyone aboard — `pending` holds the chosen effect while the
  // crew question is on screen.
  const [shipMenu, setShipMenu] = useState(null); // { ship, clientX, clientY, pending }
  // Damage/repair amount typed into the ship menu. Kept outside the menu state
  // so it survives the menu closing — a GM hitting the same hull for 10 twice
  // shouldn't have to retype it.
  const [shipHpAmount, setShipHpAmount] = useState(10);
  const doorMenuRef = useRef(null);
  const portalMenuRef = useRef(null);

  // Refs so the animation loop can read the latest LoS/FoW state each frame
  // without being restarted on every change.
  const visPolysRef  = useRef([]);
  const fogOfWarRef  = useRef(fogOfWar);
  useEffect(() => { fogOfWarRef.current = fogOfWar; }, [fogOfWar]);

  const [featherZoneId, setFeatherZoneId] = useState(null);
  const [featherValue,  setFeatherValue]  = useState(0);
  useEffect(() => { if (activeTool !== 'zone-feather') setFeatherZoneId(null); }, [activeTool]);

  // Track which tokens were most recently moved so we can render them last
  // (i.e. on top) — keeps the moved token's HP card visible above neighbours
  // when several stack up. Bumps come from any source: local drag, socket
  // updates from another client. tokenZBumps is a stable Map of id → epoch
  // ms; the renderer sorts ascending so the freshest move ends up on top.
  const [tokenZBumps, setTokenZBumps] = useState(() => new Map());
  const prevTokenPosRef = useRef(new Map());
  useEffect(() => {
    const prev = prevTokenPosRef.current;
    const next = new Map();
    const bumps = [];
    for (const t of tokens) {
      const key = `${t.grid_col},${t.grid_row}`;
      next.set(t.id, key);
      const old = prev.get(t.id);
      if (old !== undefined && old !== key) bumps.push(t.id);
    }
    prevTokenPosRef.current = next;
    if (bumps.length > 0) {
      setTokenZBumps(prev => {
        const m = new Map(prev);
        const now = Date.now();
        for (const id of bumps) m.set(id, now + bumps.indexOf(id));
        return m;
      });
    }
  }, [tokens]);
  // Tokens standing on a level that isn't currently shown are physically under
  // the deck on screen, so they drop out entirely — not just visually, but for
  // vision and light too, which is why this sits upstream of everything.
  //
  // With no ships on the map this returns the SAME array reference it was
  // given, so every memo downstream keeps its identity and behaviour on an
  // ordinary map is bit-identical to before ships existed.
  // Which deck each ship shows THIS viewer.
  //
  // The GM's choice (map_ships.active_deck) is the default and what the TV and
  // everyone else sees. But a player whose own token is aboard follows their
  // token instead: taking the stairs below would otherwise drop them onto a
  // level nobody is showing, and they'd watch themselves vanish. Doing it
  // per-viewer rather than switching the ship for the table means one player
  // going below doesn't yank everyone else's screen down with them.
  const effectiveDeckIndex = useMemo(() => {
    const m = new Map(ships.map(s => [s.id, s.active_deck ?? 0]));
    if (isPlayer && playerTokenId != null) {
      const mine = tokens.find(t => t.id === playerTokenId);
      if (mine?.ship_id != null && m.has(mine.ship_id)) {
        m.set(mine.ship_id, mine.deck_index ?? 0);
      }
    }
    return m;
  }, [ships, isPlayer, playerTokenId, tokens]);

  // The viewer's own token, when they are aboard a given ship. Depth is drawn
  // relative to THIS: your deck is the one in focus, and anything below it is
  // the structure you are standing over.
  const ownAboard = useMemo(() => {
    if (!isPlayer || playerTokenId == null) return null;
    const t = tokens.find(x => x.id === playerTokenId);
    return t && t.ship_id != null ? t : null;
  }, [isPlayer, playerTokenId, tokens]);

  // Tokens on a deck below the viewer's are dimmed to match the blurred art
  // they are standing on. Konva filters live on the deck image, and tokens are
  // drawn in later layers entirely, so opacity is what carries depth for them.
  const tokenDepthOpacity = useMemo(() => {
    const out = new Map();
    if (!isPlayer || !ownAboard) return out;
    const vi = ownAboard.deck_index ?? 0;
    for (const t of tokens) {
      if (t.ship_id !== ownAboard.ship_id) continue;
      const di = t.deck_index ?? 0;
      if (di < vi) out.set(t.id, 0.4);
    }
    return out;
  }, [tokens, isPlayer, ownAboard]);

  // GM-only: show every level of every ship at once, the way a player sees a
  // ship they aren't aboard. Off by default — the deck buttons are how the GM
  // works one level at a time, and stacking piles three decks of crew onto the
  // same squares.
  // Which ships the GM has expanded to "all layers". Per ship instance, not
  // per session: two hulls on the same map are two different things to look
  // at, and opening one up to place crew shouldn't stack every deck of the
  // other one on top of itself.
  const [gmAllDecksShips, setGmAllDecksShips] = useState(() => new Set());
  const gmShowsAllDecks = useCallback(
    (shipId) => gmAllDecksShips.has(shipId),
    [gmAllDecksShips]
  );
  // Declared HERE, above deckVisibleTokens and deckLayersByShip which both read
  // it. It previously sat with the other ship state ~2500 lines further down;
  // `const` has no hoisting, so those memos hit the temporal dead zone and threw
  // "Cannot access before initialization" on the very first render — a blank app.

  const deckVisibleTokens = useMemo(() => {
    if (!ships.length) return tokens;
    return tokens.filter((t) => {
      if (t.ship_id == null) return true;
      if (!effectiveDeckIndex.has(t.ship_id)) return true;
      // Crew are visible on the same terms as the decks they stand on: from
      // your own deck you see your shipmates and anyone on the levels below
      // (dimmed by tokenDepthOpacity), but not the deck over your head. From
      // off the ship you see everybody, because you see every level. The GM
      // stays on one level at a time — see deckLayersByShip.
      const di = t.deck_index ?? 0;
      if (isPlayer && ownAboard) {
        if (ownAboard.ship_id !== t.ship_id) return true;
        return di <= (ownAboard.deck_index ?? 0);
      }
      if (isPlayer) return true;
      // GM: one level at a time unless they've asked to see the whole ship.
      return gmAllDecksShips.has(t.ship_id) || di === effectiveDeckIndex.get(t.ship_id);
    });
  }, [tokens, ships, effectiveDeckIndex, isPlayer, ownAboard, gmAllDecksShips]);

  // The deck currently drawn for each ship. Declared up here, not down with the
  // other ship state, because activeDeckByShipRef below captures it — `const`
  // has no hoisting, so a later declaration throws on every render.
  // A ship whose library was deleted has no decks left, so it resolves to null
  // and is skipped rather than throwing.
  const activeDeckByShip = useMemo(() => {
    const m = new Map();
    for (const s of ships) {
      const decks = s.decks || [];
      const idx = effectiveDeckIndex.get(s.id) ?? s.active_deck ?? 0;
      m.set(s.id, decks.find(d => d.deck_index === idx) || decks[0] || null);
    }
    return m;
  }, [ships, effectiveDeckIndex]);

  // Which decks of each ship to draw, and how far out of focus.
  //
  // Deck order runs BOTTOM-UP: a higher deck_index sits higher on the hull, so
  // the main deck is the floor and the smaller decks stack above it.
  //
  //   * Aboard this ship  — your own deck sharp, every deck below it blurred by
  //     distance so the hull reads as having depth, and nothing above it drawn
  //     at all. You are underneath those, and drawing them would just paste a
  //     ceiling over the deck you are standing on.
  //   * Not aboard        — every deck stacked, no blur. From outside, the ship
  //     is one object.
  //
  // The GM keeps the single-deck view they already had: the deck buttons are
  // how they choose a level to place tokens on, and stacking every deck would
  // pile crew from three levels onto the same squares to click through.
  const deckLayersByShip = useMemo(() => {
    const out = new Map();
    for (const s of ships) {
      const decks = (s.decks || []).slice().sort((a, b) => a.deck_index - b.deck_index);
      if (!decks.length) { out.set(s.id, []); continue; }
      if (!isPlayer && !gmAllDecksShips.has(s.id)) {
        // One level at a time, plus the sails so the GM sees the ship as the
        // table does. The sails sit above everything, being outside the hull.
        const one = activeDeckByShip.get(s.id);
        const sails = decks.filter(d => d.is_sails);
        out.set(s.id, [...(one ? [{ deck: one, blur: 0 }] : []), ...sails.map(d => ({ deck: d, blur: 0 }))]);
        continue;
      }
      if (!isPlayer || !ownAboard || ownAboard.ship_id !== s.id) {
        // Seen from outside: every layer stacked, sails included, no blur.
        out.set(s.id, decks.map(d => ({ deck: d, blur: 0 })));
        continue;
      }
      const vi = ownAboard.deck_index ?? 0;
      out.set(s.id, decks
        // Aboard: your deck and the ones below it. Sails are dropped — from on
        // deck they'd be drawn over the level you're standing on.
        .filter(d => !d.is_sails && d.deck_index <= vi)
        .map(d => ({
          deck: d,
          // Further down = softer, so two decks below reads as further away
          // than one. Capped so a tall hull doesn't dissolve into fog.
          blur: d.deck_index === vi ? 0 : Math.min(8, 3 + (vi - d.deck_index) * 2),
        })));
    }
    return out;
  }, [ships, isPlayer, ownAboard, activeDeckByShip, gmAllDecksShips]);


  // Sort once per (tokens, tokenZBumps) change — each layer used to
  // recall sortedTokens and burn an O(n log n) every render.
  const sortedTokens = useMemo(() => {
    return [...deckVisibleTokens].sort((a, b) => {
      const ab = tokenZBumps.get(a.id);
      const bb = tokenZBumps.get(b.id);
      if (ab == null && bb == null) return 0;
      if (ab == null) return -1;
      if (bb == null) return 1;
      return ab - bb;
    });
  }, [deckVisibleTokens, tokenZBumps]);
  const [stageSize, setStageSize] = useState({ w: 800, h: 600 });

  // Force fog/glow canvases to redraw when the browser tab becomes visible again.
  // Browsers can clear canvas contents when a tab is hidden under memory pressure.
  const [visibilityTick, setVisibilityTick] = useState(0);
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') setVisibilityTick(n => n + 1);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  // Stage transform — kept in both refs (for handlers) and state (for rendering)
  const scaleRef = useRef(1);
  const posRef   = useRef({ x: 0, y: 0 });
  const [scale, _setScale] = useState(1);
  const [pos,   _setPos]   = useState({ x: 0, y: 0 });
  const setScale = (s) => { scaleRef.current = s; _setScale(s); };
  const setPos   = (p) => { posRef.current = p;   _setPos(p); };

  // ── Followed camera ──────────────────────────────────────────────────────
  //
  // When the GM is projecting the map, followers don't get sent a raw
  // {x, y, scale}: the GM's window is a different shape from a player's laptop
  // and a TV, and the same transform on a different viewport frames a
  // different piece of map. Instead the GM sends the map RECTANGLE they can
  // see, and each follower fits that rectangle into whatever viewport it has.
  //
  // The fit is "contain", so a follower whose window is a different aspect sees
  // the GM's whole region plus a little extra around it — never less than the
  // GM meant them to see.
  const isFollowingCamera = !!cameraRect;
  // Handlers below are registered once and read live state through refs.
  const isFollowingRef = useRef(isFollowingCamera);
  useEffect(() => { isFollowingRef.current = isFollowingCamera; }, [isFollowingCamera]);
  useEffect(() => {
    if (!cameraRect) return;
    const { w: sw, h: sh } = stageSize;
    if (sw <= 0 || sh <= 0) return;
    const rw = Number(cameraRect.w) || 0, rh = Number(cameraRect.h) || 0;
    if (rw <= 0 || rh <= 0) return;
    const s = Math.min(sw / rw, sh / rh);
    setScale(s);
    setPos({
      x: sw / 2 - Number(cameraRect.cx) * s,
      y: sh / 2 - Number(cameraRect.cy) * s,
    });
  }, [cameraRect, stageSize]);

  // Report this client's visible rectangle so the GM can broadcast it. Sent on
  // a trailing rAF rather than per pointer event, so a drag across the map is
  // a stream of frames instead of a stream of socket writes.
  const onCameraRectRef = useRef(onCameraRect);
  useEffect(() => { onCameraRectRef.current = onCameraRect; }, [onCameraRect]);
  const camReportRaf = useRef(0);
  useEffect(() => {
    if (!onCameraRect) return;
    if (stageSize.w <= 0 || stageSize.h <= 0 || !(scale > 0)) return;
    cancelAnimationFrame(camReportRaf.current);
    camReportRaf.current = requestAnimationFrame(() => {
      onCameraRectRef.current?.({
        cx: (stageSize.w / 2 - pos.x) / scale,
        cy: (stageSize.h / 2 - pos.y) / scale,
        w: stageSize.w / scale,
        h: stageSize.h / scale,
      });
    });
    return () => cancelAnimationFrame(camReportRaf.current);
  }, [onCameraRect, pos, scale, stageSize]);

  // Fit the entire map into view — fires whenever the map URL changes (new map loaded).
  // Reads the container's real pixel size via getBoundingClientRect so the calculation
  // is never based on the stateSize default of 800x600. stageSize is kept as a dep
  // so the effect re-runs once the ResizeObserver has measured the real size.
  const fittedMapUrlRef = useRef(null);
  useEffect(() => {
    // A followed camera owns the transform; fitting on top of it would
    // yank the view away from the GM's the moment a new map loads.
    if (isFollowingCamera) return;
    if (!fitToMap || !mapWidth || !mapHeight || !mapUrl) return;
    if (fittedMapUrlRef.current === mapUrl) return;
    const el = containerRef.current;
    if (!el) return;
    const { width: w, height: h } = el.getBoundingClientRect();
    if (w <= 0 || h <= 0) return;
    fittedMapUrlRef.current = mapUrl;
    // Wildspace fits to the live square count, not the stored pixel width —
    // the latter was frozen at the grid size in force when the map was made,
    // so it goes stale the moment the GM moves the grid-size slider. (mW/mH
    // are declared further down, so they can't be referenced from the deps.)
    const isWs = mapType === 'wildspace';
    const fitW = isWs && gridCols > 0 ? gridCols * gridSize : mapWidth;
    const fitH = isWs && gridRows > 0 ? gridRows * gridSize : mapHeight;
    const fitScale = Math.min((w * 0.9) / fitW, (h * 0.9) / fitH);
    setScale(fitScale);
    setPos({
      x: (w - fitW * fitScale) / 2,
      y: (h - fitH * fitScale) / 2,
    });
  }, [fitToMap, stageSize, mapWidth, mapHeight, mapUrl, mapType, gridCols, gridRows, gridSize, isFollowingCamera]);

  // Center the view on a given map point. The parent drives re-centring
  // by setting a *new* `centerOnMapPoint` reference each time it wants
  // a recentre — initial load AND after every map transition. Same-
  // reference re-renders don't trigger this since the dep is the
  // object identity.
  useEffect(() => {
    if (!centerOnMapPoint) return;
    if (stageSize.w <= 0 || stageSize.h <= 0) return;
    setPos({
      x: stageSize.w / 2 - centerOnMapPoint.x * scaleRef.current,
      y: stageSize.h / 2 - centerOnMapPoint.y * scaleRef.current,
    });
  }, [centerOnMapPoint, stageSize]);

  // Panning / measuring state (refs — mutated without re-render)
  const panning   = useRef(false);
  const panStart  = useRef({ cx: 0, cy: 0, sx: 0, sy: 0 });
  const pinchDist = useRef(0);
  const measuring = useRef(false);
  const [meas, setMeas] = useState(null);
  // The stroke currently under the cursor. Local until mouseup, so a drag
  // paints at screen framerate without a socket round trip per point.
  const [inkDraft, setInkDraft] = useState(null);
  const inking = useRef(false);
  const onDrawStrokeRef = useRef(onDrawStroke);
  useEffect(() => { onDrawStrokeRef.current = onDrawStroke; }, [onDrawStroke]);
  const onDrawUndoRef = useRef(onDrawUndo);
  useEffect(() => { onDrawUndoRef.current = onDrawUndo; }, [onDrawUndo]);
  const onMeasureChangeRef = useRef(onMeasureChange);
  useEffect(() => { onMeasureChangeRef.current = onMeasureChange; }, [onMeasureChange]);
  useEffect(() => { onMeasureChangeRef.current?.(meas); }, [meas]);

  // Token drag
  const tokenDragRef = useRef(null); // { tokenIds[], origPositions Map<id,{col,row}>, startMapX, startMapY }
  const [dragVis, setDragVis] = useState(null); // { positions: Map<tokenId, {x,y}> }
  // The movement cap for the drag that is starting, in feet, or null when
  // nothing is being enforced.
  //
  // Resolved once at mousedown rather than per pointer move: the window is
  // six seconds and a drag is shorter than that, so re-reading it mid-drag
  // would only introduce a limit that moves under the hand. Players only —
  // the GM is adjudicating and is never capped.
  const moveCapRef = useRef(null);
  const resolveMoveCap = useCallback((tokenId) => {
    if (!sneakMode) { moveCapRef.current = null; return; }
    const tk = (tokensRef.current || []).find((t) => t.id === tokenId);
    // WHICH TOKENS ARE CAPPED
    //
    // Anything flagged as sneaking, for whoever is dragging it — including the
    // GM. This started out as players-only, which was right on paper and wrong
    // in practice: the GM runs the sequence from the DM view, drags the party's
    // tokens themselves half the time, and testing the feature at all meant
    // opening a player preview. A cap nobody running the game can see is a cap
    // nobody trusts.
    //
    // The escape hatch is the flag itself: turn Sneak off for that token, or
    // end the sequence, and the drag is free again. The server still never
    // REFUSES a GM's move, so this can only ever slow them down, not block
    // them.
    if (!tk || !tk.sneaking) { moveCapRef.current = null; return; }
    moveCapRef.current = moveRemainingFt(tk, sneakRoundAtRef.current).remaining;
  }, [sneakMode]);
  // Read through a ref so the cap resolver is not rebuilt every round tick.
  const sneakRoundAtRef = useRef(sneakRoundAt);
  useEffect(() => { sneakRoundAtRef.current = sneakRoundAt; }, [sneakRoundAt]);

  // Cut a drag delta down to what the token can still afford this round.
  //
  // ONE function for every path that turns a pointer position into a token
  // position — the live drag, the mouse drop, and both touch equivalents. It
  // was originally written inline in the move handler only, so the token was
  // clamped on screen and then dropped wherever the cursor actually was: the
  // cap looked like it worked right up until you let go, which is worse than
  // no cap at all.
  //
  // Returns the delta unchanged when nothing is being enforced.
  const clampDragDelta = useCallback((dxMap, dyMap) => {
    const capFt = moveCapRef.current;
    if (capFt == null) return [dxMap, dyMap];
    const gs = gridSizeRef.current || 50;
    const sq = Math.max(Math.abs(dxMap), Math.abs(dyMap)) / gs;
    const maxSq = capFt / FEET_PER_SQUARE;
    if (sq <= maxSq || sq < 1e-6) return [dxMap, dyMap];
    const k = maxSq / sq;
    return [dxMap * k, dyMap * k];
  }, []);


  // Where the crew are while their ship is being dragged or turned, as
  // Map<tokenId, {x,y}> in map pixels. The server owns crew positions and
  // re-projects them on release, but that leaves the whole turn showing the
  // hull swinging out from under tokens standing still on it. This previews
  // the same projection locally, one frame at a time, and is thrown away the
  // moment the authoritative positions land.
  const [crewVis, setCrewVis] = useState(null);
  // Set on release: the preview stays up until the patched tokens arrive, so
  // there's no frame where the crew snap back before jumping forward again.
  const crewVisPendingRef = useRef(false);
  const [multiSelected, setMultiSelected] = useState(() => new Set());
  // Mousedown is attached once with an empty-deps effect, so reading
  // `multiSelected` directly there sees a stale empty Set. Mirror it into a
  // ref that the handler can dereference for the current value.
  const multiSelectedRef = useRef(multiSelected);
  useEffect(() => { multiSelectedRef.current = multiSelected; }, [multiSelected]);
  const marqueeRef = useRef(null); // { startX, startY, additive }
  const [marqueeRect, setMarqueeRect] = useState(null); // { x, y, w, h }
  const templateDrawRef = useRef(null);
  const templateMoveRef = useRef(null); // { id, origPoints, startMapX, startMapY }
  const [templatePreview, setTemplatePreview] = useState(null);
  const [stairPreview, setStairPreview] = useState(null);
  const [templateMovePreview, setTemplateMovePreview] = useState(null); // { id, points }
  const onTemplatePlaceRef  = useRef(onTemplatePlace);
  const onTemplateDeleteRef = useRef(onTemplateDelete);
  const onTemplateUpdateRef = useRef(onTemplateUpdate);
  const onTemplateSelectRef = useRef(onTemplateSelect);
  useEffect(() => { onTemplatePlaceRef.current  = onTemplatePlace;  }, [onTemplatePlace]);
  useEffect(() => { onTemplateDeleteRef.current = onTemplateDelete; }, [onTemplateDelete]);
  useEffect(() => { onTemplateUpdateRef.current = onTemplateUpdate; }, [onTemplateUpdate]);
  useEffect(() => { onTemplateSelectRef.current = onTemplateSelect; }, [onTemplateSelect]);

  // Wall drawing
  const wallDrawRef  = useRef(null);  // { type, startX, startY } for line/rect/circle
  const polyDrawRef  = useRef(null);  // [x1,y1,...] for in-progress polygon
  const [wallPreview, setWallPreview] = useState(null);

  // Light drawing
  const lightDrawRef = useRef(null);  // { startX, startY }
  const [lightPreview, setLightPreview] = useState(null); // { cx, cy, brightR }

  // Magical darkness drawing
  const darknessDrawRef = useRef(null); // { startX, startY } for circle draw
  const [darknessPreview, setDarknessPreview] = useState(null); // { cx,cy,r } or { isPolygon, points, cursorX, cursorY }
  const darkPolyDrawRef = useRef(null);  // [x1,y1,...] for in-progress polygon
  const darkPolyToolRef = useRef('darkness'); // tracks whether it's a fog or darkness polygon

  const wallsRef        = useRef(walls);
  const doorsRef        = useRef(doors);
  const lightsRef       = useRef(lights);
  const magicalDarknessRef = useRef(magicalDarkness);
  const onWallAddRef    = useRef(onWallAdd);
  const onWallDeleteRef = useRef(onWallDelete);
  const onDoorAddRef    = useRef(onDoorAdd);
  const onDoorDeleteRef = useRef(onDoorDelete);
  const isPlayerRef = useRef(isPlayer);
  useEffect(() => { isPlayerRef.current = isPlayer; }, [isPlayer]);
  const onDoorToggleRef = useRef(onDoorToggle);
  const onDoorFlipRef   = useRef(onDoorFlip);
  const onDoorSpriteSetRef = useRef(onDoorSpriteSet);
  useEffect(() => { onDoorSpriteSetRef.current = onDoorSpriteSet; }, [onDoorSpriteSet]);
  const onLightAddRef    = useRef(onLightAdd);
  const onLightDeleteRef = useRef(onLightDelete);
  const onLightSelectRef = useRef(onLightSelect);
  const activeLightSpreadRef = useRef(activeLightSpread);
  const onMagicalDarknessAddRef    = useRef(onMagicalDarknessAdd);
  const onMagicalDarknessDeleteRef = useRef(onMagicalDarknessDelete);
  const onSetSpawnPointRef = useRef(onSetSpawnPoint);
  const portalsRef        = useRef(portals);
  const onPortalUseRef    = useRef(onPortalUse);
  const onPortalPlaceRef  = useRef(onPortalPlace);
  const onPortalEraseRef  = useRef(onPortalErase);
  const onPortalUpdateRef = useRef(onPortalUpdate);
  const onPortalPairUpdateRef = useRef(onPortalPairUpdate);
  useEffect(() => { portalsRef.current       = portals;       }, [portals]);
  useEffect(() => { onPortalUseRef.current   = onPortalUse;   }, [onPortalUse]);
  useEffect(() => { onPortalPlaceRef.current = onPortalPlace; }, [onPortalPlace]);
  useEffect(() => { onPortalEraseRef.current = onPortalErase; }, [onPortalErase]);
  useEffect(() => { onPortalUpdateRef.current = onPortalUpdate; }, [onPortalUpdate]);
  useEffect(() => { onPortalPairUpdateRef.current = onPortalPairUpdate; }, [onPortalPairUpdate]);
  useEffect(() => { wallsRef.current        = walls;       }, [walls]);
  useEffect(() => { doorsRef.current        = doors;       }, [doors]);
  useEffect(() => { lightsRef.current       = lights;      }, [lights]);
  useEffect(() => { onWallAddRef.current    = onWallAdd;   }, [onWallAdd]);
  useEffect(() => { onWallDeleteRef.current = onWallDelete; }, [onWallDelete]);
  useEffect(() => { onDoorAddRef.current    = onDoorAdd;   }, [onDoorAdd]);
  useEffect(() => { onDoorDeleteRef.current = onDoorDelete; }, [onDoorDelete]);
  useEffect(() => { onDoorToggleRef.current = onDoorToggle; }, [onDoorToggle]);
  useEffect(() => { onDoorFlipRef.current   = onDoorFlip;  }, [onDoorFlip]);
  useEffect(() => { onLightAddRef.current    = onLightAdd;    }, [onLightAdd]);
  useEffect(() => { onLightDeleteRef.current = onLightDelete; }, [onLightDelete]);
  useEffect(() => { onLightSelectRef.current = onLightSelect; }, [onLightSelect]);
  useEffect(() => { activeLightSpreadRef.current = activeLightSpread; }, [activeLightSpread]);
  useEffect(() => { onMagicalDarknessAddRef.current    = onMagicalDarknessAdd;    }, [onMagicalDarknessAdd]);
  useEffect(() => { onMagicalDarknessDeleteRef.current = onMagicalDarknessDelete; }, [onMagicalDarknessDelete]);
  useEffect(() => { onSetSpawnPointRef.current = onSetSpawnPoint; }, [onSetSpawnPoint]);

  // Cancel in-progress wall draw when tool changes away from wall tools
  useEffect(() => {
    if (!WALL_DRAW_TOOLS.has(activeTool)) {
      if (polyDrawRef.current) {
        const pts = polyDrawRef.current;
        if (pts.length >= 6) onWallAddRef.current?.({ type: 'polygon', points: pts });
        polyDrawRef.current = null;
      }
      wallDrawRef.current = null;
      setWallPreview(null);
    }
  }, [activeTool]);

  // Discard a spawn polygon mid-draw if the GM picks a different tool.
  useEffect(() => {
    if (activeTool !== 'spawn-named') {
      spawnPolyDrawRef.current = null;
      setSpawnPolyPreview(null);
    }
  }, [activeTool]);

  // Cancel in-progress light draw when tool changes away from light tools
  useEffect(() => {
    if (!LIGHT_DRAW_TOOLS.has(activeTool)) {
      lightDrawRef.current = null;
      setLightPreview(null);
    }
  }, [activeTool]);

  // Cancel in-progress darkness draw when tool changes away from darkness tools
  useEffect(() => {
    if (!DARKNESS_DRAW_TOOLS.has(activeTool)) {
      darknessDrawRef.current = null;
      darkPolyDrawRef.current = null;
      setDarknessPreview(null);
    }
  }, [activeTool]);

  // Cancel in-progress fog polygon when tool changes
  useEffect(() => {
    if (activeTool !== 'fog-block') {
      setFogPolyPoints([]);
      fogPolyRef.current = [];
      setFogCursorGrid(null);
    }
  }, [activeTool]);

  useEffect(() => {
    if (!TEMPLATE_TOOLS.has(activeTool)) {
      templateDrawRef.current = null;
      setTemplatePreview(null);
    }
    if (activeTool !== 'tpl-edit') {
      templateMoveRef.current = null;
      setTemplateMovePreview(null);
    }
    if (activeTool !== 'move') {
      marqueeRef.current = null;
      setMarqueeRect(null);
    }
  }, [activeTool]);


  // Natural image dims
  const [imgDims, setImgDims] = useState(null);
  const onDims = useCallback((w, h) => setImgDims({ w, h }), []);
  useEffect(() => { setImgDims(null); }, [mapUrl]);
  useEffect(() => { if (!MEASURE_TOOLS.has(activeTool)) setMeas(null); }, [activeTool]);
  useEffect(() => { if (activeTool !== 'draw') { inking.current = false; setInkDraft(null); } }, [activeTool]);

  const isWildspace = mapType === 'wildspace';
  // A TILE map is measured by its ROW, never by its picture.
  //
  // Everywhere else the image is the authority: a battlemap's art is the board
  // and the stored width/height may be a placeholder, so imgDims wins. A tile
  // map is the other way round — the board is a lattice that GROWS as cards are
  // laid, and its ground image is a flat field generated from those numbers.
  // Trusting the picture there means trusting a stale copy of the answer.
  //
  // This was not cosmetic. mW/mH bound the visibility polygon, so on a board
  // that had outgrown its image every player standing beyond the ORIGINAL
  // rectangle got a polygon clipped to nothing: the fog was never punched
  // through and the flat map was black. The server now repaints the field when
  // the board grows; this makes the client right even when it has not, and for
  // any map still serving an image from a cache.
  const isTileMap = mapType === 'tiles';
  // Wildspace ignores imgDims entirely — it never renders MapImage, so imgDims
  // stays null anyway, but reading the square counts directly makes the intent
  // explicit and survives anyone adding another dims source later. Deriving
  // from cols*gridSize also keeps the grid landing exactly on the map bounds,
  // which makes offsetX/offsetY below fall out to 0.
  const mW = (isWildspace ? (gridCols > 0 ? gridCols * gridSize : mapWidth)
    : isTileMap ? (mapWidth || imgDims?.w)
    : imgDims?.w || mapWidth) || 2000;
  const mH = (isWildspace ? (gridRows > 0 ? gridRows * gridSize : mapHeight)
    : isTileMap ? (mapHeight || imgDims?.h)
    : imgDims?.h || mapHeight) || 1500;

  // Grid offset — center the grid so partial cells are equal on all sides
  const offsetX = gridSize > 0 ? (mW % gridSize) / 2 : 0;
  const offsetY = gridSize > 0 ? (mH % gridSize) / 2 : 0;

  // Hex maps only change what's drawn and where a click drops a token; every
  // other consumer of offsetX/offsetY/gridSize is unaffected.
  const isHexGrid = gridType === 'hex';
  const mapScale = useMemo(() => scaleOf(gridScale, gridUnit), [gridScale, gridUnit]);

  // A darkness zone attached to a token travels with it: rewrite its centre
  // from the token's current position before anything downstream (vision
  // polygons, rendering) reads the list. Zones with no attachment pass
  // through untouched.
  const resolvedDarkness = useMemo(() => {
    const list = magicalDarkness || [];
    if (!list.some((dz) => dz.attached_token_id)) return list;
    return list.map((dz) => {
      if (!dz.attached_token_id) return dz;
      const tk = (tokens || []).find((t) => t.id === dz.attached_token_id);
      if (!tk) return dz;
      const sz = tokenFootprint(tk);
      return {
        ...dz,
        x: offsetX + Number(tk.grid_col) * gridSize + (sz.gridW * gridSize) / 2,
        y: offsetY + Number(tk.grid_row) * gridSize + (sz.gridH * gridSize) / 2,
      };
    });
  }, [magicalDarkness, tokens, offsetX, offsetY, gridSize]);

  useEffect(() => { magicalDarknessRef.current = resolvedDarkness; }, [resolvedDarkness]);

  // What the scene's geometry actually IS, as strings.
  //
  // The arrays these describe are rebuilt by the parent on every render:
  // PlayerView filters walls, doors and lights by storey in its render body,
  // below its early returns, where a hook cannot go (see the comment there —
  // memoising at that depth once crashed the player view with "rendered more
  // hooks than during the previous render"). So `walls` is a NEW array twice a
  // second while a patrol runs, holding exactly the same walls.
  //
  // `visPolys` listed those arrays, so it recomputed every time: raycasting
  // every wall for every seeing token and every light. Measured on an M1 in the
  // live session, that was 200–550ms of blocked main thread per step — which is
  // the stutter, in BOTH views. The 3D camera hung because nothing could run,
  // not because anything in the 3D view was rebuilding.
  //
  // `visTokenSig` below is the same idea for tokens, and it was powerless on its
  // own: a dependency list is an AND, and one unstable entry spoils it.
  // `points` and `type` are what los.js reads — wallToSegments, windowData and
  // ledgeData between them touch nothing else — plus the storey and height the
  // callers filter on. Checked against those functions rather than guessed: a
  // field missing here is a wall edit that never reaches the screen.
  const wallsSig = useMemo(
    () => JSON.stringify((walls || []).map(w => [w.id, w.points, w.type, w.height_ft, w.level_index])),
    [walls],
  );
  const lightsSig = useMemo(
    () => JSON.stringify((lights || []).map(l => [
      l.id, l.x, l.y, l.bright_radius, l.dim_radius, l.color, l.direction, l.spread_angle, l.flicker, l.level_index,
    ])),
    [lights],
  );
  const darknessSig = useMemo(
    () => JSON.stringify((resolvedDarkness || []).map(d => [
      d.id, d.zone_type, d.shape, d.x, d.y, d.radius, d.poly_points, d.level_index,
    ])),
    [resolvedDarkness],
  );
  // fogBlocksToSegments walks `points` and skips anything revealed.
  const fogBlocksSig = useMemo(
    () => JSON.stringify((fogBlocks || []).map(f => [f.id, f.points, f.is_revealed, f.level_index])),
    [fogBlocks],
  );


  // Stable object ref — prevents Token memo from seeing a new object on every render
  const tokenOffset = useMemo(() => ({ x: offsetX, y: offsetY }), [offsetX, offsetY]);

  // Derive vision origins. Player view: their own token plus any familiar
  // they're currently seeing through. Spectator view (TV): the union of every
  // player token (and bound familiar) on the current map — the audience-facing
  // display reveals everything any party member can see.
  // What vision actually depends on, as a string.
  //
  // `visOrigins` and `visPolys` both listed `tokens` as a dependency, so ANY
  // token changing rebuilt them — and rebuilding them means raycasting every
  // wall on the map for every seeing token and every light. A patrolling guard
  // moves four times a second and is usually not a vision source at all, so the
  // client was recomputing the entire visibility solution four times a second to
  // arrive at the same answer. That is the jank behind "still jumpy": the tween
  // was fine, the main thread was busy.
  //
  // Depending on this signature instead means a token that neither sees nor
  // carries a light costs nothing when it moves.
  const visTokenSig = useMemo(
    () => visionSignature(tokens, { fogOfWar, isSpectator, playerTokenId, visionTokenIds }),
    [fogOfWar, tokens, isSpectator, playerTokenId, visionTokenIds]
  );

  const visOrigins = useMemo(() => {
    if (!fogOfWar || !tokens) return [];
    function originsForToken(t) {
      if (!t) return [];
      const sz = tokenFootprint(t);
      const cx = offsetX + Number(t.grid_col) * gridSize + (sz.gridW * gridSize) / 2;
      const cy = offsetY + Number(t.grid_row) * gridSize + (sz.gridH * gridSize) / 2;
      const sensesArr = Array.isArray(t.senses) && t.senses.length > 0
        ? t.senses
        : [{ type: t.vision_type || 'normal', range: t.vision_range || 0 }];
      return sensesArr.map(s => ({
        x: cx, y: cy,
        visionType: s.type || 'normal',
        visionRangePx: (s.range || 0) > 0 ? (s.range) * (gridSize / 5) : 0,
      }));
    }
    if (isSpectator) {
      return (tokens || [])
        .filter(t => (t.is_player || t.familiar_of) && !t.is_hidden)
        .flatMap(originsForToken);
    }
    if (!playerTokenId && visionTokenIds.length === 0) return [];
    const ids = new Set([playerTokenId, ...visionTokenIds].filter(id => id != null));
    return (tokens || []).filter(t => ids.has(t.id)).flatMap(originsForToken);
    // `tokens` is read above but deliberately NOT a dependency: visTokenSig is
    // the part of it this memo's answer can change with.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fogOfWar, isSpectator, playerTokenId, visionTokenIds, visTokenSig, offsetX, offsetY, gridSize]);

  // Visibility polygons for fog of war — per-origin, pass-based rendering.
  //
  // Each entry: { pts, passes }
  //   pts    – flat [x,y,...] LOS polygon (used for label visibility too)
  //   passes – ordered rendering passes, each clipping the LOS polygon to a
  //            specific illuminated area:
  //     { kind:'full',  alpha }                — entire LOS polygon
  //     { kind:'range', alpha, ox, oy, r }     — LOS ∩ vision-range circle
  //     { kind:'light', alpha, lx, ly, lr }    — LOS ∩ light-source circle
  //
  // Vision × ambient light matrix:
  //   bright  → everyone sees full LOS (light sources irrelevant)
  //   dim     → normal: half-alpha full + bright-zone upgrades from lights
  //             darkvision/truesight: full LOS full-alpha
  //             blindsight: range-clipped full-alpha
  //   dark    → normal: only light-source circles visible (dim ring α0.5, bright ring α1)
  //             darkvision: range-clipped half-alpha + bright-zone upgrades from lights
  //             truesight: full LOS full-alpha
  //             blindsight: range-clipped full-alpha
  // Tremorsense: detect non-flying grounded tokens within range as blips.
  // Does not contribute to FoW reveals — handled separately from visPolys.
  // Position-keyed LOS polygon cache. Recomputing LOS for every light on every
  // render is the single most expensive thing this component does — and a token
  // HP/initiative tick produces a new `tokens` array, invalidating any naive
  // useMemo that depends on tokens. The cache survives across renders and is
  // invalidated only when walls, doors, or map dimensions actually change, so
  // light sources whose position hasn't moved hit the cache instead of paying
  // for a fresh raycast.
  const losCacheRef = useRef({ key: '', polys: new Map() });
  // `bucket` names the occluder set the caller is passing. Callers use
  // DIFFERENT segment lists — the vision pass occludes on walls + doors, the
  // glow pass adds fog blocks on top — so keying on position alone let
  // whichever pass ran first win, and the other silently reused a polygon
  // built from occluders it never asked for. That showed up as one light's
  // clip appearing to affect unrelated lights.
  function getCachedLightPoly(x, y, segs, cacheKey, bucket = 'default') {
    const cache = losCacheRef.current;
    if (cache.key !== cacheKey) {
      cache.polys.clear();
      cache.key = cacheKey;
    }
    // Round to 1px to dedupe near-identical positions; full px precision is
    // overkill for visibility computation.
    const k = `${bucket}|${Math.round(x)}|${Math.round(y)}`;
    let pts = cache.polys.get(k);
    if (pts) {
      // Re-insert so the eviction below is LRU rather than FIFO. A plain FIFO
      // evicted the entries the very next pass was about to ask for, so once
      // the working set crossed the cap NOTHING hit the cache and every render
      // paid a full raycast per light — the difference between a warm frame
      // and a second of frozen UI.
      cache.polys.delete(k);
      cache.polys.set(k, pts);
      return pts;
    }
    pts = computeVisibilityPolygon(x, y, segs, mW, mH);
    cache.polys.set(k, pts);
    // Cap cache to avoid unbounded growth during heavy token drags. Sized to
    // comfortably hold both buckets' worth of lights on a busy map.
    if (cache.polys.size > LOS_CACHE_MAX) {
      const firstKey = cache.polys.keys().next().value;
      cache.polys.delete(firstKey);
    }
    return pts;
  }

  // Door sprite images, cached by sprite_path. Declared above the LOS memos
  // because a sprite's aspect ratio is what sets the door's occluder thickness.
  const [doorSpriteImages, setDoorSpriteImages] = useState({});
  useEffect(() => {
    let cancelled = false;
    for (const d of doors) {
      const p = d.sprite_path;
      if (!p || doorSpriteImages[p]) continue;
      const img = new window.Image();
      img.src = `/uploads/${p}`;
      img.onload = () => { if (!cancelled) setDoorSpriteImages((prev) => ({ ...prev, [p]: img })); };
    }
    return () => { cancelled = true; };
    // `doors`, not doorsKey: that is declared BELOW this effect, and a dep array
    // is evaluated during render, so naming it here is a ReferenceError on the
    // first one. The body is a loop with an immediate `continue` for every
    // sprite already loaded, so re-running it costs nothing worth untangling
    // the declaration order for.
  }, [doors]); // eslint-disable-line react-hooks/exhaustive-deps
  // Ref mirror so the fog RAF loop can read loaded sprites without re-subscribing.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const windowSegs = useMemo(
    () => (walls || []).map(w => windowData(w)).filter(Boolean),
    [wallsSig],
  );

  const doorSpriteImagesRef = useRef(doorSpriteImages);
  useEffect(() => { doorSpriteImagesRef.current = doorSpriteImages; }, [doorSpriteImages]);

  // Thickness of a door's art in map px. 0 for schematic doors (and for sprite
  // doors whose art hasn't loaded yet), which occlude on their centreline as
  // before; a loaded sprite occludes at the far edge of its own panel instead.
  const doorThicknessOf = useCallback((door) => {
    if (!door.sprite_path) return 0;
    const img = doorSpriteImages[door.sprite_path];
    if (!img || !img.width || !img.height) return 0;
    const p = door.points;
    if (!p || p.length < 4) return 0;
    const len = Math.hypot(p[2] - p[0], p[3] - p[1]);
    return len * (img.height / img.width);
  }, [doorSpriteImages]);

  // Shared cache-key fragment for doors. Includes occluder thickness so every
  // cached LOS polygon is rebuilt once a sprite finishes loading.
  const doorsKey = useMemo(
    // The POINTS, not their count. This key is now what the vision passes depend
    // on in place of the `doors` array, and a door dragged to a new position
    // keeps its point count — so a length would have left the old sightlines
    // cached and the new doorway shut.
    () => doors.map(d => `${d.id}:${d.is_open}:${d.open_dir}:${d.sprite_motion || ''}:${d.portal_kind || 'door'}:${Math.round(doorThicknessOf(d))}:${JSON.stringify(d.points || [])}`).join(','),
    [doors, doorThicknessOf],
  );

  // Cache key for LOS polygons — only walls, doors, and map dims affect LOS.
  // Shared by every consumer so they all hit the same cache generation.
  // wallsSig rather than a count of points, for the reason given on doorsKey:
  // a wall MOVED without gaining or losing a point would have gone on serving
  // the polygon it cast from where it used to be.
  const losCacheKey = useMemo(
    () => `${walls.length}#${wallsSig}#${doorsKey}#${mW}x${mH}`,
    [walls.length, wallsSig, doorsKey, mW, mH],
  );

  // Door occluders are viewer-relative (see doorToSegments) so a door never
  // shadows its own art — rebuilt per vision origin and per light.
  const doorSegsFrom = useCallback(
    (ox, oy) => doorsToSegments(doors, { ox, oy, thicknessOf: doorThicknessOf }),
    [doors, doorThicknessOf],
  );

  // Guard cones — the GM's read on what a sentry can actually see.
  //
  // Only for tokens the GM has actually given an arc to. `vision_arc` defaults
  // to 360, so this list is empty until somebody starts pointing guards in
  // directions, and a board with no sneaking on it pays nothing.
  //
  // CLIPPED TO REAL LINE OF SIGHT, not drawn as a bare wedge. A cone that lies
  // across a wall tells the GM a guard can see into the next room, which is the
  // opposite of what the engine will decide — and the GM is adjudicating from
  // this picture. Cost is bounded by the same thing that bounds the list: one
  // visibility polygon per coned guard, memoised on the geometry and on where
  // the guards are standing, which is the same shape of work the fog already
  // does per player. (See los.js — computeVisibilityPolygon has been the hot
  // spot in this app before, so it is deliberately not run per frame here.)
  // Guard cones — the GM's read on what a sentry can actually see.
  //
  // ONE SHAPE PER SENSE, not per token. A creature is usually several sensors
  // at once and they do not share a shape: a guard dog watches a wedge in front
  // of it and hears in every direction. Drawing only the widest, or only the
  // first, hid exactly the sense the party was about to walk into.
  //
  // Nothing is drawn for a sense that is both all-round AND unlimited, because
  // there is no shape to draw — which is every token until the GM starts
  // setting arcs, so a board with no sneaking on it pays nothing.
  //
  // CLIPPED TO REAL LINE OF SIGHT. A cone lying across a wall tells the GM a
  // guard can see into the next room, which is the opposite of what the engine
  // decides — and the GM is adjudicating from this picture. One visibility
  // polygon per coned token, memoised on the geometry and on where the guards
  // are standing; the same shape of work the fog already does per player. (See
  // los.js — computeVisibilityPolygon has been the hot spot in this app before,
  // so it is deliberately not run per frame here.)
  const coneSig = useMemo(() => (tokens || [])
    .filter((t) => !t.is_player && !t.is_hidden)
    .map((t) => [t.id, t.grid_col, t.grid_row, t.facing, t.vision_arc, t.awareness,
                 t.vision_range, t.vision_type, JSON.stringify(t.senses || null)].join(':'))
    .join('|'), [tokens]);

  const guardCones = useMemo(() => {
    if (isPlayer || isSpectator || mW <= 0 || mH <= 0) return [];
    // Mirrors arcOf / NO_NATURAL_FRONT in backend/src/detection.js. The two
    // have to agree or this draws a shape the engine does not use.
    const noFront = (type) => type === 'blindsight' || type === 'tremorsense';
    const arcOf = (sn, t) => {
      if (sn.arc != null && Number.isFinite(Number(sn.arc))) return Number(sn.arc);
      if (noFront(sn.type)) return 360;
      const a = Number(t.vision_arc);
      return Number.isFinite(a) && a > 0 ? Math.min(360, a) : 360;
    };
    const pxPerFt = gridSize / 5;
    const wallSegs = wallsToSegments(walls);
    const out = [];

    for (const t of (tokens || [])) {
      if (t.is_player || t.is_hidden) continue;
      const senses = Array.isArray(t.senses) && t.senses.length
        ? t.senses
        : [{ type: t.vision_type || 'normal', range: Number(t.vision_range) || 0 }];

      const shapes = senses.map((sn) => ({
        arc: arcOf(sn, t),
        ft: Number(sn.range) || 0,
        type: sn.type || 'normal',
      })).filter((sh) => sh.arc < 360 || sh.ft > 0);
      if (!shapes.length) continue;
      // A directional sense needs a heading to be drawn from.
      if (shapes.some((sh) => sh.arc < 360) && t.facing == null
          && !shapes.some((sh) => sh.arc >= 360)) continue;

      const sz = tokenFootprint(t);
      const cx = offsetX + Number(t.grid_col) * gridSize + (sz.gridW * gridSize) / 2;
      const cy = offsetY + Number(t.grid_row) * gridSize + (sz.gridH * gridSize) / 2;
      const poly = computeVisibilityPolygon(cx, cy, [...wallSegs, ...doorSegsFrom(cx, cy)], mW, mH);

      for (const sh of shapes) {
        if (sh.arc < 360 && t.facing == null) continue;
        out.push({
          key: `${t.id}:${sh.type}:${sh.arc}:${sh.ft}`,
          cx, cy,
          // An unlimited directional sense has no radius to show, so it is
          // drawn at a readable length rather than off the edge of the board.
          radius: (sh.ft > 0 ? sh.ft : 60) * pxPerFt,
          facing: Number(t.facing) || 0,
          arc: sh.arc,
          awareness: t.awareness || 'unaware',
          // Blindsight and tremorsense are not sight, and a dashed edge says so
          // at a glance without needing a second colour.
          sensed: noFront(sh.type),
          poly,
        });
      }
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlayer, isSpectator, coneSig, losCacheKey, gridSize, offsetX, offsetY, mW, mH]);

  const visPolys = useMemo(() => {
    if (!fogOfWar || visOrigins.length === 0 || mW <= 0 || mH <= 0) return [];
    const wallSegs = wallsToSegments(walls);
    const ledges = (walls || []).map(w => ledgeData(w)).filter(Boolean);

    // Approximate each obscuring zone circle as 32 line segments so the
    // ray-casting LOS algorithm can treat the zone perimeter as an opaque wall.
    // Applies to both magical darkness and heavy obscuring fog.
    const darknessZones = (resolvedDarkness || []).filter(dz => dz.zone_type !== 'heavy-fog' && dz.zone_type !== 'water');
    const fogZones      = (resolvedDarkness || []).filter(dz => dz.zone_type === 'heavy-fog');

    function zoneToSegs(zones) {
      return zones.flatMap(dz => {
        if (dz.shape === 'polygon' && Array.isArray(dz.poly_points) && dz.poly_points.length >= 6) {
          const pts = dz.poly_points;
          const n = pts.length / 2;
          return Array.from({ length: n }, (_, i) => {
            const j = (i + 1) % n;
            return { ax: pts[i * 2], ay: pts[i * 2 + 1], bx: pts[j * 2], by: pts[j * 2 + 1] };
          });
        }
        const N = 32;
        const out = [];
        for (let i = 0; i < N; i++) {
          const a0 = (i / N) * Math.PI * 2;
          const a1 = ((i + 1) / N) * Math.PI * 2;
          out.push({
            ax: dz.x + Math.cos(a0) * dz.radius, ay: dz.y + Math.sin(a0) * dz.radius,
            bx: dz.x + Math.cos(a1) * dz.radius, by: dz.y + Math.sin(a1) * dz.radius,
          });
        }
        return out;
      });
    }
    const darknessSegs = zoneToSegs(darknessZones);
    // Fog zones are purely visual — they do NOT block LOS
    const offsetX = gridSize > 0 ? (mW % gridSize) / 2 : 0;
    const offsetY = gridSize > 0 ? (mH % gridSize) / 2 : 0;
    const fbSegs = fogBlocksToSegments(fogBlocks);

    // Build token-attached lights from tokens that have a light source equipped.
    // Positions mirror the token centre calculation used in visOrigins.
    const tokenLights = (tokens || []).flatMap(t => {
      const brightFt = Number(t.token_light_bright) || 0;
      const dimFt    = Number(t.token_light_dim)    || 0;
      if (brightFt <= 0 && dimFt <= 0) return [];
      const sz = tokenFootprint(t);
      const cx = offsetX + Number(t.grid_col) * gridSize + (sz.gridW * gridSize) / 2;
      const cy = offsetY + Number(t.grid_row) * gridSize + (sz.gridH * gridSize) / 2;
      const pxPerFt = gridSize / FEET_PER_SQUARE;
      return [{ x: cx, y: cy, bright_radius: brightFt * pxPerFt, dim_radius: dimFt * pxPerFt, flicker: t.token_light_flicker !== false }];
    });

    // Pre-compute each light source's own LOS polygon (walls/doors block light).
    // Reused across all player origins so we only compute it once per light.
    const allLights = [...lights, ...tokenLights];
    const lightPolys = allLights.map(l => ({
      l,
      pts: getCachedLightPoly(l.x, l.y, [...wallSegs, ...doorSegsFrom(l.x, l.y)], losCacheKey, 'vis'),
    }));

    return visOrigins.flatMap(origin => {
      if (origin.visionType === 'tremorsense') return []; // blips only, no FoW reveal
      const { x: ox, y: oy, visionType = 'normal', visionRangePx = 0 } = origin;

      // Check if this vision origin is inside magical darkness.
      // Normal vision and darkvision are suppressed; truesight/blindsight pierce it.
      // Heavy fog zones do NOT affect LOS — they are purely visual overlays.
      const inDarkness = darknessZones.some(
        dz => Math.hypot(ox - dz.x, oy - dz.y) <= dz.radius
      );

      // Devil's Sight (the Warlock invocation) sees normally in Dim Light and
      // Darkness, magical or not — so it pierces darkness zones like truesight,
      // but unlike truesight it does NOT reveal Invisible creatures. That
      // distinction lives in canSeeInvisible(), which deliberately omits it.
      const canPierceDarkness = visionType === 'truesight'
        || visionType === 'blindsight'
        || visionType === 'devilsight';

      const baseSegs = [...wallSegs, ...doorSegsFrom(ox, oy)];
      const losSegs = canPierceDarkness ? baseSegs : [...baseSegs, ...darknessSegs, ...fbSegs];
      const pts = computeVisibilityPolygon(ox, oy, losSegs, mW, mH);

      // Inside magical darkness with non-penetrating vision → completely blind.
      // (Handled in fog canvas by re-stamping with opaque black.)
      if (inDarkness && !canPierceDarkness) {
        return { pts, passes: [] };
      }

      // For non-truesight/non-blindsight, filter out light sources inside darkness zones.
      // Fog zones do not block lights — they are visual-only.
      const effectiveLightPolys = canPierceDarkness
        ? lightPolys
        : lightPolys.filter(({ l }) =>
            !darknessZones.some(dz => Math.hypot(l.x - dz.x, l.y - dz.y) <= dz.radius)
          );

      const passes = [];
      const rangeR = visionRangePx > 0 ? visionRangePx : 0;

      function lightPass(l, lp, alpha, lr) {
        return { kind: 'light', alpha, lx: l.x, ly: l.y, lr, lightPts: lp, ldir: l.direction ?? 0, lspread: l.spread_angle ?? 360, flicker: l.flicker !== false };
      }
      // Read an explicit radius from a light (respecting 0 as "none") with a
      // sensible fallback only when the field is missing entirely.
      function brightOf(l) { return l.bright_radius != null ? l.bright_radius : 60; }
      function dimOf(l)    { return l.dim_radius    != null ? l.dim_radius    : 120; }

      if (ambientLight === 'bright') {
        if ((visionType === 'blindsight' || visionType === 'truesight') && rangeR > 0) {
          passes.push({ kind: 'range', alpha: 1.0, ox, oy, r: rangeR });
        } else {
          passes.push({ kind: 'full', alpha: 1.0 });
        }
      } else if (ambientLight === 'dim') {
        if (visionType === 'normal') {
          passes.push({ kind: 'full', alpha: 0.5 });
          // Upgrade areas inside a light source's bright zone to full visibility
          for (const { l, pts: lp } of effectiveLightPolys) {
            const br = brightOf(l);
            if (br > 0) passes.push(lightPass(l, lp, 1.0, br));
          }
        } else if (visionType === 'darkvision' || visionType === 'devilsight') {
          // Darkvision treats dim ambient as bright within range; dim beyond
          // range. Devil's Sight behaves the same way in dim light.
          if (rangeR > 0) {
            passes.push({ kind: 'full', alpha: 0.5 });  // dim everywhere in LOS
            passes.push({ kind: 'range', alpha: 1.0, ox, oy, r: rangeR }); // bright within darkvision range
          } else {
            passes.push({ kind: 'full', alpha: 1.0 }); // unlimited darkvision = bright everywhere
          }
        } else if (visionType === 'truesight') {
          // Truesight: bright within range (ignores dim ambient and magical darkness)
          if (rangeR > 0) {
            passes.push({ kind: 'full', alpha: 0.5 });  // dim ambient everywhere in LOS
            passes.push({ kind: 'range', alpha: 1.0, ox, oy, r: rangeR }); // bright within truesight range
          } else {
            passes.push({ kind: 'full', alpha: 1.0 }); // unlimited truesight
          }
        } else if (visionType === 'blindsight') {
          passes.push({ kind: 'range', alpha: 1.0, ox, oy, r: rangeR > 0 ? rangeR : mW });
        }
      } else if (ambientLight === 'dark') {
        if (visionType === 'normal') {
          // Only areas illuminated by light sources are visible; light is blocked by walls
          for (const { l, pts: lp } of effectiveLightPolys) {
            const dr = dimOf(l), br = brightOf(l);
            if (dr > 0) passes.push(lightPass(l, lp, 0.5, dr));
            if (br > 0) passes.push(lightPass(l, lp, 1.0, br));
          }
        } else if (visionType === 'darkvision') {
          // Dark is treated as dim within darkvision range; darkvision also upgrades light dim zones to bright
          passes.push({ kind: 'range', alpha: 0.5, ox, oy, r: rangeR > 0 ? rangeR : mW });
          for (const { l, pts: lp } of effectiveLightPolys) {
            // Darkvision treats dim light as bright — upgrade entire dim zone of light source
            const dr = dimOf(l);
            if (dr > 0) passes.push(lightPass(l, lp, 1.0, dr));
          }
        } else if (visionType === 'devilsight') {
          // "You can see normally in Dim Light and Darkness" — full brightness
          // within range, where darkvision would only get dim.
          passes.push({ kind: 'range', alpha: 1.0, ox, oy, r: rangeR > 0 ? rangeR : mW });
        } else if (visionType === 'truesight') {
          // Truesight sees perfectly regardless of lighting and magical darkness
          if (rangeR > 0) {
            passes.push({ kind: 'range', alpha: 1.0, ox, oy, r: rangeR });
          } else {
            passes.push({ kind: 'full', alpha: 1.0 }); // unlimited truesight
          }
        } else if (visionType === 'blindsight') {
          passes.push({ kind: 'range', alpha: 1.0, ox, oy, r: rangeR > 0 ? rangeR : mW });
        }
      }

      // Tokens inside a fog zone skip the main punch loop — their full LOS would
      // reveal everything through and beyond the fog.  The fog canvas handles a
      // light-aware 5ft visibility bubble for them after painting the grey overlay.
      const containingFogZone = !canPierceDarkness
        ? fogZones.find(fz => pointInZone(ox, oy, fz)) || null
        : null;

      // Ledges: when origin is on the "below" side of a ledge, the area on the far
      // side is only dimly visible. Collect dim polygons to overlay on the fog.
      const windowDimPolys = windowSegs
        .map(w => windowFarSideData(w, ox, oy, mW, mH))
        .filter(Boolean);
      const ledgeDimPolys = ledges
        .map(l => ledgeFarSidePolygon(l, ox, oy, mW, mH))
        .filter(Boolean);

      if (containingFogZone) {
        // Keep normal passes so outside-fog LOS is still punched in the main loop.
        // fogOrigin lets the fog canvas re-punch a 5ft bubble after the grey overlay.
        return [{ pts, passes, fogOrigin: { fz: containingFogZone, ox, oy, fogPasses: passes }, visionType, ox, oy, visionRangePx, ledgeDimPolys, windowDimPolys }];
      }
      return [{ pts, passes, fogOrigin: null, visionType, ox, oy, visionRangePx, ledgeDimPolys, windowDimPolys }];
    });
    // Same as visOrigins: `tokens` is read for token-carried lights, and
    // visTokenSig covers exactly the tokens whose lights or positions matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // Signatures, not arrays. `walls`, `doors`, `lights`, the darkness zones and
    // the fog blocks are all read above and all deliberately absent here: their
    // identity changes on every render of the parent and their CONTENT is what
    // this pass's answer depends on. `doorSegsFrom` is likewise replaced by
    // `doorsKey`, which is what it is built from.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fogOfWar, visOrigins, mW, mH, ambientLight, visTokenSig, gridSize, losCacheKey,
      wallsSig, doorsKey, lightsSig, darknessSig, fogBlocksSig]);
  // Keep the ref in sync — declared here so visPolys is in scope
  useEffect(() => { visPolysRef.current = visPolys; }, [visPolys]);

  // Pre-compute label visibility per token so pointInPoly loops don't run inside render
  const tokenLabelVis = useMemo(() => {
    const map = new Map();
    if (!fogOfWar || visPolys.length === 0) return map;
    for (const t of tokens) {
      const sz = tokenFootprint(t);
      const tH = sz.gridH * gridSize;
      const cx = offsetX + Number(t.grid_col) * gridSize + (sz.gridW * gridSize) / 2;
      const cy = offsetY + Number(t.grid_row) * gridSize + tH / 2;
      const labelCY = cy + tH / 2 + 24;
      const tokenVis = visPolys.some(v => v.passes.length > 0 && pointInPoly(cx, cy, v.pts));
      const labelVis = visPolys.some(v => v.passes.length > 0 && pointInPoly(cx, labelCY, v.pts));
      map.set(t.id, tokenVis && labelVis);
    }
    return map;
  }, [fogOfWar, visPolys, tokens, offsetX, offsetY, gridSize]);

  // Tremorsense blip targets — computed after visPolys so LOS is available.
  // A blip is shown when the token is in tremorsense range but NOT clearly
  // visible (i.e. outside LOS, or inside fog/darkness that hides them).
  const tremorsenseBlips = useMemo(() => {
    if (!fogOfWar || !tokens || !playerTokenId) return [];
    const tremorsenseOrigins = visOrigins.filter(o => o.visionType === 'tremorsense');
    if (tremorsenseOrigins.length === 0) return [];

    const fogZones  = (resolvedDarkness || []).filter(dz => dz.zone_type === 'heavy-fog');
    const darkZones = (resolvedDarkness || []).filter(dz => dz.zone_type !== 'heavy-fog' && dz.zone_type !== 'water');

    // Player token centre — used for the in-fog proximity suppression.
    const playerToken = tokens.find(t => t.id === playerTokenId);
    let pcx = null, pcy = null, playerInFog = false;
    if (playerToken) {
      const psz = tokenFootprint(playerToken);
      pcx = offsetX + Number(playerToken.grid_col) * gridSize + (psz.gridW * gridSize) / 2;
      pcy = offsetY + Number(playerToken.grid_row) * gridSize + (psz.gridH * gridSize) / 2;
      playerInFog = fogZones.some(fz => pointInZone(pcx, pcy, fz));
    }
    const eightFtPx = (8 / FEET_PER_SQUARE) * gridSize;

    return tokens
      .filter(t => {
        if (t.id === playerTokenId) return false;
        // Own familiars are never blips — they're the sensor, not a contact.
        if (visionTokenIds.includes(t.id)) return false;
        if (t.is_hidden) return false;
        if (t.is_flying) return false;
        const sz = tokenFootprint(t);
        const cx = offsetX + Number(t.grid_col) * gridSize + (sz.gridW * gridSize) / 2;
        const cy = offsetY + Number(t.grid_row) * gridSize + (sz.gridH * gridSize) / 2;

        const inRange = tremorsenseOrigins.some(o =>
          o.visionRangePx <= 0 || Math.hypot(cx - o.x, cy - o.y) <= o.visionRangePx
        );
        if (!inRange) return false;

        // When the observing player is inside fog, suppress blips for creatures
        // within 8ft — they're within the visible 5ft bubble, close enough to
        // be perceived directly without a sonar indicator.
        if (playerInFog && pcx !== null && Math.hypot(cx - pcx, cy - pcy) <= eightFtPx) {
          return false;
        }

        // If the token is already clearly visible (in LOS and not obscured by
        // fog or darkness), skip the blip — the player can see them directly.
        const inLOS = visPolys.some(v => v.passes.length > 0 && pointInPoly(cx, cy, v.pts));
        if (inLOS) {
          const inFog      = fogZones.some(fz => pointInZone(cx, cy, fz));
          const inDarkness = darkZones.some(dz => pointInZone(cx, cy, dz));
          if (!inFog && !inDarkness) return false;
        }

        return true;
      })
      .map(t => {
        const sz = tokenFootprint(t);
        const cx = offsetX + Number(t.grid_col) * gridSize + (sz.gridW * gridSize) / 2;
        const cy = offsetY + Number(t.grid_row) * gridSize + (sz.gridH * gridSize) / 2;
        return { id: t.id, cx, cy, size: t.size };
      });
  }, [fogOfWar, tokens, playerTokenId, visionTokenIds, visOrigins, visPolys, resolvedDarkness, offsetX, offsetY, gridSize]);

  // HTML canvas overlay for light glow — warm radial gradients drawn at each
  // light source position, below the fog so walls/darkness occludes them.
  const glowCanvasRef = useRef(null);

  // Collect all light sources: static lights + token-attached lights.
  // Memoised so neither the glow canvas nor the door overlay rebuilds the
  // array 60×/sec, and so both paint from the identical light list.
  //
  // Defensive: any light entry whose coords or radius would resolve to
  // NaN gets dropped before it can reach createRadialGradient (which
  // throws "non-finite double" and aborts the entire glow canvas).
  // Spectator view triggers this whenever the party-union includes a
  // player token that hasn't been placed yet (grid_col / grid_row
  // null in the DB) — Number(null)*gridSize is NaN, propagates
  // through cx/cy, then explodes here. Player view never tripped it
  // because it only uses the player's own token's coords.
  const baseGlowLights = useMemo(
    () => buildGlowLights({ lights, tokens, gridSize, mW, mH }),
    [lights, tokens, gridSize, mW, mH]
  );

  // Fake refraction through windows.
  //
  // Windows already pass light — they contribute no occluder segments — but a
  // beam through glass carries on in a straight line, which reads as a hard
  // shaft rather than a lit window. Frosted glass scatters: the pane itself
  // becomes a dim, wide emitter on the far side.
  //
  // So for every window within reach of a light we synthesise a second light
  // sitting on the glass, aimed away from the parent, spread much wider than
  // the beam that arrived and carrying the parent's leftover radius at half
  // strength. Modelling it as an ordinary light means it inherits the whole
  // pipeline for free — it gets its own LOS polygon (so the spill still stops
  // at walls), its own cone clip, and its own flicker.
  //
  // That LOS polygon is the catch: it is the most expensive thing on the map
  // and it is quadratic in occluder count. So a pane keeps only its STRONGEST
  // contributor per side rather than one emitter per light that reaches it —
  // see WINDOW_SPILL_MAX. Dim overlapping fans from a row of lamps read as one
  // brighter fan anyway, so the cheap version and the exhaustive one look the
  // same.
  const glowLights = useMemo(() => {
    if (windowSegs.length === 0) return baseGlowLights;
    // Key: pane index + which side the parent stands on. Value: the brightest
    // spill found so far for that face of the glass.
    const bestPerFace = new Map();
    for (const L of baseGlowLights) {
      const outerR = Math.max(L.brightR, L.dimR);
      if (!(outerR > 0)) continue;
      for (let wi = 0; wi < windowSegs.length; wi++) {
        const w = windowSegs[wi];
        // Closest point on the pane — where the beam hits hardest.
        const dx = w.bx - w.ax, dy = w.by - w.ay;
        const lenSq = dx * dx + dy * dy;
        if (lenSq < 1e-6) continue;
        let t = ((L.x - w.ax) * dx + (L.y - w.ay) * dy) / lenSq;
        t = Math.max(0, Math.min(1, t));
        const px = w.ax + dx * t, py = w.ay + dy * t;
        const d = Math.hypot(L.x - px, L.y - py);
        if (d >= outerR || d < 1e-6) continue;

        // A directional parent only lights the pane if the pane is in its cone.
        if ((L.spread ?? 360) < 360) {
          const ang = Math.atan2(py - L.y, px - L.x);
          let off = ang - (L.dir ?? 0) * (Math.PI / 180);
          while (off > Math.PI) off -= Math.PI * 2;
          while (off < -Math.PI) off += Math.PI * 2;
          if (Math.abs(off) > ((L.spread ?? 360) / 2) * (Math.PI / 180)) continue;
        }

        // Normal pointing away from the parent light.
        const l = Math.sqrt(lenSq);
        let nx = -dy / l, ny = dx / l;
        if ((L.x - px) * nx + (L.y - py) * ny > 0) { nx = -nx; ny = -ny; }

        const residual = outerR - d;
        // Side is identified by the sign of the parent's offset along the
        // pane's own normal, so lamps indoors and lamps outdoors still get
        // their own fan rather than fighting over one slot.
        const side = ((L.x - px) * -dy + (L.y - py) * dx) >= 0 ? 1 : -1;
        const faceKey = `${wi}|${side}`;
        const prev = bestPerFace.get(faceKey);
        if (prev && prev.residual >= residual) continue;

        // Snap the emitter to a coarse grid. The exact closest point slides
        // with the parent, and every distinct position is a cache miss and a
        // fresh raycast; snapping means a moving lamp reuses one polygon for
        // several feet of travel. Snap first, then nudge clear of the pane so
        // the emitter never lands exactly on the line where the cone maths
        // degenerates.
        const sx = Math.round(px / WINDOW_SPILL_SNAP_PX) * WINDOW_SPILL_SNAP_PX;
        const sy = Math.round(py / WINDOW_SPILL_SNAP_PX) * WINDOW_SPILL_SNAP_PX;
        bestPerFace.set(faceKey, {
          residual,
          light: {
            seed: (L.seed + px * 0.017 + py * 0.023) % (Math.PI * 2),
            x: sx + nx * 2, y: sy + ny * 2,
            brightR: residual * 0.45,
            dimR: residual,
            color: L.color,
            dir: Math.atan2(ny, nx) * 180 / Math.PI,
            spread: WINDOW_SPILL_SPREAD_DEG,
            flicker: L.flicker,
            alphaScale: WINDOW_SPILL_STRENGTH,
          },
        });
      }
    }
    if (bestPerFace.size === 0) return baseGlowLights;
    // Hard ceiling for pathological maps — a hundred-pane conservatory would
    // still out-cost every other light on the map combined. Brightest win.
    const spills = [...bestPerFace.values()]
      .sort((a, b) => b.residual - a.residual)
      .slice(0, WINDOW_SPILL_MAX)
      .map(s => s.light);
    return [...baseGlowLights, ...spills];
  }, [baseGlowLights, windowSegs]);

  // Walls and closed doors block light. Compute each light's LOS polygon so
  // the glow can be clipped to the area the light actually reaches. The
  // polygon is keyed by (x,y) and walls — flickering the radius doesn't
  // invalidate it, so the per-frame work stays cheap (just gradient draws).
  // Doors are added per light so each one's occluder sits at the far edge of
  // its own art relative to THAT light — a door lit from a room is lit across
  // its whole panel instead of being half-shadowed by itself.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const glowStaticSegs = useMemo(
    () => [...wallsToSegments(walls), ...fogBlocksToSegments(fogBlocks)],
    [wallsSig, fogBlocksSig],
  );
  // Wall-only count, so the glow pass can tell whether fog blocks actually
  // added anything to its occluder set.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const wallSegCount = useMemo(() => wallsToSegments(walls).length, [wallsSig]);
  const glowLightPolys = useMemo(() => {
    const polys = new Map();
    if (!fogOfWar || mW <= 0 || mH <= 0) return polys;
    // The glow pass only differs from the vision pass by its fog-block
    // occluders. With no fog blocks on the map the two segment sets are
    // identical, so naming the same bucket lets a light at a given position be
    // raycast once and reused by both — the separate bucket exists to fix a
    // real aliasing bug, not to double the work on every map that has no fog.
    const bucket = glowStaticSegs.length > wallSegCount ? 'glow' : 'vis';
    for (const l of glowLights) {
      const k = `${Math.round(l.x)}|${Math.round(l.y)}`;
      if (polys.has(k)) continue;
      polys.set(k, getCachedLightPoly(l.x, l.y, [...glowStaticSegs, ...doorSegsFrom(l.x, l.y)], losCacheKey, bucket));
    }
    return polys;
  }, [fogOfWar, glowLights, glowStaticSegs, wallSegCount, doorSegsFrom, losCacheKey, mW, mH]); // eslint-disable-line react-hooks/exhaustive-deps
  const glowPolyFor = useCallback(
    (lx, ly) => glowLightPolys.get(`${Math.round(lx)}|${Math.round(ly)}`) || null,
    [glowLightPolys],
  );

  useEffect(() => {
    if (!fogOfWar) return;
    const canvas = glowCanvasRef.current;
    if (!canvas) return;

    let raf = null;
    let running = true;

    function draw() {
      if (!running) return;
      // Read live transform from refs — keeping pos/scale out of the effect
      // deps means panning/zooming no longer tears down and rebuilds this
      // whole effect (and its light-poly cache) on every frame.
      const pos = posRef.current, scale = scaleRef.current;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.translate(pos.x, pos.y);
      ctx.scale(scale, scale);

      // Candle-flame flicker model: two slow sines (sub-Hz) for a gentle
      // breathing, two faster sines (~3–7 Hz) for the moment-to-moment
      // wobble that reads as a real flame, and a small per-frame jitter
      // for the bottom-octave noise. Phase offsets are derived from each
      // light's own seed so adjacent torches don't pulse in unison.
      const t = performance.now() / 1000;

      paintLightGlow(ctx, glowLights, glowPolyFor, t, { w: mW, h: mH });

      ctx.restore();
      raf = requestAnimationFrame(draw);
    }

    draw();
    return () => { running = false; if (raf) cancelAnimationFrame(raf); };
  }, [fogOfWar, glowLights, glowPolyFor, mW, mH, stageSize, visibilityTick]);

  // Cache per-fog-zone LOS polygons — expensive to compute so only done when
  // zones / walls change, not on every animation frame.
  const fogZoneLOS = useMemo(() => {
    if (!fogOfWar || mW <= 0 || mH <= 0) return {};
    const fzs = (resolvedDarkness || []).filter(dz => dz.zone_type === 'heavy-fog');
    if (fzs.length === 0) return {};
    const fzOffX = gridSize > 0 ? (mW % gridSize) / 2 : 0;
    const fzOffY = gridSize > 0 ? (mH % gridSize) / 2 : 0;
    const staticSegs = [...wallsToSegments(walls), ...fogBlocksToSegments(fogBlocks)];
    const cache = {};
    for (const fz of fzs) {
      const { x: cx, y: cy } = zoneCentroid(fz);
      cache[fz.id] = computeVisibilityPolygon(cx, cy, [...staticSegs, ...doorSegsFrom(cx, cy)], mW, mH);
    }
    return cache;
    // Content, not identity — same reasoning as visPolys above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fogOfWar, mW, mH, gridSize, wallsSig, doorsKey, darknessSig, fogBlocksSig]);

  // HTML canvas overlay for fog of war — bypasses Konva entirely so
  // destination-out compositing works reliably on all browsers.
  // Runs as a RAF loop so the animated fog gradients update every frame without
  // going through React's re-render cycle.
  const fogCanvasRef = useRef(null);
  // Door sprites are redrawn on THIS canvas, which sits above the fog, so a
  // seen door's art shows crisply on top of fog instead of being half-buried
  // in shadow at the thin occluder line (the fog's blur would eat a punched
  // hole). Only used on fogged views; the GM sees the Konva sprite directly.
  const doorOverlayRef = useRef(null);
  // Cache of fog-canvas samples per door, so the GPU->CPU readback runs a few
  // times a second rather than every frame.
  const doorFogSampleRef = useRef(new Map());
  // Scratch canvas holding the door art's alpha, so the glow re-painted on the
  // overlay can be masked back to the sprite silhouette.
  const maskCanvasRef = useRef(null);

  useEffect(() => {
    if (!fogOfWar) return;
    const canvas = fogCanvasRef.current;
    if (!canvas) return;

    let raf = null;
    let running = true;

    function draw() {
      if (!running) return;
      // Live transform from refs — pos/scale removed from deps so pan/zoom
      // doesn't rebuild the effect every frame (the RAF redraws anyway).
      const pos = posRef.current, scale = scaleRef.current;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    // Shift by fowBlur*scale to account for the oversized canvas offset — the
    // element is blurred by a smooth CSS filter (see its style) and padded so
    // the blur never clips at the viewport edge.
    ctx.translate(pos.x + fowBlur * scale, pos.y + fowBlur * scale);
    ctx.scale(scale, scale);
    // Fill entire map with fully-opaque fog. Colour is configurable
    // (sessions.fow_color); the destination-out passes below ignore
    // colour and only modulate alpha, so the visible fog tint is set
    // entirely by THIS fillStyle.
    ctx.fillStyle = fowColor;
    if (isPlayer || isSpectator) {
      // Extend fog past the map edges so neither players nor TV viewers
      // can infer the map's bounds from where the fog stops. The LOS
      // polygon is bounded by the map boundary segments, so the
      // destination-out below only punches holes within the map —
      // anything beyond mW/mH stays solid fog.
      const left   = -pos.x / scale - stageSize.w / scale;
      const top    = -pos.y / scale - stageSize.h / scale;
      const right  = (stageSize.w - pos.x) / scale + stageSize.w / scale;
      const bottom = (stageSize.h - pos.y) / scale + stageSize.h / scale;
      ctx.fillRect(left, top, right - left, bottom - top);
    } else {
      ctx.fillRect(0, 0, mW, mH);
    }
    // Punch fully-transparent visibility holes using destination-out.
    // CSS filter blur is applied to the canvas element itself (works on all browsers
    // including Safari). The canvas is oversized by 2*fowBlur on each side and offset
    // by -fowBlur so blur at visibility polygon edges bleeds into the padding rather
    // than hitting the browser viewport edge.
    // For each origin, for each rendering pass:
    //   1. Clip drawing to the LOS polygon
    //   2. Fill the illuminated shape (full polygon, range circle, or light circle)
    // destination-out with globalAlpha controls how much fog is erased:
    //   alpha=1.0 → fully transparent (bright), alpha=0.5 → half fog remains (dim)
    for (const { pts, passes } of visPolys) {
      if (pts.length < 4 || passes.length === 0) continue;
      for (const pass of passes) {
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.globalAlpha = pass.alpha;
        ctx.fillStyle = '#000';

        // Clip all drawing to the LOS polygon
        ctx.beginPath();
        ctx.moveTo(pts[0], pts[1]);
        for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
        ctx.closePath();
        ctx.clip();

        // Draw the illuminated area within the LOS clip
        if (pass.kind === 'full') {
          ctx.fillRect(0, 0, mW, mH);
        } else if (pass.kind === 'range') {
          ctx.beginPath();
          ctx.arc(pass.ox, pass.oy, pass.r, 0, Math.PI * 2);
          ctx.fill();
        } else if (pass.kind === 'light') {
          // Candle-flame flicker: modulate the lit-area radius per frame
          // so the visible edge wobbles in step with the glow canvas above.
          // Seed off (lx,ly) so two adjacent torches don't pulse in sync.
          // Radius is the only thing flickered here — the LOS clip polygon
          // (pass.lightPts) is fixed because re-raycasting walls every frame
          // would be catastrophic. The clip already extends to wall edges,
          // so a wobbling radius just expands/contracts within that envelope.
          // Lights with flicker disabled render with their stored radius
          // unchanged — so sun shafts and magical lights have crisp,
          // steady edges instead of the candle wobble.
          const tNow = performance.now() / 1000;
          const fSeed = (pass.lx * 0.013 + pass.ly * 0.029);
          const flickerR = pass.flicker !== false
            ? 1
              + Math.sin(tNow * 6.7  + fSeed)         * 0.05
              + Math.sin(tNow * 3.1  + fSeed * 1.7)   * 0.035
              + Math.sin(tNow * 11.3 + fSeed * 0.5)   * 0.02
            : 1;
          const flickeredLr = Math.max(0, pass.lr * flickerR);

          // Clip to directional cone first (no-op for full circles)
          clipToWedge(ctx, pass.lx, pass.ly, flickeredLr, pass.ldir ?? 0, pass.lspread ?? 360);
          // Also clip to the light source's own LOS polygon so walls block the light
          if (pass.lightPts && pass.lightPts.length >= 4) {
            ctx.beginPath();
            ctx.moveTo(pass.lightPts[0], pass.lightPts[1]);
            for (let i = 2; i < pass.lightPts.length; i += 2) ctx.lineTo(pass.lightPts[i], pass.lightPts[i + 1]);
            ctx.closePath();
            ctx.clip();
          }
          // Feather the outer edge with a radial gradient so the light doesn't
          // terminate in a hard ring. Alpha plateaus across the bright/dim zone
          // then ramps to 0 across a small outer band.
          ctx.globalAlpha = 1;
          const feather = Math.max(8, flickeredLr * 0.15);
          const outerR = flickeredLr + feather;
          const grad = ctx.createRadialGradient(pass.lx, pass.ly, 0, pass.lx, pass.ly, outerR);
          grad.addColorStop(0, `rgba(0,0,0,${pass.alpha})`);
          grad.addColorStop(flickeredLr / outerR, `rgba(0,0,0,${pass.alpha})`);
          grad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(pass.lx, pass.ly, outerR, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.globalAlpha = 1;
        ctx.restore();
      }
    }

    // Ledge / window dim overlay: for each origin, re-fog the area on the far
    // side of the line.
    //
    // A ledge dims flat at ~50%, and only when viewed from its below side.
    // A window instead FADES with distance: a light haze at the glass ramping
    // to solid fog WINDOW_SEE_THROUGH_FT beyond it, so you can make out what's
    // just the other side of the pane but not across the room. Canvas gradients
    // clamp to their end stop, so filling the whole cone leaves everything past
    // the ramp fully fogged for free.
    const clipToPoly = (poly) => {
      ctx.beginPath();
      ctx.moveTo(poly[0], poly[1]);
      for (let i = 2; i < poly.length; i += 2) ctx.lineTo(poly[i], poly[i + 1]);
      ctx.closePath();
      ctx.clip();
    };
    // Fill only the clipped shape's own bounding box. These overlays used to
    // fillRect the entire map — on a large map that is millions of pixels of
    // fill per cone per origin, every frame, to paint a shape that usually
    // covers a corner of it. The clip makes the result identical either way.
    //
    // Clamped to the map: a far-side cone deliberately runs several map-widths
    // past its line, so its raw bounds are far LARGER than the map and the
    // bbox would be no saving at all. Nothing outside the map needs the
    // overlay — the LOS polygon these are clipped against is map-bounded.
    const fillPolyBounds = (poly) => {
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (let i = 0; i < poly.length; i += 2) {
        if (poly[i] < x0) x0 = poly[i];
        if (poly[i] > x1) x1 = poly[i];
        if (poly[i + 1] < y0) y0 = poly[i + 1];
        if (poly[i + 1] > y1) y1 = poly[i + 1];
      }
      x0 = Math.max(0, x0); y0 = Math.max(0, y0);
      x1 = Math.min(mW, x1); y1 = Math.min(mH, y1);
      if (!(x1 > x0) || !(y1 > y0)) return;
      ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    };
    const windowReachPx = WINDOW_SEE_THROUGH_FT * (gridSize / FEET_PER_SQUARE);

    for (const vp of visPolys) {
      const { pts } = vp;
      if (pts.length < 4) continue;

      for (const poly of (vp.ledgeDimPolys || [])) {
        if (!poly || poly.length < 6) continue;
        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = LEDGE_DIM_ALPHA;
        ctx.fillStyle = '#000';
        clipToPoly(pts);
        clipToPoly(poly);
        fillPolyBounds(poly);
        ctx.globalAlpha = 1;
        ctx.restore();
      }

      for (const win of (vp.windowDimPolys || [])) {
        if (!win || !win.poly || win.poly.length < 6) continue;
        const { poly, mx, my, nx, ny } = win;
        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        clipToPoly(pts);
        clipToPoly(poly);
        const grad = ctx.createLinearGradient(
          mx, my,
          mx + nx * windowReachPx, my + ny * windowReachPx,
        );
        grad.addColorStop(0, `rgba(0,0,0,${WINDOW_DIM_ALPHA})`);
        grad.addColorStop(0.55, `rgba(0,0,0,${(WINDOW_DIM_ALPHA + 1) / 2})`);
        grad.addColorStop(1, 'rgba(0,0,0,1)');
        ctx.fillStyle = grad;
        fillPolyBounds(poly);
        ctx.restore();
      }
    }
    // Re-stamp magical darkness zones with opaque black fog for any vision origin
    // that cannot pierce magical darkness (i.e. not truesight or blindsight within range).
    // This runs after all normal vision passes so it always wins over ordinary vision.
    const canSeeThroughAnyZone = (dz) => {
      const { x: dzX, y: dzY } = zoneCentroid(dz);
      const dzR = zoneEffectiveRadius(dz);
      return (visOrigins || []).some(origin => {
        if (origin.visionType !== 'truesight' && origin.visionType !== 'blindsight') return false;
        if (origin.visionRangePx <= 0) return true;
        return Math.hypot(dzX - origin.x, dzY - origin.y) - dzR <= origin.visionRangePx;
      });
    };

    const darknessZones = (resolvedDarkness || []).filter(dz => dz.zone_type !== 'heavy-fog' && dz.zone_type !== 'water');
    const fogZones      = (resolvedDarkness || []).filter(dz => dz.zone_type === 'heavy-fog');

    for (const dz of darknessZones) {
      if (!canSeeThroughAnyZone(dz)) {
        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1.0;
        ctx.fillStyle = '#000';
        ctx.beginPath();
        if (dz.shape === 'polygon' && Array.isArray(dz.poly_points) && dz.poly_points.length >= 6) {
          const pts = dz.poly_points;
          ctx.moveTo(pts[0], pts[1]);
          for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
          ctx.closePath();
        } else {
          ctx.arc(dz.x, dz.y, dz.radius, 0, Math.PI * 2);
        }
        ctx.fill();
        ctx.restore();
      }
    }

    // Heavy fog zones — animated misty overlay drawn directly on the main canvas.
    // Uses destination-over so fog only fills LOS-revealed (transparent) pixels;
    // the opaque black FoW stays untouched.
    if (fogZones.length > 0) {
      const t = performance.now() / 1000; // seconds

      for (const fz of fogZones) {
        const fzLOS = fogZoneLOS[fz.id];
        const { x: fzCx, y: fzCy } = zoneCentroid(fz);
        const fzR = Math.max(zoneEffectiveRadius(fz), 40);
        const isPolygon = fz.shape === 'polygon' && Array.isArray(fz.poly_points) && fz.poly_points.length >= 6;

        ctx.save();

        // Clip to LOS polygon when available (prevents fog bleeding through walls)
        if (fzLOS && fzLOS.length >= 4) {
          ctx.beginPath();
          ctx.moveTo(fzLOS[0], fzLOS[1]);
          for (let i = 2; i < fzLOS.length; i += 2) ctx.lineTo(fzLOS[i], fzLOS[i + 1]);
          ctx.closePath();
          ctx.clip();
        }

        // Also clip to fog zone shape
        ctx.beginPath();
        if (isPolygon) {
          const pts = fz.poly_points;
          ctx.moveTo(pts[0], pts[1]);
          for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
          ctx.closePath();
        } else {
          ctx.arc(fz.x, fz.y, fz.radius, 0, Math.PI * 2);
        }
        ctx.clip();

        // All fog layers use destination-over so they only fill transparent (LOS-revealed)
        // pixels and never paint over the opaque black FoW.
        // Draw order is reversed — topmost layer first — because destination-over
        // inserts new content *behind* existing opaque pixels.
        ctx.globalCompositeOperation = 'destination-over';

        // ── Light wisps first (topmost) — 4 bright drifting patches ──
        for (let i = 0; i < 4; i++) {
          const seed = i * 2.618;
          const sp   = 0.7 + i * 0.18;
          const wx   = fzCx + Math.sin(t * sp       + seed)        * fzR * 0.42;
          const wy   = fzCy + Math.cos(t * sp * 0.71 + seed + 1.3) * fzR * 0.38;
          const wr   = fzR * (0.38 + i * 0.07);
          const g    = ctx.createRadialGradient(wx, wy, 0, wx, wy, wr);
          g.addColorStop(0,   'rgba(255,255,255,0.58)');
          g.addColorStop(0.45,'rgba(238,244,255,0.26)');
          g.addColorStop(1,   'rgba(218,226,245,0)');
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, mW, mH);
        }

        // ── Density patches (behind wisps) — 3 drifting darker blobs ──
        for (let i = 0; i < 3; i++) {
          const seed = i * 3.14 + 0.9;
          const sp   = 0.5 + i * 0.13;
          const wx   = fzCx + Math.sin(t * sp + seed + 2.5)        * fzR * 0.48;
          const wy   = fzCy + Math.cos(t * sp * 0.83 + seed + 3.7) * fzR * 0.44;
          const wr   = fzR * (0.32 + i * 0.09);
          const g    = ctx.createRadialGradient(wx, wy, 0, wx, wy, wr);
          g.addColorStop(0,   'rgba(125,133,158,0.50)');
          g.addColorStop(0.55,'rgba(150,158,178,0.22)');
          g.addColorStop(1,   'rgba(178,186,205,0)');
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, mW, mH);
        }

        // ── Base fog fill last (bottommost) — fills any remaining transparent gaps ──
        const baseGrad = ctx.createRadialGradient(fzCx, fzCy, 0, fzCx, fzCy, fzR * 1.05);
        baseGrad.addColorStop(0,   'rgba(220,228,245,1.0)');
        baseGrad.addColorStop(0.55,'rgba(200,210,228,1.0)');
        baseGrad.addColorStop(0.85,'rgba(182,192,212,1.0)');
        baseGrad.addColorStop(1,   'rgba(165,175,198,1.0)');
        ctx.fillStyle = baseGrad;
        ctx.fillRect(0, 0, mW, mH);

        ctx.restore();

        // Re-punch 5ft visibility bubble for tokens inside this fog zone.
        // Runs after the grey overlay so only the small lit area around the token is clear.
        for (const { pts, fogOrigin } of visPolys) {
          if (!fogOrigin || fogOrigin.fz.id !== fz.id) continue;
          const { ox, oy, fogPasses } = fogOrigin;
          if (!fogPasses || fogPasses.length === 0) continue;

          for (const pass of fogPasses) {
            ctx.save();
            ctx.globalCompositeOperation = 'destination-out';
            ctx.globalAlpha = pass.alpha;
            ctx.fillStyle = '#000';

            // Clip to token's LOS polygon
            ctx.beginPath();
            ctx.moveTo(pts[0], pts[1]);
            for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
            ctx.closePath();
            ctx.clip();

            // Clip to inside the fog zone (circle or polygon)
            ctx.beginPath();
            if (fz.shape === 'polygon' && Array.isArray(fz.poly_points) && fz.poly_points.length >= 6) {
              const fp = fz.poly_points;
              ctx.moveTo(fp[0], fp[1]);
              for (let i = 2; i < fp.length; i += 2) ctx.lineTo(fp[i], fp[i + 1]);
              ctx.closePath();
            } else {
              ctx.arc(fz.x, fz.y, fz.radius, 0, Math.PI * 2);
            }
            ctx.clip();

            // Clip to the 5ft bubble.
            //
            // Off the map's own scale rather than assuming one square is five
            // feet — on a board drawn at 10ft to the square this was handing
            // the player twice the sight the fog is supposed to allow.
            ctx.beginPath();
            ctx.arc(ox, oy, (5 / (Number(gridScale) || 5)) * gridSize, 0, Math.PI * 2);
            ctx.clip();

            if (pass.kind === 'full') {
              ctx.fillRect(0, 0, mW, mH);
            } else if (pass.kind === 'range') {
              if (pass.r < gridSize) {
                ctx.beginPath();
                ctx.arc(pass.ox, pass.oy, pass.r, 0, Math.PI * 2);
                ctx.clip();
              }
              ctx.fillRect(0, 0, mW, mH);
            } else if (pass.kind === 'light') {
              clipToWedge(ctx, pass.lx, pass.ly, pass.lr, pass.ldir ?? 0, pass.lspread ?? 360);
              if (pass.lightPts && pass.lightPts.length >= 4) {
                ctx.beginPath();
                ctx.moveTo(pass.lightPts[0], pass.lightPts[1]);
                for (let i = 2; i < pass.lightPts.length; i += 2) ctx.lineTo(pass.lightPts[i], pass.lightPts[i + 1]);
                ctx.closePath();
                ctx.clip();
              }
              ctx.globalAlpha = 1;
              const feather = Math.max(8, pass.lr * 0.15);
              const outerR = pass.lr + feather;
              const grad = ctx.createRadialGradient(pass.lx, pass.ly, 0, pass.lx, pass.ly, outerR);
              grad.addColorStop(0, `rgba(0,0,0,${pass.alpha})`);
              grad.addColorStop(pass.lr / outerR, `rgba(0,0,0,${pass.alpha})`);
              grad.addColorStop(1, 'rgba(0,0,0,0)');
              ctx.fillStyle = grad;
              ctx.beginPath();
              ctx.arc(pass.lx, pass.ly, outerR, 0, Math.PI * 2);
              ctx.fill();
            }

            ctx.restore();
          }
        }

        // Punch truesight / blindsight range clear inside this fog zone.
        // These vision types can see through magical fog up to their range —
        // the fog grey overlay is erased inside that circle after being drawn.
        for (const { pts, visionType: vt, ox: vox, oy: voy, visionRangePx: vrpx } of visPolys) {
          if (vt !== 'truesight' && vt !== 'blindsight') continue;

          ctx.save();
          ctx.globalCompositeOperation = 'destination-out';
          ctx.fillStyle = '#000';

          // Clip to this origin's LOS polygon (walls still block truesight)
          if (pts.length >= 4) {
            ctx.beginPath();
            ctx.moveTo(pts[0], pts[1]);
            for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
            ctx.closePath();
            ctx.clip();
          }

          // Clip to fog zone shape so the punch stays inside the fog boundary
          ctx.beginPath();
          if (isPolygon) {
            const fp = fz.poly_points;
            ctx.moveTo(fp[0], fp[1]);
            for (let i = 2; i < fp.length; i += 2) ctx.lineTo(fp[i], fp[i + 1]);
            ctx.closePath();
          } else {
            ctx.arc(fz.x, fz.y, fz.radius, 0, Math.PI * 2);
          }
          ctx.clip();

          if (vrpx > 0) {
            // Bounded truesight — punch a range circle
            ctx.beginPath();
            ctx.arc(vox, voy, vrpx, 0, Math.PI * 2);
            ctx.fill();
          } else {
            // Unlimited truesight — punch the entire clipped area
            ctx.fillRect(0, 0, mW, mH);
          }

          ctx.restore();
        }

      }
    }

    // Airborne tokens are drawn LIFTED off their square, and this canvas sits
    // above every Konva layer — so a token hovering over unlit ground had fog
    // painted straight across its art and disappeared, even though the square
    // it actually occupies is in plain sight.
    //
    // Punch the token's own disc back out at the lifted position. A disc
    // rather than its bounding box: the art is circular, so this exposes only
    // pixels the token itself covers and none of the map behind it.
    for (const t of (tokens || [])) {
      const lift = elevationLiftPx(t.elevation, gridSize);
      if (lift <= 0) continue;
      if ((isPlayer || isSpectator) && t.is_hidden) continue;
      const sz = tokenFootprint(t);
      const w = sz.gridW * gridSize, h = sz.gridH * gridSize;
      const cx = offsetX + Number(t.grid_col) * gridSize + w / 2;
      const cy = offsetY + Number(t.grid_row) * gridSize + h / 2;
      // Judged on the square it stands over, not on where the art floats:
      // the lifted position is a drawing convention, not a location.
      const seen = visPolys.some((v) => v.passes.length > 0 && pointInPoly(cx, cy, v.pts));
      if (!seen) continue;
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(cx, cy - lift, Math.max(w, h) / 2, 0, Math.PI * 2);
      ctx.fill();
      // And the leader line back down to the square it belongs to.
      ctx.fillRect(cx - 1.5, cy - lift, 3, lift);
      ctx.restore();
    }

    ctx.restore();

    raf = requestAnimationFrame(draw);
    } // end draw()

    raf = requestAnimationFrame(draw);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
    };
  }, [fogOfWar, visPolys, fowBlur, fowColor, mW, mH, stageSize, ambientLight, visibilityTick, fogZoneLOS, resolvedDarkness, visOrigins, gridSize, gridScale, walls, doors, tokens, offsetX, offsetY, isPlayer, isSpectator]);

  // ── Heavy fog when fog of war is OFF ────────────────────────────────────
  //
  // Heavy fog used to be painted only inside the pass above, which returns
  // early unless fog of war is switched on — and its canvas is only mounted
  // under the same condition. So a bank laid on a session without FoW was a
  // faint grey circle you could read straight through: mechanically present,
  // visually nothing. That is what made it unreliable — whether fog worked at
  // all depended on a session setting that says nothing about fog.
  //
  // This pass owns the no-FoW case ONLY. With FoW on it stands down, because
  // the pass above already paints fog with full line-of-sight clipping and a
  // second layer over the top would just double the density.
  //
  // Players and TV views only: the GM has to be able to see into a bank to run
  // what is inside it, which is the same exemption the token pass makes.
  useEffect(() => {
    if (fogOfWar) return;
    if (!(isPlayer || isSpectator)) return;
    const canvas = fogCanvasRef.current;
    if (!canvas) return;
    const zones = (resolvedDarkness || []).filter((dz) => dz.zone_type === 'heavy-fog');
    if (zones.length === 0) return;

    let raf = null, running = true;

    // 5ft, in map pixels, off the map's own scale rather than assuming one
    // square is five feet.
    const reachPx = (5 / (Number(gridScale) || 5)) * gridSize;

    const zonePath = (ctx, fz) => {
      ctx.beginPath();
      if (fz.shape === 'polygon' && Array.isArray(fz.poly_points) && fz.poly_points.length >= 6) {
        const pts = fz.poly_points;
        ctx.moveTo(pts[0], pts[1]);
        for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
        ctx.closePath();
      } else {
        ctx.arc(Number(fz.x), Number(fz.y), Number(fz.radius) || 0, 0, Math.PI * 2);
      }
    };

    function draw() {
      if (!running) return;
      const pos = posRef.current, scale = scaleRef.current;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.translate(pos.x + fowBlur * scale, pos.y + fowBlur * scale);
      ctx.scale(scale, scale);

      const t = performance.now() / 1000;

      // Where the viewer is standing, and whether that is inside a bank.
      let vx = null, vy = null;
      const me = playerTokenId != null
        ? (tokens || []).find((tk) => tk.id === playerTokenId)
        : null;
      if (me) {
        const fp = tokenFootprint(me);
        vx = offsetX + Number(me.grid_col) * gridSize + (fp.gridW * gridSize) / 2;
        vy = offsetY + Number(me.grid_row) * gridSize + (fp.gridH * gridSize) / 2;
      }

      for (const fz of zones) {
        const { x: cx, y: cy } = zoneCentroid(fz);
        const r = Math.max(zoneEffectiveRadius(fz), 40);

        ctx.save();
        zonePath(ctx, fz);
        ctx.clip();

        // Opaque, so you genuinely cannot see through it. Painted source-over
        // straight onto a cleared canvas — there is no FoW layer underneath to
        // preserve here, which is why this can be solid where the other pass
        // has to composite.
        const base = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 1.05);
        base.addColorStop(0,    'rgba(214,222,240,1)');
        base.addColorStop(0.55, 'rgba(198,208,228,1)');
        base.addColorStop(0.85, 'rgba(180,190,211,1)');
        base.addColorStop(1,    'rgba(168,178,200,1)');
        ctx.fillStyle = base;
        ctx.fillRect(cx - r * 1.2, cy - r * 1.2, r * 2.4, r * 2.4);

        // A little drift on top so a solid fill doesn't read as a grey disc.
        for (let i = 0; i < 4; i++) {
          const seed = i * 2.618;
          const sp = 0.7 + i * 0.18;
          const wxx = cx + Math.sin(t * sp + seed) * r * 0.42;
          const wyy = cy + Math.cos(t * sp * 0.71 + seed + 1.3) * r * 0.38;
          const wr = r * (0.38 + i * 0.07);
          const g = ctx.createRadialGradient(wxx, wyy, 0, wxx, wyy, wr);
          g.addColorStop(0,    'rgba(255,255,255,0.40)');
          g.addColorStop(0.45, 'rgba(238,244,255,0.18)');
          g.addColorStop(1,    'rgba(218,226,245,0)');
          ctx.fillStyle = g;
          ctx.fillRect(cx - r * 1.2, cy - r * 1.2, r * 2.4, r * 2.4);
        }
        ctx.restore();

        // Standing in it: clear a 5ft bubble, and only inside this bank — step
        // in and you can see your own square and the ring around it, nothing
        // more. Feathered so the edge of what you can make out isn't a hard
        // circle drawn on the floor.
        if (vx != null) {
          const inside = (() => {
            const poly = Array.isArray(fz.poly_points) ? fz.poly_points : null;
            if (poly && poly.length >= 6) {
              let ins = false;
              for (let a = 0, b = poly.length - 2; a < poly.length; b = a, a += 2) {
                const xi = poly[a], yi = poly[a + 1], xj = poly[b], yj = poly[b + 1];
                if (((yi > vy) !== (yj > vy))
                    && (vx < ((xj - xi) * (vy - yi)) / ((yj - yi) || 1e-9) + xi)) ins = !ins;
              }
              return ins;
            }
            const rr = Number(fz.radius) || 0;
            return rr > 0 && Math.hypot(vx - Number(fz.x), vy - Number(fz.y)) <= rr;
          })();
          if (inside) {
            ctx.save();
            ctx.globalCompositeOperation = 'destination-out';
            const feather = Math.max(4, reachPx * 0.25);
            const hole = ctx.createRadialGradient(vx, vy, Math.max(0, reachPx - feather), vx, vy, reachPx);
            hole.addColorStop(0, 'rgba(0,0,0,1)');
            hole.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = hole;
            ctx.beginPath();
            ctx.arc(vx, vy, reachPx, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        }
      }

      ctx.restore();
      raf = requestAnimationFrame(draw);
    }

    raf = requestAnimationFrame(draw);
    return () => { running = false; cancelAnimationFrame(raf); };
  }, [fogOfWar, isPlayer, isSpectator, resolvedDarkness, gridSize, gridScale,
      offsetX, offsetY, tokens, playerTokenId, fowBlur, stageSize, mW, mH]);

  // Door-sprite overlay — redraws each SEEN door's sprite on a canvas above the
  // fog so the art reads crisply on top of shadow. Mirrors DoorShape geometry
  // (swing / slide / double) and the live open/close animation. Runs only on
  // fogged views; the GM's un-fogged Konva sprite is already fully visible.
  useEffect(() => {
    if (!fogOfWar) return;
    const canvas = doorOverlayRef.current;
    if (!canvas) return;
    let raf = null, running = true;

    // How dark the fog actually is over a point, sampled from the fog canvas.
    //
    // passLitAlphaAt only models the VISION passes. The fog canvas then applies
    // more darkening on top that those passes know nothing about: the ledge and
    // window dim cones, and the magical-darkness re-stamp which paints opaque
    // black over anything a viewer can't pierce. A door inside such a zone
    // therefore scored a high `lit`, skipped the dimming pass, and floated at
    // full brightness in the middle of a blacked-out room.
    //
    // Sampling the composited fog is the single source of truth and covers
    // every darkener at once, including any added later. Returns null when the
    // sample isn't available so the caller can fall back to the analytic value.
    // The fog canvas's CSS blur isn't captured by getImageData, but that's a
    // soft edge rather than a brightness change.
    function sampleFogLit(doorId, mapX, mapY) {
      const fog = fogCanvasRef.current;
      if (!fog) return null;
      const cache = doorFogSampleRef.current;
      const now = performance.now();
      const hit = cache.get(doorId);
      // Stagger by door id so a corridor of doors doesn't expire together and
      // land every readback of the second on one frame.
      const jitter = (Number(doorId) || 0) % DOOR_FOG_SAMPLE_MS;
      if (hit && now - hit.t < DOOR_FOG_SAMPLE_MS + jitter) return hit.lit;
      const off = Math.ceil(fowBlur * scaleRef.current);
      const cx = Math.round(posRef.current.x + mapX * scaleRef.current) + off;
      const cy = Math.round(posRef.current.y + mapY * scaleRef.current) + off;
      if (cx < 0 || cy < 0 || cx >= fog.width || cy >= fog.height) return null;
      let lit = null;
      try {
        const d = fog.getContext('2d').getImageData(cx, cy, 1, 1).data;
        lit = 1 - d[3] / 255;
      } catch { return null; }
      cache.set(doorId, { t: now, lit });
      return lit;
    }

    function draw() {
      if (!running) return;
      const pos = posRef.current, scale = scaleRef.current;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.translate(pos.x, pos.y);
      ctx.scale(scale, scale);

      const vps = visPolysRef.current || [];
      const painted = []; // { leaves, t, lit } — used by the lighting passes below
      for (const door of (doorsRef.current || [])) {
        if (!door.sprite_path) continue;
        const img = doorSpriteImagesRef.current[door.sprite_path];
        if (!img) continue;
        const p = door.points;
        if (!p || p.length < 4) continue;
        const [x1, y1, x2, y2] = p;
        const len = Math.hypot(x2 - x1, y2 - y1);
        if (len < 2) continue;

        // Seen test — a point just off the doorway toward a viewer is inside
        // that viewer's LOS polygon. Keeps hidden doors hidden. The same point
        // gives the light level the wall face next to the door is rendered at,
        // so the art can be dimmed to match instead of sitting at full bright.
        const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
        const ndx = -(y2 - y1) / len, ndy = (x2 - x1) / len; // door normal
        let seen = false, lit = 0, sampleX = mx, sampleY = my;
        for (const vp of vps) {
          if (!vp.pts || vp.pts.length < 6 || vp.ox == null) continue;
          let nx = ndx, ny = ndy;
          if ((vp.ox - mx) * nx + (vp.oy - my) * ny < 0) { nx = -nx; ny = -ny; }
          const sx = mx + nx * 4, sy = my + ny * 4;
          if (!pointInFlatPoly(sx, sy, vp.pts)) continue;
          seen = true;
          lit = Math.max(lit, passLitAlphaAt(sx, sy, vp));
          sampleX = sx; sampleY = sy;
        }
        if (!seen) continue;

        // Take whichever is darker. The analytic value alone misses the fog
        // canvas's later passes; the sample covers them, and falls back
        // gracefully when the readback isn't available.
        const fogLit = sampleFogLit(door.id, sampleX, sampleY);
        if (fogLit != null) lit = Math.min(lit, fogLit);

        const prog = doorAnimRef.current[door.id] ?? (door.is_open ? 1 : 0);
        const ux = (x2 - x1) / len, uy = (y2 - y1) / len;
        const dir = door.open_dir === -1 ? -1 : 1;
        const doorAngle = Math.atan2(uy, ux);
        const imgW = img.naturalWidth || img.width || 100;
        const imgH = img.naturalHeight || img.height || 40;
        const aspect = imgH / imgW;
        const t = len * aspect;
        const motion = doorMotion(door);
        // `continue`, NOT `return`: this is inside the loop over every door
        // in the sprite pass, and returning would abandon the rest of them
        // along with the ctx.restore() and the lighting passes below.
        if (motion === 'vanish' && door.is_open) continue;
        // A secret door never shows its art — shut it is wall, open it is a
        // gap. Painting the sprite here would light up the very thing the
        // schematic pass just took care to hide.
        if (motion === 'secret') continue;

        // Each leaf in its own rotated frame: pivot (x,y), rotation, offset
        // along the leaf axis, width, and the source crop (double doors only).
        let leaves;
        if (motion === 'double') {
          const half = len / 2;
          leaves = [
            { x: x1, y: y1, rot: doorAngle + prog * dir * (Math.PI / 2), ox: 0,     w: half, crop: [0, 0, imgW / 2, imgH] },
            { x: x2, y: y2, rot: doorAngle - prog * dir * (Math.PI / 2), ox: -half, w: half, crop: [imgW / 2, 0, imgW / 2, imgH] },
          ];
        } else if (motion === 'slide') {
          leaves = [{ x: x1 + ux * prog * len, y: y1 + uy * prog * len, rot: doorAngle, ox: 0, w: len, crop: null }];
        } else {
          leaves = [{ x: x1, y: y1, rot: doorAngle + prog * dir * (Math.PI / 2), ox: 0, w: len, crop: null }];
        }

        for (const lf of leaves) {
          ctx.save();
          ctx.translate(lf.x, lf.y);
          ctx.rotate(lf.rot);
          if (lf.crop) ctx.drawImage(img, lf.crop[0], lf.crop[1], lf.crop[2], lf.crop[3], lf.ox, -t / 2, lf.w, t);
          else ctx.drawImage(img, lf.ox, -t / 2, lf.w, t);
          ctx.restore();
        }
        painted.push({ leaves, t, lit });
      }

      // ── Light the art the same way the map under it is lit ────────────────
      // This canvas sits ABOVE the glow canvas, so a sprite drawn raw is the
      // one unlit patch in an otherwise lit wall — which is what was giving
      // secret doors away (the door's own shadow reading as a panel outline).
      // Re-paint the glow gradients here with the same math and the same
      // `screen` blend, then mask them back to the art's own alpha.
      if (painted.length > 0 && glowLights.length > 0) {
        const mask = maskCanvasRef.current || (maskCanvasRef.current = document.createElement('canvas'));
        if (mask.width !== canvas.width || mask.height !== canvas.height) {
          mask.width = canvas.width;
          mask.height = canvas.height;
        }
        const mctx = mask.getContext('2d');
        mctx.setTransform(1, 0, 0, 1, 0, 0);
        mctx.clearRect(0, 0, mask.width, mask.height);
        mctx.drawImage(canvas, 0, 0);

        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        paintLightGlow(ctx, glowLights, glowPolyFor, performance.now() / 1000, { w: mW, h: mH });
        ctx.restore();

        // Clip the glow back to the sprite art so it can't show as a warm
        // rectangle over the sprite's transparent corners.
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalCompositeOperation = 'destination-in';
        ctx.drawImage(mask, 0, 0);
        ctx.restore();
      }

      // Residual fog — a door in a dim or unlit spot must be dimmed by the
      // same amount the fog dims everything around it, or the sprite becomes
      // the brightest thing on the map and gives the door away that way.
      for (const { leaves, t, lit } of painted) {
        if (lit >= 0.999) continue;
        ctx.save();
        ctx.globalCompositeOperation = 'source-atop';
        ctx.globalAlpha = 1 - lit;
        ctx.fillStyle = fowColor;
        for (const lf of leaves) {
          ctx.save();
          ctx.translate(lf.x, lf.y);
          ctx.rotate(lf.rot);
          ctx.fillRect(lf.ox, -t / 2, lf.w, t);
          ctx.restore();
        }
        ctx.restore();
      }

      ctx.restore();
      raf = requestAnimationFrame(draw);
    }
    raf = requestAnimationFrame(draw);
    return () => { running = false; if (raf) cancelAnimationFrame(raf); };
  }, [fogOfWar, stageSize, glowLights, glowPolyFor, fowColor, fowBlur]);

  // Water/illusion effect canvas — sits above the Konva stage, below the FoW.
  // Reads pixels from the Konva map layer and replays them with sinusoidal
  // horizontal-slice distortion to create a rippling water/illusion effect.
  const waterCanvasRef = useRef(null);

  // Plugin-supplied template overlays. Plugins can tag a template id with
  // { kind: 'water' } to opt it into the host's native water canvas pass.
  // Subscribing to the registry version ensures changes from the plugin
  // re-trigger the water-canvas effect's deps via the derived list below.
  const pluginRegVersion = useRegistryVersion();
  // Convert each tagged template into the dz-shape the water canvas effect
  // already understands. Circles map naturally; rect / wedge / line are
  // approximated as polygons. The synthetic id is prefixed so it can't
  // collide with a real magical-darkness zone id.
  const pluginWaterZones = useMemo(() => {
    const tagged = pluginRegistries.templateOverlays;
    if (!tagged || tagged.size === 0 || !spellTemplates?.length) return [];
    const out = [];
    for (const t of spellTemplates) {
      const tag = tagged.get(t.id);
      if (!tag || tag.kind !== 'water') continue;
      const ts = templateShapeProps(t, undefined, undefined, undefined, gridSize);
      if (!ts) continue;
      const idStr = `tpl-water-${t.id}`;
      if (ts.kind === 'circle') {
        out.push({ id: idStr, zone_type: 'water', shape: 'circle', x: ts.x, y: ts.y, radius: ts.radius, feather_amount: 0 });
      } else if (ts.kind === 'rect') {
        const x0 = ts.x, y0 = ts.y, x1 = ts.x + ts.width, y1 = ts.y + ts.height;
        out.push({ id: idStr, zone_type: 'water', shape: 'polygon', poly_points: [x0, y0, x1, y0, x1, y1, x0, y1], feather_amount: 0 });
      } else if (ts.kind === 'wedge') {
        // Approximate the cone as a polygon: apex + arc points.
        const seg = 14;
        const halfAng = (ts.angle / 2) * Math.PI / 180;
        const baseAng = ts.rotation * Math.PI / 180;
        const pts = [ts.x, ts.y];
        for (let i = 0; i <= seg; i++) {
          const a = baseAng + (i / seg) * (halfAng * 2);
          pts.push(ts.x + Math.cos(a) * ts.radius, ts.y + Math.sin(a) * ts.radius);
        }
        out.push({ id: idStr, zone_type: 'water', shape: 'polygon', poly_points: pts, feather_amount: 0 });
      } else if (ts.kind === 'line') {
        // Use the rotated rect's actual width (1 ft worth of pixels)
        // so the water-zone polygon matches the visible line template
        // exactly instead of the previous hard-coded 8 px sliver.
        const { ax, ay, bx, by, widthPx } = ts;
        const dx = bx - ax, dy = by - ay;
        const len = Math.hypot(dx, dy) || 1;
        const half = (widthPx || 8) / 2;
        const nx = -dy / len * half, ny = dx / len * half;
        out.push({ id: idStr, zone_type: 'water', shape: 'polygon', poly_points: [ax + nx, ay + ny, bx + nx, by + ny, bx - nx, by - ny, ax - nx, ay - ny], feather_amount: 0 });
      }
    }
    return out;
  }, [spellTemplates, pluginRegVersion]);

  useEffect(() => {
    const baseWaterZones = (resolvedDarkness || []).filter(dz => dz.zone_type === 'water');
    // Merge in plugin-tagged template water zones so they get the same
    // slice-distortion ripple + tint as GM-drawn water zones.
    const waterZones = [...baseWaterZones, ...pluginWaterZones];
    const fogZones   = (resolvedDarkness || []).filter(dz => dz.zone_type === 'heavy-fog');
    const canvas = waterCanvasRef.current;
    if (!canvas) return;

    if (!waterZones.length && !fogZones.length) {
      canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    let raf = null;
    let running = true;
    let offscreen = null; // reused each frame to avoid per-frame allocation
    let maskCanvas = null; // feather mask, built separately — see applyFeatherMask

    // Returns true if any sample point of a zone is inside at least one LOS polygon.
    // When FoW is disabled (GM view) always returns true.
    function zoneIsVisible(dz, czX, czY) {
      if (!fogOfWarRef.current) return true;
      const vp = visPolysRef.current;
      if (!vp || vp.length === 0) return false;
      const activePolys = vp.filter(v => v.passes && v.passes.length > 0);
      if (activePolys.length === 0) return false;

      const samples = [[czX, czY]];
      if (dz.shape === 'polygon' && Array.isArray(dz.poly_points)) {
        for (let i = 0; i < dz.poly_points.length; i += 2)
          samples.push([dz.poly_points[i], dz.poly_points[i + 1]]);
      } else if (dz.radius) {
        // 8 points around the perimeter at 80% radius
        const r = dz.radius * 0.8;
        for (let k = 0; k < 8; k++) {
          const a = (k / 8) * Math.PI * 2;
          samples.push([dz.x + Math.cos(a) * r, dz.y + Math.sin(a) * r]);
        }
      }

      return samples.some(([sx, sy]) =>
        activePolys.some(v => pointInPoly(sx, sy, v.pts))
      );
    }

    function draw() {
      if (!running) return;
      const pos = posRef.current, scale = scaleRef.current;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const t = performance.now() / 1000;
      // Konva layer canvases render at Konva.pixelRatio (capped below the
      // device ratio for memory) — sampling coords must match that, not
      // window.devicePixelRatio.
      const dpr = Konva.pixelRatio || window.devicePixelRatio || 1;

      let konvaCanvas = null;
      try {
        const stage = stageRef.current?.getStage();
        if (stage) konvaCanvas = stage.container().querySelector('canvas');
      } catch (_) {}

      // Reuse offscreen canvas, reallocate only when dimensions change
      if (!offscreen || offscreen.width !== canvas.width || offscreen.height !== canvas.height) {
        offscreen = document.createElement('canvas');
        offscreen.width  = canvas.width;
        offscreen.height = canvas.height;
      }
      const offCtx = offscreen.getContext('2d');
      if (!maskCanvas || maskCanvas.width !== canvas.width || maskCanvas.height !== canvas.height) {
        maskCanvas = document.createElement('canvas');
        maskCanvas.width  = canvas.width;
        maskCanvas.height = canvas.height;
      }

      // Feather the zone's edge by masking it with a blurred copy of its shape.
      //
      // The blur is applied while DRAWING THE MASK into its own canvas, and the
      // mask is then composited with an unfiltered, full-canvas destination-in.
      //
      // It used to set `filter` on the destination-in composite itself. A
      // filtered composite is bounded by the filter's box, and pixels outside
      // that box are left untouched rather than erased — so whatever the slice
      // pass had painted into the padded bounding box survived as hard-edged
      // rectangles of displaced map ringing the zone. Browsers disagree about
      // exactly where that box falls, which is why it showed in Safari and not
      // in Chrome. Compositing an already-blurred image has no filter box at
      // all, so every pixel outside the shape is reliably cleared everywhere.
      function applyFeatherMask(traceShape, featherPx) {
        const mctx = maskCanvas.getContext('2d');
        mctx.setTransform(1, 0, 0, 1, 0, 0);
        mctx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
        mctx.save();
        mctx.filter = `blur(${featherPx}px)`;
        mctx.translate(pos.x, pos.y);
        mctx.scale(scale, scale);
        mctx.beginPath();
        traceShape(mctx);
        mctx.fillStyle = 'black';
        mctx.fill();
        mctx.restore();

        offCtx.filter = 'none';
        offCtx.globalCompositeOperation = 'destination-in';
        offCtx.drawImage(maskCanvas, 0, 0);
        offCtx.globalCompositeOperation = 'source-over';
      }

      for (const dz of waterZones) {
        const isPolygon = dz.shape === 'polygon' && Array.isArray(dz.poly_points) && dz.poly_points.length >= 6;
        const { x: czX, y: czY } = zoneCentroid(dz);
        const czR = Math.max(zoneEffectiveRadius(dz), 40);

        if (!zoneIsVisible(dz, czX, czY)) continue;

        let bbX, bbY, bbW, bbH;
        if (isPolygon) {
          const pts = dz.poly_points;
          let x0 = pts[0], y0 = pts[1], x1 = pts[0], y1 = pts[1];
          for (let i = 2; i < pts.length; i += 2) {
            x0 = Math.min(x0, pts[i]); x1 = Math.max(x1, pts[i]);
            y0 = Math.min(y0, pts[i + 1]); y1 = Math.max(y1, pts[i + 1]);
          }
          bbX = x0; bbY = y0; bbW = x1 - x0; bbH = y1 - y0;
        } else {
          bbX = dz.x - dz.radius; bbY = dz.y - dz.radius;
          bbW = dz.radius * 2;    bbH = dz.radius * 2;
        }

        // ── Compute feather amount early so content is drawn beyond the bb ──
        // The blur mask fades featherPx outward from the zone edge. If content
        // stops at the bounding-box edge (which for circles/tight polygons
        // coincides with the zone edge), the outer half of the fade has nothing
        // to blend into, producing a harsh step. Expanding the content draw
        // region by padMap gives the blur transition real pixels to work with.
        const liveFeather = featherZoneId === dz.id ? featherValue : (dz.feather_amount || 0);
        const featherPx = liveFeather > 0
          ? Math.min(liveFeather * scale, 48)
          : Math.min(czR * scale * 0.10, 24);
        const padMap = featherPx / scale;
        const drawBbX = bbX - padMap;
        const drawBbY = bbY - padMap;
        const drawBbW = bbW + 2 * padMap;
        const drawBbH = bbH + 2 * padMap;

        // ── Draw water content to offscreen (expanded by padMap) ──────────
        offCtx.clearRect(0, 0, offscreen.width, offscreen.height);
        offCtx.save();
        offCtx.translate(pos.x, pos.y);
        offCtx.scale(scale, scale);

        // Hard-clip the content to the zone before drawing a single slice.
        //
        // The feathered `destination-in` mask below CANNOT be trusted to
        // contain it: with a blur filter applied, the browser composites only
        // within the filtered source's bounds, so destination pixels outside
        // that box are left untouched. Everything the slice pass painted into
        // the padded bounding box therefore survived — displaced chunks of map
        // in hard-edged rectangles sitting outside the water, which is exactly
        // the static-in-a-rectangle artifact.
        //
        // Clipping first means nothing can exist outside the shape, and the
        // mask's only remaining job is softening the edge inwards.
        offCtx.beginPath();
        if (isPolygon) {
          const cp = dz.poly_points;
          offCtx.moveTo(cp[0], cp[1]);
          for (let i = 2; i < cp.length; i += 2) offCtx.lineTo(cp[i], cp[i + 1]);
          offCtx.closePath();
        } else {
          // Circles can afford the outward feather room; a polygon would need
          // real polygon offsetting to do the same safely.
          offCtx.arc(dz.x, dz.y, dz.radius + padMap, 0, Math.PI * 2);
        }
        offCtx.clip();

        if (konvaCanvas && konvaCanvas.width > 0) {
          const submergedCanvas = submergedTokensLayerRef.current?.getCanvas?.()?._canvas;
          const SLICES = 50;
          const sliceH = drawBbH / SLICES;
          const maxAmp = Math.min(drawBbW * 0.045, 12);

          // Slices are drawn OPAQUE and the 0.90 is applied once, when the
          // finished zone is composited. Per-slice alpha meant the 1px overlap
          // between neighbouring slices accumulated to 0.99 while the rest of
          // the slice sat at 0.90, so every seam showed as a brighter line.
          for (let i = 0; i <= SLICES; i++) {
            const mapY = drawBbY + i * sliceH;
            const xOff = Math.sin(i * 0.42 + t * 1.5) * maxAmp
                       + Math.sin(i * 0.75 + t * 0.8) * maxAmp * 0.45;
            const yOff = Math.cos(i * 0.6  + t * 1.1) * maxAmp * 0.25;

            let srcX = ((drawBbX + xOff) * scale + pos.x) * dpr;
            let srcY = ((mapY + yOff) * scale + pos.y) * dpr;
            let srcW = drawBbW * scale * dpr;
            // The 1px overlap that hides seams between slices has to be the
            // same 1px on both sides. src used to add a whole MAP pixel while
            // dst added one SCREEN pixel, so every slice was drawn at a
            // slightly wrong vertical scale and the error showed as banding
            // that shifted with zoom.
            let srcH = (sliceH + 1 / scale) * scale * dpr;
            // The DESTINATION row is never moved — only where we sample from.
            //
            // yOff used to be added to srcY and dstY alike, which cancelled out
            // visually (sampling a row from lower down and drawing it lower
            // down shows no displacement at all) while destroying the tiling:
            // neighbouring slices moved by different amounts, so they no longer
            // met. The 1px overlap could not cover a gap of up to ~1.7px, and
            // those gaps were the glitchy border — transparent seams across the
            // zone and a scalloped, notched edge where a shifted slice fell
            // short of the clip circle.
            //
            // Displacing only srcY gives the vertical wobble that was intended,
            // and the rows still tile exactly.
            let dstX = drawBbX, dstY = mapY;
            let dstW = drawBbW, dstH = sliceH + 1 / scale;

            // Clamp source rect to canvas bounds, adjusting dest proportionally.
            // Without this, zooming in causes srcW to exceed canvas width and
            // every slice is skipped — stopping the animation entirely.
            if (srcX < 0) {
              const trim = -srcX; dstX += trim / (scale * dpr); dstW -= trim / (scale * dpr); srcW -= trim; srcX = 0;
            }
            if (srcX + srcW > konvaCanvas.width) {
              const trim = srcX + srcW - konvaCanvas.width; srcW -= trim; dstW -= trim / (scale * dpr);
            }
            if (srcY < 0) {
              const trim = -srcY; dstY += trim / (scale * dpr); dstH -= trim / (scale * dpr); srcH -= trim; srcY = 0;
            }
            if (srcY + srcH > konvaCanvas.height) {
              const trim = srcY + srcH - konvaCanvas.height; srcH -= trim; dstH -= trim / (scale * dpr);
            }
            if (srcW <= 0 || srcH <= 0 || dstW <= 0 || dstH <= 0) continue;

            offCtx.drawImage(konvaCanvas, srcX, srcY, srcW, srcH, dstX, dstY, dstW, dstH);

            if (submergedCanvas && submergedCanvas.width > 0) {
              offCtx.drawImage(submergedCanvas, srcX, srcY, srcW, srcH, dstX, dstY, dstW, dstH);
            }
          }
        }

        offCtx.restore();

        // ── Feathered edge mask ───────────────────────────────────────────
        applyFeatherMask((mctx) => {
          if (isPolygon) {
            const pts = dz.poly_points;
            mctx.moveTo(pts[0], pts[1]);
            for (let i = 2; i < pts.length; i += 2) mctx.lineTo(pts[i], pts[i + 1]);
            mctx.closePath();
          } else {
            mctx.arc(dz.x, dz.y, dz.radius, 0, Math.PI * 2);
          }
        }, featherPx);

        // Blue-teal tint, applied AFTER the mask with source-atop so it can only
        // colour pixels that actually exist.
        //
        // It used to be a fillRect over the whole padded bounding box, drawn
        // BEFORE the mask. Anywhere the slice sampling had nothing to copy —
        // most obviously past the edge of the map, and this zone runs to within
        // 16px of the bottom of the map — that left flat tint sitting on
        // nothing, and the blurred mask then kept a band of it hugging the zone
        // edge. That band is the glitchy border: solid colour with no water
        // under it, shimmering as the slices animate beneath.
        offCtx.globalCompositeOperation = 'source-atop';
        offCtx.fillStyle = 'rgba(8, 38, 88, 0.25)';
        offCtx.fillRect(0, 0, offscreen.width, offscreen.height);
        offCtx.globalCompositeOperation = 'source-over';

        // ── Composite feathered water onto main canvas ────────────────────
        // The zone's overall transparency lands here rather than per slice —
        // see the slice loop above.
        ctx.globalAlpha = 0.90;
        ctx.drawImage(offscreen, 0, 0);
        ctx.globalAlpha = 1.0;
      }

      // ── Fog zones: grey mist overlay with feathered edges ────────────────
      for (const dz of fogZones) {
        const isPolygon = dz.shape === 'polygon' && Array.isArray(dz.poly_points) && dz.poly_points.length >= 6;
        const { x: czX, y: czY } = zoneCentroid(dz);
        const czR = Math.max(zoneEffectiveRadius(dz), 40);

        if (!zoneIsVisible(dz, czX, czY)) continue;

        // Compute feather before filling so we can expand the fill region.
        const liveFeather = featherZoneId === dz.id ? featherValue : (dz.feather_amount || 0);
        const featherPx = liveFeather > 0
          ? Math.min(liveFeather * scale, 48)
          : Math.min(czR * scale * 0.10, 24);
        const padMap = featherPx / scale;

        // Compute bounding box for the expanded fill rect.
        let fogBbX, fogBbY, fogBbW, fogBbH;
        if (isPolygon) {
          const pts = dz.poly_points;
          let x0 = pts[0], y0 = pts[1], x1 = pts[0], y1 = pts[1];
          for (let i = 2; i < pts.length; i += 2) {
            x0 = Math.min(x0, pts[i]); x1 = Math.max(x1, pts[i]);
            y0 = Math.min(y0, pts[i + 1]); y1 = Math.max(y1, pts[i + 1]);
          }
          fogBbX = x0; fogBbY = y0; fogBbW = x1 - x0; fogBbH = y1 - y0;
        } else {
          fogBbX = dz.x - dz.radius; fogBbY = dz.y - dz.radius;
          fogBbW = dz.radius * 2;    fogBbH = dz.radius * 2;
        }

        offCtx.clearRect(0, 0, offscreen.width, offscreen.height);
        offCtx.save();
        offCtx.translate(pos.x, pos.y);
        offCtx.scale(scale, scale);
        // Fill the expanded bounding box — mask will clip to zone shape with feathered edge.
        offCtx.fillStyle = 'rgba(100, 116, 139, 0.55)';
        offCtx.fillRect(fogBbX - padMap, fogBbY - padMap, fogBbW + 2 * padMap, fogBbH + 2 * padMap);
        offCtx.restore();

        applyFeatherMask((mctx) => {
          if (isPolygon) {
            const pts = dz.poly_points;
            mctx.moveTo(pts[0], pts[1]);
            for (let i = 2; i < pts.length; i += 2) mctx.lineTo(pts[i], pts[i + 1]);
            mctx.closePath();
          } else {
            mctx.arc(dz.x, dz.y, dz.radius, 0, Math.PI * 2);
          }
        }, featherPx);

        ctx.drawImage(offscreen, 0, 0);
      }

      raf = requestAnimationFrame(draw);
    }

    raf = requestAnimationFrame(draw);
    return () => { running = false; cancelAnimationFrame(raf); offscreen = null; maskCanvas = null; };
  }, [resolvedDarkness, pluginWaterZones, mW, mH, stageSize, gridSize]);

  // Tremorsense blip canvas — sits above the fog canvas, no blur.
  // Draws sonar-ring indicators for grounded tokens detected by tremorsense
  // that aren't already visible through normal line of sight.
  const blipCanvasRef = useRef(null);
  const BLIP_RADII = { tiny: 0.25, small: 0.45, medium: 0.5, large: 1.0, huge: 1.5, gargantuan: 2.0 };

  useEffect(() => {
    const canvas = blipCanvasRef.current;
    if (!canvas) return;

    if (!fogOfWar || tremorsenseBlips.length === 0) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    let raf = null;
    let running = true;

    // Each blip gets a stable random phase offset based on its id so rings
    // aren't all in sync across different tokens.
    const phaseSeeds = tremorsenseBlips.map(b => ((b.id * 2654435761) & 0xFFFFFF) / 0xFFFFFF);

    function draw() {
      if (!running) return;
      const pos = posRef.current, scale = scaleRef.current;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const t = performance.now() / 1000;

      ctx.save();
      ctx.translate(pos.x, pos.y);
      ctx.scale(scale, scale);

      tremorsenseBlips.forEach(({ cx, cy, size }, bi) => {
        const r   = (BLIP_RADII[size] || 0.5) * gridSize;
        const lw  = Math.max(1, 2 / scale);
        const maxR = r * 2.2;          // rings stay within the original outer size
        const span = maxR - r;
        const PERIOD = 1.8;            // seconds per ring cycle
        const N_RINGS = 3;
        const seed = phaseSeeds[bi] || 0;

        // Expanding rings — 3 evenly staggered, starting from r, fading as they grow
        for (let i = 0; i < N_RINGS; i++) {
          const phase = ((t / PERIOD + seed + i / N_RINGS) % 1.0);
          const ringR = r + span * phase;
          const alpha = (1 - phase) * 0.58;
          const lwidth = lw * (1.8 - phase);   // thicker at center, thinner at edge
          ctx.beginPath();
          ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(205,133,50,${alpha.toFixed(3)})`;
          ctx.lineWidth = lwidth;
          ctx.stroke();
        }

        // Inner disc — subtle brightness pulse
        const pulse = 0.55 + 0.12 * Math.sin(t * 3.2 + seed * Math.PI * 2);
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(205,133,50,${pulse.toFixed(3)})`;
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,185,90,0.90)';
        ctx.lineWidth = lw * 1.5;
        ctx.stroke();
      });

      ctx.restore();
      raf = requestAnimationFrame(draw);
    }

    raf = requestAnimationFrame(draw);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
    };
  }, [fogOfWar, tremorsenseBlips, stageSize, gridSize]);


  // Ping canvas — draws expanding ring animations for DM map pings.
  // Reads pingsRef each frame so adding/removing pings never restarts the loop.
  useEffect(() => {
    const canvas = pingCanvasRef.current;
    if (!canvas) return;
    let raf = null;
    let running = true;
    const DURATION = 3500;
    const MAX_RADIUS_PX = 70;
    const N_RINGS = 3;

    function draw() {
      if (!running) return;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const now = Date.now();
      const sc = scaleRef.current;
      const px = posRef.current.x;
      const py = posRef.current.y;
      const currentPings = pingsRef.current;

      for (const ping of currentPings) {
        const elapsed = now - ping.ts;
        if (elapsed >= DURATION) continue;
        const progress = elapsed / DURATION;
        const cx = ping.x * sc + px;
        const cy = ping.y * sc + py;

        // How big the GM asked for. Screen pixels here, because this canvas
        // draws over the viewport rather than in map space — see utils/ping.
        const sz = pingSize(ping.size);
        const maxR = MAX_RADIUS_PX * sz.screenMult;

        for (let i = 0; i < N_RINGS; i++) {
          const p = (progress + i / N_RINGS) % 1;
          const radius = p * maxR;
          const alpha = (1 - p) * 0.85;
          ctx.beginPath();
          ctx.arc(cx, cy, radius, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(239,68,68,${alpha.toFixed(3)})`;
          // Thicker rings on the bigger sizes: a 2.5px line around a 220px
          // circle reads as a hairline, which is the opposite of the point.
          ctx.lineWidth = 2.5 * Math.sqrt(sz.screenMult);
          ctx.stroke();
        }

        // Solid centre dot, scaled with it so the mark still has a middle.
        const dotAlpha = Math.max(0, 1 - progress * 2);
        ctx.beginPath();
        ctx.arc(cx, cy, 5 * Math.sqrt(sz.screenMult), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(239,68,68,${dotAlpha.toFixed(3)})`;
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    }

    raf = requestAnimationFrame(draw);
    return () => {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      const c = pingCanvasRef.current;
      if (c) c.getContext('2d').clearRect(0, 0, c.width, c.height);
    };
  }, []); // permanent loop; reads pingsRef each frame

  // Token FX canvas — transformation / destruction animations. Same shape as
  // the ping loop above: one permanent rAF that reads a ref each frame, so
  // starting an effect never restarts the loop.
  useEffect(() => {
    const canvas = fxCanvasRef.current;
    if (!canvas) return;
    let raf = null;
    let running = true;

    function draw() {
      if (!running) return;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const now = Date.now();
      const sc = scaleRef.current;
      const px = posRef.current.x;
      const py = posRef.current.y;
      const gs = gridSizeRef.current;
      const ox = offsetXRef.current, oy = offsetYRef.current;
      const anchors = fxAnchorsRef.current;
      const live = new Set();

      for (const fx of (tokenFxRef.current || [])) {
        const spec = FX_SPECS[fx.effect] || FX_SPECS.vines;
        const elapsed = now - fx.ts;
        if (elapsed < 0 || elapsed >= spec.duration) continue;
        const key = `${fx.tokenId}|${fx.ts}`;
        live.add(key);

        let anchor = anchors.get(key);
        if (!anchor) {
          const tk = (tokensRef.current || []).find((t) => t.id === fx.tokenId);
          if (!tk) continue;   // token gone before we ever saw it — nothing to anchor to
          const sz = tokenFootprint(tk);
          anchor = {
            x: ox + Number(tk.grid_col) * gs + (sz.gridW * gs) / 2,
            y: oy + Number(tk.grid_row) * gs + (sz.gridH * gs) / 2,
            r: (Math.max(sz.gridW, sz.gridH) * gs) / 2,
          };
          anchors.set(key, anchor);
        }

        const painter = FX_PAINTERS[fx.effect];
        if (!painter) continue;
        painter(ctx, anchor.x * sc + px, anchor.y * sc + py, anchor.r * sc, elapsed / spec.duration);
      }

      // Ship destruction. Self-contained: the event carries the hull's geometry,
      // so nothing needs to still exist in `ships` for this to paint.
      for (const fx of (shipFxRef.current || [])) {
        const spec = SHIP_FX_SPECS[fx.effect];
        const painter = SHIP_FX_PAINTERS[fx.effect];
        if (!spec || !painter) continue;
        const elapsed = now - fx.ts;
        if (elapsed < 0 || elapsed >= spec.duration) continue;
        const w = Number(fx.cols) * gs, h = Number(fx.rows) * gs;
        const cx = ox + (Number(fx.gridCol) + Number(fx.offsetCol || 0)) * gs + w / 2;
        const cy = oy + (Number(fx.gridRow) + Number(fx.offsetRow || 0)) * gs + h / 2;
        painter(ctx, cx * sc + px, cy * sc + py, (Math.max(w, h) / 2) * sc, elapsed / spec.duration);
      }

      // Drop anchors for effects that have finished so the map can't grow.
      if (anchors.size > live.size) {
        for (const k of [...anchors.keys()]) if (!live.has(k)) anchors.delete(k);
      }

      raf = requestAnimationFrame(draw);
    }

    raf = requestAnimationFrame(draw);
    return () => {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      const c = fxCanvasRef.current;
      if (c) c.getContext('2d').clearRect(0, 0, c.width, c.height);
    };
  }, []); // permanent loop; reads refs each frame

  // Refs to always-current props (avoid stale closures in DOM event handlers)
  const onTokenMoveRef   = useRef(onTokenMove);
  const onTokenSelectRef = useRef(onTokenSelect);
  const onMapClickRef    = useRef(onMapClick);
  const gridSizeRef      = useRef(gridSize);
  const isHexGridRef     = useRef(isHexGrid);
  const offsetXRef       = useRef(offsetX);
  const offsetYRef       = useRef(offsetY);
  const tokensRef        = useRef(tokens);
  const activeToolRef    = useRef(activeTool);
  const placingTokenRef  = useRef(placingToken);
  const selectedTokenIdRef = useRef(selectedTokenId);
  // Without this ref, the stable mousedown handler captures the empty
  // initial array and never sees templates placed after the first mount —
  // so tpl-edit / tpl-erase silently do nothing on freshly-drawn shapes.
  const spellTemplatesRef = useRef(spellTemplates);
  const onTokenContextMenuRef = useRef(onTokenContextMenu);
  useEffect(() => { onTokenContextMenuRef.current = onTokenContextMenu; }, [onTokenContextMenu]);
  const spawnPointsRef = useRef(spawnPoints);
  useEffect(() => { spawnPointsRef.current = spawnPoints; }, [spawnPoints]);
  const onSpawnNamedAddRef = useRef(onSpawnNamedAdd);
  useEffect(() => { onSpawnNamedAddRef.current = onSpawnNamedAdd; }, [onSpawnNamedAdd]);
  // Polygon-draw scratch space for the spawn-named tool. Holds a flat
  // [x, y, x, y, ...] array of vertices in map-pixel coords while the
  // GM is dragging vertices in. Cleared on finalise / Esc.
  const spawnPolyDrawRef = useRef(null);
  const [spawnPolyPreview, setSpawnPolyPreview] = useState(null);
  const onSpawnPointMoveRef = useRef(onSpawnPointMove);
  useEffect(() => { onSpawnPointMoveRef.current = onSpawnPointMove; }, [onSpawnPointMove]);
  const terrainRef = useRef(terrain);
  useEffect(() => { terrainRef.current = terrain; }, [terrain]);
  const onTerrainMoveRef = useRef(onTerrainMove);
  useEffect(() => { onTerrainMoveRef.current = onTerrainMove; }, [onTerrainMove]);
  const onTerrainResizeRef = useRef(onTerrainResize);
  useEffect(() => { onTerrainResizeRef.current = onTerrainResize; }, [onTerrainResize]);
  const onShipRemoveRef = useRef(onShipRemove);
  useEffect(() => { onShipRemoveRef.current = onShipRemove; }, [onShipRemove]);
  const onTerrainContextMenuRef = useRef(onTerrainContextMenu);
  const levelTransitionsRef = useRef(levelTransitions);
  const onStairUseRef = useRef(onStairUse);
  const onStairPlaceRef = useRef(onStairPlace);
  const onStairRemoveRef = useRef(onStairRemove);
  const onStairAdjustRef = useRef(onStairAdjust);
  const onDoorKindSetRef = useRef(onDoorKindSet);
  useEffect(() => { onTerrainContextMenuRef.current = onTerrainContextMenu; }, [onTerrainContextMenu]);
  useEffect(() => { levelTransitionsRef.current = levelTransitions; }, [levelTransitions]);
  useEffect(() => { onStairUseRef.current = onStairUse; }, [onStairUse]);
  useEffect(() => { onStairPlaceRef.current = onStairPlace; }, [onStairPlace]);
  useEffect(() => { onStairRemoveRef.current = onStairRemove; }, [onStairRemove]);
  useEffect(() => { onStairAdjustRef.current = onStairAdjust; }, [onStairAdjust]);
  useEffect(() => { onDoorKindSetRef.current = onDoorKindSet; }, [onDoorKindSet]);
  const onTerrainPlaceRef = useRef(onTerrainPlace);
  useEffect(() => { onTerrainPlaceRef.current = onTerrainPlace; }, [onTerrainPlace]);
  const onTerrainSelectRef = useRef(onTerrainSelect);
  useEffect(() => { onTerrainSelectRef.current = onTerrainSelect; }, [onTerrainSelect]);
  const pendingTerrainRef = useRef(pendingTerrain);
  useEffect(() => { pendingTerrainRef.current = pendingTerrain; }, [pendingTerrain]);
  const pendingTileRef = useRef(pendingTile);
  useEffect(() => { pendingTileRef.current = pendingTile; }, [pendingTile]);
  const onTileStageRef = useRef(onTileStage);
  useEffect(() => { onTileStageRef.current = onTileStage; }, [onTileStage]);
  const onTileMenuRef = useRef(onTileMenu);
  useEffect(() => { onTileMenuRef.current = onTileMenu; }, [onTileMenu]);
  // Read inside the contextmenu handler, which is bound once and would
  // otherwise close over the tile list as it was when the map loaded.
  const tilesRef = useRef(tiles);
  useEffect(() => { tilesRef.current = tiles; }, [tiles]);
  const selectedTerrainIdRef = useRef(selectedTerrainId);
  useEffect(() => { selectedTerrainIdRef.current = selectedTerrainId; }, [selectedTerrainId]);
  const resizingTerrainIdRef = useRef(resizingTerrainId);
  useEffect(() => { resizingTerrainIdRef.current = resizingTerrainId; }, [resizingTerrainId]);

  // Ship refs — the pointer handlers live in a long-lived effect, so
  // everything they touch has to come through a ref rather than a closure.
  const shipsRef = useRef(ships);
  useEffect(() => { shipsRef.current = ships; }, [ships]);
  const activeDeckByShipRef = useRef(activeDeckByShip);
  useEffect(() => { activeDeckByShipRef.current = activeDeckByShip; }, [activeDeckByShip]);
  // The DOM-level hit tests need to know whether the whole hull is on screen or
  // just one level, because that decides how much of it is grabbable.
  const gmAllDecksShipsRef = useRef(gmAllDecksShips);
  useEffect(() => { gmAllDecksShipsRef.current = gmAllDecksShips; }, [gmAllDecksShips]);
  // Map extent, for the crew preview: gridOffsets() has to be handed the same
  // dimensions the renderer derives its own offsetX/offsetY from, or the
  // preview sits half a square off what the stage draws.
  const mWRef = useRef(mW);
  useEffect(() => { mWRef.current = mW; }, [mW]);
  const mHRef = useRef(mH);
  useEffect(() => { mHRef.current = mH; }, [mH]);
  const selectedShipIdRef = useRef(selectedShipId);
  useEffect(() => { selectedShipIdRef.current = selectedShipId; }, [selectedShipId]);
  const onShipSelectRef = useRef(onShipSelect);
  useEffect(() => { onShipSelectRef.current = onShipSelect; }, [onShipSelect]);
  const onShipMoveRef = useRef(onShipMove);
  useEffect(() => { onShipMoveRef.current = onShipMove; }, [onShipMove]);
  const onShipRotateRef = useRef(onShipRotate);
  useEffect(() => { onShipRotateRef.current = onShipRotate; }, [onShipRotate]);
  const onShipDeckChangeRef = useRef(onShipDeckChange);
  useEffect(() => { onShipDeckChangeRef.current = onShipDeckChange; }, [onShipDeckChange]);

  // Preview where this ship's crew stand for a hypothetical placement, using
  // the SAME projection the server will run on release (utils/ships.js is the
  // client mirror of backend/src/ships.js, kept identical for exactly this).
  // Anything approximated here would show as tokens twitching the instant the
  // authoritative positions arrive.
  const projectCrew = useCallback((ship, override) => {
    if (!ship) return null;
    const decks = ship.decks || [];
    if (!decks.length) return null;
    const gs = gridSizeRef.current;
    const moved = { ...ship, ...override };
    const ref = shipReferenceDeck(decks);
    const out = new Map();
    for (const t of tokensRef.current || []) {
      if (t.ship_id !== ship.id || t.deck_col == null || t.deck_row == null) continue;
      const deck = decks.find(d => d.deck_index === (t.deck_index ?? 0)) || decks[0];
      if (!deck) continue;
      const ext = shipTokenExtent(t);
      const { col, row } = shipDeckToWorld({
        ship: moved,
        deck,
        refDeck: ref,
        gridSize: gs,
        mapWidth: mWRef.current,
        mapHeight: mHRef.current,
        deckCol: t.deck_col,
        deckRow: t.deck_row,
        extentCols: ext,
        extentRows: ext,
      });
      out.set(t.id, { x: offsetXRef.current + col * gs, y: offsetYRef.current + row * gs });
    }
    return out.size ? out : null;
  }, []);
  const projectCrewRef = useRef(projectCrew);
  useEffect(() => { projectCrewRef.current = projectCrew; }, [projectCrew]);

  // Hand the crew back to the server. `tokens` changing identity means the
  // patched positions have landed, so the preview has done its job; the timer
  // is the backstop for a ship whose crew the server had nothing to say about
  // (empty deck, or a dropped connection), where no token update ever arrives.
  useEffect(() => {
    if (!crewVisPendingRef.current) return;
    crewVisPendingRef.current = false;
    setCrewVis(null);
  }, [tokens]);
  useEffect(() => {
    if (!crewVis || !crewVisPendingRef.current) return;
    const id = setTimeout(() => { crewVisPendingRef.current = false; setCrewVis(null); }, 2000);
    return () => clearTimeout(id);
  }, [crewVis]);

  const playerNameRef = useRef(playerName);
  useEffect(() => { playerNameRef.current = playerName; }, [playerName]);
  const onTokenDeckMoveRef = useRef(onTokenDeckMove);
  useEffect(() => { onTokenDeckMoveRef.current = onTokenDeckMove; }, [onTokenDeckMove]);
  const onTokenChangeDeckRef = useRef(onTokenChangeDeck);
  useEffect(() => { onTokenChangeDeckRef.current = onTokenChangeDeck; }, [onTokenChangeDeck]);
  const playerTokenIdRef = useRef(playerTokenId);
  useEffect(() => { playerTokenIdRef.current = playerTokenId; }, [playerTokenId]);
  const tokensByIdRef = useRef(new Map());
  useEffect(() => { tokensByIdRef.current = new Map(tokens.map(t => [t.id, t])); }, [tokens]);


  // Where did a dropped token actually land — open map, or a ship's deck?
  //
  // Called from both the mouse and touch commit paths, which live in different
  // scopes, so this is defined at component level over refs rather than inside
  // either handler. Routes to onTokenDeckMove when the drop lands on a deck,
  // or when the token was aboard and has now been pulled off the side; falls
  // through to the ordinary onTokenMove otherwise, so nothing changes for
  // tokens on maps with no ships.
  const commitTokenMove = useCallback((id, col, row) => {
    const gs = gridSizeRef.current;
    const ox = offsetXRef.current, oy = offsetYRef.current;
    const mapX = ox + col * gs, mapY = oy + row * gs;

    // Which deck the drop landed on, in the SAME frame the renderer and the
    // server use. This used to hand-roll the test and got two things wrong:
    //
    //   * it hung the deck rect off `s.grid_col` with no `deck.offset_col`, so
    //     any deck that isn't flush with the hull (the upper decks here sit at
    //     offset_col 3, 4 wide against a 10-wide main deck) was hit-tested
    //     against a rectangle that wasn't where it was drawn; and
    //   * it rotated about the drawn deck's own centre rather than the
    //     reference deck's pivot, so on a turned hull the two frames drifted
    //     further apart the more the decks differed in size.
    //
    // A token standing on an upper deck therefore missed the deck it was
    // visibly standing on. `landed` came back null, the `wasAboard` branch
    // below read that as "dragged over the rail", and the drop was committed
    // as a disembark — which the server answered by clearing the binding and
    // snapping the token back to its world coords, i.e. a token that would not
    // move no matter where you dropped it.
    //
    // Same construction as `worldToShipLocal` further down, which hit-tests
    // hulls and stairwells correctly; kept in step with utils/ships.js.
    let landed = null;
    const list = shipsRef.current || [];
    // Test the token's CENTRE, not its top-left corner: the server projects
    // through the centre (see worldToDeck's extent handling), so testing the
    // corner would disagree for anything bigger than one square.
    const ext = shipTokenExtent(tokensByIdRef.current.get(id));
    const cMapX = mapX + (ext * gs) / 2;
    const cMapY = mapY + (ext * gs) / 2;
    for (let i = list.length - 1; i >= 0; i--) {
      const s = list[i];
      const drawn = activeDeckByShipRef.current?.get(s.id);
      if (!drawn) continue;
      // Test the drawn deck first, then every other deck on the hull.
      //
      // Only checking the drawn one meant a drop over the main deck while an
      // upper deck was selected missed — the upper decks are 4 wide at
      // offset_col 3 against a 10-wide main deck — and a miss reads as "over the
      // rail", so the token was thrown off the ship. The server applies the same
      // fallback; these two have to agree about what counts as aboard.
      const decks = [drawn, ...(s.decks || []).filter(d => d !== drawn)].filter(d => d && !d.is_sails);
      const ref = shipReferenceDeck(s.decks) || drawn;
      const px = ox + (Number(s.grid_col) + Number(ref.offset_col || 0)) * gs + (Number(ref.grid_cols) * gs) / 2;
      const py = oy + (Number(s.grid_row) + Number(ref.offset_row || 0)) * gs + (Number(ref.grid_rows) * gs) / 2;
      const θ = ((Number(s.rotation) || 0) * Math.PI) / 180;
      const cosA = Math.cos(-θ), sinA = Math.sin(-θ);
      const dx = cMapX - px, dy = cMapY - py;
      for (const deck of decks) {
        const w = Number(deck.grid_cols) * gs, h = Number(deck.grid_rows) * gs;
        const tlx = ox + (Number(s.grid_col) + Number(deck.offset_col || 0)) * gs;
        const tly = oy + (Number(s.grid_row) + Number(deck.offset_row || 0)) * gs;
        const lx = px + (dx * cosA - dy * sinA) - tlx;
        const ly = py + (dx * sinA + dy * cosA) - tly;
        if (lx >= 0 && lx <= w && ly >= 0 && ly <= h) { landed = { ship: s, deck }; break; }
      }
      if (landed) break;
    }

    const wasAboard = tokensByIdRef.current.get(id)?.ship_id != null;
    if (landed && onTokenDeckMoveRef.current) {
      onTokenDeckMoveRef.current(id, landed.ship.id, landed.deck.deck_index, col, row);
      return;
    }
    if (wasAboard && onTokenDeckMoveRef.current) {
      // Dragged off the side — the server clears the binding and keeps the
      // world coords, so the token stays exactly where it was dropped.
      onTokenDeckMoveRef.current(id, null, 0, col, row);
      return;
    }
    onTokenMoveRef.current?.(id, col, row);
  }, []);

  // HTMLImageElement cache keyed by lib_image_path so each terrain
  // image only loads once across all instances.
  const [terrainImages, setTerrainImages] = useState({});
  useEffect(() => {
    const need = new Set();
    for (const t of terrain) if (t.lib_image_path) need.add(t.lib_image_path);
    if (pendingTerrain?.lib_image_path) need.add(pendingTerrain.lib_image_path);
    let cancelled = false;
    for (const p of need) {
      if (terrainImages[p]) continue;
      const img = new window.Image();
      img.src = `/uploads/${p}`;
      img.onload = () => {
        if (cancelled) return;
        setTerrainImages((prev) => ({ ...prev, [p]: img }));
      };
    }
    return () => { cancelled = true; };
  }, [terrain, pendingTerrain]); // eslint-disable-line react-hooks/exhaustive-deps

  // The same cache for laid tiles. Separate from the terrain one because a
  // tile is keyed by its OWN stored path — a laid tile keeps working after
  // its library row is edited or deleted, so it cannot share a cache keyed by
  // library path.
  const [tileImages, setTileImages] = useState({});
  useEffect(() => {
    const need = new Set();
    for (const t of tiles) if (t.image_path) need.add(t.image_path);
    if (pendingTile?.image_path) need.add(pendingTile.image_path);
    let cancelled = false;
    for (const p of need) {
      if (tileImages[p]) continue;
      // Capped: laid tiles are the other half of this board's memory. Five
      // 4096×4096 tiles is 320MB decoded, and each covers a few hundred pixels
      // of screen. Drawn at an explicit width/height below, so a smaller
      // surface changes nothing about where the tile sits.
      loadCappedImage(`/uploads/${p}`).then((art) => {
        if (cancelled) return;
        setTileImages((prev) => ({ ...prev, [p]: art.source }));
      }).catch(() => {});
    }
    return () => { cancelled = true; };
  }, [tiles, pendingTile]); // eslint-disable-line react-hooks/exhaustive-deps

  // Tinted copies of terrain art, keyed `${path}|${#rrggbb}`.
  //
  // A ref rather than state: the entry is derived purely from an image that has
  // already loaded and a colour string, so there is nothing to re-render when
  // one is created — and putting it in state would make every first draw of a
  // tinted piece a second render pass.
  const tintedTerrainRef = useRef(new Map());
  const tintedTerrainImage = useCallback((img, path, color) => {
    if (!img || !/^#[0-9a-f]{6}$/i.test(String(color || ''))) return img;
    const key = `${path}|${String(color).toLowerCase()}`;
    const hit = tintedTerrainRef.current.get(key);
    if (hit) return hit;
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (!w || !h) return img;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    // MULTIPLY, then re-apply the original alpha.
    //
    // A plain 'source-atop' fill would flatten the art's internal shading to
    // one flat colour, turning a vapour bank into a coloured blob. Multiply
    // keeps every light and dark value and just shifts the hue. The catch is
    // that a separable blend mode paints normally wherever the backdrop is
    // transparent, so the fill floods the empty corners — 'destination-in'
    // with the original image afterwards masks the result back to the art's own
    // alpha, restoring the soft edges.
    g.drawImage(img, 0, 0, w, h);
    g.globalCompositeOperation = 'multiply';
    g.fillStyle = color;
    g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = 'destination-in';
    g.drawImage(img, 0, 0, w, h);
    g.globalCompositeOperation = 'source-over';
    tintedTerrainRef.current.set(key, c);
    return c;
  }, []);

  // Token name label size, in MAP units, resolved once for every token.
  //
  // Sized as a fraction of a grid square — i.e. of the token itself — and
  // deliberately independent of zoom. The stage's own scale then carries it,
  // so the label grows and shrinks with the token it names, the way a label
  // painted on the map would.
  //
  // Grid sizes across one campaign here run 20 → 256, and what reads as
  // "massive" is the label's size relative to the squares, not its pixel
  // count: the same 43px label is 0.17 squares on a 256 grid and 2.2 squares
  // on a 20 grid. Tying it to the grid is what makes it look the same on every
  // map.
  //
  // An earlier version clamped this to a screen-pixel range and divided the
  // result back by `scale`. That pinned the label to a constant on-screen size
  // — zoom in and the text stayed put while the token grew under it. Any
  // screen-space term here reintroduces that, so there is none.
  const effectiveNameFont = useMemo(() => {
    return (gridSize || REFERENCE_GRID) * NAME_LABEL_SQUARES * (tokenNameFontSize / 45);
  }, [tokenNameFontSize, gridSize]);

  // Who, if anyone, is standing at each ship's helm. `mine` marks the viewer's
  // own token, which is what turns the wheel glyph up bright and what lets this
  // client drag the hull — the same test the server runs before accepting the
  // move, so the UI can't offer control the server will refuse.
  const helmTokenByShip = useMemo(() => {
    const out = new Map();
    for (const s of ships) {
      const decks = s.decks || [];
      if (!decks.some(d => d.helm && d.helm.col != null)) continue;
      // Collect EVERYONE on the helm square, then prefer our own token.
      //
      // This used to take the first match and break, so with two crew on the
      // wheel the answer depended on array order: it could report `mine: false`
      // to the player actually holding the helm because a shipmate sorted
      // first, and `mine: true` to the shipmate. A helm square is one square,
      // but footprints overlap it and nothing stops two tokens sharing it.
      const atHelm = [];
      for (const t of tokens) {
        if (t.ship_id !== s.id || t.deck_col == null) continue;
        const deck = decks.find(d => d.deck_index === (t.deck_index ?? 0));
        if (!shipIsAtHelm(deck, t.deck_col, t.deck_row, t)) continue;
        atHelm.push(t);
      }
      if (!atHelm.length) continue;
      const own = isPlayer && playerTokenId != null
        ? atHelm.find(t => t.id === playerTokenId)
        : null;
      const t = own || atHelm[0];
      // `mine` also carries the right to steer, so it has to respect the
      // spell-slot rule the server enforces — otherwise a crewmate with no
      // slots standing on the helm gets a hull they can drag locally and a
      // server that silently refuses every move.
      out.set(s.id, { token: t, mine: !!own && canPilot });
    }
    return out;
  }, [ships, tokens, isPlayer, playerTokenId, canPilot]);
  const helmTokenByShipRef = useRef(helmTokenByShip);
  useEffect(() => { helmTokenByShipRef.current = helmTokenByShip; }, [helmTokenByShip]);

  // Live readout while a ship is being dragged: distance travelled against the
  // ship class's speed, so the GM can see when they've used the round's move.
  const [shipMeasure, setShipMeasure] = useState(null);
  const [shipImages, setShipImages] = useState({});
  useEffect(() => {
    const need = new Set();
    for (const s of ships) for (const d of (s.decks || [])) if (d.image_path) need.add(d.image_path);
    let cancelled = false;
    for (const p of need) {
      if (shipImages[p]) continue;
      const img = new window.Image();
      img.src = `/uploads/${p}`;
      img.onload = () => {
        if (cancelled) return;
        setShipImages((prev) => ({ ...prev, [p]: img }));
      };
    }
    return () => { cancelled = true; };
  }, [ships]); // eslint-disable-line react-hooks/exhaustive-deps


  // Animated open/closed progress per door (0 = closed, 1 = open). Sprites
  // interpolate between the two poses; a short RAF eases the value on toggle
  // so the sprite swings/slides instead of snapping.
  const [doorAnim, setDoorAnim] = useState({}); // doorId -> progress 0..1
  const doorAnimRef = useRef({});   // live values read inside RAF
  const doorTargetRef = useRef({}); // desired end value per door
  const doorRafRef = useRef(null);
  useEffect(() => {
    let changed = false;
    for (const d of doors) {
      const target = d.is_open ? 1 : 0;
      if (doorTargetRef.current[d.id] !== target) {
        doorTargetRef.current[d.id] = target;
        if (doorAnimRef.current[d.id] == null) {
          // First sight of this door — start at its current pose, no animation.
          doorAnimRef.current[d.id] = target;
          setDoorAnim((prev) => ({ ...prev, [d.id]: target }));
        } else {
          changed = true;
        }
      }
    }
    if (!changed) return;
    if (doorRafRef.current) return; // loop already running
    const SPEED = 1 / 0.35; // full swing in ~350ms
    let last = performance.now();
    const step = () => {
      const now = performance.now();
      const dt = (now - last) / 1000;
      last = now;
      let anyMoving = false;
      const next = { ...doorAnimRef.current };
      for (const id of Object.keys(doorTargetRef.current)) {
        const tgt = doorTargetRef.current[id];
        const cur = next[id] ?? tgt;
        if (Math.abs(cur - tgt) < 0.001) { next[id] = tgt; continue; }
        const dir = tgt > cur ? 1 : -1;
        let v = cur + dir * SPEED * dt;
        if ((dir > 0 && v > tgt) || (dir < 0 && v < tgt)) v = tgt;
        next[id] = v;
        anyMoving = true;
      }
      doorAnimRef.current = next;
      setDoorAnim(next);
      if (anyMoving) {
        doorRafRef.current = requestAnimationFrame(step);
      } else {
        doorRafRef.current = null;
      }
    };
    doorRafRef.current = requestAnimationFrame(step);
  }, [doors]);
  useEffect(() => () => { if (doorRafRef.current) cancelAnimationFrame(doorRafRef.current); }, []);
  // Live drag preview for the spawn point being moved. Stage listening
  // is disabled at the Konva level (perf), so drag is implemented via
  // the container's native mousedown/move/up like tokens — see the
  // matching ref/state in the gesture block below.
  const [spawnDragVis, setSpawnDragVis] = useState(null);
  useEffect(() => { onTokenMoveRef.current   = onTokenMove;   }, [onTokenMove]);
  useEffect(() => { onTokenSelectRef.current = onTokenSelect; }, [onTokenSelect]);
  useEffect(() => { onMapClickRef.current    = onMapClick;    }, [onMapClick]);
  useEffect(() => { gridSizeRef.current      = gridSize;      }, [gridSize]);
  useEffect(() => { isHexGridRef.current     = isHexGrid;     }, [isHexGrid]);
  useEffect(() => { offsetXRef.current       = offsetX;       }, [offsetX]);
  useEffect(() => { offsetYRef.current       = offsetY;       }, [offsetY]);
  useEffect(() => { tokensRef.current        = tokens;        }, [tokens]);
  useEffect(() => { activeToolRef.current    = activeTool;    }, [activeTool]);
  useEffect(() => { placingTokenRef.current  = placingToken;  }, [placingToken]);
  useEffect(() => { selectedTokenIdRef.current = selectedTokenId; }, [selectedTokenId]);
  useEffect(() => { spellTemplatesRef.current = spellTemplates; }, [spellTemplates]);

  // Container resize observer
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect;
      if (width > 0 && height > 0) setStageSize({ w: width, h: height });
    });
    ro.observe(el);
    const r = el.getBoundingClientRect();
    if (r.width > 0) setStageSize({ w: r.width, h: r.height });
    return () => ro.disconnect();
  }, []);

  // ── DOM-level mouse interaction ───────────────────────────────────────────
  // Bypasses Konva's hit detection entirely — uses bounding box math instead.
  // mousemove/mouseup on window so drag works even when mouse leaves the canvas.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function toMap(clientX, clientY) {
      const rect = container.getBoundingClientRect();
      return {
        x: (clientX - rect.left - posRef.current.x) / scaleRef.current,
        y: (clientY - rect.top  - posRef.current.y) / scaleRef.current,
      };
    }

    // World → piece-local-unrotated frame transform. Reverses the
    // Group's center-pivot rotation so we can hit-test and drag in
    // the piece's natural [0,0]–[w,h] coordinate space. Returns the
    // local x/y plus the piece's pixel width/height for convenience.
    function worldToLocal(mapX, mapY, t) {
      const gs = gridSizeRef.current;
      const ox = offsetXRef.current, oy = offsetYRef.current;
      const w = Number(t.width)  * gs;
      const h = Number(t.height) * gs;
      const cx = ox + (Number(t.grid_col) + Number(t.width)  / 2) * gs;
      const cy = oy + (Number(t.grid_row) + Number(t.height) / 2) * gs;
      const θ = (Number(t.rotation) || 0) * Math.PI / 180;
      const dx = mapX - cx;
      const dy = mapY - cy;
      const cosA = Math.cos(-θ), sinA = Math.sin(-θ);
      const lx = dx * cosA - dy * sinA;
      const ly = dx * sinA + dy * cosA;
      return { x: lx + w / 2, y: ly + h / 2, w, h };
    }

    // Resize / rotate handle hit-test for the currently-selected
    // terrain piece. Returns 'br' / 'r' / 'b' / 'rotate' or null.
    // All math runs in the piece's local frame via worldToLocal.
    // Rotate handle stub-length scales with the piece's height so it
    // shrinks alongside the artwork at zoom-out — keeps the handle
    // visually anchored to the piece rather than floating in screen
    // space.
    function hitTerrainHandle(mapX, mapY) {
      // Only while the GM has explicitly put this piece into resize mode.
      // Otherwise the handle boxes sit around every selected piece and eat
      // clicks meant for the map, the tokens, or the piece's own body.
      const id = resizingTerrainIdRef.current;
      if (id == null || id !== selectedTerrainIdRef.current) return null;
      const t = (terrainRef.current || []).find((x) => x.id === id);
      if (!t) return null;
      // A locked piece has no handles at all. Resize mode can survive a lock
      // (the GM locks a piece while it happens to be selected), and leaving the
      // handles armed would let the lock be defeated by grabbing a corner.
      if (t.locked) return null;
      const local = worldToLocal(mapX, mapY, t);
      const r = 12 / scaleRef.current;
      const rotOffset = Math.max(local.h * 0.18, 8);
      const handles = [
        { id: 'rotate', x: local.w / 2, y: -rotOffset },
        { id: 'br',     x: local.w,     y: local.h     },
        { id: 'r',      x: local.w,     y: local.h / 2 },
        { id: 'b',      x: local.w / 2, y: local.h     },
      ];
      for (const h of handles) {
        if (Math.abs(local.x - h.x) <= r && Math.abs(local.y - h.y) <= r) return h.id;
      }
      return null;
    }

    // Topmost terrain piece under the cursor. Body hit-test runs in
    // piece-local coords so a rotated rectangle still picks up
    // correctly — clicking the rotated artwork hits, clicking outside
    // its actual silhouette doesn't.
    // `allowLocked` is what makes a lock a lock. A locked piece is invisible to
    // every interaction path — it can't be dragged, can't be selected, and
    // crucially doesn't consume a click that was meant for the map, a token
    // standing on it, or the wall being drawn across it. The one caller that
    // passes true is the right-click menu, since a piece that can't be reached
    // by any means is a piece that can never be unlocked again.
    function hitTerrain(mapX, mapY, allowLocked = false) {
      const list = terrainRef.current || [];
      for (let i = list.length - 1; i >= 0; i--) {
        const t = list[i];
        if (t.locked && !allowLocked) continue;
        const local = worldToLocal(mapX, mapY, t);
        if (local.x < 0 || local.x > local.w || local.y < 0 || local.y > local.h) continue;
        // A marker is drawn as a disc inscribed in its box (see the is_marker
        // branch in the render), so the box corners are empty space. Testing
        // the rectangle made a planet grab clicks well outside its own edge.
        if (t.is_marker) {
          const d = Math.min(local.w, local.h);
          const cx = local.w / 2, cy = local.h / 2;
          if (Math.hypot(local.x - cx, local.y - cy) > d / 2) continue;
        }
        return t;
      }
      return null;
    }

    // ── Ship hit-testing ──────────────────────────────────────────────────
    // Same idea as worldToLocal for terrain, but the ship's size comes from
    // its ACTIVE DECK rather than stored width/height — decks can differ in
    // shape, and the hull you can click is the level you can see.
    function worldToShipLocal(mapX, mapY, s, deck) {
      const gs = gridSizeRef.current;
      const ox = offsetXRef.current, oy = offsetYRef.current;
      const w = Number(deck.grid_cols) * gs;
      const h = Number(deck.grid_rows) * gs;
      // Pivot is the REFERENCE deck's centre, shared by every level, so
      // hit-testing agrees with the render however the hull is turned and
      // whichever deck is showing. Must match utils/ships.js.
      const ref = shipReferenceDeck(s.decks) || deck;
      const px = ox + (Number(s.grid_col) + Number(ref.offset_col || 0)) * gs + (Number(ref.grid_cols) * gs) / 2;
      const py = oy + (Number(s.grid_row) + Number(ref.offset_row || 0)) * gs + (Number(ref.grid_rows) * gs) / 2;
      const tlx = ox + (Number(s.grid_col) + Number(deck.offset_col || 0)) * gs;
      const tly = oy + (Number(s.grid_row) + Number(deck.offset_row || 0)) * gs;
      const θ = ((Number(s.rotation) || 0) * Math.PI) / 180;
      const dx = mapX - px, dy = mapY - py;
      const cosA = Math.cos(-θ), sinA = Math.sin(-θ);
      const lx = dx * cosA - dy * sinA;
      const ly = dx * sinA + dy * cosA;
      return { x: px + lx - tlx, y: py + ly - tly, w, h, cx: px, cy: py };
    }

    // Topmost ship under the cursor, with the deck that was hit.
    //
    // Normally only the deck being drawn is grabbable, which is right when one
    // level is on screen. With the GM's all-layers view on, the whole hull is
    // drawn but only the active deck's box was testable — so on a ship whose
    // levels are different sizes or offset, most of the visible hull was dead
    // to clicks and the ship couldn't be dragged, selected or right-clicked.
    // Test every drawn deck in that mode: what you can see is what you can grab.
    function hitShip(mapX, mapY) {
      const list = shipsRef.current || [];
      for (let i = list.length - 1; i >= 0; i--) {
        const s = list[i];
        const active = activeDeckByShipRef.current?.get(s.id);
        if (!active) continue;
        // Per hull: only the ships actually showing every layer get every
        // layer treated as grabbable.
        const allDecks = !isPlayer && gmAllDecksShipsRef.current.has(s.id);
        const inside = (dk) => {
          const local = worldToShipLocal(mapX, mapY, s, dk);
          return (local.x >= 0 && local.x <= local.w && local.y >= 0 && local.y <= local.h)
            ? local
            : null;
        };
        // The active deck wins when it's under the cursor, so transitions, the
        // helm and everything else keyed to it behave exactly as before.
        const activeLocal = inside(active);
        if (activeLocal) return { ship: s, deck: active, local: activeLocal };
        if (!allDecks) continue;
        // Otherwise take the topmost other level the cursor is over. Highest
        // deck_index first — that's the one drawn last, and the one the GM
        // believes they clicked.
        const others = (s.decks || [])
          .filter(d => d.deck_index !== active.deck_index)
          .slice()
          .sort((a, b) => b.deck_index - a.deck_index);
        for (const d of others) {
          const local = inside(d);
          // `deck` stays the ACTIVE one even though another level was struck:
          // callers use it as "the level this viewer is working on", and the
          // GM's chosen level doesn't change just because they grabbed the hull
          // by a different deck's overhang. `local` is that struck deck's
          // coords, and no caller reads it — only `ship` is used.
          if (local) return { ship: s, deck: active, local, hitDeck: d };
        }
      }
      return null;
    }

    // A stairwell / ladder / hatch square on a ship's visible deck. Runs in
    // deck-local space, so it keeps working however the hull is rotated.
    // Returns { ship, deck, tr } or null.
    function hitShipTransition(mapX, mapY) {
      const gs = gridSizeRef.current;
      const list = shipsRef.current || [];
      for (let i = list.length - 1; i >= 0; i--) {
        const s = list[i];
        const deck = activeDeckByShipRef.current?.get(s.id);
        if (!deck) continue;
        const trs = deck.transitions || [];
        if (!trs.length) continue;
        const local = worldToShipLocal(mapX, mapY, s, deck);
        if (local.x < 0 || local.x > local.w || local.y < 0 || local.y > local.h) continue;
        for (const tr of trs) {
          // Stairwells are freehand rectangles now — a fractional origin and a
          // size in squares. Anything drawn before this has no w/h and is the
          // one square it always was.
          const tw = Number(tr.w) > 0 ? Number(tr.w) : 1;
          const th = Number(tr.h) > 0 ? Number(tr.h) : 1;
          const tx = Number(tr.col) * gs, ty = Number(tr.row) * gs;
          if (local.x >= tx && local.x <= tx + tw * gs && local.y >= ty && local.y <= ty + th * gs) {
            return { ship: s, deck, tr };
          }
        }
      }
      return null;
    }

    // Rotate handle on the selected ship — a stub off the bow. Sized in
    // SCREEN pixels (divided by scale) so it stays grabbable at wildspace
    // zoom, where the whole hull may only be ~80px across.
    function hitShipHandle(mapX, mapY) {
      const id = selectedShipIdRef.current;
      if (id == null) return null;
      const s = (shipsRef.current || []).find((x) => x.id === id);
      if (!s) return null;
      const deck = activeDeckByShipRef.current?.get(s.id);
      if (!deck) return null;
      const local = worldToShipLocal(mapX, mapY, s, deck);
      const r = 14 / scaleRef.current;
      const rotOffset = Math.max(local.h * 0.18, 10 / scaleRef.current);
      return (Math.abs(local.x - local.w / 2) <= r && Math.abs(local.y - -rotOffset) <= r)
        ? 'rotate'
        : null;
    }

    // GM deck-switch buttons, laid out down the ship's right-hand side in
    // SCREEN space (unrotated) so they stay upright and clickable however the
    // hull is turned. Returns { shipId, deckIndex } or null.
    function hitShipDeckButton(mapX, mapY) {
      if (isPlayer) return null;
      const list = shipsRef.current || [];
      const sc = scaleRef.current;
      const gs = gridSizeRef.current;
      const ox = offsetXRef.current, oy = offsetYRef.current;
      const size = SHIP_DECK_BTN / sc;
      const gap = SHIP_DECK_GAP / sc;
      for (let i = list.length - 1; i >= 0; i--) {
        const s = list[i];
        // Highest deck first, so the column of buttons reads the way the hull
        // stacks: top level at the top. The payload arrives in deck_index order
        // (bottom-up), which as a vertical list is upside down. Sorted here AND
        // in the render below — the two are matched by position, so if they ever
        // disagree a click selects a different deck than the one you pressed.
        //
        // Sails aren't a level, so they get no button. Slot 0 is the "all
        // layers" toggle, which is why the loop below starts one slot down.
        const decks = (s.decks || []).filter(d => !d.is_sails).slice().sort((a, b) => b.deck_index - a.deck_index);
        if (decks.length < 2) continue; // one deck — nothing to flick between
        // Anchored to the REFERENCE deck's unrotated box, not the active one:
        // buttons that moved every time you switched deck would be exactly the
        // jumping the offsets exist to stop.
        const ref = shipReferenceDeck(s.decks);
        if (!ref) continue;
        const slots = decks.length + 1; // +1 for the all-layers toggle
        const anchor = shipButtonAnchor({
          ship: s, decks: s.decks || [], refDeck: ref, gs, ox, oy, slots, size, gap,
        });
        if (!anchor) continue;
        const { bx, by } = anchor;
        for (let d = 0; d < slots; d++) {
          const y = by + d * (size + gap);
          if (mapX >= bx && mapX <= bx + size && mapY >= y && mapY <= y + size) {
            return d === 0
              ? { shipId: s.id, toggleAll: true }
              : { shipId: s.id, deckIndex: decks[d - 1].deck_index };
          }
        }
      }
      return null;
    }

    // Where a token's art actually sits: a circle, because TokenInner draws the
    // image with cornerRadius = w/2 and falls back to a Circle when there's no
    // art. Inset from the footprint by the size's `scale`, so the box corners
    // are empty map — most obviously on a tiny token (45% of its square) and on
    // a resized gargantuan, where each corner is a dead zone the size of a
    // medium creature.
    function tokenHitCircle(t, gs, ox, oy) {
      const sz = tokenFootprint(t);
      const tW = sz.gridW * gs, tH = sz.gridH * gs;
      return {
        cx: ox + Number(t.grid_col) * gs + tW / 2,
        cy: oy + Number(t.grid_row) * gs + tH / 2,
        r: (Math.min(tW, tH) * sz.scale) / 2,
      };
    }

    function hitToken(mapX, mapY) {
      const gs = gridSizeRef.current;
      const ox = offsetXRef.current, oy = offsetYRef.current;
      // A few screen pixels of slop, converted to map units so it stays a few
      // pixels at any zoom. Without it a tiny token zoomed out is a target only
      // a handful of pixels across.
      const slop = 3 / (scaleRef.current || 1);
      let best = null, bestScore = Infinity;
      for (const t of tokensRef.current) {
        const { cx, cy, r } = tokenHitCircle(t, gs, ox, oy);
        const d = Math.hypot(mapX - cx, mapY - cy);
        if (d > r + slop) continue;
        // Overlapping tokens: take whichever the click is proportionally
        // deepest inside, so a medium creature standing on a gargantuan one
        // stays clickable instead of being buried under the bigger hit area.
        const score = d / Math.max(r, 0.001);
        if (score < bestScore) { bestScore = score; best = t; }
      }
      return best;
    }

    // Picks the named spawn-point glyph under the given map-space
    // coords. Hits anywhere inside the polygon (or bubble / halo for
    // legacy circle rows). GM-only path; players are passed an empty
    // spawnPoints list.
    function hitSpawnPoint(mapX, mapY) {
      const gs = gridSizeRef.current;
      const ox = offsetXRef.current, oy = offsetYRef.current;
      for (const sp of spawnPointsRef.current) {
        const poly = Array.isArray(sp.shape_points) ? sp.shape_points : null;
        if (poly && poly.length >= 3) {
          let inside = false;
          for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
            const xi = ox + Number(poly[i].col) * gs;
            const yi = oy + Number(poly[i].row) * gs;
            const xj = ox + Number(poly[j].col) * gs;
            const yj = oy + Number(poly[j].row) * gs;
            const intersect = ((yi > mapY) !== (yj > mapY)) &&
              (mapX < (xj - xi) * (mapY - yi) / ((yj - yi) || 1e-9) + xi);
            if (intersect) inside = !inside;
          }
          if (inside) return sp;
          continue;
        }
        const cx = ox + Number(sp.grid_col) * gs;
        const cy = oy + Number(sp.grid_row) * gs;
        const r = Number(sp.radius) || 0;
        const hitR = r > 0 ? r * gs : Math.max(14, gs * 0.4);
        if ((mapX - cx) * (mapX - cx) + (mapY - cy) * (mapY - cy) <= hitR * hitR) {
          return sp;
        }
      }
      return null;
    }

    let downX = 0, downY = 0;
    // Right-click drag always pans, regardless of the active tool.
    // When `rightPanMoved` ends up true on mouseup, the contextmenu
    // event that browsers fire next is suppressed so a drag-pan
    // doesn't accidentally open the door-flip / token menu.
    let rightPanning = false;
    let rightPanStart = { cx: 0, cy: 0, sx: 0, sy: 0 };
    let rightPanMoved = false;
    // GM-only spawn-point drag. Captured on mousedown when the cursor
    // is inside a spawn glyph; live preview updates on mousemove; the
    // committed grid coords go to the parent on mouseup.
    let spawnDrag = null; // { id, origCol, origRow }
    // GM-only terrain drag. Same pattern as spawnDrag — pickup on
    // mousedown, live preview on mousemove, commit on mouseup.
    // Ship drag / rotate. Same pickup-preview-commit shape as terrainDrag:
    // live updates paint locally while dragging, the committed value goes to
    // the server on mouseup so we're not emitting a socket event per frame.
    let shipDrag = null;   // { id, startCol, startRow, offsetCol, offsetRow, lastCol, lastRow }
    let shipRotate = null; // { id, cx, cy, startRot, grabAngle, lastRot }
    // Stairs armed on mousedown, taken on mouseup if the pointer didn't move.
    let pendingTransition = null; // { ship, deck, tr }
    let stairDraw = null;   // { c0, r0 } — a staircase being dragged out
    let stairEdit = null;   // { idx, mode, grabC, grabR, orig } — one being adjusted
    let terrainDrag = null; // { id, startCol, startRow, offsetCol, offsetRow }
    let terrainResize = null; // { id, mode, startW, startH, startCol, startRow, startMapX, startMapY }
    let terrainRotate = null; // { id, cx, cy } — center used for angle math

    function onMouseDown(e) {
      // Following the GM's camera makes this a projector, not a board: no
      // panning, no zooming, no dragging anything. Blocking mousedown is
      // enough — mousemove/mouseup only act on a drag this would have started.
      if (isFollowingRef.current) return;
      if (fogBlockMenuRef.current?.contains(e.target)) return;
      if (doorMenuRef.current?.contains(e.target)) return;
      if (portalMenuRef.current?.contains(e.target)) return;
      setPortalMenu(null);
      setDoorMenu(null);
      setFogBlockMenu(null);
      if (e.button === 2) {
        rightPanning = true;
        rightPanMoved = false;
        rightPanStart = {
          cx: e.clientX, cy: e.clientY,
          sx: posRef.current.x, sy: posRef.current.y,
        };
        return;
      }
      if (e.button !== 0) return;
      downX = e.clientX;
      downY = e.clientY;
      const tool = activeToolRef.current;
      const mc   = toMap(e.clientX, e.clientY);

      // GM-only: drawing a staircase. Outranks everything — the whole point of
      // the mode is that this drag is a placement.
      //
      // DRAGGED, not clicked, and deliberately NOT snapped: a staircase is
      // whatever shape it was drawn in the map art, and it rarely lines up with
      // the grid. The ships' transitions are fractional for the same reason.
      if (!isPlayer && onStairPlaceRef.current) {
        const gs = gridSizeRef.current;
        const ox = offsetXRef.current, oy = offsetYRef.current;
        const c = (mc.x - ox) / gs, r = (mc.y - oy) / gs;
        const list = levelTransitionsRef.current || [];
        const grab = 12 / scaleRef.current / gs;   // handle radius, in cells

        // A corner handle resizes; the body moves; empty space draws a new one.
        // Reversed order so the handle wins where it overlaps its own box.
        let idx = -1, mode = null;
        for (let i = list.length - 1; i >= 0; i--) {
          const t = list[i];
          const w = Number(t.w) || 1, h = Number(t.h) || 1;
          if (Math.abs(c - (t.col + w)) <= grab && Math.abs(r - (t.row + h)) <= grab) {
            idx = i; mode = 'resize'; break;
          }
          if (c >= t.col && c <= t.col + w && r >= t.row && r <= t.row + h) {
            idx = i; mode = 'move'; break;
          }
        }
        if (idx >= 0) {
          const t = list[idx];
          stairEdit = {
            idx, mode,
            grabC: c, grabR: r,
            orig: { col: t.col, row: t.row, w: Number(t.w) || 1, h: Number(t.h) || 1 },
          };
          setStairPreview({ ...stairEdit.orig });
          return;
        }
        stairDraw = { c0: c, r0: r };
        setStairPreview({ col: c, row: r, w: 0, h: 0 });
        return;
      }

      // A staircase under the cursor takes whoever is standing on it to the
      // other end. Checked before the tools so a click on a stair is never
      // spent on a measurement or a wall.
      if (onStairUseRef.current) {
        const gs = gridSizeRef.current;
        const ox = offsetXRef.current, oy = offsetYRef.current;
        const cc = (mc.x - ox) / gs;
        const rr = (mc.y - oy) / gs;
        // Inside the drawn rectangle, not on a snapped square — the stair is
        // whatever shape it was dragged out as.
        const tr = (levelTransitionsRef.current || []).find(
          (t) => cc >= t.col && cc <= t.col + (Number(t.w) || 1)
            && rr >= t.row && rr <= t.row + (Number(t.h) || 1)
        );
        if (tr) {
          // Just the transition. The second argument is the LEVEL the stair
          // sits on — added for the 3D view, which can show several floors at
          // once — and this stage only ever holds the active storey's, so it
          // says nothing and lets the host default. It was passing `cc`, the
          // cursor's column, which the host then read as a level number: a
          // fractional level that matched nothing, so no token was ever found
          // standing on the stair and the click did nothing at all.
          onStairUseRef.current(tr);
          return;
        }
      }

      // GM-only: clicking off the selected terrain piece deselects
      // it. Doesn't consume the click — whatever tool was active
      // still gets to react.
      if (!isPlayer && selectedTerrainIdRef.current != null
          && !pendingTerrainRef.current
          && !hitTerrain(mc.x, mc.y)
          && !hitTerrainHandle(mc.x, mc.y)) {
        onTerrainSelectRef.current?.(null);
      }

      // GM-only: tile place mode. A turned card is the most specific thing
      // the GM can be holding, so it outranks the terrain and token
      // placements below — with a card up, the click means "lay it here".
      //
      // Snapped to whole squares, unlike terrain: a tile map is a lattice,
      // and a tile half a square out is a seam the party can see.
      if (!isPlayer && pendingTileRef.current) {
        const gs = gridSizeRef.current;
        const ox = offsetXRef.current, oy = offsetYRef.current;
        const w = Number(pendingTileRef.current.grid_w) || 2;
        const h = Number(pendingTileRef.current.grid_h) || 2;
        const col = Math.round((mc.x - ox) / gs - w / 2);
        const row = Math.round((mc.y - oy) / gs - h / 2);
        // Staged, not laid. A card is spent the moment it is played, so a
        // click that committed outright made every misjudged click cost a
        // card AND show the players a tile in the wrong place. The GM now
        // drags it into line against what is already down, then commits.
        onTileStageRef.current?.(col, row);
        return;
      }

      // GM-only: terrain place mode. When the parent has set
      // `pendingTerrain` (the GM clicked a library piece), the next
      // canvas click drops it here. Skip every other tool path.
      if (!isPlayer && pendingTerrainRef.current) {
        const gs = gridSizeRef.current;
        const ox = offsetXRef.current, oy = offsetYRef.current;
        // Centre the new piece on the click — the parent gets the
        // top-left corner since that's how we store grid_col/grid_row.
        const w = Number(pendingTerrainRef.current.default_w) || 1;
        const h = Number(pendingTerrainRef.current.default_h) || 1;
        const col = (mc.x - ox) / gs - w / 2;
        const row = (mc.y - oy) / gs - h / 2;
        onTerrainPlaceRef.current?.(pendingTerrainRef.current, col, row);
        return;
      }

      // GM-only: token place mode outranks every hit test below — terrain
      // handles, terrain bodies, deck buttons, stairwells, ship hulls, token
      // drags and the marquee. All of those record something on mousedown and
      // then `return` from mouseup before placement is ever considered, so a
      // click that happened to land on one was silently spent on it instead of
      // dropping the creature. That's why this only failed sometimes: it
      // depended on what was under the cursor. With a creature on the cursor,
      // the map click belongs to the placement.
      if (placingTokenRef.current) {
        // Panning still has to work — lining up a drop on a big map means
        // dragging the view with a creature on the cursor. A pan moves the
        // pointer past the click threshold, so mouseup reads it as a drag and
        // places nothing, which is what we want.
        if (tool === 'pan') {
          panning.current = true;
          panStart.current = { cx: e.clientX, cy: e.clientY, sx: posRef.current.x, sy: posRef.current.y };
        }
        // Otherwise nothing is recorded and nothing consumed: mouseup finds no
        // drag in progress and falls through to the placement branch.
        return;
      }

      // GM-only: resize / rotate handle on the selected piece —
      // checked before body-drag so a click on a handle resizes or
      // rotates instead of moving.
      if (!isPlayer && !hitToken(mc.x, mc.y)) {
        const handle = hitTerrainHandle(mc.x, mc.y);
        if (handle) {
          const t = (terrainRef.current || []).find((x) => x.id === selectedTerrainIdRef.current);
          if (t) {
            if (handle === 'rotate') {
              const gs = gridSizeRef.current;
              const ox = offsetXRef.current, oy = offsetYRef.current;
              terrainRotate = {
                id: t.id,
                cx: ox + (Number(t.grid_col) + Number(t.width)  / 2) * gs,
                cy: oy + (Number(t.grid_row) + Number(t.height) / 2) * gs,
              };
            } else {
              terrainResize = {
                id: t.id,
                mode: handle,
                startW: Number(t.width),
                startH: Number(t.height),
                startCol: Number(t.grid_col),
                startRow: Number(t.grid_row),
                startMapX: mc.x,
                startMapY: mc.y,
              };
            }
            return;
          }
        }
      }

      // ── Ships ───────────────────────────────────────────────────────────
      // Only the tools that are ABOUT moving things around the map interact
      // with a hull. Every other tool is a drawing or placing tool, and its
      // click means "do this thing here" — a hull that happens to be under the
      // cursor was swallowing all of them, so setting the spawn point on a
      // deck, dropping a light, drawing a wall across a ship or pinging it all
      // grabbed the ship instead.
      if (SHIP_DRAG_TOOLS.has(tool)) {
      // Deck buttons first: they sit outside the hull, so nothing else can
      // be under them, and they must win over a pan-drag starting there.
      {
        const btn = hitShipDeckButton(mc.x, mc.y);
        if (btn) {
          if (btn.toggleAll) {
            setGmAllDecksShips((prev) => {
              const next = new Set(prev);
              if (next.has(btn.shipId)) next.delete(btn.shipId);
              else next.add(btn.shipId);
              return next;
            });
          }
          else onShipDeckChangeRef.current?.(btn.shipId, btn.deckIndex);
          return;
        }
      }

      // Stairs / ladders / hatches. Recorded on mousedown so it wins over the
      // hull drag underneath, but only ACTED ON in mouseup when the pointer
      // didn't move — otherwise starting a ship drag from a stairwell square
      // would teleport somebody instead of moving the ship.
      {
        const hitTr = hitShipTransition(mc.x, mc.y);
        if (hitTr) {
          pendingTransition = hitTr;
          // Do NOT consume the press when a token is standing on the stairwell.
          //
          // A token that takes the stairs lands on the PAIRED square, which is
          // the stairwell on the far deck — so after one trip it is sitting on
          // top of a transition. Returning here meant every mousedown on that
          // token was spent on the stairs before the token drag could start:
          // press-and-drag did nothing, and a plain click sent them back to the
          // other deck, onto that deck's stairwell, where the same thing
          // happened again. Stuck on the stairs with no way off.
          //
          // Falling through lets the token-drag path below claim the press. The
          // transition is still recorded, and mouseup only acts on it if the
          // pointer never moved — so a click still takes the stairs and a drag
          // now walks off them.
          if (!hitToken(mc.x, mc.y)) return;
        }
      }

      // Rotate handle on the selected ship, before the body test so grabbing
      // the stub turns the ship instead of dragging it.
      if (hitShipHandle(mc.x, mc.y)) {
        const s = (shipsRef.current || []).find((x) => x.id === selectedShipIdRef.current);
        const deck = s && activeDeckByShipRef.current?.get(s.id);
        if (s && deck) {
          const gs = gridSizeRef.current;
          const ox = offsetXRef.current, oy = offsetYRef.current;
          // The hull turns about the SHIP's pivot, not the drawn deck's centre —
          // those differ whenever the levels are different sizes or offset, and
          // the renderer uses the pivot.
          const rdk = shipReferenceDeck(s.decks) || deck;
          const cx = ox + (Number(s.grid_col) + Number(rdk.offset_col || 0)) * gs + (Number(rdk.grid_cols) * gs) / 2;
          const cy = oy + (Number(s.grid_row) + Number(rdk.offset_row || 0)) * gs + (Number(rdk.grid_rows) * gs) / 2;
          shipRotate = {
            id: s.id, cx, cy,
            startRot: Number(s.rotation) || 0,
            // Angle of the initial grab, so the hull turns relative to where
            // it was picked up rather than snapping the bow to the cursor.
            grabAngle: (Math.atan2(mc.y - cy, mc.x - cx) * 180) / Math.PI,
          };
          return;
        }
      }

      // Ship body drag. Tokens win (so crew standing on deck stay grabbable),
      // and ships win over terrain. Players may only drag a ship they're
      // attuned to, or one whose helm their token is standing on — the server
      // enforces both, this is just so the hull doesn't visibly move for
      // someone who isn't allowed to move it.
      if (!hitToken(mc.x, mc.y)) {
        const hit = hitShip(mc.x, mc.y);
        if (hit) {
          const atHelm = !!helmTokenByShipRef.current?.get(hit.ship.id)?.mine;
          const canDrag = !isPlayer
            || atHelm
            || (hit.ship.attuned_player && hit.ship.attuned_player === playerNameRef.current);
          if (canDrag) {
            const gs = gridSizeRef.current;
            const ox = offsetXRef.current, oy = offsetYRef.current;
            const sx = ox + Number(hit.ship.grid_col) * gs;
            const sy = oy + Number(hit.ship.grid_row) * gs;
            shipDrag = {
              id: hit.ship.id,
              startCol: Number(hit.ship.grid_col),
              startRow: Number(hit.ship.grid_row),
              offsetCol: (mc.x - sx) / gs,
              offsetRow: (mc.y - sy) / gs,
              // Ship speed drives the same movement counter tokens get.
              speed: Number(hit.ship.speed) || 0,
            };
            if (!isPlayer) onShipSelectRef.current?.(hit.ship.id);
            return;
          }
        }
      }

      // GM-only: clicking empty map deselects the current ship.
      if (!isPlayer && selectedShipIdRef.current != null && !hitShip(mc.x, mc.y)) {
        onShipSelectRef.current?.(null);
      }
      } // end ship interactions

      // GM-only: drag terrain. Tokens take priority over terrain
      // (so a token standing on a terrain piece is still grabbable).
      if (!isPlayer && !hitToken(mc.x, mc.y)) {
        const t = hitTerrain(mc.x, mc.y);
        if (t) {
          const gs = gridSizeRef.current;
          const ox = offsetXRef.current, oy = offsetYRef.current;
          const tx = ox + Number(t.grid_col) * gs;
          const ty = oy + Number(t.grid_row) * gs;
          terrainDrag = {
            id: t.id,
            startCol: Number(t.grid_col),
            startRow: Number(t.grid_row),
            // Offset from the top-left of the piece to the cursor — so
            // the piece doesn't snap its corner to the cursor on drag.
            offsetCol: (mc.x - tx) / gs,
            offsetRow: (mc.y - ty) / gs,
          };
          onTerrainSelectRef.current?.(t.id);
          return;
        }
      }

      // GM-only: if the click landed on a named spawn-point glyph
      // and the move tool is active, start a spawn drag and skip
      // every other tool/dispatch path. Gating on the move tool means
      // the pan tool can pan freely across spawn zones without
      // accidentally grabbing them. Stage listening is off (perf
      // choice) so we do the drag bookkeeping ourselves. Tokens take
      // priority — if a token sits inside the spawn polygon the
      // click should drag the token, not the zone.
      if (!isPlayer && tool === 'move' && !hitToken(mc.x, mc.y)) {
        const sp = hitSpawnPoint(mc.x, mc.y);
        if (sp) {
          spawnDrag = { id: sp.id, origCol: Number(sp.grid_col), origRow: Number(sp.grid_row) };
          setSpawnDragVis({ id: sp.id, col: spawnDrag.origCol, row: spawnDrag.origRow });
          return;
        }
      }


      // ── Plugin click handlers ────────────────────────────────────────────
      // Plugins can intercept map clicks by registering in
      // pluginRegistries.mapClickHandlers. Returning true consumes the
      // click and skips the host's built-in tool handling. Role gating
      // lets a plugin restrict its handler to GM or player only.
      for (const [, entry] of pluginRegistries.mapClickHandlers.entries()) {
        if (!entry || typeof entry.handler !== 'function') continue;
        if (entry.role === 'dm' && isPlayer) continue;
        if (entry.role === 'player' && !isPlayer) continue;
        try {
          if (entry.handler({ x: mc.x, y: mc.y, tool, isPlayer })) return;
        } catch (err) { /* misbehaving plugin — fall through to next */ }
      }

      // ── Wall tools ────────────────────────────────────────────────────────
      if (WALL_DRAW_TOOLS.has(tool)) {
        if (tool === 'wall-erase') {
          const threshold = 20 / scaleRef.current;
          const hitW = findNearestWall(mc.x, mc.y, wallsRef.current, threshold);
          const hitD = findNearestDoor(mc.x, mc.y, doorsRef.current, threshold);
          if (hitW && (!hitD || hitW.dist <= hitD.dist)) {
            onWallDeleteRef.current?.(hitW.wall.id);
          } else if (hitD) {
            onDoorDeleteRef.current?.(hitD.door.id);
          }
        } else if (tool !== 'wall-polygon') {
          // line / rect / circle: record start, show preview
          wallDrawRef.current = { type: tool.slice(5), startX: mc.x, startY: mc.y };
          setWallPreview({ type: tool.slice(5), points: [mc.x, mc.y, mc.x, mc.y] });
        }
        // polygon: handled on mouseup (click to place points)
        return;
      }

      // ── Door tools ────────────────────────────────────────────────────────
      if (DOOR_DRAW_TOOLS.has(tool)) {
        const doorStyle = tool === 'door-heavy' ? 'heavy' : tool === 'door-port' ? 'portcullis' : 'standard';
        wallDrawRef.current = { type: 'door', style: doorStyle, startX: mc.x, startY: mc.y };
        setWallPreview({ type: 'line', points: [mc.x, mc.y, mc.x, mc.y] });
        return;
      }

      // ── Light tools ───────────────────────────────────────────────────────
      if (LIGHT_DRAW_TOOLS.has(tool)) {
        lightDrawRef.current = { startX: mc.x, startY: mc.y };
        setLightPreview({ cx: mc.x, cy: mc.y, brightR: 0, direction: 0, spread: activeLightSpreadRef.current });
        return;
      }
      if (tool === 'light-erase') {
        const threshold = 40 / scaleRef.current;
        const hit = findNearestLight(mc.x, mc.y, lightsRef.current, threshold);
        if (hit) onLightDeleteRef.current?.(hit.light.id);
        return;
      }
      if (tool === 'light-edit') {
        const threshold = 60 / scaleRef.current;
        const hit = findNearestLight(mc.x, mc.y, lightsRef.current, threshold);
        if (hit) onLightSelectRef.current?.(hit.light);
        return;
      }

      // ── Magical darkness tools ────────────────────────────────────────────
      if (DARKNESS_DRAW_TOOLS.has(tool)) {
        if (DARKNESS_POLY_TOOLS.has(tool)) {
          // Polygon drawing: points added on mouseup; mousedown does nothing special
          return;
        }
        darknessDrawRef.current = { startX: mc.x, startY: mc.y };
        setDarknessPreview({ cx: mc.x, cy: mc.y, r: 0 });
        return;
      }
      if (tool === 'darkness-erase') {
        const threshold = 40 / scaleRef.current;
        const hit = findNearestDarkness(mc.x, mc.y, magicalDarknessRef.current, threshold);
        if (hit) onMagicalDarknessDeleteRef.current?.(hit.darkness.id);
        return;
      }

      if (tool === 'zone-feather') {
        const hit = (magicalDarknessRef.current || []).find(dz =>
          (dz.zone_type === 'water' || dz.zone_type === 'heavy-fog') && pointInZone(mc.x, mc.y, dz)
        );
        if (hit) {
          setFeatherZoneId(hit.id);
          setFeatherValue(hit.feather_amount || 0);
        }
        return;
      }

      // ── Spawn point ───────────────────────────────────────────────────────
      if (tool === 'spawn-point') {
        const ox = offsetXRef.current, oy = offsetYRef.current, gs = gridSizeRef.current;
        // Store exact fractional grid coordinates so marker appears at cursor
        const col = (mc.x - ox) / gs;
        const row = (mc.y - oy) / gs;
        onSetSpawnPointRef.current?.(col, row);
        return;
      }

      // ── Fog block polygon draw ────────────────────────────────────────────
      if (tool === 'fog-block') {
        const current = fogPolyRef.current;
        // If not currently drawing, check if clicking inside an existing fog block
        if (current.length === 0) {
          const hit = (fogBlocksRef.current || []).find(fb => {
            const pts = Array.isArray(fb.points) ? fb.points : [];
            return pts.length >= 3 && pointInPolygon(mc.x, mc.y, pts);
          });
          if (hit) {
            onFogBlockDeleteRef.current?.(hit.id);
            return;
          }
        }
        // Close polygon when clicking within 20px (screen) of first vertex with ≥3 pts
        if (current.length >= 3) {
          const fp = current[0];
          const sc = scaleRef.current || 1;
          const dist = Math.sqrt((mc.x - fp.x) ** 2 + (mc.y - fp.y) ** 2);
          if (dist < 20 / sc) {
            onFogBlockAddRef.current?.({ points: current });
            setFogPolyPoints([]);
            fogPolyRef.current = [];
            setFogCursorGrid(null);
            return;
          }
        }
        const next = [...current, { x: mc.x, y: mc.y }];
        fogPolyRef.current = next;
        setFogPolyPoints(next);
        return;
      }

      // ── Named spawn point (polygon mode) ──────────────────────────────────
      // Each click drops a vertex; Enter or double-click finalises and
      // hands the polygon to the parent for the label modal. Esc cancels.
      // Coordinates kept in map-pixel space during draw — converted to
      // grid space at finalise time.
      if (tool === 'spawn-named') {
        const ref = spawnPolyDrawRef.current;
        spawnPolyDrawRef.current = ref ? [...ref, mc.x, mc.y] : [mc.x, mc.y];
        setSpawnPolyPreview({
          points: [...spawnPolyDrawRef.current],
          cursorX: mc.x,
          cursorY: mc.y,
        });
        return;
      }

      // ── Portals ───────────────────────────────────────────────────────────
      if (tool === 'portal-place') {
        const ox = offsetXRef.current, oy = offsetYRef.current, gs = gridSizeRef.current;
        // The pad centres on the click, wherever that is — no snapping. Stored
        // as the corner anchor (centre is +0.5) to match how it's drawn.
        onPortalPlaceRef.current?.(
          (mc.x - ox) / gs - 0.5,
          (mc.y - oy) / gs - 0.5,
        );
        return;
      }
      if (tool === 'portal-erase') {
        const hit = findPortalAt(mc.x, mc.y, portalsRef.current, offsetXRef.current, offsetYRef.current, gridSizeRef.current);
        if (hit) onPortalEraseRef.current?.(hit.id);
        return;
      }

      // ── Door erase ────────────────────────────────────────────────────────
      if (tool === 'door-erase') {
        const threshold = 20 / scaleRef.current;
        const hit = findNearestDoor(mc.x, mc.y, doorsRef.current, threshold);
        if (hit) onDoorDeleteRef.current?.(hit.door.id);
        return;
      }

      // ── Spell template tools (GM only — players never have these tools) ─
      if (TEMPLATE_TOOLS.has(tool)) {
        const type = tool === 'tpl-cone' ? 'cone'
                   : tool === 'tpl-circle' ? 'circle'
                   : tool === 'tpl-line' ? 'line'
                   : 'square';
        templateDrawRef.current = { type, startX: mc.x, startY: mc.y };
        setTemplatePreview({ type, points: [mc.x, mc.y, mc.x, mc.y] });
        return;
      }
      if (tool === 'tpl-erase') {
        const threshold = 30 / scaleRef.current;
        const hit = findNearestTemplate(mc.x, mc.y, spellTemplatesRef.current, threshold, gridSize);
        if (hit) onTemplateDeleteRef.current?.(hit.template.id);
        return;
      }
      if (tool === 'tpl-edit') {
        const threshold = 30 / scaleRef.current;
        const hit = findNearestTemplate(mc.x, mc.y, spellTemplatesRef.current, threshold, gridSize);
        if (hit) {
          templateMoveRef.current = {
            id: hit.template.id,
            origPoints: hit.template.points.slice(),
            startMapX: mc.x,
            startMapY: mc.y,
          };
        }
        return;
      }

      // ── Standard tools ────────────────────────────────────────────────────
      if (tool === 'move') {
        const hit = hitToken(mc.x, mc.y);
        if (hit) {
          // Token mousedown — drag the whole group if this token is already
          // part of the selection, otherwise replace selection with just it.
          const liveMulti = multiSelectedRef.current;
          const inGroup = (selectedTokenIdRef.current === hit.id) || liveMulti.has(hit.id);
          const groupIds = inGroup
            ? Array.from(new Set([selectedTokenIdRef.current, hit.id, ...liveMulti].filter(Boolean)))
            : [hit.id];
          if (!inGroup) setMultiSelected(new Set());
          const origPositions = new Map();
          for (const id of groupIds) {
            const tk = tokensRef.current.find(tt => tt.id === id);
            if (tk) origPositions.set(id, { col: Number(tk.grid_col), row: Number(tk.grid_row) });
          }
          tokenDragRef.current = {
            tokenIds: groupIds,
            primaryId: hit.id,
            origPositions,
            startMapX: mc.x,
            startMapY: mc.y,
          };
          resolveMoveCap(hit.id);
        } else {
          // Empty-space mousedown starts a marquee. Shift-drag adds to the
          // existing selection instead of replacing it. Use the Pan tool when
          // you actually want to pan with a left-drag.
          marqueeRef.current = {
            startX: mc.x,
            startY: mc.y,
            additive: !!e.shiftKey,
          };
          setMarqueeRect({ x: mc.x, y: mc.y, w: 0, h: 0 });
        }
      } else if (tool === 'pan') {
        panning.current = true;
        panStart.current = { cx: e.clientX, cy: e.clientY, sx: posRef.current.x, sy: posRef.current.y };
      } else if (tool === 'draw') {
        inking.current = true;
        setInkDraft([mc.x, mc.y]);
      } else if (tool === 'draw-erase') {
        // Undo is a click, not a drag: one press removes this author's last
        // stroke on this map, so holding it down doesn't wipe everything.
        onDrawUndoRef.current?.();
      } else if (MEASURE_TOOLS.has(tool)) {
        measuring.current = true;
        setMeas({ type: tool, start: mc, end: mc });
      }
    }

    function onMouseMove(e) {
      const tool = activeToolRef.current;

      // Adjusting an existing staircase.
      if (stairEdit) {
        const mc = toMap(e.clientX, e.clientY);
        const gs = gridSizeRef.current;
        const ox = offsetXRef.current, oy = offsetYRef.current;
        const c = (mc.x - ox) / gs, r = (mc.y - oy) / gs;
        const o = stairEdit.orig;
        const next = stairEdit.mode === 'move'
          ? { col: o.col + (c - stairEdit.grabC), row: o.row + (r - stairEdit.grabR), w: o.w, h: o.h }
          : { col: o.col, row: o.row, w: Math.max(0.2, c - o.col), h: Math.max(0.2, r - o.row) };
        stairEdit.next = next;
        setStairPreview(next);
        return;
      }

      // Dragging out a staircase: live preview of the rectangle.
      if (stairDraw) {
        const mc = toMap(e.clientX, e.clientY);
        const gs = gridSizeRef.current;
        const ox = offsetXRef.current, oy = offsetYRef.current;
        const c = (mc.x - ox) / gs, r = (mc.y - oy) / gs;
        setStairPreview({
          col: Math.min(stairDraw.c0, c),
          row: Math.min(stairDraw.r0, r),
          w: Math.abs(c - stairDraw.c0),
          h: Math.abs(r - stairDraw.r0),
        });
        return;
      }

      // Terrain rotate preview. Angle from the piece's centre to the
      // cursor — 0° = up, clockwise positive (matches Konva).
      if (terrainRotate) {
        const mc = toMap(e.clientX, e.clientY);
        const dx = mc.x - terrainRotate.cx;
        const dy = mc.y - terrainRotate.cy;
        let deg = Math.atan2(dx, -dy) * 180 / Math.PI;
        // Hold Shift for 15° snap — handy for orthogonal alignment.
        if (e.shiftKey) deg = Math.round(deg / 15) * 15;
        terrainRotate.lastRotation = deg;
        onTerrainResizeRef.current?.(terrainRotate.id, { rotation: deg }, /* live */ true);
        return;
      }

      // Terrain resize preview. Cursor's position in the piece's
      // local (unrotated) frame drives the new width/height — so a
      // rotated piece still resizes along its own axes, not the
      // screen's. Top-left anchored.
      if (terrainResize) {
        const mc = toMap(e.clientX, e.clientY);
        const t = (terrainRef.current || []).find((x) => x.id === terrainResize.id);
        if (!t) return;
        const local = worldToLocal(mc.x, mc.y, t);
        const gs = gridSizeRef.current;
        let newW = terrainResize.startW;
        let newH = terrainResize.startH;
        if (terrainResize.mode === 'br') {
          newW = Math.max(0.25, local.x / gs);
          newH = Math.max(0.25, local.y / gs);
        } else if (terrainResize.mode === 'r') {
          newW = Math.max(0.25, local.x / gs);
        } else if (terrainResize.mode === 'b') {
          newH = Math.max(0.25, local.y / gs);
        }
        terrainResize.lastW = newW;
        terrainResize.lastH = newH;
        onTerrainResizeRef.current?.(terrainResize.id, { width: newW, height: newH }, /* live */ true);
        return;
      }

      // Terrain drag preview — fractional coords, no grid snap.
      // Ship drag — repaint locally every frame, commit on mouseup. Crew
      // aboard follow because the server re-projects them on the commit;
      // during the drag the deck art carries them visually.
      if (shipDrag) {
        const mc = toMap(e.clientX, e.clientY);
        const gs = gridSizeRef.current;
        const ox = offsetXRef.current, oy = offsetYRef.current;
        const newCol = (mc.x - ox) / gs - shipDrag.offsetCol;
        const newRow = (mc.y - oy) / gs - shipDrag.offsetRow;
        shipDrag.lastCol = newCol;
        shipDrag.lastRow = newRow;
        // Distance travelled so far — the same readout normal tokens get when
        // dragged, driven by the ship class's tactical speed.
        setShipMeasure({
          fromCol: shipDrag.startCol, fromRow: shipDrag.startRow,
          toCol: newCol, toRow: newRow,
          speed: shipDrag.speed,
        });
        onShipMoveRef.current?.(shipDrag.id, newCol, newRow, /* live */ true);
        // Crew ride the hull rather than waiting on the map for it to arrive.
        setCrewVis(projectCrewRef.current(
          (shipsRef.current || []).find(s => s.id === shipDrag.id),
          { grid_col: newCol, grid_row: newRow },
        ));
        return;
      }

      if (shipRotate) {
        const mc = toMap(e.clientX, e.clientY);
        const ang = (Math.atan2(mc.y - shipRotate.cy, mc.x - shipRotate.cx) * 180) / Math.PI;
        // Free rotation, no snap — the delta from the grab point is applied to
        // the rotation the hull already had.
        const next = shipRotate.startRot + (ang - shipRotate.grabAngle);
        shipRotate.lastRot = next;
        onShipRotateRef.current?.(shipRotate.id, next, /* live */ true);
        // Turn the crew with the deck they're standing on, every frame — this
        // is the whole point of the mirror being byte-identical to the server's
        // maths, so release changes nothing visible.
        setCrewVis(projectCrewRef.current(
          (shipsRef.current || []).find(s => s.id === shipRotate.id),
          { rotation: next },
        ));
        return;
      }

      if (terrainDrag) {
        const mc = toMap(e.clientX, e.clientY);
        const gs = gridSizeRef.current;
        const ox = offsetXRef.current, oy = offsetYRef.current;
        const newCol = (mc.x - ox) / gs - terrainDrag.offsetCol;
        const newRow = (mc.y - oy) / gs - terrainDrag.offsetRow;
        terrainDrag.lastCol = newCol;
        terrainDrag.lastRow = newRow;
        // Trigger a re-render via the parent's optimistic state. Cheap
        // enough at 60Hz; throttling can come later if needed.
        onTerrainMoveRef.current?.(terrainDrag.id, newCol, newRow, /* live */ true);
        return;
      }

      // Spawn-point drag preview. Updates on every mousemove so the
      // bubble follows the cursor; final commit happens in onMouseUp.
      // Coords stay fractional — snapping to integer cells made
      // polygons with non-integer vertices jump unpredictably.
      if (spawnDrag) {
        const mc = toMap(e.clientX, e.clientY);
        const gs = gridSizeRef.current;
        const ox = offsetXRef.current, oy = offsetYRef.current;
        setSpawnDragVis({
          id: spawnDrag.id,
          col: (mc.x - ox) / gs,
          row: (mc.y - oy) / gs,
        });
        return;
      }

      // Right-click drag pans regardless of tool. Tracked separately
      // from the left-click pan tool's `panning.current` so the two
      // can't fight for state.
      if (rightPanning) {
        const dx = e.clientX - rightPanStart.cx;
        const dy = e.clientY - rightPanStart.cy;
        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) rightPanMoved = true;
        setPos({ x: rightPanStart.sx + dx, y: rightPanStart.sy + dy });
        return;
      }

      // ── Fog polygon cursor tracking ───────────────────────────────────────
      if (activeToolRef.current === 'fog-block' && fogPolyRef.current.length > 0) {
        const mc = toMap(e.clientX, e.clientY);
        setFogCursorGrid({ x: mc.x, y: mc.y });
        return;
      }

      // ── Wall preview update ───────────────────────────────────────────────
      if (wallDrawRef.current) {
        const mc = toMap(e.clientX, e.clientY);
        const dr = wallDrawRef.current;
        setWallPreview({ type: dr.type, points: [dr.startX, dr.startY, mc.x, mc.y] });
        return;
      }
      if (tool === 'wall-polygon' && polyDrawRef.current) {
        const mc = toMap(e.clientX, e.clientY);
        setWallPreview({ type: 'polygon', points: [...polyDrawRef.current], cursorX: mc.x, cursorY: mc.y });
        return;
      }
      if (tool === 'spawn-named' && spawnPolyDrawRef.current) {
        const mc = toMap(e.clientX, e.clientY);
        setSpawnPolyPreview({
          points: [...spawnPolyDrawRef.current],
          cursorX: mc.x,
          cursorY: mc.y,
        });
        return;
      }

      // ── Light preview update ──────────────────────────────────────────────
      if (lightDrawRef.current) {
        const mc = toMap(e.clientX, e.clientY);
        const dr = lightDrawRef.current;
        const dx = mc.x - dr.startX;
        const dy = mc.y - dr.startY;
        const brightR = Math.hypot(dx, dy);
        const direction = Math.atan2(dy, dx) * 180 / Math.PI;
        const spread = activeLightSpreadRef.current;
        setLightPreview({ cx: dr.startX, cy: dr.startY, brightR, direction, spread });
        return;
      }

      // ── Darkness preview update ───────────────────────────────────────────
      if (darkPolyDrawRef.current) {
        const mc = toMap(e.clientX, e.clientY);
        setDarknessPreview({ isPolygon: true, points: [...darkPolyDrawRef.current], cursorX: mc.x, cursorY: mc.y });
        return;
      }
      if (darknessDrawRef.current) {
        const mc = toMap(e.clientX, e.clientY);
        const dr = darknessDrawRef.current;
        const r = Math.hypot(mc.x - dr.startX, mc.y - dr.startY);
        setDarknessPreview({ cx: dr.startX, cy: dr.startY, r });
        return;
      }

      // ── Template move preview ─────────────────────────────────────────────
      if (templateMoveRef.current) {
        const mc = toMap(e.clientX, e.clientY);
        const dr = templateMoveRef.current;
        const dxMap = mc.x - dr.startMapX;
        const dyMap = mc.y - dr.startMapY;
        const orig = dr.origPoints;
        // For circle, only translate the centre (idx 0,1) and leave radius (idx 2).
        // For line/cone/square, translate both endpoints.
        let next;
        if (orig.length === 3) {
          next = [orig[0] + dxMap, orig[1] + dyMap, orig[2]];
        } else {
          next = [orig[0] + dxMap, orig[1] + dyMap, orig[2] + dxMap, orig[3] + dyMap];
        }
        setTemplateMovePreview({ id: dr.id, points: next });
        return;
      }

      // ── Template preview update ───────────────────────────────────────────
      if (templateDrawRef.current) {
        const mc = toMap(e.clientX, e.clientY);
        const dr = templateDrawRef.current;
        if (dr.type === 'circle') {
          const r = Math.hypot(mc.x - dr.startX, mc.y - dr.startY);
          setTemplatePreview({ type: 'circle', points: [dr.startX, dr.startY, r] });
        } else {
          setTemplatePreview({ type: dr.type, points: [dr.startX, dr.startY, mc.x, mc.y] });
        }
        return;
      }

      // ── Marquee selection rectangle ───────────────────────────────────────
      if (marqueeRef.current) {
        const mc = toMap(e.clientX, e.clientY);
        const m = marqueeRef.current;
        setMarqueeRect({
          x: Math.min(m.startX, mc.x),
          y: Math.min(m.startY, mc.y),
          w: Math.abs(mc.x - m.startX),
          h: Math.abs(mc.y - m.startY),
        });
        return;
      }

      // ── Token drag ────────────────────────────────────────────────────────
      if (tokenDragRef.current) {
        const mc = toMap(e.clientX, e.clientY);
        const dr = tokenDragRef.current;
        // Clamped to this round's remaining movement — see clampDragDelta.
        // The token follows the cursor up to the limit and then stays there,
        // which reads as running out of movement.
        const [dxMap, dyMap] = clampDragDelta(mc.x - dr.startMapX, mc.y - dr.startMapY);
        const positions = new Map();
        for (const id of dr.tokenIds) {
          const orig = dr.origPositions.get(id);
          if (!orig) continue;
          positions.set(id, {
            x: offsetXRef.current + orig.col * gridSizeRef.current + dxMap,
            y: offsetYRef.current + orig.row * gridSizeRef.current + dyMap,
          });
        }
        // Movement budget: how far the primary token has travelled, in feet,
        // against its walking speed. Diagonals count at full length (5e's
        // "every square is 5 ft"), matching how the ruler already measures.
        const gs = gridSizeRef.current || 50;
        const squares = Math.max(Math.abs(dxMap), Math.abs(dyMap)) / gs;
        const feet = Math.round(squares * FEET_PER_SQUARE);
        const primary = (tokensRef.current || []).find((t) => t.id === dr.primaryId);
        // ORDINARY movement too, not just sneaking: a token in the air is
        // measured against its fly speed, so the Dash threshold on the readout
        // is the right one for what the creature is actually doing.
        const sp = speedForToken(primary, primary?.move_mode || 'auto');
        const speed = sp.ft;
        const speedMode = sp.mode;
        setDragVis({
          positions, feet, speed, speedMode, primaryId: dr.primaryId,
          // Present only while a budget is being enforced, so the ordinary
          // readout is untouched outside a sneak sequence.
          capFt: moveCapRef.current,
        });
        return;
      }
      if (panning.current) {
        setPos({
          x: panStart.current.sx + (e.clientX - panStart.current.cx),
          y: panStart.current.sy + (e.clientY - panStart.current.cy),
        });
        return;
      }
      if (inking.current) {
        const mc = toMap(e.clientX, e.clientY);
        setInkDraft((prev) => {
          if (!prev) return [mc.x, mc.y];
          // Drop points closer than a couple of map units together: a slow
          // drag would otherwise sample hundreds of near-identical points and
          // send them all over the wire.
          const lx = prev[prev.length - 2], ly = prev[prev.length - 1];
          if (Math.hypot(mc.x - lx, mc.y - ly) < 2) return prev;
          return [...prev, mc.x, mc.y];
        });
        return;
      }
      if (measuring.current) {
        const mc = toMap(e.clientX, e.clientY);
        setMeas(prev => prev ? { ...prev, end: mc } : null);
      }
    }

    // Every click path that can land on a portal funnels through here. It has
    // to be shared: the Move tool (the player view's default) turns a click on
    // empty space into a marquee, and that branch returns long before the
    // pan-tool portal check further down — which is why portals worked for the
    // GM and did nothing at all for players.
    function tryPortalClick(e) {
      if (!onPortalUseRef.current || placingTokenRef.current) return false;
      const mc = toMap(e.clientX, e.clientY);
      const hit = findPortalAt(mc.x, mc.y, portalsRef.current, offsetXRef.current, offsetYRef.current, gridSizeRef.current);
      if (!hit) return false;
      onPortalUseRef.current(hit.id);
      return true;
    }

    function onMouseUp(e) {
      // Commit the freehand stroke. A single-point tap is dropped — it's a
      // click, not a drawing, and a dot of ink nobody meant to leave is worse
      // than nothing.
      if (inking.current) {
        inking.current = false;
        setInkDraft((prev) => {
          if (prev && prev.length >= 4) onDrawStrokeRef.current?.(prev);
          return null;
        });
        return;
      }
      // Commit a spawn-point drag (or a no-move click). Either way
      // we clear local drag state. Same-tile mouseup is a no-op for
      // the parent so a stray click doesn't churn the DB.
      if (spawnDrag) {
        const mc = toMap(e.clientX, e.clientY);
        const gs = gridSizeRef.current;
        const ox = offsetXRef.current, oy = offsetYRef.current;
        const col = (mc.x - ox) / gs;
        const row = (mc.y - oy) / gs;
        // Tiny-movement guard: a click-without-drag doesn't churn the
        // DB. Threshold in grid units, ~1/10 of a cell.
        if (Math.abs(col - spawnDrag.origCol) > 0.1 || Math.abs(row - spawnDrag.origRow) > 0.1) {
          onSpawnPointMoveRef.current?.(spawnDrag.id, col, row);
        }
        spawnDrag = null;
        setSpawnDragVis(null);
        return;
      }
      // Commit an adjustment.
      if (stairEdit) {
        const { idx, next } = stairEdit;
        stairEdit = null;
        setStairPreview(null);
        // A grab with no movement is not an edit — don't churn the server for
        // someone who clicked a staircase and thought better of it.
        if (next) onStairAdjustRef.current?.(idx, next);
        return;
      }

      // Commit the staircase that was just dragged out.
      if (stairDraw) {
        const mc = toMap(e.clientX, e.clientY);
        const gs = gridSizeRef.current;
        const ox = offsetXRef.current, oy = offsetYRef.current;
        const c = (mc.x - ox) / gs, r = (mc.y - oy) / gs;
        const col = Math.min(stairDraw.c0, c);
        const row = Math.min(stairDraw.r0, r);
        let w = Math.abs(c - stairDraw.c0);
        let h = Math.abs(r - stairDraw.r0);
        stairDraw = null;
        setStairPreview(null);
        // A click rather than a drag still means "a stair here" — one square,
        // centred where they clicked.
        if (w < 0.15 || h < 0.15) {
          onStairPlaceRef.current?.(col - 0.5, row - 0.5, 1, 1);
        } else {
          onStairPlaceRef.current?.(col, row, w, h);
        }
        return;
      }

      // Terrain rotate commit.
      if (terrainRotate) {
        if (terrainRotate.lastRotation !== undefined) {
          onTerrainResizeRef.current?.(terrainRotate.id, { rotation: terrainRotate.lastRotation }, /* live */ false);
        }
        terrainRotate = null;
        return;
      }

      // Terrain resize commit — fires the socket emit on drop so the
      // server stops getting per-frame updates.
      if (terrainResize) {
        if (terrainResize.lastW !== undefined &&
            (Math.abs(terrainResize.lastW - terrainResize.startW) > 0.05 ||
             Math.abs(terrainResize.lastH - terrainResize.startH) > 0.05)) {
          onTerrainResizeRef.current?.(terrainResize.id, {
            width: terrainResize.lastW,
            height: terrainResize.lastH,
          }, /* live */ false);
        }
        terrainResize = null;
        return;
      }

      // Did this press travel far enough to count as a drag rather than a
      // click? Declared HERE, above every branch that reads it.
      //
      // It used to be declared ~70 lines further down, below the stairs block
      // — which read it. `const` is not hoisted-and-initialised, so that read
      // hit the temporal dead zone and threw `Cannot access 'moved' before
      // initialization` out of the window mouseup listener. Every mouseup that
      // began on a stairwell died on the spot: the deck change never fired, the
      // token move never committed, and the drag teardown at the bottom of this
      // handler never ran — leaving the token stuck to the pointer. It only
      // ever showed up on stairwell squares, because they are the one thing
      // that sets `pendingTransition` and reaches the read.
      const moved = Math.abs(e.clientX - downX) > 5 || Math.abs(e.clientY - downY) > 5;

      // Terrain drag commit — only push to the server if the piece
      // actually moved (saves DB churn on a single-click select).
      // Taking the stairs. Which token moves: a player moves their own; the
      // GM moves whichever token is selected. The token has to already be on
      // this ship and on the deck the stairs are drawn on — you can't send
      // someone below from across the map. Adjacency to the stairwell is not
      // enforced; that's left to the table.
      if (pendingTransition) {
        const { ship, deck, tr } = pendingTransition;
        pendingTransition = null;
        if (!moved) {
          const tokenId = isPlayer ? playerTokenIdRef.current : selectedTokenIdRef.current;
          const tok = tokenId != null ? tokensByIdRef.current.get(tokenId) : null;
          if (tok && tok.ship_id === ship.id && (tok.deck_index ?? 0) === deck.deck_index) {
            onTokenChangeDeckRef.current?.(
              tokenId, ship.id,
              tr.to_deck ?? 0,
              tr.to_col ?? 0,
              tr.to_row ?? 0,
            );
          }
          // Only a stationary click is spent on the stairs. The press may ALSO
          // have started a token drag — a token standing on the stairwell now
          // falls through the mousedown guard above — and the branch that tears
          // that state down sits below this return. Leaving it set left the
          // token glued to the pointer after release, so clear it here.
          tokenDragRef.current = null;
          setDragVis(null);
          return;
        }
        // The pointer moved, so this press was a drag that happened to START on
        // a stairwell — a token being walked off it. Fall through so the token
        // drop below commits; returning here would record the transition, take
        // the stairs off the table, and then throw the move away as well.
      }

      // Commit the ship move once, on release — not per frame. The server
      // re-projects every token aboard as part of handling this, which is
      // what makes the crew travel with the hull.
      if (shipDrag) {
        if (shipDrag.lastCol !== undefined &&
            (Math.abs(shipDrag.lastCol - shipDrag.startCol) > 0.02 ||
             Math.abs(shipDrag.lastRow - shipDrag.startRow) > 0.02)) {
          onShipMoveRef.current?.(shipDrag.id, shipDrag.lastCol, shipDrag.lastRow, /* live */ false);
        }
        shipDrag = null;
        setShipMeasure(null);
        // Leave the preview standing until the server's positions arrive —
        // dropping it here would flick the crew back to where they were before
        // the drag for the length of the round trip.
        crewVisPendingRef.current = true;
        return;
      }

      if (shipRotate) {
        if (shipRotate.lastRot !== undefined) {
          onShipRotateRef.current?.(shipRotate.id, shipRotate.lastRot, /* live */ false);
        }
        shipRotate = null;
        crewVisPendingRef.current = true;
        return;
      }

      if (terrainDrag) {
        if (terrainDrag.lastCol !== undefined &&
            (Math.abs(terrainDrag.lastCol - terrainDrag.startCol) > 0.05 ||
             Math.abs(terrainDrag.lastRow - terrainDrag.startRow) > 0.05)) {
          onTerrainMoveRef.current?.(terrainDrag.id, terrainDrag.lastCol, terrainDrag.lastRow, /* live */ false);
        }
        terrainDrag = null;
        return;
      }
      // End the right-click pan-drag without falling through to any
      // left-click finalisation logic. The contextmenu handler reads
      // `rightPanMoved` to decide whether to suppress the menu.
      if (e.button === 2) {
        rightPanning = false;
        return;
      }
      const tool  = activeToolRef.current;
      // TEMP DIAGNOSTIC — remove once the placement bug is pinned down.
      console.log('[place] pointerup', {
        tool, moved,
        placingToken: placingTokenRef.current,
        hasMapClick: !!onMapClickRef.current,
        wallTool: WALL_DRAW_TOOLS.has(tool),
        marquee: !!marqueeRef.current,
        tokenDrag: !!tokenDragRef.current,
        wallDraw: !!wallDrawRef.current,
        polyDraw: !!polyDrawRef.current,
      });


      // ── Wall tools ────────────────────────────────────────────────────────
      if (WALL_DRAW_TOOLS.has(tool)) {
        if (tool === 'wall-polygon' && !moved) {
          const mc  = toMap(e.clientX, e.clientY);
          const pts = polyDrawRef.current;
          // Close polygon when clicking near first point
          if (pts && pts.length >= 6) {
            const d = Math.hypot(mc.x - pts[0], mc.y - pts[1]);
            if (d < 20 / scaleRef.current) {
              onWallAddRef.current?.({ type: 'polygon', points: pts });
              polyDrawRef.current = null;
              setWallPreview(null);
              return;
            }
          }
          polyDrawRef.current = pts ? [...pts, mc.x, mc.y] : [mc.x, mc.y];
          setWallPreview({ type: 'polygon', points: [...polyDrawRef.current] });
          return;
        }
        if (wallDrawRef.current) {
          const mc = toMap(e.clientX, e.clientY);
          const dr = wallDrawRef.current;
          if (dr.type === 'circle') {
            const r = Math.hypot(mc.x - dr.startX, mc.y - dr.startY);
            if (r > 5) onWallAddRef.current?.({ type: 'circle', points: [dr.startX, dr.startY, r] });
          } else {
            const d = Math.hypot(mc.x - dr.startX, mc.y - dr.startY);
            if (d > 5) onWallAddRef.current?.({ type: dr.type, points: [dr.startX, dr.startY, mc.x, mc.y] });
          }
          wallDrawRef.current = null;
          setWallPreview(null);
        }
        return; // don't fall through to token/map logic
      }

      // ── Template move complete / select on tap (GM only) ────────────────
      if (tool === 'tpl-edit' && templateMoveRef.current) {
        const dr = templateMoveRef.current;
        if (moved) {
          const mc = toMap(e.clientX, e.clientY);
          const dxMap = mc.x - dr.startMapX;
          const dyMap = mc.y - dr.startMapY;
          const orig = dr.origPoints;
          const next = orig.length === 3
            ? [orig[0] + dxMap, orig[1] + dyMap, orig[2]]
            : [orig[0] + dxMap, orig[1] + dyMap, orig[2] + dxMap, orig[3] + dyMap];
          onTemplateUpdateRef.current?.({ id: dr.id, points: next });
        } else {
          onTemplateSelectRef.current?.(dr.id);
        }
        templateMoveRef.current = null;
        setTemplateMovePreview(null);
        return;
      }

      // ── Spell template draw complete (GM only) ──────────────────────────
      if (TEMPLATE_TOOLS.has(tool)) {
        if (templateDrawRef.current) {
          const dr = templateDrawRef.current;
          const mc = toMap(e.clientX, e.clientY);
          let points = null;
          if (dr.type === 'circle') {
            const r = Math.hypot(mc.x - dr.startX, mc.y - dr.startY);
            if (r > 5) points = [dr.startX, dr.startY, r];
          } else {
            const d = Math.hypot(mc.x - dr.startX, mc.y - dr.startY);
            if (d > 5) points = [dr.startX, dr.startY, mc.x, mc.y];
          }
          if (points) onTemplatePlaceRef.current?.({ type: dr.type, points });
          templateDrawRef.current = null;
          setTemplatePreview(null);
        }
        return;
      }

      // ── Light drawing complete ────────────────────────────────────────────
      if (LIGHT_DRAW_TOOLS.has(tool)) {
        if (lightDrawRef.current) {
          const mc = toMap(e.clientX, e.clientY);
          const dr = lightDrawRef.current;
          const dx = mc.x - dr.startX;
          const dy = mc.y - dr.startY;
          const brightR = Math.hypot(dx, dy);
          if (brightR > 5) {
            const dirDeg = Math.atan2(dy, dx) * 180 / Math.PI;
            onLightAddRef.current?.({
              x: dr.startX, y: dr.startY,
              brightRadius: Math.round(brightR),
              dimRadius: Math.round(brightR * 2),
              direction: Math.round(dirDeg),
            });
          }
          lightDrawRef.current = null;
          setLightPreview(null);
        }
        return;
      }
      if (tool === 'light-erase') return;

      // ── Magical darkness / heavy fog drawing complete ─────────────────────
      if (DARKNESS_DRAW_TOOLS.has(tool)) {
        // Polygon tools: click to add vertices, click near first vertex to close
        if (DARKNESS_POLY_TOOLS.has(tool)) {
          if (!moved) {
            const mc = toMap(e.clientX, e.clientY);
            const pts = darkPolyDrawRef.current;
            if (!pts) {
              // First vertex
              darkPolyDrawRef.current = [mc.x, mc.y];
              darkPolyToolRef.current = tool;
              setDarknessPreview({ isPolygon: true, points: [mc.x, mc.y], cursorX: mc.x, cursorY: mc.y });
            } else if (pts.length >= 6 && Math.hypot(mc.x - pts[0], mc.y - pts[1]) < 18 / scaleRef.current) {
              // Close polygon — enough vertices and near start point
              onMagicalDarknessAddRef.current?.({
                zoneType: darkPolyToolRef.current === 'fog-polygon' ? 'heavy-fog' : darkPolyToolRef.current === 'water-polygon' ? 'water' : 'darkness',
                shape: 'polygon',
                x: 0, y: 0, radius: 0,
                polyPoints: pts,
              });
              darkPolyDrawRef.current = null;
              setDarknessPreview(null);
            } else {
              // Add vertex
              darkPolyDrawRef.current = [...pts, mc.x, mc.y];
              setDarknessPreview({ isPolygon: true, points: [...darkPolyDrawRef.current], cursorX: mc.x, cursorY: mc.y });
            }
          }
          return;
        }
        // Circle tools
        if (darknessDrawRef.current) {
          const mc = toMap(e.clientX, e.clientY);
          const dr = darknessDrawRef.current;
          const r = Math.hypot(mc.x - dr.startX, mc.y - dr.startY);
          if (r > 5) {
            onMagicalDarknessAddRef.current?.({
              x: dr.startX, y: dr.startY,
              radius: Math.round(r),
              zoneType: tool === 'heavy-fog' ? 'heavy-fog' : tool === 'water-circle' ? 'water' : 'darkness',
            });
          }
          darknessDrawRef.current = null;
          setDarknessPreview(null);
        }
        return;
      }
      if (tool === 'darkness-erase') return;

      // ── Door drawing complete ─────────────────────────────────────────────
      if (DOOR_DRAW_TOOLS.has(tool)) {
        if (wallDrawRef.current && wallDrawRef.current.type === 'door') {
          const mc = toMap(e.clientX, e.clientY);
          const dr = wallDrawRef.current;
          const d  = Math.hypot(mc.x - dr.startX, mc.y - dr.startY);
          if (d > 5) {
            onDoorAddRef.current?.({ style: dr.style, points: [dr.startX, dr.startY, mc.x, mc.y] });
          }
          wallDrawRef.current = null;
          setWallPreview(null);
        }
        return;
      }

      // ── Marquee complete — pick all tokens whose centre is inside the box.
      if (marqueeRef.current) {
        const m = marqueeRef.current;
        const rect = {
          x: Math.min(m.startX, toMap(e.clientX, e.clientY).x),
          y: Math.min(m.startY, toMap(e.clientX, e.clientY).y),
          w: 0, h: 0,
        };
        const mc = toMap(e.clientX, e.clientY);
        const x1 = Math.min(m.startX, mc.x), y1 = Math.min(m.startY, mc.y);
        const x2 = Math.max(m.startX, mc.x), y2 = Math.max(m.startY, mc.y);
        if (moved) {
          const gs = gridSizeRef.current;
          const ox = offsetXRef.current, oy = offsetYRef.current;
          const ids = [];
          for (const t of tokensRef.current) {
            const sz = tokenFootprint(t);
            const cx = ox + Number(t.grid_col) * gs + (sz.gridW * gs) / 2;
            const cy = oy + Number(t.grid_row) * gs + (sz.gridH * gs) / 2;
            if (cx >= x1 && cx <= x2 && cy >= y1 && cy <= y2) ids.push(t.id);
          }
          setMultiSelected(prev => {
            if (m.additive) {
              const next = new Set(prev);
              for (const id of ids) next.add(id);
              return next;
            }
            return new Set(ids);
          });
        } else if (!tryPortalClick(e)) {
          // Treat a non-drag click on empty space as "clear selection" — but
          // only once the pad under the cursor has declined it.
          setMultiSelected(new Set());
          onTokenSelectRef.current?.(null);
        }
        marqueeRef.current = null;
        setMarqueeRect(null);
        return;
      }

      // ── Token drag / select ───────────────────────────────────────────────
      if (tokenDragRef.current) {
        const dr = tokenDragRef.current;
        if (moved) {
          const mc = toMap(e.clientX, e.clientY);
          const ox = offsetXRef.current, oy = offsetYRef.current, gs = gridSizeRef.current;
          // The SAME clamp the live drag used. Computing this from the raw
          // pointer is what dropped the token under the cursor rather than
          // where it had been held back to.
          const [dxMap, dyMap] = clampDragDelta(mc.x - dr.startMapX, mc.y - dr.startMapY);
          for (const id of dr.tokenIds) {
            const orig = dr.origPositions.get(id);
            if (!orig) continue;
            const finalX = ox + orig.col * gs + dxMap;
            const finalY = oy + orig.row * gs + dyMap;
            commitTokenMove(id, (finalX - ox) / gs, (finalY - oy) / gs);
          }
        } else {
          // A token standing on a portal swallows clicks aimed at the pad
          // underneath it, which made the most natural gesture — click the
          // gate you're standing on — do nothing at all. So: the first click
          // selects the token as usual, and a second click on the same
          // already-selected token steps it through.
          const alreadySelected = selectedTokenIdRef.current === dr.primaryId;
          if (!alreadySelected || !tryPortalClick(e)) onTokenSelectRef.current?.(dr.primaryId);
        }
        tokenDragRef.current = null;
        setDragVis(null);
      } else if (!moved) {
        // Ping tool fires immediately and skips all other click handling
        if (PING_TOOLS.has(activeToolRef.current) && onPingMapRef.current) {
          const mc = toMap(e.clientX, e.clientY);
          // The size rides on which ping tool is up. The host fills in the
          // storey, which this view has no opinion about — it only ever shows
          // one floor.
          onPingMapRef.current(mc.x, mc.y, { size: pingSizeForTool(activeToolRef.current) });
          panning.current = false;
          measuring.current = false;
          return;
        }

        // Clicking a portal sends the selected token through it. Checked
        // before doors because a portal set in a doorway would otherwise only
        // ever swing the door. Same guard as doors: not while placing a token,
        // or dropping a creature on the pad would teleport it on arrival.
        if (tryPortalClick(e)) {
          panning.current = false;
          measuring.current = false;
          return;
        }

        // GM can click near a door (pan or move mode) to toggle it — but not
        // while placing, or dropping a creature in a doorway swings the door
        // instead of putting the token down. Doors have a 14px grab radius, so
        // this fires well before the pointer looks like it's "on" the door.
        if (onDoorToggleRef.current && !placingTokenRef.current) {
          const mc = toMap(e.clientX, e.clientY);
          // A shut secret door is not a door as far as a player is concerned,
          // so it is not even in the running for the click. The server refuses
          // the toggle anyway, but a click that lands on nothing else — no
          // token dropped, no measurement started — is itself a tell.
          const clickableDoors = isPlayerRef.current
            ? doorsRef.current.filter((d) => doorIsUsableBy(d, false))
            : doorsRef.current;
          const hit = findNearestDoor(mc.x, mc.y, clickableDoors, 14 / scaleRef.current);
          if (hit) console.log('[place] -> swallowed by door toggle', hit.door.id);
          if (hit) {
            onDoorToggleRef.current(hit.door.id);
            panning.current = false;
            measuring.current = false;
            return;
          }
        }
        if (placingTokenRef.current && onMapClickRef.current) {
          console.log('[place] -> placing token');
          const mc = toMap(e.clientX, e.clientY);
          const ox = offsetXRef.current, oy = offsetYRef.current, gs = gridSizeRef.current;
          // The exact point, in the same frame the snapped coordinates use: a
          // token at (c, r) has its centre at (c + 0.5, r + 0.5), so the click's
          // own position as a token-origin is half a square up and left of it.
          //
          // Passed alongside the snapped pair rather than instead of it. A
          // dropped token belongs on a square — that is what squares are for —
          // but a patrol waypoint is a point on a path, and rounding it to the
          // middle of the nearest square is what made routes look like they ran
          // through the corner of the token walking them. Callers that want the
          // grid simply ignore the third argument.
          const exact = { col: (mc.x - ox) / gs - 0.5, row: (mc.y - oy) / gs - 0.5 };
          if (isHexGridRef.current) {
            // Hex analogue of the square case below: land the token on the cell
            // that was clicked. Hex columns don't line up with integer grid
            // columns, so flooring would drop it straddling two hexes — the
            // clicked hex's centre gives the same "it went where I pointed"
            // result. Coordinates stay in the ordinary fractional frame, so
            // dragging afterwards is as free as it is on a square map.
            const lat = hexLattice(mWRef.current, mHRef.current, gs);
            const p = nearestHexCenter(lat, mc.x, mc.y);
            onMapClickRef.current((p.x - ox) / gs - 0.5, (p.y - oy) / gs - 0.5, exact);
          } else {
            onMapClickRef.current(
              Math.floor((mc.x - ox) / gs),
              Math.floor((mc.y - oy) / gs),
              exact,
            );
          }
        } else {
          onTokenSelectRef.current?.(null);
          // Clicking empty space also clears any active multi-selection.
          setMultiSelected(prev => (prev.size === 0 ? prev : new Set()));
        }
      }

      panning.current  = false;
      measuring.current = false;
    }

    // Spawn polygon: convert in-progress map-pixel vertices into the
    // grid-space {col, row} list the parent expects, then hand off to
    // onSpawnNamedAdd. Resets the in-progress state either way.
    function finaliseSpawnPolygon() {
      const ref = spawnPolyDrawRef.current;
      spawnPolyDrawRef.current = null;
      setSpawnPolyPreview(null);
      if (!ref || ref.length < 6) return; // need ≥3 vertices
      const ox = offsetXRef.current, oy = offsetYRef.current, gs = gridSizeRef.current;
      const pts = [];
      for (let i = 0; i < ref.length; i += 2) {
        pts.push({ col: (ref[i] - ox) / gs, row: (ref[i + 1] - oy) / gs });
      }
      onSpawnNamedAddRef.current?.(pts);
    }

    // Escape = cancel in-progress draws. Enter = finalise polygons
    // (walls or spawn) when at least 3 vertices have been placed.
    function onKeyDown(e) {
      if (e.key === 'Enter') {
        if (spawnPolyDrawRef.current && spawnPolyDrawRef.current.length >= 6) {
          finaliseSpawnPolygon();
          return;
        }
        if (polyDrawRef.current && polyDrawRef.current.length >= 6) {
          onWallAddRef.current?.({ type: 'polygon', points: polyDrawRef.current });
          polyDrawRef.current = null;
          setWallPreview(null);
          return;
        }
      }
      if (e.key === 'Escape') {
        if (polyDrawRef.current) {
          const pts = polyDrawRef.current;
          if (pts.length >= 6) onWallAddRef.current?.({ type: 'polygon', points: pts });
          polyDrawRef.current = null;
        }
        wallDrawRef.current = null;
        setWallPreview(null);
        // Cancel darkness/fog polygon
        if (darkPolyDrawRef.current) {
          darkPolyDrawRef.current = null;
          setDarknessPreview(null);
        }
        darknessDrawRef.current = null;
        // Cancel fog polygon draw
        setFogPolyPoints([]);
        fogPolyRef.current = [];
        setFogCursorGrid(null);
        // Cancel any in-progress spawn polygon. Esc always discards;
        // use Enter to finalise.
        spawnPolyDrawRef.current = null;
        setSpawnPolyPreview(null);
      }
    }

    function onContextMenu(e) {
      e.preventDefault();
      // If the user just finished a right-drag pan, swallow the menu —
      // they meant to pan, not to open a door / token menu. The flag
      // is cleared after each contextmenu so the next plain right-
      // click without a drag opens the menu normally.
      if (rightPanMoved) {
        rightPanMoved = false;
        return;
      }
      // Token right-click takes priority over door-flip when a token is
      // under the cursor — GM-only callback; player passes a no-op.
      if (onTokenContextMenuRef.current) {
        const mc = toMap(e.clientX, e.clientY);
        const tk = hitToken(mc.x, mc.y);
        if (tk) {
          onTokenContextMenuRef.current(tk.id, e.clientX, e.clientY);
          return;
        }
      }
      // Portal right-click — GM-only. Sits above terrain and doors because a
      // pad is deliberately small and usually placed over both of them; if
      // either won the click there'd be no way to reach the portal's own menu.
      if (!isPlayer) {
        const mc = toMap(e.clientX, e.clientY);
        const hit = findPortalAt(mc.x, mc.y, portalsRef.current, offsetXRef.current, offsetYRef.current, gridSizeRef.current);
        if (hit) {
          setDoorMenu(null);
          setPortalMenu({ portal: hit, clientX: e.clientX, clientY: e.clientY });
          return;
        }
      }

      // Terrain right-click — GM-only menu (delete / reveal / edit).
      // Falls through to the door-flip path below if no piece is hit.
      // Right-click a staircase to remove it. Ahead of the terrain menu because
      // a stair is usually drawn over scenery, and the thing you right-clicked
      // is the thing on top.
      if (onStairRemoveRef.current && !isPlayer) {
        const gs = gridSizeRef.current;
        const ox = offsetXRef.current, oy = offsetYRef.current;
        const mc = toMap(e.clientX, e.clientY);
        const cc = (mc.x - ox) / gs, rr = (mc.y - oy) / gs;
        const tr = (levelTransitionsRef.current || []).find(
          (t) => cc >= t.col && cc <= t.col + (Number(t.w) || 1)
            && rr >= t.row && rr <= t.row + (Number(t.h) || 1)
        );
        if (tr) {
          onStairRemoveRef.current(tr);
          return;
        }
      }

      if (onTerrainContextMenuRef.current && !isPlayer) {
        const mc = toMap(e.clientX, e.clientY);
        const t = hitTerrain(mc.x, mc.y, /* allowLocked */ true);
        if (t) {
          onTerrainContextMenuRef.current(t.id, e.clientX, e.clientY);
          return;
        }
      }
      // Ship right-click — GM-only removal menu. Above fog and doors because a
      // hull covers a lot of map and those would otherwise win underneath it.
      if (!isPlayer && onShipRemoveRef.current) {
        const mc = toMap(e.clientX, e.clientY);
        const hit = hitShip(mc.x, mc.y);
        if (hit) {
          setShipMenu({ ship: hit.ship, clientX: e.clientX, clientY: e.clientY, pending: null });
          return;
        }
      }
      // Fog block right-click — GM-only quick menu (reveal/hide/delete).
      if (!isPlayer) {
        const mc = toMap(e.clientX, e.clientY);
        const hit = (fogBlocksRef.current || []).find(fb => {
          const pts = Array.isArray(fb.points) ? fb.points : [];
          return pts.length >= 3 && pointInPolygon(mc.x, mc.y, pts);
        });
        if (hit) {
          setFogBlockMenu({ id: hit.id, is_revealed: hit.is_revealed, clientX: e.clientX, clientY: e.clientY });
          return;
        }
      }
      // Door right-click — GM gets a full menu (toggle/flip/sprite/motion/
      // delete); players just flip via the existing quick path isn't offered.
      if (!isPlayer) {
        const mc = toMap(e.clientX, e.clientY);
        const hit = findNearestDoor(mc.x, mc.y, doorsRef.current, 14 / scaleRef.current);
        if (hit) {
          setDoorMenu({ door: hit.door, clientX: e.clientX, clientY: e.clientY });
          return;
        }
      } else if (onDoorFlipRef.current) {
        const mc = toMap(e.clientX, e.clientY);
        const hit = findNearestDoor(mc.x, mc.y, doorsRef.current, 14 / scaleRef.current);
        if (hit) onDoorFlipRef.current(hit.door.id);
      }

      // Laid tile — LAST, because a tile is the floor. Anything standing on
      // it (a door, a token, a terrain piece) has already claimed the click
      // above and returned; only a right-click on bare floor gets here.
      //
      // Topmost first: tiles are drawn in id order, so a later one laid over
      // an earlier one is the one being pointed at.
      if (!isPlayer && onTileMenuRef.current) {
        const mc = toMap(e.clientX, e.clientY);
        const gs = gridSizeRef.current;
        const ox = offsetXRef.current, oy = offsetYRef.current;
        const col = (mc.x - ox) / gs;
        const row = (mc.y - oy) / gs;
        const list = tilesRef.current || [];
        for (let i = list.length - 1; i >= 0; i--) {
          const t = list[i];
          const w = Number(t.grid_w) || 2, h = Number(t.grid_h) || 2;
          if (col >= t.grid_col && col <= t.grid_col + w
           && row >= t.grid_row && row <= t.grid_row + h) {
            onTileMenuRef.current(t.id, e.clientX, e.clientY);
            return;
          }
        }
      }
    }

    container.addEventListener('mousedown',   onMouseDown);
    container.addEventListener('contextmenu', onContextMenu);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup',   onMouseUp);
    window.addEventListener('keydown',   onKeyDown);
    return () => {
      container.removeEventListener('mousedown',   onMouseDown);
      container.removeEventListener('contextmenu', onContextMenu);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup',   onMouseUp);
      window.removeEventListener('keydown',   onKeyDown);
    };
  }, []); // stable — all live state accessed via refs

  // ── Wheel zoom (Konva) ────────────────────────────────────────────────────
  const handleWheel = useCallback((e) => {
    e.evt.preventDefault();
    if (isFollowingRef.current) return;
    const pt = stageRef.current.getPointerPosition();
    const s0 = scaleRef.current, p0 = posRef.current;
    const mx = (pt.x - p0.x) / s0, my = (pt.y - p0.y) / s0;
    const s1 = Math.max(0.08, Math.min(10, s0 * (e.evt.deltaY < 0 ? 1.1 : 1 / 1.1)));
    setScale(s1);
    setPos({ x: pt.x - mx * s1, y: pt.y - my * s1 });
  }, []);

  // ── Touch handlers (Konva) ────────────────────────────────────────────────
  const handleTouchStart = useCallback((e) => {
    if (isFollowingRef.current) return;
    const t = e.evt.touches;
    if (t.length === 1) {
      const tool = activeToolRef.current;
      const rect = containerRef.current.getBoundingClientRect();
      const mc = {
        x: (t[0].clientX - rect.left  - posRef.current.x) / scaleRef.current,
        y: (t[0].clientY - rect.top   - posRef.current.y) / scaleRef.current,
      };
      if (tool === 'move') {
        const gs = gridSizeRef.current;
        const ox = offsetXRef.current, oy = offsetYRef.current;
        const hit = tokensRef.current.find(tk => {
          const sz = tokenFootprint(tk);
          const tx = ox + Number(tk.grid_col) * gs, ty = oy + Number(tk.grid_row) * gs;
          return mc.x >= tx && mc.x < tx + sz.gridW * gs && mc.y >= ty && mc.y < ty + sz.gridH * gs;
        });
        if (hit) {
          // Touch drag: single-token only (no shift modifier on touch).
          resolveMoveCap(hit.id);
          tokenDragRef.current = {
            tokenIds: [hit.id],
            primaryId: hit.id,
            origPositions: new Map([[hit.id, { col: Number(hit.grid_col), row: Number(hit.grid_row) }]]),
            startMapX: mc.x,
            startMapY: mc.y,
          };
          return;
        }
      }
      if (tool === 'pan' || tool === 'move') {
        panning.current = true;
        panStart.current = { cx: t[0].clientX, cy: t[0].clientY, sx: posRef.current.x, sy: posRef.current.y };
      } else if (MEASURE_TOOLS.has(tool)) {
        measuring.current = true;
        setMeas({ type: tool, start: mc, end: mc });
      }
    } else if (t.length === 2) {
      tokenDragRef.current = null; setDragVis(null);
      panning.current = false; measuring.current = false;
      pinchDist.current = Math.hypot(t[1].clientX - t[0].clientX, t[1].clientY - t[0].clientY);
    }
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (isFollowingRef.current) return;
    e.evt.preventDefault();
    const t = e.evt.touches;
    const rect = containerRef.current.getBoundingClientRect();
    if (t.length === 1) {
      if (tokenDragRef.current) {
        const dr = tokenDragRef.current;
        const mapX = (t[0].clientX - rect.left  - posRef.current.x) / scaleRef.current;
        const mapY = (t[0].clientY - rect.top   - posRef.current.y) / scaleRef.current;
        const [dxMap, dyMap] = clampDragDelta(mapX - dr.startMapX, mapY - dr.startMapY);
        const positions = new Map();
        for (const id of dr.tokenIds) {
          const orig = dr.origPositions.get(id);
          if (!orig) continue;
          positions.set(id, {
            x: offsetXRef.current + orig.col * gridSizeRef.current + dxMap,
            y: offsetYRef.current + orig.row * gridSizeRef.current + dyMap,
          });
        }
        setDragVis({ positions });
      } else if (panning.current) {
        setPos({
          x: panStart.current.sx + (t[0].clientX - panStart.current.cx),
          y: panStart.current.sy + (t[0].clientY - panStart.current.cy),
        });
      } else if (measuring.current) {
        const mc = {
          x: (t[0].clientX - rect.left  - posRef.current.x) / scaleRef.current,
          y: (t[0].clientY - rect.top   - posRef.current.y) / scaleRef.current,
        };
        setMeas(prev => prev ? { ...prev, end: mc } : null);
      }
    } else if (t.length === 2) {
      const d = Math.hypot(t[1].clientX - t[0].clientX, t[1].clientY - t[0].clientY);
      if (pinchDist.current > 0) {
        const mx = (t[0].clientX + t[1].clientX) / 2;
        const my = (t[0].clientY + t[1].clientY) / 2;
        const s0 = scaleRef.current, p0 = posRef.current;
        const mapX = (mx - p0.x) / s0, mapY = (my - p0.y) / s0;
        const s1 = Math.max(0.08, Math.min(10, s0 * (d / pinchDist.current)));
        setScale(s1);
        setPos({ x: mx - mapX * s1, y: my - mapY * s1 });
      }
      pinchDist.current = d;
    }
  }, []);

  const handleTouchEnd = useCallback((e) => {
    if (tokenDragRef.current) {
      const dr = tokenDragRef.current;
      const t  = e.evt.changedTouches;
      if (t.length > 0) {
        const rect = containerRef.current.getBoundingClientRect();
        const mapX = (t[0].clientX - rect.left  - posRef.current.x) / scaleRef.current;
        const mapY = (t[0].clientY - rect.top   - posRef.current.y) / scaleRef.current;
        const ox = offsetXRef.current, oy = offsetYRef.current, gs = gridSizeRef.current;
        // Same clamp as the mouse drop — see clampDragDelta.
        const [dxMap, dyMap] = clampDragDelta(mapX - dr.startMapX, mapY - dr.startMapY);
        for (const id of dr.tokenIds) {
          const orig = dr.origPositions.get(id);
          if (!orig) continue;
          const finalX = ox + orig.col * gs + dxMap;
          const finalY = oy + orig.row * gs + dyMap;
          commitTokenMove(id, (finalX - ox) / gs, (finalY - oy) / gs);
        }
      }
      tokenDragRef.current = null;
      setDragVis(null);
    }
    panning.current  = false;
    measuring.current = false;
    pinchDist.current = 0;
  }, []);

  // Cursor
  const cursor = placingToken                     ? 'crosshair'
    : activeTool === 'pan'                        ? 'grab'
    : activeTool === 'move'                       ? 'default'
    : MEASURE_TOOLS.has(activeTool)               ? 'crosshair'
    : activeTool === 'wall-erase'                 ? 'not-allowed'
    : activeTool === 'light-erase'                ? 'not-allowed'
    : activeTool === 'door-erase'                 ? 'not-allowed'
    : activeTool === 'darkness-erase'             ? 'not-allowed'
    : activeTool === 'zone-feather'               ? 'pointer'
    : WALL_DRAW_TOOLS.has(activeTool)             ? 'crosshair'
    : DOOR_DRAW_TOOLS.has(activeTool)             ? 'crosshair'
    : LIGHT_DRAW_TOOLS.has(activeTool)            ? 'crosshair'
    : DARKNESS_DRAW_TOOLS.has(activeTool)         ? 'crosshair'
    : SPAWN_TOOLS.has(activeTool)                 ? 'crosshair'
    : activeTool === 'fog-block'                  ? 'cell'
    : PING_TOOLS.has(activeTool)                  ? 'crosshair'
    : 'default';

  // Window blur regions, in MAP pixels. A window shouldn't merely darken what's
  // past it — you should be unable to make it out. The fog canvas can only
  // darken, because a 2D canvas can't sample the canvas beneath it, so the blur
  // is a DOM layer using backdrop-filter: it sits above the Konva stage and
  // below the fog, and blurs whatever the stage painted — map art, terrain and
  // tokens alike. Clipped to the viewer's LOS and then to the window cone;
  // nested clip-paths intersect.
  //
  // Coordinates are map-space and a wrapper element carries the pan/zoom
  // transform. Baking the transform into the clip-path instead meant every
  // polygon — LOS polygons run to hundreds of points — was re-stringified and
  // every layer's clip re-parsed on each pan frame. In map space the strings
  // are constant while panning, so the compositor just moves layers it already
  // has.
  const windowBlurRegions = useMemo(() => {
    if (!fogOfWar) return [];
    const toClip = (flat) => {
      const parts = [];
      for (let i = 0; i < flat.length; i += 2) {
        parts.push(`${flat[i].toFixed(1)}px ${flat[i + 1].toFixed(1)}px`);
      }
      return parts.join(',');
    };
    // Collect cones first and keep only the largest few. Each surviving region
    // is a compositor layer that snapshots and blurs everything beneath it, so
    // the cost is per layer, not per pixel — a dockside frontage of windows
    // seen by four players is dozens of full-screen backdrop passes a frame.
    const cones = [];
    for (const vp of visPolys) {
      if (!vp.pts || vp.pts.length < 6) continue;
      for (const win of (vp.windowDimPolys || [])) {
        if (!win || !win.poly || win.poly.length < 6) continue;
        const p = win.poly;
        let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
        for (let i = 0; i < p.length; i += 2) {
          if (p[i] < x0) x0 = p[i];
          if (p[i] > x1) x1 = p[i];
          if (p[i + 1] < y0) y0 = p[i + 1];
          if (p[i + 1] > y1) y1 = p[i + 1];
        }
        // Clamped to the map — the cone runs several map-widths past the pane,
        // so unclamped bounds are near-identical for every window and rank
        // nothing. On-map footprint is what decides which cones matter.
        x0 = Math.max(0, x0); y0 = Math.max(0, y0);
        x1 = Math.min(mW, x1); y1 = Math.min(mH, y1);
        cones.push({ vp, poly: p, area: Math.max(0, x1 - x0) * Math.max(0, y1 - y0) });
      }
    }
    cones.sort((a, b) => b.area - a.area);
    // One LOS clip string per origin rather than one per cone — several origins
    // usually share the same handful of polygons.
    const losClips = new Map();
    return cones.slice(0, WINDOW_BLUR_MAX_LAYERS).map(c => {
      let los = losClips.get(c.vp);
      if (los === undefined) { los = toClip(c.vp.pts); losClips.set(c.vp, los); }
      return { los, cone: toClip(c.poly) };
    });
  }, [fogOfWar, visPolys, mW, mH]);

  // Grid lines — centered so partial cells are equal on both sides. Skipped
  // entirely on a hex map, which draws its lattice as a single Shape instead.
  const gridLines = [];
  if (!isHexGrid) {
    for (let c = 0; offsetX + c * gridSize <= mW; c++)
      gridLines.push(<Line key={`v${c}`} points={[offsetX + c * gridSize, 0, offsetX + c * gridSize, mH]} stroke={gridColor} strokeWidth={gridThickness} listening={false} />);
    for (let r = 0; offsetY + r * gridSize <= mH; r++)
      gridLines.push(<Line key={`h${r}`} points={[0, offsetY + r * gridSize, mW, offsetY + r * gridSize]} stroke={gridColor} strokeWidth={gridThickness} listening={false} />);
  }

  return (
    <div ref={containerRef} className="w-full h-full overflow-hidden" style={{ cursor, position: 'relative' }}>
      {/* Wildspace backdrop. Lives in the DOM rather than the stage because the
          pan/zoom transform is applied to the Stage itself — anything inside it
          inherits that transform, and this must not. Sitting outside costs no
          Konva node and no canvas memory, and leaves the stars fixed at
          apparent infinity while the grid pans and scales over them. */}
      {isWildspace && mapUrl && (
        <img
          src={mapUrl}
          alt=""
          draggable={false}
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'cover', pointerEvents: 'none', userSelect: 'none',
          }}
        />
      )}
      {showScaleKey && (
        <ScaleKey
          isHex={isHexGrid}
          gridSize={gridSize}
          scale={scale}
          mapScale={mapScale}
          gridColor={gridColor}
        />
      )}
      <Stage
        ref={stageRef}
        width={stageSize.w}
        height={stageSize.h}
        scaleX={scale} scaleY={scale}
        x={pos.x} y={pos.y}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ background: isWildspace ? 'transparent' : '#111827' }}
        listening={false}
      >
        {/* Base layer — map, grid, walls, doors, lights, zones, spawns,
            ships, terrain and templates all share ONE canvas, in that
            painting order. Every extra Konva Layer
            allocates two full-window canvases (scene + hit), which was the
            main driver of tab memory exhaustion in long sessions. Only
            content needing independent compositing (the two token layers
            the water effect samples) gets its own Layer. */}
        <Layer listening={false}>
        {/* Map image. Wildspace draws nothing here: its art is the DOM backdrop
            above, and rendering MapImage would also set imgDims — which would
            override mapWidth/mapHeight and collapse the map to the size of the
            starscape. The transparent stage lets the backdrop through. */}
        <Group>
          {isWildspace
            ? null
            : mapUrl
              ? <MapImage src={mapUrl} onDims={onDims} />
              : <Rect width={mW} height={mH} fill="#1f2937" listening={false} />}
        </Group>

        {/* Laid tiles — the floor of a tile map.
            UNDER the terrain group below, and under everything else: a tile
            IS the ground on a tile map, so scenery, tokens and effects all
            belong on top of it. Drawn from the tile's own stored path and
            edges, not from the library, so a dungeon the party is standing in
            survives the GM tidying the library it came from. */}
        <Group listening={false}>
          {tiles.map((t) => {
            const img = tileImages[t.image_path];
            if (!img) return null;
            const w = (Number(t.grid_w) || 2) * gridSize;
            const h = (Number(t.grid_h) || 2) * gridSize;
            const x = offsetX + Number(t.grid_col) * gridSize;
            const y = offsetY + Number(t.grid_row) * gridSize;
            return (
              <KonvaImage
                key={t.id}
                image={img}
                // Rotated about its own centre, so a quarter turn keeps the
                // tile on the squares it was placed on.
                x={x + w / 2}
                y={y + h / 2}
                offsetX={w / 2}
                offsetY={h / 2}
                width={w}
                height={h}
                rotation={Number(t.rotation) || 0}
                listening={false}
              />
            );
          })}
        </Group>

        {/* Grid */}
        <Group>
          {isHexGrid
            ? <HexGrid mW={mW} mH={mH} gridSize={gridSize} color={gridColor} thickness={gridThickness} />
            : gridLines}
        </Group>

        {/* Walls — GM only. Gated on isPlayer, not on fog: `!fogOfWar` used to
            stand in for "is the GM", which also drew the level's wall geometry
            to players in any session that simply had fog switched off. */}
        {!isPlayer && (
          <Group>
            {walls.map(w => <WallShape key={w.id} wall={w} />)}
            <WallPreview preview={wallPreview} />
          </Group>
        )}

        {/* Doors — always rendered (players see doors; GM sees open/closed state).
            Door preview uses the wall preview yellow dashed style. */}
        <Group>
          {doors.map(d => (
            <DoorShape
              key={d.id}
              door={d}
              spriteImg={d.sprite_path ? doorSpriteImages[d.sprite_path] || null : null}
              progress={doorAnim[d.id]}
              isPlayer={isPlayer}
            />
          ))}
          {DOOR_DRAW_TOOLS.has(activeTool) && <WallPreview preview={wallPreview} />}
        </Group>

        {/* Marquee selection rectangle — drawn while drag-selecting. */}
        {marqueeRect && (marqueeRect.w > 0 || marqueeRect.h > 0) && (
          <Group>
            <Rect
              x={marqueeRect.x}
              y={marqueeRect.y}
              width={marqueeRect.w}
              height={marqueeRect.h}
              fill="rgba(96,165,250,0.10)"
              stroke="rgba(96,165,250,0.85)"
              strokeWidth={1.5}
              dash={[6, 4]}
              listening={false}
            />
          </Group>
        )}


        {/* Guard cones — GM only.
            Where a sentry is looking, how far it can see, and what it currently
            believes. Colour is the awareness ladder from detection.js: teal for
            unaware, amber once it has heard something, red once it has seen you.
            Drawn UNDER the tokens so a guard's own art is never tinted by it. */}
        {!isPlayer && guardCones.length > 0 && (
          <Group listening={false}>
            {guardCones.map((c) => {
              const tone = c.awareness === 'alerted' ? '#ef4444'
                : c.awareness === 'suspicious' ? '#f59e0b' : '#38bdf8';
              // Light enough to read the map THROUGH — this is an overlay on the
              // board the GM is working on, not a region they want painted over.
              const fillA = c.awareness === 'unaware' ? 0.07 : 0.13;
              return (
                <Group
                  key={c.key}
                  listening={false}
                  // Clipped to what this guard can really see. Konva takes the
                  // path in the layer's own coordinates, which is the same space
                  // the polygon was computed in.
                  clipFunc={c.poly.length >= 6 ? (ctx) => {
                    ctx.beginPath();
                    ctx.moveTo(c.poly[0], c.poly[1]);
                    for (let i = 2; i < c.poly.length; i += 2) ctx.lineTo(c.poly[i], c.poly[i + 1]);
                    ctx.closePath();
                  } : undefined}
                >
                  {/* Konva measures rotation from due EAST and sweeps clockwise;
                      `facing` is degrees clockwise from NORTH, so the wedge is
                      turned back a quarter turn and then half its own width to
                      sit centred on the heading. */}
                  <Wedge
                    x={c.cx}
                    y={c.cy}
                    radius={c.radius}
                    angle={c.arc}
                    // An all-round sense is a full circle; Konva draws that from
                    // any rotation, so the heading is simply not used.
                    rotation={c.arc >= 360 ? 0 : c.facing - 90 - c.arc / 2}
                    fill={tone}
                    opacity={fillA}
                    stroke={tone}
                    strokeWidth={1.5}
                    strokeOpacity={0.7}
                    // Dashed for blindsight and tremorsense: they are not sight,
                    // and the edge says so without spending a second colour.
                    dash={c.sensed ? [7, 5] : undefined}
                    listening={false}
                  />
                </Group>
              );
            })}
          </Group>
        )}

        {/* Lights — GM-only visual indicators; players see the lighting effect via FOW, not these circles */}
        {!isPlayer && (
          <Group>
            {lights.map(l => <LightShape key={l.id} light={l} />)}
            {/* Token-attached lights */}
            {tokens.filter(t => (Number(t.token_light_bright) || 0) > 0 || (Number(t.token_light_dim) || 0) > 0).map(t => {
              const sz = tokenFootprint(t);
              const cx = offsetX + Number(t.grid_col) * gridSize + (sz.gridW * gridSize) / 2;
              const cy = offsetY + Number(t.grid_row) * gridSize + (sz.gridH * gridSize) / 2;
              const pxPerFt = gridSize / FEET_PER_SQUARE;
              const fakeLight = {
                x: cx, y: cy,
                bright_radius: (Number(t.token_light_bright) || 0) * pxPerFt,
                dim_radius: (Number(t.token_light_dim) || 0) * pxPerFt,
                color: t.token_light_color || '#fbbf24',
              };
              return <LightShape key={`tl-${t.id}`} light={fakeLight} />;
            })}
            {LIGHT_DRAW_TOOLS.has(activeTool) && <LightPreview preview={lightPreview} gridSize={gridSize} />}
          </Group>
        )}

        {/* Magical Darkness / Heavy Fog zones — GM-only visual indicators.
            Players experience these via the fog canvas re-fill step.
            WATER is deliberately absent here: its indicator is drawn on the
            overlay layer instead. See the note there. */}
        {!isPlayer && (
          <Group>
            {resolvedDarkness.map(dz =>
              dz.zone_type === 'heavy-fog' ? <FogZone key={dz.id} dz={dz} /> :
              dz.zone_type === 'water'     ? null :
                                             <DarknessZone key={dz.id} dz={dz} />
            )}
            {DARKNESS_DRAW_TOOLS.has(activeTool) && (
              <DarknessPreview
                preview={darknessPreview}
                gridSize={gridSize}
                isFog={activeTool === 'heavy-fog' || activeTool === 'fog-polygon'}
                isWater={activeTool === 'water-circle' || activeTool === 'water-polygon'}
              />
            )}
          </Group>
        )}

        {/* Spawn point marker — GM-only. When the map's spawn point has
            a radius, render the bubble that new tokens scatter into. */}
        {!isPlayer && spawnPoint != null && (
          <Group>
            {(() => {
              const sx = offsetX + spawnPoint.col * gridSize;
              const sy = offsetY + spawnPoint.row * gridSize;
              const r = Number(spawnPoint.radius) || 0;
              const bubble = r > 0 ? r * gridSize : gridSize * 0.45;
              return (
                <Group x={sx} y={sy}>
                  <Circle radius={bubble} stroke="#22c55e" strokeWidth={2} dash={[6, 4]} fill="#22c55e" fillOpacity={r > 0 ? 0.08 : 0.15} />
                  <Circle radius={5} fill="#22c55e" />
                  <Text text="⚑" fontSize={gridSize * 0.4} fill="#22c55e" x={4} y={-gridSize * 0.45} />
                </Group>
              );
            })()}
          </Group>
        )}

        {/* Patrol routes — GM-only.
            Drawn as the line the token will actually walk, with numbered stops,
            because a waypoint list you cannot see is a waypoint list you cannot
            correct. The route being drawn right now is brighter than the saved
            ones and dashed, so the two never read as the same thing. */}
        {!isPlayer && patrolRoutes.length > 0 && (
          <Group listening={false}>
            {patrolRoutes.map((route) => {
              const pts = (route.points || []).flatMap((p) => [
                offsetX + (Number(p.col) + 0.5) * gridSize,
                offsetY + (Number(p.row) + 0.5) * gridSize,
              ]);
              if (pts.length < 2) return null;
              const colour = route.draft ? '#38bdf8' : (route.active ? '#34d399' : '#94a3b8');
              return (
                <Group key={`patrol-${route.tokenId}${route.draft ? '-draft' : ''}`}>
                  <Line
                    points={route.draft ? pts : [...pts, pts[0], pts[1]]}
                    stroke={colour}
                    strokeWidth={Math.max(2, gridSize * 0.06)}
                    dash={route.draft ? [gridSize * 0.3, gridSize * 0.2] : [gridSize * 0.5, gridSize * 0.25]}
                    opacity={route.draft ? 0.95 : 0.55}
                    lineJoin="round"
                    lineCap="round"
                  />
                  {(route.points || []).map((p, i) => (
                    <Group key={i}
                      x={offsetX + (Number(p.col) + 0.5) * gridSize}
                      y={offsetY + (Number(p.row) + 0.5) * gridSize}>
                      <Circle radius={gridSize * 0.22} fill={colour} opacity={route.draft ? 0.9 : 0.6} />
                      <Text
                        text={String(i + 1)}
                        fontSize={gridSize * 0.26}
                        fontStyle="bold"
                        fill="#0b1020"
                        width={gridSize * 0.6}
                        align="center"
                        offsetX={gridSize * 0.3}
                        offsetY={gridSize * 0.13}
                        listening={false}
                      />
                    </Group>
                  ))}
                </Group>
              );
            })}
          </Group>
        )}

        {/* Named spawn points — GM-only. Cyan to distinguish from the
            map's default green spawn glyph; label rendered above. The
            GM can drag the centre dot to relocate; on release the
            grid-snapped col/row goes back to the parent. */}
        {!isPlayer && (
          <Group>
            {spawnPoints.map((sp) => {
              const isDragging = spawnDragVis && spawnDragVis.id === sp.id;
              const dragDx = isDragging ? (spawnDragVis.col - Number(sp.grid_col)) : 0;
              const dragDy = isDragging ? (spawnDragVis.row - Number(sp.grid_row)) : 0;
              const col = Number(sp.grid_col) + dragDx;
              const row = Number(sp.grid_row) + dragDy;
              const sx = offsetX + col * gridSize;
              const sy = offsetY + row * gridSize;
              const label = sp.label || 'Spawn';
              const r = Number(sp.radius) || 0;
              const poly = Array.isArray(sp.shape_points) ? sp.shape_points : null;
              const bubble = r > 0 ? r * gridSize : gridSize * 0.4;
              // Polygon mode: render the closed shape with the centre
              // dot at the stored anchor (which the GM is dragging).
              if (poly && poly.length >= 3) {
                // Polygon points are stored absolute; we offset them
                // from the dragged centre by the original anchor so a
                // drag relocates the whole shape.
                const flat = [];
                for (const p of poly) {
                  const px = offsetX + (Number(p.col) + dragDx) * gridSize;
                  const py = offsetY + (Number(p.row) + dragDy) * gridSize;
                  flat.push(px, py);
                }
                // Centroid for the label position.
                let lx = 0, ly = 0;
                for (let i = 0; i < flat.length; i += 2) { lx += flat[i]; ly += flat[i + 1]; }
                lx /= (flat.length / 2); ly /= (flat.length / 2);
                const labelW = Math.max(gridSize * 1.6, gridSize * 2);
                return (
                  <Group key={sp.id} opacity={isDragging ? 0.7 : 1}>
                    <Line
                      points={flat}
                      closed
                      stroke="#06b6d4"
                      strokeWidth={2}
                      dash={[6, 4]}
                      // Konva's `Line` ignores `fillOpacity`, so encode
                      // the alpha channel directly. 0.5 keeps the map
                      // visible underneath while clearly marking the
                      // zone.
                      fill="rgba(6,182,212,0.5)"
                    />
                    <Circle x={sx} y={sy} radius={4} fill="#06b6d4" />
                    <Text
                      text={label}
                      fontSize={Math.max(11, gridSize * 0.28)}
                      fill="#fff"
                      stroke="#0e7490"
                      strokeWidth={2.4}
                      fillAfterStrokeEnabled
                      x={lx - labelW / 2}
                      y={ly - gridSize * 0.2}
                      width={labelW}
                      align="center"
                    />
                  </Group>
                );
              }
              // Legacy bubble (radius) / single-tile glyph.
              const labelW = Math.max(gridSize * 1.2, bubble * 2);
              return (
                <Group key={sp.id} x={sx} y={sy} opacity={isDragging ? 0.7 : 1}>
                  <Circle radius={bubble} stroke="#06b6d4" strokeWidth={2} dash={[6, 4]} fill={r > 0 ? "rgba(6,182,212,0.5)" : "rgba(6,182,212,0.5)"} />
                  <Circle radius={4} fill="#06b6d4" />
                  <Text
                    text={label}
                    fontSize={Math.max(11, gridSize * 0.28)}
                    fill="#fff"
                    stroke="#0e7490"
                    strokeWidth={2.4}
                    fillAfterStrokeEnabled
                    x={-labelW / 2}
                    y={-(bubble + gridSize * 0.35)}
                    width={labelW}
                    align="center"
                  />
                </Group>
              );
            })}
            {/* In-progress polygon preview while the GM places vertices
                with the spawn-named tool. */}
            {spawnPolyPreview && spawnPolyPreview.points.length >= 2 && (() => {
              const pts = spawnPolyPreview.points;
              const cur = [...pts];
              if (spawnPolyPreview.cursorX != null) {
                cur.push(spawnPolyPreview.cursorX, spawnPolyPreview.cursorY);
              }
              const dots = [];
              for (let i = 0; i < pts.length; i += 2) {
                dots.push(<Circle key={i} x={pts[i]} y={pts[i + 1]} radius={3.5} fill="#06b6d4" />);
              }
              return (
                <Group>
                  <Line
                    points={cur}
                    closed={pts.length >= 6}
                    stroke="#06b6d4"
                    strokeWidth={1.5}
                    dash={[5, 4]}
                    fill={pts.length >= 6 ? "rgba(6,182,212,0.5)" : null}
                  />
                  {dots}
                </Group>
              );
            })()}
          </Group>
        )}

        {/* Portals — GM-only glyphs, drawn under tokens so a creature standing
            on one covers it the way it would cover any other floor marking.
            Players get no ring at all: the gate is whatever the map art shows,
            and a purple overlay on top of it just gives the trick away. The
            pad stays clickable for them regardless — the hit test is by square
            and owes nothing to what is drawn. */}
        {!isPlayer && (portals.length > 0 || portalPendingAnchor) && (
          <Group>
            {portals.map((p) => {
              const cx = offsetX + (Number(p.grid_col) + 0.5) * gridSize;
              const cy = offsetY + (Number(p.grid_row) + 0.5) * gridSize;
              const r = gridSize * 0.42;
              const color = p.color || '#a855f7';
              // Ghosted for the GM when players can't see it; dashed when this
              // end doesn't send, which is what a one-way exit looks like.
              const ghost = !!p.hidden;
              const inert = !p.exit_enabled;
              return (
                <Group key={p.id} x={cx} y={cy} opacity={ghost ? 0.45 : 1} listening={false}>
                  <Circle radius={r} fill={color} opacity={0.16} />
                  <Circle
                    radius={r}
                    stroke={color}
                    strokeWidth={2}
                    dash={inert ? [5, 4] : undefined}
                    shadowColor={color}
                    shadowBlur={ghost ? 0 : 10}
                    shadowOpacity={0.7}
                  />
                  <Circle radius={r * 0.62} stroke={color} strokeWidth={1.2} opacity={0.75} dash={[4, 3]} />
                  <Circle radius={r * 0.24} fill={color} opacity={0.85} />
                  {p.label ? (
                    <Text
                      text={p.label}
                      fontSize={Math.max(10, gridSize * 0.24)}
                      fill={color}
                      align="center"
                      width={gridSize * 2}
                      offsetX={gridSize}
                      y={-r - Math.max(12, gridSize * 0.3)}
                    />
                  ) : null}
                </Group>
              );
            })}

            {/* First half of a pair that's waiting on its second click. */}
            {portalPendingAnchor && (
              <Group
                x={offsetX + (Number(portalPendingAnchor.col) + 0.5) * gridSize}
                y={offsetY + (Number(portalPendingAnchor.row) + 0.5) * gridSize}
                listening={false}
              >
                <Circle radius={gridSize * 0.42} stroke="#e879f9" strokeWidth={2} dash={[6, 5]} />
                <Text
                  text="pair pending"
                  fontSize={Math.max(9, gridSize * 0.2)}
                  fill="#e879f9"
                  align="center"
                  width={gridSize * 2}
                  offsetX={gridSize}
                  y={gridSize * 0.46}
                />
              </Group>
            )}
          </Group>
        )}

        {/* Ships — the active deck drawn in place on the map. The Group's
            pivot (centre + offset) is deliberately identical to the maths in
            utils/ships.js, so a token's projected world position lands exactly
            where the art puts that deck square. Change one, change both.

            Sits above terrain and below tokens: crew stand on the deck. */}
        <Group>
          {ships.map((s) => {
            // The deck this viewer INTERACTS with — helm, grid, selection
            // chrome, hit tests. For a player aboard it follows their own
            // token; for everyone else it's the ship's active deck.
            const deck = activeDeckByShip.get(s.id);
            if (!deck) return null;
            // ...and the stack of decks to actually draw, bottom-up, each with
            // its own focus. See deckLayersByShip.
            const layers = deckLayersByShip.get(s.id) || [];
            if (!layers.some(l => shipImages[l.deck.image_path])) return null;

            const w = Number(deck.grid_cols) * gridSize;
            const h = Number(deck.grid_rows) * gridSize;
            // Every deck rotates about the REFERENCE deck's centre, and sits at
            // its own alignment offset from the ship anchor. Without both, decks
            // of different sizes pin to the same corner and the hull jumps as
            // the GM flicks levels. Must match utils/ships.js exactly.
            const ref = shipReferenceDeck(s.decks) || deck;
            // Includes the reference deck's own offset — see shipPivot in
            // utils/ships.js. All four copies of this must agree.
            const pivX = offsetX + (Number(s.grid_col) + Number(ref.offset_col || 0)) * gridSize + (Number(ref.grid_cols) * gridSize) / 2;
            const pivY = offsetY + (Number(s.grid_row) + Number(ref.offset_row || 0)) * gridSize + (Number(ref.grid_rows) * gridSize) / 2;
            // Deck's top-left expressed relative to the pivot, since the Group
            // is positioned at the pivot and children are drawn from it.
            const dx = offsetX + (Number(s.grid_col) + Number(deck.offset_col || 0)) * gridSize - pivX;
            const dy = offsetY + (Number(s.grid_row) + Number(deck.offset_row || 0)) * gridSize - pivY;
            const rot = Number(s.rotation) || 0;
            // Selection chrome doubles as the steering UI — it carries the
            // rotate handle. The GM gets it on whatever they've selected; a
            // player gets it only on a ship they're actually helming, which is
            // the same ship PlayerView selects for them. hitShipHandle keys off
            // selectedShipId alone, so without this a helmsman would have an
            // invisible handle to find by feel.
            const selected = selectedShipId === s.id
              && (!isPlayer || !!helmTokenByShip.get(s.id)?.mine);
            // Air envelope reach, feet -> map pixels. 0 (or no library row)
            // means the ship carries no envelope and nothing is drawn.
            const bubblePx = (Number(s.air_bubble_ft) || 0) * (gridSize / FEET_PER_SQUARE);

            // The deck's own grid. Drawn inside the rotated Group so it turns
            // with the hull — this is the "self-contained little map with its
            // own grid" part, and because the lines are one gridSize apart it
            // stays at the host map's 5ft scale however the ship is angled.
            const deckGrid = [];
            for (let c = 0; c <= Number(deck.grid_cols); c++) {
              deckGrid.push(
                <Line key={`sv${c}`} points={[dx + c * gridSize, dy, dx + c * gridSize, dy + h]}
                  stroke="rgba(255,255,255,0.18)" strokeWidth={0.7} listening={false} />
              );
            }
            for (let r = 0; r <= Number(deck.grid_rows); r++) {
              deckGrid.push(
                <Line key={`sh${r}`} points={[dx, dy + r * gridSize, dx + w, dy + r * gridSize]}
                  stroke="rgba(255,255,255,0.18)" strokeWidth={0.7} listening={false} />
              );
            }

            return (
              <Group
                key={s.id}
                x={pivX}
                y={pivY}
                rotation={rot}
              >
                {/* Air envelope. Drawn first so it sits under the hull, and
                    inside the rotated Group so the oval turns with the ship.
                    Centred on the REFERENCE deck's footprint rather than the
                    active one — the envelope belongs to the ship, so it must
                    not resize when the GM flicks to a smaller lower deck.
                    air_bubble_ft is the reach BEYOND the hull, which is what
                    makes it oval on an oblong hull rather than a circle. */}
                {bubblePx > 0 && (() => {
                  // Centre the envelope on the SHIP, not on the reference deck.
                  //
                  // It used to be drawn at the group origin — the reference
                  // deck's centre — with radii from that deck's size. Decks are
                  // different sizes and carry their own alignment offsets, so on
                  // any hull whose levels aren't concentric the oval sat off to
                  // one side of the ship it was supposed to surround.
                  //
                  // The union of every deck box IS the hull's extent, so take
                  // its centre and half-extents and grow them by the envelope's
                  // reach. All in parent space, i.e. relative to the pivot.
                  const boxes = (s.decks || []).map(d => {
                    const bw = Number(d.grid_cols) * gridSize;
                    const bh = Number(d.grid_rows) * gridSize;
                    const bx = offsetX + (Number(s.grid_col) + Number(d.offset_col || 0)) * gridSize - pivX;
                    const by = offsetY + (Number(s.grid_row) + Number(d.offset_row || 0)) * gridSize - pivY;
                    return { x1: bx, y1: by, x2: bx + bw, y2: by + bh };
                  });
                  if (!boxes.length) return null;
                  const x1 = Math.min(...boxes.map(b => b.x1));
                  const x2 = Math.max(...boxes.map(b => b.x2));
                  const y1 = Math.min(...boxes.map(b => b.y1));
                  const y2 = Math.max(...boxes.map(b => b.y2));
                  return (
                    <Ellipse
                      x={(x1 + x2) / 2} y={(y1 + y2) / 2}
                      radiusX={(x2 - x1) / 2 + bubblePx}
                      radiusY={(y2 - y1) / 2 + bubblePx}
                      fill="rgba(125,211,252,0.10)"
                      listening={false}
                    />
                  );
                })()}
                {/* Every visible deck, floor first. Each sits at its own
                    alignment offset, so a small upper deck lands where the GM
                    aligned it rather than sharing the main deck's corner. */}
                {layers.map(({ deck: ld, blur }) => {
                  const limg = shipImages[ld.image_path];
                  if (!limg) return null;
                  const lw = Number(ld.grid_cols) * gridSize;
                  const lh = Number(ld.grid_rows) * gridSize;
                  const lx = offsetX + (Number(s.grid_col) + Number(ld.offset_col || 0)) * gridSize - pivX;
                  const ly = offsetY + (Number(s.grid_row) + Number(ld.offset_row || 0)) * gridSize - pivY;
                  return (
                    <DeckArt
                      key={ld.id ?? ld.deck_index}
                      img={limg}
                      x={lx} y={ly} w={lw} h={lh}
                      // In MAP pixels — see DeckArt, which caches at pixelRatio 1
                      // so the radius doesn't have to be corrected for zoom.
                      blur={blur}
                    />
                  );
                })}
                {/* Grid for the deck you're actually standing on only —
                    three overlaid grids on a stacked hull is just noise. */}
                <Group listening={false}>{deckGrid}</Group>

                {/* The spelljamming helm. Drawn under the stairs so a hatch on
                    the same square still reads, and lit when the viewer's own
                    token is standing on it — that lit state is the only cue a
                    player gets that the ship is now theirs to move. */}
                {deck.helm && deck.helm.col != null && (() => {
                  const manned = helmTokenByShip.get(s.id);
                  const mine = manned && manned.mine;
                  return (
                    <Group
                      x={dx + Number(deck.helm.col) * gridSize}
                      y={dy + Number(deck.helm.row) * gridSize}
                      listening={false}
                    >
                      {/* The helm's own size. Drawn freehand in the builder, so
                          it is a rectangle of any dimensions rather than one
                          square; older ships have no w/h and stay 1x1. */}
                      <Rect
                        width={(Number(deck.helm.w) > 0 ? Number(deck.helm.w) : 1) * gridSize}
                        height={(Number(deck.helm.h) > 0 ? Number(deck.helm.h) : 1) * gridSize}
                        fill={mine ? 'rgba(167,139,250,0.34)' : manned ? 'rgba(167,139,250,0.20)' : 'rgba(167,139,250,0.12)'}
                        stroke={mine ? '#a78bfa' : 'rgba(167,139,250,0.5)'}
                        strokeWidth={mine ? 2.5 / scale : 1.5 / scale}
                        cornerRadius={3}
                      />
                      {/* Counter-rotated, same as the stairs glyph: a wheel on
                          its side reads as a mistake rather than as a wheel.
                          Sized off the SHORTER side so it still fits a wide,
                          shallow wheel. */}
                      <Text
                        x={0}
                        y={((Number(deck.helm.h) > 0 ? Number(deck.helm.h) : 1) * gridSize) / 2 - gridSize * 0.28}
                        width={(Number(deck.helm.w) > 0 ? Number(deck.helm.w) : 1) * gridSize}
                        align="center"
                        text="⎈"
                        fontSize={Math.min(
                          (Number(deck.helm.w) > 0 ? Number(deck.helm.w) : 1),
                          (Number(deck.helm.h) > 0 ? Number(deck.helm.h) : 1)
                        ) * gridSize * 0.5}
                        fill={mine ? '#ede9fe' : 'rgba(237,233,254,0.75)'}
                        rotation={-rot}
                        listening={false}
                      />
                    </Group>
                  );
                })()}

                {/* Inter-deck transitions — stairs, ladders, hatches — are
                    deliberately NOT drawn. The stairs are part of the deck
                    artwork, so a highlighted box and a glyph on top of them just
                    covered up the art that already says "stairs here".
                    They remain fully clickable: the hit test is `hitShipTransition`
                    in the DOM mousedown handler, which works off deck-local
                    coords and never consulted these nodes (the whole Konva stage
                    is listening={false}). Squares are set in the ship builder,
                    which is where you can see where they are. */}

                {selected && (
                  <>
                    <Rect x={dx} y={dy} width={w} height={h} stroke="#38bdf8" strokeWidth={2 / scale} dash={[6 / scale, 4 / scale]} listening={false} />
                    {/* Rotate handle — a stub off the bow. Sized in screen
                        pixels so it stays grabbable at wildspace zoom. */}
                    <Line
                      points={[dx + w / 2, dy, dx + w / 2, dy - Math.max(h * 0.18, 10 / scale)]}
                      stroke="#38bdf8" strokeWidth={1.5 / scale} listening={false}
                    />
                    <Circle
                      x={dx + w / 2} y={dy - Math.max(h * 0.18, 10 / scale)}
                      radius={6 / scale}
                      fill="#38bdf8" listening={false}
                    />
                  </>
                )}
              </Group>
            );
          })}

          {/* GM deck-switch buttons. Drawn OUTSIDE the rotated Group and in
              screen-scaled units, so they stay upright, put and legible
              however the hull is turned or the map is zoomed. Geometry must
              match hitShipDeckButton exactly. */}
          {!isPlayer && ships.map((s) => {
            // Same order as hitShipDeckButton: top of the hull at the top of the
            // column, sails excluded, and slot 0 reserved for the all-layers
            // toggle. Must stay in step with it.
            const decks = (s.decks || []).filter(d => !d.is_sails).slice().sort((a, b) => b.deck_index - a.deck_index);
            if (decks.length < 2) return null;
            // Reference deck, matching hitShipDeckButton — the buttons must sit
            // still when the active deck changes.
            const ref = shipReferenceDeck(s.decks);
            if (!ref) return null;
            const size = SHIP_DECK_BTN / scale;
            const gap = SHIP_DECK_GAP / scale;
            const slots = decks.length + 1;
            // Same anchor as hitShipDeckButton — these two must not drift.
            const anchor = shipButtonAnchor({
              ship: s, decks: s.decks || [], refDeck: ref,
              gs: gridSize, ox: offsetX, oy: offsetY, slots, size, gap,
            });
            if (!anchor) return null;
            const { bx, by } = anchor;
            // This hull's own all-layers state — the button lights up for the
            // ship it belongs to, not for every ship on the map.
            const allOn = gmShowsAllDecks(s.id);
            return (
              <Group key={`decks-${s.id}`} listening={false}>
                {/* Slot 0: view every layer at once, as a player sees a ship
                    they aren't aboard. */}
                <Group key={`all-${s.id}`} x={bx} y={by}>
                  <Rect
                    width={size} height={size}
                    fill={allOn ? 'rgba(56,189,248,0.9)' : 'rgba(17,24,39,0.85)'}
                    stroke={allOn ? '#7dd3fc' : 'rgba(148,163,184,0.7)'}
                    strokeWidth={1 / scale}
                    cornerRadius={3 / scale}
                  />
                  <Text
                    width={size} y={size * 0.22}
                    align="center"
                    text="≡"
                    fontSize={size * 0.55}
                    fontStyle="bold"
                    fill={allOn ? '#0b1220' : '#e5e7eb'}
                  />
                </Group>
                {decks.map((d, i) => {
                  const active = !allOn && d.deck_index === (s.active_deck ?? 0);
                  return (
                    <Group key={d.id} x={bx} y={by + (i + 1) * (size + gap)}>
                      <Rect
                        width={size} height={size}
                        fill={active ? 'rgba(56,189,248,0.9)' : 'rgba(17,24,39,0.85)'}
                        stroke={active ? '#7dd3fc' : 'rgba(148,163,184,0.7)'}
                        strokeWidth={1 / scale}
                        cornerRadius={3 / scale}
                      />
                      <Text
                        width={size} y={size * 0.22}
                        align="center"
                        text={String(d.deck_index + 1)}
                        fontSize={size * 0.55}
                        fontStyle="bold"
                        fill={active ? '#0b1220' : '#e5e7eb'}
                      />
                    </Group>
                  );
                })}
              </Group>
            );
          })}

          {/* Ship movement readout — mirrors the token ruler: distance
              travelled this drag, and the class speed it's spending. */}
          {shipMeasure && (() => {
            const k = 1 / Math.max(scale, 0.01);
            const x0 = offsetX + shipMeasure.fromCol * gridSize;
            const y0 = offsetY + shipMeasure.fromRow * gridSize;
            const x1 = offsetX + shipMeasure.toCol * gridSize;
            const y1 = offsetY + shipMeasure.toRow * gridSize;
            const ft = pxToFt(Math.hypot(x1 - x0, y1 - y0), gridSize);
            const over = shipMeasure.speed > 0 && ft > shipMeasure.speed;
            const label = shipMeasure.speed > 0 ? `${ft} / ${shipMeasure.speed} ft` : `${ft} ft`;
            const col = over ? '#f87171' : '#7dd3fc';
            return (
              <Group listening={false}>
                <Line points={[x0, y0, x1, y1]} stroke={col} strokeWidth={2.5 * k} dash={[8 * k, 5 * k]} />
                <Circle x={x0} y={y0} radius={5 * k} fill={col} />
                <Rect x={x1 - 46 * k} y={y1 - 32 * k} width={92 * k} height={22 * k}
                  fill="rgba(0,0,0,0.75)" cornerRadius={4 * k} />
                <Text x={x1 - 46 * k} y={y1 - 28 * k} width={92 * k} align="center"
                  text={label} fill={col} fontSize={13 * k} fontStyle="bold" />
              </Group>
            );
          })()}
        </Group>


        {/* The staged tile — GM only, and not yet anyone else's business.
            Drawn ABOVE the laid tiles so it can be lined up against them, at
            reduced opacity with a gold dashed border so it never reads as
            already placed. It exists purely in this GM's client: nothing has
            been sent, so the players' boards are untouched until Lay it down.

            Draggable, snapping to whole squares on release — a tile map is a
            lattice, and "nearly aligned" is a seam the party can see. */}
        {!isPlayer && pendingTile && stagedTile && (() => {
          const img = tileImages[pendingTile.image_path];
          const wSq = Number(pendingTile.grid_w) || 2;
          const hSq = Number(pendingTile.grid_h) || 2;
          const w = wSq * gridSize;
          const h = hSq * gridSize;
          const x = offsetX + Number(stagedTile.col) * gridSize;
          const y = offsetY + Number(stagedTile.row) * gridSize;
          return (
            <Group
              x={x + w / 2}
              y={y + h / 2}
              offsetX={w / 2}
              offsetY={h / 2}
              draggable
              onDragEnd={(e) => {
                // The node carries its centre (offset is half its size), so
                // the top-left corner — which is what col/row mean — is the
                // dragged centre less half the tile.
                const gs = gridSize;
                const col = Math.round((e.target.x() - w / 2 - offsetX) / gs);
                const row = Math.round((e.target.y() - h / 2 - offsetY) / gs);
                // Snap the node itself as well as reporting upward. Konva keeps
                // whatever position the drag ended on, so without this the
                // ghost sits on the un-snapped pixel until React happens to
                // re-render it — and if the snapped value is unchanged, that
                // re-render never comes.
                e.target.position({
                  x: offsetX + col * gs + w / 2,
                  y: offsetY + row * gs + h / 2,
                });
                onTileStageRef.current?.(col, row);
              }}
            >
              {img && (
                <KonvaImage
                  image={img}
                  width={w}
                  height={h}
                  opacity={0.72}
                  rotation={Number(tileRotation) || 0}
                  // Rotation is about the tile's own centre, matching how it
                  // will be drawn once laid.
                  x={w / 2}
                  y={h / 2}
                  offsetX={w / 2}
                  offsetY={h / 2}
                />
              )}
              <Rect
                width={w}
                height={h}
                stroke="#c9a84c"
                strokeWidth={2}
                dash={[8, 4]}
                fill="rgba(201,168,76,0.10)"
              />
            </Group>
          );
        })()}

        {/* Map terrain — placed pieces from the global library. Below
            tokens so a creature standing on a tree renders on top. The
            GM sees pieces flagged hide_until_revealed (until revealed)
            with reduced opacity + a dashed border; players never see
            them at all (filtered server-side). The Group rotates
            around the piece's visual centre (offset = w/2, h/2). */}
        <Group>
          {terrain.map((t) => {
            const raw = terrainImages[t.lib_image_path];
            if (!raw) return null;
            // The placement's own colour, when the GM set one. Konva takes a
            // canvas as an image source, so the tinted copy drops straight in.
            const img = t.tint ? tintedTerrainImage(raw, t.lib_image_path, t.tint) : raw;
            const x = offsetX + Number(t.grid_col) * gridSize;
            const y = offsetY + Number(t.grid_row) * gridSize;
            const w = Number(t.width)  * gridSize;
            const h = Number(t.height) * gridSize;
            const rot = Number(t.rotation) || 0;
            const ghosted = !isPlayer && terrainHidden(t);
            const selected = !isPlayer && selectedTerrainId === t.id;
            const resizing = selected && resizingTerrainId === t.id;
            // Scale the rotate handle's stub length with the piece's
            // visible size so it shrinks at zoom-out instead of
            // floating off in screen space. Floor at 8px so it stays
            // grabbable on tiny pieces.
            const rotOffsetPx = Math.max(h * 0.18, 8);
            return (
              <Group
                key={t.id}
                x={x + w / 2}
                y={y + h / 2}
                offsetX={w / 2}
                offsetY={h / 2}
                rotation={rot}
                // A dormant piece is dimmed for everyone, not just the GM —
                // shutting a gate is a thing that happens in the world, and the
                // players have to be able to see that it happened.
                opacity={ghosted ? 0.45 : (t.is_active === false ? 0.5 : 1)}
              >
                {/* Markers read as tokens: the art is clipped to a disc with
                    a ring round it, like a creature's. The disc is inscribed
                    in the piece's box (diameter = the shorter side) so a
                    non-square marker still draws a true circle rather than a
                    stadium, and it stays centred on the piece the GM placed.
                    Scenery is drawn flat, exactly as before. */}
                {t.is_marker ? (() => {
                  const d = Math.min(w, h);
                  return (
                    <Group x={(w - d) / 2} y={(h - d) / 2}>
                      <KonvaImage image={img} width={d} height={d} cornerRadius={d / 2} />
                      <Circle
                        x={d / 2} y={d / 2} radius={d / 2}
                        stroke="rgba(15,18,28,0.85)"
                        strokeWidth={Math.max(d * 0.045, 1.5)}
                        fill="transparent"
                      />
                      <Circle
                        x={d / 2} y={d / 2} radius={d / 2}
                        stroke="rgba(255,255,255,0.35)"
                        strokeWidth={Math.max(d * 0.015, 0.6)}
                        fill="transparent"
                      />
                    </Group>
                  );
                })() : (
                  <KonvaImage image={img} width={w} height={h} />
                )}
                {ghosted && (
                  <Rect
                    width={w}
                    height={h}
                    stroke="#a78bfa"
                    strokeWidth={1.5}
                    dash={[6, 4]}
                    fill="rgba(167,139,250,0.06)"
                  />
                )}
                {selected && (t.is_marker ? (
                  <Circle
                    x={w / 2}
                    y={h / 2}
                    radius={Math.min(w, h) / 2}
                    stroke="#06b6d4"
                    strokeWidth={1.5}
                    dash={[5, 3]}
                  />
                ) : (
                  <Rect
                    width={w}
                    height={h}
                    stroke="#06b6d4"
                    strokeWidth={1.5}
                    dash={[5, 3]}
                  />
                ))}
                {/* Resize + rotate handles — visual only; the actual
                    hit-test runs in the DOM mousedown handler since
                    the Stage has listening={false}.
                    Shown only in resize mode, not on selection: their hit
                    boxes extend past the piece on three sides, so arming them
                    for every selected piece meant a marker quietly swallowed
                    clicks around its own edge. */}
                {resizing && (
                  <>
                    <Line
                      points={[w / 2, 0, w / 2, -rotOffsetPx]}
                      stroke="#06b6d4"
                      strokeWidth={1.5 / scale}
                    />
                    <Circle x={w / 2} y={-rotOffsetPx} radius={6} fill="#22d3ee" stroke="#fff" strokeWidth={1.5} />
                    <Circle x={w}     y={h}     radius={6} fill="#06b6d4" stroke="#fff" strokeWidth={1.5} />
                    <Circle x={w}     y={h / 2} radius={5} fill="#06b6d4" stroke="#fff" strokeWidth={1.5} />
                    <Circle x={w / 2} y={h}     radius={5} fill="#06b6d4" stroke="#fff" strokeWidth={1.5} />
                  </>
                )}
              </Group>
            );
          })}
          {/* GM-only status chips: which pieces are pinned down, and which are
              standing off the board in 3D. Drawn in a second pass rather than
              inside each piece's Group because that Group carries the piece's
              rotation, and a chip that turns with a rotated piece ends up
              upside down and unreadable. Positioned from the piece's centre so
              rotation doesn't move it. */}
          {!isPlayer && terrain.map((t) => {
            const elevFt = Number(t.elevation) || 0;
            if (!t.locked && !elevFt && t.is_active !== false) return null;
            if (!terrainImages[t.lib_image_path]) return null;
            const cx = offsetX + (Number(t.grid_col) + Number(t.width) / 2) * gridSize;
            const cy = offsetY + (Number(t.grid_row) + Number(t.height) / 2) * gridSize;
            const top = offsetY + Number(t.grid_row) * gridSize;
            const chips = [];
            if (t.locked) chips.push('🔒');
            if (t.is_active === false) chips.push('dormant');
            if (elevFt) chips.push(`${elevFt > 0 ? '▲' : '▼'}${Math.abs(elevFt)} ft`);
            const text = chips.join('  ');
            const cw = Math.max(22, text.length * 7 + 10);
            return (
              <Group key={`tchip-${t.id}`} x={cx - cw / 2} y={top - 18} listening={false} opacity={0.85}>
                <Rect width={cw} height={15} fill="rgba(8,10,18,0.75)" cornerRadius={4} />
                <Text
                  width={cw} height={15} align="center" verticalAlign="middle"
                  text={text} fill="#9ec5ff" fontSize={10} fontStyle="bold"
                />
              </Group>
            );
          })}
        </Group>

        {/* Stairs between storeys.
            Drawn like the ships' inter-deck transitions: a marked square with
            an arrow saying which way it goes, so a floor plan reads as a
            building rather than as a set of unconnected pictures. */}
        {/* GM only. These are authoring marks — where a staircase has been
            defined — not something the players are meant to be looking at. */}
        <Group visible={!isPlayer}>
          {(!isPlayer ? (levelTransitions || []) : []).map((t, i) => {
            const x = offsetX + Number(t.col) * gridSize;
            const y = offsetY + Number(t.row) * gridSize;
            const w = Math.max(1, Number(t.w) || 1) * gridSize;
            const h = Math.max(1, Number(t.h) || 1) * gridSize;
            return (
              <Group key={`stair-${i}`} x={x} y={y}>
                <Rect
                  width={w} height={h}
                  fill="rgba(56,189,248,0.18)"
                  stroke="#38bdf8"
                  strokeWidth={Math.max(1.5, gridSize * 0.03)}
                  cornerRadius={gridSize * 0.12}
                />
                {/* Treads, so it reads as stairs at a glance rather than as a
                    highlighted square. */}
                {[0.3, 0.5, 0.7].map((f) => (
                  <Line
                    key={f}
                    points={[w * 0.2, h * f, w * 0.8, h * f]}
                    stroke="#7dd3fc"
                    strokeWidth={Math.max(1, gridSize * 0.02)}
                  />
                ))}
                {/* Resize grip, only while the stairs mode is on — otherwise
                    it would sit over the map taking clicks meant for tokens. */}
                {onStairPlace && (
                  <Circle x={w} y={h} radius={6} fill="#38bdf8" stroke="#fff" strokeWidth={1.5} />
                )}
                <Text
                  x={0} y={h * 0.06} width={w} align="center"
                  text={`▲${t.to_level}`}
                  fill="#e0f2fe"
                  fontSize={Math.max(9, gridSize * 0.22)}
                  fontStyle="bold"
                />
              </Group>
            );
          })}
        </Group>

        {stairPreview && stairPreview.w > 0 && (
          <Rect
            x={offsetX + stairPreview.col * gridSize}
            y={offsetY + stairPreview.row * gridSize}
            width={stairPreview.w * gridSize}
            height={stairPreview.h * gridSize}
            fill="rgba(56,189,248,0.20)"
            stroke="#38bdf8"
            strokeWidth={2}
            dash={[6, 4]}
          />
        )}

        {/* Spell templates — GM places and edits them, but the resulting
            shapes (and any plugin-driven elemental overlays) render for
            both GM and players so AOE effects are visible at the table.

            Drawn AFTER the ships and the terrain, not before them.

            An area effect is a thing happening in the room, not part of the
            floor it happens on — and once templates could be anchored to a
            deck, drawing them first meant the deck art painted straight over
            the top. That hid placed templates aboard ship, and worse, hid the
            live preview while the GM was still dragging it out, so they were
            sizing a cone they could not see.

            Still under the tokens and the ink: a creature standing in the
            fire has to stay readable, and a hasty circle round it is the
            thing being pointed at. */}
        <Group>
          {(spellTemplates || []).map(t => {
            // GM-side live-translate during drag — players never see the
            // half-finished position because the move preview is GM state.
            const live = !isPlayer && templateMovePreview && templateMovePreview.id === t.id
              ? { ...t, points: templateMovePreview.points }
              : t;
            return (
              <TemplateShapeWithDecorators
                key={t.id}
                template={live}
                // Selection highlight is a GM affordance for editing — players
                // get the unselected look regardless.
                isSelected={!isPlayer && selectedTemplateId === t.id}
                gridSize={gridSize}
              />
            );
          })}
          {!isPlayer && (TEMPLATE_TOOLS.has(activeTool) || activeTool === 'tpl-erase') && templatePreview && (
            <TemplatePreview preview={templatePreview} gridSize={gridSize} />
          )}
        </Group>

        {/* Freehand ink. Above the map and terrain so it's visible, below
            tokens so it can't hide a combatant. Each stroke carries its
            author's colour, which is what makes "follow my red line" work at
            a table where four people are drawing. */}
        <Group listening={false}>
          {drawings.map((d) => (
            <Line
              key={d.id}
              points={d.points}
              stroke={d.color || '#ef4444'}
              strokeWidth={d.width || 4}
              lineCap="round"
              lineJoin="round"
              tension={0.35}
              opacity={0.9}
              shadowColor="#000"
              shadowBlur={3}
              shadowOpacity={0.5}
            />
          ))}
          {/* The stroke in progress, drawn locally so it keeps up with the
              cursor instead of waiting on the server. */}
          {inkDraft && inkDraft.length >= 4 && (
            <Line
              points={inkDraft}
              stroke={myInkColor}
              strokeWidth={4}
              lineCap="round"
              lineJoin="round"
              tension={0.35}
              opacity={0.75}
            />
          )}
        </Group>

        {/* Marker names — ships, settlements, points of interest.
            Drawn OUTSIDE the piece's Group on purpose: that Group carries the
            piece's rotation, so a label inside it would hang upside-down off a
            turned marker. These sit in unrotated map space under the piece's
            centre and stay level however the artwork is spun.
            A marker never gets an HP bar; it is not a combatant. */}
        <Group>
          {terrain.map((t) => {
            if (!t.is_marker) return null;
            const text = (t.label || t.lib_name || '').trim();
            if (!text) return null;
            const w = Number(t.width)  * gridSize;
            const h = Number(t.height) * gridSize;
            const cx = offsetX + Number(t.grid_col) * gridSize + w / 2;
            const top = offsetY + Number(t.grid_row) * gridSize + h;
            const ghosted = !isPlayer && terrainHidden(t);
            // Sized off the grid, like token names, so a label stays in
            // proportion to the map rather than to the piece it belongs to —
            // a fleet spanning six hexes shouldn't shout six times as loud.
            const fs = Math.max(gridSize * 0.26, 9);
            const padX = fs * 0.55;
            const cardW = text.length * fs * 0.6 + padX * 2;
            const cardH = fs * 1.75;
            return (
              <Group key={`ml-${t.id}`} x={cx - cardW / 2} y={top + fs * 0.35} opacity={ghosted ? 0.5 : 1}>
                <Rect
                  width={cardW} height={cardH} cornerRadius={cardH * 0.28}
                  fill="rgba(8,10,18,0.82)"
                  stroke="rgba(255,255,255,0.14)" strokeWidth={Math.max(fs * 0.05, 0.5)}
                />
                <Text
                  width={cardW} height={cardH}
                  text={text} align="center" verticalAlign="middle"
                  fill="#f3f4f6" fontSize={fs} fontStyle="bold"
                />
              </Group>
            );
          })}
        </Group>
        </Layer>

        {/* Submerged tokens — below the water canvas so they get distorted.
            GM sees them at reduced opacity to signal they are hidden from players. */}
        <Layer listening={false} ref={submergedTokensLayerRef} perfectDrawEnabled={false}>
          {sortedTokens.map(t => {
            const isSubmerged = Array.isArray(t.conditions) && t.conditions.includes('submerged');
            if (!isSubmerged) return null;
            // A deck below yours is dimmed to match its blurred art.
            const depth = tokenDepthOpacity.get(t.id);
            const overrideOpacity = !isPlayer ? 0.55 : (depth ?? null);
            const showLabel = tokenLabelVis.get(t.id) ?? true;
            return (
              <Token
                key={t.id}
                token={t}
                gridSize={gridSize}
                offset={tokenOffset}
                isPlayer={isPlayer}
                isSelected={selectedTokenId === t.id || multiSelected.has(t.id)}
                isCurrentTurn={currentCombatTokenId === t.id}
                dragVisPos={dragVis?.positions?.get(t.id) || null}
                carryPos={crewVis?.get(t.id) || null}
                playerTokenId={playerTokenId}
                showLabel={showLabel}
                overrideOpacity={overrideOpacity}
                tokenNameFontSize={effectiveNameFont}
              />
            );
          })}
        </Layer>

        {/* Aura rings — anchored to their token, so they simply travel with
            it. Drawn beneath the tokens so a ring never hides a face. */}
        <Layer listening={false} perfectDrawEnabled={false}>
          {sortedTokens.map((t) => {
            const auras = Array.isArray(t.auras) ? t.auras : [];
            if (auras.length === 0) return null;
            const sz = tokenFootprint(t);
            const cx = offsetX + Number(t.grid_col) * gridSize + (sz.gridW * gridSize) / 2;
            const cy = offsetY + Number(t.grid_row) * gridSize + (sz.gridH * gridSize) / 2;
            return auras.map((a) => {
              const rPx = (Number(a.radius) / FEET_PER_SQUARE) * gridSize
                + (Math.max(sz.gridW, sz.gridH) * gridSize) / 2;
              if (!(rPx > 0)) return null;
              return (
                <Group key={`${t.id}-${a.id}`} listening={false}>
                  <Circle
                    x={cx} y={cy} radius={rPx}
                    fill={a.color} opacity={0.12}
                    listening={false}
                  />
                  <Circle
                    x={cx} y={cy} radius={rPx}
                    stroke={a.color} strokeWidth={2} opacity={0.75}
                    dash={[8, 6]} listening={false}
                  />
                  {a.label && (
                    <Text
                      text={a.label}
                      x={cx - rPx} y={cy - rPx - 16}
                      width={rPx * 2} align="center"
                      fill={a.color} fontSize={Math.max(10, gridSize * 0.26)}
                      opacity={0.9} listening={false}
                    />
                  )}
                </Group>
              );
            });
          })}
        </Layer>

        {/* Non-submerged tokens — composited above the water canvas so they
            appear on the surface undistorted. */}
        <Layer listening={false} ref={aboveWaterTokensLayerRef} perfectDrawEnabled={false}>
          {sortedTokens.map(t => {
            const isSubmerged = Array.isArray(t.conditions) && t.conditions.includes('submerged');
            if (isSubmerged) return null;

            const isInvisible = Array.isArray(t.conditions) && t.conditions.includes('invisible');
            const isOwnToken  = t.id === playerTokenId;
            // Depth first, so an invisible token on a lower deck still picks
            // up the invisibility treatment below rather than being overwritten.
            let overrideOpacity = tokenDepthOpacity.get(t.id) ?? null;
            if (isInvisible) {
              if (!isPlayer) {
                overrideOpacity = 0.35;
              } else if (isOwnToken) {
                overrideOpacity = 0.45;
              } else if (!canSeeInvisible(t, visOrigins, offsetX, offsetY, gridSize)) {
                return null;
              }
            }

            const showLabel = tokenLabelVis.get(t.id) ?? true;
            return (
              <Token
                key={t.id}
                token={t}
                gridSize={gridSize}
                offset={tokenOffset}
                isPlayer={isPlayer}
                isSelected={selectedTokenId === t.id || multiSelected.has(t.id)}
                isCurrentTurn={currentCombatTokenId === t.id}
                dragVisPos={dragVis?.positions?.get(t.id) || null}
                carryPos={crewVis?.get(t.id) || null}
                playerTokenId={playerTokenId}
                showLabel={showLabel}
                overrideOpacity={overrideOpacity}
                tokenNameFontSize={effectiveNameFont}
              />
            );
          })}
        </Layer>

        {/* Overlay layer — plugin decorations, fog polygons, GM markers and
            measurements share one canvas (same memory rationale as the base
            layer above). */}
        <Layer listening={false}>
        {/* Plugin map decorations. Rendered ABOVE tokens so plugins can
            draw things like tree canopies, clouds, etc. that occlude
            tokens. Non-interactive — plugin nodes never intercept clicks.
            Plugins handle clicks via mapClickHandlers in pluginRegistry.js
            if they need them. */}
        <Group>
          {Array.from(pluginRegistries.mapDecorations.entries()).map(([pid, fn]) => {
            try {
              const node = fn({
                tokens, gridSize, offsetX, offsetY,
                mapWidth: mW, mapHeight: mH,
                mapId,
                isPlayer, playerTokenId,
              });
              return node ? <React.Fragment key={pid}>{node}</React.Fragment> : null;
            } catch (err) {
              console.warn(`mapDecoration "${pid}" threw:`, err);
              return null;
            }
          })}
        </Group>

        {/* Fog polygons — player view: opaque dark fill hides content until DM reveals */}
        {isPlayer && fogBlocks.some(fb => !fb.is_revealed) && (
          <Group>
            {fogBlocks.map((fb) => {
              if (fb.is_revealed) return null;
              const pts = Array.isArray(fb.points) ? fb.points : [];
              if (pts.length < 3) return null;
              return (
                <Line
                  key={fb.id}
                  points={pts.flatMap(p => [Number(p.x), Number(p.y)])}
                  closed
                  fill="rgba(0,0,0,0.97)"
                  strokeWidth={0}
                />
              );
            })}
          </Group>
        )}

        {/* Fog polygons — DM view: purple=hidden, green=revealed */}
        {!isPlayer && (fogBlocks.length > 0 || fogPolyPoints.length > 0) && (
          <Group>
            {fogBlocks.map((fb) => {
              const pts = Array.isArray(fb.points) ? fb.points : [];
              if (pts.length < 3) return null;
              const flat = pts.flatMap(p => [Number(p.x), Number(p.y)]);
              const sc = scaleRef.current || 1;
              return (
                <Line
                  key={fb.id}
                  points={flat}
                  closed
                  fill={fb.is_revealed ? 'rgba(34,197,94,0.18)' : 'rgba(124,58,237,0.45)'}
                  stroke={fb.is_revealed ? 'rgba(34,197,94,0.7)' : 'rgba(167,139,250,0.9)'}
                  strokeWidth={2 / sc}
                  dash={fb.is_revealed ? [6 / sc, 4 / sc] : undefined}
                />
              );
            })}
            {/* In-progress polygon preview */}
            {fogPolyPoints.length > 0 && (() => {
              const sc = scaleRef.current || 1;
              const flat = fogPolyPoints.flatMap(p => [p.x, p.y]);
              const previewFlat = fogCursorGrid ? [...flat, fogCursorGrid.x, fogCursorGrid.y] : flat;
              const fp = fogPolyPoints[0];
              const nearClose = fogPolyPoints.length >= 3 && fogCursorGrid &&
                Math.sqrt((fogCursorGrid.x - fp.x) ** 2 + (fogCursorGrid.y - fp.y) ** 2) < 20 / sc;
              return (
                <>
                  <Line points={previewFlat} closed={false} stroke="rgba(167,139,250,1)" strokeWidth={2 / sc} dash={[4 / sc, 4 / sc]} />
                  {fogPolyPoints.length >= 3 && (
                    <Circle
                      x={fp.x} y={fp.y}
                      radius={nearClose ? 10 / sc : 6 / sc}
                      fill={nearClose ? 'rgba(167,139,250,1)' : 'rgba(167,139,250,0.5)'}
                      stroke="white" strokeWidth={1 / sc}
                    />
                  )}
                </>
              );
            })()}
          </Group>
        )}

        {/* GM-only markers — rendered above tokens, never visible to players */}
        {dmMarkers.length > 0 && (
          <Group>
            {dmMarkers.map((m) => {
              const cx = offsetX + (Number(m.grid_col) + 0.5) * gridSize;
              const cy = offsetY + (Number(m.grid_row) + 0.5) * gridSize;
              const r  = Math.max(18, gridSize * 0.38);
              if (m.marker_type === 'text_label') {
                const labelText = m.label || m.note || '';
                const fontSize = Math.max(11, gridSize * 0.28);
                const approxW = Math.max(labelText.length * fontSize * 0.6, 60);
                return (
                  <React.Fragment key={m.id}>
                    <Rect
                      x={cx - approxW / 2 - 6} y={cy - fontSize / 2 - 5}
                      width={approxW + 12} height={fontSize + 10}
                      fill="rgba(0,0,0,0.72)" cornerRadius={4}
                      stroke="#facc15" strokeWidth={1}
                      onClick={() => onDmMarkerClick?.(m)}
                      onTap={() => onDmMarkerClick?.(m)}
                      style={{ cursor: 'pointer' }}
                    />
                    <Text
                      x={cx - approxW / 2} y={cy - fontSize / 2}
                      width={approxW} height={fontSize + 2}
                      text={labelText}
                      fontSize={fontSize}
                      fill="#facc15"
                      fontStyle="bold"
                      align="center" verticalAlign="middle"
                      listening={false}
                    />
                  </React.Fragment>
                );
              }
              return (
                <React.Fragment key={m.id}>
                  <Circle
                    x={cx} y={cy} radius={r}
                    fill={DM_MARKER_COLORS[m.marker_type] || '#6b7280'}
                    opacity={0.82}
                    stroke="rgba(255,255,255,0.55)"
                    strokeWidth={1.5}
                    onClick={() => onDmMarkerClick?.(m)}
                    onTap={() => onDmMarkerClick?.(m)}
                    style={{ cursor: 'pointer' }}
                  />
                  <Text
                    x={cx - r} y={cy - r}
                    width={r * 2} height={r * 2}
                    text={DM_MARKER_ICONS[m.marker_type] || '📝'}
                    fontSize={Math.max(14, r * 0.9)}
                    align="center" verticalAlign="middle"
                    listening={false}
                  />
                  {m.note && (
                    <Circle
                      x={cx + r * 0.6} y={cy - r * 0.6}
                      radius={4} fill="white" opacity={0.9}
                      listening={false}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </Group>
        )}

        {/* Water zone indicators — GM only, and deliberately NOT on the base
            layer with the other zone indicators.
            
            The water effect samples the base layer's canvas (Konva gives each
            Layer its own canvas, and the effect reads the first one) and
            redraws it in horizontally displaced slices. Anything drawn there
            gets displaced with the map — so the dashed ring was being sampled
            and smeared into a broad, broken cyan halo hugging the zone edge,
            re-scrambled every frame. That was the glitchy border.
            
            Up here it is on a canvas the effect never reads, so it stays a
            clean circle. It sits under the water overlay, which veils it
            slightly at the edge — the right look for a boundary that is
            supposed to be underwater, and the price of it holding still. */}
        {!isPlayer && (
          <Group>
            {resolvedDarkness
              .filter((dz) => dz.zone_type === 'water')
              .map((dz) => <WaterZone key={dz.id} dz={dz} />)}
          </Group>
        )}

        {/* Measurement overlay — always on top */}
        <Group>
          {remoteMeasurements.map((rm) => (
            <MeasureOverlay key={rm.name} meas={rm.meas} gridSize={gridSize} tint={rm.color} scale={scale} mapScale={mapScale} />
          ))}
          <MeasureOverlay meas={meas} gridSize={gridSize} scale={scale} mapScale={mapScale} />
        </Group>
        </Layer>
      </Stage>

      {/* Water/illusion effect — sits above Konva but below FoW so it is hidden in
          unexplored areas. Applies horizontal-slice pixel distortion + caustic overlays. */}
      <canvas
        ref={waterCanvasRef}
        width={stageSize.w}
        height={stageSize.h}
        style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
      />

      {/* Light glow — sits above the map/tokens but below fog so darkness occludes it.
          mix-blend-mode: screen makes the warm amber glow additive so it brightens
          whatever is below (including tokens) rather than painting over them.
          A small blur softens the hard edges left where a light's LOS polygon is
          clipped by walls (and directional-cone edges), so shadow boundaries read
          as soft falloff rather than crisp cutouts. Scales with zoom, clamped. */}
      {fogOfWar && (
        <canvas
          ref={glowCanvasRef}
          width={stageSize.w}
          height={stageSize.h}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            pointerEvents: 'none',
            mixBlendMode: 'screen',
          }}
        />
      )}

      {/* Frosted glass — blurs the live stage behind each window cone. Must sit
          between the Stage and the fog canvas: backdrop-filter samples whatever
          has already painted beneath it, and the fog then darkens on top. */}
      {fogOfWar && windowBlurRegions.length > 0 && (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
          {/* Pan/zoom lives here so the clip-path polygons below stay in map
              space and don't churn while the view moves. */}
          <div style={{
            position: 'absolute', top: 0, left: 0, width: mW, height: mH,
            transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`,
            transformOrigin: '0 0',
          }}>
            {windowBlurRegions.map((r, i) => (
              <div key={i} style={{ position: 'absolute', inset: 0, clipPath: `polygon(${r.los})` }}>
                <div style={{
                  position: 'absolute', inset: 0,
                  clipPath: `polygon(${r.cone})`,
                  // Divided by scale because the blur radius is interpreted in
                  // this element's own (map) space, which the parent scales.
                  backdropFilter: `blur(${(WINDOW_BLUR_PX / scale).toFixed(2)}px)`,
                  WebkitBackdropFilter: `blur(${(WINDOW_BLUR_PX / scale).toFixed(2)}px)`,
                }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fog of war — HTML canvas overlay so destination-out compositing works
          reliably across all browsers (Konva sceneFunc approach is unreliable).
          Canvas is oversized by 2*fowBlur on each side so the smooth CSS blur
          never clips at the viewport edge. `isolation` + `translateZ` force a
          single compositing layer so the GPU doesn't tile the blur (which was
          leaving a faint screen-fixed seam). */}
      {(fogOfWar || (
        (isPlayer || isSpectator)
        && (resolvedDarkness || []).some((dz) => dz.zone_type === 'heavy-fog')
      )) && (
        <canvas
          ref={fogCanvasRef}
          width={stageSize.w + 2 * Math.ceil(fowBlur * scale)}
          height={stageSize.h + 2 * Math.ceil(fowBlur * scale)}
          style={{
            position: 'absolute',
            top: -Math.ceil(fowBlur * scale),
            left: -Math.ceil(fowBlur * scale),
            pointerEvents: 'none',
            filter: fowBlur > 0 ? `blur(${Math.round(fowBlur * scale)}px)` : 'none',
            isolation: 'isolate',
            transform: 'translateZ(0)',
            willChange: 'filter',
          }}
        />
      )}

      {/* Door sprite overlay — above the fog, no blur, so seen door art
          (bookcases, etc.) shows crisply on top of shadow. */}
      {fogOfWar && (
        <canvas
          ref={doorOverlayRef}
          width={stageSize.w}
          height={stageSize.h}
          style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
        />
      )}

      {/* Tremorsense blip canvas — above the fog canvas, no blur.
          Shows sonar-ring indicators for grounded tokens detected by tremorsense
          that are not yet revealed by normal line of sight. */}
      <canvas
        ref={blipCanvasRef}
        width={stageSize.w}
        height={stageSize.h}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          pointerEvents: 'none',
        }}
      />

      {/* Movement budget — distance travelled by the token being dragged,
          against its speed. Amber past one move, red past two (a Dash).
          Advisory only: nothing here blocks the drop. */}
      {sneakMode && (
        <SneakRoundBar
          anchor={sneakRoundAt}
          tokens={tokens}
          viewerTokenId={playerTokenId}
          isPlayer={isPlayer}
          topInset={sneakBarInset}
        />
      )}

      {dragVis?.feet > 0 && (() => {
        const { feet, speed, capFt, speedMode } = dragVis;
        // Inside a sneak sequence the readout stops being Dash advice and
        // becomes a budget: there is no Dash, there is only what is left.
        const capped = capFt != null;
        const atLimit = capped && feet >= capFt - 0.5;
        const overOne = !capped && feet > speed;
        const overTwo = !capped && feet > speed * 2;
        const tokenPos = dragVis.positions?.get(dragVis.primaryId);
        if (!tokenPos) return null;
        const left = tokenPos.x * scale + pos.x;
        const top = tokenPos.y * scale + pos.y;
        return (
          <div
            style={{
              position: 'absolute',
              left: Math.round(left),
              top: Math.round(top) - 26,
              pointerEvents: 'none',
              zIndex: 30,
            }}
            className={`px-1.5 py-0.5 rounded text-[11px] font-mono font-semibold shadow-lg border ${
              atLimit ? 'bg-red-950/90 border-red-700 text-red-200'
              : overTwo ? 'bg-red-950/90 border-red-700 text-red-200'
              : overOne ? 'bg-amber-950/90 border-amber-700 text-amber-200'
              : 'bg-gray-900/90 border-gray-700 text-gray-100'
            }`}
          >
            {capped
              ? `${feet} ft / ${Math.round(capFt)} left${atLimit ? ' · out of movement' : ''}`
              : `${feet} ft / ${speed}${speedMode && speedMode !== 'walk' ? ` ${speedMode}` : ''}`
                + `${overTwo ? ' · over Dash' : overOne ? ' · Dash' : ''}`}
          </div>
        );
      })()}

      {/* Token FX canvas — transformation / destruction animations. Below the
          ping layer so a ping stays readable over an explosion. */}
      <canvas
        ref={fxCanvasRef}
        width={stageSize.w}
        height={stageSize.h}
        style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
      />

      {/* Ping canvas — expanding ring animations for DM map pings, above all overlays */}
      <canvas
        ref={pingCanvasRef}
        width={stageSize.w}
        height={stageSize.h}
        style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
      />

      {/* Fog block right-click menu */}
      {fogBlockMenu && !isPlayer && (
        <div
          ref={fogBlockMenuRef}
          style={{ position: 'fixed', left: fogBlockMenu.clientX, top: fogBlockMenu.clientY, zIndex: 80 }}
          className="bg-gray-900 border border-violet-700 rounded-xl shadow-2xl overflow-hidden text-sm"
        >
          <button
            className="w-full px-4 py-2 text-left hover:bg-gray-700 text-violet-200"
            onClick={() => {
              if (fogBlockMenu.is_revealed) onFogBlockHideRef.current?.(fogBlockMenu.id);
              else onFogBlockRevealRef.current?.(fogBlockMenu.id);
              setFogBlockMenu(null);
            }}
          >
            {fogBlockMenu.is_revealed ? 'Hide (restore block)' : 'Reveal (allow sight)'}
          </button>
          <button
            className="w-full px-4 py-2 text-left hover:bg-red-900 text-red-300"
            onClick={() => { onFogBlockDeleteRef.current?.(fogBlockMenu.id); setFogBlockMenu(null); }}
          >
            Delete
          </button>
          <button
            className="w-full px-4 py-2 text-left hover:bg-gray-700 text-gray-400 text-xs"
            onClick={() => setFogBlockMenu(null)}
          >
            Cancel
          </button>
        </div>
      )}

      {/* Door right-click menu (GM) — toggle / flip / sprite / motion / delete */}
      {/* Ship removal — GM only. Step one picks the send-off, step two decides
          what happens to the crew, because "delete the ship" and "kill everyone
          standing on it" should never be the same click. */}
      {shipMenu && !isPlayer && (() => {
        const OPTIONS = [
          { key: 'none',      label: 'Delete ship',        hint: 'Removed with no fanfare' },
          { key: 'explosion', label: 'Explosion',          hint: 'Fireball, shockwave, debris' },
          { key: 'magical',   label: 'Magical explosion',  hint: 'Arcane bloom and runes' },
          { key: 'implosion', label: 'Implosion',          hint: 'Collapses inward, then a flash' },
        ];
        const close = () => setShipMenu(null);
        const fire = (crew) => {
          onShipRemoveRef.current?.(shipMenu.ship.id, shipMenu.pending, crew);
          close();
        };
        // Read the hull back out of the live list: the menu's own copy was
        // snapshotted when it opened, so HP edited here (or by another GM
        // client) would otherwise show stale numbers under the cursor.
        const liveShip = ships.find((s) => s.id === shipMenu.ship.id) || shipMenu.ship;
        // 0 here means "this client doesn't know the class's hull" — never
        // "the ship has no hull". Treat it as unknown and say so, rather than
        // rendering a full-looking bar or a confident 0.
        const maxHull = Number(liveShip.hull_hp) || 0;
        const curHull = liveShip.current_hp == null
          ? (maxHull > 0 ? maxHull : null)
          : Number(liveShip.current_hp) || 0;
        const hullPct = maxHull > 0 && curHull != null ? Math.max(0, Math.min(1, curHull / maxHull)) : 0;
        const hullColor = hullPct > 0.5 ? '#4ade80' : hullPct > 0.25 ? '#facc15' : '#ef4444';
        // Damage and repair travel as a DELTA. The server owns the running
        // total and applies it to its own value, so a stale or incomplete ship
        // row here can't overwrite a healthy hull with a number derived from
        // the wrong starting point.
        const applyHull = (sign) => {
          const amt = Math.abs(Math.floor(Number(shipHpAmount))) || 0;
          if (!amt) return;
          onShipHpChange?.(liveShip.id, { delta: sign * amt });
        };
        return (
          <div
            style={{ position: 'fixed', left: shipMenu.clientX, top: shipMenu.clientY, zIndex: 80, minWidth: 230 }}
            className="bg-gray-900 border border-amber-700 rounded-xl shadow-2xl overflow-hidden text-sm"
          >
            {/* The hull's own name, editable in place.
                map_ships.name is this SHIP; ship_library.name is its class, and
                renaming the class in the builder can't touch a hull already on
                the board. This is the only place the individual ship can be
                named. */}
            {onShipRename ? (
              <input
                defaultValue={liveShip.name || ''}
                placeholder="Name this ship"
                onClick={(e) => e.stopPropagation()}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v && v !== (liveShip.name || '')) onShipRename(liveShip.id, v);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.currentTarget.blur();
                  if (e.key === 'Escape') { e.currentTarget.value = liveShip.name || ''; e.currentTarget.blur(); }
                }}
                className="w-full px-3 py-1.5 bg-gray-900 text-amber-200 text-[11px] uppercase tracking-wide border-b border-gray-700 outline-none focus:bg-gray-800"
              />
            ) : (
              <div className="px-3 py-1.5 text-[11px] uppercase tracking-wide text-amber-500/80 border-b border-gray-700 truncate max-w-[240px]">
                {shipMenu.ship.name || 'Ship'}
              </div>
            )}
            {!shipMenu.pending ? (
              <>
                {/* Hull + initiative, the two things a GM touches mid-fight.
                    Above the destruction options so the dangerous buttons
                    aren't what the cursor lands on. */}
                {onShipHpChange && (
                  <div className="px-3 py-2 border-b border-gray-700 space-y-1.5" style={{ minWidth: 240 }}>
                    <div className="flex items-baseline justify-between">
                      <span className="text-[11px] text-gray-400">Hull</span>
                      <span className="text-xs text-gray-200 tabular-nums">
                        {curHull == null ? '—' : curHull}{maxHull > 0 ? ` / ${maxHull}` : ''}
                      </span>
                    </div>
                    {maxHull > 0 && (
                      <div className="h-1.5 rounded-full bg-gray-700 overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${hullPct * 100}%`, background: hullColor }} />
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => applyHull(-1)}
                        title="Damage the hull"
                        className="px-2 py-1 rounded bg-red-900/60 border border-red-700 text-red-200 text-xs hover:bg-red-900"
                      >−</button>
                      <input
                        type="number" min="0"
                        value={shipHpAmount}
                        onChange={(e) => setShipHpAmount(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') applyHull(e.shiftKey ? 1 : -1);
                        }}
                        className="w-16 bg-gray-800 border border-gray-600 rounded px-1.5 py-1 text-xs text-white text-center"
                      />
                      <button
                        onClick={() => applyHull(1)}
                        title="Repair the hull"
                        className="px-2 py-1 rounded bg-emerald-900/60 border border-emerald-700 text-emerald-200 text-xs hover:bg-emerald-900"
                      >+</button>
                      <button
                        onClick={() => onShipHpChange?.(liveShip.id, { currentHp: maxHull })}
                        disabled={!maxHull || curHull === maxHull}
                        title="Restore to full hull"
                        className="ml-auto px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs disabled:opacity-40"
                      >Full</button>
                    </div>
                    <div className="flex items-center gap-1 pt-0.5">
                      <span className="text-[11px] text-gray-400">Init</span>
                      <input
                        type="number"
                        value={liveShip.initiative ?? ''}
                        placeholder="—"
                        onChange={(e) => onShipInitiativeChange?.(
                          liveShip.id,
                          e.target.value === '' ? null : parseInt(e.target.value, 10),
                        )}
                        className="w-14 bg-gray-800 border border-gray-600 rounded px-1.5 py-1 text-xs text-white text-center"
                      />
                      <button
                        onClick={() => onShipInitiativeChange?.(liveShip.id, 1 + Math.floor(Math.random() * 20))}
                        title="Roll d20 for this ship's initiative"
                        className="px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs"
                      >Roll d20</button>
                      <button
                        onClick={() => onShipCombatToggle?.(liveShip.id, !liveShip.in_combat)}
                        title={combatActive
                          ? (liveShip.in_combat ? 'Take this ship out of the initiative order' : 'Put this ship into the initiative order')
                          : 'Marks the ship for the next combat — start combat to see the order'}
                        className={`ml-auto px-2 py-1 rounded text-xs border ${
                          liveShip.in_combat
                            ? 'bg-yellow-900/40 border-yellow-700 text-yellow-200 hover:bg-yellow-900/70'
                            : 'bg-yellow-800 border-yellow-600/60 text-yellow-100 hover:bg-yellow-700'
                        }`}
                      >{liveShip.in_combat ? 'In combat' : 'Add to combat'}</button>
                    </div>
                    {/* The flag on its own does nothing visible until a fight is
                        running — the initiative strip only exists during combat.
                        Say so, rather than leaving the GM clicking a button that
                        appears to do nothing. */}
                    {liveShip.in_combat && !combatActive && (
                      <p className="text-[10px] text-gray-500 leading-tight">
                        Queued — it joins the order when you start combat.
                      </p>
                    )}
                  </div>
                )}
                {OPTIONS.map((o) => (
                  <button
                    key={o.key}
                    className="w-full px-4 py-2 text-left hover:bg-gray-700 text-gray-200"
                    onClick={() => setShipMenu((m) => m && { ...m, pending: o.key })}
                  >
                    <div>{o.label}</div>
                    <div className="text-[11px] text-gray-500">{o.hint}</div>
                  </button>
                ))}
                <button className="w-full px-4 py-2 text-left hover:bg-gray-700 text-gray-400 border-t border-gray-700"
                  onClick={close}>Cancel</button>
              </>
            ) : (
              <>
                <div className="px-3 py-2 text-[11px] text-gray-400 border-b border-gray-700">
                  {OPTIONS.find(o => o.key === shipMenu.pending)?.label} — and the crew aboard?
                </div>
                <button className="w-full px-4 py-2 text-left hover:bg-gray-700 text-gray-200"
                  onClick={() => fire('adrift')}>
                  <div>Leave them adrift</div>
                  <div className="text-[11px] text-gray-500">Tokens stay on the map where the ship was</div>
                </button>
                <button className="w-full px-4 py-2 text-left hover:bg-red-900/40 text-red-200"
                  onClick={() => fire('delete')}>
                  <div>Destroy them with the ship</div>
                  <div className="text-[11px] text-red-300/70">Tokens aboard are deleted too</div>
                </button>
                <button className="w-full px-4 py-2 text-left hover:bg-gray-700 text-gray-400 border-t border-gray-700"
                  onClick={() => setShipMenu((m) => m && { ...m, pending: null })}>Back</button>
              </>
            )}
          </div>
        );
      })()}

      {doorMenu && !isPlayer && (
        <DoorMenu
          door={doorMenu.door}
          doorSprites={doorSprites}
          x={doorMenu.clientX}
          y={doorMenu.clientY}
          menuRef={doorMenuRef}
          onToggle={(id) => onDoorToggleRef.current?.(id)}
          onFlip={(id) => onDoorFlipRef.current?.(id)}
          onKindSet={(id, kind) => onDoorKindSetRef.current?.(id, kind)}
          onSpriteSet={(payload) => onDoorSpriteSetRef.current?.(payload)}
          onDelete={(id) => onDoorDeleteRef.current?.(id)}
          onClose={() => setDoorMenu(null)}
        />
      )}

      {portalMenu && !isPlayer && (() => {
        // Read the live row, not the one captured when the menu opened, so the
        // labels flip as soon as an action lands.
        const p = portals.find(x => x.id === portalMenu.portal.id) || portalMenu.portal;
        const pair = portals.filter(x => x.pair_id === p.pair_id);
        const other = pair.find(x => x.id !== p.id) || null;
        // "Disabled" means neither end sends: the gate is inert but still on
        // the map. One-way is the asymmetric case — exactly one end sends.
        const pairOff = pair.length > 0 && pair.every(x => x.exit_enabled === false);
        const update = (patch) => { onPortalUpdateRef.current?.(p.id, patch); setPortalMenu(null); };
        return (
          <div
            ref={portalMenuRef}
            style={{ position: 'fixed', left: portalMenu.clientX, top: portalMenu.clientY, zIndex: 80, minWidth: 210 }}
            className="bg-gray-900 border border-fuchsia-700 rounded-xl shadow-2xl overflow-hidden text-sm"
          >
            <div className="px-3 py-1.5 text-[11px] uppercase tracking-wide text-fuchsia-400/80 border-b border-gray-700 truncate max-w-[240px]">
              {p.label ? p.label : 'Portal'}
              <span className="text-gray-500 normal-case">
                {' · '}{pairOff ? 'disabled' : (pair.length === 2 && pair.some(x => !x.exit_enabled) ? 'one-way' : 'two-way')}
              </span>
            </div>

            <button className="w-full px-4 py-2 text-left hover:bg-gray-700 text-gray-200"
              onClick={() => update({ exitEnabled: !p.exit_enabled })}>
              {p.exit_enabled ? 'Stop this end sending (one-way)' : 'Let this end send again'}
            </button>
            {other && (
              <button className="w-full px-4 py-2 text-left hover:bg-gray-700 text-gray-300"
                onClick={() => { onPortalUpdateRef.current?.(other.id, { exitEnabled: !other.exit_enabled }); setPortalMenu(null); }}>
                {other.exit_enabled ? 'Stop far end sending' : 'Let far end send again'}
              </button>
            )}

            <div className="px-3 py-1.5 text-[11px] uppercase tracking-wide text-fuchsia-400/80 border-t border-gray-700">Whole gate</div>
            <button className="w-full px-4 py-2 text-left hover:bg-gray-700 text-gray-200"
              onClick={() => { onPortalPairUpdateRef.current?.(p.pair_id, { exitEnabled: pairOff }); setPortalMenu(null); }}>
              {pairOff ? 'Enable portal' : 'Disable portal'}
            </button>
            <button className="w-full px-4 py-2 text-left hover:bg-gray-700 text-gray-300"
              onClick={() => { onPortalPairUpdateRef.current?.(p.pair_id, { hidden: !p.hidden }); setPortalMenu(null); }}>
              {p.hidden ? 'Reveal to players' : 'Hide from players'}
            </button>
          </div>
        );
      })()}

      {/* Feather tool panel — floats above selected zone centroid */}
      {activeTool === 'zone-feather' && featherZoneId && (() => {
        const dz = magicalDarkness.find(d => d.id === featherZoneId);
        if (!dz) return null;
        const { x: czX, y: czY } = zoneCentroid(dz);
        const panelX = czX * scale + pos.x;
        const panelY = czY * scale + pos.y;
        return (
          <div
            style={{ position: 'absolute', left: panelX, top: panelY, transform: 'translate(-50%, -115%)', zIndex: 60 }}
            className="bg-gray-900 border border-cyan-700 rounded-xl p-3 shadow-2xl min-w-[180px]"
            onMouseDown={e => e.stopPropagation()}
          >
            <div className="text-xs text-cyan-400 font-semibold mb-2 capitalize">
              {dz.zone_type === 'heavy-fog' ? 'Fog' : 'Water'} — edge feather
            </div>
            <div className="flex items-center gap-2">
              <input
                type="range" min={0} max={50} step={1}
                value={featherValue}
                onChange={e => {
                  const v = Number(e.target.value);
                  setFeatherValue(v);
                  onZoneFeatherChangeRef.current?.(featherZoneId, v);
                }}
                className="flex-1 accent-cyan-500"
              />
              <span className="text-xs text-gray-300 w-10 text-right font-mono">
                {featherValue === 0 ? 'auto' : featherValue}
              </span>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
