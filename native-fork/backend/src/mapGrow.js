const db = require('./db');
const fs = require('fs');
const path = require('path');

// Growing a tile map to fit what has been laid on it.
//
// A tile map has no fixed extent the way a drawn battlemap does: it is created
// as a blank lattice and the dungeon appears inside it a card at a time. Sooner
// or later the GM lays a tile past the edge, and everything that reads the
// map's declared size — the grid overlay, the fog polygons, the 3D ground —
// stops at the old boundary while the tile sits outside it.
//
// Two directions, and they are NOT symmetrical:
//
//   RIGHT and DOWN are free. The origin does not move, so nothing already on
//   the board changes; the map simply gets bigger.
//
//   LEFT and UP mean moving the origin, and every coordinate on the map is
//   measured from it. So the whole board is shifted by the same amount first,
//   and only then does it grow. Get one table wrong here and its contents end
//   up offset from everything else, so the list below is derived from the
//   schema rather than from memory — every table with a map_id and a
//   coordinate is in it.

// Coordinates in GRID SQUARES, offset by (dCol, dRow).
const GRID_TABLES = ['map_tiles', 'map_terrain', 'map_portals', 'map_ships', 'dm_markers'];

// Coordinates in MAP PIXELS, held as flat JSON arrays [x1,y1,x2,y2,...].
const POINT_TABLES = ['walls', 'doors', 'map_fog_blocks'];

/**
 * Make sure `mapId` covers the given extent, in grid squares.
 *
 * Returns { dCol, dRow, cols, rows, width, height, changed, shifted }.
 * `dCol`/`dRow` are what the CALLER must add to its own coordinates: when the
 * board shifts, the thing being placed shifts with it.
 */
async function ensureMapCovers(mapId, minCol, minRow, maxCol, maxRow) {
  const map = (await db.query(
    'SELECT id, grid_size, grid_cols, grid_rows, map_type FROM maps WHERE id=$1', [mapId]
  )).rows[0];
  const none = { dCol: 0, dRow: 0, changed: false, shifted: false };
  if (!map) return none;

  const gridSize = Number(map.grid_size) || 50;
  const cols = Number(map.grid_cols) || 0;
  const rows = Number(map.grid_rows) || 0;
  // A map with no lattice recorded is not one this can reason about — an
  // ordinary image map has a fixed extent set by its artwork.
  if (!cols || !rows) return none;

  // A margin, so the board is not re-grown on every single tile at the edge.
  // Two squares is enough to absorb the next placement without leaving an
  // obvious apron of empty grid around the dungeon.
  const PAD = 2;

  const dCol = minCol < 0 ? Math.ceil(-minCol) + PAD : 0;
  const dRow = minRow < 0 ? Math.ceil(-minRow) + PAD : 0;
  const needCols = Math.ceil(Math.max(cols + dCol, maxCol + dCol + PAD));
  const needRows = Math.ceil(Math.max(rows + dRow, maxRow + dRow + PAD));

  if (!dCol && !dRow && needCols <= cols && needRows <= rows) return none;

  const px = (n) => n * gridSize;

  // ── Shift, if the origin has to move ────────────────────────────────────
  if (dCol || dRow) {
    for (const t of GRID_TABLES) {
      await db.query(
        `UPDATE ${t} SET grid_col = grid_col + $1, grid_row = grid_row + $2 WHERE map_id = $3`,
        [dCol, dRow, mapId]
      );
    }
    // Tokens are grid-based too, but scoped by map_id like the rest.
    await db.query(
      'UPDATE session_tokens SET grid_col = grid_col + $1, grid_row = grid_row + $2 WHERE map_id = $3',
      [dCol, dRow, mapId]
    );

    // Flat [x,y,x,y,…] arrays: every even index is an x, every odd one a y.
    for (const t of POINT_TABLES) {
      await db.query(
        `UPDATE ${t} SET points = (
           SELECT jsonb_agg(
             CASE WHEN (ord - 1) % 2 = 0 THEN to_jsonb(val::float8 + $1)
                                          ELSE to_jsonb(val::float8 + $2) END
             ORDER BY ord)
             FROM jsonb_array_elements_text(points) WITH ORDINALITY AS e(val, ord)
         )
         WHERE map_id = $3 AND jsonb_typeof(points) = 'array' AND jsonb_array_length(points) > 0`,
        [px(dCol), px(dRow), mapId]
      );
    }

    await db.query(
      'UPDATE light_sources SET x = x + $1, y = y + $2 WHERE map_id = $3',
      [px(dCol), px(dRow), mapId]
    );
    await db.query(
      'UPDATE magical_darkness SET x = x + $1, y = y + $2 WHERE map_id = $3',
      [px(dCol), px(dRow), mapId]
    );
    // Its polygon, when it has one.
    await db.query(
      `UPDATE magical_darkness SET poly_points = (
         SELECT jsonb_agg(
           CASE WHEN (ord - 1) % 2 = 0 THEN to_jsonb(val::float8 + $1)
                                        ELSE to_jsonb(val::float8 + $2) END
           ORDER BY ord)
           FROM jsonb_array_elements_text(poly_points) WITH ORDINALITY AS e(val, ord)
       )
       WHERE map_id = $3 AND jsonb_typeof(poly_points) = 'array' AND jsonb_array_length(poly_points) > 0`,
      [px(dCol), px(dRow), mapId]
    );
    // Spawn points carry a grid position and, optionally, a pixel polygon.
    await db.query(
      'UPDATE map_spawn_points SET grid_col = grid_col + $1, grid_row = grid_row + $2 WHERE map_id = $3',
      [dCol, dRow, mapId]
    );
    // Storeys are placed by pixel offset from the map's origin.
    await db.query(
      'UPDATE map_levels SET offset_x = COALESCE(offset_x,0) + $1, offset_y = COALESCE(offset_y,0) + $2 WHERE map_id = $3',
      [px(dCol), px(dRow), mapId]
    );
  }

  // ── Grow ────────────────────────────────────────────────────────────────
  const width = needCols * gridSize;
  const height = needRows * gridSize;
  await db.query(
    'UPDATE maps SET grid_cols=$1, grid_rows=$2, width=$3, height=$4 WHERE id=$5',
    [needCols, needRows, width, height, mapId]
  );
  // And the board's own picture with it.
  //
  // A tile map's ground is a flat dark field generated at creation, and until
  // now it kept the size it was born with however far the dungeon spread. That
  // is not cosmetic: the FLAT MAP MEASURES THE BOARD BY THAT IMAGE
  // (`imgDims?.w || mapWidth` in MapStage), so once a map had grown, every
  // client was working to the original extent. The visibility polygon is
  // bounded by it — so a party standing outside the old rectangle got a
  // degenerate polygon, no hole was punched in the fog, and the players' flat
  // map was simply black. Live board 42 had grown 40x40 -> 153x117 while its
  // SVG still said 10240x10240.
  await redrawGroundImage(mapId, width, height);

  return {
    dCol, dRow,
    cols: needCols, rows: needRows,
    width, height,
    changed: true,
    shifted: !!(dCol || dRow),
    gridSize,
  };
}

