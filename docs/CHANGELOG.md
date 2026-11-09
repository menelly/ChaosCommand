# Chaos Command — What's New

_Free, local-first, no telemetry. Built by patients, for patients._

_Last updated: 2026-11-09_

Each release ships fixes, new trackers, and accessibility improvements.
Want to know exactly what changed? Every commit is public:
[github.com/menelly/ChaosCommand](https://github.com/menelly/ChaosCommand)

## v1.0.9 — 2026-11-09

Lighter and more honest: the on-device AI document parser is gone, because a small model can invent a value and nothing downstream could tell. Importing lab PDFs is plain code now, and this update deletes the old 2 GB model file from your computer. Only one copy of Command can run at a time. AI Access keeps its port: if something else is using it, Command waits instead of moving, so your AI's saved address keeps working.

### ✨ New
- 🧹🔥 MedGemma has left the building (CHA-466) + one Command at a time 🔒
- 🍞➡️💜 Un-Toaster pass: Command stops calling minds 'it'
- 📜 About/help/privacy catch up with reality: no NLP, and it's Adaptive Interpreter
- 🚪 AI Access: the port is a promise, a busy port never moves the door (CHA-793)

### 🐛 Fix
- Severity rows had no label, just a lonely chevron

## v1.0.8 — 2026-10-30

Your Safety Plan now actually saves, and every crisis number is one tap. Veterans Crisis Line updated to 988 then press 1 (or text 838255). Poison Help added. Custom color pickers start from your theme's real colors. Pain episodes no longer show '/10' with no number.

### ✨ New
- 🎖️ Veterans Crisis Line: the retired 1-800 number → 988 then press 1 (+ text 838255)

### 🐛 Fix
- episodes stop saying "/10" with no number (CHA-772)
- the Safety Plan actually saves, every number is tappable, + Poison Help (CHA-771, CHA-770)
- color pickers wait for the theme's CSS before reading it

## v1.0.7 — 2026-10-20

Cancel on a destructive confirm now actually cancels, found by an external audit. Entries stop showing up under yesterday's date. New and off by default: AI Access (desktop) lets your own AI read your trackers and add entries, per PIN profile, localhost only, and every AI-added entry is marked. The Forge gets a tap 1-10 severity field, and the bathroom tracker gets a +1 button.

### ✨ New
- +1 button — log once, tap again when it happens again 💩➕
- tap 1–10 severity field — custom trackers stop forcing a drag (CHA-463) 👆
- 🔌 AI Access — optional MCP holes so your AI can read + log for you

### 🐛 Fix
- destructive confirms could fire on Cancel — global confirmAsync()
- emit tryme OG tags from the repo, and land three orphans
- ONE viewport tag, with cover in it (CHA-614) 📱
- entries stop showing up as YESTERDAY 💩📅

## v1.0.6 — 2026-08-04

### 🐛 Fix
- seven trackers were missing display names — which caused TWO bugs
- the back half asserted where the front half hedges
- believe the patient; and stop letting "slow" impersonate "broken"
- the parser was silently deleting the ABNORMAL results
- tell people when a PDF is a picture, instead of "no labs found"

## v1.0.5 — 2026-08-04

1.0.5 - MedGemma document parsing works again. The AI badge could say "model ready" while every upload failed, because the runner never queued a load - it is fixed, and the AI controls are now split into two honest toggles: whether you want AI parsing, and whether the model is actually in memory. Analytics rebuilt on one shared engine: every tracker can now show a DIRECTION - improving, worsening or steady - not just totals. Treatment sections compare severity with and without a treatment, showing both sample sizes, instead of ranking by how often something was mentioned. Default analytics window is now 90 days, because 30 cannot hold a monthly cycle. Mental health, anxiety, crisis and substance sections are now OPT-IN for doctor reports rather than included by default.

### ✨ New
- "Didn't bother me" is now DURABLE DATA, not a checkmark that evaporates (CHA-427)
- daily body/mind touch-base, attached to the Survival Box (CHA-423)
- report improvement, tap-based severity, and a PHI cleanup
- one engine for every tracker, and it can say which way things are going
- shared panel + autoimmune rebuilt on the engine
- joint, skin and neuro onto the shared engine
- frequency trend — plus the adoption artefact it nearly shipped
- a direction, which is the one thing this panel could not say
- per-scale directions for trackers that record several at once
- onto the engine, with safety indicators deliberately kept out of it
- Tracker Overview — the report and the app can no longer disagree

### 🐛 Fix
- the web-only "Data & browser safety" notice was reachable in the Tauri app
- the streak lives in the database now -- it exports, syncs, and survives a storage clear (CHA-428)
- the document model could never load itself — a deadlock, one layer down
- default every window to 90 days — 30 cannot hold a chronic illness
- a headline that contradicted its own body, and the two bugs under it
- mental health is a disclosure decision, not a checkbox default
- ONE severity vocabulary — it had quietly become four

## v1.0.4 — 2026-07-27

### 🐛 Fix
- a demo build must not be installable — it can't save 🚫📱
- the banner was telling people to install it and promising it saves 🚨
- drop USE_EXACT_ALARM, keep SCHEDULE_EXACT_ALARM -- unblocks Play (CHA-417)

## v1.0.3 — 2026-07-24

### ✨ New
- MedGemma output warning + one-page medical summary
- iOS home-screen install + honest security disclosure
- persist when installed, sandbox in a browser tab
- replace green-gremlin icons with Ace the OctoDoc

### 🐛 Fix
- honor medication dateStarted/dateStopped in the daily view
- print the doctor handout correctly (Radix + gradient-text)
- stop the demo build from silently eating real users' data on iOS

## v1.0.2 — 2026-07-06

### ✨ New
- Wire the prompt-off winner: model extracts labs, CODE decides direction + dedup
- encrypt medical data at rest + hash PIN in DB name (core)
- sweep raw PIN out of localStorage key names (namespace by hash)
- key-in-memory session model + auto-lock-in-background toggle
- Guard 3 more timer.name/providerName .replace() crash sites 🛡️

### 🐛 Fix
- Finish pin-encryption: soft-nav sweep + cursor-read decryption + onboarding/crash fixes

## v1.0.1 — 2026-07-01

### ✨ New
- web "try me" mode — run the app as an interactive public demo
- Swap document AI: transformers.js (d4data NER + Qwen) -> native MedGemma-4B
- Add small-local-model disclaimers on the import + review screens
- Name med buckets by clock time; add mobile closed-app reminder walkthrough
- Clean up MedGemma event display: fair confidence, clean descriptions, retire legacy scan
- Add deriveLabDirection: code decides High/Low/Critical, never the model

### 🐛 Fix
- kill the date-keyed-entity duplicate class (CHA-378, +376/377)
- stop the version + build-date from lying (showed 0.7.1 / 2026-04-09)
- empty DEMO_BASE_PATH = true root (subdomain), not the /staging/try default
- gate the on-device AI-model loader card on the import page too
- no web-manifest in demo build (kills Chrome's PWA install offer)
- banner z-index 1000 -> 30 so it stops burying the mobile hamburger/home nav 🍔
- Fix notification flood on open + consolidate med reminders by time
- Fix double MedGemma pass: never re-run impression LLM after the whole-doc scan

## v1.0.0 — 2026-06-22

### ✨ New
- add sound-sensitivity symptom -> sensory tracker
- pre-save sanity checks — duplicate results + wrong-name

### 🐛 Fix
- med-type buttons wrap into confetti on phones
- exact-alarm permission so SCHEDULED notifications fire
- mobile PDF export writes to Downloads (not private AppData)
- all exports + imports use the native Save/Open picker (SAF)
- single scheduler, fresh permission, no churn, loud channel
- turning reminders OFF no longer erases the dose times

## v0.7.1 — 2026-06-22

Forge tracker editing; privacy-by-default med reminders; lavender onboarding fix + symptom-checker curation/coverage; vitals + pulse-ox history/analytics/patterns; missed-work analytics + symptom correlation

### ✨ New
- STORE_BUILD flag — public source builds are unlocked, not locked 🔓
- unify the med schedule — one time picker drives Maintain + notifications ⏰
- per-DOSE checklist — a BID med shows in morning AND night ⏰💊
- Percentage + Duration field types (built on SonnetAce's Forge) 🔨
- time-series trend chart — see two values at once 📈
- Forge tracker editing + privacy-by-default med reminders + lavender onboarding fix
- History + Analytics tabs + Patterns participation
- real analytics + symptom correlation (SSDI gold)

### 🐛 Fix
- add the missing reminder-time UI + stop toggles resetting on edit ⏰
- stop the daily check-in spamming on desktop ⏰🚫
- promote abnormal labs to the timeline + honest success message 🩸📋
- "Back up now" deep-links into Data Management, not Settings' door
- stop MED reminders spamming on desktop (Lyrica's constant fire) 💊🚫
- device-timer reminders had the same desktop spam/misfire bug 🩹
- real symptom-driven curation + full tracker coverage

## v0.7.0 — 2026-06-22

v0.7.0 — The Store Release 🔒💜 Humane 14-day trial + $25 one-time unlock (never gates your data) + no-means-test scholarships. Medical-doc parser overhaul: Quest/2-column labs no longer drop abnormal results or lose units, real specimen collection dates, NegEx assertion engine, and the impression LLM can no longer invent diagnoses. Daily check-in + desktop reminders. Theme autofill fix.

### ✨ New
- geometry-aware lab extraction + theme-token cleanup
- NegEx assertion engine + dismissed-finding surfacing; paste parser; geometry fixes
- NegEx assertion engine + §3.C dismissed-finding surfacing + impression fixes
- LLM-first impression extractor with regex fallback (Qwen3.5-Q4 wedge)
- real Qwen2.5-0.5B-ONNX runner + lab typo-check banners
- 14-day trial clock + dual-source entitlement spine 🔑
- humane trial lock — gate trackers, never the user's data 🔒
- ND-friendly trial-ending heads-up at 3 + 1 days ⏰💜
- no-means-test scholarship request with a copy-paste script 💜🍜

### 🐛 Fix
- stop dropping abnormal rows + losing units on 2-column (Quest) reports 🩸
- stop hallucinating timeline events from lab interpretive prose 🩺
- date labs by specimen-COLLECTION date, not upload date 📅
- forbid the 0.5B model from inventing diagnoses 🧠🚫
- stop Chrome autofill forcing white inputs on dark themes 🎨
- "stupid" → "cruel" in the scholarship modal — no ableist vernacular 💜

## v0.6.2 — 2026-06-14

### ✨ New
- PDF consumes the Patterns engine — one source of truth
- hormonal triggers that don't assume menstruation (CHA-298)
- PDF report: dedup/format cleanup pass + delete-means-delete (CHA-320/323/324/326/220 + ghost-dose)
- PDF: Forge/Built custom trackers section + seizure type canon + timeline dedup
- 🧹 CHA-227: yeet the dead recentEmergencyDetected plumbing
- native PDF export on Android via fs + opener
- Pulse Oximetry — dual-mode SpO2/pulse tracker

### 🐛 Fix
- smoke-test round — accordions, Windows toasts, version-free footer
- Theme Lab gated to dev builds (leaked into prod settings); privacy link -> docs.html#privacy (was legal.html)
- Routine flow bar: Finish button + fix stale done-detection loop + mobile stacking (CHA-167/193)
- null-vs-none export bug + weather pressure/impact upgrades

## v0.6.1 — 2026-06-11

Routine builder sees the new Body trackers (Neuro, Autoimmune, Endocrine). Lab PDF: unit no longer doubles, correlations get 95% confidence intervals, autoimmune section no longer prints twice. Theme picker readable on mobile (descriptions wrap). Wicked/dark themes: settings tiles lose the gray slabs. Crisis page: plain-language privacy notice.

### ✨ New
- 🛡️ CHA-137: Zod-gate importData so malformed backups can't crash or pollute the DB
- 🩺 CHA-246: stop the doctor PDF from silently dropping dysautonomia data
- CHA-247: preview-before-save step for medical exports 👀🔒
- 🩺 CHA-246 §B: render Sleep + Respiratory detail in the doctor PDF
- 🧠 Neuro tracker + ⇄ cross-list mechanism (neuro ⇄ MSK) + rheum/autoimmune alignment
- 🔗 Cross-list: full field round-trip + theme tokens + ROM/muscle analytics
- 🧬 Autoimmune / Connective-Tissue (rheumatology) tracker — standalone
- 🧬 CHA-246: Autoimmune / Connective-Tissue section in the doctor PDF
- 📱 Gate PDF export to desktop-only on mobile (until 0.6.2)
- 🧹 0.6.1: prune dead collectEvidence() from PDF generator
- 🔒 CHA-268: transparency notice on crisis resources (say-it-plainly, local-first)
- 🌿 CHA-307: supplements & OTC as first-class meds (interaction visibility)
- 🩺 Vitals tracker (CHA-317) + tracker-manifest groundwork (CHA-315)
- 95% confidence intervals on doctor-PDF symptom correlations

### 🐛 Fix
- Fix mojibake left-arrow on Body page back button (â†□ → ←)
- Fix empty Medical Timeline — load by category, not date-range
- Fix blank timeline for real: defensive parse so one bad record can't crash the load
- Fix meds-delete regression: tombstone ALL records for a med, not just .first()
- Fix Devices & Timers modal: no scrollbar on mobile (added warranty section made it taller)
- Fix energy activity cards wrapping one-letter-per-line on mobile
- Fix Weather date-nav wrapping one-letter-per-line on mobile
- 💊 Fix CHA-273: editing a med on a later day no longer spawns a duplicate
- 🩹 Fix delete-does-nothing + Lab Results mobile mangle (Android WebView)
- 🩺 Fix medical PDF export for 0.6.0 (preview rollback + save + completeness + cleanup)
- stop doubling the unit ("5 mg/dL mg/dL") — CHA-322
- doctor PDF rendered the Autoimmune section twice
- theme dropdown overflow + Wicked's icky gray settings tiles
- register Neuro, Autoimmune & Endocrine Body trackers (CHA-314)

## v0.6.0 — 2026-06-04

New Maintain section: Lines & Tubes, generic Devices & Timers (warranty serial/photo + change history), and Today's Medications. Real medication-adherence tracking with history, analytics & PDF export. Nurse-feedback clinical trackers: GU, ENT, Postpartum & Newborn, Endocrine (Thyroid/Adrenal). Personalization (name, pronouns, gender, parent/feeding terms) in Customize + onboarding. Sidebar Declutter. Scheduled OS notifications. Theme/scroll/font polish.

### ✨ New
- Maintain section, clinical trackers, personalization, adherence tracking

## v0.5.8 — 2026-05-30

PDF export now reports everything you actually track — 8 previously-missing tracker sections, medications + appointment attendance for SSDI, and a joint/MSK weakness fix. Plus optional password-protected exports so your medical data isn't plaintext in Downloads.

### ✨ New
- PDF export now exports what users actually SAVE, + password-protect
- Add 0.5.8 update manifest (version.json) — the easy-miss 6th version spot
- Add 0.5.8 download-page deploy script
- Maintain section stub + Journal->Mind + Custom->Built rename
- specialty accordion groups on Body page
- tracker scaffold — types, constants, build roadmap
- complete GU tracker — all 12 checklist steps done
- ENT tracker + medical disclaimer (first-launch dialog + sidebar link)
- diabetes -> Endocrine hub + Thyroid + Adrenal, device timers -> Maintain
- bundled Postpartum & Newborn module — recovery + feeding + infant (CHA-255)
- Maintain/Manage split — daily "taken today" view vs full registry
- Generalize Devices & Timers: preset registry + custom, GLP-1 to Injectables
- Wire real scheduled OS notifications for device timers (Stage B)
- Cluster daily meds by time-of-day with per-cluster 'Take all'
- Add personalization to Customize: name, pronouns, gender, parent/feeding terms (CHA-261)
- Build Lines & Tubes tracker — device complications (CHA-252)
- Add personalization step to onboarding (CHA-261)
- Make medication adherence a real tracker: durable history + analytics + PDF + Patterns (CHA-272)
- Devices & Timers: serial/lot/photo (warranty) + real change-log history (CHA-272)
- Devices: make timer time optional (default midnight) — mandatory hh:mm was annoying
- Genericize adherence example copy — don't ship a real personal med name in the UI
- Run existing users through personalization ONCE on next login (CHA-261)
- Personalization: hide parent-term + feeding-language unless reproductive tracking is on
- Yeet the 8 decorative-pack fonts — unreadable for dense medical data
- Sync Visible-Trackers + Celebrate lists with the new Body trackers
- Add Sidebar Declutter to Customize — hide whole nav sections you don't use
- PDF: pronouns in header + new trackers exportable; gate repro visibility on reproEnabled

### 🐛 Fix
- soft-delete tombstone so meds actually stay deleted
- science + logic bugs in ovulation predictor + show-all
- skip counts toward completion + Command Zone sections in routine builder
- emoji mojibake cleanup, sidebar gradient, Command Zone routine category, accordion persistence
- flow bar now appears on Command Zone steps (query-before-hash)
- single Command Zone step + normalize all builder emoji
- theme-adaptive category colors (the ones I kept missing)
- extend dark-theme hardcoded-color overrides to ALL families (CHA-271)
- add Wicked + Accessibility to dark-theme color overrides
- toned-down per-hue category colors on dark themes (not flat gray)
- getDB() falls back to active PIN — repairs ALL tracker soft-deletes
- Choice-style cute cards + remove postpartum (it's a Body tracker)
- move 'show on medical timeline' toggle into Timeline section
- Fix white calendar dropdown on dark themes + meds daily view date/time/history
- Fix personalization gate: theme-aware + scrollable

## v0.5.6 — 2026-05-25

Theme readability overhaul: danger/911 colours now derive from each theme's --destructive token (no more unreadable red-on-dark), new --info/--success/--warning semantic tokens + a single-source design-token migration across all 15 themes so nothing renders light-box-on-dark anymore. Live Contrast Check tool in Settings. New 'Pink Goes Good With Green' (Wicked) theme with a Glinda-to-Elphaba sidebar. The Accessibility theme is now 'Follow System' - it respects your OS high-contrast settings (Windows/macOS) instead of a fixed palette, far better for low-vision users. Analytics rebuilt client-side with trigger->outcome correlations across most trackers, plus diabetes time-in-range / glucose trends. Collapsible Settings, slimmer mobile scrollbar, fixed text-size scaling, Live Simple font.

### ✨ New
- Theme Contrast & Wicked 💚💗
- 0.5.6 fixup: diabetes tracker bg ghost-of-penguin
- tracker theme-compliance + Theme Lab
- 0.5.6 theme + analytics sweep (in-flight, do not ship yet)
- analytics: trigger correlations across 9 trackers
- diabetes analytics: time-in-range bar, glucose trend, time-of-day pattern
- crisis: Emergency Actions box theme-safe (destructive tint, not bg-red-50/dark)
- hydration: drop legacy --surface-1/--text-main inline styles on tabs
- themes: legacy-var bridge for all remaining themes (13)
- energy + movement: insight boxes off the bg-X-50/gradient pattern -> token tints
- callouts: convert bg-{color}-50/dark light boxes to semantic token tints
- 0.5.6 prep-to-ship: remove dev theme toggle, theme emojis, changelog/README
- Add legal docs (ToS/Privacy/Medical) + footer rebrand to Silicon Scaffolding LLC
- Self-host Atkinson/Poppins/Lexend — kill the Google Fonts IP leak (CHA-229)
- Add self-hosted font menu (Inter/Crimson Pro/JetBrains Mono) + Resources credits
- Privacy policy: add the 'use a VPN, we don't see you, PROTECT YOURSELF' note 🛡️
- NER notice: use Nova's calmer, more precise wording
- Add 8-font decorative pack (Creative Fabrica) to the font menu
- Add opt-in backup reminder (per-PIN, smart-trigger, dismissible banner)
- YouTube script: update font line (4 -> full menu) + privacy flex
- YouTube script: establish desktop+Android in intro, QR/same-WiFi sync in §3
- YouTube script: 'does it wrong' -> 'does it differently than expected'
- YouTube script: Ren's recording-booth edits
- YouTube script: reproductive toggle line — 'off your screen' not 'gone'
- YouTube script: §14 — 'activist', Ace=Claude disclosure, 'And I had the ability to make it happen'

### 🐛 Fix
- dysautonomia analytics: fix NaN from 'All Time' (parseInt('all')->NaN)
- themes: legacy-var bridge for wicked + taupe (fixes coral/blue everywhere)
- Fix false 'bundled, no download' NER claim → honest privacy notice (PROTEKK URSELF)

### ♿ Accessibility
- accessibility theme -> 'Follow System' (respect OS accessibility settings)

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
- routines now sync between devices
- run-page cards stack on mobile (buttons were overlapping the text)
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
- ios: wire Apple Developer Team ID for code signing
- tauri: bump Rust crate to 2.11 to match JS API (iOS build alignment)
- deps: add @radix-ui/react-collapsible (used by components/ui/collapsible.tsx)
- ios: use correct paid Apple Developer Team ID (NK793YH6A6)
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
