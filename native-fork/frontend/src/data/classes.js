// SRD 5.2.1 (2024) class choices — the level-1 "build choices" that
// classes ask the player to make on top of just picking the class
// itself (and the subclass). E.g. a Cleric still has to pick a
// Divine Order, a Rogue picks two skills for Expertise, a Fighter
// picks three weapons for Weapon Mastery.
//
// Three choice kinds are supported:
//   • single        — pick one option from a fixed list. Each option
//                     declares its own `adds: { armor, weapons, traits,
//                     skills, spells }` to fold into the stat block.
//   • multi-weapons — pick N weapon names. Picks land in the
//                     creature's `weapon_proficiencies` CSV.
//   • multi-skills  — pick N skills. Picks set skill_X to the
//                     proficient (or expert) bonus and flip
//                     skill_expertise where applicable.
//
// Plugins can register more via the `customClassChoices` registry
// keyed by class name (see frontend/src/utils/classes.js helpers).
//
// Shape of an `adds` block, all optional:
//   {
//     armor: ['light' | 'medium' | 'heavy' | 'shields'],
//     weapons: ['Martial weapons' | 'Longsword' | …],
//     skills: [{ skill: 'skill_x', level: 'proficient' | 'expertise' }],
//     skill_bonuses: [{ skills: ['skill_x'], ability: 'wisdom',
//                       min: 1, label: 'Primal Order (Magician)' }],
//     spells: [{ name: 'Hunter\'s Mark', minLevel: 1, prepared: true }],
//     traits: [{ name, desc, category: 'specialAbility'|'action'|'bonusAction'|'reaction' }],
//   }
// `prepared` (default true) controls whether the spell lands on the
// character sheet flagged as always-prepared (lineage / class-feature
// behaviour) or just appended to the known list for the player to
// slot into a prep list themselves.

