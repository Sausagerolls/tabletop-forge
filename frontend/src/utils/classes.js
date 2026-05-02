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
export function getClassChoicesMerged(charClass) {
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
  for (const c of (CLASS_CHOICES_2024[charClass] || [])) push(c);
  for (const map of registries.customClassChoices.values()) {
    if (!map || typeof map !== 'object') continue;
    for (const c of (map[charClass] || [])) push(c);
  }
  return out;
}

export function useClassChoices(charClass) {
  const [, setV] = useState(0);
  useEffect(() => subscribeRegistry(() => setV(n => n + 1)), []);
  return getClassChoicesMerged(charClass);
}
