// fix_class_state_grants.js — re-apply class-choice grants that were added to
// the catalogue after a character was built.
//
// A class choice is applied ONCE, in the builder, and what it granted is frozen
// onto the character as `class_state.added`. That is deliberate — it is what
// lets the grant be reverted exactly — but it means a character built before
// the catalogue knew about a grant never receives it. Barney took Primal Order
// (Magician) when the choice recorded only its skill bonuses, so his sheet kept
// saying 2 cantrips after the extra one was wired up: the class table is read
// live, his `added` block is not.
//
// This walks every player character, looks at the choices they ALREADY made,
// and fills in any grant from the table below that is missing. It never removes
// anything and never changes a pick, so re-running it is a no-op.
//
//   node /app/src/fix_class_state_grants.js --dry-run
//   node /app/src/fix_class_state_grants.js
//   node /app/src/fix_class_state_grants.js --session PAJT82

const db = require('./db');

const DRY = process.argv.includes('--dry-run');
const sessionArg = (() => {
  const i = process.argv.indexOf('--session');
  return i > -1 ? process.argv[i + 1] : null;
})();

// What each choice grants, mirroring CLASS_CHOICES_2024 in
// frontend/src/data/classes.js. Only the grants that are STORED on the
// character belong here: proficiencies and traits are stored too, but those
// have always been written, so nothing is missing from them. Keep this in step
// with the catalogue when a choice gains something new.
const GRANTS = {
  'primal-order:magician': {
    cantrip_bonus: 1,
    skill_bonuses: [{
      skills: ['skill_arcana', 'skill_nature'],
      ability: 'wisdom',
      min: 1,
      label: 'Primal Order (Magician)',
    }],
  },
  'divine-order:thaumaturge': {
    cantrip_bonus: 1,
    skill_bonuses: [{
      skills: ['skill_arcana', 'skill_religion'],
      ability: 'wisdom',
      min: 1,
      label: 'Divine Order (Thaumaturge)',
    }],
  },
};

// A pick is stored as {kind:'single', option_id:'magician'} on current rows and
// as a bare string on older ones. Read both.
function optionIdOf(pick) {
  if (!pick) return '';
  if (typeof pick === 'string') return pick;
  return String(pick.option_id || pick.id || '');
}

// Fill `state.added` with anything the choices grant and it lacks. Returns the
// list of what was added, empty when the state was already complete.
function patchState(state) {
  if (!state || typeof state !== 'object') return [];
  const choices = state.choices || {};
  const added = state.added || (state.added = {});
  const notes = [];

  for (const [choiceId, pick] of Object.entries(choices)) {
    const grant = GRANTS[`${choiceId}:${optionIdOf(pick)}`];
    if (!grant) continue;

    if (grant.cantrip_bonus && !Number(added.cantrip_bonus)) {
      added.cantrip_bonus = Number(grant.cantrip_bonus);
      notes.push(`cantrip_bonus +${grant.cantrip_bonus}`);
    }
    for (const sb of (grant.skill_bonuses || [])) {
      const have = Array.isArray(added.skill_bonuses) ? added.skill_bonuses : (added.skill_bonuses = []);
      // Matched on the label: it names the feature, so the same feature can
      // never be recorded twice and a hand-edited bonus is left alone.
      if (have.some((x) => String(x?.label || '') === sb.label)) continue;
      have.push({ ...sb });
      notes.push(`skill bonus "${sb.label}"`);
    }
  }
  return notes;
}

async function main() {
  const params = [];
  let where = 'c.is_player_character = true';
  if (sessionArg) {
    params.push(sessionArg);
    where += ` AND EXISTS (
      SELECT 1 FROM session_tokens t JOIN sessions s ON s.id = t.session_id
       WHERE t.creature_id = c.id AND s.session_code = $1)`;
  }
  const rows = (await db.query(
    `SELECT c.id, c.name, c.char_class, c.class_state, c.multiclasses
       FROM creatures c WHERE ${where} ORDER BY c.id`,
    params
  )).rows;

  let changed = 0;
  for (const row of rows) {
    const state = row.class_state && typeof row.class_state === 'object' ? row.class_state : null;
    const mcs = Array.isArray(row.multiclasses) ? row.multiclasses : null;

    const notes = [];
    if (state) notes.push(...patchState(state));
    for (const mc of (mcs || [])) {
      for (const n of patchState(mc?.class_state)) notes.push(`${mc.class}: ${n}`);
    }
    if (!notes.length) continue;

    changed += 1;
    console.log(`${row.id} ${row.name} (${row.char_class || '—'}): ${notes.join(', ')}`);
    if (DRY) continue;
    await db.query(
      'UPDATE creatures SET class_state = $1, multiclasses = $2 WHERE id = $3',
      [JSON.stringify(state || {}), JSON.stringify(mcs || []), row.id]
    );
  }

  console.log(DRY
    ? `${changed} of ${rows.length} characters would change`
    : `${changed} of ${rows.length} characters updated`);
  await db.end?.();
}

main().catch((err) => { console.error(err); process.exit(1); });
