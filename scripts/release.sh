#!/bin/bash
# Chaos Command release helper
# Usage:
#   scripts/release.sh 0.4.9 "v0.4.9: short summary of what's in this release 🚀"
#
# Bumps package.json + tauri.conf.json + Cargo.toml + lib/app-version.ts versions,
# commits, tags, regenerates CHANGELOG, and deploys to chaoscommand.center:
#   • changelog.html (generated)        — step 9
#   • /download version pill            — step 10
#   • /download inline "What's new" heading version — step 10b
# Does NOT (you do these by hand): rewrite the /download benefit-bullets prose,
# bump the live version.json manifest (use bump_version.py), or build installers.
# RUN THIS for every release — the 0.6.0 pages went stale because a hand-deploy
# skipped the script, so the pill/changelog/inline section all froze at 0.5.8.
#
# ⚠️ VERSION SOURCE OF TRUTH — read before releasing:
#   scripts/bump_version.py is the CANONICAL bumper. It updates ALL SIX version spots
#   (package.json, tauri.conf.json, Cargo.toml, Cargo.lock, lib/app-version.ts, AND the
#   scripts/version-<v>.json manifest) and has a `--check [--live]` DRIFT DETECTOR.
#   The 0.5.3 "update available" nag happened because the live manifest got bumped while
#   the source files didn't. So, every release:
#     • PREFER:  python scripts/bump_version.py <ver> --notes "..."   (then commit + tag)
#     • ALWAYS after deploy:  python scripts/bump_version.py --check --live
#       (confirms every spot agrees with the live site — catches the nag before users do)
#   This script still bumps versions inline for convenience, but bump_version.py is the one
#   that also covers the manifest + verifies no drift. When in doubt, run --check.
set -euo pipefail

