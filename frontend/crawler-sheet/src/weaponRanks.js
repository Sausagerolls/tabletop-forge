// Weapon ranks (rules/weapon-ranks.md): bonuses, traits, upgrade costs, Heavy Hands.
export const RANK_BONUS = [0, 0, 1, 1, 2, 3];
export const RANK_DICE = [0, 0, 0, 1, 1, 2];
export const TRAIT_SLOTS = [0, 0, 1, 1, 2, 3];
export const TRAITS = ['Keen', 'Elemental (Fire)', 'Elemental (Cold)', 'Elemental (Lightning)', 'Elemental (Thunder)', 'Elemental (Acid)',
  'Elemental (Radiant)', 'Elemental (Necrotic)', 'Brutal', 'Heavy Hitter', 'Vampiric', 'Bane', 'Long Arm', 'Quickdraw', 'Returning', 'Sundering', 'Highlight Reel'];
// Workbench cost to reach each rank: gold, materials ([type, tier, count]; 'Part' = Scrap or Monster Part), floor turns.
export const UPGRADE = [null, null,
  { gold: 100, mats: [['Part', 1, 2]], turns: 4 },
  { gold: 500, mats: [['Part', 2, 2], ['Essence', 1, 1]], turns: 8 },
  { gold: 2500, mats: [['Part', 3, 2], ['Essence', 2, 2]], turns: 16 },
  { gold: 12000, mats: [['Part', 4, 2], ['Essence', 3, 2], ['Trophy Part', 3, 1]], turns: 32 }];
export const matsText = (u) => u.mats.map(([t, tier, n]) => `${t === 'Part' ? 'Scrap or Monster Part' : t} (T${tier}) ×${n}`).join(', ');
// Heavy Hands: +1 weapon die at an ability modifier of +8, and one more per 3 above that.
export const heavyDice = (mod) => (mod >= 8 ? 1 + Math.floor((mod - 8) / 3) : 0);
export const addDice = (expr, n) => (n ? String(expr).replace(/^(\d+)d(\d+)/, (_, c, s) => `${Number(c) + n}d${s}`) : expr);

// Pay for an upgrade from the crawler's gold and materials; returns an error string or null.
export function payUpgrade(s, rank, armory) {
  const u = UPGRADE[rank];
  const gold = Math.ceil(u.gold * (armory ? 1.5 : 1));
  if ((Number(s.gold) || 0) < gold) return `Needs ${gold} gp.`;
  const mats = { ...(s.materials || {}) };
  for (const [t, tier, n] of u.mats) {
    let need = n;
    for (const type of t === 'Part' ? ['Scrap', 'Monster Part'] : [t]) {
      const k = `${type}|${tier}`; const take = Math.min(need, mats[k] || 0); mats[k] = (mats[k] || 0) - take; need -= take;
    }
    if (need > 0) return `Needs ${matsText({ mats: [[t, tier, n]] })}.`;
  }
  s.gold = (Number(s.gold) || 0) - gold;
  s.materials = mats;
  return null;
}
