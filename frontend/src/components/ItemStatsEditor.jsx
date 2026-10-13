import React from 'react';
import { formatDamageWithMod, formatDamageType, weaponDamageModes, damageParts, weaponStatOptions, weaponDamageMod } from '../utils/damage.js';
import { wornArmorBlocked, naturalArmorOf } from '../utils/armorClass.js';

// The editor for ONE inventory item — type, name, quantity, weight, weapon
// dice and ranges, armour class, attunement, light, description.
//
// Shared deliberately. This markup used to exist twice: once on the character
// sheet's inventory and once, in a cut-down form, in the GM's treasure chest.
// The treasure copy had drifted — it had no armour fields at all, so a magic
// shield dropped into a hoard lost its AC the moment anyone edited it there,
// and no amount of keeping the two in step by hand would have stopped that
// happening again.
//
// Callbacks rather than direct state: the character sheet writes into
// `form.inventory[i]` and the treasure chest into its own list, so the owner
// decides how a change is stored and this only decides how it looks.
// Icons copied from the character sheet so this component stands alone —
// it is rendered by two different owners and cannot reach into either.
const XIcon = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" className="w-3.5 h-3.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>);
const LightbulbIcon = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 inline mr-1"><path d="M9 21h6" /><path d="M12 3a6 6 0 0 1 6 6c0 2.2-1.2 4.2-3 5.4V18H9v-3.6C7.2 13.2 6 11.2 6 9a6 6 0 0 1 6-6z" /></svg>);

export const KNOWN_LIGHT_ITEMS = {
  candle:  { sheds_light: true, bright_ft: 0,  dim_ft: 5  },
  torch:   { sheds_light: true, bright_ft: 20, dim_ft: 40 },
  lantern: { sheds_light: true, bright_ft: 30, dim_ft: 60 },
};

export function knownLightPreset(name) {
  const lower = (name || '').toLowerCase().trim();
  for (const [key, vals] of Object.entries(KNOWN_LIGHT_ITEMS)) {
    if (lower === key || lower.startsWith(key)) return vals;
  }
  return null;
}

// Damage rows, tolerating the older single-`damage` shape.
export function getDamageEntries(item) {
  if (Array.isArray(item.damage_entries) && item.damage_entries.length > 0) return item.damage_entries;
  if (item.damage) return [{ damage: item.damage, damage_type: item.damage_type || '' }];
  return [{ damage: '', damage_type: '' }];
}

