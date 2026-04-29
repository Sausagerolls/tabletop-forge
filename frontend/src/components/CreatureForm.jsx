import React, { useState, useEffect } from 'react';
import LanguagePicker from './LanguagePicker.jsx';

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
  char_class: '',
  char_subclass: '',
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

const CLASSES = ['Artificer','Barbarian','Bard','Cleric','Druid','Fighter','Monk','Paladin','Ranger','Rogue','Sorcerer','Warlock','Wizard'];

function SpellLibraryPicker({ onLearn, charClass }) {
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
            <p className="text-xs text-gray-500 italic">No spells match. Switch class filter to "All classes" or ask your DM to scan a PDF.</p>
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

  function handleCRChange(cr) {
    setForm((f) => ({ ...f, challenge_rating: cr, xp: CR_XP[cr] || 0 }));
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
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <label className={labelClass}>Name *</label>
                  <input className={inputClass} placeholder="Goblin" value={form.name} onChange={(e) => setField('name', e.target.value)} required />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelClass}>Size</label>
                    <select className={inputClass} value={form.size} onChange={(e) => setField('size', e.target.value)}>
                      {SIZES.map((s) => <option key={s} value={s}>{SIZE_LABELS[s]}</option>)}
                    </select>
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

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Subtype</label>
                <input className={inputClass} placeholder="(any race)" value={form.subtype} onChange={(e) => setField('subtype', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Alignment</label>
                <select className={inputClass} value={form.alignment} onChange={(e) => setField('alignment', e.target.value)}>
                  {ALIGNMENTS.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>

            {isPlayerCharacter && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Class</label>
                    <input className={inputClass} placeholder="Fighter" value={form.char_class || ''} onChange={(e) => setField('char_class', e.target.value)} />
                  </div>
                  <div>
                    <label className={labelClass}>Subclass</label>
                    <input className={inputClass} placeholder="Battle Master" value={form.char_subclass || ''} onChange={(e) => setField('char_subclass', e.target.value)} />
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
            <label className="flex items-center gap-2 text-sm text-gray-200 cursor-pointer">
              <input
                type="checkbox"
                checked={!!form.shield_equipped}
                onChange={(e) => setField('shield_equipped', e.target.checked)}
                className="accent-dnd-gold"
              />
              Shield Equipped (+2 AC)
            </label>

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

            {isPlayerCharacter && (
              <div className="bg-gray-800 rounded-lg p-3 space-y-2">
                <h4 className="text-sm font-semibold text-dnd-gold">Hit Dice Pool</h4>
                <div className="flex items-center gap-2 flex-wrap">
                  <label className="flex items-center gap-1 text-sm text-gray-200">
                    <span className="text-xs text-gray-400">Qty:</span>
                    <input
                      type="number"
                      min={0}
                      max={30}
                      className="w-16 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white text-center"
                      value={form.hit_dice_qty || 0}
                      onChange={(e) => setField('hit_dice_qty', Math.max(0, parseInt(e.target.value) || 0))}
                    />
                  </label>
                  <label className="flex items-center gap-1 text-sm text-gray-200">
                    <span className="text-xs text-gray-400">Type:</span>
                    <select
                      className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white"
                      value={form.hit_dice_type || ''}
                      onChange={(e) => setField('hit_dice_type', e.target.value)}
                    >
                      <option value="">—</option>
                      {['d4','d6','d8','d10','d12','d20'].map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </label>
                </div>
                {(form.hit_dice_qty || 0) > 0 && (
                  <div className="flex flex-wrap items-center gap-1 text-xs text-gray-400">
                    <span>Used:</span>
                    {Array.from({ length: form.hit_dice_qty }).map((_, i) => (
                      <input
                        key={`hd${i}`}
                        type="checkbox"
                        checked={i < (form.hit_dice_used || 0)}
                        onChange={(e) => setField('hit_dice_used', e.target.checked ? (form.hit_dice_used || 0) + 1 : (form.hit_dice_used || 0) - 1)}
                        className="accent-dnd-red"
                      />
                    ))}
                    <span className="ml-1">{(form.hit_dice_qty - (form.hit_dice_used || 0))}/{form.hit_dice_qty} available</span>
                  </div>
                )}
              </div>
            )}

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
                <button type="button" onClick={addInventoryItem}
                  className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded text-gray-200">
                  + Add Item
                </button>
              </div>
              {(form.inventory || []).length === 0 && (
                <p className="text-xs text-gray-500 italic py-1">No items — click + Add Item</p>
              )}
              <div className="space-y-2">
                {(form.inventory || []).map((item, i) => {
                  const isKnownLight = !!knownLightPreset(item.name);
                  const isWeapon = item.item_type === 'weapon';
                  const isMagicItem = item.item_type === 'magic_item';
                  // Plain mundane items don't get attuned — show the flag
                  // only on weapons and magic items where it actually applies.
                  const canAttune = isWeapon || isMagicItem;
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
                          const dmgStr = dmgEntries.length
                            ? dmgEntries.map(e => `${e.damage}${e.damage_type ? ` ${e.damage_type}` : ''}`).join(' + ')
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
    </form>
  );
}
