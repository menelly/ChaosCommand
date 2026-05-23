#!/usr/bin/env python3
"""
Generate public-facing CHANGELOG from git commit history.

Pulls commits, groups by version (from message prefixes like "v0.4.5:", "v0.4.4 wave N:"),
filters out internal chores/refactoring, renders HTML + markdown.

Usage:
    python scripts/gen_changelog.py             # writes docs/CHANGELOG.md + CHANGELOG.html
    python scripts/gen_changelog.py --html      # writes only HTML (for chaoscommand.center)
    python scripts/gen_changelog.py --since=v0.3.0  # restrict range
"""
import re
import subprocess
import argparse
from pathlib import Path
from datetime import datetime
from collections import defaultdict

REPO = Path(__file__).resolve().parent.parent  # command-mobile2 root

# Patterns we extract from commit messages
# Only Chaos Command versions (0.X.Y). Tauri 2.x and PolyForm 1.x are noise.
VERSION_PAT = re.compile(r"^\s*v?(0\.\d+\.\d+)\b", re.MULTILINE)
WAVE_PAT = re.compile(r"^\s*v?(0\.\d+\.\d+)\s+wave\s+(\d+)", re.IGNORECASE)

# Commit types we KEEP for public changelog (user-facing)
KEEP_TYPES = {"feat", "fix", "a11y", "ux", "perf", "security"}
# Commit types we HIDE (internal only)
HIDE_TYPES = {"chore", "refactor", "docs", "test", "build", "ci", "style"}

# Lines to filter out entirely (even if they match keep types)
HIDE_PATTERNS = [
    re.compile(r"^bump.*version", re.I),
    re.compile(r"^cleanup", re.I),
    re.compile(r"^revert", re.I),
]


def get_git_log():
    """Return list of (hash, date, message) tuples in reverse chronological order."""
    out = subprocess.check_output(
        ["git", "log", "--pretty=format:%h|%ad|%s", "--date=short"],
        cwd=REPO, text=True, encoding="utf-8",
    )
    rows = []
    for line in out.strip().split("\n"):
        if "|" not in line:
            continue
        h, d, msg = line.split("|", 2)
        rows.append((h.strip(), d.strip(), msg.strip()))
    return rows


def classify_message(msg: str) -> tuple[str, str]:
    """Return (commit_type, cleaned_subject). Version-prefixed commits classify as 'feat'."""
    # Version-prefixed release commits → treat as feat (release rollup)
    if re.match(r"^\s*v?\d+\.\d+\.\d+", msg):
        return "feat", msg
    m = re.match(r"^(\w+)(?:\([^)]+\))?\s*[:!]\s*(.+)$", msg)
    if m:
        return m.group(1).lower(), m.group(2).strip()
    # Emoji-prefixed commits (no conventional prefix) — heuristic by content
    lower = msg.lower()
    if any(k in lower for k in ("fix", "bug", "🐛", "🐞", "patch")):
        return "fix", msg
    if any(k in lower for k in ("a11y", "accessibility", "screen reader", "wcag", "♿")):
        return "a11y", msg
    if any(k in lower for k in ("perf", "performance", "speed", "⚡")):
        return "perf", msg
    if any(k in lower for k in ("ux", "polish", "design", "🎨")):
        return "ux", msg
    return "feat", msg  # default emoji-tagged commits to feat


def extract_version(msg: str) -> str | None:
    """Extract version this commit belongs to, if obvious from message."""
    wave = WAVE_PAT.search(msg)
    if wave:
        return wave.group(1)
    v = VERSION_PAT.search(msg)
    if v:
        return v.group(1)
    return None


def humanize(msg: str) -> str:
    """Strip leading 'v0.4.4 wave 1: ' style prefixes for the bullet text."""
    msg = re.sub(r"^v?\d+\.\d+\.\d+(?:\s+wave\s+\d+)?\s*[:.\-—]\s*", "", msg, flags=re.I)
    msg = re.sub(r"^\w+(?:\([^)]+\))?\s*[:!]\s*", "", msg)
    return msg.strip()


