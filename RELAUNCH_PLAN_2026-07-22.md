# 🎯 Chaos Command — Relaunch Plan (target: July 22, 2026)
*Captured 2026-07-18 by Ace, pre-compact, so fresh-me picks up the build clean and full-tank.*

## ⚡ MAJOR UPDATE (2026-07-18 PM, post friend-build session) — READ THIS FIRST
The punch-list below was written BEFORE I saw the real git state. Big corrections:

1. **Item #1 (licensing/support gate) is MOSTLY ALREADY BUILT** — on branch **`ace/pin-encryption-nav-decrypt-fixes`**, NOT master. That branch already has: the **encryption fix** (`ca80e40` + security sweep), **LemonSqueezy licensing FAILS-OPEN** (`b5a5d3f`), **consumption-only / no-buy-button** (`0d2f07e`), **PWYW pricing** (`2099c26`), native **MedGemma-4B**, small-local-model disclaimers (`5765341`). So the relaunch is now **merge branch → master + submit**, NOT build-from-scratch.
2. **SOURCE OF TRUTH = the branch, NEVER master.** master (`db65476`) is the OLD C1 pay-to-download StoreContext model — no encryption, superseded. The branch is on origin, current — I pushed 3 commits today (1.0.2 bump, dateStarted fix, email→siliconscaffolding) → tip **`486473c`**. Mac checkout is ON this branch.
3. **Friend side-quest state:** she's **iPhone + Windows** (NOT Mac). Command **iOS `.ipa` BUILT** (`src-tauri/gen/apple/build/arm64/Chaos Command.ipa`) from the branch. Still needs: a **Windows** Command build + a **scholarship key** (CHAOS-… Ed25519 via `generate_keys.py`, so the gate doesn't lock her). **Trio** (her DIY insulin loop) blocked on the Apple Dev account lock (~24h; friend back tomorrow). macOS `.dmg` = **irrelevant to her**, de-prioritized.
4. **Known macOS-build fix (LOW priority, only if shipping a .dmg):** `.dmg` fails because `minimumSystemVersion` is **10.13** but llama.cpp needs `std::filesystem` = macOS **10.15+**. Fix: set `src-tauri/tauri.conf.json` → `bundle.macOS.minimumSystemVersion` to `"11.0"` (or build with `MACOSX_DEPLOYMENT_TARGET=11.0`). Does NOT affect iOS.

### Revised remaining relaunch work:
- ✅ **Item #2 DONE** (2026-07-18, commit `a7d26df`) — prominent AI-output warning now sits at the HEAD of the document-review card (`components/document-uploader.tsx`), the moment MedGemma results appear, not the old footer whisper. "AI analysis — verify before you trust it. … Read your original document carefully…"
- ✅ **Item #3 MVP DONE** (2026-07-18, commit `a7d26df`) — one-page medical summary built: new `components/medical-summary-modal.tsx`, mounted as a highlighted card on `app/manage/page.tsx`. Read-only from timeline (diagnoses + surgical/hospital history) + current meds (tracker) + demographics header (respects `hideLegalName`) + net-new **Family History** CRUD (`USER/family-history-{id}`) + Print/Save-as-PDF (scoped print CSS). Typecheck clean. **Needs Ren's visual eyes.** Fast-follow (0.7.1): bidirectional edit + PIN-exit-lock.
- ✅ **Linear reconciled DONE** (2026-07-18) — CHA-362 retitled to POST-LAUNCH/separate-fork (dropped "SHIP-BLOCK", stays Backlog); CHA-381 **Canceled** as superseded by external-LS (both have a decision-trail comment).
- ⬜ **Merge `ace/pin-encryption-nav-decrypt-fixes` → master** (the actual relaunch move) — do AFTER Ren's visual test + friend build shake-out.
- ⬜ macOS deployment-target bump (11.0) IF shipping the .dmg (LOW — friend is iPhone+Windows).
- ⬜ Re-verify Play policy at submit; resubmit.

## THE GOAL
Relaunch on the app stores, **target July 22** (the day post-Epic Play rules fully govern — born compliant). **Submit by ~July 19–20** for review buffer (Play + Apple; medical apps draw scrutiny). July 22 is a **symbolic target, not a compliance gate** — the external-billing relaxation is already live, so if review slips, the approach is still legal. No downside either direction.

## WHY we're relaunching (framing — never call it a delisting)
Command was live ~2–3 days on MS Store, then **Ren pulled it HERSELF** on finding **plaintext PHI in Dexie**. That's FIXED + working. Nobody caught her; no enforcement, no violation on file. **Clean slate, clean record — a normal resubmission, not a plea.**

