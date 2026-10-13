// Ping sizes.
//
// A ping is the GM saying "look here", and on a big board the default one is
// too small to do that job. A 51,200px map at 256px to the square is two
// hundred squares across: in 3D, where the ring is drawn in world units, a
// couple of squares of ripple is a speck once the camera is far enough back to
// see the place being pointed at.
//
// Each size therefore carries TWO numbers, because the two views measure a
// ping differently and always have:
//
//   * `screenMult` — the flat map draws its rings in SCREEN pixels, at a fixed
//     radius that ignores zoom, so a ping there is always the same size on the
//     display. That is right for it, and the multiplier just makes the ring
//     physically bigger on screen.
//
//   * `squares` — the 3D view draws in WORLD units, so its ping has to be
//     expressed in the map's own scale or it shrinks with distance. This is the
//     radius the outermost ripple reaches, in grid squares.
//
// One id travels on the wire and both views read the same row, so "Wide" means
// one thing to everybody at the table even though the arithmetic differs.
export const PING_SIZES = [
  { id: 'small',  label: 'Ping',        hint: 'Normal — a point on the board', screenMult: 1,   squares: 2.5 },
  { id: 'medium', label: 'Ping · Wide', hint: 'For a large map',               screenMult: 2,   squares: 9 },
  { id: 'large',  label: 'Ping · Huge', hint: 'For a whole region',            screenMult: 3.2, squares: 28 },
];

const BY_ID = Object.fromEntries(PING_SIZES.map((s) => [s.id, s]));

// Unknown or missing ids fall back to the normal size rather than vanishing:
// a ping from an older client, or one whose size was dropped somewhere in the
// relay, should still be a ping.
export function pingSize(id) {
  return BY_ID[id] || BY_ID.small;
}

// Tool id → size id. The rail encodes the choice in which tool is active,
// which is how the draw and measure groups work too, so there is no extra
// piece of state to keep in step.
export const PING_TOOL_IDS = {
  ping: 'small',
  'ping-medium': 'medium',
  'ping-large': 'large',
};

export const PING_TOOLS = new Set(Object.keys(PING_TOOL_IDS));

export function pingSizeForTool(tool) {
  return PING_TOOL_IDS[tool] || 'small';
}
