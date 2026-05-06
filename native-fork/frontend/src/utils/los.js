// Line-of-sight / visibility polygon computation.
// All coordinates are in map-pixel space (origin = top-left of map image).

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
// Ledges never block LOS — they are handled separately as a dim overlay beyond
// their line when observed from the "below" side.
export function wallToSegments(wall) {
  const pts = wall.points;
  const segs = [];

  if (wall.type === 'ledge') {
    return [];
  }

  if (wall.type === 'line') {
    if (pts.length >= 4) segs.push({ ax: pts[0], ay: pts[1], bx: pts[2], by: pts[3] });

  } else if (wall.type === 'rect') {
    if (pts.length >= 4) {
      const [x1, y1, x2, y2] = pts;
      segs.push({ ax: x1, ay: y1, bx: x2, by: y1 });
      segs.push({ ax: x2, ay: y1, bx: x2, by: y2 });
      segs.push({ ax: x2, ay: y2, bx: x1, by: y2 });
      segs.push({ ax: x1, ay: y2, bx: x1, by: y1 });
    }

  } else if (wall.type === 'polygon') {
    const n = Math.floor(pts.length / 2);
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      segs.push({ ax: pts[i * 2], ay: pts[i * 2 + 1], bx: pts[j * 2], by: pts[j * 2 + 1] });
    }

  } else if (wall.type === 'circle') {
    // [cx, cy, r] — approximate with 32 segments
    const [cx, cy, r] = pts;
    const N = 32;
    for (let i = 0; i < N; i++) {
      const a0 = (i / N) * Math.PI * 2;
      const a1 = ((i + 1) / N) * Math.PI * 2;
      segs.push({
        ax: cx + Math.cos(a0) * r, ay: cy + Math.sin(a0) * r,
        bx: cx + Math.cos(a1) * r, by: cy + Math.sin(a1) * r,
      });
    }
  }

  return segs;
}

// Convert all walls to a flat segment array.
export function wallsToSegments(walls) {
  return walls.flatMap(wallToSegments);
}

// Closed doors block LOS exactly like a line wall.
export function doorToSegments(door) {
  if (door.is_open) return [];
  const pts = door.points;
  if (!pts || pts.length < 4) return [];
  return [{ ax: pts[0], ay: pts[1], bx: pts[2], by: pts[3] }];
}

export function doorsToSegments(doors) {
  return doors.flatMap(doorToSegments);
}

function boundarySegs(mapW, mapH) {
  return [
    { ax: 0,    ay: 0,    bx: mapW, by: 0    },
    { ax: mapW, ay: 0,    bx: mapW, by: mapH },
    { ax: mapW, ay: mapH, bx: 0,    by: mapH },
    { ax: 0,    ay: mapH, bx: 0,    by: 0    },
  ];
}

// Cheap point-to-point line-of-sight test. Returns true if the line from
// (ax,ay) to (bx,by) is blocked by any segment in `wallSegs`. Used by the
// combat picker's "auto-select tokens visible from the selected token"
// feature — much cheaper than building a full visibility polygon when all
// you need is a yes/no per candidate.
export function lineBlocked(ax, ay, bx, by, wallSegs) {
  const dx = bx - ax;
  const dy = by - ay;
  if (dx === 0 && dy === 0) return false;
  for (const seg of wallSegs) {
    const t = raySegIntersect(ax, ay, dx, dy, seg.ax, seg.ay, seg.bx, seg.by);
    // raySegIntersect returns t along the ray direction; we travel exactly
    // length 1 in that direction (since dx,dy = full delta). t < 1 means
    // the wall is between the two points.
    if (t !== null && t < 1 - 1e-6) return true;
  }
  return false;
}

