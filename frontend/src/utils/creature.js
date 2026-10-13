// Creature presentation helpers shared by the editor and the stat block, so
// the two can't drift apart.

import { featureSkillBonuses } from './skills.js';

const SIZE_LABELS = {
  tiny: 'Tiny', small: 'Small', medium: 'Medium',
  large: 'Large', huge: 'Huge', gargantuan: 'Gargantuan',
};

// Creature types are stored Title Case and singular ("Monstrosity"). A swarm
// line names them in the plural — "Swarm of Tiny Monstrosities". Fey and
// Undead are already plural; everything else follows ordinary English rules.
const IRREGULAR_PLURALS = { fey: 'Fey', undead: 'Undead' };

export function pluraliseCreatureType(type) {
  const t = String(type || '').trim();
  if (!t) return '';
  const irregular = IRREGULAR_PLURALS[t.toLowerCase()];
  if (irregular) return irregular;
  if (/[^aeiou]y$/i.test(t)) return `${t.slice(0, -1)}ies`;   // Monstrosity → Monstrosities
  if (/(s|x|z|ch|sh)$/i.test(t)) return `${t}es`;
  return `${t}s`;
}

export function sizeLabel(size) {
  const s = String(size || '').toLowerCase();
  return SIZE_LABELS[s] || (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
}

// The stat block's size/type line.
//   normal: "Medium Monstrosity (shapechanger)"
//   swarm:  "Medium Swarm of Tiny Monstrosities"
// For a swarm, `size` is the swarm's own footprint and `swarm_creature_size`
// is how big the individuals are.
export function formatSizeType(creature) {
  if (!creature) return '';
  const size = sizeLabel(creature.size);
  const subtype = creature.subtype ? ` (${creature.subtype})` : '';
  if (creature.is_swarm) {
    const inner = sizeLabel(creature.swarm_creature_size || 'tiny');
    const type = pluraliseCreatureType(creature.creature_type) || 'creatures';
    return `${size} Swarm of ${inner} ${type}${subtype}`;
  }
  return `${size} ${creature.creature_type || ''}${subtype}`.trim();
}


// ── Stat-block lines ────────────────────────────────────────────────────────
//
// Lifted verbatim out of StatBlock.jsx so the printed A5 card and the on-screen
// block cannot disagree. Same reasoning as the header of this file: a second
// copy of "how a saving-throw line reads" would drift the first time someone
// adds a skill.

export function abilityMod(score) {
  return Math.floor(((score || 10) - 10) / 2);
}

// "+4" / "-1", for an ability SCORE.
export function modStr(score) {
  const m = Math.floor((score - 10) / 2);
  return m >= 0 ? `+${m}` : `${m}`;
}

// "+6" / "-1", for a value that is already a modifier.
export function signed(n) {
  const v = Number(n) || 0;
  return v >= 0 ? `+${v}` : `${v}`;
}

const SENSE_LABELS = {
  darkvision: 'Darkvision', blindsight: 'Blindsight', tremorsense: 'Tremorsense',
  truesight: 'Truesight', devilssight: "Devil's Sight",
};

export function sensesStr(creature) {
  let arr = [];
  if (Array.isArray(creature.senses)) {
    arr = creature.senses;
  } else if (typeof creature.senses === 'string' && creature.senses.trim().startsWith('[')) {
    try { arr = JSON.parse(creature.senses); } catch { arr = []; }
  }
  const parts = arr
    .filter((s) => s.type && s.type !== 'normal')
    .map((s) => {
      const label = SENSE_LABELS[s.type] || s.type;
      const range = s.range != null && s.range !== 0 ? ` ${s.range} ft.` : '';
      return label + range;
    });
  if (creature.passive_perception != null) {
    parts.push(`Passive Perception ${creature.passive_perception}`);
  }
  return parts.join(', ');
}

export function speedStr(creature) {
  const parts = [];
  if (creature.speed_walk) parts.push(`${creature.speed_walk} ft.`);
  if (creature.speed_fly) parts.push(`fly ${creature.speed_fly} ft.`);
  if (creature.speed_swim) parts.push(`swim ${creature.speed_swim} ft.`);
  if (creature.speed_burrow) parts.push(`burrow ${creature.speed_burrow} ft.`);
  if (creature.speed_climb) parts.push(`climb ${creature.speed_climb} ft.`);
  return parts.join(', ') || '—';
}

const SAVE_LABELS = {
  save_str: 'Str', save_dex: 'Dex', save_con: 'Con',
  save_int: 'Int', save_wis: 'Wis', save_cha: 'Cha',
};

export function savesStr(creature) {
  return Object.entries(SAVE_LABELS)
    .filter(([k]) => creature[k] !== null && creature[k] !== undefined)
    .map(([k, label]) => `${label} ${signed(creature[k])}`)
    .join(', ');
}

const SKILL_LABELS = {
  skill_acrobatics: 'Acrobatics', skill_animal_handling: 'Animal Handling', skill_arcana: 'Arcana',
  skill_athletics: 'Athletics', skill_deception: 'Deception', skill_history: 'History',
  skill_insight: 'Insight', skill_intimidation: 'Intimidation', skill_investigation: 'Investigation',
  skill_medicine: 'Medicine', skill_nature: 'Nature', skill_perception: 'Perception',
  skill_performance: 'Performance', skill_persuasion: 'Persuasion', skill_religion: 'Religion',
  skill_sleight_of_hand: 'Sleight of Hand', skill_stealth: 'Stealth', skill_survival: 'Survival',
};

// The stored `skill_<name>` column plus any flat bonus a class feature grants.
//
// A Magician druid's Primal Order adds their Wisdom modifier to Intelligence
// (Arcana or Nature) checks. That bonus cannot live in the column — the column
// is null for an untrained skill, and the bonus applies either way — so the
// stat block printed the unmodified number and the feature looked like it had
// never been applied. An untrained skill that a feature has raised is listed
// too: +5 Arcana on a druid with no Arcana proficiency is exactly the number
// that needs explaining.
const SKILL_STAT = {
  skill_acrobatics: 'dexterity', skill_animal_handling: 'wisdom', skill_arcana: 'intelligence',
  skill_athletics: 'strength', skill_deception: 'charisma', skill_history: 'intelligence',
  skill_insight: 'wisdom', skill_intimidation: 'charisma', skill_investigation: 'intelligence',
  skill_medicine: 'wisdom', skill_nature: 'intelligence', skill_perception: 'wisdom',
  skill_performance: 'charisma', skill_persuasion: 'charisma', skill_religion: 'intelligence',
  skill_sleight_of_hand: 'dexterity', skill_stealth: 'dexterity', skill_survival: 'wisdom',
};

export function skillsStr(creature) {
  const bonuses = featureSkillBonuses(creature);
  return Object.entries(SKILL_LABELS)
    .filter(([k]) => (creature[k] !== null && creature[k] !== undefined) || bonuses.has(k))
    .map(([k, label]) => {
      const trained = creature[k] !== null && creature[k] !== undefined;
      const base = trained ? Number(creature[k]) : abilityMod(creature[SKILL_STAT[k]]);
      return `${label} ${signed(base + (bonuses.get(k)?.total || 0))}`;
    })
    .join(', ');
}

// Armour Class, with whatever explains it in brackets. An equipped shield is
// named so the number can always be accounted for — but it is NOT added here.
//
// `armor_class` is the rolled-up total, not the body armour on its own.
// CreatureForm's `computeAcFromGear` derives it from equipped gear — armour
// base, DEX by category, Defense fighting style, magic bonuses AND the
// shield's +2 — and writes the finished number back to the row, which is what
// every other AC readout in the app prints verbatim: the creature library, the
// landing page, character setup, the helm panels.
//
// This function used to add the shield a second time, so a character wearing
// one read two points high on the character sheet and on the exported stat
// card while the editor beside it showed the correct number. The +2 belongs in
// the breakdown text, where it explains the total, and nowhere else.
export function acLine(creature) {
  const total = Number(creature.armor_class) || 0;
  const parts = [];
  if (creature.armor_desc) parts.push(creature.armor_desc);
  if (creature.shield_equipped) parts.push('shield +2');
  return { total, parts };
}
