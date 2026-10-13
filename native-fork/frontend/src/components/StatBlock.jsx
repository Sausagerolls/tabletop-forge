import React, { useState, useMemo } from 'react';
import { formatDamageWithMod, formatDamageType, weaponDamageModes, weaponDamageRiders, damageParts, bestWeaponStat, weaponDamageMod } from '../utils/damage.js';
import { computeHitDicePool } from '../utils/classes.js';
import { subclassEntry } from '../data/subclasses.js';
import {
  formatSizeType, abilityMod, modStr as mod, signed,
  sensesStr, speedStr, savesStr, skillsStr, acLine,
} from '../utils/creature.js';
import { spellSlotsForCreature, pactMagicForCreature } from '../data/classes.js';
import { spellType } from '../utils/spellTypes.js';

function StatBox({ label, score }) {
  return (
    <div className="flex flex-col items-center">
      <div className="text-xs font-bold text-dnd-red uppercase">{label}</div>
      <div className="text-base font-bold">{score} ({mod(score)})</div>
    </div>
  );
}

function parseDiceStr(str) {
  if (!str) return null;
  const m = str.trim().match(/^(\d+)d(\d+)\s*([+-]\d+)?$/i);
  if (!m) return null;
  return { count: parseInt(m[1], 10), dice: `d${m[2]}`, extraMod: m[3] ? parseInt(m[3], 10) : 0 };
}

const STAT_KEYS = { STR: 'strength', DEX: 'dexterity', CON: 'constitution', INT: 'intelligence', WIS: 'wisdom', CHA: 'charisma' };

function RollBtn({ label, className = '', onClick }) {
  return (
    <button
      onClick={onClick}
      className={`text-xs px-1.5 py-0.5 rounded transition-colors font-mono ${className}`}
      title={`Roll ${label}`}
    >
      {label}
    </button>
  );
}

