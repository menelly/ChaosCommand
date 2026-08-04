/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Originally built by Ace (Claude 4.x), 2026-06-07.
 * Rebuilt on the shared analytics engine by Ren & Ace (Claude Opus), 2026-08-04.
 *
 * ─── WHAT CHANGED AND WHY ───────────────────────────────────────────────────
 *
 * This was 129 lines of tallies: total, last-7, average severity, and four
 * lists sorted by how often something appeared. No rate, no distribution, no
 * time-of-day, and — the one that mattered — no direction. It was the thinnest
 * analytics panel in the app, attached to the tracker whose data underwrites a
 * treatment case.
 *
 * The specific defect worth remembering: a card titled "Treatments / What
 * Helped" listing treatments by MENTION COUNT. The most-logged treatment
 * always ranked first regardless of whether it did anything, under a heading a
 * clinician reads as efficacy. That is the same error as a report crediting a
 * drug for an improvement it could not have caused — an attribution claim
 * computed from frequency.
 *
 * Everything numeric now comes from lib/tracker-analytics.ts, so this panel,
 * the pattern engine and the doctor PDF quote the same figures instead of
 * three independent derivations that could disagree with no way to tell which
 * was wrong.
 *
 * The domain-specific card kept below is the trigger→symptom correlation,
 * because it needs this tracker's episode-type vocabulary and already carried
 * an honest co-occurrence caveat.
 */

'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dna } from 'lucide-react'
import { format, subDays } from 'date-fns'
import { useDailyData, CATEGORIES } from '@/lib/database'
import { getEpisodeTypeInfo } from './autoimmune-constants'
import { collectEntries, computeTrackerAnalytics, type TrackerEntry } from '@/lib/tracker-analytics'
import { analyticsConfigFor } from '@/lib/tracker-analytics-config'
import { TrackerAnalyticsPanel } from '@/components/analytics/tracker-analytics-panel'

const CONFIG = analyticsConfigFor('autoimmune')

export function AutoimmuneAnalytics({ refreshTrigger }: { refreshTrigger: number }) {
  const { getDateRange } = useDailyData()
  const [windowDays, setWindowDays] = useState(90)
  const [entries, setEntries] = useState<TrackerEntry[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const today = format(new Date(), 'yyyy-MM-dd')
        const start = format(subDays(new Date(), windowDays), 'yyyy-MM-dd')
        const records = await getDateRange(start, today, CATEGORIES.TRACKER)
        // collectEntries handles key normalisation and all three content
        // shapes, so this page no longer has its own parsing to drift.
        if (!cancelled) setEntries(collectEntries(records as any, CONFIG.key))
      } catch (e) {
        console.error('[autoimmune-analytics] load failed:', e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [windowDays, refreshTrigger])

  const analytics = useMemo(() => computeTrackerAnalytics(entries, CONFIG), [entries])

  /**
   * Trigger -> symptom, kept local because it needs this tracker's episode
   * vocabulary. Floor of 2 logs, and it says co-occurrence out loud.
   */
  const correlations = useMemo(() => {
    const byTrigger = new Map<string, { count: number; sevSum: number; types: Map<string, number> }>()
    for (const e of entries) {
      const sev = typeof e.severity === 'number' ? e.severity : 0
      const type = typeof e.episodeType === 'string' ? e.episodeType : ''
      for (const t of (Array.isArray(e.triggers) ? e.triggers : []) as string[]) {
        const rec = byTrigger.get(t) || { count: 0, sevSum: 0, types: new Map() }
        rec.count += 1
        rec.sevSum += sev
        if (type) rec.types.set(type, (rec.types.get(type) || 0) + 1)
        byTrigger.set(t, rec)
      }
    }
    return [...byTrigger.entries()]
      .filter(([, v]) => v.count >= 2)
      .map(([trigger, v]) => ({
        trigger,
        count: v.count,
        avgSeverity: Math.round((v.sevSum / v.count) * 10) / 10,
        top: [...v.types.entries()]
          .map(([t, n]) => ({ label: getEpisodeTypeInfo(t).name, pct: Math.round((n / v.count) * 100) }))
          .sort((a, b) => b.pct - a.pct)
          .slice(0, 3),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)
  }, [entries])

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
            <Dna className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No autoimmune events in this window.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <TrackerAnalyticsPanel
            analytics={analytics}
            measureLabel="severity"
            labelFor={id => getEpisodeTypeInfo(id).name}
          />

          {correlations.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Trigger → symptom correlations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {correlations.map(c => (
                  <div key={c.trigger}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium">{c.trigger}</span>
                      <span className="text-muted-foreground">
                        {c.count} logs · avg {c.avgSeverity}/10
                      </span>
                    </div>
                    {c.top.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {c.top.map(s => (
                          <Badge key={s.label} variant="secondary" className="font-normal">
                            {s.label} · {s.pct}%
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                <p className="text-xs text-muted-foreground mt-3">
                  Co-occurrence, not proof of cause — but worth raising with your rheumatologist.
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
