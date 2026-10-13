// import_campaign_items.js — the campaign's own magic items.
//
// Four items handed out at the table, plus the four base-weapon forms the
// Sword of Sharpness can take. They live in item_library like everything else,
// so the GM's treasure picker finds them by name and a copy handed to a player
// carries its own stats.
//
// Idempotent (UPSERT on (name, edition)). Run it as often as you like:
//   docker compose exec backend node src/import_campaign_items.js
//
// The Sword of Sharpness is the 2024 DMG entry (XDMG p.314), which is a magic
// VARIANT rather than an item: the book lists four base weapons it can be made
// from, so it lands here as four rows named the way 5eTools names them
// ("<base> of Sharpness"). Base weapon stats are the 2024 PHB ones.
const crypto = require('crypto');
const db = require('./db');

function deterministicId(slug) {
  const h = crypto.createHash('sha1').update(`campaign-item:${slug}`).digest('hex');
  return [h.slice(0, 8), h.slice(8, 12), h.slice(12, 16), h.slice(16, 20), h.slice(20, 32)].join('-');
}

// The Sword of Sharpness's rules text, shared by all four base weapons.
const SHARPNESS_TEXT = [
  'When you attack an object with this magic weapon and hit, maximise your weapon damage dice against the target.',
  'When you attack a creature with this weapon and roll a 20 on the d20 for the attack roll, that target takes an extra 14 Slashing damage and gains 1 Exhaustion level.',
].join('\n\n');

// The crit rider, as a conditional damage entry. `condition` keeps it off the
// ordinary attack lines — it is damage that lands only on a natural 20, and a
// plain damage row would have put it on every swing.
const SHARPNESS_RIDER = {
  damage: '14',
  damage_type: 'slashing',
  condition: 'on a 20 on the d20 for the attack roll (target also gains 1 Exhaustion level)',
};

// name, damage, damage type, weight, cost, properties, mastery
//
// The first four are the base weapons XDMG p.314 lists. The Shortsword is a
// house addition: the book does not offer it (the variant wants a Slashing
// sword and a shortsword is Piercing), so its own damage stays Piercing while
// the sharpness rider remains 14 Slashing, exactly as the item text reads.
const SHARPNESS_BASES = [
  ['Glaive',     '1d10', 'slashing', 6, '20 GP', 'Heavy, Reach, Two-Handed', 'Graze'],
  ['Greatsword', '2d6',  'slashing', 6, '50 GP', 'Heavy, Two-Handed',        'Graze'],
  ['Longsword',  '1d8',  'slashing', 3, '15 GP', 'Versatile (1d10)',         'Sap'],
  ['Scimitar',   '1d6',  'slashing', 3, '25 GP', 'Finesse, Light',           'Nick'],
  ['Shortsword', '1d6',  'piercing', 2, '10 GP', 'Finesse, Light',           'Vex'],
];

