"""Card banners, pack galleries and contact sheets for /resources.

One look across the site: every banner and cover goes through `four_i_tone`,
which snaps each colour to the nearest of 4i green, orange or pink (neutrals
stay neutral), then gets a fine print halftone. Contact sheets are the files
exactly as they download, so they are never toned.

Sources are real: the resource PDFs (content/files), the scribbles cover and
pack on the T7, the Weapons thumbnail and PNGs on the T7, and the black
cracked paper still from Editing Refs.

Run:  ~/.venvs/sunrise/bin/python3 design/resource_art.py [banners|sheets|all]
Needs Pillow, numpy, pymupdf (all in ~/.venvs/sunrise). The T7 must be mounted.
Outputs: public/resources/<slug>/{banner.jpg, gallery-NN.jpg}
"""
import glob, os, random, sys
import numpy as np
import pymupdf
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont, ImageOps

Image.MAX_IMAGE_PIXELS = None
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUB = os.path.join(ROOT, "public", "resources")
FILES = os.path.join(ROOT, "content", "files", "4i-artist-resources-bundle")
T7 = "/Volumes/T7 Shield/"
PAPER = T7 + "Editing Refs/Overlays + Film FX/15 Textures/Paper Stills (Unsplash)/paper_black-cracked (valeria-reverdo).jpg"
SCRIB = T7 + "4i/4i Records/Resources/Gig Poster Scribbles/"
WEAP = T7 + "2026/Film & Music Video Projects/Productions/Weapons/"
MONO = "/System/Library/Fonts/Menlo.ttc"

BANNER = (1600, 800)      # the top half of a card
SLIDE = (1920, 1080)      # gallery slides on a pack page
INK, OFF, GREEN = (10, 10, 10), (240, 240, 240), (87, 255, 82)

# The three hues a colour may land on (degrees). Green is the 4i accent;
# orange and pink are the supporting colours the brand allows. No red,
# purple or blue survives: each is pulled to its nearest of these.
HUES = {"green": 118, "orange": 30, "pink": 343}
# Pink is warmed toward orange (Grace, 29 Sep, after the IYLILID refs: the
# coral-pink hearts on the Doja Cat / Avril posters), not the cooler #FF4FA3.


def four_i_tone(im, halftone=True, cell=7):
    rgb = np.asarray(im.convert("RGB"), np.float32) / 255
    mx, mn = rgb.max(2), rgb.min(2)
    v, c = mx, mx - mn
    s = np.where(mx > 0, c / np.maximum(mx, 1e-6), 0)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    h = np.zeros_like(mx)
    m = c > 1e-6
    rr = m & (mx == r); gg = m & (mx == g) & ~rr; bb = m & ~rr & ~gg
    h[rr] = ((g - b)[rr] / c[rr]) % 6
    h[gg] = (b - r)[gg] / c[gg] + 2
    h[bb] = (r - g)[bb] / c[bb] + 4
    h = h * 60
    targets = np.array(list(HUES.values()), np.float32)
    d = np.abs(((h[..., None] - targets) + 180) % 360 - 180)
    nh = targets[d.argmin(-1)]
    ns = np.clip(s * 1.1, 0, 1)
    ns = np.where(s < 0.12, 0, ns)            # greys stay grey
    # No brown on 4i: an orange that is dark or dull reads as brown, so it
    # goes neutral instead (Grace, 29 Sep).
    brown = (nh == HUES["orange"]) & ((v < 0.72) | (s < 0.55))
    ns = np.where(brown, 0, ns)
    # hsv -> rgb
    hh = nh / 60; i = np.floor(hh) % 6; f = hh - np.floor(hh)
    p, q, t = v * (1 - ns), v * (1 - ns * f), v * (1 - ns * (1 - f))
    out = np.zeros_like(rgb)
    for k, (a, b_, c_) in enumerate([(v, t, p), (q, v, p), (p, v, t), (p, q, v), (t, p, v), (v, p, q)]):
        sel = i == k
        out[..., 0][sel], out[..., 1][sel], out[..., 2][sel] = a[sel], b_[sel], c_[sel]
    if halftone:
        out = out * print_screen(out, cell)[..., None]
    return Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8))


