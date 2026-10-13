// Patrols — tokens that walk their route on their own.
//
// A patrol is a list of waypoints in grid coordinates, a speed in feet per round,
// and what to do at the end of the list. The runner below advances each patrolling
// token a little every tick and broadcasts the move as an ordinary `token_moved`.
//
// THE MOVE HAS TO BE AN ORDINARY MOVE
//
// Fog of war and line of sight are computed in the CLIENTS from token positions;
// nothing on the server decides what a player can see. So a patrol that wrote
// straight to the database and said nothing would be invisible until a reload,
// and one that invented its own event would need every viewer taught about it.
// Emitting exactly what dragging a token emits means walls block a guard's torch,
// fog hides it, and the 3D view follows — with no new code in any of them.
//
// SPEED
//
// Denominated in feet per ROUND, because that is how the game denominates it and
// how the GM will pick it: a guard patrols at its own 30 ft walking speed. A round
// is 6 seconds, so the distance covered per tick is speed/6 × seconds elapsed,
// converted to squares at 5 ft per square.
//
// Deliberately real time rather than per-round steps: a guard that teleports one
// full move every six seconds looks like a bug, and the whole point is that the
// party sees it coming down the corridor.

const { tokenExtent } = require('./ships');

const FEET_PER_SQUARE = 5;
const SECONDS_PER_ROUND = 6;

// How often the runner steps each patrol.
//
// Half a second, which is where this started. Four rounds of trying to make the
// motion continuous — client tweens, a 30fps position stream, and finally
// computing the walk in the client the way animated terrain is computed — all
// looked worse than plain steps, so plain steps is what it does.
//
// Every tick: move, write, and broadcast the ordinary `token_moved` that a dragged
// token sends. One rate, one code path, nothing to fall out of step with.
const TICK_MS = 500;


// Distance below which a waypoint counts as reached, in squares.
//
// Small enough to be under one frame's travel for any sane speed: at 30 ticks a
// second even a 5 ft crawler covers 0.0055 squares per frame, and an epsilon
// larger than that would have it "arriving" for several frames in a row — which
// mattered when arrival forced a database write.
const ARRIVE_EPS = 0.002;

const MODES = new Set(['loop', 'pingpong', 'once']);

function cleanWaypoints(list) {
  if (!Array.isArray(list)) return [];
  const out = [];
  for (const p of list.slice(0, 200)) {
    const col = Number(p?.col ?? p?.gridCol);
    const row = Number(p?.row ?? p?.gridRow);
    if (!Number.isFinite(col) || !Number.isFinite(row)) continue;
    // Clamped to something sane: a waypoint off in the millions would send a
    // token walking forever in a direction nobody can follow.
    out.push({ col: Math.max(-500, Math.min(5000, col)), row: Math.max(-500, Math.min(5000, row)) });
  }
  return out;
}

function cleanSpeed(ft) {
  const n = Number(ft);
  if (!Number.isFinite(n)) return 30;
  return Math.max(5, Math.min(500, Math.round(n)));
}

function cleanMode(mode) {
  return MODES.has(String(mode)) ? String(mode) : 'loop';
}

