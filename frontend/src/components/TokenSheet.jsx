import React, { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  compendiumImgUrl, compendiumStatus, searchCompendium, previewCompendiumCreature,
} from '../utils/compendiumImport.js';

// Printable token sheets.
//
// Build a list of creatures, then print them as circles at the size they
// actually occupy on a battle map: one inch per grid square. A medium goblin is
// a 1" disc, an ogre 2", a young dragon 3".
//
// THE WHOLE THING RESTS ON PHYSICAL UNITS
//
// Every measurement below is in inches, and nothing is ever converted to
// pixels. CSS `in` is a real inch on paper, so `width: 2in` prints two inches
// wide — but only if the browser's print dialogue is at 100% and not
// "Fit to page", which silently rescales everything. That is the one failure
// this tool cannot detect from inside the page, so it prints a ruler on the
// first sheet: measure it, and you know whether the tokens are right before
// you cut fifty of them out.
//
// FRAMING IS NOT DESTRUCTIVE
//
// ImageFramer (used when a creature's art is uploaded) bakes the crop into the
// saved file. That is right for a token that lives on the map, and wrong here:
// a print crop is about this sheet, not about the creature, and re-cropping an
// already-cropped file loses pixels every pass. So the pan and zoom live on the
// sheet entry as numbers, applied with a CSS transform, and the original art is
// never touched. They are stored as PERCENTAGES of the disc, so the same
// framing holds whether the token prints at one inch or four.

const PAPERS = {
  a4:     { label: 'A4',              w: 8.27, h: 11.69, css: 'A4' },
  letter: { label: 'US Letter',       w: 8.5,  h: 11,    css: 'Letter' },
  legal:  { label: 'US Legal',        w: 8.5,  h: 14,    css: 'Legal' },
  a3:     { label: 'A3',              w: 11.69, h: 16.54, css: 'A3' },
};

// How much extra art to print outside the cut line, so a slightly wonky cut
// still lands on the picture rather than on white paper.
const BLEEDS = [
  { id: 'none',  label: 'None',        in: 0 },
  { id: 'thin',  label: '1⁄16 inch',   in: 1 / 16 },
  { id: 'wide',  label: '1⁄8 inch',    in: 1 / 8 },
];

// ── TOKEN SHAPE ─────────────────────────────────────────────────────────────
//
// A disc is what goes on a battle map, but it is not what everyone wants off a
// printer. Art drawn as a square card — most paper-mini and VTT token packs,
// and anything with a border or a nameplate built into the picture — loses its
// corners to a round token, and `object-fit: cover` then crops the long side
// as well, so what prints is a window onto the middle of the picture rather
// than the picture.
//
// 'square' prints the whole image, uncropped, in a square the same size across
// as the disc would have been: a medium creature is still one inch, so the
// footprint on the table is unchanged. The art is FITTED rather than filled
// (`contain`), which is the whole point — nothing is clipped — and whatever
// space that leaves at the sides takes the token's background colour.
const SHAPES = {
  circle: { label: 'Circle · art fills it',       radius: '50%', fit: 'cover'   },
  square: { label: 'Square · whole image, uncropped', radius: '0',  fit: 'contain' },
};

// The sheet's own shape, used where there is no single token in hand — the
// settings select, the builder's thumbnails fall back to it per row.
export function shapeOf(sheet) {
  return SHAPES[sheet?.shape] ? sheet.shape : 'circle';
}

// One token's shape: its own choice if it has made one, the sheet's otherwise.
//
// Same contract as ringFor and bgFor — null/undefined on the entry means "do
// what the sheet does", so changing the sheet still moves every row that has
// not been set by hand. A sheet of monsters is round; the one piece of art
// that came as a square card is square, without splitting it onto its own
// sheet.
export function shapeFor(entry, sheet) {
  return SHAPES[entry?.shape] ? entry.shape : shapeOf(sheet);
}

// A grid square is one inch on the sheet, so a creature's diameter is simply
// its footprint. Derived rather than looked up: a tarrasque resized to 5
// squares gets a 5" token without anyone adding a row to a table.
export function autoDiameter(size, sizeSquares) {
  return Math.min(MAX_AUTO_DIAMETER, squaresForSize(size, sizeSquares));
}

export function squaresForSize(size, sizeSquares) {
  const explicit = Number(sizeSquares);
  if (Number.isFinite(explicit) && explicit > 0) return explicit;
  switch (String(size || 'medium').toLowerCase()) {
    case 'large':      return 2;
    case 'huge':       return 3;
    case 'gargantuan': return 4;
    default:           return 1;   // tiny, small and medium all share a square
  }
}

/**
 * A usable URL for a piece of artwork.
 *
 * Creature and token rows store a path RELATIVE to the uploads directory
 * ("creatures/abc.webp"), which is not a URL and loads nothing on its own. The
 * compendium proxy and an uploaded file's blob URL are already absolute, so
 * they pass through untouched. Normalised once here, at the point an entry is
 * made, so nothing downstream — the row thumbnail, the framing circle, the
 * printed disc — has to know which kind of source it came from.
 */
export function artUrl(path) {
  if (!path) return '';
  return /^(https?:|blob:|data:|\/)/.test(path) ? path : `/uploads/${path}`;
}

/**
 * The discs in the order they go on the paper.
 *
 * Largest first when packing is on. Circles laid out in the order they were
 * added leave a hole every time a big one follows a small one — four one-inch
 * goblins will not fit in the gap beside a four-inch dragon once the row has
 * already wrapped. Sorting by size means the big discs claim their rows and
 * the small ones fill in behind them, which on a mixed sheet is routinely the
 * difference between two pages and three.
 */
export function layOut(entries, pack, numbering = false) {
  const discs = [];
  // Numbers run per NAME, not per row: three goblins added now and two more
  // added later are still goblins 1 to 5. Grouping by row would start the
  // second batch at one again and put two goblin 1s on the table, which is
  // exactly what the numbers exist to prevent.
  const counts = new Map();
  const nameKey = (e) => String(e.name || '').trim().toLowerCase();

  // How many of each name the whole sheet holds, counted before anything is
  // numbered. A number is only worth printing when there is another token it
  // has to be told apart FROM: the party's one ogre is "the ogre", and a 1 on
  // it is a mark to cut round for nothing. Counted across the whole sheet, so
  // three goblins on one row and two more added later are five goblins, not
  // two separate ones-and-twos.
  //
  // A row marked `noNumber` is left out of the count as well as out of the
  // numbering. The party's four identical guard tokens numbered 1 to 4 beside
  // an unnumbered captain is right; counting the captain would make it one of
  // five and start the guards at two. It also means a name whose only other
  // copies are excluded gets no number at all, which is the same rule as
  // before — there is nothing left to tell it apart from.
  const totals = new Map();
  for (const e of entries) {
    if (e.noNumber) continue;
    const k = nameKey(e);
    totals.set(k, (totals.get(k) || 0) + Math.max(1, Number(e.qty) || 1));
  }

  for (const e of entries) {
    for (let i = 0; i < Math.max(1, Number(e.qty) || 1); i++) {
      let n = null;
      const k = nameKey(e);
      if (numbering && !e.noNumber && (totals.get(k) || 0) > 1) {
        n = (counts.get(k) || 0) + 1;
        counts.set(k, n);
      }
      discs.push({ entry: e, n });
    }
  }
  // Sorting for packing happens AFTER numbering, so the numbers a token carries
  // do not change when the layout is rearranged.
  return pack ? [...discs].sort((a, b) => b.entry.diameter - a.entry.diameter) : discs;
}


/**
 * Discs dealt out into pages, rows first.
 *
 * WHY THIS IS NOT LEFT TO THE BROWSER
 *
 * The sheet used to be one long flex container and a single sheet of paper,
 * and the printer was trusted to break it. It does not break it well: a flex
 * line is not a block, so `break-inside: avoid` on a token is advice the
 * engine is free to ignore, and the last row on every page came out sliced
 * through the middle or squeezed to fit. Tokens are physical objects — a
 * goblin cut off at the chin is a wasted sheet of card.
 *
 * So the packing is done here, in inches, where it can be reasoned about: fill
 * a row until the next disc would cross the right margin, stack rows until the
 * next row would cross the bottom, then start a new page. Each page is printed
 * as its own box with a forced break after it, so what the browser gets is
 * already paginated and it has nothing left to decide.
 *
 * Every measurement is a real inch: `boxOf` is the disc plus its bleed, which
 * is the space it actually occupies.
 *
 * @returns {Array<Array<{height:number, discs:Array}>>} pages → rows → discs
 */
export function paginate(discs, {
  pageW, pageH, margin, gap = 0, bleedIn = 0, firstPageReserve = 0,
}) {
  const availW = Math.max(0, pageW - margin * 2);
  const availH = Math.max(0, pageH - margin * 2);
  const boxOf = (d) => (Number(d.entry.diameter) || 1) + bleedIn * 2;
  const EPS = 1e-9;

  const pages = [];
  let page = [];
  let used = firstPageReserve;   // inches of page height already committed
  let row = [];
  let rowW = 0;
  let rowH = 0;

  // Commit the row being built onto the current page.
  const flushRow = () => {
    if (!row.length) return;
    used += (used > 0 ? gap : 0) + rowH;
    page.push({ height: rowH, discs: row });
    row = []; rowW = 0; rowH = 0;
  };
  // Start a fresh sheet of paper. Only the first one carries the ruler, so the
  // reserve does not come back.
  const newPage = () => {
    if (page.length) pages.push(page);
    page = [];
    used = 0;
  };

  for (const d of discs) {
    const box = boxOf(d);
    // Room on this row?
    if (row.length && rowW + gap + box > availW + EPS) flushRow();

    // Room on this page for the row this disc would join? A row is as tall as
    // its tallest disc, so a big disc joining a row of small ones can push the
    // page over on its own.
    const rowIfKept = Math.max(rowH, box);
    if (used + (used > 0 ? gap : 0) + rowIfKept > availH + EPS && (row.length || page.length)) {
      flushRow();       // what is already in the row fitted, so keep it here
      newPage();
    }

    row.push(d);
    rowW += (row.length > 1 ? gap : 0) + box;
    rowH = Math.max(rowH, box);
  }
  flushRow();
  newPage();
  return pages;
}

// The biggest disc the sheet will reach for on its own. A creature's footprint
// is trusted up to here and no further: size_squares is free-form, a token
// stretched to cover a courtyard is a legitimate thing to have on a map, and
// one typo should not put a 40-inch circle on the page and blow the layout
// apart. Past this the GM has to ask for it, from the dropdown on the row.
const MAX_AUTO_DIAMETER = 6;

