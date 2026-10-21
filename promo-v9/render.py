"""GEES CHILLS promo v9 — 24 s vertical 1080x1920 @30fps, H.264/AAC.

All photography is Gees Chills' own event footage (assets/). Soundtrack is the
original synthesized score from v8 (assets/original-score.wav).
Requires Python 3, numpy, Pillow and ffmpeg.
"""
from pathlib import Path
import subprocess
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = Path(__file__).resolve().parent
ASSETS = ROOT / 'assets'
W, H, FPS, DURATION = 1080, 1920, 30, 24
INK = (5, 27, 39); BLUE = (0, 174, 222); DEEP = (0, 137, 178); WHITE = (255, 255, 255)

WHATSAPP = 'WHATSAPP 027 794 6635'
WEBSITE = 'geeschills.com'

# Fonts: use the macOS originals when present, otherwise the bundled/Linux stand-ins.
def pick(*paths):
    for p in paths:
        if Path(p).exists():
            return str(p)
    raise FileNotFoundError(paths)
DISPLAY = pick('/System/Library/Fonts/Supplemental/DIN Condensed Bold.ttf', ROOT / 'fonts/NimbusSansNarrow-Bold.otf')
BOLD = pick('/System/Library/Fonts/Supplemental/Arial Bold.ttf', '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf')
REG = pick('/System/Library/Fonts/Supplemental/Arial.ttf', '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf')
_cache = {}
def font(size, kind='body'):
    key = (size, kind)
    if key not in _cache:
        _cache[key] = ImageFont.truetype({'display': DISPLAY, 'regular': REG}.get(kind, BOLD), size)
    return _cache[key]

def ease(x): return 1 - (1 - max(0, min(1, x))) ** 3

def fit(label, size, kind, maxw):
    """Largest size <= size at which label fits maxw."""
    while size > 10 and font(size, kind).getlength(label) > maxw:
        size -= 2
    return size

def text(im, label, x, y, size=44, color=WHITE, kind='body'):
    ImageDraw.Draw(im).text((x, y), label, font=font(size, kind), fill=color)

def centered(im, label, y, size=44, color=INK, kind='body', maxw=940):
    size = fit(label, size, kind, maxw)
    w = font(size, kind).getlength(label)
    text(im, label, (W - w) / 2, y, size, color, kind)

def tracked_width(label, size, spacing):
    f = font(size)
    return sum(f.getlength(c) + spacing for c in label) - spacing

def tracked(im, label, x, y, size=24, color=WHITE, spacing=5, right=None):
    if right is not None:
        x = right - tracked_width(label, size, spacing)
    d = ImageDraw.Draw(im); f = font(size)
    for c in label:
        d.text((x, y), c, font=f, fill=color); x += f.getlength(c) + spacing

def crop_cover(im, w, h, z=1, cx=.5, cy=.5):
    scale = max(w / im.width, h / im.height) * z
    cw, ch = w / scale, h / scale
    left = max(0, min(im.width - cw, im.width * cx - cw / 2))
    top = max(0, min(im.height - ch, im.height * cy - ch / 2))
    return im.resize((w, h), Image.Resampling.BICUBIC, box=(left, top, left + cw, top + ch))

def sharp(im):
    # Photos are 720x1280 phone shots, so a light unsharp mask offsets the 1.5x upscale.
    return im.filter(ImageFilter.UnsharpMask(radius=2, percent=55, threshold=3))

