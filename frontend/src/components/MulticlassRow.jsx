// MulticlassRow — one extra class on top of the primary char_class.
// Each row carries its own class / subclass / level + a nested
// ClassChoicesPicker (Cleric Divine Order, Fighter Weapon Mastery,
// etc.) scoped to that class. Apply/remove tag rows with
// "cls:mc:<row.id>:..." so a swap on this row doesn't disturb the
// primary or any other multiclass slot.

import React, { useEffect } from 'react';
import { useAllSubclasses, useClassChoices } from '../utils/classes.js';
import { meetsMulticlassPrereq, multiclassPrereqExplanation } from '../data/class_build.js';
import ClassChoicesPicker from './ClassChoicesPicker.jsx';

export default function MulticlassRow({
  mc,                       // { id, class, subclass, level, class_state }
  allClasses,
  disabledClasses,          // Set<string> of class names taken by primary + other rows (not this row)
  proficientSkills,
  weaponProficiencies,
  creature,                 // current sheet — used for the multiclass ability prereq check
  primaryClassName,         // primary char_class — its prereq must also pass to multiclass anywhere
  onChange,                 // (patch) => void  — partial update for this row
  onRemove,                 // () => void      — drop the row + revert its tags
  onApplyChoices,           // (choices, picks) => void
  onRemoveChoices,          // () => void
}) {
  const taken = disabledClasses instanceof Set ? disabledClasses : new Set();
  const subs = useAllSubclasses(mc.class);
  const choices = useClassChoices(mc.class, { multiclass: true, subclass: mc.subclass });

  // Auto-grant choices for this row apply on class set, subclass
  // change, or level change so newly unlocked features (custom or
  // SRD) land and removed ones revert. Filtered by at_level
  // against the slot's level so a level-5 feature doesn't appear
  // on a level-3 slot.
  useEffect(() => {
    if (!mc.class) return;
    const lvl = Math.max(1, Number(mc.level) || 1);
    const auto = (choices || []).filter((c) =>
      c.kind === 'auto' && (c.at_level || 1) <= lvl
    );
    // Same reasoning as the primary-class effect: prior contributions
    // mean we must still run so a level-down strips them.
    const priorAdded = mc.class_state?.added || {};
    const hasPrior = (priorAdded.spells    || []).length > 0
      || (priorAdded.armor     || []).length > 0
      || (priorAdded.weapons   || []).length > 0
      || (priorAdded.languages || []).length > 0
      || (priorAdded.traits_count || 0) > 0;
    if (auto.length === 0 && !hasPrior) return;
    const already = mc.class_state?.class_id === mc.class
      && (mc.class_state.subclass_id || '') === (mc.subclass || '')
      && (mc.class_state.applied_at_level || 0) === lvl
      && ((mc.class_state.added?.spells || []).length > 0
          || (mc.class_state.added?.armor  || []).length > 0
          || (mc.class_state.added?.weapons || []).length > 0
          || (mc.class_state.added?.traits_count || 0) > 0);
    if (already) return;
    onApplyChoices(choices, mc.class_state?.choices || {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mc.class, mc.subclass, mc.level, choices.length]);

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
            {allClasses.map((c) => {
              const isTaken = taken.has(c.toLowerCase()) && c !== mc.class;
              // Prereq check: the candidate must hit its own prereq AND
              // the primary class's prereq (per PHB 2024). Skips when
              // selecting the row's current value to keep it editable
              // even if scores have since dipped.
              const failsNew = !!creature
                && c !== mc.class
                && !meetsMulticlassPrereq(creature, c);
              const failsPrimary = !!creature && primaryClassName
                && c !== mc.class
                && !meetsMulticlassPrereq(creature, primaryClassName);
              const failsPrereq = failsNew || failsPrimary;
              const reason = isTaken
                ? ' (taken)'
                : failsNew  ? ' (prereq)'
                : failsPrimary ? ' (primary prereq)'
                : '';
              return (
                <option key={c} value={c}
                  disabled={isTaken || failsPrereq}>
                  {c}{reason}
                </option>
              );
            })}
          </select>
          {/* Inline reason when the chosen class fails its prereq —
              caused by a stat being lowered after the row was added,
              or by the player editing scores while the row was
              already on the sheet. */}
          {mc.class && creature && !meetsMulticlassPrereq(creature, mc.class) && (
            <p className="text-[11px] text-red-300 mt-1">
              {multiclassPrereqExplanation(creature, mc.class)}
            </p>
          )}
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
