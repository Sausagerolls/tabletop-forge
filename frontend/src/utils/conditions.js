// The conditions a token can carry.
//
// Exported from one place because three lists have to agree: the GM's token
// menu, the tile-stocking editor, and the server's whitelist in
// backend/src/tileSpawns.js. A condition present in one and missing from
// another is silently dropped rather than rejected, which reads as a checkbox
// that would not stick.
//
// 'submerged' is intentionally absent — it is toggled by its own control in
// TokenRow rather than being offered in the condition list.
export const ALL_CONDITIONS = [
  'blinded', 'charmed', 'deafened', 'exhaustion', 'frightened', 'grappled',
  'incapacitated', 'invisible', 'paralyzed', 'petrified', 'poisoned',
  'prone', 'restrained', 'stunned', 'unconscious',
];
