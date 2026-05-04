// MulticlassRow — one extra class on top of the primary char_class.
// Each row carries its own class / subclass / level + a nested
// ClassChoicesPicker (Cleric Divine Order, Fighter Weapon Mastery,
// etc.) scoped to that class. Apply/remove tag rows with
// "cls:mc:<row.id>:..." so a swap on this row doesn't disturb the
// primary or any other multiclass slot.

import React, { useEffect } from 'react';
import { useAllSubclasses, useClassChoices } from '../utils/classes.js';
import ClassChoicesPicker from './ClassChoicesPicker.jsx';

export default function MulticlassRow({
  mc,                       // { id, class, subclass, level, class_state }
  allClasses,
  disabledClasses,          // Set<string> of class names taken by primary + other rows (not this row)
  proficientSkills,
  weaponProficiencies,
  onChange,                 // (patch) => void  — partial update for this row
  onRemove,                 // () => void      — drop the row + revert its tags
  onApplyChoices,           // (choices, picks) => void
  onRemoveChoices,          // () => void
}) {
  const taken = disabledClasses instanceof Set ? disabledClasses : new Set();
  const subs = useAllSubclasses(mc.class);
  const choices = useClassChoices(mc.class);

  // Auto-grant choices for this row apply the moment the class is set.
  useEffect(() => {
    if (!mc.class) return;
    const auto = (choices || []).filter((c) => c.kind === 'auto');
    if (auto.length === 0) return;
    const already = mc.class_state?.class_id === mc.class
      && (mc.class_state.added?.spells || []).length > 0;
    if (already) return;
    onApplyChoices(choices, mc.class_state?.choices || {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mc.class, choices.length]);

  return (
    <div className="bg-gray-900/40 border border-gray-700 rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wider text-purple-300">Multiclass</div>
        <button type="button" onClick={onRemove}
          className="text-[10px] bg-red-900/40 hover:bg-red-800/60 border border-red-700 text-red-200 px-2 py-1 rounded">
          Remove class
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-[11px] text-gray-400 block mb-0.5">Class</label>
          <select
            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white"
            value={mc.class || ''}
            onChange={(e) => {
              // Clear subclass when class changes.
              onChange({ class: e.target.value, subclass: '' });
            }}>
            <option value="">— Select —</option>
            {allClasses.map((c) => (
              <option key={c} value={c}
                disabled={taken.has(c.toLowerCase()) && c !== mc.class}>
                {c}{taken.has(c.toLowerCase()) && c !== mc.class ? ' (taken)' : ''}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[11px] text-gray-400 block mb-0.5">Subclass</label>
          <select
            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white"
            value={mc.subclass || ''}
            onChange={(e) => onChange({ subclass: e.target.value })}
            disabled={!mc.class || subs.length === 0}>
            <option value="">
              {!mc.class ? '— pick class —' : subs.length === 0 ? '— none —' : '— Select —'}
            </option>
            {subs.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[11px] text-gray-400 block mb-0.5">Level</label>
          <input type="number" min={1} max={20}
            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white"
            value={mc.level ?? 1}
            onChange={(e) => {
              const v = parseInt(e.target.value);
              onChange({ level: isNaN(v) ? 1 : Math.max(1, Math.min(20, v)) });
            }} />
        </div>
      </div>

      <ClassChoicesPicker
        charClass={mc.class}
        charLevel={mc.level}
        choices={choices}
        classState={mc.class_state}
        proficientSkills={proficientSkills}
        weaponProficiencies={weaponProficiencies}
        onApply={(picks) => onApplyChoices(choices, picks)}
        onRemove={onRemoveChoices}
      />
    </div>
  );
}
