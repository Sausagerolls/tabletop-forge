// compendium.js — reading a self-hosted 5etools mirror and converting what it
// serves into this app's own shapes.
//
// The mirror is a STATIC site: there is no API, just JSON files on disk behind
// a web server. `/data/bestiary/index.json` maps a source code to a filename,
// and each of those files holds a `monster` array. Everything below is built
// around that fact.
//
// Two reasons this proxies through the backend rather than letting the browser
// fetch the mirror directly:
//
//   1. The mirror serves no CORS headers, so a browser on the VTT's origin
//      cannot read it at all.
//   2. The conversion belongs in one place. Items and spells will want the same
//      tag-stripping and the same entry flattening, and a copy of that living in
//      the client is a copy that drifts.
//
// The mirror is treated as untrusted input throughout: every field is coerced,
// every list is bounded, and a monster that fails to convert is skipped rather
// than allowed to throw.

const DEFAULT_BASE = 'http://192.168.50.131:5050';

function baseUrl() {
  const raw = String(process.env.COMPENDIUM_URL || DEFAULT_BASE).trim();
  return raw.replace(/\/+$/, '');
}

// ── 5etools markup ───────────────────────────────────────────────────────────
//
// Entry text is peppered with {@tag ...} markup: {@damage 1d6 + 2},
// {@atk mw}, {@hit 4}, {@condition prone|XPHB}. A stat block full of raw braces
// is unreadable, so this renders them to the plain text a GM expects to see.
//
// The general convention for link-like tags is `{@tag name|source|display}` —
// display wins when present, name otherwise, and the source is never shown.
// That default covers dozens of tags; only the ones that expand to something
// other than their own content need an entry in the table below.
const ATK_WORDS = {
  mw: 'Melee Weapon Attack:', rw: 'Ranged Weapon Attack:',
  ms: 'Melee Spell Attack:',  rs: 'Ranged Spell Attack:',
  m: 'Melee Attack Roll:',    r: 'Ranged Attack Roll:',
};

const ABILITY_WORDS = {
  str: 'Strength', dex: 'Dexterity', con: 'Constitution',
  int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma',
};

const TAG_HANDLERS = {
  h: () => 'Hit: ',
  hom: () => 'Hit or Miss: ',
  m: () => 'Miss: ',
  // "+4", and the sign matters: 5etools stores a bare number.
  hit: (p) => {
    const n = Number(p[0]);
    return Number.isFinite(n) ? (n >= 0 ? `+${n}` : `${n}`) : String(p[0] ?? '');
  },
  dc: (p) => `DC ${p[0] ?? ''}`,
  chance: (p) => `${p[0] ?? ''} percent`,
  recharge: (p) => (p[0] ? `(Recharge ${p[0]}–6)` : '(Recharge 6)'),
  // {@atk mw,rw} — several kinds at once, joined the way the books word it.
  // The 2024 books word attacks as "Melee Attack Roll: +4" and tag them
  // {@atkr m}. Same shape as {@atk}, different vocabulary — routed through the
  // same joiner so a hybrid "m,r" still reads correctly.
  atkr: (p) => TAG_HANDLERS.atk(p),
  atk: (p) => {
    const kinds = String(p[0] || '').split(',').map((k) => k.trim()).filter(Boolean);
    if (!kinds.length) return 'Attack:';
    const words = kinds.map((k) => ATK_WORDS[k] || k);
    if (words.length === 1) return words[0];
    // "Melee Weapon Attack:" + "Ranged Weapon Attack:" reads as
    // "Melee or Ranged Weapon Attack:" in print.
    const tail = words[words.length - 1];
    const heads = words.slice(0, -1).map((w) => w.replace(/ (Weapon|Spell)? ?Attack( Roll)?:?$/, ''));
    return `${heads.join(', ')} or ${tail}`;
  },
  // The 2024 stat-block wording.
  actSave: (p) => `${ABILITY_WORDS[String(p[0] || '').toLowerCase()] || p[0]} Saving Throw:`,
  actSaveFail: () => 'Failure:',
  actSaveSuccess: () => 'Success:',
  actSaveSuccessOrFail: () => 'Failure or Success:',
  actTrigger: () => 'Trigger:',
  actResponse: () => 'Response:',
  hitYourSpellAttack: () => 'your spell attack modifier',
};

