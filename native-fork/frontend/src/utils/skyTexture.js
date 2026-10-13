// skyTexture.js — loading, caching and preloading the panorama a map wraps
// itself in.
//
// Three separate costs, and they need different treatment:
//
//   1. The DOWNLOAD. A panorama is the largest asset in the app by a wide
//      margin — an HDRI can run to tens of megabytes — so it must never be
//      fetched twice, and ideally it starts before anyone asks to see it.
//   2. The DECODE. Turning a .hdr into a float texture is slow enough to drop
//      frames, and it used to happen on every single open of the 3D view
//      because the texture was disposed on close.
//   3. The GPU upload, which is the browser's problem once we hand it over.
//
// So: one decoded texture per URL for the life of the tab, handed out to
// whoever asks, and a prefetch that warms the HTTP cache while the GM is still
// looking at the flat map.

import * as THREE from 'three';

// url -> Promise<THREE.Texture>. A promise rather than the texture itself, so
// two callers arriving during the same load share one download instead of
// racing and starting a second.
const decoded = new Map();

// url -> Promise<void> for prefetches, so repeated calls are free.
const prefetched = new Map();

// Progress, for anything that wants to show a bar. url -> 0..1, or null when
// the length isn't known.
const progress = new Map();
const listeners = new Set();

function setProgress(url, v) {
  progress.set(url, v);
  for (const fn of listeners) {
    try { fn(url, v); } catch (_) {}
  }
}

/** Subscribe to load progress. Returns an unsubscribe function. */
export function onSkyProgress(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function skyProgress(url) {
  return url ? (progress.get(url) ?? null) : null;
}

export function isSkyReady(url) {
  return !!url && decoded.has(url) && progress.get(url) === 1;
}

const isHdr = (url) => /\.hdr($|\?)/i.test(url);

/**
 * Warm the browser's HTTP cache for a panorama, without decoding it.
 *
 * Deliberately NOT a full load: decoding an HDRI produces a float texture many
 * times the size of the file itself, and holding that for a map nobody has
 * opened in 3D yet is a poor trade on a phone. Pulling the bytes down early is
 * the part that actually costs the wait.
 *
 * Safe to call on every render — repeat calls for the same URL are no-ops.
 */
export function prefetchSky(url) {
  if (!url || prefetched.has(url) || decoded.has(url)) return prefetched.get(url) || Promise.resolve();
  const p = (async () => {
    try {
      const res = await fetch(url, { credentials: 'same-origin' });
      if (!res.ok || !res.body) return;
      // Read it through so the response is complete and cacheable; the bytes
      // themselves are dropped. Reading in chunks lets a bar move.
      const total = Number(res.headers.get('content-length')) || 0;
      const reader = res.body.getReader();
      let seen = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        seen += value.length;
        if (total > 0) setProgress(url, Math.min(0.99, seen / total));
      }
      setProgress(url, 1);
    } catch (_) {
      // A failed prefetch is not an error anyone needs to see: the real load
      // will report properly when the view opens.
      prefetched.delete(url);
    }
  })();
  prefetched.set(url, p);
  return p;
}

/**
 * The decoded texture for a panorama, loaded at most once per tab.
 *
 * The caller must NOT dispose what comes back — it is shared. That is the
 * point: the sky effect used to dispose its texture on every close, so
 * reopening the 3D view paid the whole download and decode again.
 */
export function loadSkyTexture(url) {
  if (!url) return Promise.resolve(null);
  const hit = decoded.get(url);
  if (hit) return hit;

  const p = new Promise((resolve, reject) => {
    const onLoad = (tex) => {
      // An HDR carries linear radiance values, not sRGB pixels — tagging it
      // sRGB would double-correct it and wash the whole sky out.
      tex.colorSpace = isHdr(url) ? THREE.LinearSRGBColorSpace : THREE.SRGBColorSpace;
      // Wrapped horizontally so a panorama that isn't a true 2:1 still meets
      // itself instead of leaving a seam of stretched edge pixels.
      tex.wrapS = THREE.RepeatWrapping;
      setProgress(url, 1);
      resolve(tex);
    };
    const onProgress = (ev) => {
      if (ev && ev.lengthComputable && ev.total > 0) {
        setProgress(url, Math.min(0.99, ev.loaded / ev.total));
      }
    };
    const onError = (err) => {
      // Drop the cache entry so a later attempt can retry rather than being
      // handed a permanently rejected promise.
      decoded.delete(url);
      progress.delete(url);
      reject(err);
    };

    if (isHdr(url)) {
      // Loaded lazily: RGBELoader is only needed by the handful of maps that
      // actually have an HDRI, and the 3D chunk is already large.
      import('three/examples/jsm/loaders/RGBELoader.js')
        .then(({ RGBELoader }) => new RGBELoader().load(url, onLoad, onProgress, onError))
        .catch(onError);
    } else {
      new THREE.TextureLoader().load(url, onLoad, onProgress, onError);
    }
  });

  decoded.set(url, p);
  return p;
}
