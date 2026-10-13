// Combine a weapon's stored damage-dice string with the wielder's
// stat modifier, returning a single rendered total. The dice string
// may already carry a flat bonus from a magical enchantment (e.g.
// "1d8 + 1" for a Battleaxe +1) — in that case the magical bonus is
// folded together with the stat modifier so the player sees one
// number instead of two:
//
//   "1d8"      + STR +3   →  "1d8 + 3"
//   "1d8 + 1"  + STR +3   →  "1d8 + 4"   (magical +1 absorbed)
//   "1d8 + 2"  + STR -1   →  "1d8 + 1"   (subtraction works)
//   "1d8 - 2"  + STR +2   →  "1d8"       (cancels cleanly)
//   ""         + anything →  ""          (no-damage weapons like Net)
export function formatDamageWithMod(damage, statMod) {
  const s = String(damage || '').trim();
  if (!s) return '';
  const m = s.match(/^(.+?)\s*([+-])\s*(\d+)\s*$/);
  let dice = s;
  let bonus = 0;
  if (m) {
    dice = m[1].trim();
    bonus = (m[2] === '-' ? -1 : 1) * Number(m[3]);
  }
  const total = bonus + (Number(statMod) || 0);
  if (total === 0) return dice;
  return `${dice} ${total > 0 ? '+' : '-'} ${Math.abs(total)}`;
}

// Damage types come out of the SRD lowercase ("slashing", "piercing").
// Render them title-cased so they read like 5e stat blocks. Handles
// multi-word types ("force / radiant") gracefully.
export function formatDamageType(t) {
  return String(t || '')
    .split(/(\s+|\/)/)
    .map((w) => (w.match(/^[a-z]/) ? w[0].toUpperCase() + w.slice(1) : w))
    .join('');
}

// CONDITIONAL DAMAGE: a rider, not a way of swinging.
//
// A Sword of Sharpness deals an extra 14 Slashing "when you roll a 20 on the
// d20 for the attack roll". That is not a third attack mode beside One-Handed
// and Two-Handed — offering it as one would put a button on the sheet that
// adds 14 damage to any hit the player likes. It is damage that applies only
// when its condition is met, so it is split out here and printed as a rider
// under the weapon's own lines.
//
// An entry earns rider status by carrying a `condition` string. Everything
// without one is an ordinary attack mode, exactly as before.
export function weaponDamageRiders(weapon) {
  const w = weapon || {};
  const raw = Array.isArray(w.damage_entries) ? w.damage_entries : [];
  return raw
    .filter((e) => e && String(e.condition || '').trim())
    .map((e, i) => ({
      key: `rider-${i}`,
      damage: e.damage || '',
      damage_type: e.damage_type || '',
      condition: String(e.condition).trim(),
    }));
}

// Split a weapon into its distinct attack modes, each with its own label,
// dice and range. A Spear is one line for the one-handed melee attack, one
// for the versatile two-handed swing, and one for throwing it — previously
// all of those collapsed into a stack of identical "Damage:" rows with no
// way to tell which was which.
//
// Modes come from three places, in order of authority:
//   1. an explicit `label` on the damage entry (set by hand in the editor)
//   2. `note: 'versatile'`, which the item library sets on the second entry
//   3. the weapon's Properties string (Versatile / Thrown / Ammunition)
export function weaponDamageModes(weapon) {
  const w = weapon || {};
  const raw = (Array.isArray(w.damage_entries) && w.damage_entries.length)
    ? w.damage_entries
    : (w.damage ? [{ damage: w.damage, damage_type: w.damage_type || '' }] : []);
  // Riders are handled by weaponDamageRiders and must not become modes.
  const entries = raw.filter((e) => e && e.damage && !String(e.condition || '').trim());
  if (!entries.length) return [];

  const props = String(w.properties || '');
  const has = (p) => new RegExp(p, 'i').test(props);
  const isVersatile = has('versatile');
  const isThrown = has('thrown');
  const isRanged = has('ammunition') || /^\s*\d+\s*\/\s*\d+/.test(String(w.weapon_range || ''));

  // "Thrown (range 20/60 ft.)" carries its own range, which differs from the
  // weapon's melee reach.
  const thrownRange = (props.match(/thrown[^(]*\(([^)]*)\)/i)?.[1] || '').trim();

  const modes = entries.map((e, i) => {
    const explicit = String(e.label || e.mode || '').trim();
    const versatileEntry = String(e.note || '').toLowerCase() === 'versatile'
      || /versatile|two.?hand/i.test(explicit)
      || (!explicit && i > 0 && isVersatile);
    let label = explicit;
    if (!label) {
      if (versatileEntry) label = 'Two-Handed';
      else if (isRanged) label = 'Ranged';
      else if (entries.length > 1 || isVersatile) label = 'One-Handed';
      else label = 'Melee';
    }
    return {
      key: `dmg-${i}`,
      label,
      damage: e.damage,
      damage_type: e.damage_type || '',
      // A mode can carry its own range and its own ability (a thrown spear
      // still uses Strength; a dagger thrown by a rogue uses Dexterity).
      range: e.range || (/thrown/i.test(label) ? thrownRange : '') || w.weapon_range || '',
      stat: e.attack_stat || '',
      index: i,
    };
  });

  // An explicitly-entered Thrown line wins over the synthesised one below.
  const hasThrownEntry = modes.some((m) => /thrown/i.test(m.label));

  // Throwing reuses the one-handed dice at a different range, so it earns its
  // own line rather than being buried in the properties list.
  if (isThrown && !hasThrownEntry) {
    const base = modes[0];
    modes.push({
      key: 'dmg-thrown',
      label: 'Thrown',
      damage: base.damage,
      damage_type: base.damage_type,
      range: thrownRange || w.weapon_range || '',
      stat: '',
      // No index: this mode isn't backed by a stored row, so the editor
      // offers to create one rather than trying to edit it in place.
      index: -1,
      synthetic: true,
    });
  }
  return modes;
}

