# Chaos Command — Roadmap

Living doc. Append as we go. Short entries; link to code/files where useful.

---

## Notifications — current state (v1, Apr 18 2026)

- **In-app Dexie-queue + minute ticker** — `lib/services/notification-service.ts`
- Fires OS-native notifications via `@tauri-apps/plugin-notification` **while the app is open**
- On app reopen, replays backlog as "you had a reminder N min ago"
- Wired into: appointment save (9am on date − reminderDays), medication save (reminderTimes for today + tomorrow)

**Limitations:**
- Misses reminders when app is closed on desktop
- Medication horizon = ~24h — no daily roll-forward yet
- Ticker is best-effort, not punctual across sleep/wake cycles

---

## Notifications — decided strategy (2026-04-18)

**We ship Tier 1 + Tier 2. We do NOT pursue Tier 3 or Tier 4 at current team size.**

### Why (Ren's call, and it's the right one)

Current team is one disabled human and one AI that gets activated when the human remembers to bonk it. Chaos Command is open-source, pay-what-you-want, no recurring dev funding.

For a medical-adjacent app, **silent failure modes are a safety problem.** A diabetic whose insulin reminder stops because an OAuth token expired and nobody noticed is worse off than if we'd never offered the feature. We don't have the maintenance bandwidth to keep complex integrations alive across Android/iOS/Google/Apple platform churn.

So: **ship what stays working, document what we don't do and why.**

### The four tiers, ranked by maintenance cost

| Tier | What | Maintenance | Failure mode | Status |
|------|------|-------------|--------------|--------|
| 1 | Deep-link "Add to Calendar" button + .ics download | **LOW** — URL formats + iCal spec are effectively frozen (Google URL ~2015, RFC 5545 from 2009) | Button opens wrong thing → visible immediately, fix a string | **SHIP** |
| 2 | In-app Dexie-queue + minute ticker (current) | **ZERO** — no external deps | Misses reminders when app closed. **Honest, visible, users adapt.** | **SHIP (done)** |
| 3 | Native scheduled notifications via plugin | **MEDIUM** — Android tightens background-wake every major version (API 33→34→35 each narrower) | Silent break on OS update | **SKIP** |
| 4 | OAuth + Google Calendar API / CalDAV | **HIGH** — token refresh, API deprecations, rate limits, entitlements | **Silent** failure: token expires, sync stops, user doesn't notice until they miss something | **SKIP** |

### User-facing honesty

Near the Reminders UI, add a small note:

> Reminders fire while Chaos Command is open. Use the **Add to Calendar** button to put the reminder into your phone/desktop calendar — then your calendar handles delivery forever, even when this app is closed.

No apology. Just honest about the deal.

### When to revisit Tier 3/4

Either:
- Chaos Command gets real dev funding / a maintenance team, OR
- A specific user has a concrete need we can't meet with Tier 1+2 AND is willing to pay for the dev cycles

Until then, **default answer is no.** "Do it right or don't do it" applies to operations, not just code.

---

## Notifications v2 implementation — Tier 1 (calendar deep-link)

**The insight (Ren, 2026-04-18):** we shouldn't rewrite the calendar wheel. Every phone and desktop already has a robust notification-scheduling system sitting inside the user's calendar app. Our job is to get the reminder **into their calendar**; the calendar app handles delivery.

### Easiest path: deep-link button ("Add to Calendar")

Next to each appointment / medication schedule, add a button that opens a pre-filled calendar event in the user's default app.

- **Google Calendar (works everywhere via browser):**
  `https://calendar.google.com/calendar/u/0/r/eventedit?text=<title>&dates=<YYYYMMDDTHHMMSS/YYYYMMDDTHHMMSS>&details=<body>&ctz=<tz>`
- **.ics file download (universal):**
  Generate a minimal iCalendar file with `BEGIN:VEVENT`/`DTSTART`/`DTEND`/`SUMMARY`/`VALARM`. User clicks → native calendar app opens → "Add to calendar?" → done. Works for Apple Calendar, Outlook, Thunderbird, everything.
- **Outlook (live webmail users):**
  `https://outlook.live.com/calendar/0/deeplink/compose?subject=<title>&startdt=<iso>&enddt=<iso>&body=<body>`

**No OAuth. No API keys. No hosting. Zero recurring cost.** User has to tap "Save" once per event, which is actually fine for appointments.

### Medium: webcal:// subscription feed

- Host an .ics feed (static file or API route)
- User subscribes once
- Calendar app polls the URL periodically, pulls updates
- Good for medications where the schedule drifts — we change the feed, they get the update
- Needs hosting OR filesystem accessible from the user's calendar