const ITEMS = [
  {
    name: 'Goblet of Bountiful Potions',
    item_type: 'magic_item',
    rarity: 'rare',
    source: 'Homebrew',
    weight: 1,
    description:
      'Pour a potion into this goblet and drink from it. If you leave a little of the potion '
      + 'in the goblet, it refills with that potion at dawn.\n\n'
      + 'The rim is worn smooth by generations of careful sippers.',
  },
  {
    name: 'Bell of the Unseen Servant',
    item_type: 'magic_item',
    rarity: 'uncommon',
    source: 'Homebrew',
    weight: 1,
    description:
      'While holding this small silver bell, you can ring it to cast Unseen Servant without '
      + 'expending a spell slot or using any components.\n\n'
      + "Once used, this property can't be used again until the next dawn.\n\n"
      + 'Its chime is heard only by the one who rings it, and by whoever answers.',
    // Held, not attuned — the card says "while holding this small silver bell".
    grants_spells: [{ name: 'Unseen Servant', level: 1, requires: 'held', uses: 1, recharge: 'dawn' }],
  },
  {
    name: 'Twinkle Doll',
    item_type: 'magic_item',
    rarity: 'rare',
    source: 'Homebrew',
    weight: 1,
    attunement: true,
    description:
      'While attuned to this plush doll, you can take a Magic action to possess it. While you do, '
      + 'your body falls catatonic and the doll uses these statistics, with your own Intelligence '
      + 'and Wisdom:\n\n'
      + 'STR 4 (-3), DEX 16 (+3), CON 10 (+0), INT yours, WIS yours, CHA 10 (+0), HP 2.\n\n'
      + 'It has blindsight 30 ft. and cannot speak. While possessing it, you have Expertise in '
      + 'Stealth. It is immune to psychic and poison damage and to the blinded, deafened, '
      + 'paralysed, poisoned and petrified conditions.\n\n'
      + 'You can end the possession at any time, leaving the doll where it is.\n\n'
      + 'If the doll drops to 0 hit points, it crumbles to dust. If you are still possessing it, '
      + 'make a DC 15 Dexterity saving throw. On a failure, you take 2d6 psychic damage as you '
      + 'are forced back into your body.',
    // Wired to the possession form by name; the form itself is a creature row
    // created by the same script so the doll has a real stat block to wear.
    possession_form: 'Twinkle Doll',
  },
  {
    name: 'Staff of Defence',
    item_type: 'weapon',
    rarity: 'rare',
    source: 'Homebrew',
    weight: 4,
    attunement: true,
    attunement_req: 'by a Bard, Sorcerer, Warlock or Wizard',
    properties: 'Versatile (1d8)',
    attack_stat: 'STR',
    ac_bonus: 1,
    damage_entries: [
      { damage: '1d6', damage_type: 'bludgeoning' },
      { damage: '1d8', damage_type: 'bludgeoning', note: 'versatile' },
    ],
    description:
      'While equipped you gain a +1 bonus to your Armour Class.\n\n'
      + 'The staff has 10 charges. While holding it you can expend the requisite number of '
      + 'charges to cast one of the following spells: Mage Armor (1 charge) or Shield (2 charges).\n\n'
      + 'The staff regains 1d6+4 charges daily at dawn. If you expend the staff\'s last charge, '
      + 'roll a d20. On a 1 the staff shatters and is destroyed.',
    // One pool of ten, spent at different rates by the two spells — which is
    // why this is `charges` on the item rather than `uses` on each spell.
    charges: {
      max: 10,
      recharge: 'dawn',
      regain: '1d6+4',
      volatile: { die: 'd20', on: 1 },
    },
    grants_spells: [
      { name: 'Mage Armor', level: 1, cost: 1, requires: 'attuned' },
      { name: 'Shield', level: 1, cost: 2, requires: 'attuned' },
    ],
  },
  ...SHARPNESS_BASES.map(([base, dmg, dmgType, weight, cost, properties, mastery]) => ({
    name: `${base} of Sharpness`,
    item_type: 'weapon',
    rarity: 'very rare',
    source: 'DMG 2024 p.314',
    weight,
    cost,
    attunement: true,
    properties,
    mastery,
    attack_stat: /Finesse/i.test(properties) ? 'DEX' : 'STR',
    description: SHARPNESS_TEXT,
    damage_entries: [
      { damage: dmg, damage_type: dmgType },
      // A versatile weapon's two-handed line, so the sheet offers both swings.
      ...(base === 'Longsword' ? [{ damage: '1d10', damage_type: 'slashing', note: 'versatile' }] : []),
      SHARPNESS_RIDER,
    ],
  })),
];

