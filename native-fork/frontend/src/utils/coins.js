// Coins, shared by every screen that shows or takes a price.
//
// Money is stored and sent as an integer number of COPPER, always. Gold as a
// float is how somebody ends up owing 0.30000000000004 gold: a 7sp item bought
// three times has no exact representation in gold, and two clients rounding it
// differently is a disagreement about money.
//
// These are the client's copies of the same rules the server keeps in
// backend/src/shops.js. Both sides must agree, so both sides are kept plain.

export const CP_PER_SP = 10;
export const CP_PER_GP = 100;

/** Three denominations to a single copper total. */
export function coinsToCp({ gp, sp, cp } = {}) {
  return Math.max(0, Math.round(
    (Number(gp) || 0) * CP_PER_GP + (Number(sp) || 0) * CP_PER_SP + (Number(cp) || 0)
  ));
}

/**
 * A copper total spread back over the three coins, biggest first.
 *
 * 1,234cp is 12gp 3sp 4cp, which is how anyone actually carries money — not
 * 1,234 loose coppers.
 */
export function cpToCoins(total) {
  const t = Math.max(0, Math.round(Number(total) || 0));
  const gp = Math.floor(t / CP_PER_GP);
  const sp = Math.floor((t - gp * CP_PER_GP) / CP_PER_SP);
  return { gp, sp, cp: t - gp * CP_PER_GP - sp * CP_PER_SP };
}

/** "12gp 3sp", for a readout. Zero is "free", not an empty string. */
export function formatCp(total) {
  const n = Math.round(Number(total) || 0);
  if (n <= 0) return 'free';
  const { gp, sp, cp } = cpToCoins(n);
  return [gp && `${gp}gp`, sp && `${sp}sp`, cp && `${cp}cp`].filter(Boolean).join(' ');
}

/** What a character is carrying, in copper. */
export function purseCp(creature) {
  return coinsToCp({
    gp: creature?.currency_gp, sp: creature?.currency_sp, cp: creature?.currency_cp,
  });
}

/** The editable shape the coin fields work in — strings, so a box can be empty. */
export const BLANK_COINS = { gp: '', sp: '', cp: '' };

/** A copper total as something the coin fields can edit. Zero stays blank. */
export function coinsDraft(total) {
  const n = Math.round(Number(total) || 0);
  if (n <= 0) return { ...BLANK_COINS };
  const { gp, sp, cp } = cpToCoins(n);
  return { gp: gp ? String(gp) : '', sp: sp ? String(sp) : '', cp: cp ? String(cp) : '' };
}

/** Has the GM or player actually typed a price, as opposed to leaving it blank? */
export function coinsEntered(coins) {
  return ['gp', 'sp', 'cp'].some((k) => String(coins?.[k] ?? '').trim() !== '');
}