// Which printing wins when the same thing appears in several books.
//
// The mirror carries every edition at once: Goblin is in MM and XMM, Rage is in
// PHB and XPHB, Sentinel is in PHB and XPHB. Listing them all turns one search
// into five identical-looking rows, so a lookup keeps ONE — the newest core
// printing, which is the text a table is playing with. Anything unlisted sorts
// after the lot, by source, so the choice is stable rather than whichever file
// happened to be read last.
const SOURCE_RANK = ['XPHB', 'XDMG', 'XMM', 'EFA', 'MPMM', 'TCE', 'XGE', 'SCC',
  'FTD', 'VGM', 'MTF', 'PHB', 'DMG', 'MM'];

// Which ruleset a book belongs to. 5etools stamps no edition on a spell, an
// item or a monster — the source IS the edition — so this is the mapping, and
// anything unlisted is 2014, where the long tail of older books sits.
const SOURCES_2024 = new Set(['XPHB', 'XDMG', 'XMM', 'EFA', 'RHW']);

function editionOf(src) {
  return SOURCES_2024.has(String(src || '').toUpperCase()) ? '2024' : '2014';
}

function sourceRank(src) {
  const i = SOURCE_RANK.indexOf(String(src || '').toUpperCase());
  return i < 0 ? SOURCE_RANK.length : i;
}

// Collapse reprints. `identity` says what makes two rows the same thing —
// usually the name, but a class feature needs its class and level too.
function dedupeBySource(rows, identity) {
  const best = new Map();
  for (const row of rows) {
    const id = identity(row);
    const held = best.get(id);
    if (!held || sourceRank(row.source) < sourceRank(held.source)) best.set(id, row);
  }
  return [...best.values()];
}

// Tags whose first field is the only prose in them. See stripTags below.
const NAME_ONLY_TAGS = new Set([
  'classFeature', 'subclassFeature', 'subclass', 'filter', 'book', 'adventure',
  'quickref',
]);

// One pass of innermost-first replacement. Tags nest — "{@h}4 ({@damage 1d4})"
// — so this runs until nothing is left, with a cap so a malformed file can
// never spin here forever.
const INNERMOST = /\{@(\w+)(?:\s+([^{}]*))?\}/g;

function stripTags(input) {
  let s = String(input == null ? '' : input);
  for (let pass = 0; pass < 12 && s.includes('{@'); pass++) {
    const before = s;
    s = s.replace(INNERMOST, (_, tag, body) => {
      const parts = String(body == null ? '' : body).split('|');
      const fn = TAG_HANDLERS[tag];
      if (fn) return fn(parts);
      // Some tags have no display field at all — everything after the name is
      // routing (a class, a source code, a level, a search query), so the
      // third-field rule below turns prose into nonsense: "{@subclass
      // Alchemist|Artificer|EFA|EFA}" renders as "EFA" and "{@filter Artificer
      // cantrips|spells|level=0|…}" as "level=0". Rare in a stat block, common
      // the moment spells, feats and rules come through here.
      if (NAME_ONLY_TAGS.has(tag)) return parts[0] || '';
      // Link-like default: display, else the name. Never the source.
      return (parts[2] != null && parts[2] !== '') ? parts[2] : (parts[0] || '');
    });
    if (s === before) break;
  }
  // Any unmatched brace left over would be noise in a stat block.
  return s.replace(/\{@\w+\s*/g, '').replace(/\}/g, '').trim();
}

