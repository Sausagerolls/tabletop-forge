// Importing the DMG's treasure tables into this app's rollable tables.
//
// The book is already on the compendium server, so the tables are read from
// there rather than retyped: 29 of them, and a transcription error in a d100
// range is the kind of bug nobody notices until the party gets a Holy Avenger
// out of a goblin's pocket.
//
// Two shapes have to be handled:
//
//   * Captioned tables — "Magic Item Table A", "10 gp Gemstones" — which are
//     rollable as they stand.
//   * UNCAPTIONED tables, which is how the book continues a captioned one.
//     Each "Treasure Hoard: Challenge X" is really two tables: a fixed row of
//     coins, then an untitled d100 of gems, art and magic items. The untitled
//     half is the rollable one, and on its own it has no name at all — so it
//     inherits the caption above it.
//
// Anything whose first column is not a die is skipped: a single fixed row is a
// reference, not something to roll on.

const db = require('./db');
const { getJson, stripTags } = require('./compendium');

// "01-30" -> 30 chances; "1" -> 1; "91-00" -> the last ten.
//
// `00` means 100 on a d100 in the book's notation, which is the one case where
// taking the digits at face value silently loses a row's worth of probability.
function parseRange(cell) {
  const s = stripTags(String(cell == null ? '' : cell)).replace(/[–—]/g, '-').trim();
  const span = s.match(/^(\d+)\s*-\s*(\d+)$/);
  if (span) {
    let a = Number(span[1]);
    let b = Number(span[2]);
    if (a === 0) a = 100;
    if (b === 0) b = 100;
    if (b < a) { const t = a; a = b; b = t; }
    return { min: a, max: b, weight: (b - a) + 1 };
  }
  const one = s.match(/^(\d+)$/);
  if (one) {
    let v = Number(one[1]);
    if (v === 0) v = 100;
    return { min: v, max: v, weight: 1 };
  }
  return null;
}

// One row's text. Multi-column tables (the coin tables) name each column, so
// "5d6 (17)" under CP reads as "5d6 (17) CP"; a single-column table needs no
// label at all.
function rowText(row, colLabels) {
  const labels = (colLabels || []).slice(1);
  const cells = (row || []).slice(1).map((c) => {
    if (c && typeof c === 'object') {
      // A cell can be an object carrying its own roll or entries.
      if (Array.isArray(c.entries)) return stripTags(c.entries.join(' ')).trim();
      if (c.entry) return stripTags(String(c.entry)).trim();
      if (c.roll) return String(c.roll.exact ?? `${c.roll.min}-${c.roll.max}`);
      return '';
    }
    return stripTags(String(c == null ? '' : c)).trim();
  });
  const parts = cells.map((v, i) => {
    if (!v || v === '-' || v === '—' || v === '–') return null;
    const label = labels[i];
    return (labels.filter(Boolean).length > 1 && label) ? `${v} ${label}` : v;
  }).filter(Boolean);
  return parts.join(' · ');
}

// What counts as a treasure table, across both editions of the book.
//
// The 2024 DMG reorganised magic items entirely: instead of "Magic Item Table
// A-I" there are twenty tables of Category - Rarity (Arcana, Armaments,
// Implements, Relics x Common..Legendary). Matching only the older naming found
// the gems and art objects and silently skipped every magic item table in the
// newer book.
const IS_TREASURE = new RegExp([
  'treasure', 'hoard',
  'magic item table',                                   // 2014
  '(arcana|armaments|implements|relics)\\s*[-–—]\\s*(common|uncommon|rare|very rare|legendary)', // 2024
  'gemstone', 'gp gemstones', 'art object',
].join('|'), 'i');

/**
 * Every rollable treasure table in a book, in document order, named.
 */
function extractTreasureTables(book) {
  const found = [];
  let lastCaption = '';

  const walk = (node) => {
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (!node || typeof node !== 'object') return;
    if (node.type === 'table') {
      if (node.caption) lastCaption = node.caption;
      const cols = node.colLabels || [];
      // "d100" in the 2014 book, "1d100" in the 2024 one — and the leading
      // count is exactly why the 2024 DMG yielded nothing at all on the first
      // attempt.
      const isRollable = /^\d*d\d+$/i.test(String(cols[0] || '').trim());
      const name = node.caption
        || (lastCaption ? `${lastCaption} — ${cols.slice(1).filter(Boolean).join(' & ')}` : '');
      if (isRollable && name && IS_TREASURE.test(name)) {
        const rows = [];
        for (const r of (node.rows || [])) {
          if (!Array.isArray(r)) continue;
          const range = parseRange(r[0]);
          if (!range) continue;
          // A row whose value columns are all dashes is the book saying
          // "nothing", and it must keep its slice of the die. Dropping it was
          // costing hoard 0—4 six points of its d100 — every roll nudged
          // toward treasure, which is exactly the sort of error that only
          // shows up as the party being suspiciously rich.
          const text = rowText(r, cols) || 'Nothing';
          rows.push({ text, weight: range.weight, min: range.min, max: range.max });
        }
        if (rows.length > 1) {
          // Recorded as the bare die ("d100") whichever way the book wrote it,
          // so the coverage check and the description read the same for both.
          const die = String(cols[0]).trim().replace(/^1(?=d)/i, '');
          found.push({ name: name.replace(/\s+/g, ' ').trim(), die, rows });
        }
      }
    }
    Object.values(node).forEach(walk);
  };
  walk(book);

  // The same table can appear twice in a book (reprinted in an appendix).
  const seen = new Set();
  return found.filter((t) => (seen.has(t.name) ? false : (seen.add(t.name), true)));
}

/**
 * Import them, skipping any name that already exists.
 * Returns { created: [...], skipped: [...] }.
 */
// The 2024 Dungeon Master's Guide by default. The 2014 book is still
// importable by passing its path, but it is no longer what a GM gets by
// pressing the button.
const DEFAULT_SOURCE = '/data/book/book-xdmg.json';

async function importTreasureTables({ source = DEFAULT_SOURCE } = {}) {
  const book = await getJson(source);
  const tables = extractTreasureTables(book);
  const created = [];
  const skipped = [];

  for (const t of tables) {
    const existing = await db.query('SELECT id FROM rollable_tables WHERE name=$1', [t.name]);
    if (existing.rows.length) { skipped.push(t.name); continue; }
    const row = (await db.query(
      `INSERT INTO rollable_tables (name, description, kind) VALUES ($1,$2,'loot') RETURNING id`,
      [t.name, `Imported from the ${/xdmg/i.test(source) ? '2024' : '2014'} Dungeon Master's Guide (${t.die}).`]
    )).rows[0];
    let i = 0;
    for (const r of t.rows) {
      await db.query(
        'INSERT INTO rollable_table_rows (table_id, text, weight, sort_order) VALUES ($1,$2,$3,$4)',
        [row.id, r.text, r.weight, i++]
      );
    }
    created.push({ id: row.id, name: t.name, rows: t.rows.length });
  }
  return { created, skipped };
}

module.exports = { importTreasureTables, extractTreasureTables, parseRange, rowText };
