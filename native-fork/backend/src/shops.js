// Shops — a GM's stock list, and the haggling over it.
//
// Three things live here: the schema, the money, and the rules for what an
// offer is allowed to do. The socket layer in index.js is a thin wrapper over
// these; everything that decides an outcome is a pure function below so it can
// be tested without a table, a session or a browser.
//
// WHAT A SHOP ITEM IS
//
// The full inventory-shaped item, stored as JSON, exactly as it would sit in a
// character's `inventory`. Not a name and a price — a name and a price is what
// turns a +1 longsword into a line of text the moment somebody buys it. Stock
// carries its damage dice, its properties, its attunement, its light radius,
// and settlement copies that whole object across.
//
// WHAT THE PLAYERS SEE
//
// Shopkeepers lie, and a GM should be able to let them. Each listing carries an
// optional player-facing NAME and DESCRIPTION, and a flag for whether the stats
// are visible at all — so "an old sword, 15gp" can quietly be a +1 longsword,
// and the party finds out when they swing it.
//
// PRICES ARE IN COPPER
//
// Stored as an integer number of copper pieces, everywhere, and converted at
// the edges. Gold as a float is how you end up owing somebody 0.30000000000004
// gold: a 7sp item bought three times has no exact representation in gold, and
// two clients rounding it differently is a disagreement about money.

const CP_PER_SP = 10;
const CP_PER_GP = 100;

// Unlimited stock. A shop that never runs out of rations is a normal shop.
const UNLIMITED = -1;

