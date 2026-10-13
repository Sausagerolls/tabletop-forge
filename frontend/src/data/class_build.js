// Per-class CORE TRAITS — the baseline kit a class hands out.
//
// SRD 5.2 (2024) coverage: hit die, saving throw proficiencies,
// weapon proficiencies, armor training, primary ability, and a
// starting-equipment option pair (A = bundled gear, B = flat gp
// budget). The PHB's per-class multiclass-grants subsets aren't in
// the open SRD but are encoded here from the published rules so
// multiclass slots only hand out what they're meant to.
//
// Shape per class:
//   {
//     primary: { abilities: ['STR','DEX'], mode: 'any' | 'all' },
//     hitDie: 'd10',
//     saves: ['STR','CON'],            // 6-letter ability codes
//     armor: ['Light','Medium','Heavy','Shields'],
//     weapons: ['Simple','Martial'],
//     startingEquipment: {
//       optionA: { items: [...], gp: 4 },
//       optionB: { gp: 155 },
//       optionC: { ... },             // only where a class prints a third
//     },
//     multiclass: {
//       prereq:  { abilities: ['STR','DEX'], min: 13, mode: 'any' },
//       grants:  { armor: [...], weapons: [...], skills: [...] },
//     },
//   }
//
// Ability codes: STR / DEX / CON / INT / WIS / CHA. `mode` only
// matters for multi-ability classes (Paladin: STR AND CHA, Fighter:
// STR OR DEX). Single-ability classes pass mode: 'all' with one
// entry — same as 'any' for the prereq check, kept consistent for
// the display layer.

