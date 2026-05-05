#!/usr/bin/env python3
"""
Rounded-corner pass over the master icon.

Reads assets/icons/source.png (1024 × 1024 opaque) and writes
rounded variants for every favicon / PWA size we ship. Apple's
home-screen icon convention is roughly a 22.5 % corner radius
relative to the icon edge — we use the same ratio so the favicon
matches the look the iOS launcher will give the app icon at runtime.

The masked outputs are RGBA PNGs (transparent corners).  We don't
overwrite source.png so the iOS App Icon (which Apple insists must
be opaque) keeps its square form.
"""
from PIL import Image, ImageDraw
from pathlib import Path

ROOT  = Path(__file__).resolve().parent
SRC   = ROOT / 'source.png'
SIZES = [16, 32, 48, 180, 192, 256, 384, 512]
RADIUS_RATIO = 0.225

def round_corners(img: Image.Image, radius: int) -> Image.Image:
    rgba = img.convert('RGBA')
    mask = Image.new('L', rgba.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        (0, 0, rgba.size[0] - 1, rgba.size[1] - 1),
        radius=radius, fill=255,
    )
    out = Image.new('RGBA', rgba.size, (0, 0, 0, 0))
    out.paste(rgba, (0, 0), mask)
    return out

def main() -> None:
    src = Image.open(SRC)
    for size in SIZES:
        scaled = src.resize((size, size), Image.LANCZOS)
        rounded = round_corners(scaled, int(size * RADIUS_RATIO))
        outfile = ROOT / f'rounded-{size}.png'
        rounded.save(outfile, 'PNG', optimize=True)
        print(f'wrote {outfile.name}')

if __name__ == '__main__':
    main()