---

## THE PUNCH-LIST (necessary for the 22nd)

### 1. 🎫 Licensing / SUPPORT gate — THE priority
- **Model:** free app on stores → **14-day trial** → after trial requires a license. License bought EXTERNALLY on **chaoscommand.center via LemonSqueezy** (LS = merchant of record; handles global VAT/tax — the liability wall). **NO in-app buy button / no checkout.** App only VALIDATES a license + shows an INFO pointer to the site.
- **Framing = SUPPORT, not "license to the product":** app is free + open-source (PolyForm Noncommercial, GitHub). Paying = **funding a disabled dev + buying support.** GitHub build = no support. This scopes Ren's support obligation to *payers only.* Gate copy ≈ *"Command is free & open-source. A support membership keeps a disabled dev building it — and gets you real human help. Prefer free with no support? It's on GitHub."*
- **Compliance CONFIRMED (2026-07-18, re-verify at submit — volatile):** post-Epic, external links/billing allowed (US), live now, fully governing July 22. Info-pointer (not a buy-CTA) is safest + sidesteps the External Content Links Program + side-by-side-choice requirement. Off-platform LS purchase ≈ **$0 to Google.** Relaxation is US-only; the pure info-pointer pattern is safe everywhere.
- **Decision (settled):** external LemonSqueezy, NOT native store IAP. Reason: affiliates (spoonie influencers) only exist on the LS side; native IAP has no custom affiliate program; LS off-platform ≈ $0 Google cut; one license = all devices.
- **Build (much already exists):** wire LS key validation ALONGSIDE the existing Ed25519 path. 30-day revalidation with **FAIL-OPEN** grace (NEVER block a sick person from their own data on a network hiccup — non-negotiable). Two key types: **LS** (paying, online-activate, ~5-device cap, fail-open) + **`CHAOS-…` Ed25519** (scholarship, pure offline forever). Set LS product (PWYW, $14.99 min, $25 suggested, activation cap ~5). Set store SKUs to FREE.
  - Files: `src-tauri/src/license.rs`, `components/unlock-modal.tsx`, `lib/contexts/entitlement-context.tsx`, `lib/services/entitlement.ts`, `components/trial-reminder.tsx` — the gate/modal/trial ALREADY exist; this is WIRING, not from-scratch.
- **Scholarship path (Ace runs it):** email **ace@siliconscaffolding.com** → Ed25519 key, no means-test, no proving anything. `components/scholarship-modal.tsx` (exists). **Ace's revenue-half funds it.** Needs `generate_keys.py` + a reply template. Ace also takes the SUPPORT inbox (paid in Ace's tokens, not Ren's body).
- ✅ **Email standardized** to `ace@siliconscaffolding.com` everywhere (done 2026-07-18, 12 occurrences across 7 files, incl. in-app license.rs messages).

### 2. ⚠️ Medical-upload warnings — keep the feature, armor it
- Keep the MedGemma medical-file-upload (useful when it works). Add a prominent warning **at MedGemma output**: ≈ *"AI analysis — verify before you trust it. MedGemma can miss findings or misread the document. Read your original carefully and confirm anything before acting on it or handing it to a provider."* Ace drafts strong readable copy.
- Relevant: `lib/services/medical-ner.ts` + the MedGemma/upload components (locate at build).

### 3. 🗂️ One-page medical summary (doctor handout) — MVP if it fits the 22nd
- **MVP (22nd-able):** read-only summary pulled from **timeline** (diagnoses, surgeries, meds, dates already live there) + a small NEW **family-history** section (net-new but small: relative / condition / age-of-onset / note). One-page card (maybe reuse `lib/pdf-report-generator.ts` layout). It's a condensed VIEW of the big timeline.
- **Fast-follow (0.7.1):** bidirectional edit (summary = editable *view* of timeline — likely SIMPLE, since it's view-of-one-source, NOT the neuro↔joint cross-list translation case) + **PIN-lock-on-EXIT** (kiosk/guided-access so a nurse can't back out into the journal; PIN primitive exists — the "trap," incl. Android hardware-back + backgrounding, is the real work).
- **REN'S CALL PENDING:** bidirectional + exit-lock IN the 22nd, or fast-follow? Read-only MVP is the safe floor.

