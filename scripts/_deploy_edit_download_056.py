#!/usr/bin/env python3
# One-shot: update the live download page copy to 0.5.6. Run as root on the server.
import re, sys

p = "/var/www/chaoscommand.center/download/index.html"
s = open(p, encoding="utf-8").read()

# version pill
s = s.replace("v0.5.5 · 2026-05-24", "v0.5.6 · 2026-05-24")

# "What's new" block — replace the whole 0.5.5 list with 0.5.6 highlights
new_block = """            <h2>What&rsquo;s new in v0.5.6</h2>
            <ul>
                <li><strong>Readable danger on every theme.</strong> &ldquo;Call 911&rdquo; cards and red-flag warnings now take their colour from each theme instead of a hardcoded red &mdash; safety text can never go dark-red-on-a-dark-background and become unreadable.</li>
                <li><strong>Built-in Contrast Check.</strong> A live readability meter in Settings shows the WCAG contrast of your current theme&rsquo;s colours &mdash; flip themes or tweak your own and instantly see if anything is hard to read.</li>
                <li><strong>New &ldquo;Pink Goes Good With Green&rdquo; theme</strong> &mdash; dark jewel tones with a Glinda-to-Elphaba sidebar &mdash; plus info / success / warning colours added across all 15 themes.</li>
                <li><strong>Settings tidied up.</strong> Customize and tracker panels collapse into tap-to-open sections &mdash; one screen instead of endless scroll.</li>
                <li><strong>Text-size scaling fixed</strong> to scale every bit of text (including the small print), plus a Live Simple handwriting font and a slimmer mobile scrollbar.</li>
            </ul>"""

s2, n = re.subn(r"<h2>What&rsquo;s new in v0\.5\.5</h2>.*?</ul>", new_block, s, count=1, flags=re.DOTALL)
if n != 1:
    print("!! changelog block not matched — aborting copy edit"); sys.exit(2)

open(p, "w", encoding="utf-8").write(s2)
print("download page -> 0.5.6 (pill + changelog updated)")
