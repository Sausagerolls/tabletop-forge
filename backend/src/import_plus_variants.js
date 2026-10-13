// import_plus_variants.js — +1 / +2 / +3 weapons and armour for the library.
//
//   docker compose exec backend node src/import_plus_variants.js
//   docker compose exec backend node src/import_plus_variants.js --dry-run
//
// The SRD importers can fan these out, but only while they are re-run against
// their source data, and a library that has already been imported never sees
// them. This derives the variants from the MUNDANE rows that are already in
// item_library instead, so it needs no network, no PDF and no re-import — and
// it stays correct for any base weapon or armour added later, including
// homebrew, because it reads whatever is there now.
//
// Idempotent: UPSERT on (name, edition). Run it again after adding a base item
// and only the new variants appear.
const crypto = require('crypto');
const db = require('./db');

function deterministicId(slug) {
  const h = crypto.createHash('sha1').update(`plus-variant:${slug}`).digest('hex');
  return [h.slice(0, 8), h.slice(8, 12), h.slice(12, 16), h.slice(16, 20), h.slice(20, 32)].join('-');
}

// DMG rarities. A magic weapon and a magic SHIELD share the same ladder;
// body armour is a step rarer at every tier, which is why it has its own.
const WEAPON_RARITY = ['uncommon', 'rare', 'very rare'];
const SHIELD_RARITY = ['uncommon', 'rare', 'very rare'];
const ARMOR_RARITY  = ['rare', 'very rare', 'legendary'];

function variantOf(base, n) {
  const isArmor = base.item_type === 'armor';
  const isShield = String(base.armor_category || '').toLowerCase() === 'shield';
  const name = `${base.name} +${n}`;
  const rarity = isArmor
    ? (isShield ? SHIELD_RARITY : ARMOR_RARITY)[n - 1]
    : WEAPON_RARITY[n - 1];

  const desc = isArmor
    ? (isShield
      ? `While holding this shield, you have a +${n} bonus to Armour Class in addition to the shield's normal bonus.`
      : `You have a +${n} bonus to Armour Class while wearing this armour.`)
    : `You have a +${n} bonus to attack and damage rolls made with this magic weapon.`;

  return {
    ...base,
    name,
    slug: `${String(base.name).toLowerCase().replace(/[^a-z0-9]+/g, '-')}-plus-${n}`,
    rarity,
    // A magic item has no list price. Leaving the mundane cost on would put a
    // 15 GP tag on a very rare longsword.
    cost: '',
    description: `${desc}${base.description ? `\n\n${base.description}` : ''}`,
    // The numbers. Damage dice are NOT rewritten — the sheet adds
    // damage_bonus_misc itself and labels it "magic +N", so baking it into the
    // dice string would both hide where it came from and double it for anyone
    // who later set the field by hand.
    attack_bonus_misc: isArmor ? 0 : n,
    damage_bonus_misc: isArmor ? 0 : n,
    ac_bonus: isArmor ? n : 0,
    attunement: false,
    attunement_req: '',
  };
}

async function upsert(v) {
  await db.query(
    `INSERT INTO item_library (
       id, name, item_type, description, source, edition, weight, cost,
       damage_entries, weapon_range, attack_stat, attack_bonus_misc, damage_bonus_misc,
       properties, mastery, ac_base, armor_category, str_req, stealth_disadvantage,
       ac_bonus, attunement, attunement_req, rarity
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)
     ON CONFLICT (name, edition) DO UPDATE SET
       item_type=EXCLUDED.item_type, description=EXCLUDED.description,
       source=EXCLUDED.source, weight=EXCLUDED.weight, cost=EXCLUDED.cost,
       damage_entries=EXCLUDED.damage_entries, weapon_range=EXCLUDED.weapon_range,
       attack_stat=EXCLUDED.attack_stat, attack_bonus_misc=EXCLUDED.attack_bonus_misc,
       damage_bonus_misc=EXCLUDED.damage_bonus_misc,
       properties=EXCLUDED.properties, mastery=EXCLUDED.mastery,
       ac_base=EXCLUDED.ac_base, armor_category=EXCLUDED.armor_category,
       str_req=EXCLUDED.str_req, stealth_disadvantage=EXCLUDED.stealth_disadvantage,
       ac_bonus=EXCLUDED.ac_bonus, attunement=EXCLUDED.attunement,
       attunement_req=EXCLUDED.attunement_req, rarity=EXCLUDED.rarity`,
    [
      deterministicId(`${v.slug}-${v.edition}`), v.name, v.item_type, v.description || '',
      v.source || '', v.edition, v.weight || 0, v.cost || '',
      JSON.stringify(v.damage_entries || []), v.weapon_range || '', v.attack_stat || 'STR',
      v.attack_bonus_misc || 0, v.damage_bonus_misc || 0,
      v.properties || '', v.mastery || '',
      v.ac_base || 0, v.armor_category || '', v.str_req ?? null, !!v.stealth_disadvantage,
      v.ac_bonus || 0, !!v.attunement, v.attunement_req || '', v.rarity || '',
    ]
  );
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');

  // Mundane bases only. A magic item carries a rarity and everything in the
  // SRD equipment tables does not, which is the cleanest line available —
  // without it the script would cheerfully offer a "Longsword of Sharpness +3".
  const bases = (await db.query(
    `SELECT * FROM item_library
      WHERE item_type IN ('weapon','armor')
        AND COALESCE(rarity,'') = ''
      ORDER BY edition, item_type, name`
  )).rows
    // Never build a variant of a variant. Filtered here rather than in SQL:
    // a backslash bound for a Postgres regex has to survive both the JS string
    // and the SQL literal, and getting that wrong fails silently by matching
    // nothing.
    .filter((r) => !/\s\+\d$/.test(String(r.name || '')));

  const byEdition = {};
  let made = 0;
  for (const base of bases) {
    for (const n of [1, 2, 3]) {
      const v = variantOf(base, n);
      if (!dryRun) await upsert(v);
      byEdition[base.edition] = (byEdition[base.edition] || 0) + 1;
      made++;
    }
  }

  const counts = Object.entries(byEdition).map(([e, n]) => `${e}: ${n}`).join(', ');
  console.log(`${dryRun ? 'Would create' : 'Created/updated'} ${made} variant(s) `
    + `from ${bases.length} base item(s) (${counts}).`);
  if (dryRun) {
    for (const base of bases.slice(0, 5)) {
      const v = variantOf(base, 1);
      console.log(`  e.g. ${v.name} [${v.edition}] ${v.rarity}`
        + (v.item_type === 'armor' ? ` · AC +${v.ac_bonus}` : ` · atk +${v.attack_bonus_misc} dmg +${v.damage_bonus_misc}`));
    }
  }
}

main().then(() => process.exit(0)).catch((err) => {
  console.error('import_plus_variants failed:', err.message);
  process.exit(1);
});
