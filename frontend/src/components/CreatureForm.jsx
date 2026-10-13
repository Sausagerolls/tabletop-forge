import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import LanguagePicker from './LanguagePicker.jsx';
import ImageFramer from './ImageFramer.jsx';
import EditionTag from './EditionTag.jsx';
import TokenEditorModal from './TokenEditorModal.jsx';
import { useAllClasses, useAllSubclasses, useClassChoices, computeHitDicePool, formatHitDicePool, hitDieFor,
  normalizeHitDicePool, parseHitDiceString, formatHitDiceFormula, clampHitDiceUsed } from '../utils/classes.js';
import HitDiceEditor from './HitDiceEditor.jsx';
import { getClassBuild, formatPrimaryAbility, startingEquipmentOptions } from '../data/class_build.js';
import { expandWeaponProficiency } from '../data/weapons.js';
import { formatDamageWithMod, formatDamageType, weaponDamageModes, damageParts, weaponStatOptions, bestWeaponStat, weaponDamageMod } from '../utils/damage.js';
import { subclassEntry, subclassPreparedSpells, subclassLearnableSpells, wildShapeCrCap, wildShapeTempHp, classEntry } from '../data/subclasses.js';
import { formatSizeType } from '../utils/creature.js';
import { featureSkillBonuses, featureCantripBonus } from '../utils/skills.js';
import { maxHitPoints } from '../utils/hitPoints.js';
import { computeAcFromGear, naturalArmorOf } from '../utils/armorClass.js';
import { SPELL_TYPES, SPELL_TYPE_KEYS, spellType } from '../utils/spellTypes.js';
import { SpellBox } from './StatBlock.jsx';
import {
  RACE_EDITIONS,
  racesForEdition,
  editionLabel,
  findRace,
  combinedRaceTraits,
} from '../data/races.js';
import { BACKGROUNDS_2024, SKILL_LABELS, toolChoicesFor } from '../data/backgrounds.js';
import { FEATS_2024, FEAT_CATEGORIES } from '../data/feats.js';
import { resourcesForCreature } from '../data/resources.js';
import { spellCapacityTotals, learnableSpellsFor, spellSlotsForCreature, pactMagicForCreature } from '../data/classes.js';
import socket from '../socket.js';
import ClassChoicesPicker from './ClassChoicesPicker.jsx';
import ItemStatsEditor from './ItemStatsEditor.jsx';
import { optionGroupsForClass } from '../data/class_options.js';
import { extraOptionGroupsForClass } from '../data/class_options_extra.js';
import { IMPORTED_BACKGROUNDS, ALL_ABILITY_FIELDS, affectedAbilities } from '../data/backgrounds_imported.js';
import MulticlassRow from './MulticlassRow.jsx';

