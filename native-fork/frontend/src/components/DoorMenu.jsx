import React, { useEffect } from 'react';
import { useAnchoredMenu } from '../utils/anchoredMenu.js';
import { DOOR_MOTIONS, DOOR_MOTION_LABELS, doorMotion } from '../utils/doorMotion.js';

// The GM's right-click menu for a door: open/close, swing direction, whether
// it is really a window, which sprite it wears, and delete.
//
// Extracted from MapStage because the 3D view needs the same menu. It was
// unreachable there — the flat map's copy lives inside MapStage, which the 3D
// view does not render, so right-clicking a door in 3D did nothing at all for
// the GM while players could still work them. Rebuilding it beside the 3D
// board would have made two copies of a menu that has to keep listing the same
// sprites and offering the same actions, and the one that got edited would
// have been whichever the next change happened to touch.
//
// Presentational only: it takes the door row and hands clicks back. Both
// callers already own these actions.
export default function DoorMenu({
  door,
  doorSprites = [],
  x,
  y,
  onToggle,
  onFlip,
  onKindSet,
  onSpriteSet,
  onDelete,
  onClose,
  menuRef = null,
}) {
  // Placed by the same hook the token and terrain menus use, which measures
  // the menu and slides it to fit. This menu grows with the sprite list, so
  // the old hand-rolled `left/top` put its lower half off-screen as soon as a
  // GM had uploaded a few — the exact failure that hook exists to end.
  const a = useAnchoredMenu(x, y);

  // Close on Escape and on any outside click — the same dismissal the token
  // and terrain context menus use, so all three behave alike. Mousedown rather
  // than click, so the menu goes before whatever gesture follows begins.
  //
  // Declared BEFORE the early return: bailing out above a hook would change
  // how many run between renders, which React treats as an error the moment a
  // door menu opens after a null one.
  // Tested against this menu's OWN node, not a lookup by id. The flat map
  // stays mounted underneath the 3D overlay, so a menu left open in 2D and a
  // second one opened in 3D would both be in the document at once — with an
  // id, whichever rendered first would answer for both, and the other would
  // dismiss itself on its own clicks.
  useEffect(() => {
    if (!door) return undefined;
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
  }, [door, onClose, a.ref]);

  if (!door) return null;

  const d = door;
  const motion = doorMotion(d);
  const close = () => onClose?.();

  return (
    <div
      ref={(node) => {
        a.ref.current = node;
        if (menuRef) menuRef.current = node;
      }}
      style={a.style}
      // z-[95] is the level the other right-click menus sit at, which is what
      // carries it above the 3D overlay's fixed z-70 sheet. At the old z-80 it
      // would have opened behind the board it was describing.
      className={`fixed z-[95] bg-gray-900 border border-amber-700 rounded-xl shadow-2xl overflow-hidden text-sm min-w-[200px] ${a.className}`}
    >
      <div className="px-3 py-1.5 text-[11px] uppercase tracking-wide text-amber-500/80 border-b border-gray-700 truncate max-w-[220px]">{d.label ? d.label : 'Door'}</div>
      <button className="w-full px-4 py-2 text-left hover:bg-gray-700 text-gray-200"
        onClick={() => { onToggle?.(d.id); close(); }}>
        {d.is_open ? 'Close door' : 'Open door'}
      </button>
      <button className="w-full px-4 py-2 text-left hover:bg-gray-700 text-gray-200"
        onClick={() => { onFlip?.(d.id); close(); }}>
        Flip swing direction
      </button>
      {/* Door or window. The importer guesses from the geometry — a
          portal with a room on one side and open air on the other is
          taken for a window — and this is where that guess gets
          corrected. A window is seen through and never opens. */}
      <button className="w-full px-4 py-2 text-left hover:bg-gray-700 text-gray-200 flex items-center justify-between gap-3"
        onClick={() => { onKindSet?.(d.id, d.portal_kind === 'window' ? 'door' : 'window'); close(); }}>
        <span>{d.portal_kind === 'window' ? 'Make it a door' : 'Make it a window'}</span>
        <span className="text-[10px] text-gray-500">{d.portal_kind === 'window' ? 'window' : 'door'}</span>
      </button>
      {/* Motion is offered whatever art the door has. It used to be hidden
          unless the door had a sprite, which put it out of reach for exactly
          the doors that need it most: an imported one has no sprite and no
          leaf worth watching move. */}
      <div className="px-3 py-2">
        <div className="text-gray-400 text-xs mb-1">When open</div>
        <div className="flex items-center gap-1 flex-wrap">
          {DOOR_MOTIONS.map((m) => (
            <button key={m}
              title={m === 'vanish'
                ? 'Draw nothing while the door is open — no leaf to clip through the wall'
                : undefined}
              className={`text-[11px] px-2 py-1 rounded ${motion === m ? 'bg-amber-700 text-amber-100' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
              onClick={() => { onSpriteSet?.({ doorId: d.id, spritePath: d.sprite_path || null, spriteMotion: m }); close(); }}>
              {DOOR_MOTION_LABELS[m]}
            </button>
          ))}
        </div>
      </div>
      <div className="px-3 py-1.5 text-[11px] uppercase tracking-wide text-amber-500/80 border-t border-gray-700">Sprite</div>
      <button className={`w-full px-4 py-2 text-left hover:bg-gray-700 ${!d.sprite_path ? 'text-amber-300' : 'text-gray-300'}`}
        onClick={() => { onSpriteSet?.({ doorId: d.id, spritePath: null, spriteMotion: motion }); close(); }}>
        None (schematic)
      </button>
      {doorSprites.map((s) => (
        <button key={s.id}
          className={`w-full px-4 py-2 text-left hover:bg-gray-700 flex items-center gap-2 ${d.sprite_path === s.image_path ? 'text-amber-300' : 'text-gray-300'}`}
          onClick={() => { onSpriteSet?.({ doorId: d.id, spritePath: s.image_path, spriteMotion: motion }); close(); }}>
          <img src={`/uploads/${s.image_path}`} alt="" className="w-6 h-6 object-contain shrink-0" />
          <span className="truncate">{s.name}</span>
        </button>
      ))}
      {doorSprites.length === 0 && (
        <div className="px-4 py-2 text-xs text-gray-500 italic">No sprites. Upload some in the Walls &amp; Doors panel.</div>
      )}
      <button className="w-full px-4 py-2 text-left hover:bg-red-900 text-red-300 border-t border-gray-700"
        onClick={() => { onDelete?.(d.id); close(); }}>
        Delete door
      </button>
    </div>
  );
}
