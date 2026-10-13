import React, { useState, useEffect, useRef, useMemo } from 'react';
import { SpellBox } from './StatBlock.jsx';
import { computeHitDicePool } from '../utils/classes.js';
import { attachSessionKeepalive } from '../utils/sessionSocket.js';
import { spellSlotsForCreature, pactMagicForCreature } from '../data/classes.js';
import { resourcesForCreature } from '../data/resources.js';
import { spellType } from '../utils/spellTypes.js';
import { wildShapeTempHp } from '../data/subclasses.js';
import { wildMagicResult } from '../data/wildmagic.js';
import { shipPilotedByToken } from '../utils/ships.js';
import { pilotDenialReason, canPilotHelm } from '../utils/piloting.js';
import { buildCombatOrder, COMBAT_STRIP_H } from '../utils/combatOrder.js';

function WhisperPopup({ whisper, onClose }) {
  // THE TIMER MUST NOT DEPEND ON `onClose`.
  //
  // The parent passes an inline arrow, so `onClose` is a new function on every
  // render — and the map view re-renders constantly, as tokens move and hit
  // points change. With `onClose` in the dependency list the effect tore down
  // and restarted the twelve-second timer several times a second, so it never
  // reached the end and the whisper sat on screen until it was clicked.
  // Held in a ref instead: the timer is armed once, per whisper.
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);
  useEffect(() => {
    const id = setTimeout(() => closeRef.current?.(), 12000);
    return () => clearTimeout(id);
  }, [whisper.id]);
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
    <div className="fixed inset-0 z-[90] bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
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