// What a GM may ask for by hand, which is a wider range than the sheet will
// reach for on its own. The floor is the smallest disc worth cutting out; the
// ceiling is bigger than any paper this prints on, and the row warns when a
// token will not fit rather than refusing the number — someone printing a
// kraken across four sheets of A3 is doing it on purpose.
export const DIAMETER_MIN = 0.25;
export const DIAMETER_MAX = 12;

// The sizes on the dropdown: a square of the grid and the usual multiples.
export const DIAMETER_PRESETS = [0.75, 1, 1.5, 2, 3, 4, 5, 6];

export function clampDiameter(value, fallback = 1) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(DIAMETER_MAX, Math.max(DIAMETER_MIN, Math.round(n * 100) / 100));
}

const BLANK_FRAME = { zoom: 1, x: 0, y: 0 };

// The sheet sets a default; a row can disagree.
//
// Both of these exist for art the sheet cannot fix by framing. Plenty of token
// pictures are a bare figure on a transparent background with no disc around
// them — printed as-is they come out as a shape floating on white with no edge
// to cut round. A ring gives the scissors a line; a fill gives the figure
// something to stand on. Which pictures need it varies inside one sheet, so
// the per-row value wins wherever it is set and `null` means "whatever the
// sheet says".
// Ring thickness bounds, in points. Below half a point a printer has nothing to
// draw; past a quarter of an inch the ring is the token.
export const RING_WIDTH_MIN = 0.5;
export const RING_WIDTH_MAX = 18;

export function clampRingWidth(value, fallback = 2) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(RING_WIDTH_MAX, Math.max(RING_WIDTH_MIN, n));
}

// Mix a colour towards white or black. `amount` is 0..1; positive lightens.
export function shade(hex, amount) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || ''));
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const parts = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const target = amount >= 0 ? 255 : 0;
    const mixed = Math.round(v + (target - v) * Math.abs(amount));
    return Math.max(0, Math.min(255, mixed));
  });
  return `#${parts.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

export function ringFor(entry, sheet) {
  const on = entry?.ring == null ? !!sheet?.ring : !!entry.ring;
  if (!on) return null;
  return {
    color: entry?.ringColor || sheet?.ringColor || '#111111',
    width: clampRingWidth(entry?.ringWidth ?? sheet?.ringWidth, 2),   // points
    // A lit edge, as if a lamp sat above and to the left of the table.
    highlight: entry?.ringHighlight ?? !!sheet?.ringHighlight,
  };
}

export function bgFor(entry, sheet) {
  // 'none' means let the paper show through, which is what a picture that
  // already has its own disc wants.
  const sheetValue = sheet?.fillBg === false ? 'none' : (sheet?.bgColor || '#ffffff');
  const value = entry?.bg ?? sheetValue;
  return value === 'none' ? 'transparent' : value;
}

/**
 * A new entry id.
 *
 * This used to be a module-level counter starting at 1. The sheet is saved to
 * localStorage and restored on load — with its ids — while the counter began
 * again at one, so the first token added after a refresh was handed an id a
 * restored row already had. Two rows with the same id is three separate bugs
 * at once: React reuses the wrong row (framing a new token opened an older
 * token's picture), `find` returns whichever came first, and removing by id
 * takes both or neither. Ids have to be unique for the life of the list, not
 * for the life of the page.
 */
function newId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `e${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

// The biggest disc the sheet will reach for on its own. A creature's footprint
// is trusted up to here and no further: size_squares is free-form, a token
// stretched to cover a courtyard is a legitimate thing to have on a map, and
// one typo should not put a 40-inch circle on the page and blow the layout
// apart. Past this the GM has to ask for it, from the dropdown on the row.
function entryFrom({ name, src, size, sizeSquares, source }) {
  const squares = autoDiameter(size, sizeSquares);
  return {
    id: newId(),
    name: name || 'Token',
    src: artUrl(src),
    source,
    diameter: squares,            // inches
    autoDiameter: squares,        // what the creature's size implies, for "reset"
    // Whether this row is being sized by hand. A footprint that is not one of
    // the presets — a 2.5-square swarm — opens in the box of its own accord,
    // because a dropdown cannot show a number it does not have.
    customSize: !DIAMETER_PRESETS.includes(squares),
    qty: 1,
    frame: { ...BLANK_FRAME },
  };
}

// A name curved round the inside of the token's edge, on a solid band.
//
// Printed straight across the middle of the disc, a name sits on top of the
// art at whatever contrast the art happens to offer — which on a dark goblin
// is none. Bent round the bottom rim it follows the shape the eye already
// reads, and the band underneath it is a solid colour, so legibility stops
// depending on the picture.
//
// Drawn in a 0-100 viewBox so one component serves a one-inch goblin and a
// six-inch dragon: every number below is a percentage of the token.
const NAME_BAND_WIDTH = 13;      // band thickness, % of the token
const NAME_BAND_INSET = 1;       // gap between band and the cut edge
const NAME_ARC_MAX_DEG = 80;     // the longest the band may ever run, each side
const NAME_BAND_PAD = 2.5;       // breathing room past the last letter
const NAME_MIN_FONT = 7;         // about five point on a one-inch token
const NAME_BADGE_SCALE = 1.25;   // number disc, as a multiple of the band's width
const NAME_BADGE_GAP = 3.2;      // clear air between the name and the disc
const NAME_BADGE_STROKE = 0.8;   // the disc's rim, drawn half outside its radius

// Black text or white, whichever the band can carry.
function readableOn(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || ''));
  if (!m) return '#fff';
  const n = parseInt(m[1], 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) > 0.45 ? '#111' : '#fff';
}

function CurvedName({ name, color = '#111111', id, number = null, insetPct = 0 }) {
  const textRef = useRef(null);
  const text = String(name || '').trim();

  // The circle the band and the text both run along.
  const radius = 50 - NAME_BAND_INSET - insetPct - NAME_BAND_WIDTH / 2;
  const maxHalf = (NAME_ARC_MAX_DEG * Math.PI) / 180;
  const maxArc = 2 * maxHalf * radius;

  // The disc rides on the same arc, so it is not the name's to use. Sizing the
  // name against the whole arc is what pushed a long one past the start of the
  // path, where textPath simply drops the glyphs that fall off the end — the
  // name came out with its first letters missing.
  const hasNumber = number != null;
  const badgeSize = hasNumber ? NAME_BAND_WIDTH * NAME_BADGE_SCALE : 0;
  const badgeGap = hasNumber ? NAME_BADGE_GAP + NAME_BADGE_STROKE / 2 : 0;
  const textRoom = maxArc - (badgeSize + badgeGap) - 1;

  // WHY THIS IS MEASURED RATHER THAN CALCULATED
  //
  // How long a name is on the page depends on the font, the weight, the
  // letter spacing and the letters themselves — "Illini" and "Wammow" are the
  // same six characters and nothing like the same width. Guessing from a
  // character count got both halves of this wrong at once: the band was built
  // for the longest name that could fit rather than for this one, and a long
  // name overran the arc and had its first and last letters dropped by the
  // textPath. So the text is laid out, measured, and then fitted.
  //
  // `fit` shrinks, never grows, so the loop below settles: the type comes down
  // to the floor first, and only a name still too long after that is cut.
  const [fit, setFit] = useState({ size: 11, chars: text.length });
  const [measured, setMeasured] = useState(null);

  const shown = fit.chars < text.length
    ? `${text.slice(0, Math.max(1, fit.chars - 1))}…`
    : text;

  useLayoutEffect(() => {
    const el = textRef.current;
    if (!el || !shown) return;
    let len = 0;
    try { len = el.getComputedTextLength(); } catch { /* not laid out yet */ }
    if (!(len > 0)) return;
    if (measured == null || Math.abs(len - measured) > 0.25) setMeasured(len);

    const room = textRoom;                   // the arc, less what the disc takes
    if (len <= room) return;
    if (fit.size > NAME_MIN_FONT + 0.05) {
      setFit((f) => ({ ...f, size: Math.max(NAME_MIN_FONT, f.size * (room / len)) }));
    } else if (fit.chars > 4) {
      setFit((f) => ({ ...f, chars: Math.max(4, Math.floor(f.chars * (room / len))) }));
    }
  }, [shown, fit.size, fit.chars, measured, textRoom]);

  // Reset when the name changes, or a short name would keep the long one's
  // shrunken type.
  useEffect(() => {
    setFit({ size: 11, chars: text.length });
    setMeasured(null);
  }, [text]);

  // An arc centred on the bottom of the token, `half` radians to each side.
  // Left to right THROUGH the bottom (sweep 0, y pointing down), so the
  // letters stand upright when the token is the right way up.
  const arcPath = (half) => {
    const x1 = 50 - radius * Math.sin(half);
    const y = 50 + radius * Math.cos(half);
    const x2 = 50 + radius * Math.sin(half);
    return `M ${x1.toFixed(2)} ${y.toFixed(2)} A ${radius.toFixed(2)} ${radius.toFixed(2)} 0 0 0 ${x2.toFixed(2)} ${y.toFixed(2)}`;
  };

  // The number rides INSIDE the band rather than as a disc of its own further
  // up the token. A separate disc had to sit clear of the band to avoid the
  // name, which put it squarely over the artwork — the one part of a token
  // worth looking at. In the band it costs no extra ink at all.
  //
  // It is bigger than the band it sits on: kept inside the band's thickness
  // the number came out at about five point on a one-inch token, which is
  // there but not readable across a table. Pulled in so its OUTER edge lines
  // up with the band's, rather than hanging over the cut line where the
  // scissors would take the top off it.
  const badgeRadius = radius - (badgeSize - NAME_BAND_WIDTH) / 2;

  // The band is as long as everything it carries, plus a breath either side,
  // less the round cap that is drawn past each end anyway.
  // Erring long on purpose: an estimate that comes in short puts the disc over
  // the name until the measurement lands, and on a printed page there is no
  // second chance.
  const inkLength = measured != null ? measured : shown.length * fit.size * 0.62;
  const contentLength = inkLength + badgeSize + badgeGap;
  const bandHalf = Math.min(
    maxHalf,
    Math.max(
      NAME_BAND_WIDTH / 2 / radius,
      (contentLength / 2 + NAME_BAND_PAD - NAME_BAND_WIDTH / 2) / radius,
    ),
  );

  // Both sit on the same arc, so their positions are distances along it. The
  // number goes after the name — read the creature first, then which one it is
  // — so the name shifts LEFT by half of what the number takes and the number
  // hangs off the right end. The pair stays centred on the bottom of the token.
  const textShift = -(badgeSize + badgeGap) / 2;
  const badgeAlong = (inkLength + badgeGap) / 2;
  const badgeAngle = badgeAlong / radius;
  const badgeX = 50 + badgeRadius * Math.sin(badgeAngle);
  const badgeY = 50 + badgeRadius * Math.cos(badgeAngle);
  // startOffset is a share of the whole path, and the path is the full arc.
  const fullArcLength = 2 * maxHalf * radius;
  const textOffsetPct = 50 + (textShift / fullArcLength) * 100;

  if (!text) return null;

  return (
    <svg
      className="ts-name"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%',
        pointerEvents: 'none', overflow: 'visible',
        // Without this the band is a background as far as a printer is
        // concerned, and prints as nothing.
        WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact',
      }}
    >
      <defs>
        {/* The text always runs on the full arc, so its centre never moves;
            the band is its own, shorter arc under it. */}
        <path id={id} d={arcPath(maxHalf)} fill="none" />
        <path id={`${id}-band`} d={arcPath(bandHalf)} fill="none" />
        {/* The band is a thick stroke, so its ends stick out past the rim
            where the arc meets the edge. Clipped to the token's own circle,
            they stop at the cut line like everything else. */}
        <clipPath id={`${id}-clip`}>
          <circle cx="50" cy="50" r="50" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id}-clip)`}>
        <use
          href={`#${id}-band`}
          // Safari wants the old spelling as well: an SVG2 href alone is
          // ignored by WebKit versions still in use, and the band simply
          // never appears.
          xlinkHref={`#${id}-band`}
          stroke={color}
          strokeWidth={NAME_BAND_WIDTH}
          strokeLinecap="round"
          fill="none"
        />
      </g>
      {hasNumber && (
        // Reversed out of the band: the same two colours the name already uses,
        // so the number reads as part of the same object.
        <g>
          <circle
            cx={badgeX}
            cy={badgeY}
            r={badgeSize / 2}
            fill={readableOn(color)}
            // A rim in the band's own colour, so the part that overhangs the
            // band still has an edge against whatever art is behind it.
            stroke={color}
            strokeWidth={NAME_BADGE_STROKE}
          />
          <text
            x={badgeX}
            y={badgeY}
            fill={color}
            fontSize={badgeSize * 0.74}
            fontWeight="700"
            fontFamily="ui-sans-serif, system-ui, -apple-system, Helvetica, Arial, sans-serif"
            textAnchor="middle"
            dominantBaseline="central"
          >
            {number}
          </text>
        </g>
      )}
      <text
        ref={textRef}
        fill={readableOn(color)}
        fontSize={fit.size}
        fontWeight="600"
        fontFamily="ui-sans-serif, system-ui, -apple-system, Helvetica, Arial, sans-serif"
        letterSpacing="0.2"
      >
        <textPath
          href={`#${id}`}
          xlinkHref={`#${id}`}
          startOffset={`${textOffsetPct.toFixed(2)}%`}
          textAnchor="middle"
          dominantBaseline="middle"
        >
          {shown}
        </textPath>
      </text>
    </svg>
  );
}