### Advanced: OAuth + Google Calendar API / CalDAV

- Two-way sync
- Events created/updated automatically on their calendar
- User authenticates once
- **Not worth it until we have concrete user demand** — OAuth inside Tauri is painful, and the deep-link + .ics combo covers 95% of the actual need

### Implementation sketch (when we get there)

1. Strip the current Dexie ticker path (or keep it as an offline fallback)
2. In `components/medications/medication-form.tsx` and `app/providers/page.tsx` appointment flow, add an "Add to Calendar" button next to "Set reminder"
3. Ship utility: `lib/services/calendar-export.ts` with `toGoogleUrl()`, `toIcsString()`, `downloadIcs()`
4. On mobile (Tauri Android/iOS), use `opener` plugin to open the .ics via the OS share intent

---

## Medication reminders v2 — daily roll-forward

v1 covers ~24h. Every ~hour, ticker should scan medications with `enableReminders=true`, compute the next 48h of doses, and upsert into the reminder queue. Cheap check — tiny data volume.

---

## Hybrid SQLite migration

Medical data currently writes through `useDailyData` → Dexie despite `advanced-hybrid-router.ts` being wired for SQLite (`// 🏖️ VACATION MODE` comment in `app/timeline/page.tsx`). iOS Dexie quota risk applies to all medical data. Migration path:

1. Flip the router flag in `advanced-hybrid-router.ts`
2. One-time: walk existing Dexie `medical-events-*` rows, copy into SQLite via `sqlite-db.ts`
3. Leave Dexie reads as fallback so partial migration doesn't break anything
4. Remove Dexie writes for medical events once migration confirmed

---

## Theme-variable refactor

~30 component files still use hardcoded `bg-gray-*` / `text-gray-*` / etc. Covered by the global CSS override in `chaos-themes.css` as an interim fix. Ongoing cleanup — each time a component gets touched for other reasons, swap its colors.

---

## Extract Planning / Calendar section to its own app

Currently hidden from navigation (`/* MVP-HIDDEN */` blocks in `components/app-sidebar.tsx`) but the code still ships:
- `app/planning/page.tsx` — 293 lines
- `app/calendar/page.tsx` — 397 lines
- `app/manage/page.tsx` has planning-adjacent tracker cards wrapped in similar MVP-HIDDEN comments

**Why it's not in Chaos Command:** Chaos Command is scoped to *medical* — symptoms, meds, appointments, labs, timers, reflection. Daily planning (tasks, goals, monthly calendar) is a *different* app shape that would bloat the medical focus and the bundle.

