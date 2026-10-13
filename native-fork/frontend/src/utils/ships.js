// Client mirror of backend/src/ships.js. Kept deliberately identical so a
// token drawn on a rotating deck lands exactly where the server will store it —
// any divergence here shows up as tokens jumping a fraction of a square the
// moment the server echoes the move back.
//
// See the backend copy for why deck-local coords are the source of truth and
// world coords are the projection.

export function gridOffsets(mapWidth, mapHeight, gridSize) {
  const gs = Number(gridSize) || 50;
  return {
    ox: gs > 0 ? (Number(mapWidth || 0) % gs) / 2 : 0,
    oy: gs > 0 ? (Number(mapHeight || 0) % gs) / 2 : 0,
  };
}

// The ship's main deck: the one a boarder arrives on, and the floor the smaller
// decks stack above. Marked in the ship builder; when nothing is marked (every
// ship built before the flag existed) it falls back to the lowest deck_index,
// which is exactly what boarding used to do.
export function mainDeck(decks) {
  if (!decks || !decks.length) return null;
  // Sails are decoration, never a level anyone can stand on.
  const real = decks.filter(d => !d.is_sails);
  if (!real.length) return null;
  return real.find(d => d.is_main)
    || real.slice().sort((a, b) => a.deck_index - b.deck_index)[0];
}

// The deck that defines the ship's pivot: index 0, or the lowest index there
// is. Everything that rotates has to agree on this one.
export function referenceDeck(decks) {
  if (!decks || !decks.length) return null;
  // Sails can't define the pivot — they're hung off the hull, not part of it.
  const real = decks.filter(d => !d.is_sails);
  const pool = real.length ? real : decks;
  return pool.find(d => d.deck_index === 0)
    || pool.slice().sort((a, b) => a.deck_index - b.deck_index)[0];
}

// The ship's single pivot, in world pixels. Every deck rotates about THIS
// point, not its own centre — decks are rarely the same size, so per-deck
// centres would drift apart the moment the hull turned, and the alignment the
// GM set would come apart under rotation.
export function shipPivot({ ship, refDeck, gridSize, mapWidth, mapHeight }) {
  const gs = Number(gridSize) || 50;
  const { ox, oy } = gridOffsets(mapWidth, mapHeight, gs);
  const pw = Number(refDeck.grid_cols) * gs;
  const ph = Number(refDeck.grid_rows) * gs;
  // The reference deck's own alignment offset counts: it is the datum every
  // other deck chains from, and it is NOT always zero — reorder the stack and
  // whichever deck ends up lowest keeps the offset it was given. Leaving it out
  // put the pivot a deck-offset away from the deck it is supposed to be the
  // centre of, so the hull turned about a point off to one side and the base
  // deck's placement looked like it had been forgotten.
  return {
    px: ox + (Number(ship.grid_col) + Number(refDeck.offset_col || 0)) * gs + pw / 2,
    py: oy + (Number(ship.grid_row) + Number(refDeck.offset_row || 0)) * gs + ph / 2,
    ox, oy, gs,
  };
}

// Top-left of a deck in world pixels, before rotation.
export function deckTopLeft({ ship, deck, ox, oy, gs }) {
  return {
    x: ox + (Number(ship.grid_col) + Number(deck.offset_col || 0)) * gs,
    y: oy + (Number(ship.grid_row) + Number(deck.offset_row || 0)) * gs,
  };
}

// Token footprint in squares, keyed by size. Mirrors TOKEN_SIZES in MapStage —
// only the grid extent matters here, since all it decides is where the token's
// centre sits inside its own box.
const TOKEN_FOOTPRINT = {
  tiny: 1, small: 1, medium: 1, large: 2, huge: 3, gargantuan: 4,
};

export function footprintSquares(size) {
  return TOKEN_FOOTPRINT[size] || 1;
}