export const CLASS_CHOICES_2024 = {
  // Printed in Eberron: Forge of the Artificer rather than the PHB, which is
  // why it was missing here: the builder offered the class but asked for none
  // of its choices, so an Artificer started with no skill proficiencies.
  Artificer: [
    {
      id: 'class-skills',
      label: 'Skill Proficiencies',
      at_level: 1,
      desc: "Choose 2 from the list. These are the proficiencies the class starts with.",
      kind: 'multi-skills',
      grant: 'proficient',
      pick_count: 2,
      from: ['skill_arcana', 'skill_history', 'skill_investigation', 'skill_medicine',
        'skill_nature', 'skill_perception', 'skill_sleight_of_hand'],
    },
  ],

  // Not SRD: Matt Mercer's Blood Hunter (2020 revision), free from Critical
  // Role. Its level-1 asks are three skills and which ability drives hemocraft;
  // the Fighting Style at level 2 is offered here too, the way the other
  // martial classes do it.
  'Blood Hunter': [
    {
      id: 'class-skills',
      label: 'Skill Proficiencies',
      at_level: 1,
      desc: 'Choose 3 from the list.',
      kind: 'multi-skills',
      grant: 'proficient',
      pick_count: 3,
      from: ['skill_acrobatics', 'skill_arcana', 'skill_athletics', 'skill_history',
        'skill_insight', 'skill_investigation', 'skill_religion', 'skill_survival'],
    },
    {
      id: 'hemocraft-ability',
      label: 'Hemocraft Ability',
      at_level: 1,
      desc: 'Your curses, brands and several later features are worked with one mind-stat of your choice. Pick it now: it sets your save DC (8 + Proficiency Bonus + that modifier) and never changes.',
      kind: 'single',
      options: [
        {
          id: 'hemocraft-int',
          name: 'Intelligence',
          desc: 'The scholar\'s route — the usual choice, and the one most order features are written around.',
          adds: {
            traits: [{ name: 'Hemocraft (Intelligence)', category: 'specialAbility',
              desc: 'Your hemocraft modifier is your Intelligence modifier. Blood curse save DC = 8 + Proficiency Bonus + Intelligence modifier.' }],
          },
        },
        {
          id: 'hemocraft-wis',
          name: 'Wisdom',
          desc: 'The instinctive route. Ask your GM — some tables keep hemocraft to Intelligence.',
          adds: {
            traits: [{ name: 'Hemocraft (Wisdom)', category: 'specialAbility',
              desc: 'Your hemocraft modifier is your Wisdom modifier. Blood curse save DC = 8 + Proficiency Bonus + Wisdom modifier.' }],
          },
        },
      ],
    },
    {
      id: 'blood-hunter-fighting-style',
      label: 'Fighting Style',
      at_level: 2,
      desc: 'The way you fight, chosen at level 2.',
      kind: 'single',
      options: [
        { id: 'bh-archery', name: 'Archery', desc: '+2 to attack rolls with ranged weapons.',
          adds: { traits: [{ name: 'Fighting Style: Archery', category: 'specialAbility', desc: 'You gain a +2 bonus to attack rolls you make with ranged weapons.' }] } },
        { id: 'bh-dueling', name: 'Dueling', desc: '+2 damage with a single one-handed weapon.',
          adds: { traits: [{ name: 'Fighting Style: Dueling', category: 'specialAbility', desc: 'When wielding a melee weapon in one hand and no other weapon, you gain a +2 bonus to damage rolls with it.' }] } },
        { id: 'bh-great-weapon', name: 'Great Weapon Fighting', desc: 'Reroll 1s and 2s on two-handed weapon damage.',
          adds: { traits: [{ name: 'Fighting Style: Great Weapon Fighting', category: 'specialAbility', desc: 'When you roll a 1 or 2 on a damage die for a two-handed or versatile melee weapon, reroll it once. Rite damage is not rerolled.' }] } },
        { id: 'bh-two-weapon', name: 'Two-Weapon Fighting', desc: 'Add your ability modifier to the off-hand attack.',
          adds: { traits: [{ name: 'Fighting Style: Two-Weapon Fighting', category: 'specialAbility', desc: 'When you fight with two weapons, you can add your ability modifier to the damage of the second attack.' }] } },
      ],
    },
  ],

  Cleric: [
    {
      id: 'class-skills',
      label: 'Skill Proficiencies',
      at_level: 1,
      desc: "Choose 2 from the list. These are the proficiencies the class starts with.",
      kind: 'multi-skills',
      grant: 'proficient',
      pick_count: 2,
      from: ['skill_history', 'skill_insight', 'skill_medicine', 'skill_persuasion', 'skill_religion'],
    },
    {
      id: 'divine-order',
      label: 'Divine Order',
      at_level: 1,
      desc: "When you take a Cleric level you devote yourself to a divine role. Choose Protector or Thaumaturge.",
      kind: 'single',
      options: [
        {
          id: 'protector',
          name: 'Protector',
          desc: "Trained for battle. You gain proficiency with martial weapons and heavy armor.",
          adds: {
            armor: ['heavy'],
            weapons: ['Martial weapons'],
          },
        },
        {
          id: 'thaumaturge',
          name: 'Thaumaturge',
          desc: "You know one extra cantrip from the Cleric spell list. Your Intelligence (Arcana or Religion) checks gain a bonus equal to your Wisdom modifier (minimum of +1).",
          adds: {
            cantrip_bonus: 1,
            skill_bonuses: [{
              skills: ['skill_arcana', 'skill_religion'],
              ability: 'wisdom',
              min: 1,
              label: 'Divine Order (Thaumaturge)',
            }],
            traits: [{
              name: 'Thaumaturge',
              desc: 'You know one extra cantrip from the Cleric spell list. In addition, your mystical connection to the divine gives you a bonus to your Intelligence (Arcana or Religion) checks. The bonus equals your Wisdom modifier (minimum of +1).',
              category: 'specialAbility',
            }],
          },
        },
      ],
    },
  ],

  Fighter: [
    {
      id: 'class-skills',
      label: 'Skill Proficiencies',
      at_level: 1,
      desc: "Choose 2 from the list. These are the proficiencies the class starts with.",
      kind: 'multi-skills',
      grant: 'proficient',
      pick_count: 2,
      from: ['skill_acrobatics', 'skill_animal_handling', 'skill_athletics', 'skill_history', 'skill_insight', 'skill_intimidation', 'skill_perception', 'skill_persuasion', 'skill_survival'],
    },
    {
      id: 'weapon-mastery',
      label: 'Weapon Mastery',
      at_level: 1,
      desc: "Your training enables you to use the mastery properties of three weapons of your choice with which you have proficiency.",
      kind: 'multi-weapons',
      pick_count: 3,
    },
  ],

  Wizard: [
    {
      id: 'class-skills',
      label: 'Skill Proficiencies',
      at_level: 1,
      desc: "Choose 2 from the list. These are the proficiencies the class starts with.",
      kind: 'multi-skills',
      grant: 'proficient',
      pick_count: 2,
      from: ['skill_arcana', 'skill_history', 'skill_insight', 'skill_investigation', 'skill_medicine', 'skill_nature', 'skill_religion'],
    },
    {
      id: 'scholar',
      label: 'Scholar',
      at_level: 2,
      desc: "While studying magic, you also specialized in another field of study. Choose one skill in which you have proficiency from Arcana, History, Investigation, Medicine, Nature, or Religion. You have Expertise in it.",
      kind: 'multi-skills',
      pick_count: 1,
    },
  ],

  Rogue: [
    {
      id: 'class-skills',
      label: 'Skill Proficiencies',
      at_level: 1,
      desc: "Choose 4 from the list. These are the proficiencies the class starts with.",
      kind: 'multi-skills',
      grant: 'proficient',
      pick_count: 4,
      from: ['skill_acrobatics', 'skill_athletics', 'skill_deception', 'skill_insight', 'skill_intimidation', 'skill_investigation', 'skill_perception', 'skill_persuasion', 'skill_sleight_of_hand', 'skill_stealth'],
    },
    {
      id: 'expertise',
      label: 'Expertise',
      at_level: 1,
      desc: "Choose two of your skill proficiencies. You gain Expertise — your Proficiency Bonus is doubled for any check you make with the chosen skills.",
      kind: 'multi-skills',
      pick_count: 2,
    },
  ],

  Ranger: [
    {
      id: 'class-skills',
      label: 'Skill Proficiencies',
      at_level: 1,
      desc: "Choose 3 from the list. These are the proficiencies the class starts with.",
      kind: 'multi-skills',
      grant: 'proficient',
      pick_count: 3,
      from: ['skill_animal_handling', 'skill_athletics', 'skill_insight', 'skill_investigation', 'skill_nature', 'skill_perception', 'skill_stealth', 'skill_survival'],
    },
    {
      id: 'favored-enemy',
      label: 'Favored Enemy',
      at_level: 1,
      desc: "You always have the Hunter's Mark spell prepared, and you can cast it without expending a spell slot a number of times equal to your Wisdom modifier per long rest.",
      // No picker — the only effect is granting Hunter's Mark, so it
      // auto-applies the moment Ranger is picked. Tracked in
      // class_state.added so it reverts on class swap.
      kind: 'auto',
      adds: {
        // The 2024 PHB feature explicitly says "you always have the
        // Hunter's Mark spell prepared" — keep prepared: true here as
        // the rules-text shorthand. Other class-feature spells can
        // opt out by setting prepared: false.
        spells: [{ name: "Hunter's Mark", minLevel: 1, prepared: true }],
      },
    },
  ],

  Bard: [
    {
      id: 'class-skills',
      label: 'Skill Proficiencies',
      at_level: 1,
      desc: "Choose 3 from any skills. These are the proficiencies the class starts with.",
      kind: 'multi-skills',
      grant: 'proficient',
      pick_count: 3,
    },
    {
      id: 'expertise',
      label: 'Expertise',
      at_level: 2,
      desc: "Choose two of your skill proficiencies. You gain Expertise — Proficiency Bonus is doubled for those skill checks.",
      kind: 'multi-skills',
      pick_count: 2,
    },
  ],
  Barbarian: [
    {
      id: 'class-skills',
      label: 'Skill Proficiencies',
      at_level: 1,
      desc: "Choose 2 from the list. These are the proficiencies the class starts with.",
      kind: 'multi-skills',
      grant: 'proficient',
      pick_count: 2,
      from: ['skill_animal_handling', 'skill_athletics', 'skill_intimidation', 'skill_nature', 'skill_perception', 'skill_survival'],
    },
  ],
  Druid: [
    {
      id: 'class-skills',
      label: 'Skill Proficiencies',
      at_level: 1,
      desc: "Choose 2 from the list. These are the proficiencies the class starts with.",
      kind: 'multi-skills',
      grant: 'proficient',
      pick_count: 2,
      from: ['skill_arcana', 'skill_animal_handling', 'skill_insight', 'skill_medicine', 'skill_nature', 'skill_perception', 'skill_religion', 'skill_survival'],
    },
    {
      id: 'primal-order',
      label: 'Primal Order',
      at_level: 1,
      desc: "You have dedicated yourself to one of two sacred roles. Choose Magician or Warden.",
      kind: 'single',
      options: [
        {
          id: 'magician',
          name: 'Magician',
          desc: "You know one extra cantrip from the Druid spell list. Your Intelligence (Arcana or Nature) checks gain a bonus equal to your Wisdom modifier (minimum of +1).",
          adds: {
            // The extra cantrip is an ALLOWANCE, not a specific spell: the
            // player picks it from the Druid list like their other two. It was
            // written only into the trait text, so the cantrip count the
            // builder showed stayed at the class table's two and a Magician who
            // took their third was over the stated limit.
            cantrip_bonus: 1,
            skill_bonuses: [{
              skills: ['skill_arcana', 'skill_nature'],
              ability: 'wisdom',
              min: 1,
              label: 'Primal Order (Magician)',
            }],
            traits: [{
              name: 'Primal Order: Magician',
              desc: 'You know one extra cantrip from the Druid spell list. In addition, your mystical connection to nature gives you a bonus to your Intelligence (Arcana or Nature) checks. The bonus equals your Wisdom modifier (minimum bonus of +1).',
              category: 'specialAbility',
            }],
          },
        },
        {
          id: 'warden',
          name: 'Warden',
          desc: "Trained for battle. You gain proficiency with martial weapons and training with medium armor.",
          adds: {
            armor: ['medium'],
            weapons: ['Martial weapons'],
            traits: [{
              name: 'Primal Order: Warden',
              desc: 'Trained for battle, you gain proficiency with Martial weapons and training with Medium armor.',
              category: 'specialAbility',
            }],
          },
        },
      ],
    },
  ],
  Monk: [
    {
      id: 'class-skills',
      label: 'Skill Proficiencies',
      at_level: 1,
      desc: "Choose 2 from the list. These are the proficiencies the class starts with.",
      kind: 'multi-skills',
      grant: 'proficient',
      pick_count: 2,
      from: ['skill_acrobatics', 'skill_athletics', 'skill_history', 'skill_insight', 'skill_religion', 'skill_stealth'],
    },
  ],
  Paladin: [
    {
      id: 'class-skills',
      label: 'Skill Proficiencies',
      at_level: 1,
      desc: "Choose 2 from the list. These are the proficiencies the class starts with.",
      kind: 'multi-skills',
      grant: 'proficient',
      pick_count: 2,
      from: ['skill_athletics', 'skill_insight', 'skill_intimidation', 'skill_medicine', 'skill_persuasion', 'skill_religion'],
    },
  ],
  Sorcerer: [
    {
      id: 'class-skills',
      label: 'Skill Proficiencies',
      at_level: 1,
      desc: "Choose 2 from the list. These are the proficiencies the class starts with.",
      kind: 'multi-skills',
      grant: 'proficient',
      pick_count: 2,
      from: ['skill_arcana', 'skill_deception', 'skill_insight', 'skill_intimidation', 'skill_persuasion', 'skill_religion'],
    },
  ],
  Warlock: [
    {
      id: 'class-skills',
      label: 'Skill Proficiencies',
      at_level: 1,
      desc: "Choose 2 from the list. These are the proficiencies the class starts with.",
      kind: 'multi-skills',
      grant: 'proficient',
      pick_count: 2,
      from: ['skill_arcana', 'skill_deception', 'skill_history', 'skill_intimidation', 'skill_investigation', 'skill_nature', 'skill_religion'],
    },
  ],
};

