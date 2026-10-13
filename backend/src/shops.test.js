// The shop's money and its rules, without a database.
//   node src/shops.test.js

const s = require('./shops');

let pass = 0, fail = 0;
const check = (label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  ok ? (pass++, console.log(`  ok    ${label}`))
     : (fail++, console.log(`  FAIL  ${label} — got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`));
};
const section = (n) => console.log(`\n${n}`);

section('Money — copper all the way down');
check('a bare number is gold', s.parsePriceCp('15'), 1500);
check('so is a bare JS number', s.parsePriceCp(15), 1500);
check('explicit gold', s.parsePriceCp('15gp'), 1500);
check('silver', s.parsePriceCp('7sp'), 70);
check('copper', s.parsePriceCp('9cp'), 9);
check('mixed, with spacing', s.parsePriceCp('2gp 5sp'), 250);
check('long form', s.parsePriceCp('3 gold 2 silver'), 320);
check('nonsense is free, not NaN', s.parsePriceCp('ask inside'), 0);
check('empty is free', s.parsePriceCp(''), 0);
check('negative is clamped', s.parsePriceCp(-5), 0);

check('1234cp splits biggest-coin-first', s.splitCp(1234), { gp: 12, sp: 3, cp: 4 });
check('exact gold has no remainder', s.splitCp(500), { gp: 5, sp: 0, cp: 0 });
check('formatting skips empty denominations', s.formatCp(1234), '12gp 3sp 4cp');
check('and says so when it is nothing', s.formatCp(0), 'free');

check('a purse adds up', s.purseCp({ currency_gp: 12, currency_sp: 3, currency_cp: 4 }), 1234);
check('an empty purse is zero', s.purseCp({}), 0);

// A shop with a potion (4 in stock), a sword (1), and rope (unlimited).
const stock = [
  { id: 1, price_cp: 5000, qty: 4, item: { name: 'Potion of Healing', item_type: 'item' } },
  { id: 2, price_cp: 150000, qty: 1, player_name: 'An old sword',
    item: { name: '+1 Longsword', item_type: 'weapon', damage_entries: [{ damage: '1d8', damage_type: 'slashing' }] } },
  { id: 3, price_cp: 100, qty: s.UNLIMITED, item: { name: 'Rope, 50ft', item_type: 'item' } },
];

section('Asking price');
check('one potion', s.askingPriceCp([{ shopItemId: 1, qty: 1 }], stock), 5000);
check('three potions', s.askingPriceCp([{ shopItemId: 1, qty: 3 }], stock), 15000);
check('a basket of things', s.askingPriceCp(
  [{ shopItemId: 1, qty: 2 }, { shopItemId: 3, qty: 1 }], stock), 10100);
check('a line naming nothing is skipped, not guessed',
  s.askingPriceCp([{ shopItemId: 99, qty: 1 }], stock), 0);

section('Stock');
check('four potions is fine', s.checkStock([{ shopItemId: 1, qty: 4 }], stock).ok, true);
check('five is not', s.checkStock([{ shopItemId: 1, qty: 5 }], stock).ok, false);
check('and it says how many are left',
  s.checkStock([{ shopItemId: 1, qty: 5 }], stock).error, 'Only 4 × Potion of Healing left.');
check('unlimited never runs out', s.checkStock([{ shopItemId: 3, qty: 99 }], stock).ok, true);
check('an item that has gone is refused', s.checkStock([{ shopItemId: 99, qty: 1 }], stock).ok, false);
check('a sold-out line names the DISGUISED item, not the real one',
  s.checkStock([{ shopItemId: 2, qty: 2 }], stock).error, 'Only 1 × An old sword left.');

section('What lands in the pack');
{
  const got = s.itemsForBuy([{ shopItemId: 1, qty: 4 }], stock);
  check('four potions is ONE line of qty 4', got.length, 1);
  check('…with the quantity on it', got[0].qty, 4);
  check('…and the real name', got[0].name, 'Potion of Healing');

  const sword = s.itemsForBuy([{ shopItemId: 2, qty: 1 }], stock)[0];
  check('a disguised item enters the pack under its REAL name', sword.name, '+1 Longsword');
  check('and keeps its stats', sword.damage_entries, [{ damage: '1d8', damage_type: 'slashing' }]);
  check('and is not auto-equipped', sword.equipped, false);
}