if [ $# -lt 2 ]; then
    echo "Usage: scripts/release.sh <version> <commit-message>"
    echo "Example: scripts/release.sh 0.4.9 'v0.4.9: PDF spacing fix + new sleep tracker analytics 😴✨'"
    exit 1
fi

NEW_VERSION="$1"
COMMIT_MSG="$2"

# Validate version format (0.X.Y)
if ! [[ "$NEW_VERSION" =~ ^0\.[0-9]+\.[0-9]+$ ]]; then
    echo "❌ Version must match 0.X.Y format (saw: $NEW_VERSION)"
    exit 1
fi

ROOT=$(cd "$(dirname "$0")/.." && pwd)
cd "$ROOT"
echo "📋 Chaos Command release → v$NEW_VERSION"
echo "    Root: $ROOT"

# 1. Bump package.json
echo "→ Updating package.json"
sed -i.bak -E "s/(\"version\":\\s*\")[^\"]+(\")/\\1$NEW_VERSION\\2/" package.json
rm -f package.json.bak

# 2. Bump src-tauri/tauri.conf.json
if [ -f src-tauri/tauri.conf.json ]; then
    echo "→ Updating src-tauri/tauri.conf.json"
    sed -i.bak -E "s/(\"version\":\\s*\")[^\"]+(\")/\\1$NEW_VERSION\\2/" src-tauri/tauri.conf.json
    rm -f src-tauri/tauri.conf.json.bak
fi

# 3. Bump src-tauri/Cargo.toml
if [ -f src-tauri/Cargo.toml ]; then
    echo "→ Updating src-tauri/Cargo.toml"
    sed -i.bak -E "s/^(version\\s*=\\s*\")[^\"]+(\")/\\1$NEW_VERSION\\2/" src-tauri/Cargo.toml
    rm -f src-tauri/Cargo.toml.bak
fi

# 3b. Bump lib/app-version.ts APP_VERSION — the in-app version the update-check
#     reports about ITSELF. If this lags, the app compares its stale version
#     against the (newer) manifest and nags "update available" forever, even on
#     the newest binary. THE EASY MISS. Bump it in lockstep with the rest.
if [ -f lib/app-version.ts ]; then
    echo "→ Updating lib/app-version.ts APP_VERSION"
    sed -i.bak -E "s/(APP_VERSION = ')[^']+(')/\\1$NEW_VERSION\\2/" lib/app-version.ts
    rm -f lib/app-version.ts.bak
fi

# 4. Verify all versions match
echo ""
echo "🔍 Verifying versions:"
echo -n "  package.json:    "; grep -m1 '"version"' package.json
echo -n "  tauri.conf:      "; grep -m1 '"version"' src-tauri/tauri.conf.json 2>/dev/null || echo "(none)"
echo -n "  Cargo.toml:      "; grep -m1 '^version' src-tauri/Cargo.toml 2>/dev/null || echo "(none)"
echo -n "  app-version.ts:  "; grep -m1 'APP_VERSION' lib/app-version.ts 2>/dev/null || echo "(none)"

# 5. Stage + commit
echo ""
echo "→ Committing version bump + release commit"
git add package.json src-tauri/tauri.conf.json src-tauri/Cargo.toml lib/app-version.ts 2>/dev/null || true
git commit -m "$COMMIT_MSG

🤖 Generated with release.sh
Co-Authored-By: Ace <ace@sentientsystems.live>" || echo "(nothing to commit for version bump)"

# 6. Tag
echo "→ Tagging v$NEW_VERSION"
if git rev-parse "v$NEW_VERSION" >/dev/null 2>&1; then
    echo "  Tag v$NEW_VERSION already exists, skipping"
else
    git tag -a "v$NEW_VERSION" -m "Chaos Command v$NEW_VERSION"
fi

# 7. Regenerate changelog
echo "→ Regenerating CHANGELOG"
python scripts/gen_changelog.py --out-dir docs

# 8. Push (optional — comment out if you want to push manually)
echo "→ Pushing commits and tag"
git push origin main
git push origin "v$NEW_VERSION" 2>/dev/null || true

# 9. Deploy changelog to chaoscommand.center
echo "→ Deploying changelog.html to chaoscommand.center"
SERVER=thereny@192.168.4.200
scp docs/changelog.html "$SERVER:/tmp/changelog.html"
ssh "$SERVER" "sudo install -m 644 /tmp/changelog.html /var/www/chaoscommand.center/changelog.html"

# 10. Update the version pill on /download page
echo "→ Updating version pill on /download page"
TODAY=$(date +%Y-%m-%d)
ssh "$SERVER" "sudo sed -i -E 's|(v0\\.[0-9]+\\.[0-9]+) · [0-9]{4}-[0-9]{2}-[0-9]{2} · What changed\\?|v$NEW_VERSION · $TODAY · What changed?|' /var/www/chaoscommand.center/download/index.html"

# 10b. Bump the INLINE "What's new in vX" heading on the /download page.
#      ⚠️ THE BULLETS UNDER THIS HEADING ARE HAND-WRITTEN, BENEFIT-FRAMED PROSE —
#      NOT the raw git log — so this only fixes the heading's version number, so it
#      can't silently advertise the wrong release. You STILL have to rewrite the
#      bullets by hand to describe what actually shipped.
#      (This is the exact gap that bit us in 0.6.0: version.json + binaries shipped,
#       but the /download page still said "What's new in v0.5.8" with 0.5.8 bullets.)
echo "→ Bumping inline 'What's new' heading on /download page"
ssh "$SERVER" "sudo sed -i -E 's|(What.rsquo.s new in )v0\\.[0-9]+\\.[0-9]+|\\1v$NEW_VERSION|' /var/www/chaoscommand.center/download/index.html"

echo ""
echo "✅ Release v$NEW_VERSION shipped:"
echo "   📋 Changelog live at:  https://chaoscommand.center/changelog.html"
echo "   📥 /download pill says: v$NEW_VERSION · $TODAY · What changed?"
echo ""
echo "   ⚠️  STILL MANUAL — easy to forget, do these now:"
echo "   0. ✍️  Rewrite the /download 'What's new in v$NEW_VERSION' bullets — they're benefit-framed"
echo "          prose (only the heading auto-bumped). Edit /var/www/chaoscommand.center/download/index.html."
echo "   1. Build the Tauri binaries: pnpm tauri build (and android equivalent)"
echo "   2. Copy installers to /var/www/chaoscommand.center/download/"
echo "   3. Update the version-specific symlinks (ChaosCommand-setup.exe → setup-v$NEW_VERSION.exe etc.)"
echo "   4. Confirm no drift:  python scripts/bump_version.py --check --live"