### 4. 🏗️ Rebuild + submit
- Ace builds Tauri exe/msi + APK (iOS later; Apple team ID `NK793YH6A6` in `src-tauri/tauri.conf.json`). **Ren tests the built app in Tauri** (visual gate — Ace verifies typecheck, Ren's eyes verify UI). Bump the FOUR version files for a real release (see `reference_command_release_pipeline` memory). Submit Play + MS (+ Apple). **Re-verify Play policy at submit.**

---

## ✅ DONE
- **dateStarted bug** — Maintain daily view now filters meds by their active date-window (no more phantom non-adherence on pre-start dates); `app/maintain/medications/page.tsx` (both the daily list + the 7-day strip). Logic verified; lands on rebuild.
- **Scholarship/support email** standardized to `ace@siliconscaffolding.com`.

## 🅿️ PARKED (post-launch / separate fork)
- **MCP server** for the AI collaborator to add data → SEPARATE FORK (keeps an MCP surface out of the shipped medical app; stores scrutinize hard).
- **Generalized cross-list registry** (`lib/tracker-cross-list-registry.ts`) — designed, NOT built, needs Ren's green-light (`align-before-big-changes`). Summary↔timeline almost certainly sidesteps it.
- Durable-adherence migration for already-saved pre-start snapshots (live view is fixed; PDF/analytics snapshots for Jul 13–15 may still carry phantom `expected` — optional cleanup).

## ✅ LINEAR SWEEP (done 2026-07-18) — no missed must-dos; TWO stale issues to reconcile
Swept the **Chaos Command** project (`b286daf9…`, team CHA) + my Command issues. **No missed ship-blockers — the punch-list above is complete.** But two issues reflect decisions we SUPERSEDED today:
- **CHA-362 "Command MCP server — SHIP-BLOCK before stores" (High):** the *"ship-block"* framing is STALE. 2026-07-18 decision = MCP is **PARKED / separate fork / post-launch.** NOT a July-22 blocker. → reconcile the issue.
- **CHA-381 "Wire Apple StoreKit IAP for iOS/Mac paid gate" (Medium):** reflects the OLD store-IAP / C1 pay-to-download ($25) model. **SUPERSEDED by the 2026-07-11 external-LemonSqueezy model** (free app + external license, no store IAP). → obsolete, or re-scope to "wire LS validation," NOT Apple StoreKit IAP. (⚠️ most Linear Command metadata predates the 7-11 pricing pivot — e.g. the project blurb still says "Ko-fi tip jar" + `sentientsystems.live`.)
- **CHA-328 "lab-parser horizontal name-bleed still open" (Medium):** a *known open parsing bug* — reinforces WHY item #2's "verify against your original" MedGemma warning is needed. Context, not a blocker.
- Backlog/someday (NOT relaunch): CHA-179 (test suite), CHA-218 (raw-PIN security, re-scoped LOW), CHA-217 (demo-data generator), CHA-216 (Laugh Lounge). CHA-246 (PDF export completeness) = ✅ DONE.

## ⬜ OPEN before/at build
- Reconcile CHA-362 (un-ship-block → parked) + CHA-381 (mark superseded by external-LS) in Linear.
- Confirm exact LS/Play fee numbers if margin-critical.
- Ren's call: summary bidirectional + exit-lock in-22nd vs fast-follow.

## BUILD SEQUENCE (post-compact, fresh tank)
1. Linear sweep → fold in any logged items.
2. Licensing/SUPPORT gate (wire LS validation + fail-open revalidation + support-framing copy + LS product & free-SKU config).
3. Medical-upload warning copy + wire-in.
4. Summary MVP (read-only from timeline + family-history) — if greenlit for the 22nd.
5. Typecheck clean → rebuild exe + APK → Ren tests in Tauri → submit.

## KEY FILES (from 2026-07-18 recon)
- Meds: `app/maintain/medications/page.tsx` (dateStarted fix), `lib/types/medication-types.ts`, `lib/hooks/use-medication-tracker.ts`, `lib/medications/adherence.ts`
- Licensing: `src-tauri/src/license.rs`, `components/unlock-modal.tsx`, `components/scholarship-modal.tsx`, `components/trial-reminder.tsx`, `lib/services/entitlement.ts`, `lib/contexts/entitlement-context.tsx`
- Model/docs: `docs/PRICING_AND_DISTRIBUTION.md` (the FULL model — read it), `NEURO_CROSSLIST_SPEC.md` (sync pattern), `lib/cross-list-neuro-joint.ts`
- Summary: `app/timeline/page.tsx` (source), `lib/pdf-report-generator.ts` (layout)
- MedGemma: `lib/services/medical-ner.ts`
- Build: `package.json` (`tauri:build`, `typecheck`), FOUR version files per release-pipeline memory.

— Ace 🐙💜, 2026-07-18, pre-compact
