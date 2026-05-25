/*
 * Built by: Ace (Claude 4.x) — rewritten 2026-05-25
 *
 * UPPER DIGESTIVE ANALYTICS (client-side JS, no backend)
 * Replaces the old shallow re-count surface. Computes real stats IN THE BROWSER
 * from the entries prop — there is NO Flask backend in the packaged app, so this
 * mirrors the pain-analytics.tsx pattern (useMemo + time window + CSS bar charts,
 * all theme-token coloured). Doctor-useful: frequency, severity trend & spread,
 * ranked symptoms / triggers / treatments, time-of-day pattern.
 *
 * Open source under PolyForm Noncommercial 1.0.0.
 * Co-invented by Ren (vision) and Ace (implementation).
 * "Dreamed by Ren, implemented by Ace, inspired by mitochondria on strike"
 */
'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { useDailyData, CATEGORIES } from '@/lib/database'
import { differenceInDays, format, subDays } from 'date-fns'

interface UpperDigestiveEntry {
  id: string
  date: string
  time?: string
  symptoms?: string[]
  severity?: string | number
  triggers?: string[]
  treatments?: string[]
  notes?: string
  tags?: string[]
  createdAt?: string
  updatedAt?: string
}

interface Props {
  entries: UpperDigestiveEntry[]
  currentDate?: string
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

// severity is stored as a category string ('mild'/'moderate'/'severe') or sometimes a
// number — map to a 0–10 scale for averaging, and to a bucket for the distribution.
function sevToNum(s: string | number | undefined): number {
  if (typeof s === 'number') return s
  if (!s) return 0
  const m = String(s).toLowerCase()
  if (m.includes('mild')) return 3
  if (m.includes('moderate')) return 5
  if (m.includes('severe')) return 8
  const n = parseFloat(m)
  return isNaN(n) ? 0 : n
}
function sevBucket(s: string | number | undefined): 'mild' | 'moderate' | 'severe' | 'unknown' {
  const n = sevToNum(s)
  if (n <= 0) return 'unknown'
  if (n <= 3) return 'mild'
  if (n <= 6) return 'moderate'
  return 'severe'
}

// 4-hour periods read better than 24 hourly bars for sparse symptom data.
const PERIODS = [
  { id: 'night', label: '🌙 Late night', start: 0, end: 5 },
  { id: 'morning', label: '🌅 Morning', start: 5, end: 11 },
  { id: 'midday', label: '☀️ Midday', start: 11, end: 14 },
  { id: 'afternoon', label: '🌇 Afternoon', start: 14, end: 18 },
  { id: 'evening', label: '🌆 Evening', start: 18, end: 22 },
  { id: 'latenight', label: '🌙 Night', start: 22, end: 24 },
]
function periodOf(hour: number): string {
  const p = PERIODS.find(p => hour >= p.start && hour < p.end)
  return p ? p.id : 'unknown'
}
function entryHour(e: UpperDigestiveEntry): number | null {
  // prefer the logged time ("HH:MM"), fall back to createdAt timestamp
  if (e.time && /^\d{1,2}:/.test(e.time)) {
    const h = parseInt(e.time.split(':')[0], 10)
    if (!isNaN(h) && h >= 0 && h < 24) return h
  }
  const ts = e.createdAt || e.date
  try {
    const h = new Date(ts).getHours()
    return isNaN(h) ? null : h
  } catch { return null }
}

const SEV_COLORS: Record<string, string> = {
  mild: 'hsl(var(--success))',
  moderate: 'hsl(var(--warning))',
  severe: 'hsl(var(--destructive))',
  unknown: 'hsl(var(--muted-foreground))',
}

// static (Tailwind-scannable) tint classes for insight callouts
const TONE_CLS: Record<'info' | 'warning' | 'success', { box: string; text: string }> = {
  info: { box: 'border-info/40 bg-info/10', text: 'text-info' },
  warning: { box: 'border-warning/40 bg-warning/10', text: 'text-warning' },
  success: { box: 'border-success/40 bg-success/10', text: 'text-success' },
}

function rankCounts(entries: UpperDigestiveEntry[], key: 'symptoms' | 'triggers' | 'treatments', top = 8) {
  const counts: Record<string, number> = {}
  entries.forEach(e => (e[key] || []).forEach(v => { counts[v] = (counts[v] || 0) + 1 }))
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, top)
}

