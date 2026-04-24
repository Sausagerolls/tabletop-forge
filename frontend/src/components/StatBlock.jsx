import React, { useState } from 'react';

function mod(score) {
  const m = Math.floor((score - 10) / 2);
  return m >= 0 ? `+${m}` : `${m}`;
}

function sensesStr(creature) {
  let arr = [];
  if (Array.isArray(creature.senses)) {
    arr = creature.senses;
  } else if (typeof creature.senses === 'string' && creature.senses.trim().startsWith('[')) {
    try { arr = JSON.parse(creature.senses); } catch { arr = []; }
  }
  const LABELS = {
    darkvision: 'Darkvision', blindsight: 'Blindsight', tremorsense: 'Tremorsense',
    truesight: 'Truesight', devilssight: "Devil's Sight",
  };
  const parts = arr
    .filter((s) => s.type && s.type !== 'normal')
    .map((s) => {
      const label = LABELS[s.type] || s.type;
      const range = s.range != null && s.range !== 0 ? ` ${s.range} ft.` : '';
      return label + range;
    });
  if (creature.passive_perception != null) {
    parts.push(`Passive Perception ${creature.passive_perception}`);
  }
  return parts.join(', ');
}

function speedStr(creature) {
  const parts = [];
  if (creature.speed_walk) parts.push(`${creature.speed_walk} ft.`);
  if (creature.speed_fly) parts.push(`fly ${creature.speed_fly} ft.`);
  if (creature.speed_swim) parts.push(`swim ${creature.speed_swim} ft.`);
  if (creature.speed_burrow) parts.push(`burrow ${creature.speed_burrow} ft.`);
  if (creature.speed_climb) parts.push(`climb ${creature.speed_climb} ft.`);
  return parts.join(', ') || '—';
}

function savesStr(creature) {
  const map = { save_str: 'Str', save_dex: 'Dex', save_con: 'Con', save_int: 'Int', save_wis: 'Wis', save_cha: 'Cha' };
  const parts = Object.entries(map)
    .filter(([k]) => creature[k] !== null && creature[k] !== undefined)
    .map(([k, label]) => `${label} ${creature[k] >= 0 ? '+' : ''}${creature[k]}`);
  return parts.join(', ');
}

function skillsStr(creature) {
  const labels = {
    skill_acrobatics: 'Acrobatics', skill_animal_handling: 'Animal Handling', skill_arcana: 'Arcana',
    skill_athletics: 'Athletics', skill_deception: 'Deception', skill_history: 'History',
    skill_insight: 'Insight', skill_intimidation: 'Intimidation', skill_investigation: 'Investigation',
    skill_medicine: 'Medicine', skill_nature: 'Nature', skill_perception: 'Perception',
    skill_performance: 'Performance', skill_persuasion: 'Persuasion', skill_religion: 'Religion',
    skill_sleight_of_hand: 'Sleight of Hand', skill_stealth: 'Stealth', skill_survival: 'Survival',
  };
  const parts = Object.entries(labels)
    .filter(([k]) => creature[k] !== null && creature[k] !== undefined)
    .map(([k, label]) => `${label} ${creature[k] >= 0 ? '+' : ''}${creature[k]}`);
  return parts.join(', ');
}

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

