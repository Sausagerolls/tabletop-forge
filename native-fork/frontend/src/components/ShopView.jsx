import React, { useMemo, useState } from 'react';
import CoinFields from './CoinFields.jsx';
import { coinsToCp, cpToCoins, coinsEntered, BLANK_COINS } from '../utils/coins.js';

// The shop, as the party sees it.
//
// One component for both screens. The desktop mounts it inside a modal and the
// phone mounts it full-bleed, and the only thing that differs is `compact` —
// which changes padding and stacking, not what anything does. A second mobile
// copy would be a second set of rules about what a purchase is.
//
// WHAT IS NOT HERE
//
// The real names and stats of disguised goods. The server strips those before
// the listing ever leaves it (see shopForPlayers), so this component could not
// leak them if it wanted to: "an old sword" arrives as an old sword, and the
// +1 shows up in the character's pack after the sale.
//
// PRICES ARE COPPER
//
// Everywhere, all the way down, converted only for display. See shops.js.

const CP_PER_GP = 100;
const CP_PER_SP = 10;

export function formatCp(total) {
  const n = Math.round(Number(total) || 0);
  if (n <= 0) return 'free';
  const gp = Math.floor(n / CP_PER_GP);
  const sp = Math.floor((n - gp * CP_PER_GP) / CP_PER_SP);
  const cp = n - gp * CP_PER_GP - sp * CP_PER_SP;
  return [gp && `${gp}gp`, sp && `${sp}sp`, cp && `${cp}cp`].filter(Boolean).join(' ');
}

function purseCp(creature) {
  return (Number(creature?.currency_gp) || 0) * CP_PER_GP
       + (Number(creature?.currency_sp) || 0) * CP_PER_SP
       + (Number(creature?.currency_cp) || 0);
}

// A one-line summary of whatever the shopkeeper is willing to show.
function statLine(stats) {
  if (!stats) return null;
  const bits = [];
  const dmg = (stats.damage_entries || []).filter((d) => d?.damage);
  if (dmg.length) bits.push(dmg.map((d) => `${d.damage} ${d.damage_type || ''}`.trim()).join(' + '));
  if (stats.weapon_range) bits.push(stats.weapon_range);
  if (stats.ac_base) bits.push(`AC ${stats.ac_base}`);
  if (stats.ac_bonus) bits.push(`+${stats.ac_bonus} AC`);
  if (stats.properties) bits.push(stats.properties);
  if (stats.mastery) bits.push(stats.mastery);
  if (stats.attunement_required) bits.push('attunement');
  if (stats.weight) bits.push(`${stats.weight} lb`);
  return bits.length ? bits.join(' · ') : null;
}