// A nameplate straight across the foot of a SQUARE token.
//
// The curved version exists because a disc has no straight edge to sit a name
// on; a square has one, and bending type round a corner that is not there is
// worse than not bending it at all. Same contract as CurvedName otherwise: a
// solid band so legibility never depends on the artwork, every measurement a
// percentage of the token so one inch and six inches read alike, and the
// number tucked into the band rather than taking a bite out of the picture.
function StraightName({ name, color = '#111111', number = null, insetPct = 0, sizeCss }) {
  const text = String(name || '').trim();
  if (!text && number == null) return null;
  // Inside the ring, as the curved band is.
  const inset = `calc(${insetPct}% + ${NAME_BAND_INSET}%)`;
  return (
    <div
      className="ts-nameplate"
      style={{
        position: 'absolute', left: inset, right: inset, bottom: inset,
        height: `${NAME_BAND_WIDTH}%`,
        background: color,
        color: readableOn(color),
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4em',
        // The same share of the token the curved band's type takes, so the two
        // shapes print at the same apparent size.
        fontSize: `calc(${sizeCss} * 0.082)`,
        fontWeight: 700,
        lineHeight: 1,
        letterSpacing: '0.01em',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        padding: '0 4%',
        boxSizing: 'border-box',
        WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact',
      }}
    >
      {number != null && (
        <span
          className="ts-nameplate-num"
          style={{
            flex: '0 0 auto',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '1.5em', height: '1.5em', borderRadius: '50%',
            background: readableOn(color), color,
            fontVariantNumeric: 'tabular-nums',
            WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact',
          }}
        >{number}</span>
      )}
      {/* Trimmed with an ellipsis rather than shrunk to fit: a name squeezed
          below about five point on a one-inch token is not readable anyway, and
          a row of tokens whose names are all different sizes looks wrong. */}
      <span
        className="ts-nameplate-text"
        style={{ overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'center' }}
      >{text}</span>
    </div>
  );
}

// ── The circular preview, shared by the editor and the printed sheet ────────
//
// One component so what is on paper is what was framed. `object-fit: cover`
// does the base fit; zoom and pan ride on top as a transform, which means the
// numbers are independent of how many pixels the disc happens to be.
function TokenDisc({
  entry, sizeCss, bleedIn = 0, showCut = true, label, number = null,
  ring = null, background = '#fff', shape = 'circle',
}) {
  const { frame } = entry;
  const shapeDef = SHAPES[shape] || SHAPES.circle;
  const radius = shapeDef.radius;
  const isSquare = shape === 'square';
  // The band takes the ring's colour when there is one, so a token reads as a
  // single object rather than two decisions. Ids must be unique document-wide:
  // an SVG textPath is looked up by id, and two tokens sharing one would both
  // draw the first one's name.
  const nameId = `ts-name-${useId().replace(/:/g, '')}`;
  const nameBandColor = ring?.color || '#111827';
  // The ring's thickness, as a percentage of the token, so the name band can
  // start inside it. Points are absolute and the band's geometry is relative,
  // so a 4pt ring is a tenth of a one-inch token and a fortieth of a four-inch
  // one — without this the band sat under the ring on the small ones.
  const ringInsetPct = ring
    ? ((Number(ring.width) || 0) / 72) / Math.max(0.1, Number(entry.diameter) || 1) * 100
    : 0;
  const ringGradientId = `${nameId}-ring`;
  const art = (
    <img
      src={entry.src}
      alt=""
      draggable={false}
      style={{
        width: '100%', height: '100%', objectFit: shapeDef.fit, display: 'block',
        transform: `scale(${frame.zoom}) translate(${frame.x}%, ${frame.y}%)`,
        transformOrigin: 'center',
      }}
    />
  );
  // The bleed is INSIDE the token's own box, and the cut line is inset from its
  // edge by exactly that much.
  //
  // The obvious arrangement is the other way round — a box the size of the
  // token, with the art disc grown outside it — and it prints wrong. A printed
  // page's content area begins at the page margin, and anything painted outside
  // that area is clipped, so the leftmost token on every row lost precisely a
  // bleed's width off its side. It looked fine on screen, where the paper is
  // just an element with padding and nothing clips.
  //
  // Keeping the bleed inside the flow box also means the layout knows how much
  // room a token really needs, so discs cannot overlap their neighbours.
  const grow = bleedIn * 2;
  const outer = grow ? `calc(${sizeCss} + ${grow}in)` : sizeCss;
  return (
    <div
      className="ts-token"
      style={{ width: outer, height: outer, position: 'relative', flex: '0 0 auto' }}
    >
      <div
        style={{
          position: 'absolute', inset: 0,
          borderRadius: radius, overflow: 'hidden', background,
          // A background set here has to survive the printer's "don't waste
          // ink on backgrounds" default, which is what print-color-adjust
          // turns off. Without it a coloured token prints as a white one.
          WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact',
        }}
      >{art}</div>
      {ring && !ring.highlight && (
        // Drawn on the cut line, not the outer box: with bleed on, the line to
        // cut round is inset by the bleed, and a ring painted anywhere else is
        // a ring you cut through.
        //
        // The thickness grows INWARD. `box-sizing: border-box` on a box whose
        // size is fixed by `inset` puts the border inside that box, so a fat
        // ring eats into the art rather than making the token bigger — a token
        // that grew with its ring would no longer be the size its creature is,
        // which is the one promise this whole tool makes.
        <div
          className="ts-ring"
          style={{
            position: 'absolute', inset: `${bleedIn}in`,
            borderRadius: radius,
            border: `${ring.width}pt solid ${ring.color}`,
            boxSizing: 'border-box',
            pointerEvents: 'none',
            WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact',
          }}
        />
      )}
      {ring && ring.highlight && (
        // The lit version of the same ring.
        //
        // A CSS border takes one flat colour, so the gradient is drawn as an
        // SVG stroke instead: a circle whose radius is pulled in by half the
        // stroke, which keeps the ring growing inward exactly as the flat one
        // does. The light sits above and to the left, so the gradient runs
        // from a pale edge at the top left, through the ring's own colour, to
        // a darker one at the bottom right — the shading a real disc with a
        // raised rim would have.
        <div style={{ position: 'absolute', inset: `${bleedIn}in`, pointerEvents: 'none' }}>
          <svg
            className="ts-ring"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            style={{
              width: '100%', height: '100%', display: 'block',
              WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact',
            }}
          >
            <defs>
              <linearGradient id={ringGradientId} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor={shade(ring.color, 0.55)} />
                <stop offset="35%" stopColor={shade(ring.color, 0.12)} />
                <stop offset="65%" stopColor={ring.color} />
                <stop offset="100%" stopColor={shade(ring.color, -0.45)} />
              </linearGradient>
            </defs>
            {isSquare ? (
              // The same inward-growing stroke on a square token: the rect is
              // inset by half the stroke so the ring eats into the art rather
              // than enlarging the token, exactly as the circle does.
              <rect
                x={ringInsetPct / 2}
                y={ringInsetPct / 2}
                width={Math.max(1, 100 - ringInsetPct)}
                height={Math.max(1, 100 - ringInsetPct)}
                fill="none"
                stroke={`url(#${ringGradientId})`}
                strokeWidth={ringInsetPct}
              />
            ) : (
              <circle
                cx="50"
                cy="50"
                r={Math.max(0.5, 50 - ringInsetPct / 2)}
                fill="none"
                stroke={`url(#${ringGradientId})`}
                strokeWidth={ringInsetPct}
              />
            )}
          </svg>
        </div>
      )}
      {showCut && (
        <div
          className="ts-cut"
          style={{
            position: 'absolute', inset: `${bleedIn}in`, borderRadius: radius,
            border: '0.4pt solid rgba(255,255,255,0.85)',
            boxShadow: '0 0 0 0.4pt rgba(0,0,0,0.65)',
            pointerEvents: 'none',
          }}
        />
      )}
      {label && (
        // Inside the cut line, like the ring: the band belongs to the token,
        // not to the bleed that gets trimmed away.
        <div style={{ position: 'absolute', inset: `${bleedIn}in`, pointerEvents: 'none' }}>
          {isSquare ? (
            // A curve bent round a circle that is not there reads as a mistake,
            // so a square token gets a straight nameplate along its foot. Sized
            // off the token rather than in points, so it is the same share of a
            // one-inch token as of a four-inch one.
            <StraightName
              name={label}
              color={nameBandColor}
              number={number}
              insetPct={ringInsetPct}
              sizeCss={sizeCss}
            />
          ) : (
            <CurvedName
              name={label}
              color={nameBandColor}
              id={nameId}
              number={number}
              insetPct={ringInsetPct}
            />
          )}
        </div>
      )}
      {number != null && !label && (
        // A white disc low in the token, well inside the edge. At 22% of the
        // token across and sitting 8% up from the bottom, its widest point is
        // nowhere near the circle's edge at that height, so it survives a cut
        // that wanders — and it stays legible on a one-inch token, which is
        // the size that has to work.
        //
        // Only when there is NO name on the token. With a name the number goes
        // inside the band instead, where it costs the artwork nothing.
        <span
          className="ts-badge"
          style={{
            position: 'absolute', left: '39%', width: '22%', height: '22%',
            bottom: `calc(${bleedIn}in + 8%)`,
            borderRadius: '50%', background: '#fff',
            border: '0.3pt solid rgba(0,0,0,0.55)',
            boxSizing: 'border-box',
            textAlign: 'center',
            lineHeight: `calc(${sizeCss} * 0.22)`,
            fontSize: `calc(${sizeCss} * 0.125)`,
            color: '#111', fontWeight: 700,
            fontVariantNumeric: 'tabular-nums',
            pointerEvents: 'none',
          }}
        >{number}</span>
      )}
    </div>
  );
}

