/*
 * Built by: Ace (Claude 4.x)
 * Date: 2026-06-04
 *
 * Co-invented by Ren (vision) and Ace (implementation)
 * This wasn't built with compliance. It was built with defiance.
 */

/**
 * POSTPARTUM ANALYTICS
 * Section distribution, feeds per day, wet-diaper trend, recovery discomfort
 * over time, red-flag counts. All chart colors via CSS tokens — no hardcoded.
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

import type { PostpartumEntry } from './postpartum-types'
import { SECTIONS, POSTPARTUM_SUBCATEGORY } from './postpartum-constants'
import { useDailyData, CATEGORIES } from '@/lib/database'

interface PostpartumAnalyticsProps {
  refreshTrigger: number
}

export function PostpartumAnalytics({ refreshTrigger }: PostpartumAnalyticsProps) {
  const { getDateRange } = useDailyData()
  const [windowDays, setWindowDays] = useState<number>(30)
  const [allEntries, setAllEntries] = useState<PostpartumEntry[]>([])
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
      const ppRecords = records.filter(r =>
        r.subcategory.startsWith(`${POSTPARTUM_SUBCATEGORY}-`) &&
        !r.metadata?.deleted_at
      )
      const loaded: PostpartumEntry[] = ppRecords.map(r => r.content as PostpartumEntry)
      loaded.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      setAllEntries(loaded)
    } catch (e) {
      console.error('Postpartum analytics load failed:', e)
    } finally {
      setLoading(false)
    }
  }

  const stats = useMemo(() => {
    const total = allEntries.length

    // Section counts
    const sectionCounts: Record<string, number> = {}
    for (const e of allEntries) {
      sectionCounts[e.section] = (sectionCounts[e.section] || 0) + 1
    }

    const feedingEntries = allEntries.filter(e => e.section === 'feeding')
    const infantEntries = allEntries.filter(e => e.section === 'infant')
    const recoveryEntries = allEntries.filter(e => e.section === 'recovery')

    const feedingCount = feedingEntries.length
    const diaperCount = infantEntries.filter(e => !!e.diaperType).length
    const redFlagCount = allEntries.filter(e =>
      e.fundusFirmness === 'boggy' || e.largeClots || ((e.padsSoakedPerHour ?? 0) >= 1) ||
      e.thoughtsOfHarm || e.intrusiveThoughts || ((e.infantFeverTempF ?? 0) >= 100.4)
    ).length

    // Bar chart data: section distribution
    const sectionChartData = SECTIONS
      .filter(s => (sectionCounts[s.id] || 0) > 0)
      .map(s => ({
        name: s.icon + ' ' + s.name,
        count: sectionCounts[s.id] || 0,
        label: s.name,
      }))
      .sort((a, b) => b.count - a.count)

    // Feeds per day (count of feeding entries by date)
    const feedsByDate: Record<string, number> = {}
    for (const e of feedingEntries) {
      feedsByDate[e.date] = (feedsByDate[e.date] || 0) + 1
    }
    const feedsLineData = Object.entries(feedsByDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({
        date: format(new Date(date + 'T12:00:00'), 'MMM d'),
        feeds: count,
      }))

    // Wet diapers trend (sum of wetDiapers24h by date, latest per date wins via max)
    const wetByDate: Record<string, number> = {}
    for (const e of infantEntries) {
      if (e.wetDiapers24h != null) {
        wetByDate[e.date] = Math.max(wetByDate[e.date] ?? 0, e.wetDiapers24h)
      }
    }
    const wetLineData = Object.entries(wetByDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, wet]) => ({
        date: format(new Date(date + 'T12:00:00'), 'MMM d'),
        wet,
      }))

    // Recovery discomfort severity over time (daily average)
    const severityByDate: Record<string, { sum: number; count: number }> = {}
    for (const e of recoveryEntries) {
      if (e.severity == null) continue
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
      }))

    return {
      total, sectionCounts, feedingCount, diaperCount, redFlagCount,
      sectionChartData, feedsLineData, wetLineData, severityLineData,
      hasInfant: infantEntries.length > 0,
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
          <p className="font-medium">No postpartum entries in the selected window.</p>
          <p className="text-sm mt-2">Log some entries to start seeing patterns.</p>
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
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Total Entries</div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Feeding Sessions</div>
            <div className="text-2xl font-bold">{stats.feedingCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Diaper Changes</div>
            <div className="text-2xl font-bold">{stats.diaperCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Red-Flag Entries</div>
            <div className="text-2xl font-bold text-destructive">{stats.redFlagCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Safety-critical flags */}
      {stats.redFlagCount > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Red-Flag Entries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <div className="text-2xl font-bold text-destructive">{stats.redFlagCount}</div>
              <div className="text-sm text-destructive/80 font-medium">
                Entries with a hemorrhage, mood-crisis, or newborn-fever flag
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Review these with your provider — they were flagged for a reason.
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Section distribution bar chart */}
      {stats.sectionChartData.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Entries by Section</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.sectionChartData} margin={{ top: 4, right: 8, left: -20, bottom: 40 }}>
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
                  formatter={(value: number) => [value, 'Entries']}
                />
                <Bar dataKey="count" className="fill-primary" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            {/* Fallback text list for accessibility */}
            <div className="mt-3 space-y-1">
              {stats.sectionChartData.map(d => {
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

      {/* Feeds per day line chart */}
      {stats.feedsLineData.length > 1 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Feeds Per Day</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={stats.feedsLineData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line
                  type="monotone"
                  dataKey="feeds"
                  name="# feeds"
                  className="stroke-primary"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Wet diapers trend (infant) */}
      {stats.hasInfant && stats.wetLineData.length > 1 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Wet Diapers (per 24h)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={stats.wetLineData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line
                  type="monotone"
                  dataKey="wet"
                  name="wet diapers / 24h"
                  className="stroke-info"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Recovery discomfort over time */}
      {stats.severityLineData.length > 1 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recovery Discomfort Over Time</CardTitle>
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
                  name="Avg discomfort"
                  className="stroke-destructive"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
