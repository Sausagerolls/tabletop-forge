// ItemLibrary — DM-facing browser over /api/item-library.
// Mirror of SpellLibrary's "view" surface: search + filters + edition
// toggle. PDF scan / manual edit aren't here yet because the SRD
// importer (`node src/import_srd_items.js`) covers v1.

import React, { useEffect, useMemo, useState } from 'react';

const TYPES = [
  { v: '', label: 'All types' },
  { v: 'armor', label: 'Armor' },
  { v: 'weapon', label: 'Weapon' },
  { v: 'magic_item', label: 'Magic item' },
  { v: 'gear', label: 'Adventuring gear' },
];

const RARITIES = [
  '', 'common', 'uncommon', 'rare', 'very rare', 'legendary', 'artifact',
];

export default function ItemLibrary({
  activeSrdEdition = 'both',
  onChangeActiveSrdEdition,
}) {
  const [items, setItems]   = useState([]);
  const [search, setSearch] = useState('');
  const [type, setType]     = useState('');
  const [rarity, setRarity] = useState('');
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState({}); // id -> bool

  useEffect(() => { load(); }, []);
  async function load() {
    setLoading(true);
    try {
      const r = await fetch('/api/item-library');
      setItems(r.ok ? (await r.json()) : []);
    } finally { setLoading(false); }
  }

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(it => {
      if (q && !it.name.toLowerCase().includes(q)) return false;
      if (type && it.item_type !== type) return false;
      if (rarity && (it.rarity || '') !== rarity) return false;
      // Manual rows (no SRD source) always show. SRD rows respect toggle.
      const isManual = !/^SRD /i.test(it.source || '');
      if (!isManual && activeSrdEdition !== 'both' && it.edition !== activeSrdEdition) return false;
      return true;
    });
  }, [items, search, type, rarity, activeSrdEdition]);

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      {/* SRD edition toggle — DM-only control, mirror of SpellLibrary */}
      {onChangeActiveSrdEdition && (
        <div className="flex items-center gap-2 bg-gray-800/40 border border-gray-700 rounded p-2">
          <span className="text-xs text-gray-400">Active SRD edition (players see):</span>
          {['2014', '2024', 'both'].map(ed => (
            <button key={ed} type="button"
              onClick={() => onChangeActiveSrdEdition(ed)}
              className={`text-xs px-2 py-1 rounded border ${
                activeSrdEdition === ed
                  ? 'bg-amber-700 border-amber-500 text-white'
                  : 'bg-gray-900 border-gray-700 text-gray-300 hover:bg-gray-800'
              }`}>{ed === 'both' ? 'Both' : ed}</button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <input
          placeholder="Search by name…"
          className="flex-1 min-w-[140px] bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white"
          value={type}
          onChange={e => setType(e.target.value)}
        >
          {TYPES.map(t => <option key={t.v} value={t.v}>{t.label}</option>)}
        </select>
        <select
          className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white"
          value={rarity}
          onChange={e => setRarity(e.target.value)}
        >
          <option value="">Any rarity</option>
          {RARITIES.filter(Boolean).map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <button onClick={load}
          className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded text-gray-200">
          Refresh
        </button>
      </div>

      <div className="text-xs text-gray-500">
        {loading ? 'Loading…' : `${visible.length} of ${items.length} items`}
      </div>

      <ul className="space-y-1">
        {visible.map(it => {
          const open = !!expanded[it.id];
          return (
            <li key={it.id} className="bg-gray-800/40 border border-gray-700 rounded">
              <button type="button"
                onClick={() => setExpanded(s => ({ ...s, [it.id]: !open }))}
                className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-gray-800/70">
                <span className="text-gray-100">{it.name}</span>
                <span className="text-[10px] uppercase text-gray-500">
                  {it.item_type}{it.rarity ? ` · ${it.rarity}` : ''} · {it.edition}
                </span>
              </button>
              {open && (
                <div className="px-3 pb-3 text-xs text-gray-300 whitespace-pre-wrap">
                  {it.item_type === 'armor' && (
                    <div className="mb-1 text-gray-400">
                      AC {it.ac_base}{it.armor_category ? ` · ${it.armor_category}` : ''}
                      {it.str_req ? ` · STR ${it.str_req}` : ''}
                      {it.stealth_disadvantage ? ' · stealth disadvantage' : ''}
                    </div>
                  )}
                  {it.item_type === 'weapon' && (
                    <div className="mb-1 text-gray-400">
                      {Array.isArray(it.damage_entries) && it.damage_entries[0]
                        ? `${it.damage_entries[0].damage} ${it.damage_entries[0].damage_type}`
                        : ''}
                      {it.weapon_range ? ` · range ${it.weapon_range}` : ''}
                      {it.properties ? ` · ${it.properties}` : ''}
                    </div>
                  )}
                  {it.attunement_req && (
                    <div className="mb-1 text-amber-300">{it.attunement_req}</div>
                  )}
                  {it.description || <span className="italic text-gray-500">(no description)</span>}
                  <div className="mt-2 text-[10px] text-gray-500">{it.source}</div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
