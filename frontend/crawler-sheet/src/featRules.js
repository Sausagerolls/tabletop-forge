// What each 2024 feat asks the player to choose, and what the choices add.
// Tabletop Forge's feat data is text only, so the choices are described here.
// Ability increases have no cap of 20 in the World Dungeon (no Floor Cap).
import { ABILITIES, SKILLS } from './rules.js';
import { FEATS } from './ttf.js';
import { wdName } from './spells.js';

const SKILL_NAMES = SKILLS.map(([s]) => s);
const NAME_TO_AB = { strength: 'STR', dexterity: 'DEX', constitution: 'CON', intelligence: 'INT', wisdom: 'WIS', charisma: 'CHA' };
export const CASTER_ABILITIES = ['INT', 'WIS', 'CHA'];
const DAMAGE = ['Acid', 'Cold', 'Fire', 'Lightning', 'Thunder'];

// The feat a stored entry refers to. Background feats are named "Magic Initiate (Cleric)".
export function featBase(f) {
  const name = String(f?.name || '').replace(/\s*\(.*\)$/, '');
  return FEATS.find((x) => x.id === f?.id) || FEATS.find((x) => x.name === name) || null;
}

// "Ability Score Increase. Strength or Dexterity +1" → ['STR', 'DEX']
function asiOptions(desc) {
  const m = String(desc).match(/Ability Score Increase\.\s*([^.]*?)\s*\+1/);
  if (!m) return null;
  if (/one ability score/i.test(m[1])) return ABILITIES;
  const list = (m[1].match(/Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma/g) || []).map((w) => NAME_TO_AB[w.toLowerCase()]);
  return list.length ? list : null;
}

// The list of choices for one feat entry. Each: { key, label, kind, ... }.
//   kind 'ability' (options, count), 'skills' (from, count, expertise?), 'pick' (options),
//   'text', 'spells' (count, level, list?, filter, free).
export function featChoices(f) {
  const base = featBase(f);
  if (!base) return [];
  const out = [];
  const fixedList = (String(f.name).match(/\((Cleric|Druid|Wizard)\)/) || [])[1];
  switch (base.id) {
    case 'ability-score-improvement':
      out.push({ key: 'asi', label: 'Increase one score by 2, or two scores by 1', kind: 'asi' });
      break;
    case 'resilient':
      out.push({ key: 'ability', label: 'Ability (+1 and saving throw proficiency)', kind: 'ability', options: ABILITIES, count: 1, save: true });
      break;
    case 'magic-initiate':
      if (!fixedList) out.push({ key: 'list', label: 'Spell list', kind: 'pick', options: ['Cleric', 'Druid', 'Wizard'] });
      out.push({ key: 'castAbility', label: 'Spellcasting ability for these spells', kind: 'pick', options: CASTER_ABILITIES });
      out.push({ key: 'cantrips', label: 'Two cantrips', kind: 'spells', count: 2, level: 0, list: fixedList || '@list' });
      out.push({ key: 'spell', label: 'One level 1 spell (one free cast per long rest)', kind: 'spells', count: 1, level: 1, list: fixedList || '@list', free: true });
      break;
    case 'skilled':
      out.push({ key: 'skills', label: 'Three skills (or swap some for tools in Proficiencies)', kind: 'skills', from: SKILL_NAMES, count: 3 });
      break;
    case 'skill-expert':
      out.push({ key: 'skill', label: 'Skill proficiency', kind: 'skills', from: SKILL_NAMES, count: 1 });
      out.push({ key: 'expertise', label: 'Expertise in a skill you are proficient in', kind: 'skills', from: '@proficient', count: 1, expertise: true });
      break;
    case 'keen-mind':
      out.push({ key: 'lore', label: 'Lore Knowledge (proficiency, or Expertise if already proficient)', kind: 'skills', from: ['Arcana', 'History', 'Investigation', 'Nature', 'Religion'], count: 1, upgrade: true });
      break;
    case 'observant':
      out.push({ key: 'observer', label: 'Keen Observer (proficiency, or Expertise if already proficient)', kind: 'skills', from: ['Insight', 'Investigation', 'Perception'], count: 1, upgrade: true });
      break;
    case 'boon-of-skill':
      out.push({ key: 'expertise', label: 'Expertise', kind: 'skills', from: SKILL_NAMES, count: 1, expertise: true });
      break;
    case 'elemental-adept':
      out.push({ key: 'element', label: 'Energy Mastery', kind: 'pick', options: DAMAGE });
      break;
    case 'boon-of-energy-resistance':
      out.push({ key: 'resist', label: 'Two resistances (change on a long rest)', kind: 'multi', options: ['Acid', 'Cold', 'Fire', 'Lightning', 'Necrotic', 'Poison', 'Psychic', 'Radiant', 'Thunder'], count: 2 });
      break;
    case 'crafter':
      out.push({ key: 'tools', label: "Three Artisan's Tools", kind: 'text' });
      break;
    case 'musician':
      out.push({ key: 'tools', label: 'Three Musical Instruments', kind: 'text' });
      break;
    case 'weapon-master':
      out.push({ key: 'weapon', label: 'Weapon kind for its mastery property (change on a long rest)', kind: 'text' });
      break;
    case 'fey-touched':
      out.push({ key: 'spell', label: `One level 1 Divination or Enchantment spell (also ${wdName('Misty Step')}; one free cast each per long rest)`, kind: 'spells', count: 1, level: 1, school: /divination|enchantment/i, free: true, fixed: [wdName('Misty Step')] });
      break;
    case 'shadow-touched':
      out.push({ key: 'spell', label: `One level 1 Illusion or Necromancy spell (also ${wdName('Invisibility')}; one free cast each per long rest)`, kind: 'spells', count: 1, level: 1, school: /illusion|necromancy/i, free: true, fixed: [wdName('Invisibility')] });
      break;
    case 'ritual-caster':
      out.push({ key: 'rituals', label: 'Level 1 Ritual spells (as many as your Proficiency Bonus)', kind: 'spells', count: '@pb', level: 1, ritual: true });
      break;
    case 'telekinetic':
      out.push({ key: 'fixed', label: wdName('Mage Hand'), kind: 'spells', count: 0, level: 0, fixed: [wdName('Mage Hand')] });
      break;
    default:
  }
  const asi = base.id !== 'resilient' && base.id !== 'ability-score-improvement' ? asiOptions(base.desc) : null;
  if (asi) out.unshift({ key: 'ability', label: 'Ability Score Increase (+1)', kind: 'ability', options: asi, count: 1 });
  // Feats that cast spells use the ability they raised (Fey Touched, Telekinetic...).
  return out;
}