function WeaponsSection({ creature, onRoll }) {
  const inventory = parseJson(creature.inventory, []);
  const weapons = inventory.filter(it => it.item_type === 'weapon');
  if (!weapons.length) return null;

  const profBonus = creature.proficiency_bonus ?? 2;

  function weaponAtkBonus(w, modeStat = '') {
    return bestWeaponStat(w, creature, modeStat).mod + profBonus + (w.attack_bonus_misc || 0);
  }

  function getDmgEntries(w) {
    if (Array.isArray(w.damage_entries) && w.damage_entries.length) return w.damage_entries;
    if (w.damage) return [{ damage: w.damage, damage_type: w.damage_type || '' }];
    return [];
  }

  return (
    <div>
      <hr className="section-divider" />
      <div className="font-bold text-dnd-red border-b border-dnd-red pb-0.5 mb-2 font-serif">Weapons</div>
      <div className="space-y-2">
        {weapons.map((w, i) => {
          const modes = weaponDamageModes({ ...w, damage_entries: getDmgEntries(w) });
          const ab = weaponAtkBonus(w);
          return (
            <div key={i} className="text-sm">
              <div className="flex items-center gap-1 flex-wrap">
                <span className="font-semibold">{w.name || '—'}</span>
                {w.equipped && <span className="text-dnd-gold text-xs">★</span>}
                <span className="text-xs text-gray-500">·</span>
                <span className="text-xs text-green-400 font-mono">{ab >= 0 ? '+' : ''}{ab}</span>
                <span className="text-xs text-gray-500">to hit</span>
                {modes.length === 0 && w.weapon_range && (
                  <>
                    <span className="text-xs text-gray-500">·</span>
                    <span className="text-xs text-gray-500">{w.weapon_range}</span>
                  </>
                )}
              </div>
              {modes.length > 0 && (
                <div className="pl-2 mt-0.5 space-y-0.5">
                  {modes.map((m) => {
                    const pick = weaponDamageMod(w, creature, m.stat);
                    const bd = damageParts(m.damage, pick.mod, pick.abbr, pick.misc);
                    return (
                      <div key={m.key} className="flex items-center gap-1 text-xs flex-wrap">
                        <span className="text-gray-400 w-20 shrink-0">{m.label}:</span>
                        <span className="font-mono text-gray-200">
                          {formatDamageWithMod(m.damage, pick.total)}{m.damage_type ? ` ${formatDamageType(m.damage_type)}` : ''}
                        </span>
                        {bd.parts.length > 0 && (
                          <span className="text-gray-500">({bd.dice} + {bd.parts.join(' + ')})</span>
                        )}
                        {m.range && <span className="text-gray-500">· {m.range}</span>}
                      </div>
                    );
                  })}
                </div>
              )}
              {/* Damage that only lands under a stated condition, kept out of
                  the attack lines above so it is never read as part of an
                  ordinary hit. */}
              {weaponDamageRiders({ ...w, damage_entries: getDmgEntries(w) }).map((r) => (
                <div key={r.key} className="pl-2 mt-0.5 flex items-center gap-1 text-xs flex-wrap">
                  <span className="text-amber-500/90 w-20 shrink-0">Extra:</span>
                  <span className="font-mono text-amber-300">
                    +{r.damage}{r.damage_type ? ` ${formatDamageType(r.damage_type)}` : ''}
                  </span>
                  <span className="text-gray-500">{r.condition}</span>
                </div>
              ))}
              {w.properties && (
                <div className="pl-2 text-xs text-gray-400">
                  <span className="text-gray-500">Properties:</span> {w.properties}
                </div>
              )}
              {w.mastery && (
                <div className="pl-2 text-xs text-gray-400">
                  <span className="text-gray-500">Mastery:</span> {w.mastery}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function parseJson(raw, fallback) {
  if (!raw) return fallback;
  if (typeof raw !== 'string') return raw;
  try { return JSON.parse(raw); } catch { return fallback; }
}

function InventorySection({ creature }) {
  const inventory = Array.isArray(creature.inventory)
    ? creature.inventory
    : parseJson(creature.inventory, []);

  const currency = [
    creature.currency_gp && { label: 'GP', amount: creature.currency_gp, color: '#b7791f' },
    creature.currency_sp && { label: 'SP', amount: creature.currency_sp, color: '#718096' },
    creature.currency_cp && { label: 'CP', amount: creature.currency_cp, color: '#c05621' },
  ].filter(Boolean);

  if (!inventory.length && !currency.length) return null;

  return (
    <div>
      <hr className="section-divider" />
      <div className="font-bold text-dnd-red border-b border-dnd-red pb-0.5 mb-2 font-serif">Inventory</div>
      {currency.length > 0 && (
        <p className="text-sm mb-1">
          <strong>Currency:</strong>{' '}
          {currency.map((c, i) => (
            <span key={c.label}>{c.amount} {c.label}{i < currency.length - 1 ? ', ' : ''}</span>
          ))}
        </p>
      )}
      {inventory.length > 0 && (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-dnd-red/30">
              <th className="text-left font-semibold py-0.5 pr-2">Item</th>
              <th className="text-center font-semibold py-0.5 px-2 w-12">Qty</th>
              <th className="text-left font-semibold py-0.5 px-2">Notes</th>
            </tr>
          </thead>
          <tbody>
            {inventory.map((item, i) => (
              <tr key={i} className="border-b border-gray-200/30">
                <td className="py-0.5 pr-2">
                  {item.equipped ? <strong>{item.name}</strong> : item.name}
                  {item.equipped && <span className="text-xs text-gray-500 ml-1">(equipped)</span>}
                  {item.attunement_required && (
                    <span className={`text-xs ml-1 ${item.attuned ? 'text-purple-400' : 'text-gray-500'}`}>
                      {item.attuned ? '(attuned)' : '(req. attunement)'}
                    </span>
                  )}
                </td>
                <td className="text-center py-0.5 px-2">{item.qty || 1}</td>
                <td className="py-0.5 px-2 text-gray-600 text-xs whitespace-pre-wrap">{item.desc || ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <div className="font-bold text-dnd-red border-b border-dnd-red pb-0.5 mb-1 font-serif">{title}</div>
      {children}
    </div>
  );
}

function ActionList({ items }) {
  if (!items || !items.length) return null;
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        // Name on its own line as a heading: features like Font of Magic run
        // to several paragraphs, and an inline italic lead-in disappeared
        // into the body text on the printed sheet.
        <div key={i} className="action-entry break-inside-avoid">
          <div className="font-serif font-bold text-[15px] leading-tight text-dnd-red flex items-baseline gap-2 flex-wrap">
            <span>{item.name}</span>
            {/* Which subclass granted this — a multiclassed sheet otherwise
                shows one undifferentiated list of features. */}
            {item.subclass && (
              <span className="subclass-flag font-sans font-semibold text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded border border-dnd-red/50 text-dnd-red/90">
                {item.subclass}
              </span>
            )}
          </div>
          {item.desc && <p className="text-sm whitespace-pre-wrap mt-0.5">{item.desc}</p>}
        </div>
      ))}
    </div>
  );
}

export function SpellBox({ spell, typeLabel, typeColor, darkTheme = false }) {
  const s = spell;
  const comps = [];
  if (s.comp_v) comps.push('V');
  if (s.comp_s) comps.push('S');
  if (s.comp_m) comps.push(`M${s.comp_m_text ? ` (${s.comp_m_text})` : ''}`);
  const compsStr = comps.join(', ');
  const atkSaveStr = s.attack_save === 'save'
    ? `${(s.save_ability || '').toUpperCase()} Save`
    : (s.attack_save ? s.attack_save.charAt(0).toUpperCase() + s.attack_save.slice(1) : '');
  const dmgEntries = Array.isArray(s.damage_entries) ? s.damage_entries.filter(e => e.damage) : [];

  // Color palette tuned to the surrounding surface. Stat block is cream
  // parchment — use dark text. Dark UI surfaces (player popup) use light text.
  const palette = darkTheme
    ? { body: 'text-gray-100', label: 'text-gray-400', school: 'text-gray-400', surface: 'bg-black/30', border: 'border-gray-700', divider: 'border-gray-700' }
    : { body: 'text-gray-900', label: 'text-red-900/80', school: 'text-red-900/70', surface: 'bg-amber-50/60', border: 'border-dnd-red/40', divider: 'border-dnd-red/30' };

  return (
    <div className={`border rounded-md p-2 ${palette.border} ${palette.surface} ${palette.body}`}>
      <div className="flex items-start justify-between gap-1">
        <div className="flex-1 min-w-0">
          <div className="italic font-semibold">{s.name}
            {s.prepared !== undefined && (
              <span className="ml-1 text-xs" title={s.prepared ? 'Prepared' : 'Not prepared'}>
                {s.prepared ? '☒' : '☐'}
              </span>
            )}
          </div>
          {(s.school || typeLabel) && (
            <div className={`text-[10px] uppercase tracking-wider ${typeColor || palette.school}`}>
              {typeLabel}{typeLabel && s.school ? ' · ' : ''}{s.school || ''}
            </div>
          )}
        </div>
      </div>
      <div className="mt-1 space-y-0.5 text-xs">
        {s.casting_ability && <div><span className={palette.label}>Casting Ability:</span> {String(s.casting_ability).toUpperCase()}</div>}
        {s.casting_time && <div><span className={palette.label}>Casting Time:</span> {s.casting_time}</div>}
        {s.range_area && <div><span className={palette.label}>Range/Area:</span> {s.range_area}</div>}
        {compsStr && <div><span className={palette.label}>Components:</span> {compsStr}</div>}
        {s.duration && <div><span className={palette.label}>Duration:</span> {s.duration}</div>}
        {atkSaveStr && <div><span className={palette.label}>Attack/Save:</span> {atkSaveStr}</div>}
        {dmgEntries.length > 0 && (
          <div>
            <span className={palette.label}>Damage/Effect:</span>{' '}
            <span className="font-mono">
              {dmgEntries.map(e => `${e.damage}${e.damage_type ? ` ${e.damage_type}` : ''}`).join(' + ')}
            </span>
          </div>
        )}
        {s.extra_effects && (
          <div><span className={palette.label}>Extra Effects:</span> {s.extra_effects}</div>
        )}
        {s.description && (
          <div className={`mt-1 pt-1 border-t whitespace-pre-wrap ${palette.divider}`}>{s.description}</div>
        )}
      </div>
    </div>
  );
}

// Pen-tickable spell slot boxes for the printed sheet. Totals come from the
// sheet when it carries them and are otherwise derived from class + level, so
// a caster always gets boxes even if slots were never tracked in-app. Boxes
// already spent in-app print pre-filled.
function SpellSlotTracker({ creature, slots }) {
  const derived = spellSlotsForCreature(creature);
  const pact = pactMagicForCreature(creature);
  const totalFor = (l) => Number(slots?.[l]?.total || derived[l] || 0);

  const rows = [1,2,3,4,5,6,7,8,9]
    .map((l) => ({ key: l, label: `Level ${l}`, total: totalFor(l), used: Number(slots?.[l]?.used || 0) }))
    .filter((r) => r.total > 0);

  if (pact) {
    const p = slots?.pact || {};
    rows.push({
      key: 'pact',
      label: `Pact (lv ${pact.slotLevel})`,
      total: Number(p.total || pact.slots),
      used: Number(p.used || 0),
    });
  }
  if (!rows.length) return null;

  return (
    <div className="slot-tracker mb-2 border border-dnd-red/40 rounded p-2 bg-amber-50/60 text-gray-900">
      <div className="text-xs font-semibold mb-1">
        Spell Slots
        {pact && <span className="font-normal text-red-900/70"> · Pact Magic returns on a Short Rest</span>}
      </div>
      <div className="slot-tracker-rows">
        {rows.map((r) => (
          <div key={r.key} className="slot-row flex items-center gap-2 mb-1">
            <span className="slot-row-label text-xs font-semibold">{r.label}</span>
            <span className="slot-boxes flex flex-wrap gap-1">
              {Array.from({ length: r.total }).map((_, i) => (
                <span key={i} className={`slot-box${i < r.used ? ' slot-box-used' : ''}`} />
              ))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SpellsSection({ creature, onRoll }) {
  const [expandedSpell, setExpandedSpell] = useState(null);

  let spells = [];
  if (Array.isArray(creature.spells)) spells = creature.spells;
  else if (typeof creature.spells === 'string' && creature.spells.startsWith('[')) {
    try { spells = JSON.parse(creature.spells); } catch { spells = []; }
  }

  let slots = {};
  if (creature.spell_slots && typeof creature.spell_slots === 'object' && !Array.isArray(creature.spell_slots)) {
    slots = creature.spell_slots;
  } else if (typeof creature.spell_slots === 'string') {
    try { slots = JSON.parse(creature.spell_slots); } catch { slots = {}; }
  }

  const hasSpells = spells.length > 0;
  if (!hasSpells) return null;

  const levels = [0,1,2,3,4,5,6,7,8,9].filter((lvl) =>
    spells.some((s) => s.level === lvl)
  );

  // Per-ability spellcasting breakdown: gather every distinct casting_ability
  // actually used across this character's spells.
  const profBonus = creature.proficiency_bonus ?? 2;
  const abilityLabels = { STR: 'strength', DEX: 'dexterity', CON: 'constitution', INT: 'intelligence', WIS: 'wisdom', CHA: 'charisma' };
  const usedAbilities = Array.from(new Set(
    spells.map(s => (s.casting_ability || '').toUpperCase()).filter(a => abilityLabels[a])
  ));

  function getSpellDmgEntries(s) {
    if (Array.isArray(s.damage_entries) && s.damage_entries.length) return s.damage_entries;
    return [];
  }

  return (
    <div>
      <hr className="section-divider" />
      <div className="font-bold text-dnd-red border-b border-dnd-red pb-0.5 mb-2 font-serif">Spellcasting</div>
      <SpellSlotTracker creature={creature} slots={slots} />
      {usedAbilities.length > 0 && (
        <div className="mb-2 text-xs bg-amber-50/60 border border-dnd-red/40 rounded p-2 space-y-1 text-gray-900">
          {usedAbilities.map(ab => {
            const score = creature[abilityLabels[ab]] ?? 10;
            const m = abilityMod(score);
            const saveDC = 8 + profBonus + m;
            const atkBonus = m + profBonus;
            return (
              <div key={ab} className="flex flex-wrap gap-3">
                <span className="font-semibold">{ab}:</span>
                <span><span className="text-red-900/80">Mod:</span> <span className="font-mono">{m >= 0 ? '+' : ''}{m}</span></span>
                <span><span className="text-red-900/80">Save DC:</span> <span className="font-mono">{saveDC}</span></span>
                <span><span className="text-red-900/80">Atk:</span> <span className="font-mono">{atkBonus >= 0 ? '+' : ''}{atkBonus}</span></span>
              </div>
            );
          })}
        </div>
      )}
      {levels.map((lvl) => {
        const lvlSpells = spells.filter((s) => s.level === lvl);
        // All categories in one alphabetical run — each card carries its own
        // type badge, so grouping by type only made the list harder to scan.
        const sorted = [...lvlSpells].sort((a, b) =>
          String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' }));
        const slotInfo = slots[lvl];
        const available = slotInfo ? slotInfo.total - (slotInfo.used || 0) : null;

        return (
          <div key={lvl} className="mb-2">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-bold text-sm">
                {lvl === 0 ? 'Cantrips' : `${lvl}${['st','nd','rd'][lvl-1]||'th'} Level`}
              </span>
              {slotInfo && slotInfo.total > 0 && (
                <span className="text-xs text-gray-600">
                  ({available}/{slotInfo.total} slots)&nbsp;
                  {Array.from({ length: slotInfo.total }).map((_, i) => (
                    <span key={i} className={`slot-box${i < (slotInfo.used || 0) ? ' slot-box-used' : ''}`} />
                  ))}
                </span>
              )}
            </div>
            {sorted.length > 0 && (
              <div
                className="spell-grid grid grid-cols-2 gap-2 mt-1"
                style={{ gridAutoFlow: 'row', alignItems: 'start' }}
              >
                {sorted.map((s) => {
                  const t = spellType(s.type);
                  return <SpellBox key={s.id} spell={s} typeLabel={t.badge} typeColor={t.light} />;
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function StatBlock({ creature, onRoll = null }) {
  // Must run before the null guard below: hooks have to be called in the same
  // order on every render, and this component renders with creature = null
  // while the library has nothing selected.
  const subclassFeatureNames = useMemo(() => {
    const map = new Map();
    const pairs = [[creature?.char_class, creature?.char_subclass]];
    for (const mc of (Array.isArray(creature?.multiclasses) ? creature.multiclasses : [])) {
      if (mc?.class) pairs.push([mc.class, mc.subclass]);
    }
    for (const [cls, sub] of pairs) {
      if (!cls || !sub) continue;
      const entry = subclassEntry(cls, sub);
      for (const f of (entry?.features || [])) {
        if (f?.name) map.set(String(f.name).toLowerCase(), sub);
      }
    }
    return map;
  }, [creature?.char_class, creature?.char_subclass, creature?.multiclasses]);

  if (!creature) return null;

  const sizeType = formatSizeType(creature);
  const saves = savesStr(creature);
  const skills = skillsStr(creature);

  // PC-specific summary pieces
  const classLine = creature.is_player_character && (creature.char_class || creature.char_subclass)
    ? [creature.char_class, creature.char_subclass].filter(Boolean).join(' / ')
    : '';
  const levelLine = creature.is_player_character
    ? `Level ${Number(creature.char_level) || 1} · ${(Number(creature.char_xp) || 0).toLocaleString()} XP`
    : '';
  const armorProfs = [];
  if (creature.prof_light_armor)  armorProfs.push('Light Armor');
  if (creature.prof_medium_armor) armorProfs.push('Medium Armor');
  if (creature.prof_heavy_armor)  armorProfs.push('Heavy Armor');
  if (creature.prof_shields)      armorProfs.push('Shields');
  const inventoryList = parseJson(creature.inventory, []);
  const attunedItems = inventoryList.filter(it => it.attuned && it.attunement_required);
  const hitDiceQty  = Number(creature.hit_dice_qty)  || 0;
  const hitDiceType = creature.hit_dice_type || '';
  const hitDiceUsed = Number(creature.hit_dice_used) || 0;
  // PCs: derive the multi-pool from class + multiclasses. Non-PCs
  // keep falling back to the scalar hit_dice_qty/type fields above.
  const hitDicePool = computeHitDicePool(creature) || [];

  const hitDiceUsedMap = (creature.hit_dice_used_by_type && typeof creature.hit_dice_used_by_type === 'object')
    ? creature.hit_dice_used_by_type : {};

  return (
    <div className="stat-block rounded-lg p-4 text-sm space-y-2">
      {/* Avatar image */}
      {creature.image_path && (
        <div className="stat-block-avatar flex justify-center mb-2">
          <img
            src={`/uploads/${creature.image_path}`}
            alt={creature.name}
            className="rounded-lg object-cover"
            style={{ maxHeight: 160, maxWidth: '100%' }}
          />
        </div>
      )}

      {/* Header */}
      <div className="print-section">
        <h2 className="text-2xl font-bold text-dnd-red font-serif">
          {creature.name}
          {creature.pronouns && (
            <span className="ml-2 text-sm font-normal font-sans text-gray-500">({creature.pronouns})</span>
          )}
        </h2>
        <p className="italic text-gray-600">{sizeType}, {creature.alignment}</p>
        {classLine && <p className="italic text-gray-500 text-xs">{classLine}</p>}
        {levelLine && <p className="italic text-gray-500 text-xs">{levelLine}</p>}
      </div>

      <hr className="section-divider" />

      {/* Core stats */}
      <div className="space-y-0.5 print-section">
        {(() => {
          const { total, parts } = acLine(creature);
          return (
            <p><strong>Armor Class</strong> {total}{parts.length ? ` (${parts.join(', ')})` : ''}</p>
          );
        })()}
        <p><strong>Hit Points</strong> {creature.hit_points} ({creature.hit_dice})</p>
        <p><strong>Speed</strong> {speedStr(creature)}</p>
        <p><strong>Proficiency Bonus</strong> {(creature.proficiency_bonus ?? 2) >= 0 ? '+' : ''}{creature.proficiency_bonus ?? 2}</p>
        {(() => { const pb = creature.proficiency_bonus ?? 2; const dexMod = Math.floor(((creature.dexterity ?? 10) - 10) / 2); const bonus = (creature.initiative_bonus ?? 0); const total = dexMod + bonus; return <p><strong>Initiative</strong> {total >= 0 ? '+' : ''}{total}{bonus !== 0 ? ` (Dex ${dexMod >= 0 ? '+' : ''}${dexMod}, bonus ${bonus >= 0 ? '+' : ''}${bonus})` : ''}</p>; })()}
      </div>

      <hr className="section-divider" />

      {/* Ability scores */}
      <div className="grid grid-cols-6 gap-1 text-center py-1 print-section">
        <StatBox label="STR" score={creature.strength} />
        <StatBox label="DEX" score={creature.dexterity} />
        <StatBox label="CON" score={creature.constitution} />
        <StatBox label="INT" score={creature.intelligence} />
        <StatBox label="WIS" score={creature.wisdom} />
        <StatBox label="CHA" score={creature.charisma} />
      </div>

      <hr className="section-divider" />

      {/* Details */}
      <div className="space-y-0.5 print-section">
        {saves && <p><strong>Saving Throws</strong> {saves}</p>}
        {skills && <p><strong>Skills</strong> {skills}</p>}
        {creature.damage_vulnerabilities && <p><strong>Damage Vulnerabilities</strong> {creature.damage_vulnerabilities}</p>}
        {creature.damage_resistances && <p><strong>Damage Resistances</strong> {creature.damage_resistances}</p>}
        {creature.damage_immunities && <p><strong>Damage Immunities</strong> {creature.damage_immunities}</p>}
        {creature.condition_immunities && <p><strong>Condition Immunities</strong> {creature.condition_immunities}</p>}
        {(() => { const s = sensesStr(creature); return s ? <p><strong>Senses</strong> {s}</p> : null; })()}
        {creature.languages && <p><strong>Languages</strong> {creature.languages}</p>}
        {creature.tool_proficiencies && <p><strong>Tool Proficiencies</strong> {creature.tool_proficiencies}</p>}
        {!creature.is_player_character && (
          <p><strong>Challenge</strong> {creature.challenge_rating} ({creature.xp?.toLocaleString()} XP)</p>
        )}
        {creature.is_player_character && armorProfs.length > 0 && (
          <p><strong>Armor/Shield Proficiencies</strong> {armorProfs.join(', ')}</p>
        )}
        {creature.is_player_character && (hitDicePool.length > 0 || hitDiceQty > 0) && (
          // Tickable on paper, like the spell slots: hit dice get spent one at
          // a time during a rest, so a printed sheet needs boxes not a total.
          <div className="slot-tracker-inline">
            <strong>Hit Dice</strong>{' '}
            {(hitDicePool.length > 0
              ? hitDicePool
              : [{ type: hitDiceType, qty: hitDiceQty }]
            ).map(({ type, qty }) => {
              const used = Math.max(0, Math.min(qty, Number(
                hitDicePool.length > 0 ? hitDiceUsedMap[type] : hitDiceUsed
              ) || 0));
              return (
                <span key={type || 'hd'} className="inline-flex items-center gap-1 mr-3">
                  <span className="text-xs">{qty - used}/{qty} {type}</span>
                  <span className="inline-flex flex-wrap gap-1 align-middle">
                    {Array.from({ length: qty }).map((_, i) => (
                      <span key={i} className={`slot-box${i < used ? ' slot-box-used' : ''}`} />
                    ))}
                  </span>
                </span>
              );
            })}
          </div>
        )}
        {creature.is_player_character && creature.heroic_inspiration && (
          <p><strong>Heroic Inspiration</strong> ✓</p>
        )}
        {creature.is_player_character && (
          <p>
            <strong>Death Saves</strong>{' '}
            Success:{' '}
            {[0,1,2].map(i => (
              <span key={`ds${i}`} className={`slot-box${i < (Number(creature.death_save_successes) || 0) ? ' slot-box-used' : ''}`} />
            ))}
            {' · '}
            Fail:{' '}
            {[0,1,2].map(i => (
              <span key={`df${i}`} className={`slot-box${i < (Number(creature.death_save_failures) || 0) ? ' slot-box-used' : ''}`} />
            ))}
          </p>
        )}
        {creature.is_player_character && creature.concentrating_on && (
          <p><strong>Concentrating on</strong> <span className="italic">{creature.concentrating_on}</span></p>
        )}
        {creature.is_player_character && attunedItems.length > 0 && (
          <p><strong>Attuned Items</strong> ({attunedItems.length}/3) {attunedItems.map(it => it.name).filter(Boolean).join(', ')}</p>
        )}
      </div>

      {/* Abilities */}
      {creature.special_abilities?.length > 0 && (
        <div className="print-section">
          <hr className="section-divider" />
          <ActionList items={creature.special_abilities} />
        </div>
      )}

      {creature.class_features?.length > 0 && (
        <div className="print-section">
          <hr className="section-divider" />
          <Section title="Class Features">
            <ActionList items={creature.class_features} subclassByName={subclassFeatureNames} />
          </Section>
        </div>
      )}

      {creature.feats?.length > 0 && (
        <div className="print-section">
          <hr className="section-divider" />
          <Section title="Feats"><ActionList items={creature.feats} /></Section>
        </div>
      )}

      {/* Movement (PC only) */}
      {creature.is_player_character && creature.movement_actions?.length > 0 && (
        <div className="print-section">
          <hr className="section-divider" />
          <Section title="Movement"><ActionList items={creature.movement_actions} /></Section>
        </div>
      )}

      {/* Actions */}
      {creature.actions?.length > 0 && (
        <div className="print-section">
          <hr className="section-divider" />
          <Section title="Actions"><ActionList items={creature.actions} /></Section>
        </div>
      )}

      {creature.bonus_actions?.length > 0 && (
        <div className="print-section">
          <hr className="section-divider" />
          <Section title="Bonus Actions"><ActionList items={creature.bonus_actions} /></Section>
        </div>
      )}

      {creature.reactions?.length > 0 && (
        <div className="print-section">
          <hr className="section-divider" />
          <Section title="Reactions"><ActionList items={creature.reactions} /></Section>
        </div>
      )}

      {!creature.is_player_character && creature.legendary_actions?.length > 0 && (
        <div className="print-section">
          <hr className="section-divider" />
          <Section title="Legendary Actions">
            <p className="text-sm mb-1">
              {creature.name} can take {creature.legendary_action_count} legendary action(s), choosing from the options below.
            </p>
            <ActionList items={creature.legendary_actions} />
          </Section>
        </div>
      )}

      <div className="print-section"><WeaponsSection creature={creature} onRoll={onRoll} /></div>

      <div className="print-section"><InventorySection creature={creature} /></div>

      <div className="print-section"><SpellsSection creature={creature} onRoll={onRoll} /></div>
    </div>
  );
}
