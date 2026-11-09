#!/usr/bin/env python3
"""Tạo 25 ảnh nền nghệ thuật (SVG, ~1-3KB/ảnh) cho thẻ thể loại ở src/assets/genres/.
Chạy:  python3 scripts/generate-genre-art.py
Muốn đổi hình 1 thể loại: sửa hàm tương ứng bên dưới (hoặc thay thẳng file .svg/.webp cùng tên)."""
import math, os, random

OUT = os.path.join(os.path.dirname(__file__), "..", "src", "assets", "genres")
W, H = 560, 200

def svg(body, c1, c2, angle=0, extra_defs=""):
    x2 = round(50 + 50 * math.cos(math.radians(angle)), 1)
    y2 = round(50 + 50 * math.sin(math.radians(angle)), 1)
    x1, y1 = round(100 - x2, 1), round(100 - y2, 1)
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid slice">'
            f'<defs><linearGradient id="g" x1="{x1}%" y1="{y1}%" x2="{x2}%" y2="{y2}%">'
            f'<stop offset="0" stop-color="{c1}"/><stop offset="1" stop-color="{c2}"/></linearGradient>{extra_defs}</defs>'
            f'<rect width="{W}" height="{H}" fill="url(#g)"/>{body}</svg>')

def hills(color, opacity, base, amp, phase, n=3):
    pts = [f"M0 {H}"]
    for x in range(0, W + 20, 20):
        y = base + amp * math.sin(x / 90 + phase) + amp * .5 * math.sin(x / 41 + phase * 2)
        pts.append(f"L{x} {y:.1f}")
    pts.append(f"L{W} {H}Z")
    return f'<path d="{" ".join(pts)}" fill="{color}" fill-opacity="{opacity}"/>'

def glow(cx, cy, r, color, op=.5):
    return (f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{color}" fill-opacity="{op*.25}"/>'
            f'<circle cx="{cx}" cy="{cy}" r="{r*.62}" fill="{color}" fill-opacity="{op*.45}"/>'
            f'<circle cx="{cx}" cy="{cy}" r="{r*.3}" fill="{color}" fill-opacity="{op}"/>')

def ribbon(color, op, y, amp, phase, thick=26):
    top, bot = [], []
    for x in range(-20, W + 40, 20):
        yy = y + amp * math.sin(x / 80 + phase)
        top.append(f"{x},{yy:.1f}"); bot.append(f"{x},{yy + thick + 10 * math.sin(x/60+phase):.1f}")
    return f'<polygon points="{" ".join(top + bot[::-1])}" fill="{color}" fill-opacity="{op}"/>'

def vinyl(cx, cy, r, color, op=.35):
    s = f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="#000" fill-opacity=".45"/>'
    for k in range(1, 6):
        s += f'<circle cx="{cx}" cy="{cy}" r="{r - k * r / 7:.1f}" fill="none" stroke="{color}" stroke-opacity="{op}" stroke-width="1.2"/>'
    s += f'<circle cx="{cx}" cy="{cy}" r="{r*.22:.1f}" fill="{color}" fill-opacity="{op+.2}"/>'
    return s

def skyline(color, op, seed, base=200, x0=250, maxh=110):
    rnd = random.Random(seed); x = x0; s = ""
    while x < W:
        w = rnd.randint(18, 40); h = rnd.randint(30, maxh)
        s += f'<rect x="{x}" y="{base-h}" width="{w}" height="{h}" fill="{color}" fill-opacity="{op}"/>'
        for wy in range(base - h + 8, base - 6, 12):
            if rnd.random() > .55:
                s += f'<rect x="{x+4}" y="{wy}" width="3" height="4" fill="#ffd9a0" fill-opacity=".55"/>'
        x += w + rnd.randint(2, 8)
    return s

def sparkle(x, y, r, color="#fff", op=.9):
    return (f'<path d="M{x} {y-r} Q{x} {y} {x+r} {y} Q{x} {y} {x} {y+r} Q{x} {y} {x-r} {y} Q{x} {y} {x} {y-r}Z" '
            f'fill="{color}" fill-opacity="{op}"/>')

A = {}

def acoustic():
    return svg(glow(470, 40, 70, "#d9ff9a", .35) + hills("#0b3d1a", .35, 150, 14, 0) + hills("#0b3d1a", .5, 170, 12, 2) + hills("#06240f", .6, 188, 8, 4),
               "#8bc34a", "#2e7d32", 20)
