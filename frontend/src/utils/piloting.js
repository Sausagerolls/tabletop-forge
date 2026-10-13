// Who may take a spelljamming helm.
//
// The rule is spell slots, not class: if the character has slots, they can fly
// the ship. A spelljamming helm is an attuned magic item and attunement wants a
// caster, so the resource is the qualification — which also means homebrew and
// custom classes work without anyone maintaining a list of names here.
//
// Client mirror of backend/src/piloting.js — the server refuses the move if
// these two disagree, so any change here has to be made there too.
//
// Slots come from two places and EITHER is enough:
//
//   1. The sheet (creature.spell_slots). Authoritative when present, because it
//      is where a GM's manual totals and any custom class's slots land.
//   2. Derived from class + level, the same progression the sheet shows. This is
//      the common case: the column starts as `{}` and is only written back the
//      first time somebody ticks a slot, so a level 5 sorcerer who has not cast
//      anything yet still has an empty column and obviously still has slots.
//
// Warlocks count via Pact Magic — different resource, same answer.
//
// The tables are restated here rather than imported from data/classes.js on
// purpose. spellSlotsFor() answers a narrower question — what the slot GRID
// should render — and drops Warlock (Pact Magic is tracked separately) and
// Artificer entirely. Both have slots and both can fly, so borrowing it would
// ground them.

const FULL_CASTERS = new Set(['bard', 'cleric', 'druid', 'sorcerer', 'wizard']);
// Artificer has slots from level 1; Paladin and Ranger from level 2.
const HALF_CASTERS = new Set(['paladin', 'ranger']);
// Magic arrives with the subclass, chosen at level 3.
const SUBCLASS_CASTERS = new Set(['eldritch knight', 'arcane trickster']);

const norm = (s) => String(s || '').trim().toLowerCase();

// Does this one class/subclass/level combination produce spell slots?
function classHasSlots(className, subclassName, level) {
  const cls = norm(className);
  const sub = norm(subclassName);
  const lvl = Math.max(1, Number(level) || 1);
  if (FULL_CASTERS.has(cls)) return true;
  if (cls === 'warlock') return true;     // Pact Magic
  if (cls === 'artificer') return true;   // half caster, but from level 1
  if (HALF_CASTERS.has(cls)) return lvl >= 2;
  if (SUBCLASS_CASTERS.has(sub)) return lvl >= 3;
  return false;
}

// Any slot with a total above zero on the stored sheet. Tolerates the value
// arriving as a JSON string, and the per-level entries being either `{total}`
// objects or bare numbers, since both shapes exist in the wild here.
export function sheetHasSlots(creature) {
  let slots = creature && creature.spell_slots;
  if (typeof slots === 'string') {
    try { slots = JSON.parse(slots); } catch { return false; }
  }
  if (!slots || typeof slots !== 'object') return false;
  return Object.values(slots).some((v) => {
    if (v == null) return false;
    const total = typeof v === 'object' ? v.total : v;
    return (Number(total) || 0) > 0;
  });
}

// Does this character have spell slots at all? Multiclassing is checked
// per-class, so a Fighter 5 / Wizard 1 qualifies on the Wizard side.
export function hasSpellSlots(creature) {
  if (!creature) return false;
  if (sheetHasSlots(creature)) return true;
  if (classHasSlots(creature.char_class, creature.char_subclass, creature.char_level)) return true;
  const mcs = Array.isArray(creature.multiclasses) ? creature.multiclasses : [];
  return mcs.some((mc) => mc && classHasSlots(mc.class, mc.subclass, mc.level));
}

// Named for the caller's question; the answer is "do they have slots".
export const canPilotHelm = hasSpellSlots;

// Why not — for the helm HUD, so a grounded player is told the rule rather than
// left wondering why the wheel does nothing.
export function pilotDenialReason(creature) {
  if (canPilotHelm(creature)) return null;
  const cls = String(creature?.char_class || '').trim();
  const sub = String(creature?.char_subclass || '').trim();
  const lvl = Math.max(1, Number(creature?.char_level) || 1);
  // Called out separately because these characters WILL qualify on level-up,
  // and "you have no spell slots" alone reads as a permanent no.
  if (norm(cls) === 'paladin' || norm(cls) === 'ranger') {
    return `${cls}s get spell slots at level 2 — this one is level ${lvl}. No slots, no helm.`;
  }
  if (SUBCLASS_CASTERS.has(norm(sub))) {
    return `${sub}s get spell slots at level 3 — this one is level ${lvl}. No slots, no helm.`;
  }
  return cls
    ? `A spelljamming helm has to be attuned by someone with spell slots, and a ${cls}${sub ? ` (${sub})` : ''} has none.`
    : 'A spelljamming helm has to be attuned by someone with spell slots.';
}
