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

## Notifications v2 — delegate to the OS calendar (recommended)

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