// ── Framing a single token ──────────────────────────────────────────────────
function FrameEditor({ entry, shape = 'circle', onChange, onDone }) {
  const isSquare = shape === 'square';
  const boxRef = useRef(null);
  const drag = useRef(null);
  const { frame } = entry;

  const move = useCallback((dxPct, dyPct) => {
    onChange({ ...frame, x: frame.x + dxPct, y: frame.y + dyPct });
  }, [frame, onChange]);

  const onPointerDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerMove = (e) => {
    if (!drag.current) return;
    const box = boxRef.current?.getBoundingClientRect();
    if (!box) return;
    // Pixels to percent of the disc, then undone by the zoom — so dragging
    // tracks the pointer exactly however far in the picture is scaled.
    const dx = ((e.clientX - drag.current.x) / box.width) * 100 / frame.zoom;
    const dy = ((e.clientY - drag.current.y) / box.height) * 100 / frame.zoom;
    drag.current = { x: e.clientX, y: e.clientY };
    move(dx, dy);
  };
  const onPointerUp = (e) => {
    drag.current = null;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  };

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-gray-400 leading-snug">
        {isSquare
          ? `Drag to move, slider to zoom. Square tokens print the whole picture, so at
             1× nothing is cut off and any space left over takes the background colour.
             Zooming past 1× starts cropping again — that is the trade.`
          : `Drag to move, slider to zoom. A lot of token art sits in a frame with space
             around the disc — zoom until the creature fills the circle, or the printed
             token comes out smaller than its size says, since what you cut round is the
             picture rather than the circle it was placed in.`}
      </p>
      <div className="flex justify-center">
        <div
          ref={boxRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className={`relative overflow-hidden border-2 border-dnd-gold cursor-move touch-none bg-gray-950 ${
            isSquare ? 'rounded-md' : 'rounded-full'}`}
          style={{ width: 220, height: 220 }}
        >
          <img
            src={entry.src}
            alt=""
            draggable={false}
            style={{
              width: '100%', height: '100%',
              objectFit: isSquare ? 'contain' : 'cover', display: 'block',
              transform: `scale(${frame.zoom}) translate(${frame.x}%, ${frame.y}%)`,
              transformOrigin: 'center',
            }}
          />
          {/* A centre cross-hair: the eye is bad at judging whether a figure is
              actually centred in a circle, and a token that is off by a little
              looks wrong on the table in a way nobody can name. */}
          <div className="absolute inset-0 pointer-events-none opacity-40">
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-dnd-gold/70" />
            <div className="absolute top-1/2 left-0 right-0 h-px bg-dnd-gold/70" />
          </div>
        </div>
      </div>
      <label className="block space-y-1">
        <span className="text-[11px] text-gray-400">Zoom · {frame.zoom.toFixed(2)}×</span>
        <input
          type="range" min="0.5" max="4" step="0.01" value={frame.zoom}
          onChange={(e) => onChange({ ...frame, zoom: Number(e.target.value) })}
          className="w-full"
        />
      </label>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onChange({ ...BLANK_FRAME })}
          className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-200 text-sm hover:bg-gray-700"
        >Reset framing</button>
        <button
          type="button"
          onClick={onDone}
          className="flex-1 py-2 rounded-lg bg-dnd-gold text-gray-900 font-semibold text-sm hover:brightness-110"
        >Done</button>
      </div>
    </div>
  );
}

// The room the ruler takes out of the first page. The paginator subtracts it
// and the ruler is drawn at exactly this height, so the two cannot disagree.
const RULER_IN = 0.6;

// A strip left unused at the foot of every page.
//
// The packing works in the paper's nominal size; the printer works in what it
// can actually reach, which is always a little less and varies by model, by
// driver and by what the print dialogue's own margin setting does to the CSS
// one. A quarter inch of slack absorbs that difference, so the last row of a
// page stays on the page it was packed onto instead of being pushed to the
// next sheet.
const PAGE_SAFETY_IN = 0.25;

// What a printer will actually give us, per edge.
//
// Nobody agrees on this. Chrome's dialogue defaults to about 0.4in and honours
// a CSS @page margin; Safari applies its own and largely ignores @page; every
// printer keeps an unprintable strip of its own on top. So the packing assumes
// the WORST of them — half an inch all round — and the white border on the
// paper is the printer's own margin rather than padding this code adds. A page
// whose content fits inside that is a page every browser can print whole,
// which is the only property worth having here.
const ASSUMED_PRINTER_MARGIN_IN = 0.5;

// The area the packing is allowed to fill, in inches.
export function printableArea(paper, sheetMargin) {
  const edge = Math.max(Number(sheetMargin) || 0, ASSUMED_PRINTER_MARGIN_IN);
  return { w: paper.w - edge * 2, h: paper.h - edge * 2 - PAGE_SAFETY_IN };
}