def print_screen(rgb, cell):
    """A 45-degree AM dot screen, laid over the image as a light texture:
    dots grow in the shadows the way a print screen does."""
    H, W = rgb.shape[:2]
    lum = rgb @ np.array([.299, .587, .114], np.float32)
    y, x = np.mgrid[0:H, 0:W].astype(np.float32)
    u, w = (x + y) / (cell * 1.4142), (x - y) / (cell * 1.4142)
    dist = np.hypot(u - np.round(u), w - np.round(w))          # 0 at dot centre
    radius = 0.62 * np.sqrt(np.clip(1 - lum, 0, 1))             # dark = big dot
    dots = np.clip((radius - dist) * cell, 0, 1)                # anti-aliased
    return 1 - 0.30 * dots


def fit(im, size):
    return ImageOps.fit(im.convert("RGB"), size, Image.LANCZOS)


def paper(size, bright=.55):
    return ImageEnhance.Brightness(fit(Image.open(PAPER), size)).enhance(bright).convert("RGBA")


def paste_page(cv, im, cx, cy, w, rot):
    im = im.convert("RGB").resize((w, int(w * im.height / im.width)), Image.LANCZOS)
    rgba = im.convert("RGBA").rotate(rot, expand=True, resample=Image.BICUBIC)
    sh = Image.new("RGBA", rgba.size, (0, 0, 0, 0))
    sh.putalpha(rgba.getchannel("A").point(lambda a: int(a * .75)))
    sh = sh.filter(ImageFilter.GaussianBlur(14))
    x, y = cx - rgba.width // 2, cy - rgba.height // 2
    cv.alpha_composite(sh, (x + 10, y + 16)); cv.alpha_composite(rgba, (x, y))


def save(im, slug, name, q=84):
    os.makedirs(os.path.join(PUB, slug), exist_ok=True)
    path = os.path.join(PUB, slug, name)
    im.convert("RGB").save(path, quality=q, optimize=True, progressive=True)
    print(path)


# ---------- banners ----------

def pdf_pages(pdf, n):
    doc = pymupdf.open(pdf)
    out = []
    for i in range(min(n, doc.page_count)):
        px = doc[i].get_pixmap(dpi=110)
        out.append(Image.frombytes("RGB", (px.width, px.height), px.samples))
    return out


ACCENTS = {"green": GREEN, "orange": (255, 146, 43), "pink": (255, 92, 135)}


def gradient_map(im, accent):
    """Ink -> accent -> off-white, by luminance: one brand colour per banner."""
    lum = np.asarray(im.convert("L"), np.float32) / 255
    lum = np.clip((lum - .04) / .7, 0, 1) ** .8                 # lift the dark pages
    ink, acc, off = (np.array(c, np.float32) / 255 for c in (INK, accent, OFF))
    lo = np.clip(lum / .6, 0, 1)[..., None]; hi = np.clip((lum - .6) / .4, 0, 1)[..., None]
    out = ink + (acc - ink) * lo
    out = out + (off - out) * hi
    return Image.fromarray((out * 255).astype(np.uint8))


def pdf_banner(slug, pdf, seed, accent):
    """Three real pages of the resource PDF, title page on top, one accent."""
    random.seed(seed)
    cv = paper(BANNER, .8)
    pages = pdf_pages(pdf, 3)
    # back to front: page 3 left, page 2 right, the title page in the middle on top
    for idx, (cx, cy, w, rot) in [(2, (330, 520, 640, -8)), (1, (1270, 500, 640, 7)), (0, (800, 560, 760, -2.5))]:
        if idx < len(pages):
            paste_page(cv, pages[idx], cx + random.randint(-20, 20), cy + random.randint(-15, 15), w, rot)
    toned = gradient_map(cv, ACCENTS[accent])
    rgb = np.asarray(toned, np.float32) / 255
    save(Image.fromarray((np.clip(rgb * print_screen(rgb, 7)[..., None], 0, 1) * 255).astype(np.uint8)), slug, "banner.jpg")