// Explain a folded damage total. formatDamageWithMod() merges the weapon's own
// flat bonus (a +1 sword's "1d8 + 1") with the wielder's ability modifier into
// a single number, which is right for reading at speed but hides where the
// number came from. This returns the pieces so the UI can show its working:
//
//   damageParts('1d8 + 1', 3, 'STR') → { dice: '1d8', parts: ['STR +3', 'magic +1'] }
//
// `itemFlat` is the weapon's `damage_bonus_misc` field. It means exactly what a
// bonus baked into the dice string means, so the two are added together and
// shown as one "magic" part — a +1 sword reads the same whether its bonus was
// typed into the dice or into the bonus box.
export function damageParts(damage, statMod, statAbbr = '', itemFlat = 0) {
  const s = String(damage || '').trim();
  if (!s) return { dice: '', parts: [] };
  const m = s.match(/^(.+?)\s*([+-])\s*(\d+)\s*$/);
  const dice = m ? m[1].trim() : s;
  const itemBonus = (m ? (m[2] === '-' ? -1 : 1) * Number(m[3]) : 0) + (Number(itemFlat) || 0);
  const mod = Number(statMod) || 0;

  const parts = [];
  if (mod !== 0) parts.push(`${statAbbr || 'ability'} ${mod > 0 ? '+' : '−'}${Math.abs(mod)}`);
  // A flat bonus baked into the weapon's dice is its enchantment.
  if (itemBonus !== 0) parts.push(`magic ${itemBonus > 0 ? '+' : '−'}${Math.abs(itemBonus)}`);
  return { dice, parts };
}

export const ABILITY_KEYS = {
  STR: 'strength', DEX: 'dexterity', CON: 'constitution',
  INT: 'intelligence', WIS: 'wisdom', CHA: 'charisma',
};

// Which abilities a weapon may attack with. Finesse weapons let the wielder
// choose between Strength and Dexterity, and a thrown weapon can differ again,
// so this is a list rather than the single `attack_stat` it grew from.
export function weaponStatOptions(item) {
  const list = Array.isArray(item?.attack_stat_options) ? item.attack_stat_options : [];
  const clean = list.map((a) => String(a || '').toUpperCase()).filter((a) => ABILITY_KEYS[a]);
  if (clean.length) return Array.from(new Set(clean));
  const single = String(item?.attack_stat || 'STR').toUpperCase();
  const base = ABILITY_KEYS[single] ? single : 'STR';
  // Finesse says "Strength or Dexterity, your choice", so offer both without
  // needing every existing weapon to be re-ticked by hand.
  if (/finesse/i.test(String(item?.properties || ''))) {
    return Array.from(new Set([base, 'STR', 'DEX']));
  }
  return [base];
}

// The best of the allowed abilities, which is what a player would choose.
// `stats` is anything with strength/dexterity/... on it (a creature or form).
export function bestWeaponStat(item, stats, override = '') {
  const abilityMod = (score) => Math.floor(((Number(score) || 10) - 10) / 2);
  const forced = String(override || '').toUpperCase();
  if (ABILITY_KEYS[forced]) {
    return { abbr: forced, mod: abilityMod(stats?.[ABILITY_KEYS[forced]]), options: [forced] };
  }
  const options = weaponStatOptions(item);
  let best = options[0];
  let bestMod = abilityMod(stats?.[ABILITY_KEYS[best]]);
  for (const a of options.slice(1)) {
    const m = abilityMod(stats?.[ABILITY_KEYS[a]]);
    if (m > bestMod) { best = a; bestMod = m; }
  }
  return { abbr: best, mod: bestMod, options };
}

// The damage modifier for one mode of one weapon.
//
// Two numbers, always: the ability modifier the mode attacks with, and the
// weapon's own flat damage bonus (`damage_bonus_misc`) — a +1 weapon adds its
// bonus to damage as well as to the attack roll.
//
// It lives here because it did not, and every screen paid for that. The attack
// side was wired up everywhere; the damage side was written correctly in three
// components and then shadowed in each of them by a later `const dm = pick.mod`
// when per-mode rows were added, leaving the `damage_bonus_misc` field doing
// nothing at all anywhere in the app. One function, so there is one thing left
// to get wrong.
//
// Returns bestWeaponStat's answer with `misc` (the flat bonus) and `total`
// (what to add to the dice) alongside it:
//   • `total` → formatDamageWithMod, and the modifier on a damage roll
//   • `mod` + `misc` → damageParts, which shows the two separately
export function weaponDamageMod(item, stats, modeStat = '') {
  const pick = bestWeaponStat(item, stats, modeStat);
  const misc = Number(item?.damage_bonus_misc) || 0;
  return { ...pick, misc, total: pick.mod + misc };
}
