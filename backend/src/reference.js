// reference.js — everything in the rules that is NOT a creature, read from the
// same self-hosted 5etools mirror compendium.js already talks to.
//
// compendium.js exists to IMPORT: it converts a monster into a row this app can
// store and put on a map. This module exists to LOOK THINGS UP: nothing it
// returns is written anywhere, so a spell, a magic item, a condition and a feat
// can all be reduced to the same three fields — a name, a line of context and
// some text — and rendered by one component.
//
// Each kind is a few static files holding one array. That similarity is the
// whole design: a kind is a table entry here, not a module.
//
// Memory is the constraint that shapes the rest. items.json alone is near 3 MB
// of JSON, and holding every kind parsed would cost more than the rest of this
// server. So the index keeps three strings per entry and the file it came from,
// and the entry itself is re-read — through a small LRU — only when somebody
// opens it.

const fs = require('fs/promises');
const nodePath = require('path');

const { getJson, stripTags, entriesToText, dedupeBySource, editionOf } = require('./compendium');

// ── Rules the mirror does not carry ─────────────────────────────────────────
//
// The 5eTools mirror is the whole of this module's world, and there are things
// a table plays with that are not in it: Matt Mercer's Blood Hunter, his
// Gunslinger, anything a GM writes themselves later. Those live as ordinary
// 5eTools-shaped JSON in reference-local/ and are read off disk, so a local
// class is indexed, searched, opened and rendered by exactly the same code as
// a printed one — no second path through this file, and nothing to keep in
// step.
//
// A local path is marked with this prefix so `file()` knows to read it from
// disk rather than ask the mirror for it.
const LOCAL_PREFIX = 'local:';
const LOCAL_DIR = nodePath.join(__dirname, 'reference-local');

// Listed once per process. A file added to the folder shows up on the next
// restart, which is when a deploy happens anyway.
let localFilesPromise = null;
function localFiles() {
  if (!localFilesPromise) {
    localFilesPromise = fs.readdir(LOCAL_DIR)
      .then((names) => names.filter((n) => n.endsWith('.json')).sort()
        .map((n) => `${LOCAL_PREFIX}${n}`))
      .catch(() => []);            // no folder, no local rules — not an error
  }
  return localFilesPromise;
}

async function readLocal(path) {
  const name = path.slice(LOCAL_PREFIX.length);
  // Only a bare filename from the folder listing, never a path out of it.
  if (name.includes('/') || name.includes('..')) throw new Error(`bad local path ${path}`);
  return JSON.parse(await fs.readFile(nodePath.join(LOCAL_DIR, name), 'utf8'));
}

const SCHOOLS = {
  A: 'Abjuration', C: 'Conjuration', D: 'Divination', E: 'Enchantment',
  V: 'Evocation', I: 'Illusion', N: 'Necromancy', T: 'Transmutation', P: 'Psionic',
};

const ABILITY_NAMES = {
  str: 'Strength', dex: 'Dexterity', con: 'Constitution',
  int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma',
};


function spellSubtitle(sp) {
  const school = SCHOOLS[sp.school] || '';
  return Number(sp.level) === 0
    ? `${school} cantrip`.trim()
    : `Level ${sp.level} ${school}`.trim();
}

// 5etools stores an item's type as a two-letter code. "Uncommon · S" is not a
// shield to anyone reading it, so the codes are spelled out.
const ITEM_TYPES = {
  M: 'Melee weapon', R: 'Ranged weapon', A: 'Ammunition', AF: 'Ammunition',
  LA: 'Light armour', MA: 'Medium armour', HA: 'Heavy armour', S: 'Shield',
  WD: 'Wand', RD: 'Rod', RG: 'Ring', P: 'Potion', SC: 'Scroll', ST: 'Staff',
  G: 'Adventuring gear', T: 'Tool', AT: "Artisan's tools", INS: 'Instrument',
  GS: 'Gaming set', SCF: 'Spellcasting focus', TG: 'Trade good', $: 'Treasure',
  MNT: 'Mount', VEH: 'Vehicle', SHP: 'Ship', AIR: 'Airship', SPC: 'Spelljammer',
  TAH: 'Tack and harness', FD: 'Food', EXP: 'Explosive', EM: 'Eldritch machine',
  OTH: 'Other', IDG: 'Illegal drug',
};

function itemTypeWord(type) {
  const code = String(type || '').split('|')[0].toUpperCase();
  return ITEM_TYPES[code] || cap(code);
}

const FEAT_CATEGORIES = {
  G: 'General', O: 'Origin', FS: 'Fighting style', EB: 'Epic boon',
};

function itemSubtitle(it) {
  const bits = [];
  if (it.rarity && it.rarity !== 'none') bits.push(cap(it.rarity));
  if (it.wondrous) bits.push('Wondrous item');
  else if (it.type) bits.push(itemTypeWord(it.type));
  if (it.reqAttune) bits.push('requires attunement');
  return bits.join(' · ');
}

const cap = (s) => {
  const t = String(s || '');
  return t ? t[0].toUpperCase() + t.slice(1) : '';
};