export default function ShopView({
  shop,
  creature,
  offer,                 // the party's offer currently on the table, if any
  onBuy,                 // (lines, offerCp|null, note) — copper, never gold
  onSell,                // (lines, askCp, note) — copper
  onCounterRespond,      // (offerId, accept)
  onWithdraw,            // (offerId) — the party takes an unanswered offer back
  onClose,
  compact = false,
}) {
  const [tab, setTab] = useState('buy');
  // How many of each listing the party wants. Absent means none.
  const [want, setWant] = useState({});           // shopItemId -> qty
  const [haggle, setHaggle] = useState({ ...BLANK_COINS });
  const [note, setNote] = useState('');
  // What they are putting on the table from their own packs.
  const [giving, setGiving] = useState({});       // inventory index -> qty
  const [askPrice, setAskPrice] = useState({ ...BLANK_COINS });

  const items = shop?.items || [];
  const inventory = useMemo(() => {
    const inv = creature?.inventory;
    if (Array.isArray(inv)) return inv;
    if (typeof inv === 'string') { try { return JSON.parse(inv) || []; } catch { return []; } }
    return [];
  }, [creature?.inventory]);

  const purse = purseCp(creature);

  const buyLines = useMemo(() => Object.entries(want)
    .filter(([, q]) => Number(q) > 0)
    .map(([id, q]) => ({ shopItemId: Number(id), qty: Number(q) })), [want]);

  const buyTotal = useMemo(() => {
    const byId = new Map(items.map((i) => [i.id, i]));
    return buyLines.reduce((sum, l) => sum + (byId.get(l.shopItemId)?.price_cp || 0) * l.qty, 0);
  }, [buyLines, items]);

  const sellLines = useMemo(() => Object.entries(giving)
    .filter(([, q]) => Number(q) > 0)
    .map(([i, q]) => ({
      index: Number(i),
      name: inventory[Number(i)]?.name || '',
      qty: Number(q),
      item: inventory[Number(i)] || null,
    })), [giving, inventory]);

  const pad = compact ? 'p-3' : 'p-4';
  const card = 'rounded-xl bg-gray-800/60 border border-gray-700';

  function setQty(map, setMap, key, next, max) {
    const n = Math.max(0, Math.min(max === -1 ? 99 : max, next));
    setMap({ ...map, [key]: n });
  }

  // ── The offer already on the table ────────────────────────────────────────
  const live = offer && (offer.status === 'pending' || offer.status === 'countered');

  return (
    <div className="flex flex-col h-full bg-gray-900 text-gray-100">
      <div className={`flex items-start gap-3 ${compact ? 'px-3 py-2.5' : 'px-4 py-3'} border-b border-gray-700 shrink-0`}>
        <div className="min-w-0 flex-1">
          <h2 className="text-dnd-gold font-semibold truncate">{shop?.name || 'Shop'}</h2>
          {shop?.blurb && <p className="text-[11px] text-gray-400 leading-snug mt-0.5">{shop.blurb}</p>}
        </div>
        {/* The purse, coin by coin rather than as one total. A shopper checking
            whether they can cover 2gp 5sp is comparing against what is in the
            pouch, and "182gp 2sp 2cp" run together as a sentence is not that. */}
        <span className="shrink-0 text-right">
          <span className="block text-[10px] uppercase tracking-wider text-gray-500 mb-0.5">You have</span>
          <span className="flex gap-1.5 justify-end tabular-nums">
            {[['gp', 'text-dnd-gold'], ['sp', 'text-gray-300'], ['cp', 'text-amber-700']].map(([k, tone]) => (
              <span key={k} className="px-1.5 py-0.5 rounded-md bg-gray-800 border border-gray-700 text-[11px]">
                <b className="text-gray-100">{cpToCoins(purse)[k]}</b>
                <span className={`ml-0.5 font-semibold ${tone}`}>{k}</span>
              </span>
            ))}
          </span>
        </span>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-gray-300 text-xs hover:bg-gray-700"
          >Close</button>
        )}
      </div>

      {/* An offer in flight owns the screen: it is the only thing that can
          happen next, and burying it under the stock list is how a counter
          goes unnoticed while the party keeps shopping. */}
      {live && (
        <div className={`m-3 ${card} p-3 border-amber-700/70 bg-amber-950/40`}>
          {offer.status === 'pending' && (
            <>
              <p className="text-[13px] text-amber-100">
                Waiting on the shopkeeper…
                {offer.offer_cp != null && <> You offered <b>{formatCp(offer.offer_cp)}</b>.</>}
              </p>
              {/* A way out. An offer blocks every other purchase until it is
                  answered, and the GM may simply not be looking at this screen
                  — so the party must be able to take it back themselves rather
                  than wait on someone who does not know they are waiting. */}
              <button
                type="button"
                onClick={() => onWithdraw?.(offer.id)}
                className="mt-2 px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700
                           text-gray-300 text-[12px] active:bg-gray-700"
              >Take it back</button>
            </>
          )}
          {offer.status === 'countered' && (
            <>
              <p className="text-[13px] text-amber-100">
                They say <b>{formatCp(offer.counter_cp)}</b>.
                {offer.counter_note ? ` “${offer.counter_note}”` : ''}
              </p>
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => onCounterRespond?.(offer.id, true)}
                  className="flex-1 py-2 rounded-lg bg-dnd-gold text-gray-900 font-semibold text-sm active:brightness-110"
                >Agree</button>
                <button
                  type="button"
                  onClick={() => onCounterRespond?.(offer.id, false)}
                  className="flex-1 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-200 text-sm active:bg-gray-700"
                >Walk away</button>
              </div>
            </>
          )}
        </div>
      )}

      <div className={`flex gap-1 ${compact ? 'px-3' : 'px-4'} pt-3 shrink-0`}>
        <button
          type="button"
          onClick={() => setTab('buy')}
          className={`px-3 py-2 rounded-xl text-sm font-semibold ${
            tab === 'buy' ? 'bg-dnd-gold text-gray-900' : 'bg-gray-800 text-gray-300'}`}
        >Buy</button>
        {shop?.allow_selling && (
          <button
            type="button"
            onClick={() => setTab('sell')}
            className={`px-3 py-2 rounded-xl text-sm font-semibold ${
              tab === 'sell' ? 'bg-dnd-gold text-gray-900' : 'bg-gray-800 text-gray-300'}`}
          >Sell</button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
        {tab === 'buy' && (
          <div className={`${pad} space-y-2`}>
            {items.length === 0 && <p className="text-sm text-gray-500">Nothing for sale right now.</p>}
            {items.map((it) => {
              const n = Number(want[it.id]) || 0;
              const soldOut = it.qty === 0;
              const stats = statLine(it.stats);
              return (
                <div key={it.id} className={`${card} p-3 ${soldOut ? 'opacity-50' : ''}`}>
                  <div className="flex items-baseline gap-2">
                    <span className="flex-1 min-w-0 text-[15px] truncate">{it.name}</span>
                    <span className="text-[13px] text-dnd-gold font-semibold shrink-0">{formatCp(it.price_cp)}</span>
                  </div>
                  {/* Stock, per listing, as a count — never folded into the
                      name. Four potions is one potion with a 4 on it. */}
                  <div className="text-[11px] text-gray-500 mt-0.5">
                    {it.qty === -1 ? 'plenty in stock' : soldOut ? 'sold out' : `Qty ${it.qty}`}
                  </div>
                  {it.desc && <p className="text-[12px] text-gray-400 mt-1 leading-snug">{it.desc}</p>}
                  {stats && <p className="text-[11px] text-gray-500 mt-1 leading-snug">{stats}</p>}
                  {!soldOut && (
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => setQty(want, setWant, it.id, n - 1, it.qty)}
                        className="w-9 h-9 rounded-lg bg-gray-900 border border-gray-700 text-gray-300 active:bg-gray-700"
                      >−</button>
                      <span className="w-8 text-center tabular-nums text-[15px]">{n}</span>
                      <button
                        type="button"
                        onClick={() => setQty(want, setWant, it.id, n + 1, it.qty)}
                        className="w-9 h-9 rounded-lg bg-gray-900 border border-gray-700 text-gray-300 active:bg-gray-700"
                      >+</button>
                      {n > 0 && (
                        <span className="text-[11px] text-gray-500 ml-1">
                          {formatCp(it.price_cp * n)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {tab === 'sell' && (
          <div className={`${pad} space-y-2`}>
            {inventory.length === 0 && <p className="text-sm text-gray-500">Your pack is empty.</p>}
            {inventory.map((it, i) => {
              const have = Math.max(1, Number(it.qty) || 1);
              const n = Number(giving[i]) || 0;
              return (
                <div key={`${i}-${it.name}`} className={`${card} p-3`}>
                  <div className="flex items-baseline gap-2">
                    <span className="flex-1 min-w-0 text-[15px] truncate">{it.name || 'Unnamed item'}</span>
                    <span className="text-[11px] text-gray-500 shrink-0">you have {have}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => setQty(giving, setGiving, i, n - 1, have)}
                      className="w-9 h-9 rounded-lg bg-gray-900 border border-gray-700 text-gray-300 active:bg-gray-700"
                    >−</button>
                    <span className="w-8 text-center tabular-nums text-[15px]">{n}</span>
                    <button
                      type="button"
                      onClick={() => setQty(giving, setGiving, i, n + 1, have)}
                      className="w-9 h-9 rounded-lg bg-gray-900 border border-gray-700 text-gray-300 active:bg-gray-700"
                    >+</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* The basket, pinned. What is being proposed and what it costs should
          not require scrolling back to find. */}
      <div className={`border-t border-gray-700 ${compact ? 'p-3' : 'p-4'} shrink-0 space-y-2 bg-gray-900`}
           style={compact ? { paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' } : undefined}>
        {tab === 'buy' && (
          <>
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-gray-400">
                {buyLines.length === 0 ? 'Nothing selected'
                  : `${buyLines.reduce((n, l) => n + l.qty, 0)} item${buyLines.reduce((n, l) => n + l.qty, 0) === 1 ? '' : 's'}`}
              </span>
              <span className="text-gray-100 font-semibold">
                {buyLines.length ? formatCp(buyTotal) : '—'}
              </span>
            </div>
            {buyTotal > purse && buyLines.length > 0 && (
              <p className="text-[11px] text-amber-300">That is more than you are carrying.</p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                disabled={!buyLines.length || live}
                onClick={() => { onBuy?.(buyLines, null, ''); setWant({}); }}
                className="flex-1 py-2.5 rounded-xl bg-dnd-gold text-gray-900 font-semibold text-sm
                           active:brightness-110 disabled:opacity-40"
              >{buyLines.length ? `Buy · ${formatCp(buyTotal)}` : 'Buy'}</button>
            </div>
            {shop?.allow_haggle && (
              <div className="flex gap-2 items-start">
                <div className="flex-1 min-w-0">
                  <CoinFields
                    size="sm"
                    showTotal={false}
                    value={haggle}
                    onChange={setHaggle}
                    disabled={live}
                  />
                </div>
                <button
                  type="button"
                  disabled={!buyLines.length || !coinsEntered(haggle) || live}
                  onClick={() => {
                    onBuy?.(buyLines, coinsToCp(haggle), note);
                    setHaggle({ ...BLANK_COINS }); setNote(''); setWant({});
                  }}
                  className="px-3 py-2 rounded-xl bg-gray-800 border border-gray-700 text-gray-200 text-sm
                             active:bg-gray-700 disabled:opacity-40 shrink-0"
                >Haggle</button>
              </div>
            )}
          </>
        )}

        {tab === 'sell' && (
          <>
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-gray-400">
                {sellLines.length === 0 ? 'Nothing offered'
                  : `${sellLines.reduce((n, l) => n + l.qty, 0)} item${sellLines.reduce((n, l) => n + l.qty, 0) === 1 ? '' : 's'}`}
              </span>
            </div>
            <div className="flex gap-2 items-start">
              <div className="flex-1 min-w-0">
                <CoinFields
                  size="sm"
                  label="Asking"
                  showTotal={false}
                  value={askPrice}
                  onChange={setAskPrice}
                  disabled={live}
                />
              </div>
              <button
                type="button"
                disabled={!sellLines.length || !coinsEntered(askPrice) || live}
                onClick={() => {
                  onSell?.(sellLines, coinsToCp(askPrice), note);
                  setAskPrice({ ...BLANK_COINS }); setNote(''); setGiving({});
                }}
                className="px-4 py-2 rounded-xl bg-dnd-gold text-gray-900 font-semibold text-sm
                           active:brightness-110 disabled:opacity-40 shrink-0 self-end"
              >Offer</button>
            </div>
          </>
        )}

        {live && <p className="text-[11px] text-gray-500">Settle the offer on the table first.</p>}
      </div>
    </div>
  );
}