export function getClassChoices(className) {
  return CLASS_CHOICES_2024[className] || [];
}

// ── Spell slots ──────────────────────────────────────────────────────────────
// Slot totals derived from class + level, so a caster's Quick Reference panel
// has something to tick off without anyone typing the table in by hand.
//
// Warlock is deliberately excluded: Pact Magic is a different resource (few
// slots, all one level, back on a Short Rest) and is tracked in the Resources
// panel instead.
const FULL_CASTER_SLOTS = [
  [2], [3], [4, 2], [4, 3], [4, 3, 2], [4, 3, 3], [4, 3, 3, 1], [4, 3, 3, 2],
  [4, 3, 3, 3, 1], [4, 3, 3, 3, 2], [4, 3, 3, 3, 2, 1], [4, 3, 3, 3, 2, 1],
  [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1, 1], [4, 3, 3, 3, 3, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 3, 2, 2, 1, 1],
];

const FULL_CASTERS  = new Set(['Bard', 'Cleric', 'Druid', 'Sorcerer', 'Wizard']);
const HALF_CASTERS  = new Set(['Paladin', 'Ranger']);
// Also a half caster, but its slots start at level 1 and both its own table and
// the multiclass rule round the halving UP, so it cannot share the set above.
// It was in neither set, which left every Artificer with no slot grid at all.
const ARTIFICER = 'Artificer';
// Third-casters are subclass-gated rather than class-wide.
const THIRD_CASTER_SUBCLASSES = new Set(['Eldritch Knight', 'Arcane Trickster']);

