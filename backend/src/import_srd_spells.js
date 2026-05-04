// import_srd_spells.js — one-shot CLI importer that pulls the WotC
// 2014 SRD 5.1 spell set from Open5e (CC-licensed under OGL 1.0a /
// CC-BY 4.0) and writes them into spell_library with edition='2014'.
//
// 2024 SRD (SRD 5.2, released January 2025 under CC-BY 4.0) is NOT
// yet exposed by Open5e v1, so this importer only handles 2014 for
// now. When Open5e adds 2024 we extend the document filter; until
// then the GM toggle defaults to 'both' which surfaces every spell
// in the table regardless.
//
// Run from inside the backend container (or against a running pg):
//   node /app/src/import_srd_spells.js
// Idempotent — re-running just refreshes the rows by name.

const db = require('./db');
const crypto = require('crypto');

const ENDPOINT = 'https://api.open5e.com/v1/spells/?document__slug=wotc-srd&limit=400';

// Map Open5e's school + level into our `type` field. The web app's
// CreatureForm groups spells as 'attack' / 'save' / 'utility' /
// 'heal' for at-a-glance UI; we infer from the Open5e payload's
// damage_roll / dc / heal hints, defaulting to 'utility' when nothing
// matches.
function classifyType(spell) {
  const desc = (spell.desc || '').toLowerCase();
  if (desc.includes('regain hit points') || desc.includes('healed') || desc.includes('hit points equal')) return 'heal';
  if ((spell.dc || '').trim()) return 'save';
  if (spell.attack_type && spell.attack_type !== 'NONE') return 'attack';
  if ((spell.damage_roll || '').trim()) return /\bsave\b/.test(spell.dc || '') ? 'save' : 'attack';
  return 'utility';
}

// Open5e's `dc` field is a freeform string ("DEX save"). Pluck the
// stat where present so the iOS / web stat block can show "save: DEX".
function parseSaveAbility(dc) {
  if (!dc) return '';
  const m = String(dc).match(/(STR|DEX|CON|INT|WIS|CHA)/i);
  return m ? m[1].toUpperCase() : '';
}

// Derive a stable UUID from the spell slug so re-running the importer
// keeps the same id (and so the same spell across deploys lines up).
// crypto.createHash('sha1') gives 40 hex; format as a UUID.
function deterministicId(slug) {
  const h = crypto.createHash('sha1').update(`open5e:wotc-srd:${slug}`).digest('hex');
  return [
    h.slice(0, 8),
    h.slice(8, 12),
    // Force version 5 nibble in the third group so it's a valid UUID.
    '5' + h.slice(13, 16),
    // Force variant nibble in the fourth.
    ((parseInt(h.slice(16, 17), 16) & 0x3) | 0x8).toString(16) + h.slice(17, 20),
    h.slice(20, 32),
  ].join('-');
}

async function fetchAll() {
  // Open5e paginates — follow `next` until null. The default page
  // size is fine; we ask for 400 to cut request count.
  const all = [];
  let url = ENDPOINT;
  while (url) {
    const res = await fetch(url, { headers: { 'User-Agent': 'TableTopForge/1.0 srd-import' } });
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
    const page = await res.json();
    for (const row of page.results || []) all.push(row);
    url = page.next;
  }
  return all;
}

async function importOne(spell) {
  const id = deterministicId(spell.slug);
  const level = Number(spell.level_int ?? spell.level ?? 0) || 0;
  const type = classifyType(spell);
  const components = (spell.components || '').toUpperCase();
  const compV = components.includes('V');
  const compS = components.includes('S');
  const compM = components.includes('M');
  const allowedClasses = (spell.dnd_class || '')
    .split(/\s*,\s*/)
    .map((s) => s.trim())
    .filter(Boolean);

  // UPSERT keyed by name (the existing UNIQUE constraint). If a row
  // with this name already exists, refresh its fields and stamp the
  // edition/source so future filters work.
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
      spell.school || '',
      spell.casting_time || '',
      spell.range || '',
      spell.duration || '',
      compV, compS, compM,
      spell.material || '',
      type === 'attack' ? 'attack' : (type === 'save' ? 'save' : ''),
      parseSaveAbility(spell.dc),
      JSON.stringify(spell.damage_roll
        ? [{ damage: spell.damage_roll, damage_type: spell.damage_type || '' }]
        : []),
      spell.higher_level || '',
      spell.desc || '',
      'SRD 5.1 (2014)',
      JSON.stringify(allowedClasses),
      '2014',
    ]
  );
}

async function main() {
  console.log('Fetching 2014 SRD spells from Open5e…');
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
  console.log(`Imported / updated ${imported} spells with edition='2014'.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
