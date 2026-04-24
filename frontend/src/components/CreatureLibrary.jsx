import React, { useState, useEffect } from 'react';

const XIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" className="w-3.5 h-3.5">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const PencilIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);
const TrashIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
    <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
  </svg>
);
const PersonIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full p-2 opacity-50">
    <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8H4z" />
  </svg>
);
const MonsterIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full p-2 opacity-50">
    <path d="M12 2l1.5 3H17l-2.5 2 1 3L12 8.5 8.5 10l1-3L7 5h3.5L12 2z" />
    <path d="M7 13c-2.2 0-4 1.5-4 4.5h18C21 14.5 19.2 13 17 13l-5-2-5 2z" />
  </svg>
);
const GearIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
  </svg>
);
const SparkleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" className="w-3.5 h-3.5">
    <path d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5L12 2zM5 18l.7 2 2 .7-2 .7L5 24l-.7-2-2-.7 2-.7L5 18z" fill="currentColor" stroke="none" />
  </svg>
);
const DownloadIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
  </svg>
);
const UploadIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
  </svg>
);
import CreatureForm from './CreatureForm.jsx';
import StatBlock from './StatBlock.jsx';
import AIGeneratorModal from './AIGeneratorModal.jsx';

const SIZE_COLORS = {
  tiny: 'bg-purple-900/50 text-purple-300',
  small: 'bg-blue-900/50 text-blue-300',
  medium: 'bg-green-900/50 text-green-300',
  large: 'bg-yellow-900/50 text-yellow-300',
  huge: 'bg-orange-900/50 text-orange-300',
  gargantuan: 'bg-red-900/50 text-red-300',
};

