// Centralised character-class list. The base 13 are the SRD set; plugins
// can extend the list at runtime via the `customClasses` registry. Components
// that render class dropdowns or filter checkboxes should call
// `useAllClasses()` instead of importing `BASE_CLASSES` directly so they
// pick up plugin additions live (the hook subscribes to the global registry
// version and re-renders on register/unregister).
import { useEffect, useState } from 'react';
import { registries, subscribeRegistry } from '../plugins/pluginRegistry.js';
import { CLASS_CHOICES_2024 } from '../data/classes.js';

export const BASE_CLASSES = [
  'Artificer','Barbarian','Bard','Cleric','Druid','Fighter',
  'Monk','Paladin','Ranger','Rogue','Sorcerer','Warlock','Wizard',
];

// Curated subclass list, one entry per class. Drawn from the SRD 2014 and
// SRD 2024 sets — where a subclass has different names across editions, we
// keep the cleaner one and drop the duplicate (no edition suffix). Plugins
// extend this via the `customSubclasses` registry, keyed by class name.
export const BASE_SUBCLASSES = {
  Artificer:  ['Alchemist', 'Armorer', 'Artillerist', 'Battle Smith'],
  Barbarian:  ['Path of the Berserker', 'Path of the Wild Heart', 'Path of the World Tree', 'Path of the Zealot'],
  Bard:       ['College of Dance', 'College of Glamour', 'College of Lore', 'College of Valor'],
  Cleric:     ['Knowledge Domain', 'Life Domain', 'Light Domain', 'Nature Domain', 'Tempest Domain', 'Trickery Domain', 'War Domain'],
  Druid:      ['Circle of Stars', 'Circle of the Land', 'Circle of the Moon', 'Circle of the Sea'],
  Fighter:    ['Battle Master', 'Champion', 'Eldritch Knight', 'Psi Warrior'],
  Monk:       ['Warrior of Mercy', 'Warrior of Shadow', 'Warrior of the Elements', 'Warrior of the Open Hand'],
  Paladin:    ['Oath of Devotion', 'Oath of Glory', 'Oath of the Ancients', 'Oath of Vengeance'],
  Ranger:     ['Beast Master', 'Fey Wanderer', 'Gloom Stalker', 'Hunter'],
  Rogue:      ['Arcane Trickster', 'Assassin', 'Soulknife', 'Thief'],
  Sorcerer:   ['Aberrant Sorcery', 'Clockwork Sorcery', 'Draconic Sorcery', 'Wild Magic Sorcery'],
  Warlock:    ['Archfey Patron', 'Celestial Patron', 'Fiend Patron', 'Great Old One Patron'],
  Wizard:     ['Abjurer', 'Diviner', 'Evoker', 'Illusionist'],
};

// SRD-canonical hit-die per class. Custom classes (added via the
// custom-classes plugin) fall back to d8, the SRD majority.
export const HIT_DIE_BY_CLASS = {
  Barbarian: 'd12',
  Fighter: 'd10', Paladin: 'd10', Ranger: 'd10',
  Artificer: 'd8', Bard: 'd8', Cleric: 'd8', Druid: 'd8',
  Monk: 'd8',     Rogue: 'd8',  Warlock: 'd8',
  Sorcerer: 'd6', Wizard: 'd6',
};

export function hitDieFor(className) {
  if (!className) return null;
  return HIT_DIE_BY_CLASS[className] || 'd8';
}

// Compute the merged hit-dice pool for a player character. Same-die
// classes stack into one row (Cleric 3 + Druid 2 → 5d8), different
// dice get separate rows ordered d12 → d4. Returns null for non-PCs
// since their hit dice are stat-block manual entries, not derived.
const HIT_DIE_ORDER = ['d12', 'd10', 'd8', 'd6', 'd4'];
export function computeHitDicePool(creature) {
  if (!creature || !creature.is_player_character) return null;
  const merged = new Map();
  if (creature.char_class) {
    const die = hitDieFor(creature.char_class);
    const lvl = Math.max(1, Number(creature.char_level) || 1);
    if (die) merged.set(die, (merged.get(die) || 0) + lvl);
  }
  const mcs = Array.isArray(creature.multiclasses) ? creature.multiclasses : [];
  for (const mc of mcs) {
    if (!mc?.class) continue;
    const die = hitDieFor(mc.class);
    const lvl = Math.max(1, Number(mc.level) || 1);
    if (die) merged.set(die, (merged.get(die) || 0) + lvl);
  }
  return Array.from(merged.entries())
    .sort((a, b) => HIT_DIE_ORDER.indexOf(a[0]) - HIT_DIE_ORDER.indexOf(b[0]))
    .map(([type, qty]) => ({ type, qty }));
}

