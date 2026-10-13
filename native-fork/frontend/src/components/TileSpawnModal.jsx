import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ALL_CONDITIONS } from '../utils/conditions.js';
import { DOOR_MOTIONS, DOOR_MOTION_LABELS } from '../utils/doorMotion.js';

// Stocking a tile with creatures — the full version.
//
// The first cut of this was a 260px strip with a name dropdown: pick a
// creature, click the tile, done. It answered "which monster, and where" and
// nothing else, so every other decision — who is bloodied, who is hiding, what
// this one is called — had to be made at the table, by hand, on tokens the
// players were already looking at.
//
// This is the same idea at the size the job actually needs: the tile big
// enough to aim at, the whole creature library beside it rather than folded
// into a dropdown, and the state a token can hold on the right. What is
// prepared here is what appears when the tile is laid.
//
// Everything is a DRAFT until Save. The tile is a library entry that may be
// laid many times, so a half-finished edit must not be able to leak onto a
// board mid-session.

const SIZES = ['tiny', 'small', 'medium', 'large', 'huge', 'gargantuan'];
const VISION = ['normal', 'darkvision', 'blindsight', 'truesight'];
const FOOTPRINT = { tiny: 0.5, small: 1, medium: 1, large: 2, huge: 3, gargantuan: 4 };

// Mirrors doorwayOnTileEdge on the server. Only used to EXPLAIN the rule here
// — the server decides — but a GM who cannot see which openings are edges
// cannot predict what laying the tile will do.
function onEdge(d, tile, eps = 0.15) {
  const p = (d?.points || []).map(Number);
  if (p.length < 4) return false;
  const near = (a, b) => Math.abs(a - b) <= eps;
  return (near(p[0], 0) && near(p[2], 0)) || (near(p[0], tile.grid_w) && near(p[2], tile.grid_w))
      || (near(p[1], 0) && near(p[3], 0)) || (near(p[1], tile.grid_h) && near(p[3], tile.grid_h));
}

// What one spawn is, once the creature's own values are filled in behind it.
// The editor shows the creature's number as a PLACEHOLDER and stores nothing
// until the GM types over it, so a goblin whose statblock later changes still
// follows it.
function effective(sp, cr) {
  const maxHp = sp.max_hp ?? cr?.hit_points ?? 1;
  return {
    maxHp,
    curHp: sp.current_hp ?? maxHp,
    size: sp.size ?? cr?.size ?? 'medium',
    foot: Number(sp.size_squares ?? cr?.size_squares ?? FOOTPRINT[sp.size ?? cr?.size ?? 'medium'] ?? 1),
  };
}

