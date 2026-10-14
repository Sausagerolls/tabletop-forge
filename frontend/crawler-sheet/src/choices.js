// Build choices made on top of picking a class or species.
// Class choices come from Tabletop Forge's 2024 class data (Divine Order,
// Primal Order, skill lists, Expertise, Weapon Mastery...). Species choices
// are read from the trait text, since the race catalog only describes them.
import { getClassChoices } from '@ttf/data/classes.js';
import { SKILLS } from './rules.js';
import { findSpecies, speciesTraits } from './ttf.js';

const SKILL_NAMES = SKILLS.map(([s]) => s);
export const skillName = (key) => SKILL_NAMES.find((s) => `skill_${s.toLowerCase().replace(/ /g, '_')}` === key) || key;
const ABIL = { strength: 'STR', dexterity: 'DEX', constitution: 'CON', intelligence: 'INT', wisdom: 'WIS', charisma: 'CHA' };
const ARMOR = { light: 'Light', medium: 'Medium', heavy: 'Heavy', shields: 'Shields' };

// Choices a class asks for, up to a class level. 'auto' choices need no pick.
export function classChoicesFor(cls, level) {
  let all = [];
  try { all = getClassChoices(cls) || []; } catch { all = []; }
  return all.filter((c) => (c.at_level || 1) <= level);
}
export const choiceIsExpertise = (c) => c.kind === 'multi-skills' && c.grant !== 'proficient';
export function choiceDone(c, v) {
  if (c.kind === 'auto') return true;
  if (c.kind === 'single') return !!v;
  return Array.isArray(v) && v.length === (c.pick_count || 1);
}

// Everything the picks add, for derive().
export function classChoiceEffects(st, classes) {
  const out = { skills: [], expertise: [], armor: [], weapons: [], mastery: [], traits: [], bonuses: [], spells: [], cantrips: 0 };
  for (const cls of Object.keys(classes)) {
    const picked = (st.classChoices || {})[cls] || {};
    for (const c of classChoicesFor(cls, classes[cls].level)) {
      const v = picked[c.id];
      let adds = null;
      if (c.kind === 'auto') adds = c.adds;
      else if (c.kind === 'single') adds = (c.options || []).find((o) => o.id === v)?.adds || null;
      else if (c.kind === 'multi-skills' && Array.isArray(v)) (choiceIsExpertise(c) ? out.expertise : out.skills).push(...v);
      else if (c.kind === 'multi-weapons' && Array.isArray(v)) out.mastery.push(...v);
      if (!adds) continue;
      (adds.armor || []).forEach((a) => out.armor.push(ARMOR[a] || a));
      (adds.weapons || []).forEach((w) => out.weapons.push(String(w).replace(/ weapons$/i, '')));
      (adds.skills || []).forEach((s) => (s.level === 'expertise' ? out.expertise : out.skills).push(skillName(s.skill)));
      (adds.skill_bonuses || []).forEach((b) => out.bonuses.push({ skills: b.skills.map(skillName), ability: ABIL[b.ability] || b.ability, min: b.min || 0, label: b.label }));
      (adds.traits || []).forEach((t) => out.traits.push({ ...t, cls }));
      (adds.spells || []).forEach((s) => out.spells.push(s.name));
      out.cantrips += Number(adds.cantrip_bonus) || 0;
    }
  }
  return out;
}

// ── Species ───────────────────────────────────────────────────────────────
const splitList = (s) => String(s).replace(/\.$/, '').split(/,\s*(?:or\s+|and\s+)?|\s+or\s+/).map((x) => x.trim()).filter(Boolean);
const NUM = { one: 1, two: 2, three: 3 };

// Picks a 2024 species asks for. A trait that changes every Long Rest (Elf
// Trance, Kalashtar) is left to the player.
export function speciesChoices(id, subId) {
  const race = findSpecies(id);
  if (!race) return [];
  const out = [];
  if (Array.isArray(race.sizeChoices) && race.sizeChoices.length > 1) out.push({ id: 'size', label: 'Size', kind: 'single', options: race.sizeChoices });
  for (const t of speciesTraits(id, subId)) {
    const desc = String(t.desc || '');
    if (/until you finish (?:your next|another) Long Rest/i.test(desc)) continue;
    let m = desc.match(/proficiency (?:in|with) (one|two|three) of the following skills of your choice:\s*([^.]+)/i);
    if (m) out.push({ id: `skills:${t.name}`, label: t.name, kind: 'skills', count: NUM[m[1].toLowerCase()], from: splitList(m[2]).filter((s) => SKILL_NAMES.includes(s)) });
    else {
      m = desc.match(/proficiency in (one|two) skills? (?:or with one tool )?of your choice|gain (one) skill proficiency/i);
      if (m) out.push({ id: `skills:${t.name}`, label: t.name, kind: 'skills', count: NUM[(m[1] || m[2]).toLowerCase()], from: SKILL_NAMES });
    }
    if (/Origin feat of your choice/i.test(desc)) out.push({ id: 'feat', label: t.name, kind: 'feat' });
    if (/Intelligence, Wisdom, or Charisma is your spellcasting ability/i.test(desc)) out.push({ id: `ability:${t.name}`, label: `${t.name}: spellcasting ability`, kind: 'single', options: ['Intelligence', 'Wisdom', 'Charisma'] });
    m = desc.match(/Resistance to one of the following damage types of your choice:\s*([^.]+)/i);
    if (m) out.push({ id: `resist:${t.name}`, label: t.name, kind: 'single', options: splitList(m[1]) });
  }
  return out;
}
export function speciesChoiceDone(c, v) {
  if (c.kind === 'skills') return Array.isArray(v) && v.length === c.count;
  return !!v;
}
// Fixed species skills (Elf Keen Senses, Owlin) plus the picked ones.
export function speciesSkills(st) {
  const race = findSpecies(st.speciesId);
  if (!race) return [];
  const fixed = (race.addsSkills || []).map((s) => skillName(s.skill));
  for (const t of speciesTraits(st.speciesId, st.subraceId)) {
    const m = String(t.desc || '').match(/You have proficiency in the (\w+(?: \w+)*) skill\./i);
    if (m && SKILL_NAMES.includes(m[1])) fixed.push(m[1]);
  }
  const picks = Object.entries(st.speciesChoices || {}).filter(([k]) => k.startsWith('skills:')).flatMap(([, v]) => v || []);
  return [...fixed, ...picks];
}
