import React, { useState } from 'react';

// What a search result IS, drawn rather than spelled.
//
// Every row used to wear a word — "Spell", "Spell", "Spell", "Item", "Rule" —
// which is the least useful thing on the line once you have read it twice. A
// shape is read at a glance and leaves the words for the name, and a creature
// can wear its own face instead of a label that says nothing about it.
//
// Everything here is inline SVG. The alternative is a sprite sheet or an icon
// font, and neither is worth a network request for fourteen small drawings
// that never change — these cost nothing and work offline, which the desktop
// build cares about.

const S = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' };

// ── The eight schools of magic ───────────────────────────────────────────────
//
// Each is the gesture the school is usually drawn with: a shield for the magic
// that stops things, a flame for the magic that breaks them, an eye for the
// magic that sees. They differ from each other at 20px, which is the only test
// that matters here.
const SCHOOL_ICONS = {
  Abjuration: <><path d="M12 3l7 3v5c0 4.4-2.9 7.7-7 9-4.1-1.3-7-4.6-7-9V6z" /></>,
  Conjuration: <><circle cx="12" cy="13" r="5" /><path d="M12 8V3M9 4.5L12 3l3 1.5" /></>,
  Divination: <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z" /><circle cx="12" cy="12" r="2.3" /></>,
  Enchantment: <><path d="M12 20s-7-4.2-7-9a4 4 0 017-2.6A4 4 0 0119 11c0 4.8-7 9-7 9z" /></>,
  Evocation: <><path d="M12 3c3 4 5 6 5 9a5 5 0 01-10 0c0-3 2-5 5-9z" /><path d="M12 19a2.5 2.5 0 002.5-3.5c0-1.4-1-2.3-2.5-4.5-1.5 2.2-2.5 3.1-2.5 4.5A2.5 2.5 0 0012 19z" /></>,
  Illusion: <><path d="M5 8c2 0 3-2 5-2s2 2 4 2 3-2 5-2" opacity=".55" /><path d="M5 13c2 0 3-2 5-2s2 2 4 2 3-2 5-2" /><path d="M5 18c2 0 3-2 5-2s2 2 4 2 3-2 5-2" opacity=".55" /></>,
  Necromancy: <><path d="M12 3a7 7 0 00-7 7c0 2.3 1.2 3.9 2.5 5V18h9v-3c1.3-1.1 2.5-2.7 2.5-5a7 7 0 00-7-7z" /><circle cx="9.5" cy="10.5" r="1.1" fill="currentColor" stroke="none" /><circle cx="14.5" cy="10.5" r="1.1" fill="currentColor" stroke="none" /><path d="M9 21h6" /></>,
  Transmutation: <><path d="M4 8h10a4 4 0 010 8H8" /><path d="M11 5l3 3-3 3" /><path d="M11 13l-3 3 3 3" /></>,
  Psionic: <><circle cx="12" cy="12" r="3" /><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" /></>,
};

// Healing is not a school — it is what a handful of spells DO — but it is the
// thing a player scanning a list most wants to pick out, so it wins over the
// school when the library has filed a spell that way.
const HEALING = <><path d="M12 5v14M5 12h14" /></>;

const ICONS = {
  spell: <><path d="M5 19l9-9M14 10l2.5-2.5a2.1 2.1 0 013 3L17 13" /><path d="M8 4l.8 2.2L11 7l-2.2.8L8 10l-.8-2.2L5 7l2.2-.8z" /></>,
  item: <><path d="M4 8l8-4 8 4-8 4z" /><path d="M4 8v8l8 4 8-4V8" /><path d="M12 12v8" /></>,
  magicItem: <><path d="M4 8l8-4 8 4-8 4z" /><path d="M4 8v8l8 4 8-4V8" /><path d="M12 12v8" /><path d="M18.5 3l.6 1.6L21 5.2l-1.6.6-.6 1.6-.6-1.6L16.5 5.2l1.6-.6z" fill="currentColor" stroke="none" /></>,
  creature: <><path d="M5 10c0-3 2-5 4-6l-1-2 3 1.5L13 2l-1 2c2 1 4 3 4 6 0 1.6-.6 2.8-1.5 3.8L16 20H8l1.5-4.2C8.6 12.8 8 11.6 8 10" opacity="0" /><path d="M7 11a5 5 0 1110 0c0 1.9-1 3.3-2 4.2V19H9v-3.8C8 14.3 7 12.9 7 11z" /><circle cx="10" cy="11" r="1" fill="currentColor" stroke="none" /><circle cx="14" cy="11" r="1" fill="currentColor" stroke="none" /></>,
  class: <><path d="M12 3l2.4 5 5.6.6-4.2 3.7 1.2 5.4L12 15l-5 2.7 1.2-5.4L4 8.6 9.6 8z" /></>,
  feat: <><path d="M12 3l7 4v5c0 4-3 7.3-7 9-4-1.7-7-5-7-9V7z" /><path d="M9.2 12.2l2 2 3.6-3.9" /></>,
  species: <><circle cx="12" cy="8" r="3.2" /><path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" /></>,
  background: <><path d="M4 7a2 2 0 012-2h5l2 2h5a2 2 0 012 2v9a2 2 0 01-2 2H6a2 2 0 01-2-2z" /></>,
  condition: <><circle cx="12" cy="12" r="9" /><path d="M12 7.5v5.5" /><circle cx="12" cy="16.3" r="1.1" fill="currentColor" stroke="none" /></>,
  action: <><path d="M13 2L5 13h6l-1 9 8-11h-6z" /></>,
  rule: <><path d="M5 4.5A1.5 1.5 0 016.5 3H19v15H6.5A1.5 1.5 0 005 19.5z" /><path d="M5 19.5V21h14" /><path d="M9 7.5h6M9 11h6" /></>,
};