def ballad():
    b = "".join(ribbon(c, o, y, 28, p, t) for c, o, y, p, t in [("#9fb8ff", .35, 40, 0, 60), ("#c9d8ff", .3, 80, 1.2, 40), ("#6f8cff", .5, 120, 2.4, 50), ("#ffffff", .15, 60, .6, 20)])
    return svg(b, "#2c3fa8", "#4f6bdc", 25)
def blues():
    s = ""
    for i in range(6):
        s += f'<line x1="{200+i*6}" y1="{H+10}" x2="{W+40}" y2="{-10+i*34-10}" stroke="#aeb7ff" stroke-opacity=".4" stroke-width="1.4"/>'
    for i in range(8):
        x = 300 + i * 38
        s += f'<line x1="{x}" y1="{H+10}" x2="{x+110}" y2="-10" stroke="#fff" stroke-opacity=".18" stroke-width="2"/>'
    return svg(glow(520, 30, 80, "#7c8aff", .4) + s, "#1e2a78", "#4a3bb5", 30)
def bolero():
    b = "".join(ribbon(c, o, y, 24, p, t) for c, o, y, p, t in [("#7fffd0", .3, 100, 0, 50), ("#000", .2, 130, 1, 40), ("#d0fff0", .25, 60, 2, 24)])
    return svg(b + hills("#02332d", .45, 190, 8, 1), "#0f8a6b", "#0d5b4f", 40)
def chill():
    return svg(glow(430, 120, 80, "#ff8ad8", .5) + hills("#2a0b4f", .55, 130, 18, 1) + hills("#190634", .75, 160, 14, 3) + hills("#0e0220", .8, 188, 8, 5),
               "#ff6fb5", "#5a2a9c", 70)
def classical():
    s = ""
    for i in range(5):
        x = 290 + i * 54
        s += (f'<rect x="{x}" y="34" width="38" height="14" fill="#fff" fill-opacity=".28"/>'
              f'<rect x="{x+5}" y="48" width="28" height="130" fill="#fff" fill-opacity=".18"/>'
              + "".join(f'<line x1="{x+10+j*6}" y1="52" x2="{x+10+j*6}" y2="176" stroke="#000" stroke-opacity=".18"/>' for j in range(4))
              + f'<rect x="{x-2}" y="176" width="42" height="12" fill="#fff" fill-opacity=".28"/>')
    s += f'<rect x="270" y="20" width="290" height="14" fill="#fff" fill-opacity=".3"/>'
    return svg(s, "#b8652b", "#5c2e12", 30)
def country():
    s = glow(400, 128, 78, "#ffe08a", .6) + hills("#6b2a0b", .5, 140, 10, 0.5) + hills("#4a1b06", .7, 168, 8, 2)
    s += "".join(f'<rect x="{300+i*44}" y="150" width="4" height="40" fill="#2b0f04" fill-opacity=".8"/>' for i in range(6))
    s += '<rect x="296" y="160" width="230" height="3" fill="#2b0f04" fill-opacity=".8"/><rect x="296" y="174" width="230" height="3" fill="#2b0f04" fill-opacity=".8"/>'
    return svg(s, "#ff9b45", "#c4551a", 60)
def dance():
    s = '<g>'
    cx, cy, r = 470, 70, 56
    s += f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="#ff5ccf"/>'
    for k in range(-3, 4):
        s += f'<ellipse cx="{cx}" cy="{cy}" rx="{abs(r*math.cos(k*.4)):.1f}" ry="{r}" fill="none" stroke="#fff" stroke-opacity=".35"/>'
    for k in range(-3, 4):
        yy = cy + k * 14; rx = math.sqrt(max(r*r - (k*14)**2, 1))
        s += f'<line x1="{cx-rx:.1f}" y1="{yy}" x2="{cx+rx:.1f}" y2="{yy}" stroke="#fff" stroke-opacity=".35"/>'
    s += f'<circle cx="{cx-18}" cy="{cy-20}" r="12" fill="#fff" fill-opacity=".5"/></g>'
    s += "".join(sparkle(random.Random(i).randint(280, 540), random.Random(i+9).randint(14, 180), random.Random(i+4).randint(4, 9), "#fff", .8) for i in range(9))
    return svg(s, "#d5199a", "#6a0f8f", 30)
def edm():
    s = ""
    for i in range(7):
        x = 300 + i * 40
        s += f'<polygon points="{x},{H+6} {x-60+i*18},-6 {x-44+i*18},-6" fill="#8e7bff" fill-opacity=".28"/>'
    s += glow(430, 205, 80, "#4de1ff", .4)
    return svg(s, "#1a1560", "#5b2bd6", 35)