function CreatureCard({ creature, onEdit, onDelete, onAddToMap, onView }) {
  const imageUrl = creature.image_path
    ? `/uploads/${creature.image_path}`
    : creature.is_player_character
    ? '/uploads/creatures/default_player.png'
    : null;
  const isPlayer = creature.is_player_character;

  return (
    <div className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700 hover:border-dnd-gold/50 transition-colors group">
      <div
        className="h-28 bg-gray-700 flex items-center justify-center overflow-hidden cursor-pointer"
        onClick={() => onView(creature)}
      >
        {imageUrl ? (
          <img src={imageUrl} alt={creature.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <span className="text-gray-500 w-full h-full">{isPlayer ? <PersonIcon /> : <MonsterIcon />}</span>
        )}
      </div>

      <div className="p-3">
        <div className="flex items-start justify-between gap-1">
          <h3 className="text-sm font-semibold text-white leading-tight">{creature.name}</h3>
          <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${SIZE_COLORS[creature.size] || SIZE_COLORS.medium}`}>
            {creature.size?.charAt(0).toUpperCase()}
          </span>
        </div>
        {isPlayer ? (
          <p className="text-xs text-dnd-gold/80 mt-0.5">Player Character</p>
        ) : (
          <p className="text-xs text-gray-400 mt-0.5">{creature.creature_type} • CR {creature.challenge_rating}</p>
        )}
        <p className="text-xs text-gray-500 mt-0.5">HP {creature.hit_points} • AC {creature.armor_class}</p>

        <div className="flex gap-1 mt-2">
          {!isPlayer && (
            <button
              onClick={() => onAddToMap(creature)}
              className="flex-1 bg-dnd-red/80 hover:bg-dnd-red text-white text-xs py-1.5 rounded font-medium transition-colors"
            >
              + Map
            </button>
          )}
          <button
            onClick={() => onEdit(creature)}
            className={`${isPlayer ? 'flex-1' : ''} bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs py-1.5 px-2 rounded transition-colors`}
          >
            <PencilIcon />
          </button>
          <button
            onClick={() => onDelete(creature)}
            className="bg-gray-700 hover:bg-red-900/50 text-gray-400 hover:text-red-300 text-xs py-1.5 px-2 rounded transition-colors flex items-center justify-center"
          >
            <TrashIcon />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CreatureLibrary({ sessionId, onAddToMap, aiSettings }) {
  const [creatures, setCreatures] = useState([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'monsters' | 'characters'
  const [sizeFilter, setSizeFilter] = useState('');
  const [crFilter, setCrFilter] = useState('');
  const [monsterTypeFilter, setMonsterTypeFilter] = useState('');
  const [showAdvFilters, setShowAdvFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('list'); // list | create | edit | view
  const [selected, setSelected] = useState(null);
  const [viewTab, setViewTab] = useState('stats'); // stats | inventory | spells
  const [invItems, setInvItems] = useState([]);
  const [invCurrency, setInvCurrency] = useState({ gp: 0, sp: 0, cp: 0 });
  const [invSaving, setInvSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiPrefill, setAIPrefill] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportCreatures, setExportCreatures] = useState([]);
  const [exportSelected, setExportSelected] = useState(new Set());
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  const aiConfigured = aiSettings?.baseUrl?.trim();

  async function loadCreatures(q = '', filter = typeFilter) {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set('search', q);
      if (filter !== 'all') params.set('filter', filter);
      const res = await fetch(`/api/creatures?${params}`);
      const data = await res.json();
      setCreatures(data);
    } catch {
      //
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadCreatures('', typeFilter); }, [typeFilter]);

  useEffect(() => {
    const t = setTimeout(() => loadCreatures(search, typeFilter), 300);
    return () => clearTimeout(t);
  }, [search]);

  async function handleDelete(creature) {
    await fetch(`/api/creatures/${creature.id}`, { method: 'DELETE' });
    setConfirmDelete(null);
    loadCreatures(search, typeFilter);
  }

  function handleSaved(creature) {
    setMode('list');
    setSelected(null);
    setAIPrefill(null);
    loadCreatures(search, typeFilter);
  }

  function handleAIGenerated(creatureData) {
    setShowAIModal(false);
    setAIPrefill(creatureData);
    setMode('create');
  }

  function openView(creature) {
    setSelected(creature);
    setViewTab('stats');
    // Initialise editable inventory state from creature data
    let inv = [];
    if (Array.isArray(creature.inventory)) inv = creature.inventory;
    else if (typeof creature.inventory === 'string' && creature.inventory.startsWith('[')) {
      try { inv = JSON.parse(creature.inventory); } catch { inv = []; }
    }
    setInvItems(inv.map((it, i) => ({ ...it, _key: Date.now() + i })));
    setInvCurrency({ gp: creature.currency_gp || 0, sp: creature.currency_sp || 0, cp: creature.currency_cp || 0 });
    setMode('view');
  }

  async function saveInventory() {
    if (!selected) return;
    setInvSaving(true);
    try {
      const fd = new FormData();
      fd.append('inventory', JSON.stringify(invItems.map(({ _key, ...rest }) => rest)));
      fd.append('currency_gp', invCurrency.gp);
      fd.append('currency_sp', invCurrency.sp);
      fd.append('currency_cp', invCurrency.cp);
      const res = await fetch(`/api/creatures/${selected.id}`, { method: 'PUT', body: fd });
      const data = await res.json();
      if (!data.error) setSelected(data);
    } catch { /* ignore */ }
    finally { setInvSaving(false); }
  }

  async function openExportModal() {
    setShowExportModal(true);
    const res = await fetch('/api/creatures');
    const data = await res.json();
    setExportCreatures(data);
    setExportSelected(new Set(data.map(c => c.id)));
  }

  async function handleExport() {
    if (exportSelected.size === 0) return;
    setExporting(true);
    try {
      const ids = [...exportSelected].join(',');
      const res = await fetch(`/api/creatures/export?ids=${ids}`);
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tokens-export-${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setShowExportModal(false);
    } catch (e) { alert('Export failed'); }
    finally { setExporting(false); }
  }

  async function handleImport(file) {
    if (!file) return;
    setImporting(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/creatures/import', { method: 'POST', body: fd });
      if (!res.ok) { const e = await res.json(); alert(e.error || 'Import failed'); return; }
      const { imported } = await res.json();
      alert(`Imported ${imported} creature${imported !== 1 ? 's' : ''} successfully.`);
      loadCreatures(search, typeFilter);
    } catch { alert('Import failed'); }
    finally { setImporting(false); }
  }

  if (mode === 'create' || mode === 'edit') {
    return (
      <div className="h-full flex flex-col">
        <div className="px-4 py-3 border-b border-gray-700 shrink-0">
          <h3 className="font-semibold text-dnd-gold">
            {mode === 'create'
              ? (aiPrefill ? `AI Generated: ${aiPrefill.name}` : 'New Creature')
              : `Edit: ${selected?.name}`}
          </h3>
        </div>
        <div className="flex-1 overflow-hidden">
          <CreatureForm
            creature={mode === 'edit' ? selected : (aiPrefill || null)}
            isPlayerCharacter={mode === 'edit' ? (selected?.is_player_character || false) : false}
            onSave={handleSaved}
            onCancel={() => { setMode('list'); setSelected(null); setAIPrefill(null); }}
          />
        </div>
      </div>
    );
  }

  if (mode === 'view' && selected) {
    return (
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-700 shrink-0 flex items-center gap-2">
          <button onClick={() => setMode('list')} className="text-gray-400 hover:text-white">←</button>
          <h3 className="font-semibold text-dnd-gold flex-1 truncate">{selected.name}</h3>
          <button onClick={() => setMode('edit')} className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded bg-gray-700 hover:bg-gray-600">Edit</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700 shrink-0">
          {(selected.is_player_character ? ['stats', 'inventory', 'spells'] : ['stats', 'inventory', 'spells', 'loot']).map((t) => (
            <button
              key={t}
              onClick={() => setViewTab(t)}
              className={`flex-1 py-2 text-xs font-medium transition-colors capitalize ${
                viewTab === t ? 'text-dnd-gold border-b-2 border-dnd-gold' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {t === 'stats' ? 'Stat Block' : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Stat Block tab */}
        {viewTab === 'stats' && (
          <div className="flex-1 overflow-y-auto p-4">
            <StatBlock creature={selected} />
            {!selected.is_player_character && (
              <button
                onClick={() => { onAddToMap(selected); setMode('list'); }}
                className="mt-4 w-full bg-dnd-red hover:bg-red-700 text-white py-2 rounded-lg font-semibold"
              >
                Add to Map
              </button>
            )}
          </div>
        )}

        {/* Inventory tab */}
        {viewTab === 'inventory' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Currency */}
            <div>
              <h4 className="text-xs font-semibold text-dnd-gold mb-2">Currency</h4>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: 'gp', label: 'Gold (GP)', color: 'text-yellow-400' },
                  { key: 'sp', label: 'Silver (SP)', color: 'text-gray-300' },
                  { key: 'cp', label: 'Copper (CP)', color: 'text-orange-400' },
                ].map(({ key, label, color }) => (
                  <div key={key} className="bg-gray-800 rounded-lg p-2 text-center">
                    <label className={`text-xs font-bold ${color} block mb-1`}>{label}</label>
                    <input
                      type="number" min={0}
                      className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white text-center focus:outline-none focus:border-dnd-gold"
                      value={invCurrency[key]}
                      onChange={(e) => setInvCurrency((c) => ({ ...c, [key]: Math.max(0, parseInt(e.target.value) || 0) }))}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold text-dnd-gold">Items</h4>
                <button
                  onClick={() => setInvItems((prev) => [...prev, { _key: Date.now(), name: '', qty: 1, weight: '', desc: '', equipped: false }])}
                  className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded text-gray-300 transition-colors"
                >
                  + Add Item
                </button>
              </div>
              {invItems.length === 0 && (
                <p className="text-xs text-gray-500 italic text-center py-4">No items yet.</p>
              )}
              <div className="space-y-2">
                {invItems.map((item, i) => (
                  <div key={item._key} className="bg-gray-800 rounded-lg p-3 space-y-2 border border-gray-700">
                    <div className="flex gap-2 items-center">
                      <input
                        className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-dnd-gold"
                        placeholder="Item name"
                        value={item.name}
                        onChange={(e) => setInvItems((prev) => prev.map((it, idx) => idx === i ? { ...it, name: e.target.value } : it))}
                      />
                      <input
                        type="number" min={1}
                        className="w-14 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white text-center focus:outline-none focus:border-dnd-gold"
                        title="Quantity"
                        value={item.qty || 1}
                        onChange={(e) => setInvItems((prev) => prev.map((it, idx) => idx === i ? { ...it, qty: Math.max(1, parseInt(e.target.value) || 1) } : it))}
                      />
                      <button onClick={() => setInvItems((prev) => prev.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-300 shrink-0 flex items-center"><XIcon /></button>
                    </div>
                    <div className="flex gap-2 items-center">
                      <label className="flex items-center gap-1 text-xs text-gray-400 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={item.equipped || false}
                          onChange={(e) => setInvItems((prev) => prev.map((it, idx) => idx === i ? { ...it, equipped: e.target.checked } : it))}
                          className="accent-dnd-gold"
                        />
                        Equipped
                      </label>
                      <input
                        className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-dnd-gold"
                        placeholder="Notes (optional)"
                        value={item.desc || ''}
                        onChange={(e) => setInvItems((prev) => prev.map((it, idx) => idx === i ? { ...it, desc: e.target.value } : it))}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={saveInventory}
              disabled={invSaving}
              className="w-full bg-dnd-gold hover:bg-yellow-500 disabled:opacity-50 text-gray-900 py-2 rounded-lg text-sm font-semibold transition-colors"
            >
              {invSaving ? 'Saving…' : 'Save Inventory'}
            </button>
          </div>
        )}

        {/* Spells tab */}
        {viewTab === 'spells' && (
          <div className="flex-1 overflow-y-auto p-4">
            {(() => {
              let spells = [];
              if (Array.isArray(selected.spells)) spells = selected.spells;
              else if (typeof selected.spells === 'string' && selected.spells.startsWith('[')) {
                try { spells = JSON.parse(selected.spells); } catch { spells = []; }
              }
              let slots = {};
              if (selected.spell_slots && typeof selected.spell_slots === 'object' && !Array.isArray(selected.spell_slots)) slots = selected.spell_slots;
              else if (typeof selected.spell_slots === 'string') { try { slots = JSON.parse(selected.spell_slots); } catch { slots = {}; } }
              const levels = [0,1,2,3,4,5,6,7,8,9].filter((l) => spells.some((s) => s.level === l));
              if (levels.length === 0) return <p className="text-xs text-gray-500 italic text-center py-8">No spells recorded. Use the Edit button to add spells.</p>;
              return levels.map((lvl) => {
                const lvlSpells = spells.filter((s) => s.level === lvl);
                const slotInfo = slots[lvl];
                const available = slotInfo ? slotInfo.total - (slotInfo.used || 0) : null;
                return (
                  <div key={lvl} className="mb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-dnd-gold">
                        {lvl === 0 ? 'Cantrips' : `Level ${lvl}`}
                      </span>
                      {slotInfo && slotInfo.total > 0 && (
                        <span className="text-xs text-gray-400">
                          {available}/{slotInfo.total} slots — {Array.from({ length: slotInfo.total }).map((_, i) => (
                            <span key={i}>{i < (slotInfo.used || 0) ? '☒' : '☐'}</span>
                          ))}
                        </span>
                      )}
                    </div>
                    {['combat','utility'].map((type) => {
                      const group = lvlSpells.filter((s) => s.type === type);
                      if (!group.length) return null;
                      return (
                        <div key={type} className="pl-2 mb-1">
                          <span className={`text-xs font-semibold ${type === 'combat' ? 'text-red-400' : 'text-blue-400'}`}>
                            {type === 'combat' ? 'Combat' : 'Utility'}:
                          </span>
                          {group.map((s, i) => (
                            <span key={s.id ?? i} className="text-xs text-gray-300 ml-1">
                              {s.name}{s.description ? ` — ${s.description}` : ''}{i < group.length - 1 ? ', ' : ''}
                            </span>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                );
              });
            })()}
          </div>
        )}

        {/* Loot tab */}
        {viewTab === 'loot' && (
          <div className="flex-1 overflow-y-auto p-4">
            {(() => {
              let loot = [];
              if (Array.isArray(selected.loot)) loot = selected.loot;
              else if (typeof selected.loot === 'string' && selected.loot.startsWith('[')) {
                try { loot = JSON.parse(selected.loot); } catch { loot = []; }
              }
              if (!loot.length) return <p className="text-xs text-gray-500 italic text-center py-8">No loot table defined. Use the Edit button to add loot.</p>;
              return (
                <div className="space-y-1">
                  <div className="grid grid-cols-[1fr_60px_60px] gap-2 px-1 text-xs text-gray-500 font-semibold uppercase tracking-wide mb-2">
                    <span>Item</span><span className="text-center">Qty</span><span className="text-center">Chance</span>
                  </div>
                  {loot.map((item, i) => (
                    <div key={i} className="bg-gray-800 rounded-lg px-3 py-2 border border-gray-700">
                      <div className="grid grid-cols-[1fr_60px_60px] gap-2 items-center">
                        <span className="text-sm text-white font-medium">{item.name}</span>
                        <span className="text-xs text-gray-300 text-center">{item.qty || '1'}</span>
                        <span className={`text-xs text-center font-semibold ${item.chance >= 75 ? 'text-green-400' : item.chance >= 30 ? 'text-yellow-400' : 'text-red-400'}`}>{item.chance}%</span>
                      </div>
                      {item.desc && <div className="text-xs text-gray-400 mt-0.5">{item.desc}</div>}
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Search + add */}
      <div className="px-4 py-3 space-y-2 border-b border-gray-700 shrink-0">
        <div className="flex gap-2">
          <input
            className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-dnd-gold"
            placeholder="Search creatures..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button
            onClick={() => { setAIPrefill(null); setMode('create'); }}
            className="bg-dnd-gold hover:bg-yellow-500 text-gray-900 px-3 py-2 rounded-lg text-sm font-semibold whitespace-nowrap"
          >
            + New
          </button>
          <button
            onClick={() => setShowAIModal(true)}
            disabled={!aiConfigured}
            title={aiConfigured ? 'Generate a stat block with AI' : 'Configure AI in the Session tab first'}
            className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${
              aiConfigured
                ? 'bg-purple-700 hover:bg-purple-600 text-white'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
          >
            <SparkleIcon /><span>AI</span>
          </button>
        </div>
        {/* Filter buttons */}
        <div className="flex gap-1">
          {['all', 'monsters', 'characters'].map((f) => (
            <button
              key={f}
              onClick={() => setTypeFilter(f)}
              className={`flex-1 py-1 text-xs rounded font-medium transition-colors ${
                typeFilter === f
                  ? 'bg-dnd-gold text-gray-900'
                  : 'bg-gray-700 text-gray-400 hover:text-gray-200'
              }`}
            >
              {f === 'all' ? 'All' : f === 'monsters' ? 'Monsters' : 'Characters'}
            </button>
          ))}
          <button
            onClick={() => setShowAdvFilters(v => !v)}
            className={`px-2 py-1 text-xs rounded font-medium transition-colors ${(sizeFilter || crFilter || monsterTypeFilter) ? 'bg-indigo-700 text-white' : showAdvFilters ? 'bg-gray-600 text-white' : 'bg-gray-700 text-gray-400 hover:text-gray-200'}`}
            title="Advanced filters"
          ><GearIcon /></button>
        </div>
        {/* Import / Export */}
        <div className="flex gap-1">
          <label className={`flex-1 flex items-center justify-center gap-1 py-1 text-xs rounded font-medium cursor-pointer transition-colors ${importing ? 'opacity-50 cursor-not-allowed bg-gray-700 text-gray-500' : 'bg-gray-700 text-gray-400 hover:text-gray-200'}`}>
            {importing ? 'Importing…' : <><UploadIcon /><span className="ml-1">Import</span></>}
            <input type="file" accept=".json" className="hidden" disabled={importing}
              onChange={e => { if (e.target.files[0]) handleImport(e.target.files[0]); e.target.value = ''; }} />
          </label>
          <button
            onClick={openExportModal}
            className="flex-1 flex items-center justify-center gap-1 py-1 text-xs rounded font-medium bg-gray-700 text-gray-400 hover:text-gray-200 transition-colors"
          >
            <DownloadIcon /><span>Export</span>
          </button>
        </div>

        {showAdvFilters && (
          <div className="space-y-1.5 pt-1">
            <div className="flex gap-1.5">
              <select
                className="flex-1 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-gray-300 focus:outline-none"
                value={sizeFilter}
                onChange={e => setSizeFilter(e.target.value)}
              >
                <option value="">Any Size</option>
                {['Tiny','Small','Medium','Large','Huge','Gargantuan'].map(s => <option key={s} value={s.toLowerCase()}>{s}</option>)}
              </select>
              <select
                className="flex-1 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-gray-300 focus:outline-none"
                value={crFilter}
                onChange={e => setCrFilter(e.target.value)}
              >
                <option value="">Any CR</option>
                {['0','1/8','1/4','1/2','1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16','17','18','19','20','21','22','23','24','25','26','27','28','29','30'].map(cr => <option key={cr} value={cr}>CR {cr}</option>)}
              </select>
            </div>
            <div className="flex gap-1.5">
              {(() => {
                const types = [...new Set(
                  creatures
                    .filter(c => !c.is_player_character && c.creature_type)
                    .map(c => c.creature_type.trim())
                    .filter(Boolean)
                )].sort();
                return (
                  <select
                    className="flex-1 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-gray-300 focus:outline-none"
                    value={monsterTypeFilter}
                    onChange={e => setMonsterTypeFilter(e.target.value)}
                  >
                    <option value="">Any Type</option>
                    {types.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                );
              })()}
              {(sizeFilter || crFilter || monsterTypeFilter) && (
                <button
                  onClick={() => { setSizeFilter(''); setCrFilter(''); setMonsterTypeFilter(''); }}
                  className="px-2 py-1 text-xs bg-red-900/50 hover:bg-red-800 text-red-300 rounded border border-red-700"
                >Clear</button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading && (
          <div className="text-center text-gray-500 py-8">Loading...</div>
        )}
        {!loading && creatures.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            <div className="text-4xl mb-2">🐲</div>
            <div>No creatures yet.</div>
            <button onClick={() => setMode('create')} className="mt-2 text-dnd-gold underline text-sm">
              Create your first creature
            </button>
          </div>
        )}
        {(() => {
          let filtered = creatures;
          if (sizeFilter) filtered = filtered.filter(c => (c.size || '').toLowerCase() === sizeFilter);
          if (crFilter) filtered = filtered.filter(c => String(c.challenge_rating) === crFilter);
          if (monsterTypeFilter) filtered = filtered.filter(c => (c.creature_type || '').trim() === monsterTypeFilter);
          return (
            <div className="grid grid-cols-2 gap-3">
              {filtered.map((c) => (
                <CreatureCard
                  key={c.id}
                  creature={c}
                  onEdit={(c) => { setSelected(c); setMode('edit'); }}
                  onDelete={(c) => setConfirmDelete(c)}
                  onAddToMap={(c) => onAddToMap(c)}
                  onView={(c) => openView(c)}
                />
              ))}
              {filtered.length === 0 && !loading && (
                <div className="col-span-2 text-center text-gray-500 py-4 text-xs">No creatures match the current filters.</div>
              )}
            </div>
          );
        })()}
      </div>

      {/* AI generator modal */}
      {showAIModal && aiConfigured && (
        <AIGeneratorModal
          aiSettings={aiSettings}
          onGenerated={handleAIGenerated}
          onCancel={() => setShowAIModal(false)}
        />
      )}

      {/* Export modal */}
      {showExportModal && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-dnd-panel border border-gray-700 rounded-xl p-5 w-full max-w-sm flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between mb-3 shrink-0">
              <h4 className="font-semibold text-dnd-gold">Export Token Library</h4>
              <button onClick={() => setShowExportModal(false)} className="text-gray-400 hover:text-white flex items-center"><XIcon /></button>
            </div>
            <div className="flex items-center justify-between mb-2 shrink-0">
              <span className="text-xs text-gray-400">{exportSelected.size} of {exportCreatures.length} selected</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setExportSelected(new Set(exportCreatures.map(c => c.id)))}
                  className="text-xs text-indigo-400 hover:text-indigo-300"
                >Select All</button>
                <button
                  onClick={() => setExportSelected(new Set())}
                  className="text-xs text-gray-500 hover:text-gray-300"
                >None</button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto space-y-1 min-h-0 mb-3">
              {exportCreatures.map(c => (
                <label key={c.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-700/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exportSelected.has(c.id)}
                    onChange={e => {
                      setExportSelected(prev => {
                        const next = new Set(prev);
                        e.target.checked ? next.add(c.id) : next.delete(c.id);
                        return next;
                      });
                    }}
                    className="accent-dnd-gold"
                  />
                  {c.image_path && (
                    <img src={`/uploads/${c.image_path}`} alt="" className="w-7 h-7 rounded object-cover shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="text-sm text-white truncate">{c.name}</div>
                    <div className="text-xs text-gray-500">
                      {c.is_player_character ? 'Player Character' : `${c.creature_type || 'Creature'} • CR ${c.challenge_rating ?? '—'}`}
                    </div>
                  </div>
                </label>
              ))}
              {exportCreatures.length === 0 && (
                <div className="text-center text-gray-500 text-xs py-6">Loading…</div>
              )}
            </div>
            <button
              onClick={handleExport}
              disabled={exporting || exportSelected.size === 0}
              className="w-full flex items-center justify-center gap-1 bg-dnd-gold hover:bg-yellow-500 disabled:opacity-40 text-gray-900 py-2 rounded-lg text-sm font-semibold transition-colors shrink-0"
            >
              {exporting ? 'Exporting…' : <><DownloadIcon /><span>Export {exportSelected.size} Token{exportSelected.size !== 1 ? 's' : ''}</span></>}
            </button>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {confirmDelete && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-dnd-panel border border-gray-700 rounded-xl p-6 max-w-xs w-full">
            <h4 className="font-semibold text-white mb-2">Delete {confirmDelete.name}?</h4>
            <p className="text-gray-400 text-sm mb-4">This cannot be undone.</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 bg-gray-700 text-white py-2 rounded-lg">Cancel</button>
              <button onClick={() => handleDelete(confirmDelete)} className="flex-1 bg-red-700 text-white py-2 rounded-lg">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
