// levelFloor.js — where a token lands when it moves on a multi-storey map.
//
// A building's storeys are images, and where a storey HAS floor is where its
// art is opaque. There is no stored footprint to test against — Dungeondraft
// gives us a picture, not a polygon — so the question "is there floor under
// this square" is answered by reading the alpha channel of that level's image.
//
// Shared by both views so the flat map and the 3D view can never disagree about
// which floor someone is standing on.

// Downscaled alpha for a level image, cached per URL.
//
// Alpha only, and at a fraction of the original size: a storey is routinely
// several thousand pixels square, and this question is asked once per token
// move. A grid square survives the downscale comfortably — the smallest thing
// being tested is a whole cell, not a pixel.
const SAMPLE_WIDTH = 512;
const cache = new Map(); // url -> { a: Uint8Array, w, h } | null | 'loading'

export function getFloorSampler(url, onReady) {
  if (!url) return null;
  const hit = cache.get(url);
  if (hit === 'loading') return null;
  if (hit !== undefined) return hit;

  cache.set(url, 'loading');

  // Decoded straight to the size we need, never at full size.
  //
  // A storey is routinely 3840x9216 — 35 megapixels — and phones and tablets
  // refuse images that large. That matters more here than anywhere else,
  // because the safe default when the floor cannot be read is "there IS floor"
  // (see hasFloorAt). A decode that fails silently therefore does not produce a
  // visible glitch; it produces a building nobody can ever fall off.
  //
  // createImageBitmap with resizeWidth downsamples DURING decode, so the
  // full-resolution bitmap never has to exist.
  const store = (rgba, w, h) => {
    if (!rgba) { cache.set(url, null); onReady?.(); return; }
    // Keep the alpha channel alone — a quarter of the memory, and the colour is
    // no use to anybody here.
    const a = new Uint8Array(w * h);
    for (let i = 0; i < a.length; i++) a[i] = rgba[i * 4 + 3];
    cache.set(url, { a, w, h });
    onReady?.();
  };

  const viaImageBitmap = async () => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const bmp = await createImageBitmap(await res.blob(), {
      resizeWidth: SAMPLE_WIDTH,
      resizeQuality: 'low',
    });
    const c = document.createElement('canvas');
    c.width = bmp.width; c.height = bmp.height;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(bmp, 0, 0);
    bmp.close?.();
    return { rgba: g.getImageData(0, 0, c.width, c.height).data, w: c.width, h: c.height };
  };

  const viaImage = () => new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const nw = img.naturalWidth || 1;
      const nh = img.naturalHeight || 1;
      const scale = Math.min(1, SAMPLE_WIDTH / nw);
      const w = Math.max(1, Math.round(nw * scale));
      const h = Math.max(1, Math.round(nh * scale));
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(img, 0, 0, w, h);
      try {
        resolve({ rgba: g.getImageData(0, 0, w, h).data, w, h });
      } catch (err) { reject(err); }
    };
    img.onerror = () => reject(new Error('image load failed'));
    img.src = url;
  });

  (typeof createImageBitmap === 'function' ? viaImageBitmap() : viaImage())
    .catch(() => viaImage())
    .then(({ rgba, w, h }) => store(rgba, w, h))
    .catch((err) => {
      // Worth saying out loud: the consequence is silent, and it is that
      // falling stops working.
      // eslint-disable-next-line no-console
      console.warn('[levels] could not read floor image', url, '-', err.message,
        '- nothing will fall through this storey');
      store(null, 0, 0);
    });

  return null;
}

// Where a storey's image sits in map pixels.
export function levelRect(level, mapW, mapH) {
  return {
    x: Number(level?.offset_x) || 0,
    y: Number(level?.offset_y) || 0,
    w: Number(level?.width) || mapW,
    h: Number(level?.height) || mapH,
  };
}

const FLOOR_ALPHA_MIN = 24;

// Is there floor on this storey at this map point?
//
// Unknown counts as YES. If the image hasn't loaded, or couldn't be read, the
// safe answer is that the floor is there: dropping someone through a building
// because a picture was slow is far worse than briefly letting them stand where
// they shouldn't.
export function floorStateAt(level, mapW, mapH, mx, my, onReady) {
  if (!level?.image_path) return { floor: true, why: 'no image on this level' };
  const url = `/uploads/${level.image_path}`;
  const sampler = getFloorSampler(url, onReady);
  if (!sampler) {
    const state = cache.get(url);
    return {
      floor: true,
      why: state === 'loading' ? 'image still loading' : 'image unreadable',
    };
  }
  const r = levelRect(level, mapW, mapH);
  const px = Math.round(((mx - r.x) / (r.w || 1)) * sampler.w);
  const py = Math.round(((my - r.y) / (r.h || 1)) * sampler.h);
  if (px < 0 || py < 0 || px >= sampler.w || py >= sampler.h) {
    return { floor: false, why: 'outside the image' };
  }
  const a = sampler.a[py * sampler.w + px];
  return { floor: a >= FLOOR_ALPHA_MIN, why: `alpha ${a}` };
}

