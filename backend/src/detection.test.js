// The five gates, exercised without a database.
//
// `testPair` takes a plain scene object, so the whole rules engine can be
// driven from a literal. Run with:  node src/detection.test.js
//
// These are the cases that decide whether sneak mode is playable: a guard
// looking the wrong way, a rogue in the dark, a torch that gives them away,
// a wall between them, and the margin bands either side of "spotted".

const d = require('./detection');

const GRID = 50;                 // map px per square
const PX_PER_FT = GRID / 5;      // 10 px per foot

// A scene with no walls, no lamps and no darkness unless a test adds them.
function scene(over = {}) {
  return {
    gridSize: GRID,
    pxPerFt: PX_PER_FT,
    ambient: 'bright',
    segs: [],
    lamps: [],
    darkZones: [],
    tokens: [],
    ...over,
  };
}

// col/row are in squares; the engine works from the token's centre.
function guard(over = {}) {
  return {
    id: 1, name: 'Guard', grid_col: 0, grid_row: 0, size_squares: 1,
    is_player: false, is_dead: false, conditions: [],
    senses: null, vision_type: 'normal', vision_range: 0,
    passive_perception: 12, vision_arc: 360, facing: null,
    ...over,
  };
}
function rogue(over = {}) {
  return {
    id: 2, name: 'Rogue', grid_col: 4, grid_row: 0, size_squares: 1,
    is_player: true, is_dead: false, conditions: [], is_flying: false,
    sneaking: true, stealth_dc: 15,
    ...over,
  };
}

let pass = 0, fail = 0;
function check(label, got, want) {
  const ok = got === want;
  if (ok) { pass++; console.log(`  ok    ${label}`); }
  else { fail++; console.log(`  FAIL  ${label} — got "${got}", wanted "${want}"`); }
}
function section(name) { console.log(`\n${name}`); }

// ── Gate 5: the contest, with everything else out of the way ────────────────
section('Contest — passive Perception against the Stealth DC');
check('passive 12 vs DC 15 → unnoticed',
  d.testPair(guard({ passive_perception: 12 }), rogue({ stealth_dc: 15 }), scene()).contact, 'none');
check('passive 15 vs DC 15 → suspicious (beaten, not pinpointed)',
  d.testPair(guard({ passive_perception: 15 }), rogue({ stealth_dc: 15 }), scene()).contact, 'suspicious');
check('passive 19 vs DC 15 → still suspicious (margin 4)',
  d.testPair(guard({ passive_perception: 19 }), rogue({ stealth_dc: 15 }), scene()).contact, 'suspicious');
check('passive 20 vs DC 15 → spotted (margin 5)',
  d.testPair(guard({ passive_perception: 20 }), rogue({ stealth_dc: 15 }), scene()).contact, 'spotted');

// ── Gate 2: walls ───────────────────────────────────────────────────────────
section('Sight line — a wall between them');
{
  // Guard centre (25,25), rogue centre (225,25). Wall across x=125.
  const walled = scene({ segs: [{ ax: 125, ay: -200, bx: 125, by: 200 }] });
  check('wall between → unnoticed even on a huge passive',
    d.testPair(guard({ passive_perception: 30 }), rogue(), walled).contact, 'none');
  check('same pair, no wall → spotted',
    d.testPair(guard({ passive_perception: 30 }), rogue(), scene()).contact, 'spotted');
  check('tremorsense reaches through the wall, but only ever suspects',
    d.testPair(guard({ passive_perception: 30, senses: [{ type: 'tremorsense', range: 60 }] }),
      rogue(), walled).contact, 'suspicious');
  check('tremorsense is defeated by a flying target',
    d.testPair(guard({ passive_perception: 30, senses: [{ type: 'tremorsense', range: 60 }] }),
      rogue({ is_flying: true }), walled).contact, 'none');
}

// ── Gate 1: range ───────────────────────────────────────────────────────────
section('Range — a sense that does not reach');
{
  // 4 squares apart = 20 ft between centres.
  check('darkvision 10 ft does not reach 20 ft',
    d.testPair(guard({ passive_perception: 30, senses: [{ type: 'darkvision', range: 10 }] }),
      rogue(), scene({ ambient: 'dark' })).contact, 'none');
  check('darkvision 60 ft does',
    d.testPair(guard({ passive_perception: 30, senses: [{ type: 'darkvision', range: 60 }] }),
      rogue(), scene({ ambient: 'dark' })).contact, 'spotted');
}

