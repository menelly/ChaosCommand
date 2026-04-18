/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace (Claude-4.7)
 *
 * calendar-export.ts — Push events into the user's native calendar app
 * via deep-link URLs and .ics downloads. No OAuth. No API keys. No hosting.
 *
 * Why this file exists:
 *   Per ROADMAP.md, we ship Tier 1 (calendar deep-link) + Tier 2 (in-app
 *   ticker) for reminders. Tier 3 (native scheduled notifications) and
 *   Tier 4 (OAuth calendar sync) are explicit non-goals at current team
 *   size because their silent failure modes are a safety problem for a
 *   medical-adjacent app with no dev funding.
 *
 * The user clicks "Add to Calendar" → their native calendar app opens with
 * the event pre-filled → they hit Save once → their calendar handles all
 * future notification delivery. We're not in the loop after that.
 */

export interface CalendarEventInput {
  title: string
  description?: string
  location?: string
  /** ISO string for the event start */
  start: string
  /** ISO string for the event end. Optional — defaults to start + durationMinutes. */
  end?: string
  durationMinutes?: number
  /** Minutes before the event to trigger a reminder alert. Default 60. */
  reminderMinutesBefore?: number
  /**
   * Optional raw iCal recurrence rule (without the "RRULE:" prefix).
   * Examples:
   *   "FREQ=DAILY"                  → every day
   *   "FREQ=DAILY;COUNT=30"         → daily for 30 days
   *   "FREQ=WEEKLY;BYDAY=MO,WE,FR"  → M/W/F
   * When set, the calendar event repeats. Used for medication doses.
   */
  recurrenceRule?: string
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Format an ISO date as Google Calendar / iCal expects:
 *   YYYYMMDDTHHMMSSZ  (in UTC)
 * We always convert to UTC so the calendar app localises it correctly.
 */
function toIcalDateTime(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    'T' +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    'Z'
  )
}

function resolveEnd(input: CalendarEventInput): string {
  if (input.end) return input.end
  const mins = input.durationMinutes ?? 60
  const start = new Date(input.start)
  return new Date(start.getTime() + mins * 60_000).toISOString()
}

function icsEscape(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '')
}

// ============================================================================
// GOOGLE CALENDAR URL
// ============================================================================

/** Returns a Google Calendar URL that pre-fills the event. Open it in a browser. */
export function toGoogleCalendarUrl(input: CalendarEventInput): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: input.title,
    dates: `${toIcalDateTime(input.start)}/${toIcalDateTime(resolveEnd(input))}`,
  })
  if (input.description) params.set('details', input.description)
  if (input.location) params.set('location', input.location)
  // Google Calendar accepts a raw RRULE via the `recur` param.
  // Docs: https://developers.google.com/calendar/api/concepts/events-calendars
  if (input.recurrenceRule) params.set('recur', `RRULE:${input.recurrenceRule}`)
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

// ============================================================================
// OUTLOOK WEB URL
// ============================================================================

/** Returns an Outlook Web compose URL that pre-fills the event. */
export function toOutlookCalendarUrl(input: CalendarEventInput): string {
  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: input.title,
    startdt: input.start,
    enddt: resolveEnd(input),
  })
  if (input.description) params.set('body', input.description)
  if (input.location) params.set('location', input.location)
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`
}

// ============================================================================
// .ICS FILE (universal — Apple Calendar, Outlook desktop, Thunderbird, etc.)
// ============================================================================

/**
 * Build a minimal, spec-compliant VEVENT. Includes VALARM so the target
 * calendar sets a notification on import. RFC 5545 §3.6.6.
 */
export function toIcsString(input: CalendarEventInput): string {
  const uid = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}@chaoscommand.center`
  const dtStamp = toIcalDateTime(new Date().toISOString())
  const dtStart = toIcalDateTime(input.start)
  const dtEnd = toIcalDateTime(resolveEnd(input))
  const triggerMin = input.reminderMinutesBefore ?? 60
  // RFC 5545 wants negative duration for "N minutes before start"
  const trigger = `-PT${triggerMin}M`

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Chaos Cascade//Chaos Command//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    // X-WR-CALNAME hints calendar apps (Apple Calendar especially) to
    // create or use a named calendar on import. Not all apps honor it
    // but Apple / Outlook / Thunderbird do. Gives users a togglable
    // "Chaos Command" calendar if their app supports calendar creation
    // at import time.
    'X-WR-CALNAME:Chaos Command Reminders',
    'X-WR-CALDESC:Medication doses, refills, appointments, and device timers from Chaos Command',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${icsEscape(input.title)}`,
    // CATEGORIES lets users filter/color by category inside one calendar
    // — a fallback for apps that didn't honor X-WR-CALNAME.
    'CATEGORIES:Chaos Command',
  ]
  if (input.description) lines.push(`DESCRIPTION:${icsEscape(input.description)}`)
  if (input.location) lines.push(`LOCATION:${icsEscape(input.location)}`)
  if (input.recurrenceRule) lines.push(`RRULE:${input.recurrenceRule}`)
  lines.push(
    'BEGIN:VALARM',
    `TRIGGER:${trigger}`,
    'ACTION:DISPLAY',
    `DESCRIPTION:${icsEscape(input.title)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  )
  return lines.join('\r\n')
}

/**
 * Build a single .ics file containing multiple VEVENTs. Useful when a
 * medication has several daily dose times — we emit one recurring event
 * per time, wrapped in one VCALENDAR, so the user imports once and gets
 * all reminders.
 */
export function toMultipleIcsString(events: CalendarEventInput[]): string {
  const header = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Chaos Cascade//Chaos Command//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    // Named-calendar hint so Apple Calendar / Outlook / Thunderbird can
    // create a togglable "Chaos Command Reminders" calendar on import.
    'X-WR-CALNAME:Chaos Command Reminders',
    'X-WR-CALDESC:Medication doses, refills, appointments, and device timers from Chaos Command',
  ]
  // Pull inner VEVENT lines out of toIcsString (strip the VCALENDAR wrapper)
  const bodies = events.map(e => {
    const full = toIcsString(e)
    const start = full.indexOf('BEGIN:VEVENT')
    const end = full.indexOf('END:VEVENT') + 'END:VEVENT'.length
    return full.slice(start, end)
  })
  return [...header, ...bodies, 'END:VCALENDAR'].join('\r\n')
}

/**
 * Download an .ics file locally. Accepts a single event or an array of
 * events (multi-VEVENT .ics). User's OS opens it with their default
 * calendar (Apple Calendar on macOS/iOS, Outlook on Windows, etc.) which
 * offers to add the events.
 */
export function downloadIcs(
  input: CalendarEventInput | CalendarEventInput[],
  filename = 'chaos-command-reminder.ics',
): void {
  if (typeof window === 'undefined') return
  const content = Array.isArray(input) ? toMultipleIcsString(input) : toIcsString(input)
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  setTimeout(() => {
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, 100)
}

/**
 * Open the Google Calendar pre-fill in a new tab/window. On mobile Tauri
 * webviews, falls back to the OS URL handler (which usually opens the
 * Google Calendar app if installed).
 */
export function openInGoogleCalendar(input: CalendarEventInput): void {
  if (typeof window === 'undefined') return
  window.open(toGoogleCalendarUrl(input), '_blank', 'noopener,noreferrer')
}