// Which drawing a kind uses when nothing more specific applies.
const BY_KIND = {
  spell: 'spell', item: 'item', creature: 'creature',
  class: 'class', subclass: 'class', classFeature: 'class',
  subclassFeature: 'class', option: 'class',
  feat: 'feat', species: 'species', background: 'background',
  condition: 'condition', action: 'action', rule: 'rule',
};

// The colour each kind is drawn in — the same hues the old word-badges used,
// so nothing has to be relearned.
const TONES = {
  spell: 'bg-sky-900/50 border-sky-700 text-sky-200',
  item: 'bg-amber-900/40 border-amber-800 text-amber-200',
  magicItem: 'bg-amber-800/50 border-amber-500 text-amber-100',
  creature: 'bg-red-900/40 border-red-800 text-red-200',
  class: 'bg-purple-900/40 border-purple-700 text-purple-200',
  feat: 'bg-emerald-900/40 border-emerald-700 text-emerald-200',
  species: 'bg-teal-900/40 border-teal-700 text-teal-200',
  background: 'bg-teal-900/30 border-teal-800 text-teal-200',
  condition: 'bg-rose-900/40 border-rose-800 text-rose-200',
  action: 'bg-slate-700/50 border-slate-600 text-slate-200',
  rule: 'bg-slate-700/40 border-slate-600 text-slate-200',
};

/** A word for the thing, for screen readers and for the title tooltip. */
export function kindWord(row) {
  const words = {
    spell: 'Spell', item: 'Item', creature: 'Creature', class: 'Class',
    subclass: 'Subclass', classFeature: 'Class feature',
    subclassFeature: 'Subclass feature', option: 'Class option', feat: 'Feat',
    species: 'Species', background: 'Background', condition: 'Condition',
    action: 'Action', rule: 'Rule',
  };
  const base = words[row?.kind] || row?.kind || '';
  if (row?.kind === 'spell' && row.school) return `${row.school} spell`;
  if (row?.kind === 'item' && row.magic) return 'Magic item';
  return base;
}

export default function KindIcon({ row, className = '' }) {
  const [thumbFailed, setThumbFailed] = useState(false);
  const kind = row?.kind;

  // A creature wears its own token. Guessed paths miss for plenty of
  // creatures, so a failure falls back to the drawing rather than leaving a
  // hole in the row.
  if (kind === 'creature' && row.thumb && !thumbFailed) {
    return (
      <img
        src={row.thumb}
        alt=""
        loading="lazy"
        title={kindWord(row)}
        onError={() => setThumbFailed(true)}
        className={`shrink-0 w-8 h-8 rounded-full object-cover bg-gray-800 border border-red-900/70 ${className}`}
      />
    );
  }

  const art = kind === 'spell'
    ? (/heal/i.test(row.school || '') ? HEALING : (SCHOOL_ICONS[row.school] || ICONS.spell))
    : kind === 'item' && row.magic
      ? ICONS.magicItem
      : ICONS[BY_KIND[kind]] || ICONS.rule;

  const tone = kind === 'item' && row.magic
    ? TONES.magicItem
    : TONES[BY_KIND[kind]] || TONES.rule;

  return (
    <span
      title={kindWord(row)}
      aria-label={kindWord(row)}
      className={`shrink-0 w-8 h-8 rounded-lg border flex items-center justify-center ${tone} ${className}`}
    >
      <svg {...S} className="w-[18px] h-[18px]">{art}</svg>
    </span>
  );
}
