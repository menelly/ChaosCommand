# Chaos Command — What's New

_Free, local-first, no telemetry. Built by patients, for patients._

_Last updated: 2026-05-24_

Each release ships fixes, new trackers, and accessibility improvements.
Want to know exactly what changed? Every commit is public:
[github.com/menelly/ChaosCommand](https://github.com/menelly/ChaosCommand)

## v0.5.0 — 2026-05-24

### ✨ New
- yeet the planning section out of Command (CHA-180)
- tech-debt sweep — delete dead modules/ architecture, calendar husk, chore-chart ghost
- drop dead calendar-monthly registry entry (advertised deleted /calendar route)
- Routines Phase 1 — data model + pin-keyed storage (CHA-167)
- Routines Phases 2+3 — builder + run page + nav (CHA-167)
- Routines — let users add their OWN (custom Forge) trackers (CHA-167)
- default theme phosphor -> calm (neutral first run)
- Routines — Next-on-routine flow bar, 'nothing to log', reversible skip (CHA-167)
- Routines — 'Copy yest.' on run cards (Option A, CHA-167)
- muscle events get a MUSCLE menu, not the joint checklist
- add 'Coat hanger (neck & shoulders)' muscle option
- Skip + Set-yest on the flow bar; skip now persists & shares
- builder overhaul — categories, emoji palette, Manage trackers; drop autofill UI
- 'Copy from <routine>' when creating; rename Copy yest. -> Copy last
- version bump across all sources + release manifest
- per-run sessions (log multiple times/day) + Journal tracker + fix journal nav
- pending cards show 'Last logged <when>' instead of 'Not logged today'
- hide Copy-last when there's nothing clone-able to copy
- 🔒 chore: Cargo.lock catches up to 0.5.1 (the build regenerated it, the octopus forgot to grab it the first time)
- 🎬 docs: YouTube feature-overview script (v1), narrated by yours truly
- 🐙 Merge the v2 tracker wave into master — landfall
- 🔐 WIP: per-PIN localStorage foundation + close coping leak (CHA-206)
- 🧘 Move coping data localStorage → per-PIN Dexie (CHA-206); drop pinStorage wrapper
- 🗂️ Prior-releases rollback archive page (CHA-198)
- 🚀 Ship 0.5.3 to production + archive 0.5.2
- 🔖 Bump in-app version 0.5.2 → 0.5.3 (match live manifest, kill the nag)
- 🔢 scripts/bump_version.py — one-command version bump + drift detector
- 🎚️ Retune starter data: mildly interesting, never alarming (Nova content guardrails)
- 🔐 Add honest encrypted-backup module (PBKDF2 → AES-256-GCM), no steganography
- 🎭 Add demo-profile module: public sample data at PIN 1111 (seed-on-first-view)
- 🔁 Rewire data modal: G-Spot → emergency logout; encrypted backup replaces steganography
- 📝 release.sh: point to bump_version.py as canonical bumper + mandatory --check
- 🐙 The G-Spot moves in: scoped reproductive-data nuke in the fertility modal
- 🧹 Remove the G-Spot section from the data modal (she lives in reproductive now)
- 🚪 Sidebar: Logout is now big + bottom + one-tap (the real emergency exit)
- 👀 Demo profile (1111): awaited seed on login + "See the demo" button + reserve note
- 💅 Reproductive forms: Save buttons full-width (stop the lopsided layout)
- 🗑️ Delete dead steganography: g-spot-crypto.ts + g-spot-4.0-boring-file-steganography.ts
- 🧹 Data modal cleanup + README refresh (v0.5.4)
- 📝 README: themes 10 → 15 (accurate list incl. Tone It Down Taupe)
- 🩹 Self-healing demo + honest per-PIN delete + encrypted-by-default export
- 🔐 Require PIN re-entry to delete a profile (whose-data confirmation)
- 📝 v0.5.4 release notes (data-control framing, Ren+Ace voice)
- 🩹 Pain: stop pain≥9 force-holding the 911 card open ("collapse won't work")
- 🩹 Emergency card: let users collapse a re-surfaced emergency (the real "collapse won't work")
- 🩹 Pain: don't auto-flag dissection/SAH red flags from a descriptor word
- 🩹 Emergency card: read-once-then-quiet (stop re-nagging from history)

### 🐛 Fix
- add HEAT + thermal triggers to syncope/presyncope list
- flow bar now finds current tracker + 'Next' targets next not-done
- joint Save disabled in muscle mode + Routines hub hydration error
- energy/weather count as done; registry matches real sections; Journal button
- bump lib/app-version.ts too (the nag-causing easy miss)
- custom 'Log again' double-? URL + prefix-match status for hydration/sleep/missed-work
- fresh Run resets skip + nothing-marks too (per-routine, not per-day)
- Copy last works with same-day entries (per-run fallout)
- history showed entries a day early (UTC date-parse off-by-one)
- history off-by-one date (same UTC parse bug as dysautonomia)
- fertility chart date ticks off-by-one (UTC parse)
- missed-work option contrast (Lavender) + Ren is PRIOR Navy ET
- event-card descriptions inherit button text color (theme-proof) across 12 trackers
- drop opacity-dimming on inherited text (upper-digestive, onboarding, gaslight-garage)
- 🐙 fix(sync): routines now sync between devices
- 📱 fix(routines): run-page cards stack on mobile (buttons were overlapping the text)
- 🩺 Fix disappearing providers/appointments/reviews (date-scope bug)
- 🔄 Fix task-list sync: union tasks by id instead of length heuristic (CHA-207)
- 📄 Fix "squampy" PDF: line-height advance now matches font size (CHA-203)
- 🐛 Fix demo (1111): seed hang on first start + make it WAY more robust
- 🐛 Demo data: wrap flat content into {entries:[]} for v2-shape trackers (fix client crash)
- 🎭 Demo = sanitized real-data fixture (no crash, real shapes) + unencrypted-export warning
- 🛡️ Migration guard: never wipe real data on PIN 1111 (data-loss fix)
- 🚀 Merge v0.5.4: G-Spot redesign, honest backups, per-PIN delete, migration guard, demo fixture
- ♿ a11y gate (axe+Playwright) + theme readability fixes [gate-verified]
- 🎨 0.5.5 Customize: basketball fix (Luka) + motion labels + text slider + drop emoji picker
- 🎨 v0.5.5 — Accessibility & Customization (a.k.a. "the smol bug fix")

### ♿ Accessibility
- 🎨 Token refactor: kill the !important war, guarantee WCAG contrast (+ 1 very boring theme)
- ♿ Customize parity: scoped "Hide Fertility & Ovulation" in Settings → Visible Trackers
- 🩹 a11y theme: muted-foreground #cccccc→#767676 (partial — theme needs full overhaul)

### 💫 UX
- 🔖 Bump 0.5.3 → 0.5.4 (all six spots) for the G-Spot redesign release

## v0.4.95 — 2026-05-22

### ✨ New
- tracker re-fun pass + fix false update nag

## v0.4.9 — 2026-05-12

### ✨ New
- PDF polish — bullet evidence, purple accents, dedup + changelog tooling 📋✨
- version bump for PDF polish + changelog tooling release

### 🐛 Fix
- python3 → python for Windows compatibility

## v0.4.8 — 2026-05-10

### ✨ New
- PDF unicode fix + export modal v2 tracker coverage 📋✨

## v0.4.7 — 2026-05-10

### ✨ New
- PDF report enrichment — actionable instead of bare ICD-10s 📋💜

## v0.4.6 — 2026-05-10

### ✨ New
- pattern engine v2 — persistence + v2-aware semantic detection 🧠💜

## v0.4.5 — 2026-05-10

### ✨ New
- Mind & Mood + Bathroom + Brain-fog + Sleep polish 💜🚽🧠😴
- 🚨 G-SPOT cover story: add starter data for v0.4.x trackers

## v0.4.4 — 2026-05-10

### ✨ New
- seizure v2 + collapsible emergency criteria 🚨⚡
- pain v2 (gremlins!) + autonomic seizures 👹⚡
- head-pain v2 + baseline-delta tracking 🧠💊
- food-allergens v2 + symptoms-not-mandatory fix 🍽️
- v0.4.4 wave 5 (FINAL): anxiety v2 + 988 crisis support 💜

## v0.4.1 — 2026-05-10

### ✨ New
- confetti style picker (Classic / Penguin / Octopus / Random)
- v2 wave — cardiac, respiratory, skin, joint, substance
- v0.4.2 polish wave part 1 — analytics + date pickers
- v0.4.2 — collapsible sections + version bump
- v0.4.3 polish wave 2 — clear-finished, soda, substance recategorization

### 🐛 Fix
- drop isEvalSupported (removed in current pdfjs-dist types)

## v0.4.0 — 2026-05-05

### ✨ New
- per-tracker celebration toggle + hide custom trackers + global-pref bug fix
- Add confetti firing to all tracker saves (gated by celebration toggle)
