"""hex -> HSL-triplet + WCAG contrast helper for the theme token refactor.
Not crayons: this is the correctness backbone. Usage: edit PALETTE/CHECKS, run.
"""
import colorsys


def hex2hsl(h):
    h = h.lstrip('#')
    if len(h) == 3:
        h = ''.join(c * 2 for c in h)
    r, g, b = (int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))
    hh, l, s = colorsys.rgb_to_hls(r, g, b)
    return f"{round(hh * 360)} {round(s * 100)}% {round(l * 100)}%"


def _lin(c):
    c = c / 255
    return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4


def lum(h):
    h = h.lstrip('#')
    if len(h) == 3:
        h = ''.join(c * 2 for c in h)
    r, g, b = (int(h[i:i + 2], 16) for i in (0, 2, 4))
    return 0.2126 * _lin(r) + 0.7152 * _lin(g) + 0.0722 * _lin(b)


def ratio(a, b):
    la, lb = lum(a), lum(b)
    hi, lo = max(la, lb), min(la, lb)
    return round((hi + 0.05) / (lo + 0.05), 2)


def tag(r):
    return 'PASS' if r >= 4.5 else ('LARGE-only' if r >= 3 else 'FAIL')


# ---- grok / steel-forged-tide ----
PALETTE = {
    'midnight #1A1625': '#1A1625', 'panel #2A2338': '#2A2338',
    'lighttext #F0F4F8': '#F0F4F8', 'steel #A8B0B8': '#A8B0B8',
    'forgeRed #FF4D00': '#FF4D00', 'forgeOrange #FF8C42': '#FF8C42',
    'tide #00E6CC': '#00E6CC', 'tideDeep #00BFA5': '#00BFA5',
    'tideLight #B2FFEB': '#B2FFEB',
}
CHECKS = [
    ('foreground on background (midnight)', '#F0F4F8', '#1A1625'),
    ('foreground on card/panel', '#F0F4F8', '#2A2338'),
    ('muted-fg(steel) on background', '#A8B0B8', '#1A1625'),
    ('muted-fg(steel) on card', '#A8B0B8', '#2A2338'),
    ('primary-fg(midnight) on primary(forgeRed)', '#1A1625', '#FF4D00'),
    ('primary-fg(midnight) on forgeOrange stop', '#1A1625', '#FF8C42'),
    ('primary-fg(midnight) on accent(tide)', '#1A1625', '#00E6CC'),
    ('link(tide) on background', '#00E6CC', '#1A1625'),
    ('link(tide) on card', '#00E6CC', '#2A2338'),
]

if __name__ == '__main__':
    print("=== HSL triplets ===")
    for k, v in PALETTE.items():
        print(f"  {k:26} -> {hex2hsl(v)}")
    print("\n=== contrast checks ===")
    for name, fg, bg in CHECKS:
        r = ratio(fg, bg)
        print(f"  {name:42} {r:>6}:1  {tag(r)}")
