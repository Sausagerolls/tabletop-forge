import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import StatBlock from './StatBlock.jsx';
import KindIcon, { kindWord } from './KindIcon.jsx';
import EditionTag from './EditionTag.jsx';

// One search box over everything in the rules.
//
// The same component serves the GM's panel and a player's phone, because the
// question is the same one — "what does this do?" — and keeping two of these in
// step would be a losing game. What differs is handed in: `role` decides what
// the server will answer with, and nothing about what may be seen is decided
// here. A GM secret is stripped server-side before it reaches this file (see
// routes/search.js); the client is not trusted to hide it.
//
// Rendered through a portal so it escapes whatever stacking context it was
// opened from — a GM sheet at z-40, a map canvas, a phone drawer — which is the
// same reason the shop overlays do it.

// The filter chips, in the order a person would look for them.
const FILTERS = [
  { key: '', label: 'All' },
  { key: 'spell', label: 'Spells' },
  { key: 'item', label: 'Items' },
  { key: 'creature', label: 'Creatures' },
  { key: 'class,subclass,classFeature,subclassFeature,option', label: 'Classes' },
  { key: 'feat', label: 'Feats' },
  { key: 'species,background', label: 'Origins' },
  { key: 'condition,action,rule', label: 'Rules' },
];

export default function ReferenceSearch({ role = 'player', onClose, embedded = false }) {
  const [q, setQ] = useState('');
  const [kinds, setKinds] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // A STACK, not a single open row. A class page lists its spells and each one
  // opens here; backing out of a spell has to land on the class that offered
  // it, not on the search results.
  const [stack, setStack] = useState([]);       // [{ row, entry, error }]
  const open = stack.length ? stack[stack.length - 1].row : null;
  const inputRef = useRef(null);
  const seq = useRef(0);

  const roleParam = role === 'dm' ? '&role=dm' : '';

  useEffect(() => { inputRef.current?.focus(); }, []);

  // Debounced, and every response carries the number of the request that asked
  // for it: the mirror's first call of the hour builds an index and can take
  // seconds, so a slow early answer must not overwrite a fast later one.
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setRows([]); setLoading(false); setError(''); return undefined; }
    const mine = ++seq.current;
    setLoading(true);
    const t = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(term)}&kinds=${encodeURIComponent(kinds)}${roleParam}`)
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`search failed (${r.status})`))))
        .then((d) => {
          if (mine !== seq.current) return;
          setRows(Array.isArray(d.results) ? d.results : []);
          setError('');
        })
        .catch((err) => { if (mine === seq.current) setError(err.message); })
        .finally(() => { if (mine === seq.current) setLoading(false); });
    }, 250);
    return () => clearTimeout(t);
  }, [q, kinds, roleParam]);

  const openRow = useCallback((row) => {
    const depth = { current: 0 };
    setStack((prev) => { depth.current = prev.length; return [...prev, { row, entry: null, error: '' }]; });
    const params = new URLSearchParams({ kind: row.kind, origin: row.origin });
    if (row.origin === 'library') params.set('id', row.id);
    else params.set('key', row.key || row.name);
    if (role === 'dm') params.set('role', 'dm');
    const settle = (patch) => setStack((prev) => prev.map((f, i) =>
      (i === depth.current && f.row === row ? { ...f, ...patch } : f)));
    fetch(`/api/search/entry?${params}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.status === 403 ? 'GM only' : 'Could not open that'))))
      .then((d) => settle({ entry: d.entry }))
      .catch((err) => settle({ error: err.message }));
  }, [role]);

  const popEntry = useCallback(() => setStack((prev) => prev.slice(0, -1)), []);

  // Escape backs out one level — the open entry first, then the whole panel.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (open) popEntry();
      else onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, popEntry]);

  const grouped = useMemo(() => rows, [rows]);

  const body = (
    <div className={`flex flex-col ${embedded ? 'h-full' : 'h-[100dvh]'} bg-gray-900 text-gray-100 min-h-0`}>
      <div className="shrink-0 border-b border-gray-700 bg-gray-900/95 backdrop-blur p-3 space-y-2"
        style={{ paddingTop: embedded ? undefined : 'max(0.75rem, env(safe-area-inset-top))' }}>
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search spells, items, monsters, classes, rules…"
            className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-gray-800 border border-gray-700 text-sm
                       focus:outline-none focus:border-dnd-gold"
          />
          {onClose && (
            <button type="button" onClick={onClose}
              className="px-3 py-2 rounded-xl bg-gray-800 border border-gray-700 text-sm active:bg-gray-700">
              Close
            </button>
          )}
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          {FILTERS.map((f) => (
            <button key={f.key} type="button" onClick={() => setKinds(f.key)}
              className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] border ${
                kinds === f.key
                  ? 'bg-dnd-gold/30 border-dnd-gold/60 text-dnd-gold'
                  : 'bg-gray-800 border-gray-700 text-gray-400'
              }`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
        {q.trim().length < 2 && (
          <p className="p-4 text-sm text-gray-500">
            Type at least two letters. Everything is searched at once — your own
            library first, then the rulebooks.
          </p>
        )}
        {error && <p className="p-4 text-sm text-red-300">{error}</p>}
        {!error && q.trim().length >= 2 && !loading && grouped.length === 0 && (
          <p className="p-4 text-sm text-gray-500">Nothing matches “{q.trim()}”.</p>
        )}
        {loading && grouped.length === 0 && (
          <p className="p-4 text-sm text-gray-500 italic">Searching…</p>
        )}
        <div className="divide-y divide-gray-800">
          {grouped.map((row, i) => (
            <button
              key={`${row.kind}-${row.origin}-${row.id || row.key || i}`}
              type="button"
              onClick={() => openRow(row)}
              className="w-full text-left px-3 py-2.5 flex items-center gap-3 active:bg-gray-800 hover:bg-gray-800/60"
            >
              <KindIcon row={row} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 min-w-0">
                  <span className="truncate text-sm">{row.name}</span>
                  {/* WHICH PRINTING, on the row itself. It used to be the tail
                      of the subtitle, where a long one truncated it away — and
                      the subtitle is the line most likely to be cut. Two
                      Fireballs are only telling apart by this. */}
                  <EditionTag edition={row.edition} source={row.source} />
                </span>
                <span className="block text-[11px] text-gray-500 truncate">
                  {/* The word moved off the badge and into the line under the
                      name, where it costs nothing and still answers "what IS
                      this" for anyone the drawing does not reach. */}
                  {kindWord(row)} · {row.subtitle}
                </span>
              </span>
              {row.origin === 'library' && (
                <span className="shrink-0 text-[10px] text-dnd-gold/80">yours</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {stack.length > 0 && (
        <EntryCard
          key={stack.length}
          row={stack[stack.length - 1].row}
          entry={stack[stack.length - 1].entry}
          error={stack[stack.length - 1].error}
          role={role}
          onBack={popEntry}
          onOpenRelated={openRow}
        />
      )}
    </div>
  );

  if (embedded) return body;
  return createPortal(
    <div className="fixed inset-0 z-[200] bg-gray-900">{body}</div>,
    document.body,
  );
}

// A table, wherever it came from — a class's level table, the Multiclassing
// prerequisites, a subclass's spell list. Scrolls sideways on its own so a
// wide one never stretches the card and takes the page with it.
function DataTable({ columns, rows, caption }) {
  if (!rows?.length) return null;
  return (
    <div className="space-y-1">
      {caption && <div className="text-[11px] text-gray-500">{caption}</div>}
      <div className="overflow-x-auto overscroll-x-contain rounded-xl border border-gray-700">
        <table className="text-[12px] border-collapse min-w-full">
          {columns?.length > 0 && (
            <thead>
              <tr className="bg-gray-800/80">
                {columns.map((c, i) => (
                  <th key={`${c}-${i}`} className="px-2 py-1.5 text-left font-semibold text-gray-300 whitespace-nowrap border-b border-gray-700">{c}</th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {rows.map((r, ri) => (
              <tr key={ri} className={ri % 2 ? 'bg-gray-900/40' : ''}>
                {r.map((cell, ci) => (
                  <td key={ci} className="px-2 py-1.5 align-top border-b border-gray-800 text-gray-300">{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Prose and whatever tables came with it.
function Blocks({ text, tables }) {
  return (
    <>
      {text && (
        <div className="text-[13px] leading-relaxed whitespace-pre-wrap text-gray-300">{text}</div>
      )}
      {(tables || []).map((t, i) => <DataTable key={i} {...t} />)}
    </>
  );
}

// The thing itself. Sits over the list rather than replacing it, so closing it
// returns to the results with the query still in place.
function EntryCard({ row, entry, error, role, onBack, onOpenRelated }) {
  // Which feature is expanded, and whether the spell list is up. Both are
  // per-entry state, which is why this card is keyed on stack depth.
  const [openFeature, setOpenFeature] = useState(null);
  const [artFailed, setArtFailed] = useState(false);
  const [showLore, setShowLore] = useState(false);
  const [spells, setSpells] = useState(null);     // null = not asked for
  const [spellsErr, setSpellsErr] = useState('');
  const [showTable, setShowTable] = useState(true);

  const loadSpells = () => {
    if (spells) { setSpells(null); return; }       // a second tap closes it
    setSpellsErr('');
    fetch(`/api/search/class-spells?class=${encodeURIComponent(entry.spellList)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Could not load the spell list'))))
      .then((d) => setSpells(Array.isArray(d.spells) ? d.spells : []))
      .catch((err) => setSpellsErr(err.message));
  };

  // Grouped by level, which is how a spell list is printed and how anyone
  // reads one.
  const byLevel = useMemo(() => {
    if (!spells) return [];
    const map = new Map();
    for (const sp of spells) {
      const lvl = Number(sp.level) || 0;
      if (!map.has(lvl)) map.set(lvl, []);
      map.get(lvl).push(sp);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [spells]);

  return (
    <div className="absolute inset-0 z-10 bg-gray-900 flex flex-col min-h-0">
      <div className="shrink-0 flex items-center gap-3 px-3 py-2.5 border-b border-gray-700 bg-gray-900/95 backdrop-blur"
        style={{ paddingTop: 'max(0.625rem, env(safe-area-inset-top))' }}>
        <button type="button" onClick={onBack}
          className="px-3 py-2 -ml-1 rounded-xl bg-gray-800 active:bg-gray-700 text-sm">‹ Back</button>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="truncate font-semibold">{entry?.name || row.name}</span>
            {/* WHICH PRINTING THIS IS, on the thing itself. The result row has
                said so since the libraries started holding both; the card it
                opened did not, so the moment you tapped through you no longer
                knew whether you were reading the 2014 item or the 2024 one. */}
            <EditionTag
              edition={entry?.edition ?? row.edition}
              source={entry?.source || row.source}
            />
          </div>
          <div className="truncate text-[11px] text-gray-500">
            {entry?.subtitle || row.subtitle}
            {entry?.source ? ` · ${entry.source}` : ''}
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 pb-10 space-y-3 max-w-3xl">
        {error && <p className="text-sm text-red-300">{error}</p>}
        {!error && !entry && <p className="text-sm text-gray-500 italic">Opening…</p>}

        {/* A CREATURE IS A STAT BLOCK, NOT A PARAGRAPH.
            Everything else here is prose with a few labelled fields above it,
            which is the right shape for a spell or a rule and the wrong one for
            a monster: abilities in a row, saves, senses, then traits and
            actions. The app already draws that, on the GM's screen and on a
            player's phone, so a creature found by search is handed to the same
            component rather than flattened into text that only looks like one. */}
        {/* The art, above the block it belongs to. Loaded lazily and allowed
            to fail quietly: a mirror without a picture for this creature, or a
            picture that will not load, must leave the stat block exactly as it
            would have been rather than show a broken frame. */}
        {entry?.image && !artFailed && (
          <img
            src={entry.image}
            alt={entry.name}
            loading="lazy"
            onError={() => setArtFailed(true)}
            className="w-full rounded-xl border border-gray-700 bg-gray-800 object-contain max-h-80"
          />
        )}

        {entry?.creature && <StatBlock creature={entry.creature} />}

        {entry?.partial && entry?.creature && (
          <p className="text-[11px] text-gray-500 italic">
            Written as a variant of another creature, so some of its detail may
            be missing here.
          </p>
        )}

        {!entry?.creature && entry?.meta?.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {entry.meta.map((m) => (
              <div key={m.label} className="rounded-xl bg-gray-800/60 border border-gray-700 px-3 py-2">
                <div className="text-[10px] uppercase tracking-wide text-gray-500">{m.label}</div>
                <div className="text-sm">{m.value}</div>
              </div>
            ))}
          </div>
        )}

        {entry?.secret && (
          <div className="rounded-xl bg-amber-950/50 border border-amber-800/70 px-3 py-2">
            <div className="text-[10px] uppercase tracking-wide text-amber-400">GM only</div>
            <div className="text-sm text-amber-100 whitespace-pre-wrap">{entry.secret}</div>
          </div>
        )}

        {entry?.partial && !entry?.creature && (
          <p className="text-[11px] text-gray-500 italic">
            This entry is written as a variant of another, so some of its detail
            may be missing here.
          </p>
        )}

        {!entry?.creature && entry?.body && (
          <div className="text-sm leading-relaxed whitespace-pre-wrap text-gray-200">
            {/* The GM's copy already carries its secret in the card above. */}
            {entry.secret ? entry.body.replace(`GM only — ${entry.secret}`, '').trim() : entry.body}
          </div>
        )}

        {(entry?.tables || []).map((t, i) => <DataTable key={i} {...t} />)}

        {/* ── A class: its spell list, its table, its features ── */}

        {entry?.spellList && (
          <button type="button" onClick={loadSpells}
            className="w-full py-2.5 rounded-xl bg-sky-900/50 border border-sky-700 text-sky-100 text-sm font-semibold active:bg-sky-800">
            {spells ? 'Hide the spell list' : `Show every spell a ${entry.name} can know`}
          </button>
        )}
        {spellsErr && <p className="text-sm text-red-300">{spellsErr}</p>}
        {spells && spells.length === 0 && (
          <p className="text-sm text-gray-500 italic">No spell list for this class.</p>
        )}
        {byLevel.map(([lvl, list]) => (
          <div key={lvl}>
            <div className="text-xs text-dnd-gold mb-1">
              {lvl === 0 ? 'Cantrips' : `Level ${lvl}`}
              <span className="text-gray-500"> · {list.length}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {list.map((sp) => (
                <button
                  key={`${sp.name}-${sp.source}`}
                  type="button"
                  // Opens as its own entry on top of the class, so backing out
                  // returns to the list rather than to the search results.
                  onClick={() => onOpenRelated?.({
                    kind: 'spell', origin: 'compendium', key: sp.key,
                    name: sp.name, subtitle: sp.subtitle,
                  })}
                  className="px-2.5 py-1.5 rounded-lg text-[13px] bg-gray-800 border border-gray-700
                             text-gray-200 active:bg-gray-700 hover:border-sky-700"
                >{sp.name}</button>
              ))}
            </div>
          </div>
        ))}

        {/* SPELLS THE SUBCLASS HANDS YOU.
            Written on the subclass keyed by the CLASS level they arrive at, and
            previously visible only as names inside a feature's prose, where
            they could not be opened. Each one is a button to its own card, so
            reading what a Life Domain Cleric gets is one tap per spell rather
            than a trip back to the search box. */}
        {/* Spells an item can cast. Same treatment as a subclass's grants:
            each one opens, because "it casts Fireball" is only useful if you
            can then read Fireball. */}
        {entry?.spells?.length > 0 && (
          <div>
            <div className="text-[11px] uppercase tracking-wide text-gray-500 mb-1.5">
              Spells it can cast
            </div>
            <div className="flex flex-wrap gap-1.5">
              {entry.spells.map((sp) => (sp.key ? (
                <button key={sp.name} type="button"
                  onClick={() => onOpenRelated?.({
                    kind: 'spell', origin: 'compendium', key: sp.key,
                    name: sp.name, subtitle: sp.subtitle,
                  })}
                  className="px-2.5 py-1.5 rounded-lg text-[13px] bg-gray-800 border border-gray-700
                             text-gray-200 active:bg-gray-700 hover:border-sky-700"
                >{sp.name}</button>
              ) : (
                <span key={sp.name} title="Not in the spell list"
                  className="px-2.5 py-1.5 rounded-lg text-[13px] bg-gray-800/50 border border-gray-800 text-gray-500"
                >{sp.name}</span>
              )))}
            </div>
          </div>
        )}

        {entry?.granted?.length > 0 && (
          <div className="space-y-2">
            <div className="text-[11px] uppercase tracking-wide text-gray-500">
              Spells it grants
            </div>
            {entry.granted.map((group, gi) => (
              <div key={group.name || gi} className="rounded-xl border border-gray-700 bg-gray-800/40 p-3 space-y-2">
                {/* A variant — "Arid Land", "Polar Land" — where the subclass
                    has several lists and you pick one. */}
                {group.name && (
                  <div className="text-[13px] text-dnd-gold">{group.name}</div>
                )}
                {group.levels.map(({ level, spells }) => (
                  <div key={level} className="flex gap-2 items-baseline">
                    <span className="shrink-0 w-12 text-[11px] text-gray-500">Lv {level}</span>
                    <span className="flex flex-wrap gap-1.5">
                      {spells.map((sp) => (sp.key ? (
                        <button
                          key={sp.name}
                          type="button"
                          onClick={() => onOpenRelated?.({
                            kind: 'spell', origin: 'compendium', key: sp.key,
                            name: sp.name, subtitle: sp.subtitle,
                          })}
                          className="px-2 py-1 rounded-lg text-[12px] bg-gray-800 border border-gray-700
                                     text-gray-200 active:bg-gray-700 hover:border-sky-700"
                        >{sp.name}</button>
                      ) : (
                        // A spell the mirror names but the index does not
                        // carry. Shown, because leaving it out would make the
                        // list wrong; not a button, because there is nothing
                        // to open.
                        <span key={sp.name}
                          title="Not in the spell list"
                          className="px-2 py-1 rounded-lg text-[12px] bg-gray-800/50 border border-gray-800 text-gray-500"
                        >{sp.name}</span>
                      )))}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {entry?.table && (
          <div>
            <button type="button" onClick={() => setShowTable((v) => !v)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-gray-800/60 border border-gray-700 text-sm">
              <span>Level table</span>
              <span className="text-gray-500 text-xs">{showTable ? 'hide' : 'show'}</span>
            </button>
            {showTable && (
              // The table is wider than a phone on any class with spell slots,
              // so it scrolls sideways on its own rather than stretching the
              // card and taking the whole page with it.
              <div className="mt-2">
                <DataTable columns={entry.table.columns} rows={entry.table.rows} />
              </div>
            )}
          </div>
        )}

        {entry?.sections?.length > 0 && (
          <div className="space-y-1.5">
            {entry.sections.map((f, i) => {
              const id = `sec-${f.name}-${i}`;
              const isOpen = openFeature === id;
              return (
                <div key={id} className="rounded-xl border border-gray-700 bg-gray-800/40 overflow-hidden">
                  <button type="button" onClick={() => setOpenFeature(isOpen ? null : id)}
                    className="w-full text-left px-3 py-2 flex items-center gap-2 active:bg-gray-700/50">
                    <span className="flex-1 min-w-0 text-sm truncate">{f.name}</span>
                    <span className="shrink-0 text-gray-500 text-xs">{isOpen ? '▾' : '▸'}</span>
                  </button>
                  {isOpen && (
                    <div className="px-3 pb-3 space-y-2">
                      <Blocks text={f.text || 'No text for this one.'} tables={f.tables} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* The lore, last and folded away. It is the longest thing on a species
            and the least often wanted mid-session — the traits are what someone
            opened this for. */}
        {entry?.lore && (
          <div className="rounded-xl border border-gray-700 bg-gray-800/30 overflow-hidden">
            <button type="button" onClick={() => setShowLore((v) => !v)}
              className="w-full text-left px-3 py-2 flex items-center gap-2 active:bg-gray-700/50">
              <span className="flex-1 text-sm">About {entry.name}</span>
              <span className="shrink-0 text-gray-500 text-xs">{showLore ? '▾' : '▸'}</span>
            </button>
            {showLore && (
              <div className="px-3 pb-3 text-[13px] leading-relaxed whitespace-pre-wrap text-gray-400">
                {entry.lore}
              </div>
            )}
          </div>
        )}

        {entry?.features?.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-[11px] uppercase tracking-wide text-gray-500">Features</div>
            {entry.features.map((f, i) => {
              const id = `${f.level}-${f.name}-${i}`;
              const isOpen = openFeature === id;
              return (
                <div key={id} className="rounded-xl border border-gray-700 bg-gray-800/40 overflow-hidden">
                  <button type="button" onClick={() => setOpenFeature(isOpen ? null : id)}
                    className="w-full text-left px-3 py-2 flex items-center gap-2 active:bg-gray-700/50">
                    <span className="shrink-0 w-12 text-[11px] text-gray-500">Lv {f.level}</span>
                    <span className="flex-1 min-w-0 text-sm truncate">{f.name}</span>
                    <span className="shrink-0 text-gray-500 text-xs">{isOpen ? '▾' : '▸'}</span>
                  </button>
                  {isOpen && (
                    <div className="px-3 pb-3 space-y-2">
                      <Blocks text={f.text || 'No text for this feature.'} tables={f.tables} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {entry?.subclasses?.length > 0 && (
          <div>
            <div className="text-[11px] uppercase tracking-wide text-gray-500 mb-1.5">Subclasses</div>
            <div className="flex flex-wrap gap-1.5">
              {entry.subclasses.map((sub) => (
                <button key={sub.key || sub.name} type="button"
                  onClick={() => onOpenRelated?.({
                    kind: 'subclass', origin: 'compendium',
                    key: sub.key, name: sub.name, subtitle: `${entry.name} subclass`,
                  })}
                  className="px-2.5 py-1.5 rounded-lg text-[13px] bg-gray-800 border border-gray-700
                             text-gray-200 active:bg-gray-700 hover:border-purple-700"
                >{sub.name}</button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
