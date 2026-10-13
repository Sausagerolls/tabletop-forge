// Wild Magic Surge table (2024 rules) — 1d100, twenty-five bands.
//
// Kept as data rather than prose so the app can roll it and hand back the
// exact row, which is the only way this table is usable mid-combat: nobody
// wants to scroll a hundred rows while the fireball is still in the air.
//
// `min`/`max` are inclusive. The published table's final band reads 97–00,
// where 00 is 100 on percentile dice — stored here as 97–100 so a straight
// 1–100 roll lands correctly.
export const WILD_MAGIC_SURGE = [
  { min: 1,  max: 4,   effect: 'Roll on this table at the start of each of your turns for the next minute, ignoring this result on subsequent rolls.' },
  { min: 5,  max: 8,   effect: 'A creature that is Friendly toward you appears in a random unoccupied space within 60 feet of you. The creature is under the DM’s control and disappears 1 minute later. Roll 1d4: 1 — Modron Duodrone; 2 — Flumph; 3 — Modron Monodrone; 4 — Unicorn.' },
  { min: 9,  max: 12,  effect: 'For the next minute, you regain 5 Hit Points at the start of each of your turns.' },
  { min: 13, max: 16,  effect: 'Creatures have Disadvantage on saving throws against the next spell you cast in the next minute that involves a saving throw.' },
  { min: 17, max: 20,  effect: 'You are subjected to an effect for 1 minute unless stated otherwise. Roll 1d8: 1 — faint ethereal music only you and creatures within 5 feet can hear; 2 — your size increases by one category; 3 — you grow a long beard of feathers until you sneeze, at which point they explode from your face and vanish; 4 — you must shout when you speak; 5 — illusory butterflies flutter within 10 feet of you; 6 — an eye appears on your forehead, granting Advantage on Wisdom (Perception) checks; 7 — pink bubbles float from your mouth whenever you speak; 8 — your skin turns vibrant blue for 24 hours or until ended by Remove Curse.' },
  { min: 21, max: 24,  effect: 'For the next minute, all your spells with a casting time of an action have a casting time of a Bonus Action.' },
  { min: 25, max: 28,  effect: 'You are transported to the Astral Plane until the end of your next turn. You then return to the space you previously occupied, or the nearest unoccupied space.' },
  { min: 29, max: 32,  effect: 'The next time you cast a spell that deals damage within the next minute, don’t roll the damage dice — use the highest number possible for each die.' },
  { min: 33, max: 36,  effect: 'You have Resistance to all damage for the next minute.' },
  { min: 37, max: 40,  effect: 'You turn into a potted plant until the start of your next turn. While a plant, you have the Incapacitated condition and Vulnerability to all damage. If you drop to 0 Hit Points, your pot breaks and your form reverts.' },
  { min: 41, max: 44,  effect: 'For the next minute, you can teleport up to 20 feet as a Bonus Action on each of your turns.' },
  { min: 45, max: 48,  effect: 'You and up to three creatures you choose within 30 feet of you have the Invisible condition for 1 minute. It ends on a creature immediately after it makes an attack roll, deals damage, or casts a spell.' },
  { min: 49, max: 52,  effect: 'A spectral shield hovers near you for the next minute, granting a +2 bonus to AC and immunity to Magic Missile.' },
  { min: 53, max: 56,  effect: 'You can take one extra action on this turn.' },
  { min: 57, max: 60,  effect: 'You cast a random spell. If it normally requires Concentration, it doesn’t here and lasts its full duration. Roll 1d10: 1 — Confusion; 2 — Fireball; 3 — Fog Cloud; 4 — Fly (on a random creature within 60 feet); 5 — Grease; 6 — Levitate (on yourself); 7 — Magic Missile (as a level 5 spell); 8 — Mirror Image; 9 — Polymorph (on yourself; if you fail the save you become a Goat); 10 — See Invisibility.' },
  { min: 61, max: 64,  effect: 'For the next minute, any flammable, nonmagical object you touch that isn’t worn or carried by another creature bursts into flame, takes 1d4 Fire damage, and is burning.' },
  { min: 65, max: 68,  effect: 'If you die within the next hour, you immediately revive as if by the Reincarnate spell.' },
  { min: 69, max: 72,  effect: 'You have the Frightened condition until the end of your next turn. The DM determines the source of your fear.' },
  { min: 73, max: 76,  effect: 'You teleport up to 60 feet to an unoccupied space you can see.' },
  { min: 77, max: 80,  effect: 'A random creature within 60 feet of you has the Poisoned condition for 1d4 hours.' },
  { min: 81, max: 84,  effect: 'You radiate Bright Light in a 30-foot radius for the next minute. Any creature that ends its turn within 5 feet of you has the Blinded condition until the end of its next turn.' },
  { min: 85, max: 88,  effect: 'Up to three creatures of your choice that you can see within 30 feet take 1d10 Necrotic damage. You regain Hit Points equal to the sum of the damage dealt.' },
  { min: 89, max: 92,  effect: 'Up to three creatures of your choice that you can see within 30 feet take 4d10 Lightning damage.' },
  { min: 93, max: 96,  effect: 'You and all creatures within 30 feet of you have Vulnerability to Piercing damage for the next minute.' },
  { min: 97, max: 100, effect: 'Roll 1d6: 1 — you regain 2d10 Hit Points; 2 — one ally within 300 feet regains 2d10 Hit Points; 3 — you regain your lowest-level expended spell slot; 4 — one ally within 300 feet regains their lowest-level expended spell slot; 5 — you regain all your expended Sorcery Points; 6 — all the effects of the 17–20 row affect you simultaneously.' },
];

// The band a d100 result falls in. Out-of-range input clamps rather than
// returning nothing — a surge should always produce an effect.
export function wildMagicResult(roll) {
  const r = Math.max(1, Math.min(100, Math.round(Number(roll) || 1)));
  const row = WILD_MAGIC_SURGE.find((b) => r >= b.min && r <= b.max);
  return { roll: r, band: row ? `${row.min}–${row.max === 100 ? '00' : row.max}` : '', effect: row?.effect || '' };
}

export function rollWildMagic() {
  return wildMagicResult(Math.floor(Math.random() * 100) + 1);
}
