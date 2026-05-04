// CustomRaceEditor — modal for GM-authored races and sub-races.
// Persists to /api/custom/races. The data shape mirrors the static
// catalog in frontend/src/data/races.js so the existing race-picker
// apply logic accepts custom rows without changes.
//
// Fields exposed:
//   • Name, edition tag, creature_type
//   • Speeds (walk/fly/swim/climb/burrow)
//   • Size: single fixed value OR list of allowed choices
//   • Senses (type + range, repeating)
//   • Resistances + Languages (CSV)
//   • Spells (name + minLevel, repeating) + casting ability
//   • Skills (tri-state per skill: none / proficient / expertise)
//   • Traits (name + desc + category)
//   • Sub-races (parent_id linkage; sub-races edit through this same
//     modal with the parent pre-set)

import React, { useEffect, useState } from 'react';
import LanguagePicker from './LanguagePicker.jsx';

const SIZES = ['Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan'];
const CREATURE_TYPES = [
  'Aberration', 'Beast', 'Celestial', 'Construct', 'Dragon',
  'Elemental', 'Fey', 'Fiend', 'Giant', 'Humanoid',
  'Monstrosity', 'Ooze', 'Plant', 'Undead',
];
const EDITIONS = [
  { v: 'srd2014', label: '2014' },
  { v: 'srd2024', label: '2024' },
  { v: 'custom',  label: 'Custom' },
];
const STAT_LIST = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
const TRAIT_CATS = [
  { v: 'specialAbility', label: 'Trait' },
  { v: 'action',         label: 'Action' },
  { v: 'bonusAction',    label: 'Bonus Action' },
  { v: 'reaction',       label: 'Reaction' },
];
const SENSE_TYPES = [
  'darkvision', 'blindsight', 'tremorsense', 'truesight', 'devilssight',
];

const SKILLS = [
  ['skill_acrobatics',      'Acrobatics'],
  ['skill_animal_handling', 'Animal Handling'],
  ['skill_arcana',          'Arcana'],
  ['skill_athletics',       'Athletics'],
  ['skill_deception',       'Deception'],
  ['skill_history',         'History'],
  ['skill_insight',         'Insight'],
  ['skill_intimidation',    'Intimidation'],
  ['skill_investigation',   'Investigation'],
  ['skill_medicine',        'Medicine'],
  ['skill_nature',          'Nature'],
  ['skill_perception',      'Perception'],
  ['skill_performance',     'Performance'],
  ['skill_persuasion',      'Persuasion'],
  ['skill_religion',        'Religion'],
  ['skill_sleight_of_hand', 'Sleight of Hand'],
  ['skill_stealth',         'Stealth'],
  ['skill_survival',        'Survival'],
];

function emptyRace() {
  return {
    name: '',
    edition: 'custom',
    creature_type: 'Humanoid',
    parent_id: null,
    subraceLabel: '',
    description: '',
    setsSpeed: 30,
    speed_fly: 0,
    speed_swim: 0,
    speed_climb: 0,
    speed_burrow: 0,
    setsSize: 'Medium',
    sizeChoices: [],
    setsSenses: [],
    addsResistances: [],
    addsLanguages: [],
    addsSpells: [],
    castingAbility: '',
    addsSkills: [],   // [{ skill: 'skill_perception', level: 'proficient' | 'expertise' }]
    traits: [],
  };
}