// Flatten 5etools' recursive `entries` into the plain paragraphs this app's
// stat blocks store. Depth-capped: the structure is data from a file on someone
// else's disk, and a cycle would otherwise take the process down.
function entriesToText(entries, depth = 0) {
  if (entries == null || depth > 6) return '';
  if (typeof entries === 'string' || typeof entries === 'number') return stripTags(entries);
  if (Array.isArray(entries)) {
    return entries.map((e) => entriesToText(e, depth + 1)).filter(Boolean).join('\n');
  }
  if (typeof entries !== 'object') return '';
  const e = entries;
  if (e.type === 'list') {
    return (e.items || [])
      .map((it) => `• ${entriesToText(it, depth + 1)}`)
      .filter(Boolean)
      .join('\n');
  }
  if (e.type === 'table') {
    const head = (e.colLabels || []).map(stripTags).join(' | ');
    const rows = (e.rows || []).slice(0, 60).map((r) =>
      (Array.isArray(r) ? r : [r]).map((c) => entriesToText(c, depth + 1)).join(' | ')
    );
    return [head, ...rows].filter(Boolean).join('\n');
  }
  // 'entries', 'inset', 'section', 'item', … all carry a name and children.
  const body = entriesToText(e.entries ?? e.entry ?? e.items, depth + 1);
  const name = e.name ? stripTags(e.name) : '';
  if (name && body) return `${name}. ${body}`;
  return name || body;
}

// A named block — trait, action, reaction — in the { name, desc } shape the
// creatures table stores.
function blockList(arr, cap = 40) {
  if (!Array.isArray(arr)) return [];
  return arr.slice(0, cap).map((a) => ({
    name: stripTags(a?.name || '').slice(0, 200) || 'Ability',
    desc: entriesToText(a?.entries ?? a?.entry).slice(0, 4000),
  })).filter((a) => a.name || a.desc);
}


// ── 5etools shapes -> this app's shapes ──────────────────────────────────────

const SIZE_WORDS = { T: 'tiny', S: 'small', M: 'medium', L: 'large', H: 'huge', G: 'gargantuan' };

function sizeWord(size) {
  const code = Array.isArray(size) ? size[0] : size;
  return SIZE_WORDS[String(code || 'M').toUpperCase()] || 'medium';
}

// Is this a swarm, and of what?
//
// 5etools records a swarm on the TYPE rather than the size: `type.swarmSize`
// is how big the INDIVIDUALS are, while `size` stays the footprint the swarm
// occupies as a whole. "Swarm of Bats" is size L with swarmSize T — a Large
// space filled with Tiny bats.
//
// That is the same split this app stores as `size` + `swarm_creature_size`,
// so the two models line up exactly; the importer simply was not reading the
// field. Without it every imported swarm arrived as an ordinary creature of
// the swarm's own footprint — a single Large bat rather than a cloud of them,
// with none of the swarm handling the rest of the app keys off `is_swarm`.
function swarmSizeOf(type) {
  if (!type || typeof type !== 'object') return null;
  const code = Array.isArray(type.swarmSize) ? type.swarmSize[0] : type.swarmSize;
  return code ? sizeWord(code) : null;
}

// `type` is either a bare string or { type, tags } — and `type` itself can be
// a { choose } object on a few entries, which falls back to the plain word.
function typeText(type) {
  if (!type) return 'Humanoid';
  if (typeof type === 'string') return cap(type);
  const t = typeof type.type === 'string' ? type.type : (type.type?.choose?.[0] || 'humanoid');
  return cap(String(t));
}

function subtypeText(type) {
  if (!type || typeof type === 'string') return '';
  const tags = (type.tags || []).map((t) => (typeof t === 'string' ? t : t?.tag)).filter(Boolean);
  return tags.map(String).join(', ').slice(0, 100);
}

function cap(s) {
  const str = String(s || '');
  return str.charAt(0).toUpperCase() + str.slice(1);
}

const ALIGN_WORDS = {
  L: 'Lawful', N: 'Neutral', C: 'Chaotic', G: 'Good', E: 'Evil',
  U: 'Unaligned', A: 'Any alignment',
};

function alignmentText(al) {
  if (!Array.isArray(al) || !al.length) return 'Unaligned';
  // Entries can be objects ({ alignment: [...], chance }) for "usually X".
  const flat = [];
  for (const a of al) {
    if (typeof a === 'string') flat.push(a);
    else if (Array.isArray(a?.alignment)) flat.push(...a.alignment.filter((x) => typeof x === 'string'));
  }
  if (!flat.length) return 'Unaligned';
  if (flat.length === 1) return ALIGN_WORDS[flat[0]] || 'Unaligned';
  // "N,G" is Neutral Good; "N" alone in a pair means true neutral.
  const words = flat.map((c) => ALIGN_WORDS[c]).filter(Boolean);
  if (words.length === 2 && flat[0] === 'N' && flat[1] === 'N') return 'True Neutral';
  return words.join(' ');
}

