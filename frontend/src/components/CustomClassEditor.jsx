// CustomClassEditor — modal for GM-authored classes.
// Persists to /api/custom/classes.
//
// Mirrors the SRD CLASS_BUILD shape so the saved record slots
// straight into the existing class-kit machinery (auto-applied
// saves / armor / weapons, multiclass prereq + grants, starting
// equipment options). Adds two homebrew-only fields on top:
//   * features  — per-level entries the GM lists out, optionally
//                 scoped to a subclass; surface in Class Features
//                 once the character reaches that level.
//   * resources — per-class counters (Bardic Inspiration / Ki /
//                 etc.) that can be SPENT or GRANTED to another
//                 player. Spend just rolls + decrements; grant
//                 routes through the existing inspiration_die flow.

import React, { useState } from 'react';
import LanguagePicker from './LanguagePicker.jsx';

const INPUT = 'w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white';
const SMALL = 'bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white';
const ABILITIES = ['STR','DEX','CON','INT','WIS','CHA'];
const ABILITY_NAMES = {
  STR: 'Strength', DEX: 'Dexterity', CON: 'Constitution',
  INT: 'Intelligence', WIS: 'Wisdom', CHA: 'Charisma',
};
const HIT_DICE = ['d6','d8','d10','d12'];
const ARMOR_TYPES = ['Light','Medium','Heavy','Shields'];
const WEAPON_PROFS = ['Simple','Martial'];
const REST_TYPES = [
  { id: 'short', label: 'Short Rest' },
  { id: 'long',  label: 'Long Rest' },
];
const ACTION_TYPES = [
  { id: 'spend', label: 'Spend (consume one)' },
  { id: 'grant', label: 'Grant (give to another player)' },
];

function emptyClass() {
  return {
    description: '',
    primary: { abilities: ['STR'], mode: 'all' },
    hitDie: 'd8',
    saves: ['STR', 'CON'],
    armor: ['Light'],
    weapons: ['Simple'],
    startingEquipment: {
      optionA: { items: [], gp: 0 },
      optionB: { gp: 50 },
    },
    multiclass: {
      prereq: { abilities: ['STR'], min: 13, mode: 'all' },
      grants: { armor: [], weapons: [], tools: [] },
    },
    subclasses: [],
    features:   [],
    resources:  [],
    grantsLanguages: [],
  };
}