export function hasFloorAt(level, mapW, mapH, mx, my, onReady) {
  return floorStateAt(level, mapW, mapH, mx, my, onReady).floor;
}

// CAN this token fly — i.e. should it be offered the switch at all?
export function tokenCanFly(token) {
  return Number(token?.creature_speed_fly) > 0;
}

// Is it airborne right now?
//
// This, and not the fly speed, is what exempts a token from falling. A creature
// that can fly but is walking has just as far to drop off a balcony as anyone
// else, and treating capability as altitude meant every griffon and every
// aarakocra simply ignored the building.
export function tokenIsFlying(token) {
  return !!token?.is_flying;
}

// The storey a token ends up on after moving to a map point.
//
// The rule, in the order it is applied:
//
//   1. A map with no storeys has exactly one, and it is 0.
//   2. A token that is FLYING doesn't fall — flying now, not merely able to.
//      The GM may leave one on any storey; a player's flier is capped at the
//      top of the building, because a player choosing their own altitude above
//      the roof is a different feature from stepping off a balcony.
//   3. Otherwise the token falls until it finds floor: this storey if the art
//      is solid under the destination, else the highest one below it that is.
//      Reaching the ground with nothing solid on the way, it lands on the
//      ground — which is what "walking off the edge of a building" means.
//
// Returns the level index to land on.
export function landingLevel({
  levels, fromLevel, mapX, mapY, mapW, mapH, token, isGM, onReady,
}) {
  if (!levels || levels.length <= 1) return 0;
  const from = Math.max(0, Math.trunc(Number(fromLevel) || 0));
  const top = levels.reduce((m, l) => Math.max(m, Number(l.level_index) || 0), 0);

  if (tokenIsFlying(token)) {
    if (isGM) return from;
    return Math.min(from, top);
  }

  for (let i = from; i >= 0; i--) {
    const l = levels.find((x) => (Number(x.level_index) || 0) === i);
    if (!l) continue;
    if (hasFloorAt(l, mapW, mapH, mapX, mapY, onReady)) return i;
  }
  return 0;
}

// What a move means for a token's storey: the stairs it landed on, or the floor
// it fell to. Returns null when nothing changes.
//
// Lives here, not in a view, because BOTH views move tokens and the rule has to
// be the same in each. It was written once in the GM's view, which is why
// players fell through none of it and the 3D view inherited whatever the flat
// map happened to do.
//
// `col`/`row` are the token's new grid position (its top-left).
export function resolveLevelAfterMove({
  levels, token, col, row, mapW, mapH, gridSize, isGM, onReady, debug = false,
}) {
  if (!levels || levels.length <= 1 || !token) return null;
  const from = Number(token.level_index) || 0;
  const c = Number(col), r = Number(row);

  // A staircase first. Stepping onto stairs is deliberate; falling is not, and
  // a stair at the edge of a floor would otherwise be read as walking off it.
  const here = levels.find((l) => (Number(l.level_index) || 0) === from);
  const stair = (here?.transitions || []).find((t) => (
    c + 1 > t.col && c < t.col + (Number(t.w) || 1)
    && r + 1 > t.row && r < t.row + (Number(t.h) || 1)
  ));
  if (stair) {
    return { levelIndex: stair.to_level, gridCol: stair.to_col, gridRow: stair.to_row, reason: 'stairs' };
  }

  // Otherwise: is there still floor underfoot?
  const gs = Number(gridSize) || 50;
  // Same centring the renderers use for partial cells.
  const ox = gs > 0 ? ((Number(mapW) || 0) % gs) / 2 : 0;
  const oy = gs > 0 ? ((Number(mapH) || 0) % gs) / 2 : 0;
  const mx = ox + (c + 0.5) * gs;
  const my = oy + (r + 0.5) * gs;
  const to = landingLevel({
    levels, fromLevel: from, mapX: mx, mapY: my, mapW, mapH, token, isGM, onReady,
  });
  if (debug) {
    // Why each storey answered the way it did — "still loading", "unreadable"
    // and "alpha 0" are three different problems wearing the same result.
    const trace = [];
    for (let i = from; i >= 0; i--) {
      const l = levels.find((x) => (Number(x.level_index) || 0) === i);
      if (!l) continue;
      const st = floorStateAt(l, mapW, mapH, mx, my);
      trace.push(`L${i}: ${st.floor ? 'FLOOR' : 'empty'} (${st.why})`);
    }
    // eslint-disable-next-line no-console
    console.warn('[levels] move resolved —', 'from:', from, 'to:', to,
      '| col/row:', c.toFixed(2), r.toFixed(2),
      '| map px:', mx.toFixed(0), my.toFixed(0),
      '|', trace.join(' | '));
  }
  if (to === from) return null;
  return { levelIndex: to, gridCol: c, gridRow: r, reason: 'fell' };
}

