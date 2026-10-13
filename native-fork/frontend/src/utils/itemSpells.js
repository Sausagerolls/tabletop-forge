// Spells a character has because of something they are carrying.
//
// A Bell of the Unseen Servant casts Unseen Servant once a day while you hold
// it. That spell is not on the character's own list and must not be written
// onto it: the bell can be handed to the next player between sessions, and a
// spell copied onto the sheet would stay behind after the bell had gone.
//
// So it is derived, every time, from the inventory — the same approach the
// feature-granted skill bonuses take. Pick the bell up and the spell appears;
// give it away and it goes with it, with no save and no cleanup.
//
// The grant is declared on the item as `grants_spells`:
//
//   [{ name: 'Unseen Servant', requires: 'held', uses: 1, recharge: 'dawn' }]
//
//   requires — 'held' (in the pack at all) or 'attuned' (attunement ticked)
//   uses     — how many times between recharges; omit for unlimited
//   recharge — 'dawn' | 'long' | 'short', matched to the rest that restores it

/** Inventory, tolerating the JSON-in-a-string shape the sheet sometimes holds. */
function inventoryOf(creature) {
  const raw = creature?.inventory;
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string' && raw.trim().startsWith('[')) {
    try { return JSON.parse(raw) || []; } catch { return []; }
  }
  return [];
}

/** Is this item's grant currently live? */
function grantActive(item, requires) {
  if (String(requires || 'held') === 'attuned') {
    // Only an item that ASKS for attunement can fail this test — an item with
    // no attunement requirement is never "unattuned" in any meaningful sense.
    const needsAttunement = !!(item.attunement_required || item.attunement || item.attunement_req);
    return needsAttunement ? !!item.attuned : true;
  }
  return true;   // 'held' — carrying it is enough
}

/**
 * Every spell the character's gear is currently granting.
 *
 * @returns {Array<{name, level, uses, recharge, requires, itemName, resourceId}>}
 */
export function itemGrantedSpells(creature) {
  const out = [];
  for (const item of inventoryOf(creature)) {
    const grants = Array.isArray(item?.grants_spells) ? item.grants_spells : [];
    for (const g of grants) {
      const name = String(g?.name || '').trim();
      if (!name) continue;
      if (!grantActive(item, g.requires)) continue;
      out.push({
        name,
        level: Number(g.level) || 0,
        uses: Number(g.uses) || 0,
        // What one casting costs out of the item's shared charge pool. 0 for
        // an item that has no pool and just grants N uses of one spell.
        cost: Number(g.cost) || 0,
        recharge: String(g.recharge || 'dawn'),
        requires: String(g.requires || 'held'),
        itemName: item.name || 'An item',
        // Stable across renders and saves, so the used-count survives a reload.
        resourceId: `item-spell:${slug(item.name)}:${slug(name)}`,
      });
    }
  }
  return out;
}

function slug(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/**
 * An item's shared pool of charges, if it has one.
 *
 * A Staff of Defence holds ten charges and spends them at different rates —
 * Mage Armor for one, Shield for two — so it cannot be modelled as "N uses of
 * a spell" the way the Bell of the Unseen Servant is. The pool belongs to the
 * ITEM and the spells draw on it.
 *
 * Declared on the item as:
 *
 *   charges: { max: 10, recharge: 'dawn', regain: '1d6+4',
 *              volatile: { die: 'd20', on: 1 } }
 *
 * `volatile` is the staff-shatters rule: spend the last charge, roll that die,
 * and on that result the item is destroyed. Carried as data so the sheet can
 * state it where the charges are spent.
 */
export function itemCharges(item) {
  const c = item?.charges;
  if (!c || typeof c !== 'object') return null;
  const max = Number(c.max) || 0;
  if (max <= 0) return null;
  return {
    max,
    recharge: String(c.recharge || 'dawn'),
    regain: String(c.regain || ''),
    volatile: c.volatile && Number(c.volatile.on)
      ? { die: String(c.volatile.die || 'd20'), on: Number(c.volatile.on) }
      : null,
    itemName: item.name || 'An item',
    resourceId: `item-charges:${slug(item.name)}`,
  };
}

/** Every carried item that has a charge pool and is currently usable. */
export function chargedItems(creature) {
  const out = [];
  for (const item of inventoryOf(creature)) {
    const pool = itemCharges(item);
    if (!pool) continue;
    // A pool is live under the same terms its spells are: the strictest
    // `requires` among them, defaulting to simply carrying the thing.
    const grants = Array.isArray(item.grants_spells) ? item.grants_spells : [];
    const needsAttunement = grants.some((g) => String(g?.requires) === 'attuned');
    if (!grantActive(item, needsAttunement ? 'attuned' : 'held')) continue;
    out.push({ ...pool, spells: grants });
  }
  return out;
}

/**
 * The same grants as resource definitions, so a limited-use item is tracked by
 * the Resources card alongside Wild Shape and Bardic Inspiration rather than
 * being something the player has to remember.
 *
 * `rest` is the app's rest kind: a dawn recharge is restored by a Long Rest,
 * which is the closest thing the sheet models.
 */
export function itemSpellResources(creature) {
  // A charge pool is ONE counter for the item, not one per spell: spending two
  // charges on Shield has to leave eight for anything else, and two separate
  // trackers could not express that.
  const pools = chargedItems(creature).map((p) => ({
    id: p.resourceId,
    label: `${p.itemName} charges`,
    total: p.max,
    rest: p.recharge === 'short' ? 'short' : 'long',
    note: [
      p.regain ? `Regains ${p.regain} charges at ${p.recharge}.` : '',
      p.spells.length
        ? p.spells
          .filter((g) => Number(g.cost) > 0)
          .map((g) => `${g.name} ${g.cost}`)
          .join(' · ')
        : '',
      p.volatile ? `Spend the last charge: roll ${p.volatile.die}, on a ${p.volatile.on} it is destroyed.` : '',
    ].filter(Boolean).join(' '),
  }));

  // Items whose pool is the whole story keep their per-spell counters out of
  // the list, or the Bell's one-a-day would sit next to a phantom pool.
  const pooled = new Set(chargedItems(creature).map((p) => p.itemName));
  const singles = itemGrantedSpells(creature)
    .filter((g) => g.uses > 0 && !pooled.has(g.itemName))
    .map((g) => ({
      id: g.resourceId,
      label: `${g.name} (${g.itemName})`,
      total: g.uses,
      rest: g.recharge === 'short' ? 'short' : 'long',
      note: g.recharge === 'dawn' ? 'Recharges at dawn.' : undefined,
    }));

  return [...pools, ...singles];
}

/**
 * The spell an item lets you cast, for items that cast one.
 *
 * A Spell Scroll is nothing but its spell — "Spell Scroll (Fireball)" and four
 * lines about crumbling to dust — so a player opening one wants Fireball's
 * range, save and damage, not a reminder that scrolls burn. The same is true
 * of an Enspelled Weapon.
 *
 * `spell_name` is the reliable answer and is stamped on anything the Magic
 * Item Forge builds. Falling back to the name in brackets is what makes the
 * hundreds of already-imported SRD scrolls work without a migration: their
 * names are "Spell Scroll (Fireball)" and that bracket is the only record of
 * which spell they hold.
 */
export function spellOnItem(item) {
  const explicit = String(item?.spell_name || '').trim();
  if (explicit) return explicit;
  const name = String(item?.name || '');
  if (!/scroll|enspelled/i.test(name)) return '';
  const m = name.match(/\(([^)]+)\)\s*$/);
  const inner = (m?.[1] || '').trim();
  if (!inner) return '';
  // "(Fireball)" is a spell; "(1d8)" or "(Longsword)" on some other item is
  // not. Anything that is only digits and dice is rejected.
  if (/^\d+(d\d+)?$/i.test(inner)) return '';
  return inner;
}

/**
 * Every spell an item lets you cast, for the item card.
 *
 * `spellOnItem` answers for a scroll, which holds exactly one. A Staff of
 * Defence holds two at different charge costs, so the card needs the list —
 * and the cost beside each, or "10 charges" tells a player nothing about how
 * many castings that actually is.
 */
export function spellsOnItem(item) {
  const grants = Array.isArray(item?.grants_spells) ? item.grants_spells : [];
  const fromGrants = grants
    .map((g) => ({ name: String(g?.name || '').trim(), cost: Number(g?.cost) || 0 }))
    .filter((g) => g.name);
  if (fromGrants.length) return fromGrants;
  const single = spellOnItem(item);
  return single ? [{ name: single, cost: 0 }] : [];
}