// `ac` is a list whose entries are a bare number or { ac, from, condition }.
// The first is the creature's actual AC; the rest are situational and become
// part of the description.
function acOf(ac) {
  if (!Array.isArray(ac) || !ac.length) return { value: 10, desc: '' };
  const first = ac[0];
  const value = Number(typeof first === 'object' ? first?.ac : first);
  const bits = [];
  for (const entry of ac) {
    if (typeof entry !== 'object' || !entry) continue;
    const from = (entry.from || []).map(stripTags).filter(Boolean).join(', ');
    const cond = entry.condition ? stripTags(entry.condition) : '';
    const piece = [from, cond].filter(Boolean).join(' ');
    if (piece) bits.push(entry === first ? piece : `${entry.ac} ${piece}`);
  }
  return {
    value: Number.isFinite(value) ? value : 10,
    desc: bits.join('; ').slice(0, 200),
  };
}

// Speeds come as a number or { number, condition }. Only the number matters to
// the movement rules here; the condition ("in bat form") is prose this app has
// nowhere to put on a speed field.
function speedNum(v) {
  if (typeof v === 'number') return Math.max(0, Math.round(v));
  if (v && typeof v === 'object' && Number.isFinite(Number(v.number))) return Math.max(0, Math.round(Number(v.number)));
  return 0;
}