// ── Gate 3: light ───────────────────────────────────────────────────────────
section('Light — darkness, darkvision, and a torch that gives you away');
{
  const dark = scene({ ambient: 'dark' });
  check('normal vision in the dark sees nothing',
    d.testPair(guard({ passive_perception: 30 }), rogue(), dark).contact, 'none');
  check('darkvision in the dark reads it as dim: -5, so margin 30-5-15 = 10',
    d.testPair(guard({ passive_perception: 30, senses: [{ type: 'darkvision', range: 60 }] }),
      rogue(), dark).contact, 'spotted');
  check('darkvision, passive 19: 19-5 = 14 vs DC 15 → unnoticed',
    d.testPair(guard({ passive_perception: 19, senses: [{ type: 'darkvision', range: 60 }] }),
      rogue(), dark).contact, 'none');

  // A torch at the rogue's own feet. Placed lamps are in MAP PIXELS.
  const lit = scene({ ambient: 'dark', lamps: [{ x: 225, y: 25, bright: 200, dim: 400, dir: 0, spread: 360 }] });
  check('the rogue carrying a light is visible to ordinary vision',
    d.testPair(guard({ passive_perception: 20 }), rogue(), lit).contact, 'spotted');

  const dim = scene({ ambient: 'dim' });
  check('dim light costs ordinary vision 5: 19-5 = 14 vs 15 → unnoticed',
    d.testPair(guard({ passive_perception: 19 }), rogue(), dim).contact, 'none');
  check('dim light costs darkvision nothing: 19 vs 15 → suspicious',
    d.testPair(guard({ passive_perception: 19, senses: [{ type: 'darkvision', range: 60 }] }),
      rogue(), dim).contact, 'suspicious');

  const magical = scene({ ambient: 'bright', darkZones: [{ x: 225, y: 25, radius: 60, shape: 'circle' }] });
  check('magical darkness defeats darkvision',
    d.testPair(guard({ passive_perception: 30, senses: [{ type: 'darkvision', range: 60 }] }),
      rogue(), magical).contact, 'none');
  check("devil's sight pierces it",
    d.testPair(guard({ passive_perception: 30, senses: [{ type: 'devilsight', range: 120 }] }),
      rogue(), magical).contact, 'spotted');
  check('a wall stops light reaching the rogue, so the torch does not help',
    d.testPair(guard({ passive_perception: 30 }), rogue(),
      scene({ ambient: 'dark',
        lamps: [{ x: 25, y: 25, bright: 400, dim: 600, dir: 0, spread: 360 }],
        segs: [{ ax: 125, ay: -200, bx: 125, by: 200 }] })).contact, 'none');
}

// ── Gate 4: facing ──────────────────────────────────────────────────────────
section('Facing — the guard is looking the wrong way');
{
  // Rogue is due EAST of the guard (bearing 90).
  const cone = { vision_arc: 90, passive_perception: 30 };
  check('facing east (90) → in the cone, spotted',
    d.testPair(guard({ ...cone, facing: 90 }), rogue(), scene()).contact, 'spotted');
  check('facing north (0) → 90 off, outside a 90 arc, unnoticed',
    d.testPair(guard({ ...cone, facing: 0 }), rogue(), scene()).contact, 'none');
  check('facing west (270) → back turned, unnoticed',
    d.testPair(guard({ ...cone, facing: 270 }), rogue(), scene()).contact, 'none');
  check('facing 120 → 30 off, inside a 90 arc, spotted',
    d.testPair(guard({ ...cone, facing: 120 }), rogue(), scene()).contact, 'spotted');
  check('arc 360 ignores facing entirely',
    d.testPair(guard({ vision_arc: 360, facing: 270, passive_perception: 30 }), rogue(), scene()).contact, 'spotted');
  check('blindsight does not care which way you face',
    d.testPair(guard({ ...cone, facing: 270, senses: [{ type: 'blindsight', range: 60 }] }),
      rogue(), scene()).contact, 'spotted');
}

// ── Conditions ──────────────────────────────────────────────────────────────
section('Conditions');
check('an invisible rogue defeats ordinary sight',
  d.testPair(guard({ passive_perception: 30 }), rogue({ conditions: ['invisible'] }), scene()).contact, 'none');
check('truesight sees the invisible',
  d.testPair(guard({ passive_perception: 30, senses: [{ type: 'truesight', range: 60 }] }),
    rogue({ conditions: ['invisible'] }), scene()).contact, 'spotted');
check('a blinded guard sees nothing',
  d.testPair(guard({ passive_perception: 30, conditions: ['blinded'] }), rogue(), scene()).contact, 'none');
check('a blinded guard with blindsight still does',
  d.testPair(guard({ passive_perception: 30, conditions: ['blinded'], senses: [{ type: 'blindsight', range: 60 }] }),
    rogue(), scene()).contact, 'spotted');
check('an unconscious guard perceives nothing at all',
  d.testPair(guard({ passive_perception: 30, conditions: ['unconscious'], senses: [{ type: 'blindsight', range: 60 }] }),
    rogue(), scene()).contact, 'none');
