import React, { useEffect, useMemo, useState } from 'react';

// LanguagePicker — multi-select for the canonical /api/languages list,
// with on-the-fly creation of custom entries. Reads + writes the
// existing `creatures.languages` TEXT column unchanged: a comma-
// separated list of names. Trailing qualifiers like
// "(understands but cannot speak)" stay attached to whichever
// language they qualify, so AI output and hand-edited rows survive
// a save/load round-trip.

const CATEGORY_ORDER = ['standard', 'exotic', 'rare', 'custom'];
const CATEGORY_LABELS = {
  standard: 'Standard',
  exotic: 'Exotic',
  rare: 'Rare',
  custom: 'Custom',
};

// Split "Common, Goblin (understands but cannot speak), Custom Tongue"
// into [{ name: 'Common', tail: '' }, { name: 'Goblin', tail: ' (understands but cannot speak)' }, ...]
function parseLanguagesString(raw) {
  return String(raw || '')
    .split(/\s*,\s*/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((part) => {
      const m = part.match(/^([^()]+?)(\s*\(.+\))?$/);
      return {
        name: (m ? m[1] : part).trim(),
        tail: (m && m[2]) ? m[2] : '',
      };
    });
}

function formatLanguagesString(parts) {
  return parts.map((p) => `${p.name}${p.tail || ''}`).join(', ');
}

export default function LanguagePicker({ value, onChange, className = '' }) {
  const [available, setAvailable] = useState([]);
  const [loadingError, setLoadingError] = useState(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);

  // Selected entries are the parsed view of the comma-separated text.
  // We never store our own copy — the text column remains the source of
  // truth, so blocks of code that read `form.languages` directly (AI,
  // SRD packs, NPC chat plugin) keep working unchanged.
  const selected = useMemo(() => parseLanguagesString(value), [value]);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/languages')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((rows) => { if (!cancelled) setAvailable(rows); })
      .catch((err) => { if (!cancelled) setLoadingError(err.message); });
    return () => { cancelled = true; };
  }, []);

  // Map names → row so we can show category badges on chips even when
  // the saved value contains custom names that aren't yet in the
  // available list.
  const byLowerName = useMemo(() => {
    const m = new Map();
    for (const row of available) m.set(row.name.toLowerCase(), row);
    return m;
  }, [available]);

  function selectedHas(name) {
    const lc = name.toLowerCase();
    return selected.some((s) => s.name.toLowerCase() === lc);
  }

  function toggle(name) {
    const lc = name.toLowerCase();
    const exists = selectedHas(name);
    const next = exists
      ? selected.filter((s) => s.name.toLowerCase() !== lc)
      : [...selected, { name, tail: '' }];
    onChange(formatLanguagesString(next));
  }

  function setQualifier(originalName, qualifier) {
    const tail = qualifier ? ` (${qualifier})` : '';
    const next = selected.map((s) =>
      s.name.toLowerCase() === originalName.toLowerCase() ? { ...s, tail } : s
    );
    onChange(formatLanguagesString(next));
  }

  function remove(name) {
    const next = selected.filter((s) => s.name.toLowerCase() !== name.toLowerCase());
    onChange(formatLanguagesString(next));
  }

  async function createCustom(rawName) {
    const name = String(rawName || '').trim();
    if (!name) return;
    setCreating(true);
    try {
      const res = await fetch('/api/languages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status} ${txt.slice(0, 120)}`);
      }
      const row = await res.json();
      // Refresh the local list so the new row shows up grouped under
      // 'Custom' immediately, and auto-select it.
      setAvailable((prev) => {
        if (prev.some((r) => r.slug === row.slug)) return prev;
        return [...prev, row];
      });
      if (!selectedHas(row.name)) toggle(row.name);
      setSearch('');
    } catch (err) {
      alert(`Could not add "${name}": ${err.message}`);
    } finally {
      setCreating(false);
    }
  }

  // Group available languages by category for the dropdown.
  const grouped = useMemo(() => {
    const out = {};
    for (const cat of CATEGORY_ORDER) out[cat] = [];
    const lcSearch = search.trim().toLowerCase();
    for (const row of available) {
      if (lcSearch && !row.name.toLowerCase().includes(lcSearch)) continue;
      const cat = CATEGORY_ORDER.includes(row.category) ? row.category : 'custom';
      out[cat].push(row);
    }
    return out;
  }, [available, search]);

  const exactMatchExists = useMemo(() => {
    if (!search.trim()) return false;
    return available.some((r) => r.name.toLowerCase() === search.trim().toLowerCase());
  }, [available, search]);

  return (
    <div className={`relative ${className}`}>
      <div
        className="bg-gray-700 border border-gray-600 rounded text-white px-2 py-1.5 text-sm min-h-[34px] cursor-text flex flex-wrap items-center gap-1"
        onClick={() => setOpen(true)}
      >
        {selected.length === 0 && !open && (
          <span className="text-gray-500 text-xs italic">Click to pick languages…</span>
        )}
        {selected.map((s) => {
          const row = byLowerName.get(s.name.toLowerCase());
          const cat = row ? row.category : 'custom';
          const isPartial = !!s.tail;
          return (
            <span
              key={s.name}
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] border ${
                cat === 'standard' ? 'bg-emerald-900/40 border-emerald-700/40 text-emerald-100'
                : cat === 'exotic'  ? 'bg-purple-900/40 border-purple-700/40 text-purple-100'
                : cat === 'rare'    ? 'bg-amber-900/40 border-amber-700/40 text-amber-100'
                                    : 'bg-gray-800 border-gray-600 text-gray-200'
              }`}
              title={isPartial ? `${s.name}${s.tail}` : s.name}
            >
              {s.name}
              {isPartial && <span className="opacity-60 text-[9px]">~</span>}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); remove(s.name); }}
                className="opacity-60 hover:opacity-100"
                title="Remove"
              >×</button>
            </span>
          );
        })}
        {open && (
          <input
            autoFocus
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onBlur={() => { setTimeout(() => setOpen(false), 150); }}
            placeholder="Search or add new…"
            className="flex-1 min-w-[120px] bg-transparent outline-none text-sm text-white"
          />
        )}
      </div>

      {open && (
        <div className="absolute z-30 left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg max-h-72 overflow-y-auto"
             onMouseDown={(e) => e.preventDefault()}>
          {loadingError && (
            <div className="text-[11px] text-red-300 px-2 py-1 border-b border-gray-700">
              Could not load languages: {loadingError}
            </div>
          )}

          {/* Inline add-custom row when search has no exact match */}
          {search.trim() && !exactMatchExists && (
            <button
              type="button"
              disabled={creating}
              onClick={() => createCustom(search)}
              className="w-full text-left px-2 py-1.5 text-xs text-dnd-gold hover:bg-gray-700 border-b border-gray-700 disabled:opacity-50"
            >
              + Add "{search.trim()}" as a custom language
            </button>
          )}

          {CATEGORY_ORDER.map((cat) => {
            const rows = grouped[cat];
            if (!rows || rows.length === 0) return null;
            return (
              <div key={cat}>
                <div className="text-[10px] uppercase tracking-wider text-gray-500 px-2 pt-2 pb-1">
                  {CATEGORY_LABELS[cat]}
                </div>
                {rows.map((row) => {
                  const isSelected = selectedHas(row.name);
                  const sel = selected.find((s) => s.name.toLowerCase() === row.name.toLowerCase());
                  return (
                    <div key={row.slug} className="flex items-center gap-1 px-2 py-1 hover:bg-gray-700/40">
                      <label className="flex-1 flex items-center gap-2 text-xs text-gray-200 cursor-pointer min-w-0">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggle(row.name)}
                          className="accent-dnd-gold w-3.5 h-3.5"
                        />
                        <span className="truncate">{row.name}</span>
                        {row.script && <span className="text-[10px] text-gray-500 shrink-0">[{row.script}]</span>}
                      </label>
                      {isSelected && (
                        <select
                          value={sel?.tail.match(/\(([^)]+)\)/)?.[1] || ''}
                          onChange={(e) => setQualifier(row.name, e.target.value)}
                          className="text-[10px] bg-gray-900 border border-gray-700 text-gray-200 rounded px-1 py-0.5 shrink-0"
                          title="Fluency qualifier"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <option value="">speaks fluently</option>
                          <option value="understands but cannot speak">understands only</option>
                          <option value="cant read or write">no reading</option>
                        </select>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}

          {available.length === 0 && !loadingError && (
            <div className="text-xs text-gray-500 italic px-2 py-3">Loading languages…</div>
          )}
        </div>
      )}
    </div>
  );
}
