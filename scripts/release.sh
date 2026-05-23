#!/bin/bash
# Chaos Command release helper
# Usage:
#   scripts/release.sh 0.4.9 "v0.4.9: short summary of what's in this release 🚀"
#
# Bumps package.json + tauri.conf.json + Cargo.toml versions, commits,
# regenerates CHANGELOG, deploys to chaoscommand.center. Does NOT build the
# installer — that's a separate step you do AFTER this confirms the version
# bumps cleanly.
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

echo ""
echo "✅ Release v$NEW_VERSION shipped:"
echo "   📋 Changelog live at:  https://chaoscommand.center/changelog.html"
echo "   📥 /download pill says: v$NEW_VERSION · $TODAY · What changed?"
echo ""
echo "   Next manual steps (not automated):"
echo "   1. Build the Tauri binaries: pnpm tauri build (and android equivalent)"
echo "   2. Copy installers to /var/www/chaoscommand.center/download/"
echo "   3. Update the version-specific symlinks (ChaosCommand-setup.exe → setup-v$NEW_VERSION.exe etc.)"