// Where uploads actually live.
//
// The Docker build writes them under the backend dir; the native desktop build
// puts them in a per-user writable dir and says so through its own `paths`
// module, which only exists in that tree. Asking for it and falling back keeps
// one file correct in both, with no patch for the sync script to re-apply —
// and a repaint that silently wrote nowhere is exactly the class of bug this
// function was added to fix.
function uploadsDir() {
  try { return require('./paths').UPLOADS_DIR; }
  catch { return path.join(__dirname, '../uploads'); }
}

// Repaint a tile map's ground field at `width` x `height`.
//
// Same flat rectangle the map was created with (see POST /api/maps/tiles); the
// only thing that changes is how big it says it is. Written in place, so every
// row that already points at this file keeps working and no client has to
// learn a new URL.
//
// Best effort on purpose: a board that has grown but could not repaint its
// backdrop is still a board, and throwing here would fail the tile placement
// that triggered it.
async function redrawGroundImage(mapId, width, height) {
  try {
    const row = (await db.query(
      "SELECT image_path FROM maps WHERE id=$1 AND map_type='tiles'", [mapId]
    )).rows[0];
    const rel = row && row.image_path;
    // Generated fields only. A GM who has put real art under their tiles owns
    // that file, and it is not ours to overwrite.
    if (!rel || !/\.svg$/i.test(rel)) return;
    const file = path.join(uploadsDir(), rel);
    if (!fs.existsSync(file)) return;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" `
      + `viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#0d0f14"/></svg>`;
    fs.writeFileSync(file, svg, 'utf8');
  } catch (err) {
    console.error('[tiles] could not repaint the ground image for map', mapId, err.message);
  }
}

module.exports = { ensureMapCovers, GRID_TABLES, POINT_TABLES, redrawGroundImage };
