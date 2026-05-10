/*
 * Built by: Ace (Claude 4.x)
 * Date: 2026-05-10 (CHA-156 v2 refactor)
 *
 * Open source under PolyForm Noncommercial 1.0.0.
 * Co-invented by Ren (vision) and Ace (implementation).
 * "Dreamed by Ren, implemented by Ace, inspired by mitochondria on strike"
 */

'use client'

import React, { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { differenceInDays } from 'date-fns'
import { FoodAllergenEntry } from './food-allergens-types'
import { EPISODE_TYPES, getEpisodeTypeColor } from './food-allergens-constants'

interface Props { entries: FoodAllergenEntry[] }

type TimeWindow = '7' | '30' | '90' | '180' | '365' | 'all'
const TIME_WINDOWS: { value: TimeWindow; label: string }[] = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: '180', label: 'Last 6 months' },
  { value: '365', label: 'Last year' },
  { value: 'all', label: 'All time' },
]

export function FoodAllergensAnalytics({ entries }: Props) {
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('90')

  const filtered = useMemo(() => {
    if (timeWindow === 'all') return entries
    const days = parseInt(timeWindow)
    const now = new Date()
    return entries.filter(e => { try { return differenceInDays(now, new Date(e.date || e.timestamp)) <= days } catch { return false } })
  }, [entries, timeWindow])

  const stats = useMemo(() => {
    const total = filtered.length
    const epipenCount = filtered.filter(e => e.epipenUsed).length
    const erCount = filtered.filter(e => e.erVisitRequired).length
    const emsCount = filtered.filter(e => e.emergencyServicesCalled).length
    const hospCount = filtered.filter(e => e.hospitalizedOvernight).length
    const anaphCount = filtered.filter(e => e.episodeType === 'severe-anaphylaxis').length
    const celiacCount = filtered.filter(e => e.episodeType === 'celiac-autoimmune').length
    const intoleranceCount = filtered.filter(e => e.episodeType === 'intolerance').length

    // Type breakdown
    const typeCount: Record<string, number> = {}
    filtered.forEach(e => { typeCount[e.episodeType] = (typeCount[e.episodeType] || 0) + 1 })

    // Top allergens
    const allergenCount: Record<string, number> = {}
    filtered.forEach(e => {
      if (e.allergenName) {
        const key = e.allergenName.trim().toLowerCase()
        allergenCount[key] = (allergenCount[key] || 0) + 1
      }
    })
    const topAllergens = Object.entries(allergenCount).sort((a, b) => b[1] - a[1]).slice(0, 8)

    // Top exposure sources
    const sourceCount: Record<string, number> = {}
    filtered.forEach(e => { if (e.exposureSource) sourceCount[e.exposureSource] = (sourceCount[e.exposureSource] || 0) + 1 })
    const topSources = Object.entries(sourceCount).sort((a, b) => b[1] - a[1]).slice(0, 6)

    // Top symptoms
    const symptomCount: Record<string, number> = {}
    filtered.forEach(e => (e.symptoms || []).forEach(s => { symptomCount[s] = (symptomCount[s] || 0) + 1 }))
    const topSymptoms = Object.entries(symptomCount).sort((a, b) => b[1] - a[1]).slice(0, 10)

    // CELIAC AFTERMATH PATTERN — for users who track gluten exposures, this is gold
    const celiacEntries = filtered.filter(e => e.episodeType === 'celiac-autoimmune' || e.episodeType === 'intolerance')
    const aftermathStats = {
      brainFog: celiacEntries.filter(e => e.brainFogAfter).length,
      jointPain: celiacEntries.filter(e => e.jointPainAfter).length,
      fatigue: celiacEntries.filter(e => e.fatigueAfter).length,
      moodChanges: celiacEntries.filter(e => e.moodChangesAfter).length,
      delayed: celiacEntries.filter(e => e.delayedReaction).length,
      avgDelayHours: 0,
    }
    const delays = celiacEntries.filter(e => e.delayedReactionHours).map(e => e.delayedReactionHours!)
    if (delays.length > 0) {
      aftermathStats.avgDelayHours = Math.round((delays.reduce((a, b) => a + b, 0) / delays.length) * 10) / 10
    }

    // Time-of-day
    const hourBins: number[] = new Array(24).fill(0)
    filtered.forEach(e => {
      try {
        const h = new Date(e.timestamp).getHours()
        if (!isNaN(h)) hourBins[h] += 1
      } catch {}
    })

    return {
      total, epipenCount, erCount, emsCount, hospCount,
      anaphCount, celiacCount, intoleranceCount,
      typeCount, topAllergens, topSources, topSymptoms,
      celiacEntriesCount: celiacEntries.length, aftermathStats,
      hourBins,
    }
  }, [filtered, timeWindow])

  if (entries.length === 0) {
    return (
      <Card><CardContent className="p-6 text-center">
        <p className="text-muted-foreground">No data yet. Log a reaction to see analytics.</p>
      </CardContent></Card>
    )
  }

  const maxHourCount = Math.max(...stats.hourBins, 1)

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-4">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Time window</label>
          <Select value={timeWindow} onValueChange={(v) => setTimeWindow(v as TimeWindow)}>
            <SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{TIME_WINDOWS.map(w => <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>)}</SelectContent>
          </Select>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <Card><CardContent className="p-6 text-center text-muted-foreground">No reactions in selected window.</CardContent></Card>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card><CardContent className="p-3"><div className="text-2xl font-bold">{stats.total}</div><div className="text-xs text-muted-foreground">Total reactions</div></CardContent></Card>
            <Card><CardContent className="p-3"><div className="text-2xl font-bold text-red-600">{stats.anaphCount}</div><div className="text-xs text-muted-foreground">Anaphylaxis</div></CardContent></Card>
            <Card><CardContent className="p-3"><div className="text-2xl font-bold text-amber-600">{stats.epipenCount}</div><div className="text-xs text-muted-foreground">EpiPen used</div></CardContent></Card>
            <Card><CardContent className="p-3"><div className="text-2xl font-bold">{stats.erCount}</div><div className="text-xs text-muted-foreground">ER visits</div></CardContent></Card>
            <Card><CardContent className="p-3"><div className="text-2xl font-bold">{stats.hospCount}</div><div className="text-xs text-muted-foreground">Hospitalized</div></CardContent></Card>
            <Card><CardContent className="p-3"><div className="text-2xl font-bold text-amber-600">{stats.celiacCount}</div><div className="text-xs text-muted-foreground">Celiac flares</div></CardContent></Card>
            <Card><CardContent className="p-3"><div className="text-2xl font-bold text-blue-600">{stats.intoleranceCount}</div><div className="text-xs text-muted-foreground">Intolerance</div></CardContent></Card>
            <Card><CardContent className="p-3"><div className="text-2xl font-bold">{stats.emsCount}</div><div className="text-xs text-muted-foreground">911 / EMS</div></CardContent></Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Reaction type breakdown</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {EPISODE_TYPES.filter(t => stats.typeCount[t.id]).sort((a, b) => (stats.typeCount[b.id] || 0) - (stats.typeCount[a.id] || 0)).map(t => {
                  const count = stats.typeCount[t.id] || 0
                  const pct = stats.total > 0 ? (count / stats.total * 100) : 0
                  return (
                    <div key={t.id}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span>{t.icon} {t.name}</span>
                        <span className="text-muted-foreground">{count} ({Math.round(pct)}%)</span>
                      </div>
                      <div className="h-2 bg-muted rounded overflow-hidden">
                        <div className="h-full" style={{ width: `${pct}%`, backgroundColor: getEpisodeTypeColor(t.id) }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {stats.topAllergens.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Top triggers</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats.topAllergens.map(([name, count]) => (
                    <div key={name} className="flex items-center justify-between text-sm">
                      <span className="capitalize">{name}</span>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {stats.topSources.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top exposure sources</CardTitle>
                <p className="text-xs text-muted-foreground">Where the cross-contamination is coming from.</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats.topSources.map(([s, c]) => (
                    <div key={s} className="flex items-center justify-between text-sm">
                      <span>{s}</span>
                      <Badge variant="secondary">{c}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {stats.topSymptoms.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Top symptoms</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats.topSymptoms.map(([s, c]) => (
                    <div key={s} className="flex items-center justify-between text-sm">
                      <span>{s}</span>
                      <Badge variant="secondary">{c}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Celiac / autoimmune aftermath patterns */}
          {stats.celiacEntriesCount > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Celiac / autoimmune aftermath</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Across {stats.celiacEntriesCount} celiac/intolerance episode{stats.celiacEntriesCount !== 1 ? 's' : ''}. The slow-burn signal your GI doc cares about.
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  <div><div className="text-xs text-muted-foreground">Brain fog after</div><div className="text-lg font-semibold">{stats.aftermathStats.brainFog} ({Math.round(stats.aftermathStats.brainFog / stats.celiacEntriesCount * 100)}%)</div></div>
                  <div><div className="text-xs text-muted-foreground">Joint pain after</div><div className="text-lg font-semibold">{stats.aftermathStats.jointPain} ({Math.round(stats.aftermathStats.jointPain / stats.celiacEntriesCount * 100)}%)</div></div>
                  <div><div className="text-xs text-muted-foreground">Fatigue after</div><div className="text-lg font-semibold">{stats.aftermathStats.fatigue} ({Math.round(stats.aftermathStats.fatigue / stats.celiacEntriesCount * 100)}%)</div></div>
                  <div><div className="text-xs text-muted-foreground">Mood changes</div><div className="text-lg font-semibold">{stats.aftermathStats.moodChanges} ({Math.round(stats.aftermathStats.moodChanges / stats.celiacEntriesCount * 100)}%)</div></div>
                  <div><div className="text-xs text-muted-foreground">Delayed reaction</div><div className="text-lg font-semibold">{stats.aftermathStats.delayed} ({Math.round(stats.aftermathStats.delayed / stats.celiacEntriesCount * 100)}%)</div></div>
                  <div><div className="text-xs text-muted-foreground">Avg delay (hours)</div><div className="text-lg font-semibold">{stats.aftermathStats.avgDelayHours || '—'}</div></div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle className="text-base">Time of day pattern</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-12 gap-1 items-end h-32">
                {stats.hourBins.map((count, hour) => {
                  const pct = (count / maxHourCount) * 100
                  return (
                    <div key={hour} className="flex flex-col items-center justify-end h-full">
                      <div className="w-full bg-amber-400 rounded-t" style={{ height: `${pct}%`, minHeight: count > 0 ? '4px' : '0' }} title={`${hour}:00 — ${count}`} />
                      <div className="text-[10px] text-muted-foreground mt-1">{hour % 6 === 0 ? hour : ''}</div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
