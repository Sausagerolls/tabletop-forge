// fix_second_wind_text.js — stop a feature's text baking in a level.
//
//   docker compose exec backend node src/fix_second_wind_text.js --dry-run
//   docker compose exec backend node src/fix_second_wind_text.js
//
// Second Wind restores "1d10 plus your Fighter level" hit points. Some sheets
// carry an older import that resolved the level AT THE TIME OF WRITING and
// froze it — a level 4 fighter still reading "1d10 + 1", because that was true
// when the row was created. A feature description must not hold a number that
// goes stale the next time the character levels.
//
// Only rows named Second Wind are touched, and only where the text carries a
// literal "1d10 + <number>". A monster's "1d10 + 3" bite is left alone.
const db = require('./db');

// The current catalogue wording, matching data/subclasses.js.
const CORRECT = 'As a Bonus Action, you can regain Hit Points equal to 1d10 plus your Fighter level.\n\n'
  + 'You can use this twice. You regain one expended use on a Short Rest, and all of them on a Long Rest. '
  + 'You gain a third use at level 4 and a fourth at level 10.';

const LISTS = ['special_abilities', 'actions', 'bonus_actions', 'reactions', 'class_features'];
const STALE = /1d10\s*\+\s*\d+/i;

function asArray(raw) {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string' && raw.trim().startsWith('[')) {
    try { return JSON.parse(raw) || []; } catch { return []; }
  }
  return [];
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const rows = (await db.query(
    `SELECT id, name, char_class, char_level, ${LISTS.join(', ')} FROM creatures`
  )).rows;

  let fixed = 0;
  for (const c of rows) {
    const patch = {};
    for (const key of LISTS) {
      const list = asArray(c[key]);
      if (!list.length) continue;
      let changed = false;
      const next = list.map((row) => {
        if (String(row?.name || '').trim().toLowerCase() !== 'second wind') return row;
        const desc = String(row.desc || row.description || '');
        if (!STALE.test(desc)) return row;
        changed = true;
        console.log(`  ${c.name} (${c.id}, ${c.char_class || '?'} ${c.char_level || '?'}) · ${key}: `
          + `"${desc.match(STALE)[0]}" → "1d10 plus your Fighter level"`);
        return { ...row, desc: CORRECT };
      });
      if (changed) patch[key] = next;
    }
    const keys = Object.keys(patch);
    if (!keys.length) continue;
    fixed++;
    if (!dryRun) {
      const sets = keys.map((k, i) => `${k}=$${i + 1}`).join(', ');
      await db.query(
        `UPDATE creatures SET ${sets} WHERE id=$${keys.length + 1}`,
        [...keys.map((k) => JSON.stringify(patch[k])), c.id]
      );
    }
  }
  console.log(`${dryRun ? 'Would correct' : 'Corrected'} Second Wind on ${fixed} sheet(s), from ${rows.length} checked.`);
}

main().then(() => process.exit(0)).catch((err) => {
  console.error('fix_second_wind_text failed:', err.message);
  process.exit(1);
});