export const CLASS_BUILD = {
  Barbarian: {
    primary: { abilities: ['STR'], mode: 'all' },
    hitDie: 'd12',
    saves: ['STR', 'CON'],
    armor: ['Light', 'Medium', 'Shields'],
    weapons: ['Simple', 'Martial'],
    startingEquipment: {
      optionA: { items: ['Greataxe', 'Handaxe', 'Handaxe', 'Handaxe', 'Handaxe', "Explorer's Pack"], gp: 15 },
      optionB: { gp: 75 },
    },
    multiclass: {
      prereq: { abilities: ['STR'], min: 13, mode: 'all' },
      grants: { armor: ['Shields'], weapons: ['Martial'] },
    },
  },

  // Not an SRD class: the Blood Hunter is Matt Mercer's, published free by
  // Critical Role. Encoded from its own class table (2020 revision) so the
  // builder hands out the right kit rather than falling back to the d8
  // default. Hemocraft is Intelligence or Wisdom, chosen at level 1, which is
  // why the primary ability below lists the weapon stat and INT together.
  'Blood Hunter': {
    primary: { abilities: ['DEX', 'INT'], mode: 'any' },
    hitDie: 'd10',
    saves: ['DEX', 'INT'],
    armor: ['Light', 'Medium', 'Shields'],
    weapons: ['Simple', 'Martial'],
    tools: ["Alchemist's Supplies"],
    startingEquipment: {
      optionA: { items: ['Longsword', 'Light Crossbow', 'Crossbow Bolts (20)', 'Studded Leather Armor', "Explorer's Pack", "Alchemist's Supplies"], gp: 0 },
      optionB: { items: ['Shortsword', 'Shortsword', 'Hand Crossbow', 'Crossbow Bolts (20)', 'Scale Mail', "Explorer's Pack", "Alchemist's Supplies"], gp: 0 },
    },
    multiclass: {
      prereq: { abilities: ['INT'], min: 13, mode: 'all', note: 'Intelligence 13, and Strength or Dexterity 13.' },
      grants: { armor: ['Light', 'Medium', 'Shields'], weapons: ['Simple', 'Martial'] },
    },
  },

  Bard: {
    primary: { abilities: ['CHA'], mode: 'all' },
    hitDie: 'd8',
    saves: ['DEX', 'CHA'],
    armor: ['Light'],
    weapons: ['Simple'],
    startingEquipment: {
      optionA: { items: ['Leather Armor', 'Dagger', 'Dagger', 'Lute', "Diplomat's Pack"], gp: 19 },
      optionB: { gp: 90 },
    },
    multiclass: {
      prereq: { abilities: ['CHA'], min: 13, mode: 'all' },
      // Plus one Bard skill of choice (handled via the multi-skills
      // class-choice path) and one musical instrument (player
      // picks). Encoded as bare profs here; the skill / instrument
      // pick is surfaced in the multiclass row UI as a choice.
      grants: { armor: ['Light'] },
    },
  },

  Cleric: {
    primary: { abilities: ['WIS'], mode: 'all' },
    hitDie: 'd8',
    saves: ['WIS', 'CHA'],
    armor: ['Light', 'Medium', 'Shields'],
    weapons: ['Simple'],
    startingEquipment: {
      optionA: { items: ['Chain Shirt', 'Shield', 'Mace', 'Holy Symbol', "Priest's Pack"], gp: 7 },
      optionB: { gp: 110 },
    },
    multiclass: {
      prereq: { abilities: ['WIS'], min: 13, mode: 'all' },
      grants: { armor: ['Light', 'Medium', 'Shields'] },
    },
  },

  Druid: {
    primary: { abilities: ['WIS'], mode: 'all' },
    hitDie: 'd8',
    saves: ['INT', 'WIS'],
    armor: ['Light', 'Shields'],   // non-metal — flavour only, schema-wise still standard
    weapons: ['Simple'],
    startingEquipment: {
      optionA: { items: ['Leather Armor', 'Shield', 'Sickle', 'Quarterstaff', 'Druidic Focus', "Explorer's Pack", "Herbalism Kit"], gp: 9 },
      optionB: { gp: 50 },
    },
    multiclass: {
      prereq: { abilities: ['WIS'], min: 13, mode: 'all' },
      grants: { armor: ['Light'] },
    },
  },

  Fighter: {
    primary: { abilities: ['STR', 'DEX'], mode: 'any' },
    hitDie: 'd10',
    saves: ['STR', 'CON'],
    armor: ['Light', 'Medium', 'Heavy', 'Shields'],
    weapons: ['Simple', 'Martial'],
    startingEquipment: {
      // THREE options, not two. The Fighter is the only 2024 class printed
      // with a second gear bundle — "(A) … ; (B) Studded Leather, Scimitar,
      // Shortsword, Longbow, 20 Arrows, Quiver, Dungeoneer's Pack, and 11 GP;
      // or (C) 155 GP" — and the whole middle option was missing here, so a
      // Fighter was offered the heavy-armour kit or the cash and nothing else.
      optionA: { items: ['Chain Mail', 'Greatsword', 'Flail', 'Javelin', 'Javelin', 'Javelin', 'Javelin', 'Javelin', 'Javelin', 'Javelin', 'Javelin', "Dungeoneer's Pack"], gp: 4 },
      optionB: { items: ['Studded Leather Armor', 'Scimitar', 'Shortsword', 'Longbow', 'Arrows (20)', 'Quiver', "Dungeoneer's Pack"], gp: 11 },
      optionC: { gp: 155 },
    },
    multiclass: {
      prereq: { abilities: ['STR', 'DEX'], min: 13, mode: 'any' },
      grants: { armor: ['Light', 'Medium', 'Shields'], weapons: ['Simple', 'Martial'] },
    },
  },

  Monk: {
    primary: { abilities: ['DEX', 'WIS'], mode: 'all' },
    hitDie: 'd8',
    saves: ['STR', 'DEX'],
    armor: [],
    weapons: ['Simple', 'Martial (Light)'],
    startingEquipment: {
      optionA: { items: ['Spear', 'Dagger', 'Dagger', 'Dagger', 'Dagger', 'Dagger', "Artisan's Tools", "Explorer's Pack"], gp: 11 },
      optionB: { gp: 50 },
    },
    multiclass: {
      prereq: { abilities: ['DEX', 'WIS'], min: 13, mode: 'all' },
      grants: { weapons: ['Simple', 'Martial (Light)'] },
    },
  },

  Paladin: {
    primary: { abilities: ['STR', 'CHA'], mode: 'all' },
    hitDie: 'd10',
    saves: ['WIS', 'CHA'],
    armor: ['Light', 'Medium', 'Heavy', 'Shields'],
    weapons: ['Simple', 'Martial'],
    startingEquipment: {
      optionA: { items: ['Chain Mail', 'Shield', 'Longsword', 'Javelin', 'Javelin', 'Javelin', 'Javelin', 'Javelin', 'Javelin', 'Holy Symbol', "Priest's Pack"], gp: 9 },
      optionB: { gp: 150 },
    },
    multiclass: {
      prereq: { abilities: ['STR', 'CHA'], min: 13, mode: 'all' },
      grants: { armor: ['Light', 'Medium', 'Shields'], weapons: ['Simple', 'Martial'] },
    },
  },

  Ranger: {
    primary: { abilities: ['DEX', 'WIS'], mode: 'all' },
    hitDie: 'd10',
    saves: ['STR', 'DEX'],
    armor: ['Light', 'Medium', 'Shields'],
    weapons: ['Simple', 'Martial'],
    startingEquipment: {
      optionA: { items: ['Studded Leather Armor', 'Scimitar', 'Shortsword', 'Longbow', 'Arrows (20)', 'Quiver', 'Druidic Focus', "Explorer's Pack"], gp: 7 },
      optionB: { gp: 150 },
    },
    multiclass: {
      prereq: { abilities: ['DEX', 'WIS'], min: 13, mode: 'all' },
      // Plus one Ranger skill (handled via multi-skills choice).
      grants: { armor: ['Light', 'Medium', 'Shields'], weapons: ['Simple', 'Martial'] },
    },
  },

  Rogue: {
    primary: { abilities: ['DEX'], mode: 'all' },
    hitDie: 'd8',
    saves: ['DEX', 'INT'],
    armor: ['Light'],
    weapons: ['Simple', 'Martial (Finesse or Light)'],
    startingEquipment: {
      optionA: { items: ['Leather Armor', 'Dagger', 'Dagger', 'Shortsword', 'Shortbow', 'Arrows (20)', 'Quiver', "Thieves' Tools", "Burglar's Pack"], gp: 8 },
      optionB: { gp: 100 },
    },
    multiclass: {
      prereq: { abilities: ['DEX'], min: 13, mode: 'all' },
      // Plus one Rogue skill of choice + Thieves' Tools.
      grants: { armor: ['Light'], tools: ["Thieves' Tools"] },
    },
  },

  Sorcerer: {
    primary: { abilities: ['CHA'], mode: 'all' },
    hitDie: 'd6',
    saves: ['CON', 'CHA'],
    armor: [],
    weapons: ['Simple'],
    startingEquipment: {
      optionA: { items: ['Spear', 'Dagger', 'Dagger', 'Arcane Focus (Crystal)', "Dungeoneer's Pack"], gp: 28 },
      optionB: { gp: 50 },
    },
    multiclass: {
      prereq: { abilities: ['CHA'], min: 13, mode: 'all' },
      grants: {},   // Sorcerer multiclass grants no profs in 2024 PHB
    },
  },

  Warlock: {
    primary: { abilities: ['CHA'], mode: 'all' },
    hitDie: 'd8',
    saves: ['WIS', 'CHA'],
    armor: ['Light'],
    weapons: ['Simple'],
    startingEquipment: {
      optionA: { items: ['Leather Armor', 'Sickle', 'Dagger', 'Dagger', 'Arcane Focus (Orb)', 'Book (Occult Lore)', "Scholar's Pack"], gp: 15 },
      optionB: { gp: 100 },
    },
    multiclass: {
      prereq: { abilities: ['CHA'], min: 13, mode: 'all' },
      grants: { armor: ['Light'], weapons: ['Simple'] },
    },
  },

  Wizard: {
    primary: { abilities: ['INT'], mode: 'all' },
    hitDie: 'd6',
    saves: ['INT', 'WIS'],
    armor: [],
    weapons: ['Simple'],
    startingEquipment: {
      optionA: { items: ['Dagger', 'Dagger', 'Quarterstaff', 'Robe', 'Spellbook', "Scholar's Pack"], gp: 5 },
      optionB: { gp: 55 },
    },
    multiclass: {
      prereq: { abilities: ['INT'], min: 13, mode: 'all' },
      grants: {},   // Wizard multiclass grants no profs
    },
  },

  Artificer: {
    primary: { abilities: ['INT'], mode: 'all' },
    hitDie: 'd8',
    saves: ['CON', 'INT'],
    armor: ['Light', 'Medium', 'Shields'],
    weapons: ['Simple'],
    startingEquipment: {
      optionA: { items: ['Studded Leather Armor', 'Shield', 'Light Crossbow', 'Bolts (20)', "Thieves' Tools", "Tinker's Tools", "Dungeoneer's Pack"], gp: 8 },
      optionB: { gp: 90 },
    },
    multiclass: {
      prereq: { abilities: ['INT'], min: 13, mode: 'all' },
      grants: { armor: ['Light', 'Medium', 'Shields'], tools: ["Thieves' Tools", "Tinker's Tools"] },
    },
  },
};

