// fix_creature_spell_flags.js — re-sync the mechanical flags on spells that
// were copied onto character sheets.
//
//   docker compose exec backend node src/fix_creature_spell_flags.js --dry-run
//   docker compose exec backend node src/fix_creature_spell_flags.js
//
// A spell added to a character is COPIED out of the library, so correcting the
// library leaves every sheet holding the old values. After
// fix_spell_attack_save.js put Bless right, a cleric who already had Bless
// still had "attack_save: ranged" on their own row and was still offered a
// roll to hit.
//
// Only three fields are touched, and only where the library has a row with
// that name:
//
//   attack_save   whether the sheet offers a to-hit button, or a save
//   save_ability  which save, when it is one
//   type          the app's own combat / healing / utility grouping
//
// Everything else a GM may have tuned per character — description, damage,
// prepared, notes — is left exactly as it is. Preference goes to the 2024
// printing where a spell exists in both, which is what the sheet itself does.
const db = require('./db');

function asArray(raw) {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string' && raw.trim().startsWith('[')) {
    try { return JSON.parse(raw) || []; } catch { return []; }
  }
  return [];
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');

  const lib = new Map();
  const rows = (await db.query(
    'SELECT name, edition, type, attack_save, save_ability FROM spell_library'
  )).rows;
  for (const r of rows) {
    const key = String(r.name || '').toLowerCase();
    const seen = lib.get(key);
    if (!seen || (String(r.edition) === '2024' && String(seen.edition) !== '2024')) lib.set(key, r);
  }

  const creatures = (await db.query(
    "SELECT id, name, spells FROM creatures WHERE spells IS NOT NULL AND spells::text <> '[]'"
  )).rows;

  let touchedCreatures = 0;
  let touchedSpells = 0;
  for (const c of creatures) {
    const spells = asArray(c.spells);
    if (!spells.length) continue;
    let changed = false;
    const next = spells.map((sp) => {
      const src = lib.get(String(sp?.name || '').toLowerCase());
      if (!src) return sp;
      const want = {
        attack_save: src.attack_save || '',
        save_ability: src.save_ability || '',
        type: src.type || '',
      };
      const now = {
        attack_save: sp.attack_save || '',
        save_ability: sp.save_ability || '',
        type: sp.type || '',
      };
      if (want.attack_save === now.attack_save
        && want.save_ability === now.save_ability
        && want.type === now.type) return sp;
      changed = true;
      touchedSpells++;
      console.log(`  ${c.name} (${c.id}) · ${sp.name}: `
        + `${now.attack_save || 'nothing'}/${now.type || '—'}`
        + ` → ${want.attack_save || 'nothing'}/${want.type || '—'}`);
      return { ...sp, ...want };
    });
    if (!changed) continue;
    touchedCreatures++;
    if (!dryRun) {
      await db.query('UPDATE creatures SET spells=$1 WHERE id=$2',
        [JSON.stringify(next), c.id]);
    }
  }

  console.log(`${dryRun ? 'Would correct' : 'Corrected'} ${touchedSpells} spell(s) `
    + `on ${touchedCreatures} character sheet(s), from ${creatures.length} checked.`);
}

main().then(() => process.exit(0)).catch((err) => {
  console.error('fix_creature_spell_flags failed:', err.message);
  process.exit(1);
});
