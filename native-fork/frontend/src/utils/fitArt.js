// Finding the token inside a picture of a token.
//
// Most token art is not a flush circle. Compendium and library pieces routinely
// sit in a square frame with transparent corners, or a band of flat background
// around the disc, or a decorative surround wider than the token itself. Dropped
// into a one-inch circle unchanged, the creature ends up printing at two thirds
// of an inch — the disc is the right size and the picture inside it is not, and
// what you cut round is the picture.
//
// So: find the ink, and work out the zoom and offset that makes the ink fill the
// circle. Returns a frame ({ zoom, x, y }) in exactly the form TokenDisc uses, or
// null when there is nothing worth trimming — a full-bleed illustration must be
// left alone rather than cropped into.

const SAMPLE = 256;          // enough to find an edge, small enough to be instant
const ALPHA_FLOOR = 16;      // below this a pixel is see-through, not content
const COLOUR_TOLERANCE = 20; // per channel, against a flat background
// The most this will zoom in on its own. The guard is on the RESULT rather than
// on how much is trimmed off a side, because those are different questions: a
// token drawn off-centre in its frame needs a big one-sided trim and is a
// perfectly good fit, while a speck of dust on a blank field trims almost
// nothing from three sides and would zoom to nonsense. Past this, the detection
// has misread the picture and framing is left to the person looking at it.
const MAX_AUTO_ZOOM = 3;

/** The bounding box of actual content, in 0..1 of the image, or null. */
export function inkBounds(img) {
  const nw = img.naturalWidth, nh = img.naturalHeight;
  if (!nw || !nh) return null;

  const scale = Math.min(1, SAMPLE / Math.max(nw, nh));
  const w = Math.max(1, Math.round(nw * scale));
  const h = Math.max(1, Math.round(nh * scale));
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, w, h);

  let px;
  try {
    px = ctx.getImageData(0, 0, w, h).data;
  } catch {
    // A cross-origin image taints the canvas. Everything this app shows is
    // same-origin or a blob, so this should not happen — but a read that
    // throws must leave the framing alone, not guess at it.
    return null;
  }

  const at = (x, y) => (y * w + x) * 4;
  // Is there any transparency at all? If so it is the reliable signal and the
  // colour comparison is not needed.
  const corners = [[0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1]];
  const transparent = corners.some(([x, y]) => px[at(x, y) + 3] < ALPHA_FLOOR);

  let bg = null;
  if (!transparent) {
    // A flat border only counts if every corner agrees on its colour. Four
    // different corners means the art runs to the edge.
    const first = corners.map(([x, y]) => [px[at(x, y)], px[at(x, y) + 1], px[at(x, y) + 2]]);
    const same = first.every((c) => c.every((v, i) => Math.abs(v - first[0][i]) <= COLOUR_TOLERANCE));
    if (!same) return null;
    bg = first[0];
  }

  const isContent = (x, y) => {
    const i = at(x, y);
    if (px[i + 3] < ALPHA_FLOOR) return false;
    if (!bg) return true;
    return Math.abs(px[i] - bg[0]) > COLOUR_TOLERANCE
        || Math.abs(px[i + 1] - bg[1]) > COLOUR_TOLERANCE
        || Math.abs(px[i + 2] - bg[2]) > COLOUR_TOLERANCE;
  };

  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!isContent(x, y)) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  if (x1 < x0 || y1 < y0) return null;                 // nothing but background

  return { x0: x0 / w, y0: y0 / h, x1: (x1 + 1) / w, y1: (y1 + 1) / h };
}

/**
 * The frame that makes a picture's content fill its circle.
 *
 * The disc renders the image with object-fit: cover, then applies
 * `scale(zoom) translate(x%, y%)` — the translate resolving against the disc's
 * own box. So the sums below work in units of the disc's width, which is why
 * the result is independent of whether the token prints at one inch or four.
 */
export function fitFrame(img) {
  const b = inkBounds(img);
  if (!b) return null;

  const trimmed = Math.max(b.x0, b.y0, 1 - b.x1, 1 - b.y1);
  if (trimmed < 0.012) return null;                    // already flush; leave it

  const nw = img.naturalWidth, nh = img.naturalHeight;
  // object-fit: cover, in units where the disc is 1 wide.
  const f = Math.max(1 / nw, 1 / nh);
  const drawnW = nw * f, drawnH = nh * f;
  const left = (1 - drawnW) / 2, top = (1 - drawnH) / 2;

  // The content box, in disc units.
  const bx0 = left + b.x0 * drawnW, bx1 = left + b.x1 * drawnW;
  const by0 = top + b.y0 * drawnH, by1 = top + b.y1 * drawnH;

  const zoom = 1 / Math.max(bx1 - bx0, by1 - by0);
  if (!Number.isFinite(zoom) || zoom > MAX_AUTO_ZOOM) return null;

  // Translate is applied before the scale, so centring does not depend on zoom.
  const cx = (bx0 + bx1) / 2, cy = (by0 + by1) / 2;
  return { zoom, x: (0.5 - cx) * 100, y: (0.5 - cy) * 100 };
}

/** Load an image and fit it. Resolves to a frame or null; never rejects. */
export function fitFrameFor(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => { try { resolve(fitFrame(img)); } catch { resolve(null); } };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}
