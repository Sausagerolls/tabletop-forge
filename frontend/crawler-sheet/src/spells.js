// The Tabletop Forge spell library, loaded once per server, and the copy of a
// spell that goes into a crawler's tome.
import { api } from './api.js';
import { spellCapacityFor, learnableSpellsFor } from '@ttf/data/classes.js';

const cache = new Map();
export function loadSpells(conn) {
  const key = `${conn.server}|${conn.session || ''}`;
  if (!cache.has(key)) {
    const params = { role: 'player', ...(conn.session ? { sessionCode: conn.session } : {}) };
    cache.set(key, api.spells(conn.server, params).then((list) => {
      // 2024 rules: keep the 2024 printing of a spell when both editions exist.
      const best = new Map();
      for (const sp of list) { const k = sp.name.toLowerCase(); const held = best.get(k); if (!held || (sp.edition === '2024' && held.edition !== '2024')) best.set(k, sp); }
      return [...best.values()].map((sp) => ({ ...sp, level: Number(sp.level) || 0 })).sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
    }).catch((e) => { cache.delete(key); throw e; }));
  }
  return cache.get(key);
}

export const onList = (sp, cls) => String(sp.allowed_classes || '').includes(cls);
export const isRitual = (sp) => /\britual\b/i.test(`${sp.casting_time || ''} ${sp.description || ''}`.slice(0, 400));

const KEEP = ['id', 'name', 'level', 'school', 'casting_time', 'range_area', 'duration', 'attack_save', 'save_ability', 'damage_entries',
  'description', 'comp_v', 'comp_s', 'comp_m', 'comp_m_text', 'allowed_classes'];
export function snapSpell(sp) {
  const out = Object.fromEntries(KEEP.map((k) => [k, sp[k]]));
  out.level = Number(sp.level) || 0;
  return out;
}

// ── What each class lets you learn ────────────────────────────────────────
// Class spells are tome spells learned from the class list (rules/tome-magic.md):
// as many as the class table's Cantrips and Prepared Spells columns.

// Eldritch Knight and Arcane Trickster (2024): prepared spells and cantrips by class level.
const THIRD_PREPARED = [0, 0, 3, 4, 4, 4, 5, 6, 6, 7, 8, 8, 9, 10, 10, 11, 11, 11, 12, 13];
const isThird = (cls, sub) => (cls === 'Fighter' && /eldritch knight/i.test(sub || '')) || (cls === 'Rogue' && /arcane trickster/i.test(sub || ''));

export function classSpellAllowance(st, d) {
  return d.classNames.map((cls) => {
    const sub = d.classes[cls].subclass;
    const lv = Math.min(20, d.classes[cls].level);
    let cap = null;
    try { cap = spellCapacityFor(cls, lv); } catch { cap = null; }
    if (!cap && isThird(cls, sub) && lv >= 3) cap = { cantrips: lv >= 10 ? 3 : 2, prepared: THIRD_PREPARED[lv - 1] };
    if (!cap) return null;
    let learn = { maxLevel: 0, lists: [cls] };
    try { learn = learnableSpellsFor([{ className: cls, level: lv, subclassName: sub }]); } catch { /* keep defaults */ }
    const mine = st.spells.filter((x) => x.source === 'Class' && x.cls === cls && !x.granted);
    return {
      cls, sub, level: lv, lists: learn.lists?.length ? learn.lists : [cls], maxLevel: learn.maxLevel || 0,
      cantrips: cap.cantrips || 0, spells: cap.prepared || 0,
      cantripsKnown: mine.filter((x) => x.level === 0).length, spellsKnown: mine.filter((x) => x.level > 0).length,
    };
  }).filter(Boolean);
}