export default function ItemStatsEditor({
  item,
  // GM-only controls: the secret box and the hide toggle. Off by default, so a
  // surface that has not said it is the GM's cannot show either.
  canHide = false,
  // Whose stats the attack/damage preview is computed against. The treasure
  // chest has no owner yet, so it passes a blank creature and the preview
  // simply reads as the weapon's own numbers.
  creature = {},
  onChange,
  onRemove,
  onDamageAdd,
  onDamageRemove,
  onDamageChange,
  onMaterialiseMode,
  // Slots for controls only one owner has. The treasure chest puts its
  // "send to a player" button beside the remove button and its player picker
  // directly beneath the header row; the character sheet passes neither.
  headerExtra = null,
  belowHeader = null,
}) {
const isKnownLight = !!knownLightPreset(item.name);
const isWeapon = item.item_type === 'weapon';
const isArmor = item.item_type === 'armor';
const isMagicItem = item.item_type === 'magic_item';
const isWondrous = item.item_type === 'wondrous_item';
// Plain mundane items don't get attuned — show the flag
// only on weapons / armor / magic + wondrous items where
// it actually applies. Potions are consumed, never attuned.
const canAttune = isWeapon || isMagicItem || isArmor || isWondrous;
// Magic-bonus AC field appears on magic items AND on
// armor (so a +1 plate is just an armor row with
// ac_bonus=1, no need for a separate magic-item entry).
// Wondrous items get it too — a Cloak of Protection is
// an AC bonus with no armor slot of its own.
const showAcBonus = isMagicItem || isArmor || isWondrous;
  return (
/* A hidden row is ringed in amber so the GM can tell at a glance which items
   on this sheet the player cannot see. */
<div className={`rounded-lg p-3 space-y-2 ${canHide && item.gm_hidden ? 'bg-gray-800 ring-1 ring-amber-600/70' : 'bg-gray-800'}`}>
  <div className="flex gap-2">
    <select
      className="w-28 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-gray-300 focus:outline-none focus:border-dnd-gold"
      value={item.item_type || 'item'}
      onChange={(e) => onChange('item_type', e.target.value)}
    >
      <option value="item">Item</option>
      <option value="weapon">Weapon</option>
      <option value="armor">Armor</option>
      <option value="potion">Potion</option>
      <option value="magic_item">Magic Item</option>
      <option value="wondrous_item">Wondrous Item</option>
    </select>
    <input
      className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-dnd-gold"
      placeholder="Item name"
      value={item.name}
      onChange={(e) => onChange('name', e.target.value)}
    />
    <input
      type="number"
      min={1}
      className="w-14 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white text-center focus:outline-none focus:border-dnd-gold"
      placeholder="Qty"
      title="Quantity"
      value={item.qty}
      onChange={(e) => onChange('qty', Math.max(1, parseInt(e.target.value) || 1))}
    />
    {headerExtra}
    <button type="button" onClick={() => onRemove()} className="text-red-400 hover:text-red-300 px-2"><XIcon /></button>
  </div>

  {belowHeader}

  {isWeapon && (
    <div className="space-y-2 border-l-2 border-dnd-gold/40 pl-3">
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-xs text-gray-400">Range</label>
          <input
            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-dnd-gold"
            placeholder="e.g. 5ft or 60/120ft"
            value={item.weapon_range || ''}
            onChange={(e) => onChange('weapon_range', e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs text-gray-400" title="Tick every ability this weapon may attack with — a Finesse weapon allows STR and DEX. The best of them is used.">
            Atk Bonus Stat
          </label>
          <div className="flex flex-wrap gap-1">
            {['STR','DEX','CON','INT','WIS','CHA'].map((ab) => {
              const chosen = weaponStatOptions(item).includes(ab);
              return (
                <button
                  key={ab}
                  type="button"
                  onClick={() => {
                    const cur = weaponStatOptions(item);
                    // Always leave at least one ability selected.
                    const next = chosen
                      ? (cur.length > 1 ? cur.filter((x) => x !== ab) : cur)
                      : [...cur, ab];
                    onChange('attack_stat_options', next);
                    onChange('attack_stat', next[0]);
                  }}
                  className={`text-[11px] px-1.5 py-1 rounded border transition-colors ${
                    chosen
                      ? 'border-dnd-gold text-dnd-gold bg-dnd-gold/10'
                      : 'border-gray-600 text-gray-500 hover:text-gray-300'
                  }`}
                >{ab}</button>
              );
            })}
          </div>
        </div>
        <div className="w-16">
          <label className="text-xs text-gray-400">Atk Bonus</label>
          <input
            type="number"
            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white text-center focus:outline-none focus:border-dnd-gold"
            placeholder="+0"
            value={item.attack_bonus_misc ?? 0}
            onChange={(e) => onChange('attack_bonus_misc', parseInt(e.target.value) || 0)}
          />
        </div>
        {/* A magic weapon's bonus applies to damage as well
            as to the attack roll, so it needs its own box —
            they are the same number on a +1 sword, but not
            on everything (a weapon can be easier to hit with
            without hitting harder). */}
        <div className="w-16">
          <label className="text-xs text-gray-400">Dmg Bonus</label>
          <input
            type="number"
            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white text-center focus:outline-none focus:border-dnd-gold"
            placeholder="+0"
            value={item.damage_bonus_misc ?? 0}
            onChange={(e) => onChange('damage_bonus_misc', parseInt(e.target.value) || 0)}
          />
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs text-gray-400">Damage</label>
          <button
            type="button"
            onClick={() => onDamageAdd()}
            className="text-xs text-indigo-400 hover:text-indigo-200 transition-colors"
          >
            + Add Damage
          </button>
        </div>
        <div className="space-y-1">
          {(() => {
            // Placeholder shows the mode this row would be
            // labelled with if left blank, so the field reads
            // as "inferred" rather than pre-filled.
            const inferred = weaponDamageModes(item);
            return getDamageEntries(item).map((entry, ei) => (
            <div key={ei}>
            <div className="flex gap-1.5 items-center">
              {/* Names the attack mode this line belongs to, so a
                  Spear reads One-Handed / Two-Handed / Thrown
                  instead of three identical damage rows. Left
                  blank, the mode is inferred from the weapon's
                  properties. */}
              <input
                className="w-24 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white placeholder-gray-500 italic focus:outline-none focus:border-dnd-gold"
                placeholder={inferred[ei]?.label || 'Mode'}
                title="Attack mode — left blank it's worked out from the weapon's properties. Override with e.g. One-Handed, Two-Handed, Thrown."
                value={entry.label || ''}
                onChange={(e) => onDamageChange(ei, 'label', e.target.value)}
              />
              <input
                className="w-24 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-dnd-gold"
                placeholder="1d8+3"
                value={entry.damage}
                onChange={(e) => onDamageChange(ei, 'damage', e.target.value)}
              />
              <input
                className="flex-1 min-w-0 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-dnd-gold"
                placeholder="Slashing"
                value={entry.damage_type}
                onChange={(e) => onDamageChange(ei, 'damage_type', e.target.value)}
              />
              {/* A thrown line has its own range, and can use a
                  different ability from the melee swing. */}
              <input
                className="w-24 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white placeholder-gray-500 italic focus:outline-none focus:border-dnd-gold"
                placeholder={inferred[ei]?.range || 'Range'}
                title="Range for this mode. Blank uses the weapon's range."
                value={entry.range || ''}
                onChange={(e) => onDamageChange(ei, 'range', e.target.value)}
              />
              <select
                className="w-16 bg-gray-700 border border-gray-600 rounded px-1 py-1 text-xs text-white focus:outline-none focus:border-dnd-gold"
                title="Ability for this mode. 'Auto' uses the best of the weapon's allowed abilities."
                value={entry.attack_stat || ''}
                onChange={(e) => onDamageChange(ei, 'attack_stat', e.target.value)}
              >
                <option value="">Auto</option>
                {['STR','DEX','CON','INT','WIS','CHA'].map(ab => <option key={ab} value={ab}>{ab}</option>)}
              </select>
              {getDamageEntries(item).length > 1 && (
                <button
                  type="button"
                  onClick={() => onDamageRemove(ei)}
                  className="text-red-400 hover:text-red-300 px-1 shrink-0"
                ><XIcon /></button>
              )}
            </div>
            {/* Conditional damage — the Sword of Sharpness's extra 14 Slashing
                "on a 20 on the attack roll". Filled in, this line stops being
                an attack mode and becomes a rider printed under the weapon,
                so nobody gets a button that adds it to an ordinary hit. */}
            <div className="flex gap-1.5 items-center pt-1">
              <span className="text-[11px] text-gray-500 w-24 shrink-0 pl-1">Only when</span>
              <input
                className="flex-1 min-w-0 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white placeholder-gray-500 italic focus:outline-none focus:border-dnd-gold"
                placeholder="always — e.g. on a 20 on the attack roll, against undead"
                title="Leave blank for damage dealt on every hit. Filled in, this line is shown as a conditional rider instead of an attack mode."
                value={entry.condition || ''}
                onChange={(e) => onDamageChange(ei, 'condition', e.target.value)}
              />
            </div>
            {/* A damage line with no dice never renders as an
                attack, so rules text parked in the type field
                disappears from the sheet and the PDF. */}
            {!entry.damage && String(entry.damage_type || '').length > 40 && (
              <div className="text-[11px] text-amber-400/90 pl-1 pb-1">
                This line has no damage dice, so it won't appear on the sheet. Rules text belongs in the item's Description.
              </div>
            )}
            </div>
            ));
          })()}
        </div>
      </div>
      {/* How this weapon actually resolves at the table: one
          line per attack mode, each with its own dice and
          range. Without it the damage rows above are just a
          stack of numbers with no stated meaning. */}
      {(() => {
        const modes = weaponDamageModes(item);
        if (modes.length < 2) return null;
        return (
          <div className="bg-gray-800 border border-emerald-700/40 rounded-lg p-2 space-y-1">
            <div className="text-[11px] text-emerald-300 font-semibold uppercase tracking-wider">Attack modes</div>
            {modes.map((m) => {
              const pick = weaponDamageMod(item, creature, m.stat);
              const bd = damageParts(m.damage, pick.mod, pick.abbr, pick.misc);
              return (
                <div key={m.key} className="flex items-baseline gap-2 text-xs flex-wrap">
                  <span className="text-gray-400 w-24 shrink-0">{m.label}</span>
                  <span className="font-mono text-gray-200">
                    {formatDamageWithMod(m.damage, pick.total)}{m.damage_type ? ` ${formatDamageType(m.damage_type)}` : ''}
                  </span>
                  {/* Where the flat number came from — otherwise a
                      "+1" could be the ability modifier, an
                      enchantment, or both added together. */}
                  {bd.parts.length > 0 && (
                    <span className="text-gray-500">({bd.dice} + {bd.parts.join(' + ')})</span>
                  )}
                  {pick.options.length > 1 && (
                    <span className="text-gray-600">best of {pick.options.join('/')}</span>
                  )}
                  {m.range && <span className="text-gray-500">· {m.range}</span>}
                  {m.synthetic && (
                    <button
                      type="button"
                      onClick={() => onMaterialiseMode(m)}
                      className="text-[10px] px-1.5 py-0.5 rounded border border-emerald-700/60 text-emerald-300 hover:bg-emerald-900/30"
                      title="Add this as its own damage line so you can edit its dice, range and ability"
                    >+ Edit as line</button>
                  )}
                </div>
              );
            })}
          </div>
        );
      })()}

      <div>
        <label className="text-xs text-gray-400">Properties</label>
        <input
          className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-dnd-gold"
          placeholder="e.g. Versatile, Finesse"
          value={item.properties || ''}
          onChange={(e) => onChange('properties', e.target.value)}
        />
      </div>
      <div>
        <label className="text-xs text-gray-400">Mastery</label>
        <select
          className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-dnd-gold"
          value={item.mastery || ''}
          onChange={(e) => onChange('mastery', e.target.value)}
        >
          <option value="">None</option>
          {['Cleave','Graze','Nick','Push','Sap','Slow','Topple','Vex'].map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>
    </div>
  )}

  {isArmor && (
    <div className="space-y-2 border-l-2 border-emerald-700/40 pl-3">
      <div className="flex gap-2 flex-wrap">
        <div className="w-24">
          <label className="text-xs text-gray-400">Base AC</label>
          <input
            type="number"
            min={1}
            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white text-center focus:outline-none focus:border-emerald-400"
            placeholder="14"
            value={item.ac_base ?? ''}
            onChange={(e) => onChange('ac_base', parseInt(e.target.value) || 0)}
          />
        </div>
        <div className="w-32">
          <label className="text-xs text-gray-400">Category</label>
          <select
            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-emerald-400"
            value={item.armor_category || 'light'}
            onChange={(e) => onChange('armor_category', e.target.value)}
          >
            <option value="light">Light (+ DEX)</option>
            <option value="medium">Medium (+ DEX, max 2)</option>
            <option value="heavy">Heavy (no DEX)</option>
            <option value="shield">Shield (+2 flat)</option>
          </select>
        </div>
        <div className="w-24">
          <label className="text-xs text-gray-400">STR Req</label>
          <input
            type="number"
            min={0}
            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white text-center focus:outline-none focus:border-emerald-400"
            placeholder="—"
            value={item.str_req ?? ''}
            onChange={(e) => onChange('str_req', e.target.value === '' ? null : parseInt(e.target.value) || 0)}
          />
        </div>
        <label className="flex items-center gap-1.5 text-xs text-gray-300 self-end pb-1">
          <input
            type="checkbox"
            className="accent-emerald-500"
            checked={!!item.stealth_disadvantage}
            onChange={(e) => onChange('stealth_disadvantage', e.target.checked)}
          />
          <span>Stealth disadvantage</span>
        </label>
      </div>
      <p className="text-[11px] text-emerald-300/70 leading-snug">
        When this armor is equipped, your AC is auto-computed from Base AC + DEX (capped per category) + any other equipped magic-item AC bonuses. Shields with this category contribute the same +2 the existing Shield flag does.
      </p>
    </div>
  )}

  {showAcBonus && (
    <div className="flex items-center gap-3 flex-wrap pl-3">
      <label className="flex items-center gap-1.5 text-xs text-gray-300">
        <span className="text-gray-400">Equipped AC bonus:</span>
        <input
          type="number"
          className="w-14 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white text-center focus:outline-none focus:border-emerald-400"
          placeholder="0"
          value={item.ac_bonus ?? ''}
          onChange={(e) => onChange('ac_bonus', e.target.value === '' ? null : parseInt(e.target.value) || 0)}
        />
        <span className="text-gray-500">added to AC while equipped</span>
      </label>
    </div>
  )}

  <div className="flex items-center gap-3 flex-wrap">
    {canAttune && (
      <label className="flex items-center gap-1.5 text-xs text-gray-300">
        <span className="text-gray-400">Attunement:</span>
        <select
          className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-dnd-gold"
          value={item.attunement_required ? 'yes' : 'no'}
          onChange={(e) => onChange('attunement_required', e.target.value === 'yes')}
        >
          <option value="no">Not required</option>
          <option value="yes">Requires attunement</option>
        </select>
      </label>
    )}
    {canAttune && item.attunement_required && (() => {
      // `creature`, not `form`. This component is rendered by two owners that
      // hold their item lists under different names and it cannot reach into
      // either, so the list arrives as the `creature` prop — the sheet passes
      // `creature={form}`, which is where the stale name came from. `form`
      // resolved to nothing here, so merely drawing a row for an item that
      // requires attunement threw a ReferenceError mid-render; nothing above
      // the character sheet caught it, React unmounted the whole tree, and the
      // player was left staring at the bare page background.
      //
      // Array-checked rather than `|| []` because the two owners disagree on
      // shape as well as name: the sheet normalises to an array, the treasure
      // chest passes no creature at all (`{}` → no cap, which is right — a
      // chest attunes to nothing), and a raw row carries the JSON string, on
      // which `.filter` would be the same crash wearing a different hat.
      const owned = Array.isArray(creature.inventory) ? creature.inventory : [];
      const attunedCount = owned
        .filter(it => it?.attuned && it?.attunement_required).length;
      const atLimit = attunedCount >= 3 && !item.attuned;
      return (
        <label
          className={`flex items-center gap-1.5 text-xs ${atLimit ? 'text-gray-600 cursor-not-allowed' : 'text-gray-300 cursor-pointer'}`}
          title={atLimit ? 'Already attuned to 3 items' : 'Attune to this item'}
        >
          <input
            type="checkbox"
            checked={item.attuned || false}
            disabled={atLimit}
            onChange={(e) => onChange('attuned', e.target.checked)}
            className="accent-purple-400"
          />
          <span className={atLimit ? 'text-gray-600' : 'text-purple-300'}>Attuned</span>
        </label>
      );
    })()}
  </div>


  <div className="flex items-center gap-3 flex-wrap">
    {(() => {
      // Body armour only — a race with natural armour (a Tortle's shell) can
      // still wear a shield, a helm, gauntlets or a cloak.
      const isBodyArmor = item.item_type === 'armor' && (item.armor_category || '') !== 'shield';
      const blocked = isBodyArmor && wornArmorBlocked(creature);
      const nat = blocked ? naturalArmorOf(creature) : null;
      return (
        <label className={`flex items-center gap-1.5 text-xs ${blocked ? 'text-gray-500 cursor-not-allowed' : 'text-gray-300 cursor-pointer'}`}
          title={blocked ? `Natural armor (AC ${nat?.base ?? ''}) — this character can't wear body armor.` : undefined}>
          <input
            type="checkbox"
            checked={item.equipped || false}
            disabled={blocked && !item.equipped}
            onChange={(e) => onChange('equipped', e.target.checked)}
            className="accent-dnd-gold"
          />
          Equipped
          {blocked && (
            <span className="text-[10px] text-amber-300/80">natural armor — no body armor</span>
          )}
        </label>
      );
    })()}
    {!isKnownLight && (
      <label className="flex items-center gap-1.5 text-xs text-gray-300 cursor-pointer">
        <input
          type="checkbox"
          checked={item.sheds_light || false}
          onChange={(e) => onChange('sheds_light', e.target.checked)}
          className="accent-yellow-400"
        />
        <LightbulbIcon />Sheds Light
      </label>
    )}
    {isKnownLight && (
      <span className="text-xs text-yellow-400 flex items-center gap-1"><LightbulbIcon />Light source (auto)</span>
    )}
  </div>
  {(item.sheds_light || isKnownLight) && (
    <div className="flex items-center gap-3 flex-wrap">
      <label className="flex items-center gap-1.5 text-xs text-gray-300">
        <span className="text-yellow-300">Bright light:</span>
        <input
          type="number"
          min={0}
          step={5}
          className="w-16 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white text-center focus:outline-none focus:border-yellow-400"
          value={item.bright_ft ?? 20}
          onChange={(e) => onChange('bright_ft', Math.max(0, parseInt(e.target.value) || 0))}
        />
        <span className="text-gray-500">ft</span>
      </label>
      <label className="flex items-center gap-1.5 text-xs text-gray-300">
        <span className="text-yellow-600">Dim light:</span>
        <input
          type="number"
          min={0}
          step={5}
          className="w-16 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white text-center focus:outline-none focus:border-yellow-400"
          value={item.dim_ft ?? 40}
          onChange={(e) => onChange('dim_ft', Math.max(0, parseInt(e.target.value) || 0))}
        />
        <span className="text-gray-500">ft beyond bright</span>
      </label>
      <label className="flex items-center gap-1.5 text-xs text-gray-300">
        <span className="text-gray-400">Color:</span>
        <input
          type="color"
          className="w-8 h-6 rounded border border-gray-600 cursor-pointer"
          value={item.light_color || '#fbbf24'}
          onChange={(e) => onChange('light_color', e.target.value)}
        />
      </label>
      <label className="flex items-center gap-1.5 text-xs text-gray-300 cursor-pointer select-none">
        <input
          type="checkbox"
          className="accent-dnd-gold"
          checked={item.flicker !== false}
          onChange={(e) => onChange('flicker', e.target.checked)}
        />
        <span>Flicker</span>
        <span className="text-gray-500">(off for magical/steady glow)</span>
      </label>
    </div>
  )}
  <div className="flex items-center gap-2">
    <label className="text-xs text-gray-400 shrink-0">Weight</label>
    <input
      className="w-24 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-dnd-gold"
      placeholder="e.g. 3 lb"
      value={item.weight || ''}
      onChange={(e) => onChange('weight', e.target.value)}
    />
  </div>

  <textarea
    className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white resize-none focus:outline-none focus:border-dnd-gold"
    placeholder="Description (optional)"
    rows={2}
    value={item.desc || ''}
    onChange={(e) => onChange('desc', e.target.value)}
  />

  {/* AN ITEM THE CHARACTER DOES NOT KNOW THEY HAVE.
      Hidden items never reach the player's client at all — not greyed out on
      their sheet, not in their saved copy, not in the network tab — so the
      only sign of one is here. */}
  {canHide && (
    <label className="flex items-start gap-2 rounded border border-amber-800/70 bg-amber-950/25 p-2 cursor-pointer">
      <input
        type="checkbox"
        className="mt-0.5 accent-amber-500"
        checked={!!item.gm_hidden}
        onChange={(e) => onChange('gm_hidden', e.target.checked)}
      />
      <span className="min-w-0">
        <span className="block text-[11px] font-semibold text-amber-200">
          Hide from the player
        </span>
        <span className="block text-[10px] text-amber-300/70 leading-snug">
          {item.gm_hidden
            ? 'They are carrying this and their sheet shows no sign of it.'
            : 'Keep it in their pack, out of their sight.'}
        </span>
      </span>
    </label>
  )}

  {canHide && (
  <>
  {/* What the GM knows and the party does not.
      Kept visually distinct from the description because the two are opposites:
      one is printed on the player's sheet, the other is withheld from it. The
      text is stripped server-side for player clients, so it is not merely
      hidden in the interface — until it is revealed, it never reaches them. */}
  <div className="rounded border border-purple-800/70 bg-purple-950/25 p-2 space-y-1.5">
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11px] font-semibold text-purple-200">GM secret</span>
      {(item.gm_secret || '').trim() ? (
        <label className="flex items-center gap-1.5 text-[11px] text-purple-200 cursor-pointer">
          <input
            type="checkbox"
            checked={!!item.secret_revealed}
            onChange={(e) => onChange('secret_revealed', e.target.checked)}
          />
          {item.secret_revealed ? 'The party knows' : 'Reveal to the player'}
        </label>
      ) : (
        <span className="text-[10px] text-purple-300/60">players never see this</span>
      )}
    </div>
    <textarea
      className="w-full bg-gray-900 border border-purple-900/70 rounded px-2 py-1 text-xs text-purple-100 resize-none focus:outline-none focus:border-purple-500"
      placeholder="Cursed: cannot be unequipped until Remove Curse is cast…"
      rows={2}
      value={item.gm_secret || ''}
      onChange={(e) => onChange('gm_secret', e.target.value)}
    />
    {(item.gm_secret || '').trim() && item.secret_revealed && (
      <p className="text-[10px] text-amber-300/80 leading-snug">
        Revealed — this now appears on the player's own sheet.
      </p>
    )}
  </div>
  </>
  )}
</div>
  );
}