section('Stock after a sale');
check('four of four leaves none', s.stockAfter([{ shopItemId: 1, qty: 4 }], stock), [{ id: 1, qty: 0 }]);
check('two of four leaves two', s.stockAfter([{ shopItemId: 1, qty: 2 }], stock), [{ id: 1, qty: 2 }]);
check('unlimited is untouched', s.stockAfter([{ shopItemId: 3, qty: 9 }], stock), []);

section('Selling out of a pack');
{
  const inv = [
    { name: 'Torch', qty: 5 },
    { name: 'Shortsword', qty: 1 },
    { name: 'Rations', qty: 3 },
  ];
  const two = s.removeSoldItems(inv, [{ index: 0, name: 'Torch', qty: 2 }]);
  check('selling part of a stack leaves the rest', two.inventory[0], { name: 'Torch', qty: 3 });
  check('and does not disturb the others', two.inventory.length, 3);

  const all = s.removeSoldItems(inv, [{ index: 1, name: 'Shortsword', qty: 1 }]);
  check('selling the last one removes the line', all.inventory.map((x) => x.name), ['Torch', 'Rations']);

  const many = s.removeSoldItems(inv, [
    { index: 0, name: 'Torch', qty: 5 },
    { index: 2, name: 'Rations', qty: 3 },
  ]);
  check('several lines at once', many.inventory.map((x) => x.name), ['Shortsword']);

  check('selling more than they hold is refused',
    s.removeSoldItems(inv, [{ index: 0, name: 'Torch', qty: 6 }]).ok, false);
  check('a shifted pack is refused rather than guessed',
    s.removeSoldItems(inv, [{ index: 0, name: 'Shortsword', qty: 1 }]).ok, false);
  check('…and says why',
    s.removeSoldItems(inv, [{ index: 0, name: 'Shortsword', qty: 1 }]).error,
    'Their pack changed — Shortsword is not where it was.');
  check('a bad line leaves the pack untouched',
    s.removeSoldItems(inv, [{ index: 0, name: 'Torch', qty: 1 }, { index: 9, name: 'Ghost', qty: 1 }]).ok, false);
  check('nothing to sell is a no-op', s.removeSoldItems(inv, []).inventory.length, 3);
}

section('Which number did we agree on');
check('no proposal settles at the asking price', s.agreedCp({}, 5000), 5000);
check('a proposal the GM accepted settles at the proposal',
  s.agreedCp({ offer_cp: 4000 }, 5000), 4000);
check('a counter wins over the proposal',
  s.agreedCp({ offer_cp: 4000, counter_cp: 4500 }, 5000), 4500);
check('a counter of zero is still a counter, not "unset"',
  s.agreedCp({ offer_cp: 4000, counter_cp: 0 }, 5000), 0);
check('an offer of zero is honoured too', s.agreedCp({ offer_cp: 0 }, 5000), 0);

section('Explicit copper from the coin fields');
check('copper is taken at face value', s.cpFromExplicit(250), 250);
check('a fraction is rounded, not floored', s.cpFromExplicit(250.6), 251);
check('nonsense is zero, not NaN', s.cpFromExplicit('abc'), 0);
check('negative is clamped', s.cpFromExplicit(-5), 0);

check('coin fields win over text', s.priceFromInput({ cp: 250, text: '99gp' }), 250);
check('zero copper is a price, not "unset"', s.priceFromInput({ cp: 0, text: '99gp' }), 0);
check('an older client still parses its text', s.priceFromInput({ text: '2gp 5sp' }), 250);
check('nothing at all is free', s.priceFromInput({}), 0);
// The bug the fields exist to kill: a bare 15 was read as 15 GOLD.
check('a bare number is no longer guessed at when coins are sent',
  s.priceFromInput({ cp: 1500 }), 1500);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
