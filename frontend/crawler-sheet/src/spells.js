// World Dungeon spells (spells/*.md, built into generated/setting.json), the
// replacement for every Player's Handbook spell a class, species or feat
// grants, spell ranks, and what each class lets you learn.
// Other-book spells still come from the Tabletop Forge library, read only.
import SETTING from './generated/setting.json';
import { api } from './api.js';
import { spellCapacityFor, learnableSpellsFor } from '@ttf/data/classes.js';
import { subclassPreparedSpells } from '@ttf/data/subclasses.js';
import { speciesTraits } from './ttf.js';
import { faithOf, boonsFor, shortName } from './faith.js';

export const WD_SPELLS = SETTING.spells;
const BY_NAME = new Map(WD_SPELLS.map((sp) => [sp.name.toLowerCase(), sp]));
export const wdSpell = (name) => BY_NAME.get(String(name || '').toLowerCase().trim()) || null;

// The World Dungeon spell that replaces a Player's Handbook spell, and the rank it starts at.
export function wdFor(name) {
  const r = SETTING.spellMap[String(name || '').toLowerCase().trim()];
  if (r) return { spell: BY_NAME.get(r.name.toLowerCase()), rank: r.rank };
  const own = wdSpell(name);
  return own ? { spell: own, rank: 1 } : null;
}
export const wdName = (name) => wdFor(name)?.spell.name || name;

// The spell list players pick from: World Dungeon spells.
export function loadSpells() {
  return Promise.resolve(WD_SPELLS);
}

