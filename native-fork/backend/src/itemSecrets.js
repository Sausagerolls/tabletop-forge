// What the GM knows about an item that the party does not.
//
// A cursed sword is only interesting while nobody knows it is cursed, so the
// secret cannot simply be hidden in the interface: a player's client must never
// RECEIVE it. Anything sent to a browser is readable in that browser, and a
// player who opens the network tab is exactly the sort of player who would.
//
// So the text is stripped server-side on the way out, and only stops being
// stripped once the GM marks it discovered. Two fields on an inventory entry:
//
//   gm_secret        the text itself
//   secret_revealed  true once the party has found out
//
// Held on the entry rather than in a table of its own because an item's secret
// belongs to that specific item in that specific pack: handing the sword on
// hands the curse with it, which a join on an id would not do.
//
// A caveat worth stating plainly: this app has no per-route authentication, so
// "is this the GM asking" is a query parameter, exactly as it is for map state.
// It keeps secrets out of the players' clients in normal use; it is not a wall
// against someone deliberately crafting a request.

const SECRET = 'gm_secret';

// AN ITEM THE PLAYER DOES NOT KNOW THEY ARE CARRYING.
//
// `gm_secret` withholds what an item IS; this withholds the item. A tracking
// stone slipped into a pack, a cursed coin, a letter planted by a thief — the
// GM needs the thing to be really there, counted and carried, while the sheet
// that carries it shows no sign of it.
//
// "No sign of it" is the hard part, and it is why this is not a display flag:
//   • the entry never reaches the player's client, so it is not in their DOM,
//     their network tab or their saved sheet;
//   • a player's own write cannot delete it, because their copy never had it
//     (see restoreHidden below) — otherwise equipping a shield would quietly
//     bin the GM's planted item;
//   • an index a player sends is an index into THEIR list, so the server
//     translates it before touching the stored one (see storedIndexFor).
//     Without that, giving away the second of three potions would move the
//     wrong thing, or fail with an error that announces something is amiss.
const HIDDEN = 'gm_hidden';

const isHidden = (item) => !!(item && typeof item === 'object' && item[HIDDEN]);

function parseInventory(inv) {
  if (Array.isArray(inv)) return inv;
  if (typeof inv === 'string') {
    try { const v = JSON.parse(inv); return Array.isArray(v) ? v : []; } catch { return []; }
  }
  return [];
}

/**
 * One item as a player may see it. An unrevealed secret is removed entirely
 * rather than blanked, so its very existence is not advertised — a key named
 * gm_secret sitting there empty would tell the player there is something to
 * find, which is the one thing the GM is trying to avoid.
 */
function visibleItem(item) {
  if (!item || typeof item !== 'object') return item;
  if (item.secret_revealed) return item;
  if (!(SECRET in item)) return item;
  const out = { ...item };
  delete out[SECRET];
  return out;
}

/** A creature row as a player may see it: hidden items gone, secrets stripped. */
function visibleCreature(row) {
  if (!row || typeof row !== 'object') return row;
  const inv = parseInventory(row.inventory);
  if (!inv.length) return row;
  const needsWork = inv.some((it) => isHidden(it)
    || (it && typeof it === 'object' && SECRET in it && !it.secret_revealed));
  if (!needsWork) return row;
  return { ...row, inventory: visibleInventory(inv) };
}

function visibleInventory(inv) {
  return parseInventory(inv).filter((it) => !isHidden(it)).map(visibleItem);
}

/**
 * The index in the STORED pack that a player meant by an index into theirs.
 *
 * A player's list is the stored one with the hidden entries taken out, so the
 * two agree only until the first hidden item. Everything a player can do to a
 * single item — give it away, drop it — arrives as a position in their list,
 * and acting on that position in the stored array would reach past the hidden
 * entry onto the item after it.
 *
 * Returns -1 when the index does not land on anything visible, which the
 * callers already treat as "that item has moved, try again".
 */