# ---- Sources -------------------------------------------------------------
raw = subprocess.check_output(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-i', str(ASSETS / 'source-video.mp4'),
                               '-an', '-vf', 'fps=30,scale=464:832', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'])
video = np.frombuffer(raw, dtype=np.uint8).reshape(-1, 832, 464, 3)
def load(name): return Image.open(ASSETS / name).convert('RGB')
sobolo_tub = load('sobolo-tub.jpg')
alvaro = load('alvaro-cooler.jpg')
club = load('club-on-ice.jpg')
belaqua = load('belaqua-ice.jpg')
grid_imgs = [load('belaqua-tub.jpg'), load('sobolo-closeup.jpg'), load('water-mixed-ice.jpg'), load('alvaro-cooler.jpg')]
logo = load('logo.jpeg')

# ---- Graphics ------------------------------------------------------------
Y = np.arange(H)[:, None]; shade = np.zeros((H, W, 4), np.uint8)
shade[:, :, 3] = np.broadcast_to(np.clip(135 * np.exp(-Y / 360) + 200 * np.exp(-(H - Y) / 520), 0, 220), (H, W)).astype(np.uint8)
overlay = Image.fromarray(shade)
def grade(im): return Image.alpha_composite(im.convert('RGBA'), overlay).convert('RGB')

def brand(im, dark=False):
    color = INK if dark else WHITE
    tracked(im, 'GEES CHILLS', 72, 122, 25, color, 3)
    tracked(im, 'GHANA', 0, 122, 25, color, 3, right=1008)
    ImageDraw.Draw(im).line((72, 174, 1008, 174), fill=(175, 207, 219) if dark else (155, 178, 185), width=1)

CAP_Y = 1150          # caption block sits above the Reels/TikTok bottom UI (ends by y≈1440)
LINE = 128
def caption(im, kicker, lines, local, accent=1):
    y = CAP_Y + int(38 * (1 - ease(local / .5)))
    size = min(fit(l, 150, 'display', 920) for l in lines)
    panel = Image.new('RGBA', im.size, (0, 0, 0, 0))
    ImageDraw.Draw(panel).rounded_rectangle((44, y - 104, 1036, y + (len(lines) - 1) * LINE + size + 26), radius=18, fill=(3, 18, 27, 165))
    im.paste(Image.alpha_composite(im.convert('RGBA'), panel).convert('RGB'))
    ksize = 30
    while ksize > 20 and tracked_width(kicker, ksize, 4) > 920: ksize -= 1
    tracked(im, kicker, 72, y - 74, ksize, WHITE, 4)
    for i, line in enumerate(lines):
        text(im, line, 68, y + i * LINE, size, BLUE if i == accent else WHITE, 'display')

def photo_shot(img, q, dur, z0, dz, cy=.5):
    return grade(sharp(crop_cover(img, W, H, z0 + dz * q / dur, .5, cy)))

def tile(im, img, box, q, delay):
    x0, y0, x1, y1 = box
    a = ease((q - delay) / .45)
    if a <= 0: return
    t = sharp(crop_cover(img, x1 - x0, y1 - y0, 1.04 + .03 * q / 4))
    dy = int(30 * (1 - a))
    if a < 1:
        bg = im.crop((x0, y0 + dy, x1, y1 + dy))
        t = Image.blend(bg, t, a)
    im.paste(t, (x0, y0 + dy))

EVENTS = ['WEDDINGS.', 'BIRTHDAYS.', 'ANNIVERSARIES.', 'FUNERALS.', 'CORPORATE EVENTS.']
def events(im, q):
    """Event types from geeschills.com, revealed one after another."""
    dark = Image.new('RGBA', im.size, (3, 18, 27, 150))
    im.paste(Image.alpha_composite(im.convert('RGBA'), dark).convert('RGB'))
    size = min(fit(e, 132, 'display', 930) for e in EVENTS)
    step = int(size * 1.04)
    top = 570
    a0 = ease(q / .35)
    tracked(im, 'COOLER HIRE FOR', 72, top - 70 + int(20 * (1 - a0)), 30, WHITE, 4)
    shown = 0
    for i, label in enumerate(EVENTS):
        a = ease((q - (.2 + i * .38)) / .3)
        if a <= 0: continue
        shown = i
        y = top + i * step + int(36 * (1 - a))
        layer = Image.new('RGBA', im.size, (0, 0, 0, 0))
        latest = q < .2 + (i + 1) * .38 or i == len(EVENTS) - 1
        color = BLUE if latest else WHITE
        ImageDraw.Draw(layer).text((68, y), label, font=font(size, 'display'), fill=color + (int(255 * a),))
        im.paste(Image.alpha_composite(im.convert('RGBA'), layer).convert('RGB'))
    a = ease((q - (.2 + len(EVENTS) * .38)) / .3)
    if a > 0:
        tracked(im, 'AND EVERYTHING IN BETWEEN.', 72, top + len(EVENTS) * step + 30 + int(20 * (1 - a)), 30, (190, 225, 236), 4)

def frame(t):
    if t < 3:
        v = min(len(video) - 1, round(t / 3 * (len(video) - 1)))
        im = grade(crop_cover(Image.fromarray(video[v]), W, H, 1.005))
        brand(im); caption(im, 'COOLER HIRE FOR YOUR EVENT', ['GOOD TIMES.', 'COLD DRINKS.'], t)
    elif t < 6:
        q = t - 3; im = photo_shot(sobolo_tub, q, 3, 1.02, .05, .5)
        brand(im); caption(im, 'YOU BRING THE PEOPLE', ['WE BRING', 'THE CHILL.'], q)
    elif t < 9:
        q = t - 6; im = photo_shot(alvaro, q, 3, 1.10, -.06, .45)
        events(im, q); brand(im)
    elif t < 12:
        q = t - 9; im = photo_shot(club, q, 3, 1.02, .05, .45)
        brand(im); caption(im, 'ICE · DELIVERY · SETUP · COLLECTION', ['WE HANDLE', 'THE COLD.'], q)
    elif t < 16:
        q = t - 12; im = Image.new('RGB', (W, H), (247, 250, 251)); brand(im, True)
        text(im, 'SMALL GATHERINGS.', 67, 236, fit('SMALL GATHERINGS.', 112, 'display', 940), INK, 'display')
        text(im, 'BIG CELEBRATIONS.', 67, 354, fit('BIG CELEBRATIONS.', 112, 'display', 940), DEEP, 'display')
        boxes = [(72, 520, 530, 960), (550, 520, 1008, 960), (72, 980, 530, 1420), (550, 980, 1008, 1420)]
        for i, (img, box) in enumerate(zip(grid_imgs, boxes)):
            tile(im, img, box, q, .15 + i * .22)
        centered(im, 'COOLERS · ICE · DELIVERY · SETUP · COLLECTION', 1460, 30, INK)
    elif t < 19:
        q = t - 16; im = photo_shot(belaqua, q, 3, 1.02, .04, .5)
        brand(im); caption(im, 'YOUR DATE · YOUR LOCATION · YOUR GUEST COUNT', ['THE RIGHT', 'PACKAGE.'], q)
    else:
        q = t - 19; im = Image.new('RGB', (W, H), WHITE)
        mark = logo.crop((244, 175, 551, 613)).resize((246, 351), Image.Resampling.LANCZOS)
        im.paste(mark, ((W - mark.width) // 2, 270))
        a = ease(q / .5); dy = int(24 * (1 - a))
        centered(im, 'GOOD TIMES.', 680 + dy, 150, INK, 'display')
        centered(im, 'COLD DRINKS.', 820 + dy, 150, DEEP, 'display')
        centered(im, 'Cooler hire for every event.', 1005, 38, INK, 'regular')
        d = ImageDraw.Draw(im)
        d.rounded_rectangle((150, 1100, 930, 1220), radius=10, fill=INK)
        centered(im, WHATSAPP, 1138, 42, WHITE, maxw=720)
        centered(im, WEBSITE, 1260, 52, DEEP)
        centered(im, 'Send your date, location and guest count.', 1350, 30, INK, 'regular')
    # Brief clean flash into the white spread and the end card.
    for cut in (12, 19):
        if cut - .10 < t < cut:
            im = Image.blend(im, Image.new('RGB', (W, H), WHITE), (t - (cut - .10)) / .10 * .7)
    return im

if __name__ == '__main__':
    out = ROOT / 'gees-chills-promo-v9.mp4'
    cmd = ['ffmpeg', '-y', '-hide_banner', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}',
           '-r', str(FPS), '-i', '-', '-i', str(ASSETS / 'original-score.wav'), '-c:v', 'libx264', '-preset', 'fast',
           '-crf', '18', '-pix_fmt', 'yuv420p', '-af', 'loudnorm=I=-14:TP=-1.5:LRA=9,alimiter=limit=0.68:level=false', '-c:a', 'aac', '-b:a', '192k',
           '-ar', '48000', '-movflags', '+faststart', '-t', str(DURATION), str(out)]
    p = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    for n in range(FPS * DURATION):
        p.stdin.write(frame(n / FPS).tobytes())
        if n % 120 == 0: print(f'Rendered {n}/{FPS * DURATION}', flush=True)
    p.stdin.close()
    if p.wait(): raise RuntimeError('Encoding failed')
    frame(1.6).save(ROOT / 'gees-chills-cover-v9.jpg', quality=95)
    sheet = Image.new('RGB', (7 * 216, 384))
    for i, t in enumerate([1.5, 4.5, 7.5, 10.5, 14.5, 17.5, 21]):
        sheet.paste(frame(t).resize((216, 384)), (i * 216, 0))
    sheet.save(ROOT / 'storyboard.jpg', quality=94)
    print('Finished', flush=True)
