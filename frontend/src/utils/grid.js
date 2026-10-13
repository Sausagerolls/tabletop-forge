// Grid geometry and map scale.
//
// Pulled out of MapStage so the lattice maths is stated once, in terms of plain
// numbers, and can be reasoned about (and unit-tested) without a Konva stage in
// the way. The tracers below take any context that speaks moveTo/lineTo.

// One square (or hex) is 5 ft by the 5e rules. This is what feet-denominated
// game objects convert against — spell template radii, light and vision ranges,
// auras, air bubbles. It is deliberately NOT the same thing as the GM's map
// scale below: a fireball is 20 ft across whatever a hex is declared to be
// worth on an overland map.
export const FEET_PER_SQUARE = 5;

// ── Hex geometry ─────────────────────────────────────────────────────────────
//
// Flat-top hexes, sized so the distance across the flats — the vertical one, on
// a flat-top hex — is exactly `gridSize`:
//
//         _____          R       = circumradius       = gridSize / √3
//        /     \         h       = across the flats   = gridSize   (row step)
//       /       \        colStep = 3/2 · R            ≈ 0.866 · gridSize
//       \       /
//        \_____/
//
// One hex is therefore worth the same 5 ft as one square and a size-1 token
// fills it, so flipping a map between square and hex neither rescales nor moves
// anything standing on it. Token coordinates stay fractional grid_col/grid_row
// in the ordinary pixel frame — this is a lattice drawn over that frame, not a
// coordinate system of its own, which is why walls, LOS, fog, spell templates,
// ships and measurement need to know nothing about it.
//
// Rows step by gridSize exactly as the square grid's do, and odd columns are
// stepped down half a row.
export function hexLattice(mW, mH, gridSize) {
  const h = gridSize;
  const R = h / Math.sqrt(3);
  const colStep = 1.5 * R;
  // Whole hexes only, with the leftover split evenly either side — the same
  // centring rule the square grid uses for its partial cells.
  const nCols = Math.max(1, Math.floor((mW - 2 * R) / colStep) + 1);
  const nRows = Math.max(1, Math.floor(mH / h));
  return {
    h, R, colStep, nCols, nRows,
    // Centre of column 0 / row 0. Odd columns sit h/2 lower (see hexCenter).
    ox: (mW - (2 * R + (nCols - 1) * colStep)) / 2 + R,
    oy: (mH - nRows * h) / 2 + h / 2,
  };
}

export function hexCenter(lat, c, r) {
  return {
    // `c & 1` is the column's parity and stays correct for the negative columns
    // of the overdrawn ring (-1 & 1 === 1).
    x: lat.ox + c * lat.colStep,
    y: lat.oy + (c & 1 ? lat.h / 2 : 0) + r * lat.h,
  };
}

// Nearest hex centre to a point in map space. The rounded column can be off by
// one near a hex's slanted edges — the columns interlock rather than tiling in
// strips — so its neighbours are tried too and the closest centre wins.
export function nearestHexCenter(lat, mapX, mapY) {
  const cGuess = Math.round((mapX - lat.ox) / lat.colStep);
  let best = null, bestD = Infinity;
  for (let c = cGuess - 1; c <= cGuess + 1; c++) {
    const colY = lat.oy + (c & 1 ? lat.h / 2 : 0);
    const r = Math.round((mapY - colY) / lat.h);
    const p = hexCenter(lat, c, r);
    const d = (p.x - mapX) ** 2 + (p.y - mapY) ** 2;
    if (d < bestD) { bestD = d; best = p; }
  }
  return best;
}

// Trace the lattice into a path — a Konva Context or a plain CanvasRenderingContext2D,
// both of which speak moveTo/lineTo. The caller owns beginPath, clipping and
// stroking, because the two pipelines differ on all three.
//
// Each hex contributes only three of its six edges — upper-left, lower-left,
// bottom. The other three arrive as its neighbours' copies of those same edges
// (a hex's top edge is its northern neighbour's bottom edge, its upper-right is
// its north-east neighbour's upper-left, its lower-right is its south-east
// neighbour's lower-left), so the lattice closes with no edge stroked twice.
// The extra ring of hexes past the map bounds supplies the edges the on-map
// hexes would otherwise be missing at the margins; clip to keep it off the map.
export function traceHexLattice(ctx, lat) {
  const halfR = lat.R / 2, halfH = lat.h / 2;
  for (let c = -1; c <= lat.nCols; c++) {
    for (let r = -1; r <= lat.nRows + 1; r++) {
      const { x, y } = hexCenter(lat, c, r);
      ctx.moveTo(x - halfR, y - halfH);
      ctx.lineTo(x - lat.R, y);
      ctx.lineTo(x - halfR, y + halfH);
      ctx.lineTo(x + halfR, y + halfH);
    }
  }
}

// Square lattice, same contract as traceHexLattice. Centred so partial cells
// are equal on both sides.
export function traceSquareLattice(ctx, mW, mH, gridSize) {
  if (!(gridSize > 0)) return;
  const offsetX = (mW % gridSize) / 2;
  const offsetY = (mH % gridSize) / 2;
  for (let c = 0; offsetX + c * gridSize <= mW; c++) {
    ctx.moveTo(offsetX + c * gridSize, 0);
    ctx.lineTo(offsetX + c * gridSize, mH);
  }
  for (let r = 0; offsetY + r * gridSize <= mH; r++) {
    ctx.moveTo(0, offsetY + r * gridSize);
    ctx.lineTo(mW, offsetY + r * gridSize);
  }
}

// ── Map scale ────────────────────────────────────────────────────────────────
//
// What one cell is WORTH, as the GM defines it: an amount and a free-text unit.
// The unit is free text because an overland hex is as likely to mean "10 days
// travel" as "6 miles", so this only ever multiplies and appends — it never
// converts between units or tries to pluralise what the GM typed.
//
// This drives the scale key and the ruler readout, and nothing else. Anything
// denominated in FEET by the rules keeps FEET_PER_SQUARE above instead.
export const DEFAULT_SCALE = { amount: FEET_PER_SQUARE, unit: 'ft' };

export function scaleOf(gridScale, gridUnit) {
  const amount = Number(gridScale) > 0 ? Number(gridScale) : DEFAULT_SCALE.amount;
  const unit = (gridUnit ?? DEFAULT_SCALE.unit).trim();
  return { amount, unit };
}

export function formatCells(cells, sc) {
  const n = cells * sc.amount;
  // Whole numbers stay whole; everything else keeps at most two decimals with
  // trailing zeros trimmed, so 2.50 reads "2.5" and not "2.50".
  const txt = Number.isInteger(n) ? String(n) : String(Number(n.toFixed(2)));
  return sc.unit ? `${txt} ${sc.unit}` : txt;
}
