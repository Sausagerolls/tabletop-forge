// import_srd_2024_items.js — pulls 2024 SRD equipment and magic items
// into the item_library table. Two sources:
//
//   1. Equipment chapter (p.91-92 of SRD 5.2.1) is hardcoded here as
//      the table is short (~50 rows) and we want every column right —
//      mastery, properties, stealth disadvantage, STR requirement.
//   2. Magic Items chapter (p.204-253) is parsed out of the PDF by
//      parseSrd2024Items.py — far too many to hand-key.
//
// Idempotent (UPSERT on (name, edition='2024')). Run inside the backend
// container after the migration has applied:
//   docker exec dnd-vtt-backend-1 node /app/src/import_srd_2024_items.js
const fs = require('fs');
const crypto = require('crypto');
const db = require('./db');
const {
  WEAPON_DESCRIPTIONS,
  ARMOR_DESCRIPTIONS,
  splitPlusN,
  generateMundaneAmmo,
  generateAmmoMagicVariants,
  generateWeaponMagicVariants,
  deriveWeaponRange,
} = require('./srdItemHelpers');

// JSON produced by parseSrd2024Items.py on the host.
// (The backend container has no Python, so we read pre-parsed output.)
const MAGIC_JSON_PATH = process.env.SRD2024_ITEMS_JSON || '/tmp/srd2024_items.json';

// ── 2024 SRD weapons table (p.91) ────────────────────────────────
const WEAPONS_2024 = [
  // Simple Melee
  ['Club',          '1d4', 'bludgeoning', 'Light',                                         'Slow',   2,    '1 SP',  'STR'],
  ['Dagger',        '1d4', 'piercing',    'Finesse, Light, Thrown (Range 20/60)',          'Nick',   1,    '2 GP',  'DEX'],
  ['Greatclub',     '1d8', 'bludgeoning', 'Two-Handed',                                    'Push',   10,   '2 SP',  'STR'],
  ['Handaxe',       '1d6', 'slashing',    'Light, Thrown (Range 20/60)',                   'Vex',    2,    '5 GP',  'STR'],
  ['Javelin',       '1d6', 'piercing',    'Thrown (Range 30/120)',                         'Slow',   2,    '5 SP',  'STR'],
  ['Light Hammer',  '1d4', 'bludgeoning', 'Light, Thrown (Range 20/60)',                   'Nick',   2,    '2 GP',  'STR'],
  ['Mace',          '1d6', 'bludgeoning', '',                                              'Sap',    4,    '5 GP',  'STR'],
  ['Quarterstaff',  '1d6', 'bludgeoning', 'Versatile (1d8)',                               'Topple', 4,    '2 SP',  'STR'],
  ['Sickle',        '1d4', 'slashing',    'Light',                                         'Nick',   2,    '1 GP',  'STR'],
  ['Spear',         '1d6', 'piercing',    'Thrown (Range 20/60), Versatile (1d8)',         'Sap',    3,    '1 GP',  'STR'],
  // Simple Ranged
  ['Dart',          '1d4', 'piercing',    'Finesse, Thrown (Range 20/60)',                 'Vex',    0.25, '5 CP',  'DEX'],
  ['Light Crossbow','1d8', 'piercing',    'Ammunition (Range 80/320; Bolt), Loading, Two-Handed', 'Slow', 5, '25 GP', 'DEX'],
  ['Shortbow',      '1d6', 'piercing',    'Ammunition (Range 80/320; Arrow), Two-Handed',  'Vex',    2,    '25 GP', 'DEX'],
  ['Sling',         '1d4', 'bludgeoning', 'Ammunition (Range 30/120; Bullet)',             'Slow',   0,    '1 SP',  'DEX'],
  // Martial Melee
  ['Battleaxe',     '1d8', 'slashing',    'Versatile (1d10)',                              'Topple', 4,    '10 GP', 'STR'],
  ['Flail',         '1d8', 'bludgeoning', '',                                              'Sap',    2,    '10 GP', 'STR'],
  ['Glaive',        '1d10','slashing',    'Heavy, Reach, Two-Handed',                      'Graze',  6,    '20 GP', 'STR'],
  ['Greataxe',      '1d12','slashing',    'Heavy, Two-Handed',                             'Cleave', 7,    '30 GP', 'STR'],
  ['Greatsword',    '2d6', 'slashing',    'Heavy, Two-Handed',                             'Graze',  6,    '50 GP', 'STR'],
  ['Halberd',       '1d10','slashing',    'Heavy, Reach, Two-Handed',                      'Cleave', 6,    '20 GP', 'STR'],
  ['Lance',         '1d10','piercing',    'Heavy, Reach, Two-Handed (unless mounted)',     'Topple', 6,    '10 GP', 'STR'],
  ['Longsword',     '1d8', 'slashing',    'Versatile (1d10)',                              'Sap',    3,    '15 GP', 'STR'],
  ['Maul',          '2d6', 'bludgeoning', 'Heavy, Two-Handed',                             'Topple', 10,   '10 GP', 'STR'],
  ['Morningstar',   '1d8', 'piercing',    '',                                              'Sap',    4,    '15 GP', 'STR'],
  ['Pike',          '1d10','piercing',    'Heavy, Reach, Two-Handed',                      'Push',   18,   '5 GP',  'STR'],
  ['Rapier',        '1d8', 'piercing',    'Finesse',                                       'Vex',    2,    '25 GP', 'DEX'],
  ['Scimitar',      '1d6', 'slashing',    'Finesse, Light',                                'Nick',   3,    '25 GP', 'DEX'],
  ['Shortsword',    '1d6', 'piercing',    'Finesse, Light',                                'Vex',    2,    '10 GP', 'DEX'],
  ['Trident',       '1d8', 'piercing',    'Thrown (Range 20/60), Versatile (1d10)',        'Topple', 4,    '5 GP',  'STR'],
  ['Warhammer',     '1d8', 'bludgeoning', 'Versatile (1d10)',                              'Push',   5,    '15 GP', 'STR'],
  ['War Pick',      '1d8', 'piercing',    'Versatile (1d10)',                              'Sap',    2,    '5 GP',  'STR'],
  ['Whip',          '1d4', 'slashing',    'Finesse, Reach',                                'Slow',   3,    '2 GP',  'DEX'],
  // Martial Ranged
  ['Blowgun',       '1',   'piercing',    'Ammunition (Range 25/100; Needle), Loading',    'Vex',    1,    '10 GP', 'DEX'],
  ['Hand Crossbow', '1d6', 'piercing',    'Ammunition (Range 30/120; Bolt), Light, Loading','Vex',   3,    '75 GP', 'DEX'],
  ['Heavy Crossbow','1d10','piercing',    'Ammunition (Range 100/400; Bolt), Heavy, Loading, Two-Handed', 'Push', 18, '50 GP', 'DEX'],
  ['Longbow',       '1d8', 'piercing',    'Ammunition (Range 150/600; Arrow), Heavy, Two-Handed', 'Slow', 2, '50 GP', 'DEX'],
  ['Musket',        '1d12','piercing',    'Ammunition (Range 40/120; Bullet), Loading, Two-Handed','Slow', 10, '500 GP','DEX'],
  ['Pistol',        '1d10','piercing',    'Ammunition (Range 30/90; Bullet), Loading',     'Vex',    3,    '250 GP','DEX'],
];

