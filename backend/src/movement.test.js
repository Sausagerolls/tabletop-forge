// The movement budget, without a database.  node src/movement.test.js

const m = require('./movement');

let pass = 0, fail = 0;
const check = (label, got, want) => {
  const ok = got === want;
  ok ? (pass++, console.log(`  ok    ${label}`))
     : (fail++, console.log(`  FAIL  ${label} — got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`));
};
const section = (n) => console.log(`\n${n}`);

const T0 = 1_000_000;
// The sequence started at T0, so rounds run T0..T0+6s, T0+6s..T0+12s, …
const ANCHOR = new Date(T0);
// A token standing at 0,0 with a 30 ft walk and nothing spent.
const tok = (over = {}) => ({
  id: 1, grid_col: 0, grid_row: 0, creature_speed: 30,
  move_spent: 0, move_window_at: null, ...over,
});

section('Distance — Chebyshev, matching the ruler on the flat map');
check('4 squares east = 20 ft', m.distanceFt(0, 0, 4, 0), 20);
check('4 squares south = 20 ft', m.distanceFt(0, 0, 0, 4), 20);
check('a diagonal costs the same as a straight line', m.distanceFt(0, 0, 4, 4), 20);
check('3 across and 6 down is 6 squares', m.distanceFt(0, 0, 3, 6), 30);
check('moving back costs the same', m.distanceFt(4, 0, 0, 0), 20);

section('The round clock — one for the table');
{
  check('the round containing T0+1s started at T0', m.roundStart(ANCHOR, T0 + 1000), T0);
  check('T0+5.9s is still the first round', m.roundStart(ANCHOR, T0 + 5900), T0);
  check('T0+6s has ticked over', m.roundStart(ANCHOR, T0 + 6000), T0 + 6000);
  check('T0+20s is the fourth round', m.roundStart(ANCHOR, T0 + 20000), T0 + 18000);
  check('no sequence running means no round', m.roundStart(null, T0), null);
}

section('A fresh round');
{
  const t = tok();
  check('full speed available', m.stateOf(t, ANCHOR, T0 + 100).remaining, 30);
  check('and the clock says when it refills', m.stateOf(t, ANCHOR, T0 + 100).resetsAt, T0 + 6000);
  const r = m.consider(t, 6, 0, ANCHOR, T0 + 100);       // 30 ft
  check('exactly the speed is allowed', r.allowed, true);
  check('and leaves nothing', r.remaining, 0);
  check('with no sequence running there is no limit',
    m.stateOf(t, null, T0).remaining, 30);
}

section('Spending it down inside one round');
{
  // 15 ft already spent, two seconds into the first round.
  const t = tok({ move_spent: 15, move_window_at: new Date(T0 + 2000) });
  const NOW = T0 + 3000;
  check('15 ft left', m.stateOf(t, ANCHOR, NOW).remaining, 15);
  check('a 15 ft move fits', m.consider(t, 3, 0, ANCHOR, NOW).allowed, true);
  check('a 20 ft move does not', m.consider(t, 4, 0, ANCHOR, NOW).allowed, false);
  check('a refused move spends nothing', m.consider(t, 4, 0, ANCHOR, NOW).spent, 15);
  check('a refused move still reports what it wanted', m.consider(t, 4, 0, ANCHOR, NOW).costFt, 20);
  check('the clock is the round\'s, not the move\'s',
    m.consider(t, 3, 0, ANCHOR, NOW).resetsAt, T0 + 6000);
}

section('The round ticking over refills everyone');
{
  const spent = tok({ move_spent: 30, move_window_at: new Date(T0 + 1000) });
  check('nothing left later in the same round', m.stateOf(spent, ANCHOR, T0 + 5000).remaining, 0);
  check('a move is refused', m.consider(spent, 1, 0, ANCHOR, T0 + 5000).allowed, false);

  const nextRound = T0 + 6100;
  check('full speed back in the next round', m.stateOf(spent, ANCHOR, nextRound).remaining, 30);
  check('and the move goes through', m.consider(spent, 6, 0, ANCHOR, nextRound).allowed, true);
  check('spend from a previous round does not carry over',
    m.stateOf(spent, ANCHOR, nextRound).spent, 0);
  check('the clock now points at the end of THIS round',
    m.stateOf(spent, ANCHOR, nextRound).resetsAt, T0 + 12000);
}

