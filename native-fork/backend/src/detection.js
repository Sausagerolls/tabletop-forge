// Sneak mode — what the ENEMY can see.
//
// Everything else in this app that reasons about sight faces the players: fog
// of war, the visibility polygons, the 3D ground clip. All of it runs in the
// CLIENTS, and patrols.js explains why that is right — fog is per viewer, so
// every client reaching a different answer is correct.
//
// Detection is the opposite and therefore lives here instead. "Did the guard
// spot the rogue" is ONE shared fact: it drives what the guard does next, it
// has to be the same for the GM and for every player, and it must never be
// decided by the browser belonging to the person it is about. A client that
// computes its own stealth result is a client that can be told to fail.
//
// THE FIVE GATES, cheapest first
//
// A patrol tick fires twice a second and a dungeon can hold dozens of guards,
// so the order matters more than any single test. Distance eliminates almost
// every pair with one subtraction; only what survives reaches the ray cast,
// and only what survives THAT touches the lighting model.
//
//   1. Range     — is the intruder inside any of this observer's senses?
//   2. Sight     — is the line between them blocked by a wall or a shut door?
//   3. Light     — is the intruder lit, and can this observer use that light?
//   4. Facing    — is the intruder inside the observer's arc? (arc 360 = skip)
//   5. Contest   — passive Perception against the intruder's Stealth DC.
//
// The result is a MARGIN rather than a yes/no, because binary seen/unseen is
// what makes stealth boring: the party is either fine or the encounter has
// already started. A guard that half-noticed something and comes to look is
// where sneaking actually happens.

const los = require('./losCore');

const FEET_PER_SQUARE = 5;

// How long a guard stays suspicious with nothing further to go on.
//
// Three rounds. Long enough that the party has to actually wait it out rather
// than walk straight past behind the guard's back, short enough that one
// unlucky moment does not sour the whole dungeon. ALERTED does not decay: a
// guard who has plainly seen you does not forget, and clearing it is the GM's
// call.
const SUSPICION_TTL_MS = 18_000;

// Margin bands. `margin` is the observer's effective passive Perception minus
// the intruder's Stealth DC.
//
// Beating the DC outright is only ever "something's there" — the 5e contest
// says you are noticed, not that you are pinpointed, and a guard who walks over
// to look is both better drama and easier to escape than an instant alarm.
// Five clear points is unambiguous sight.
const SPOTTED_MARGIN = 5;

// What dim light costs an observer.
//
// A lightly obscured target imposes disadvantage on the Perception check;
// passive scores take a flat -5 for disadvantage, which is exactly the
// conversion the rules already use.
const DIM_PENALTY = 5;

// Senses that still work on an observer who cannot see. Truesight is
// deliberately NOT here: it is sight, however magical, and a blinded creature
// does not have it.
const NON_VISUAL = new Set(['blindsight', 'tremorsense']);

// Conditions that stop an observer perceiving anything at all.
const CANT_PERCEIVE = new Set(['unconscious', 'petrified']);