// ── 2024 SRD armor table (p.92) ──────────────────────────────────
const ARMOR_2024 = [
  // [name, base_ac, category, str_req, stealth_disadv, weight, cost]
  ['Padded Armor',         11, 'light',  null, true,  8,  '5 GP'],
  ['Leather Armor',        11, 'light',  null, false, 10, '10 GP'],
  ['Studded Leather Armor',12, 'light',  null, false, 13, '45 GP'],
  ['Hide Armor',           12, 'medium', null, false, 12, '10 GP'],
  ['Chain Shirt',          13, 'medium', null, false, 20, '50 GP'],
  ['Scale Mail',           14, 'medium', null, true,  45, '50 GP'],
  ['Breastplate',          14, 'medium', null, false, 20, '400 GP'],
  ['Half Plate Armor',     15, 'medium', null, true,  40, '750 GP'],
  ['Ring Mail',            14, 'heavy',  null, true,  40, '30 GP'],
  ['Chain Mail',           16, 'heavy',  13,   true,  55, '75 GP'],
  ['Splint Armor',         17, 'heavy',  15,   true,  60, '200 GP'],
  ['Plate Armor',          18, 'heavy',  15,   true,  65, '1500 GP'],
  ['Shield',               0,  'shield', null, false, 6,  '10 GP'],
];

function deterministicId(slug) {
  const h = crypto.createHash('sha1').update(`srd2024:item:${slug}`).digest('hex');
  return [
    h.slice(0, 8), h.slice(8, 12),
    '5' + h.slice(13, 16),
    ((parseInt(h.slice(16, 17), 16) & 0x3) | 0x8).toString(16) + h.slice(17, 20),
    h.slice(20, 32),
  ].join('-');
}

