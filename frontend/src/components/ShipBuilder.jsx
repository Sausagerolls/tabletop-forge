import React, { useEffect, useState, useCallback } from 'react';
import { printShipCard } from '../utils/shipCard.js';

// Ship builder — create a ship class, stack its decks, and place it on the map.
//
// A ship class lives in the library and is reusable; placing one drops an
// instance onto the current map. Decks are sized in SQUARES rather than pixels,
// which is what makes a deck adopt the host map's 5ft scale no matter how large
// the uploaded art happens to be.

const BLANK_STATS = {
  name: '', ship_class: '', armor_class: 15, armor_type: '', hull_hp: 300,
  damage_threshold: 0, speed: 0, maneuverability: '', crew_min: 0, crew_max: 0,
  cargo_tons: 0, notes: '', air_bubble_ft: 0,
  weapons: [],
};

// A ship's weapon emplacement. Quantity/AC/HP are numbers because they're
// rolled against; costs stay text so "500 gp" and "1 gp per bolt" both fit,
// which is how the sourcebooks write them.
const BLANK_WEAPON = {
  name: '', quantity: 1, ac: 15, hp: 50, cost: '', ammo_cost: '',
  notes: '', actions: [],
};

// Weapon rows come back from JSONB in whatever shape they were saved in —
// including from a ship saved before a field existed. Fill the gaps so the
// inputs stay controlled.
function normalizeWeapon(w) {
  const src = w && typeof w === 'object' ? w : {};
  return {
    ...BLANK_WEAPON,
    ...src,
    actions: Array.isArray(src.actions)
      ? src.actions.map(a => ({ name: a?.name || '', text: a?.text || '' }))
      : [],
  };
}

// Feet per grid square — matches FEET_PER_SQUARE in MapStage.
const FT_PER_SQUARE = 5;

const TRANSITION_KINDS = [
  { id: 'stairs', label: 'Stairs' },
  { id: 'ladder', label: 'Ladder' },
  { id: 'hatch',  label: 'Hatch'  },
];

// A deck rendered at a size that fits the panel, with its square grid drawn
// over the art and every square clickable. This is the click-to-place surface:
// the grid here is the same grid the deck uses in play, so what you click is
// literally the square the stairs will occupy.
// One marker's rectangle, in deck squares.
//
// Markers used to be a single square identified by its integer corner. They are
// now drawn freehand, so they carry a fractional origin and a size — a helm can
// sit half a square off the centreline and a stairwell can be two squares by
// one. Anything stored before this has no w/h and is read as the 1x1 square it
// was, so old ships keep working untouched.
export function markerRect(m) {
  return {
    col: Number(m?.col) || 0,
    row: Number(m?.row) || 0,
    w: Number(m?.w) > 0 ? Number(m.w) : 1,
    h: Number(m?.h) > 0 ? Number(m.h) : 1,
  };
}

function DeckCanvas({ deck, markers = [], pending, helm = null, onPickSquare, label }) {
  const cols = Math.max(1, Number(deck.grid_cols));
  const rows = Math.max(1, Number(deck.grid_rows));
  // Fit the deck into a fixed box while keeping its aspect ratio, so a long
  // thin hull and a squat one both stay readable.
  const MAX_W = 300, MAX_H = 260;
  const cell = Math.max(6, Math.min(MAX_W / cols, MAX_H / rows));
  const w = cell * cols, h = cell * rows;

  // Drag out a rectangle, unsnapped.
  //
  // A click used to place exactly one grid square, which is wrong for both
  // things this marks: a helm is a fitting that rarely lines up with the
  // lattice, and a stairwell is often two squares by one. Coordinates stay in
  // SQUARES — that is the deck's own unit and what every consumer expects — but
  // they are fractional now rather than whole.
  const [draw, setDraw] = useState(null);   // { c0, r0, c1, r1 } while dragging

  const at = (e, el) => {
    const rect = el.getBoundingClientRect();
    return {
      c: Math.max(0, Math.min(cols, (e.clientX - rect.left) / cell)),
      r: Math.max(0, Math.min(rows, (e.clientY - rect.top) / cell)),
    };
  };

  function down(e) {
    if (!onPickSquare) return;
    e.preventDefault();
    const { c, r } = at(e, e.currentTarget);
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setDraw({ c0: c, r0: r, c1: c, r1: r });
  }
  function move(e) {
    if (!draw) return;
    const { c, r } = at(e, e.currentTarget);
    setDraw((d) => (d ? { ...d, c1: c, r1: r } : d));
  }
  function up(e) {
    if (!draw || !onPickSquare) { setDraw(null); return; }
    const { c0, r0, c1, r1 } = draw;
    setDraw(null);
    const col = Math.min(c0, c1), row = Math.min(r0, r1);
    let w = Math.abs(c1 - c0), h = Math.abs(r1 - r0);
    // A tap, not a drag: fall back to the single square under the pointer, so
    // the quick way to mark one square still works.
    if (w < 0.12 || h < 0.12) {
      onPickSquare(Math.floor(c0), Math.floor(r0), 1, 1);
      return;
    }
    onPickSquare(Math.round(col * 100) / 100, Math.round(row * 100) / 100,
                 Math.round(w * 100) / 100, Math.round(h * 100) / 100);
  }

  return (
    <div className="shrink-0">
      <div className="text-[11px] text-gray-400 mb-1">{label}</div>
      <div
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={() => setDraw(null)}
        style={{ width: w, height: h, touchAction: 'none' }}
        className={`relative border border-gray-600 rounded overflow-hidden select-none ${onPickSquare ? 'cursor-crosshair' : ''}`}
      >
        <img
          src={`/uploads/${deck.image_path}`} alt=""
          style={{ width: w, height: h }}
          className="absolute inset-0 object-fill select-none pointer-events-none"
          draggable={false}
        />
        <svg width={w} height={h} className="absolute inset-0 pointer-events-none">
          {Array.from({ length: cols + 1 }, (_, c) => (
            <line key={`v${c}`} x1={c * cell} y1={0} x2={c * cell} y2={h}
              stroke="rgba(255,255,255,0.22)" strokeWidth="1" />
          ))}
          {Array.from({ length: rows + 1 }, (_, r) => (
            <line key={`h${r}`} x1={0} y1={r * cell} x2={w} y2={r * cell}
              stroke="rgba(255,255,255,0.22)" strokeWidth="1" />
          ))}
          {markers.map((m, i) => {
            const r = markerRect(m);
            return (
              <rect key={i} x={r.col * cell} y={r.row * cell} width={r.w * cell} height={r.h * cell}
                fill="rgba(250,204,21,0.35)" stroke="#facc15" strokeWidth="2" rx="2" />
            );
          })}
          {/* The rectangle being dragged out right now. */}
          {draw && (
            <rect
              x={Math.min(draw.c0, draw.c1) * cell}
              y={Math.min(draw.r0, draw.r1) * cell}
              width={Math.abs(draw.c1 - draw.c0) * cell}
              height={Math.abs(draw.r1 - draw.r0) * cell}
              fill="rgba(56,189,248,0.25)" stroke="#38bdf8" strokeWidth="2" rx="2"
            />
          )}
          {pending && (() => {
            const r = markerRect(pending);
            return (
              <rect x={r.col * cell} y={r.row * cell} width={r.w * cell} height={r.h * cell}
                fill="rgba(56,189,248,0.4)" stroke="#38bdf8" strokeWidth="2" rx="2" />
            );
          })()}
          {/* Helm. Violet rather than the stairs' amber, because the two sit on
              the same art and mean very different things. */}
          {helm && helm.col != null && (
            <>
              <rect x={markerRect(helm).col * cell} y={markerRect(helm).row * cell}
                width={markerRect(helm).w * cell} height={markerRect(helm).h * cell}
                fill="rgba(167,139,250,0.38)" stroke="#a78bfa" strokeWidth="2" rx="2" />
              <text
                x={(markerRect(helm).col + markerRect(helm).w / 2) * cell}
                y={(markerRect(helm).row + markerRect(helm).h / 2) * cell}
                textAnchor="middle" dominantBaseline="central"
                fontSize={Math.max(8, cell * 0.6)} fill="#ede9fe"
              >⎈</text>
            </>
          )}
        </svg>
      </div>
      <div className="text-[10px] text-gray-500 mt-0.5">
        {cols}×{rows} sq · {cols * 5}×{rows * 5} ft
      </div>
    </div>
  );
}

