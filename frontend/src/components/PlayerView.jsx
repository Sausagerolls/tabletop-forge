import React, { useState, useEffect, useRef } from 'react';
import { SpellBox } from './StatBlock.jsx';

function QuickReferencePanel({ creature, playerToken, onClose, onSave, onTokenHpChange }) {
  const [viewSpell, setViewSpell] = useState(null);
  const concentrationOptions = (() => {
    let arr = [];
    if (Array.isArray(creature.spells)) arr = creature.spells;
    else if (typeof creature.spells === 'string' && creature.spells.startsWith('[')) {
      try { arr = JSON.parse(creature.spells); } catch { arr = []; }
    }
    return arr.filter(s => s.name && s.duration && /concentration/i.test(s.duration));
  })();
  const [local, setLocal] = useState(() => ({
    current_hp: playerToken?.current_hp ?? creature.hit_points ?? 0,
    hit_dice_used: creature.hit_dice_used ?? 0,
    death_save_successes: creature.death_save_successes ?? 0,
    death_save_failures: creature.death_save_failures ?? 0,
    heroic_inspiration: !!creature.heroic_inspiration,
    spell_slots: typeof creature.spell_slots === 'string'
      ? (() => { try { return JSON.parse(creature.spell_slots); } catch { return {}; } })()
      : (creature.spell_slots || {}),
  }));
  useEffect(() => {
    setLocal({
      current_hp: playerToken?.current_hp ?? creature.hit_points ?? 0,
      hit_dice_used: creature.hit_dice_used ?? 0,
      death_save_successes: creature.death_save_successes ?? 0,
      death_save_failures: creature.death_save_failures ?? 0,
      heroic_inspiration: !!creature.heroic_inspiration,
      spell_slots: typeof creature.spell_slots === 'string'
        ? (() => { try { return JSON.parse(creature.spell_slots); } catch { return {}; } })()
        : (creature.spell_slots || {}),
    });
  }, [creature.id]);

  function patch(field, value) {
    setLocal(prev => ({ ...prev, [field]: value }));
    if (field === 'current_hp') {
      onTokenHpChange?.(value);
    } else {
      onSave({ [field]: value });
    }
  }

  const hitDiceQty  = Number(creature.hit_dice_qty)  || 0;
  const hitDiceType = creature.hit_dice_type || '';
  const maxHP = creature.hit_points ?? 0;

  let spells = [];
  if (Array.isArray(creature.spells)) spells = creature.spells;
  else if (typeof creature.spells === 'string' && creature.spells.startsWith('[')) {
    try { spells = JSON.parse(creature.spells); } catch { spells = []; }
  }
  const preparedByLevel = new Map();
  for (const s of spells) {
    if (!s.prepared) continue;
    const lvl = s.level ?? 0;
    if (!preparedByLevel.has(lvl)) preparedByLevel.set(lvl, []);
    preparedByLevel.get(lvl).push(s);
  }
  const levels = Array.from(preparedByLevel.keys()).sort((a, b) => a - b);

  return (
    <div className="absolute bottom-36 left-4 z-50 w-80 bg-dnd-panel border border-dnd-gold/40 rounded-xl shadow-2xl overflow-hidden flex flex-col" style={{ maxHeight: '70vh' }}>
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700">
        <span className="text-sm font-semibold text-dnd-gold">Quick Reference</span>
        <button onClick={onClose} className="text-gray-400 hover:text-white text-xs">✕</button>
      </div>
      <div className="p-3 space-y-3 text-sm text-gray-200 overflow-y-auto">
        {/* HP */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 w-14">HP:</span>
          <input
            type="number"
            className="w-16 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-center text-white"
            value={local.current_hp}
            onChange={(e) => patch('current_hp', Math.max(0, parseInt(e.target.value) || 0))}
          />
          <span className="text-xs text-gray-500">/ {maxHP}</span>
        </div>
        {/* Currency */}
        <div className="space-y-1">
          <div className="text-xs text-gray-400">Currency</div>
          <div className="flex items-center gap-2 text-xs">
            {['gp','sp','cp'].map(k => (
              <label key={k} className="flex items-center gap-1">
                <span className={`uppercase ${k === 'gp' ? 'text-yellow-400' : k === 'sp' ? 'text-gray-300' : 'text-orange-400'}`}>{k}</span>
                <input
                  type="number"
                  min={0}
                  className="w-16 bg-gray-700 border border-gray-600 rounded px-1 py-0.5 text-center text-white"
                  value={creature[`currency_${k}`] || 0}
                  onChange={(e) => onSave({ [`currency_${k}`]: Math.max(0, parseInt(e.target.value) || 0) })}
                />
              </label>
            ))}
          </div>
        </div>
        {/* Heroic Inspiration */}
        <label className="flex items-center gap-2 text-xs cursor-pointer">
          <input
            type="checkbox"
            checked={local.heroic_inspiration}
            onChange={(e) => patch('heroic_inspiration', e.target.checked)}
            className="accent-dnd-gold"
          />
          Heroic Inspiration
        </label>
        {/* Concentration */}
        <div className="space-y-1">
          <div className="text-xs text-gray-400">Concentration</div>
          <div className="flex items-center gap-2 text-xs">
            <select
              className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white"
              value={creature.concentrating_on || ''}
              onChange={(e) => onSave({ concentrating_on: e.target.value })}
            >
              <option value="">Not concentrating</option>
              {concentrationOptions.map((s, i) => (
                <option key={s.id ?? i} value={s.name}>{s.name}</option>
              ))}
            </select>
            {creature.concentrating_on && (
              <button
                onClick={() => onSave({ concentrating_on: '' })}
                className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded"
                title="Drop concentration"
              >Drop</button>
            )}
          </div>
          {concentrationOptions.length === 0 && (
            <p className="text-[10px] text-gray-500 italic">Add a spell with "concentration" in its Duration to enable.</p>
          )}
        </div>
        {/* Death Saves */}
        <div className="space-y-1">
          <div className="text-xs text-gray-400">Death Saves</div>
          <div className="flex gap-3 text-xs">
            <div className="flex items-center gap-1">
              <span>Pass:</span>
              {[0,1,2].map(i => (
                <input
                  key={`p${i}`}
                  type="checkbox"
                  checked={i < local.death_save_successes}
                  onChange={(e) => patch('death_save_successes', e.target.checked ? local.death_save_successes + 1 : local.death_save_successes - 1)}
                  className="accent-green-500"
                />
              ))}
            </div>
            <div className="flex items-center gap-1">
              <span>Fail:</span>
              {[0,1,2].map(i => (
                <input
                  key={`f${i}`}
                  type="checkbox"
                  checked={i < local.death_save_failures}
                  onChange={(e) => patch('death_save_failures', e.target.checked ? local.death_save_failures + 1 : local.death_save_failures - 1)}
                  className="accent-red-500"
                />
              ))}
            </div>
          </div>
        </div>
        {/* Hit dice */}
        {hitDiceQty > 0 && hitDiceType && (
          <div className="space-y-1">
            <div className="text-xs text-gray-400">Hit Dice ({hitDiceType})</div>
            <div className="flex flex-wrap gap-1 items-center text-xs">
              {Array.from({ length: hitDiceQty }).map((_, i) => (
                <input
                  key={`hd${i}`}
                  type="checkbox"
                  checked={i < local.hit_dice_used}
                  onChange={(e) => patch('hit_dice_used', e.target.checked ? local.hit_dice_used + 1 : local.hit_dice_used - 1)}
                  className="accent-dnd-red"
                />
              ))}
              <span className="ml-1 text-gray-400">{hitDiceQty - local.hit_dice_used}/{hitDiceQty}</span>
            </div>
          </div>
        )}
        {/* Spell slots */}
        {Object.keys(local.spell_slots).some(l => (local.spell_slots[l]?.total || 0) > 0) && (
          <div className="space-y-1">
            <div className="text-xs text-gray-400">Spell Slots</div>
            {[1,2,3,4,5,6,7,8,9].map(l => {
              const slot = local.spell_slots[l];
              if (!slot || !slot.total) return null;
              return (
                <div key={l} className="flex items-center gap-2 text-xs">
                  <span className="w-12 text-gray-500">Lvl {l}:</span>
                  <div className="flex gap-1 flex-wrap">
                    {Array.from({ length: slot.total }).map((_, i) => (
                      <input
                        key={i}
                        type="checkbox"
                        checked={i < (slot.used || 0)}
                        onChange={(e) => {
                          const next = { ...local.spell_slots, [l]: { ...slot, used: e.target.checked ? (slot.used || 0) + 1 : (slot.used || 0) - 1 } };
                          patch('spell_slots', next);
                        }}
                        className="accent-purple-500"
                      />
                    ))}
                  </div>
                  <span className="text-gray-500">{slot.total - (slot.used || 0)}/{slot.total}</span>
                </div>
              );
            })}
          </div>
        )}
        {/* Prepared spells */}
        {levels.length > 0 && (
          <div className="space-y-1">
            <div className="text-xs text-gray-400">Prepared Spells</div>
            <div className="space-y-0.5">
              {levels.map(lvl => {
                const lvlSpells = preparedByLevel.get(lvl).filter(s => s.name);
                return (
                  <div key={lvl} className="text-xs">
                    <span className="text-gray-500">{lvl === 0 ? 'Cantrips' : `Lvl ${lvl}`}:</span>{' '}
                    {lvlSpells.map((s, i) => (
                      <React.Fragment key={s.id ?? `${lvl}-${i}`}>
                        <button
                          onClick={() => setViewSpell(s)}
                          className="text-dnd-gold hover:text-yellow-200 underline underline-offset-2 transition-colors"
                          title="View spell details"
                        >
                          {s.name}
                        </button>
                        {i < lvlSpells.length - 1 ? ', ' : ''}
                      </React.Fragment>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {viewSpell && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setViewSpell(null)}
        >
          <div
            className="bg-dnd-panel border border-dnd-gold/40 rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700 sticky top-0 bg-dnd-panel">
              <span className="text-sm font-semibold text-dnd-gold">
                {viewSpell.level === 0 ? 'Cantrip' : `Level ${viewSpell.level} Spell`}
              </span>
              <button onClick={() => setViewSpell(null)} className="text-gray-400 hover:text-white text-sm">✕</button>
            </div>
            <div className="p-3">
              <SpellBox
                spell={viewSpell}
                typeLabel={viewSpell.type === 'combat' ? '⚔ Combat' : viewSpell.type === 'utility' ? '◈ Utility' : undefined}
                typeColor={viewSpell.type === 'combat' ? 'text-red-400' : viewSpell.type === 'utility' ? 'text-blue-400' : undefined}
                darkTheme
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


// ── SVG icon components ───────────────────────────────────────────────────────
const XIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" className="w-4 h-4">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const SwordIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <path d="M14.5 3.5l6 6-10 10-2.5-2.5L18 7 14.5 3.5z" /><path d="M3 21l3-3M9.5 14.5l-3 3" />
  </svg>
);
const PersonIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full p-1">
    <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8H4z" />
  </svg>
);
const MonsterIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full p-1">
    <path d="M12 2l1.5 3H17l-2.5 2 1 3L12 8.5 8.5 10l1-3L7 5h3.5L12 2z" />
    <path d="M7 13c-2.2 0-4 1.5-4 4.5h18C21 14.5 19.2 13 17 13l-5-2-5 2z" />
  </svg>
);
const DiceIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
    <rect x="2" y="2" width="20" height="20" rx="4" />
    <circle cx="7" cy="7" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="17" cy="7" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="7" cy="17" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="17" cy="17" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
  </svg>
);
const BookIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M4 19.5A2.5 2.5 0 016.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
  </svg>
);
const CharacterIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    <path d="M15 4.5c1 0 2 .5 2.5 1.5" strokeWidth={1.2} />
  </svg>
);
const TorchIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <path d="M8 2l1 6-3-2 1 4-3-1 3 4h8l3-4-3 1 1-4-3 2 1-6-7 0z" fill="currentColor" stroke="none" opacity="0.7" />
    <line x1="12" y1="13" x2="12" y2="22" strokeWidth={2.5} />
  </svg>
);
const CandleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" className="w-4 h-4">
    <ellipse cx="12" cy="5" rx="2" ry="3" fill="currentColor" stroke="none" opacity="0.6" />
    <rect x="9" y="8" width="6" height="13" rx="1" /><line x1="12" y1="8" x2="12" y2="21" strokeWidth={1} stroke="white" opacity="0.4" />
  </svg>
);
const LanternIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <path d="M9 2h6v2L17 6v12l-2 2H9l-2-2V6l2-2V2z" />
    <circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none" opacity="0.7" />
    <line x1="12" y1="2" x2="12" y2="1" />
  </svg>
);
const NoLightIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" className="w-4 h-4">
    <circle cx="12" cy="12" r="9" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const LightBulbIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <path d="M9 21h6M12 3a6 6 0 016 6c0 2.2-1.2 4.1-3 5.2V17H9v-2.8A6 6 0 0112 3z" />
  </svg>
);
const ExpandIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M8 3H5a2 2 0 00-2 2v3M16 3h3a2 2 0 012 2v3M8 21H5a2 2 0 01-2-2v-3M16 21h3a2 2 0 002-2v-3" />
  </svg>
);
const CompressIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7" />
  </svg>
);
const CoinIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" className="w-6 h-6">
    <circle cx="12" cy="12" r="9" /><path d="M12 7v10M9 9.5c0-1.4 1.3-2.5 3-2.5s3 1.1 3 2.5-1.3 2.5-3 2.5-3 1.1-3 2.5 1.3 2.5 3 2.5 3-1.1 3-2.5" />
  </svg>
);
const MapIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10">
    <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" /><line x1="8" y1="2" x2="8" y2="18" /><line x1="16" y1="6" x2="16" y2="22" />
  </svg>
);
const DownloadIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 inline mr-1">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
  </svg>
);
const PencilIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 inline mr-1">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);
const ScrollIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 inline mr-1">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" /><path d="M14 2v6h6M9 13h6M9 17h4" />
  </svg>
);
const SpinnerIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="w-10 h-10 animate-spin">
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
  </svg>
);
const WarningIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 inline mr-1">
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);
import { useSearchParams, useNavigate } from 'react-router-dom';
import socket from '../socket.js';
import MapStage, { TOKEN_SIZES } from './MapStage.jsx';
import DiceRoller, { DiceRollOverlay } from './DiceRoller.jsx';
import ToolPanel from './ToolPanel.jsx';
import CreatureForm from './CreatureForm.jsx';
import StatBlock from './StatBlock.jsx';
import ActionsReference from './ActionsReference.jsx';

