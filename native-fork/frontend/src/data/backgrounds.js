// 2024 backgrounds — the full set of sixteen. (This file previously held only
// the four in the open SRD; the rest were added from the printed list.)
//
// Each background grants:
//   • Three listed ability scores. Player chooses +2/+1 across two of
//     them OR +1/+1/+1 across all three (no score may exceed 20).
//   • One Origin feat.
//   • Two skill proficiencies.
//   • One tool proficiency.
//   • A starting equipment package OR 50 GP.
//
// The shape mirrors the race catalog so the apply/revert logic looks
// the same: `applyBackground` writes into form fields and tags the
// added entries with __source = 'background:<id>' so a future swap
// can strip just those again.

export const BACKGROUNDS_2024 = [
  {
    id: 'acolyte-2024',
    name: 'Acolyte',
    edition: 'srd2024',
    description:
      'You devoted yourself to service in a temple, either nestled in a town or secluded in a sacred grove. There you performed rites in honor of a god or pantheon. You served under a priest and studied religion. Thanks to your priest\'s instruction and your own devotion, you also learned how to channel a modicum of divine power in service to your place of worship and the people who prayed there.',
    abilities: ['intelligence', 'wisdom', 'charisma'],
    feat: { name: 'Magic Initiate (Cleric)', desc: 'Origin feat. You learn two Cleric cantrips and one level 1 Cleric spell, castable once per Long Rest without a slot (or with slots you have). Wisdom is your ability for them.' },
    skills: ['skill_insight', 'skill_religion'],
    tool: 'Calligrapher\'s Supplies',
    equipment_a_items: [
      { name: 'Calligrapher\'s Supplies', qty: 1 },
      { name: 'Book (prayers)', qty: 1 },
      { name: 'Holy Symbol', qty: 1 },
      { name: 'Parchment', qty: 10 },
      { name: 'Robe', qty: 1 },
    ],
    equipment_a_gp: 8,
    equipment_b_gp: 50,
  },
  {
    id: 'artisan-2024',
    name: 'Artisan',
    edition: 'srd2024',
    description:
      'You began mopping floors and scrubbing counters in an artisan\'s workshop for a few coppers per day as soon as you were strong enough to carry a bucket. When you were old enough to apprentice, you learned to create basic crafts of your own, as well as how to sweet-talk the occasional demanding customer. Your trade has also given you a keen eye for detail.',
    abilities: ['strength', 'dexterity', 'intelligence'],
    feat: { name: 'Crafter', desc: 'Origin feat. You gain proficiency with three kinds of Artisan\'s Tools, buy nonmagical items for 20% less, and can craft faster during a Long Rest.' },
    skills: ['skill_investigation', 'skill_persuasion'],
    tool: 'Artisan\'s Tools (choose one kind)',
    equipment_a_items: [
      { name: 'Artisan\'s Tools', qty: 1 },
      { name: 'Pouch', qty: 2 },
      { name: 'Traveler\'s Clothes', qty: 1 },
    ],
    equipment_a_gp: 32,
    equipment_b_gp: 50,
  },
  {
    id: 'charlatan-2024',
    name: 'Charlatan',
    edition: 'srd2024',
    description:
      'Once you were old enough to order an ale, you soon had a favorite stool in every tavern within ten miles of where you were born. As you traveled the circuit from public house to watering hole, you learned to prey on unfortunates who were in the market for a comforting lie or two - perhaps a sham potion or forged ancestry records.',
    abilities: ['dexterity', 'constitution', 'charisma'],
    feat: { name: 'Skilled', desc: 'Origin feat. You gain proficiency in any combination of three skills or tools of your choice.' },
    skills: ['skill_deception', 'skill_sleight_of_hand'],
    tool: 'Forgery Kit',
    equipment_a_items: [
      { name: 'Forgery Kit', qty: 1 },
      { name: 'Costume', qty: 1 },
      { name: 'Fine Clothes', qty: 1 },
    ],
    equipment_a_gp: 15,
    equipment_b_gp: 50,
  },
  {
    id: 'criminal-2024',
    name: 'Criminal',
    edition: 'srd2024',
    description:
      'You eked out a living in dark alleyways, cutting purses or burgling shops. Perhaps you were part of a small gang of like-minded wrongdoers who looked out for each other. Or maybe you were a lone wolf, fending for yourself against the local thieves\' guild and more fearsome lawbreakers.',
    abilities: ['dexterity', 'constitution', 'intelligence'],
    feat: { name: 'Alert', desc: 'Origin feat. Add your Proficiency Bonus to Initiative rolls, and you can swap Initiative with a willing ally.' },
    skills: ['skill_sleight_of_hand', 'skill_stealth'],
    tool: 'Thieves\' Tools',
    equipment_a_items: [
      { name: 'Dagger', qty: 2 },
      { name: 'Thieves\' Tools', qty: 1 },
      { name: 'Crowbar', qty: 1 },
      { name: 'Pouch', qty: 2 },
      { name: 'Traveler\'s Clothes', qty: 1 },
    ],
    equipment_a_gp: 16,
    equipment_b_gp: 50,
  },
  {
    id: 'entertainer-2024',
    name: 'Entertainer',
    edition: 'srd2024',
    description:
      'You spent much of your youth following roving fairs and carnivals, performing odd jobs for musicians and acrobats in exchange for lessons. You may have learned how to walk a tightrope, how to play a lute in a distinct style, or how to recite poetry with impeccable diction. To this day, you thrive on applause and long for the stage.',
    abilities: ['strength', 'dexterity', 'charisma'],
    feat: { name: 'Musician', desc: 'Origin feat. You gain proficiency with three Musical Instruments, and can grant Heroic Inspiration to allies after a rest by performing.' },
    skills: ['skill_acrobatics', 'skill_performance'],
    tool: 'Musical Instrument (choose one kind)',
    equipment_a_items: [
      { name: 'Musical Instrument', qty: 1 },
      { name: 'Costume', qty: 2 },
      { name: 'Mirror', qty: 1 },
      { name: 'Perfume', qty: 1 },
      { name: 'Traveler\'s Clothes', qty: 1 },
    ],
    equipment_a_gp: 11,
    equipment_b_gp: 50,
  },
  {
    id: 'farmer-2024',
    name: 'Farmer',
    edition: 'srd2024',
    description:
      'You grew up close to the land. Years tending animals and cultivating the earth rewarded you with patience and good health. You have a keen appreciation for nature\'s bounty alongside a healthy respect for nature\'s wrath.',
    abilities: ['strength', 'constitution', 'wisdom'],
    feat: { name: 'Tough', desc: 'Origin feat. Your Hit Point maximum increases by twice your character level, and by 2 each level thereafter.' },
    skills: ['skill_animal_handling', 'skill_nature'],
    tool: 'Carpenter\'s Tools',
    equipment_a_items: [
      { name: 'Sickle', qty: 1 },
      { name: 'Carpenter\'s Tools', qty: 1 },
      { name: 'Healer\'s Kit', qty: 1 },
      { name: 'Iron Pot', qty: 1 },
      { name: 'Shovel', qty: 1 },
      { name: 'Traveler\'s Clothes', qty: 1 },
    ],
    equipment_a_gp: 30,
    equipment_b_gp: 50,
  },
  {
    id: 'guard-2024',
    name: 'Guard',
    edition: 'srd2024',
    description:
      'Your feet ache when you remember the countless hours you spent at your post in the tower. You were trained to keep one eye looking outside the wall, watching for marauders sweeping from the nearby forest, and your other eye looking inside the wall, searching for cutpurses and troublemakers.',
    abilities: ['strength', 'intelligence', 'wisdom'],
    feat: { name: 'Alert', desc: 'Origin feat. Add your Proficiency Bonus to Initiative rolls, and you can swap Initiative with a willing ally.' },
    skills: ['skill_athletics', 'skill_perception'],
    tool: 'Gaming Set (choose one kind)',
    equipment_a_items: [
      { name: 'Spear', qty: 1 },
      { name: 'Light Crossbow', qty: 1 },
      { name: 'Bolts', qty: 20 },
      { name: 'Gaming Set', qty: 1 },
      { name: 'Hooded Lantern', qty: 1 },
      { name: 'Manacles', qty: 1 },
      { name: 'Quiver', qty: 1 },
      { name: 'Traveler\'s Clothes', qty: 1 },
    ],
    equipment_a_gp: 12,
    equipment_b_gp: 50,
  },
  {
    id: 'guide-2024',
    name: 'Guide',
    edition: 'srd2024',
    description:
      'You came of age outdoors, far from settled lands. Your home was anywhere you chose to spread your bedroll. There are wonders in the wilderness - strange monsters, pristine forests and streams, overgrown ruins of great halls once trod by giants - and you learned to fend for yourself as you explored them. From time to time, you guided friendly nature priests who instructed you in the fundamentals of channeling the magic of the wild.',
    abilities: ['dexterity', 'constitution', 'wisdom'],
    feat: { name: 'Magic Initiate (Druid)', desc: 'Origin feat. You learn two Druid cantrips and one level 1 Druid spell, castable once per Long Rest without a slot (or with slots you have). Wisdom is your ability for them.' },
    skills: ['skill_stealth', 'skill_survival'],
    tool: 'Cartographer\'s Tools',
    equipment_a_items: [
      { name: 'Shortbow', qty: 1 },
      { name: 'Arrows', qty: 20 },
      { name: 'Cartographer\'s Tools', qty: 1 },
      { name: 'Bedroll', qty: 1 },
      { name: 'Quiver', qty: 1 },
      { name: 'Tent', qty: 1 },
      { name: 'Traveler\'s Clothes', qty: 1 },
    ],
    equipment_a_gp: 3,
    equipment_b_gp: 50,
  },
  {
    id: 'hermit-2024',
    name: 'Hermit',
    edition: 'srd2024',
    description:
      'You spent your early years secluded in a hut or monastery located well beyond the outskirts of the nearest settlement. In those days, your only companions were the creatures of the forest and those who would occasionally visit to bring news of the outside world and supplies. The solitude allowed you to spend many hours pondering the mysteries of creation.',
    abilities: ['constitution', 'wisdom', 'charisma'],
    feat: { name: 'Healer', desc: 'Origin feat. You can use a Healer\'s Kit to stabilise and heal, restoring Hit Points equal to a roll of the creature\'s Hit Point die plus its Constitution modifier.' },
    skills: ['skill_medicine', 'skill_religion'],
    tool: 'Herbalism Kit',
    equipment_a_items: [
      { name: 'Quarterstaff', qty: 1 },
      { name: 'Herbalism Kit', qty: 1 },
      { name: 'Bedroll', qty: 1 },
      { name: 'Book (philosophy)', qty: 1 },
      { name: 'Lamp', qty: 1 },
      { name: 'Oil (flask)', qty: 3 },
      { name: 'Traveler\'s Clothes', qty: 1 },
    ],
    equipment_a_gp: 16,
    equipment_b_gp: 50,
  },
  {
    id: 'merchant-2024',
    name: 'Merchant',
    edition: 'srd2024',
    description:
      'You were apprenticed to a trader, caravan master, or shopkeeper, learning the fundamentals of commerce. You traveled broadly, and you earned a living by buying and selling the raw materials artisans need to practice their craft or finished works from such crafters.',
    abilities: ['constitution', 'intelligence', 'charisma'],
    feat: { name: 'Lucky', desc: 'Origin feat. You have Luck Points equal to your Proficiency Bonus, spendable for Advantage on a D20 Test or to impose Disadvantage on an attack against you.' },
    skills: ['skill_animal_handling', 'skill_persuasion'],
    tool: 'Navigator\'s Tools',
    equipment_a_items: [
      { name: 'Navigator\'s Tools', qty: 1 },
      { name: 'Pouch', qty: 2 },
      { name: 'Traveler\'s Clothes', qty: 1 },
    ],
    equipment_a_gp: 22,
    equipment_b_gp: 50,
  },
  {
    id: 'noble-2024',
    name: 'Noble',
    edition: 'srd2024',
    description:
      'You were raised in a castle, surrounded by wealth, power, and privilege. Your family of minor aristocrats ensured that you received a first-class education, some of which you appreciated and some of which you resented. Your time in the castle, especially the many hours you spent observing your family at court, also taught you a great deal about leadership.',
    abilities: ['strength', 'intelligence', 'charisma'],
    feat: { name: 'Skilled', desc: 'Origin feat. You gain proficiency in any combination of three skills or tools of your choice.' },
    skills: ['skill_history', 'skill_persuasion'],
    tool: 'Gaming Set (choose one kind)',
    equipment_a_items: [
      { name: 'Gaming Set', qty: 1 },
      { name: 'Fine Clothes', qty: 1 },
      { name: 'Perfume', qty: 1 },
    ],
    equipment_a_gp: 29,
    equipment_b_gp: 50,
  },
  {
    id: 'sage-2024',
    name: 'Sage',
    edition: 'srd2024',
    description:
      'You spent your formative years traveling between manors and monasteries, performing various odd jobs and services in exchange for access to their libraries. You whiled away many a long evening studying books and scrolls, learning the lore of the multiverse - even the rudiments of magic - and your mind yearns for more.',
    abilities: ['constitution', 'intelligence', 'wisdom'],
    feat: { name: 'Magic Initiate (Wizard)', desc: 'Origin feat. You learn two Wizard cantrips and one level 1 Wizard spell, castable once per Long Rest without a slot (or with slots you have). Intelligence is your ability for them.' },
    skills: ['skill_arcana', 'skill_history'],
    tool: 'Calligrapher\'s Supplies',
    equipment_a_items: [
      { name: 'Quarterstaff', qty: 1 },
      { name: 'Calligrapher\'s Supplies', qty: 1 },
      { name: 'Book (history)', qty: 1 },
      { name: 'Parchment', qty: 8 },
      { name: 'Robe', qty: 1 },
    ],
    equipment_a_gp: 8,
    equipment_b_gp: 50,
  },
  {
    id: 'sailor-2024',
    name: 'Sailor',
    edition: 'srd2024',
    description:
      'You lived as a seafarer, wind at your back and decks swaying beneath your feet. You\'ve perched on barstools in more ports of call than you can remember, faced mighty storms, and swapped stories with folk who live beneath the waves.',
    abilities: ['strength', 'dexterity', 'wisdom'],
    feat: { name: 'Tavern Brawler', desc: 'Origin feat. Your Unarmed Strike deals 1d4, you can reroll a 1 on that damage, you can push on a hit once per turn, and you gain proficiency with improvised weapons.' },
    skills: ['skill_acrobatics', 'skill_perception'],
    tool: 'Navigator\'s Tools',
    equipment_a_items: [
      { name: 'Dagger', qty: 1 },
      { name: 'Navigator\'s Tools', qty: 1 },
      { name: 'Rope', qty: 1 },
      { name: 'Traveler\'s Clothes', qty: 1 },
    ],
    equipment_a_gp: 20,
    equipment_b_gp: 50,
  },
  {
    id: 'scribe-2024',
    name: 'Scribe',
    edition: 'srd2024',
    description:
      'You spent formative years in a scriptorium, a monastery dedicated to the preservation of knowledge, or a government agency, where you learned to write with a clear hand and produce finely written texts. Above all, you have a careful attention to detail, helping you avoid introducing mistakes to the documents you copy and create.',
    abilities: ['dexterity', 'intelligence', 'wisdom'],
    feat: { name: 'Skilled', desc: 'Origin feat. You gain proficiency in any combination of three skills or tools of your choice.' },
    skills: ['skill_investigation', 'skill_perception'],
    tool: 'Calligrapher\'s Supplies',
    equipment_a_items: [
      { name: 'Calligrapher\'s Supplies', qty: 1 },
      { name: 'Fine Clothes', qty: 1 },
      { name: 'Lamp', qty: 1 },
      { name: 'Oil (flask)', qty: 3 },
      { name: 'Parchment', qty: 12 },
    ],
    equipment_a_gp: 23,
    equipment_b_gp: 50,
  },
  {
    id: 'soldier-2024',
    name: 'Soldier',
    edition: 'srd2024',
    description:
      'You began training for war as soon as you reached adulthood and carry precious few memories of life before you took up arms. Battle is in your blood. Eventually, you put that training to use on the battlefield, protecting the realm by waging war.',
    abilities: ['strength', 'dexterity', 'constitution'],
    feat: { name: 'Savage Attacker', desc: 'Origin feat. Once per turn when you roll damage for a melee weapon attack, you can reroll the damage dice and use either total.' },
    skills: ['skill_athletics', 'skill_intimidation'],
    tool: 'Gaming Set (choose one kind)',
    equipment_a_items: [
      { name: 'Spear', qty: 1 },
      { name: 'Shortbow', qty: 1 },
      { name: 'Arrows', qty: 20 },
      { name: 'Gaming Set', qty: 1 },
      { name: 'Healer\'s Kit', qty: 1 },
      { name: 'Quiver', qty: 1 },
      { name: 'Traveler\'s Clothes', qty: 1 },
    ],
    equipment_a_gp: 14,
    equipment_b_gp: 50,
  },
  {
    id: 'wayfarer-2024',
    name: 'Wayfarer',
    edition: 'srd2024',
    description:
      'You grew up on the streets surrounded by similarly ill-fated castoffs, a few of them friends and a few of them rivals. You slept where you could and did odd jobs for food. At times, when the hunger became unbearable, you resorted to theft. Still, you never lost your pride and never abandoned hope. Fate is not yet finished with you.',
    abilities: ['dexterity', 'wisdom', 'charisma'],
    feat: { name: 'Lucky', desc: 'Origin feat. You have Luck Points equal to your Proficiency Bonus, spendable for Advantage on a D20 Test or to impose Disadvantage on an attack against you.' },
    skills: ['skill_insight', 'skill_stealth'],
    tool: 'Thieves\' Tools',
    equipment_a_items: [
      { name: 'Dagger', qty: 2 },
      { name: 'Thieves\' Tools', qty: 1 },
      { name: 'Gaming Set', qty: 1 },
      { name: 'Bedroll', qty: 1 },
      { name: 'Pouch', qty: 2 },
      { name: 'Traveler\'s Clothes', qty: 1 },
    ],
    equipment_a_gp: 16,
    equipment_b_gp: 50,
  },
];

