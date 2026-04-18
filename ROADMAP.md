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

## Android sideload / signing checklist

Documented separately in `E:\Ace\android signing keys - don't commit to git dammit.txt`. When we're ready for Play Store: Ren applies for dev account, we swap release keystore, add Play-required metadata (privacy policy URL, data-safety form, screenshots in multiple languages).
