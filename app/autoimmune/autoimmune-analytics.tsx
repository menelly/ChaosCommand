/* Built by: Ace (Claude 4.x) — 2026-06-07 */
'use client'
import React, { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dna, AlertCircle } from 'lucide-react'
import { format, subDays } from 'date-fns'
import { useDailyData, CATEGORIES } from '@/lib/database'
import { AutoimmuneEntry } from './autoimmune-types'
import { getEpisodeTypeInfo } from './autoimmune-constants'

export function AutoimmuneAnalytics({ refreshTrigger }: { refreshTrigger: number }) {
  const { getDateRange } = useDailyData()
  const [windowDays, setWindowDays] = useState(30)
  const [allEntries, setAllEntries] = useState<AutoimmuneEntry[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => { load() }, [windowDays, refreshTrigger])

  const load = async () => {
    setLoading(true)
    try {
      const today = format(new Date(), 'yyyy-MM-dd')
      const start = format(subDays(new Date(), windowDays), 'yyyy-MM-dd')
      const records = await getDateRange(start, today, CATEGORIES.TRACKER)
      const recs = records.filter(r => r.subcategory === 'autoimmune')
      const out: AutoimmuneEntry[] = []
      for (const rec of recs) {
        if (rec?.content?.entries) {
          let entries = rec.content.entries
          if (typeof entries === 'string') { try { entries = JSON.parse(entries) } catch { continue } }
          out.push(...entries)
        }
      }
      setAllEntries(out)
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  const stats = useMemo(() => {
    const total = allEntries.length
    const last7 = allEntries.filter(e => new Date(e.timestamp) >= subDays(new Date(), 7)).length
    const typeCounts: Record<string, number> = {}
    for (const e of allEntries) typeCounts[e.episodeType] = (typeCounts[e.episodeType] || 0) + 1
    const areaCounts: Record<string, number> = {}
    for (const e of allEntries) for (const a of (e.affectedAreas || [])) areaCounts[a] = (areaCounts[a] || 0) + 1
    const triggerCounts: Record<string, number> = {}
    for (const e of allEntries) for (const t of (e.triggers || [])) triggerCounts[t] = (triggerCounts[t] || 0) + 1
    const treatmentCounts: Record<string, number> = {}
    for (const e of allEntries) for (const t of (e.treatments || [])) treatmentCounts[t] = (treatmentCounts[t] || 0) + 1
    const sevVals = allEntries.map(e => e.severity).filter((v): v is number => typeof v === 'number')
    const avgSeverity = sevVals.length ? Math.round((sevVals.reduce((a, b) => a + b, 0) / sevVals.length) * 10) / 10 : 0
    const erCount = allEntries.filter(e => e.erVisitRequired).length
    // Flare-burden proxy: events flagged as flaring/progressive
    const flareCount = allEntries.filter(e => (e.character || []).some(c => c.includes('flaring') || c.includes('progressive'))).length

    const trigStats: Record<string, { count: number; severitySum: number; types: Record<string, number> }> = {}
    for (const e of allEntries) {
      for (const t of (e.triggers || [])) {
        if (!trigStats[t]) trigStats[t] = { count: 0, severitySum: 0, types: {} }
        trigStats[t].count += 1
        trigStats[t].severitySum += (e.severity || 0)
        trigStats[t].types[e.episodeType] = (trigStats[t].types[e.episodeType] || 0) + 1
      }
    }
    const correlations = Object.entries(trigStats)
      .filter(([, v]) => v.count >= 2)
      .map(([trigger, v]) => ({
        trigger,
        count: v.count,
        avgSeverity: Math.round((v.severitySum / v.count) * 10) / 10,
        top: Object.entries(v.types)
          .map(([t, n]) => ({ label: getEpisodeTypeInfo(t).name, pct: Math.round((n / v.count) * 100) }))
          .sort((a, b) => b.pct - a.pct)
          .slice(0, 3),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)

    return { total, last7, typeCounts, areaCounts, triggerCounts, treatmentCounts, avgSeverity, erCount, flareCount, correlations }
  }, [allEntries])

  const sortedAreas = Object.entries(stats.areaCounts).sort((a, b) => b[1] - a[1]).slice(0, 8)
  const sortedTriggers = Object.entries(stats.triggerCounts).sort((a, b) => b[1] - a[1]).slice(0, 8)
  const sortedTreatments = Object.entries(stats.treatmentCounts).sort((a, b) => b[1] - a[1]).slice(0, 8)

  if (loading) return <Card><CardContent className="pt-6 text-center text-muted-foreground">Loading analytics…</CardContent></Card>
  if (allEntries.length === 0) return <Card><CardContent className="pt-6 text-center text-muted-foreground"><Dna className="h-12 w-12 mx-auto mb-3 opacity-30" /><p>No autoimmune events in this window.</p></CardContent></Card>

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
        <Card><CardContent className="pt-4 pb-4"><div className="text-xs uppercase text-muted-foreground">Avg Severity</div><div className="text-2xl font-bold">{stats.avgSeverity || '—'}</div></CardContent></Card>
        <Card><CardContent className="pt-4 pb-4"><div className="text-xs uppercase text-muted-foreground">Flaring Events</div><div className="text-2xl font-bold">{stats.flareCount}</div></CardContent></Card>
      </div>
      <Card><CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Dna className="h-4 w-4" /> Events by Type</CardTitle></CardHeader>
        <CardContent className="space-y-2">{Object.entries(stats.typeCounts).sort((a, b) => b[1] - a[1]).map(([t, c]) => { const i = getEpisodeTypeInfo(t); const p = ((c / stats.total) * 100).toFixed(0); return <div key={t} className="flex items-center gap-2"><span className="text-lg w-7">{i.icon}</span><span className="flex-1 text-sm">{i.name}</span><Badge variant="secondary">{c} ({p}%)</Badge></div> })}</CardContent></Card>
      {sortedAreas.length > 0 && <Card><CardHeader className="pb-3"><CardTitle className="text-base">Most Affected Areas</CardTitle></CardHeader><CardContent className="space-y-2">{sortedAreas.map(([l, c]) => <div key={l} className="flex items-center justify-between text-sm"><span>{l}</span><Badge variant="secondary">{c}</Badge></div>)}</CardContent></Card>}
      {sortedTriggers.length > 0 && <Card><CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><AlertCircle className="h-4 w-4" /> Top Suspected Triggers</CardTitle></CardHeader>
        <CardContent className="space-y-2">{sortedTriggers.map(([t, c]) => { const p = (c / stats.total) * 100; return <div key={t} className="space-y-1"><div className="flex items-center justify-between text-sm"><span>{t}</span><span className="text-muted-foreground">{c} events ({p.toFixed(0)}%)</span></div><div className="w-full bg-muted rounded-full h-2 overflow-hidden"><div className="bg-primary h-2" style={{ width: `${p}%` }} /></div></div> })}</CardContent></Card>}
      {stats.correlations.length > 0 && <Card><CardHeader className="pb-3"><CardTitle className="text-base">Trigger → symptom correlations</CardTitle></CardHeader>
        <CardContent className="space-y-3">{stats.correlations.map(c => <div key={c.trigger}>
          <div className="flex items-center justify-between text-sm mb-1"><span className="font-medium">{c.trigger}</span><span className="text-muted-foreground">{c.count} logs · avg {c.avgSeverity}/10</span></div>
          {c.top.length > 0 && <div className="flex flex-wrap gap-1.5">{c.top.map(s => <Badge key={s.label} variant="secondary" className="font-normal">{s.label} · {s.pct}%</Badge>)}</div>}
        </div>)}
        <p className="text-xs text-muted-foreground mt-3">Co-occurrence, not proof of cause — but worth raising with your rheumatologist.</p></CardContent></Card>}
      {sortedTreatments.length > 0 && <Card><CardHeader className="pb-3"><CardTitle className="text-base">Treatments / What Helped</CardTitle></CardHeader><CardContent className="space-y-2">{sortedTreatments.map(([t, c]) => <div key={t} className="flex items-center justify-between text-sm"><span>{t}</span><Badge variant="secondary">{c}</Badge></div>)}</CardContent></Card>}
    </div>
  )
}