def build_versioned_changelog():
    rows = get_git_log()
    by_version = defaultdict(list)  # version -> list of (date, type, cleaned_subject)
    no_version = []
    current_version = None  # carry-forward for commits without explicit version tag

    # Iterate oldest-first so version detection cascades forward
    for h, d, msg in reversed(rows):
        ctype, subject = classify_message(msg)
        if any(p.search(msg) for p in HIDE_PATTERNS):
            continue
        if ctype in HIDE_TYPES:
            # Still update current_version if it has one (e.g. "chore: bump version 0.4.6")
            v = extract_version(msg)
            if v:
                current_version = v
            continue
        v = extract_version(msg) or current_version
        if v:
            current_version = v
            by_version[v].append((d, ctype, humanize(msg)))
        else:
            no_version.append((d, ctype, humanize(msg)))

    return by_version, no_version


def version_key(v: str) -> tuple:
    """Sort key for version strings."""
    return tuple(int(x) for x in v.split("."))


# Friendly type → emoji + label
TYPE_DISPLAY = {
    "feat":     ("✨", "New"),
    "fix":      ("🐛", "Fix"),
    "a11y":     ("♿", "Accessibility"),
    "ux":       ("💫", "UX"),
    "perf":     ("⚡", "Performance"),
    "security": ("🔒", "Security"),
    "unknown":  ("•",  "Change"),
}


def render_markdown(by_version, no_version) -> str:
    out = [
        "# Chaos Command — What's New",
        "",
        "_Free, local-first, no telemetry. Built by patients, for patients._",
        "",
        f"_Last updated: {datetime.utcnow():%Y-%m-%d}_",
        "",
        "Each release ships fixes, new trackers, and accessibility improvements.",
        "Want to know exactly what changed? Every commit is public:",
        "[github.com/menelly/ChaosCommand](https://github.com/menelly/ChaosCommand)",
        "",
    ]
    for v in sorted(by_version.keys(), key=version_key, reverse=True):
        entries = by_version[v]
        if not entries:
            continue
        latest_date = max(e[0] for e in entries)
        out.append(f"## v{v} — {latest_date}")
        out.append("")
        # Group by type
        by_type = defaultdict(list)
        for d, t, m in entries:
            by_type[t].append(m)
        for t in ("feat", "fix", "a11y", "ux", "perf", "security", "unknown"):
            if t not in by_type:
                continue
            emoji, label = TYPE_DISPLAY[t]
            out.append(f"### {emoji} {label}")
            for m in by_type[t]:
                out.append(f"- {m}")
            out.append("")
    return "\n".join(out)


