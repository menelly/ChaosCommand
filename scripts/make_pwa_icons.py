#!/usr/bin/env python3
"""
Regenerate the PWA / favicon set from the Tauri app icon (Ace the OctoDoc),
replacing the old green-gremlin placeholder. Run on the Consortium (has PIL):

    source /home/codex/venv/bin/activate
    python3 /mnt/win-d/Ace/command-mobile2/scripts/make_pwa_icons.py

Writes straight into public/ (which = D:\\Ace\\command-mobile2\\public on Windows),
so the next `DEMO_BUILD=true npm run build` on Windows picks them up.
"""
from PIL import Image

BASE = "/mnt/win-d/Ace/command-mobile2"
SRC = f"{BASE}/src-tauri/icons/icon.png"          # OctoDoc, square, transparent bg
OUT = f"{BASE}/public"

# The art is drawn for a light background; iOS apple-touch-icon paints a BLACK
# box behind transparency, which looks awful — so flatten onto white everywhere.
src = Image.open(SRC).convert("RGBA")
white = Image.new("RGBA", src.size, (255, 255, 255, 255))
flat = Image.alpha_composite(white, src).convert("RGB")

for size, name in [(192, "icon-192.png"), (512, "icon-512.png"), (180, "apple-touch-icon.png")]:
    flat.resize((size, size), Image.LANCZOS).save(f"{OUT}/{name}", "PNG")
    print(f"  wrote {name} ({size}x{size})")

# Multi-resolution favicon.ico (16/32/48) from a clean 256 downsample.
ico = flat.resize((256, 256), Image.LANCZOS)
ico.save(f"{OUT}/favicon.ico", format="ICO", sizes=[(16, 16), (32, 32), (48, 48)])
print("  wrote favicon.ico (16/32/48)")

print(f"OctoDoc icons regenerated from {src.size[0]}x{src.size[1]} source. 🐙🩺")