// "3d10 + 2d6" style summary string for stat-block readouts.
export function formatHitDicePool(pool) {
  if (!Array.isArray(pool) || pool.length === 0) return '';
  return pool.map(p => `${p.qty}${p.type}`).join(' + ');
}

// Returns base + every plugin's contribution, de-duplicated case-insensitively
// while preserving the first occurrence's casing. Base classes always come
// first in their canonical order; plugin additions are appended in the order
// plugins registered them.
export function getAllClasses() {
  const seen = new Map(); // lowercase → display-cased name
  for (const c of BASE_CLASSES) seen.set(c.toLowerCase(), c);
  for (const list of registries.customClasses.values()) {
    if (!Array.isArray(list)) continue;
    for (const raw of list) {
      const name = String(raw || '').trim();
      if (!name) continue;
      const k = name.toLowerCase();
      if (!seen.has(k)) seen.set(k, name);
    }
  }
  return Array.from(seen.values());
}

// React hook — re-renders the calling component whenever any plugin
// registers, unregisters, or notifies the registry.
export function useAllClasses() {
  const [, setV] = useState(0);
  useEffect(() => subscribeRegistry(() => setV(n => n + 1)), []);
  return getAllClasses();
}

// Returns the subclass list for a given class name (base + plugin
// contributions for that class), de-duplicated case-insensitively.
// Returns [] when the class is unknown or has no subclasses defined.
export function getAllSubclasses(charClass) {
  if (!charClass) return [];
  const seen = new Map(); // lowercase → display
  const base = BASE_SUBCLASSES[charClass];
  if (Array.isArray(base)) {
    for (const s of base) seen.set(String(s).toLowerCase(), s);
  }
  // Plugin-supplied subclasses are stored as { [className]: string[] }.
  // Match the key case-insensitively so a plugin-added class "Blood Hunter"
  // matches its subclasses regardless of capitalisation drift.
  const ccLower = String(charClass).toLowerCase();
  for (const map of registries.customSubclasses.values()) {
    if (!map || typeof map !== 'object') continue;
    for (const [k, list] of Object.entries(map)) {
      if (k.toLowerCase() !== ccLower) continue;
      if (!Array.isArray(list)) continue;
      for (const raw of list) {
        const name = String(raw || '').trim();
        if (!name) continue;
        const lk = name.toLowerCase();
        if (!seen.has(lk)) seen.set(lk, name);
      }
    }
  }
  return Array.from(seen.values());
}

export function useAllSubclasses(charClass) {
  const [, setV] = useState(0);
  useEffect(() => subscribeRegistry(() => setV(n => n + 1)), []);
  return getAllSubclasses(charClass);
}