// The kinds this app can look up. `files` is resolved once per kind; `arrays`
// names the keys inside each file that hold entries, because several files
// carry more than one (conditionsdiseases.json has conditions, diseases AND
// status effects).
const KINDS = {
  spell: {
    label: 'Spell',
    index: '/data/spells/index.json',        // source code -> filename
    dir: '/data/spells/',
    arrays: ['spell'],
    subtitle: spellSubtitle,
    // The school, so a result row can wear its own symbol rather than the
    // word "Spell" thirty times down a list.
    facets: (sp) => ({ school: SCHOOLS[sp.school] || '', level: Number(sp.level) || 0 }),
  },
  item: {
    label: 'Item',
    files: ['/data/items.json', '/data/items-base.json'],
    arrays: ['item', 'baseitem'],
    subtitle: itemSubtitle,
    // Magic or mundane: a Flame Tongue and a length of rope are both "Item",
    // and only one of them is worth noticing in a list.
    facets: (it) => ({
      magic: !!(it.rarity && it.rarity !== 'none') || !!it.wondrous,
      itemType: itemTypeWord(it.type),
    }),
  },
  condition: {
    label: 'Condition',
    files: ['/data/conditionsdiseases.json'],
    arrays: ['condition', 'disease', 'status'],
    subtitle: () => 'Condition',
  },
  action: {
    label: 'Action',
    files: ['/data/actions.json'],
    arrays: ['action'],
    subtitle: (a) => (Array.isArray(a.time)
      ? a.time.map((t) => cap(typeof t === 'string' ? t : t?.unit || '')).filter(Boolean).join(', ') || 'Action'
      : 'Action'),
  },
  feat: {
    label: 'Feat',
    files: ['/data/feats.json'],
    arrays: ['feat'],
    subtitle: (f) => `${FEAT_CATEGORIES[String(f.category || '').toUpperCase()] || 'General'} feat`,
  },
  species: {
    label: 'Species',
    files: ['/data/races.json'],
    arrays: ['race'],
    subtitle: (r) => (r.size ? `Species · ${({ T: 'Tiny', S: 'Small', M: 'Medium', L: 'Large' })[[].concat(r.size)[0]] || 'Medium'}` : 'Species'),
  },
  background: {
    label: 'Background',
    files: ['/data/backgrounds.json'],
    arrays: ['background'],
    subtitle: () => 'Background',
  },
  rule: {
    label: 'Rule',
    files: ['/data/variantrules.json'],
    arrays: ['variantrule'],
    subtitle: (r) => (r.ruleType === 'V' ? 'Variant rule' : 'Rule'),
  },

  // ── Classes ────────────────────────────────────────────────────────────────
  //
  // One file per class, each holding four arrays: the class, its subclasses,
  // and the two kinds of feature. They are four separate kinds here rather than
  // one because a player looking up "Rage" wants the feature, and a player
  // looking up "Barbarian" wants the class — and because a feature's name alone
  // is nowhere near unique. Every class has a "Spellcasting"; most have an
  // "Ability Score Improvement". The key below is what tells them apart.
  class: {
    label: 'Class',
    index: '/data/class/index.json',
    dir: '/data/class/',
    arrays: ['class'],
    subtitle: (c) => (c.edition === 'one' ? 'Class (2024)' : 'Class'),
  },
  subclass: {
    label: 'Subclass',
    index: '/data/class/index.json',
    dir: '/data/class/',
    arrays: ['subclass'],
    subtitle: (c) => `${c.className || 'Class'} subclass`,
    extra: (c) => String(c.className || ''),
  },
  classFeature: {
    label: 'Class feature',
    index: '/data/class/index.json',
    dir: '/data/class/',
    arrays: ['classFeature'],
    subtitle: (f) => `${f.className || 'Class'} · level ${f.level || 1}`,
    extra: (f) => `${f.className || ''}:${f.level || ''}`,
  },
  subclassFeature: {
    label: 'Subclass feature',
    index: '/data/class/index.json',
    dir: '/data/class/',
    arrays: ['subclassFeature'],
    subtitle: (f) => `${f.subclassShortName || 'Subclass'} (${f.className || ''}) · level ${f.level || 1}`,
    extra: (f) => `${f.className || ''}:${f.subclassShortName || ''}:${f.level || ''}`,
  },
  // Eldritch Invocations, Metamagic, Fighting Styles, Battle Master manoeuvres —
  // all the pick-lists that hang off a class.
  option: {
    label: 'Class option',
    files: ['/data/optionalfeatures.json'],
    arrays: ['optionalfeature'],
    subtitle: (o) => OPTION_WORDS[[].concat(o.featureType || [])[0]] || 'Class option',
  },
};

// The pick-lists in optionalfeatures.json are tagged by a short code.
const OPTION_WORDS = {
  EI: 'Eldritch Invocation', MM: 'Metamagic', FS: 'Fighting Style',
  'FS:F': 'Fighting Style', 'FS:P': 'Fighting Style', 'FS:R': 'Fighting Style',
  'FS:B': 'Fighting Style', MV: 'Manoeuvre', 'MV:B': 'Battle Master manoeuvre',
  'MV:C2-UA': 'Manoeuvre', AI: 'Artificer Infusion', RN: 'Rune',
  AF: 'Alchemical Formula', TT: 'Thief Trick', OTH: 'Class option',
  'PB': 'Pact Boon', 'EM': 'Elemental Discipline', 'AS': 'Arcane Shot',
};

// What makes one entry different from another with the same name.
//
// A name and a source is enough for a spell or an item and nowhere near enough
// for a class feature: every class has a "Spellcasting", most have an "Ability
// Score Improvement", and several have both twice over at different levels. The
// kind supplies whatever else pins it down, and the key is what the client
// sends back to open it.
function keyFor(def, row) {
  const extra = def.extra ? String(def.extra(row) || '') : '';
  return [String(row.name || ''), String(row.source || ''), extra].join('|');
}

// ── File access ──────────────────────────────────────────────────────────────
//
// Bounded, for the same reason compendium.js bounds its bestiary cache: these
// are other people's files and some of them are megabytes.
const FILE_CACHE_MAX = 10;
const fileCache = new Map(); // path -> parsed json

async function file(path) {
  const hit = fileCache.get(path);
  if (hit) {                                   // Map order is the LRU.
    fileCache.delete(path);
    fileCache.set(path, hit);
    return hit;
  }
  const data = path.startsWith(LOCAL_PREFIX) ? await readLocal(path) : await getJson(path);
  fileCache.set(path, data);
  while (fileCache.size > FILE_CACHE_MAX) fileCache.delete(fileCache.keys().next().value);
  return data;
}

async function pathsFor(kind) {
  const def = KINDS[kind];
  if (!def) return [];
  // Every local file is offered to every kind. They are a handful of small
  // files, `entriesIn` takes only the arrays the kind asks for, and the
  // alternative is a second registry saying which file holds what — one more
  // thing to forget to update.
  const local = await localFiles();
  if (def.files) return [...def.files, ...local];
  const idx = await getJson(def.index).catch(() => ({}));
  return [...Object.values(idx || {}).map((f) => `${def.dir}${f}`), ...local];
}

function entriesIn(data, def) {
  const out = [];
  for (const key of def.arrays) {
    for (const row of (Array.isArray(data?.[key]) ? data[key] : [])) out.push(row);
  }
  return out;
}

