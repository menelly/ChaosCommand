import re, glob

COLORS = "red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose"

SUBS = [
    (re.compile(r'\bbg-(' + COLORS + r')-(?:50|100|200|300)\b'), r'bg-\1-500/15'),
    (re.compile(r'\bborder-(' + COLORS + r')-(?:100|200|300)\b'), r'border-\1-500/30'),
    (re.compile(r'\btext-(' + COLORS + r')-(?:700|800|900)\b'), r'text-\1-700 dark:text-\1-300'),
    (re.compile(r'\btext-(' + COLORS + r')-(?:500|600)\b'), r'text-\1-600 dark:text-\1-400'),
]

counter = {'n': 0}

def make_sub(rep):
    def _sub(m):
        # skip if a dark: variant already directly follows (avoid doubling)
        tail = m.string[m.end():m.end()+40]
        if tail.strip().startswith('dark:'):
            return m.group(0)
        counter['n'] += 1
        # rebuild replacement from the matched family
        fam = m.group(1)
        return rep.replace(r'\1', fam)
    return _sub

files = []
for base in ('app', 'components', 'modules'):
    for ext in ('tsx', 'ts'):
        files += glob.glob(base + '/**/*.' + ext, recursive=True)

total = 0
changed = 0
for path in files:
    if 'node_modules' in path:
        continue
    with open(path, encoding='utf-8') as f:
        src = f.read()
    orig = src
    before = counter['n']
    for rx, rep in SUBS:
        src = rx.sub(make_sub(rep), src)
    if src != orig:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(src)
        changed += 1
        delta = counter['n'] - before
        total += delta
        print(f'{delta:4d}  {path}')
print(f'--- {total} substitutions across {changed} files ---')