// ── Altitude → storey ────────────────────────────────────────────────────────
//
// A token carries TWO heights: `level_index`, the storey it is standing on, and
// `elevation`, how many feet it is flying ABOVE that storey's floor. Neither
// alone says where the creature actually is. A player on the ground floor who
// flies up thirty feet is level with the third storey, and the views have to
// agree about that — the "hide the floors above" button cuts the stack at the
// viewer's floor, and cutting at the floor they took off from left a flier
// staring at the underside of a ceiling they were well above.
//
// The heights come from map settings: each row's `height_ft` is that storey's
// own height, so the stack is a running total rather than index × 10.

export const DEFAULT_LEVEL_HEIGHT_FT = 10;

// One storey's height in feet. Zero, blank and nonsense all mean "the default",
// which matches the column default so a map imported before the field existed
// stacks the way it always did.
export function levelHeightFt(level) {
  const h = Number(level?.height_ft);
  return Number.isFinite(h) && h > 0 ? h : DEFAULT_LEVEL_HEIGHT_FT;
}

// How high a storey's FLOOR sits above the ground floor, in feet: the heights
// of everything underneath it.
//
// Summed over the rows below rather than multiplied out, because level indices
// routinely have gaps — delete a storey and the rest keep their numbers — and a
// gap would otherwise become empty air.
export function levelBaseFt(levels, index) {
  const idx = Math.trunc(Number(index) || 0);
  let y = 0;
  for (const l of levels || []) {
    if ((Number(l.level_index) || 0) >= idx) continue;
    y += levelHeightFt(l);
  }
  return y;
}

// Where a token actually is, in feet above the ground floor.
//
// `elevation` is measured from the floor the token is standing on — that is how
// the 3D view draws it — so it adds to that storey's base rather than replacing
// it.
export function tokenAltitudeFt(levels, token) {
  return levelBaseFt(levels, Number(token?.level_index) || 0)
    + (Number(token?.elevation) || 0);
}

// Which storey a token's ALTITUDE puts it in.
//
// The storey whose floor is the highest one at or below the token: standing on
// a floor counts as being on it, and so does hovering a foot below the next
// one up. Flying exactly to the next floor's height counts as reaching it.
//
// Derived, never stored. The token's own `level_index` still says which floor
// it is standing on, which is what falling and the stairs care about; this is
// the answer to "what is it level WITH", which is what the views draw by.
//
// Clamped to the storeys that exist: a flier above the roof is on the top
// floor, and one below the ground floor (a negative elevation in a cellarless
// building) is on the bottom one.
export function occupiedLevel(levels, token) {
  const rows = levels || [];
  const stored = Math.trunc(Number(token?.level_index) || 0);
  if (rows.length <= 1) return rows.length ? (Number(rows[0].level_index) || 0) : 0;

  const elev = Number(token?.elevation) || 0;
  // The overwhelmingly common case, and it must not drift: a token that isn't
  // flying is on the storey it says it is on, whatever the heights add up to.
  if (!elev) return stored;

  const alt = tokenAltitudeFt(rows, token);
  const ordered = [...rows].sort(
    (a, b) => (Number(a.level_index) || 0) - (Number(b.level_index) || 0)
  );
  // Float tolerance: heights are user-typed feet and a 10 + 10 that lands on
  // 19.999999 must still count as having reached the second floor.
  const EPS = 1e-6;
  let out = Number(ordered[0].level_index) || 0;
  for (const l of ordered) {
    const li = Number(l.level_index) || 0;
    if (levelBaseFt(rows, li) <= alt + EPS) out = li;
    else break;
  }
  return out;
}
