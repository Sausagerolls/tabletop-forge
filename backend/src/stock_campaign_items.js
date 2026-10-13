// stock_campaign_items.js — put the campaign's magic items into a session's
// treasure chest and, optionally, straight into a character's pack for testing.
//
//   docker compose exec backend node src/stock_campaign_items.js PAJT82
//   docker compose exec backend node src/stock_campaign_items.js PAJT82 Barney
//
// The second argument is a character NAME; its inventory gets the same items so
// the owner can exercise them on their phone without waiting to be handed them.
//
// Both writes are additive and idempotent by name: run it twice and you get one
// of each, not two. Existing loot and existing packs are left alone.
//
// It reads the rows out of item_library rather than restating them, so whatever
// import_campaign_items.js last wrote is what lands — including the behaviour
// fields (`grants_spells`, `possession_form`) that make the Bell and the Doll
// more than descriptions.
const db = require('./db');

const ITEM_NAMES = [
  'Goblet of Bountiful Potions',
  'Bell of the Unseen Servant',
  'Twinkle Doll',
  'Glaive of Sharpness',
  'Greatsword of Sharpness',
  'Longsword of Sharpness',
  'Scimitar of Sharpness',
  'Shortsword of Sharpness',
  'Staff of Defence',
];

// A library row as an inventory/chest entry. Same shape the GM's treasure
// picker builds, so an item stocked here is indistinguishable from one added
// by hand.
function toEntry(row, i) {
  return {
    id: Date.now() + i + Math.random(),
    item_type: row.item_type || 'item',
    name: row.name || '',
    qty: 1,
    weight: row.weight || '',
    desc: row.description || '',
    equipped: false,
    weapon_range: row.weapon_range || '',
    attack_stat: row.attack_stat || 'STR',
    attack_bonus_misc: Number(row.attack_bonus_misc) || 0,
    damage_bonus_misc: Number(row.damage_bonus_misc) || 0,
    damage_entries: Array.isArray(row.damage_entries) && row.damage_entries.length
      ? row.damage_entries
      : [{ damage: '', damage_type: '' }],
    properties: row.properties || '',
    mastery: row.mastery || '',
    attunement_required: !!row.attunement,
    // Attuned up front for the two items whose behaviour is gated on it —
    // this script exists to let someone TEST them, and an unattuned doll is a
    // cushion.
    attuned: !!row.attunement,
    rarity: row.rarity || '',
    ...(Array.isArray(row.grants_spells) && row.grants_spells.length
      ? { grants_spells: row.grants_spells } : {}),
    ...(String(row.possession_form || '').trim()
      ? { possession_form: row.possession_form } : {}),
    ...(row.charges && Number(row.charges.max) > 0 ? { charges: row.charges } : {}),
    ...(Number(row.ac_bonus) > 0 ? { ac_bonus: row.ac_bonus } : {}),
    ...(String(row.attunement_req || '').trim()
      ? { attunement_req: row.attunement_req } : {}),
  };
}

function asArray(raw) {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string' && raw.trim().startsWith('[')) {
    try { return JSON.parse(raw) || []; } catch { return []; }
  }
  return [];
}

/** Append entries whose names aren't already present. */
function mergeByName(existing, entries) {
  const have = new Set(existing.map((e) => String(e?.name || '').toLowerCase()));
  const added = entries.filter((e) => !have.has(String(e.name).toLowerCase()));
  return { list: [...existing, ...added], added: added.map((e) => e.name) };
}

async function main() {
  const sessionCode = (process.argv[2] || '').trim();
  const characterName = (process.argv[3] || '').trim();
  if (!sessionCode) {
    console.error('Usage: node src/stock_campaign_items.js <SESSION_CODE> [CHARACTER_NAME]');
    process.exit(1);
  }

  const rows = (await db.query(
    `SELECT * FROM item_library WHERE name = ANY($1) AND edition='2024' ORDER BY name`,
    [ITEM_NAMES]
  )).rows;
  if (rows.length !== ITEM_NAMES.length) {
    const found = new Set(rows.map((r) => r.name));
    const missing = ITEM_NAMES.filter((n) => !found.has(n));
    console.warn(`  ! not in the library yet: ${missing.join(', ')}`);
    console.warn('    run import_campaign_items.js first');
  }
  const entries = rows.map(toEntry);

  const sess = (await db.query(
    'SELECT id, treasure_chest FROM sessions WHERE session_code=$1', [sessionCode]
  )).rows[0];
  if (!sess) { console.error(`No session ${sessionCode}.`); process.exit(1); }

  const chest = mergeByName(asArray(sess.treasure_chest), entries);
  await db.query('UPDATE sessions SET treasure_chest=$1 WHERE id=$2',
    [JSON.stringify(chest.list), sess.id]);
  console.log(`Chest ${sessionCode}: ${chest.list.length} item(s)`
    + (chest.added.length ? ` (+${chest.added.length}: ${chest.added.join(', ')})` : ' (nothing new)'));

  if (characterName) {
    const c = (await db.query(
      'SELECT id, name, inventory FROM creatures WHERE name=$1 ORDER BY id LIMIT 1',
      [characterName]
    )).rows[0];
    if (!c) { console.error(`No character called ${characterName}.`); process.exit(1); }
    const pack = mergeByName(asArray(c.inventory), entries);
    await db.query('UPDATE creatures SET inventory=$1 WHERE id=$2',
      [JSON.stringify(pack.list), c.id]);
    console.log(`${c.name} (creature ${c.id}): ${pack.list.length} item(s)`
      + (pack.added.length ? ` (+${pack.added.length})` : ' (nothing new)'));
  }
}

main().then(() => process.exit(0)).catch((err) => {
  console.error('stock_campaign_items failed:', err.message);
  process.exit(1);
});