// Which ability a class casts with.
//
// Needed wherever a spell attack or a save DC is worked out, and not reliably
// present on the spell rows themselves: a character's own spell entries carry
// `casting_ability` only sometimes, so the class is the fallback. The two
// third-caster subclasses cast with Intelligence regardless of their class.
export const SPELLCASTING_ABILITY = {
  Artificer: 'INT',
  Bard: 'CHA',
  Cleric: 'WIS',
  Druid: 'WIS',
  Paladin: 'CHA',
  Ranger: 'WIS',
  Sorcerer: 'CHA',
  Warlock: 'CHA',
  Wizard: 'INT',
};

/** 'INT' | 'WIS' | 'CHA' | null for a class that does not cast. */
export function spellcastingAbilityFor(className, subclassName) {
  const sub = String(subclassName || '').trim();
  if (THIRD_CASTER_SUBCLASSES.has(sub)) return 'INT';
  // The pact is a Warlock's pact, so its spells are cast on a Warlock's stat
  // — not on the hemocraft ability, which drives curses and brands instead.
  if (sub === 'Order of the Profane Soul') return 'CHA';
  return SPELLCASTING_ABILITY[String(className || '').trim()] || null;
}

// The caster level that feeds the table: full = your level, half = half
// (round up, from level 2), third = a third (round up, from level 3).
export function casterLevelFor(className, subclassName, level) {
  const lvl = Math.max(1, Number(level) || 1);
  const cls = String(className || '').trim();
  const sub = String(subclassName || '').trim();
  if (FULL_CASTERS.has(cls)) return lvl;
  if (cls === ARTIFICER) return Math.ceil(lvl / 2);
  if (HALF_CASTERS.has(cls)) return lvl >= 2 ? Math.ceil(lvl / 2) : 0;
  if (THIRD_CASTER_SUBCLASSES.has(sub)) return lvl >= 3 ? Math.ceil(lvl / 3) : 0;
  return 0;
}

