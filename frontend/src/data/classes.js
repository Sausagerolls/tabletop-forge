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
//     spells: [{ name: 'Hunter\'s Mark', minLevel: 1 }],
//     traits: [{ name, desc, category: 'specialAbility'|'action'|'bonusAction'|'reaction' }],
//   }

export const CLASS_CHOICES_2024 = {
  Cleric: [
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
          desc: "Studied in arcane lore. You learn one wizard cantrip of your choice (cast with Wisdom). Whenever you make an Intelligence (Arcana) or Intelligence (Religion) check, add 1d4 to the roll.",
          adds: {
            skills: [
              { skill: 'skill_arcana', level: 'proficient' },
            ],
            traits: [{
              name: 'Thaumaturge Lore',
              desc: 'Add 1d4 to any Intelligence (Arcana) or Intelligence (Religion) check. You also learn one Wizard cantrip of your choice; Wisdom is your spellcasting ability for it.',
              category: 'specialAbility',
            }],
          },
        },
      ],
    },
  ],

  Fighter: [
    {
      id: 'weapon-mastery',
      label: 'Weapon Mastery',
      at_level: 1,
      desc: "Your training enables you to use the mastery properties of three weapons of your choice with which you have proficiency.",
      kind: 'multi-weapons',
      pick_count: 3,
    },
  ],

  Rogue: [
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
      id: 'favored-enemy',
      label: 'Favored Enemy',
      at_level: 1,
      desc: "You always have the Hunter's Mark spell prepared, and you can cast it without expending a spell slot a number of times equal to your Wisdom modifier per long rest.",
      // No picker — the only effect is granting Hunter's Mark, so it
      // auto-applies the moment Ranger is picked. Tracked in
      // class_state.added so it reverts on class swap.
      kind: 'auto',
      adds: {
        spells: [{ name: "Hunter's Mark", minLevel: 1 }],
      },
    },
  ],

  Bard: [
    {
      id: 'expertise',
      label: 'Expertise',
      at_level: 2,
      desc: "Choose two of your skill proficiencies. You gain Expertise — Proficiency Bonus is doubled for those skill checks.",
      kind: 'multi-skills',
      pick_count: 2,
    },
  ],
};

export function getClassChoices(className) {
  return CLASS_CHOICES_2024[className] || [];
}
