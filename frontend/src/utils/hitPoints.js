// Hit points a character gets from FEATURES rather than from hit dice.
//
// A level 6 dwarf fighter with Tough has 18 hit points that come from neither
// their hit die nor their Constitution — 12 from the feat, 6 from the species —
// and the sheet has one box to type a total into. Nothing on the screen said
// where that total should have come from, so the number was either worked out
// on paper every level-up or quietly wrong.
//
// MATCHED ON THE FEATURE'S NAME, deliberately. The alternative is parsing
// "Your hit point maximum increases by 1 and increases by 1 again whenever you
// gain a level" out of prose, which would quietly invent hit points the moment
// a homebrew trait was worded like one of these. A name that is not in the
// table contributes nothing, which is the safe way to be wrong.

// name → hit points per level, and the class whose level counts when the
// feature belongs to a class rather than to the character.
const PER_LEVEL = {
  'tough': { perLevel: 2 },
  'dwarven toughness': { perLevel: 1 },
  'draconic resilience': { perLevel: 1, class: 'Sorcerer' },
  // Hill Dwarf's trait is printed under the subrace's own name in some books.
  'dwarven resilience (hill)': { perLevel: 1 },
};

const norm = (s) => String(s || '').trim().toLowerCase();

function levelOf(creature, className) {
  const total = () => {
    let n = Math.max(1, Number(creature?.char_level) || 1);
    for (const mc of (Array.isArray(creature?.multiclasses) ? creature.multiclasses : [])) {
      n += Math.max(1, Number(mc?.level) || 1);
    }
    return n;
  };
  if (!className) return total();
  // A class feature counts that class's levels, not the character's: a
  // Sorcerer 3 / Fighter 5 gets 3 hit points from Draconic Resilience.
  let n = 0;
  if (norm(creature?.char_class) === norm(className)) n += Math.max(1, Number(creature?.char_level) || 1);
  for (const mc of (Array.isArray(creature?.multiclasses) ? creature.multiclasses : [])) {
    if (norm(mc?.class) === norm(className)) n += Math.max(1, Number(mc?.level) || 1);
  }
  return n;
}

const rowsOf = (raw) => {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string' && raw.trim().startsWith('[')) {
    try { return JSON.parse(raw) || []; } catch { return []; }
  }
  return [];
};

/**
 * Every feature on this sheet that raises the hit point maximum.
 *
 * @returns {{ rows: Array<{name, perLevel, levels, total, from}>, total: number }}
 */
export function featureHitPoints(creature) {
  const c = creature || {};
  // Where a feature can be written down: taken feats, species and background
  // traits, and anything a class granted.
  const sources = [
    ['feat', rowsOf(c.feats)],
    ['trait', rowsOf(c.special_abilities)],
    ['class', rowsOf(c.class_features)],
  ];

  const rows = [];
  const seen = new Set();
  for (const [from, list] of sources) {
    for (const entry of list) {
      const name = norm(entry?.name);
      const def = PER_LEVEL[name];
      if (!def || seen.has(name)) continue;
      const levels = levelOf(c, def.class);
      if (levels < 1) continue;                 // a class they do not have
      seen.add(name);
      rows.push({
        name: String(entry.name).trim(),
        perLevel: def.perLevel,
        levels,
        total: def.perLevel * levels,
        from,
      });
    }
  }
  rows.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
  return { rows, total: rows.reduce((sum, r) => sum + r.total, 0) };
}

/**
 * The hit points a character would have if every hit die rolled its maximum.
 *
 * The books have you take the full die at level 1 and roll (or take the
 * average) after that. Every table that does not want the swing takes the
 * maximum throughout, which is the number this works out: the full die for
 * every level, plus Constitution for every level, plus whatever the features
 * add. The same arithmetic a player does on paper at a level-up, done once.
 *
 * `pool` is the hit dice in force — [{ type: 'd10', qty: 6 }] — because the
 * sheet already knows how to derive those from the classes and a monster's
 * printed formula, and working them out a second time here is how the two
 * answers drift.
 *
 * @returns {{ dice, conPerLevel, levels, con, features, bonus, total,
 *             rows: Array<{label, value}> }}
 */
export function maxHitPoints(creature, pool, hitDiceBonus = 0) {
  const c = creature || {};
  const rows = Array.isArray(pool) ? pool : [];

  let dice = 0;
  const diceParts = [];
  for (const row of rows) {
    const faces = Number(String(row?.type || row?.die || '').replace(/^d/i, '')) || 0;
    const qty = Math.max(0, Number(row?.qty) || 0);
    if (!faces || !qty) continue;
    dice += faces * qty;
    diceParts.push(`${qty}×${faces}`);
  }

  const conPerLevel = Math.floor(((Number(c.constitution) || 10) - 10) / 2);
  // Constitution applies once per HIT DIE, not per character level: they are
  // the same number for a single-classed character and the dice are what the
  // rules actually count.
  const levels = rows.reduce((n, r) => n + Math.max(0, Number(r?.qty) || 0), 0)
    || Math.max(1, Number(c.char_level) || 1);
  const con = conPerLevel * levels;

  const feats = featureHitPoints(c);
  const bonus = Math.trunc(Number(hitDiceBonus) || 0);

  // A floor of 1: a character with a dreadful Constitution still has a hit
  // point, and showing them 0 or less would be offering to kill them.
  const total = Math.max(1, dice + con + feats.total + bonus);

  return {
    dice,
    diceParts,
    conPerLevel,
    levels,
    con,
    features: feats.total,
    featureRows: feats.rows,
    bonus,
    total,
    rows: [
      { label: `Hit dice at maximum${diceParts.length ? ` (${diceParts.join(' + ')})` : ''}`, value: dice },
      { label: `Constitution ${conPerLevel >= 0 ? `+${conPerLevel}` : conPerLevel} × ${levels}`, value: con },
      ...feats.rows.map((r) => ({ label: `${r.name} (+${r.perLevel}/lvl × ${r.levels})`, value: r.total })),
      ...(bonus ? [{ label: 'Hit dice bonus', value: bonus }] : []),
    ],
  };
}
