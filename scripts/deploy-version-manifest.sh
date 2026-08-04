#!/usr/bin/env bash
#
# Publish the auto-update manifest to chaoscommand.center/version.json
#
# ─── WHY THIS SCRIPT EXISTS ─────────────────────────────────────────────────
#
# This step was skipped on EVERY release from June 2026 onward. The live
# manifest sat at 0.6.0 (7 June) through 0.7.0, 0.7.1, 1.0.0-1.0.4 and the
# switch to free, so nobody running an older build was ever told any of it
# happened.
#
# It kept being missed because it is the one release step that lives on a
# different machine, is done by hand, and FAILS SILENTLY IN THE DIRECTION WHERE
# NOBODY COMPLAINS: the check is
#
#     if (!isNewerVersion(APP_VERSION, data.version)) return null
#
# and isNewerVersion("1.0.4", "0.6.0") is false — so the app quietly decides
# there is no update and says nothing. A missed deploy produces no error, no
# nag, no support ticket. Only silence, from users who never learn there is
# anything to install.
#
# So the fix is not "remember harder". It is a script that does the copy AND
# THEN VERIFIES THE PUBLIC URL, because a successful scp proves a file moved,
# not that the world changed.
#
# Usage:
#   ./scripts/deploy-version-manifest.sh 1.0.5
#
set -euo pipefail

VERSION="${1:-}"
if [[ -z "$VERSION" ]]; then
  echo "usage: $0 <version>   e.g. $0 1.0.5" >&2
  exit 2
fi

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$REPO_ROOT/scripts/version-$VERSION.json"
HOST="thereny@192.168.4.200"
WEBROOT="/var/www/chaoscommand.center"
PUBLIC_URL="https://chaoscommand.center/version.json"

[[ -f "$SRC" ]] || { echo "ERROR: $SRC does not exist. Run bump_version.py with --notes first." >&2; exit 1; }

# Refuse to publish a manifest whose version disagrees with its filename — that
# mismatch is precisely how a stale manifest gets published under a fresh name.
FILE_VER="$(python -c "import json,sys;print(json.load(open(sys.argv[1],encoding='utf-8'))['version'])" "$SRC")"
if [[ "$FILE_VER" != "$VERSION" ]]; then
  echo "ERROR: $SRC declares version '$FILE_VER' but was asked to deploy '$VERSION'." >&2
  exit 1
fi

echo "→ publishing $VERSION"

# scp to /tmp then sudo-cp into place: the webroot is root-owned, and scp cannot
# elevate. Never redirect a password into sudo -S here — a pipe replaces stdin
# and has previously leaked a credential into a config file.
scp -q "$SRC" "$HOST:/tmp/version.json"

# Credential comes from the environment, never from this file - scripts/ is in
# the git repo. Set CHAOS_SUDO before calling.
#
# WARNING: `echo | sudo -S`, NOT a heredoc. Piping a heredoc into `sudo -S`
# makes the heredoc become sudo's stdin, which has previously written a
# password into the very file being edited.
: "${CHAOS_SUDO:?set CHAOS_SUDO before running (sudo password for the Consortium)}"

ssh "$HOST" "echo '$CHAOS_SUDO' | sudo -S -p '' cp /tmp/version.json $WEBROOT/version.json"
ssh "$HOST" "echo '$CHAOS_SUDO' | sudo -S -p '' chown www-data:www-data $WEBROOT/version.json"
ssh "$HOST" "echo '$CHAOS_SUDO' | sudo -S -p '' chmod 644 $WEBROOT/version.json"
ssh "$HOST" "rm -f /tmp/version.json"

# ── VERIFY BY THE WORLD ─────────────────────────────────────────────────────
# Cache-Control on this path is 300s, so ask for a fresh copy rather than
# trusting an intermediary. A 200 with the OLD version still counts as failure.
echo "→ verifying $PUBLIC_URL"
sleep 2
LIVE="$(curl -fsS -H 'Cache-Control: no-cache' "$PUBLIC_URL")" || {
  echo "ERROR: could not fetch $PUBLIC_URL" >&2; exit 1; }

LIVE_VER="$(printf '%s' "$LIVE" | python -c "import json,sys;print(json.load(sys.stdin)['version'])")"

if [[ "$LIVE_VER" == "$VERSION" ]]; then
  echo "✅ live manifest now serves $LIVE_VER"
  printf '%s\n' "$LIVE"
else
  echo "❌ DEPLOY DID NOT TAKE: the public URL still serves '$LIVE_VER', expected '$VERSION'." >&2
  echo "   The copy may have succeeded while a cache or another vhost serves the old file." >&2
  exit 1
fi
