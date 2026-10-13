// Who may take a spelljamming helm. Authoritative copy.
//
// The rule is spell slots, not class: if the character has slots, they can fly
// the ship. A spelljamming helm is an attuned magic item and attunement wants a
// caster, so the resource is the qualification — which also means homebrew and
// custom classes work without anyone maintaining a list of names here.
//
// Kept deliberately identical to frontend/src/utils/piloting.js. If the two
// disagree, the UI offers a wheel the server then refuses to turn.
//
// Slots come from two places and EITHER is enough:
//
//   1. The sheet (creatures.spell_slots). Authoritative when present, because
//      it is where a GM's manual totals and any custom class's slots land.
//   2. Derived from class + level, the same progression the character sheet
//      shows. This is the common case: the column starts as `{}` and is only
//      written back the first time somebody ticks a slot, so a level 5 sorcerer
//      who has not cast anything yet still has an empty column and obviously
//      still has slots.
//
// Warlocks count via Pact Magic — different resource, same answer.

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

// Any slot with a total above zero on the stored sheet. Tolerates the jsonb
// arriving as a string, and the per-level values being either `{total}` objects
// or bare numbers, since both shapes exist in the wild here.
function sheetHasSlots(creature) {
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

// Does this character have spell slots at all?
//
// Multiclassing is checked per-class, so a Fighter 5 / Wizard 1 qualifies on the
// Wizard side. A creature with no class and no stored slots — a monster, an NPC
// token — does not.
function hasSpellSlots(creature) {
  if (!creature) return false;
  if (sheetHasSlots(creature)) return true;
  if (classHasSlots(creature.char_class, creature.char_subclass, creature.char_level)) return true;
  let mcs = creature.multiclasses;
  if (typeof mcs === 'string') {
    try { mcs = JSON.parse(mcs); } catch { mcs = []; }
  }
  return Array.isArray(mcs) && mcs.some((mc) => mc && classHasSlots(mc.class, mc.subclass, mc.level));
}

// Named for the caller's question; the answer is "do they have slots".
const canPilotHelm = hasSpellSlots;

module.exports = { canPilotHelm, hasSpellSlots, sheetHasSlots };
