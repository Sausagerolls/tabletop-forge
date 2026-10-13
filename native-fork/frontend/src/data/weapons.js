// SRD 5.2 / 2024 PHB weapon catalog. Used by:
//   - Fighter Weapon Mastery picker (filters by proficiency)
//   - Equipped Weapons / inventory dropdowns
//   - Future class features that reference specific weapons
//
// Each entry knows its category (Simple / Martial), kind (Melee /
// Ranged), and 2024 mastery property — letters that show up next to
// the weapon name when a character has it as a Mastery pick.
//
// Category aliases: when a creature's weapon_proficiencies CSV
// contains "Simple" / "Martial" / "Simple weapons" / "Martial
// weapons" we treat that as proficiency in EVERY weapon of that
// category. Plain ability dropdowns can also expand category
// proficiencies into the concrete list via expandWeaponProficiency.

// What each 2024 mastery property actually does.
//
// The weapon rows above carry only the NAME, and the item editor offers the
// eight names in a dropdown — so a sheet could say "Sap" and nothing in the app
// would tell you what Sap means. These are the effects, for readouts that have
// room to explain themselves.
//
// Keyed lower-case; look up with masteryText() rather than indexing directly,
// since sheets carry hand-typed capitalisation.
export const WEAPON_MASTERIES = {
  cleave: 'On a hit with a melee attack, make one attack roll against a second creature within 5 feet of the first and within your reach. On a hit it takes the weapon\'s damage, but add no modifiers. Once per turn.',
  graze: 'If your attack roll misses, the target still takes damage equal to the ability modifier you used for the attack roll. That damage is the weapon\'s type and gets no bonuses.',
  nick: 'When you make the extra attack granted by the Light property, you make it as part of the Attack action rather than as a Bonus Action. Once per turn.',
  push: 'On a hit, you can push the creature up to 10 feet straight away from you, if it is Large or smaller.',
  sap: 'On a hit, the creature has Disadvantage on its next attack roll before the start of your next turn.',
  slow: 'On a hit, if the creature\'s Speed is not already 0, reduce it by 10 feet until the start of your next turn. The reduction does not stack with itself.',
  topple: 'On a hit, the creature makes a Constitution saving throw against DC 8 + the ability modifier used for the attack + your Proficiency Bonus. On a failure it has the Prone condition.',
  vex: 'On a hit that deals damage, you have Advantage on your next attack roll against that creature before the end of your next turn.',
};

/** The effect text for a mastery name, however it was typed. */
export function masteryText(name) {
  const key = String(name || '').trim().toLowerCase();
  return WEAPON_MASTERIES[key] || '';
}