// { 1: 4, 2: 3, … } for the character, or {} when they aren't a slot caster.
export function spellSlotsFor(className, subclassName, level) {
  return slotsAtCasterLevel(casterLevelFor(className, subclassName, level));
}

function slotsAtCasterLevel(casterLevel) {
  if (!(casterLevel >= 1)) return {};
  const row = FULL_CASTER_SLOTS[Math.min(20, casterLevel) - 1] || [];
  const out = {};
  row.forEach((count, i) => { if (count > 0) out[i + 1] = count; });
  return out;
}

// What one class contributes to a POOLED multiclass caster level.
//
// Not the same arithmetic as casterLevelFor above, and the difference is the
// rule rather than an oversight: a class's own table rounds its fraction up,
// while the multiclass spellcaster table rounds every fraction down. An
// Eldritch Knight 7 is caster level 3 on its own (4/2 slots) but adds only 2
// to a pool. Using one number for both would hand out slots nobody has.
function multiclassCasterContribution(className, subclassName, level) {
  const lvl = Math.max(0, Number(level) || 0);
  const cls = String(className || '').trim();
  const sub = String(subclassName || '').trim();
  if (FULL_CASTERS.has(cls)) return lvl;
  // Artificer is the one exception the rules spell out: rounded UP.
  if (cls === ARTIFICER) return Math.ceil(lvl / 2);
  if (HALF_CASTERS.has(cls)) return Math.floor(lvl / 2);
  if (THIRD_CASTER_SUBCLASSES.has(sub)) return Math.floor(lvl / 3);
  return 0;
}

