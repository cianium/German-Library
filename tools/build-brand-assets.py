#!/usr/bin/env python3
"""Generate the web-ready Lexipfad brand assets in assets/brand/.

Source of truth: brand/originals/*.png (the supplied raster brand kit).
Run manually after the originals change:

    python3 -I tools/build-brand-assets.py

Outputs are committed, so CI does not need Pillow. The originals are never
modified. The kit is raster-only: for crisp output above ~512 px, request a
vector (SVG) master from the designer and replace these derivatives.
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "brand" / "originals"
OUT = ROOT / "assets" / "brand"
OUT.mkdir(parents=True, exist_ok=True)

CREAM = (248, 245, 238)       # site light background / theme-color
CREAM_INK = (241, 235, 221)   # navy replacement on dark backgrounds
ALPHA_FLOOR = 12              # drops the faint extraction specks in the supplied PNGs


def load(name):
    return Image.open(SRC / name).convert("RGBA")


def clean(img):
    """Zero out near-transparent noise so bounding boxes are honest."""
    r, g, b, a = img.split()
    a = a.point(lambda v: 0 if v < ALPHA_FLOOR else v)
    img = Image.merge("RGBA", (r, g, b, a))
    return img


def crop_to_content(img, pad=0):
    box = img.split()[3].getbbox()
    if not box:
        return img
    l, t, r, b = box
    return img.crop((max(l - pad, 0), max(t - pad, 0), min(r + pad, img.width), min(b + pad, img.height)))


def fit_height(img, h):
    w = round(img.width * h / img.height)
    return img.resize((w, h), Image.LANCZOS)


def fit_width(img, w):
    h = round(img.height * w / img.width)
    return img.resize((w, h), Image.LANCZOS)


def to_dark_variant(img):
    """Recolour the dark ink (navy + grey tagline) to a light cream for dark backgrounds.

    Red / orange / amber keep their colour. Alpha is untouched, so anti-aliasing survives.
    """
    px = img.load()
    for y in range(img.height):
        for x in range(img.width):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            mx, mn = max(r, g, b), min(r, g, b)
            warm = r > g + 40 and r > b + 40        # red / orange / amber family
            if not warm and mx < 150:               # navy ink or mid-grey tagline
                # keep a little tonal range so the grey tagline stays softer than the headline
                t = mx / 150.0
                k = 1.0 - 0.18 * t
                px[x, y] = (round(CREAM_INK[0] * k), round(CREAM_INK[1] * k), round(CREAM_INK[2] * k), a)
    return img


def rounded_tile(content, pad_ratio=0.16, radius_ratio=0.22, bg=CREAM):
    """Cream rounded tile around `content` (used so the navy icon stays visible on dark UI)."""
    from PIL import ImageDraw
    pad = round(max(content.width, content.height) * pad_ratio)
    w, h = content.width + 2 * pad, content.height + 2 * pad
    tile = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    ImageDraw.Draw(tile).rounded_rectangle((0, 0, w - 1, h - 1), radius=round(min(w, h) * radius_ratio), fill=bg + (255,))
    tile.alpha_composite(content, (pad, pad))
    return tile


def dark_lockup(lockup):
    """Horizontal lockup for dark backgrounds: icon on a cream tile + recoloured wordmark/tagline."""
    a = lockup.split()[3]
    cols = [any(a.getpixel((x, y)) > 40 for y in range(0, lockup.height, 2)) for x in range(lockup.width)]
    # first empty run after the icon = gap between symbol and wordmark
    x = 0
    while x < lockup.width and not cols[x]:
        x += 1
    while x < lockup.width and cols[x]:
        x += 1
    gap_start = x
    while x < lockup.width and not cols[x]:
        x += 1
    gap_end = x
    symbol = crop_to_content(lockup.crop((0, 0, gap_start, lockup.height)))
    text = crop_to_content(to_dark_variant(lockup.crop((gap_end, 0, lockup.width, lockup.height))))
    tile = rounded_tile(symbol)
    scale = 1.0
    h = max(tile.height, text.height)
    gap = round(tile.height * 0.14)
    canvas = Image.new("RGBA", (tile.width + gap + text.width, h), (0, 0, 0, 0))
    canvas.alpha_composite(tile, (0, (h - tile.height) // 2))
    canvas.alpha_composite(text, (tile.width + gap, (h - text.height) // 2))
    return canvas


def on_background(icon, size, bg, scale):
    canvas = Image.new("RGBA", (size, size), bg + (255,))
    target_h = round(size * scale)
    ic = fit_height(icon, target_h)
    if ic.width > size * scale:
        ic = fit_width(icon, round(size * scale))
    canvas.alpha_composite(ic, ((size - ic.width) // 2, (size - ic.height) // 2))
    return canvas


def save(img, name, **kw):
    path = OUT / name
    img.save(path, optimize=True, **kw)
    print(f"{name:34s} {img.width}x{img.height}  {path.stat().st_size / 1024:.1f} KB")


# ---- source layers ----------------------------------------------------------
icon = crop_to_content(clean(load("Lexipfad_Icon.png")))
wordmark_full = clean(load("Lexipfad_Wordmark.png"))
# Wordmark kit image = letters (rows ~232-482) + tagline (rows ~497-530).
letters = crop_to_content(wordmark_full.crop((0, 0, wordmark_full.width, 490)))
lockup = crop_to_content(clean(load("Lexipfad_Full_Logo.png")))

# ---- in-page assets ---------------------------------------------------------
save(fit_height(icon, 176), "lexipfad-icon.png")                       # header/footer tile (2x of 88px)
save(fit_height(letters, 96), "lexipfad-wordmark-light.png")           # header, light theme (2x of 48px)
save(to_dark_variant(fit_height(letters, 96)), "lexipfad-wordmark-dark.png")
save(fit_width(lockup, 960), "lexipfad-logo-light.png")                # footer / large lockup
save(fit_width(dark_lockup(lockup), 960), "lexipfad-logo-dark.png")

# ---- favicons / app icons ---------------------------------------------------
fav = on_background(icon, 256, CREAM, 0.80)
save(fav.resize((32, 32), Image.LANCZOS), "favicon-32.png")
save(fav.resize((16, 16), Image.LANCZOS), "favicon-16.png")
fav.resize((48, 48), Image.LANCZOS).save(OUT / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
print("favicon.ico                        16/32/48")
save(on_background(icon, 180, CREAM, 0.74).convert("RGB"), "apple-touch-icon.png")
save(on_background(icon, 192, CREAM, 0.80), "icon-192.png")
save(on_background(icon, 512, CREAM, 0.80), "icon-512.png")
# Maskable: content must stay inside the central 80% safe zone -> use ~56% height.
save(on_background(icon, 512, CREAM, 0.56), "icon-maskable-512.png")

# ---- social share image (1200x630) -----------------------------------------
og = Image.new("RGBA", (1200, 630), CREAM + (255,))
mark = fit_width(lockup, 920)
og.alpha_composite(mark, ((1200 - mark.width) // 2, (630 - mark.height) // 2))
save(og.convert("RGB"), "og-lexipfad.png")
