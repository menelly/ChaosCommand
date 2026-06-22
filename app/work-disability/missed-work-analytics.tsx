/* Built by: Ace (Claude 4.8) — 2026-06-22.
 * Real analytics for the Missed Work / Disability tracker. The old view showed
 * only "total days." For an SSDI-focused tool the gold is: frequency over time,
 * the WHY (reasons/tags), impact distribution, estimated hours lost, AND the
 * correlation a judge actually cares about — were your tracked symptoms
 * measurably worse on the days you couldn't work?
 *
 * The correlation reuses the app's canonical severity extractor (pattern-engine)
 * so "symptom severity" means the same thing here as on the Patterns page. */

'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Search, TrendingUp, Activity, CalendarDays } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { format, subMonths } from 'date-fns'
import { useDailyData, CATEGORIES } from '@/lib/database'
import { extractSeverity } from '@/lib/pattern-engine'

// Structurally-compatible with the page's MissedWorkDay (only the fields we read).
interface MissedDay {
  date: string
  workType: string
  reason: string
  impactLevel: string
  couldNotDoAnythingElse: boolean
  duration: 'full' | 'partial'
  hoursMissed?: number
  tags?: string[]
}

const WORK_TYPE_LABELS: Record<string, string> = {
  'paid job': 'Paid Job', caregiving: 'Caregiving', chores: 'Household', school: 'School', volunteering: 'Volunteering',
}
const IMPACT_ORDER = ['mild', 'moderate', 'severe'] as const
const IMPACT_META: Record<string, { label: string; color: string }> = {
  mild: { label: 'Mild', color: 'bg-warning' },
  moderate: { label: 'Moderate', color: 'bg-warning' },
  severe: { label: 'Severe', color: 'bg-destructive' },
}
const HOURS_PER_FULL_DAY = 8

