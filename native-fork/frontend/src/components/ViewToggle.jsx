import React from 'react';

// ViewToggle — the 2D ⇄ 3D switch.
//
// A sliding switch rather than a button that opens a screen: the two are the
// same map seen two ways, and the control should say so. The knob carries the
// active label and slides between the halves, so the state is readable at a
// glance without reading any text.
//
// Deliberately one component shared by both views. It's rendered ABOVE the 3D
// overlay by its owner, so the switch never disappears into the thing it
// switches — the same pixels flip you back.
export default function ViewToggle({ is3D, onChange, disabled = false, title }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={is3D}
      aria-label="Toggle 3D view"
      disabled={disabled}
      title={title || (is3D ? 'Back to the flat map' : 'Open the 3D view')}
      onClick={() => onChange(!is3D)}
      className="relative h-12 w-28 rounded-full bg-gray-900/95 border border-gray-700 shadow-lg disabled:opacity-40 disabled:cursor-not-allowed overflow-hidden"
    >
      {/* The knob. Transform rather than left, so the slide is composited. */}
      <span
        className={`absolute top-1 left-1 h-10 w-[3.25rem] rounded-full bg-dnd-gold transition-transform duration-200 ease-out ${
          is3D ? 'translate-x-[3.25rem]' : 'translate-x-0'
        }`}
      />
      {/* Both labels sit still; the knob moves under whichever is live, and
          the active one inverts against it. */}
      <span className="absolute inset-0 flex items-center text-sm font-bold">
        <span className={`flex-1 text-center transition-colors ${is3D ? 'text-gray-500' : 'text-gray-900'}`}>2D</span>
        <span className={`flex-1 text-center transition-colors ${is3D ? 'text-gray-900' : 'text-gray-500'}`}>3D</span>
      </span>
    </button>
  );
}