// Every slot-casting class on a character: the primary one plus each entry in
// `multiclasses`. Warlock is left out on purpose — Pact Magic is its own pool
// and contributes nothing to the shared table (see pactMagicForCreature).
export function casterClassesOf(creature) {
  const out = [];
  const add = (className, subclassName, level) => {
    const cls = String(className || '').trim();
    if (!cls || cls === 'Warlock') return;
    const lvl = Math.max(1, Number(level) || 1);
    const solo = casterLevelFor(cls, subclassName, lvl);
    const pooled = multiclassCasterContribution(cls, subclassName, lvl);
    if (solo < 1 && pooled < 1) return;
    out.push({ class: cls, subclass: String(subclassName || '').trim(), level: lvl, solo, pooled });
  };
  add(creature?.char_class, creature?.char_subclass, creature?.char_level);
  for (const mc of (Array.isArray(creature?.multiclasses) ? creature.multiclasses : [])) {
    add(mc?.class, mc?.subclass, mc?.level);
  }
  return out;
}

// SLOTS FOR A WHOLE CHARACTER, NOT A SINGLE CLASS.
//
// spellSlotsFor() reads one class name and one level, so every screen that
// called it with `char_class` gave a multiclassed caster the slots of their
// FIRST class only: Selina the Fighter taking a level of Warlock got nothing,
// and a Cleric 5 / Wizard 3 got a Cleric 5's table instead of a caster 8's.
//
// 5e pools multiclassed casters into ONE table rather than a pile of per-class
// pools: with two or more casting classes the contributions are added and the
// pooled level is looked up. A single casting class keeps its own table, which
// rounds up and is therefore not the same answer.
export function spellSlotsForCreature(creature) {
  const casters = casterClassesOf(creature);
  if (!casters.length) return {};
  if (casters.length === 1) return slotsAtCasterLevel(casters[0].solo);
  return slotsAtCasterLevel(casters.reduce((sum, c) => sum + c.pooled, 0));
}

// Warlock levels wherever they sit — primary class or a multiclass entry.
export function warlockLevelOf(creature) {
  let lvl = 0;
  if (String(creature?.char_class || '').trim() === 'Warlock') {
    lvl += Math.max(1, Number(creature?.char_level) || 1);
  }
  for (const mc of (Array.isArray(creature?.multiclasses) ? creature.multiclasses : [])) {
    if (String(mc?.class || '').trim() === 'Warlock') lvl += Math.max(1, Number(mc?.level) || 1);
  }
  return lvl;
}

// Pact Magic for a whole character. Separate from the slot table above because
// the rules keep it separate: few slots, all one level, back on a Short Rest,
// and they neither add to nor draw from the pooled table.
export function pactMagicForCreature(creature) {
  const lvl = warlockLevelOf(creature);
  if (lvl > 0) return pactMagicFor('Warlock', lvl);

  // A Profane Soul with no Warlock levels still has Pact Magic. Checked
  // after the Warlock pool: a character who is both keeps the Warlock table,
  // which is the larger of the two and the one the rules point at.
  for (const row of classRows(creature)) {
    if (row.cls !== 'Blood Hunter') continue;
    const pact = pactMagicFor(row.cls, row.level, row.sub);
    if (pact) return pact;
  }
  return null;
}

// Every class a character carries, as { cls, sub, level }. The primary one
// plus each multiclass row.
function classRows(creature) {
  const out = [];
  const primary = String(creature?.char_class || '').trim();
  if (primary) {
    out.push({
      cls: primary,
      sub: String(creature?.char_subclass || '').trim(),
      level: Math.max(1, Number(creature?.char_level) || 1),
    });
  }
  for (const mc of (Array.isArray(creature?.multiclasses) ? creature.multiclasses : [])) {
    const cls = String(mc?.class || '').trim();
    if (!cls) continue;
    out.push({
      cls,
      sub: String(mc?.subclass || '').trim(),
      level: Math.max(1, Number(mc?.level) || 1),
    });
  }
  return out;
}

