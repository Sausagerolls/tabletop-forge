import React, { useEffect } from 'react';
import { useAnchoredMenu } from '../utils/anchoredMenu.js';

// The GM's right-click menu for a tile already laid on the board.
//
// Lifting a tile is not just deleting a picture: the tile brought walls, doors
// and creatures with it, and all three have to go too or the board is left
// with sight blocked by walls nobody can see and monsters standing in a room
// that no longer exists.
//
// Two removes rather than one, because the right answer genuinely differs:
//
//   * The usual case is a misplaced tile — take the lot, including whatever it
//     spawned, which is what "remove the tokens on them" means.
//   * The other case is a tile laid correctly whose creatures are already in
//     play. Deleting a monster the party is mid-fight with is not recoverable,
//     so that is offered separately rather than as a surprise.
export default function TileMenu({ tile, x, y, onRemove, onClose }) {
  const a = useAnchoredMenu(x, y);

  // Same dismissal as the door and token menus — Escape, or a click anywhere
  // outside. Declared above the early return so the hook count never changes.
  useEffect(() => {
    if (!tile) return undefined;
    function onDown(e) {
      const root = a.ref.current;
      if (root && !root.contains(e.target)) onClose?.();
    }
    function onKey(e) { if (e.key === 'Escape') onClose?.(); }
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [tile, onClose, a.ref]);

  if (!tile) return null;

  const spawned = Number(tile.spawn_count) || 0;

  return (
    <div
      ref={a.ref}
      style={a.style}
      className={`fixed z-[95] bg-gray-900 border border-emerald-800 rounded-xl shadow-2xl overflow-hidden text-sm min-w-[210px] ${a.className}`}
    >
      <div className="px-3 py-1.5 text-[11px] uppercase tracking-wide text-emerald-400/80 border-b border-gray-700 flex items-center justify-between gap-2">
        <span className="truncate">Tile</span>
        <span className="text-gray-500 normal-case shrink-0">
          {tile.grid_w}×{tile.grid_h}
          {tile.rotation ? ` · ${tile.rotation}°` : ''}
        </span>
      </div>

      <button
        type="button"
        className="w-full px-4 py-2 text-left hover:bg-red-900 text-red-300"
        onClick={() => { onRemove?.(tile.id, false); onClose?.(); }}
      >
        Remove tile
        <span className="block text-[10px] text-gray-500 leading-tight">
          Takes its walls, doors{spawned
            ? ` and the ${spawned} creature${spawned === 1 ? '' : 's'} standing on it`
            : ' and anything standing on it'}
        </span>
      </button>

      <button
        type="button"
        className="w-full px-4 py-2 text-left hover:bg-gray-700 text-gray-300 border-t border-gray-800"
        onClick={() => { onRemove?.(tile.id, true); onClose?.(); }}
      >
        Remove, keep creatures
        <span className="block text-[10px] text-gray-500 leading-tight">
          Leaves every creature where it is
        </span>
      </button>
    </div>
  );
}
