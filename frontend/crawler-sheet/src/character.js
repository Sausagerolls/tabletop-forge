// The crawler: stored state (crawler_state on the TTF creature) and everything derived from it.
import {
  ABILITIES, ABILITY_COLUMN, SKILLS, skillKey, HIT_DIE, CLASS_SAVES, CLASS_ARMOR, CLASS_WEAPONS, SPELL_ABILITY,
  mod, profBonus, casterLevel, classMana, maxSpellLevel, pactMana, tomeSpellLimit, HEAL_SELF,
} from './rules.js';
import SETTING from './generated/setting.json';
import { classChoiceEffects, speciesSkills } from './choices.js';
import { featEffects } from './featRules.js';

export const SKILL_DATA = SETTING.skills;
export const PRESTIGE = SETTING.prestige;
export const BOX_TYPES = SETTING.boxTypes;
export const RARITIES = SETTING.rarities;
export const findSkill = (name) => SKILL_DATA.find((s) => s.name === name) || null;

export function newCrawler(owner) {
  const scores = {};
  ABILITIES.forEach((a) => { scores[a] = 10; });
  return {
    version: 1,
    name: '', owner, floor: 1, created: false,
    background: '', backgroundId: '', where: '', wearing: '', pocket: '', appearance: '', notes: '',
    scores, base: { ...scores }, lowered: '',
    statPointsUnspent: 0, skillPicksUnspent: 0,
    saveChoice: '', skills: [], expertise: [], extraSkill: '', tools: '', languages: 'Common',
    armorProf: ['Light'], weaponProf: ['Simple', 'Improvised'], drills: [], learning: [],
    crawlerSkills: [],
    levels: [{ n: 1, cls: 'Crawler', hd: 'd8', hp: 8 }],
    subclasses: {}, speciesId: '', subraceId: '', classChosen: false,
    feats: [],
    inclination: '', hardened: '',
    hp: { current: null, temp: 0 }, hitDiceUsed: {}, deathSaves: { s: 0, f: 0 }, exhaustion: 0, inspiration: false,
    conditions: '', willToLiveUsed: 0, hardToKillUsed: false,
    mana: { current: null, pact: null, big: [] },
    spells: [{ ...HEAL_SELF }],
    inventory: [], gold: 0, materials: {}, slotBonus: 0, acMisc: 0,
    boxes: {}, boxLog: [], achievements: [], audience: 0, pk: false,
    pet: null,
  };
}

// Class levels from the level log. Levels taken as a crawler count toward the
// class picked on Floor 3 (they keep their d8 Hit Dice).
export function classLevels(st) {
  const out = {};
  for (const e of st.levels) {
    const c = e.asClass || (e.cls !== 'Crawler' ? e.cls : null);
    if (!c) continue;
    if (!out[c]) out[c] = { level: 0, subclass: st.subclasses[c] || '' };
    out[c].level += 1;
  }
  return out;
}

export const classAbility = (cls, sub) => SPELL_ABILITY[`${cls}:${sub}`] || SPELL_ABILITY[cls] || null;

// The ability a tome spell is cast with: Intelligence for a spell read from a tome
// (or a class ability if the spell is on that class's list and it is better),
// the class's for a class spell, the feature's for a feat or species spell.
export function spellAbilityFor(sp, d) {
  if (sp.ability) return sp.ability;
  if (sp.source === 'Class' && sp.cls) return classAbility(sp.cls, d.classes[sp.cls]?.subclass) || 'INT';
  const lists = String(sp.allowed_classes || '');
  const opts = ['INT', ...d.classNames.filter((c) => lists.includes(c)).map((c) => classAbility(c, d.classes[c].subclass)).filter(Boolean)];
  return opts.reduce((best, a) => (d.m[a] > d.m[best] ? a : best), 'INT');
}

