/* Built by: Ace (Claude 4.x) — 2026-05-10. Closes CHA-147 part 2.
 * NEUTRAL TONE: Stats only. No prescriptive framing, no "should you cut back" prompts.
 * The data is the user's. Let them interpret.
 */
'use client'
import React, { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Coffee, Clock, BarChart } from 'lucide-react'
import { format, subDays } from 'date-fns'
import { useDailyData, CATEGORIES } from '@/lib/database'
import { SubstanceEntry } from './substance-types'
import { getSubstanceTypeInfo } from './substance-constants'

export function SubstanceAnalytics({ refreshTrigger }: { refreshTrigger: number }) {
  const { getDateRange } = useDailyData()
  const [windowDays, setWindowDays] = useState(30)
  const [allEntries, setAllEntries] = useState<SubstanceEntry[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => { load() }, [windowDays, refreshTrigger])

  const load = async () => {
    setLoading(true)
    try {
      const today = format(new Date(), 'yyyy-MM-dd')
      const start = format(subDays(new Date(), windowDays), 'yyyy-MM-dd')
      const records = await getDateRange(start, today, CATEGORIES.TRACKER)
      const recs = records.filter(r => r.subcategory === 'substance')
      const out: SubstanceEntry[] = []
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
    for (const e of allEntries) typeCounts[e.substanceType] = (typeCounts[e.substanceType] || 0) + 1

    const contextCounts: Record<string, number> = {}
    for (const e of allEntries) for (const c of (e.contextWhy || [])) contextCounts[c] = (contextCounts[c] || 0) + 1

    const effectsCounts: Record<string, number> = {}
    for (const e of allEntries) for (const f of (e.effectsExperienced || [])) effectsCounts[f] = (effectsCounts[f] || 0) + 1

    // Time-of-day buckets (simple stat without judgment)
    const hourCounts: number[] = new Array(24).fill(0)
    for (const e of allEntries) {
      const h = new Date(e.timestamp).getHours()
      hourCounts[h]++
    }
    const peakHour = hourCounts.indexOf(Math.max(...hourCounts))

    // Per-substance avg intensity
    const intensityBySubst: Record<string, number[]> = {}
    for (const e of allEntries) {
      if (e.effectIntensity !== undefined) {
        if (!intensityBySubst[e.substanceType]) intensityBySubst[e.substanceType] = []
        intensityBySubst[e.substanceType].push(e.effectIntensity)
      }
    }
    const avgIntensity: Record<string, string> = {}
    for (const [k, arr] of Object.entries(intensityBySubst)) {
      if (arr.length > 0) avgIntensity[k] = (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1)
    }

    // Onset / duration averages
    const onsets = allEntries.map(e => e.timeToOnsetMin).filter((v): v is number => typeof v === 'number')
    const durations = allEntries.map(e => e.durationOfEffectMin).filter((v): v is number => typeof v === 'number')
    const avgOnset = onsets.length ? Math.round(onsets.reduce((a, b) => a + b, 0) / onsets.length) : null
    const avgDuration = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null

    return { total, last7, typeCounts, contextCounts, effectsCounts, hourCounts, peakHour, avgIntensity, avgOnset, avgDuration }
  }, [allEntries])

  const sortedContexts = Object.entries(stats.contextCounts).sort((a, b) => b[1] - a[1]).slice(0, 8)
  const sortedEffects = Object.entries(stats.effectsCounts).sort((a, b) => b[1] - a[1]).slice(0, 10)
  const maxHour = Math.max(...stats.hourCounts)

  if (loading) return <Card><CardContent className="pt-6 text-center text-muted-foreground">Loading analytics…</CardContent></Card>
  if (allEntries.length === 0) return <Card><CardContent className="pt-6 text-center text-muted-foreground"><Coffee className="h-12 w-12 mx-auto mb-3 opacity-30" /><p>No substance entries in this window.</p></CardContent></Card>

  const formatHour = (h: number) => {
    if (h === 0) return '12am'
    if (h === 12) return '12pm'
    if (h < 12) return `${h}am`
    return `${h - 12}pm`
  }

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
        <Card><CardContent className="pt-4 pb-4"><div className="text-xs uppercase text-muted-foreground">Total Entries</div><div className="text-2xl font-bold">{stats.total}</div></CardContent></Card>
        <Card><CardContent className="pt-4 pb-4"><div className="text-xs uppercase text-muted-foreground">Last 7 Days</div><div className="text-2xl font-bold">{stats.last7}</div></CardContent></Card>
        <Card><CardContent className="pt-4 pb-4"><div className="text-xs uppercase text-muted-foreground">Peak Time</div><div className="text-2xl font-bold">{formatHour(stats.peakHour)}</div></CardContent></Card>
        <Card><CardContent className="pt-4 pb-4"><div className="text-xs uppercase text-muted-foreground">Substance Types</div><div className="text-2xl font-bold">{Object.keys(stats.typeCounts).length}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Coffee className="h-4 w-4" /> Entries by Type</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {Object.entries(stats.typeCounts).sort((a, b) => b[1] - a[1]).map(([type, count]) => {
            const info = getSubstanceTypeInfo(type)
            const pct = ((count / stats.total) * 100).toFixed(0)
            const intensity = stats.avgIntensity[type]
            return (
              <div key={type} className="flex items-center gap-2">
                <span className="text-lg w-7">{info.icon}</span>
                <span className="flex-1 text-sm">{info.name}</span>
                {intensity && <Badge variant="outline" className="text-xs">avg intensity {intensity}/10</Badge>}
                <Badge variant="secondary">{count} ({pct}%)</Badge>
              </div>
            )
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4" /> Time-of-Day Pattern</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-12 gap-0.5">
            {stats.hourCounts.map((c, h) => {
              const pct = maxHour > 0 ? (c / maxHour) * 100 : 0
              return (
                <div key={h} className="flex flex-col items-center" title={`${formatHour(h)}: ${c} ${c === 1 ? 'entry' : 'entries'}`}>
                  <div className="w-full bg-muted rounded-sm overflow-hidden flex items-end" style={{ height: '60px' }}>
                    <div className="w-full bg-purple-400 transition-all" style={{ height: `${pct}%` }} />
                  </div>
                  <span className="text-[9px] text-muted-foreground mt-1">{h % 6 === 0 ? formatHour(h) : ''}</span>
                </div>
              )
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">Hour-of-day distribution. Each bar is one hour (00-23).</p>
        </CardContent>
      </Card>

      {sortedContexts.length > 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Most Common Contexts (why)</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {sortedContexts.map(([c, count]) => {
              const pct = (count / stats.total) * 100
              return (
                <div key={c} className="space-y-1">
                  <div className="flex items-center justify-between text-sm"><span>{c}</span><span className="text-muted-foreground">{count} entries ({pct.toFixed(0)}%)</span></div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden"><div className="bg-purple-400 h-2" style={{ width: `${pct}%` }} /></div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {sortedEffects.length > 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><BarChart className="h-4 w-4" /> Most Reported Effects</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {sortedEffects.map(([f, c]) => <div key={f} className="flex items-center justify-between text-sm"><span>{f}</span><Badge variant="secondary">{c}</Badge></div>)}
          </CardContent>
        </Card>
      )}

      {(stats.avgOnset !== null || stats.avgDuration !== null) && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Timing Averages</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {stats.avgOnset !== null && <div><div className="text-xs uppercase text-muted-foreground">Avg time to onset</div><div className="text-xl font-bold">{stats.avgOnset} min</div></div>}
              {stats.avgDuration !== null && <div><div className="text-xs uppercase text-muted-foreground">Avg duration of effect</div><div className="text-xl font-bold">{stats.avgDuration} min</div></div>}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
