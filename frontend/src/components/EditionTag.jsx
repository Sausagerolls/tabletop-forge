import React from 'react';

// Which ruleset a library row came from, as a badge.
//
// The libraries hold both printings of most things, and two printings of one
// name look exactly like a list that has gone wrong: a GM scrolling past
// "Fireball, Fireball" or "Cure Wounds, Cure Wounds" has no way to tell a
// duplicate from a choice. The edition is the difference, so it is the thing
// shown — small, next to the name, in every list that can hold both.
//
// `manual` is anything the GM wrote or scanned themselves. It carries no
// edition, and saying "2014" for a homebrew spell would be a guess, so it says
// what it is instead.
export default function EditionTag({ edition, source, className = '' }) {
  const ed = String(edition || '').trim();
  const isManual = !ed || !['2014', '2024'].includes(ed);

  const tone = isManual
    ? 'bg-gray-700/60 border-gray-600 text-gray-300'
    : ed === '2024'
      ? 'bg-sky-900/50 border-sky-700/70 text-sky-200'
      : 'bg-amber-900/40 border-amber-800/70 text-amber-200/90';

  const label = isManual ? 'Yours' : ed;

  return (
    <span
      // The source answers the obvious next question — which book, or which
      // PDF — without spending a line of the row on it.
      title={source ? `${label} · ${source}` : label}
      className={`shrink-0 px-1.5 py-0.5 rounded border text-[9px] font-semibold leading-none
                  tracking-wide ${tone} ${className}`}
    >
      {label}
    </span>
  );
}