async function migrate(db) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS shops (
      id SERIAL PRIMARY KEY,
      session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
      name VARCHAR(120) NOT NULL DEFAULT 'Shop',
      blurb TEXT DEFAULT '',
      -- Whether the shop is currently on the players' screens. One at a time
      -- per session: "open the shop" is a thing that happens to the table, not
      -- a per-player state.
      is_open BOOLEAN NOT NULL DEFAULT false,
      -- Whether the party may offer their own price. A fixed-price shop is a
      -- perfectly good shop, and haggling with a temple is odd.
      allow_haggle BOOLEAN NOT NULL DEFAULT true,
      allow_selling BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS shop_items (
      id SERIAL PRIMARY KEY,
      shop_id INTEGER REFERENCES shops(id) ON DELETE CASCADE,
      -- The whole item, in the shape a character's inventory uses.
      item JSONB NOT NULL DEFAULT '{}'::jsonb,
      -- What the party is told it is called, and what they are told about it.
      -- NULL means "use the real ones".
      player_name VARCHAR(160),
      player_desc TEXT,
      show_stats BOOLEAN NOT NULL DEFAULT true,
      price_cp INTEGER NOT NULL DEFAULT 0,
      qty INTEGER NOT NULL DEFAULT 1,
      sort_index INTEGER NOT NULL DEFAULT 0
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS shop_offers (
      id SERIAL PRIMARY KEY,
      shop_id INTEGER REFERENCES shops(id) ON DELETE CASCADE,
      session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
      player_name VARCHAR(255) NOT NULL DEFAULT '',
      creature_id INTEGER,
      -- 'buy'  — the party wants things off the shelf
      -- 'sell' — the party is offering things out of their packs
      kind VARCHAR(8) NOT NULL DEFAULT 'buy',
      -- What is changing hands. Buy lines name a shop_item; sell lines carry
      -- the item itself plus where it sat in the seller's inventory.
      lines JSONB NOT NULL DEFAULT '[]'::jsonb,
      -- What the party proposes, in copper. Null means "at the asking price".
      offer_cp INTEGER,
      note TEXT DEFAULT '',
      status VARCHAR(10) NOT NULL DEFAULT 'pending',
      -- The GM's counter, when they make one.
      counter_cp INTEGER,
      counter_note TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await db.query(`CREATE INDEX IF NOT EXISTS shop_items_shop_idx ON shop_items(shop_id)`);
  await db.query(`CREATE INDEX IF NOT EXISTS shop_offers_session_idx ON shop_offers(session_id, status)`);
}

// ── Money ───────────────────────────────────────────────────────────────────

/** A character's purse, in copper. */
function purseCp(creature) {
  return (Number(creature?.currency_gp) || 0) * CP_PER_GP
       + (Number(creature?.currency_sp) || 0) * CP_PER_SP
       + (Number(creature?.currency_cp) || 0);
}

/**
 * Spread copper back over gold, silver and copper.
 *
 * Biggest coin first, which is how anyone actually carries money — 1,234 cp is
 * 12gp 3sp 4cp, not 1,234 loose coppers.
 */
function splitCp(totalCp) {
  const t = Math.max(0, Math.round(Number(totalCp) || 0));
  const gp = Math.floor(t / CP_PER_GP);
  const sp = Math.floor((t - gp * CP_PER_GP) / CP_PER_SP);
  return { gp, sp, cp: t - gp * CP_PER_GP - sp * CP_PER_SP };
}

/** "12gp 3sp", for a readout. Zero is "free" rather than an empty string. */
function formatCp(totalCp) {
  const n = Math.round(Number(totalCp) || 0);
  if (n <= 0) return 'free';
  const { gp, sp, cp } = splitCp(n);
  return [gp && `${gp}gp`, sp && `${sp}sp`, cp && `${cp}cp`].filter(Boolean).join(' ');
}

/**
 * Parse what a GM typed into copper.
 *
 * Accepts "15", "15gp", "2gp 5sp", "7 sp", "150cp". A bare number is GOLD,
 * because that is what a GM means when they type 15 next to a longsword.
 */
function parsePriceCp(input) {
  if (input === null || input === undefined) return 0;
  if (typeof input === 'number') return Math.max(0, Math.round(input * CP_PER_GP));
  const text = String(input).trim().toLowerCase();
  if (!text) return 0;
  if (/^[\d.]+$/.test(text)) return Math.max(0, Math.round(parseFloat(text) * CP_PER_GP));

  let total = 0;
  let matched = false;
  for (const [, amount, unit] of text.matchAll(/([\d.]+)\s*(gp|sp|cp|gold|silver|copper)/g)) {
    const n = parseFloat(amount);
    if (!Number.isFinite(n)) continue;
    matched = true;
    if (unit.startsWith('g')) total += n * CP_PER_GP;
    else if (unit.startsWith('s')) total += n * CP_PER_SP;
    else total += n;
  }
  return matched ? Math.max(0, Math.round(total)) : 0;
}

/**
 * A price given as an explicit number of COPPER.
 *
 * What the coin fields on both screens send. Kept separate from parsePriceCp
 * because the two answer different questions: this one is told the denomination
 * and has nothing to infer, which is the whole reason the fields replaced a
 * free-text box that had to guess whether "15" meant gold or silver.
 */
function cpFromExplicit(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
}

/**
 * The price a client sent, however it sent it.
 *
 * `cp` (explicit copper, from the coin fields) wins; a free-text `text` is
 * parsed only when no copper figure came through, so an older client — or a
 * tab left open across the deploy — still trades at the price it meant.
 */
function priceFromInput({ cp, text }) {
  if (cp !== null && cp !== undefined && cp !== '') return cpFromExplicit(cp);
  return parsePriceCp(text);
}

// ── What an offer is worth ──────────────────────────────────────────────────

/**
 * The asking price for a set of buy lines.
 *
 * `lines` are { shopItemId, qty }; `stock` is the shop's current rows. A line
 * naming something the shop no longer lists is skipped rather than guessed at.
 */
function askingPriceCp(lines, stock) {
  const byId = new Map((stock || []).map((r) => [Number(r.id), r]));
  let total = 0;
  for (const line of lines || []) {
    const row = byId.get(Number(line.shopItemId));
    if (!row) continue;
    total += Number(row.price_cp || 0) * Math.max(1, Number(line.qty) || 1);
  }
  return total;
}

/**
 * Can the shop fill this order, and is every line real?
 *
 * Returns { ok, error }. Stock of -1 is unlimited; anything else has to cover
 * the quantity asked for, because a shop that sells its last potion twice is
 * worse than one that says no.
 */
function checkStock(lines, stock) {
  const byId = new Map((stock || []).map((r) => [Number(r.id), r]));
  for (const line of lines || []) {
    const row = byId.get(Number(line.shopItemId));
    if (!row) return { ok: false, error: 'That item is no longer in the shop.' };
    const want = Math.max(1, Number(line.qty) || 1);
    if (Number(row.qty) !== UNLIMITED && Number(row.qty) < want) {
      const label = row.player_name || row.item?.name || 'that';
      return { ok: false, error: `Only ${row.qty} × ${label} left.` };
    }
  }
  return { ok: true };
}

/**
 * The items a buy order puts into the character's pack.
 *
 * A quantity of four potions becomes ONE inventory line of qty 4, not four
 * lines — which is the same rule the shop lists them under, and the thing the
 * GM asked for: "Health potion, Qty 4", never "4 Health Potions".
 */
function itemsForBuy(lines, stock) {
  const byId = new Map((stock || []).map((r) => [Number(r.id), r]));
  const out = [];
  for (const line of lines || []) {
    const row = byId.get(Number(line.shopItemId));
    if (!row) continue;
    const item = typeof row.item === 'string' ? JSON.parse(row.item) : (row.item || {});
    out.push({
      ...item,
      // The REAL name goes into the pack. A disguised listing is a thing the
      // shopkeeper said, not a property of the object — once it is bought, the
      // character owns a +1 longsword whatever the sign called it.
      name: item.name || row.player_name || 'Item',
      qty: Math.max(1, Number(line.qty) || 1),
      equipped: false,
    });
  }
  return out;
}

/**
 * Take sold items out of an inventory.
 *
 * Lines carry the index they were at AND the name that was there, and both have
 * to still agree. An index alone is not safe: the party can pick something up,
 * drop something, or be handed loot between proposing a sale and the GM
 * accepting it, and "remove item 3" would then sell the wrong thing.
 *
 * Returns { ok, error, inventory }.
 */
function removeSoldItems(inventory, lines) {
  const inv = Array.isArray(inventory) ? inventory.map((x) => ({ ...x })) : [];
  const drop = [];
  for (const line of lines || []) {
    const i = Number(line.index);
    const row = inv[i];
    if (!row) return { ok: false, error: 'That item is no longer in the pack.' };
    if (String(row.name || '') !== String(line.name || '')) {
      return { ok: false, error: `Their pack changed — ${line.name || 'an item'} is not where it was.` };
    }
    const want = Math.max(1, Number(line.qty) || 1);
    const have = Math.max(1, Number(row.qty) || 1);
    if (want > have) return { ok: false, error: `They only have ${have} × ${row.name}.` };
    drop.push({ i, want, have });
  }
  // Applied after every line has been checked, so a bad line cannot leave the
  // pack half-emptied. Highest index first, so removing one does not shift the
  // next one out from under us.
  for (const { i, want, have } of drop.sort((a, b) => b.i - a.i)) {
    if (want >= have) inv.splice(i, 1);
    else inv[i] = { ...inv[i], qty: have - want };
  }
  return { ok: true, inventory: inv };
}

/**
 * What the table actually agreed, in copper.
 *
 * A countered offer the player accepted settles at the COUNTER. An offer the GM
 * accepted outright settles at what the player proposed. An offer with no
 * proposal settles at the asking price. Written down here rather than decided
 * at each call site, because "which number did we agree on" is the one thing
 * both sides have to answer identically.
 */
function agreedCp(offer, askingCp) {
  if (offer?.counter_cp !== null && offer?.counter_cp !== undefined) return Number(offer.counter_cp);
  if (offer?.offer_cp !== null && offer?.offer_cp !== undefined) return Number(offer.offer_cp);
  return Number(askingCp) || 0;
}

/** Stock left after a buy order settles. -1 stays -1. */
function stockAfter(lines, stock) {
  const byId = new Map((stock || []).map((r) => [Number(r.id), r]));
  const out = [];
  for (const line of lines || []) {
    const row = byId.get(Number(line.shopItemId));
    if (!row || Number(row.qty) === UNLIMITED) continue;
    const want = Math.max(1, Number(line.qty) || 1);
    out.push({ id: Number(row.id), qty: Math.max(0, Number(row.qty) - want) });
  }
  return out;
}

module.exports = {
  migrate,
  CP_PER_SP, CP_PER_GP, UNLIMITED,
  purseCp, splitCp, formatCp, parsePriceCp, cpFromExplicit, priceFromInput,
  askingPriceCp, checkStock, itemsForBuy, removeSoldItems, agreedCp, stockAfter,
};