// "+5" / "5" / -1 -> 5, and null for anything absent.
//
// The null matters more than the number. These columns are nullable because
// NULL means "not proficient" — the stat block prints no line for it at all —
// while 0 means "proficient, and the bonus happens to be zero". Coercing a
// missing key to 0 gave every imported creature all six saves and all eighteen
// skills, which is a different creature.
function modNum(v) {
  if (v == null) return null;
  const cleaned = String(v).replace(/[^0-9+-]/g, '');
  if (!/\d/.test(cleaned)) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function crText(cr) {
  if (cr == null) return '0';
  if (typeof cr === 'object') return String(cr.cr ?? '0');
  return String(cr);
}

const CR_XP = {
  '0': 10, '1/8': 25, '1/4': 50, '1/2': 100, '1': 200, '2': 450, '3': 700,
  '4': 1100, '5': 1800, '6': 2300, '7': 2900, '8': 3900, '9': 5000, '10': 5900,
  '11': 7200, '12': 8400, '13': 10000, '14': 11500, '15': 13000, '16': 15000,
  '17': 18000, '18': 20000, '19': 22000, '20': 25000, '21': 33000, '22': 41000,
  '23': 50000, '24': 62000, '25': 75000, '26': 90000, '27': 105000, '28': 120000,
  '29': 135000, '30': 155000,
};

function profBonusForCr(cr) {
  const n = cr === '1/8' || cr === '1/4' || cr === '1/2' ? 0 : Number(cr);
  const v = Number.isFinite(n) ? n : 0;
  return Math.max(2, 2 + Math.floor(Math.max(0, v - 1) / 4));
}

// immune / resist / vulnerable / conditionImmune are lists whose entries can be
// strings OR nested objects carrying their own list plus a note
// ("bludgeoning, piercing and slashing from nonmagical attacks").
function damageList(arr, key) {
  if (!Array.isArray(arr)) return '';
  const out = [];
  for (const entry of arr) {
    if (typeof entry === 'string') { out.push(entry); continue; }
    if (!entry || typeof entry !== 'object') continue;
    const inner = (entry[key] || entry.immune || entry.resist || entry.vulnerable || entry.conditionImmune || [])
      .map((x) => (typeof x === 'string' ? x : ''))
      .filter(Boolean)
      .join(', ');
    const note = entry.note ? stripTags(entry.note) : '';
    out.push([inner, note].filter(Boolean).join(' '));
  }
  return out.filter(Boolean).join('; ').slice(0, 1000);
}

// The senses column is a list of { type, range }. 5etools gives prose strings
// ("darkvision 60 ft."), so the number is pulled back out of them; anything
// that doesn't parse is kept as a type with no range rather than dropped.
function sensesList(senses) {
  if (!Array.isArray(senses)) return [];
  return senses.slice(0, 8).map((raw) => {
    const s = stripTags(raw).toLowerCase();
    const m = s.match(/^([a-z ]+?)\s*(\d+)\s*ft/);
    if (m) return { type: m[1].trim(), range: Number(m[2]) };
    return { type: s.slice(0, 40), range: 0 };
  }).filter((x) => x.type);
}

// 5etools skill keys are lower-case with spaces ("animal handling"); the
// creatures table uses snake_case columns.
const SKILL_COLUMNS = [
  'acrobatics', 'animal handling', 'arcana', 'athletics', 'deception', 'history',
  'insight', 'intimidation', 'investigation', 'medicine', 'nature', 'perception',
  'performance', 'persuasion', 'religion', 'sleight of hand', 'stealth', 'survival',
];

// Everything the creatures table wants, from one 5etools monster.
//
// Deliberately returns a plain object of COLUMN NAMES rather than writing to the
// database: the client posts it through the ordinary creature-create endpoint,
// so an imported creature goes through exactly the same validation, the same
// socket broadcast and the same image handling as one typed in by hand.
function monsterToCreature(m) {
  const ac = acOf(m.ac);
  const cr = crText(m.cr);
  const speed = m.speed || {};
  const swarmOf = swarmSizeOf(m.type);
  const out = {
    name: String(m.name || 'Unnamed').slice(0, 255),
    // The swarm's own footprint either way — see swarmSizeOf.
    size: sizeWord(m.size),
    is_swarm: !!swarmOf,
    swarm_creature_size: swarmOf,
    creature_type: typeText(m.type).slice(0, 100),
    subtype: subtypeText(m.type),
    alignment: alignmentText(m.alignment).slice(0, 100),
    armor_class: ac.value,
    armor_desc: ac.desc,
    hit_points: Number(m.hp?.average) || 1,
    hit_dice: String(m.hp?.formula || '').slice(0, 50),
    speed_walk: speedNum(speed.walk),
    speed_fly: speedNum(speed.fly),
    speed_swim: speedNum(speed.swim),
    speed_burrow: speedNum(speed.burrow),
    speed_climb: speedNum(speed.climb),
    strength: Number(m.str) || 10,
    dexterity: Number(m.dex) || 10,
    constitution: Number(m.con) || 10,
    intelligence: Number(m.int) || 10,
    wisdom: Number(m.wis) || 10,
    charisma: Number(m.cha) || 10,
    damage_vulnerabilities: damageList(m.vulnerable, 'vulnerable'),
    damage_resistances: damageList(m.resist, 'resist'),
    damage_immunities: damageList(m.immune, 'immune'),
    condition_immunities: damageList(m.conditionImmune, 'conditionImmune'),
    senses: sensesList(m.senses),
    passive_perception: Number(m.passive) || 10,
    languages: (Array.isArray(m.languages) ? m.languages.map(stripTags).join(', ') : '').slice(0, 1000) || '—',
    challenge_rating: cr.slice(0, 10),
    xp: CR_XP[cr] ?? 0,
    proficiency_bonus: profBonusForCr(cr),
    special_abilities: blockList(m.trait),
    actions: blockList(m.action),
    bonus_actions: blockList(m.bonus),
    reactions: blockList(m.reaction),
    legendary_actions: blockList(m.legendary),
    legendary_action_count: Array.isArray(m.legendary) ? (Number(m.legendaryActions) || 3) : 0,
  };

  for (const ab of ['str', 'dex', 'con', 'int', 'wis', 'cha']) {
    const v = modNum(m.save?.[ab]);
    if (v != null) out[`save_${ab}`] = v;
  }
  for (const skill of SKILL_COLUMNS) {
    const v = modNum(m.skill?.[skill]);
    if (v != null) out[`skill_${skill.replace(/ /g, '_')}`] = v;
  }
  return out;
}

// ── Reading the mirror ───────────────────────────────────────────────────────

const FETCH_TIMEOUT_MS = 20000;

async function getJson(path) {
  const url = `${baseUrl()}${path}`;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), FETCH_TIMEOUT_MS);
  try {
    const r = await fetch(url, { signal: ctl.signal });
    if (!r.ok) throw new Error(`${url} -> HTTP ${r.status}`);
    return await r.json();
  } finally {
    clearTimeout(timer);
  }
}