// ── The printed sheet ───────────────────────────────────────────────────────
//
// Rendered through a portal so it is a direct child of <body>. The print rules
// below hide every other top-level element, which only works if this is one of
// them — inside the DM panel it would be buried under a dozen ancestors, each
// able to clip it or drag its own background onto the page.
function PrintSheet({ entries, sheet, onClose }) {
  const paper = PAPERS[sheet.paper] || PAPERS.a4;
  const bleed = (BLEEDS.find((b) => b.id === sheet.bleed) || BLEEDS[0]).in;

  const laid = layOut(entries, sheet.pack, sheet.numbering);
  const area = printableArea(paper, sheet.margin);
  const pages = paginate(laid, {
    // The area is already the printable one, so the packer takes no further
    // margin off it.
    pageW: area.w,
    pageH: area.h,
    margin: 0,
    gap: sheet.gap,
    bleedIn: bleed,
    firstPageReserve: sheet.ruler ? RULER_IN : 0,
  });
  const discCount = laid.length;

  return createPortal(
    <div className="ts-print-root">
      <style>{`
        /* The page box is left to the browser.
           Trying to pin it down is what broke this three times over: a CSS
           @page margin is overridden by Chrome's dialogue and largely ignored
           by Safari, and a box sized in inches or in vh assumes a printable
           area that neither browser promises. The packing now assumes the
           worst printable area any of them offer (see printableArea), so the
           content fits whatever the browser decides to give it, and the white
           border round the tokens is the printer's own margin. */
        @page { size: ${paper.css}; }
        .ts-print-root {
          position: fixed; inset: 0; z-index: 200; overflow: auto;
          background: #4b5563; padding: 24px 0 64px;
        }
        /* One element per sheet of paper, at the paper's exact size. The
           pages were worked out in inches before rendering, so nothing here
           may wrap, stretch or shrink — every box is the size it says. */
        .ts-paper {
          width: ${paper.w}in; height: ${paper.h}in;
          margin: 0 auto 24px; background: #fff; color: #000;
          /* The preview insets its tokens by the same edge the packing assumes
             the printer will keep, so what is on screen is where they land. */
          padding: ${Math.max(sheet.margin, ASSUMED_PRINTER_MARGIN_IN)}in;
          box-shadow: 0 10px 40px rgba(0,0,0,.5);
          box-sizing: border-box;
          overflow: hidden;
        }
        .ts-row {
          display: flex; align-items: flex-start;
          gap: ${sheet.gap}in;
        }
        .ts-token { break-inside: avoid; page-break-inside: avoid; }
        .ts-bar {
          position: fixed; top: 0; left: 0; right: 0; z-index: 210;
          display: flex; gap: 8px; align-items: center;
          padding: 8px 12px; background: #111827; border-bottom: 1px solid #374151;
        }
        @media print {
          /* Everything that is not this sheet leaves the page entirely.
             display:none rather than visibility:hidden -- a hidden element
             still occupies its box, which is how you get a stack of blank
             pages before the tokens. */
          body > *:not(.ts-print-root) { display: none !important; }

          /* index.css already runs a print system of its own, built around
             .print-backdrop for stat blocks. Its hide-everything rule
             (body *:not(:has(.print-backdrop))...) carries !important and
             enough classes to outrank a plain .ts-print-root, so without this
             the sheet is hidden along with the app and the printer is handed
             blank paper. The class is repeated to outweigh it rather than
             borrowing .print-backdrop, whose companion rules force
             height:auto on every descendant — which would flatten every
             circle on the page.

             If this ever stops working, the test that catches it asserts the
             sheet is still displayed under print media. */
          .ts-print-root.ts-print-root.ts-print-root.ts-print-root,
          body .ts-print-root.ts-print-root.ts-print-root div,
          body .ts-print-root.ts-print-root.ts-print-root img,
          body .ts-print-root.ts-print-root.ts-print-root p,
          body .ts-print-root.ts-print-root.ts-print-root span,
          /* The name bands are SVG. Left off this list they were caught by the
             hide-everything rule above and printed as nothing at all — on
             screen the names were there, on paper the tokens came out blank. */
          body .ts-print-root.ts-print-root.ts-print-root svg {
            display: block !important;
          }
          /* And every shape INSIDE the svg, which the same rule hides one by
             one. Hiding the band and the text while leaving the svg itself
             visible is how the first fix looked right and still printed
             nothing. inline rather than block: these are SVG elements, and
             their own layout is none of CSS's business. */
          body .ts-print-root.ts-print-root.ts-print-root svg * {
            display: inline !important;
          }
          /* The number disc centres its digit with line-height, so block is
             right for it — but it must keep its own box, not be stretched by
             anything above. Stated explicitly so a future change to the rule
             above cannot quietly move the numbers off their tokens again. */
          body .ts-print-root.ts-print-root.ts-print-root .ts-badge {
            display: block !important;
            text-align: center !important;
            box-sizing: border-box !important;
          }
          body .ts-print-root.ts-print-root.ts-print-root .ts-row,
          body .ts-print-root.ts-print-root.ts-print-root .ts-ruler-bar {
            display: flex !important;
          }
          /* A SQUARE TOKEN'S NAMEPLATE IS A FLEX ROW, AND THE RULE ABOVE IS NOT.
             The div rule further up carries display:block !important, which
             turns the band back into a block and drops the centring with it:
             on screen the name sat
             in the middle of the plate, on paper it printed hard left. The band,
             its number disc and its text are named here so their layout survives
             into the print stylesheet, exactly as .ts-row and .ts-badge are. */
          body .ts-print-root.ts-print-root.ts-print-root .ts-nameplate {
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            text-align: center !important;
          }
          body .ts-print-root.ts-print-root.ts-print-root .ts-nameplate-num {
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            flex: 0 0 auto !important;
          }
          body .ts-print-root.ts-print-root.ts-print-root .ts-nameplate-text {
            display: block !important;
            text-align: center !important;
          }

          /* index.css pins the page to A4's usable width for stat blocks. A
             Letter or A3 sheet has to be allowed to be its own width, and a
             row of tokens wider than that cap was being cut off at the right
             edge. This used to be scoped with :has(.ts-print-root) — which
             Safari only understands from 15.4, so on an older one the cap
             stayed and the last token in every row lost its right-hand side.
             The stylesheet only exists while the sheet is open, so scoping it
             by time rather than by selector is enough. */
          html, body {
            width: auto !important; max-width: none !important;
            margin: 0 !important; padding: 0 !important;
          }

          .ts-print-root.ts-print-root.ts-print-root.ts-print-root {
            position: static !important; overflow: visible !important;
            background: #fff !important; padding: 0 !important;
          }
          /* On paper each page element IS a page: its own box, its own break.
             It keeps the margin as padding because @page's own margin is what
             the printer's unprintable edge eats into, and the two together
             would double it. */
          .ts-paper {
            /* As tall as its own content, and no wider than the page.
               No padding either: the border round the tokens is the printer's
               margin. Padding here would be added to a content height that is
               already the whole printable area, which is precisely how a page
               ends up taller than the sheet it prints on.
               page-break-after comes first and matters most — Safari acts on
               the legacy property, and break-after is for everything else. */
            width: auto !important;
            height: auto !important;
            min-height: 0 !important; overflow: visible !important;
            margin: 0 !important; padding: 0 !important; box-shadow: none !important;
            box-sizing: border-box !important;
            page-break-after: always !important;
            break-after: page !important;
          }
          /* A row is the unit that must not be cut. If the printable area
             turns out shorter than the packing assumed — an odd margin
             setting, a printer with a wide unprintable edge — the last row
             moves to the next sheet whole. An extra sheet is a nuisance; half
             a goblin is a wasted one. */
          body .ts-print-root.ts-print-root.ts-print-root .ts-row {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          /* No break after the last page, or the printer is handed a blank
             sheet at the end. Stated with both spellings for the same reason
             as above. */
          .ts-paper:last-child, .ts-paper:last-of-type {
            page-break-after: auto !important; break-after: auto !important;
          }
          body .ts-print-root.ts-print-root.ts-print-root .ts-row {
            display: flex !important;
          }
          .ts-bar.ts-bar.ts-bar.ts-bar { display: none !important; }
          .ts-ruler-note { color: #555 !important; }
        }
      `}</style>

      <div className="ts-bar">
        <button
          type="button"
          onClick={() => window.print()}
          className="px-4 py-2 rounded-lg bg-dnd-gold text-gray-900 font-semibold text-sm"
        >Print</button>
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-200 text-sm"
        >Back to the list</button>
        <span className="text-[12px] text-gray-400 ml-2">
          {discCount} token{discCount === 1 ? '' : 's'} · {paper.label}
          {' · '}{pages.length} page{pages.length === 1 ? '' : 's'}
          {' · '}In the print dialogue: paper <b className="text-gray-200">{paper.label}</b>,
          scale <b className="text-gray-200">100%</b> (not “fit to page”). Margins there can be
          anything — the pages are packed to fit the smallest a printer offers.
          {(sheet.fillBg || sheet.ring) && (
            <>
              {' '}In Safari, tick <b className="text-gray-200">Print backgrounds</b> under More
              Settings or the token fill comes out white.
            </>
          )}
        </span>
      </div>

      {pages.map((rows, pageIdx) => (
        <div
          key={`page-${pageIdx}`}
          className="ts-paper"
          style={pageIdx === 0 ? { marginTop: 52 } : undefined}
        >
          {pageIdx === 0 && sheet.ruler && <Ruler heightIn={RULER_IN} />}
          {rows.map((row, rowIdx) => (
            <div key={`row-${rowIdx}`} className="ts-row" style={{ marginTop: rowIdx ? `${sheet.gap}in` : 0 }}>
              {row.discs.map(({ entry, n }, i) => (
                <TokenDisc
                  key={`${entry.id}-${pageIdx}-${rowIdx}-${i}`}
                  entry={entry}
                  sizeCss={`${entry.diameter}in`}
                  bleedIn={bleed}
                  showCut={sheet.cutGuides}
                  label={sheet.showNames ? entry.name : null}
                  number={n}
                  ring={ringFor(entry, sheet)}
                  background={bgFor(entry, sheet)}
                  shape={shapeFor(entry, sheet)}
                />
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>,
    document.body
  );
}

// A printed ruler. The one check the page cannot do for itself: if this does
// not measure a true inch, the printer is scaling and every token on the sheet
// is the wrong size.
function Ruler({ heightIn }) {
  // A FIXED box, not whatever the text happens to measure.
  //
  // The paginator reserves exactly this much room on the first page. If the
  // ruler were free to be its natural height, a font that renders a hair
  // taller would push the last row past the bottom of the paper and the
  // printer would slice it — which is the failure this whole rewrite exists to
  // stop. So the reserve and the box are one number.
  return (
    <div style={{ height: `${heightIn}in`, boxSizing: 'border-box', overflow: 'hidden' }}>
      <div className="ts-ruler-bar" style={{ display: 'flex', width: 'fit-content', alignItems: 'flex-end', height: '0.28in' }}>
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            style={{
              width: '1in', height: i % 2 ? '0.18in' : '0.28in',
              borderLeft: '0.5pt solid #000', borderBottom: '0.5pt solid #000',
              background: i % 2 ? '#fff' : '#e5e7eb', boxSizing: 'border-box',
            }}
          />
        ))}
        <div style={{ width: 0, height: '0.28in', borderLeft: '0.5pt solid #000' }} />
      </div>
      <p className="ts-ruler-note" style={{ fontSize: '6.5pt', color: '#555', margin: '2pt 0 0' }}>
        Check before cutting: this bar is exactly 4 inches, each block 1 inch. If it
        measures short, the print dialogue is scaling — set it to 100%.
      </p>
    </div>
  );
}

// ── The tab ─────────────────────────────────────────────────────────────────
export default function TokenSheet({ sessionId, sessionTokens = [] }) {
  const storeKey = `dndvtt_token_sheet_${sessionId || 'none'}`;
  const [entries, setEntries] = useState([]);
  const [sheet, setSheet] = useState({
    paper: 'a4', margin: 0.5, gap: 0.12,
    // No bleed and no cut line by DEFAULT, so the edge of the picture is the
    // edge of the token. Bleed prints art past the cut line on purpose, which
    // means the disc you can see is bigger than the token is meant to be — cut
    // round the picture and a one-inch goblin comes out at an inch and an
    // eighth. That is only safe for someone cutting on the line, so it is
    // opt-in, and switching it on turns the line on with it.
    cutGuides: false, showNames: false, ruler: true, bleed: 'none', pack: true,
    numbering: false,
    // Discs by default: that is what sits on a battle map. Square prints the
    // whole picture instead, for art that was never drawn to be cut round.
    shape: 'circle',
    // Art with no disc of its own: a ring to cut round, and something for a
    // transparent PNG to stand on. Both off by default — most token art
    // already has a border and a background, and adding a second ring to a
    // picture that has one looks like a mistake.
    ring: false, ringColor: '#111111', ringWidth: 2, ringHighlight: false,
    fillBg: false, bgColor: '#ffffff',
  });
  const [printing, setPrinting] = useState(false);
  const [framing, setFraming] = useState(null);        // entry id
  const [source, setSource] = useState('library');     // library | compendium | map
  const [q, setQ] = useState('');
  const [lib, setLib] = useState([]);
  const [libBusy, setLibBusy] = useState(false);
  const [comp, setComp] = useState([]);
  const [compBusy, setCompBusy] = useState(false);
  const [compStatus, setCompStatus] = useState(null);
  const [adding, setAdding] = useState(null);          // compendium row being fetched
  const [mapNote, setMapNote] = useState('');          // what the last map import did
  const fileRef = useRef(null);

  // Kept per session: a sheet is usually built over a couple of sittings, and
  // losing it to a refresh is the kind of thing that stops people using a tool.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storeKey);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (Array.isArray(saved?.entries)) {
        // Blob URLs die with the document, so an uploaded image cannot survive
        // a reload. Dropping those keeps the rest of the list rather than
        // restoring rows that would print as empty circles.
        // Re-issued on the way in, both to repair a draft saved while ids
        // could collide and so a restored id can never clash with a new one.
        setEntries(saved.entries
          .filter((e) => e && e.src && !e.src.startsWith('blob:'))
          .map((e) => ({ ...e, id: newId(), frame: { ...BLANK_FRAME, ...(e.frame || {}) } })));
      }
      if (saved?.sheet) {
        // v2 corrected two defaults that made tokens print oversized: bleed was
        // on, so the visible disc was bigger than the token was meant to be.
        // A saved sheet from before that carries the bad values, and the person
        // holding the scissors has no way to know why their goblins are wrong,
        // so it is reset once rather than preserved.
        const stale = (saved.v || 1) < 2;
        setSheet((s) => ({
          ...s,
          ...saved.sheet,
          margin: Math.max(ASSUMED_PRINTER_MARGIN_IN, Number(saved.sheet.margin) || 0.5),
          ...(stale ? { bleed: 'none', cutGuides: false } : {}),
        }));
      }
    } catch { /* a corrupt draft is not worth an error */ }
  }, [storeKey]);

  useEffect(() => {
    try {
      localStorage.setItem(storeKey, JSON.stringify({
        v: 2, entries: entries.filter((e) => !e.src.startsWith('blob:')), sheet,
      }));
    } catch { /* quota, private mode — the sheet still works in memory */ }
  }, [entries, sheet, storeKey]);

  // The GM's own library.
  useEffect(() => {
    if (source !== 'library') return undefined;
    let dead = false;
    setLibBusy(true);
    const t = setTimeout(() => {
      fetch(`/api/creatures?role=dm${q.trim() ? `&q=${encodeURIComponent(q.trim())}` : ''}`)
        .then((r) => (r.ok ? r.json() : []))
        .then((rows) => {
          if (dead) return;
          const all = Array.isArray(rows) ? rows : [];
          const needle = q.trim().toLowerCase();
          setLib((needle ? all.filter((c) => (c.name || '').toLowerCase().includes(needle)) : all)
            .filter((c) => c.image_path || c.display_image_path)
            .slice(0, 80));
        })
        .catch(() => { if (!dead) setLib([]); })
        .finally(() => { if (!dead) setLibBusy(false); });
    }, 220);
    return () => { dead = true; clearTimeout(t); };
  }, [source, q]);

  // A stale "Added 6 tokens" under a different tab reads as something that just
  // happened.
  useEffect(() => { setMapNote(''); }, [source]);

  useEffect(() => {
    if (source !== 'compendium' || compStatus) return;
    compendiumStatus().then(setCompStatus).catch(() => setCompStatus({ ok: false, error: 'unreachable' }));
  }, [source, compStatus]);

  useEffect(() => {
    if (source !== 'compendium') return undefined;
    let dead = false;
    setCompBusy(true);
    const t = setTimeout(() => {
      searchCompendium(q, 40)
        .then((rows) => { if (!dead) setComp(rows); })
        .catch(() => { if (!dead) setComp([]); })
        .finally(() => { if (!dead) setCompBusy(false); });
    }, 260);
    return () => { dead = true; clearTimeout(t); };
  }, [source, q]);

  // Only tokens with artwork can be printed; the rest are counted so the panel
  // can say why it is not offering them.
  const mapTokens = sessionTokens.filter((t) => t.image_path);
  const mapTokensWithoutArt = sessionTokens.length - mapTokens.length;

  const add = (e) => setEntries((p) => [...p, e]);
  const patch = (id, fields) =>
    setEntries((p) => p.map((e) => (e.id === id ? { ...e, ...fields } : e)));
  const remove = (id) => setEntries((p) => p.filter((e) => e.id !== id));

  // Everything standing on the board, in one go.
  //
  // A map holds the encounter the GM has already built — six goblins, two ogres
  // and a dragon — and adding them one at a time is the same encounter typed
  // out twice. Copies of a creature become ONE row with a quantity rather than
  // six rows, which is what the numbering and the packing both expect.
  //
  // Pressing it again does nothing: the sheet is brought UP TO what the map
  // holds rather than having the map added to it, so a second press on an
  // unchanged board is a no-op instead of twelve goblins.
  const addAllFromMap = () => {
    const wanted = new Map();
    for (const t of mapTokens) {
      const name = String(t.nickname || t.name || 'Token').trim() || 'Token';
      const src = artUrl(t.image_path);
      const key = `${name.toLowerCase()}|${src}`;
      const row = wanted.get(key)
        || { name, src: t.image_path, size: t.size, sizeSquares: t.size_squares, count: 0 };
      row.count += 1;
      wanted.set(key, row);
    }

    let added = 0;
    setEntries((prev) => {
      const next = [...prev];
      for (const [key, row] of wanted) {
        const matches = next
          .map((e, i) => ({ e, i }))
          .filter(({ e }) => `${String(e.name || '').trim().toLowerCase()}|${e.src}` === key);
        const have = matches.reduce((n, { e }) => n + Math.max(1, Number(e.qty) || 1), 0);
        const short = row.count - have;
        if (short <= 0) continue;
        added += short;
        if (matches.length) {
          const { i, e } = matches[0];
          next[i] = { ...e, qty: Math.max(1, Number(e.qty) || 1) + short };
        } else {
          next.push({
            ...entryFrom({
              name: row.name, src: row.src,
              size: row.size, sizeSquares: row.sizeSquares, source: 'map',
            }),
            qty: short,
          });
        }
      }
      return next;
    });
    setMapNote(added
      ? `Added ${added} token${added === 1 ? '' : 's'} from the map.`
      : 'The sheet already has everything on this map.');
  };

  const addCreature = (c) => add(entryFrom({
    name: c.name,
    // Token art first: it is already round and already cropped for a disc.
    // The full illustration is a fallback, and usually needs framing.
    src: c.image_path || c.display_image_path,
    size: c.size, sizeSquares: c.size_squares, source: 'library',
  }));

  const addCompendium = async (row) => {
    setAdding(row.name + row.source);
    try {
      const p = await previewCompendiumCreature(row);
      const path = p.images?.token || p.images?.art;
      if (!path) throw new Error('no artwork');
      add(entryFrom({
        name: p.creature?.name || row.name,
        src: compendiumImgUrl(path),
        size: p.creature?.size, sizeSquares: p.creature?.size_squares,
        source: 'compendium',
      }));
    } catch { /* the row stays; nothing was added */ }
    setAdding(null);
  };

  const onFiles = (files) => {
    for (const f of files) {
      if (!f.type.startsWith('image/')) continue;
      add(entryFrom({
        name: f.name.replace(/\.[a-z0-9]+$/i, ''),
        src: URL.createObjectURL(f),
        size: 'medium', source: 'upload',
      }));
    }
  };

  const total = useMemo(
    () => entries.reduce((n, e) => n + Math.max(1, Number(e.qty) || 1), 0),
    [entries]
  );
  // How much paper this is — the real number, from the same packer the print
  // view uses, so the count on the button and the pages that come out of the
  // printer cannot disagree. It used to be a separate estimate that counted
  // rows slightly differently and was routinely one out.
  const pages = useMemo(() => {
    const paper = PAPERS[sheet.paper] || PAPERS.a4;
    const bleedIn = (BLEEDS.find((b) => b.id === sheet.bleed) || BLEEDS[0]).in;
    const area = printableArea(paper, sheet.margin);
    return paginate(layOut(entries, sheet.pack, sheet.numbering), {
      pageW: area.w,
      pageH: area.h,
      margin: 0,
      gap: sheet.gap,
      bleedIn,
      firstPageReserve: sheet.ruler ? RULER_IN : 0,
    }).length;
  }, [entries, sheet]);

  const oversize = entries.filter((e) => {
    const paper = PAPERS[sheet.paper] || PAPERS.a4;
    const bleedIn = (BLEEDS.find((b) => b.id === sheet.bleed) || BLEEDS[0]).in;
    return e.diameter + bleedIn * 2 > paper.w - sheet.margin * 2;
  });

  const framingEntry = entries.find((e) => e.id === framing) || null;
  const input = 'bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-2 text-sm text-gray-100 ' +
                'focus:outline-none focus:border-dnd-gold';

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4 text-sm">
      {printing && (
        <PrintSheet entries={entries} sheet={sheet} onClose={() => setPrinting(false)} />
      )}

      <div>
        <h3 className="text-dnd-gold font-semibold">Token sheet</h3>
        <p className="text-[11px] text-gray-400 leading-snug mt-0.5">
          Print tokens as circles at the size they take up on the map — one inch to a
          grid square, so a medium creature is 1", an ogre 2", a young dragon 3".
        </p>
      </div>

      {/* ── Where tokens come from ─────────────────────────────────────── */}
      <section className="space-y-2">
        <div className="flex gap-1">
          {[['library', 'Library'], ['compendium', '5e Tools'], ['map', 'On the map'], ['upload', 'Upload']]
            .map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => { setSource(k); if (k === 'upload') fileRef.current?.click(); }}
                className={`px-3 py-1.5 rounded-lg text-[12px] border ${
                  source === k ? 'bg-gray-700 border-dnd-gold text-dnd-gold'
                               : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'}`}
              >{label}</button>
            ))}
        </div>
        <input
          ref={fileRef} type="file" accept="image/*" multiple className="hidden"
          onChange={(e) => { onFiles([...e.target.files]); e.target.value = ''; }}
        />

        {(source === 'library' || source === 'compendium') && (
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={source === 'library' ? 'Search your library…' : 'Search 5e Tools…'}
            className={`w-full ${input}`}
          />
        )}

        {source === 'library' && (
          <div className="grid grid-cols-4 gap-2 max-h-56 overflow-y-auto">
            {libBusy && !lib.length && <p className="col-span-4 text-[12px] text-gray-500">Looking…</p>}
            {!libBusy && !lib.length && (
              <p className="col-span-4 text-[12px] text-gray-500">
                Nothing with artwork here. Only creatures that have a picture can be printed.
              </p>
            )}
            {lib.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => addCreature(c)}
                title={`${c.name} · ${autoDiameter(c.size, c.size_squares)}"`}
                className="group rounded-lg border border-gray-700 bg-gray-800 p-1.5 hover:border-dnd-gold text-left"
              >
                <img
                  src={artUrl(c.image_path || c.display_image_path)}
                  alt=""
                  className="w-full aspect-square object-cover rounded-full bg-gray-900"
                />
                <span className="block text-[10px] text-gray-300 truncate mt-1">{c.name}</span>
                <span className="block text-[9px] text-gray-500">
                  {autoDiameter(c.size, c.size_squares)}&quot;
                </span>
              </button>
            ))}
          </div>
        )}

        {source === 'compendium' && (
          <div className="max-h-56 overflow-y-auto space-y-1">
            {compStatus && !compStatus.ok && (
              <p className="text-[12px] text-amber-400">
                The 5e Tools mirror is unreachable{compStatus.error ? ` (${compStatus.error})` : ''}.
              </p>
            )}
            {compBusy && !comp.length && <p className="text-[12px] text-gray-500">Searching…</p>}
            {comp.map((row) => (
              <button
                key={`${row.source}/${row.name}`}
                type="button"
                disabled={adding === row.name + row.source}
                onClick={() => addCompendium(row)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg bg-gray-800 border
                           border-gray-700 hover:border-dnd-gold text-left disabled:opacity-50"
              >
                <span className="flex-1 min-w-0 truncate text-[12px] text-gray-200">{row.name}</span>
                <span className="text-[10px] text-gray-500 shrink-0">{row.source}</span>
                {adding === row.name + row.source && <span className="text-[10px] text-dnd-gold">adding…</span>}
              </button>
            ))}
          </div>
        )}

        {source === 'map' && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                disabled={!mapTokens.length}
                onClick={addAllFromMap}
                className="px-3 py-1.5 rounded-lg bg-dnd-gold text-gray-900 text-[12px] font-semibold
                           hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Add every token on this map
                {mapTokens.length ? ` · ${mapTokens.length}` : ''}
              </button>
              {mapTokensWithoutArt > 0 && (
                <span className="text-[11px] text-gray-500">
                  {mapTokensWithoutArt} without artwork {mapTokensWithoutArt === 1 ? 'is' : 'are'} skipped
                </span>
              )}
              {mapNote && <span className="text-[11px] text-dnd-gold">{mapNote}</span>}
            </div>
            <p className="text-[11px] text-gray-500 leading-snug">
              Copies of the same creature arrive as one row with a quantity, so six goblins on
              the board are one row of six. Press it again after adding more to the map and only
              the new ones come across.
            </p>
            <div className="grid grid-cols-4 gap-2 max-h-56 overflow-y-auto">
            {!sessionTokens.length && (
              <p className="col-span-4 text-[12px] text-gray-500">No tokens on this map yet.</p>
            )}
            {mapTokens.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => add(entryFrom({
                  name: t.nickname || t.name, src: t.image_path,
                  size: t.size, sizeSquares: t.size_squares, source: 'map',
                }))}
                className="rounded-lg border border-gray-700 bg-gray-800 p-1.5 hover:border-dnd-gold text-left"
              >
                <img src={artUrl(t.image_path)} alt="" className="w-full aspect-square object-cover rounded-full bg-gray-900" />
                <span className="block text-[10px] text-gray-300 truncate mt-1">{t.nickname || t.name}</span>
              </button>
            ))}
            </div>
          </div>
        )}
      </section>

      {/* ── The list ───────────────────────────────────────────────────── */}
      <section className="space-y-2">
        <div className="flex items-baseline gap-2">
          <h4 className="text-xs uppercase tracking-wider text-gray-400 flex-1">
            The sheet — {total} token{total === 1 ? '' : 's'}
            {pages > 0 && <span className="text-gray-500"> · {pages} page{pages === 1 ? '' : 's'}</span>}
          </h4>
          {entries.length > 0 && (
            <button
              type="button"
              onClick={() => setEntries([])}
              className="text-[11px] text-gray-500 hover:text-gray-300"
            >Clear</button>
          )}
        </div>

        {!entries.length && (
          <p className="text-[12px] text-gray-500">
            Nothing on the sheet yet. Pick creatures above; each arrives at the size its
            stat block says it is.
          </p>
        )}

        {oversize.length > 0 && (
          <p className="text-[12px] text-amber-400">
            {oversize.map((e) => e.name).join(', ')} {oversize.length === 1 ? 'is' : 'are'} wider
            than the page. Use a bigger paper size or a smaller diameter.
          </p>
        )}

        {entries.map((e) => (
          <div key={e.id} className="rounded-xl bg-gray-800/60 border border-gray-700 p-2 space-y-2">
            <div className="flex items-center gap-2">
              {/* The thumbnail carries the ring and the fill, so the choice is
                  made against what will actually print rather than against a
                  picture that looks nothing like it. */}
              <div
                className={`w-11 h-11 overflow-hidden shrink-0 relative ${
                  shapeFor(e, sheet) === 'square' ? 'rounded-sm' : 'rounded-full'}`}
                style={{
                  background: bgFor(e, sheet) === 'transparent' ? '#111827' : bgFor(e, sheet),
                  boxShadow: (() => {
                    const r = ringFor(e, sheet);
                    return r ? `inset 0 0 0 2px ${r.color}` : 'inset 0 0 0 1px #374151';
                  })(),
                }}
              >
                <img
                  src={e.src}
                  alt=""
                  style={{
                    width: '100%', height: '100%',
                    objectFit: shapeFor(e, sheet) === 'square' ? 'contain' : 'cover',
                    transform: `scale(${e.frame.zoom}) translate(${e.frame.x}%, ${e.frame.y}%)`,
                  }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <input
                  value={e.name}
                  onChange={(ev) => patch(e.id, { name: ev.target.value })}
                  className="w-full bg-transparent text-gray-100 text-[13px] focus:outline-none
                             focus:bg-gray-900 rounded px-1 -ml-1 truncate"
                />
                <span className="text-[10px] text-gray-500">{e.source}</span>
              </div>
              <button
                type="button"
                onClick={() => remove(e.id)}
                aria-label={`Remove ${e.name}`}
                className="px-2 py-1.5 rounded-lg bg-gray-900 border border-gray-700 text-gray-500
                           text-[11px] hover:text-red-300 shrink-0"
              >✕</button>
            </div>
            <div className="flex items-end gap-2">
              {/* A SIZE OFF THE LIST, OR ONE OF YOUR OWN.
                  The presets cover the grid sizes and the usual multiples, and
                  a dropdown of eight numbers was the only way to set a
                  diameter — so a 2.5" swarm base or a 1.25" token that matches
                  somebody's existing minis could not be asked for at all.
                  Picking "Custom" swaps the dropdown for a box; a row that
                  already holds an off-list number opens in that state, because
                  otherwise the select would sit there showing the wrong
                  size. */}
              <label className="flex-1 min-w-0">
                <span className="block text-[9px] text-gray-500">inches</span>
                {DIAMETER_PRESETS.includes(e.diameter) && !e.customSize ? (
                  <select
                    value={e.diameter}
                    onChange={(ev) => {
                      if (ev.target.value === 'custom') { patch(e.id, { customSize: true }); return; }
                      patch(e.id, { diameter: Number(ev.target.value) });
                    }}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-1.5 py-1 text-[12px] text-gray-100"
                  >
                    {DIAMETER_PRESETS.map((d) => (
                      <option key={d} value={d}>{d}&quot;{d === e.autoDiameter ? ' · its size' : ''}</option>
                    ))}
                    <option value="custom">Custom…</option>
                  </select>
                ) : (
                  <span className="flex items-center gap-1">
                    <input
                      type="number"
                      min={DIAMETER_MIN} max={DIAMETER_MAX} step="0.05"
                      value={e.diameter}
                      onChange={(ev) => patch(e.id, { diameter: Number(ev.target.value), customSize: true })}
                      onBlur={(ev) => patch(e.id, { diameter: clampDiameter(ev.target.value, e.autoDiameter || 1) })}
                      className="w-full min-w-0 bg-gray-900 border border-emerald-700/60 rounded-lg px-1.5 py-1
                                 text-[12px] text-gray-100 tabular-nums"
                    />
                    <button
                      type="button"
                      onClick={() => patch(e.id, {
                        customSize: false,
                        diameter: DIAMETER_PRESETS.includes(e.diameter) ? e.diameter : (e.autoDiameter || 1),
                      })}
                      title="Back to the preset sizes"
                      className="shrink-0 px-1.5 py-1 rounded-lg bg-gray-900 border border-gray-700 text-gray-500 text-[11px]"
                    >↺</button>
                  </span>
                )}
              </label>
              <label className="shrink-0">
                <span className="block text-[9px] text-gray-500">copies</span>
                <input
                  type="number" min="1" max="99" value={e.qty}
                  onChange={(ev) => patch(e.id, { qty: Math.max(1, Number(ev.target.value) || 1) })}
                  className="w-14 bg-gray-900 border border-gray-700 rounded-lg px-1.5 py-1
                             text-[12px] text-gray-100 tabular-nums"
                />
              </label>
              <button
                type="button"
                onClick={() => setFraming(e.id)}
                className="px-3 py-1.5 rounded-lg bg-gray-900 border border-gray-700 text-gray-300
                           text-[11px] hover:bg-gray-700 shrink-0"
              >Frame</button>
            </div>
            {/* Ring and background on their own line. Squeezed onto the row
                above, the size dropdown was down to a sliver and the Frame
                button was off the edge of the panel. */}
            <div className="flex items-center gap-2 flex-wrap">
              <label
                className="flex items-center gap-1 text-[11px] text-gray-400 shrink-0"
                title="Print a ring round this token. Overrides the sheet's own setting."
              >
                <input
                  type="checkbox"
                  checked={!!ringFor(e, sheet)}
                  onChange={(ev) => patch(e.id, { ring: ev.target.checked })}
                />
                ring
              </label>
              {/* This token's own ring colour. Only offered once the ring is
                  on, because a colour for a ring that is not printed is a
                  control that does nothing. Picking one turns the ring on for
                  this row as well, so the swatch cannot be set and then look
                  ignored. */}
              {!!ringFor(e, sheet) && (
                <>
                  <label className="shrink-0" title="Ring colour for this token">
                    <span className="sr-only">Ring colour</span>
                    {/* eslint-disable-next-line jsx-a11y/control-has-associated-label */}
                    <input
                      type="color"
                      value={ringFor(e, sheet)?.color || sheet.ringColor}
                      onChange={(ev) => patch(e.id, { ring: true, ringColor: ev.target.value })}
                      className="w-7 h-7 bg-transparent border border-dnd-gold/50 rounded cursor-pointer"
                    />
                  </label>
                  <label
                    className="flex items-center gap-1 text-[10px] text-gray-500 shrink-0"
                    title="Light on this token's ring, from the top left."
                  >
                    <input
                      type="checkbox"
                      checked={!!ringFor(e, sheet)?.highlight}
                      onChange={(ev) => patch(e.id, { ring: true, ringHighlight: ev.target.checked })}
                    />
                    lit
                  </label>
                  <label
                    className="flex items-center gap-1 text-[10px] text-gray-500 shrink-0"
                    title="Ring thickness for this token, in points. It grows inward, so the token stays the size its creature is."
                  >
                    <input
                      type="number"
                      min={RING_WIDTH_MIN}
                      max={RING_WIDTH_MAX}
                      step="0.5"
                      value={ringFor(e, sheet)?.width ?? sheet.ringWidth}
                      onChange={(ev) => patch(e.id, {
                        ring: true,
                        ringWidth: clampRingWidth(ev.target.value, sheet.ringWidth),
                      })}
                      className="w-12 bg-gray-900 border border-gray-700 rounded px-1 py-1
                                 text-[12px] text-gray-100 tabular-nums"
                    />
                    pt
                  </label>
                </>
              )}
              <label
                className="shrink-0"
                title="Background behind this token, for art with a transparent background."
              >
                <span className="sr-only">Background colour</span>
                <input
                  type="color"
                  value={bgFor(e, sheet) === 'transparent' ? '#ffffff' : bgFor(e, sheet)}
                  onChange={(ev) => patch(e.id, { bg: ev.target.value })}
                  className="w-7 h-7 bg-transparent border border-gray-700 rounded cursor-pointer"
                />
              </label>
              <span className="text-[10px] text-gray-600">background</span>
              {/* THIS TOKEN'S SHAPE, OR THE SHEET'S.
                  Art arrives in both kinds on the same sheet: monster tokens
                  drawn as discs, and card-style art whose border and nameplate
                  are part of the picture. "Sheet" leaves the row following the
                  setting below, so changing the sheet still moves it. */}
              <label className="flex items-center gap-1 text-[10px] text-gray-500 shrink-0"
                     title="Shape for this token. 'Sheet' follows the setting below.">
                <select
                  value={e.shape || ''}
                  onChange={(ev) => patch(e.id, { shape: ev.target.value || null })}
                  className="bg-gray-900 border border-gray-700 rounded px-1 py-1 text-[11px] text-gray-100"
                >
                  <option value="">sheet ({shapeOf(sheet) === 'square' ? 'square' : 'circle'})</option>
                  <option value="circle">circle</option>
                  <option value="square">square · whole image</option>
                </select>
              </label>
              {/* OUT OF THE NUMBERING, NOT OUT OF THE SHEET.
                  Numbers exist to tell identical tokens apart, and some of them
                  should not carry one: a named captain among her guards, a
                  player character printed alongside the monsters, a token whose
                  art already has a number on it. Excluding a row also takes it
                  out of the count, so the rest still run 1, 2, 3 rather than
                  starting at two. Only offered while numbering is on — a switch
                  that turns nothing off is noise. */}
              {sheet.numbering && (
                <label
                  className="flex items-center gap-1 text-[10px] text-gray-500 shrink-0 ml-auto"
                  title="Print this token without a number, and leave it out of the count."
                >
                  <input
                    type="checkbox"
                    checked={!!e.noNumber}
                    onChange={(ev) => patch(e.id, { noNumber: ev.target.checked })}
                  />
                  no number
                </label>
              )}
            </div>
            {(e.ring != null || e.bg != null || e.ringColor != null || e.ringWidth != null
              || e.ringHighlight != null || e.shape != null) && (
              <button
                type="button"
                onClick={() => patch(e.id, {
                  ring: null, bg: null, ringColor: null, ringWidth: null, ringHighlight: null,
                  shape: null,
                })}
                className="text-[10px] text-gray-500 hover:text-gray-300 underline decoration-dotted"
              >Back to the sheet's shape, ring and background</button>
            )}
          </div>
        ))}
      </section>

      {/* ── Sheet settings ─────────────────────────────────────────────── */}
      <section className="space-y-2 rounded-xl bg-gray-800/40 border border-gray-700 p-3">
        <h4 className="text-xs uppercase tracking-wider text-gray-400">The paper</h4>
        <div className="grid grid-cols-2 gap-2">
          <label className="space-y-1">
            <span className="block text-[11px] text-gray-400">Size</span>
            <select
              value={sheet.paper}
              onChange={(e) => setSheet({ ...sheet, paper: e.target.value })}
              className={`w-full ${input}`}
            >
              {Object.entries(PAPERS).map(([k, p]) => <option key={k} value={k}>{p.label}</option>)}
            </select>
          </label>
          <label className="space-y-1">
            <span className="block text-[11px] text-gray-400">Token shape (default)</span>
            <select
              value={shapeOf(sheet)}
              onChange={(e) => setSheet({ ...sheet, shape: e.target.value })}
              className={`w-full ${input}`}
            >
              {Object.entries(SHAPES).map(([k, sh]) => <option key={k} value={k}>{sh.label}</option>)}
            </select>
          </label>
          <label className="space-y-1">
            <span className="block text-[11px] text-gray-400">Bleed past the cut line</span>
            <select
              value={sheet.bleed}
              onChange={(e) => setSheet({
                ...sheet,
                bleed: e.target.value,
                // Bleed is meaningless without the line it bleeds past.
                cutGuides: e.target.value === 'none' ? sheet.cutGuides : true,
              })}
              className={`w-full ${input}`}
            >
              {BLEEDS.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
            </select>
          </label>
          <label className="space-y-1">
            <span className="block text-[11px] text-gray-400">Margin · {sheet.margin}&quot;</span>
            {/* Floor of half an inch, because that is what the packing assumes
                a printer keeps for itself whatever this says. A smaller number
                here would be a promise the paper cannot keep: the tokens would
                be packed into a strip the printer will not reach, and the
                bottom row would come out cut. */}
            <input
              type="range" min="0.5" max="1" step="0.05" value={sheet.margin}
              onChange={(e) => setSheet({ ...sheet, margin: Number(e.target.value) })}
              className="w-full"
            />
          </label>
          <label className="space-y-1">
            <span className="block text-[11px] text-gray-400">Gap · {sheet.gap}&quot;</span>
            <input
              type="range" min="0" max="0.5" step="0.02" value={sheet.gap}
              onChange={(e) => setSheet({ ...sheet, gap: Number(e.target.value) })}
              className="w-full"
            />
          </label>
        </div>
        {/* ── Art that has no disc of its own ───────────────────────────── */}
        <div className="pt-2 mt-1 border-t border-gray-700 space-y-2">
          <h4 className="text-xs uppercase tracking-wider text-gray-400">The token itself</h4>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-1.5 text-[12px] text-gray-300">
              <input
                type="checkbox" checked={!!sheet.ring}
                onChange={(e) => setSheet({ ...sheet, ring: e.target.checked })}
              />
              Border ring
            </label>
            <label className="flex items-center gap-1.5 text-[11px] text-gray-400">
              colour
              <input
                type="color" value={sheet.ringColor}
                onChange={(e) => setSheet({ ...sheet, ringColor: e.target.value })}
                className="w-8 h-6 bg-transparent border border-gray-700 rounded cursor-pointer"
              />
            </label>
            <label
              className="flex items-center gap-1.5 text-[12px] text-gray-300"
              title="Shades the ring as though a lamp sat above and to the left of the table: pale at the top left, the ring's own colour through the middle, darker at the bottom right."
            >
              <input
                type="checkbox" checked={!!sheet.ringHighlight}
                onChange={(e) => setSheet({ ...sheet, ringHighlight: e.target.checked, ring: true })}
              />
              Lit from top left
            </label>
            <label
              className="flex items-center gap-1.5 text-[11px] text-gray-400"
              title="Thickness in points. The ring grows inward, so the token keeps the size its creature is."
            >
              {sheet.ringWidth}pt
              <input
                type="range"
                min={RING_WIDTH_MIN} max={RING_WIDTH_MAX} step="0.5"
                value={sheet.ringWidth}
                onChange={(e) => setSheet({ ...sheet, ringWidth: Number(e.target.value) })}
                className="w-24"
              />
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-1.5 text-[12px] text-gray-300">
              <input
                type="checkbox" checked={!!sheet.fillBg}
                onChange={(e) => setSheet({ ...sheet, fillBg: e.target.checked })}
              />
              Background fill
            </label>
            <label className="flex items-center gap-1.5 text-[11px] text-gray-400">
              colour
              <input
                type="color" value={sheet.bgColor}
                onChange={(e) => setSheet({ ...sheet, bgColor: e.target.value, fillBg: true })}
                className="w-8 h-6 bg-transparent border border-gray-700 rounded cursor-pointer"
              />
            </label>
            <span className="text-[11px] text-gray-500">
              For a PNG with a transparent background — otherwise the paper shows through.
            </span>
          </div>
          <p className="text-[11px] text-gray-500 leading-snug">
            Both are defaults for the whole sheet; any row can disagree with them using the
            ring box, the two swatches and the pt figure on that row — the gold-edged swatch
            is that token's ring colour, the plain one its background. A ring grows inward:
            a thick one eats into the picture rather than making the token bigger, so a
            medium creature is still an inch across whatever ring it has.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 pt-1">
          {[['cutGuides', 'Cut lines'], ['showNames', 'Names on tokens'],
            ['numbering', 'Number duplicates'], ['ruler', 'Printer check ruler'],
            ['pack', 'Pack big ones first']]
            .map(([k, label]) => (
              <label key={k} className="flex items-center gap-1.5 text-[12px] text-gray-300">
                <input
                  type="checkbox" checked={!!sheet[k]}
                  onChange={(e) => setSheet({ ...sheet, [k]: e.target.checked })}
                />
                {label}
              </label>
            ))}
        </div>
        <p className="text-[11px] text-gray-500 leading-snug">
          Shape is a default: any row can disagree with it using the shape box on that
          row, so a square card and a round monster can print on one sheet.
          A square token prints the picture whole — nothing cropped, corners and all — in a
          square the same size across as the disc would have been, so a medium creature is
          still one inch on the table. Art that is taller than it is wide sits on the
          background colour at the sides; turn the background on if the picture has none of
          its own. Round tokens fill their disc instead, which crops whatever does not fit.
          Numbering puts a small white disc low inside each token, counting up per
          creature — goblins 1 to 6, dragons 1 to 3 — so the ones on the table can be
          told apart. A creature there is only one of is left unnumbered: there is
          nothing to tell it apart from. Any row can opt out with its own
          <b className="text-gray-300"> no number</b> box, which leaves that token blank and
          takes it out of the count, so the rest still start at one.
          With no bleed, the edge of the picture <b className="text-gray-300">is</b> the token
          — cut round the disc and a medium creature comes out at exactly one inch. Turning
          bleed on prints art <i>past</i> that edge so a wonky cut still lands on the
          picture, but then you have to cut on the line rather than round the art, or the
          token comes out too big. Packing puts the big discs down first and fills the gaps
          with small ones, which usually saves a sheet. The ruler is worth leaving on the
          first time you print: it is the only way to tell whether the printer is scaling.
        </p>
      </section>

      <button
        type="button"
        disabled={!entries.length}
        onClick={() => setPrinting(true)}
        className="w-full py-3 rounded-xl bg-dnd-gold text-gray-900 font-semibold
                   hover:brightness-110 disabled:opacity-40"
      >Preview &amp; print{total ? ` · ${total} token${total === 1 ? '' : 's'}` : ''}</button>

      {/* ── Framing ────────────────────────────────────────────────────── */}
      {framingEntry && (
        <div
          className="fixed inset-0 z-[120] bg-black/70 flex items-center justify-center p-4"
          onClick={() => setFraming(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-gray-900 border border-gray-700 p-4 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-dnd-gold font-semibold truncate">{framingEntry.name}</h3>
            <FrameEditor
              entry={framingEntry}
              shape={shapeFor(framingEntry, sheet)}
              onChange={(frame) => patch(framingEntry.id, { frame })}
              onDone={() => setFraming(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
