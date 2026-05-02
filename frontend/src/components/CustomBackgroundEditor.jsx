// CustomBackgroundEditor — modal for DM-authored backgrounds.
// Persists to /api/custom/backgrounds.
//
// Mirrors the SRD background shape (frontend/src/data/backgrounds.js)
// plus an expertise option per skill so a homebrew background can
// grant Expertise without forcing the player to also pick that skill
// from their class list.

import React, { useState } from 'react';
import { SkillTriState } from './CustomRaceEditor.jsx';

const STAT_LIST = [
  ['strength', 'STR'], ['dexterity', 'DEX'], ['constitution', 'CON'],
  ['intelligence', 'INT'], ['wisdom', 'WIS'], ['charisma', 'CHA'],
];

function emptyBackground() {
  return {
    name: '',
    description: '',
    abilities: ['strength', 'dexterity', 'constitution'],
    feat: { name: '', desc: '' },
    skills: [],          // [{ skill, level: 'proficient' | 'expertise' }]
    tool: '',
    equipment_a_items: [],
    equipment_a_gp: 0,
    equipment_b_gp: 50,
  };
}

export default function CustomBackgroundEditor({ initial, onClose, onSaved }) {
  const [data, setData] = useState(() => initial ? { ...emptyBackground(), ...initial } : emptyBackground());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function patch(p) { setData((d) => ({ ...d, ...p })); }
  function patchFeat(p) { setData((d) => ({ ...d, feat: { ...d.feat, ...p } })); }

  async function save() {
    if (!data.name.trim()) { setError('Name required'); return; }
    setSubmitting(true); setError('');
    try {
      const url = initial?.id ? `/api/custom/backgrounds/${initial.id}` : '/api/custom/backgrounds';
      const method = initial?.id ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: data.name, data }),
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
        className="bg-gray-900 border border-amber-700 rounded-lg w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700">
          <h3 className="text-amber-300 font-semibold">
            {initial?.id ? 'Edit' : 'New'} Background
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200 text-xl leading-none">×</button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-3">
          <div>
            <label className="text-[11px] text-gray-400 block mb-0.5">Name *</label>
            <input className={INPUT} value={data.name}
              onChange={(e) => patch({ name: e.target.value })} />
          </div>

          <div>
            <label className="text-[11px] text-gray-400 block mb-0.5">Description</label>
            <textarea className={INPUT} rows={3} value={data.description}
              onChange={(e) => patch({ description: e.target.value })} />
          </div>

          <Section>Ability Scores (player chooses +2/+1 or +1/+1/+1 across these three)</Section>
          <div className="grid grid-cols-3 gap-2">
            {[0, 1, 2].map((slot) => (
              <select key={slot} className={INPUT}
                value={data.abilities[slot] || 'strength'}
                onChange={(e) => {
                  const next = [...data.abilities];
                  next[slot] = e.target.value;
                  patch({ abilities: next });
                }}>
                {STAT_LIST.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            ))}
          </div>

          <Section>Origin Feat</Section>
          <div className="grid grid-cols-1 gap-2">
            <input className={INPUT} placeholder="Feat name (e.g. Magic Initiate (Cleric))"
              value={data.feat?.name || ''}
              onChange={(e) => patchFeat({ name: e.target.value })} />
            <textarea className={INPUT} rows={3}
              placeholder="Feat description"
              value={data.feat?.desc || ''}
              onChange={(e) => patchFeat({ desc: e.target.value })} />
          </div>

          <Section>Skill Proficiencies (homebrew may grant expertise)</Section>
          <SkillTriState value={data.skills} onChange={(arr) => patch({ skills: arr })} />

          <Section>Tool Proficiency</Section>
          <input className={INPUT} placeholder="e.g. Thieves' Tools"
            value={data.tool || ''} onChange={(e) => patch({ tool: e.target.value })} />

          <Section>Starting Equipment Package A</Section>
          <ItemList items={data.equipment_a_items}
            onChange={(arr) => patch({ equipment_a_items: arr })} />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] text-gray-400 block mb-0.5">Package A bonus GP</label>
              <input type="number" className={INPUT} min={0}
                value={data.equipment_a_gp || 0}
                onChange={(e) => patch({ equipment_a_gp: parseInt(e.target.value) || 0 })} />
            </div>
            <div>
              <label className="text-[11px] text-gray-400 block mb-0.5">Package B GP</label>
              <input type="number" className={INPUT} min={0}
                value={data.equipment_b_gp || 0}
                onChange={(e) => patch({ equipment_b_gp: parseInt(e.target.value) || 0 })} />
            </div>
          </div>
        </div>

        {error && <div className="px-4 py-2 text-xs text-red-300 bg-red-900/30 border-t border-red-700">{error}</div>}

        <div className="flex items-center justify-end gap-2 px-4 py-2 border-t border-gray-700">
          <button onClick={onClose}
            className="text-xs text-gray-400 hover:text-gray-200 px-3 py-1.5">Cancel</button>
          <button onClick={save} disabled={submitting}
            className="text-xs bg-amber-700 hover:bg-amber-600 disabled:bg-gray-700 text-white px-3 py-1.5 rounded">
            {submitting ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

const INPUT = 'w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white';
function Section({ children }) {
  return <h4 className="text-xs uppercase tracking-wider text-amber-300 pt-1 border-t border-gray-800">{children}</h4>;
}
function ItemList({ items, onChange }) {
  const list = items || [];
  return (
    <div className="space-y-1">
      {list.map((it, i) => (
        <div key={i} className="flex gap-2 items-center bg-gray-800/40 border border-gray-700 rounded p-1.5">
          <input className={INPUT + ' flex-1'} placeholder="Item name"
            value={it.name || ''}
            onChange={(e) => onChange(list.map((r, j) => (j === i ? { ...r, name: e.target.value } : r)))} />
          <input type="number" className="w-16 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white text-center"
            min={1} value={it.qty || 1}
            onChange={(e) => onChange(list.map((r, j) => (j === i ? { ...r, qty: parseInt(e.target.value) || 1 } : r)))} />
          <button type="button" onClick={() => onChange(list.filter((_, j) => j !== i))}
            className="text-red-400 hover:text-red-200 text-xs">remove</button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...list, { name: '', qty: 1 }])}
        className="text-xs text-amber-300 hover:text-amber-100">+ add item</button>
    </div>
  );
}
