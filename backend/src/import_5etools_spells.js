// import_5etools_spells.js — the whole spell catalogue, from the mirror.
//
// The library was seeded from the SRD, which is a fraction of what the books
// hold: on the live server that left 507 rows, no 2024 Fireball among them, and
// every non-SRD spell missing outright. This walks every file the mirror's
// spell index names and writes what is missing.
//
// WHAT IT WILL NOT TOUCH
//
// A row the GM made or edited. The library is their work — a spell scanned
// from a PDF, a homebrew entry, a tweak to how a spell behaves at this table —
// and a bulk import that overwrote those would be destroying exactly the thing
// the app is for.
//
// A row is ours to rewrite when its source says a machine wrote it: an earlier
// run of this importer, or one of the SRD imports. Anything else — a PDF name,
// "manual", "Homebrew" — is left alone and counted, and --force is there if a
// GM ever does want the published text back over their own.
//
// ONE ROW PER NAME PER EDITION
//
// (name, edition) is the library's own unique key, and the source IS the
// edition: XPHB and the other 2024 books are '2024', everything else '2014'.
// Where a spell appears in several books of the same edition the better source
// wins, by the same ranking the lookup uses, so Fireball comes from the PHB
// rather than from a setting book that reprinted it.
//
//   node /app/src/import_5etools_spells.js --dry-run
//   node /app/src/import_5etools_spells.js
//   node /app/src/import_5etools_spells.js --force     (also rewrite SRD rows)

const crypto = require('crypto');
const db = require('./db');
const compendium = require('./compendium');
const reference = require('./reference');

const { getJson, stripTags, entriesToText, sourceRank, editionOf } = compendium;
const { SCHOOLS, timeText, rangeText, durationText, componentsText } = reference;

const DRY = process.argv.includes('--dry-run');
const FORCE = process.argv.includes('--force');

const DAMAGE_WORDS = {
  acid: 'Acid', bludgeoning: 'Bludgeoning', cold: 'Cold', fire: 'Fire',
  force: 'Force', lightning: 'Lightning', necrotic: 'Necrotic',
  piercing: 'Piercing', poison: 'Poison', psychic: 'Psychic',
  radiant: 'Radiant', slashing: 'Slashing', thunder: 'Thunder',
};

const CLASS_NAMES = new Set(['Artificer', 'Barbarian', 'Bard', 'Cleric', 'Druid',
  'Fighter', 'Monk', 'Paladin', 'Ranger', 'Rogue', 'Sorcerer', 'Warlock', 'Wizard']);

function deterministicId(key) {
  const h = crypto.createHash('sha1').update(`5etools:spell:${key}`).digest('hex');
  return [
    h.slice(0, 8), h.slice(8, 12), '5' + h.slice(13, 16),
    ((parseInt(h.slice(16, 17), 16) & 0x3) | 0x8).toString(16) + h.slice(17, 20),
    h.slice(20, 32),
  ].join('-');
}

// The damage a spell deals, as the editor's rows.
//
// A TYPE is what makes dice damage: Cure Wounds rolls 2d8 and inflicts
// nothing, so taking the first dice expression on its own would file every
// healing spell as a combat spell.
function damageEntries(sp, text) {
  const types = (sp.damageInflict || []).map((t) => DAMAGE_WORDS[t] || String(t));
  if (!types.length) return [];
  const dice = (text.match(/\b(\d+d\d+)\b/) || [])[1];
  if (!dice) return [];
  return types.map((t) => ({ damage: dice, damage_type: t }));
}

function classify(sp, text, damage, attackSave) {
  if (damage.length || attackSave) return 'combat';
  return /regains? [^.]{0,40}Hit Points|restore[sd]? [^.]{0,30}Hit Points/i.test(text)
    ? 'healing' : 'utility';
}