check('a dead guard perceives nothing',
  d.testPair(guard({ passive_perception: 30, is_dead: true }), rogue(), scene()).contact, 'none');

// ── Defaults ────────────────────────────────────────────────────────────────
section('Defaults');
check('a sneaker who has not rolled is treated as DC 10',
  d.testPair(guard({ passive_perception: 15 }), rogue({ stealth_dc: null }), scene()).contact, 'spotted');
check('DC 0 is honoured, not read as "unset"',
  d.testPair(guard({ passive_perception: 4 }), rogue({ stealth_dc: 0 }), scene()).contact, 'suspicious');

// ── Per-sense arcs ──────────────────────────────────────────────────────────
section('Per-sense arcs — eyes in front, other senses all round');
{
  // Rogue is due EAST (bearing 90); the guard looks NORTH.
  const looking_north = { facing: 0, passive_perception: 30 };

  check('eyes in a 90 arc facing north miss what is due east',
    d.testPair(guard({ ...looking_north, senses: [{ type: 'normal', range: 0, arc: 90 }] }),
      rogue(), scene()).contact, 'none');

  check('...but blindsight alongside them still finds it, being all round by default',
    d.testPair(guard({ ...looking_north, senses: [
      { type: 'normal', range: 0, arc: 90 },
      { type: 'blindsight', range: 60 },
    ] }), rogue(), scene()).contact, 'spotted');

  check('blindsight given its OWN narrow arc can be faced away from too',
    d.testPair(guard({ ...looking_north, senses: [
      { type: 'normal', range: 0, arc: 90 },
      { type: 'blindsight', range: 60, arc: 90 },
    ] }), rogue(), scene()).contact, 'none');

  check('a short blindsight that does not reach leaves only the eyes',
    d.testPair(guard({ ...looking_north, senses: [
      { type: 'normal', range: 0, arc: 90 },
      { type: 'blindsight', range: 10 },
    ] }), rogue(), scene()).contact, 'none');

  check('tremorsense all round reports the same contact, but only ever suspects',
    d.testPair(guard({ ...looking_north, senses: [
      { type: 'normal', range: 0, arc: 90 },
      { type: 'tremorsense', range: 60 },
    ] }), rogue(), scene()).contact, 'suspicious');

  check('a sense with an explicit 360 overrides the token-wide arc',
    d.testPair(guard({ ...looking_north, vision_arc: 90,
      senses: [{ type: 'normal', range: 0, arc: 360 }] }), rogue(), scene()).contact, 'spotted');

  check('a sense with no arc of its own falls back to the token-wide one',
    d.testPair(guard({ ...looking_north, vision_arc: 90,
      senses: [{ type: 'normal', range: 0 }] }), rogue(), scene()).contact, 'none');

  check('the old single-knob behaviour is unchanged: blindsight ignores vision_arc',
    d.testPair(guard({ ...looking_north, vision_arc: 90,
      senses: [{ type: 'blindsight', range: 60 }] }), rogue(), scene()).contact, 'spotted');
}

section('Per-sense arcs — each sense meets the wall and the dark on its own');
{
  const walled = scene({ segs: [{ ax: 125, ay: -200, bx: 125, by: 200 }] });
  check('a wall stops the eyes AND the blindsight, but not the tremorsense',
    d.testPair(guard({ passive_perception: 30, senses: [
      { type: 'normal', range: 0 },
      { type: 'blindsight', range: 60 },
      { type: 'tremorsense', range: 60 },
    ] }), rogue(), walled).contact, 'suspicious');

  const dark = scene({ ambient: 'dark' });
  check('darkness stops the eyes; blindsight does not care and pinpoints',
    d.testPair(guard({ passive_perception: 20, senses: [
      { type: 'normal', range: 0 },
      { type: 'blindsight', range: 60 },
    ] }), rogue(), dark).contact, 'spotted');

  check('the BEST sense wins: darkvision 5-point penalty is beaten by blindsight',
    d.testPair(guard({ passive_perception: 19, senses: [
      { type: 'darkvision', range: 60 },
      { type: 'blindsight', range: 60 },
    ] }), rogue(), dark).contact, 'suspicious');
}

section('arcOf — the resolution rule on its own');
check('explicit arc wins',            d.arcOf({ type: 'normal', arc: 120 }, { vision_arc: 90 }), 120);
check('blindsight defaults all round', d.arcOf({ type: 'blindsight', arc: null }, { vision_arc: 90 }), 360);
check('tremorsense defaults all round', d.arcOf({ type: 'tremorsense', arc: null }, { vision_arc: 90 }), 360);
check('sight falls back to the token', d.arcOf({ type: 'normal', arc: null }, { vision_arc: 90 }), 90);
check('no token arc means all round',  d.arcOf({ type: 'normal', arc: null }, {}), 360);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
