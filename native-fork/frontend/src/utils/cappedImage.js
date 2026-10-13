// Loading art without holding a decoded copy of it forever.
//
// A PNG is compressed on disk and RGBA in memory: a 4096×4096 tile is 13MB as a
// file and 64MB as pixels, and nothing about drawing it at 200px on screen makes
// that smaller. Measured on the live GM view, the flat map held 1,579MB of
// decoded image data — of which a single 150-byte SVG accounted for 400MB,
// because its intrinsic size was 10240×10240 and it contained one grey rectangle.
//
// So every large image is decoded once, redrawn into a canvas no bigger than it
// needs to be, and the full-size decode is dropped. The canvas is a
// CanvasImageSource, which is what Konva and three.js both want, so callers pass
// it exactly where they passed the Image.
//
// The returned WIDTH and HEIGHT are always the ORIGINAL dimensions. They are what
// the map is measured in — MapImage reports them as the board's size — so they
// must not shrink with the pixels. Callers draw with an explicit width/height
// anyway; the only thing that changes is how many pixels back it.

// How much detail is worth keeping, per axis.
//
// 2048 is about a 4K screen's worth across the whole board, and a tile spanning
// eight 256px squares is 2048 map pixels — so at 1:1 zoom it is still
// pixel-for-pixel. Above that is detail nobody has ever seen: the flat map opens
// at a fit scale of about 0.03 on a big board.
export const DEFAULT_MAX_SIDE = 2048;

// Vector art gets a tighter cap. An SVG has no "natural" resolution — the
// browser rasterises whatever width/height it declares — and the ones this app
// generates are backdrops: flat fills and thin orbital rings.
export const SVG_MAX_SIDE = 1024;

const cache = new Map(); // `${url}|${cap}` -> Promise<{ source, width, height }>

function isSvg(url) {
  return /\.svg(\?|$)/i.test(String(url || ''));
}

// Rewrite an SVG's declared size so it never rasterises large in the first place.
//
// Downscaling after the fact would still mean one 400MB decode, and on a machine
// already short of memory that is the spike that hurts. The viewBox is what makes
// this safe: with it present, width/height are a request, not the geometry.
async function loadSvgCapped(url, cap) {
  const text = await fetch(url).then((r) => r.text());
  const wM = /\bwidth="([\d.]+)"/.exec(text);
  const hM = /\bheight="([\d.]+)"/.exec(text);
  const w = wM ? Number(wM[1]) : 0;
  const h = hM ? Number(hM[1]) : 0;
  if (!w || !h || Math.max(w, h) <= cap || !/viewBox=/i.test(text)) {
    const img = await loadPlain(url);
    return { source: img, width: img.naturalWidth || w, height: img.naturalHeight || h };
  }
  const k = cap / Math.max(w, h);
  const small = text
    .replace(/\bwidth="[\d.]+"/, `width="${Math.max(1, Math.round(w * k))}"`)
    .replace(/\bheight="[\d.]+"/, `height="${Math.max(1, Math.round(h * k))}"`);
  const blobUrl = URL.createObjectURL(new Blob([small], { type: 'image/svg+xml' }));
  try {
    const img = await loadPlain(blobUrl);
    return { source: img, width: w, height: h };
  } finally {
    // The decoded bitmap survives the URL being revoked; the object URL itself
    // would otherwise be held for the life of the document.
    URL.revokeObjectURL(blobUrl);
  }
}

function loadPlain(src) {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Load `url`, decoded to at most `cap` pixels on its longest side.
 *
 * @returns {Promise<{source: CanvasImageSource, width: number, height: number}>}
 *          `width`/`height` are the image's ORIGINAL dimensions.
 */
export function loadCappedImage(url, cap = DEFAULT_MAX_SIDE) {
  const limit = isSvg(url) ? Math.min(cap, SVG_MAX_SIDE) : cap;
  const key = `${url}|${limit}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const p = (async () => {
    if (isSvg(url)) return loadSvgCapped(url, limit);
    const img = await loadPlain(url);
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (!w || !h || Math.max(w, h) <= limit) return { source: img, width: w, height: h };

    const k = limit / Math.max(w, h);
    const cw = Math.max(1, Math.round(w * k));
    const ch = Math.max(1, Math.round(h * k));
    const c = document.createElement('canvas');
    c.width = cw;
    c.height = ch;
    const g = c.getContext('2d');
    // Let the browser do the filtering: a straight drawImage to a smaller size
    // is bilinear at best, and a tile shrunk 4× that way crawls when panned.
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = 'high';
    g.drawImage(img, 0, 0, cw, ch);
    // `img` goes out of scope here and the full-size decode goes with it.
    return { source: c, width: w, height: h };
  })();

  // A failed load must not be cached: the art may appear later (an upload still
  // being written), and a permanently rejected promise would hide it forever.
  p.catch(() => cache.delete(key));
  cache.set(key, p);
  return p;
}

/** Bytes the cache is currently holding, for diagnostics. */
export async function cappedImageBytes() {
  let n = 0;
  for (const p of cache.values()) {
    const r = await p.catch(() => null);
    if (r) n += (r.source.width || 0) * (r.source.height || 0) * 4;
  }
  return n;
}

// ── Thumbnails ──────────────────────────────────────────────────────────────
//
// A 48×36 preview of a map pointed at the map's own art is a 7680×5632 decode
// for a postage stamp. `object-cover` on a small box changes what is PAINTED,
// never what is decoded, so the browser holds the full picture either way.
//
// This hands back an object URL for a small copy. The big decode happens once,
// inside loadCappedImage, and is released as soon as the copy exists.
const thumbCache = new Map(); // `${url}|${cap}` -> Promise<string>

export function cappedThumbUrl(url, cap = 256) {
  const key = `${url}|${cap}`;
  const hit = thumbCache.get(key);
  if (hit) return hit;
  const p = loadCappedImage(url, cap).then(({ source }) => {
    // Already an <img> small enough to keep: use it directly rather than
    // re-encoding a copy of something that is already cheap.
    if (source instanceof HTMLImageElement) return source.src;
    return new Promise((resolve) => {
      // toBlob, never toDataURL: the latter base64-encodes on the main thread
      // and was measured at 7.5 seconds of blocked UI elsewhere in this app.
      source.toBlob((b) => resolve(b ? URL.createObjectURL(b) : ''), 'image/webp', 0.82);
    });
  });
  p.catch(() => thumbCache.delete(key));
  thumbCache.set(key, p);
  return p;
}
