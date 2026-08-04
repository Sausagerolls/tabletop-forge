// ImageFramer — square crop / pan / zoom for creature artwork.
//
// Tokens render as circles and every other portrait site uses
// object-cover on a square-ish box, so a portrait whose subject sits
// away from the centre (most of them — faces are near the top) loses
// its head. This lets the GM frame the shot before it's saved.
//
// The framing is BAKED INTO THE UPLOADED FILE rather than stored as
// crop metadata. That means every existing render site — Konva token
// art, library thumbnails, stat-block avatars, player sheets — picks it
// up with no changes and no schema migration. Trade-off: re-framing
// later needs the original image again (the "Adjust framing" button
// re-opens whatever is currently saved, so you can nudge it, but each
// pass is applied to the already-cropped copy).
//
// Everything is same-origin (/uploads) or a blob:/data: URL, so the
// canvas is never tainted and toBlob() works without CORS headers.

import React, { useEffect, useRef, useState, useCallback } from 'react';

const VIEW = 288;   // on-screen viewport, px
const OUT  = 512;   // exported image edge, px
const MAX_ZOOM = 4;

export default function ImageFramer({ src, title = 'Frame artwork', onCancel, onConfirm }) {
  const [img, setImg] = useState(null);
  const [error, setError] = useState('');
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });   // top-left of the drawn image, viewport px
  const [busy, setBusy] = useState(false);
  const dragRef = useRef(null);

  // Scale at which the image exactly covers the viewport — zoom is a
  // multiplier on top, so zoom=1 always fills with no letterboxing.
  const baseScale = img ? Math.max(VIEW / img.naturalWidth, VIEW / img.naturalHeight) : 1;
  const drawW = img ? img.naturalWidth  * baseScale * zoom : 0;
  const drawH = img ? img.naturalHeight * baseScale * zoom : 0;

  const clamp = useCallback((p, w, h) => ({
    x: Math.min(0, Math.max(VIEW - w, p.x)),
    y: Math.min(0, Math.max(VIEW - h, p.y)),
  }), []);

  useEffect(() => {
    if (!src) return;
    let cancelled = false;
    const im = new Image();
    im.onload = () => {
      if (cancelled) return;
      const b = Math.max(VIEW / im.naturalWidth, VIEW / im.naturalHeight);
      setImg(im);
      setZoom(1);
      setPos({ x: (VIEW - im.naturalWidth * b) / 2, y: (VIEW - im.naturalHeight * b) / 2 });
    };
    im.onerror = () => { if (!cancelled) setError('Could not load that image.'); };
    im.src = src;
    return () => { cancelled = true; };
  }, [src]);

  // Zoom about the viewport centre so the subject doesn't slide away
  // as the GM scrubs the slider.
  function applyZoom(next) {
    const z = Math.min(MAX_ZOOM, Math.max(1, next));
    if (!img) { setZoom(z); return; }
    const oldW = img.naturalWidth * baseScale * zoom;
    const oldH = img.naturalHeight * baseScale * zoom;
    const newW = img.naturalWidth * baseScale * z;
    const newH = img.naturalHeight * baseScale * z;
    const cx = VIEW / 2, cy = VIEW / 2;
    const nx = cx - ((cx - pos.x) / oldW) * newW;
    const ny = cy - ((cy - pos.y) / oldH) * newH;
    setZoom(z);
    setPos(clamp({ x: nx, y: ny }, newW, newH));
  }

  function onPointerDown(e) {
    if (!img) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    dragRef.current = { px: e.clientX, py: e.clientY, ox: pos.x, oy: pos.y };
  }
  function onPointerMove(e) {
    const d = dragRef.current;
    if (!d || !img) return;
    setPos(clamp({ x: d.ox + (e.clientX - d.px), y: d.oy + (e.clientY - d.py) }, drawW, drawH));
  }
  function onPointerUp(e) {
    dragRef.current = null;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  }
  function onWheel(e) {
    if (!img) return;
    e.preventDefault();
    applyZoom(zoom * (e.deltaY < 0 ? 1.08 : 1 / 1.08));
  }

  function reset() {
    if (!img) return;
    const b = Math.max(VIEW / img.naturalWidth, VIEW / img.naturalHeight);
    setZoom(1);
    setPos({ x: (VIEW - img.naturalWidth * b) / 2, y: (VIEW - img.naturalHeight * b) / 2 });
  }

  async function confirm() {
    if (!img || busy) return;
    setBusy(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = OUT;
      canvas.height = OUT;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingQuality = 'high';
      // Viewport px → output px. The drawn rect maps 1:1 through k, so
      // what's inside the square on screen is exactly what's exported.
      const k = OUT / VIEW;
      ctx.drawImage(img, pos.x * k, pos.y * k, drawW * k, drawH * k);
      // PNG keeps transparency — plenty of token art is cut out.
      const blob = await new Promise((res) => canvas.toBlob(res, 'image/png'));
      if (!blob) throw new Error('Could not export the framed image.');
      onConfirm?.(new File([blob], `framed-${Date.now()}.png`, { type: 'image/png' }));
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/75 z-[60] flex items-center justify-center p-4" onClick={onCancel}>
      <div onClick={(e) => e.stopPropagation()}
        className="bg-gray-900 border border-dnd-gold/60 rounded-lg w-full max-w-md flex flex-col">
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700">
          <h3 className="text-dnd-gold font-semibold text-sm">{title}</h3>
          <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-200 text-xl leading-none">×</button>
        </div>

        <div className="p-4 space-y-3">
          <p className="text-[11px] text-gray-400 leading-snug">
            Drag to move the picture, scroll or use the slider to zoom. The circle shows the token crop;
            the square is what gets saved.
          </p>

          <div className="flex justify-center">
            <div
              className="relative overflow-hidden bg-gray-950 border border-gray-700 rounded touch-none select-none"
              style={{ width: VIEW, height: VIEW, cursor: img ? 'grab' : 'default' }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              onWheel={onWheel}
            >
              {img && (
                <img
                  src={src}
                  alt=""
                  draggable={false}
                  style={{
                    position: 'absolute',
                    left: pos.x, top: pos.y,
                    width: drawW, height: drawH,
                    maxWidth: 'none', pointerEvents: 'none',
                  }}
                />
              )}
              {/* Circular guide — tokens are round, so anything outside
                  this ring only shows on the stat-block portrait. The huge
                  spread darkens everything outside the circle and is clipped
                  by the viewport's own overflow:hidden. */}
              <div className="absolute inset-0 pointer-events-none rounded-full border border-dnd-gold/70"
                style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)' }} />
              {!img && !error && (
                <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-500">Loading…</div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-[11px] text-gray-400 mb-1">Zoom: {zoom.toFixed(2)}×</label>
            <input
              type="range" min={1} max={MAX_ZOOM} step={0.01} value={zoom}
              onChange={(e) => applyZoom(parseFloat(e.target.value))}
              disabled={!img}
              className="w-full"
            />
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>

        <div className="flex items-center justify-between gap-2 px-4 py-2 border-t border-gray-700">
          <button type="button" onClick={reset} disabled={!img}
            className="text-xs text-gray-400 hover:text-gray-200 disabled:opacity-40 px-2 py-1.5">Reset</button>
          <div className="flex gap-2">
            <button type="button" onClick={onCancel} className="text-xs text-gray-400 hover:text-gray-200 px-3 py-1.5">Cancel</button>
            <button type="button" onClick={confirm} disabled={!img || busy}
              className="text-xs bg-dnd-gold hover:brightness-110 disabled:bg-gray-700 disabled:text-gray-500 text-gray-900 font-semibold px-3 py-1.5 rounded">
              {busy ? 'Saving…' : 'Use image'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