// Deck alignment. The reference deck (index 0) is drawn as a ghost underneath
// and never moves; the deck being aligned is dragged over it until the hulls
// line up. Everything is in the ship's own square grid, so what you line up
// here is exactly how the decks sit on the map.
//
// Offsets snap to half a square: whole squares keep the two grids in step, and
// the half step is what lets an odd-width deck sit centred on an even-width one.
const ALIGN_SNAP = 0.5;

function DeckAligner({ belowDeck, deck, offset, onChange, busy }) {
  const [drag, setDrag] = useState(null);
  // The offset shown and edited here is RELATIVE to the deck below, which the
  // caller converts to/from the absolute offset that gets stored. Reading it
  // off `deck` directly (as this used to) only worked while every deck was
  // measured against one fixed reference.
  const offCol = Number(offset?.col || 0);
  const offRow = Number(offset?.row || 0);

  // Size the canvas around the union of both decks plus a margin, so a deck
  // nudged well off the reference is still fully visible while you drag it.
  const margin = 2;
  const minCol = Math.min(0, offCol) - margin;
  const minRow = Math.min(0, offRow) - margin;
  const maxCol = Math.max(Number(belowDeck.grid_cols), offCol + Number(deck.grid_cols)) + margin;
  const maxRow = Math.max(Number(belowDeck.grid_rows), offRow + Number(deck.grid_rows)) + margin;
  const spanC = maxCol - minCol, spanR = maxRow - minRow;
  const cell = Math.max(6, Math.min(340 / spanC, 300 / spanR));
  const W = spanC * cell, H = spanR * cell;

  const toPx = (col, row) => ({ x: (col - minCol) * cell, y: (row - minRow) * cell });
  const refPos = toPx(0, 0);
  const curOff = drag ? drag.preview : { col: offCol, row: offRow };
  const deckPos = toPx(curOff.col, curOff.row);

  function onDown(e) {
    if (busy) return;
    e.preventDefault();
    setDrag({
      startX: e.clientX, startY: e.clientY,
      base: { col: offCol, row: offRow },
      preview: { col: offCol, row: offRow },
    });
  }

  useEffect(() => {
    if (!drag) return;
    const snap = (v) => Math.round(v / ALIGN_SNAP) * ALIGN_SNAP;
    function move(e) {
      setDrag((d) => d && ({
        ...d,
        preview: {
          col: snap(d.base.col + (e.clientX - d.startX) / cell),
          row: snap(d.base.row + (e.clientY - d.startY) / cell),
        },
      }));
    }
    function up() {
      setDrag((d) => {
        if (d && (d.preview.col !== d.base.col || d.preview.row !== d.base.row)) {
          onChange(d.preview.col, d.preview.row);
        }
        return null;
      });
    }
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
  }, [drag, cell, onChange]);

  const gridLines = [];
  for (let c = 0; c <= Math.ceil(spanC); c++) {
    gridLines.push(<line key={`v${c}`} x1={c * cell} y1={0} x2={c * cell} y2={H} stroke="rgba(255,255,255,0.10)" strokeWidth="1" />);
  }
  for (let r = 0; r <= Math.ceil(spanR); r++) {
    gridLines.push(<line key={`h${r}`} x1={0} y1={r * cell} x2={W} y2={r * cell} stroke="rgba(255,255,255,0.10)" strokeWidth="1" />);
  }

  return (
    <div>
      <div style={{ width: W, height: H }} className="relative border border-gray-600 rounded overflow-hidden bg-gray-950">
        {/* The deck immediately below — ghosted, the datum for this one. */}
        <img
          src={`/uploads/${belowDeck.image_path}`} alt="" draggable={false}
          style={{
            position: 'absolute', left: refPos.x, top: refPos.y,
            width: Number(belowDeck.grid_cols) * cell, height: Number(belowDeck.grid_rows) * cell,
            opacity: 0.45,
          }}
          className="pointer-events-none select-none"
        />
        {/* The deck being aligned — draggable. */}
        <img
          src={`/uploads/${deck.image_path}`} alt="" draggable={false}
          onMouseDown={onDown}
          style={{
            position: 'absolute', left: deckPos.x, top: deckPos.y,
            width: Number(deck.grid_cols) * cell, height: Number(deck.grid_rows) * cell,
            cursor: busy ? 'progress' : 'grab',
            outline: '2px solid #38bdf8',
          }}
          className="select-none"
        />
        <svg width={W} height={H} className="absolute inset-0 pointer-events-none">{gridLines}</svg>
      </div>
      <div className="text-[11px] text-gray-400 mt-1">
        Offset {curOff.col} , {curOff.row} squares
        <button
          onClick={() => onChange(0, 0)} disabled={busy}
          className="ml-2 px-1.5 py-0.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-200"
        >Reset</button>
      </div>
    </div>
  );
}

function NumField({ label, value, onChange, min = 0, step = 1 }) {
  return (
    <label className="flex-1 min-w-[80px]">
      <span className="block text-[11px] text-gray-400 mb-0.5">{label}</span>
      <input
        type="number" min={min} step={step} value={value}
        onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
        className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm"
      />
    </label>
  );
}

// A ship name from what its level filenames have in common.
//
// "Orca - 1 Hold" and "Orca - 2 Main Deck" share "Orca". Files that share
// nothing — Main, stern, sails — give nothing, and the caller asks the GM
// rather than naming the ship after whichever level happened to be first.
function suggestShipName(files) {
  const names = files.map((f) => f.name.replace(/\.(dd2vtt|json|uvtt)$/i, ''));
  if (!names.length) return '';
  if (names.length === 1) return names[0].includes(' - ') ? names[0].slice(0, names[0].indexOf(' - ')).trim() : '';
  let prefix = names[0];
  for (const n of names.slice(1)) {
    let i = 0;
    while (i < prefix.length && i < n.length && prefix[i].toLowerCase() === n[i].toLowerCase()) i++;
    prefix = prefix.slice(0, i);
  }
  // Trim any trailing separator or level numbering the prefix ran into.
  return prefix.replace(/[\s\-_.0-9]+$/, '').trim();
}

