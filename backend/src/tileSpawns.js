// The creatures a tile brings with it, and the state they arrive in.
//
// A stocked tile used to record only WHICH creature and WHERE: everything else
// came from the creature's library entry. That is fine for a generic goblin and
// useless for the thing a GM actually wants to prepare — "Kessa the Whip,
// bloodied, already prone, hiding behind the pillar". Doing that meant laying
// the tile and then editing every token by hand at the table, in front of the
// players, which is exactly the work stocking a tile was supposed to remove.
//
// So a spawn row can now carry the same state a token has. Every field is
// OPTIONAL and falls back to the creature: rows saved before this existed are
// still valid, and a GM who just wants a plain goblin still gets one.
//
// Shared between the save route and the placement handler on purpose. They ran
// as two separate lists once — the route quietly dropped every key the handler
// was reading — so the whitelist lives here and both sides use it.

// Must match ALL_CONDITIONS in the GM client. A condition missing here is
// silently dropped on save, which looks like the checkbox did not stick.
const CONDITIONS = [
  'blinded', 'charmed', 'deafened', 'exhaustion', 'frightened', 'grappled',
  'incapacitated', 'invisible', 'paralyzed', 'petrified', 'poisoned',
  'prone', 'restrained', 'stunned', 'unconscious',
];

const SIZES = ['tiny', 'small', 'medium', 'large', 'huge', 'gargantuan'];
const VISION = ['normal', 'darkvision', 'blindsight', 'truesight'];

const num = (v, min, max, dflt = null) => {
  if (v === null || v === undefined || v === '') return dflt;
  const n = Number(v);
  if (!Number.isFinite(n)) return dflt;
  return Math.min(max, Math.max(min, n));
};
const int = (v, min, max, dflt = null) => {
  const n = num(v, min, max, dflt);
  return n === null ? null : Math.round(n);
};
// Tri-state on purpose: null means "the creature decides", which is different
// from an explicit false.
const bool = (v) => (v === undefined || v === null ? null : !!v);
const str = (v, max) => {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t ? t.slice(0, max) : null;
};

/**
 * Normalise one spawn row for storage. Unknown keys are dropped rather than
 * passed through, so what is stored is always something placement understands.
 */
function cleanSpawn(sp) {
  const out = {
    creature_id: Number(sp?.creature_id) || null,
    col: Number(sp?.col) || 0,
    row: Number(sp?.row) || 0,
  };
  if (!out.creature_id) return null;

  const put = (k, v) => { if (v !== null) out[k] = v; };

  put('nickname', str(sp?.nickname, 255));
  put('current_hp', int(sp?.current_hp, 0, 100000));
  put('max_hp', int(sp?.max_hp, 1, 100000));
  put('temp_hp', int(sp?.temp_hp, 0, 100000));
  put('exhaustion', int(sp?.exhaustion, 0, 6));
  put('initiative', int(sp?.initiative, -50, 100));
  put('vision_range', int(sp?.vision_range, 0, 1000));
  put('token_light_bright', num(sp?.token_light_bright, 0, 1000));
  put('token_light_dim', num(sp?.token_light_dim, 0, 1000));
  put('elevation', num(sp?.elevation, -1000, 1000));
  put('size_squares', num(sp?.size_squares, 0.25, 8));
  put('is_hidden', bool(sp?.is_hidden));
  put('is_flying', bool(sp?.is_flying));
  put('in_combat', bool(sp?.in_combat));
  put('hide_name_from_players', bool(sp?.hide_name_from_players));
  put('hide_hp_from_players', bool(sp?.hide_hp_from_players));
  if (SIZES.includes(sp?.size)) out.size = sp.size;
  if (VISION.includes(sp?.vision_type)) out.vision_type = sp.vision_type;
  if (typeof sp?.token_light_color === 'string' && /^#[0-9a-fA-F]{6}$/.test(sp.token_light_color)) {
    out.token_light_color = sp.token_light_color;
  }
  if (Array.isArray(sp?.conditions)) {
    const c = [...new Set(sp.conditions.filter((x) => CONDITIONS.includes(x)))];
    if (c.length) out.conditions = c;
  }
  return out;
}

function cleanSpawns(rows) {
  return (Array.isArray(rows) ? rows : [])
    .map(cleanSpawn)
    .filter(Boolean)
    .slice(0, 60);
}

/**
 * The token columns one spawn should be created with.
 *
 * The creature is the floor and the spawn's own fields are the override, so a
 * row that says nothing produces exactly the token this used to produce.
 * Returns column → value; the caller adds position, which only it can compute.
 */
function tokenFieldsFor(sp, cr) {
  const has = (k) => Object.prototype.hasOwnProperty.call(sp || {}, k);
  const pick = (k, fallback) => (has(k) ? sp[k] : fallback);

  // HP is the one place a half-specified row can contradict itself: a GM who
  // sets "bloodied to 12" without touching the maximum means 12 of the
  // creature's own total, and a max lowered below the current HP would print a
  // token at 30/12.
  const maxHp = int(pick('max_hp', cr.hit_points), 1, 100000, cr.hit_points || 1);
  const curHp = Math.min(maxHp, int(pick('current_hp', maxHp), 0, 100000, maxHp));

  const fields = {
    creature_id: cr.id,
    name: cr.name,
    image_path: cr.image_path,
    size: pick('size', cr.size),
    size_squares: pick('size_squares', cr.size_squares ?? null),
    current_hp: curHp,
    max_hp: maxHp,
    hide_name_from_players: !!pick('hide_name_from_players', !!cr.hide_token_name),
    hide_hp_from_players: !!pick('hide_hp_from_players', !!cr.hide_token_hp),
  };

  // Everything else is written only when the GM actually set it, so the column
  // default stands otherwise.
  if (has('nickname')) fields.nickname = sp.nickname;
  if (has('temp_hp')) fields.temp_hp = sp.temp_hp;
  if (has('exhaustion')) fields.exhaustion = sp.exhaustion;
  if (has('initiative')) fields.initiative = sp.initiative;
  if (has('in_combat')) fields.in_combat = !!sp.in_combat;
  if (has('is_hidden')) fields.is_hidden = !!sp.is_hidden;
  if (has('is_flying')) fields.is_flying = !!sp.is_flying;
  if (has('elevation')) fields.elevation = sp.elevation;
  if (has('vision_type')) fields.vision_type = sp.vision_type;
  if (has('vision_range')) fields.vision_range = sp.vision_range;
  if (has('token_light_bright')) fields.token_light_bright = sp.token_light_bright;
  if (has('token_light_dim')) fields.token_light_dim = sp.token_light_dim;
  if (has('token_light_color')) fields.token_light_color = sp.token_light_color;
  if (has('conditions')) fields.conditions = JSON.stringify(sp.conditions);
  return fields;
}

module.exports = { CONDITIONS, SIZES, VISION, cleanSpawn, cleanSpawns, tokenFieldsFor };
