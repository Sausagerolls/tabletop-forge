// A round's worth of movement, and no more.
//
// During a sneak sequence the party should not be able to cross a guard's patch
// in one drag. This gives every token a budget — its walking speed — that
// refills once every six seconds, which is what a round is.
//
// WHY THE SERVER OWNS IT
//
// The same reason detection does. The flat map already measures a drag and
// shows "35 ft / 30 · Dash", but that readout is advice: nothing has ever
// stopped the drag, and a budget a client enforces is a budget a client can be
// told to ignore. So the client clamps the drag because that is the only way it
// can feel right under the hand, and the server checks it again because that is
// the only way it can be true.
//
// WHY ONLY IN SNEAK MODE
//
// Normal play is not turn-timed — the GM says who moves and how far, tokens get
// dragged around during planning, and a budget would be a running argument with
// the table. Sneak sequences are the one time the app is the referee.
//
// THE ROUND
//
// ONE clock for the table, not one per token. It starts when the GM turns sneak
// mode on and ticks every six seconds until they turn it off, and every token's
// budget refills on the tick.
//
// This began as a window per token, anchored on that token's own first move —
// which is defensible (nobody gets a part-round just because someone else moved
// first) and was wrong for the table. A stealth sequence is the party moving
// together past something that is also moving, and six separate invisible
// stopwatches cannot be shown on screen, cannot be planned around, and leave
// everyone asking "how long have I got" with no answer anybody shares.
//
// A single round is a clock you can put in the corner of the map and all read
// at once, which is what it is for.

const ROUND_MS = 6_000;
const FEET_PER_SQUARE = 5;

// Floating point on one axis of a drag is enough to make an exact-speed move
// read as a fraction of a foot too far. A tenth of a foot is well under the
// smallest move anyone can make on a grid.
const TOLERANCE_FT = 0.1;

async function migrate(db) {
  const add = (col, type) =>
    db.query(`ALTER TABLE session_tokens ADD COLUMN IF NOT EXISTS ${col} ${type}`)
      .catch((err) => console.error(`[move] migration ${col}:`, err.message));
  await add('move_spent', 'FLOAT NOT NULL DEFAULT 0');
  // TIMESTAMPTZ, and it matters — see ensureTz.
  await add('move_window_at', 'TIMESTAMPTZ');
  // Which of its speeds a token uses while sneaking. NULL means `auto`, which
  // is also what everything outside a sneak sequence does.
  await add('move_mode', 'VARCHAR(10)');
  await ensureTz(db, 'session_tokens', 'move_window_at');
}

/**
 * Make a timestamp column carry its time zone.
 *
 * `TIMESTAMP` is *timestamp without time zone*: Postgres hands back a wall
 * clock with no offset, and node reads that string as LOCAL time. On a server
 * running UTC the two agree by luck and everything works; on a developer's
 * machine an hour off UTC, every window this module opens reads as having
 * expired an hour ago, so the budget silently refills on every single move.
 *
 * That is the worst shape a bug can have — correct in production, broken
 * everywhere else, and it fails OPEN. Measured at 3,600,480 ms of skew against
 * a six-second window.
 *
 * So the column is TIMESTAMPTZ and a JS Date round-trips as the instant it
 * actually is. Existing columns are converted in place; Postgres reads the old
 * values as local time, which is exactly what they meant.
 */
async function ensureTz(db, table, col) {
  try {
    const r = await db.query(
      `SELECT data_type FROM information_schema.columns
        WHERE table_name=$1 AND column_name=$2`, [table, col]
    );
    if (r.rows[0] && r.rows[0].data_type === 'timestamp without time zone') {
      await db.query(`ALTER TABLE ${table} ALTER COLUMN ${col} TYPE TIMESTAMPTZ`);
      console.log(`[move] ${table}.${col} converted to TIMESTAMPTZ`);
    }
  } catch (err) {
    console.error(`[move] could not check ${table}.${col}:`, err.message);
  }
}

/**
 * Distance between two grid positions, in feet.
 *
 * Chebyshev, so a diagonal costs the same as a straight line — 5e's "every
 * square is 5 ft". This has to match what MapStage shows under the cursor
 * while dragging, or the readout says 30 and the server says 42.
 */
function distanceFt(fromCol, fromRow, toCol, toRow) {
  const squares = Math.max(
    Math.abs(Number(toCol) - Number(fromCol)),
    Math.abs(Number(toRow) - Number(fromRow)),
  );
  return squares * FEET_PER_SQUARE;
}

// The movement speeds a token can be asked to use. `auto` is the default and
// the only one that looks at what the token is doing.
const MOVE_MODES = ['auto', 'walk', 'fly', 'swim', 'climb', 'burrow'];

// Which creature column each mode reads. Walk is the floor for all of them: a
// creature with no swim speed still gets somewhere in water, just slowly, and
// zero would mean "cannot move at all", which is a different claim.
const SPEED_FIELD = {
  walk: 'creature_speed',
  fly: 'creature_speed_fly',
  swim: 'creature_speed_swim',
  climb: 'creature_speed_climb',
  burrow: 'creature_speed_burrow',
};

/**
 * Is this token off the ground?
 *
 * The flag OR any altitude. `is_flying` is the toggle the GM flips; `elevation`
 * is what a token gains by being dragged up in the 3D view or standing on an
 * upper storey, and a creature ten feet up is flying whether or not anybody
 * remembered to tick the box.
 */
function isAirborne(token) {
  return !!token.is_flying || (Number(token.elevation) || 0) > 0;
}

