// Line-of-sight geometry, on the server.
//
// A DELIBERATE SECOND COPY of the pure-maths half of
// frontend/src/utils/los.js. That file is the original and stays the one the
// renderer uses; this one exists because the backend cannot import it.
//
// Why a copy at all, when this project's habit is to extract a shared rule so
// two versions cannot disagree (conditions.js, terrainVisibility.js, the note
// at the top of tileSegments.js):
//
//   * The two Docker builds have separate contexts — `build: ./backend` and
//     `build: ./frontend` — so neither image can see a file in the other tree,
//     and a shared directory above them is in NEITHER build.
//   * los.js is an ES module and this is CommonJS. Reaching it would mean a
//     dynamic import on a path that does not exist in the image anyway.
//
// So the codebase already does this where it must: the condition list is
// duplicated between the client and backend/src/tileSpawns.js, managed by a
// comment saying the two have to agree. This is the same arrangement.
//
// WHAT HAS TO STAY IN STEP, and why it matters more here than for a condition
// list: the client uses this maths to decide what a PLAYER sees, and this file
// uses it to decide what a GUARD sees. If they drift, a player walks through a
// doorway their own screen says is solid and is spotted by a guard who,
// according to that screen, is looking at a wall. Keep these identical to
// los.js and change them together:
//
//     raySegIntersect · wallToSegments · wallsToSegments
//     doorCentrelineSegments · doorToSegments · doorsToSegments · lineBlocked
//
// Everything else in los.js — the visibility polygon, ledges, windows, fog
// blocks — is renderer-only and deliberately absent. Detection asks one
// question per pair ("is the line blocked?"), which is far cheaper than a
// polygon and is all the engine needs.

const EPS = 1e-9;

// Does ray from (ox,oy) in direction (dx,dy) hit segment (ax,ay)-(bx,by)?
// Returns t (positive distance along ray) if yes, else null.
function raySegIntersect(ox, oy, dx, dy, ax, ay, bx, by) {
  const rx = bx - ax, ry = by - ay;
  const denom = dx * ry - dy * rx;
  if (Math.abs(denom) < EPS) return null;
  const t = ((ax - ox) * ry - (ay - oy) * rx) / denom;
  const u = ((ax - ox) * dy - (ay - oy) * dx) / denom;
  if (t > EPS && u >= -EPS && u <= 1 + EPS) return t;
  return null;
}

// Convert one wall object to an array of { ax, ay, bx, by } segments.
// Ledges and windows never block LOS — both are handled as a dim overlay in
// the renderer, which has no equivalent here: a guard either sees you or does
// not, so a ledge is simply transparent to detection.
function wallToSegments(wall) {
  // `points` arrives from the database as JSON and may still be a string on
  // some rows; the client never sees that because the socket layer parses it.
  let pts = wall.points;
  if (typeof pts === 'string') { try { pts = JSON.parse(pts); } catch { return []; } }
  if (!Array.isArray(pts)) return [];
  const segs = [];

  if (wall.type === 'ledge' || wall.type === 'window') return [];

  if (wall.type === 'line') {
    if (pts.length >= 4) segs.push({ ax: +pts[0], ay: +pts[1], bx: +pts[2], by: +pts[3] });
  } else if (wall.type === 'rect') {
    if (pts.length >= 4) {
      const [x1, y1, x2, y2] = pts.map(Number);
      segs.push({ ax: x1, ay: y1, bx: x2, by: y1 });
      segs.push({ ax: x2, ay: y1, bx: x2, by: y2 });
      segs.push({ ax: x2, ay: y2, bx: x1, by: y2 });
      segs.push({ ax: x1, ay: y2, bx: x1, by: y1 });
    }
  } else if (wall.type === 'poly' || wall.type === 'polygon') {
    for (let i = 0; i + 3 < pts.length; i += 2) {
      segs.push({ ax: +pts[i], ay: +pts[i + 1], bx: +pts[i + 2], by: +pts[i + 3] });
    }
  } else if (pts.length >= 4) {
    // Unknown type with a usable pair of points: treat it as a line rather
    // than silently dropping an occluder. A wall the engine cannot read is a
    // guard who can see through it.
    segs.push({ ax: +pts[0], ay: +pts[1], bx: +pts[2], by: +pts[3] });
  }

  return segs;
}

function wallsToSegments(walls) {
  return (walls || []).flatMap(wallToSegments);
}