export const WEAPONS = [
  // ── Simple Melee ──────────────────────────────────────
  { name: 'Club',           category: 'Simple',  kind: 'Melee',  mastery: 'Slow' },
  { name: 'Dagger',         category: 'Simple',  kind: 'Melee',  mastery: 'Nick' },
  { name: 'Greatclub',      category: 'Simple',  kind: 'Melee',  mastery: 'Push' },
  { name: 'Handaxe',        category: 'Simple',  kind: 'Melee',  mastery: 'Vex' },
  { name: 'Javelin',        category: 'Simple',  kind: 'Melee',  mastery: 'Slow' },
  { name: 'Light Hammer',   category: 'Simple',  kind: 'Melee',  mastery: 'Nick' },
  { name: 'Mace',           category: 'Simple',  kind: 'Melee',  mastery: 'Sap' },
  { name: 'Quarterstaff',   category: 'Simple',  kind: 'Melee',  mastery: 'Topple' },
  { name: 'Sickle',         category: 'Simple',  kind: 'Melee',  mastery: 'Nick' },
  { name: 'Spear',          category: 'Simple',  kind: 'Melee',  mastery: 'Sap' },

  // ── Simple Ranged ─────────────────────────────────────
  { name: 'Dart',           category: 'Simple',  kind: 'Ranged', mastery: 'Vex' },
  { name: 'Light Crossbow', category: 'Simple',  kind: 'Ranged', mastery: 'Slow' },
  { name: 'Shortbow',       category: 'Simple',  kind: 'Ranged', mastery: 'Vex' },
  { name: 'Sling',          category: 'Simple',  kind: 'Ranged', mastery: 'Slow' },

  // ── Martial Melee ─────────────────────────────────────
  { name: 'Battleaxe',      category: 'Martial', kind: 'Melee',  mastery: 'Topple' },
  { name: 'Flail',          category: 'Martial', kind: 'Melee',  mastery: 'Sap' },
  { name: 'Glaive',         category: 'Martial', kind: 'Melee',  mastery: 'Graze' },
  { name: 'Greataxe',       category: 'Martial', kind: 'Melee',  mastery: 'Cleave' },
  { name: 'Greatsword',     category: 'Martial', kind: 'Melee',  mastery: 'Graze' },
  { name: 'Halberd',        category: 'Martial', kind: 'Melee',  mastery: 'Cleave' },
  { name: 'Lance',          category: 'Martial', kind: 'Melee',  mastery: 'Topple' },
  { name: 'Longsword',      category: 'Martial', kind: 'Melee',  mastery: 'Sap' },
  { name: 'Maul',           category: 'Martial', kind: 'Melee',  mastery: 'Topple' },
  { name: 'Morningstar',    category: 'Martial', kind: 'Melee',  mastery: 'Sap' },
  { name: 'Pike',           category: 'Martial', kind: 'Melee',  mastery: 'Push' },
  { name: 'Rapier',         category: 'Martial', kind: 'Melee',  mastery: 'Vex' },
  { name: 'Scimitar',       category: 'Martial', kind: 'Melee',  mastery: 'Nick' },
  { name: 'Shortsword',     category: 'Martial', kind: 'Melee',  mastery: 'Vex' },
  { name: 'Trident',        category: 'Martial', kind: 'Melee',  mastery: 'Topple' },
  { name: 'Warhammer',      category: 'Martial', kind: 'Melee',  mastery: 'Push' },
  { name: 'War Pick',       category: 'Martial', kind: 'Melee',  mastery: 'Sap' },
  { name: 'Whip',           category: 'Martial', kind: 'Melee',  mastery: 'Slow' },

  // ── Martial Ranged ────────────────────────────────────
  { name: 'Blowgun',        category: 'Martial', kind: 'Ranged', mastery: 'Vex' },
  { name: 'Hand Crossbow',  category: 'Martial', kind: 'Ranged', mastery: 'Vex' },
  { name: 'Heavy Crossbow', category: 'Martial', kind: 'Ranged', mastery: 'Push' },
  { name: 'Longbow',        category: 'Martial', kind: 'Ranged', mastery: 'Slow' },
  { name: 'Musket',         category: 'Martial', kind: 'Ranged', mastery: 'Slow' },
  { name: 'Pistol',         category: 'Martial', kind: 'Ranged', mastery: 'Vex' },
];

const SIMPLE_LOWER  = new Set(['simple', 'simple weapons']);
const MARTIAL_LOWER = new Set(['martial', 'martial weapons']);

// Expand a CSV of weapon proficiencies into the full set of concrete
// weapon names the character is proficient with. "Simple" /
// "Martial" entries fan out into every weapon of that category;
// individual weapon names stay as-is. Returns a Set<string> of
// weapon names matching the catalog (case-insensitive).
export function expandWeaponProficiency(csv) {
  const out = new Set();
  const tokens = String(csv || '')
    .split(/\s*,\s*/)
    .map(s => s.trim())
    .filter(Boolean);
  const byNameLower = new Map(WEAPONS.map(w => [w.name.toLowerCase(), w.name]));
  for (const tok of tokens) {
    const t = tok.toLowerCase();
    if (SIMPLE_LOWER.has(t))  { for (const w of WEAPONS) if (w.category === 'Simple')  out.add(w.name); continue; }
    if (MARTIAL_LOWER.has(t)) { for (const w of WEAPONS) if (w.category === 'Martial') out.add(w.name); continue; }
    // Any sub-bracket like "Martial (Light)" / "Martial (Finesse or
    // Light)" — hand back every weapon flagged with the matching
    // property would need a property index we don't have yet, so
    // for now we treat these as a category alias too. Surfacing
    // every Light/Finesse weapon needs a future weapon-property
    // index; flagging this so it isn't silently lost.
    if (t.startsWith('martial')) { for (const w of WEAPONS) if (w.category === 'Martial') out.add(w.name); continue; }
    if (t.startsWith('simple'))  { for (const w of WEAPONS) if (w.category === 'Simple')  out.add(w.name); continue; }
    const canonical = byNameLower.get(t);
    if (canonical) out.add(canonical);
  }
  return out;
}

// Sort key — Simple Melee, Simple Ranged, Martial Melee, Martial
// Ranged, then alphabetic inside each bucket. Used by the picker to
// keep the dropdown predictable.
export function sortWeaponNames(names) {
  const order = (cat, kind) =>
    (cat === 'Simple' ? 0 : 2) + (kind === 'Melee' ? 0 : 1);
  return [...names].sort((a, b) => {
    const wa = WEAPONS.find(w => w.name === a);
    const wb = WEAPONS.find(w => w.name === b);
    const oa = wa ? order(wa.category, wa.kind) : 99;
    const ob = wb ? order(wb.category, wb.kind) : 99;
    if (oa !== ob) return oa - ob;
    return a.localeCompare(b);
  });
}