async function main() {
  // Which classes may cast what. Assembled the other way round in 5etools — a
  // spell record names no class — so this is the one place the lists live.
  let classesBySpell = new Map();
  try {
    const byClass = await reference.spellListIndex();
    for (const [cls, names] of byClass) {
      const proper = [...CLASS_NAMES].find((c) => c.toLowerCase() === cls);
      if (!proper) continue;                       // a subclass list, not a class
      for (const n of names) {
        if (!classesBySpell.has(n)) classesBySpell.set(n, new Set());
        classesBySpell.get(n).add(proper);
      }
    }
  } catch (err) {
    console.error('could not read the class lists:', err.message);
    console.error('spells will be written without allowed_classes.');
  }

  const index = await getJson('/data/spells/index.json');
  const best = new Map();                          // 'name|edition' -> spell
  let read = 0;
  for (const [src, filename] of Object.entries(index || {})) {
    let data;
    try {
      data = await getJson(`/data/spells/${filename}`);
    } catch (err) {
      console.error(`  skipped ${filename}: ${err.message}`);
      continue;
    }
    for (const sp of (data.spell || [])) {
      if (!sp?.name) continue;
      read += 1;
      const key = `${sp.name.toLowerCase()}|${editionOf(sp.source || src)}`;
      const held = best.get(key);
      if (!held || sourceRank(sp.source) < sourceRank(held.source)) best.set(key, sp);
    }
  }
  console.log(`mirror: ${read} spell entries, ${best.size} after one per name per edition`);

  // What the library already holds, and who wrote it.
  const existing = new Map();
  for (const row of (await db.query('SELECT name, edition, source FROM spell_library')).rows) {
    existing.set(`${String(row.name).toLowerCase()}|${row.edition}`, row);
  }
  console.log(`library: ${existing.size} rows`);

  let inserted = 0, updated = 0, keptGm = 0, unchanged = 0;
  const examples = [];

  for (const [key, sp] of best) {
    const edition = editionOf(sp.source);
    const held = existing.get(key);
    const ours = held && /^(5eTools|SRD|Open5e)/i.test(String(held.source || ''));
    if (held && !ours && !FORCE) { keptGm += 1; continue; }

    const text = entriesToText(sp.entries);
    const higher = entriesToText(sp.entriesHigherLevel);
    const description = [text, higher].filter(Boolean).join('\n\n');
    const damage = damageEntries(sp, text);
    let attack_save = '';
    let save_ability = '';
    if (sp.spellAttack) attack_save = String(sp.spellAttack).includes('R') ? 'ranged' : 'melee';
    else if (sp.savingThrow?.length) {
      attack_save = 'save';
      save_ability = String(sp.savingThrow[0]).slice(0, 3).toUpperCase();
    }
    const comp = sp.components || {};
    const material = typeof comp.m === 'object' ? comp.m : null;
    const allowed = [...(classesBySpell.get(sp.name.toLowerCase()) || [])].sort();

    if (DRY) {
      if (examples.length < 8 && !held) examples.push(`${sp.name} (${sp.source}, ${edition})`);
      if (held) updated += 1; else inserted += 1;
      continue;
    }

    const res = await db.query(
      `INSERT INTO spell_library (
         id, name, level, type, school, casting_time, range_area, duration,
         comp_v, comp_s, comp_m, comp_m_text, attack_save, save_ability,
         damage_entries, extra_effects, description, source,
         allowed_classes, edition
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
       ON CONFLICT (name, edition) DO UPDATE SET
         level = EXCLUDED.level, type = EXCLUDED.type, school = EXCLUDED.school,
         casting_time = EXCLUDED.casting_time, range_area = EXCLUDED.range_area,
         duration = EXCLUDED.duration, comp_v = EXCLUDED.comp_v,
         comp_s = EXCLUDED.comp_s, comp_m = EXCLUDED.comp_m,
         comp_m_text = EXCLUDED.comp_m_text, attack_save = EXCLUDED.attack_save,
         save_ability = EXCLUDED.save_ability, damage_entries = EXCLUDED.damage_entries,
         extra_effects = EXCLUDED.extra_effects, description = EXCLUDED.description,
         source = EXCLUDED.source,
         -- Never blank a class list that is already there: a GM may have added
         -- a class to a spell by hand, and the lookup not knowing about it is
         -- not a reason to take it away.
         allowed_classes = CASE
           WHEN jsonb_array_length(EXCLUDED.allowed_classes) > 0 THEN EXCLUDED.allowed_classes
           ELSE spell_library.allowed_classes END
       RETURNING (xmax = 0) AS was_insert`,
      [
        deterministicId(key),
        sp.name,
        Number(sp.level) || 0,
        classify(sp, description, damage, attack_save),
        SCHOOLS[sp.school] || '',
        timeText(sp.time),
        rangeText(sp.range),
        durationText(sp.duration),
        !!comp.v, !!comp.s, !!comp.m,
        stripTags(material ? (material.text || '') : (comp.m === true ? '' : comp.m || '')),
        attack_save,
        save_ability,
        JSON.stringify(damage),
        higher,
        description,
        `5eTools ${sp.source}`,
        JSON.stringify(allowed),
        edition,
      ]
    );
    if (res.rows[0]?.was_insert) inserted += 1;
    else if (held) updated += 1;
    else unchanged += 1;
  }

  if (DRY) {
    console.log(`would insert ${inserted}, refresh ${updated}, leave ${keptGm} hand-made rows alone`);
    if (examples.length) console.log('examples of new rows:', examples.join('; '));
  } else {
    console.log(`inserted ${inserted}, refreshed ${updated + unchanged}, left ${keptGm} hand-made rows alone`);
    const totals = (await db.query(
      `SELECT edition, COUNT(*) FROM spell_library GROUP BY edition ORDER BY edition`
    )).rows;
    for (const t of totals) console.log(`  ${t.edition}: ${t.count}`);
  }
  await db.end?.();
}

main().catch((err) => { console.error(err); process.exit(1); });