export function MissedWorkAnalytics({ missedDays }: { missedDays: MissedDay[] }) {
  const { getDateRange } = useDailyData()
  // Average tracked symptom severity per date (across all symptom trackers).
  const [sevByDate, setSevByDate] = useState<Record<string, number>>({})

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const today = format(new Date(), 'yyyy-MM-dd')
        const recs = await getDateRange('2000-01-01', today, CATEGORIES.TRACKER)
        const buckets: Record<string, number[]> = {}
        for (const r of recs as any[]) {
          const s = extractSeverity(r)
          if (s !== null) (buckets[r.date] ||= []).push(s)
        }
        const avg: Record<string, number> = {}
        for (const [d, arr] of Object.entries(buckets)) avg[d] = arr.reduce((a, b) => a + b, 0) / arr.length
        if (!cancelled) setSevByDate(avg)
      } catch (e) {
        console.error('Missed-work correlation load failed:', e)
      }
    })()
    return () => { cancelled = true }
  }, [getDateRange])

  const stats = useMemo(() => {
    const total = missedDays.length
    const fullDays = missedDays.filter(d => d.duration === 'full').length
    const partialHours = missedDays.filter(d => d.duration === 'partial').reduce((s, d) => s + (d.hoursMissed || 0), 0)
    const hoursLost = Math.round(fullDays * HOURS_PER_FULL_DAY + partialHours)
    const unable = missedDays.filter(d => d.couldNotDoAnythingElse).length

    const impactCounts: Record<string, number> = { mild: 0, moderate: 0, severe: 0 }
    for (const d of missedDays) if (impactCounts[d.impactLevel] !== undefined) impactCounts[d.impactLevel]++

    const workTypeCounts: Record<string, number> = {}
    for (const d of missedDays) workTypeCounts[d.workType] = (workTypeCounts[d.workType] || 0) + 1

    const tagCounts: Record<string, number> = {}
    for (const d of missedDays) for (const t of (d.tags || [])) tagCounts[t] = (tagCounts[t] || 0) + 1

    // Last 12 months frequency.
    const monthly: { label: string; key: string; count: number }[] = []
    for (let i = 11; i >= 0; i--) {
      const d = subMonths(new Date(), i)
      const key = format(d, 'yyyy-MM')
      monthly.push({ key, label: format(d, 'MMM'), count: 0 })
    }
    const monthIndex = new Map(monthly.map((m, i) => [m.key, i]))
    for (const d of missedDays) {
      const idx = monthIndex.get(d.date.substring(0, 7))
      if (idx !== undefined) monthly[idx].count++
    }
    // Recent vs prior 3-month rate (trend direction).
    const last3 = monthly.slice(9).reduce((s, m) => s + m.count, 0)
    const prior3 = monthly.slice(6, 9).reduce((s, m) => s + m.count, 0)

    // Symptom correlation: avg tracked severity on missed days vs other days.
    const missedDates = new Set(missedDays.map(d => d.date))
    const missedSevs: number[] = []
    const otherSevs: number[] = []
    for (const [date, sev] of Object.entries(sevByDate)) {
      (missedDates.has(date) ? missedSevs : otherSevs).push(sev)
    }
    const mean = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null)
    const missedDaysWithSymptoms = [...missedDates].filter(d => sevByDate[d] !== undefined).length

    return {
      total, fullDays, partialHours, hoursLost, unable,
      impactCounts, workTypeCounts, tagCounts, monthly, last3, prior3,
      avgSevMissed: mean(missedSevs),
      avgSevOther: mean(otherSevs),
      missedDaysWithSymptoms,
      symptomCoveragePct: total ? Math.round((missedDaysWithSymptoms / total) * 100) : 0,
    }
  }, [missedDays, sevByDate])

  const sortedTypes = Object.entries(stats.workTypeCounts).sort((a, b) => b[1] - a[1])
  const sortedTags = Object.entries(stats.tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 10)
  const hasMonthly = stats.monthly.some(m => m.count > 0)

  return (
    <div className="space-y-4 mb-4">
      {/* Headline counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card><CardContent className="py-3 text-center">
          <div className="text-2xl font-bold">{stats.total}</div>
          <div className="text-xs text-muted-foreground">Days logged</div>
        </CardContent></Card>
        <Card><CardContent className="py-3 text-center">
          <div className="text-2xl font-bold">{stats.hoursLost}</div>
          <div className="text-xs text-muted-foreground">Est. hours lost</div>
        </CardContent></Card>
        <Card><CardContent className="py-3 text-center">
          <div className="text-2xl font-bold text-destructive">{stats.unable}</div>
          <div className="text-xs text-muted-foreground">Couldn't do anything</div>
        </CardContent></Card>
        <Card><CardContent className="py-3 text-center">
          <div className="text-2xl font-bold text-destructive">{stats.impactCounts.severe}</div>
          <div className="text-xs text-muted-foreground">Severe days</div>
        </CardContent></Card>
      </div>

      {/* THE SSDI MONEY SHOT: symptom severity on missed days vs other days */}
      {stats.avgSevMissed != null && stats.avgSevOther != null ? (
        <Card className="border-primary/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" /> Missed work vs your symptoms
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="rounded-lg bg-destructive/10 border border-destructive/30 py-3">
                <div className="text-2xl font-bold text-destructive">{stats.avgSevMissed}</div>
                <div className="text-xs text-muted-foreground">avg symptom severity<br />on days you missed work</div>
              </div>
              <div className="rounded-lg bg-muted/40 py-3">
                <div className="text-2xl font-bold">{stats.avgSevOther}</div>
                <div className="text-xs text-muted-foreground">avg symptom severity<br />on other tracked days</div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              On the days you couldn't work, your tracked symptoms averaged{' '}
              <strong className={stats.avgSevMissed >= stats.avgSevOther ? 'text-destructive' : ''}>
                {stats.avgSevMissed >= stats.avgSevOther
                  ? `${(stats.avgSevMissed - stats.avgSevOther).toFixed(1)} higher`
                  : `${(stats.avgSevOther - stats.avgSevMissed).toFixed(1)} lower`}
              </strong>{' '}
              than on the days you worked. {stats.symptomCoveragePct}% of your missed days also have symptoms logged —
              the more you log both, the stronger this link reads to a reviewer. Co-occurrence, not proof — but it's
              exactly the pattern SSDI looks for.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-4 text-sm text-muted-foreground">
            <strong className="text-foreground">Unlock symptom correlation:</strong> log your symptom trackers on the
            same days you miss work, and Command will show whether your symptoms were measurably worse on those days —
            the single most persuasive pattern for a disability claim.
          </CardContent>
        </Card>
      )}

      {/* Frequency over time */}
      {hasMonthly && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="h-4 w-4" /> Frequency (last 12 months)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={stats.monthly} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" name="days missed" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Last 3 months: <strong>{stats.last3}</strong> days · prior 3 months: <strong>{stats.prior3}</strong> days
              {stats.last3 > stats.prior3 && ' — trending up'}
              {stats.last3 < stats.prior3 && ' — trending down'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* The WHY — reasons/tags */}
      {sortedTags.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2"><Search className="h-4 w-4" /> Why you missed work</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {sortedTags.map(([tag, count]) => {
              const pct = (count / stats.total) * 100
              return (
                <div key={tag} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>{tag}</span>
                    <span className="text-muted-foreground">{count} {count === 1 ? 'day' : 'days'} ({pct.toFixed(0)}%)</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div className="bg-primary h-2" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
            <p className="text-xs text-muted-foreground pt-1">Tagged reasons across your logged days. Add tags when you log to sharpen this.</p>
          </CardContent>
        </Card>
      )}

      {/* Impact distribution + work type */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Impact distribution</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {IMPACT_ORDER.map(level => {
              const count = stats.impactCounts[level] || 0
              const pct = stats.total ? (count / stats.total) * 100 : 0
              return (
                <div key={level} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>{IMPACT_META[level].label}</span>
                    <span className="text-muted-foreground">{count} ({pct.toFixed(0)}%)</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div className={`${IMPACT_META[level].color} h-2`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">By type of work</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {sortedTypes.map(([type, count]) => (
              <div key={type} className="flex items-center justify-between text-sm">
                <span>{WORK_TYPE_LABELS[type] || type}</span>
                <Badge variant="secondary">{count}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground italic text-center">
        This is the data that wins SSDI cases — frequency, severity, the why, and the symptom link. Keep logging.
      </p>
    </div>
  )
}
