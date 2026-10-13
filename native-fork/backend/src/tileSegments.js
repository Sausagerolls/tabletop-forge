// Segment tidying for tile geometry.
//
// Two problems, both caused by the same thing: a tile describes its own walls
// and doorways in isolation, and a dungeon built out of tiles has boundaries
// where those descriptions meet and overlap.
//
//   * Dungeondraft exports a four-square opening as FOUR one-square portals.
//     Imported literally that is four doors in one doorway, each opening
//     separately — nobody wants to click four times to walk through an arch.
//
//   * Two tiles laid edge to edge each bring their own wall along the join.
//     Two coplanar walls in the same place z-fight in 3D, and two doorways
//     that line up become two doors in one gap.
//
// Both are fixed by treating segments geometrically rather than as opaque
// rows: merge what is collinear and touching, and drop what already exists.

// Tolerance, in grid squares. Generous enough to absorb Dungeondraft's
// floating point and a tile laid one square off, tight enough that two genuine
// doors a square apart are never mistaken for one.
const EPS = 0.08;

const near = (a, b, eps = EPS) => Math.abs(a - b) <= eps;

// Are these the same segment, in either direction?
function sameSegment(a, b, eps = EPS) {
  return (near(a[0], b[0], eps) && near(a[1], b[1], eps) && near(a[2], b[2], eps) && near(a[3], b[3], eps))
      || (near(a[0], b[2], eps) && near(a[1], b[3], eps) && near(a[2], b[0], eps) && near(a[3], b[1], eps));
}

// Do these two segments lie on the same line AND overlap along it?
//
// Used for the tile-join case, where the two walls are the same wall but were
// drawn as different lengths by each tile — "identical endpoints" would miss
// them and leave the z-fight in place.
function segmentsOverlap(a, b, eps = EPS) {
  const ax = a[2] - a[0], ay = a[3] - a[1];
  const bx = b[2] - b[0], by = b[3] - b[1];
  const la = Math.hypot(ax, ay), lb = Math.hypot(bx, by);
  if (la < eps || lb < eps) return false;
  // Parallel?
  if (Math.abs((ax * by - ay * bx) / (la * lb)) > 0.06) return false;
  // Collinear? Distance from b's start to a's infinite line.
  const dist = Math.abs((b[0] - a[0]) * ay - (b[1] - a[1]) * ax) / la;
  if (dist > eps * 2) return false;
  // Overlapping, measured along a's direction.
  const ux = ax / la, uy = ay / la;
  const proj = (px, py) => (px - a[0]) * ux + (py - a[1]) * uy;
  const [b0, b1] = [proj(b[0], b[1]), proj(b[2], b[3])].sort((m, n) => m - n);
  const lo = Math.max(0, b0), hi = Math.min(la, b1);
  // A shared corner is a touch, not an overlap — two walls meeting at a right
  // angle share an endpoint and must both survive.
  return hi - lo > eps * 4;
}

/**
 * Merge collinear segments that touch or overlap into single runs.
 *
 * Iterative rather than one pass: merging A+B can make the result touch C,
 * and a single pass would leave that join behind.
 */
function mergeSegments(segs, eps = EPS) {
  let out = (segs || []).map((s) => s.map(Number)).filter((s) => s.length >= 4
    && Math.hypot(s[2] - s[0], s[3] - s[1]) > eps);
  let merged = true;
  let guard = 0;
  while (merged && guard++ < 50) {
    merged = false;
    for (let i = 0; i < out.length && !merged; i++) {
      for (let j = i + 1; j < out.length && !merged; j++) {
        const a = out[i], b = out[j];
        if (!collinearAndTouching(a, b, eps)) continue;
        out[i] = spanOf(a, b);
        out.splice(j, 1);
        merged = true;
      }
    }
  }
  return out;
}

function collinearAndTouching(a, b, eps) {
  const ax = a[2] - a[0], ay = a[3] - a[1];
  const bx = b[2] - b[0], by = b[3] - b[1];
  const la = Math.hypot(ax, ay), lb = Math.hypot(bx, by);
  if (la < eps || lb < eps) return false;
  if (Math.abs((ax * by - ay * bx) / (la * lb)) > 0.06) return false;
  const dist = Math.abs((b[0] - a[0]) * ay - (b[1] - a[1]) * ax) / la;
  if (dist > eps * 2) return false;
  // Touching or overlapping along the shared line.
  const ux = ax / la, uy = ay / la;
  const proj = (px, py) => (px - a[0]) * ux + (py - a[1]) * uy;
  const [b0, b1] = [proj(b[0], b[1]), proj(b[2], b[3])].sort((m, n) => m - n);
  return b1 >= -eps * 2 && b0 <= la + eps * 2;
}