// ── The index ────────────────────────────────────────────────────────────────
//
// One slim row per entry, built lazily per kind and shared between callers, so
// ten people searching at once trigger one pass rather than ten. A failure is
// never cached: the mirror being down for a moment must not disable search for
// the life of the process.
const INDEX_TTL_MS = 60 * 60 * 1000;
const indexes = new Map(); // kind -> { promise, builtAt }

async function buildIndex(kind) {
  const def = KINDS[kind];
  const out = [];
  for (const path of await pathsFor(kind)) {
    let data;
    try {
      data = await file(path);
    } catch (err) {
      // One unreadable file must not cost the whole kind.
      console.error(`reference: skipping ${path}:`, err.message);
      continue;
    }
    for (const row of entriesIn(data, def)) {
      if (!row?.name) continue;
      out.push({
        kind,
        name: String(row.name),
        source: String(row.source || ''),
        edition: editionOf(row.source),
        subtitle: String(def.subtitle(row) || def.label),
        extra: def.extra ? String(def.extra(row) || '') : '',
        key: keyFor(def, row),
        path,
        ...(def.facets ? def.facets(row) : null),
      });
    }
  }
  // One row per thing, not one per printing — see dedupeBySource. The identity
  // is the name plus whatever the kind uses to tell same-named entries apart,
  // so Rage (PHB) and Rage (XPHB) collapse while a Barbarian's Rage and a
  // Zealot's Rage of the Gods stay separate.
  const collapsed = dedupeBySource(out, (r) => `${r.name.toLowerCase()}|${r.extra}|${editionOf(r.source)}`);
  collapsed.sort((a, b) => a.name.localeCompare(b.name));
  return collapsed;
}

function index(kind) {
  const held = indexes.get(kind);
  if (held && Date.now() - held.builtAt < INDEX_TTL_MS) return held.promise;
  const promise = buildIndex(kind).catch((err) => {
    indexes.delete(kind);
    throw err;
  });
  indexes.set(kind, { promise, builtAt: Date.now() });
  return promise;
}

// ── Searching ────────────────────────────────────────────────────────────────
//
// Ranked, not filtered: someone typing "fire" wants Fireball before "Ring of
// Fire Resistance", and someone typing a whole name wants that exact thing
// first whatever else contains it.
function rank(name, q) {
  const n = name.toLowerCase();
  if (n === q) return 0;
  if (n.startsWith(q)) return 1;
  if (n.includes(` ${q}`)) return 2;          // a word boundary inside the name
  if (n.includes(q)) return 3;
  return -1;
}

async function searchKind(kind, query, limit = 25) {
  const idx = await index(kind);
  const q = String(query || '').trim().toLowerCase();
  if (!q) return idx.slice(0, limit);
  const hits = [];
  for (const row of idx) {
    const r = rank(row.name, q);
    if (r < 0) continue;
    hits.push({ row, r });
  }
  hits.sort((a, b) => a.r - b.r || a.row.name.length - b.row.name.length
    || a.row.name.localeCompare(b.row.name));
  return hits.slice(0, limit).map((h) => h.row);
}

// Every kind at once, which is what a single search box wants.
async function searchAll(query, { limit = 40, kinds = null } = {}) {
  const wanted = (kinds && kinds.length ? kinds : Object.keys(KINDS))
    .filter((k) => KINDS[k]);
  const per = Math.max(5, Math.ceil(limit / Math.max(1, wanted.length)) + 3);
  const lists = await Promise.all(wanted.map((k) =>
    searchKind(k, query, per).catch((err) => {
      // A kind whose files are missing drops out of the results rather than
      // failing the whole search.
      console.error(`reference: ${k} search failed:`, err.message);
      return [];
    })
  ));
  const q = String(query || '').trim().toLowerCase();
  const all = lists.flat().map((row) => ({ ...row, r: q ? rank(row.name, q) : 9 }));
  all.sort((a, b) => a.r - b.r || a.name.length - b.name.length || a.name.localeCompare(b.name));
  return all.slice(0, limit).map(({ r, ...row }) => row);
}

// ── A class, in full ─────────────────────────────────────────────────────────
//
// A class is the one kind whose own record says almost nothing: its text lives
// in the classFeature array beside it, and its shape lives in a table of
// columns that differ per class. Listing the feature NAMES, which is all this
// did at first, answers none of the questions anyone opens a class to ask —
// what does Rage do, when do I get 3rd-level spells, what can I cast.
//
// So a class entry carries three things the other kinds do not: every feature
// with its text, the level table, and the name of the spell list to pull.

// The proficiency bonus is the same for every class and is not in the data.
const PROF_BONUS = [2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 6, 6, 6, 6];

const SLOT_LABELS = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th'];

// The class's own features, each with its rules text, in level order. Features
// are matched on the class AND its source so a 2024 class never picks up the
// 2014 printing's text.
function classFeatures(full, data) {
  return (Array.isArray(data.classFeature) ? data.classFeature : [])
    .filter((f) => f.className === full.name && f.classSource === full.source)
    .sort((a, b) => (a.level || 0) - (b.level || 0))
    .map((f) => {
      const split = splitTables(f.entries);
      return {
        level: Number(f.level) || 1,
        name: stripTags(f.name || ''),
        text: split.text,
        tables: split.tables,
      };
    });
}

// The level table, as the book prints it: one row per level, the features
// gained at that level, and whatever columns the class carries — cantrips
// known, prepared spells, rages, sneak attack, and the spell-slot grid.
function classTable(full, feats) {
  const cols = ['Level', 'PB', 'Features'];
  const cells = [];                       // cells[level-1] = [..col values]

  for (let lvl = 1; lvl <= 20; lvl++) {
    cells.push([
      String(lvl),
      `+${PROF_BONUS[lvl - 1]}`,
      feats.filter((f) => f.level === lvl).map((f) => f.name).join(', ') || '—',
    ]);
  }

  for (const group of (Array.isArray(full.classTableGroups) ? full.classTableGroups : [])) {
    // A spell-slot group has no column labels of its own worth printing —
    // "1st | 2nd | 3rd" is the whole of it — and its rows are arrays of counts.
    if (Array.isArray(group.rowsSpellProgression)) {
      const width = Math.max(...group.rowsSpellProgression.map((r) => r.length), 0);
      for (let i = 0; i < width; i++) cols.push(SLOT_LABELS[i] || `L${i + 1}`);
      group.rowsSpellProgression.forEach((row, lvlIdx) => {
        if (!cells[lvlIdx]) return;
        for (let i = 0; i < width; i++) {
          const n = Number(row[i]) || 0;
          cells[lvlIdx].push(n > 0 ? String(n) : '—');
        }
      });
      continue;
    }
    const labels = (group.colLabels || []).map((l) => stripTags(l));
    labels.forEach((l) => cols.push(l));
    (group.rows || []).forEach((row, lvlIdx) => {
      if (!cells[lvlIdx]) return;
      labels.forEach((_, i) => {
        const v = Array.isArray(row) ? row[i] : null;
        cells[lvlIdx].push(v == null || v === '' ? '—' : stripTags(String(
          typeof v === 'object' ? (v.value ?? v.entry ?? JSON.stringify(v)) : v
        )));
      });
    });
  }

  return { columns: cols, rows: cells };
}