def render_html(by_version, no_version) -> str:
    head = """<!DOCTYPE html>
<html lang="en" data-mode="chaos">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>What's New — Chaos Command</title>
<meta name="description" content="Changelog and release notes for Chaos Command. See exactly what changed in every version.">
<link rel="icon" type="image/x-icon" href="/favicon.ico">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&family=Crimson+Pro:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
  html { scroll-behavior: smooth; }
  :root {
    --bg-primary: #0d0a14;
    --bg-secondary: #161222;
    --bg-card: #1c1730;
    --bg-card-hover: #241e3a;
    --text-primary: #e8e4f0;
    --text-secondary: #a8a0c0;
    --text-muted: #908ba0;
    --accent-1: #b388ff;
    --accent-2: #64ffda;
    --accent-3: #ff80ab;
    --accent-glow: rgba(179, 136, 255, 0.15);
    --border: rgba(179, 136, 255, 0.12);
    --font-primary: 'Inter', -apple-system, sans-serif;
    --font-display: 'Crimson Pro', Georgia, serif;
    --font-mono: 'JetBrains Mono', monospace;
    --radius: 16px;
  }
  body {
    font-family: var(--font-primary);
    background: var(--bg-primary);
    color: var(--text-primary);
    line-height: 1.65;
    min-height: 100vh;
    background-image:
      radial-gradient(circle at 20% 10%, var(--accent-glow) 0%, transparent 50%),
      radial-gradient(circle at 80% 80%, rgba(100, 255, 218, 0.06) 0%, transparent 50%);
  }
  .container { max-width: 780px; margin: 0 auto; padding: 3rem 1.5rem 5rem; }
  .back-link {
    display: inline-block; color: var(--text-muted); text-decoration: none;
    font-size: 0.9rem; margin-bottom: 1.5rem; transition: color 0.3s;
  }
  .back-link:hover { color: var(--accent-1); }
  h1 {
    font-family: var(--font-display); font-size: clamp(2.2rem, 5vw, 3.2rem);
    font-weight: 700; margin-bottom: 0.5rem; line-height: 1.1;
    background: linear-gradient(135deg, var(--accent-1) 0%, var(--accent-2) 100%);
    -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
  }
  .tagline { color: var(--text-secondary); font-size: 1rem; margin-bottom: 1rem; }
  .preamble {
    background: var(--bg-card); padding: 1.25rem 1.5rem; border-radius: var(--radius);
    border: 1px solid var(--border); border-left: 3px solid var(--accent-1);
    margin: 2rem 0;
  }
  .preamble p { margin-bottom: 0.5rem; color: var(--text-secondary); }
  .preamble p:last-child { margin-bottom: 0; }
  .preamble a { color: var(--accent-2); text-decoration: none; }
  .preamble a:hover { text-decoration: underline; }
  .meta { color: var(--text-muted); font-family: var(--font-mono); font-size: 0.85rem; margin-bottom: 2rem; }
  h2 {
    font-family: var(--font-display); color: var(--accent-1);
    margin-top: 3rem; padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--border); font-size: 1.6rem; font-weight: 600;
  }
  h2 .date { font-family: var(--font-mono); color: var(--text-muted); font-size: 0.85rem; font-weight: 400; margin-left: 0.5rem; }
  h3 {
    color: var(--text-primary); margin-top: 1.5rem; margin-bottom: 0.5rem;
    font-size: 1rem; font-weight: 600; letter-spacing: 0.02em;
  }
  ul { padding-left: 1.5rem; margin-bottom: 0.5rem; }
  li { margin-bottom: 0.4rem; color: var(--text-secondary); }
  a { color: var(--accent-1); }
</style>
</head>
<body>
<div class="container">
<a href="/" class="back-link">← back to chaoscommand.center</a>
<h1>What's New</h1>
<p class="tagline">Chaos Command changelog — auto-generated from the public git log</p>
<div class="preamble">
  <p><strong>Free, local-first, no telemetry.</strong> Built by patients, for patients.</p>
  <p>Every line of code is public on <a href="https://github.com/menelly/ChaosCommand">github.com/menelly/ChaosCommand</a>. This page is generated from those commits — it's the receipt for what shipped in each release. Audit before you trust.</p>
</div>
"""
    body = []
    body.append(f'<p class="meta">Last updated: {datetime.utcnow():%Y-%m-%d}</p>')
    for v in sorted(by_version.keys(), key=version_key, reverse=True):
        entries = by_version[v]
        if not entries:
            continue
        latest_date = max(e[0] for e in entries)
        body.append(f'<h2>v{v}<span class="date">&middot; {latest_date}</span></h2>')
        by_type = defaultdict(list)
        for d, t, m in entries:
            by_type[t].append(m)
        for t in ("feat", "fix", "a11y", "ux", "perf", "security", "unknown"):
            if t not in by_type:
                continue
            emoji, label = TYPE_DISPLAY[t]
            body.append(f"<h3>{emoji} {label}</h3><ul>")
            for m in by_type[t]:
                # Escape HTML
                safe = m.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                body.append(f"<li>{safe}</li>")
            body.append("</ul>")
    return head + "\n".join(body) + "\n</div></body></html>"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--html-only", action="store_true")
    ap.add_argument("--out-dir", default=".")
    args = ap.parse_args()

    by_version, no_version = build_versioned_changelog()
    out_dir = Path(args.out_dir)
    out_dir.mkdir(exist_ok=True, parents=True)

    if not args.html_only:
        md_path = out_dir / "CHANGELOG.md"
        md_path.write_text(render_markdown(by_version, no_version), encoding="utf-8")
        print(f"Wrote {md_path}")

    html_path = out_dir / "changelog.html"
    html_path.write_text(render_html(by_version, no_version), encoding="utf-8")
    print(f"Wrote {html_path}")

    n_versions = len([v for v in by_version if by_version[v]])
    n_entries = sum(len(v) for v in by_version.values())
    print(f"  {n_versions} versions, {n_entries} user-facing entries")


if __name__ == "__main__":
    main()