export default function CustomRaceEditor({ initial, onClose, onSaved, parentRace }) {
  const [data, setData] = useState(() => {
    if (initial) return { ...emptyRace(), ...initial };
    const seed = emptyRace();
    if (parentRace) {
      seed.parent_id = parentRace.id;
      seed.creature_type = parentRace.creature_type || 'Humanoid';
      seed.edition = parentRace.edition || 'custom';
    }
    return seed;
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function patch(p) { setData((d) => ({ ...d, ...p })); }

  async function save() {
    if (!data.name.trim()) { setError('Name is required'); return; }
    setSubmitting(true); setError('');
    try {
      const url = initial?.id ? `/api/custom/races/${initial.id}` : '/api/custom/races';
      const method = initial?.id ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          edition: data.edition,
          parent_id: data.parent_id,
          data,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      onSaved?.();
      onClose?.();
    } catch (err) { setError(err.message); }
    finally { setSubmitting(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
      onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="bg-gray-900 border border-purple-700 rounded-lg w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700">
          <h3 className="text-purple-300 font-semibold">
            {initial?.id ? 'Edit' : 'New'} {data.parent_id ? 'Sub-Race' : 'Race'}
            {parentRace ? ` of ${parentRace.name}` : ''}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200 text-xl leading-none">×</button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-3">
          <Row>
            <Field label="Name" required>
              <input className={INPUT} value={data.name}
                onChange={(e) => patch({ name: e.target.value })} />
            </Field>
            <Field label="Edition">
              <select className={INPUT} value={data.edition}
                onChange={(e) => patch({ edition: e.target.value })}>
                {EDITIONS.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
              </select>
            </Field>
            <Field label="Creature Type">
              <select className={INPUT} value={data.creature_type}
                onChange={(e) => patch({ creature_type: e.target.value })}>
                {CREATURE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
          </Row>

          <Field label="Description">
            <textarea className={INPUT} rows={2} value={data.description}
              onChange={(e) => patch({ description: e.target.value })} />
          </Field>

          {!data.parent_id && (
            <Field label="Sub-Race Label (optional, e.g. Lineage / Ancestry / Heritage)">
              <input className={INPUT} value={data.subraceLabel || ''}
                onChange={(e) => patch({ subraceLabel: e.target.value })} />
            </Field>
          )}

          <SectionHeading>Speeds</SectionHeading>
          <Row>
            <Field label="Walk"><NumIn value={data.setsSpeed} onChange={(v) => patch({ setsSpeed: v })} /></Field>
            <Field label="Fly"><NumIn value={data.speed_fly} onChange={(v) => patch({ speed_fly: v })} /></Field>
            <Field label="Swim"><NumIn value={data.speed_swim} onChange={(v) => patch({ speed_swim: v })} /></Field>
            <Field label="Climb"><NumIn value={data.speed_climb} onChange={(v) => patch({ speed_climb: v })} /></Field>
            <Field label="Burrow"><NumIn value={data.speed_burrow} onChange={(v) => patch({ speed_burrow: v })} /></Field>
          </Row>

          <SectionHeading>Size</SectionHeading>
          <Row>
            <Field label="Fixed Size">
              <select className={INPUT} value={data.setsSize || ''}
                onChange={(e) => patch({ setsSize: e.target.value || null, sizeChoices: [] })}>
                <option value="">— choose below —</option>
                {SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Or restricted choices (multi-select)">
              <select multiple className={INPUT + ' h-20'}
                value={data.sizeChoices || []}
                onChange={(e) => patch({
                  sizeChoices: Array.from(e.target.selectedOptions).map((o) => o.value),
                  setsSize: null,
                })}>
                {SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
          </Row>

          <SectionHeading>Senses</SectionHeading>
          <ListEditor
            items={data.setsSenses}
            onChange={(arr) => patch({ setsSenses: arr })}
            blank={() => ({ type: 'darkvision', range: 60 })}
            renderRow={(it, set) => (
              <>
                <select className={INPUT_SM} value={it.type}
                  onChange={(e) => set({ ...it, type: e.target.value })}>
                  {SENSE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <NumIn value={it.range || 0}
                  onChange={(v) => set({ ...it, range: v })} suffix="ft." />
              </>
            )}
          />

          <SectionHeading>Damage Resistances</SectionHeading>
          <CsvIn value={data.addsResistances} onChange={(arr) => patch({ addsResistances: arr })}
            placeholder="fire, poison, …" />

          <SectionHeading>Languages</SectionHeading>
          {/* The shared LanguagePicker reads/writes a comma-separated
              string and writes new entries to /api/languages so they
              propagate to every other surface that consults the
              registry (NPC chat, other characters' pickers, AI
              language normaliser). The race editor's stored shape is
              an array, so we adapt at the boundary. */}
          <LanguagePicker
            value={Array.isArray(data.addsLanguages) ? data.addsLanguages.join(', ') : (data.addsLanguages || '')}
            onChange={(csv) => patch({
              addsLanguages: String(csv || '')
                .split(/\s*,\s*/)
                .map((s) => s.trim())
                .filter(Boolean),
            })} />

          <SectionHeading>Innate Spells</SectionHeading>
          <Field label="Casting Ability">
            <select className={INPUT_SM} value={data.castingAbility || ''}
              onChange={(e) => patch({ castingAbility: e.target.value })}>
              <option value="">— none —</option>
              {STAT_LIST.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <ListEditor
            items={data.addsSpells}
            onChange={(arr) => patch({ addsSpells: arr })}
            blank={() => ({ name: '', minLevel: 1 })}
            renderRow={(it, set) => (
              <>
                <input className={INPUT_SM + ' flex-1'} placeholder="Spell name"
                  value={it.name} onChange={(e) => set({ ...it, name: e.target.value })} />
                <span className="text-xs text-gray-400">unlocks at level</span>
                <NumIn value={it.minLevel || 1}
                  onChange={(v) => set({ ...it, minLevel: v })} />
              </>
            )}
          />

          <SectionHeading>Skill Proficiencies</SectionHeading>
          <SkillTriState value={data.addsSkills}
            onChange={(arr) => patch({ addsSkills: arr })} />

          {/* One section per category. Behind the scenes they all
              write into the single `traits` array tagged with the
              right category — applyRacePicker fans them out into
              special_abilities / actions / bonus_actions / reactions
              based on that tag. */}
          {TRAIT_CATS.map((cat) => (
            <CategorySection
              key={cat.v}
              label={`${cat.label}s`}
              category={cat.v}
              traits={data.traits || []}
              onChange={(arr) => patch({ traits: arr })}
            />
          ))}
        </div>

        {error && <div className="px-4 py-2 text-xs text-red-300 bg-red-900/30 border-t border-red-700">{error}</div>}

        <div className="flex items-center justify-end gap-2 px-4 py-2 border-t border-gray-700">
          <button onClick={onClose}
            className="text-xs text-gray-400 hover:text-gray-200 px-3 py-1.5">Cancel</button>
          <button onClick={save} disabled={submitting}
            className="text-xs bg-purple-700 hover:bg-purple-600 disabled:bg-gray-700 text-white px-3 py-1.5 rounded">
            {submitting ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── tiny presentation helpers ─────────────────────────────────────
const INPUT = 'w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white';
const INPUT_SM = 'bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white';

function Row({ children }) {
  return <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">{children}</div>;
}
function Field({ label, required, children }) {
  return (
    <div>
      <label className="text-[11px] text-gray-400 block mb-0.5">
        {label}{required && ' *'}
      </label>
      {children}
    </div>
  );
}
function SectionHeading({ children }) {
  return <h4 className="text-xs uppercase tracking-wider text-purple-300 pt-1 border-t border-gray-800">{children}</h4>;
}
function NumIn({ value, onChange, suffix }) {
  return (
    <div className="flex items-center gap-1">
      <input type="number" className={INPUT_SM + ' w-20 text-center'}
        value={value ?? 0} onChange={(e) => onChange(parseInt(e.target.value) || 0)} />
      {suffix && <span className="text-xs text-gray-400">{suffix}</span>}
    </div>
  );
}
function CsvIn({ value, onChange, placeholder }) {
  return (
    <input className={INPUT}
      placeholder={placeholder}
      value={(value || []).join(', ')}
      onChange={(e) => onChange(e.target.value.split(/\s*,\s*/).filter(Boolean))} />
  );
}
// One section per trait category — Traits, Actions, Bonus Actions,
// Reactions. Reads/writes a slice of the unified `traits` array so
// the underlying storage shape (and the apply logic) stays identical
// to the SRD races. Category is baked into the row by the section,
// not the user — picking the right section IS the picker.
function CategorySection({ label, category, traits, onChange }) {
  const slice = traits.filter((t) => (t.category || 'specialAbility') === category);
  const others = traits.filter((t) => (t.category || 'specialAbility') !== category);
  const setSlice = (next) => onChange([...others, ...next]);
  return (
    <div className="space-y-1">
      <h4 className="text-xs uppercase tracking-wider text-purple-300 pt-1 border-t border-gray-800">{label}</h4>
      {slice.map((it, i) => (
        <div key={i} className="bg-gray-800/40 border border-gray-700 rounded p-1.5 flex flex-col gap-2">
          <input className={INPUT_SM + ' w-full'} placeholder={`${label.replace(/s$/, '')} name`}
            value={it.name || ''}
            onChange={(e) => setSlice(slice.map((r, j) => j === i ? { ...r, name: e.target.value, category } : r))} />
          <textarea className={INPUT_SM + ' w-full'} rows={2}
            placeholder="Description"
            value={it.desc || ''}
            onChange={(e) => setSlice(slice.map((r, j) => j === i ? { ...r, desc: e.target.value, category } : r))} />
          <button type="button"
            onClick={() => setSlice(slice.filter((_, j) => j !== i))}
            className="text-red-400 hover:text-red-200 text-xs self-end">remove</button>
        </div>
      ))}
      <button type="button"
        onClick={() => setSlice([...slice, { name: '', desc: '', category }])}
        className="text-xs text-purple-300 hover:text-purple-100">+ add {label.toLowerCase().replace(/s$/, '')}</button>
    </div>
  );
}

function ListEditor({ items, onChange, blank, renderRow, stack }) {
  const list = items || [];
  const add = () => onChange([...list, blank()]);
  const set = (i, v) => onChange(list.map((it, j) => (j === i ? v : it)));
  const del = (i) => onChange(list.filter((_, j) => j !== i));
  return (
    <div className="space-y-1">
      {list.map((it, i) => (
        <div key={i} className={`bg-gray-800/40 border border-gray-700 rounded p-1.5 flex ${stack ? 'flex-col' : 'items-center'} gap-2`}>
          {renderRow(it, (v) => set(i, v))}
          <button type="button" onClick={() => del(i)}
            className="text-red-400 hover:text-red-200 text-xs px-1 self-end">remove</button>
        </div>
      ))}
      <button type="button" onClick={add}
        className="text-xs text-purple-300 hover:text-purple-100">+ add row</button>
    </div>
  );
}
// Tri-state skill grid: none / proficient / expertise. Stored as
// a sparse array of { skill, level } so most rows aren't carried.
function SkillTriState({ value, onChange }) {
  const map = new Map((value || []).map((row) => [row.skill, row.level]));
  const setLevel = (key, lvl) => {
    const next = (value || []).filter((r) => r.skill !== key);
    if (lvl) next.push({ skill: key, level: lvl });
    onChange(next);
  };
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-0.5">
      {SKILLS.map(([key, label]) => {
        const lvl = map.get(key) || '';
        return (
          <div key={key} className="flex items-center justify-between text-xs text-gray-200 py-0.5">
            <span>{label}</span>
            <div className="flex gap-1">
              {[
                ['', 'none'],
                ['proficient', 'prof'],
                ['expertise', 'expert'],
              ].map(([v, lab]) => (
                <button type="button" key={v || 'none'}
                  onClick={() => setLevel(key, v)}
                  className={`px-1.5 py-0.5 rounded text-[10px] border ${
                    lvl === v
                      ? (v === 'expertise'
                          ? 'bg-amber-700 border-amber-500 text-white'
                          : v === 'proficient'
                            ? 'bg-emerald-800 border-emerald-600 text-white'
                            : 'bg-gray-700 border-gray-600 text-gray-300')
                      : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-500'
                  }`}>{lab}</button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export { SkillTriState };