export default function CustomClassEditor({ initial, onClose, onSaved }) {
  const [data, setData] = useState(() => initial ? merge(emptyClass(), initial) : emptyClass());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function patch(p)        { setData((d) => ({ ...d, ...p })); }
  function patchAt(key, p) { setData((d) => ({ ...d, [key]: { ...(d[key] || {}), ...p } })); }

  async function save() {
    const name = (data.name || initial?.name || '').trim();
    if (!name) { setError('Name required'); return; }
    setSubmitting(true); setError('');
    try {
      const url = initial?.id ? `/api/custom/classes/${initial.id}` : '/api/custom/classes';
      const method = initial?.id ? 'PUT' : 'POST';
      // The DB row stores `name` separately + everything else under
      // `data`. Strip name out of the body's data field so we don't
      // duplicate it on disk.
      const { name: _, id: __, ...payloadData } = data;
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, data: payloadData }),
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
            {initial?.id ? 'Edit' : 'New'} Class
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200 text-xl leading-none">×</button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-3">
          <Field label="Name *">
            <input className={INPUT} value={data.name || initial?.name || ''}
              onChange={(e) => patch({ name: e.target.value })} />
          </Field>

          <Field label="Description">
            <textarea className={INPUT} rows={2} value={data.description || ''}
              onChange={(e) => patch({ description: e.target.value })} />
          </Field>

          <Section>Core Traits</Section>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Hit Die">
              <select className={INPUT} value={data.hitDie}
                onChange={(e) => patch({ hitDie: e.target.value })}>
                {HIT_DICE.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </Field>
            <Field label="Primary Ability mode">
              <select className={INPUT} value={data.primary.mode}
                onChange={(e) => patchAt('primary', { mode: e.target.value })}>
                <option value="all">all of (single ability or e.g. Paladin's STR + CHA)</option>
                <option value="any">any of (e.g. Fighter's STR or DEX)</option>
              </select>
            </Field>
          </div>

          <Field label="Primary Abilities">
            <AbilityChips selected={data.primary.abilities}
              onChange={(arr) => patchAt('primary', { abilities: arr })} />
          </Field>

          <Field label="Saving Throw Proficiencies (typically 2)">
            <AbilityChips selected={data.saves}
              onChange={(arr) => patch({ saves: arr })} />
          </Field>

          <Field label="Armor Training">
            <CheckChips items={ARMOR_TYPES} selected={data.armor}
              onChange={(arr) => patch({ armor: arr })} />
          </Field>

          <Field label="Weapons">
            <CheckChips items={WEAPON_PROFS} selected={data.weapons}
              onChange={(arr) => patch({ weapons: arr })} />
            <p className="text-[10px] text-gray-500 mt-1">
              Add bespoke weapons (e.g. "Martial (Light)") with the + button.
            </p>
            <FreeChips selected={data.weapons.filter((w) => !WEAPON_PROFS.includes(w))}
              onChange={(custom) => patch({ weapons: [...data.weapons.filter((w) => WEAPON_PROFS.includes(w)), ...custom] })}
              placeholder="Custom weapon group" />
          </Field>

          <Section>Starting Equipment</Section>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-800/40 border border-gray-700 rounded p-2 space-y-1">
              <div className="text-xs text-gray-400 font-semibold">Option A — Bundle</div>
              <ItemList items={data.startingEquipment.optionA.items}
                onChange={(items) => patchAt('startingEquipment', {
                  optionA: { ...data.startingEquipment.optionA, items }
                })} />
              <Field label="+ gp">
                <input type="number" min={0} className={SMALL + ' w-20'}
                  value={data.startingEquipment.optionA.gp}
                  onChange={(e) => patchAt('startingEquipment', {
                    optionA: { ...data.startingEquipment.optionA, gp: parseInt(e.target.value) || 0 }
                  })} />
              </Field>
            </div>
            <div className="bg-gray-800/40 border border-gray-700 rounded p-2 space-y-1">
              <div className="text-xs text-gray-400 font-semibold">Option B — Flat gp</div>
              <Field label="gp">
                <input type="number" min={0} className={SMALL + ' w-24'}
                  value={data.startingEquipment.optionB.gp}
                  onChange={(e) => patchAt('startingEquipment', {
                    optionB: { gp: parseInt(e.target.value) || 0 }
                  })} />
              </Field>
            </div>
          </div>

          <Section>Multiclass</Section>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Prereq mode">
              <select className={INPUT} value={data.multiclass.prereq.mode}
                onChange={(e) => patchAt('multiclass', {
                  prereq: { ...data.multiclass.prereq, mode: e.target.value }
                })}>
                <option value="all">all of</option>
                <option value="any">any of</option>
              </select>
            </Field>
            <Field label="Min score">
              <input type="number" min={1} max={30} className={SMALL + ' w-20'}
                value={data.multiclass.prereq.min}
                onChange={(e) => patchAt('multiclass', {
                  prereq: { ...data.multiclass.prereq, min: parseInt(e.target.value) || 13 }
                })} />
            </Field>
          </div>
          <Field label="Prereq abilities">
            <AbilityChips selected={data.multiclass.prereq.abilities}
              onChange={(arr) => patchAt('multiclass', {
                prereq: { ...data.multiclass.prereq, abilities: arr }
              })} />
          </Field>
          <Field label="Grants on multiclass — Armor">
            <CheckChips items={ARMOR_TYPES} selected={data.multiclass.grants.armor || []}
              onChange={(arr) => patchAt('multiclass', {
                grants: { ...data.multiclass.grants, armor: arr }
              })} />
          </Field>
          <Field label="Grants on multiclass — Weapons">
            <CheckChips items={WEAPON_PROFS} selected={data.multiclass.grants.weapons || []}
              onChange={(arr) => patchAt('multiclass', {
                grants: { ...data.multiclass.grants, weapons: arr }
              })} />
          </Field>

          <Section>Languages Granted</Section>
          <p className="text-[11px] text-gray-500 -mt-2">
            Languages auto-added at level 1, the same way Druids learn Druidic. New entries land in the shared /api/languages registry so other characters and NPC chat see them too. Empty = the class grants no languages.
          </p>
          <LanguagePicker
            value={Array.isArray(data.grantsLanguages) ? data.grantsLanguages.join(', ') : (data.grantsLanguages || '')}
            onChange={(csv) => patch({
              grantsLanguages: String(csv || '')
                .split(/\s*,\s*/)
                .map((s) => s.trim())
                .filter(Boolean),
            })} />

          <Section>Subclasses</Section>
          <FreeChips selected={data.subclasses}
            onChange={(arr) => patch({ subclasses: arr })}
            placeholder="Subclass name (e.g. Path of the Storm)" />

          <Section>Class Features by Level</Section>
          <p className="text-[11px] text-gray-500 -mt-2">
            Listed per level + optional subclass scope. Surface in the Class Features stat block when the player reaches the level on that class.
          </p>
          <FeatureList features={data.features} subclasses={data.subclasses}
            onChange={(arr) => patch({ features: arr })} />

          <Section>Custom Resources</Section>
          <p className="text-[11px] text-gray-500 -mt-2">
            Counters with a name + scaling formula + reset cadence. Spend = consume one (rolls the die if set). Grant = pick a player to receive it (Bardic-Inspiration-style — uses the recipient's inspiration_die slot).
          </p>
          <ResourceList resources={data.resources}
            onChange={(arr) => patch({ resources: arr })} />

          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 px-4 py-2 border-t border-gray-700">
          <button onClick={onClose} className="text-xs text-gray-400 hover:text-gray-200 px-3 py-1.5">Cancel</button>
          <button onClick={save} disabled={submitting}
            className="text-xs bg-purple-700 hover:bg-purple-600 disabled:bg-gray-700 text-white px-3 py-1.5 rounded">
            {submitting ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Deep-merge for editing existing rows. Keeps nested defaults from
// emptyClass() so a saved row missing a newer field doesn't blow up
// the editor.
function merge(base, over) {
  if (typeof over !== 'object' || over === null || Array.isArray(over)) return over ?? base;
  const out = Array.isArray(base) ? [] : { ...base };
  for (const k of Object.keys(over)) {
    out[k] = (k in base) ? merge(base[k], over[k]) : over[k];
  }
  return out;
}

function Section({ children }) {
  return <h4 className="text-sm font-semibold text-purple-300 pt-2 mt-2 border-t border-gray-800">{children}</h4>;
}

function Field({ label, children }) {
  return (
    <div>
      <label className="text-[11px] text-gray-400 block mb-0.5">{label}</label>
      {children}
    </div>
  );
}

function AbilityChips({ selected, onChange }) {
  const set = new Set(selected);
  function toggle(a) {
    const next = new Set(set);
    if (next.has(a)) next.delete(a); else next.add(a);
    onChange(ABILITIES.filter((x) => next.has(x)));
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {ABILITIES.map((a) => {
        const on = set.has(a);
        return (
          <button key={a} type="button" onClick={() => toggle(a)}
            title={ABILITY_NAMES[a]}
            className={`text-xs px-2 py-1 rounded border ${
              on ? 'bg-purple-800 border-purple-500 text-white'
                 : 'bg-gray-900 border-gray-700 text-gray-400 hover:bg-gray-800'
            }`}>{a}</button>
        );
      })}
    </div>
  );
}

function CheckChips({ items, selected, onChange }) {
  const set = new Set(selected);
  function toggle(a) {
    const next = new Set(set);
    if (next.has(a)) next.delete(a); else next.add(a);
    // Preserve any pre-existing custom values not in `items`.
    onChange([...selected.filter((x) => !items.includes(x)), ...items.filter((x) => next.has(x))]);
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((a) => {
        const on = set.has(a);
        return (
          <button key={a} type="button" onClick={() => toggle(a)}
            className={`text-xs px-2 py-1 rounded border ${
              on ? 'bg-purple-800 border-purple-500 text-white'
                 : 'bg-gray-900 border-gray-700 text-gray-400 hover:bg-gray-800'
            }`}>{a}</button>
        );
      })}
    </div>
  );
}

function FreeChips({ selected, onChange, placeholder }) {
  const [draft, setDraft] = useState('');
  function add() {
    const v = draft.trim();
    if (!v) return;
    if (selected.some((x) => x.toLowerCase() === v.toLowerCase())) { setDraft(''); return; }
    onChange([...selected, v]);
    setDraft('');
  }
  return (
    <div>
      <div className="flex flex-wrap gap-1 mb-1">
        {selected.map((s, i) => (
          <span key={i} className="text-xs bg-gray-800 border border-gray-600 rounded px-2 py-0.5 flex items-center gap-1">
            {s}
            <button type="button" onClick={() => onChange(selected.filter((_, j) => j !== i))}
              className="text-red-400 hover:text-red-200">×</button>
          </span>
        ))}
      </div>
      <div className="flex gap-1">
        <input className={INPUT} placeholder={placeholder} value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} />
        <button type="button" onClick={add}
          className="text-xs bg-gray-800 border border-gray-600 hover:bg-gray-700 px-2 rounded">+</button>
      </div>
    </div>
  );
}

function ItemList({ items, onChange }) {
  const list = items || [];
  return (
    <div className="space-y-1">
      {list.map((it, i) => (
        <div key={i} className="flex gap-2 items-center bg-gray-900/40 border border-gray-700 rounded p-1.5">
          <input className={INPUT + ' flex-1'} placeholder="Item name" value={it.name || ''}
            onChange={(e) => onChange(list.map((r, j) => (j === i ? { ...r, name: e.target.value } : r)))} />
          <input type="number" className="w-14 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white text-center"
            min={1} value={it.qty || 1}
            onChange={(e) => onChange(list.map((r, j) => (j === i ? { ...r, qty: parseInt(e.target.value) || 1 } : r)))} />
          <button type="button" onClick={() => onChange(list.filter((_, j) => j !== i))}
            className="text-red-400 hover:text-red-200 text-xs">×</button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...list, { name: '', qty: 1 }])}
        className="text-xs text-purple-300 hover:text-purple-100">+ add item</button>
    </div>
  );
}

function FeatureList({ features, subclasses, onChange }) {
  const list = features || [];
  function setIdx(i, p) {
    onChange(list.map((r, j) => (j === i ? { ...r, ...p } : r)));
  }
  return (
    <div className="space-y-2">
      {list
        .map((f, i) => ({ f, i }))
        .sort((a, b) => (a.f.at_level || 1) - (b.f.at_level || 1))
        .map(({ f, i }) => (
        <div key={i} className="bg-gray-800/40 border border-gray-700 rounded p-2 space-y-1">
          <div className="grid grid-cols-3 gap-2">
            <Field label="Level">
              <input type="number" min={1} max={20} className={SMALL}
                value={f.at_level || 1}
                onChange={(e) => setIdx(i, { at_level: Math.max(1, Math.min(20, parseInt(e.target.value) || 1)) })} />
            </Field>
            <Field label="Subclass scope">
              <select className={INPUT}
                value={f.subclass || ''}
                onChange={(e) => setIdx(i, { subclass: e.target.value })}>
                <option value="">All (base class)</option>
                {(subclasses || []).map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label=" ">
              <button type="button" onClick={() => onChange(list.filter((_, j) => j !== i))}
                className="text-xs text-red-300 hover:text-red-100">remove</button>
            </Field>
          </div>
          <Field label="Name">
            <input className={INPUT} value={f.name || ''}
              onChange={(e) => setIdx(i, { name: e.target.value })} />
          </Field>
          <Field label="Description">
            <textarea className={INPUT} rows={2} value={f.desc || ''}
              onChange={(e) => setIdx(i, { desc: e.target.value })} />
          </Field>
          <Field label="Grant spells at this level (typeahead — pulls from the GM spell library)">
            <SpellMultiPick
              picks={Array.isArray(f.spells) ? f.spells : []}
              onChange={(arr) => setIdx(i, { spells: arr })} />
          </Field>
        </div>
      ))}
      <button type="button"
        onClick={() => onChange([...list, { at_level: 1, name: '', desc: '', subclass: '', spells: [] }])}
        className="text-xs text-purple-300 hover:text-purple-100">+ add feature</button>
    </div>
  );
}

// Typeahead multi-picker backed by /api/spell-library. Caches the
// list once per editor mount so re-rendering features doesn't
// re-fetch. Picks are kept as plain spell names — the apply
// pipeline (frontend/src/components/CreatureForm.jsx) enriches by
// name from the spell library when a character takes the class so
// the granted spell lands with full stat block details.
function SpellMultiPick({ picks, onChange }) {
  const [draft, setDraft] = React.useState('');
  const [library, setLibrary] = React.useState(null);
  React.useEffect(() => {
    let cancelled = false;
    fetch('/api/spell-library')
      .then((r) => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then((rows) => { if (!cancelled) setLibrary(Array.isArray(rows) ? rows : []); })
      .catch(() => { if (!cancelled) setLibrary([]); });
    return () => { cancelled = true; };
  }, []);
  const lcDraft = draft.trim().toLowerCase();
  const lcPicks = new Set(picks.map((s) => String(s).toLowerCase()));
  const matches = (library || [])
    .filter((s) => s.name && s.name.toLowerCase().includes(lcDraft) && !lcPicks.has(s.name.toLowerCase()))
    .slice(0, 8);
  function add(name) {
    const v = String(name || '').trim();
    if (!v) return;
    if (lcPicks.has(v.toLowerCase())) { setDraft(''); return; }
    onChange([...picks, v]);
    setDraft('');
  }
  return (
    <div>
      <div className="flex flex-wrap gap-1 mb-1">
        {picks.map((s, i) => (
          <span key={i} className="text-xs bg-purple-900/30 border border-purple-700/50 rounded px-2 py-0.5 flex items-center gap-1">
            {s}
            <button type="button" onClick={() => onChange(picks.filter((_, j) => j !== i))}
              className="text-red-300 hover:text-red-100">×</button>
          </span>
        ))}
      </div>
      <div className="relative">
        <input className={INPUT} placeholder="Spell name…" value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              const exact = (library || []).find((s) =>
                s.name && s.name.toLowerCase() === lcDraft
              );
              add(exact ? exact.name : draft);
            }
          }} />
        {lcDraft && matches.length > 0 && (
          <div className="absolute left-0 right-0 mt-1 z-10 bg-gray-900 border border-gray-700 rounded max-h-44 overflow-y-auto">
            {matches.map((s) => (
              <button key={s.id} type="button" onClick={() => add(s.name)}
                className="w-full text-left text-xs text-gray-200 hover:bg-purple-900/40 px-2 py-1">
                {s.name}
                <span className="text-[10px] text-gray-500 ml-2">
                  Lvl {s.level}{s.school ? ` · ${s.school}` : ''}{s.edition ? ` · ${s.edition}` : ''}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ResourceList({ resources, onChange }) {
  const list = resources || [];
  function setIdx(i, p) {
    onChange(list.map((r, j) => (j === i ? { ...r, ...p } : r)));
  }
  return (
    <div className="space-y-2">
      {list.map((r, i) => (
        <div key={i} className="bg-gray-800/40 border border-gray-700 rounded p-2 space-y-1">
          <div className="grid grid-cols-2 gap-2">
            <Field label="Display name">
              <input className={INPUT} placeholder="e.g. Storm Surge"
                value={r.label || ''}
                onChange={(e) => setIdx(i, { label: e.target.value, id: r.id || slug(e.target.value) })} />
            </Field>
            <Field label="Action">
              <select className={INPUT} value={r.action || 'spend'}
                onChange={(e) => setIdx(i, { action: e.target.value })}>
                {ACTION_TYPES.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Field label="Total formula">
              <input className={INPUT} placeholder="e.g. CHA, level, level/2" value={r.total_formula || ''}
                onChange={(e) => setIdx(i, { total_formula: e.target.value })} />
            </Field>
            <Field label="Resets on">
              <select className={INPUT} value={r.rest || 'long'}
                onChange={(e) => setIdx(i, { rest: e.target.value })}>
                {REST_TYPES.map((rt) => <option key={rt.id} value={rt.id}>{rt.label}</option>)}
              </select>
            </Field>
            <Field label="Die (optional)">
              <select className={INPUT} value={r.die || ''}
                onChange={(e) => setIdx(i, { die: e.target.value })}>
                <option value="">— no die —</option>
                {['d4','d6','d8','d10','d12','d20'].map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Note (shown to the player)">
            <input className={INPUT} value={r.note || ''}
              onChange={(e) => setIdx(i, { note: e.target.value })} />
          </Field>
          <div className="flex justify-end">
            <button type="button" onClick={() => onChange(list.filter((_, j) => j !== i))}
              className="text-xs text-red-300 hover:text-red-100">remove resource</button>
          </div>
        </div>
      ))}
      <button type="button"
        onClick={() => onChange([...list, { id: '', label: '', action: 'spend', rest: 'long', total_formula: '1', die: '', note: '' }])}
        className="text-xs text-purple-300 hover:text-purple-100">+ add resource</button>
    </div>
  );
}

function slug(s) {
  return String(s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'res';
}
