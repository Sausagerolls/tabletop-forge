// World Dungeon rules as numbers. Everything here mirrors the rulebooks:
// classes/crawler.md, rules/mana.md, rules/leveling.md, rules/prestige-levels.md.

export const ABILITIES = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
export const ABILITY_NAME = { STR: 'Strength', DEX: 'Dexterity', CON: 'Constitution', INT: 'Intelligence', WIS: 'Wisdom', CHA: 'Charisma' };
export const ABILITY_COLUMN = { STR: 'strength', DEX: 'dexterity', CON: 'constitution', INT: 'intelligence', WIS: 'wisdom', CHA: 'charisma' };

export const SKILLS = [
  ['Acrobatics', 'DEX'], ['Animal Handling', 'WIS'], ['Arcana', 'INT'], ['Athletics', 'STR'], ['Deception', 'CHA'],
  ['History', 'INT'], ['Insight', 'WIS'], ['Intimidation', 'CHA'], ['Investigation', 'INT'], ['Medicine', 'WIS'],
  ['Nature', 'INT'], ['Perception', 'WIS'], ['Performance', 'CHA'], ['Persuasion', 'CHA'], ['Religion', 'INT'],
  ['Sleight of Hand', 'DEX'], ['Stealth', 'DEX'], ['Survival', 'WIS'],
];
export const skillKey = (name) => 'skill_' + name.toLowerCase().replace(/ /g, '_');

export const CLASSES = ['Barbarian', 'Bard', 'Cleric', 'Druid', 'Fighter', 'Monk', 'Paladin', 'Ranger', 'Rogue', 'Sorcerer', 'Warlock', 'Wizard'];
export const HIT_DIE = { Crawler: 'd8', Barbarian: 'd12', Bard: 'd8', Cleric: 'd8', Druid: 'd8', Fighter: 'd10', Monk: 'd8',
  Paladin: 'd10', Ranger: 'd10', Rogue: 'd8', Sorcerer: 'd6', Warlock: 'd8', Wizard: 'd6' };
export const DIE_FIXED = { d6: 4, d8: 5, d10: 6, d12: 7 };
export const CLASS_SAVES = { Barbarian: ['STR', 'CON'], Bard: ['DEX', 'CHA'], Cleric: ['WIS', 'CHA'], Druid: ['INT', 'WIS'],
  Fighter: ['STR', 'CON'], Monk: ['STR', 'DEX'], Paladin: ['WIS', 'CHA'], Ranger: ['STR', 'DEX'], Rogue: ['DEX', 'INT'],
  Sorcerer: ['CON', 'CHA'], Warlock: ['WIS', 'CHA'], Wizard: ['INT', 'WIS'] };
export const CLASS_ARMOR = { Barbarian: ['Light', 'Medium', 'Shields'], Bard: ['Light'], Cleric: ['Light', 'Medium', 'Shields'],
  Druid: ['Light', 'Medium', 'Shields'], Fighter: ['Light', 'Medium', 'Heavy', 'Shields'], Monk: [], Paladin: ['Light', 'Medium', 'Heavy', 'Shields'],
  Ranger: ['Light', 'Medium', 'Shields'], Rogue: ['Light'], Sorcerer: [], Warlock: ['Light'], Wizard: [] };
export const CLASS_WEAPONS = { Barbarian: ['Simple', 'Martial'], Bard: ['Simple'], Cleric: ['Simple'], Druid: ['Simple'],
  Fighter: ['Simple', 'Martial'], Monk: ['Simple'], Paladin: ['Simple', 'Martial'], Ranger: ['Simple', 'Martial'], Rogue: ['Simple'],
  Sorcerer: ['Simple'], Warlock: ['Simple'], Wizard: ['Simple'] };

export const SPELL_ABILITY = { Bard: 'CHA', Cleric: 'WIS', Druid: 'WIS', Paladin: 'CHA', Ranger: 'WIS', Sorcerer: 'CHA', Warlock: 'CHA', Wizard: 'INT',
  'Fighter:Eldritch Knight': 'INT', 'Rogue:Arcane Trickster': 'INT' };

export const mod = (score) => Math.floor((Number(score || 10) - 10) / 2);
export const sign = (n) => (n >= 0 ? '+' : '') + n;

// Proficiency bonus by character level (normal to 20, then every 8 levels).
export function profBonus(level) {
  if (level <= 20) return 2 + Math.floor((Math.max(1, level) - 1) / 4);
  return 7 + Math.floor((level - 21) / 8);
}

