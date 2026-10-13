// Hand-written option pools, merged with the generated ones.
//
// data/class_options.js is written by class-data/import_5etools_options.py and
// carries a "do not edit by hand" banner for good reason: the next import
// would wipe anything added to it. Pools for classes the 5eTools mirror does
// not carry live here instead, and the two are merged at the point of use
// (see allOptionGroupsForClass below and utils/classes.js).
//
// Same shape as the generated groups: { id, class, label, editions: { … },
// knownByLevel: { edition: { level: count } } }. Both edition keys carry the
// same pool where a class predates the 2024 split — a Blood Hunter is a Blood
// Hunter whichever ruleset the rest of the table is using, and keying it to
// one edition would make the picker vanish for half the party.

const BLOOD_CURSES = [
  {
    id: 'blood-curse-of-the-anxious',
    name: 'Blood Curse of the Anxious',
    desc: 'Bonus Action. Until the end of your next turn, Charisma (Intimidation) checks against the target have Advantage.\n\nAmplified: the target also has Disadvantage on its next Wisdom saving throw before the curse ends.',
    source: 'Blood Hunter (2020)',
  },
  {
    id: 'blood-curse-of-binding',
    name: 'Blood Curse of Binding',
    desc: 'Bonus Action. A Large or smaller creature makes a Strength saving throw; on a failure its Speed is 0 and it cannot use Reactions until the end of your next turn.\n\nAmplified: any size, and the effect lasts 1 minute with a save at the end of each of its turns.',
    source: 'Blood Hunter (2020)',
  },
  {
    id: 'blood-curse-of-bloated-agony',
    name: 'Blood Curse of Bloated Agony',
    desc: 'Bonus Action. The target has Disadvantage on Strength and Dexterity checks, and takes 1d8 Necrotic damage if it makes more than one attack on its turn. Lasts until the end of your next turn.\n\nAmplified: it lasts 1 minute, with a Constitution save at the end of each of its turns to end it.',
    source: 'Blood Hunter (2020)',
  },
  {
    id: 'blood-curse-of-exposure',
    name: 'Blood Curse of Exposure',
    desc: 'Reaction, when a creature takes damage from an attack or spell. It loses Resistance to that damage type against this instance.\n\nAmplified: it loses Immunity instead, treating the damage as if it had Resistance.',
    source: 'Blood Hunter (2020)',
  },
  {
    id: 'blood-curse-of-the-eyeless',
    name: 'Blood Curse of the Eyeless',
    desc: 'Reaction, when a creature makes an attack roll. Subtract a roll of your hemocraft die from the roll.\n\nAmplified: every attack it makes until the end of its turn is reduced this way.',
    source: 'Blood Hunter (2020)',
  },
  {
    id: 'blood-curse-of-the-fallen-puppet',
    name: 'Blood Curse of the Fallen Puppet',
    desc: 'Reaction, when a creature within 30 feet drops to 0 hit points. It immediately makes one weapon attack against a target of your choice within its reach.\n\nAmplified: you can first move it up to half its Speed, and the attack adds your hemocraft modifier to its damage.',
    source: 'Blood Hunter (2020)',
  },
  {
    id: 'blood-curse-of-the-marked',
    name: 'Blood Curse of the Marked',
    desc: 'Bonus Action. Until the end of your turn, your rite weapon deals an extra hemocraft die of rite damage to the target.\n\nAmplified: your next attack roll against it this turn has Advantage.',
    source: 'Blood Hunter (2020)',
  },
  {
    id: 'blood-curse-of-the-muddled-mind',
    name: 'Blood Curse of the Muddled Mind',
    desc: 'Bonus Action, against a creature concentrating on a spell. Its next Constitution save to maintain Concentration has Disadvantage.\n\nAmplified: every Concentration save it makes has Disadvantage until its concentration ends.',
    source: 'Blood Hunter (2020)',
  },
  // ORDER CURSES ARE LISTED BUT GATED.
  //
  // These four come free with their order's feature and do not count against
  // the curses you know, so they carry a prereq note and sit at the bottom
  // rather than being offered as ordinary picks at level 1.
  {
    id: 'blood-curse-of-the-exorcist',
    name: 'Blood Curse of the Exorcist',
    desc: 'Order of the Ghostslayer, level 15. End the Charmed, Frightened or possessed condition on an ally you can see.\n\nAmplified: the source takes 3d6 Psychic damage and must save or be Stunned until the end of your next turn.',
    source: 'Blood Hunter (2020)',
    prereq: { level: 15, note: 'Order of the Ghostslayer — granted free, does not count against curses known.' },
  },
  {
    id: 'blood-curse-of-corrosion',
    name: 'Blood Curse of Corrosion',
    desc: 'Order of the Mutant, level 15. The target is Poisoned for 1 minute, saving at the end of each of its turns.\n\nAmplified: it also takes 4d6 Necrotic damage each time it fails.',
    source: 'Blood Hunter (2020)',
    prereq: { level: 15, note: 'Order of the Mutant — granted free, does not count against curses known.' },
  },
  {
    id: 'blood-curse-of-the-howl',
    name: 'Blood Curse of the Howl',
    desc: 'Order of the Lycan, level 18. Every creature within 30 feet makes a Wisdom save or is Frightened of you for 1 minute, saving again at the end of each of its turns.\n\nAmplified: the range is 60 feet, and a creature failing by 5 or more is Stunned while Frightened this way.',
    source: 'Blood Hunter (2020)',
    prereq: { level: 18, note: 'Order of the Lycan — granted free, does not count against curses known.' },
  },
  {
    id: 'blood-curse-of-the-souleater',
    name: 'Blood Curse of the Souleater',
    desc: 'Order of the Profane Soul, level 18. Reaction, when a creature you can see within 30 feet dies: you gain Advantage on attack rolls and saving throws until the end of your next turn.\n\nAmplified: you also regain one expended Pact Magic spell slot.',
    source: 'Blood Hunter (2020)',
    prereq: { level: 18, note: 'Order of the Profane Soul — granted free, does not count against curses known.' },
  },
];

