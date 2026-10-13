// import_artificer_spells.js — put the Artificer on the spell list.
//
// The library is seeded from the SRD, and the SRD has no Artificer: not one
// row in spell_library named the class, so the character builder's class
// filter matched nothing and told every Artificer that no spells were
// available to them. Peter's level 1 Artificer could not pick a cantrip.
//
// Two jobs, both idempotent:
//
//   1. TAG. Every spell on the Artificer list that the library already has
//      gains 'Artificer' in allowed_classes. Existing classes are kept — this
//      only ever adds, so a spell the GM hand-tagged stays tagged.
//   2. FILL. Roughly a fifth of the list is outside the SRD (Tasha's Caustic
//      Brew, Homunculus Servant, the blade cantrips), so those rows are
//      inserted from the bundled data.
//
// The data comes from artificer_spells.json, generated from a 5eTools mirror
// by spell-data/import_5etools_artificer_spells.py. The 2024 list is the one
// printed in Eberron: Forge of the Artificer; the 2014 list is Tasha's.
//
// Run inside the backend container:
//   node /app/src/import_artificer_spells.js
//   node /app/src/import_artificer_spells.js --dry-run

const crypto = require('crypto');
const db = require('./db');

const DATA = require('./artificer_spells.json');
const DRY = process.argv.includes('--dry-run');

// Same deterministic-id shape as the SRD importers, scoped to this source so
// a re-run updates its own rows and can never collide with theirs.
function deterministicId(key) {
  const h = crypto.createHash('sha1').update(`5etools:artificer:${key}`).digest('hex');
  return [
    h.slice(0, 8),
    h.slice(8, 12),
    '5' + h.slice(13, 16),
    ((parseInt(h.slice(16, 17), 16) & 0x3) | 0x8).toString(16) + h.slice(17, 20),
    h.slice(20, 32),
  ].join('-');
}

async function tagExisting(names, edition) {
  if (!names.length) return 0;
  // jsonb_insert would duplicate on a second run; the guard is the point.
  const res = await db.query(
    `UPDATE spell_library
        SET allowed_classes = COALESCE(allowed_classes, '[]'::jsonb) || '["Artificer"]'::jsonb
      WHERE edition = $2
        AND LOWER(name) = ANY($1::text[])
        AND NOT EXISTS (
          SELECT 1 FROM jsonb_array_elements_text(COALESCE(allowed_classes, '[]'::jsonb)) c
           WHERE LOWER(c) = 'artificer'
        )
      RETURNING name`,
    [names, edition]
  );
  return res.rowCount;
}

async function insertMissing(spell, edition) {
  const key = `${spell.name.toLowerCase()}:${edition}`;
  const classes = ['Artificer'];
  await db.query(
    `INSERT INTO spell_library (
       id, name, level, type, school, casting_time, range_area, duration,
       comp_v, comp_s, comp_m, comp_m_text, attack_save, save_ability,
       damage_entries, extra_effects, description, source,
       allowed_classes, edition
     )
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
     ON CONFLICT (name, edition) DO UPDATE SET
       -- A row that already exists was tagged above; only the class list is
       -- ours to touch, so an SRD row's own text is never overwritten here.
       allowed_classes = spell_library.allowed_classes`,
    [
      deterministicId(key),
      spell.name,
      Number(spell.level) || 0,
      spell.type || 'utility',
      spell.school || '',
      spell.casting_time || '',
      spell.range_area || '',
      spell.duration || '',
      !!spell.comp_v, !!spell.comp_s, !!spell.comp_m,
      spell.comp_m_text || '',
      spell.attack_save || '',
      spell.save_ability || '',
      JSON.stringify(spell.damage_entries || []),
      spell.extra_effects || '',
      spell.description || '',
      spell.source || '5eTools',
      JSON.stringify(classes),
      edition,
    ]
  );
}

async function main() {
  const spells = new Map(DATA.spells.map((s) => [s.name.toLowerCase(), s]));
  const summary = [];

  for (const [edition, list] of [['2024', DATA.list_2024], ['2014', DATA.list_2014]]) {
    const names = list.map((n) => n.toLowerCase());
    const present = (await db.query(
      `SELECT LOWER(name) AS n FROM spell_library WHERE edition=$1 AND LOWER(name) = ANY($2::text[])`,
      [edition, names]
    )).rows.map((r) => r.n);
    const have = new Set(present);
    const missing = names.filter((n) => !have.has(n) && spells.has(n));
    const unknown = names.filter((n) => !have.has(n) && !spells.has(n));

    if (DRY) {
      console.log(`${edition}: ${have.size} to tag, ${missing.length} to insert` +
        (unknown.length ? `, ${unknown.length} with no record: ${unknown.join(', ')}` : ''));
      continue;
    }
    const tagged = await tagExisting([...have], edition);
    for (const n of missing) await insertMissing(spells.get(n), edition);
    summary.push(`${edition}: tagged ${tagged}, inserted ${missing.length}` +
      (unknown.length ? `, skipped ${unknown.length} with no record` : ''));
  }

  if (!DRY) {
    for (const line of summary) console.log(line);
    const total = (await db.query(
      `SELECT edition, COUNT(*) FROM spell_library
        WHERE EXISTS (SELECT 1 FROM jsonb_array_elements_text(COALESCE(allowed_classes,'[]'::jsonb)) c
                       WHERE LOWER(c)='artificer')
        GROUP BY edition ORDER BY edition`
    )).rows;
    for (const r of total) console.log(`Artificer spells in library, ${r.edition}: ${r.count}`);
  }
  await db.end?.();
}

main().catch((err) => { console.error(err); process.exit(1); });