// The longest span covering both segments, along their shared line.
function spanOf(a, b) {
  const pts = [[a[0], a[1]], [a[2], a[3]], [b[0], b[1]], [b[2], b[3]]];
  let best = null, bestD = -1;
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      const d = Math.hypot(pts[j][0] - pts[i][0], pts[j][1] - pts[i][1]);
      if (d > bestD) { bestD = d; best = [pts[i][0], pts[i][1], pts[j][0], pts[j][1]]; }
    }
  }
  return best;
}

/**
 * Are these two segments describing the same wall?
 *
 * `base` is the tolerance a tile JOIN needs: two tiles that each draw the wall
 * between them can disagree by a third of a square and still mean one wall.
 *
 * But a tolerance is only meaningful next to the thing it measures. A tile
 * drawn from organic geometry — a cave mouth, a curved shoreline, a rubble
 * pile — is not four long walls but a chain of very short ones, and a cave's
 * segments run about a fifth of a square: SHORTER than the join tolerance. At
 * that size "within a third of a square at both ends" is true of every
 * neighbour in the chain, so the outline is read as the same wall over and
 * over and comes out with half of itself missing.
 *
 * So the tolerance is never allowed past half the shorter of the two segments.
 * A full-square tile wall keeps the whole of `base` and joins behave exactly
 * as before; a chain of stubs gets a tolerance in proportion to the stubs.
 *
 * This can only ever make the test STRICTER — shrinking the tolerance narrows
 * sameSegment, and it narrows segmentsOverlap too, whose own minimum overlap
 * (eps * 4) can no longer be reached once eps is capped at half a segment.
 */
function coincides(a, b, base) {
  const la = Math.hypot(a[2] - a[0], a[3] - a[1]);
  const lb = Math.hypot(b[2] - b[0], b[3] - b[1]);
  const eps = Math.min(base, Math.min(la, lb) * 0.5);
  return sameSegment(a, b, eps) || segmentsOverlap(a, b, eps);
}

/**
 * The walls a tile stands up on its own account, in MAP PIXELS.
 *
 * A tile built in the panel — an image plus four edge toggles — carries no
 * geometry at all, and until now that meant it carried no walls either: the
 * 3D view drew a box along each closed edge and nothing else ever knew about
 * it. A box is not a wall. It blocks the camera and so hides a token standing
 * behind it, which reads as fog working, but sight passes straight through it
 * — so the visibility polygon covered the whole board and a player saw every
 * tile that had been laid, in both views.
 *
 * So a closed edge becomes a real wall row, exactly as an imported tile's
 * geometry does, and every reader that already understands walls — line of
 * sight, the flat map, the 3D wall pass, the cutaway — gets it for free.
 *
 * `edge_*` are stored ALREADY ROTATED (the placement handler turns them with
 * the tile), and true means OPEN, so the wall goes on the ones that are false.
 * The footprint is taken unrotated, which is what the 3D box pass has always
 * used: for the square tiles that make up nearly every set the two are the
 * same box, and matching it keeps the walls exactly where the boxes stood.
 *
 * @param {{grid_col:number, grid_row:number, grid_w:number, grid_h:number,
 *          edge_n:boolean, edge_e:boolean, edge_s:boolean, edge_w:boolean}} tile
 * @param {number} gridSize  map pixels per square
 * @returns {Array<[number,number,number,number]>}
 */
function edgeWallSegments(tile, gridSize) {
  const gs = Number(gridSize) > 0 ? Number(gridSize) : 50;
  const w = (Number(tile.grid_w) || 2) * gs;
  const h = (Number(tile.grid_h) || 2) * gs;
  // The tile turns about its own CENTRE — that is what the flat map's
  // KonvaImage does, what the 3D floor plane does, and what tilePointToMap
  // does to an imported tile's walls. So on a quarter or three-quarter turn a
  // non-square tile covers the same box with its sides swapped, and the walls
  // have to swap with it or they stand off the floor they belong to.
  const cx = (Number(tile.grid_col) || 0) * gs + w / 2;
  const cy = (Number(tile.grid_row) || 0) * gs + h / 2;
  const quarter = Math.abs(Math.round((Number(tile.rotation) || 0) / 90) % 2) === 1;
  const hx = (quarter ? h : w) / 2;
  const hy = (quarter ? w : h) / 2;
  const x0 = cx - hx, x1 = cx + hx;
  const y0 = cy - hy, y1 = cy + hy;
  const out = [];
  if (!tile.edge_n) out.push([x0, y0, x1, y0]);
  if (!tile.edge_e) out.push([x1, y0, x1, y1]);
  if (!tile.edge_s) out.push([x0, y1, x1, y1]);
  if (!tile.edge_w) out.push([x0, y0, x0, y1]);
  return out;
}

module.exports = { EPS, sameSegment, segmentsOverlap, mergeSegments, collinearAndTouching, spanOf, coincides, edgeWallSegments };