// ── Spell capacity ───────────────────────────────────────────────────────────
//
// How many spells a caster may have PREPARED, and how many cantrips they know,
// at a given class level. These are the "Prepared Spells" and "Cantrips" columns
// of the 2024 class tables.
//
// Two things this deliberately does NOT count:
//   • Always-prepared spells from a subclass, feat or lineage. The rules are
//     explicit that those don't count against the limit, and the app already
//     tags them (`__source` on the spell entry) so the UI can exclude them.
//   • Cantrips, which have their own budget and are tracked separately below.
//
// Only classes whose tables are covered here are listed. A class that isn't in
// the map returns null rather than a guess, so the UI shows nothing instead of
// a wrong allowance — an invented number is worse than no number, because a
// player will build against it.
//
// Third-caster subclasses (Eldritch Knight, Arcane Trickster) are deliberately
// absent: their counts live on the SUBCLASS table, not the class table, and
// they're outside what's covered here.
const PREPARED_BY_LEVEL = {
  //          1  2  3  4  5   6   7   8   9  10  11  12  13  14  15  16  17  18  19  20
  Artificer:[ 2, 3, 4, 5, 6,  6,  7,  7,  9,  9, 10, 10, 11, 11, 12, 12, 14, 14, 15, 15],
  Bard:     [ 4, 5, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 17, 17, 18, 18, 19, 20, 21, 22],
  Cleric:   [ 4, 5, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 17, 17, 18, 18, 19, 20, 21, 22],
  Druid:    [ 4, 5, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 17, 17, 18, 18, 19, 20, 21, 22],
  Wizard:   [ 4, 5, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 17, 17, 18, 18, 19, 20, 21, 22],
  Sorcerer: [ 2, 4, 4, 5, 6,  7,  7,  8,  9, 10, 11, 12, 13, 13, 14, 14, 15, 15, 15, 15],
  Warlock:  [ 2, 3, 4, 5, 6,  7,  8,  9, 10, 10, 11, 11, 12, 12, 13, 13, 14, 14, 15, 15],
  Paladin:  [ 2, 3, 4, 5, 6,  6,  7,  7,  9,  9, 10, 10, 11, 11, 12, 12, 14, 14, 15, 15],
  Ranger:   [ 2, 3, 4, 5, 6,  6,  7,  7,  9,  9, 10, 10, 11, 11, 12, 12, 14, 14, 15, 15],
};