const ABILITY_NAME = {
  STR: 'Strength', DEX: 'Dexterity', CON: 'Constitution',
  INT: 'Intelligence', WIS: 'Wisdom', CHA: 'Charisma',
};
const ABILITY_FIELD = {
  STR: 'strength', DEX: 'dexterity', CON: 'constitution',
  INT: 'intelligence', WIS: 'wisdom', CHA: 'charisma',
};

// Module-level reference written by the CustomClassesProvider on
// load. Static import would create a circular (pluginRegistry →
// classes.js → here → pluginRegistry), so we let the provider
// register a thunk that resolves to the registry's current value.
let _customLookup = null;
export function _registerCustomClassBuildLookup(fn) { _customLookup = fn; }

// The starting-equipment choices a class offers, in print order.
//
// Stored as optionA / optionB / … rather than an array because that is the
// shape the custom-class editor writes and every existing entry already uses.
// Read through here so a class with a third option is not silently truncated
// to two, which is what happened to the Fighter.
export function startingEquipmentOptions(build) {
  const sa = build?.startingEquipment || {};
  return ['A', 'B', 'C', 'D']
    .map((id) => ({ id, ...(sa[`option${id}`] || {}) }))
    .filter((o) => (o.items && o.items.length) || Number(o.gp) > 0);
}

