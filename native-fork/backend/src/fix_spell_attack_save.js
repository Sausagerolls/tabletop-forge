// fix_spell_attack_save.js — correct which spells ask for an attack roll.
//
//   docker compose exec backend node src/fix_spell_attack_save.js --dry-run
//   docker compose exec backend node src/fix_spell_attack_save.js
//
// `attack_save` decides whether the sheet offers a "roll to hit" button. It
// was wrong for a good number of spells: Bless was marked as a ranged attack,
// so a spell that simply happens gave the player a button to roll — and Bane,
// Faerie Fire and Vicious Mockery were attacks rather than the saves they are.
//
// Rather than correct them from memory, this reads the self-hosted 5eTools
// mirror, which states both facts explicitly per spell:
//
//   spellAttack: ['R'] | ['M']      an attack roll, ranged or melee
//   savingThrow: ['dexterity', …]   a saving throw, and which
//
// Where a spell has both (Ray of Sickness: an attack that then forces a save)
// the ATTACK wins, because that is the roll the caster makes and the one the
// button is for; the save is in the spell's text.
const http = require('http');
const db = require('./db');

const HOST = process.env.COMPENDIUM_HOST || '192.168.50.131:5050';
// 2014 rows come from the PHB file, 2024 rows from XPHB.
const FILES = { 2014: 'spells-phb.json', 2024: 'spells-xphb.json' };

const ABBR = {
  strength: 'STR', dexterity: 'DEX', constitution: 'CON',
  intelligence: 'INT', wisdom: 'WIS', charisma: 'CHA',
};

function getJson(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://${HOST}${path}`, (res) => {
      if (res.statusCode !== 200) { res.resume(); reject(new Error(`HTTP ${res.statusCode} for ${path}`)); return; }
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (d) => { body += d; });
      res.on('end', () => { try { resolve(JSON.parse(body)); } catch (e) { reject(e); } });
    }).on('error', reject);
  });
}

/** What the mirror says this spell asks for. */
function intent(entry) {
  const atk = Array.isArray(entry.spellAttack) ? entry.spellAttack : [];
  if (atk.includes('M')) return { attack_save: 'melee', save_ability: '' };
  if (atk.length) return { attack_save: 'ranged', save_ability: '' };
  const save = Array.isArray(entry.savingThrow) ? entry.savingThrow : [];
  if (save.length) return { attack_save: 'save', save_ability: ABBR[String(save[0]).toLowerCase()] || '' };
  return { attack_save: '', save_ability: '' };
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');

  const byEditionName = {};
  for (const [edition, file] of Object.entries(FILES)) {
    const data = await getJson(`/data/spells/${file}`);
    const map = new Map();
    for (const sp of (data.spell || [])) map.set(String(sp.name).toLowerCase(), sp);
    byEditionName[edition] = map;
    console.log(`  ${edition}: ${map.size} spells in the mirror`);
  }

  const rows = (await db.query(
    'SELECT id, name, edition, attack_save, save_ability FROM spell_library ORDER BY name, edition'
  )).rows;

  let changed = 0;
  let unknown = 0;
  for (const row of rows) {
    const src = byEditionName[String(row.edition)]?.get(String(row.name).toLowerCase());
    if (!src) { unknown++; continue; }
    const want = intent(src);
    const now = { attack_save: row.attack_save || '', save_ability: row.save_ability || '' };
    if (now.attack_save === want.attack_save && now.save_ability === want.save_ability) continue;
    changed++;
    console.log(`  ${row.name} [${row.edition}]: `
      + `${now.attack_save || 'nothing'}${now.save_ability ? ` ${now.save_ability}` : ''}`
      + ` → ${want.attack_save || 'nothing'}${want.save_ability ? ` ${want.save_ability}` : ''}`);
    if (!dryRun) {
      await db.query(
        'UPDATE spell_library SET attack_save=$1, save_ability=$2 WHERE id=$3',
        [want.attack_save, want.save_ability, row.id]
      );
    }
  }
  console.log(`${dryRun ? 'Would correct' : 'Corrected'} ${changed} of ${rows.length} spell(s).`
    + (unknown ? ` ${unknown} not in the mirror, left alone.` : ''));
}

main().then(() => process.exit(0)).catch((err) => {
  console.error('fix_spell_attack_save failed:', err.message);
  process.exit(1);
});
