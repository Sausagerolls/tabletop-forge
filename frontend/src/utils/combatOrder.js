// Height of the initiative strip across the top of the map, in pixels.
//
// Here rather than in either view because both of them draw the strip AND both
// have a top bar that goes `position: fixed` in the 3D view — at which point
// the bar stops being pushed down by the strip and has to add this back by
// hand. Two independent copies of the number would drift the first time the
// strip changed height, and the symptom (a bar overlapping the turn order in
// 3D only) is exactly the kind nobody notices until mid-session.
export const COMBAT_STRIP_H = 76;

// The initiative order, tokens and ships together.
//
// Ships roll their own initiative in ship-to-ship combat, so a hull is a
// combatant in its own right rather than a prop the crew stands on.
//
// This lives in one place because `combat_turn` is an INDEX into this list,
// and the GM, the players and the spectator each build it locally. If any of
// them ordered it differently — or left ships out — the same index would point
// at a different combatant in each view, and the highlighted turn would
// disagree across the table.
export function buildCombatOrder(tokens = [], ships = []) {
  const entries = [];

  for (const t of tokens) {
    if (t.is_hidden || !t.in_combat) continue;
    entries.push({
      kind: 'token',
      key: `t${t.id}`,
      id: t.id,
      initiative: t.initiative,
      name: t.nickname || t.name,
      token: t,
    });
  }

  for (const s of ships) {
    if (!s.in_combat) continue;
    entries.push({
      kind: 'ship',
      key: `s${s.id}`,
      id: s.id,
      initiative: s.initiative,
      name: s.name || s.class_name || 'Ship',
      ship: s,
    });
  }

  // Highest first. Ties break tokens-before-ships and then by id, so the order
  // is deterministic everywhere rather than depending on array order — two
  // clients sorting the same ties differently is the bug this avoids.
  return entries.sort((a, b) => {
    const d = (b.initiative ?? 0) - (a.initiative ?? 0);
    if (d) return d;
    if (a.kind !== b.kind) return a.kind === 'token' ? -1 : 1;
    return a.id - b.id;
  });
}

// A ship's max hull, straight off its library class. Placed hulls carry the
// class row's hull_hp alongside their own current_hp.
export function shipMaxHp(ship) {
  return Number(ship?.hull_hp) || 0;
}

// current_hp is NULL on a ship that has never been damaged — that reads as
// full, not as zero.
export function shipCurrentHp(ship) {
  return ship?.current_hp == null ? shipMaxHp(ship) : Number(ship.current_hp) || 0;
}