function abilityMod(score) {
  return Math.floor(((score || 10) - 10) / 2);
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

  function weaponAtkBonus(w) {
    const sk = STAT_KEYS[w.attack_stat] || 'strength';
    return abilityMod(creature[sk]) + profBonus + (w.attack_bonus_misc || 0);
  }

  function weaponDmgMod(w) {
    const sk = STAT_KEYS[w.attack_stat] || 'strength';
    return abilityMod(creature[sk]);
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
          const ab = weaponAtkBonus(w);
          const dm = weaponDmgMod(w);
          const dmgEntries = getDmgEntries(w).filter(e => e.damage);
          return (
            <div key={i} className="text-sm">
              <div className="flex items-center gap-1 flex-wrap">
                <span className="font-semibold">{w.name || '—'}</span>
                {w.equipped && <span className="text-dnd-gold text-xs">★</span>}
                <span className="text-xs text-gray-500">·</span>
                <span className="text-xs text-green-400 font-mono">{ab >= 0 ? '+' : ''}{ab}</span>
                <span className="text-xs text-gray-500">to hit</span>
                {w.weapon_range && (
                  <>
                    <span className="text-xs text-gray-500">·</span>
                    <span className="text-xs text-gray-500">{w.weapon_range}</span>
                  </>
                )}
              </div>
              {dmgEntries.length > 0 && (
                <div className="pl-2 mt-0.5 space-y-0.5">
                  {dmgEntries.map((e, di) => (
                    <div key={di} className="flex items-center gap-1 text-xs">
                      <span className="text-gray-400">Damage:</span>
                      <span className="font-mono text-gray-200">
                        {e.damage}{e.damage_type ? ` ${e.damage_type}` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              )}
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
                <td className="py-0.5 px-2 text-gray-600 text-xs">{item.desc || ''}</td>
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
    <div className="space-y-1">
      {items.map((item, i) => (
        <p key={i} className="text-sm">
          <strong className="italic">{item.name}.</strong> {item.desc}
        </p>
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
      {usedAbilities.length > 0 && (
        <div className="mb-2 text-xs bg-amber-50/60 border border-dnd-red/40 rounded p-2 space-y-1 text-gray-900">
          {usedAbilities.map(ab => {
            const score = creature[abilityLabels[ab]] ?? 10;
            const m = abilityMod(score);
            const saveDC = 10 + m;
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
        const combat = lvlSpells.filter((s) => s.type === 'combat');
        const utility = lvlSpells.filter((s) => s.type === 'utility');
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
                    <span key={i} style={{ fontSize: 10 }}>{i < (slotInfo.used || 0) ? '☒' : '☐'}</span>
                  ))}
                </span>
              )}
            </div>
            {combat.length > 0 && (
              <div className="spell-grid grid grid-cols-2 gap-2 mt-1" style={{ gridAutoFlow: 'row' }}>
                {combat.map((s) => (
                  <SpellBox key={s.id} spell={s} typeLabel="⚔ Combat" typeColor="text-red-700" />
                ))}
              </div>
            )}
            {utility.length > 0 && (
              <div className="spell-grid grid grid-cols-2 gap-2 mt-1" style={{ gridAutoFlow: 'row' }}>
                {utility.map((s) => (
                  <SpellBox key={s.id} spell={s} typeLabel="◈ Utility" typeColor="text-blue-700" />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function StatBlock({ creature, onRoll = null }) {
  if (!creature) return null;

  const sizeType = `${creature.size?.charAt(0).toUpperCase()}${creature.size?.slice(1)} ${creature.creature_type}${creature.subtype ? ` (${creature.subtype})` : ''}`;
  const saves = savesStr(creature);
  const skills = skillsStr(creature);

  // PC-specific summary pieces
  const classLine = creature.is_player_character && (creature.char_class || creature.char_subclass)
    ? [creature.char_class, creature.char_subclass].filter(Boolean).join(' / ')
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
        <h2 className="text-2xl font-bold text-dnd-red font-serif">{creature.name}</h2>
        <p className="italic text-gray-600">{sizeType}, {creature.alignment}</p>
        {classLine && <p className="italic text-gray-500 text-xs">{classLine}</p>}
      </div>

      <hr className="section-divider" />

      {/* Core stats */}
      <div className="space-y-0.5 print-section">
        {(() => {
          const baseAC = Number(creature.armor_class) || 0;
          const shield = !!creature.shield_equipped;
          const total = baseAC + (shield ? 2 : 0);
          const parts = [];
          if (creature.armor_desc) parts.push(creature.armor_desc);
          if (shield) parts.push('shield +2');
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
        {!creature.is_player_character && (
          <p><strong>Challenge</strong> {creature.challenge_rating} ({creature.xp?.toLocaleString()} XP)</p>
        )}
        {creature.is_player_character && armorProfs.length > 0 && (
          <p><strong>Armor/Shield Proficiencies</strong> {armorProfs.join(', ')}</p>
        )}
        {creature.is_player_character && hitDiceQty > 0 && hitDiceType && (
          <p><strong>Hit Dice</strong> {Math.max(0, hitDiceQty - hitDiceUsed)}/{hitDiceQty} {hitDiceType}</p>
        )}
        {creature.is_player_character && creature.heroic_inspiration && (
          <p><strong>Heroic Inspiration</strong> ✓</p>
        )}
        {creature.is_player_character && (
          <p>
            <strong>Death Saves</strong>{' '}
            Success: {[0,1,2].map(i => <span key={`ds${i}`}>{i < (Number(creature.death_save_successes) || 0) ? '☒' : '☐'}</span>)}{' · '}
            Fail: {[0,1,2].map(i => <span key={`df${i}`}>{i < (Number(creature.death_save_failures) || 0) ? '☒' : '☐'}</span>)}
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
          <Section title="Class Features"><ActionList items={creature.class_features} /></Section>
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