def folk():
    rnd = random.Random(3); s = hills("#0f4d12", .45, 150, 10, 1) + hills("#0b3a0c", .55, 176, 8, 3)
    for _ in range(46):
        x = rnd.randint(200, W); y = rnd.randint(150, 198); h = rnd.randint(14, 36)
        s += f'<path d="M{x} {y} Q{x+rnd.randint(-6,6)} {y-h/2} {x+rnd.randint(-10,10)} {y-h}" stroke="#d9f27a" stroke-opacity=".5" stroke-width="1.6" fill="none"/>'
    return svg(glow(470, 40, 70, "#fff7b0", .4) + s, "#9fc54a", "#3f7f1f", 70)
def hiphop():
    return svg(glow(470, 60, 80, "#ff5a80", .35) + skyline("#2a0614", .75, 11, maxh=120) + skyline("#12030a", .85, 5, x0=300, maxh=80), "#e1245a", "#7a0f2f", 50)
def indie():
    s = ""
    for cx, cy, sc in [(420, 130, 1.2), (500, 90, .8), (340, 160, .9)]:
        s += (f'<g fill="#fff" fill-opacity=".55"><circle cx="{cx}" cy="{cy}" r="{30*sc}"/><circle cx="{cx+34*sc}" cy="{cy+6*sc}" r="{24*sc}"/>'
              f'<circle cx="{cx-34*sc}" cy="{cy+8*sc}" r="{22*sc}"/><rect x="{cx-50*sc}" y="{cy+6*sc}" width="{100*sc}" height="{28*sc}" rx="{14*sc}"/></g>')
    return svg(s, "#9a6fe0", "#5c3aa8", 60)
def jazz():
    s = glow(470, 20, 90, "#7ff3ff", .35)
    for i in range(5):
        s += ribbon("#fff", .1, 60 + i * 20, 20, i * .9, 6)
    s += "".join(f'<circle cx="{300+i*50}" cy="{170-(i%2)*30}" r="{6+i}" fill="#7ff3ff" fill-opacity=".25"/>' for i in range(5))
    return svg(s, "#0f7a8a", "#0a3b4d", 40)
def kpop():
    s = glow(450, 90, 90, "#ff7ae0", .45)
    for i in range(14):
        r = random.Random(i)
        s += sparkle(r.randint(250, 540), r.randint(14, 186), r.randint(4, 12), "#fff", .85)
    s += ribbon("#fff", .12, 110, 20, 1, 40)
    return svg(s, "#ee2f9b", "#8b1fb5", 35)
def lofi():
    s = ""
    for i, (x, y, rot) in enumerate([(430, 190, -20), (470, 190, 10), (400, 190, -50), (510, 190, 35)]):
        s += f'<g transform="translate({x} {y}) rotate({rot})"><path d="M0 0 Q-30 -60 0 -120 Q30 -60 0 0Z" fill="#0b2418" fill-opacity=".6"/><line x1="0" y1="0" x2="0" y2="-110" stroke="#9fe0b0" stroke-opacity=".35"/></g>'
    s += glow(300, 40, 50, "#ffd9a0", .3)
    return svg(s, "#4a76a8", "#24406a", 60)
def metal():
    pts = "M180 200 L250 90 L290 140 L350 40 L400 130 L450 70 L500 150 L560 100 L560 200Z"
    s = f'<path d="{pts}" fill="#000" fill-opacity=".5"/><path d="M350 40 L372 82 L352 74 L338 92Z" fill="#fff" fill-opacity=".35"/>'
    s += f'<path d="M250 90 L268 118 L252 112Z M450 70 L468 104 L452 98Z" fill="#fff" fill-opacity=".25"/>'
    return svg(s, "#6a6a6a", "#1c1c1c", 40)
def ost():
    return svg(vinyl(480, 150, 120, "#c7a6ff", .32) + glow(300, 30, 40, "#b388ff", .25), "#3a1a8a", "#2a0a55", 30)
def pop():
    rnd = random.Random(8); s = ""
    for _ in range(14):
        s += f'<circle cx="{rnd.randint(260,560)}" cy="{rnd.randint(10,190)}" r="{rnd.randint(8,34)}" fill="#fff" fill-opacity="{rnd.choice([.12,.18,.25])}"/>'
    s += glow(470, 110, 60, "#ff9ad5", .4)
    return svg(s, "#e91e8c", "#b01575", 35)
