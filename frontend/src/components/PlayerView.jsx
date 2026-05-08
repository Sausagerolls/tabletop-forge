import React, { useState, useEffect, useRef } from 'react';
import { SpellBox } from './StatBlock.jsx';
import { computeHitDicePool } from '../utils/classes.js';

function WhisperPopup({ whisper, onClose }) {
  useEffect(() => {
    const id = setTimeout(onClose, 12000);
    return () => clearTimeout(id);
  }, [whisper.id, onClose]);
  return (
    <div
      className="bg-purple-900/95 border border-purple-500 rounded-xl px-4 py-3 shadow-2xl cursor-pointer hover:bg-purple-900 transition-colors"
      onClick={onClose}
      title="Click to dismiss"
    >
      <div className="text-[10px] uppercase tracking-wider text-purple-300 mb-0.5 flex items-center gap-1.5">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        GM whispers to you
      </div>
      <div className="text-sm text-purple-50 whitespace-pre-wrap break-words">
        {whisper.message}
      </div>
    </div>
  );
}

function NotesModal({ creature, onClose, onSave }) {
  const [text, setText] = useState(creature.player_notes || '');
  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-dnd-panel border border-dnd-gold/40 rounded-xl shadow-2xl w-full max-w-xl flex flex-col"
        style={{ maxHeight: '80vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700">
          <span className="text-sm font-semibold text-dnd-gold">Notes — {creature.name}</span>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-sm">✕</button>
        </div>
        <textarea
          className="flex-1 m-3 bg-gray-800 border border-gray-700 rounded p-3 text-sm text-gray-100 resize-none focus:outline-none focus:border-dnd-gold"
          placeholder="Session notes, NPCs you've met, plot threads, leftover puzzle clues…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => { if (text !== (creature.player_notes || '')) onSave(text); }}
          style={{ minHeight: 320 }}
        />
        <div className="px-3 pb-3 text-xs text-gray-500 italic">Saves automatically when you click outside the box.</div>
      </div>
    </div>
  );
}

function QuickReferencePanel({ creature, playerToken, onClose, onSave, onTokenHpChange, onTokenTempHpChange }) {
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
    temp_hp: Number(playerToken?.temp_hp) || 0,
    hit_dice_used_by_type: (creature.hit_dice_used_by_type && typeof creature.hit_dice_used_by_type === 'object')
      ? { ...creature.hit_dice_used_by_type } : {},
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
      temp_hp: Number(playerToken?.temp_hp) || 0,
      hit_dice_used_by_type: (creature.hit_dice_used_by_type && typeof creature.hit_dice_used_by_type === 'object')
        ? { ...creature.hit_dice_used_by_type } : {},
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
    } else if (field === 'temp_hp') {
      onTokenTempHpChange?.(value);
    } else {
      onSave({ [field]: value });
    }
  }

  const hitDicePool = computeHitDicePool(creature) || [];
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

  // Per-ability spellcasting summary (mod / attack / save DC).
  const profBonus = creature.proficiency_bonus ?? 2;
  const abilityKeyMap = { STR: 'strength', DEX: 'dexterity', CON: 'constitution', INT: 'intelligence', WIS: 'wisdom', CHA: 'charisma' };
  const usedAbilities = Array.from(new Set(
    spells.map(s => (s.casting_ability || '').toUpperCase()).filter(a => abilityKeyMap[a])
  ));

  return (
    <div className="absolute bottom-36 left-4 z-50 w-80 bg-dnd-panel border border-dnd-gold/40 rounded-xl shadow-2xl overflow-hidden flex flex-col" style={{ maxHeight: '70vh' }}>
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700">
        <span className="text-sm font-semibold text-dnd-gold">Quick Reference</span>
        <button onClick={onClose} className="text-gray-400 hover:text-white text-xs">✕</button>
      </div>
      <div className="p-3 space-y-3 text-sm text-gray-200 overflow-y-auto">
        {/* HP + Temp HP */}
        <div className="flex items-center gap-2 flex-wrap">
          <label className="flex items-center gap-2">
            <span className="text-xs text-gray-400 w-10">HP:</span>
            <input
              type="number"
              className="w-16 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-center text-white"
              value={local.current_hp}
              onChange={(e) => patch('current_hp', Math.max(0, parseInt(e.target.value) || 0))}
            />
            <span className="text-xs text-gray-500">/ {maxHP}</span>
          </label>
          <label className="flex items-center gap-2">
            <span className="text-xs text-cyan-300">Temp:</span>
            <input
              type="number"
              min={0}
              className="w-14 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-center text-white"
              value={local.temp_hp}
              onChange={(e) => patch('temp_hp', Math.max(0, parseInt(e.target.value) || 0))}
            />
          </label>
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
        {/* Hit dice — one row per die type. Toggle a checkbox to spend
            (or restore) that specific type. */}
        {hitDicePool.length > 0 && (
          <div className="space-y-1">
            <div className="text-xs text-gray-400">Hit Dice</div>
            {hitDicePool.map(({ type, qty }) => {
              const used = Math.max(0, Math.min(qty, Number(local.hit_dice_used_by_type?.[type]) || 0));
              return (
                <div key={type} className="flex flex-wrap gap-1 items-center text-xs">
                  <span className="font-mono text-gray-300 w-12">{qty}{type}</span>
                  {Array.from({ length: qty }).map((_, i) => (
                    <input
                      key={`${type}-${i}`}
                      type="checkbox"
                      checked={i < used}
                      onChange={(e) => {
                        const next = e.target.checked ? Math.min(qty, used + 1) : Math.max(0, used - 1);
                        const map = { ...(local.hit_dice_used_by_type || {}), [type]: next };
                        patch('hit_dice_used_by_type', map);
                      }}
                      className="accent-dnd-red"
                    />
                  ))}
                  <span className="ml-1 text-gray-400">{qty - used}/{qty}</span>
                </div>
              );
            })}
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
        {/* Spellcasting summary */}
        {usedAbilities.length > 0 && (
          <div className="space-y-1">
            <div className="text-xs text-gray-400">Spellcasting</div>
            <div className="bg-gray-800/60 border border-gray-700 rounded p-2 space-y-1 text-[11px]">
              {usedAbilities.map(ab => {
                const score = creature[abilityKeyMap[ab]] ?? 10;
                const m = Math.floor((score - 10) / 2);
                const saveDC = 8 + profBonus + m;
                const atkBonus = m + profBonus;
                return (
                  <div key={ab} className="flex flex-wrap gap-x-3 gap-y-0.5">
                    <span className="font-semibold text-dnd-gold">{ab}</span>
                    <span><span className="text-gray-500">Mod:</span> <span className="font-mono">{m >= 0 ? '+' : ''}{m}</span></span>
                    <span><span className="text-gray-500">Atk:</span> <span className="font-mono">{atkBonus >= 0 ? '+' : ''}{atkBonus}</span></span>
                    <span><span className="text-gray-500">Save DC:</span> <span className="font-mono">{saveDC}</span></span>
                  </div>
                );
              })}
            </div>
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
import CharacterSetup from './CharacterSetup.jsx';
import socket from '../socket.js';
import { loadPlugins, registries as pluginRegistries, useRegistryVersion } from '../plugins/pluginRegistry.js';
import { CustomClassesProvider } from '../plugins/customClassesProvider.js';
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

  // Player setup. The legacy deep-link path is "the GM gave you a URL
  // with ?name=… and ?creatureId=… already filled in" — those skip the
  // setup screen entirely. Everyone else goes through CharacterSetup
  // below: pick an existing character owned by their player name, or
  // build a new one inline. Result lives in `setup`; the socket-connect
  // effect below only fires once `setup.ready` is true.
  const SETUP_KEY = code ? `dndvtt_player_setup_${code}` : null;
  const queryName = searchParams.get('name');
  const queryCreature = searchParams.get('creatureId') ? parseInt(searchParams.get('creatureId'), 10) : null;
  const queryHp = parseInt(searchParams.get('hp') || '20', 10);
  const querySize = searchParams.get('size') || 'medium';
  // Preview mode: the GM's player-preview plugin opens this view in an
  // iframe with `?previewTokenId=<existing token>` so the iframe can
  // bind to a token that already exists on the map instead of asking
  // the server to spawn another one. When set, we:
  //   - skip the create_player_token emit (no new session_token row)
  //   - set playerTokenId directly to the supplied id so MapStage's
  //     fog-of-war / vision math runs from the real player's token
  //   - bypass CharacterSetup entirely (deep-link semantics)
  const previewTokenId = searchParams.get('previewTokenId') ? parseInt(searchParams.get('previewTokenId'), 10) : null;
  const [setup, setSetup] = useState(() => {
    // Preview mode is observe-only — bypass character setup so the
    // GM doesn't have to fake a name + creature in the iframe URL.
    if (previewTokenId || queryName) {
      return {
        ready: true,
        name: queryName || 'Preview',
        creatureId: queryCreature,
        maxHp: queryHp,
        size: querySize,
      };
    }
    let remembered = null;
    try { remembered = SETUP_KEY ? JSON.parse(localStorage.getItem(SETUP_KEY) || 'null') : null; } catch {}
    return {
      ready: false,
      name: remembered?.name || '',
      creatureId: remembered?.creatureId || null,
      maxHp: remembered?.maxHp || 20,
      size: remembered?.size || 'medium',
    };
  });
  const name = setup.name || 'Adventurer';
  const hpParam = setup.maxHp;
  const sizeParam = setup.size;
  const creatureIdParam = setup.creatureId;

  const [session, setSession] = useState(null);
  const [tokens, setTokens] = useState([]);
  // Spell templates are read-only from the player's perspective — broadcast
  // by the server but never mutable from this client. Tracked here so plugin
  // overlays (animated elemental effects) render on the player's map too.
  const [spellTemplates, setSpellTemplates] = useState([]);
  const [diceRolls, setDiceRolls] = useState([]);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [showDice, setShowDice] = useState(false);
  const [selectedToken, setSelectedToken] = useState(null);
  const [activeTool, setActiveTool] = useState('move');
  const [gridColor, setGridColor] = useState('rgba(0,0,0,0.35)');
  const [gridThickness, setGridThickness] = useState(0.7);
  const [tokenNameFontSize, setTokenNameFontSize] = useState(45);
  const [combatActive, setCombatActive] = useState(false);
  const [combatTurn, setCombatTurn] = useState(0);
  const [userColors, setUserColors] = useState({});
  const [playerTokenId, setPlayerTokenId] = useState(null);
  const playerTokenIdRef = useRef(null);
  useEffect(() => { playerTokenIdRef.current = playerTokenId; }, [playerTokenId]);
  // Tracked separately from the `tokens` array because that array is
  // filtered server-side to the session's *current* map. When the GM
  // switches maps, our own token can drop out of the array even though
  // the row still exists in the DB on its previous map. Without this
  // state, the auto-follow rule loses the token's map_id and the
  // player's view incorrectly snaps to whatever the GM is viewing.
  const [ownTokenMapId, setOwnTokenMapId] = useState(null);
  // Mirror to a ref so socket handlers (registered once at mount) can
  // read the latest value without re-binding.
  const ownTokenMapIdRef = useRef(null);
  useEffect(() => { ownTokenMapIdRef.current = ownTokenMapId; }, [ownTokenMapId]);
  // Effective rendered map id, mirrored to a ref so socket handlers
  // (registered once) can read the latest value when filtering audio
  // events by map.
  const effectiveMapIdRef = useRef(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [myCreature, setMyCreature] = useState(null);
  const [showCharacterEdit, setShowCharacterEdit] = useState(false);
  const [showActionsRef, setShowActionsRef] = useState(false);
  const [sheetTab, setSheetTab] = useState('edit');
  const [showQuickRef, setShowQuickRef] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const QUICK_CTRL_ORDER_KEY = 'dndvtt_player_quick_ctrl_order_v1';
  const [quickCtrlOrder, setQuickCtrlOrder] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(QUICK_CTRL_ORDER_KEY) || 'null');
      if (Array.isArray(stored)) return stored;
    } catch {}
    return [];
  });
  function reorderQuickCtrl(fromId, toId, available) {
    setQuickCtrlOrder((prev) => {
      const orderIdx = new Map(prev.map((id, i) => [id, i]));
      const sorted = [...available].sort((a, b) => {
        const ai = orderIdx.has(a) ? orderIdx.get(a) : Infinity;
        const bi = orderIdx.has(b) ? orderIdx.get(b) : Infinity;
        if (ai !== bi) return ai - bi;
        return available.indexOf(a) - available.indexOf(b);
      });
      const fromIdx = sorted.indexOf(fromId);
      const toIdx = sorted.indexOf(toId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      sorted.splice(fromIdx, 1);
      const newToIdx = sorted.indexOf(toId);
      sorted.splice(newToIdx, 0, fromId);
      try { localStorage.setItem(QUICK_CTRL_ORDER_KEY, JSON.stringify(sorted)); } catch {}
      return sorted;
    });
  }
  const [concentrationPrompt, setConcentrationPrompt] = useState(null); // { dc, damage, spellName, conSaveBonus }
  const [handout, setHandout] = useState(null); // { title, body, imageUrl, sentAt }
  const [walls, setWalls] = useState([]);
  const [doors, setDoors] = useState([]);
  const [lights, setLights] = useState([]);
  const [magicalDarkness, setMagicalDarkness] = useState([]);
  // Per-player map override — set by the split-the-party plugin via the
  // `playerMapOverride` registry. When non-null, this is the full map
  // slice fetched from /api/maps/:id/state and the rendered scene
  // overrides the session's current map without disturbing it. Real-
  // time socket events for the override map are merged into this
  // snapshot; events for any other map fall through to the session
  // state buckets above (where they're held until the override clears).
  // Terrain pieces visible on the player's current effective map.
  // Server filters out hidden-until-revealed pieces before they're
  // sent here, so any item we receive is renderable.
  const [terrain, setTerrain] = useState([]);
  const [overrideMap, setOverrideMap] = useState(null);
  const overrideMapRef = useRef(null);
  useEffect(() => { overrideMapRef.current = overrideMap; }, [overrideMap]);
  // Bumped to force a refetch of the override slice without changing
  // the resolved override map id — used when a token arrives on the
  // map we're currently viewing as our override and we need its
  // creature-image join from the server.
  const [overrideRefetchKey, setOverrideRefetchKey] = useState(0);
  // GM-set map override for this player by name (Split the Party,
  // native). Pinned by the GM via the Session-tab UI. Wins over the
  // auto-follow-token rule below; cleared by the GM, sent as null.
  const [dmAssignedMapId, setDmAssignedMapId] = useState(null);
  // Cross-map transition state. Bumped opaque the moment the resolved
  // map id changes, then faded clear ~600ms later so the new scene
  // can mount behind the overlay before the player sees it. Skips the
  // first resolution so the initial load doesn't flash black.
  const registryVersion = useRegistryVersion();
  const [mapFadeOpacity, setMapFadeOpacity] = useState(0);
  // Helper used by every code path that's about to swap the rendered
  // map. Snaps the overlay to opaque, defers the caller's state update
  // until the fade-out finishes (so the new scene mounts behind a
  // fully-black overlay), then fades the overlay clear. Uses refs
  // captured at call time so re-renders during the transition don't
  // strand pending timeouts.
  const startMapTransition = (applyChange) => {
    setMapFadeOpacity(1);
    setTimeout(() => {
      applyChange();
      setTimeout(() => setMapFadeOpacity(0), 100);
    }, 350);
  };
  // Keep the effective-map ref in sync so socket handlers below can
  // filter audio events by map without depending on render-time state.
  // Also tell the server which map we're rendering — backend routes
  // per-map ambient based on this so we pick up whatever's playing on
  // a map when we Send-to or auto-follow into it mid-session.
  useEffect(() => {
    const eid = (overrideMap?.mapId ?? session?.map_id) ?? null;
    effectiveMapIdRef.current = eid;
    if (eid != null) socket.emit('set_player_active_map_id', { mapId: eid });
  }, [overrideMap?.mapId, session?.map_id]);

  // Re-centre the map on the player's own token after every map
  // transition (GM "Send to" pipeline, manual override change,
  // auto-follow on GM map switch). The first centering is handled by
  // the one-time center-on-load effect further down; this effect only
  // re-centres on *subsequent* effective map changes.
  const lastCenteredMapIdRef = useRef(null);
  useEffect(() => {
    if (!playerTokenId || !session) return;
    const renderedMapId = (overrideMap?.mapId ?? session.map_id) ?? null;
    if (renderedMapId == null) return;
    if (lastCenteredMapIdRef.current === null) {
      lastCenteredMapIdRef.current = renderedMapId;
      return;
    }
    if (lastCenteredMapIdRef.current === renderedMapId) return;
    lastCenteredMapIdRef.current = renderedMapId;
    const tokenList = overrideMap ? overrideMap.tokens : tokens;
    const own = tokenList.find((t) => t.id === playerTokenId);
    if (!own) return;
    const gs = (overrideMap?.map?.grid_size) || session.grid_size || 50;
    const mW = (overrideMap?.map?.width)     || session.map_width  || 2000;
    const mH = (overrideMap?.map?.height)    || session.map_height || 1500;
    const offX = gs > 0 ? (mW % gs) / 2 : 0;
    const offY = gs > 0 ? (mH % gs) / 2 : 0;
    const sz = TOKEN_SIZES[own.size] || TOKEN_SIZES.medium;
    setCenterOnMapPoint({
      x: offX + Number(own.grid_col) * gs + (sz.gridW * gs) / 2,
      y: offY + Number(own.grid_row) * gs + (sz.gridH * gs) / 2,
    });
  }, [overrideMap, session?.map_id, session?.grid_size, tokens, playerTokenId]);

  // Override-fetch effect — placed up here above the early returns so
  // it runs unconditionally on every render (Rules of Hooks). Reads
  // the resolver result inline rather than via a derived const so we
  // don't need to lift `desiredOverrideMapId` too. Bails out cleanly
  // when there's no session yet.
  useEffect(() => {
    if (!session?.id) return;
    let desired = null;
    for (const fn of pluginRegistries.playerMapOverride.values()) {
      try {
        const v = fn({ sessionId: session.id, playerTokenId, defaultMapId: session.map_id });
        if (v != null) {
          const n = Number(v);
          if (Number.isFinite(n) && n !== session.map_id) { desired = n; break; }
        }
      } catch {}
    }
    if (desired == null && dmAssignedMapId != null && dmAssignedMapId !== session.map_id) {
      desired = dmAssignedMapId;
    }
    if (desired == null && ownTokenMapId != null && ownTokenMapId !== session.map_id) {
      // Auto-follow our own token's map. Tracked via a dedicated state
      // so a GM map switch (which drops our token from the broadcast
      // `tokens` array) doesn't cause us to lose track of where our
      // token actually lives.
      desired = ownTokenMapId;
    }
    if (desired == null) {
      // Override clears: if we were rendering an override slice that
      // pointed somewhere other than the session map, fade through
      // black before flipping to session-map mode. Same-map clears
      // (e.g. plugin retracts an override that matched the session
      // map) just drop the snapshot without a flash.
      const hadOverride = overrideMapRef.current != null;
      const sameAsSession = overrideMapRef.current?.mapId === session.map_id;
      if (!hadOverride || sameAsSession) {
        setOverrideMap(null);
      } else {
        startMapTransition(() => setOverrideMap(null));
      }
      return;
    }
    let cancelled = false;
    fetch(`/api/maps/${desired}/state?session_id=${session.id}`)
      .then((r) => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then((data) => {
        if (cancelled) return;
        const newSlice = {
          mapId: desired,
          map: data.map,
          walls: data.walls || [],
          doors: data.doors || [],
          lights: data.lights || [],
          magicalDarkness: data.magicalDarkness || [],
          dmMarkers: data.dmMarkers || [],
          tokens: (data.tokens || []).filter((t) => !t.is_hidden),
          spawnPoint: data.spawnPoint || { col: 0, row: 0 },
        };
        // Same-map refetch (token added on this map, refetch key bump,
        // etc.) — pass through without a fade.
        const prevId = overrideMapRef.current?.mapId ?? null;
        const noVisibleChange = prevId === newSlice.mapId
          || (prevId == null && session?.map_id === newSlice.mapId);
        if (noVisibleChange) {
          setOverrideMap(newSlice);
        } else {
          startMapTransition(() => setOverrideMap(newSlice));
        }
      })
      .catch((err) => {
        if (cancelled) return;
        console.warn('Map-override fetch failed:', err.message);
        setOverrideMap(null);
      });
    return () => { cancelled = true; };
  }, [session?.id, session?.map_id, playerTokenId, dmAssignedMapId, ownTokenMapId, registryVersion, overrideRefetchKey]);
  // ── Override snapshot patchers ─────────────────────────────────────
  // Each socket-event handler below mirrors changes into the override
  // snapshot when the event's map_id matches what the player is
  // currently routed to. Calls are no-ops when no override is active,
  // so handlers don't need to branch — they always call both the
  // session setter and the override patcher.
  function appendOverrideField(field, item) {
    if (!item || item.map_id == null) return;
    setOverrideMap((prev) => prev && prev.mapId === item.map_id
      ? { ...prev, [field]: [...prev[field], item] } : prev);
  }
  function patchOverrideField(field, predicate, mutator) {
    setOverrideMap((prev) => prev
      ? { ...prev, [field]: prev[field].map((x) => predicate(x) ? mutator(x) : x) }
      : prev);
  }
  function removeOverrideField(field, predicate) {
    setOverrideMap((prev) => prev
      ? { ...prev, [field]: prev[field].filter((x) => !predicate(x)) }
      : prev);
  }
  function clearOverrideField(field) {
    setOverrideMap((prev) => prev ? { ...prev, [field]: [] } : prev);
  }
  function patchOverrideToken(tokenId, mutator) {
    setOverrideMap((prev) => {
      if (!prev) return prev;
      const idx = prev.tokens.findIndex((t) => t.id === tokenId);
      if (idx === -1) return prev;
      const next = { ...prev, tokens: [...prev.tokens] };
      next.tokens[idx] = mutator(next.tokens[idx]);
      return next;
    });
  }
  function addOverrideToken(token) {
    if (!token || token.map_id == null || token.is_hidden) return;
    setOverrideMap((prev) => {
      if (!prev || prev.mapId !== token.map_id) return prev;
      if (prev.tokens.some((t) => t.id === token.id)) {
        return { ...prev, tokens: prev.tokens.map((t) => t.id === token.id ? { ...t, ...token } : t) };
      }
      return { ...prev, tokens: [...prev.tokens, token] };
    });
  }
  function removeOverrideToken(tokenId) {
    setOverrideMap((prev) => prev
      ? { ...prev, tokens: prev.tokens.filter((t) => t.id !== tokenId) }
      : prev);
  }

  // Live-tracked refs the player bridge reads via getters.
  const sessionRef = useRef(session);
  useEffect(() => { sessionRef.current = session; }, [session]);
  // ── Player-side bridge ────────────────────────────────────────────
  // Surfaces the player's name + token id so a plugin (split-the-party)
  // can look up its assignment without re-parsing setup props. The
  // plugin drives the override via `pluginRegistries.playerMapOverride`
  // — it sets a getter, calls notifyChange(), and the override-resolution
  // memo above re-runs. The `overrideMapId` getter lets plugin UIs
  // surface the currently-rendered map.
  useEffect(() => {
    const ns = (window.__tabletopForge = window.__tabletopForge || {});
    ns.player = {
      getName: () => name,
      getTokenId: () => playerTokenIdRef.current,
      getOverrideMapId: () => overrideMapRef.current?.mapId ?? null,
      getEffectiveMapId: () => overrideMapRef.current?.mapId ?? (sessionRef.current?.map_id ?? null),
    };
    return () => { if (window.__tabletopForge) delete window.__tabletopForge.player; };
  }, [name]);
  const [fowEnabled, setFowEnabled] = useState(false);
  const [fowBlur, setFowBlur] = useState(16);
  const [fowColor, setFowColor] = useState('#000000');
  const [ambientLight, setAmbientLight] = useState('bright');
  const [torchPreset, setTorchPreset] = useState(0); // 0=None 1=Candle 2=Torch 3=Lantern
  const [showLightMenu, setShowLightMenu] = useState(false);
  const rollIdRef = useRef(0);
  const playerTokenCreated = useRef(false);
  const activeSoundsRef = useRef([]); // array of AudioBufferSourceNode
  const audioCtxRef = useRef(null);
  // Layered ambient playback. The GM can stack multiple ambient
  // loops on a map ("Forest" + "Bird Song" + "Wind Blowing") to build
  // a scene; each track has its own AudioBufferSourceNode + GainNode.
  // wantedAmbientsRef tracks which filenames the user/GM still wants
  // playing — checked inside the async fetch→decode pipeline so a
  // stop issued mid-load doesn't accidentally start the track once
  // the buffer arrives.
  const ambientTracksRef  = useRef(new Map()); // filename -> { src, gain }
  const wantedAmbientsRef = useRef(new Set()); // filename set
  const [centerOnMapPoint, setCenterOnMapPoint] = useState(null);
  const hasCenteredRef = useRef(false);
  const [treasureNotif, setTreasureNotif] = useState(null);
  const [whispers, setWhispers] = useState([]);
  const [remoteMeasurements, setRemoteMeasurements] = useState([]);

  // Create the AudioContext immediately and resume it on the first user gesture.
  // This ensures it's in 'running' state before the GM ever triggers a sound,
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
    // Wait until the player has finished CharacterSetup (or a deep-link
    // pre-filled the data). Without this gate the socket connects with
    // a placeholder name and the server creates a 20-HP nameless token
    // before the player has had a chance to pick their character.
    if (!setup.ready) return;

    socket.connect();

    socket.on('connect', () => {
      setConnected(true);
      setReconnectAttempt(0);
      // Re-emit on every connect (including reconnect) — the server
      // treats join_session as idempotent and re-hydrates state.
      socket.emit('join_session', { sessionCode: code, role: 'player', name });
    });
    socket.io.on('reconnect_attempt', (n) => setReconnectAttempt(n));
    socket.io.on('reconnect_failed', () => setReconnectAttempt(-1));

    // GM rotated the session code. The server has already disconnected
    // us; show a notice and bounce to the lobby so the player can rejoin
    // with whatever new link the GM sends.
    socket.on('session_code_changed', () => {
      setError('The GM rotated the session code. Ask them for the new join link.');
      setTimeout(() => navigate('/'), 2500);
    });

    socket.on('session_joined', ({ state, userColors: uc }) => {
      setSession(state.session);
      setSpellTemplates(Array.isArray(state.spellTemplates) ? state.spellTemplates : []);
      // Load enabled plugins as soon as we know the session id. Errors are
      // isolated per plugin and ignored on the player side — players see no
      // plugin manager UI; the GM resolves any issues from their side.
      loadPlugins({ context: { sessionId: state.session.id, role: 'player', socket } });
      setTokens(state.tokens.filter((t) => !t.is_hidden));
      setTerrain(state.terrain || []);
      // Pick up our own GM-set override on join. The server keys these
      // by player name, so a reconnect with the same name re-applies
      // automatically.
      const overrides = state.playerMapOverrides || {};
      setDmAssignedMapId(overrides[name] != null ? Number(overrides[name]) : null);
      setWalls(state.walls || []);
      setDoors(state.doors || []);
      setLights(state.lights || []);
      setMagicalDarkness(state.magicalDarkness || []);
      setFowEnabled(state.session.fow_enabled || false);
      setFowBlur(state.session.fow_blur ?? 16);
      setFowColor(state.session.fow_color || '#000000');
      setAmbientLight(state.session.ambient_light || 'bright');
      if (state.session.grid_color) setGridColor(state.session.grid_color);
      if (state.session.grid_thickness != null) setGridThickness(state.session.grid_thickness);
      if (state.session.token_name_font_size != null) setTokenNameFontSize(state.session.token_name_font_size);
      setCombatActive(state.session.combat_active || false);
      setCombatTurn(state.session.combat_turn || 0);
      if (uc) setUserColors(uc);

      if (!playerTokenCreated.current) {
        playerTokenCreated.current = true;
        if (previewTokenId) {
          // Preview mode — bind to the existing token instead of asking
          // the server to create a new one. MapStage uses playerTokenId
          // as the FoW / vision origin, so the iframe ends up rendering
          // the real player's view of the map.
          setPlayerTokenId(previewTokenId);
        } else {
          socket.emit('create_player_token', {
            sessionId: state.session.id,
            playerName: name,
            maxHp: hpParam,
            size: sizeParam,
            creatureId: creatureIdParam,
          });
        }
      }
    });

    socket.on('player_token_ready', ({ tokenId, mapId }) => {
      setPlayerTokenId(tokenId);
      if (mapId !== undefined) setOwnTokenMapId(mapId == null ? null : Number(mapId));
    });

    socket.on('error', ({ message }) => setError(message));

    socket.on('token_moved', ({ tokenId, gridCol, gridRow }) => {
      setTokens((prev) =>
        prev.map((t) => (t.id === tokenId ? { ...t, grid_col: gridCol, grid_row: gridRow } : t))
      );
      patchOverrideToken(tokenId, (t) => ({ ...t, grid_col: gridCol, grid_row: gridRow }));
    });

    // GM pinned us (or someone else) to a specific map. Only react
    // when our own name matches; ignore broadcasts for other players.
    socket.on('player_map_override_changed', ({ playerName, mapId }) => {
      if (playerName !== name) return;
      setDmAssignedMapId(mapId == null ? null : Number(mapId));
    });
    socket.on('player_map_overrides_cleared', () => {
      setDmAssignedMapId(null);
    });

    // Token relocated to a different map. We update our local tokens
    // mirror so the override resolver (further down) can pick up the
    // new map_id; if this token IS our own, the resolver will then
    // route our view to that map. If the override snapshot is currently
    // showing the source or destination, patch it directly so it
    // doesn't go stale before the next refetch.
    socket.on('token_map_changed', ({ tokenId, fromMapId, toMapId, gridCol, gridRow }) => {
      if (tokenId === playerTokenIdRef.current) {
        setOwnTokenMapId(toMapId == null ? null : Number(toMapId));
      }
      setTokens((prev) =>
        prev.map((t) => (t.id === tokenId
          ? { ...t, map_id: toMapId, grid_col: gridCol, grid_row: gridRow }
          : t))
      );
      // Source map (still in our snapshot): drop the row.
      setOverrideMap((prev) => {
        if (!prev) return prev;
        if (prev.mapId === fromMapId) {
          return { ...prev, tokens: prev.tokens.filter((t) => t.id !== tokenId) };
        }
        return prev;
      });
      // Destination map (we're viewing it as our override): bump the
      // refetch key so the override useEffect re-runs and picks up
      // the new token row with its creature-image join.
      if (overrideMapRef.current && overrideMapRef.current.mapId === toMapId) {
        setOverrideRefetchKey((k) => k + 1);
      }
    });

    socket.on('token_hp_changed', ({ tokenId, currentHp }) => {
      setTokens((prev) =>
        prev.map((t) => (t.id === tokenId ? { ...t, current_hp: currentHp } : t))
      );
      patchOverrideToken(tokenId, (t) => ({ ...t, current_hp: currentHp }));
    });

    socket.on('concentration_check', (payload) => {
      // Only the player whose token took the damage gets the prompt.
      if (payload.tokenId !== playerTokenIdRef.current) return;
      setConcentrationPrompt(payload);
    });

    socket.on('handout_received', (payload) => {
      setHandout(payload);
    });

    socket.on('token_max_hp_changed', ({ tokenId, maxHp }) => {
      setTokens((prev) =>
        prev.map((t) => (t.id === tokenId ? { ...t, max_hp: maxHp } : t))
      );
      patchOverrideToken(tokenId, (t) => ({ ...t, max_hp: maxHp }));
    });

    socket.on('token_temp_hp_changed', ({ tokenId, tempHp }) => {
      setTokens((prev) =>
        prev.map((t) => (t.id === tokenId ? { ...t, temp_hp: tempHp } : t))
      );
      patchOverrideToken(tokenId, (t) => ({ ...t, temp_hp: tempHp }));
    });

    socket.on('token_conditions_changed', ({ tokenId, conditions }) => {
      setTokens((prev) =>
        prev.map((t) => (t.id === tokenId ? { ...t, conditions } : t))
      );
      patchOverrideToken(tokenId, (t) => ({ ...t, conditions }));
    });

    socket.on('token_initiative_changed', ({ tokenId, initiative }) => {
      setTokens((prev) =>
        prev.map((t) => (t.id === tokenId ? { ...t, initiative } : t))
      );
      patchOverrideToken(tokenId, (t) => ({ ...t, initiative }));
    });

    socket.on('token_visibility_changed', ({ tokenId, isHidden }) => {
      if (isHidden) {
        setTokens((prev) => prev.filter((t) => t.id !== tokenId));
        removeOverrideToken(tokenId);
      }
    });

    socket.on('token_added', ({ token }) => {
      if (!token.is_hidden) {
        setTokens((prev) => {
          if (prev.find((t) => t.id === token.id)) return prev;
          return [...prev, token];
        });
        addOverrideToken(token);
      }
    });

    socket.on('token_refreshed', ({ token }) => {
      setTokens((prev) => prev.map((t) => t.id === token.id ? { ...t, ...token } : t));
      // Token may have moved between maps — addOverrideToken handles
      // both "already there" (merge) and "newly arrived" cases. If
      // the token's map_id no longer matches the override, evict it.
      if (overrideMapRef.current && token.map_id !== overrideMapRef.current.mapId) {
        removeOverrideToken(token.id);
      } else {
        addOverrideToken(token);
      }
    });

    socket.on('token_removed', ({ tokenId }) => {
      setTokens((prev) => prev.filter((t) => t.id !== tokenId));
      removeOverrideToken(tokenId);
    });

    socket.on('token_size_changed', ({ tokenId, size }) => {
      setTokens((prev) =>
        prev.map((t) => (t.id === tokenId ? { ...t, size } : t))
      );
      patchOverrideToken(tokenId, (t) => ({ ...t, size }));
    });

    socket.on('token_name_changed', ({ tokenId, name: tokenName }) => {
      setTokens((prev) =>
        prev.map((t) => (t.id === tokenId ? { ...t, name: tokenName } : t))
      );
      patchOverrideToken(tokenId, (t) => ({ ...t, name: tokenName }));
    });

    socket.on('token_nickname_changed', ({ tokenId, nickname }) => {
      setTokens((prev) =>
        prev.map((t) => (t.id === tokenId ? { ...t, nickname } : t))
      );
      patchOverrideToken(tokenId, (t) => ({ ...t, nickname }));
    });

    // Live terrain sync — server filters hidden pieces server-side, so
    // any update that lands here is meant for us. No-op if the piece
    // isn't on our currently-rendered map (added/updated will still
    // arrive after a map switch via map_changed).
    socket.on('terrain_added',   ({ terrain: t }) => setTerrain(prev => prev.some(x => x.id === t.id) ? prev : [...prev, t]));
    socket.on('terrain_updated', ({ terrain: t }) => setTerrain(prev => prev.map(x => x.id === t.id ? t : x)));
    socket.on('terrain_removed', ({ id })          => setTerrain(prev => prev.filter(x => x.id !== id)));

    socket.on('map_changed', async ({ map, walls: newWalls, doors: newDoors, lights: newLights, tokens: newTokens, magicalDarkness: newDarkness, terrain: newTerrain }) => {
      setTerrain(newTerrain || []);
      // If our own token sits on a map other than the one the GM just
      // switched to, we'll be auto-following our token's map — and
      // visually nothing should change for us. Pre-fetch our token's
      // map slice and install it as the override BEFORE applying the
      // session.map_id change, so the resolver never sees an
      // "override == null && session.map_id == new" state and the
      // renderer never flashes through the GM's map.
      const targetMapId = ownTokenMapIdRef.current;
      const willAutoFollow = (
        overrideMapRef.current == null
        && targetMapId != null
        && map
        && targetMapId !== map.id
      );
      if (willAutoFollow) {
        try {
          const sid = sessionRef.current?.id;
          if (sid) {
            const r = await fetch(`/api/maps/${targetMapId}/state?session_id=${sid}`);
            if (r.ok) {
              const data = await r.json();
              setOverrideMap({
                mapId: targetMapId,
                map: data.map,
                walls: data.walls || [],
                doors: data.doors || [],
                lights: data.lights || [],
                magicalDarkness: data.magicalDarkness || [],
                dmMarkers: data.dmMarkers || [],
                tokens: (data.tokens || []).filter((t) => !t.is_hidden),
                spawnPoint: data.spawnPoint || { col: 0, row: 0 },
              });
            }
          }
        } catch {}
      }
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

    socket.on('wall_added',   ({ wall })   => {
      setWalls(prev => [...prev, wall]);
      appendOverrideField('walls', wall);
    });
    socket.on('wall_deleted', ({ wallId }) => {
      setWalls(prev => prev.filter(w => w.id !== wallId));
      removeOverrideField('walls', (w) => w.id === wallId);
    });
    socket.on('walls_cleared', () => {
      setWalls([]);
      // walls_cleared is map-scoped server-side but the broadcast carries
      // no map_id; clearing both is conservative and only affects the
      // override map's snapshot if one is active.
      clearOverrideField('walls');
    });

    socket.on('door_added',      ({ door })   => {
      setDoors(prev => [...prev, door]);
      appendOverrideField('doors', door);
    });
    socket.on('door_deleted',    ({ doorId }) => {
      setDoors(prev => prev.filter(d => d.id !== doorId));
      removeOverrideField('doors', (d) => d.id === doorId);
    });
    socket.on('door_toggled',    ({ doorId, isOpen }) => {
      setDoors(prev => prev.map(d => d.id === doorId ? { ...d, is_open: isOpen } : d));
      patchOverrideField('doors', (d) => d.id === doorId, (d) => ({ ...d, is_open: isOpen }));
    });
    socket.on('door_dir_flipped', ({ doorId, openDir }) => {
      setDoors(prev => prev.map(d => d.id === doorId ? { ...d, open_dir: openDir } : d));
      patchOverrideField('doors', (d) => d.id === doorId, (d) => ({ ...d, open_dir: openDir }));
    });
    socket.on('doors_cleared', () => {
      setDoors([]);
      clearOverrideField('doors');
    });

    socket.on('light_added',   ({ light })   => {
      setLights(prev => [...prev, light]);
      appendOverrideField('lights', light);
    });
    socket.on('light_updated', ({ light })   => {
      setLights(prev => prev.map(l => l.id === light.id ? light : l));
      patchOverrideField('lights', (l) => l.id === light.id, () => light);
    });
    socket.on('light_deleted', ({ lightId }) => {
      setLights(prev => prev.filter(l => l.id !== lightId));
      removeOverrideField('lights', (l) => l.id === lightId);
    });
    socket.on('lights_cleared', () => {
      setLights([]);
      clearOverrideField('lights');
    });

    socket.on('magical_darkness_added',   ({ darkness }) => {
      setMagicalDarkness(prev => [...prev, darkness]);
      appendOverrideField('magicalDarkness', darkness);
    });
    socket.on('magical_darkness_deleted', ({ darknessId }) => {
      setMagicalDarkness(prev => prev.filter(d => d.id !== darknessId));
      removeOverrideField('magicalDarkness', (d) => d.id === darknessId);
    });
    socket.on('magical_darkness_cleared', () => {
      setMagicalDarkness([]);
      clearOverrideField('magicalDarkness');
    });
    socket.on('zone_feather_updated', ({ darknessId, featherAmount }) => {
      setMagicalDarkness(prev => prev.map(d => d.id === darknessId ? { ...d, feather_amount: featherAmount } : d));
      patchOverrideField('magicalDarkness', (d) => d.id === darknessId, (d) => ({ ...d, feather_amount: featherAmount }));
    });

    socket.on('play_sound', ({ filename, volume }) => {
      // Backend routes per-map via activeMapId — by the time this
      // handler fires, the event was meant for this map.
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
      // Always honour stop — if we weren't playing anything (because
      // the play was filtered out by map) it's a harmless no-op.
      activeSoundsRef.current.forEach(src => { try { src.stop(); } catch (_) {} });
      activeSoundsRef.current = [];
    });

    // play_ambient is additive: a brand-new filename starts as a fresh
    // layer with a fade-in; an existing filename gets a live volume
    // ramp (so dragging a per-track slider on the GM side is smooth).
    socket.on('play_ambient', ({ filename, volume }) => {
      const ctx = audioCtxRef.current;
      if (!ctx || !filename) return;
      const vol = Math.max(0, Math.min(1, volume ?? 0.5));

      const existing = ambientTracksRef.current.get(filename);
      if (existing) {
        // Live volume update on a track already in the layer.
        const now = ctx.currentTime;
        existing.gain.gain.cancelScheduledValues(now);
        existing.gain.gain.setValueAtTime(existing.gain.gain.value, now);
        existing.gain.gain.linearRampToValueAtTime(vol, now + 0.2);
        return;
      }

      wantedAmbientsRef.current.add(filename);

      ctx.resume()
        .then(() => fetch(`/sounds/ambient/${encodeURIComponent(filename)}`))
        .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.arrayBuffer(); })
        .then(buf => ctx.decodeAudioData(buf))
        .then(decoded => {
          // Cancelled while loading, or another start raced us — drop.
          if (!wantedAmbientsRef.current.has(filename)) return;
          if (ambientTracksRef.current.has(filename)) return;
          const src  = ctx.createBufferSource();
          const gain = ctx.createGain();
          src.buffer = decoded;
          src.loop   = true;
          gain.gain.setValueAtTime(0, ctx.currentTime);
          gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + 2);
          src.connect(gain);
          gain.connect(ctx.destination);
          src.start(0);
          ambientTracksRef.current.set(filename, { src, gain });
        })
        .catch(console.error);
    });

    // Remove a single track from the layer; the rest keep playing.
    socket.on('stop_ambient_track', ({ filename }) => {
      const ctx = audioCtxRef.current;
      if (!ctx || !filename) return;
      wantedAmbientsRef.current.delete(filename);
      const track = ambientTracksRef.current.get(filename);
      if (!track) return;
      ambientTracksRef.current.delete(filename);
      const FADE = 2;
      track.gain.gain.cancelScheduledValues(ctx.currentTime);
      track.gain.gain.setValueAtTime(track.gain.gain.value, ctx.currentTime);
      track.gain.gain.linearRampToValueAtTime(0, ctx.currentTime + FADE);
      try { track.src.stop(ctx.currentTime + FADE); } catch (_) {}
    });

    // Stop every layer (session-wide stop, or local stop on map switch).
    socket.on('stop_ambient', () => {
      const ctx = audioCtxRef.current;
      wantedAmbientsRef.current.clear();
      if (!ctx) { ambientTracksRef.current.clear(); return; }
      const FADE = 2;
      const tracks = Array.from(ambientTracksRef.current.values());
      ambientTracksRef.current.clear();
      for (const t of tracks) {
        t.gain.gain.cancelScheduledValues(ctx.currentTime);
        t.gain.gain.setValueAtTime(t.gain.gain.value, ctx.currentTime);
        t.gain.gain.linearRampToValueAtTime(0, ctx.currentTime + FADE);
        try { t.src.stop(ctx.currentTime + FADE); } catch (_) {}
      }
    });

    socket.on('fow_changed',           ({ enabled })      => setFowEnabled(enabled));
    socket.on('fow_blur_changed',      ({ blur })         => setFowBlur(blur));
    socket.on('fow_color_changed',     ({ color })        => setFowColor(color || '#000000'));
    socket.on('ambient_light_changed', ({ ambientLight: al }) => setAmbientLight(al));
    socket.on('token_vision_changed',  ({ tokenId, senses, visionType: vt, visionRange: vr }) => {
      setTokens(prev => prev.map(t => {
        if (t.id !== tokenId) return t;
        if (senses !== undefined) return { ...t, senses };
        return { ...t, vision_type: vt, vision_range: vr };
      }));
    });
    socket.on('token_light_changed', ({ tokenId, brightFt, dimFt, color, flicker }) => {
      setTokens(prev => prev.map(t => t.id === tokenId ? {
        ...t,
        token_light_bright: brightFt,
        token_light_dim: dimFt,
        ...(color !== undefined ? { token_light_color: color } : {}),
        ...(flicker !== undefined ? { token_light_flicker: flicker } : {}),
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

    socket.on('token_name_font_size_changed', ({ tokenNameFontSize: ts }) => {
      if (Number.isFinite(ts)) setTokenNameFontSize(ts);
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

    socket.on('tokens_added_to_combat', ({ tokenIds }) => {
      const idSet = new Set(tokenIds);
      setTokens((prev) => prev.map((t) => idSet.has(t.id) ? { ...t, in_combat: true } : t));
    });

    // Live spell-template sync. Players never mutate templates; these
    // listeners just keep the read-only list current so plugin overlays
    // (animated fire/water/etc.) reflect the GM's edits in real time.
    socket.on('template_placed',  (tpl) => setSpellTemplates(prev => [...prev, tpl]));
    socket.on('template_updated', (tpl) => setSpellTemplates(prev => prev.map(t => t.id === tpl.id ? tpl : t)));
    socket.on('template_deleted', ({ id }) => setSpellTemplates(prev => prev.filter(t => t.id !== id)));
    socket.on('templates_cleared', () => setSpellTemplates([]));

    socket.on('whisper_received', ({ message, ts }) => {
      const id = `w-${ts}-${Math.random().toString(36).slice(2, 7)}`;
      setWhispers((prev) => [...prev, { id, message, ts }]);
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
  }, [code, name, setup.ready]);

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
    { label: 'No Light', Icon: NoLightIcon,  brightFt: 0,  dimFt: 0,  requiredItem: null,      flicker: false },
    { label: 'Candle',   Icon: CandleIcon,   brightFt: 0,  dimFt: 5,  requiredItem: 'candle',  flicker: true  },
    { label: 'Torch',    Icon: TorchIcon,    brightFt: 20, dimFt: 40, requiredItem: 'torch',   flicker: true  },
    { label: 'Lantern',  Icon: LanternIcon,  brightFt: 30, dimFt: 60, requiredItem: 'lantern', flicker: true  },
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

  // Append any inventory items that have sheds_light: true as custom presets.
  // Skip items whose name already matches a base preset's required-item
  // keyword (Candle / Torch / Lantern) — otherwise adding a "Torch" item
  // with sheds_light=true gives you two Torch entries in the light menu:
  // one from the base preset, one from the custom inventory loop.
  const _inv = myCreature
    ? (Array.isArray(myCreature.inventory) ? myCreature.inventory
        : (typeof myCreature.inventory === 'string'
            ? (() => { try { return JSON.parse(myCreature.inventory); } catch { return []; } })()
            : []))
    : [];
  const _baseKeywords = BASE_TORCH_PRESETS
    .map(p => p.requiredItem)
    .filter(Boolean)
    .map(k => k.toLowerCase());
  const _customPresets = _inv
    .filter(item => {
      if (!item.sheds_light || !item.name) return false;
      const lowerName = item.name.toLowerCase();
      return !_baseKeywords.some(kw => lowerName.includes(kw));
    })
    .map(item => ({
      label: item.name,
      Icon: LightBulbIcon,
      brightFt: Number(item.bright_ft) || 0,
      dimFt: Number(item.dim_ft) || 0,
      color: item.light_color || '#fbbf24',
      // Custom shed-light items default to flicker on, off only when the
      // item explicitly opts out via the inventory editor's Flicker toggle.
      flicker: item.flicker !== false,
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

  // Defer the first set_token_light emit until torchPreset has been
  // synced from the token's actual light state. Without this gate, every
  // page mount (hard refresh, tab restore, preview iframe boot) starts
  // with torchPreset=0 (No Light), the emit effect below fires before
  // the token row has even arrived from the server, and the player's
  // saved torch gets clobbered to 0/0. Server-side state was correct;
  // the client was just overwriting it on every reload.
  // Applies to both normal players (so the GM's stored value survives a
  // refresh) and the preview iframe (so opening the preview doesn't snuff
  // out the real player's torch). Once the flag flips, all subsequent
  // preset changes emit normally.
  const torchSyncedRef = useRef(false);

  useEffect(() => {
    if (!playerTokenId) return;
    if (!torchSyncedRef.current) return;
    const preset = TORCH_PRESETS[torchPreset] || TORCH_PRESETS[0];
    const { brightFt, dimFt, color, flicker } = preset;
    socket.emit('set_token_light', {
      tokenId: playerTokenId,
      brightFt, dimFt,
      color: color || '#fbbf24',
      flicker: flicker !== false,
    });
  }, [torchPreset, playerTokenId]);

  // Re-emit light state when tab becomes visible — browser may have cleared the
  // canvas or socket may have briefly disconnected while the tab was hidden.
  useEffect(() => {
    if (!playerTokenId) return;
    function onVisible() {
      if (document.visibilityState === 'visible') {
        if (!torchSyncedRef.current) return;
        const preset = TORCH_PRESETS[torchPreset] || TORCH_PRESETS[0];
        const { brightFt, dimFt, flicker } = preset;
        socket.emit('set_token_light', {
          tokenId: playerTokenId,
          brightFt, dimFt,
          flicker: flicker !== false,
        });
      }
    }
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [torchPreset, playerTokenId]);

  // Preview mode: on first token + creature load, snap torchPreset to the
  // previewed token's actual light state so the bottom-left light pip
  // reflects what the real player has equipped. Match by brightFt + dimFt
  // against the preset table. Waits for myCreature too because custom
  // shed-light inventory items only join TORCH_PRESETS once the creature
  // loads — without that wait we'd snap to 0 even when the player is
  // holding a custom magical lantern. Once the flag flips, ongoing token
  // updates do NOT re-sync — that would race the GM's clicks (round-trip
  // delays would briefly snap the icon back to the old value).
  useEffect(() => {
    if (!playerTokenId) return;
    if (torchSyncedRef.current) return;
    // Wait for myCreature when the URL points at a creature — its
    // inventory may add custom shed-light presets we'd otherwise miss
    // on the match below.
    if (creatureIdParam && !myCreature) return;
    const tok = tokens.find((t) => t.id === playerTokenId);
    if (!tok) return;
    const tokBright = Number(tok.token_light_bright) || 0;
    const tokDim    = Number(tok.token_light_dim)    || 0;
    const matchIdx = TORCH_PRESETS.findIndex(
      (p) => Math.round(p.brightFt) === Math.round(tokBright)
          && Math.round(p.dimFt)    === Math.round(tokDim)
    );
    if (matchIdx > 0) setTorchPreset(matchIdx);
    torchSyncedRef.current = true;
  }, [playerTokenId, tokens, TORCH_PRESETS, creatureIdParam, myCreature]);

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

  // Character setup: shown the FIRST time a player visits the join
  // link. Once they pick or build a character we stash the result in
  // localStorage keyed by session code so a refresh skips the form.
  // The GM can still hand out deep links with ?name= / ?creatureId=
  // that bypass this entirely (legacy flow).
  if (!setup.ready) {
    return (
      <CharacterSetup
        sessionCode={code}
        initial={setup}
        onComplete={(picked) => {
          try {
            if (SETUP_KEY) localStorage.setItem(SETUP_KEY, JSON.stringify(picked));
          } catch {}
          setSetup({ ready: true, ...picked });
        }}
      />
    );
  }

  // Only show the full-screen entering-the-dungeon spinner BEFORE the
  // first session payload lands. Once `session` is populated, brief
  // socket drops get a small top banner instead of yanking the player
  // out of the live map view.
  if (!session) {
    return (
      <div className="min-h-screen bg-dnd-dark flex items-center justify-center">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 text-dnd-gold"><SpinnerIcon /></div>
          <div className="text-gray-400">
            {reconnectAttempt > 0 ? `Reconnecting (attempt ${reconnectAttempt})…` : 'Entering the dungeon...'}
          </div>
        </div>
      </div>
    );
  }

  // Per-player map override resolution + fetch lives above the early
  // returns so its hook count is consistent across renders.
  // Effective scene values — when an override is active, render its
  // snapshot; otherwise fall through to the session's live state.
  const effectiveMap = overrideMap
    ? {
        id: overrideMap.mapId,
        image: overrideMap.map?.image_path || null,
        width: overrideMap.map?.width,
        height: overrideMap.map?.height,
        gridSize: overrideMap.map?.grid_size || gridSize,
      }
    : {
        id: session.map_id,
        image: session.map_image,
        width: session.map_width,
        height: session.map_height,
        gridSize,
      };
  const mapUrl = effectiveMap.image ? `/uploads/${effectiveMap.image}` : null;
  const effectiveWalls = overrideMap ? overrideMap.walls : walls;
  const effectiveDoors = overrideMap ? overrideMap.doors : doors;
  const effectiveLights = overrideMap ? overrideMap.lights : lights;
  const effectiveDarkness = overrideMap ? overrideMap.magicalDarkness : magicalDarkness;
  const effectiveTokens = overrideMap ? overrideMap.tokens : tokens;

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
      {/* Pumps GM-authored /api/custom/classes data into the
          plugin registries so player-side dropdowns + class-build
          lookups see custom classes alongside the SRD set. */}
      <CustomClassesProvider />
      {/* Reconnect banner — visible while the socket is dropped, hidden
          the moment it reconnects. Player keeps seeing the last-known
          map state instead of being thrown back to the loading screen. */}
      {!connected && (
        <div className="fixed top-2 left-1/2 -translate-x-1/2 z-[1000] bg-yellow-900/90 border border-yellow-600/60 text-yellow-100 px-3 py-1.5 rounded-lg text-xs font-medium shadow-lg flex items-center gap-2 pointer-events-none">
          <span className="inline-block w-2 h-2 rounded-full bg-yellow-300 animate-pulse" />
          {reconnectAttempt < 0
            ? 'Reconnect failed — pull-to-refresh to retry'
            : reconnectAttempt > 0
              ? `Reconnecting (attempt ${reconnectAttempt})…`
              : 'Connection dropped — reconnecting…'}
        </div>
      )}
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

        {/* Map-swap fade overlay — opaque while the new scene mounts,
            then transitions back to clear. Pointer-events disabled so
            it never swallows clicks even briefly. */}
        <div
          className="absolute inset-0 z-30 pointer-events-none bg-black"
          style={{
            opacity: mapFadeOpacity,
            transition: 'opacity 350ms ease-in-out',
          }}
        />

        <MapStage
          mapUrl={mapUrl}
          mapWidth={effectiveMap.width}
          mapHeight={effectiveMap.height}
          gridSize={effectiveMap.gridSize}
          tokens={effectiveTokens}
          isPlayer
          onTokenMove={handleTokenMove}
          selectedTokenId={selectedToken}
          onTokenSelect={setSelectedToken}
          activeTool={activeTool}
          gridColor={gridColor}
          gridThickness={gridThickness}
          tokenNameFontSize={tokenNameFontSize}
          playerTokenId={playerTokenId}
          walls={effectiveWalls}
          doors={effectiveDoors}
          lights={effectiveLights}
          magicalDarkness={effectiveDarkness}
          spellTemplates={spellTemplates}
          fogOfWar={fowEnabled}
          fowBlur={fowBlur}
          fowColor={fowColor}
          ambientLight={ambientLight}
          onDoorToggle={handleDoorToggle}
          centerOnMapPoint={centerOnMapPoint}
          currentCombatTokenId={currentCombatTokenId}
          onMeasureChange={(meas) => socket.emit('measure_update', { meas, color: userColors[name] || '#60a5fa' })}
          remoteMeasurements={remoteMeasurements}
          terrain={terrain}
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

        {/* Quick-access controls — drag any button onto another to reorder.
            Order persists per-browser in localStorage so each player can lay
            them out however they like. */}
        {(() => {
          const controls = [
            {
              id: 'actions',
              available: true,
              render: () => (
                <button
                  onClick={() => setShowActionsRef(true)}
                  className="bg-gray-800/90 hover:bg-gray-700 text-white rounded-full w-10 h-10 text-lg shadow-lg flex items-center justify-center"
                  title="Actions Reference"
                >
                  <BookIcon />
                </button>
              ),
            },
            {
              id: 'character',
              available: !!myCreature,
              render: () => (
                <button
                  onClick={() => setShowCharacterEdit(true)}
                  className="bg-gray-800/90 hover:bg-gray-700 text-white rounded-full w-10 h-10 text-lg shadow-lg flex items-center justify-center"
                  title="My Character"
                >
                  <CharacterIcon />
                </button>
              ),
            },
            {
              id: 'quickref',
              available: !!myCreature,
              render: () => (
                <button
                  onClick={() => setShowQuickRef(v => !v)}
                  className="bg-gray-800/90 hover:bg-gray-700 text-dnd-gold rounded-full w-10 h-10 text-lg shadow-lg flex items-center justify-center"
                  title="Quick Reference (HP, spells, hit dice, death saves)"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                </button>
              ),
            },
            {
              id: 'notes',
              available: !!myCreature,
              render: () => (
                <button
                  onClick={() => setShowNotes(true)}
                  className="bg-gray-800/90 hover:bg-gray-700 text-amber-300 rounded-full w-10 h-10 text-lg shadow-lg flex items-center justify-center"
                  title="Notes / journal"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                    <path d="M11 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
              ),
            },
            {
              id: 'light',
              available: !!playerTokenId && availablePresets.length > 1,
              render: () => (
                <div className="relative">
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
              ),
            },
          ];
          const availableIds = controls.filter(c => c.available).map(c => c.id);
          if (availableIds.length === 0) return null;
          const orderIdx = new Map(quickCtrlOrder.map((id, i) => [id, i]));
          const sortedIds = [...availableIds].sort((a, b) => {
            const ai = orderIdx.has(a) ? orderIdx.get(a) : Infinity;
            const bi = orderIdx.has(b) ? orderIdx.get(b) : Infinity;
            if (ai !== bi) return ai - bi;
            return availableIds.indexOf(a) - availableIds.indexOf(b);
          });
          const byId = new Map(controls.map(c => [c.id, c]));
          return (
            <div className="absolute bottom-20 left-4 z-40 flex gap-2 items-end">
              {sortedIds.map((id) => {
                const c = byId.get(id);
                if (!c) return null;
                return (
                  <div
                    key={id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('application/x-quick-ctrl', id);
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    onDragOver={(e) => {
                      if (e.dataTransfer.types.includes('application/x-quick-ctrl')) e.preventDefault();
                    }}
                    onDrop={(e) => {
                      const from = e.dataTransfer.getData('application/x-quick-ctrl');
                      if (!from || from === id) return;
                      e.preventDefault();
                      reorderQuickCtrl(from, id, availableIds);
                    }}
                    className="cursor-grab active:cursor-grabbing"
                    title="Drag to reorder"
                  >
                    {c.render()}
                  </div>
                );
              })}
            </div>
          );
        })()}

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
            onTokenTempHpChange={(hp) => {
              if (!playerTokenId) return;
              socket.emit('update_token_temp_hp', { tokenId: playerTokenId, tempHp: hp });
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

        {/* GM whispers — top-right stack, auto-dismiss after 12s, click to close. */}
        {whispers.length > 0 && (
          <div className="absolute top-4 right-4 z-50 flex flex-col gap-2 max-w-sm pointer-events-auto">
            {whispers.map((w) => (
              <WhisperPopup
                key={w.id}
                whisper={w}
                onClose={() => setWhispers((prev) => prev.filter((x) => x.id !== w.id))}
              />
            ))}
          </div>
        )}

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
              <div>Waiting for the Game Master to set the map...</div>
            </div>
          </div>
        )}
      </div>

      {/* Actions reference modal */}
      {showActionsRef && <ActionsReference onClose={() => setShowActionsRef(false)} />}

      {/* Concentration prompt */}
      {concentrationPrompt && myCreature && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setConcentrationPrompt(null)}>
          <div
            className="bg-dnd-panel border border-purple-500/60 rounded-xl shadow-2xl w-full max-w-md p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">🌀</span>
              <h3 className="text-lg font-semibold text-purple-300">Concentration Check</h3>
            </div>
            <p className="text-sm text-gray-200 mb-2">
              You took <strong>{concentrationPrompt.damage}</strong> damage while concentrating on{' '}
              <em className="text-purple-200">{concentrationPrompt.spellName}</em>.
            </p>
            <p className="text-sm text-gray-300 mb-3">
              Roll a Constitution save against <strong>DC {concentrationPrompt.dc}</strong>.
              {concentrationPrompt.conSaveBonus != null && (
                <span className="text-xs text-gray-400"> (Your CON save: <span className="font-mono">{concentrationPrompt.conSaveBonus >= 0 ? '+' : ''}{concentrationPrompt.conSaveBonus}</span>)</span>
              )}
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  const bonus = Number(concentrationPrompt.conSaveBonus) || 0;
                  socket.emit('roll_dice', {
                    dice: 'd20',
                    count: 1,
                    modifier: bonus,
                    label: `Concentration save (DC ${concentrationPrompt.dc})`,
                  });
                }}
                className="bg-purple-700 hover:bg-purple-600 text-white py-2 rounded-lg text-sm font-semibold"
              >
                Roll d20{(concentrationPrompt.conSaveBonus != null ? ` ${concentrationPrompt.conSaveBonus >= 0 ? '+' : ''}${concentrationPrompt.conSaveBonus}` : '')}
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setConcentrationPrompt(null)}
                  className="bg-green-800 hover:bg-green-700 text-white py-2 rounded-lg text-sm font-semibold"
                >
                  Pass — keep
                </button>
                <button
                  onClick={async () => {
                    try {
                      const fd = new FormData();
                      fd.append('concentrating_on', '');
                      const res = await fetch(`/api/creatures/${myCreature.id}`, { method: 'PUT', body: fd });
                      const updated = await res.json();
                      if (updated && !updated.error) setMyCreature(updated);
                    } catch (err) { console.error(err); }
                    setConcentrationPrompt(null);
                  }}
                  className="bg-red-800 hover:bg-red-700 text-white py-2 rounded-lg text-sm font-semibold"
                >
                  Fail — drop
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Handout */}
      {handout && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4" onClick={() => setHandout(null)}>
          <div
            className="bg-amber-50 text-gray-900 border-2 border-amber-700 rounded-lg shadow-2xl w-full max-w-2xl flex flex-col"
            style={{ maxHeight: '90vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-amber-700/40">
              <span className="text-base font-serif font-semibold">{handout.title || 'Handout'}</span>
              <button onClick={() => setHandout(null)} className="text-gray-700 hover:text-gray-900 text-sm">✕</button>
            </div>
            <div className="overflow-y-auto p-4 space-y-3 font-serif">
              {handout.imageUrl && (
                <img src={handout.imageUrl} alt={handout.title || 'handout'} className="max-w-full max-h-[60vh] mx-auto rounded shadow" />
              )}
              {handout.body && (
                <p className="whitespace-pre-wrap text-base leading-relaxed">{handout.body}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Notes modal */}
      {showNotes && myCreature && (
        <NotesModal
          creature={myCreature}
          onClose={() => setShowNotes(false)}
          onSave={async (text) => {
            try {
              const fd = new FormData();
              fd.append('player_notes', text);
              const res = await fetch(`/api/creatures/${myCreature.id}`, { method: 'PUT', body: fd });
              const updated = await res.json();
              if (updated && !updated.error) setMyCreature(updated);
            } catch (err) { console.error('Notes save failed', err); }
          }}
        />
      )}

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
