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

### v0.4.5 ✅ shipped 2026-05-10 — Mind & Mood + Tier 2 sweep

CHA-158. Three sweeps in one cut:

- **Mental Health → Mind & Mood** rename + multi-modal refactor. 7 episode types (Mood / Cognitive / Energy / Motivation / Connection / **Emotional Regulation** [AuDHD-aware] / General Check-in). Adaptive modal — sections render based on selected episode type. 988 red flags: **mixed-state days** (high dep + high mania = highest suicide-risk window), severe mania, rapid cycling. Drive-level tracking (anhedonia signal), cognitive domain breakdown, meltdown precursors / occurred. /mind nav + visibility-sections registry updated. Route stays `/mental-health` (don't break URLs).
- **Bathroom** Tier 2 multi-modal: 6 episode types (Normal BM / Constipation / Diarrhea / Urinary / Blood-or-Red-Flag / General). Red flags: black-tarry stool (upper GI bleed), pyelonephritis pattern (UTI + fever + flank), obstruction pattern (no gas + vomiting), blood in urine. Bristol scale 1-7 dropdown. Cross-tracker referrals to food-allergens / hydration / pain / medications.
- **Brain-fog** Tier 3 polish: standardized time-window selector (7/30/90/180/365/all instead of nonstandard 7/30/60/90+all), EntryDateTimePicker on entry form.
- **Sleep** analytics polish: added time-window selector (was always-all, no filter).

### v0.4.6 ✅ shipped 2026-05-10 — Pattern engine v2 with persistence

CHA-152 + CHA-147. The two problems Ren named explicitly:

🐛 **"Doesn't persist"** — runs in-memory each session, no Dexie pattern_snapshots table.
✅ Fix: Dexie schema v2 (additive migration, no data loss) added `pattern_snapshots` table. Every run writes a snapshot with timestamp, window, insight count, high-priority count, full serialized result. Page hydrates latest snapshot on mount. New "History" tab shows last 20 runs.

🐛 **"Doesn't catch things that matter much"** — engine read v1 schema only.
✅ Fix: New `lib/pattern-engine-v2.ts` (471 lines) with **per-tracker semantic extractors** reading rich v2 fields (status epi, autonomic seizures, tearing/thunderclap/cauda-equina markers, anaphylaxis pattern, celiac aftermath, mixed-state mood, multi-rescue migraine, pyelonephritis, VT capture, etc.) + 9 actionable pattern detectors. New "Red Flags" tab in /patterns UI with high-impact filter. Cross-tracker red-flag detection (e.g., severe panic + cardiac symptoms same day → cardiac referral).

### v0.4.7 ✅ shipped 2026-05-10 — PDF report enrichment

CHA-150 + Dr. Rana feedback. v1 PDF was bare ICD-10s + one-line tracker summaries that didn't help doctors validate suggestions.

- 🐛 **Tracker name truncation fix** — v1 split subcategory on `-` and kept first piece ("head-pain" → "Head"). Fixed with explicit `TRACKER_DISPLAY_NAMES` mapper covering 30+ trackers.
- Extended `ICD10_MAP` for v0.4.x trackers (cardiac, respiratory, skin, joint, substance, food-allergens, crisis-support, coping, weather).
- **Supporting evidence per tracker** — top symptoms/triggers/character/red-flag-booleans listed alongside the ICD-10 suggestion so doctors can validate.
- **Pain Assessment rewritten**: top locations, character, pattern, radiation, triggers, treatment effectiveness ranked (≥2 uses), red-flag history (tearing/thunderclap/cauda counts), chronic-flare delta histogram, monthly trend.
- **10 new tracker assessment sections** (none existed in v1 PDF): Head Pain (multi-rescue migraine count + baseline-delta), Seizure (status epi + autonomic clusters), Food Reactions (anaphylaxis + celiac aftermath %), Cardiac (rhythm types + VT callouts), Respiratory (peak-flow zones), Skin (photo count + SJS flag), Joint/MSK (per-joint frequency for ortho consult), Bathroom (Bristol + blood + pyelonephritis), Anxiety (crisis-flagged entries), Mind & Mood (mixed-state days + rapid cycling).
- **Detected Medical Patterns section** pulls from `analyzeV2Patterns` — same 9 detectors that fire on in-app Red Flags tab appear in doctor's PDF.

### v0.4.8 ✅ shipped 2026-05-10 — PDF unicode fix + export modal v2 coverage

Two fixes Ren caught minutes after installing v0.4.7:

- 🐛 **PDF letter-spacing breakage**: `≥` character isn't in jsPDF's WinAnsi encoding, broke kerning on "Treatment effectiveness (≥2 uses)" line — rendered as "T r e a t m e n t" with letter gaps. Replaced with "2+ uses". Stripped 🚨 / 💜 emojis from sectionHeader/subSection labels too as defensive cleanup.
- 🐛 **Print/Export modal missing v2 trackers** — checklist hadn't been updated since v0.4.0. Added 8 missing trackers (cardiac, respiratory, skin, joint, substance, food-allergens, crisis-support, coping). Relabeled "Mental Health" → "Mind & Mood", "Lower Digestive" → "Bathroom (bowel + urinary)". Added 5 new specialty options (pulmonologist / dermatologist / allergist / orthopedist / urologist) with their smart defaults. Cardiologist now includes cardiac, gastroenterologist includes food-allergens, rheumatologist includes joint + skin.

### v0.4.9 — PDF spacing/layout fixes (CURRENT GATE)

Caught when reviewing v0.4.8 doctor-mode PDF output:

- 🐛 **Tables don't push following content down properly** — body text after a `table()` call writes at stale `y`, causing overlap (e.g., "Top ictal symptoms..." line overlapping the Episode Type table cells in Seizure Assessment section).
- 🐛 **sectionHeader has no leading breathing room when preceded by a table** — Cardiac Assessment header butted right against the section before it.
- 🐛 **subSection has insufficient leading clearance** — Bristol scale distribution and Joint/MSK headers crushed against the body line above.
- 🐛 **General: every `table()` exits without trailing spacer, every `sectionHeader()` enters without leading clearance** — needs a `breathingRoom()` contract in PDFWriter.

Fix scope: localized to `PDFWriter` class in `lib/pdf-report-generator.ts` (lines ~100-275). Estimated ~30-line touch. Content logic untouched. Tomorrow's first task.

### v0.4.10 — Tier 3 polish sweep + bland-data-generator parity

- Tier 3 lighter polish: energy, hydration, movement, food-choice, self-care-tracker, sensory-tracker, weather-environment — analytics + collapsibles + date pickers
- `lib/database/bland-data-generator.ts` ("Generate Bland Data" button — separate from G-SPOT) is missing the 5 new v0.4.x trackers. Different code path from G-SPOT cover story (which is patched). Lower urgency but worth fixing for parity.
- coping-regulation Tier 2 multi-modal (deferred from earlier — Ren's feedback was that it's already solid as-is, deprioritized)

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
18. **Adaptive modal pattern** (v0.4.5+) — for trackers where one modal serves many episode types (Mind & Mood), use `episodeType`-conditional rendering rather than separate modals per type. Reduces code duplication, gives users a coherent experience when they're not sure which category fits.
19. **Conditional sub-modal sections** — fields that only matter for specific episode types (OCD intrusion theme + compulsions for anxiety, post-surgical context for pain, celiac aftermath for food-allergens) should render conditionally based on `episodeType`, not always. Keeps the modal lean for the common case.
20. **Persistence pattern for engines** (v0.4.6+) — anything that *runs* (pattern engine, future PDF cache, analytics computations) should write a snapshot to Dexie on each run and hydrate latest on page mount. No more "click run, navigate away, come back, blank page." Use additive Dexie versions (`this.version(N).stores({...})`) so existing data survives schema migrations.
21. **PDF / jsPDF unicode safety** — jsPDF's default Helvetica is WinAnsi-encoded. ≥, ≤, →, 🚨, 💜, 💊 break letter-spacing in `sectionHeader` and `subSection` calls. Use ASCII-safe equivalents in PDF section labels (`2+ uses` not `≥2 uses`). Em-dash (—) is in WinAnsi and is safe. Emojis are tolerable in `body()` / `finding()` (which use `splitTextToSize`) but avoid in raw text positioning.
22. **Cross-surface medical content** — the same v2 pattern engine output that drives the in-app Red Flags tab should also feed the doctor PDF's Detected Medical Patterns section. Doctor and patient see the same insights, no surprises.
23. **988 not 911 for mental-health crisis** — the disability software user base needs the mental-health crisis line referenced specifically. 988 is free, confidential, 24/7, text or call. Crisis Text Line backup: HOME to 741741. International: findahelpline.com. "Reaching out is brave, not weak" framing matters.

---

## Compact / handoff note

If this roadmap is being read by a new Ace context: read `CLAUDE.md` first, then this file. Linear tickets are the source-of-truth for individual work. Memory MCP has the relationship + history. Branch is `feat/v2-tracker-wave` — push there until merge to master.

