// Armour class, derived from what the character is actually wearing.
//
// Lifted out of CreatureForm so the player's phone can use it too: tapping
// "Equip" on a breastplate has to move the AC, and the AC is a STORED field —
// nothing on the server recomputes it — so whoever flips `equipped` is the one
// that must recompute.
//
// Rules (5e, 2024 SRD wording):
//   * Light armour:  base + DEX
//   * Medium armour: base + min(DEX, 2)
//   * Heavy armour:  base, DEX ignored
//   * Shield:        +2, from an equipped shield item or the legacy flag
//   * Magic items:   +N per equipped item with ac_bonus
//   * No body armour: 10 + DEX
//   * ac_misc_bonus: a manual adjustment, always last
//
// Natural armour (Tortle, Lizardfolk, Locathah, Loxodon) is a race's own hide
// or shell setting the AC. It arrives on the sheet as
// race_state.added.natural_armor = { base, ability, blocksArmor, allowsShield }
// written by the race picker, so this file reads it without importing the race
// catalogue. `ability` is the score added on top or null for a flat number —
// a Tortle's shell is 17 regardless of DEX. `blocksArmor` means body armour
// cannot be worn at all; shields, helmets, cloaks, gauntlets and any other
// AC-bonus item still apply.
//
// `always` forces a result even with nothing equipped, which is what a player
// character wants; monsters pass false and keep their hand-written AC.

function mod(score) {
  return Math.floor(((Number(score) || 10) - 10) / 2);
}

function hasFightingStyle(form, styleName) {
  // Matched loosely on purpose. Sheets in the wild carry hand-typed variants —
  // "Defence (Fighting Style)" with the British spelling and a suffix was the
  // real case that made this return false and left a fighter's AC a point
  // short. So: drop any parenthetical, fold defence/defense together, and
  // compare on what's left.
  const norm = (v) => String(v || '')
    .replace(/\(.*?\)/g, '')
    .replace(/\bfighting style\b/gi, '')
    .replace(/defence/gi, 'defense')
    .replace(/[^a-z ]/gi, '')
    .trim()
    .toLowerCase();
  const want = norm(styleName);
  if (!want) return false;
  return (Array.isArray(form?.feats) ? form.feats : []).some((f) => norm(f?.name) === want);
}

// The natural armour a race granted this sheet, or null.
function naturalArmorOf(form) {
  const nat = form?.race_state?.added?.natural_armor;
  if (!nat || !Number(nat.base)) return null;
  return {
    base: Number(nat.base),
    ability: nat.ability || null,
    blocksArmor: !!nat.blocksArmor,
    allowsShield: nat.allowsShield !== false,
    source: nat.source || 'natural armor',
  };
}

// True when the character's race forbids wearing body armour — chain mail,
// leather and everything else in the light / medium / heavy categories. It
// says nothing about shields or worn magic items, which stay legal.
function wornArmorBlocked(form) {
  const nat = naturalArmorOf(form);
  return !!(nat && nat.blocksArmor);
}

