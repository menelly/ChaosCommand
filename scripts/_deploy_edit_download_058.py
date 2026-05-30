#!/usr/bin/env python3
# One-shot: update the live download page copy to 0.5.8. Run as root on the server.
import re, sys

p = "/var/www/chaoscommand.center/download/index.html"
s = open(p, encoding="utf-8").read()

# version pill
s = s.replace("v0.5.6 · 2026-05-25 · What changed?", "v0.5.8 · 2026-05-30 · What changed?")

# "What's new" block — replace the whole 0.5.6 list with 0.5.8 highlights
new_block = """            <h2>What&rsquo;s new in v0.5.8</h2>
            <ul>
                <li><strong>Your medical report now includes everything you track.</strong> Eight kinds of logging that were silently left off the exported PDF &mdash; muscle weakness, energy &amp; post-exertional crashes, sensory overload, upper-GI, substance use, movement tolerance, crisis events, and food intake &mdash; now appear. What you log is what your doctor sees.</li>
                <li><strong>Medications &amp; appointment attendance now export.</strong> Your current regimen and your record of attending appointments are included in the report &mdash; useful evidence for disability / SSDI.</li>
                <li><strong>Password-protect your exported reports.</strong> Exported PDFs can now be encrypted, so your medical data isn&rsquo;t sitting unprotected in your Downloads folder &mdash; with a clear warning whenever it isn&rsquo;t.</li>
                <li><strong>Clearer report layout</strong> &mdash; fixed text crowding the tables and a couple of display glitches.</li>
            </ul>"""

s2, n = re.subn(r"<h2>What&rsquo;s new in v0\.5\.6</h2>.*?</ul>", new_block, s, count=1, flags=re.DOTALL)
if n != 1:
    print("!! changelog block not matched — aborting copy edit"); sys.exit(2)

open(p, "w", encoding="utf-8").write(s2)
print("download page -> 0.5.8 (pill + changelog updated)")
