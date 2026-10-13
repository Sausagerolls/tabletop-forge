// The eighteen skills, and what a character's modifier in each actually is.
//
// How the row stores them, which is not obvious: `skill_<name>` holds the
// FINISHED modifier — ability modifier plus proficiency, doubled for expertise —
// and is NULL when the character is not proficient. Nothing stores the plain
// ability-only number, because for an unproficient skill there is nothing to
// store: it is just the ability modifier, derived on the spot.
//
// So a full list cannot be read off the columns alone. A screen that printed only
// the non-null ones would show a rogue's four skills and silently omit the other
// fourteen the player is still perfectly entitled to roll.
//
// `skill_expertise` is a separate map of flags, set alongside the doubled number,
// and is the only way to tell expertise from ordinary proficiency after the fact —
// comparing the stored number against ability + 2 × proficiency would also match
// a GM who typed that figure in by hand.
//
// CreatureForm carries its own copy of this list (SKILLS / STAT_OF_SKILL) for its
// editor. It is not rewired here: that file is large, its copy is identical, and
// swapping constants under it is a separate change from adding a screen. If the
// two ever disagree, this is the one the player's phone reads.

export const SKILLS = [
  { key: 'skill_acrobatics',      label: 'Acrobatics',      stat: 'dexterity',     abbr: 'DEX' },
  { key: 'skill_animal_handling', label: 'Animal Handling', stat: 'wisdom',        abbr: 'WIS' },
  { key: 'skill_arcana',          label: 'Arcana',          stat: 'intelligence',  abbr: 'INT' },
  { key: 'skill_athletics',       label: 'Athletics',       stat: 'strength',      abbr: 'STR' },
  { key: 'skill_deception',       label: 'Deception',       stat: 'charisma',       abbr: 'CHA' },
  { key: 'skill_history',         label: 'History',         stat: 'intelligence',  abbr: 'INT' },
  { key: 'skill_insight',         label: 'Insight',         stat: 'wisdom',        abbr: 'WIS' },
  { key: 'skill_intimidation',    label: 'Intimidation',    stat: 'charisma',       abbr: 'CHA' },
  { key: 'skill_investigation',   label: 'Investigation',   stat: 'intelligence',  abbr: 'INT' },
  { key: 'skill_medicine',        label: 'Medicine',        stat: 'wisdom',        abbr: 'WIS' },
  { key: 'skill_nature',          label: 'Nature',          stat: 'intelligence',  abbr: 'INT' },
  { key: 'skill_perception',      label: 'Perception',      stat: 'wisdom',        abbr: 'WIS' },
  { key: 'skill_performance',     label: 'Performance',     stat: 'charisma',       abbr: 'CHA' },
  { key: 'skill_persuasion',      label: 'Persuasion',      stat: 'charisma',       abbr: 'CHA' },
  { key: 'skill_religion',        label: 'Religion',        stat: 'intelligence',  abbr: 'INT' },
  { key: 'skill_sleight_of_hand', label: 'Sleight of Hand', stat: 'dexterity',     abbr: 'DEX' },
  { key: 'skill_stealth',         label: 'Stealth',         stat: 'dexterity',     abbr: 'DEX' },
  { key: 'skill_survival',        label: 'Survival',        stat: 'wisdom',        abbr: 'WIS' },
];

// The six saving throws. Stored exactly like skills — `save_str` holds the
// finished modifier and is NULL when the character is not proficient — so the
// same caveat applies: the columns alone cannot tell you what a character rolls
// for a Dexterity save, only whether they are good at it.
export const SAVES = [
  { key: 'save_str', label: 'Strength',     abbr: 'STR', stat: 'strength' },
  { key: 'save_dex', label: 'Dexterity',    abbr: 'DEX', stat: 'dexterity' },
  { key: 'save_con', label: 'Constitution', abbr: 'CON', stat: 'constitution' },
  { key: 'save_int', label: 'Intelligence', abbr: 'INT', stat: 'intelligence' },
  { key: 'save_wis', label: 'Wisdom',       abbr: 'WIS', stat: 'wisdom' },
  { key: 'save_cha', label: 'Charisma',     abbr: 'CHA', stat: 'charisma' },
];

export function abilityMod(score) {
  return Math.floor(((Number(score) || 10) - 10) / 2);
}

