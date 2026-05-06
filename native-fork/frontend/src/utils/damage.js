// Combine a weapon's stored damage-dice string with the wielder's
// stat modifier, returning a single rendered total. The dice string
// may already carry a flat bonus from a magical enchantment (e.g.
// "1d8 + 1" for a Battleaxe +1) — in that case the magical bonus is
// folded together with the stat modifier so the player sees one
// number instead of two:
//
//   "1d8"      + STR +3   →  "1d8 + 3"
//   "1d8 + 1"  + STR +3   →  "1d8 + 4"   (magical +1 absorbed)
//   "1d8 + 2"  + STR -1   →  "1d8 + 1"   (subtraction works)
//   "1d8 - 2"  + STR +2   →  "1d8"       (cancels cleanly)
//   ""         + anything →  ""          (no-damage weapons like Net)
export function formatDamageWithMod(damage, statMod) {
  const s = String(damage || '').trim();
  if (!s) return '';
  const m = s.match(/^(.+?)\s*([+-])\s*(\d+)\s*$/);
  let dice = s;
  let bonus = 0;
  if (m) {
    dice = m[1].trim();
    bonus = (m[2] === '-' ? -1 : 1) * Number(m[3]);
  }
  const total = bonus + (Number(statMod) || 0);
  if (total === 0) return dice;
  return `${dice} ${total > 0 ? '+' : '-'} ${Math.abs(total)}`;
}

// Damage types come out of the SRD lowercase ("slashing", "piercing").
// Render them title-cased so they read like 5e stat blocks. Handles
// multi-word types ("force / radiant") gracefully.
export function formatDamageType(t) {
  return String(t || '')
    .split(/(\s+|\/)/)
    .map((w) => (w.match(/^[a-z]/) ? w[0].toUpperCase() + w.slice(1) : w))
    .join('');
}