export default function TileSpawnModal({ tile, creatures, doorSprites = [], onSave, onClose }) {
  const [rows, setRows] = useState(() => (Array.isArray(tile.spawns) ? tile.spawns.map((r) => ({ ...r })) : []));
  const [sel, setSel] = useState(null);        // index into rows
  const [picked, setPicked] = useState(null);  // creature id armed for placing
  const [q, setQ] = useState('');
  const [dirty, setDirty] = useState(false);
  // Creatures and doorways are both "what this tile brings with it", so they
  // live in one editor over one picture rather than two panels that each show
  // half the tile.
  const [tab, setTab] = useState('creatures');
  const [doors, setDoors] = useState(() => (Array.isArray(tile.geometry?.doors)
    ? tile.geometry.doors.map((d) => ({ ...d })) : []));
  const [selDoor, setSelDoor] = useState(null);
  const [saving, setSaving] = useState(false);
  const boardRef = useRef(null);
  const dragRef = useRef(null);

  const byId = useMemo(() => new Map((creatures || []).map((c) => [c.id, c])), [creatures]);
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    const list = creatures || [];
    return t ? list.filter((c) => (c.name || '').toLowerCase().includes(t)) : list;
  }, [creatures, q]);

  const patch = (i, next) => {
    setRows((p) => p.map((r, j) => (j === i ? { ...r, ...next } : r)));
    setDirty(true);
  };
  // Clearing a field means "use the creature's value again", which is a
  // different thing from storing a zero — so the key is removed, not blanked.
  const unset = (i, key) => {
    setRows((p) => p.map((r, j) => {
      if (j !== i) return r;
      const c = { ...r }; delete c[key]; return c;
    }));
    setDirty(true);
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); close(); }
      if ((e.key === 'Delete' || e.key === 'Backspace') && sel != null
          && !/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) {
        setRows((p) => p.filter((_, j) => j !== sel)); setSel(null); setDirty(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  function close() {
    // Losing a stocked room to a stray Escape would be infuriating, and this
    // is the only exit that can do it.
    if (dirty && !window.confirm('Discard the changes to this tile?')) return;
    onClose?.();
  }

  // Where a click landed, in tile squares.
  function atEvent(e) {
    const r = boardRef.current.getBoundingClientRect();
    return {
      col: ((e.clientX - r.left) / r.width) * tile.grid_w,
      row: ((e.clientY - r.top) / r.height) * tile.grid_h,
    };
  }

  function placeAt(e) {
    if (!picked) return;
    const { col, row } = atEvent(e);
    // Snapped to the centre of a square: a token stands IN a square, not on
    // the line between two.
    setRows((p) => [...p, { creature_id: picked, col: Math.floor(col) + 0.5, row: Math.floor(row) + 0.5 }]);
    setSel(rows.length);
    setDirty(true);
  }

  // Dragging a placed token. Free while the pointer is down, snapped on
  // release, so it can be nudged into a corner by eye.
  function startDrag(e, i) {
    e.stopPropagation();
    e.preventDefault();
    setSel(i);
    dragRef.current = { i, moved: false };
    const move = (ev) => {
      if (!dragRef.current) return;
      dragRef.current.moved = true;
      const { col, row } = atEvent(ev);
      patch(dragRef.current.i, {
        col: Math.max(0, Math.min(tile.grid_w, col)),
        row: Math.max(0, Math.min(tile.grid_h, row)),
      });
    };
    const up = () => {
      const d = dragRef.current;
      dragRef.current = null;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      if (d?.moved) {
        setRows((p) => p.map((r, j) => (j === d.i
          ? { ...r, col: Math.floor(r.col) + 0.5, row: Math.floor(r.row) + 0.5 }
          : r)));
      }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  const patchDoor = (i, next) => {
    setDoors((p) => p.map((d, j) => (j === i ? { ...d, ...next } : d)));
    setDirty(true);
  };
  // Handing a doorway back to the global default is a real choice, distinct
  // from picking art, so it clears the key rather than storing an empty one.
  const clearDoorSprite = (i) => {
    setDoors((p) => p.map((d, j) => {
      if (j !== i) return d;
      const c = { ...d }; delete c.sprite_path; return c;
    }));
    setDirty(true);
  };

  // Removing a doorway from the TILE, not from a board. An imported tile often
  // arrives with openings the GM has no use for, and they would otherwise be
  // permanent.
  const removeDoor = (i) => {
    setDoors((p) => p.filter((_, j) => j !== i));
    setSelDoor(null);
    setDirty(true);
  };

  const cur = sel != null ? rows[sel] : null;
  const curCr = cur ? byId.get(cur.creature_id) : null;
  const eff = cur ? effective(cur, curCr) : null;

  // A number the GM has not overridden shows the creature's value as a
  // placeholder rather than a filled-in box, so "inherited" and "set to the
  // same number" stay tellable apart.
  const NumField = ({ label, k, min, max, step = 1, placeholder }) => (
    <label className="flex items-center justify-between gap-2">
      <span className="text-[11px] text-gray-400">{label}</span>
      <span className="flex items-center gap-1">
        <input
          type="number" min={min} max={max} step={step}
          value={cur[k] ?? ''}
          placeholder={placeholder != null ? String(placeholder) : ''}
          onChange={(e) => (e.target.value === ''
            ? unset(sel, k)
            : patch(sel, { [k]: Number(e.target.value) }))}
          className="w-20 bg-gray-800 border border-gray-600 rounded px-1.5 py-0.5 text-xs text-white text-right"
        />
        {cur[k] != null && (
          <button type="button" onClick={() => unset(sel, k)}
            title="Use the creature's own value" className="text-[10px] text-gray-500 hover:text-amber-300">↺</button>
        )}
      </span>
    </label>
  );

  const Check = ({ label, k }) => (
    <label className="flex items-center gap-2 text-[11px] text-gray-300">
      <input type="checkbox" checked={!!cur[k]} onChange={(e) => patch(sel, { [k]: e.target.checked })} />
      {label}
    </label>
  );

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4"
         onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div className="bg-gray-900 border border-amber-800/70 rounded-2xl shadow-2xl w-full max-w-[1200px] h-[88vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-700 shrink-0">
          <div>
            <h2 className="text-dnd-gold font-semibold">Stocking {tile.name}</h2>
            <p className="text-[11px] text-gray-500">
              {tile.grid_w}×{tile.grid_h} squares · what you set here is what appears when the tile is laid
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg overflow-hidden border border-gray-700">
              {['creatures', 'doors'].map((t) => (
                <button
                  key={t} type="button" onClick={() => setTab(t)}
                  className={`px-3 py-1 text-xs capitalize ${
                    tab === t ? 'bg-amber-800/70 text-amber-100' : 'bg-gray-800 text-gray-400 hover:text-gray-200'
                  }`}
                >{t}{t === 'doors' && doors.length ? ` (${doors.length})` : ''}</button>
              ))}
            </div>
            <button onClick={close} className="text-gray-400 hover:text-white text-xl leading-none px-2">×</button>
          </div>
        </div>

        <div className="flex-1 flex min-h-0">
          {/* ── The library ─────────────────────────────────────────── */}
          <div className={`w-56 shrink-0 border-r border-gray-700 flex-col min-h-0 ${tab === 'creatures' ? 'flex' : 'hidden'}`}>
            <div className="p-2 shrink-0">
              <input
                value={q} onChange={(e) => setQ(e.target.value)}
                placeholder="Search creatures…"
                className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-white"
              />
            </div>
            <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1">
              {shown.length === 0 && (
                <p className="text-[11px] text-gray-500 italic px-1">
                  {(creatures || []).length ? 'Nothing matches.' : 'No creatures in the library yet.'}
                </p>
              )}
              {shown.map((c) => (
                <button
                  key={c.id} type="button"
                  onClick={() => setPicked(picked === c.id ? null : c.id)}
                  className={`w-full flex items-center gap-2 rounded px-1.5 py-1 text-left transition-colors ${
                    picked === c.id ? 'bg-amber-900/60 ring-1 ring-amber-500' : 'hover:bg-gray-800'
                  }`}
                >
                  <span className="w-7 h-7 rounded bg-gray-800 overflow-hidden shrink-0 flex items-center justify-center">
                    {c.image_path
                      ? <img src={`/uploads/${c.image_path}`} alt="" className="w-full h-full object-cover" />
                      : <span className="text-[9px] text-gray-500">{(c.name || '?').slice(0, 2)}</span>}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs text-gray-200 truncate">{c.name}</span>
                    <span className="block text-[10px] text-gray-500">{c.size || 'medium'} · {c.hit_points ?? '?'} hp</span>
                  </span>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-gray-500 px-2 pb-2 shrink-0">
              {picked ? 'Now click the tile to place it.' : 'Pick a creature to place.'}
            </p>
          </div>

          {tab === 'doors' && (
            <div className="w-56 shrink-0 border-r border-gray-700 overflow-y-auto p-2 space-y-1">
              {doors.length === 0 && (
                <p className="text-[11px] text-gray-500 italic">
                  This tile has no doorways. They come from the walls imported with it.
                </p>
              )}
              {doors.map((d, i) => (
                <button
                  key={i} type="button" onClick={() => setSelDoor(i)}
                  className={`w-full text-left rounded px-2 py-1.5 transition-colors ${
                    selDoor === i ? 'bg-amber-900/60 ring-1 ring-amber-500' : 'hover:bg-gray-800'
                  }`}
                >
                  <span className="block text-xs text-gray-200">
                    {d.kind === 'window' ? 'Window' : 'Door'} {i + 1}
                  </span>
                  <span className="block text-[10px] text-gray-500">
                    {d.sprite_motion === 'secret'
                      ? 'Secret — looks like wall'
                      : (DOOR_MOTION_LABELS[d.sprite_motion] || 'Default')}
                    {d.sprite_path ? ' · own art' : ''}
                  </span>
                  {onEdge(d, tile) && (
                    <span className="block text-[10px] text-sky-400/80">on the edge — needs a match</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* ── The tile ────────────────────────────────────────────── */}
          <div className="flex-1 min-w-0 flex items-center justify-center p-4 bg-gray-950/60">
            <div
              ref={boardRef}
              onClick={placeAt}
              style={{
                aspectRatio: `${tile.grid_w} / ${tile.grid_h}`,
                backgroundImage: `url(/uploads/${tile.image_path})`,
                backgroundSize: '100% 100%',
                maxHeight: '100%', maxWidth: '100%',
                width: tile.grid_w >= tile.grid_h ? '100%' : 'auto',
                height: tile.grid_h > tile.grid_w ? '100%' : 'auto',
              }}
              className={`relative rounded border border-gray-600 select-none ${picked ? 'cursor-crosshair' : ''}`}
            >
              <svg className="absolute inset-0 w-full h-full pointer-events-none"
                   viewBox={`0 0 ${tile.grid_w} ${tile.grid_h}`} preserveAspectRatio="none">
                {Array.from({ length: Math.max(0, tile.grid_w - 1) }, (_, i) => (
                  <line key={`v${i}`} x1={i + 1} y1={0} x2={i + 1} y2={tile.grid_h} stroke="rgba(0,0,0,0.35)" strokeWidth={0.03} />
                ))}
                {Array.from({ length: Math.max(0, tile.grid_h - 1) }, (_, i) => (
                  <line key={`h${i}`} x1={0} y1={i + 1} x2={tile.grid_w} y2={i + 1} stroke="rgba(0,0,0,0.35)" strokeWidth={0.03} />
                ))}
              </svg>

              {/* The doorways, over the art. Only pickable on the Doors tab,
                  so they cannot swallow a click meant for placing a monster. */}
              {doors.length > 0 && (
                <svg
                  className="absolute inset-0 w-full h-full"
                  style={{ pointerEvents: tab === 'doors' ? 'auto' : 'none' }}
                  viewBox={`0 0 ${tile.grid_w} ${tile.grid_h}`}
                  preserveAspectRatio="none"
                >
                  {doors.map((d, i) => {
                    const p = d.points || [];
                    if (p.length < 4) return null;
                    const secret = d.sprite_motion === 'secret';
                    return (
                      <line
                        key={i}
                        x1={p[0]} y1={p[1]} x2={p[2]} y2={p[3]}
                        stroke={selDoor === i && tab === 'doors' ? '#fbbf24' : (secret ? '#c084fc' : '#38bdf8')}
                        strokeWidth={selDoor === i && tab === 'doors' ? 0.42 : 0.28}
                        strokeLinecap="round"
                        strokeDasharray={secret ? '0.3 0.2' : undefined}
                        opacity={tab === 'doors' ? 0.95 : 0.45}
                        style={{ cursor: tab === 'doors' ? 'pointer' : 'default' }}
                        onClick={(ev) => { ev.stopPropagation(); setSelDoor(i); }}
                      />
                    );
                  })}
                </svg>
              )}

              {rows.map((sp, i) => {
                const c = byId.get(sp.creature_id);
                const e = effective(sp, c);
                const pct = (e.foot / tile.grid_w) * 100;
                const hurt = e.curHp < e.maxHp;
                return (
                  <button
                    key={i} type="button"
                    onPointerDown={(ev) => startDrag(ev, i)}
                    onClick={(ev) => { ev.stopPropagation(); setSel(i); }}
                    title={sp.nickname || c?.name || 'Creature'}
                    style={{
                      left: `${(sp.col / tile.grid_w) * 100}%`,
                      top: `${(sp.row / tile.grid_h) * 100}%`,
                      width: `${pct}%`, height: `${(e.foot / tile.grid_h) * 100}%`,
                    }}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full overflow-hidden bg-gray-900 shadow cursor-move border-2 ${
                      sel === i ? 'border-amber-300 ring-2 ring-amber-400/70 z-10' : 'border-gray-800/80'
                    }`}
                  >
                    {c?.image_path
                      ? <img src={`/uploads/${c.image_path}`} alt="" className="w-full h-full object-cover pointer-events-none" />
                      : <span className="text-[9px] text-amber-200">{(c?.name || '?').slice(0, 2)}</span>}
                    {hurt && <span className="absolute bottom-0 inset-x-0 h-[3px] bg-red-500/80 pointer-events-none" />}
                    {!!sp.conditions?.length && (
                      <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-purple-400 pointer-events-none" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── The selected creature ───────────────────────────────── */}
          <div className="w-72 shrink-0 border-l border-gray-700 overflow-y-auto">
            {tab === 'doors' ? (
              selDoor == null || !doors[selDoor] ? (
                <p className="text-[11px] text-gray-500 italic p-3">
                  Pick a doorway — on the tile or in the list — to say what it is.
                </p>
              ) : (
                <div className="p-3 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-200 flex-1">
                      {doors[selDoor].kind === 'window' ? 'Window' : 'Door'} {selDoor + 1}
                    </span>
                    <button
                      type="button" onClick={() => removeDoor(selDoor)}
                      className="text-[11px] px-2 py-1 rounded bg-red-900/60 hover:bg-red-800 text-red-300"
                      title="Take this opening off the tile altogether"
                    >Delete</button>
                  </div>

                  {onEdge(doors[selDoor], tile) && (
                    <p className="text-[10px] text-sky-300 bg-sky-950/40 border border-sky-800/60 rounded p-2 leading-snug">
                      This opening is on the tile's edge, so it only becomes a door when the tile
                      laid against it has an opening in the same place. On its own it stays an
                      open archway rather than a door onto nothing.
                    </p>
                  )}

                  <label className="block">
                    <span className="text-[11px] text-gray-400">Behaviour</span>
                    <select
                      value={doors[selDoor].sprite_motion || ''}
                      onChange={(e) => (e.target.value
                        ? patchDoor(selDoor, { sprite_motion: e.target.value })
                        : patchDoor(selDoor, { sprite_motion: undefined }))}
                      className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-white"
                    >
                      <option value="">Default for new doors</option>
                      {DOOR_MOTIONS.map((m) => (
                        <option key={m} value={m}>{DOOR_MOTION_LABELS[m] || m}</option>
                      ))}
                    </select>
                  </label>

                  {doors[selDoor].sprite_motion === 'secret' && (
                    <p className="text-[10px] text-purple-300 bg-purple-950/40 border border-purple-800/60 rounded p-2 leading-snug">
                      Drawn as plain wall to players, in 2D and 3D, and they cannot click it open.
                      You see it marked in purple. Opening it leaves a gap in the wall.
                    </p>
                  )}

                  <div>
                    <span className="text-[11px] text-gray-400 block mb-1">Art</span>
                    <div className="grid grid-cols-4 gap-1.5">
                      <button
                        type="button" onClick={() => clearDoorSprite(selDoor)}
                        className={`aspect-square rounded border text-[9px] text-gray-400 ${
                          doors[selDoor].sprite_path == null
                            ? 'border-amber-400 ring-1 ring-amber-400/60 bg-gray-800'
                            : 'border-gray-700 bg-gray-900 hover:border-gray-500'
                        }`}
                      >default</button>
                      {(doorSprites || []).map((sp) => {
                        const on = doors[selDoor].sprite_path === sp.image_path;
                        return (
                          <button
                            key={sp.id} type="button" title={sp.name}
                            onClick={() => patchDoor(selDoor, { sprite_path: sp.image_path })}
                            className={`aspect-square rounded border bg-gray-900 overflow-hidden flex items-center justify-center ${
                              on ? 'border-amber-400 ring-1 ring-amber-400/60' : 'border-gray-700 hover:border-gray-500'
                            }`}
                          >
                            <img src={`/uploads/${sp.image_path}`} alt="" className="max-w-full max-h-full object-contain" />
                          </button>
                        );
                      })}
                    </div>
                    {doors[selDoor].sprite_motion === 'secret' && (
                      <p className="text-[10px] text-gray-500 mt-1 leading-snug">
                        A secret door never shows its art while shut — this only matters if you
                        change it back to an ordinary door later.
                      </p>
                    )}
                  </div>

                  <label className="flex items-center justify-between gap-2 border-t border-gray-800 pt-2">
                    <span className="text-[11px] text-gray-400">Opening is a</span>
                    <select
                      value={doors[selDoor].kind === 'window' ? 'window' : 'door'}
                      onChange={(e) => patchDoor(selDoor, { kind: e.target.value })}
                      className="bg-gray-800 border border-gray-600 rounded px-1.5 py-0.5 text-xs text-white"
                    >
                      <option value="door">Door</option>
                      <option value="window">Window</option>
                    </select>
                  </label>
                </div>
              )
            ) : !cur ? (
              <p className="text-[11px] text-gray-500 italic p-3">
                Select a placed creature to give it a name, wounds, or conditions.
              </p>
            ) : (
              <div className="p-3 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-9 h-9 rounded bg-gray-800 overflow-hidden shrink-0">
                    {curCr?.image_path && <img src={`/uploads/${curCr.image_path}`} alt="" className="w-full h-full object-cover" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-gray-200 truncate">{curCr?.name || 'Unknown creature'}</div>
                    <div className="text-[10px] text-gray-500">square {Math.floor(cur.col)}, {Math.floor(cur.row)}</div>
                  </div>
                  <button type="button"
                    onClick={() => { setRows((p) => p.filter((_, j) => j !== sel)); setSel(null); setDirty(true); }}
                    className="text-[11px] px-2 py-1 rounded bg-red-900/60 hover:bg-red-800 text-red-300">Remove</button>
                </div>

                <label className="block">
                  <span className="text-[11px] text-gray-400">Nickname</span>
                  <input
                    value={cur.nickname ?? ''}
                    onChange={(e) => (e.target.value ? patch(sel, { nickname: e.target.value }) : unset(sel, 'nickname'))}
                    placeholder={curCr?.name || ''}
                    maxLength={255}
                    className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-white"
                  />
                </label>

                <div className="space-y-1.5 border-t border-gray-800 pt-2">
                  <NumField label="Current HP" k="current_hp" min={0} max={100000} placeholder={eff.maxHp} />
                  <NumField label="Max HP" k="max_hp" min={1} max={100000} placeholder={curCr?.hit_points} />
                  <NumField label="Temp HP" k="temp_hp" min={0} max={100000} placeholder={0} />
                  <NumField label="Exhaustion" k="exhaustion" min={0} max={6} placeholder={0} />
                </div>

                <div className="border-t border-gray-800 pt-2">
                  <span className="text-[11px] text-gray-400 block mb-1">Conditions</span>
                  <div className="flex flex-wrap gap-1">
                    {ALL_CONDITIONS.map((cond) => {
                      const on = (cur.conditions || []).includes(cond);
                      return (
                        <button
                          key={cond} type="button"
                          onClick={() => {
                            const list = new Set(cur.conditions || []);
                            on ? list.delete(cond) : list.add(cond);
                            const next = [...list];
                            next.length ? patch(sel, { conditions: next }) : unset(sel, 'conditions');
                          }}
                          className={`text-[10px] px-1.5 py-0.5 rounded border capitalize ${
                            on ? 'bg-purple-900/70 border-purple-500 text-purple-100'
                               : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
                          }`}
                        >{cond}</button>
                      );
                    })}
                  </div>
                </div>

                <div className="border-t border-gray-800 pt-2 space-y-1.5">
                  <label className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-gray-400">Size</span>
                    <select
                      value={cur.size ?? ''}
                      onChange={(e) => (e.target.value ? patch(sel, { size: e.target.value }) : unset(sel, 'size'))}
                      className="bg-gray-800 border border-gray-600 rounded px-1.5 py-0.5 text-xs text-white capitalize"
                    >
                      <option value="">{curCr?.size || 'medium'} (creature)</option>
                      {SIZES.map((z) => <option key={z} value={z}>{z}</option>)}
                    </select>
                  </label>
                  <NumField label="Footprint (squares)" k="size_squares" min={0.25} max={8} step={0.25}
                            placeholder={curCr?.size_squares ?? FOOTPRINT[eff.size] ?? 1} />
                </div>

                <div className="border-t border-gray-800 pt-2 space-y-1.5">
                  <label className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-gray-400">Vision</span>
                    <select
                      value={cur.vision_type ?? ''}
                      onChange={(e) => (e.target.value ? patch(sel, { vision_type: e.target.value }) : unset(sel, 'vision_type'))}
                      className="bg-gray-800 border border-gray-600 rounded px-1.5 py-0.5 text-xs text-white capitalize"
                    >
                      <option value="">default</option>
                      {VISION.map((v) => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </label>
                  <NumField label="Vision range (ft)" k="vision_range" min={0} max={1000} step={5} placeholder={0} />
                  <NumField label="Light — bright (ft)" k="token_light_bright" min={0} max={1000} step={5} placeholder={0} />
                  <NumField label="Light — dim (ft)" k="token_light_dim" min={0} max={1000} step={5} placeholder={0} />
                </div>

                <div className="border-t border-gray-800 pt-2 grid grid-cols-2 gap-1.5">
                  <Check label="Hidden" k="is_hidden" />
                  <Check label="Flying" k="is_flying" />
                  <Check label="Hide name" k="hide_name_from_players" />
                  <Check label="Hide HP" k="hide_hp_from_players" />
                  <Check label="In combat" k="in_combat" />
                </div>
                <NumField label="Elevation (ft)" k="elevation" min={-1000} max={1000} step={5} placeholder={0} />
                <NumField label="Initiative" k="initiative" min={-50} max={100} placeholder={0} />
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 px-4 py-2.5 border-t border-gray-700 shrink-0">
          <span className="text-[11px] text-gray-500 flex-1">
            {tab === 'creatures'
              ? `${rows.length} creature${rows.length === 1 ? '' : 's'} · drag to reposition · Delete removes the selected one`
              : `${doors.length} doorway${doors.length === 1 ? '' : 's'} on this tile · click one on the tile to set what it is`}
          </span>
          <button type="button" onClick={close}
            className="text-xs px-3 py-1.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-300">Cancel</button>
          <button
            type="button"
            disabled={saving}
            onClick={async () => {
              // Awaited, so a save that fails leaves the editor open with the
              // work still in it rather than closing over a lost edit.
              setSaving(true);
              try {
                const done = await onSave(rows, doors);
                if (done !== false) { setDirty(false); onClose?.(); }
              } finally { setSaving(false); }
            }}
            className="text-xs bg-dnd-gold hover:bg-yellow-400 disabled:opacity-60 text-gray-900 font-semibold rounded px-4 py-1.5">
            {saving ? 'Saving…' : 'Save tile'}
          </button>
        </div>
      </div>
    </div>
  );
}