// Doors block LOS along the leaf's actual position — see the long note in
// los.js. Schematic doors block on the centreline when closed and are clear
// when open; sprite doors follow the visible leaf.
function doorCentrelineSegments(door) {
  let pts = door.points;
  if (typeof pts === 'string') { try { pts = JSON.parse(pts); } catch { return []; } }
  if (!Array.isArray(pts) || pts.length < 4) return [];
  const [x1, y1, x2, y2] = pts.map(Number);

  // A window never blocks sight, open or shut.
  if (door.portal_kind === 'window') return [];

  if (!door.is_open) return [{ ax: x1, ay: y1, bx: x2, by: y2 }];
  if (!door.sprite_path) return [];

  const len = Math.hypot(x2 - x1, y2 - y1);
  if (len < 2) return [];
  const ux = (x2 - x1) / len, uy = (y2 - y1) / len;
  const dir = door.open_dir === -1 ? -1 : 1;
  const px = -uy * dir, py = ux * dir;
  const motion = (door.sprite_motion === 'slide' || door.sprite_motion === 'double')
    ? door.sprite_motion : 'swing';

  if (motion === 'slide') return [];
  if (motion === 'double') {
    const half = len / 2;
    return [
      { ax: x1, ay: y1, bx: x1 + px * half, by: y1 + py * half },
      { ax: x2, ay: y2, bx: x2 + px * half, by: y2 + py * half },
    ];
  }
  return [{ ax: x1, ay: y1, bx: x1 + px * len, by: y1 + py * len }];
}

function doorToSegments(door, opts = {}) {
  const base = doorCentrelineSegments(door);
  const { ox, oy, thickness = 0 } = opts;
  if (!(thickness > 0) || ox == null || oy == null || base.length === 0) return base;

  const out = [];
  for (const s of base) {
    const dx = s.bx - s.ax, dy = s.by - s.ay;
    const l = Math.hypot(dx, dy);
    if (l < 1e-6) { out.push(s); continue; }
    let nx = -dy / l, ny = dx / l;
    const mx = (s.ax + s.bx) / 2, my = (s.ay + s.by) / 2;
    if ((ox - mx) * nx + (oy - my) * ny > 0) { nx = -nx; ny = -ny; }
    const off = thickness / 2;
    const a2x = s.ax + nx * off, a2y = s.ay + ny * off;
    const b2x = s.bx + nx * off, b2y = s.by + ny * off;
    out.push({ ax: s.ax, ay: s.ay, bx: a2x, by: a2y });
    out.push({ ax: a2x,  ay: a2y,  bx: b2x, by: b2y });
    out.push({ ax: s.bx, ay: s.by, bx: b2x, by: b2y });
  }
  return out;
}

function doorsToSegments(doors, opts = {}) {
  const { thicknessOf, ...rest } = opts;
  if (!thicknessOf) return (doors || []).flatMap(d => doorToSegments(d, rest));
  return (doors || []).flatMap(d => doorToSegments(d, { ...rest, thickness: thicknessOf(d) }));
}

// Is the line from (ax,ay) to (bx,by) blocked by any segment?
function lineBlocked(ax, ay, bx, by, wallSegs) {
  const dx = bx - ax;
  const dy = by - ay;
  if (dx === 0 && dy === 0) return false;
  for (const seg of wallSegs) {
    const t = raySegIntersect(ax, ay, dx, dy, seg.ax, seg.ay, seg.bx, seg.by);
    if (t !== null && t < 1 - 1e-6) return true;
  }
  return false;
}

// Is (px,py) inside a magical-darkness / fog zone? Circle or polygon, matching
// the client's pointInZone.
function pointInZone(px, py, zone) {
  const poly = Array.isArray(zone.poly_points) ? zone.poly_points.map(Number) : null;
  if (zone.shape === 'polygon' && poly && poly.length >= 6) {
    let inside = false;
    for (let i = 0, j = poly.length - 2; i < poly.length; j = i, i += 2) {
      const xi = poly[i], yi = poly[i + 1], xj = poly[j], yj = poly[j + 1];
      if (((yi > py) !== (yj > py)) && (px < ((xj - xi) * (py - yi)) / (yj - yi + 1e-9) + xi)) {
        inside = !inside;
      }
    }
    return inside;
  }
  const r = Number(zone.radius) || 0;
  return r > 0 && Math.hypot(px - Number(zone.x), py - Number(zone.y)) <= r;
}

// Smallest absolute angle between two bearings, in degrees.
function angleBetween(a, b) {
  let d = ((Number(a) - Number(b)) % 360 + 540) % 360 - 180;
  return Math.abs(d);
}

// Bearing from one point to another, in degrees clockwise from NORTH (up the
// map), which is how a GM reads a compass and how light `direction` is stored.
function bearing(fromX, fromY, toX, toY) {
  // Map y grows downward, so "up" is -y; atan2(dx, -dy) puts 0 at north and
  // increases clockwise.
  return (Math.atan2(toX - fromX, -(toY - fromY)) * 180 / Math.PI + 360) % 360;
}

module.exports = {
  raySegIntersect,
  wallToSegments, wallsToSegments,
  doorCentrelineSegments, doorToSegments, doorsToSegments,
  lineBlocked, pointInZone, angleBetween, bearing,
};
