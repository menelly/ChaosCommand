/*
 * Built by: Ace (Claude 4.x)
 * Date: 2026-05-10 (CHA-153 v2 refactor)
 *
 * Open source under PolyForm Noncommercial 1.0.0.
 * Co-invented by Ren (vision) and Ace (implementation).
 * "Dreamed by Ren, implemented by Ace, inspired by mitochondria on strike"
 */

/**
 * SEIZURE ANALYTICS (v2)
 * Rich correlation surfaces for neurology consults — type breakdown, top
 * symptoms (ictal + postictal), top triggers, time-of-day pattern, pre-event
 * context aggregates, aura analysis, frequency timeline.
 */

'use client'

import React, { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { differenceInDays, format } from 'date-fns'
import { SeizureEntry } from './seizure-types'
import { EPISODE_TYPES, getEpisodeTypeInfo, getEpisodeTypeColor } from './seizure-constants'

interface Props {
  entries: SeizureEntry[]
}

type TimeWindow = '7' | '30' | '90' | '180' | '365' | 'all'

const TIME_WINDOWS: { value: TimeWindow; label: string }[] = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: '180', label: 'Last 6 months' },
  { value: '365', label: 'Last year' },
  { value: 'all', label: 'All time' },
]

export function SeizureAnalytics({ entries }: Props) {
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('90')

  const filtered = useMemo(() => {
    if (timeWindow === 'all') return entries
    const days = parseInt(timeWindow)
    const now = new Date()
    return entries.filter(e => {
      try { return differenceInDays(now, new Date(e.date)) <= days } catch { return false }
    })
  }, [entries, timeWindow])

  const stats = useMemo(() => {
    const total = filtered.length
    const statusEpiCount = filtered.filter(e => e.statusEpilepticus).length
    const rescueMedCount = filtered.filter(e => e.rescueMedicationUsed).length
    const emsCount = filtered.filter(e => e.emergencyServicesCalled).length
    const injuryCount = filtered.filter(e => e.injuriesOccurred).length
    const erCount = filtered.filter(e => e.injuryRequiredER).length
    const auraCount = filtered.filter(e => e.auraPresent).length
    const tongueBittenCount = filtered.filter(e => e.tongueBitten).length
    const incontinenceCount = filtered.filter(e => e.incontinence).length
    const medicationMissedCount = filtered.filter(e => e.medicationMissed).length

    // Type breakdown
    const typeCount: Record<string, number> = {}
    filtered.forEach(e => { typeCount[e.episodeType] = (typeCount[e.episodeType] || 0) + 1 })

    // Top symptoms (during)
    const symptomCount: Record<string, number> = {}
    filtered.forEach(e => (e.symptoms || []).forEach(s => { symptomCount[s] = (symptomCount[s] || 0) + 1 }))
    const topSymptoms = Object.entries(symptomCount).sort((a, b) => b[1] - a[1]).slice(0, 8)

    // Top postictal
    const postCount: Record<string, number> = {}
    filtered.forEach(e => (e.postSeizureSymptoms || []).forEach(s => { postCount[s] = (postCount[s] || 0) + 1 }))
    const topPostictal = Object.entries(postCount).sort((a, b) => b[1] - a[1]).slice(0, 8)

    // Top aura symptoms
    const auraCounts: Record<string, number> = {}
    filtered.filter(e => e.auraPresent).forEach(e => (e.auraSymptoms || []).forEach(s => { auraCounts[s] = (auraCounts[s] || 0) + 1 }))
    const topAura = Object.entries(auraCounts).sort((a, b) => b[1] - a[1]).slice(0, 6)

    // Top triggers
    const trigCount: Record<string, number> = {}
    filtered.forEach(e => (e.triggers || []).forEach(t => { trigCount[t] = (trigCount[t] || 0) + 1 }))
    const topTriggers = Object.entries(trigCount).sort((a, b) => b[1] - a[1]).slice(0, 8)

    // Time-of-day distribution (24-hour bins)
    const hourBins: number[] = new Array(24).fill(0)
    filtered.forEach(e => {
      try {
        const h = new Date(e.timestamp || e.date).getHours()
        if (!isNaN(h)) hourBins[h] += 1
      } catch {}
    })
    const peakHour = hourBins.indexOf(Math.max(...hourBins))

    // Pre-event context aggregates
    const sleepValues: number[] = filtered
      .map(e => e.hoursOfSleepLastNight)
      .filter((v): v is number => typeof v === 'number')
    const avgSleep = sleepValues.length > 0
      ? Math.round((sleepValues.reduce((a, b) => a + b, 0) / sleepValues.length) * 10) / 10
      : null
    const dehydrationPct = total > 0 ? Math.round(filtered.filter(e => e.possibleDehydration).length / total * 100) : 0
    const illnessPct = total > 0 ? Math.round(filtered.filter(e => e.recentIllness).length / total * 100) : 0
    const flashingPct = total > 0 ? Math.round(filtered.filter(e => e.flashingLights).length / total * 100) : 0
    const missedMedPct = total > 0 ? Math.round(medicationMissedCount / total * 100) : 0

    // Frequency (per week / per month) for the window
    const windowDays = timeWindow === 'all' && total > 0
      ? Math.max(1, differenceInDays(new Date(), new Date(filtered[filtered.length - 1].date)))
      : timeWindow === 'all' ? 1 : parseInt(timeWindow)
    const perWeek = windowDays > 0 ? Math.round((total / windowDays * 7) * 10) / 10 : 0
    const perMonth = windowDays > 0 ? Math.round((total / windowDays * 30) * 10) / 10 : 0

    // Awareness distribution
    const awarenessCount: Record<string, number> = {}
    filtered.forEach(e => {
      const c = e.consciousness || 'unknown'
      awarenessCount[c] = (awarenessCount[c] || 0) + 1
    })

    // Duration distribution
    const durCount: Record<string, number> = {}
    filtered.forEach(e => {
      const cat = e.durationCategory || 'unknown'
      durCount[cat] = (durCount[cat] || 0) + 1
    })

    return {
      total, statusEpiCount, rescueMedCount, emsCount, injuryCount, erCount,
      auraCount, tongueBittenCount, incontinenceCount, medicationMissedCount,
      typeCount, topSymptoms, topPostictal, topAura, topTriggers,
      hourBins, peakHour, avgSleep, dehydrationPct, illnessPct, flashingPct, missedMedPct,
      perWeek, perMonth, awarenessCount, durCount,
    }
  }, [filtered, timeWindow])

  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">No data yet. Log a seizure event to see analytics.</p>
        </CardContent>
      </Card>
    )
  }

  const maxHourCount = Math.max(...stats.hourBins, 1)

  return (
    <div className="space-y-4">
      {/* Time window */}
      <Card>
        <CardContent className="pt-4">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Time window</label>
          <Select value={timeWindow} onValueChange={(v) => setTimeWindow(v as TimeWindow)}>
            <SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TIME_WINDOWS.map(w => <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <Card><CardContent className="p-6 text-center text-muted-foreground">No episodes in selected window.</CardContent></Card>
      ) : (
        <>
          {/* Top counters */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card><CardContent className="p-3"><div className="text-2xl font-bold">{stats.total}</div><div className="text-xs text-muted-foreground">Episodes</div></CardContent></Card>
            <Card><CardContent className="p-3"><div className="text-2xl font-bold">{stats.perWeek}/wk</div><div className="text-xs text-muted-foreground">~{stats.perMonth}/mo</div></CardContent></Card>
            <Card><CardContent className="p-3"><div className="text-2xl font-bold text-red-600">{stats.statusEpiCount}</div><div className="text-xs text-muted-foreground">Status epi.</div></CardContent></Card>
            <Card><CardContent className="p-3"><div className="text-2xl font-bold text-amber-600">{stats.rescueMedCount}</div><div className="text-xs text-muted-foreground">Rescue med</div></CardContent></Card>
            <Card><CardContent className="p-3"><div className="text-2xl font-bold">{stats.emsCount}</div><div className="text-xs text-muted-foreground">911 / EMS</div></CardContent></Card>
            <Card><CardContent className="p-3"><div className="text-2xl font-bold">{stats.injuryCount}</div><div className="text-xs text-muted-foreground">Injuries</div></CardContent></Card>
            <Card><CardContent className="p-3"><div className="text-2xl font-bold">{stats.erCount}</div><div className="text-xs text-muted-foreground">ER required</div></CardContent></Card>
            <Card><CardContent className="p-3"><div className="text-2xl font-bold">{stats.auraCount}</div><div className="text-xs text-muted-foreground">With aura</div></CardContent></Card>
          </div>

          {/* Episode type breakdown */}
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

          {/* Top symptoms (ictal) */}
          {stats.topSymptoms.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Top symptoms during seizures</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats.topSymptoms.map(([s, n]) => (
                    <div key={s} className="flex items-center justify-between text-sm">
                      <span>{s}</span>
                      <Badge variant="secondary">{n}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Top postictal */}
          {stats.topPostictal.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Top postictal (recovery) symptoms</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats.topPostictal.map(([s, n]) => (
                    <div key={s} className="flex items-center justify-between text-sm">
                      <span>{s}</span>
                      <Badge variant="secondary">{n}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Aura analysis */}
          {stats.topAura.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Aura patterns</CardTitle>
                <p className="text-xs text-muted-foreground">
                  {stats.auraCount} of {stats.total} episodes had a warning aura ({stats.total > 0 ? Math.round(stats.auraCount / stats.total * 100) : 0}%)
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats.topAura.map(([s, n]) => (
                    <div key={s} className="flex items-center justify-between text-sm">
                      <span>{s}</span>
                      <Badge variant="secondary">{n}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Top triggers */}
          {stats.topTriggers.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Top triggers</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats.topTriggers.map(([t, n]) => (
                    <div key={t} className="flex items-center justify-between text-sm">
                      <span>{t}</span>
                      <Badge variant="secondary">{n}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pre-event context */}
          <Card>
            <CardHeader><CardTitle className="text-base">Pre-event context</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-muted-foreground text-xs">Avg sleep before</div>
                  <div className="text-lg font-semibold">{stats.avgSleep != null ? `${stats.avgSleep} hrs` : '—'}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">Missed AED</div>
                  <div className="text-lg font-semibold">{stats.missedMedPct}%</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">Possible dehydration</div>
                  <div className="text-lg font-semibold">{stats.dehydrationPct}%</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">Recent illness</div>
                  <div className="text-lg font-semibold">{stats.illnessPct}%</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">Flashing lights / patterns</div>
                  <div className="text-lg font-semibold">{stats.flashingPct}%</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">Tongue bitten / incontinence</div>
                  <div className="text-lg font-semibold">
                    {stats.tongueBittenCount} / {stats.incontinenceCount}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Time of day */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Time of day pattern</CardTitle>
              <p className="text-xs text-muted-foreground">
                Peak hour: {stats.peakHour}:00 ({stats.hourBins[stats.peakHour]} episodes)
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-12 gap-1 items-end h-32">
                {stats.hourBins.map((count, hour) => {
                  const pct = (count / maxHourCount) * 100
                  return (
                    <div key={hour} className="flex flex-col items-center justify-end h-full">
                      <div
                        className="w-full bg-yellow-400 rounded-t"
                        style={{ height: `${pct}%`, minHeight: count > 0 ? '4px' : '0' }}
                        title={`${hour}:00 — ${count} episodes`}
                      />
                      <div className="text-[10px] text-muted-foreground mt-1">
                        {hour % 6 === 0 ? hour : ''}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Awareness distribution */}
          <Card>
            <CardHeader><CardTitle className="text-base">Awareness during episodes</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-1 text-sm">
                {Object.entries(stats.awarenessCount).sort((a, b) => b[1] - a[1]).map(([level, count]) => (
                  <div key={level} className="flex items-center justify-between">
                    <span className="capitalize">{level.replace('-', ' ')}</span>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Duration distribution */}
          <Card>
            <CardHeader><CardTitle className="text-base">Duration distribution</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-1 text-sm">
                {Object.entries(stats.durCount).sort((a, b) => b[1] - a[1]).map(([dur, count]) => (
                  <div key={dur} className="flex items-center justify-between">
                    <span>{dur === 'unknown' ? 'Unknown / not recorded' : dur}</span>
                    <Badge variant={(dur === '5-10min' || dur === 'over-10min') ? 'destructive' : 'secondary'}>{count}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