section('The GM is charged but never refused');
{
  const t = tok({ move_spent: 25, move_window_at: new Date(T0 + 500) });
  const NOW = T0 + 1000;
  check('a player is refused', m.consider(t, 6, 0, ANCHOR, NOW).allowed, false);
  const gm = m.considerUncapped(t, 6, 0, ANCHOR, NOW);
  check('the GM is not', gm.allowed, true);
  check('and it is marked as an override', gm.overridden, true);
  check('the budget is emptied, never left negative', gm.remaining, 0);
  check('an affordable GM move is charged normally',
    m.considerUncapped(tok(), 2, 0, ANCHOR, NOW).spent, 10);
  check('and is not marked as an override',
    !!m.considerUncapped(tok(), 2, 0, ANCHOR, NOW).overridden, false);
}

section('Which speed — flying, and forcing a mode');
{
  const NOW = T0 + 1000;
  const flier = (over = {}) => tok({
    creature_speed: 30, creature_speed_fly: 60, creature_speed_swim: 20,
    creature_speed_climb: 0, creature_speed_burrow: 0, ...over,
  });

  check('on the ground, auto walks', m.speedOf(flier(), 'auto').ft, 30);
  check('the is_flying flag switches to the fly speed',
    m.speedOf(flier({ is_flying: true }), 'auto').ft, 60);
  check('so does any elevation, flag or not',
    m.speedOf(flier({ elevation: 15 }), 'auto').ft, 60);
  check('zero elevation is on the ground',
    m.speedOf(flier({ elevation: 0 }), 'auto').ft, 30);
  check('a flier with no fly speed still walks',
    m.speedOf(flier({ is_flying: true, creature_speed_fly: 0 }), 'auto').ft, 30);
  check('and reports the mode it actually used',
    m.speedOf(flier({ is_flying: true, creature_speed_fly: 0 }), 'auto').mode, 'walk');

  check('a forced mode ignores what the token is doing',
    m.speedOf(flier({ is_flying: true }), 'swim').ft, 20);
  check('forcing a speed the creature lacks falls back to walking',
    m.speedOf(flier(), 'climb').ft, 30);
  check('an unknown mode is treated as auto',
    m.speedOf(flier({ is_flying: true }), 'nonsense').ft, 60);

  check('the budget follows the token\'s stored mode',
    m.stateOf(flier({ is_flying: true, move_mode: 'walk' }), ANCHOR, NOW).budget, 30);
  check('and auto gives a flier its wings',
    m.stateOf(flier({ is_flying: true, move_mode: null }), ANCHOR, NOW).budget, 60);
  check('a 60 ft flier can cross 12 squares in a round',
    m.consider(flier({ is_flying: true }), 12, 0, ANCHOR, NOW).allowed, true);
  check('but not 13',
    m.consider(flier({ is_flying: true }), 13, 0, ANCHOR, NOW).allowed, false);
}

section('Edge cases');
{
  const NOW = T0 + 1000;
  check('a token with no speed falls back to 30', m.stateOf(tok({ creature_speed: null }), ANCHOR, NOW).budget, 30);
  check('a fast token gets its own speed', m.stateOf(tok({ creature_speed: 60 }), ANCHOR, NOW).budget, 60);
  check('standing still is always allowed',
    m.consider(tok({ move_spent: 30, move_window_at: new Date(T0 + 500) }), 0, 0, ANCHOR, NOW).allowed, true);
  // The tolerance exists for a drag that lands a hair over an exact-speed move.
  check('a hair over the budget is forgiven',
    m.consider(tok(), 6.005, 0, ANCHOR, NOW).allowed, true);
  check('a whole square over is not',
    m.consider(tok(), 7, 0, ANCHOR, NOW).allowed, false);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
