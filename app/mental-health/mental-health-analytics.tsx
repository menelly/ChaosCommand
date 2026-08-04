/*
 * Built by: Ace (Claude 4.x) — 2026-05-10 (CHA-158 v0.4.5, Mind & Mood)
 * Moved onto the shared analytics engine by Ren & Ace (Claude Opus), 2026-08-04.
 *
 * Open source under PolyForm Noncommercial 1.0.0.
 *
 * ─── WHAT WAS WRONG ─────────────────────────────────────────────────────────
 *
 * This tracker records NINE parallel scales — depression, anxiety, mania,
 * stress, brain fog, regulation difficulty, energy, motivation, social
 * engagement — and displayed eight of them as bare averages with no direction.
 *
 * "Avg depression 0.3" answers nothing. The question anybody in treatment
 * actually has is *is my depression improving*, which is per-scale and needs a
 * direction. The panel held all of the data and none of the answer.
 *
 * Each scale now carries its own mean, peak and trend, judged on its own terms
 * — because `higherIsBetter` genuinely differs between them. More energy is
 * good; more mania is not. One flag for the whole tracker would report a manic
 * climb as an improvement, which is precisely the moment an app must not be
 * confidently wrong.
 *
 * Nothing was dropped. Moods, mood-swing direction, cognitive domains,
 * emotional states, coping strategies and triggers are declared in the
 * analytics config, so they still render — as share-of-entries distributions
 * shared with every other tracker rather than nine bespoke tallies free to
 * drift apart.
 */

'use client'

import React, { useMemo, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { differenceInDays } from 'date-fns'
import { MentalHealthEntry } from './mental-health-types'
import { computeTrackerAnalytics, type TrackerEntry } from '@/lib/tracker-analytics'
import { analyticsConfigFor } from '@/lib/tracker-analytics-config'
import { TrackerAnalyticsPanel } from '@/components/analytics/tracker-analytics-panel'

const CONFIG = analyticsConfigFor('mental-health')

interface Props { entries: MentalHealthEntry[] }
type TimeWindow = '7' | '30' | '90' | '180' | '365' | 'all'
const TIME_WINDOWS: { value: TimeWindow; label: string }[] = [
  { value: '7', label: 'Last 7 days' }, { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' }, { value: '180', label: 'Last 6 months' },
  { value: '365', label: 'Last year' }, { value: 'all', label: 'All time' },
]

export function MindMoodAnalytics({ entries }: Props) {
  // 90 by default: a 30-day window cannot hold a monthly cycle, so a shorter
  // one measures where you are in the cycle rather than whether anything moved.
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('90')

  const filtered = useMemo(() => {
    if (timeWindow === 'all') return entries
    const days = parseInt(timeWindow)
    const now = new Date()
    return entries.filter(e => { try { return differenceInDays(now, new Date(e.date)) <= days } catch { return false } })
  }, [entries, timeWindow])

  const analytics = useMemo(
    () => computeTrackerAnalytics(filtered as unknown as TrackerEntry[], CONFIG),
    [filtered],
  )

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-4">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Time window</label>
          <Select value={timeWindow} onValueChange={v => setTimeWindow(v as TimeWindow)}>
            <SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TIME_WINDOWS.map(w => (
                <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            No entries in the selected window.
          </CardContent>
        </Card>
      ) : (
        <TrackerAnalyticsPanel analytics={analytics} measureLabel="mood intensity" />
      )}
    </div>
  )
}
