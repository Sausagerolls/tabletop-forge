import React from 'react';

// Full-bleed scene art, shared by every player-facing surface: the map view,
// the TV/spectator view, and the lobby. Extracted because there were already
// two byte-identical copies of this and the lobby would have made three —
// three places to forget when the framing rules change.
//
// `contain` keeps the artwork whole (a cropped villain portrait is worse than
// letterboxing), and a blurred, over-scaled copy of the same image fills the
// bars so odd aspect ratios don't sit in dead black on a widescreen TV.
export default function BackdropLayer({ backdrop, className = '' }) {
  if (!backdrop?.image_path) return null;
  const url = `/uploads/${backdrop.image_path}`;
  return (
    <div className={`absolute inset-0 bg-black ${className}`}>
      <div
        className="absolute inset-0 scale-110 blur-2xl opacity-40"
        style={{ backgroundImage: `url(${url})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
      />
      <img
        src={url}
        alt={backdrop.name || 'Scene'}
        className="absolute inset-0 w-full h-full object-contain"
      />
    </div>
  );
}