// ── Class spell lists ────────────────────────────────────────────────────────
//
// A 5etools spell record does not say which classes may cast it; the lists are
// assembled the other way round, in one generated file mapping each spell to
// the books that put it on a class's list. One fetch, held for the hour, backs
// every class.
const SPELL_LOOKUP = '/data/generated/gendata-spell-source-lookup.json';
let spellListPromise = null;
let spellListBuiltAt = 0;

async function spellListIndex() {
  if (spellListPromise && Date.now() - spellListBuiltAt < INDEX_TTL_MS) return spellListPromise;
  spellListBuiltAt = Date.now();
  spellListPromise = (async () => {
    const data = await getJson(SPELL_LOOKUP);
    const byClass = new Map();            // 'wizard' -> Set(spell name, lowercase)
    for (const spells of Object.values(data || {})) {
      for (const [name, info] of Object.entries(spells || {})) {
        for (const classes of Object.values((info || {}).class || {})) {
          for (const cls of Object.keys(classes || {})) {
            const key = cls.toLowerCase();
            if (!byClass.has(key)) byClass.set(key, new Set());
            byClass.get(key).add(String(name).toLowerCase());
          }
        }
      }
    }
    return byClass;
  })().catch((err) => { spellListPromise = null; throw err; });
  return spellListPromise;
}

/** Every spell a class may learn or prepare, with its level and school. */
async function spellsForClass(className) {
  const byClass = await spellListIndex();
  const want = byClass.get(String(className || '').toLowerCase());
  if (!want) return [];
  const spells = await index('spell');
  const out = spells
    .filter((row) => want.has(row.name.toLowerCase()))
    .map((row) => ({
      name: row.name,
      source: row.source,
      key: row.key,
      edition: row.edition,
      subtitle: row.subtitle,
      // "Level 3 Evocation" / "Evocation cantrip" — parsed back to a number so
      // the client can group by level without a second lookup.
      level: /cantrip/i.test(row.subtitle) ? 0 : Number((row.subtitle.match(/Level (\d)/) || [])[1]) || 0,
    }));
  out.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
  // One button per spell. The index holds a row per edition, so a class list
  // built straight off it showed every spell twice under identical labels; the
  // newer printing is the one a 2024 table is casting.
  const best = new Map();
  for (const sp of out) {
    const key = sp.name.toLowerCase();
    const held = best.get(key);
    if (!held || (sp.edition === '2024' && held.edition !== '2024')) best.set(key, sp);
  }
  return [...best.values()].sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
}

// ── Named sections ───────────────────────────────────────────────────────────
//
// A species, a background and a feat are all written the same way: a short
// paragraph or two, then a run of NAMED things — Darkvision, Dwarven
// Resilience, Stonecunning. Flattened into one block of text those names stop
// being headings and become sentences that happen to start with a capital, and
// a species reads as a wall. Split out, each is a thing you can look for.
function namedSections(entries) {
  const out = [];
  const loose = [];
  const looseTables = [];
  for (const e of (Array.isArray(entries) ? entries : [])) {
    if (typeof e === 'string') { loose.push(stripTags(e)); continue; }
    if (e?.type === 'table') { looseTables.push(tableOf(e)); continue; }
    const name = stripTags(e?.name || '');
    const block = splitTables(e?.entries ?? e?.entry ?? e);
    if (name) out.push({ name, text: block.text, tables: block.tables });
    else {
      if (block.text) loose.push(block.text);
      looseTables.push(...block.tables);
    }
  }
  return {
    sections: out,
    intro: loose.filter(Boolean).join('\n\n'),
    tables: looseTables.filter(Boolean),
  };
}

// A 5etools table, in the shape the client already draws for a class's level
// table: labelled columns and rows of plain strings.
function tableOf(t) {
  if (!t || t.type !== 'table') return null;
  const columns = (t.colLabels || []).map((c) => stripTags(c));
  const rows = (t.rows || []).slice(0, 200).map((r) => (Array.isArray(r) ? r : [r])
    .map((cell) => (typeof cell === 'object' && cell !== null
      ? entriesToText(cell.entries ?? cell.entry ?? cell.roll ?? cell)
      : stripTags(String(cell ?? '')))));
  if (!rows.length) return null;
  return { caption: stripTags(t.caption || t.name || ''), columns, rows };
}

// TABLES ARE NOT PROSE.
//
// Flattened into text a table becomes "Barbarian | Strength 13" on a line of
// its own, repeated down the page — which is how the Multiclassing rule, whose
// substance is two tables, read as an unbroken wall. They are lifted out here
// and drawn as tables; what is left is the prose around them.
function splitTables(entries, depth = 0) {
  const tables = [];
  const keep = [];
  const walk = (e) => {
    if (e == null || depth > 6) return;
    if (Array.isArray(e)) { e.forEach(walk); return; }
    if (typeof e !== 'object') { keep.push(e); return; }
    if (e.type === 'table') {
      const t = tableOf(e);
      if (t) tables.push(t);
      return;
    }
    const inner = e.entries ?? e.entry ?? null;
    if (inner) {
      const split = splitTables(inner, depth + 1);
      tables.push(...split.tables);
      keep.push(e.name ? { ...e, entries: [split.text] } : split.text);
      return;
    }
    keep.push(e);
  };
  walk(entries);
  return { text: entriesToText(keep), tables };
}