// Cantrips known. Paladin and Ranger get none, so they're absent by design
// rather than listed as zeroes — absent means "no cantrip budget to show".
const CANTRIPS_BY_LEVEL = {
  // Forge of the Artificer: two cantrips all the way to level 10, which is
  // flatter than any PHB caster's table.
  Artificer:[2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4],
  Bard:     [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
  Cleric:   [3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
  Druid:    [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
  Wizard:   [3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
  Sorcerer: [4, 4, 4, 5, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6],
  Warlock:  [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
};

function rowAt(table, className, level) {
  const row = table[String(className || '').trim()];
  if (!row) return null;
  const lvl = Math.min(20, Math.max(1, Number(level) || 1));
  const n = row[lvl - 1];
  return Number.isFinite(n) ? n : null;
}

// What one class contributes at one level. `null` for a class we don't cover.
export function spellCapacityFor(className, level) {
  const prepared = rowAt(PREPARED_BY_LEVEL, className, level);
  const cantrips = rowAt(CANTRIPS_BY_LEVEL, className, level);
  if (prepared == null && cantrips == null) return null;
  return { prepared: prepared ?? 0, cantrips: cantrips ?? 0, covered: prepared != null };
}

// Total capacity across a character's classes.
//
// Multiclassing stacks these: each class grants its own prepared count at ITS
// level (unlike spell slots, which merge into one shared progression). Classes
// outside the covered set contribute nothing and are reported back so the UI
// can say the total is partial rather than quietly under-reporting.
export function spellCapacityTotals(entries) {
  let prepared = 0, cantrips = 0;
  const uncovered = [];
  let any = false;
  for (const e of entries || []) {
    const cls = String(e?.className || '').trim();
    if (!cls) continue;
    const cap = spellCapacityFor(cls, e.level);
    if (!cap) { uncovered.push(cls); continue; }
    any = true;
    prepared += cap.prepared;
    cantrips += cap.cantrips;
  }
  if (!any) return null;
  return { prepared, cantrips, uncovered };
}

// Subclasses that widen which class lists you may draw from, and the level at
// which that starts. Third-casters aren't here — their entire list is the
// Wizard one, handled inline below.
const SUBCLASS_LIST_ACCESS = {
  // Magical Discoveries: two spells from the Cleric, Druid or Wizard lists.
  'College of Lore': { fromLevel: 6, lists: ['Cleric', 'Druid', 'Wizard'] },
};

// ── What a build can actually learn ──────────────────────────────────────────
//
// The highest spell level a character has any way to cast, so a picker can hide
// spells that are simply out of reach. Multiclass takes the best of each entry:
// a Cleric 1 / Wizard 5 can learn 3rd-level spells because the Wizard half can.
//
// Warlock is two things at once — Pact Magic slots, plus a Mystic Arcanum from
// 11th level that reaches past them (6th at 11, then 7th/8th/9th at 13/15/17).
// Both count, so an 11th-level Warlock can still find their Arcanum pick.
//
// `maxLevel` is null when no entry has a spell table we cover (custom classes,
// third-casters at level 1-2, a plain Fighter). Null means "don't gate by
// level" rather than "gate to nothing" — a guessed cap would hide spells the
// character really does have.
export function learnableSpellsFor(entries) {
  let maxLevel = null;
  let cantrips = false;
  const bump = (n) => { if (n > 0) maxLevel = Math.max(maxLevel ?? 0, n); };
  // Which class spell lists this build may draw from. Usually just its own
  // classes, but not always — see the two exceptions below.
  const lists = new Set();

  for (const e of entries || []) {
    const cls = String(e?.className || '').trim();
    if (!cls) continue;
    const lvl = Math.max(1, Number(e.level) || 1);
    const sub = String(e?.subclassName || '').trim();
    lists.add(cls);

    // Third-casters prepare from the WIZARD list, not their own class's — an
    // Eldritch Knight matched on "Fighter" alone would find nothing at all.
    if (THIRD_CASTER_SUBCLASSES.has(sub)) lists.add('Wizard');

    // Bard's Magical Secrets opens up three more lists from 10th level.
    if (cls === 'Bard' && lvl >= 10) ['Cleric', 'Druid', 'Wizard'].forEach(c => lists.add(c));

    const access = SUBCLASS_LIST_ACCESS[sub];
    if (access && lvl >= access.fromLevel) access.lists.forEach(c => lists.add(c));

    // Per class on purpose, and NOT spellSlotsForCreature: slots pool when you
    // multiclass, but what you may LEARN or PREPARE is still decided class by
    // class. A Cleric 5 / Wizard 3 holds a level-4 slot and may still only
    // prepare level-2 Wizard spells, so the picker gates on the class.
    const slots = Object.keys(spellSlotsFor(cls, e.subclassName, lvl)).map(Number);
    if (slots.length) bump(Math.max(...slots));

    const pact = pactMagicFor(cls, lvl);
    if (pact) {
      bump(pact.slotLevel);
      if (lvl >= 11) bump(Math.min(9, 6 + Math.floor((lvl - 11) / 2)));
    }

    // Third-casters are absent from CANTRIPS_BY_LEVEL because their counts sit
    // on the subclass table, but they do know cantrips — so check the subclass
    // too, or an Eldritch Knight loses Booming Blade to the filter.
    if (CANTRIPS_BY_LEVEL[cls] || THIRD_CASTER_SUBCLASSES.has(sub)) {
      cantrips = true;
    }
  }
  return { maxLevel, cantrips, lists: [...lists] };
}

// Pact Magic: { slots, slot level }. Warlock, and the one subclass that
// borrows the resource.
//
// Order of the Profane Soul is a Blood Hunter who made a pact, and the rules
// hand it Warlock spells on Warlock terms — a couple of slots, all one level,
// back on a Short Rest — but on its OWN much slower table, starting at Blood
// Hunter level 3 and topping out at slot level 4. It is passed through here
// rather than given its own pool so everything downstream (the quick panel,
// the rest button, the slot ticks) keeps working without knowing about it.
export function pactMagicFor(className, level, subclassName) {
  const cls = String(className || '').trim();
  const sub = String(subclassName || '').trim();
  const lvl = Math.max(1, Number(level) || 1);

  if (cls === 'Blood Hunter' && sub === 'Order of the Profane Soul') {
    if (lvl < 3) return null;
    return {
      slots: lvl >= 6 ? 2 : 1,
      slotLevel: lvl >= 19 ? 4 : lvl >= 13 ? 3 : lvl >= 7 ? 2 : 1,
    };
  }

  if (cls !== 'Warlock') return null;
  const slots = lvl >= 17 ? 4 : lvl >= 11 ? 3 : lvl >= 2 ? 2 : 1;
  const slotLevel = lvl >= 9 ? 5 : lvl >= 7 ? 4 : lvl >= 5 ? 3 : lvl >= 3 ? 2 : 1;
  return { slots, slotLevel };
}
