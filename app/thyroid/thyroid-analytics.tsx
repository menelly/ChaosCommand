/*
 * Built by: Ace (Claude 4.x)
 * Date: 2026-06-04
 *
 * Co-invented by Ren (vision) and Ace (implementation)
 * This wasn't built with compliance. It was built with defiance.
 */

/**
 * THYROID ANALYTICS
 * Episode type distribution, severity over time, hypo/hyper balance,
 * safety-critical flags. All chart colors via CSS tokens — no hardcoded colors.
 */

'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Activity, AlertTriangle } from 'lucide-react'
import { format, subDays } from 'date-fns'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend,
} from 'recharts'

import type { ThyroidEntry } from './thyroid-types'
import { EPISODE_TYPES, THYROID_SUBCATEGORY } from './thyroid-constants'
import { useDailyData, CATEGORIES } from '@/lib/database'

interface ThyroidAnalyticsProps {
  refreshTrigger: number
}

export function ThyroidAnalytics({ refreshTrigger }: ThyroidAnalyticsProps) {
  const { getDateRange } = useDailyData()
  const [windowDays, setWindowDays] = useState<number>(30)
  const [allEntries, setAllEntries] = useState<ThyroidEntry[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadAll()
  }, [windowDays, refreshTrigger])

  const loadAll = async () => {
    setLoading(true)
    try {
      const today = format(new Date(), 'yyyy-MM-dd')
      const startDate = format(subDays(new Date(), windowDays), 'yyyy-MM-dd')
      const records = await getDateRange(startDate, today, CATEGORIES.TRACKER)
      const thyroidRecords = records.filter(r =>
        r.subcategory.startsWith(`${THYROID_SUBCATEGORY}-`) &&
        !r.metadata?.deleted_at
      )
      const loaded: ThyroidEntry[] = thyroidRecords.map(r => r.content as ThyroidEntry)
      loaded.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      setAllEntries(loaded)
    } catch (e) {
      console.error('Thyroid analytics load failed:', e)
    } finally {
      setLoading(false)
    }
  }

  const stats = useMemo(() => {
    const total = allEntries.length

    // Episode type counts
    const typeCounts: Record<string, number> = {}
    for (const e of allEntries) {
      typeCounts[e.episodeType] = (typeCounts[e.episodeType] || 0) + 1
    }

    // Direction / flag counts
    const hyperCount = allEntries.filter(e => e.direction === 'hyper' || (e.hyperSymptoms?.length ?? 0) > 0).length
    const hypoCount = allEntries.filter(e => e.direction === 'hypo' || (e.hypoSymptoms?.length ?? 0) > 0).length
    const stormCount = allEntries.filter(e => e.feverPresent && e.confusionAgitation).length
    const myxedemaCount = allEntries.filter(e => e.extremeColdDrowsy).length
    const gravesEyeCount = allEntries.filter(e => e.hyperSymptoms?.includes('eye-changes')).length
    const erCount = allEntries.filter(e => e.erVisit).length

    // Severity distribution
    const severityBuckets = { mild: 0, moderate: 0, severe: 0 }
    for (const e of allEntries) {
      if (e.severity <= 3) severityBuckets.mild++
      else if (e.severity <= 6) severityBuckets.moderate++
      else severityBuckets.severe++
    }

    // Avg severity
    const avgSeverity = total > 0
      ? Math.round(allEntries.reduce((s, e) => s + e.severity, 0) / total * 10) / 10
      : 0

    // Bar chart data: episode type distribution
    const typeChartData = EPISODE_TYPES
      .filter(t => (typeCounts[t.id] || 0) > 0)
      .map(t => ({
        name: t.icon + ' ' + t.name.replace(' ', '\n'),
        count: typeCounts[t.id] || 0,
        label: t.name,
      }))
      .sort((a, b) => b.count - a.count)

    // Line chart data: severity over time (daily average)
    const severityByDate: Record<string, { sum: number; count: number }> = {}
    for (const e of allEntries) {
      const d = e.date
      if (!severityByDate[d]) severityByDate[d] = { sum: 0, count: 0 }
      severityByDate[d].sum += e.severity
      severityByDate[d].count += 1
    }
    const severityLineData = Object.entries(severityByDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, { sum, count }]) => ({
        date: format(new Date(date + 'T12:00:00'), 'MMM d'),
        severity: Math.round((sum / count) * 10) / 10,
        events: count,
      }))

    // Line chart data: TSH over time (labs trend)
    const tshLineData = allEntries
      .filter(e => e.tsh != null)
      .map(e => ({
        date: format(new Date(e.date + 'T12:00:00'), 'MMM d'),
        tsh: e.tsh as number,
      }))

    return {
      total, typeCounts, hyperCount, hypoCount, stormCount, myxedemaCount,
      gravesEyeCount, erCount, severityBuckets, avgSeverity,
      typeChartData, severityLineData, tshLineData,
    }
  }, [allEntries])

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-muted-foreground">Loading analytics…</CardContent>
      </Card>
    )
  }

  if (allEntries.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-muted-foreground">
          <Activity className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No thyroid events in the selected window.</p>
          <p className="text-sm mt-2">Log some events to start seeing patterns.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Window selector */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base">Time Window</CardTitle>
            <Select value={String(windowDays)} onValueChange={(v) => setWindowDays(parseInt(v))}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
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

      {/* Top-level counters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Total Events</div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Avg Severity</div>
            <div className="text-2xl font-bold">{stats.avgSeverity > 0 ? stats.avgSeverity : '—'}</div>
            <div className="text-xs text-muted-foreground">out of 10</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Hyper Events</div>
            <div className="text-2xl font-bold text-warning">{stats.hyperCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">ER Visits</div>
            <div className="text-2xl font-bold">{stats.erCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Safety-critical flags */}
      {(stats.stormCount > 0 || stats.myxedemaCount > 0 || stats.gravesEyeCount > 0) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Safety-Critical Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {stats.stormCount > 0 && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <div className="text-2xl font-bold text-destructive">{stats.stormCount}</div>
                  <div className="text-sm text-destructive/80 font-medium">Thyroid storm flags</div>
                  <div className="text-xs text-muted-foreground mt-1">Fever + confusion — emergency pattern</div>
                </div>
              )}
              {stats.myxedemaCount > 0 && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <div className="text-2xl font-bold text-destructive">{stats.myxedemaCount}</div>
                  <div className="text-sm text-destructive/80 font-medium">Myxedema flags</div>
                  <div className="text-xs text-muted-foreground mt-1">Extreme cold + drowsiness — emergency</div>
                </div>
              )}
              {stats.gravesEyeCount > 0 && (
                <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
                  <div className="text-2xl font-bold text-warning">{stats.gravesEyeCount}</div>
                  <div className="text-sm text-warning/80 font-medium">Graves' eye signs</div>
                  <div className="text-xs text-muted-foreground mt-1">Warrants ophthalmology referral</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Episode type distribution bar chart */}
      {stats.typeChartData.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Events by Type</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.typeChartData} margin={{ top: 4, right: 8, left: -20, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10 }}
                  angle={-35}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ fontSize: 12 }}
                  formatter={(value: number) => [value, 'Events']}
                />
                <Bar dataKey="count" className="fill-primary" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            {/* Fallback text list for accessibility */}
            <div className="mt-3 space-y-1">
              {stats.typeChartData.map(d => {
                const pct = stats.total > 0 ? ((d.count / stats.total) * 100).toFixed(0) : '0'
                return (
                  <div key={d.label} className="flex items-center justify-between text-sm">
                    <span>{d.label}</span>
                    <Badge variant="secondary">{d.count} ({pct}%)</Badge>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Severity over time line chart */}
      {stats.severityLineData.length > 1 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Severity Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={stats.severityLineData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line
                  type="monotone"
                  dataKey="severity"
                  name="Avg severity"
                  className="stroke-destructive"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="events"
                  name="# events"
                  className="stroke-primary"
                  strokeWidth={1.5}
                  strokeDasharray="4 2"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* TSH over time line chart */}
      {stats.tshLineData.length > 1 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">TSH Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={stats.tshLineData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={true} />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Line
                  type="monotone"
                  dataKey="tsh"
                  name="TSH"
                  className="stroke-primary"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Severity distribution */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Severity Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="text-center">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Mild (1–3)</div>
              <div className="text-2xl font-bold text-primary">{stats.severityBuckets.mild}</div>
            </div>
            <div className="text-center">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Moderate (4–6)</div>
              <div className="text-2xl font-bold text-warning">{stats.severityBuckets.moderate}</div>
            </div>
            <div className="text-center">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Severe (7–10)</div>
              <div className="text-2xl font-bold text-destructive">{stats.severityBuckets.severe}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