// The Tabletop Forge spell library (other books, GM permission), loaded once per server.
const cache = new Map();
export function loadLibrary(conn) {
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

export const onList = (sp, cls) => (sp.classes ? sp.classes.includes(cls) : String(sp.allowed_classes || '').includes(cls));
export const isRitual = (sp) => (sp.wd ? sp.ritual : /\britual\b/i.test(`${sp.casting_time || ''} ${sp.description || ''}`.slice(0, 400)));

const KEEP = ['id', 'name', 'level', 'school', 'casting_time', 'range_area', 'duration', 'attack_save', 'save_ability', 'damage_entries',
  'description', 'comp_v', 'comp_s', 'comp_m', 'comp_m_text', 'allowed_classes', 'wd'];
// The copy of a spell kept in the tome. World Dungeon spells keep only their
// name and id: the text and rank table are read from the setting data, so
// edits to a spell reach every crawler who knows it.
export function snapSpell(sp) {
  const out = Object.fromEntries(KEEP.filter((k) => sp[k] !== undefined).map((k) => [k, sp[k]]));
  out.level = Number(sp.level) || 0;
  if (sp.wd) { delete out.description; delete out.damage_entries; }
  return out;
}
// A tome entry with the World Dungeon spell's current text filled in.
export function withData(sp) {
  if (!sp.wd) return sp;
  const data = BY_NAME.get(sp.name.toLowerCase());
  if (!data) return sp;
  const { replaces, ...rest } = data; // a tome entry's `replaces` is the one original it was granted for
  return { ...rest, ...sp, description: data.description, ranks: data.ranks, note: data.note };
}

// ── Ranks (rules/tome-magic.md, Spell Ranks) ─────────────────────────────
export const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V'];
export const RANK_GATE = [0, 1, 3, 5, 9, 13]; // character level each rank needs
export const gateRank = (level) => (level >= 13 ? 5 : level >= 9 ? 4 : level >= 5 ? 3 : level >= 3 ? 2 : 1);
export const cantripMin = (level) => (level >= 17 ? 4 : level >= 11 ? 3 : level >= 5 ? 2 : 1);
// The rank a spell works at now: its stored rank within the gate, never below a
// granted starting rank, and never below a cantrip's minimum for your level.
export function effRank(sp, level) {
  const stored = sp.rank || 1;
  if (!sp.wd) return stored;
  let r = Math.max(sp.minRank || 1, Math.min(stored, gateRank(level)));
  if (sp.level === 0) r = Math.max(r, cantripMin(level));
  return Math.min(5, r);
}

// ── What each class lets you learn ────────────────────────────────────────
// Class spells are tome spells learned from the class's World Dungeon list:
// as many as the class table's Cantrips and Prepared Spells columns.

// Eldritch Knight and Arcane Trickster (2024): prepared spells and cantrips by class level.
const THIRD_PREPARED = [0, 0, 3, 4, 4, 4, 5, 6, 6, 7, 8, 8, 9, 10, 10, 11, 11, 11, 12, 13];
const isThird = (cls, sub) => (cls === 'Fighter' && /eldritch knight/i.test(sub || '')) || (cls === 'Rogue' && /arcane trickster/i.test(sub || ''));
function capacity(cls, sub, lv) {
  let cap = null;
  try { cap = spellCapacityFor(cls, lv); } catch { cap = null; }
  if (!cap && isThird(cls, sub) && lv >= 3) cap = { cantrips: lv >= 10 ? 3 : 2, prepared: THIRD_PREPARED[lv - 1] };
  return cap;
}

export function classSpellAllowance(st, d) {
  return d.classNames.map((cls) => {
    const sub = d.classes[cls].subclass;
    const lv = Math.min(20, d.classes[cls].level);
    const cap = capacity(cls, sub, lv);
    if (!cap) return null;
    let learn = { maxLevel: 0, lists: [cls] };
    try { learn = learnableSpellsFor([{ className: cls, level: lv, subclassName: sub }]); } catch { /* keep defaults */ }
    const mine = st.spells.filter((x) => x.source === 'Class' && x.cls === cls && !x.granted);
    // One Rank Up for each class level at which the class teaches spells.
    let rankUps = 0;
    for (let l = 1; l <= lv; l += 1) if ((capacity(cls, sub, l)?.prepared || 0) > 0) rankUps += 1;
    return {
      cls, sub, level: lv, lists: learn.lists?.length ? learn.lists : [cls], maxLevel: learn.maxLevel || 0,
      cantrips: cap.cantrips || 0, spells: cap.prepared || 0,
      cantripsKnown: mine.filter((x) => x.level === 0).length, spellsKnown: mine.filter((x) => x.level > 0).length,
      rankUps, rankUpsSpent: (st.rankUpsSpent || {})[cls] || 0,
    };
  }).filter(Boolean);
}

// ── Granted spells ────────────────────────────────────────────────────────
// Spells a class feature names (2024 Player's Handbook), by class level.
const CLASS_GRANTS = {
  Bard: [[20, 'Power Word Heal'], [20, 'Power Word Kill']],
  Druid: [[1, 'Speak with Animals']],
  Paladin: [[2, 'Divine Smite'], [5, 'Find Steed']],
  Ranger: [[1, "Hunter's Mark"]],
};
const SUBCLASS_GRANTS = {
  'Monk:Warrior of Shadow': [[3, 'Darkness'], [3, 'Minor Illusion']],
};
const AB = { intelligence: 'INT', wisdom: 'WIS', charisma: 'CHA' };

// Every spell the crawler's classes, subclasses and species grant by name,
// as World Dungeon spells. Each: { key, orig, spell, rank, source, cls?, sourceName?, ability?, free? }.
export function grantedSpells(st, d) {
  const out = [];
  const push = (orig, extra) => {
    const r = wdFor(orig);
    out.push({ key: `${extra.cls || extra.sourceName}:${orig}`, orig, spell: r?.spell || null, rank: r?.rank || 1, ...extra });
  };
  for (const cls of d.classNames) {
    const lv = Math.min(20, d.classes[cls].level);
    const sub = d.classes[cls].subclass || '';
    const names = [...(CLASS_GRANTS[cls] || []), ...(SUBCLASS_GRANTS[`${cls}:${sub}`] || [])].filter(([l]) => l <= lv).map(([, n]) => n);
    if (sub) { try { names.push(...subclassPreparedSpells(cls, sub, lv)); } catch { /* no table */ } }
    [...new Set(names)].forEach((n) => push(n, { source: 'Class', cls }));
  }
  if (st.speciesId) {
    const picks = st.speciesChoices || {};
    const abKey = Object.keys(picks).find((k) => k.startsWith('ability:'));
    const ability = AB[String(picks[abKey] || '').toLowerCase()] || 'CHA';
    const species = 'Species';
    const seen = new Set();
    const add = (name, level, free) => {
      const n = name.trim().replace(/\s*\(.*$/, '');
      if (!n || seen.has(n.toLowerCase()) || level > d.level) return;
      seen.add(n.toLowerCase());
      push(n, { source: 'Feature', sourceName: species, ability, ...(free ? { free: true } : {}) });
    };
    for (const t of speciesTraits(st.speciesId, st.subraceId)) {
      const desc = String(t.desc || '');
      for (const m of desc.matchAll(/Level (\d+):\s*([^.]+?)(?: cantrip)?\./g)) add(m[2], Number(m[1]), Number(m[1]) > 1);
      for (const m of desc.matchAll(/You know the ([A-Z][\w' /-]+?) cantrip/g)) add(m[1], 1, false);
      const always = desc.match(/always have the ([A-Z][\w' /-]+?) spells? prepared/);
      if (always) always[1].split(/ and |, /).forEach((n) => add(n, 1, true));
    }
  }
  // Gods module: boons that teach a spell ("You learn Patch Job and Not Today.").
  const f = faithOf(st);
  for (const b of boonsFor(f).filter((x) => x.earned)) {
    const m = b.text.match(/You learn ([^.]+?)(?:\.|, and you| In )/);
    if (!m) continue;
    m[1].split(/ and |, /).forEach((n) => push(n.trim(), { source: 'Feature', sourceName: shortName(f.god), ability: f.ability || 'WIS', free: true }));
  }
  return out;
}

// The tome entry for a granted spell.
export function grantedEntry(g) {
  const base = { ...snapSpell(g.spell), tome: true, rank: g.rank, minRank: g.rank, granted: true, grantKey: g.key, replaces: g.orig };
  return g.source === 'Class'
    ? { ...base, source: 'Class', cls: g.cls }
    : { ...base, source: 'Feature', sourceName: g.sourceName, ability: g.ability, ...(g.free && g.spell.level > 0 ? { free: true } : {}) };
}

// Add granted spells that are not in the tome yet. A grant for a spell already
// known raises it to the granted rank, or by one rank if it is already there.
export function addGranted(s, list) {
  for (const g of list) {
    if (!g.spell || (s.spells || []).some((x) => x.grantKey === g.key)) continue;
    const have = s.spells.find((x) => x.name === g.spell.name);
    if (have) {
      const r = have.rank || 1;
      have.rank = Math.min(5, r >= g.rank ? r + 1 : g.rank);
      have.minRank = Math.max(have.minRank || 1, Math.min(5, g.rank));
      have.grantKeys = [...(have.grantKeys || []), g.key];
    } else {
      s.spells.push(grantedEntry(g));
    }
  }
  return s;
}
export const grantDone = (st, g) => !g.spell || st.spells.some((x) => x.grantKey === g.key || (x.grantKeys || []).includes(g.key));
