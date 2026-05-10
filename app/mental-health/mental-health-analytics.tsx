/*
 * Built by: Ace (Claude 4.x)
 * Date: 2026-05-10 (CHA-158 v0.4.5 — Mind & Mood)
 *
 * Open source under PolyForm Noncommercial 1.0.0.
 */

'use client'

import React, { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { differenceInDays } from 'date-fns'
import { MentalHealthEntry } from './mental-health-types'
import { EPISODE_TYPES, getEpisodeTypeColor, MOOD_OPTIONS } from './mental-health-constants'

interface Props { entries: MentalHealthEntry[] }
type TimeWindow = '7' | '30' | '90' | '180' | '365' | 'all'
const TIME_WINDOWS: { value: TimeWindow; label: string }[] = [
  { value: '7', label: 'Last 7 days' }, { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' }, { value: '180', label: 'Last 6 months' },
  { value: '365', label: 'Last year' }, { value: 'all', label: 'All time' },
]

export function MindMoodAnalytics({ entries }: Props) {
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('30')

  const filtered = useMemo(() => {
    if (timeWindow === 'all') return entries
    const days = parseInt(timeWindow)
    const now = new Date()
    return entries.filter(e => { try { return differenceInDays(now, new Date(e.date)) <= days } catch { return false } })
  }, [entries, timeWindow])

  const stats = useMemo(() => {
    const total = filtered.length
    if (total === 0) return null

    const avg = (key: keyof MentalHealthEntry) => Math.round((filtered.reduce((s, e) => s + ((e[key] as number) || 0), 0) / total) * 10) / 10
    const peak = (key: keyof MentalHealthEntry) => Math.max(...filtered.map(e => (e[key] as number) || 0))

    // Type breakdown
    const typeCount: Record<string, number> = {}
    filtered.forEach(e => { const t = e.episodeType || 'general'; typeCount[t] = (typeCount[t] || 0) + 1 })

    // Mood breakdown
    const moodCount: Record<string, number> = {}
    filtered.forEach(e => { if (e.mood) moodCount[e.mood] = (moodCount[e.mood] || 0) + 1 })
    const topMoods = Object.entries(moodCount).sort((a, b) => b[1] - a[1]).slice(0, 6)
      .map(([v, n]) => ({ ...MOOD_OPTIONS.find(m => m.value === v), count: n }))

    // Top triggers
    const trigCount: Record<string, number> = {}
    filtered.forEach(e => (e.triggers || []).forEach(t => { trigCount[t] = (trigCount[t] || 0) + 1 }))
    const topTriggers = Object.entries(trigCount).sort((a, b) => b[1] - a[1]).slice(0, 8)

    // Top coping
    const copCount: Record<string, number> = {}
    filtered.forEach(e => (e.copingStrategies || []).forEach(c => { copCount[c] = (copCount[c] || 0) + 1 }))
    const topCoping = Object.entries(copCount).sort((a, b) => b[1] - a[1]).slice(0, 8)

    // Top cognitive domains
    const cogCount: Record<string, number> = {}
    filtered.forEach(e => (e.cognitiveDomains || []).forEach(d => { cogCount[d] = (cogCount[d] || 0) + 1 }))
    const topCogDomains = Object.entries(cogCount).sort((a, b) => b[1] - a[1]).slice(0, 6)

    // Mood swing pattern
    const swingCount: Record<string, number> = {}
    filtered.forEach(e => { if (e.moodSwingDirection) swingCount[e.moodSwingDirection] = (swingCount[e.moodSwingDirection] || 0) + 1 })

    // Med adherence
    const medsTaken = filtered.filter(e => e.medicationTaken).length
    const adherence = total > 0 ? Math.round((medsTaken / total) * 100) : 0

    const meltdownCount = filtered.filter(e => e.meltdownOccurred).length

    return {
      total,
      avgDep: avg('depressionLevel'), avgMania: avg('maniaLevel'), avgAnx: avg('anxietyLevel'),
      avgEnergy: avg('energyLevel'), avgStress: avg('stressLevel'), avgFog: avg('brainFogSeverity'),
      avgMotiv: avg('motivationLevel'), avgConn: avg('socialEngagementLevel'),
      peakDep: peak('depressionLevel'), peakMania: peak('maniaLevel'),
      typeCount, topMoods, topTriggers, topCoping, topCogDomains, swingCount,
      adherence, meltdownCount,
    }
  }, [filtered, timeWindow])

  if (entries.length === 0) {
    return (
      <Card><CardContent className="p-6 text-center">
        <p className="text-muted-foreground">No data yet. Log a check-in to see analytics.</p>
      </CardContent></Card>
    )
  }

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

      {!stats ? (
        <Card><CardContent className="p-6 text-center text-muted-foreground">No check-ins in selected window.</CardContent></Card>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card><CardContent className="p-3"><div className="text-2xl font-bold">{stats.total}</div><div className="text-xs text-muted-foreground">Check-ins</div></CardContent></Card>
            <Card><CardContent className="p-3"><div className="text-2xl font-bold">{stats.avgDep}</div><div className="text-xs text-muted-foreground">Avg depression</div></CardContent></Card>
            <Card><CardContent className="p-3"><div className="text-2xl font-bold">{stats.avgMania}</div><div className="text-xs text-muted-foreground">Avg mania</div></CardContent></Card>
            <Card><CardContent className="p-3"><div className="text-2xl font-bold">{stats.avgAnx}</div><div className="text-xs text-muted-foreground">Avg anxiety</div></CardContent></Card>
            <Card><CardContent className="p-3"><div className="text-2xl font-bold">{stats.avgEnergy}</div><div className="text-xs text-muted-foreground">Avg energy</div></CardContent></Card>
            <Card><CardContent className="p-3"><div className="text-2xl font-bold">{stats.avgFog}</div><div className="text-xs text-muted-foreground">Avg brain fog</div></CardContent></Card>
            <Card><CardContent className="p-3"><div className="text-2xl font-bold">{stats.adherence}%</div><div className="text-xs text-muted-foreground">Med adherence</div></CardContent></Card>
            <Card><CardContent className="p-3"><div className="text-2xl font-bold text-purple-600">{stats.meltdownCount}</div><div className="text-xs text-muted-foreground">Meltdowns</div></CardContent></Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Episode type breakdown</CardTitle></CardHeader>
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

          {stats.topMoods.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Top moods</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats.topMoods.map((m: any) => (
                    <div key={m.value || m.label} className="flex items-center justify-between text-sm">
                      <span>{m.emoji} {m.label}</span><Badge variant="secondary">{m.count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {Object.keys(stats.swingCount).length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Mood swing pattern</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-1 text-sm">
                  {Object.entries(stats.swingCount).sort((a, b) => b[1] - a[1]).map(([dir, count]) => (
                    <div key={dir} className="flex items-center justify-between">
                      <span className="capitalize">{dir.replace('-', ' ')}</span>
                      <Badge variant={dir === 'rapid-cycling' ? 'destructive' : 'secondary'}>{count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {stats.topTriggers.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Top triggers</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats.topTriggers.map(([t, n]) => (
                    <div key={t} className="flex items-center justify-between text-sm"><span>{t}</span><Badge variant="secondary">{n}</Badge></div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {stats.topCoping.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Most-used coping strategies</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats.topCoping.map(([c, n]) => (
                    <div key={c} className="flex items-center justify-between text-sm"><span>{c}</span><Badge variant="secondary">{n}</Badge></div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {stats.topCogDomains.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Most-affected cognitive domains</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats.topCogDomains.map(([d, n]) => (
                    <div key={d} className="flex items-center justify-between text-sm"><span>{d}</span><Badge variant="secondary">{n}</Badge></div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