// A species' artwork and the lore written beside it, from the mirror's fluff
// file. Entirely optional: plenty of species have neither, and the card simply
// shows what it has.
async function speciesFluff(name, source) {
  let data;
  try {
    data = await file('/data/fluff-races.json');
  } catch (err) {
    console.error('reference: race fluff unavailable:', err.message);
    return null;
  }
  const rows = Array.isArray(data?.raceFluff) ? data.raceFluff : [];
  const match = (n, src) => rows.find((r) => r.name === n && (!src || r.source === src));
  let row = match(name, source) || match(name);
  if (!row) return null;
  // "This one is that one, with changes" — resolved one level, which is as far
  // as the race fluff ever goes.
  if (row._copy) {
    const base = match(row._copy.name, row._copy.source) || match(row._copy.name);
    if (base) row = { ...base, ...row, images: row.images || base.images };
  }
  const href = (row.images || []).map((i) => i?.href?.path).find(Boolean);
  return {
    image: href
      ? `img/${String(href).split('/').map(encodeURIComponent).join('/')}`
      : null,
    lore: entriesToText(row.entries),
  };
}

// A class or a subclass's artwork and lore, from the per-class fluff file that
// sits beside the class data on the mirror. Optional throughout: plenty of
// subclasses have no picture, and the card simply shows what it has.
async function classFluff(className, { subclass = null, shortName = null, source = null } = {}) {
  const slug = String(className || '').toLowerCase().replace(/\s+/g, '-');
  if (!slug) return null;
  let data;
  try {
    data = await file(`/data/class/fluff-class-${slug}.json`);
  } catch {
    return null;                       // a class the mirror has no fluff for
  }
  const rows = subclass
    ? (Array.isArray(data?.subclassFluff) ? data.subclassFluff : [])
    : (Array.isArray(data?.classFluff) ? data.classFluff : []);

  const named = (r) => [r.name, r.shortName].filter(Boolean).map((x) => String(x).toLowerCase());
  const wants = [subclass, shortName].filter(Boolean).map((x) => String(x).toLowerCase());
  const hit = subclass
    ? rows.find((r) => named(r).some((n) => wants.includes(n)) && (!source || r.source === source))
      || rows.find((r) => named(r).some((n) => wants.includes(n)))
    : rows.find((r) => r.name === className && (!source || r.source === source))
      || rows.find((r) => r.name === className);
  if (!hit) return null;

  const href = (hit.images || []).map((i) => i?.href?.path).find(Boolean);
  return {
    image: href
      ? `img/${String(href).split('/').map(encodeURIComponent).join('/')}`
      : null,
    lore: entriesToText(hit.entries),
  };
}

// ── Spells a subclass or a class hands you ───────────────────────────────────
//
// A Life Domain Cleric's Bless, a Circle of the Moon Druid's Moonbeam. These
// are written on the subclass as `additionalSpells`, keyed by the CLASS level
// they arrive at, and they were reaching the page only as names inside a
// feature's prose — unopenable, so looking one up meant going back to the
// search box and typing it.
//
// Resolved against the spell index here so each one carries the key that opens
// it, which is the whole point: a granted spell should be one tap from the
// subclass that grants it.
const SPELL_BUCKETS = ['prepared', 'known', 'innate', 'expanded'];

// The kinds whose whole content is prose: a few paragraphs, some named parts,
// sometimes a table. Spells and items are handled separately because they have
// structured fields of their own to show first.
const PROSE_KINDS = new Set([
  'background', 'feat', 'rule', 'condition', 'action', 'option',
  'classFeature', 'subclassFeature',
]);

// A bucket's value is an array of entries, or an object of them keyed by
// something the UI does not care about ({ "_": [...] }). An entry is usually
// "fireball|xphb" and sometimes an object describing a CHOICE — "any Druid
// cantrip" — which has no one spell to link to and is left out.
function spellNamesIn(value) {
  const out = [];
  const walk = (v) => {
    if (!v) return;
    if (Array.isArray(v)) { v.forEach(walk); return; }
    if (typeof v === 'object') {
      // A CHOICE, not a spell: { choose: "level=0|class=Druid" } means "any
      // Druid cantrip". Walking into it produced a listing called "level=0".
      if ('choose' in v) return;
      Object.values(v).forEach(walk);
      return;
    }
    if (typeof v !== 'string') return;
    const name = v.split('|')[0].split('#')[0].trim();
    if (name) out.push(name);
  };
  walk(value);
  return out;
}

// 5etools stores weapon properties as codes. "V, F, T" is not a weapon to
// anyone reading it.
// 5etools abbreviates damage types on items the way it abbreviates everything
// else.
const DAMAGE_WORDS = {
  B: 'bludgeoning', P: 'piercing', S: 'slashing', A: 'acid', C: 'cold',
  F: 'fire', FO: 'force', L: 'lightning', N: 'necrotic', I: 'poison',
  Y: 'psychic', R: 'radiant', T: 'thunder',
};

const RECHARGE_WORDS = {
  dawn: 'at dawn', dusk: 'at dusk', midnight: 'at midnight',
  special: 'on a condition of its own', restShort: 'on a short rest',
  restLong: 'on a long rest', never: '— never',
};

const WEAPON_PROPS = {
  V: 'Versatile', F: 'Finesse', T: 'Thrown', '2H': 'Two-handed', A: 'Ammunition',
  LD: 'Loading', L: 'Light', R: 'Reach', H: 'Heavy', S: 'Special', RLD: 'Reload',
  BF: 'Burst fire', AF: 'Ammunition', ER: 'Extended reach',
};

const propWord = (p) => {
  const code = String(typeof p === 'object' ? (p.uid || p.name || '') : p).split('|')[0].toUpperCase();
  return WEAPON_PROPS[code] || cap(code.toLowerCase());
};

// A flat list of spell names — an item's attachedSpells — resolved to chips the
// client can open. Same job as grantedSpells below, without the level grouping:
// a Staff of Power casts what it casts, with no progression to show.
async function resolveSpellNames(names) {
  // An item's attachedSpells is a flat array on most items and a map keyed by
  // the charge cost on some — a Staff of Power lists its spells under 1, 2, 5
  // and 6 charges. Both shapes flatten the same way, which is what
  // spellNamesIn is for.
  const list = spellNamesIn(names);
  if (!list.length) return null;
  const idx = await index('spell');
  const byName = new Map();
  for (const row of idx) {
    const key = row.name.toLowerCase();
    if (!byName.has(key)) byName.set(key, []);
    byName.get(key).push(row);
  }
  const seen = new Set();
  const out = [];
  for (const name of list) {
    const low = name.toLowerCase();
    if (seen.has(low)) continue;
    seen.add(low);
    const matches = byName.get(low) || [];
    const row = matches.find((r) => r.edition === '2024') || matches[0] || null;
    out.push({
      name: row?.name || name.replace(/\b\w/g, (c) => c.toUpperCase()),
      key: row?.key || null,
      subtitle: row?.subtitle || '',
    });
  }
  return out.length ? out : null;
}