function PlayerCombatStrip({ sortedCombat, combatTurn, combatDisplayNames }) {
  const scrollRef = useRef(null);
  useEffect(() => {
    if (!scrollRef.current) return;
    const el = scrollRef.current.querySelector('[data-current="true"]');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [combatTurn]);

  return (
    <div className="shrink-0 flex items-end bg-gray-900/90 border-b border-yellow-600/40 z-20" style={{ height: 76 }}>
      <span className="text-yellow-400 shrink-0 mb-2.5 px-3"><SwordIcon /></span>
      <div ref={scrollRef} className="flex items-end gap-2 overflow-x-auto min-w-0 flex-1 pb-1.5 pr-3">
        {sortedCombat.map((t, i) => {
          const isCurrent = i === combatTurn % sortedCombat.length;
          const displayName = combatDisplayNames[i];
          const imgUrl = t.image_path
            ? `/uploads/${t.image_path}`
            : t.creature_image
            ? `/uploads/${t.creature_image}`
            : t.is_player
            ? '/uploads/creatures/default_player.png'
            : null;
          const size = isCurrent ? 52 : 34;
          return (
            <div key={t.id} className="flex flex-col items-center gap-0.5 shrink-0" style={{ width: 60 }} data-current={isCurrent ? 'true' : undefined}>
              <div
                className="relative rounded-full overflow-hidden transition-all duration-300"
                style={{
                  width: size, height: size,
                  border: isCurrent ? '2.5px solid #fbbf24' : '2px solid #4b5563',
                  boxShadow: isCurrent ? '0 0 12px 3px rgba(251,191,36,0.45)' : 'none',
                }}
              >
                {imgUrl ? (
                  <img src={imgUrl} alt={t.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-base"
                    style={{ background: t.is_player ? '#4338ca' : '#374151' }}>
                    {t.is_player ? <PersonIcon /> : <MonsterIcon />}
                  </div>
                )}
                <div className="absolute bottom-0 right-0 bg-black/80 text-yellow-300 font-bold leading-none rounded-tl"
                  style={{ fontSize: 9, padding: '1px 3px' }}>
                  {t.initiative}
                </div>
              </div>
              <span className="truncate text-center leading-tight transition-all duration-300"
                style={{ maxWidth: 58, fontSize: isCurrent ? 11 : 9, color: isCurrent ? '#fde68a' : '#9ca3af', fontWeight: isCurrent ? 600 : 400 }}>
                {displayName}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function PlayerView() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const code = searchParams.get('code') || '';
  const name = searchParams.get('name') || 'Adventurer';
  const hpParam = parseInt(searchParams.get('hp') || '20', 10);
  const sizeParam = searchParams.get('size') || 'medium';
  const creatureIdParam = searchParams.get('creatureId') ? parseInt(searchParams.get('creatureId'), 10) : null;

  const [session, setSession] = useState(null);
  const [tokens, setTokens] = useState([]);
  const [diceRolls, setDiceRolls] = useState([]);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);
  const [showDice, setShowDice] = useState(false);
  const [selectedToken, setSelectedToken] = useState(null);
  const [activeTool, setActiveTool] = useState('move');
  const [gridColor, setGridColor] = useState('rgba(0,0,0,0.35)');
  const [gridThickness, setGridThickness] = useState(0.7);
  const [combatActive, setCombatActive] = useState(false);
  const [combatTurn, setCombatTurn] = useState(0);
  const [userColors, setUserColors] = useState({});
  const [playerTokenId, setPlayerTokenId] = useState(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [myCreature, setMyCreature] = useState(null);
  const [showCharacterEdit, setShowCharacterEdit] = useState(false);
  const [showActionsRef, setShowActionsRef] = useState(false);
  const [sheetTab, setSheetTab] = useState('edit');
  const [showQuickRef, setShowQuickRef] = useState(false);
  const [walls, setWalls] = useState([]);
  const [doors, setDoors] = useState([]);
  const [lights, setLights] = useState([]);
  const [magicalDarkness, setMagicalDarkness] = useState([]);
  const [fowEnabled, setFowEnabled] = useState(false);
  const [fowBlur, setFowBlur] = useState(16);
  const [ambientLight, setAmbientLight] = useState('bright');
  const [torchPreset, setTorchPreset] = useState(0); // 0=None 1=Candle 2=Torch 3=Lantern
  const [showLightMenu, setShowLightMenu] = useState(false);
  const rollIdRef = useRef(0);
  const playerTokenCreated = useRef(false);
  const activeSoundsRef = useRef([]); // array of AudioBufferSourceNode
  const audioCtxRef = useRef(null);
  const ambientSrcRef  = useRef(null);
  const ambientGainRef = useRef(null);
  const [centerOnMapPoint, setCenterOnMapPoint] = useState(null);
  const hasCenteredRef = useRef(false);
  const [treasureNotif, setTreasureNotif] = useState(null);
  const [remoteMeasurements, setRemoteMeasurements] = useState([]);

  // Create the AudioContext immediately and resume it on the first user gesture.
  // This ensures it's in 'running' state before the DM ever triggers a sound,
  // so socket-triggered playback works without requiring a tap from the player.
  useEffect(() => {
    audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    function unlock() {
      if (audioCtxRef.current?.state === 'suspended') {
        audioCtxRef.current.resume();
      }
    }
    document.addEventListener('pointerdown', unlock);
    document.addEventListener('keydown', unlock);
    return () => {
      document.removeEventListener('pointerdown', unlock);
      document.removeEventListener('keydown', unlock);
      audioCtxRef.current?.close();
    };
  }, []);

  // Centre the map on the player token once on load.
  useEffect(() => {
    if (hasCenteredRef.current || !playerTokenId || !tokens.length || !session) return;
    const t = tokens.find(tok => tok.id === playerTokenId);
    if (!t) return;
    hasCenteredRef.current = true;
    const gs  = session.grid_size || 50;
    const mW  = session.map_width  || 2000;
    const mH  = session.map_height || 1500;
    const offX = gs > 0 ? (mW % gs) / 2 : 0;
    const offY = gs > 0 ? (mH % gs) / 2 : 0;
    const sz  = TOKEN_SIZES[t.size] || TOKEN_SIZES.medium;
    setCenterOnMapPoint({
      x: offX + Number(t.grid_col) * gs + (sz.gridW * gs) / 2,
      y: offY + Number(t.grid_row) * gs + (sz.gridH * gs) / 2,
    });
  }, [playerTokenId, tokens, session]);

  // Fetch creature data for the character sheet
  useEffect(() => {
    if (!creatureIdParam) return;
    fetch(`/api/creatures/${creatureIdParam}`)
      .then((r) => r.json())
      .then((data) => { if (!data.error) setMyCreature(data); })
      .catch(() => {});
  }, [creatureIdParam]);

  useEffect(() => {
    function onFsChange() {
      setFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  useEffect(() => {
    if (!code) { navigate('/'); return; }

    socket.connect();

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('join_session', { sessionCode: code, role: 'player', name });
    });

    socket.on('session_joined', ({ state, userColors: uc }) => {
      setSession(state.session);
      setTokens(state.tokens.filter((t) => !t.is_hidden));
      setWalls(state.walls || []);
      setDoors(state.doors || []);
      setLights(state.lights || []);
      setMagicalDarkness(state.magicalDarkness || []);
      setFowEnabled(state.session.fow_enabled || false);
      setFowBlur(state.session.fow_blur ?? 16);
      setAmbientLight(state.session.ambient_light || 'bright');
      if (state.session.grid_color) setGridColor(state.session.grid_color);
      if (state.session.grid_thickness != null) setGridThickness(state.session.grid_thickness);
      setCombatActive(state.session.combat_active || false);
      setCombatTurn(state.session.combat_turn || 0);
      if (uc) setUserColors(uc);

      if (!playerTokenCreated.current) {
        playerTokenCreated.current = true;
        socket.emit('create_player_token', {
          sessionId: state.session.id,
          playerName: name,
          maxHp: hpParam,
          size: sizeParam,
          creatureId: creatureIdParam,
        });
      }
    });

    socket.on('player_token_ready', ({ tokenId }) => {
      setPlayerTokenId(tokenId);
    });

    socket.on('error', ({ message }) => setError(message));

    socket.on('token_moved', ({ tokenId, gridCol, gridRow }) => {
      setTokens((prev) =>
        prev.map((t) => (t.id === tokenId ? { ...t, grid_col: gridCol, grid_row: gridRow } : t))
      );
    });

    socket.on('token_hp_changed', ({ tokenId, currentHp }) => {
      setTokens((prev) =>
        prev.map((t) => (t.id === tokenId ? { ...t, current_hp: currentHp } : t))
      );
    });

    socket.on('token_max_hp_changed', ({ tokenId, maxHp }) => {
      setTokens((prev) =>
        prev.map((t) => (t.id === tokenId ? { ...t, max_hp: maxHp } : t))
      );
    });

    socket.on('token_temp_hp_changed', ({ tokenId, tempHp }) => {
      setTokens((prev) =>
        prev.map((t) => (t.id === tokenId ? { ...t, temp_hp: tempHp } : t))
      );
    });

    socket.on('token_conditions_changed', ({ tokenId, conditions }) => {
      setTokens((prev) =>
        prev.map((t) => (t.id === tokenId ? { ...t, conditions } : t))
      );
    });

    socket.on('token_initiative_changed', ({ tokenId, initiative }) => {
      setTokens((prev) =>
        prev.map((t) => (t.id === tokenId ? { ...t, initiative } : t))
      );
    });

    socket.on('token_visibility_changed', ({ tokenId, isHidden }) => {
      if (isHidden) {
        setTokens((prev) => prev.filter((t) => t.id !== tokenId));
      }
    });

    socket.on('token_added', ({ token }) => {
      if (!token.is_hidden) {
        setTokens((prev) => {
          if (prev.find((t) => t.id === token.id)) return prev;
          return [...prev, token];
        });
      }
    });

    socket.on('token_refreshed', ({ token }) => {
      setTokens((prev) => prev.map((t) => t.id === token.id ? { ...t, ...token } : t));
    });

    socket.on('token_removed', ({ tokenId }) => {
      setTokens((prev) => prev.filter((t) => t.id !== tokenId));
    });

    socket.on('token_size_changed', ({ tokenId, size }) => {
      setTokens((prev) =>
        prev.map((t) => (t.id === tokenId ? { ...t, size } : t))
      );
    });

    socket.on('token_name_changed', ({ tokenId, name: tokenName }) => {
      setTokens((prev) =>
        prev.map((t) => (t.id === tokenId ? { ...t, name: tokenName } : t))
      );
    });

    socket.on('token_nickname_changed', ({ tokenId, nickname }) => {
      setTokens((prev) =>
        prev.map((t) => (t.id === tokenId ? { ...t, nickname } : t))
      );
    });

    socket.on('map_changed', ({ map, walls: newWalls, doors: newDoors, lights: newLights, tokens: newTokens, magicalDarkness: newDarkness }) => {
      setSession((prev) => map ? ({
        ...prev,
        map_id: map.id,
        map_image: map.image_path,
        map_name: map.name,
        map_width: map.width,
        map_height: map.height,
        ...(map.grid_size ? { grid_size: map.grid_size } : {}),
      }) : ({ ...prev, map_id: null, map_image: null, map_name: null }));
      setWalls(newWalls  || []);
      setDoors(newDoors  || []);
      setLights(newLights || []);
      setTokens((newTokens || []).filter(t => !t.is_hidden));
      setMagicalDarkness(newDarkness || []);
    });

    socket.on('wall_added',   ({ wall })   => setWalls(prev => [...prev, wall]));
    socket.on('wall_deleted', ({ wallId }) => setWalls(prev => prev.filter(w => w.id !== wallId)));
    socket.on('walls_cleared', ()          => setWalls([]));

    socket.on('door_added',      ({ door })   => setDoors(prev => [...prev, door]));
    socket.on('door_deleted',    ({ doorId }) => setDoors(prev => prev.filter(d => d.id !== doorId)));
    socket.on('door_toggled',    ({ doorId, isOpen }) =>
      setDoors(prev => prev.map(d => d.id === doorId ? { ...d, is_open: isOpen } : d)));
    socket.on('door_dir_flipped', ({ doorId, openDir }) =>
      setDoors(prev => prev.map(d => d.id === doorId ? { ...d, open_dir: openDir } : d)));
    socket.on('doors_cleared', () => setDoors([]));

    socket.on('light_added',   ({ light })   => setLights(prev => [...prev, light]));
    socket.on('light_updated', ({ light })   => setLights(prev => prev.map(l => l.id === light.id ? light : l)));
    socket.on('light_deleted', ({ lightId }) => setLights(prev => prev.filter(l => l.id !== lightId)));
    socket.on('lights_cleared', ()           => setLights([]));

    socket.on('magical_darkness_added',   ({ darkness }) => setMagicalDarkness(prev => [...prev, darkness]));
    socket.on('magical_darkness_deleted', ({ darknessId }) => setMagicalDarkness(prev => prev.filter(d => d.id !== darknessId)));
    socket.on('magical_darkness_cleared', () => setMagicalDarkness([]));
    socket.on('zone_feather_updated', ({ darknessId, featherAmount }) =>
      setMagicalDarkness(prev => prev.map(d => d.id === darknessId ? { ...d, feather_amount: featherAmount } : d)));

    socket.on('play_sound', ({ filename, volume }) => {
      const vol = Math.max(0, Math.min(1, volume ?? 1.0));

      function doPlay() {
        const ctx = audioCtxRef.current;
        return ctx.resume()
          .then(() => fetch(`/sounds/${filename.split('/').map(encodeURIComponent).join('/')}`))
          .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.arrayBuffer(); })
          .then(buf => ctx.decodeAudioData(buf))
          .then(decoded => {
            const src = ctx.createBufferSource();
            const gain = ctx.createGain();
            gain.gain.value = vol;
            src.buffer = decoded;
            src.connect(gain);
            gain.connect(ctx.destination);
            src.start(0);
            activeSoundsRef.current.push(src);
            src.addEventListener('ended', () => {
              activeSoundsRef.current = activeSoundsRef.current.filter(s => s !== src);
            });
          })
          .catch(console.error);
      }

      doPlay();
    });

    socket.on('stop_sounds', () => {
      activeSoundsRef.current.forEach(src => { try { src.stop(); } catch (_) {} });
      activeSoundsRef.current = [];
    });

    socket.on('play_ambient', ({ filename, volume }) => {
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      const vol = Math.max(0, Math.min(1, volume ?? 0.5));
      const FADE = 2;

      function startAmbient(decoded) {
        const src  = ctx.createBufferSource();
        const gain = ctx.createGain();
        src.buffer = decoded;
        src.loop   = true;
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + FADE);
        src.connect(gain);
        gain.connect(ctx.destination);
        src.start(0);
        ambientSrcRef.current  = src;
        ambientGainRef.current = gain;
      }

      // Fade out any existing ambient then start new track
      if (ambientSrcRef.current && ambientGainRef.current) {
        const oldGain = ambientGainRef.current;
        const oldSrc  = ambientSrcRef.current;
        ambientSrcRef.current  = null;
        ambientGainRef.current = null;
        oldGain.gain.setValueAtTime(oldGain.gain.value, ctx.currentTime);
        oldGain.gain.linearRampToValueAtTime(0, ctx.currentTime + FADE);
        oldSrc.stop(ctx.currentTime + FADE);
      }

      ctx.resume()
        .then(() => fetch(`/sounds/ambient/${encodeURIComponent(filename)}`))
        .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.arrayBuffer(); })
        .then(buf => ctx.decodeAudioData(buf))
        .then(startAmbient)
        .catch(console.error);
    });

    socket.on('stop_ambient', () => {
      const ctx = audioCtxRef.current;
      if (!ctx || !ambientSrcRef.current) return;
      const FADE = 2;
      const gain = ambientGainRef.current;
      const src  = ambientSrcRef.current;
      ambientSrcRef.current  = null;
      ambientGainRef.current = null;
      gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + FADE);
      src.stop(ctx.currentTime + FADE);
    });

    socket.on('fow_changed',           ({ enabled })      => setFowEnabled(enabled));
    socket.on('fow_blur_changed',      ({ blur })         => setFowBlur(blur));
    socket.on('ambient_light_changed', ({ ambientLight: al }) => setAmbientLight(al));
    socket.on('token_vision_changed',  ({ tokenId, senses, visionType: vt, visionRange: vr }) => {
      setTokens(prev => prev.map(t => {
        if (t.id !== tokenId) return t;
        if (senses !== undefined) return { ...t, senses };
        return { ...t, vision_type: vt, vision_range: vr };
      }));
    });
    socket.on('token_light_changed', ({ tokenId, brightFt, dimFt, color }) => {
      setTokens(prev => prev.map(t => t.id === tokenId ? {
        ...t,
        token_light_bright: brightFt,
        token_light_dim: dimFt,
        ...(color !== undefined ? { token_light_color: color } : {}),
      } : t));
    });
    socket.on('token_flying_changed', ({ tokenId, isFlying }) => {
      setTokens(prev => prev.map(t => t.id === tokenId ? { ...t, is_flying: isFlying } : t));
    });

    socket.on('grid_size_changed', ({ gridSize }) => {
      setSession((prev) => ({ ...prev, grid_size: gridSize }));
    });

    socket.on('grid_style_changed', ({ gridColor: gc, gridThickness: gt }) => {
      if (gc) setGridColor(gc);
      if (gt != null) setGridThickness(gt);
    });

    socket.on('combat_changed', ({ active, currentTurn, tokenIds }) => {
      setCombatActive(active);
      setCombatTurn(currentTurn);
      if (!active) {
        setTokens((prev) => prev.map((t) => ({ ...t, in_combat: false })));
      } else if (Array.isArray(tokenIds)) {
        const idSet = new Set(tokenIds);
        setTokens((prev) => prev.map((t) => ({ ...t, in_combat: idSet.has(t.id) })));
      }
    });

    socket.on('combat_turn_changed', ({ currentTurn }) => {
      setCombatTurn(currentTurn);
    });

    socket.on('treasure_received', ({ creatureId, items, newInventory }) => {
      if (creatureId === creatureIdParam) {
        setMyCreature(prev => prev ? { ...prev, inventory: newInventory } : prev);
        setTreasureNotif(items.map(it => ({ type: 'item', ...it })));
        setTimeout(() => setTreasureNotif(null), 6000);
      }
    });

    socket.on('currency_received', ({ creatureId, gp, sp, cp, newGp, newSp, newCp }) => {
      if (creatureId === creatureIdParam) {
        setMyCreature(prev => prev ? { ...prev, currency_gp: newGp, currency_sp: newSp, currency_cp: newCp } : prev);
        const parts = [gp && `${gp} GP`, sp && `${sp} SP`, cp && `${cp} CP`].filter(Boolean);
        setTreasureNotif([{ type: 'currency', name: parts.join(', ') }]);
        setTimeout(() => setTreasureNotif(null), 6000);
      }
    });

    socket.on('user_color_changed', ({ name: n, color }) => {
      setUserColors((prev) => ({ ...prev, [n]: color }));
    });

    socket.on('dice_rolled', (data) => {
      const id = ++rollIdRef.current;
      const roll = { ...data, id };
      setDiceRolls((prev) => [...prev, roll]);
      setTimeout(() => setDiceRolls((prev) => prev.filter((r) => r.id !== id)), 5000);
    });

    socket.on('measure_update', ({ meas, color, name: senderName }) => {
      setRemoteMeasurements(prev => {
        const filtered = prev.filter(m => m.name !== senderName);
        if (!meas) return filtered;
        return [...filtered, { name: senderName, meas, color }];
      });
    });

    socket.on('disconnect', () => setConnected(false));

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [code, name]);

  useEffect(() => {
    function onKey(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === '1') setActiveTool('pan');
      if (e.key === '2') setActiveTool('move');
      if (e.key === '3') setActiveTool('ruler');
      if (e.key === '4') setActiveTool('cone');
      if (e.key === '5') setActiveTool('circle');
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const BASE_TORCH_PRESETS = [
    { label: 'No Light', Icon: NoLightIcon,  brightFt: 0,  dimFt: 0,  requiredItem: null },
    { label: 'Candle',   Icon: CandleIcon,   brightFt: 0,  dimFt: 5,  requiredItem: 'candle' },
    { label: 'Torch',    Icon: TorchIcon,    brightFt: 20, dimFt: 40, requiredItem: 'torch' },
    { label: 'Lantern',  Icon: LanternIcon,  brightFt: 30, dimFt: 60, requiredItem: 'lantern' },
  ];

  // Look up the matching inventory item for a base preset so we can pull its
  // configured light_color (set in the inventory editor). Falls back to amber.
  function itemColorFor(keyword) {
    if (!keyword || !myCreature) return '#fbbf24';
    const inv = Array.isArray(myCreature.inventory) ? myCreature.inventory
      : (typeof myCreature.inventory === 'string'
          ? (() => { try { return JSON.parse(myCreature.inventory); } catch { return []; } })()
          : []);
    const match = inv.find(it => it.name && it.name.toLowerCase().includes(keyword));
    return (match && match.light_color) || '#fbbf24';
  }

  // Returns true if the player's inventory contains an item whose name includes `keyword` (case-insensitive).
  // If no creature is linked (myCreature null), all presets are available as a fallback.
  function hasItem(keyword) {
    if (!keyword) return true;
    if (!myCreature) return true; // no character linked — show all options
    const inv = Array.isArray(myCreature.inventory) ? myCreature.inventory
      : (typeof myCreature.inventory === 'string'
          ? (() => { try { return JSON.parse(myCreature.inventory); } catch { return []; } })()
          : []);
    return inv.some(item => item.name && item.name.toLowerCase().includes(keyword));
  }

  // Append any inventory items that have sheds_light: true as custom presets
  const _inv = myCreature
    ? (Array.isArray(myCreature.inventory) ? myCreature.inventory
        : (typeof myCreature.inventory === 'string'
            ? (() => { try { return JSON.parse(myCreature.inventory); } catch { return []; } })()
            : []))
    : [];
  const _customPresets = _inv
    .filter(item => item.sheds_light && item.name)
    .map(item => ({
      label: item.name,
      Icon: LightBulbIcon,
      brightFt: Number(item.bright_ft) || 0,
      dimFt: Number(item.dim_ft) || 0,
      color: item.light_color || '#fbbf24',
      requiredItem: null,
      custom: true,
    }));
  const TORCH_PRESETS = [
    ...BASE_TORCH_PRESETS.map(p => ({ ...p, color: itemColorFor(p.requiredItem) })),
    ..._customPresets,
  ];

  // Available presets based on current inventory (custom items are always available — they come from inventory)
  const availablePresets = TORCH_PRESETS.filter((p, i) => i === 0 || p.custom || hasItem(p.requiredItem));

  // If the currently selected preset is no longer available (item removed from inventory), reset to No Light
  useEffect(() => {
    const current = TORCH_PRESETS[torchPreset];
    if (!current || (current.requiredItem && !hasItem(current.requiredItem))) {
      setTorchPreset(0);
    }
  }, [myCreature, torchPreset]);

  useEffect(() => {
    if (!playerTokenId) return;
    const preset = TORCH_PRESETS[torchPreset] || TORCH_PRESETS[0];
    const { brightFt, dimFt, color } = preset;
    socket.emit('set_token_light', { tokenId: playerTokenId, brightFt, dimFt, color: color || '#fbbf24' });
  }, [torchPreset, playerTokenId]);

  // Re-emit light state when tab becomes visible — browser may have cleared the
  // canvas or socket may have briefly disconnected while the tab was hidden.
  useEffect(() => {
    if (!playerTokenId) return;
    function onVisible() {
      if (document.visibilityState === 'visible') {
        const preset = TORCH_PRESETS[torchPreset] || TORCH_PRESETS[0];
        const { brightFt, dimFt } = preset;
        socket.emit('set_token_light', { tokenId: playerTokenId, brightFt, dimFt });
      }
    }
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [torchPreset, playerTokenId]);

  function handleTokenMove(tokenId, col, row) {
    setTokens(prev => prev.map(t => t.id === tokenId ? { ...t, grid_col: col, grid_row: row } : t));
    socket.emit('move_token', { tokenId, gridCol: col, gridRow: row });
  }

  function handleDoorToggle(doorId) {
    socket.emit('toggle_door', { doorId });
  }

  function handleToggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
    }
  }

  function handleCharacterSaved(updated) {
    setMyCreature(updated);
    setShowCharacterEdit(false);
    if (playerTokenId) {
      socket.emit('update_player_token_from_creature', {
        tokenId: playerTokenId,
        creatureId: updated.id,
      });
    }
  }

  // Hooks must be called before any conditional returns
  const gridSize = session?.grid_size || 50;

  if (error) {
    return (
      <div className="min-h-screen bg-dnd-dark flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-xl mb-4 flex items-center justify-center gap-2"><WarningIcon />{error}</div>
          <button onClick={() => navigate('/')} className="text-dnd-gold underline">
            Back to lobby
          </button>
        </div>
      </div>
    );
  }

  if (!connected || !session) {
    return (
      <div className="min-h-screen bg-dnd-dark flex items-center justify-center">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 text-dnd-gold"><SpinnerIcon /></div>
          <div className="text-gray-400">Entering the dungeon...</div>
        </div>
      </div>
    );
  }

  const mapUrl  = session.map_image ? `/uploads/${session.map_image}` : null;

  const sortedCombat = [...tokens]
    .filter((t) => !t.is_hidden && t.in_combat)
    .sort((a, b) => (b.initiative ?? 0) - (a.initiative ?? 0));

  const currentCombatTokenId = combatActive && sortedCombat.length > 0
    ? sortedCombat[combatTurn % sortedCombat.length]?.id ?? null
    : null;

  // A/B/C suffixes for duplicate names in combat tracker
  const combatNameCounts = {};
  for (const t of sortedCombat) {
    const base = t.nickname || t.name;
    combatNameCounts[base] = (combatNameCounts[base] || 0) + 1;
  }
  const combatNameSeen = {};
  const combatDisplayNames = sortedCombat.map((t) => {
    const base = t.nickname || t.name;
    if (combatNameCounts[base] <= 1) return base;
    combatNameSeen[base] = (combatNameSeen[base] || 0);
    const suffix = String.fromCharCode(65 + combatNameSeen[base]);
    combatNameSeen[base]++;
    return `${base} ${suffix}`;
  });

  return (
    <div className="relative w-full h-full overflow-hidden bg-gray-900 flex flex-col">
      {/* Combat tracker strip */}
      {combatActive && sortedCombat.length > 0 && (
        <PlayerCombatStrip
          sortedCombat={sortedCombat}
          combatTurn={combatTurn}
          combatDisplayNames={combatDisplayNames}
        />
      )}

      {/* Map area */}
      <div className="flex-1 relative overflow-hidden">
        <ToolPanel activeTool={activeTool} onToolChange={setActiveTool} />

        <MapStage
          mapUrl={mapUrl}
          mapWidth={session.map_width}
          mapHeight={session.map_height}
          gridSize={gridSize}
          tokens={tokens}
          isPlayer
          onTokenMove={handleTokenMove}
          selectedTokenId={selectedToken}
          onTokenSelect={setSelectedToken}
          activeTool={activeTool}
          gridColor={gridColor}
          gridThickness={gridThickness}
          playerTokenId={playerTokenId}
          walls={walls}
          doors={doors}
          lights={lights}
          magicalDarkness={magicalDarkness}
          fogOfWar={fowEnabled}
          fowBlur={fowBlur}
          ambientLight={ambientLight}
          onDoorToggle={handleDoorToggle}
          centerOnMapPoint={centerOnMapPoint}
          currentCombatTokenId={currentCombatTokenId}
          onMeasureChange={(meas) => socket.emit('measure_update', { meas, color: userColors[name] || '#60a5fa' })}
          remoteMeasurements={remoteMeasurements}
        />

        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-3 py-2 bg-gradient-to-b from-black/70 to-transparent pointer-events-none">
          <div className="pointer-events-auto">
            <span className="text-dnd-gold font-semibold text-sm">{session.name}</span>
            {session.map_name && <span className="text-gray-400 text-xs ml-2">— {session.map_name}</span>}
          </div>
          <div className="flex items-center gap-2 pointer-events-auto">
            <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'}`} />
            <span
              className="text-xs font-medium"
              style={{ color: userColors[name] || 'rgb(209,213,219)' }}
            >
              {name}
            </span>
          </div>
        </div>

        {/* Dice button */}
        <button
          onClick={() => setShowDice(!showDice)}
          className="absolute bottom-4 left-4 z-40 bg-dnd-red hover:bg-red-700 text-white rounded-full w-14 h-14 text-2xl shadow-lg flex items-center justify-center transition-transform active:scale-95"
        >
          <DiceIcon />
        </button>

        {/* Actions reference button */}
        <button
          onClick={() => setShowActionsRef(true)}
          className="absolute bottom-32 left-4 z-40 bg-gray-800/90 hover:bg-gray-700 text-white rounded-full w-10 h-10 text-lg shadow-lg flex items-center justify-center"
          title="Actions Reference"
        >
          <BookIcon />
        </button>

        {/* Character sheet button */}
        {myCreature && (
          <button
            onClick={() => setShowCharacterEdit(true)}
            className="absolute bottom-20 left-4 z-40 bg-gray-800/90 hover:bg-gray-700 text-white rounded-full w-10 h-10 text-lg shadow-lg flex items-center justify-center"
            title="My Character"
          >
            <CharacterIcon />
          </button>
        )}

        {/* Quick reference popup button */}
        {myCreature && (
          <button
            onClick={() => setShowQuickRef(v => !v)}
            className="absolute bottom-20 left-16 z-40 bg-gray-800/90 hover:bg-gray-700 text-dnd-gold rounded-full w-10 h-10 text-lg shadow-lg flex items-center justify-center"
            title="Quick Reference (HP, spells, hit dice, death saves)"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </button>
        )}

        {/* Light source flyout — only shown when the player has at least one
            light item in their inventory (or no character is linked yet) */}
        {playerTokenId && availablePresets.length > 1 && (
          <div className="absolute bottom-32 left-4 z-40">
            {/* Flyout options — appear above the button */}
            {showLightMenu && (
              <div className="absolute bottom-12 left-0 flex flex-col gap-1 items-start">
                {availablePresets.map((preset) => {
                  const globalIdx = TORCH_PRESETS.indexOf(preset);
                  return (
                    <button
                      key={globalIdx}
                      onClick={() => { setTorchPreset(globalIdx); setShowLightMenu(false); }}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm shadow-lg whitespace-nowrap transition-colors ${
                        torchPreset === globalIdx
                          ? 'bg-yellow-600 text-yellow-100'
                          : 'bg-gray-800/95 hover:bg-gray-700 text-gray-200'
                      }`}
                    >
                      {preset.Icon && <preset.Icon />}
                      <span>{preset.label}</span>
                      {preset.brightFt > 0 || preset.dimFt > 0 ? (
                        <span className="text-xs text-gray-400 ml-1">
                          {preset.brightFt > 0 ? `${preset.brightFt}ft bright / ` : ''}{preset.dimFt}ft dim
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}
            {/* Main button */}
            <button
              onClick={() => setShowLightMenu(m => !m)}
              title="Light source"
              className={`rounded-full w-10 h-10 text-lg shadow-lg flex items-center justify-center transition-colors ${
                torchPreset === 0
                  ? 'bg-gray-800/90 hover:bg-gray-700 text-gray-400'
                  : 'bg-yellow-600/90 hover:bg-yellow-500 text-yellow-100'
              }`}
            >
              {(() => { const p = TORCH_PRESETS[torchPreset] || TORCH_PRESETS[0]; return p.Icon ? <p.Icon /> : null; })()}
            </button>
          </div>
        )}

        {/* Fullscreen button */}
        <button
          onClick={handleToggleFullscreen}
          className="absolute bottom-4 right-4 z-40 bg-gray-800/80 hover:bg-gray-700 text-white rounded-full w-10 h-10 text-lg shadow-lg flex items-center justify-center"
          title="Toggle fullscreen"
        >
          {fullscreen ? <CompressIcon /> : <ExpandIcon />}
        </button>

        {/* Quick Reference popup */}
        {showQuickRef && myCreature && (
          <QuickReferencePanel
            creature={myCreature}
            playerToken={tokens.find(t => t.id === playerTokenId) || null}
            onClose={() => setShowQuickRef(false)}
            onTokenHpChange={(hp) => {
              if (!playerTokenId) return;
              socket.emit('update_token_hp', { tokenId: playerTokenId, currentHp: hp });
            }}
            onSave={async (patch) => {
              try {
                const fd = new FormData();
                for (const [k, v] of Object.entries(patch)) {
                  fd.append(k, typeof v === 'object' ? JSON.stringify(v) : v);
                }
                const res = await fetch(`/api/creatures/${myCreature.id}`, { method: 'PUT', body: fd });
                const updated = await res.json();
                if (updated && !updated.error) setMyCreature(updated);
              } catch (err) { console.error('Quick ref save failed', err); }
            }}
          />
        )}

        {/* Dice panel */}
        {showDice && (
          <div className="absolute bottom-20 left-4 z-40 bg-dnd-panel border border-gray-600 rounded-xl p-4 w-80 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-dnd-gold font-semibold">Dice Roller</h3>
              <button onClick={() => setShowDice(false)} className="text-gray-400 hover:text-white flex items-center"><XIcon /></button>
            </div>
            <DiceRoller rolls={diceRolls} isPlayer />
          </div>
        )}

        <DiceRollOverlay rolls={diceRolls} />

        {/* Treasure received notification */}
        {treasureNotif && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-yellow-900/95 border border-yellow-600 rounded-xl px-4 py-3 shadow-2xl max-w-xs w-full mx-4 pointer-events-auto">
            <div className="flex items-start gap-2">
              <span className="text-yellow-400"><CoinIcon /></span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-yellow-200">
                  {treasureNotif[0]?.type === 'currency' ? 'You received currency!' : 'You received treasure!'}
                </div>
                <ul className="mt-1 space-y-0.5">
                  {treasureNotif.map((it, i) => (
                    <li key={i} className="text-xs text-yellow-100">{it.qty > 1 ? `${it.qty}× ` : ''}{it.name}{it.desc ? ` — ${it.desc}` : ''}</li>
                  ))}
                </ul>
              </div>
              <button onClick={() => setTreasureNotif(null)} className="text-yellow-400 hover:text-yellow-200 flex items-center"><XIcon /></button>
            </div>
          </div>
        )}


        {!mapUrl && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center text-gray-500">
              <div className="mb-3 text-gray-600"><MapIcon /></div>
              <div>Waiting for the Dungeon Master to set the map...</div>
            </div>
          </div>
        )}
      </div>

      {/* Actions reference modal */}
      {showActionsRef && <ActionsReference onClose={() => setShowActionsRef(false)} />}

      {/* Character edit modal */}
      {showCharacterEdit && myCreature && (
        <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center p-4 print-backdrop">
          <div
            className="bg-dnd-panel border border-gray-700 rounded-xl w-full max-w-2xl flex flex-col overflow-hidden print-sheet"
            style={{ height: '85vh' }}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 shrink-0 no-print">
              <div className="flex items-center gap-1">
                <h3 className="text-dnd-gold font-semibold mr-2">My Character</h3>
                <button
                  onClick={() => setSheetTab('edit')}
                  className={`text-xs px-3 py-1 rounded-lg transition-colors ${sheetTab === 'edit' ? 'bg-dnd-red text-white' : 'text-gray-400 hover:text-white border border-gray-700'}`}
                >
                  <PencilIcon />Edit
                </button>
                <button
                  onClick={() => setSheetTab('sheet')}
                  className={`text-xs px-3 py-1 rounded-lg transition-colors ${sheetTab === 'sheet' ? 'bg-dnd-red text-white' : 'text-gray-400 hover:text-white border border-gray-700'}`}
                >
                  <ScrollIcon />Sheet
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  title="Export / Print as PDF"
                  className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 px-2.5 py-1 rounded-lg transition-colors"
                >
                  <DownloadIcon />PDF
                </button>
                <button
                  onClick={() => setShowCharacterEdit(false)}
                  className="text-gray-400 hover:text-white flex items-center"
                >
                  <XIcon />
                </button>
              </div>
            </div>
            {/* Edit tab */}
            {sheetTab === 'edit' && (
              <div className="flex-1 overflow-hidden no-print">
                <CreatureForm
                  creature={myCreature}
                  onSave={handleCharacterSaved}
                  onCancel={() => setShowCharacterEdit(false)}
                  submitLabel="Save Character"
                  isPlayerCharacter={true}
                />
              </div>
            )}
            {/* Sheet tab — stat block with roll buttons */}
            {sheetTab === 'sheet' && (
              <div className="flex-1 overflow-y-auto no-print">
                <StatBlock
                  creature={myCreature}
                  onRoll={({ label, dice, count, modifier }) => {
                    socket.emit('roll_dice', { dice, count, modifier, label });
                  }}
                />
              </div>
            )}
            {/* Stat block — only shown during print */}
            <div className="print-only">
              <StatBlock creature={myCreature} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