function QuickReferencePanel({ creature, playerToken, onClose, onSave, onTokenHpChange, onTokenTempHpChange, onToggleFly }) {
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
    resource_state: typeof creature.resource_state === 'string'
      ? (() => { try { return JSON.parse(creature.resource_state); } catch { return {}; } })()
      : (creature.resource_state || {}),
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
      resource_state: typeof creature.resource_state === 'string'
        ? (() => { try { return JSON.parse(creature.resource_state); } catch { return {}; } })()
        : (creature.resource_state || {}),
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
    <div className="fixed bottom-36 left-4 z-[90] w-80 bg-dnd-panel border border-dnd-gold/40 rounded-xl shadow-2xl overflow-hidden flex flex-col" style={{ maxHeight: '70vh' }}>
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700">
        <span className="text-sm font-semibold text-dnd-gold">Quick Reference</span>
        <button onClick={onClose} className="text-gray-400 hover:text-white text-xs">✕</button>
      </div>
      <div className="p-3 space-y-3 text-sm text-gray-200 overflow-y-auto">
        {/* Airborne or not.
            This is the switch the storey rules read: a creature that CAN fly
            but is walking falls off a balcony like anyone else, so being able
            to fly earns you the button and only pressing it keeps you up. */}
        {onToggleFly && (
          <button
            type="button"
            onClick={onToggleFly}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-xs transition-colors ${
              playerToken?.is_flying
                ? 'bg-sky-900/40 border-sky-600 text-sky-200'
                : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-sky-600/60'
            }`}
          >
            <span>{playerToken?.is_flying ? 'Flying' : 'On the ground'}</span>
            <span aria-hidden="true">{playerToken?.is_flying ? '🕊️' : '🥾'}</span>
          </button>
        )}

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
        {/* Spell slots. Totals are derived from class + level when the sheet
            doesn't carry them, so a caster always has boxes to tick; a manual
            total on the sheet still wins. Ticking a box writes the derived
            total back, so it persists from then on. */}
        {(() => {
          // Whole character, not the primary class: a multiclassed caster's
          // slots are pooled and a Warlock level anywhere grants Pact Magic.
          const derived = spellSlotsForCreature(creature);
          const pact = pactMagicForCreature(creature);
          const totalFor = (l) => (local.spell_slots[l]?.total || derived[l] || 0);
          const anySlots = [1,2,3,4,5,6,7,8,9].some((l) => totalFor(l) > 0);
          if (!anySlots && !pact) return null;
          return (
          <div className="space-y-1">
            <div className="text-xs text-gray-400">
              Spell Slots
              {pact && <span className="text-gray-500"> · Pact Magic, level {pact.slotLevel} (Short Rest)</span>}
            </div>
            {[1,2,3,4,5,6,7,8,9].map(l => {
              const total = totalFor(l);
              if (!total) return null;
              const slot = local.spell_slots[l] || { total, used: 0 };
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
                          const next = {
                            ...local.spell_slots,
                            [l]: {
                              ...slot,
                              total,
                              used: Math.max(0, Math.min(total, e.target.checked ? (slot.used || 0) + 1 : (slot.used || 0) - 1)),
                            },
                          };
                          patch('spell_slots', next);
                        }}
                        className="accent-purple-500"
                      />
                    ))}
                  </div>
                  <span className="text-gray-500">{total - (slot.used || 0)}/{total}</span>
                </div>
              );
            })}
            {/* Warlock slots refresh on a Short Rest, so they get their own row. */}
            {pact && (() => {
              const key = 'pact';
              const slot = local.spell_slots[key] || { total: pact.slots, used: 0 };
              const total = slot.total || pact.slots;
              return (
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-12 text-gray-500">Pact:</span>
                  <div className="flex gap-1 flex-wrap">
                    {Array.from({ length: total }).map((_, i) => (
                      <input
                        key={i}
                        type="checkbox"
                        checked={i < (slot.used || 0)}
                        onChange={(e) => {
                          const next = {
                            ...local.spell_slots,
                            [key]: {
                              ...slot,
                              total,
                              used: Math.max(0, Math.min(total, e.target.checked ? (slot.used || 0) + 1 : (slot.used || 0) - 1)),
                            },
                          };
                          patch('spell_slots', next);
                        }}
                        className="accent-fuchsia-500"
                      />
                    ))}
                  </div>
                  <span className="text-gray-500">{total - (slot.used || 0)}/{total}</span>
                </div>
              );
            })()}
          </div>
          );
        })()}
        {/* Class resources — Action Surge, Second Wind, Rages, Bardic
            Inspiration, an item's charges. Ticked exactly like spell slots
            above, because they are the same thing to a player: a handful of
            uses that run out and come back on a rest. They were tracked on the
            phone and nowhere else, so anyone playing off the map view had to
            keep Action Surge in their head. */}
        {(() => {
          const rows = resourcesForCreature(creature) || [];
          if (!rows.length) return null;
          const state = local.resource_state || {};
          return (
            <div className="space-y-1">
              <div className="text-xs text-gray-400">Class resources</div>
              {rows.map(({ def, total }) => {
                const max = Number(total) || 0;
                if (max <= 0) return null;
                const used = Math.max(0, Math.min(max, Number(state?.[def.id]?.used) || 0));
                const setUsed = (n) => patch('resource_state', {
                  ...state,
                  [def.id]: { ...(state[def.id] || {}), used: Math.max(0, Math.min(max, n)) },
                });
                return (
                  <div key={def.id} className="flex items-center gap-2 text-xs">
                    <span className="w-28 text-gray-500 truncate" title={def.note || def.label}>
                      {def.label}
                    </span>
                    {/* A pool of twenty (Lay on Hands) as twenty boxes is
                        unreadable, so anything larger than ten counts up and
                        down instead. */}
                    {max <= 10 ? (
                      <div className="flex gap-1 flex-wrap">
                        {Array.from({ length: max }).map((_, i) => (
                          <input
                            key={i}
                            type="checkbox"
                            checked={i < used}
                            onChange={(e) => setUsed(e.target.checked ? used + 1 : used - 1)}
                            className="accent-emerald-500"
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => setUsed(used + 1)}
                          className="px-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-200">−</button>
                        <button type="button" onClick={() => setUsed(used - 1)}
                          className="px-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-200">+</button>
                      </div>
                    )}
                    <span className="text-gray-500 ml-auto">
                      {max - used}/{max}
                      {def.rest ? ` · ${def.rest}` : ''}
                    </span>
                  </div>
                );
              })}
            </div>
          );
        })()}
        {/* Attunement — the 3-item limit is a rule players have to police
            themselves, so the count is stated rather than implied. */}
        {(() => {
          let inv = [];
          if (Array.isArray(creature.inventory)) inv = creature.inventory;
          else if (typeof creature.inventory === 'string' && creature.inventory.startsWith('[')) {
            try { inv = JSON.parse(creature.inventory); } catch { inv = []; }
          }
          const attunable = inv.filter(it => it?.attunement_required);
          if (attunable.length === 0) return null;
          const attuned = attunable.filter(it => it.attuned);
          return (
            <div className="space-y-1">
              <div className="text-xs text-gray-400">
                Attunement <span className={attuned.length >= 3 ? 'text-amber-400' : 'text-gray-500'}>
                  {attuned.length}/3
                </span>
              </div>
              <div className="bg-gray-800/60 border border-gray-700 rounded p-2 space-y-1 text-[11px]">
                {attuned.length === 0 ? (
                  <div className="text-gray-500 italic">Not attuned to anything.</div>
                ) : attuned.map((it, i) => (
                  <div key={it.id ?? i} className="flex items-baseline gap-2">
                    <span className="text-purple-300">◆</span>
                    <span className="text-gray-200">{it.name || 'Unnamed item'}</span>
                    {it.rarity && <span className="text-gray-500">{it.rarity}</span>}
                  </div>
                ))}
                {/* Carried but not attuned: the item does nothing until it is. */}
                {attunable.filter(it => !it.attuned).length > 0 && (
                  <div className="pt-1 border-t border-gray-700 text-gray-500">
                    Carried, not attuned:{' '}
                    {attunable.filter(it => !it.attuned).map(it => it.name).filter(Boolean).join(', ')}
                  </div>
                )}
              </div>
            </div>
          );
        })()}

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
          className="fixed inset-0 z-[90] bg-black/80 flex items-center justify-center p-4"
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
                typeLabel={spellType(viewSpell.type).badge}
                typeColor={spellType(viewSpell.type).dark}
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
const VolumeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M11 5 6 9H2v6h4l5 4V5z" />
    <path d="M15.5 8.5a5 5 0 0 1 0 7" /><path d="M18.5 5.5a9 9 0 0 1 0 13" />
  </svg>
);
const VolumeMuteIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M11 5 6 9H2v6h4l5 4V5z" />
    <line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" />
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
import ShopView from './ShopView.jsx';
import LobbyView from './LobbyView.jsx';
import BackdropLayer from './BackdropLayer.jsx';
import ViewToggle from './ViewToggle.jsx';
import { resolveLevelAfterMove, occupiedLevel } from '../utils/levelFloor.js';
import socket from '../socket.js';
import { loadPlugins, registries as pluginRegistries, useRegistryVersion } from '../plugins/pluginRegistry.js';
import { CustomClassesProvider } from '../plugins/customClassesProvider.js';
import MapStage, { TOKEN_SIZES, tokenFootprint } from './MapStage.jsx';
import DiceRoller, { DiceRollOverlay } from './DiceRoller.jsx';
import RollLog from './RollLog.jsx';
import ErrorBoundary from './ErrorBoundary.jsx';
import { prefetchSky } from '../utils/skyTexture.js';
const Map3DView = React.lazy(() => import('./Map3DView.jsx'));
import ToolPanel from './ToolPanel.jsx';
import { lightPresetsFor, availableLightPresets, carriesItem } from '../utils/lightPresets.js';
import CreatureForm from './CreatureForm.jsx';
import StatBlock from './StatBlock.jsx';
import ActionsReference from './ActionsReference.jsx';
import ReferenceSearch from './ReferenceSearch.jsx';

// The initiative banner. Two placements share it so they can't drift: the
// strip across the top of the map, and the lobby's bottom banner for combat
// with no map — which runs `large` because there's no map competing for the
// screen and the portraits are the whole point of that view.
function PlayerCombatStrip({ sortedCombat, combatTurn, combatDisplayNames, large = false, edge = 'top' }) {
  const S = large
    ? { bar: 132, cur: 92, idle: 64, cell: 104, name: 15, nameIdle: 12, badge: 13, pad: 'pb-2.5 pr-4', icon: 'mb-4 px-4' }
    : { bar: COMBAT_STRIP_H, cur: 52, idle: 34, cell: 60, name: 11, nameIdle: 9, badge: 9, pad: 'pb-1.5 pr-3', icon: 'mb-2.5 px-3' };
  const scrollRef = useRef(null);
  useEffect(() => {
    if (!scrollRef.current) return;
    const el = scrollRef.current.querySelector('[data-current="true"]');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [combatTurn]);

  return (
    <div
      // `relative` is what makes the z-index mean anything. Static elements
      // take no part in stacking, so the old bare `z-20` was inert and the 3D
      // overlay — a fixed z-70 sheet over the whole window — simply painted
      // over the strip: whose turn it was vanished the moment anyone switched
      // to 3D. Staying in the flow (rather than going `fixed` like the rest of
      // the surviving chrome) keeps the 2D layout byte-for-byte as it was; the
      // level is all that changes.
      className={`shrink-0 relative z-[80] flex items-end bg-gray-900/90 ${edge === 'bottom' ? 'border-t border-yellow-600/40' : edge === 'none' ? '' : 'border-b border-yellow-600/40'}`}
      style={{ height: S.bar }}
    >
      <span className={`text-yellow-400 shrink-0 ${S.icon}`}><SwordIcon /></span>
      <div ref={scrollRef} className={`flex items-end gap-2 overflow-x-auto min-w-0 flex-1 ${S.pad}`}>
        {sortedCombat.map((entry, i) => {
          const isCurrent = i === combatTurn % sortedCombat.length;
          const displayName = combatDisplayNames[i];
          // Ships take their turn in the same order the crew do, drawn as a
          // square hull rather than a portrait so the two never get confused.
          if (entry.kind === 'ship') {
            const size = isCurrent ? S.cur : S.idle;
            return (
              <div key={entry.key} className="flex flex-col items-center gap-0.5 shrink-0" style={{ width: S.cell }} data-current={isCurrent ? 'true' : undefined}>
                <div
                  className="relative overflow-hidden transition-all duration-300 rounded-md flex items-center justify-center"
                  style={{
                    width: size, height: size, background: '#1f2937',
                    border: isCurrent ? '2.5px solid #fbbf24' : '2px solid #4b5563',
                    boxShadow: isCurrent ? '0 0 12px 3px rgba(251,191,36,0.45)' : 'none',
                  }}
                >
                  <span style={{ fontSize: isCurrent ? S.cur * 0.46 : S.idle * 0.47 }} role="img" aria-label="ship">⛵</span>
                  <div className="absolute bottom-0 right-0 bg-black/80 text-yellow-300 font-bold leading-none rounded-tl"
                    style={{ fontSize: S.badge, padding: large ? '2px 5px' : '1px 3px' }}>
                    {entry.initiative}
                  </div>
                </div>
                <span className="truncate text-center leading-tight transition-all duration-300"
                  style={{ maxWidth: S.cell - 2, fontSize: isCurrent ? S.name : S.nameIdle, color: isCurrent ? '#fde68a' : '#9ca3af', fontWeight: isCurrent ? 600 : 400 }}>
                  {displayName}
                </span>
              </div>
            );
          }
          const t = entry.token;
          const imgUrl = t.image_path
            ? `/uploads/${t.image_path}`
            : t.creature_image
            ? `/uploads/${t.creature_image}`
            : t.is_player
            ? '/uploads/creatures/default_player.png'
            : null;
          const size = isCurrent ? S.cur : S.idle;
          return (
            <div key={entry.key} className="flex flex-col items-center gap-0.5 shrink-0" style={{ width: S.cell }} data-current={isCurrent ? 'true' : undefined}>
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
                  style={{ fontSize: S.badge, padding: large ? '2px 5px' : '1px 3px' }}>
                  {t.initiative}
                </div>
              </div>
              <span className="truncate text-center leading-tight transition-all duration-300"
                style={{ maxWidth: S.cell - 2, fontSize: isCurrent ? S.name : S.nameIdle, color: isCurrent ? '#fde68a' : '#9ca3af', fontWeight: isCurrent ? 600 : 400 }}>
                {displayName}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// The player's own character sheet: edit form, rollable stat block, backstory.
// Lives in one component because it's opened from two places that must not
// drift — the in-game quick-control button and the lobby, where players do
// their last-minute stat fixes before the GM opens the doors.
function CharacterSheetModal({ creature, tab, onTabChange, onSave, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/80 z-[90] flex items-center justify-center p-4 print-backdrop">
      <div
        className="bg-dnd-panel border border-gray-700 rounded-xl w-full max-w-2xl flex flex-col overflow-hidden print-sheet"
        style={{ height: '85vh' }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 shrink-0 no-print">
          <div className="flex items-center gap-1">
            <h3 className="text-dnd-gold font-semibold mr-2">My Character</h3>
            <button
              onClick={() => onTabChange('edit')}
              className={`text-xs px-3 py-1 rounded-lg transition-colors ${tab === 'edit' ? 'bg-dnd-red text-white' : 'text-gray-400 hover:text-white border border-gray-700'}`}
            >
              <PencilIcon />Edit
            </button>
            <button
              onClick={() => onTabChange('sheet')}
              className={`text-xs px-3 py-1 rounded-lg transition-colors ${tab === 'sheet' ? 'bg-dnd-red text-white' : 'text-gray-400 hover:text-white border border-gray-700'}`}
            >
              <ScrollIcon />Sheet
            </button>
            <button
              onClick={() => onTabChange('backstory')}
              className={`text-xs px-3 py-1 rounded-lg transition-colors ${tab === 'backstory' ? 'bg-dnd-red text-white' : 'text-gray-400 hover:text-white border border-gray-700'}`}
            >
              Backstory
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
              onClick={onClose}
              className="text-gray-400 hover:text-white flex items-center"
            >
              <XIcon />
            </button>
          </div>
        </div>
        {/* Edit tab */}
        {tab === 'edit' && (
          <div className="flex-1 overflow-hidden no-print">
            <CreatureForm
              creature={creature}
              onSave={onSave}
              onCancel={onClose}
              submitLabel="Save Character"
              isPlayerCharacter={true}
            />
          </div>
        )}
        {/* Sheet tab — stat block with roll buttons */}
        {tab === 'sheet' && (
          <div className="flex-1 overflow-y-auto no-print">
            <StatBlock
              creature={creature}
              onRoll={({ label, dice, count, modifier }) => {
                socket.emit('roll_dice', { dice, count, modifier, label });
              }}
            />
          </div>
        )}
        {/* Backstory tab */}
        {tab === 'backstory' && (
          <div className="flex-1 overflow-y-auto p-4 no-print">
            {creature.backstory ? (
              <p className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">
                {creature.backstory}
              </p>
            ) : (
              <p className="text-sm text-gray-500 italic">
                No backstory written yet. Open the Edit tab and go to the Backstory section to add one.
              </p>
            )}
          </div>
        )}
        {/* Stat block — only shown during print */}
        <div className="print-only">
          <StatBlock creature={creature} />
        </div>
      </div>
    </div>
  );
}

// Hand an item to another player. Recipients are the other player tokens on
// the map, so this works for anyone at the table without the GM relaying it.
function GiveItemPanel({ inventory, recipients, busy, onGive, onClose }) {
  const [selected, setSelected] = useState(null);   // index into `inventory`
  const [toTokenId, setToTokenId] = useState(recipients[0]?.id ?? null);
  const [qty, setQty] = useState(1);

  const item = selected == null ? null : inventory[selected];
  const have = Math.max(1, Number(item?.qty) || 1);

  return (
    <div className="fixed inset-0 bg-black/80 z-[90] flex items-center justify-center p-4">
      <div className="bg-dnd-panel border border-gray-700 rounded-xl w-full max-w-lg flex flex-col overflow-hidden max-h-[85vh]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 shrink-0">
          <h3 className="text-dnd-gold font-semibold">Give an Item</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white flex items-center"><XIcon /></button>
        </div>

        {recipients.length === 0 ? (
          <p className="p-6 text-sm text-gray-500 italic text-center">
            Nobody else is on the map to give anything to.
          </p>
        ) : inventory.length === 0 ? (
          <p className="p-6 text-sm text-gray-500 italic text-center">Your pack is empty.</p>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {inventory.map((it, i) => (
                <button
                  key={it.id ?? i}
                  onClick={() => { setSelected(i); setQty(1); }}
                  className={`w-full text-left px-3 py-2 rounded-lg border transition-colors ${
                    selected === i
                      ? 'border-dnd-gold bg-gray-800'
                      : 'border-gray-700 hover:border-gray-600 hover:bg-gray-800/60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-gray-200">{it.name || 'Unnamed item'}</span>
                    <span className="text-xs text-gray-500 shrink-0">
                      {(Number(it.qty) || 1) > 1 ? `×${it.qty}` : ''}
                      {it.equipped ? ' · equipped' : ''}
                      {it.attuned ? ' · attuned' : ''}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            <div className="border-t border-gray-700 p-3 space-y-2 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 w-14 shrink-0">To</span>
                <select
                  value={toTokenId ?? ''}
                  onChange={(e) => setToTokenId(Number(e.target.value))}
                  className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-dnd-gold"
                >
                  {recipients.map((r) => (
                    <option key={r.id} value={r.id}>{r.label}</option>
                  ))}
                </select>
              </div>

              {have > 1 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 w-14 shrink-0">Quantity</span>
                  <input
                    type="number"
                    min={1}
                    max={have}
                    value={qty}
                    onChange={(e) => setQty(Math.max(1, Math.min(have, Number(e.target.value) || 1)))}
                    className="w-20 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-dnd-gold"
                  />
                  <span className="text-xs text-gray-500">of {have}</span>
                </div>
              )}

              {(item?.equipped || item?.attuned) && (
                <p className="text-[11px] text-amber-400/90">
                  Handing this over unequips it — {item.name} will need re-attuning by whoever takes it.
                </p>
              )}

              <button
                disabled={busy || selected == null || !toTokenId}
                onClick={() => onGive({ itemIndex: selected, itemName: item?.name, toTokenId, qty })}
                className="w-full bg-dnd-red hover:bg-red-700 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm py-2 rounded-lg transition-colors"
              >
                {selected == null ? 'Pick an item' : `Give ${qty > 1 ? `${qty} × ` : ''}${item?.name || ''}`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Wild Shape panel — the forms the GM curated on this character, and the
// button to become one. The server re-checks the list on every shift, so this
// is the convenient path to a permission it already holds, not the gate itself.
function WildShapePanel({ forms, currentForm, tempHp, busy, onShift, onRevert, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/80 z-[90] flex items-center justify-center p-4">
      <div
        className="bg-dnd-panel border border-gray-700 rounded-xl w-full max-w-lg flex flex-col overflow-hidden"
        style={{ maxHeight: '85vh' }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 shrink-0">
          <div>
            <h3 className="text-emerald-300 font-semibold">Wild Shape</h3>
            <div className="text-[11px] text-gray-500">
              Shifting grants {tempHp} temporary hit {tempHp === 1 ? 'point' : 'points'} and the form's senses.
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none px-2">×</button>
        </div>

        {currentForm && (
          <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between gap-3 bg-emerald-950/30">
            <div className="min-w-0">
              <div className="text-xs text-gray-400">Currently shaped as</div>
              <div className="text-sm text-emerald-200 font-semibold truncate">{currentForm}</div>
            </div>
            <button
              onClick={onRevert}
              disabled={busy}
              className="text-xs px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-gray-100 shrink-0"
            >
              Return to your own form
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-3">
          {forms.length === 0 ? (
            <p className="text-sm text-gray-500 italic p-2">
              Your GM hasn't given you any Wild Shape forms yet.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {forms.map((c) => (
                <button
                  key={c.id}
                  onClick={() => onShift(c.id)}
                  disabled={busy}
                  className="flex items-center gap-2 p-2 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-left transition-colors border border-gray-700 hover:border-emerald-600"
                >
                  {c.image_path
                    ? <img src={`/uploads/${c.image_path}`} alt="" className="w-11 h-11 rounded object-cover shrink-0" />
                    : <span className="w-11 h-11 rounded bg-gray-700 shrink-0" />}
                  <span className="min-w-0">
                    <span className="block text-sm text-gray-100 truncate">{c.name}</span>
                    <span className="block text-[11px] text-gray-500">
                      {c.hit_points} hp • {c.size}
                    </span>
                    {Array.isArray(c.senses) && c.senses.length > 0 && (
                      <span className="block text-[10px] text-emerald-300/80 truncate">
                        {c.senses.map((s) => `${s.type}${s.range ? ` ${s.range}ft` : ''}`).join(', ')}
                      </span>
                    )}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Wild Magic Surge result. Deliberately modal and sticky: a surge is a table
// event that everyone reacts to, and it must stay on screen until the player
// has read it out and dealt with it — not fade like a dice toast.
function WildMagicPopup({ result, alt, onKeep, onClose }) {
  if (!result) return null;
  return (
    <div className="absolute inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
      <div className="bg-dnd-panel border-2 border-fuchsia-600 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="px-4 py-3 bg-fuchsia-950/60 border-b border-fuchsia-800 flex items-center justify-between">
          <h3 className="text-fuchsia-200 font-semibold tracking-wide">WILD MAGIC SURGE</h3>
          <span className="text-[11px] text-fuchsia-300/70">d100</span>
        </div>

        <div className="p-5 text-center border-b border-gray-800">
          <div className="text-6xl font-mono font-bold text-fuchsia-300 leading-none">{result.roll}</div>
          {result.band && <div className="text-[11px] text-gray-500 mt-1">table row {result.band}</div>}
        </div>

        <div className="px-5 py-4 max-h-[40vh] overflow-y-auto">
          <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">{result.effect}</p>
        </div>

        {/* Controlled Chaos (level 14): rolled twice, pick either. */}
        {alt && (
          <div className="px-5 pb-3">
            <div className="text-[11px] uppercase tracking-wider text-gray-500 mb-1">
              Controlled Chaos — second roll
            </div>
            <button
              onClick={() => onKeep(alt)}
              className="w-full text-left bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-fuchsia-600 rounded-lg p-2.5 transition-colors"
            >
              <span className="font-mono text-fuchsia-300 font-bold mr-2">{alt.roll}</span>
              <span className="text-xs text-gray-300">{alt.effect}</span>
              <span className="block text-[11px] text-fuchsia-400 mt-1">Use this one instead →</span>
            </button>
          </div>
        )}

        <div className="px-5 py-3 border-t border-gray-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-fuchsia-700 hover:bg-fuchsia-600 text-white text-sm font-medium"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

// The conditions a player can reasonably put on themselves. Everything else
// (Charmed, Frightened, Stunned…) is imposed by the world, so it stays the
// GM's to set.
const SELF_CONDITIONS = ['invisible', 'prone', 'grappled', 'restrained', 'poisoned', 'unconscious'];

// Temporary senses. Fog of war reads the token's senses, so switching here
// genuinely changes what this player can see — the Diviner's Third Eye, a
// Darkvision potion, a spell. "Restore" sends the character sheet's own senses
// back, so no server-side memory is needed.
function SensesPanel({ current, characterSenses, size, isFlying, conditions, exhaustion, auras, onApply, onRestore, onSize, onToggleFly, onConditions, onExhaustion, onAuras, onClose }) {
  const PRESETS = [
    { label: 'Darkvision 60 ft', senses: [{ type: 'darkvision', range: 60 }] },
    { label: 'Darkvision 120 ft', senses: [{ type: 'darkvision', range: 120 }] },
    { label: 'Blindsight 30 ft', senses: [{ type: 'blindsight', range: 30 }] },
    { label: 'Truesight 30 ft', senses: [{ type: 'truesight', range: 30 }] },
    { label: "Devil's Sight 120 ft", senses: [{ type: 'devilsight', range: 120 }] },
    { label: 'Tremorsense 60 ft', senses: [{ type: 'tremorsense', range: 60 }] },
  ];
  const [type, setType] = useState('darkvision');
  const [range, setRange] = useState(60);

  const describe = (arr) => (Array.isArray(arr) && arr.length
    ? arr.map((s) => `${s.type}${s.range ? ` ${s.range} ft` : ''}`).join(', ')
    : 'normal');
  const changed = describe(current) !== describe(characterSenses);

  return (
    <div className="fixed inset-0 bg-black/80 z-[90] flex items-center justify-center p-4">
      <div className="bg-dnd-panel border border-gray-700 rounded-xl w-full max-w-md flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <div>
            <h3 className="text-cyan-300 font-semibold">My token</h3>
            <div className="text-[11px] text-gray-500">Senses, size and flight — all change how the map behaves.</div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none px-2">×</button>
        </div>

        <div className="px-4 py-3 border-b border-gray-800">
          <div className="text-xs text-gray-400">Currently</div>
          <div className={`text-sm ${changed ? 'text-cyan-200' : 'text-gray-200'}`}>{describe(current)}</div>
          {changed && (
            <button
              onClick={onRestore}
              className="mt-2 text-xs px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-100"
            >
              Restore my own senses ({describe(characterSenses)})
            </button>
          )}
        </div>

        <div className="p-3 space-y-2">
          <div className="grid grid-cols-2 gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => onApply(p.senses)}
                className="text-xs px-2 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-cyan-600 text-gray-200"
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-100"
            >
              {['normal', 'darkvision', 'blindsight', 'truesight', 'tremorsense', 'devilsight'].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <input
              type="number"
              min={0}
              max={1000}
              value={range}
              onChange={(e) => setRange(Number(e.target.value) || 0)}
              className="w-20 bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-100 text-center"
            />
            <span className="text-[11px] text-gray-500">ft</span>
            <button
              onClick={() => onApply([{ type, range }])}
              className="text-xs px-3 py-1.5 rounded-lg bg-cyan-700 hover:bg-cyan-600 text-white"
            >
              Apply
            </button>
          </div>
          <p className="text-[11px] text-gray-500 leading-snug">
            Your GM sees the change too, and can set it on your token themselves.
          </p>

          {/* Size and flight live here too: Enlarge/Reduce, Fly and Levitate
              are the player's own spells, and both change how the token is
              drawn and how it interacts with the map. */}
          <div className="pt-2 border-t border-gray-800 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 w-12">Size</span>
              <select
                value={size || 'medium'}
                onChange={(e) => onSize(e.target.value)}
                className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-100"
              >
                {['tiny', 'small', 'medium', 'large', 'huge', 'gargantuan'].map((sz) => (
                  <option key={sz} value={sz}>{sz.charAt(0).toUpperCase() + sz.slice(1)}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 w-12">Flying</span>
              <button
                onClick={onToggleFly}
                className={`flex-1 text-xs px-3 py-1.5 rounded-lg transition-colors ${
                  isFlying
                    ? 'bg-sky-700 text-sky-100 hover:bg-sky-600'
                    : 'bg-gray-800 border border-gray-700 text-gray-300 hover:text-white'
                }`}
              >
                {isFlying ? 'Airborne — click to land' : 'On the ground — click to fly'}
              </button>
            </div>

            {/* Conditions you can put on yourself: Rage, the Invisible from
                Nature's Veil or Cloak of Shadows, Prone after a fall. The GM
                still owns everyone else's. */}
            <div>
              <div className="text-xs text-gray-400 mb-1">Conditions</div>
              <div className="flex flex-wrap gap-1">
                {SELF_CONDITIONS.map((c) => {
                  const on = (conditions || []).includes(c);
                  return (
                    <button
                      key={c}
                      onClick={() => onConditions(
                        on ? (conditions || []).filter((x) => x !== c) : [...(conditions || []), c]
                      )}
                      className={`text-[11px] px-2 py-1 rounded transition-colors ${
                        on ? 'bg-amber-700 text-amber-100' : 'bg-gray-800 text-gray-400 hover:text-white'
                      }`}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Exhaustion is a level in the 2024 rules, not a yes/no state. */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 w-16">Exhaustion</span>
              <button
                onClick={() => onExhaustion(Math.max(0, (Number(exhaustion) || 0) - 1))}
                className="w-7 h-7 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 leading-none"
              >−</button>
              <span className={`font-mono w-6 text-center ${Number(exhaustion) > 0 ? 'text-red-300' : 'text-gray-400'}`}>
                {Number(exhaustion) || 0}
              </span>
              <button
                onClick={() => onExhaustion(Math.min(6, (Number(exhaustion) || 0) + 1))}
                className="w-7 h-7 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 leading-none"
              >+</button>
              {Number(exhaustion) > 0 && (
                <span className="text-[11px] text-gray-500">
                  −{(Number(exhaustion) || 0) * 2} to D20 Tests, −{(Number(exhaustion) || 0) * 5} ft Speed
                </span>
              )}
            </div>

            {/* Your own aura — the paladin's is the obvious one, but any
                emanation that follows you belongs here. */}
            <div>
              <div className="text-xs text-gray-400 mb-1">Aura</div>
              <div className="flex flex-wrap gap-1">
                {[
                  { label: 'Aura of Protection', radius: 10, color: '#fbbf24' },
                  { label: 'Aura (30 ft)', radius: 30, color: '#fbbf24' },
                  { label: 'Spirit Guardians', radius: 15, color: '#a78bfa' },
                  { label: 'Wrath of the Sea', radius: 10, color: '#38bdf8' },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => onAuras([...(auras || []), { id: `a-${Date.now()}`, ...preset }])}
                    className="text-[11px] px-2 py-1 rounded bg-gray-800 text-gray-300 hover:text-white"
                  >
                    + {preset.label}
                  </button>
                ))}
                {(auras || []).length > 0 && (
                  <button
                    onClick={() => onAuras([])}
                    className="text-[11px] px-2 py-1 rounded bg-red-900/50 text-red-200 hover:bg-red-900"
                  >
                    Clear {(auras || []).length}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Familiar panel — every token the GM has bound to this player, with its
// stat block, its live HP, and a per-familiar switch for whether its senses
// feed the player's fog of war. Read-only on the token itself: HP and
// conditions still belong to the GM, same as any other non-player token.
function FamiliarPanel({ familiars, creatures, mutedIds, onToggleVision, onLocate, onRoll, onClose }) {
  const [activeId, setActiveId] = useState(familiars[0]?.id ?? null);
  // Keep the selection valid when a familiar is unbound or leaves the map.
  const active = familiars.find((f) => f.id === activeId) || familiars[0] || null;
  useEffect(() => {
    if (active && active.id !== activeId) setActiveId(active.id);
  }, [active, activeId]);
  if (!active) return null;

  const creature = active.creature_id ? creatures[active.creature_id] : null;
  const visionOn = !mutedIds.has(active.id);
  const hpPct = active.max_hp > 0
    ? Math.max(0, Math.min(1, active.current_hp / active.max_hp))
    : 0;

  return (
    <div className="fixed inset-0 bg-black/80 z-[90] flex items-center justify-center p-4">
      <div
        className="bg-dnd-panel border border-gray-700 rounded-xl w-full max-w-2xl flex flex-col overflow-hidden"
        style={{ height: '85vh' }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 shrink-0">
          <h3 className="text-violet-300 font-semibold">Companions</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none px-2">×</button>
        </div>

        {/* Familiar picker — only worth the row when there's a choice. */}
        {familiars.length > 1 && (
          <div className="flex gap-1 px-3 py-2 border-b border-gray-800 overflow-x-auto shrink-0">
            {familiars.map((f) => (
              <button
                key={f.id}
                onClick={() => setActiveId(f.id)}
                className={`text-xs px-3 py-1 rounded-lg whitespace-nowrap transition-colors ${
                  f.id === active.id
                    ? 'bg-violet-700 text-white'
                    : 'text-gray-400 hover:text-white border border-gray-700'
                }`}
              >
                {f.nickname || f.name}
              </button>
            ))}
          </div>
        )}

        <div className="px-4 py-3 border-b border-gray-800 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-gray-100 font-semibold truncate">
                {active.nickname || active.name}
                <span className="ml-2 text-[10px] uppercase tracking-wide text-violet-300/80">
                  {active.companion_kind || 'familiar'}
                </span>
              </div>
              <div className="text-xs text-gray-500">
                {active.current_hp}/{active.max_hp} hp
                {active.temp_hp > 0 ? ` (+${active.temp_hp} temp)` : ''}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => onLocate(active)}
                className="text-xs px-3 py-1.5 rounded-lg border border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800"
                title="Centre the map on this familiar"
              >
                Locate
              </button>
              <button
                onClick={() => onToggleVision(active.id)}
                className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                  visionOn
                    ? 'bg-violet-700 text-white hover:bg-violet-600'
                    : 'border border-gray-700 text-gray-400 hover:text-white'
                }`}
                title="Whether this familiar's senses reveal the map for you"
              >
                {visionOn ? 'Sharing vision' : 'Vision off'}
              </button>
            </div>
          </div>
          <div className="mt-2 h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-red-500 transition-[width] duration-300"
              style={{ width: `${hpPct * 100}%` }}
            />
          </div>
          {Array.isArray(active.conditions) && active.conditions.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {active.conditions.map((c) => (
                <span key={c} className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded bg-gray-800 text-amber-300">
                  {c}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {creature ? (
            <StatBlock creature={creature} onRoll={onRoll} />
          ) : (
            <p className="p-4 text-sm text-gray-500 italic">
              {active.creature_id
                ? 'Loading stat block…'
                : 'This familiar has no creature linked — ask your GM to place it from the creature library.'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// Map-space centre of a token, in the same frame MapStage renders in.
//
// The grid that matters is the MAP's, not the session's. A wildspace map stores
// its own grid_size on the map row and the session-wide value is meaningless
// for it — in a live game here that is 20 against a session's 256. Centring a
// player on the session grid multiplied every coordinate by 12.8: a token at
// map (140, 424) resolved to (1873, 5511), which is 1511px past the bottom edge
// of a 4000px map. The camera pointed at empty space off the map and the player
// got a black screen with no map, no ship and no tokens in it.
//
// Frame resolution mirrors `effectiveMap` below; the familiar-locate handler
// uses that directly, which is why it always centred correctly.
function tokenMapCentre(tok, { gridSize, width, height }) {
  const gs = Number(gridSize) || 50;
  const mW = Number(width)  || 2000;
  const mH = Number(height) || 1500;
  // The grid is centred on the image, so partial cells split evenly.
  const offX = gs > 0 ? (mW % gs) / 2 : 0;
  const offY = gs > 0 ? (mH % gs) / 2 : 0;
  const sz = tokenFootprint(tok);
  return {
    x: offX + Number(tok.grid_col) * gs + (sz.gridW * gs) / 2,
    y: offY + Number(tok.grid_row) * gs + (sz.gridH * gs) / 2,
  };
}

// The render frame for the session's own map. Wildspace carries its grid on the
// map row; everything else uses the session-wide grid.
function sessionMapFrame(session) {
  return {
    // The map's own grid size; the session value is only a legacy fallback.
    gridSize: Number(session?.map_grid_size) || session?.grid_size || 50,
    width:  session?.map_width  || 2000,
    height: session?.map_height || 1500,
  };
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
  // Session roll history + the freehand ink on the current map. Both arrive in
  // the join payload and are kept live by their own socket events.
  const [rollLog, setRollLog] = useState([]);
  const [rollLogOpen, setRollLogOpen] = useState(false);
  // 3D is the default view of a map. The flat map is still a switch away, and
  // the switch itself sits above the overlay so it's always reachable.
  const [show3D, setShow3D] = useState(true);
  // Do the floors ABOVE this player's own get drawn?
  //
  // On by default: a building you can only see the inside of is a floor plan,
  // and seeing its height and its roofs is most of what the 3D view is for.
  // Off is what you want the moment you walk in the door.
  const [showUpperLevels, setShowUpperLevels] = useState(true);
  // Handed to Map3DView, which fills it with its "centre on my token" action.
  // The button lives in the control cluster below, beside the view switch.
  const focusTokenRef = useRef(null);
  const [drawings, setDrawings] = useState([]);
  const [myInkColor, setMyInkColor] = useState('#ef4444');
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
  // Our display name, mirrored to a ref so the socket handlers (registered
  // once at mount) can compare against it without re-binding.
  const nameRef = useRef(name);
  useEffect(() => { nameRef.current = name; }, [name]);
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
  // Read inside socket handlers, which capture their scope once.
  const myCreatureIdRef = useRef(null);
  useEffect(() => { myCreatureIdRef.current = myCreature?.id ?? null; }, [myCreature?.id]);
  // Creature behind the previewed token, once the token list has landed. Only
  // meaningful in the GM's preview iframe; null everywhere else.
  const [previewTokenCreatureId, setPreviewTokenCreatureId] = useState(null);
  const [showCharacterEdit, setShowCharacterEdit] = useState(false);
  const [showActionsRef, setShowActionsRef] = useState(false);
  const [showLookup, setShowLookup] = useState(false);
  const [sheetTab, setSheetTab] = useState('edit');
  const [showQuickRef, setShowQuickRef] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  // Per-player master volume. Applied via a master GainNode all audio routes
  // through, so it scales GM sounds + ambient without touching GM-side levels.
  // Persisted per-browser so it survives reloads.
  const MASTER_VOLUME_KEY = 'dndvtt_player_master_volume_v1';
  const [masterVolume, setMasterVolume] = useState(() => {
    try {
      const v = parseFloat(localStorage.getItem(MASTER_VOLUME_KEY));
      if (Number.isFinite(v) && v >= 0 && v <= 1) return v;
    } catch {}
    return 1;
  });
  const [showVolume, setShowVolume] = useState(false);
  // While true, the quick-control wrapper's native drag-to-reorder is
  // suppressed so dragging the volume slider adjusts the slider instead
  // of picking up the whole button.
  const [quickCtrlDragLocked, setQuickCtrlDragLocked] = useState(false);
  const masterGainRef = useRef(null);
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
  // Full-screen scene art shown in place of the map. Seeded from the session
  // fetch so a refresh mid-scene doesn't flash the map before the art lands.
  const [backdrop, setBackdrop] = useState(null); // { id, name, image_path }
  // Lobby. `sessionStarted` is null until the first payload lands so we don't
  // flash the waiting room at a player joining a game already in progress.
  const [sessionStarted, setSessionStarted] = useState(null);
  const [lobbyRoster, setLobbyRoster] = useState([]);

  // Tell the lobby which character we're bound to. Runs for the whole session,
  // not just while the lobby is on screen, so the GM's roster is already
  // accurate the moment they send everyone back to it.
  // The creature id rides along so the GM can put this player into a mapless
  // combat without them ever having been spawned onto a map — the lobby roster
  // is otherwise just names, and a name is not enough to build a token from.
  useEffect(() => {
    if (!setup.ready) return;
    const announce = () => socket.emit('lobby_set_character', {
      characterName: myCreature?.name || null,
      creatureId: myCreature?.id ?? null,
    });
    announce();
    // Seats are keyed by socket id and rebuilt empty on reconnect, so a server
    // restart or a dropped connection would otherwise leave the GM's roster
    // showing "no character yet" until this player picked their sheet again.
    socket.on('connect', announce);
    return () => socket.off('connect', announce);
  }, [setup.ready, myCreature?.name, myCreature?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const [walls, setWalls] = useState([]);
  // The board's storeys, and which one the GM is showing. Players don't choose
  // — switching floor is a scene control — but they have to draw the same one.
  const [levels, setLevels] = useState([]);
  const [activeLevel, setActiveLevel] = useState(0);
  const [doors, setDoors] = useState([]);
  // Portals on the session map. Hidden ones are filtered server-side, so
  // anything that arrives here is something this player may see and use.
  const [portals, setPortals] = useState([]);
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
  // Tiles laid on a tile map. Players only ever watch these appear.
  const [tiles, setTiles] = useState([]);
  const [ships, setShips] = useState([]);
  const [shipFx, setShipFx] = useState([]);
  // GM projecting the live map: the whole map is revealed, this client's camera
  // follows the GM's, and the projection overrides which map is rendered.
  //
  // Declared HERE, above the override-fetch effect, because that effect's
  // dependency array is evaluated during render — a `const` declared further
  // down would be in its temporal dead zone and throw on first render.
  const [liveMapView, setLiveMapView] = useState(false);
  // The last thing a guard noticed, and when. Cleared on a timer rather than by
  // the server: the party is not told when they are back in the clear.
  const [sneakPulse, setSneakPulse] = useState(null);
  // Players are told a sneak sequence is running — they have to be, or the
  // movement cap would stop their drag with no explanation. It says nothing
  // about any guard.
  const [sneakMode, setSneakMode] = useState(false);
  const [sneakRoundAt, setSneakRoundAt] = useState(null);
  // A shop the GM has put on the table.
  const [shop, setShop] = useState(null);
  const [shopOffer, setShopOffer] = useState(null);
  // Set when the server refuses a move for being too far. The clamp normally
  // stops this happening at all; this is the backstop telling the player why a
  // token snapped back.
  const [moveBlocked, setMoveBlocked] = useState(null);
  useEffect(() => {
    if (!moveBlocked) return undefined;
    const t = setTimeout(() => setMoveBlocked(null), 2600);
    return () => clearTimeout(t);
  }, [moveBlocked]);
  useEffect(() => {
    if (!sneakPulse) return undefined;
    const t = setTimeout(() => setSneakPulse(null), sneakPulse.level === 'alerted' ? 4200 : 2600);
    return () => clearTimeout(t);
  }, [sneakPulse]);
  const [liveMapCamera, setLiveMapCamera] = useState(null);

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

  // Start pulling the panorama down while the flat map is still up.
  //
  // It is the largest asset this app loads, and it was only ever requested the
  // moment someone opened the 3D view — so the entire wait landed on the
  // switch. Reads the raw sources rather than `effectiveMap`, which is built
  // below the early returns and so can't be seen from a hook.
  const skyPath = overrideMap
    ? (overrideMap.map?.sky_image_path || null)
    : (session?.map_sky_image || null);
  useEffect(() => {
    if (skyPath) prefetchSky(`/uploads/${skyPath}`);
  }, [skyPath]);

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
    // An override map already carries its own grid_size, so it needs no
    // wildspace special-case — same rule as `effectiveMap`.
    const frame = overrideMap
      ? {
          gridSize: overrideMap.map?.grid_size || session.grid_size || 50,
          width:    overrideMap.map?.width,
          height:   overrideMap.map?.height,
        }
      : sessionMapFrame(session);
    setCenterOnMapPoint(tokenMapCentre(own, frame));
  }, [overrideMap, session?.map_id, session?.grid_size, session?.map_grid_size,
      session?.map_type, tokens, playerTokenId]);

  // Override-fetch effect — placed up here above the early returns so
  // it runs unconditionally on every render (Rules of Hooks). Reads
  // the resolver result inline rather than via a derived const so we
  // don't need to lift `desiredOverrideMapId` too. Bails out cleanly
  // when there's no session yet.
  useEffect(() => {
    if (!session?.id) return;

    // The GM projecting the map beats every other answer to "which map is this
    // client looking at". Without this, a player pinned elsewhere — split
    // party, or just auto-following their own token onto another map — stayed
    // on THAT map and merely had its fog lifted, which is not what "show the
    // party this map" means. Clearing the override drops them onto the
    // session's map, which is the one the GM is presenting.
    if (liveMapView) {
      const hadOverride = overrideMapRef.current != null;
      const sameAsSession = overrideMapRef.current?.mapId === session.map_id;
      if (!hadOverride || sameAsSession) setOverrideMap(null);
      else startMapTransition(() => setOverrideMap(null));
      return;
    }

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
          portals: data.portals || [],
          // The override map's OWN scenery. Without this the player fell back
          // to the session map's terrain, so a party split onto a dockside map
          // saw the star system's planets standing on the docks.
          terrain: data.terrain || [],
          // ...and its own hulls. `effectiveShips` reads overrideMap.ships and
          // fell back to [] because nothing ever set it, so a player on an
          // override map saw NO ships at all, in either view. It only looked
          // fine while every player happened to be on the session's own map.
          ships: data.ships || [],
          fowEnabled: data.fowEnabled,
        };
        // Same-map refetch (token added on this map, refetch key bump,
        // etc.) — pass through without a fade.
        const prevId = overrideMapRef.current?.mapId ?? null;
        const noVisibleChange = prevId === newSlice.mapId
          || (prevId == null && session?.map_id === newSlice.mapId);
        // The override map brings its own fog setting with it.
        if (newSlice.fowEnabled !== undefined) setFowEnabled(!!newSlice.fowEnabled);
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
  }, [session?.id, session?.map_id, playerTokenId, dmAssignedMapId, ownTokenMapId, registryVersion, overrideRefetchKey, liveMapView]);
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
  const [activePings, setActivePings] = useState([]);
  const [tokenFx, setTokenFx] = useState([]);
  const [fogBlocks, setFogBlocks] = useState([]);

  // Create the AudioContext immediately and resume it on the first user gesture.
  // This ensures it's in 'running' state before the GM ever triggers a sound,
  // so socket-triggered playback works without requiring a tap from the player.
  useEffect(() => {
    audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    // Master gain — every sound/ambient source connects here instead of
    // straight to destination, so the player's volume slider scales everything.
    const mg = audioCtxRef.current.createGain();
    mg.gain.value = masterVolume;
    mg.connect(audioCtxRef.current.destination);
    masterGainRef.current = mg;
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

  // Safety net: always clear the drag lock on any global pointer release,
  // even if it happens off the slider thumb.
  useEffect(() => {
    if (!quickCtrlDragLocked) return;
    const clear = () => setQuickCtrlDragLocked(false);
    window.addEventListener('pointerup', clear);
    window.addEventListener('pointercancel', clear);
    return () => {
      window.removeEventListener('pointerup', clear);
      window.removeEventListener('pointercancel', clear);
    };
  }, [quickCtrlDragLocked]);

  // Apply master volume changes live + persist. Smooth ramp avoids clicks.
  useEffect(() => {
    const mg = masterGainRef.current;
    const ctx = audioCtxRef.current;
    if (mg && ctx) {
      const now = ctx.currentTime;
      mg.gain.cancelScheduledValues(now);
      mg.gain.setValueAtTime(mg.gain.value, now);
      mg.gain.linearRampToValueAtTime(masterVolume, now + 0.08);
    }
    try { localStorage.setItem(MASTER_VOLUME_KEY, String(masterVolume)); } catch {}
  }, [masterVolume]);

  // Centre the map on the player token once on load.
  useEffect(() => {
    if (hasCenteredRef.current || !playerTokenId || !tokens.length || !session) return;
    const t = tokens.find(tok => tok.id === playerTokenId);
    if (!t) return;
    hasCenteredRef.current = true;
    setCenterOnMapPoint(tokenMapCentre(t, sessionMapFrame(session)));
  }, [playerTokenId, tokens, session]);

  // Fetch creature data for the character sheet
  useEffect(() => {
    // Preview mode has no creature in its URL — resolve the sheet from the
    // token being previewed instead, so the iframe shows that player's actual
    // character (and their Wild Shape forms) rather than nothing.
    const id = creatureIdParam
      || (previewTokenId ? previewTokenCreatureId : null);
    if (!id) return;
    fetch(`/api/creatures/${id}`)
      .then((r) => r.json())
      .then((data) => { if (!data.error) setMyCreature(data); })
      .catch(() => {});
  }, [creatureIdParam, previewTokenId, previewTokenCreatureId]);

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

    // Re-join on every connect (the server treats join_session as idempotent
    // and re-hydrates state), and check the connection is real whenever the
    // machine wakes — a laptop lid closed over a game leaves a socket that
    // reads as connected while the server evicted it an hour ago.
    const joinAsPlayer = () => socket.emit('join_session', { sessionCode: code, role: 'player', name });
    const detachKeepalive = attachSessionKeepalive({
      join: joinAsPlayer,
      onStatus: (state) => { if (state === 'offline') setConnected(false); },
    });

    socket.on('connect', () => {
      setConnected(true);
      setReconnectAttempt(0);
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

    socket.on('session_joined', ({ state, userColors: uc, liveMapCamera: cam }) => {
      // See the note in DMView: re-reported on every join because a reconnect
      // is a new socket, and the patrol runner counts watchers per socket.
      // `effectiveMapIdRef` holds the override map when the party is split.
      socket.emit('set_player_active_map_id', {
        mapId: effectiveMapIdRef.current ?? state?.session?.map_id ?? null,
      });
      setLiveMapView(!!state.session?.live_map_view);
      setLiveMapCamera(cam || null);
      setSession(state.session);
      // A scene already running when we joined — show it immediately rather
      // than waiting for the next backdrop_changed broadcast (which may never
      // come if the GM doesn't touch it again).
      setBackdrop(state.session?.backdrop_id && state.session?.backdrop_image
        ? { id: state.session.backdrop_id, name: state.session.backdrop_name, image_path: state.session.backdrop_image }
        : null);
      // Older sessions predate the column and read as undefined — treat that
      // as started so an existing game never traps its players in a lobby.
      setSessionStarted(state.session?.session_started !== false);
      setSpellTemplates(Array.isArray(state.spellTemplates) ? state.spellTemplates : []);
      setRollLog(Array.isArray(state.rollLog) ? state.rollLog : []);
      // The server allocates ink colours per session, so it is the authority;
      // this only drives the local preview while a stroke is being drawn.
      if (state.inkColor) setMyInkColor(state.inkColor);
      setDrawings(Array.isArray(state.drawings) ? state.drawings : []);
      // Where our own token lives, straight from the join.
      //
      // This drives auto-follow: a player stays on their token's board instead
      // of being dragged along every time the GM switches maps. It used to be
      // set only by `player_token_ready`, so a join or reconnect that didn't
      // re-fire that event left it null — and a null reads as "no opinion",
      // which drops the player onto the session map. The server now answers it
      // as part of the join.
      if (state.ownToken) {
        setOwnTokenMapId(state.ownToken.mapId == null ? null : Number(state.ownToken.mapId));
        if (state.ownToken.id != null) setPlayerTokenId((prev) => prev ?? state.ownToken.id);
      }
      // Load enabled plugins as soon as we know the session id. Errors are
      // isolated per plugin and ignored on the player side — players see no
      // plugin manager UI; the GM resolves any issues from their side.
      loadPlugins({ context: { sessionId: state.session.id, role: 'player', socket } });
      setTokens(state.tokens.filter((t) => !t.is_hidden));
      setTerrain(state.terrain || []);
      setTiles(state.tiles || []);
      setShips(state.ships || []);
      // Pick up our own GM-set override on join. The server keys these
      // by player name, so a reconnect with the same name re-applies
      // automatically.
      const overrides = state.playerMapOverrides || {};
      setDmAssignedMapId(overrides[name] != null ? Number(overrides[name]) : null);
      setWalls(state.walls || []);
      setLevels(state.levels || []);
      setActiveLevel(Number(state.session?.map_active_level) || 0);
      setDoors(state.doors || []);
      setPortals(state.portals || []);
      setLights(state.lights || []);
      setMagicalDarkness(state.magicalDarkness || []);
      setFogBlocks(state.fogBlocks || []);
      setFowEnabled(state.session.fow_enabled || false);
      setFowBlur(state.session.fow_blur ?? 16);
      setFowColor(state.session.fow_color || '#000000');
      setAmbientLight(state.session.ambient_light || 'bright');
      setSneakMode(!!state.session.sneak_mode);
      setSneakRoundAt(state.session.sneak_round_at ?? null);
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
          // Adopt the previewed player's identity for ownership checks, so
          // actions that are gated on "is this your token" (Wild Shape, and
          // anything added later) behave as they would for that player rather
          // than being refused because the iframe joined as "Preview".
          socket.emit('player_preview_bind', { tokenId: previewTokenId });
          const previewed = (state.tokens || []).find((t) => t.id === previewTokenId);
          if (previewed?.creature_id) setPreviewTokenCreatureId(previewed.creature_id);
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

    // Stepping through a gate moves you somewhere you weren't looking. Snap
    // the camera to the exit so the player doesn't have to hunt for their own
    // token — same treatment a map change already gets.
    //
    // Centred on the destination pad rather than the token row: this arrives
    // alongside token_moved, and reading the token's position here would race
    // the state update that has not been applied yet.
    socket.on('portal_used', ({ tokenId, padCol, padRow }) => {
      if (tokenId !== playerTokenIdRef.current) return;
      if (padCol == null || padRow == null) return;
      const sess = sessionRef.current;
      const om = overrideMapRef.current;
      const frame = om
        ? {
            gridSize: om.map?.grid_size || sess?.grid_size || 50,
            width:    om.map?.width,
            height:   om.map?.height,
          }
        : sessionMapFrame(sess);
      const gs = Number(frame.gridSize) || 50;
      const mW = Number(frame.width)  || 2000;
      const mH = Number(frame.height) || 1500;
      // Same half-cell grid offset tokenMapCentre uses, so the camera lands on
      // the same lattice the pads are drawn on.
      // padCol/padRow are already the pad's centre in grid units.
      setCenterOnMapPoint({
        x: (mW % gs) / 2 + Number(padCol) * gs,
        y: (mH % gs) / 2 + Number(padRow) * gs,
      });
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

    socket.on('live_map_view_changed', ({ on, camera }) => {
      setLiveMapView(!!on);
      // Null on the way out, so the local camera takes over again cleanly.
      setLiveMapCamera(on ? (camera || null) : null);
    });
    socket.on('live_map_camera', ({ camera }) => setLiveMapCamera(camera || null));

    // The board grew to fit a tile laid past its edge. A plain grow only
    // changes the map's size; a shift moved everything, so the whole board
    // is re-read through the same route a map switch uses.
    socket.on('map_resized', async ({ mapId, width, height, gridCols, gridRows, shifted }) => {
      setSession((prev) => (prev && prev.map_id === mapId ? {
        ...prev, map_width: width, map_height: height,
        map_grid_cols: gridCols, map_grid_rows: gridRows,
      } : prev));
      if (!shifted) return;
      try {
        const sid = sessionRef.current?.id;
        if (!sid) return;
        const r = await fetch(`/api/maps/${mapId}/state?session_id=${sid}`);
        if (!r.ok) return;
        const d = await r.json();
        setTiles(d.tiles || []);
        setTokens(d.tokens || []);
        setWalls(d.walls || []);
        setDoors(d.doors || []);
        setTerrain(d.terrain || []);
      } catch { /* the next map change will resync */ }
    });

    // The GM laid a card, or lifted one back off.
    socket.on('tiles_placed', ({ tile }) => {
      // For the board this player is actually looking at. The broadcast reaches
      // the whole session, and a player may be held on a different map than the
      // GM's current one, so the override has the final say — the same answer
      // the rest of this view uses for "which map am I rendering".
      const here = overrideMapRef.current?.mapId ?? sessionRef.current?.map_id ?? null;
      if (tile?.map_id != null && here != null && tile.map_id !== here) return;
      setTiles((prev) => (prev.some((x) => x.id === tile.id) ? prev : [...prev, tile]));
    });
    socket.on('tiles_removed', ({ tileId }) => {
      setTiles((prev) => prev.filter((x) => x.id !== tileId));
    });

    socket.on('backdrop_changed', ({ backdrop: b }) => {
      setBackdrop(b || null);
    });

    // The GM renamed the session — it is on the top bar and the lobby header,
    // both of which read straight off `session`.
    socket.on('session_renamed', ({ name }) => {
      setSession((prev) => (prev ? { ...prev, name } : prev));
    });

    // A creature's 3D standing art changed — a new upload, or the GM switching
    // which look is on the board. Tokens carry `creature_standee` from the
    // JOIN made when the map loaded, so without this the figure only changes
    // on the next reload.
    socket.on('creature_standee_changed', ({ creatureId, standeeImagePath }) => {
      const patch = (t) => (Number(t.creature_id) === Number(creatureId)
        ? { ...t, creature_standee: standeeImagePath } : t);
      setTokens((prev) => prev.map(patch));
      setOverrideMap((prev) => (prev
        ? { ...prev, tokens: (prev.tokens || []).map(patch) }
        : prev));
    });

    // The GM rescheduled. Patched into `session` rather than kept in its own
    // state because that is where the initial values already arrive from
    // (`SELECT s.*`), and a second source for the same three fields is how the
    // lobby would end up showing a stale date after a reschedule.
    socket.on('next_session_changed', ({ at, note, minutes }) => {
      setSession((prev) => (prev ? {
        ...prev,
        next_session_at: at ?? null,
        next_session_note: note || '',
        next_session_minutes: minutes ?? 180,
      } : prev));
    });

    socket.on('lobby_updated', ({ roster }) => {
      setLobbyRoster(Array.isArray(roster) ? roster : []);
    });

    socket.on('session_started_changed', ({ started }) => {
      setSessionStarted(!!started);
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

    socket.on('token_visibility_changed', ({ tokenId, isHidden, token }) => {
      if (isHidden) {
        setTokens((prev) => prev.filter((t) => t.id !== tokenId));
        removeOverrideToken(tokenId);
      } else if (token) {
        // Reveal: the token was filtered out of our list while hidden, so
        // add it back from the broadcast payload (update in place if a
        // stale copy is somehow still present).
        setTokens((prev) => {
          const exists = prev.some((t) => t.id === tokenId);
          return exists
            ? prev.map((t) => (t.id === tokenId ? { ...t, ...token } : t))
            : [...prev, token];
        });
        addOverrideToken(token);
      }
    });

    socket.on('token_added', ({ token }) => {
      if (!token.is_hidden) {
        setTokens((prev) => {
          if (prev.find((t) => t.id === token.id)) {
            return prev.map((t) => (t.id === token.id ? { ...t, ...token } : t));
          }
          return [...prev, token];
        });
        addOverrideToken(token);
      }
    });

    // A creature row changed somewhere — the GM edited this sheet, or the
    // player edited it in another tab. Nothing in the web client listened for
    // this before, so a sheet edit only showed up after a manual refresh.
    socket.on('creature_updated', ({ creatureId }) => {
      const mine = myCreatureIdRef.current;
      if (mine == null || Number(creatureId) !== Number(mine)) return;
      fetch(`/api/creatures/${creatureId}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => { if (data && !data.error) setMyCreature(data); })
        .catch(() => {});
    });

    socket.on('token_elevation_changed', ({ tokenId, elevation, isFlying }) => {
      setTokens((prev) => prev.map((t) => (t.id === tokenId ? { ...t, elevation, is_flying: isFlying } : t)));
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

    socket.on('token_size_changed', ({ tokenId, size, sizeSquares }) => {
      setTokens((prev) =>
        prev.map((t) => (t.id === tokenId ? { ...t, size, size_squares: sizeSquares ?? null } : t))
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

    // Transformation / destruction animations, played on every screen at once.
    socket.on('token_fx', ({ tokenId, effect, ts }) => {
      const entry = { tokenId, effect, ts: ts || Date.now() };
      setTokenFx((prev) => [...prev, entry]);
      setTimeout(() => setTokenFx((prev) => prev.filter((f) => f !== entry)), 2500);
    });

    socket.on('token_auras_changed', ({ tokenId, auras }) => {
      const patch = (t) => ({ ...t, auras });
      setTokens((prev) => prev.map((t) => (t.id === tokenId ? patch(t) : t)));
      patchOverrideToken(tokenId, patch);
    });
    socket.on('token_mark_changed', ({ tokenId, markedBy, markLabel }) => {
      const patch = (t) => ({ ...t, marked_by: markedBy, mark_label: markLabel });
      setTokens((prev) => prev.map((t) => (t.id === tokenId ? patch(t) : t)));
      patchOverrideToken(tokenId, patch);
    });
    socket.on('token_exhaustion_changed', ({ tokenId, exhaustion }) => {
      const patch = (t) => ({ ...t, exhaustion });
      setTokens((prev) => prev.map((t) => (t.id === tokenId ? patch(t) : t)));
      patchOverrideToken(tokenId, patch);
    });

    socket.on('token_label_visibility_changed', ({ tokenId, hideName, hideHp }) => {
      const patch = (t) => ({ ...t, hide_name_from_players: hideName, hide_hp_from_players: hideHp });
      setTokens((prev) => prev.map((t) => (t.id === tokenId ? patch(t) : t)));
      patchOverrideToken(tokenId, patch);
    });

    // Familiar bound/unbound. Drives both the fog-of-war origins and the
    // familiar panel, so it has to land on the override snapshot too.
    socket.on('token_familiar_changed', ({ tokenId, familiarOf, companionKind }) => {
      const patch = (t) => ({ ...t, familiar_of: familiarOf, companion_kind: companionKind || null });
      setTokens((prev) => prev.map((t) => (t.id === tokenId ? patch(t) : t)));
      patchOverrideToken(tokenId, patch);
    });

    // Live terrain sync.
    //
    // The server broadcasts these to the WHOLE session room — see
    // broadcastTerrain in backend/src/index.js — filtered only by whether the
    // piece is hidden, not by which map each client happens to be rendering.
    // The row carries its own map_id, so `added` has to be filtered here or a
    // piece placed on one board turns up on whatever board this client is
    // showing. That is exactly how a star system's planets ended up standing
    // on a dockside map.
    //
    // `updated` and `removed` need no guard: both are no-ops when the piece
    // isn't already in the list.
    socket.on('terrain_added', ({ terrain: t }) => {
      if (!t) return;
      // Mirror into the override snapshot too — no-op unless the piece belongs
      // to the map this player is actually looking at.
      appendOverrideField('terrain', t);
      const here = effectiveMapIdRef.current;
      if (t.map_id != null && here != null && Number(t.map_id) !== Number(here)) return;
      setTerrain(prev => prev.some(x => x.id === t.id) ? prev : [...prev, t]);
    });
    socket.on('terrain_updated', ({ terrain: t }) => {
      if (!t) return;
      patchOverrideField('terrain', (x) => x.id === t.id, () => t);
      setTerrain(prev => prev.map(x => x.id === t.id ? t : x));
    });
    socket.on('terrain_removed', ({ id }) => {
      removeOverrideField('terrain', (x) => x.id === id);
      setTerrain(prev => prev.filter(x => x.id !== id));
    });

    // Ships. A player may be the one piloting, but the server is still the
    // authority — these handlers only mirror what it broadcasts.
    const applyShipTokenPatches = (patches) => {
      if (!patches?.length) return;
      const byId = new Map(patches.map(p => [p.tokenId, p]));
      setTokens(prev => prev.map(t => {
        const p = byId.get(t.id);
        return p ? { ...t, grid_col: p.gridCol, grid_row: p.gridRow } : t;
      }));
    };
    // Every ship event has to reach BOTH the session list and the override
    // snapshot, or a split-party player's hulls freeze at whatever the fetch
    // returned. Same shape as the token and terrain patchers above.
    const patchShip = (shipId, mutator) => {
      setShips(prev => prev.map(s => s.id === shipId ? mutator(s) : s));
      patchOverrideField('ships', (s) => s.id === shipId, mutator);
    };
    socket.on('ship_placed',  ({ ship })   => {
      appendOverrideField('ships', ship);
      setShips(prev => prev.some(s => s.id === ship.id) ? prev : [...prev, ship]);
    });
    // Ship destruction animation. Carries its own geometry because the ship row
    // is already gone by the time this lands. Entries are dropped once the
    // longest effect has had time to finish, so the list can't grow.
    socket.on('ship_destroyed', (fx) => {
      setShipFx((prev) => [...prev.filter((f) => Date.now() - f.ts < 4000), fx]);
      setTimeout(() => setShipFx((prev) => prev.filter((f) => f !== fx)), 4000);
    });
    socket.on('ship_removed', ({ shipId }) => {
      removeOverrideField('ships', (s) => s.id === shipId);
      setShips(prev => prev.filter(s => s.id !== shipId));
      setTokens(prev => prev.map(t => t.ship_id === shipId ? { ...t, ship_id: null, deck_col: null, deck_row: null } : t));
    });
    socket.on('ship_moved', ({ shipId, gridCol, gridRow, tokenPatches }) => {
      patchShip(shipId, (s) => ({ ...s, grid_col: gridCol, grid_row: gridRow }));
      applyShipTokenPatches(tokenPatches);
    });
    socket.on('ship_rotated', ({ shipId, rotation, tokenPatches }) => {
      patchShip(shipId, (s) => ({ ...s, rotation }));
      applyShipTokenPatches(tokenPatches);
    });
    socket.on('ships_refreshed', ({ ships: rows }) => {
      setShips(rows || []);
      // The broadcast is the SESSION map's ships. Each row carries its own
      // map_id, so the override snapshot keeps only the ones on its board —
      // taking the list wholesale would put the GM's hulls on the player's.
      setOverrideMap((prev) => prev
        ? { ...prev, ships: (rows || []).filter((s) => Number(s.map_id) === Number(prev.mapId)) }
        : prev);
    });
    socket.on('ship_deck_changed', ({ shipId, deckIndex }) =>
      patchShip(shipId, (s) => ({ ...s, active_deck: deckIndex })));
    socket.on('ship_renamed', ({ shipId, name }) =>
      setShips(prev => prev.map(s => s.id === shipId ? { ...s, name } : s)));
    socket.on('ship_attunement_changed', ({ shipId, playerName }) =>
      patchShip(shipId, (s) => ({ ...s, attuned_player: playerName })));
    // Ships are combatants of their own in a ship fight, so the player strip
    // has to hear about hull damage, their initiative and who's in the order.
    socket.on('ship_hp_changed', ({ shipId, currentHp }) =>
      patchShip(shipId, (s) => ({ ...s, current_hp: currentHp })));
    socket.on('ship_initiative_changed', ({ shipId, initiative }) =>
      patchShip(shipId, (s) => ({ ...s, initiative })));
    socket.on('ship_combat_changed', ({ shipId, inCombat }) =>
      patchShip(shipId, (s) => ({ ...s, in_combat: inCombat })));
    socket.on('token_deck_moved', ({ tokenId, shipId, deckIndex, gridCol, gridRow, deckCol, deckRow }) =>
      setTokens(prev => prev.map(t => t.id === tokenId
        ? { ...t, ship_id: shipId, deck_index: deckIndex, grid_col: gridCol, grid_row: gridRow, deck_col: deckCol, deck_row: deckRow }
        : t)));

    socket.on('map_level_changed', ({ levelIndex }) => setActiveLevel(Number(levelIndex) || 0));
    socket.on('token_level_changed', ({ token }) => {
      setTokens((prev) => prev.map((t) => (t.id === token.id ? token : t)));
    });

    socket.on('map_changed', async ({ map, levels: newLevels, walls: newWalls, doors: newDoors, lights: newLights, tokens: newTokens, magicalDarkness: newDarkness, terrain: newTerrain, ships: newShips, portals: newPortals, fowEnabled: newFowEnabled, spellTemplates: newTemplates, drawings: newDrawings, tiles: newTiles }) => {
      // Map-scoped state travels with the map change — see the server. The
      // sky rides on the session row, which map_changed doesn't rewrite, so
      // it's patched in explicitly below.
      setSpellTemplates(Array.isArray(newTemplates) ? newTemplates : []);
      setDrawings(Array.isArray(newDrawings) ? newDrawings : []);
      // Replaced with the board, like the templates and ink above — otherwise
      // the last map's tiles stay on screen over the new one.
      setTiles(Array.isArray(newTiles) ? newTiles : []);
      setTerrain(newTerrain || []);
      setLevels(newLevels || []);
      setActiveLevel(Number(map?.active_level) || 0);
      setShips(newShips || []);
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
                portals: data.portals || [],
                fowEnabled: data.fowEnabled,
              });
              if (data.fowEnabled !== undefined) setFowEnabled(!!data.fowEnabled);
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
        map_type: map.map_type || 'image',
        map_sky_image: map.sky_image_path || null,
        map_system: map.system_data || null,
        map_grid_cols: map.grid_cols ?? null,
        map_grid_rows: map.grid_rows ?? null,
        map_grid_size: map.grid_size ?? null,
        map_grid_type: map.grid_type || 'square',
        map_grid_scale: map.grid_scale ?? 5,
        map_grid_unit: map.grid_unit ?? 'ft',
        map_grid_scale_visible: !!map.grid_scale_visible,
        ...(map.grid_size ? { grid_size: map.grid_size } : {}),
      }) : ({ ...prev, map_id: null, map_image: null, map_name: null }));
      setWalls(newWalls  || []);
      setDoors(newDoors  || []);
      setPortals(newPortals || []);
      // Only when we're actually showing the session's map — a player pinned
      // to an override map keeps that map's setting, which the override fetch
      // below supplies.
      if (newFowEnabled !== undefined && !overrideMapRef.current) setFowEnabled(!!newFowEnabled);
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
    socket.on('door_kind_changed', ({ doorId, portalKind }) => {
      setDoors((prev) => prev.map((d) => (d.id === doorId ? { ...d, portal_kind: portalKind } : d)));
    });
    socket.on('door_toggled',    ({ doorId, isOpen }) => {
      setDoors(prev => prev.map(d => d.id === doorId ? { ...d, is_open: isOpen } : d));
      patchOverrideField('doors', (d) => d.id === doorId, (d) => ({ ...d, is_open: isOpen }));
    });
    socket.on('door_dir_flipped', ({ doorId, openDir }) => {
      setDoors(prev => prev.map(d => d.id === doorId ? { ...d, open_dir: openDir } : d));
      patchOverrideField('doors', (d) => d.id === doorId, (d) => ({ ...d, open_dir: openDir }));
    });
    socket.on('door_sprite_changed', ({ doorId, spritePath, spriteMotion }) => {
      setDoors(prev => prev.map(d => d.id === doorId ? { ...d, sprite_path: spritePath, sprite_motion: spriteMotion } : d));
      patchOverrideField('doors', (d) => d.id === doorId, (d) => ({ ...d, sprite_path: spritePath, sprite_motion: spriteMotion }));
    });
    socket.on('door_light_changed', ({ doorId, lightRadius, lightColor, lightSide }) => {
      setDoors(prev => prev.map(d => d.id === doorId ? { ...d, light_radius: lightRadius, light_color: lightColor, light_side: lightSide } : d));
      patchOverrideField('doors', (d) => d.id === doorId, (d) => ({ ...d, light_radius: lightRadius, light_color: lightColor, light_side: lightSide }));
    });
    socket.on('doors_cleared', () => {
      setDoors([]);
      clearOverrideField('doors');
    });

    // ── Portals ────────────────────────────────────────────────────────
    // Upserts, not appends: a portal the GM has just un-hidden arrives as
    // an update, and this client dropped the row while it was hidden.
    const upsertPortal = (portal) => {
      if (!portal) return;
      setPortals(prev => prev.some(p => p.id === portal.id)
        ? prev.map(p => (p.id === portal.id ? portal : p))
        : [...prev, portal]);
      setOverrideMap((prev) => {
        if (!prev || prev.mapId !== portal.map_id) return prev;
        const list = prev.portals || [];
        return {
          ...prev,
          portals: list.some(p => p.id === portal.id)
            ? list.map(p => (p.id === portal.id ? portal : p))
            : [...list, portal],
        };
      });
    };
    socket.on('portal_added',   ({ portal }) => upsertPortal(portal));
    socket.on('portal_updated', ({ portal }) => upsertPortal(portal));
    socket.on('portal_removed', ({ id }) => {
      setPortals(prev => prev.filter(p => p.id !== id));
      removeOverrideField('portals', (p) => p.id === id);
    });
    socket.on('portals_cleared', () => {
      setPortals([]);
      clearOverrideField('portals');
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
    socket.on('darkness_attached', ({ darknessId, tokenId }) => {
      setMagicalDarkness((prev) => prev.map((d) => (d.id === darknessId ? { ...d, attached_token_id: tokenId } : d)));
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

    socket.on('zone_height_updated', ({ darknessId, heightFt }) => {
      setMagicalDarkness(prev => prev.map(d => d.id === darknessId ? { ...d, height_ft: heightFt } : d));
      patchOverrideField('magicalDarkness', (d) => d.id === darknessId, (d) => ({ ...d, height_ft: heightFt }));
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
            gain.connect(masterGainRef.current || ctx.destination);
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
          gain.connect(masterGainRef.current || ctx.destination);
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

    socket.on('fow_changed', ({ enabled, mapId }) => {
      // Fog of war is per map. The map we're rendering may be an override,
      // not the session's, so compare against whichever is on screen.
      const rendered = overrideMapRef.current?.mapId ?? sessionRef.current?.map_id ?? null;
      if (mapId != null && Number(mapId) !== Number(rendered)) return;
      setFowEnabled(enabled);
    });
    socket.on('fow_blur_changed',      ({ blur })         => setFowBlur(blur));
    socket.on('fow_color_changed',     ({ color })        => setFowColor(color || '#000000'));
    socket.on('ambient_light_changed', ({ ambientLight: al }) => setAmbientLight(al));
    // SNEAK MODE — all the party is ever told.
    //
    // A level and nothing else: not which guard, not where it is looking, not
    // how many of them there are. The server does not send those to a player
    // (see detection.js), and the whole point is that "something has noticed
    // you" is a reason to stop and think rather than a number to play against.
    socket.on('sneak_pulse', ({ level }) => {
      setSneakPulse({ level, at: Date.now() });
    });
    socket.emit('shop_my_offer', { creatureId: myCreatureIdRef.current });
    socket.on('shop_opened', (payload) => {
      setShop(payload || null);
      if (!payload) setShopOffer(null);
      // Ask what we still have outstanding. A counter sent while this client
      // was reloading was never matched to anything locally, so without this
      // the shop reopens with no sign the shopkeeper ever replied.
      else socket.emit('shop_my_offer', { creatureId: myCreatureIdRef.current });
    });
    socket.on('shop_changed', (payload) => setShop((prev) => (prev ? payload : prev)));
    socket.on('shop_offer_sent', ({ offer }) => setShopOffer(offer));
    socket.on('shop_offer_updated', ({ offer }) => {
      setShopOffer((prev) => (prev && prev.id === offer.id
        ? (['accepted', 'declined', 'withdrawn'].includes(offer.status) ? null : offer)
        : prev));
    });
    socket.on('sneak_mode_changed', ({ enabled, roundAt }) => {
      setSneakMode(!!enabled);
      setSneakRoundAt(roundAt ?? null);
    });
    // A round's worth of movement. Kept on the token row itself so the map has
    // one place to read it from — see moveRemainingFt in MapStage.
    socket.on('move_budget', ({ tokenId, spent, resetsAt }) => {
      setTokens((prev) => prev.map((t) => t.id === tokenId
        ? { ...t, move_spent: spent, move_window_at: new Date(resetsAt - 6000).toISOString() }
        : t));
    });
    socket.on('move_budgets_cleared', () => {
      setTokens((prev) => prev.map((t) => ({ ...t, move_spent: 0, move_window_at: null })));
    });
    socket.on('move_blocked', ({ costFt, remaining }) => {
      setMoveBlocked({ costFt, remaining, at: Date.now() });
    });
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

    socket.on('combat_changed', ({ active, currentTurn, tokenIds, shipIds }) => {
      setCombatActive(active);
      setCombatTurn(currentTurn);
      if (active && Array.isArray(shipIds)) {
        const shipSet = new Set(shipIds);
        setShips((prev) => prev.map((s) => ({ ...s, in_combat: shipSet.has(s.id) })));
      }
      if (!active) {
        setTokens((prev) => prev.map((t) => ({ ...t, in_combat: false })));
        setShips((prev) => prev.map((s) => ({ ...s, in_combat: false })));
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

    // A hand-over touches two sheets; this socket may be either end of it.
    socket.on('inventory_transferred', ({ fromCreatureId, toCreatureId, fromInventory, toInventory, fromName, item }) => {
      if (toCreatureId === creatureIdParam) {
        setMyCreature(prev => prev ? { ...prev, inventory: toInventory } : prev);
        setTreasureNotif([{ type: 'item', name: `${item.name}${item.qty > 1 ? ` ×${item.qty}` : ''} — from ${fromName}` }]);
        setTimeout(() => setTreasureNotif(null), 6000);
      } else if (fromCreatureId === creatureIdParam) {
        setMyCreature(prev => prev ? { ...prev, inventory: fromInventory } : prev);
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

    socket.on('table_rolled', (entry) => setRollLog((prev) => [...prev, entry].slice(-200)));

    // ── Freehand ink ──
    socket.on('draw_stroke', (stroke) => setDrawings((prev) => [...prev, stroke]));
    socket.on('draw_removed', ({ ids }) => {
      const gone = new Set(ids || []);
      setDrawings((prev) => prev.filter((d) => !gone.has(d.id)));
    });

    socket.on('dice_rolled', (data) => {
      const id = ++rollIdRef.current;
      const roll = { ...data, id };
      setDiceRolls((prev) => [...prev, roll]);
      setTimeout(() => setDiceRolls((prev) => prev.filter((r) => r.id !== id)), 5000);
      // The overlay is a 5-second flash; the log is the record.
      setRollLog((prev) => [...prev, data].slice(-200));

      // Our own surge comes back here: the server rolled it, so the popup and
      // the shared dice log necessarily show the same number. Other people's
      // surges stay in the log — only the sorcerer gets the modal.
      if (data?.label === 'Wild Magic Surge' && data.userName === nameRef.current) {
        const rolls = Array.isArray(data.rolls) ? data.rolls : [];
        if (rolls.length) {
          setWildMagic({
            result: wildMagicResult(rolls[0]),
            alt: rolls.length > 1 ? wildMagicResult(rolls[1]) : null,
          });
        }
      }
    });

    socket.on('measure_update', ({ meas, color, name: senderName }) => {
      setRemoteMeasurements(prev => {
        const filtered = prev.filter(m => m.name !== senderName);
        if (!meas) return filtered;
        return [...filtered, { name: senderName, meas, color }];
      });
    });

    socket.on('map_ping', ({ id, x, y, mapId, level, size }) => {
      // effectiveMap is from state — compare via session-level map id
      const ts = Date.now();
      // Deliberately NOT filtered by the storey this player is on: a ping is
      // the GM saying "look here", and dropping the ones aimed at another floor
      // would silently swallow exactly the ones worth pointing at. The 3D view
      // raises it to `level` so it is obvious which floor is meant.
      setActivePings(prev => [...prev, { id, x, y, ts, level: Number(level) || 0, size }]);
      setTimeout(() => setActivePings(prev => prev.filter(p => p.id !== id)), 3500);
    });

    socket.on('fog_block_added', ({ fogBlock }) => {
      setFogBlocks(prev => [...prev, fogBlock]);
    });
    socket.on('fog_block_updated', ({ fogBlock }) => {
      setFogBlocks(prev => prev.map(fb => fb.id === fogBlock.id ? fogBlock : fb));
    });
    socket.on('fog_block_deleted', ({ id }) => {
      setFogBlocks(prev => prev.filter(fb => fb.id !== id));
    });

    socket.on('disconnect', () => setConnected(false));

    return () => {
      detachKeepalive();
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

  // Light presets now come from utils/lightPresets.js, shared with the player's
  // phone companion (/sheet). The logic used to live here and was reproduced
  // there from memory, which missed the two sources that matter most in play —
  // light-shedding inventory items and known spells — and offered a cleric a
  // menu of torches he was not carrying.
  //
  // Order is preserved exactly: base gear, then spells, then custom items.
  // `torchPreset` is an INDEX into this array and the menu does indexOf() on
  // these very objects, so both the order and the identity have to hold.
  const ICON_FOR = { none: NoLightIcon, candle: CandleIcon, torch: TorchIcon, lantern: LanternIcon };
  const TORCH_PRESETS = lightPresetsFor(myCreature).map((p) => ({
    ...p,
    Icon: p.custom ? LightBulbIcon : (p.isSpell ? null : (ICON_FOR[p.key] || null)),
  }));

  // Filtered from the SAME objects, so indexOf() against TORCH_PRESETS works.
  const availablePresets = TORCH_PRESETS.filter(
    (p, i) => i === 0 || p.custom || p.isSpell || carriesItem(myCreature, p.requiredItem)
  );

  // If the currently selected preset is no longer available (item removed from inventory), reset to No Light
  useEffect(() => {
    const current = TORCH_PRESETS[torchPreset];
    if (!current || (current.requiredItem && !carriesItem(myCreature, current.requiredItem))) {
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
    applyLevelDrop(tokenId, col, row);
  }

  // Stairs and falling, for a player's own moves.
  //
  // Same rule as the GM's, from the same helper. This view had none of it at
  // all, which is why a player could walk onto a staircase or off a balcony and
  // nothing happened — the storey logic only ever existed on the GM's side.
  //
  // `isGM: false` is the one difference, and it is the flight rule: a player's
  // flier is capped at the top of the building rather than being left wherever
  // it was put.
  function applyLevelDrop(tokenId, col, row) {
    const tok = (tokens || []).find((t) => t.id === tokenId);
    if (!tok) return;
    const next = resolveLevelAfterMove({
      levels, token: tok, col, row,
      mapW: session?.map_width, mapH: session?.map_height,
      // This view has no `effectiveGridSize` — that name is the GM's. The map's
      // own grid size wins, with the session's as the fallback for maps that
      // predate the per-map column.
      gridSize: Number(session?.map_grid_size) || Number(session?.grid_size) || 50,
      isGM: false,
      onReady: () => applyLevelDrop(tokenId, col, row),
      debug: true,
    });
    if (!next) return;
    setTokens((prev) => prev.map((t) => (t.id === tokenId
      ? { ...t, level_index: next.levelIndex, grid_col: next.gridCol, grid_row: next.gridRow } : t)));
    socket.emit('set_token_level', {
      tokenId, levelIndex: next.levelIndex, gridCol: next.gridCol, gridRow: next.gridRow,
    });
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

  // ── Wild Shape ────────────────────────────────────────────────────────────
  // `myCreature` is the character sheet, which stays put while the TOKEN wears
  // a beast — so the curated list survives shifting and the panel can offer the
  // way back out.
  const [showWildShape, setShowWildShape] = useState(false);
  const [showSenses, setShowSenses] = useState(false);
  // { result, alt } — alt is the second roll granted by Controlled Chaos.
  const [wildMagic, setWildMagic] = useState(null);
  const [wildShapeForms, setWildShapeForms] = useState([]);
  const [wildShapeBusy, setWildShapeBusy] = useState(false);

  const wildShapeIdKey = (Array.isArray(myCreature?.wildshape_forms)
    ? myCreature.wildshape_forms : []).map(Number).filter(Boolean).join(',');

  useEffect(() => {
    if (!wildShapeIdKey) { setWildShapeForms([]); return; }
    let cancelled = false;
    Promise.all(wildShapeIdKey.split(',').map((id) =>
      fetch(`/api/creatures/${id}`).then((r) => (r.ok ? r.json() : null)).catch(() => null)
    )).then((rows) => {
      if (!cancelled) setWildShapeForms(rows.filter(Boolean));
    });
    return () => { cancelled = true; };
  }, [wildShapeIdKey]);

  // Other player characters on the map — anyone with a sheet to receive into.
  const giveRecipients = useMemo(() => {
    const list = overrideMap ? (overrideMap.tokens || []) : tokens;
    return (list || [])
      .filter((t) => t.is_player && t.creature_id && t.id !== playerTokenId)
      .map((t) => ({
        id: t.id,
        label: t.player_name && t.player_name !== t.name ? `${t.name} (${t.player_name})` : t.name,
      }));
  }, [overrideMap, tokens, playerTokenId]);

  const myInventory = useMemo(() => {
    const inv = myCreature?.inventory;
    if (Array.isArray(inv)) return inv;
    if (typeof inv === 'string') { try { return JSON.parse(inv) || []; } catch { return []; } }
    return [];
  }, [myCreature]);

  // The token wears the beast; `pretransform` is how we know it's shifted.
  const myTokenRow = useMemo(() => {
    const list = overrideMap ? (overrideMap.tokens || []) : tokens;
    return (list || []).find((t) => t.id === playerTokenId) || null;
  }, [overrideMap, tokens, playerTokenId]);
  // The token keeps the character's NAME while shaped, so the form has to be
  // identified by the creature it's currently wearing rather than by the label.
  const currentShapeName = useMemo(() => {
    if (!myTokenRow?.pretransform) return null;
    const form = wildShapeForms.find((f) => f.id === myTokenRow.creature_id);
    return form?.name || 'another form';
  }, [myTokenRow, wildShapeForms]);

  const druidLevel = useMemo(() => {
    const c = myCreature;
    if (!c) return 0;
    let level = 0;
    if (String(c.char_class || '').toLowerCase() === 'druid') {
      level += Math.max(1, Number(c.char_level) || 1);
    }
    for (const mc of (Array.isArray(c.multiclasses) ? c.multiclasses : [])) {
      if (String(mc?.class || '').toLowerCase() === 'druid') {
        level += Math.max(1, Number(mc.level) || 1);
      }
    }
    return level || Math.max(1, Number(c.char_level) || 1);
  }, [myCreature]);

  // Circle of the Moon's Circle Forms triples this. Server computes the real
  // value on the shift; this is the readout so the number shown matches.
  const wildShapeTemp = useMemo(
    () => wildShapeTempHp(druidLevel, myCreature?.char_subclass),
    [druidLevel, myCreature?.char_subclass]
  );

  // ── Familiars ─────────────────────────────────────────────────────────────
  // Tokens the GM has bound to this player. They aren't player tokens, so
  // nothing else in this view claims them — the player sees through their
  // senses and can open their stat block, but the GM still owns their HP and
  // placement rules like any other token.
  // Whose familiars are ours. The setup name is only a fallback: the
  // authoritative answer is the player_name on our own token, because
  //   - the GM's player-preview iframe runs this view under the name
  //     "Preview" while bound to a real player's token, and
  //   - a player who retypes their name with different case or spacing
  //     still controls the token created under the original spelling.
  // Matching on the token row makes both cases resolve to the same owner
  // the GM picked from the context menu.
  const familiarOwnerName = useMemo(() => {
    const list = overrideMap ? (overrideMap.tokens || []) : tokens;
    const mine = (list || []).find((t) => t.id === playerTokenId);
    return String(mine?.player_name || name || '').trim().toLowerCase();
  }, [overrideMap, tokens, playerTokenId, name]);

  const familiarTokens = useMemo(() => {
    const list = overrideMap ? (overrideMap.tokens || []) : tokens;
    if (!familiarOwnerName) return [];
    return (list || []).filter(
      (t) => t.familiar_of && String(t.familiar_of).trim().toLowerCase() === familiarOwnerName
    );
  }, [overrideMap, tokens, familiarOwnerName]);

  // Which familiars are feeding fog-of-war right now. Stored as the *muted*
  // set so a newly bound familiar contributes vision immediately — the
  // interesting case ("my familiar is scouting") is the default.
  const FAMILIAR_MUTE_KEY = code ? `dndvtt_familiar_vision_muted_${code}` : null;
  const [familiarVisionMuted, setFamiliarVisionMuted] = useState(() => {
    try {
      const stored = FAMILIAR_MUTE_KEY ? JSON.parse(localStorage.getItem(FAMILIAR_MUTE_KEY) || '[]') : [];
      return new Set(Array.isArray(stored) ? stored : []);
    } catch { return new Set(); }
  });
  function toggleFamiliarVision(tokenId) {
    setFamiliarVisionMuted((prev) => {
      const next = new Set(prev);
      if (next.has(tokenId)) next.delete(tokenId); else next.add(tokenId);
      try {
        if (FAMILIAR_MUTE_KEY) localStorage.setItem(FAMILIAR_MUTE_KEY, JSON.stringify([...next]));
      } catch {}
      return next;
    });
  }

  // Extra vision origins handed to MapStage. Memoised on the id list rather
  // than the token objects so an HP tick doesn't invalidate the LOS memos.
  const familiarVisionIdKey = familiarTokens
    .filter((t) => !familiarVisionMuted.has(t.id))
    .map((t) => t.id)
    .join(',');
  const familiarVisionIds = useMemo(
    () => (familiarVisionIdKey ? familiarVisionIdKey.split(',').map(Number) : []),
    [familiarVisionIdKey]
  );

  const [showFamiliars, setShowFamiliars] = useState(false);
  const [showGiveItem, setShowGiveItem] = useState(false);
  const [giveBusy, setGiveBusy] = useState(false);
  // Stat blocks for bound familiars, keyed by creature id. Fetched lazily and
  // kept until the familiar is unbound — a familiar's sheet gets opened over
  // and over during a scouting turn.
  const [familiarCreatures, setFamiliarCreatures] = useState({});
  const familiarCreatureIdKey = familiarTokens
    .map((t) => t.creature_id)
    .filter(Boolean)
    .join(',');
  useEffect(() => {
    if (!familiarCreatureIdKey) return;
    let cancelled = false;
    for (const idStr of familiarCreatureIdKey.split(',')) {
      const cid = Number(idStr);
      if (!cid || familiarCreatures[cid]) continue;
      fetch(`/api/creatures/${cid}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((c) => {
          if (!cancelled && c) setFamiliarCreatures((prev) => ({ ...prev, [cid]: c }));
        })
        .catch(() => {});
    }
    return () => { cancelled = true; };
  }, [familiarCreatureIdKey]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Lobby gate. `sessionStarted === false` only becomes true once a payload
  // has actually told us so — while it's null we fall through to the spinner
  // below rather than flashing a waiting room at someone joining a live game.
  if (sessionStarted === false) {
    return (
      // Positioned wrapper so the sheet modal's `absolute inset-0` covers the
      // lobby rather than escaping to the document.
      <div className="relative w-screen h-screen">
        <LobbyView
          backdrop={backdrop}
          sessionName={session?.name}
          roster={lobbyRoster}
          nextSessionAt={session?.next_session_at || null}
          nextSessionNote={session?.next_session_note || ''}
          nextSessionMinutes={session?.next_session_minutes ?? 180}
          // Combat with no map. Built here rather than from `sortedCombat`,
          // which is computed further down — past this early return. No ships:
          // a hull only exists once it's placed on a map.
          // The banner is built here, not in LobbyView, so the lobby and the
          // map screen render the exact same component and can't drift apart.
          combatBanner={(() => {
            const order = buildCombatOrder(tokens, []);
            if (!combatActive || order.length === 0) return null;
            const counts = {};
            for (const e of order) counts[e.name] = (counts[e.name] || 0) + 1;
            const seen = {};
            const names = order.map((e) => {
              if (counts[e.name] <= 1) return e.name;
              seen[e.name] = seen[e.name] || 0;
              const suffix = String.fromCharCode(65 + seen[e.name]);
              seen[e.name]++;
              return `${e.name} ${suffix}`;
            });
            return (
              <PlayerCombatStrip
                sortedCombat={order}
                combatTurn={combatTurn}
                combatDisplayNames={names}
                large
                edge="none"
              />
            );
          })()}
          combatRound={combatActive ? Math.floor(combatTurn / Math.max(1, buildCombatOrder(tokens, []).length)) + 1 : 0}
          myName={setup.name}
          myCharacterName={myCreature?.name}
          onChangeCharacter={() => {
            // Drop the remembered pick too, or the setup screen would just
            // re-select the character they're trying to get away from.
            try { if (SETUP_KEY) localStorage.removeItem(SETUP_KEY); } catch {}
            setSetup({ ready: false, name: setup.name });
          }}
          // The waiting room is where players actually fix their sheets —
          // levelling up, spending the HP they forgot, correcting a stat they
          // fat-fingered at setup. Same editor they get in game.
          canEditCharacter={!!myCreature}
          onEditCharacter={() => { setSheetTab('edit'); setShowCharacterEdit(true); }}
        />
        {/* Boundaried exactly as the in-game copy is — the lobby is where
            players do most of their sheet editing, so it is if anything the
            likelier of the two places to hit a bad row. */}
        {showCharacterEdit && myCreature && (
          <ErrorBoundary label="Character sheet" onReset={() => setShowCharacterEdit(false)}>
            <CharacterSheetModal
              creature={myCreature}
              tab={sheetTab}
              onTabChange={setSheetTab}
              onSave={handleCharacterSaved}
              onClose={() => setShowCharacterEdit(false)}
            />
          </ErrorBoundary>
        )}
      </div>
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
        // An override map already carries its own grid_size, so it needs no
        // wildspace special-case here.
        gridSize: overrideMap.map?.grid_size || gridSize,
        mapType: overrideMap.map?.map_type || 'image',
        skyImage: overrideMap.map?.sky_image_path || null,
        skyPreset: overrideMap.map?.sky_preset || null,
        system: overrideMap.map?.system_data || null,
        gridType: overrideMap.map?.grid_type || 'square',
        gridScale: overrideMap.map?.grid_scale ?? 5,
        gridUnit: overrideMap.map?.grid_unit ?? 'ft',
        showScaleKey: !!overrideMap.map?.grid_scale_visible,
        gridCols: overrideMap.map?.grid_cols ?? null,
        gridRows: overrideMap.map?.grid_rows ?? null,
      }
    : {
        id: session.map_id,
        image: session.map_image,
        width: session.map_width,
        height: session.map_height,
        // Grid size is per map. See DMView's effectiveGridSize.
        gridSize: Number(session.map_grid_size) || gridSize,
        mapType: session.map_type || 'image',
        skyImage: session.map_sky_image || null,
        skyPreset: session.map_sky_preset || null,
        system: session.map_system || null,
        gridType: session.map_grid_type || 'square',
        gridScale: session.map_grid_scale ?? 5,
        gridUnit: session.map_grid_unit ?? 'ft',
        showScaleKey: !!session.map_grid_scale_visible,
        gridCols: session.map_grid_cols ?? null,
        gridRows: session.map_grid_rows ?? null,
      };
  // The storeys of the board being drawn.
  //
  // Declared HERE, above the level maths rather than beside the other
  // `effective*` values further down, because everything below reads it and a
  // const read before its declaration is a temporal dead zone crash that takes
  // the whole player view with it.
  const effectiveLevels = overrideMap ? (overrideMap.levels || []) : levels;

  // A player sees the floor their OWN token is standing on.
  //
  // The GM's active level is a scene control, and it is the right answer for a
  // spectator or for someone who has no token yet. But a player who has one is
  // on a particular storey, and following the GM instead meant taking the
  // stairs moved your token to the first floor while your screen stayed on the
  // ground — where your own token had just been filtered out of view.
  //
  // Same rule the ships already use: aboard a hull you see your own deck.
  //
  // "Standing on" includes flying: a player who sets their elevation to thirty
  // feet in a building of ten-foot storeys is level with the third floor, and
  // that — not the floor they took off from — is the storey they see, and the
  // cut the "hide the floors above" button makes. The storey heights come from
  // the map's own level settings; see occupiedLevel in utils/levelFloor.js.
  const myTokenForLevel = playerTokenId != null
    ? (tokens || []).find((t) => t.id === playerTokenId)
    : null;
  const effectiveActiveLevel = overrideMap
    ? (Number(overrideMap.activeLevel) || 0)
    : (myTokenForLevel ? occupiedLevel(effectiveLevels, myTokenForLevel) : activeLevel);

  const activeLevelRow = (overrideMap ? (overrideMap.levels || []) : levels)
    .find((l) => l.level_index === effectiveActiveLevel) || null;
  const mapUrl = activeLevelRow?.image_path
    ? `/uploads/${activeLevelRow.image_path}`
    : (effectiveMap.image ? `/uploads/${effectiveMap.image}` : null);
  const effectiveShips = overrideMap ? (overrideMap.ships || []) : ships;
  // Terrain follows the same rule as every other scene value: when an override
  // is active the board being rendered is NOT the session's, so the session's
  // scenery is the wrong map's scenery.
  const effectiveTerrain = overrideMap ? (overrideMap.terrain || []) : terrain;
  // ── The active storey ─────────────────────────────────────────────────────
  //
  // Geometry belongs to a floor: walls upstairs must not block sight down here.
  // A map with no level rows is single-storey and everything passes through,
  // which is every map that isn't a multilevel import.
  //
  // Plain filters rather than useMemo — this sits below the component's early
  // returns, where a hook would be skipped on the renders that take them.
  const onLevel = (row) => effectiveLevels.length === 0
    || (Number(row.level_index) || 0) === effectiveActiveLevel;

  const effectiveWalls = (overrideMap ? overrideMap.walls : walls || []).filter(onLevel);
  const effectiveDoors = (overrideMap ? overrideMap.doors : doors || []).filter(onLevel);

  const effectivePortals = overrideMap ? (overrideMap.portals || []) : portals;
  const effectiveLights = (overrideMap ? overrideMap.lights : lights || []).filter(onLevel);
  // Templates carry the map they were placed on. The server scopes them too,
  // but a player on an override map (split party) is looking at a different
  // board from the one the session broadcasts about, so the final say has to
  // be here, where the board being rendered is actually known. Legacy
  // templates with no mapId are left alone rather than hidden.
  //
  // A plain computation, NOT useMemo. There are four early returns above this
  // point — error, setup, not-started, no-session — so a hook here runs on
  // some renders and not others, which is exactly the crash that took the
  // player view down the last time something was memoised this far into the
  // component. The filter is a pass over a handful of shapes; it does not
  // need caching.
  const effectiveTemplates = (() => {
    const here = overrideMap ? overrideMap.id : session?.map_id;
    if (here == null) return spellTemplates;
    return (spellTemplates || []).filter(
      (t) => t.mapId == null || Number(t.mapId) === Number(here)
    );
  })();
  const effectiveDarkness = overrideMap ? overrideMap.magicalDarkness : magicalDarkness;
  const allTokens = (overrideMap ? overrideMap.tokens : tokens) || [];
  // The flat map shows ONE storey, so it shows that storey's tokens. Without
  // this a player saw every floor's creatures piled onto whichever floor they
  // were looking at — and a token that took the stairs appeared not to have
  // moved at all, because its old floor was still being drawn over the new one.
  //
  // The 3D view gets the unfiltered list: it stacks the floors and culls by
  // level itself.
  //
  // By the storey each token is LEVEL WITH, so a flier appears on the floor it
  // is actually hovering at — including this player's own token, which would
  // otherwise vanish out of its owner's view the moment they took off.
  const effectiveTokens = effectiveLevels.length
    ? allTokens.filter((t) => occupiedLevel(effectiveLevels, t) === effectiveActiveLevel)
    : allTokens;

  // Where this player sees FROM, in map pixels: their own token plus any
  // familiar or sensor bound to them — the same set the 2D stage uses for LOS.
  //
  // NOT a hook. This sits below the setup/lobby early returns, so a useMemo
  // here would be a CONDITIONAL hook — skipped on the lobby render, present on
  // the map render — and React tears the whole tree down when the hook count
  // changes between renders. It's a cheap map over the token list; plain
  // computation is the right shape anyway.
  //
  // And it has to sit below `effectiveTokens`, not merely below effectiveMap.
  // An IIFE runs the moment it is reached, so reading a `const` declared
  // further down the body is a temporal dead zone error — "Cannot access
  // 'effectiveTokens' before initialization" — which unmounts the whole player
  // view. A green build does not see it, because nothing is wrong until the
  // line actually runs. Anything added here that reads an `effective*` value
  // belongs below the one it reads.
  const visionOrigins3D = (() => {
    const ids = new Set([playerTokenId, ...(familiarVisionIds || [])].filter((v) => v != null));
    const gs = Number(effectiveMap?.gridSize) || 50;
    return (effectiveTokens || [])
      .filter((t) => ids.has(t.id))
      .map((t) => ({
        x: Number(t.grid_col) * gs + gs / 2,
        y: Number(t.grid_row) * gs + gs / 2,
      }));
  })();

  // The ship this player currently has the con of, by standing on its helm.
  // Same test the server runs, so what the HUD claims and what the server will
  // let you do can't disagree.
  //
  // Deliberately NOT a useMemo: this sits below the `!session` / `!setup.ready`
  // early returns above, so a hook here runs on the full render but not on the
  // spinner one — "rendered more hooks than during the previous render", which
  // unmounts the whole tree the instant the first session payload lands. The
  // inputs it needs (effectiveShips/effectiveTokens) are only defined down
  // here, so it can't be hoisted above the returns either. Memoising buys
  // nothing anyway: the result is an element of `effectiveShips`, so its
  // identity is already as stable as that array's.
  // Keyed off our own token, not our display name: the GM's player-preview
  // opens this view as `<player> (preview)`, which never matched player_name and
  // silently cost the helmsman the wheel.
  // Standing on the helm square is necessary but not sufficient: the helm is an
  // attuned magic item, so only a spellcaster can drive. `atHelmSquare` is the
  // physical half — kept separate from `helmShip` so a grounded character can be
  // told WHY the wheel does nothing instead of being shown a dead ship panel.
  // The server runs the same test in tokenAtHelm before accepting any move.
  const atHelmSquare = shipPilotedByToken(effectiveShips, myTokenRow);
  const pilotDenial  = atHelmSquare ? pilotDenialReason(myCreature) : null;
  const helmShip     = pilotDenial ? null : atHelmSquare;

  // Same builder the GM uses, and it must stay that way: combat_turn is an
  // index into this list, so a different order here would highlight a
  // different combatant on the player's screen than on the GM's.
  const sortedCombat = buildCombatOrder(tokens, effectiveShips);

  // One test, used both to render the strip and to offset the 3D top bar
  // around it — two copies of the condition would eventually disagree and
  // leave the bar floating over an empty band.
  const combatStripVisible = combatActive && sortedCombat.length > 0;

  const currentEntry = combatStripVisible
    ? sortedCombat[combatTurn % sortedCombat.length] ?? null
    : null;
  const currentCombatTokenId = currentEntry?.kind === 'token' ? currentEntry.id : null;

  // A/B/C suffixes for duplicate names in combat tracker
  const combatNameCounts = {};
  for (const e of sortedCombat) {
    combatNameCounts[e.name] = (combatNameCounts[e.name] || 0) + 1;
  }
  const combatNameSeen = {};
  const combatDisplayNames = sortedCombat.map((e) => {
    const base = e.name;
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
      {combatStripVisible && (
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

        {moveBlocked && (
          <div className="absolute top-14 left-1/2 -translate-x-1/2 z-[56] px-3 py-1.5 rounded-lg text-xs font-semibold
                          bg-red-950/90 border border-red-700 text-red-200 pointer-events-none shadow-lg">
            Out of movement — {moveBlocked.remaining} ft left this round
          </div>
        )}

        {/* The shop, pushed by the GM. A modal over the board rather than a
            route: the party is standing in the shop, not navigating to it, and
            the map should still be behind them when they close it. */}
        {shop && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4">
            <div className="w-full max-w-2xl h-[80vh] rounded-xl border border-gray-700 shadow-2xl overflow-hidden">
              <ShopView
                shop={shop}
                creature={myCreature}
                offer={shopOffer}
                onClose={() => setShop(null)}
                onBuy={(lines, price, note) => socket.emit('shop_offer', {
                  shopId: shop.id, creatureId: myCreature?.id, kind: 'buy', lines, offerCp: price, note,
                })}
                onSell={(lines, price, note) => socket.emit('shop_offer', {
                  shopId: shop.id, creatureId: myCreature?.id, kind: 'sell', lines, offerCp: price, note,
                })}
                onCounterRespond={(offerId, accept) => socket.emit('shop_counter_respond', { offerId, accept })}
                onWithdraw={(offerId) => socket.emit('shop_offer_withdraw', { offerId })}
              />
            </div>
          </div>
        )}

        {/* Sneak mode — the only thing a player is told.
            An edge glow, not a read-out: amber when something has heard you,
            red once something has plainly seen you. It says nothing about which
            guard, where, or how many, and it fades on its own. */}
        {sneakPulse && (
          <div
            className="absolute inset-0 z-[55] pointer-events-none"
            style={{
              boxShadow: sneakPulse.level === 'alerted'
                ? 'inset 0 0 140px 30px rgba(239,68,68,0.55)'
                : 'inset 0 0 110px 22px rgba(245,158,11,0.38)',
              animation: 'sneakPulse 1.3s ease-in-out infinite',
            }}
          >
            <div className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-semibold tracking-wide"
              style={{
                background: 'rgba(0,0,0,0.65)',
                color: sneakPulse.level === 'alerted' ? '#fca5a5' : '#fcd34d',
              }}>
              {sneakPulse.level === 'alerted' ? "You've been seen" : 'Something heard you'}
            </div>
          </div>
        )}

        {/* Backdrop — full-screen scene art covering the whole map area, grid,
            tokens and all. Sits above the fade overlay so switching scenes is
            a clean cut rather than a flash of map. `contain` keeps the art
            whole; a blurred copy fills the letterbox so odd aspect ratios
            don't sit in dead black bars on a TV. */}
        <BackdropLayer backdrop={backdrop} className="z-40" />

        <MapStage
          tiles={tiles}
          sneakMode={sneakMode}
          sneakRoundAt={sneakRoundAt}
          sneakBarInset={46}
          mapUrl={mapUrl}
          mapId={effectiveMap?.id ?? null}
          mapWidth={effectiveMap.width}
          mapHeight={effectiveMap.height}
          mapType={effectiveMap.mapType}
          gridCols={effectiveMap.gridCols}
          gridRows={effectiveMap.gridRows}
          ships={effectiveShips}
          shipFx={shipFx}
          playerName={name}
          // Optimistic — see DMView: without it the token bounces back to its
          // pre-drag square until the server's echo arrives.
          onTokenDeckMove={(tokenId, shipId, deckIndex, gridCol, gridRow) => {
            setTokens(prev => prev.map(t => t.id === tokenId
              ? { ...t, grid_col: gridCol, grid_row: gridRow, ship_id: shipId, deck_index: deckIndex }
              : t));
            socket.emit('token_deck_move', { tokenId, shipId, deckIndex, gridCol, gridRow });
          }}
          onTokenChangeDeck={(tokenId, shipId, toDeck, toCol, toRow) =>
            socket.emit('token_change_deck', { tokenId, shipId, toDeck, toCol, toRow })}
          onShipMove={(shipId, gridCol, gridRow, live) => {
            setShips(prev => prev.map(s => s.id === shipId ? { ...s, grid_col: gridCol, grid_row: gridRow } : s));
            if (!live) socket.emit('move_ship', { shipId, gridCol, gridRow });
          }}
          // Standing at the helm selects that ship for you, which is what puts
          // the rotate handle on screen. There's no ship-picking UI in the
          // player view on purpose: the one hull you can steer is the one
          // you're steering.
          selectedShipId={helmShip?.id ?? null}
          // Steering rights, not just position: MapStage gates the hull drag on
          // this too, so a shipmate with no spell slots can't shove the hull
          // around locally and have the server quietly refuse every frame.
          canPilot={canPilotHelm(myCreature)}
          onShipRotate={(shipId, rotation, live) => {
            setShips(prev => prev.map(s => s.id === shipId ? { ...s, rotation } : s));
            if (!live) socket.emit('rotate_ship', { shipId, rotation });
          }}
          gridSize={effectiveMap.gridSize}
          gridType={effectiveMap.gridType}
          // While the GM is projecting, the map is fully revealed and this
          // client stops driving its own camera. `revealAll` is separate from
          // fogOfWar on purpose — that prop also gates GM-only chrome.
          revealAll={liveMapView}
          cameraRect={liveMapView ? liveMapCamera : null}
          gridScale={effectiveMap.gridScale}
          gridUnit={effectiveMap.gridUnit}
          showScaleKey={effectiveMap.showScaleKey}
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
          visionTokenIds={familiarVisionIds}
          walls={effectiveWalls}
          doors={effectiveDoors}
          lights={effectiveLights}
          magicalDarkness={effectiveDarkness}
          spellTemplates={effectiveTemplates}
          drawings={drawings}
          myInkColor={myInkColor}
          onDrawStroke={(points) => socket.emit('draw_stroke', { mapId: session?.map_id ?? null, points, width: 4 })}
          onDrawUndo={() => socket.emit('draw_undo', { mapId: session?.map_id ?? null })}
          fogOfWar={fowEnabled}
          fowBlur={fowBlur}
          fowColor={fowColor}
          ambientLight={ambientLight}
          onDoorToggle={handleDoorToggle}
          centerOnMapPoint={centerOnMapPoint}
          currentCombatTokenId={currentCombatTokenId}
          onMeasureChange={(meas) => socket.emit('measure_update', { meas, color: userColors[name] || '#60a5fa' })}
          remoteMeasurements={remoteMeasurements}
          terrain={effectiveTerrain}
          portals={effectivePortals}
          onPortalUse={(portalId) => {
            // Selection first, own token as the fallback — a player who has
            // clicked nothing still means "me" when they click a gate. With
            // neither, the server sends whoever is standing on the pad.
            socket.emit('use_portal', { portalId, tokenId: selectedToken || playerTokenId || null });
          }}
          pings={activePings}
          tokenFx={tokenFx}
          fogBlocks={fogBlocks}
        />

        {/* Top bar.
            Stays on screen in 3D, for the same reason the dice button and the
            quick-access row below already do: 3D is a view of the map, not a
            separate screen. Left absolute inside the map column it was painted
            under the overlay's fixed z-70 sheet, so switching view dropped the
            session name, the map name and — the one that actually matters
            mid-session — the connection light. */}
        <div
          className={`flex items-center justify-between px-3 py-2 bg-gradient-to-b from-black/70 to-transparent pointer-events-none ${
            show3D ? 'fixed left-0 right-0 z-[80]' : 'absolute top-0 left-0 right-0'
          }`}
          // In 2D the bar is absolute inside the map column, which already
          // begins below the initiative strip. Going `fixed` in 3D measures
          // from the window instead, so the strip's height has to be added
          // back by hand or the two land on top of each other.
          style={show3D ? { top: combatStripVisible ? COMBAT_STRIP_H : 0 } : undefined}
        >
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

        {/* Helm readout. Only while your token is actually on the helm square,
            so it appears when you take the wheel and goes when you step off —
            the hull's condition is something you read off the ship's own
            instruments, not something you carry around the map. Positioned
            under the top bar rather than by the dice button, which the quick
            controls already crowd. */}
        {helmShip && (() => {
          const max = Number(helmShip.hull_hp) || 0;
          const cur = helmShip.current_hp == null ? max : Number(helmShip.current_hp);
          const pct = max > 0 ? Math.max(0, Math.min(1, cur / max)) : 0;
          // Same thresholds the token bars use, so "red" means the same thing
          // whether you're reading a crewmate or the hull under your feet.
          const bar = pct > 0.5 ? '#22c55e' : pct > 0.25 ? '#f59e0b' : '#ef4444';
          return (
            <div className="absolute top-12 left-3 z-30 w-52 rounded-lg bg-black/75 border border-violet-500/50 px-3 py-2 pointer-events-none">
              <div className="flex items-center gap-1.5">
                <span className="text-violet-300 text-sm leading-none">⎈</span>
                <span className="text-violet-200 text-xs font-semibold truncate">
                  {helmShip.name || 'Ship'}
                </span>
              </div>
              <div className="mt-1.5 h-2 rounded bg-gray-800 overflow-hidden">
                <div className="h-full rounded" style={{ width: `${pct * 100}%`, background: bar }} />
              </div>
              <div className="mt-1 flex justify-between text-[10px] text-gray-400">
                <span>Hull {cur}{max > 0 ? ` / ${max}` : ''}</span>
                {helmShip.armor_class != null && <span>AC {helmShip.armor_class}</span>}
              </div>
              <div className="text-[10px] text-violet-300/80 mt-0.5">
                You have the helm — drag the hull to move, or the handle to turn.
              </div>
            </div>
          );
        })()}

        {/* Standing at the wheel but unable to attune to it. Shown in place of
            the helm panel so the square doesn't read as broken — the character
            is in the right spot, they just can't work the helm. */}
        {pilotDenial && (
          <div className="absolute top-3 left-3 z-40 bg-dnd-panel/95 border border-amber-700/60 rounded-xl px-3 py-2 shadow-2xl max-w-[15rem]">
            <div className="flex items-center gap-1.5 text-amber-300 text-xs font-semibold">
              <WarningIcon />
              <span>{atHelmSquare?.name || 'Helm'} — can't attune</span>
            </div>
            <div className="text-[10px] text-gray-300 mt-1 leading-snug">{pilotDenial}</div>
          </div>
        )}

        {/* Dice button.

            This and the quick-access row sit at z-[80], above the 3D overlay
            (z-70), for the same reason the bottom-right cluster does: 3D is a
            view of the map, not a separate screen, so rolling dice, reading
            the log and hitting a quick control have to keep working there.
            Anything left at z-40 simply vanished when the switch was flipped. */}
        <button
          onClick={() => setShowDice(!showDice)}
          className="absolute bottom-4 left-4 z-[80] bg-dnd-red hover:bg-red-700 text-white rounded-full w-14 h-14 text-2xl shadow-lg flex items-center justify-center transition-transform active:scale-95"
        >
          <DiceIcon />
        </button>

        {/* LOOK UP, SHAPED LIKE A SEARCH BOX.
            A round icon in the quick-access cluster read as one more tool
            among eight, and a magnifier alone does not say what it searches.
            Drawn as the field it opens — magnifier, a prompt, a resting
            cursor — so it is obvious at a glance, and parked beside the dice
            because those are the two things reached for mid-turn. It is a
            button, not an input: typing happens in the panel it opens, and a
            real field here would take the keyboard away from the map. */}
        <button
          onClick={() => setShowLookup(true)}
          aria-label="Look up a spell, item, monster or rule"
          title="Look up a spell, item, monster or rule"
          className="absolute bottom-4 left-20 z-[80] h-14 w-60 pl-4 pr-5 rounded-full bg-gray-800/95 hover:bg-gray-700
                     border border-gray-600 hover:border-dnd-gold/60 text-gray-300 shadow-lg
                     flex items-center gap-2.5 transition-colors active:scale-95"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
               strokeLinecap="round" className="w-5 h-5 shrink-0 text-dnd-gold">
            <circle cx="11" cy="11" r="7" />
            <line x1="16.5" y1="16.5" x2="21" y2="21" />
          </svg>
          <span className="text-sm whitespace-nowrap">Look up a rule, spell, item…</span>
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
              id: 'wildmagic',
              available: String(myCreature?.char_subclass || '') === 'Wild Magic Sorcery',
              render: () => (
                <button
                  onClick={() => {
                    // The SERVER rolls, and the popup is built from the
                    // broadcast result — otherwise the shared dice log and the
                    // popup would show two different numbers for one surge.
                    // Controlled Chaos (level 14+) asks for two dice and lets
                    // the player keep either.
                    const twice = Math.max(1, Number(myCreature?.char_level) || 1) >= 14;
                    socket.emit('roll_dice', {
                      dice: 'd100', count: twice ? 2 : 1, modifier: 0,
                      label: 'Wild Magic Surge',
                    });
                  }}
                  className="bg-gray-800/90 hover:bg-gray-700 text-fuchsia-300 rounded-full w-10 h-10 text-lg shadow-lg flex items-center justify-center"
                  title="Roll a Wild Magic Surge (d100)"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                    <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" />
                  </svg>
                </button>
              ),
            },
            {
              id: 'wildshape',
              available: wildShapeForms.length > 0 || !!currentShapeName,
              render: () => (
                <button
                  onClick={() => setShowWildShape(true)}
                  className={`rounded-full w-10 h-10 text-lg shadow-lg flex items-center justify-center transition-colors ${
                    currentShapeName
                      ? 'bg-emerald-700/90 hover:bg-emerald-600 text-emerald-100'
                      : 'bg-gray-800/90 hover:bg-gray-700 text-emerald-300'
                  }`}
                  title={currentShapeName ? `Wild Shape — currently ${currentShapeName}` : 'Wild Shape'}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                    <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z" />
                    <path d="M2 21c0-3 1.85-5.36 5.08-6" />
                  </svg>
                </button>
              ),
            },
            {
              id: 'familiars',
              available: familiarTokens.length > 0,
              render: () => (
                <button
                  onClick={() => setShowFamiliars(true)}
                  className="relative bg-gray-800/90 hover:bg-gray-700 text-violet-300 rounded-full w-10 h-10 text-lg shadow-lg flex items-center justify-center"
                  title="Companions — familiars, summons, mounts, duplicates"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                    <path d="M4 5l3 3M20 5l-3 3" />
                    <path d="M12 21c-4 0-7-3-7-7 0-3.3 1.6-6 4-6 1.2 0 2.2.7 3 1.8.8-1.1 1.8-1.8 3-1.8 2.4 0 4 2.7 4 6 0 4-3 7-7 7z" />
                    <circle cx="9.5" cy="13" r="1" fill="currentColor" />
                    <circle cx="14.5" cy="13" r="1" fill="currentColor" />
                  </svg>
                  {familiarTokens.length > 1 && (
                    <span className="absolute -top-1 -right-1 bg-violet-600 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                      {familiarTokens.length}
                    </span>
                  )}
                </button>
              ),
            },
            {
              id: 'giveitem',
              available: !!myCreature && !!playerTokenId,
              render: () => (
                <button
                  onClick={() => setShowGiveItem(true)}
                  className="bg-gray-800/90 hover:bg-gray-700 text-amber-300 rounded-full w-10 h-10 text-lg shadow-lg flex items-center justify-center"
                  title="Give an item to another player"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                    <path d="M20 12v9H4v-9" />
                    <path d="M2 7h20v5H2z" />
                    <path d="M12 21V7" />
                    <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
                    <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
                  </svg>
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
              id: 'volume',
              available: true,
              render: () => {
                const muted = masterVolume <= 0;
                const pct = Math.round(masterVolume * 100);
                return (
                  <div className="relative">
                    {showVolume && (
                      <div className="absolute bottom-12 left-0 bg-gray-900/95 border border-gray-600 rounded-xl p-3 shadow-2xl flex items-center gap-3 w-56">
                        <button
                          onClick={() => setMasterVolume(muted ? 1 : 0)}
                          className="text-gray-300 hover:text-white shrink-0"
                          title={muted ? 'Unmute' : 'Mute'}
                        >
                          {muted ? <VolumeMuteIcon /> : <VolumeIcon />}
                        </button>
                        <input
                          type="range" min={0} max={1} step={0.01}
                          value={masterVolume}
                          onChange={(e) => setMasterVolume(parseFloat(e.target.value))}
                          onPointerDown={() => setQuickCtrlDragLocked(true)}
                          onPointerUp={() => setQuickCtrlDragLocked(false)}
                          onPointerCancel={() => setQuickCtrlDragLocked(false)}
                          className="flex-1 accent-dnd-gold"
                        />
                        <span className="text-xs text-gray-400 font-mono w-9 text-right shrink-0">{pct}%</span>
                      </div>
                    )}
                    <button
                      onClick={() => setShowVolume(v => !v)}
                      title="Master volume"
                      className={`rounded-full w-10 h-10 text-lg shadow-lg flex items-center justify-center transition-colors ${
                        muted ? 'bg-gray-800/90 hover:bg-gray-700 text-red-400'
                              : 'bg-gray-800/90 hover:bg-gray-700 text-cyan-300'
                      }`}
                    >
                      {muted ? <VolumeMuteIcon /> : <VolumeIcon />}
                    </button>
                  </div>
                );
              },
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
            <div className="absolute bottom-20 left-4 z-[80] flex gap-2 items-end">
              {sortedIds.map((id) => {
                const c = byId.get(id);
                if (!c) return null;
                return (
                  <div
                    key={id}
                    draggable={!quickCtrlDragLocked}
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



        {/* Quick Reference popup */}
        {showQuickRef && myCreature && (
          <QuickReferencePanel
            creature={myCreature}
            playerToken={tokens.find(t => t.id === playerTokenId) || null}
            onToggleFly={playerTokenId
              ? () => socket.emit('toggle_token_flying', { tokenId: playerTokenId })
              : null}
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
          <div className="absolute bottom-20 left-4 z-[80] bg-dnd-panel border border-gray-600 rounded-xl p-4 w-80 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-dnd-gold font-semibold">Dice Roller</h3>
              <button onClick={() => setShowDice(false)} className="text-gray-400 hover:text-white flex items-center"><XIcon /></button>
            </div>
            <DiceRoller rolls={diceRolls} isPlayer />
          </div>
        )}

        {/* The 3D view runs its own fog: it clips the ground to the visibility
          polygon from this player's vision origins and drops tokens outside
          it. Walls stay hidden — drawing them would hand over the layout the
          2D view deliberately withholds. */}
      {show3D && (overrideMap?.mapId ?? session?.map_id) && (
        <ErrorBoundary label="3D view" onReset={() => setShow3D(false)}>
        <React.Suspense fallback={<div className="fixed inset-0 z-[70] bg-black/90 flex items-center justify-center text-gray-300 text-sm">Loading 3D…</div>}>
          <Map3DView
            tiles={tiles}
            /* The same list the flat map gets — players see casts in 3D too. */
            tokenFx={tokenFx}
            /* The same identity the flat map uses (see the MapStage call
               above), so one player gets one sky whichever view they are in —
               and a player pushed onto an override map gets THAT map's
               weather rather than the session's. */
            mapId={effectiveMap?.id ?? null}
            /* The base plane is the GROUND floor, always.
               `mapUrl` follows the storey being viewed, which is right for the
               flat map — but the 3D view stacks the floors and draws each one
               at its own height, so handing it the active storey painted that
               storey at ground level and level 0 was never drawn at all. Which
               is why nothing appeared beneath you. */
            mapUrl={(effectiveLevels.find((l) => l.level_index === 0)?.image_path)
              ? `/uploads/${effectiveLevels.find((l) => l.level_index === 0).image_path}`
              : mapUrl}
            /* Read from effectiveMap, the same source MapStage uses — it
               accounts for a per-player map override (split the party), where
               the session's own map fields are the wrong board entirely. */
            mapWidth={effectiveMap?.width}
            mapHeight={effectiveMap?.height}
            gridSize={effectiveMap?.gridSize || 50}
            /* effectiveTokens, not tokens. Every prop here has to come from
               the SAME board: the session list holds the GM's map's tokens,
               and mixing it with an override map's ground is what made the
               3D view look like it was following the GM. */
            /* Unfiltered: the 3D view stacks the storeys and decides which
               tokens to draw for itself. */
            tokens={allTokens}
            /* Unfiltered on purpose: the 3D view stacks the floors below the
               one being shown and culls the rest itself. The flat map above
               still gets the single active storey. */
            walls={(overrideMap ? overrideMap.walls : walls) || []}
            doors={(overrideMap ? overrideMap.doors : doors) || []}
            /* Walls aren't drawn in 3D at all — the ground's map image already
               shows them. */
            /* Reveal everything only when the GM is already projecting the map
               (liveMapView), which is the same condition the 2D stage uses. */
            fogOfWar={fowEnabled && !liveMapView}
            visionOrigins={visionOrigins3D}
            /* Their own token only — the same thing they can drag on the flat
               map. Height is unchanged by dragging. */
            movableTokenIds={playerTokenId != null ? [playerTokenId] : []}
            onTokenMove={handleTokenMove}
            spellTemplates={effectiveTemplates}
            magicalDarkness={effectiveDarkness}
            /* Hulls are drawn from the same deck maths the flat map uses. */
            ships={effectiveShips}
            /* Which decks of a hull this player sees: their own level and the
               structure below it on a ship they're aboard, the whole stack on
               anyone else's. Same rule as the flat map. */
            viewerTokenId={playerTokenId}
            /* Walls stand up in 3D only for boards that have storeys — see the
               same call in DMView for why. */
            /* See the note in DMView: a tile map's walls have to stand up,
               because its ground is a dark field rather than a drawn map. */
            wallMode={(effectiveLevels.length > 1 || session?.map_type === 'tiles') ? 'solid' : 'none'}
            gridColor={gridColor}
            levels={effectiveLevels}
            activeLevel={effectiveActiveLevel}
            stackLevels={showUpperLevels}
            onToggleStackLevels={setShowUpperLevels}
            onDoorToggle={handleDoorToggle}
            /* The GM's pings. Read-only here — no onPingMap, so no Ping tool
               on the player's rail — but they surface at the storey the GM
               pointed at, whichever floor this player happens to be on. */
            pings={activePings}
            /* The top bar stays on screen in 3D, so the view's own
               top-anchored controls drop below it instead of under it. Text
               only here, no buttons — py-2 either side of a text-sm line, so
               16 + 20, rounded up for clearance. */
            topInset={40}
            focusTokenRef={focusTokenRef}
            /* Steering, on exactly the same terms as the flat map: the hull
               whose helm you're standing at AND can attune to. `helmShip` is
               already null when the attunement test fails, so passing its id
               gates the drag and the grip together. */
            pilotableShipId={canPilotHelm(myCreature) ? (helmShip?.id ?? null) : null}
            onShipMove={(shipId, gridCol, gridRow, live) => {
              setShips(prev => prev.map(s => s.id === shipId ? { ...s, grid_col: gridCol, grid_row: gridRow } : s));
              if (!live) socket.emit('move_ship', { shipId, gridCol, gridRow });
            }}
            onShipRotate={(shipId, rotation, live) => {
              setShips(prev => prev.map(s => s.id === shipId ? { ...s, rotation } : s));
              if (!live) socket.emit('rotate_ship', { shipId, rotation });
            }}
            /* Stairs. Dropping a token on a stairwell square sends it to
               the linked deck — the same socket call the flat map makes when
               you click the stairs there. */
            onTokenChangeDeck={(tokenId, shipId, toDeck, toCol, toRow) =>
              socket.emit('token_change_deck', { tokenId, shipId, toDeck, toCol, toRow })}
            /* Boarding: dropping a token on a hull puts it on that ship's
               MAIN deck, which is the deck you arrive on. Same socket call the
               flat map makes. */
            onTokenDeckMove={(tokenId, shipId, deckIndex, gridCol, gridRow) => {
              setTokens(prev => prev.map(t => t.id === tokenId
                ? { ...t, grid_col: gridCol, grid_row: gridRow, ship_id: shipId, deck_index: deckIndex }
                : t));
              socket.emit('token_deck_move', { tokenId, shipId, deckIndex, gridCol, gridRow });
            }}
            /* The hull's instruments, and the reason you can't work the wheel
               if that's the case. */
            helmShip={helmShip}
            pilotDenial={pilotDenial}
            /* Scenery, and the lattice the flat map uses — square or hex. */
            terrain={effectiveTerrain}
            gridType={effectiveMap?.gridType}
            /* Generated systems raise real suns and orbit rings — see the
               star-system pass in Map3DView. */
            system={effectiveMap?.system}
            /* Wildspace maps get the starfield wrapped around the scene, and
               any map with an uploaded panorama can use one. */
            skyUrl={effectiveMap?.skyImage ? `/uploads/${effectiveMap.skyImage}` : null}
            /* The same built-in sky the GM sees. */
            skyPreset={effectiveMap?.skyPreset || null}
            mapType={effectiveMap?.mapType}
            /* Lit by the same code the flat map uses — see the light layer
               in Map3DView. */
            lights={effectiveLights}
            gridScale={effectiveMap?.gridScale || 5}
            gridUnit={effectiveMap?.gridUnit || 'ft'}
            /* The same ink, the same socket events, the same map pixels — a
               stroke drawn here lands on the flat map and the other way
               round. */
            drawings={drawings}
            inkColor={myInkColor}
            onDrawStroke={(points) => socket.emit('draw_stroke', { mapId: session?.map_id ?? null, points, width: 4 })}
            onDrawUndo={() => socket.emit('draw_undo', { mapId: session?.map_id ?? null })}
            onClose={() => setShow3D(false)}
          />
        </React.Suspense>
        </ErrorBoundary>
      )}
      {/* Opens the orbitable view. It runs its own fog of war and line of
          sight (see Map3DView) so it shows this player only what they can
          already see on the flat map. */}
      {/* Bottom-right cluster — elevation, the view switch and fullscreen on
          one line. These used to be three separately-positioned controls at
          three different heights, and the roll log landed on top of the
          fullscreen button. One flex row can't overlap itself.

          z-[80] puts the whole row above the 3D overlay (z-70), so the switch
          is still there to flip back and fullscreen still works in 3D. */}
      <div className="fixed right-4 bottom-4 z-[80] flex items-center gap-2">
        {session?.map_id && playerTokenId != null && (() => {
          const myToken = tokens.find((t) => t.id === playerTokenId);
          if (!myToken) return null;
          const elev = Number(myToken.elevation) || 0;
          const unit = session?.map_grid_unit || 'ft';
          // The flying flag follows the number on the server — this is the
          // number, that's the state.
          const setElev = (ft) => {
            const next = Math.max(-500, Math.min(5000, Math.round(ft)));
            setTokens((prev) => prev.map((t) => (
              t.id === playerTokenId ? { ...t, elevation: next, is_flying: next > 0 } : t
            )));
            socket.emit('set_token_elevation', { tokenId: playerTokenId, elevation: next });
          };
          return (
            <div className="flex items-center gap-1 h-9 bg-gray-900/95 border border-gray-700 rounded-lg px-1.5 shadow-lg">
              {/* Leading the row rather than trailing it: it appears and
                  disappears with the token's height, and on the right that
                  shunted the +/- buttons sideways every time you left or
                  reached the ground. */}
              {elev !== 0 && (
                <button
                  type="button"
                  onClick={() => setElev(0)}
                  title="Back to ground level"
                  className="text-[11px] px-1 text-gray-500 hover:text-gray-300"
                >land</button>
              )}
              <button
                type="button"
                onClick={() => setElev(elev - 5)}
                title={`Descend 5 ${unit}`}
                className="w-6 h-6 rounded bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm leading-none"
              >-</button>
              <span
                className={`min-w-[3.25rem] text-center text-xs tabular-nums ${elev > 0 ? 'text-sky-300' : elev < 0 ? 'text-amber-300' : 'text-gray-400'}`}
                title="Your height off the ground"
              >
                {elev > 0 ? `+${elev}` : elev} {unit}
              </span>
              <button
                type="button"
                onClick={() => setElev(elev + 5)}
                title={`Rise 5 ${unit}`}
                className="w-6 h-6 rounded bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm leading-none"
              >+</button>
              {/* Which storey that height puts you on.
                  Only on a building with storeys, and it is not decoration: the
                  view follows this number — the floor you see, and where "hide
                  the floors above" cuts the stack — so flying up two storeys
                  changing what is on screen has a visible cause. */}
              {effectiveLevels.length > 1 && (() => {
                const li = occupiedLevel(effectiveLevels, myToken);
                const row = effectiveLevels.find((l) => l.level_index === li);
                return (
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 border border-gray-700 text-gray-400 whitespace-nowrap"
                    title={`You are level with ${row?.name || `level ${li}`} — that is the floor you see`}
                  >{row?.name || `L${li}`}</span>
                );
              })()}
            </div>
          );
        })()}

        {/* Centre the camera on your own token. Only in 3D, and only when you
            have a token to be centred on. Sized to sit with the switch beside
            it rather than as a small floating chip. */}
        {show3D && playerTokenId != null && (
          <button
            type="button"
            onClick={() => focusTokenRef.current?.()}
            title="Centre the camera on your token"
            className="h-12 px-4 rounded-full bg-gray-900/95 border border-gray-700 shadow-lg text-sm font-bold text-gray-200 hover:border-dnd-gold hover:text-white transition-colors flex items-center gap-1.5"
          >
            <span aria-hidden="true">◎</span>
            <span>My token</span>
          </button>
        )}

        <ViewToggle
          is3D={show3D}
          onChange={setShow3D}
          disabled={!session?.map_id}
          title={session?.map_id ? undefined : 'No map loaded'}
        />

        <button
          onClick={handleToggleFullscreen}
          className="bg-gray-800/80 hover:bg-gray-700 text-white rounded-full w-9 h-9 text-lg shadow-lg flex items-center justify-center"
          title="Toggle fullscreen"
        >
          {fullscreen ? <CompressIcon /> : <ExpandIcon />}
        </button>
      </div>

      <DiceRollOverlay rolls={diceRolls} />
      <RollLog
        side="left"
        // Clears the Look-up box parked beside the dice button: its 15rem plus
        // the 0.5rem gap either side of it.
        leftInset={256}
        entries={rollLog}
        open={rollLogOpen}
        onToggle={() => setRollLogOpen((o) => !o)}
        canRoll
        onQuickRoll={(d) => socket.emit('roll_dice', { dice: d, count: 1, modifier: 0, label: null })}
      />

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

      {/* The rules, searchable. A player's role, so anything the GM has not
          revealed never reaches this browser. */}
      {showLookup && <ReferenceSearch role="player" onClose={() => setShowLookup(false)} />}

      {/* Concentration prompt */}
      {concentrationPrompt && myCreature && (
        <div className="fixed inset-0 z-[90] bg-black/80 flex items-center justify-center p-4" onClick={() => setConcentrationPrompt(null)}>
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
        <div className="fixed inset-0 z-[90] bg-black/85 flex items-center justify-center p-4" onClick={() => setHandout(null)}>
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

      {/* Wild Magic Surge — stays until dismissed */}
      <WildMagicPopup
        result={wildMagic?.result}
        alt={wildMagic?.alt}
        onKeep={(chosen) => setWildMagic({ result: chosen, alt: null })}
        onClose={() => setWildMagic(null)}
      />

      {/* Temporary senses */}
      {showSenses && (
        <SensesPanel
          current={myTokenRow?.senses}
          characterSenses={myCreature?.senses}
          onApply={(senses) => {
            if (!playerTokenId) return;
            socket.emit('player_set_token_senses', { tokenId: playerTokenId, senses });
          }}
          onRestore={() => {
            if (!playerTokenId) return;
            socket.emit('player_set_token_senses', {
              tokenId: playerTokenId,
              senses: Array.isArray(myCreature?.senses) && myCreature.senses.length
                ? myCreature.senses
                : [{ type: 'normal', range: 0 }],
            });
          }}
          size={myTokenRow?.size}
          isFlying={!!myTokenRow?.is_flying}
          onSize={(sz) => playerTokenId && socket.emit('update_token_size', { tokenId: playerTokenId, size: sz })}
          onToggleFly={() => playerTokenId && socket.emit('toggle_token_flying', { tokenId: playerTokenId })}
          conditions={Array.isArray(myTokenRow?.conditions) ? myTokenRow.conditions : []}
          exhaustion={myTokenRow?.exhaustion}
          auras={Array.isArray(myTokenRow?.auras) ? myTokenRow.auras : []}
          onConditions={(next) => playerTokenId && socket.emit('update_token_conditions', { tokenId: playerTokenId, conditions: next })}
          onExhaustion={(level) => playerTokenId && socket.emit('set_token_exhaustion', { tokenId: playerTokenId, level })}
          onAuras={(next) => playerTokenId && socket.emit('set_token_auras', { tokenId: playerTokenId, auras: next })}
          onClose={() => setShowSenses(false)}
        />
      )}

      {/* Wild Shape — the GM-curated forms this character can take */}
      {showWildShape && (
        <WildShapePanel
          forms={wildShapeForms}
          currentForm={currentShapeName}
          tempHp={wildShapeTemp}
          busy={wildShapeBusy}
          onShift={(creatureId) => {
            if (!playerTokenId) return;
            setWildShapeBusy(true);
            socket.emit('player_wildshape', { tokenId: playerTokenId, creatureId });
            // Re-enable once the server's swap has had time to land; the panel
            // stays open so a mis-shift can be corrected immediately.
            setTimeout(() => setWildShapeBusy(false), 1400);
          }}
          onRevert={() => {
            if (!playerTokenId) return;
            setWildShapeBusy(true);
            socket.emit('player_wildshape_revert', { tokenId: playerTokenId });
            setTimeout(() => setWildShapeBusy(false), 1400);
          }}
          onClose={() => setShowWildShape(false)}
        />
      )}

      {/* Familiars — stat blocks + shared vision */}
      {showFamiliars && familiarTokens.length > 0 && (
        <FamiliarPanel
          familiars={familiarTokens}
          creatures={familiarCreatures}
          mutedIds={familiarVisionMuted}
          onToggleVision={toggleFamiliarVision}
          onLocate={(fam) => {
            const sz = tokenFootprint(fam);
            const gs = effectiveMap.gridSize || gridSize;
            // Same centring maths MapStage uses for tokens: the grid is
            // centred on the image, so partial cells split evenly.
            const offX = gs > 0 ? (Number(effectiveMap.width || 0) % gs) / 2 : 0;
            const offY = gs > 0 ? (Number(effectiveMap.height || 0) % gs) / 2 : 0;
            setCenterOnMapPoint({
              x: offX + Number(fam.grid_col) * gs + (sz.gridW * gs) / 2,
              y: offY + Number(fam.grid_row) * gs + (sz.gridH * gs) / 2,
            });
            setShowFamiliars(false);
          }}
          onRoll={({ label, dice, count, modifier }) => {
            socket.emit('roll_dice', { dice, count, modifier, label });
          }}
          onClose={() => setShowFamiliars(false)}
        />
      )}

      {/* Give an item to another player */}
      {showGiveItem && (
        <GiveItemPanel
          inventory={myInventory}
          recipients={giveRecipients}
          busy={giveBusy}
          onGive={({ itemIndex, itemName, toTokenId, qty }) => {
            if (!playerTokenId) return;
            setGiveBusy(true);
            socket.emit('player_give_item', { fromTokenId: playerTokenId, toTokenId, itemIndex, itemName, qty });
            // The server broadcasts the new inventories; close once that has
            // had time to land so the list can't be acted on twice.
            setTimeout(() => { setGiveBusy(false); setShowGiveItem(false); }, 600);
          }}
          onClose={() => setShowGiveItem(false)}
        />
      )}

      {/* Character edit modal.

          Boundaried for the same reason the 3D view is. The sheet is the
          largest, most data-driven thing a player opens — every item, spell
          and class feature on their character renders through it — and it is
          the one surface fed by rows the GM can edit. A throw anywhere in
          there used to unmount the entire tree and drop the player onto the
          bare page background mid-session, with no map, no dice and nothing
          to tell the GM. Now it stays contained: the message names the sheet,
          `onReset` closes it, and the session behind it keeps running. */}
      {showCharacterEdit && myCreature && (
        <ErrorBoundary label="Character sheet" onReset={() => setShowCharacterEdit(false)}>
          <CharacterSheetModal
            creature={myCreature}
            tab={sheetTab}
            onTabChange={setSheetTab}
            onSave={handleCharacterSaved}
            onClose={() => setShowCharacterEdit(false)}
          />
        </ErrorBoundary>
      )}
    </div>
  );
}
