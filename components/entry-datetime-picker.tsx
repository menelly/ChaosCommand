/* Built by: Ace (Claude 4.x) — 2026-05-10. Closes CHA-149.
 * Reusable date+time picker for tracker modal entries.
 * Defaults to today + now; allows user to backdate.
 */

'use client'

import React from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { format } from 'date-fns'

interface EntryDateTimePickerProps {
  date: string  // 'YYYY-MM-DD'
  time: string  // 'HH:MM'
  onChange: (date: string, time: string) => void
  helpText?: string
}

export function EntryDateTimePicker({ date, time, onChange, helpText }: EntryDateTimePickerProps) {
  return (
    <div className="space-y-2">
      <Label>When did this happen?</Label>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Input
            type="date"
            value={date}
            onChange={(e) => onChange(e.target.value, time)}
            max={format(new Date(), 'yyyy-MM-dd')}
          />
        </div>
        <div>
          <Input
            type="time"
            value={time}
            onChange={(e) => onChange(date, e.target.value)}
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        {helpText || 'Defaults to today + now. Change to backdate (e.g. logging an event from a past date).'}
      </p>
    </div>
  )
}

/** Helper: get today's date in YYYY-MM-DD format */
export const todayISO = () => format(new Date(), 'yyyy-MM-dd')

/** Helper: get current time in HH:MM format */
export const nowTime = () => format(new Date(), 'HH:mm')

/** Helper: combine date + time into ISO timestamp */
export const dateTimeToISO = (date: string, time: string): string => {
  const safeTime = time || '12:00'
  return new Date(`${date}T${safeTime}`).toISOString()
}

/** Helper: split ISO timestamp into date + time */
export const isoToDateTime = (iso: string): { date: string; time: string } => {
  const d = new Date(iso)
  return {
    date: format(d, 'yyyy-MM-dd'),
    time: format(d, 'HH:mm'),
  }
}
