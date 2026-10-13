import React from 'react';
import { HIT_DIE_TYPES, normalizeHitDicePool, formatHitDiceFormula } from '../utils/classes.js';

// Hit dice, as rows rather than a sentence.
//
// This used to be one text box holding "5d8+10". Nothing could count it: the
// rest trackers on the desktop sheet, the stat block and the player's phone
// all need to know HOW MANY dice of WHICH type there are so they can draw a
// box per die, and a hand-typed string gave them nothing to work with. Each
// row here is one die type — the second row is what a multiclass character
// needs — and the flat bonus keeps a monster's "6d10 + 12" intact.
//
// `pool` is the explicit list stored on the creature. When it is empty a
// player character shows `derived` instead (class + multiclass levels), and
// the first edit materialises those rows so the character can differ from the
// class table without losing what was already there.
export default function HitDiceEditor({
  pool,
  bonus = 0,
  derived = [],
  isPlayerCharacter = false,
  onChange,          // ({ pool, bonus }) => void
  labelClass = '',
  compact = false,
}) {
  const explicit = normalizeHitDicePool(pool);
  const isAuto = explicit.length === 0 && derived.length > 0;
  const rows = explicit.length
    ? explicit
    : derived.map((d) => ({ die: d.type || d.die, qty: d.qty }));

  const emit = (nextRows, nextBonus = bonus) => {
    onChange({
      pool: normalizeHitDicePool(nextRows),
      bonus: Math.trunc(Number(nextBonus) || 0),
    });
  };

  const setRow = (index, patch) => {
    emit(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  const addRow = () => {
    // Default to a die the character doesn't already have, so adding a second
    // row for a multiclass doesn't silently merge into the first.
    const taken = new Set(rows.map((r) => r.die));
    const nextDie = HIT_DIE_TYPES.find((d) => !taken.has(d)) || 'd8';
    emit([...rows, { die: nextDie, qty: 1 }]);
  };

  const removeRow = (index) => emit(rows.filter((_, i) => i !== index));

  const formula = formatHitDiceFormula(rows, bonus);

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <label className={labelClass}>Hit Dice</label>
        {isAuto && (
          <span className="text-[10px] text-gray-500">
            {isPlayerCharacter ? 'Auto from class + multiclasses' : 'Read from the stat block formula'}
          </span>
        )}
      </div>

      <div className="space-y-1.5">
        {rows.length === 0 && (
          <p className="text-[11px] text-gray-500 italic">
            No hit dice yet — add a die type below.
          </p>
        )}
        {rows.map((row, i) => (
          <div key={`${row.die}-${i}`} className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={99}
              value={row.qty}
              onChange={(e) => setRow(i, { qty: Math.max(1, parseInt(e.target.value) || 1) })}
              className="w-16 bg-gray-900 border border-gray-600 rounded px-2 py-1.5 text-sm text-gray-100"
            />
            <select
              value={row.die}
              onChange={(e) => setRow(i, { die: e.target.value })}
              className="bg-gray-900 border border-gray-600 rounded px-2 py-1.5 text-sm text-gray-100"
            >
              {HIT_DIE_TYPES.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <button
              type="button"
              onClick={() => removeRow(i)}
              title="Remove this die type"
              className="text-gray-500 hover:text-red-400 px-1.5 text-sm"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={addRow}
          className="text-[11px] bg-gray-800 hover:bg-gray-700 border border-gray-600 text-gray-200 px-2 py-1 rounded"
        >
          + Add die type
        </button>
        <label className="flex items-center gap-1.5 text-[11px] text-gray-400">
          Bonus
          <input
            type="number"
            value={bonus || 0}
            onChange={(e) => emit(rows, e.target.value)}
            title="Flat modifier on the hit-dice formula — a monster's CON contribution"
            className="w-16 bg-gray-900 border border-gray-600 rounded px-2 py-1 text-sm text-gray-100"
          />
        </label>
        {!isAuto && isPlayerCharacter && derived.length > 0 && (
          <button
            type="button"
            onClick={() => emit([], bonus)}
            className="text-[11px] text-gray-400 hover:text-gray-200 underline decoration-dotted"
          >
            Back to class default
          </button>
        )}
      </div>

      {!compact && (
        <p className="text-[11px] text-gray-500 font-mono">{formula || '—'}</p>
      )}
    </div>
  );
}
