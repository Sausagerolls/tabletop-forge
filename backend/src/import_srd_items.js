// import_srd_items.js — 2014 SRD equipment + magic items via Open5e.
// Three endpoints: /v1/armor, /v1/weapons, /v1/magicitems all
// filtered by document__slug=wotc-srd.
//
//   18 armors  +  37 weapons  +  237 magic items  ≈  292 rows
//
// Idempotent — UPSERT keyed by (name, edition). Runs in the backend
// container the same way import_srd_spells.js does:
//   docker exec dnd-vtt-backend-1 node /app/src/import_srd_items.js
const db = require('./db');
const crypto = require('crypto');
const {
  WEAPON_DESCRIPTIONS,
  ARMOR_DESCRIPTIONS,
  splitPlusN,
  isRealArmorRow,
  generateMundaneAmmo,
  generateAmmoMagicVariants,
  generateWeaponMagicVariants,
  deriveWeaponRange,
} = require('./srdItemHelpers');

const UA = { 'User-Agent': 'TableTopForge/1.0 srd-items-import' };

function deterministicId(slug) {
  const h = crypto.createHash('sha1').update(`open5e:wotc-srd:item:${slug}`).digest('hex');
  return [
    h.slice(0, 8), h.slice(8, 12),
    '5' + h.slice(13, 16),
    ((parseInt(h.slice(16, 17), 16) & 0x3) | 0x8).toString(16) + h.slice(17, 20),
    h.slice(20, 32),
  ].join('-');
}