function storedIndexFor(storedInv, visibleIndex) {
  const idx = Number(visibleIndex);
  if (!Number.isInteger(idx) || idx < 0) return -1;
  const inv = parseInventory(storedInv);
  let seen = -1;
  for (let i = 0; i < inv.length; i++) {
    if (isHidden(inv[i])) continue;
    seen += 1;
    if (seen === idx) return i;
  }
  return -1;
}

/**
 * Put back the items a writer could not see.
 *
 * A player's sheet holds a pack with the hidden entries missing, and saving it
 * writes the whole array — so without this, the first time a player equipped
 * armour they would silently delete whatever the GM had planted on them, and
 * the GM would have no way of knowing it had gone.
 *
 * Re-inserted at the position they held, so the GM's own view does not shuffle
 * every time a player tidies their pack. `dmWrite` skips all of it: a GM's
 * array is the authority, including the deletion of a hidden item.
 */
function restoreHidden(prevInv, nextInv, dmWrite = false) {
  const next = parseInventory(nextInv);
  if (dmWrite) return next;
  const prev = parseInventory(prevInv);
  const out = [...next];
  prev.forEach((it, i) => {
    if (!isHidden(it)) return;
    out.splice(Math.min(i, out.length), 0, it);
  });
  return out;
}

/**
 * Carry secrets across an inventory written by someone who couldn't see them.
 *
 * A player's sheet holds a censored copy of its own pack, and equipping a shield
 * writes the whole array back — so a straight save would delete the GM's secret
 * from the database, silently, the first time a player put their armour on. The
 * incoming array is therefore treated as the player's view of the pack, and any
 * secret the stored pack had is reattached.
 *
 * Matched on the item's name rather than its position: dropping an item shifts
 * every index after it, and a curse must follow the sword, not the slot. Each
 * stored secret is claimed at most once, so two identical swords with one curse
 * between them stay one curse.
 *
 * `dmWrite` is the GM's case, where the rule has to be narrower: a GM may
 * legitimately DELETE a secret, so their writes cannot simply have it put back.
 * The distinction is whether the key arrived at all — a GM who clears the box
 * sends `gm_secret: ""`, whereas a client that was handed a censored copy has no
 * such key, because the censor removes it. So an absent key means "this writer
 * never had it" and it is restored; an empty one means "the GM cleared it" and
 * it is honoured. Without this, one GM screen that forgot to ask as the DM could
 * wipe every secret in a pack just by saving the sheet.
 */
function mergeSecrets(prevInv, nextInv, dmWrite = false) {
  const next = parseInventory(nextInv);
  const pool = new Map();   // name -> [item, ...] of stored entries holding a secret
  for (const it of parseInventory(prevInv)) {
    if (!it || typeof it !== 'object') continue;
    if (!String(it[SECRET] || '').trim()) continue;
    const key = String(it.name || '').toLowerCase();
    if (!pool.has(key)) pool.set(key, []);
    pool.get(key).push(it);
  }
  if (!pool.size) return next;
  return next.map((it) => {
    if (!it || typeof it !== 'object') return it;
    // A GM's own edits are authoritative, including an emptied box; only a key
    // that never arrived is treated as "this client could not see it".
    if (dmWrite && SECRET in it) return it;
    const bucket = pool.get(String(it.name || '').toLowerCase());
    if (!bucket || !bucket.length) return it;
    const was = bucket.shift();
    // The stored values win outright for a player's write. A revealed secret IS
    // sent to their sheet, so they hold the text and could otherwise write back
    // a changed one — or flip `secret_revealed` — and edit the GM's notes.
    return { ...it, [SECRET]: was[SECRET], secret_revealed: !!was.secret_revealed };
  });
}

/**
 * Does this request get to see secrets?
 *
 * Only an explicit role=dm. Absent or anything else is treated as a player,
 * so a caller that forgets to say gets the safe answer.
 */
function asksAsDm(req) {
  return String(req?.query?.role || '').toLowerCase() === 'dm';
}

module.exports = {
  SECRET, HIDDEN, isHidden,
  visibleItem, visibleCreature, visibleInventory,
  asksAsDm, parseInventory, mergeSecrets, restoreHidden, storedIndexFor,
};