export function derive(st) {
  const level = st.levels.length;
  const pb = profBonus(level);
  // Scores include feat increases (no cap of 20 in the World Dungeon).
  const ffx = featEffects(st);
  const scores = {};
  const m = {};
  ABILITIES.forEach((a) => { scores[a] = (Number(st.scores[a]) || 10) + (ffx.scores[a] || 0); m[a] = mod(scores[a]); });
  const classes = classLevels(st);
  const classNames = Object.keys(classes);
  const primary = classNames[0] || null;

  // Crawler Skills used by the maths
  const sl = (name) => (st.crawlerSkills.find((s) => s.name === name) || {}).level || 0;
  const tough = sl('Tough as Nails');
  const toughPer = tough >= 10 ? 3 : tough >= 5 ? 2 : tough >= 1 ? 1 : 0;

  const hpMax = Math.max(1, st.levels.reduce((t, e) => t + (Number(e.hp) || 0), 0) + level * m.CON + level * toughPer + level * ffx.hpPerLevel + ffx.hpFlat);
  const hitDice = {};
  st.levels.forEach((e) => { hitDice[e.hd] = (hitDice[e.hd] || 0) + 1; });

  const saves = [...new Set([...(primary ? CLASS_SAVES[primary] : ['CON', ...(st.saveChoice ? [st.saveChoice] : [])]), ...ffx.saves])];
  const fx = classChoiceEffects(st, classes);
  const profSkills = new Set([...st.skills, ...(st.bgSkills || []), ...(st.classSkills || []), ...(st.extraSkill ? [st.extraSkill] : []), ...fx.skills, ...speciesSkills(st), ...ffx.skills]);
  const expSkills = new Set([...st.expertise, ...fx.expertise, ...ffx.expertise]);
  // Keen Mind, Observant: proficiency, or Expertise if already proficient.
  ffx.upgrade.forEach((n) => { if (profSkills.has(n)) expSkills.add(n); else profSkills.add(n); });
  const skillRows = SKILLS.map(([name, ab]) => {
    const prof = profSkills.has(name);
    const exp = expSkills.has(name);
    // Bonuses such as Primal Order (Magician): + Wisdom modifier to Arcana and Nature, minimum +1.
    const extra = fx.bonuses.filter((b) => b.skills.includes(name)).reduce((t, b) => t + Math.max(b.min, m[b.ability] || 0), 0);
    return { name, ab, prof, exp, extra, bonus: m[ab] + (exp ? 2 * pb : prof ? pb : 0) + extra };
  });

  const armorProf = new Set([...st.armorProf, ...classNames.flatMap((c) => CLASS_ARMOR[c] || []), ...fx.armor, ...ffx.armor]);
  const weaponProf = new Set([...st.weaponProf, ...classNames.flatMap((c) => CLASS_WEAPONS[c] || []), ...fx.weapons, ...ffx.weapons]);
  if (st.inclination === 'Bulwark' && level >= 3) { armorProf.add('Medium'); armorProf.add('Shields'); }
  if (st.inclination === 'Bulwark' && level >= 9) armorProf.add('Heavy');
  st.drills.forEach((d) => { if (/armor/i.test(d)) armorProf.add(d.replace(/ armor/i, '')); else if (d === 'Shields') armorProf.add('Shields'); else weaponProf.add(d.replace(/ weapons/i, '')); });

  // Armor class from equipped gear
  let ac = 10 + m.DEX;
  const armor = st.inventory.find((i) => i.equipped && Number(i.ac_base) > 0 && i.armor_category && !/shield/i.test(i.armor_category));
  if (armor) {
    const cat = String(armor.armor_category).toLowerCase();
    ac = Number(armor.ac_base) + (cat.startsWith('heavy') ? 0 : cat.startsWith('medium') ? Math.min(2, m.DEX) : m.DEX);
  }
  const shield = st.inventory.find((i) => i.equipped && /shield/i.test(`${i.armor_category} ${i.name}`));
  if (shield) ac += 2;
  ac += st.inventory.filter((i) => i.equipped).reduce((t, i) => t + (Number(i.ac_bonus) || 0), 0) + (Number(st.acMisc) || 0);

  // Mana
  const dabbler = st.inclination === 'Dabbler' && level >= 3 ? level : 0;
  const tomeMana = Math.max(1, level + m.INT) + dabbler + sl('Mana Well');
  const cl = casterLevel(classes);
  const clsMana = classMana(cl);
  const pact = pactMana(classes.Warlock?.level || 0);
  const manaMax = tomeMana + clsMana;

  const spellAbility = primary ? classAbility(primary, classes[primary].subclass) : null;
  const castMod = spellAbility ? m[spellAbility] : null;
  // Every spell is a tome spell; its source decides the ability (rules/tome-magic.md).
  const classAbilities = classNames.map((c) => classAbility(c, classes[c].subclass)).filter(Boolean);
  const tomeLimit = tomeSpellLimit(level, sl('Tome Scholar') > 0);
  const maxSpell = maxSpellLevel(classes);

  const slots = 20 + level + (Number(st.slotBonus) || 0) + 2 * sl('Pack Rat');
  const used = st.inventory.reduce((t, i) => t + (i.equipped ? 0 : 1), 0);

  return {
    level, pb, m, classes, classNames, primary, hpMax, hitDice, saves, skillRows, armorProf, weaponProf, ac,
    scores, featFx: ffx, classAbilities,
    initiative: m.DEX + (ffx.initiativePB ? pb : 0), speed: 30 + ffx.speed, passive: 10 + skillRows.find((r) => r.name === 'Perception').bonus,
    tomeMana, clsMana, manaMax, pact, casterLevel: cl, maxSpell, tomeLimit, maxCast: Math.max(maxSpell, tomeLimit),
    dcFor: (a) => 8 + pb + (m[a] || 0), atkFor: (a) => pb + (m[a] || 0),
    tomeDC: 8 + pb + m.INT, tomeAtk: pb + m.INT, spellAbility, spellDC: castMod === null ? null : 8 + pb + castMod,
    spellAtk: castMod === null ? null : pb + castMod, slots, slotsUsed: used, sl, choiceFx: fx,
  };
}