async function upsert(item) {
  const slug = item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  await db.query(
    `INSERT INTO item_library (
       id, name, item_type, description, source, edition, weight, cost,
       damage_entries, weapon_range, attack_stat, attack_bonus_misc, properties, mastery,
       ac_base, armor_category, str_req, stealth_disadvantage,
       ac_bonus, attunement, attunement_req, rarity
     ) VALUES ($1,$2,$3,$4,$5,'2024',$6,$7,$8,'',$9,0,$10,$11,0,'',NULL,false,0,$12,'',$13)
     ON CONFLICT (name, edition) DO UPDATE SET
       item_type=EXCLUDED.item_type, description=EXCLUDED.description,
       source=EXCLUDED.source, weight=EXCLUDED.weight, cost=EXCLUDED.cost,
       damage_entries=EXCLUDED.damage_entries, attack_stat=EXCLUDED.attack_stat,
       properties=EXCLUDED.properties, mastery=EXCLUDED.mastery,
       attunement=EXCLUDED.attunement, rarity=EXCLUDED.rarity`,
    [
      deterministicId(slug), item.name, item.item_type, item.description || '',
      item.source || '', item.weight || 0, item.cost || '',
      JSON.stringify(item.damage_entries || []),
      item.attack_stat || 'STR', item.properties || '', item.mastery || '',
      !!item.attunement, item.rarity || '',
    ]
  );
  // The behavioural fields have no column in the INSERT above — they are read
  // off the row by the sheet — so they ride in a follow-up update.
  if (item.grants_spells || item.possession_form || item.charges) {
    await db.query(
      `UPDATE item_library
          SET grants_spells=$1, possession_form=$2, charges=$3, ac_bonus=$4, attunement_req=$5
        WHERE name=$6 AND edition='2024'`,
      [
        JSON.stringify(item.grants_spells || []), item.possession_form || '',
        item.charges ? JSON.stringify(item.charges) : null,
        Number(item.ac_bonus) || 0, item.attunement_req || '', item.name,
      ]
    );
  }
}

// The Twinkle Doll's stat block, as a creature row.
//
// A possessing character wears this the way a druid wears a beast, so the form
// has to be a real creature: the transform machinery swaps the token's
// creature_id for it and the sheet reads the numbers off the row.
//
// Intelligence and Wisdom are deliberately left at 10 here. The card says the
// doll uses YOUR Intelligence and Wisdom, and those come from the possessing
// character at display time — a fixed value on this row would be wrong for
// every character that picks it up.
const DOLL_FORM = {
  name: 'Twinkle Doll',
  size: 'Tiny',
  creature_type: 'Construct',
  armor_class: 13,
  hit_points: 2,
  strength: 4, dexterity: 16, constitution: 10,
  intelligence: 10, wisdom: 10, charisma: 10,
  speed_walk: 20,
  damage_immunities: 'poison, psychic',
  condition_immunities: 'blinded, deafened, paralysed, poisoned, petrified',
  senses: [{ type: 'blindsight', range: 30 }],
  languages: '',
  challenge_rating: '0',
  skill_stealth: 3,
  special_abilities: [
    {
      name: 'Possessed',
      desc: 'The doll uses the possessing creature\'s Intelligence and Wisdom, and grants '
        + 'Expertise in Stealth. It cannot speak.',
    },
    {
      name: 'Crumble',
      desc: 'If the doll drops to 0 hit points, it crumbles to dust. A possessing creature '
        + 'must make a DC 15 Dexterity saving throw, taking 2d6 psychic damage on a failure '
        + 'as it is forced back into its body.',
    },
  ],
};

async function upsertDollForm() {
  const existing = await db.query(
    "SELECT id FROM creatures WHERE name=$1 AND (is_player_character IS NOT TRUE) ORDER BY id LIMIT 1",
    [DOLL_FORM.name]
  );
  const cols = Object.keys(DOLL_FORM);
  const vals = cols.map((k) => {
    const v = DOLL_FORM[k];
    return (v !== null && typeof v === 'object') ? JSON.stringify(v) : v;
  });
  if (existing.rows.length) {
    const sets = cols.map((c, i) => `${c}=$${i + 1}`).join(', ');
    await db.query(`UPDATE creatures SET ${sets} WHERE id=$${cols.length + 1}`,
      [...vals, existing.rows[0].id]);
    return existing.rows[0].id;
  }
  const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
  const r = await db.query(
    `INSERT INTO creatures (${cols.join(', ')}) VALUES (${placeholders}) RETURNING id`, vals);
  return r.rows[0].id;
}

async function main() {
  for (const item of ITEMS) {
    await upsert(item);
    console.log(`  ✓ ${item.name}`);
  }
  const dollId = await upsertDollForm();
  console.log(`  ✓ ${DOLL_FORM.name} stat block (creature ${dollId})`);
  console.log(`Imported ${ITEMS.length} campaign items.`);
}

if (require.main === module) {
  main().then(() => process.exit(0)).catch((err) => {
    console.error('import_campaign_items failed:', err.message);
    process.exit(1);
  });
}

module.exports = { ITEMS, SHARPNESS_RIDER, DOLL_FORM };
