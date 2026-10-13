// What light a character can shed, and from what.
//
// Three sources, and it is the last two that matter most in practice:
//
//   * Ordinary gear — a candle, torch or lantern in the pack.
//   * Spells the character actually knows: Light, Dancing Lights, Daylight and
//     friends. Offered only when the spell is on the sheet, so a fighter's menu
//     stays short.
//   * Anything in the inventory flagged `sheds_light` in the inventory editor,
//     with its own radius, colour and flicker. This is how a Lamp, a Flame
//     Tongue or a glowing +1 flail becomes a light source.
//
// Extracted here because it was written once inside the map view and then
// needed again by the player's phone. Guessing at it a second time produced a
// menu of greyed-out torches for a cleric whose actual light sources were a
// lamp and a glowing flail — the two the naive version could not see.
//
// Returns plain data, no icons: the two views draw them differently.

export const BASE_LIGHT_PRESETS = [
  { key: 'none',    label: 'No Light', brightFt: 0,  dimFt: 0,  requiredItem: null,      flicker: false },
  { key: 'candle',  label: 'Candle',   brightFt: 0,  dimFt: 5,  requiredItem: 'candle',  flicker: true  },
  { key: 'torch',   label: 'Torch',    brightFt: 20, dimFt: 40, requiredItem: 'torch',   flicker: true  },
  { key: 'lantern', label: 'Lantern',  brightFt: 30, dimFt: 60, requiredItem: 'lantern', flicker: true  },
];

export const SPELL_LIGHT_PRESETS = [
  { label: 'Light',           spell: 'light',           brightFt: 20, dimFt: 40,  color: '#fde68a', flicker: false },
  { label: 'Dancing Lights',  spell: 'dancing lights',  brightFt: 0,  dimFt: 10,  color: '#fcd34d', flicker: true  },
  { label: 'Faerie Fire',     spell: 'faerie fire',     brightFt: 0,  dimFt: 10,  color: '#a78bfa', flicker: false },
  { label: 'Daylight',        spell: 'daylight',        brightFt: 60, dimFt: 120, color: '#fef3c7', flicker: false },
  { label: 'Moonbeam',        spell: 'moonbeam',        brightFt: 0,  dimFt: 5,   color: '#bfdbfe', flicker: false },
  { label: 'Corona of Light', spell: 'corona of light', brightFt: 60, dimFt: 90,  color: '#fde68a', flicker: false },
];

const DEFAULT_COLOR = '#fbbf24';

// Inventory, which is sometimes an array and sometimes JSON in a string.
export function inventoryOf(creature) {
  const inv = creature?.inventory;
  if (Array.isArray(inv)) return inv;
  if (typeof inv === 'string') {
    try { return JSON.parse(inv) || []; } catch { return []; }
  }
  return [];
}

function spellNamesOf(creature) {
  const raw = creature?.spells;
  const arr = Array.isArray(raw)
    ? raw
    : (typeof raw === 'string' ? (() => { try { return JSON.parse(raw); } catch { return []; } })() : []);
  return new Set((arr || []).map((sp) => String(sp?.name || '').trim().toLowerCase()));
}

// Does the pack contain something matching this keyword? No keyword means the
// preset needs nothing (putting your light out is always allowed), and no
// character at all means don't filter anything.
export function carriesItem(creature, keyword) {
  if (!keyword) return true;
  if (!creature) return true;
  return inventoryOf(creature).some((it) => it.name && it.name.toLowerCase().includes(keyword));
}

// A base preset takes its colour from the matching item, so a green lantern
// configured in the inventory editor lights green.
function itemColorFor(creature, keyword) {
  if (!keyword || !creature) return DEFAULT_COLOR;
  const hit = inventoryOf(creature).find((it) => it.name && it.name.toLowerCase().includes(keyword));
  return hit?.light_color || DEFAULT_COLOR;
}

/** Every preset this character could have, available or not. */
export function lightPresetsFor(creature) {
  const inv = inventoryOf(creature);
  const baseKeywords = BASE_LIGHT_PRESETS.map((p) => p.requiredItem).filter(Boolean).map((k) => k.toLowerCase());

  // Skip an item whose name already matches a base keyword, or a "Torch" with
  // sheds_light set would appear twice — once as the base preset, once here.
  const custom = inv
    .filter((it) => it.sheds_light && it.name && !baseKeywords.some((kw) => it.name.toLowerCase().includes(kw)))
    .map((it) => ({
      key: `item:${it.name}`,
      label: it.name,
      brightFt: Number(it.bright_ft) || 0,
      dimFt: Number(it.dim_ft) || 0,
      color: it.light_color || DEFAULT_COLOR,
      // Custom items flicker unless the editor's toggle says otherwise.
      flicker: it.flicker !== false,
      requiredItem: null,
      custom: true,
    }));

  const known = spellNamesOf(creature);
  const spells = SPELL_LIGHT_PRESETS
    .filter((p) => known.has(p.spell))
    .map((p) => ({ ...p, key: `spell:${p.spell}`, requiredItem: null, isSpell: true }));

  return [
    ...BASE_LIGHT_PRESETS.map((p) => ({ ...p, color: itemColorFor(creature, p.requiredItem) })),
    ...spells,
    ...custom,
  ];
}

/**
 * The ones actually offered: putting it out, anything from a spell or a
 * light-shedding item, and base gear only when it is in the pack.
 */
export function availableLightPresets(creature) {
  return lightPresetsFor(creature)
    .filter((p, i) => i === 0 || p.custom || p.isSpell || carriesItem(creature, p.requiredItem));
}
