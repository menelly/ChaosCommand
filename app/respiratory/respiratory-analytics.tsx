/*
 * Built by: Ace (Claude 4.x) — 2026-05-10
 * Co-invented by Ren (vision) and Ace (implementation)
 */

'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Wind, AlertCircle, TrendingDown } from 'lucide-react'
import { format, subDays } from 'date-fns'
import { useDailyData, CATEGORIES } from '@/lib/database'
import { RespiratoryEntry } from './respiratory-types'
import { getEpisodeTypeInfo } from './respiratory-constants'

export function RespiratoryAnalytics({ refreshTrigger }: { refreshTrigger: number }) {
  const { getDateRange } = useDailyData()
  const [windowDays, setWindowDays] = useState(30)
  const [allEntries, setAllEntries] = useState<RespiratoryEntry[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => { load() }, [windowDays, refreshTrigger])

  const load = async () => {
    setLoading(true)
    try {
      const today = format(new Date(), 'yyyy-MM-dd')
      const start = format(subDays(new Date(), windowDays), 'yyyy-MM-dd')
      const records = await getDateRange(start, today, CATEGORIES.TRACKER)
      const recs = records.filter(r => r.subcategory === 'respiratory')
      const out: RespiratoryEntry[] = []
      for (const rec of recs) {
        if (rec?.content?.entries) {
          let entries = rec.content.entries
          if (typeof entries === 'string') { try { entries = JSON.parse(entries) } catch { continue } }
          out.push(...entries)
        }
      }
      setAllEntries(out)
    } catch (e) { console.error('Analytics load fail:', e) } finally { setLoading(false) }
  }

  const stats = useMemo(() => {
    const total = allEntries.length
    const last7 = allEntries.filter(e => new Date(e.timestamp) >= subDays(new Date(), 7)).length

    const typeCounts: Record<string, number> = {}
    for (const e of allEntries) typeCounts[e.episodeType] = (typeCounts[e.episodeType] || 0) + 1

    const triggerCounts: Record<string, number> = {}
    for (const e of allEntries) for (const t of (e.triggers || [])) triggerCounts[t] = (triggerCounts[t] || 0) + 1

    const peakFlowReadings = allEntries.map(e => e.peakFlowReading).filter((v): v is number => typeof v === 'number')
    const pfMin = peakFlowReadings.length ? Math.min(...peakFlowReadings) : null
    const pfAvg = peakFlowReadings.length ? Math.round(peakFlowReadings.reduce((a, b) => a + b, 0) / peakFlowReadings.length) : null

    const spo2Lows = allEntries.map(e => e.spo2Lowest).filter((v): v is number => typeof v === 'number')
    const spo2Min = spo2Lows.length ? Math.min(...spo2Lows) : null
    const spo2Avg = spo2Lows.length ? Math.round(spo2Lows.reduce((a, b) => a + b, 0) / spo2Lows.length) : null
    const desatEvents = spo2Lows.filter(v => v < 92).length

    const inhalerSuccessRate = allEntries.filter(e => e.inhalerUsed && e.inhalerResponse !== undefined).map(e => e.inhalerResponse as number)
    const inhalerAvg = inhalerSuccessRate.length ? (inhalerSuccessRate.reduce((a, b) => a + b, 0) / inhalerSuccessRate.length).toFixed(1) : null

    const erCount = allEntries.filter(e => e.erVisitRequired).length
    const epiCount = allEntries.filter(e => e.epinephrineGiven).length
    const redZoneCount = allEntries.filter(e => e.peakFlowZone === 'red').length

    // TRIGGER → symptom correlation. For each trigger logged ≥2×: avg severity of those
    // events + the symptoms that co-occurred. Co-occurrence, NOT proven cause.
    const trigStats: Record<string, { count: number; sevSum: number; syms: Record<string, number> }> = {}
    for (const e of allEntries) {
      for (const t of (e.triggers || [])) {
        if (!trigStats[t]) trigStats[t] = { count: 0, sevSum: 0, syms: {} }
        trigStats[t].count += 1
        trigStats[t].sevSum += (e.severity || 0)
        for (const s of (e.symptoms || [])) trigStats[t].syms[s] = (trigStats[t].syms[s] || 0) + 1
      }
    }
    const correlations = Object.entries(trigStats)
      .filter(([, v]) => v.count >= 2)
      .map(([trigger, v]) => ({
        trigger,
        count: v.count,
        avgSeverity: Math.round((v.sevSum / v.count) * 10) / 10,
        top: Object.entries(v.syms)
          .map(([sym, n]) => ({ label: sym, n, pct: Math.round((n / v.count) * 100) }))
          .sort((a, b) => b.n - a.n)
          .slice(0, 3),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)

    return { total, last7, typeCounts, triggerCounts, pfMin, pfAvg, spo2Min, spo2Avg, desatEvents, inhalerAvg, erCount, epiCount, redZoneCount, correlations }
  }, [allEntries])

  const sortedTriggers = Object.entries(stats.triggerCounts).sort((a, b) => b[1] - a[1]).slice(0, 8)

  if (loading) return <Card><CardContent className="pt-6 text-center text-muted-foreground">Loading analytics…</CardContent></Card>
  if (allEntries.length === 0) return (
    <Card><CardContent className="pt-6 text-center text-muted-foreground">
      <Wind className="h-12 w-12 mx-auto mb-3 opacity-30" />
      <p className="font-medium">No respiratory events in the selected window.</p>
    </CardContent></Card>
  )

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="pt-4 pb-4"><div className="text-xs uppercase text-muted-foreground">Total Events</div><div className="text-2xl font-bold">{stats.total}</div></CardContent></Card>
        <Card><CardContent className="pt-4 pb-4"><div className="text-xs uppercase text-muted-foreground">Last 7 Days</div><div className="text-2xl font-bold">{stats.last7}</div></CardContent></Card>
        <Card><CardContent className="pt-4 pb-4"><div className="text-xs uppercase text-muted-foreground">Red Zone PF</div><div className="text-2xl font-bold text-red-600">{stats.redZoneCount}</div></CardContent></Card>
        <Card><CardContent className="pt-4 pb-4"><div className="text-xs uppercase text-muted-foreground">EpiPen / ER</div><div className="text-2xl font-bold">{stats.epiCount + stats.erCount}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Wind className="h-4 w-4" /> Events by Type</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {Object.entries(stats.typeCounts).sort((a, b) => b[1] - a[1]).map(([type, count]) => {
            const info = getEpisodeTypeInfo(type)
            const pct = ((count / stats.total) * 100).toFixed(0)
            return <div key={type} className="flex items-center gap-2"><span className="text-lg w-7">{info.icon}</span><span className="flex-1 text-sm">{info.name}</span><Badge variant="secondary">{count} ({pct}%)</Badge></div>
          })}
        </CardContent>
      </Card>

      {(stats.pfMin !== null || stats.spo2Min !== null) && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><TrendingDown className="h-4 w-4" /> Objective Measurements</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              {stats.spo2Avg !== null && <div><div className="text-xs uppercase text-muted-foreground">Avg Lowest SpO2</div><div className="text-xl font-bold">{stats.spo2Avg}%</div></div>}
              {stats.spo2Min !== null && <div><div className="text-xs uppercase text-muted-foreground">Lowest SpO2 Recorded</div><div className="text-xl font-bold text-red-600">{stats.spo2Min}%</div></div>}
              {stats.pfAvg !== null && <div><div className="text-xs uppercase text-muted-foreground">Avg Peak Flow</div><div className="text-xl font-bold">{stats.pfAvg} L/min</div></div>}
              {stats.pfMin !== null && <div><div className="text-xs uppercase text-muted-foreground">Lowest Peak Flow</div><div className="text-xl font-bold text-red-600">{stats.pfMin} L/min</div></div>}
              {stats.desatEvents > 0 && <div><div className="text-xs uppercase text-muted-foreground">Desat Events (&lt;92%)</div><div className="text-xl font-bold">{stats.desatEvents}</div></div>}
              {stats.inhalerAvg !== null && <div><div className="text-xs uppercase text-muted-foreground">Avg Inhaler Response</div><div className="text-xl font-bold">{stats.inhalerAvg}/5</div></div>}
            </div>
          </CardContent>
        </Card>
      )}

      {sortedTriggers.length > 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><AlertCircle className="h-4 w-4" /> Top Triggers</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {sortedTriggers.map(([t, c]) => {
              const pct = (c / stats.total) * 100
              return (
                <div key={t} className="space-y-1">
                  <div className="flex items-center justify-between text-sm"><span>{t}</span><span className="text-muted-foreground">{c} events ({pct.toFixed(0)}%)</span></div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden"><div className="bg-blue-400 h-2" style={{ width: `${pct}%` }} /></div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* Trigger → symptom patterns */}
      {stats.correlations.length > 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Trigger → symptom patterns</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.correlations.map(c => (
                <div key={c.trigger}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium">{c.trigger}</span>
                    <span className="text-muted-foreground">{c.count} logs · avg {c.avgSeverity}/10</span>
                  </div>
                  {c.top.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {c.top.map(s => (
                        <Badge key={s.label} variant="secondary" className="font-normal">{s.label} · {s.pct}%</Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Avg severity when each trigger was present, plus the symptoms that showed up alongside it.
              Co-occurrence, not proof of cause — but worth raising with your doctor.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
