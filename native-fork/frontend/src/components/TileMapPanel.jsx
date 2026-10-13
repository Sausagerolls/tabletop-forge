import React, { useCallback, useEffect, useState } from 'react';
import TileSpawnModal from './TileSpawnModal.jsx';

// TileMapPanel — the GM's workshop for tile maps.
//
// A tile map is built a card at a time: the GM keeps a library of tiles, packs
// a deck out of it, turns a card, and lays the tile it names. This panel owns
// the first two (library and deck — REST, between sessions) and the controls
// for the third (draw / rotate / place — sockets, live, owned by DMView).
//
// Deliberately split that way. The library and the deck are the GM's own
// preparation and nobody else needs to see them change; the board and the pile
// are shared state the whole table is watching.

// Suggested categories. Offered as a starting point, not a fixed set: every
// dungeon set divides itself differently, and the field takes free text so a
// GM can add "cave", "vault", "stairs" or whatever their tiles actually are.
const CATEGORY_SUGGESTIONS = ['Room', 'Corridor', 'Entrance / Exit', 'Junction', 'Stairs', 'Cave'];
const UNCATEGORISED = 'Uncategorised';

const EDGES = [
  ['edge_n', 'N'],
  ['edge_e', 'E'],
  ['edge_s', 'S'],
  ['edge_w', 'W'],
];