/**
 * Which speed this token moves at, and what it is called.
 *
 * MIRRORED IN THE CLIENT — see speedForToken in MapStage.jsx, which the drag
 * readout and the drag clamp both use. The two have to agree or the number
 * under the cursor is not the number the server is enforcing.
 *
 * Returns { ft, mode, label } where `mode` is the one actually used, which is
 * not always the one asked for: a mode whose speed is zero falls back to
 * walking rather than pinning the creature in place.
 */
function speedOf(token, mode) {
  const walk = Number(token.creature_speed);
  const walkFt = Number.isFinite(walk) && walk > 0 ? walk : 30;
  const want = MOVE_MODES.includes(mode) ? mode : 'auto';

  if (want === 'auto') {
    // Airborne and able to fly: use the fly speed. Anything else walks.
    const fly = Number(token.creature_speed_fly) || 0;
    if (isAirborne(token) && fly > 0) return { ft: fly, mode: 'fly', label: 'flying' };
    return { ft: walkFt, mode: 'walk', label: 'walking' };
  }

  const field = SPEED_FIELD[want];
  const ft = Number(token[field]) || 0;
  if (ft > 0) return { ft, mode: want, label: want === 'walk' ? 'walking' : want };
  // Asked for a speed this creature does not have.
  return { ft: walkFt, mode: 'walk', label: 'walking' };
}

/** A token's budget for one round, in feet. */
function budgetOf(token) {
  return speedOf(token, token.move_mode).ft;
}

/**
 * When the current round began, given the session's anchor.
 *
 * The anchor is set once, when sneak mode is switched on; every round after
 * that is derived, so the clock cannot drift and every client works it out for
 * itself from one timestamp. Returns null when no sequence is running.
 */
function roundStart(anchor, now = Date.now()) {
  if (!anchor) return null;
  const a = anchor instanceof Date ? anchor.getTime() : new Date(anchor).getTime();
  if (!Number.isFinite(a)) return null;
  if (now < a) return a;
  return a + Math.floor((now - a) / ROUND_MS) * ROUND_MS;
}

/**
 * What is left for this token in the CURRENT round.
 *
 * Pure, so the caller can ask without writing. Spend only counts if it happened
 * inside this round — the round boundary is what refills everyone, so there is
 * nothing to expire per token.
 */
function stateOf(token, anchor, now = Date.now()) {
  const budget = budgetOf(token);
  const start = roundStart(anchor, now);
  if (start == null) {
    // No sequence running: unlimited, and no clock to show.
    return { budget, spent: 0, remaining: budget, roundStart: null, resetsAt: null };
  }
  const spentAt = token.move_window_at ? new Date(token.move_window_at).getTime() : 0;
  const spent = spentAt >= start ? (Number(token.move_spent) || 0) : 0;
  return {
    budget,
    spent,
    remaining: Math.max(0, budget - spent),
    roundStart: start,
    resetsAt: start + ROUND_MS,
  };
}

/**
 * Is this move affordable, and what does the token's window look like after it?
 *
 * Returns { allowed, spent, budget, remaining, resetsAt, costFt }. Nothing is
 * written — the caller commits, because it is the one that knows whether the
 * move survived everything else.
 */
function consider(token, toCol, toRow, anchor, now = Date.now()) {
  const before = stateOf(token, anchor, now);
  const costFt = distanceFt(token.grid_col, token.grid_row, toCol, toRow);
  const allowed = costFt <= before.remaining + TOLERANCE_FT;
  // A refused move spends nothing. An allowed one can never bank more than the
  // budget — which matters for the GM, whose moves are recorded but never
  // refused, so an override must not leave a negative balance behind.
  const spent = allowed
    ? Math.min(before.budget, before.spent + costFt)
    : before.spent;
  return {
    allowed,
    costFt,
    budget: before.budget,
    spent,
    remaining: Math.max(0, before.budget - spent),
    roundStart: before.roundStart,
    resetsAt: before.resetsAt,
  };
}

/**
 * The same, but for a mover who cannot be refused — the GM.
 *
 * The cost is still recorded, because a move that is not counted is a budget
 * that refills every time anyone lets go of the mouse. That was the bug: the
 * GM's drag was clamped on screen and then forgotten, so a second drag started
 * from full and the round clock never began at all.
 */
function considerUncapped(token, toCol, toRow, anchor, now = Date.now()) {
  const r = consider(token, toCol, toRow, anchor, now);
  if (r.allowed) return r;
  const before = stateOf(token, anchor, now);
  return {
    ...r,
    allowed: true,
    overridden: true,
    spent: before.budget,
    remaining: 0,
  };
}

/** Write the window back after an allowed move. */
async function commit(db, tokenId, result, now = Date.now()) {
  // `move_window_at` is now just "when this spend happened", used to decide
  // whether it belongs to the round being asked about.
  await db.query(
    'UPDATE session_tokens SET move_spent=$1, move_window_at=$2 WHERE id=$3',
    [result.spent, new Date(now), tokenId]
  );
}

/** Hand a token its full budget back — used when the GM ends a sneak sequence. */
async function clearAll(db, sessionId) {
  await db.query(
    'UPDATE session_tokens SET move_spent=0, move_window_at=NULL WHERE session_id=$1 AND move_window_at IS NOT NULL',
    [sessionId]
  );
}

module.exports = {
  migrate, ensureTz, distanceFt, budgetOf, speedOf, isAirborne, roundStart, stateOf,
  consider, considerUncapped, commit, clearAll,
  ROUND_MS, FEET_PER_SQUARE, TOLERANCE_FT, MOVE_MODES,
};
