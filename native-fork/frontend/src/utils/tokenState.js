// Shared readings of a token's state that more than one view has to agree on.
//
// The flat map and the 3D board draw the same board two ways. Anything they
// each decide for themselves is something they can eventually disagree about,
// and a token lying down in one view and standing in the other is exactly the
// kind of split nobody notices until it matters.

/**
 * Is this token off its feet?
 *
 * Three ways to end up on the floor, and they are deliberately ORed rather
 * than ranked:
 *
 *   * the `prone` condition, applied by the GM or by the player themselves;
 *   * hit points at zero — a creature that drops is Unconscious, and
 *     Unconscious carries Prone with it, so the board should not need the GM
 *     to tick a second box to show what the HP already says;
 *   * the GM's explicit dead flag, which outlives the HP (a corpse whose HP
 *     was later edited back up is still a corpse).
 *
 * Derived on read rather than written into `conditions` when HP hits zero.
 * Writing it would mean deciding what happens when the creature is healed —
 * silently removing a condition the GM may have applied by hand — and it would
 * only ever apply to tokens damaged after the feature shipped. Deriving it is
 * correct for every token already on every map.
 */
export function isTokenDown(token) {
  if (!token) return false;
  if (Array.isArray(token.conditions) && token.conditions.includes('prone')) return true;
  if (token.is_dead) return true;

  // HP only counts when it is genuinely being tracked. Scenery, markers and
  // any token whose HP was never set carry a null or zero max, and reading
  // "0 out of 0" as "unconscious" would lay every barrel and signpost on the
  // map flat the moment this shipped.
  const max = Number(token.max_hp) || 0;
  if (max <= 0) return false;
  const cur = token.current_hp;
  if (cur === null || cur === undefined || cur === '') return false;
  return Number(cur) <= 0;
}

/**
 * Bar colour for a hit-point fraction. Green above half, amber above a
 * quarter, red below.
 *
 * Lives here rather than in MapStage because the 3D view's hover card shows
 * the same bar: two copies would eventually disagree about where "hurt"
 * becomes "badly hurt", and the two views are meant to be one board.
 */
export function hpColor(cur, max) {
  if (!max) return '#22c55e';
  const p = cur / max;
  if (p >= 0.5) return '#22c55e';
  if (p >= 0.25) return '#f59e0b';
  return '#ef4444';
}

/**
 * What this viewer is allowed to read off a token.
 *
 * The single source for a rule that is genuinely a permission, not a styling
 * choice: the GM sees everything; a player sees only what the GM has left
 * visible, and never an NPC's exact hit points.
 *
 * Extracted so the 3D hover card cannot drift from the flat map's labels. A
 * second implementation of this would not fail loudly — it would fail by
 * quietly showing a player the boss's remaining HP, which is the kind of leak
 * nobody notices until it has already happened at the table.
 *
 * @param {object} token
 * @param {object} opts
 * @param {boolean} opts.isPlayer  true when the viewer is a player, not the GM
 */
export function tokenLabelInfo(token, { isPlayer = false } = {}) {
  const t = token || {};
  const isDead = !!t.is_dead;

  // Per-token suppression is players-only; the GM's own view is never
  // suppressed. Combat deliberately does NOT override it — see the note in
  // MapStage: that override made the GM's hide toggles useless during the
  // exact scene they exist for.
  const labelPublic = !isPlayer;
  const showName = labelPublic || !t.hide_name_from_players;
  const showHp   = labelPublic || !t.hide_hp_from_players;

  const max = Number(t.max_hp) || 0;
  const cur = Number(t.current_hp) || 0;
  const dmgTaken = Math.max(0, max - cur);

  // Death is public: the bar reads "Dead" even where the numbers would
  // otherwise be hidden. Below that, the GM gets exact values, a player gets
  // exact values for a PLAYER character, and for anything else only how much
  // damage it has taken — never its maximum, which is what would let the
  // table work out how much fight a monster has left in it.
  const hpText = isDead
    ? 'Dead'
    : !isPlayer
      ? `${cur}/${max}`
      : t.is_player
        ? `${cur}/${max} hp`
        : dmgTaken > 0
          ? `${dmgTaken} dmg`
          : null;

  return {
    showName,
    showHp,
    isDead,
    hpText,
    // The BAR is a proportion, and a proportion is information too — but it is
    // the same information the flat map has always shown under these rules,
    // so the hover card is not widening what anyone can see.
    hpPct: max > 0 ? Math.max(0, Math.min(1, cur / max)) : 0,
    hasHp: max > 0,
    name: t.nickname || t.name || '',
  };
}