const XIcon = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" className="w-3.5 h-3.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>);
const DragonIcon = () => (<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10 text-gray-500"><path d="M44 12c4-2 8 0 10 4s0 10-4 12l-4 2" /><path d="M20 12c-4-2-8 0-10 4s0 10 4 12l4 2" /><ellipse cx="32" cy="32" rx="14" ry="10" fill="currentColor" stroke="none" opacity="0.15" /><path d="M18 28c0 10 6 18 14 18s14-8 14-18" /><path d="M26 24c0-2 2-4 6-4s6 2 6 4" /><circle cx="27" cy="26" r="1.5" fill="currentColor" stroke="none" /><circle cx="37" cy="26" r="1.5" fill="currentColor" stroke="none" /><path d="M28 36c1 2 3 3 4 3s3-1 4-3" /></svg>);
const SwordIcon = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 inline mr-1"><path d="M14.5 17.5L3 6V3h3l11.5 11.5" /><path d="M13 19l6-6" /><path d="M2 2l5.5 5.5" /><path d="M17 17l4 4" /></svg>);
const CrossIcon = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 inline mr-1"><path d="M12 4v16" /><path d="M4 12h16" /></svg>);
const OrbIcon = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 inline mr-1"><circle cx="12" cy="12" r="9" /><path d="M12 3c-2 3-3 6-3 9s1 6 3 9" /><path d="M12 3c2 3 3 6 3 9s-1 6-3 9" /><path d="M3 12h18" /></svg>);
const LightbulbIcon = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 inline mr-1"><path d="M9 21h6" /><path d="M12 3a6 6 0 0 1 6 6c0 2.2-1.2 4.2-3 5.4V18H9v-3.6C7.2 13.2 6 11.2 6 9a6 6 0 0 1 6-6z" /></svg>);

const CR_VALUES = [
  '0','1/8','1/4','1/2','1','2','3','4','5','6','7','8','9','10',
  '11','12','13','14','15','16','17','18','19','20','21','22','23','24','25','26','27','28','29','30',
];

const CR_XP = {
  '0':0,'1/8':25,'1/4':50,'1/2':100,'1':200,'2':450,'3':700,'4':1100,'5':1800,
  '6':2300,'7':2900,'8':3900,'9':5000,'10':5900,'11':7200,'12':8400,'13':10000,
  '14':11500,'15':13000,'16':15000,'17':18000,'18':20000,'19':22000,'20':25000,
  '21':33000,'22':41000,'23':50000,'24':62000,'25':75000,'26':90000,'27':105000,
  '28':120000,'29':135000,'30':155000,
};

const CREATURE_TYPES = [
  'Aberration','Beast','Celestial','Construct','Dragon','Elemental','Fey','Fiend',
  'Giant','Humanoid','Monstrosity','Ooze','Plant','Undead',
];

const SIZES = ['tiny','small','medium','large','huge','gargantuan'];
// Suggestions only — the field accepts anything.
const PRONOUN_SUGGESTIONS = ['she/her', 'he/him', 'they/them', 'she/they', 'he/they', 'it/its'];
const SIZE_LABELS = { tiny:'Tiny',small:'Small',medium:'Medium',large:'Large',huge:'Huge',gargantuan:'Gargantuan' };

const ALIGNMENTS = [
  'Lawful Good','Neutral Good','Chaotic Good',
  'Lawful Neutral','True Neutral','Chaotic Neutral',
  'Lawful Evil','Neutral Evil','Chaotic Evil','Unaligned',
];

const SKILLS = [
  { key: 'skill_acrobatics', label: 'Acrobatics', stat: 'dexterity' },
  { key: 'skill_animal_handling', label: 'Animal Handling', stat: 'wisdom' },
  { key: 'skill_arcana', label: 'Arcana', stat: 'intelligence' },
  { key: 'skill_athletics', label: 'Athletics', stat: 'strength' },
  { key: 'skill_deception', label: 'Deception', stat: 'charisma' },
  { key: 'skill_history', label: 'History', stat: 'intelligence' },
  { key: 'skill_insight', label: 'Insight', stat: 'wisdom' },
  { key: 'skill_intimidation', label: 'Intimidation', stat: 'charisma' },
  { key: 'skill_investigation', label: 'Investigation', stat: 'intelligence' },
  { key: 'skill_medicine', label: 'Medicine', stat: 'wisdom' },
  { key: 'skill_nature', label: 'Nature', stat: 'intelligence' },
  { key: 'skill_perception', label: 'Perception', stat: 'wisdom' },
  { key: 'skill_performance', label: 'Performance', stat: 'charisma' },
  { key: 'skill_persuasion', label: 'Persuasion', stat: 'charisma' },
  { key: 'skill_religion', label: 'Religion', stat: 'intelligence' },
  { key: 'skill_sleight_of_hand', label: 'Sleight of Hand', stat: 'dexterity' },
  { key: 'skill_stealth', label: 'Stealth', stat: 'dexterity' },
  { key: 'skill_survival', label: 'Survival', stat: 'wisdom' },
];

const SAVES = [
  { key: 'save_str', label: 'STR', stat: 'strength' },
  { key: 'save_dex', label: 'DEX', stat: 'dexterity' },
  { key: 'save_con', label: 'CON', stat: 'constitution' },
  { key: 'save_int', label: 'INT', stat: 'intelligence' },
  { key: 'save_wis', label: 'WIS', stat: 'wisdom' },
  { key: 'save_cha', label: 'CHA', stat: 'charisma' },
];

function mod(score) {
  return Math.floor((score - 10) / 2);
}

// Collapse spells that share a name.
//
// applyAdds already refuses to add a granted spell the sheet has, but sheets
// edited across many sessions still carry pairs from before that guard, and a
// duplicate reads as a bug to the player: the same cantrip listed twice, one
// prepared and one not. The richer row wins (the one enriched from the
// library, which has school/description/components), and `prepared` is kept if
// EITHER copy was prepared, so collapsing never silently unprepares a spell.
function dedupeSpells(list) {
  const out = [];
  const byName = new Map();
  for (const sp of Array.isArray(list) ? list : []) {
    const key = String(sp?.name || '').trim().toLowerCase();
    if (!key) { out.push(sp); continue; }
    const seen = byName.get(key);
    if (!seen) {
      byName.set(key, sp);
      out.push(sp);
      continue;
    }
    const richer = Object.keys(sp).length > Object.keys(seen).length ? sp : seen;
    const merged = { ...seen, ...richer, prepared: !!(sp.prepared || seen.prepared) };
    out[out.indexOf(seen)] = merged;
    byName.set(key, merged);
  }
  return out;
}

// computeAcFromGear / hasFightingStyle live in utils/armorClass.js — the
// player's phone recomputes AC on equip too, and two copies of that
// arithmetic is how the two screens drift apart.

function fmtMod(m) {
  return m >= 0 ? `+${m}` : `${m}`;
}

const SKILL_EXPERTISE_KEYS = [
  'skill_acrobatics','skill_animal_handling','skill_arcana','skill_athletics',
  'skill_deception','skill_history','skill_insight','skill_intimidation',
  'skill_investigation','skill_medicine','skill_nature','skill_perception',
  'skill_performance','skill_persuasion','skill_religion','skill_sleight_of_hand',
  'skill_stealth','skill_survival',
];

// Druid level for the temp-HP readout below — the DRUID portion only, matching
// what the server grants on a shift. Mirrors druidLevelOf() in the backend.
export function druidLevelOfForm(form) {
  if (!form) return 0;
  let level = 0;
  if (String(form.char_class || '').toLowerCase() === 'druid') {
    level += Math.max(1, Number(form.char_level) || 1);
  }
  for (const mc of (Array.isArray(form.multiclasses) ? form.multiclasses : [])) {
    if (String(mc?.class || '').toLowerCase() === 'druid') {
      level += Math.max(1, Number(mc.level) || 1);
    }
  }
  return level || Math.max(1, Number(form.char_level) || 1);
}

// How many spells this character may have prepared, and how many cantrips they
// know, against how many they've actually got.
//
// Always-prepared spells — domain spells, feat and lineage grants — are
// excluded from the "used" count, because the rules don't charge them against
// the limit. Those arrive from applyAdds carrying a `__source` tag, which is
// what separates them from spells the player chose.
//
// Renders nothing for a non-caster, or for a class whose table isn't covered
// (see spellCapacityFor) — showing no allowance is better than showing a made
// up one.
// The sheet's classes as { className, subclassName, level } — the shape the
// data/classes.js helpers take. Main class first, then each multiclass row.
function classEntriesOf(form) {
  const entries = [];
  if (form?.char_class) {
    entries.push({
      className: form.char_class,
      subclassName: form.char_subclass || '',
      level: Math.max(1, Number(form.char_level) || 1),
    });
  }
  for (const mc of (Array.isArray(form?.multiclasses) ? form.multiclasses : [])) {
    if (mc?.class) {
      entries.push({
        className: mc.class,
        subclassName: mc.subclass || '',
        level: Math.max(1, Number(mc.level) || 1),
      });
    }
  }
  return entries;
}

function SpellCapacityBar({ form }) {
  const cap = useMemo(
    () => {
      const base = spellCapacityTotals(classEntriesOf(form));
      if (!base) return base;
      // A class choice can widen the allowance — Primal Order (Magician) is
      // one extra Druid cantrip — and that is not in any class table.
      const extra = featureCantripBonus(form);
      return extra ? { ...base, cantrips: base.cantrips + extra, cantripExtra: extra } : base;
    },
    [form?.char_class, form?.char_subclass, form?.char_level, form?.multiclasses,
      form?.class_state],
  );

  const counts = useMemo(() => {
    const list = Array.isArray(form?.spells) ? form.spells : [];
    // A granted spell is one the character didn't choose. `__source` is set by
    // applyAdds; `always_prepared` covers anything hand-flagged on the sheet.
    const chosen = list.filter((sp) => !sp.__source && !sp.always_prepared);
    return {
      prepared: chosen.filter((sp) => Number(sp.level) > 0 && sp.prepared).length,
      cantrips: chosen.filter((sp) => Number(sp.level) === 0).length,
      granted:  list.length - chosen.length,
    };
  }, [form?.spells]);

  if (!cap) return null;

  const Row = ({ label, used, limit, hint, note }) => {
    if (!limit) return null;
    const over = used > limit;
    const left = limit - used;
    return (
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="text-gray-400">
          {label}
          {note ? <span className="block text-[10px] text-gray-500">{note}</span> : null}
        </span>
        <span className="flex items-center gap-2">
          <span className={over ? 'text-red-400 font-semibold' : 'text-gray-200'}>
            {used} / {limit}
          </span>
          <span className={over ? 'text-red-400' : left === 0 ? 'text-gray-500' : 'text-dnd-gold'}>
            {over ? `${used - limit} over` : left === 0 ? 'full' : `${left} to ${hint}`}
          </span>
        </span>
      </div>
    );
  };

  return (
    <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-3 space-y-1.5">
      <div className="text-sm font-semibold text-dnd-gold">Spell Allowance</div>
      <Row label="Prepared spells" used={counts.prepared} limit={cap.prepared} hint="prepare" />
      <Row label="Cantrips known"  used={counts.cantrips} limit={cap.cantrips} hint="learn"
        note={cap.cantripExtra ? `includes ${cap.cantripExtra} from a class feature` : ''} />
      <p className="text-[11px] text-gray-500 leading-snug pt-0.5">
        {counts.granted > 0
          ? `${counts.granted} always-prepared ${counts.granted === 1 ? 'spell' : 'spells'} from your subclass, feats or lineage ${counts.granted === 1 ? 'is' : 'are'} not counted — those don't use up your allowance.`
          : "Always-prepared spells from a subclass, feat or lineage don't count against these."}
        {cap.uncovered.length > 0 && ` Not counting ${[...new Set(cap.uncovered)].join(', ')} — no spell table for ${cap.uncovered.length === 1 ? 'it' : 'them'}.`}
      </p>
    </div>
  );
}

// Subclass feature reference. Read-only by design: it shows what the chosen
// subclass grants at this level, and offers a one-click copy into the sheet's
// own Class Features list so the player can edit or annotate their copy
// without the reference text drifting.
// Shared renderer for a level-gated feature list — used for both the class's
// own progression and the chosen subclass, so the two always look and behave
// the same.
function FeatureProgression({ title, entry, level, existingNames, onAppendFeatures, preparedSpells }) {
  if (!entry) return null;
  const unlocked = (entry.features || []).filter((f) => f.level <= level);
  const upcoming = (entry.features || []).filter((f) => f.level > level);
  const have = new Set((existingNames || []).map((n) => String(n || '').trim().toLowerCase()));
  const missing = unlocked.filter((f) => !have.has(f.name.trim().toLowerCase()));

  return (
    <div className="bg-gray-800 rounded-lg p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-dnd-gold">{title}</h4>
          <p className="text-[11px] text-gray-500 leading-snug">{entry.blurb}</p>
        </div>
        {missing.length > 0 && (
          <button
            type="button"
            onClick={() => onAppendFeatures(missing.map((f) => ({ name: f.name, desc: f.desc })))}
            className="text-xs px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-200 shrink-0"
            title="Copy these into this character's Class Features list"
          >
            + Add {missing.length} to sheet
          </button>
        )}
      </div>

      <div className="space-y-1.5">
        {unlocked.map((f) => (
          <details key={`${f.level}-${f.name}`} className="bg-gray-900/60 rounded border border-gray-700">
            <summary className="cursor-pointer px-2 py-1.5 text-xs text-gray-200 flex items-center gap-2">
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-900/60 text-emerald-300 shrink-0">
                L{f.level}
              </span>
              <span className="truncate">{f.name}</span>
            </summary>
            <p className="px-2 pb-2 text-[11px] text-gray-400 whitespace-pre-wrap leading-relaxed">{f.desc}</p>
          </details>
        ))}
        {upcoming.length > 0 && (
          <p className="text-[11px] text-gray-600 px-1">
            Later: {upcoming.map((f) => `${f.name} (L${f.level})`).join(', ')}
          </p>
        )}
      </div>

      {preparedSpells?.length > 0 && (
        <p className="text-[11px] text-gray-400">
          <span className="text-gray-500">Always prepared: </span>{preparedSpells.join(', ')}
        </p>
      )}

      {Array.isArray(entry.notes) && entry.notes.length > 0 && (
        <ul className="text-[11px] text-gray-500 list-disc pl-4 space-y-0.5">
          {entry.notes.map((n, i) => <li key={i}>{n}</li>)}
        </ul>
      )}
    </div>
  );
}

// Add class/subclass features to the sheet, applying any stat they grant.
//
// A feature that raises an ability by itself — a Barbarian's Primal Champion
// is +4 Strength and +4 Constitution — should land on the numbers the moment
// the character has it, with nothing for the player to choose. Features carry
// that as `abilities: [{ ability, bonus }]`.
//
// Which features qualify is hand-checked in class-data/import_5etools_classes.py
// and deliberately NOT parsed out of the rules text: a wrong guess here writes
// a wrong number onto a character sheet, which is worse than writing none.
//
// The grant is stamped onto the stored feature as `__applied_abilities` so it
// is traceable on the sheet — removing the feature does not take the bonus
// back off again, which is a gap worth knowing about.
// Collapse a sense list to one entry per type, keeping the longest range.
// Used where a race and its sub-race both grant the same sense.
function dedupeSenses(list) {
  const best = new Map();
  for (const s of (list || [])) {
    if (!s || !s.type) continue;
    const cur = best.get(s.type);
    if (!cur || (Number(s.range) || 0) > (Number(cur.range) || 0)) best.set(s.type, s);
  }
  return Array.from(best.values());
}

// A background's equipment, in one shape whatever it came from.
//
// The curated entries model "package A or B"; the imported ones model "a base
// kit everyone gets, plus a choice between alternatives" — which is what the
// books actually say, and what lets Charlatan offer all four of its options
// instead of the two an A/B split could hold.
function bgEquipmentModel(bg) {
  if (!bg) return { base: { items: [], gp: 0, sp: 0, cp: 0 }, options: [] };
  if (bg.equipment_base || bg.equipment_options) {
    return {
      base: bg.equipment_base || { items: [], gp: 0, sp: 0, cp: 0 },
      options: bg.equipment_options || [],
    };
  }
  // Curated shape: A is items plus gold, B is the gold alternative.
  const options = [];
  const aItems = bg.equipment_a_items || [];
  const aGp = Number(bg.equipment_a_gp) || 0;
  const bGp = Number(bg.equipment_b_gp) || 0;
  if (aItems.length || aGp) {
    options.push({
      id: 'a', items: aItems, gp: aGp, sp: 0, cp: 0,
      label: [...aItems.map((i) => `${i.name}${i.qty > 1 ? ` ×${i.qty}` : ''}`),
        ...(aGp ? [`${aGp} GP`] : [])].join(', '),
    });
  }
  if (bGp) {
    options.push({ id: 'b', items: [], gp: bGp, sp: 0, cp: 0, label: `${bGp} GP` });
  }
  return { base: { items: [], gp: 0, sp: 0, cp: 0 }, options };
}

const STAT_BY_ABIL = {
  STR: 'strength', DEX: 'dexterity', CON: 'constitution',
  INT: 'intelligence', WIS: 'wisdom', CHA: 'charisma',
};

// Add or subtract a feature's ability grants. `sign` is +1 when the feature
// arrives and -1 when it goes, so the two directions cannot drift apart —
// they are the same arithmetic read once.
export function applyAbilityDelta(obj, grants, sign) {
  if (!Array.isArray(grants) || !grants.length) return obj;
  const next = { ...obj };
  for (const ab of grants) {
    const field = STAT_BY_ABIL[String(ab?.ability || '').toUpperCase()];
    const amt = Number(ab?.bonus) || 0;
    if (!field || !amt) continue;
    next[field] = (Number(next[field]) || 10) + sign * amt;
  }
  return next;
}

function appendFeaturesWithGrants(f, items) {
  const list = Array.isArray(items) ? items : [];
  // Stamped as it goes on, which is what makes the removal exact: the sheet
  // does not have to work out later what a feature was worth, it reads back
  // what it actually applied.
  const stamped = list.map((it) => (
    it?.abilities?.length ? { ...it, __applied_abilities: it.abilities } : it
  ));
  let next = { ...f, class_features: [...(f.class_features || []), ...stamped] };
  for (const it of stamped) {
    next = applyAbilityDelta(next, it.__applied_abilities, +1);
  }
  return next;
}

function ClassFeatures({ form, onAppendFeatures }) {
  const entry = classEntry(form.char_class);
  if (!entry) return null;
  return (
    <FeatureProgression
      title={`${form.char_class} features`}
      entry={entry}
      level={Math.max(1, Number(form.char_level) || 1)}
      existingNames={(form.class_features || []).map((f) => f?.name)}
      onAppendFeatures={onAppendFeatures}
    />
  );
}

function SubclassFeatures({ form, onAppendFeatures }) {
  const entry = subclassEntry(form.char_class, form.char_subclass);
  if (!entry) return null;
  const level = Math.max(1, Number(form.char_level) || 1);
  return (
    <FeatureProgression
      title={form.char_subclass}
      entry={entry}
      level={level}
      existingNames={(form.class_features || []).map((f) => f?.name)}
      onAppendFeatures={(items) => onAppendFeatures(
        items.map((it) => ({ ...it, subclass: form.char_subclass }))
      )}
      preparedSpells={subclassPreparedSpells(form.char_class, form.char_subclass, level)}
    />
  );
}

// Feat picker. Feats are stored on the sheet as free-text {name, desc} rows,
// so this writes the same shape a hand-typed feat would — the catalogue is a
// convenience, not a separate system. Feats above the character's level are
// shown but not selectable, so a player can see what's coming.
function FeatPickerModal({ level, existing, onAdd, onClose }) {
  const [category, setCategory] = useState('origin');
  const [search, setSearch] = useState('');
  const have = new Set((existing || []).map((f) => String(f?.name || '').trim().toLowerCase()));
  const q = search.trim().toLowerCase();

  const shown = FEATS_2024.filter((f) => f.category === category)
    .filter((f) => !q || f.name.toLowerCase().includes(q) || f.desc.toLowerCase().includes(q));

  return (
    <div className="fixed inset-0 bg-black/70 z-[90] flex items-center justify-center p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-2xl flex flex-col shadow-2xl"
        style={{ maxHeight: '85vh' }}
      >
        <div className="px-4 py-3 border-b border-gray-700">
          <div className="text-lg font-semibold text-gray-100">Add a feat</div>
          <div className="text-[11px] text-gray-500">Character level {level}. Feats you can't take yet are dimmed.</div>
        </div>

        <div className="px-4 py-2 border-b border-gray-800 flex items-center gap-2">
          {FEAT_CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategory(c.id)}
              title={c.hint}
              className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                category === c.id ? 'bg-amber-700 text-amber-50' : 'text-gray-400 hover:text-white border border-gray-700'
              }`}
            >
              {c.label}
            </button>
          ))}
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search feats…"
            className="ml-auto flex-1 max-w-[220px] bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-100 outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {shown.length === 0 && (
            <p className="text-xs text-gray-500 px-1 py-3">No feats match.</p>
          )}
          {shown.map((f) => {
            const owned = have.has(f.name.trim().toLowerCase());
            const tooLow = level < f.minLevel;
            return (
              <details key={f.id} className={`bg-gray-800/60 rounded border border-gray-700 ${tooLow ? 'opacity-50' : ''}`}>
                <summary className="cursor-pointer px-3 py-2 flex items-center gap-2">
                  <span className="text-sm text-gray-100 flex-1 truncate">{f.name}</span>
                  {f.prereq && <span className="text-[10px] text-gray-500 truncate">{f.prereq}</span>}
                  {owned ? (
                    <span className="text-[11px] text-emerald-400 shrink-0">on sheet</span>
                  ) : (
                    <button
                      type="button"
                      disabled={tooLow}
                      onClick={(e) => { e.preventDefault(); onAdd({ name: f.name, desc: f.desc }); }}
                      className="text-[11px] px-2 py-1 rounded bg-amber-700 hover:bg-amber-600 disabled:bg-gray-700 disabled:text-gray-500 text-amber-50 shrink-0"
                    >
                      Add
                    </button>
                  )}
                </summary>
                <p className="px-3 pb-2 text-[11px] text-gray-400 whitespace-pre-wrap leading-relaxed">{f.desc}</p>
              </details>
            );
          })}
        </div>

        <div className="px-4 py-3 border-t border-gray-700 flex justify-end">
          <button type="button" onClick={onClose} className="text-xs px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 text-gray-100">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

// GM-curated Wild Shape list. Deliberately not rule-derived: homebrew beasts,
// Circle-specific forms and "I'll allow it" cases all just work, and the GM
// stays the authority on what's available. The server re-checks this list on
// every shift, so it's a permission list rather than a UI convenience.
// Companions bound to a character — the owl a wizard HAS, rather than the owl
// that happens to be standing on the current map.
//
// Written straight to the server as you edit rather than collected into the form
// and saved with it. Two reasons: the binding lives in its own table (a token is
// not the thing being edited here), and a player may be looking at their sheet on
// their phone at the same time, where a summon button appears the moment a
// companion is bound. A "Save" they never pressed is not something to make them
// wait for.
function BoundCompanions({ creatureId, ownerName }) {
  const KINDS = ['familiar', 'companion', 'summon', 'mount', 'duplicate'];
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [picking, setPicking] = useState(false);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);

  const load = useCallback(() => {
    if (!creatureId) return;
    setLoading(true);
    fetch(`/api/creatures/${creatureId}/companions`)
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => setRows(Array.isArray(list) ? list : []))
      .catch(() => setError('Could not read the companions.'))
      .finally(() => setLoading(false));
  }, [creatureId]);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!picking) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ role: 'dm' });
        if (search.trim()) params.set('search', search.trim());
        const res = await fetch(`/api/creatures?${params}`);
        const data = res.ok ? await res.json() : [];
        // A character cannot be bound to itself, so it is not offered.
        if (!cancelled) setResults(data.filter((c) => c.id !== creatureId).slice(0, 40));
      } catch { if (!cancelled) setResults([]); }
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [search, picking, creatureId]);

  async function add(id) {
    setError('');
    try {
      const r = await fetch(`/api/creatures/${creatureId}/companions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creature_id: id }),
      });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `Failed (${r.status})`);
      setPicking(false);
      setSearch('');
      load();
    } catch (err) { setError(err.message); }
  }

  async function patch(rowId, body) {
    setRows((p) => p.map((row) => (row.id === rowId ? { ...row, ...body } : row)));
    try {
      await fetch(`/api/creatures/${creatureId}/companions/${rowId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch { load(); }
  }

  async function remove(rowId) {
    setRows((p) => p.filter((row) => row.id !== rowId));
    try {
      await fetch(`/api/creatures/${creatureId}/companions/${rowId}`, { method: 'DELETE' });
    } finally { load(); }
  }

  if (!creatureId) {
    return (
      <div className="p-4">
        <p className="text-sm text-gray-400">
          Save this character first — a companion is bound to a character that exists.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs text-gray-400 leading-snug flex-1">
          Anything bound here belongs to {ownerName || 'this character'} whether or not it is on a map.
          It shows on their sheet with a <span className="text-emerald-300">Summon</span> button, and they
          can call it in themselves when it is needed.
        </p>
        <button type="button" onClick={() => setPicking((v) => !v)}
          className="shrink-0 text-xs bg-emerald-900/40 hover:bg-emerald-800/60 border border-emerald-700 text-emerald-200 px-2 py-1 rounded">
          {picking ? 'Close' : '+ Bind a creature'}
        </button>
      </div>

      {error && <p className="text-xs text-red-300">{error}</p>}

      {picking && (
        <div className="rounded-lg border border-gray-700 bg-gray-800/60 p-2 space-y-2">
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search the creature library…"
            className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-dnd-gold"
          />
          <div className="max-h-56 overflow-y-auto divide-y divide-gray-800">
            {results.length === 0 && (
              <p className="text-xs text-gray-500 italic py-2">Nothing matching.</p>
            )}
            {results.map((c) => (
              <button key={c.id} type="button" onClick={() => add(c.id)}
                className="w-full flex items-center gap-2 py-1.5 text-left hover:bg-gray-700/50 px-1 rounded">
                <span className="w-7 h-7 rounded bg-gray-900 overflow-hidden shrink-0">
                  {c.image_path && <img src={`/uploads/${c.image_path}`} alt="" className="w-full h-full object-cover" />}
                </span>
                <span className="text-sm text-gray-200 truncate flex-1">{c.name}</span>
                <span className="text-[10px] text-gray-500 shrink-0">
                  {c.size} {c.creature_type}{c.hit_points ? ` · ${c.hit_points} hp` : ''}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {loading && rows.length === 0 && <p className="text-xs text-gray-500">Reading…</p>}
      {!loading && rows.length === 0 && (
        <p className="text-xs text-gray-500 italic">Nothing bound yet.</p>
      )}

      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.id} className="rounded-lg border border-gray-700 bg-gray-800/50 p-2">
            <div className="flex items-center gap-2">
              <span className="w-9 h-9 rounded bg-gray-900 overflow-hidden shrink-0">
                {row.image_path && <img src={`/uploads/${row.image_path}`} alt="" className="w-full h-full object-cover" />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm text-gray-100 truncate">{row.name}</div>
                <div className="text-[10px] text-gray-500 truncate">
                  {row.size} {row.creature_type}
                  {row.hit_points ? ` · ${row.hit_points} hp` : ''}
                  {row.armor_class ? ` · AC ${row.armor_class}` : ''}
                </div>
              </div>
              <button type="button" onClick={() => remove(row.id)}
                title="Unbind. Anything already summoned stays on the map."
                className="shrink-0 text-xs text-red-300 hover:text-red-200 px-2 py-1">Unbind</button>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <input
                value={row.nickname || ''}
                onChange={(e) => patch(row.id, { nickname: e.target.value })}
                placeholder={`Called… (defaults to ${row.name})`}
                className="flex-1 min-w-0 bg-gray-900 border border-gray-600 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-dnd-gold"
              />
              <select
                value={row.companion_kind || 'familiar'}
                onChange={(e) => patch(row.id, { companion_kind: e.target.value })}
                className="bg-gray-900 border border-gray-600 rounded px-1.5 py-1 text-xs text-gray-200"
              >
                {KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function WildShapeForms({ value, onChange, druidLevel, subclass, tempHp }) {
  // Circle Forms caps the form's CR at druid level ÷ 3. Advisory only — the
  // GM curates the list, and "I'll allow it" outranks the table.
  const crCap = wildShapeCrCap(druidLevel, subclass);
  const crValue = (cr) => {
    const s = String(cr ?? '').trim();
    if (s.includes('/')) {
      const [a, b] = s.split('/').map(Number);
      return b ? a / b : 0;
    }
    return Number(s) || 0;
  };
  const ids = Array.isArray(value) ? value.map(Number).filter(Boolean) : [];
  const [picked, setPicked] = useState([]);     // resolved creature rows for `ids`
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  // Eligible-only by default — that's what the library flag is for. The
  // override is there because "I'll allow it" is a real thing at a table.
  const [eligibleOnly, setEligibleOnly] = useState(true);

  // Resolve the stored ids to names/art. Re-runs when the list changes.
  useEffect(() => {
    let cancelled = false;
    if (ids.length === 0) { setPicked([]); return; }
    Promise.all(ids.map((id) =>
      fetch(`/api/creatures/${id}`).then((r) => (r.ok ? r.json() : null)).catch(() => null)
    )).then((rows) => {
      if (!cancelled) setPicked(rows.filter(Boolean));
    });
    return () => { cancelled = true; };
  }, [ids.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ filter: 'monsters', role: 'dm' });
        if (search.trim()) params.set('search', search.trim());
        const res = await fetch(`/api/creatures?${params}`);
        const data = res.ok ? await res.json() : [];
        const filtered = eligibleOnly ? data.filter((c) => c.wildshape_eligible) : data;
        if (!cancelled) setResults(filtered.slice(0, 40));
      } catch {
        if (!cancelled) setResults([]);
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [search, open, eligibleOnly]);

  function add(id) {
    if (ids.includes(Number(id))) return;
    onChange([...ids, Number(id)]);
  }
  function remove(id) {
    onChange(ids.filter((x) => x !== Number(id)));
  }

  return (
    <div className="bg-gray-800 rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-dnd-gold">Wild Shape forms</h4>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="text-xs px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-200"
        >
          {open ? 'Done' : '+ Add form'}
        </button>
      </div>
      <p className="text-[11px] text-gray-500 leading-snug">
        Forms this character may shift into from their own screen. Shifting grants
        {tempHp ? ` ${tempHp}` : ''} temporary hit points
        {subclass === 'Circle of the Moon' ? ' (3× druid level, Circle Forms)' : ' (druid level)'},
        and the form's senses replace theirs.
        {crCap != null && ` Circle Forms caps forms at CR ${crCap}.`}
      </p>

      {picked.length === 0 ? (
        <p className="text-xs text-gray-500 italic">No forms yet — this character can't Wild Shape.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {picked.map((c) => (
            <span key={c.id} className="flex items-center gap-1.5 bg-gray-700 rounded-lg pl-1 pr-2 py-1">
              {c.image_path
                ? <img src={`/uploads/${c.image_path}`} alt="" className="w-6 h-6 rounded object-cover" />
                : <span className="w-6 h-6 rounded bg-gray-600" />}
              <span className="text-xs text-gray-200">{c.name}</span>
              <span className="text-[10px] text-gray-500">{c.hit_points} hp</span>
              {crCap != null && crValue(c.challenge_rating) > crCap && (
                <span className="text-[10px] text-amber-400" title={`CR ${c.challenge_rating} is above this druid's cap of ${crCap}`}>
                  CR {c.challenge_rating}
                </span>
              )}
              <button
                type="button"
                onClick={() => remove(c.id)}
                className="text-gray-400 hover:text-red-300 text-xs leading-none"
                title="Remove form"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}

      {open && (
        <div className="border border-gray-700 rounded-lg p-2 space-y-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search creatures — wolf, bear, giant spider…"
            className="w-full px-2 py-1.5 rounded bg-gray-900 border border-gray-700 text-gray-100 text-xs outline-none focus:border-dnd-gold"
          />
          <label className="flex items-center gap-1.5 text-[11px] text-gray-400 cursor-pointer">
            <input
              type="checkbox"
              checked={eligibleOnly}
              onChange={(e) => setEligibleOnly(e.target.checked)}
              className="accent-emerald-500"
            />
            Only creatures marked as Wild Shape forms
          </label>
          <div className="max-h-40 overflow-y-auto grid grid-cols-2 gap-1">
            {results.length === 0 && (
              <p className="col-span-2 text-[11px] text-gray-500 px-1 py-2">
                {eligibleOnly
                  ? 'No eligible creatures. Tick "Available as a Wild Shape form" on a creature, or untick the filter above.'
                  : 'No matches.'}
              </p>
            )}
            {results.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => add(c.id)}
                disabled={ids.includes(c.id)}
                className={`flex items-center gap-1.5 px-1.5 py-1 rounded text-left ${
                  ids.includes(c.id) ? 'opacity-40 cursor-default' : 'hover:bg-gray-700'
                }`}
              >
                {c.image_path
                  ? <img src={`/uploads/${c.image_path}`} alt="" className="w-6 h-6 rounded object-cover shrink-0" />
                  : <span className="w-6 h-6 rounded bg-gray-600 shrink-0" />}
                <span className="text-[11px] text-gray-200 truncate">
                  {c.name}
                  <span className="block text-[10px] text-gray-500">CR {c.challenge_rating} • {c.hit_points} hp</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const defaultForm = {
  name: '',
  pronouns: '',
  size: 'medium',
  // Footprint override in squares, for gargantuan creatures whose category
  // sets only a minimum. null = use the size preset.
  size_squares: null,
  is_swarm: false,
  swarm_creature_size: 'tiny',
  hide_token_name: false,
  hide_token_hp: false,
  wildshape_forms: [],
  wildshape_eligible: false,
  wildshape_keep_hp: false,
  creature_type: 'Humanoid',
  subtype: '',
  alignment: 'Unaligned',
  armor_class: 10,
  ac_misc_bonus: 0,
  armor_desc: '',
  shield_equipped: false,
  hit_points: 10,
  hit_dice: '2d8',
  // Structured hit dice: [{ die, qty }] plus a flat bonus. `hit_dice` stays
  // as the printed formula so the stat block, the library card and the export
  // keep reading one string.
  hit_dice_pool: [],
  hit_dice_bonus: 0,
  hit_dice_qty: 0,
  hit_dice_type: '',
  hit_dice_used: 0,
  hit_dice_used_by_type: {},
  char_class: '',
  char_subclass: '',
  background: '',
  background_state: {},
  tool_proficiencies: '',
  weapon_proficiencies: '',
  class_state: {},
  multiclasses: [],
  resource_state: {},
  inspiration_die: '',
  heroic_inspiration: false,
  death_save_successes: 0,
  death_save_failures: 0,
  prof_light_armor: false,
  prof_medium_armor: false,
  prof_heavy_armor: false,
  prof_shields: false,
  concentrating_on: '',
  char_level: 1,
  char_xp: 0,
  class_features: [],
  feats: [],
  skill_expertise: {},
  speed_walk: 30,
  speed_fly: 0,
  speed_swim: 0,
  speed_burrow: 0,
  speed_climb: 0,
  strength: 10,
  dexterity: 10,
  constitution: 10,
  intelligence: 10,
  wisdom: 10,
  charisma: 10,
  save_str: null, save_dex: null, save_con: null,
  save_int: null, save_wis: null, save_cha: null,
  skill_acrobatics: null, skill_animal_handling: null, skill_arcana: null,
  skill_athletics: null, skill_deception: null, skill_history: null,
  skill_insight: null, skill_intimidation: null, skill_investigation: null,
  skill_medicine: null, skill_nature: null, skill_perception: null,
  skill_performance: null, skill_persuasion: null, skill_religion: null,
  skill_sleight_of_hand: null, skill_stealth: null, skill_survival: null,
  damage_vulnerabilities: '',
  damage_resistances: '',
  damage_immunities: '',
  condition_immunities: '',
  senses: [],
  passive_perception: 10,
  languages: 'Common',
  challenge_rating: '1',
  xp: 200,
  proficiency_bonus: 2,
  initiative_bonus: 0,
  special_abilities: [],
  actions: [],
  bonus_actions: [],
  reactions: [],
  legendary_actions: [],
  legendary_action_count: 0,
  movement_actions: [],
  inventory: [],
  currency_cp: 0,
  currency_sp: 0,
  currency_gp: 0,
  spells: [],
  spell_slots: {},
  loot: [],
  // Which rollable table this creature's remains are rolled on. Empty string
  // rather than null: the submit loop below skips nulls, so a cleared select
  // would never reach the server and the old table would stick.
  loot_table_id: '',
  // Tracks what the race picker auto-applied so a future race-swap
  // can revert just those values without disturbing manually-added
  // ones. Persisted to creatures.race_state on save.
  race_state: {},
};

const SPELL_SCHOOLS = ['Abjuration','Conjuration','Divination','Enchantment','Evocation','Illusion','Necromancy','Transmutation'];
const DAMAGE_TYPES = ['Acid','Cold','Fire','Force','Lightning','Necrotic','Poison','Psychic','Radiant','Thunder','Bludgeoning','Piercing','Slashing'];
const ATTACK_SAVE_OPTS = [
  { value: '', label: '—' },
  { value: 'melee', label: 'Melee' },
  { value: 'ranged', label: 'Ranged' },
  { value: 'save', label: 'Save' },
];
const SAVE_ABILITIES = ['STR','DEX','CON','INT','WIS','CHA'];

function SpellEditor({
  spell, updateSpell, removeSpell, swapSpellType, reorderSpell,
  getSpellDmgEntries, addSpellDmgEntry, updateSpellDmgEntry, removeSpellDmgEntry,
  borderClass = 'border-red-900/40', isUtility = false,
}) {
  // Cycle Combat → Healing → Utility → Combat, so one button still covers
  // every category.
  const curType = spellType(spell.type).key;
  const nextType = SPELL_TYPE_KEYS[(SPELL_TYPE_KEYS.indexOf(curType) + 1) % SPELL_TYPE_KEYS.length];
  const nextMeta = spellType(nextType);
  const smallInput = 'bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-dnd-gold';
  const [dragOver, setDragOver] = useState(false);
  return (
    <div
      className={`mb-2 bg-gray-800 rounded-lg p-2 space-y-1.5 border ${borderClass} ${dragOver ? 'ring-2 ring-dnd-gold' : ''}`}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('application/x-spell-id')) {
          e.preventDefault();
          setDragOver(true);
        }
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        setDragOver(false);
        const fromId = e.dataTransfer.getData('application/x-spell-id');
        if (!fromId) return;
        e.preventDefault();
        const fromIdNum = Number(fromId);
        if (!fromIdNum || fromIdNum === spell.id) return;
        reorderSpell?.(fromIdNum, spell.id);
      }}
    >
      <div className="flex gap-2 items-start">
        <span
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData('application/x-spell-id', String(spell.id));
            e.dataTransfer.effectAllowed = 'move';
          }}
          className="text-gray-500 hover:text-dnd-gold cursor-grab active:cursor-grabbing select-none px-1 pt-1 shrink-0"
          title="Drag to reorder"
        >⋮⋮</span>
        <input
          className={`flex-1 ${smallInput}`}
          placeholder="Spell name"
          value={spell.name}
          onChange={(e) => updateSpell(spell.id, 'name', e.target.value)}
        />
        <button
          type="button"
          onClick={() => swapSpellType?.(spell.id)}
          className={`text-[10px] px-1.5 py-1 rounded border shrink-0 transition-colors ${
            nextType === 'combat'
              ? 'border-red-900/60 text-red-300 hover:bg-red-900/30'
              : nextType === 'healing'
                ? 'border-green-900/60 text-green-300 hover:bg-green-900/30'
                : 'border-blue-900/60 text-blue-300 hover:bg-blue-900/30'
          }`}
          title={`Move to ${nextMeta.label}`}
        >
          → {nextMeta.label}
        </button>
        <label
          className="flex items-center gap-1 text-xs text-gray-300 cursor-pointer"
          title="Prepared — counts against the Spell Allowance shown at the top of this tab"
        >
          <input
            type="checkbox"
            checked={!!spell.prepared}
            onChange={(e) => updateSpell(spell.id, 'prepared', e.target.checked)}
            className="accent-dnd-gold"
          />
          Prepared
        </label>
        <button type="button" onClick={() => removeSpell(spell.id)} className="text-red-400 hover:text-red-300 pt-0.5 shrink-0"><XIcon /></button>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <input
          className={smallInput}
          placeholder="Casting Time"
          value={spell.casting_time || ''}
          onChange={(e) => updateSpell(spell.id, 'casting_time', e.target.value)}
        />
        <input
          className={smallInput}
          placeholder="Range/Area"
          value={spell.range_area || spell.spell_range || ''}
          onChange={(e) => updateSpell(spell.id, 'range_area', e.target.value)}
        />
        <input
          className={smallInput}
          placeholder="Duration"
          value={spell.duration || ''}
          onChange={(e) => updateSpell(spell.id, 'duration', e.target.value)}
        />
        <select
          className={smallInput}
          value={spell.school || ''}
          onChange={(e) => updateSpell(spell.id, 'school', e.target.value)}
        >
          <option value="">School —</option>
          {SPELL_SCHOOLS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          className={smallInput}
          value={spell.casting_ability || ''}
          onChange={(e) => updateSpell(spell.id, 'casting_ability', e.target.value)}
        >
          <option value="">Casting Ability —</option>
          {SAVE_ABILITIES.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <div className="flex gap-1">
          <select
            className={`${smallInput} flex-1`}
            value={spell.attack_save || ''}
            onChange={(e) => updateSpell(spell.id, 'attack_save', e.target.value)}
          >
            {ATTACK_SAVE_OPTS.map(o => <option key={o.value} value={o.value}>{o.label || 'Attack/Save'}</option>)}
          </select>
          {spell.attack_save === 'save' && (
            <select
              className={smallInput}
              value={spell.save_ability || ''}
              onChange={(e) => updateSpell(spell.id, 'save_ability', e.target.value)}
            >
              <option value="">—</option>
              {SAVE_ABILITIES.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          )}
        </div>
      </div>
      {/* Components */}
      <div className="flex items-center gap-3 text-xs text-gray-300">
        <span className="text-gray-500">Components:</span>
        <label className="flex items-center gap-1 cursor-pointer">
          <input type="checkbox" checked={!!spell.comp_v} onChange={(e) => updateSpell(spell.id, 'comp_v', e.target.checked)} className="accent-dnd-gold" />V
        </label>
        <label className="flex items-center gap-1 cursor-pointer">
          <input type="checkbox" checked={!!spell.comp_s} onChange={(e) => updateSpell(spell.id, 'comp_s', e.target.checked)} className="accent-dnd-gold" />S
        </label>
        <label className="flex items-center gap-1 cursor-pointer">
          <input type="checkbox" checked={!!spell.comp_m} onChange={(e) => updateSpell(spell.id, 'comp_m', e.target.checked)} className="accent-dnd-gold" />M
        </label>
        {spell.comp_m && (
          <input
            className={`flex-1 ${smallInput}`}
            placeholder="Material component"
            value={spell.comp_m_text || ''}
            onChange={(e) => updateSpell(spell.id, 'comp_m_text', e.target.value)}
          />
        )}
      </div>
      {/* Damage entries (always shown; user can leave empty for pure utility) */}
      <div>
        <div className="flex items-center justify-between mb-0.5">
          <label className="text-xs text-gray-500">Damage/Effect</label>
          <button type="button" onClick={() => addSpellDmgEntry(spell.id)} className="text-xs text-indigo-400 hover:text-indigo-200">+ Add</button>
        </div>
        <div className="space-y-1">
          {getSpellDmgEntries(spell).map((entry, ei) => (
            <div key={ei} className="flex gap-1.5 items-center">
              <input
                className={`w-20 ${smallInput}`}
                placeholder="2d6"
                value={entry.damage}
                onChange={(e) => updateSpellDmgEntry(spell.id, ei, 'damage', e.target.value)}
              />
              <select
                className={`flex-1 ${smallInput}`}
                value={entry.damage_type || ''}
                onChange={(e) => updateSpellDmgEntry(spell.id, ei, 'damage_type', e.target.value)}
              >
                <option value="">Type —</option>
                {DAMAGE_TYPES.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              {getSpellDmgEntries(spell).length > 1 && (
                <button type="button" onClick={() => removeSpellDmgEntry(spell.id, ei)} className="text-red-400 hover:text-red-300 px-1 shrink-0"><XIcon /></button>
              )}
            </div>
          ))}
        </div>
      </div>
      <textarea
        className={`w-full ${smallInput} resize-none`}
        placeholder="Extra Effects"
        rows={2}
        value={spell.extra_effects || ''}
        onChange={(e) => updateSpell(spell.id, 'extra_effects', e.target.value)}
      />
      <textarea
        className={`w-full ${smallInput} resize-none`}
        placeholder="Description"
        rows={3}
        value={spell.description || ''}
        onChange={(e) => updateSpell(spell.id, 'description', e.target.value)}
      />
    </div>
  );
}

function SpellLibraryPicker({ onLearn, charClass, classEntries, ownedNames }) {
  const CLASSES = useAllClasses();
  const [open, setOpen] = useState(false);
  const [spells, setSpells] = useState([]);
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  // Default class filter to the character's class. Empty string = "All classes".
  const initialClass = (() => {
    const k = String(charClass || '').trim().toLowerCase();
    return CLASSES.find(c => c.toLowerCase() === k) || '';
  })();
  const [classFilter, setClassFilter] = useState(initialClass);
  const [loaded, setLoaded] = useState(false);
  const labels = ['Cantrip','1st','2nd','3rd','4th','5th','6th','7th','8th','9th'];

  // ── "Only what this character can learn" ──────────────────────────────────
  //
  // Two gates, and they're deliberately independent: the class gate needs only
  // the sheet's class names, while the level gate needs a spell table we cover.
  // A custom class still gets its spell list narrowed by name even though we
  // have no slot progression to cap it with.
  //
  // The parent rebuilds `classEntries` on every render, so both memos key off a
  // signature of its contents rather than the array identity — otherwise every
  // keystroke in the search box would re-derive these and re-run the effects
  // below.
  const entriesSig = (classEntries || [])
    .map(e => `${e?.className}|${e?.subclassName}|${e?.level}`)
    .join(';');
  const ownClasses = useMemo(
    () => (classEntries || []).map(e => String(e?.className || '').trim()).filter(Boolean),
    [entriesSig],
  );
  const learnable = useMemo(() => learnableSpellsFor(classEntries), [entriesSig]);
  // Subclass spell lists cut across the class gate: a Forge Domain cleric's
  // Searing Smite is flagged Paladin-only in the library, and Heat Metal is
  // Bard/Druid — filtering on allowed_classes alone hides the entire domain
  // list from the cleric it belongs to. These bypass the level cap too, since
  // being granted a spell is itself the proof you can have it.
  const grantedNames = useMemo(() => {
    const set = new Set();
    for (const e of classEntries || []) {
      const names = [
        ...subclassPreparedSpells(e?.className, e?.subclassName, e?.level),
        // Circle of the Land's four land lists, which are reachable but not
        // always prepared.
        ...subclassLearnableSpells(e?.className, e?.subclassName, e?.level),
      ];
      for (const n of names) set.add(String(n).toLowerCase());
    }
    return set;
  }, [entriesSig]);
  const [onlyLearnable, setOnlyLearnable] = useState(true);
  // What's already on the sheet. Marked rather than hidden by default: a player
  // scanning the list needs to see that they already have Bless, not wonder why
  // it's missing. `hideKnown` is there for the other mood — working through what
  // is left to pick.
  const [hideKnown, setHideKnown] = useState(false);
  // Library row being previewed, or null. Read-only look at what a spell does
  // before committing to Learn.
  const [preview, setPreview] = useState(null);
  const ownedSig = (ownedNames || []).join('|');
  const knownNames = useMemo(
    () => new Set((ownedNames || []).map(n => String(n || '').trim().toLowerCase()).filter(Boolean)),
    [ownedSig],
  );
  // Nothing to gate on for a monster or an unclassed sheet, so the toggle goes
  // inert rather than filtering the whole library away.
  const gateOn = onlyLearnable && ownClasses.length > 0;

  async function load() {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (levelFilter !== '') params.set('level', levelFilter);
    // While gating, the class match is applied below — a multiclass sheet needs
    // to match any of several classes, which the single-value `klass` can't do.
    if (classFilter && !gateOn) params.set('klass', classFilter);
    try {
      const res = await fetch(`/api/spell-library?${params}`);
      const data = await res.json();
      setSpells(Array.isArray(data) ? data : []);
      setLoaded(true);
    } catch (err) {
      console.error(err);
      setLoaded(true);
    }
  }

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [open, search, levelFilter, classFilter, gateOn]);

  const gated = useMemo(() => {
    if (!gateOn) return spells;
    return spells.filter((s) => {
      if (grantedNames.has(String(s.name || '').toLowerCase())) return true;
      const lvl = Number(s.level) || 0;
      if (lvl === 0) {
        // Only hide cantrips when we know the class has no cantrip budget
        // (Paladin, Ranger). An unknown class shouldn't lose them.
        if (learnable.maxLevel != null && !learnable.cantrips) return false;
      } else if (learnable.maxLevel == null || lvl > learnable.maxLevel) {
        return false;
      }
      const allowed = Array.isArray(s.allowed_classes) ? s.allowed_classes : [];
      // A library entry with no class list is homebrew or unscanned — show it
      // rather than silently dropping it.
      if (allowed.length === 0) return true;
      // `learnable.lists` — not the raw class names — so an Eldritch Knight
      // matches Wizard spells and a Lore Bard matches its wider access.
      return allowed.some(c => learnable.lists.some(o => o.toLowerCase() === String(c).toLowerCase()));
    });
  }, [spells, gateOn, learnable, grantedNames]);

  const knownShown = useMemo(
    () => gated.filter(s => knownNames.has(String(s.name || '').toLowerCase())).length,
    [gated, knownNames],
  );
  const visible = useMemo(
    () => (hideKnown ? gated.filter(s => !knownNames.has(String(s.name || '').toLowerCase())) : gated),
    [gated, hideKnown, knownNames],
  );

  // Levels the character can reach, for trimming the level dropdown.
  const levelOptions = useMemo(() => {
    if (!gateOn || learnable.maxLevel == null) return labels.map((l, i) => [i, l]);
    const out = [];
    if (learnable.cantrips) out.push([0, labels[0]]);
    for (let i = 1; i <= learnable.maxLevel; i++) out.push([i, labels[i]]);
    return out;
  }, [gateOn, learnable]);

  // A cap that just dropped below the chosen level would otherwise leave the
  // dropdown showing a level that's no longer offered.
  useEffect(() => {
    if (!gateOn || levelFilter === '') return;
    if (!levelOptions.some(([v]) => v === Number(levelFilter))) setLevelFilter('');
  }, [gateOn, levelOptions, levelFilter]);

  return (
    <div className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2 bg-gray-800 hover:bg-gray-750 text-sm font-semibold text-dnd-gold border-b border-gray-700"
      >
        <span>📚 Learn from Spell Library</span>
        <span className="text-xs text-gray-400">{open ? 'Close' : 'Open'}</span>
      </button>
      {open && (
        <div className="p-3 space-y-2">
          <div className="flex flex-wrap gap-2">
            <input
              placeholder="Search by name…"
              className="flex-1 min-w-[120px] bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white"
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
            >
              <option value="">All levels</option>
              {levelOptions.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <select
              className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white disabled:opacity-40"
              value={gateOn ? '' : classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              disabled={gateOn}
              title={gateOn
                ? 'Untick "only what this character can learn" to browse other classes'
                : 'Override to view spells from other classes'}
            >
              <option value="">All classes</option>
              {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <label
            className={`flex items-center gap-2 text-xs ${ownClasses.length ? 'text-gray-300' : 'text-gray-500'}`}
            title={ownClasses.length
              ? 'Hide spells this character has no way to learn'
              : 'Needs a class on the sheet before it can tell what is learnable'}
          >
            <input
              type="checkbox"
              className="accent-dnd-gold"
              checked={onlyLearnable}
              disabled={!ownClasses.length}
              onChange={(e) => setOnlyLearnable(e.target.checked)}
            />
            Only spells {ownClasses.length ? ownClasses.join(' / ') : 'this character'} can learn
          </label>
          <label
            className={`flex items-center gap-2 text-xs ${knownNames.size ? 'text-gray-300' : 'text-gray-500'}`}
            title="Drop spells already on this sheet out of the list instead of greying them out"
          >
            <input
              type="checkbox"
              className="accent-dnd-gold"
              checked={hideKnown}
              disabled={!knownNames.size}
              onChange={(e) => setHideKnown(e.target.checked)}
            />
            {knownShown > 0
              ? `Hide the ${knownShown} already on this sheet`
              : 'Hide spells already on this sheet'}
          </label>
          {gateOn && (
            <p className="text-[10px] text-gray-500 italic">
              {learnable.maxLevel != null
                ? <>Showing spells up to <span className="text-purple-300">{labels[learnable.maxLevel]}</span> level{learnable.cantrips ? '' : ' — no cantrips for this build'}.</>
                : <>Filtering by class only — no spell slot table for {ownClasses.join(' / ')}, so spell level isn't capped.</>}
              {grantedNames.size > 0 && ' Subclass list included.'}
              {' '}Untick to browse the whole library.
            </p>
          )}
          {!gateOn && initialClass && classFilter === initialClass && (
            <p className="text-[10px] text-gray-500 italic">
              Defaulted to <span className="text-purple-300">{initialClass}</span> spells. Switch the filter to override.
            </p>
          )}
          {loaded && visible.length === 0 && (
            <p className="text-xs text-gray-500 italic">
              {hideKnown && gated.length > 0
                ? 'Every matching spell is already on this sheet.'
                : gateOn
                  ? 'No spells match. Untick the filter above to browse the whole library, or ask your GM to scan a PDF.'
                  : 'No spells match. Switch class filter to "All classes" or ask your GM to scan a PDF.'}
            </p>
          )}
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {visible.map(s => {
              const isKnown = knownNames.has(String(s.name || '').toLowerCase());
              return (
                <div
                  key={s.id}
                  className={`flex items-center gap-2 rounded px-2 py-1 ${isKnown ? 'bg-gray-800/40 opacity-60' : 'bg-gray-700/40'}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate flex items-center gap-1.5">
                      <span className={isKnown ? 'text-gray-400 line-through' : 'text-white'}>{s.name}</span>
                      <EditionTag edition={s.edition} source={s.source} />
                      {isKnown && (
                        <span className="shrink-0 text-[9px] uppercase tracking-wide bg-gray-700 text-emerald-300 px-1 py-0.5 rounded">
                          on sheet
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-gray-400">
                      {labels[s.level] || `lvl ${s.level}`}{s.school ? ` · ${s.school}` : ''}
                      {Array.isArray(s.allowed_classes) && s.allowed_classes.length > 0 && (
                        <span className="text-purple-300"> · {s.allowed_classes.join(', ')}</span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPreview(s)}
                    title={`What does ${s.name} do?`}
                    className="text-xs px-2 py-1 rounded font-semibold bg-gray-700 hover:bg-gray-600 text-gray-200 shrink-0"
                  >
                    View
                  </button>
                  <button
                    type="button"
                    onClick={() => onLearn(s)}
                    disabled={isKnown}
                    title={isKnown ? 'Already on this character\'s sheet' : undefined}
                    className={`text-xs px-2 py-1 rounded font-semibold shrink-0 ${isKnown
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      : 'bg-dnd-gold hover:bg-yellow-500 text-gray-900'}`}
                  >
                    {isKnown ? 'Added' : 'Learn'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Spell preview. Same shape as the player sheet's spell popup so the two
          read identically, and above the editor's own z-50 chrome. Learn is
          repeated here so a preview can be acted on without hunting back down
          the list for the row. */}
      {preview && (
        <div
          className="fixed inset-0 z-[90] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreview(null)}
        >
          <div
            className="bg-dnd-panel border border-dnd-gold/40 rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-gray-700 sticky top-0 bg-dnd-panel">
              <span className="text-sm font-semibold text-dnd-gold">
                {Number(preview.level) === 0 ? 'Cantrip' : `Level ${preview.level} Spell`}
              </span>
              <div className="flex items-center gap-2">
                {knownNames.has(String(preview.name || '').toLowerCase()) ? (
                  <span className="text-[10px] uppercase tracking-wide bg-gray-700 text-emerald-300 px-1.5 py-0.5 rounded">
                    on sheet
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => { onLearn(preview); setPreview(null); }}
                    className="text-xs bg-dnd-gold hover:bg-yellow-500 text-gray-900 px-2 py-1 rounded font-semibold"
                  >
                    Learn
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setPreview(null)}
                  className="text-gray-400 hover:text-white text-sm"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="p-3">
              <SpellBox
                spell={preview}
                typeLabel={spellType(preview.type).badge}
                typeColor={spellType(preview.type).dark}
                darkTheme
              />
              {Array.isArray(preview.allowed_classes) && preview.allowed_classes.length > 0 && (
                <p className="text-[10px] text-purple-300 pt-2">
                  {preview.allowed_classes.join(', ')}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AbilityList({ label, items, onAdd, onRemove, onChange }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-dnd-gold">{label}</h4>
        <button type="button" onClick={onAdd} className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded">+ Add</button>
      </div>
      {items.map((item, i) => (
        <div key={i} className="bg-gray-800 rounded-lg p-3 space-y-2">
          <div className="flex gap-2">
            <input
              className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white"
              placeholder="Name"
              value={item.name}
              onChange={(e) => onChange(i, 'name', e.target.value)}
            />
            <button type="button" onClick={() => onRemove(i)} className="text-red-400 hover:text-red-300 px-2"><XIcon /></button>
          </div>
          <textarea
            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white resize-none"
            placeholder="Description"
            rows={3}
            value={item.desc}
            onChange={(e) => onChange(i, 'desc', e.target.value)}
          />
        </div>
      ))}
    </div>
  );
}

export default function CreatureForm({ creature, onSave, onCancel, extraFields, submitLabel, isPlayerCharacter = false, asGm = false }) {
  const allClasses = useAllClasses();
  // Subclass list re-derives whenever the selected class changes.
  // form.char_class is captured below — pull it indirectly via the form
  // state once it's defined.
  // The rollable tables, for the loot picker. Fetched once; an empty list just
  // means none have been made yet and the select says so.
  const [lootTables, setLootTables] = useState([]);
  useEffect(() => {
    let gone = false;
    // Loot tables only — the GM's rumour and encounter tables have no business
    // in a loot picker.
    fetch('/api/tables?kind=loot')
      .then((r) => (r.ok ? r.json() : []))
      .then((rows) => { if (!gone) setLootTables(Array.isArray(rows) ? rows : []); })
      .catch(() => {});
    return () => { gone = true; };
  }, []);

  const [form, setForm] = useState(() => {
    let senses = [];
    if (creature) {
      const rawSenses = creature.senses;
      if (Array.isArray(rawSenses)) {
        senses = rawSenses;
      } else if (typeof rawSenses === 'string' && rawSenses.trim().startsWith('[')) {
        try { senses = JSON.parse(rawSenses); } catch { senses = []; }
      }
    }
    // Player characters always have at least normal vision by default
    if (isPlayerCharacter && senses.length === 0) {
      senses = [{ type: 'normal', range: 0 }];
    }
    let inventory = [];
    if (creature?.inventory) {
      inventory = Array.isArray(creature.inventory)
        ? creature.inventory
        : (typeof creature.inventory === 'string' ? (() => { try { return JSON.parse(creature.inventory); } catch { return []; } })() : []);
    }
    let spells = [];
    if (creature?.spells) {
      spells = Array.isArray(creature.spells) ? creature.spells
        : (typeof creature.spells === 'string' ? (() => { try { return JSON.parse(creature.spells); } catch { return []; } })() : []);
      spells = dedupeSpells(spells);
    }
    let spell_slots = {};
    if (creature?.spell_slots) {
      spell_slots = typeof creature.spell_slots === 'string'
        ? (() => { try { return JSON.parse(creature.spell_slots); } catch { return {}; } })()
        : (creature.spell_slots || {});
    }
    let loot = [];
    if (creature?.loot) {
      loot = Array.isArray(creature.loot) ? creature.loot
        : (typeof creature.loot === 'string' ? (() => { try { return JSON.parse(creature.loot); } catch { return []; } })() : []);
    }
    let movement_actions = [];
    if (creature?.movement_actions) {
      movement_actions = Array.isArray(creature.movement_actions) ? creature.movement_actions
        : (typeof creature.movement_actions === 'string' ? (() => { try { return JSON.parse(creature.movement_actions); } catch { return []; } })() : []);
    }
    const DEFAULT_MOVEMENT = [
      { name: 'Move', desc: 'Cost: 5ft per 5ft' },
      { name: 'Climb', desc: 'Cost: 10ft per 5ft' },
      { name: 'Swim', desc: 'Cost: 10ft per 5ft' },
      { name: 'Drop Prone', desc: 'Cost: 0ft' },
      { name: 'Crawl', desc: 'Cost: 10ft per 5ft' },
      { name: 'Stand Up', desc: 'Cost: half movement speed' },
      { name: 'High Jump', desc: 'Cost: 5ft per 5ft' },
      { name: 'Long Jump', desc: 'Cost: 5ft per 5ft' },
      { name: 'Difficult Terrain', desc: 'Cost modifier: +5ft per 5ft' },
      { name: 'Grapple Move', desc: 'Modifier: speed halved' },
      { name: 'Improvise', desc: 'Any movement stunt not on this list' },
    ];
    const DEFAULT_ACTIONS = [
      { name: 'Attack', desc: 'Melee or ranged attack' },
      { name: 'Grapple', desc: 'Special melee attack' },
      { name: 'Shove', desc: 'Special melee attack' },
      { name: 'Cast a Spell', desc: 'Cast time of 1 action' },
      { name: 'Dash', desc: 'Double movement speed' },
      { name: 'Disengage', desc: 'Prevent opportunity attacks' },
      { name: 'Dodge', desc: 'Increase defenses' },
      { name: 'Escape', desc: 'Escape a grapple' },
      { name: 'Help', desc: 'Grant an ally advantage' },
      { name: 'Use Object', desc: 'Interact, use special abilities' },
      { name: 'Use Shield', desc: 'Equip or unequip a shield' },
      { name: 'Hide', desc: 'Must be heavily obscured or have three-quarters/total cover to make a DC 15 Stealth check. Success grants the Invisible condition until you reveal yourself.' },
      { name: 'Search', desc: 'Devote attention to finding something that isn\'t obvious' },
      { name: 'Ready', desc: 'Choose trigger and action' },
      { name: 'Use Class Feature', desc: 'Some features use actions' },
      { name: 'Improvise', desc: 'Any action not on this list' },
    ];
    const DEFAULT_BONUS = [
      { name: 'Offhand Attack', desc: 'Use with the Attack action' },
      { name: 'Cast a Spell', desc: 'Cast time of 1 bonus action' },
      { name: 'Use Class Feature', desc: 'Some features use bonus actions' },
    ];
    const DEFAULT_REACTIONS = [
      { name: 'Opportunity Attack', desc: 'Enemy leaves your reach' },
      { name: 'Readied Action', desc: 'Part of your Ready action' },
      { name: 'Cast a Spell', desc: 'Cast time of 1 reaction' },
    ];
    if (!creature) {
      return { ...defaultForm, senses, movement_actions };
    }
    // image_data (the AI-prefill data URL) is consumed by the imageFile
    // hook below; it must NOT live on form state because Object.entries
    // would re-upload it as a multipart text field, exceeding multer's
    // default 1MB text-field cap and crashing the save with an HTML error.
    const { image_data: _imgData, ...creatureWithoutImage } = creature;
    // Hit dice: stored as JSONB, so it can arrive as an array or as text.
    let hit_dice_pool = [];
    if (creature?.hit_dice_pool) {
      const raw = Array.isArray(creature.hit_dice_pool)
        ? creature.hit_dice_pool
        : (typeof creature.hit_dice_pool === 'string'
            ? (() => { try { return JSON.parse(creature.hit_dice_pool); } catch { return []; } })()
            : []);
      hit_dice_pool = normalizeHitDicePool(raw);
    }
    return {
      ...defaultForm, ...creatureWithoutImage, senses, inventory, spells, spell_slots, loot, movement_actions,
      hit_dice_pool,
      // A sheet written before the structured field still carries its flat
      // modifier inside the formula ("6d10 + 12"). Read it back out, or
      // editing the dice would drop the +12 the monster's HP depends on.
      hit_dice_bonus: Number(creature.hit_dice_bonus)
        || parseHitDiceString(creature.hit_dice).bonus
        || 0,
      passive_perception: creature.passive_perception ?? 10,
      currency_cp: creature.currency_cp ?? 0,
      currency_sp: creature.currency_sp ?? 0,
      currency_gp: creature.currency_gp ?? 0,
    };
  });
  // AI-generated creatures arrive with an `image_data` data URL rather
  // than an `image_path`; turn it into a File so the multipart save
  // attaches it like any normal upload.
  const [imageFile, setImageFile] = useState(() => {
    const m = (creature?.image_data || '').match(/^data:([^;]+);base64,(.+)$/);
    if (!m) return null;
    try {
      const bytes = Uint8Array.from(atob(m[2]), (c) => c.charCodeAt(0));
      const ext = m[1].split('/')[1] || 'png';
      return new File([bytes], `ai-${Date.now()}.${ext}`, { type: m[1] });
    } catch { return null; }
  });
  const [imagePreview, setImagePreview] = useState(
    creature?.image_data
      ? creature.image_data
      : creature?.image_path
        ? `/uploads/${creature.image_path}`
        : isPlayerCharacter ? '/uploads/creatures/default_player.png' : null
  );
  // ── Alternate token art ────────────────────────────────────────────────
  // The portrait above stays the creature's primary image; these are extras
  // the GM can pick from when dropping a token on the map. Uploads attach to
  // a creature id, so on a brand-new sheet the strip only says to save first
  // rather than trying to hold files in limbo.
  const creatureId = creature?.id ?? null;
  const [altImages, setAltImages] = useState([]);
  const [altBusy, setAltBusy] = useState(false);
  const [altError, setAltError] = useState('');

  // Returns the fresh list as well as storing it, so a caller that needs to
  // react to what came back doesn't have to wait a render for state.
  const reloadAltImages = useCallback(async () => {
    if (!creatureId) { setAltImages([]); return []; }
    try {
      const res = await fetch(`/api/creatures/${creatureId}/images`);
      if (!res.ok) throw new Error(`Load failed (${res.status})`);
      const list = await res.json();
      setAltImages(list);
      return list;
    } catch (err) {
      setAltError(err.message);
      return [];
    }
  }, [creatureId]);

  useEffect(() => { reloadAltImages(); }, [reloadAltImages]);

  // ── Presentation art ───────────────────────────────────────────────────
  // Everything above is token art: square, cropped tight, read at map scale.
  // This is the full picture "Show image to players" pushes onto everyone's
  // screen instead. Uploaded raw — no framer — because the point is the whole
  // image, and it's never drawn as a token.
  const [displayArt, setDisplayArt] = useState(creature?.display_image_path || null);
  const [displayBusy, setDisplayBusy] = useState(false);

  async function handleDisplayArtUpload(e) {
    const file = (e.target.files || [])[0];
    e.target.value = '';
    if (!file || !creatureId) return;
    setDisplayBusy(true);
    setAltError('');
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await fetch(`/api/creatures/${creatureId}/display-image`, { method: 'PUT', body: fd });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Upload failed (${res.status})`);
      setDisplayArt((await res.json()).display_image_path);
    } catch (err) {
      setAltError(err.message);
    } finally {
      setDisplayBusy(false);
    }
  }

  async function handleDisplayArtRemove() {
    if (!creatureId) return;
    setDisplayBusy(true);
    setAltError('');
    try {
      const res = await fetch(`/api/creatures/${creatureId}/display-image`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`Remove failed (${res.status})`);
      setDisplayArt(null);
    } catch (err) {
      setAltError(err.message);
    } finally {
      setDisplayBusy(false);
    }
  }

  // ── 3D standing art ───────────────────────────────────────────────────
  // Used ONLY by the 3D view, which stands a token up facing the camera. The
  // flat map always keeps the top-down face above, so this can be a full
  // figure without spoiling how the creature reads from overhead.
  const [standeeArt, setStandeeArt] = useState(creature?.standee_image_path || null);
  const [standeeBusy, setStandeeBusy] = useState(false);
  // The wardrobe: every standing look this creature has, the live one first.
  // Shape matches the face-alternates list — { id, image_path, is_primary },
  // with a null id marking the live one.
  const [standeeGallery, setStandeeGallery] = useState([]);

  const reloadStandees = useCallback(async () => {
    if (!creatureId) return [];
    try {
      const res = await fetch(`/api/creatures/${creatureId}/standees`);
      if (!res.ok) return [];
      const list = await res.json();
      setStandeeGallery(Array.isArray(list) ? list : []);
      // The live one is the server's answer, not ours — promoting swaps two
      // rows, and guessing the outcome here is how the preview drifts.
      const live = (Array.isArray(list) ? list : []).find((i) => i.is_primary);
      setStandeeArt(live ? live.image_path : null);
      return list;
    } catch { return []; }
  }, [creatureId]);

  useEffect(() => { reloadStandees(); }, [reloadStandees]);

  // Make a shelved look the one that stands on the board. A swap, so the
  // outgoing art drops into the slot this one just left and a second click
  // puts it back.
  async function useStandee(imageId) {
    if (!creatureId || imageId == null) return;
    setStandeeBusy(true);
    setAltError('');
    try {
      const res = await fetch(`/api/creatures/${creatureId}/standees/${imageId}/primary`, { method: 'PUT' });
      if (!res.ok) throw new Error(`Switch failed (${res.status})`);
      await reloadStandees();
    } catch (err) {
      setAltError(err.message);
    } finally {
      setStandeeBusy(false);
    }
  }

  async function removeShelvedStandee(imageId) {
    if (!creatureId || imageId == null) return;
    setStandeeBusy(true);
    setAltError('');
    try {
      const res = await fetch(`/api/creatures/${creatureId}/standees/${imageId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`Remove failed (${res.status})`);
      await reloadStandees();
    } catch (err) {
      setAltError(err.message);
    } finally {
      setStandeeBusy(false);
    }
  }

  // Picking several at once. Each goes through the framer in turn, exactly as
  // the face alternates do — a standee is a cut-out figure and an unframed
  // photo is almost never the right crop.
  const standeeQueueRef = useRef([]);
  const standeeFramedRef = useRef([]);

  function handleStandeeGalleryUpload(e) {
    const files = [...(e.target.files || [])];
    e.target.value = '';
    if (!files.length || !creatureId) return;
    setAltError('');
    standeeQueueRef.current = files;
    standeeFramedRef.current = [];
    frameNextStandee();
  }

  function frameNextStandee() {
    const next = standeeQueueRef.current.shift();
    if (!next) {
      setFramerMode('primary');
      uploadFramedStandees();
      return;
    }
    setFramerMode('standee-new');
    openFramer(URL.createObjectURL(next), true);
  }

  async function uploadFramedStandees() {
    const files = standeeFramedRef.current;
    standeeFramedRef.current = [];
    if (!files.length || !creatureId) return;
    setStandeeBusy(true);
    setAltError('');
    try {
      const fd = new FormData();
      for (const f of files) fd.append('images', f);
      const res = await fetch(`/api/creatures/${creatureId}/standees`, { method: 'POST', body: fd });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Upload failed (${res.status})`);
      await reloadStandees();
    } catch (err) {
      setAltError(err.message);
    } finally {
      setStandeeBusy(false);
    }
  }

  async function uploadStandee(file) {
    if (!file || !creatureId) return;
    setStandeeBusy(true);
    setAltError('');
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await fetch(`/api/creatures/${creatureId}/standee-image`, { method: 'PUT', body: fd });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Upload failed (${res.status})`);
      setStandeeArt((await res.json()).standee_image_path);
    } catch (err) {
      setAltError(err.message);
    } finally {
      setStandeeBusy(false);
    }
  }

  // Framed before upload, same as the token face — but in a tall frame with no
  // circle, so the gesture is the familiar one while the result is the right
  // shape for something that stands up.
  function handleStandeeUpload(e) {
    const file = (e.target.files || [])[0];
    e.target.value = '';
    if (!file) return;
    setFramerMode('standee');
    openFramer(URL.createObjectURL(file), true);
  }

  // Re-frame what is already saved. The framing is baked into the file, so each
  // pass works on the current copy rather than the original — the same
  // trade-off "Adjust framing" makes for the portrait.
  function startStandeeReframe() {
    if (!standeeArt) return;
    setFramerMode('standee');
    openFramer(`/uploads/${standeeArt}`, false);
  }

  async function handleStandeeRemove() {
    if (!creatureId) return;
    setStandeeBusy(true);
    setAltError('');
    try {
      const res = await fetch(`/api/creatures/${creatureId}/standee-image`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`Remove failed (${res.status})`);
      // Reload rather than just clearing: the slot is empty now, so the next
      // shelved look should move to the front of the strip as the obvious
      // thing to promote. Guessing that locally would drift from the server.
      await reloadStandees();
    } catch (err) {
      setAltError(err.message);
    } finally {
      setStandeeBusy(false);
    }
  }

  // Picking alternates no longer uploads straight away — each file goes
  // through the framer first, one after another, exactly like the primary
  // portrait does. Token art is cropped to a circle on the map, so an
  // unframed image is usually the wrong bit of the picture.
  function handleAltUpload(e) {
    const files = [...(e.target.files || [])];
    e.target.value = '';
    if (!files.length || !creatureId) return;
    setAltError('');
    altQueueRef.current = files;
    altFramedRef.current = [];
    frameNextAlt();
  }

  async function uploadFramedAlts() {
    const files = altFramedRef.current;
    altFramedRef.current = [];
    if (!files.length || !creatureId) return;
    setAltBusy(true);
    setAltError('');
    try {
      const fd = new FormData();
      for (const f of files) fd.append('images', f);
      const res = await fetch(`/api/creatures/${creatureId}/images`, { method: 'POST', body: fd });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Upload failed (${res.status})`);
      const list = await reloadAltImages();
      // Uploading onto a creature with no portrait promotes the first file
      // server-side; mirror that into the big preview so the two don't
      // disagree until the sheet is reopened.
      if (!imagePreview) {
        const promoted = (list || []).find(i => i.is_primary);
        if (promoted) setImagePreview(`/uploads/${promoted.image_path}`);
      }
    } catch (err) {
      setAltError(err.message);
    } finally {
      setAltBusy(false);
    }
  }

  // Re-frame an alternate that's already uploaded. Replaces the file in place
  // so the tile keeps its position in the strip.
  async function replaceAltFile(imageId, file) {
    if (!creatureId) return;
    setAltBusy(true);
    setAltError('');
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await fetch(`/api/creatures/${creatureId}/images/${imageId}/file`, { method: 'PUT', body: fd });
      if (!res.ok) throw new Error(`Re-frame failed (${res.status})`);
      await reloadAltImages();
    } catch (err) {
      setAltError(err.message);
    } finally {
      setAltBusy(false);
    }
  }

  function startAltReframe(img) {
    setFramerMode({ replaceId: img.id });
    // Existing art is served from /uploads, not an object URL — nothing to
    // revoke, hence isObjectUrl=false.
    openFramer(`/uploads/${img.image_path}`, false);
  }

  async function handleAltMakePrimary(img) {
    if (!creatureId || img.is_primary) return;
    setAltBusy(true);
    setAltError('');
    try {
      const res = await fetch(`/api/creatures/${creatureId}/images/${img.id}/primary`, { method: 'PUT' });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      await reloadAltImages();
      // Keep the big portrait in step — it reads from local state, not the row.
      setImagePreview(`/uploads/${img.image_path}`);
      setImageFile(null);
    } catch (err) {
      setAltError(err.message);
    } finally {
      setAltBusy(false);
    }
  }

  async function handleAltDelete(img) {
    if (!creatureId || img.is_primary) return;
    setAltBusy(true);
    setAltError('');
    try {
      const res = await fetch(`/api/creatures/${creatureId}/images/${img.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`Delete failed (${res.status})`);
      await reloadAltImages();
    } catch (err) {
      setAltError(err.message);
    } finally {
      setAltBusy(false);
    }
  }

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('basic');
  // Subclass options track the selected class — derived after `form` exists
  // so the hook always has the latest char_class on every render.
  const allSubclasses = useAllSubclasses(form.char_class);
  // Class-level "build choices" — Cleric Divine Order, Fighter Weapon
  // Mastery, Rogue Expertise, etc. Merges static SRD-2024 with any
  // plugin-supplied choices for this class.
  // Which edition's rules this character's CLASS is built on.
  //
  // It decides which option pool the class offers, and for the Warlock that
  // is a real difference rather than a label: 54 invocations in 2014 against
  // 28 in 2024, and the Pact Boon is its own pick in 2014 but an invocation
  // in 2024. Subclasses are deliberately NOT filtered by it — see the
  // subclass dropdown.
  //
  // Declared HERE, above useClassChoices, because that hook reads it. Kept
  // beside the race-edition state further down, it was a `const` used two
  // hundred lines before its own declaration — which is a temporal dead zone,
  // and threw "Cannot access 'classEdition' before initialization" the moment
  // the character form rendered.
  const [classEdition, setClassEdition] = useState('srd2024');

  const classChoices = useClassChoices(form.char_class, {
    subclass: form.char_subclass,
    edition: classEdition,
    level: form.char_level,
  });

  // Auto-grant choices (Ranger's Hunter's Mark, custom-class
  // class-kit, custom-class per-level features) apply the moment
  // the class is set OR the character levels up. Filters by
  // at_level so a level-5 feature doesn't appear on a level-3
  // sheet. applyClassChoices is idempotent so repeated runs are
  // safe.
  useEffect(() => {
    if (!form.char_class) return;
    const lvl = Math.max(1, Number(form.char_level) || 1);
    const autoChoices = (classChoices || []).filter((c) =>
      c.kind === 'auto' && (c.at_level || 1) <= lvl
    );
    const prevState = form.class_state || {};
    // Bail only when there's nothing due AND nothing already applied.
    // If prior contributions exist we still have to run, otherwise
    // dropping below every feature's level would leave them stranded
    // on the sheet with no pass to strip them.
    const priorAdded = prevState.added || {};
    const hasPrior = (priorAdded.spells    || []).length > 0
      || (priorAdded.saves     || []).length > 0
      || (priorAdded.armor     || []).length > 0
      || (priorAdded.weapons   || []).length > 0
      || (priorAdded.languages || []).length > 0
      || (priorAdded.traits_count || 0) > 0;
    if (autoChoices.length === 0 && !hasPrior) return;
    // Re-apply when class, subclass, or level changes so newly
    // unlocked features land + reverted ones strip cleanly. The
    // strip-prev pass at the top of applyClassChoices removes
    // every cls:primary tagged contribution before re-applying,
    // so duplicate traits aren't a concern.
    const alreadyApplied = prevState.class_id === form.char_class
      && (prevState.subclass_id || '') === (form.char_subclass || '')
      && (prevState.applied_at_level || 0) === lvl
      && ((prevState.added?.spells || []).length > 0
          || (prevState.added?.saves  || []).length > 0
          || (prevState.added?.armor  || []).length > 0
          || (prevState.added?.traits_count || 0) > 0);
    if (alreadyApplied) return;
    // Pass the FULL choice list (with picks) so any pickable choices
    // already saved survive the re-apply.
    applyClassChoices(classChoices, prevState.choices || {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.char_class, form.char_subclass, form.char_level, classEdition, classChoices.length]);

  const tabs = isPlayerCharacter
    ? ['basic', 'abilities', 'combat', 'skills', 'traits', 'spells', 'inventory', 'weapons', 'companions', 'backstory']
    : ['basic', 'abilities', 'combat', 'skills', 'traits', 'spells', 'inventory', 'loot'];
  const tabLabel = {
    basic: 'Basic', combat: 'Combat', abilities: 'Ability Scores',
    skills: 'Skills & Saves', traits: 'Traits & Actions',
    spells: 'Spells', inventory: 'Inventory', loot: 'Loot', weapons: 'Weapons',
    companions: 'Companions',
    backstory: 'Backstory',
  };

  // Stable setField — useCallback with no deps so children that
  // memoise on it (or close over it) don't see a new reference on
  // every keystroke. setForm is stable per React's contract.
  const setField = useCallback((key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
  }, []);

  // Lookups invoked from inline IIFEs further down were re-running
  // on EVERY keystroke (typing in the name field would re-walk the
  // SRD weapon catalog through expandWeaponProficiency, recompute
  // the hit-dice pool, re-look up the class build, etc.). These are
  // narrow useMemos that key on only the fields each lookup reads —
  // a name-field keystroke now skips all three.
  const cachedClassBuild = useMemo(
    () => (form.char_class ? getClassBuild(form.char_class) : null),
    [form.char_class],
  );
  // What the class table alone says this character's dice are. Kept apart
  // from the pool actually in force so the editor can show "auto" until the
  // GM overrides it, and offer the way back afterwards.
  const derivedHitDicePool = useMemo(
    () => (isPlayerCharacter
      ? (computeHitDicePool({ ...form, hit_dice_pool: [] }) || [])
      : (parseHitDiceString(form.hit_dice).pool.map(({ die, qty }) => ({ type: die, qty })))),
    [isPlayerCharacter, form.is_player_character, form.char_class, form.char_level,
      form.multiclasses, form.hit_dice],
  );
  // The pool in force: the explicit rows when there are any, else the derived
  // ones. This is what the rest tracker below ticks against.
  const cachedHitDicePool = useMemo(
    () => computeHitDicePool(form) || [],
    [form.is_player_character, form.char_class, form.char_level, form.multiclasses,
      form.hit_dice_pool, form.hit_dice],
  );

  // One place that writes hit dice, so the three things that have to agree
  // cannot drift: the structured rows, the printed formula every stat block
  // reads, and the spent-dice map the rest trackers tick.
  const applyHitDice = useCallback(({ pool, bonus }) => {
    setForm((f) => {
      const rows = normalizeHitDicePool(pool);
      const nextBonus = Math.trunc(Number(bonus) || 0);
      const next = { ...f, hit_dice_pool: rows, hit_dice_bonus: nextBonus };
      // With the rows cleared a player character goes back to the class
      // table; a monster keeps whatever its formula already said.
      const effective = rows.length
        ? rows
        : (computeHitDicePool({ ...next }) || []).map((r) => ({ die: r.type, qty: r.qty }));
      next.hit_dice = formatHitDiceFormula(effective, nextBonus);
      next.hit_dice_used_by_type = clampHitDiceUsed(effective, f.hit_dice_used_by_type);
      return next;
    });
  }, []);

  // A class or level change moves the derived pool, and the printed formula
  // has to follow it — otherwise a Fighter who reached level 5 still reads
  // "4d10" on their stat block. Only while the pool is on auto: explicit rows
  // are the GM's, and are left alone.
  useEffect(() => {
    if (!isPlayerCharacter) return;
    if (normalizeHitDicePool(form.hit_dice_pool).length) return;
    const rows = derivedHitDicePool.map(({ type, qty }) => ({ die: type, qty }));
    const formula = formatHitDiceFormula(rows, form.hit_dice_bonus);
    if (!formula || formula === form.hit_dice) return;
    setForm((f) => ({
      ...f,
      hit_dice: formula,
      hit_dice_used_by_type: clampHitDiceUsed(rows, f.hit_dice_used_by_type),
    }));
  }, [isPlayerCharacter, derivedHitDicePool, form.hit_dice_pool, form.hit_dice_bonus, form.hit_dice]);
  const cachedWeaponProfsExpanded = useMemo(
    () => Array.from(expandWeaponProficiency(form.weapon_proficiencies || '')),
    [form.weapon_proficiencies],
  );

  // Framing happens between "picked a file" and "it becomes the portrait".
  // `framerSrc` holds whatever the GM is currently framing; confirming
  // swaps in the cropped file so the normal multipart save path is
  // unchanged. Reset the input's value so re-picking the same file
  // still fires onChange.
  const [framerSrc, setFramerSrc] = useState(null);
  const framerObjectUrlRef = useRef(null);

  function openFramer(src, isObjectUrl) {
    if (framerObjectUrlRef.current) URL.revokeObjectURL(framerObjectUrlRef.current);
    framerObjectUrlRef.current = isObjectUrl ? src : null;
    setFramerSrc(src);
  }
  function closeFramer() {
    if (framerObjectUrlRef.current) URL.revokeObjectURL(framerObjectUrlRef.current);
    framerObjectUrlRef.current = null;
    setFramerSrc(null);
  }
  // Which slot the open framer is editing. The primary portrait defers to the
  // form's save; alternates upload immediately, so they need their own paths.
  //   'primary'            — existing behaviour, swaps the pending upload
  //   'alt-new'            — framing a queue of freshly picked alternates
  //   { replaceId: <id> }  — re-framing an alternate that already exists
  const [framerMode, setFramerMode] = useState('primary');
  const altQueueRef = useRef([]);   // files still to be framed
  const altFramedRef = useRef([]);  // framed results awaiting upload

  function handleFramed(file) {
    if (framerMode === 'alt-new') {
      altFramedRef.current.push(file);
      closeFramer();
      frameNextAlt();
      return;
    }
    if (framerMode && framerMode.replaceId) {
      const id = framerMode.replaceId;
      closeFramer();
      replaceAltFile(id, file);
      return;
    }
    if (framerMode === 'standee-new') {
      standeeFramedRef.current.push(file);
      closeFramer();
      frameNextStandee();
      return;
    }
    if (framerMode === 'standee') {
      closeFramer();
      setFramerMode('primary');
      uploadStandee(file);
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    closeFramer();
  }

  // Cancelling mid-batch abandons the whole batch rather than silently
  // uploading a half-framed subset — less surprising than a partial result,
  // and re-picking the files is cheap.
  function handleFramerCancel() {
    if (framerMode === 'alt-new') {
      altQueueRef.current = [];
      altFramedRef.current = [];
    }
    if (framerMode === 'standee-new') {
      standeeQueueRef.current = [];
      standeeFramedRef.current = [];
    }
    setFramerMode('primary');
    closeFramer();
  }

  function frameNextAlt() {
    const next = altQueueRef.current.shift();
    if (!next) {
      setFramerMode('primary');
      uploadFramedAlts();
      return;
    }
    setFramerMode('alt-new');
    openFramer(URL.createObjectURL(next), true);
  }

  function handleImageChange(e) {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setFramerMode('primary');
    openFramer(URL.createObjectURL(file), true);
  }

  // A token built in the embedded 2-Minute editor. It joins the pipeline at
  // exactly the point a file picked from disk does, so framing, saving and the
  // 3D standee all treat it as an ordinary portrait — there is no second,
  // parallel path that could behave differently.
  // Which slot the editor is filling: the map token face, or the 3D standee.
  const [tokenEditorOpen, setTokenEditorOpen] = useState(false);
  const [tokenEditorTarget, setTokenEditorTarget] = useState('primary');
  function handleTokenEditorPick(file) {
    setTokenEditorOpen(false);
    if (tokenEditorTarget === 'standee') {
      setFramerMode('standee');
      openFramer(URL.createObjectURL(file), true);
      return;
    }
    setFramerMode('primary');
    openFramer(URL.createObjectURL(file), true);
  }

  // Player-side AI portrait generation. Availability is fetched once on
  // mount via /api/ai/player-status — the endpoint just returns whether
  // the GM has image gen configured, never the URLs/keys themselves.
  // The actual generation hits /api/ai/player-generate-image which reads
  // the GM's saved config server-side, so credentials never reach the
  // player's browser.
  const [aiPortraitAvailable, setAiPortraitAvailable] = useState(false);
  const [aiPortraitLoading, setAiPortraitLoading] = useState(false);
  const [aiPortraitError, setAiPortraitError] = useState('');
  const [aiAppearancePrompt, setAiAppearancePrompt] = useState('');

  useEffect(() => {
    if (!isPlayerCharacter) return;
    let cancelled = false;
    fetch('/api/ai/player-status')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (!cancelled && data?.imageEnabled) setAiPortraitAvailable(true); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [isPlayerCharacter]);

  async function handleGeneratePortrait() {
    if (aiPortraitLoading) return;
    setAiPortraitLoading(true);
    setAiPortraitError('');
    try {
      const res = await fetch('/api/ai/player-generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name || 'Adventurer',
          appearance: aiAppearancePrompt.trim() || form.subtype || form.creature_type || '',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `Image gen failed (${res.status})`);
      if (!data?.image) throw new Error('No image returned');
      // Convert the data URL to a File so the multipart save path works
      // identically to a manually-uploaded portrait.
      const m = data.image.match(/^data:([^;]+);base64,(.+)$/);
      if (!m) throw new Error('Generated image was not a data URL');
      const bin = atob(m[2]);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
      const blob = new Blob([bytes], { type: m[1] });
      const ext = m[1].split('/')[1] || 'png';
      const file = new File([blob], `portrait.${ext}`, { type: m[1] });
      setImageFile(file);
      setImagePreview(data.image);
    } catch (err) {
      setAiPortraitError(err.message);
    } finally {
      setAiPortraitLoading(false);
    }
  }

  function handleCRChange(cr) {
    setForm((f) => ({ ...f, challenge_rating: cr, xp: CR_XP[cr] || 0 }));
  }

  // ── Race picker state ───────────────────────────────────────────────
  // Cascade: edition → (Type from form.creature_type) → race → sub-race.
  // Type is reused from the existing form field above so the picker
  // always reflects whatever the user already chose.
  // Defaults to every edition. Left on 2024 it hid every race that only ever
  // appeared in the 2014 books — the Tortle among them — and a race you cannot
  // see in the list reads as a race the app does not have.
  const [raceEdition, setRaceEdition] = useState('all');
  const [raceId, setRaceId] = useState('');
  const [subraceId, setSubraceId] = useState('');

  // Item-library picker modal — opened by "+ From library" in inventory.
  // Background picker state — modal opens from "Set Background" on
  // the Basic tab. The user picks one of four SRD-2024 backgrounds,
  // chooses how to allocate the +2/+1 (or +1/+1/+1) ability bumps,
  // and an equipment package (A or B = 50 GP).
  const [showBackgroundModal, setShowBackgroundModal] = useState(false);
  const [bgPickedId, setBgPickedId] = useState('');           // selected card
  const [bgAsiKind, setBgAsiKind]   = useState('2-1');        // '2-1' | '1-1-1'
  const [bgAsiPlus2, setBgAsiPlus2] = useState('');           // stat key
  const [bgAsiPlus1, setBgAsiPlus1] = useState('');           // stat key
  // A 2014 background grants no ability scores of its own, so the +1/+1/+1
  // spread needs a THIRD pick from the player. Listed (2024) backgrounds take
  // their three from the background itself and never use this.
  const [bgAsiPlus1b, setBgAsiPlus1b] = useState('');         // stat key
  // Picker filters.
  const [bgSearch, setBgSearch] = useState('');
  const [bgEditionFilter, setBgEditionFilter] = useState('all');   // all|srd2024|srd2014
  const [bgStatFilter, setBgStatFilter] = useState('');            // '' | ability field
  const [bgEquipment, setBgEquipment] = useState('a');
  // Chosen kind when a background grants "one kind of" a tool family.
  const [bgToolChoice, setBgToolChoice] = useState('');
  const [showFeatPicker, setShowFeatPicker] = useState(false);         // 'a' | 'b'

  const [showItemLibrary, setShowItemLibrary] = useState(false);

  // Spell library cache — keyed by lowercase name → full SRD row.
  // Class kits + auto-grant choices add spells by name only ({name,
  // level}); the effect below enriches each entry with the full
  // stat block (school, casting_time, range, damage_entries,
  // description, …) the moment the cache is available, so a Ranger
  // who just picked the class doesn't see "Hunter's Mark" with no
  // details — they get the full SRD record automatically.
  // Edition preference: 2024 first, then 2014. The user's class
  // came from the 2024 SRD pack, so default-newer makes the right
  // pick when both editions ship a spell with the same name.
  const [spellLibraryByName, setSpellLibraryByName] = useState(null);
  useEffect(() => {
    let cancelled = false;
    fetch('/api/spell-library')
      .then((r) => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then((rows) => {
        if (cancelled) return;
        // Newest edition wins on collision so the picker prefers
        // the 2024 stat block when both shapes exist for a name.
        const editionRank = (e) => (e === '2024' ? 2 : (e === '2014' ? 1 : 0));
        const map = new Map();
        for (const r of (Array.isArray(rows) ? rows : [])) {
          const k = String(r.name || '').toLowerCase();
          if (!k) continue;
          const prev = map.get(k);
          if (!prev || editionRank(r.edition) > editionRank(prev.edition)) {
            map.set(k, r);
          }
        }
        setSpellLibraryByName(map);
      })
      .catch(() => { /* offline or fresh install — no enrichment, names still work */ });
    return () => { cancelled = true; };
  }, []);

  // Enrich placeholder spell entries (just {name, level, prepared,
  // __source}) by merging in the full SRD record once the cache
  // has loaded. Only touches entries WITHOUT a description so a
  // user's manual tweaks to a granted spell aren't clobbered.
  useEffect(() => {
    if (!spellLibraryByName || spellLibraryByName.size === 0) return;
    const list = Array.isArray(form.spells) ? form.spells : [];
    if (list.length === 0) return;
    let mutated = false;
    const next = list.map((s) => {
      const lib = s && s.name ? spellLibraryByName.get(String(s.name).toLowerCase()) : null;
      // Anything still missing its description counts, not just bare
      // {name, level} stubs. A spell granted while its library row was a
      // half-empty scrape kept the few fields that row did have (school, say)
      // and so never re-merged once the row was filled in later.
      const isPlaceholder = !!(s && s.name && lib && !s.description && lib.description);
      // Repair pass: a GRANTED spell (race, background, class) stuck at level 0
      // when the library says it isn't a cantrip was mis-added before the fix
      // above. Hand-written entries have no __source and are left alone.
      if (!isPlaceholder) {
        if (lib && s.__source && Number(s.level) === 0 && Number(lib.level) > 0) {
          mutated = true;
          return { ...s, level: lib.level };
        }
        return s;
      }
      if (!lib) return s;
      mutated = true;
      return {
        ...s,
        level: (s.level === 0 || s.level == null) ? (lib.level ?? 0) : s.level,
        type: s.type || lib.type || '',
        school: s.school || lib.school || '',
        casting_time: s.casting_time || lib.casting_time || '',
        range_area: s.range_area || lib.range_area || '',
        duration: s.duration || lib.duration || '',
        comp_v: s.comp_v ?? lib.comp_v ?? false,
        comp_s: s.comp_s ?? lib.comp_s ?? false,
        comp_m: s.comp_m ?? lib.comp_m ?? false,
        comp_m_text: s.comp_m_text || lib.comp_m_text || '',
        attack_save: s.attack_save || lib.attack_save || '',
        save_ability: s.save_ability || lib.save_ability || '',
        damage_entries: (Array.isArray(s.damage_entries) && s.damage_entries.length)
          ? s.damage_entries
          : (Array.isArray(lib.damage_entries) ? lib.damage_entries : []),
        extra_effects: s.extra_effects || lib.extra_effects || '',
        description: s.description || lib.description || '',
      };
    });
    if (mutated) setForm((f) => ({ ...f, spells: next }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spellLibraryByName, form.spells]);
  // Bardic Inspiration "Grant" picker — opened from the BI row in the
  // Resources panel. Holds the def (so we know which die size + total)
  // until the user picks a target or cancels.
  const [bardicGrant, setBardicGrant] = useState(null);   // { def, total, used } | null
  const [bardicTargets, setBardicTargets] = useState([]); // array of Creature
  const [bardicLoading, setBardicLoading] = useState(false);
  const [bardicError, setBardicError] = useState('');
  useEffect(() => {
    if (!bardicGrant) return;
    let cancelled = false;
    setBardicLoading(true);
    setBardicError('');
    fetch('/api/creatures?filter=characters')
      .then((r) => (r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`)))
      .then((rows) => {
        if (cancelled) return;
        setBardicTargets(Array.isArray(rows)
          ? rows.filter((c) => c?.id && c.id !== creature?.id)
          : []);
      })
      .catch((err) => { if (!cancelled) setBardicError(String(err)); })
      .finally(() => { if (!cancelled) setBardicLoading(false); });
    return () => { cancelled = true; };
  }, [bardicGrant, creature?.id]);
  const [itemLibraryRows, setItemLibraryRows] = useState([]);
  const [itemLibrarySearch, setItemLibrarySearch] = useState('');
  const [itemLibraryType, setItemLibraryType] = useState('');
  // The library carries both printings of most items. Default to 2024 so the
  // picker matches the ruleset the class and background kits are built on;
  // '' shows everything.
  const [itemLibraryEdition, setItemLibraryEdition] = useState('2024');
  const [itemLibraryLoaded, setItemLibraryLoaded] = useState(false);
  // Item library cache — keyed by lowercase name, newest edition winning,
  // exactly like the spell cache above. Fetched on mount rather than when the
  // picker opens, because the enricher below needs it for class/background
  // kits the moment they're granted.
  const [itemLibraryByName, setItemLibraryByName] = useState(null);
  useEffect(() => {
    let cancelled = false;
    fetch('/api/item-library?role=dm')
      .then(r => (r.ok ? r.json() : []))
      .then(rows => {
        if (cancelled) return;
        const list = Array.isArray(rows) ? rows : [];
        const editionRank = (e) => (e === '2024' ? 2 : (e === '2014' ? 1 : 0));
        const map = new Map();
        for (const r of list) {
          const k = String(r.name || '').toLowerCase();
          if (!k) continue;
          const prev = map.get(k);
          if (!prev || editionRank(r.edition) > editionRank(prev.edition)) map.set(k, r);
          // Spacing varies between the kit lists and the library
          // ("Chainmail" vs "Chain Mail"), so key a squashed form too.
          const squashed = k.replace(/[\s'-]/g, '');
          if (squashed !== k && !map.has(squashed)) map.set(squashed, r);
        }
        setItemLibraryRows(list);
        setItemLibraryByName(map);
        setItemLibraryLoaded(true);
      })
      .catch(() => setItemLibraryLoaded(true));
    return () => { cancelled = true; };
  }, []);

  // Kit entries are written the way the rules phrase them, which doesn't
  // always match the library's row name: plurals ("Daggers"), trailing
  // qualifiers ("Spear (2)"), and leading articles all have to be tried.
  function lookupLibraryItem(name) {
    if (!itemLibraryByName) return null;
    const raw = String(name || '').trim().toLowerCase();
    if (!raw) return null;
    // "Arcane Focus (Crystal)" is stocked as plain "Crystal", so the
    // parenthetical is worth trying on its own.
    const paren = raw.match(/\(([^)]+)\)/)?.[1] || '';
    const tries = [
      raw,
      raw.replace(/\s*\(.*\)\s*$/, ''),
      raw.replace(/\s*x\s*\d+$/, ''),
      raw.replace(/^(a|an|the)\s+/, ''),
      raw.replace(/e?s$/, ''),
      raw.replace(/\s*\(.*\)\s*$/, '').replace(/e?s$/, ''),
      paren,
      raw.replace(/[\s'-]/g, ''),
    ];
    for (const t of tries) {
      const hit = itemLibraryByName.get(t.trim());
      if (hit) return hit;
    }
    return null;
  }

  // Convert a library row into an inventory item shape, then push.
  // Field names must match the inventory editor's expectations
  // exactly — the editor reads `desc` not `description`, `qty` not
  // `quantity`, and `damage_entries` (array) not the legacy
  // `damage_dice` / `damage_type` scalar pair. Earlier picker copied
  // into the wrong fields, so weapons came in with no damage,
  // properties or mastery showing.
  function libraryRowToItem(row) {
    // Only weapons should land as item_type='weapon' so the editor's
    // weapon-specific block (Range / Damage / Properties / Mastery)
    // appears for them. Magic ammunition has no damage of its own,
    // so it stays a generic magic item. Mundane gear like Arrows
    // maps to plain 'item' (the dropdown only has item / weapon /
    // armor / magic_item).
    const TYPE_MAP = {
      weapon: 'weapon',
      armor: 'armor',
      magic_item: 'magic_item',
      gear: 'item',
    };
    const item_type = TYPE_MAP[row.item_type] || 'item';

    // Damage entries — copy the full array (some weapons have multiple
    // damage lines). Fall back to a blank slot so the editor still
    // shows the damage row even when the library has none.
    const damage_entries = Array.isArray(row.damage_entries) && row.damage_entries.length
      ? row.damage_entries.map((d) => ({
          damage: d.damage || '',
          damage_type: d.damage_type || '',
        }))
      : [{ damage: '', damage_type: '' }];

    const next = {
      id: `inv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      item_type,
      name: row.name,
      qty: 1,
      desc: row.description || '',
      weight: Number(row.weight) || '',
      equipped: false,
      sheds_light: false,
      bright_ft: 20,
      dim_ft: 40,

      // Weapon fields (canonical inventory shape).
      damage_entries,
      weapon_range: row.weapon_range || '',
      attack_stat: row.attack_stat || 'STR',
      attack_bonus_misc: Number(row.attack_bonus_misc) || 0,
      damage_bonus_misc: Number(row.damage_bonus_misc) || 0,
      properties: row.properties || '',
      mastery: row.mastery || '',

      // Armor fields.
      ac_base: Number(row.ac_base) || 0,
      armor_category: row.armor_category || '',
      str_req: row.str_req ?? null,
      stealth_disadvantage: !!row.stealth_disadvantage,

      // Magic-item fields (also valid on +N armor / weapons).
      ac_bonus: Number(row.ac_bonus) || 0,
      rarity: row.rarity || '',
      attunement_required: !!row.attunement,
      attunement_req: row.attunement_req || '',

      // A homebrew item's hidden clause travels with it, still unrevealed: the
      // party has just found the thing, so they have not found out about it.
      ...(String(row.gm_secret || '').trim()
        ? { gm_secret: row.gm_secret, secret_revealed: false }
        : {}),

      _source: `library:${row.edition}:${row.name}`,
    };
    return next;
  }

  function pickItemFromLibrary(row) {
    setForm(prev => ({ ...prev, inventory: [...(prev.inventory || []), libraryRowToItem(row)] }));
    setShowItemLibrary(false);
  }

  // Class / background / race kits grant equipment by name only
  // ({name, qty, item_type:'item'}), so a Rapier arrived as a generic line
  // with no damage, properties or AC. Fill those in from the library the
  // moment it's available — same treatment granted spells get. Only entries
  // tagged with __source are touched, so hand-typed items are left alone.
  useEffect(() => {
    if (!itemLibraryByName || itemLibraryByName.size === 0) return;
    const list = Array.isArray(form.inventory) ? form.inventory : [];
    if (list.length === 0) return;
    let mutated = false;
    const next = list.map((it) => {
      if (!it || !it.__source || !it.name) return it;
      // Already carries real data — either enriched before, or edited by hand.
      const hasStats = (it.item_type && it.item_type !== 'item')
        || !!it.desc
        || (Array.isArray(it.damage_entries) && it.damage_entries.some((d) => d?.damage));
      if (hasStats) return it;
      const row = lookupLibraryItem(it.name);
      if (!row) return it;
      mutated = true;
      // The kit's own name, quantity and grant tag survive; everything else
      // comes from the library row.
      return {
        ...libraryRowToItem(row),
        id: it.id ?? `inv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: it.name,
        qty: Number(it.qty) || 1,
        equipped: !!it.equipped,
        __source: it.__source,
      };
    });
    if (mutated) setForm((f) => ({ ...f, inventory: next }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemLibraryByName, form.inventory]);

  // Custom GM-authored races + backgrounds — fetched once on mount,
  // merged with the static SRD lists so the existing picker sees them
  // as if they were always there.
  const [customRaces, setCustomRaces] = useState([]);
  const [customBackgrounds, setCustomBackgrounds] = useState([]);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [r, b] = await Promise.all([
          fetch('/api/custom/races').then((r) => r.ok ? r.json() : []),
          fetch('/api/custom/backgrounds').then((r) => r.ok ? r.json() : []),
        ]);
        if (cancelled) return;
        setCustomRaces(Array.isArray(r) ? r : []);
        setCustomBackgrounds(Array.isArray(b) ? b : []);
      } catch {}
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // Reshape custom-race rows into the same shape `data/races.js` exports,
  // so the picker logic and applyRacePicker work without branching. Each
  // sub-race row is grafted under its parent.
  const customRacesShaped = useMemo(() => {
    const byParent = new Map();
    for (const row of customRaces) {
      if (!row.parent_id) continue;
      const arr = byParent.get(row.parent_id) || [];
      arr.push({ id: row.id, name: row.name, ...(row.data || {}) });
      byParent.set(row.parent_id, arr);
    }
    const out = [];
    for (const row of customRaces) {
      if (row.parent_id) continue;
      out.push({
        id: row.id,
        name: row.name,
        edition: row.edition || 'custom',
        ...(row.data || {}),
        subraces: byParent.get(row.id) || [],
      });
    }
    return out;
  }, [customRaces]);

  // Helpers that merge static + custom for the active edition.
  const allRacesMerged = useMemo(() =>
    [...customRacesShaped]
  , [customRacesShaped]);

  const findRaceMerged = (id) => findRace(id) || allRacesMerged.find((r) => r.id === id) || null;

  // Reshape custom-background rows so the picker UI sees them with
  // the same fields as the SRD entries (id, name, description,
  // abilities[], feat{name,desc}, skills[], tool, equipment_*).
  const customBackgroundsShaped = useMemo(() =>
    customBackgrounds.map((row) => ({ id: row.id, name: row.name, ...(row.data || {}) }))
  , [customBackgrounds]);

  const allBackgroundsMerged = useMemo(() => {
    // Curated first, then the bulk import, then anything hand-authored in the
    // Origins panel. First id wins, so the sixteen curated 2024 backgrounds —
    // which carry real equipment packages — are never displaced by an
    // imported entry of the same id.
    const out = [];
    const seen = new Set();
    for (const b of [...BACKGROUNDS_2024, ...IMPORTED_BACKGROUNDS, ...customBackgroundsShaped]) {
      const id = String(b?.id || '');
      if (!id || seen.has(id)) continue;
      seen.add(id);
      out.push(b);
    }
    return out;
  }, [customBackgroundsShaped]);

  // What the picker actually lists: the merged set, narrowed by the search box
  // and the filters.
  const backgroundsFiltered = useMemo(() => {
    const q = bgSearch.trim().toLowerCase();
    return allBackgroundsMerged.filter((b) => {
      if (bgEditionFilter !== 'all' && (b.edition || 'srd2024') !== bgEditionFilter) return false;
      // Stat filter. A 2014 background affects nothing by itself but lets the
      // player choose, so it matches any stat rather than none — filtering it
      // out would hide exactly the entries the choice is for.
      if (bgStatFilter && !affectedAbilities(b).includes(bgStatFilter)) return false;
      if (!q) return true;
      return `${b.name} ${b.description || ''} ${(b.feat?.name) || ''}`
        .toLowerCase().includes(q);
    });
  }, [allBackgroundsMerged, bgSearch, bgEditionFilter, bgStatFilter]);

  // Look the id up in the same merged set the picker lists. Searching only
  // the curated sixteen meant an imported background resolved to null, so its
  // detail panel — ability spread included — never rendered and Apply stayed
  // disabled.
  const findBackgroundMerged = (id) =>
    allBackgroundsMerged.find((b) => b.id === id) || null;

  // ── Where each ability score's bonuses came from ──────────────────
  // The form stores one number per ability — the final score — because every
  // derived value (saves, skills, AC, spell save DC) reads it. The Ability
  // Scores tab still has to show the player what they typed apart from what a
  // background, class or feature added, so rebuild the attribution from the
  // same `added` records the revert paths already keep.
  const abilityBonusSources = useMemo(() => {
    const out = {
      strength: [], dexterity: [], constitution: [],
      intelligence: [], wisdom: [], charisma: [],
    };
    const push = (field, label, amount) => {
      if (!field || !out[field] || !amount) return;
      out[field].push({ label, amount });
    };

    const bgAdded = form.background_state?.added?.abilities;
    if (bgAdded && typeof bgAdded === 'object') {
      const bg = allBackgroundsMerged.find((b) => b.id === form.background);
      const label = `Background${bg?.name ? ` (${bg.name})` : ''}`;
      for (const [field, n] of Object.entries(bgAdded)) push(field, label, Number(n) || 0);
    }

    const classBumps = (state, label) => {
      for (const ab of (state?.added?.abilities || [])) {
        push(STAT_BY_ABIL[String(ab?.ability || '').toUpperCase()], label, Number(ab?.bonus) || 0);
      }
    };
    classBumps(form.class_state, `Class${form.char_class ? ` (${form.char_class})` : ''}`);
    for (const m of (form.multiclasses || [])) {
      classBumps(m.class_state, `Class${m.class ? ` (${m.class})` : ''}`);
    }

    // Features that raise a score by themselves (Primal Champion, …) stamp
    // what they applied onto the stored row when they land.
    for (const row of [
      ...(form.class_features || []),
      ...(form.feats || []),
      ...(form.special_abilities || []),
    ]) {
      for (const ab of (row?.__applied_abilities || [])) {
        push(
          STAT_BY_ABIL[String(ab?.ability || '').toUpperCase()],
          row?.name || 'Feature',
          Number(ab?.bonus) || 0,
        );
      }
    }
    return out;
  }, [
    form.background, form.background_state, form.class_state, form.char_class,
    form.multiclasses, form.class_features, form.feats, form.special_abilities,
    allBackgroundsMerged,
  ]);

  // Flat, feature-granted skill bonuses on the form as it stands right now,
  // so applying Primal Order updates the Skills tab without a save first.
  const skillFeatureBonuses = useMemo(
    () => featureSkillBonuses(form),
    [form.class_state, form.multiclasses, form.wisdom, form.intelligence,
      form.strength, form.dexterity, form.constitution, form.charisma],
  );

  // The list is NOT filtered by the sheet's Type dropdown. Every catalogue
  // race is a Humanoid, so setting Type to anything else emptied the picker
  // and looked like the races had vanished. Applying a race sets Type from
  // the race instead.
  const racePickerRaces = useMemo(() => {
    const stat = racesForEdition(raceEdition);
    const custom = allRacesMerged.filter((r) =>
      raceEdition === 'custom' || raceEdition === 'all'
        || r.edition === raceEdition || r.edition === 'custom'
    );
    return [...stat, ...custom];
  }, [raceEdition, allRacesMerged]);

  const selectedRaceObj = raceId ? findRaceMerged(raceId) : null;
  const selectedSubraceObj = (selectedRaceObj && subraceId)
    ? (selectedRaceObj.subraces || []).find((s) => s.id === subraceId) || null
    : null;

  // Reset chained selections when the upstream dropdown changes.
  useEffect(() => { setRaceId(''); setSubraceId(''); }, [raceEdition]);
  useEffect(() => { setSubraceId(''); }, [raceId]);

  // Apply the picked race + sub-race to the form. Two layers of
  // change:
  //   1. Trait rows are appended to special_abilities / actions /
  //      bonus_actions / reactions, each stamped with __source so a
  //      race-swap reverts them.
  //   2. Mechanical side-effects declared in the catalogue (senses,
  //      spells, resistances, languages, cantrips) are merged into
  //      the matching creature columns. The exact list of values the
  //      picker added lands in form.race_state.added so a later race
  //      change knows what to peel back without touching things the
  //      user typed in themselves.
  async function applyRacePicker() {
    if (!selectedRaceObj) return;
    if ((selectedRaceObj.subraces || []).length > 0 && !selectedSubraceObj) return;

    const race = selectedRaceObj;
    const sub = selectedSubraceObj;
    const traits = combinedRaceTraits(race, sub);
    const subtypeLabel = sub ? `${race.name} (${sub.name})` : race.name;
    const sourceTag = sub ? `race:${race.id}+${sub.id}` : `race:${race.id}`;

    // ── Build the full intended spell list (parent + sub, in catalogue
    // order) so we can level-gate it now AND remember the complete
    // list for the level-up watcher to back-fill later as the
    // character advances. Each ref keeps its minLevel so subsequent
    // re-evaluation is purely level-based.
    const allSpellRefs = [
      ...(race.addsSpells || []),
      ...((sub && sub.addsSpells) || []),
    ];
    const charLevel = Number(form.char_level) || 1;
    const eligibleNow = allSpellRefs.filter((ref) => (ref.minLevel ?? 1) <= charLevel);
    const fetchedSpells = await fetchSpellsByRef(eligibleNow);
    const castingAbility = (sub && sub.castingAbility) || race.castingAbility || '';

    // race_state keeps two lists: spells_pending (the FULL race spell
    // catalogue with minLevels) so the level-up watcher knows what's
    // still to come, and spells (the names actually written into
    // creature.spells right now) so revert can strip exactly those.
    const added = {
      // One entry per sense, at the best range on offer.
      //
      // Concatenating the two put Darkvision on the sheet twice for every
      // lineage that restates it — a Drow has it from being an Elf and again
      // from being a Drow. Keeping the LARGER range is also the rule: a
      // Drow sees 120 feet, not the Elf's 60, and which line happened to be
      // listed second should not decide that.
      senses:         dedupeSenses([...(race.setsSenses || []), ...(sub?.setsSenses || [])]),
      spells:         fetchedSpells.map((s) => s.name),
      spells_pending: allSpellRefs,
      resistances:    [...(race.addsResistances || []), ...(sub?.addsResistances || [])],
      languages:      [...(race.addsLanguages   || []), ...(sub?.addsLanguages   || [])],
      // Skills — GM-authored races can grant proficiency or expertise
      // through addsSkills: [{ skill, level }]. SRD races leave this
      // blank.
      skills:         [...((race.addsSkills || [])), ...((sub?.addsSkills || []))],
      casting_ability: castingAbility,
      // Speed: sub-race overrides parent (e.g. Wood Elf 35ft).
      speed: (sub && sub.setsSpeed) || race.setsSpeed || null,
      // Custom races may carry non-walk speeds.
      speed_fly:    (sub && sub.speed_fly)    || race.speed_fly    || 0,
      speed_swim:   (sub && sub.speed_swim)   || race.speed_swim   || 0,
      speed_climb:  (sub && sub.speed_climb)  || race.speed_climb  || 0,
      speed_burrow: (sub && sub.speed_burrow) || race.speed_burrow || 0,
      // Size: parent fixes most races (Goliath = Medium); sub may
      // override though no SRD race currently does.
      size:  (sub && sub.setsSize)  || race.setsSize  || null,
      // Dragonborn — sub-race tells us the breath weapon damage type.
      breath_weapon_type: (sub && sub.breathWeaponType) || null,
      // Natural armour — a Tortle's shell, a Lizardfolk's scales. Carried on
      // race_state so the AC calculation (and the equip guards that stop a
      // Tortle putting on chain mail) can read it from the sheet alone,
      // without loading the race catalogue. Sub-race wins when it declares
      // its own.
      natural_armor: (sub && sub.naturalArmor) || race.naturalArmor || null,
      // A flat always-on AC bonus from a trait (Troglodyte's thick hide).
      ac_bonus: Number((sub && sub.acBonus) || race.acBonus || 0) || 0,
    };
    const newRaceState = { race_id: race.id, sub_id: sub?.id || null, added };

    setForm((f) => {
      const prevState = f.race_state || {};
      const prevAdded = prevState.added || {};

      // Strip the previous race's auto-added items from the live
      // columns so a swap doesn't accumulate.
      const stripList = (rows, removeSet) =>
        (rows || []).filter((r) => !removeSet.has(r));
      const stripCSV = (txt, remove) => {
        const parts = String(txt || '')
          .split(/\s*,\s*/)
          .map((p) => p.trim())
          .filter(Boolean);
        const removeLower = new Set((remove || []).map((s) => String(s).toLowerCase()));
        return parts.filter((p) => !removeLower.has(p.toLowerCase())).join(', ');
      };
      // Senses: identity by `type` field — stripping anything whose
      // type appears in the previous added list.
      const stripSenses = (arr, types) => {
        const t = new Set((types || []).map((s) => s.type));
        return (arr || []).filter((s) => !t.has(s.type));
      };
      // Spells: identity by name.
      const stripSpells = (arr, names) => {
        const n = new Set((names || []).map((s) => String(s).toLowerCase()));
        return (arr || []).filter((s) => !n.has(String(s.name || '').toLowerCase()));
      };

      // Trait stripping (existing behaviour) for the four stat-block arrays.
      const stripTraits = (rows) =>
        (rows || []).filter((r) => !(typeof r?.__source === 'string' && r.__source.startsWith('race:')));

      const next = { ...f };
      next.subtype = subtypeLabel;
      next.creature_type = race.creature_type;

      // Append trait rows, tagged for revertability.
      const appendTraits = (key, items) => {
        next[key] = [
          ...stripTraits(f[key]),
          ...items.map((it) => ({ ...it, __source: sourceTag })),
        ];
      };
      appendTraits('special_abilities', traits.filter((t) => t.category === 'specialAbility').map(({ name, desc }) => ({ name, desc })));
      appendTraits('class_features',    traits.filter((t) => t.category === 'classFeature').map(({ name, desc, subclass }) => ({ name, desc, ...(subclass ? { subclass } : {}) })));
      appendTraits('actions',           traits.filter((t) => t.category === 'action').map(({ name, desc }) => ({ name, desc })));
      appendTraits('bonus_actions',     traits.filter((t) => t.category === 'bonusAction').map(({ name, desc }) => ({ name, desc })));
      appendTraits('reactions',         traits.filter((t) => t.category === 'reaction').map(({ name, desc }) => ({ name, desc })));

      // Senses — strip prev, append new (deduped).
      const sensesAfterStrip = stripSenses(f.senses, prevAdded.senses);
      const newSenseTypes = new Set(sensesAfterStrip.map((s) => s.type));
      next.senses = [
        ...sensesAfterStrip,
        ...added.senses.filter((s) => !newSenseTypes.has(s.type)),
      ];

      // Spells — strip prev, append new (each tagged with casting_ability + prepared).
      // Honour the per-ref `prepared` flag carried by fetchSpellsByRef
      // (defaults to true). A ref written as `{ name, prepared: false }`
      // adds the spell to the character's known list without flagging
      // it as always-prepared, so it has to be slotted into a prep
      // list like any other prepared-caster spell.
      next.spells = [
        ...stripSpells(f.spells, prevAdded.spells),
        ...fetchedSpells.map((s) => ({
          ...s,
          casting_ability: castingAbility || s.casting_ability || '',
          prepared: s.__ref_prepared !== false,
          __source: sourceTag,
        })),
      ];

      // Resistances — comma-separated text. Strip prev, append new.
      const resistancesAfterStrip = stripCSV(f.damage_resistances, prevAdded.resistances);
      const resistancesParts = [
        ...resistancesAfterStrip.split(/\s*,\s*/).filter(Boolean),
        ...added.resistances.filter((r) =>
          !resistancesAfterStrip.toLowerCase().split(/\s*,\s*/).includes(r.toLowerCase())
        ),
      ];
      next.damage_resistances = resistancesParts.join(', ');

      // Languages — same shape.
      const languagesAfterStrip = stripCSV(f.languages, prevAdded.languages);
      const languagesParts = [
        ...languagesAfterStrip.split(/\s*,\s*/).filter(Boolean),
        ...added.languages.filter((l) =>
          !languagesAfterStrip.toLowerCase().split(/\s*,\s*/).includes(l.toLowerCase())
        ),
      ];
      next.languages = languagesParts.join(', ');

      // Speed — sub-race wins over parent. Only overwrite when the
      // race specifies a value, so creatures the user has tweaked
      // manually keep their custom speed.
      if (added.speed) {
        next.speed_walk = added.speed;
      }
      // Custom races may also grant fly / swim / climb / burrow.
      // Don't blank existing values — only set when the race adds
      // a positive number.
      if (added.speed_fly)    next.speed_fly    = added.speed_fly;
      if (added.speed_swim)   next.speed_swim   = added.speed_swim;
      if (added.speed_climb)  next.speed_climb  = added.speed_climb;
      if (added.speed_burrow) next.speed_burrow = added.speed_burrow;

      // Skills — GM-authored races may grant proficiency / expertise.
      // Strip prev race's skill grants first (handled above for senses
      // etc., now do it here).
      if (Array.isArray(prevAdded.skills) && prevAdded.skills.length > 0) {
        const expert = { ...(next.skill_expertise || {}) };
        for (const raw of prevAdded.skills) {
          const sk = typeof raw === 'string' ? raw : raw.skill;
          if (sk) { next[sk] = null; delete expert[sk]; }
        }
        next.skill_expertise = expert;
      }
      if (Array.isArray(added.skills) && added.skills.length > 0) {
        const profBonus = next.proficiency_bonus ?? 2;
        const expert = { ...(next.skill_expertise || {}) };
        for (const raw of added.skills) {
          const sk = typeof raw === 'string' ? raw : raw.skill;
          const lvl = typeof raw === 'string' ? 'proficient' : (raw.level || 'proficient');
          if (!sk) continue;
          const stat = STAT_OF_SKILL[sk] || 'strength';
          const m = Math.floor(((next[stat] ?? 10) - 10) / 2);
          const mult = lvl === 'expertise' ? 2 : 1;
          next[sk] = m + profBonus * mult;
          if (lvl === 'expertise') expert[sk] = true;
        }
        next.skill_expertise = expert;
      }

      // Size — only set when the race fixes a single value. When the
      // race offers a choice (Tiefling: Medium or Small) we leave the
      // form's existing value alone; the picker UI's size dropdown
      // is the path the player uses to constrain it.
      if (added.size) {
        next.size = added.size.toLowerCase();
      } else if (race.sizeChoices && race.sizeChoices.length > 0) {
        // Reset to first allowed choice when the previous value isn't
        // in the new constraint set.
        const allowed = race.sizeChoices.map((s) => s.toLowerCase());
        if (!allowed.includes(String(f.size || '').toLowerCase())) {
          next.size = allowed[0];
        }
      }

      // Dragonborn breath weapon damage type — patch the inherited
      // Breath Weapon trait so the description names the right damage
      // type instead of "the type associated with your ancestry".
      if (added.breath_weapon_type) {
        next.special_abilities = (next.special_abilities || []).map((row) => {
          if (row?.name === 'Breath Weapon') {
            return {
              ...row,
              desc: String(row.desc || '').replace(
                /damage of the type associated with your (?:Draconic )?Ancestry/gi,
                `${added.breath_weapon_type} damage`
              ),
            };
          }
          return row;
        });
      }

      next.race_state = newRaceState;
      return next;
    });

    setRaceId('');
    setSubraceId('');
  }

  // Level-up watcher — when char_level rises and the creature has a
  // race applied, scan race_state.added.spells_pending for any spell
  // whose minLevel is now satisfied AND isn't already on
  // creature.spells. Fetch + append those, and update the
  // race_state.added.spells list so a future revert finds them. Runs
  // once per char_level change; no-op when no race is set.
  useEffect(() => {
    const rs = form.race_state;
    const pending = rs?.added?.spells_pending || [];
    if (!rs?.race_id || pending.length === 0) return;
    const charLevel = Number(form.char_level) || 1;
    const haveNames = new Set(
      (form.spells || []).map((s) => String(s.name || '').toLowerCase())
    );
    const newlyEligible = pending.filter(
      (ref) => (ref.minLevel ?? 1) <= charLevel
        && !haveNames.has(String(ref.name).toLowerCase())
    );
    if (newlyEligible.length === 0) return;
    const sourceTag = rs.sub_id
      ? `race:${rs.race_id}+${rs.sub_id}`
      : `race:${rs.race_id}`;
    const castingAbility = rs.added?.casting_ability || '';
    let cancelled = false;
    (async () => {
      const fetched = await fetchSpellsByRef(newlyEligible);
      if (cancelled || fetched.length === 0) return;
      setForm((f) => {
        const prevSpells = f.spells || [];
        // Final dedupe (in case the user added the same spell by
        // hand between fetch start and apply).
        const have = new Set(prevSpells.map((s) => String(s.name || '').toLowerCase()));
        const toAdd = fetched
          .filter((s) => !have.has(String(s.name || '').toLowerCase()))
          .map((s) => ({
            ...s,
            casting_ability: castingAbility || s.casting_ability || '',
            prepared: s.__ref_prepared !== false,
            __source: sourceTag,
          }));
        if (toAdd.length === 0) return f;
        const prevAddedSpells = f.race_state?.added?.spells || [];
        return {
          ...f,
          spells: [...prevSpells, ...toAdd],
          race_state: {
            ...(f.race_state || {}),
            added: {
              ...(f.race_state?.added || {}),
              spells: [...prevAddedSpells, ...toAdd.map((s) => s.name)],
            },
          },
        };
      });
    })();
    return () => { cancelled = true; };
  }, [form.char_level, form.race_state?.race_id, form.race_state?.sub_id]);

  // AC auto-sync — whenever equipped gear or DEX changes, recompute
  // and write the result into form.armor_class so the stat block /
  // iOS / web spectator all read the same value. Skips when the
  // computer has nothing to say (no equipped gear and no shield),
  // because that path leaves the manual armor_class alone for non-PC
  // creatures and edge cases like Unarmored Defense.
  useEffect(() => {
    const calc = computeAcFromGear(form, isPlayerCharacter);
    if (!calc) return;
    if (Number(form.armor_class) === calc.total) return;
    setField('armor_class', calc.total);
  }, [
    form.ac_misc_bonus,
    form.dexterity,
    form.shield_equipped,
    // Natural armour arrives with the race and changes the AC on its own —
    // without these the shell a Tortle just gained showed in the readout but
    // never reached the stored armor_class the token and stat block read.
    JSON.stringify(form.race_state?.added?.natural_armor || null),
    form.race_state?.added?.ac_bonus,
    // Loxodon's natural armour adds CON, so the score has to be watched too.
    form.constitution,
    // The inventory drives the bulk of the change; encode just the
    // bits that affect AC math so we don't recompute when the user
    // edits an item's description / qty / weight.
    JSON.stringify(
      (form.inventory || []).map((it) => ({
        t: it.item_type,
        e: !!it.equipped,
        ab: it.ac_base,
        bn: it.ac_bonus,
        cat: it.armor_category,
      }))
    ),
  ]);

  // Look up spells by name+edition in the live library. Returns the
  // full rows so the picker can copy them into creature.spells with
  // damage_entries / school / etc. populated. Skips silently when a
  // spell isn't in the library so a typo in races.js doesn't break
  // the entire apply.
  //
  // Per-ref `prepared` flag is forwarded onto the returned row as
  // `__ref_prepared` so callers materializing into creature.spells
  // can honour the author's choice without a second name lookup.
  // Defaults to true when the ref doesn't specify, preserving the
  // pre-existing "race spells are always prepared" behaviour.
  async function fetchSpellsByRef(refs) {
    if (!refs || refs.length === 0) return [];
    const out = [];
    for (const ref of refs) {
      try {
        const params = new URLSearchParams({ search: ref.name });
        const res = await fetch(`/api/spell-library?${params}`);
        if (!res.ok) continue;
        const list = await res.json();
        // Match by exact name + matching edition when supplied.
        const exact = (list || []).find((s) =>
          String(s.name).toLowerCase() === String(ref.name).toLowerCase()
          && (!ref.edition || String(s.edition) === String(ref.edition))
        ) || (list || []).find((s) =>
          String(s.name).toLowerCase() === String(ref.name).toLowerCase()
        );
        if (exact) out.push({ ...exact, __ref_prepared: ref.prepared !== false });
      } catch (err) {
        console.warn('race spell fetch failed for', ref.name, err);
      }
    }
    return out;
  }

  // Clear the racially-sourced entries without applying a new race —
  // surfaced in the picker as "Remove current race" for cases where
  // the player wants to go back to a blank slate. Same revert logic
  // as applyRacePicker but without writing a new race in.
  function clearRacePickerContribution() {
    const stripTraits = (rows) =>
      (rows || []).filter((r) => !(typeof r?.__source === 'string' && r.__source.startsWith('race:')));
    setForm((f) => {
      const prevAdded = (f.race_state && f.race_state.added) || {};
      const sensesTypes = new Set((prevAdded.senses || []).map((s) => s.type));
      const spellNames  = new Set((prevAdded.spells || []).map((s) => String(s).toLowerCase()));
      const resistsLow  = new Set((prevAdded.resistances || []).map((s) => String(s).toLowerCase()));
      const langsLow    = new Set((prevAdded.languages   || []).map((s) => String(s).toLowerCase()));

      const stripCSV = (txt, removeLower) =>
        String(txt || '')
          .split(/\s*,\s*/)
          .map((p) => p.trim())
          .filter(Boolean)
          .filter((p) => !removeLower.has(p.toLowerCase()))
          .join(', ');

      return {
        ...f,
        subtype: '',
        special_abilities: stripTraits(f.special_abilities),
        actions:           stripTraits(f.actions),
        bonus_actions:     stripTraits(f.bonus_actions),
        reactions:         stripTraits(f.reactions),
        senses:  (f.senses || []).filter((s) => !sensesTypes.has(s.type)),
        spells:  (f.spells || []).filter((s) => !spellNames.has(String(s.name || '').toLowerCase())),
        damage_resistances: stripCSV(f.damage_resistances, resistsLow),
        languages:          stripCSV(f.languages, langsLow),
        // Speed / size aren't strictly reverted because we don't
        // know the player's intent — they may have been customising
        // a base value. Only the race_state metadata gets cleared.
        race_state: {},
      };
    });
  }

  // ── Background picker ────────────────────────────────────────
  // Each form field touched is also recorded in `background_state`
  // so a future swap or removal can revert exactly those values
  // (mirror of how the race picker uses race_state.added).
  const STAT_OF_SKILL = {
    skill_acrobatics: 'dexterity',     skill_animal_handling: 'wisdom',
    skill_arcana: 'intelligence',      skill_athletics: 'strength',
    skill_deception: 'charisma',       skill_history: 'intelligence',
    skill_insight: 'wisdom',           skill_intimidation: 'charisma',
    skill_investigation: 'intelligence', skill_medicine: 'wisdom',
    skill_nature: 'intelligence',      skill_perception: 'wisdom',
    skill_performance: 'charisma',     skill_persuasion: 'charisma',
    skill_religion: 'intelligence',    skill_sleight_of_hand: 'dexterity',
    skill_stealth: 'dexterity',        skill_survival: 'wisdom',
  };
  // Ability code → save bonus column / ability score column.
  // Used by the class-kit save grant in applyAdds.
  const SAVE_FIELD = {
    STR: 'save_str', DEX: 'save_dex', CON: 'save_con',
    INT: 'save_int', WIS: 'save_wis', CHA: 'save_cha',
  };
  const STAT_FIELD = {
    STR: 'strength', DEX: 'dexterity', CON: 'constitution',
    INT: 'intelligence', WIS: 'wisdom', CHA: 'charisma',
  };

  function applyBackground(bg, asi /* { kind, plus2, plus1 } */, equipKey /* 'a' | 'b' */, toolChoice /* specific kind, when the background offers a choice */) {
    if (!bg) return;
    const sourceTag = `background:${bg.id}`;
    const profBonus = form.proficiency_bonus ?? 2;
    // "Artisan's Tools (choose one kind)" becomes the actual kind the player
    // picked, both on the proficiency line and in the equipment list.
    const toolChoices = toolChoicesFor(bg.tool);
    const resolvedTool = (toolChoices && toolChoice) ? toolChoice : bg.tool;

    // Build the ability-bump map up front so prev/next are symmetric.
    const newBumps = {};
    if (asi.kind === '2-1' && asi.plus2 && asi.plus1 && asi.plus2 !== asi.plus1) {
      newBumps[asi.plus2] = 2;
      newBumps[asi.plus1] = 1;
    } else {
      // +1 / +1 / +1.
      //
      // A 2024 background spreads it across its own three listed scores. A
      // 2014 one lists none — the player named three in the picker instead —
      // so fall back to those. Without this the free spread iterated an empty
      // array and granted nothing at all, silently.
      const three = (bg.abilities && bg.abilities.length)
        ? bg.abilities
        : [asi.plus2, asi.plus1, asi.plus1b].filter(Boolean);
      for (const a of three) newBumps[a] = 1;
    }

    setForm((f) => {
      const prevAdded = (f.background_state && f.background_state.added) || {};
      const next = { ...f };

      // Strip previous-background tagged rows.
      const stripBg = (rows) => (rows || []).filter((r) =>
        !(typeof r?.__source === 'string' && r.__source.startsWith('background:'))
      );
      next.feats = stripBg(f.feats);
      next.special_abilities = stripBg(f.special_abilities);
      next.inventory = (f.inventory || []).filter((it) =>
        !(typeof it?._source === 'string' && it._source.startsWith('background:'))
      );

      // Roll back previous ability bumps and skill flags.
      if (prevAdded.abilities) {
        for (const [stat, n] of Object.entries(prevAdded.abilities)) {
          next[stat] = Math.max(1, (next[stat] || 10) - n);
        }
      }
      // Strip previously-added skills + any expertise flags they
      // bumped on. Skills can be plain strings (legacy SRD shape) or
      // { skill, level } objects.
      if (Array.isArray(prevAdded.skills)) {
        const expert = { ...(next.skill_expertise || {}) };
        for (const raw of prevAdded.skills) {
          const skill = typeof raw === 'string' ? raw : raw.skill;
          if (skill) {
            next[skill] = null;
            delete expert[skill];
          }
        }
        next.skill_expertise = expert;
      }
      // Roll back previous currency.
      if (prevAdded.currency_gp) {
        next.currency_gp = Math.max(0, (f.currency_gp || 0) - prevAdded.currency_gp);
      }

      // Apply new background. Most imported (2014) backgrounds carry no
      // origin feat at all, and spreading `undefined` wrote a nameless row
      // onto the sheet.
      next.feats = bg.feat
        ? [...next.feats, { ...bg.feat, __source: sourceTag }]
        : next.feats;

      // Tool prof — append to the CSV. Strip the previous-background
      // tool entry first so a swap doesn't leave the old one behind.
      const toolCsvParts = String(f.tool_proficiencies || '')
        .split(/\s*,\s*/)
        .map((p) => p.trim())
        .filter(Boolean);
      const cleanTools = prevAdded.tool
        ? toolCsvParts.filter((p) => p.toLowerCase() !== String(prevAdded.tool).toLowerCase())
        : toolCsvParts;
      if (resolvedTool && !cleanTools.some((p) => p.toLowerCase() === resolvedTool.toLowerCase())) {
        cleanTools.push(resolvedTool);
      }
      next.tool_proficiencies = cleanTools.join(', ');

      for (const [stat, n] of Object.entries(newBumps)) {
        next[stat] = Math.min(20, (next[stat] || 10) + n);
      }
      // Skills entry can be either a plain string (= proficient) or
      // { skill, level: 'proficient' | 'expertise' } so GM-authored
      // backgrounds can grant expertise. Expertise doubles the prof
      // bonus on that skill AND flips the skill_expertise flag.
      const newExpertise = { ...(next.skill_expertise || {}) };
      for (const raw of bg.skills) {
        const skill = typeof raw === 'string' ? raw : raw.skill;
        const level = typeof raw === 'string' ? 'proficient' : (raw.level || 'proficient');
        if (!skill) continue;
        const stat = STAT_OF_SKILL[skill] || 'strength';
        const m = Math.floor(((next[stat] ?? 10) - 10) / 2);
        const mult = level === 'expertise' ? 2 : 1;
        next[skill] = m + profBonus * mult;
        if (level === 'expertise') newExpertise[skill] = true;
      }
      next.skill_expertise = newExpertise;

      // Equipment + starting currency.
      // Base kit plus whichever option was chosen, in every coin column the
      // sheet has. A background with no equipment at all contributes nothing
      // rather than throwing, which is what reading the item list unguarded
      // used to do.
      const eqModel = bgEquipmentModel(bg);
      const chosenOpt = eqModel.options.find((o) => o.id === equipKey)
        || eqModel.options[0] || { items: [], gp: 0, sp: 0, cp: 0 };
      const coinAdd = {
        gp: (Number(eqModel.base.gp) || 0) + (Number(chosenOpt.gp) || 0),
        sp: (Number(eqModel.base.sp) || 0) + (Number(chosenOpt.sp) || 0),
        cp: (Number(eqModel.base.cp) || 0) + (Number(chosenOpt.cp) || 0),
      };
      next.currency_gp = (next.currency_gp || 0) + coinAdd.gp;
      next.currency_sp = (next.currency_sp || 0) + coinAdd.sp;
      next.currency_cp = (next.currency_cp || 0) + coinAdd.cp;
      const chosenItems = [...(eqModel.base.items || []), ...(chosenOpt.items || [])];
      {
        for (const it of chosenItems) {
          next.inventory = [
            ...next.inventory,
            {
              id: `inv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              item_type: 'item',
              // The kit in the equipment list is the same generic entry as the
              // proficiency, so it takes the chosen kind too.
              name: (toolChoices && toolChoice && it.name === toolChoices.base) ? toolChoice : it.name,
              qty: it.qty,
              desc: '',
              weight: '',
              equipped: false,
              sheds_light: false,
              bright_ft: 20,
              dim_ft: 40,
              damage_entries: [{ damage: '', damage_type: '' }],
              properties: '',
              _source: sourceTag,
            },
          ];
        }
      }

      next.background = bg.id;
      next.background_state = {
        id: bg.id,
        added: {
          feat: bg.feat?.name || '',
          skills: [...bg.skills],
          abilities: newBumps,
          tool: resolvedTool,
          equipment: equipKey,
          // `coinAdd.gp` — this was left behind as `gpAdded` when the single
          // gold figure grew into the gp/sp/cp trio above. The name resolved
          // to nothing, so picking a background threw a ReferenceError and
          // took the character sheet down with it.
          currency_gp: coinAdd.gp,
        },
      };
      return next;
    });
  }

  function removeBackground() {
    setForm((f) => {
      const prevAdded = (f.background_state && f.background_state.added) || {};
      const next = { ...f };
      const stripBg = (rows) => (rows || []).filter((r) =>
        !(typeof r?.__source === 'string' && r.__source.startsWith('background:'))
      );
      next.feats = stripBg(f.feats);
      next.special_abilities = stripBg(f.special_abilities);
      next.inventory = (f.inventory || []).filter((it) =>
        !(typeof it?._source === 'string' && it._source.startsWith('background:'))
      );
      if (prevAdded.abilities) {
        for (const [stat, n] of Object.entries(prevAdded.abilities)) {
          next[stat] = Math.max(1, (next[stat] || 10) - n);
        }
      }
      if (Array.isArray(prevAdded.skills)) {
        const expert = { ...(next.skill_expertise || {}) };
        for (const raw of prevAdded.skills) {
          const skill = typeof raw === 'string' ? raw : raw.skill;
          if (skill) {
            next[skill] = null;
            delete expert[skill];
          }
        }
        next.skill_expertise = expert;
      }
      if (prevAdded.currency_gp) {
        next.currency_gp = Math.max(0, (f.currency_gp || 0) - prevAdded.currency_gp);
      }
      // Strip the auto-applied tool from the CSV.
      if (prevAdded.tool) {
        next.tool_proficiencies = String(f.tool_proficiencies || '')
          .split(/\s*,\s*/)
          .map((p) => p.trim())
          .filter((p) => p && p.toLowerCase() !== String(prevAdded.tool).toLowerCase())
          .join(', ');
      }
      next.background = '';
      next.background_state = {};
      return next;
    });
  }

  // ── Class choices (Cleric Divine Order, Fighter Weapon Mastery, …) ──
  // Reads `class_state.choices = { [choiceId]: pick }` and applies
  // each pick's effects onto the live form. Strip-prev semantics
  // mirror the race / background appliers.
  function applyClassChoices(choiceList, picks /* { [choiceId]: pickPayload } */) {
    // All primary-class contributions tagged "cls:primary:..." so a
    // multiclass slot's tags ("cls:mc:<id>:...") aren't touched when
    // the primary picker re-applies.
    const sourceTagFor = (choice, optionOrPicks) => {
      if (choice.kind === 'single') {
        return `cls:primary:${form.char_class}:${choice.id}:${optionOrPicks}`;
      }
      return `cls:primary:${form.char_class}:${choice.id}`;
    };

    setForm((f) => {
      const prevState = f.class_state || {};
      const prevAdded = prevState.added || {};
      const next = { ...f };
      const profBonus = next.proficiency_bonus ?? 2;

      // Strip only the PRIMARY class's prior contributions.
      const stripBy = (rows, prefix) => (rows || []).filter((r) =>
        !(typeof r?.__source === 'string' && r.__source.startsWith(prefix))
      );
      next.special_abilities = stripBy(f.special_abilities, 'cls:primary:');
      next.actions           = stripBy(f.actions, 'cls:primary:');
      next.bonus_actions     = stripBy(f.bonus_actions, 'cls:primary:');
      next.reactions         = stripBy(f.reactions, 'cls:primary:');

      // Roll back skills + expertise that prev choices set.
      if (Array.isArray(prevAdded.skills) && prevAdded.skills.length) {
        const expert = { ...(next.skill_expertise || {}) };
        for (const sk of prevAdded.skills) { next[sk] = null; delete expert[sk]; }
        next.skill_expertise = expert;
      }
      // Roll back armor / weapon CSV additions.
      const stripCsv = (csv, removeLower) => String(csv || '')
        .split(/\s*,\s*/).map((p) => p.trim()).filter(Boolean)
        .filter((p) => !removeLower.has(p.toLowerCase())).join(', ');
      if (Array.isArray(prevAdded.weapons) && prevAdded.weapons.length) {
        const r = new Set(prevAdded.weapons.map((s) => s.toLowerCase()));
        next.weapon_proficiencies = stripCsv(f.weapon_proficiencies, r);
      }
      if (Array.isArray(prevAdded.armor) && prevAdded.armor.length) {
        for (const a of prevAdded.armor) {
          if (a === 'light')   next.prof_light_armor  = false;
          if (a === 'medium')  next.prof_medium_armor = false;
          if (a === 'heavy')   next.prof_heavy_armor  = false;
          if (a === 'shields') next.prof_shields      = false;
        }
      }
      // Roll back spells.
      if (Array.isArray(prevAdded.spells) && prevAdded.spells.length) {
        const drop = new Set(prevAdded.spells.map((s) => String(s).toLowerCase()));
        next.spells = (f.spells || []).filter((s) =>
          !drop.has(String(s.name || '').toLowerCase())
        );
      }

      // Apply new choices.
      const added = { skills: [], weapons: [], armor: [], spells: [], traits_count: 0, saves: [], languages: [], abilities: [], skill_bonuses: [] };
      const expert = { ...(next.skill_expertise || {}) };

      // Helper: apply an `adds` block onto `next`, recording into `added`.
      // Used by both single-pick and auto-grant choices.
      function applyAdds(adds, tag) {
        if (!adds) return;
        // Ability score bonuses, BEFORE anything derived from a stat.
        //
        // A feature that raises a stat outright (a Barbarian's Primal
        // Champion, say) has to land before the save and skill bonuses below,
        // which read next[stat] to compute a modifier — applied after them,
        // the stat would go up while every number derived from it stayed
        // behind.
        //
        // Recorded as {ability, bonus} so the revert can subtract exactly what
        // was granted. Reverting by recomputing from a base is not available
        // here: by then the sheet no longer knows what the stat was before.
        for (const ab of (adds.abilities || [])) {
          const statField = STAT_FIELD[String(ab.ability || '').toUpperCase()];
          const amt = Number(ab.bonus) || 0;
          if (!statField || !amt) continue;
          next[statField] = (Number(next[statField]) || 10) + amt;
          added.abilities.push({ ability: String(ab.ability).toUpperCase(), bonus: amt });
        }
        // Flat bonuses to named skills, scaled off an ability modifier —
        // a Druid's Primal Order (Magician), a Cleric's Divine Order
        // (Thaumaturge). These are NOT proficiency: they apply whether or
        // not the character is trained, so they cannot be folded into the
        // stored skill_X column (which is null when untrained). They live
        // in class_state.added.skill_bonuses and are added at roll time by
        // skillRows(). Recording the ability rather than a number keeps the
        // bonus correct when Wisdom later changes.
        for (const sb of (adds.skill_bonuses || [])) {
          const skills = (sb.skills || []).filter((k) => STAT_OF_SKILL[k]);
          if (!skills.length || !sb.ability) continue;
          added.skill_bonuses.push({
            skills,
            ability: String(sb.ability).toLowerCase(),
            min: Number(sb.min) || 0,
            label: sb.label || '',
          });
        }
        // Extra cantrips a choice grants (Primal Order: Magician). A count,
        // not a named spell — the player still chooses which one — so it is
        // recorded as a number and read by the capacity bar.
        if (Number(adds.cantrip_bonus)) {
          added.cantrip_bonus = (Number(added.cantrip_bonus) || 0) + Number(adds.cantrip_bonus);
        }
        for (const a of (adds.armor || [])) {
          if (a === 'light')   next.prof_light_armor  = true;
          if (a === 'medium')  next.prof_medium_armor = true;
          if (a === 'heavy')   next.prof_heavy_armor  = true;
          if (a === 'shields') next.prof_shields      = true;
          added.armor.push(a);
        }
        if (adds.weapons && adds.weapons.length) {
          const have = String(next.weapon_proficiencies || '')
            .split(/\s*,\s*/).map((p) => p.trim()).filter(Boolean);
          for (const w of adds.weapons) {
            if (!have.some((p) => p.toLowerCase() === w.toLowerCase())) {
              have.push(w);
              added.weapons.push(w);
            }
          }
          next.weapon_proficiencies = have.join(', ');
        }
        // Granted languages — Druidic-style class language pickup.
        // Merges into the existing comma-separated languages column
        // and tracks adds in added.languages so revert clears only
        // the class-granted ones, leaving manually-added languages
        // alone. Trailing fluency qualifiers like "(understands but
        // cannot speak)" are NOT added by class kits — those stay a
        // manual concern via the LanguagePicker.
        if (adds.languages && adds.languages.length) {
          const have = String(next.languages || '')
            .split(/\s*,\s*/).map((p) => p.trim()).filter(Boolean);
          // Strip trailing qualifier when comparing so "Druidic"
          // matches "Druidic (only)" and we don't double-add.
          const haveBare = new Set(have.map((p) =>
            p.replace(/\s*\(.*\)\s*$/, '').toLowerCase()
          ));
          for (const lang of adds.languages) {
            const bare = String(lang).replace(/\s*\(.*\)\s*$/, '').trim();
            if (!bare) continue;
            if (haveBare.has(bare.toLowerCase())) continue;
            have.push(bare);
            added.languages.push(bare);
            haveBare.add(bare.toLowerCase());
          }
          next.languages = have.join(', ');
        }
        // Save proficiencies — class kit grants two saves to first-class
        // characters. Compute the bonus = ability mod + PB. Track in
        // added.saves so removeClassChoices can null them on revert.
        for (const ab of (adds.saves || [])) {
          const field = SAVE_FIELD[ab];
          const stat  = STAT_FIELD[ab];
          if (!field || !stat) continue;
          const m = Math.floor(((next[stat] ?? 10) - 10) / 2);
          next[field] = m + profBonus;
          added.saves.push(ab);
        }
        for (const sObj of (adds.skills || [])) {
          const sk = typeof sObj === 'string' ? sObj : sObj.skill;
          const lvl = typeof sObj === 'string' ? 'proficient' : (sObj.level || 'proficient');
          if (!sk || !STAT_OF_SKILL[sk]) continue;
          const m = Math.floor(((next[STAT_OF_SKILL[sk]] ?? 10) - 10) / 2);
          const mult = lvl === 'expertise' ? 2 : 1;
          next[sk] = m + profBonus * mult;
          if (lvl === 'expertise') expert[sk] = true;
          added.skills.push(sk);
        }
        for (const t of (adds.traits || [])) {
          const target = t.category === 'action' ? 'actions'
            : t.category === 'bonusAction' ? 'bonus_actions'
            : t.category === 'reaction' ? 'reactions'
            : 'special_abilities';
          next[target] = [
            ...(next[target] || []),
            { name: t.name, desc: t.desc, __source: tag },
          ];
          added.traits_count++;
        }
        for (const sp of (adds.spells || [])) {
          if (!sp?.name) continue;
          const has = (next.spells || []).some((s) =>
            String(s.name || '').toLowerCase() === sp.name.toLowerCase()
          );
          if (!has) {
            // Granted spells often arrive as just a name. Take the level from
            // the library rather than defaulting to 0 — that default is what
            // made every subclass spell land as a cantrip.
            const lib = spellLibraryByName?.get(String(sp.name).toLowerCase());
            next.spells = [
              ...(next.spells || []),
              {
                id: Date.now() + Math.random(),
                name: sp.name,
                level: sp.level ?? lib?.level ?? 0,
                prepared: sp.prepared !== false,
                __source: tag,
              },
            ];
            added.spells.push(sp.name);
          }
        }
      }

      // Level the gate is measured against. Read off the form rather
      // than trusting the caller to pre-filter — callers pass the FULL
      // choice list (pickable entries must survive a re-apply), so the
      // at_level gate has to live here or a level-10 feature lands on a
      // level-3 sheet.
      const effLevel = Math.max(1, Number(f.char_level) || 1);

      for (const choice of choiceList) {
        // Auto-grant choices need no pick, but a per-level feature only
        // applies once the character has reached its level.
        if (choice.kind === 'auto') {
          if ((choice.at_level || 1) > effLevel) continue;
          applyAdds(choice.adds, `cls:primary:${f.char_class}:${choice.id}:auto`);
          continue;
        }

        const pick = picks[choice.id];
        if (!pick) continue;

        if (choice.kind === 'single') {
          const opt = (choice.options || []).find((o) => o.id === pick.option_id);
          if (!opt) continue;
          applyAdds(opt.adds, sourceTagFor(choice, opt.id));
        }

        if (choice.kind === 'multi-weapons') {
          const have = String(next.weapon_proficiencies || '')
            .split(/\s*,\s*/).map((p) => p.trim()).filter(Boolean);
          for (const w of (pick.picks || [])) {
            if (!w) continue;
            if (!have.some((p) => p.toLowerCase() === w.toLowerCase())) {
              have.push(w);
              added.weapons.push(w);
            }
          }
          next.weapon_proficiencies = have.join(', ');
        }

        if (choice.kind === 'multi-options') {
          // Invocations, metamagic, manoeuvres. Each picked option becomes a
          // trait on the sheet — that is what a player reads mid-session —
          // and carries through any spell it grants, tagged like every other
          // class grant so the revert takes it back off again.
          for (const id of (pick.picks || [])) {
            const opt = (choice.options || []).find((o) => o.id === id);
            if (!opt) continue;
            applyAdds({
              traits: [{ name: opt.name, desc: opt.desc, category: 'specialAbility' }],
              ...(opt.spells?.length
                ? { spells: opt.spells.map((n) => ({ name: n, prepared: true })) }
                : {}),
            }, sourceTagFor(choice, id));
          }
        }

        if (choice.kind === 'multi-skills') {
          // Two flavours share this kind: a class's STARTING proficiencies
          // (grant: 'proficient') and Expertise (the default), which doubles
          // the Proficiency Bonus on a skill you already have.
          const asProficiency = choice.grant === 'proficient';
          for (const sk of (pick.picks || [])) {
            if (!sk || !STAT_OF_SKILL[sk]) continue;
            const m = Math.floor(((next[STAT_OF_SKILL[sk]] ?? 10) - 10) / 2);
            next[sk] = asProficiency ? m + profBonus : m + profBonus * 2;
            if (!asProficiency) expert[sk] = true;
            added.skills.push(sk);
          }
        }
      }

      // ── Subclass always-prepared spells ──────────────────────────────
      // Life Domain's Aid/Bless, Oath of Devotion's Shield of Faith, a
      // patron's spell table: these are granted, not chosen, so they're
      // applied here rather than being another pick. Only rows at or below
      // the character's level land, and they're tagged like every other
      // class contribution so re-applying strips the old set first.
      // Entries carry just the name — the library enricher fills in level,
      // school and components once it has loaded.
      {
        const subSpells = subclassPreparedSpells(f.char_class, f.char_subclass, effLevel);
        if (subSpells.length) {
          applyAdds(
            { spells: subSpells.map((name) => ({ name, prepared: true })) },
            `cls:primary:${f.char_class}:subclass-spells`,
          );
        }
      }

      next.skill_expertise = expert;
      next.class_state = {
        class_id: f.char_class || '',
        subclass_id: f.char_subclass || '',
        applied_at_level: Math.max(1, Number(f.char_level) || 1),
        choices: picks,
        added,
      };
      return next;
    });
  }

  function removeClassChoices() {
    setForm((f) => {
      const prevAdded = (f.class_state && f.class_state.added) || {};
      const next = { ...f };
      const stripBy = (rows, prefix) => (rows || []).filter((r) =>
        !(typeof r?.__source === 'string' && r.__source.startsWith(prefix))
      );
      next.special_abilities = stripBy(f.special_abilities, 'cls:primary:');
      next.actions           = stripBy(f.actions, 'cls:primary:');
      next.bonus_actions     = stripBy(f.bonus_actions, 'cls:primary:');
      next.reactions         = stripBy(f.reactions, 'cls:primary:');
      if (Array.isArray(prevAdded.skills) && prevAdded.skills.length) {
        const expert = { ...(next.skill_expertise || {}) };
        for (const sk of prevAdded.skills) { next[sk] = null; delete expert[sk]; }
        next.skill_expertise = expert;
      }
      const stripCsv = (csv, removeLower) => String(csv || '')
        .split(/\s*,\s*/).map((p) => p.trim()).filter(Boolean)
        .filter((p) => !removeLower.has(p.toLowerCase())).join(', ');
      if (Array.isArray(prevAdded.weapons) && prevAdded.weapons.length) {
        const r = new Set(prevAdded.weapons.map((s) => s.toLowerCase()));
        next.weapon_proficiencies = stripCsv(f.weapon_proficiencies, r);
      }
      if (Array.isArray(prevAdded.armor) && prevAdded.armor.length) {
        for (const a of prevAdded.armor) {
          if (a === 'light')   next.prof_light_armor  = false;
          if (a === 'medium')  next.prof_medium_armor = false;
          if (a === 'heavy')   next.prof_heavy_armor  = false;
          if (a === 'shields') next.prof_shields      = false;
        }
      }
      // Saves granted by the previous class kit — null them on
      // revert so changing class doesn't leave the old class's save
      // proficiencies attached.
      if (Array.isArray(prevAdded.saves) && prevAdded.saves.length) {
        for (const ab of prevAdded.saves) {
          const field = SAVE_FIELD[ab];
          if (field) next[field] = null;
        }
      }
      // Ability bonuses the previous kit granted, taken back off. Subtracted
      // rather than reset, so a stat the player raised by hand keeps that part
      // and only the granted portion goes.
      if (Array.isArray(prevAdded.abilities) && prevAdded.abilities.length) {
        for (const ab of prevAdded.abilities) {
          const statField = STAT_FIELD[String(ab.ability || '').toUpperCase()];
          const amt = Number(ab.bonus) || 0;
          if (!statField || !amt) continue;
          next[statField] = (Number(next[statField]) || 10) - amt;
        }
      }
      // Languages granted by the previous class kit (Druidic, the
      // homebrew class's class-language) — strip ONLY the entries
      // recorded as kit-granted. Manually-added languages keep their
      // place in the CSV. Comparison ignores fluency qualifiers so
      // "Druidic (only)" gets removed if the kit added "Druidic".
      if (Array.isArray(prevAdded.languages) && prevAdded.languages.length) {
        const drop = new Set(prevAdded.languages.map((s) => String(s).toLowerCase()));
        const kept = String(f.languages || '')
          .split(/\s*,\s*/).map((p) => p.trim()).filter(Boolean)
          .filter((p) => !drop.has(p.replace(/\s*\(.*\)\s*$/, '').toLowerCase()));
        next.languages = kept.join(', ');
      }
      if (Array.isArray(prevAdded.spells) && prevAdded.spells.length) {
        const drop = new Set(prevAdded.spells.map((s) => String(s).toLowerCase()));
        next.spells = (f.spells || []).filter((s) =>
          !drop.has(String(s.name || '').toLowerCase())
        );
      }
      next.class_state = {};
      return next;
    });
  }

  // Starting equipment grant — one-shot kit application from the
  // class's SRD options. Option A drops a bundle of items + gp into
  // the sheet; Option B is a flat gp budget. Idempotent: tracks
  // class_state.starting_equipment so the UI disables both buttons
  // once one has been claimed. We DON'T auto-revert on class swap —
  // items may have been consumed or sold by then; cleaner to leave
  // the inventory alone and let the user prune manually.
  function applyStartingEquipment(option /* 'A' | 'B' | 'C' */) {
    setForm((f) => {
      const cls = f.char_class;
      const build = getClassBuild(cls);
      if (!build) return f;
      const claim = startingEquipmentOptions(build).find((o) => o.id === option);
      if (!claim) return f;
      const next = { ...f };
      // Stack identical item names into a single inventory row
      // with qty = count, so 8 Javelins shows as one entry.
      const items = claim.items || [];
      if (items.length) {
        const counts = new Map();
        for (const name of items) counts.set(name, (counts.get(name) || 0) + 1);
        const inv = [...(next.inventory || [])];
        for (const [name, qty] of counts) {
          inv.push({ name, qty, item_type: 'item', __source: `cls:primary:${cls}:starting-eq:${option}` });
        }
        next.inventory = inv;
      }
      const gp = Number(claim.gp) || 0;
      if (gp) next.currency_gp = (Number(next.currency_gp) || 0) + gp;
      next.class_state = {
        ...(next.class_state || {}),
        starting_equipment: option,
      };
      return next;
    });
  }

  // ── Multiclass row management + per-row choice apply/remove ──
  // The primary class lives in char_class/char_subclass/char_level/
  // class_state. Each additional class is one entry in the
  // `multiclasses` array, with its own level + class_state. Tags use
  // the prefix "cls:mc:<mcId>:" so an apply on row A doesn't clobber
  // row B's contributions.
  function addMulticlass() {
    setForm((f) => ({
      ...f,
      multiclasses: [
        ...(f.multiclasses || []),
        {
          id: `mc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          class: '',
          subclass: '',
          level: 1,
          class_state: {},
        },
      ],
    }));
  }

  function updateMulticlass(mcId, patch) {
    setForm((f) => ({
      ...f,
      multiclasses: (f.multiclasses || []).map((m) =>
        m.id === mcId ? { ...m, ...patch } : m
      ),
    }));
  }

  function removeMulticlassRow(mcId) {
    // Strip the row's tagged contributions before deleting it so
    // cleanup is automatic.
    removeMulticlassChoices(mcId);
    setForm((f) => ({
      ...f,
      multiclasses: (f.multiclasses || []).filter((m) => m.id !== mcId),
    }));
  }

  function applyMulticlassChoices(mcId, choiceList, picks) {
    setForm((f) => {
      const slot = (f.multiclasses || []).find((m) => m.id === mcId);
      if (!slot) return f;
      const slotPrefix = `cls:mc:${mcId}:`;
      const sourceTagFor = (choice, optionOrPicks) =>
        choice.kind === 'single'
          ? `${slotPrefix}${slot.class}:${choice.id}:${optionOrPicks}`
          : `${slotPrefix}${slot.class}:${choice.id}`;

      const prevState = slot.class_state || {};
      const prevAdded = prevState.added || {};
      const next = { ...f };
      const profBonus = next.proficiency_bonus ?? 2;

      const stripBy = (rows, prefix) => (rows || []).filter((r) =>
        !(typeof r?.__source === 'string' && r.__source.startsWith(prefix))
      );
      next.special_abilities = stripBy(f.special_abilities, slotPrefix);
      next.actions           = stripBy(f.actions, slotPrefix);
      next.bonus_actions     = stripBy(f.bonus_actions, slotPrefix);
      next.reactions         = stripBy(f.reactions, slotPrefix);

      if (Array.isArray(prevAdded.skills) && prevAdded.skills.length) {
        const expert = { ...(next.skill_expertise || {}) };
        for (const sk of prevAdded.skills) { next[sk] = null; delete expert[sk]; }
        next.skill_expertise = expert;
      }
      const stripCsv = (csv, removeLower) => String(csv || '')
        .split(/\s*,\s*/).map((p) => p.trim()).filter(Boolean)
        .filter((p) => !removeLower.has(p.toLowerCase())).join(', ');
      if (Array.isArray(prevAdded.weapons) && prevAdded.weapons.length) {
        next.weapon_proficiencies = stripCsv(
          f.weapon_proficiencies,
          new Set(prevAdded.weapons.map((s) => s.toLowerCase())),
        );
      }
      if (Array.isArray(prevAdded.armor) && prevAdded.armor.length) {
        for (const a of prevAdded.armor) {
          if (a === 'light')   next.prof_light_armor  = false;
          if (a === 'medium')  next.prof_medium_armor = false;
          if (a === 'heavy')   next.prof_heavy_armor  = false;
          if (a === 'shields') next.prof_shields      = false;
        }
      }
      // Saves granted by the previous class kit — null them on
      // revert so changing class doesn't leave the old class's save
      // proficiencies attached.
      if (Array.isArray(prevAdded.saves) && prevAdded.saves.length) {
        for (const ab of prevAdded.saves) {
          const field = SAVE_FIELD[ab];
          if (field) next[field] = null;
        }
      }
      // Ability bonuses the previous kit granted, taken back off. Subtracted
      // rather than reset, so a stat the player raised by hand keeps that part
      // and only the granted portion goes.
      if (Array.isArray(prevAdded.abilities) && prevAdded.abilities.length) {
        for (const ab of prevAdded.abilities) {
          const statField = STAT_FIELD[String(ab.ability || '').toUpperCase()];
          const amt = Number(ab.bonus) || 0;
          if (!statField || !amt) continue;
          next[statField] = (Number(next[statField]) || 10) - amt;
        }
      }
      // Languages granted by the previous class kit (Druidic, the
      // homebrew class's class-language) — strip ONLY the entries
      // recorded as kit-granted. Manually-added languages keep their
      // place in the CSV. Comparison ignores fluency qualifiers so
      // "Druidic (only)" gets removed if the kit added "Druidic".
      if (Array.isArray(prevAdded.languages) && prevAdded.languages.length) {
        const drop = new Set(prevAdded.languages.map((s) => String(s).toLowerCase()));
        const kept = String(f.languages || '')
          .split(/\s*,\s*/).map((p) => p.trim()).filter(Boolean)
          .filter((p) => !drop.has(p.replace(/\s*\(.*\)\s*$/, '').toLowerCase()));
        next.languages = kept.join(', ');
      }
      if (Array.isArray(prevAdded.spells) && prevAdded.spells.length) {
        const drop = new Set(prevAdded.spells.map((s) => String(s).toLowerCase()));
        next.spells = (f.spells || []).filter((s) =>
          !drop.has(String(s.name || '').toLowerCase())
        );
      }

      const added = { skills: [], weapons: [], armor: [], spells: [], traits_count: 0, saves: [], languages: [], abilities: [], skill_bonuses: [] };
      const expert = { ...(next.skill_expertise || {}) };

      function applyAdds(adds, tag) {
        if (!adds) return;
        // Ability score bonuses, BEFORE anything derived from a stat.
        //
        // A feature that raises a stat outright (a Barbarian's Primal
        // Champion, say) has to land before the save and skill bonuses below,
        // which read next[stat] to compute a modifier — applied after them,
        // the stat would go up while every number derived from it stayed
        // behind.
        //
        // Recorded as {ability, bonus} so the revert can subtract exactly what
        // was granted. Reverting by recomputing from a base is not available
        // here: by then the sheet no longer knows what the stat was before.
        for (const ab of (adds.abilities || [])) {
          const statField = STAT_FIELD[String(ab.ability || '').toUpperCase()];
          const amt = Number(ab.bonus) || 0;
          if (!statField || !amt) continue;
          next[statField] = (Number(next[statField]) || 10) + amt;
          added.abilities.push({ ability: String(ab.ability).toUpperCase(), bonus: amt });
        }
        // Flat bonuses to named skills, scaled off an ability modifier —
        // a Druid's Primal Order (Magician), a Cleric's Divine Order
        // (Thaumaturge). These are NOT proficiency: they apply whether or
        // not the character is trained, so they cannot be folded into the
        // stored skill_X column (which is null when untrained). They live
        // in class_state.added.skill_bonuses and are added at roll time by
        // skillRows(). Recording the ability rather than a number keeps the
        // bonus correct when Wisdom later changes.
        for (const sb of (adds.skill_bonuses || [])) {
          const skills = (sb.skills || []).filter((k) => STAT_OF_SKILL[k]);
          if (!skills.length || !sb.ability) continue;
          added.skill_bonuses.push({
            skills,
            ability: String(sb.ability).toLowerCase(),
            min: Number(sb.min) || 0,
            label: sb.label || '',
          });
        }
        // Extra cantrips a choice grants (Primal Order: Magician). A count,
        // not a named spell — the player still chooses which one — so it is
        // recorded as a number and read by the capacity bar.
        if (Number(adds.cantrip_bonus)) {
          added.cantrip_bonus = (Number(added.cantrip_bonus) || 0) + Number(adds.cantrip_bonus);
        }
        for (const a of (adds.armor || [])) {
          if (a === 'light')   next.prof_light_armor  = true;
          if (a === 'medium')  next.prof_medium_armor = true;
          if (a === 'heavy')   next.prof_heavy_armor  = true;
          if (a === 'shields') next.prof_shields      = true;
          added.armor.push(a);
        }
        if (adds.weapons && adds.weapons.length) {
          const have = String(next.weapon_proficiencies || '')
            .split(/\s*,\s*/).map((p) => p.trim()).filter(Boolean);
          for (const w of adds.weapons) {
            if (!have.some((p) => p.toLowerCase() === w.toLowerCase())) {
              have.push(w);
              added.weapons.push(w);
            }
          }
          next.weapon_proficiencies = have.join(', ');
        }
        // Granted languages — Druidic-style class language pickup.
        // Merges into the existing comma-separated languages column
        // and tracks adds in added.languages so revert clears only
        // the class-granted ones, leaving manually-added languages
        // alone. Trailing fluency qualifiers like "(understands but
        // cannot speak)" are NOT added by class kits — those stay a
        // manual concern via the LanguagePicker.
        if (adds.languages && adds.languages.length) {
          const have = String(next.languages || '')
            .split(/\s*,\s*/).map((p) => p.trim()).filter(Boolean);
          // Strip trailing qualifier when comparing so "Druidic"
          // matches "Druidic (only)" and we don't double-add.
          const haveBare = new Set(have.map((p) =>
            p.replace(/\s*\(.*\)\s*$/, '').toLowerCase()
          ));
          for (const lang of adds.languages) {
            const bare = String(lang).replace(/\s*\(.*\)\s*$/, '').trim();
            if (!bare) continue;
            if (haveBare.has(bare.toLowerCase())) continue;
            have.push(bare);
            added.languages.push(bare);
            haveBare.add(bare.toLowerCase());
          }
          next.languages = have.join(', ');
        }
        // Save proficiencies — multiclass kits don't grant saves
        // (per the PHB), so this loop is a no-op for the slot path.
        // Kept here so applyAdds stays symmetric with the primary
        // copy and so a future plugin/auto-grant can add saves.
        for (const ab of (adds.saves || [])) {
          const field = SAVE_FIELD[ab];
          const stat  = STAT_FIELD[ab];
          if (!field || !stat) continue;
          const m = Math.floor(((next[stat] ?? 10) - 10) / 2);
          next[field] = m + profBonus;
          added.saves.push(ab);
        }
        for (const sObj of (adds.skills || [])) {
          const sk = typeof sObj === 'string' ? sObj : sObj.skill;
          const lvl = typeof sObj === 'string' ? 'proficient' : (sObj.level || 'proficient');
          if (!sk || !STAT_OF_SKILL[sk]) continue;
          const m = Math.floor(((next[STAT_OF_SKILL[sk]] ?? 10) - 10) / 2);
          const mult = lvl === 'expertise' ? 2 : 1;
          next[sk] = m + profBonus * mult;
          if (lvl === 'expertise') expert[sk] = true;
          added.skills.push(sk);
        }
        for (const t of (adds.traits || [])) {
          const target = t.category === 'action' ? 'actions'
            : t.category === 'bonusAction' ? 'bonus_actions'
            : t.category === 'reaction' ? 'reactions'
            : 'special_abilities';
          next[target] = [
            ...(next[target] || []),
            { name: t.name, desc: t.desc, __source: tag },
          ];
          added.traits_count++;
        }
        for (const sp of (adds.spells || [])) {
          if (!sp?.name) continue;
          const has = (next.spells || []).some((s) =>
            String(s.name || '').toLowerCase() === sp.name.toLowerCase()
          );
          if (!has) {
            // Granted spells often arrive as just a name. Take the level from
            // the library rather than defaulting to 0 — that default is what
            // made every subclass spell land as a cantrip.
            const lib = spellLibraryByName?.get(String(sp.name).toLowerCase());
            next.spells = [
              ...(next.spells || []),
              {
                id: Date.now() + Math.random(),
                name: sp.name,
                level: sp.level ?? lib?.level ?? 0,
                prepared: sp.prepared !== false,
                __source: tag,
              },
            ];
            added.spells.push(sp.name);
          }
        }
      }

      // Gated against THIS slot's level, not the character's total —
      // a level-10 feature on a 2-level dip shouldn't land. Same
      // reasoning as the primary-class applier above.
      const effLevel = Math.max(1, Number(slot.level) || 1);

      for (const choice of choiceList) {
        if (choice.kind === 'auto') {
          if ((choice.at_level || 1) > effLevel) continue;
          applyAdds(choice.adds, `${slotPrefix}${slot.class}:${choice.id}:auto`);
          continue;
        }
        const pick = picks[choice.id];
        if (!pick) continue;
        if (choice.kind === 'single') {
          const opt = (choice.options || []).find((o) => o.id === pick.option_id);
          if (!opt) continue;
          applyAdds(opt.adds, sourceTagFor(choice, opt.id));
        }
        if (choice.kind === 'multi-weapons') {
          const have = String(next.weapon_proficiencies || '')
            .split(/\s*,\s*/).map((p) => p.trim()).filter(Boolean);
          for (const w of (pick.picks || [])) {
            if (!w) continue;
            if (!have.some((p) => p.toLowerCase() === w.toLowerCase())) {
              have.push(w);
              added.weapons.push(w);
            }
          }
          next.weapon_proficiencies = have.join(', ');
        }
        if (choice.kind === 'multi-options') {
          // Invocations, metamagic, manoeuvres. Each picked option becomes a
          // trait on the sheet — that is what a player reads mid-session —
          // and carries through any spell it grants, tagged like every other
          // class grant so the revert takes it back off again.
          for (const id of (pick.picks || [])) {
            const opt = (choice.options || []).find((o) => o.id === id);
            if (!opt) continue;
            applyAdds({
              traits: [{ name: opt.name, desc: opt.desc, category: 'specialAbility' }],
              ...(opt.spells?.length
                ? { spells: opt.spells.map((n) => ({ name: n, prepared: true })) }
                : {}),
            }, sourceTagFor(choice, id));
          }
        }

        if (choice.kind === 'multi-skills') {
          for (const sk of (pick.picks || [])) {
            if (!sk || !STAT_OF_SKILL[sk]) continue;
            const m = Math.floor(((next[STAT_OF_SKILL[sk]] ?? 10) - 10) / 2);
            next[sk] = m + profBonus * 2;
            expert[sk] = true;
            added.skills.push(sk);
          }
        }
      }

      next.skill_expertise = expert;
      next.multiclasses = (f.multiclasses || []).map((m) =>
        m.id === mcId
          ? { ...m, class_state: {
                class_id: slot.class || '',
                subclass_id: slot.subclass || '',
                applied_at_level: Math.max(1, Number(slot.level) || 1),
                choices: picks,
                added,
              } }
          : m
      );
      return next;
    });
  }

  function removeMulticlassChoices(mcId) {
    setForm((f) => {
      const slot = (f.multiclasses || []).find((m) => m.id === mcId);
      if (!slot) return f;
      const prevAdded = (slot.class_state && slot.class_state.added) || {};
      const slotPrefix = `cls:mc:${mcId}:`;
      const next = { ...f };
      const stripBy = (rows, prefix) => (rows || []).filter((r) =>
        !(typeof r?.__source === 'string' && r.__source.startsWith(prefix))
      );
      next.special_abilities = stripBy(f.special_abilities, slotPrefix);
      next.actions           = stripBy(f.actions, slotPrefix);
      next.bonus_actions     = stripBy(f.bonus_actions, slotPrefix);
      next.reactions         = stripBy(f.reactions, slotPrefix);
      if (Array.isArray(prevAdded.skills) && prevAdded.skills.length) {
        const expert = { ...(next.skill_expertise || {}) };
        for (const sk of prevAdded.skills) { next[sk] = null; delete expert[sk]; }
        next.skill_expertise = expert;
      }
      const stripCsv = (csv, removeLower) => String(csv || '')
        .split(/\s*,\s*/).map((p) => p.trim()).filter(Boolean)
        .filter((p) => !removeLower.has(p.toLowerCase())).join(', ');
      if (Array.isArray(prevAdded.weapons) && prevAdded.weapons.length) {
        next.weapon_proficiencies = stripCsv(
          f.weapon_proficiencies,
          new Set(prevAdded.weapons.map((s) => s.toLowerCase())),
        );
      }
      if (Array.isArray(prevAdded.armor) && prevAdded.armor.length) {
        for (const a of prevAdded.armor) {
          if (a === 'light')   next.prof_light_armor  = false;
          if (a === 'medium')  next.prof_medium_armor = false;
          if (a === 'heavy')   next.prof_heavy_armor  = false;
          if (a === 'shields') next.prof_shields      = false;
        }
      }
      // Saves granted by the previous class kit — null them on
      // revert so changing class doesn't leave the old class's save
      // proficiencies attached.
      if (Array.isArray(prevAdded.saves) && prevAdded.saves.length) {
        for (const ab of prevAdded.saves) {
          const field = SAVE_FIELD[ab];
          if (field) next[field] = null;
        }
      }
      // Ability bonuses the previous kit granted, taken back off. Subtracted
      // rather than reset, so a stat the player raised by hand keeps that part
      // and only the granted portion goes.
      if (Array.isArray(prevAdded.abilities) && prevAdded.abilities.length) {
        for (const ab of prevAdded.abilities) {
          const statField = STAT_FIELD[String(ab.ability || '').toUpperCase()];
          const amt = Number(ab.bonus) || 0;
          if (!statField || !amt) continue;
          next[statField] = (Number(next[statField]) || 10) - amt;
        }
      }
      // Languages granted by the previous class kit (Druidic, the
      // homebrew class's class-language) — strip ONLY the entries
      // recorded as kit-granted. Manually-added languages keep their
      // place in the CSV. Comparison ignores fluency qualifiers so
      // "Druidic (only)" gets removed if the kit added "Druidic".
      if (Array.isArray(prevAdded.languages) && prevAdded.languages.length) {
        const drop = new Set(prevAdded.languages.map((s) => String(s).toLowerCase()));
        const kept = String(f.languages || '')
          .split(/\s*,\s*/).map((p) => p.trim()).filter(Boolean)
          .filter((p) => !drop.has(p.replace(/\s*\(.*\)\s*$/, '').toLowerCase()));
        next.languages = kept.join(', ');
      }
      if (Array.isArray(prevAdded.spells) && prevAdded.spells.length) {
        const drop = new Set(prevAdded.spells.map((s) => String(s).toLowerCase()));
        next.spells = (f.spells || []).filter((s) =>
          !drop.has(String(s.name || '').toLowerCase())
        );
      }
      next.multiclasses = (f.multiclasses || []).map((m) =>
        m.id === mcId ? { ...m, class_state: {} } : m
      );
      return next;
    });
  }

  // Proficiency checkbox helpers
  function toggleSave(saveKey, statKey) {
    const profBonus = form.proficiency_bonus ?? 2;
    const base = mod(form[statKey]);
    const current = form[saveKey];
    setField(saveKey, current === null ? base + profBonus : null);
  }
  function toggleSkill(skillKey, statKey) {
    const profBonus = form.proficiency_bonus ?? 2;
    const base = mod(form[statKey]);
    const current = form[skillKey];
    const expert = form.skill_expertise && form.skill_expertise[skillKey];
    const newVal = current === null ? base + profBonus * (expert ? 2 : 1) : null;
    setForm(f => {
      const next = { ...f, [skillKey]: newVal };
      // Removing proficiency also clears expertise
      if (newVal === null && f.skill_expertise) {
        const se = { ...f.skill_expertise };
        delete se[skillKey];
        next.skill_expertise = se;
      }
      return next;
    });
  }
  function toggleExpertise(skillKey, statKey) {
    const profBonus = form.proficiency_bonus ?? 2;
    const base = mod(form[statKey]);
    const proficient = form[skillKey] !== null && form[skillKey] !== undefined;
    if (!proficient) return; // expertise requires proficiency
    setForm(f => {
      const se = { ...(f.skill_expertise || {}) };
      const willHave = !se[skillKey];
      if (willHave) se[skillKey] = true; else delete se[skillKey];
      return { ...f, skill_expertise: se, [skillKey]: base + profBonus * (willHave ? 2 : 1) };
    });
  }

  // Recalculate save/skill bonuses when ability scores or prof bonus changes
  useEffect(() => {
    const pb = form.proficiency_bonus ?? 2;
    const updates = {};
    for (const s of SAVES) {
      if (form[s.key] !== null && form[s.key] !== undefined) {
        updates[s.key] = mod(form[s.stat]) + pb;
      }
    }
    for (const s of SKILLS) {
      if (form[s.key] !== null && form[s.key] !== undefined) {
        const expert = form.skill_expertise && form.skill_expertise[s.key];
        updates[s.key] = mod(form[s.stat]) + pb * (expert ? 2 : 1);
      }
    }
    if (Object.keys(updates).length) {
      setForm((f) => ({ ...f, ...updates }));
    }
  }, [
    form.strength, form.dexterity, form.constitution,
    form.intelligence, form.wisdom, form.charisma,
    form.proficiency_bonus,
  ]);

  function listAdd(key) {
    setForm((f) => ({ ...f, [key]: [...(f[key] || []), { name: '', desc: '' }] }));
  }
  function listRemove(key, i) {
    setForm((f) => {
      const row = (f[key] || [])[i];
      const next = { ...f, [key]: f[key].filter((_, idx) => idx !== i) };
      // A feature that raised a stat when it was added gives it back when it
      // goes. Driven off the stamp written at add time, so only the granted
      // portion comes off — a score the player raised by hand on top of it
      // keeps that part. Rows without a stamp are unaffected, which is every
      // row in every other list this function serves.
      return applyAbilityDelta(next, row?.__applied_abilities, -1);
    });
  }
  function listChange(key, i, field, value) {
    setForm((f) => {
      const arr = [...f[key]];
      arr[i] = { ...arr[i], [field]: value };
      return { ...f, [key]: arr };
    });
  }

  function addSense() {
    setForm((f) => ({ ...f, senses: [...(f.senses || []), { type: 'normal' }] }));
  }
  function removeSense(i) {
    setForm((f) => ({ ...f, senses: f.senses.filter((_, idx) => idx !== i) }));
  }
  const RANGED_SENSE_TYPES = new Set(['darkvision', 'blindsight', 'truesight', 'tremorsense']);
  function updateSense(i, field, value) {
    setForm((f) => {
      const senses = [...f.senses];
      let updated = { ...senses[i], [field]: value };
      // Auto-default range to 60 when switching to a ranged sense type
      if (field === 'type' && RANGED_SENSE_TYPES.has(value) && !updated.range) {
        updated.range = 60;
      }
      senses[i] = updated;
      return { ...f, senses };
    });
  }

  const KNOWN_LIGHT_ITEMS = {
    candle:  { sheds_light: true, bright_ft: 0,  dim_ft: 5  },
    torch:   { sheds_light: true, bright_ft: 20, dim_ft: 40 },
    lantern: { sheds_light: true, bright_ft: 30, dim_ft: 60 },
  };

  function knownLightPreset(name) {
    const lower = (name || '').toLowerCase().trim();
    for (const [key, vals] of Object.entries(KNOWN_LIGHT_ITEMS)) {
      if (lower === key || lower.startsWith(key)) return vals;
    }
    return null;
  }

  function getDamageEntries(item) {
    if (Array.isArray(item.damage_entries) && item.damage_entries.length > 0) return item.damage_entries;
    if (item.damage) return [{ damage: item.damage, damage_type: item.damage_type || '' }];
    return [{ damage: '', damage_type: '' }];
  }

  function addInventoryItem() {
    setForm((f) => ({ ...f, inventory: [...(f.inventory || []), { item_type: 'item', name: '', qty: 1, weight: '', desc: '', equipped: false, sheds_light: false, bright_ft: 20, dim_ft: 40, weapon_range: '', attack_stat: 'STR', attack_bonus_misc: 0, damage_bonus_misc: 0, damage_entries: [{ damage: '', damage_type: '' }], properties: '' }] }));
  }

  function addDamageEntry(itemIdx) {
    setForm((f) => {
      const inventory = [...f.inventory];
      const item = inventory[itemIdx];
      const entries = getDamageEntries(item);
      inventory[itemIdx] = { ...item, damage_entries: [...entries, { damage: '', damage_type: '' }], damage: undefined, damage_type: undefined };
      return { ...f, inventory };
    });
  }
  function removeDamageEntry(itemIdx, entryIdx) {
    setForm((f) => {
      const inventory = [...f.inventory];
      const item = inventory[itemIdx];
      const entries = getDamageEntries(item).filter((_, idx) => idx !== entryIdx);
      inventory[itemIdx] = { ...item, damage_entries: entries.length ? entries : [{ damage: '', damage_type: '' }], damage: undefined, damage_type: undefined };
      return { ...f, inventory };
    });
  }
  // Turn an inferred mode (the Thrown line we synthesise from the weapon's
  // properties) into a stored row, so its dice, range and ability can be
  // edited like any other.
  function materialiseDamageMode(itemIdx, mode) {
    setForm((f) => {
      const inventory = [...f.inventory];
      const item = inventory[itemIdx];
      const entries = getDamageEntries(item);
      inventory[itemIdx] = {
        ...item,
        damage_entries: [...entries, {
          label: mode.label,
          damage: mode.damage || '',
          damage_type: mode.damage_type || '',
          range: mode.range || '',
          attack_stat: '',
        }],
        damage: undefined,
        damage_type: undefined,
      };
      return { ...f, inventory };
    });
  }

  function updateDamageEntry(itemIdx, entryIdx, field, value) {
    setForm((f) => {
      const inventory = [...f.inventory];
      const item = inventory[itemIdx];
      const entries = getDamageEntries(item).map((e, idx) => idx === entryIdx ? { ...e, [field]: value } : e);
      inventory[itemIdx] = { ...item, damage_entries: entries, damage: undefined, damage_type: undefined };
      return { ...f, inventory };
    });
  }
  function removeInventoryItem(i) {
    setForm((f) => ({ ...f, inventory: f.inventory.filter((_, idx) => idx !== i) }));
  }
  function updateInventoryItem(i, field, value) {
    setForm((f) => {
      const inventory = [...f.inventory];
      let updated = { ...inventory[i], [field]: value };
      if (field === 'name') {
        const preset = knownLightPreset(value);
        if (preset) updated = { ...updated, ...preset };
      }
      inventory[i] = updated;
      return { ...f, inventory };
    });
  }

  // Convert currency between denominations
  function convertCurrency(from, to) {
    const RATES = { cp: 1, sp: 10, gp: 100 };
    const fromRate = RATES[from], toRate = RATES[to];
    if (!fromRate || !toRate || from === to) return;
    const fromAmt = form[`currency_${from}`] || 0;
    if (fromAmt <= 0) return;
    const cpTotal = fromAmt * fromRate;
    const toAmt = Math.floor(cpTotal / toRate);
    const remainder = cpTotal % toRate;
    const leftoverCp = remainder;
    setForm((f) => ({
      ...f,
      [`currency_${from}`]: 0,
      [`currency_${to}`]: (f[`currency_${to}`] || 0) + toAmt,
      currency_cp: from === 'cp' ? leftoverCp : (f.currency_cp || 0) + (from !== 'cp' ? leftoverCp : 0),
    }));
  }

  function addSpell(level, type) {
    const newSpell = { id: Date.now() + Math.random(), name: '', level, type, description: '', spell_range: '', damage_entries: [{ damage: '', damage_type: '' }] };
    setForm((f) => ({ ...f, spells: [...(f.spells || []), newSpell] }));
  }
  function removeSpell(id) {
    setForm((f) => ({ ...f, spells: f.spells.filter((s) => s.id !== id) }));
  }
  function updateSpell(id, field, value) {
    setForm((f) => ({ ...f, spells: f.spells.map((s) => s.id === id ? { ...s, [field]: value } : s) }));
  }
  function swapSpellType(id) {
    setForm((f) => ({
      ...f,
      spells: (f.spells || []).map((s) => s.id === id
        ? { ...s, type: SPELL_TYPE_KEYS[(SPELL_TYPE_KEYS.indexOf(spellType(s.type).key) + 1) % SPELL_TYPE_KEYS.length] }
        : s),
    }));
  }
  function reorderSpell(fromId, toId) {
    setForm((f) => {
      const arr = [...(f.spells || [])];
      const fromIdx = arr.findIndex((s) => s.id === fromId);
      if (fromIdx === -1) return f;
      const [moved] = arr.splice(fromIdx, 1);
      const toIdx = arr.findIndex((s) => s.id === toId);
      if (toIdx === -1) { arr.splice(fromIdx, 0, moved); return f; }
      arr.splice(toIdx, 0, moved);
      return { ...f, spells: arr };
    });
  }

  function getSpellDmgEntries(spell) {
    if (Array.isArray(spell.damage_entries) && spell.damage_entries.length) return spell.damage_entries;
    return [{ damage: '', damage_type: '' }];
  }
  function addSpellDmgEntry(spellId) {
    setForm((f) => ({ ...f, spells: f.spells.map((s) => s.id === spellId
      ? { ...s, damage_entries: [...getSpellDmgEntries(s), { damage: '', damage_type: '' }] }
      : s) }));
  }
  function removeSpellDmgEntry(spellId, ei) {
    setForm((f) => ({ ...f, spells: f.spells.map((s) => {
      if (s.id !== spellId) return s;
      const entries = getSpellDmgEntries(s).filter((_, idx) => idx !== ei);
      return { ...s, damage_entries: entries.length ? entries : [{ damage: '', damage_type: '' }] };
    }) }));
  }
  function updateSpellDmgEntry(spellId, ei, field, value) {
    setForm((f) => ({ ...f, spells: f.spells.map((s) => {
      if (s.id !== spellId) return s;
      const entries = getSpellDmgEntries(s).map((e, idx) => idx === ei ? { ...e, [field]: value } : e);
      return { ...s, damage_entries: entries };
    }) }));
  }
  function setSlotTotal(level, total) {
    setForm((f) => {
      const prev = f.spell_slots[level] || { total: 0, used: 0 };
      const used = Math.min(prev.used || 0, total);
      return { ...f, spell_slots: { ...f.spell_slots, [level]: { total, used } } };
    });
  }
  // `total` is the effective total the boxes were drawn from, which may be the
  // class-table value rather than anything saved on the sheet. Writing it back
  // alongside `used` stops a tick on a derived level from persisting total: 0.
  function setSlotUsed(level, used, total) {
    setForm((f) => {
      const prev = f.spell_slots[level] || { total: 0, used: 0 };
      const cap = Number(total) || prev.total || 0;
      return {
        ...f,
        spell_slots: {
          ...f.spell_slots,
          [level]: { ...prev, total: cap, used: Math.max(0, Math.min(cap, used)) },
        },
      };
    });
  }

  function addLootItem() {
    setForm((f) => ({ ...f, loot: [...(f.loot || []), { id: Date.now() + Math.random(), name: '', qty: '1', chance: 100, desc: '' }] }));
  }
  function removeLootItem(id) {
    setForm((f) => ({ ...f, loot: f.loot.filter((l) => l.id !== id) }));
  }
  function updateLootItem(id, field, value) {
    setForm((f) => ({ ...f, loot: f.loot.map((l) => l.id === id ? { ...l, [field]: value } : l) }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) { setError('Name required'); return; }
    setSaving(true);
    setError('');

    try {
      const fd = new FormData();
      for (const [k, v] of Object.entries(form)) {
        // image_data is the AI prefill data URL; it has already been
        // turned into imageFile and would blow past multer's default
        // text-field cap if re-uploaded as a string.
        if (k === 'image_data') continue;
        if (Array.isArray(v) || (typeof v === 'object' && v !== null)) {
          fd.append(k, JSON.stringify(v));
        } else if (v === null || v === undefined) {
          // skip null
        } else {
          fd.append(k, v);
        }
      }
      if (imageFile) fd.append('image', imageFile);
      if (extraFields) {
        for (const [k, v] of Object.entries(extraFields)) {
          fd.append(k, v);
        }
      }

      // WHO IS SAVING DECIDES WHAT COMES BACK.
      //
      // This asked as the GM unconditionally, which was right for the library
      // — the form needs the secrets echoed back or the next save wipes them —
      // and wrong everywhere else, because the same form is a player's own
      // character sheet. A player's save claimed to be the GM, so the server
      // treated their pack as authoritative: GM-only item text was sent to
      // their browser, and anything the GM had hidden in their pack would have
      // been deleted the first time they equipped a shield.
      //
      // Saving as a player instead is safe in both directions: the server
      // reattaches the secrets and puts the hidden items back, which is what
      // mergeSecrets and restoreHidden are for.
      const gmQuery = asGm ? '?role=dm' : '';
      const url = creature?.id ? `/api/creatures/${creature.id}${gmQuery}` : '/api/creatures';
      const method = creature?.id ? 'PUT' : 'POST';
      const res = await fetch(url, { method, body: fd });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); }
      catch {
        throw new Error(`Server returned ${res.status} (${text.slice(0, 200) || 'no body'})`);
      }
      if (!res.ok || data.error) throw new Error(data.error || `Save failed: ${res.status}`);
      onSave(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const inputClass = 'w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-dnd-gold';
  const smallInputClass = 'bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-sm text-center focus:outline-none focus:border-dnd-gold';
  const labelClass = 'block text-xs text-gray-400 mb-1';

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex border-b border-gray-700 overflow-x-auto shrink-0">
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setActiveTab(t)}
            className={`px-3 py-2 text-xs whitespace-nowrap font-medium transition-colors ${
              activeTab === t ? 'text-dnd-gold border-b-2 border-dnd-gold' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {tabLabel[t]}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {error && <div className="text-red-400 text-sm bg-red-900/30 rounded p-2">{error}</div>}

        {/* ── BASIC TAB ─────────────────────────────── */}
        {activeTab === 'basic' && (
          <div className="space-y-4">
            {/* Image upload — primary portrait, plus the alternate token art
                strip below it. */}
            <div className="flex items-start gap-4">
              <div className="shrink-0">
                <div
                  className="w-24 h-24 rounded-full bg-gray-800 border-2 border-dashed border-gray-600 overflow-hidden flex items-center justify-center cursor-pointer hover:border-dnd-gold transition-colors"
                  onClick={() => document.getElementById('creature-img').click()}
                >
                  {imagePreview ? (
                    <img src={imagePreview} alt="token" className="w-full h-full object-cover" />
                  ) : (
                    <DragonIcon />
                  )}
                </div>
                <input id="creature-img" type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                <p className="text-xs text-gray-500 text-center mt-1">Click to upload</p>
                <button
                  type="button"
                  onClick={() => { setTokenEditorTarget('primary'); setTokenEditorOpen(true); }}
                  className="w-24 mt-1 text-[11px] text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded py-1"
                  title="Build a token in the 2-Minute Tabletop editor without leaving this sheet"
                >Token editor</button>
                {imagePreview && (
                  <button
                    type="button"
                    onClick={() => openFramer(imagePreview, false)}
                    className="w-24 mt-1 text-[11px] text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded py-1"
                    title="Pan and zoom the portrait — useful when the subject isn't dead centre"
                  >Adjust framing</button>
                )}
                {isPlayerCharacter && aiPortraitAvailable && (
                  <div className="mt-2 space-y-1.5 w-44">
                    <input
                      type="text"
                      value={aiAppearancePrompt}
                      onChange={(e) => setAiAppearancePrompt(e.target.value)}
                      placeholder="Appearance hint (optional)"
                      className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-[11px] text-white focus:outline-none focus:border-purple-400"
                    />
                    <button
                      type="button"
                      onClick={handleGeneratePortrait}
                      disabled={aiPortraitLoading || !form.name?.trim()}
                      title={!form.name?.trim() ? 'Enter a name first' : 'Generate a portrait via the GM\'s AI'}
                      className={`w-full text-[11px] rounded px-2 py-1.5 transition-colors flex items-center justify-center gap-1.5 ${
                        aiPortraitLoading
                          ? 'bg-purple-900 text-purple-300'
                          : 'bg-purple-700 hover:bg-purple-600 disabled:bg-gray-700 disabled:text-gray-500 text-purple-100'
                      }`}
                    >
                      {aiPortraitLoading ? (
                        <>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="w-3 h-3 animate-spin"><path d="M12 2a10 10 0 0 1 10 10" /></svg>
                          Generating…
                        </>
                      ) : (
                        <>
                          <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3"><path d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5L12 2z" /></svg>
                          {imagePreview ? 'Re-roll portrait' : 'Generate portrait'}
                        </>
                      )}
                    </button>
                    {aiPortraitError && (
                      <div className="text-[10px] text-red-400 leading-tight">{aiPortraitError}</div>
                    )}
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <label className={labelClass}>Name *</label>
                  <input className={inputClass} placeholder="Goblin" value={form.name} onChange={(e) => setField('name', e.target.value)} required />
                </div>
                {/* Free text with suggestions rather than a fixed dropdown —
                    the common sets are one click away, anything else is just
                    typed. Blank simply omits it from the stat block. */}
                <div>
                  <label className={labelClass}>Pronouns</label>
                  {/* Free text, and visibly so. This was already a plain input
                      with a datalist, but a datalist renders as a dropdown in
                      some browsers and barely exists on iOS — players read it
                      as a fixed list they had to pick from. The chips fill the
                      field rather than constraining it, and the field itself
                      takes anything. */}
                  <input
                    className={inputClass}
                    placeholder="Type anything — e.g. they/them, xe/xem, name only"
                    maxLength={50}
                    value={form.pronouns || ''}
                    onChange={(e) => setField('pronouns', e.target.value)}
                  />
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {PRONOUN_SUGGESTIONS.map((pr) => (
                      <button
                        key={pr}
                        type="button"
                        onClick={() => setField('pronouns', pr)}
                        className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
                          (form.pronouns || '') === pr
                            ? 'bg-dnd-gold text-gray-900 border-dnd-gold font-semibold'
                            : 'bg-gray-800 text-gray-300 border-gray-600 hover:border-dnd-gold/60'
                        }`}
                      >{pr}</button>
                    ))}
                    {!!(form.pronouns || '') && (
                      <button
                        type="button"
                        onClick={() => setField('pronouns', '')}
                        className="text-[11px] px-2 py-0.5 rounded-full border border-gray-700 text-gray-500 hover:text-gray-300"
                        title="Leave blank to omit pronouns from the stat block"
                      >clear</button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelClass}>Size</label>
                    {/* If the active race in race_state declares
                        sizeChoices, restrict the dropdown to those
                        options. Falls back to the full SIZES list
                        for non-PC creatures and races with no
                        constraint. */}
                    {(() => {
                      const rid = form.race_state?.race_id;
                      const activeRace = rid ? findRaceMerged(rid) : null;
                      const allowedRaw = activeRace?.sizeChoices;
                      const allowed = (Array.isArray(allowedRaw) && allowedRaw.length > 0)
                        ? allowedRaw.map((s) => s.toLowerCase())
                        : null;
                      const sizes = allowed
                        ? SIZES.filter((s) => allowed.includes(s.toLowerCase()))
                        : SIZES;
                      return (
                        <select
                          className={inputClass}
                          value={form.size}
                          onChange={(e) => {
                            const next = e.target.value;
                            setField('size', next);
                            // Only gargantuan carries a footprint override, so
                            // moving off it drops the value rather than leaving
                            // a hidden number to reappear later.
                            if (next !== 'gargantuan') setField('size_squares', null);
                          }}
                        >
                          {sizes.map((s) => <option key={s} value={s}>{SIZE_LABELS[s]}</option>)}
                        </select>
                      );
                    })()}
                  </div>
                  <div>
                    <label className={labelClass}>Type</label>
                    <select className={inputClass} value={form.creature_type} onChange={(e) => setField('creature_type', e.target.value)}>
                      {CREATURE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>

                {/* Gargantuan is "20 feet or more", so its 4×4 is a floor, not a
                    fixed footprint — a kraken and a tarrasque are both
                    gargantuan and neither is 4 squares. Set here so every token
                    spawned from this creature comes out the right size instead
                    of being resized by hand each time it's placed. Blank falls
                    back to the 4×4 default. */}
                {form.size === 'gargantuan' && (
                  <div className="mt-2">
                    <label className={labelClass}>Footprint (squares)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={4}
                        max={40}
                        step={0.5}
                        className={`${inputClass} w-24`}
                        value={form.size_squares ?? ''}
                        placeholder="4"
                        onChange={(e) => {
                          const v = e.target.value;
                          setField('size_squares', v === '' ? null : Number(v));
                        }}
                      />
                      <span className="text-[11px] text-gray-500">
                        {((Number(form.size_squares) || 4) * 5)} ft across
                        {form.size_squares ? '' : ' (default)'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Swarm. `size` above stays the swarm's own footprint — a
                    Medium swarm still occupies a Medium square — and this
                    records how big the things inside it are. */}
                <div className="mt-2">
                  <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!form.is_swarm}
                      onChange={(e) => setField('is_swarm', e.target.checked)}
                      className="accent-dnd-gold"
                    />
                    Is a swarm
                  </label>
                  {form.is_swarm && (
                    <div className="mt-1.5">
                      <label className={labelClass}>Size of creatures in the swarm</label>
                      <select
                        className={inputClass}
                        value={form.swarm_creature_size || 'tiny'}
                        onChange={(e) => setField('swarm_creature_size', e.target.value)}
                      >
                        {SIZES.map((sz) => <option key={sz} value={sz}>{SIZE_LABELS[sz]}</option>)}
                      </select>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        Reads as “{formatSizeType(form)}”. The Size field above is the swarm's own space.
                      </p>
                    </div>
                  )}
                </div>

                {/* Player-facing label defaults for tokens spawned from this
                    creature. Set here so an unidentified horror is masked
                    every time it's dropped, rather than hidden by hand on the
                    map each session. Either can still be flipped per token
                    afterwards, and combat reveals both regardless. */}
                <div className="mt-3 pt-3 border-t border-gray-700">
                  <div className="text-[11px] uppercase tracking-wider text-gray-400 mb-1.5">
                    When placed on a map, hide from players
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!form.hide_token_name}
                        onChange={(e) => setField('hide_token_name', e.target.checked)}
                        className="accent-dnd-gold"
                      />
                      Name
                    </label>
                    <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!form.hide_token_hp}
                        onChange={(e) => setField('hide_token_hp', e.target.checked)}
                        className="accent-dnd-gold"
                      />
                      Health bar
                    </label>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1 leading-snug">
                    Applies to new tokens only — ones already on a map keep what they have.
                    A token in combat always shows both.
                  </p>
                </div>

                {/* Wild Shape eligibility. A library-level tag rather than a
                    permission: it filters the form picker on a druid's sheet
                    down to things worth shifting into. Which forms a given
                    druid may actually take is still their curated list. */}
                {!isPlayerCharacter && (
                  <div className="mt-3 pt-3 border-t border-gray-700">
                    <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!form.wildshape_eligible}
                        onChange={(e) => setField('wildshape_eligible', e.target.checked)}
                        className="accent-emerald-500"
                      />
                      Available as a Wild Shape form
                    </label>
                    <p className="text-[11px] text-gray-500 mt-1 leading-snug">
                      Shows this creature in the Wild Shape picker on druid sheets. You still choose
                      which forms each druid gets.
                    </p>
                    {form.wildshape_eligible && (
                      <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer mt-2">
                        <input
                          type="checkbox"
                          checked={!!form.wildshape_keep_hp}
                          onChange={(e) => setField('wildshape_keep_hp', e.target.checked)}
                          className="accent-emerald-500"
                        />
                        Keeps the character's own hit points
                      </label>
                    )}
                    {form.wildshape_eligible && (
                      <p className="text-[11px] text-gray-500 mt-1 leading-snug">
                        For forms like Circle of the Titan's Titan Forms, where your hit points don't
                        change and the form only grants temporary hit points. Leave off for ordinary
                        beasts, which replace your HP with the beast's.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Alternate token art. The first tile is always the primary
                portrait shown above; the rest are extras the GM picks between
                when placing a token, so a pack of wolves isn't six copies of
                one picture. */}
            <div className="border border-gray-700 rounded-lg p-3 bg-gray-900/40">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div>
                  <label className={labelClass}>Token images</label>
                  <p className="text-[11px] text-gray-500 leading-tight">
                    Pick between these when you drop a token on the map.
                  </p>
                </div>
                {creatureId && (
                  <>
                    <button
                      type="button"
                      disabled={altBusy}
                      onClick={() => document.getElementById('creature-alt-imgs').click()}
                      className="text-xs bg-gray-800 hover:bg-gray-700 disabled:opacity-50 border border-gray-600 rounded px-3 py-1.5 text-gray-200 shrink-0"
                    >{altBusy ? 'Working…' : '+ Add images'}</button>
                    <input
                      id="creature-alt-imgs"
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleAltUpload}
                    />
                  </>
                )}
              </div>

              {!creatureId ? (
                <p className="text-[11px] text-gray-500">Save this creature first, then add extra token art.</p>
              ) : altImages.length === 0 ? (
                <p className="text-[11px] text-gray-500">No images yet.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {altImages.map((img) => (
                    <div
                      key={img.is_primary ? 'primary' : img.id}
                      className={`relative w-16 h-16 rounded-lg overflow-hidden border-2 ${
                        img.is_primary ? 'border-dnd-gold' : 'border-gray-700'
                      }`}
                      title={img.is_primary ? 'Primary — shown on the stat block' : 'Alternate token art'}
                    >
                      <img src={`/uploads/${img.image_path}`} alt="" className="w-full h-full object-cover" />
                      {img.is_primary ? (
                        <span className="absolute bottom-0 inset-x-0 bg-dnd-gold/90 text-gray-900 text-[9px] font-semibold text-center leading-tight">
                          Primary
                        </span>
                      ) : (
                        <div className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                          <button
                            type="button"
                            disabled={altBusy}
                            onClick={() => startAltReframe(img)}
                            className="text-[9px] bg-gray-200 text-gray-900 rounded px-1.5 py-0.5 font-semibold disabled:opacity-50"
                          >Adjust</button>
                          <button
                            type="button"
                            disabled={altBusy}
                            onClick={() => handleAltMakePrimary(img)}
                            className="text-[9px] bg-dnd-gold text-gray-900 rounded px-1.5 py-0.5 font-semibold disabled:opacity-50"
                          >Make primary</button>
                          <button
                            type="button"
                            disabled={altBusy}
                            onClick={() => handleAltDelete(img)}
                            className="text-[9px] bg-red-700 hover:bg-red-600 text-white rounded px-1.5 py-0.5 disabled:opacity-50"
                          >Remove</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {altError && <p className="text-[11px] text-red-400 mt-2">{altError}</p>}
            </div>

            {/* Presentation art — the full picture players get shown, as
                opposed to the cropped token face above. */}
            <div className="border border-gray-700 rounded-lg p-3 bg-gray-900/40">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div>
                  <label className={labelClass}>Presentation art</label>
                  <p className="text-[11px] text-gray-500 leading-tight">
                    Shown full-screen by "Show image to players". Falls back to the token art when empty.
                  </p>
                </div>
                {creatureId && (
                  <>
                    <button
                      type="button"
                      disabled={displayBusy}
                      onClick={() => document.getElementById('creature-display-img').click()}
                      className="text-xs bg-gray-800 hover:bg-gray-700 disabled:opacity-50 border border-gray-600 rounded px-3 py-1.5 text-gray-200 shrink-0"
                    >{displayBusy ? 'Working…' : displayArt ? 'Replace' : '+ Add artwork'}</button>
                    <input
                      id="creature-display-img"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleDisplayArtUpload}
                    />
                  </>
                )}
              </div>

              {!creatureId ? (
                <p className="text-[11px] text-gray-500">Save this creature first, then add its artwork.</p>
              ) : !displayArt ? (
                <p className="text-[11px] text-gray-500">None — players will be shown the token image.</p>
              ) : (
                <div className="flex items-start gap-3">
                  <img
                    src={`/uploads/${displayArt}`}
                    alt=""
                    className="max-h-40 rounded-lg border border-gray-700 object-contain"
                  />
                  <button
                    type="button"
                    disabled={displayBusy}
                    onClick={handleDisplayArtRemove}
                    className="text-[11px] bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white rounded px-2 py-1"
                  >Remove</button>
                </div>
              )}
            </div>

            {/* 3D standing art — only the 3D view uses this. */}
            <div className="border border-gray-700 rounded-lg p-3 bg-gray-900/40">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div>
                  <label className={labelClass}>3D standing art</label>
                  <p className="text-[11px] text-gray-500 leading-tight">
                    Used only in the 3D view, where the token stands up facing the camera.
                    The flat map always keeps the token face above. Falls back to it when empty.
                    Add as many looks as you like — armoured, wounded, wild shaped — and click
                    one to put it on the board.
                  </p>
                </div>
                {creatureId && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      disabled={standeeBusy}
                      onClick={() => { setTokenEditorTarget('standee'); setTokenEditorOpen(true); }}
                      title="Build one in the 2-Minute Tabletop editor"
                      className="text-xs bg-gray-800 hover:bg-gray-700 disabled:opacity-50 border border-gray-600 rounded px-3 py-1.5 text-gray-200"
                    >Token editor</button>
                    <button
                      type="button"
                      disabled={standeeBusy}
                      onClick={() => document.getElementById('creature-standee-img').click()}
                      title="Add one or more looks — you can switch between them at any time"
                      className="text-xs bg-gray-800 hover:bg-gray-700 disabled:opacity-50 border border-gray-600 rounded px-3 py-1.5 text-gray-200"
                    >{standeeBusy ? 'Working…' : '+ Add artwork'}</button>
                    {standeeArt && (
                      <button
                        type="button"
                        disabled={standeeBusy}
                        onClick={startStandeeReframe}
                        title="Pan and zoom — set how much of the frame the figure fills, and so how big it stands"
                        className="text-xs bg-gray-800 hover:bg-gray-700 disabled:opacity-50 border border-gray-600 rounded px-3 py-1.5 text-gray-200"
                      >Adjust</button>
                    )}
                    <input
                      id="creature-standee-img"
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleStandeeGalleryUpload}
                    />
                  </div>
                )}
              </div>

              {!creatureId ? (
                <p className="text-[11px] text-gray-500">Save this creature first, then add its standing art.</p>
              ) : standeeGallery.length === 0 ? (
                <p className="text-[11px] text-gray-500">None — the 3D view will stand up the token face.</p>
              ) : (
                <>
                  {/* The wardrobe. The one on the board reads as selected; the
                      rest are one click from taking its place. Ordered with the
                      live one first, so "what is standing right now" is always
                      the leftmost tile rather than something to hunt for. */}
                  <div className="flex flex-wrap gap-2">
                    {standeeGallery.map((img) => {
                      const live = img.is_primary;
                      return (
                        <div
                          key={img.id ?? 'live'}
                          className={`relative rounded-lg border p-1 ${
                            live ? 'border-dnd-gold ring-1 ring-dnd-gold/50' : 'border-gray-700'
                          }`}
                          style={{
                            // Checkered behind it, because a standee usually has
                            // a cut-out background and a transparent PNG on a
                            // dark panel looks like a black rectangle.
                            backgroundImage:
                              'linear-gradient(45deg,#4b5563 25%,transparent 25%),linear-gradient(-45deg,#4b5563 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#4b5563 75%),linear-gradient(-45deg,transparent 75%,#4b5563 75%)',
                            backgroundSize: '12px 12px',
                            backgroundPosition: '0 0,0 6px,6px -6px,-6px 0',
                          }}
                        >
                          <img src={`/uploads/${img.image_path}`} alt="" className="h-32 object-contain" />

                          {live ? (
                            <span className="absolute top-1 left-1 text-[9px] font-bold uppercase tracking-wide bg-dnd-gold text-gray-900 rounded px-1.5 py-0.5">
                              On the board
                            </span>
                          ) : (
                            <button
                              type="button"
                              disabled={standeeBusy}
                              onClick={() => useStandee(img.id)}
                              title="Stand this one up on the board"
                              className="absolute inset-x-1 bottom-1 text-[10px] font-semibold bg-gray-900/90 hover:bg-dnd-gold hover:text-gray-900 disabled:opacity-50 text-gray-100 rounded py-1 transition-colors"
                            >Use this</button>
                          )}

                          <button
                            type="button"
                            disabled={standeeBusy}
                            onClick={() => (live ? handleStandeeRemove() : removeShelvedStandee(img.id))}
                            title={live ? 'Remove the standing art entirely' : 'Delete this look'}
                            className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center text-[11px] leading-none bg-red-700/90 hover:bg-red-600 disabled:opacity-50 text-white rounded"
                          >×</button>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-gray-500 mt-2">
                    Switching takes effect for everyone as soon as you click — no need to save the sheet.
                  </p>
                </>
              )}
            </div>

            {/* Token height — 3D only. */}
            <div className="border border-gray-700 rounded-lg p-3 bg-gray-900/40">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <label className={labelClass}>Token height (3D)</label>
                  <p className="text-[11px] text-gray-500 leading-tight">
                    How tall this token stands, in feet. Size category sets the
                    footprint — a halfling and a human share one square — so this is
                    what makes a short character look short. Leave blank to size it
                    from the artwork.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <input
                    type="number"
                    min={0.5} max={60} step={0.5}
                    placeholder="auto"
                    value={form.token_height_ft ?? ''}
                    onChange={(e) => setField('token_height_ft',
                      e.target.value === '' ? '' : Number(e.target.value))}
                    className={`w-20 ${inputClass}`}
                    title="Height in feet"
                  />
                  <span className="text-xs text-gray-500">ft</span>
                </div>
              </div>
              {/* The heights people actually reach for, so nobody has to look
                  up how tall a gnome is mid-session. */}
              <div className="flex flex-wrap gap-1 mt-2">
                {[['Gnome / halfling', 3], ['Dwarf', 4], ['Human', 6], ['Half-orc', 6.5],
                  ['Goliath', 8], ['Ogre', 10]].map(([label, ft]) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setField('token_height_ft', ft)}
                    className={`text-[10px] px-2 py-1 rounded border transition-colors ${
                      Number(form.token_height_ft) === ft
                        ? 'bg-dnd-gold/20 border-dnd-gold text-dnd-gold'
                        : 'bg-gray-800 border-gray-600 text-gray-300 hover:text-white hover:border-gray-500'
                    }`}
                  >{label} · {ft}ft</button>
                ))}
                {form.token_height_ft !== '' && form.token_height_ft != null && (
                  <button
                    type="button"
                    /* Empty string, not null: handleSubmit skips nulls, so a
                       null would leave the saved height in place. */
                    onClick={() => setField('token_height_ft', '')}
                    className="text-[10px] px-2 py-1 rounded border border-gray-600 bg-gray-800 text-gray-400 hover:text-white"
                  >Auto</button>
                )}
              </div>
            </div>

            {/* Base ring — 3D only, like the standing art above it. */}
            {(() => {
            // An unset ring is `undefined` on a creature that never had one and
            // `''` on one that has just been reset — the save skips nulls, so
            // clearing has to travel as an empty string, which the API turns
            // back into NULL. Both mean "use the default".
            const ringUnset = (v) => v === '' || v === null || v === undefined;
            const ringColor = ringUnset(form.base_color)
              ? (isPlayerCharacter ? '#4f8fff' : '#ff6b6b')
              : form.base_color;
            const ringOpacity = ringUnset(form.base_opacity) ? 70 : Number(form.base_opacity);
            const ringCustom = !ringUnset(form.base_color) || !ringUnset(form.base_opacity);
            return (
            <div className="border border-gray-700 rounded-lg p-3 bg-gray-900/40">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <label className={labelClass}>Base ring</label>
                  <p className="text-[11px] text-gray-500 leading-tight">
                    The ring drawn on the floor under this token in the 3D view.
                    Leave it unset for the default — blue for a player, red otherwise.
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <label className="flex flex-col items-center gap-1">
                    <span className="text-[10px] text-gray-400">Colour</span>
                    <input
                      type="color"
                      value={ringColor}
                      onChange={(e) => setField('base_color', e.target.value)}
                      className="w-10 h-8 bg-gray-800 border border-gray-600 rounded cursor-pointer p-0.5"
                      title="Ring colour"
                    />
                  </label>
                  <label className="flex flex-col items-center gap-1">
                    <span className="text-[10px] text-gray-400">
                      Opacity {ringOpacity}%
                    </span>
                    <input
                      type="range"
                      min={0} max={100} step={5}
                      value={ringOpacity}
                      onChange={(e) => setField('base_opacity', parseInt(e.target.value, 10))}
                      className="w-28 accent-dnd-gold"
                      title="How solid the ring is"
                    />
                  </label>
                </div>
              </div>

              <div className="flex items-center gap-3 mt-2">
                {/* On a checkerboard, because the whole point of the control is
                    how much of the floor shows through. */}
                <div
                  className="rounded p-1.5 border border-gray-700"
                  style={{
                    backgroundImage:
                      'linear-gradient(45deg,#4b5563 25%,transparent 25%),linear-gradient(-45deg,#4b5563 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#4b5563 75%),linear-gradient(-45deg,transparent 75%,#4b5563 75%)',
                    backgroundSize: '10px 10px',
                    backgroundPosition: '0 0,0 5px,5px -5px,-5px 0',
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-full"
                    style={{
                      backgroundColor: ringColor,
                      opacity: ringOpacity / 100,
                    }}
                  />
                </div>
                {ringCustom && (
                  <button
                    type="button"
                    /* Empty string, not null: handleSubmit skips null fields
                       entirely, so a null would leave the saved value in place
                       and the reset would appear to do nothing. */
                    onClick={() => { setField('base_color', ''); setField('base_opacity', ''); }}
                    className="text-[11px] text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded px-2 py-1"
                  >Reset to default</button>
                )}
              </div>
            </div>
            );
            })()}

            {/* For player characters the Subtype field is fed by the
                Race Picker below — no freeform input needed. Non-PC
                creatures (NPCs / monsters / GM-managed rows) keep the
                free-text input so a goblin can still be flagged
                "(goblinoid)" or whatever the GM types. */}
            <div className="grid grid-cols-2 gap-3">
              {!isPlayerCharacter && (
                <div>
                  <label className={labelClass}>Subtype</label>
                  <input className={inputClass} placeholder="(any race)" value={form.subtype} onChange={(e) => setField('subtype', e.target.value)} />
                </div>
              )}
              <div className={isPlayerCharacter ? 'col-span-2' : ''}>
                <label className={labelClass}>Alignment</label>
                <select className={inputClass} value={form.alignment} onChange={(e) => setField('alignment', e.target.value)}>
                  {ALIGNMENTS.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>

            {/* ── Race picker (player characters only) ──────────────────
                Cascading edition → race → sub-race selector. Type is
                pulled from the form's existing Type dropdown above, so
                the race list always reflects whatever the user picked
                there. Apply appends every trait into the stat-block
                arrays (Special Abilities / Actions / Bonus Actions /
                Reactions) based on the per-row category in races.js. */}
            {isPlayerCharacter && (() => {
              // Detect whether a race is currently applied — any entry
              // in special_abilities/actions/bonus_actions/reactions
              // with a __source starting "race:" indicates the picker
              // touched this character before.
              const hasAppliedRace = ['special_abilities','actions','bonus_actions','reactions'].some((key) =>
                (form[key] || []).some((r) => typeof r?.__source === 'string' && r.__source.startsWith('race:'))
              );
              return (
              <div className="border border-purple-700/40 bg-purple-900/10 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-purple-300 font-semibold uppercase tracking-wider">Race Picker</span>
                  <span className="text-[11px] text-gray-500">
                    {form.subtype ? `Current: ${form.subtype}` : 'SRD races · auto-fills traits'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className={labelClass}>Edition</label>
                    <select
                      className={inputClass}
                      value={raceEdition}
                      onChange={(e) => setRaceEdition(e.target.value)}
                    >
                      {RACE_EDITIONS.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Race</label>
                    <select
                      className={inputClass}
                      value={raceId}
                      onChange={(e) => setRaceId(e.target.value)}
                      disabled={racePickerRaces.length === 0}
                    >
                      <option value="">
                        {racePickerRaces.length === 0
                          ? 'None imported yet'
                          : 'Choose a race…'}
                      </option>
                      {racePickerRaces.map((r) => (
                        <option key={r.id} value={r.id}>
                          {raceEdition === 'all' && r.edition
                            ? `${r.name} (${editionLabel(r.edition)})`
                            : r.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    {/* The dropdown label varies by race — Goliath
                        calls them Ancestries, Tiefling Legacies, etc.
                        races.js declares the override; default is
                        "Sub-Race". */}
                    <label className={labelClass}>
                      {selectedRaceObj?.subraceLabel || 'Sub-Race'}
                    </label>
                    <select
                      className={inputClass}
                      value={subraceId}
                      onChange={(e) => setSubraceId(e.target.value)}
                      disabled={!selectedRaceObj || (selectedRaceObj.subraces || []).length === 0}
                    >
                      <option value="">
                        {!selectedRaceObj
                          ? '—'
                          : (selectedRaceObj.subraces || []).length === 0
                            ? `No ${(selectedRaceObj.subraceLabel || 'Sub-Race').toLowerCase()}`
                            : `Choose a ${(selectedRaceObj.subraceLabel || 'Sub-Race').toLowerCase()}…`}
                      </option>
                      {(selectedRaceObj?.subraces || []).map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {selectedRaceObj && (
                  <div className="space-y-1.5 mt-2">
                    <div className="text-[11px] text-gray-400">
                      The traits below will append to your stat block on Apply. Property rows like Size and Speed are skipped.
                    </div>
                    <div className="max-h-40 overflow-y-auto pr-1 space-y-1">
                      {combinedRaceTraits(selectedRaceObj, selectedSubraceObj).map((t, i) => (
                        <div key={`${t.name}-${i}`} className="flex items-baseline justify-between text-[11px] bg-gray-800/40 rounded px-2 py-1">
                          <span className="text-gray-200 font-semibold">{t.name}</span>
                          <span className="text-purple-300 font-mono">
                            {t.category === 'specialAbility' && 'Special'}
                            {t.category === 'action' && 'Action'}
                            {t.category === 'bonusAction' && 'Bonus'}
                            {t.category === 'reaction' && 'Reaction'}
                          </span>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={applyRacePicker}
                      disabled={!selectedRaceObj || ((selectedRaceObj.subraces || []).length > 0 && !selectedSubraceObj)}
                      className="w-full bg-purple-700 hover:bg-purple-600 disabled:bg-gray-700 disabled:text-gray-500 text-purple-100 text-xs font-semibold py-1.5 rounded transition-colors"
                    >
                      Apply race traits
                    </button>
                  </div>
                )}
                {/* Remove-current-race control. Lives outside the
                    selectedRaceObj block so it's reachable even when
                    no race is currently picked but a previous one is
                    still in the form. */}
                {hasAppliedRace && (
                  <button
                    type="button"
                    onClick={clearRacePickerContribution}
                    className="w-full mt-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-[11px] py-1 rounded transition-colors"
                  >
                    Remove current race traits
                  </button>
                )}
              </div>
              );
            })()}

            {/* Speed — sits under the race because the race is what sets it.
                Applying a race writes these fields, so seeing them here shows
                the player what the choice just did. */}
            <div>
              <h4 className="text-sm font-semibold text-dnd-gold mb-2">Speed (feet)</h4>
              <div className="grid grid-cols-5 gap-2">
                {['walk','fly','swim','burrow','climb'].map((type) => (
                  <div key={type}>
                    <label className={labelClass}>{type.charAt(0).toUpperCase()+type.slice(1)}</label>
                    <input
                      type="number"
                      className={smallInputClass + ' w-full'}
                      value={form[`speed_${type}`]}
                      min={0}
                      step={5}
                      onChange={(e) => setField(`speed_${type}`, parseInt(e.target.value) || 0)}
                    />
                  </div>
                ))}
              </div>
            </div>

            {isPlayerCharacter && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Class</label>
                    <select
                      className={inputClass}
                      value={form.char_class || ''}
                      onChange={(e) => setField('char_class', e.target.value)}
                    >
                      <option value="">— Select class —</option>
                      {allClasses.map(c => <option key={c} value={c}>{c}</option>)}
                      {/* Legacy free-text values not in the current class
                          list (e.g. an old plugin that's been disabled) are
                          preserved as a separate option so the field never
                          silently changes when the user opens the sheet. */}
                      {form.char_class && !allClasses.some(c => c.toLowerCase() === String(form.char_class).toLowerCase()) && (
                        <option value={form.char_class}>{form.char_class} (custom)</option>
                      )}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Subclass</label>
                    <select
                      className={inputClass}
                      value={form.char_subclass || ''}
                      onChange={(e) => setField('char_subclass', e.target.value)}
                      disabled={!form.char_class || allSubclasses.length === 0}
                    >
                      <option value="">
                        {!form.char_class
                          ? '— Pick a class first —'
                          : allSubclasses.length === 0
                            ? '— No subclasses defined —'
                            : '— Select subclass —'}
                      </option>
                      {allSubclasses.map(s => <option key={s} value={s}>{s}</option>)}
                      {/* Preserve any existing subclass value not in the
                          current list (legacy free-text data, or one set
                          while a now-disabled plugin was active) so the
                          field never silently changes on open. */}
                      {form.char_subclass && !allSubclasses.some(s => s.toLowerCase() === String(form.char_subclass).toLowerCase()) && (
                        <option value={form.char_subclass}>{form.char_subclass} (custom)</option>
                      )}
                    </select>
                  </div>
                </div>
                {/* Core class traits readout — primary ability, hit
                    die, save profs, weapon + armor training,
                    starting equipment options. Pure SRD reference,
                    no inputs. Auto-applied profs/saves/equipment
                    flow through the existing class-choices apply
                    machinery (Phase 2). */}
                {form.char_class && (() => {
                  const build = cachedClassBuild;
                  if (!build) return null;
                  // Every option the class prints, not just two: the Fighter
                  // offers a third, and an option can be gear AND gold.
                  const options = startingEquipmentOptions(build).map((o) => ({
                    id: o.id,
                    text: o.items?.length
                      ? `${o.items.join(', ')}${o.gp ? ` + ${o.gp} gp` : ''}`
                      : `${o.gp} gp`,
                  }));
                  const claimed = form.class_state?.starting_equipment || null;
                  return (
                    <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-xs space-y-1">
                      <h4 className="text-sm font-semibold text-dnd-gold mb-1">{form.char_class} — Core Traits</h4>
                      <div><span className="text-gray-400">Primary Ability: </span>{formatPrimaryAbility(build.primary)}</div>
                      <div><span className="text-gray-400">Hit Die: </span>{build.hitDie}</div>
                      <div><span className="text-gray-400">Saving Throws: </span>{(build.saves || []).join(', ')}</div>
                      <div><span className="text-gray-400">Armor Training: </span>{(build.armor || []).join(', ') || '—'}</div>
                      <div><span className="text-gray-400">Weapons: </span>{(build.weapons || []).join(', ')}</div>
                      {options.length > 0 && (
                        <div className="pt-1 mt-1 border-t border-gray-700 space-y-1">
                          <div className="text-gray-400">
                            Starting Equipment
                            <span className="text-gray-500"> — choose {options.map((o) => o.id).join(', ')}</span>
                          </div>
                          {options.map((o) => (
                            <div key={o.id} className="ml-2 flex items-start gap-2">
                              <button type="button"
                                disabled={!!claimed}
                                onClick={() => applyStartingEquipment(o.id)}
                                className="text-[10px] bg-dnd-gold/30 hover:bg-dnd-gold/50 disabled:bg-gray-700 disabled:text-gray-500 border border-dnd-gold/50 px-2 py-0.5 rounded shrink-0">
                                {claimed === o.id ? 'Taken' : `Take ${o.id}`}
                              </button>
                              <span><span className="text-gray-500">{o.id}:</span> {o.text}</span>
                            </div>
                          ))}
                          {claimed && (
                            <p className="text-[10px] text-gray-500 ml-2">
                              Equipment + gold added to inventory. Sell or drop unused items manually.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Hit points — under the class, which is what decides the
                    hit die they come from. */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Hit Points (avg)</label>
                    <input type="number" className={inputClass} value={form.hit_points} min={1} onChange={(e) => setField('hit_points', parseInt(e.target.value) || 1)} />
                    {/* WHERE THE EXTRA HIT POINTS CAME FROM.
                        This box takes a total and says nothing about how it was
                        reached, so the hit points a feat or a species adds —
                        quietly, every level — were worked out on paper or got
                        forgotten. Shown beside the number rather than in a
                        panel of its own: it is only ever read while typing
                        here. */}
                    {(() => {
                      const hp = maxHitPoints(form, cachedHitDicePool, form.hit_dice_bonus);
                      if (!hp.rows.length) return null;
                      const matches = Number(form.hit_points) === hp.total;
                      return (
                        <div className="mt-1.5 rounded-lg bg-gray-800/60 border border-gray-700 px-2 py-1.5">
                          <div className="text-[10px] uppercase tracking-wide text-gray-500 mb-0.5">
                            If every die rolled its best
                          </div>
                          {hp.rows.map((r) => (
                            <div key={r.label} className="flex items-baseline justify-between gap-2 text-[11px]">
                              <span className="text-gray-400 truncate">{r.label}</span>
                              <span className={`shrink-0 ${r.value < 0 ? 'text-red-300' : 'text-emerald-300'}`}>
                                {r.value >= 0 ? '+' : ''}{r.value}
                              </span>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => setField('hit_points', hp.total)}
                            disabled={matches}
                            // Sets the box rather than replacing it: the number
                            // stays the GM's to overrule, and a character whose
                            // player rolled their dice should keep what they
                            // rolled.
                            className={`mt-1.5 w-full py-1.5 rounded-lg text-[11px] font-semibold border transition-colors ${
                              matches
                                ? 'bg-gray-800/50 border-gray-700 text-gray-500'
                                : 'bg-emerald-900/50 border-emerald-700 text-emerald-100 active:bg-emerald-800'
                            }`}
                          >
                            {matches ? `Already ${hp.total}` : `Set to ${hp.total}`}
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                  <div>
                    <HitDiceEditor
                      pool={form.hit_dice_pool}
                      bonus={form.hit_dice_bonus}
                      derived={derivedHitDicePool}
                      isPlayerCharacter
                      onChange={applyHitDice}
                      labelClass={labelClass}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Level</label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      className={inputClass}
                      value={form.char_level ?? 1}
                      onChange={(e) => {
                        const v = parseInt(e.target.value);
                        setField('char_level', isNaN(v) ? 1 : Math.max(1, Math.min(20, v)));
                      }}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>XP</label>
                    <input
                      type="number"
                      min={0}
                      className={inputClass}
                      value={form.char_xp ?? 0}
                      onChange={(e) => setField('char_xp', Math.max(0, parseInt(e.target.value) || 0))}
                    />
                  </div>
                </div>

                {/* ── Background row ── */}
                {(() => {
                  const bg = findBackgroundMerged(form.background);
                  return (
                    <div className="flex items-center gap-3 bg-gray-800/40 border border-gray-700 rounded p-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-gray-400">Background</div>
                        <div className="text-sm text-gray-100 truncate">
                          {bg ? (
                            <>
                              <span className="text-amber-300">{bg.name}</span>
                              <span className="text-gray-500 ml-2">
                                · feat: {bg.feat?.name}
                                · skills: {bg.skills.map((raw) => {
                                  const k = typeof raw === 'string' ? raw : raw.skill;
                                  return SKILL_LABELS[k]?.split(' (')[0] || k;
                                }).join(', ')}
                                · tool: {bg.tool}
                              </span>
                            </>
                          ) : (
                            <span className="italic text-gray-500">— not set —</span>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          // Pre-load the modal with the current
                          // background's choices when one is set, so
                          // the user can review without hunting again.
                          const prev = (form.background_state && form.background_state.added) || {};
                          setBgPickedId(form.background || '');
                          setBgEquipment(prev.equipment || 'a');
                          // Best-effort restore of ASI selectors.
                          if (prev.abilities) {
                            const entries = Object.entries(prev.abilities);
                            const has2 = entries.find(([, n]) => n === 2);
                            const has1 = entries.find(([, n]) => n === 1 && (!has2 || has2[0] !== entries[0][0]));
                            if (has2 && has1) {
                              setBgAsiKind('2-1');
                              setBgAsiPlus2(has2[0]);
                              setBgAsiPlus1(has1[0]);
                            } else {
                              setBgAsiKind('1-1-1');
                            }
                          } else {
                            setBgAsiKind('2-1');
                            setBgAsiPlus2('');
                            setBgAsiPlus1('');
                          }
                          setShowBackgroundModal(true);
                        }}
                        className="text-xs bg-amber-900/40 hover:bg-amber-800/60 border border-amber-700 text-amber-200 px-3 py-1.5 rounded shrink-0">
                        {bg ? 'Change Background' : 'Set Background'}
                      </button>
                      {bg && (
                        <button
                          type="button"
                          onClick={removeBackground}
                          className="text-xs bg-red-900/40 hover:bg-red-800/60 border border-red-700 text-red-200 px-3 py-1.5 rounded shrink-0">
                          Remove
                        </button>
                      )}
                    </div>
                  );
                })()}

                {(() => {
                  const profSkills = Object.keys(STAT_OF_SKILL).filter((k) => form[k] != null);
                  // Expand category profs (Simple / Martial) into the
                  // concrete SRD weapon list so the Fighter Weapon
                  // Mastery picker shows Greatsword / Longsword /
                  // Shortbow etc. rather than just "Simple", "Martial".
                  const weaponProfs = cachedWeaponProfsExpanded;
                  const mcs = form.multiclasses || [];
                  // Total level = primary + sum(multiclass levels).
                  const totalLevel = (Number(form.char_level) || 0)
                    + mcs.reduce((acc, m) => acc + (Number(m.level) || 0), 0);
                  return (
                    <>
                      {/* Which edition's rules the class is built on.
                          Only shown when the class actually has options that
                          differ between editions, so it does not become a
                          question every character has to answer. */}
                      {[...optionGroupsForClass(form.char_class), ...extraOptionGroupsForClass(form.char_class)].some(
                        (g) => Object.keys(g.editions || {}).length > 1
                      ) && (
                        <label className="flex items-center gap-2 text-xs text-gray-300">
                          <span className="shrink-0">Class rules</span>
                          <select
                            value={classEdition}
                            onChange={(e) => setClassEdition(e.target.value)}
                            className="bg-gray-900 border border-gray-600 rounded px-2 py-1 text-xs text-gray-100"
                          >
                            <option value="srd2024">2024</option>
                            <option value="srd2014">2014</option>
                          </select>
                          <span className="text-[10px] text-gray-500 truncate">
                            decides which options this class offers
                          </span>
                        </label>
                      )}

                      <ClassChoicesPicker
                        charClass={form.char_class}
                        charLevel={form.char_level}
                        choices={classChoices}
                        classState={form.class_state}
                        proficientSkills={profSkills}
                        weaponProficiencies={weaponProfs}
                        onApply={(picks) => applyClassChoices(classChoices, picks)}
                        onRemove={removeClassChoices}
                      />

                      {/* Multiclasses ── extra classes layered on top of
                          the primary. Each row gets its own ChoicesPicker
                          tagged so applies don't bleed across rows. */}
                      <div className="bg-gray-800/40 border border-gray-700 rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-xs uppercase tracking-wider text-purple-300">Multiclasses</div>
                            <div className="text-[11px] text-gray-500">
                              Total character level: <span className="text-amber-300">{totalLevel || 0}</span>
                              {mcs.length > 0 && (
                                <span className="text-gray-500">
                                  {' '}({form.char_class || '—'} {form.char_level || 0}
                                  {mcs.map((m) => ` / ${m.class || '—'} ${m.level || 0}`).join('')})
                                </span>
                              )}
                            </div>
                          </div>
                          <button type="button" onClick={addMulticlass}
                            className="text-xs bg-purple-900/40 hover:bg-purple-800/60 border border-purple-700 text-purple-200 px-3 py-1.5 rounded">
                            + Add Class
                          </button>
                        </div>
                        {mcs.length === 0 && (
                          <p className="text-[11px] text-gray-500 italic">
                            No additional classes. Click "+ Add Class" to multiclass.
                          </p>
                        )}
                        {mcs.map((mc) => {
                          // Disable any class already taken by the
                          // primary or another multiclass row. The
                          // row's own current class is always
                          // selectable so the user can keep editing
                          // without their pick going grey.
                          const taken = new Set();
                          if (form.char_class) taken.add(String(form.char_class).toLowerCase());
                          for (const other of mcs) {
                            if (other.id !== mc.id && other.class) {
                              taken.add(String(other.class).toLowerCase());
                            }
                          }
                          return (
                            <MulticlassRow
                              key={mc.id}
                              mc={mc}
                              allClasses={allClasses}
                              disabledClasses={taken}
                              proficientSkills={profSkills}
                              weaponProficiencies={weaponProfs}
                              creature={form}
                              primaryClassName={form.char_class}
                              onChange={(patch) => updateMulticlass(mc.id, patch)}
                              onRemove={() => removeMulticlassRow(mc.id)}
                              onApplyChoices={(choices, picks) => applyMulticlassChoices(mc.id, choices, picks)}
                              onRemoveChoices={() => removeMulticlassChoices(mc.id)}
                            />
                          );
                        })}
                      </div>
                    </>
                  );
                })()}
              </>
            )}

            {isPlayerCharacter && (
              <ClassFeatures
                form={form}
                onAppendFeatures={(items) =>
                  setForm((f) => appendFeaturesWithGrants(f, items))
                }
              />
            )}

            {isPlayerCharacter && (
              <SubclassFeatures
                form={form}
                onAppendFeatures={(items) =>
                  setForm((f) => appendFeaturesWithGrants(f, items))
                }
              />
            )}

            {isPlayerCharacter && (
              <WildShapeForms
                value={form.wildshape_forms}
                onChange={(ids) => setField('wildshape_forms', ids)}
                druidLevel={druidLevelOfForm(form)}
                subclass={form.char_subclass}
                tempHp={wildShapeTempHp(druidLevelOfForm(form), form.char_subclass)}
              />
            )}

            {isPlayerCharacter && (
              <div className="bg-gray-800 rounded-lg p-3 space-y-2">
                <h4 className="text-sm font-semibold text-dnd-gold">Player Character Tracking</h4>
                <label className="flex items-center gap-2 text-sm text-gray-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!form.heroic_inspiration}
                    onChange={(e) => setField('heroic_inspiration', e.target.checked)}
                    className="accent-dnd-gold"
                  />
                  Heroic Inspiration
                </label>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <span className="text-gray-400 text-xs">Death Save Successes:</span>
                    {[0,1,2].map(i => (
                      <input
                        key={`dss${i}`}
                        type="checkbox"
                        checked={i < (Number(form.death_save_successes) || 0)}
                        onChange={(e) => setField('death_save_successes', e.target.checked ? (Number(form.death_save_successes) || 0) + 1 : (Number(form.death_save_successes) || 0) - 1)}
                        className="accent-green-500"
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-gray-400 text-xs">Failures:</span>
                    {[0,1,2].map(i => (
                      <input
                        key={`dsf${i}`}
                        type="checkbox"
                        checked={i < (Number(form.death_save_failures) || 0)}
                        onChange={(e) => setField('death_save_failures', e.target.checked ? (Number(form.death_save_failures) || 0) + 1 : (Number(form.death_save_failures) || 0) - 1)}
                        className="accent-red-500"
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Armor & Shield Proficiencies</label>
                  <div className="flex flex-wrap gap-3 text-sm">
                    {[
                      ['prof_light_armor', 'Light Armor'],
                      ['prof_medium_armor', 'Medium Armor'],
                      ['prof_heavy_armor', 'Heavy Armor'],
                      ['prof_shields', 'Shields'],
                    ].map(([k, label]) => (
                      <label key={k} className="flex items-center gap-1.5 cursor-pointer text-gray-200">
                        <input
                          type="checkbox"
                          checked={!!form[k]}
                          onChange={(e) => setField(k, e.target.checked)}
                          className="accent-dnd-gold"
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Concentrating On</label>
                  <select
                    className={inputClass}
                    value={form.concentrating_on || ''}
                    onChange={(e) => setField('concentrating_on', e.target.value)}
                  >
                    <option value="">Not concentrating</option>
                    {(form.spells || [])
                      .filter(s => s.duration && /concentration/i.test(s.duration))
                      .map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                    {(form.spells || []).some(s => s.duration && /concentration/i.test(s.duration))
                      ? null
                      : <option value="" disabled>(no spells with "concentration" in Duration)</option>}
                  </select>
                  <p className="text-xs text-gray-500 mt-0.5">Pulls from spells whose Duration contains "concentration".</p>
                </div>
              </div>
            )}

            {/* ── Held Bardic Inspiration banner ──
                Any character can hold one BI die at a time. When set,
                show a banner with a "Use" button that rolls the die,
                broadcasts to the dice log, and clears the field. */}
            {isPlayerCharacter && form.inspiration_die && (
              <div className="bg-purple-900/30 border border-purple-600 rounded-lg p-3 flex items-center gap-3">
                <span className="text-2xl">🎵</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-purple-200">
                    Bardic Inspiration: <span className="font-mono">{form.inspiration_die}</span>
                  </div>
                  <div className="text-[11px] text-purple-300/80">
                    Roll after a d20 Test (attack, save or check) and add the result. Lasts 10 minutes.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    const die = String(form.inspiration_die || '').trim();
                    const faces = parseInt(die.replace(/^d/, ''), 10);
                    if (!faces || !creature?.id) return;
                    const roll = 1 + Math.floor(Math.random() * faces);
                    socket.emit('roll_dice', {
                      dice: `d${faces}`,
                      count: 1,
                      modifier: 0,
                      label: `Bardic Inspiration (${die}) — ${form.name || 'character'} consumes it`,
                    });
                    // Local-only roll feedback in case the user wants to
                    // see it before the server's broadcast lands.
                    setField('inspiration_die', '');
                    try {
                      await fetch(`/api/creatures/${creature.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ inspiration_die: '' }),
                      });
                    } catch {}
                    // Surface the roll on the screen briefly.
                    window?.alert?.(`Bardic Inspiration ${die} → ${roll}`);
                  }}
                  className="text-xs bg-purple-700 hover:bg-purple-600 text-white px-3 py-1.5 rounded font-semibold"
                >
                  Use ({form.inspiration_die})
                </button>
              </div>
            )}

            {/* ── Class resource counters ──
                Bardic Inspiration / Ki / Sorcery Points / Channel
                Divinity / Action Surge / Rages / etc. The catalog
                derives totals from the character's class + level;
                only the mutable "used" count round-trips through
                creature.resource_state. Bardic Inspiration's row also
                gets a "Grant" button that PATCHes the chosen target's
                inspiration_die so a Bard can hand the die out. */}
            {isPlayerCharacter && (() => {
              const resources = resourcesForCreature(form);
              if (resources.length === 0) return null;
              const state = form.resource_state || {};
              const setUsed = (id, value) => {
                setField('resource_state', {
                  ...state,
                  [id]: { ...(state[id] || {}), used: Math.max(0, value) },
                });
              };
              const resetAll = () => setField('resource_state', {});
              return (
                <div className="bg-gray-800 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-dnd-gold">Resources</h4>
                    <button
                      type="button"
                      onClick={resetAll}
                      className="text-[11px] bg-gray-700 hover:bg-gray-600 text-gray-200 px-2 py-1 rounded"
                    >
                      Reset all (long rest)
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {resources.map(({ def, total }) => {
                      const used = Number(state[def.id]?.used) || 0;
                      const remaining = total === Infinity ? Infinity : Math.max(0, total - used);
                      const totalLabel = total === Infinity ? '∞' : total;
                      const isBI = def.id === 'bardic-inspiration';
                      // Custom-class resources may declare action: 'grant'
                      // with a die size — surface the same Grant button.
                      // Routes through the recipient's inspiration_die
                      // slot, so only one granted die per recipient at
                      // a time (same constraint as Bardic Inspiration).
                      const canGrant = isBI || (def.custom && def.action === 'grant' && def.die);
                      return (
                        <div key={def.id} className="flex items-center gap-2 text-sm bg-gray-900/40 border border-gray-700 rounded px-2 py-1.5">
                          <div className="flex-1 min-w-0">
                            <div className="text-gray-100">{def.label}</div>
                            {def.note && (
                              <div className="text-[11px] text-gray-500 leading-snug">{def.note}</div>
                            )}
                          </div>
                          {canGrant && (
                            <button
                              type="button"
                              disabled={used >= total}
                              onClick={() => setBardicGrant({ def, total, used })}
                              className="text-[11px] bg-purple-700 hover:bg-purple-600 disabled:opacity-30 text-white px-2 py-1 rounded font-semibold"
                              title="Grant the die to another character"
                            >Grant →</button>
                          )}
                          {/* A pool (e.g. the Abjurer's Arcane Ward) soaks
                              damage in chunks, so it gets a number box —
                              clicking − eight times for an 8-damage hit is
                              nobody's idea of a good time. */}
                          {def.pool && (
                            <input
                              type="number"
                              min={0}
                              max={total}
                              value={remaining === Infinity ? '' : remaining}
                              onChange={(e) => {
                                const left = Math.max(0, Math.min(total, Number(e.target.value) || 0));
                                setUsed(def.id, total - left);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="w-16 bg-gray-800 border border-gray-600 rounded px-1 py-0.5 text-xs text-white text-center"
                              title="Points left in the pool"
                            />
                          )}
                          <button
                            type="button"
                            disabled={total !== Infinity && used >= total}
                            onClick={() => setUsed(def.id, used + 1)}
                            className="w-7 h-7 rounded bg-red-900/40 hover:bg-red-800/60 disabled:opacity-30 border border-red-800 text-red-200 leading-none"
                            title={def.pool ? 'Absorb 1 damage' : 'Use one'}
                          >−</button>
                          <span className="font-mono text-gray-100 min-w-[64px] text-center">
                            {remaining === Infinity ? '∞' : remaining} / {totalLabel}
                          </span>
                          <button
                            type="button"
                            disabled={used <= 0}
                            onClick={() => setUsed(def.id, used - 1)}
                            className="w-7 h-7 rounded bg-emerald-900/40 hover:bg-emerald-800/60 disabled:opacity-30 border border-emerald-800 text-emerald-200 leading-none"
                            title="Restore one"
                          >+</button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {!isPlayerCharacter && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Challenge Rating</label>
                  <select className={inputClass} value={form.challenge_rating} onChange={(e) => handleCRChange(e.target.value)}>
                    {CR_VALUES.map((cr) => <option key={cr} value={cr}>{cr}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>XP</label>
                  <input type="number" className={inputClass} value={form.xp} onChange={(e) => setField('xp', parseInt(e.target.value) || 0)} />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Proficiency Bonus</label>
                <input type="number" className={inputClass} value={form.proficiency_bonus} min={-10} max={9} onChange={(e) => { const v = parseInt(e.target.value); setField('proficiency_bonus', isNaN(v) ? 2 : v); }} />
              </div>
              <div>
                <label className={labelClass}>Languages</label>
                <LanguagePicker value={form.languages} onChange={(v) => setField('languages', v)} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Tool Proficiencies</label>
                <input
                  className={inputClass}
                  placeholder="e.g. Thieves' Tools, Lute, Smith's Tools"
                  value={form.tool_proficiencies || ''}
                  onChange={(e) => setField('tool_proficiencies', e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>Weapon Proficiencies</label>
                <input
                  className={inputClass}
                  placeholder="e.g. Simple weapons, Longsword, Shortbow"
                  value={form.weapon_proficiencies || ''}
                  onChange={(e) => setField('weapon_proficiencies', e.target.value)}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className={labelClass} style={{ marginBottom: 0 }}>Passive Perception</label>
                <button
                  type="button"
                  onClick={() => {
                    const wisMod = mod(form.wisdom);
                    const pb = form.proficiency_bonus ?? 2;
                    const proficient = form.skill_perception !== null && form.skill_perception !== undefined;
                    setField('passive_perception', 10 + wisMod + (proficient ? pb : 0));
                  }}
                  className="text-xs text-dnd-gold hover:text-yellow-300 transition-colors"
                  title="10 + Wis mod + Prof bonus (if perception is checked)"
                >
                  Auto-calc
                </button>
              </div>
              <input
                type="number"
                className={inputClass}
                value={form.passive_perception}
                min={1}
                max={30}
                onChange={(e) => setField('passive_perception', parseInt(e.target.value) || 10)}
              />
              <p className="text-xs text-gray-500 mt-0.5">= 10 + Wis mod{form.skill_perception !== null && form.skill_perception !== undefined ? ' + Prof bonus' : ''}</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className={labelClass}>Senses</label>
                <button
                  type="button"
                  onClick={addSense}
                  className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded text-gray-200"
                >
                  + Add
                </button>
              </div>
              {(form.senses || []).length === 0 && (
                <div className="text-xs text-gray-500 italic py-1">No senses — click + Add to define vision</div>
              )}
              {(form.senses || []).map((s, i) => (
                <div key={i} className="flex items-center gap-2 mb-2">
                  <select
                    className="flex-1 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-dnd-gold"
                    value={s.type || 'normal'}
                    onChange={(e) => updateSense(i, 'type', e.target.value)}
                  >
                    <option value="normal">Normal Vision</option>
                    <option value="darkvision">Darkvision</option>
                    <option value="truesight">Truesight</option>
                    <option value="blindsight">Blindsight</option>
                    <option value="tremorsense">Tremorsense</option>
                  </select>
                  {(s.type === 'darkvision' || s.type === 'blindsight' || s.type === 'truesight' || s.type === 'tremorsense') && (
                    <select
                      className="w-24 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-dnd-gold"
                      value={s.range || 60}
                      onChange={(e) => updateSense(i, 'range', parseInt(e.target.value))}
                    >
                      <option value={10}>10 ft</option>
                      <option value={20}>20 ft</option>
                      <option value={30}>30 ft</option>
                      <option value={60}>60 ft</option>
                      <option value={90}>90 ft</option>
                      <option value={120}>120 ft</option>
                    </select>
                  )}
                  <button
                    type="button"
                    onClick={() => removeSense(i)}
                    className="text-red-400 hover:text-red-300 px-1"
                  >
                    <XIcon />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── COMBAT TAB ─────────────────────────────── */}
        {activeTab === 'combat' && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelClass}>Armor Class</label>
                {isPlayerCharacter ? (
                  // Derived from equipment + DEX, so it can't fall out of step
                  // with what the character is wearing. Adjustments go in the
                  // Bonus field beside it.
                  <div className={`${inputClass} flex items-center justify-between bg-gray-800/70 cursor-not-allowed`} title="Calculated from equipped armor, shield and DEX. Use Bonus to adjust.">
                    <span className="font-mono">{form.armor_class}</span>
                    <span className="text-[10px] text-gray-500 uppercase tracking-wide">auto</span>
                  </div>
                ) : (
                  <input type="number" className={inputClass} value={form.armor_class} min={1} onChange={(e) => setField('armor_class', parseInt(e.target.value) || 10)} />
                )}
              </div>
              <div>
                <label className={labelClass}>AC Bonus</label>
                <input
                  type="number"
                  className={inputClass}
                  placeholder="0"
                  title="Flat adjustment added on top — cover, a class feature, a ruling."
                  value={form.ac_misc_bonus ?? 0}
                  onChange={(e) => setField('ac_misc_bonus', parseInt(e.target.value) || 0)}
                />
              </div>
              <div>
                <label className={labelClass}>AC Description</label>
                <input className={inputClass} placeholder="natural armor" value={form.armor_desc} onChange={(e) => setField('armor_desc', e.target.value)} />
              </div>
            </div>
            {/* Computed AC readout — shows the rolled-up total + its
                breakdown so the player can see where the AC comes
                from. The value is auto-pushed into the manual Armor
                Class field via the useEffect below, so the stat
                block / iOS stays in lockstep. */}
            {(() => {
              const calc = computeAcFromGear(form, isPlayerCharacter);
              if (!calc) return null;
              return (
                <div className="bg-gray-800 border border-emerald-700/40 rounded-lg p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-emerald-300 font-semibold uppercase tracking-wider">Computed AC from gear</div>
                    <span className="text-xl font-bold text-emerald-200 font-mono">{calc.total}</span>
                  </div>
                  <div className="text-[11px] text-gray-400 font-mono">
                    {calc.parts.join(' + ')} = {calc.total}
                  </div>
                  {(() => {
                    const nat = naturalArmorOf(form);
                    if (!nat) return null;
                    return (
                      <div className="text-[11px] text-amber-300/90 leading-snug">
                        Natural armor: AC {nat.base}
                        {nat.ability
                          ? ` + ${nat.ability.slice(0, 3).toUpperCase()}`
                          : ' (DEX does not apply)'}
                        {nat.blocksArmor
                          ? '. Body armor can\'t be worn — shields, helmets, gauntlets and worn magic items still count.'
                          : '. Used when it beats what this character is wearing.'}
                      </div>
                    );
                  })()}
                </div>
              );
            })()}

            {/* Player characters set hit points on the Basic tab, right
                under the class that decides the hit die. Monsters and NPCs
                have no class picker there, so they keep the fields here. */}
            {!isPlayerCharacter && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Hit Points (avg)</label>
                  <input type="number" className={inputClass} value={form.hit_points} min={1} onChange={(e) => setField('hit_points', parseInt(e.target.value) || 1)} />
                </div>
                <div>
                  <HitDiceEditor
                    pool={form.hit_dice_pool}
                    bonus={form.hit_dice_bonus}
                    derived={derivedHitDicePool}
                    onChange={applyHitDice}
                    labelClass={labelClass}
                  />
                </div>
              </div>
            )}

            {(isPlayerCharacter || cachedHitDicePool.length > 0) && (() => {
              const pool = cachedHitDicePool;
              const onAuto = normalizeHitDicePool(form.hit_dice_pool).length === 0;
              const usedMap = (form.hit_dice_used_by_type && typeof form.hit_dice_used_by_type === 'object')
                ? form.hit_dice_used_by_type : {};
              return (
                <div className="bg-gray-800 rounded-lg p-3 space-y-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <h4 className="text-sm font-semibold text-dnd-gold">Hit Dice Pool</h4>
                    <span className="text-xs text-gray-500">
                      {onAuto
                        ? (isPlayerCharacter ? 'Auto from class + multiclasses' : 'From the hit-dice formula')
                        : 'Set by hand above'}
                    </span>
                  </div>
                  {pool.length === 0 ? (
                    <p className="text-xs text-gray-500">
                      {isPlayerCharacter
                        ? 'Pick a class, or add a die type above, to populate the pool.'
                        : 'Add a die type above to populate the pool.'}
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {pool.map(({ type, qty }) => {
                        const used = Math.max(0, Math.min(qty, Number(usedMap[type]) || 0));
                        return (
                          <div key={type} className="flex flex-wrap items-center gap-2 text-xs text-gray-300">
                            <span className="font-mono w-14">{qty}{type}</span>
                            <span>Used:</span>
                            {Array.from({ length: qty }).map((_, i) => (
                              <input
                                key={`${type}-${i}`}
                                type="checkbox"
                                checked={i < used}
                                onChange={(e) => {
                                  const next = e.target.checked ? Math.min(qty, used + 1) : Math.max(0, used - 1);
                                  setField('hit_dice_used_by_type', { ...usedMap, [type]: next });
                                }}
                                className="accent-dnd-red"
                              />
                            ))}
                            <span className="ml-1 text-gray-400">{qty - used}/{qty} available</span>
                          </div>
                        );
                      })}
                      <p className="text-[11px] text-gray-500 pt-1">{formatHitDicePool(pool)}</p>
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Initiative Bonus</label>
                <input
                  type="number"
                  className={inputClass}
                  value={form.initiative_bonus ?? 0}
                  min={-20}
                  max={20}
                  onChange={(e) => { const v = e.target.valueAsNumber; if (!isNaN(v)) setField('initiative_bonus', v); }}
                />
                <p className="text-xs text-gray-500 mt-0.5">Added to Dex modifier when rolling initiative</p>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-dnd-gold mb-2">Damage & Conditions</h4>
              <div className="space-y-2">
                {[
                  { key: 'damage_vulnerabilities', label: 'Vulnerabilities' },
                  { key: 'damage_resistances', label: 'Resistances' },
                  { key: 'damage_immunities', label: 'Damage Immunities' },
                  { key: 'condition_immunities', label: 'Condition Immunities' },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label className={labelClass}>{label}</label>
                    <input className={inputClass} placeholder="fire, cold" value={form[key]} onChange={(e) => setField(key, e.target.value)} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── ABILITY SCORES TAB ─────────────────────── */}
        {activeTab === 'abilities' && (
          <div className="space-y-4">
            <div className="flex items-baseline justify-between gap-2">
              <h4 className="text-sm font-semibold text-dnd-gold">Ability Scores</h4>
              <span className="text-[11px] text-gray-500">
                Type your base score — bonuses are listed under it
              </span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {[
                { key: 'strength', label: 'STR' },
                { key: 'dexterity', label: 'DEX' },
                { key: 'constitution', label: 'CON' },
                { key: 'intelligence', label: 'INT' },
                { key: 'wisdom', label: 'WIS' },
                { key: 'charisma', label: 'CHA' },
              ].map(({ key, label }) => {
                // The form column is the FINAL score, so the base the player
                // rolled or bought is that total minus everything a
                // background / class / feature put on top. Editing the base
                // writes total = base + bonuses, which keeps the derived
                // numbers (saves, skills, AC) reading one field as before.
                const sources = abilityBonusSources[key] || [];
                const bonus = sources.reduce((acc, s) => acc + s.amount, 0);
                const total = Number(form[key]) || 0;
                const base = total - bonus;
                return (
                  <div key={key} className="bg-gray-800 rounded-xl p-3 text-center border border-gray-700">
                    <div className="text-xs text-gray-400 font-semibold mb-1">{label}</div>
                    <div className="text-[10px] uppercase tracking-wider text-gray-500">Base</div>
                    <input
                      type="number"
                      className="w-full bg-transparent text-center text-2xl font-bold text-white focus:outline-none"
                      value={base}
                      min={1}
                      max={30}
                      onChange={(e) => {
                        const nextBase = parseInt(e.target.value);
                        setField(key, (isNaN(nextBase) ? 10 : nextBase) + bonus);
                      }}
                    />
                    {sources.length > 0 && (
                      <div className="mt-1 space-y-0.5 text-left">
                        {sources.map((sdef, i) => (
                          <div key={`${sdef.label}-${i}`}
                            className="flex items-baseline justify-between gap-1 text-[10px] leading-tight">
                            <span className="text-emerald-300 font-mono shrink-0">
                              {sdef.amount > 0 ? `+${sdef.amount}` : sdef.amount}
                            </span>
                            <span className="text-gray-400 truncate" title={sdef.label}>{sdef.label}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="mt-1 pt-1 border-t border-gray-700">
                      <div className="text-[10px] uppercase tracking-wider text-gray-500">Total</div>
                      <div className="text-lg font-bold text-white leading-tight">{total}</div>
                      <div className="text-sm text-dnd-gold">{fmtMod(mod(total))}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-gray-500">
              Background and class bonuses are applied by their pickers on the Basic tab.
              Change a background there to move its points.
            </p>
          </div>
        )}

        {/* ── SKILLS & SAVES TAB ─────────────────────── */}
        {activeTab === 'skills' && (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-dnd-gold mb-2">Saving Throws</h4>
              <div className="grid grid-cols-2 gap-2">
                {SAVES.map(({ key, label, stat }) => {
                  const proficient = form[key] !== null && form[key] !== undefined;
                  return (
                    <label key={key} className="flex items-center gap-2 bg-gray-800 rounded p-2 cursor-pointer hover:bg-gray-750">
                      <input
                        type="checkbox"
                        checked={proficient}
                        onChange={() => toggleSave(key, stat)}
                        className="accent-dnd-gold"
                      />
                      <span className="text-sm text-gray-200 flex-1">{label}</span>
                      <span className="text-sm text-dnd-gold font-mono">
                        {proficient ? fmtMod(form[key]) : fmtMod(mod(form[stat]))}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-dnd-gold mb-2">Skills</h4>
              <div className="space-y-1">
                {SKILLS.map(({ key, label, stat }) => {
                  const proficient = form[key] !== null && form[key] !== undefined;
                  const expert = !!(form.skill_expertise && form.skill_expertise[key]);
                  // Flat feature bonuses (Primal Order, Divine Order) are not
                  // proficiency and are not stored in the column, so the number
                  // on the right has to add them in — otherwise the editor
                  // disagrees with the player's own sheet.
                  const featureBonus = skillFeatureBonuses.get(key) || null;
                  const shown = (proficient ? Number(form[key]) : mod(form[stat]))
                    + (featureBonus ? featureBonus.total : 0);
                  return (
                    <div key={key} className="flex items-center gap-2 p-1.5 rounded hover:bg-gray-800">
                      <label className="flex items-center cursor-pointer" title="Proficient">
                        <input
                          type="checkbox"
                          checked={proficient}
                          onChange={() => toggleSkill(key, stat)}
                          className="accent-dnd-gold"
                        />
                      </label>
                      <label className={`flex items-center cursor-pointer ${!proficient ? 'opacity-40' : ''}`} title="Expertise (doubles proficiency)">
                        <input
                          type="checkbox"
                          checked={expert}
                          disabled={!proficient}
                          onChange={() => toggleExpertise(key, stat)}
                          className="accent-purple-400"
                        />
                      </label>
                      <span className="text-sm text-gray-200 flex-1">
                        {label}{expert && <span className="text-xs text-purple-400 ml-1">(exp)</span>}
                        {featureBonus && (
                          <span className="block text-[10px] text-sky-300/80">
                            {fmtMod(featureBonus.total)} {featureBonus.sources.map((x) => x.label).join(', ')}
                          </span>
                        )}
                      </span>
                      <span className="text-xs text-gray-500">({stat.slice(0,3).toUpperCase()})</span>
                      <span className="text-sm text-dnd-gold font-mono w-8 text-right">
                        {fmtMod(shown)}
                      </span>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-gray-500 mt-1">☐ left = proficient · ☐ right = expertise (requires proficiency)</p>
            </div>
          </div>
        )}

        {/* ── TRAITS & ACTIONS TAB ─────────────────── */}
        {activeTab === 'traits' && (
          <div className="space-y-6">
            <AbilityList
              label="Special Traits"
              items={form.special_abilities}
              onAdd={() => listAdd('special_abilities')}
              onRemove={(i) => listRemove('special_abilities', i)}
              onChange={(i, f, v) => listChange('special_abilities', i, f, v)}
            />
            {isPlayerCharacter && (
              <>
                <AbilityList
                  label="Class Features"
                  items={form.class_features || []}
                  onAdd={() => listAdd('class_features')}
                  onRemove={(i) => listRemove('class_features', i)}
                  onChange={(i, f, v) => listChange('class_features', i, f, v)}
                />
                <div className="space-y-1">
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setShowFeatPicker(true)}
                      className="text-xs px-2 py-1 rounded bg-amber-800 hover:bg-amber-700 text-amber-50"
                    >
                      + Choose from feat list
                    </button>
                  </div>
                  <AbilityList
                    label="Feats"
                    items={form.feats || []}
                    onAdd={() => listAdd('feats')}
                    onRemove={(i) => listRemove('feats', i)}
                    onChange={(i, f, v) => listChange('feats', i, f, v)}
                  />
                </div>
              </>
            )}
            {isPlayerCharacter && (
              <AbilityList
                label="Movement"
                items={form.movement_actions || []}
                onAdd={() => listAdd('movement_actions')}
                onRemove={(i) => listRemove('movement_actions', i)}
                onChange={(i, f, v) => listChange('movement_actions', i, f, v)}
              />
            )}
            <AbilityList
              label="Actions"
              items={form.actions}
              onAdd={() => listAdd('actions')}
              onRemove={(i) => listRemove('actions', i)}
              onChange={(i, f, v) => listChange('actions', i, f, v)}
            />
            <AbilityList
              label="Bonus Actions"
              items={form.bonus_actions}
              onAdd={() => listAdd('bonus_actions')}
              onRemove={(i) => listRemove('bonus_actions', i)}
              onChange={(i, f, v) => listChange('bonus_actions', i, f, v)}
            />
            <AbilityList
              label="Reactions"
              items={form.reactions}
              onAdd={() => listAdd('reactions')}
              onRemove={(i) => listRemove('reactions', i)}
              onChange={(i, f, v) => listChange('reactions', i, f, v)}
            />
            {!isPlayerCharacter && (
              <div>
                <AbilityList
                  label="Legendary Actions"
                  items={form.legendary_actions}
                  onAdd={() => listAdd('legendary_actions')}
                  onRemove={(i) => listRemove('legendary_actions', i)}
                  onChange={(i, f, v) => listChange('legendary_actions', i, f, v)}
                />
                {form.legendary_actions.length > 0 && (
                  <div className="mt-2">
                    <label className={labelClass}>Legendary Action Count per Round</label>
                    <input
                      type="number"
                      className={`w-20 ${smallInputClass}`}
                      value={form.legendary_action_count}
                      min={0}
                      max={10}
                      onChange={(e) => setField('legendary_action_count', parseInt(e.target.value) || 0)}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Spells tab ── */}
        {activeTab === 'spells' && (
          <div className="space-y-5">
            <SpellCapacityBar form={form} />
            <SpellLibraryPicker
              charClass={form.char_class}
              classEntries={classEntriesOf(form)}
              ownedNames={(form.spells || []).map(s => s?.name).filter(Boolean)}
              onLearn={(libSpell) => {
                // Avoid name collision in this character's spell list.
                const existing = (form.spells || []).find(s => (s.name || '').toLowerCase() === (libSpell.name || '').toLowerCase());
                if (existing) {
                  alert(`"${libSpell.name}" is already in this character's spells.`);
                  return;
                }
                const learned = {
                  id: Date.now() + Math.random(),
                  name: libSpell.name || '',
                  level: Number(libSpell.level) || 0,
                  type: spellType(libSpell.type).key,
                  school: libSpell.school || '',
                  casting_time: libSpell.casting_time || '',
                  range_area: libSpell.range_area || '',
                  duration: libSpell.duration || '',
                  comp_v: !!libSpell.comp_v,
                  comp_s: !!libSpell.comp_s,
                  comp_m: !!libSpell.comp_m,
                  comp_m_text: libSpell.comp_m_text || '',
                  attack_save: libSpell.attack_save || '',
                  save_ability: libSpell.save_ability || '',
                  damage_entries: Array.isArray(libSpell.damage_entries) && libSpell.damage_entries.length
                    ? libSpell.damage_entries.map(d => ({ damage: d.damage || '', damage_type: d.damage_type || '' }))
                    : [{ damage: '', damage_type: '' }],
                  extra_effects: libSpell.extra_effects || '',
                  description: libSpell.description || '',
                  prepared: false,
                  casting_ability: '',
                };
                setForm(f => ({ ...f, spells: [...(f.spells || []), learned] }));
              }}
            />
            {/* Slot totals fall back to the class table when the sheet doesn't
                carry one, matching PlayerView — otherwise the editor showed 0
                for levels a caster demonstrably has. A saved total still wins,
                and the class-table number is surfaced beside it when the two
                disagree so a stale hand-entered value is visible rather than
                silently authoritative. Warlocks keep everything at their Pact
                Magic slot level. */}
            {(() => {
            const derivedSlots = spellSlotsForCreature(form);
            const pact = pactMagicForCreature(form);
            if (pact) derivedSlots[pact.slotLevel] = Math.max(derivedSlots[pact.slotLevel] || 0, pact.slots);
            return [0,1,2,3,4,5,6,7,8,9].map((level) => {
              const levelSpells = (form.spells || []).filter((s) => s.level === level);
              const saved = form.spell_slots?.[level];
              const fromTable = derivedSlots[level] || 0;
              const slots = { total: saved?.total || fromTable, used: saved?.used || 0 };
              const tableDiffers = fromTable > 0 && saved?.total > 0 && saved.total !== fromTable;
              const byType = SPELL_TYPES.map((t) => ({
                ...t,
                spells: levelSpells.filter((s) => spellType(s.type).key === t.key),
              }));
              const hasContent = levelSpells.length > 0 || (level > 0 && slots.total > 0);
              // Always show level 0; show others only if they have content or we always show them
              // Show all levels for discoverability
              return (
                <div key={level} className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden">
                  {/* Level header */}
                  <div className="flex items-center justify-between px-3 py-2 bg-gray-800 border-b border-gray-700">
                    <span className="text-sm font-semibold text-dnd-gold">
                      {level === 0 ? 'Cantrips (Level 0)' : `Level ${level}`}
                    </span>
                    {level > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">Slots:</span>
                        <input
                          type="number"
                          min={0}
                          max={9}
                          className="w-10 bg-gray-700 border border-gray-600 rounded px-1.5 py-0.5 text-xs text-white text-center focus:outline-none focus:border-dnd-gold"
                          value={slots.total}
                          onChange={(e) => setSlotTotal(level, Math.max(0, parseInt(e.target.value) || 0))}
                          title={`How many level ${level} slots this character has in total. Blank or 0 falls back to the class table.`}
                        />
                        {tableDiffers && (
                          <button
                            type="button"
                            onClick={() => setSlotTotal(level, fromTable)}
                            className="text-[10px] text-amber-300 hover:text-amber-200 underline decoration-dotted"
                            title={`The class table gives ${fromTable} at this level, but the sheet says ${saved.total}. Click to use ${fromTable}.`}
                          >
                            table: {fromTable}
                          </button>
                        )}
                        {slots.total > 0 && (
                          <>
                            <span className="text-xs text-gray-400">Used:</span>
                            <div className="flex gap-1" title="One box per slot — tick a box to spend that slot">
                              {Array.from({ length: slots.total }).map((_, i) => (
                                <input
                                  key={i}
                                  type="checkbox"
                                  checked={i < (slots.used || 0)}
                                  onChange={(e) => setSlotUsed(
                                    level,
                                    e.target.checked ? (slots.used || 0) + 1 : (slots.used || 0) - 1,
                                    slots.total,
                                  )}
                                  className="w-3.5 h-3.5 accent-dnd-red cursor-pointer"
                                  title={i < (slots.used || 0) ? 'Spent — untick to restore' : 'Available — tick to spend'}
                                />
                              ))}
                            </div>
                            <span className="text-xs text-gray-500 whitespace-nowrap">
                              {slots.used || 0} spent · {slots.total - (slots.used || 0)} left
                            </span>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="p-3 space-y-3">
                    {byType.map((group) => (
                      <div key={group.key}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={`text-xs font-semibold ${group.dark}`}>
                            {group.key === 'combat' ? <SwordIcon /> : group.key === 'healing' ? <CrossIcon /> : <OrbIcon />}
                            {group.label}
                          </span>
                          <button
                            type="button"
                            onClick={() => addSpell(level, group.key)}
                            className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-0.5 rounded text-gray-300 transition-colors"
                          >+ Add</button>
                        </div>
                        {group.spells.length === 0 && (
                          <p className="text-xs text-gray-600 italic pl-1">None</p>
                        )}
                        {group.spells.map((spell) => (
                          <SpellEditor
                            key={spell.id}
                            spell={spell}
                            updateSpell={updateSpell}
                            removeSpell={removeSpell}
                            swapSpellType={swapSpellType}
                            reorderSpell={reorderSpell}
                            getSpellDmgEntries={getSpellDmgEntries}
                            addSpellDmgEntry={addSpellDmgEntry}
                            updateSpellDmgEntry={updateSpellDmgEntry}
                            removeSpellDmgEntry={removeSpellDmgEntry}
                            borderClass={group.key === 'combat' ? 'border-red-900/40' : group.key === 'healing' ? 'border-green-900/40' : 'border-blue-900/40'}
                            isUtility={group.key === 'utility'}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              );
            });
            })()}
          </div>
        )}

        {/* ── Loot tab ── */}
        {activeTab === 'loot' && (
          <div className="space-y-3">
            {/* The rollable table: one roll on death, from the token's own
                right-click menu. Separate from the fixed item list below,
                which is specific items each with their own percentage. */}
            <div className="p-3 rounded-lg bg-gray-900/60 border border-gray-700">
              <label className="block text-xs text-gray-400 mb-1">
                Loot table
                <span className="text-gray-600"> — rolled from the token menu when one is slain</span>
              </label>
              <select
                value={form.loot_table_id ?? ''}
                onChange={(e) => setField('loot_table_id', e.target.value)}
                className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-dnd-gold"
              >
                <option value="">None</option>
                {lootTables.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}{t.row_count ? ` (${t.row_count} rows)` : ''}
                  </option>
                ))}
              </select>
              {lootTables.length === 0 && (
                <p className="text-[11px] text-gray-500 mt-1">
                  No tables yet — use “Import DMG treasure” on the Tables tab.
                </p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400">Items this creature may drop on death. Chance is the percentage probability (0–100).</p>
              <button
                type="button"
                onClick={addLootItem}
                className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded text-gray-300 transition-colors shrink-0 ml-2"
              >
                + Add Item
              </button>
            </div>

            {(form.loot || []).length === 0 && (
              <div className="text-center text-gray-500 py-8 text-sm italic">No loot defined. Click + Add Item to build the loot table.</div>
            )}

            {/* Table header */}
            {(form.loot || []).length > 0 && (
              <div className="grid grid-cols-[1fr_80px_70px_auto] gap-2 px-1 text-xs text-gray-500 font-semibold uppercase tracking-wide">
                <span>Item</span>
                <span className="text-center">Qty</span>
                <span className="text-center">Chance</span>
                <span />
              </div>
            )}

            {(form.loot || []).map((item) => (
              <div key={item.id} className="space-y-1">
                <div className="grid grid-cols-[1fr_80px_70px_auto] gap-2 items-center">
                  <input
                    className="bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-dnd-gold"
                    placeholder="Item name"
                    value={item.name}
                    onChange={(e) => updateLootItem(item.id, 'name', e.target.value)}
                  />
                  <input
                    className="bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-sm text-white text-center focus:outline-none focus:border-dnd-gold"
                    placeholder="1d6"
                    title="Quantity (can be a dice expression)"
                    value={item.qty}
                    onChange={(e) => updateLootItem(item.id, 'qty', e.target.value)}
                  />
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-sm text-white text-center focus:outline-none focus:border-dnd-gold"
                      title="Drop chance %"
                      value={item.chance}
                      onChange={(e) => updateLootItem(item.id, 'chance', Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 pointer-events-none">%</span>
                  </div>
                  <button type="button" onClick={() => removeLootItem(item.id)} className="text-red-400 hover:text-red-300 px-1"><XIcon /></button>
                </div>
                <input
                  className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-gray-300 focus:outline-none focus:border-dnd-gold"
                  placeholder="Notes (optional)"
                  value={item.desc || ''}
                  onChange={(e) => updateLootItem(item.id, 'desc', e.target.value)}
                />
              </div>
            ))}
          </div>
        )}

        {/* ── Inventory tab ── */}
        {activeTab === 'inventory' && (
          <div className="p-4 space-y-4">

            {/* Currency */}
            <div>
              <h4 className="text-sm font-semibold text-dnd-gold mb-3">Currency</h4>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { key: 'currency_gp', label: 'Gold (GP)', color: 'text-yellow-400' },
                  { key: 'currency_sp', label: 'Silver (SP)', color: 'text-gray-300' },
                  { key: 'currency_cp', label: 'Copper (CP)', color: 'text-orange-400' },
                ].map(({ key, label, color }) => (
                  <div key={key} className="bg-gray-800 rounded-lg p-2 text-center">
                    <label className={`text-xs font-bold ${color} block mb-1`}>{label}</label>
                    <input
                      type="number"
                      min={0}
                      className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-white text-center focus:outline-none focus:border-dnd-gold"
                      value={form[key]}
                      onChange={(e) => setField(key, Math.max(0, parseInt(e.target.value) || 0))}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="text-xs text-gray-500 self-center">Convert:</span>
                {[['gp','sp'],['gp','cp'],['sp','cp'],['sp','gp'],['cp','sp'],['cp','gp']].map(([from,to]) => (
                  <button key={`${from}-${to}`} type="button"
                    onClick={() => convertCurrency(from, to)}
                    className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded text-gray-300 transition-colors">
                    {from.toUpperCase()}→{to.toUpperCase()}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">1 GP = 10 SP = 100 CP</p>
            </div>

            {/* Items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-dnd-gold">Items</h4>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setShowItemLibrary(true)}
                    className="text-xs bg-emerald-900/40 hover:bg-emerald-800/60 border border-emerald-700 text-emerald-200 px-2 py-1 rounded">
                    + From library
                  </button>
                  <button type="button" onClick={addInventoryItem}
                    className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded text-gray-200">
                    + Add Item
                  </button>
                </div>
              </div>
              {/* Attunement is capped at 3, and which items are attuned is
                  otherwise buried in the per-item rows. */}
              {(() => {
                const attunable = (form.inventory || []).filter(it => it?.attunement_required);
                if (attunable.length === 0) return null;
                const attuned = attunable.filter(it => it.attuned);
                return (
                  <div className={`mb-2 rounded-lg border p-2 ${attuned.length >= 3 ? 'border-amber-700/60 bg-amber-900/10' : 'border-purple-800/50 bg-purple-900/10'}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-purple-300">Attunement</span>
                      <span className={`text-xs font-mono ${attuned.length >= 3 ? 'text-amber-300' : 'text-gray-400'}`}>
                        {attuned.length}/3 slots used
                      </span>
                    </div>
                    <div className="text-[11px] text-gray-400 mt-1">
                      {attuned.length === 0
                        ? 'Nothing attuned.'
                        : attuned.map(it => it.name || 'Unnamed item').join(' · ')}
                    </div>
                    {attuned.length >= 3 && (
                      <div className="text-[11px] text-amber-400/90 mt-1">
                        At the limit — un-attune something before attuning another item.
                      </div>
                    )}
                  </div>
                );
              })()}
              {(form.inventory || []).length === 0 && (
                <p className="text-xs text-gray-500 italic py-1">No items — click + Add Item</p>
              )}
              <div className="space-y-2">
                {(form.inventory || []).map((item, i) => (
                  <ItemStatsEditor
                    key={i}
                    item={item}
                    creature={form}
                    onChange={(field, value) => updateInventoryItem(i, field, value)}
                    onRemove={() => removeInventoryItem(i)}
                    onDamageAdd={() => addDamageEntry(i)}
                    onDamageRemove={(entryIdx) => removeDamageEntry(i, entryIdx)}
                    onDamageChange={(entryIdx, field, value) => updateDamageEntry(i, entryIdx, field, value)}
                    onMaterialiseMode={(mode) => materialiseDamageMode(i, mode)}
                    canHide={asGm}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Weapons tab ── */}
        {activeTab === 'weapons' && (() => {
          const weapons = (form.inventory || []).filter(it => it.item_type === 'weapon');
          const combatSpells = (form.spells || []).filter(s => s.type === 'combat');
          const STAT_KEYS = { STR: 'strength', DEX: 'dexterity', CON: 'constitution', INT: 'intelligence', WIS: 'wisdom', CHA: 'charisma' };
          function atkBonus(item) {
            const mod = bestWeaponStat(item, form).mod;
            const pb = form.proficiency_bonus || 2;
            const misc = item.attack_bonus_misc || 0;
            const total = mod + pb + misc;
            return (total >= 0 ? '+' : '') + total;
          }
          return (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-dnd-gold mb-2 flex items-center"><SwordIcon />Weapons</h4>
                {weapons.length === 0 ? (
                  <p className="text-xs text-gray-500 italic py-2">No weapons — add items with type "Weapon" in the Inventory tab.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-gray-300">
                      <thead>
                        <tr className="text-gray-500 border-b border-gray-700">
                          <th className="text-left pb-1.5 pr-2">Name</th>
                          <th className="text-center pb-1.5 pr-2">Atk</th>
                          <th className="text-left pb-1.5 pr-2">Damage</th>
                          <th className="text-left pb-1.5 pr-2">Range</th>
                          <th className="text-left pb-1.5">Properties</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800">
                        {weapons.map((w, idx) => {
                          // One row per attack mode: a thrown Spear and a
                          // two-handed Spear have different dice AND different
                          // ranges, so a single row can't state either clearly.
                          const modes = weaponDamageModes({ ...w, damage_entries: getDamageEntries(w) });
                          if (!modes.length) {
                            return (
                              <tr key={idx} className={w.equipped ? 'text-white' : 'text-gray-400'}>
                                <td className="py-1.5 pr-2 font-medium">{w.name || '—'}{w.equipped && <span className="text-dnd-gold ml-1 text-xs">★</span>}</td>
                                <td className="py-1.5 pr-2 text-center font-mono text-green-400">{atkBonus(w)}</td>
                                <td className="py-1.5 pr-2 font-mono">—</td>
                                <td className="py-1.5 pr-2">{w.weapon_range || '—'}</td>
                                <td className="py-1.5 text-gray-500">{w.properties || '—'}</td>
                              </tr>
                            );
                          }
                          return modes.map((m, mi) => {
                            // weaponDamageMod, not bestWeaponStat: the mode's
                            // ability modifier AND the weapon's flat bonus.
                            const pick = weaponDamageMod(w, form, m.stat);
                            const dm = pick.total;
                            return (
                            <tr key={`${idx}-${m.key}`} className={w.equipped ? 'text-white' : 'text-gray-400'}>
                              <td className={`py-1.5 pr-2 font-medium ${mi > 0 ? 'pl-3' : ''}`}>
                                {mi === 0
                                  ? <>{w.name || '—'}{w.equipped && <span className="text-dnd-gold ml-1 text-xs">★</span>}</>
                                  : <span className="text-gray-500 font-normal">↳ {m.label}</span>}
                              </td>
                              <td className="py-1.5 pr-2 text-center font-mono text-green-400">{mi === 0 ? atkBonus(w) : ''}</td>
                              <td className="py-1.5 pr-2 font-mono">
                                {mi === 0 && modes.length > 1 && <span className="text-gray-500 font-sans mr-1">{m.label}:</span>}
                                {formatDamageWithMod(m.damage, dm)}{m.damage_type ? ` ${formatDamageType(m.damage_type)}` : ''}
                                {(() => {
                                  const bd = damageParts(m.damage, pick.mod, pick.abbr, pick.misc);
                                  return bd.parts.length > 0
                                    ? <span className="text-gray-500 font-sans ml-1">({bd.dice} + {bd.parts.join(' + ')})</span>
                                    : null;
                                })()}
                              </td>
                              <td className="py-1.5 pr-2">{m.range || '—'}</td>
                              <td className="py-1.5 text-gray-500">{mi === 0 ? (w.properties || '—') : ''}</td>
                            </tr>
                            );
                          });
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              {combatSpells.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-red-400 mb-2 flex items-center"><OrbIcon />Offensive Spells</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-gray-300">
                      <thead>
                        <tr className="text-gray-500 border-b border-gray-700">
                          <th className="text-left pb-1.5 pr-2">Name</th>
                          <th className="text-left pb-1.5 pr-2">Damage</th>
                          <th className="text-left pb-1.5 pr-2">Range</th>
                          <th className="text-left pb-1.5">Level</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800">
                        {combatSpells.map((s) => {
                          const dmgEntries = getSpellDmgEntries(s).filter(e => e.damage);
                          const dmg = dmgEntries.length
                            ? dmgEntries.map(e => `${e.damage}${e.damage_type ? ` ${e.damage_type}` : ''}`).join(' + ')
                            : '—';
                          return (
                            <tr key={s.id}>
                              <td className="py-1.5 pr-2 font-medium text-white">{s.name || '—'}</td>
                              <td className="py-1.5 pr-2 font-mono">{dmg}</td>
                              <td className="py-1.5 pr-2">{s.spell_range || '—'}</td>
                              <td className="py-1.5 text-gray-500">{s.level === 0 ? 'Cantrip' : `Lvl ${s.level}`}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* ── Companions tab ──
            Familiars, summons and mounts that belong to this character. Kept in
            their own table and written as you go, so nothing here depends on the
            form being saved — see BoundCompanions. */}
        {activeTab === 'companions' && (
          <BoundCompanions creatureId={creature?.id ?? null} ownerName={form.name} />
        )}

        {/* ── Backstory tab ── */}
        {activeTab === 'backstory' && (
          <div className="p-4 space-y-3">
            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1">Character Backstory</label>
              <textarea
                value={form.backstory || ''}
                onChange={(e) => setForm((f) => ({ ...f, backstory: e.target.value }))}
                placeholder="Write your character's backstory here — their history, motivations, secrets, and how they came to be an adventurer…"
                className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-sm text-gray-100 resize-none focus:outline-none focus:border-dnd-gold"
                style={{ minHeight: 320 }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex gap-2 p-4 border-t border-gray-700 shrink-0">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg text-sm font-semibold transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex-2 flex-grow-[2] bg-dnd-gold hover:bg-yellow-500 text-gray-900 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving...' : submitLabel || (creature?.id ? 'Update Creature' : 'Create Creature')}
        </button>
      </div>

      {/* Background picker modal — basic-tab "Set Background" opens
          this. Lets the user pick one of the four SRD-2024 backgrounds,
          choose an ASI split (+2/+1 or +1/+1/+1) across the listed
          abilities, and an equipment package (A or B = 50 GP).
          Skills + feat + tool prof + items are all written into the
          form on Apply, tagged so a future swap reverts them cleanly. */}
      {showFeatPicker && (
        <FeatPickerModal
          level={Math.max(1, Number(form.char_level) || 1)}
          existing={form.feats}
          onAdd={(feat) => setForm((f) => ({ ...f, feats: [...(f.feats || []), feat] }))}
          onClose={() => setShowFeatPicker(false)}
        />
      )}

      {showBackgroundModal && (() => {
        const bg = findBackgroundMerged(bgPickedId);
        const STAT_LABELS = {
          strength: 'STR', dexterity: 'DEX', constitution: 'CON',
          intelligence: 'INT', wisdom: 'WIS', charisma: 'CHA',
        };
        // A background offering "one kind of" a tool can't be applied until the
        // kind is chosen — otherwise the sheet keeps the generic placeholder.
        const bgNeedsTool = !!bg && !!toolChoicesFor(bg.tool);
        // A 2014 background lists no abilities of its own, so the player picks
        // from all six; a 2024 one is held to its three.
        const bgFreeAsi = !!bg && bg.abilityChoice === 'free';
        const asiPool = bg ? (bgFreeAsi ? ALL_ABILITY_FIELDS : (bg.abilities || [])) : [];
        const canApply = !!bg && (
          bgAsiKind === '1-1-1'
            // Listed: the three are the background's own, so nothing to check.
            // Free: the player must have named three distinct scores.
            ? (!bgFreeAsi || (bgAsiPlus2 && bgAsiPlus1 && bgAsiPlus1b
                && new Set([bgAsiPlus2, bgAsiPlus1, bgAsiPlus1b]).size === 3))
            : (bgAsiPlus2 && bgAsiPlus1 && bgAsiPlus2 !== bgAsiPlus1
                && asiPool.includes(bgAsiPlus2)
                && asiPool.includes(bgAsiPlus1))
        ) && (!bgNeedsTool || !!bgToolChoice);
        return (
          <div className="fixed inset-0 bg-black/70 z-[90] flex items-center justify-center p-4"
            onClick={() => setShowBackgroundModal(false)}>
            <div onClick={(e) => e.stopPropagation()}
              className="bg-gray-900 border border-amber-700 rounded-lg w-full max-w-2xl max-h-[88vh] flex flex-col">
              <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700">
                <h3 className="text-amber-300 font-semibold">Choose Background</h3>
                <button type="button" onClick={() => setShowBackgroundModal(false)}
                  className="text-gray-400 hover:text-gray-200 text-xl leading-none">×</button>
              </div>
              <div className="overflow-y-auto flex-1 p-4 space-y-4">
                {/* Search and filters.
                    With over a hundred and fifty backgrounds a flat grid is
                    unusable, and the two things a player narrows by are the
                    edition they are playing and the scores they want to
                    raise. */}
                <div className="flex flex-wrap items-center gap-2 sticky top-0 bg-gray-900 pb-2 -mt-1 pt-1 z-10">
                  <input
                    value={bgSearch}
                    onChange={(e) => setBgSearch(e.target.value)}
                    placeholder="Search backgrounds…"
                    className="flex-1 min-w-[10rem] bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-gray-100"
                  />
                  <select
                    value={bgEditionFilter}
                    onChange={(e) => setBgEditionFilter(e.target.value)}
                    className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-gray-100"
                  >
                    <option value="all">All editions</option>
                    <option value="srd2024">2024 only</option>
                    <option value="srd2014">2014 only</option>
                  </select>
                  <select
                    value={bgStatFilter}
                    onChange={(e) => setBgStatFilter(e.target.value)}
                    title="Backgrounds that can raise this score"
                    className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-gray-100"
                  >
                    <option value="">Any stat</option>
                    {ALL_ABILITY_FIELDS.map((a) => (
                      <option key={a} value={a}>{STAT_LABELS[a]}</option>
                    ))}
                  </select>
                  <span className="text-[11px] text-gray-500 shrink-0">
                    {backgroundsFiltered.length} of {allBackgroundsMerged.length}
                  </span>
                </div>

                {/* Card row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {backgroundsFiltered.length === 0 && (
                    <div className="col-span-full text-xs text-gray-500 italic py-3 text-center">
                      Nothing matches those filters.
                    </div>
                  )}
                  {backgroundsFiltered.map((b) => (
                    <button key={b.id} type="button"
                      onClick={() => {
                        setBgPickedId(b.id);
                        // Reset ASI defaults whenever the card changes. A free
                        // (2014) background has no listed scores to default
                        // to, so the selects start empty and the player picks.
                        // Deliberately blank: a pre-filled +2/+1 got applied
                        // untouched, which is what made the split look
                        // automatic. Apply is disabled until both are named.
                        setBgAsiKind('2-1');
                        setBgAsiPlus2('');
                        setBgAsiPlus1('');
                        setBgAsiPlus1b('');
                        // Default to the first option this background offers,
                        // whatever it is called. Assuming 'a' applied nothing
                        // on a background whose only option was the gold one.
                        setBgEquipment(bgEquipmentModel(b).options[0]?.id || '');
                      }}
                      className={`text-left p-2 rounded border ${
                        bgPickedId === b.id
                          ? 'bg-amber-900/40 border-amber-500'
                          : 'bg-gray-800 border-gray-700 hover:border-gray-500'
                      }`}>
                      <div className="text-sm font-semibold text-amber-200">{b.name}</div>
                      <div className="text-[11px] text-gray-400">
                        {b.abilities.map((a) => STAT_LABELS[a]).join(' / ')}
                      </div>
                    </button>
                  ))}
                </div>

                {bg && (
                  <div className="space-y-3">
                    {/* ASI selector */}
                    <div className="bg-gray-800/40 border border-gray-700 rounded p-2 space-y-2">
                      <div className="text-xs uppercase tracking-wider text-amber-300">
                        Ability Score Increase — choose where the points go
                      </div>
                      {bgFreeAsi && (
                        // Why this background asks the question at all.
                        <div className="text-[11px] text-amber-300/90 bg-amber-900/20 border border-amber-800/60 rounded px-2 py-1 leading-snug">
                          This is a 2014 background, which grants no ability
                          scores of its own — under those rules the bonuses came
                          from your race. Choose where they go, from any score.
                        </div>
                      )}
                      <div className="flex flex-wrap gap-3 text-sm text-gray-200">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="radio"
                            checked={bgAsiKind === '2-1'}
                            onChange={() => setBgAsiKind('2-1')}
                            className="accent-amber-500" />
                          +2 in one, +1 in another
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="radio"
                            checked={bgAsiKind === '1-1-1'}
                            onChange={() => setBgAsiKind('1-1-1')}
                            className="accent-amber-500" />
                          +1 in all three
                        </label>
                      </div>
                      {bgAsiKind === '2-1' ? (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-gray-400">+2 to</span>
                          <select value={bgAsiPlus2}
                            onChange={(e) => setBgAsiPlus2(e.target.value)}
                            className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white">
                            <option value="">—</option>
                            {asiPool.map((a) => (
                              <option key={a} value={a}>{STAT_LABELS[a]}</option>
                            ))}
                          </select>
                          <span className="text-gray-400 ml-2">+1 to</span>
                          <select value={bgAsiPlus1}
                            onChange={(e) => setBgAsiPlus1(e.target.value)}
                            className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white">
                            <option value="">—</option>
                            {asiPool.filter((a) => a !== bgAsiPlus2).map((a) => (
                              <option key={a} value={a}>{STAT_LABELS[a]}</option>
                            ))}
                          </select>
                        </div>
                      ) : bgFreeAsi ? (
                        // Free spread: three distinct scores, all chosen here.
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          <span className="text-gray-400">+1 each to</span>
                          {[[bgAsiPlus2, setBgAsiPlus2], [bgAsiPlus1, setBgAsiPlus1],
                            [bgAsiPlus1b, setBgAsiPlus1b]].map(([val, set], i) => (
                            <select key={i} value={val}
                              onChange={(e) => set(e.target.value)}
                              className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white">
                              <option value="">—</option>
                              {asiPool.filter((a) => (
                                a === val
                                || ![bgAsiPlus2, bgAsiPlus1, bgAsiPlus1b].includes(a)
                              )).map((a) => (
                                <option key={a} value={a}>{STAT_LABELS[a]}</option>
                              ))}
                            </select>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-gray-400">
                          +1 each to {(bg.abilities || []).map((a) => STAT_LABELS[a]).join(', ')}.
                        </div>
                      )}
                    </div>

                    <p className="text-xs text-gray-300 leading-relaxed">{bg.description}</p>

                    {bg.feat?.name && (
                      <div className="bg-gray-800/40 border border-gray-700 rounded p-2">
                        <div className="text-xs uppercase tracking-wider text-gray-400 mb-1">Origin Feat</div>
                        <div className="text-sm text-amber-200 font-semibold">{bg.feat.name}</div>
                        <div className="text-xs text-gray-300 mt-1 whitespace-pre-wrap">{bg.feat.desc}</div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-gray-800/40 border border-gray-700 rounded p-2">
                        <div className="text-xs uppercase tracking-wider text-gray-400 mb-1">Skill Proficiencies</div>
                        <ul className="text-sm text-gray-200 space-y-0.5">
                          {bg.skills.map((raw) => {
                            const k = typeof raw === 'string' ? raw : raw.skill;
                            const lvl = typeof raw === 'string' ? 'proficient' : (raw.level || 'proficient');
                            return (
                              <li key={k}>• {SKILL_LABELS[k] || k}{lvl === 'expertise' && <span className="text-amber-300"> (expertise)</span>}</li>
                            );
                          })}
                        </ul>
                      </div>
                      <div className="bg-gray-800/40 border border-gray-700 rounded p-2">
                        <div className="text-xs uppercase tracking-wider text-gray-400 mb-1">Tool Proficiency</div>
                        <div className="text-sm text-gray-200">{bg.tool || '—'}</div>
                      </div>
                    </div>


                    {/* Tool-kind picker — only when the background says
                        "choose one kind". The choice lands on both the
                        proficiency line and the equipment entry. */}
                    {(() => {
                      const choices = toolChoicesFor(bg.tool);
                      if (!choices) return null;
                      return (
                        <div className="bg-gray-800/40 border border-gray-700 rounded p-2 space-y-1">
                          <div className="text-xs uppercase tracking-wider text-gray-400">
                            {choices.base} — choose one
                          </div>
                          <select
                            value={bgToolChoice}
                            onChange={(e) => setBgToolChoice(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-100"
                          >
                            <option value="">— Pick a kind —</option>
                            {choices.options.map((opt) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        </div>
                      );
                    })()}

                    {/* Equipment.
                        The base kit is what everyone taking this background
                        gets; the options below it are the choice the book
                        offers. Rendered from the shared model so the curated
                        A/B entries and the imported base-plus-choice ones both
                        work here. */}
                    {(() => {
                      const eq = bgEquipmentModel(bg);
                      const coinStr = (o) => ['gp', 'sp', 'cp']
                        .filter((k) => Number(o[k]) > 0)
                        .map((k) => `${o[k]} ${k.toUpperCase()}`).join(', ');
                      const baseItems = eq.base.items || [];
                      const baseCoin = coinStr(eq.base);
                      const hasBase = baseItems.length > 0 || !!baseCoin;
                      if (!hasBase && eq.options.length === 0) {
                        return (
                          <div className="bg-gray-800/40 border border-gray-700 rounded p-2 text-xs text-gray-500 italic">
                            No starting equipment recorded for this background.
                          </div>
                        );
                      }
                      return (
                        <div className="bg-gray-800/40 border border-gray-700 rounded p-2 space-y-2">
                          <div className="text-xs uppercase tracking-wider text-gray-400">Starting Equipment</div>
                          {hasBase && (
                            <div className="text-sm text-gray-200">
                              {baseItems.map((it) =>
                                `${it.name}${it.qty > 1 ? ` ×${it.qty}` : ''}`
                              ).join(', ')}
                              {baseCoin && (baseItems.length ? `, ${baseCoin}` : baseCoin)}
                            </div>
                          )}
                          {eq.options.length > 0 && (
                            <>
                              <div className="text-[11px] text-gray-400 pt-0.5">
                                {hasBase ? 'And choose one:' : 'Choose one:'}
                              </div>
                              <div className="space-y-1">
                                {eq.options.map((o) => (
                                  <label key={o.id}
                                    className={`flex items-start gap-2 cursor-pointer text-sm p-1.5 rounded border ${
                                      bgEquipment === o.id
                                        ? 'bg-amber-900/30 border-amber-600 text-gray-100'
                                        : 'bg-gray-900/40 border-gray-700 text-gray-300 hover:border-gray-500'
                                    }`}>
                                    <input type="radio" checked={bgEquipment === o.id}
                                      onChange={() => setBgEquipment(o.id)}
                                      className="accent-amber-500 mt-0.5" />
                                    <span>{o.label}</span>
                                  </label>
                                ))}
                              </div>
                            </>
                          )}
                          {bg.equipment_note && (
                            <div className="text-[11px] text-gray-500 leading-snug">
                              {bg.equipment_note}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 px-4 py-2 border-t border-gray-700">
                <button type="button" onClick={() => setShowBackgroundModal(false)}
                  className="text-xs text-gray-400 hover:text-gray-200 px-3 py-1.5">
                  Cancel
                </button>
                <button type="button"
                  disabled={!canApply}
                  onClick={() => {
                    applyBackground(
                      bg,
                      { kind: bgAsiKind, plus2: bgAsiPlus2, plus1: bgAsiPlus1, plus1b: bgAsiPlus1b },
                      bgEquipment,
                      bgToolChoice,
                    );
                    setShowBackgroundModal(false);
                  }}
                  className="text-xs bg-amber-700 hover:bg-amber-600 disabled:bg-gray-700 disabled:text-gray-500 text-amber-50 px-3 py-1.5 rounded">
                  Apply Background
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Item-library picker modal — opened from "+ From library" in
          inventory. Click a row to push it onto the inventory list. */}
      {bardicGrant && (
        <div className="fixed inset-0 bg-black/70 z-[90] flex items-center justify-center p-4"
          onClick={() => setBardicGrant(null)}>
          <div onClick={(e) => e.stopPropagation()}
            className="bg-gray-900 border border-purple-700 rounded-lg w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700">
              <h3 className="text-purple-300 font-semibold">
                Grant {bardicGrant.def.label}
              </h3>
              <button type="button" onClick={() => setBardicGrant(null)}
                className="text-gray-400 hover:text-gray-200 text-xl leading-none">×</button>
            </div>
            <div className="overflow-y-auto flex-1 p-3 space-y-1">
              {bardicLoading && <div className="text-xs text-gray-400 italic">Loading characters…</div>}
              {bardicError && <div className="text-xs text-red-300">Failed: {bardicError}</div>}
              {!bardicLoading && bardicTargets.length === 0 && !bardicError && (
                <div className="text-xs text-gray-500 italic">
                  No other player characters found in this server.
                </div>
              )}
              {bardicTargets.map((tc) => {
                const alreadyHolds = !!tc.inspiration_die;
                return (
                  <button
                    key={tc.id}
                    type="button"
                    disabled={alreadyHolds}
                    onClick={async () => {
                      const die = bardicGrant.def.die || 'd6';
                      try {
                        // 1. Push the die onto the target.
                        const r = await fetch(`/api/creatures/${tc.id}`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ inspiration_die: die }),
                        });
                        if (!r.ok) throw new Error(`HTTP ${r.status}`);
                        // 2. Bump our own used count locally; the form
                        //    will persist on save like any other edit.
                        const id = bardicGrant.def.id;
                        const cur = Number(form.resource_state?.[id]?.used) || 0;
                        setField('resource_state', {
                          ...(form.resource_state || {}),
                          [id]: { used: Math.min(bardicGrant.total, cur + 1) },
                        });
                        // 3. Tell the table what just happened. Use
                        //    the def's label so custom-class grants
                        //    ("Storm Surge", "Battle Mark", …) read
                        //    correctly in the dice log instead of
                        //    being mislabelled as Bardic Inspiration.
                        const labelName = bardicGrant.def.label || 'Bardic Inspiration';
                        socket.emit('roll_dice', {
                          dice: 'd1', count: 1, modifier: 0,
                          label: `${form.name || 'Caster'} grants ${die} ${labelName} to ${tc.name || 'someone'}`,
                        });
                        setBardicGrant(null);
                      } catch (err) {
                        setBardicError(String(err.message || err));
                      }
                    }}
                    className="w-full text-left px-3 py-2 rounded border border-gray-700 hover:border-purple-500 disabled:opacity-40 disabled:cursor-not-allowed bg-gray-800/40">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-100">{tc.name || '(unnamed)'}</span>
                      {alreadyHolds && (
                        <span className="text-[10px] text-purple-300">
                          already holds {tc.inspiration_die}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-gray-500">
                      {tc.char_class || 'No class'}
                      {tc.char_level ? ` · Lv ${tc.char_level}` : ''}
                      {tc.player_owner ? ` · ${tc.player_owner}` : ''}
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="px-3 py-2 border-t border-gray-700 flex justify-end gap-2">
              <button onClick={() => setBardicGrant(null)}
                className="text-xs text-gray-400 hover:text-gray-200 px-3 py-1.5">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showItemLibrary && (
        <div className="fixed inset-0 bg-black/70 z-[90] flex items-center justify-center p-4"
          onClick={() => setShowItemLibrary(false)}>
          <div onClick={e => e.stopPropagation()}
            className="bg-gray-900 border border-gray-700 rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700">
              <h3 className="text-dnd-gold font-semibold">Item Library</h3>
              <button type="button" onClick={() => setShowItemLibrary(false)}
                className="text-gray-400 hover:text-gray-200 text-xl leading-none">×</button>
            </div>
            <div className="px-4 py-2 flex gap-2 border-b border-gray-700">
              <input
                placeholder="Search by name…"
                className="flex-1 min-w-[140px] bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white"
                value={itemLibrarySearch}
                onChange={e => setItemLibrarySearch(e.target.value)}
              />
              <select
                className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white"
                value={itemLibraryType}
                onChange={e => setItemLibraryType(e.target.value)}
              >
                <option value="">All</option>
                <option value="armor">Armor</option>
                <option value="weapon">Weapon</option>
                <option value="magic_item">Magic item</option>
                <option value="gear">Gear</option>
              </select>
              <select
                className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white"
                title="Rules edition"
                value={itemLibraryEdition}
                onChange={e => setItemLibraryEdition(e.target.value)}
              >
                <option value="2024">2024 only</option>
                <option value="2014">2014 only</option>
                <option value="">Both editions</option>
              </select>
            </div>
            <div className="overflow-y-auto flex-1 p-2">
              {!itemLibraryLoaded && (
                <div className="text-gray-500 italic p-2 text-sm">Loading…</div>
              )}
              {itemLibraryLoaded && (() => {
                const q = itemLibrarySearch.trim().toLowerCase();
                const list = itemLibraryRows.filter(r =>
                  (!q || r.name.toLowerCase().includes(q)) &&
                  (!itemLibraryType || r.item_type === itemLibraryType) &&
                  (!itemLibraryEdition || String(r.edition) === itemLibraryEdition)
                );
                if (list.length === 0) {
                  return (
                    <div className="text-gray-500 italic p-2 text-sm">
                      No matches{itemLibraryEdition ? ` in ${itemLibraryEdition}` : ''}.
                      {itemLibraryEdition && (
                        <button
                          type="button"
                          onClick={() => setItemLibraryEdition('')}
                          className="ml-2 not-italic text-dnd-gold hover:underline"
                        >Search both editions</button>
                      )}
                    </div>
                  );
                }
                return (
                  <ul className="space-y-1">
                    {list.map(row => (
                      <li key={row.id}>
                        <button type="button"
                          onClick={() => pickItemFromLibrary(row)}
                          className="w-full text-left px-3 py-2 rounded hover:bg-gray-800 border border-gray-800">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-100">{row.name}</span>
                            <span className="text-[10px] uppercase text-gray-500">
                              {row.item_type}{row.rarity ? ` · ${row.rarity}` : ''} · {row.edition}
                            </span>
                          </div>
                          {row.item_type === 'armor' && (
                            <div className="text-[11px] text-gray-400">
                              AC {row.ac_base} {row.armor_category && `· ${row.armor_category}`}
                            </div>
                          )}
                          {row.item_type === 'weapon' && Array.isArray(row.damage_entries) && row.damage_entries[0] && (
                            <div className="text-[11px] text-gray-400">
                              {row.damage_entries[0].damage} {row.damage_entries[0].damage_type}
                            </div>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      <TokenEditorModal
        open={tokenEditorOpen}
        onClose={() => setTokenEditorOpen(false)}
        onPick={handleTokenEditorPick}
      />

      {framerSrc && (
        <ImageFramer
          src={framerSrc}
          shape={(framerMode === 'standee' || framerMode === 'standee-new') ? 'standee' : 'token'}
          title={
            framerMode === 'standee-new'
              ? `Frame the standing art${standeeQueueRef.current.length ? ` (${standeeQueueRef.current.length} more)` : ''}`
              : framerMode === 'standee' ? 'Frame the standing art'
              : framerMode === 'alt-new'
              ? `Frame token art${altQueueRef.current.length ? ` (${altQueueRef.current.length} more)` : ''}`
              : (framerMode && framerMode.replaceId) ? 'Adjust token art'
              : (imageFile || imagePreview) ? 'Adjust framing' : 'Frame artwork'
          }
          onCancel={handleFramerCancel}
          onConfirm={handleFramed}
        />
      )}
    </form>
  );
}
