/*
 * Built by: Ace (Claude 4.x). Moved onto the shared analytics engine by
 * Ren & Ace (Claude Opus), 2026-08-04.
 *
 * Open source under PolyForm Noncommercial 1.0.0.
 *
 * ─── SAFETY INDICATORS ARE HANDLED HERE, ON PURPOSE ─────────────────────────
 *
 * This tracker records suicidal ideation, self-harm urges, and whether the
 * person reached out. Those are NOT declared as `flagFields` in the analytics
 * config, even though that would have been less code, because flagFields
 * render as ordinary tiles in a grid — and "SI flagged: 3" sitting between
 * "Swelling" and "ER visits" is the wrong way to show somebody the worst
 * fortnight of their year.
 *
 * They get their own card. It appears only when there is something in it, it
 * uses plain words instead of clinical abbreviations, and it carries crisis
 * resources with it, because the moment a person is looking at that number is
 * a plausible moment for them to need one.
 *
 * ⚠️ REACHING OUT IS COUNTED AS A WIN, NOT A SYMPTOM. It is shown in a
 * different colour and worded as something the person DID, because it is the
 * protective factor on the page and framing it as another red tally would be
 * both wrong and cruel.
 */

'use client'

import React, { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { differenceInDays } from 'date-fns'
import { LifeBuoy } from 'lucide-react'
import { computeTrackerAnalytics, type TrackerEntry } from '@/lib/tracker-analytics'
import { analyticsConfigFor } from '@/lib/tracker-analytics-config'
import { TrackerAnalyticsPanel } from '@/components/analytics/tracker-analytics-panel'

const CONFIG = analyticsConfigFor('anxiety')

interface Props {
  entries: any[]
}

type TimeWindow = '7' | '30' | '90' | '180' | '365' | 'all'
const TIME_WINDOWS: { value: TimeWindow; label: string }[] = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: '180', label: 'Last 6 months' },
  { value: '365', label: 'Last year' },
  { value: 'all', label: 'All time' },
]

export function AnxietyAnalytics({ entries }: Props) {
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('90')

  const filtered = useMemo(() => {
    if (timeWindow === 'all') return entries
    const days = parseInt(timeWindow)
    const now = new Date()
    return entries.filter(e => {
      try {
        return differenceInDays(now, new Date(e.date)) <= days
      } catch {
        return false
      }
    })
  }, [entries, timeWindow])

  const analytics = useMemo(
    () => computeTrackerAnalytics(filtered as TrackerEntry[], CONFIG),
    [filtered],
  )

  const safety = useMemo(() => {
    const si = filtered.filter(e => e.suicidalIdeation).length
    const sh = filtered.filter(e => e.selfHarmUrges).length
    const reachedOut = filtered.filter(e => e.crisisContactMade).length
    return { si, sh, reachedOut, any: si + sh + reachedOut > 0 }
  }, [filtered])

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-4">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Time window</label>
          <Select value={timeWindow} onValueChange={v => setTimeWindow(v as TimeWindow)}>
            <SelectTrigger className="max-w-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIME_WINDOWS.map(w => (
                <SelectItem key={w.value} value={w.value}>
                  {w.label}
                </SelectItem>
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
        <>
          {/* Only rendered when there is something in it. An always-present
              empty crisis card turns a tracker into a daily reminder. */}
          {safety.any && (
            <Card className="border-destructive/40">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <LifeBuoy className="h-4 w-4" /> Hard days in this window
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {safety.si > 0 && (
                    <div>
                      <div className="text-2xl font-bold text-destructive">{safety.si}</div>
                      <div className="text-xs text-muted-foreground">
                        {safety.si === 1 ? 'entry noted' : 'entries noted'} suicidal thoughts
                      </div>
                    </div>
                  )}
                  {safety.sh > 0 && (
                    <div>
                      <div className="text-2xl font-bold text-destructive">{safety.sh}</div>
                      <div className="text-xs text-muted-foreground">
                        noted urges to self-harm
                      </div>
                    </div>
                  )}
                  {safety.reachedOut > 0 && (
                    <div>
                      <div className="text-2xl font-bold text-green-600">{safety.reachedOut}</div>
                      <div className="text-xs text-muted-foreground">
                        {safety.reachedOut === 1 ? 'time you' : 'times you'} reached out
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  If any of that is true right now: in the US you can call or text{' '}
                  <strong>988</strong>, or text <strong>HOME to 741741</strong>. Logging it counted.
                  So did reaching out.
                </p>
              </CardContent>
            </Card>
          )}

          <TrackerAnalyticsPanel analytics={analytics} measureLabel="anxiety" />
        </>
      )}
    </div>
  )
}