async function migrate(db) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS token_patrols (
      id SERIAL PRIMARY KEY,
      session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      token_id INTEGER NOT NULL REFERENCES session_tokens(id) ON DELETE CASCADE,
      waypoints JSONB NOT NULL DEFAULT '[]',
      speed_ft INTEGER NOT NULL DEFAULT 30,
      mode VARCHAR(10) NOT NULL DEFAULT 'loop',
      active BOOLEAN NOT NULL DEFAULT true,
      next_index INTEGER NOT NULL DEFAULT 0,
      direction INTEGER NOT NULL DEFAULT 1,
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  // One route per token: a second would have two runners fighting over the same
  // grid_col every tick.
  await db.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_token_patrols_token ON token_patrols(token_id)`);
  await db.query(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS patrols_paused BOOLEAN DEFAULT false`);

  // Pausing is per MAP, not per session.
  //
  // One flag for the whole session meant the GM freezing the guards in the
  // undercroft also froze a patrol three maps away that nobody was looking at —
  // and, worse, that the button's meaning depended on which map happened to be
  // open. A map is the thing a patrol belongs to, so it is the thing that holds
  // whether its patrols are walking.
  //
  // The column is added and back-filled in ONE step, guarded on whether it
  // already exists, so a session that was paused when this shipped stays paused
  // instead of quietly starting to walk again on the next restart.
  const hasCol = (await db.query(
    `SELECT 1 FROM information_schema.columns WHERE table_name='maps' AND column_name='patrols_paused'`
  )).rows.length > 0;
  if (!hasCol) {
    await db.query(`ALTER TABLE maps ADD COLUMN patrols_paused BOOLEAN NOT NULL DEFAULT false`);
    await db.query(`UPDATE maps m SET patrols_paused = true
                      FROM sessions s
                     WHERE s.id = m.session_id AND COALESCE(s.patrols_paused, false) = true`);
  }
}

/**
 * Advance one patrol by `dtMs`.
 *
 * Pure: takes the current position and the route, returns where the token should
 * be now and which waypoint it is heading for. Kept free of the database so the
 * arithmetic can be tested without one — the part most likely to be subtly wrong
 * is the part hardest to check by staring at a map.
 *
 * @returns {{ col, row, nextIndex, direction, arrived, finished }}
 */
function step(pos, patrol, dtMs) {
  const wps = patrol.waypoints;
  if (wps.length < 2) return { ...pos, nextIndex: patrol.next_index, direction: patrol.direction, finished: true };

  let { col, row } = pos;
  let idx = Math.max(0, Math.min(wps.length - 1, patrol.next_index));
  let dir = patrol.direction >= 0 ? 1 : -1;
  let finished = false;
  let arrived = false;

  // Feet per second → squares for this tick.
  let budget = (patrol.speed_ft / SECONDS_PER_ROUND) * (dtMs / 1000) / FEET_PER_SQUARE;

  // A slow token and a short tick can leave the budget under the arrival epsilon
  // forever; guarding the loop on budget alone would then spin.
  let guard = 0;
  while (budget > 0 && guard++ < 64) {
    const target = wps[idx];
    const dx = target.col - col;
    const dy = target.row - row;
    const dist = Math.hypot(dx, dy);

    if (dist <= Math.max(budget, ARRIVE_EPS)) {
      // Land on it, spend what it cost, and pick the next one.
      col = target.col;
      row = target.row;
      budget -= dist;
      arrived = true;

      if (patrol.mode === 'loop') {
        idx = (idx + 1) % wps.length;
      } else if (patrol.mode === 'pingpong') {
        if (idx + dir >= wps.length || idx + dir < 0) {
          dir = -dir;                       // turn round at the end
        }
        idx += dir;
      } else {                              // 'once'
        if (idx >= wps.length - 1) { finished = true; break; }
        idx += 1;
      }
    } else {
      col += (dx / dist) * budget;
      row += (dy / dist) * budget;
      budget = 0;
    }
  }

  return { col, row, nextIndex: idx, direction: dir, arrived, finished };
}

/**
 * Start the runner. One interval for the whole server, not one per session:
 * patrols are few, and a timer per session is a leak waiting for a GM who opens
 * twenty of them.
 */