async function fetchAll(url) {
  const all = [];
  let next = url;
  while (next) {
    const res = await fetch(next, { headers: UA });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${next}`);
    const page = await res.json();
    for (const r of (page.results || [])) all.push(r);
    next = page.next;
  }
  return all;
}

function categorise(typeStr) {
  const t = String(typeStr || '').toLowerCase();
  if (t.includes('light')) return 'light';
  if (t.includes('medium')) return 'medium';
  if (t.includes('heavy')) return 'heavy';
  if (t.includes('shield')) return 'shield';
  return '';
}

async function upsertItem(item) {
  const id = deterministicId(item.slug || item.name);
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
      '2014',
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
  console.log('Fetching 2014 SRD armor…');
  const armor = await fetchAll('https://api.open5e.com/v1/armor/?document__slug=wotc-srd&limit=200');
  // Skip class features (Draconic Resilience, Unarmored Defense),
  // the Mage Armor spell, and the "Unarmored" pseudo-row that
  // Open5e tags as armor — none are real items.
  const armorClean = armor.filter(a => isRealArmorRow(a.category));
  for (const a of armorClean) {
    await upsertItem({
      name: a.name,
      slug: a.slug,
      item_type: 'armor',
      description: a.notes || ARMOR_DESCRIPTIONS[a.name] || '',
      source: 'SRD 5.1 (2014)',
      weight: parseFloat(a.weight) || 0,
      cost: a.cost || '',
      ac_base: parseInt(String(a.base_ac ?? '').replace(/[^\d]/g, ''), 10) || 0,
      armor_category: categorise(a.category || a.notes || ''),
      str_req: parseInt(a.strength_requirement, 10) || null,
      stealth_disadvantage: !!a.stealth_disadvantage,
    });
  }
  console.log(`  ${armorClean.length} armor (skipped ${armor.length - armorClean.length} non-items)`);

  console.log('Fetching 2014 SRD weapons…');
  const weapons = await fetchAll('https://api.open5e.com/v1/weapons/?document__slug=wotc-srd&limit=200');
  // Build canonical rows once so the same data feeds the +1/+2/+3 fan-out.
  // Open5e doesn't carry an attack-stat field, so derive it from the
  // weapon's properties per the 5.1 rules: Finesse always wins (so a
  // dagger thrown by a rogue still uses DEX), then any ranged weapon
  // (Ammunition keyword) uses DEX, and everything else falls back to
  // STR. This matches what the 2024 catalog hardcodes.
  const weaponRows = weapons.map((w) => {
    const props = Array.isArray(w.properties) ? w.properties.join(', ') : (w.properties || '');
    const propsLow = props.toLowerCase();
    let attack_stat = 'STR';
    if (/\bfinesse\b/.test(propsLow)) attack_stat = 'DEX';
    else if (/\bammunition\b/.test(propsLow)) attack_stat = 'DEX';
    return {
      name: w.name,
      slug: w.slug,
      item_type: 'weapon',
      description: w.description || WEAPON_DESCRIPTIONS[w.name] || '',
      source: 'SRD 5.1 (2014)',
      weight: parseFloat(w.weight) || 0,
      cost: w.cost || '',
      damage_entries: w.damage_dice
        ? [{ damage: w.damage_dice, damage_type: w.damage_type || '' }]
        : [],
      weapon_range: deriveWeaponRange(props),
      properties: props,
      attack_stat,
    };
  });
  for (const row of weaponRows) await upsertItem(row);
  console.log(`  ${weaponRows.length} weapons`);

  console.log('Generating magical weapon variants (+1/+2/+3)…');
  const weaponMagic = generateWeaponMagicVariants(weaponRows, '2014');
  for (const row of weaponMagic) await upsertItem(row);
  console.log(`  ${weaponMagic.length} magical weapon variants`);

  console.log('Importing 2014 mundane ammunition…');
  const mundaneAmmo = generateMundaneAmmo('2014');
  for (const row of mundaneAmmo) await upsertItem(row);
  console.log(`  ${mundaneAmmo.length} mundane ammunition`);

  console.log('Generating magical ammunition (+1/+2/+3 per type)…');
  const ammoMagic = generateAmmoMagicVariants('2014');
  for (const row of ammoMagic) await upsertItem(row);
  console.log(`  ${ammoMagic.length} magical ammunition`);

  console.log('Fetching 2014 SRD magic items…');
  const magic = await fetchAll('https://api.open5e.com/v1/magicitems/?document__slug=wotc-srd&limit=300');
  let magicCount = 0;
  for (const m of magic) {
    const base = {
      name: m.name,
      slug: m.slug,
      item_type: 'magic_item',
      description: m.desc || '',
      source: 'SRD 5.1 (2014)',
      rarity: (m.rarity || '').toLowerCase().match(/(common|uncommon|very rare|rare|legendary|artifact)/)?.[1] || '',
      attunement: !!(m.requires_attunement && String(m.requires_attunement).toLowerCase().startsWith('requires')),
      attunement_req: m.requires_attunement || '',
    };
    // Items like "Weapon, +1, +2, or +3" expand to three separate
    // rows so each one carries its own rarity + numeric bonus.
    for (const variant of splitPlusN(base)) {
      await upsertItem(variant);
      magicCount++;
    }
  }

  // Open5e's SRD 5.1 export omits the generic Armor / Shield +N
  // entries even though they're in the SRD itself. Seed them by
  // hand so 2014 has parity with 2024. Generic Ammunition isn't
  // here — we fan it out per ammo type (Arrows, Bolts, …) above.
  const SRD51_PLUSN_BASES = [
    {
      kind: 'Armor',
      ac_bonus: true,
      rarities: ['rare', 'very rare', 'legendary'],
      desc: "You have a bonus to AC while wearing this armor. The bonus is determined by the armor's rarity.",
      attunement: false,
    },
    {
      kind: 'Shield',
      ac_bonus: true,
      rarities: ['uncommon', 'rare', 'very rare'],
      desc: "While holding this shield, you have a bonus to AC determined by the shield's rarity, in addition to the shield's normal bonus to AC.",
      attunement: false,
    },
  ];
  for (const b of SRD51_PLUSN_BASES) {
    for (const n of [1, 2, 3]) {
      await upsertItem({
        name: `${b.kind}, +${n}`,
        slug: `${b.kind.toLowerCase()}-plus-${n}`,
        item_type: 'magic_item',
        description: b.desc,
        source: 'SRD 5.1 (2014)',
        rarity: b.rarities[n - 1],
        attunement: !!b.attunement,
        ac_bonus: b.ac_bonus ? n : 0,
        attack_bonus_misc: b.attack_bonus ? n : 0,
      });
      magicCount++;
    }
  }
  console.log(`  ${magicCount} magic items`);
  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });
