// make_spell_scroll.js — mint a Spell Scroll for any spell and drop it into a
// character's pack.
//
//   docker compose exec backend node src/make_spell_scroll.js Barney Fireball
//
// The library only carries the generic "Spell Scroll (Nth Level)" rows, so a
// scroll OF something has to be built. The rules here are the same ones the
// Magic Item Forge applies in the GM's browser — rarity and the casting
// numbers both fall out of the spell's level — so a scroll minted from the
// command line is indistinguishable from one made in the UI.
//
// `spell_name` is written onto the item, which is what makes the sheet show
// the spell's full entry when the scroll is opened rather than making the
// player go and look it up.
const db = require('./db');

// Spell Scroll rarity by spell level. Cantrips and 1st are both common.
const SCROLL_RARITY = {
  0: 'common', 1: 'common', 2: 'uncommon', 3: 'uncommon', 4: 'rare',
  5: 'rare', 6: 'very rare', 7: 'very rare', 8: 'very rare', 9: 'legendary',
};

// [save DC, attack bonus] for casting from the scroll — the standard DMG table.
const SCROLL_CASTING = {
  0: [13, 5], 1: [13, 5], 2: [13, 5], 3: [15, 7], 4: [15, 7],
  5: [17, 9], 6: [17, 9], 7: [18, 10], 8: [18, 10], 9: [19, 11],
};

const ordinal = (n) => (n === 0 ? 'a cantrip'
  : `${n}${['th', 'st', 'nd', 'rd'][(n % 100 - n % 10 !== 10) * 1 && n % 10] || 'th'} level`);

function buildScroll(spell) {
  const level = Number(spell.level) || 0;
  const [dc, atk] = SCROLL_CASTING[level] || [13, 5];
  return {
    id: Date.now() + Math.random(),
    item_type: 'item',
    name: `Spell Scroll (${spell.name})`,
    spell_name: spell.name,
    spell_level: level,
    qty: 1,
    rarity: SCROLL_RARITY[level] || 'common',
    attunement_required: false,
    attuned: false,
    equipped: false,
    weight: 0,
    desc: [
      `A spell scroll bearing ${spell.name}, ${ordinal(level)}.`,
      'If the spell is on your class’s spell list you can cast it from the scroll, requiring no material components; the scroll then crumbles to dust.',
      `Otherwise, make a DC ${10 + level} Intelligence (Arcana) check to cast it. On a failure the spell is lost and the scroll is destroyed.`,
      `Casting from the scroll uses spell save DC ${dc} and spell attack bonus +${atk} (standard DMG scroll table).`,
    ].join('\n'),
  };
}

function asArray(raw) {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string' && raw.trim().startsWith('[')) {
    try { return JSON.parse(raw) || []; } catch { return []; }
  }
  return [];
}

async function main() {
  const characterName = (process.argv[2] || '').trim();
  const spellName = process.argv.slice(3).join(' ').trim();
  if (!characterName || !spellName) {
    console.error('Usage: node src/make_spell_scroll.js <CHARACTER_NAME> <SPELL NAME>');
    process.exit(1);
  }

  // Prefer the 2024 printing where a spell exists in both.
  const spell = (await db.query(
    `SELECT * FROM spell_library WHERE LOWER(name)=LOWER($1)
      ORDER BY (edition='2024') DESC, id LIMIT 1`,
    [spellName]
  )).rows[0];
  if (!spell) {
    console.error(`No spell called "${spellName}" in the library.`);
    process.exit(1);
  }

  const c = (await db.query(
    'SELECT id, name, inventory FROM creatures WHERE name=$1 ORDER BY id LIMIT 1',
    [characterName]
  )).rows[0];
  if (!c) { console.error(`No character called ${characterName}.`); process.exit(1); }

  const scroll = buildScroll(spell);
  const pack = asArray(c.inventory);
  // Idempotent by name: running it twice does not hand out two scrolls.
  if (pack.some((i) => String(i?.name || '').toLowerCase() === scroll.name.toLowerCase())) {
    console.log(`${c.name} already has a ${scroll.name}.`);
    return;
  }
  await db.query('UPDATE creatures SET inventory=$1 WHERE id=$2',
    [JSON.stringify([...pack, scroll]), c.id]);
  console.log(`${c.name} (creature ${c.id}) ← ${scroll.name} `
    + `[level ${scroll.spell_level}, ${scroll.rarity}]`);
}

main().then(() => process.exit(0)).catch((err) => {
  console.error('make_spell_scroll failed:', err.message);
  process.exit(1);
});
