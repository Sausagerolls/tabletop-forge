// import_srd_2024_spells.js — extracts the 2024 SRD 5.2.1 spell list
// straight from WotC's published PDF (CC-BY 4.0) and writes them into
// spell_library with edition='2024'. The PDF is at:
//   https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf
//
// Strategy:
//   1. Download the PDF if it isn't cached at /tmp.
//   2. Shell out to a Python helper (parseSrd2024.py) that uses pypdf
//      to pull text from the Spell Descriptions chapter (p.107–203)
//      and parse the regular header pattern into JSON entries.
//   3. UPSERT each entry by name with edition='2024'.
//
// Idempotent — re-running just refreshes the rows.

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const db = require('./db');

const PDF_PATH = '/tmp/SRD_CC_v5.2.1.pdf';
const PDF_URL  = 'https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf';
const PARSER   = path.join(__dirname, 'parseSrd2024.py');

function deterministicId(slug) {
  const h = crypto.createHash('sha1').update(`srd-2024:${slug}`).digest('hex');
  return [
    h.slice(0, 8),
    h.slice(8, 12),
    '5' + h.slice(13, 16),
    ((parseInt(h.slice(16, 17), 16) & 0x3) | 0x8).toString(16) + h.slice(17, 20),
    h.slice(20, 32),
  ].join('-');
}

function classifyType(spell) {
  const desc = (spell.description || '').toLowerCase();
  if (/regain.*hit points|hit point maximum|hit points increase/i.test(desc)) return 'heal';
  if (/saving throw/i.test(desc)) return 'save';
  if (/(make|makes) (a |an )?(ranged |melee )?(spell |weapon )?attack/i.test(desc)) return 'attack';
  return 'utility';
}

function ensurePdf() {
  if (fs.existsSync(PDF_PATH) && fs.statSync(PDF_PATH).size > 1_000_000) return;
  console.log(`Downloading SRD 5.2.1 PDF…`);
  execSync(`curl -sL --fail -A 'Mozilla/5.0' -o ${PDF_PATH} ${PDF_URL}`, { stdio: 'inherit' });
}

function runParser() {
  console.log('Parsing spell descriptions from PDF…');
  const out = execSync(`python3 ${PARSER} ${PDF_PATH}`, { maxBuffer: 32 * 1024 * 1024 }).toString();
  return JSON.parse(out);
}

async function importOne(spell) {
  const slug = spell.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const id = deterministicId(slug);
  const type = classifyType(spell);
  const components = (spell.components || '').toUpperCase();
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
      Number(spell.level) || 0,
      type,
      spell.school || '',
      spell.casting_time || '',
      spell.range || '',
      spell.duration || '',
      components.includes('V'),
      components.includes('S'),
      components.includes('M'),
      spell.material || '',
      type === 'attack' ? 'attack' : (type === 'save' ? 'save' : ''),
      '',
      JSON.stringify([]),
      spell.higher_level || '',
      spell.description || '',
      'SRD 5.2.1 (2024)',
      JSON.stringify(spell.classes || []),
      '2024',
    ]
  );
}

async function main() {
  ensurePdf();
  const spells = runParser();
  console.log(`  parsed ${spells.length} spells`);
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
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