// ---------- mana (rules/mana.md) ----------
export const MANA_COST = [0, 2, 3, 5, 6, 7, 9, 10, 11, 13];
const CLASS_MANA = [0, 4, 6, 14, 17, 27, 32, 38, 44, 57, 64, 73, 73, 83, 83, 94, 94, 107, 114, 123, 133];
const MAX_SPELL = [0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 9, 9];

export function casterKind(cls, subclass) {
  if (['Bard', 'Cleric', 'Druid', 'Sorcerer', 'Wizard'].includes(cls)) return 'full';
  if (['Paladin', 'Ranger'].includes(cls)) return 'half';
  if ((cls === 'Fighter' && /eldritch knight/i.test(subclass || '')) || (cls === 'Rogue' && /arcane trickster/i.test(subclass || ''))) return 'third';
  if (cls === 'Warlock') return 'pact';
  return 'none';
}

export function casterLevel(classes) {
  let total = 0;
  for (const [cls, c] of Object.entries(classes || {})) {
    const k = casterKind(cls, c.subclass);
    if (k === 'full') total += c.level;
    else if (k === 'half') total += Math.ceil(c.level / 2);
    else if (k === 'third') total += Math.ceil(c.level / 3);
  }
  return total;
}

export function classMana(cl) {
  if (cl <= 0) return 0;
  if (cl <= 20) return CLASS_MANA[cl];
  return CLASS_MANA[20] + 6 * (cl - 20);
}

export function maxSpellLevel(classes) {
  const cl = casterLevel(classes);
  let cap = cl > 0 ? MAX_SPELL[Math.min(cl, 20)] : 0;
  const kinds = Object.entries(classes || {}).map(([c, v]) => casterKind(c, v.subclass));
  if (kinds.length && kinds.every((k) => k === 'half' || k === 'none' || k === 'pact')) cap = Math.min(cap, 5);
  if (kinds.length && kinds.every((k) => k === 'third' || k === 'none' || k === 'pact')) cap = Math.min(cap, 4);
  return cap;
}

export function pactMana(warlockLevel) {
  const L = warlockLevel;
  if (!L) return { mana: 0, level: 0 };
  if (L >= 21) return { mana: 28 + 7 * (L - 20), level: 5 };
  const t = [[1, 2, 1], [2, 4, 1], [4, 6, 2], [6, 10, 3], [8, 12, 4], [10, 14, 5], [16, 21, 5], [20, 28, 5]];
  for (const [upto, mana, lvl] of t) if (L <= upto) return { mana, level: lvl };
  return { mana: 28, level: 5 };
}

export const tomeSpellLimit = (level, tomeScholar) => Math.min(9, Math.ceil(level / 2) + (tomeScholar ? 1 : 0));

// ---------- survivor features (classes/crawler.md) ----------
export const INCLINATIONS = {
  Bruiser: ['+1d4 damage once per turn with unarmed or improvised hits; advantage to grapple and shove.',
    'Extra damage 1d6; Large or smaller target makes a Strength save or falls prone.',
    'Extra damage 1d8; resistance to bludgeoning without medium or heavy armor.'],
  Skulker: ['+1d6 damage once per turn with a finesse, ranged or thrown hit made with advantage; advantage on Stealth at half speed.',
    'Extra damage 2d6, and also without advantage if an ally is next to the target. Run Away! can Hide.',
    'Extra damage 3d6.'],
  Bulwark: ['Proficiency with medium armor and shields. Will to Live also gives temp HP equal to your level.',
    'Reaction: reduce damage taken by 1d10 + Con modifier, PB times per long rest.',
    'Proficiency with heavy armor.'],
  Dabbler: ['Learn one cantrip from any list (Intelligence). Mana pool +your level.',
    'Learn one more cantrip, and one 1st- or 2nd-level spell as a tome spell.',
    'Once per long rest, cast a tome spell of 3rd level or lower without mana.'],
};

