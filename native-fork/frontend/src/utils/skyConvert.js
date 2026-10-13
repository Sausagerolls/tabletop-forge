// skyConvert.js — shrink a panorama before it is ever uploaded.
//
// A sky here is painted on a plain MeshBasicMaterial sphere with toneMapped
// off. It is a BACKDROP: nothing is lit by it, nothing reflects it, and no
// part of the renderer reads a value above 1. So everything that makes an HDRI
// an HDRI — the float radiance data, the range above white, the extra
// precision — is decoded, uploaded to the GPU, and then thrown away.
//
// The panorama that prompted this was 93 MB, about fifteen seconds on 5G and a
// minute on weak mobile data, and roughly 128 MB of memory once decoded. The
// same view as a tone-mapped WebP is a megabyte or two and indistinguishable
// on a sky sphere.
//
// So: decode the HDR here, in the browser, expose and tone-map it once, and
// upload the result. The GM's original file never leaves their machine.

const MAX_W = 4096;          // 2:1 equirect; plenty for a backdrop
const WEBP_QUALITY = 0.92;
// Generous: a 4096x2048 WebP takes a few seconds on a slow machine. This only
// exists so a browser that never calls back cannot hang the upload.
const ENCODE_TIMEOUT_MS = 90000;

/** Rough byte size for a human-facing message. */
export function prettyBytes(n) {
  if (!(n > 0)) return '0 B';
  const u = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(u.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
  return `${(n / 1024 ** i).toFixed(i ? 1 : 0)} ${u[i]}`;
}

const isHdrFile = (file) => /\.hdr$/i.test(file?.name || '');

// Half float -> float, through a lookup table.
//
// There are only 65536 possible half floats and fifty million samples to
// convert, so the table pays for itself thousands of times over. Built once,
// lazily, since most uploads are ordinary images and never touch it.
let HALF_LUT = null;
function halfFloatTable() {
  if (HALF_LUT) return HALF_LUT;
  const t = new Float32Array(65536);
  for (let h = 0; h < 65536; h++) {
    const s = (h & 0x8000) ? -1 : 1;
    const e = (h & 0x7c00) >> 10;
    const f = h & 0x03ff;
    if (e === 0) t[h] = s * 6.103515625e-5 * (f / 1024);
    else if (e === 31) t[h] = f ? NaN : s * Infinity;
    else t[h] = s * Math.pow(2, e - 15) * (1 + f / 1024);
  }
  HALF_LUT = t;
  return t;
}

// One linear radiance value -> one sRGB byte.
//
// A straight clip at white, and NO tone curve. This is not a stylistic choice:
// it is what the renderer was already doing.
//
// The sky is a MeshBasicMaterial with toneMapped:false, and the HDR was handed
// to it tagged LinearSRGBColorSpace — so three passed the linear values through
// untouched and the framebuffer clipped anything above 1. What you saw on
// screen was exactly sRGB(clamp(linear, 0, 1)).
//
// The first version of this converter applied Reinhard with an auto exposure,
// which lifts the midtones and rolls the highlights together. On a mostly-dark
// space panorama that scales the whole image up and flattens it — the
// washed-out look. Matching the old pipeline byte for byte is the goal here;
// the conversion is meant to change the file size and nothing else.
function encodeChannel(v) {
  const x = v > 0 ? (v > 1 ? 1 : v) : 0;
  const srgb = x <= 0.0031308 ? x * 12.92 : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
  return Math.round(255 * srgb);
}

// Canvas -> Blob, preferring WebP and falling back to JPEG where it isn't
// supported (older Safari). PNG is deliberately not a fallback: lossless on a
// photographic sky is enormous, which is the problem we came here to solve.
function toBlob(canvas, type) {
  // Bounded. toBlob hands the work to the browser's encoder and there is no
  // guarantee of a callback — it never fires at all under headless Chrome, for
  // one — so a bare promise here could leave the upload button spinning for
  // ever. A timeout turns that into a clean fall back to the original file.
  return new Promise((resolve) => {
    let settled = false;
    const done = (v) => { if (!settled) { settled = true; resolve(v); } };
    const timer = setTimeout(() => done(null), ENCODE_TIMEOUT_MS);
    try {
      canvas.toBlob((b) => { clearTimeout(timer); done(b && b.size > 0 ? b : null); }, type, WEBP_QUALITY);
    } catch (_) {
      clearTimeout(timer);
      done(null);
    }
  });
}

async function encode(canvas) {
  const webp = await toBlob(canvas, 'image/webp');
  if (webp) return { blob: webp, ext: 'webp' };
  // Older Safari has no WebP encoder.
  const jpg = await toBlob(canvas, 'image/jpeg');
  if (jpg) return { blob: jpg, ext: 'jpg' };
  return null;
}

/**
 * Convert a picked file into something worth uploading.
 *
 * Returns { file, note } — `file` is what to upload (possibly the original,
 * untouched), `note` a short human sentence describing what happened, or null
 * when nothing did.
 *
 * @param {File} file
 * @param {(stage: string) => void} [onStage]
 */
export async function prepareSkyUpload(file, onStage = () => {}) {
  if (!file) return { file, note: null };

  const canvas = document.createElement('canvas');
  const before = file.size;

  if (isHdrFile(file)) {
    onStage('Decoding HDR…');
    // Both imported dynamically. three and the RGBE loader are only needed by
    // the handful of GMs who upload an HDRI, and they are large — pulling them
    // in statically would put them in the main bundle for everyone.
    const [{ RGBELoader }, THREE] = await Promise.all([
      import('three/examples/jsm/loaders/RGBELoader.js'),
      import('three'),
    ]);
    const buf = await file.arrayBuffer();
    const loader = new RGBELoader();
    // HALF float, not full.
    //
    // The panorama this was written for is 10000x5000 — fifty megapixels. As
    // Float32 RGBA that decodes to 763 MB, and the pass below used to build a
    // full-resolution LDR canvas on top of it for another 191 MB. Together
    // that is about a gigabyte, which stalls a desktop and is hopeless on a
    // phone. Half float halves the decode and costs nothing here: the values
    // are about to be squashed into 8 bits per channel anyway.
    loader.setDataType(THREE.HalfFloatType);
    const tex = loader.parse(buf);
    if (!tex || !tex.data || !tex.width) throw new Error('That .hdr could not be read');

    const { width, height } = tex;
    const src = tex.data;                 // Uint16Array of half floats
    const half = halfFloatTable();
    const at = (i) => half[src[i]];

    onStage('Converting…');
    // Straight from the float data into the FINAL size — there is no
    // full-resolution intermediate. Each output pixel box-averages the source
    // pixels it covers, and that average is taken in LINEAR light before the
    // curve is applied, which is what a camera does and what keeps bright
    // regions from crawling darker as they shrink.
    const scale = Math.min(1, MAX_W / width);
    const outW = Math.max(1, Math.round(width * scale));
    const outH = Math.max(1, Math.round(height * scale));
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext('2d');
    const img = ctx.createImageData(outW, outH);
    const out = img.data;

    const bx = width / outW;
    const by = height / outH;
    for (let y = 0; y < outH; y++) {
      const y0 = Math.floor(y * by);
      const y1 = Math.max(y0 + 1, Math.floor((y + 1) * by));
      for (let x = 0; x < outW; x++) {
        const x0 = Math.floor(x * bx);
        const x1 = Math.max(x0 + 1, Math.floor((x + 1) * bx));
        let r = 0, g = 0, b = 0, n = 0;
        for (let sy = y0; sy < y1; sy++) {
          let o = (sy * width + x0) * 4;
          for (let sx = x0; sx < x1; sx++, o += 4) {
            r += at(o); g += at(o + 1); b += at(o + 2);
            n++;
          }
        }
        if (!n) n = 1;
        const d = (y * outW + x) * 4;
        out[d]     = encodeChannel(r / n);
        out[d + 1] = encodeChannel(g / n);
        out[d + 2] = encodeChannel(b / n);
        out[d + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  } else {
    // An ordinary image. Still worth capping: a 12000px panorama costs the same
    // download whether or not anything can see the detail.
    const bitmap = await createImageBitmap(file).catch(() => null);
    if (!bitmap) return { file, note: null };
    const scale = Math.min(1, MAX_W / bitmap.width);
    // Already small enough, and already a compressed format — leave it alone
    // rather than re-encoding it lossily for nothing.
    if (scale === 1 && before <= 6 * 1024 * 1024 && /jpe?g|webp/i.test(file.type)) {
      bitmap.close?.();
      return { file, note: null };
    }
    onStage('Resizing…');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
  }

  onStage('Compressing…');
  const encoded = await encode(canvas);
  // No encoder, or it never came back: upload what the GM picked.
  if (!encoded) return { file, note: null };
  const { blob, ext } = encoded;

  // If the conversion somehow made things worse, keep the original.
  if (blob.size >= before) return { file, note: null };

  const base = (file.name || 'panorama').replace(/\.[^.]+$/, '');
  const converted = new File([blob], `${base}.${ext}`, { type: blob.type });
  return {
    file: converted,
    note: `Converted to ${ext.toUpperCase()} at ${canvas.width}×${canvas.height} — ${prettyBytes(before)} → ${prettyBytes(blob.size)}`,
  };
}
