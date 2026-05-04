import React, { useState, useEffect, useMemo } from 'react';
import LanguagePicker from './LanguagePicker.jsx';
import { useAllClasses, useAllSubclasses, useClassChoices, computeHitDicePool, formatHitDicePool, hitDieFor } from '../utils/classes.js';
import { getClassBuild, formatPrimaryAbility } from '../data/class_build.js';
import { formatDamageWithMod, formatDamageType } from '../utils/damage.js';
import {
  RACE_EDITIONS,
  raceTypesForEdition,
  racesForType,
  findRace,
  combinedRaceTraits,
} from '../data/races.js';
import { BACKGROUNDS_2024, findBackground, SKILL_LABELS } from '../data/backgrounds.js';
import { resourcesForCreature } from '../data/resources.js';
import socket from '../socket.js';
import ClassChoicesPicker from './ClassChoicesPicker.jsx';
import MulticlassRow from './MulticlassRow.jsx';

const XIcon = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" className="w-3.5 h-3.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>);
const DragonIcon = () => (<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10 text-gray-500"><path d="M44 12c4-2 8 0 10 4s0 10-4 12l-4 2" /><path d="M20 12c-4-2-8 0-10 4s0 10 4 12l4 2" /><ellipse cx="32" cy="32" rx="14" ry="10" fill="currentColor" stroke="none" opacity="0.15" /><path d="M18 28c0 10 6 18 14 18s14-8 14-18" /><path d="M26 24c0-2 2-4 6-4s6 2 6 4" /><circle cx="27" cy="26" r="1.5" fill="currentColor" stroke="none" /><circle cx="37" cy="26" r="1.5" fill="currentColor" stroke="none" /><path d="M28 36c1 2 3 3 4 3s3-1 4-3" /></svg>);
const SwordIcon = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 inline mr-1"><path d="M14.5 17.5L3 6V3h3l11.5 11.5" /><path d="M13 19l6-6" /><path d="M2 2l5.5 5.5" /><path d="M17 17l4 4" /></svg>);
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

// computeAcFromGear — reads the equipped armor / shield / magic-item
// AC bonuses out of the form's inventory and returns the rolled-up
// total + a printable breakdown. Returns null when there's nothing
// to compute (no equipped gear AND no shield), so the caller can
// hide the readout entirely on creatures with manual AC only.
//
// Rules (5e standard, 2024 SRD wording):
//   • Light armor:  base + DEX mod (no cap)
//   • Medium armor: base + min(DEX mod, 2)
//   • Heavy armor:  base (DEX ignored)
//   • Shield:       +2 (from creature.shield_equipped OR an equipped
//                   armor item with armor_category='shield')
//   • Magic items:  +N from each equipped item with ac_bonus set
//   • No body armor: 10 + DEX mod (the unarmored default)
function computeAcFromGear(form) {
  const inv = Array.isArray(form?.inventory) ? form.inventory : [];
  const equippedArmor = inv.filter(
    (it) => it && it.item_type === 'armor' && it.equipped
              && (it.armor_category || '') !== 'shield'
              && Number(it.ac_base) > 0
  );
  // Shield: either via an equipped shield-category armor item OR the
  // legacy shield_equipped boolean.
  const equippedShield = inv.some(
    (it) => it && it.item_type === 'armor' && it.equipped
              && (it.armor_category || '') === 'shield'
  ) || !!form?.shield_equipped;
  const acBonusItems = inv.filter(
    (it) => it && it.equipped && Number(it.ac_bonus) > 0
  );

  if (equippedArmor.length === 0 && !equippedShield && acBonusItems.length === 0) {
    return null;
  }

  const dex = mod(Number(form?.dexterity) || 10);
  const parts = [];
  let total = 0;

  if (equippedArmor.length > 0) {
    // If multiple armor items are flagged equipped (shouldn't happen
    // but the form allows it), use the highest-AC one.
    const armor = equippedArmor.reduce((best, it) =>
      Number(it.ac_base) > Number(best.ac_base) ? it : best
    );
    const cat = armor.armor_category || 'light';
    const base = Number(armor.ac_base) || 10;
    // ac_bonus on a body-armor row represents enchantment (+1 plate,
    // +2 plate). Folded into the armor's contribution so it doesn't
    // get double-counted in the magic-bonus loop below.
    const armorMagic = Number(armor.ac_bonus) || 0;
    let dexAdded = 0;
    if (cat === 'light') dexAdded = dex;
    else if (cat === 'medium') dexAdded = Math.min(dex, 2);
    // heavy: dexAdded stays 0
    total += base + dexAdded + armorMagic;
    parts.push(`${base} (${armor.name || 'armor'})`);
    if (armorMagic > 0) parts.push(`+${armorMagic} magic`);
    if (dexAdded !== 0) {
      parts.push(`${dexAdded >= 0 ? '+' : ''}${dexAdded} DEX`);
    }
  } else {
    total += 10 + dex;
    parts.push(`10 (unarmored)`);
    if (dex !== 0) parts.push(`${dex >= 0 ? '+' : ''}${dex} DEX`);
  }

  if (equippedShield) {
    total += 2;
    parts.push('+2 shield');
  }

  for (const it of acBonusItems) {
    // Body armor's ac_bonus is already counted above as the armor's
    // enchantment. Shield ac_bonus (e.g. a +1 shield) and any other
    // equipped item's ac_bonus (cloak / ring / amulet of protection)
    // get added here.
    if (it.item_type === 'armor' && (it.armor_category || '') !== 'shield') continue;
    const b = Number(it.ac_bonus) || 0;
    if (b === 0) continue;
    total += b;
    parts.push(`+${b} ${it.name || 'magic'}`);
  }

  return { total, parts };
}

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

const defaultForm = {
  name: '',
  size: 'medium',
  creature_type: 'Humanoid',
  subtype: '',
  alignment: 'Unaligned',
  armor_class: 10,
  armor_desc: '',
  shield_equipped: false,
  hit_points: 10,
  hit_dice: '2d8',
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
            isUtility
              ? 'border-red-900/60 text-red-300 hover:bg-red-900/30'
              : 'border-blue-900/60 text-blue-300 hover:bg-blue-900/30'
          }`}
          title={isUtility ? 'Move to Combat' : 'Move to Utility'}
        >
          → {isUtility ? 'Combat' : 'Utility'}
        </button>
        <label className="flex items-center gap-1 text-xs text-gray-300 cursor-pointer" title="Prepared">
          <input
            type="checkbox"
            checked={!!spell.prepared}
            onChange={(e) => updateSpell(spell.id, 'prepared', e.target.checked)}
            className="accent-dnd-gold"
          />
          Prep
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

function SpellLibraryPicker({ onLearn, charClass }) {
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

  async function load() {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (levelFilter !== '') params.set('level', levelFilter);
    if (classFilter) params.set('klass', classFilter);
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
  }, [open, search, levelFilter, classFilter]);

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
              {labels.map((l, i) => <option key={i} value={i}>{l}</option>)}
            </select>
            <select
              className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white"
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              title="Override to view spells from other classes"
            >
              <option value="">All classes</option>
              {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          {initialClass && classFilter === initialClass && (
            <p className="text-[10px] text-gray-500 italic">
              Defaulted to <span className="text-purple-300">{initialClass}</span> spells. Switch the filter to override.
            </p>
          )}
          {loaded && spells.length === 0 && (
            <p className="text-xs text-gray-500 italic">No spells match. Switch class filter to "All classes" or ask your GM to scan a PDF.</p>
          )}
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {spells.map(s => (
              <div key={s.id} className="flex items-center gap-2 bg-gray-700/40 rounded px-2 py-1">
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white truncate">{s.name}</div>
                  <div className="text-[10px] text-gray-400">
                    {labels[s.level] || `lvl ${s.level}`}{s.school ? ` · ${s.school}` : ''}
                    {Array.isArray(s.allowed_classes) && s.allowed_classes.length > 0 && (
                      <span className="text-purple-300"> · {s.allowed_classes.join(', ')}</span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onLearn(s)}
                  className="text-xs bg-dnd-gold hover:bg-yellow-500 text-gray-900 px-2 py-1 rounded font-semibold"
                >
                  Learn
                </button>
              </div>
            ))}
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

export default function CreatureForm({ creature, onSave, onCancel, extraFields, submitLabel, isPlayerCharacter = false }) {
  const allClasses = useAllClasses();
  // Subclass list re-derives whenever the selected class changes.
  // form.char_class is captured below — pull it indirectly via the form
  // state once it's defined.
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
    return {
      ...defaultForm, ...creatureWithoutImage, senses, inventory, spells, spell_slots, loot, movement_actions,
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('basic');
  // Subclass options track the selected class — derived after `form` exists
  // so the hook always has the latest char_class on every render.
  const allSubclasses = useAllSubclasses(form.char_class);
  // Class-level "build choices" — Cleric Divine Order, Fighter Weapon
  // Mastery, Rogue Expertise, etc. Merges static SRD-2024 with any
  // plugin-supplied choices for this class.
  const classChoices = useClassChoices(form.char_class);

  // Auto-grant choices (Ranger's Hunter's Mark) apply the moment the
  // class is set — no picker. Re-runs whenever the class changes;
  // applyClassChoices is idempotent so repeated runs are safe.
  useEffect(() => {
    if (!form.char_class) return;
    const autoChoices = (classChoices || []).filter((c) => c.kind === 'auto');
    if (autoChoices.length === 0) return;
    const prevState = form.class_state || {};
    const alreadyApplied = prevState.class_id === form.char_class
      && ((prevState.added?.spells || []).length > 0
          || (prevState.added?.saves  || []).length > 0
          || (prevState.added?.armor  || []).length > 0);
    if (alreadyApplied) return;
    // Pass the FULL choice list (with picks) so any pickable choices
    // already saved survive the re-apply.
    applyClassChoices(classChoices, prevState.choices || {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.char_class, classChoices.length]);

  const tabs = isPlayerCharacter
    ? ['basic', 'combat', 'abilities', 'skills', 'traits', 'spells', 'inventory', 'weapons']
    : ['basic', 'combat', 'abilities', 'skills', 'traits', 'spells', 'inventory', 'loot'];
  const tabLabel = {
    basic: 'Basic', combat: 'Combat', abilities: 'Ability Scores',
    skills: 'Skills & Saves', traits: 'Traits & Actions',
    spells: 'Spells', inventory: 'Inventory', loot: 'Loot', weapons: 'Weapons',
  };

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleImageChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
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
  const [raceEdition, setRaceEdition] = useState('srd2024');
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
  const [bgEquipment, setBgEquipment] = useState('a');         // 'a' | 'b'

  const [showItemLibrary, setShowItemLibrary] = useState(false);
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
  const [itemLibraryLoaded, setItemLibraryLoaded] = useState(false);
  useEffect(() => {
    if (!showItemLibrary || itemLibraryLoaded) return;
    fetch('/api/item-library')
      .then(r => (r.ok ? r.json() : []))
      .then(rows => { setItemLibraryRows(rows); setItemLibraryLoaded(true); })
      .catch(() => setItemLibraryLoaded(true));
  }, [showItemLibrary, itemLibraryLoaded]);

  // Convert a library row into an inventory item shape, then push.
  // Field names must match the inventory editor's expectations
  // exactly — the editor reads `desc` not `description`, `qty` not
  // `quantity`, and `damage_entries` (array) not the legacy
  // `damage_dice` / `damage_type` scalar pair. Earlier picker copied
  // into the wrong fields, so weapons came in with no damage,
  // properties or mastery showing.
  function pickItemFromLibrary(row) {
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

      _source: `library:${row.edition}:${row.name}`,
    };
    setForm(prev => ({ ...prev, inventory: [...(prev.inventory || []), next] }));
    setShowItemLibrary(false);
  }

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

  const allBackgroundsMerged = useMemo(() =>
    [...BACKGROUNDS_2024, ...customBackgroundsShaped]
  , [customBackgroundsShaped]);

  const findBackgroundMerged = (id) =>
    findBackground(id) || customBackgroundsShaped.find((b) => b.id === id) || null;

  const racePickerRaces = useMemo(() => {
    const stat = racesForType(form.creature_type, raceEdition);
    const custom = allRacesMerged.filter((r) =>
      (r.creature_type || 'Humanoid') === form.creature_type &&
      (raceEdition === 'custom' || r.edition === raceEdition || r.edition === 'custom')
    );
    return [...stat, ...custom];
  }, [form.creature_type, raceEdition, allRacesMerged]);

  const racePickerHasTypes = useMemo(() => {
    if (raceTypesForEdition(raceEdition).includes(form.creature_type)) return true;
    return allRacesMerged.some((r) => (r.creature_type || 'Humanoid') === form.creature_type);
  }, [raceEdition, form.creature_type, allRacesMerged]);

  const selectedRaceObj = raceId ? findRaceMerged(raceId) : null;
  const selectedSubraceObj = (selectedRaceObj && subraceId)
    ? (selectedRaceObj.subraces || []).find((s) => s.id === subraceId) || null
    : null;

  // Reset chained selections when the upstream dropdown changes.
  useEffect(() => { setRaceId(''); setSubraceId(''); }, [raceEdition, form.creature_type]);
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
      senses:         [...(race.setsSenses || []), ...(sub?.setsSenses || [])],
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
      next.spells = [
        ...stripSpells(f.spells, prevAdded.spells),
        ...fetchedSpells.map((s) => ({
          ...s,
          casting_ability: castingAbility || s.casting_ability || '',
          prepared: true,
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
            prepared: true,
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
    const calc = computeAcFromGear(form);
    if (!calc) return;
    if (Number(form.armor_class) === calc.total) return;
    setField('armor_class', calc.total);
  }, [
    form.dexterity,
    form.shield_equipped,
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
        if (exact) out.push(exact);
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

  function applyBackground(bg, asi /* { kind, plus2, plus1 } */, equipKey /* 'a' | 'b' */) {
    if (!bg) return;
    const sourceTag = `background:${bg.id}`;
    const profBonus = form.proficiency_bonus ?? 2;

    // Build the ability-bump map up front so prev/next are symmetric.
    const newBumps = {};
    if (asi.kind === '2-1' && asi.plus2 && asi.plus1 && asi.plus2 !== asi.plus1) {
      newBumps[asi.plus2] = 2;
      newBumps[asi.plus1] = 1;
    } else {
      // +1 / +1 / +1 across all three listed abilities.
      for (const a of bg.abilities) newBumps[a] = 1;
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

      // Apply new background.
      next.feats = [...next.feats, { ...bg.feat, __source: sourceTag }];

      // Tool prof — append to the CSV. Strip the previous-background
      // tool entry first so a swap doesn't leave the old one behind.
      const toolCsvParts = String(f.tool_proficiencies || '')
        .split(/\s*,\s*/)
        .map((p) => p.trim())
        .filter(Boolean);
      const cleanTools = prevAdded.tool
        ? toolCsvParts.filter((p) => p.toLowerCase() !== String(prevAdded.tool).toLowerCase())
        : toolCsvParts;
      if (bg.tool && !cleanTools.some((p) => p.toLowerCase() === bg.tool.toLowerCase())) {
        cleanTools.push(bg.tool);
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
      const gpAdded = equipKey === 'a' ? bg.equipment_a_gp : bg.equipment_b_gp;
      next.currency_gp = (next.currency_gp || 0) + gpAdded;
      if (equipKey === 'a') {
        for (const it of bg.equipment_a_items) {
          next.inventory = [
            ...next.inventory,
            {
              id: `inv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              item_type: 'item',
              name: it.name,
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
          tool: bg.tool,
          equipment: equipKey,
          currency_gp: gpAdded,
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
      const added = { skills: [], weapons: [], armor: [], spells: [], traits_count: 0, saves: [] };
      const expert = { ...(next.skill_expertise || {}) };

      // Helper: apply an `adds` block onto `next`, recording into `added`.
      // Used by both single-pick and auto-grant choices.
      function applyAdds(adds, tag) {
        if (!adds) return;
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
            next.spells = [
              ...(next.spells || []),
              { id: Date.now() + Math.random(), name: sp.name, level: sp.level ?? 0, prepared: true, __source: tag },
            ];
            added.spells.push(sp.name);
          }
        }
      }

      for (const choice of choiceList) {
        // Auto-grant choices apply unconditionally — no pick needed.
        if (choice.kind === 'auto') {
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

        if (choice.kind === 'multi-skills') {
          for (const sk of (pick.picks || [])) {
            if (!sk || !STAT_OF_SKILL[sk]) continue;
            const m = Math.floor(((next[STAT_OF_SKILL[sk]] ?? 10) - 10) / 2);
            // Expertise here — Rogue/Bard Expertise doubles PB.
            next[sk] = m + profBonus * 2;
            expert[sk] = true;
            added.skills.push(sk);
          }
        }
      }

      next.skill_expertise = expert;
      next.class_state = {
        class_id: f.char_class || '',
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
  function applyStartingEquipment(option /* 'A' | 'B' */) {
    setForm((f) => {
      const cls = f.char_class;
      const build = getClassBuild(cls);
      if (!build) return f;
      const sa = build.startingEquipment || {};
      const claim = option === 'A' ? sa.optionA : sa.optionB;
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
      if (Array.isArray(prevAdded.spells) && prevAdded.spells.length) {
        const drop = new Set(prevAdded.spells.map((s) => String(s).toLowerCase()));
        next.spells = (f.spells || []).filter((s) =>
          !drop.has(String(s.name || '').toLowerCase())
        );
      }

      const added = { skills: [], weapons: [], armor: [], spells: [], traits_count: 0, saves: [] };
      const expert = { ...(next.skill_expertise || {}) };

      function applyAdds(adds, tag) {
        if (!adds) return;
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
            next.spells = [
              ...(next.spells || []),
              { id: Date.now() + Math.random(), name: sp.name, level: sp.level ?? 0, prepared: true, __source: tag },
            ];
            added.spells.push(sp.name);
          }
        }
      }

      for (const choice of choiceList) {
        if (choice.kind === 'auto') {
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
          ? { ...m, class_state: { class_id: slot.class || '', choices: picks, added } }
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
    setForm((f) => ({ ...f, [key]: f[key].filter((_, idx) => idx !== i) }));
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
    setForm((f) => ({ ...f, inventory: [...(f.inventory || []), { item_type: 'item', name: '', qty: 1, weight: '', desc: '', equipped: false, sheds_light: false, bright_ft: 20, dim_ft: 40, weapon_range: '', attack_stat: 'STR', attack_bonus_misc: 0, damage_entries: [{ damage: '', damage_type: '' }], properties: '' }] }));
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
        ? { ...s, type: s.type === 'combat' ? 'utility' : 'combat' }
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
  function setSlotUsed(level, used) {
    setForm((f) => {
      const prev = f.spell_slots[level] || { total: 0, used: 0 };
      return { ...f, spell_slots: { ...f.spell_slots, [level]: { ...prev, used } } };
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

      const url = creature?.id ? `/api/creatures/${creature.id}` : '/api/creatures';
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
            {/* Image upload */}
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
                        <select className={inputClass} value={form.size} onChange={(e) => setField('size', e.target.value)}>
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
              </div>
            </div>

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
                      disabled={!racePickerHasTypes || racePickerRaces.length === 0}
                    >
                      <option value="">
                        {!racePickerHasTypes
                          ? 'No races for this Type'
                          : racePickerRaces.length === 0
                            ? 'None imported yet'
                            : 'Choose a race…'}
                      </option>
                      {racePickerRaces.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
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
                  const build = getClassBuild(form.char_class);
                  if (!build) return null;
                  const sa = build.startingEquipment || {};
                  const optA = sa.optionA?.items?.length
                    ? `${sa.optionA.items.join(', ')}${sa.optionA.gp ? ` + ${sa.optionA.gp} gp` : ''}`
                    : null;
                  const optB = sa.optionB?.gp ? `${sa.optionB.gp} gp` : null;
                  const claimed = form.class_state?.starting_equipment || null;
                  return (
                    <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-xs space-y-1">
                      <h4 className="text-sm font-semibold text-dnd-gold mb-1">{form.char_class} — Core Traits</h4>
                      <div><span className="text-gray-400">Primary Ability: </span>{formatPrimaryAbility(build.primary)}</div>
                      <div><span className="text-gray-400">Hit Die: </span>{build.hitDie}</div>
                      <div><span className="text-gray-400">Saving Throws: </span>{(build.saves || []).join(', ')}</div>
                      <div><span className="text-gray-400">Armor Training: </span>{(build.armor || []).join(', ') || '—'}</div>
                      <div><span className="text-gray-400">Weapons: </span>{(build.weapons || []).join(', ')}</div>
                      {(optA || optB) && (
                        <div className="pt-1 mt-1 border-t border-gray-700 space-y-1">
                          <div className="text-gray-400">Starting Equipment</div>
                          {optA && (
                            <div className="ml-2 flex items-start gap-2">
                              <button type="button"
                                disabled={!!claimed}
                                onClick={() => applyStartingEquipment('A')}
                                className="text-[10px] bg-dnd-gold/30 hover:bg-dnd-gold/50 disabled:bg-gray-700 disabled:text-gray-500 border border-dnd-gold/50 px-2 py-0.5 rounded shrink-0">
                                {claimed === 'A' ? 'Taken' : 'Take A'}
                              </button>
                              <span><span className="text-gray-500">A:</span> {optA}</span>
                            </div>
                          )}
                          {optB && (
                            <div className="ml-2 flex items-start gap-2">
                              <button type="button"
                                disabled={!!claimed}
                                onClick={() => applyStartingEquipment('B')}
                                className="text-[10px] bg-dnd-gold/30 hover:bg-dnd-gold/50 disabled:bg-gray-700 disabled:text-gray-500 border border-dnd-gold/50 px-2 py-0.5 rounded shrink-0">
                                {claimed === 'B' ? 'Taken' : 'Take B'}
                              </button>
                              <span><span className="text-gray-500">B:</span> {optB}</span>
                            </div>
                          )}
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
                  const weaponProfs = String(form.weapon_proficiencies || '')
                    .split(/\s*,\s*/).map((p) => p.trim()).filter(Boolean);
                  const mcs = form.multiclasses || [];
                  // Total level = primary + sum(multiclass levels).
                  const totalLevel = (Number(form.char_level) || 0)
                    + mcs.reduce((acc, m) => acc + (Number(m.level) || 0), 0);
                  return (
                    <>
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
                      return (
                        <div key={def.id} className="flex items-center gap-2 text-sm bg-gray-900/40 border border-gray-700 rounded px-2 py-1.5">
                          <div className="flex-1 min-w-0">
                            <div className="text-gray-100">{def.label}</div>
                            {def.note && (
                              <div className="text-[11px] text-gray-500 leading-snug">{def.note}</div>
                            )}
                          </div>
                          {isBI && (
                            <button
                              type="button"
                              disabled={used >= total}
                              onClick={() => setBardicGrant({ def, total, used })}
                              className="text-[11px] bg-purple-700 hover:bg-purple-600 disabled:opacity-30 text-white px-2 py-1 rounded font-semibold"
                              title="Grant the die to another character"
                            >Grant →</button>
                          )}
                          <button
                            type="button"
                            disabled={total !== Infinity && used >= total}
                            onClick={() => setUsed(def.id, used + 1)}
                            className="w-7 h-7 rounded bg-red-900/40 hover:bg-red-800/60 disabled:opacity-30 border border-red-800 text-red-200 leading-none"
                            title="Use one"
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
                <input type="number" className={inputClass} value={form.armor_class} min={1} onChange={(e) => setField('armor_class', parseInt(e.target.value) || 10)} />
              </div>
              <div className="col-span-2">
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
              const calc = computeAcFromGear(form);
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
                </div>
              );
            })()}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Hit Points (avg)</label>
                <input type="number" className={inputClass} value={form.hit_points} min={1} onChange={(e) => setField('hit_points', parseInt(e.target.value) || 1)} />
              </div>
              <div>
                <label className={labelClass}>Hit Dice {isPlayerCharacter ? '(freeform)' : ''}</label>
                <input className={inputClass} placeholder="5d8+10" value={form.hit_dice} onChange={(e) => setField('hit_dice', e.target.value)} />
              </div>
            </div>

            {isPlayerCharacter && (() => {
              const pool = computeHitDicePool(form) || [];
              const usedMap = (form.hit_dice_used_by_type && typeof form.hit_dice_used_by_type === 'object')
                ? form.hit_dice_used_by_type : {};
              return (
                <div className="bg-gray-800 rounded-lg p-3 space-y-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <h4 className="text-sm font-semibold text-dnd-gold">Hit Dice Pool</h4>
                    <span className="text-xs text-gray-500">Auto from class + multiclasses</span>
                  </div>
                  {pool.length === 0 ? (
                    <p className="text-xs text-gray-500">Pick a class to populate the pool.</p>
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
            <h4 className="text-sm font-semibold text-dnd-gold">Ability Scores</h4>
            <div className="grid grid-cols-3 gap-4">
              {[
                { key: 'strength', label: 'STR' },
                { key: 'dexterity', label: 'DEX' },
                { key: 'constitution', label: 'CON' },
                { key: 'intelligence', label: 'INT' },
                { key: 'wisdom', label: 'WIS' },
                { key: 'charisma', label: 'CHA' },
              ].map(({ key, label }) => (
                <div key={key} className="bg-gray-800 rounded-xl p-3 text-center border border-gray-700">
                  <div className="text-xs text-gray-400 font-semibold mb-1">{label}</div>
                  <input
                    type="number"
                    className="w-full bg-transparent text-center text-2xl font-bold text-white focus:outline-none"
                    value={form[key]}
                    min={1}
                    max={30}
                    onChange={(e) => setField(key, parseInt(e.target.value) || 10)}
                  />
                  <div className="text-sm text-dnd-gold mt-1">{fmtMod(mod(form[key]))}</div>
                </div>
              ))}
            </div>
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
                      <span className="text-sm text-gray-200 flex-1">{label}{expert && <span className="text-xs text-purple-400 ml-1">(exp)</span>}</span>
                      <span className="text-xs text-gray-500">({stat.slice(0,3).toUpperCase()})</span>
                      <span className="text-sm text-dnd-gold font-mono w-8 text-right">
                        {proficient ? fmtMod(form[key]) : fmtMod(mod(form[stat]))}
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
                <AbilityList
                  label="Feats"
                  items={form.feats || []}
                  onAdd={() => listAdd('feats')}
                  onRemove={(i) => listRemove('feats', i)}
                  onChange={(i, f, v) => listChange('feats', i, f, v)}
                />
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
            <SpellLibraryPicker
              charClass={form.char_class}
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
                  type: libSpell.type === 'combat' ? 'combat' : 'utility',
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
            {[0,1,2,3,4,5,6,7,8,9].map((level) => {
              const levelSpells = (form.spells || []).filter((s) => s.level === level);
              const slots = form.spell_slots?.[level] || { total: 0, used: 0 };
              const combatSpells = levelSpells.filter((s) => s.type === 'combat');
              const utilitySpells = levelSpells.filter((s) => s.type === 'utility');
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
                          title="Total spell slots"
                        />
                        {slots.total > 0 && (
                          <div className="flex gap-1" title="Check = slot used">
                            {Array.from({ length: slots.total }).map((_, i) => (
                              <input
                                key={i}
                                type="checkbox"
                                checked={i < (slots.used || 0)}
                                onChange={(e) => setSlotUsed(level, e.target.checked ? (slots.used || 0) + 1 : (slots.used || 0) - 1)}
                                className="w-3.5 h-3.5 accent-dnd-red cursor-pointer"
                                title={i < (slots.used || 0) ? 'Slot used' : 'Slot available'}
                              />
                            ))}
                          </div>
                        )}
                        {slots.total > 0 && (
                          <span className="text-xs text-gray-500">
                            {slots.total - (slots.used || 0)}/{slots.total}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="p-3 space-y-3">
                    {/* Combat spells */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-semibold text-red-400"><SwordIcon />Combat</span>
                        <button
                          type="button"
                          onClick={() => addSpell(level, 'combat')}
                          className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-0.5 rounded text-gray-300 transition-colors"
                        >+ Add</button>
                      </div>
                      {combatSpells.length === 0 && (
                        <p className="text-xs text-gray-600 italic pl-1">None</p>
                      )}
                      {combatSpells.map((spell) => (
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
                          borderClass="border-red-900/40"
                        />
                      ))}
                    </div>

                    {/* Utility spells */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-semibold text-blue-400"><OrbIcon />Utility</span>
                        <button
                          type="button"
                          onClick={() => addSpell(level, 'utility')}
                          className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-0.5 rounded text-gray-300 transition-colors"
                        >+ Add</button>
                      </div>
                      {utilitySpells.length === 0 && (
                        <p className="text-xs text-gray-600 italic pl-1">None</p>
                      )}
                      {utilitySpells.map((spell) => (
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
                          borderClass="border-blue-900/40"
                          isUtility
                        />
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Loot tab ── */}
        {activeTab === 'loot' && (
          <div className="space-y-3">
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
              {(form.inventory || []).length === 0 && (
                <p className="text-xs text-gray-500 italic py-1">No items — click + Add Item</p>
              )}
              <div className="space-y-2">
                {(form.inventory || []).map((item, i) => {
                  const isKnownLight = !!knownLightPreset(item.name);
                  const isWeapon = item.item_type === 'weapon';
                  const isArmor = item.item_type === 'armor';
                  const isMagicItem = item.item_type === 'magic_item';
                  // Plain mundane items don't get attuned — show the flag
                  // only on weapons / armor / magic items where it actually applies.
                  const canAttune = isWeapon || isMagicItem || isArmor;
                  // Magic-bonus AC field appears on magic items AND on
                  // armor (so a +1 plate is just an armor row with
                  // ac_bonus=1, no need for a separate magic-item entry).
                  const showAcBonus = isMagicItem || isArmor;
                  return (
                  <div key={i} className="bg-gray-800 rounded-lg p-3 space-y-2">
                    <div className="flex gap-2">
                      <select
                        className="w-28 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-gray-300 focus:outline-none focus:border-dnd-gold"
                        value={item.item_type || 'item'}
                        onChange={(e) => updateInventoryItem(i, 'item_type', e.target.value)}
                      >
                        <option value="item">Item</option>
                        <option value="weapon">Weapon</option>
                        <option value="armor">Armor</option>
                        <option value="magic_item">Magic Item</option>
                      </select>
                      <input
                        className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-dnd-gold"
                        placeholder="Item name"
                        value={item.name}
                        onChange={(e) => updateInventoryItem(i, 'name', e.target.value)}
                      />
                      <input
                        type="number"
                        min={1}
                        className="w-14 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white text-center focus:outline-none focus:border-dnd-gold"
                        placeholder="Qty"
                        title="Quantity"
                        value={item.qty}
                        onChange={(e) => updateInventoryItem(i, 'qty', Math.max(1, parseInt(e.target.value) || 1))}
                      />
                      <button type="button" onClick={() => removeInventoryItem(i)} className="text-red-400 hover:text-red-300 px-2"><XIcon /></button>
                    </div>

                    {isWeapon && (
                      <div className="space-y-2 border-l-2 border-dnd-gold/40 pl-3">
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <label className="text-xs text-gray-400">Range</label>
                            <input
                              className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-dnd-gold"
                              placeholder="e.g. 5ft or 60/120ft"
                              value={item.weapon_range || ''}
                              onChange={(e) => updateInventoryItem(i, 'weapon_range', e.target.value)}
                            />
                          </div>
                          <div className="w-24">
                            <label className="text-xs text-gray-400">Atk Bonus Stat</label>
                            <select
                              className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-dnd-gold"
                              value={item.attack_stat || 'STR'}
                              onChange={(e) => updateInventoryItem(i, 'attack_stat', e.target.value)}
                            >
                              {['STR','DEX','CON','INT','WIS','CHA'].map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </div>
                          <div className="w-16">
                            <label className="text-xs text-gray-400">Misc Bonus</label>
                            <input
                              type="number"
                              className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white text-center focus:outline-none focus:border-dnd-gold"
                              placeholder="+0"
                              value={item.attack_bonus_misc ?? 0}
                              onChange={(e) => updateInventoryItem(i, 'attack_bonus_misc', parseInt(e.target.value) || 0)}
                            />
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-xs text-gray-400">Damage</label>
                            <button
                              type="button"
                              onClick={() => addDamageEntry(i)}
                              className="text-xs text-indigo-400 hover:text-indigo-200 transition-colors"
                            >
                              + Add Damage
                            </button>
                          </div>
                          <div className="space-y-1">
                            {getDamageEntries(item).map((entry, ei) => (
                              <div key={ei} className="flex gap-1.5 items-center">
                                <input
                                  className="w-24 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-dnd-gold"
                                  placeholder="1d8+3"
                                  value={entry.damage}
                                  onChange={(e) => updateDamageEntry(i, ei, 'damage', e.target.value)}
                                />
                                <input
                                  className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-dnd-gold"
                                  placeholder="Slashing"
                                  value={entry.damage_type}
                                  onChange={(e) => updateDamageEntry(i, ei, 'damage_type', e.target.value)}
                                />
                                {getDamageEntries(item).length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => removeDamageEntry(i, ei)}
                                    className="text-red-400 hover:text-red-300 px-1 shrink-0"
                                  ><XIcon /></button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="text-xs text-gray-400">Properties</label>
                          <input
                            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-dnd-gold"
                            placeholder="e.g. Versatile, Finesse"
                            value={item.properties || ''}
                            onChange={(e) => updateInventoryItem(i, 'properties', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400">Mastery</label>
                          <select
                            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-dnd-gold"
                            value={item.mastery || ''}
                            onChange={(e) => updateInventoryItem(i, 'mastery', e.target.value)}
                          >
                            <option value="">None</option>
                            {['Cleave','Graze','Nick','Push','Sap','Slow','Topple','Vex'].map(m => (
                              <option key={m} value={m}>{m}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}

                    {isArmor && (
                      <div className="space-y-2 border-l-2 border-emerald-700/40 pl-3">
                        <div className="flex gap-2 flex-wrap">
                          <div className="w-24">
                            <label className="text-xs text-gray-400">Base AC</label>
                            <input
                              type="number"
                              min={1}
                              className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white text-center focus:outline-none focus:border-emerald-400"
                              placeholder="14"
                              value={item.ac_base ?? ''}
                              onChange={(e) => updateInventoryItem(i, 'ac_base', parseInt(e.target.value) || 0)}
                            />
                          </div>
                          <div className="w-32">
                            <label className="text-xs text-gray-400">Category</label>
                            <select
                              className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-emerald-400"
                              value={item.armor_category || 'light'}
                              onChange={(e) => updateInventoryItem(i, 'armor_category', e.target.value)}
                            >
                              <option value="light">Light (+ DEX)</option>
                              <option value="medium">Medium (+ DEX, max 2)</option>
                              <option value="heavy">Heavy (no DEX)</option>
                              <option value="shield">Shield (+2 flat)</option>
                            </select>
                          </div>
                          <div className="w-24">
                            <label className="text-xs text-gray-400">STR Req</label>
                            <input
                              type="number"
                              min={0}
                              className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white text-center focus:outline-none focus:border-emerald-400"
                              placeholder="—"
                              value={item.str_req ?? ''}
                              onChange={(e) => updateInventoryItem(i, 'str_req', e.target.value === '' ? null : parseInt(e.target.value) || 0)}
                            />
                          </div>
                          <label className="flex items-center gap-1.5 text-xs text-gray-300 self-end pb-1">
                            <input
                              type="checkbox"
                              className="accent-emerald-500"
                              checked={!!item.stealth_disadvantage}
                              onChange={(e) => updateInventoryItem(i, 'stealth_disadvantage', e.target.checked)}
                            />
                            <span>Stealth disadvantage</span>
                          </label>
                        </div>
                        <p className="text-[11px] text-emerald-300/70 leading-snug">
                          When this armor is equipped, your AC is auto-computed from Base AC + DEX (capped per category) + any other equipped magic-item AC bonuses. Shields with this category contribute the same +2 the existing Shield flag does.
                        </p>
                      </div>
                    )}

                    {showAcBonus && (
                      <div className="flex items-center gap-3 flex-wrap pl-3">
                        <label className="flex items-center gap-1.5 text-xs text-gray-300">
                          <span className="text-gray-400">Equipped AC bonus:</span>
                          <input
                            type="number"
                            className="w-14 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white text-center focus:outline-none focus:border-emerald-400"
                            placeholder="0"
                            value={item.ac_bonus ?? ''}
                            onChange={(e) => updateInventoryItem(i, 'ac_bonus', e.target.value === '' ? null : parseInt(e.target.value) || 0)}
                          />
                          <span className="text-gray-500">added to AC while equipped</span>
                        </label>
                      </div>
                    )}

                    <div className="flex items-center gap-3 flex-wrap">
                      {canAttune && (
                        <label className="flex items-center gap-1.5 text-xs text-gray-300">
                          <span className="text-gray-400">Attunement:</span>
                          <select
                            className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-dnd-gold"
                            value={item.attunement_required ? 'yes' : 'no'}
                            onChange={(e) => updateInventoryItem(i, 'attunement_required', e.target.value === 'yes')}
                          >
                            <option value="no">Not required</option>
                            <option value="yes">Requires attunement</option>
                          </select>
                        </label>
                      )}
                      {canAttune && item.attunement_required && (
                        <label className="flex items-center gap-1.5 text-xs text-gray-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={item.attuned || false}
                            onChange={(e) => {
                              if (e.target.checked) {
                                const already = (form.inventory || []).filter(it => it.attuned && it.attunement_required).length;
                                if (already >= 3) {
                                  alert('You can only attune to 3 items at a time.');
                                  return;
                                }
                              }
                              updateInventoryItem(i, 'attuned', e.target.checked);
                            }}
                            className="accent-purple-400"
                          />
                          <span className="text-purple-300">Attuned</span>
                        </label>
                      )}
                    </div>


                    <div className="flex items-center gap-3 flex-wrap">
                      <label className="flex items-center gap-1.5 text-xs text-gray-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={item.equipped || false}
                          onChange={(e) => updateInventoryItem(i, 'equipped', e.target.checked)}
                          className="accent-dnd-gold"
                        />
                        Equipped
                      </label>
                      {!isKnownLight && (
                        <label className="flex items-center gap-1.5 text-xs text-gray-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={item.sheds_light || false}
                            onChange={(e) => updateInventoryItem(i, 'sheds_light', e.target.checked)}
                            className="accent-yellow-400"
                          />
                          <LightbulbIcon />Sheds Light
                        </label>
                      )}
                      {isKnownLight && (
                        <span className="text-xs text-yellow-400 flex items-center gap-1"><LightbulbIcon />Light source (auto)</span>
                      )}
                    </div>
                    {(item.sheds_light || isKnownLight) && (
                      <div className="flex items-center gap-3 flex-wrap">
                        <label className="flex items-center gap-1.5 text-xs text-gray-300">
                          <span className="text-yellow-300">Bright light:</span>
                          <input
                            type="number"
                            min={0}
                            step={5}
                            className="w-16 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white text-center focus:outline-none focus:border-yellow-400"
                            value={item.bright_ft ?? 20}
                            onChange={(e) => updateInventoryItem(i, 'bright_ft', Math.max(0, parseInt(e.target.value) || 0))}
                          />
                          <span className="text-gray-500">ft</span>
                        </label>
                        <label className="flex items-center gap-1.5 text-xs text-gray-300">
                          <span className="text-yellow-600">Dim light:</span>
                          <input
                            type="number"
                            min={0}
                            step={5}
                            className="w-16 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white text-center focus:outline-none focus:border-yellow-400"
                            value={item.dim_ft ?? 40}
                            onChange={(e) => updateInventoryItem(i, 'dim_ft', Math.max(0, parseInt(e.target.value) || 0))}
                          />
                          <span className="text-gray-500">ft beyond bright</span>
                        </label>
                        <label className="flex items-center gap-1.5 text-xs text-gray-300">
                          <span className="text-gray-400">Color:</span>
                          <input
                            type="color"
                            className="w-8 h-6 rounded border border-gray-600 cursor-pointer"
                            value={item.light_color || '#fbbf24'}
                            onChange={(e) => updateInventoryItem(i, 'light_color', e.target.value)}
                          />
                        </label>
                        <label className="flex items-center gap-1.5 text-xs text-gray-300 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            className="accent-dnd-gold"
                            checked={item.flicker !== false}
                            onChange={(e) => updateInventoryItem(i, 'flicker', e.target.checked)}
                          />
                          <span>Flicker</span>
                          <span className="text-gray-500">(off for magical/steady glow)</span>
                        </label>
                      </div>
                    )}
                    <textarea
                      className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white resize-none focus:outline-none focus:border-dnd-gold"
                      placeholder="Description (optional)"
                      rows={2}
                      value={item.desc || ''}
                      onChange={(e) => updateInventoryItem(i, 'desc', e.target.value)}
                    />
                  </div>
                  );
                })}
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
            const statKey = STAT_KEYS[item.attack_stat] || 'strength';
            const statVal = form[statKey] || 10;
            const mod = Math.floor((statVal - 10) / 2);
            const pb = form.proficiency_bonus || 2;
            const misc = item.attack_bonus_misc || 0;
            const total = mod + pb + misc;
            return (total >= 0 ? '+' : '') + total;
          }
          // Damage modifier — STR/DEX (or whatever the weapon's
          // attack_stat is) added to weapon damage per the standard
          // 5e melee/ranged weapon attack rules.
          function dmgMod(item) {
            const statKey = STAT_KEYS[item.attack_stat] || 'strength';
            const statVal = form[statKey] || 10;
            return Math.floor((statVal - 10) / 2);
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
                          const dmgEntries = getDamageEntries(w).filter(e => e.damage);
                          const dm = dmgMod(w);
                          const dmgStr = dmgEntries.length
                            ? dmgEntries.map(e => `${formatDamageWithMod(e.damage, dm)}${e.damage_type ? ` ${formatDamageType(e.damage_type)}` : ''}`).join(' + ')
                            : '—';
                          return (
                          <tr key={idx} className={w.equipped ? 'text-white' : 'text-gray-400'}>
                            <td className="py-1.5 pr-2 font-medium">{w.name || '—'}{w.equipped && <span className="text-dnd-gold ml-1 text-xs">★</span>}</td>
                            <td className="py-1.5 pr-2 text-center font-mono text-green-400">{atkBonus(w)}</td>
                            <td className="py-1.5 pr-2 font-mono">{dmgStr}</td>
                            <td className="py-1.5 pr-2">{w.weapon_range || '—'}</td>
                            <td className="py-1.5 text-gray-500">{w.properties || '—'}</td>
                          </tr>
                          );
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
      {showBackgroundModal && (() => {
        const bg = findBackgroundMerged(bgPickedId);
        const STAT_LABELS = {
          strength: 'STR', dexterity: 'DEX', constitution: 'CON',
          intelligence: 'INT', wisdom: 'WIS', charisma: 'CHA',
        };
        const canApply = !!bg && (
          bgAsiKind === '1-1-1'
            ? true
            : (bgAsiPlus2 && bgAsiPlus1 && bgAsiPlus2 !== bgAsiPlus1
                && bg.abilities.includes(bgAsiPlus2)
                && bg.abilities.includes(bgAsiPlus1))
        );
        return (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
            onClick={() => setShowBackgroundModal(false)}>
            <div onClick={(e) => e.stopPropagation()}
              className="bg-gray-900 border border-amber-700 rounded-lg w-full max-w-2xl max-h-[88vh] flex flex-col">
              <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700">
                <h3 className="text-amber-300 font-semibold">Choose Background</h3>
                <button type="button" onClick={() => setShowBackgroundModal(false)}
                  className="text-gray-400 hover:text-gray-200 text-xl leading-none">×</button>
              </div>
              <div className="overflow-y-auto flex-1 p-4 space-y-4">
                {/* Card row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {allBackgroundsMerged.map((b) => (
                    <button key={b.id} type="button"
                      onClick={() => {
                        setBgPickedId(b.id);
                        // Reset ASI defaults whenever the card changes.
                        setBgAsiKind('2-1');
                        setBgAsiPlus2(b.abilities[0]);
                        setBgAsiPlus1(b.abilities[1]);
                        setBgEquipment('a');
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
                    <p className="text-xs text-gray-300 leading-relaxed">{bg.description}</p>

                    <div className="bg-gray-800/40 border border-gray-700 rounded p-2">
                      <div className="text-xs uppercase tracking-wider text-gray-400 mb-1">Origin Feat</div>
                      <div className="text-sm text-amber-200 font-semibold">{bg.feat?.name}</div>
                      <div className="text-xs text-gray-300 mt-1 whitespace-pre-wrap">{bg.feat?.desc}</div>
                    </div>

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
                        <div className="text-sm text-gray-200">{bg.tool}</div>
                      </div>
                    </div>

                    {/* ASI selector */}
                    <div className="bg-gray-800/40 border border-gray-700 rounded p-2 space-y-2">
                      <div className="text-xs uppercase tracking-wider text-gray-400">
                        Ability Score Improvement
                      </div>
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
                            {bg.abilities.map((a) => (
                              <option key={a} value={a}>{STAT_LABELS[a]}</option>
                            ))}
                          </select>
                          <span className="text-gray-400 ml-2">+1 to</span>
                          <select value={bgAsiPlus1}
                            onChange={(e) => setBgAsiPlus1(e.target.value)}
                            className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white">
                            <option value="">—</option>
                            {bg.abilities.filter((a) => a !== bgAsiPlus2).map((a) => (
                              <option key={a} value={a}>{STAT_LABELS[a]}</option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <div className="text-xs text-gray-400">
                          +1 each to {bg.abilities.map((a) => STAT_LABELS[a]).join(', ')}.
                        </div>
                      )}
                    </div>

                    {/* Equipment selector */}
                    <div className="bg-gray-800/40 border border-gray-700 rounded p-2 space-y-2">
                      <div className="text-xs uppercase tracking-wider text-gray-400">Starting Equipment</div>
                      <label className="flex items-start gap-2 cursor-pointer text-sm text-gray-200">
                        <input type="radio" checked={bgEquipment === 'a'}
                          onChange={() => setBgEquipment('a')}
                          className="accent-amber-500 mt-0.5" />
                        <span>
                          <span className="text-amber-200">A:</span>{' '}
                          {bg.equipment_a_items.map((it) =>
                            `${it.name}${it.qty > 1 ? ` ×${it.qty}` : ''}`
                          ).join(', ')}
                          {bg.equipment_a_gp > 0 && `, ${bg.equipment_a_gp} GP`}
                        </span>
                      </label>
                      <label className="flex items-start gap-2 cursor-pointer text-sm text-gray-200">
                        <input type="radio" checked={bgEquipment === 'b'}
                          onChange={() => setBgEquipment('b')}
                          className="accent-amber-500 mt-0.5" />
                        <span>
                          <span className="text-amber-200">B:</span> {bg.equipment_b_gp} GP
                        </span>
                      </label>
                    </div>
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
                      { kind: bgAsiKind, plus2: bgAsiPlus2, plus1: bgAsiPlus1 },
                      bgEquipment,
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
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
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
                        // 3. Tell the table what just happened.
                        socket.emit('roll_dice', {
                          dice: 'd1', count: 1, modifier: 0,
                          label: `${form.name || 'Bard'} grants ${die} Bardic Inspiration to ${tc.name || 'someone'}`,
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
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
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
            </div>
            <div className="overflow-y-auto flex-1 p-2">
              {!itemLibraryLoaded && (
                <div className="text-gray-500 italic p-2 text-sm">Loading…</div>
              )}
              {itemLibraryLoaded && (() => {
                const q = itemLibrarySearch.trim().toLowerCase();
                const list = itemLibraryRows.filter(r =>
                  (!q || r.name.toLowerCase().includes(q)) &&
                  (!itemLibraryType || r.item_type === itemLibraryType)
                );
                if (list.length === 0) {
                  return <div className="text-gray-500 italic p-2 text-sm">No matches.</div>;
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
    </form>
  );
}