def rnb():
    s = glow(470, 70, 70, "#ffc27a", .4)
    s += hills("#3a1405", .45, 150, 12, 1) + hills("#1f0a02", .6, 176, 10, 3)
    s += ribbon("#ffd09a", .2, 40, 16, 1, 10) + ribbon("#ffd09a", .15, 64, 18, 2, 8)
    return svg(s, "#d8742a", "#6b2f10", 60)
def rap():
    rnd = random.Random(4); s = ""
    for _ in range(9):
        s += f'<circle cx="{rnd.randint(300,560)}" cy="{rnd.randint(30,190)}" r="{rnd.randint(30,60)}" fill="#8fb4ff" fill-opacity="{rnd.choice([.12,.18])}"/>'
    s += glow(520, 30, 60, "#4fa3ff", .35)
    return svg(s, "#1b3fb5", "#0d1f6b", 35)
def remix():
    s = ""
    rnd = random.Random(2)
    for i in range(22):
        h = rnd.randint(20, 120); x = 280 + i * 13
        s += f'<rect x="{x}" y="{H-h-10}" width="8" height="{h}" rx="3" fill="#c9a6ff" fill-opacity="{.25+.02*(i%5)}"/>'
    s += ribbon("#fff", .1, 70, 14, 1, 8)
    return svg(s, "#6a22c8", "#2b0f6e", 30)
def rock():
    rnd = random.Random(6); s = glow(430, 30, 90, "#ffd27a", .4)
    for i in range(34):
        x = 230 + i * 10 + rnd.randint(-3, 3); h = rnd.randint(24, 54); hy = H - h
        s += f'<circle cx="{x}" cy="{hy-8}" r="6" fill="#1a0500" fill-opacity=".85"/><rect x="{x-8}" y="{hy-2}" width="16" height="{h+4}" fill="#1a0500" fill-opacity=".85"/>'
        if rnd.random() > .5:
            s += f'<line x1="{x+6}" y1="{hy+4}" x2="{x+14}" y2="{hy-26}" stroke="#1a0500" stroke-opacity=".85" stroke-width="4" stroke-linecap="round"/>'
    return svg(s, "#f26a1b", "#a1230a", 70)
def soul():
    return svg(vinyl(470, 120, 130, "#7dffc0", .3) + glow(300, 160, 60, "#2dd47a", .25), "#12a05b", "#0a5a3d", 40)
def usuk():
    s = skyline("#04162a", .6, 21, x0=230, maxh=60)
    # clock tower
    s += ('<g fill="#04162a" fill-opacity=".85"><rect x="470" y="60" width="28" height="140"/><polygon points="466,60 484,14 502,60"/>'
          '<rect x="466" y="60" width="36" height="8"/></g><circle cx="484" cy="86" r="9" fill="#ffe9a8" fill-opacity=".85"/>'
          '<line x1="484" y1="86" x2="484" y2="80" stroke="#04162a" stroke-width="1.5"/><line x1="484" y1="86" x2="489" y2="88" stroke="#04162a" stroke-width="1.5"/>')
    return svg(glow(390, 40, 60, "#8cc8ff", .3) + s, "#2c78b5", "#0d3560", 60)
def vpop():
    s = glow(420, 110, 90, "#ff9ac8", .5) + skyline("#2a0a4a", .7, 33, x0=270, maxh=90) + skyline("#14052a", .85, 17, x0=330, maxh=60)
    s += "".join(sparkle(random.Random(i).randint(260, 540), random.Random(i+7).randint(10, 100), random.Random(i+2).randint(3, 7), "#fff", .8) for i in range(7))
    return svg(s, "#d048c8", "#5a2aa8", 65)

NAMES = {"acoustic": acoustic, "ballad": ballad, "blues": blues, "bolero": bolero, "chill": chill, "classical": classical,
         "country": country, "dance": dance, "edm": edm, "folk": folk, "hiphop": hiphop, "indie": indie, "jazz": jazz,
         "kpop": kpop, "lofi": lofi, "metal": metal, "ost": ost, "pop": pop, "rb": rnb, "rap": rap, "remix": remix,
         "rock": rock, "soul": soul, "usuk": usuk, "vpop": vpop}

if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    for name, fn in NAMES.items():
        with open(os.path.join(OUT, f"{name}.svg"), "w", encoding="utf-8") as f:
            f.write(fn())
    print(f"Đã tạo {len(NAMES)} ảnh trong {os.path.abspath(OUT)}")
