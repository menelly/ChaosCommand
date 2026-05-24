#!/usr/bin/env python3
"""
Chaos Command — version bumper + drift detector.

THE PROBLEM THIS SOLVES
-----------------------
A Chaos Command release has the version string written in SIX places. If any
one of them drifts out of sync, you get the "update available" nag that won't
die — the app compares its own baked-in APP_VERSION against the live manifest,
and if they disagree it nags forever.

We've now been bitten in BOTH directions:
  * 0.4.95: lib/app-version.ts lagged behind the others  → nag.
  * 0.5.3:  the live manifest got bumped but the 5 source files did NOT → nag,
            and the shipped binaries reported the OLD version.

The six places:
  1. package.json                "version"
  2. src-tauri/tauri.conf.json   "version"
  3. src-tauri/Cargo.toml        [package] version
  4. src-tauri/Cargo.lock        the `app` package version
  5. lib/app-version.ts          APP_VERSION   (the easy-miss in-app constant)
  6. scripts/version-<v>.json    the update manifest that ships to
                                 chaoscommand.center/version.json (the easy-miss
                                 on the OTHER side — what bit us in 0.5.3)

USAGE
-----
  # Bump every source file to a new version (and write the manifest if --notes):
  python scripts/bump_version.py 0.5.4 --notes "Short human changelog blurb."

  # Just check whether everything currently agrees (drift detector, no writes):
  python scripts/bump_version.py --check

  # Check that everything is pinned to a specific version:
  python scripts/bump_version.py --check 0.5.4

  # Also compare against what the LIVE site is serving (needs network):
  python scripts/bump_version.py --check --live

This script does NOT build or deploy. After a clean bump:
  1. rm -rf .next            (flaky webpack WasmHash crash otherwise)
  2. pnpm tauri:build        (+ pnpm tauri android build for the APK)
  3. deploy binaries + the manifest to /var/www/chaoscommand.center/
See scripts/release.sh for the deploy half.
"""
from __future__ import annotations

import argparse
import datetime as _dt
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DOWNLOAD_URL = "https://chaoscommand.center/download"
LIVE_MANIFEST_URL = "https://chaoscommand.center/version.json"

VERSION_RE = re.compile(r"^\d+\.\d+\.\d+$")


# --- per-file readers + writers -------------------------------------------
# Each entry: (label, path, read_fn, write_fn). read_fn returns the current
# version string (or None if not found). write_fn rewrites the file to `ver`
# and returns True if it changed anything.

def _read_first_json_version(path: Path) -> str | None:
    """First top-level "version": "x.y.z" in a JSON file."""
    if not path.exists():
        return None
    m = re.search(r'"version"\s*:\s*"([^"]+)"', path.read_text(encoding="utf-8"))
    return m.group(1) if m else None


def _write_first_json_version(path: Path, ver: str) -> bool:
    text = path.read_text(encoding="utf-8")
    new = re.sub(r'("version"\s*:\s*")[^"]+(")', rf"\g<1>{ver}\g<2>", text, count=1)
    if new != text:
        path.write_text(new, encoding="utf-8")
        return True
    return False


def _read_cargo_toml_version(path: Path) -> str | None:
    if not path.exists():
        return None
    m = re.search(r'^version\s*=\s*"([^"]+)"', path.read_text(encoding="utf-8"), re.M)
    return m.group(1) if m else None


def _write_cargo_toml_version(path: Path, ver: str) -> bool:
    text = path.read_text(encoding="utf-8")
    new = re.sub(r'^(version\s*=\s*")[^"]+(")', rf"\g<1>{ver}\g<2>", text, count=1, flags=re.M)
    if new != text:
        path.write_text(new, encoding="utf-8")
        return True
    return False


# Cargo.lock: target the `app` package block specifically, not some dependency.
_LOCK_APP_RE = re.compile(
    r'(\[\[package\]\]\s*\nname\s*=\s*"app"\s*\nversion\s*=\s*")([^"]+)(")'
)


def _read_cargo_lock_version(path: Path) -> str | None:
    if not path.exists():
        return None
    m = _LOCK_APP_RE.search(path.read_text(encoding="utf-8"))
    return m.group(2) if m else None


def _write_cargo_lock_version(path: Path, ver: str) -> bool:
    if not path.exists():
        return False
    text = path.read_text(encoding="utf-8")
    new = _LOCK_APP_RE.sub(rf"\g<1>{ver}\g<3>", text, count=1)
    if new != text:
        path.write_text(new, encoding="utf-8")
        return True
    return False


_APPVER_RE = re.compile(r"(APP_VERSION\s*=\s*')([^']+)(')")


def _read_app_version_ts(path: Path) -> str | None:
    if not path.exists():
        return None
    m = _APPVER_RE.search(path.read_text(encoding="utf-8"))
    return m.group(2) if m else None


def _write_app_version_ts(path: Path, ver: str) -> bool:
    text = path.read_text(encoding="utf-8")
    new = _APPVER_RE.sub(rf"\g<1>{ver}\g<3>", text, count=1)
    if new != text:
        path.write_text(new, encoding="utf-8")
        return True
    return False


SOURCES = [
    ("package.json",        ROOT / "package.json",               _read_first_json_version, _write_first_json_version),
    ("tauri.conf.json",     ROOT / "src-tauri" / "tauri.conf.json", _read_first_json_version, _write_first_json_version),
    ("Cargo.toml",          ROOT / "src-tauri" / "Cargo.toml",   _read_cargo_toml_version, _write_cargo_toml_version),
    ("Cargo.lock (app)",    ROOT / "src-tauri" / "Cargo.lock",   _read_cargo_lock_version, _write_cargo_lock_version),
    ("lib/app-version.ts",  ROOT / "lib" / "app-version.ts",     _read_app_version_ts,     _write_app_version_ts),
]


