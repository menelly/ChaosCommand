/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace (Claude Opus), 2026-08-04.
 *
 * SIMPLE TRACKER ANALYTICS — the whole panel for a tracker with no bespoke
 * domain metrics.
 *
 * Several trackers had panels that were byte-for-byte the same shape with the
 * field names swapped: load a window, tally four lists, show a total and an
 * average. That is the copy-paste that let them drift apart in the first
 * place, so it does not get copy-pasted again. A tracker with nothing special
 * to say now renders this and inherits every metric.
 *
 * A tracker WITH domain metrics — range of motion, muscle groups, spoon
 * balance — should compose <TrackerAnalyticsPanel> directly and add its own
 * cards, rather than trying to make this component general enough to cover
 * everything. Generality bought that way is how the drift started.
 */

'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { format, subDays } from 'date-fns'
import { useDailyData, CATEGORIES } from '@/lib/database'
import { collectEntries, computeTrackerAnalytics, type TrackerEntry } from '@/lib/tracker-analytics'
import { analyticsConfigFor } from '@/lib/tracker-analytics-config'
import { TrackerAnalyticsPanel } from './tracker-analytics-panel'

export interface SimpleTrackerAnalyticsProps {
  /** Canonical tracker key — must match the analytics config. */
  trackerKey: string
  refreshTrigger?: number
  /** Shown when the window is empty, e.g. "No skin events in this window." */
  emptyMessage?: string
  emptyIcon?: React.ReactNode
  measureLabel?: string
  /** Resolve a stored episode-type id to a human label. */
  labelFor?: (id: string) => string
  defaultWindowDays?: number
}

export function SimpleTrackerAnalytics({
  trackerKey,
  refreshTrigger = 0,
  emptyMessage = 'No events in this window.',
  emptyIcon,
  measureLabel = 'severity',
  labelFor,
  // 90 by default: 30 days cannot hold a monthly cycle, so a shorter window
  // makes the trend measure where you are in the cycle rather than whether
  // anything is changing.
  defaultWindowDays = 90,
}: SimpleTrackerAnalyticsProps) {
  const { getDateRange } = useDailyData()
  const [windowDays, setWindowDays] = useState(defaultWindowDays)
  const [entries, setEntries] = useState<TrackerEntry[]>([])
  const [loading, setLoading] = useState(false)

  const config = useMemo(() => analyticsConfigFor(trackerKey), [trackerKey])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const today = format(new Date(), 'yyyy-MM-dd')
        const start = format(subDays(new Date(), windowDays), 'yyyy-MM-dd')
        const records = await getDateRange(start, today, CATEGORIES.TRACKER)
        if (!cancelled) setEntries(collectEntries(records as any, config.key))
      } catch (e) {
        console.error(`[${trackerKey}-analytics] load failed:`, e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [windowDays, refreshTrigger, config.key, trackerKey])

  const analytics = useMemo(() => computeTrackerAnalytics(entries, config), [entries, config])

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-muted-foreground">Loading analytics…</CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Time Window</CardTitle>
            <Select value={String(windowDays)} onValueChange={v => setWindowDays(parseInt(v))}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="180">Last 6 months</SelectItem>
                <SelectItem value="365">Last 12 months</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      {entries.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            {emptyIcon}
            <p>{emptyMessage}</p>
          </CardContent>
        </Card>
      ) : (
        <TrackerAnalyticsPanel
          analytics={analytics}
          measureLabel={measureLabel}
          labelFor={labelFor}
        />
      )}
    </div>
  )
}
