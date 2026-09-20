# 🏗️ BUILD NOTES — things that cost time to rediscover

## ⚠️ DELETE `.next` BEFORE THE ANDROID / AAB BUILD. EVERY TIME.

**Ren, 2026-09-04:** *"you will want to delete next before you try to do the Android build again
because it will crash I promise this happens every time."* Believed on observed behavior — Ren has
watched this fail repeatedly. Do not re-derive it, do not skip it because the tree "looks clean."

```
rm -rf .next
npx tauri android build --aab
```

Applies especially when an MSIX/desktop build ran first: both invoke `next build`, and the
leftover `.next` state from the desktop pass breaks the Android one.

**Order that works:** MSIX → `rm -rf .next` → AAB.
**Never run them concurrently** — they fight over `.next`.

## Commands

- **MSIX (Microsoft Store):**
  `powershell -File scripts\pack-msix.ps1`
  FREE edition is the default; `-Store` turns the trial/entitlement gating ON and is **not** used
  for shipped builds (that code is dormant behind the flag on purpose).
  Output: `msix\dist\ChaosCommand_<ver>_x64.msix` → upload in Partner Center → Packages.

- **AAB (Play Store):**
  `npx tauri android build --aab`
  Output: `src-tauri\gen\android\app\build\outputs\bundle\universalRelease\app-universal-release.aab`

## Version lives in THREE files and they must agree

- `package.json`
- `src-tauri/tauri.conf.json`
- `src-tauri/Cargo.toml`

Storefront drift is real: as of 2026-09-04 the Microsoft Store had shipped 1.0.5 while Play had
1.0.6. Bumped both to **1.0.7** to resync. Play rejects duplicate version codes outright.

## From `scripts/pack-msix.ps1` — notes that already cost someone time

- The MSIX manifest was **recovered from the previously shipped MSIX** (an MSIX is a zip). Do NOT
  author a fresh one — Identity Name + Publisher GUID must match Partner Center exactly or the
  upload is rejected.
- Microsoft **re-signs on submission**; the local dev cert never reaches the Store.
- Must go through `tauri build`, **not** `cargo build --release` — the Tauri CLI enables the
  `custom-protocol` feature that embeds the static frontend. A plain cargo build falls back to the
  dev URL and shows "can't reach this page" standalone.
- The built binary is `app.exe`; the manifest declares `ChaosCommand.exe`. The script renames on
  staging. Left alone, the MSIX installs and then fails to launch — miserable to debug from
  Partner Center.