// Both projections below rotate the token's CENTRE, not its top-left corner.
//
// A token is drawn as an axis-aligned box hung off its world grid_col/grid_row:
// the box itself never turns with the hull, only its position does. Rotating
// the corner and then hanging an unrotated box off the result displaces the
// centre by (half-extent − R·half-extent) — a full square at 90°, ~1.4 squares
// diagonally at 180°. That is a token staying with the ship but sliding to a
// different spot on the deck every time the GM turns the wheel.
//
// So each direction shifts to the centre, rotates, and shifts back by the same
// half-extent in world space. `extentCols/Rows` are the token's footprint in
// squares (1 medium, 2 large, …); they default to 1 so a caller without a size
// to hand still gets the centre-correct answer for the common case.
export function deckToWorld({ ship, deck, refDeck, gridSize, mapWidth, mapHeight, deckCol, deckRow, extentCols = 1, extentRows = 1 }) {
  const ref = refDeck || deck;
  const { px, py, ox, oy, gs } = shipPivot({ ship, refDeck: ref, gridSize, mapWidth, mapHeight });
  const tl = deckTopLeft({ ship, deck, ox, oy, gs });

  const rad = ((Number(ship.rotation) || 0) * Math.PI) / 180;
  const cosA = Math.cos(rad), sinA = Math.sin(rad);

  const halfW = ((Number(extentCols) || 1) * gs) / 2;
  const halfH = ((Number(extentRows) || 1) * gs) / 2;

  const lx = tl.x + Number(deckCol) * gs + halfW - px;
  const ly = tl.y + Number(deckRow) * gs + halfH - py;

  const wx = px + lx * cosA - ly * sinA;
  const wy = py + lx * sinA + ly * cosA;

  // Rotated centre, back to the top-left the renderer expects.
  return { col: (wx - halfW - ox) / gs, row: (wy - halfH - oy) / gs };
}

export function worldToDeck({ ship, deck, refDeck, gridSize, mapWidth, mapHeight, worldCol, worldRow, extentCols = 1, extentRows = 1 }) {
  const ref = refDeck || deck;
  const { px, py, ox, oy, gs } = shipPivot({ ship, refDeck: ref, gridSize, mapWidth, mapHeight });
  const tl = deckTopLeft({ ship, deck, ox, oy, gs });

  const rad = ((Number(ship.rotation) || 0) * Math.PI) / 180;
  const cosA = Math.cos(-rad), sinA = Math.sin(-rad);

  const halfW = ((Number(extentCols) || 1) * gs) / 2;
  const halfH = ((Number(extentRows) || 1) * gs) / 2;

  const wx = ox + Number(worldCol) * gs + halfW;
  const wy = oy + Number(worldRow) * gs + halfH;
  const dx = wx - px, dy = wy - py;

  const lx = dx * cosA - dy * sinA;
  const ly = dx * sinA + dy * cosA;

  // Back out of ship space into this deck's own square coords, undoing the
  // centre shift so the result is again a top-left.
  return { col: (px + lx - halfW - tl.x) / gs, row: (py + ly - halfH - tl.y) / gs };
}

// ── Points on a deck, in pixels ─────────────────────────────────────────────
//
// deckToWorld/worldToDeck above speak in grid SQUARES and carry a token's
// footprint, because that is what a creature standing on a deck needs. A spell
// template is not a creature: its geometry is a handful of loose points in map
// pixels, with no footprint and no square to sit in.
//
// So these are the same projection with the square-and-extent machinery taken
// out — a pure point transform. `dx/dy` are pixels from the deck's own
// top-left corner, before the hull is turned.
export function deckPxToWorldPx({ ship, deck, refDeck, gridSize, mapWidth, mapHeight, dx, dy }) {
  const ref = refDeck || deck;
  const { px, py, ox, oy, gs } = shipPivot({ ship, refDeck: ref, gridSize, mapWidth, mapHeight });
  const tl = deckTopLeft({ ship, deck, ox, oy, gs });
  const rad = ((Number(ship.rotation) || 0) * Math.PI) / 180;
  const cosA = Math.cos(rad), sinA = Math.sin(rad);
  const lx = tl.x + Number(dx) - px;
  const ly = tl.y + Number(dy) - py;
  return { x: px + lx * cosA - ly * sinA, y: py + lx * sinA + ly * cosA };
}

export function worldPxToDeckPx({ ship, deck, refDeck, gridSize, mapWidth, mapHeight, x, y }) {
  const ref = refDeck || deck;
  const { px, py, ox, oy, gs } = shipPivot({ ship, refDeck: ref, gridSize, mapWidth, mapHeight });
  const tl = deckTopLeft({ ship, deck, ox, oy, gs });
  const rad = ((Number(ship.rotation) || 0) * Math.PI) / 180;
  const cosA = Math.cos(-rad), sinA = Math.sin(-rad);
  const ddx = Number(x) - px, ddy = Number(y) - py;
  const lx = ddx * cosA - ddy * sinA;
  const ly = ddx * sinA + ddy * cosA;
  return { dx: px + lx - tl.x, dy: py + ly - tl.y };
}