export const resolveCount = (c, d) => (c.count === '@pb' ? d.pb : c.count);
export const resolveList = (c, v) => (c.list === '@list' ? v.list : c.list);
// The spellcasting ability for a feat's spells.
export function featCastAbility(f) {
  const v = f.choices || {};
  if (v.castAbility) return v.castAbility;
  const base = featBase(f);
  if (base?.id === 'magic-initiate') return 'WIS';
  const raised = Array.isArray(v.ability) ? v.ability[0] : v.ability;
  return CASTER_ABILITIES.includes(raised) ? raised : 'INT';
}

// `spells` is the crawler's tome (st.spells), or a map of choice key → picked spells.
export function featDone(f, d, spells) {
  const v = f.choices || {};
  const chosen = (c) => {
    const rows = Array.isArray(spells) ? spells.filter((x) => x.featUid === f.uid && x.featKey === c.key) : (spells || {})[c.key] || [];
    return rows.filter((x) => !(c.fixed || []).includes(x.name)).length;
  };
  return featChoices(f).every((c) => {
    const x = v[c.key];
    if (c.kind === 'asi') return Array.isArray(x) && (x.length === 2 || (x.length === 1 && x[0].endsWith('+2')));
    if (c.kind === 'text') return !!String(x || '').trim();
    if (c.kind === 'skills' || c.kind === 'multi' || c.kind === 'ability') return Array.isArray(x) && x.length === (c.count || 1);
    if (c.kind === 'spells') return chosen(c) === resolveCount(c, d);
    return !!x;
  });
}

// Everything chosen feats add, for derive().
export function featEffects(st) {
  const fx = { scores: {}, saves: [], skills: [], expertise: [], upgrade: [], armor: [], weapons: [], hpPerLevel: 0, hpFlat: 0, speed: 0, initiativePB: false, resist: [], tools: [] };
  ABILITIES.forEach((a) => { fx.scores[a] = 0; });
  for (const f of st.feats || []) {
    const base = featBase(f);
    if (!base) continue;
    const v = f.choices || {};
    if (Array.isArray(v.ability)) v.ability.forEach((a) => { fx.scores[a] += 1; });
    if (base.id === 'resilient' && Array.isArray(v.ability)) fx.saves.push(...v.ability);
    if (Array.isArray(v.asi)) v.asi.forEach((x) => { const [a, n] = x.split('+'); fx.scores[a] += Number(n) || 1; });
    if (Array.isArray(v.skills)) fx.skills.push(...v.skills);
    if (Array.isArray(v.skill)) fx.skills.push(...v.skill);
    if (Array.isArray(v.expertise)) fx.expertise.push(...v.expertise);
    if (Array.isArray(v.lore)) fx.upgrade.push(...v.lore);
    if (Array.isArray(v.observer)) fx.upgrade.push(...v.observer);
    if (Array.isArray(v.resist)) fx.resist.push(...v.resist);
    if (v.tools) fx.tools.push(v.tools);
    switch (base.id) {
      case 'tough': fx.hpPerLevel += 2; break;
      case 'boon-of-fortitude': fx.hpFlat += 40; break;
      case 'speedy': fx.speed += 10; break;
      case 'boon-of-speed': fx.speed += 30; break;
      case 'alert': fx.initiativePB = true; break;
      case 'lightly-armored': fx.armor.push('Light', 'Shields'); break;
      case 'moderately-armored': fx.armor.push('Medium'); break;
      case 'heavily-armored': fx.armor.push('Heavy'); break;
      case 'martial-weapon-training': fx.weapons.push('Martial'); break;
      case 'boon-of-skill': fx.skills.push(...SKILL_NAMES); break;
      default:
    }
  }
  return fx;
}

let n = 0;
export const newFeat = (f, source) => ({ id: f.id, name: f.name, desc: f.desc, source, uid: `f${Date.now().toString(36)}${(n += 1)}`, choices: {} });

// Write a feat's chosen spells into the tome (and remove ones it no longer grants).
// `picked` maps choice key → array of spell library rows.
export function syncFeatSpells(s, f, picked, snap) {
  const tag = f.uid;
  const keep = s.spells.filter((x) => x.featUid !== tag);
  const ability = featCastAbility(f);
  const add = [];
  for (const c of featChoices(f).filter((x) => x.kind === 'spells')) {
    for (const sp of picked[c.key] || []) {
      add.push({ ...snap(sp), tome: true, source: 'Feat', sourceName: f.name, featUid: tag, featKey: c.key, ability, rank: 1,
        ...(c.free && sp.level > 0 ? { free: true } : {}) });
    }
  }
  s.spells = [...keep, ...add.filter((x, i) => add.findIndex((y) => y.id === x.id) === i)];
}