function startRunner({ db, io, hasWatcher = null, onMoved = null }) {
  let last = Date.now();
  let running = false;

  const tick = async () => {
    // Overlap guard FIRST, and the clock only moves when a tick actually runs.
    //
    // These were the other way round, so a tick that bailed because the previous
    // one was still going still reset the clock — and the elapsed time it had
    // skipped was lost. The token then moved less than it should have for that
    // stretch, which reads as a stutter at exactly the moment the server is busy.
    if (running) return;
    running = true;
    const now = Date.now();
    // Capped at a few ticks' worth, NOT at two seconds.
    //
    // The old cap let a stalled tick — a slow query, a busy event loop — hand the
    // next one up to two seconds of catch-up, which it spent in a single step. At
    // walking pace that is a leap of several squares, and since the step loop will
    // happily traverse several waypoints in one go, it looked exactly like "a few
    // small steps and then a jump to the next waypoint". Losing a fraction of a
    // second of progress under load is invisible; teleporting is not.
    // Capped at a couple of ticks' worth. A stall must not hand the next tick a
    // second of catch-up to spend in one step: at walking pace that is a leap of
    // several squares, and since the step loop will cross waypoints if the budget
    // allows, it looked like "a few steps and then a jump to the next waypoint".
    const dtMs = Math.min(TICK_MS * 2, now - last);
    last = now;
    try {
      // Everything the tick needs in one query: the route, where the token is,
      // and the two reasons a patrol might be standing still.
      // Writes are collected and done after the loop, so a slow database cannot
      // hold up the broadcasts.
      const writes = [];
      // Which boards actually moved this tick, so detection is asked once per
      // session rather than once per guard.
      const moved = new Set();

      const rows = (await db.query(`
        SELECT p.*, t.grid_col, t.grid_row, t.map_id, t.size, t.size_squares, s.session_code,
               s.combat_active, COALESCE(m.patrols_paused, false) AS patrols_paused,
               s.map_id AS session_map_id,
               COALESCE(t.awareness, 'unaware') AS awareness, t.vision_arc
          FROM token_patrols p
          JOIN session_tokens t ON t.id = p.token_id
          JOIN sessions s ON s.id = p.session_id
          LEFT JOIN maps m ON m.id = t.map_id
         WHERE p.active = true
      `)).rows;

      for (const r of rows) {
        // Combat freezes patrols: initiative is the whole point of combat, and a
        // guard strolling through someone's turn is both a rules problem and a
        // distraction. Same for the GM's pause.
        if (r.combat_active || r.patrols_paused) continue;
        // A GUARD THAT HAS NOTICED SOMETHING STOPS WALKING
        //
        // Sneak mode gives every non-player token an awareness state (see
        // detection.js). Suspicious means "heard something, turning to look" and
        // alerted means "has seen you" — in both cases carrying serenely on down
        // the corridor at patrol pace is the single most immersion-breaking thing
        // the token could do. Detection turns the token toward its last contact;
        // standing still is what makes that turn readable.
        //
        // Nothing is written here, so the patrol resumes by itself the moment
        // suspicion times out. Alerted does not time out — the GM clears it,
        // which is also how the route starts again.
        if (r.awareness === 'suspicious' || r.awareness === 'alerted') continue;
        // A token with no map has no coordinates to move in.
        if (r.map_id == null) continue;
        // NOBODY WATCHING, NOBODY WALKING
        //
        // A patrol exists to be seen. Running one on a map with no GM and no
        // logged-in player is work nobody can observe, and it has a real cost:
        // the guard drifts on for hours while the map is closed and is found at
        // the far end of its route, having "patrolled" through a session that
        // never happened. Being logged in is the test — a character standing on
        // the map whose player is not connected is scenery, not an audience.
        if (hasWatcher && !hasWatcher(r.session_code, r.map_id)) continue;

        // WAYPOINTS ARE WHERE THE TOKEN'S CENTRE GOES
        //
        // A waypoint names a square, and the route is drawn through the middle
        // of those squares. But grid_col/grid_row is the token's TOP-LEFT
        // square, so walking a Large creature to `wp.col` put the corner of it
        // on the line and hung the rest of it down and to the right.
        //
        // The centre of square `c` is c + 0.5, and a token of extent E has its
        // centre at grid_col + E/2, so the top-left it needs is c + 0.5 - E/2.
        // A Medium token (E = 1) lands on `c` exactly as before, so existing
        // routes for ordinary creatures do not move.
        //
        // The same arithmetic, and the same reasoning, as stepping through a
        // portal — see tokenExtent's other caller in index.js.
        const ext = tokenExtent(r);
        const half = ext / 2 - 0.5;
        const patrol = {
          waypoints: (Array.isArray(r.waypoints) ? r.waypoints : [])
            .map((w) => ({ col: Number(w.col) - half, row: Number(w.row) - half })),
          speed_ft: Number(r.speed_ft) || 30,
          mode: r.mode,
          next_index: Number(r.next_index) || 0,
          direction: Number(r.direction) || 1,
        };
        if (patrol.waypoints.length < 2) continue;

        const from = { col: Number(r.grid_col) || 0, row: Number(r.grid_row) || 0 };
        const next = step(from, patrol, dtMs);

        // Nothing worth a round trip.
        if (Math.abs(next.col - from.col) < 1e-4 && Math.abs(next.row - from.row) < 1e-4
            && next.nextIndex === patrol.next_index && next.direction === patrol.direction
            && !next.finished) continue;

        // Four times a second, or the moment a route ends: the database and the
        // event every client already understands. A waypoint arrival is included
        // because the patrol's own bookkeeping (which leg, which direction)
        // changes there and must not wait.
        // The same event a dragged token sends, so every viewer — flat map, 3D,
        // spectator — moves it the way it moves anything else, and recomputes fog
        // and line of sight as it always does.
        // WHICH WAY THE GUARD IS LOOKING
        //
        // A patrolling token faces the way it is walking. Derived rather than
        // stored per waypoint, because the route already says it — and a GM who
        // has to set a heading at every corner will not use the feature.
        //
        // Only for a token that actually has a cone. Writing a facing onto an
        // omnidirectional token would start drawing an arc nobody asked for, and
        // `vision_arc` defaults to 360 so that is every token until the GM says
        // otherwise. Bearing is degrees clockwise from north, matching
        // light_sources.direction and losCore.bearing.
        let facing = null;
        if (Number(r.vision_arc) > 0 && Number(r.vision_arc) < 360) {
          const dc = next.col - from.col, dr = next.row - from.row;
          if (Math.hypot(dc, dr) > 1e-6) {
            facing = (Math.atan2(dc, -dr) * 180 / Math.PI + 360) % 360;
          }
        }

        io.to(r.session_code).emit('token_moved', {
          tokenId: r.token_id, gridCol: next.col, gridRow: next.row,
          ...(facing == null ? {} : { facing }),
        });
        moved.add(r.session_code);
        if (next.finished) {
          io.to(r.session_code).emit('patrol_finished', { tokenId: r.token_id });
        }
        writes.push([r.token_id, next.col, next.row, r.id, next.nextIndex, next.direction, !next.finished, facing]);
      }
      for (const [tokenId, col, row, patrolId, nextIndex, direction, active, facing] of writes) {
        await db.query(
          'UPDATE session_tokens SET grid_col=$1, grid_row=$2, facing=COALESCE($4, facing) WHERE id=$3',
          [col, row, tokenId, facing]
        );
        await db.query(
          'UPDATE token_patrols SET next_index=$1, direction=$2, active=$3, updated_at=NOW() WHERE id=$4',
          [nextIndex, direction, active, patrolId]
        );
      }
      if (onMoved) for (const code of moved) onMoved(code);
    } catch (err) {
      console.error('patrol tick error:', err.message);
    } finally {
      running = false;
    }
  };

  const handle = setInterval(tick, TICK_MS);
  // Never hold the process open for a patrol.
  handle.unref?.();
  return handle;
}

module.exports = {
  migrate, startRunner, step,
  cleanWaypoints, cleanSpeed, cleanMode,
  FEET_PER_SQUARE, SECONDS_PER_ROUND, TICK_MS,
};
