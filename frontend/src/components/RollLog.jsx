import React, { useEffect, useRef, useState } from 'react';

// RollLog — the session's dice and table results, newest at the bottom.
//
// Shared by the GM and the players so both read the same history in the same
// order. Each line carries the roller's colour, which is the same colour their
// ink uses on the map: one identity per person across the whole app.
//
// A dumb component. The socket lives in the view that mounts it.
// `side` places the whole cluster. The player view keeps it bottom-left, next
// to the dice button it belongs with; the GM's screen has that corner spoken
// for, so it stays bottom-right there.
//
// 'right-inset' is bottom-right shifted clear of the 3D view switch, which is
// a fixed 7rem-wide pill in the same corner. Sharing the corner at the same
// z-index meant whichever rendered last covered the other, and on the GM's
// screen that put the switch underneath this button.
// `rightInset` is how much of the right edge is already spoken for — the GM's
// panel, when it is open. The cluster shifts left by that much so an expanded
// panel doesn't bury the log button, in either view.
// `leftInset` is the mirror of `rightInset` for the bottom-LEFT variant: how
// much of that corner is already taken. The player view parks its Look-up box
// between the dice button and this cluster, and without the shift the two sat
// on top of each other — the log button over the search box, and the open log
// panel over all of it.
export default function RollLog({ entries = [], open, onToggle, canRoll = false, onQuickRoll, side = 'right', rightInset = 0, leftInset = 0 }) {
  const scrollRef = useRef(null);
  const [quick, setQuick] = useState('d20');

  // Pin to the newest entry, which is where attention goes when a roll lands.
  useEffect(() => {
    if (!open || !scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [entries.length, open]);

  const unseen = entries.length;

  return (
    <div
      className={`absolute bottom-4 z-[80] flex flex-col gap-1 pointer-events-none ${
        side === 'left' ? 'items-start' : 'items-end'
      }`}
      // Offsets come from a style rather than a class so an inset can be added
      // to them. 84px is the 5.25rem that clears the dice button; 136px is the
      // 8.5rem that clears the 3D view switch; 8px is the plain right-2.
      style={side === 'left'
        ? { left: 84 + leftInset }
        : { right: rightInset + (side === 'right-inset' ? 136 : 8) }}
    >
      {open && (
        <div className="pointer-events-auto w-72 max-w-[85vw] bg-gray-900/95 border border-gray-700 rounded-xl shadow-2xl backdrop-blur-sm overflow-hidden">
          <div className="flex items-center justify-between px-3 py-1.5 bg-gray-900 border-b border-gray-700">
            <span className="text-[11px] uppercase tracking-wider text-dnd-gold">Roll log</span>
            <span className="text-[11px] text-gray-500">{entries.length}</span>
          </div>

          <div ref={scrollRef} className="max-h-[45vh] overflow-y-auto px-2 py-1.5 space-y-1">
            {entries.length === 0 && (
              <p className="text-xs text-gray-500 italic px-1 py-2">Nothing rolled yet.</p>
            )}
            {entries.map((e) => (
              <div key={e.id} className="text-xs leading-snug">
                <div className="flex items-baseline gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: e.color || '#9ca3af' }} />
                  <span className="font-semibold truncate" style={{ color: e.color || '#e5e7eb' }}>{e.userName}</span>
                  {e.secret && <span className="text-[9px] uppercase tracking-wide text-purple-300">secret</span>}
                  <span className="ml-auto text-[10px] text-gray-600 shrink-0">
                    {new Date(e.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                {e.kind === 'table' ? (
                  <div className="pl-3 text-gray-300">
                    <span className="text-gray-500">{e.tableName}:</span>{' '}
                    <span className="text-gray-100">{e.result}</span>
                    <span className="text-[10px] text-gray-600"> ({e.total}/{e.outOf})</span>
                  </div>
                ) : (
                  <div className="pl-3 text-gray-300">
                    {e.label && <span className="text-gray-500">{e.label}: </span>}
                    <span className="text-dnd-gold font-semibold">{e.total}</span>
                    <span className="text-[10px] text-gray-500">
                      {' '}({e.count}{e.dice}
                      {e.modifier ? (e.modifier > 0 ? `+${e.modifier}` : e.modifier) : ''}
                      {e.rolls && e.rolls.length > 1 ? ` → ${e.rolls.join(', ')}` : ''}
                      {/* Which of the two counted — the table should not have to
                          guess whether a pair was advantage or disadvantage. */}
                      {e.mode ? ` ${e.mode === 'advantage' ? 'adv' : 'dis'}, kept ${e.kept}` : ''})
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {canRoll && (
            <div className="flex items-center gap-1 px-2 py-1.5 border-t border-gray-800 bg-gray-900">
              <select
                value={quick}
                onChange={(ev) => setQuick(ev.target.value)}
                className="bg-gray-800 border border-gray-700 rounded px-1.5 py-1 text-xs text-gray-200"
              >
                {['d4','d6','d8','d10','d12','d20','d100'].map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              <button
                type="button"
                onClick={() => onQuickRoll?.(quick)}
                className="flex-1 text-xs bg-dnd-gold hover:bg-yellow-500 text-gray-900 rounded px-2 py-1 font-semibold"
              >
                Roll
              </button>
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={onToggle}
        title={open ? 'Hide roll log' : 'Show roll log'}
        className="pointer-events-auto flex items-center gap-1.5 bg-gray-900/95 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-gray-300 hover:text-white shadow-lg"
      >
        <span className="text-dnd-gold">🎲</span>
        {open ? 'Log' : `Log${unseen ? ` (${unseen})` : ''}`}
      </button>
    </div>
  );
}