// Whole source files, kept between an import and the search that found it.
// Bounded: the bestiary is ~100 files and tens of megabytes, and holding all of
// them parsed would cost more resident memory than the rest of this server uses.
const FILE_CACHE_MAX = 8;
const fileCache = new Map(); // filename -> monster[]

async function bestiaryFile(filename) {
  const hit = fileCache.get(filename);
  if (hit) {
    // Refresh its position — plain Map order is the LRU.
    fileCache.delete(filename);
    fileCache.set(filename, hit);
    return hit;
  }
  const data = await getJson(`/data/bestiary/${filename}`);
  const list = Array.isArray(data?.monster) ? data.monster : [];
  fileCache.set(filename, list);
  while (fileCache.size > FILE_CACHE_MAX) fileCache.delete(fileCache.keys().next().value);
  return list;
}

// ── The search index ─────────────────────────────────────────────────────────
//
// Slim on purpose. Searching means having every NAME to hand, which means
// reading every source file — but keeping every parsed stat block would be
// hundreds of megabytes for a feature used a few times a session. So one pass
// reads them all and keeps five fields per monster; the full block is re-fetched
// from its own file at import time.
//
// Built lazily on first search and shared: `indexPromise` means ten clients
// searching at once trigger ONE build rather than ten concurrent passes over
// the whole bestiary.
let indexPromise = null;
let indexBuiltAt = 0;
const INDEX_TTL_MS = 60 * 60 * 1000;

async function buildIndex() {
  const sources = await getJson('/data/bestiary/index.json');
  const out = [];
  for (const [source, filename] of Object.entries(sources || {})) {
    let list;
    try {
      list = await getJson(`/data/bestiary/${filename}`);
    } catch (err) {
      // One unreadable source file must not cost the whole compendium.
      console.error(`compendium: skipping ${filename}:`, err.message);
      continue;
    }
    for (const m of (Array.isArray(list?.monster) ? list.monster : [])) {
      if (!m?.name) continue;
      out.push({
        name: String(m.name),
        source: String(m.source || source),
        file: filename,
        cr: crText(m.cr),
        type: typeText(m.type),
        size: sizeWord(m.size),
      });
    }
  }
  // One row per thing PER EDITION. Collapsing on the name alone threw away a
  // printing the table may well be using: a 2014 Goblin and a 2024 Goblin are
  // different stat blocks, and answering with only the newer one is the same
  // fault as a library hiding a spell it does not have.
  const collapsed = dedupeBySource(out, (r) => `${r.name.toLowerCase()}|${editionOf(r.source)}`);
  collapsed.sort((a, b) => a.name.localeCompare(b.name));
  indexBuiltAt = Date.now();
  return collapsed;
}

function creatureIndex({ refresh = false } = {}) {
  if (refresh || (indexPromise && Date.now() - indexBuiltAt > INDEX_TTL_MS)) indexPromise = null;
  if (!indexPromise) {
    indexPromise = buildIndex().catch((err) => {
      // Never cache a failure — the mirror being down for a moment must not
      // disable search until the process restarts.
      indexPromise = null;
      throw err;
    });
  }
  return indexPromise;
}

async function searchCreatures(query, limit = 50) {
  const idx = await creatureIndex();
  const q = String(query || '').trim().toLowerCase();
  if (!q) return idx.slice(0, limit);
  const starts = [];
  const contains = [];
  for (const row of idx) {
    const n = row.name.toLowerCase();
    if (n.startsWith(q)) starts.push(row);
    else if (n.includes(q)) contains.push(row);
    if (starts.length >= limit) break;
  }
  // Prefix matches first: someone typing "gob" wants Goblin, not
  // "Hobgoblin Warlord".
  return [...starts, ...contains].slice(0, limit);
}

// ── Artwork ──────────────────────────────────────────────────────────────────
//
// The mirror keeps two pictures per creature and this app has a slot for each:
//
//   token  img/bestiary/tokens/<SOURCE>/<Name>.webp — already round, already
//          cropped, already sized for a map. That is the creature's token face.
//   art    the full illustration, named by the fluff file. That becomes the
//          display image behind "show to players".
//
// Neither is guaranteed. `hasToken` and `hasFluffImages` on the monster say
// which exist, and a few entries point their token at another creature's
// (`token: { name, source }`) rather than having one of their own.
//
// Paths are returned RELATIVE to the mirror root and never fetched here — the
// browser pulls them through the image proxy, so a 40 MB illustration never
// travels through this process's memory on its way to one client.
const fluffCache = new Map(); // filename -> monsterFluff[] (or null when absent)