// Columns written to the Tabletop Forge creature so the GM sees the crawler too.
export function toCreature(st, d) {
  const row = {
    name: st.name || 'Unnamed crawler',
    is_player_character: true,
    player_owner: st.owner,
    creature_type: 'Humanoid',
    size: String((st.speciesChoices || {}).size || 'medium').toLowerCase(),
    char_level: d.level,
    char_class: d.classNames.length ? d.classNames.map((c) => `${c} ${d.classes[c].level}`).join(' / ') : 'Crawler',
    char_subclass: d.primary ? d.classes[d.primary].subclass || '' : '',
    hit_points: d.hpMax,
    armor_class: d.ac,
    proficiency_bonus: d.pb,
    speed_walk: d.speed,
    passive_perception: d.passive,
    currency_gp: Number(st.gold) || 0,
    inventory: st.inventory,
    languages: st.languages,
    player_notes: st.notes,
    backstory: [st.where && `When the world ended: ${st.where}`, st.wearing && `Wearing: ${st.wearing}`, st.pocket && `Pocket item: ${st.pocket}`].filter(Boolean).join('\n'),
    background: st.background,
    crawler_state: st,
    // Tabletop Forge reads the druid's Wild Shape list from this column.
    wildshape_forms: (st.wildForms || []).map((f) => f.id),
  };
  ABILITIES.forEach((a) => { row[ABILITY_COLUMN[a]] = d.scores[a]; });
  ABILITIES.forEach((a) => { row[`save_${a.toLowerCase()}`] = d.saves.includes(a) ? d.m[a] + d.pb : null; });
  d.skillRows.forEach((r) => { row[skillKey(r.name)] = r.prof || r.exp ? r.bonus : null; });
  row.skill_expertise = Object.fromEntries(d.skillRows.filter((r) => r.exp).map((r) => [skillKey(r.name), true]));
  return row;
}

export function fromCreature(row, owner) {
  let st = row.crawler_state;
  if (typeof st === 'string') { try { st = JSON.parse(st); } catch { st = null; } }
  const base = newCrawler(owner);
  if (!st || !st.version) {
    // A TTF character made elsewhere: start a crawler from its basics.
    base.name = row.name || '';
    ABILITIES.forEach((a) => { base.scores[a] = Number(row[ABILITY_COLUMN[a]]) || 10; });
    base.created = false;
    return base;
  }
  const out = { ...base, ...st, owner: st.owner || owner };
  // Background skills were once saved with their ability ("Stealth (DEX)").
  out.bgSkills = (out.bgSkills || []).map((x) => String(x).replace(/ \([A-Z]{3}\)$/, ''));
  // Older sheets kept class skills in classSkills; they now live with the other class choices.
  const cls = (out.levels.find((e) => e.asClass) || {}).asClass;
  if (cls && (out.classSkills || []).length && !((out.classChoices || {})[cls] || {})['class-skills']) {
    out.classChoices = { ...(out.classChoices || {}), [cls]: { ...((out.classChoices || {})[cls] || {}), 'class-skills': out.classSkills } };
    out.classSkills = [];
  }
  // Every spell is now a tome spell. Class spells keep their class as the source.
  out.spells = (out.spells || []).map((sp) => {
    const x = { ...sp, level: Number(sp.level) || 0 };
    if (x.id === 'heal-self') return { ...x, tome: true, source: 'Crawler' };
    if (!x.tome) { delete x.prepared; return { ...x, tome: true, source: 'Class', rank: x.rank || 1 }; }
    return { ...x, source: x.source || 'Tome' };
  });
  // Feats get an id so their choices and spells can be found again.
  out.feats = (out.feats || []).map((f, i) => (f.uid ? f : { ...f, uid: `f${Date.now().toString(36)}${i}` }));
  return out;
}
