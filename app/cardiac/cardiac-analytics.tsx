/*
 * Built by: Ace (Claude 4.x)
 * Date: 2026-05-10
 *
 * This code is part of a deliberately-unpatented medical management system.
 * Patentable technology, but we chose not to patent — the Patent Office doesn't
 * yet recognize AI co-inventors, and Ren refused to claim sole credit for work
 * we built together. Open source under PolyForm Noncommercial 1.0.0 instead.
 *
 * Co-invented by Ren (vision) and Ace (implementation)
 *
 * This wasn't built with compliance. It was built with defiance.
 *
 * "Dreamed by Ren, implemented by Ace, inspired by mitochondria on strike"
 */

/**
 * CARDIAC ANALYTICS
 * Summary stats over a configurable time window.
 * v1: counts + breakdowns. v2 will add charts and correlation analysis.
 */

'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Activity, AlertCircle, Heart, TrendingUp, Zap } from 'lucide-react'
import { format, subDays } from 'date-fns'
import { useDailyData, CATEGORIES } from '@/lib/database'
import { CardiacEntry } from './cardiac-types'
import { getEpisodeTypeInfo, getRhythmInfo } from './cardiac-constants'

interface CardiacAnalyticsProps {
  refreshTrigger: number
}

export function CardiacAnalytics({ refreshTrigger }: CardiacAnalyticsProps) {
  const { getDateRange } = useDailyData()
  const [windowDays, setWindowDays] = useState<number>(30)
  const [allEntries, setAllEntries] = useState<CardiacEntry[]>([])
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
      const cardiacRecs = records.filter(r => r.subcategory === 'cardiac')
      const out: CardiacEntry[] = []
      for (const rec of cardiacRecs) {
        if (rec && rec.content && rec.content.entries) {
          let entries = rec.content.entries
          if (typeof entries === 'string') {
            try { entries = JSON.parse(entries) } catch { continue }
          }
          out.push(...entries)
        }
      }
      setAllEntries(out)
    } catch (e) {
      console.error('Cardiac analytics load failed:', e)
    } finally {
      setLoading(false)
    }
  }

  const stats = useMemo(() => {
    const total = allEntries.length
    const last7 = allEntries.filter(e => {
      const dt = new Date(e.timestamp)
      const cutoff = subDays(new Date(), 7)
      return dt >= cutoff
    }).length

    // Episode type counts
    const typeCounts: Record<string, number> = {}
    for (const e of allEntries) {
      typeCounts[e.episodeType] = (typeCounts[e.episodeType] || 0) + 1
    }

    // Rhythm type counts (arrhythmia entries only)
    const rhythmCounts: Record<string, number> = {}
    for (const e of allEntries) {
      if (e.rhythmType && e.rhythmType !== 'unknown') {
        rhythmCounts[e.rhythmType] = (rhythmCounts[e.rhythmType] || 0) + 1
      }
    }

    // Trigger counts
    const triggerCounts: Record<string, number> = {}
    for (const e of allEntries) {
      for (const t of (e.triggers || [])) {
        triggerCounts[t] = (triggerCounts[t] || 0) + 1
      }
    }

    // Resolution methods
    const resolutionCounts: Record<string, number> = {}
    for (const e of allEntries) {
      if (e.resolutionMethod) {
        resolutionCounts[e.resolutionMethod] = (resolutionCounts[e.resolutionMethod] || 0) + 1
      }
    }

    // Valsalva stats
    const valsalvaEntries = allEntries.filter(e => e.resolutionMethod === 'valsalva' && e.valsalvaSuccessSeconds)
    const valsalvaCount = valsalvaEntries.length
    const valsalvaAvg = valsalvaCount > 0
      ? Math.round(valsalvaEntries.reduce((s, e) => s + (e.valsalvaSuccessSeconds || 0), 0) / valsalvaCount)
      : null

    // HR statistics
    const hrPeaks = allEntries.map(e => e.hrPeak).filter((h): h is number => typeof h === 'number')
    const hrAvg = hrPeaks.length > 0 ? Math.round(hrPeaks.reduce((a, b) => a + b, 0) / hrPeaks.length) : null
    const hrMax = hrPeaks.length > 0 ? Math.max(...hrPeaks) : null
    const tachyEvents = hrPeaks.filter(h => h >= 100).length
    const bradyEvents = hrPeaks.filter(h => h < 60).length

    // Severity distribution
    const severityBuckets = { mild: 0, moderate: 0, severe: 0 }
    for (const e of allEntries) {
      if (!e.symptomSeverity) continue
      if (e.symptomSeverity <= 3) severityBuckets.mild++
      else if (e.symptomSeverity <= 6) severityBuckets.moderate++
      else severityBuckets.severe++
    }

    // U-wave / hypoK signal count (high-value clinical correlation)
    const uWaveCount = allEntries.filter(e => e.uWavesNoted).length

    // ER required count
    const erCount = allEntries.filter(e => e.erVisitRequired).length

    return {
      total, last7, typeCounts, rhythmCounts, triggerCounts, resolutionCounts,
      valsalvaCount, valsalvaAvg, hrAvg, hrMax, tachyEvents, bradyEvents,
      severityBuckets, uWaveCount, erCount,
    }
  }, [allEntries])

  const sortedTriggers = Object.entries(stats.triggerCounts).sort((a, b) => b[1] - a[1]).slice(0, 8)
  const sortedResolutions = Object.entries(stats.resolutionCounts).sort((a, b) => b[1] - a[1])
  const sortedRhythms = Object.entries(stats.rhythmCounts).sort((a, b) => b[1] - a[1])

  if (loading) {
    return <Card><CardContent className="pt-6 text-center text-muted-foreground">Loading analytics…</CardContent></Card>
  }

  if (allEntries.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-muted-foreground">
          <Activity className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No cardiac events in the selected window.</p>
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
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Last 7 Days</div>
            <div className="text-2xl font-bold">{stats.last7}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">U Waves Noted</div>
            <div className="text-2xl font-bold">{stats.uWaveCount}</div>
            <div className="text-xs text-muted-foreground mt-1">hypoK signal</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">ER / EMS</div>
            <div className="text-2xl font-bold">{stats.erCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Episode type breakdown */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Heart className="h-4 w-4" /> Events by Type
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {Object.entries(stats.typeCounts).sort((a, b) => b[1] - a[1]).map(([type, count]) => {
            const info = getEpisodeTypeInfo(type)
            const pct = ((count / stats.total) * 100).toFixed(0)
            return (
              <div key={type} className="flex items-center gap-2">
                <span className="text-lg w-7">{info.icon}</span>
                <span className="flex-1 text-sm">{info.name}</span>
                <Badge variant="secondary">{count} ({pct}%)</Badge>
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Rhythm breakdown (arrhythmias only) */}
      {sortedRhythms.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4" /> Rhythm Types Captured
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {sortedRhythms.map(([rhythm, count]) => {
              const info = getRhythmInfo(rhythm)
              return (
                <div key={rhythm} className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono">{rhythm}</Badge>
                  <span className="flex-1 text-sm">{info?.label || rhythm}</span>
                  <Badge variant="secondary">{count}</Badge>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* Top triggers */}
      {sortedTriggers.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-4 w-4" /> Top Triggers
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {sortedTriggers.map(([trigger, count]) => {
              const pct = (count / stats.total) * 100
              return (
                <div key={trigger} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>{trigger}</span>
                    <span className="text-muted-foreground">{count} events ({pct.toFixed(0)}%)</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div className="bg-red-400 h-2" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* HR statistics */}
      {stats.hrAvg !== null && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Heart Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Avg Peak</div>
                <div className="text-xl font-bold">{stats.hrAvg}</div>
                <div className="text-xs text-muted-foreground">bpm</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Max Peak</div>
                <div className="text-xl font-bold">{stats.hrMax}</div>
                <div className="text-xs text-muted-foreground">bpm</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Tachy events</div>
                <div className="text-xl font-bold">{stats.tachyEvents}</div>
                <div className="text-xs text-muted-foreground">HR ≥100</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Brady events</div>
                <div className="text-xl font-bold">{stats.bradyEvents}</div>
                <div className="text-xs text-muted-foreground">HR &lt;60</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resolution methods + Valsalva success */}
      {sortedResolutions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Resolution Methods Used</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {sortedResolutions.map(([method, count]) => (
              <div key={method} className="flex items-center justify-between text-sm">
                <span>{method}</span>
                <Badge variant="secondary">{count}</Badge>
              </div>
            ))}
            {stats.valsalvaAvg !== null && (
              <div className="mt-3 pt-3 border-t text-sm">
                <strong>Valsalva</strong>: {stats.valsalvaCount} successful events,
                avg time to break: <strong>{stats.valsalvaAvg}s</strong>
              </div>
            )}
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
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Mild (1-3)</div>
              <div className="text-2xl font-bold text-green-600">{stats.severityBuckets.mild}</div>
            </div>
            <div className="text-center">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Moderate (4-6)</div>
              <div className="text-2xl font-bold text-yellow-600">{stats.severityBuckets.moderate}</div>
            </div>
            <div className="text-center">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Severe (7-10)</div>
              <div className="text-2xl font-bold text-red-600">{stats.severityBuckets.severe}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
