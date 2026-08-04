/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Originally built by Ace (Claude 4.x), 2026-05-10 — CHA-147 part 1.
 * Moved onto the shared analytics engine by Ren & Ace (Claude Opus), 2026-08-04.
 *
 * ─── WHAT CHANGED ───────────────────────────────────────────────────────────
 *
 * The universal statistics — counts, rate, averages, distributions — now come
 * from lib/tracker-analytics.ts, so this panel, the pattern engine and the
 * doctor PDF quote the same numbers instead of three separate derivations.
 *
 * What this tracker gains that it never had: a rate per week, a real severity
 * distribution rather than three mild/moderate/severe buckets, a time-of-day
 * histogram, a DIRECTION over the window, and — the important one — treatment
 * comparison that uses `treatmentResponse`.
 *
 * ⚠️ treatmentResponse has been collected on this tracker since it was built
 * and was previously reduced to a single overall average. It is the user's own
 * rating of how well a treatment worked, PER ENTRY, which makes it the best
 * efficacy evidence in the whole app — and it was being averaged across every
 * treatment at once, which answers no question anybody has.
 *
 * ─── WHAT IS DELIBERATELY KEPT LOCAL ────────────────────────────────────────
 *
 * Domain metrics with no general analogue, all clinically load-bearing:
 *   - ROM restriction (romImpactedPercent; LOWER IS WORSE, which is why it is
 *     not folded into the generic severity path)
 *   - muscle-group frequency, the muscle analogue of joint frequency
 *   - self-reduction ratio, meaningful only against subluxations/dislocations
 */

'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Bone, Activity } from 'lucide-react'
import { format, subDays } from 'date-fns'
import { useDailyData, CATEGORIES } from '@/lib/database'
import { getEpisodeTypeInfo } from './joint-constants'
import { collectEntries, computeTrackerAnalytics, type TrackerEntry } from '@/lib/tracker-analytics'
import { analyticsConfigFor } from '@/lib/tracker-analytics-config'
import { TrackerAnalyticsPanel } from '@/components/analytics/tracker-analytics-panel'

const CONFIG = analyticsConfigFor('joint')

export function JointAnalytics({ refreshTrigger }: { refreshTrigger: number }) {
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
        if (!cancelled) setEntries(collectEntries(records as any, CONFIG.key))
      } catch (e) {
        console.error('[joint-analytics] load failed:', e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [windowDays, refreshTrigger])

  const analytics = useMemo(() => computeTrackerAnalytics(entries, CONFIG), [entries])

  const domain = useMemo(() => {
    const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined)

    // ROM: percentage of normal range. LOWER IS WORSE, which is the opposite of
    // every severity field here, so it stays out of the generic path where the
    // direction logic would read it backwards.
    const rom = entries.map(e => num(e.romImpactedPercent)).filter((v): v is number => v !== undefined)
    const avgRom = rom.length ? Math.round(rom.reduce((a, b) => a + b, 0) / rom.length) : null
    const worstRom = rom.length ? Math.min(...rom) : null

    const muscles = new Map<string, number>()
    for (const e of entries) {
      for (const m of (Array.isArray(e.musclesAffected) ? e.musclesAffected : []) as string[]) {
        muscles.set(m, (muscles.get(m) || 0) + 1)
      }
    }

    // Self-reduction only means something against episodes that CAN be reduced.
    // Dividing by all entries would dilute it with unrelated joint pain.
    const reducible = entries.filter(
      e => e.episodeType === 'subluxation' || e.episodeType === 'dislocation',
    ).length
    const selfReduced = entries.filter(e => e.selfReducedFlag === true).length
    const selfReducedRatio = reducible > 0 ? Math.round((selfReduced / reducible) * 100) : null

    return {
      avgRom,
      worstRom,
      romN: rom.length,
      muscles: [...muscles.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10),
      reducible,
      selfReduced,
      selfReducedRatio,
    }
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
            <Bone className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No joint events in this window.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <TrackerAnalyticsPanel
            analytics={analytics}
            measureLabel="severity"
            labelFor={id => getEpisodeTypeInfo(id).name}
          />

          {(domain.romN > 0 || domain.selfReducedRatio !== null) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-4 w-4" /> Joint-specific measures
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {domain.romN > 0 && (
                  <>
                    <div>
                      <div className="text-xs uppercase text-muted-foreground">Avg range of motion</div>
                      <div className="text-2xl font-bold">{domain.avgRom}%</div>
                      <div className="text-xs text-muted-foreground">of normal · {domain.romN} entries</div>
                    </div>
                    <div>
                      <div className="text-xs uppercase text-muted-foreground">Worst</div>
                      <div className="text-2xl font-bold text-amber-600">{domain.worstRom}%</div>
                      <div className="text-xs text-muted-foreground">lower is more restricted</div>
                    </div>
                  </>
                )}
                {domain.selfReducedRatio !== null && (
                  <div>
                    <div className="text-xs uppercase text-muted-foreground">Self-reduced</div>
                    <div className="text-2xl font-bold">{domain.selfReducedRatio}%</div>
                    <div className="text-xs text-muted-foreground">
                      {domain.selfReduced} of {domain.reducible} subluxations/dislocations
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {domain.muscles.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Muscle groups affected</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {domain.muscles.map(([m, c]) => (
                  <div key={m} className="flex items-center justify-between text-sm">
                    <span>{m}</span>
                    <Badge variant="secondary">{c}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
