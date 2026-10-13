// Printable stat card for a ship class.
//
// Opens a bare window containing one self-contained card and fires the print
// dialog. A popup rather than an in-app print stylesheet because the VTT's own
// page is a full-bleed canvas app — hiding all of it to reveal one card fights
// every layout rule in the app, while a fresh document starts from nothing.
//
// Everything is inlined: the popup shares no stylesheet with the app, and a
// printer never gets a chance to fetch a font anyway.

const FT_PER_SQUARE = 5;

// User-entered text lands in innerHTML, so it has to be escaped. Ship names,
// weapon notes and action text are all free text typed by the GM.
function esc(v) {
  if (v == null) return '';
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Free text preserving the GM's line breaks.
function escMultiline(v) {
  return esc(v).replace(/\n/g, '<br>');
}

// "3–8" for a min/max pair, "3+" when only a minimum is set, "up to 8" when
// only a maximum is. Blank when the GM filled in neither, so the row drops out
// of the card rather than printing "0–0".
function crewLine(min, max) {
  const lo = Number(min) || 0;
  const hi = Number(max) || 0;
  if (!lo && !hi) return '';
  if (lo && hi) return lo === hi ? `${lo}` : `${lo}–${hi}`;
  return lo ? `${lo}+` : `up to ${hi}`;
}

// Every core stat prints, set or not — an em-dash for the blanks. Dropping
// empty rows made a half-filled ship look like the card had lost them.
function statRow(label, value) {
  const shown = value === '' || value == null ? '—' : value;
  const cls = shown === '—' ? 'stat empty' : 'stat';
  return `<div class="${cls}"><span class="k">${esc(label)}</span><span class="v">${esc(shown)}</span></div>`;
}

function weaponBlock(w) {
  const qty = Number(w.quantity) || 0;
  const title = `${esc(w.name || 'Weapon')}${qty > 1 ? ` <span class="qty">×${qty}</span>` : ''}`;
  // Only the fields that were filled in. A ballista with no listed cost
  // shouldn't print "Cost: —".
  const pills = [
    w.ac != null && w.ac !== '' ? `AC ${esc(w.ac)}` : '',
    w.hp != null && w.hp !== '' ? `HP ${esc(w.hp)}` : '',
    w.cost ? `Cost ${esc(w.cost)}` : '',
    w.ammo_cost ? `Ammo ${esc(w.ammo_cost)}` : '',
  ].filter(Boolean).map(p => `<span class="pill">${p}</span>`).join('');

  const actions = (Array.isArray(w.actions) ? w.actions : [])
    .filter(a => (a?.name || '').trim() || (a?.text || '').trim())
    .map(a => `<p class="action"><em>${esc(a.name || 'Action')}.</em> ${escMultiline(a.text)}</p>`)
    .join('');

  return `
    <div class="weapon">
      <div class="wname">${title}</div>
      ${pills ? `<div class="pills">${pills}</div>` : ''}
      ${w.notes ? `<p class="wnotes">${escMultiline(w.notes)}</p>` : ''}
      ${actions}
    </div>`;
}

// Build the card markup for a ship-library row (the one the builder holds,
// decks included).
export function shipCardHtml(ship) {
  const s = ship || {};
  // Descending: top of the hull first, the way the builder lists them and the
  // way you'd walk down through the ship. Sails are decoration rather than a
  // level — nobody stands on them — so they're left off the card entirely.
  const decks = (Array.isArray(s.decks) ? s.decks : [])
    .filter((d) => !d.is_sails)
    .slice()
    .sort((a, b) => b.deck_index - a.deck_index);
  const weapons = Array.isArray(s.weapons) ? s.weapons : [];

  const rows = [
    statRow('Armour Class', s.armor_class ?? ''),
    // Its own row rather than folded into the AC line as "15 (wooden hull)":
    // a blank armour type has to be visibly blank, not silently absent.
    statRow('Armour Type', s.armor_type || ''),
    statRow('Hull Points', s.hull_hp ?? ''),
    statRow('Damage Threshold', Number(s.damage_threshold) ? s.damage_threshold : ''),
    statRow('Speed', Number(s.speed) ? `${s.speed} ft.` : ''),
    statRow('Crew', crewLine(s.crew_min, s.crew_max)),
    statRow('Cargo', Number(s.cargo_tons) ? `${s.cargo_tons} tons` : ''),
    statRow('Air Envelope', Number(s.air_bubble_ft) ? `${s.air_bubble_ft} ft. beyond hull` : ''),
    statRow('Decks', decks.length ? `${decks.length}` : ''),
  ].join('');

  // The deck plans, drawn to ONE scale — the same relationship they have on the
  // assembled ship. A deck is sized in squares and its art is stretched to fill
  // that box (exactly what the map renderer does), so millimetres-per-square is
  // the only number needed, and it's shared by every deck. Stretching each deck
  // to the card width instead would print a 4-square crow's nest the same size
  // as a 20-square main deck.
  //
  // Decks print LANDSCAPE: the hull's length runs across the page rather than
  // down it. A ship is long and narrow, so turning it broadside is what buys
  // the plan real size — a 20-square deck gets the page's wide axis instead of
  // being squeezed into a 100mm-wide column.
  //
  // The art is rotated 90° rather than the page being re-laid-out: each plan
  // keeps the orientation it was drawn in, and the reader turns the sheet.
  //
  // Placement along the page uses offset_row — after the quarter turn the
  // ship's row axis (its length) is the horizontal one, and that offset is what
  // aligns the decks against each other on the hull.
  const deckGeom = decks.map((d) => ({
    deck: d,
    cols: Math.max(0, Number(d.grid_cols) || 0),
    rows: Math.max(0, Number(d.grid_rows) || 0),
    off: Number(d.offset_row) || 0,
  })).filter((g) => g.cols > 0 && g.rows > 0);

  let deckList = '';
  if (deckGeom.length) {
    // Rotated, so the hull's LENGTH spans the page width.
    const minOff = Math.min(...deckGeom.map((g) => g.off));
    const maxEdge = Math.max(...deckGeom.map((g) => g.off + g.rows));
    const spanLength = Math.max(1, maxEdge - minOff);
    const widestBeam = Math.max(...deckGeom.map((g) => g.cols));

    // A landscape sheet's printable width, and a height ceiling so a wide-beamed
    // deck still fits on one. Whichever bites first sets the scale for ALL
    // decks — that shared number is the whole point.
    const CONTENT_MM = 265;  // A4 landscape less the page margins
    const MAX_DECK_MM = 150; // keeps the beamiest deck inside one page
    const mmPerSquare = Math.min(CONTENT_MM / spanLength, MAX_DECK_MM / widestBeam);
    const ftPerSquare = FT_PER_SQUARE;

    deckList = `<div class="section decks-section">
         <h2>Decks</h2>
         <p class="scalenote">All decks to the same scale — 1 square = ${ftPerSquare} ft. Bow to the left.</p>
         ${deckGeom.map(({ deck: d, cols, rows: rowsN, off }) => {
           // Unrotated art box…
           const wMm = (cols * mmPerSquare).toFixed(2);
           const hMm = (rowsN * mmPerSquare).toFixed(2);
           // …and the space it occupies once turned a quarter turn, which is
           // that box with its sides swapped.
           const boxWMm = (rowsN * mmPerSquare).toFixed(2);
           const boxHMm = (cols * mmPerSquare).toFixed(2);
           const indentMm = ((off - minOff) * mmPerSquare).toFixed(2);
           const size = `<span class="dim">${cols * ftPerSquare} × ${rowsN * ftPerSquare} ft.</span>`;
           const tags = [
             d.is_main ? 'main deck' : '',
             d.helm && d.helm.col != null ? 'helm' : '',
           ].filter(Boolean).join(', ');
           // rotate(90deg) about the top-left corner swings the art up out of
           // the box, so it's pushed back down by its own height first.
           const art = d.image_path
             ? `<img class="deckart" style="width:${wMm}mm;height:${hMm}mm;transform:translateX(${boxWMm}mm) rotate(90deg);" src="/uploads/${esc(d.image_path)}" alt="${esc(d.name || 'Deck')}">`
             : `<div class="deckart noart" style="width:${boxWMm}mm;height:${boxHMm}mm;">No deck art</div>`;
           return `
             <figure class="deck">
               <figcaption>
                 <span class="dname">${esc(d.name || `Deck ${d.deck_index}`)}</span>
                 ${size}
                 ${tags ? `<span class="tag">(${esc(tags)})</span>` : ''}
               </figcaption>
               <div class="deckbox" style="width:${boxWMm}mm;height:${boxHMm}mm;margin-left:${indentMm}mm;">${art}</div>
             </figure>`;
         }).join('')}
       </div>`;
  }

  const weaponSection = weapons.length
    ? `<div class="section">
         <h2>Weapons</h2>
         ${weapons.map(weaponBlock).join('')}
       </div>`
    : '';

  const notes = s.notes
    ? `<div class="section"><h2>Notes</h2><p class="notes">${escMultiline(s.notes)}</p></div>`
    : '';

  // Deck count also carries a stat row now, so the subtitle is just the class.
  const subtitle = s.ship_class || '';

  return `
    <div class="card">
      <h1>${esc(s.name || 'Unnamed Ship')}</h1>
      ${subtitle ? `<div class="subtitle">${esc(subtitle)}</div>` : ''}
      <div class="rule"></div>
      <div class="stats">${rows}</div>
      ${deckList}
      ${weaponSection}
      ${notes}
    </div>`;
}

// Print-first styling: black on white, serif, and sized to a card rather than
// a page. Colour is limited to a couple of muted rules so a mono printer keeps
// every separator visible.
const CARD_CSS = `
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 16px;
    background: #f4f1ea;
    font: 12px/1.45 "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif;
    color: #1a1614;
  }
  .card {
    width: 100mm; margin: 0 auto; padding: 8mm 7mm;
    background: #fffdf7;
    border: 1.5px solid #c9bda6;
  }
  h1 { margin: 0; font-size: 19px; letter-spacing: .01em; }
  .subtitle { font-style: italic; color: #6a5f52; margin-top: 2px; font-size: 11.5px; }
  .rule { height: 2px; background: #8a2b2b; margin: 7px 0 9px; }
  .stats { margin-bottom: 10px; }
  .stat { display: flex; gap: 6px; align-items: baseline; padding: 1.5px 0; }
  .stat .k { font-variant: small-caps; letter-spacing: .04em; color: #6a5f52; min-width: 42mm; }
  .stat .v { font-weight: 600; }
  .stat.empty .v { font-weight: 400; color: #9a9086; }
  .section { margin-top: 10px; page-break-inside: auto; }
  .section h2 {
    margin: 0 0 5px; font-size: 12.5px; font-variant: small-caps; letter-spacing: .06em;
    color: #8a2b2b; border-bottom: 1px solid #d8cfbe; padding-bottom: 2px;
  }
  .deck { margin: 0 0 8px; page-break-inside: avoid; break-inside: avoid; }
  .deck figcaption { margin-bottom: 3px; display: flex; gap: 5px; align-items: baseline; flex-wrap: wrap; }
  .dname { font-weight: 700; }
  /* The turned plan sits in a box whose sides are the art's, swapped. */
  .deckbox { position: relative; overflow: hidden; }
  /* Size comes from the inline style — one shared mm-per-square across every
     deck. object-fit: fill because a deck's art is stretched to its square box
     on the map too, so the printed plan matches what's on the table. */
  .deckart {
    display: block; object-fit: fill;
    transform-origin: top left;
    border: 1px solid #d8cfbe; background: #fff;
  }
  /* Decks break out of the card's 100mm column — landscape plans need the full
     width of the sheet, and the stat block above them doesn't. */
  .decks-section { width: 265mm; max-width: 265mm; }
  .scalenote { margin: 0 0 6px; font-size: 10.5px; color: #6a5f52; font-style: italic; }
  .noart {
    font-style: italic; color: #9a9086; font-size: 10px;
    display: flex; align-items: center; justify-content: center; text-align: center;
  }
  .dim, .tag { color: #6a5f52; font-size: 11px; }
  .weapon { margin-bottom: 8px; page-break-inside: avoid; }
  .wname { font-weight: 700; }
  .qty { font-weight: 400; color: #6a5f52; }
  .pills { margin: 2px 0 3px; }
  .pill {
    display: inline-block; margin: 0 4px 3px 0; padding: 1px 5px;
    border: 1px solid #d8cfbe; border-radius: 9px; font-size: 10.5px; color: #4a4038;
  }
  .wnotes, .action, .notes { margin: 2px 0; }
  .action em { font-style: italic; }
  /* Landscape, because the deck plans are the reason this gets printed and a
     hull is longer than it is wide. The stat block is happy either way. */
  @page { size: A4 landscape; margin: 10mm; }
  @media print {
    body { background: #fff; padding: 0; }
    .card { border: none; width: auto; padding: 0; }
    .decks-section { width: 265mm; }
    /* Deck plans are the point of the print — don't let a printer drop their
       tones the way it drops decorative backgrounds. */
    .deckart { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
`;

// Open the card in its own window and raise the print dialog.
// Returns false when the browser blocked the popup, so the caller can say so.
export function printShipCard(ship) {
  const win = window.open('', '_blank', 'width=520,height=760');
  if (!win) return false;
  const title = (ship?.name || 'Ship').replace(/[<>]/g, '');
  win.document.write(`<!doctype html>
<html><head><meta charset="utf-8"><title>${esc(title)} — ship card</title>
<style>${CARD_CSS}</style></head>
<body>${shipCardHtml(ship)}
<script>window.onload = function () { window.focus(); window.print(); };<\/script>
</body></html>`);
  win.document.close();
  return true;
}
