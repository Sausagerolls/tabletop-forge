import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Tool3DPanel } from './ToolPanel.jsx';
import { buildGlowLights, paintLightGlow, tokenFootprint } from './MapStage.jsx';
import { mainDeck, referenceDeck, shipPivot, gridOffsets } from '../utils/ships.js';
import { hexLattice, hexCenter, nearestHexCenter } from '../utils/grid.js';
import { PING_TOOLS, pingSizeForTool, pingSize } from '../utils/ping.js';
import { levelBaseFt, levelHeightFt, occupiedLevel } from '../utils/levelFloor.js';
import { wallsToSegments, doorsToSegments, computeVisibilityPolygon, windowData, windowFarSideData } from '../utils/los.js';
// Templates resolve through the flat map's own geometry helper, so a cone is
// the same arc in both views rather than two interpretations that can drift.
import { templateShapeProps } from './MapStage.jsx';
// The elemental-templates plugin publishes each template's element here. Its
// own effects are Konva nodes, which this renderer can't run — so it reads the
// element and animates in three.js instead.
import { registries as pluginRegistries } from '../plugins/pluginRegistry.js';
import { createWeather3D, readWeatherClamp, writeWeatherClamp } from './weather3d.js';
import { createTokenFx3D } from './tokenFx3d.js';
import { skyPresetTexture, disposeSkyTextures } from '../utils/skyPresets.js';
// Same distance formatting the flat map uses, so "30 ft" means the same thing
// in both views and respects a map's own scale and unit.
import { scaleOf, formatCells } from '../utils/grid.js';
// Shipped planet markers become real spheres in 3D rather than a picture of a
// planet lying on the floor — same reasoning as the suns below.
import { planetArtInfo, makePlanetCanvas, PLANET_PALETTES } from '../utils/planetTexture.js';
// Space rocks get the same treatment, but deformed off a sphere — an asteroid
// is defined by not being round.
import { asteroidArtInfo, makeRockCanvas, deformRock, rockIsFaceted, paletteFromImage, ROCK_PALETTES } from '../utils/asteroidRock.js';
// Panoramas are the biggest asset here by far — loaded once per tab and shared,
// with the download started while the GM is still on the flat map.
import { loadSkyTexture, onSkyProgress, skyProgress, isSkyReady } from '../utils/skyTexture.js';
// GM-supplied Blender models. A library piece can carry a .glb alongside its
// flat art, and the 3D view stands that mesh up where the sprite would lie.
import { loadModel, cloneModel, fitModel, SHARED_MODEL_FLAG } from '../utils/model3d.js';
import { isTokenDown, tokenLabelInfo, hpColor } from '../utils/tokenState.js';
import { doorMotion } from '../utils/doorMotion.js';
import { buildInteriorMap, outwardFor } from '../utils/wallInterior.js';

// Map3DView — an orbitable 3D view of the board.
//
// Deliberately a VIEWER, not an editor. The Konva stage stays the single
// authoritative surface: it owns hit-testing, line of sight, fog, walls and
// every tool. This reads the same data and draws it in perspective so the
// table can see height — which is the one thing a top-down map cannot show.
//
// Nothing here writes back. That constraint is what keeps it small: no
// picking, no drag maths, no LOS port, no tool support.
//
// Scale: one grid square is 5 ft, and we use 1 world unit = 1 ft so token
// heights are literally their elevation.
// Matching the flat map's fog pass, so both views fade a window the same way.
const WINDOW_DIM_ALPHA = 0.28;
const WINDOW_SEE_THROUGH_FT = 10;
// The measure tools this view offers — the same three the flat map offers.
const MEASURE_TOOLS_3D = new Set(['ruler', 'cone', 'circle']);

// How far a press may travel and still count as a click rather than an orbit.
//
// Deliberately tighter than the flat map's equivalent: there, a stray few
// pixels do nothing, whereas here the same drag has already swung the camera —
// so if the view moved, the press was about the view.
const CLICK_SLOP_3D = 6;

// Effects tools, split by the gesture each one takes. Same ids as the flat
// map's EFFECTS_GROUP, because they drive the same zones through the same
// handlers — a fog bank placed in either view is one row in magical_darkness.
const ZONE_CIRCLE_TOOLS_3D = new Set(['magical-darkness', 'heavy-fog', 'water-circle']);
const ZONE_POLY_TOOLS_3D   = new Set(['darkness-polygon', 'fog-polygon', 'water-polygon']);
// How long a ping animates for. Matches the 3.5s the hosts keep one in state,
// less a little so it fades out rather than being cut off mid-pulse.
const PING_DURATION_MS_3D = 3200;

// Spell templates. Same ids and the same {type, points} payload the flat map
// commits, so a cone dropped in either view is one row in spell_templates.
const TEMPLATE_TOOLS_3D = new Set(['tpl-cone', 'tpl-circle', 'tpl-line', 'tpl-square']);
const TEMPLATE_TYPE_FOR_TOOL_3D = {
  'tpl-cone': 'cone',
  'tpl-circle': 'circle',
  'tpl-line': 'line',
  'tpl-square': 'square',
};

const ZONE_TYPE_FOR_TOOL_3D = {
  'heavy-fog': 'heavy-fog',
  'fog-polygon': 'heavy-fog',
  'water-circle': 'water',
  'water-polygon': 'water',
  'magical-darkness': 'darkness',
  'darkness-polygon': 'darkness',
};

// The outline for a measurement, as a point loop lying just off the floor.
//
// Ruler is the segment itself. Circle is a ring of the dragged radius. Cone is
// 5e's cone: as wide at its end as it is long, which is why the far edge is
// built from the length rather than from a fixed angle.
function measureShape3D(type, from, to, y = 1.2) {
  const at = (x, z) => new THREE.Vector3(x, y, z);
  if (type === 'circle') {
    const r = Math.hypot(to.x - from.x, to.z - from.z);
    const pts = [];
    for (let i = 0; i <= 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      pts.push(at(from.x + Math.cos(a) * r, from.z + Math.sin(a) * r));
    }
    return pts;
  }
  if (type === 'cone') {
    const dx = to.x - from.x, dz = to.z - from.z;
    const len = Math.hypot(dx, dz);
    if (len < 0.001) return [at(from.x, from.z)];
    const ux = dx / len, uz = dz / len;
    const px = -uz, pz = ux;            // perpendicular, in the ground plane
    const half = len / 2;               // half the mouth, so width == length
    const a = at(from.x + ux * len + px * half, from.z + uz * len + pz * half);
    const b = at(from.x + ux * len - px * half, from.z + uz * len - pz * half);
    return [at(from.x, from.z), a, b, at(from.x, from.z)];
  }
  return [at(from.x, from.z), at(to.x, to.z)];
}

const FT_PER_SQUARE = 5;

// Draw order, low to high. Everything below 10 lies ON the floor and is
// depth-tested against the tokens above it; tokens write depth so anything
// behind them is properly hidden. Labels sit on top with depth testing off
// because a readout you can't see is useless.
//   0  floor          2  doors        3-5 templates + motes
//   6  water / fog    8  darkness     10  tokens        19+ labels

// One entry per element the plugin supports. `speed` and `swing` drive the
// pulse, `motes` is how many drifting particles ride above the template, and
// `rise` is how they move: upward for fire and void, settling for ice and
// acid, quick flicker for lightning.
// A floating text chip. Canvas-drawn so it needs no font loading, and a
// Sprite so it always faces the camera however the board is spun.
function makeLabel(text, fg = '#ffd873') {
  const pad = 12;
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d');
  ctx.font = 'bold 44px -apple-system, system-ui, sans-serif';
  const w = Math.ceil(ctx.measureText(text).width) + pad * 2;
  c.width = w; c.height = 68;
  const g = c.getContext('2d');
  g.font = 'bold 44px -apple-system, system-ui, sans-serif';
  g.fillStyle = 'rgba(8,10,18,0.85)';
  g.beginPath();
  const r = 14;
  g.moveTo(r, 0); g.lineTo(w - r, 0); g.quadraticCurveTo(w, 0, w, r);
  g.lineTo(w, 68 - r); g.quadraticCurveTo(w, 68, w - r, 68);
  g.lineTo(r, 68); g.quadraticCurveTo(0, 68, 0, 68 - r);
  g.lineTo(0, r); g.quadraticCurveTo(0, 0, r, 0);
  g.fill();
  g.fillStyle = fg;
  g.textBaseline = 'middle';
  g.fillText(text, pad, 36);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  sprite.userData.aspect = w / 68;
  sprite.renderOrder = 20;
  return sprite;
}

// ── Terrain name tags ────────────────────────────────────────────────────────
//
// The flat map draws a marker's name under its disc. In 3D that name is far
// more useful and was missing entirely: a system view is a dozen spheres, and
// "the blue one" is not a way to run a session.
//
// Whether a piece is named is a tri-state on the placement. `show_label` NULL
// means "auto", which reproduces the flat map's rule — markers are named,
// scenery isn't — and true/false is the GM overriding that for this one piece.
function terrainLabelText(t) {
  const explicit = typeof t.label === 'string' ? t.label.trim() : '';
  if (explicit) return explicit;
  const lib = typeof t.lib_name === 'string' ? t.lib_name.trim() : '';
  return lib;
}

function terrainShowsLabel(t) {
  if (!terrainLabelText(t)) return false;
  if (t.show_label === true) return true;
  if (t.show_label === false) return false;
  return !!t.is_marker;
}

// A name tag, sized in FEET so it stays glued to the thing it names as the
// camera orbits and dollies.
//
// `muted` is the GM's view of a tag the players don't get: the name is on the
// GM's screen and stripped from the players' rows server-side, so the GM needs
// to be able to tell at a glance which names are secret. Drawn in a cooler,
// dimmer style with a dashed edge rather than with an icon, which at tag sizes
// turns to mush.
function makeTerrainNameTag(text, { muted = false } = {}) {
  const pad = 18;
  const H = 76;
  const c = document.createElement('canvas');
  const probe = c.getContext('2d');
  probe.font = 'bold 46px -apple-system, system-ui, sans-serif';
  const w = Math.ceil(probe.measureText(text).width) + pad * 2;
  c.width = w; c.height = H;
  const g = c.getContext('2d');
  g.font = 'bold 46px -apple-system, system-ui, sans-serif';
  const r = 16;
  g.fillStyle = muted ? 'rgba(10,14,26,0.72)' : 'rgba(8,10,18,0.82)';
  g.beginPath();
  g.moveTo(r, 0); g.lineTo(w - r, 0); g.quadraticCurveTo(w, 0, w, r);
  g.lineTo(w, H - r); g.quadraticCurveTo(w, H, w - r, H);
  g.lineTo(r, H); g.quadraticCurveTo(0, H, 0, H - r);
  g.lineTo(0, r); g.quadraticCurveTo(0, 0, r, 0);
  g.closePath();
  g.fill();
  g.lineWidth = 3;
  g.strokeStyle = muted ? 'rgba(148,197,255,0.55)' : 'rgba(255,216,115,0.35)';
  if (muted) g.setLineDash([9, 7]);
  g.stroke();
  g.setLineDash([]);
  g.fillStyle = muted ? '#9ec5ff' : '#ffd873';
  g.textBaseline = 'middle';
  g.fillText(text, pad, H / 2 + 2);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: tex,
    // depthTest off: a tag for a planet on the far side of the star is still
    // the label of a thing the GM can see, and a name that vanishes behind
    // geometry is worse than one that floats over it.
    depthTest: false,
    transparent: true,
  }));
  // Height in feet, width from the canvas aspect so the text isn't squashed.
  const hFt = 9;
  sprite.scale.set(hFt * (w / H), hFt, 1);
  sprite.renderOrder = 20;
  return sprite;
}

// ── Obscuring clouds ─────────────────────────────────────────────────────────
//
// A cloud bank has to read as volume without being a solid: you look INTO it,
// things inside it are dimmed rather than cut off, and clicking through it must
// reach whatever is behind.
//
// Built from soft radial billboards rather than from geometry. A mesh cloud
// needs either a volumetric shader or a lot of triangles to avoid hard silhouette
// edges, and both cost more than this view can spare on something the GM will
// place five of. Overlapping soft sprites give the fluffy edge for free, and
// because each is a billboard the bank has no bad angle.
let cloudPuffTex = null;
function puffTexture() {
  if (cloudPuffTex) return cloudPuffTex;
  const N = 128;
  const c = document.createElement('canvas');
  c.width = N; c.height = N;
  const g = c.getContext('2d');
  // Two stops rather than a linear falloff: a straight gradient reads as a
  // glowing orb, while holding the centre near-opaque and letting the outer
  // half fall away fast reads as vapour.
  const grad = g.createRadialGradient(N / 2, N / 2, 0, N / 2, N / 2, N / 2);
  grad.addColorStop(0.0, 'rgba(255,255,255,0.95)');
  grad.addColorStop(0.45, 'rgba(255,255,255,0.55)');
  grad.addColorStop(1.0, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, N, N);
  cloudPuffTex = new THREE.CanvasTexture(c);
  cloudPuffTex.colorSpace = THREE.SRGBColorSpace;
  return cloudPuffTex;
}

// How a cloud piece fills its footprint in 3D.
//
// All six are the same billboard-scatter machinery differing only in where the
// puffs go and how big they are, which is deliberate: a cloud reads as vapour
// because of the soft overlapping sprites, and anything that swapped in real
// geometry for one form would look like a different material next to the rest.
//
//   spread   how far out puffs sit, as a fraction of the footprint
//   rise     vertical extent, as a fraction of the footprint's larger side
//   size     puff diameter range, same fraction
//   squash   puff height as a fraction of its width — flatter reads as haze
//   density  puff count relative to the default for the piece's size
//   ring     when set, puffs sit ON a circle of this radius instead of filling
//   axis     when set, puffs pinch in Z so the mass forms a slab
//   onGround the bank rests ON the board instead of straddling it
//
// The animation fields, all deliberately slow. A cloud that moves at a rate you
// can watch reads as smoke from a burning building; what sells vapour at a
// table is barely perceptible drift — you notice it has changed, not that it is
// moving. Every rate below is per SECOND against the piece's own span.
//
//   drift    horizontal wander, as a fraction of the span
//   bob      vertical wander, same units
//   spin     whole-bank rotation, radians/sec. Zero for the forms the GM AIMS
//            (a wall across a corridor, wisps blown one way) — turning those
//            would undo the placement's rotation.
//   breathe  how far the opacity swings, 0..1
//   churn    puffs travel up the shaft and recycle at the bottom (column only)
const CLOUD_FORMS = {
  // The default: a wide, slightly domed mass.
  bank:   { spread: 1.00, rise: 0.18, size: [0.35, 0.80], squash: 0.72, density: 1.0,
            drift: 0.030, bob: 0.020, spin: 0.010, breathe: 0.10 },
  // Low haze hugging the board. Wider, flatter, thicker on the ground, and the
  // puffs are pancakes — fog has no lit tops to catch a highlight.
  ground: { spread: 1.10, rise: 0.05, size: [0.40, 0.85], squash: 0.42, density: 1.5, onGround: true,
            // Creeps sideways more than it rises — ground fog rolls.
            drift: 0.045, bob: 0.005, spin: 0.006, breathe: 0.07 },
  // A pillar. Narrow footprint, tall rise — the one form whose vertical extent
  // is bigger than its horizontal one, so it needs far more puffs to stay
  // closed all the way up.
  column: { spread: 0.46, rise: 2.60, size: [0.34, 0.62], squash: 0.90, density: 2.6,
            // The only form with net motion rather than wander: smoke goes UP.
            churn: 0.085, drift: 0.020, spin: 0.13, breathe: 0.09 },
  // Torn shreds with board visible between them. Few, stretched, and faint.
  wisps:  { spread: 1.15, rise: 0.22, size: [0.30, 0.55], squash: 0.34, density: 0.45, alpha: 0.75, stretch: 2.4,
            // Fastest of the six — shreds are the bit of a cloud being blown
            // about, and they read as dead if they sit still.
            drift: 0.085, bob: 0.035, spin: 0, breathe: 0.18 },
  // A torus with an open middle.
  ring:   { spread: 1.00, rise: 0.14, size: [0.26, 0.44], squash: 0.70, density: 1.4, ringAt: 0.78, ringJitter: 0.16,
            // Rolling round its own axis is the whole character of a smoke ring.
            drift: 0.012, bob: 0.012, spin: 0.22, breathe: 0.10 },
  // A slab: full width along X, pinched hard in Z, standing taller than a bank.
  wall:   { spread: 1.00, rise: 0.55, size: [0.30, 0.58], squash: 0.95, density: 1.8, axis: 0.22,
            drift: 0.028, bob: 0.022, spin: 0, breathe: 0.11 },
};

// Advance one cloud to time `t` (seconds since the view opened).
//
// Per-puff sprite transforms, not a shader: these are Sprites sharing one
// material, so there is no per-instance value a shader could vary, and at
// 6–90 puffs a plain position write is far cheaper than the machinery to make
// it shader-side would be. Nothing here touches geometry, so there is no
// buffer upload — just a matrix per puff.
// A placement's animation speed. 1 is the tuned default, 0 is stopped; NULL
// (a row written before the column existed) is the default, not a stop.
function animSpeedOf(t) {
  const v = Number(t.anim_speed);
  return Number.isFinite(v) ? Math.max(0, Math.min(4, v)) : 1;
}

function animateCloud(group, t) {
  const a = group.userData.cloudAnim;
  if (!a) return;
  const { f, span, puffs, mat, baseOpacity } = a;
  // The caller sets the piece's own rotation AFTER building the group, so the
  // spin baseline can only be captured on the first frame.
  if (a.baseRotY === undefined) a.baseRotY = group.rotation.y;
  if (f.spin) group.rotation.y = a.baseRotY + t * f.spin;
  if (f.breathe) mat.opacity = baseOpacity * (1 - f.breathe + Math.sin(t * 0.33 + a.phase) * f.breathe);

  const drift = span * (f.drift || 0);
  const bob = span * (f.bob || 0);
  for (const p of puffs) {
    // Three different rates per puff so neighbours never travel in lockstep —
    // a whole bank sliding as one rigid body is the tell that gives away a
    // cheap cloud.
    p.s.position.x = p.bx + Math.sin(t * p.sp * 0.35 + p.ph) * drift;
    p.s.position.z = p.bz + Math.cos(t * p.sp * 0.28 + p.ph * 1.3) * drift;
    if (f.churn) {
      // A column recycles: each puff rides up the shaft and reappears at the
      // bottom. `ph` doubles as its starting height, so they are spread over
      // the whole travel from the first frame rather than setting off together.
      const H = span * f.rise;
      const u = ((t * f.churn + p.ph / (Math.PI * 2)) % 1 + 1) % 1;
      p.s.position.y = -H / 2 + u * H;
      // Taper at both ends so puffs grow in and shrink out instead of popping
      // into existence at the base and vanishing off the top.
      const fade = Math.min(1, Math.min(u, 1 - u) * 6);
      p.s.scale.set(p.sx * fade, p.sy * fade, 1);
    } else {
      p.s.position.y = p.by + Math.sin(t * p.sp * 0.5 + p.ph * 0.7) * bob;
    }
  }
}

// A cloud filling a footprint. `seed` keeps one placement's shape stable across
// rebuilds — without it the cloud reshuffles every time anyone takes a step,
// which is far more distracting than a cloud that never moves.
function makeCloudGroup({ widthFt, depthFt, seed, opacity = 1, tint = 0xdfe8f5, form = 'bank' }) {
  const f = CLOUD_FORMS[form] || CLOUD_FORMS.bank;
  const group = new THREE.Group();
  const span = Math.max(widthFt, depthFt);
  // Enough puffs to close the gaps, scaled by the form (a column has to fill a
  // tall shaft), capped so a GM who stretches a cloud across the whole board
  // doesn't drop the frame rate doing it.
  const count = Math.max(6, Math.min(90, Math.round((span / 12) * f.density)));
  // Deterministic PRNG from the placement's own id — same cloud every rebuild.
  let st = (seed >>> 0) || 1;
  const rnd = () => {
    st ^= st << 13; st >>>= 0;
    st ^= st >> 17;
    st ^= st << 5; st >>>= 0;
    return st / 4294967296;
  };
  const mat = new THREE.SpriteMaterial({
    map: puffTexture(),
    color: new THREE.Color(tint),
    transparent: true,
    opacity: 0.3 * opacity * (f.alpha ?? 1),
    // The two properties that make it non-solid. depthWrite:false lets every
    // puff blend with the ones behind it instead of clipping them, and keeps
    // the bank from occluding tokens in the depth buffer.
    depthWrite: false,
  });
  // The puff texture is a module-level canvas shared by every cloud ever
  // drawn. Flag it so the geometry pass's teardown disposes the material but
  // leaves the texture alone.
  mat.userData.sharedMap = true;
  const [sizeMin, sizeMax] = f.size;
  const puffs = [];
  for (let i = 0; i < count; i++) {
    const puff = new THREE.Sprite(mat);
    const a = rnd() * Math.PI * 2;
    // sqrt gives an even area fill; a ring form ignores it and sits the puffs
    // on the circle instead, which is what leaves the middle open.
    const r = f.ringAt != null
      ? f.ringAt + (rnd() - 0.5) * f.ringJitter
      : Math.sqrt(rnd()) * f.spread;
    const size = span * (sizeMin + rnd() * (sizeMax - sizeMin));
    puff.scale.set(size * (f.stretch || 1), size * f.squash, 1);
    puff.position.set(
      Math.cos(a) * r * (widthFt / 2),
      (rnd() - 0.5) * span * f.rise,
      // A slab pinches its depth so the mass forms a wall across the footprint
      // rather than filling it. The placement's own rotation aims it.
      Math.sin(a) * r * (depthFt / 2) * (f.axis || 1),
    );
    puff.renderOrder = 12;
    // Resting transform, so the animator wanders AROUND the shape the form
    // asked for rather than integrating away from it.
    puffs.push({
      s: puff,
      bx: puff.position.x, by: puff.position.y, bz: puff.position.z,
      sx: puff.scale.x, sy: puff.scale.y,
      ph: rnd() * Math.PI * 2,
      sp: 0.6 + rnd() * 0.8,
    });
    group.add(puff);
  }
  group.userData.cloudAnim = {
    f, span, puffs, mat,
    baseOpacity: mat.opacity,
    // Two clouds of the same form on one map must not breathe in unison.
    phase: rnd() * Math.PI * 2,
  };
  // Ground fog sits ON the board rather than straddling it, so the whole bank
  // is lifted by half its own thickness — otherwise half of it is under the
  // floor and the visible half looks thinner than it was asked to be.
  if (f.onGround) group.position.y += span * f.rise * 0.5;
  // Clicks pass straight through — the raycast never considers a cloud, so it
  // can't take a drag meant for the token standing in it.
  group.userData.noRaycast = true;
  return group;
}

// How high a storey's floor sits, in feet: the heights of everything under it.
//
// Only meaningful when the levels are STACKED. Viewing one floor on its own
// draws it at zero — you are looking at that floor, and putting it thirty feet
// up would just move the camera's problem somewhere else.
//
// The sum itself lives in utils/levelFloor.js, shared with the flat map: the
// same heights decide which storey a flier is level with, and two copies of
// "how tall is this building" would eventually disagree.
function levelBaseY(levels, index) {
  return levelBaseFt(levels, index);
}

// ── Wall colour, sampled from the map art ────────────────────────────────────
//
// A .dd2vtt carries NO colour for its walls — `line_of_sight` is bare
// coordinates, with no material, no thickness and no style. The only place a
// wall's colour exists is the map image itself, where it was drawn. So the art
// is read back: sample the pixels along a wall segment and that is what the
// wall is made of.
//
// Sampled from a DOWNSCALED copy. A Dungeondraft export is routinely 4000px
// across, and a full-resolution ImageData is tens of megabytes held for the
// life of the map — for a value that is one averaged colour per wall. At 1024
// wide the average is indistinguishable and the buffer is a twentieth the size.
const WALL_SAMPLE_WIDTH = 1024;
const wallSamplerCache = new Map(); // url -> { data, w, h } | null | 'loading'

function getWallSampler(url, onReady) {
  if (!url) return null;
  const hit = wallSamplerCache.get(url);
  if (hit === 'loading') return null;
  if (hit !== undefined) return hit;

  wallSamplerCache.set(url, 'loading');

  // Decoded straight to the size we need, never at full size.
  //
  // A Dungeondraft storey is routinely 3840x9216 — 35 megapixels. Desktop
  // browsers decode that; phones and tablets do not. iOS in particular refuses
  // images past roughly 16 Mpx, and the failure is silent: the load simply
  // errors, the sampler caches nothing, and every wall falls back to grey. That
  // is why this went wrong for players and not for the GM — it was never about
  // the map or the maths, it was the size of the picture and the device asked
  // to decode it.
  //
  // createImageBitmap with resizeWidth downsamples DURING decode, so the
  // full-resolution bitmap never has to exist. Height follows automatically to
  // preserve the aspect ratio.
  const finish = (data, w, h) => {
    // A failure is NOT cached, for the reason spelled out in tokenImageFor: a
    // wall whose art could not be read once would have stayed grey for the life
    // of the page, even after the file appeared. Leaving the key absent means
    // the next geometry rebuild tries again.
    if (data) wallSamplerCache.set(url, { data, w, h });
    else wallSamplerCache.delete(url);
    onReady?.();
  };

  const viaImageBitmap = async () => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const bmp = await createImageBitmap(blob, {
      resizeWidth: WALL_SAMPLE_WIDTH,
      resizeQuality: 'low',
    });
    const c = document.createElement('canvas');
    c.width = bmp.width; c.height = bmp.height;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(bmp, 0, 0);
    bmp.close?.();
    return { data: g.getImageData(0, 0, c.width, c.height), w: c.width, h: c.height };
  };

  // The old path, for anything without createImageBitmap. It decodes at full
  // size and so carries the same limit, but a browser that lacks the modern
  // call is unlikely to be the one hitting it.
  const viaImage = () => new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const nw = img.naturalWidth || 1;
      const nh = img.naturalHeight || 1;
      const scale = Math.min(1, WALL_SAMPLE_WIDTH / nw);
      const w = Math.max(1, Math.round(nw * scale));
      const h = Math.max(1, Math.round(nh * scale));
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(img, 0, 0, w, h);
      try {
        resolve({ data: g.getImageData(0, 0, w, h), w, h });
      } catch (err) { reject(err); }
    };
    img.onerror = () => reject(new Error('image load failed'));
    img.src = url;
  });

  (typeof createImageBitmap === 'function' ? viaImageBitmap() : viaImage())
    .catch(() => viaImage())
    .then(({ data, w, h }) => finish(data, w, h))
    .catch((err) => {
      console.warn('[3D walls] could not read', url, '-', err.message);
      finish(null, 0, 0);
    });

  return null;
}

// The colour a wall falls back to when its art cannot be read — see the
// warning in getWallSampler for the reasons that happens.
const WALL_FALLBACK = new THREE.Color('#8a8580');

// Map pixel -> pixel in the sampled image.
//
// `rect` is where that image SITS in map space. For a plain map it is the whole
// board, but a storey of a building is a smaller canvas placed at an offset —
// and treating one as the other put every upper floor's samples in the wrong
// place entirely, drifting further out the further a point was from the middle.
function toSamplePx(sampler, rect, mx, my) {
  const { w, h } = sampler;
  const rw = rect.w || 1;
  const rh = rect.h || 1;
  return {
    px: Math.round(((mx - rect.x) / rw) * w),
    py: Math.round(((my - rect.y) / rh) * h),
  };
}

// How opaque the art is at a map point, 0–255. Outside the image counts as
// fully transparent.
function alphaAt(sampler, rect, mx, my) {
  if (!sampler) return 255;
  const { data, w, h } = sampler;
  const { px, py } = toSamplePx(sampler, rect, mx, my);
  if (px < 0 || py < 0 || px >= w || py >= h) return 0;
  return data.data[(py * w + px) * 4 + 3];
}

// Bumped whenever a wall had to fall back to the default colour, and reset per
// build. Two very different failures land on the same grey — the image not
// being readable at all, and the image being readable but transparent where the
// wall is — and telling them apart from a screenshot is impossible.
let wallSampleMisses = 0;
let wallSampleNoSampler = 0;

function sampleWallColor(sampler, rect, x1, y1, x2, y2) {
  if (!sampler) { wallSampleNoSampler++; return WALL_FALLBACK.clone(); }
  const { data, w, h } = sampler;
  const SAMPLES = 7;
  let r = 0, g = 0, b = 0, n = 0;
  for (let i = 0; i < SAMPLES; i++) {
    const t = (i + 0.5) / SAMPLES;
    const { px, py } = toSamplePx(sampler, rect, x1 + (x2 - x1) * t, y1 + (y2 - y1) * t);
    if (px < 0 || py < 0 || px >= w || py >= h) continue;
    const o = (py * w + px) * 4;
    if (data.data[o + 3] < 8) continue;
    r += data.data[o]; g += data.data[o + 1]; b += data.data[o + 2]; n++;
  }
  if (!n) { wallSampleMisses++; return WALL_FALLBACK.clone(); }
  // sRGB in, linear out — the renderer works in linear space, and handing it
  // raw bytes makes every wall come out wrong.
  //
  // The conversion happens ONCE, inside setRGB, by telling it what space the
  // numbers are already in. It used to be setRGB(...).convertSRGBToLinear(),
  // which converts TWICE: three's colour management (on by default since r152)
  // takes bare setRGB values to be in the working space — linear — so the
  // explicit convert was applied to a value that had already been treated as
  // converted. A mid brown at 0.43 came out at 0.43^2.2 ≈ 0.15, and every wall
  // rendered as a dark, washed-out slab regardless of what colour it had been
  // sampled from.
  return new THREE.Color().setRGB(r / n / 255, g / n / 255, b / n / 255, THREE.SRGBColorSpace);
}

// Every wall on a storey as ONE mesh.
//
// A Dungeondraft export runs to thousands of segments, and a mesh each would be
// thousands of draw calls for a building. They share one geometry with per-
// vertex colours instead, so each wall keeps the colour it was sampled at while
// the whole floor costs a single draw.
function buildWallMesh(segs, colors, heightFt, baseY) {
  const n = segs.length;
  if (!n) return null;
  const pos = new Float32Array(n * 18);   // 2 triangles * 3 verts * 3 floats
  const col = new Float32Array(n * 18);
  for (let i = 0; i < n; i++) {
    const [ax, az, bx, bz] = segs[i];
    const c = colors[i];
    const y0 = baseY;
    const y1 = baseY + heightFt;
    // Two triangles spanning the segment, standing up.
    const quad = [
      ax, y0, az,  bx, y0, bz,  bx, y1, bz,
      ax, y0, az,  bx, y1, bz,  ax, y1, az,
    ];
    pos.set(quad, i * 18);
    for (let v = 0; v < 6; v++) {
      col[i * 18 + v * 3 + 0] = c.r;
      col[i * 18 + v * 3 + 1] = c.g;
      col[i * 18 + v * 3 + 2] = c.b;
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.92,
    metalness: 0.02,
    // A wall is a flat sheet here, so both faces have to draw — you stand on
    // either side of it.
    side: THREE.DoubleSide,
  }));
}

// ── Wildspace gates ──────────────────────────────────────────────────────────
//
// A ring you fly a ship through, standing upright in space. The flat map draws
// it as a symbol seen from above; in 3D that symbol lying on the floor is the
// same "picture of the thing that should be standing here" problem the suns and
// the planets had, and the fix is the same — build the actual object.
//
// Procedural rather than an imported mesh, for the same reason the planets are:
// a gate is almost entirely revolved geometry and nine repeated brackets, which
// is a few hundred bytes of maths against a multi-megabyte .glb, and it stays
// crisp whether the marker is a speck on an overland map or filling the screen.
// (A GM who wants their OWN gate can still attach a .glb — that's the `model`
// shape.)
//
// Built in the XY plane so the hole faces ±Z, which is a ring standing upright
// with no rotation applied. The placement's own rotation then aims it.
let gateGlyphTex = null;
function gateGlyphTexture() {
  if (gateGlyphTex) return gateGlyphTex;
  const W = 1024, H = 64;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = '#2f3540';
  g.fillRect(0, 0, W, H);
  // Marks, not letters. At the size this band is ever seen, a real alphabet
  // would be mush — what reads is the RHYTHM of engraved shapes around the
  // ring, so these are strokes of varied weight at a regular pitch.
  const N = 39;
  let st = 0x9e3779b9;
  const rnd = () => { st ^= st << 13; st >>>= 0; st ^= st >> 17; st ^= st << 5; st >>>= 0; return st / 4294967296; };
  for (let i = 0; i < N; i++) {
    const cx = (i + 0.5) * (W / N);
    g.save();
    g.translate(cx, H / 2);
    g.strokeStyle = '#8d97a8';
    g.lineWidth = 2.5 + rnd() * 2;
    g.lineCap = 'round';
    const arms = 2 + Math.floor(rnd() * 3);
    for (let a = 0; a < arms; a++) {
      const ang = rnd() * Math.PI * 2;
      const len = 8 + rnd() * 14;
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(Math.cos(ang) * len, Math.sin(ang) * len * 0.8);
      g.stroke();
    }
    if (rnd() > 0.5) {
      g.beginPath();
      g.arc(0, 0, 4 + rnd() * 4, 0, Math.PI * 2);
      g.stroke();
    }
    g.restore();
  }
  gateGlyphTex = new THREE.CanvasTexture(c);
  gateGlyphTex.colorSpace = THREE.SRGBColorSpace;
  gateGlyphTex.wrapS = THREE.RepeatWrapping;
  return gateGlyphTex;
}

// One chevron bracket, apex pointing down its own -Y so it can be rotated to
// face the ring's centre.
function gateChevronGeometry(w, h, depth) {
  const shape = new THREE.Shape();
  shape.moveTo(-w, h);
  shape.lineTo(w, h);
  shape.lineTo(w, 0);
  shape.lineTo(0, -h * 0.85);
  shape.lineTo(-w, 0);
  shape.closePath();
  return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
}

// The shimmering surface inside the ring.
//
// Not a texture: the whole character of it is that it never repeats and never
// settles, and a looping canvas animation at this size reads as a GIF. Two
// noise fields at different scales and drift rates give the slow churn, and a
// travelling radial term gives the ripples running out from the middle.
function makeGateHorizonMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uDeep: { value: new THREE.Color('#0b2f6b') },
      uLit:  { value: new THREE.Color('#7fd4ff') },
      // Driven only by the activation sequence: 0 is the settled puddle, 1 is
      // the white-hot surface at the moment the gate opens. Shared with the
      // surge cone, which uses this same material so the two are visibly the
      // same substance.
      uFlash: { value: 0 },
      uIsCone: { value: 0 },
      // Radius of the hole eaten out of the middle of the surface, 0..1 of the
      // disc. 0 is an intact puddle; 1 has consumed everything out to the ring.
      // Only the closing sequence touches it.
      uHole: { value: 0 },
    },
    transparent: true,
    // Blends over whatever is behind rather than punching a hole in the depth
    // buffer — the far side of the ring stays visible through the surface,
    // which is what makes it read as a puddle and not a painted disc.
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: false,
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vNrm;
      varying vec3 vView;
      void main() {
        vUv = uv;
        vNrm = normalize(normalMatrix * normal);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vView = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uDeep;
      uniform vec3 uLit;
      uniform float uFlash;
      uniform float uIsCone;
      uniform float uHole;
      varying vec2 vUv;
      varying vec3 vNrm;
      varying vec3 vView;
      ${NOISE_GLSL}
      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        // Outside the disc entirely — CircleGeometry is a polygon, and without
        // this the corners of the UV square would show at low segment counts.
        //
        // The surge cone shares this material but its UVs wrap a cone rather
        // than a disc, so the radial test would cut most of it away. uIsCone
        // swaps in a length-wise fade instead: bright at the mouth, thinning to
        // nothing at the tip.
        // The hole is cut here rather than by shrinking the mesh, so the
        // surface stays exactly where it is and is EATEN — the rim of the
        // puddle never moves, only the void inside it grows.
        if (uIsCone < 0.5 && (r > 1.0 || r < uHole)) discard;

        float churn = fbm(vec3(p * 2.1, uTime * 0.10));
        float fine  = fbm(vec3(p * 6.5, uTime * 0.22));
        // Ripples running outward. Fading them with r keeps the middle busy
        // and the rim calm, so the eye reads it as coming FROM somewhere.
        float ring  = sin(r * 22.0 - uTime * 2.2) * 0.5 + 0.5;

        float v = churn * 0.55 + fine * 0.28 + ring * 0.17 * (1.0 - r * 0.6);
        vec3 col = mix(uDeep, uLit, smoothstep(0.30, 0.78, v));
        // Bright lip where the surface meets the ring, and a soft edge so it
        // doesn't cut off against the inner rim with a hard line.
        col += uLit * smoothstep(0.86, 1.0, r) * 0.55;
        // Disc: fade at the rim. Cone: fade along its length, so the surge is
        // dense at the mouth and dissolves at the tip rather than ending in a
        // hard point.
        float a;
        if (uIsCone < 0.5) {
          a = 0.80 * smoothstep(1.0, 0.94, r);
        } else {
          // Along the plume: a smoothstep rather than a power curve, so it
          // thins to nothing well before the geometry ends. The nose is gone
          // before the mesh gets there, which is what stops it reading as a
          // spike with a point on it.
          float len = clamp(vUv.y, 0.0, 1.0);
          a = 0.85 * smoothstep(1.0, 0.08, len);
          // And across it: fade where the surface turns edge-on to the camera.
          // That edge IS the silhouette, so softening it dissolves the hard
          // outline the shape would otherwise be drawn with.
          float facing = abs(dot(normalize(vNrm), normalize(vView)));
          a *= mix(0.35, 1.0, smoothstep(0.0, 0.55, facing));
          // A little extra body near the mouth, so the plume still looks like
          // it is being forced out of the ring rather than merely hanging there.
          a *= 1.0 + (1.0 - len) * 0.45;
        }
        // Opening flash: the surface blows out towards white and goes opaque,
        // then falls back to the puddle as the sequence settles.
        col = mix(col, vec3(1.0), uFlash * 0.72);
        a = mix(a, min(1.0, a + 0.35), uFlash);
        // A hot edge riding the hole outward, so the boundary reads as the
        // surface being consumed rather than simply clipped. Gated on the hole
        // actually being open — without the step, an intact puddle would wear a
        // white blob at its centre, where r is near zero anyway.
        float eatOn = step(0.001, uHole);
        float eat = (1.0 - smoothstep(0.0, 0.13, r - uHole)) * eatOn;
        col += vec3(1.0, 0.95, 0.85) * eat * 0.85;
        a = min(1.0, a + eat * 0.45);
        gl_FragColor = vec4(col, a);
      }
    `,
  });
}

// A gate of the given OUTER radius, in feet. Returns the group plus the
// horizon material, which the animation loop drives.
// How long the opening sequence runs, in seconds. Lives out here because the
// animation loop needs it to know when a gate has finished opening, and the
// builder needs it to know when to fall back to the idle look — two copies of
// that number would drift the first time the timing was tuned.
const GATE_ACTIVATION_SECONDS = 4.6;
// And how long it takes to close. Much shorter than opening on purpose: a gate
// is dialled open ceremonially and shuts in an instant.
const GATE_SHUTDOWN_SECONDS = 1.35;

// `active` is the gate running or dormant.
//
// Dormant is not "the same gate, dimmer": the event horizon is ABSENT, so the
// ring is empty and you see straight through it to whatever is on the far side.
// That hole is the whole read — a dark disc still looks like a closed door,
// while an empty ring looks like a gate waiting to be opened.
// `shuttingDown` is the awkward case that shapes this whole function: the gate
// is OFF, but its closing animation is still playing, so it must be built with
// the surface it is in the middle of losing. Without it the flip would rebuild
// the gate as a bare dormant ring and there would be nothing left to collapse.
function makeGateGroup(radiusFt, { ghost = false, active = true, shuttingDown = false } = {}) {
  const group = new THREE.Group();
  const R = radiusFt;
  // Lit metal and a surface exist while closing as well as while running.
  //
  // NOT called `lit`: the chevron loop below declares its own `const lit` for
  // the inset material, and a same-named outer binding would be shadowed by it
  // inside that block — read before its own initialiser, which is a TDZ throw,
  // not a fallback to the outer one.
  const powered = active || shuttingDown;
  const metal = new THREE.MeshStandardMaterial({
    // Cold, unlit metal when dormant. The ring is the same object either way,
    // so the difference has to be carried by how it catches the light.
    color: powered ? 0x6f7987 : 0x4a515c,
    roughness: powered ? 0.42 : 0.62,
    metalness: 0.85,
    transparent: ghost, opacity: ghost ? 0.45 : 1,
  });

  // Outer ring.
  const ring = new THREE.Mesh(new THREE.TorusGeometry(R * 0.90, R * 0.10, 18, 96), metal);
  group.add(ring);

  // Inner glyph band, set slightly proud of the ring's inner face.
  const glyphMat = new THREE.MeshStandardMaterial({
    map: gateGlyphTexture(),
    color: 0xb9c2d0, roughness: 0.55, metalness: 0.65,
    transparent: ghost, opacity: ghost ? 0.45 : 1,
  });
  glyphMat.userData.sharedMap = true;
  const band = new THREE.Mesh(new THREE.TorusGeometry(R * 0.80, R * 0.045, 14, 96), glyphMat);
  group.add(band);

  // Nine chevrons, one at the top. Evenly spaced rather than the screen-
  // accurate asymmetric layout: at the size a marker is actually viewed, even
  // spacing reads as deliberate and the real layout reads as a mistake.
  // Kept in dialling order — index 0 is the top chevron — so the activation
  // sequence can lock them one at a time.
  const chevronMats = [];
  const chevW = R * 0.11, chevH = R * 0.15, chevD = R * 0.09;
  const chevGeo = gateChevronGeometry(chevW, chevH, chevD);
  const inset = gateChevronGeometry(chevW * 0.52, chevH * 0.52, chevD * 0.9);
  for (let i = 0; i < 9; i++) {
    const ang = Math.PI / 2 + (i * Math.PI * 2) / 9;
    const holder = new THREE.Group();
    holder.position.set(Math.cos(ang) * R * 0.96, Math.sin(ang) * R * 0.96, -chevD / 2);
    // The shape's apex is its own -Y; turn that to face the ring's centre.
    holder.rotation.z = ang + Math.PI / 2;
    holder.add(new THREE.Mesh(chevGeo, metal));
    // The lit inset. Only the top one burns bright — a gate with all nine
    // locked reads as active, and these are landmarks on a map, not a dialling
    // sequence.
    // Only the top chevron burns, and only while the gate is running. A
    // dormant gate has none of them lit, which is the fastest way to read its
    // state from across the table.
    const burning = powered && i === 0;
    const lit = new THREE.MeshStandardMaterial({
      color: burning ? 0xffb43a : 0x6a4a1c,
      emissive: burning ? 0xff9d1c : 0x2a1e0c,
      emissiveIntensity: burning ? 1.5 : (powered ? 0.35 : 0.12),
      roughness: 0.5, metalness: 0.2,
      transparent: ghost, opacity: ghost ? 0.45 : 1,
    });
    const insetMesh = new THREE.Mesh(inset, lit);
    insetMesh.position.z = chevD * 0.55;
    holder.add(insetMesh);
    chevronMats.push(lit);
    group.add(holder);
  }

  // Steady values for the chevrons, so the settle phase has somewhere to land
  // and the idle state has a single definition.
  const chevronSteady = (i) => (i === 0
    ? { color: 0xffb43a, emissive: 0xff9d1c, intensity: 1.5 }
    : { color: 0x6a4a1c, emissive: 0x2a1e0c, intensity: active ? 0.35 : 0.12 });

  const applyChevron = (i, colorHex, emissiveHex, intensity) => {
    const m = chevronMats[i];
    if (!m) return;
    m.color.setHex(colorHex);
    m.emissive.setHex(emissiveHex);
    m.emissiveIntensity = intensity;
  };

  // No surface at all when dormant AND not mid-close — and therefore nothing
  // to animate.
  if (!powered) return { group, update: null };

  const horizonMat = makeGateHorizonMaterial();
  if (ghost) horizonMat.uniforms.uLit.value.multiplyScalar(0.5);
  const horizon = new THREE.Mesh(new THREE.CircleGeometry(R * 0.79, 72), horizonMat);
  horizon.renderOrder = 2;
  group.add(horizon);

  // ── The surge ──────────────────────────────────────────────────────────────
  //
  // The burst that erupts from the gate as it opens and is pulled back in. A
  // cone built base-first at the ring's plane and extended along +Z, sharing
  // the horizon's own material so the two are obviously the same substance.
  //
  // Only ever out ONE face. The eruption has a direction; making it symmetrical
  // to cover the case of a camera behind the gate would turn a violent event
  // into a decoration.
  // A bell, not a cone.
  //
  // ConeGeometry gives a straight taper to a mathematical point, and both of
  // those read as hard: the straight side is a drawn edge and the point is a
  // spike. This revolves a curved profile instead — full width at the mouth,
  // easing outward first and then closing to a ROUNDED nose, the way something
  // forced through an opening actually billows.
  //
  // cos^0.55 is the shape doing that work: it leaves the mouth almost
  // vertically (so there is no sharp corner where the plume meets the ring)
  // and approaches the tip tangentially rather than converging on it.
  // How wide the plume is at its mouth, against the ring's aperture (R * 0.79).
  //
  // Deliberately well inside it. At full aperture the burst emerges as the
  // whole surface lifting off, and touches the ring on its way — what should
  // read as a wave leaving the CENTRE instead reads as the entire puddle
  // erupting. Kept clear of the rim, the surrounding surface stays visible as
  // the thing the wave is coming out of.
  const SURGE_R = R * 0.50;
  const SURGE_SEG = 28;
  const surgeProfile = [];
  for (let i = 0; i <= SURGE_SEG; i++) {
    const u = i / SURGE_SEG;
    const rad = Math.pow(Math.cos(u * Math.PI * 0.5), 0.55);
    // A slight flare just past the mouth — a plume is widest a little way out,
    // not at the aperture. Trimmed along with the radius so the widest point
    // still clears the ring.
    const flare = 1 + Math.sin(u * Math.PI) * 0.12;
    surgeProfile.push(new THREE.Vector2(Math.max(rad * flare, 1e-4) * SURGE_R, u));
  }
  const surgeGeo = new THREE.LatheGeometry(surgeProfile, 48);
  // Its OWN material instance, not the horizon's. uIsCone is a single uniform
  // per material and the two meshes need opposite values for it, so sharing one
  // would cut whichever of them lost. Same shader, same look; the update below
  // drives both clocks together.
  const surgeMat = makeGateHorizonMaterial();
  surgeMat.uniforms.uIsCone.value = 1;
  if (ghost) surgeMat.uniforms.uLit.value.multiplyScalar(0.5);
  const surge = new THREE.Mesh(surgeGeo, surgeMat);
  // +Y becomes +Z: out through the FRONT of the ring, the same face the lit
  // chevron insets protrude from.
  //
  // This was -PI/2, which maps +Y to -Z — the plume erupted out of the back
  // while the chevrons lit on the front, so the two halves of the sequence
  // played on opposite sides of the gate.
  surge.rotation.x = Math.PI / 2;
  surge.renderOrder = 2;
  surge.visible = false;
  group.add(surge);

  // A bright ring thrown outward at the moment of opening.
  const shockMat = new THREE.MeshBasicMaterial({
    color: 0xbfe6ff, transparent: true, opacity: 0,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  });
  const shock = new THREE.Mesh(new THREE.RingGeometry(R * 0.80, R * 0.92, 64), shockMat);
  shock.renderOrder = 5;
  shock.visible = false;
  group.add(shock);

  // ── Activation timings, in seconds ────────────────────────────────────────
  //
  // Read as a script: nine chevrons lock in turn, a beat of silence, the surge
  // erupts and is drawn back, then the surface settles. The pause before the
  // eruption is doing more work than any of the moving parts — without it the
  // burst is just the last chevron continuing, and the whole thing reads as one
  // undifferentiated flash.
  const CHEV_EACH = 0.26;
  const CHEV_END = CHEV_EACH * 9;              // 2.34
  const IRIS_AT = CHEV_END + 0.08;             // 2.42
  const IRIS_DUR = 0.50;                       // -> 2.92
  const BURST_AT = IRIS_AT + IRIS_DUR + 0.08;  // 3.00
  const BURST_OUT = 0.42;
  const BURST_BACK = 0.46;                     // -> 3.88
  const SETTLE_END = GATE_ACTIVATION_SECONDS;  // 4.6

  const idle = () => {
    // `active` is the RESTING state, which is not the same as whether a surface
    // exists: after a close plays out the mesh is still here and simply must
    // not be drawn.
    horizon.visible = active;
    // The ring was built with lit metal so it could be seen closing. Once the
    // close has played out it has to go cold, and the next geometry rebuild may
    // be a long way off on a board where nothing is moving.
    metal.color.setHex(active ? 0x6f7987 : 0x4a515c);
    metal.roughness = active ? 0.42 : 0.62;
    horizon.scale.setScalar(1);
    surge.visible = false;
    shock.visible = false;
    horizonMat.uniforms.uFlash.value = 0;
    horizonMat.uniforms.uHole.value = 0;
    surgeMat.uniforms.uFlash.value = 0;
    for (let i = 0; i < chevronMats.length; i++) {
      const st = chevronSteady(i);
      applyChevron(i, st.color, st.emissive, st.intensity);
    }
  };

  return {
    group,
    // `act` is seconds since the gate was opened, or null when it has simply
    // been running. Null is the overwhelmingly common case — a gate that was
    // already open when the view loaded must not replay its opening.
    update: (t, act, shut) => {
      horizonMat.uniforms.uTime.value = t;
      surgeMat.uniforms.uTime.value = t;
      // Per-frame reset. Both sequences drive uHole — the close opens one out
      // to the rim, the open irises one back in — so it is cleared here and
      // whichever branch owns this frame sets it explicitly. Left alone, a hole
      // from an interrupted sequence would persist into the idle look.
      horizonMat.uniforms.uHole.value = 0;

      // ── Closing ────────────────────────────────────────────────────────────
      //
      // Deliberately much faster than opening. The surface swells once — the
      // gate straining — then a hole opens at its centre and eats outward until
      // it reaches the ring and nothing is left, with the chevrons going dark
      // from the bottom back up to the top, the reverse of the order they
      // locked in.
      //
      // The opening sequence runs this same hole backwards for its iris, which
      // is what makes the two read as one mechanism working in both directions.
      if (shut != null && shut < GATE_SHUTDOWN_SECONDS) {
        surge.visible = false;
        const SWELL = 0.25;
        const EAT = 0.75;

        // Chevrons unlock in reverse, over the swell and the eat together.
        const n = chevronMats.length;
        for (let i = 0; i < n; i++) {
          // Index 0 is the top chevron and goes out LAST.
          const order = n - 1 - i;
          const at = 0.06 + order * 0.072;
          if (shut < at) {
            const fade = 1 - Math.min(1, shut / (SWELL + EAT)) * 0.35;
            applyChevron(i, i === 0 ? 0xffb43a : 0x6a4a1c, i === 0 ? 0xff9d1c : 0x2a1e0c,
              (i === 0 ? 1.5 : 0.35) * fade);
          } else {
            applyChevron(i, 0x6a4a1c, 0x2a1e0c, 0.12);
          }
        }

        horizon.visible = true;
        horizon.scale.setScalar(1);
        if (shut < SWELL) {
          // The gate strains: brighter, but still whole.
          const u = shut / SWELL;
          horizonMat.uniforms.uHole.value = 0;
          horizonMat.uniforms.uFlash.value = u * 0.5;
          shock.visible = false;
        } else if (shut < SWELL + EAT) {
          const u = (shut - SWELL) / EAT;
          // Smoothstep at BOTH ends: the hole opens gently rather than
          // punching through, and arrives at the ring without slamming into it.
          const e = u * u * (3 - 2 * u);
          // Just past 1 at the finish, so the last sliver of surface at the
          // very rim is genuinely consumed instead of being left as a hairline.
          horizonMat.uniforms.uHole.value = e * 1.04;
          horizonMat.uniforms.uFlash.value = 0.5 + 0.35 * e;
          shock.visible = false;
        } else {
          // Nothing left. A ripple carries on outward past the ring and fades.
          const u = (shut - SWELL - EAT) / (GATE_SHUTDOWN_SECONDS - SWELL - EAT);
          horizon.visible = false;
          horizonMat.uniforms.uHole.value = 0;
          shock.visible = true;
          shock.scale.setScalar(1 + u * 0.55);
          shockMat.opacity = 0.5 * (1 - u);
        }
        return;
      }

      if (act == null || act >= SETTLE_END) { idle(); return; }

      // Chevrons lock in turn, each flaring white-hot for a moment.
      for (let i = 0; i < chevronMats.length; i++) {
        const at = i * CHEV_EACH;
        if (act < at) {
          applyChevron(i, 0x6a4a1c, 0x2a1e0c, 0.12);
          continue;
        }
        const since = act - at;
        const flare = Math.max(0, 1 - since / 0.22);
        // Locked chevrons all stay lit through the sequence and only fade back
        // to the resting look during the settle — a gate that has just opened
        // should look engaged, not immediately idle.
        const settleT = Math.max(0, Math.min(1, (act - (BURST_AT + BURST_OUT + BURST_BACK)) / 0.7));
        const st = chevronSteady(i);
        const litColor = 0xffd08a, litEm = 0xffb43a;
        applyChevron(
          i,
          settleT > 0.5 ? st.color : litColor,
          settleT > 0.5 ? st.emissive : litEm,
          (1.2 + flare * 3.2) * (1 - settleT) + st.intensity * settleT,
        );
      }

      if (act < IRIS_AT) {
        // Nothing in the ring yet — the gate is still dialling.
        horizon.visible = false;
        surge.visible = false;
        shock.visible = false;
        return;
      }

      // ── The iris ───────────────────────────────────────────────────────────
      //
      // The closing animation's hole, run backwards: it starts at the ring and
      // shrinks to nothing, so the surface forms from the RIM INWARD and seals
      // at the centre. The hot edge the shader draws at the hole boundary comes
      // along for free and now rides inward, which is what makes this read as
      // the surface being drawn in rather than merely faded up.
      //
      // Sealing at the centre is also what earns the burst: the wave leaves
      // from the exact point the last of the surface closed over.
      if (act < IRIS_AT + IRIS_DUR) {
        const u = (act - IRIS_AT) / IRIS_DUR;
        const e = u * u * (3 - 2 * u);
        horizon.visible = true;
        horizon.scale.setScalar(1);
        // 1.05 rather than 1 at the start, so the very rim is genuinely empty
        // instead of showing a hairline of surface before it begins.
        horizonMat.uniforms.uHole.value = 1.05 * (1 - e);
        horizonMat.uniforms.uFlash.value = 0.25 + 0.35 * e;
        surge.visible = false;
        shock.visible = false;
        return;
      }

      horizon.visible = true;
      horizon.scale.setScalar(1);
      horizonMat.uniforms.uHole.value = 0;

      if (act < BURST_AT) {
        // Sealed, holding, about to give. A beat this short is barely a pause
        // and entirely the point: it separates the seal from the burst so the
        // two read as cause and effect rather than one continuous motion.
        horizonMat.uniforms.uFlash.value = 0.6;
        surge.visible = false;
        shock.visible = false;
        return;
      }

      const b = act - BURST_AT;
      if (b < BURST_OUT) {
        const u = b / BURST_OUT;
        // Eased out hard at the start: the surge leaves fast and decelerates.
        const e = 1 - Math.pow(1 - u, 3);
        surge.visible = true;
        surge.scale.set(1, R * 2.3 * e, 1);
        // The surface bulges as it lets go, rather than growing from nothing —
        // it is already whole by this point.
        horizon.scale.setScalar(1 + 0.12 * Math.sin(u * Math.PI));
        horizonMat.uniforms.uFlash.value = 1.0;
        surgeMat.uniforms.uFlash.value = 1.0;
        shock.visible = true;
        shock.scale.setScalar(1 + e * 1.9);
        shockMat.opacity = (1 - u) * 0.85;
      } else if (b < BURST_OUT + BURST_BACK) {
        const u = (b - BURST_OUT) / BURST_BACK;
        const e = u * u;                       // snaps back at the end
        surge.visible = true;
        surge.scale.set(1, R * 2.3 * (1 - e), 1);
        horizon.scale.setScalar(1 + 0.10 * (1 - e));
        horizonMat.uniforms.uFlash.value = 1.0 - u * 0.55;
        surgeMat.uniforms.uFlash.value = 1.0 - u * 0.55;
        shock.visible = false;
      } else {
        const u = Math.min(1, (b - BURST_OUT - BURST_BACK) / 0.7);
        surge.visible = false;
        shock.visible = false;
        horizon.scale.setScalar(1.0);
        horizonMat.uniforms.uFlash.value = 0.45 * (1 - u);
      }
    },
  };
}

// ── Hazards ──────────────────────────────────────────────────────────────────
//
// Wildspace dangers that are ENTIRELY motion: a black hole is an accretion disc
// turning, an ion storm is arcs crackling, a debris field is rocks tumbling
// past. Drawn as still art they are a coloured smudge, which is why these are
// built here rather than shipped as a picture like the rest of the scenery.
//
// Every builder returns { group, update(t) } — the group to hang in the scene,
// and a function the animation loop drives with that piece's own clock. That
// clock is per-placement and honours the GM's speed control, so "stop" freezes
// a hazard exactly where it stands and 2x runs it hot.
//
// All four are procedural for the same reason the gate is: they are revolved
// geometry and shaders, a few hundred bytes of maths against a multi-megabyte
// mesh, and they stay crisp at any scale a GM drags them to.

// A flat disc that swirls — the shared body of the black hole's accretion disc
// and the debris field's dust. Polar coordinates are computed in the shader off
// a plain circle rather than using RingGeometry, whose UVs map to its bounding
// box and make the maths fight the geometry.
function makeSwirlDiscMaterial({ inner, hot, cool, spin = 1, arms = 5 }) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uInner: { value: inner },
      uHot: { value: new THREE.Color(hot) },
      uCool: { value: new THREE.Color(cool) },
      uSpin: { value: spin },
      uArms: { value: arms },
    },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: false,
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uInner;
      uniform float uSpin;
      uniform float uArms;
      uniform vec3 uHot;
      uniform vec3 uCool;
      varying vec2 vUv;
      ${NOISE_GLSL}
      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        if (r > 1.0 || r < uInner) discard;
        float a = atan(p.y, p.x);

        // DIFFERENTIAL rotation: the inner edge laps the outer one, which is
        // what makes a disc read as orbiting matter rather than a spinning
        // texture. The 1/r falloff is the same shape a real orbit has.
        float lag = uTime * uSpin / max(r, uInner);
        float spiral = a * uArms + log(max(r, 0.001)) * 6.0 - lag;

        // Two noise fields riding the spiral: coarse banding and a fine
        // speckle, so the arms have structure without repeating.
        float band = fbm(vec3(cos(spiral), sin(spiral), r * 3.0 - uTime * 0.05));
        float fine = fbm(vec3(p * 9.0, uTime * 0.12));
        float v = band * 0.68 + fine * 0.32;

        // Hotter towards the middle: matter falling in is compressed.
        float heat = smoothstep(1.0, uInner, r);
        vec3 col = mix(uCool, uHot, clamp(heat * 0.85 + v * 0.35, 0.0, 1.0));

        // Feather both edges so the disc has no drawn rim.
        float edge = smoothstep(1.0, 0.86, r) * smoothstep(uInner, uInner + 0.08, r);
        gl_FragColor = vec4(col, edge * (0.35 + v * 0.65));
      }
    `,
  });
}

// A soft round billboard, for glows and haloes.
let hazardGlowTex = null;
function hazardGlowTexture() {
  if (hazardGlowTex) return hazardGlowTex;
  const N = 128;
  const c = document.createElement('canvas');
  c.width = N; c.height = N;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(N / 2, N / 2, 0, N / 2, N / 2, N / 2);
  grad.addColorStop(0.0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.30, 'rgba(255,255,255,0.45)');
  grad.addColorStop(1.0, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, N, N);
  hazardGlowTex = new THREE.CanvasTexture(c);
  hazardGlowTex.colorSpace = THREE.SRGBColorSpace;
  return hazardGlowTex;
}

function glowSprite(colorHex, sizeFt, opacity = 0.6) {
  const mat = new THREE.SpriteMaterial({
    map: hazardGlowTexture(),
    color: new THREE.Color(colorHex),
    transparent: true,
    opacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  mat.userData.sharedMap = true;
  const s = new THREE.Sprite(mat);
  s.scale.set(sizeFt, sizeFt, 1);
  return s;
}

// ── Black hole ───────────────────────────────────────────────────────────────
//
// Three parts, and the order matters: a genuinely black core, a thin photon
// ring right at its edge, and the accretion disc lying in the ecliptic.
//
// The core is MeshBasicMaterial black, NOT a lit material. A shaded sphere
// picks up the scene's key light and comes out dark grey with a highlight —
// which reads as a billiard ball. The one thing this object must be is a hole.
function makeBlackHole(radiusFt, { ghost = false }) {
  const group = new THREE.Group();
  const R = radiusFt;
  const a = ghost ? 0.45 : 1;

  const core = new THREE.Mesh(
    new THREE.SphereGeometry(R * 0.26, 32, 24),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: ghost, opacity: a })
  );
  core.renderOrder = 3;
  group.add(core);

  // The photon ring sits just outside the horizon and is the brightest thing
  // here — light held in orbit. Tipped with the disc so the two agree.
  const photon = new THREE.Mesh(
    new THREE.TorusGeometry(R * 0.33, R * 0.012, 10, 96),
    new THREE.MeshBasicMaterial({ color: 0xffe6b0, transparent: true, opacity: 0.9 * a, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  photon.rotation.x = -Math.PI / 2;
  photon.renderOrder = 4;
  group.add(photon);

  const discMat = makeSwirlDiscMaterial({ inner: 0.30, hot: '#fff0c2', cool: '#c2450f', spin: 0.55, arms: 4 });
  discMat.uniforms.uHot.value.multiplyScalar(a);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(R, 96), discMat);
  disc.rotation.x = -Math.PI / 2;
  disc.renderOrder = 2;
  group.add(disc);

  // A faint halo, so the hole reads against a dark sky rather than vanishing
  // into it.
  const halo = glowSprite('#ffb457', R * 1.5, 0.22 * a);
  halo.renderOrder = 1;
  group.add(halo);

  return {
    group,
    update: (t) => {
      discMat.uniforms.uTime.value = t;
      // The whole disc precesses slowly on top of the shader's own churn, so
      // the arms never settle into a fixed pattern on screen.
      disc.rotation.z = t * 0.05;
      photon.rotation.z = -t * 0.09;
      halo.material.opacity = (0.18 + Math.sin(t * 0.7) * 0.05) * a;
    },
  };
}

// ── Wormhole ─────────────────────────────────────────────────────────────────
//
// A throat rather than a disc: rings of shrinking radius stacked downward, each
// turning faster than the one above it. That velocity gradient is the whole
// effect — equal speeds read as a stack of hoops, and a gradient reads as
// something being drawn down a funnel.
function makeWormhole(radiusFt, { ghost = false }) {
  const group = new THREE.Group();
  const R = radiusFt;
  const a = ghost ? 0.45 : 1;
  const RINGS = 9;
  const rings = [];

  for (let i = 0; i < RINGS; i++) {
    const f = i / (RINGS - 1);
    const rr = R * (1 - f * 0.82);
    const mesh = new THREE.Mesh(
      new THREE.TorusGeometry(rr, R * 0.018 * (1 - f * 0.4), 8, 64),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color().lerpColors(new THREE.Color('#8b5cf6'), new THREE.Color('#e0d4ff'), f),
        transparent: true,
        opacity: (0.28 + f * 0.55) * a,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = -f * R * 1.15;
    mesh.renderOrder = 3;
    rings.push({ mesh, f });
    group.add(mesh);
  }

  const mouthMat = makeSwirlDiscMaterial({ inner: 0.06, hot: '#f0e6ff', cool: '#4c1d95', spin: 0.9, arms: 3 });
  const mouth = new THREE.Mesh(new THREE.CircleGeometry(R * 0.98, 96), mouthMat);
  mouth.rotation.x = -Math.PI / 2;
  mouth.position.y = -0.05;
  mouth.renderOrder = 2;
  group.add(mouth);

  const glow = glowSprite('#a855f7', R * 1.4, 0.3 * a);
  glow.renderOrder = 1;
  group.add(glow);

  return {
    group,
    update: (t) => {
      mouthMat.uniforms.uTime.value = t;
      for (const { mesh, f } of rings) {
        // Deeper rings turn faster and wobble more — the throat is not rigid.
        mesh.rotation.z = t * (0.25 + f * 1.4);
        mesh.rotation.x = -Math.PI / 2 + Math.sin(t * (0.5 + f) + f * 6) * 0.05;
      }
      glow.material.opacity = (0.24 + Math.sin(t * 1.1) * 0.08) * a;
    },
  };
}

// ── Ion storm ────────────────────────────────────────────────────────────────
//
// Arcs that crackle. The trick is that nothing is rebuilt per frame: a bank of
// jagged paths is generated once, and the animation switches which few are lit
// at any moment. Regenerating geometry every frame is what makes naive
// lightning effects stutter, and the eye cannot tell the difference between a
// new bolt and a different bolt appearing.
function makeIonStorm(radiusFt, { ghost = false, seed = 1 }) {
  const group = new THREE.Group();
  const R = radiusFt;
  const a = ghost ? 0.45 : 1;

  let st = (seed >>> 0) || 1;
  const rnd = () => {
    st ^= st << 13; st >>>= 0;
    st ^= st >> 17;
    st ^= st << 5; st >>>= 0;
    return st / 4294967296;
  };

  const ARCS = 14;
  const arcs = [];
  for (let i = 0; i < ARCS; i++) {
    // Each arc runs between two points on the storm's shell, bent through a
    // handful of jittered waypoints.
    const t0 = rnd() * Math.PI * 2, p0 = (rnd() - 0.5) * Math.PI;
    const t1 = t0 + (rnd() - 0.5) * 2.2, p1 = (rnd() - 0.5) * Math.PI;
    const from = new THREE.Vector3(
      Math.cos(t0) * Math.cos(p0), Math.sin(p0) * 0.6, Math.sin(t0) * Math.cos(p0)
    ).multiplyScalar(R * 0.92);
    const to = new THREE.Vector3(
      Math.cos(t1) * Math.cos(p1), Math.sin(p1) * 0.6, Math.sin(t1) * Math.cos(p1)
    ).multiplyScalar(R * 0.92);
    const pts = [];
    const STEPS = 7;
    for (let s = 0; s <= STEPS; s++) {
      const u = s / STEPS;
      const base = from.clone().lerp(to, u);
      const bend = Math.sin(u * Math.PI) * R * 0.28;
      base.x += (rnd() - 0.5) * bend;
      base.y += (rnd() - 0.5) * bend;
      base.z += (rnd() - 0.5) * bend;
      pts.push(base);
    }
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({
        color: new THREE.Color(rnd() > 0.6 ? '#e6d4ff' : '#9fd8ff'),
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    line.renderOrder = 4;
    arcs.push({ line, phase: rnd() * Math.PI * 2, rate: 2.2 + rnd() * 5.5 });
    group.add(line);
  }

  // A dim charged shell, so the volume reads even between flashes.
  const shell = new THREE.Mesh(
    new THREE.SphereGeometry(R * 0.9, 24, 18),
    new THREE.MeshBasicMaterial({
      color: 0x5b7cc7, transparent: true, opacity: 0.10 * a,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    })
  );
  shell.renderOrder = 2;
  group.add(shell);

  const glow = glowSprite('#8ab4ff', R * 1.8, 0.16 * a);
  glow.renderOrder = 1;
  group.add(glow);

  return {
    group,
    update: (t) => {
      for (const arc of arcs) {
        // A sharp pulse rather than a sine: a bolt is on, then gone. Raising
        // the wave to a high power is what gives the flat dark gaps between
        // flashes that make it read as electricity.
        const w = Math.sin(t * arc.rate + arc.phase) * 0.5 + 0.5;
        arc.line.material.opacity = Math.pow(w, 7) * 0.95 * a;
      }
      group.rotation.y = t * 0.08;
      glow.material.opacity = (0.12 + Math.sin(t * 2.3) * 0.05) * a;
    },
  };
}

// ── Debris field ─────────────────────────────────────────────────────────────
//
// Rocks on orbits, over a dust disc. Each rock keeps its own radius, phase and
// angular speed, and the speeds fall off with distance the same way the
// accretion disc's shader does — so the field shears as it turns instead of
// rotating as one rigid plate.
function makeDebrisField(radiusFt, { ghost = false, seed = 1 }) {
  const group = new THREE.Group();
  const R = radiusFt;
  const a = ghost ? 0.45 : 1;

  let st = (seed >>> 0) || 1;
  const rnd = () => {
    st ^= st << 13; st >>>= 0;
    st ^= st >> 17;
    st ^= st << 5; st >>>= 0;
    return st / 4294967296;
  };

  const dustMat = makeSwirlDiscMaterial({ inner: 0.12, hot: '#b9a993', cool: '#4a4238', spin: 0.30, arms: 3 });
  const dust = new THREE.Mesh(new THREE.CircleGeometry(R, 72), dustMat);
  dust.rotation.x = -Math.PI / 2;
  dust.renderOrder = 2;
  group.add(dust);

  // One geometry and one material shared by every rock. A field is dozens of
  // lumps, and giving each its own would be dozens of draw-call setups for
  // objects a few pixels across.
  const rockGeo = new THREE.IcosahedronGeometry(1, 0);
  const rockMat = new THREE.MeshStandardMaterial({
    color: 0x8a8177, roughness: 0.95, metalness: 0.05,
    transparent: ghost, opacity: a,
  });

  const COUNT = Math.max(14, Math.min(70, Math.round(R / 3)));
  const rocks = [];
  for (let i = 0; i < COUNT; i++) {
    const mesh = new THREE.Mesh(rockGeo, rockMat);
    const rr = 0.18 + Math.sqrt(rnd()) * 0.8;      // even area fill
    const size = R * (0.012 + rnd() * 0.045);
    mesh.scale.set(size, size * (0.6 + rnd() * 0.6), size * (0.7 + rnd() * 0.5));
    mesh.renderOrder = 3;
    rocks.push({
      mesh,
      r: rr * R,
      phase: rnd() * Math.PI * 2,
      // Keplerian-ish: further out is slower. Same falloff the dust shader uses,
      // so rocks and dust never drift out of step.
      speed: 0.55 / Math.max(rr, 0.18),
      yOff: (rnd() - 0.5) * R * 0.10,
      tumble: new THREE.Vector3(rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1).multiplyScalar(0.7),
    });
    group.add(mesh);
  }

  return {
    group,
    update: (t) => {
      dustMat.uniforms.uTime.value = t;
      for (const r of rocks) {
        const ang = r.phase + t * r.speed * 0.25;
        r.mesh.position.set(Math.cos(ang) * r.r, r.yOff, Math.sin(ang) * r.r);
        r.mesh.rotation.set(t * r.tumble.x, t * r.tumble.y, t * r.tumble.z);
      }
    },
  };
}

// ── Crystal Vine ─────────────────────────────────────────────────────────────
//
// A single crystalline stalk that breaks out of the ground and climbs, coiling
// outward as it goes, throwing shards off its flanks and opening into a cluster
// at the growing tip. The flat board shows the same plant from overhead
// (terrain/feature-crystal-vine.svg); this is what stands up in 3D.
//
// Built rather than modelled, for the reason the hazards are: a .glb of this
// would be one fixed plant that every placement repeats, and a coil of prisms
// is a dozen lines of trigonometry. Seeded off the piece id, so two vines on
// one map grow differently — the giveaway that scenery is procedural is seeing
// the same silhouette twice.
//
// GEOMETRY. The stalk is a run of six-sided prisms laid end to end along a
// widening helix, each one oriented onto the span it spans. Six sides and
// flatShading, because the whole read is "faceted mineral": a smooth tube with
// a shiny material on it is a vine made of plastic. Everything tapers — the
// prisms, the shards, the spacing — so the eye follows it upward.
function makeCrystalVine(radiusFt, { ghost = false, seed = 1 }) {
  const group = new THREE.Group();
  const a = ghost ? 0.4 : 1;

  // xorshift, as everywhere else here: same seed, same plant, every client.
  let st = (seed >>> 0) || 1;
  const rnd = () => {
    st ^= st << 13; st >>>= 0;
    st ^= st >> 17;
    st ^= st << 5; st >>>= 0;
    return st / 4294967296;
  };

  // A vine is TALL for its footprint — that is what makes it read as a vine
  // rather than a boulder — so height comes off the placement's radius rather
  // than being a constant.
  const H = radiusFt * 3.4;
  const coilR = radiusFt * 1.02;
  const turns = 1.05 + rnd() * 0.45;
  const th0 = rnd() * Math.PI * 2;
  const lean = 0.12 + rnd() * 0.1;

  // The spine. Radius grows with height ("up and OUT"), and y is eased so the
  // plant is densest near the ground, where its weight belongs.
  const NODES = 15;
  const spine = [];
  for (let i = 0; i <= NODES; i++) {
    const u = i / NODES;
    const th = th0 + u * turns * Math.PI * 2;
    const r = coilR * (0.12 + 0.95 * Math.pow(u, 1.25));
    spine.push(new THREE.Vector3(
      Math.cos(th) * r + Math.sin(u * 2.1) * radiusFt * lean * 0.3,
      H * Math.pow(u, 0.92),
      Math.sin(th) * r
    ));
  }

  // Tapering, plus a per-node swelling. A perfectly smooth taper is a carrot;
  // crystal grows in fits, thicker where it paused and thinner where it ran.
  const swell = [];
  for (let i = 0; i <= NODES; i++) swell.push(0.82 + rnd() * 0.42);
  const stalkR = (u) => radiusFt * (0.3 * Math.pow(1 - u, 1.15) + 0.055)
    * (swell[Math.round(u * NODES)] ?? 1);

  // Two material families — a body and a brighter facet — so neighbouring
  // prisms differ the way real crystal faces do. Kept in arrays because the
  // pulse below has to reach every one of them.
  const bodyMats = [];
  // `hex` and `emissive` take anything THREE.Color does — a string for the
  // fixed parts, a Color for the stalk, which mixes its own along the climb.
  const makeMat = (hex, emissive, op) => {
    const m = new THREE.MeshStandardMaterial({
      color: new THREE.Color(hex),
      emissive: new THREE.Color(emissive),
      emissiveIntensity: 0.45,
      roughness: 0.14,
      metalness: 0.04,
      flatShading: true,
      transparent: true,
      // Slightly see-through. Not enough to look like a ghost — enough that an
      // edge picks up what is behind it, which is the difference between glass
      // and painted resin.
      opacity: op * a,
    });
    bodyMats.push({ mat: m, base: 0.45 });
    return m;
  };

  const prism = (from, to, r0, r1, mat) => {
    const dir = new THREE.Vector3().subVectors(to, from);
    const len = dir.length();
    if (len < 1e-4) return null;
    const geo = new THREE.CylinderGeometry(r1, r0, len, 6, 1);
    const mesh = new THREE.Mesh(geo, mat);
    // Cylinders are born pointing up Y; rotate that axis onto the span.
    mesh.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0), dir.clone().normalize()
    );
    // Then twist about that axis by a random amount.
    //
    // Six-sided prisms stacked with their faces in register are a bamboo cane:
    // one continuous flat runs the whole length and the eye reads a tube with
    // rings drawn on it. Twisting each one breaks every long facet at its join,
    // which is what mineral does — faces meeting at angles rather than lining
    // up politely.
    mesh.rotateOnAxis(new THREE.Vector3(0, 1, 0), rnd() * Math.PI);
    mesh.position.copy(from).addScaledVector(dir, 0.5);
    return mesh;
  };

  // The stalk itself.
  for (let i = 0; i < NODES; i++) {
    const u0 = i / NODES, u1 = (i + 1) / NODES;
    // Colour runs from deep indigo at the foot to a pale violet at the tip, with
    // the emissive going cyan as it climbs: old growth down where it broke
    // ground, new growth up where it is still forming. Alternating faces stay
    // two-tone on top of that, so the facets read at any distance.
    const lit = i % 2 === 0;
    const u = i / NODES;
    const body = new THREE.Color(lit ? '#8b5cf6' : '#4a1f9c')
      .lerp(new THREE.Color(lit ? '#d8c8ff' : '#8b5cf6'), u);
    const emis = new THREE.Color('#2a0f63').lerp(new THREE.Color('#1e7f9c'), u * 0.9);
    const mat = makeMat(body, emis, 0.87);
    // Prisms overlap slightly at the joins: a coil built of butt-jointed
    // cylinders opens a wedge on the outside of every bend, and daylight
    // through the middle of a solid crystal is the one artefact that gives the
    // whole thing away as tubing.
    const from = spine[i].clone().lerp(spine[i + 1], -0.06);
    const to = spine[i + 1].clone().lerp(spine[i], -0.06);
    const m = prism(from, to, stalkR(u0), stalkR(u1), mat);
    if (m) group.add(m);
  }

  // ── Shards ────────────────────────────────────────────────────────────────
  // Five-sided pyramids splitting off the flanks, angled outward from the coil
  // and swept upward — growth has a direction, and spikes at right angles read
  // as a mace rather than a plant. Longest low down, where the vine is oldest.
  const shardMats = [];
  const addShard = (at, dir, len, rad, u = 0) => {
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#7c4ceb').lerp(new THREE.Color('#c9b0ff'), u),
      emissive: new THREE.Color('#3b1580').lerp(new THREE.Color('#1e7f9c'), u * 0.8),
      emissiveIntensity: 0.5,
      roughness: 0.1,
      metalness: 0.05,
      flatShading: true,
      transparent: true,
      opacity: 0.92 * a,
    });
    shardMats.push({ mat, base: 0.5 });
    const mesh = new THREE.Mesh(new THREE.ConeGeometry(rad, len, 5), mat);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    mesh.position.copy(at).addScaledVector(dir.clone().normalize(), len * 0.42);
    group.add(mesh);
    return mesh;
  };

  for (let i = 1; i < NODES; i++) {
    const u = i / NODES;
    if (rnd() > 0.86) continue;               // gaps, so the run isn't regular
    const p = spine[i];
    const out = new THREE.Vector3(p.x, 0, p.z);
    if (out.lengthSq() < 1e-6) out.set(1, 0, 0);
    out.normalize();
    const swing = (rnd() - 0.5) * 1.5;
    const dir = new THREE.Vector3(
      out.x * Math.cos(swing) - out.z * Math.sin(swing),
      0.55 + rnd() * 0.7,                     // swept up
      out.x * Math.sin(swing) + out.z * Math.cos(swing)
    );
    addShard(p, dir, radiusFt * (1.15 - 0.65 * u) * (0.6 + rnd() * 0.7),
      stalkR(u) * (0.5 + rnd() * 0.3), u);
    // A second, smaller one on the far side now and then.
    if (rnd() > 0.55) {
      addShard(p, new THREE.Vector3(-dir.x, 0.4 + rnd() * 0.5, -dir.z),
        radiusFt * (0.75 - 0.4 * u) * (0.5 + rnd() * 0.6), stalkR(u) * 0.4, u);
    }
  }

  // ── The breach ────────────────────────────────────────────────────────────
  // Crystals shouldered up out of the earth around the stalk. Without them the
  // vine meets the ground at a clean circle, like a pipe coming through a
  // floor, and the piece loses the thing it is FOR: something that broke out.
  const CLUSTER = 6 + Math.floor(rnd() * 4);
  for (let i = 0; i < CLUSTER; i++) {
    const th = (i / CLUSTER) * Math.PI * 2 + rnd() * 0.5;
    const d = radiusFt * (0.28 + rnd() * 0.5);
    const at = new THREE.Vector3(Math.cos(th) * d, 0, Math.sin(th) * d);
    addShard(
      at,
      new THREE.Vector3(Math.cos(th) * (0.45 + rnd() * 0.5), 0.75 + rnd() * 0.6, Math.sin(th) * (0.45 + rnd() * 0.5)),
      radiusFt * (0.5 + rnd() * 0.75),
      radiusFt * (0.07 + rnd() * 0.07)
    );   // u defaults to 0: the breach is the oldest crystal on the plant
  }

  // ── The crown ─────────────────────────────────────────────────────────────
  // The growing tip: a cluster opening along the direction of travel, around a
  // core bright enough to be the thing you notice from across the table.
  const tip = spine[NODES];
  const travel = new THREE.Vector3().subVectors(tip, spine[NODES - 1]).normalize();
  const CROWN = 6;
  for (let i = 0; i < CROWN; i++) {
    const th = (i / CROWN) * Math.PI * 2;
    const side = new THREE.Vector3(Math.cos(th), 0, Math.sin(th));
    const dir = travel.clone().multiplyScalar(1.1).add(side.multiplyScalar(0.75 + rnd() * 0.5));
    addShard(tip, dir, radiusFt * (0.55 + rnd() * 0.5), radiusFt * 0.06, 1);
  }

  // The glow at the tip. A sprite rather than a light: this is scenery, and a
  // real PointLight per vine would put every placement into the renderer's
  // light budget for a halo nobody is lighting anything with.
  const glowTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, 'rgba(226,250,255,0.9)');
    grd.addColorStop(0.22, 'rgba(103,232,249,0.5)');
    grd.addColorStop(0.6, 'rgba(139,92,246,0.24)');
    grd.addColorStop(1, 'rgba(124,58,237,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  })();
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTex,
    transparent: true,
    opacity: 0.7 * a,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }));
  glow.scale.setScalar(radiusFt * 1.15);
  glow.position.copy(tip);
  glow.renderOrder = 6;
  group.add(glow);

  // Clicks pass through the halo — it is bigger than the plant and would
  // otherwise swallow drags meant for whatever is standing behind it.
  glow.userData.noRaycast = true;

  return {
    group,
    top: H,
    update: (t) => {
      // A slow lean, as though something this heavy were still settling. Small
      // on purpose: scenery that visibly waves is scenery you cannot stop
      // looking at.
      group.rotation.z = Math.sin(t * 0.5) * 0.016;
      group.rotation.x = Math.sin(t * 0.37 + 1.2) * 0.011;

      // Light climbing the stalk — the vine's sap. Each prism is a fifth of a
      // second behind the one below it, so the pulse travels rather than the
      // whole plant blinking at once.
      for (let i = 0; i < bodyMats.length; i++) {
        const b = bodyMats[i];
        b.mat.emissiveIntensity = b.base + 0.55 * Math.max(0, Math.sin(t * 1.25 - i * 0.42));
      }
      for (let i = 0; i < shardMats.length; i++) {
        const s = shardMats[i];
        s.mat.emissiveIntensity = s.base + 0.35 * Math.max(0, Math.sin(t * 1.25 - i * 0.3 - 0.8));
      }
      const puls = 0.82 + 0.18 * Math.sin(t * 1.25);
      glow.scale.setScalar(radiusFt * 1.15 * puls);
      glow.material.opacity = (0.5 + 0.22 * Math.sin(t * 1.25)) * a;
    },
  };
}

// ── Alien Tentacle ───────────────────────────────────────────────────────────
//
// Limbs of something large pushing up through the floor of the world. Three
// forms, chosen per library entry (`piece_form`, the way a cloud picks its
// volume), each with overhead art drawn to match:
//
//   rearing — one heavy arm sweeping up and hooking over, tip curled forward.
//   coiled  — the arm winds around its own breach, tip lifting clear.
//   nest    — several arms out of one hole, no two the same size.
//
// Built as a run of tapering cylinders along a centreline, with suckers
// PARENTED to the segments. That parenting is what makes the writhe affordable:
// the animation moves fourteen transforms per arm and every sucker on it comes
// along for free, so nothing rebuilds geometry per frame.
//
// Deliberately smooth-shaded, where the crystal vine is faceted. The two sets
// sit in the same library and want to be told apart at a glance, in 3D as well
// as on the flat board.
function makeTentacle(radiusFt, { ghost = false, seed = 1, form = 'rearing' } = {}) {
  const group = new THREE.Group();
  const a = ghost ? 0.4 : 1;

  let st = (seed >>> 0) || 1;
  const rnd = () => {
    st ^= st << 13; st >>>= 0;
    st ^= st >> 17;
    st ^= st << 5; st >>>= 0;
    return st / 4294967296;
  };

  // Skin. Three zones down the length rather than one material per segment:
  // a gradient nobody can point at is not worth fourteen materials per arm.
  const skin = (u) => new THREE.MeshStandardMaterial({
    color: new THREE.Color('#7e1f47').lerp(new THREE.Color('#c2456b'), u),
    emissive: new THREE.Color('#2a0518').lerp(new THREE.Color('#0d3d2a'), u * 0.6),
    emissiveIntensity: 0.35,
    roughness: 0.52,
    metalness: 0.02,
    transparent: ghost,
    opacity: a,
  });
  const zoneMats = [skin(0), skin(0.5), skin(1)];
  const suckerMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#e9c2a6'),
    roughness: 0.65,
    metalness: 0,
    transparent: ghost,
    opacity: a,
  });

  // Unit-height cylinder, scaled per segment. One geometry cannot be shared
  // across segments of different radii, but the HEIGHT can always be a scale,
  // which is what lets the writhe stretch a segment as its neighbours move.
  const segGeoFor = (r0, r1) => new THREE.CylinderGeometry(r1, r0, 1, 10, 1);
  // Shallow: a sucker is a ring pressed into the skin, and at any depth it
  // reads as a barnacle stuck on the outside.
  const suckerGeo = new THREE.CylinderGeometry(1, 0.86, 0.26, 8, 1);

  // ── Centrelines ───────────────────────────────────────────────────────────
  // Each arm is a list of rest positions; the writhe displaces them per frame.
  const arms = [];
  const armSpec = [];

  if (form === 'coiled') {
    armSpec.push({
      kind: 'coil', len: radiusFt * 3.1, thick: radiusFt * 0.32,
      turns: 2.15 + rnd() * 0.35, dir: rnd() * Math.PI * 2,
    });
  } else if (form === 'nest') {
    // Lopsided on purpose — see the same note in the art generator. Even arms
    // make a starfish.
    const base = rnd() * Math.PI * 2;
    const sizes = [1, 0.78, 0.62, 0.5, 0.4];
    for (let i = 0; i < 5; i++) {
      armSpec.push({
        kind: 'rear',
        len: radiusFt * (1.5 + 1.5 * sizes[i]),
        thick: radiusFt * (0.12 + 0.16 * sizes[i]),
        dir: base + i * 1.35 + rnd() * 0.5,
        rise: 0.5 + rnd() * 0.5,
        hook: 0.6 + rnd() * 0.8,
      });
    }
  } else {
    armSpec.push({
      kind: 'rear', len: radiusFt * 3.6, thick: radiusFt * 0.4,
      dir: rnd() * Math.PI * 2, rise: 1, hook: 1.35,
    });
  }

  // Sampling per form. A coil turns through four times the angle a sweep does
  // over the same run, and at fifteen nodes it came out as a flat zigzag —
  // the segments were long enough to read as straight.
  const NODES = form === 'coiled' ? 28 : form === 'nest' ? 11 : 16;

  for (const spec of armSpec) {
    const rest = [];
    for (let i = 0; i <= NODES; i++) {
      const u = i / NODES;
      if (spec.kind === 'coil') {
        const th = spec.dir + u * spec.turns * Math.PI * 2;
        // Radius nearly constant — a spring wound around the breach — and
        // opening only at the very end as the tip lifts away. Growing it
        // steadily made a flat spiral lying on the floor.
        const r = radiusFt * (0.5 + 0.15 * u + 0.5 * Math.pow(u, 3.2));
        rest.push(new THREE.Vector3(
          Math.cos(th) * r,
          spec.len * (0.62 * u + 0.38 * Math.pow(u, 2.2)),
          Math.sin(th) * r
        ));
      } else {
        // Up first, then over: the arc bends away from vertical as it climbs,
        // and the last third hooks forward and down, which is the pose that
        // says "reaching" rather than "standing".
        const bend = Math.pow(u, 1.7) * spec.hook;
        const out = spec.len * (0.42 * Math.sin(bend * 1.5) + 0.28 * u);
        const up = spec.len * spec.rise * Math.sin(Math.min(1, u * 1.12) * Math.PI * 0.62);
        rest.push(new THREE.Vector3(
          Math.cos(spec.dir) * out,
          Math.max(0.05, up),
          Math.sin(spec.dir) * out
        ));
      }
    }

    // Radius down the arm: thickest just past the root, tapering to a point.
    const radAt = (u) => spec.thick * (1 - Math.pow(u, 0.75)) * (1 + 0.12 * Math.sin(u * Math.PI)) + spec.thick * 0.04;

    const segs = [];
    for (let i = 0; i < NODES; i++) {
      const u0 = i / NODES, u1 = (i + 1) / NODES;
      const mat = zoneMats[u0 < 0.34 ? 0 : u0 < 0.7 ? 1 : 2];
      // A holder carries the segment's PLACE; the cylinder inside it carries
      // the segment's LENGTH.
      //
      // Scaling the cylinder directly and hanging suckers off it sheared them
      // into spikes: a rotated child under a non-uniformly scaled parent is
      // stretched along the parent's axis, not its own. Splitting the two means
      // the holder only ever rotates and translates, so everything parented to
      // it keeps its shape — and the suckers still ride the writhe for free.
      const holder = new THREE.Group();
      const mesh = new THREE.Mesh(segGeoFor(radAt(u0), radAt(u1)), mat);
      holder.add(mesh);
      group.add(holder);

      // Suckers, on the arm's inner face, every other segment, shrinking as the
      // limb narrows. Children of the segment, so they ride the writhe.
      const suckerEvery = NODES > 20 ? 3 : 2;
      if (i >= 1 && i % suckerEvery === 0 && u0 < 0.88) {
        const sr = radAt(u0) * 0.42;
        for (const side of [-0.5, 0.5]) {
          const s = new THREE.Mesh(suckerGeo, suckerMat);
          s.scale.setScalar(sr);
          // Holder space: Y runs along the arm, so the flank of the limb is out
          // at ±radius across it. The disc is laid onto that flank, facing out.
          const ang = side * 1.9;
          const rr = radAt(u0) * 0.86;
          s.position.set(Math.cos(ang) * rr, 0, Math.sin(ang) * rr);
          s.rotation.set(0, -ang, Math.PI / 2);
          holder.add(s);
        }
      }
      segs.push({ holder, mesh, u0, u1 });
    }
    arms.push({ spec, rest, segs, phase: rnd() * Math.PI * 2 });
  }

  // Wet ground at the breach: a dark disc, so the limbs come out of something
  // rather than out of the map's own floor texture.
  const breach = new THREE.Mesh(
    new THREE.CircleGeometry(radiusFt * 0.62, 24),
    new THREE.MeshBasicMaterial({ color: 0x0b0610, transparent: true, opacity: 0.85 * a })
  );
  breach.rotation.x = -Math.PI / 2;
  breach.position.y = 0.08;
  breach.renderOrder = 2;
  group.add(breach);

  // Scratch vectors, allocated once. This runs every frame for every placement.
  const P = new THREE.Vector3();
  const Q = new THREE.Vector3();
  const DIR = new THREE.Vector3();
  const UP = new THREE.Vector3(0, 1, 0);
  const N1 = new THREE.Vector3();
  const N2 = new THREE.Vector3();
  const posed = [];

  const poseArm = (arm, t) => {
    const { rest, segs, phase } = arm;
    while (posed.length < rest.length) posed.push(new THREE.Vector3());
    for (let i = 0; i < rest.length; i++) {
      const u = i / (rest.length - 1);
      posed[i].copy(rest[i]);
      // A wave travelling up the arm, growing towards the tip and dying to
      // nothing at the root — the root is in the ground and cannot move.
      // Scaled off the SEGMENT length, not the limb's thickness. Tied to
      // thickness it was as wide as the coil's own radius, which shook that
      // form into a flat zigzag — the pose has to survive its own animation.
      const segLen = arm.spec.len / rest.length;
      const amp = Math.min(arm.spec.thick * 1.5, segLen * 0.7) * Math.pow(u, 1.6);
      const w = t * 0.9 + phase - u * 2.4;
      // Displace across the arm, not along it: two perpendiculars, a quarter
      // cycle apart, which is a lazy roll rather than a flat wag.
      DIR.subVectors(rest[Math.min(rest.length - 1, i + 1)], rest[Math.max(0, i - 1)]).normalize();
      N1.crossVectors(DIR, UP);
      if (N1.lengthSq() < 1e-6) N1.set(1, 0, 0);
      N1.normalize();
      N2.crossVectors(DIR, N1).normalize();
      posed[i].addScaledVector(N1, Math.sin(w) * amp);
      posed[i].addScaledVector(N2, Math.cos(w * 0.8) * amp * 0.55);
      // Never below the floor.
      if (posed[i].y < 0.05) posed[i].y = 0.05;
    }
    for (let i = 0; i < segs.length; i++) {
      P.copy(posed[i]);
      Q.copy(posed[i + 1]);
      DIR.subVectors(Q, P);
      const len = DIR.length() || 1e-4;
      const h = segs[i].holder;
      h.position.copy(P).addScaledVector(DIR, 0.5);
      h.quaternion.setFromUnitVectors(UP, DIR.divideScalar(len));
      // Overlapped a little, so a bend never opens a gap between segments.
      // On the cylinder alone — see the holder's note.
      segs[i].mesh.scale.set(1, len * 1.08, 1);
    }
  };

  // Pose once at rest so a still frame — a screenshot, a paused tab — is a
  // tentacle rather than a pile of cylinders at the origin.
  for (const arm of arms) poseArm(arm, 0);

  return {
    group,
    top: Math.max(...arms.map((arm) => Math.max(...arm.rest.map((p) => p.y)))),
    update: (t) => {
      for (const arm of arms) poseArm(arm, t);
    },
  };
}

// Which shapes are hazards, and how each is built. One table so the renderer,
// the library and the GM's dropdown cannot drift apart.
const HAZARD_BUILDERS = {
  blackhole: makeBlackHole,
  wormhole: makeWormhole,
  ionstorm: makeIonStorm,
  debris: makeDebrisField,
};

// Every shape built as procedural geometry with an animation of its own.
//
// The hazards were the first of these and the renderer dispatched straight off
// their table, which meant a piece that is NOT a wildspace hazard — a plant,
// say — had nowhere to be. Same contract for all of them: build from a
// footprint radius, hand back a group and an update.
const PIECE_BUILDERS = {
  ...HAZARD_BUILDERS,
  vine: makeCrystalVine,
  tentacle: makeTentacle,
};

const ELEMENT_STYLE = {
  fire:      { color: '#ff7a1a', speed: 7.5, swing: 0.30, motes: 26, rise: 1.0, jitter: 0.5 },
  water:     { color: '#3aa6ff', speed: 1.6, swing: 0.12, motes: 12, rise: 0.15, jitter: 0.2 },
  ice:       { color: '#9fe4ff', speed: 1.1, swing: 0.10, motes: 14, rise: -0.25, jitter: 0.15 },
  lightning: { color: '#c9b3ff', speed: 16,  swing: 0.45, motes: 18, rise: 0.6, jitter: 1.4 },
  void:      { color: '#a855f7', speed: 2.4, swing: 0.26, motes: 20, rise: 0.5, jitter: 0.35 },
  acid:      { color: '#8ddc3a', speed: 2.8, swing: 0.20, motes: 20, rise: 0.35, jitter: 0.3 },
};

// Token art, cropped to a circle with a rim — the same shape the flat map
// draws (Konva clips token images with cornerRadius = width/2). A raw square
// sprite in 3D reads as a photo pasted on a stick rather than a token.
//
// Done on a canvas rather than in a shader because it also lets the art be
// centre-cropped to a square first: portraits are rarely 1:1, and stretching
// them to fit is uglier than trimming the edges.
const TOKEN_TEX_PX = 256;

// A standee's artwork, untouched: no crop, no ring, alpha preserved.
//
// The canvas takes the IMAGE's proportions, not a square. The first version
// letterboxed a tall figure into a square texture and then scaled the quad to
// the image's aspect, which stretched everything in the texture by exactly the
// ratio between the two — a 2:3 standee came out 1.5x too tall. Texture aspect
// and quad aspect have to be the same number, so the only safe place for that
// number is here, returned alongside the texture.
function standeeTextureFromImage(img) {
  const w = Math.max(1, img.naturalWidth || img.width);
  const h = Math.max(1, img.naturalHeight || img.height);
  const scale = Math.min(1, TOKEN_TEX_PX / Math.max(w, h));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w * scale));
  c.height = Math.max(1, Math.round(h * scale));
  const ctx = c.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  // Fills the canvas exactly, so no letterboxing and no distortion.
  ctx.drawImage(img, 0, 0, c.width, c.height);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return { tex, aspect: c.width / c.height };
}

function circleTextureFromImage(img, { ring = '#0f121c', rim = 'rgba(255,255,255,0.35)' } = {}) {
  const c = document.createElement('canvas');
  c.width = TOKEN_TEX_PX;
  c.height = TOKEN_TEX_PX;
  const ctx = c.getContext('2d');
  const r = TOKEN_TEX_PX / 2;

  ctx.save();
  ctx.beginPath();
  ctx.arc(r, r, r - 6, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  // Cover-fit: fill the circle, crop the overflow, never squash.
  const scale = Math.max(TOKEN_TEX_PX / img.width, TOKEN_TEX_PX / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  ctx.drawImage(img, (TOKEN_TEX_PX - w) / 2, (TOKEN_TEX_PX - h) / 2, w, h);
  ctx.restore();

  // Rings, so a token reads against a busy map the way it does in 2D.
  ctx.beginPath();
  ctx.arc(r, r, r - 6, 0, Math.PI * 2);
  ctx.lineWidth = 8;
  ctx.strokeStyle = ring;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(r, r, r - 10, 0, Math.PI * 2);
  ctx.lineWidth = 3;
  ctx.strokeStyle = rim;
  ctx.stroke();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// No art: a flat coloured disc, blue for players and red for everything else,
// matching the ground markers.
function fallbackTokenTexture(color) {
  const c = document.createElement('canvas');
  c.width = TOKEN_TEX_PX;
  c.height = TOKEN_TEX_PX;
  const ctx = c.getContext('2d');
  const r = TOKEN_TEX_PX / 2;
  ctx.beginPath();
  ctx.arc(r, r, r - 6, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = 8;
  ctx.strokeStyle = '#0f121c';
  ctx.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Shared GLSL: a cheap 3D value-noise fbm, used by the star surface below.
// Value noise rather than simplex because the whole job is "mottle a sphere" —
// four octaves of it is a couple of dozen instructions and the difference is
// invisible at the size a star is ever drawn.
const NOISE_GLSL = `
  float vhash(vec3 p) {
    return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453123);
  }
  float vnoise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float n000 = vhash(i + vec3(0.0, 0.0, 0.0));
    float n100 = vhash(i + vec3(1.0, 0.0, 0.0));
    float n010 = vhash(i + vec3(0.0, 1.0, 0.0));
    float n110 = vhash(i + vec3(1.0, 1.0, 0.0));
    float n001 = vhash(i + vec3(0.0, 0.0, 1.0));
    float n101 = vhash(i + vec3(1.0, 0.0, 1.0));
    float n011 = vhash(i + vec3(0.0, 1.0, 1.0));
    float n111 = vhash(i + vec3(1.0, 1.0, 1.0));
    return mix(
      mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y),
      mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y),
      f.z
    );
  }
  float fbm(vec3 p) {
    float a = 0.5;
    float s = 0.0;
    for (int k = 0; k < 5; k++) {
      s += a * vnoise(p);
      p *= 2.03;
      a *= 0.5;
    }
    return s;
  }
`;

// A star's surface, not a flat fill.
//
// Three things together are what read as "a sun" rather than "a yellow ball":
// granulation (the boiling convection pattern), sunspots (cool dark patches),
// and limb darkening (the disc is dimmer and redder at its edge, which is the
// single strongest cue that you are looking at a sphere). All three are
// procedural, so there is no texture to load and no seam at the poles.
function makeStarMaterial(coreHex, glowHex) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uCore: { value: new THREE.Color(coreHex || '#fff6cf') },
      uGlow: { value: new THREE.Color(glowHex || '#ffd873') },
      uTime: { value: 0 },
    },
    fog: false,
    vertexShader: `
      varying vec3 vObj;
      varying vec3 vNrm;
      varying vec3 vView;
      void main() {
        vObj = position;
        vNrm = normalize(normalMatrix * normal);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vView = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      uniform vec3 uCore;
      uniform vec3 uGlow;
      uniform float uTime;
      varying vec3 vObj;
      varying vec3 vNrm;
      varying vec3 vView;
      ${NOISE_GLSL}
      void main() {
        // Sampled in OBJECT space, so the pattern is painted on the star and
        // stays put when the camera orbits.
        vec3 p = normalize(vObj);

        // Three fields at different scales and drift rates. The coarse one is
        // the slow churn, the mid one the supergranulation, the fine one the
        // speckle that keeps the surface from going smooth when the camera is
        // right on top of it. Different drift rates are what make it boil
        // rather than slide.
        float swirl = fbm(p * 2.3 - vec3(uTime * 0.028, 0.0, uTime * 0.019));
        float gran  = fbm(p * 11.0 + vec3(0.0, uTime * 0.055, 0.0));
        float fine  = fbm(p * 27.0 - vec3(uTime * 0.09, uTime * 0.04, 0.0));

        // Sharpened rather than left as a smooth ramp: a linear mix between
        // two temperatures reads as haze, and a star's granules have edges.
        float h = smoothstep(0.34, 0.72, gran * 0.58 + swirl * 0.42);

        // Sunspots are the coldest part of the coarse field, feathered so they
        // have penumbrae instead of hard holes.
        float spot = smoothstep(0.58, 0.36, swirl);

        vec3 cool = uGlow * 0.58;         // the cooler troughs between granules
        vec3 hot  = uCore * 1.60;         // the hot crests, pushed past white
        vec3 col = mix(cool, hot, h);
        col += (fine - 0.5) * 0.30 * uCore;
        col = mix(col, uGlow * 0.22, spot * 0.7);

        float ndv = clamp(dot(normalize(vNrm), normalize(vView)), 0.0, 1.0);
        // Limb darkening — dimmer AND redder at the edge. Dimming alone made
        // it read as a lit moon; the colour shift is what says "hot gas".
        float limb = 0.60 + 0.40 * pow(ndv, 0.50);
        col *= limb;
        col = mix(uGlow * 0.62 * limb, col, smoothstep(0.0, 0.50, ndv));
        // Chromosphere: a thin hot line right on the silhouette, which stops
        // the darkened limb reading as a smudge.
        col += uGlow * pow(1.0 - ndv, 6.0) * 1.15;

        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }
    `,
  });
}

// The halo around a star.
//
// NOT a bigger sphere. A shell mesh at constant opacity draws its own
// silhouette — a hard-edged second ball parked around the star, which is
// exactly what it looked like. A camera-facing sprite carrying a radial
// gradient that reaches zero alpha at its rim has no silhouette to see, and
// it matches what the flat system map draws.
function makeStarGlowSprite(glowHex) {
  const SIZE = 256;
  const c = document.createElement('canvas');
  c.width = SIZE;
  c.height = SIZE;
  const ctx = c.getContext('2d');
  const col = new THREE.Color(glowHex || '#ffd873');
  const rgb = `${Math.round(col.r * 255)}, ${Math.round(col.g * 255)}, ${Math.round(col.b * 255)}`;
  const g = ctx.createRadialGradient(SIZE / 2, SIZE / 2, 0, SIZE / 2, SIZE / 2, SIZE / 2);
  // Sampled off a curve rather than a few hand-placed stops: a straight ramp
  // between two stops has a visible kink where the slope changes, and on an
  // additive halo that kink reads as a ring.
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    const a = Math.pow(1 - t, 2.4) * 0.62;
    g.addColorStop(t, `rgba(${rgb}, ${a.toFixed(4)})`);
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, SIZE, SIZE);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false,
  }));
  sprite.renderOrder = 3;
  return sprite;
}

// A planet's surface, lit by its own sun.
//
// Deliberately NOT one of three's lit materials. The scene's key light plus
// 0.75 ambient is tuned for reading a battlemap from above — it lights a
// sphere almost flat, and a planet with no terminator is a sticker. This runs
// its own directional term with a hard-ish shadow line, an unlit side that
// keeps a little starlight rather than going to black, and an atmosphere that
// catches light on the lit limb only.
// Fallback headroom for a deck with no height set, in feet — world units here
// ARE feet. Matches the column default in ship_decks, so a ship built before
// the field existed stacks exactly as it did.
const DEFAULT_DECK_HEIGHT_FT = 10;

// The height a ship's deck plane is drawn at, above that deck's own rise.
// The board on an ordinary map has no such offset — it sits at y=0.
// How tall a creature stands, in feet, or null to derive it as before.
//
// Read defensively for the same reason as the ring colours: it comes from a
// column a user types into. Note the explicit empty check before Number() —
// Number(null) is 0, a finite value that would collapse every token that had
// never set a height into nothing at all.
function tokenHeightFt(t) {
  const raw = t?.creature_token_height;
  if (raw === null || raw === undefined || raw === '') return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  // A hard ceiling and floor so a typo cannot produce a token the size of the
  // map or one too small to click.
  return Math.max(0.5, Math.min(60, n));
}

// The ring under a token in 3D: the creature's own choice, or the default it
// has always had. Both are read defensively — these come straight from a
// column a user can type into, and a bad value must fall back rather than
// throw or paint the marker invisible.
const DEFAULT_BASE_PLAYER = '#4f8fff';
const DEFAULT_BASE_OTHER = '#ff6b6b';

function baseColor(t) {
  const raw = String(t?.creature_base_color || '').trim();
  // Only #rgb / #rrggbb — anything else is a typo or a stale value, and
  // THREE.Color warns and turns black on input it cannot parse.
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(raw)) return raw;
  return t?.is_player ? DEFAULT_BASE_PLAYER : DEFAULT_BASE_OTHER;
}

// 0-100 in the column, 0-1 here. Absent or unparseable means the old default.
//
// The empty cases are tested BEFORE Number(), because Number(null) and
// Number('') are both 0 — a finite number that sails through any isFinite
// check and means "completely invisible". An unset column arrives as null, so
// that is the common path, not an edge case: without this every creature that
// had never touched the setting would lose its marker entirely.
function baseOpacity(t) {
  const raw = t?.creature_base_opacity;
  if (raw === null || raw === undefined || raw === '') return 0.7;
  const n = Number(raw);
  if (!Number.isFinite(n)) return 0.7;
  return Math.max(0, Math.min(1, n / 100));
}

// The height a ship's deck plane is drawn at, above that deck's own rise.
const DECK_PLANE_Y = 0.3;

// The height the BOARD is drawn at.
//
// It is not one number: the plain ground plane sits at y=0, while the
// fog-of-war build — which is what a player sees, clipped to their visibility
// polygon — puts its triangles at 0.1 so the grid at 0.15 sits on top of them.
// Anything meant to lie on the board must clear the HIGHER of the two, or it
// works for the GM and is buried for the player.
//
// That is exactly what happened to the token markers: at 0.02 they cleared the
// GM's ground and sat under the player's, so they were invisible everywhere a
// player could see and showed only over fog, where the clipped ground leaves no
// triangles at all.
const BOARD_TOP_Y = 0.1;

// How far a token's ground marker floats above the surface it stands on.
//
// This was 0.36, measured from the token's floor rather than from the surface
// the floor actually draws at — which meant it cleared a ship's deck plane by
// 0.06 but hovered a full 0.36 above the board on an ordinary map. On a standee
// that gap is a disc floating at ankle height, cutting across the bottom of the
// artwork. It is now measured from the real surface (see surfaceY below), so
// the clearance is the same everywhere, and it is small because the material
// carries a polygon offset: the depth test is biased in the marker's favour, so
// it can sit this close to the floor without the two z-fighting.
const DISC_LIFT = 0.02;

// How far a flat terrain piece floats above the board.
//
// This was 0.25, which put scenery a clear 0.13 ABOVE the ring a token stands
// in (BOARD_TOP_Y + DISC_LIFT = 0.12). At a raking camera angle that gap is
// visible: a bloodstain or a scatter of debris hovers over the floor instead
// of lying on it, and a token standing in it appears to be standing under it.
//
// Now just below the token's own base ring, so a piece reads as being on the
// same floor the tokens are on — which is what a flat piece is.
//
// The height alone is not what keeps terrain over the grid; the polygon offset
// on the material does that (see the flat-terrain mesh). Lowering it to sit on
// the board would otherwise have let the grid, which depth-tests against the
// ground, paint straight over every piece.
const TERRAIN_LIFT = BOARD_TOP_Y + 0.01;

// Clip a polygon to an axis-aligned rectangle (Sutherland–Hodgman).
//
// Used to cut a visibility polygon down to one laid tile's footprint, so a
// tile map's floor can be fogged the way a drawn map's floor already is.
// Everything else on the board settles for "is any part of this in sight?",
// which is fine for a scatter of debris and wrong for a tile: a tile IS the
// map, so revealing a whole one because the party can see a foot of it
// through a doorway hands over the entire room.
//
// The subject polygon may be concave — a visibility polygon usually is — and
// the clipper is a rectangle, which is convex. That is exactly the case this
// algorithm is sound for.
function clipPolyToRect(poly, x0, y0, x1, y1) {
  const clip = (pts, inside, cut) => {
    const out = [];
    for (let i = 0; i < pts.length; i++) {
      const cur = pts[i];
      const prev = pts[(i + pts.length - 1) % pts.length];
      const curIn = inside(cur);
      if (inside(prev) !== curIn) out.push(cut(prev, cur));
      if (curIn) out.push(cur);
    }
    return out;
  };
  // Intersections are taken along the edge rather than by solving the line,
  // so a vertical or horizontal edge (which a visibility polygon is full of)
  // never divides by zero.
  const atX = (a, b, x) => ({ x, y: a.y + ((b.y - a.y) * (x - a.x)) / ((b.x - a.x) || 1e-9) });
  const atY = (a, b, y) => ({ y, x: a.x + ((b.x - a.x) * (y - a.y)) / ((b.y - a.y) || 1e-9) });

  let p = poly;
  p = clip(p, (q) => q.x >= x0, (a, b) => atX(a, b, x0)); if (p.length < 3) return [];
  p = clip(p, (q) => q.x <= x1, (a, b) => atX(a, b, x1)); if (p.length < 3) return [];
  p = clip(p, (q) => q.y >= y0, (a, b) => atY(a, b, y0)); if (p.length < 3) return [];
  p = clip(p, (q) => q.y <= y1, (a, b) => atY(a, b, y1)); if (p.length < 3) return [];
  return p;
}

// How far a PRONE piece lies above the surface.
//
// Everything else down here is biased toward the camera to win the depth test
// at almost no altitude: terrain at -3/-6, a token's ground marker at -5/-10.
// A prone piece had neither — just 0.04 of clearance and no bias — so terrain
// and its own base ring painted over the body lying on them. The gap was
// enough at a top-down camera and not at a raking one, because the offset's
// factor term scales with the polygon's screen-space slope: the flatter the
// angle, the harder the floor pushed in front of the figure.
//
// So: lifted clear of both, AND biased harder than either (see the material
// below). Either alone leaves the failure at some camera angle; together the
// ordering holds at every angle.
const PRONE_LIFT = DISC_LIFT * 4;

// Which levels of each hull this viewer sees, and how high each one sits.
//
// The rules are the flat map's — see deckLayersByShip in MapStage.jsx, which
// is the authority — because a ship has to look the same in both views:
//
//   * GM, hull collapsed: the one active deck, flat on the board.
//   * GM, hull expanded:  every level, stacked.
//   * Player NOT aboard:  every level, stacked. You are looking at the outside
//                         of someone else's ship, so you see the whole thing.
//   * Player aboard:      your deck and everything below it. The levels above you
//                         are roof; the ones below are the structure you are
//                         standing over, and they are dimmed with depth the way
//                         the flat map blurs them.
//
// Heights accumulate in deck_index order rather than being multiplied by the
// index: indices routinely have gaps (delete a level and the rest keep their
// numbers), and a gap would otherwise become empty air. Sails are excluded —
// they hang off the hull rather than being a floor.
//
// `rises` is returned separately because the token pass needs it too: crew have
// to ride the level they are standing on.
function shipDeckLayout(ships, { isGM, picks, viewerToken }) {
  const out = new Map();
  for (const sh of (ships || [])) {
    const real = (sh.decks || [])
      .filter((d) => !d.is_sails)
      .slice()
      .sort((a, b) => a.deck_index - b.deck_index);
    if (!real.length) continue;

    const rises = new Map();
    let y = 0;
    for (const d of real) {
      rises.set(Number(d.deck_index), y);
      const h = Number(d.height_ft);
      y += Number.isFinite(h) && h > 0 ? h : DEFAULT_DECK_HEIGHT_FT;
    }

    const aboard = viewerToken && viewerToken.ship_id === sh.id
      ? (Number(viewerToken.deck_index) || 0)
      : null;

    let shown;
    if (isGM) {
      // Whatever the GM ticked. Untouched, that is the hull's active deck —
      // the one the flat map is showing — so a ship looks the same in both
      // views until they say otherwise. Every deck off is a legal answer: it
      // means "I am not looking at the inside of this ship".
      const want = new Set(picks?.[sh.id] || [Number(sh.active_deck) || 0]);
      shown = real.filter((d) => want.has(Number(d.deck_index))).map((d) => ({ deck: d, dim: 1 }));
    } else if (aboard != null) {
      shown = real
        .filter((d) => Number(d.deck_index) <= aboard)
        .map((d) => ({
          deck: d,
          // Further down reads as further away. Floored so a tall hull does not
          // dissolve entirely, matching the cap the flat map puts on its blur.
          dim: Number(d.deck_index) === aboard
            ? 1
            : Math.max(0.35, 1 - (aboard - Number(d.deck_index)) * 0.25),
        }));
    } else {
      shown = real.map((d) => ({ deck: d, dim: 1 }));
    }

    // A single level lies flat on the board, exactly as it always has; only a
    // stack needs lifting.
    // A single level lies flat on the board, exactly as it always has; only a
    // stack needs lifting.
    const stacked = shown.length > 1;
    const layers = shown.map((l) => ({
      ...l,
      rise: stacked ? (rises.get(Number(l.deck.deck_index)) || 0) : 0,
    }));
    // Keyed on the SHOWN decks only.
    //
    // This used to hand back the rises for every deck on the hull, or null when
    // just one was drawn. Null meant crew on levels that were not being drawn
    // still resolved to a height of zero and piled onto whichever floor was
    // visible. Now a deck that isn't shown has no entry, and the token pass
    // reads that as "this crewman is on a level you can't see".
    const shownRises = new Map();
    for (const l of layers) shownRises.set(Number(l.deck.deck_index), l.rise);
    out.set(sh.id, { layers, rises: shownRises });
  }
  return out;
}

// A ship's air envelope.
//
// The flat map fills it as a pale disc, which works there because you are
// looking straight down at it. In 3D a filled shell would be a frosted ball
// with the ship hidden inside — the same mistake the sun's corona made when it
// was a constant-opacity sphere.
//
// So the shell is drawn by its EDGE: alpha rises with the angle between the
// surface and your eye, which is nearly zero where you look straight through it
// and highest at the silhouette. You get a bubble you can see the shape of, and
// an unobstructed view of the hull inside it.
// Heavy fog: a solid block of it, standing in the shape the zone was drawn.
//
// The first attempt built the bank out of the cloud system's puffs, and those
// are SPRITES — flat images turned to face the camera. That is right for a
// distant cloud and wrong for fog you walk into: orbit the board and the whole
// bank swings round with you, and no arrangement of flat cards ever reads as
// something with an inside.
//
// So the fog is now real geometry: the zone's own footprint — the same circle
// or polygon the flat map fogs — extruded upward into a volume, shaded so it is
// dense in the middle and softens at every edge rather than ending on a cut
// line. Solid where it matters, and it holds its shape from any angle.
//
// `uViewer` opens the five-foot pocket. Doing it in the shader means the pocket
// is a smooth hole in a continuous volume that follows the token exactly,
// instead of geometry being switched on and off around them.
function makeFogVolumeMaterial(tint = 0xb9c2d4) {
  return new THREE.ShaderMaterial({
    transparent: true,
    // No depth write: the bank must not punch a hole in the depth buffer that
    // hides the board and the tokens standing on it. Density comes from the
    // alpha, which is what "can't see through it" actually means here.
    depthWrite: false,
    side: THREE.DoubleSide,      // you have to be able to stand inside it
    fog: false,
    uniforms: {
      uColor:   { value: new THREE.Color(tint) },
      uTime:    { value: 0 },
      // Viewer position in world feet, and the reach of the clearing around
      // them. Reach 0 disables the pocket, which is what the GM gets.
      uViewer:  { value: new THREE.Vector3(0, 0, 0) },
      uReach:   { value: 0 },
      uDensity: { value: 0.97 },
      // Extrusion depth in world feet — the real number the geometry was
      // built with, since the vertical fade measures against it.
      uHeight:  { value: 20 },
    },
    vertexShader: `
      varying vec3  vWorld;
      varying float vUp;      // 0 at the floor, 1 at the top of the bank
      varying vec3  vNrm;
      varying vec3  vView;
      uniform float uHeight;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorld = wp.xyz;
        // The extrusion runs along local +Z before the mesh is laid flat, so
        // local Z is height and local XY is the footprint.
        vUp = clamp(position.z / max(uHeight, 0.001), 0.0, 1.0);
        vNrm = normalize(normalMatrix * normal);
        vec4 mv = viewMatrix * wp;
        vView = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      uniform vec3  uColor;
      uniform float uTime;
      uniform vec3  uViewer;
      uniform float uReach;
      uniform float uDensity;
      varying vec3  vWorld;
      varying float vUp;
      varying vec3  vNrm;
      varying vec3  vView;

      // Cheap layered value noise. Sines rather than a hash texture: three
      // octaves is enough to break up a flat wall of colour, and it costs
      // nothing next to sampling.
      float churn(vec3 p, float t) {
        float a = sin(p.x * 0.055 + t * 0.35) * cos(p.z * 0.047 - t * 0.28);
        float b = sin(p.x * 0.021 - t * 0.19) * cos(p.z * 0.026 + t * 0.23);
        float c = sin((p.x + p.z) * 0.013 + p.y * 0.03 + t * 0.12);
        return (a * 0.5 + b * 0.35 + c * 0.15) * 0.5 + 0.5;
      }

      void main() {
        float n = churn(vWorld, uTime);

        // Density by how much fog you are looking THROUGH.
        //
        // This replaced a radial fade that measured distance from the bank's
        // centre against its own radius — which on an extruded shape is a
        // catastrophe: every point of every side wall sits exactly ON the
        // perimeter, so that term drove the whole wall to zero alpha and left
        // only the floor cap showing. A bank with no height, in other words.
        //
        // Grazing angles cross more of the volume than face-on ones do, so
        // this both looks right and cannot single out the geometry that makes
        // the fog three-dimensional.
        float ndv = abs(dot(normalize(vNrm), normalize(vView)));
        float thickness = mix(1.0, 0.84, ndv);

        // A ragged ceiling rather than a lid: the noise is added to the height
        // before the fade, so the top dissolves unevenly instead of ending on
        // a flat line, and the bank is at full weight low down where fog sits.
        float top = 1.0 - smoothstep(0.62, 1.02, vUp + (n - 0.5) * 0.28);

        // The noise varies the weight; it must not halve it. At a wider band
        // the bank read as a haze face-on even at full density, because both
        // this and the thickness term were taking a bite out of the same
        // alpha.
        float a = uDensity * thickness * top * (0.88 + 0.22 * n);

        // The clearing around whoever is standing in it. Feathered, so what you
        // can make out shades off rather than ending on a drawn circle.
        if (uReach > 0.0) {
          float d = distance(vWorld.xz, uViewer.xz);
          a *= smoothstep(uReach * 0.45, uReach * 1.15, d);
        }

        if (a <= 0.004) discard;
        gl_FragColor = vec4(uColor, clamp(a, 0.0, 1.0));
        #include <colorspace_fragment>
      }
    `,
  });
}

function makeBubbleMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,          // never occludes the ship or the board
    blending: THREE.AdditiveBlending,
    side: THREE.FrontSide,      // the near shell only; both would double the rim
    fog: false,
    uniforms: { uColor: { value: new THREE.Color(0x7dd3fc) } },
    vertexShader: `
      varying vec3 vNrm;
      varying vec3 vView;
      void main() {
        // Normals must survive the non-uniform scale that makes this an
        // ellipsoid, hence normalMatrix rather than the raw normal.
        vNrm = normalize(normalMatrix * normal);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vView = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      varying vec3 vNrm;
      varying vec3 vView;
      void main() {
        float ndv = abs(dot(normalize(vNrm), normalize(vView)));
        // Steep falloff: a thin bright rim, and glass everywhere else.
        // Steeper and fainter than a first pass: at 3.5/0.85 the dome read as
        // frosted glass from a low angle, where most of the shell is edge-on.
        float rim = pow(1.0 - ndv, 5.0);
        gl_FragColor = vec4(uColor, rim * 0.60);
        #include <colorspace_fragment>
      }
    `,
  });
}

// A deck's grid, clipped to the deck's own artwork.
//
// Drawn as a PLANE with the lines computed in the shader, not as line geometry.
// Deck art is a cut-out on a transparent background — a hull is a ship-shaped
// hole in a rectangle — and lines have no way to ask the texture whether they
// are over anything. A shaded plane can: it samples the art's alpha at the same
// point it draws the line, so the lattice stops at the gunwale instead of
// running out across empty space.
//
// Line width is derived with fwidth so it stays about a pixel however far the
// camera is, rather than thickening into a solid slab when you zoom out.
function makeDeckGridMaterial(tex, cols, rows) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    fog: false,
    side: THREE.DoubleSide,
    uniforms: {
      uMap: { value: tex },
      uCells: { value: new THREE.Vector2(Math.max(1, cols), Math.max(1, rows)) },
      uColor: { value: new THREE.Color(0xffffff) },
      uOpacity: { value: 0.18 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D uMap;
      uniform vec2 uCells;
      uniform vec3 uColor;
      uniform float uOpacity;
      varying vec2 vUv;
      void main() {
        // Squares of the deck, counted from its top-left like the deck's own
        // col/row — the same frame the stairs and the art use.
        vec2 g = vec2(vUv.x * uCells.x, (1.0 - vUv.y) * uCells.y);
        vec2 d = abs(fract(g) - 0.5);          // 0.5 at a cell centre, 0 at an edge
        vec2 w = fwidth(g);                    // one screen pixel, in cell units
        // How close to a line, in pixels, on whichever axis is nearer.
        vec2 e = (0.5 - d) / max(w, vec2(1e-6));
        float line = 1.0 - smoothstep(0.0, 1.0, min(e.x, e.y));
        if (line <= 0.001) discard;

        // The mask: the artwork's own alpha. Softened slightly so the lattice
        // fades at the hull's edge rather than ending on a hard step.
        float art = smoothstep(0.15, 0.5, texture2D(uMap, vUv).a);
        float a = line * art * uOpacity;
        if (a <= 0.002) discard;
        gl_FragColor = vec4(uColor, a);
        #include <colorspace_fragment>
      }
    `,
  });
}

const PLANET_LIGHT = new THREE.Vector3(-0.55, 0.42, 0.72).normalize();

// Surface maps are cached for the life of the tab, keyed by world.
//
// The geometry effect that builds terrain re-runs every time ANYONE moves a
// token. Drawing a 1024x512 canvas and uploading it to the GPU for every
// planet on the board, every step someone takes, is not affordable — and the
// texture never changes, so there is nothing to rebuild. Materials are still
// made fresh per build (they carry per-piece opacity, and three caches the
// compiled program), but the texture behind them is made exactly once.
const planetTexCache = new Map();

// A stable seed for art that isn't one of the shipped rocks, so a GM's own
// asteroid keeps the same lumps and the same tumble every time the scene is
// rebuilt rather than reshaping itself on every token move.
function hashArtPath(p) {
  let h = 2166136261;
  const str = String(p || '');
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// A generated rock surface for art that isn't one of the shipped rocks.
//
// The uploaded picture is NEVER used as the texture. It is an orthographic
// image with its own light and shadow painted in, on a transparent background,
// and wrapping that round a lump smears the shading over the surface and paints
// the empty corners on as solid blocks — which is exactly how it looked.
//
// Instead the art is sampled for its COLOUR and a surface is generated in that
// tone, so the rock matches the one on the flat map without inheriting a scrap
// of its lighting. Sampling needs the image decoded, so the mesh starts with a
// neutral rock and the tinted one is swapped in when it arrives.
const rockArtTexCache = new Map();

function rockTextureForArt(art, key, seed) {
  const cached = rockArtTexCache.get(art);
  if (cached) return cached;

  const tex = new THREE.CanvasTexture(makeRockCanvas({ key, seed }));
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  rockArtTexCache.set(art, tex);

  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    const palette = paletteFromImage(img, key);
    const next = makeRockCanvas({ key, seed, palette });
    tex.image = next;
    tex.needsUpdate = true;
  };
  img.src = `/uploads/${art}`;
  return tex;
}

// Uploaded art — deck plans, scenery — loaded once per tab and shared.
//
// The geometry pass rebuilds on every token move, every ship move and every
// wall change, and it used to construct a fresh TextureLoader for each deck and
// each terrain piece every single time. So nudging one ship re-fetched and
// re-uploaded the art of every ship and every piece of scenery on the board:
// the "everything reloads" flicker. The bitmap behind a given path never
// changes — uploads are content-addressed by name — so it is fetched once.
//
// Materials using one of these are flagged `sharedMap`, because the teardown
// below disposes material maps and disposing a shared one would force the
// re-download this exists to prevent.
const artTexCache = new Map();

function artTextureFor(art) {
  let tex = artTexCache.get(art);
  if (tex) return tex;
  tex = new THREE.TextureLoader().load(`/uploads/${art}`);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  artTexCache.set(art, tex);
  return tex;
}

// Token art: decoded once, rasterised once.
//
// The token pass runs on every move, and for each token carrying art it was
// allocating a fresh Image AND rasterising a fresh canvas texture — a decode
// and a GPU upload per token per step. Six tokens moving around a board is
// hundreds of textures a minute to end up with six pictures.
//
// It also leaked outright. The old code disposed the previous texture inside
// the image's onload, which is asynchronous: when a rebuild tore the sprite
// down while its art was still loading, the callback still ran, built a
// texture, assigned it to a material nothing pointed at any more, and that
// texture was never freed by anything. Moving tokens is exactly the thing that
// triggers a rebuild, so the leak was worst while the board was busiest.
//
// The image and the finished texture are both cached, keyed by art and by
// treatment — a face becomes a disc, a standee keeps its own proportions, and
// those rasterise differently from the same source.
const tokenImgCache = new Map();   // art -> Promise<HTMLImageElement>
const tokenTexCache = new Map();   // `art|treatment` -> { tex, aspect }

function tokenImageFor(art) {
  let pending = tokenImgCache.get(art);
  if (pending) return pending;
  pending = new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`token art failed: ${art}`));
    img.src = `/uploads/${art}`;
  });
  // A FAILED load must not stay in the cache.
  //
  // This cached the promise itself, so one failure was permanent: every later
  // attempt got the same rejected promise back and the token kept its plain
  // coloured disc until the page was reloaded. That is not hypothetical — art
  // imported into the desktop app while it was running stayed blank in 3D
  // forever, because the view had already tried and failed those files before
  // they existed on disk. The flat map was unaffected, since use-image retries
  // on every mount, which is exactly why it looked like a 3D bug.
  pending.catch(() => {
    if (tokenImgCache.get(art) === pending) tokenImgCache.delete(art);
  });
  tokenImgCache.set(art, pending);
  return pending;
}

function tokenTextureFor(art, standee) {
  const key = `${art}|${standee ? 'standee' : 'disc'}`;
  const hit = tokenTexCache.get(key);
  if (hit) return Promise.resolve(hit);
  // Rasterising can fail too — a tainted canvas throws on read — and the same
  // rule applies: do not remember a failure as though it were an answer.
  return tokenImageFor(art).then((img) => {
    // Another sprite with the same art may have arrived first while this was
    // waiting — take theirs rather than rasterising a second copy.
    const already = tokenTexCache.get(key);
    if (already) return already;
    const built = standee
      ? standeeTextureFromImage(img)
      : { tex: circleTextureFromImage(img), aspect: 1 };
    tokenTexCache.set(key, built);
    return built;
  });
}

// The board's own artwork, cached by URL.
//
// This is the biggest texture the scene holds — a whole dungeon map — and it
// was being re-loaded and re-decoded on EVERY geometry rebuild, which is every
// time anyone moves. Worse, each new texture was assigned straight over
// groundMat.map without disposing the one it replaced, and groundMat is
// deliberately exempt from the per-build disposal. So one full-size map
// texture was orphaned per movement and never freed: the leak behind the tab
// being reloaded for memory.
//
// Cached and reused instead. The same picture is the same texture, however
// many times the scene is rebuilt.
const groundTexCache = new Map();

function groundTextureFor(url) {
  let tex = groundTexCache.get(url);
  if (tex) return tex;
  tex = new THREE.TextureLoader().load(url, undefined, undefined, () => {});
  tex.colorSpace = THREE.SRGBColorSpace;
  groundTexCache.set(url, tex);
  return tex;
}

// Door sprites, cached by path.
//
// Without this every geometry rebuild allocated a fresh Image and a fresh
// THREE.Texture for EVERY door carrying art — and the geometry rebuild runs
// every time anyone moves. On a board with 28 textured doors drawn from 6
// distinct files that is 28 decodes and 28 GPU uploads per step, to end up
// with six pictures. The textures were freed again on the next rebuild, so it
// read as churn rather than as a classic leak, but the allocation rate alone
// was enough to have the tab reloaded for memory.
//
// Cached the same way artTextureFor caches map art, and for the same reason.
const doorTexCache = new Map();

function doorTextureFor(path, onReady) {
  let tex = doorTexCache.get(path);
  if (tex) return tex;
  const img = new Image();
  img.crossOrigin = 'anonymous';
  tex = new THREE.Texture(img);
  img.onload = () => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    // The first build asked for a picture that had not arrived. Nudge the
    // scene so it draws again now that it has.
    onReady?.();
  };
  img.src = `/uploads/${path}`;
  doorTexCache.set(path, tex);
  return tex;
}

const rockTexCache = new Map();

function rockTextureFor(key, seed) {
  const id = `${key}:${seed}`;
  let tex = rockTexCache.get(id);
  if (tex) return tex;
  tex = new THREE.CanvasTexture(makeRockCanvas({ key, seed }));
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  rockTexCache.set(id, tex);
  return tex;
}

// The deformed geometry is cached too. Displacing a few thousand vertices is
// cheap once and wasteful on every token move, which is how often the geometry
// pass runs.
const rockGeoCache = new Map();

// Give the GPU everything back when the 3D view closes.
//
// The caches above are deliberately module-level: re-entering the 3D view
// should not re-decode every piece of art. The cost of that decision was never
// measured until now — on the live GM board, opening 3D took the GPU process
// from 196MB to 1,460MB, and switching back to the flat map released NONE of
// it. It did not grow on a second visit, so it was not a leak in the usual
// sense; it was simply kept forever, and a tab that had been in 3D once carried
// 1.26GB for the rest of the session.
//
// So the cache now lasts as long as the view does. Re-entering 3D pays to
// rebuild its textures from art the browser still has in its HTTP cache, which
// is a visible pause of a second or so — a fair price for the memory, and the
// GM switches view far less often than they think.
function releaseSharedGpuMemory() {
  const release = (v) => {
    if (!v) return;
    if (typeof v.then === 'function') { v.then(release).catch(() => {}); return; }
    if (v.isTexture || v.isBufferGeometry) { v.dispose(); return; }
    if (v.tex?.isTexture) v.tex.dispose();
    if (v.geometry?.isBufferGeometry) v.geometry.dispose();
  };
  for (const c of [planetTexCache, rockArtTexCache, artTexCache, tokenTexCache,
                   groundTexCache, doorTexCache, rockTexCache, rockGeoCache]) {
    for (const v of c.values()) release(v);
    c.clear();
  }
  // Not textures, but the same reasoning: the wall sampler holds a full
  // ImageData copy of the map art, and the token image cache holds decoded art.
  wallSamplerCache.clear();
  tokenImgCache.clear();
  disposeSkyTextures();
}

function rockGeometryFor(key, seed, radius) {
  // Radius is baked in, so it is part of the key — a boulder and a large
  // asteroid of the same type are different meshes.
  const id = `${key}:${seed}:${radius.toFixed(2)}`;
  let geo = rockGeoCache.get(id);
  if (geo) return geo;
  // A faceted rock needs FEWER triangles, not more. Flat-shading a 40x28
  // sphere gives a thousand tiny facets, which reads as crumpled foil; a
  // coarse sphere gives broad planes that catch the light like a cut gem.
  const seg = rockIsFaceted(key) ? [11, 8] : [40, 28];
  geo = deformRock(new THREE.SphereGeometry(radius, seg[0], seg[1]), { key, seed });
  rockGeoCache.set(id, geo);
  return geo;
}

function planetTextureFor(key, seed) {
  const id = `${key}:${seed}`;
  let tex = planetTexCache.get(id);
  if (tex) return tex;
  tex = new THREE.CanvasTexture(makePlanetCanvas({ key, seed }));
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  planetTexCache.set(id, tex);
  return tex;
}

function makePlanetMaterial(tex, palette, opacity = 1) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: tex },
      uLight: { value: PLANET_LIGHT.clone() },
      uAtmo: { value: new THREE.Color(palette?.atmo || '#bcd8ff') },
      uAtmoAmt: { value: Number(palette?.atmoAmt) || 0 },
      uOpacity: { value: opacity },
    },
    transparent: opacity < 1,
    fog: false,
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vNrm;
      varying vec3 vView;
      void main() {
        vUv = uv;
        vNrm = normalize(normalMatrix * normal);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vView = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      uniform sampler2D uMap;
      uniform vec3 uLight;
      uniform vec3 uAtmo;
      uniform float uAtmoAmt;
      uniform float uOpacity;
      varying vec2 vUv;
      varying vec3 vNrm;
      varying vec3 vView;
      void main() {
        // The light direction is given in VIEW space, so the terminator stays
        // put as the camera orbits instead of sweeping round the planet.
        vec3 n = normalize(vNrm);
        float lam = dot(n, normalize(uLight));

        // sRGB texel to linear. A ShaderMaterial gets no automatic decode, and
        // skipping this washes every world out by roughly a stop.
        vec3 base = pow(texture2D(uMap, vUv).rgb, vec3(2.2));

        // Soft terminator, and a night side lit to 13% rather than 0 — a black
        // crescent against black space just removes half the planet. The band
        // is deliberately wide: a hard shadow line is physically right and
        // useless at the size a marker is drawn on a board.
        float day = smoothstep(-0.34, 0.52, lam);
        vec3 col = base * (0.13 + 0.92 * day);

        float ndv = clamp(dot(n, normalize(vView)), 0.0, 1.0);
        // Atmosphere: strongest at the silhouette, and only where the sun
        // reaches it.
        float rim = pow(1.0 - ndv, 3.2) * uAtmoAmt * smoothstep(-0.35, 0.45, lam);
        col += uAtmo * rim * 0.9;

        gl_FragColor = vec4(col, uOpacity);
        #include <colorspace_fragment>
      }
    `,
  });
}

// One row of the layers panel: a tick that draws the thing, and a name that
// puts the TABLE on it.
//
// Two targets in one row because they are two different questions. The tick is
// this viewer's own — what the GM is looking at, nobody else. The name is the
// scene: it sets the map's active storey or the hull's active deck, which is
// what the flat map draws for everyone. Conflating them is what the old radio
// button did, and it meant the GM could not study the roof without moving the
// whole table onto it.
function LayerRow({ on, active, index, label, title, onToggle, onActivate }) {
  return (
    <div className="flex items-stretch gap-1">
      <button
        type="button"
        onClick={onToggle}
        title={on ? `Hide ${label}` : `Draw ${label}`}
        className={`w-5 shrink-0 rounded text-[10px] font-bold leading-none transition-colors ${
          on ? 'bg-sky-400 text-gray-900' : 'bg-gray-800 text-gray-600 hover:text-gray-300'
        }`}
      >{on ? '\u2713' : ''}</button>
      <button
        type="button"
        onClick={onActivate}
        title={title}
        className={`flex-1 min-w-0 flex items-center gap-1.5 rounded px-1.5 py-1 text-xs text-left transition-colors ${
          active ? 'bg-dnd-gold text-gray-900 font-semibold'
                 : 'text-gray-300 hover:text-white hover:bg-gray-800'
        }`}
      >
        <span className={`w-4 shrink-0 text-center text-[10px] font-bold rounded ${
          active ? 'bg-gray-900/20 text-gray-900' : 'bg-gray-800 text-gray-400'
        }`}>{index}</span>
        <span className="truncate">{label}</span>
      </button>
    </div>
  );
}

// Shared empty default: a fresh [] on every render would be a new reference
// each time, which is exactly the churn the flat map's EMPTY_IDS avoids.
const EMPTY_FX = [];

export default function Map3DView({
  mapUrl,
  mapWidth,
  mapHeight,
  // Cast effects in flight — { tokenId, effect, ts }. The flat map paints these
  // on its own canvas; this view builds them as geometry. Same list, same
  // clock, so a spell fires at the same moment in both.
  tokenFx = EMPTY_FX,
  // Which map this is. Plugins keep per-map state (the weather plugin keys its
  // sky off it), so without this a split party on two maps would share one sky.
  mapId = null,
  gridSize = 50,
  tokens = [],
  walls = [],
  doors = [],
  // Laid tiles on a tile map — the floor, and the walls around it.
  tiles = [],
  // Spell templates — cones, circles, lines, squares.
  spellTemplates = [],
  // Magical darkness, heavy fog and water zones — all rows of the same table,
  // distinguished by zone_type.
  magicalDarkness = [],
  // Placed lights. Token-carried lights come out of `tokens`, so this is only
  // the ones the GM dropped on the map.
  lights = [],
  // Spelljammers and the like, each with its `decks` array attached.
  ships = [],
  // Switch which level of a hull is on screen. GM only — the flat map gates
  // its deck buttons on !isPlayer, and this renderer has no such flag, so the
  // handler's presence IS the gate: DMView passes it, PlayerView doesn't.
  // Wired to the same `set_ship_deck` the 2D buttons drive, so picking a level
  // here and picking one there are the same action and the views agree.
  onShipDeckChange = null,
  // This viewer's own token, when they have one. A player aboard a hull sees
  // their own deck and the structure below it; everyone else sees the whole
  // ship. Null for the GM, who has the deck switcher instead.
  viewerTokenId = null,
  // ── Steering ──────────────────────────────────────────────────────────────
  // The one hull this viewer may drive: the ship whose helm their token is
  // standing at, and which they can actually attune to. Null for everyone
  // else, which is what keeps a passenger from shoving the ship around.
  pilotableShipId = null,
  onShipMove = null,
  onShipRotate = null,
  // Boarding. Called instead of onTokenMove when a drop lands on a hull, and
  // when a token that WAS aboard is dropped off the side — the same signature
  // and the same two cases the flat map's commitTokenMove routes.
  onTokenDeckMove = null,
  // Taking the stairs. Called when a token is dropped on a deck square that
  // carries a transition — see the drop handler for why 3D uses the drop and
  // the flat map uses a click.
  onTokenChangeDeck = null,
  // The hull's own instruments, shown while you have the wheel. Passed in
  // rather than derived here: PlayerView already resolves who holds the helm
  // and whether they can work it, and two copies of that rule would drift.
  helmShip = null,
  pilotDenial = null,
  // 'wildspace' maps can be shown as a surrounding bubble instead of a flat
  // board — see the sky effect below.
  mapType = 'image',
  // An uploaded panorama for the bubble. A .hdr is loaded as a real HDRI;
  // anything else is treated as an ordinary equirectangular picture. Without
  // one, a wildspace map falls back to wrapping its own board image.
  skyUrl = null,
  // A built-in sky, drawn client-side, for maps with nothing uploaded. Ignored
  // when skyUrl is set — an uploaded panorama is always the better picture.
  skyPreset = null,
  // Star/ring geometry for a generated system map, in map pixels. Present only
  // on maps the system generator made.
  system = null,
  // 'square' or 'hex' — the same lattice the flat map draws.
  gridType = 'square',
  // ── Placing things from the panel ──────────────────────────────────────
  // The flat map's placement contract, brought over unchanged so the same
  // library click works in whichever view happens to be open. 3D is a view of
  // the map, not a separate screen: arming a creature in the panel and then
  // finding the board inert because this overlay is on top is the kind of
  // difference between the two views that shouldn't exist.
  //
  // `placingToken` covers a creature AND a GM marker, exactly as it does in
  // MapStage — both are "something is on the cursor waiting for a square".
  placingToken = false,
  onMapClick = null,
  pendingTerrain = null,
  onTerrainPlace = null,
  // ── GM tools that were flat-map only ──────────────────────────────────
  // Ping, and the Effects zones. Their absence here meant the 3D view was a
  // read-only board for anything but tokens: the GM had to drop back to 2D to
  // point at something or lay a fog bank, on a view whose whole purpose is
  // showing the table what a place looks like.
  //
  // Presence of onPingMap is also what puts Ping on the rail — it is GM-only,
  // and PlayerView passes nothing.
  pings = [],
  onPingMap = null,
  onMagicalDarknessAdd = null,
  onMagicalDarknessDelete = null,
  // Placing spell templates. The 3D view already DREW them — it just had no way
  // to put one down, so a GM had to drop back to the flat map to aim a
  // fireball at a room they were showing the table in 3D.
  onTemplatePlace = null,
  onTemplateDelete = null,
  // Editing one that is already down: drag to move it, click to open its
  // settings. Same two handlers, and the same meaning, as the flat map's
  // Move/Edit tool.
  onTemplateUpdate = null,
  onTemplateSelect = null,
  // Right-clicking a fog bank, so its height can be set. 3D-only: height is
  // meaningless on the flat map, which has no axis to stand it up in.
  onZoneContextMenu = null,
  // Picking a token, as opposed to moving it. The host uses this to sync its
  // own selection — which is what scrolls the GM panel's token list to the
  // creature you just clicked.
  onTokenSelect = null,
  // Scenery and markers placed on the board.
  terrain = [],
  gridScale = 5,
  gridUnit = 'ft',
  // ── Visibility ────────────────────────────────────────────────────────────
  // This renderer knows nothing about the Konva stage's fog and line of sight,
  // so it has to do its own. `fogOfWar` with `visionOrigins` clips the ground
  // to what those origins can actually see and culls tokens outside it.
  // Without this the 3D view showed players the entire map and every token on
  // it — a straight information leak past the fog the 2D view enforces.
  // Pixels of the right edge already spoken for by the host's own chrome — the
  // GM's panel, when it is open. This view's right-anchored controls shift left
  // by it so an expanded panel doesn't bury them. The panel itself is drawn by
  // the host ABOVE this overlay; all this renderer needs to know is how wide.
  rightInset = 0,
  // Pixels of the TOP edge already spoken for by the host's own chrome — the
  // map's top bar, which stays on screen in 3D. Same bargain as rightInset:
  // the host draws the bar above this overlay, and this renderer only needs to
  // know how tall it is so its own top-anchored controls drop below it instead
  // of sharing those pixels with it.
  topInset = 0,
  // The storeys of a multi-level map, and which one is drawn. Empty for an
  // ordinary single-floor board, where the switcher never appears.
  //
  // The 3D view draws the SAME storey the flat map is showing rather than
  // stacking them all: the two views are one map seen two ways, and a GM who
  // switched to the first floor in 2D and found themselves looking at the whole
  // building in 3D would have to work out which floor they were pointing at.
  // The map tab's grid style, so the lattice looks the same in both views and
  // one control governs both. `gridColor` is an rgba() string: the colour and
  // the opacity travel together, and an opacity of zero is how the GM turns the
  // grid off — here that means not building it at all rather than drawing it
  // invisibly.
  gridColor = null,
  levels = [],
  activeLevel = 0,
  onLevelChange = null,
  // Draw every storey at once, stacked at their real heights — the same thing
  // the ships' expanded deck view does for a hull. GM only: it is a way of
  // reading the building, not a way of playing on it.
  // Also show the storeys ABOVE the one being viewed.
  //
  // The floors BELOW are always drawn — a first floor with nothing under it is
  // a rug hanging in the air, and you cannot tell where you are in a building
  // without seeing what it is standing on. What gets in the way is the ceiling,
  // so that is what this reveals rather than what it stacks.
  stackLevels = false,
  onToggleStackLevels = null,
  // Right-click menus, GM-side. The 3D view doesn't own them — it works out
  // WHAT was clicked and hands the id and the screen position to the host,
  // which already renders these menus for the flat map. One menu, two views.
  onTokenContextMenu = null,
  onTerrainContextMenu = null,
  // Open or shut a door. The flat map toggles on a plain click and offers a
  // fuller menu on right-click, but that menu is MapStage's own local state
  // rather than the host's, so there is nothing to reuse here — this is the
  // one action that matters, on the gesture the GM already reaches for.
  onDoorToggle = null,
  // The GM's door menu. Players are given only `onDoorToggle` — they may work
  // a door, not re-sprite or delete one — so this being null is what makes the
  // right-click fall back to a plain open/close for them.
  onDoorMenu = null,
  onTileMenu = null,
  // Take a staircase. Given the transition that was clicked; the host decides
  // who moves and to where.
  onStairUse = null,
  // A ref the host hands in to be given this view's "centre on a token" action,
  // called as focusTokenRef.current(tokenId) — or with no argument for the
  // viewer's own token.
  //
  // The button that calls it lives in the HOST's control cluster rather than
  // floating inside this overlay: that cluster is where every other camera-ish
  // control already is, and the two hosts want different affordances — a player
  // gets one button, the GM a picker. The action has to live here regardless,
  // since only this component holds the camera.
  focusTokenRef = null,
  fogOfWar = false,
  visionOrigins = [],
  // Walls are NOT drawn in 3D. The ground carries the map image, which
  // already shows them; extruding boxes on top duplicated that artwork and
  // fought with it. Kept as a prop so callers don't break, and so the decision
  // is visible rather than silently absent.
  wallMode = 'none',
  // ── Movement ──────────────────────────────────────────────────────────────
  // Which tokens this viewer may drag. The GM gets everything; a player gets
  // their own. Movement is horizontal only — dragging slides a token across
  // its CURRENT height rather than changing it, so a flying token stays flying
  // and elevation remains something you set deliberately.
  movableTokenIds = [],
  onTokenMove = null,
  // ── Ink ───────────────────────────────────────────────────────────────────
  // The same strokes the flat map draws, in the same map coordinates, through
  // the same socket events. Drawing is a shared channel: a line sketched in
  // 3D has to appear on the 2D map and the other way round, so nothing here
  // stores ink of its own — it renders `drawings` and reports finished strokes
  // back out.
  drawings = [],
  onDrawStroke = null,
  onDrawUndo = null,
  inkColor = '#ef4444',
  onClose,
}) {
  const mountRef = useRef(null);
  const stateRef = useRef(null);
  // Who this viewer is, read through a ref by the focus action below. The
  // action is handed to the host once and called much later, so closing over
  // the id directly would pin it to whatever it was at registration.
  const viewerTokenRef = useRef(viewerTokenId);
  useEffect(() => { viewerTokenRef.current = viewerTokenId; }, [viewerTokenId]);
  // Guards the retry loop above: a chain of requestAnimationFrame callbacks
  // outlives the component that scheduled it, and driving a disposed renderer's
  // controls is a crash waiting for the wrong moment.
  // Read by the canvas listener, which is registered once and would otherwise
  // capture whatever these were on the first render.
  const tokenMenuRef = useRef(onTokenContextMenu);
  const terrainMenuRef = useRef(onTerrainContextMenu);
  const doorToggleRef = useRef(onDoorToggle);
  const doorMenuRef = useRef(onDoorMenu);
  const tileMenuRef = useRef(onTileMenu);
  const stairUseRef = useRef(onStairUse);
  useEffect(() => { tokenMenuRef.current = onTokenContextMenu; }, [onTokenContextMenu]);
  useEffect(() => { terrainMenuRef.current = onTerrainContextMenu; }, [onTerrainContextMenu]);
  useEffect(() => { doorToggleRef.current = onDoorToggle; }, [onDoorToggle]);
  useEffect(() => { doorMenuRef.current = onDoorMenu; }, [onDoorMenu]);
  useEffect(() => { tileMenuRef.current = onTileMenu; }, [onTileMenu]);
  useEffect(() => { stairUseRef.current = onStairUse; }, [onStairUse]);

  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);
  // Handlers are attached once to the canvas, so the live values they need
  // ride in refs rather than being baked into a stale closure.
  const movableRef = useRef(movableTokenIds);
  useEffect(() => { movableRef.current = movableTokenIds; }, [movableTokenIds]);
  const onTokenMoveRef = useRef(onTokenMove);
  useEffect(() => { onTokenMoveRef.current = onTokenMove; }, [onTokenMove]);
  // Same pattern for steering: the pointer handlers are bound once, in the
  // scene-setup effect, so everything they read has to come through a ref.
  const pilotableShipIdRef = useRef(pilotableShipId);
  useEffect(() => { pilotableShipIdRef.current = pilotableShipId; }, [pilotableShipId]);
  const onShipMoveRef = useRef(onShipMove);
  useEffect(() => { onShipMoveRef.current = onShipMove; }, [onShipMove]);
  const onShipRotateRef = useRef(onShipRotate);
  useEffect(() => { onShipRotateRef.current = onShipRotate; }, [onShipRotate]);
  // The pointer handlers are bound once, in the scene-setup effect, whose deps
  // are only the map's own geometry. Reading `ships` from that closure gave the
  // hull's position AS IT WAS WHEN THE VIEW OPENED, so committing a drag added
  // the delta to a stale base and the ship leapt back to wherever it had been
  // — further every time it was moved.
  const shipsRef = useRef(ships);
  useEffect(() => { shipsRef.current = ships; }, [ships]);
  // Same reason as shipsRef: the pointer handlers close over the first render's
  // token list, and boarding has to know whether the token being dropped was
  // already aboard something.
  const tokensRef = useRef(tokens);
  useEffect(() => { tokensRef.current = tokens; }, [tokens]);
  const onTokenDeckMoveRef = useRef(onTokenDeckMove);
  useEffect(() => { onTokenDeckMoveRef.current = onTokenDeckMove; }, [onTokenDeckMove]);
  const onTokenChangeDeckRef = useRef(onTokenChangeDeck);
  useEffect(() => { onTokenChangeDeckRef.current = onTokenChangeDeck; }, [onTokenChangeDeck]);
  // The deck switcher is GM-only, so its presence is also what tells the drop
  // logic whose rules to apply.
  // ── Hover card ────────────────────────────────────────────────────────────
  //
  // The flat map prints a name and HP bar under every token permanently. In 3D
  // that would be a forest of floating plates hiding the board, so the same
  // information is shown one token at a time, on hover.
  //
  // Only the ID lives in React state, and it changes at most once per token
  // entered or left — the card's POSITION is written straight to the DOM from
  // the render loop below. Putting the position in state would re-render this
  // component on every mouse move and every camera frame, which on a file this
  // size is the difference between a smooth orbit and a stuttering one.
  const [hoverTokenId, setHoverTokenId] = useState(null);
  const hoverObjRef = useRef(null);   // the THREE object being hovered
  const hoverCardRef = useRef(null);  // the DOM node to position

  const isGMRef = useRef(!!onShipDeckChange);
  useEffect(() => { isGMRef.current = !!onShipDeckChange; }, [onShipDeckChange]);
  // Placement state, through refs like every other live value here: the pointer
  // handlers are built once when the view mounts, so a prop they closed over
  // would be whatever it was at mount — permanently "nothing on the cursor".
  const placingTokenRef = useRef(placingToken);
  useEffect(() => { placingTokenRef.current = placingToken; }, [placingToken]);
  const onMapClickRef = useRef(onMapClick);
  useEffect(() => { onMapClickRef.current = onMapClick; }, [onMapClick]);
  const pendingTerrainRef = useRef(pendingTerrain);
  useEffect(() => { pendingTerrainRef.current = pendingTerrain; }, [pendingTerrain]);
  const onTerrainPlaceRef = useRef(onTerrainPlace);
  useEffect(() => { onTerrainPlaceRef.current = onTerrainPlace; }, [onTerrainPlace]);
  const gridTypeRef = useRef(gridType);
  useEffect(() => { gridTypeRef.current = gridType; }, [gridType]);
  const pingsRef = useRef(pings);
  useEffect(() => { pingsRef.current = pings; }, [pings]);
  const onPingMapRef = useRef(onPingMap);
  useEffect(() => { onPingMapRef.current = onPingMap; }, [onPingMap]);
  const onDarkAddRef = useRef(onMagicalDarknessAdd);
  useEffect(() => { onDarkAddRef.current = onMagicalDarknessAdd; }, [onMagicalDarknessAdd]);
  const onDarkDeleteRef = useRef(onMagicalDarknessDelete);
  useEffect(() => { onDarkDeleteRef.current = onMagicalDarknessDelete; }, [onMagicalDarknessDelete]);
  // The storey the table is on, so a ping lands on the floor the GM is looking
  // at rather than always on the ground.
  const activeLevelRef = useRef(activeLevel);
  useEffect(() => { activeLevelRef.current = activeLevel; }, [activeLevel]);
  const levelsRef = useRef(levels);
  useEffect(() => { levelsRef.current = levels; }, [levels]);
  const mapIdRef = useRef(mapId);
  useEffect(() => { mapIdRef.current = mapId; }, [mapId]);
  const tokenFxRef = useRef(tokenFx);
  useEffect(() => { tokenFxRef.current = tokenFx; }, [tokenFx]);

  // ── The viewer's own weather clamp ──────────────────────────────────────
  //
  // The GM decides what the weather IS; this decides how much of it this
  // viewer's eyes and device actually take, down to none. Kept per-viewer and
  // local on purpose — it is an accessibility and framerate control, not part
  // of the shared scene, so it must not be broadcast or persisted server-side.
  //
  // Read through a ref because the render loop samples it every frame and
  // must not re-run on a slider drag.
  const [weatherClamp, setWeatherClamp] = useState(readWeatherClamp);
  const weatherClampRef = useRef(weatherClamp);
  useEffect(() => {
    weatherClampRef.current = weatherClamp;
    writeWeatherClamp(weatherClamp);
  }, [weatherClamp]);

  // Whether there is any weather to clamp — drives the control's visibility so
  // it does not sit on a clear sky. Polled rather than pushed for the same
  // reason the loop polls the state itself.
  const [weatherActive, setWeatherActive] = useState(false);
  useEffect(() => {
    const poll = () => {
      let on = false;
      for (const fn of pluginRegistries.mapWeather.values()) {
        if (typeof fn !== 'function') continue;
        try {
          const spec = fn({ mapId: mapIdRef.current, isPlayer: !isGMRef.current });
          if (spec && ((spec.layers || []).length || spec.visibility)) { on = true; break; }
        } catch { /* a broken plugin must not take the control down */ }
      }
      setWeatherActive(on);
    };
    poll();
    const id = setInterval(poll, 1500);
    return () => clearInterval(id);
  }, []);

  const magicalDarknessRef = useRef(magicalDarkness);
  useEffect(() => { magicalDarknessRef.current = magicalDarkness; }, [magicalDarkness]);
  // Who is looking, read per-frame: the fog pocket has to follow the token as
  // it walks, and the render loop is built once.
  const viewerTokenIdRef = useRef(viewerTokenId);
  useEffect(() => { viewerTokenIdRef.current = viewerTokenId; }, [viewerTokenId]);
  const onTemplatePlaceRef = useRef(onTemplatePlace);
  useEffect(() => { onTemplatePlaceRef.current = onTemplatePlace; }, [onTemplatePlace]);
  const onTemplateDeleteRef = useRef(onTemplateDelete);
  useEffect(() => { onTemplateDeleteRef.current = onTemplateDelete; }, [onTemplateDelete]);
  const spellTemplatesRef = useRef(spellTemplates);
  useEffect(() => { spellTemplatesRef.current = spellTemplates; }, [spellTemplates]);
  const onTemplateUpdateRef = useRef(onTemplateUpdate);
  useEffect(() => { onTemplateUpdateRef.current = onTemplateUpdate; }, [onTemplateUpdate]);
  const onTemplateSelectRef = useRef(onTemplateSelect);
  useEffect(() => { onTemplateSelectRef.current = onTemplateSelect; }, [onTemplateSelect]);
  const zoneMenuRef = useRef(onZoneContextMenu);
  useEffect(() => { zoneMenuRef.current = onZoneContextMenu; }, [onZoneContextMenu]);
  const onTokenSelectRef = useRef(onTokenSelect);
  useEffect(() => { onTokenSelectRef.current = onTokenSelect; }, [onTokenSelect]);
  const [ready, setReady] = useState(false);
  // Bumped by the geometry effect so the token pass re-culls against new fog.
  const [geomTick, setGeomTick] = useState(0);
  // Bumped when the wall-colour sampler finishes reading the map art. The
  // geometry pass runs synchronously and the image does not, so the first build
  // draws walls in the fallback colour and this brings it back once the real
  // colours are available.
  const [wallTick, setWallTick] = useState(0);
  // The active tool, named exactly as the flat map names it so the same rail
  // component drives both. 'orbit' is this view's equivalent of Pan: the
  // primary gesture is looking around, and a tool has to be chosen to do
  // anything else with a left-drag.
  // A map with a panorama uploaded is shown inside it — no toggle.
  //
  // The sky belongs to the map, so whether it's used is the map's business,
  // not a per-viewer preference to rediscover on every board.
  // A sky at all: either an uploaded panorama or one of the built-in presets.
  const bubble = !!skyUrl || !!skyPreset;

  // What the ground shows: the map art, or nothing but the grid.
  //
  // Derived, not frozen. A useState initialiser runs once at mount, and this
  // view mounts before the session state lands — so `system` was still null
  // when the default was computed, a generated system came up showing its
  // starfield rug, and nothing ever revisited the decision.
  //
  // v2 key: the v1 values were written on mount rather than on choice, so they
  // hold defaults nobody picked. Bumping the key discards them.
  const floorKey = `dndvtt_3d_floor_v2_${mapUrl || 'none'}`;
  const [floorChoice, setFloorChoice] = useState(null);
  useEffect(() => {
    let stored = null;
    try {
      const raw = localStorage.getItem(floorKey);
      if (raw === 'map' || raw === 'clear') stored = raw;
    } catch {}
    setFloorChoice(stored);
  }, [floorKey]);

  // A generated system and a wildspace map both want an empty plane: their
  // "art" is a starfield, and the thing worth looking at is the sun, the
  // orbits, and whatever is flying between them.
  const floorMode = floorChoice
    || ((mapType === 'wildspace' || system) ? 'clear' : 'map');

  // Persisted on an explicit CHOICE, so a stored value always means "the
  // viewer decided this" rather than "this is what the default happened to be
  // the first time the view opened".
  const chooseFloor = (mode) => {
    setFloorChoice(mode);
    try { localStorage.setItem(floorKey, mode); } catch {}
  };

  const floorModeRef = useRef(floorMode);
  useEffect(() => { floorModeRef.current = floorMode; }, [floorMode]);

  const [tool, setTool] = useState('move');
  // ── Layers: what the GM has switched on ───────────────────────────────────
  //
  // A storey is not a radio button. The old control offered one level or all of
  // them, which cannot express "the ground floor and the roof, nothing in
  // between" — the view a GM actually wants when working out what a shot from
  // the battlements can see. So each storey and each deck is ticked on or off
  // independently, and any combination is legal.
  //
  // Local to this viewer, like the flat map's per-ship layer toggle: it changes
  // how the GM is LOOKING at the building, not which floor the table is on.
  // The scene's own active level and active deck are still shared state, still
  // set by clicking the row's name, and still what the flat map draws.
  //
  // `null`/absent is NOT "nothing ticked" — it is "no opinion yet", and the
  // resolvers below fall back to the scene: the active level and everything
  // under it, and each hull's active deck. That is exactly what this view drew
  // before anyone touched a tick, so the GM's first sight of a map is unchanged.
  const [levelPicks, setLevelPicks] = useState(null);   // number[] | null
  const [deckPicks, setDeckPicks] = useState({});       // shipId -> number[]

  // The GM is whoever was handed the handlers — the same test the rest of this
  // file uses. A player has no picks and keeps the roofs toggle.
  const levelsAreMine = !!onLevelChange;

  const shownLevels = React.useMemo(() => {
    // No storeys means one storey, and it is always drawn. Without this the GM's
    // tick set on an ordinary single-floor battlemap is empty rather than
    // absent, and an empty set hides everything that belongs to level 0 — which
    // is every door on every map that never had storeys at all.
    if (!levelsAreMine || !(levels || []).length) return null;
    if (levelPicks) return new Set(levelPicks);
    return new Set((levels || [])
      .map((l) => Number(l.level_index) || 0)
      .filter((li) => li <= (Number(activeLevel) || 0)));
  }, [levelsAreMine, levelPicks, levels, activeLevel]);

  // Is this storey drawn? The one question the whole renderer asks, in the one
  // place that knows how it is being answered — ticks for the GM, the roofs
  // toggle for a player.
  const levelIsShown = (li) => (shownLevels
    ? shownLevels.has(Number(li) || 0)
    : (stackLevels || (Number(li) || 0) <= (Number(activeLevel) || 0)));

  // Stable signatures for the effects below, which must not depend on Set or
  // object identity — both are new on every toggle.
  const shownLevelsKey = shownLevels
    ? `pick:${[...shownLevels].sort((a, b) => a - b).join(',')}`
    : `auto:${stackLevels}:${activeLevel}`;
  const deckPicksKey = JSON.stringify(deckPicks);

  const toggleLevelPick = (li) => setLevelPicks((prev) => {
    const base = prev || (levels || [])
      .map((l) => Number(l.level_index) || 0)
      .filter((x) => x <= (Number(activeLevel) || 0));
    return base.includes(li) ? base.filter((x) => x !== li) : [...base, li];
  });

  const toggleDeckPick = (sh, di) => setDeckPicks((prev) => {
    const base = prev[sh.id] || [Number(sh.active_deck) || 0];
    const next = base.includes(di) ? base.filter((x) => x !== di) : [...base, di];
    return { ...prev, [sh.id]: next };
  });

  // A storey the table moves to is a storey the GM wants to see. Only for a
  // rail they have already touched — an untouched one follows the scene
  // wholesale — and it only ever ADDS, so switching floors never silently
  // clears the view they built.
  useEffect(() => {
    const li = Number(activeLevel) || 0;
    setLevelPicks((prev) => (prev && !prev.includes(li) ? [...prev, li] : prev));
  }, [activeLevel]);

  // The same courtesy for a hull whose active deck is changed from the flat map.
  const activeDeckKey = (ships || []).map((sh) => `${sh.id}:${Number(sh.active_deck) || 0}`).join(',');
  useEffect(() => {
    setDeckPicks((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const sh of (ships || [])) {
        const picked = next[sh.id];
        const di = Number(sh.active_deck) || 0;
        if (picked && !picked.includes(di)) { next[sh.id] = [...picked, di]; changed = true; }
      }
      return changed ? next : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDeckKey]);

  // A different map is a different building: its storeys are not the ones the
  // GM ticked, and keeping stale indices would hide floors on a board that
  // never had them switched off.
  const levelSetKey = (levels || []).map((l) => Number(l.level_index) || 0).sort((a, b) => a - b).join(',');
  useEffect(() => { setLevelPicks(null); }, [levelSetKey]);
  const toolRef = useRef('move');
  useEffect(() => { toolRef.current = tool; }, [tool]);
  const inkColorRef = useRef(inkColor);
  useEffect(() => { inkColorRef.current = inkColor; }, [inkColor]);
  const onDrawStrokeRef = useRef(onDrawStroke);
  useEffect(() => { onDrawStrokeRef.current = onDrawStroke; }, [onDrawStroke]);
  const onDrawUndoRef = useRef(onDrawUndo);
  useEffect(() => { onDrawUndoRef.current = onDrawUndo; }, [onDrawUndo]);
  const [error, setError] = useState('');
  // How far the panorama has got. Null once it is up, or when this map has
  // none — a large HDRI can take a while, and a black screen with no
  // explanation reads as a broken view.
  const [skyPct, setSkyPct] = useState(() => (skyUrl && !isSkyReady(skyUrl) ? (skyProgress(skyUrl) ?? 0) : null));
  useEffect(() => {
    if (!skyUrl || isSkyReady(skyUrl)) { setSkyPct(null); return undefined; }
    setSkyPct(skyProgress(skyUrl) ?? 0);
    return onSkyProgress((url, v) => {
      if (url !== skyUrl) return;
      setSkyPct(v >= 1 ? null : v);
    });
  }, [skyUrl]);

  // ── Scene setup: runs once. Token updates are handled separately below so
  //    moving a token doesn't tear down the renderer. ──
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    const ftPerPx = FT_PER_SQUARE / gridSize;
    const worldW = (Number(mapWidth) || 1000) * ftPerPx;
    const worldH = (Number(mapHeight) || 1000) * ftPerPx;

    // The board's longest side. Every distance below is measured against this
    // rather than against the WIDTH, which is what made a tall map behave
    // differently from a wide one of the same area.
    const span = Math.max(worldW, worldH);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#05070f');
    // Distance fog, pushed out far enough that pulling back never swallows the
    // board.
    //
    // This used to end at worldW * 2.4 while the camera could pull back to
    // worldW * 2.5 — so at full zoom-out the whole map sat PAST the fog's far
    // plane and rendered as flat background. "The further away you go, the
    // darker it gets, and you can never light the whole map at once" is that
    // arithmetic, not a lighting problem.
    //
    // The far plane now clears the maximum orbit distance plus the map's own
    // half-span, which is the furthest any part of the board can ever be from
    // the camera. The near plane still starts around one map-length out, so the
    // depth cue close up is unchanged.
    scene.fog = new THREE.Fog('#05070f', span * 1.4, span * 4.5);

    const camera = new THREE.PerspectiveCamera(50, mount.clientWidth / mount.clientHeight, 1, span * 8);
    // Start low and to the south, the angle that makes height obvious.
    camera.position.set(0, worldH * 0.55, worldH * 0.85);

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true });
    } catch {
      setError('This device can’t open a 3D view (no WebGL).');
      return undefined;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    // Stop the camera going under the floor — from below, the board reads as
    // an unlit rectangle and people think it broke.
    controls.maxPolarAngle = Math.PI * 0.49;
    // How close you may get is measured in SQUARES, not in map widths.
    //
    // This used to be worldW * 0.08, a fraction of the whole board, so the
    // floor moved with the map: 80 ft on a 1000 ft system map — sixteen
    // squares, close enough to nothing — against 12 ft on a dockside map. Two
    // people on different maps therefore had wildly different zoom, which is
    // exactly what it looked like from the outside: "the player can't get as
    // close as the GM".
    //
    // A square is a square on every board, so the floor is a couple of them,
    // with a small map-relative term so an enormous map doesn't let the camera
    // crawl inside a token. The far limit stays map-relative — how far out you
    // need to go to see the whole board genuinely does depend on its size.
    controls.minDistance = Math.max(FT_PER_SQUARE * 1.2, worldW * 0.01);
    // Measured on the longest side too, so a tall map can be pulled back far
    // enough to see all of it.
    controls.maxDistance = span * 2.5;

    scene.add(new THREE.AmbientLight(0xffffff, 0.75));
    const key = new THREE.DirectionalLight(0xffffff, 0.9);
    key.position.set(worldW * 0.4, worldH * 1.2, worldH * 0.5);
    scene.add(key);

    // Everything that changes during play — the fog-clipped floor, walls and
    // doors — lives in this group and is rebuilt by its own effect. Keeping it
    // out of scene setup is what stops the camera resetting on every move.
    const geomGroup = new THREE.Group();
    scene.add(geomGroup);
    // The board itself.
    //
    // alphaTest, so a map drawn with a transparent background is a HOLE and not
    // a black rectangle. Dungeondraft crops each storey to its own content and
    // leaves the rest empty; an opaque material paints that empty space in its
    // own colour, which over a panorama meant the sky was walled off by the
    // very transparency that was supposed to reveal it.
    //
    // alphaTest rather than blended transparency: the empty texels are
    // discarded outright, so the ground still writes depth where it exists and
    // goes on occluding what is under it. Blending would have made the whole
    // board sort against everything else in the scene.
    // Its map comes from groundTexCache and is shared with any later build of
    // this scene, so neither the per-build disposal nor the unmount sweep may
    // free it — both honour this flag.
    const groundMat = new THREE.MeshLambertMaterial({
      color: 0x2a3348,
      side: THREE.DoubleSide,
      alphaTest: 0.05,
    });
    groundMat.userData.sharedMap = true;

    const tokenGroup = new THREE.Group();
    scene.add(tokenGroup);

    // Freehand ink, rebuilt by its own effect. Separate from geomGroup so a
    // stroke doesn't rebuild the floor and a token move doesn't rebuild ink.
    const inkGroup = new THREE.Group();
    scene.add(inkGroup);

    // ── Weather ───────────────────────────────────────────────────────────
    //
    // Rain, snow and the visibility wash, read from the weather plugin through
    // the view-agnostic mapWeather registry and drawn on the GPU. Same state
    // the flat map draws with canvas particles, including the GM's exclusion
    // masks — see weather3d.js for why it is shaped the way it is.
    // Cast effects. Transient geometry, created and disposed as effects come
    // and go — see tokenFx3d.js.
    const tokenFx3d = createTokenFx3D({ scene });

    let lastWeatherSig = null;
    let lastWeatherRegSize = -1;
    // Lets the loop run one final sync after the last effect expires, so the
    // finished geometry is disposed instead of lingering until the next cast.
    let tokenFx3dActive = false;
    const weather = createWeather3D({
      scene, camera, groundMat, ftPerPx,
      mapWidth: Number(mapWidth) || 0,
      mapHeight: Number(mapHeight) || 0,
    });

    // ── Floating numbers ──────────────────────────────────────────────────
    //
    // Damage, healing and temp HP rising off a token and fading out. The flat
    // map gets these from a plugin's Konva nodes, which this renderer cannot
    // run — so plugins publish the same pops as plain data (see mapFloaters in
    // pluginRegistry) and this pass draws them as billboards.
    //
    // Reconciled by id in the render loop rather than rebuilt: a pop lasts a
    // couple of seconds and has to animate every frame, which is exactly what
    // the loop is for, and it means a pop is not lost to a geometry rebuild
    // half way through its rise.
    const floaterGroup = new THREE.Group();
    scene.add(floaterGroup);
    const floaterSprites = new Map(); // floater id -> sprite

    // GM pings, reconciled by id in the same loop and for the same reason.
    const pingGroup = new THREE.Group();
    scene.add(pingGroup);
    const pingRings = new Map(); // ping id -> ring

    // ── Dragging a token ──────────────────────────────────────────────────
    //
    // Pick with a raycast against the token sprites, then follow the pointer
    // across a horizontal plane at that token's OWN height — so a token at
    // 40 ft slides around at 40 ft instead of snapping to the floor the moment
    // it's touched.
    //
    // OrbitControls is disabled for the duration, otherwise the same drag both
    // moves the token and spins the camera.
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const dragPlane = new THREE.Plane();
    const hitPoint = new THREE.Vector3();
    let dragging = null; // { sprite, tokenId, baseY }
    let measure = null;  // { type, from, to, line, label }
    // Effects zones being drawn. Circles are a drag from the centre; polygons
    // collect vertices across separate clicks, so that one outlives the press.
    let zoneDraw = null; // { tool, startX, startY, ring }
    let zonePoly = null; // { tool, pts: [mapX, mapY, …], line }
    let tplDraw = null;  // { type, startX, startY, line }  — map pixels
    let tplMove = null;  // { id, type, origPoints, startX, startY, line }
    let ink = null;      // { pts: Vector3[], line }

    const setPointer = (ev) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
    };

    // Where a press lands on the board, in MAP PIXELS — the one coordinate
    // space both views agree on, and the space the flat map's placement and
    // plugin-click contracts are written in.
    //
    // Cast at the ground plane rather than at whatever mesh is under the
    // cursor: grid_col/grid_row are a position on the board, and the flat map
    // resolves a click the same way. Returns null when the ray misses the
    // plane entirely, which is what looking at the horizon does.
    const mapPointFromEvent = (ev) => {
      setPointer(ev);
      raycaster.setFromCamera(pointer, camera);
      // Cast at the plane of the storey being worked on, not at the ground.
      //
      // On a building, the floor under the cursor is the ACTIVE storey, which
      // may be forty feet up. Casting at y=0 resolved every press against the
      // ground instead, so anything placed from an upper floor landed at
      // whatever the ground happened to be behind it — off by the parallax
      // between the two planes, and further the flatter the camera angle.
      //
      // A plane with normal (0,1,0) sits at y = -constant, hence the negation.
      const floorY = levelBaseFt(levelsRef.current || [], Number(activeLevelRef.current) || 0);
      const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -floorY);
      if (!raycaster.ray.intersectPlane(floorPlane, hitPoint)) return null;
      // The exact inverse of toWorldX/toWorldZ in the geometry pass.
      return {
        x: hitPoint.x / ftPerPx + (Number(mapWidth) || 0) / 2,
        y: hitPoint.z / ftPerPx + (Number(mapHeight) || 0) / 2,
      };
    };

    // Offer the press to the plugins, newest contract first — same shape and
    // same meaning as MapStage's dispatch, so a plugin written against the flat
    // map (click-to-damage, click-to-place) works here with no changes.
    // Returns true when a plugin consumed it.
    const offerToPlugins = (ev, mp) => {
      if (!mp || pluginRegistries.mapClickHandlers.size === 0) return false;
      const isPlayerView = !isGMRef.current;
      for (const [pid, entry] of pluginRegistries.mapClickHandlers.entries()) {
        if (!entry || typeof entry.handler !== 'function') continue;
        if (entry.role === 'dm' && isPlayerView) continue;
        if (entry.role === 'player' && !isPlayerView) continue;
        try {
          if (entry.handler({ x: mp.x, y: mp.y, tool: toolRef.current, isPlayer: isPlayerView })) {
            return true;
          }
        } catch (err) {
          // Fall through to the next plugin, but say so: a throwing handler
          // and an uninterested one are otherwise indistinguishable.
          console.warn(`mapClickHandler "${pid}" threw:`, err);
        }
      }
      return false;
    };

    // Drop whatever is on the cursor onto the square that was clicked.
    // Returns true when the press was spent on a placement.
    const placeAtPress = (ev) => {
      const mp = mapPointFromEvent(ev);
      if (!mp) return false;
      const { ox, oy } = gridOffsets(mapWidth, mapHeight, gridSize);

      // Terrain before tokens, the order the flat map uses.
      const piece = pendingTerrainRef.current;
      if (piece && onTerrainPlaceRef.current) {
        // Centred on the press; the host stores the top-left corner.
        const w = Number(piece.default_w) || 1;
        const h = Number(piece.default_h) || 1;
        onTerrainPlaceRef.current(piece, (mp.x - ox) / gridSize - w / 2, (mp.y - oy) / gridSize - h / 2);
        return true;
      }

      if (placingTokenRef.current && onMapClickRef.current) {
        if (String(gridTypeRef.current) === 'hex') {
          // Hex columns don't line up with integer grid columns, so the clicked
          // hex's own centre is what "it went where I pointed" means here —
          // the same thing MapStage does for a hex board.
          const lat = hexLattice(Number(mapWidth) || 0, Number(mapHeight) || 0, gridSize);
          const p = nearestHexCenter(lat, mp.x, mp.y);
          onMapClickRef.current((p.x - ox) / gridSize - 0.5, (p.y - oy) / gridSize - 0.5);
        } else {
          // Whole cells, so the host's own centring rounds to the lattice —
          // it keys off Number.isInteger, so fractions here would land a
          // creature off-square.
          onMapClickRef.current(
            Math.floor((mp.x - ox) / gridSize),
            Math.floor((mp.y - oy) / gridSize),
          );
        }
        return true;
      }
      return false;
    };

    // Where the press started, so pointerup can tell a click from an orbit.
    // Null once spent.
    let pressAt = null;

    // ── Effects zone previews ─────────────────────────────────────────────
    //
    // Drawn as bright outlines just above the floor rather than as filled
    // shapes: the zone itself gets a proper volume once it exists (see the
    // zone pass), and a translucent fill during the drag would fight with the
    // one already under it.
    const ZONE_PREVIEW_Y = 0.6;
    const zonePreviewColor = (tool) => (
      ZONE_TYPE_FOR_TOOL_3D[tool] === 'water' ? 0x7dd3fc
        : ZONE_TYPE_FOR_TOOL_3D[tool] === 'heavy-fog' ? 0xd1d5db
          : 0xa78bfa
    );
    const disposeLine = (l) => {
      if (!l) return;
      scene.remove(l);
      l.geometry.dispose();
      l.material.dispose();
    };
    // A ring on the floor, in MAP pixel terms, so it matches what gets saved.
    const zoneRingFor = (tool, cxPx, cyPx, rPx) => {
      const pts = [];
      const segs = 72;
      for (let i = 0; i <= segs; i++) {
        const a = (i / segs) * Math.PI * 2;
        pts.push(new THREE.Vector3(
          ((cxPx + Math.cos(a) * rPx) - (Number(mapWidth) || 0) / 2) * ftPerPx,
          ZONE_PREVIEW_Y,
          ((cyPx + Math.sin(a) * rPx) - (Number(mapHeight) || 0) / 2) * ftPerPx,
        ));
      }
      return new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({ color: zonePreviewColor(tool), depthTest: false })
      );
    };
    const zonePolyLineFor = (tool, pts, cursor) => {
      const v = [];
      for (let i = 0; i < pts.length; i += 2) {
        v.push(new THREE.Vector3(
          (pts[i] - (Number(mapWidth) || 0) / 2) * ftPerPx,
          ZONE_PREVIEW_Y,
          (pts[i + 1] - (Number(mapHeight) || 0) / 2) * ftPerPx,
        ));
      }
      if (cursor) {
        v.push(new THREE.Vector3(
          (cursor.x - (Number(mapWidth) || 0) / 2) * ftPerPx,
          ZONE_PREVIEW_Y,
          (cursor.y - (Number(mapHeight) || 0) / 2) * ftPerPx,
        ));
      }
      // Closed back to the first vertex so the shape being enclosed is legible
      // before it is committed.
      if (v.length > 2) v.push(v[0].clone());
      return new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(v),
        new THREE.LineBasicMaterial({ color: zonePreviewColor(tool), depthTest: false })
      );
    };

    // The click-shaped tools: ping, the polygon zones, and the eraser.
    // Returns true when the click was spent.
    const clickToolAtPress = (ev) => {
      const activeTool = toolRef.current;

      if (PING_TOOLS.has(activeTool)) {
        if (!onPingMapRef.current) return false;
        const mp = mapPointFromEvent(ev);
        if (!mp) return false;
        // The storey the table is on travels with it, so the ping surfaces at
        // that floor's height for everyone rather than on the ground; the size
        // rides on which ping tool is up.
        onPingMapRef.current(mp.x, mp.y, {
          level: Number(activeLevelRef.current) || 0,
          size: pingSizeForTool(activeTool),
        });
        return true;
      }

      if (ZONE_POLY_TOOLS_3D.has(activeTool)) {
        if (!onDarkAddRef.current) return false;
        const mp = mapPointFromEvent(ev);
        if (!mp) return false;
        if (!zonePoly || zonePoly.tool !== activeTool) {
          // Switching tool mid-polygon abandons the old one rather than
          // silently mixing vertices into a zone of a different type.
          if (zonePoly) disposeLine(zonePoly.line);
          zonePoly = { tool: activeTool, pts: [mp.x, mp.y], line: null };
        } else {
          const pts = zonePoly.pts;
          // Near the first vertex, with enough of a shape to enclose: close it.
          // The threshold is in map pixels, scaled off the grid so it means the
          // same thing on a 50px board and a 256px one.
          const closeWithin = Math.max(8, gridSize * 0.35);
          if (pts.length >= 6 && Math.hypot(mp.x - pts[0], mp.y - pts[1]) < closeWithin) {
            onDarkAddRef.current({
              zoneType: ZONE_TYPE_FOR_TOOL_3D[activeTool] || 'darkness',
              shape: 'polygon',
              x: 0, y: 0, radius: 0,
              polyPoints: pts,
            });
            disposeLine(zonePoly.line);
            zonePoly = null;
            return true;
          }
          zonePoly.pts = [...pts, mp.x, mp.y];
        }
        disposeLine(zonePoly.line);
        zonePoly.line = zonePolyLineFor(zonePoly.tool, zonePoly.pts, null);
        zonePoly.line.renderOrder = 20;
        scene.add(zonePoly.line);
        return true;
      }

      if (activeTool === 'tpl-erase') {
        if (!onTemplateDeleteRef.current) return false;
        const mp = mapPointFromEvent(ev);
        if (!mp) return false;
        const hit = templateAtMapPoint(mp.x, mp.y);
        if (!hit) return false;
        onTemplateDeleteRef.current(hit.id);
        return true;
      }

      if (activeTool === 'darkness-erase') {
        if (!onDarkDeleteRef.current) return false;
        const mp = mapPointFromEvent(ev);
        if (!mp) return false;
        const hit = zoneAtMapPoint(mp.x, mp.y);
        if (!hit) return false;
        onDarkDeleteRef.current(hit.id);
        return true;
      }

      return false;
    };

    // Outline of a template being dragged out, in map pixels → world.
    // The committed template is drawn properly by the template pass; this is
    // just enough shape to aim by.
    const tplPreviewLine = (type, ax, ay, bx, by) => {
      const wx = (px) => (px - (Number(mapWidth) || 0) / 2) * ftPerPx;
      const wz = (py) => (py - (Number(mapHeight) || 0) / 2) * ftPerPx;
      const Y = 1.1;
      const at = (px, py) => new THREE.Vector3(wx(px), Y, wz(py));
      let pts;
      if (type === 'circle') {
        const r = Math.hypot(bx - ax, by - ay);
        pts = [];
        for (let i = 0; i <= 64; i++) {
          const a = (i / 64) * Math.PI * 2;
          pts.push(at(ax + Math.cos(a) * r, ay + Math.sin(a) * r));
        }
      } else if (type === 'cone') {
        // Mouth as wide as the cone is long, which is how 5e states it and
        // what templateShapeProps builds for the committed version.
        const dx = bx - ax, dy = by - ay;
        const len = Math.hypot(dx, dy) || 1e-6;
        const ux = dx / len, uy = dy / len;
        const half = len / 2;
        pts = [
          at(ax, ay),
          at(ax + ux * len - uy * half, ay + uy * len + ux * half),
          at(ax + ux * len + uy * half, ay + uy * len - ux * half),
          at(ax, ay),
        ];
      } else if (type === 'square') {
        pts = [at(ax, ay), at(bx, ay), at(bx, by), at(ax, by), at(ax, ay)];
      } else {
        pts = [at(ax, ay), at(bx, by)];
      }
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({ color: 0xc084fc, depthTest: false })
      );
      line.renderOrder = 21;
      return line;
    };

    // A template's stored points as the two ends the preview helper wants.
    // Circles keep their radius in the third slot, everything else is a pair
    // of corners — the same two shapes the commit path writes.
    const tplEnds = (t) => {
      const p = (t.points || []).map(Number);
      if (t.type === 'circle') return { ax: p[0], ay: p[1], bx: p[0] + (p[2] || 0), by: p[1] };
      return { ax: p[0], ay: p[1], bx: p[2], by: p[3] };
    };

    // Nearest template to a press, for the eraser. Distance to the template's
    // anchor is enough here — templates are big and rarely stacked, and the
    // flat map's own hit test is no more precise than its threshold either.
    const templateAtMapPoint = (mx, my) => {
      const list = spellTemplatesRef.current || [];
      const threshold = Math.max(gridSize, 30);
      let best = null, bestD = Infinity;
      for (const t of list) {
        const p = Array.isArray(t.points) ? t.points : [];
        if (p.length < 2) continue;
        const d = Math.hypot(mx - Number(p[0]), my - Number(p[1]));
        if (d < bestD) { bestD = d; best = t; }
      }
      return bestD <= threshold ? best : null;
    };

    // Which existing zone is under a press, for the eraser. Circles by radius,
    // polygons by a ray-crossing test — the same shapes the zone pass draws.
    const zoneAtMapPoint = (mx, my) => {
      const list = magicalDarknessRef.current || [];
      // Backwards, so the most recently added zone wins where they overlap.
      for (let i = list.length - 1; i >= 0; i--) {
        const dz = list[i];
        const poly = Array.isArray(dz.poly_points) ? dz.poly_points : null;
        if (poly && poly.length >= 6) {
          let inside = false;
          for (let a = 0, b = poly.length - 2; a < poly.length; b = a, a += 2) {
            const xi = poly[a], yi = poly[a + 1];
            const xj = poly[b], yj = poly[b + 1];
            if (((yi > my) !== (yj > my))
                && (mx < ((xj - xi) * (my - yi)) / ((yj - yi) || 1e-9) + xi)) {
              inside = !inside;
            }
          }
          if (inside) return dz;
          continue;
        }
        const r = Number(dz.radius) || 0;
        if (r <= 0) continue;
        const dx = mx - Number(dz.x), dy = my - Number(dz.y);
        if (dx * dx + dy * dy <= r * r) return dz;
      }
      return null;
    };

    // Which steerable hull is under the pointer, if any.
    //
    // Shared by the drag and the hover cursor so the two can never disagree
    // about what is grabbable — a ship that shows a grab cursor and then
    // doesn't move is worse than one that never offered.
    //
    // Assumes the raycaster has already been aimed at the cursor.
    const shipHitUnderPointer = () => {
      const sg = stateRef.current?.shipGroup;
      if (!sg) return null;
      // The GM moves any ship on the board, the way they do on the flat map.
      // A player may only drive the one hull they hold the helm of.
      const isGM = isGMRef.current;
      const pilotId = pilotableShipIdRef.current;
      if (!isGM && pilotId == null) return null;
      const hits = raycaster.intersectObjects(sg.children, false);
      return hits.find((h) => {
        const u = h.object?.userData || {};
        const id = u.shipHandle != null ? u.shipHandle : u.shipId;
        if (id == null) return false;
        return isGM || id === pilotId;
      }) || null;
    };

    // Begin a hull move or a hull turn, if the pointer is over the ship this
    // viewer may steer. Returns true when a drag was started.
    const startShipDrag = (ev) => {
      const sg = stateRef.current?.shipGroup;
      if (!sg) return false;
      setPointer(ev);
      raycaster.setFromCamera(pointer, camera);
      const hit = shipHitUnderPointer();
      if (!hit) return false;

      const ud = hit.object.userData;
      const shipId = ud.shipHandle != null ? ud.shipHandle : ud.shipId;
      const turning = ud.shipHandle != null;
      if (turning && !onShipRotateRef.current) return false;
      if (!turning && !onShipMoveRef.current) return false;

      // Every piece of this hull moves together — each deck is its own plane,
      // and the grip hangs off the bow.
      const parts = sg.children.filter((o) => o.userData?.shipId === shipId
        || o.userData?.shipHandle === shipId);
      // Where the hull is RIGHT NOW, read once as the drag begins. Everything
      // committed on release is this plus the drag delta.
      const shipNow = (shipsRef.current || []).find((x) => x.id === shipId);
      dragging = {
        ship: true,
        turning,
        shipId,
        pivot: ud.pivot.clone(),
        baseCol: Number(shipNow?.grid_col) || 0,
        baseRow: Number(shipNow?.grid_row) || 0,
        baseRot: Number(shipNow?.rotation) || 0,
        // Feet per round, off the ship's class. 0 means the class has no speed
        // recorded, and the readout then just shows the distance.
        speed: Number(shipNow?.speed) || 0,
        parts: parts.map((o) => ({ obj: o, start: o.position.clone() })),
      };
      // The drag plane sits at whatever was actually grabbed, not at the board.
      // A stacked hull's upper deck can be forty feet up; measuring its motion
      // on the y=0 plane made the ship slide faster than the cursor.
      dragPlane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 1, 0), hit.point);
      dragging.grabbed = hit.point.clone();
      controls.enabled = false;
      renderer.domElement.style.cursor = turning ? 'crosshair' : 'grabbing';
      ev.preventDefault();
      return true;
    };

    const onPointerDown = (ev) => {
      // Taking hold of the view cancels a glide still in flight — otherwise it
      // keeps hauling the camera against the drag for the rest of its run.
      if (stateRef.current) stateRef.current.flight = null;
      if (ev.button !== 0) return;

      // Remember the press so pointerup can tell a click from a camera orbit.
      pressAt = { x: ev.clientX, y: ev.clientY };

      // Plugins get the press before anything else can spend it — the same
      // precedence the flat map gives them, and the reason it matters is the
      // token drag below: a plugin mid-pick (click-to-damage) is asking for a
      // click ON a creature, which would otherwise start dragging it instead.
      const placing = !!placingTokenRef.current || !!pendingTerrainRef.current;
      if (!placing && pluginRegistries.mapClickHandlers.size > 0) {
        if (offerToPlugins(ev, mapPointFromEvent(ev))) {
          pressAt = null;
          ev.preventDefault();
          return;
        }
      }

      // Something on the cursor outranks the tools, exactly as on the flat map:
      // with a creature or a terrain piece waiting for a square, the press
      // belongs to the placement and nothing else gets to consume it.
      //
      // Nothing is recorded and the camera is left alone, so a drag still
      // orbits — lining up a drop by eye is the whole point of placing in 3D —
      // and pointerup decides which of the two it was.
      if (placing) return;

      const activeTool = toolRef.current;

      // ── Effects zones: circles are a drag from the centre ────────────────
      if (ZONE_CIRCLE_TOOLS_3D.has(activeTool)) {
        if (!onDarkAddRef.current) return;
        const mp = mapPointFromEvent(ev);
        if (!mp) return;
        zoneDraw = { tool: activeTool, startX: mp.x, startY: mp.y, ring: null };
        controls.enabled = false;
        ev.preventDefault();
        return;
      }

      // ── Editing a template that is already down ─────────────────────────
      // Grab it here; pointerup decides whether that was a move or a click
      // asking for its settings.
      if (activeTool === 'tpl-edit') {
        if (!onTemplateUpdateRef.current && !onTemplateSelectRef.current) return;
        const mp = mapPointFromEvent(ev);
        if (!mp) return;
        const hit = templateAtMapPoint(mp.x, mp.y);
        if (!hit) return;
        tplMove = {
          id: hit.id,
          type: hit.type,
          origPoints: (hit.points || []).slice(),
          startX: mp.x, startY: mp.y,
          line: null,
        };
        controls.enabled = false;
        ev.preventDefault();
        return;
      }

      // ── Spell templates: drag from the origin out ───────────────────────
      if (TEMPLATE_TOOLS_3D.has(activeTool)) {
        if (!onTemplatePlaceRef.current) return;
        const mp = mapPointFromEvent(ev);
        if (!mp) return;
        tplDraw = {
          type: TEMPLATE_TYPE_FOR_TOOL_3D[activeTool],
          startX: mp.x, startY: mp.y, line: null,
        };
        controls.enabled = false;
        ev.preventDefault();
        return;
      }

      // Ping, the polygon zone tools and the eraser are all CLICKS — they are
      // resolved on release so a drag still orbits the camera. Nothing is
      // recorded here beyond the press position taken above.
      if (PING_TOOLS.has(activeTool)
          || ZONE_POLY_TOOLS_3D.has(activeTool)
          || activeTool === 'darkness-erase'
          || activeTool === 'tpl-erase') {
        return;
      }

      // Undo ink is a click, not a drag — one press drops this author's last
      // stroke, same as the flat map.
      if (activeTool === 'draw-erase') {
        onDrawUndoRef.current?.();
        ev.preventDefault();
        return;
      }

      // Drawing: follow the pointer across the floor and collect the path in
      // MAP pixels, which is the only coordinate space both views agree on.
      if (activeTool === 'draw') {
        setPointer(ev);
        raycaster.setFromCamera(pointer, camera);
        const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        if (raycaster.ray.intersectPlane(groundPlane, hitPoint)) {
          ink = { pts: [hitPoint.clone()], line: null };
          controls.enabled = false;
          ev.preventDefault();
        }
        return;
      }

      // Measuring wins over everything else: it's an explicit tool the user
      // chose, so a drag means measure — not orbit, not move a token.
      if (MEASURE_TOOLS_3D.has(activeTool)) {
        setPointer(ev);
        raycaster.setFromCamera(pointer, camera);
        const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        if (raycaster.ray.intersectPlane(groundPlane, hitPoint)) {
          measure = { type: activeTool, from: hitPoint.clone(), to: hitPoint.clone() };
          controls.enabled = false;
          ev.preventDefault();
        }
        return;
      }
      // Tokens are dragged under Move, exactly as on the flat map. Any other
      // tool leaves a left-drag to the camera, so you can line up a shot
      // without shoving a creature across the room by accident.
      if (activeTool !== 'move') return;
      setPointer(ev);
      raycaster.setFromCamera(pointer, camera);

      // Tokens are tested FIRST on purpose: your own token stands on the deck
      // you would otherwise be grabbing, and moving yourself has to stay
      // possible without stepping off the helm.
      //
      // But an empty token list SKIPS the test rather than returning from the
      // handler, which is what it used to do. That early return also swallowed
      // the hull drag below it, so steering died on any board whose ships carry
      // no crew — a fleet on an open sea being exactly the case where dragging
      // a hull is the only thing there is to do, and the one case where 3D
      // couldn't do it while the flat map could.
      const movable = movableRef.current || [];
      const hit = (movable.length && onTokenMoveRef.current)
        ? raycaster.intersectObjects(tokenGroup.children, false)
          .find((h) => h.object?.userData?.tokenId != null
            && movable.includes(h.object.userData.tokenId))
        : null;
      if (!hit) {
        // Nothing draggable under the pointer among the tokens — try the hull
        // this viewer may steer.
        if (startShipDrag(ev)) return;
        return;
      }

      // THE HOVER CARD GETS OUT OF THE WAY.
      //
      // The name/HP card is a DOM element sitting over the canvas, so it draws
      // on top of everything drawn INSIDE the canvas no matter what render
      // order the 3D label has — and the movement counter is a 3D label,
      // pinned above the token being dragged. The two occupy the same patch of
      // screen, so the card covered the number the drag exists to show.
      hoverObjRef.current = null;
      setHoverTokenId(null);
      dragging = {
        sprite: hit.object,
        tokenId: hit.object.userData.tokenId,
        baseY: hit.object.position.y,
        // The height of the floor this token is standing on, so its marker and
        // drop line stay on that deck while it is dragged about.
        deckY: hit.object.userData.deckY || 0,
        // The marker's own height, so a dragged token's drop line keeps its
        // foot level with the marker instead of drifting off it.
        discY: hit.object.userData.discY ?? ((hit.object.userData.deckY || 0) + DISC_LIFT),
      };
      dragPlane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 1, 0), hit.object.position);
      dragging.startPos = hit.object.position.clone();
      // Speed and footprint come off the token itself, so the readout and the
      // label's size both match the creature being moved.
      const tok = (tokens || []).find((t) => t.id === hit.object.userData.tokenId);
      dragging.speed = Number(tok?.creature_speed) > 0 ? Number(tok.creature_speed) : 30;
      // Same footprint rule as the render pass — otherwise dragging an Ogre
      // measured and labelled it as a Medium.
      dragging.tokenSize = Math.max(FT_PER_SQUARE, tokenFootprint(tok).gridW * FT_PER_SQUARE);
      controls.enabled = false;
      renderer.domElement.style.cursor = 'grabbing';
      ev.preventDefault();
    };

    const onPointerMove = (ev) => {
      // A zone circle grows from where the press landed. Redrawn rather than
      // reshaped: the ring is 72 segments of nothing, and rebuilding it keeps
      // the radius maths in one place.
      if (zoneDraw) {
        const mp = mapPointFromEvent(ev);
        if (!mp) return;
        const r = Math.hypot(mp.x - zoneDraw.startX, mp.y - zoneDraw.startY);
        zoneDraw.r = r;
        disposeLine(zoneDraw.ring);
        zoneDraw.ring = zoneRingFor(zoneDraw.tool, zoneDraw.startX, zoneDraw.startY, r);
        zoneDraw.ring.renderOrder = 20;
        scene.add(zoneDraw.ring);
        return;
      }
      // A template being carried. The outline follows at the drag offset, so
      // where it will land is visible before it is committed.
      if (tplMove) {
        const mp = mapPointFromEvent(ev);
        if (!mp) return;
        tplMove.dx = mp.x - tplMove.startX;
        tplMove.dy = mp.y - tplMove.startY;
        const e0 = tplEnds({ type: tplMove.type, points: tplMove.origPoints });
        disposeLine(tplMove.line);
        tplMove.line = tplPreviewLine(
          tplMove.type,
          e0.ax + tplMove.dx, e0.ay + tplMove.dy,
          e0.bx + tplMove.dx, e0.by + tplMove.dy,
        );
        scene.add(tplMove.line);
        return;
      }

      // A template growing from where the press landed.
      if (tplDraw) {
        const mp = mapPointFromEvent(ev);
        if (!mp) return;
        tplDraw.endX = mp.x; tplDraw.endY = mp.y;
        disposeLine(tplDraw.line);
        tplDraw.line = tplPreviewLine(tplDraw.type, tplDraw.startX, tplDraw.startY, mp.x, mp.y);
        scene.add(tplDraw.line);
        return;
      }
      // Polygon in progress: rubber-band the edge to the cursor.
      if (zonePoly) {
        const mp = mapPointFromEvent(ev);
        if (!mp) return;
        disposeLine(zonePoly.line);
        zonePoly.line = zonePolyLineFor(zonePoly.tool, zonePoly.pts, mp);
        zonePoly.line.renderOrder = 20;
        scene.add(zonePoly.line);
        return;
      }
      if (measure) {
        setPointer(ev);
        raycaster.setFromCamera(pointer, camera);
        const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        if (!raycaster.ray.intersectPlane(groundPlane, hitPoint)) return;
        measure.to.copy(hitPoint);

        // Ruler is CHEBYSHEV, so it agrees with the flat map's ruler and the
        // movement readout. Cone and circle are sized by their true radius or
        // length, which is how 5e states them and how the 2D templates read.
        const mdx = Math.abs(measure.to.x - measure.from.x);
        const mdz = Math.abs(measure.to.z - measure.from.z);
        const reach = Math.hypot(mdx, mdz);
        const cells = (measure.type === 'ruler' ? Math.max(mdx, mdz) : reach) / FT_PER_SQUARE;
        const text = formatCells(cells, scaleOf(gridScale, gridUnit));

        const shape = measureShape3D(measure.type, measure.from, measure.to);
        if (measure.line) {
          scene.remove(measure.line);
          measure.line.geometry.dispose();
          measure.line.material.dispose();
        }
        measure.line = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(shape),
          new THREE.LineBasicMaterial({ color: 0xffd873, depthTest: false })
        );
        measure.line.renderOrder = 19;
        scene.add(measure.line);

        if (!measure.label || measure.text !== text) {
          if (measure.label) { scene.remove(measure.label); measure.label.material.map.dispose(); measure.label.material.dispose(); }
          measure.label = makeLabel(text);
          measure.text = text;
          scene.add(measure.label);
        }
        // Same modest sizing as the drag readout.
        const h = Math.max(1.5, FT_PER_SQUARE * 0.34);
        measure.label.scale.set(h * measure.label.userData.aspect, h, 1);
        measure.label.position.set(measure.to.x, h * 2.2, measure.to.z);
        return;
      }
      if (ink) {
        setPointer(ev);
        raycaster.setFromCamera(pointer, camera);
        const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        if (!raycaster.ray.intersectPlane(groundPlane, hitPoint)) return;
        const last = ink.pts[ink.pts.length - 1];
        // Thin the path as it's collected: a fast drag across a big map can
        // sample hundreds of points that all land inside the same few feet.
        if (last && Math.hypot(hitPoint.x - last.x, hitPoint.z - last.z) < 0.6) return;
        ink.pts.push(hitPoint.clone());
        if (ink.line) {
          scene.remove(ink.line);
          ink.line.geometry.dispose();
          ink.line.material.dispose();
        }
        ink.line = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(ink.pts.map((p) => new THREE.Vector3(p.x, 0.45, p.z))),
          new THREE.LineBasicMaterial({ color: new THREE.Color(inkColorRef.current), depthTest: false })
        );
        ink.line.renderOrder = 19;
        scene.add(ink.line);
        return;
      }
      if (!dragging) return;
      setPointer(ev);
      raycaster.setFromCamera(pointer, camera);
      if (!raycaster.ray.intersectPlane(dragPlane, hitPoint)) return;

      if (dragging.ship) {
        if (dragging.turning) {
          // Turn to face the pointer. The offset keeps the grip under the
          // cursor rather than snapping the bow to it the moment you grab.
          const a0 = Math.atan2(dragging.grabbed.z - dragging.pivot.z, dragging.grabbed.x - dragging.pivot.x);
          const a1 = Math.atan2(hitPoint.z - dragging.pivot.z, hitPoint.x - dragging.pivot.x);
          const d = a1 - a0;
          dragging.deltaRot = d;
          const cs = Math.cos(d), sn = Math.sin(d);
          for (const { obj, start } of dragging.parts) {
            const rx = start.x - dragging.pivot.x;
            const rz = start.z - dragging.pivot.z;
            obj.position.set(
              dragging.pivot.x + rx * cs - rz * sn,
              start.y,
              dragging.pivot.z + rx * sn + rz * cs,
            );
            // Deck planes are flat, so their in-plane spin carries the turn.
            if (obj.userData?.kind === 'deck') obj.rotation.z -= (d - (dragging.appliedRot || 0));
          }
          dragging.appliedRot = d;
        } else {
          const dx = hitPoint.x - dragging.grabbed.x;
          const dz = hitPoint.z - dragging.grabbed.z;
          dragging.delta = { dx, dz };
          for (const { obj, start } of dragging.parts) {
            obj.position.set(start.x + dx, start.y, start.z + dz);
          }

          // How far the hull has come, and what its class can do in a round.
          //
          // STRAIGHT-LINE, unlike a token's Chebyshev budget: the flat map
          // measures a ship with hypot (see shipMeasure), because a ship is not
          // stepping square to square. The two views have to agree or the same
          // drag reads as two different distances.
          const sc = scaleOf(gridScale, gridUnit);
          const squares = Math.hypot(dx, dz) / FT_PER_SQUARE;
          const dist = Math.round(squares * sc.amount);
          const speed = dragging.speed || 0;
          const over = speed > 0 && dist > speed;
          const text = speed > 0
            ? `${dist} / ${speed} ${sc.unit}`
            : `${dist} ${sc.unit}`;
          const fg = over ? '#fca5a5' : '#7dd3fc';

          if (!dragging.label || dragging.labelText !== text) {
            if (dragging.label) {
              scene.remove(dragging.label);
              dragging.label.material.map.dispose();
              dragging.label.material.dispose();
            }
            dragging.label = makeLabel(text, fg);
            dragging.labelText = text;
            scene.add(dragging.label);
          }
          // Sized against a square rather than the hull: a label scaled to a
          // ten-square deck is a billboard you can read from orbit.
          const lh = FT_PER_SQUARE * 1.1;
          dragging.label.scale.set(lh * dragging.label.userData.aspect, lh, 1);
          dragging.label.position.set(
            dragging.pivot.x + dx,
            0.3 + FT_PER_SQUARE * 2.2,
            dragging.pivot.z + dz,
          );

          // And the path it took, anchored where the drag began.
          if (!dragging.trail) {
            dragging.trail = new THREE.Line(
              new THREE.BufferGeometry().setFromPoints([dragging.pivot.clone(), dragging.pivot.clone()]),
              new THREE.LineDashedMaterial({ color: 0x7dd3fc, dashSize: 3, gapSize: 2, depthTest: false })
            );
            dragging.trail.renderOrder = 19;
            scene.add(dragging.trail);
          }
          const tp = dragging.trail.geometry.attributes.position;
          tp.setXYZ(0, dragging.pivot.x, 0.6, dragging.pivot.z);
          tp.setXYZ(1, dragging.pivot.x + dx, 0.6, dragging.pivot.z + dz);
          tp.needsUpdate = true;
          dragging.trail.computeLineDistances();
        }
        return;
      }

      dragging.sprite.position.set(hitPoint.x, dragging.baseY, hitPoint.z);

      // Movement budget, read exactly as the flat map reads it.
      //
      // Distance is CHEBYSHEV, not straight-line: 5e counts every square as
      // 5 ft including diagonals, and the flat map uses max(|dx|,|dy|). Using
      // hypot here made a diagonal move report further in 3D than in 2D for
      // the same drag.
      const dx = Math.abs(hitPoint.x - dragging.startPos.x);
      const dz = Math.abs(hitPoint.z - dragging.startPos.z);
      const squares = Math.max(dx, dz) / FT_PER_SQUARE;
      const sc2 = scaleOf(gridScale, gridUnit);
      const feet = Math.round(squares * sc2.amount);
      const speed = dragging.speed || 30;
      const overOne = feet > speed;
      const overTwo = feet > speed * 2;
      const text = `${feet} ${sc2.unit} / ${speed}${overTwo ? ' · over Dash' : overOne ? ' · Dash' : ''}`;
      const fg = overTwo ? '#fca5a5' : overOne ? '#fcd34d' : '#f3f4f6';

      if (!dragging.label || dragging.labelText !== text) {
        if (dragging.label) { scene.remove(dragging.label); dragging.label.material.map.dispose(); dragging.label.material.dispose(); }
        dragging.label = makeLabel(text, fg);
        dragging.labelText = text;
        scene.add(dragging.label);
      }
      const lbl = dragging.label;
      // Sized against the TOKEN, not the world: a fixed height was enormous
      // next to a medium creature. Roughly a third of the token's own size.
      const h = Math.max(1.5, (dragging.tokenSize || FT_PER_SQUARE) * 0.34);
      lbl.scale.set(h * lbl.userData.aspect, h, 1);
      lbl.position.set(hitPoint.x, dragging.baseY + (dragging.tokenSize || FT_PER_SQUARE) * 0.75, hitPoint.z);

      // A line back to where the move started, so the measured path is
      // visible rather than just its number.
      if (!dragging.trail) {
        dragging.trail = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints([dragging.startPos.clone(), hitPoint.clone()]),
          new THREE.LineDashedMaterial({ color: 0xffd873, dashSize: 2, gapSize: 1.4, depthTest: false })
        );
        scene.add(dragging.trail);
      }
      const tp = dragging.trail.geometry.attributes.position;
      tp.setXYZ(0, dragging.startPos.x, dragging.baseY, dragging.startPos.z);
      tp.setXYZ(1, hitPoint.x, dragging.baseY, hitPoint.z);
      tp.needsUpdate = true;
      dragging.trail.computeLineDistances();
      // The ground marker and drop line belong to the same token; drag them so
      // the token doesn't detach from its own shadow mid-move.
      for (const child of tokenGroup.children) {
        if (child === dragging.sprite) continue;
        if (child.userData?.tokenId !== dragging.tokenId) continue;
        if (child.userData.kind === 'disc') child.position.set(hitPoint.x, child.position.y, hitPoint.z);
        if (child.userData.kind === 'line') {
          const pos = child.geometry.attributes.position;
          // Foot of the line stays on the deck the token started from; the
          // head follows the token.
          pos.setXYZ(0, hitPoint.x, dragging.discY, hitPoint.z);
          pos.setXYZ(1, hitPoint.x, dragging.baseY, hitPoint.z);
          pos.needsUpdate = true;
        }
      }
    };

    // Takes the event: a placement needs to know where the release landed, and
    // whether the pointer travelled far enough to have been an orbit.
    const onPointerUp = (ev) => {
      // Where this press began, taken ONCE for the whole handler.
      //
      // Every branch below used to read `pressAt` and clear it itself, which
      // meant an earlier branch's clear left a later one measuring a click
      // with no start — silently turning "did the pointer travel?" into
      // "always yes". That is exactly what stopped a click on a token
      // registering as a pick: the token branch is last, and by the time it
      // looked there was nothing to compare against. One snapshot, read by
      // everyone, cannot drift like that.
      const pressStart = pressAt;
      pressAt = null;

      // ── Template move / open settings ───────────────────────────────────
      if (tplMove) {
        const m = tplMove;
        tplMove = null;
        controls.enabled = true;
        disposeLine(m.line);
        const travelled = (pressStart && ev)
          ? Math.hypot(ev.clientX - pressStart.x, ev.clientY - pressStart.y)
          : 0;
        if (m.dx != null && travelled > CLICK_SLOP_3D) {
          // Shift every stored point by the drag. A circle keeps its radius in
          // the third slot and must not have it shifted with the centre.
          const o = m.origPoints.map(Number);
          const next = o.length === 3
            ? [o[0] + m.dx, o[1] + m.dy, o[2]]
            : [o[0] + m.dx, o[1] + m.dy, o[2] + m.dx, o[3] + m.dy];
          onTemplateUpdateRef.current?.({ id: m.id, points: next });
        } else {
          // A click, not a drag: open its settings, which is how the label,
          // the colour and the rest get set.
          onTemplateSelectRef.current?.(m.id);
        }
        return;
      }

      // ── Spell template: commit on release ───────────────────────────────
      if (tplDraw) {
        const t = tplDraw;
        tplDraw = null;
        controls.enabled = true;
        disposeLine(t.line);
        // Exactly the payload the flat map sends, including the 5px floor that
        // stops a stray click leaving a zero-size template behind.
        let points = null;
        if (t.endX != null) {
          if (t.type === 'circle') {
            const r = Math.hypot(t.endX - t.startX, t.endY - t.startY);
            if (r > 5) points = [t.startX, t.startY, r];
          } else {
            const d = Math.hypot(t.endX - t.startX, t.endY - t.startY);
            if (d > 5) points = [t.startX, t.startY, t.endX, t.endY];
          }
        }
        if (points) onTemplatePlaceRef.current?.({ type: t.type, points });
        return;
      }

      // ── Effects zone circle: commit on release ──────────────────────────
      if (zoneDraw) {
        const z = zoneDraw;
        zoneDraw = null;
        controls.enabled = true;
        disposeLine(z.ring);
        // Same 5px floor the flat map uses, so a stray click doesn't leave a
        // pinprick zone behind.
        if ((z.r || 0) > 5) {
          onDarkAddRef.current?.({
            x: z.startX, y: z.startY,
            radius: Math.round(z.r),
            zoneType: ZONE_TYPE_FOR_TOOL_3D[z.tool] || 'darkness',
          });
        }
        return;
      }

      if (ink) {
        const done = ink;
        ink = null;
        controls.enabled = true;
        if (done.line) {
          scene.remove(done.line);
          done.line.geometry.dispose();
          done.line.material.dispose();
        }
        // Back to map pixels, the shared coordinate space. The stroke returns
        // through the socket like anyone else's and is drawn by the ink pass,
        // so there's no local copy to fall out of step.
        if (done.pts.length >= 2) {
          const flat = [];
          for (const p of done.pts) {
            flat.push(p.x / ftPerPx + (Number(mapWidth) || 0) / 2);
            flat.push(p.z / ftPerPx + (Number(mapHeight) || 0) / 2);
          }
          onDrawStrokeRef.current?.(flat);
        }
        return;
      }
      if (measure) {
        // The measurement lingers after release — a ruler that vanishes the
        // instant you let go can't be read.
        const m = measure;
        measure = null;
        controls.enabled = true;
        setTimeout(() => {
          if (m.line) { scene.remove(m.line); m.line.geometry.dispose(); m.line.material.dispose(); }
          if (m.label) { scene.remove(m.label); m.label.material.map.dispose(); m.label.material.dispose(); }
        }, 2500);
        return;
      }
      if (!dragging) {
        // No drag was in progress, so this may be a click. A press that
        // travelled is an orbit — the camera has already moved and the board
        // should be left alone.
        if (!(pressStart && ev
            && Math.abs(ev.clientX - pressStart.x) <= CLICK_SLOP_3D
            && Math.abs(ev.clientY - pressStart.y) <= CLICK_SLOP_3D)) {
          return;
        }
        if (placeAtPress(ev)) return;
        if (clickToolAtPress(ev)) return;
        return;
      }
      if (dragging.label) {
        scene.remove(dragging.label);
        dragging.label.material.map.dispose();
        dragging.label.material.dispose();
      }
      if (dragging.trail) {
        scene.remove(dragging.trail);
        dragging.trail.geometry.dispose();
        dragging.trail.material.dispose();
      }
      if (dragging.ship) {
        const d = dragging;
        dragging = null;
        controls.enabled = true;
        renderer.domElement.style.cursor = '';
        if (d.turning) {
          // Back to the degrees map_ships stores, wrapped to 0..360.
          const deg = (((d.baseRot + (d.deltaRot || 0) * 180 / Math.PI) % 360) + 360) % 360;
          onShipRotateRef.current?.(d.shipId, Math.round(deg * 100) / 100, false);
        } else if (d.delta) {
          // World feet back to squares, added to where the hull was when this
          // drag started.
          const dCol = (d.delta.dx / ftPerPx) / gridSize;
          const dRow = (d.delta.dz / ftPerPx) / gridSize;
          const col = Math.round((d.baseCol + dCol) * 1000) / 1000;
          const row = Math.round((d.baseRow + dRow) * 1000) / 1000;
          onShipMoveRef.current?.(d.shipId, col, row, false);
        }
        return;
      }

      const { sprite, tokenId } = dragging;
      dragging = null;
      controls.enabled = true;
      renderer.domElement.style.cursor = '';

      // A press that never travelled is a PICK, not a move.
      //
      // The flat map has always made that distinction — click a creature and
      // the GM panel's token list scrolls to its row. In 3D there was no
      // selection path at all: grabbing a token went straight to a drag, so a
      // plain click committed a zero-distance move and the host's selection
      // never changed, leaving the list sitting wherever it was.
      //
      // Returning here also spares the server a move that moves nothing.
      {
        const travelled = (pressStart && ev)
          ? Math.hypot(ev.clientX - pressStart.x, ev.clientY - pressStart.y)
          : Infinity;
        if (travelled <= CLICK_SLOP_3D) {
          onTokenSelectRef.current?.(tokenId);
          return;
        }
      }

      // Back to grid coordinates — FRACTIONAL, not snapped. grid_col/grid_row
      // are floats, so a token can sit anywhere; rounding to whole squares
      // fought the point of dragging in a 3D view, where you're placing things
      // by eye rather than by cell. Trimmed to 3 decimals purely to keep float
      // noise out of the payload.
      // The exact inverse of where the render pass PUT it: centre back to
      // top-left, so half the footprint and the grid offset both come off
      // again. Subtracting a flat half-square here — which is what this did —
      // would now shift a token by half its own size on every drop, and a Large
      // creature by a whole square.
      const { ox: dgx, oy: dgy } = gridOffsets(mapWidth, mapHeight, gridSize);
      // tokensRef, not the `tokens` prop: this handler is created once when the
      // view mounts, so the prop it closed over is whatever the token list was
      // then — a creature added since would fall back to a Medium footprint and
      // land half a square out.
      const dropTok = (tokensRef.current || []).find((tk) => tk.id === tokenId);
      const dropFoot = tokenFootprint(dropTok).gridW;
      const px = sprite.position.x / ftPerPx + mapWidth / 2;
      const pz = sprite.position.z / ftPerPx + mapHeight / 2;
      const col = Math.round(((px - dgx) / gridSize - dropFoot / 2) * 1000) / 1000;
      const row = Math.round(((pz - dgy) / gridSize - dropFoot / 2) * 1000) / 1000;

      // Did the drop land on a hull?
      //
      // Raycast from the camera through where the pointer was released, rather
      // than straight down from the token. With a hull expanded into a stack of
      // levels, "the deck you dropped it on" is the one you can SEE under the
      // cursor; a downward ray would always pick the topmost, whatever the GM
      // was aiming at.
      const landing = (() => {
        const sg = stateRef.current?.shipGroup;
        if (!sg || !onTokenDeckMoveRef.current) return null;
        raycaster.setFromCamera(pointer, camera);
        let hits = raycaster.intersectObjects(sg.children, false);
        let hit = hits.find((h) => h.object?.userData?.kind === 'deck');
        if (!hit) {
          // Nothing under the cursor. Fall back to looking straight down from
          // where the token was actually dropped: the pointer ray is the more
          // precise answer on a stacked hull, but it is only as good as the
          // last pointermove, and a drop the ray misses would silently commit
          // as "not on a ship at all".
          raycaster.set(
            new THREE.Vector3(sprite.position.x, 10000, sprite.position.z),
            new THREE.Vector3(0, -1, 0),
          );
          hits = raycaster.intersectObjects(sg.children, false);
          // Straight down finds the TOPMOST deck, which is the wrong level to
          // read a stairwell off — so a fallback hit places the token but never
          // takes the stairs.
          hit = hits.find((h) => h.object?.userData?.kind === 'deck');
        }
        if (!hit) return null;
        const shipId = hit.object.userData.shipId;
        const ship = (shipsRef.current || []).find((x) => x.id === shipId);
        if (!ship) return null;
        // The GM places on the level they are looking at. A player boards at
        // the main deck however the ship is being drawn to them — that is the
        // deck you arrive on, and a player has no business choosing to
        // materialise in the hold.
        // Which square of this deck the drop landed on.
        //
        // The plane carries the hull's rotation and position already, so its
        // own local space IS deck space — no second copy of the pivot maths,
        // which is the thing utils/ships.js warns about. After the plane's -90°
        // X rotation its local +Y points at the top of the deck art, i.e. row 0,
        // so the row counts down from there.
        const ud = hit.object.userData;
        const local = hit.object.worldToLocal(hit.point.clone());
        const col = (local.x + ud.planeW / 2) / FT_PER_SQUARE;
        const row = (ud.planeH / 2 - local.y) / FT_PER_SQUARE;
        const transition = (ud.transitions || []).find((tr) => {
          // Freehand rectangles: fractional origin, size in squares, falling
          // back to the single square older stairwells were stored as.
          const c = Number(tr.col), r = Number(tr.row);
          const tw = Number(tr.w) > 0 ? Number(tr.w) : 1;
          const th = Number(tr.h) > 0 ? Number(tr.h) : 1;
          return col >= c && col < c + tw && row >= r && row < r + th;
        }) || null;

        if (isGMRef.current) {
          return { shipId, deckIndex: Number(ud.deckIndex) || 0, transition };
        }
        // A player's level, mirroring the server's rule exactly (see
        // token_deck_move in backend/src/index.js): the MAIN deck only when
        // coming aboard, and otherwise the deck they are already standing on,
        // because walking about a ship doesn't change floor.
        //
        // Reporting the main deck unconditionally is what made the upper floors
        // flash: the optimistic local update put the token on the main deck, the
        // stack re-flowed to show every level up to it, and then the server's
        // echo — which had kept the token where it was — flipped it all back.
        const tok = (tokensRef.current || []).find((x) => x.id === tokenId);
        const boarding = tok?.ship_id == null || tok.ship_id !== shipId;
        if (!boarding) {
          return { shipId, deckIndex: Number(tok.deck_index) || 0, transition };
        }
        const md = mainDeck((ship.decks || []).filter((d) => !d.is_sails));
        return { shipId, deckIndex: md ? Number(md.deck_index) : 0, transition };
      })();

      // Dropped on a stairwell?
      //
      // The flat map spends a stationary CLICK on the stairs, because it always
      // knows which token is meant: the player's own, or the GM's selected one.
      // There is no selection in 3D, so the gesture is the drop itself — you
      // drag the token onto the stairs and it goes down them. Deliberate enough
      // not to happen by accident, and it works the same for both roles.
      if (landing && landing.transition && onTokenChangeDeckRef.current) {
        const tr = landing.transition;
        onTokenChangeDeckRef.current(
          tokenId,
          landing.shipId,
          tr.to_deck ?? 0,
          tr.to_col ?? 0,
          tr.to_row ?? 0,
        );
        return;
      }
      if (landing && onTokenDeckMoveRef.current) {
        onTokenDeckMoveRef.current(tokenId, landing.shipId, landing.deckIndex, col, row);
        return;
      }
      // Dragged over the side: the server clears the binding and keeps the
      // world coords, so the token stays where it was dropped.
      const wasAboard = (tokensRef.current || []).find((t) => t.id === tokenId)?.ship_id != null;
      if (wasAboard && onTokenDeckMoveRef.current) {
        onTokenDeckMoveRef.current(tokenId, null, 0, col, row);
        return;
      }
      onTokenMoveRef.current?.(tokenId, col, row);
    };

    // Hover feedback: without it there's no hint that a token can be dragged.
    const onHover = (ev) => {
      if (dragging) return;

      // The card is looked up FIRST and independently of the active tool: a
      // player measuring a distance or drawing still wants to know who they
      // are pointing at. Only the drag cursor below is tool-specific.
      //
      // Tokens hidden from players were never added to the group for a player
      // viewer, so they cannot be hovered — the visibility rule is enforced by
      // absence, not by a second check here.
      setPointer(ev);
      raycaster.setFromCamera(pointer, camera);
      const hoverHit = raycaster.intersectObjects(tokenGroup.children, false)
        .find((h) => h.object?.userData?.tokenId != null);
      const nextId = hoverHit ? hoverHit.object.userData.tokenId : null;
      hoverObjRef.current = hoverHit ? hoverHit.object : null;
      // Compared before setting: React bails out of identical state anyway,
      // but this keeps the common case (moving over empty floor) free.
      setHoverTokenId((prev) => (prev === nextId ? prev : nextId));
      // Something on the cursor: the press will place it, so say so. This is
      // the flat map's crosshair, and its absence here is a good part of why a
      // 3D board with a creature armed read as simply dead.
      if (placingTokenRef.current || pendingTerrainRef.current) {
        renderer.domElement.style.cursor = 'crosshair';
        return;
      }
      // Only under Move. Under the draw and measure tools a left-drag belongs
      // to the tool, so offering a grab hand there promises the wrong gesture.
      if (toolRef.current !== 'move') {
        renderer.domElement.style.cursor = '';
        return;
      }
      setPointer(ev);
      raycaster.setFromCamera(pointer, camera);

      const movable = movableRef.current || [];
      let over = false;
      if (movable.length && onTokenMoveRef.current) {
        over = raycaster.intersectObjects(tokenGroup.children, false)
          .some((h) => h.object?.userData?.tokenId != null
            && movable.includes(h.object.userData.tokenId));
      }
      // A hull this viewer may steer is grabbable too, by exactly the test the
      // drag uses. Without this a ship read as scenery right up until you
      // guessed that dragging it did something.
      if (!over && (onShipMoveRef.current || onShipRotateRef.current)) {
        over = !!shipHitUnderPointer();
      }
      renderer.domElement.style.cursor = over ? 'grab' : '';
    };
    renderer.domElement.addEventListener('pointermove', onHover);
    // Without this the card is left hanging over the board when the pointer
    // leaves the canvas for a panel or the browser chrome.
    const onLeave = () => { hoverObjRef.current = null; setHoverTokenId(null); };
    renderer.domElement.addEventListener('pointerleave', onLeave);

    // Right-click. Tokens first, then terrain — a creature standing on a rock
    // is the thing you meant to click, the same precedence the flat map uses.
    // Double-click to fly the camera in on whatever is under the cursor.
    //
    // Orbiting to somewhere specific otherwise means a drag to swing round, a
    // wheel to close in and another drag to re-centre, all while the thing you
    // wanted drifts off the edge. A double-click says "there" in one gesture.
    //
    // Only under the move tool: while measuring or drawing, the pointer belongs
    // to that tool and flinging the camera mid-stroke would ruin the stroke.
    const onDoubleClick = (ev) => {
      if (toolRef.current !== 'move') return;
      const st = stateRef.current;
      if (!st) return;
      setPointer(ev);
      raycaster.setFromCamera(pointer, camera);

      // Three.js does NOT skip invisible objects when raycasting, so
      // visibility is checked here — and up the parents, since a hidden group
      // keeps visible children. Without this the obvious victim is the wall
      // cutaway: the walls it hides to let you see into a room are still solid
      // to a ray, so a double-click into the room would stop dead on a wall
      // that is not on screen.
      const shown = (o) => {
        for (let n = o; n; n = n.parent) if (n.visible === false) return false;
        return true;
      };

      let point = null;
      const hits = raycaster
        .intersectObjects([geomGroup, tokenGroup], true)
        .filter((h) => shown(h.object));
      if (hits.length) point = hits[0].point.clone();

      if (!point) {
        // Nothing solid under the cursor. Fall back to the plane of the storey
        // being worked on rather than the ground, for the same reason placing
        // does: on an upper floor the ground is somewhere else entirely.
        const floorY = levelBaseFt(levelsRef.current || [], Number(activeLevelRef.current) || 0);
        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -floorY);
        const p = new THREE.Vector3();
        // Missing the plane means the cursor is on the horizon or the sky,
        // where there is no "there" to go to.
        if (!raycaster.ray.intersectPlane(plane, p)) return;
        point = p;
      }

      // Keep the current heading and pitch — a double-click changes WHERE the
      // camera looks, never the angle it looks from. Swinging the view round
      // as well would leave you re-orienting, which is the cost this is
      // supposed to remove.
      const dir = camera.position.clone().sub(controls.target);
      if (dir.lengthSq() < 1e-6) dir.set(0.6, 0.5, 0.6);
      const dist = dir.length();
      dir.normalize();
      // Close roughly half the gap, so repeated double-clicks keep closing in
      // and settle at the same floor the wheel stops at rather than ending
      // inside the geometry.
      const want = Math.max(controls.minDistance, dist * 0.45);

      st.flight = {
        fromPos: camera.position.clone(),
        fromTgt: controls.target.clone(),
        toPos: point.clone().add(dir.multiplyScalar(want)),
        toTgt: point,
        t0: performance.now(),
        dur: 320,
      };
    };

    const onContextMenu = (ev) => {
      const wantToken = tokenMenuRef.current;
      const wantTerrain = terrainMenuRef.current;
      const wantDoor = doorToggleRef.current;
      const wantDoorMenu = doorMenuRef.current;
      const wantZone = zoneMenuRef.current;
      const wantTile = tileMenuRef.current;
      if (!wantToken && !wantTerrain && !wantDoor && !wantDoorMenu && !wantZone && !wantTile) return;
      setPointer(ev);
      raycaster.setFromCamera(pointer, camera);

      if (wantToken) {
        const tHit = raycaster.intersectObjects(tokenGroup.children, false)
          .find((h) => h.object?.userData?.tokenId != null);
        if (tHit) {
          ev.preventDefault();
          wantToken(tHit.object.userData.tokenId, ev.clientX, ev.clientY);
          return;
        }
      }
      // Fog banks, after tokens but before the scenery.
      //
      // Tested here rather than last because a bank is a volume the size of a
      // room: anything standing in it is behind it from most angles, so a
      // late test would only ever be reached by right-clicking empty floor.
      // Tokens still win — a creature in the fog is what you meant to click.
      if (wantZone) {
        const zg = stateRef.current?.zoneGroup;
        if (zg) {
          const zHit = raycaster.intersectObjects(zg.children, false)
            .find((h) => h.object?.userData?.fogVolume && h.object.userData.zoneId != null);
          if (zHit) {
            ev.preventDefault();
            wantZone(zHit.object.userData.zoneId, ev.clientX, ev.clientY);
            return;
          }
        }
      }

      // Doors before terrain: a door sits IN a wall, and the wall may well be
      // the terrain piece behind it. Whoever right-clicks a door means the
      // door.
      if (wantDoor || wantDoorMenu) {
        const dg = stateRef.current?.doorGroup;
        if (dg) {
          for (const hit of raycaster.intersectObjects(dg.children, true)) {
            let node = hit.object;
            while (node && node.userData?.doorId == null) node = node.parent;
            if (node?.userData?.doorId != null) {
              ev.preventDefault();
              // The GM gets the full menu — the same one the flat map opens,
              // so a door can be re-sprited or deleted without switching view.
              // A player gets the open/close they already had.
              if (wantDoorMenu) wantDoorMenu(node.userData.doorId, ev.clientX, ev.clientY);
              else wantDoor(node.userData.doorId);
              return;
            }
          }
        }
      }
      // The floor, tested after everything that stands on it.
      if (wantTile) {
        const gg = stateRef.current?.geomGroup;
        if (gg) {
          for (const hit of raycaster.intersectObjects(gg.children, true)) {
            let node = hit.object;
            while (node && node.userData?.tileId == null) node = node.parent;
            if (node?.userData?.tileId != null) {
              ev.preventDefault();
              wantTile(node.userData.tileId, ev.clientX, ev.clientY);
              return;
            }
          }
        }
      }
      if (wantTerrain) {
        const st = stateRef.current;
        const tg = st?.terrainGroup;
        if (tg) {
          // Recursive: a terrain piece can be a bare mesh or a whole group of
          // them (a gate, a hazard), so the hit is usually a leaf and the id
          // lives on an ancestor.
          for (const hit of raycaster.intersectObjects(tg.children, true)) {
            let node = hit.object;
            while (node && node.userData?.terrainId == null) node = node.parent;
            if (node?.userData?.terrainId != null) {
              ev.preventDefault();
              wantTerrain(node.userData.terrainId, ev.clientX, ev.clientY);
              return;
            }
          }
        }
      }
    };
    renderer.domElement.addEventListener('contextmenu', onContextMenu);
    renderer.domElement.addEventListener('dblclick', onDoubleClick);
    // The wheel is the other way to say "not there after all".
    const onWheelCancel = () => { if (stateRef.current) stateRef.current.flight = null; };
    renderer.domElement.addEventListener('wheel', onWheelCancel, { passive: true });

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    let raf = 0;
    const startedAt = performance.now();
    const tick = () => {
      // A double-click glide in progress. Stepped here rather than on a timer
      // so it is frame-locked, and so it simply stops when the view is shut.
      const fl = stateRef.current?.flight;
      if (fl) {
        const k = Math.min(1, (performance.now() - fl.t0) / fl.dur);
        // Ease out: quick off the mark and settling gently, so the board
        // arrives rather than lurching.
        const e = 1 - ((1 - k) ** 3);
        camera.position.lerpVectors(fl.fromPos, fl.toPos, e);
        controls.target.lerpVectors(fl.fromTgt, fl.toTgt, e);
        if (k >= 1) stateRef.current.flight = null;
      }
      controls.update();
      // Templates breathe. The flat map animates its elemental effects, and a
      // dead flat polygon next to those reads as a rug rather than a spell —
      // each template beats at its element's own rate, with drifting motes.
      // Driven here so it costs nothing when the view is shut.
      const zg = stateRef.current?.zoneGroup;
      if (zg) {
        const tz = (performance.now() - startedAt) / 1000;
        for (const z of zg.children) {
          if (!z.userData?.animated || !z.material) continue;
          // Slow, out-of-phase drift so a fog bank breathes and water shifts
          // rather than every zone pulsing in lockstep.
          const phase = (z.id % 7) * 0.9;
          const isWater = z.userData.zone === 'water';

          if (z.userData.waves) {
            // Two crossing sine trains, travelling in place. The mesh is
            // rotated flat, so displacing local Z lifts the surface vertically
            // in world space.
            const p = z.geometry.attributes.position;
            const base = z.userData.base;
            const amp = z.userData.amp;
            for (let i = 0; i < p.count; i++) {
              const bx = base[i * 3], by = base[i * 3 + 1];
              const w1 = Math.sin(bx * 0.14 + tz * 1.6 + phase);
              const w2 = Math.cos(by * 0.11 - tz * 1.1 + phase * 0.7);
              // Normalised to 0..1 rather than -1..1, so the surface only ever
              // rises from its resting height. Swinging symmetrically meant
              // every trough punched down through the map underneath it.
              const h01 = (w1 + w2 * 0.7 + 1.7) / 3.4;
              p.array[i * 3 + 2] = h01 * amp;
            }
            p.needsUpdate = true;
            z.geometry.computeVertexNormals();
            continue;
          }
          // Amplitudes that read across a table. The first pass swung opacity
          // by 14%, which is the same mistake the templates had: technically
          // animating, visually static.
          const rate = isWater ? 1.9 : 0.6;
          const swing = isWater ? 0.28 : 0.22;
          const wob = 1 - swing + Math.sin(tz * rate + phase) * swing;
          z.material.opacity = z.userData.baseOpacity * wob;

        }
      }

      const tg = stateRef.current?.templateGroup;
      if (tg) {
        const t = (performance.now() - startedAt) / 1000;
        for (const child of tg.children) {
          const style = child.userData?.style;
          // Elemental templates beat at their own rate — fire fast and
          // ragged, ice slow, lightning frantic — so they don't all breathe
          // in unison like one animation applied to everything.
          const sp = style?.speed ?? 2.2;
          const sw = style?.swing ?? 0.18;
          const p = 1 - sw + Math.sin(t * sp) * sw;
          // Amplitudes you can actually SEE.
          //
          // The first version scaled between 0.985 and 1.0 and faded opacity
          // by a tenth — mathematically animating, visually static, which is
          // why it read as "no animation at all". A spell effect should be
          // obvious across a table, so the pulse now moves several percent and
          // the brightness swings by half.
          const sc = 1 + (p - (1 - sw)) * 0.55;
          child.scale.set(sc, sc, sc);

          const fill = child.children?.[0];
          const rim = child.children?.[1];
          if (fill?.material) fill.material.opacity = 0.22 + 0.42 * p;
          if (rim?.material) rim.material.opacity = 0.45 + 0.55 * p;

          // Drifting motes.
          const motes = child.children?.find?.((c) => c.userData?.motes);
          if (motes) {
            const { seed, spread, base, style: ms } = motes.userData;
            const arr = motes.geometry.attributes.position.array;
            for (let i = 0; i < seed.length; i++) {
              const life = (t * (0.35 + seed[i] * 0.5) * Math.abs(ms.rise || 0.4)) % 1;
              const dir = (ms.rise || 0) >= 0 ? 1 : -1;
              // Travel the full height of the effect so motion is obvious,
              // not a shimmer at ankle height.
              arr[i * 3 + 1] = dir >= 0
                ? life * spread * 1.6
                : spread * 1.6 * (1 - life);
              // Sideways wander, scaled by the element's jitter so lightning
              // twitches and water barely moves.
              const j = (ms.jitter || 0.2) * spread * 0.22;
              arr[i * 3]     = base[i * 3]     + Math.sin(t * sp * 0.7 + seed[i] * 9) * j;
              arr[i * 3 + 2] = base[i * 3 + 2] + Math.cos(t * sp * 0.6 + seed[i] * 7) * j;
            }
            motes.geometry.attributes.position.needsUpdate = true;
            motes.material.opacity = 0.55 + 0.45 * p;
          }
        }
      }
      // Star surfaces boil. One uniform per sun per frame — the churn itself
      // is all shader-side, so this costs nothing whether the system has one
      // star or four.
      const sg = stateRef.current?.systemGroup;
      if (sg) {
        const t = (performance.now() - startedAt) / 1000;
        for (const child of sg.children) {
          if (child.userData?.animated) child.material.uniforms.uTime.value = t;
        }
      }
      // ── Animated terrain: per-piece clocks ────────────────────────────────
      //
      // Each animated piece keeps its OWN accumulated time, advanced by the
      // frame delta times that piece's speed. Two reasons it is not just
      // `elapsed * speed`:
      //
      //   1. Changing the speed would jump the animation, because the product
      //      leaps the moment the multiplier changes. Integrating a delta
      //      means a speed change alters the RATE from here on and nothing
      //      else — which is what a speed control should do.
      //   2. The clocks live on stateRef, keyed by terrain id, so they survive
      //      the geometry rebuild that happens every time anyone takes a step.
      //      Reset them per build and every cloud on the board would snap back
      //      to its starting shape whenever a token moved.
      //
      // Speed 0 simply stops advancing the clock, which freezes the piece
      // exactly where it stands rather than snapping it to a rest pose.
      const stA = stateRef.current;
      if (stA) {
        const nowS = (performance.now() - startedAt) / 1000;
        // Clamped: a backgrounded tab hands back a delta of many seconds on
        // its first frame, which would teleport every cloud.
        const dt = Math.min(0.1, Math.max(0, nowS - (stA.lastAnimAt ?? nowS)));
        stA.lastAnimAt = nowS;
        const clocks = stA.animClocks || (stA.animClocks = new Map());
        const clockFor = (id, speed) => {
          const next = (clocks.get(id) || 0) + dt * (speed ?? 1);
          clocks.set(id, next);
          return next;
        };
        // Clouds drift. Deliberately slow — see CLOUD_FORMS for why.
        for (const c of stA.cloudGroups || []) {
          animateCloud(c, clockFor(c.userData.terrainId, c.userData.animSpeed));
        }
        // Gates. The steady churn is shader-side; the opening sequence is a
        // second, one-shot clock running alongside it.
        //
        // That clock is advanced by the same dt * speed as everything else, so
        // the GM's speed control paces the opening too — and setting a gate to
        // Stop mid-kawoosh freezes it mid-kawoosh.
        const acts = stA.gateActivations;
        const shuts = stA.gateShutdowns;
        for (const g of stA.gateHorizons || []) {
          const t = clockFor(g.id, g.speed);
          // Two one-shot clocks alongside the steady one, advanced by the same
          // dt * speed so the GM's speed control paces the opening and the
          // closing as well. Each is dropped once it has played out, so an idle
          // gate costs nothing and neither map can grow without bound.
          let act = null;
          if (acts && acts.has(g.id)) {
            act = acts.get(g.id) + dt * (g.speed ?? 1);
            if (act > GATE_ACTIVATION_SECONDS) acts.delete(g.id);
            else acts.set(g.id, act);
          }
          let shut = null;
          if (shuts && shuts.has(g.id)) {
            shut = shuts.get(g.id) + dt * (g.speed ?? 1);
            if (shut > GATE_SHUTDOWN_SECONDS) shuts.delete(g.id);
            else shuts.set(g.id, shut);
          }
          g.update(t, act, shut);
        }
        // Hazards. Each carries its own update — a disc's uniform, a bank of
        // arcs, a field of orbiting rocks — so this loop stays one line however
        // many kinds there are.
        for (const h of stA.hazards || []) {
          h.update(clockFor(h.id, h.speed));
        }
      }
      // Flicker. Repainted a few times a second rather than every frame: it's
      // a full-canvas repaint plus a texture upload, for an effect whose whole
      // character is a slow waver. At 15Hz a candle still reads as a candle.
      const ll = stateRef.current?.lightLayer;
      if (ll) {
        const now = (performance.now() - startedAt) / 1000;
        if (now - ll.last > 1 / 15) {
          ll.last = now;
          const lx = ll.ctx;
          lx.setTransform(1, 0, 0, 1, 0, 0);
          lx.clearRect(0, 0, lx.canvas.width, lx.canvas.height);
          lx.setTransform(ll.scale, 0, 0, ll.scale, 0, 0);
          lx.save();
          if (ll.visPath) lx.clip(ll.visPath);
          paintLightGlow(lx, ll.glows, ll.lightPolyFor, now);
          lx.restore();
          ll.tex.needsUpdate = true;
        }
      }
      // ── Floating numbers ────────────────────────────────────────────────
      //
      // Whatever the plugins are currently popping, drawn over the token it
      // belongs to. Each entry carries its own phase (0 → 1), so the animation
      // here is only a matter of where to put it and how solid to draw it —
      // the plugin owns the timing, and both views stay in step because they
      // read the same clock.
      if (pluginRegistries.mapFloaters.size > 0 || floaterSprites.size > 0) {
        const seen = new Set();
        for (const [pid, fn] of pluginRegistries.mapFloaters.entries()) {
          if (typeof fn !== 'function') continue;
          let list;
          try {
            list = fn({ tokens: tokensRef.current || [], isPlayer: !isGMRef.current });
          } catch (err) {
            console.warn(`mapFloaters "${pid}" threw:`, err);
            continue;
          }
          for (const f of (list || [])) {
            if (!f || f.id == null) continue;
            const key = `${pid}:${f.id}`;
            // Anchored to the token's own sprite, so a pop sits over the
            // creature wherever the 3D pass actually drew it — including up a
            // storey, on a ship's deck, or mid-flight. A pop for a token that
            // isn't on screen is simply skipped.
            const anchor = (tokenGroup.children || []).find(
              (o) => o.userData?.kind === 'sprite' && o.userData?.tokenId === f.tokenId
            );
            if (!anchor) continue;
            seen.add(key);
            let sp = floaterSprites.get(key);
            if (!sp) {
              sp = makeLabel(String(f.text ?? ''), f.color || '#f87171');
              sp.renderOrder = 30;
              sp.material.depthTest = false;   // never buried by the board
              floaterGroup.add(sp);
              floaterSprites.set(key, sp);
            }
            const phase = Math.max(0, Math.min(1, Number(f.phase) || 0));
            // Quick lift that eases out, matching the flat map's curve.
            const rise = FT_PER_SQUARE * 1.6 * (1 - Math.pow(1 - phase, 2));
            // Fades over the last 40%, again as on the flat map.
            sp.material.opacity = phase < 0.6 ? 1 : Math.max(0, 1 - (phase - 0.6) / 0.4);
            const h = FT_PER_SQUARE * 0.9;
            sp.scale.set(h * sp.userData.aspect, h, 1);
            sp.position.set(
              anchor.position.x,
              anchor.position.y + FT_PER_SQUARE * 0.8 + rise,
              anchor.position.z,
            );
          }
        }
        // Anything the plugins have stopped reporting is finished. Disposed
        // rather than hidden: each pop owns a canvas texture.
        for (const [key, sp] of floaterSprites.entries()) {
          if (seen.has(key)) continue;
          floaterGroup.remove(sp);
          sp.material.map?.dispose();
          sp.material.dispose();
          floaterSprites.delete(key);
        }
      }

      // ── Standing in the fog ─────────────────────────────────────────────
      //
      // Drive the banks' clock, and open the five-foot clearing around whoever
      // is inside one. Both are uniforms, so the churn and the pocket are the
      // shader's business — the pocket is a smooth hole that tracks the token
      // exactly rather than geometry being switched on and off around them.
      //
      // Here rather than at build time because it has to follow the token: a
      // bank is rebuilt only when the ZONE changes, and walking through fog
      // changes no zone at all. GM exempt, like everywhere else — they need to
      // see into a bank to run what is in it.
      {
        const vols = stateRef.current?.fogVolumes || [];
        if (vols.length) {
          const nowS = (performance.now() - startedAt) / 1000;
          let vwx = 0, vwz = 0, reach = 0;
          if (!isGMRef.current) {
            const vt = viewerTokenIdRef.current != null
              ? (tokensRef.current || []).find((t) => t.id === viewerTokenIdRef.current)
              : null;
            if (vt) {
              const foot = tokenFootprint(vt).gridW;
              const { ox: vgx, oy: vgy } = gridOffsets(mapWidth, mapHeight, gridSize);
              const vpx = vgx + Number(vt.grid_col) * gridSize + (foot * gridSize) / 2;
              const vpy = vgy + Number(vt.grid_row) * gridSize + (foot * gridSize) / 2;
              vwx = (vpx - (Number(mapWidth) || 0) / 2) * ftPerPx;
              vwz = (vpy - (Number(mapHeight) || 0) / 2) * ftPerPx;
              reach = (5 / (Number(gridScale) || 5)) * FT_PER_SQUARE;
            }
          }
          // The GM sees INTO a bank rather than through a wall of it.
          //
          // They are the one person who has to know what is standing in the
          // fog, and it is the same exemption the flat map makes by leaving
          // them the faint marker instead of the opaque fill. Players get it
          // at full weight.
          const dim = isGMRef.current ? 0.34 : 1.0;
          for (const m of vols) {
            const u = m.material?.uniforms;
            if (!u) continue;
            u.uTime.value = nowS;
            u.uViewer.value.set(vwx, 0, vwz);
            u.uReach.value = reach;
            u.uDensity.value = (m.userData.baseDensity ?? 0.97) * dim;
          }
        }
      }

      // ── Pings ───────────────────────────────────────────────────────────
      //
      // The GM pointing at something. Raised to the storey they were on when
      // they pointed — a ping stuck on the ground is useless on a building,
      // where "look here" almost always means a particular floor.
      //
      // Never culled by the viewer's own floor: a player standing on the
      // ground still needs to see the GM point at the balcony. depthTest off
      // for the same reason — a ping behind a wall is still the GM talking.
      {
        const live = pingsRef.current || [];
        const seen = new Set();
        for (const p of live) {
          if (p?.id == null) continue;
          const age = (Date.now() - (Number(p.ts) || 0)) / PING_DURATION_MS_3D;
          if (age < 0 || age > 1) continue;
          seen.add(p.id);
          let ring = pingRings.get(p.id);
          if (!ring) {
            const pts = [];
            for (let i = 0; i <= 64; i++) {
              const a = (i / 64) * Math.PI * 2;
              pts.push(new THREE.Vector3(Math.cos(a), 0, Math.sin(a)));
            }
            ring = new THREE.Line(
              new THREE.BufferGeometry().setFromPoints(pts),
              new THREE.LineBasicMaterial({ color: 0xffd873, transparent: true, depthTest: false })
            );
            ring.renderOrder = 31;
            pingGroup.add(ring);
            pingRings.set(p.id, ring);
          }
          const baseY = levelBaseFt(levelsRef.current || [], Number(p.level) || 0);
          // Three pulses over the ping's life, each expanding and fading, so it
          // reads as a beacon rather than one ring that vanishes.
          const pulse = (age * 3) % 1;
          // Radius in the map's own scale, so a ping stays legible on a board
          // hundreds of squares across — see utils/ping for why this view
          // measures in squares while the flat map measures in screen pixels.
          const maxR = FT_PER_SQUARE * pingSize(p.size).squares;
          const r = Math.max(0.001, maxR * (0.15 + pulse * 0.85));
          ring.scale.set(r, 1, r);
          ring.material.opacity = (1 - pulse) * (1 - age);
          ring.position.set(
            (Number(p.x) - (Number(mapWidth) || 0) / 2) * ftPerPx,
            baseY + 0.9,
            (Number(p.y) - (Number(mapHeight) || 0) / 2) * ftPerPx,
          );
        }
        for (const [id, ring] of pingRings.entries()) {
          if (seen.has(id)) continue;
          pingGroup.remove(ring);
          ring.geometry.dispose();
          ring.material.dispose();
          pingRings.delete(id);
        }
      }

      // ── Standees face the camera, but only turn ──────────────────────────
      //
      // The one thing a Sprite would have done for free, and the one thing it
      // does wrong here. Yaw about world Y so the figure turns to face the
      // camera; leave pitch and roll alone so it stays vertical with its feet
      // on the floor however far the camera tilts down.
      //
      // Walks the token group rather than keeping a list: the group is rebuilt
      // whenever tokens change, and a cached list would outlive its meshes.
      // Token faces are Sprites and skip this entirely.
      //
      // A piece on the floor is NOT yawed. Turning to face the camera is what
      // a figure standing on the board does; a body lying on it has come to
      // rest, and spinning it to follow the viewer made the whole board feel
      // like it was sliding underfoot whenever the camera moved. It keeps the
      // orientation it was built with, so it lies still while the camera
      // orbits around it — and it lies the same way in both views, since the
      // flat map's quarter turn is fixed too.
      for (const o of tokenGroup.children) {
        if (o.userData?.prone) continue;
        if (!o.userData?.standee) continue;
        o.rotation.y = Math.atan2(
          camera.position.x - o.position.x,
          camera.position.z - o.position.z,
        );
      }

      // ── Walls between the camera and their room ─────────────────────────
      //
      // Hidden when the camera is on the OUTSIDE of the wall — the side away
      // from the room it encloses. Cheap: a dot product per wall, and only
      // for walls that belong to a tile.
      {
        const cuts = stateRef.current?.wallCutaways;
        if (cuts && cuts.length) {
          const cx = camera.position.x, cz = camera.position.z;
          for (const m of cuts) {
            const c = m.userData.cutaway;
            if (!c) continue;
            // A small dead zone, so a wall the camera is almost exactly level
            // with does not toggle on tiny movements. Edge-on it is barely a
            // line on screen either way.
            const d = (cx - c.mx) * c.ox + (cz - c.mz) * c.oz;
            m.visible = d <= 1.5;
          }
        }
      }

      // ── Hover card placement ────────────────────────────────────────────
      //
      // Done here, per frame, rather than once when the pointer lands: the
      // camera keeps moving after that. Orbit the board with a card open and
      // it stays pinned to its token instead of sliding off it.
      //
      // Written straight to the node's style. This runs every frame, and
      // routing it through React state would re-render the whole view sixty
      // times a second for two numbers no other code reads.
      {
        const card = hoverCardRef.current;
        const obj = hoverObjRef.current;
        if (card && obj) {
          // Anchor at the TOP of the piece, not its centre, so the card sits
          // above the figure rather than across its chest. scale.y is the
          // piece's height in feet for a standee and its face size otherwise.
          const p = obj.position.clone();
          // A standing piece is anchored above its head; a prone one is lying
          // down, where scale.y is its length ALONG the floor rather than its
          // height, so half of that would hang the card in mid-air over it.
          p.y += obj.userData?.prone ? 0.9 : (obj.scale?.y || 0) * 0.5 + 0.6;
          p.project(camera);
          // Behind the camera projects to a mirrored point in front of it, so
          // without this the card jumps to the wrong side of the screen when
          // the token passes out of view behind you.
          if (p.z > 1) {
            card.style.visibility = 'hidden';
          } else {
            const r = renderer.domElement.getBoundingClientRect();
            const sx = (p.x * 0.5 + 0.5) * r.width;
            const sy = (-p.y * 0.5 + 0.5) * r.height;
            card.style.visibility = 'visible';
            // translate(-50%, -100%) centres it on the token and lifts it
            // clear; the transform is composited, so this costs no layout.
            card.style.transform = `translate(${Math.round(sx)}px, ${Math.round(sy)}px) translate(-50%, -100%)`;
          }
        }
      }

      // ── Cast effects ────────────────────────────────────────────────────
      //
      // Anchored to where the token is actually drawn, so an effect lands on
      // its caster whatever storey or deck they are standing on, and follows
      // them if they move while it is still running.
      if ((tokenFxRef.current || []).length || tokenFx3dActive) {
        tokenFx3dActive = (tokenFxRef.current || []).length > 0;
        tokenFx3d.sync(tokenFxRef.current, (id) => {
          // `o.visible` matters: a token the viewer cannot see keeps its sprite
          // now rather than being rebuilt away, and an effect anchored to it
          // would otherwise burn merrily in the middle of the fog.
          const spr = tokenGroup.children.find(
            (o) => o.userData?.kind === 'sprite' && o.userData?.tokenId === id && o.visible);
          if (!spr) return null;
          return {
            // The token's feet, not its middle — effects grow up from the floor.
            position: new THREE.Vector3(spr.position.x,
                                        spr.position.y - spr.scale.y / 2,
                                        spr.position.z),
            radius: spr.scale.x / 2,
            height: spr.scale.y,
          };
        }, Date.now());
      }

      // ── Weather ─────────────────────────────────────────────────────────
      //
      // Polled here rather than pushed through React: the plugin owns the
      // state and a slider drag would otherwise re-render this component
      // sixty times a second. Costs one map lookup per frame when no plugin
      // is registered.
      if (pluginRegistries.mapWeather.size !== lastWeatherRegSize) {
        lastWeatherRegSize = pluginRegistries.mapWeather.size;
        console.log('[weather3d] plugins publishing weather:', lastWeatherRegSize,
          '| mapId:', mapIdRef.current);
      }
      if (pluginRegistries.mapWeather.size > 0) {
        let spec = null;
        for (const [pid, fn] of pluginRegistries.mapWeather.entries()) {
          if (typeof fn !== 'function') continue;
          try {
            const got = fn({ mapId: mapIdRef.current, isPlayer: !isGMRef.current });
            if (got) { spec = got; break; }
          } catch (err) {
            console.warn(`mapWeather "${pid}" threw:`, err);
          }
        }
        // The storey the viewer is on decides where the weather lives: it
        // falls from that floor's sky and stops at the ceiling above it, so
        // rain never falls through the floor over someone's head. On the top
        // storey there is no ceiling and it falls from the open sky.
        const levels = levelsRef.current || [];
        const li = Number(activeLevelRef.current) || 0;
        const groundY = levelBaseFt(levels, li);
        const here = levels.find((l) => Number(l?.level_index) === li);
        const above = levels.find((l) => Number(l?.level_index) === li + 1);
        // Only clipped when something is actually overhead — on the top
        // storey the sky is open and the weather falls from it.
        const ceilingY = above ? groundY + levelHeightFt(here || null) : Infinity;
        // One line when the weather starts or stops, never per frame. A
        // silent "no weather in 3D" is otherwise indistinguishable from a
        // clear sky, a wrong map id and a plugin that never registered.
        const sig = spec ? `${(spec.layers || []).map((l) => l.kind).sort().join('+') || 'wash'}` : 'none';
        if (sig !== lastWeatherSig) {
          lastWeatherSig = sig;
          console.log(`[weather3d] ${sig} — map ${mapIdRef.current}, `
            + `${(spec?.masks || []).length} mask(s), clamp ${weatherClampRef.current}`);
        }
        weather.update({
          spec,
          timeSec: (performance.now() - startedAt) / 1000,
          anchor: controls.target,
          camDist: camera.position.distanceTo(controls.target),
          groundY,
          ceilingY,
          intensityScale: weatherClampRef.current,
        });
      }

      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    tick();

    const onResize = () => {
      if (!mount.clientWidth) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener('resize', onResize);

    stateRef.current = {
      scene, camera, renderer, controls, tokenGroup, geomGroup, groundMat, inkGroup,
      ftPerPx, worldW, worldH,
      // Filled in by the geometry effect; the token pass reads it to cull
      // anything out of sight.
      visPolys: [],
    };
    setReady(true);

    return () => {
      cancelAnimationFrame(raf);
      weather.dispose();
      tokenFx3d.dispose();
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('contextmenu', onContextMenu);
      renderer.domElement.removeEventListener('dblclick', onDoubleClick);
      renderer.domElement.removeEventListener('wheel', onWheelCancel);
      renderer.domElement.removeEventListener('pointerleave', onLeave);
      renderer.domElement.removeEventListener('pointermove', onHover);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      controls.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) {
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          // A shared map belongs to the art cache and outlives this build.
          mats.forEach((m) => { if (m.map && !m.userData?.sharedMap) m.map.dispose(); m.dispose(); });
        }
      });
      // Everything the module caches were holding, and then the context itself.
      //
      // `renderer.dispose()` alone leaves the driver holding the context's
      // textures until it feels like collecting them; forceContextLoss is what
      // actually hands the memory back, and it must come last — after every
      // dispose() above, which needs a live context to do its work.
      releaseSharedGpuMemory();
      renderer.forceContextLoss();
      stateRef.current = null;
    };
  // Deliberately NOT depending on walls/doors/visionOrigins.
  //
  // Those arrays are rebuilt on every render (visionOrigins is derived from the
  // token list), so listing them here tore down the renderer, camera and
  // controls each time anything moved — which is why the camera snapped back
  // to its opening position whenever a token was dragged. Scene setup now
  // depends only on the map's own stable geometry; everything that changes
  // during play is rebuilt by the effect below, in place.
  }, [mapUrl, mapWidth, mapHeight, gridSize, gridType]);

  // ── Floor, walls and doors ────────────────────────────────────────────────
  //
  // Rebuilt in place whenever the map's contents or this viewer's line of
  // sight changes. Separate from scene setup so a token moving (which changes
  // the visibility polygon) reshapes the fog without touching the camera.
  useEffect(() => {
    const st = stateRef.current;
    if (!st) return;
    const { scene, geomGroup, groundMat, ftPerPx, worldW, worldH } = st;

    // Dispose the previous build before replacing it — three.js doesn't free
    // GPU buffers on its own, and this runs every time anyone moves.
    // Walks a subtree freeing what this build owns, and stops dead at anything
    // flagged shared. An imported model's geometry, materials and textures
    // belong to the module-level cache and are shared by every placement of it
    // — freeing them here would blank the model everywhere on the next move.
    const disposeBuilt = (o) => {
      if (o.userData?.[SHARED_MODEL_FLAG]) return;
      if (o.geometry) o.geometry.dispose();
      if (o.material && o.material !== groundMat) {
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        // Textures too: the window mask is a fresh canvas texture on every
        // rebuild, and this rebuilds every time anyone moves. Disposing the
        // material alone would leak it.
        // A shared map belongs to the art cache and outlives this build.
        mats.forEach((m) => { if (m.map && !m.userData?.sharedMap) m.map.dispose(); m.dispose(); });
      }
      for (const child of o.children || []) disposeBuilt(child);
    };
    while (geomGroup.children.length) {
      disposeBuilt(geomGroup.children.pop());
    }

    // ── Ground ──
    // With fog on, the floor is not a rectangle: it's the union of what each
    // vision origin can see, built from the same wall/door segments and the
    // same visibility algorithm the 2D stage uses, so the two agree.
    // Where a storey's image sits in map space. A level is cropped to its own
    // content and placed at an offset; a board with no levels is its own image.
    // Which storeys are drawn: the GM's ticks, or — for a player — their own
    // floor and everything under it, with the ones above governed by the roofs
    // toggle. Both answers live in levelIsShown, so this pass never has to know
    // which viewer it is drawing for.
    const levelVisible = levelIsShown;

    // ── Where a wall or door takes its colour from ────────────────────────
    //
    // Imported geometry has no colour of its own, so it is sampled from the
    // art it was drawn on. For a normal map that is the map image. For a TILE
    // map the map image is a blank dark field — the board is unexplored until
    // tiles are laid — so sampling it painted every imported wall AND every
    // imported door the same near-black. The doors were built, stood up, and
    // were invisible: identical to the wall either side of them.
    //
    // Anything carrying a tile_id is sampled from that TILE's artwork instead,
    // which is where its walls and doors were actually drawn.
    const tileById = new Map((tiles || []).map((t) => [t.id, t]));
    const tileRect = (t) => ({
      x: (Number(t.grid_col) || 0) * gridSize,
      y: (Number(t.grid_row) || 0) * gridSize,
      w: (Number(t.grid_w) || 2) * gridSize,
      h: (Number(t.grid_h) || 2) * gridSize,
    });
    // The art is stored unrotated, so a sample point has to be turned back into
    // the tile's own frame before it is looked up. Without this a rotated tile
    // samples the wrong corner of its own picture.
    const unrotateIntoTile = (t, x, y) => {
      const rot = Number(t.rotation) || 0;
      if (!rot) return [x, y];
      const r = tileRect(t);
      const cx = r.x + r.w / 2;
      const cy = r.y + r.h / 2;
      const th = (-rot * Math.PI) / 180;
      const dx = x - cx;
      const dy = y - cy;
      return [cx + dx * Math.cos(th) - dy * Math.sin(th), cy + dx * Math.sin(th) + dy * Math.cos(th)];
    };
    // Returns the sampler and rect to use for one piece of geometry, whether
    // it belongs to a tile or to the map.
    const artFor = (row, lvlArt) => {
      const owner = row?.tile_id != null ? tileById.get(row.tile_id) : null;
      if (owner?.image_path) {
        return {
          sampler: getWallSampler(`/uploads/${owner.image_path}`, () => setWallTick((n) => n + 1)),
          rect: tileRect(owner),
          owner,
        };
      }
      return {
        sampler: getWallSampler(lvlArt?.image_path ? `/uploads/${lvlArt.image_path}` : mapUrl,
          () => setWallTick((n) => n + 1)),
        rect: levelRect(lvlArt),
        owner: null,
      };
    };

    const levelRect = (l) => ({
      x: Number(l?.offset_x) || 0,
      y: Number(l?.offset_y) || 0,
      w: Number(l?.width) || (Number(mapWidth) || 1000),
      h: Number(l?.height) || (Number(mapHeight) || 1000),
    });

    const toWorldX = (px) => (px - mapWidth / 2) * ftPerPx;
    const toWorldZ = (py) => (py - mapHeight / 2) * ftPerPx;

    let visPolys = [];
    const visPairs = [];
    // Occluders, hoisted out of the fog branch: a light's own line of sight is
    // computed from the same walls and shut doors even when this viewer has no
    // fog at all, which is the GM's normal case.
    let segs = [];
    // Assigned once the window mask is painted; a no-op when there are none.
    let windowDimAt = () => 0;
    if (fogOfWar) {
      // Magical darkness blocks sight, exactly as it does on the flat map:
      // its boundary is fed to the visibility solver alongside walls and shut
      // doors. Heavy fog and water are NOT blockers — they're visual only —
      // so only true darkness zones are converted.
      const darkSegs = (magicalDarkness || [])
        .filter((dz) => dz.zone_type !== 'heavy-fog' && dz.zone_type !== 'water')
        .flatMap((dz) => {
          if (dz.shape === 'polygon' && Array.isArray(dz.poly_points) && dz.poly_points.length >= 6) {
            const pts = dz.poly_points;
            const n = pts.length / 2;
            return Array.from({ length: n }, (_, i) => {
              const j = (i + 1) % n;
              return { ax: pts[i * 2], ay: pts[i * 2 + 1], bx: pts[j * 2], by: pts[j * 2 + 1] };
            });
          }
          const r = Number(dz.radius) || 0;
          if (!(r > 0)) return [];
          const N = 32;
          const out = [];
          for (let i = 0; i < N; i++) {
            const a0 = (i / N) * Math.PI * 2;
            const a1 = ((i + 1) / N) * Math.PI * 2;
            out.push({
              ax: dz.x + Math.cos(a0) * r, ay: dz.y + Math.sin(a0) * r,
              bx: dz.x + Math.cos(a1) * r, by: dz.y + Math.sin(a1) * r,
            });
          }
          return out;
        });

      // Sight is blocked by the walls on the VIEWER'S OWN STOREY, and by
      // nothing else.
      //
      // The 3D view is handed every level's geometry so it can stack the
      // building — but line of sight must not be. A wall on the ground floor
      // does not stop you seeing across the first floor, and feeding the whole
      // stack into one visibility polygon walled a token in behind rooms that
      // are underneath it.
      //
      // The viewer's storey, not the ACTIVE one: a player looks out from where
      // their own token is standing.
      const sightLevel = (() => {
        if (!(levels || []).length) return null;
        const vt = viewerTokenId != null
          ? (tokens || []).find((t) => t.id === viewerTokenId)
          : null;
        // Their ALTITUDE'S storey: a player flying at first-floor height looks
        // out past the ground floor's walls, not through them.
        return vt ? occupiedLevel(levels, vt) : activeLevel;
      })();
      const onSightLevel = (row) => sightLevel == null
        || (Number(row.level_index) || 0) === sightLevel;

      segs = [
        ...wallsToSegments((walls || []).filter(onSightLevel)),
        ...doorsToSegments((doors || []).filter((d) => !d.is_open && onSightLevel(d))),
        ...darkSegs,
      ];
      for (const o of (visionOrigins || [])) {
        // computeVisibilityPolygon returns a FLAT Konva-style point list
        // ([x0,y0,x1,y1,...]), not {x,y} objects. Converted once here so
        // everything downstream can treat it as points.
        const flat = computeVisibilityPolygon(o.x, o.y, segs, mapWidth, mapHeight);
        if (!Array.isArray(flat) || flat.length < 6) continue;
        const pts = [];
        for (let i = 0; i + 1 < flat.length; i += 2) pts.push({ x: flat[i], y: flat[i + 1] });
        if (pts.length >= 3) { visPolys.push(pts); visPairs.push({ o, pts }); }
      }
    }

    // DoubleSide because the fog patches are triangulated from a polygon whose
    // winding we don't control: a contour that comes back clockwise in world
    // XZ produces downward-facing triangles, and the floor would be invisible
    // from the only angle anyone looks at it.
    const groundMeshes = [];

    if (fogOfWar && visPolys.length) {
      for (const poly of visPolys) {
        // Built DIRECTLY in world XZ — no rotation.
        //
        // The previous version made a Shape in XY and rotated it flat, but
        // rotation.x = -PI/2 maps local +Y to world -Z, so every polygon point
        // landed mirrored north-south while the tokens (placed straight into
        // world XZ) did not. The visible ground and the tokens standing on it
        // disagreed, which reads as "the tokens are offset".
        const contour = poly.map((p) => new THREE.Vector2(toWorldX(p.x), toWorldZ(p.y)));
        const faces = THREE.ShapeUtils.triangulateShape(contour, []);
        if (!faces.length) continue;

        const positions = new Float32Array(contour.length * 3);
        const uv = new Float32Array(contour.length * 2);
        for (let i = 0; i < contour.length; i++) {
          const wx = contour[i].x;
          const wz = contour[i].y; // the Vector2's y IS the world z
          positions[i * 3] = wx;
          // Just above y=0, and deliberately BELOW the grid at 0.15.
          //
          // This used to sit at 0.2, above the grid, with a comment saying it
          // "beats the grid" — which it did, by hiding it. The fogged ground
          // is the map image, so burying the lattice under it meant the grid
          // was invisible everywhere the player could actually see and only
          // showed in the black beyond the fog. The flat map draws map image
          // first, then grid, then walls/terrain/lights; this is that same
          // order (ground 0.1 < grid 0.15 < mask 0.21 < light 0.22 <
          // terrain 0.25), with the same 0.05 separations used further up the
          // stack.
          positions[i * 3 + 1] = 0.1;
          positions[i * 3 + 2] = wz;
          // Same mapping the unrotated plane ends up with: u across the map,
          // v inverted because map pixels count downward from the top.
          uv[i * 2] = (wx + worldW / 2) / worldW;
          uv[i * 2 + 1] = 1 - (wz + worldH / 2) / worldH;
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
        geo.setIndex(faces.flat());
        geo.computeVertexNormals();

        const m = new THREE.Mesh(geo, groundMat);
        geomGroup.add(m);
        groundMeshes.push(m);
      }
    } else if (!fogOfWar) {
      const g = new THREE.Mesh(new THREE.PlaneGeometry(worldW, worldH), groundMat);
      g.rotation.x = -Math.PI / 2;
      geomGroup.add(g);
      groundMeshes.push(g);
    }
    const ground = groundMeshes[0] || null;

    if (mapUrl && groundMeshes.length) {
      // Not while the plane is meant to be clear — the viewer asked for an
      // empty floor and painting the board back onto it would undo that.
      //
      // Checked here rather than in a load callback: the texture now comes
      // from the cache synchronously, so the build already knows the answer,
      // and a later change of mode rebuilds anyway. The old code had to test
      // it asynchronously because the load raced the mode change.
      if (floorModeRef.current !== 'clear') {
        groundMat.map = groundTextureFor(mapUrl);
        groundMat.color.set(0xffffff);
        groundMat.needsUpdate = true;
      }
    }

    // Grid overlay, so distance stays readable in perspective.
    //
    // Built from the map's OWN lattice rather than THREE.GridHelper, which can
    // only draw a square grid of its own size — on a hex map it laid a square
    // grid over hexagonal cells, and on any map it ignored the centring rule
    // the flat map uses for partial cells. Hexes come from utils/grid.js, the
    // same source the 2D lattice is traced from, so the two agree cell for
    // cell.
    const mapW = Number(mapWidth) || 1000;
    const mapH = Number(mapHeight) || 1000;
    const gridPts = [];

    // The grid is CLIPPED to the floor it belongs to, the way a ship's deck
    // grid is clipped to the deck.
    //
    // Dungeondraft crops each storey to its own content, so an upper floor is
    // usually a smaller canvas centred on the building. Ruling the lattice
    // across the whole map extent left grid hanging in open air off every edge
    // of that floor — squares you could measure across but not stand on.
    // The grid is CLIPPED TO THE ART, not to the image's bounding box.
    //
    // A storey exported from Dungeondraft is a rectangle that is mostly
    // TRANSPARENT: the building occupies some irregular shape in the middle and
    // the rest is empty. Clipping to the rectangle still ruled squares across
    // all that empty space — grid hanging in open air, which is what a floor
    // plan's own outline is supposed to prevent.
    //
    // So each cell is tested against the image's ALPHA and drawn only where
    // there is floor under it. Same idea as a ship's deck grid stopping at the
    // hull, arrived at from the art instead of from a stored outline.
    const gridRects = [];
    if ((levels || []).length) {
      for (const l of levels) {
        if (!levelVisible(Number(l.level_index) || 0)) continue;
        gridRects.push({
          level: l,
          rect: levelRect(l),
          gy: levelBaseY(levels, Number(l.level_index) || 0) + 0.15,
        });
      }
    }
    // No levels: the board is one floor and its own image is the whole extent.
    if (!gridRects.length) {
      gridRects.push({ level: null, rect: { x: 0, y: 0, w: mapW, h: mapH }, gy: 0.15 });
    }

    const GRID_ALPHA_MIN = 24;
    for (const { level, rect, gy } of gridRects) {
      const url = level?.image_path ? `/uploads/${level.image_path}` : mapUrl;
      const sampler = getWallSampler(url, () => setWallTick((n) => n + 1));
      // Until the image has been read there is nothing to test against, so the
      // whole rect is drawn and the tick brings it back once it lands.
      const solid = (mx, my) => !sampler || alphaAt(sampler, rect, mx, my) >= GRID_ALPHA_MIN;

      const pushSeg = (x1, y1, x2, y2) => {
        gridPts.push(
          (x1 - mapW / 2) * ftPerPx, gy, (y1 - mapH / 2) * ftPerPx,
          (x2 - mapW / 2) * ftPerPx, gy, (y2 - mapH / 2) * ftPerPx,
        );
      };

      if (gridType === 'hex') {
        const lat = hexLattice(mapW, mapH, gridSize);
        // Below a couple of pixels a hex is a smudge and the cell count explodes
        // — the same guard the 2D lattice uses.
        if (lat.colStep >= 3 && lat.nCols * lat.nRows <= 20000) {
          for (let c = 0; c < lat.nCols; c++) {
            for (let r = 0; r < lat.nRows; r++) {
              const { x, y } = hexCenter(lat, c, r);
              // Whole hexes only: one clipped mid-edge reads as a broken
              // lattice rather than an edge.
              if (!solid(x, y)) continue;
              let px = x + lat.R, py = y;
              for (let i = 1; i <= 6; i++) {
                const a = (i / 6) * Math.PI * 2;
                const nx = x + Math.cos(a) * lat.R;
                const ny = y + Math.sin(a) * lat.R;
                pushSeg(px, py, nx, ny);
                px = nx; py = ny;
              }
            }
          }
        }
      } else {
        // Centred so partial cells are equal on both sides, matching the flat
        // map. The lattice is laid out against the MAP, so every floor's
        // squares line up with each other — only which cells are drawn differs.
        const ogx = gridSize > 0 ? (mapW % gridSize) / 2 : 0;
        const ogy = gridSize > 0 ? (mapH % gridSize) / 2 : 0;
        const nC = gridSize > 0 ? Math.ceil((mapW - ogx) / gridSize) : 0;
        const nR = gridSize > 0 ? Math.ceil((mapH - ogy) / gridSize) : 0;
        // Guard against a pathological grid size turning this into millions of
        // alpha lookups.
        if (nC * nR <= 40000) {
          const cellSolid = [];
          for (let c = 0; c < nC; c++) {
            cellSolid[c] = [];
            for (let r = 0; r < nR; r++) {
              const cx = ogx + (c + 0.5) * gridSize;
              const cy = ogy + (r + 0.5) * gridSize;
              cellSolid[c][r] = cx >= rect.x && cx <= rect.x + rect.w
                && cy >= rect.y && cy <= rect.y + rect.h
                && solid(cx, cy);
            }
          }
          for (let c = 0; c < nC; c++) {
            for (let r = 0; r < nR; r++) {
              if (!cellSolid[c][r]) continue;
              const x0 = ogx + c * gridSize, x1 = x0 + gridSize;
              const y0 = ogy + r * gridSize, y1 = y0 + gridSize;
              // Left and top always; right and bottom only where the run ends.
              // Drawing all four per cell would double every interior line.
              pushSeg(x0, y0, x0, y1);
              pushSeg(x0, y0, x1, y0);
              if (c === nC - 1 || !cellSolid[c + 1][r]) pushSeg(x1, y0, x1, y1);
              if (r === nR - 1 || !cellSolid[c][r + 1]) pushSeg(x0, y1, x1, y1);
            }
          }
        }
      }
    }
    // The GM's grid colour and opacity, from the Map tab. Falls back to the
    // view's own slate blue when the host doesn't set one.
    const gridStyle = (() => {
      const m = String(gridColor || '').match(/rgba?\(([^)]+)\)/i);
      if (!m) return { color: 0x8899bb, opacity: 0.28 };
      const parts = m[1].split(',').map((v) => parseFloat(v.trim()));
      const [r, g, b] = parts;
      const a = parts.length > 3 ? parts[3] : 1;
      if (![r, g, b].every(Number.isFinite)) return { color: 0x8899bb, opacity: 0.28 };
      return {
        // Converted once, the same way the wall sampler does — see
        // sampleWallColor for why the explicit convert was wrong.
        color: new THREE.Color().setRGB(r / 255, g / 255, b / 255, THREE.SRGBColorSpace),
        // A dead-black grid at the 2D map's own alpha is close to invisible
        // against a dark 3D scene, so the floor is a little higher here.
        opacity: Math.max(0, Math.min(1, Number.isFinite(a) ? a : 1)),
      };
    })();

    if (gridPts.length && gridStyle.opacity > 0.001) {
      const ggeo = new THREE.BufferGeometry();
      ggeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(gridPts), 3));
      const grid = new THREE.LineSegments(
        ggeo,
        new THREE.LineBasicMaterial({
          color: gridStyle.color,
          transparent: true,
          opacity: gridStyle.opacity,
          fog: false,
        })
      );
      // Above the window see-through mask (2.5), not below it.
      //
      // The mask dims ground seen through a window on a gradient that reaches
      // FULLY OPAQUE at the far end of the reach. Drawn after the grid, it
      // painted the lattice out — faint near the window, gone completely
      // further in — so exactly the stretch of floor a player is squinting
      // across had nothing to measure by.
      //
      // Only the render order needs to change, not the height: the mask has
      // depthWrite off, so it never occludes anything drawn after it, and the
      // grid still depth-tests against the ground below it. Terrain stays on
      // top regardless — it is opaque, so it draws in the earlier pass, and
      // its polygon offset keeps it winning the depth test even though it now
      // lies just above the board rather than at 0.25 (see TERRAIN_LIFT).
      grid.renderOrder = 2.6;
      // Into geomGroup, NOT straight into the scene.
      //
      // This pass tears down geomGroup and nothing else, so a grid added to the
      // scene was never removed — every rebuild left another one behind. That
      // was invisible while the grid was always identical: the copies landed on
      // top of each other. The moment it started differing per storey (clipped
      // to that floor's art) the stale ones showed through as a second lattice,
      // most obviously with every level on screen at once.
      geomGroup.add(grid);
    }

    // ── Sight through windows, dimmed ─────────────────────────────────────
    //
    // Windows don't block line of sight, so the fog polygon runs straight
    // through them and everything beyond reads as brightly lit as the room
    // you're standing in. The flat map fades that view out a few feet past the
    // glass.
    //
    // This paints the same overlay the 2D fog canvas paints, with the same
    // constants, and then hangs it over the board as a texture. Earlier
    // attempts built the cones as geometry, which got the fade wrong twice
    // over: a mesh cone can't be clipped to the origin's visibility polygon,
    // so masks appeared for windows the player couldn't see at all, floating
    // over fogged ground on the far side of a wall. Canvas clipping is what
    // makes the 2D version correct, so this uses canvas.
    if (fogOfWar && visPairs.length) {
      const windows = (walls || [])
        .map((w) => {
          if (w.type !== 'window') return null;
          let pts = w.points;
          if (typeof pts === 'string') { try { pts = JSON.parse(pts); } catch { return null; } }
          return Array.isArray(pts) && pts.length >= 4 ? windowData({ ...w, points: pts }) : null;
        })
        .filter(Boolean);

      if (windows.length) {
        // One texel per map pixel is wasteful for something this soft; cap it
        // and let the GPU filter the rest.
        const MASK_MAX = 1536;
        const scale = Math.min(1, MASK_MAX / Math.max(mapWidth, mapHeight, 1));
        const cvs = document.createElement('canvas');
        cvs.width = Math.max(1, Math.round(mapWidth * scale));
        cvs.height = Math.max(1, Math.round(mapHeight * scale));
        const ctx = cvs.getContext('2d');
        ctx.scale(scale, scale);

        // Same helpers as the flat map's fog pass.
        const clipToFlat = (flat) => {
          ctx.beginPath();
          ctx.moveTo(flat[0], flat[1]);
          for (let i = 2; i < flat.length; i += 2) ctx.lineTo(flat[i], flat[i + 1]);
          ctx.closePath();
          ctx.clip();
        };
        const clipToPts = (pts) => {
          ctx.beginPath();
          ctx.moveTo(pts[0].x, pts[0].y);
          for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
          ctx.closePath();
          ctx.clip();
        };
        // A far-side cone runs several map-widths past its glass, so filling
        // its raw bounds would be no saving. Clamped to the map, which is all
        // the LOS polygon can cover anyway.
        const fillFlatBounds = (flat) => {
          let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
          for (let i = 0; i < flat.length; i += 2) {
            if (flat[i] < x0) x0 = flat[i];
            if (flat[i] > x1) x1 = flat[i];
            if (flat[i + 1] < y0) y0 = flat[i + 1];
            if (flat[i + 1] > y1) y1 = flat[i + 1];
          }
          x0 = Math.max(0, x0); y0 = Math.max(0, y0);
          x1 = Math.min(mapWidth, x1); y1 = Math.min(mapHeight, y1);
          if (!(x1 > x0) || !(y1 > y0)) return;
          ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
        };

        const reachPx = WINDOW_SEE_THROUGH_FT / ftPerPx;
        let winMeshes = 0;
        for (const { o, pts } of visPairs) {
          for (const win of windows) {
            const far = windowFarSideData(win, o.x, o.y, mapWidth, mapHeight);
            if (!far || !Array.isArray(far.poly) || far.poly.length < 6) continue;
            ctx.save();
            // The clip that was missing: only ground THIS origin can actually
            // see gets dimmed. Everything else is already fogged.
            clipToPts(pts);
            clipToFlat(far.poly);
            const grad = ctx.createLinearGradient(
              far.mx, far.my,
              far.mx + far.nx * reachPx, far.my + far.ny * reachPx,
            );
            grad.addColorStop(0, `rgba(0,0,0,${WINDOW_DIM_ALPHA})`);
            grad.addColorStop(0.55, `rgba(0,0,0,${(WINDOW_DIM_ALPHA + 1) / 2})`);
            grad.addColorStop(1, 'rgba(0,0,0,1)');
            ctx.fillStyle = grad;
            fillFlatBounds(far.poly);
            ctx.restore();
            winMeshes++;
          }
        }

        // How dark is the mask at a given map point?
        //
        // The mask lies flat on the ground, so it can only ever cover the
        // ground — a standing token sprite or a door pokes through it and
        // stays bright no matter what render order it has. Anything that
        // isn't floor has to consult the mask itself and dim or drop out.
        // One readback of the finished canvas, then per-entity lookups.
        const px = ctx.getImageData(0, 0, cvs.width, cvs.height);
        windowDimAt = (mx, my) => {
          const cx = Math.round(mx * scale), cy = Math.round(my * scale);
          if (cx < 0 || cy < 0 || cx >= cvs.width || cy >= cvs.height) return 0;
          return px.data[(cy * cvs.width + cx) * 4 + 3] / 255;
        };

        const tex = new THREE.CanvasTexture(cvs);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.minFilter = THREE.LinearFilter;
        // Default UVs line up: rotated flat, the plane's +Y is world -Z, which
        // is the top of the map — the same mapping the ground uses.
        const maskMesh = new THREE.Mesh(
          new THREE.PlaneGeometry(worldW, worldH),
          new THREE.MeshBasicMaterial({
            map: tex,
            transparent: true,
            depthWrite: false,
            // Depth testing back ON, with a polygon offset instead.
            //
            // renderOrder can't solve this: it only sorts within a pass, and a
            // transparent mask is always drawn after every opaque object, so
            // an opaque dashed line or token sprite got painted over however
            // high its renderOrder was. Depth is the only thing that knows a
            // line at 30 ft is in front of a mask lying on the floor.
            //
            // The offset is what keeps it off the floor: the two are 0.01 ft
            // apart, far too close for the depth buffer at map-crossing
            // distances, and biasing the mask toward the camera wins that tie
            // without lifting it into a visible hovering sheet.
            depthTest: true,
            polygonOffset: true,
            polygonOffsetFactor: -4,
            polygonOffsetUnits: -8,
            side: THREE.DoubleSide,
          })
        );
        maskMesh.rotation.x = -Math.PI / 2;
        // Level with the floor (0.2), not hovering over it. The hair of
        // clearance is only there in case depth testing is ever switched back
        // on; with it off, render order alone decides, so there's no need for
        // the gap that made the mask read as a sheet held above the map.
        maskMesh.position.y = 0.21;
        // Over the floor AND the doors (2), under the templates (3+). The mask
        // skips the depth test, so render order alone decides: at 1 the doors
        // painted over it and a door seen through a window stayed bright while
        // the ground around it faded.
        maskMesh.renderOrder = 2.5;
        geomGroup.add(maskMesh);
      }
    }



    // ── Lights ────────────────────────────────────────────────────────────
    //
    // Painted by the flat map's own light code — paintLightGlow — onto a
    // canvas in map coordinates, then laid over the board with additive
    // blending. The flicker model, the gradient stops, the cone clipping and
    // the per-light LOS polygon all come from that shared function, so a
    // candle guttering in 2D gutters identically here.
    //
    // An earlier attempt hung real PointLights in the scene. It looked awful:
    // three.js point lights fall off by distance from a point in mid-air and
    // know nothing about walls, so every torch bled through into the next
    // room and lit the map image flatly from above. A glow layer is what the
    // 2D view actually draws, and matching it is the whole requirement.
    {
      const glows = buildGlowLights({
        lights, tokens, gridSize, mW: mapWidth, mH: mapHeight,
      });
      if (glows.length) {
        const LIGHT_MAX = 1024;
        const lScale = Math.min(1, LIGHT_MAX / Math.max(mapWidth, mapHeight, 1));
        const lc = document.createElement('canvas');
        lc.width = Math.max(1, Math.round(mapWidth * lScale));
        lc.height = Math.max(1, Math.round(mapHeight * lScale));
        const lctx = lc.getContext('2d');

        // One visibility polygon per light, solved once here rather than per
        // frame — the flicker moves the radius, not the walls.
        const polyCache = new Map();
        const lightPolyFor = (lx, ly) => {
          const key = `${Math.round(lx)},${Math.round(ly)}`;
          if (polyCache.has(key)) return polyCache.get(key);
          let poly = null;
          try {
            const flat = computeVisibilityPolygon(lx, ly, segs, mapWidth, mapHeight);
            poly = Array.isArray(flat) && flat.length >= 6 ? flat : null;
          } catch { poly = null; }
          polyCache.set(key, poly);
          return poly;
        };

        const ltex = new THREE.CanvasTexture(lc);
        ltex.colorSpace = THREE.SRGBColorSpace;
        ltex.minFilter = THREE.LinearFilter;
        const lightMesh = new THREE.Mesh(
          new THREE.PlaneGeometry(worldW, worldH),
          new THREE.MeshBasicMaterial({
            map: ltex,
            transparent: true,
            // Additive, so light ADDS to the map image instead of tinting it
            // grey where it's dark. Unlit ground contributes nothing.
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            polygonOffset: true,
            polygonOffsetFactor: -3,
            polygonOffsetUnits: -6,
            side: THREE.DoubleSide,
          })
        );
        lightMesh.rotation.x = -Math.PI / 2;
        lightMesh.position.y = 0.22;
        lightMesh.renderOrder = 2;  // over the floor, under the window mask
        geomGroup.add(lightMesh);

        // Clip the whole layer to what this viewer can see.
        //
        // paintLightGlow clips each glow to the LIGHT's line of sight, which
        // is what stops a torch shining through a wall. It says nothing about
        // the VIEWER's, so a lit room the player has never seen still glowed —
        // light pooling in the void where the fog-clipped floor doesn't even
        // exist. The union of the visibility polygons is the same boundary the
        // floor is built from, so the glow now stops exactly where the ground
        // does.
        let visPath = null;
        if (fogOfWar) {
          visPath = new Path2D();
          for (const pts of visPolys) {
            if (!pts || pts.length < 3) continue;
            visPath.moveTo(pts[0].x, pts[0].y);
            for (let i = 1; i < pts.length; i++) visPath.lineTo(pts[i].x, pts[i].y);
            visPath.closePath();
          }
        }

        st.lightLayer = { ctx: lctx, tex: ltex, glows, lightPolyFor, scale: lScale, visPath, last: -1 };
      } else {
        st.lightLayer = null;
      }
    }

    // Shared by walls, doors and (in the token pass) the tokens themselves:
    // is this map point inside what the viewer can see?
    const inPolyScene = (px, py, poly) => {
      let inside = false;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const xi = poly[i].x, yi = poly[i].y, xj = poly[j].x, yj = poly[j].y;
        if (((yi > py) !== (yj > py)) && (px < ((xj - xi) * (py - yi)) / (yj - yi + 1e-9) + xi)) inside = !inside;
      }
      return inside;
    };
    const seenAt = (px, py) => {
      if (!fogOfWar) return true;
      if (!visPolys.length) return false;
      return visPolys.some((poly) => inPolyScene(px, py, poly));
    };

    // Is any part of an AREA visible?
    //
    // Templates and zones cover ground rather than sitting on a line, so they
    // get sampled at several points and drawn if any one of them is in sight.
    // Without this a fireball or a darkness zone behind a wall was fully
    // visible to a player who couldn't possibly see it.
    //
    // All-or-nothing rather than clipped to the visibility polygon: a partly
    // seen effect still reads correctly, whereas a hidden one is a genuine
    // information leak. Clipping would be the finer answer if it matters.
    const areaSeen = (samples) => {
      if (!fogOfWar) return true;
      if (!visPolys.length) return false;
      for (const [px, py] of samples) {
        if (seenAt(px, py)) return true;
      }
      return false;
    };

    // Ring of sample points for a circular area, plus its centre.
    const circleSamples = (cx, cy, r) => {
      const out = [[cx, cy]];
      for (const frac of [0.55, 0.95]) {
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          out.push([cx + Math.cos(a) * r * frac, cy + Math.sin(a) * r * frac]);
        }
      }
      return out;
    };

    // Is any part of this segment visible?
    //
    // Testing a door at its midpoint was the bug behind "I can see this door
    // from one side but not the other". A closed door BLOCKS sight, so the
    // visibility polygon's edge runs exactly along the door's own line — and a
    // point sampled on that line is on the boundary, where point-in-polygon is
    // a coin flip. Which way it fell depended on which side of the door the
    // viewer stood, so the same door appeared from the east and vanished from
    // the west.
    //
    // So sample along the segment and pull each sample a short way TOWARDS the
    // nearest viewer — off the boundary, into the room they're standing in.
    const NUDGE_PX = Math.max(4, gridSize * 0.35);
    const segmentSeen = (ax, ay, bx, by) => {
      if (!fogOfWar) return true;
      if (!visPolys.length) return false;
      const origins = visionOrigins || [];
      if (!origins.length) return false;
      for (const f of [0.2, 0.4, 0.5, 0.6, 0.8]) {
        const sx = ax + (bx - ax) * f;
        const sy = ay + (by - ay) * f;
        let best = null, bestD = Infinity;
        for (const o of origins) {
          const d = Math.hypot(o.x - sx, o.y - sy);
          if (d < bestD) { bestD = d; best = o; }
        }
        if (!best) continue;
        if (bestD < 1e-6) return true;
        const nx = sx + ((best.x - sx) / bestD) * NUDGE_PX;
        const ny = sy + ((best.y - sy) / bestD) * NUDGE_PX;
        if (seenAt(nx, ny)) return true;
      }
      return false;
    };

    // ── Doors, drawn FLAT on the floor ────────────────────────────────────
    //
    // Walls and doors were extruded into 3D boxes here. That was the wrong
    // call: the ground already carries the map image, which draws its own
    // walls, so the boxes doubled up on artwork that was already there and
    // fought it — misaligned, occluding tokens, and looking broken from most
    // angles.
    //
    // Doors still need drawing because they MOVE, and a door's state is not in
    // the map image. So they're drawn the way the flat map draws them: the
    // door's own sprite, lying on the floor, opening with the same motion.
    // Nothing stands up off the ground any more.
    const doorGroup = new THREE.Group();
    let dIn = 0, dDrawn = 0, dCulled = 0, dBad = 0;
    const DOOR_Y = 0.5; // just clear of the floor, under every token
    // Set per door, read by doorPlane below: how much the window mask
    // shadows this one. Fully shadowed doors never get built.
    let doorDim = 0;
    const FULLY_SHADOWED = 0.92;

    // Standing doors, for maps whose walls stand up.
    //
    // The flat quad below is a top-down sprite lying on the floor, which is
    // exactly right when nothing else in the scene has height — it reads as the
    // door symbol on the map. The moment walls are extruded it stops working:
    // the door lies on the ground while the wall it belongs to rises past it,
    // leaving an open hole in the building.
    //
    // So on a levelled map doors are built as upright leaves in the opening,
    // and everywhere else the original behaviour is untouched.
    const standingDoors = wallMode === 'solid';
    // A door belongs to a storey, like the walls it sits in: its height comes
    // from that storey and, when the stack is expanded, so does its base.
    const storeyOf = (d) => {
      const li = Number(d?.level_index) || 0;
      const l = (levels || []).find((x) => x.level_index === li);
      return {
        // The door's own height wins, for the same reason the wall's does:
        // a doorway in a 6ft crawlspace cannot be 7ft tall.
        ft: Number(d?.height_ft) > 0 ? Number(d.height_ft)
          : (Number(l?.height_ft) > 0 ? Number(l.height_ft) : 10),
        base: levelBaseY(levels, li),
        visible: levelVisible(li),
      };
    };

    // A door is not as tall as the room. The gap above it is what makes a wall
    // read as a wall with a door in it rather than a wall made of door.
    // Computed per door as `doorTop`, from that door's own storey.
    //
    // That gap is filled by a TRANSOM — a fixed panel from the top of the door
    // to the ceiling, in the wall's colour. Without it the opening is a hole
    // you can see straight through above head height, which is worse than a
    // door that doesn't look like one: it leaks line of sight into the next
    // room. The transom is part of the WALL, not the door, so it stays put when
    // the door swings — which is also why it can't simply be a taller leaf.


    // An upright leaf, hinged about its own left edge so a pivot group can
    // swing it. Sampled from the map art like the walls are, since an imported
    // door carries no colour either.
    // `doorId` is stamped on the object each builder returns rather than at the
    // add sites — there are seven of those across the open/closed/slide/double
    // branches, and one missed would be a door that silently can't be clicked.
    let currentDoorId = null;
    const doorUpright = (lenFt, colorHex, tex, leafFt) => {
      const g = new THREE.Group();
      g.userData.doorId = currentDoorId;
      const mat = tex
        ? new THREE.MeshStandardMaterial({ map: tex, alphaTest: 0.35, side: THREE.DoubleSide, roughness: 0.75 })
        : new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.75, metalness: 0.03, side: THREE.DoubleSide });
      if (doorDim > 0) mat.color.multiplyScalar(1 - doorDim);
      // Shared with every other door using this art — see doorTextureFor.
      if (tex) mat.userData.sharedMap = true;
      const leaf = new THREE.Mesh(new THREE.PlaneGeometry(lenFt, leafFt), mat);
      // Built about the leaf's centre, then shifted so the group's origin is
      // the hinge edge at floor level.
      leaf.position.set(lenFt / 2, leafFt / 2, 0);
      g.add(leaf);
      return g;
    };

    // A flat quad carrying the door sprite, lying in the ground plane.
    const doorPlane = (lenFt, thickFt, tex, fallback) => {
      // alphaTest rather than blended transparency.
      //
      // A blended, depthWrite:false plane is sorted per-object against the
      // floor, and from some orbit angles it lost that sort and vanished —
      // which is why doors looked like they only existed from one side.
      // alphaTest discards transparent texels in the depth pass instead, so
      // the door behaves like solid geometry and is visible from anywhere.
      const mat = tex
        ? new THREE.MeshBasicMaterial({ map: tex, alphaTest: 0.35, side: THREE.DoubleSide })
        : new THREE.MeshBasicMaterial({ color: fallback, side: THREE.DoubleSide });
      // The map belongs to doorTexCache and is shared by every door using this
      // art. disposeBuilt frees a material's texture unless it is told the map
      // is shared — and freeing it here would blank the door art on the next
      // rebuild for every door at once.
      // Same fade the ground gets, applied to the sprite's own colour.
      if (doorDim > 0) mat.color.multiplyScalar(1 - doorDim);
      if (tex) mat.userData.sharedMap = true;
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(lenFt, thickFt), mat);
      mesh.rotation.x = -Math.PI / 2; // lie flat
      mesh.renderOrder = 2;           // after the floor, before the tokens
      mesh.userData.doorId = currentDoorId;
      return mesh;
    };

    for (const d of (doors || [])) {
      dIn++;
      let pts = d.points;
      if (typeof pts === 'string') { try { pts = JSON.parse(pts); } catch { pts = null; } }
      if (!Array.isArray(pts) || pts.length < 4) { dBad++; continue; }

      const ax = pts[0], ay = pts[1], bx = pts[2], by = pts[3];
      if (!segmentSeen(ax, ay, bx, by)) { dCulled++; continue; }
      // In line of sight, but out in the dark past a window: not visible.
      doorDim = windowDimAt((ax + bx) / 2, (ay + by) / 2);
      if (doorDim >= FULLY_SHADOWED) { dCulled++; continue; }
      dDrawn++;

      currentDoorId = d.id;
      const storey = storeyOf(d);
      // A door on a storey that isn't drawn would hang in mid-air.
      if (!storey.visible) continue;
      const doorTop = Math.max(3, Math.min(storey.ft - 1.5, 7));
      const x1 = toWorldX(ax), z1 = toWorldZ(ay);
      const x2 = toWorldX(bx), z2 = toWorldZ(by);
      const len = Math.hypot(x2 - x1, z2 - z1);
      if (len < 0.5) continue;
      // Angle in the ground plane. Negated because world Z grows the opposite
      // way to screen Y.
      const angle = -Math.atan2(z2 - z1, x2 - x1);
      const thick = Math.max(1.2, len * 0.22);

      // Sprite art if the door has any, matching the flat map exactly.
      let tex = null;
      let fallback = d.is_open ? 0xb98a54 : 0x8a5a2b;
      // `|| secret` because a secret door is drawn AS the wall: it needs the
      // wall's colour whether or not the GM also assigned it door art.
      if (standingDoors && (!d.sprite_path || doorMotion(d) === 'secret')) {
        // An imported door has no sprite and no colour — same as its walls.
        // Read it off the art, so a black iron gate and a pine door are not
        // both the same generic brown.
        //
        // From the TILE's art when the door came in with a tile: a tile map's
        // own image is a blank dark field, and sampling that made every
        // imported door the same near-black as the wall beside it.
        const lvlArt = (levels || []).find((x) => x.level_index === (Number(d.level_index) || 0));
        const art = artFor(d, lvlArt);
        let [sx1, sy1] = art.owner ? unrotateIntoTile(art.owner, ax, ay) : [ax, ay];
        let [sx2, sy2] = art.owner ? unrotateIntoTile(art.owner, bx, by) : [bx, by];
        if (art.owner) {
          // Nudged INWARD, toward the middle of the tile, before sampling.
          //
          // A tile's doorways sit on its outer edge, so sampling the door line
          // itself reads the very last pixel row of the artwork — the outside
          // face of the wall, or nothing at all where the art is cut off. That
          // is why the doors came out the same colour as the walls: they were
          // being painted with the wall's own edge.
          //
          // A third of a square in lands on the floor of the room the doorway
          // opens into, which is the colour "the tile beneath" actually means.
          const r = art.rect;
          const cx = r.x + r.w / 2;
          const cy = r.y + r.h / 2;
          const mx = (sx1 + sx2) / 2;
          const my = (sy1 + sy2) / 2;
          const len = Math.hypot(cx - mx, cy - my) || 1;
          const step = gridSize * 0.34;
          const ox = ((cx - mx) / len) * step;
          const oy = ((cy - my) / len) * step;
          sx1 += ox; sy1 += oy; sx2 += ox; sy2 += oy;
        }
        fallback = sampleWallColor(art.sampler, art.rect, sx1, sy1, sx2, sy2).getHex();
      }
      if (d.sprite_path) {
        tex = doorTextureFor(d.sprite_path, () => setWallTick((n) => n + 1));
      }

      const motion = doorMotion(d);
      const dirSign = Number(d.open_dir) < 0 ? -1 : 1;

      // ── Secret doors ──────────────────────────────────────────────────
      //
      // Built with the very same helper the walls are built with, at the same
      // height and in the sampled wall colour, so it is not a door dressed as
      // a wall — from the camera's point of view it IS one more wall segment.
      // Anything less (a thinner panel, a slightly different brown) is exactly
      // the sort of tell a player learns to spot.
      if (motion === 'secret') {
        if (!d.is_open) {
          const secretH = Number(d.height_ft) > 0 ? Number(d.height_ft)
            : (Number(storey.ft) > 0 ? Number(storey.ft) : 10);
          // Only where walls actually stand. Outside 'solid' mode the map has
          // no 3D walls at all, and a lone wall segment across one doorway
          // would be the most conspicuous thing on the board — the exact
          // opposite of what a secret door is for. With nothing to blend into,
          // blending in means drawing nothing.
          // buildWallMesh reads .r/.g/.b off each colour — it wants THREE.Color
          // objects, not the hex number `fallback` holds. Passing the number
          // filled the colour buffer with NaN, and a mesh with NaN vertex
          // colours does not draw: the secret door came out as a hole in the
          // wall rather than as wall.
          const wallish = standingDoors ? buildWallMesh(
            [[x1, z1, x2, z2]], [new THREE.Color(fallback)], secretH, storey.base
          ) : null;
          if (wallish) {
            wallish.renderOrder = 1;
            doorGroup.add(wallish);
          }
          // The GM's tell: a threshold strip on the FLOOR across the opening,
          // drawn only for them.
          //
          // Lying flat, not standing up. The first version of this was a short
          // wall built by the same helper at base + 0.02 — which put it in the
          // very same plane as the secret wall itself, two coplanar surfaces
          // arguing over the same pixels for the bottom third of the doorway.
          // A horizontal strip shares no plane with the wall at all, so there
          // is nothing left to fight.
          if (isGMRef.current) {
            const sdx = x2 - x1, sdz = z2 - z1;
            const sl = Math.hypot(sdx, sdz) || 1;
            // Half a foot either side of the door line.
            const nx = (-sdz / sl) * 0.5, nz = (sdx / sl) * 0.5;
            const my = storey.base + 0.06;   // clear of the floor it lies on
            const mg = new THREE.BufferGeometry();
            mg.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
              x1 - nx, my, z1 - nz,  x2 - nx, my, z2 - nz,  x2 + nx, my, z2 + nz,
              x1 - nx, my, z1 - nz,  x2 + nx, my, z2 + nz,  x1 + nx, my, z1 + nz,
            ]), 3));
            mg.computeVertexNormals();
            const mark = new THREE.Mesh(mg, new THREE.MeshBasicMaterial({
              color: 0xc084fc,
              transparent: true,
              opacity: 0.7,
              side: THREE.DoubleSide,
              // Marks the floor without claiming depth over what stands on it.
              depthWrite: false,
            }));
            mark.renderOrder = 3;
            doorGroup.add(mark);
          }
        }
        // Open, there is nothing to draw at all — the gap IS the door.
        continue;
      }

      // A WINDOW: glass in the opening, floor to lintel, and it never opens.
      //
      // Built here rather than as a variant of the door below because almost
      // nothing is shared — no leaf, no hinge, no swing, and the panel is
      // see-through, which is the one property that matters.
      if (standingDoors && d.portal_kind === 'window') {
        const sillFt = Math.min(storey.ft * 0.32, 3);
        const headFt = Math.min(storey.ft - 0.8, sillFt + 4.5);
        const glassH = Math.max(0.5, headFt - sillFt);
        const yaw = -Math.atan2(z2 - z1, x2 - x1);
        const cx = (x1 + x2) / 2, cz = (z1 + z2) / 2;

        const glass = new THREE.Mesh(
          new THREE.PlaneGeometry(len, glassH),
          new THREE.MeshStandardMaterial({
            color: 0xbfe4f5,
            transparent: true,
            opacity: 0.28,
            roughness: 0.08,
            metalness: 0.0,
            side: THREE.DoubleSide,
            // Glass must not hide what is behind it in the depth buffer, or the
            // room through the window goes missing.
            depthWrite: false,
          })
        );
        glass.position.set(cx, storey.base + sillFt + glassH / 2, cz);
        glass.rotation.y = yaw;
        glass.renderOrder = 3;
        glass.userData.doorId = d.id;
        doorGroup.add(glass);

        // Wall below the sill and above the head, in the wall's own colour —
        // otherwise the window is a hole from the floor to the ceiling.
        const lvlW = (levels || []).find((x) => x.level_index === (Number(d.level_index) || 0));
        const wsam = getWallSampler(
          lvlW?.image_path ? `/uploads/${lvlW.image_path}` : mapUrl,
          () => setWallTick((n) => n + 1)
        );
        const dxw = bx - ax, dyw = by - ay;
        const wcol = sampleWallColor(
          wsam, levelRect(lvlW),
          ax - dxw * 0.4, ay - dyw * 0.4, bx + dxw * 0.4, by + dyw * 0.4
        );
        if (doorDim > 0) wcol.multiplyScalar(1 - doorDim);
        const infill = (h0, h1) => {
          if (h1 - h0 < 0.05) return;
          const m = new THREE.Mesh(
            new THREE.PlaneGeometry(len, h1 - h0),
            new THREE.MeshStandardMaterial({ color: wcol, roughness: 0.92, metalness: 0.02, side: THREE.DoubleSide })
          );
          m.position.set(cx, storey.base + h0 + (h1 - h0) / 2, cz);
          m.rotation.y = yaw;
          m.renderOrder = 1;
          doorGroup.add(m);
        };
        infill(0, sillFt);
        infill(headFt, storey.ft);
        continue;
      }

      if (standingDoors) {
        // The wall above the opening. Sampled along a stretch that runs PAST
        // both ends of the door, so it takes the colour of the wall either side
        // rather than of the door itself.
        if (storey.ft - doorTop > 0.2) {
          const lvlArt2 = (levels || []).find((x) => x.level_index === (Number(d.level_index) || 0));
          const sampler = getWallSampler(
            lvlArt2?.image_path ? `/uploads/${lvlArt2.image_path}` : mapUrl,
            () => setWallTick((n) => n + 1)
          );
          const dxp = bx - ax, dyp = by - ay;
          const tc = sampleWallColor(
            sampler, levelRect(lvlArt2),
            ax - dxp * 0.4, ay - dyp * 0.4, bx + dxp * 0.4, by + dyp * 0.4
          );
          if (doorDim > 0) tc.multiplyScalar(1 - doorDim);
          const transom = new THREE.Mesh(
            new THREE.PlaneGeometry(len, storey.ft - doorTop),
            new THREE.MeshStandardMaterial({ color: tc, roughness: 0.92, metalness: 0.02, side: THREE.DoubleSide })
          );
          transom.position.set(
            (x1 + x2) / 2,
            storey.base + doorTop + (storey.ft - doorTop) / 2,
            (z1 + z2) / 2
          );
          transom.rotation.y = -Math.atan2(z2 - z1, x2 - x1);
          transom.renderOrder = 1;
          // The transom belongs to the WALL, not the door — right-clicking it
          // must not swing the door under it.
          doorGroup.add(transom);
        }

        // Upright, in the opening. The pivot sits at the hinge end and carries
        // the leaf, so closed / swung / slid are all the same object placed
        // differently rather than three different builds.
        const place = (leafLen, hingeX, hingeZ, yaw) => {
          const pivot = doorUpright(leafLen, fallback, tex, doorTop);
          pivot.userData.doorId = d.id;
          pivot.position.set(hingeX, storey.base, hingeZ);
          pivot.rotation.y = yaw;
          pivot.renderOrder = 2;
          doorGroup.add(pivot);
        };
        // The wall's own direction. Negated for the same reason `angle` is:
        // world Z grows the opposite way to screen Y.
        const along = -Math.atan2(z2 - z1, x2 - x1);
        const swing = (Math.PI / 180) * 78 * dirSign;
        if (!d.is_open) {
          place(len, x1, z1, along);
        } else if (motion === 'vanish') {
          // Nothing placed. The transom above stays — that is the wall over
          // the opening, not part of the door — so the doorway reads as a
          // gap in the wall rather than a hole to the ceiling.
        } else if (motion === 'slide') {
          // Slid into the wall alongside the opening.
          const ux = (x2 - x1) / len, uz = (z2 - z1) / len;
          place(len, x1 + ux * len * 0.9, z1 + uz * len * 0.9, along);
        } else if (motion === 'double') {
          place(len / 2, x1, z1, along + swing);
          place(len / 2, x2, z2, along + Math.PI - swing);
        } else {
          place(len, x1, z1, along + swing);
        }
      } else if (!d.is_open) {
        const panel = doorPlane(len, thick, tex, fallback);
        panel.position.set((x1 + x2) / 2, DOOR_Y, (z1 + z2) / 2);
        panel.rotation.z = angle; // after the -90 X rotation, Z is the in-plane spin
        doorGroup.add(panel);
      } else if (motion === 'vanish') {
        // Open and not drawn — the flat-map equivalent of the standing case.
      } else if (motion === 'slide') {
        const ux = (x2 - x1) / len, uz = (z2 - z1) / len;
        const travel = len * 0.85;
        const panel = doorPlane(len, thick, tex, fallback);
        panel.position.set((x1 + x2) / 2 + ux * travel, DOOR_Y, (z1 + z2) / 2 + uz * travel);
        panel.rotation.z = angle;
        doorGroup.add(panel);
      } else if (motion === 'double') {
        for (const side of [0, 1]) {
          const leaf = doorPlane(len / 2, thick, tex, fallback);
          const pivot = new THREE.Group();
          pivot.userData.doorId = d.id;
          pivot.position.set(side === 0 ? x1 : x2, DOOR_Y, side === 0 ? z1 : z2);
          const swing = (Math.PI / 180) * 75 * dirSign * (side === 0 ? 1 : -1);
          pivot.rotation.y = -(angle + (side === 0 ? swing : Math.PI + swing));
          leaf.position.set(len / 4, 0, 0);
          leaf.rotation.z = 0;
          pivot.add(leaf);
          doorGroup.add(pivot);
        }
      } else {
        // Swing: hinged at the first point, opening in the ground plane.
        const leaf = doorPlane(len, thick, tex, fallback);
        const pivot = new THREE.Group();
        pivot.userData.doorId = d.id;
        pivot.position.set(x1, DOOR_Y, z1);
        pivot.rotation.y = -(angle + (Math.PI / 180) * 75 * dirSign);
        leaf.position.set(len / 2, 0, 0);
        pivot.add(leaf);
        doorGroup.add(pivot);
      }
    }
    geomGroup.add(doorGroup);
    // Published so the right-click handler can pick doors out of it.
    st.doorGroup = doorGroup;

    // ── Terrain ───────────────────────────────────────────────────────────
    //
    // Scenery and markers, lying on the board where the flat map puts them.
    // Placement mirrors MapStage exactly: position is the piece's top-left in
    // grid units, size is in grid units too, and it rotates about its own
    // centre.
    //
    // Hidden pieces are filtered server-side before a player ever sees them,
    // so anything here is fair game; the GM's ghosted-until-revealed pieces
    // arrive flagged and are drawn faded rather than dropped.
    // ── Walls ─────────────────────────────────────────────────────────────
    //
    // Off by default, and that is still right for a single-storey battlemap:
    // the ground carries the map image, which already shows its walls, and
    // extruding boxes on top duplicates that artwork and fights with it.
    //
    // A MULTI-STOREY building is the case where it stops being right. Looking
    // at the first floor of an inn from outside, the ground floor's map image
    // is below you and there is nothing standing between the levels at all —
    // the storey reads as a rug hanging in the air. So the host turns this on
    // for maps that have levels.
    if (wallMode === 'solid') {
      // A sampler per storey: each floor's walls are drawn on that floor's own
      // image, so sampling them all against one picture would paint the upper
      // storeys in the ground floor's colours.
      const samplerFor = (li) => {
        const l = (levels || []).find((x) => x.level_index === li);
        return getWallSampler(l?.image_path ? `/uploads/${l.image_path}` : mapUrl,
          () => setWallTick((n) => n + 1));
      };
      // Grouped by storey, because each one stands at its own base height when
      // the stack is expanded. With a single floor showing, this is one group
      // and the base is zero.
      const byLevel = new Map();
      for (const w of (walls || [])) {
        const p = w.points || [];
        if (p.length < 4) continue;
        // Terrain and hull walls already have their own geometry in this view;
        // extruding them again would double every rock and bulkhead.
        if (w.terrain_id != null || w.ship_id != null) continue;
        const [x1, y1, x2, y2] = p.map(Number);
        // Only what this viewer can actually see — tested with segmentSeen, not
        // areaSeen.
        //
        // A wall IS the edge of the visibility polygon, so sampling its own
        // points asks whether a point on the boundary is inside the boundary,
        // which is a coin flip that lands differently depending on where the
        // viewer stands. That is the "visible from here, invisible a foot to
        // the left, nothing in the way" behaviour — and it is the same bug the
        // doors already had, with the same fix: sample along the segment and
        // pull each sample towards the viewer, off the boundary and into the
        // room they are standing in.
        if (!segmentSeen(x1, y1, x2, y2)) continue;
        const li = Number(w.level_index) || 0;
        if (!levelVisible(li)) continue;
        // Keyed by storey AND height. A wall that came off a tile carries
        // that tile's own height; everything else takes the storey's. One
        // bucket per storey would extrude a 6ft crawlspace and a 20ft hall
        // to the same ceiling because they happen to share a floor.
        const ownH = Number(w.height_ft) > 0 ? Number(w.height_ft) : 0;
        const key = `${li}:${ownH}`;
        if (!byLevel.has(key)) byLevel.set(key, { li, ownH, segs: [], cols: [], tileIds: [] });
        const bucket = byLevel.get(key);
        bucket.tileIds.push(w.tile_id ?? null);
        // The original map-pixel segment travels with the world-space one: the
        // indoor/outdoor test below works in map pixels, which is what the
        // walls and the flood-fill grid are both measured in.
        bucket.pxSegs = bucket.pxSegs || [];
        bucket.pxSegs.push([x1, y1, x2, y2]);
        bucket.segs.push([toWorldX(x1), toWorldZ(y1), toWorldX(x2), toWorldZ(y2)]);
        // Coloured from the TILE's own art when the wall came in with a tile —
        // a tile map's base image is a blank field, so sampling it made every
        // imported wall the same flat near-black.
        const lvlArt = (levels || []).find((x) => x.level_index === li);
        const art = artFor(w, lvlArt);
        const [sx1, sy1] = art.owner ? unrotateIntoTile(art.owner, x1, y1) : [x1, y1];
        const [sx2, sy2] = art.owner ? unrotateIntoTile(art.owner, x2, y2) : [x2, y2];
        bucket.cols.push(sampleWallColor(
          art.owner ? art.sampler : samplerFor(li), art.rect, sx1, sy1, sx2, sy2));
      }
      if (wallSampleNoSampler || wallSampleMisses) {
        console.warn('[3D walls] fell back to grey —',
          'unreadable image:', wallSampleNoSampler,
          '| transparent at the wall:', wallSampleMisses,
          '| levels:', (levels || []).map((l) => `${l.level_index}:${l.image_path || 'NO IMAGE'}`).join(' '));
      }
      wallSampleNoSampler = 0;
      wallSampleMisses = 0;
      // ── Seeing into rooms ────────────────────────────────────────────
      //
      // A wall standing between the camera and the room hides the room, and
      // orbiting past it only puts a different wall in the way.
      //
      // So a wall is hidden when the camera is OUTSIDE it — worked out per
      // wall from the middle of the tile it belongs to, which is where that
      // wall's room is. Only the near side of a room opens up; its far walls
      // stay, every other room stays, and a wall is either drawn or not drawn
      // rather than sliced through.
      //
      // It depends only on which side of one wall the camera is standing, so
      // it changes when you actually cross that wall's line and not before —
      // which is what stops it flickering as the camera drifts.
      //
      // Purely what is DRAWN. Line of sight comes from the wall segments in
      // JavaScript (wallsToSegments → visibility polygon) and never looks at
      // these meshes, so a wall hidden here blocks a character's vision
      // exactly as it did before.
      const cutaways = [];

      // Which side of each wall is indoors, for walls that came from an
      // IMPORTED map rather than a tile.
      //
      // A tile knows its own room, so those are answered exactly from the
      // tile's middle below. An imported floor plan does not: a wall there is
      // one line among thousands with nothing saying which side is a room. So
      // the whole floor is flood-filled from its edge — whatever the fill
      // cannot reach is indoors — and each wall then asks which of its sides
      // the fill reached.
      //
      // DOORS are rasterised as blockers alongside the walls, open or shut.
      // They are openings for sight, but for "is this enclosed?" they are the
      // fourth side of the room: leave them out and the fill pours through
      // every doorway and reports the entire building as outdoors.
      //
      // Built once per wall rebuild, not per frame.
      let interior = null;
      try {
        const px = [];
        for (const w of (walls || [])) {
          const q = w.points || [];
          if (q.length >= 4 && w.terrain_id == null && w.ship_id == null) {
            px.push([Number(q[0]), Number(q[1]), Number(q[2]), Number(q[3])]);
          }
        }
        for (const d of (doors || [])) {
          const q = d.points || [];
          if (q.length >= 4) px.push([Number(q[0]), Number(q[1]), Number(q[2]), Number(q[3])]);
        }
        if (px.length) {
          interior = buildInteriorMap(px, Number(mapWidth) || 1000, Number(mapHeight) || 1000,
            Math.max(8, gridSize / 2));
        }
      } catch { interior = null; }

      const tileMid = new Map();
      for (const t of (tiles || [])) {
        tileMid.set(t.id, {
          x: toWorldX(((Number(t.grid_col) || 0) + (Number(t.grid_w) || 2) / 2) * gridSize),
          z: toWorldZ(((Number(t.grid_row) || 0) + (Number(t.grid_h) || 2) / 2) * gridSize),
        });
      }

      for (const [, bucket] of byLevel) {
        const li = bucket.li;
        // The wall's own height when it has one — a tile says how tall its
        // walls stand — otherwise the storey's, so a tall hall and a
        // crawlspace are not the same wall.
        const lvl = (levels || []).find((l) => l.level_index === li);
        const wallH = bucket.ownH > 0
          ? bucket.ownH
          : (Number(lvl?.height_ft) > 0 ? Number(lvl.height_ft) : 10);
        const base = levelBaseY(levels, li);
        // From the floor of this storey to the floor of the next, exactly.
        //
        // This used to start at base + 0.3 — a small lift to keep the wall off
        // the floor — which put its TOP 0.3ft above the storey height. Stacked,
        // that is the wall poking up through the floorboards of the level
        // above. The bottom sits fractionally below the floor plane instead,
        // where it is hidden rather than visible.
        // Walls whose room we know are built one mesh each, so each can be
        // hidden on its own. Everything else stays merged into a single mesh,
        // as before — a hand-drawn map can carry thousands of segments and
        // has no room to reason about anyway.
        const solo = [];
        const merged = { segs: [], cols: [] };
        for (let i = 0; i < bucket.segs.length; i++) {
          const mid = bucket.tileIds ? tileMid.get(bucket.tileIds[i]) : null;
          if (mid) {
            solo.push({ seg: bucket.segs[i], col: bucket.cols[i], mid });
            continue;
          }
          // No tile — ask the flood fill which way is out. It answers null for
          // a partition between two rooms or a wall standing on its own, and
          // those stay merged and always drawn: hiding a wall we cannot place
          // is worse than leaving it up.
          const out = interior && bucket.pxSegs
            ? outwardFor(bucket.pxSegs[i], interior, Math.max(12, gridSize * 0.75))
            : null;
          if (out) {
            solo.push({
              seg: bucket.segs[i], col: bucket.cols[i],
              // No sign flip. toWorldZ is `(py - h/2) * ftPerPx`, so world Z
              // increases with map Y and a direction carries across unchanged.
              //
              // Worth stating because the door code nearby DOES negate — but
              // that is a rotation about Y, whose handedness is a separate
              // question from how a position or a direction maps. Flipping
              // here hid precisely the wrong walls on the north and south
              // faces and left the near ones standing.
              outward: { x: out.x, z: out.y },
            });
          } else {
            merged.segs.push(bucket.segs[i]);
            merged.cols.push(bucket.cols[i]);
          }
        }

        if (merged.segs.length) {
          const mesh = buildWallMesh(merged.segs, merged.cols, wallH, base);
          if (mesh) {
            mesh.renderOrder = 1;
            geomGroup.add(mesh);
          }
        }

        for (const one of solo) {
          const mesh = buildWallMesh([one.seg], [one.col], wallH, base);
          if (!mesh) continue;
          mesh.renderOrder = 1;
          const [ax, az, bx, bz] = one.seg;
          const mx = (ax + bx) / 2, mz = (az + bz) / 2;
          // The side the camera has to be on for this wall to stand between it
          // and the room — from the tile's own middle when there is one, or
          // from the flood fill when there is not.
          let ox, oz;
          if (one.outward) {
            ox = one.outward.x; oz = one.outward.z;
          } else {
            ox = mx - one.mid.x; oz = mz - one.mid.z;
            const len = Math.hypot(ox, oz) || 1;
            ox /= len; oz /= len;
          }
          mesh.userData.cutaway = { mx, mz, ox, oz };
          cutaways.push(mesh);
          geomGroup.add(mesh);
        }
      }

      // Handed to the animation loop, which decides each frame which of these
      // the camera is standing outside of. Assigned AFTER the loop that fills
      // it, for the obvious reason and one less obvious: `cutaways` is a
      // const, so touching it earlier in the same scope is a dead-zone error
      // rather than an empty list.
      //
      // Replaced rather than appended to: this pass rebuilds the walls, and
      // the loop must never hold a mesh from a torn-down build.
      st.wallCutaways = cutaways;

      // Floors for the storeys above ground, when the stack is expanded. The
      // ground's own plane is built by the floor pass and already carries level
      // 0's image; these are the ones that would otherwise be missing, leaving
      // upper walls standing on nothing.
      {
        for (const l of (levels || [])) {
          const li = Number(l.level_index) || 0;
          if (li === 0 || !l.image_path || !levelVisible(li)) continue;
          const w = (Number(l.width) || mapWidth) * ftPerPx;
          const h = (Number(l.height) || mapHeight) * ftPerPx;
          const plane = new THREE.Mesh(
            new THREE.PlaneGeometry(w, h),
            new THREE.MeshBasicMaterial({
              map: artTextureFor(l.image_path),
              transparent: true,
              // Lower storeys read as context for the one on top, so everything
              // below the active floor is dimmed rather than competing with it.
              opacity: li === activeLevel ? 1 : 0.72,
              // Empty parts of the storey are HOLES, not glass.
              //
              // A storey is mostly transparent — the building occupies some
              // shape and the rest is nothing. With blended transparency alone
              // those empty texels are still drawn, and still write depth, so
              // they occlude whatever is under them: looking straight down
              // through the open middle of a sails deck showed nothing below,
              // and only rotating far enough to stop looking THROUGH the deck
              // brought the lower floor back.
              //
              // alphaTest discards them outright, so a gap in a floor is a gap
              // you can see through, while the solid parts still hide what they
              // are standing over.
              alphaTest: 0.05,
              side: THREE.DoubleSide,
            })
          );
          plane.material.userData.sharedMap = true;
          plane.rotation.x = -Math.PI / 2;
          // Centred on the map, offset by the level's own alignment.
          plane.position.set(
            toWorldX((Number(l.offset_x) || 0) + (Number(l.width) || mapWidth) / 2),
            levelBaseY(levels, li) + 0.05,
            toWorldZ((Number(l.offset_y) || 0) + (Number(l.height) || mapHeight) / 2)
          );
          plane.renderOrder = 0;
          geomGroup.add(plane);
        }
      }
    }

    // ── Tile-map floors and walls ────────────────────────────────────────
    //
    // A tile map has no drawn floor of its own: the board is dark until a
    // card is laid. Each tile therefore brings its own floor panel, and a
    // wall on every edge the tile says is CLOSED — an open edge is a doorway
    // through to whatever gets laid beside it.
    //
    // Edges arrive already rotated (the server turns them with the tile when
    // it is placed), so this reads them literally: index 0 north, then east,
    // south, west.
    if ((tiles || []).length) {
      const tileGroup = new THREE.Group();
      const wallMat = new THREE.MeshLambertMaterial({ color: 0x5a5348 });
      for (const t of tiles) {
        const wSq = Number(t.grid_w) || 2;
        const hSq = Number(t.grid_h) || 2;
        const wFt = wSq * FT_PER_SQUARE;
        const hFt = hSq * FT_PER_SQUARE;
        // Centre of the tile, in map pixels then world feet.
        const cx = toWorldX((Number(t.grid_col) + wSq / 2) * gridSize);
        const cz = toWorldZ((Number(t.grid_row) + hSq / 2) * gridSize);

        // The tile's footprint in MAP PIXELS, which is the space the
        // visibility polygons are in.
        const wPx = wSq * gridSize;
        const hPx = hSq * gridSize;
        const cxPx = (Number(t.grid_col) || 0) * gridSize + wPx / 2;
        const cyPx = (Number(t.grid_row) || 0) * gridSize + hPx / 2;
        const theta = ((Number(t.rotation) || 0) * Math.PI) / 180;
        const cosT = Math.cos(theta), sinT = Math.sin(theta);

        const art = t.image_path;
        if (art) {
          // Just above the board, under everything that stands on it. Same
          // reasoning as TERRAIN_LIFT — see the note there.
          const floorY = BOARD_TOP_Y + 0.005;
          const floorMat = new THREE.MeshBasicMaterial({ map: artTextureFor(art), side: THREE.DoubleSide });
          floorMat.userData.sharedMap = true;

          if (!fogOfWar) {
            // No fog to answer to — one plane, exactly as before.
            const floor = new THREE.Mesh(new THREE.PlaneGeometry(wFt, hFt), floorMat);
            floor.rotation.x = -Math.PI / 2;
            floor.rotation.z = -theta;
            floor.position.set(cx, floorY, cz);
            floor.renderOrder = 0;
            floor.userData.tileId = t.id;
            tileGroup.add(floor);
          } else {
            // Fogged: the tile is cut to what this viewer can actually see.
            //
            // This used to be the same unconditional plane as above, which is
            // how a player on a tile map saw the whole dungeon. The drawn
            // ground beneath it IS clipped to the visibility polygon — but a
            // tile map's ground is a flat dark field and the tiles are the
            // only thing on it, so clipping the one and not the other hid
            // nothing at all. Only the tokens ever disappeared, because they
            // are culled separately.
            //
            // A rotated tile still covers an axis-aligned rectangle of the
            // board: rotation is quarter turns only, so the footprint is the
            // same box with its sides swapped on a quarter or three-quarter
            // turn.
            const halfX = Math.abs((wPx / 2) * cosT) + Math.abs((hPx / 2) * sinT);
            const halfY = Math.abs((wPx / 2) * sinT) + Math.abs((hPx / 2) * cosT);
            const rx0 = cxPx - halfX, ry0 = cyPx - halfY;
            const rx1 = cxPx + halfX, ry1 = cyPx + halfY;

            for (const poly of visPolys) {
              const patch = clipPolyToRect(poly, rx0, ry0, rx1, ry1);
              if (patch.length < 3) continue;

              // Built directly in world XZ, like the fogged ground patches —
              // see the note there for why this is not a rotated XY shape.
              const contour = patch.map((p) => new THREE.Vector2(toWorldX(p.x), toWorldZ(p.y)));
              const faces = THREE.ShapeUtils.triangulateShape(contour, []);
              if (!faces.length) continue;

              const positions = new Float32Array(contour.length * 3);
              const uv = new Float32Array(contour.length * 2);
              for (let i = 0; i < contour.length; i++) {
                positions[i * 3] = contour[i].x;
                positions[i * 3 + 1] = floorY;
                positions[i * 3 + 2] = contour[i].y; // the Vector2's y IS the world z
                // Back into the tile ART's own frame: undo the tile's rotation
                // about its centre, then normalise across the unrotated image
                // box. v is inverted for the same reason the ground's is —
                // map pixels count downward from the top.
                const dx = patch[i].x - cxPx;
                const dy = patch[i].y - cyPx;
                const lx = dx * cosT + dy * sinT;
                const ly = -dx * sinT + dy * cosT;
                uv[i * 2] = (lx + wPx / 2) / wPx;
                uv[i * 2 + 1] = 1 - (ly + hPx / 2) / hPx;
              }

              const geo = new THREE.BufferGeometry();
              geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
              geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
              geo.setIndex(faces.flat());
              geo.computeVertexNormals();

              const patchMesh = new THREE.Mesh(geo, floorMat);
              patchMesh.renderOrder = 0;
              patchMesh.userData.tileId = t.id;
              tileGroup.add(patchMesh);
            }
          }
        }

        // One wall per closed edge — but ONLY for a tile that has nothing
        // better. An imported Dungeondraft tile brings the room's real
        // walls, doorways and all, and those are built by the wall pass
        // below from the `walls` table. Ringing it with edge walls as well
        // would seal every opening the import just described.
        if (t.has_geometry) continue;
        // Inset by half its thickness so two tiles laid back to back meet
        // flush instead of overlapping.
        const th = 0.6;
        // The tile says how tall its walls stand.
        const tileWallFt = Number(t.wall_height_ft) > 0 ? Number(t.wall_height_ft) : 10;
        // Each edge carries the line it stands on in map pixels as well, so it
        // can be tested against the visibility polygons exactly as a drawn
        // wall is. Without it the walls of a room nobody has seen stood up in
        // full view, which is the layout of the dungeon given away.
        const edges = [
          { open: t.edge_n, len: wFt, dx: 0, dz: -hFt / 2, rot: 0,
            seg: [cxPx - wPx / 2, cyPx - hPx / 2, cxPx + wPx / 2, cyPx - hPx / 2] },
          { open: t.edge_e, len: hFt, dx: wFt / 2, dz: 0, rot: Math.PI / 2,
            seg: [cxPx + wPx / 2, cyPx - hPx / 2, cxPx + wPx / 2, cyPx + hPx / 2] },
          { open: t.edge_s, len: wFt, dx: 0, dz: hFt / 2, rot: 0,
            seg: [cxPx - wPx / 2, cyPx + hPx / 2, cxPx + wPx / 2, cyPx + hPx / 2] },
          { open: t.edge_w, len: hFt, dx: -wFt / 2, dz: 0, rot: Math.PI / 2,
            seg: [cxPx - wPx / 2, cyPx - hPx / 2, cxPx - wPx / 2, cyPx + hPx / 2] },
        ];
        for (const e of edges) {
          if (e.open) continue;
          if (!segmentSeen(e.seg[0], e.seg[1], e.seg[2], e.seg[3])) continue;
          const wall = new THREE.Mesh(
            new THREE.BoxGeometry(e.len, tileWallFt, th),
            wallMat
          );
          wall.position.set(cx + e.dx, BOARD_TOP_Y + tileWallFt / 2, cz + e.dz);
          wall.rotation.y = e.rot;
          wall.userData.tileId = t.id;
          tileGroup.add(wall);
        }
      }
      geomGroup.add(tileGroup);
    }

    const terrainGroup = new THREE.Group();
    // Gate horizons built by this pass, handed to the animation loop. Reset
    // rather than appended to: the loop must never hold a material from a
    // torn-down build, or it drives uniforms on something already disposed.
    const gateHorizons = [];
    // Cloud groups built by this pass, for the same reason and with the same
    // rule: reset every rebuild, so the animation loop can never hold a group
    // whose sprites have already been disposed.
    const cloudGroups = [];
    // Hazards, each with its own update function. Same reset rule as the two
    // above: the loop must never hold something from a torn-down build.
    const hazards = [];
    for (const t of (terrain || [])) {
      const art = t.lib_image_path || t.image_path;
      const modelPath = t.lib_model_path || null;
      // A model piece is legitimately artless in 3D — the mesh IS the artwork —
      // so only bail when there's nothing to draw at all.
      if (!art && !modelPath) continue;
      const wPx = Number(t.width) * gridSize;
      const hPx = Number(t.height) * gridSize;
      if (!(wPx > 0) || !(hPx > 0)) continue;
      const { ox: tox, oy: toy } = gridOffsets(mapWidth, mapHeight, gridSize);
      const cxPx = tox + Number(t.grid_col) * gridSize + wPx / 2;
      const cyPx = toy + Number(t.grid_row) * gridSize + hPx / 2;
      if (!areaSeen(circleSamples(cxPx, cyPx, Math.max(wPx, hPx) / 2))) continue;

      const ghost = t.hide_until_revealed && !t.is_revealed;
      const wx = toWorldX(cxPx);
      const wz = toWorldZ(cyPx);
      // Height off the board, in feet — the same unit as a token's elevation,
      // since one world unit is one foot. The flat map ignores it entirely: an
      // overhead view should still show the piece at its grid square.
      const elevFt = Number(t.elevation) || 0;
      const wFt = wPx * ftPerPx;
      const hFt = hPx * ftPerPx;

      // Everything the piece needs on top of its body: the name tag, and — when
      // it has been lifted off the board — the same ground marker and drop line
      // a raised token gets. Without those, a piece in the air is impossible to
      // place, because nothing on screen says which square it is over.
      // Nothing on the board marks a raised piece.
      //
      // A raised TOKEN gets a ground marker and a drop line, because a token is
      // small and which square it occupies is a tactical fact. Scenery is
      // neither: the pieces are large, several may be stacked at different
      // heights over the same ground, and the markers ended up cluttering the
      // board with rings nobody was reading. The flat map already shows every
      // piece at its grid square, and carries a ▲ft chip for the GM — that is
      // where the "which square, how high" question belongs.
      const finishPiece = (topFt) => {
        if (!terrainShowsLabel(t)) return;
        // A name the players don't get. The server has already stripped it from
        // their rows, so anything reaching here on a player's client is public;
        // the muted styling is purely so the GM can see which of their own
        // labels are secret.
        const tag = makeTerrainNameTag(terrainLabelText(t), { muted: !!t.hide_label_from_players });
        // Clear of the piece's own silhouette, with a constant gap so tags
        // don't creep closer to small pieces than to large ones.
        tag.position.set(wx, elevFt + topFt + 8, wz);
        terrainGroup.add(tag);
      };

      // ── An imported Blender mesh ───────────────────────────────────────────
      //
      // Loaded asynchronously and added when it arrives, which is why this
      // branch adds nothing synchronously. The load is cached per path, so the
      // wait only happens the first time a model appears in the session; every
      // rebuild after that resolves in a microtask and the pop-in is invisible.
      //
      // The group captured here is the one this build owns. By the time the
      // model resolves the geometry pass may have run again and thrown this
      // group away — `parent` is how we tell, and dropping the result on the
      // floor is correct: the newer build is already loading its own copy.
      if (modelPath && t.lib_three_d_shape === 'model') {
        const owner = terrainGroup;
        loadModel(modelPath).then((master) => {
          // Still the live build? The teardown pops groups off geomGroup's
          // child list rather than calling remove(), so `owner.parent` is left
          // dangling and can't be trusted — asking the parent whether it still
          // holds this group is what actually answers the question.
          if (!owner.parent || !owner.parent.children.includes(owner)) return;
          const fitted = fitModel(cloneModel(master), {
            widthFt: wFt,
            depthFt: hFt,
            extraScale: Number(t.lib_model_scale) > 0 ? Number(t.lib_model_scale) : 1,
          });
          fitted.position.set(wx, elevFt, wz);
          // The piece's own rotation on the flat map turns the mesh, so
          // spinning a building in the 2D view aims its door in 3D too.
          fitted.rotation.y = -((Number(t.rotation) || 0) * Math.PI) / 180;
          if (ghost) {
            // Ghosting a shared model can't touch its materials — they belong
            // to the cache and every other placement draws with them. Cloning
            // just the materials on this one instance is the only safe way to
            // fade it.
            fitted.traverse((o) => {
              if (!o.material) return;
              const mats = Array.isArray(o.material) ? o.material : [o.material];
              const faded = mats.map((m) => {
                const c = m.clone();
                c.transparent = true;
                c.opacity = 0.45;
                // The clone's map is still the cached texture; flag it so the
                // teardown leaves it alone.
                c.userData = { ...(c.userData || {}), sharedMap: true };
                return c;
              });
              o.material = Array.isArray(o.material) ? faded : faded[0];
            });
          }
          fitted.userData.terrainId = t.id;
          owner.add(fitted);
        }).catch(() => { /* a bad or missing .glb just doesn't draw */ });
        // Tag height from the footprint rather than the mesh: the tag is placed
        // now, and the model's true extent isn't known until it loads.
        finishPiece(Math.max(wFt, hFt) / 2);
        continue;
      }

      // ── A hazard ───────────────────────────────────────────────────────────
      //
      // Centred ON the plane like the planets and rocks: a black hole's
      // accretion disc, a debris field and a wormhole's mouth all lie in the
      // ecliptic, which is what the board is. Height lifts the whole thing.
      if (PIECE_BUILDERS[t.lib_three_d_shape]) {
        const r = (Math.min(wPx, hPx) / 2) * ftPerPx;
        const built = PIECE_BUILDERS[t.lib_three_d_shape](r, {
          ghost,
          seed: (Number(t.id) || 1) * 2654435761,
          // Which variation of the shape. Carried on the LIBRARY entry, like a
          // cloud's volume, because each form ships with overhead art drawn to
          // match it — a placement that could re-pose itself would leave the
          // flat map showing a limb the 3D view no longer grows.
          form: t.lib_piece_form || '',
        });
        built.group.position.set(wx, elevFt, wz);
        built.group.rotation.y = -((Number(t.rotation) || 0) * Math.PI) / 180;
        built.group.userData.terrainId = t.id;
        terrainGroup.add(built.group);
        hazards.push({ id: t.id, speed: animSpeedOf(t), update: built.update });
        // A hazard lies in the plane and its tag belongs at the footprint; a
        // vine stands up, and a name pinned at its ankles reads as belonging to
        // whatever is standing next to it. Builders that grow say how tall.
        finishPiece(built.top ?? r);
        continue;
      }

      // ── A wildspace gate ───────────────────────────────────────────────────
      //
      // Stands UPRIGHT and rests on the board rather than being centred on it.
      // The planets and rocks are deliberately cut in half by the ecliptic —
      // they are bodies IN the plane — but a ring bisected by the floor is just
      // a broken ring, so this one sits on top. Raise it with the piece's
      // Height to float it clear.
      if (t.lib_three_d_shape === 'gate') {
        const r = (Math.min(wPx, hPx) / 2) * ftPerPx;
        const gateActive = t.is_active !== false;

        // Work out what just CHANGED before building anything.
        //
        // The flip rebuilds this whole pass, so the new gate has no memory of
        // what it was a moment ago — the previous state lives on stateRef,
        // which survives rebuilds. Keyed by piece id.
        //
        // A gate seen for the FIRST time never plays either sequence: joining a
        // session, or panning one into view, must not replay something that
        // happened an hour ago. Only a genuine transition starts a clock, which
        // is also what makes these fire on the players' screens at the moment
        // the GM flips the switch and not before.
        //
        // Order matters here. This has to run BEFORE the gate is built, because
        // a gate that is closing must be built WITH the surface it is losing —
        // and the rebuild that starts the close is this very one.
        const wasActive = st.gateWasActive || (st.gateWasActive = new Map());
        const prev = wasActive.get(t.id);
        if (prev === false && gateActive) {
          (st.gateActivations || (st.gateActivations = new Map())).set(t.id, 0);
          st.gateShutdowns?.delete(t.id);
        }
        // …and the reverse. Reopening mid-close cancels the close, and closing
        // mid-open cancels the open: whichever the GM asked for last is the one
        // that plays.
        if (prev === true && !gateActive) {
          (st.gateShutdowns || (st.gateShutdowns = new Map())).set(t.id, 0);
          st.gateActivations?.delete(t.id);
        }
        wasActive.set(t.id, gateActive);

        // A close still in flight — from this rebuild or an earlier one — has
        // to be carried through, or the gate would pop dark mid-collapse.
        const closing = !gateActive && !!st.gateShutdowns?.has(t.id);
        const { group: gate, update: gateUpdate } = makeGateGroup(r, {
          ghost, active: gateActive, shuttingDown: closing,
        });

        gate.position.set(wx, elevFt + r, wz);
        gate.rotation.y = -((Number(t.rotation) || 0) * Math.PI) / 180;
        gate.renderOrder = 1;
        gate.userData.terrainId = t.id;
        terrainGroup.add(gate);
        // A dormant gate has no horizon and so nothing to drive — but one that
        // is mid-close does.
        if (gateUpdate) gateHorizons.push({ id: t.id, speed: animSpeedOf(t), update: gateUpdate });
        finishPiece(r * 2);
        continue;
      }

      // ── An obscuring cloud ─────────────────────────────────────────────────
      //
      // Translucent and non-solid: you see into it, it doesn't occlude the
      // depth buffer, and it never takes a click. Whether it BLOCKS anything
      // mechanically is a separate question the library entry already answers
      // through blocks_vision / blocks_light, which generate real walls; this
      // branch is only how the cloud looks.
      if (t.lib_three_d_shape === 'cloud') {
        const cloud = makeCloudGroup({
          widthFt: wFt,
          depthFt: hFt,
          seed: (Number(t.id) || 1) * 2654435761,
          opacity: ghost ? 0.45 : 1,
          // The placement's own colour, when the GM set one. A SpriteMaterial's
          // colour multiplies its map, and the puff texture is pure white, so
          // this lands as a straight tint with the soft falloff intact.
          tint: /^#[0-9a-f]{6}$/i.test(String(t.tint || '')) ? t.tint : undefined,
          form: t.lib_cloud_form || 'bank',
        });
        cloud.position.set(wx, elevFt, wz);
        cloud.rotation.y = -((Number(t.rotation) || 0) * Math.PI) / 180;
        cloud.userData.terrainId = t.id;
        cloud.userData.animSpeed = animSpeedOf(t);
        terrainGroup.add(cloud);
        cloudGroups.push(cloud);
        finishPiece(Math.max(wFt, hFt) * 0.35);
        continue;
      }

      // A shipped planet marker is a picture of a world. Flat on the board
      // that is exactly right; in 3D it's a rug printed to look like the thing
      // that should be standing on it — the same problem the suns had. So the
      // marker becomes an actual sphere, resting on the board where its disc
      // was, with a surface map generated to match the sprite's own palette.
      const planet = planetArtInfo(art);
      if (planet || t.lib_three_d_shape === 'sphere') {
        const r = (Math.min(wPx, hPx) / 2) * ftPerPx;
        const sphere = new THREE.Mesh(
          new THREE.SphereGeometry(r, 48, 32),
          makePlanetMaterial(
            // Shipped worlds get their generated surface; a GM's own art is
            // wrapped as-is.
            // Same rule as the rocks: a shipped world has a generated surface,
            // and anything else gets one generated in its own colours rather
            // than its flat art wrapped round a ball.
            planet ? planetTextureFor(planet.key, planet.seed) : rockTextureForArt(art, 'rocky', hashArtPath(art)),
            planet ? PLANET_PALETTES[planet.key] : null,
            ghost ? 0.45 : 1
          )
        );
        // Centred ON the plane, exactly like the system's star above — the
        // ecliptic cuts every body in half. Resting them on the board instead
        // (y = r) put each planet a full radius above the star it orbits,
        // which reads as the worlds hovering over the system rather than
        // lying in it. Elevation moves that centre, and nothing else.
        sphere.position.set(wx, elevFt, wz);
        // A tilt, so the poles aren't dead vertical and every world in a
        // system isn't the same upright ball. The marker's own rotation spins
        // it about that axis, so turning a planet on the flat map turns which
        // face is showing here.
        sphere.rotation.set(0.28, -((Number(t.rotation) || 0) * Math.PI) / 180, 0.16);
        sphere.renderOrder = 1;
        sphere.userData.terrainId = t.id;
        terrainGroup.add(sphere);
        finishPiece(r);
        continue;
      }

      // Solid, or a picture lying face-up on the floor?
      //
      // Driven by the library entry's own `three_d_shape`, not by the file's
      // name. Name matching only ever recognised the SHIPPED sets, so a GM's
      // own uploaded asteroid — the common case — stayed flat with no way to
      // say otherwise. The shipped rocks are still detected by name as a
      // fallback, for anything seeded before the column existed.
      const rock = asteroidArtInfo(art);
      const shape = t.lib_three_d_shape || (rock ? 'rock' : 'flat');
      if (shape === 'rock') {
        const r = (Math.min(wPx, hPx) / 2) * ftPerPx;
        // A shipped rock has a procedural surface built for it. Anything else
        // is wrapped in its OWN art — imperfect, since an uploaded picture has
        // its lighting painted in, but it keeps the GM's asteroid looking like
        // the asteroid they chose.
        const seed = rock ? rock.seed : hashArtPath(art);
        const key = rock ? rock.key : 'rocky';
        const mat = makePlanetMaterial(
          rock ? rockTextureFor(key, seed) : rockTextureForArt(art, key, seed),
          // Rocks have no atmosphere to catch the light at the limb; the
          // palette carries no `atmo`, so the rim term falls to zero.
          ROCK_PALETTES[key],
          ghost ? 0.45 : 1
        );
        const lump = new THREE.Mesh(rockGeometryFor(key, seed, r), mat);
        // Centred ON the plane, like the planets and the system's star: the
        // board is the ecliptic, and everything in it is cut in half by it.
        // Resting rocks on top instead made them sit proud of a plane that
        // every other body passes through.
        lump.position.set(wx, elevFt, wz);
        // A seeded tumble, so a field of the same rock isn't the same rock
        // repeated. The piece's own rotation spins it on top of that.
        const rr = (seed % 1000) / 1000;
        lump.rotation.set(
          rr * Math.PI * 2,
          -((Number(t.rotation) || 0) * Math.PI) / 180 + rr * 3.1,
          (1 - rr) * Math.PI * 2,
        );
        lump.renderOrder = 1;
        lump.userData.terrainId = t.id;
        terrainGroup.add(lump);
        finishPiece(r);
        continue;
      }

      const tex = artTextureFor(art);
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(wFt, hFt),
        new THREE.MeshBasicMaterial({
          map: tex,
          alphaTest: ghost ? 0 : 0.15,
          transparent: !!ghost,
          opacity: ghost ? 0.45 : 1,
          side: THREE.DoubleSide,
          // Depth bias rather than altitude. The piece now lies almost on the
          // board, which is far too close to win the depth test on its own —
          // it would z-fight the ground and disappear under the grid. Biased
          // toward the camera it keeps the ordering it had at 0.25 while
          // looking like it is lying on the floor.
          //
          // Weaker than the token marker's -5/-10, deliberately: a token's
          // base ring still draws over the scenery it is standing on.
          polygonOffset: true,
          polygonOffsetFactor: -3,
          polygonOffsetUnits: -6,
        })
      );
      mesh.material.userData.sharedMap = true;
      mesh.rotation.x = -Math.PI / 2;
      mesh.rotation.z = -((Number(t.rotation) || 0) * Math.PI) / 180;
      // Under the ships and doors, over the floor — scenery is what everything
      // else stands on. The ordering is now held by the material's polygon
      // offset rather than by altitude, so the piece can lie on the board
      // instead of hanging over it. See TERRAIN_LIFT.
      mesh.position.set(wx, TERRAIN_LIFT + elevFt, wz);
      mesh.renderOrder = 1;
      mesh.userData.terrainId = t.id;
      terrainGroup.add(mesh);
      // Flat art has no height of its own, so the tag sits a fixed step above
      // the plane rather than above a silhouette that isn't there.
      finishPiece(1);
    }
    geomGroup.add(terrainGroup);
    // ── Stairs ────────────────────────────────────────────────────────────
    //
    // A plate lying on the floor of the storey it belongs to, with a stack of
    // treads across it and an arrow saying where it goes — the same reading the
    // flat map gives. Without these, stairs existed in 3D only as an invisible
    // rule: a token dropped in the right square changed floor and nothing on
    // screen had suggested it would.
    const stairGroup = new THREE.Group();
    // GM only: these are authoring marks, and the host hands over the stair
    // action to nobody else.
    for (const l of (onStairUse ? (levels || []) : [])) {
      const li = Number(l.level_index) || 0;
      if (!levelVisible(li)) continue;
      const baseY = levelBaseY(levels, li);
      for (const tr of (l.transitions || [])) {
        const w = (Number(tr.w) || 1) * gridSize;
        const h = (Number(tr.h) || 1) * gridSize;
        const { ox: sox, oy: soy } = gridOffsets(mapWidth, mapHeight, gridSize);
        const cx = sox + (Number(tr.col) + (Number(tr.w) || 1) / 2) * gridSize;
        const cy = soy + (Number(tr.row) + (Number(tr.h) || 1) / 2) * gridSize;
        if (!areaSeen(circleSamples(cx, cy, Math.max(w, h) / 2))) continue;

        const plate = new THREE.Mesh(
          new THREE.PlaneGeometry(w * ftPerPx, h * ftPerPx),
          new THREE.MeshBasicMaterial({
            color: 0x38bdf8, transparent: true, opacity: 0.35, side: THREE.DoubleSide,
          })
        );
        plate.rotation.x = -Math.PI / 2;
        plate.position.set(toWorldX(cx), baseY + 0.4, toWorldZ(cy));
        plate.renderOrder = 3;
        // Tagged so a click can find which transition it was.
        plate.userData.stair = { levelIndex: li, transition: tr };
        stairGroup.add(plate);

        // Treads, running across the short axis so they read as steps whichever
        // way the flight was drawn.
        const along = w >= h;
        const lenFt = (along ? w : h) * ftPerPx;
        const widFt = (along ? h : w) * ftPerPx;
        const pts = [];
        for (let i = 1; i <= 4; i++) {
          const f = i / 5;
          const d = (f - 0.5) * lenFt;
          if (along) pts.push(new THREE.Vector3(toWorldX(cx) + d, baseY + 0.45, toWorldZ(cy) - widFt / 2),
                              new THREE.Vector3(toWorldX(cx) + d, baseY + 0.45, toWorldZ(cy) + widFt / 2));
          else pts.push(new THREE.Vector3(toWorldX(cx) - widFt / 2, baseY + 0.45, toWorldZ(cy) + d),
                        new THREE.Vector3(toWorldX(cx) + widFt / 2, baseY + 0.45, toWorldZ(cy) + d));
        }
        const treads = new THREE.LineSegments(
          new THREE.BufferGeometry().setFromPoints(pts),
          new THREE.LineBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.9, fog: false })
        );
        treads.renderOrder = 4;
        stairGroup.add(treads);

        const tag = makeTerrainNameTag(`▲${tr.to_level}`, {});
        tag.position.set(toWorldX(cx), baseY + 4, toWorldZ(cy));
        tag.scale.multiplyScalar(0.55);
        stairGroup.add(tag);
      }
    }
    geomGroup.add(stairGroup);
    st.stairGroup = stairGroup;

    // Published so the right-click handler can pick against it.
    st.terrainGroup = terrainGroup;
    st.gateHorizons = gateHorizons;
    st.cloudGroups = cloudGroups;
    st.hazards = hazards;
    // Drop clocks for pieces this build no longer draws — deleted, hidden, or
    // out of the viewer's sight. Without this the map grows one entry per
    // animated piece ever seen for the life of the view.
    if (st.animClocks) {
      const live = new Set([
        ...cloudGroups.map((c) => c.userData.terrainId),
        ...gateHorizons.map((g) => g.id),
        ...hazards.map((h) => h.id),
      ]);
      for (const key of [...st.animClocks.keys()]) {
        if (!live.has(key)) st.animClocks.delete(key);
      }
      for (const m of [st.gateActivations, st.gateShutdowns]) {
        if (!m) continue;
        for (const key of [...m.keys()]) {
          if (!live.has(key)) m.delete(key);
        }
      }
    }

    // ── Ships ─────────────────────────────────────────────────────────────
    //
    // The active deck, lying on the board exactly where the flat map puts it.
    // The pivot maths comes from utils/ships.js rather than a fresh copy: the
    // hull rotates about the REFERENCE deck's centre, and every place that
    // draws or projects a deck has to agree to the pixel or crew end up
    // standing off the edge of their own ship.
    const shipGroup = new THREE.Group();
    const shipLayout = shipDeckLayout(ships, {
      isGM: !!onShipDeckChange,
      picks: deckPicks,
      viewerToken: viewerTokenId != null
        ? (tokens || []).find((t) => t.id === viewerTokenId) || null
        : null,
    });
    for (const sh of (ships || [])) {
      const layout = shipLayout.get(sh.id);
      if (!layout || !layout.layers.length) continue;
      for (const { deck, rise, dim } of layout.layers) {
        if (!deck || !deck.image_path) continue;
        const ref = referenceDeck(sh.decks) || deck;
        const { px: pivX, py: pivY } = shipPivot({ ship: sh, refDeck: ref, gridSize, mapWidth, mapHeight });
        const { ox, oy } = gridOffsets(mapWidth, mapHeight, gridSize);

        const wPx = Number(deck.grid_cols) * gridSize;
        const hPx = Number(deck.grid_rows) * gridSize;
        if (!(wPx > 0) || !(hPx > 0)) continue;

        // Deck centre relative to the pivot, then turned with the hull.
        const cx = ox + (Number(sh.grid_col) + Number(deck.offset_col || 0)) * gridSize + wPx / 2 - pivX;
        const cy = oy + (Number(sh.grid_row) + Number(deck.offset_row || 0)) * gridSize + hPx / 2 - pivY;
        const rot = ((Number(sh.rotation) || 0) * Math.PI) / 180;
        const cos = Math.cos(rot), sin = Math.sin(rot);
        const mx = pivX + (cx * cos - cy * sin);
        const my = pivY + (cx * sin + cy * cos);

        // A hull is big; test several points so a ship half in view still draws.
        if (!areaSeen(circleSamples(mx, my, Math.max(wPx, hPx) / 2))) continue;

        const tex = artTextureFor(deck.image_path);
        const mesh = new THREE.Mesh(
          new THREE.PlaneGeometry(wPx * ftPerPx, hPx * ftPerPx),
          // alphaTest, like the doors: hulls are cut-outs, and a blended plane
          // loses its depth sort against the floor from some orbit angles.
          // `dim` darkens the levels below the one you are standing on — the
          // 3D stand-in for the flat map's depth blur. Kept as a colour
          // multiply rather than opacity so the plane stays opaque and keeps
          // its depth sort.
          new THREE.MeshBasicMaterial({
            map: tex,
            alphaTest: 0.2,
            side: THREE.DoubleSide,
            color: new THREE.Color(dim, dim, dim),
          })
        );
        mesh.material.userData.sharedMap = true;
        mesh.rotation.x = -Math.PI / 2;
        // In-plane spin is negated: after the -90° X rotation the plane's local
        // +Y points along world -Z, so map-space angles come out mirrored.
        mesh.rotation.z = -rot;
        mesh.position.set(toWorldX(mx), 0.3 + rise, toWorldZ(my));
        mesh.renderOrder = 1;   // over the floor, under the doors and tokens
        // The hull this plane belongs to, and the point it turns about, so a
        // drag on any level of a ship steers the whole ship.
        mesh.userData = {
          shipId: sh.id,
          kind: 'deck',
          deckIndex: Number(deck.deck_index),
          pivot: new THREE.Vector3(toWorldX(pivX), 0, toWorldZ(pivY)),
          // Stairs, ladders and hatches on this level, plus the plane's own
          // size, so a drop can be turned back into a deck square.
          transitions: Array.isArray(deck.transitions) ? deck.transitions : [],
          planeW: wPx * ftPerPx,
          planeH: hPx * ftPerPx,
        };
        shipGroup.add(mesh);

        // The deck's own lattice, exactly as the flat map draws it: one line
        // per square across the deck's full rectangle, turning with the hull.
        // The board's grid is down at y=0.15 and a deck sits above it — on a
        // raised level especially, there was nothing to judge a move by.
        //
        // Added as a CHILD of the deck plane so it inherits the hull's rotation
        // and position for free. After the plane's -90° X rotation its local +Z
        // is world +Y, so a local z nudge lifts the lines just clear of the art
        // without a second copy of the placement maths.
        //
        // Masked to the artwork — see makeDeckGridMaterial. Deck art is a
        // cut-out, so a lattice across the full rectangle drew most of itself
        // over empty space around the hull.
        const dgrid = new THREE.Mesh(
          new THREE.PlaneGeometry(wPx * ftPerPx, hPx * ftPerPx),
          makeDeckGridMaterial(tex, Number(deck.grid_cols), Number(deck.grid_rows))
        );
        dgrid.position.z = 0.05;
        // Over the window mask, like the board's own grid.
        dgrid.renderOrder = 2.6;
        mesh.add(dgrid);
      }

      // Air envelope. Sized from the union of every deck box, exactly as the
      // flat map does it — air_bubble_ft is the reach BEYOND the hull, which is
      // what makes it oval on an oblong ship rather than a circle.
      const bubbleFt = Number(sh.air_bubble_ft) || 0;
      if (bubbleFt > 0) {
        const { ox: bx0, oy: by0 } = gridOffsets(mapWidth, mapHeight, gridSize);
        const bRef = referenceDeck(sh.decks) || layout.layers[0]?.deck;
        if (bRef) {
          const { px: bpX, py: bpY } = shipPivot({ ship: sh, refDeck: bRef, gridSize, mapWidth, mapHeight });
          const boxes = (sh.decks || []).map((d) => {
            const bw = Number(d.grid_cols) * gridSize;
            const bh = Number(d.grid_rows) * gridSize;
            const bx = bx0 + (Number(sh.grid_col) + Number(d.offset_col || 0)) * gridSize - bpX;
            const by = by0 + (Number(sh.grid_row) + Number(d.offset_row || 0)) * gridSize - bpY;
            return { x1: bx, y1: by, x2: bx + bw, y2: by + bh };
          });
          if (boxes.length) {
            const x1 = Math.min(...boxes.map((b) => b.x1));
            const x2 = Math.max(...boxes.map((b) => b.x2));
            const y1 = Math.min(...boxes.map((b) => b.y1));
            const y2 = Math.max(...boxes.map((b) => b.y2));
            // Centre and half-extents in parent space, i.e. about the pivot,
            // then turned with the hull like the decks are.
            const ccx = (x1 + x2) / 2, ccy = (y1 + y2) / 2;
            const brot = ((Number(sh.rotation) || 0) * Math.PI) / 180;
            const bcos = Math.cos(brot), bsin = Math.sin(brot);
            const bmx = bpX + (ccx * bcos - ccy * bsin);
            const bmy = bpY + (ccx * bsin + ccy * bcos);

            const rx = ((x2 - x1) / 2) * ftPerPx + bubbleFt;
            const rz = ((y2 - y1) / 2) * ftPerPx + bubbleFt;
            // Vertical reach comes from the ship's OWN height — the sum of its
            // decks' headroom — never from the layout.
            //
            // It was sized off the drawn stack, so expanding the hull to see
            // every level made the envelope grow with it. Expanding is a way of
            // LOOKING at a ship, local to one viewer; the air it carries is a
            // property of the ship and has to be the same however it is drawn,
            // and the same for everyone at the table.
            const hullFt = (sh.decks || [])
              .filter((d) => !d.is_sails)
              .reduce((sum, d) => {
                const h = Number(d.height_ft);
                return sum + (Number.isFinite(h) && h > 0 ? h : DEFAULT_DECK_HEIGHT_FT);
              }, 0);
            const ry = bubbleFt + hullFt / 2;

            // Vertically, the envelope centres on the middle of the hull AS
            // DRAWN — not on the board.
            //
            // Pinned to the board it was right only while the ship was drawn as
            // a single plane lying on it. Expand the stack and the decks climb
            // away, leaving the hull sitting in the top of a sphere whose
            // equator was still down at the floor: the ship was inside its air,
            // but visibly not in the middle of it.
            //
            // Only the CENTRE follows the drawing. The size deliberately does
            // not — see the hullFt comment above: how a viewer chooses to look
            // at a ship is local to them, and the air it carries is a property
            // of the ship, the same for everyone at the table.
            const drawnRise = layout.layers.reduce((m, l) => Math.max(m, l.rise || 0), 0);
            const bubbleY = 0.3 + drawnRise / 2;

            const bubble = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), makeBubbleMaterial());
            bubble.scale.set(rx, ry, rz);
            bubble.position.set(toWorldX(bmx), bubbleY, toWorldZ(bmy));
            bubble.rotation.y = -brot;
            // After the tokens, so its rim tints them rather than being hidden;
            // it writes no depth, so it hides nothing.
            bubble.renderOrder = 12;
            shipGroup.add(bubble);

            // A faint ellipse on the BOARD, at the envelope's full reach.
            //
            // Deliberately left at floor level even though the sphere above it
            // now centres higher: this is the reach read off the grid — the
            // same ellipse, at the same radii, that the flat map draws — not a
            // slice through the sphere at whatever height it happens to sit.
            const ringGeo = new THREE.RingGeometry(0.985, 1, 96);
            const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({
              color: 0x7dd3fc, transparent: true, opacity: 0.35,
              side: THREE.DoubleSide, depthWrite: false, fog: false,
            }));
            ring.rotation.x = -Math.PI / 2;
            ring.rotation.z = -brot;
            ring.scale.set(rx, rz, 1);
            ring.position.set(toWorldX(bmx), 0.32, toWorldZ(bmy));
            ring.renderOrder = 3;
            shipGroup.add(ring);
          }
        }
      }

      // Steering handle, for the one hull this viewer may drive.
      //
      // The flat map puts a rotate grip on the selection chrome; in 3D there is
      // no chrome, so the grip is a marker floating off the bow. Dragging the
      // hull itself moves it, dragging this turns it — the same two gestures
      // the flat map offers, which is what the helm readout tells the player
      // to expect.
      const mayTurn = onShipRotateRef.current
        && (isGMRef.current || pilotableShipIdRef.current === sh.id);
      if (mayTurn) {
        const ref = referenceDeck(sh.decks) || layout.layers[0]?.deck;
        if (ref) {
          const { px: pvX, py: pvY } = shipPivot({ ship: sh, refDeck: ref, gridSize, mapWidth, mapHeight });
          const rot = ((Number(sh.rotation) || 0) * Math.PI) / 180;
          // Out past the bow, so the grip never sits on top of the deck art
          // the player is trying to drag.
          const reach = (Math.max(Number(ref.grid_cols), Number(ref.grid_rows)) * gridSize * 0.75) * ftPerPx;
          const hx = toWorldX(pvX) + Math.cos(rot - Math.PI / 2) * reach;
          const hz = toWorldZ(pvY) + Math.sin(rot - Math.PI / 2) * reach;
          const topRise = layout.layers.reduce((m, l) => Math.max(m, l.rise), 0);
          const handle = new THREE.Mesh(
            new THREE.SphereGeometry(FT_PER_SQUARE * 0.45, 20, 14),
            new THREE.MeshBasicMaterial({ color: 0xa78bfa })
          );
          handle.position.set(hx, 0.3 + topRise + FT_PER_SQUARE * 0.5, hz);
          handle.renderOrder = 11;
          handle.userData = {
            shipHandle: sh.id,
            pivot: new THREE.Vector3(toWorldX(pvX), 0, toWorldZ(pvY)),
          };
          shipGroup.add(handle);
        }
      }
    }
    st.shipGroup = shipGroup;
    geomGroup.add(shipGroup);

    // ── Spell templates ───────────────────────────────────────────────────
    //
    // Resolved through the flat map's own templateShapeProps, so a cone is the
    // same 60 degrees and a line the same 1ft width in both views — no second
    // interpretation of the geometry to drift out of step.
    //
    // Drawn as glowing shapes lying on the floor. They're additive and
    // unlit, which is what makes a fireball read as fire rather than as a
    // coloured rug, and they pulse in the render loop so the effect is alive
    // the way the animated 2D templates are.
    const templateGroup = new THREE.Group();
    let tIn = 0, tDrawn = 0, tCulled = 0;
    const tKinds = [];
    const TPL_Y = 1.0; // clear of the floor and the door slabs

    // Normal blending, not additive.
    //
    // The diagnostic confirmed both templates were being BUILT and still
    // couldn't be seen: additive blending only brightens what's beneath it, so
    // at 38% over the pale dock map it added almost nothing. Normal blending
    // at a higher opacity paints its own colour regardless of the floor.
    //
    // An outline is added too, because a filled translucent disc seen almost
    // edge-on from a low camera can still disappear, whereas a bright rim
    // reads at any angle.
    const tplMesh = (geo, colorStr) => {
      const col = new THREE.Color(colorStr || '#a78bfa');
      const group = new THREE.Group();

      const fill = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
        color: col,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
        side: THREE.DoubleSide,
      }));
      fill.rotation.x = -Math.PI / 2;
      fill.renderOrder = 3;
      group.add(fill);

      // Outline from the same geometry's edges.
      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(geo),
        new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.95, depthWrite: false })
      );
      edges.rotation.x = -Math.PI / 2;
      edges.position.y = 0.05;
      edges.renderOrder = 4;
      group.add(edges);

      return group;
    };

    const overlays = pluginRegistries?.templateOverlays;
    for (const t of (spellTemplates || [])) {
      tIn++;
      const element = overlays?.get?.(t.id)?.kind || null;
      const style = ELEMENT_STYLE[element] || null;
      const ts = templateShapeProps(t, undefined, undefined, undefined, gridSize);
      // Report the raw type when the resolver rejects it — that distinguishes
      // "no templates on this map" from "templates arrived in a shape this
      // code doesn't recognise".
      if (!ts) { tKinds.push(`${t.type || '?'}:rejected`); continue; }

      // Fog test before anything is built.
      let samples;
      if (ts.kind === 'circle') samples = circleSamples(ts.x, ts.y, ts.radius);
      else if (ts.kind === 'rect') samples = [
        [ts.x + ts.width / 2, ts.y + ts.height / 2],
        [ts.x, ts.y], [ts.x + ts.width, ts.y],
        [ts.x, ts.y + ts.height], [ts.x + ts.width, ts.y + ts.height],
      ];
      else if (ts.kind === 'wedge') {
        samples = [[ts.x, ts.y]];
        const half = (ts.angle * Math.PI) / 180;
        const start = (ts.rotation * Math.PI) / 180;
        for (let i = 0; i <= 6; i++) {
          const a = start + (i / 6) * half;
          for (const f of [0.5, 0.95]) {
            samples.push([ts.x + Math.cos(a) * ts.radius * f, ts.y + Math.sin(a) * ts.radius * f]);
          }
        }
      } else {
        samples = [[ts.ax, ts.ay], [ts.bx, ts.by], [(ts.ax + ts.bx) / 2, (ts.ay + ts.by) / 2]];
      }
      if (!areaSeen(samples)) { tCulled++; continue; }

      // A template anchored to a deck rides that deck's height.
      //
      // The server keeps its `points` projected into map pixels, so it already
      // lands over the right part of the hull — but drawn at the board's own
      // height it would be UNDER the ship, visible through the deck at best and
      // hidden entirely with the stack expanded. The rise comes from the same
      // layout the ship pass uses, so a template and the planks it is painted
      // on can never disagree about which level they are.
      let tplY = TPL_Y;
      if (t.ship) {
        const layers = shipLayout.get(t.ship.shipId)?.layers || [];
        const layer = layers.find((l) => (l.deck?.deck_index ?? 0) === t.ship.deckIndex);
        // Deck not drawn for this viewer — they are on another level of the
        // same hull. The crew on that deck are culled for exactly this reason;
        // an effect burning on a floor you cannot see should go with them.
        if (!layer && layers.length) { tCulled++; continue; }
        tplY = TPL_Y + (layer?.rise || 0);
      }

      tDrawn++;
      tKinds.push(element ? `${ts.kind}/${element}` : ts.kind);
      const tplColor = style?.color || t.color;

      if (ts.kind === 'circle') {
        const m = tplMesh(new THREE.CircleGeometry(ts.radius * ftPerPx, 48), tplColor);
        m.position.set(toWorldX(ts.x), tplY, toWorldZ(ts.y));
        m.userData = { style, spread: ts.radius * ftPerPx };
        templateGroup.add(m);
      } else if (ts.kind === 'rect') {
        const m = tplMesh(new THREE.PlaneGeometry(ts.width * ftPerPx, ts.height * ftPerPx), tplColor);
        m.position.set(
          toWorldX(ts.x + ts.width / 2), tplY, toWorldZ(ts.y + ts.height / 2)
        );
        m.userData = { style, spread: Math.max(ts.width, ts.height) * ftPerPx * 0.5 };
        templateGroup.add(m);
      } else if (ts.kind === 'wedge') {
        // Konva's Wedge sweeps clockwise from `rotation`; the same arc built
        // here, then flipped into world Z like everything else.
        const shape = new THREE.Shape();
        shape.moveTo(0, 0);
        const half = (ts.angle * Math.PI) / 180;
        const start = (ts.rotation * Math.PI) / 180;
        const r = ts.radius * ftPerPx;
        for (let i = 0; i <= 24; i++) {
          const a = start + (i / 24) * half;
          shape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        shape.lineTo(0, 0);
        const geo = new THREE.ShapeGeometry(shape);
        // Shapes are built in XY; scaling Y by -1 turns "screen down" into
        // "world +Z" so the cone points where it points on the flat map.
        geo.scale(1, -1, 1);
        const m = tplMesh(geo, tplColor);
        m.position.set(toWorldX(ts.x), tplY, toWorldZ(ts.y));
        m.userData = { style, spread: ts.radius * ftPerPx * 0.7 };
        templateGroup.add(m);
      } else if (ts.kind === 'line') {
        const lenFt = ts.length * ftPerPx;
        const wFt = Math.max(0.8, (ts.widthPx || 8) * ftPerPx);
        const m = tplMesh(new THREE.PlaneGeometry(lenFt, wFt), tplColor);
        m.position.set(
          toWorldX((ts.ax + ts.bx) / 2), tplY, toWorldZ((ts.ay + ts.by) / 2)
        );
        // The group's children are already tipped flat, so the in-plane spin
        // is a Y rotation on the group. Rotating Z here would stand the
        // template up on its edge.
        m.rotation.y = (ts.angleDeg * Math.PI) / 180;
        m.userData = { style, spread: lenFt * 0.4 };
        templateGroup.add(m);
      }
    }
    // ── Elemental motes ───────────────────────────────────────────────────
    //
    // The plugin's own effects are Konva drawings, so they can't be reused
    // here. Rather than leave elemental templates looking identical to plain
    // ones, each gets drifting particles in its element's character: embers
    // climbing out of fire, snow settling over ice, sparks flickering through
    // lightning. Not the same artwork as the flat map — an honest 3D
    // equivalent of it.
    for (const child of templateGroup.children) {
      const st2 = child.userData?.style;
      if (!st2 || !st2.motes) continue;
      const spread = child.userData.spread || 10;
      const count = st2.motes;
      const pos = new Float32Array(count * 3);
      const seed = new Float32Array(count);
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * spread;
        pos[i * 3] = Math.cos(a) * r;
        pos[i * 3 + 1] = Math.random() * spread * 0.5;
        pos[i * 3 + 2] = Math.sin(a) * r;
        seed[i] = Math.random();
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const points = new THREE.Points(geo, new THREE.PointsMaterial({
        color: new THREE.Color(st2.color),
        // Sized against the template's own footprint, with a floor so a
        // small template's motes don't vanish.
        size: Math.max(1.6, spread * 0.16),
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }));
      points.userData = { motes: true, style: st2, seed, spread, base: pos.slice(0) };
      points.renderOrder = 5;
      child.add(points);
    }

    // ── Darkness, heavy fog and water ─────────────────────────────────────
    //
    // One table, three zone types, each drawn to read the way it does on the
    // flat map: darkness swallows the floor, heavy fog greys it out, water
    // tints it and moves. Circles and polygons both occur, so both are built.
    const zoneGroup = new THREE.Group();
    // The heavy-fog volumes, so the render loop can drive their clock and the
    // viewer's clearing without walking the whole scene each frame.
    const fogVolumes = [];
    const ZONE_STYLE = {
      darkness:    { color: 0x05070f, opacity: 0.92, y: 0.7, animated: false },
      // Opacity is low because the fog itself is now a VOLUME of puffs above
      // this disc — see the heavy-fog branch below. What is left here is the
      // footprint, so the zone's edge stays readable against the grid.
      'heavy-fog': { color: 0x9aa4b2, opacity: 0.16, y: 0.7, animated: true },
      // Water rests a little higher than the other zones so its crests have
      // somewhere to go without meeting the floor.
      water:       { color: 0x2f7fd0, opacity: 0.45, y: 0.8, animated: true },
    };

    for (const dz of (magicalDarkness || [])) {
      const kind = dz.zone_type === 'heavy-fog' ? 'heavy-fog'
                 : dz.zone_type === 'water' ? 'water'
                 : 'darkness';
      const zs = ZONE_STYLE[kind];

      // Same fog rule as templates: a zone the player can't see isn't drawn.
      // Darkness is the sharpest case — a black disc revealing where the
      // wizard dropped it, through a wall, is exactly what fog exists to stop.
      {
        let zSamples;
        if (dz.shape === 'polygon' && Array.isArray(dz.poly_points) && dz.poly_points.length >= 6) {
          zSamples = [];
          for (let i = 0; i + 1 < dz.poly_points.length; i += 2) {
            zSamples.push([dz.poly_points[i], dz.poly_points[i + 1]]);
          }
          const n = zSamples.length || 1;
          const cx = zSamples.reduce((a, p) => a + p[0], 0) / n;
          const cy = zSamples.reduce((a, p) => a + p[1], 0) / n;
          zSamples.push([cx, cy]);
        } else {
          zSamples = circleSamples(Number(dz.x), Number(dz.y), Math.max(1, Number(dz.radius) || 0));
        }
        if (!areaSeen(zSamples)) continue;
      }

      let mesh = null;

      // ── Water gets a real surface ──────────────────────────────────────
      //
      // Not an opacity pulse and not a drifting disc — a subdivided sheet
      // whose vertices rise and fall, so waves travel across it in place and
      // the water has actual height. Two sine trains at different angles and
      // speeds cross to stop it looking like a single rolling ripple.
      //
      // The sheet spans the zone's bounding box and is faded out per-vertex
      // beyond the zone's edge, which is how a square mesh ends up circular.
      if (kind === 'water') {
        const rPx = Number(dz.radius) || 0;
        const poly = (dz.shape === 'polygon' && Array.isArray(dz.poly_points) && dz.poly_points.length >= 6)
          ? dz.poly_points : null;

        let cxPx, cyPx, halfPx;
        if (poly) {
          let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
          for (let i = 0; i + 1 < poly.length; i += 2) {
            minX = Math.min(minX, poly[i]); maxX = Math.max(maxX, poly[i]);
            minY = Math.min(minY, poly[i + 1]); maxY = Math.max(maxY, poly[i + 1]);
          }
          cxPx = (minX + maxX) / 2; cyPx = (minY + maxY) / 2;
          halfPx = Math.max(maxX - minX, maxY - minY) / 2;
        } else {
          if (!(rPx > 0)) continue;
          cxPx = Number(dz.x); cyPx = Number(dz.y); halfPx = rPx;
        }

        const halfFt = halfPx * ftPerPx;
        const SEG = 28;
        const geo = new THREE.PlaneGeometry(halfFt * 2, halfFt * 2, SEG, SEG);
        const pos = geo.attributes.position;
        const colors = new Float32Array(pos.count * 4);
        const inPolyPx = (px, py) => {
          if (!poly) return Math.hypot(px - cxPx, py - cyPx) <= rPx;
          let inside = false;
          const n = poly.length / 2;
          for (let i = 0, j = n - 1; i < n; j = i++) {
            const xi = poly[i * 2], yi = poly[i * 2 + 1], xj = poly[j * 2], yj = poly[j * 2 + 1];
            if (((yi > py) !== (yj > py)) && (px < ((xj - xi) * (py - yi)) / (yj - yi + 1e-9) + xi)) inside = !inside;
          }
          return inside;
        };
        for (let i = 0; i < pos.count; i++) {
          // Plane local x/y map to world x/z once it's laid flat.
          const lx = pos.getX(i), ly = pos.getY(i);
          const pxMap = cxPx + lx / ftPerPx;
          const pyMap = cyPx - ly / ftPerPx;
          const inside = inPolyPx(pxMap, pyMap);
          // Soften the last stretch so the edge isn't a hard cut.
          const edge = poly ? 1 : Math.max(0, Math.min(1, (rPx - Math.hypot(pxMap - cxPx, pyMap - cyPx)) / (rPx * 0.18)));
          colors[i * 4] = 0.18; colors[i * 4 + 1] = 0.50; colors[i * 4 + 2] = 0.82;
          colors[i * 4 + 3] = inside ? 0.55 * edge : 0;
        }
        geo.setAttribute('color', new THREE.BufferAttribute(colors, 4));
        mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({
          vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide,
        }));
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(toWorldX(cxPx), zs.y, toWorldZ(cyPx));
        mesh.renderOrder = 6;
        mesh.userData = {
          zone: 'water', animated: true, baseOpacity: zs.opacity,
          waves: true, base: Float32Array.from(pos.array), amp: Math.max(0.25, halfFt * 0.02),
        };
        zoneGroup.add(mesh);
        continue;
      }

      // ── Heavy fog gets a real volume ───────────────────────────────────
      //
      // A translucent disc lying on the floor is a MARKER for fog, not fog.
      // The flat map can only draw a marker — it has no third axis to put
      // anything in — but in 3D the bank itself is drawable, and a room the
      // table is being shown in 3D should look like it has fog standing in it.
      //
      // Built from the same puff system the terrain cloud banks use, in the
      // `ground` form: low, wide, flat-bottomed puffs that roll sideways
      // rather than billow up, which is what separates fog from smoke. The
      // puffs write no depth, so the fog blends with itself and never occludes
      // a token in the depth buffer — you see figures dimly THROUGH it, which
      // is the behaviour the flat map's translucency stands in for.
      //
      // The flat disc is kept underneath at a much lower opacity: it is how
      // the zone's exact extent stays readable against the grid, which is the
      // one thing a volume of soft puffs cannot show you.
      if (kind === 'heavy-fog') {
        const fpoly = (dz.shape === 'polygon' && Array.isArray(dz.poly_points) && dz.poly_points.length >= 6)
          ? dz.poly_points : null;

        // Build the footprint as a Shape in the extruder's own 2D space.
        //
        // ExtrudeGeometry pushes along +Z, and the mesh is then laid flat with
        // a -90 degree turn about X, which sends +Z to +Y (up) and shape-Y to
        // world -Z. So shape-Y is the NEGATED world z — get that wrong and the
        // bank comes out mirrored about the map's horizontal axis.
        const shape = new THREE.Shape();
        let cxPx, cyPx, halfFt;
        if (fpoly) {
          let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
          for (let i = 0; i + 1 < fpoly.length; i += 2) {
            minX = Math.min(minX, fpoly[i]); maxX = Math.max(maxX, fpoly[i]);
            minY = Math.min(minY, fpoly[i + 1]); maxY = Math.max(maxY, fpoly[i + 1]);
          }
          cxPx = (minX + maxX) / 2; cyPx = (minY + maxY) / 2;
          halfFt = (Math.max(maxX - minX, maxY - minY) / 2) * ftPerPx;
          for (let i = 0; i + 1 < fpoly.length; i += 2) {
            const lx = (fpoly[i] - cxPx) * ftPerPx;
            const ly = -(fpoly[i + 1] - cyPx) * ftPerPx;
            if (i === 0) shape.moveTo(lx, ly); else shape.lineTo(lx, ly);
          }
          shape.closePath();
        } else {
          const rPx = Number(dz.radius) || 0;
          if (!(rPx > 0)) continue;
          cxPx = Number(dz.x); cyPx = Number(dz.y);
          halfFt = rPx * ftPerPx;
          shape.absarc(0, 0, halfFt, 0, Math.PI * 2, false);
        }

        // How tall the bank stands.
        //
        // The GM's own figure wins when they have set one (right-click the
        // bank). Otherwise it is derived — Fog Cloud stands twenty feet and
        // that reads well on a small bank, but on a big one a twenty-foot slab
        // looks like a puddle seen from above, so it grows with the footprint.
        //
        // And on a building it is capped to the storey it stands in. Derived
        // from the footprint alone, a wide bank on a ground floor grew to
        // sixty-odd feet and pushed straight up through the floor above it,
        // which is nonsense to look at and hides the storey you are working
        // on. A little headroom is left under the ceiling so the ragged top
        // has somewhere to break up.
        // The storey THIS BANK stands on, not the one currently being viewed —
        // otherwise a bank's height would change as the GM flicked between
        // floors, which is a property of the fog changing with who is looking
        // at it.
        const storeyFt = (levels || []).length > 1
          ? levelHeightFt((levels || []).find(
              (l) => (Number(l.level_index) || 0) === (Number(dz.level_index) || 0),
            ) || null)
          : 0;
        const setH = dz.height_ft == null ? null : Number(dz.height_ft);
        let heightFt;
        if (setH != null && Number.isFinite(setH) && setH > 0) {
          heightFt = setH;
        } else {
          heightFt = Math.max(15, Math.min(65, halfFt * 0.55));
          if (storeyFt > 0) heightFt = Math.min(heightFt, Math.max(6, storeyFt * 0.85));
        }

        const geo = new THREE.ExtrudeGeometry(shape, {
          depth: heightFt,
          bevelEnabled: false,
          curveSegments: 48,
        });
        const fogMat = makeFogVolumeMaterial(0xb9c2d4);
        fogMat.uniforms.uHeight.value = heightFt;
        // The storey the bank was drawn on. Without this every zone stood on
        // the ground however high up the GM laid it.
        const zoneBaseY = levelBaseFt(levels || [], Number(dz.level_index) || 0);
        const fogMesh = new THREE.Mesh(geo, fogMat);
        fogMesh.rotation.x = -Math.PI / 2;
        fogMesh.position.set(toWorldX(cxPx), zoneBaseY + 0.35, toWorldZ(cyPx));
        // Over the board and the zone disc, under the labels and pings.
        fogMesh.renderOrder = 13;
        fogMesh.userData.fogVolume = true;
        fogMesh.userData.baseDensity = 0.97;
        fogMesh.userData.zoneId = dz.id;
        zoneGroup.add(fogMesh);
        fogVolumes.push(fogMesh);

        // A second, slightly larger shell at a fraction of the density.
        //
        // The volume above fills the zone exactly, which leaves its outline a
        // clean vertical edge against the board — correct, and too crisp for
        // fog. This one stands a little proud of it and barely registers on
        // its own, so the silhouette feathers out instead of ending on a line.
        const haloGeo = new THREE.ExtrudeGeometry(shape, {
          depth: heightFt * 1.12,
          bevelEnabled: false,
          curveSegments: 48,
        });
        const haloMat = makeFogVolumeMaterial(0xc4ccdc);
        haloMat.uniforms.uHeight.value = heightFt * 1.12;
        haloMat.uniforms.uDensity.value = 0.30;
        const halo = new THREE.Mesh(haloGeo, haloMat);
        halo.rotation.x = -Math.PI / 2;
        halo.position.set(toWorldX(cxPx), zoneBaseY + 0.3, toWorldZ(cyPx));
        // Scaled about its own centre in the footprint plane only — local X/Y
        // is the footprint, local Z is height and must not grow with it.
        halo.scale.set(1.07, 1.07, 1);
        halo.renderOrder = 12;
        halo.userData.fogVolume = true;
        halo.userData.baseDensity = 0.30;
        halo.userData.zoneId = dz.id;
        zoneGroup.add(halo);
        fogVolumes.push(halo);
      }

      if (dz.shape === 'polygon' && Array.isArray(dz.poly_points) && dz.poly_points.length >= 6) {
        const contour = [];
        for (let i = 0; i + 1 < dz.poly_points.length; i += 2) {
          contour.push(new THREE.Vector2(toWorldX(dz.poly_points[i]), toWorldZ(dz.poly_points[i + 1])));
        }
        const faces = THREE.ShapeUtils.triangulateShape(contour, []);
        if (!faces.length) continue;
        // Lifted to the zone's own storey, like the volume above it.
        const discY = levelBaseFt(levels || [], Number(dz.level_index) || 0) + zs.y;
        const positions = new Float32Array(contour.length * 3);
        for (let i = 0; i < contour.length; i++) {
          positions[i * 3] = contour[i].x;
          positions[i * 3 + 1] = discY;
          positions[i * 3 + 2] = contour[i].y;
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geo.setIndex(faces.flat());
        mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
          color: zs.color, transparent: true, opacity: zs.opacity, depthWrite: false, side: THREE.DoubleSide,
        }));
      } else {
        const r = Math.max(1, Number(dz.radius) || 0) * ftPerPx;
        if (!(r > 0)) continue;
        mesh = new THREE.Mesh(
          new THREE.CircleGeometry(r, 44),
          new THREE.MeshBasicMaterial({
            color: zs.color, transparent: true, opacity: zs.opacity, depthWrite: false, side: THREE.DoubleSide,
          })
        );
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(
          toWorldX(Number(dz.x)),
          levelBaseFt(levels || [], Number(dz.level_index) || 0) + zs.y,
          toWorldZ(Number(dz.y)),
        );
      }
      if (!mesh) continue;
      mesh.renderOrder = kind === 'darkness' ? 8 : 6;
      // Fog rolls and water moves; darkness just sits there.
      mesh.userData = {
        zone: kind, animated: zs.animated, baseOpacity: zs.opacity,
        basePos: mesh.position.clone(),
      };
      zoneGroup.add(mesh);
    }
    geomGroup.add(zoneGroup);
    st.zoneGroup = zoneGroup;
    st.fogVolumes = fogVolumes;

    geomGroup.add(templateGroup);
    st.templateGroup = templateGroup;

    st.visPolys = visPolys;
    st.windowDimAt = windowDimAt;
    // Nudge the token pass so culling matches the new fog.
    setGeomTick((n) => n + 1);
  }, [
    ready,
    // Signatures, not array identities: these props are new objects on every
    // render, and depending on them directly would rebuild constantly.
    JSON.stringify((walls || []).map((w) => [w.id ?? w.points, w.height_ft])),
    JSON.stringify((doors || []).map((d) => [d.id, d.is_open])),
    JSON.stringify((ships || []).map((sh) => [
      sh.id, sh.grid_col, sh.grid_row, sh.rotation, sh.active_deck, sh.air_bubble_ft,
      // Deck headroom feeds the expanded stack's spacing.
      (sh.decks || []).map((d) => [d.deck_index, d.height_ft]),
    ])),
    // Which hulls are expanded into all their levels, and whose eyes this is.
    deckPicksKey,
    viewerTokenId,
    // WHICH DECK the viewer is on, not just who they are.
    //
    // Which levels of a hull get drawn depends on the deck this viewer's token
    // is standing on, and that changes every time they take the stairs. With
    // only the token's id here the deck stack was never rebuilt: the token pass
    // moved the token down a level while the decks stayed drawn for the level
    // it had left, which is exactly the "decks above drawn as if they were on
    // this floor" glitch.
    (() => {
      const vt = viewerTokenId != null ? (tokens || []).find((t) => t.id === viewerTokenId) : null;
      return vt ? `${vt.ship_id ?? ''}:${vt.deck_index ?? 0}` : '';
    })(),
    // The steering grip is built into this pass, so taking or losing the helm
    // has to rebuild it.
    pilotableShipId,
    !!onShipRotate,
    JSON.stringify((terrain || []).map((t) => [
      t.id, t.grid_col, t.grid_row, t.width, t.height, t.rotation, t.is_revealed, t.lib_image_path || t.image_path,
      t.lib_three_d_shape,
      // Height off the board, and the name tag's three inputs. Without these
      // the pass wouldn't rebuild when a piece is raised or renamed, and the
      // change wouldn't show until something else happened to move.
      t.elevation, t.label, t.lib_name, t.show_label, t.hide_label_from_players, t.tint, t.anim_speed, t.is_active,
      // An imported mesh and its fit multiplier.
      t.lib_model_path, t.lib_model_scale, t.lib_cloud_form,
    ])),
    // The ship anchor is part of the signature: detaching a template doesn't
    // move it, so without this the pass wouldn't rebuild and a detached
    // template would stay drawn at its old deck height.
    // Laid tiles. A signature, not the array: a tile map gains a piece every
    // time the GM plays a card, and without this the board would keep drawing
    // the dungeon as it stood when the map loaded.
    JSON.stringify((tiles || []).map((t) => [
      t.id, t.grid_col, t.grid_row, t.grid_w, t.grid_h, t.rotation, t.image_path,
      t.edge_n, t.edge_e, t.edge_s, t.edge_w, t.has_geometry, t.wall_height_ft,
    ])),
    JSON.stringify((spellTemplates || []).map((t) => [
      t.id, t.type, t.color, t.ship?.shipId ?? '', t.ship?.deckIndex ?? '', ...(t.points || []),
    ])),
    JSON.stringify((magicalDarkness || []).map((d) => [d.id, d.zone_type, d.x, d.y, d.radius, d.height_ft, d.level_index, (d.poly_points || []).length])),
    JSON.stringify((visionOrigins || []).map((o) => [Math.round(o.x), Math.round(o.y)])),
    // Lights, and the tokens that carry one. Without these the light layer was
    // built once from whatever had loaded by then — which for a session
    // joining is nothing — and never rebuilt, so the board stayed dark.
    // Filtered to light-carrying tokens so ordinary movement doesn't rebuild
    // the floor.
    JSON.stringify((lights || []).map((l) => [
      l.id, l.x, l.y, l.bright_radius, l.dim_radius, l.color, l.direction, l.spread_angle, l.flicker,
    ])),
    JSON.stringify((tokens || [])
      .filter((t) => Number(t.token_light_bright) > 0 || Number(t.token_light_dim) > 0)
      .map((t) => [
        t.id, t.grid_col, t.grid_row,
        t.token_light_bright, t.token_light_dim, t.token_light_color, t.token_light_flicker,
      ])),
    fogOfWar, wallMode, mapWidth, mapHeight,
    // Walls: the art they take their colour from, the storey they belong to and
    // its height, and the tick that fires once the sampler has read the image.
    mapUrl, wallTick, activeLevel, shownLevelsKey, gridColor, !!onStairUse,
    JSON.stringify((levels || []).map((l) => [l.level_index, l.height_ft, l.offset_x, l.offset_y, l.width, l.height])),
  ]);

  // ── Tokens ────────────────────────────────────────────────────────────
  //
  // Split in two, because rebuilding a sprite is expensive and moving one is not.
  //
  // This pass builds them: art, size, rings, bars, labels, the drop line, which
  // storey and which deck. It runs when a token CHANGES — new art, new hit points,
  // a condition, a different floor — and it disposes and recreates every sprite in
  // the group when it does.
  //
  // It used to run on any change at all, including position. A patrolling guard
  // therefore tore down and rebuilt every token in the scene twice a second, which
  // is both why patrols looked bad in 3D and a good deal of pointless work for a
  // creature that had only taken a step. The pass below moves them instead.
  const tokenStructureKey = useMemo(() => (tokens || []).map((t) => [
    t.id, t.image_path, t.creature_image, t.creature_standee, t.creature_display_image,
    t.size, t.size_squares, t.elevation, t.is_dead, t.is_hidden, t.is_flying,
    t.name, t.current_hp, t.max_hp, t.temp_hp, t.level_index, t.ship_id, t.deck_index,
    t.token_light_bright, t.token_light_dim, t.hide_name_from_players, t.hide_hp_from_players,
    Array.isArray(t.conditions) ? t.conditions.join(',') : '',
    Array.isArray(t.auras) ? JSON.stringify(t.auras) : '',
  ].join(':')).join('|'), [tokens]);

  // Where everything stands. Changes on every step of a patrol and every drag.
  const tokenPositionKey = useMemo(
    () => (tokens || []).map((t) => `${t.id}:${t.grid_col}:${t.grid_row}`).join('|'),
    [tokens]
  );

  // Bumped when a move needs the full rebuild after all — see the position pass.
  const [tokenRebuildTick, setTokenRebuildTick] = useState(0);

  useEffect(() => {
    const st = stateRef.current;
    if (!st) return;
    const { tokenGroup, ftPerPx } = st;

    while (tokenGroup.children.length) {
      const c = tokenGroup.children.pop();
      c.traverse?.((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) {
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          // A shared map belongs to the art cache and outlives this build.
          mats.forEach((m) => { if (m.map && !m.userData?.sharedMap) m.map.dispose(); m.dispose(); });
        }
      });
    }

    // Standard ray-crossing test, run in MAP pixel space so it compares
    // directly against the visibility polygons the LOS code produced.
    const inPoly = (px, py, poly) => {
      let inside = false;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const xi = poly[i].x, yi = poly[i].y, xj = poly[j].x, yj = poly[j].y;
        if (((yi > py) !== (yj > py)) && (px < ((xj - xi) * (py - yi)) / (yj - yi + 1e-9) + xi)) inside = !inside;
      }
      return inside;
    };
    const polys = st.visPolys || [];
    const visibleAt = (px, py) => {
      if (!fogOfWar || !polys.length) return !fogOfWar;
      return polys.some((poly) => inPoly(px, py, poly));
    };

    // Crew ride their own deck. Without this, expanding a hull lifts the decks
    // and leaves everyone standing on the sea floor underneath them.
    const tokenLayout = shipDeckLayout(ships, {
      isGM: !!onShipDeckChange,
      picks: deckPicks,
      viewerToken: viewerTokenId != null
        ? (tokens || []).find((t) => t.id === viewerTokenId) || null
        : null,
    });
    // Whether this viewer is the GM, by the same test the rest of the file
    // uses: the handlers only DMView passes.
    const isGMView = !!onShipDeckChange;

    // Heavy fog obscures what is standing IN it.
    //
    // The flat map has always enforced this: a token inside a fog zone is not
    // directly visible, and drops to a blip instead (see the inFog test in
    // MapStage's blip pass). The 3D view drew the fog and then showed every
    // figure inside it in full, so switching view handed the players sight the
    // fog was there to deny them.
    //
    // The GM is exempt, like everywhere else here — they need to see what they
    // put in the fog.
    const fogZones3D = (magicalDarkness || []).filter((dz) => dz.zone_type === 'heavy-fog');
    const inFogZone = (px, py) => {
      for (const fz of fogZones3D) {
        const poly = Array.isArray(fz.poly_points) ? fz.poly_points : null;
        if (poly && poly.length >= 6) {
          let inside = false;
          for (let a = 0, b = poly.length - 2; a < poly.length; b = a, a += 2) {
            const xi = poly[a], yi = poly[a + 1], xj = poly[b], yj = poly[b + 1];
            if (((yi > py) !== (yj > py))
                && (px < ((xj - xi) * (py - yi)) / ((yj - yi) || 1e-9) + xi)) inside = !inside;
          }
          if (inside) return true;
          continue;
        }
        const r = Number(fz.radius) || 0;
        if (r <= 0) continue;
        const dx = px - Number(fz.x), dy = py - Number(fz.y);
        if (dx * dx + dy * dy <= r * r) return true;
      }
      return false;
    };
    // Where this viewer is standing, so a creature inside the same five feet
    // of fog is still visible. Five, matching the pocket the fog itself opens
    // around the viewer — what you can see and who you can see have to agree,
    // or a figure stands lit in a clearing you are told is empty.
    const viewerTok = viewerTokenId != null
      ? (tokens || []).find((t) => t.id === viewerTokenId) || null
      : null;
    const FOG_REACH_PX = (5 / (Number(gridScale) || 5)) * gridSize;

    // Whether a token is drawn at all, in ONE place.
    //
    // This was three separate `continue`s inside the loop below, which was fine
    // while this pass was the only thing that asked. The position pass has to ask
    // the same question — a guard who walks behind a wall has to vanish — and it
    // must not answer it by a second copy of a four-part rule.
    const shownAt = (t, px, py) => {
      // Hidden from the players is hidden from the PLAYERS; the GM still sees
      // their own ambushers.
      if (t.is_hidden && !isGMView) return false;
      if (fogOfWar && !visibleAt(px, py)) return false;
      // Past the fade, a room seen through a window is simply dark.
      if ((st.windowDimAt ? st.windowDimAt(px, py) : 0) >= 0.92) return false;
      if (!isGMView && fogZones3D.length && t.id !== viewerTokenId && inFogZone(px, py)) {
        if (!viewerTok) return false;
        const vfp = tokenFootprint(viewerTok).gridW;
        const { ox: vgx, oy: vgy } = gridOffsets(mapWidth, mapHeight, gridSize);
        const vx = vgx + Number(viewerTok.grid_col) * gridSize + (vfp * gridSize) / 2;
        const vy = vgy + Number(viewerTok.grid_row) * gridSize + (vfp * gridSize) / 2;
        return Math.hypot(px - vx, py - vy) <= FOG_REACH_PX;
      }
      return true;
    };
    st.tokenShownAt = shownAt;

    for (const t of tokens) {
      // A token hidden from the players is hidden from the PLAYERS.
      //
      // This dropped it for everyone, the GM included — so a GM who staged an
      // ambush could not see their own ambushers in 3D, and had to switch to
      // the flat map to move them. The 2D stage has always drawn them for the
      // GM at reduced opacity with an eye badge (see isHiddenFromPlayers in
      // MapStage); this is the same rule, minus the badge, which does not read
      // at a table-scale camera anyway.
      const hiddenFromPlayers = !!t.is_hidden;
      if (hiddenFromPlayers && !isGMView) continue;
      // A token the player cannot see must not be drawn. The 2D stage reduces
      // these to blips or nothing at all; here they're simply absent.
      // Where the token's CENTRE is, in map pixels.
      //
      // Two corrections against what this used to compute, and the flat map has
      // always had both (see the cx/cy in MapStage's token layer):
      //
      //   * half the FOOTPRINT, not half a square. grid_col/row is the piece's
      //     top-left, so a Large creature's centre is one square in, not half.
      //     Drawn from the first square's centre, a 2x2 sat a half-square up
      //     and to the left of the squares it actually occupies.
      //   * the grid offset. A map whose pixel size isn't a whole number of
      //     squares centres its lattice, and the 3D view already applies that
      //     to the grid itself and to terrain — but never did to tokens, so
      //     they sat off the squares they were standing on by up to half a
      //     square on any map that didn't divide evenly.
      const { ox: tgx, oy: tgy } = gridOffsets(mapWidth, mapHeight, gridSize);
      const footSq = tokenFootprint(t).gridW;
      const footPx = footSq * gridSize;
      const pxCentre = tgx + Number(t.grid_col) * gridSize + footPx / 2;
      const pyCentre = tgy + Number(t.grid_row) * gridSize + footPx / 2;
      if (!shownAt(t, pxCentre, pyCentre)) continue;
      // Line of sight through a window isn't the same as being able to make
      // something out. Past the fade the room is dark and shownAt has already
      // dropped the token; inside it, it dims like the ground it stands on.
      const winDim = st.windowDimAt ? st.windowDimAt(pxCentre, pyCentre) : 0;
      // Footprint through tokenFootprint, the same helper the flat map, the
      // marquee, the vision origins and the deck maths all use.
      //
      // Reading `size_squares` alone was wrong: that field is an OVERRIDE, set
      // only for creatures whose size category is a floor rather than a fixed
      // footprint (a resized tarrasque). The ordinary case — an Ogre marked
      // Large, a Demodragon marked Huge — leaves it null and carries the size
      // in `size`, so every one of them was drawn as a single square here while
      // the flat map correctly gave them four or nine.
      const sizeFt = Math.max(FT_PER_SQUARE, footSq * FT_PER_SQUARE);
      // The creature's own height, when it has one. `sizeFt` stays the
      // FOOTPRINT — it still sizes the base ring and the grid square the token
      // occupies — so setting a height changes how tall the figure looks
      // without pretending a halfling takes up less floor than a human.
      const heightFt = tokenHeightFt(t);
      // The same centre the fog test above used, in world feet. Computing it
      // twice by two different rules is how the two drifted apart.
      const x = (pxCentre - mapWidth / 2) * ftPerPx;
      const z = (pyCentre - mapHeight / 2) * ftPerPx;
      // Elevation is measured from whatever floor the token is standing on —
      // the board, or its deck when the hull is expanded.
      // Crew ride the level they are on, and are absent from levels this
      // viewer isn't being shown — the same rule the flat map applies, where a
      // token on a deck that isn't drawn drops out entirely rather than being
      // laid on top of the one that is.
      const tRises = t.ship_id != null ? tokenLayout.get(t.ship_id)?.rises : null;
      if (tRises && !tRises.has(Number(t.deck_index) || 0)) continue;
      const deckY = tRises ? (tRises.get(Number(t.deck_index) || 0) || 0) : 0;
      // With the stack expanded a token stands on ITS OWN storey, not on the
      // ground under all of them. Collapsed, the host has already filtered to
      // one floor and everything sits at zero.
      // Crew on a storey that isn't drawn are culled, exactly as crew on an
      // undrawn deck are — a token floating where its floor should be is worse
      // than one you have to change level to see.
      const tLevel = Number(t.level_index) || 0;
      // Culled by the storey the token is LEVEL WITH, which for a flier is not
      // the storey it took off from: a dragon hovering outside a third-floor
      // window belongs to that floor's airspace, and hiding it because its feet
      // last touched the ground floor made half the fight invisible.
      //
      // The HEIGHT below still measures from the floor it is standing on —
      // elevation is relative to that floor, so resolving the same feet twice
      // would launch it into orbit.
      if ((levels || []).length && !levelIsShown(occupiedLevel(levels, t))) continue;
      const levelY = levelBaseY(levels, tLevel);
      // The height of the floor this token is STANDING on — its deck, its
      // storey, or both. Everything below measures against this rather than
      // against the ground: a creature on the first floor is not thirty feet in
      // the air, it is standing on the first floor, and comparing it to the
      // ground gave it the airborne treatment — a drop line and a marker left
      // behind downstairs.
      const floorY = deckY + levelY;
      // Where that floor is actually DRAWN: a ship's deck plane sits
      // DECK_PLANE_Y above its rise, and the board at BOARD_TOP_Y. The
      // ground marker measures from this, not from floorY, or its clearance
      // silently depends on whether the token happens to be aboard a hull.
      const surfaceY = floorY + (tRises ? DECK_PLANE_Y : BOARD_TOP_Y);
      // The marker's height. Declared here rather than beside the marker
      // itself because the token sprite is built first and carries it in
      // userData for the drag preview.
      const discY = surfaceY + DISC_LIFT;
      const elev = (Number(t.elevation) || 0) + floorY;

      // The token itself: a billboard, so art always faces the camera however
      // the board is spun. Flat discs would vanish edge-on.
      // Standing art wins here when the creature has it. It is 3D-only by
      // design: the flat map keeps using the top-down face regardless, which
      // is why this is a separate column rather than a second guess at
      // image_path.
      //
      // `standee` also decides how the art is treated below — a figure is shown
      // whole, a face is cropped to a disc.
      const standee = t.creature_standee || null;
      const art = standee || t.image_path || t.creature_image;
      // Shared by both kinds of token art.
      const matOpts = {
        color: new THREE.Color(t.is_dead ? 0x777777 : 0xffffff).multiplyScalar(1 - winDim),
        // Hidden pieces read as hidden: the same 0.55 the flat map fades them
        // to. Only the GM ever gets here with one.
        ...(hiddenFromPlayers ? { transparent: true, opacity: 0.55 } : {}),
        // alphaTest, NOT blended transparency.
        //
        // depthWrite:false meant tokens never wrote to the depth buffer, so
        // nothing could be hidden behind them: templates, water and darkness
        // all painted straight over a token as the camera came round. With
        // alphaTest the sprite writes real depth and occludes properly, while
        // the transparent corners of the circular art still cut away.
        alphaTest: 0.4,
        depthWrite: true,
      };

      // Down on the floor: the prone condition, zero hit points, or dead. A
      // downed piece is laid flat rather than stood up — the one state that
      // has to be readable from orbit without reading a label. Shared with the
      // flat map so the two views cannot disagree about who is standing.
      const prone = isTokenDown(t);

      // A standee is a MESH; a token face stays a Sprite — unless it is prone.
      //
      // THREE.Sprite billboards on every axis, so it always squarely faces the
      // camera — right for a disc seen from above, wrong for a figure: tilt the
      // camera down and the quad tilts with it, the standee leans back, and its
      // feet come off the floor. A plane rotated only about world Y turns to
      // face the camera while staying vertical, which is what a cardboard
      // standee on a table actually does.
      //
      // A Sprite also cannot be laid down: billboarding is the one thing it
      // does unconditionally, so a prone face token would keep standing to
      // attention however it was rotated. Prone therefore forces the mesh path
      // for both kinds of art, and the piece is pitched flat below.
      const asMesh = !!standee || prone;
      const mat = asMesh
        ? new THREE.MeshBasicMaterial({
            ...matOpts,
            side: THREE.DoubleSide,
            // A body on the floor has to beat the floor. Stronger than the
            // terrain's -3/-6 and the ground marker's -5/-10, so the figure
            // wins against both at any camera angle rather than only from
            // overhead. Standing pieces need none of this — they are well
            // clear of the ground already.
            ...(prone ? {
              polygonOffset: true,
              polygonOffsetFactor: -8,
              polygonOffsetUnits: -16,
            } : {}),
          })
        : new THREE.SpriteMaterial(matOpts);
      // Start as the plain disc so a token is visible immediately, then swap
      // in the cropped art once it loads.
      mat.map = fallbackTokenTexture(t.is_player ? '#4f8fff' : '#c0504d');
      const sprite = asMesh
        ? new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat)
        : new THREE.Sprite(mat);
      // A plain token face is a square billboard; a set height shrinks or grows
      // it as a whole, keeping it circular. Standees re-do both of these from
      // the artwork's aspect once it loads.
      const faceFt = heightFt ?? sizeFt;
      sprite.scale.set(faceFt, faceFt, 1);
      if (prone) {
        // Lying ON the surface, not floating half its height above it — but
        // clear of the floor, the terrain on it and its own base ring. See
        // PRONE_LIFT for why height alone was not enough.
        sprite.position.set(x, surfaceY + PRONE_LIFT, z);
        // YXZ so the two rotations do not fight: yaw is applied about world Y
        // and the pitch after it, about the piece's own X. With the default
        // XYZ the per-frame yaw would tilt the already-flattened plane out of
        // the floor again. The pitch itself turns the plane's normal from
        // +Z (facing the camera) to +Y (facing the sky), which is what lying
        // on the ground means.
        sprite.rotation.order = 'YXZ';
        sprite.rotation.x = -Math.PI / 2;
      } else {
        sprite.position.set(x, elev + faceFt / 2, z);
      }
      // Tagged so a raycast can tell what it hit, and so the ground marker and
      // drop line can be dragged along with their token.
      // Above every ground effect (see the layer comment at the top).
      sprite.renderOrder = 10;
      sprite.userData = {
        tokenId: t.id, kind: 'sprite', deckY: floorY, discY,
        standee: !!standee, prone,
        // Where this sprite stands, in map pixels, so a token that only MOVES can
        // be slid across without rebuilding the scene. See the position pass
        // below for why that matters.
        px: pxCentre, py: pyCentre, col: Number(t.grid_col), row: Number(t.grid_row),
      };
      tokenGroup.add(sprite);
      if (art) {
        tokenTextureFor(art, !!standee).catch((err) => {
          // Unhandled before this, so a token that could not load its picture
          // simply stayed a coloured disc with nothing said anywhere. The disc
          // is the right fallback; the silence was not.
          console.warn('[3D] token art failed, keeping the plain disc:', art, err?.message || err);
          return null;
        }).then((built) => {
          if (!built) return;
          // The scene may have been rebuilt while this was loading. Assigning
          // to a sprite that is no longer in the scene is how the old version
          // stranded textures nothing could free.
          //
          // Asking the PARENT whether it still holds this sprite, not just
          // whether the sprite has a parent: the token teardown pops children
          // off the array rather than calling remove(), so `sprite.parent` is
          // left dangling at a group that has already let go of it. The
          // terrain model loader nearby guards the same way for the same
          // reason — `!sprite.parent` alone would never once be true.
          if (!sprite.parent || !sprite.parent.children.includes(sprite)) return;
          if (standee) {
            // Shown whole, with its own proportions. Circle-cropping a figure
            // would cut its head and feet off, and forcing it square would
            // squash it — the two things the disc treatment does that are
            // right for a face and wrong for a standee.
            //
            // The aspect comes from the TEXTURE, not the source image: the two
            // must agree exactly or the art stretches, and the texture is the
            // one that was actually rasterised.
            mat.map = built.tex;
            // With a height set, that IS the figure's height and the width
            // follows the artwork so it keeps its proportions. Without one,
            // the width is the footprint and the height follows the artwork —
            // the original behaviour.
            let h, w;
            if (heightFt != null) {
              h = heightFt;
              w = h * built.aspect;
            } else {
              w = sizeFt;
              h = sizeFt / built.aspect;
              // A sanity ceiling, applied by scaling the WHOLE quad rather than
              // clamping the aspect. Clamping the aspect was the stretch bug in
              // miniature: it makes the quad disagree with the texture, which
              // is exactly what squashes the art. Only for derived heights — an
              // explicit one is the user's decision and is already bounded.
              const maxH = sizeFt * 3;
              if (h > maxH) { const k = maxH / h; w *= k; h *= k; }
            }
            sprite.scale.set(w, h, 1);
            // Standing ON the board rather than centred on it: a figure's feet
            // belong at its square, not halfway up its own height.
            //
            // Not for a prone figure, which is already lying on the surface —
            // this runs asynchronously, after the art loads, so without the
            // guard a downed standee would sit flat for a moment and then be
            // hoisted back up to half its own height as its texture arrived.
            if (!prone) sprite.position.y = elev + h / 2;
          } else {
            // A face stays a disc whether it is standing or lying: circular
            // art on a plane pitched flat reads as a token laid face-up on the
            // board, which is exactly what it is.
            mat.map = built.tex;
          }
          // Shared with every other token drawn from the same art, so neither
          // the per-build sweep nor the unmount sweep may free it. The old
          // `old.dispose()` here is gone with it: disposing a cached texture
          // would blank that art on every token at once.
          mat.userData.sharedMap = true;
          mat.needsUpdate = true;
        }).catch(() => { /* missing art just leaves the plain token */ });
      }

      // Ground marker + drop line — without them, a token in the air is
      // impossible to place on the board.
      const disc = new THREE.Mesh(
        new THREE.CircleGeometry(sizeFt * 0.45, 24),
        new THREE.MeshBasicMaterial({
          // The creature's own base colour when it has one, otherwise the
          // long-standing default: blue for a player, red for anything else.
          // An unset column has to look exactly as it did before, so the
          // fallback is the literal old expression.
          color: new THREE.Color(baseColor(t)).multiplyScalar(1 - winDim),
          transparent: true,
          // Faded only when the token is genuinely airborne — measured from
          // the floor it belongs to, not from the board. On a raised deck
          // every token counted as elevated and dimmed its own marker.
          //
          // The creature's chosen opacity replaces the 0.7 grounded default;
          // the airborne fade and the hidden fade still apply on top, because
          // both say something the colour picker does not.
          opacity: (elev > floorY ? baseOpacity(t) * 0.5 : baseOpacity(t))
            * (hiddenFromPlayers ? 0.5 : 1),
          // Lets the marker sit a hair off the floor instead of a visible
          // distance above it — the bias wins the depth tie rather than a gap
          // doing it. Same technique the window masks and light pools use, one
          // step stronger so the marker also beats those where they overlap.
          polygonOffset: true,
          polygonOffsetFactor: -5,
          polygonOffsetUnits: -10,
        })
      );
      disc.rotation.x = -Math.PI / 2;
      // On the token's own deck, and a hair above it.
      //
      // This was pinned to y=0.3 — the board. A token that climbed to an upper
      // deck left its marker behind on the floor, and 0.3 is exactly where the
      // LOWEST deck plane sits, so the two were coplanar and z-fought.
      disc.position.set(x, discY, z);
      // Above the window mask (2.5). The marker belongs to a token that has
      // already been judged visible; letting the mask paint over it faded the
      // marker out wherever it happened to cross a window's cone, which read
      // as the token itself half-disappearing.
      disc.renderOrder = 9;
      disc.userData = { tokenId: t.id, kind: 'disc' };
      tokenGroup.add(disc);

      if (elev !== floorY) {
        const line = new THREE.Line(
          // From the marker on the deck up to the token in the air. The lower
          // end used to be the board and the upper end the deck, which drew
          // the line through the hull rather than under the token.
          new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(x, discY, z),
            new THREE.Vector3(x, elev, z),
          ]),
          new THREE.LineDashedMaterial({
            color: new THREE.Color(0x94c5ff).multiplyScalar(1 - winDim),
            dashSize: 2,
            gapSize: 1.5,
          })
        );
        line.renderOrder = 10;   // with the token, over the window mask
        line.computeLineDistances();
        line.userData = { tokenId: t.id, kind: 'line' };
        tokenGroup.add(line);
      }
    }
    // `tokens` is read throughout this effect but is deliberately NOT a
    // dependency: tokenStructureKey is the part of it this pass's output can
    // change with, and position is handled by the pass below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    tokenStructureKey, tokenRebuildTick, ready, geomTick, gridSize, mapWidth, mapHeight, fogOfWar,
    // Which storey each token stands on, and whether the stack is expanded.
    shownLevelsKey, activeLevel,
    JSON.stringify((levels || []).map((l) => [l.level_index, l.height_ft])),
    // Crew heights come from the expanded hulls, so this pass has to re-run
    // when one is toggled or a ship's deck list changes. A signature, not the
    // array — `ships` is a new object every render.
    deckPicksKey,
    viewerTokenId,
    JSON.stringify((ships || []).map((sh) => [sh.id, sh.active_deck, (sh.decks || []).map((d) => [d.deck_index, d.is_sails, d.height_ft])])),
    // Heavy fog hides whoever is standing in it, so this pass has to re-run
    // when a fog bank is laid, moved or lifted. A signature of the fog zones
    // only — the other zone types don't affect which tokens are drawn, and
    // `magicalDarkness` is a new array every render.
    JSON.stringify((magicalDarkness || [])
      .filter((dz) => dz.zone_type === 'heavy-fog')
      .map((dz) => [dz.id, dz.x, dz.y, dz.radius, (dz.poly_points || []).length])),
  ]);

  // ── Tokens: moving, without rebuilding ────────────────────────────────
  //
  // A token that has only changed position is slid to its new place: every object
  // belonging to it — the sprite, its ground disc, its drop line — is translated
  // by the SAME delta. Nothing is disposed, nothing is recreated, no texture is
  // re-requested, and none of the height, deck or storey maths is repeated here,
  // which is the point: duplicating that arithmetic is how two code paths come to
  // disagree about where a token is standing.
  //
  // VISIBILITY IS NOT A REBUILD
  //
  // The first version of this handed back to the full rebuild whenever fog could
  // have changed its mind: a moved token with no sprite, or one that had walked
  // out of sight. For the GM, whose fog is off, that never fired. For a PLAYER it
  // fired on nearly every tick — a patrolling guard behind a wall has no sprite,
  // so every step tore down and rebuilt every token in the scene, twice a second,
  // which is what made dragging the camera stutter and hang.
  //
  // So a token that goes out of sight now keeps its objects and is simply turned
  // off, and turned back on when it is seen again. Nothing is disposed, nothing
  // re-requested, and the player's fog is exactly as strict as before: an unseen
  // token is not drawn.
  //
  // One case still needs the build: a token that has NEVER been built — culled by
  // fog when the scene was made — and has now become visible. That is a real
  // transition, it happens once, and the rebuild is the thing that knows how to
  // make a token.
  const lastTokenPos = useRef(new Map());
  useEffect(() => {
    const st = stateRef.current;
    if (!st || !st.tokenGroup) return;
    const { tokenGroup, ftPerPx } = st;

    const byId = new Map();
    for (const obj of tokenGroup.children) {
      const id = obj.userData?.tokenId;
      if (id == null) continue;
      if (!byId.has(id)) byId.set(id, []);
      byId.get(id).push(obj);
    }

    let needRebuild = false;
    const { ox: tgx, oy: tgy } = gridOffsets(mapWidth, mapHeight, gridSize);

    for (const t of tokens || []) {
      const col = Number(t.grid_col);
      const row = Number(t.grid_row);
      const was = lastTokenPos.current.get(t.id);
      lastTokenPos.current.set(t.id, { col, row });
      if (!was || (was.col === col && was.row === row)) continue;   // didn't move

      // The centre of the token's FOOTPRINT, by the same arithmetic the build
      // uses — grid offset included, half the footprint rather than half a
      // square. Computed here rather than read off the sprite because a token
      // that has no sprite still has to be judged.
      const footPx = tokenFootprint(t).gridW * gridSize;
      const px = tgx + col * gridSize + footPx / 2;
      const py = tgy + row * gridSize + footPx / 2;
      const shown = st.tokenShownAt ? st.tokenShownAt(t, px, py) : true;

      const objs = byId.get(t.id);
      const sprite = objs?.find((o) => o.userData?.kind === 'sprite');
      if (!sprite) {
        // Never built. Only worth the build if it can now be SEEN — otherwise
        // this is a guard patrolling out of sight, and asking for a rebuild on
        // every one of its steps is precisely the bug this pass exists to fix.
        if (shown) needRebuild = true;
        continue;
      }

      const dCol = col - sprite.userData.col;
      const dRow = row - sprite.userData.row;
      const dx = dCol * gridSize * ftPerPx;
      const dz = dRow * gridSize * ftPerPx;
      for (const o of objs) {
        o.position.x += dx;
        o.position.z += dz;
        // What the build decided about this particular object, remembered once.
        // A nameplate the build left off, or a drop line that belongs to a
        // flying token only, must not be switched ON by coming into view.
        if (o.userData.baseVisible === undefined) o.userData.baseVisible = o.visible;
        o.visible = shown && o.userData.baseVisible;
        // Out of the raycaster's reach as well as off the screen.
        //
        // three.js does NOT skip invisible objects when raycasting — `intersect()`
        // tests `object.layers` and calls `raycast()` regardless of `visible`. An
        // unseen guard left in the scene would therefore still answer a hover and
        // still be clickable, which tells a player exactly where it is standing.
        // Layers are the one switch every call site already goes through,
        // including the recursive `[geomGroup, tokenGroup]` pick.
        // set(0) rather than enableAll(): layer 0 is the default every camera
        // and raycaster in this view tests against, and restoring more than
        // was there is how a switch like this quietly grows a second meaning.
        if (o.visible) o.layers.set(0); else o.layers.disableAll();
      }
      sprite.userData.col = col;
      sprite.userData.row = row;
      sprite.userData.px = px;
      sprite.userData.py = py;
    }

    // Forget tokens that have gone, so a returning id is treated as new.
    if (lastTokenPos.current.size > (tokens || []).length) {
      const live = new Set((tokens || []).map((t) => t.id));
      for (const id of [...lastTokenPos.current.keys()]) if (!live.has(id)) lastTokenPos.current.delete(id);
    }

    if (needRebuild) setTokenRebuildTick((n) => n + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenPositionKey, gridSize, fogOfWar]);

  // ── Star system ───────────────────────────────────────────────────────────
  //
  // A generated system map is drawn top-down: the star is a filled circle and
  // the orbits are strokes on the board. That reads correctly on a flat map
  // and not at all in 3D, where you're looking at a picture of a sun lying on
  // the floor. So the suns become actual spheres sitting in the plane of the
  // ecliptic, and the orbits become their own geometry.
  //
  // The rings matter most with the bubble up: the floor drops to 12% opacity
  // there, taking the painted orbits with it, and a system with no visible
  // tracks is unusable — "third orbit" has to mean a circle everyone can see.
  // These are drawn above the floor, exempt from the scene's distance fog, so
  // they hold up against a lit panorama.
  useEffect(() => {
    const st = stateRef.current;
    if (!st) return undefined;
    const { scene, ftPerPx } = st;
    if (!system || !Array.isArray(system.ringRadii)) return undefined;

    const group = new THREE.Group();
    const toWorldX = (px) => (px - (Number(mapWidth) || 0) / 2) * ftPerPx;
    const toWorldZ = (py) => (py - (Number(mapHeight) || 0) / 2) * ftPerPx;

    // ── Orbits ──
    for (const rPx of system.ringRadii) {
      const r = Number(rPx) * ftPerPx;
      if (!(r > 0)) continue;
      // A ring MESH, not a line: line width is one pixel on most platforms,
      // which vanishes the moment the camera pulls back from a system that is
      // thousands of feet across.
      const t = Math.max(0.4, r * 0.0035);
      const geo = new THREE.RingGeometry(r - t, r + t, 128);
      const mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(system.ringColor || '#a8c4ff'),
        transparent: true,
        opacity: 0.55,
        side: THREE.DoubleSide,
        depthWrite: false,
        fog: false,
      });
      const ring = new THREE.Mesh(geo, mat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(toWorldX(system.cx), 0.5, toWorldZ(system.cy));
      ring.renderOrder = 3;
      group.add(ring);
    }

    // ── Suns ──
    for (const star of (system.stars || [])) {
      const r = Number(star.r) * ftPerPx;
      if (!(r > 0)) continue;
      const x = toWorldX(Number(star.x));
      const z = toWorldZ(Number(star.y));

      // Centred ON the plane, not resting on it: planets orbit through the
      // star's equator, so the ecliptic cuts the sphere in half.
      const core = new THREE.Mesh(
        new THREE.SphereGeometry(r, 64, 48),
        makeStarMaterial(star.core, star.glow)
      );
      core.position.set(x, 0, z);
      core.renderOrder = 4;
      // Tilted off the ecliptic so the churn isn't symmetric about the
      // horizon everyone is looking along.
      core.rotation.set(0.35, 0, 0.12);
      core.userData.animated = true;
      group.add(core);

      // Corona. A sprite, not a shell — see makeStarGlowSprite.
      const glow = makeStarGlowSprite(star.glow);
      const d = r * 5.2;
      glow.scale.set(d, d, 1);
      glow.position.set(x, 0, z);
      group.add(glow);
    }

    scene.add(group);
    st.systemGroup = group;
    return () => {
      scene.remove(group);
      if (st.systemGroup === group) st.systemGroup = null;
      group.traverse((o) => {
        o.geometry?.dispose();
        if (o.material?.map) o.material.map.dispose();
        o.material?.dispose();
      });
    };
  }, [ready, system, mapWidth, mapHeight, gridSize]);

  // ── What the ground shows ─────────────────────────────────────────────────
  //
  // Independent of the sky. A generated system wants a clear plane whether or
  // not anyone has uploaded a panorama: its map art is a picture of a sun and
  // some orbit strokes, and in 3D that's a rug painted to look like the thing
  // standing on it. Clearing the plane leaves the real sphere and the real
  // rings, which is the whole point of looking at it in 3D.
  useEffect(() => {
    const st = stateRef.current;
    if (!st) return;
    const { groundMat } = st;

    if (floorMode === 'clear') {
      // Nearly transparent rather than merely dark: an opaque plane fills the
      // middle of the view whatever colour it is, and blocks the sky, the
      // stars and anything below the ecliptic.
      // Detached, NOT disposed. The map texture belongs to groundTexCache and
      // is shared with the geometry build and with any later switch back to
      // 'map'; freeing it here would leave a dead texture in the cache and the
      // board would come back blank.
      groundMat.map = null;
      groundMat.color.set(0x0a1226);
      groundMat.transparent = true;
      groundMat.opacity = 0.12;
      groundMat.depthWrite = false;
      // No map, so nothing to cut holes in — and an alphaTest against a plain
      // colour would discard the whole plane.
      groundMat.alphaTest = 0;
      groundMat.needsUpdate = true;
      return;
    }

    groundMat.transparent = false;
    groundMat.opacity = 1;
    groundMat.depthWrite = true;
    // Restored alongside the rest: 'clear' mode drops it so the dimmed plane
    // stays whole, and coming back to 'map' has to put it back or a
    // transparent map turns solid again.
    groundMat.alphaTest = 0.05;
    groundMat.needsUpdate = true;
    if (!mapUrl) { groundMat.needsUpdate = true; return; }
    // From the cache, like every other reader of the board art. This was the
    // second place loading a fresh full-size texture of the whole map and
    // assigning it over the previous one without freeing it — the same leak as
    // in the geometry build, on every change of floor mode.
    groundMat.map = groundTextureFor(mapUrl);
    groundMat.color.set(0xffffff);
    groundMat.needsUpdate = true;
  }, [ready, mapUrl, floorMode]);

  // ── Sky bubble ────────────────────────────────────────────────────────────
  //
  // The map's uploaded panorama on the INSIDE of a sphere (BackSide), big
  // enough to sit well outside anything in the scene, so orbiting looks around
  // a sky rather than across a rug of one. Automatic: a map with a panorama is
  // shown inside it.
  //
  // The ground plane itself stays — fog, tokens, ships and measurement all
  // stand on it, and space combat still happens on a plane in 5e.
  useEffect(() => {
    const st = stateRef.current;
    if (!st) return;
    const { scene, groundMat, worldW, worldH } = st;

    if (st.sky) {
      scene.remove(st.sky);
      st.sky.geometry.dispose();
      st.sky.material.map?.dispose();
      st.sky.material.dispose();
      st.sky = null;
    }

    const src = skyUrl;
    // A preset is only used when nothing is uploaded — an uploaded panorama of
    // the actual place always beats a generated one.
    const preset = src ? null : skyPreset;
    if (!bubble || (!src && !preset)) return undefined;

    // Big enough to sit outside everything, but never past the far plane —
    // the camera's far is derived from the map's WIDTH, so a map much taller
    // than it is wide would otherwise put the sphere beyond it and clip the
    // sky away.
    const radius = Math.min(Math.max(worldW, worldH) * 1.8, st.camera.far * 0.85);
    const geo = new THREE.SphereGeometry(radius, 64, 40);
    const mat = new THREE.MeshBasicMaterial({
      side: THREE.BackSide,     // we're inside it
      depthWrite: false,        // never occludes anything in the scene
      color: 0x8899bb,          // until the image lands
      toneMapped: false,
      // Exempt from the scene's distance fog.
      //
      // That fog fades everything to the background colour between 0.9x and
      // 2.4x the map width, and the sky sits at ~1.8x the map's LONGEST side —
      // past the far distance from most angles. Looking across the board, the
      // far wall of the sphere is further away than the near one, so the
      // middle of the screen washed out to flat background while the edges
      // stayed bright. A sky is the horizon; nothing should be behind it to
      // fade into.
      fog: false,
    });
    const sky = new THREE.Mesh(geo, mat);
    sky.renderOrder = -1;       // painted before everything else
    // Colour space and wrapping are set once, where the texture is decoded —
    // see utils/skyTexture.js. This only has to hang it on the material.
    let live = true;
    if (preset) {
      // Drawn locally and cached, so it is ready immediately — no request, no
      // decode, no progress to report.
      const tex = skyPresetTexture(preset);
      if (tex) {
        mat.map = tex;
        mat.color.set(0xffffff);
        mat.needsUpdate = true;
      }
    } else {
      loadSkyTexture(src)
        .then((tex) => {
          if (!live || !tex) return;
          mat.map = tex;
          mat.color.set(0xffffff);
          mat.needsUpdate = true;
        })
        .catch(() => {});
    }
    scene.add(sky);
    st.sky = sky;

    return () => {
      live = false;
      if (st.sky === sky) {
        scene.remove(sky);
        geo.dispose();
        // NOT mat.map.dispose(): the texture is owned by the sky cache and
        // shared with every later open of this view. Disposing it here is what
        // made reopening the 3D view re-download and re-decode the whole
        // panorama, which on a large HDRI is the entire wait.
        mat.dispose();
        st.sky = null;
      }
    };
    // skyPreset is listed even though `bubble` covers "has a sky at all":
  // switching from one preset to another changes neither skyUrl nor bubble, so
  // without it the sky would keep the first preset picked.
}, [ready, skyUrl, skyPreset, bubble]);

  // ── Ink: everyone's strokes, laid on the floor ──
  //
  // Ribbons rather than THREE.Line, because line width is capped at one pixel
  // on most platforms — a 4px pen from the flat map would have come out as a
  // hairline that disappeared as soon as the camera pulled back. Each segment
  // becomes a quad of the stroke's real width in feet, so ink drawn in either
  // view reads at the same size in both.
  useEffect(() => {
    const st = stateRef.current;
    if (!st) return;
    const { inkGroup, ftPerPx } = st;

    while (inkGroup.children.length) {
      const c = inkGroup.children.pop();
      c.geometry?.dispose();
      c.material?.dispose();
    }

    for (const d of (drawings || [])) {
      const pts = d.points || [];
      if (pts.length < 4) continue;
      // Map pixels to world feet, dropping any point that repeats the last.
      const path = [];
      for (let i = 0; i + 1 < pts.length; i += 2) {
        const x = (Number(pts[i]) - (Number(mapWidth) || 0) / 2) * ftPerPx;
        const z = (Number(pts[i + 1]) - (Number(mapHeight) || 0) / 2) * ftPerPx;
        const prev = path[path.length - 1];
        if (prev && Math.abs(prev[0] - x) < 1e-4 && Math.abs(prev[1] - z) < 1e-4) continue;
        path.push([x, z]);
      }
      if (path.length < 2) continue;

      const halfW = Math.max(0.35, ((Number(d.width) || 4) * ftPerPx) / 2);
      const positions = new Float32Array(path.length * 2 * 3);
      const idx = [];
      for (let i = 0; i < path.length; i++) {
        // Direction from the neighbours, so corners mitre instead of pinching.
        const a = path[Math.max(0, i - 1)], b = path[Math.min(path.length - 1, i + 1)];
        let dx = b[0] - a[0], dz = b[1] - a[1];
        const len = Math.hypot(dx, dz) || 1;
        dx /= len; dz /= len;
        const nx = -dz * halfW, nz = dx * halfW;
        const l = i * 2, r = i * 2 + 1;
        positions[l * 3] = path[i][0] + nx; positions[l * 3 + 1] = 0.4; positions[l * 3 + 2] = path[i][1] + nz;
        positions[r * 3] = path[i][0] - nx; positions[r * 3 + 1] = 0.4; positions[r * 3 + 2] = path[i][1] - nz;
        if (i > 0) {
          const pl = (i - 1) * 2, pr = (i - 1) * 2 + 1;
          idx.push(pl, pr, r, pl, r, l);
        }
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geo.setIndex(idx);
      const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
        color: new THREE.Color(d.color || '#ef4444'),
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
        depthWrite: false,
      }));
      mesh.renderOrder = 7;   // over the floor and the window mask, under tokens
      inkGroup.add(mesh);
    }
  }, [drawings, ready, gridSize, mapWidth, mapHeight]);

  // Hulls worth offering a switcher for. Sails are decoration, never a level
  // anyone stands on, and a single-deck ship has nothing to switch between —
  // the same two rules the flat map's buttons use.
  const deckShips = !onShipDeckChange ? [] : (ships || [])
    .map((sh) => ({
      ship: sh,
      // Top of the hull first, so the column reads like the ship stands.
      decks: (sh.decks || [])
        .filter((d) => !d.is_sails)
        .slice()
        .sort((a, b) => b.deck_index - a.deck_index),
    }))
    .filter((e) => e.decks.length > 1);

  // Put the camera on a token — this viewer's own by default.
  //
  // The position is read off the token's SPRITE rather than recomputed from its
  // grid coords, because the sprite already carries everything that decides
  // where it actually is: its elevation, and the rise of whichever deck it is
  // standing on when a hull is expanded. Recomputing that here would be a
  // second copy of the token pass's maths, and the two would drift.
  //
  // The current viewing DIRECTION is kept and only the distance is normalised,
  // so this recentres the camera without also spinning the board — arriving at
  // your token facing somewhere you did not choose is disorienting.
  // `tokenId` picks who to centre on; omitted, it means this viewer's own
  // token. That default is what lets one action serve both callers — a player
  // has exactly one answer and never passes an id, while the GM has many and
  // always does.
  const focusOwnToken = (tokenId, tries = 0) => {
    const st = stateRef.current;
    const who = tokenId != null ? tokenId : viewerTokenRef.current;
    if (!st || who == null || !mountedRef.current) return;
    const sprite = (st.tokenGroup?.children || []).find(
      (o) => o.userData?.tokenId === who && o.userData?.kind === 'sprite'
    );
    if (!sprite) {
      // Not in the scene YET.
      //
      // The usual reason is that the caller just switched the ship's deck to
      // reach this token: that is a round trip to the server and back before
      // the token pass rebuilds, so the sprite genuinely does not exist at the
      // moment of the click. Retrying across frames waits for it to arrive
      // without the caller having to guess a delay.
      //
      // Capped at ~1.5s, after which the token is simply not being drawn —
      // culled by fog, or on a deck this viewer is not being shown — and
      // flinging the camera at a stale position would be worse than doing
      // nothing.
      if (tries < 90) requestAnimationFrame(() => focusOwnToken(tokenId, tries + 1));
      return;
    }
    const { camera, controls } = st;
    const target = sprite.position.clone();
    const dir = camera.position.clone().sub(controls.target);
    // A camera sitting exactly on its own target has no direction to preserve;
    // fall back to a raised three-quarter view rather than dividing by zero.
    if (dir.lengthSq() < 1e-6) dir.set(0.6, 0.5, 0.6);
    dir.normalize();
    const DIST_FT = 70;
    camera.position.copy(target).add(dir.multiplyScalar(DIST_FT));
    controls.target.copy(target);
    controls.update();
  };

  // Publish the action for the host's button. Assigned in an effect rather than
  // during render so nothing outside can call it before the scene exists, and
  // cleared on unmount so a stale closure can't drive a torn-down renderer.
  useEffect(() => {
    if (!focusTokenRef) return undefined;
    focusTokenRef.current = focusOwnToken;
    return () => { focusTokenRef.current = null; };
  });

  return (
    <div className="fixed inset-0 z-[70] bg-black/90">
      {/* No chrome bar. Switching views is a toggle in the corner, not a
          screen the user opens and closes, so the board keeps the whole
          window and the two views feel like one map seen two ways. */}
      {error
        ? <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-400">{error}</div>
        : <div ref={mountRef} className="absolute inset-0" />}

      {/* The same rail as the flat map, minus the tools that mean nothing
          when the camera orbits. */}
      {/* Ping and the Effects zones are GM work, gated the same way the flat
          map gates its wall tools. onPingMap is GM-only by construction —
          PlayerView passes none of these. */}
      <Tool3DPanel activeTool={tool} onToolChange={setTool} isGM={!!onPingMap || !!onMagicalDarknessAdd} />

      {/* ── Hover card ──────────────────────────────────────────────────────
          Name and hit points for whatever the pointer is over.

          What it may show is decided by tokenLabelInfo, the same helper the
          flat map's permanent labels use — so a name the GM has hidden stays
          hidden here, an NPC's exact hit points are never spelled out to a
          player, and a token hidden from players is not in the scene to be
          hovered in the first place. This surfaces what the board already
          showed; it does not widen it.

          Positioned from the render loop above, so it tracks its token as the
          camera moves. pointer-events-none: it must never eat the click that
          was meant for the token underneath it. */}
      {(() => {
        if (hoverTokenId == null) return null;
        const t = (tokens || []).find((x) => x.id === hoverTokenId);
        if (!t) return null;
        const info = tokenLabelInfo(t, { isPlayer: !isGMRef.current });
        // Nothing this viewer may read means no card at all — an empty plate
        // floating over a token would itself say "there is something here the
        // GM is hiding", which is exactly what the hide flags are for.
        if (!info.showName && !info.showHp) return null;
        const showBar = info.showHp && (info.hasHp || info.isDead);
        return (
          <div
            ref={hoverCardRef}
            className="fixed top-0 left-0 z-[75] pointer-events-none select-none rounded-md
                       bg-[rgba(8,10,18,0.88)] border border-white/10 shadow-lg px-2 py-1
                       min-w-[84px] max-w-[220px]"
            style={{ visibility: 'hidden' }}
          >
            {info.showName && (
              <div className="text-[11px] leading-tight font-semibold text-gray-100 text-center truncate">
                {info.name}
              </div>
            )}
            {showBar && (
              <div className={`relative h-3 rounded-sm overflow-hidden bg-slate-800 ${info.showName ? 'mt-1' : ''}`}>
                <div
                  className="absolute inset-y-0 left-0"
                  style={{
                    width: `${info.isDead ? 100 : info.hpPct * 100}%`,
                    background: info.isDead ? '#000' : hpColor(t.current_hp, t.max_hp),
                  }}
                />
                {info.hpText && (
                  <div className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white leading-none
                                  [text-shadow:0_1px_2px_rgba(0,0,0,0.9)]">
                    {info.hpText}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {/* ── This viewer's weather clamp ──────────────────────────────────
          Only appears when there is weather to clamp, so a clear sky carries
          no chrome. Everyone gets it, GM included — the GM is also looking at
          this board and may want the storm quietened while they work.

          Bottom-left, above the tool rail's footprint and clear of the storey
          panel on the right. */}
      {weatherActive && (
        <div className="absolute bottom-4 left-4 z-40 flex items-center gap-2 rounded-xl bg-gray-900/90 border border-gray-700 px-2.5 py-1.5 shadow-2xl">
          <span
            className="text-sm leading-none select-none"
            title="How much weather this device draws. Yours only — it does not change what anyone else sees."
          >🌦</span>
          <input
            type="range"
            min={0} max={1} step={0.05}
            value={weatherClamp}
            onChange={(e) => setWeatherClamp(Number(e.target.value))}
            className="w-24 accent-sky-400"
            title="Weather density on this device"
            aria-label="Weather density on this device"
          />
          <span className={`text-[10px] w-7 text-right tabular-nums ${weatherClamp === 0 ? 'text-amber-400 font-semibold' : 'text-gray-400'}`}>
            {weatherClamp === 0 ? 'off' : `${Math.round(weatherClamp * 100)}%`}
          </span>
        </div>
      )}

      {/* ── Layers ────────────────────────────────────────────────────────
          Everything that can be drawn or hidden, in one panel: the map's
          storeys, then each hull's decks.

          The ship controls used to live in a column in the bottom-left corner,
          where they were squeezed between the tool rail and the bottom of the
          window and scrolled inside 45vh at two hulls. They are the same
          question as the storey rail — "what am I looking at" — so they are now
          the same control, in the place that already answered it.

          Vertically centred on the right, clear of the Map/Grid toggle above
          and the view switch below, tracking the host's panel inset so an open
          GM panel pushes it left with everything else. */}
      {onLevelChange && (levels.length > 1 || deckShips.length > 0) && (
        <div
          className="absolute top-1/2 -translate-y-1/2 z-40 w-44 max-h-[70vh] overflow-y-auto flex flex-col gap-2 bg-gray-900/95 border border-gray-700 rounded-xl p-1.5 shadow-2xl"
          style={{ right: rightInset + 16 }}
        >
          {levels.length > 1 && (
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center justify-between px-1 pb-0.5">
                <span className="text-[9px] uppercase tracking-wide text-gray-500">Storeys</span>
                {/* Shortcuts, not modes. "All" is a building seen from
                    outside; "one" is standing on a floor. Both are reachable by
                    ticking, and both are tedious enough at five storeys to be
                    worth a button. */}
                <span className="flex gap-1 text-[9px] text-gray-500">
                  <button
                    type="button"
                    title="Draw every storey"
                    onClick={() => setLevelPicks(levels.map((l) => Number(l.level_index) || 0))}
                    className="hover:text-sky-300"
                  >all</button>
                  <button
                    type="button"
                    title="Draw only the storey the table is on"
                    onClick={() => setLevelPicks([Number(activeLevel) || 0])}
                    className="hover:text-sky-300"
                  >one</button>
                </span>
              </div>
              {[...levels].sort((a, b) => b.level_index - a.level_index).map((l) => {
                const li = Number(l.level_index) || 0;
                const name = l.name || `Level ${li}`;
                return (
                  <LayerRow
                    key={li}
                    on={levelIsShown(li)}
                    active={li === activeLevel}
                    index={li}
                    label={name}
                    title={`${name} · ${l.height_ft} ft — click to put the table on this floor`}
                    onToggle={() => toggleLevelPick(li)}
                    onActivate={() => onLevelChange(li)}
                  />
                );
              })}
            </div>
          )}

          {deckShips.map(({ ship: sh, decks }) => {
            const active = Number(sh.active_deck) || 0;
            const on = (di) => (deckPicks[sh.id] || [active]).includes(di);
            return (
              <div key={sh.id} className="flex flex-col gap-0.5 border-t border-gray-800 pt-1.5 first:border-t-0 first:pt-0">
                <div className="flex items-center justify-between gap-1 px-1 pb-0.5">
                  <span className="text-[10px] uppercase tracking-wider text-dnd-gold truncate">
                    {sh.name || sh.class_name || 'Ship'}
                  </span>
                  <span className="flex gap-1 text-[9px] text-gray-500 shrink-0">
                    <button
                      type="button"
                      title="Draw every deck of this hull, stacked at their real heights"
                      onClick={() => setDeckPicks((prev) => ({
                        ...prev, [sh.id]: decks.map((d) => Number(d.deck_index) || 0),
                      }))}
                      className="hover:text-sky-300"
                    >all</button>
                    <button
                      type="button"
                      title="Draw only the deck the table is on"
                      onClick={() => setDeckPicks((prev) => ({ ...prev, [sh.id]: [active] }))}
                      className="hover:text-sky-300"
                    >one</button>
                  </span>
                </div>
                {decks.map((d) => {
                  const di = Number(d.deck_index) || 0;
                  const name = d.name || `Deck ${di + 1}`;
                  return (
                    <LayerRow
                      key={d.id}
                      on={on(di)}
                      active={di === active}
                      index={di + 1}
                      label={name}
                      title={`${name} — click to put the table on this deck`}
                      onToggle={() => toggleDeckPick(sh, di)}
                      onActivate={() => onShipDeckChange(sh.id, di)}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {/* The player's own storey control: one button, because a player is not
          arranging a view of a building — they are standing in it.

          The floors BELOW are always drawn (a first floor with nothing under it
          is a rug hanging in the air) and their own floor follows their token,
          flying included. What gets in the way is the ceiling, so that is what
          this reveals. */}
      {!onLevelChange && levels.length > 1 && onToggleStackLevels && (
        <div
          className="absolute top-1/2 -translate-y-1/2 z-40 flex flex-col gap-1 bg-gray-900/95 border border-gray-700 rounded-xl p-1.5 shadow-2xl"
          style={{ right: rightInset + 16 }}
        >
          <span className="text-[9px] uppercase tracking-wide text-gray-500 text-center pb-0.5">View</span>
          <button
            type="button"
            onClick={() => onToggleStackLevels(!stackLevels)}
            title={stackLevels
              ? 'Hide the floors above — see inside'
              : 'Show the floors above — see the whole building'}
            className={`px-2 py-1 rounded-lg text-[10px] font-semibold border transition-colors ${
              stackLevels
                ? 'bg-sky-600 text-white border-sky-400'
                : 'bg-gray-800 text-gray-300 border-gray-700 hover:border-sky-400/60'
            }`}
          >{stackLevels ? 'Roofs on' : 'Roofs off'}</button>
        </div>
      )}

      {/* What the ground shows. Offered when clearing it is a sensible thing
          to want: under an uploaded sky, on a wildspace map, or on a generated
          system whose art is a drawing of the bodies now rendered for real.
          On an ordinary battlemap the ground IS the map, and "grid only" would
          just be an empty room. */}
      {(skyUrl || system || mapType === 'wildspace') && (
        <div
          className="absolute z-40 flex items-center rounded-lg overflow-hidden border border-gray-700 shadow-lg text-xs"
          style={{ right: rightInset + 16, top: topInset + 16 }}
        >
          {[{ id: 'map', label: 'Map' }, { id: 'clear', label: 'Grid only' }].map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => chooseFloor(o.id)}
              className={`px-2.5 py-1.5 ${floorMode === o.id
                ? 'bg-dnd-gold text-gray-900 font-semibold'
                : 'bg-gray-900/95 text-gray-300 hover:text-white'}`}
            >{o.label}</button>
          ))}
        </div>
      )}

      {/* Panorama progress. The sky is the one asset big enough that its
          absence is worth explaining. */}
      {skyPct != null && (
        <div
          className="absolute left-1/2 -translate-x-1/2 z-40 w-56 rounded-lg bg-gray-900/95 border border-gray-700 px-3 py-2 shadow-2xl pointer-events-none"
          style={{ top: topInset + 16 }}
        >
          <div className="text-[11px] text-gray-300 mb-1">Loading sky…</div>
          <div className="h-1.5 rounded bg-gray-800 overflow-hidden">
            <div className="h-full bg-dnd-gold rounded transition-[width] duration-200" style={{ width: `${Math.round(skyPct * 100)}%` }} />
          </div>
        </div>
      )}

      {/* Helm readout. The flat map's copy of this sits at z-30, underneath
          this whole overlay, so taking the wheel and switching to 3D lost the
          hull's instruments entirely. Same numbers, same thresholds. */}
      {helmShip && (() => {
        const max = Number(helmShip.hull_hp) || 0;
        const cur = helmShip.current_hp == null ? max : Number(helmShip.current_hp);
        const pct = max > 0 ? Math.max(0, Math.min(1, cur / max)) : 0;
        const bar = pct > 0.5 ? '#22c55e' : pct > 0.25 ? '#f59e0b' : '#ef4444';
        return (
          <div
            className="absolute left-16 z-40 w-52 rounded-lg bg-black/80 border border-violet-500/50 px-3 py-2 pointer-events-none"
            style={{ top: topInset + 16 }}
          >
            <div className="flex items-center gap-1.5">
              <span className="text-violet-300 text-sm leading-none">⎈</span>
              <span className="text-violet-200 text-xs font-semibold truncate">
                {helmShip.name || 'Ship'}
              </span>
            </div>
            <div className="mt-1.5 h-2 rounded bg-gray-800 overflow-hidden">
              <div className="h-full rounded" style={{ width: `${pct * 100}%`, background: bar }} />
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-gray-400">
              <span>Hull {cur}{max > 0 ? ` / ${max}` : ''}</span>
              {helmShip.armor_class != null && <span>AC {helmShip.armor_class}</span>}
            </div>
            <div className="text-[10px] text-violet-300/80 mt-0.5">
              You have the helm — drag the hull to move, or the violet grip to turn.
            </div>
          </div>
        );
      })()}

      {/* Standing at the wheel but unable to attune to it — same message the
          flat map gives, so the square doesn't read as broken. */}
      {pilotDenial && (
        <div
          className="absolute left-16 z-40 bg-dnd-panel/95 border border-amber-700/60 rounded-xl px-3 py-2 shadow-2xl max-w-[15rem]"
          style={{ top: topInset + 16 }}
        >
          <div className="text-amber-300 text-xs font-semibold">Helm — can't attune</div>
          <div className="text-[10px] text-gray-300 mt-1 leading-snug">{pilotDenial}</div>
        </div>
      )}

      {/* Something is on the cursor.
          The flat map says so with a toast over the board, but that one lives
          in the map column underneath this overlay — so in 3D a GM who armed a
          creature got a board that looked ordinary and ignored them. Same
          message, drawn where it can actually be seen. */}
      {(placingToken || pendingTerrain) && (
        <div
          className="absolute left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 rounded-xl bg-cyan-700/95 border border-cyan-400/60 px-3.5 py-1.5 text-sm font-semibold text-white shadow-2xl pointer-events-none"
          style={{ top: topInset + 12 }}
        >
          <span aria-hidden="true">✛</span>
          <span className="truncate max-w-[22rem]">
            Click the board to place
            {/* Library names run to a full sentence of image-generator prose,
                so this is clamped rather than allowed to span the window. */}
            {pendingTerrain ? ` ${pendingTerrain.name || 'terrain'}` : ''}
          </span>
          <span className="text-[10px] font-normal text-cyan-100/80">drag to orbit</span>
        </div>
      )}

      {tool !== 'move' && !placingToken && !pendingTerrain && (
        <div
          className="absolute left-1/2 -translate-x-1/2 z-40 text-[11px] text-gray-300 bg-gray-900/90 border border-gray-700 rounded-full px-3 py-1 shadow-lg"
          style={{ top: topInset + 12 }}
        >
          {tool === 'draw' ? 'Drag to draw · shows on the 2D map too'
            : tool === 'draw-erase' ? 'Click to undo your last stroke'
            : PING_TOOLS.has(tool) ? `Click to ping · lands on ${
              (levels.find((l) => (Number(l.level_index) || 0) === (Number(activeLevel) || 0))?.name)
                || (levels.length > 1 ? `level ${Number(activeLevel) || 0}` : 'the board')
            } · everyone sees it`
            : ZONE_CIRCLE_TOOLS_3D.has(tool) ? 'Drag from the centre out · shows on the 2D map too'
            : ZONE_POLY_TOOLS_3D.has(tool) ? 'Click each corner · click the first again to close'
            : TEMPLATE_TOOLS_3D.has(tool) ? 'Drag from the origin outwards · shows on the 2D map too'
            : tool === 'tpl-edit' ? 'Drag a template to move it · click one to set its label and colour'
            : tool === 'tpl-erase' ? 'Click a spell template to remove it'
            : tool === 'darkness-erase' ? 'Click a fog, water or darkness zone to remove it'
            : 'Drag to measure'}
          <button
            type="button"
            onClick={() => setTool('orbit')}
            className="ml-2 text-gray-500 hover:text-white"
          >done</button>
        </div>
      )}
    </div>
  );
}
