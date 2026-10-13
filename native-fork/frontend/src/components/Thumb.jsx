import React, { useEffect, useState } from 'react';
import { cappedThumbUrl } from '../utils/cappedImage.js';

// A small preview of a large picture.
//
// Drop-in for `<img src={`/uploads/${x}`} className="…" />` wherever the box is
// a thumbnail. The difference is what the browser ends up holding: the map list
// used to keep four 7680×5632 decodes alive to paint four 48×36 previews.
//
// Renders nothing until the small copy exists — the parent already draws a grey
// box behind it, and flashing the full-size image in first would defeat the
// point.
export default function Thumb({ src, alt = '', className = '', ...rest }) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    if (!src) { setUrl(null); return; }
    let cancelled = false;
    cappedThumbUrl(src).then((u) => { if (!cancelled) setUrl(u); }).catch(() => {});
    return () => { cancelled = true; };
    // The object URL is deliberately NOT revoked on unmount: it is cached and
    // shared by every mount of the same source, and revoking it here would
    // break the next list that asks for it.
  }, [src]);
  if (!url) return null;
  return <img src={url} alt={alt} className={className} {...rest} />;
}
