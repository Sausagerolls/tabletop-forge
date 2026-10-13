// The look a new door is born with.
//
// Doors reach a board from five different places — the GM drawing one, a tile
// being laid, the two Dungeondraft importers and the REST route — and each of
// them used to produce a bare, untextured door. The GM then re-textured every
// one by hand, which for a dungeon built out of tiles is the same three clicks
// repeated for every doorway in it, and players saw the plain version in the
// meantime.
//
// So the choice is made once, stored globally in app_settings, and every
// creation path asks here instead of deciding for itself.

const db = require('./db');

// The canonical list of door motions.
//
// The socket whitelist, this validator and the clients all have to agree: an
// unrecognised motion is silently coerced to 'swing', so a motion missing from
// the list looks like the GM's click did nothing rather than like an error.
// That has already happened once, when 'vanish' was added to the clients but
// not to the whitelist — hence one list, exported, rather than three copies.
const DOOR_MOTIONS = ['swing', 'double', 'slide', 'vanish', 'secret'];

const normaliseMotion = (m) => (DOOR_MOTIONS.includes(m) ? m : 'swing');

// Cached: this is read on every door insert and a single tile can lay a dozen
// at once. Invalidated on write rather than expiring on a timer, so changing
// the default takes effect on the very next door instead of eventually.
let cache = null;

async function getDoorDefault() {
  if (cache) return cache;
  let value = null;
  try {
    const r = await db.query("SELECT value FROM app_settings WHERE key='door_default'");
    value = r.rows[0]?.value || null;
  } catch {
    // No row, or no table yet on a cold boot. An unset default is a plain
    // door, which is exactly the old behaviour.
    value = null;
  }
  cache = {
    spritePath: (typeof value?.spritePath === 'string' && value.spritePath) ? value.spritePath : null,
    spriteMotion: normaliseMotion(value?.spriteMotion),
  };
  return cache;
}

function clearDoorDefaultCache() { cache = null; }

/**
 * What a newly created portal should be born with.
 *
 * Windows are deliberately excluded. A window is a portal, not a door: it is
 * created by the same code paths and stored in the same table, but hanging the
 * door art in one would look worse than leaving it plain. Only real doors take
 * the default.
 */
async function doorDefaultFor(portalKind) {
  if ((portalKind || 'door') !== 'door') return { spritePath: null, spriteMotion: 'swing' };
  return getDoorDefault();
}

module.exports = {
  DOOR_MOTIONS, normaliseMotion, getDoorDefault, doorDefaultFor, clearDoorDefaultCache,
};
