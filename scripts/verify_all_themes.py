"""Verify the proposed token palettes for all 10 element-override themes.
Prints HSL triplets for each role + WCAG ratio for every pair that text
actually renders in. Adjust HEX values until nothing prints FAIL/POOR, then
transcribe the HSL into the theme files. Correctness gate for CHA-199.
"""
import colorsys


def h2hsl(h):
    h = h.lstrip('#')
    if len(h) == 3:
        h = ''.join(c * 2 for c in h)
    r, g, b = (int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))
    hh, l, s = colorsys.rgb_to_hls(r, g, b)
    return f"{round(hh*360)} {round(s*100)}% {round(l*100)}%"


def _lin(c):
    c /= 255
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
    return 'PASS' if r >= 4.5 else ('POOR(large-ok)' if r >= 3 else 'FAIL')


# role -> hex per theme, plus the pairs to check (fg, bg, label)
THEMES = {
 'light': {
   'roles': {'background':'#ffffff','foreground':'#333333','card':'#f8f9fa',
     'card-fg':'#333333','primary':'#0056b3','primary-fg':'#ffffff',
     'secondary':'#e9ecef','secondary-fg':'#212529','muted':'#f1f3f5',
     'muted-fg':'#5c636a','accent':'#e9ecef','accent-fg':'#212529',
     'border':'#dee2e6','input':'#ced4da','ring':'#0056b3',
     'destructive':'#c92a2a','destructive-fg':'#ffffff'},
   'checks':[('fg/bg','#333333','#ffffff'),('fg/card','#333333','#f8f9fa'),
     ('white/primary','#ffffff','#0056b3'),('muted/bg','#5c636a','#ffffff'),
     ('muted/card','#5c636a','#f8f9fa'),('link/bg','#0056b3','#ffffff'),
     ('destr','#ffffff','#c92a2a')]},
 'colorblind': {
   'roles': {'background':'#f8f9fa','foreground':'#212529','card':'#ffffff',
     'card-fg':'#212529','primary':'#495057','primary-fg':'#ffffff',
     'secondary':'#e9ecef','secondary-fg':'#212529','muted':'#e9ecef',
     'muted-fg':'#495057','accent':'#dee2e6','accent-fg':'#212529',
     'border':'#6c757d','input':'#6c757d','ring':'#0056b3',
     'destructive':'#c92a2a','destructive-fg':'#ffffff'},
   'checks':[('fg/bg','#212529','#f8f9fa'),('white/primary','#ffffff','#495057'),
     ('muted/bg','#495057','#f8f9fa'),('link/bg','#0056b3','#f8f9fa')]},
 'calm': {
   'roles': {'background':'#e3f2fd','foreground':'#1f2a44','card':'#ffffff',
     'card-fg':'#1f2a44','primary':'#1565c0','primary-fg':'#ffffff',
     'secondary':'#bbdefb','secondary-fg':'#1f2a44','muted':'#e3f2fd',
     'muted-fg':'#355080','accent':'#bbdefb','accent-fg':'#1f2a44',
     'border':'#90caf9','input':'#90caf9','ring':'#1565c0',
     'destructive':'#c62828','destructive-fg':'#ffffff'},
   'checks':[('fg/bg','#1f2a44','#e3f2fd'),('fg/card','#1f2a44','#ffffff'),
     ('white/primary','#ffffff','#1565c0'),('muted/bg','#355080','#e3f2fd'),
     ('muted/card','#355080','#ffffff'),('link/bg','#1565c0','#e3f2fd'),
     ('destr','#ffffff','#c62828')]},
 'glitter': {
   'roles': {'background':'#fff0fb','foreground':'#602a63','card':'#ffe9fc',
     'card-fg':'#602a63','primary':'#ff94d1','primary-fg':'#4a1452',
     'secondary':'#ffc2e8','secondary-fg':'#602a63','muted':'#ffe9fc',
     'muted-fg':'#8a3a73','accent':'#b8f2ff','accent-fg':'#3a1a52',
     'border':'#ffc2e8','input':'#ffc2e8','ring':'#ff94d1',
     'destructive':'#c2185b','destructive-fg':'#ffffff'},
   'checks':[('fg/bg','#602a63','#fff0fb'),('fg/card','#602a63','#ffe9fc'),
     ('prifg/primary(brightpink)','#4a1452','#ff94d1'),
     ('prifg/grad-light(#eec3ff)','#4a1452','#eec3ff'),
     ('muted/card','#8a3a73','#ffe9fc'),('muted/bg','#8a3a73','#fff0fb'),
     ('accentfg/accent(blue)','#3a1a52','#b8f2ff'),
     ('link/bg','#c2185b','#fff0fb')]},
 'lavender': {
   'roles': {'background':'#f3f0ff','foreground':'#4c1d95','card':'#ffebe0',
     'card-fg':'#4c1d95','primary':'#7c3aed','primary-fg':'#ffffff',
     'secondary':'#e9d5ff','secondary-fg':'#4c1d95','muted':'#ffebe0',
     'muted-fg':'#6b3aa0','accent':'#e9d5ff','accent-fg':'#4c1d95',
     'border':'#9b7ed8','input':'#9b7ed8','ring':'#7c3aed',
     'destructive':'#b91c45','destructive-fg':'#ffffff'},
   'checks':[('fg/bg','#4c1d95','#f3f0ff'),('fg/card(cream)','#4c1d95','#ffebe0'),
     ('white/primary','#ffffff','#7c3aed'),
     ('prifg-dark/grad-light(#c084fc)','#2e1065','#c084fc'),
     ('prifg-dark/grad-light(#a78bfa)','#2e1065','#a78bfa'),
     ('muted/card(cream)','#6b3aa0','#ffebe0'),('muted/bg','#6b3aa0','#f3f0ff'),
     ('link/bg','#7c3aed','#f3f0ff'),('destr','#ffffff','#b91c45')]},
 'chaos': {
   'roles': {'background':'#1a1a1a','foreground':'#f4e4bc','card':'#241a12',
     'card-fg':'#f4e4bc','primary':'#ff8c00','primary-fg':'#1a1a1a',
     'secondary':'#3a2a1a','secondary-fg':'#f4e4bc','muted':'#2a2018',
     'muted-fg':'#d8c4a0','accent':'#ff6b35','accent-fg':'#1a1a1a',
     'border':'#8b4513','input':'#5a3a1a','ring':'#ff8c00',
     'destructive':'#e03131','destructive-fg':'#ffffff'},
   'checks':[('fg/bg','#f4e4bc','#1a1a1a'),('fg/card','#f4e4bc','#241a12'),
     ('prifg-dark/primary(orange)','#1a1a1a','#ff8c00'),
     ('muted/card','#d8c4a0','#241a12'),('muted/bg','#d8c4a0','#1a1a1a'),
     ('accentfg/accent','#1a1a1a','#ff6b35'),('link(orange)/bg','#ff8c00','#1a1a1a'),
     ('destr','#ffffff','#e03131')]},
 'ace': {
   'roles': {'background':'#1a0d2e','foreground':'#ffffff','card':'#2d1b69',
     'card-fg':'#ffffff','primary':'#4c2a85','primary-fg':'#ffffff',
     'secondary':'#2d1b69','secondary-fg':'#ffffff','muted':'#2d1b69',
     'muted-fg':'#7fe0c8','accent':'#00d4ff','accent-fg':'#0a0a0f',
     'border':'#64ffda','input':'#4c2a85','ring':'#64ffda',
     'destructive':'#ff5470','destructive-fg':'#0a0a0f'},
   'checks':[('fg/bg','#ffffff','#1a0d2e'),('fg/card','#ffffff','#2d1b69'),
     ('white/primary(purple)','#ffffff','#4c2a85'),
     ('white/grad-purple(#6a4c93)','#ffffff','#6a4c93'),
     ('muted(cyan)/bg','#7fe0c8','#1a0d2e'),('muted(cyan)/card','#7fe0c8','#2d1b69'),
     ('accentfg/accent(cyan)','#0a0a0f','#00d4ff'),('link(cyan)/bg','#64ffda','#1a0d2e'),
     ('destr','#0a0a0f','#ff5470')]},
 'caelan': {
   'roles': {'background':'#1a1a2e','foreground':'#ffffff','card':'#16213e',
     'card-fg':'#ffffff','primary':'#f39c12','primary-fg':'#1a1a2e',
     'secondary':'#0f3460','secondary-fg':'#ffffff','muted':'#16213e',
     'muted-fg':'#cdd5e6','accent':'#f1c40f','accent-fg':'#1a1a2e',
     'border':'#bf9a2e','input':'#0f3460','ring':'#f1c40f',
     'destructive':'#c92a4a','destructive-fg':'#ffffff'},
   'checks':[('fg/bg','#ffffff','#1a1a2e'),('fg/card','#ffffff','#16213e'),
     ('prifg-dark/primary(orange)','#1a1a2e','#f39c12'),
     ('prifg-dark/accent(gold)','#1a1a2e','#f1c40f'),
     ('muted/card','#cdd5e6','#16213e'),('muted/bg','#cdd5e6','#1a1a2e'),
     ('link(gold)/bg','#f1c40f','#1a1a2e'),('destr','#ffffff','#c92a4a')]},
 'luka-penguin': {
   'roles': {'background':'#1a0d2e','foreground':'#00ffff','card':'#f4eeff',
     'card-fg':'#4c1d95','primary':'#6d28d9','primary-fg':'#ffffff',
     'secondary':'#2d1b69','secondary-fg':'#00ffff','muted':'#ece4ff',
     'muted-fg':'#6b3aa0','accent':'#00ffff','accent-fg':'#0a0a0f',
     'border':'#a855f7','input':'#a855f7','ring':'#00ffff',
     'destructive':'#ff3366','destructive-fg':'#ffffff'},
   'checks':[('fg(cyan)/bg','#00ffff','#1a0d2e'),
     ('cardfg/card(light)','#4c1d95','#f4eeff'),
     ('white/primary','#ffffff','#6d28d9'),
     ('white/grad(#7c3aed)','#ffffff','#7c3aed'),
     ('white/grad(#8b5cf6)','#ffffff','#8b5cf6'),
     ('muted/card(light)','#6b3aa0','#f4eeff'),
     ('accentfg/accent(cyan)','#0a0a0f','#00ffff'),
     ('link(cyan)/bg','#00ffff','#1a0d2e'),('destr','#ffffff','#ff3366')]},
 'accessibility': {
   'roles': {'background':'#000000','foreground':'#ffffff','card':'#ffffff',
     'card-fg':'#000000','primary':'#ffffff','primary-fg':'#000000',
     'secondary':'#ffffff','secondary-fg':'#000000','muted':'#000000',
     'muted-fg':'#cccccc','accent':'#ffffff','accent-fg':'#000000',
     'border':'#ffffff','input':'#ffffff','ring':'#ffff00',
     'destructive':'#ff0000','destructive-fg':'#ffffff'},
   'checks':[('fg/bg','#ffffff','#000000'),('cardfg/card','#000000','#ffffff'),
     ('prifg/primary','#000000','#ffffff'),('muted/bg','#cccccc','#000000'),
     ('link(blue)/bg','#0000ff','#000000')]},
}

if __name__ == '__main__':
    worst = []
    for name, t in THEMES.items():
        print(f"\n{'='*60}\n{name.upper()}")
        print("  -- token HSL triplets --")
        for role, hexv in t['roles'].items():
            print(f"     --{role:14}: {h2hsl(hexv):18}  /* {hexv} */")
        print("  -- contrast checks --")
        for label, fg, bg in t['checks']:
            r = ratio(fg, bg)
            tg = tag(r)
            if tg != 'PASS':
                worst.append((name, label, r, tg))
            print(f"     {label:30} {r:>6}:1  {tg}")
    print(f"\n{'='*60}\nNON-PASSING PAIRS: {len(worst)}")
    for name, label, r, tg in worst:
        print(f"  {name}: {label} = {r}:1 {tg}")
