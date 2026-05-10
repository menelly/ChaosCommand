/* Built by: Ace (Claude 4.x) — 2026-05-10. Closes CHA-147 part 1. */
'use client'
import React, { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Bone, AlertCircle, Activity } from 'lucide-react'
import { format, subDays } from 'date-fns'
import { useDailyData, CATEGORIES } from '@/lib/database'
import { JointEntry } from './joint-types'
import { getEpisodeTypeInfo } from './joint-constants'

export function JointAnalytics({ refreshTrigger }: { refreshTrigger: number }) {
  const { getDateRange } = useDailyData()
  const [windowDays, setWindowDays] = useState(30)
  const [allEntries, setAllEntries] = useState<JointEntry[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => { load() }, [windowDays, refreshTrigger])

  const load = async () => {
    setLoading(true)
    try {
      const today = format(new Date(), 'yyyy-MM-dd')
      const start = format(subDays(new Date(), windowDays), 'yyyy-MM-dd')
      const records = await getDateRange(start, today, CATEGORIES.TRACKER)
      const recs = records.filter(r => r.subcategory === 'joint')
      const out: JointEntry[] = []
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

    const jointCounts: Record<string, number> = {}
    for (const e of allEntries) for (const j of (e.jointAffected || [])) jointCounts[j] = (jointCounts[j] || 0) + 1

    const triggerCounts: Record<string, number> = {}
    for (const e of allEntries) for (const t of (e.triggerActivity || [])) triggerCounts[t] = (triggerCounts[t] || 0) + 1

    const treatmentCounts: Record<string, number> = {}
    for (const e of allEntries) for (const t of (e.treatmentApplied || [])) treatmentCounts[t] = (treatmentCounts[t] || 0) + 1

    const treatmentResponses = allEntries.map(e => e.treatmentResponse).filter((v): v is number => typeof v === 'number')
    const avgTreatmentResponse = treatmentResponses.length ? (treatmentResponses.reduce((a, b) => a + b, 0) / treatmentResponses.length).toFixed(1) : null

    const selfReducedCount = allEntries.filter(e => e.selfReducedFlag).length
    const erCount = allEntries.filter(e => e.erVisitRequired).length
    const subluxOrDislocCount = allEntries.filter(e => e.episodeType === 'subluxation' || e.episodeType === 'dislocation').length
    const selfReducedRatio = subluxOrDislocCount > 0 ? Math.round((selfReducedCount / subluxOrDislocCount) * 100) : null

    const severityBuckets = { mild: 0, moderate: 0, severe: 0 }
    for (const e of allEntries) {
      if (!e.severity) continue
      if (e.severity <= 3) severityBuckets.mild++
      else if (e.severity <= 6) severityBuckets.moderate++
      else severityBuckets.severe++
    }

    const swellingCount = allEntries.filter(e => e.swellingPresent).length
    const bruisingCount = allEntries.filter(e => e.bruisingPresent).length

    return { total, last7, typeCounts, jointCounts, triggerCounts, treatmentCounts, avgTreatmentResponse, selfReducedCount, erCount, subluxOrDislocCount, selfReducedRatio, severityBuckets, swellingCount, bruisingCount }
  }, [allEntries])

  const sortedJoints = Object.entries(stats.jointCounts).sort((a, b) => b[1] - a[1]).slice(0, 10)
  const sortedTriggers = Object.entries(stats.triggerCounts).sort((a, b) => b[1] - a[1]).slice(0, 8)
  const sortedTreatments = Object.entries(stats.treatmentCounts).sort((a, b) => b[1] - a[1]).slice(0, 8)

  if (loading) return <Card><CardContent className="pt-6 text-center text-muted-foreground">Loading analytics…</CardContent></Card>
  if (allEntries.length === 0) return <Card><CardContent className="pt-6 text-center text-muted-foreground"><Bone className="h-12 w-12 mx-auto mb-3 opacity-30" /><p>No joint events in this window.</p></CardContent></Card>

  return (
    <div className="space-y-4">
      <Card><CardHeader className="pb-3"><div className="flex items-center justify-between"><CardTitle className="text-base">Time Window</CardTitle>
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
      </div></CardHeader></Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="pt-4 pb-4"><div className="text-xs uppercase text-muted-foreground">Total Events</div><div className="text-2xl font-bold">{stats.total}</div></CardContent></Card>
        <Card><CardContent className="pt-4 pb-4"><div className="text-xs uppercase text-muted-foreground">Last 7 Days</div><div className="text-2xl font-bold">{stats.last7}</div></CardContent></Card>
        <Card><CardContent className="pt-4 pb-4"><div className="text-xs uppercase text-muted-foreground">Self-Reduced</div><div className="text-2xl font-bold">{stats.selfReducedCount}</div>{stats.selfReducedRatio !== null && <div className="text-xs text-muted-foreground mt-1">{stats.selfReducedRatio}% of subs/dis</div>}</CardContent></Card>
        <Card><CardContent className="pt-4 pb-4"><div className="text-xs uppercase text-muted-foreground">ER Visits</div><div className="text-2xl font-bold text-red-600">{stats.erCount}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Bone className="h-4 w-4" /> Events by Type</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {Object.entries(stats.typeCounts).sort((a, b) => b[1] - a[1]).map(([type, count]) => {
            const info = getEpisodeTypeInfo(type)
            const pct = ((count / stats.total) * 100).toFixed(0)
            return <div key={type} className="flex items-center gap-2"><span className="text-lg w-7">{info.icon}</span><span className="flex-1 text-sm">{info.name}</span><Badge variant="secondary">{count} ({pct}%)</Badge></div>
          })}
        </CardContent>
      </Card>

      {sortedJoints.length > 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Activity className="h-4 w-4" /> Most Affected Joints (ortho consult prep)</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {sortedJoints.map(([j, c]) => {
              const pct = (c / stats.total) * 100
              return (
                <div key={j} className="space-y-1">
                  <div className="flex items-center justify-between text-sm"><span>{j}</span><span className="text-muted-foreground">{c} events ({pct.toFixed(0)}%)</span></div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden"><div className="bg-amber-400 h-2" style={{ width: `${pct}%` }} /></div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {sortedTriggers.length > 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><AlertCircle className="h-4 w-4" /> Top Trigger Activities</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {sortedTriggers.map(([t, c]) => {
              const pct = (c / stats.total) * 100
              return (
                <div key={t} className="space-y-1">
                  <div className="flex items-center justify-between text-sm"><span>{t}</span><span className="text-muted-foreground">{c} events ({pct.toFixed(0)}%)</span></div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden"><div className="bg-orange-400 h-2" style={{ width: `${pct}%` }} /></div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {sortedTreatments.length > 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Treatments Applied {stats.avgTreatmentResponse !== null && <span className="text-sm font-normal text-muted-foreground">(avg response {stats.avgTreatmentResponse}/5)</span>}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {sortedTreatments.map(([t, c]) => <div key={t} className="flex items-center justify-between text-sm"><span>{t}</span><Badge variant="secondary">{c}</Badge></div>)}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Severity Distribution</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="text-center"><div className="text-xs uppercase text-muted-foreground">Mild (1-3)</div><div className="text-2xl font-bold text-green-600">{stats.severityBuckets.mild}</div></div>
            <div className="text-center"><div className="text-xs uppercase text-muted-foreground">Moderate (4-6)</div><div className="text-2xl font-bold text-yellow-600">{stats.severityBuckets.moderate}</div></div>
            <div className="text-center"><div className="text-xs uppercase text-muted-foreground">Severe (7-10)</div><div className="text-2xl font-bold text-red-600">{stats.severityBuckets.severe}</div></div>
          </div>
          {(stats.swellingCount > 0 || stats.bruisingCount > 0) && (
            <div className="mt-4 pt-3 border-t flex gap-4 text-sm justify-center text-muted-foreground">
              {stats.swellingCount > 0 && <span>Swelling: {stats.swellingCount}</span>}
              {stats.bruisingCount > 0 && <span>Bruising: {stats.bruisingCount}</span>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