async function upsertItem(item) {
  const slug = item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const id = deterministicId(slug);
  await db.query(
    `INSERT INTO item_library (
       id, name, item_type, description, source, edition,
       weight, cost,
       damage_entries, weapon_range, attack_stat, attack_bonus_misc, properties, mastery,
       ac_base, armor_category, str_req, stealth_disadvantage,
       ac_bonus, attunement, attunement_req, rarity
     ) VALUES (
       $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22
     )
     ON CONFLICT (name, edition) DO UPDATE SET
       item_type=EXCLUDED.item_type, description=EXCLUDED.description,
       source=EXCLUDED.source, weight=EXCLUDED.weight, cost=EXCLUDED.cost,
       damage_entries=EXCLUDED.damage_entries, weapon_range=EXCLUDED.weapon_range,
       attack_stat=EXCLUDED.attack_stat, attack_bonus_misc=EXCLUDED.attack_bonus_misc,
       properties=EXCLUDED.properties, mastery=EXCLUDED.mastery,
       ac_base=EXCLUDED.ac_base, armor_category=EXCLUDED.armor_category,
       str_req=EXCLUDED.str_req, stealth_disadvantage=EXCLUDED.stealth_disadvantage,
       ac_bonus=EXCLUDED.ac_bonus, attunement=EXCLUDED.attunement,
       attunement_req=EXCLUDED.attunement_req, rarity=EXCLUDED.rarity`,
    [
      id, item.name, item.item_type, item.description || '', item.source || '',
      '2024',
      item.weight || 0, item.cost || '',
      JSON.stringify(item.damage_entries || []),
      item.weapon_range || '', item.attack_stat || 'STR',
      item.attack_bonus_misc || 0, item.properties || '', item.mastery || '',
      item.ac_base || 0, item.armor_category || '',
      item.str_req ?? null, !!item.stealth_disadvantage,
      item.ac_bonus || 0, !!item.attunement,
      item.attunement_req || '', item.rarity || '',
    ]
  );
}

async function main() {
  console.log('Importing 2024 SRD weapons…');
  // Build the canonical weapon rows once so we can reuse them as the
  // base for the +1/+2/+3 magical fan-out below.
  const weaponRows = WEAPONS_2024.map((w) => {
    const [name, dmg, dtype, props, mastery, weight, cost, atk] = w;
    return {
      name,
      item_type: 'weapon',
      description: WEAPON_DESCRIPTIONS[name] || '',
      source: 'SRD 5.2.1 (2024)',
      weight, cost,
      damage_entries: [{ damage: dmg, damage_type: dtype }],
      weapon_range: deriveWeaponRange(props),
      attack_stat: atk,
      properties: props,
      mastery,
    };
  });
  for (const row of weaponRows) await upsertItem(row);
  console.log(`  ${weaponRows.length} weapons`);

  console.log('Generating magical weapon variants (+1/+2/+3)…');
  const weaponMagic = generateWeaponMagicVariants(weaponRows, '2024');
  for (const row of weaponMagic) await upsertItem(row);
  console.log(`  ${weaponMagic.length} magical weapon variants`);

  console.log('Importing 2024 mundane ammunition…');
  const mundaneAmmo = generateMundaneAmmo('2024');
  for (const row of mundaneAmmo) await upsertItem(row);
  console.log(`  ${mundaneAmmo.length} mundane ammunition`);

  console.log('Generating magical ammunition (+1/+2/+3 per type)…');
  const ammoMagic = generateAmmoMagicVariants('2024');
  for (const row of ammoMagic) await upsertItem(row);
  console.log(`  ${ammoMagic.length} magical ammunition`);

  console.log('Importing 2024 SRD armor…');
  for (const a of ARMOR_2024) {
    const [name, ac_base, category, str_req, stealth, weight, cost] = a;
    await upsertItem({
      name,
      item_type: 'armor',
      description: ARMOR_DESCRIPTIONS[name] || '',
      source: 'SRD 5.2.1 (2024)',
      weight, cost,
      ac_base, armor_category: category,
      str_req, stealth_disadvantage: stealth,
    });
  }
  console.log(`  ${ARMOR_2024.length} armor`);

  console.log('Loading 2024 SRD magic items…');
  if (!fs.existsSync(MAGIC_JSON_PATH)) {
    console.error(`Missing ${MAGIC_JSON_PATH}. Run on host first:\n  python3 backend/src/parseSrd2024Items.py /tmp/SRD_CC_v5.2.1.pdf > /tmp/srd2024_items.json`);
    process.exit(1);
  }
  const magic = JSON.parse(fs.readFileSync(MAGIC_JSON_PATH, 'utf8'));
  let magicCount = 0;
  for (const m of magic) {
    const base = {
      name: m.name,
      item_type: 'magic_item',
      description: m.description || '',
      source: 'SRD 5.2.1 (2024)',
      rarity: (m.rarity || '').toLowerCase().match(/(common|uncommon|very rare|rare|legendary|artifact)/)?.[1] || '',
      attunement: !!m.attunement,
      attunement_req: m.attunement_req || '',
    };
    // Combined "Armor, +1, +2, or +3" rows split into three discrete
    // entries so the inventory editor sees one rarity per item.
    for (const variant of splitPlusN(base)) {
      await upsertItem(variant);
      magicCount++;
    }
  }
  console.log(`  ${magicCount} magic items`);
  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });
