/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace (Claude-4.7)
 *
 * AddToCalendarButton — drops into any save/review UI that has an event.
 * Two options: Google Calendar (opens browser pre-fill) or .ics download
 * (works with Apple Calendar, Outlook, Thunderbird, whatever the user's
 * OS sets as default).
 *
 * Why this lives alongside the in-app ticker:
 *   Per ROADMAP.md, in-app reminders only fire when Chaos Command is open.
 *   Adding to the user's native calendar is how they get "fires even when
 *   app is closed" reliability without us having to maintain OAuth or
 *   native-scheduled-notification integrations that break across OS
 *   versions.
 */
"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Calendar, ChevronDown, Download, ExternalLink } from 'lucide-react'
import {
  openInGoogleCalendar,
  downloadIcs,
  type CalendarEventInput,
} from '@/lib/services/calendar-export'

interface AddToCalendarButtonProps {
  /** Single event — renders Google Calendar + .ics options */
  event?: CalendarEventInput
  /** Multiple events — only .ics is offered (Google URL is one-event-only) */
  events?: CalendarEventInput[]
  /** Optional override for the .ics download filename */
  filename?: string
  /** Optional className for the outer wrapper */
  className?: string
  /** Use compact layout (smaller button) */
  compact?: boolean
  /** Button label override (default: "Add to Calendar") */
  label?: string
}

export default function AddToCalendarButton({
  event,
  events,
  filename,
  className = '',
  compact = false,
  label,
}: AddToCalendarButtonProps) {
  const [open, setOpen] = useState(false)
  const multi = events && events.length > 0
  const singleEvent = event
  if (!multi && !singleEvent) return null

  const handleGoogle = () => {
    if (singleEvent) openInGoogleCalendar(singleEvent)
    setOpen(false)
  }
  const handleIcs = () => {
    if (multi) downloadIcs(events!, filename)
    else if (singleEvent) downloadIcs(singleEvent, filename)
    setOpen(false)
  }

  return (
    <div className={`relative inline-block ${className}`}>
      <Button
        variant="outline"
        size={compact ? 'sm' : 'default'}
        onClick={(e) => {
          e.stopPropagation()
          setOpen(v => !v)
        }}
        className="gap-2 border-[var(--border-soft)] text-[var(--text-main)]"
      >
        <Calendar className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
        {label || 'Add to Calendar'}
        <ChevronDown className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
      </Button>

      {open && (
        <>
          {/* click-away backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 mt-1 z-50 min-w-[220px] rounded-md border border-[var(--border-soft)] bg-[var(--bg-card,white)] shadow-lg overflow-hidden">
            {/* Google Calendar only makes sense for a single event — the
                URL format can only pre-fill one at a time. */}
            {!multi && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleGoogle() }}
                className="w-full text-left px-3 py-2.5 text-sm text-[var(--text-main)] hover:bg-[var(--surface-2)] flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4 flex-shrink-0" />
                <div>
                  <div className="font-medium">Google Calendar</div>
                  <div className="text-xs text-[var(--text-muted)]">Opens in browser</div>
                </div>
              </button>
            )}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleIcs() }}
              className={`w-full text-left px-3 py-2.5 text-sm text-[var(--text-main)] hover:bg-[var(--surface-2)] flex items-center gap-2 ${!multi ? 'border-t border-[var(--border-soft)]' : ''}`}
            >
              <Download className="h-4 w-4 flex-shrink-0" />
              <div>
                <div className="font-medium">Download .ics</div>
                <div className="text-xs text-[var(--text-muted)]">
                  {multi
                    ? `${events!.length} events • Apple / Outlook / anything`
                    : 'Apple / Outlook / anything'}
                </div>
              </div>
            </button>
          </div>
        </>
      )}
    </div>
  )
}