function computeAcFromGear(form, always = false) {
  const inv = Array.isArray(form?.inventory) ? form.inventory : [];
  const nat = naturalArmorOf(form);
  // A race that forbids body armour ignores any that is flagged equipped
  // rather than trusting it — an imported sheet can carry a breastplate from
  // before the race was applied, and it must not raise the AC.
  const equippedArmor = nat?.blocksArmor ? [] : inv.filter(
    (it) => it && it.item_type === 'armor' && it.equipped
              && (it.armor_category || '') !== 'shield'
              && Number(it.ac_base) > 0
  );
  // Shield: either via an equipped shield-category armor item OR the
  // legacy shield_equipped boolean.
  const equippedShield = inv.some(
    (it) => it && it.item_type === 'armor' && it.equipped
              && (it.armor_category || '') === 'shield'
  ) || !!form?.shield_equipped;
  const acBonusItems = inv.filter(
    (it) => it && it.equipped && Number(it.ac_bonus) > 0
  );

  const miscBonus = Number(form?.ac_misc_bonus) || 0;
  // A flat trait bonus — a Troglodyte's thick hide — written by the race
  // picker alongside the natural-armour record.
  const raceBonus = Number(form?.race_state?.added?.ac_bonus) || 0;
  if (equippedArmor.length === 0 && !equippedShield && acBonusItems.length === 0
      && miscBonus === 0 && !nat && raceBonus === 0 && !always) {
    return null;
  }

  const dex = mod(Number(form?.dexterity) || 10);
  const parts = [];
  let total = 0;

  // Natural armour and worn armour are alternatives, not additions. The rules
  // let the character use whichever they prefer, so the sheet takes the higher
  // — which is what a player picks every time.
  const natTotal = nat
    ? nat.base + (nat.ability ? mod(Number(form?.[nat.ability]) || 10) : 0)
    : null;

  let wearingArmor = false;
  if (equippedArmor.length > 0) {
    // If multiple armor items are flagged equipped (shouldn't happen
    // but the form allows it), use the highest-AC one.
    const armor = equippedArmor.reduce((best, it) =>
      Number(it.ac_base) > Number(best.ac_base) ? it : best
    );
    const cat = armor.armor_category || 'light';
    const base = Number(armor.ac_base) || 10;
    // ac_bonus on a body-armor row represents enchantment (+1 plate,
    // +2 plate). Folded into the armor's contribution so it doesn't
    // get double-counted in the magic-bonus loop below.
    const armorMagic = Number(armor.ac_bonus) || 0;
    let dexAdded = 0;
    if (cat === 'light') dexAdded = dex;
    else if (cat === 'medium') dexAdded = Math.min(dex, 2);
    // heavy: dexAdded stays 0
    const armorTotal = base + dexAdded + armorMagic;
    if (natTotal !== null && natTotal > armorTotal) {
      total += natTotal;
      parts.push(`${natTotal} (${nat.source})`);
    } else {
      wearingArmor = true;
      total += armorTotal;
      parts.push(`${base} (${armor.name || 'armor'})`);
      if (armorMagic > 0) parts.push(`+${armorMagic} magic`);
      if (dexAdded !== 0) {
        parts.push(`${dexAdded >= 0 ? '+' : ''}${dexAdded} DEX`);
      }
    }
  } else if (natTotal !== null && natTotal >= 10 + dex) {
    total += natTotal;
    parts.push(`${nat.base} (${nat.source})`);
    if (nat.ability) {
      const abilityMod = mod(Number(form?.[nat.ability]) || 10);
      if (abilityMod !== 0) {
        parts.push(`${abilityMod >= 0 ? '+' : ''}${abilityMod} ${nat.ability.slice(0, 3).toUpperCase()}`);
      }
    }
  } else {
    total += 10 + dex;
    parts.push(`10 (unarmored)`);
    if (dex !== 0) parts.push(`${dex >= 0 ? '+' : ''}${dex} DEX`);
  }

  // Defense fighting style: +1 AC while wearing armour of any weight. Held
  // here rather than as free text on the class feature because 2024 makes
  // Fighting Styles feats, and this one has a number the sheet must honour —
  // the reason a Defense fighter's AC was reading one point low.
  if (wearingArmor && hasFightingStyle(form, 'Defense')) {
    total += 1;
    parts.push('+1 Defense');
  }

  if (equippedShield) {
    total += 2;
    parts.push('+2 shield');
  }

  for (const it of acBonusItems) {
    // Body armor's ac_bonus is already counted above as the armor's
    // enchantment. Shield ac_bonus (e.g. a +1 shield) and any other
    // equipped item's ac_bonus (cloak / ring / amulet of protection)
    // get added here.
    if (it.item_type === 'armor' && (it.armor_category || '') !== 'shield') continue;
    const b = Number(it.ac_bonus) || 0;
    if (b === 0) continue;
    total += b;
    parts.push(`+${b} ${it.name || 'magic'}`);
  }

  if (raceBonus !== 0) {
    total += raceBonus;
    parts.push(`${raceBonus >= 0 ? '+' : ''}${raceBonus} natural hide`);
  }

  if (miscBonus !== 0) {
    total += miscBonus;
    parts.push(`${miscBonus >= 0 ? '+' : ''}${miscBonus} bonus`);
  }

  return { total, parts };
}

export { computeAcFromGear, hasFightingStyle, naturalArmorOf, wornArmorBlocked };
