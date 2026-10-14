// Tabletop Forge data, read from its source at build time (see vite.config.js).
// 2024 rules only.
import { RACE_CATALOG, combinedRaceTraits } from '@ttf/data/races.js';
import { SUBCLASS_FEATURES, classFeaturesFor, subclassFeaturesFor, subclassEntry, wildShapeCrCap, wildShapeTempHp } from '@ttf/data/subclasses.js';
import { IMPORTED_SUBCLASSES } from '@ttf/data/classes_imported.js';
import { BACKGROUNDS_2024, SKILL_LABELS } from '@ttf/data/backgrounds.js';
import { FEATS_2024 } from '@ttf/data/feats.js';
import { WEAPONS, masteryText } from '@ttf/data/weapons.js';
export { WEAPONS, masteryText };
import { resourcesForCreature } from '@ttf/data/resources.js';
import { CLASSES } from './rules.js';

export const SPECIES = RACE_CATALOG.filter((r) => r.edition === 'srd2024').sort((a, b) => a.name.localeCompare(b.name));
export const findSpecies = (id) => SPECIES.find((r) => r.id === id) || null;

export function speciesTraits(id, subraceId) {
  const race = findSpecies(id);
  if (!race) return [];
  const sub = (race.subraces || []).find((s) => s.id === subraceId) || null;
  try { return combinedRaceTraits(race, sub) || race.traits || []; } catch { return race.traits || []; }
}

// 2024 Player's Handbook subclasses (hand-curated in Tabletop Forge) first, then other books.
export function subclassGroups(cls) {
  const phb = Object.keys(SUBCLASS_FEATURES[cls] || {}).sort();
  const other = (IMPORTED_SUBCLASSES[cls] || []).filter((n) => !phb.includes(n)).sort();
  return { phb, other };
}

export function subclassesFor(cls) {
  const names = new Set([...(Object.keys(SUBCLASS_FEATURES[cls] || {})), ...(IMPORTED_SUBCLASSES[cls] || [])]);
  return [...names].sort();
}

export function classFeatures(cls, level) {
  try { return (classFeaturesFor(cls, level) || []).filter((f) => f.level <= level); } catch { return []; }
}

export function subclassFeatures(cls, sub, level) {
  if (!sub) return [];
  try { return (subclassFeaturesFor(cls, sub, level) || []).filter((f) => f.level <= level); } catch { return []; }
}

export function subclassBlurb(cls, sub) {
  try { return subclassEntry(cls, sub)?.blurb || ''; } catch { return ''; }
}

export const BACKGROUNDS = BACKGROUNDS_2024;
export const findBackground = (id) => BACKGROUNDS.find((b) => b.id === id) || null;
export const skillLabel = (key) => (SKILL_LABELS?.[key] ? String(SKILL_LABELS[key]).replace(/ \([A-Z]{3}\)$/, '') : key.replace(/^skill_/, '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()));

export const FEATS = FEATS_2024;
export const findFeat = (id) => FEATS.find((f) => f.id === id) || null;

export { CLASSES };

const FIREARM = /pistol|revolver|rifle|shotgun|musket|gun|cannon|launcher|minigun|railgun|caster/i;
export function weaponCategory(item) {
  if (item.weapon_category) return item.weapon_category;
  const w = WEAPONS.find((x) => x.name.toLowerCase() === String(item.name || '').toLowerCase().replace(/ \+\d$/, ''));
  if (w) return w.category;
  if (FIREARM.test(item.name || '')) return 'Firearms';
  return 'Improvised';
}

// Tabletop Forge's class resource counters (Second Wind, Wild Shape, Rage, Ki…),
// for every class the crawler has, each at its own level (capped at 20).
export function classResources(st, d) {
  const names = d.classNames;
  if (!names.length) return [];
  const lv = (c) => Math.min(20, d.classes[c].level);
  const creature = {
    char_class: names[0], char_subclass: d.classes[names[0]].subclass || '', char_level: lv(names[0]),
    multiclasses: names.slice(1).map((c) => ({ class: c, subclass: d.classes[c].subclass || '', level: lv(c) })),
    strength: st.scores.STR, dexterity: st.scores.DEX, constitution: st.scores.CON,
    intelligence: st.scores.INT, wisdom: st.scores.WIS, charisma: st.scores.CHA,
    proficiency_bonus: d.pb, inventory: st.inventory, spells: [],
  };
  try { return resourcesForCreature(creature) || []; } catch { return []; }
}

export { wildShapeCrCap, wildShapeTempHp };