/**
 * Flat, feature-granted bonuses to named skills.
 *
 * A Druid's Primal Order (Magician) adds their Wisdom modifier to Intelligence
 * (Arcana or Nature) checks; a Cleric's Divine Order (Thaumaturge) does the
 * same for Arcana and Religion. These are not proficiency, so they cannot live
 * in the `skill_<name>` column: that column is null for an untrained skill,
 * and the bonus applies trained or not. They are recorded when the class
 * choice is applied, as `class_state.added.skill_bonuses`, and resolved here
 * against the CURRENT ability score so raising Wisdom raises the bonus.
 *
 * @returns {Map<string, {total:number, sources:Array<{label:string,bonus:number}>}>}
 */
export function featureSkillBonuses(creature) {
  const c = creature || {};
  const out = new Map();
  const states = [
    c.class_state,
    ...((Array.isArray(c.multiclasses) ? c.multiclasses : []).map((m) => m?.class_state)),
  ];
  for (const st of states) {
    for (const sb of (st?.added?.skill_bonuses || [])) {
      const statKey = String(sb?.ability || '').toLowerCase();
      if (!statKey || !Array.isArray(sb.skills)) continue;
      const bonus = Math.max(Number(sb.min) || 0, abilityMod(c[statKey]));
      if (!bonus) continue;
      for (const key of sb.skills) {
        const row = out.get(key) || { total: 0, sources: [] };
        row.total += bonus;
        row.sources.push({ label: sb.label || 'Class feature', bonus });
        out.set(key, row);
      }
    }
  }
  return out;
}

/**
 * Extra cantrips a class choice granted, across every class on the sheet.
 *
 * A Druid who took Primal Order (Magician) knows one cantrip more than the
 * class table lists. The choice records it as `class_state.added.cantrip_bonus`
 * rather than as a named spell, because the player still picks which cantrip.
 */
export function featureCantripBonus(creature) {
  const c = creature || {};
  const states = [
    c.class_state,
    ...((Array.isArray(c.multiclasses) ? c.multiclasses : []).map((m) => m?.class_state)),
  ];
  let total = 0;
  for (const st of states) total += Number(st?.added?.cantrip_bonus) || 0;
  return total;
}

/**
 * Every skill, with the modifier to roll and where it came from.
 *
 * @param {object} creature  a creature row (or a wild-shape form — a bear's
 *                           Athletics is the bear's, not the druid's)
 * @returns {Array<{key,label,stat,abbr,mod,prof,ability,bonus,bonusSources}>}
 *          `prof` is 'none' | 'proficient' | 'expertise'
 */
export function skillRows(creature) {
  const c = creature || {};
  const expertise = (c.skill_expertise && typeof c.skill_expertise === 'object') ? c.skill_expertise : {};
  const bonuses = featureSkillBonuses(c);
  return SKILLS.map((s) => {
    const ability = abilityMod(c[s.stat]);
    const stored = c[s.key];
    const trained = stored !== null && stored !== undefined && stored !== '';
    const extra = bonuses.get(s.key) || null;
    const base = trained ? Number(stored) : ability;
    return {
      ...s,
      kind: 'skill',
      ability,
      mod: base + (extra ? extra.total : 0),
      bonus: extra ? extra.total : 0,
      bonusSources: extra ? extra.sources : [],
      prof: trained ? (expertise[s.key] ? 'expertise' : 'proficient') : 'none',
    };
  });
}

/** "+3" / "−1" — a signed modifier, with a real minus sign. */
export function signedMod(n) {
  const v = Number(n) || 0;
  return v < 0 ? `−${Math.abs(v)}` : `+${v}`;
}

/**
 * Passive score for a skill: 10 + the modifier.
 *
 * Advantage and disadvantage shift a passive score by ±5 rather than being
 * rolled, which is why this takes a mode at all.
 */
export function passiveScore(mod, mode = null) {
  const base = 10 + (Number(mod) || 0);
  if (mode === 'advantage') return base + 5;
  if (mode === 'disadvantage') return base - 5;
  return base;
}

/**
 * The six abilities: the score, the modifier, and the saving throw.
 *
 * `kind: 'save'` travels with the row so a caller can label the roll correctly
 * without having to remember which list it came from — a save is announced as
 * "Dexterity saving throw", a skill as "Acrobatics check", and getting that
 * wrong in the shared log is how the table ends up arguing about what was rolled.
 *
 * @returns {Array<{key,label,abbr,stat,score,ability,mod,prof,kind}>}
 */
export function saveRows(creature) {
  const c = creature || {};
  return SAVES.map((sv) => {
    const score = Number(c[sv.stat]) || 10;
    const ability = abilityMod(score);
    const stored = c[sv.key];
    const trained = stored !== null && stored !== undefined && stored !== '';
    return {
      ...sv,
      kind: 'save',
      score,
      ability,
      mod: trained ? Number(stored) : ability,
      prof: trained ? 'proficient' : 'none',
    };
  });
}