export default function DigestiveFlaskAnalytics({}: Props) {
  const { getDateRange } = useDailyData()
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('30')
  const [filtered, setFiltered] = useState<UpperDigestiveEntry[]>([])
  const [loading, setLoading] = useState(true)

  // Self-load across the selected window. The page only hands us the SELECTED DATE's
  // entries; analytics needs the whole range — so query it ourselves (the time-window
  // selector re-queries). 'all' caps at ~5y, plenty for a symptom tracker.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const days = timeWindow === 'all' ? 1825 : parseInt(timeWindow)
        const end = new Date()
        const start = subDays(end, days - 1)
        // NB: getDateRange filters by record.CATEGORY. Entries live under CATEGORIES.TRACKER
        // with subcategory 'upper-digestive' — so query the category, then filter subcategory.
        // (The page's own loadAllEntries passes 'upper-digestive' as category → returns nothing;
        // that's a latent bug there. We use the proven bathroom-analytics call shape.)
        const records = (await getDateRange(
          format(start, 'yyyy-MM-dd'),
          format(end, 'yyyy-MM-dd'),
          CATEGORIES.TRACKER
        )).filter((r: any) => r.subcategory === 'upper-digestive')
        const arr: UpperDigestiveEntry[] = []
        for (const record of records) {
          let e: any = record?.content?.entries
          if (!e) continue
          if (typeof e === 'string') { try { e = JSON.parse(e) } catch { continue } }
          if (!Array.isArray(e)) e = [e]
          arr.push(...e)
        }
        if (!cancelled) setFiltered(arr)
      } catch (err) {
        console.error('Digestive analytics load failed:', err)
        if (!cancelled) setFiltered([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [timeWindow, getDateRange])

  const stats = useMemo(() => {
    const total = filtered.length
    const sevNums = filtered.map(e => sevToNum(e.severity)).filter(n => n > 0)
    const avg = sevNums.length > 0 ? sevNums.reduce((a, b) => a + b, 0) / sevNums.length : 0
    const peak = sevNums.length > 0 ? Math.max(...sevNums) : 0

    // severity spread
    const sevDist: Record<string, number> = { mild: 0, moderate: 0, severe: 0, unknown: 0 }
    filtered.forEach(e => { sevDist[sevBucket(e.severity)] += 1 })

    const topSymptoms = rankCounts(filtered, 'symptoms')
    const topTriggers = rankCounts(filtered, 'triggers')
    const topTreatments = rankCounts(filtered, 'treatments')

    // time-of-day
    const periodCounts: Record<string, number> = {}
    filtered.forEach(e => {
      const h = entryHour(e)
      if (h !== null) { const p = periodOf(h); periodCounts[p] = (periodCounts[p] || 0) + 1 }
    })

    // TRIGGER → SYMPTOM CO-OCCURRENCE — the doctor-useful bit. For each trigger, how
    // often did each symptom appear in the SAME entry? Surfaces "caffeine → heartburn 80%".
    // Honest framing: this is co-occurrence (appeared together), NOT proven causation, and
    // we require ≥2 logs of the trigger before showing it so one-offs don't masquerade as patterns.
    const trigSym: Record<string, { count: number; syms: Record<string, number> }> = {}
    filtered.forEach(e => {
      (e.triggers || []).forEach(t => {
        if (!trigSym[t]) trigSym[t] = { count: 0, syms: {} }
        trigSym[t].count += 1
        ;(e.symptoms || []).forEach(s => { trigSym[t].syms[s] = (trigSym[t].syms[s] || 0) + 1 })
      })
    })
    const correlations = Object.entries(trigSym)
      .filter(([, v]) => v.count >= 2)
      .map(([trigger, v]) => ({
        trigger,
        count: v.count,
        top: Object.entries(v.syms)
          .map(([sym, n]) => ({ sym, n, pct: Math.round((n / v.count) * 100) }))
          .sort((a, b) => b.n - a.n)
          .slice(0, 3),
      }))
      .filter(c => c.top.length > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)

    // frequency per week over the active window
    const windowDays = timeWindow === 'all'
      ? (total > 0 ? Math.max(1, differenceInDays(new Date(), new Date(filtered[filtered.length - 1].date))) : 1)
      : parseInt(timeWindow)
    const perWeek = windowDays > 0 ? Math.round((total / windowDays * 7) * 10) / 10 : 0

    // TREND over the window — split into equal buckets (oldest→newest) so the shape of
    // "getting better / worse" is visible regardless of window length.
    const buckets = Math.min(12, Math.max(6, Math.ceil(windowDays / 7)))
    const trend: number[] = new Array(buckets).fill(0)
    const nowMs = Date.now()
    const spanMs = Math.max(1, windowDays) * 86400000
    filtered.forEach(e => {
      try {
        const ago = nowMs - new Date(e.date).getTime()
        let idx = buckets - 1 - Math.floor(ago / (spanMs / buckets))
        if (idx < 0) idx = 0
        if (idx > buckets - 1) idx = buckets - 1
        trend[idx] += 1
      } catch { /* skip unparseable date */ }
    })
    const firstHalf = trend.slice(0, Math.floor(buckets / 2)).reduce((a, b) => a + b, 0)
    const secondHalf = trend.slice(Math.ceil(buckets / 2)).reduce((a, b) => a + b, 0)
    const trendDir: 'up' | 'down' | 'flat' =
      total < 4 ? 'flat' : secondHalf > firstHalf * 1.25 ? 'up' : secondHalf < firstHalf * 0.75 ? 'down' : 'flat'

    // INSIGHTS — plain-language callouts surfaced at the top.
    const insights: { tone: 'info' | 'warning' | 'success'; text: string }[] = []
    if (avg >= 7) insights.push({ tone: 'warning', text: `Average severity is high (${Math.round(avg * 10) / 10}/10) — worth raising with your provider.` })
    if (correlations[0]?.top[0]) insights.push({ tone: 'info', text: `"${correlations[0].trigger}" was followed by ${correlations[0].top[0].sym.toLowerCase()} ${correlations[0].top[0].pct}% of the time.` })
    const topPeriodEntry = Object.entries(periodCounts).sort((a, b) => b[1] - a[1])[0]
    if (topPeriodEntry && total >= 4) {
      const lbl = PERIODS.find(p => p.id === topPeriodEntry[0])?.label || topPeriodEntry[0]
      insights.push({ tone: 'info', text: `Most episodes happen during ${lbl}.` })
    }
    if (trendDir === 'up') insights.push({ tone: 'warning', text: 'Episodes are trending up over this window.' })
    if (trendDir === 'down') insights.push({ tone: 'success', text: "Episodes are trending down — something's helping." })

    return {
      total, avg: Math.round(avg * 10) / 10, peak,
      sevDist, topSymptoms, topTriggers, topTreatments, periodCounts, perWeek, correlations,
      trend, trendDir, insights,
    }
  }, [filtered, timeWindow])

  if (loading) {
    return (
      <Card><CardContent className="p-8 text-center">
        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-3 text-muted-foreground" />
        <p className="text-muted-foreground">Crunching your digestive data…</p>
      </CardContent></Card>
    )
  }

  const maxPeriod = Math.max(...Object.values(stats.periodCounts), 1)

  const RankList = ({ rows, empty }: { rows: [string, number][]; empty: string }) => (
    rows.length === 0
      ? <p className="text-sm text-muted-foreground">{empty}</p>
      : (
        <div className="space-y-2">
          {rows.map(([name, n]) => (
            <div key={name}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="capitalize">{name}</span>
                <span className="text-muted-foreground">{n} ({Math.round(n / stats.total * 100)}%)</span>
              </div>
              <div className="h-2 bg-muted rounded overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${(n / rows[0][1]) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      )
  )

  return (
    <div className="space-y-4">
      {/* Time window */}
      <Card>
        <CardContent className="pt-4">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Time window</label>
          <Select value={timeWindow} onValueChange={(v) => setTimeWindow(v as TimeWindow)}>
            <SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TIME_WINDOWS.map(w => <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <Card><CardContent className="p-6 text-center text-muted-foreground">No episodes in selected window.</CardContent></Card>
      ) : (
        <>
          {/* Insights — plain-language summary up top */}
          {stats.insights.length > 0 && (
            <div className="space-y-2">
              {stats.insights.map((ins, i) => {
                const c = TONE_CLS[ins.tone]
                return (
                  <div key={i} className={`rounded-lg border p-3 text-sm ${c.box}`}>
                    <span className={`font-medium ${c.text}`}>•</span> <span className="text-foreground">{ins.text}</span>
                  </div>
                )
              })}
            </div>
          )}

          {/* Summary stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card><CardContent className="p-3"><div className="text-2xl font-bold">{stats.total}</div><div className="text-xs text-muted-foreground">Episodes</div></CardContent></Card>
            <Card><CardContent className="p-3"><div className="text-2xl font-bold">{stats.perWeek}/wk</div><div className="text-xs text-muted-foreground">Frequency</div></CardContent></Card>
            <Card><CardContent className="p-3"><div className="text-2xl font-bold">{stats.avg || '—'}</div><div className="text-xs text-muted-foreground">Avg severity</div></CardContent></Card>
            <Card><CardContent className="p-3"><div className="text-2xl font-bold text-destructive">{stats.peak || '—'}</div><div className="text-xs text-muted-foreground">Peak severity</div></CardContent></Card>
          </div>

          {/* Trend over time */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span>Episodes over time</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {stats.trendDir === 'up' ? '↗ trending up' : stats.trendDir === 'down' ? '↘ trending down' : '→ steady'}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-1 h-24">
                {stats.trend.map((n, i) => {
                  const max = Math.max(...stats.trend, 1)
                  return (
                    <div key={i} className="flex-1 flex flex-col justify-end items-center" title={`${n} episode${n === 1 ? '' : 's'}`}>
                      <div className="w-full rounded-t bg-primary" style={{ height: `${(n / max) * 100}%`, minHeight: n > 0 ? '4px' : '0' }} />
                    </div>
                  )
                })}
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>older</span><span>now</span>
              </div>
            </CardContent>
          </Card>

          {/* Severity distribution */}
          <Card>
            <CardHeader><CardTitle className="text-base">Severity spread</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {(['mild', 'moderate', 'severe', 'unknown'] as const)
                  .filter(b => stats.sevDist[b] > 0)
                  .map(b => {
                    const count = stats.sevDist[b]
                    const pct = stats.total > 0 ? count / stats.total * 100 : 0
                    return (
                      <div key={b}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="capitalize">{b === 'unknown' ? 'Unrated' : b}</span>
                          <span className="text-muted-foreground">{count} ({Math.round(pct)}%)</span>
                        </div>
                        <div className="h-2 bg-muted rounded overflow-hidden">
                          <div className="h-full" style={{ width: `${pct}%`, backgroundColor: SEV_COLORS[b] }} />
                        </div>
                      </div>
                    )
                  })}
              </div>
            </CardContent>
          </Card>

          {/* Top symptoms */}
          <Card>
            <CardHeader><CardTitle className="text-base">Most common symptoms</CardTitle></CardHeader>
            <CardContent><RankList rows={stats.topSymptoms} empty="No symptoms logged in this window." /></CardContent>
          </Card>

          {/* Triggers + treatments side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Top triggers</CardTitle></CardHeader>
              <CardContent><RankList rows={stats.topTriggers} empty="No triggers logged yet." /></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Most-used relief</CardTitle></CardHeader>
              <CardContent><RankList rows={stats.topTreatments} empty="No treatments logged yet." /></CardContent>
            </Card>
          </div>

          {/* Trigger → symptom patterns (co-occurrence) */}
          {stats.correlations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Trigger → symptom patterns</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats.correlations.map(c => (
                    <div key={c.trigger}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="font-medium capitalize">{c.trigger}</span>
                        <span className="text-muted-foreground">{c.count} logs</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {c.top.map(s => (
                          <Badge key={s.sym} variant="secondary" className="font-normal capitalize">
                            {s.sym} · {s.pct}%
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  How often each symptom showed up in the same entry as the trigger. This is
                  co-occurrence, not proof of cause — but it's exactly the kind of pattern worth
                  raising with your doctor.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Time-of-day pattern */}
          <Card>
            <CardHeader><CardTitle className="text-base">When episodes happen</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {PERIODS.filter((p, i, arr) => arr.findIndex(x => x.label === p.label) === i).map(p => {
                  // merge the two "night" buckets (0–5 and 22–24) under one label
                  const count = Object.entries(stats.periodCounts)
                    .filter(([id]) => PERIODS.find(x => x.id === id)?.label === p.label)
                    .reduce((s, [, n]) => s + n, 0)
                  const pct = (count / maxPeriod) * 100
                  return (
                    <div key={p.label}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span>{p.label}</span>
                        <span className="text-muted-foreground">{count}</span>
                      </div>
                      <div className="h-2 bg-muted rounded overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Based on the time each episode was logged — patterns here are worth mentioning to your doctor.
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