export function getClassBuild(className) {
  if (!className) return null;
  if (CLASS_BUILD[className]) return CLASS_BUILD[className];
  if (_customLookup) {
    const hit = _customLookup(className);
    if (hit) return hit;
  }
  return null;
}

// Human-readable primary-ability summary: "Strength" / "Strength and
// Charisma" / "Strength or Dexterity".
export function formatPrimaryAbility(primary) {
  if (!primary || !Array.isArray(primary.abilities) || primary.abilities.length === 0) return '';
  const names = primary.abilities.map(a => ABILITY_NAME[a] || a);
  if (names.length === 1) return names[0];
  const joiner = primary.mode === 'any' ? ' or ' : ' and ';
  return names.join(joiner);
}

// Returns true when the creature meets the prereq for taking a level
// in `className`. Single-ability classes use min ≥ 13. Mode 'all'
// requires every ability ≥ min; 'any' requires at least one ≥ min.
export function meetsMulticlassPrereq(creature, className) {
  const build = getClassBuild(className);
  if (!build) return true;          // Custom classes — let it through.
  const prereq = build.multiclass?.prereq;
  if (!prereq || !Array.isArray(prereq.abilities)) return true;
  const min = Number(prereq.min) || 13;
  const scores = prereq.abilities.map(ab => Number(creature?.[ABILITY_FIELD[ab]]) || 0);
  return prereq.mode === 'any'
    ? scores.some(s => s >= min)
    : scores.every(s => s >= min);
}

// "Requires Wisdom 13 (current 11)" style explanation when the
// prereq fails. Returns null when the prereq passes.
export function multiclassPrereqExplanation(creature, className) {
  const build = getClassBuild(className);
  if (!build) return null;
  const prereq = build.multiclass?.prereq;
  if (!prereq || !Array.isArray(prereq.abilities)) return null;
  const min = Number(prereq.min) || 13;
  const lines = prereq.abilities.map(ab => {
    const cur = Number(creature?.[ABILITY_FIELD[ab]]) || 0;
    return `${ABILITY_NAME[ab] || ab} ${cur} / ${min}`;
  });
  if (meetsMulticlassPrereq(creature, className)) return null;
  const mode = prereq.mode === 'any' ? 'any of' : 'all of';
  return `Multiclass requires ${mode}: ${lines.join(', ')}.`;
}