// An item's artwork, from the mirror's item fluff file.
async function itemFluff(name, source) {
  let data;
  try {
    data = await file('/data/fluff-items.json');
  } catch {
    return null;
  }
  const rows = Array.isArray(data?.itemFluff) ? data.itemFluff : [];
  const row = rows.find((r) => r.name === name && (!source || r.source === source))
    || rows.find((r) => r.name === name);
  if (!row) return null;
  const href = (row.images || []).map((i) => i?.href?.path).find(Boolean);
  return href
    ? `img/${String(href).split('/').map(encodeURIComponent).join('/')}`
    : null;
}

async function grantedSpells(additionalSpells) {
  const groups = Array.isArray(additionalSpells) ? additionalSpells : [];
  if (!groups.length) return null;

  const idx = await index('spell');
  const byName = new Map();
  for (const row of idx) {
    const key = row.name.toLowerCase();
    if (!byName.has(key)) byName.set(key, []);
    byName.get(key).push(row);
  }

  const out = [];
  for (const group of groups) {
    const groupName = stripTags(group?.name || '');
    const levels = new Map();                  // class level -> [spell]
    for (const bucket of SPELL_BUCKETS) {
      const map = group?.[bucket];
      if (!map || typeof map !== 'object') continue;
      for (const [lvl, value] of Object.entries(map)) {
        const at = Number(lvl) || 1;
        if (!levels.has(at)) levels.set(at, []);
        for (const name of spellNamesIn(value)) {
          const matches = byName.get(name.toLowerCase()) || [];
          // Prefer the newer printing, which is what the spell index sorts to
          // first for a 2024 subclass; a spell the library has never heard of
          // is still listed, just without a key to open.
          const row = matches.find((r) => r.edition === '2024') || matches[0] || null;
          const list = levels.get(at);
          if (list.some((x) => x.name.toLowerCase() === name.toLowerCase())) continue;
          list.push({
            name: row?.name || name.replace(/\b\w/g, (c) => c.toUpperCase()),
            key: row?.key || null,
            subtitle: row?.subtitle || '',
          });
        }
      }
    }
    const byLevel = [...levels.entries()]
      .filter(([, list]) => list.length)
      .sort((a, b) => a[0] - b[0])
      .map(([level, spells]) => ({ level, spells }));
    if (byLevel.length) out.push({ name: groupName, levels: byLevel });
  }
  return out.length ? out : null;
}

// ── One entry, in full ───────────────────────────────────────────────────────
//
// `meta` is the handful of labelled fields that belong above the text — a
// spell's casting time, an item's rarity — and differs per kind. `body` is
// everything else, already flattened to plain paragraphs.
function timeText(list) {
  return (Array.isArray(list) ? list : []).map((t) => {
    if (typeof t === 'string') return t;
    const unit = t?.unit === 'bonus' ? 'Bonus Action' : cap(t?.unit || '');
    const n = Number(t?.number);
    const bare = ['Action', 'Bonus Action', 'Reaction'].includes(unit);
    const head = bare && (!n || n === 1) ? unit : `${n || 1} ${unit}`;
    return t?.condition ? `${head}, ${stripTags(t.condition)}` : head;
  }).filter(Boolean).join(', ');
}

function rangeText(r) {
  if (!r) return '';
  const d = r.distance || {};
  const base = d.type === 'self' ? 'Self'
    : d.type === 'touch' ? 'Touch'
    : d.type === 'sight' ? 'Sight'
    : d.type === 'unlimited' ? 'Unlimited'
    : d.amount != null ? `${d.amount} ${d.type === 'feet' ? 'feet' : d.type}`
    : cap(d.type || '');
  return r.type && !['point', 'special'].includes(r.type) ? `${base} (${r.type})` : base;
}

function durationText(list) {
  return (Array.isArray(list) ? list : []).map((d) => {
    let out;
    if (d?.type === 'instant') out = 'Instantaneous';
    else if (d?.type === 'permanent') out = 'Until dispelled';
    else if (d?.type === 'special') out = 'Special';
    else {
      const amount = d?.duration?.amount;
      const unit = d?.duration?.type || '';
      out = `${amount ?? ''} ${unit}${amount && amount !== 1 ? 's' : ''}`.trim() || 'Special';
    }
    return d?.concentration ? `Concentration, up to ${out}` : out;
  }).filter(Boolean).join(', ');
}

function componentsText(c) {
  if (!c) return '';
  const bits = [];
  if (c.v) bits.push('V');
  if (c.s) bits.push('S');
  if (c.m) {
    const text = typeof c.m === 'object' ? stripTags(c.m.text || '') : stripTags(c.m);
    bits.push(text ? `M (${text})` : 'M');
  }
  return bits.join(', ');
}

