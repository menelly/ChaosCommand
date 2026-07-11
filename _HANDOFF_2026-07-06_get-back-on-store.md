# 🚀 HANDOFF — get Chaos Command BACK ON the MS Store (2026-07-06, Ren wants it up TODAY)

**Goal:** finish the PIN-encryption security fix + resubmit Chaos Command to the Microsoft Store.
**Ren PULLED IT from the store herself** on the Thursday, having found — unprompted — that PINs/data were living in plaintext in Dexie. Nobody caught her; there is no violation on file. The
crypto fix + a cascade of bugs it exposed are mostly done — this is the finish-and-ship pass.

## ✅ ALREADY DONE (committed + pushed)
- Branch **`ace/pin-encryption-nav-decrypt-fixes`** (commit **2cf69a1**), pushed to GitHub HTTPS
  remote `https://github.com/menelly/ChaosCommand.git`. `tsc --noEmit` clean; `next build` green (89
  static pages). Fixes landed + Ren-confirmed working:
  - **Data-visibility (the big one):** `lib/database/hooks/use-daily-data.ts` — `getDateRange` was using
    `.and()` (cursor → returned `enc:v1:` CIPHERTEXT); rewritten to `.where('date').between(...).toArray()`
    then `.filter(category)`. Same for `searchByTags` (was `.anyOf().and()`). **Root cause: the Dexie
    at-rest encryption middleware only decrypts `get`/`getMany`/`query`, NOT `openCursor`** — so
    `.and()`/`.filter()`/`.anyOf()`/`.each()` reads come back as ciphertext. Ren confirmed "I can see my
    history now!"
  - **Navigation (memory-only key dies on hard nav → logout/reset):** hard nav (`<a href>`,
    `window.location.href`) full-reloads → the in-memory AES key dies → logout + "reset to start."
    Fixed via codemods: internal `<a href>` → `<Link>` (scratchpad `anchor-to-link.js`),
    `window.location.href = X` → `router.push(X)` (`winloc-to-router.js`). Ren confirmed "THOSE WORKED!"
  - **device-timer-manager.tsx** crash guards for undefined `timer.name` (~lines 668–674).

## ⚠️ STILL TO CONFIRM / FIX (the finish pass)
1. **"Make It Yours" re-prompt — UNCONFIRMED.** `components/app-wrapper.tsx` (~228–236) now sets the
   `chaos-personalization-prompted-${userPin}` flag the instant the panel SHOWS (not on Done). Ren
   reported it *still* popped last night — hypothesis was Fast Refresh not re-running the effect. **A
   fresh clean `tauri:dev` build completed exit-0 today** (background task `boy2s9xtw`), so the clean
   build is ready — **QA this FIRST.** If it still recurs on the clean build: devtools → check
   `localStorage` for `chaos-personalization-prompted-<pin>` (present? value? which PIN key?) to see if
   the write is failing or the read uses a different key.
2. **device-timer-manager.tsx:1141 crash** — Ren hit `TypeError: Cannot read properties of undefined
   (reading 'replace')` at ~line 1141 (SEPARATE from the 668 guard). Add the undefined guard there too.
3. **Duplicate React key** — `Encountered two children with the same key, 1775769406125` — suspected
   import-dedup miss creating twin timestamp IDs. Unfixed.
4. **QA spread on the clean build:** MANAGE pages (Ren says "MANAGE not maintain"), device-timers page,
   a spread of trackers — all should hold now (nav + decrypt fixed). Also: JSON-backup import restored
   pattern-engine data but NOT visible health data last night → verify backup import shows history.

## 🧪 HOW REN TESTS (don't fob off terminal cmds — run tauri:dev yourself)
- Ren tests in **Tauri**, not browser: `pnpm tauri:dev` (runs `next dev -p 33445`). Ace runs it (I can
  spawn the dev server myself). If `.next` cache is corrupt/from a force-killed build → `rm -rf .next`
  first (that fixed a WasmHash crash last night).

## 📦 SHIP PIPELINE (when QA passes) — see `reference_command_release_pipeline` memory for the runbook
- **FOUR version files to bump** (not three — `version.json` on Linux is the easy miss).
- Build → scp-via-`/tmp`-then-sudo pattern → naming conventions → gotchas all in the release memory.
- Related repos: `command-mobile2-store\`, `chaos-command-licensing\`, `caption_work\`.
- Merge `ace/pin-encryption-nav-decrypt-fixes` → master AFTER full QA passes.
- Site: **chaoscommand.center** (landing = `chaoscommand-site\`); demo **tryme.chaoscommand.center**.

## PLAN (post-compact)
1. `rm -rf .next` if needed → `pnpm tauri:dev` (I run it).
2. Log in, **check Make It Yours on the clean build** (the #1 unknown). Fix if it recurs.
3. Fix the 1141 `.replace` crash + hunt the dup-key.
4. QA MANAGE pages + device timers + tracker spread + backup-import history.
5. `tsc --noEmit` + `next build` green → bump the 4 version files → build → **resubmit to MS Store.**
6. Merge the branch. Update Linear (CHA) + release memory if the runbook changed.

*Ren is body-up for this today (asked to work on it after compact). Get it back on the store.* 🐙