// A tile's open edges, drawn as a little compass. Four letters is faster to
// read down a list than "open: north, east" and takes a fraction of the width.
function EdgeChips({ tile, onToggle = null }) {
  return (
    <div className="flex gap-0.5">
      {EDGES.map(([key, label]) => {
        const open = !!tile[key];
        const cls = open
          ? 'bg-emerald-800/70 border-emerald-600 text-emerald-200'
          : 'bg-gray-800 border-gray-600 text-gray-500';
        return onToggle ? (
          <button
            key={key}
            type="button"
            onClick={() => onToggle(key, !open)}
            title={open ? `${label} is an opening — click to wall it` : `${label} is walled — click to open it`}
            className={`w-6 h-6 text-[10px] font-bold rounded border transition-colors ${cls}`}
          >{label}</button>
        ) : (
          <span key={key} className={`w-5 h-5 text-[9px] font-bold rounded border flex items-center justify-center ${cls}`}>
            {label}
          </span>
        );
      })}
    </div>
  );
}
export default function TileMapPanel({
  sessionId,
  isTileMap,
  deck, onDeckChange,
  counts,
  pendingTile,
  staged,
  rotation, onRotate,
  onCommit, onUnstage,
  onDraw, onDiscardCard, onReshuffle,
  onPickTile,
  onCreateMap,
}) {
  const [library, setLibrary] = useState([]);
  const [decks, setDecks] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  // Draft counts while editing the deck: { [tileId]: n }.
  const [deckDraft, setDeckDraft] = useState({});
  const [newTile, setNewTile] = useState({ name: '', grid_w: 2, grid_h: 2, wall_height_ft: 10, edge_n: false, edge_e: false, edge_s: false, edge_w: false });
  // The tile whose creature list is open, and the library to pick from.
  const [stocking, setStocking] = useState(null);
  const [creatures, setCreatures] = useState([]);
  const [doorSprites, setDoorSprites] = useState([]);
  const [note, setNote] = useState('');
  // Which category sections are folded shut. Collapsed state is per-GM and
  // per-browser, so it is not worth a round trip — but it does survive a
  // reload, because reopening six sections every time is worse than the
  // storage.
  const [collapsed, setCollapsed] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('ttf.tiles.collapsed') || '[]')); }
    catch { return new Set(); }
  });
  useEffect(() => {
    try { localStorage.setItem('ttf.tiles.collapsed', JSON.stringify([...collapsed])); }
    catch { /* private mode */ }
  }, [collapsed]);

  const loadLibrary = useCallback(async () => {
    try {
      const r = await fetch('/api/tiles');
      setLibrary(r.ok ? await r.json() : []);
    } catch { setLibrary([]); }
  }, []);

  const loadDecks = useCallback(async () => {
    try {
      const r = await fetch(`/api/tiles/decks/list${sessionId ? `?session_id=${sessionId}` : ''}`);
      setDecks(r.ok ? await r.json() : []);
    } catch { setDecks([]); }
  }, [sessionId]);

  useEffect(() => { loadLibrary(); loadDecks(); }, [loadLibrary, loadDecks]);

  // Creatures, loaded only when a tile is actually being stocked — the list
  // can be long and most sessions never open this.
  useEffect(() => {
    if (!stocking) return;
    (async () => {
      try {
        const r = await fetch('/api/creatures?role=dm');
        setCreatures(r.ok ? await r.json() : []);
      } catch { setCreatures([]); }
      try {
        const r = await fetch('/api/door-sprites');
        setDoorSprites(r.ok ? await r.json() : []);
      } catch { setDoorSprites([]); }
    })();
  }, [stocking?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pull the chosen deck's contents into the draft so the counts shown are the
  // deck's real composition rather than an empty form.
  useEffect(() => {
    if (!deck?.id) { setDeckDraft({}); return; }
    (async () => {
      try {
        const r = await fetch(`/api/tiles/decks/${deck.id}`);
        if (!r.ok) return;
        const d = await r.json();
        const draft = {};
        for (const c of d.cards || []) draft[c.tile_id] = (draft[c.tile_id] || 0) + 1;
        setDeckDraft(draft);
      } catch { /* leave the draft alone */ }
    })();
  }, [deck?.id]);

  async function uploadTile(file) {
    if (!file) return;
    setBusy(true); setErr('');
    try {
      const fd = new FormData();
      fd.append('image', file);
      fd.append('name', newTile.name || file.name.replace(/\.[^.]+$/, ''));
      fd.append('grid_w', String(newTile.grid_w));
      fd.append('grid_h', String(newTile.grid_h));
      for (const [k] of EDGES) fd.append(k, String(!!newTile[k]));
      fd.append('category', newTile.category || '');
      fd.append('wall_height_ft', String(newTile.wall_height_ft ?? 10));
      const r = await fetch('/api/tiles', { method: 'POST', body: fd });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `Upload failed (${r.status})`);
      setNewTile((p) => ({ name: '', grid_w: p.grid_w, grid_h: p.grid_h,
        wall_height_ft: p.wall_height_ft,
        edge_n: false, edge_e: false, edge_s: false, edge_w: false, category: p.category }));
      await loadLibrary();
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  async function patchTile(id, patch) {
    setErr('');
    try {
      const r = await fetch(`/api/tiles/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (!r.ok) throw new Error(`Update failed (${r.status})`);
      setLibrary((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    } catch (e) { setErr(e.message); }
  }

  async function deleteTile(id) {
    setErr('');
    try {
      await fetch(`/api/tiles/${id}`, { method: 'DELETE' });
      await loadLibrary();
    } catch (e) { setErr(e.message); }
  }

  // A .dd2vtt brings its walls with it, which is the whole reason to import
  // one rather than just uploading the picture.
  async function importDd2vtt(file) {
    if (!file) return;
    setBusy(true); setErr(''); setNote('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('category', newTile.category || '');
      fd.append('wall_height_ft', String(newTile.wall_height_ft ?? 10));
      const r = await fetch('/api/tiles/import-dd2vtt', { method: 'POST', body: fd });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `Import failed (${r.status})`);
      const t = await r.json();
      setNote(`Imported ${t.name} — ${t.grid_w}×${t.grid_h} squares, `
        + `${t.imported?.walls ?? 0} walls and ${t.imported?.doors ?? 0} doors.`);
      await loadLibrary();
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  // One Save button, two endpoints — the editor covers what a tile brings with
  // it, and that is creatures AND doorways. Sequential rather than parallel so
  // the second write starts from the row the first one returned; the tile row
  // holds both, and racing them would let one overwrite the other's copy.
  async function saveTile(tileId, spawns, doors) {
    setErr('');
    try {
      let updated;
      const r = await fetch(`/api/tiles/${tileId}/spawns`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spawns }),
      });
      if (!r.ok) throw new Error(`Save failed (${r.status})`);
      updated = await r.json();

      // Not `doors.length` — an empty list is a real instruction now. Deleting
      // the last doorway off a tile has to reach the server, and skipping the
      // call when nothing is left would silently keep it.
      if (Array.isArray(doors)) {
        const d = await fetch(`/api/tiles/${tileId}/doors`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ doors }),
        });
        if (!d.ok) throw new Error(`Door save failed (${d.status})`);
        updated = await d.json();
      }

      setLibrary((prev) => prev.map((t) => (t.id === tileId ? updated : t)));
      // Deliberately NOT setStocking(updated). The editor closes itself once
      // this resolves, and setting the tile being edited here raced that: the
      // close ran first, then this landed and opened the editor straight back
      // up on the tile just saved. Whether it closes is the caller's business.
      return true;
    } catch (e) { setErr(e.message); return false; }
  }

  async function createDeck() {
    setBusy(true); setErr('');
    try {
      const r = await fetch('/api/tiles/decks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, name: 'Dungeon Deck' }),
      });
      if (!r.ok) throw new Error('Could not create the deck');
      const d = await r.json();
      await loadDecks();
      onDeckChange?.(d);
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  async function saveDeck() {
    if (!deck?.id) return;
    setBusy(true); setErr('');
    try {
      const rows = Object.entries(deckDraft)
        .map(([tile_id, count]) => ({ tile_id: Number(tile_id), count: Number(count) || 0 }))
        .filter((r) => r.count > 0);
      const r = await fetch(`/api/tiles/decks/${deck.id}/cards`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tiles: rows }),
      });
      if (!r.ok) throw new Error('Could not save the deck');
      await loadDecks();
      // The pile has been rebuilt, so whatever was drawn or discarded is gone
      // with it — tell the parent so its counts and pending card reset.
      onDeckChange?.({ ...deck, rebuilt: Date.now() });
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  const inputCls = 'bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-dnd-gold';

  return (
    <div className="h-full overflow-y-auto p-3 space-y-3">
      {err && <div className="text-xs text-red-300 bg-red-900/30 border border-red-800 rounded p-2">{err}</div>}
      {note && <div className="text-xs text-emerald-200 bg-emerald-900/30 border border-emerald-800 rounded p-2">{note}</div>}

      {/* ── The board ───────────────────────────────────────────────────── */}
      {!isTileMap ? (
        <div className="bg-gray-900/40 border border-gray-700 rounded-lg p-3 space-y-2">
          <p className="text-[11px] text-gray-400 leading-snug">
            A tile map starts empty and dark. Tiles appear only as you lay them,
            so the party sees the dungeon grow one card at a time.
          </p>
          <button
            type="button"
            onClick={onCreateMap}
            className="w-full rounded-lg py-2 text-sm font-semibold bg-dnd-gold hover:bg-yellow-400 text-gray-900"
          >New tile map</button>
        </div>
      ) : (
        <div className="rounded-lg px-3 py-2 text-xs text-center bg-emerald-900/40 text-emerald-200 border border-emerald-800">
          Tile map in play — draw a card, then click the board to lay it.
        </div>
      )}

      {/* What the GM is holding — a card just turned, or a tile picked
          straight out of the library. Outside the deck section on purpose:
          a tile can be placed with no deck chosen at all, and burying its
          Rotate and Lay-it-down controls inside the pile would make direct
          placement impossible until a deck happened to be selected. */}
      {pendingTile && (
        <div className="rounded-lg border border-dnd-gold/60 bg-gray-900/70 p-2">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-dnd-gold truncate">{pendingTile.name || 'Tile'}</span>
            <span className="text-[10px] text-gray-500">
              {pendingTile.direct ? 'from library' : 'drawn'} · {pendingTile.grid_w}×{pendingTile.grid_h}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <img
              src={`/uploads/${pendingTile.image_path}`}
              alt=""
              className="w-24 h-24 object-contain rounded border border-gray-700 bg-black/40"
              style={{ transform: `rotate(${rotation}deg)` }}
            />
            <div className="flex-1 min-w-0 space-y-1.5">
              <button type="button" onClick={() => onRotate?.((rotation + 90) % 360)}
                className="w-full text-xs bg-gray-700 hover:bg-gray-600 rounded py-1.5 text-gray-100">
                Rotate ({rotation}°)
              </button>
              {/* Two states, because they are two different moments: before the
                  first click there is nothing to commit, and after it the tile
                  is sitting on the GM's board waiting to be nudged into line.
                  Only the second offers the button that shows it to the table. */}
              {staged ? (
                <>
                  <button type="button" onClick={onCommit}
                    className="w-full text-xs font-semibold bg-emerald-700 hover:bg-emerald-600 rounded py-1.5 text-white">
                    Lay it down
                  </button>
                  <button type="button" onClick={onUnstage}
                    className="w-full text-[11px] bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded py-1 text-gray-300">
                    Pick it back up
                  </button>
                  <p className="text-[10px] text-gray-500 leading-tight">
                    Drag it into line — only you can see it.
                  </p>
                </>
              ) : (
                <>
                  {/* Putting it down means two different things. A drawn card
                      goes to the discard — it has been spent either way. A tile
                      picked out of the library was never on a pile, so it just
                      goes back on the shelf. */}
                  <button
                    type="button"
                    onClick={() => (pendingTile.direct ? onPickTile?.(null) : onDiscardCard?.())}
                    className="w-full text-[11px] bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded py-1 text-gray-300">
                    {pendingTile.direct ? 'Put it back' : 'Discard without laying'}
                  </button>
                  <p className="text-[10px] text-gray-500 leading-tight">Click the board to place it.</p>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── The pile ────────────────────────────────────────────────────── */}
      <div className="bg-gray-900/40 border border-gray-700 rounded-lg overflow-hidden">
        <div className="px-3 py-1.5 bg-gray-900/60 border-b border-gray-700 flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-wider text-gray-400">The pile</span>
          <span className="text-[11px] text-gray-500">
            {counts.draw} face down · {counts.discard} spent
          </span>
        </div>
        <div className="p-3 space-y-2">
          <div className="flex gap-2">
            <select
              value={deck?.id || ''}
              onChange={(e) => {
                const d = decks.find((x) => String(x.id) === e.target.value) || null;
                onDeckChange?.(d);
              }}
              className={`${inputCls} flex-1 min-w-0`}
            >
              <option value="">— choose a deck —</option>
              {decks.map((d) => (
                <option key={d.id} value={d.id}>{d.name} ({d.counts?.draw ?? 0})</option>
              ))}
            </select>
            <button type="button" onClick={createDeck} disabled={busy}
              className="text-xs bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded px-3 text-gray-200">+ Deck</button>
          </div>

          {deck && (
            <>
              {/* The turned card. Shown big, because this is the thing the GM
                  is about to commit to the board. */}
              {!pendingTile && (
                <button type="button" onClick={onDraw} disabled={!counts.draw}
                  className="w-full rounded-lg py-2.5 text-sm font-semibold bg-dnd-red hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white">
                  {counts.draw ? 'Draw a card' : 'Draw pile empty'}
                </button>
              )}

              <button type="button" onClick={onReshuffle} disabled={!counts.discard}
                className="w-full text-[11px] bg-gray-800 hover:bg-gray-700 border border-gray-600 disabled:opacity-40 rounded py-1.5 text-gray-300">
                Shuffle {counts.discard} spent card{counts.discard === 1 ? '' : 's'} back in
              </button>

              {/* What's IN the deck. Counts per tile, saved as a batch. */}
              <details className="border-t border-gray-700 pt-2">
                <summary className="text-[11px] text-gray-400 cursor-pointer select-none">Deck contents</summary>
                <div className="mt-2 space-y-1">
                  {library.length === 0 && (
                    <p className="text-[11px] text-gray-500 italic">Add some tiles below first.</p>
                  )}
                  {library.map((t) => (
                    <div key={t.id} className="flex items-center gap-2">
                      <img src={`/uploads/${t.image_path}`} alt="" className="w-7 h-7 object-contain rounded bg-black/40 shrink-0" />
                      <span className="text-xs text-gray-300 truncate flex-1 min-w-0">{t.name}</span>
                      <input
                        type="number" min={0} max={50}
                        value={deckDraft[t.id] ?? 0}
                        onChange={(e) => setDeckDraft((p) => ({ ...p, [t.id]: Math.max(0, parseInt(e.target.value, 10) || 0) }))}
                        className={`${inputCls} w-16 text-center`}
                      />
                    </div>
                  ))}
                  {library.length > 0 && (
                    <>
                      <button type="button" onClick={saveDeck} disabled={busy}
                        className="w-full mt-1 text-xs bg-dnd-gold hover:bg-yellow-400 disabled:opacity-50 text-gray-900 font-semibold rounded py-1.5">
                        Rebuild deck
                      </button>
                      <p className="text-[10px] text-gray-500 leading-tight">
                        Rebuilding reshuffles everything — anything drawn or spent goes back in.
                      </p>
                    </>
                  )}
                </div>
              </details>
            </>
          )}
        </div>
      </div>

      {/* ── The library ─────────────────────────────────────────────────── */}
      <div className="bg-gray-900/40 border border-gray-700 rounded-lg overflow-hidden">
        <div className="px-3 py-1.5 bg-gray-900/60 border-b border-gray-700 flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-wider text-gray-400">Tile library</span>
          <span className="text-[11px] text-gray-500">{library.length}</span>
        </div>

        <div className="p-3 space-y-2 border-b border-gray-700">
          <input
            type="text" placeholder="Tile name" value={newTile.name}
            onChange={(e) => setNewTile((p) => ({ ...p, name: e.target.value }))}
            className={`${inputCls} w-full`}
          />
          <div className="flex items-center gap-2">
            <label className="text-[11px] text-gray-400">Size</label>
            <input type="number" min={1} max={20} value={newTile.grid_w}
              onChange={(e) => setNewTile((p) => ({ ...p, grid_w: Math.max(1, parseInt(e.target.value, 10) || 1) }))}
              className={`${inputCls} w-14 text-center`} />
            <span className="text-gray-500 text-xs">×</span>
            <input type="number" min={1} max={20} value={newTile.grid_h}
              onChange={(e) => setNewTile((p) => ({ ...p, grid_h: Math.max(1, parseInt(e.target.value, 10) || 1) }))}
              className={`${inputCls} w-14 text-center`} />
            <span className="text-[10px] text-gray-500">squares</span>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[11px] text-gray-400">Wall height</label>
            <input type="number" min={1} max={200} step={1}
              value={newTile.wall_height_ft ?? 10}
              onChange={(e) => setNewTile((p) => ({ ...p, wall_height_ft: e.target.value }))}
              className={`${inputCls} w-16 text-center`} />
            <span className="text-[10px] text-gray-500">ft — how tall this tile's walls stand in 3D</span>
          </div>
          <input
            type="text" list="tile-categories" placeholder="Category (room, corridor…)"
            value={newTile.category || ''}
            onChange={(e) => setNewTile((p) => ({ ...p, category: e.target.value }))}
            className={`${inputCls} w-full`}
          />
          <div className="flex items-center gap-2">
            <label className="text-[11px] text-gray-400 shrink-0">Openings</label>
            <EdgeChips tile={newTile} onToggle={(k, v) => setNewTile((p) => ({ ...p, [k]: v }))} />
            <span className="text-[10px] text-gray-500 leading-tight">walls go on the rest</span>
          </div>
          <input id="tile-upload" type="file" accept="image/*" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; uploadTile(f); }} />
          <button type="button" disabled={busy}
            onClick={() => document.getElementById('tile-upload').click()}
            className="w-full text-xs bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded py-2 text-gray-200">
            {busy ? 'Working…' : '+ Add tile artwork'}
          </button>

          {/* The other way in, and the better one when you have it: a
              Dungeondraft export carries the room's walls and doors as well
              as its picture, so the tile blocks sight the way it was drawn
              instead of being a photograph of a room. Size and openings come
              from the file, so none of the fields above apply. */}
          <div className="border-t border-gray-700 pt-2">
            <input id="tile-dd2vtt" type="file" accept=".dd2vtt,.df2vtt,.uvtt,application/json" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; importDd2vtt(f); }} />
            <button type="button" disabled={busy}
              onClick={() => document.getElementById('tile-dd2vtt').click()}
              className="w-full text-xs bg-indigo-900/60 hover:bg-indigo-800 border border-indigo-700 disabled:opacity-50 rounded py-2 text-indigo-100">
              {busy ? 'Working…' : 'Import from Dungeondraft (.dd2vtt)'}
            </button>
            <p className="text-[10px] text-gray-500 mt-1 leading-tight">
              Brings the walls and doors with it. Size is read from the file.
            </p>
          </div>
        </div>

        {/* Grouped by category, each section foldable.
            A GM with sixty tiles cannot scan one flat list, and the grouping
            they want is by what a tile IS — a room, a corridor, a way in.
            Clicking a tile picks it up for placing directly, no card spent. */}
        <div className="max-h-96 overflow-y-auto">
          {library.length === 0 && (
            <p className="px-3 py-2.5 text-xs text-gray-500 italic">No tiles yet.</p>
          )}
          {(() => {
            const groups = new Map();
            for (const t of library) {
              const key = (t.category || '').trim() || UNCATEGORISED;
              if (!groups.has(key)) groups.set(key, []);
              groups.get(key).push(t);
            }
            // Named categories first, alphabetically; the uncategorised pile
            // last, because it is a to-do list rather than a category.
            const keys = [...groups.keys()].sort((a, b) => {
              if (a === UNCATEGORISED) return 1;
              if (b === UNCATEGORISED) return -1;
              return a.localeCompare(b);
            });
            return keys.map((key) => {
              const shut = collapsed.has(key);
              return (
                <div key={key} className="border-b border-gray-800 last:border-b-0">
                  <button
                    type="button"
                    onClick={() => setCollapsed((prev) => {
                      const next = new Set(prev);
                      if (next.has(key)) next.delete(key); else next.add(key);
                      return next;
                    })}
                    className="w-full px-3 py-1.5 flex items-center gap-2 bg-gray-900/50 hover:bg-gray-800 text-left"
                  >
                    <span className={`text-gray-500 text-[10px] transition-transform ${shut ? '' : 'rotate-90'}`}>▶</span>
                    <span className="text-[11px] uppercase tracking-wider text-gray-300 flex-1 truncate">{key}</span>
                    <span className="text-[11px] text-gray-500">{groups.get(key).length}</span>
                  </button>

                  {!shut && groups.get(key).map((t) => {
                    const held = pendingTile && pendingTile.direct && pendingTile.id === t.id;
                    return (
                      <div key={t.id} className={`px-3 py-2 flex items-center gap-2 ${held ? 'bg-dnd-gold/15' : ''}`}>
                        {/* The picture is the button: click it to pick the tile
                            up, click again to put it down. */}
                        <button
                          type="button"
                          onClick={() => onPickTile?.(held ? null : t)}
                          title={held ? 'Put it back' : 'Pick this up and place it on the board'}
                          className={`w-10 h-10 shrink-0 rounded bg-black/40 overflow-hidden border ${
                            held ? 'border-dnd-gold' : 'border-transparent hover:border-gray-500'
                          }`}
                        >
                          <img src={`/uploads/${t.image_path}`} alt="" className="w-full h-full object-contain" />
                        </button>
                        <div className="flex-1 min-w-0">
                          {/* Editable in place. An imported .dd2vtt arrives
                              named after the file it came out of, which is
                              usually a path and a timestamp — renaming had to
                              mean deleting it and uploading again, taking its
                              deck cards with it.

                              Committed on blur, and on Enter for anyone who
                              expects that; Escape puts the old name back.
                              `key` on the tile's own name so the field picks
                              up a rename made from another tab instead of
                              holding a stale draft. */}
                          <input
                            key={`n${t.id}:${t.name}`}
                            type="text"
                            defaultValue={t.name || ''}
                            placeholder="Tile name"
                            title="Rename this tile"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') e.currentTarget.blur();
                              if (e.key === 'Escape') { e.currentTarget.value = t.name || ''; e.currentTarget.blur(); }
                            }}
                            onBlur={(e) => {
                              const v = e.target.value.trim();
                              // An empty name would leave a nameless row that
                              // is impossible to pick out of the deck builder,
                              // so blanking it just restores what it had.
                              if (!v) { e.target.value = t.name || ''; return; }
                              if (v !== (t.name || '')) patchTile(t.id, { name: v });
                            }}
                            className="w-full bg-transparent hover:bg-gray-800/60 focus:bg-gray-800 border border-transparent hover:border-gray-700 focus:border-dnd-gold rounded px-1 py-0.5 text-xs text-gray-200 truncate focus:outline-none"
                          />
                          <div className="text-[10px] text-gray-500 flex items-center gap-1.5">
                            <span>{t.grid_w}×{t.grid_h}</span>
                            {(t.geometry?.walls?.length > 0) && (
                              <span className="text-indigo-300" title="Imported walls — this tile blocks sight">
                                · {t.geometry.walls.length} walls
                              </span>
                            )}
                            {(t.spawns?.length > 0) && (
                              <span className="text-amber-300" title="Creatures this tile brings with it">
                                · {t.spawns.length} creatures
                              </span>
                            )}
                          </div>
                          <div className="mt-1 flex items-center gap-1">
                            <input
                              type="text"
                              list="tile-categories"
                              defaultValue={t.category || ''}
                              placeholder="category…"
                              onBlur={(e) => {
                                const v = e.target.value.trim();
                                if (v !== (t.category || '')) patchTile(t.id, { category: v });
                              }}
                              className="flex-1 min-w-0 bg-gray-800/70 border border-gray-700 rounded px-1.5 py-0.5 text-[10px] text-gray-300 placeholder-gray-600 focus:outline-none focus:border-dnd-gold"
                            />
                            <input
                              type="number" min={1} max={200}
                              defaultValue={t.wall_height_ft ?? 10}
                              title="Wall height in feet — how tall this tile's walls stand in 3D"
                              onBlur={(e) => {
                                const v = Number(e.target.value);
                                if (v > 0 && v !== Number(t.wall_height_ft)) patchTile(t.id, { wall_height_ft: v });
                              }}
                              className="w-12 shrink-0 bg-gray-800/70 border border-gray-700 rounded px-1 py-0.5 text-[10px] text-gray-300 text-center focus:outline-none focus:border-dnd-gold"
                            />
                            <span className="text-[9px] text-gray-600 shrink-0">ft</span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1 shrink-0">
                          <button type="button" onClick={() => setStocking(stocking?.id === t.id ? null : t)}
                            title="Stock this tile with creatures"
                            className={`text-[10px] rounded px-2 py-1 border ${
                              stocking?.id === t.id
                                ? 'bg-amber-700 border-amber-500 text-white'
                                : 'bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700'
                            }`}>Creatures</button>
                          <button type="button" onClick={() => deleteTile(t.id)}
                            title="Remove from the library — tiles already laid stay on their maps"
                            className="text-[10px] bg-red-800/80 hover:bg-red-700 text-white rounded px-2 py-1">Delete</button>
                        </div>
                        <EdgeChips tile={t} onToggle={(k, v) => patchTile(t.id, { [k]: v })} />
                      </div>
                    );
                  })}
                </div>
              );
            });
          })()}
          {stocking && (
            <TileSpawnModal
              tile={stocking}
              creatures={creatures}
              doorSprites={doorSprites}
              onSave={(spawns, doors) => saveTile(stocking.id, spawns, doors)}
              onClose={() => setStocking(null)}
            />
          )}
        </div>
        <datalist id="tile-categories">
          {CATEGORY_SUGGESTIONS.map((c) => <option key={c} value={c} />)}
        </datalist>
      </div>
    </div>
  );
}