function metaFor(kind, row) {
  const meta = [];
  const add = (label, value) => { if (value) meta.push({ label, value: String(value) }); };
  if (kind === 'spell') {
    add('Casting time', timeText(row.time));
    add('Range', rangeText(row.range));
    add('Components', componentsText(row.components));
    add('Duration', durationText(row.duration));
  } else if (kind === 'item') {
    add('Type', row.wondrous ? 'Wondrous item' : (row.type ? itemTypeWord(row.type) : ''));
    add('Rarity', row.rarity && row.rarity !== 'none' ? cap(row.rarity) : '');
    add('Attunement', row.reqAttune === true ? 'Required'
      : (typeof row.reqAttune === 'string' ? cap(stripTags(row.reqAttune)) : ''));
    // The bonuses an item carries are structured, and they are the first thing
    // anyone wants off a magic weapon — they were buried in the prose.
    add('Attack & damage', row.bonusWeapon || '');
    add('Armour class', row.bonusAc || (row.ac ? String(row.ac) : ''));
    add('Spell attack', row.bonusSpellAttack || '');
    add('Saving throws', row.bonusSavingThrow || '');
    add('Damage', [
      row.dmg1 ? `${row.dmg1}${row.dmgType ? ` ${DAMAGE_WORDS[row.dmgType] || row.dmgType}` : ''}` : '',
      row.dmg2 ? `${row.dmg2} two-handed` : '',
    ].filter(Boolean).join(', '));
    // Weapons and armour are the same kind as a magic item here, and these are
    // the fields that make one a weapon or a suit of armour rather than a
    // wondrous whatsit: what it is trained as, and what wearing it costs you.
    add('Category', row.weaponCategory ? `${cap(row.weaponCategory)} weapon` : '');
    add('Properties', (row.property || []).map(propWord).filter(Boolean).join(', '));
    add('Strength needed', row.strength ? `Str ${row.strength}` : '');
    add('Stealth', row.stealth ? 'Disadvantage' : '');
    add('Charges', row.charges
      ? `${row.charges}${row.recharge
        ? ` · regains ${stripTags(String(row.rechargeAmount ?? ''))} ${RECHARGE_WORDS[row.recharge] || row.recharge}`.replace(/\s+/g, ' ')
        : ''}`
      : '');
    add('Range', row.range ? `${row.range} ft.` : '');
    add('Weight', row.weight ? `${row.weight} lb.` : '');
    add('Value', row.value ? `${Number(row.value) / 100} gp` : '');
  } else if (kind === 'feat') {
    add('Prerequisite', row.prerequisite ? entriesToText(row.prerequisite) : '');
  } else if (kind === 'action') {
    add('Time', timeText(row.time));
  } else if (kind === 'class') {
    add('Hit die', row.hd ? `d${row.hd.faces}` : '');
    add('Saving throws', (row.proficiency || []).map((a) => ABILITY_NAMES[a] || a).join(', '));
    add('Primary ability', (row.primaryAbility || [])
      .flatMap((o) => Object.keys(o || {})).map((a) => ABILITY_NAMES[a] || a).join(' or '));
    add('Spellcasting', ABILITY_NAMES[row.spellcastingAbility] || '');
    const sp = row.startingProficiencies || {};
    add('Armour', (sp.armor || []).map((a) => cap(typeof a === 'string' ? a : a?.full || '')).join(', '));
    add('Weapons', (sp.weapons || []).map((w) => cap(stripTags(typeof w === 'string' ? w : w?.full || '')).split('|')[0]).join(', '));
  } else if (kind === 'species') {
    add('Size', [].concat(row.size || []).map((x) => ({ T: 'Tiny', S: 'Small', M: 'Medium', L: 'Large' })[x] || x).join(' or '));
    add('Speed', row.speed ? `${typeof row.speed === 'object' ? row.speed.walk : row.speed} ft.` : '');
    add('Darkvision', row.darkvision ? `${row.darkvision} ft.` : '');
    add('Creature type', (row.creatureTypes || []).map(cap).join(', '));
    add('Resistances', [].concat(row.resist || []).map((r) => cap(typeof r === 'string' ? r : r?.resist || '')).filter(Boolean).join(', '));
  } else if (kind === 'subclass') {
    add('Class', row.className || '');
  } else if (kind === 'classFeature' || kind === 'subclassFeature') {
    add('Class', row.className || '');
    add('Subclass', row.subclassShortName || '');
    add('Level', row.level ? String(row.level) : '');
  } else if (kind === 'option') {
    add('Prerequisite', row.prerequisite ? entriesToText(row.prerequisite) : '');
  }
  return meta;
}