async function migrate(db) {
  const add = (table, col, type) =>
    db.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${col} ${type}`)
      .catch((err) => console.error(`[sneak] migration ${table}.${col}:`, err.message));

  // Who is sneaking, and how well.
  //
  // The DC is stored on the TOKEN rather than derived from the character,
  // because a Stealth check is a roll and not a stat: the same rogue is a
  // different problem on a 4 than on a 24, and the whole encounter hangs on
  // which one they got.
  await add('session_tokens', 'sneaking', 'BOOLEAN DEFAULT false');
  await add('session_tokens', 'stealth_dc', 'INTEGER');

  // What this token currently believes about the party.
  await add('session_tokens', 'awareness', "VARCHAR(12) NOT NULL DEFAULT 'unaware'");
  // TIMESTAMPTZ, not TIMESTAMP. Suspicion decays on a clock, and a column
  // without a time zone round-trips through node as local time — on any host
  // not running UTC that puts every window an hour out and suspicion expires
  // the instant it is set. See ensureTz in movement.js.
  await add('session_tokens', 'awareness_at', 'TIMESTAMPTZ');
  await require('./movement').ensureTz(db, 'session_tokens', 'awareness_at');
  // Where it last had contact, so a suspicious guard has somewhere to look.
  await add('session_tokens', 'last_contact_col', 'FLOAT');
  await add('session_tokens', 'last_contact_row', 'FLOAT');

  // Which way it is looking, and how wide.
  //
  // Degrees clockwise from north, the same convention light_sources.direction
  // uses, so the cone maths and its renderer are already solved. 360 means
  // omnidirectional, which is what every token that has never been given a
  // facing gets — so turning sneak mode on changes nothing until the GM starts
  // pointing guards in directions.
  await add('session_tokens', 'facing', 'FLOAT');
  await add('session_tokens', 'vision_arc', 'FLOAT NOT NULL DEFAULT 360');

  await add('sessions', 'sneak_mode', 'BOOLEAN NOT NULL DEFAULT false');
}

// ── Reading the board ───────────────────────────────────────────────────────

async function loadScene(db, sessionCode) {
  const sess = (await db.query(
    `SELECT id, session_code, map_id, ambient_light, sneak_mode, combat_active
       FROM sessions WHERE session_code=$1`, [sessionCode]
  )).rows[0];
  if (!sess || !sess.sneak_mode || sess.map_id == null) return null;

  const map = (await db.query('SELECT id, grid_size FROM maps WHERE id=$1', [sess.map_id])).rows[0];
  if (!map) return null;
  const gridSize = Number(map.grid_size) || 50;

  const [tokens, walls, doors, lights, darkness] = await Promise.all([
    db.query(
      `SELECT t.id, t.name, t.grid_col, t.grid_row, t.size_squares, t.is_player, t.is_hidden,
              t.is_dead, t.conditions, t.senses, t.vision_type, t.vision_range, t.is_flying,
              t.token_light_bright, t.token_light_dim,
              t.sneaking, t.stealth_dc, t.awareness, t.awareness_at, t.facing, t.vision_arc,
              COALESCE(c.passive_perception, 10) AS passive_perception
         FROM session_tokens t
         LEFT JOIN creatures c ON c.id = t.creature_id
        WHERE t.session_id=$1 AND t.map_id=$2`, [sess.id, sess.map_id]),
    db.query('SELECT id, type, points FROM walls WHERE map_id=$1', [sess.map_id]),
    db.query(
      `SELECT id, points, is_open, portal_kind, sprite_path, sprite_motion, open_dir
         FROM doors WHERE map_id=$1`, [sess.map_id]),
    db.query(
      `SELECT x, y, bright_radius, dim_radius, direction, spread_angle
         FROM light_sources WHERE map_id=$1`, [sess.map_id]),
    db.query(
      `SELECT x, y, radius, shape, poly_points, zone_type
         FROM magical_darkness WHERE session_id=$1 AND map_id=$2`, [sess.id, sess.map_id]),
  ]);

  // Built once per evaluation, not per pair. Doors are converted without a
  // viewer offset: the sprite-thickness trick in los.js exists to keep a door's
  // own art out of its own shadow, which is a rendering concern with no meaning
  // for a yes/no detection test.
  const segs = [
    ...los.wallsToSegments(walls.rows),
    ...los.doorsToSegments(doors.rows),
  ];

  // Placed lights hold their radii in MAP PIXELS (default 60/120); a token's
  // torch holds them in FEET. That is how the client reads them, so it is how
  // they are read here — getting this backwards makes every torch either a
  // pinprick or a floodlight.
  const pxPerFt = gridSize / FEET_PER_SQUARE;
  const lamps = lights.rows.map((l) => ({
    x: Number(l.x), y: Number(l.y),
    bright: Number(l.bright_radius) || 0,
    dim: Number(l.dim_radius) || 0,
    dir: Number(l.direction) || 0,
    spread: l.spread_angle == null ? 360 : Number(l.spread_angle),
  }));

  const tokenRows = tokens.rows;
  for (const t of tokenRows) {
    const brightFt = Number(t.token_light_bright) || 0;
    const dimFt = Number(t.token_light_dim) || 0;
    if (brightFt > 0 || dimFt > 0) {
      const c = centreOf(t, gridSize);
      lamps.push({
        x: c.x, y: c.y,
        bright: brightFt * pxPerFt,
        dim: (dimFt || brightFt * 2) * pxPerFt,
        dir: 0, spread: 360,
      });
    }
  }

  return {
    session: sess,
    gridSize,
    pxPerFt,
    ambient: sess.ambient_light || 'bright',
    tokens: tokenRows,
    segs,
    lamps,
    // Heavy fog and water are visual only — the client says so where it builds
    // its own occluders, and detection has to agree or a guard is blinded by
    // weather the players can see straight through.
    darkZones: darkness.rows.filter((d) => d.zone_type !== 'heavy-fog' && d.zone_type !== 'water'),
  };
}

function centreOf(t, gridSize) {
  const sz = Number(t.size_squares) > 0 ? Number(t.size_squares) : 1;
  return {
    x: (Number(t.grid_col) || 0) * gridSize + (sz * gridSize) / 2,
    y: (Number(t.grid_row) || 0) * gridSize + (sz * gridSize) / 2,
  };
}

function conditionsOf(t) {
  const c = t.conditions;
  if (Array.isArray(c)) return new Set(c);
  if (typeof c === 'string') { try { return new Set(JSON.parse(c) || []); } catch { return new Set(); } }
  return new Set();
}

// A token's senses, in the same shape the renderer builds: the explicit array
// when there is one, otherwise the single vision_type/vision_range pair.
function sensesOf(t) {
  const arr = Array.isArray(t.senses) ? t.senses : null;
  if (arr && arr.length) {
    return arr.map((s, i) => ({
      type: s.type || 'normal',
      range: Number(s.range) || 0,
      // Each sense may carry its OWN arc. Absent means "use the default for
      // this kind of sense" — see arcOf.
      arc: s.arc == null ? null : Number(s.arc),
      index: i,
    }));
  }
  return [{
    type: t.vision_type || 'normal',
    range: Number(t.vision_range) || 0,
    arc: null,
    index: 0,
  }];
}

// Senses that come from something other than eyes, and so have no natural
// front. A creature does not have to be looking at you to feel you through the
// floor, and blindsight is explicitly not sight.
const NO_NATURAL_FRONT = new Set(['blindsight', 'tremorsense']);

// How wide this ONE sense is, in degrees.
//
// Per sense rather than per token, because a creature is usually several
// sensors at once and they do not share a shape: a guard dog watches a 90°
// wedge in front of it and hears in every direction; a grimlock has blindsight
// all round and no useful eyes at all. Collapsing that into a single
// `vision_arc` meant the GM had to pick which of a creature's senses to model
// and ignore the rest.
//
// The fallbacks keep every board that already existed behaving identically:
//
//   * a sense that names its own arc uses it;
//   * blindsight and tremorsense default to all round, which is what the
//     engine used to hard-code for them;
//   * everything else falls back to the token's `vision_arc`, which is the
//     single knob the GM has always had.
function arcOf(sense, observer) {
  if (sense.arc != null && Number.isFinite(sense.arc)) {
    return Math.max(1, Math.min(360, sense.arc));
  }
  if (NO_NATURAL_FRONT.has(sense.type)) return 360;
  const a = Number(observer.vision_arc);
  return Number.isFinite(a) && a > 0 ? Math.min(360, a) : 360;
}

// ── Gate 3: light ───────────────────────────────────────────────────────────

// How lit is this point? 'bright' | 'dim' | 'dark', plus whether magical
// darkness covers it.
function illuminationAt(x, y, scene) {
  for (const z of scene.darkZones) {
    if (los.pointInZone(x, y, z)) return { level: 'dark', magical: true };
  }

  let level = scene.ambient === 'bright' ? 'bright' : scene.ambient === 'dim' ? 'dim' : 'dark';
  if (level === 'bright') return { level, magical: false };

  for (const l of scene.lamps) {
    const d = Math.hypot(x - l.x, y - l.y);
    if (d > Math.max(l.bright, l.dim)) continue;
    // A directional lamp only lights its own arc.
    if (l.spread < 360 && los.angleBetween(los.bearing(l.x, l.y, x, y), l.dir) > l.spread / 2) continue;
    // Light is stopped by the same things sight is.
    if (los.lineBlocked(l.x, l.y, x, y, scene.segs)) continue;
    if (d <= l.bright) return { level: 'bright', magical: false };
    if (d <= l.dim) level = 'dim';
  }
  return { level, magical: false };
}

// What this sense makes of that lighting.
//
// Returns null when the sense cannot perceive the target at all, otherwise a
// penalty in points to subtract from passive Perception, and whether the
// contact is SIGHT (which can pinpoint) or a non-visual sense like tremorsense
// (which can only ever say "something is there").
function senseVerdict(sense, light, targetConds, target) {
  const type = sense.type || 'normal';
  // `light` is null for senses that do not consult it — see the call site.
  const lit = light || { level: 'bright', magical: false };

  if (type === 'tremorsense') {
    // Vibration through the ground. Nothing to do with light, and no use at
    // all against something that is not standing on the floor.
    if (target.is_flying) return null;
    return { penalty: 0, pinpoint: false };
  }
  if (type === 'blindsight') return { penalty: 0, pinpoint: true };
  if (type === 'truesight') return { penalty: 0, pinpoint: true };

  // Everything below is ordinary sight, so invisibility defeats it outright.
  if (targetConds.has('invisible')) return null;

  if (type === 'devilsight') {
    // "You can see normally in dim light and darkness" — magical included.
    return { penalty: 0, pinpoint: true };
  }
  if (type === 'darkvision') {
    if (lit.magical) return null;                 // ordinary darkvision is defeated
    if (lit.level === 'bright') return { penalty: 0, pinpoint: true };
    if (lit.level === 'dim') return { penalty: 0, pinpoint: true };     // dim reads as bright
    return { penalty: DIM_PENALTY, pinpoint: true };                     // dark reads as dim
  }
  // Normal vision.
  if (lit.magical || lit.level === 'dark') return null;
  if (lit.level === 'dim') return { penalty: DIM_PENALTY, pinpoint: true };
  return { penalty: 0, pinpoint: true };
}

// ── The pair test ───────────────────────────────────────────────────────────

// Returns { contact: 'none'|'suspicious'|'spotted', margin, via }.
function testPair(observer, target, scene) {
  if (observer.is_dead) return { contact: 'none' };
  const oc = conditionsOf(observer);
  for (const c of CANT_PERCEIVE) if (oc.has(c)) return { contact: 'none' };

  const o = centreOf(observer, scene.gridSize);
  const t = centreOf(target, scene.gridSize);
  const distFt = Math.hypot(t.x - o.x, t.y - o.y) / scene.pxPerFt;

  const blind = oc.has('blinded');
  const tc = conditionsOf(target);

  // GATE 1 — range. A sense with no range is unlimited, which is what normal
  // vision in a lit room means.
  const inRange = sensesOf(observer).filter((s) => {
    if (blind && !NON_VISUAL.has(s.type)) return false;
    return !(s.range > 0) || distFt <= s.range;
  });
  if (!inRange.length) return { contact: 'none' };

  // The two expensive facts, each computed at most once per pair and only if
  // some sense actually asks for them. A creature with blindsight all round
  // never needs the lamp loop at all.
  let blockedMemo;
  const blocked = () => (blockedMemo ??= los.lineBlocked(o.x, o.y, t.x, t.y, scene.segs));
  let lightMemo;
  const light = () => (lightMemo ??= illuminationAt(t.x, t.y, scene));

  const bear = los.bearing(o.x, o.y, t.x, t.y);
  const facing = observer.facing == null ? null : Number(observer.facing);

  // Each sense is asked separately, and the best answer wins. This is what
  // makes a creature with eyes AND blindsight behave like one: the eyes are
  // stopped by a wall or by the dark, the blindsight is not, and whichever
  // still reaches is the one that decides.
  let best = null;
  for (const s of inRange) {
    // GATE 2 — sight line. Tremorsense reads the floor rather than the air, so
    // it alone is unbothered by a wall.
    if (s.type !== 'tremorsense' && blocked()) continue;

    // GATE 4 — facing, per sense. Cheap, so it comes before the lighting model.
    const arc = arcOf(s, observer);
    if (arc < 360 && facing != null && los.angleBetween(bear, facing) > arc / 2) continue;

    // GATE 3 — light. Only the senses that care pay for it.
    const v = senseVerdict(s, NO_NATURAL_FRONT.has(s.type) ? null : light(), tc, target);
    if (!v) continue;
    if (!best || v.penalty < best.penalty
        || (v.penalty === best.penalty && v.pinpoint && !best.pinpoint)) {
      best = { ...v, type: s.type };
    }
  }
  if (!best) return { contact: 'none' };

  return contestOf(observer, target, best.penalty, best.pinpoint, best.type);
}

// GATE 5 — the contest.
function contestOf(observer, target, penalty, pinpoint, via) {
  const passive = Number(observer.passive_perception) || 10;
  // A sneaking token with no DC yet has not rolled. Ten is the "took no care"
  // floor rather than an automatic success or an automatic failure — the GM
  // sets a real number the moment they ask for a roll.
  const dc = Number.isFinite(Number(target.stealth_dc)) && target.stealth_dc != null
    ? Number(target.stealth_dc) : 10;
  const margin = (passive - penalty) - dc;
  if (margin < 0) return { contact: 'none', margin, via };
  // Something felt through the floor is never a sighting, however good the
  // roll: the guard knows something is there, not what or exactly where.
  if (!pinpoint) return { contact: 'suspicious', margin, via };
  return { contact: margin >= SPOTTED_MARGIN ? 'spotted' : 'suspicious', margin, via };
}

// ── The sweep ───────────────────────────────────────────────────────────────

const RANK = { unaware: 0, suspicious: 1, alerted: 2 };

/**
 * Run detection for one session and broadcast whatever changed.
 *
 * Safe to call as often as you like: it reads the board, decides, and only
 * writes for tokens whose state actually moved.
 */
async function evaluate(db, io, sessionCode) {
  const scene = await loadScene(db, sessionCode);
  if (!scene) return;

  const intruders = scene.tokens.filter((t) => t.sneaking && !t.is_dead && !t.is_hidden);

  // WHO COUNTS AS A GUARD
  //
  // Not simply "every token that isn't a player". `is_player` is set when a
  // person CLAIMS a token, not from the creature it was made out of — so a
  // party member the GM dropped on the board for them reads as false, and on
  // the first run that put the sneaking rogue in both lists at once. Paired
  // with itself at a range of zero it was spotted instantly, and the alert the
  // GM saw was the rogue noticing the rogue.
  //
  // So anyone sneaking is excluded regardless of the flag — an intruder is not
  // also a sentry — and the self-pair is skipped below in any case, because two
  // rogues sneaking together must not give each other away either.
  const observers = scene.tokens.filter(
    (t) => !t.is_player && !t.sneaking && !t.is_hidden && !t.is_dead
  );
  const now = Date.now();
  const changes = [];

  for (const ob of observers) {
    // The loudest contact this observer has, across the whole sneaking party:
    // the worst state anyone provokes, and within that the clearest sighting.
    let best = { contact: 'none', margin: -Infinity, via: null };
    let at = null;
    for (const it of intruders) {
      if (it.id === ob.id) continue;
      const r = testPair(ob, it, scene);
      if (r.contact === 'none') continue;
      const rank = RANK[stateFor(r.contact)];
      const bestRank = RANK[stateFor(best.contact)];
      if (rank > bestRank || (rank === bestRank && r.margin > best.margin)) {
        best = r;
        at = centreOf(it, scene.gridSize);
      }
    }

    const wanted = stateFor(best.contact);
    const current = ob.awareness || 'unaware';

    if (RANK[wanted] > RANK[current]) {
      // Escalation is immediate — a guard who has just seen you does not wait.
      changes.push({
        token: ob, state: wanted, at,
        contactCol: at ? at.x / scene.gridSize : null,
        contactRow: at ? at.y / scene.gridSize : null,
        via: best.via,
      });
    } else if (wanted !== 'unaware' && wanted === current) {
      // Still in contact: refresh the clock so suspicion does not time out
      // while the party is standing in plain view.
      changes.push({ token: ob, state: current, refresh: true, at,
        contactCol: at ? at.x / scene.gridSize : null,
        contactRow: at ? at.y / scene.gridSize : null, via: best.via });
    } else if (current === 'suspicious' && wanted === 'unaware') {
      // De-escalation is on a timer, not instant — see SUSPICION_TTL_MS.
      const since = ob.awareness_at ? new Date(ob.awareness_at).getTime() : 0;
      if (now - since >= SUSPICION_TTL_MS) {
        changes.push({ token: ob, state: 'unaware', at: null });
      }
    }
    // 'alerted' never decays here. The GM clears it.
  }

  for (const ch of changes) {
    const t = ch.token;
    if (ch.refresh) {
      await db.query(
        `UPDATE session_tokens SET awareness_at=NOW(), last_contact_col=COALESCE($1, last_contact_col),
                                   last_contact_row=COALESCE($2, last_contact_row)
          WHERE id=$3`,
        [ch.contactCol, ch.contactRow, t.id]
      );
      continue;
    }
    // A guard that notices something turns to look at it. Only when it has a
    // cone to turn — an omnidirectional token has no facing to change, and
    // writing one would start drawing a cone the GM never asked for.
    let facing = null;
    if (ch.at && Number(t.vision_arc) < 360) {
      const c = centreOf(t, scene.gridSize);
      facing = los.bearing(c.x, c.y, ch.at.x, ch.at.y);
    }
    await db.query(
      `UPDATE session_tokens
          SET awareness=$1, awareness_at=NOW(),
              last_contact_col=$2, last_contact_row=$3,
              facing=COALESCE($4, facing)
        WHERE id=$5`,
      [ch.state, ch.contactCol, ch.contactRow, facing, t.id]
    );
    announce(io, sessionCode, {
      tokenId: t.id,
      awareness: ch.state,
      facing,
      lastContact: ch.contactCol == null ? null : { col: ch.contactCol, row: ch.contactRow },
      via: ch.via || null,
    }, RANK[ch.state] > RANK[t.awareness || 'unaware']);
  }
}

// Telling the table, without telling the players the answer.
//
// The GM gets the whole truth — which guard, what state, what it was that gave
// the party away — because adjudicating is their job.
//
// The players get a level and nothing else. Not the guard's id, not where it is
// looking, not even how many guards are involved. This is the difference
// between a stealth system and a read-out: "something has noticed you" is a
// reason to stop moving and think, while "guard #14 is at 62% suspicion" is a
// number to optimise against. It also closes the obvious hole — an `awareness`
// field on the wire is an `awareness` field in the browser's console, and the
// player it concerns is the one person who must not be able to read it.
//
// Only escalations reach the players at all. A guard settling back down is not
// news they are entitled to; noticing that the coast is clear is what scouting
// is for.
function announce(io, sessionCode, payload, escalated) {
  const room = io.sockets.adapter.rooms.get(sessionCode);
  if (!room) return;
  for (const sid of room) {
    const s = io.sockets.sockets.get(sid);
    if (!s) continue;
    if (s.data?.role === 'dm') {
      s.emit('awareness_changed', payload);
    } else if (escalated && payload.awareness !== 'unaware') {
      s.emit('sneak_pulse', { level: payload.awareness });
    }
  }
}

function stateFor(contact) {
  if (contact === 'spotted') return 'alerted';
  if (contact === 'suspicious') return 'suspicious';
  return 'unaware';
}

// ── Scheduling ──────────────────────────────────────────────────────────────
//
// Detection is asked for, not polled. Every mover — a patrol step, a dragged
// token, a door opening — calls `schedule`, and the sweep runs at most once per
// window however many callers pile in. A patrol tick moving eight guards is one
// evaluation, not eight.
//
// The slow sweep underneath exists only for decay: suspicion times out on a
// clock, and nothing is moving to trigger that.

const SWEEP_MS = 400;
const DECAY_SWEEP_MS = 3_000;

function createScheduler(db, io) {
  const pending = new Map(); // sessionCode -> timer
  const running = new Set();

  async function run(sessionCode) {
    if (running.has(sessionCode)) {
      // Something asked again while we were working. Re-arm rather than drop
      // it, or the last move before a pause is the one that never counts.
      schedule(sessionCode);
      return;
    }
    running.add(sessionCode);
    try {
      await evaluate(db, io, sessionCode);
    } catch (err) {
      console.error('[sneak] evaluate error:', err.message);
    } finally {
      running.delete(sessionCode);
    }
  }

  function schedule(sessionCode) {
    if (!sessionCode || pending.has(sessionCode)) return;
    const timer = setTimeout(() => {
      pending.delete(sessionCode);
      run(sessionCode);
    }, SWEEP_MS);
    timer.unref?.();
    pending.set(sessionCode, timer);
  }

  return { schedule };
}

function startRunner({ db, io, hasWatcher = null }) {
  let busy = false;
  const handle = setInterval(async () => {
    if (busy) return;
    busy = true;
    try {
      const rows = (await db.query(
        `SELECT session_code, map_id FROM sessions
          WHERE sneak_mode = true AND map_id IS NOT NULL`
      )).rows;
      for (const r of rows) {
        // Same rule as patrols: nobody watching, nothing to compute.
        if (hasWatcher && !hasWatcher(r.session_code, r.map_id)) continue;
        await evaluate(db, io, r.session_code);
      }
    } catch (err) {
      console.error('[sneak] decay sweep error:', err.message);
    } finally {
      busy = false;
    }
  }, DECAY_SWEEP_MS);
  handle.unref?.();
  return handle;
}

module.exports = {
  migrate, evaluate, startRunner, createScheduler, announce,
  testPair, illuminationAt, loadScene, centreOf, sensesOf, arcOf,
  SUSPICION_TTL_MS, SPOTTED_MARGIN, DIM_PENALTY,
};