export function findBackground(id) {
  return BACKGROUNDS_2024.find((b) => b.id === id) || null;
}

// Friendly skill labels for the modal — keys mirror the form field
// names (skill_insight, skill_religion, …) so wiring a checkbox is
// trivial.
export const SKILL_LABELS = {
  skill_acrobatics: 'Acrobatics (DEX)',
  skill_animal_handling: 'Animal Handling (WIS)',
  skill_arcana: 'Arcana (INT)',
  skill_athletics: 'Athletics (STR)',
  skill_deception: 'Deception (CHA)',
  skill_history: 'History (INT)',
  skill_insight: 'Insight (WIS)',
  skill_intimidation: 'Intimidation (CHA)',
  skill_investigation: 'Investigation (INT)',
  skill_medicine: 'Medicine (WIS)',
  skill_nature: 'Nature (INT)',
  skill_perception: 'Perception (WIS)',
  skill_performance: 'Performance (CHA)',
  skill_persuasion: 'Persuasion (CHA)',
  skill_religion: 'Religion (INT)',
  skill_sleight_of_hand: 'Sleight of Hand (DEX)',
  skill_stealth: 'Stealth (DEX)',
  skill_survival: 'Survival (WIS)',
};

// ── Tool kinds ───────────────────────────────────────────────────────────────
// Several backgrounds grant "one kind of" a tool family rather than a specific
// tool. These are the choices, so the picker can offer them instead of leaving
// the sheet reading "Gaming Set (choose one kind)" forever.
export const ARTISAN_TOOLS = [
  "Alchemist's Supplies", "Brewer's Supplies", "Calligrapher's Supplies",
  "Carpenter's Tools", "Cartographer's Tools", "Cobbler's Tools",
  "Cook's Utensils", "Glassblower's Tools", "Jeweler's Tools",
  "Leatherworker's Tools", "Mason's Tools", "Painter's Supplies",
  "Potter's Tools", "Smith's Tools", "Tinker's Tools", "Weaver's Tools",
  "Woodcarver's Tools",
];

export const GAMING_SETS = [
  'Dice Set', 'Dragonchess Set', 'Playing Card Set', 'Three-Dragon Ante Set',
];

export const MUSICAL_INSTRUMENTS = [
  'Bagpipes', 'Drum', 'Dulcimer', 'Flute', 'Horn', 'Lute', 'Lyre',
  'Pan Flute', 'Shawm', 'Viol',
];

// Given a background's `tool` string, return the choices it implies (or null
// when the tool is already specific). The base name is what the equipment list
// carries, so the caller can swap the generic entry for the chosen kind too.
export function toolChoicesFor(tool) {
  const t = String(tool || '');
  if (!t.includes('choose one kind')) return null;
  if (t.startsWith("Artisan's Tools"))    return { base: "Artisan's Tools",   options: ARTISAN_TOOLS };
  if (t.startsWith('Gaming Set'))         return { base: 'Gaming Set',        options: GAMING_SETS };
  if (t.startsWith('Musical Instrument')) return { base: 'Musical Instrument', options: MUSICAL_INSTRUMENTS };
  return null;
}