// Is a deck-local PIXEL inside the deck's own outline?
export function isPxOnDeck(deck, dx, dy, gridSize) {
  const gs = Number(gridSize) || 50;
  return dx >= 0 && dy >= 0
    && dx <= Number(deck.grid_cols) * gs
    && dy <= Number(deck.grid_rows) * gs;
}

// A token's actual extent in squares: the size preset, unless the token carries
// a `size_squares` override (gargantuan is a minimum, not a fixed size). Ship
// maths must agree with the renderer here, or a resized creature rotates about
// the wrong centre and its helm test uses the wrong box.
export function tokenExtent(token) {
  const n = Number(token && token.size_squares);
  if (Number.isFinite(n) && n > 0) return n;
  return footprintSquares(token && token.size);
}

// Is a token standing on this deck's helm? Deck-local, so it holds however the
// hull is pointing. The token covers its whole footprint, so a Large creature
// overlapping the helm square counts — that matches what the player sees, which
// is their own box sitting over the lit square.
export function isAtHelm(deck, deckCol, deckRow, token) {
  if (!deck || !deck.helm || deck.helm.col == null) return false;
  const ext = tokenExtent(token);
  const hc = Number(deck.helm.col), hr = Number(deck.helm.row);
  // The helm is a RECTANGLE now, drawn freehand in the builder, so it has a
  // size of its own. Anything stored before that has no w/h and is the 1x1
  // square it always was.
  const hw = Number(deck.helm.w) > 0 ? Number(deck.helm.w) : 1;
  const hh = Number(deck.helm.h) > 0 ? Number(deck.helm.h) : 1;
  const c = Number(deckCol), r = Number(deckRow);
  if (!Number.isFinite(c) || !Number.isFinite(r)) return false;
  // Snap to the square the token is standing ON before testing. Deck coords
  // are a raw projection — worldToDeck divides by the grid and never rounds —
  // so a token dropped dead on the helm arrives as 5.0003 or 4.9997 depending
  // on the hull's rotation. Comparing the helm's integer corner against the
  // raw float made the test `5 >= 5.0003` → false: the wheel was live or dead
  // by a coin flip of which side of the integer the projection landed on, and
  // any rotated hull drifts far enough to lose it.
  const c0 = Math.round(c), r0 = Math.round(r);
  // Box against box: the token's footprint against the helm's rectangle. The
  // old test asked whether the helm's CORNER fell inside the token, which only
  // works while a helm is exactly one square — a wheel drawn wider than the
  // token would have been missed entirely.
  return c0 < hc + hw && c0 + ext > hc && r0 < hr + hh && r0 + ext > hr;
}

// Which ship, if any, this player is currently piloting: their token is on a
// deck whose helm square it covers. Returns the ship, so callers can read its
// name and hull straight off.
// The ship a specific TOKEN is piloting, if any.
//
// Prefer this over shipPilotedBy below whenever the caller knows which token is
// theirs. That one matches on `player_name`, which is a display string: the GM's
// player-preview opens the player view with `?name=<player> (preview)`, so the
// comparison failed and the helmsman lost the wheel — hull outline and rotate
// handle both vanish, because the steering chrome keys off the selected ship.
// A token id can't drift like that.
export function shipPilotedByToken(ships, token) {
  if (!token || token.ship_id == null) return null;
  const ship = (ships || []).find((s) => s.id === token.ship_id);
  if (!ship) return null;
  const deck = (ship.decks || []).find((d) => d.deck_index === (token.deck_index ?? 0));
  return isAtHelm(deck, token.deck_col, token.deck_row, token) ? ship : null;
}

export function shipPilotedBy(ships, tokens, playerName) {
  if (!playerName) return null;
  for (const s of ships || []) {
    const decks = s.decks || [];
    if (!decks.some(d => d.helm && d.helm.col != null)) continue;
    for (const t of tokens || []) {
      if (t.ship_id !== s.id || t.player_name !== playerName) continue;
      const deck = decks.find(d => d.deck_index === (t.deck_index ?? 0));
      if (isAtHelm(deck, t.deck_col, t.deck_row, t)) return s;
    }
  }
  return null;
}

export function isOnDeck(deck, deckCol, deckRow) {
  return (
    deckCol >= 0 && deckRow >= 0 &&
    deckCol <= Number(deck.grid_cols) &&
    deckRow <= Number(deck.grid_rows)
  );
}
