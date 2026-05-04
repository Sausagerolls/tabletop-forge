// CustomClassesProvider — bridges the /api/custom/classes table
// into the existing in-memory registries that the rest of the app
// reads (class dropdowns, subclass dropdowns, class-build kit
// pipeline, per-level features, resource counters).
//
// Mounted near the top of the app so a single fetch on connect
// keeps every consumer live, and listens for the
// "custom-classes:changed" CustomEvent dispatched by the editor
// modal on save so newly authored classes appear without a reload.
//
// Source id is fixed (`'custom-classes-table'`) so re-runs replace
// the previous map entries cleanly. Plugins keep their own pluginId
// keyspace and aren't affected.

import { useEffect } from 'react';
import { registries, bumpRegistry } from './pluginRegistry.js';
import { _registerCustomClassBuildLookup } from '../data/class_build.js';

// Wired immediately at module load so getClassBuild() resolves
// custom classes before the React tree mounts. The lookup walks
// every registered source's map and returns the first hit.
_registerCustomClassBuildLookup((className) => {
  for (const map of registries.customClassBuilds.values()) {
    if (map && typeof map === 'object' && map[className]) return map[className];
  }
  return null;
});

const SOURCE_ID = 'custom-classes-table';

export function notifyCustomClassesChanged() {
  try { window.dispatchEvent(new CustomEvent('custom-classes:changed')); } catch {}
}

async function loadAndRegister() {
  let rows = [];
  try {
    const res = await fetch('/api/custom/classes');
    if (res.ok) {
      const j = await res.json();
      if (Array.isArray(j)) rows = j;
    }
  } catch { /* offline or 404 — leave registries empty */ }

  // ── customClasses: Array<className> ───────────────────────────
  const names = rows.map((r) => String(r.name || '').trim()).filter(Boolean);
  registries.customClasses.set(SOURCE_ID, names);

  // ── customSubclasses: { [className]: string[] } ───────────────
  const subsByClass = {};
  for (const r of rows) {
    const subs = Array.isArray(r.data?.subclasses) ? r.data.subclasses.filter(Boolean) : [];
    if (subs.length) subsByClass[r.name] = subs;
  }
  registries.customSubclasses.set(SOURCE_ID, subsByClass);

  // ── customClassBuilds: { [className]: ClassBuild } ────────────
  const buildsByClass = {};
  for (const r of rows) {
    const d = r.data || {};
    if (!d.primary && !d.hitDie) continue;
    buildsByClass[r.name] = {
      primary: d.primary || { abilities: ['STR'], mode: 'all' },
      hitDie:  d.hitDie  || 'd8',
      saves:   Array.isArray(d.saves)    ? d.saves   : [],
      armor:   Array.isArray(d.armor)    ? d.armor   : [],
      weapons: Array.isArray(d.weapons)  ? d.weapons : [],
      grantsLanguages: Array.isArray(d.grantsLanguages) ? d.grantsLanguages : [],
      startingEquipment: d.startingEquipment || { optionA: { items: [], gp: 0 }, optionB: { gp: 0 } },
      multiclass: d.multiclass || {
        prereq: { abilities: [], min: 13, mode: 'all' },
        grants: {},
      },
    };
  }
  registries.customClassBuilds.set(SOURCE_ID, buildsByClass);

  // ── customClassFeatures: { [className]: CustomFeature[] } ─────
  const featuresByClass = {};
  for (const r of rows) {
    const list = Array.isArray(r.data?.features) ? r.data.features.filter((f) => f?.name) : [];
    if (list.length) featuresByClass[r.name] = list;
  }
  registries.customClassFeatures.set(SOURCE_ID, featuresByClass);

  // ── customClassResources: { [className]: CustomResource[] } ───
  const resourcesByClass = {};
  for (const r of rows) {
    const list = Array.isArray(r.data?.resources)
      ? r.data.resources.filter((res) => res?.label || res?.id) : [];
    if (list.length) resourcesByClass[r.name] = list;
  }
  registries.customClassResources.set(SOURCE_ID, resourcesByClass);

  bumpRegistry();
}

// Mount once near the app root. Re-fetches on the
// "custom-classes:changed" CustomEvent so the editor's onSaved can
// trigger a refresh without us subscribing to its component state.
export function CustomClassesProvider() {
  useEffect(() => {
    loadAndRegister();
    const onChange = () => loadAndRegister();
    window.addEventListener('custom-classes:changed', onChange);
    return () => window.removeEventListener('custom-classes:changed', onChange);
  }, []);
  return null;
}