// Compute the visibility polygon from (ox, oy) given wall segments.
// Returns a flat [x1,y1,x2,y2,...] array for Konva Line.
export function computeVisibilityPolygon(ox, oy, wallSegs, mapW, mapH) {
  const allSegs = [...boundarySegs(mapW, mapH), ...wallSegs];

  // Collect unique endpoints — boundary corners + wall endpoints
  const endpoints = [
    { x: 0,    y: 0    },
    { x: mapW, y: 0    },
    { x: mapW, y: mapH },
    { x: 0,    y: mapH },
  ];
  for (const s of wallSegs) {
    endpoints.push({ x: s.ax, y: s.ay });
    endpoints.push({ x: s.bx, y: s.by });
  }

  // For each endpoint: 3 ray angles (just before, at, just after) to handle corners
  const angles = new Set();
  for (const ep of endpoints) {
    const a = Math.atan2(ep.y - oy, ep.x - ox);
    angles.add(a - 0.00001);
    angles.add(a);
    angles.add(a + 0.00001);
  }

  // Cast each ray, find nearest segment hit
  const hits = [];
  for (const angle of angles) {
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    let minT = Infinity;

    for (const seg of allSegs) {
      const t = raySegIntersect(ox, oy, dx, dy, seg.ax, seg.ay, seg.bx, seg.by);
      if (t !== null && t < minT) minT = t;
    }

    if (minT < Infinity) {
      hits.push({ angle, x: ox + dx * minT, y: oy + dy * minT });
    }
  }

  hits.sort((a, b) => a.angle - b.angle);

  const flat = [];
  for (const h of hits) flat.push(h.x, h.y);
  return flat;
}

// Compute visibility polygons for multiple origins (union of player positions).
// Returns an array of flat point arrays.
export function computeMultiVisibility(origins, wallSegs, mapW, mapH) {
  return origins.map(({ x, y }) => computeVisibilityPolygon(x, y, wallSegs, mapW, mapH));
}

// Ledges: line segments with an "above" side. Drawn from A to B; the above
// (unimpeded) side is the LEFT of the A→B direction — a typical cartographic
// convention. Origins on the above side see through freely; origins on the
// below side see the far side of the ledge, but everything on that far side is
// treated as dim ambient light.
//
// Returns null if the wall is not a ledge.
export function ledgeData(wall) {
  if (!wall || wall.type !== 'ledge' || !wall.points || wall.points.length < 4) return null;
  const [ax, ay, bx, by] = wall.points;
  return { ax, ay, bx, by };
}

// Returns +1 if the origin is on the ledge's "above" (unimpeded) side,
// -1 if it is on the "below" (dim-view) side, 0 if collinear.
// Above side is LEFT of A→B, i.e. cross((B-A), (O-A)) > 0 in canvas coords
// (y axis inverted).
export function ledgeSide(ledge, ox, oy) {
  const { ax, ay, bx, by } = ledge;
  const c = (bx - ax) * (oy - ay) - (by - ay) * (ox - ax);
  if (c > 1e-6) return -1;  // below (canvas y increases downward; "left" = negative cross)
  if (c < -1e-6) return 1;  // above
  return 0;
}

// Build a large polygon covering the "far side" of the ledge from the origin
// (the area the origin sees but through the ledge).  Used to clip the dim overlay.
// Returns flat [x,y,...] array, or null if the origin is on the above side.
export function ledgeFarSidePolygon(ledge, ox, oy, mapW, mapH) {
  const side = ledgeSide(ledge, ox, oy);
  if (side >= 0) return null; // above side or on the ledge: no dim effect
  const { ax, ay, bx, by } = ledge;
  // Shadow cone from origin: cast rays from origin through A and B and
  // extend them past the ledge. Anything the origin can see through the
  // ledge falls inside this cone, so the dim overlay correctly covers the
  // full far side regardless of viewing angle. The downstream clip to the
  // origin's LOS polygon caps the cone at endpoint A/B for points the origin
  // can't actually see past.
  const L = Math.max(mapW, mapH) * 4;
  const aDx = ax - ox, aDy = ay - oy;
  const aLen = Math.hypot(aDx, aDy) || 1;
  const aFx = ax + (aDx / aLen) * L;
  const aFy = ay + (aDy / aLen) * L;
  const bDx = bx - ox, bDy = by - oy;
  const bLen = Math.hypot(bDx, bDy) || 1;
  const bFx = bx + (bDx / bLen) * L;
  const bFy = by + (bDy / bLen) * L;
  return [ax, ay, bx, by, bFx, bFy, aFx, aFy];
}
