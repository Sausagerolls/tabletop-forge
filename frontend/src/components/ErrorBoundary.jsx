import React from 'react';

// ErrorBoundary — stops one broken component taking the whole app with it.
//
// Without this, any render-time throw unmounts the entire tree and the player
// is left staring at the bare page background with no clue what happened (and
// no way to tell the GM anything useful). A boundary turns that into a
// contained message they can read out.
//
// `onReset` lets the parent close whatever was being opened, so the app is
// usable again without a reload.

// A tab that was open across a deploy.
//
// The views are code-split, so opening the 3D board fetches its own chunk on
// demand — and that chunk's filename carries a content hash. Deploy a new build
// and the old filename stops existing, so a tab left open from before asks for
// a file that is now a 404 and the import throws. Nothing is broken: the page
// simply has a stale map of the app.
//
// Worth detecting rather than reporting, because "Importing a module script
// failed" reads like a bug in the feature that was just opened, and the fix — a
// reload — is not one anybody guesses from that sentence. The wording differs
// per browser, hence the several patterns.
const STALE_CHUNK = /importing a module script failed|failed to fetch dynamically imported module|error loading dynamically imported module|ChunkLoadError|dynamically imported module/i;

// One automatic reload, not a loop. If the reload lands and the very same import
// fails again, the deploy itself is broken (a chunk genuinely missing from the
// build, or a proxy serving a stale index.html) and reloading for ever would
// hide that behind a flickering page. After the first attempt it becomes a
// button the reader presses.
const RELOAD_KEY = 'ttf:chunk-reload-at';
const RELOAD_COOLDOWN_MS = 30000;

function isStale(error) {
  return STALE_CHUNK.test(String(error?.message || error || '')) || error?.name === 'ChunkLoadError';
}

function reloadedRecently() {
  try {
    const at = Number(sessionStorage.getItem(RELOAD_KEY)) || 0;
    return Date.now() - at < RELOAD_COOLDOWN_MS;
  } catch {
    // Private mode, or storage blocked. Treat it as "already tried" so a tab
    // that cannot remember anything can never reload in a loop.
    return true;
  }
}

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, stale: false };
  }

  static getDerivedStateFromError(error) {
    return { error, stale: isStale(error) };
  }

  componentDidCatch(error, info) {
    // Kept in the console for anyone who can open devtools; the on-screen copy
    // below is for everyone else.
    console.error('[ErrorBoundary]', this.props.label || '', error, info?.componentStack);
    if (isStale(error) && !reloadedRecently()) {
      try { sessionStorage.setItem(RELOAD_KEY, String(Date.now())); } catch { /* nothing to do */ }
      // Straight away. The alternative is a message that says "reloading" and
      // then reloads, which is a flash of text nobody finishes reading.
      window.location.reload();
    }
  }

  render() {
    const { error, stale } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="fixed inset-0 z-[90] bg-gray-900/95 flex items-center justify-center p-6">
        <div className={`max-w-lg w-full bg-dnd-panel border rounded-xl overflow-hidden shadow-2xl ${
          stale ? 'border-amber-700' : 'border-red-700'}`}>
          <div className={`px-4 py-2 border-b text-sm font-semibold ${
            stale
              ? 'bg-amber-900/40 border-amber-800 text-amber-200'
              : 'bg-red-900/40 border-red-800 text-red-200'}`}>
            {stale ? 'The app has been updated' : (this.props.label || 'Something broke')}
          </div>
          <div className="p-4 space-y-3">
            {stale ? (
              <p className="text-xs text-gray-300 leading-relaxed">
                This tab was open while a new version was deployed, so it is still holding the
                old one and could not load that part of the app. Reloading picks up the new
                version — nothing in your session is lost.
              </p>
            ) : (
              <p className="text-xs text-gray-400">
                This part of the app failed. The rest of your session is still running.
              </p>
            )}
            <pre className="text-[11px] text-red-300 bg-black/40 rounded p-2 overflow-x-auto whitespace-pre-wrap break-words max-h-48">
              {String(error?.message || error)}
            </pre>
            {stale ? (
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="w-full text-sm bg-amber-800 hover:bg-amber-700 text-amber-50 rounded py-2 font-semibold"
              >Reload</button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  this.setState({ error: null, stale: false });
                  this.props.onReset?.();
                }}
                className="w-full text-sm bg-gray-700 hover:bg-gray-600 text-gray-100 rounded py-2"
              >Close</button>
            )}
          </div>
        </div>
      </div>
    );
  }
}