# --- manifest -------------------------------------------------------------

def _manifest_path(ver: str) -> Path:
    return ROOT / "scripts" / f"version-{ver}.json"


def _read_latest_manifest() -> tuple[str | None, Path | None]:
    """Highest-versioned scripts/version-*.json on disk."""
    candidates = []
    for p in (ROOT / "scripts").glob("version-*.json"):
        m = re.match(r"version-(\d+\.\d+\.\d+)\.json$", p.name)
        if m:
            candidates.append((tuple(int(x) for x in m.group(1).split(".")), m.group(1), p))
    if not candidates:
        return None, None
    candidates.sort()
    _, ver, path = candidates[-1]
    return ver, path


def _write_manifest(ver: str, notes: str) -> Path:
    path = _manifest_path(ver)
    payload = {
        "version": ver,
        "released": _dt.date.today().isoformat(),
        "url": DOWNLOAD_URL,
        "notes": notes,
    }
    path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    return path


def _fetch_live_version() -> str | None:
    try:
        import urllib.request
        req = urllib.request.Request(
            LIVE_MANIFEST_URL, headers={"User-Agent": "chaos-bump-version/1.0"}
        )
        with urllib.request.urlopen(req, timeout=10) as r:
            return json.loads(r.read().decode("utf-8")).get("version")
    except Exception as e:  # best-effort only
        print(f"  (could not reach live manifest: {e})")
        return None


# --- commands -------------------------------------------------------------

def cmd_bump(ver: str, notes: str | None) -> int:
    if not VERSION_RE.match(ver):
        print(f"X version must look like 0.X.Y (got: {ver!r})")
        return 2

    print(f"Bumping Chaos Command -> {ver}\n")
    changed_any = False
    for label, path, read_fn, write_fn in SOURCES:
        before = read_fn(path)
        if before is None:
            print(f"  ! {label:22} version string NOT FOUND ({path}) — skipped")
            continue
        if write_fn(path, ver):
            print(f"  + {label:22} {before} -> {ver}")
            changed_any = True
        else:
            print(f"  = {label:22} already {ver}")

    if notes is not None:
        mpath = _write_manifest(ver, notes)
        print(f"  + manifest               wrote {mpath.relative_to(ROOT)}")
        changed_any = True
    else:
        print("  . manifest               skipped (no --notes; remember to ship version.json!)")

    print()
    if not changed_any:
        print("Nothing changed - everything was already at this version.")
    # Re-verify
    ok = _verify(ver, check_live=False, quiet=False)
    print()
    print("Next steps (NOT done by this script):")
    print("  1. git add -A && git commit -m '... ' && git tag v%s" % ver)
    print("  2. rm -rf .next && pnpm tauri:build")
    print("  3. pnpm tauri android build   (keep desktop+APK on the same Tauri crate)")
    print("  4. deploy binaries + scripts/version-%s.json -> chaoscommand.center" % ver)
    return 0 if ok else 1


def _verify(expected: str | None, check_live: bool, quiet: bool) -> bool:
    """Return True if all source files (and manifest) agree.

    If `expected` is given, all must equal it. Otherwise they just must match
    each other. The live manifest is compared too when check_live is set.
    """
    found: dict[str, str | None] = {}
    for label, path, read_fn, _ in SOURCES:
        found[label] = read_fn(path)

    man_ver, man_path = _read_latest_manifest()
    if man_path is not None:
        found[f"manifest ({man_path.name})"] = man_ver

    live = _fetch_live_version() if check_live else None
    if check_live:
        found["LIVE version.json"] = live

    present = {k: v for k, v in found.items() if v is not None}
    distinct = set(present.values())

    target = expected or (next(iter(distinct)) if len(distinct) == 1 else None)

    all_ok = True
    if not quiet:
        for label, ver in found.items():
            if ver is None:
                mark, note = "?", "NOT FOUND"
            elif target is not None and ver != target:
                mark, note = "X", f"!= {target}"
                all_ok = False
            else:
                mark, note = "=", ""
            print(f"  {mark} {label:28} {ver or '-':10} {note}")

    if expected is None and len(distinct) > 1:
        all_ok = False
        if not quiet:
            print(f"\n  DRIFT: {len(distinct)} different versions present: {sorted(distinct)}")
    elif expected is not None and any(v != expected for v in present.values()):
        all_ok = False

    return all_ok


def cmd_check(expected: str | None, check_live: bool) -> int:
    if expected is not None and not VERSION_RE.match(expected):
        print(f"X expected version must look like 0.X.Y (got: {expected!r})")
        return 2
    header = f"Version drift check" + (f" (expecting {expected})" if expected else "")
    print(header + (" + live" if check_live else "") + ":\n")
    ok = _verify(expected, check_live=check_live, quiet=False)
    print()
    print("OK - everything agrees." if ok else "DRIFT DETECTED - fix before shipping (this is the nag bug).")
    return 0 if ok else 1


def main(argv: list[str]) -> int:
    p = argparse.ArgumentParser(description="Chaos Command version bumper + drift detector.")
    p.add_argument("version", nargs="?", help="new version (0.X.Y) to bump to, or the version to assert in --check mode")
    p.add_argument("--check", action="store_true", help="report current versions / detect drift; do not write")
    p.add_argument("--live", action="store_true", help="also compare against the live chaoscommand.center manifest")
    p.add_argument("--notes", help="human changelog blurb; when given (bump mode), also writes scripts/version-<v>.json")
    args = p.parse_args(argv)

    if args.check:
        return cmd_check(args.version, args.live)
    if not args.version:
        p.error("a version is required unless --check is used")
    if args.live:
        print("(--live is only meaningful with --check; ignoring)\n")
    return cmd_bump(args.version, args.notes)


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