// Class-level "build choices" for a class — Cleric Divine Order,
// Fighter Weapon Mastery, Rogue Expertise, etc. Returns the merged
// list across the static SRD-2024 catalog and any plugin
// contributions for the same class. Choice ids are de-duped per
// class (first registration wins, base SRD takes priority).
export function getClassChoicesMerged(charClass, opts = {}) {
  if (!charClass) return [];
  const out = [];
  const seen = new Set();
  const push = (c) => {
    if (!c || !c.id) return;
    const k = String(c.id).toLowerCase();
    if (seen.has(k)) return;
    seen.add(k);
    out.push(c);
  };
  // Synthetic class-kit auto-choice — armor / weapon / save profs
  // from the SRD class build. For first-class, the full kit; for
  // multiclass, the per-class grants subset (e.g. Wizard MC grants
  // nothing). The picker filters synthetic entries from its UI; the
  // applier folds them into the regular adds-pipeline.
  const kitAdds = buildClassKitAdds(charClass, !!opts.multiclass);
  if (kitAdds) {
    push({
      id: 'class-kit',
      label: 'Class Kit',
      kind: 'auto',
      synthetic: true,
      adds: kitAdds,
    });
  }
  // Per-level features authored on a custom class (Origins panel →
  // Custom Classes editor). Each becomes its own auto-choice tagged
  // with at_level so the existing dueChoices filter gates it on
  // character level. Subclass-scoped features only emit when the
  // character has that subclass selected — comparison is
  // case-insensitive to dodge editor casing drift.
  for (const map of registries.customClassFeatures.values()) {
    if (!map || typeof map !== 'object') continue;
    const list = map[charClass];
    if (!Array.isArray(list)) continue;
    const subFilter = (opts.subclass || '').toLowerCase();
    for (const f of list) {
      const fSub = (f.subclass || '').toLowerCase();
      if (fSub && fSub !== subFilter) continue;
      const lvl = Math.max(1, Number(f.at_level) || 1);
      // Per-level spell grants — surface as `adds.spells` on the
      // synthetic auto-choice. CreatureForm's applyAdds already
      // handles spell entries by name; the post-apply enrichment
      // effect then back-fills school / damage / description from
      // the spell library so the player gets a full stat block.
      //
      // Spells are stored on the feature as either a plain string
      // (legacy shorthand → always prepared) or an object
      // `{ name, prepared, minLevel? }`. Both shapes are normalised
      // to objects with an explicit `prepared` flag here so the
      // downstream applyAdds pass can rely on it. `prepared`
      // defaults to true to preserve the prior behaviour.
      const spellList = Array.isArray(f.spells)
        ? f.spells
            .map((s) => (typeof s === 'string'
              ? { name: s, prepared: true }
              : { name: s.name, prepared: s.prepared !== false,
                  ...(s.minLevel != null ? { minLevel: s.minLevel } : {}) }))
            .filter((s) => s && s.name)
        : [];
      push({
        id: `custom-feature:${(f.name || 'feature').toLowerCase().replace(/\s+/g, '-')}:${lvl}`,
        label: f.name || `Feature (level ${lvl})`,
        kind: 'auto',
        synthetic: true,
        at_level: lvl,
        adds: {
          traits: [{ name: f.name || 'Feature', desc: f.desc || '', category: 'specialAbility' }],
          ...(spellList.length ? { spells: spellList } : {}),
        },
      });
    }
  }
  for (const c of (CLASS_CHOICES_2024[charClass] || [])) push(c);
  for (const map of registries.customClassChoices.values()) {
    if (!map || typeof map !== 'object') continue;
    for (const c of (map[charClass] || [])) push(c);
  }
  return out;
}

// Pulls the kit data straight off CLASS_BUILD without dragging in
// the whole module at the top of this file (avoids circulars with
// the data layer). Returns the existing `adds` shape (lowercase
// armor keys, weapons CSV-friendly) plus the new `saves` entry.
import { CLASS_BUILD } from '../data/class_build.js';
function buildClassKitAdds(charClass, isMulticlass) {
  // Static SRD entry first.
  let build = CLASS_BUILD[charClass];
  // Fallback to GM-authored class data — populated by
  // CustomClassesProvider into registries.customClassBuilds. Lets
  // homebrew classes contribute their kit (saves / armor / weapons
  // / granted languages) to the same auto-apply pipeline.
  if (!build) {
    for (const map of registries.customClassBuilds.values()) {
      if (map && typeof map === 'object' && map[charClass]) {
        build = map[charClass];
        break;
      }
    }
  }
  if (!build) return null;
  const src = isMulticlass ? (build.multiclass?.grants || {}) : build;
  const armor   = (src.armor   || []).map(a => a.toLowerCase());
  const weapons =  src.weapons || [];
  const saves   = isMulticlass ? [] : (build.saves || []);
  // Languages — only granted to first-class adopters, mirroring how
  // SRD class-language grants (Druidic) work. A multiclass take-up
  // doesn't re-grant the language. Custom-class authors expose this
  // through grantsLanguages; the SRD build entries don't carry it
  // (Druidic etc. live elsewhere on the SRD side, intentionally
  // out of scope here).
  const languages = isMulticlass ? [] : (build.grantsLanguages || []);
  if (armor.length === 0 && weapons.length === 0 && saves.length === 0 && languages.length === 0) {
    return null;
  }
  const adds = {};
  if (armor.length)     adds.armor     = armor;
  if (weapons.length)   adds.weapons   = weapons;
  if (saves.length)     adds.saves     = saves;
  if (languages.length) adds.languages = languages;
  return adds;
}

export function useClassChoices(charClass, opts) {
  const [, setV] = useState(0);
  useEffect(() => subscribeRegistry(() => setV(n => n + 1)), []);
  return getClassChoicesMerged(charClass, opts);
}
