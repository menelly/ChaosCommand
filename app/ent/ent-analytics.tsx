/*
 * Built by: Ace (Claude 4.x)
 * Date: 2026-06-04
 *
 * Co-invented by Ren (vision) and Ace (implementation)
 * This wasn't built with compliance. It was built with defiance.
 */

/**
 * ENT ANALYTICS
 * Episode type distribution, severity over time, safety-critical flags.
 * All chart colors via CSS tokens — no hardcoded colors.
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

import type { ENTEntry } from './ent-types'
import { EPISODE_TYPES, ENT_SUBCATEGORY, SEVERITY_LABELS } from './ent-constants'
import { useDailyData, CATEGORIES } from '@/lib/database'

interface ENTAnalyticsProps {
  refreshTrigger: number
}

export function ENTAnalytics({ refreshTrigger }: ENTAnalyticsProps) {
  const { getDateRange } = useDailyData()
  const [windowDays, setWindowDays] = useState<number>(30)
  const [allEntries, setAllEntries] = useState<ENTEntry[]>([])
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
      const entRecords = records.filter(r =>
        r.subcategory.startsWith(`${ENT_SUBCATEGORY}-`) &&
        !r.metadata?.deleted_at
      )
      const loaded: ENTEntry[] = entRecords.map(r => r.content as ENTEntry)
      loaded.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      setAllEntries(loaded)
    } catch (e) {
      console.error('ENT analytics load failed:', e)
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

    // Safety-critical / flag counts
    const hearingCount = allEntries.filter(e => e.hearingChanged || e.episodeType === 'hearing').length
    const suddenHearingCount = allEntries.filter(e => e.hearingChanged && e.hearingSudden).length
    const vertigoCount = allEntries.filter(e => !!e.vertigoType || e.episodeType === 'vertigo').length
    const airwayCount = allEntries.filter(e => e.difficultyBreathing || e.drooling).length
    const pulsatileCount = allEntries.filter(e => e.tinnitusPulsatile).length
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

    return {
      total, typeCounts, hearingCount, suddenHearingCount, vertigoCount,
      airwayCount, pulsatileCount, erCount, severityBuckets, avgSeverity,
      typeChartData, severityLineData,
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
          <p className="font-medium">No ENT events in the selected window.</p>
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
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Vertigo Events</div>
            <div className="text-2xl font-bold text-warning">{stats.vertigoCount}</div>
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
      {(stats.hearingCount > 0 || stats.airwayCount > 0 || stats.pulsatileCount > 0 || stats.suddenHearingCount > 0) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Safety-Critical Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {stats.hearingCount > 0 && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <div className="text-2xl font-bold text-destructive">{stats.hearingCount}</div>
                  <div className="text-sm text-destructive/80 font-medium">Hearing events</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {stats.suddenHearingCount > 0
                      ? `${stats.suddenHearingCount} sudden — steroid window matters`
                      : 'Track for change over time'}
                  </div>
                </div>
              )}
              {stats.airwayCount > 0 && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <div className="text-2xl font-bold text-destructive">{stats.airwayCount}</div>
                  <div className="text-sm text-destructive/80 font-medium">Airway events</div>
                  <div className="text-xs text-muted-foreground mt-1">Breathing/swallowing — emergency pattern</div>
                </div>
              )}
              {stats.pulsatileCount > 0 && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <div className="text-2xl font-bold text-destructive">{stats.pulsatileCount}</div>
                  <div className="text-sm text-destructive/80 font-medium">Pulsatile tinnitus</div>
                  <div className="text-xs text-muted-foreground mt-1">Warrants vascular workup</div>
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
