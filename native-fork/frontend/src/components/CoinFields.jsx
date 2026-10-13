import React from 'react';
import { coinsToCp, formatCp } from '../utils/coins.js';

// Three boxes — gold, silver, copper — wherever a price is typed.
//
// It replaced a single free-text box that parsed "15", "2gp 5sp" or "15gp" and
// treated a bare number as gold. That guess was the problem: a GM typing 15
// next to a dagger and meaning silver got a dagger worth 15 gold, and nothing
// on screen said which reading it had taken. Three boxes cannot be misread, by
// the person typing or by the person paying.
//
// The value is always `{ gp, sp, cp }` of STRINGS, so a box can be empty rather
// than forced to 0; `coinsToCp` turns it into the copper the wire carries.

const DENOMS = [
  ['gp', 'gold', 'text-dnd-gold'],
  ['sp', 'silver', 'text-gray-300'],
  ['cp', 'copper', 'text-amber-700'],
];

export default function CoinFields({
  value,                    // { gp, sp, cp } as strings
  onChange,
  label,                    // optional heading above the row
  hint,                     // optional line under it; the total is appended
  disabled = false,
  showTotal = true,
  size = 'md',              // 'sm' on the phone, where three boxes share a row
  autoFocusFirst = false,
}) {
  const coins = value || { gp: '', sp: '', cp: '' };
  const total = coinsToCp(coins);

  // Digits only. A minus sign or a decimal point in a coin box is not a price
  // anyone meant to type, and silently coercing it is how a 2.5gp listing
  // becomes a 2gp one without saying so.
  const set = (k) => (e) => {
    const raw = e.target.value.replace(/[^\d]/g, '').slice(0, 7);
    onChange?.({ ...coins, [k]: raw });
  };

  const box = size === 'sm'
    ? 'w-full bg-gray-900 border border-gray-700 rounded-lg pl-2 pr-7 py-2 text-sm text-gray-100 tabular-nums'
    : 'w-full bg-gray-900 border border-gray-700 rounded-lg pl-2.5 pr-8 py-2 text-sm text-gray-100 tabular-nums';

  return (
    <div className="space-y-1">
      {label && <span className="block text-[11px] text-gray-400">{label}</span>}
      <div className="grid grid-cols-3 gap-1.5">
        {DENOMS.map(([k, full, tone], i) => (
          <div key={k} className="relative">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={coins[k] ?? ''}
              onChange={set(k)}
              disabled={disabled}
              autoFocus={autoFocusFirst && i === 0}
              aria-label={full}
              placeholder="0"
              className={`${box} disabled:opacity-40`}
            />
            {/* The denomination sits inside the box rather than above it: a
                label above a number is read as a heading, and these three
                numbers are read as one amount. */}
            <span className={`absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-semibold
                              pointer-events-none ${tone}`}>{k}</span>
          </div>
        ))}
      </div>
      {(hint || showTotal) && (
        <p className="text-[11px] text-gray-500">
          {hint}
          {hint && showTotal && ' · '}
          {showTotal && (total > 0 ? <>that is <b className="text-gray-300">{formatCp(total)}</b></> : 'nothing yet')}
        </p>
      )}
    </div>
  );
}