async function fluffFile(bestiaryFilename) {
  const name = `fluff-${bestiaryFilename}`;
  if (fluffCache.has(name)) return fluffCache.get(name);
  let list = null;
  try {
    const data = await getJson(`/data/bestiary/${name}`);
    list = Array.isArray(data?.monsterFluff) ? data.monsterFluff : [];
  } catch {
    // Plenty of sources ship no fluff file at all. That is not an error, it
    // just means no illustration for anything in it.
    list = null;
  }
  fluffCache.set(name, list);
  return list;
}

// Source code -> bestiary filename, so a fluff entry that copies from another
// book can be followed into the right file.
let sourceMapPromise = null;
function sourceMap() {
  if (!sourceMapPromise) {
    sourceMapPromise = getJson('/data/bestiary/index.json').catch((err) => {
      sourceMapPromise = null;
      throw err;
    });
  }
  return sourceMapPromise;
}

// The images for a fluff entry, following `_copy` to the entry that actually
// holds them.
//
// Following it is the whole point. In the 2024 books most creatures have no art
// of their own: 340 of the 588 XMM fluff entries are a `_copy` pointing at a
// group illustration — Goblin Boss at Goblins, Aarakocra Aeromancer at
// Aarakocra. That is not a near-miss to be avoided, it is the picture 5etools
// itself renders for them, and refusing to follow it left every 2024 import
// with no presentation art at all.
//
// Depth-capped, because the chain is data from someone else's disk and a cycle
// would spin here forever.
async function fluffImages(entry, fluffList, depth = 0) {
  if (!entry || depth > 3) return null;
  const own = entry.images?.find((i) => i?.href?.type === 'internal')?.href?.path;
  if (own) return own;
  const copy = entry._copy;
  if (!copy?.name) return null;

  let list = fluffList;
  const wantSource = String(copy.source || entry.source || '');
  if (wantSource && wantSource !== String(entry.source || '')) {
    // A different book: find its fluff file through the bestiary index.
    try {
      const map = await sourceMap();
      const file = map?.[wantSource];
      if (!file) return null;
      list = await fluffFile(file);
    } catch {
      return null;
    }
  }
  const next = (list || []).find(
    (f) => f.name === copy.name && String(f.source || '') === wantSource
  ) || (list || []).find((f) => f.name === copy.name);
  return fluffImages(next, list, depth + 1);
}

// Does the mirror actually have this file? Cached both ways — a miss is as
// worth remembering as a hit, and the fallback below asks about several
// candidates per creature.
const headCache = new Map(); // path -> boolean
async function mirrorHas(path) {
  if (headCache.has(path)) return headCache.get(path);
  let ok = false;
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 8000);
    try {
      const r = await fetch(`${baseUrl()}/${path}`, { method: 'HEAD', signal: ctl.signal });
      ok = r.ok;
    } finally { clearTimeout(timer); }
  } catch { ok = false; }
  headCache.set(path, ok);
  return ok;
}

// The chain of names a fluff entry copies through: Adult Bronze Dragon ->
// Bronze Dragon -> Metallic Dragons -> Dragons.
async function fluffCopyChain(entry, fluffList, depth = 0, out = []) {
  if (!entry || depth > 4) return out;
  const copy = entry._copy;
  if (!copy?.name) return out;
  out.push(copy.name);
  const next = (fluffList || []).find((f) => f.name === copy.name);
  return fluffCopyChain(next, fluffList, depth + 1, out);
}

const encPath = (p) => `img/${String(p).split('/').map(encodeURIComponent).join('/')}`;

