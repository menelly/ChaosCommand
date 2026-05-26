#!/usr/bin/env python3
"""
self_host_fonts.py — mirror open-source (OFL) Google Fonts locally so the app
never calls fonts.googleapis.com / fonts.gstatic.com. Privacy fix + font menu.

Self-hosting OFL fonts is explicitly permitted by the SIL Open Font License.
We pull ONLY the `latin` subset woff2 (smallest, covers English + common punct)
and emit ready-to-paste @font-face CSS.

Usage:
    python scripts/self_host_fonts.py            # download the configured set
    python scripts/self_host_fonts.py --css-only # just re-print the @font-face CSS

Add a font: append to FONTS below (family + weights + whether italics), rerun.
Output dir: public/fonts/   CSS: printed to stdout (paste into styles/chaos-themes.css)
"""
import os, re, sys, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "public", "fonts")
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/120.0 Safari/537.36")

# family -> {"weights": [...], "italics": bool}
# Only OFL / freely self-hostable families belong here.
FONTS = {
    "Atkinson Hyperlegible": {"weights": [400, 700], "italics": True},
    "Poppins":               {"weights": [300, 400, 500, 600, 700], "italics": False},
    "Lexend":                {"weights": [300, 400, 500, 600, 700], "italics": False},
    # --- Ren-approved menu fonts (2026-05-26): clean sans, reading serif, mono ---
    "Inter":         {"weights": [400, 500, 600, 700], "italics": False},
    "Crimson Pro":   {"weights": [400, 500, 600, 700], "italics": True},
    "JetBrains Mono": {"weights": [400, 500, 700], "italics": False},
}


def css_url(family, weights, italics):
    fam = family.replace(" ", "+")
    if italics:
        axis = "ital,wght@" + ";".join(f"0,{w}" for w in weights) + ";" + \
               ";".join(f"1,{w}" for w in weights)
    else:
        axis = "wght@" + ";".join(str(w) for w in weights)
    return f"https://fonts.googleapis.com/css2?family={fam}:{axis}&display=swap"


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    return urllib.request.urlopen(req, timeout=30).read()


def slug(family):
    return family.replace(" ", "")


def parse_latin_blocks(css_text):
    """Yield (weight, style, woff2_url) for the `latin` subset blocks only."""
    label = None
    for raw in re.split(r"/\*\s*([\w-]+)\s*\*/", css_text):
        # re.split with a capture group alternates: text, label, text, label...
        if raw and raw.strip() in ("latin", "latin-ext", "vietnamese", "greek",
                                    "cyrillic", "cyrillic-ext", "greek-ext", "devanagari"):
            label = raw.strip()
            continue
        if label != "latin":
            continue
        for block in re.findall(r"@font-face\s*\{[^}]*\}", raw):
            wt = re.search(r"font-weight:\s*(\d+)", block)
            st = re.search(r"font-style:\s*(\w+)", block)
            url = re.search(r"src:\s*url\(([^)]+\.woff2)\)", block)
            if wt and st and url:
                yield int(wt.group(1)), st.group(1), url.group(1)


def main():
    css_only = "--css-only" in sys.argv
    os.makedirs(OUT, exist_ok=True)
    emitted = []
    for family, cfg in FONTS.items():
        css = fetch(css_url(family, cfg["weights"], cfg["italics"])).decode("utf-8", "replace")
        for weight, style, url in parse_latin_blocks(css):
            ital = style == "italic"
            fname = f"{slug(family)}-{weight}{'i' if ital else ''}.woff2"
            dest = os.path.join(OUT, fname)
            if not css_only:
                data = fetch(url)
                with open(dest, "wb") as fh:
                    fh.write(data)
                print(f"  saved public/fonts/{fname}  ({len(data)//1024} KB)", file=sys.stderr)
            emitted.append(
                f"@font-face {{\n"
                f"  font-family: '{family}';\n"
                f"  font-style: {style};\n"
                f"  font-weight: {weight};\n"
                f"  font-display: swap;\n"
                f"  src: url('/fonts/{fname}') format('woff2');\n"
                f"}}"
            )
    print("\n".join(emitted))


if __name__ == "__main__":
    main()
