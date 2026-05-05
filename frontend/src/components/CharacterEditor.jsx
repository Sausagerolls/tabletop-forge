// CharacterEditor — full-screen wrapper around the existing
// CreatureForm, mounted at /edit-character?id=N. Built for the
// mobile apps' "Edit Stat Block" Settings button so iOS + Android
// can present the same editor the GM uses on the web instead of
// reimplementing two parallel native editors.
//
// Loads the creature row up front, hands it to CreatureForm with
// isPlayerCharacter set, and shows a thin toolbar with a Done
// button on save. The native shell wraps this view in a WebView
// and dismisses on the postMessage / window.close hint we emit
// after a successful save (or the user can back out manually).

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import CreatureForm from './CreatureForm.jsx';
import { CustomClassesProvider } from '../plugins/customClassesProvider.js';

export default function CharacterEditor() {
  const [search] = useSearchParams();
  const id = Number(search.get('id') || search.get('creatureId') || 0);
  const [creature, setCreature] = useState(null);
  const [error, setError] = useState(null);
  const [savedAt, setSavedAt] = useState(null);

  useEffect(() => {
    if (!id) { setError('Missing ?id=… in URL'); return; }
    let cancelled = false;
    fetch(`/api/creatures/${id}`)
      .then((r) => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then((row) => { if (!cancelled) setCreature(row); })
      .catch((err) => { if (!cancelled) setError(err.message); });
    return () => { cancelled = true; };
  }, [id]);

  // The native WebView shells (iOS WKWebView / Android WebView)
  // watch the URL hash for a `tabletopforge-*` sentinel and dismiss
  // the sheet when they see one. The hash trick works without
  // pre-registering a JS messageHandler / AndroidBridge from the
  // native side, so a stock WebView still picks it up.
  function notifyNative(action) {
    try { window.location.hash = `tabletopforge-${action}-${Date.now()}`; } catch {}
    try { window.postMessage({ type: `tabletopforge:${action}` }, '*'); } catch {}
    try {
      if (window.webkit?.messageHandlers?.tabletopforge?.postMessage) {
        window.webkit.messageHandlers.tabletopforge.postMessage({ type: action });
      }
    } catch {}
    try {
      if (window.AndroidBridge?.onCharacterEditorDone) {
        window.AndroidBridge.onCharacterEditorDone(action);
      }
    } catch {}
  }

  function handleSaved() {
    setSavedAt(Date.now());
    notifyNative('saved');
  }
  function handleCancel() {
    notifyNative('cancel');
  }

  return (
    <div className="h-full w-full bg-gray-900 text-gray-100 flex flex-col">
      {/* Custom classes / subclasses / class-builds need to be in
          registries before the form mounts so dropdowns + the auto-
          apply path see them. Same provider DMView and PlayerView
          already mount. */}
      <CustomClassesProvider />
      <div className="px-4 py-3 border-b border-gray-700 shrink-0 flex items-center gap-3">
        <h1 className="text-sm font-semibold text-dnd-gold flex-1 truncate">
          {creature?.name ? `Editing: ${creature.name}` : 'Character Editor'}
        </h1>
        {savedAt && (
          <span className="text-[11px] text-emerald-300">Saved.</span>
        )}
      </div>
      <div className="flex-1 overflow-hidden">
        {error && (
          <div className="m-4 text-xs text-red-300 bg-red-950/40 border border-red-900/40 rounded px-2 py-1.5">
            {error}
          </div>
        )}
        {!error && !creature && (
          <div className="p-6 text-xs text-gray-500 italic">Loading character…</div>
        )}
        {!error && creature && (
          <CreatureForm
            creature={creature}
            isPlayerCharacter={!!creature.is_player_character}
            onSave={handleSaved}
            onCancel={handleCancel}
          />
        )}
      </div>
    </div>
  );
}