// Where a creature's illustration lives when nothing in the fluff data points
// at one.
//
// The mirror's image files and its fluff JSON do not always agree. "Adult
// Bronze Dragon" has hasFluffImages set, but its fluff entry is a bare _copy
// chain — Bronze Dragon -> Metallic Dragons -> Dragons — and not one link in it
// carries an `images` key. The picture is nevertheless right there on disk, as
// `MM/Bronze Dragon.webp`: the art is filed under the GROUP, and every age
// category shares it.
//
// So when the data yields nothing, ask the filesystem. Candidates are the
// creature's own name first, then each name it copies through, each also tried
// without a trailing "s" — the 2024 books file the group as plural in the fluff
// ("Bronze Dragons") and singular on disk ("Bronze Dragon.webp").
//
// Guessing is only ever done as a LAST resort and every guess is verified with
// a HEAD before it is offered, so this can add a picture that data missed but
// can never invent one.
async function guessArtPath(monster, indexRow, fluffEntry, fluffList) {
  const source = String(monster.source || indexRow.source);
  const names = [monster.name, ...(await fluffCopyChain(fluffEntry, fluffList))];
  const tried = new Set();
  for (const name of names) {
    for (const variant of [name, name.replace(/s$/, '')]) {
      if (!variant || tried.has(variant)) continue;
      tried.add(variant);
      const path = encPath(`bestiary/${source}/${variant}.webp`);
      if (await mirrorHas(path)) return path;
    }
  }
  return null;
}

async function artPaths(monster, indexRow) {
  const out = { token: null, art: null };
  if (monster.hasToken !== false) {
    // An explicit override wins: some entries reuse another creature's token.
    const tName = monster.token?.name || monster.name;
    const tSource = monster.token?.source || monster.source || indexRow.source;
    if (monster.hasToken || monster.token) {
      out.token = `img/bestiary/tokens/${encodeURIComponent(tSource)}/${encodeURIComponent(tName)}.webp`;
    }
  }
  if (monster.hasFluffImages) {
    const fluff = await fluffFile(indexRow.file);
    const entry = (fluff || []).find(
      (f) => f.name === monster.name && String(f.source || '') === String(monster.source || indexRow.source)
    ) || (fluff || []).find((f) => f.name === monster.name);
    const href = await fluffImages(entry, fluff);
    if (href) out.art = encPath(href);
    // Data said there are images but pointed at none — fall back to looking for
    // the file. See guessArtPath for why that is not as loose as it sounds.
    if (!out.art) out.art = await guessArtPath(monster, indexRow, entry, fluff);
  }
  return out;
}

// The full stat block for one entry. `_copy` is resolved one level: a monster
// defined as a variant of another carries only its differences, and without
// this the import would land with no abilities at all.
async function getMonster(name, source) {
  const idx = await creatureIndex();
  const row = idx.find((r) => r.name === name && r.source === source)
    || idx.find((r) => r.name.toLowerCase() === String(name).toLowerCase()
                    && r.source.toLowerCase() === String(source).toLowerCase());
  if (!row) return null;
  const list = await bestiaryFile(row.file);
  const m = list.find((x) => x.name === row.name && String(x.source || '') === row.source)
    || list.find((x) => x.name === row.name);
  if (!m) return null;
  if (!m._copy) return { monster: m, approximated: false, indexRow: row };

  // Merge the base under the variant's own keys. `_mod` — the operations that
  // add or replace individual traits — is NOT applied: doing it properly is a
  // small interpreter, and silently importing a half-applied stat block is
  // worse than importing the base and saying so.
  try {
    const baseName = m._copy.name;
    const baseSource = m._copy.source || row.source;
    const baseIdx = idx.find((r) => r.name === baseName && r.source === baseSource);
    if (!baseIdx) return { monster: m, approximated: true, indexRow: row };
    const baseList = await bestiaryFile(baseIdx.file);
    const base = baseList.find((x) => x.name === baseName && String(x.source || '') === baseSource);
    if (!base) return { monster: m, approximated: true, indexRow: row };
    const merged = { ...base, ...m };
    delete merged._copy;
    return { monster: merged, approximated: !!m._copy._mod, indexRow: row };
  } catch {
    return { monster: m, approximated: true, indexRow: row };
  }
}

module.exports = {
  baseUrl, stripTags, entriesToText, blockList, ABILITY_WORDS,
  getJson, searchCreatures, getMonster, creatureIndex, monsterToCreature, artPaths,
  crText, typeText, sizeWord, sourceRank, dedupeBySource, editionOf,
};