async function getEntry(kind, keyOrName, source = '') {
  const def = KINDS[kind];
  if (!def) return null;
  const idx = await index(kind);
  const want = String(keyOrName || '');
  const wantLower = want.toLowerCase();
  const wantSource = String(source || '').toLowerCase();

  // The exact key first — that is what a search result hands back.
  //
  // Then the same key WITHOUT its source. A key is name|source|extra, and the
  // index keeps one printing per thing, so a caller holding the PHB key for a
  // subclass the index kept from XPHB would otherwise find nothing. Name and
  // extra together still identify it; the source is the part allowed to drift.
  //
  // A bare name is last, so a link typed by hand or held by an older client
  // resolves to the best match rather than to nothing.
  const [keyName = '', , keyExtra = ''] = want.split('|');
  const row = idx.find((r) => r.key === want)
    || (want.includes('|') && idx.find((r) => r.name.toLowerCase() === keyName.toLowerCase()
      && (r.extra || '') === keyExtra))
    || idx.find((r) => r.name.toLowerCase() === wantLower
      && (!wantSource || r.source.toLowerCase() === wantSource))
    || idx.find((r) => r.name.toLowerCase() === wantLower);
  if (!row) return null;

  const data = await file(row.path);
  const full = entriesIn(data, def).find((e) => keyFor(def, e) === row.key);
  if (!full) return null;

  // An item or species written as "the base one, with changes" is served as a
  // _copy. Resolving that properly is a small interpreter; showing the entry
  // that IS there, and saying it may be partial, beats showing nothing.
  const partial = !!full._copy;

  const bodyParts = [
    entriesToText(full.entries),
    entriesToText(full.entriesHigherLevel),
  ].filter(Boolean);

  // A class and a subclass carry no prose of their own: their text lives in the
  // feature arrays beside them in the same file. Without this a search for
  // "Barbarian" opened a card with a hit die and nothing else, which is the one
  // result a player is least likely to want.
  let features = null;
  let table = null;
  let tables = null;
  let subclasses = null;
  let spellList = null;
  let sections = null;
  let image = null;
  let lore = '';
  let granted = null;
  let spells = null;
  // Built before the per-kind work below, which may add to it: a species lifts
  // its Age paragraph up here rather than leaving it among the traits.
  const meta = metaFor(kind, full);

  if (kind === 'class') {
    features = classFeatures(full, data);
    table = classTable(full, features);
    // Each subclass carries the KEY that opens it, not just a name. Built from
    // a name alone the client sent "Abjurer||Wizard", which matched no key and
    // then fell through the name fallback as well — it compares the whole
    // string against a name — so every subclass button opened nothing.
    const subDef = KINDS.subclass;
    const seenSub = new Set();
    subclasses = [];
    for (const c of (Array.isArray(data.subclass) ? data.subclass : [])) {
      if (c.className !== full.name) continue;
      const name = stripTags(c.name || '');
      if (!name || seenSub.has(name.toLowerCase())) continue;
      seenSub.add(name.toLowerCase());
      subclasses.push({ name, source: String(c.source || ''), key: keyFor(subDef, c) });
    }
    // Subclasses written locally sit in their own file, not beside the class
    // in the mirror's — so a Fighter's page would list every archetype except
    // the one this table actually added. Scanned here, by class name, so a
    // local subclass button appears alongside the printed ones.
    for (const path of await localFiles()) {
      let localData;
      try { localData = await file(path); } catch { continue; }
      for (const c of (Array.isArray(localData.subclass) ? localData.subclass : [])) {
        if (String(c.className || '') !== full.name) continue;
        const name = stripTags(c.name || '');
        if (!name || seenSub.has(name.toLowerCase())) continue;
        seenSub.add(name.toLowerCase());
        subclasses.push({ name, source: String(c.source || ''), key: keyFor(subDef, c) });
      }
    }
    subclasses.sort((a, b) => a.name.localeCompare(b.name));
    // Only offer the spell list to a class that casts. A Fighter's button
    // would open an empty screen and read as a fault.
    if (full.spellcastingAbility || full.casterProgression) spellList = full.name;
    const fluff = await classFluff(full.name, { source: full.source });
    if (fluff?.image) image = fluff.image;
    if (fluff?.lore) lore = fluff.lore;
    // A locally-written class has no fluff file to look in, so it carries its
    // own picture and lore on the row itself.
    if (full._img) image = full._img;
    if (full._lore) lore = full._lore;
    // A class can hand out spells too — an Artificer always has Mending.
    granted = await grantedSpells(full.additionalSpells);
  } else if (kind === 'species') {
    const split = namedSections(full.entries);
    // The 2014 species write Size, Speed and Darkvision as traits as well as
    // fields, and both printings give Age a paragraph of its own. Those are
    // already chips above, so showing them again as foldaway sections buries
    // the traits that matter — Dwarven Resilience, Fey Ancestry — under four
    // rows of things the reader has just read.
    const AS_CHIPS = new Set(['size', 'speed', 'darkvision', 'age', 'languages', 'alignment']);
    sections = split.sections.filter((x) => !AS_CHIPS.has(x.name.toLowerCase()));
    if (split.tables.length) tables = split.tables;
    for (const x of split.sections) {
      const key = x.name.toLowerCase();
      if ((key === 'age' || key === 'languages') && x.text) meta.push({ label: x.name, value: x.text });
    }
    if (split.intro) bodyParts.unshift(split.intro);
    // The prose body is now the intro plus whatever lore the fluff file holds;
    // the traits have moved out of it into sections of their own.
    bodyParts.length = split.intro ? 1 : 0;
    const fluff = await speciesFluff(full.name, full.source);
    if (fluff?.image) image = fluff.image;
    if (fluff?.lore) lore = fluff.lore;
  } else if (kind === 'item') {
    // An item's rules are usually a paragraph or two and then NAMED
    // properties — Power Strike, a curse, what happens when the charges run
    // out. Flattened they read as one wall; split out they are the things you
    // came to look up.
    const split = namedSections(full.entries);
    if (split.sections.length || split.tables.length) {
      sections = split.sections.length ? split.sections : null;
      tables = split.tables.length ? split.tables : null;
      bodyParts.length = 0;
      if (split.intro) bodyParts.push(split.intro);
    }
    spells = await resolveSpellNames(full.attachedSpells);
    image = await itemFluff(full.name, full.source);
  } else if (PROSE_KINDS.has(kind)) {
    // Every remaining kind is prose with named parts and, often, tables —
    // Multiclassing is three sections and two tables, and arrived as one
    // unbroken page of text. Treated the same way a species already was.
    const split = namedSections(full.entries);
    if (split.sections.length || split.tables.length) {
      sections = split.sections.length ? split.sections : null;
      tables = split.tables.length ? split.tables : null;
      bodyParts.length = 0;
      if (split.intro) bodyParts.push(split.intro);
    }
  } else if (kind === 'subclass') {
    // The same shape a class's features take, so the same collapsible list
    // renders both. They were being pushed into the prose body as "Level 3 —
    // Name" followed by their text, which is a subclass's entire content run
    // together into one unbroken block.
    features = (Array.isArray(data.subclassFeature) ? data.subclassFeature : [])
      .filter((f) => f.subclassShortName === full.shortName
        && f.className === full.className
        && f.subclassSource === full.source)
      .sort((a, b) => (a.level || 0) - (b.level || 0))
      .map((f) => {
        const split = splitTables(f.entries);
        return {
          level: Number(f.level) || 1,
          name: stripTags(f.name || ''),
          text: split.text,
          tables: split.tables,
        };
      });
    const fluff = await classFluff(full.className, {
      subclass: full.name, shortName: full.shortName, source: full.source,
    });
    if (fluff?.image) image = fluff.image;
    if (fluff?.lore) lore = fluff.lore;
    if (full._img) image = full._img;
    if (full._lore) lore = full._lore;
    granted = await grantedSpells(full.additionalSpells);
  }

  return {
    kind,
    label: def.label,
    name: String(full.name),
    source: String(full.source || row.source || ''),
    edition: editionOf(full.source || row.source),
    subtitle: String(def.subtitle(full) || def.label),
    key: row.key,
    meta,
    body: bodyParts.join('\n\n'),
    partial,
    // Class-only, and null for everything else so the client can simply test
    // for them.
    features,
    table,
    subclasses,
    spellList,
    sections,
    tables,
    granted,
    spells,
    lore,
    // A mirror path, not a URL: the route turns it into one through the image
    // proxy, the same way a creature's art is handled.
    imagePath: image,
  };
}

// The spell-shape helpers are exported for import_5etools_spells.js: the
// importer writes the same fields this module renders, and two copies of
// "what is a casting time" would drift the moment one was corrected.
module.exports = {
  KINDS, searchKind, searchAll, getEntry, index, spellsForClass,
  SCHOOLS, timeText, rangeText, durationText, componentsText, spellListIndex,
  resolveSpellNames,
};
