// Dice: parse "2d6 + 3", roll it, and roll d20 tests with advantage, disadvantage and crits.
// Same behaviour as Tabletop Forge's player sheet: a crit doubles the dice, not the bonus.

const die = (sides) => 1 + Math.floor(Math.random() * sides);

// "1d8+3", "2d6 + 1d4 + 2", "1d4 + STR" (non-numeric tails are notes, ignored).
export function parseDice(expr) {
  const s = String(expr || '').replace(/\s+/g, '');
  const terms = [];
  let bonus = 0;
  const re = /([+-]?)(\d*)d(\d+)|([+-]?)(\d+)(?![d\d])/gi;
  let m;
  while ((m = re.exec(s))) {
    if (m[3]) terms.push({ n: Number(m[2] || 1), sides: Number(m[3]), neg: m[1] === '-' });
    else if (m[5]) bonus += (m[4] === '-' ? -1 : 1) * Number(m[5]);
  }
  return terms.length || bonus ? { terms, bonus } : null;
}

export function rollDamage(expr, { crit = false, extraBonus = 0 } = {}) {
  const p = parseDice(expr);
  if (!p) return null;
  const rolls = [];
  let total = p.bonus + extraBonus;
  for (const t of p.terms) {
    const count = t.n * (crit ? 2 : 1);
    for (let i = 0; i < count; i += 1) {
      const r = die(t.sides);
      rolls.push(`${r}${t.sides === 20 ? '' : ''}`);
      total += t.neg ? -r : r;
    }
  }
  const dice = p.terms.map((t) => `${t.neg ? '-' : ''}${t.n * (crit ? 2 : 1)}d${t.sides}`).join(' + ');
  const b = p.bonus + extraBonus;
  return { total: Math.max(0, total), detail: `${dice}${b ? (b > 0 ? ' + ' : ' − ') + Math.abs(b) : ''} → [${rolls.join(', ')}]${b ? ` ${b > 0 ? '+' : '−'} ${Math.abs(b)}` : ''}` };
}

export function rollD20(modifier = 0, mode = null) {
  const a = die(20), b = die(20);
  const kept = mode === 'adv' ? Math.max(a, b) : mode === 'dis' ? Math.min(a, b) : a;
  return {
    natural: kept,
    total: kept + modifier,
    crit: kept === 20,
    fumble: kept === 1,
    detail: mode ? `${mode === 'adv' ? 'Adv' : 'Dis'} [${a}, ${b}] → ${kept} ${modifier >= 0 ? '+' : '−'} ${Math.abs(modifier)}`
      : `d20 [${a}] ${modifier >= 0 ? '+' : '−'} ${Math.abs(modifier)}`,
  };
}
