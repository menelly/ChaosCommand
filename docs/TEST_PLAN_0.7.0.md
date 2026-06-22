# Chaos Command v0.7.0 — Test Plan

Everything changed since v0.6.2, grouped by how to test it. Tick as you go.

---

## 🔔 Notifications (the untested ones — PRIORITY this build)
*Banked in `59342bc` (wip), never fully tested on a real `.exe`.*

- [ ] **Daily check-in reminder** fires at its scheduled time (default 8pm) → deep-links to routines
- [ ] **Medication reminders** fire at the times set on a medication (today **and** tomorrow roll-forward)
- [ ] **Appointment alerts** fire (9am on date − reminderDays)
- [ ] **Fire-when-closed**: does a reminder show if the app was closed and reopened? (replays "you had a reminder N min ago")
- [ ] Desktop OS-native notification actually appears (WebView2 caveat — this is the unknown)
- [ ] Ticker survives a sleep/wake cycle

## 🩸 Lab / medical-doc parser (test: upload quest5, quest3, Quest1, LabCorp PDFs)

- [ ] **Abnormal labs not dropped** — ferritin/MCH/MCHC/MPV appear (was the silent-drop bug) `8892e69`
- [ ] **Units populated** (real units, not "unit") `8892e69`
- [ ] **Collection date** = specimen draw date, not today (2020 labs land in 2020) `4eacd73`
- [ ] **No junk timeline events** from lab disclaimer/interpretive prose `a80cb42`
- [ ] **Impression LLM can't invent diagnoses** — no findings that aren't in the document `c95fc66`
- [ ] **Lab typo banner** — "verify this reading?" appears on panic-zone / >5× values `ae5c3c1`
- [ ] **NegEx**: "no evidence of fracture" is dropped; "no change in nodule" is KEPT (tracked) `1207e73 c9f50aa`
- [ ] **Dismissed-finding surfacing**: congenital/stable/incidental findings flagged for review, not waved off `c9f50aa`
- [ ] **Geometry extraction** works across LabCorp + CareSpace grids `3086301`
- [ ] **Paste parser** (paste lab text instead of PDF) `1207e73`

## 🔒 Store / trial / unlock (test with `?entitlement=expired|trial|licensed` + `&trialdays=N`)

- [ ] `?entitlement=expired` → tracker nav shows 🔒, tap → unlock modal; "Unlock — $25" under Settings
- [ ] Home / Settings / Customize / Logout stay clickable in **all** states (data never gated)
- [ ] `?entitlement=trial&trialdays=1` → "trial ends in 1 day" reminder pops (also try `trialdays=3`)
- [ ] Unlock modal: enter a key → activates (test once the owner key exists)
- [ ] "Request a scholarship code" → script modal, **Copy** works, **Open email** prefills
- [ ] `?entitlement=licensed` → fully unlocked, no banner
- [ ] Reminder shows once per threshold (clear `chaos-trial-warned-*` in localStorage to re-test)

## 🎨 Themes / UI

- [ ] **Demographics autofill** — type in Legal Name / Street Address: stays themed, no white flash `439de14`
- [ ] Spot-check a few themes still render (Chaos, Wicked, Taupe, Accessibility)

## ✅ Build / version sanity

- [ ] App reports **0.7.0** (Settings → about / update check) — no "update available" nag
- [ ] `python scripts/bump_version.py --check --live` agrees after any website deploy

---

### Not in the `.exe` (separate website deploy, do later)
- Canonical website cleanup `4c29bc3 a1e065c` — fonts self-hosted, Ko-fi/PayPal pulled, legal pages
- `/download` page version pill + changelog (via `release.sh` / `bump_version.py`)
- Live `version.json` manifest

### Known low-pri (logged, not blockers)
- LDL-CHOLESTEROL keeps value but drops unit (reference is a multi-line note)
- ANA titer format (`1:80`) not parsed (not numeric+unit)
- StoreContext IAP "Buy" button is a stub until MSIX packaging
