import EditionTag from './EditionTag.jsx';
import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import CoinFields from './CoinFields.jsx';
import { formatCp, coinsToCp, coinsDraft, coinsEntered, BLANK_COINS } from '../utils/coins.js';

// The GM's side of the counter.
//
// One component for the desktop panel and the tablet, for the same reason
// ShopView is one component: what a sale IS must not depend on which screen the
// GM happened to be holding.
//
// The two halves are deliberately separate jobs. STOCK is preparation — done
// before the session, slowly, with the item library open. OFFERS are live, and
// arrive while the GM is doing something else, so they sit at the top and say
// what they are.

const ITEM_TYPES = ['item', 'weapon', 'armor', 'consumable'];

// What a shop listing needs on top of the item itself.
function blankListing(item) {
  return {
    item,
    playerName: '',
    playerDesc: '',
    showStats: true,
    priceCoins: { ...BLANK_COINS },
    qty: '1',
  };
}

export default function ShopPanel({
  sessionId,
  shops = [],
  shop,                 // the one being edited, with .items
  offers = [],
  onSelectShop,
  onSaveShop,
  onDeleteShop,
  onOpenShop,           // (shopId, open)
  onSaveItem,           // (listing, itemId|null)
  onRemoveItem,
  onRespond,            // (offerId, action, counterPrice, note)
  compact = false,
}) {
  const [name, setName] = useState('');
  const [blurb, setBlurb] = useState('');
  const [allowHaggle, setAllowHaggle] = useState(true);
  const [allowSelling, setAllowSelling] = useState(true);
  const [picking, setPicking] = useState(false);
  const [q, setQ] = useState('');
  const [found, setFound] = useState([]);
  const [draft, setDraft] = useState(null);      // a listing being added or edited

  // LOCK THE PAGE WHILE A FULL-SCREEN OVERLAY IS OPEN.
  //
  // The library picker and the listing editor are `position: fixed` over the
  // whole screen, but a fixed overlay does not stop the document behind it
  // scrolling. On a touch screen, flicking the list inside the picker chains
  // its momentum to the page once the list hits an end, so the sheet
  // underneath scrolls while you are looking at the picker — and when the
  // picker closes you are somewhere else entirely, with the shop's Close
  // button pushed off the screen. Hence both reports: scrolling going wrong
  // while adding items from a part-scrolled list, and Close then doing
  // nothing, which is the same fault seen from two angles.
  //
  // `overscroll-contain` on the lists stops the chaining; this stops the page
  // moving by any other route. Both are needed: Safari ignores the first in
  // some nested-scroller cases.
  const overlayOpen = picking || !!draft;
  useEffect(() => {
    if (!overlayOpen) return undefined;
    const body = document.body;
    const prevOverflow = body.style.overflow;
    const prevTouch = body.style.touchAction;
    body.style.overflow = 'hidden';
    body.style.touchAction = 'none';
    return () => {
      body.style.overflow = prevOverflow;
      body.style.touchAction = prevTouch;
    };
  }, [overlayOpen]);
  const [counters, setCounters] = useState({});  // offerId -> typed counter

  useEffect(() => {
    setName(shop?.name || '');
    setBlurb(shop?.blurb || '');
    setAllowHaggle(shop?.allow_haggle !== false);
    setAllowSelling(shop?.allow_selling !== false);
  }, [shop?.id, shop?.name, shop?.blurb, shop?.allow_haggle, shop?.allow_selling]);

  // The item library, so stock comes from the same place everything else does
  // and arrives with its stats attached rather than as a name and a number.
  useEffect(() => {
    if (!picking) return undefined;
    let dead = false;
    const t = setTimeout(() => {
      const qs = new URLSearchParams();
      if (q.trim()) qs.set('search', q.trim());
      qs.set('limit', '40');
      fetch(`/api/item-library?${qs}`)
        .then((r) => (r.ok ? r.json() : []))
        .then((rows) => { if (!dead) setFound(Array.isArray(rows) ? rows : (rows?.items || [])); })
        .catch(() => { if (!dead) setFound([]); });
    }, 220);
    return () => { dead = true; clearTimeout(t); };
  }, [picking, q]);

  const pending = useMemo(
    () => offers.filter((o) => o.status === 'pending' || o.status === 'countered'),
    [offers]
  );

  const card = 'rounded-xl bg-gray-800/60 border border-gray-700';
  const input = 'bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-2 text-sm text-gray-100 ' +
                'placeholder:text-gray-600 focus:outline-none focus:border-dnd-gold';

  // A library row, converted to the inventory shape the rest of the app uses.
  // Every field is carried across — this is the point of importing rather than
  // retyping: the +1 longsword keeps its dice, its properties and its
  // attunement all the way into the buyer's pack.
  function listingFromLibrary(row) {
    return blankListing({
      item_type: row.item_type || 'item',
      name: row.name || 'Item',
      qty: 1,
      weight: row.weight || '',
      desc: row.description || '',
      equipped: false,
      weapon_range: row.weapon_range || '',
      attack_stat: row.attack_stat || 'STR',
      attack_bonus_misc: Number(row.attack_bonus_misc) || 0,
      damage_bonus_misc: 0,
      damage_entries: Array.isArray(row.damage_entries) && row.damage_entries.length
        ? row.damage_entries.map((e) => ({ damage: e.damage || '', damage_type: e.damage_type || '' }))
        : [{ damage: '', damage_type: '' }],
      properties: row.properties || '',
      mastery: row.mastery || '',
      attunement_required: !!row.attunement,
      attuned: false,
      ac_base: Number(row.ac_base) || 0,
      ac_bonus: Number(row.ac_bonus) || 0,
      armor_category: row.armor_category || '',
      rarity: row.rarity || '',
      sheds_light: false, bright_ft: 0, dim_ft: 0,
    });
  }

  return (
    <div className={`${compact ? 'p-3' : 'p-4'} space-y-4 text-sm`}>
      {/* ── Offers on the table ──────────────────────────────────────────── */}
      {pending.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-xs uppercase tracking-wider text-amber-300/90">
            {pending.length} offer{pending.length === 1 ? '' : 's'} waiting
          </h3>
          {pending.map((o) => {
            const lines = Array.isArray(o.lines) ? o.lines : [];
            const counted = lines.reduce((n, l) => n + (Number(l.qty) || 1), 0);
            return (
              <div key={o.id} className={`${card} p-3 border-amber-800/60`}>
                <div className="flex items-baseline gap-2">
                  <span className="text-gray-100 font-semibold flex-1 min-w-0 truncate">
                    {o.player_name || 'A player'}
                  </span>
                  <span className="text-[11px] text-gray-400 shrink-0">
                    {o.kind === 'sell' ? 'selling' : 'buying'} {counted}
                  </span>
                </div>

                {/* What is actually changing hands. A sell offer carries the
                    items themselves; a buy offer names listings. */}
                <ul className="mt-1 space-y-0.5">
                  {lines.map((l, i) => (
                    <li key={i} className="text-[12px] text-gray-400">
                      {l.qty}× {l.name || shop?.items?.find((s) => s.id === l.shopItemId)?.item?.name
                        || shop?.items?.find((s) => s.id === l.shopItemId)?.player_name || 'item'}
                    </li>
                  ))}
                </ul>

                <p className="text-[13px] text-gray-200 mt-1.5">
                  {o.offer_cp != null
                    ? <>They offer <b className="text-dnd-gold">{formatCp(o.offer_cp)}</b></>
                    : <>At the asking price</>}
                  {o.status === 'countered' && o.counter_cp != null
                    && <> · you said <b className="text-dnd-gold">{formatCp(o.counter_cp)}</b></>}
                </p>
                {o.note && <p className="text-[12px] text-gray-500 italic mt-0.5">“{o.note}”</p>}

                {o.status === 'pending' && (
                  <>
                    <div className="flex gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => onRespond?.(o.id, 'accept')}
                        className="flex-1 py-2 rounded-lg bg-emerald-800 text-emerald-50 font-semibold text-sm active:bg-emerald-700"
                      >Accept</button>
                      <button
                        type="button"
                        onClick={() => onRespond?.(o.id, 'decline')}
                        className="flex-1 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-200 text-sm active:bg-gray-700"
                      >Decline</button>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <div className="flex-1 min-w-0">
                        <CoinFields
                          size="sm"
                          showTotal={false}
                          value={counters[o.id] || BLANK_COINS}
                          onChange={(c) => setCounters({ ...counters, [o.id]: c })}
                        />
                      </div>
                      <button
                        type="button"
                        disabled={!coinsEntered(counters[o.id])}
                        onClick={() => {
                          onRespond?.(o.id, 'counter', coinsToCp(counters[o.id]));
                          setCounters({ ...counters, [o.id]: { ...BLANK_COINS } });
                        }}
                        className="px-3 py-2 rounded-lg bg-dnd-gold text-gray-900 font-semibold text-sm
                                   active:brightness-110 disabled:opacity-40 shrink-0 self-start"
                      >Counter</button>
                    </div>
                  </>
                )}
                {o.status === 'countered' && (
                  <p className="text-[11px] text-gray-500 mt-2">Waiting for them to answer.</p>
                )}
              </div>
            );
          })}
        </section>
      )}

      {/* ── Which shop ───────────────────────────────────────────────────── */}
      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <select
            value={shop?.id || ''}
            onChange={(e) => onSelectShop?.(Number(e.target.value) || null)}
            className={`flex-1 min-w-0 ${input}`}
          >
            <option value="">— pick a shop —</option>
            {shops.map((sh) => (
              <option key={sh.id} value={sh.id}>{sh.name}{sh.is_open ? ' (open)' : ''}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => onSaveShop?.({ shopId: null, name: 'New shop', blurb: '', allowHaggle: true, allowSelling: true })}
            className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-dnd-gold text-sm active:bg-gray-700 shrink-0"
          >+ New</button>
        </div>

        {shop && (
          <div className={`${card} p-3 space-y-2`}>
            <input value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Shop name" className={`w-full ${input}`} />
            <textarea value={blurb} onChange={(e) => setBlurb(e.target.value)} rows={2}
              placeholder="What the party sees when they walk in…" className={`w-full ${input}`} />
            <div className="flex flex-wrap gap-3">
              <label className="flex items-center gap-1.5 text-[12px] text-gray-300">
                <input type="checkbox" checked={allowHaggle} onChange={(e) => setAllowHaggle(e.target.checked)} />
                Let them haggle
              </label>
              <label className="flex items-center gap-1.5 text-[12px] text-gray-300">
                <input type="checkbox" checked={allowSelling} onChange={(e) => setAllowSelling(e.target.checked)} />
                Buys from the party
              </label>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onSaveShop?.({ shopId: shop.id, name, blurb, allowHaggle, allowSelling })}
                className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-200 text-sm active:bg-gray-700"
              >Save</button>
              <button
                type="button"
                onClick={() => onOpenShop?.(shop.id, !shop.is_open)}
                className={`flex-1 py-2 rounded-lg font-semibold text-sm ${
                  shop.is_open
                    ? 'bg-emerald-800 text-emerald-50 active:bg-emerald-700'
                    : 'bg-dnd-gold text-gray-900 active:brightness-110'
                }`}
              >{shop.is_open ? 'Open on their screens — close it' : 'Send to the party'}</button>
            </div>
          </div>
        )}
      </section>

      {/* ── Stock ────────────────────────────────────────────────────────── */}
      {shop && (
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs uppercase tracking-wider text-gray-400">
              Stock ({shop.items?.length || 0})
            </h3>
            <div className="flex gap-1.5">
              {/* Not everything a shop sells is in the library — a local
                  brew, a map drawn on hide, a favour. Custom opens the same
                  editor with an empty item the GM names themselves. */}
              <button
                type="button"
                onClick={() => { setPicking(false); setDraft(blankListing({ item_type: 'item', name: '', qty: 1, desc: '' })); }}
                className="px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-dnd-gold text-[12px] active:bg-gray-700"
              >+ Custom</button>
              <button
                type="button"
                onClick={() => { setPicking(true); setDraft(null); }}
                className="px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-dnd-gold text-[12px] active:bg-gray-700"
              >+ From library</button>
            </div>
          </div>

          {(shop.items || []).map((row) => {
            const item = typeof row.item === 'string' ? JSON.parse(row.item) : (row.item || {});
            return (
              <div key={row.id} className={`${card} p-3`}>
                <div className="flex items-baseline gap-2">
                  <span className="flex-1 min-w-0 truncate text-gray-100">{item.name || 'Item'}</span>
                  <span className="text-[13px] text-dnd-gold shrink-0">{formatCp(row.price_cp)}</span>
                </div>
                <div className="text-[11px] text-gray-500">
                  {row.qty === -1 ? 'unlimited' : `Qty ${row.qty}`}
                  {row.player_name && <> · shown as “{row.player_name}”</>}
                  {!row.show_stats && <> · stats hidden</>}
                </div>
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setDraft({
                      id: row.id,
                      item,
                      playerName: row.player_name || '',
                      playerDesc: row.player_desc || '',
                      showStats: row.show_stats !== false,
                      priceCoins: coinsDraft(row.price_cp),
                      qty: row.qty === -1 ? '' : String(row.qty),
                    })}
                    className="px-3 py-1.5 rounded-lg bg-gray-900 border border-gray-700 text-gray-200 text-[12px] active:bg-gray-700"
                  >Edit</button>
                  <button
                    type="button"
                    onClick={() => onRemoveItem?.(row.id)}
                    className="px-3 py-1.5 rounded-lg bg-gray-900 border border-gray-700 text-gray-400 text-[12px] active:bg-gray-700"
                  >Remove</button>
                </div>
              </div>
            );
          })}
          {(shop.items || []).length === 0 && (
            <p className="text-[12px] text-gray-500">Nothing on the shelves yet.</p>
          )}
        </section>
      )}

      {/* ── The library picker ───────────────────────────────────────────── */}
      {/* PORTALLED TO THE BODY, NOT LEFT INSIDE THE SHEET.
          Rendered in place, these overlays are descendants of the GM's bottom
          sheet, which is itself a fixed z-40 layer. They painted over the
          sheet, so they looked right — but the sheet's own Close button was
          still sitting underneath, a few pixels from this one, and a tap that
          landed on it hit whichever library row had scrolled under it instead.
          That is the "tap goes right through to the list behind" report.
          On the body there is one full-screen layer and one Close to hit. */}
      {picking && createPortal((
        <div className="fixed inset-0 z-[200] flex flex-col bg-gray-900 h-[100dvh]">
          <div className="px-3 py-2.5 border-b border-gray-700 flex items-center gap-2 shrink-0">
            <h3 className="text-dnd-gold font-semibold flex-1">Add from the item library</h3>
            <button type="button" onClick={() => setPicking(false)}
              className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-300 text-sm">Close</button>
          </div>
          <div className="p-3 shrink-0">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search items…"
              className={`w-full ${input}`} />
          </div>
          {/* min-h-0 is what makes this scroll at all.
              A flex child defaults to min-height:auto, so it refuses to shrink
              below its content — the list grew the column instead of
              scrolling, and everything past the fold sat under the edge of a
              fixed inset-0 overlay with no way to reach it. */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] divide-y divide-gray-800"
               style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
            {found.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => { setDraft(listingFromLibrary(row)); setPicking(false); }}
                className="w-full text-left px-3 py-2.5 active:bg-gray-800 flex items-baseline gap-2"
              >
                <span className="flex-1 min-w-0">
                  <span className="block truncate text-gray-100">{row.name}</span>
                  <span className="block text-[11px] text-gray-500 truncate">
                    {row.item_type}{row.rarity ? ` · ${row.rarity}` : ''}{row.cost ? ` · ${row.cost}` : ''}
                    {row.edition ? <EditionTag edition={row.edition} source={row.source} className="ml-1.5 align-middle" /> : null}
                  </span>
                </span>
                <span className="text-[11px] text-dnd-gold shrink-0">Add</span>
              </button>
            ))}
            {found.length === 0 && <p className="px-3 py-3 text-[12px] text-gray-500">Nothing matches.</p>}
          </div>
        </div>
      ), document.body)}

      {/* ── One listing ──────────────────────────────────────────────────── */}
      {draft && createPortal((
        <div className="fixed inset-0 z-[200] flex flex-col bg-gray-900 h-[100dvh]">
          <div className="px-3 py-2.5 border-b border-gray-700 flex items-center gap-2 shrink-0">
            <h3 className="text-dnd-gold font-semibold flex-1 truncate">{draft.item?.name || 'New item'}</h3>
            <button type="button" onClick={() => setDraft(null)}
              className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-300 text-sm">Cancel</button>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] p-3 space-y-3"
               style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
            {/* The item itself. Shown for a custom listing, where it is the
                only place the thing gets a name, and for a library pick too:
                the listing holds a COPY, so renaming "Potion of Healing" to
                "a dusty, half-corked potion" changes this shelf and nothing
                in the library. */}
            <div className="space-y-2 rounded-xl border border-gray-700 bg-gray-800/40 p-2.5">
                <label className="space-y-1 block">
                <span className="block text-[11px] text-gray-400">What it is</span>
                <input
                  value={draft.item?.name || ''}
                  onChange={(e) => setDraft({ ...draft, item: { ...draft.item, name: e.target.value } })}
                  placeholder="Bottle of Old Hollow cider"
                  className={`w-full ${input}`}
                />
                </label>
                <div className="grid grid-cols-2 gap-2">
                <label className="space-y-1 block">
                  <span className="block text-[11px] text-gray-400">Kind</span>
                  <select
                    value={draft.item?.item_type || 'item'}
                    onChange={(e) => setDraft({ ...draft, item: { ...draft.item, item_type: e.target.value } })}
                    className={`w-full ${input}`}
                  >
                    <option value="item">Item</option>
                    <option value="weapon">Weapon</option>
                    <option value="armor">Armour</option>
                    <option value="magic_item">Magic item</option>
                    <option value="gear">Gear</option>
                  </select>
                </label>
                <label className="space-y-1 block">
                  <span className="block text-[11px] text-gray-400">Weight (lb)</span>
                  <input
                    value={draft.item?.weight ?? ''}
                    onChange={(e) => setDraft({ ...draft, item: { ...draft.item, weight: e.target.value } })}
                    placeholder="0"
                    className={`w-full ${input}`}
                  />
                </label>
                </div>
                <label className="space-y-1 block">
                <span className="block text-[11px] text-gray-400">What it does</span>
                <textarea
                  value={draft.item?.desc || ''}
                  rows={3}
                  onChange={(e) => setDraft({ ...draft, item: { ...draft.item, desc: e.target.value } })}
                  placeholder="Lands in the buyer's pack with this description."
                  className={`w-full ${input}`}
                />
                </label>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <CoinFields
                label="Price"
                value={draft.priceCoins}
                onChange={(priceCoins) => setDraft({ ...draft, priceCoins })}
              />
              <label className="space-y-1">
                <span className="block text-[11px] text-gray-400">Quantity</span>
                <input value={draft.qty} onChange={(e) => setDraft({ ...draft, qty: e.target.value })}
                  placeholder="blank = unlimited" className={`w-full ${input}`} />
              </label>
            </div>
            <p className="text-[11px] text-gray-500 leading-snug">
              Quantity is stock, listed as “{draft.item?.name || 'Item'} · Qty {draft.qty || '∞'}”
              rather than folded into the name.
            </p>

            <label className="space-y-1 block">
              <span className="block text-[11px] text-gray-400">Shown to players as</span>
              <input value={draft.playerName} onChange={(e) => setDraft({ ...draft, playerName: e.target.value })}
                placeholder={draft.item?.name || 'Item'} className={`w-full ${input}`} />
            </label>
            <label className="space-y-1 block">
              <span className="block text-[11px] text-gray-400">What they are told about it</span>
              <textarea value={draft.playerDesc} rows={3}
                onChange={(e) => setDraft({ ...draft, playerDesc: e.target.value })}
                placeholder="Leave blank to show the item's own description."
                className={`w-full ${input}`} />
            </label>
            <label className="flex items-center gap-2 text-[13px] text-gray-300">
              <input type="checkbox" checked={draft.showStats}
                onChange={(e) => setDraft({ ...draft, showStats: e.target.checked })} />
              Let them see the stats
            </label>
            <p className="text-[11px] text-gray-500 leading-snug">
              With this off the party sees only the name, the description you wrote and the price. The
              real item still lands in their pack when they buy it.
            </p>
          </div>
          <div className="p-3 border-t border-gray-700 shrink-0">
            {/* A nameless item would sit on the shelf as a blank row that
                neither the GM nor the party can identify. */}
            <button
              type="button"
              disabled={!String(draft.item?.name || '').trim()}
              onClick={() => {
                // Copper is computed HERE, not at the call site: two screens mount
                // this panel, and a price that means different things on each is
                // exactly the bug the three boxes were added to stop.
                onSaveItem?.({ ...draft, priceCp: coinsToCp(draft.priceCoins) }, draft.id || null);
                setDraft(null);
              }}
              className="w-full py-2.5 rounded-xl bg-dnd-gold text-gray-900 font-semibold text-sm
                         active:brightness-110 disabled:bg-gray-700 disabled:text-gray-500"
            >{draft.id ? 'Save listing' : 'Put it on the shelf'}</button>
            {!String(draft.item?.name || '').trim() && (
              <p className="text-[11px] text-gray-500 mt-1.5 text-center">Give it a name first.</p>
            )}
          </div>
        </div>
      ), document.body)}

      {shop && (
        <button
          type="button"
          onClick={() => onDeleteShop?.(shop.id)}
          className="text-[11px] text-gray-600 hover:text-red-400"
        >Delete this shop</button>
      )}
    </div>
  );
}
