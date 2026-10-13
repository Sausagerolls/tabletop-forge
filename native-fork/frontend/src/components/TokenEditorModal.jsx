import React, { useCallback, useEffect, useRef, useState } from 'react';

// The 2-Minute Token Editor, embedded, with a one-gesture route back into the
// sheet for whatever it produces.
//
//
// WHY THE FILE IS NOT PICKED UP AUTOMATICALLY
// ───────────────────────────────────────────
// It cannot be. The editor runs on tools.2minutetabletop.com, a different
// origin from this app, and the same-origin policy makes a cross-origin frame
// completely opaque to its host: no DOM access, no access to its canvas, no
// hook on its downloads. That is a browser security boundary, not a gap in
// this code, and there is no flag or workaround that opens it.
//
// Three things that look like they might work, and why they do not:
//
//   * postMessage — only carries what the embedded page chooses to send. The
//     editor publishes no such API, so there is nothing to listen to.
//   * a service worker — ours does not control another origin's frame, and the
//     token is built with canvas and saved as a blob, so the download never
//     becomes a network request anybody could intercept.
//   * reading the download directory — browsers expose no such thing to a page.
//
// So the flow is: build the token in the frame, press its own Download button,
// then hand the file over here. One gesture, and the sheet is still open behind
// it — which is the part that actually matters, since the alternative is
// leaving the app, finding the file, coming back and hunting for the picker.
//
// The drop zone takes a drag from the browser's own downloads bar, a paste, or
// a file picker, and hands the result to the same code path as any other
// portrait upload — so the framing dialog, the save, and the 3D standee all
// behave exactly as they do for a file chosen the ordinary way.

const EDITOR_URL = 'https://tools.2minutetabletop.com/token-editor/';

function isImage(file) {
  return !!file && typeof file.type === 'string' && file.type.startsWith('image/');
}

// The first image in a drag or paste, whichever way the OS presents it.
// A drag from the downloads bar arrives as a File in `files`; a copy from a
// file manager can arrive only as an item that has to be asked for one.
function imageFromTransfer(dt) {
  if (!dt) return null;
  for (const f of Array.from(dt.files || [])) {
    if (isImage(f)) return f;
  }
  for (const item of Array.from(dt.items || [])) {
    if (item.kind === 'file') {
      const f = item.getAsFile();
      if (isImage(f)) return f;
    }
  }
  return null;
}

export default function TokenEditorModal({ open, onClose, onPick }) {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const dragDepth = useRef(0);

  const accept = useCallback((file) => {
    if (!file) {
      setError('That did not look like an image file.');
      return;
    }
    if (!isImage(file)) {
      setError(`"${file.name || 'That file'}" is not an image.`);
      return;
    }
    setError('');
    onPick(file);
  }, [onPick]);

  // Paste works anywhere in the dialog, so a token copied in a file manager can
  // come straight in without aiming at the drop zone.
  useEffect(() => {
    if (!open) return;
    function onPaste(e) {
      const file = imageFromTransfer(e.clipboardData);
      if (file) { e.preventDefault(); accept(file); }
    }
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('paste', onPaste);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('paste', onPaste);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, accept, onClose]);

  // Dragging a file anywhere over the dialog counts. The iframe swallows drag
  // events over itself — it is another origin and its own drop target — so the
  // zone is deliberately large and sits outside the frame.
  useEffect(() => {
    if (!open) return;
    dragDepth.current = 0;
    setDragging(false);
  }, [open]);

  if (!open) return null;

  const onDragEnter = (e) => {
    e.preventDefault();
    dragDepth.current += 1;
    if (imageFromTransfer(e.dataTransfer) || (e.dataTransfer?.types || []).includes('Files')) {
      setDragging(true);
    }
  };
  const onDragLeave = (e) => {
    e.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragging(false);
  };
  const onDrop = (e) => {
    e.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    accept(imageFromTransfer(e.dataTransfer));
  };

  return (
    <div className="fixed inset-0 z-[92] bg-black/80 flex items-center justify-center p-3">
      <div
        className="w-full h-full max-w-6xl bg-dnd-panel border border-gray-700 rounded-xl shadow-2xl flex flex-col overflow-hidden"
        onDragEnter={onDragEnter}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-700 shrink-0">
          <h3 className="text-dnd-gold font-semibold">Token Editor</h3>
          <span className="text-xs text-gray-500 truncate">
            by 2-Minute Tabletop — build a token, press its Download button, then drop the file below
          </span>
          <a
            href={EDITOR_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto text-xs text-gray-400 hover:text-white px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 shrink-0"
            title="Open the editor in its own tab instead"
          >Open in a tab ↗</a>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 shrink-0"
          >Close</button>
        </div>

        <div className="relative flex-1 min-h-0 bg-white">
          <iframe
            src={EDITOR_URL}
            title="2-Minute Token Editor"
            className="w-full h-full border-0"
            // Everything the editor needs, minus the ability to navigate the
            // whole app away from under the player. allow-downloads is the
            // important one — without it its Download button does nothing.
            sandbox="allow-scripts allow-same-origin allow-downloads allow-forms allow-popups allow-popups-to-escape-sandbox"
            referrerPolicy="no-referrer-when-downgrade"
          />
          {dragging && (
            <div className="absolute inset-0 bg-dnd-gold/20 border-4 border-dashed border-dnd-gold flex items-center justify-center pointer-events-none">
              <span className="text-lg font-semibold text-dnd-gold bg-gray-900/90 px-4 py-2 rounded-lg">
                Drop to use as your token
              </span>
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-gray-700 p-3">
          <label
            className={`flex items-center justify-center gap-3 w-full rounded-lg border-2 border-dashed px-4 py-3 cursor-pointer transition-colors ${
              dragging
                ? 'border-dnd-gold bg-dnd-gold/10 text-dnd-gold'
                : 'border-gray-600 text-gray-300 hover:border-dnd-gold hover:text-white'
            }`}
          >
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                accept(f);
              }}
            />
            <span className="text-sm font-medium">
              Drop the downloaded token here, paste it, or click to choose the file
            </span>
          </label>
          {error
            ? <p className="text-xs text-red-300 mt-2 text-center">{error}</p>
            : (
              <p className="text-[11px] text-gray-500 mt-2 text-center">
                The editor runs on another site, so the app cannot take the file from it directly —
                drag it in from your downloads and it becomes your token straight away.
              </p>
            )}
        </div>
      </div>
    </div>
  );
}