export default function ShipBuilder({ open, onClose, socket, sessionId, mapId }) {
  const [library, setLibrary] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [stats, setStats] = useState(BLANK_STATS);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // New-deck form. Kept separate from the saved decks so a half-filled form
  // can't corrupt an existing level.
  const [deckName, setDeckName] = useState('');
  const [deckCols, setDeckCols] = useState(4);
  const [deckRows, setDeckRows] = useState(8);

  // Click-to-place stairs. `pendingFrom` holds the first click — the square the
  // stairwell occupies — until the second click says where it comes out.
  const [fromDeckIdx, setFromDeckIdx] = useState(0);
  const [toDeckIdx, setToDeckIdx] = useState(1);
  const [trKind, setTrKind] = useState('stairs');
  const [pendingFrom, setPendingFrom] = useState(null);
  // Which deck the helm-placing canvas is showing. A ship has one helm, but
  // which level it sits on is up to the hull — bridge up top, engine-room helm
  // below decks.
  const [helmDeckIdx, setHelmDeckIdx] = useState(0);

  // Which deck the aligner is nudging. The reference deck can't be aligned
  // against itself — it *is* the datum.
  const [alignDeckIdx, setAlignDeckIdx] = useState(1);
  // What the last Dungeondraft import produced, shown under the button.
  // Declared up here with the other hooks: there is an early return further
  // down (`if (!open) return null`), and a hook below it would run on some
  // renders and not others.
  const [importReport, setImportReport] = useState(null);
  // What to call the imported ship. Typed by the GM, because the filenames
  // rarely say: a set called Main / stern / sails named the whole ship "Main".
  const [importName, setImportName] = useState('');

  const selected = library.find((s) => s.id === selectedId) || null;
  const fromDeck = (selected?.decks || []).find(d => d.deck_index === fromDeckIdx) || null;
  const toDeck = (selected?.decks || []).find(d => d.deck_index === toDeckIdx) || null;
  const helmDeck = (selected?.decks || []).find(d => d.deck_index === helmDeckIdx) || null;
  // Wherever the helm actually is, which may not be the deck on screen.
  const helmShipDeck = (selected?.decks || []).find(d => d.helm && d.helm.col != null) || null;
  // Must match referenceDeck() in utils/ships.js — lowest deck_index wins.
  const refDeck = (selected?.decks || []).find(d => d.deck_index === 0)
    || (selected?.decks || []).slice().sort((a, b) => a.deck_index - b.deck_index)[0]
    || null;
  const alignDeck = (selected?.decks || []).find(d => d.deck_index === alignDeckIdx) || null;
  // Decks are positioned against the level directly BELOW them, not against one
  // fixed reference deck. The bottom deck is the datum and has nothing to align
  // to — everything else chains upward from it.
  //
  // Storage stays ABSOLUTE (offset from the ship's anchor), because the
  // renderer, the rotation pivot and the server's deck maths all read it that
  // way; only this editor works in relative terms, converting on read and write.
  const decksAsc = (selected?.decks || []).slice().sort((a, b) => a.deck_index - b.deck_index);
  const belowDeck = alignDeck
    ? decksAsc.filter(d => d.deck_index < alignDeck.deck_index).slice(-1)[0] || null
    : null;
  const alignRelOffset = alignDeck && belowDeck
    ? {
        col: Number(alignDeck.offset_col || 0) - Number(belowDeck.offset_col || 0),
        row: Number(alignDeck.offset_row || 0) - Number(belowDeck.offset_row || 0),
      }
    : { col: 0, row: 0 };
  // Suggested envelope: the ship's single longest dimension, in feet. A
  // Spelljammer's air reaches out about as far as the ship is long.
  const autoBubbleFt = Math.round(
    Math.max(0, ...(selected?.decks || []).flatMap(d => [Number(d.grid_cols) || 0, Number(d.grid_rows) || 0]))
  ) * FT_PER_SQUARE;

  // Reload the library AND push the change out to the map.
  //
  // Placed ships hold a snapshot of their library row and decks, so editing a
  // class here — air envelope, stats, deck art, alignment — would otherwise
  // leave the table looking at stale values until someone reloaded the page.
  const loadLibrary = useCallback(async () => {
    try {
      const res = await fetch('/api/ships/library');
      const data = await res.json();
      if (Array.isArray(data)) setLibrary(data);
      if (mapId != null) socket?.emit('refresh_ships', { mapId });
    } catch (err) {
      setError('Could not load ship library: ' + err.message);
    }
  }, [socket, mapId]);

  useEffect(() => { if (open) loadLibrary(); }, [open, loadLibrary]);

  // Pull the selected ship's stats into the form whenever the selection moves.
  useEffect(() => {
    if (!selected) { setStats(BLANK_STATS); return; }
    setStats({
      name: selected.name || '', ship_class: selected.ship_class || '',
      armor_class: selected.armor_class ?? 15, armor_type: selected.armor_type || '',
      hull_hp: selected.hull_hp ?? 300,
      damage_threshold: selected.damage_threshold ?? 0, speed: selected.speed ?? 0,
      maneuverability: selected.maneuverability || '',
      crew_min: selected.crew_min ?? 0, crew_max: selected.crew_max ?? 0,
      cargo_tons: selected.cargo_tons ?? 0, notes: selected.notes || '',
      air_bubble_ft: selected.air_bubble_ft ?? 0,
      weapons: Array.isArray(selected.weapons) ? selected.weapons.map(normalizeWeapon) : [],
    });
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the stairs deck pickers pointing at decks that actually exist —
  // deleting or reordering a deck otherwise leaves them selecting nothing.
  useEffect(() => {
    const idxs = (selected?.decks || []).map(d => d.deck_index);
    if (!idxs.length) return;
    setPendingFrom(null);
    setFromDeckIdx(prev => (idxs.includes(prev) ? prev : idxs[0]));
    setToDeckIdx(prev => (idxs.includes(prev) ? prev : (idxs[1] ?? idxs[0])));
    // The aligner must never point at the reference deck — it's the datum.
    // Everything except the lowest deck, which is the datum.
    const lowest = Math.min(...idxs);
    const alignable = idxs.filter(i => i !== lowest);
    setAlignDeckIdx(prev => (alignable.includes(prev) ? prev : (alignable[0] ?? prev)));
  }, [selected?.decks]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null;

  async function createShip() {
    setBusy(true); setError('');
    try {
      const res = await fetch('/api/ships/library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...BLANK_STATS, name: 'New Ship' }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      await loadLibrary();
      setSelectedId(data.id);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  // Import a whole ship from Dungeondraft — one .dd2vtt per level.
  //
  // Dungeondraft exports a multi-level build as one file per level, each
  // carrying that level's art, its walls (line_of_sight) and its doors
  // (portals). They go up together and come back as one class with a deck per
  // file. Order and names come from the filenames: "Orca - 2 Main Deck.dd2vtt"
  // is level 2, called "Main Deck".
  async function importDd2vtt(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) {
      setError('No files were selected — pick one .dd2vtt per level of the ship.');
      return;
    }
    // A wrong extension is silently dropped by the server's filter, which would
    // look like the import doing nothing. Catch it here where the names are known.
    const bad = files.filter((f) => !/\.(dd2vtt|uvtt|json)$/i.test(f.name));
    if (bad.length) {
      setError(`Not a Dungeondraft export: ${bad.map((f) => f.name).join(', ')}`);
      return;
    }
    setBusy(true); setError(''); setImportReport(null);
    try {
      const fd = new FormData();
      // What the GM typed wins. Otherwise fall back to what the filenames share
      // — "Orca - 1 Hold" and "Orca - 2 Main Deck" give "Orca" — and only then
      // to the first filename, which is how a set named Main / stern / sails
      // ended up calling the whole ship "Main".
      fd.append('name', (importName.trim() || suggestShipName(files) || 'Imported Ship'));
      for (const f of files) fd.append('files', f);
      const res = await fetch('/api/ships/import-dd2vtt', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      await loadLibrary();
      setSelectedId(data.id);
      setImportReport(data.imported || []);
      setImportName('');
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  async function saveStats() {
    if (!selected) return;
    setBusy(true); setError('');
    try {
      const res = await fetch(`/api/ships/library/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stats),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      await loadLibrary();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  // Print a stat card. For the ship being edited the card is built from the
  // FORM rather than the saved row, so a card printed mid-edit shows what's on
  // screen; every other row has no unsaved state to honour.
  function printCard(ship) {
    if (!ship) return;
    const src = ship.id === selectedId ? { ...ship, ...stats } : ship;
    if (!printShipCard(src)) {
      setError('The card window was blocked — allow pop-ups for this site to print ship cards.');
    }
  }

  // Weapons are part of the stats form, not their own endpoint — they ride
  // along in the same PATCH, so every edit here is uncommitted until
  // "Save stats" is pressed, same as the fields above them.
  function addWeapon() {
    setStats(s => ({ ...s, weapons: [...(s.weapons || []), { ...BLANK_WEAPON }] }));
  }
  function patchWeapon(idx, patch) {
    setStats(s => ({
      ...s,
      weapons: (s.weapons || []).map((w, i) => (i === idx ? { ...w, ...patch } : w)),
    }));
  }
  function removeWeapon(idx) {
    setStats(s => ({ ...s, weapons: (s.weapons || []).filter((_, i) => i !== idx) }));
  }
  function addWeaponAction(idx) {
    patchWeapon(idx, {
      actions: [...((stats.weapons || [])[idx]?.actions || []), { name: '', text: '' }],
    });
  }
  function patchWeaponAction(wIdx, aIdx, patch) {
    const actions = ((stats.weapons || [])[wIdx]?.actions || [])
      .map((a, i) => (i === aIdx ? { ...a, ...patch } : a));
    patchWeapon(wIdx, { actions });
  }
  function removeWeaponAction(wIdx, aIdx) {
    patchWeapon(wIdx, {
      actions: ((stats.weapons || [])[wIdx]?.actions || []).filter((_, i) => i !== aIdx),
    });
  }

  async function deleteShip() {
    if (!selected) return;
    if (!window.confirm(`Delete "${selected.name}" and all its decks? Ships already placed on a map will keep their position but lose their deck art.`)) return;
    setBusy(true); setError('');
    try {
      await fetch(`/api/ships/library/${selected.id}`, { method: 'DELETE' });
      setSelectedId(null);
      await loadLibrary();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  async function addDeck(file) {
    if (!selected || !file) return;
    setBusy(true); setError('');
    try {
      const fd = new FormData();
      fd.append('image', file);
      fd.append('name', deckName || `Deck ${(selected.decks?.length || 0) + 1}`);
      fd.append('grid_cols', deckCols);
      fd.append('grid_rows', deckRows);
      const res = await fetch(`/api/ships/library/${selected.id}/decks`, { method: 'POST', body: fd });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setDeckName('');
      await loadLibrary();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  async function patchDeck(deckId, patch) {
    setBusy(true); setError('');
    try {
      const res = await fetch(`/api/ships/decks/${deckId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      await loadLibrary();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  // Reorder a deck by one place. The swap and the renumber both happen on the
  // server in one request — the client used to patch this deck's own index by
  // ±1, which left the deck it displaced sitting on the same number and put
  // holes in the run.
  async function moveDeck(deckId, dir) {
    setBusy(true); setError('');
    try {
      const res = await fetch(`/api/ships/decks/${deckId}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dir }),
      });
      const data = await res.json();
      if (data && data.error) throw new Error(data.error);
      await loadLibrary();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  // Place a stairwell and its return leg in one go. Stairs are two-way in the
  // fiction, and a one-way link would strand anyone who went below — so the
  // matching transition on the destination deck is created automatically,
  // unless that square already has one.
  async function addStairPair(from, to, fromSq, toSq, kind) {
    setBusy(true); setError('');
    try {
      const forward = [...(from.transitions || []), {
        kind, col: fromSq.col, row: fromSq.row, w: fromSq.w ?? 1, h: fromSq.h ?? 1,
        to_deck: to.deck_index, to_col: toSq.col, to_row: toSq.row,
      }];
      await fetch(`/api/ships/decks/${from.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transitions: forward }),
      });

      // Does a return leg to THIS deck and square already exist?
      //
      // This used to ask only whether the destination square carried any
      // transition at all, which is not the same question. Land a second
      // stairwell on a square that already leads somewhere else and the return
      // leg was silently skipped: the link became one-way, and anyone taking
      // it arrived standing on a square whose stairs went to a third deck —
      // or, from their point of view, on no stairs at all.
      const hasReturn = (to.transitions || []).some(
        (t) => Number(t.col) === toSq.col
          && Number(t.row) === toSq.row
          && Number(t.to_deck) === from.deck_index
          && Number(t.to_col) === fromSq.col
          && Number(t.to_row) === fromSq.row
      );
      // An unrelated transition already occupying the destination square is a
      // genuine conflict, not something to paper over — say so rather than
      // leaving a one-way stair behind.
      const occupied = (to.transitions || []).some(
        (t) => Number(t.col) === toSq.col && Number(t.row) === toSq.row
      );
      if (occupied && !hasReturn) {
        setError(
          `${to.name || 'That deck'} already has a stairwell on square ` +
          `(${toSq.col}, ${toSq.row}) leading somewhere else. Move one of them, ` +
          `or delete the existing link first — otherwise these stairs would only ` +
          `work in one direction.`
        );
        return;
      }
      if (!hasReturn && to.id !== from.id) {
        const back = [...(to.transitions || []), {
          kind, col: toSq.col, row: toSq.row, w: toSq.w ?? 1, h: toSq.h ?? 1,
          to_deck: from.deck_index, to_col: fromSq.col, to_row: fromSq.row,
        }];
        await fetch(`/api/ships/decks/${to.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transitions: back }),
        });
      }
      await loadLibrary();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  async function deleteDeck(deckId) {
    setBusy(true); setError('');
    try {
      await fetch(`/api/ships/decks/${deckId}`, { method: 'DELETE' });
      await loadLibrary();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  function placeOnMap() {
    if (!selected || !mapId) return;
    if (!selected.decks?.length) {
      setError('Add at least one deck before placing this ship.');
      return;
    }
    socket.emit('place_ship', {
      libraryId: selected.id, mapId, gridCol: 2, gridRow: 2, name: selected.name,
    });
    onClose?.();
  }

  // Listed top of the hull first, so the rows on screen read as the stack does:
  // the highest deck at the top, the main deck at the bottom. The API returns
  // them ascending by deck_index (bottom-up), which is the right storage order
  // and the wrong reading order.
  const decks = (selected?.decks || []).slice().sort((a, b) => b.deck_index - a.deck_index);

  return (
    <div className="fixed inset-0 z-[90] bg-black/70 flex items-center justify-center p-4"
         onMouseDown={onClose}>
      <div
        className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-4xl max-h-[88vh] overflow-hidden flex flex-col"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <h2 className="text-dnd-gold font-semibold">Ships</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">×</button>
        </div>

        {error && (
          <div className="mx-4 mt-3 px-3 py-2 rounded bg-red-900/40 border border-red-700 text-red-200 text-sm">
            {error}
          </div>
        )}

        <div className="flex-1 overflow-hidden flex">
          {/* Ship list */}
          <div className="w-52 border-r border-gray-700 overflow-y-auto p-2 space-y-1 shrink-0">
            <button
              onClick={createShip} disabled={busy}
              className="w-full px-2 py-1.5 rounded bg-dnd-gold/20 border border-dnd-gold/60 text-dnd-gold text-sm hover:bg-dnd-gold/30"
            >
              + New Ship
            </button>
            {/* Dungeondraft import. Multiple files on purpose: one per level. */}
            <input
              value={importName}
              onChange={(e) => setImportName(e.target.value)}
              placeholder="Ship name (optional)"
              className="w-full px-2 py-1 rounded bg-gray-900 border border-gray-700 text-xs text-gray-200 placeholder-gray-600"
            />
            <label
              className={`block w-full text-center px-2 py-1.5 rounded border text-xs cursor-pointer ${
                busy
                  ? 'bg-gray-900 border-gray-800 text-gray-600 cursor-not-allowed'
                  : 'bg-gray-900 border-gray-700 text-gray-300 hover:border-gray-500'
              }`}
              title="Select every level of the ship at once — one .dd2vtt per level"
            >
              {busy ? 'Working…' : 'Import Dungeondraft…'}
              <input
                type="file"
                accept=".dd2vtt,.uvtt,.json"
                multiple
                className="hidden"
                disabled={busy}
                onChange={(e) => {
                  // Copy the list BEFORE clearing the input.
                  //
                  // e.target.files is a live FileList bound to the element, so
                  // resetting the value empties the very list just captured —
                  // the handler then saw no files and returned silently, which
                  // is exactly "picking a file does nothing". The reset itself
                  // has to stay, or re-picking the same file fires no change.
                  const picked = Array.from(e.target.files || []);
                  e.target.value = '';
                  importDd2vtt(picked);
                }}
              />
            </label>
            {importReport && (
              <div className="rounded border border-emerald-800/60 bg-emerald-900/20 p-1.5 text-[10px] text-emerald-200 space-y-0.5">
                <div className="font-semibold">Imported {importReport.length} level{importReport.length === 1 ? '' : 's'}</div>
                {importReport.map((d) => (
                  <div key={d.deck_index} className="text-emerald-300/90">
                    {d.deck_index + 1}. {d.name} — {d.squares}, {d.walls} wall{d.walls === 1 ? '' : 's'}, {d.doors} door{d.doors === 1 ? '' : 's'}
                  </div>
                ))}
              </div>
            )}
            {library.map((s) => (
              // Row, not a button: the card button lives inside it, and a
              // button can't nest in a button.
              <div
                key={s.id}
                className={`flex items-stretch rounded text-sm border overflow-hidden ${
                  s.id === selectedId
                    ? 'bg-sky-900/40 border-sky-500 text-sky-100'
                    : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500'
                }`}
              >
                <button
                  onClick={() => setSelectedId(s.id)}
                  className="flex-1 min-w-0 text-left px-2 py-1.5"
                >
                  <div className="truncate">{s.name || 'Unnamed'}</div>
                  <div className="text-[11px] text-gray-500">
                    {(s.decks?.length || 0)} deck{(s.decks?.length || 0) === 1 ? '' : 's'}
                  </div>
                </button>
                <button
                  onClick={() => printCard(s)}
                  title={`Print a stat card for ${s.name || 'this ship'}`}
                  className="px-2 shrink-0 text-gray-400 hover:text-dnd-gold hover:bg-gray-700/60 border-l border-gray-700"
                >
                  🖨
                </button>
              </div>
            ))}
            {!library.length && (
              <p className="text-xs text-gray-500 px-1 py-2">No ships yet.</p>
            )}
          </div>

          {/* Editor */}
          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {!selected && <p className="text-sm text-gray-500">Select a ship, or create one.</p>}

            {selected && (
              <>
                <section>
                  <h3 className="text-sm font-semibold text-dnd-gold mb-2">Stats</h3>
                  <div className="flex gap-2 mb-2">
                    <label className="flex-1">
                      <span className="block text-[11px] text-gray-400 mb-0.5">Name</span>
                      <input
                        value={stats.name}
                        onChange={(e) => setStats(s => ({ ...s, name: e.target.value }))}
                        className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm"
                      />
                    </label>
                    <label className="flex-1">
                      <span className="block text-[11px] text-gray-400 mb-0.5">Class</span>
                      <input
                        value={stats.ship_class}
                        onChange={(e) => setStats(s => ({ ...s, ship_class: e.target.value }))}
                        placeholder="Hammerhead"
                        className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm"
                      />
                    </label>
                  </div>
                  <div className="flex gap-2 mb-2">
                    <NumField label="AC" value={stats.armor_class} onChange={(v) => setStats(s => ({ ...s, armor_class: v }))} />
                    <label className="flex-1 min-w-[110px]">
                      <span className="block text-[11px] text-gray-400 mb-0.5">Armour type</span>
                      <input
                        value={stats.armor_type}
                        onChange={(e) => setStats(s => ({ ...s, armor_type: e.target.value }))}
                        placeholder="Wooden hull"
                        className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm"
                      />
                    </label>
                    <NumField label="Hull HP" value={stats.hull_hp} onChange={(v) => setStats(s => ({ ...s, hull_hp: v }))} />
                    <NumField label="Dmg threshold" value={stats.damage_threshold} onChange={(v) => setStats(s => ({ ...s, damage_threshold: v }))} />
                    <NumField label="Speed (ft)" value={stats.speed} onChange={(v) => setStats(s => ({ ...s, speed: v }))} step={5} />
                  </div>
                  <p className="text-[11px] text-gray-500 mb-2">
                    Speed drives the movement counter shown while the ship is dragged.
                  </p>
                  <div className="flex gap-2 items-end mb-1">
                    <NumField
                      label="Air envelope (ft beyond hull)"
                      value={stats.air_bubble_ft}
                      onChange={(v) => setStats(s => ({ ...s, air_bubble_ft: v }))}
                      step={5}
                    />
                    <button
                      onClick={() => setStats(s => ({ ...s, air_bubble_ft: autoBubbleFt }))}
                      disabled={!autoBubbleFt}
                      className="px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs disabled:opacity-40"
                      title="Longest hull dimension across all decks"
                    >
                      Auto ({autoBubbleFt} ft)
                    </button>
                  </div>
                  <p className="text-[11px] text-gray-500 mb-2">
                    Drawn as an oval reaching this far past the hull, so it comes out
                    elongated on a long ship. Auto uses the longest dimension across all
                    decks. 0 hides it.
                  </p>
                  <div className="flex gap-2 mb-1">
                    <NumField label="Crew min" value={stats.crew_min} onChange={(v) => setStats(s => ({ ...s, crew_min: v }))} />
                    <NumField label="Crew max" value={stats.crew_max} onChange={(v) => setStats(s => ({ ...s, crew_max: v }))} />
                    <NumField label="Cargo (t)" value={stats.cargo_tons} onChange={(v) => setStats(s => ({ ...s, cargo_tons: v }))} step={0.5} />
                  </div>
                  <p className="text-[11px] text-gray-500 mb-2">
                    Crew complement is the min/max pair — minimum to sail her at all,
                    maximum she can carry. Cargo is in tons.
                  </p>
                  <label className="block mb-2">
                    <span className="block text-[11px] text-gray-400 mb-0.5">Notes</span>
                    <textarea
                      value={stats.notes} rows={2}
                      onChange={(e) => setStats(s => ({ ...s, notes: e.target.value }))}
                      className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm"
                    />
                  </label>
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-xs font-semibold text-dnd-gold uppercase tracking-wide">
                        Weapons ({(stats.weapons || []).length})
                      </h4>
                      <button onClick={addWeapon}
                        className="px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs">
                        + Add weapon
                      </button>
                    </div>
                    <p className="text-[11px] text-gray-500 mb-2">
                      Each emplacement is its own entry — a ship with two ballistae is
                      one entry with a quantity of 2. Costs are free text so
                      "500 gp" and "1 gp per bolt" both read right.
                    </p>

                    {!(stats.weapons || []).length && (
                      <p className="text-[11px] text-gray-600 italic">No weapons on board.</p>
                    )}

                    <div className="space-y-2">
                      {(stats.weapons || []).map((w, wi) => (
                        <div key={wi} className="bg-gray-800/60 border border-gray-700 rounded p-2">
                          <div className="flex gap-2 mb-2">
                            <label className="flex-[2] min-w-[120px]">
                              <span className="block text-[11px] text-gray-400 mb-0.5">Weapon</span>
                              <input
                                value={w.name}
                                onChange={(e) => patchWeapon(wi, { name: e.target.value })}
                                placeholder="Ballista"
                                className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1 text-sm"
                              />
                            </label>
                            <NumField label="Qty" value={w.quantity} min={0}
                              onChange={(v) => patchWeapon(wi, { quantity: v })} />
                            <NumField label="AC" value={w.ac} min={0}
                              onChange={(v) => patchWeapon(wi, { ac: v })} />
                            <NumField label="HP" value={w.hp} min={0}
                              onChange={(v) => patchWeapon(wi, { hp: v })} />
                            <button
                              onClick={() => removeWeapon(wi)}
                              title="Remove weapon"
                              className="self-end px-2 py-1 rounded bg-red-900/60 border border-red-700 text-red-200 text-xs hover:bg-red-900"
                            >
                              ✕
                            </button>
                          </div>
                          <div className="flex gap-2 mb-2">
                            <label className="flex-1 min-w-[90px]">
                              <span className="block text-[11px] text-gray-400 mb-0.5">Cost</span>
                              <input
                                value={w.cost}
                                onChange={(e) => patchWeapon(wi, { cost: e.target.value })}
                                placeholder="500 gp"
                                className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1 text-sm"
                              />
                            </label>
                            <label className="flex-1 min-w-[90px]">
                              <span className="block text-[11px] text-gray-400 mb-0.5">Ammo cost</span>
                              <input
                                value={w.ammo_cost}
                                onChange={(e) => patchWeapon(wi, { ammo_cost: e.target.value })}
                                placeholder="1 gp per bolt"
                                className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1 text-sm"
                              />
                            </label>
                          </div>
                          <label className="block mb-2">
                            <span className="block text-[11px] text-gray-400 mb-0.5">Notes</span>
                            <textarea
                              value={w.notes} rows={2}
                              onChange={(e) => patchWeapon(wi, { notes: e.target.value })}
                              placeholder="Mounted on the forward deck. Needs 1 crew to reload."
                              className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1 text-sm"
                            />
                          </label>

                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] text-gray-400">Actions</span>
                            <button onClick={() => addWeaponAction(wi)}
                              className="px-2 py-0.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-200 text-[11px]">
                              + Action
                            </button>
                          </div>
                          <div className="space-y-1">
                            {(w.actions || []).map((a, ai) => (
                              <div key={ai} className="flex gap-1 items-start">
                                <input
                                  value={a.name}
                                  onChange={(e) => patchWeaponAction(wi, ai, { name: e.target.value })}
                                  placeholder="Ballista Bolt"
                                  className="w-1/3 bg-gray-900 border border-gray-600 rounded px-2 py-1 text-xs"
                                />
                                <textarea
                                  value={a.text} rows={2}
                                  onChange={(e) => patchWeaponAction(wi, ai, { text: e.target.value })}
                                  placeholder="Ranged Weapon Attack: +6 to hit, range 120/480 ft., one target. Hit: 16 (3d10) piercing damage."
                                  className="flex-1 bg-gray-900 border border-gray-600 rounded px-2 py-1 text-xs"
                                />
                                <button
                                  onClick={() => removeWeaponAction(wi, ai)}
                                  title="Remove action"
                                  className="px-2 py-1 rounded bg-red-900/60 border border-red-700 text-red-200 text-[11px] hover:bg-red-900"
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                            {!(w.actions || []).length && (
                              <p className="text-[11px] text-gray-600 italic">No actions listed.</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button onClick={saveStats} disabled={busy}
                      className="px-3 py-1.5 rounded bg-emerald-700 hover:bg-emerald-600 text-white text-sm">
                      Save stats
                    </button>
                    <button onClick={() => printCard(selected)}
                      title="Open a printable stat card for this ship"
                      className="px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-100 text-sm">
                      🖨 Print card
                    </button>
                    <button onClick={deleteShip} disabled={busy}
                      className="px-3 py-1.5 rounded bg-red-900/60 border border-red-700 text-red-200 text-sm hover:bg-red-900">
                      Delete ship
                    </button>
                  </div>
                </section>

                <section>
                  <h3 className="text-sm font-semibold text-dnd-gold mb-1">Decks</h3>
                  <p className="text-[11px] text-gray-500 mb-2">
                    Decks stack bottom-up: the first is the lowest, and each one after it
                    sits above. Mark the <span className="text-amber-300">main deck</span> — that's
                    where anyone boarding from open space arrives, and the floor the smaller decks
                    sit above. A <span className="text-sky-300">sails</span> layer is decoration
                    rather than a level: it shows to anyone looking at the ship from outside, is
                    hidden from the crew aboard, and never takes tokens. Size is in squares
                    (1 square = 5 ft), so the art scales to the map it's placed on.
                  </p>

                  <div className="space-y-2 mb-3">
                    {decks.map((d) => (
                      <div key={d.id} className="flex items-center gap-2 bg-gray-800/60 border border-gray-700 rounded p-2">
                        <img src={`/uploads/${d.image_path}`} alt="" className="w-12 h-12 object-cover rounded shrink-0" />
                        <div className="flex-1 min-w-0">
                          <input
                            defaultValue={d.name}
                            onBlur={(e) => e.target.value !== d.name && patchDeck(d.id, { name: e.target.value })}
                            className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1 text-sm mb-1"
                          />
                          <div className="flex gap-1 items-center">
                            <input
                              type="number" min={1} defaultValue={d.grid_cols}
                              onBlur={(e) => Number(e.target.value) !== Number(d.grid_cols) && patchDeck(d.id, { grid_cols: Number(e.target.value) })}
                              className="w-14 bg-gray-900 border border-gray-600 rounded px-1 py-0.5 text-xs"
                            />
                            <span className="text-xs text-gray-500">×</span>
                            <input
                              type="number" min={1} defaultValue={d.grid_rows}
                              onBlur={(e) => Number(e.target.value) !== Number(d.grid_rows) && patchDeck(d.id, { grid_rows: Number(e.target.value) })}
                              className="w-14 bg-gray-900 border border-gray-600 rounded px-1 py-0.5 text-xs"
                            />
                            <span className="text-xs text-gray-500">
                              sq · {Number(d.grid_cols) * 5}×{Number(d.grid_rows) * 5} ft
                            </span>
                          </div>
                          {/* Headroom. Footprint above is what the deck covers
                              on the map; this is how tall it is, which only the
                              3D view can express — it spaces the levels by this
                              when the hull is shown expanded. */}
                          <div className="flex gap-1 items-center mt-1">
                            <span className="text-xs text-gray-500 w-14 shrink-0">Height</span>
                            <input
                              type="number" min={1} max={200} step={1}
                              defaultValue={Number(d.height_ft ?? 10)}
                              onBlur={(e) => {
                                const v = Number(e.target.value);
                                if (Number.isFinite(v) && v > 0 && v !== Number(d.height_ft ?? 10)) {
                                  patchDeck(d.id, { height_ft: v });
                                }
                              }}
                              className="w-14 bg-gray-900 border border-gray-600 rounded px-1 py-0.5 text-xs"
                            />
                            <span className="text-xs text-gray-500">ft of headroom</span>
                          </div>
                        </div>
                        {/* Sails / rigging: decoration seen from outside the ship,
                            never a level. Marking it clears main, since the two
                            are mutually exclusive by definition. */}
                        <button
                          onClick={() => patchDeck(d.id, d.is_sails
                            ? { is_sails: false }
                            : { is_sails: true, is_main: false })}
                          disabled={busy}
                          title={d.is_sails
                            ? 'Decoration only — shown to anyone not aboard, hidden from the crew'
                            : 'Make this a sails / rigging layer'}
                          className={`px-2 py-1 rounded text-xs shrink-0 border ${
                            d.is_sails
                              ? 'bg-sky-700/30 border-sky-500 text-sky-200'
                              : 'bg-gray-800 border-gray-600 text-gray-400 hover:text-gray-200'
                          }`}
                        >{d.is_sails ? '⛵ Sails' : 'Sails'}</button>
                        {/* Main deck. Exclusive per ship — the server clears the
                            flag on every sibling when one is set — so this reads
                            as a radio even though each row owns its own button. */}
                        <button
                          onClick={() => patchDeck(d.id, { is_main: !d.is_main })}
                          disabled={busy || d.is_sails}
                          title={d.is_main
                            ? 'This is the main deck — boarders arrive here'
                            : 'Make this the main deck'}
                          className={`px-2 py-1 rounded text-xs shrink-0 border ${
                            d.is_main
                              ? 'bg-amber-600/30 border-amber-500 text-amber-200'
                              : 'bg-gray-800 border-gray-600 text-gray-400 hover:text-gray-200'
                          }`}
                        >{d.is_main ? '★ Main' : 'Set main'}</button>
                        <div className="flex flex-col gap-1 shrink-0">
                          <button
                            // Decks stack bottom-up, so "up the hull" is a HIGHER
                            // deck_index. The server does the swap.
                            onClick={() => moveDeck(d.id, 'up')}
                            disabled={busy || d.deck_index >= decks.length - 1}
                            className="px-2 py-0.5 rounded bg-gray-700 text-xs text-gray-200 disabled:opacity-40"
                            title="Move this deck up the hull"
                          >↑</button>
                          <button
                            onClick={() => moveDeck(d.id, 'down')}
                            disabled={busy || d.deck_index === 0}
                            className="px-2 py-0.5 rounded bg-gray-700 text-xs text-gray-200 disabled:opacity-40"
                            title="Move this deck down the hull"
                          >↓</button>
                        </div>
                        <button
                          onClick={() => deleteDeck(d.id)} disabled={busy}
                          className="px-2 py-1 rounded bg-red-900/60 border border-red-700 text-red-200 text-xs shrink-0"
                        >Delete</button>
                      </div>
                    ))}
                    {!decks.length && (
                      <p className="text-xs text-gray-500">No decks yet — a ship needs at least one to be placed.</p>
                    )}
                  </div>

                  <div className="border border-dashed border-gray-600 rounded p-3">
                    <div className="flex gap-2 mb-2">
                      <label className="flex-1">
                        <span className="block text-[11px] text-gray-400 mb-0.5">New deck name</span>
                        <input
                          value={deckName} onChange={(e) => setDeckName(e.target.value)}
                          placeholder="Main Deck"
                          className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm"
                        />
                      </label>
                      <NumField label="Width (sq)" value={deckCols} onChange={setDeckCols} min={1} />
                      <NumField label="Height (sq)" value={deckRows} onChange={setDeckRows} min={1} />
                    </div>
                    <label className="block">
                      <span className="px-3 py-1.5 rounded bg-sky-800 hover:bg-sky-700 text-white text-sm cursor-pointer inline-block">
                        {busy ? 'Uploading…' : 'Upload deck art'}
                      </span>
                      <input
                        type="file" accept="image/*" className="hidden" disabled={busy}
                        onChange={(e) => { addDeck(e.target.files[0]); e.target.value = ''; }}
                      />
                    </label>
                  </div>
                </section>

                {decks.length > 1 && (
                  <section>
                    <h3 className="text-sm font-semibold text-dnd-gold mb-1">Align decks</h3>
                    <p className="text-[11px] text-gray-500 mb-2">
                      Each deck is placed against the one directly below it. Drag the
                      highlighted deck over the ghosted one until the hulls line up; the
                      lowest deck is the datum everything else is measured from. Snaps to
                      half a square.
                    </p>
                    <div className="flex gap-2 items-center mb-2 text-xs">
                      <span className="text-gray-400">Aligning</span>
                      <select
                        value={alignDeckIdx}
                        onChange={(e) => setAlignDeckIdx(Number(e.target.value))}
                        className="bg-gray-800 border border-gray-600 rounded px-2 py-1"
                      >
                        {decksAsc.slice(1).map(d => (
                          <option key={d.id} value={d.deck_index}>{d.name || `Deck ${d.deck_index + 1}`}</option>
                        ))}
                      </select>
                      <span className="text-gray-500">
                        against {belowDeck?.name || `Deck ${(belowDeck?.deck_index ?? 0) + 1}`} (the deck below)
                      </span>
                    </div>
                    {belowDeck && alignDeck && (
                      <DeckAligner
                        belowDeck={belowDeck}
                        deck={alignDeck}
                        offset={alignRelOffset}
                        busy={busy}
                        // Relative in, absolute out: the deck below carries its own
                        // absolute offset, so the stored value is that plus this nudge.
                        onChange={(col, row) => patchDeck(alignDeck.id, {
                          offset_col: Number(belowDeck.offset_col || 0) + col,
                          offset_row: Number(belowDeck.offset_row || 0) + row,
                        })}
                      />
                    )}
                  </section>
                )}

                <section>
                  <h3 className="text-sm font-semibold text-dnd-gold mb-1">Stairs &amp; hatches</h3>
                  <p className="text-[11px] text-gray-400 mb-2">
                    Drag out the shape of the stairwell — it isn't snapped to the
                    grid. A single click still marks one square.
                  </p>
                  {decks.length < 2 ? (
                    <p className="text-[11px] text-gray-500">
                      Add a second deck before linking levels together.
                    </p>
                  ) : (
                    <>
                      <p className="text-[11px] text-gray-500 mb-2">
                        Click the square on the left deck where the stairs are, then the square
                        on the right deck where they come out. The return leg is created for
                        you, so they work both ways. Click an existing marker to remove it.
                      </p>

                      <div className="flex gap-2 items-center mb-2 text-xs">
                        <span className="text-gray-400">From</span>
                        <select
                          value={fromDeckIdx}
                          onChange={(e) => { setFromDeckIdx(Number(e.target.value)); setPendingFrom(null); }}
                          className="bg-gray-800 border border-gray-600 rounded px-2 py-1"
                        >
                          {decks.map(d => <option key={d.id} value={d.deck_index}>{d.name || `Deck ${d.deck_index + 1}`}</option>)}
                        </select>
                        <span className="text-gray-400">to</span>
                        <select
                          value={toDeckIdx}
                          onChange={(e) => setToDeckIdx(Number(e.target.value))}
                          className="bg-gray-800 border border-gray-600 rounded px-2 py-1"
                        >
                          {decks.map(d => <option key={d.id} value={d.deck_index}>{d.name || `Deck ${d.deck_index + 1}`}</option>)}
                        </select>
                        <span className="text-gray-400">as</span>
                        <select
                          value={trKind}
                          onChange={(e) => setTrKind(e.target.value)}
                          className="bg-gray-800 border border-gray-600 rounded px-2 py-1"
                        >
                          {TRANSITION_KINDS.map(k => <option key={k.id} value={k.id}>{k.label}</option>)}
                        </select>
                        {pendingFrom && (
                          <span className="text-sky-300">
                            Now click where it comes out on the right →
                          </span>
                        )}
                      </div>

                      <div className="flex gap-4">
                        {fromDeck && (
                          <DeckCanvas
                            deck={fromDeck}
                            label={`From — ${fromDeck.name || `Deck ${fromDeck.deck_index + 1}`}`}
                            markers={(fromDeck.transitions || [])}
                            pending={pendingFrom}
                            onPickSquare={(col, row, w, h) => {
                              // Drawing over an existing marker removes it rather
                              // than stacking a second stairwell on the same spot.
                              // Overlap, not an exact corner match, now that these
                              // are freehand rectangles of any size.
                              const hit = (t) => {
                                const r = markerRect(t);
                                return col < r.col + r.w && col + (w || 1) > r.col
                                  && row < r.row + r.h && row + (h || 1) > r.row;
                              };
                              const existing = (fromDeck.transitions || []).findIndex(hit);
                              if (existing >= 0) {
                                patchDeck(fromDeck.id, {
                                  transitions: (fromDeck.transitions || []).filter((_, j) => j !== existing),
                                });
                                setPendingFrom(null);
                                return;
                              }
                              setPendingFrom({ col, row, w: w || 1, h: h || 1 });
                            }}
                          />
                        )}
                        {toDeck && (
                          <DeckCanvas
                            deck={toDeck}
                            label={`To — ${toDeck.name || `Deck ${toDeck.deck_index + 1}`}`}
                            markers={(toDeck.transitions || [])}
                            onPickSquare={(col, row, w, h) => {
                              if (!pendingFrom || !fromDeck || !toDeck) return;
                              addStairPair(fromDeck, toDeck, pendingFrom, { col, row, w, h }, trKind);
                              setPendingFrom(null);
                            }}
                          />
                        )}
                      </div>

                      {/* Plain list so a mis-clicked pairing is easy to spot and
                          clear without hunting for the square on the art. */}
                      <div className="mt-3 space-y-1">
                        {decks.flatMap((d) =>
                          (d.transitions || []).map((tr, i) => (
                            <div key={`${d.id}-${i}`} className="flex items-center gap-2 text-[11px] text-gray-400">
                              <span className="text-gray-300">
                                {TRANSITION_KINDS.find(k => k.id === (tr.kind || 'stairs'))?.label}
                              </span>
                              <span>
                                deck {d.deck_index + 1} ({tr.col},{tr.row}) → deck {(tr.to_deck ?? 0) + 1} ({tr.to_col ?? 0},{tr.to_row ?? 0})
                              </span>
                              <button
                                onClick={() => patchDeck(d.id, { transitions: (d.transitions || []).filter((_, j) => j !== i) })}
                                className="px-1.5 rounded bg-red-900/60 border border-red-700 text-red-200"
                              >×</button>
                            </div>
                          ))
                        )}
                      </div>
                    </>
                  )}
                </section>

                <section>
                  <h3 className="text-sm font-semibold text-dnd-gold mb-1">Spelljamming helm</h3>
                  {!decks.length ? (
                    <p className="text-[11px] text-gray-500">Add a deck first.</p>
                  ) : (
                    <>
                      <p className="text-[11px] text-gray-500 mb-2">
                        Click the square the helm sits on. Whoever stands there can steer the
                        ship and can see its hull damage — no attunement needed. Click it again
                        to remove it.
                      </p>

                      <div className="flex gap-2 items-center mb-2 text-xs">
                        <span className="text-gray-400">Deck</span>
                        <select
                          value={helmDeckIdx}
                          onChange={(e) => setHelmDeckIdx(Number(e.target.value))}
                          className="bg-gray-800 border border-gray-600 rounded px-2 py-1"
                        >
                          {decks.map(d => (
                            <option key={d.id} value={d.deck_index}>
                              {d.name || `Deck ${d.deck_index + 1}`}{d.helm && d.helm.col != null ? ' · has helm' : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      {helmDeck && (
                        <DeckCanvas
                          deck={helmDeck}
                          label={`Helm — ${helmDeck.name || `Deck ${helmDeck.deck_index + 1}`}`}
                          markers={(helmDeck.transitions || [])}
                          helm={helmDeck.helm}
                          onPickSquare={(col, row, w, h) => {
                            const cur = helmDeck.helm;
                            const same = cur && Number(cur.col) === col && Number(cur.row) === row
                              && Number(cur.w ?? 1) === (w || 1) && Number(cur.h ?? 1) === (h || 1);
                            // One helm per ship: placing on another deck clears
                            // the old one, or a hull ends up with two wheels and
                            // two people each think they have the con.
                            if (!same) {
                              for (const d of decks) {
                                if (d.id !== helmDeck.id && d.helm && d.helm.col != null) {
                                  patchDeck(d.id, { helm: null });
                                }
                              }
                            }
                            patchDeck(helmDeck.id, { helm: same ? null : { col, row, w: w || 1, h: h || 1 } });
                          }}
                        />
                      )}

                      <div className="mt-2 text-[11px] text-gray-400">
                        {helmShipDeck
                          ? <>Helm on {helmShipDeck.name || `deck ${helmShipDeck.deck_index + 1}`} at ({helmShipDeck.helm.col},{helmShipDeck.helm.row}), {markerRect(helmShipDeck.helm).w}×{markerRect(helmShipDeck.helm).h} squares.</>
                          : <span className="text-gray-500">No helm placed — only the GM can move this ship.</span>}
                      </div>
                    </>
                  )}
                </section>
              </>
            )}
          </div>
        </div>

        <div className="px-4 py-3 border-t border-gray-700 flex justify-between items-center">
          <span className="text-[11px] text-gray-500">
            {mapId ? 'Places at square 2,2 — drag it where you want it.' : 'No map selected.'}
          </span>
          <button
            onClick={placeOnMap}
            disabled={!selected || !decks.length || !mapId || busy}
            className="px-4 py-2 rounded bg-dnd-gold text-gray-900 font-semibold text-sm disabled:opacity-40"
          >
            Place on map
          </button>
        </div>
      </div>
    </div>
  );
}