// One extra curse known at levels 6, 10, 14 and 18, on top of the one you
// start with.
const CURSES_KNOWN = { 1: 1, 6: 2, 10: 3, 14: 4, 18: 5 };

// Matt Mercer's Gunslinger (DMs Guild), the Fighter archetype in
// data/subclasses.js. Two known at level 3, and another at 7, 10, 15 and 18.
export const TRICK_SHOTS = [
  { id: 'bullying-shot', name: 'Bullying Shot', source: 'Gunslinger 1.3',
    desc: 'Spend 1 grit to gain Advantage on a Charisma (Intimidation) check, using the blast and the noise to shake them.' },
  { id: 'dazing-shot', name: 'Dazing Shot', source: 'Gunslinger 1.3',
    desc: 'Spend 1 grit on a firearm attack. On a hit: normal damage, and the target makes a Constitution save or attacks at Disadvantage until the end of its next turn.' },
  { id: 'deadeye-shot', name: 'Deadeye Shot', source: 'Gunslinger 1.3',
    desc: 'Spend 1 grit to gain Advantage on the attack roll.' },
  { id: 'disarming-shot', name: 'Disarming Shot', source: 'Gunslinger 1.3',
    desc: 'Spend 1 grit on a firearm attack. On a hit: normal damage, and the target makes a Strength save or drops one held object of your choice, which is pushed 10 feet away.' },
  { id: 'forceful-shot', name: 'Forceful Shot', source: 'Gunslinger 1.3',
    desc: 'Spend 1 grit on a firearm attack. On a hit: normal damage, and the target makes a Strength save or is pushed 15 feet away from you.' },
  { id: 'piercing-shot', name: 'Piercing Shot', source: 'Gunslinger 1.3',
    desc: "Spend 1 grit on a firearm attack, raising its misfire score by 1. On a hit: normal damage, then an attack roll with Disadvantage against every creature in a line behind the target within your first range increment. Only the first attack can misfire." },
  { id: 'violent-shot', name: 'Violent Shot', source: 'Gunslinger 1.3',
    desc: 'Spend one or more grit on a firearm attack, raising its misfire score by 2 for each point. On a hit, roll one extra weapon damage die per point spent.' },
  { id: 'winging-shot', name: 'Winging Shot', source: 'Gunslinger 1.3',
    desc: 'Spend 1 grit on a firearm attack. On a hit: normal damage, and the target makes a Strength save or is knocked prone.' },
];

const TRICK_SHOTS_KNOWN = { 3: 2, 7: 3, 10: 4, 15: 5, 18: 6 };

export const EXTRA_OPTION_GROUPS = [
  {
    id: 'blood-hunter-curses',
    class: 'Blood Hunter',
    label: 'Blood Curses',
    note: 'Invoked with Blood Maledict as a Bonus Action. Amplifying one costs a roll of your hemocraft die in Necrotic damage you cannot prevent.',
    editions: {
      srd2014: BLOOD_CURSES,
      srd2024: BLOOD_CURSES,
    },
    knownByLevel: {
      srd2014: CURSES_KNOWN,
      srd2024: CURSES_KNOWN,
    },
  },
  {
    id: 'gunslinger-trick-shots',
    class: 'Fighter',
    subclass: 'Gunslinger',
    label: 'Trick Shots',
    note: 'Declared before the attack roll, one per attack. Save DC = 8 + your Proficiency Bonus + your Dexterity modifier.',
    editions: {
      srd2014: TRICK_SHOTS,
      srd2024: TRICK_SHOTS,
    },
    knownByLevel: {
      srd2014: TRICK_SHOTS_KNOWN,
      srd2024: TRICK_SHOTS_KNOWN,
    },
  },
];

export function extraOptionGroupsForClass(className) {
  if (!className) return [];
  return EXTRA_OPTION_GROUPS.filter((g) => g.class === className);
}
