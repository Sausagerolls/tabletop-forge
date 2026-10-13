// Walking a patrol route, client-side.
//
// THIS IS THE CLOUDS PATTERN
//
// Animated terrain in the 3D view is smooth because it is never streamed: the
// server states a rule once — this cloud drifts at this speed — and the render
// loop advances a local clock by `dt` each frame and computes where the cloud is.
// No messages, no interpolation, no jitter, and it runs at whatever frame rate the
// display manages.
//
// Patrols are the same shape of problem: a route, a speed, and a clock. Streaming
// positions thirty times a second was solving the wrong problem, and every attempt
// to smooth the gaps between messages failed differently. So the client is given
// the route and works it out, exactly as it does for a drifting cloud.
//
// The server remains the authority. It still walks the same route on its own clock
// and broadcasts its position a few times a second; each of those is used to
// re-anchor this so a client that slept, lagged or joined late snaps back into
// step. Between anchors, the motion is local and perfectly smooth.
//
// The stepping maths is deliberately identical to backend/src/patrols.js. Two
// copies of an algorithm is a drift risk worth naming: if you change one, change
// the other, and the shared behaviour is covered by tests on both sides.

export const FEET_PER_SQUARE = 5;
export const SECONDS_PER_ROUND = 6;
const ARRIVE_EPS = 0.002;

/**
 * Advance a patrol by `dtMs`.
 *
 * @param {{col:number,row:number}} pos      where the token is now
 * @param {{waypoints:Array,speedFt:number,mode:string,nextIndex:number,direction:number}} patrol
 * @param {number} dtMs
 * @returns {{col,row,nextIndex,direction,finished}}
 */
export function advance(pos, patrol, dtMs) {
  const wps = patrol.waypoints || [];
  if (wps.length < 2) {
    return { col: pos.col, row: pos.row, nextIndex: patrol.nextIndex, direction: patrol.direction, finished: true };
  }

  let { col, row } = pos;
  let idx = Math.max(0, Math.min(wps.length - 1, patrol.nextIndex || 0));
  let dir = (patrol.direction ?? 1) >= 0 ? 1 : -1;
  let finished = false;

  let budget = ((patrol.speedFt || 30) / SECONDS_PER_ROUND) * (dtMs / 1000) / FEET_PER_SQUARE;

  // Bounded so a tab that was in the background for a minute cannot spin here
  // trying to catch up a minute of walking one waypoint at a time.
  let guard = 0;
  while (budget > 0 && guard++ < 256) {
    const target = wps[idx];
    const dx = Number(target.col) - col;
    const dy = Number(target.row) - row;
    const dist = Math.hypot(dx, dy);

    if (dist <= Math.max(budget, ARRIVE_EPS)) {
      col = Number(target.col);
      row = Number(target.row);
      budget -= dist;
      if (patrol.mode === 'pingpong') {
        if (idx + dir >= wps.length || idx + dir < 0) dir = -dir;
        idx += dir;
      } else if (patrol.mode === 'once') {
        if (idx >= wps.length - 1) { finished = true; break; }
        idx += 1;
      } else {
        idx = (idx + 1) % wps.length;
      }
    } else {
      col += (dx / dist) * budget;
      row += (dy / dist) * budget;
      budget = 0;
    }
  }

  return { col, row, nextIndex: idx, direction: dir, finished };
}

/**
 * Re-anchor on the server's own position.
 *
 * Called when an authoritative `token_moved` arrives. A small disagreement is
 * eased away rather than snapped, because a snap every time the server speaks is
 * exactly the stutter this whole design exists to remove — and the two are never
 * far apart, both walking the same route at the same speed. A large disagreement
 * (the GM dragged the token, a portal fired, this tab was asleep) is taken as
 * given: it means the local clock is simply wrong.
 */
export function reanchor(local, server, gridSquaresTolerance = 1.5) {
  if (!local) return { col: server.col, row: server.row };
  const drift = Math.hypot(server.col - local.col, server.row - local.row);
  if (drift > gridSquaresTolerance) return { col: server.col, row: server.row };
  // A tenth of the way back per correction: invisible per step, and gone within
  // a couple of seconds.
  return {
    col: local.col + (server.col - local.col) * 0.1,
    row: local.row + (server.row - local.row) * 0.1,
  };
}