**Extraction plan (when we're ready):**
1. New Tauri project: `chaos-plan` (or whatever the name ends up being)
2. Port `app/planning/`, `app/calendar/`, and the related `manage/` tracker cards
3. Share the same hybrid-db + theme system via a shared npm package (or just copy forward and diverge)
4. Cross-link between apps via deep-links if useful
5. Delete the MVP-HIDDEN blocks + the `/planning` + `/calendar` routes from Chaos Command so deep-linkers can't reach them

**When:** before public 1.0 of Chaos Command. We don't want curious testers deep-linking to half-built "coming-soon" pages and forming opinions about product quality.

---

## Android sideload / signing checklist

Documented separately in `E:\Ace\android signing keys - don't commit to git dammit.txt`. When we're ready for Play Store: Ren applies for dev account, we swap release keystore, add Play-required metadata (privacy policy URL, data-safety form, screenshots in multiple languages).

---

## v0.4.x → v0.5.0 phased plan (added 2026-05-10)

**Sequencing principle: audit-first, patterns-second.** Don't build the patterns engine + PDF richness on top of inconsistent trackers. Bring all medically-significant trackers up to v2 architecture, THEN ship patterns + PDF so they treat trackers uniformly.

### v0.4.3 ✅ shipped 2026-05-10 13:35

UX polish wave 2:
- Tab labels "Today's Events" → "Add Event" / "Add Entry" (5 v2 trackers)
- Collapsibles default closed in all 7 v2 modals
- Substance recategorized: caffeine → /hydration, routine Rx → /medications, "Recreational / Off-Label" reframed
- Hydration: added soda regular/diet, sparkling water, energy drink, black tea, milk
- Command Zone: "Clear finished (N)" button on Today's Tasks (CHA-145 closed)

### v0.4.4 ✅ shipped 2026-05-10 — Tier 1 safety-critical refactors

Five trackers brought up to v2 architecture in one session (5 commits on `feat/v2-tracker-wave`):

| Tracker | Subtypes shipped | Red flags shipped |
|---|---|---|
| **Seizure** (CHA-153) | Focal-aware, Focal-impaired, Tonic-clonic, Absence, Myoclonic, Atonic, **Autonomic** ⭐, General | Status epilepticus (≥5min single OR multi-consecutive without recovery), cyanosis, prolonged unresponsiveness — rescue med tracking + AED-missed flag |
| **Pain** (CHA-154) | Acute, Chronic Flare, Post-Surgical, General + cross-tracker referrals (cardiac / head-pain / joint) | MI (chest+radiation), AAA (severe abdo+pulsatile), cauda equina (back+leg weakness/bowel-bladder/saddle), aortic dissection (tearing), SAH (thunderclap), peritonitis (rigid+fever) |
| **Head-Pain** (CHA-155) | Migraine±aura, Tension, Cluster, Sinus, Worst-of-Life, General | SAH (WHOL/thunderclap), stroke (focal/weakness/speech/vision), meningitis (neck stiffness+fever), GCA (vision+age>50), CVST/eclampsia, post-trauma bleed |
| **Food-Allergens** (CHA-156) | Mild, Moderate, Severe-Anaphylaxis, Celiac-Autoimmune, Intolerance, Confirmed-Exposure, Unknown-Trigger, General | IgE: skin + airway/breathing → EpiPen + 911 (two-system rule); Celiac/autoimmune separate red-flag logic (no EpiPen) — Luka context built in |
| **Anxiety** (CHA-157) | Panic, Generalized, Social, Phobic, OCD-shaped, **Meltdown**, **Shutdown** (AuDHD-aware), Anticipatory, Performance, Health, General | 💜 **988 system** (not 911): SI / SH urges / hopelessness / hospitalization-considered / crisis-contact tracking |

**Bonus deliverables along the way:**
- `EmergencyCriteriaCard` shared component — collapses after first read, auto-re-expands when recent entries trip emergency markers (mobile UX fix). Retro-fitted into cardiac, respiratory, skin too.
- 🐛 Removed mandatory `disabled={symptoms.length === 0}` gates from 9 modals (cardiac, arrhythmia, respiratory, asthma, food-allergens, 5 dysautonomia). "Ring says 89% no clue why" entries now save without symptoms.
- 👹 **Pain gremlins** restored on severity slider (clinical labels preserved alongside for PDF export). 0=🌈, 5=🔥 uprising, 8=💀 GREMLIN APOCALYPSE, 10=🚨 crisis.
- **Baseline-delta tracking** in head-pain — your typical-headache-day pain level vs flare level, with delta histogram (Mild +1 / Moderate +2-3 / Severe +4-5 / Extreme +6+ "needs Nurtec AND Imitrex" days). Same pattern in pain (chronic-flare) and food-allergens (delayed-reaction hours).
- **Treatment effectiveness analytics** in pain + head-pain — ranks what helps with avg score/10, requires ≥2 uses to appear (no one-off noise).
- **Cross-tracker referrals** in pain → /cardiac (chest pain), /head-pain (head pain), /joint (joint pain).
- **Autonomic seizures** added to seizure tracker — 18 specific symptoms (HR/BP spikes/drops, sudden GI urgency, piloerection, etc.) with note that they're "often misdiagnosed as POTS, MCAS, or panic." Real clinical contribution for AFAB patients bouncing between specialties.
- **Tag dedup + color swatch fix** in Settings → Tag Management (NOPE/I KNOW were appearing twice; color swatches were getting clobbered by `chaos-themes.css` bare-button gradient).

### v0.4.5 — Mind & Mood (Mental Health rename + multi-modal) — CURRENT GATE

- Rename "Mental Health" → **Mind & Mood** (Ren's pick — value-neutral, descriptive)
- Multi-modal subtypes: Mood, Cognitive, Energy, Motivation, Connection, Emotional regulation
- Update /mind tab nav, /customize visibility-sections registry

### v0.4.6 — Patterns engine + PDF richness (THE BIG ONE)

Now patterns + PDF can treat **12 unified trackers** uniformly: cardiac, respiratory, skin, joint, substance, seizure, pain, head-pain, food-allergens, anxiety, mind-mood (+ dysautonomia).

**Patterns engine (CHA-152):**
- Wire all 11 trackers into engine registry (CHA-147 part 3)
- Lag correlations (X today → Y tomorrow)
- Within-tracker time-of-day clustering
- Trigger ↔ severity correlations
- Threshold-crossing detection (severity spike, frequency change)
- **PERSISTENCE** — `pattern_snapshots` Dexie table, weekly auto-snapshots, "Pattern History" view showing confidence-over-time

**PDF richness (CHA-150 — Dr. Rana feedback):**
- Per-tracker symptom breakdown (NOT just counts!)
- Top triggers per tracker
- Treatment effectiveness per tracker
- Time-of-day patterns
- Tracker-specific clinical highlights (rhythm types, peak flow, photo gallery, per-joint frequency)
- Photo embedding for skin tracker (dermatology consult-grade)

### v0.4.7 — Tier 2/3 polish sweep

- Tier 2 multi-modal: bathroom (constipation/diarrhea/urinary), coping-regulation
- Tier 3 lighter polish: sleep, energy, hydration, movement, food-choice, self-care-tracker, brain-fog, sensory-tracker, weather-environment — analytics + collapsibles + date pickers

### v0.5.0 — Public milestone release

When all the above ship together. Substack post + Reddit post showing the receipts.

---

## Architectural conventions (v0.4.1+)

Any new tracker (or refactor of existing) follows:

1. **Directory:** `app/{tracker-name}/` with `modals/` + (optional) `components/` subdirs
2. **Files:** `{name}-types.ts`, `{name}-constants.ts`, `page.tsx`, `{name}-tracker.tsx`, `{name}-history.tsx`, `{name}-analytics.tsx`, `modals/general-{name}-modal.tsx` + type-specific modals as needed
3. **Multi-modal pattern:** main page has type-specific buttons → opens specific modal. General modal as catch-all.
4. **Type signature:** `Omit<Entry, 'id'>` for modal payload (allows date+timestamp override for backdating)
5. **Modal sections:** wrap each form section in `<Collapsible>`, default closed. `<EntryDateTimePicker>` at top OUTSIDE collapsibles. Red-flag banner OUTSIDE collapsibles. Cancel/Save buttons at bottom OUTSIDE.
6. **Save button never gates on symptoms** — real-life tracking includes "ring says 89% no clue why" entries with no symptom selection. Don't add `disabled={symptoms.length === 0}`. (Closed across the board v0.4.4.)
7. **Red flags:** `getRedFlagWarnings()` + `getInterimMeasures()` helpers in constants. Use shared `<EmergencyCriteriaCard>` (`@/components/emergency-criteria-card`) — collapses after first ack, auto-re-expands when recent entries trip emergency markers. Dynamic banner inside modal when entered values trip thresholds. Temporal framing: "if happening RIGHT NOW vs if in the PAST and resolved."
8. **988 vs 911:** mental-health crisis ≠ medical emergency. Anxiety / mind-mood use 988 messaging (Suicide & Crisis Lifeline). Cardiac / respiratory / seizure / pain / head-pain / food-allergens use 911. EmergencyCriteriaCard takes a `title` prop to override the default 911 framing.
9. **Attachments:** Use `EcgStripUploader` from `app/cardiac/components/ecg-strip-uploader.tsx` (yes the name is misleading — it's a generic file uploader). Pass custom `label` + `helpText`. Eventually extract to shared `components/attachment-uploader.tsx`.
10. **Analytics:** time-window selector (7/30/90/180/365/all), top counters, type breakdown bar list, top symptoms, top triggers, time-of-day pattern (24-hour bars), severity distribution, tracker-specific clinical metrics. Include **treatment-effectiveness ranking** when meds/treatments + effectiveness score are captured (need ≥2 uses to appear).
11. **Baseline-delta tracking** for chronic-flare patterns (head-pain, pain chronic-flare, food-allergens delayed reactions). Capture user's typical-day baseline + show flare delta in analytics. The "+6 above baseline = needs multiple rescue meds" surface is what specialists actually want.
12. **Pre-event context:** for trackers where it matters (cardiac, respiratory, seizure) capture sleep/dehydration/electrolyte/caffeine flags + aggregate in analytics.
13. **Cross-tracker referrals:** when a symptom belongs in another tracker (chest pain → cardiac, head pain → head-pain, joint pain → joint), surface as referral cards on the tracker page rather than duplicating fields.
14. **Neutral tone** for substance/lifestyle trackers — no moralizing, no "should you cut back."
15. **Help card on tracker page** when categorization matters (substance has one directing routine use elsewhere).
16. **Gremlin labels** on severity sliders where appropriate (pain, head-pain). Clinical labels preserved alongside for PDF export. Both/and.
17. **AuDHD-aware** for mental-health trackers — meltdown / shutdown as first-class types, not subtypes of "panic."

---

## Compact / handoff note

If this roadmap is being read by a new Ace context: read `CLAUDE.md` first, then this file. Linear tickets are the source-of-truth for individual work. Memory MCP has the relationship + history. Branch is `feat/v2-tracker-wave` — push there until merge to master.