def from_image_banner(slug, src, size=BANNER, name="banner.jpg", anchor=(.5, .5), tone=True):
    im = ImageOps.fit(Image.open(src).convert("RGB"), size, Image.LANCZOS, centering=anchor)
    save(four_i_tone(im) if tone else im, slug, name)


def banners():
    # The three written resources use hand-built SVG banners
    # (public/resources/<slug>/banner.svg); pdf_banner is kept for reference.
    wide = SCRIB + "_cover/gig-poster-scribbles-cover-wide.png"
    from_image_banner("gig-poster-scribbles", wide)
    from_image_banner("gig-poster-scribbles", wide, SLIDE, "gallery-01.jpg")
    thumb = WEAP + "Thumbnail/Weapons_Thumbnail.png"
    # Weapons stays as shot: Grace wants its cover untreated (29 Sep).
    from_image_banner("weapons-graffiti", thumb, anchor=(.5, .35), tone=False)
    from_image_banner("weapons-graffiti", thumb, SLIDE, "gallery-01.jpg", tone=False)


# ---------- contact sheets ----------

def trimmed(path, box, tile_bg):
    """The PNG as it downloads, trimmed to its ink and fitted to the tile."""
    im = Image.open(path).convert("RGBA")
    bb = im.getchannel("A").point(lambda a: 255 if a > 8 else 0).getbbox()
    if bb: im = im.crop(bb)
    im.thumbnail(box, Image.LANCZOS)
    bg = Image.new("RGBA", im.size, tile_bg + (255,))
    return Image.alpha_composite(bg, im)


def contact_sheets(slug, files, title, tile_bg, first=2, cols=8, rows=3):
    """Rows of tiles, one per file, numbered, 24 to a slide."""
    W, H = SLIDE
    per = cols * rows
    mono = ImageFont.truetype(MONO, 20); small = ImageFont.truetype(MONO, 15)
    top, gut, pad = 92, 16, 56
    tw = (W - 2 * pad - (cols - 1) * gut) // cols
    th = (H - top - pad - (rows - 1) * gut) // rows
    for s in range(0, len(files), per):
        cv = Image.new("RGBA", SLIDE, INK + (255,))
        d = ImageDraw.Draw(cv)
        chunk = files[s:s + per]
        d.text((pad, 40), title, font=mono, fill=GREEN)
        label = f"{s + 1:02d}–{s + len(chunk):02d} / {len(files)}"
        d.text((W - pad - d.textlength(label, font=mono), 40), label, font=mono, fill=(150, 150, 150))
        for k, f in enumerate(chunk):
            r, c = divmod(k, cols)
            x, y = pad + c * (tw + gut), top + r * (th + gut)
            d.rectangle([x, y, x + tw, y + th], fill=tile_bg)
            art = trimmed(f, (tw - 28, th - 50), tile_bg)
            cv.alpha_composite(art, (x + (tw - art.width) // 2, y + 12 + (th - 50 - art.height) // 2 + 6))
            name = f"{s + k + 1:02d}  {os.path.splitext(os.path.basename(f))[0]}"[:22]
            ink = (60, 60, 60) if sum(tile_bg) > 400 else (150, 150, 150)
            d.text((x + 10, y + th - 26), name, font=small, fill=ink)
        save(cv, slug, f"gallery-{first + s // per:02d}.jpg", q=86)


def sheets():
    pack = sorted(glob.glob(SCRIB + "Hand-drawn Scribbles for Gig Posters/[!.]*.png"), key=str.lower)
    contact_sheets("gig-poster-scribbles", pack, "HAND-DRAWN SCRIBBLES FOR GIG POSTERS", (236, 234, 228))
    graf = glob.glob(WEAP + "Footage/BTS:Graffiti Pics/Graffiti/Transparent/[!.]*.png")
    graf.sort(key=lambda p: int("".join(ch for ch in os.path.basename(p) if ch.isdigit()) or 0))
    contact_sheets("weapons-graffiti", graf, "GRAFFITI GRAPHICS ASSET PACK (WEAPONS)", (28, 28, 28))


if __name__ == "__main__":
    what = sys.argv[1] if len(sys.argv) > 1 else "all"
    if what in ("banners", "all"): banners()
    if what in ("sheets", "all"): sheets()