export function survivorFeatures(level, st) {
  const f = [];
  const add = (lv, name, text) => { if (level >= lv) f.push({ lv, name, text }); };
  add(1, 'Scrappy', 'Unarmed strikes 1d4 (Str or Dex). Improvised weapons 1d6, or 1d8 in two hands, thrown 20/60. On a 1 on a d6 after a hit, the improvised weapon breaks.');
  add(1, 'Will to Live', `Bonus action: regain 1d8 + your level in hit points. ${level >= 8 ? '2 uses' : '1 use'} per short or long rest.`);
  add(2, 'Run Away!', 'Bonus action: Dash or Disengage.');
  if (level >= 3) {
    const inc = st.inclination;
    const lines = inc ? INCLINATIONS[inc].slice(0, level >= 9 ? 3 : level >= 6 ? 2 : 1) : ['Choose an Inclination: Bruiser, Skulker, Bulwark or Dabbler.'];
    f.push({ lv: 3, name: `Inclination${inc ? ': ' + inc : ''}`, text: lines.join(' ') });
  }
  add(4, 'Hard to Kill', 'Once per long rest, when you drop to 0 hit points and do not die outright, drop to 1 instead.');
  add(5, `Hardened${st.hardened ? ': ' + st.hardened : ''}`, st.hardened === 'Arcane Edge' ? 'Add your Intelligence modifier to cantrip damage.'
    : st.hardened === 'Extra Attack' ? 'Attack twice when you take the Attack action.' : 'Choose Extra Attack or Arcane Edge.');
  add(7, 'Danger Sense', 'Advantage on Dexterity saves against effects you can see.');
  return f;
}

export const CORE_FEATURES = [
  { name: 'The Interface', text: 'Status bars, Inspect (bonus action, 60 ft: name, level, a rude description), and System notifications. No map: you draw your own.' },
  { name: 'Crawler Inventory', text: '20 + level slots. Store or retrieve one item as your free interaction; more costs a bonus action. Spills out when you die.' },
  { name: 'Stat Points', text: '+1 to any ability every level. No cap.' },
  { name: 'Skill Picks', text: 'At every odd level: Learn a Crawler Skill, Train one (+1 level, max 15), Training Montage (2 Stat Points) or Drill (a proficiency).' },
  { name: 'Learning by Doing', text: 'Armor never gives penalties. Weapons you are not proficient with add half your proficiency bonus.' },
  { name: 'Tome Learning', text: 'Learn spells from tomes and cast them with mana. Starts with Heal Self.' },
];

export const HEAL_SELF = { id: 'heal-self', name: 'Heal Self', level: 1, rank: 1, tome: true, fixedCost: 1, school: 'Evocation',
  casting_time: '1 action (bonus action at Rank III+)', range_area: 'Self', duration: 'Instantaneous',
  description: 'You regain 1d8 hit points per rank. Always cast at 1st level for 1 mana.' };

// ---------- crawler-skill helpers ----------
export const skillCap = (sk) => (sk.limitBreaker ? 20 : 15);

// 2024 conditions (short rules reminders).
export const CONDITIONS = [
  ['Blinded', "Can't see; fails sight checks. Attacks against you have advantage; yours have disadvantage."],
  ['Charmed', "Can't attack the charmer or target it with harmful effects. The charmer has advantage on social checks with you."],
  ['Deafened', "Can't hear; fails hearing checks."],
  ['Frightened', "Disadvantage on checks and attacks while the source is in sight. Can't willingly move closer to it."],
  ['Grappled', 'Speed 0. Disadvantage on attacks against anyone but the grappler. The grappler can drag you.'],
  ['Incapacitated', "No actions, bonus actions or reactions. Concentration breaks. Can't speak. Disadvantage on initiative."],
  ['Invisible', "Advantage on initiative. Unaffected by effects that need sight of you. Attacks against you have disadvantage; yours have advantage."],
  ['Paralyzed', 'Incapacitated, speed 0. Fail Str and Dex saves. Attacks against you have advantage; hits within 5 ft are crits.'],
  ['Petrified', 'Turned to stone: incapacitated, speed 0, resistance to all damage, immune to poison. Fail Str and Dex saves.'],
  ['Poisoned', 'Disadvantage on attack rolls and ability checks.'],
  ['Prone', 'Crawl or spend half your speed to stand. Disadvantage on attacks. Attacks within 5 ft have advantage; further away, disadvantage.'],
  ['Restrained', 'Speed 0. Disadvantage on attacks and Dex saves. Attacks against you have advantage.'],
  ['Stunned', 'Incapacitated. Fail Str and Dex saves. Attacks against you have advantage.'],
  ['Unconscious', 'Incapacitated, prone, drop what you hold. Fail Str and Dex saves. Attacks have advantage; hits within 5 ft are crits.'],
];
