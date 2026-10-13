// Which side of a wall is indoors.
//
// The 3D view hides a wall when the camera is standing on its OUTSIDE, so the
// room behind it can be seen into. For a tile that is easy — the tile's own
// middle is the room. For an imported map it is not: a wall is just a line
// segment among thousands, and nothing in the file says which side of it is a
// room and which is the corridor, the courtyard or the world.
//
// Answered by flood fill rather than by geometry. The walls are rasterised
// into a coarse grid, and everything reachable from the edge of the map
// without crossing one is OUTSIDE. Whatever is left — the pockets the fill
// could not reach — is indoors. Then each wall asks which of its two sides the
// fill reached.
//
// Chosen over the obvious alternatives because they are wrong in ways that
// look confident:
//
//   * "Away from the map's centre" works for one compact building and fails
//     for a room in the corner, whose walls all point the same way.
//   * Ray-casting an escape test per wall is O(walls x walls) and a big
//     Dungeondraft floor has thousands.
//
// A flood fill is one pass over a grid, so a map with ten thousand wall
// segments costs the same as one with ten.

// Cell size in map pixels is passed in — a square is the natural unit, and
// half a square is enough to separate the two sides of a wall without making
// the grid enormous.
const OPEN = 0;
const BLOCKED = 1;

/**
 * @param {Array<[number,number,number,number]>} segs  wall segments, map pixels
 * @param {number} mapW  @param {number} mapH
 * @param {number} cell  grid resolution in map pixels
 * @returns {{ isOutside(x:number,y:number):boolean, cols:number, rows:number }}
 */
export function buildInteriorMap(segs, mapW, mapH, cell) {
  const cols = Math.max(1, Math.ceil(mapW / cell));
  const rows = Math.max(1, Math.ceil(mapH / cell));
  const grid = new Uint8Array(cols * rows);
  const idx = (cx, cy) => cy * cols + cx;

  // Rasterise the walls. Stepped along each segment at half a cell so a
  // diagonal cannot slip between two cells and leave a hole the fill pours
  // through — one gap anywhere turns a whole building "outside".
  for (const s of segs || []) {
    const [x1, y1, x2, y2] = s;
    const len = Math.hypot(x2 - x1, y2 - y1);
    const steps = Math.max(1, Math.ceil((len / cell) * 2));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const cx = Math.floor((x1 + (x2 - x1) * t) / cell);
      const cy = Math.floor((y1 + (y2 - y1) * t) / cell);
      if (cx < 0 || cy < 0 || cx >= cols || cy >= rows) continue;
      grid[idx(cx, cy)] = BLOCKED;
    }
  }

  // Flood from every border cell. Anything the fill reaches is outdoors; the
  // pockets it cannot reach are rooms.
  const outside = new Uint8Array(cols * rows);
  const queue = new Int32Array(cols * rows);
  let head = 0, tail = 0;
  const push = (cx, cy) => {
    if (cx < 0 || cy < 0 || cx >= cols || cy >= rows) return;
    const i = idx(cx, cy);
    if (outside[i] || grid[i] === BLOCKED) return;
    outside[i] = 1;
    queue[tail++] = i;
  };
  for (let cx = 0; cx < cols; cx++) { push(cx, 0); push(cx, rows - 1); }
  for (let cy = 0; cy < rows; cy++) { push(0, cy); push(cols - 1, cy); }
  while (head < tail) {
    const i = queue[head++];
    const cx = i % cols, cy = (i - cx) / cols;
    push(cx + 1, cy); push(cx - 1, cy); push(cx, cy + 1); push(cx, cy - 1);
  }

  return {
    cols,
    rows,
    // A point off the map is outdoors; so is a point the fill reached. A point
    // ON a wall answers false, which is why callers sample to either side
    // rather than at the wall itself.
    isOutside(x, y) {
      const cx = Math.floor(x / cell);
      const cy = Math.floor(y / cell);
      if (cx < 0 || cy < 0 || cx >= cols || cy >= rows) return true;
      return outside[idx(cx, cy)] === 1;
    },
  };
}

/**
 * Which way is out, for one wall.
 *
 * Samples a short distance either side of the wall's middle and returns the
 * unit vector pointing at whichever side the flood fill reached.
 *
 * Returns null when the answer is not clean — both sides indoors (an interior
 * partition between two rooms) or both outdoors (a free-standing wall). Those
 * are left alone rather than guessed at: hiding a partition on a whim is more
 * confusing than leaving it up.
 */
export function outwardFor(seg, interior, probe) {
  const [x1, y1, x2, y2] = seg;
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return null;
  // Perpendicular to the wall.
  const nx = -dy / len, ny = dx / len;
  const aOut = interior.isOutside(mx + nx * probe, my + ny * probe);
  const bOut = interior.isOutside(mx - nx * probe, my - ny * probe);
  if (aOut === bOut) return null;
  return aOut ? { x: nx, y: ny } : { x: -nx, y: -ny };
}
