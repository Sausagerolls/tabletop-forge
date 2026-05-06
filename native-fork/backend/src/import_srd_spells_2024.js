// import_srd_spells_2024.js — one-shot CLI importer for the WotC
// 2024 SRD 5.2 spell set.
//
// Open5e exposed the 2024 SRD on their v2 API (different shape from
// v1). It returns 339 spells with the 2024 renames already applied
// (Bigby's Hand → Arcane Hand, Mordenkainen's Faithful Hound →
// Faithful Hound, etc.), a few wholly new entries (Vortex Warp,
// Hideous Laughter, …), and a handful retired from 2014.
//
// Behaviour
// ─────────
// * UPSERTs by (name, edition) so re-running just refreshes rows.
// * Stamps edition='2024', source='SRD 5.2 (2024)'.
// * Doesn't touch 2014-edition rows. Spells that exist under both
//   editions (most of them) live as separate rows; the GM picker
//   filters by edition. Names that overlap (e.g. Acid Splash) get
//   one row per edition because the 2024 stat block is sometimes
//   different (range / damage scaling / class lists).
//
// Run from inside the backend container (or against a running pg):
//   node /app/src/import_srd_spells_2024.js
// Idempotent.

const db = require('./db');
const crypto = require('crypto');

const ENDPOINT = 'https://api.open5e.com/v2/spells/?document__gamesystem__key=5e-2024&limit=500';

// Same UUIDv5-ish stamp as the 2014 importer, scoped to 2024 so
// the deterministic ids don't collide across editions.
function deterministicId(slug) {
  const h = crypto.createHash('sha1').update(`open5e:srd-2024:${slug}`).digest('hex');
  return [
    h.slice(0, 8),
    h.slice(8, 12),
    '5' + h.slice(13, 16),
    ((parseInt(h.slice(16, 17), 16) & 0x3) | 0x8).toString(16) + h.slice(17, 20),
    h.slice(20, 32),
  ].join('-');
}

// Open5e v2 splits attack vs save vs neither across `attack_roll` /
// `saving_throw_ability`. Map onto our `type` (combat / utility) +
// `attack_save` (melee / ranged / save / '').
function classify(spell) {
  const desc = String(spell.desc || '').toLowerCase();
  const hasDamage = !!String(spell.damage_roll || '').trim()
    || (Array.isArray(spell.damage_types) && spell.damage_types.length > 0);
  const isHeal = /\bregain.*hit points\b|\bheal[s]?\b|\bhit points equal\b/.test(desc);
  // Our `type` is a coarse combat/utility flag. Anything with a
  // damage roll or save is combat; healing + buffs are utility.
  const type = (hasDamage || spell.attack_roll || spell.saving_throw_ability)
    ? (isHeal ? 'utility' : 'combat')
    : 'utility';

  let attack_save = '';
  if (spell.attack_roll) {
    // v2 doesn't distinguish melee vs ranged on the spell row — most
    // SRD attack spells are ranged, default to that. The handful of
    // melee ones (Booming Blade, Sword of Wonder…) will be tagged
    // wrong but the description text makes it obvious to the player.
    attack_save = 'ranged';
  } else if (spell.saving_throw_ability) {
    attack_save = 'save';
  }
  return { type, attack_save };
}

function damageTypeFromList(list) {
  if (!Array.isArray(list) || list.length === 0) return '';
  return String(list[0] || '').toLowerCase();
}

// v2 returns full lowercase names ("dexterity", "constitution") for
// saving_throw_ability. The spell_library.save_ability column is
// VARCHAR(8) and the rest of the app expects three-letter codes
// (STR/DEX/…). Normalise on the way in. Empty string for "no save".
const SAVE_ABILITY_CODE = {
  strength: 'STR', str: 'STR',
  dexterity: 'DEX', dex: 'DEX',
  constitution: 'CON', con: 'CON',
  intelligence: 'INT', int: 'INT',
  wisdom: 'WIS', wis: 'WIS',
  charisma: 'CHA', cha: 'CHA',
};
function normaliseSaveAbility(raw) {
  const k = String(raw || '').trim().toLowerCase();
  return SAVE_ABILITY_CODE[k] || '';
}

async function fetchAll() {
  const all = [];
  let url = ENDPOINT;
  while (url) {
    const res = await fetch(url, { headers: { 'User-Agent': 'TableTopForge/1.0 srd2024-import' } });
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
    const page = await res.json();
    for (const row of page.results || []) all.push(row);
    url = page.next;
  }
  return all;
}

async function importOne(spell) {
  const id = deterministicId(spell.key);
  const level = Number(spell.level) || 0;
  const { type, attack_save } = classify(spell);
  const compV = !!spell.verbal;
  const compS = !!spell.somatic;
  const compM = !!spell.material;
  const allowedClasses = Array.isArray(spell.classes)
    ? spell.classes.map((c) => String(c?.name || '').trim()).filter(Boolean)
    : [];
  const damageEntries = String(spell.damage_roll || '').trim()
    ? [{ damage: spell.damage_roll, damage_type: damageTypeFromList(spell.damage_types) }]
    : [];

  await db.query(
    `INSERT INTO spell_library (
       id, name, level, type, school, casting_time, range_area, duration,
       comp_v, comp_s, comp_m, comp_m_text, attack_save, save_ability,
       damage_entries, extra_effects, description, source,
       allowed_classes, edition
     )
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
     ON CONFLICT (name, edition) DO UPDATE SET
       level = EXCLUDED.level,
       type = EXCLUDED.type,
       school = EXCLUDED.school,
       casting_time = EXCLUDED.casting_time,
       range_area = EXCLUDED.range_area,
       duration = EXCLUDED.duration,
       comp_v = EXCLUDED.comp_v,
       comp_s = EXCLUDED.comp_s,
       comp_m = EXCLUDED.comp_m,
       comp_m_text = EXCLUDED.comp_m_text,
       attack_save = EXCLUDED.attack_save,
       save_ability = EXCLUDED.save_ability,
       damage_entries = EXCLUDED.damage_entries,
       extra_effects = EXCLUDED.extra_effects,
       description = EXCLUDED.description,
       source = EXCLUDED.source,
       allowed_classes = EXCLUDED.allowed_classes,
       edition = EXCLUDED.edition`,
    [
      id,
      spell.name,
      level,
      type,
      String(spell.school?.name || ''),
      String(spell.casting_time || ''),
      String(spell.range_text || (spell.range ? `${spell.range} feet` : '')),
      String(spell.duration || ''),
      compV, compS, compM,
      String(spell.material_specified || ''),
      attack_save,
      normaliseSaveAbility(spell.saving_throw_ability),
      JSON.stringify(damageEntries),
      String(spell.higher_level || ''),
      String(spell.desc || ''),
      'SRD 5.2 (2024)',
      JSON.stringify(allowedClasses),
      '2024',
    ]
  );
}

async function main() {
  console.log('Fetching 2024 SRD spells from Open5e v2…');
  const spells = await fetchAll();
  console.log(`  retrieved ${spells.length} spells`);
  let imported = 0;
  for (const s of spells) {
    try {
      await importOne(s);
      imported += 1;
    } catch (err) {
      console.error(`  ✘ ${s.name}: ${err.message}`);
    }
  }
  console.log(`Imported / updated ${imported} spells with edition='2024'.`);
  return imported;
}

module.exports = { main };

// CLI invocation — keep working as a one-shot script.
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((err) => { console.error(err); process.exit(1); });
}
