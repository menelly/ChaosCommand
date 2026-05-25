/*
 * Built by: Ace (Claude 4.x)
 * Date: 2026-05-10 (CHA-157 v2 refactor)
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
import { AnxietyEntry } from './anxiety-types'
import { EPISODE_TYPES, getEpisodeTypeColor } from './anxiety-constants'

interface Props { entries: AnxietyEntry[] }

type TimeWindow = '7' | '30' | '90' | '180' | '365' | 'all'
const TIME_WINDOWS: { value: TimeWindow; label: string }[] = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: '180', label: 'Last 6 months' },
  { value: '365', label: 'Last year' },
  { value: 'all', label: 'All time' },
]

export function AnxietyAnalytics({ entries }: Props) {
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('30')

  const filtered = useMemo(() => {
    if (timeWindow === 'all') return entries
    const days = parseInt(timeWindow)
    const now = new Date()
    return entries.filter(e => { try { return differenceInDays(now, new Date(e.date)) <= days } catch { return false } })
  }, [entries, timeWindow])

  const stats = useMemo(() => {
    const total = filtered.length
    const avgAnx = total > 0 ? filtered.reduce((s, e) => s + (e.anxietyLevel || 0), 0) / total : 0
    const avgPanic = total > 0 ? filtered.reduce((s, e) => s + (e.panicLevel || 0), 0) / total : 0
    const peakAnx = total > 0 ? Math.max(...filtered.map(e => e.anxietyLevel || 0)) : 0
    const siCount = filtered.filter(e => e.suicidalIdeation).length
    const shCount = filtered.filter(e => e.selfHarmUrges).length
    const crisisContactCount = filtered.filter(e => e.crisisContactMade).length

    // Type breakdown
    const typeCount: Record<string, number> = {}
    filtered.forEach(e => {
      const t = e.episodeType || e.anxietyType || 'general'
      typeCount[t] = (typeCount[t] || 0) + 1
    })

    // Top triggers
    const trigCount: Record<string, number> = {}
    filtered.forEach(e => (e.triggers || []).forEach(t => { trigCount[t] = (trigCount[t] || 0) + 1 }))
    const topTriggers = Object.entries(trigCount).sort((a, b) => b[1] - a[1]).slice(0, 8)

    // Top coping strategies (most used)
    const copingCount: Record<string, number> = {}
    filtered.forEach(e => (e.copingStrategies || []).forEach(c => { copingCount[c] = (copingCount[c] || 0) + 1 }))
    const topCoping = Object.entries(copingCount).sort((a, b) => b[1] - a[1]).slice(0, 8)

    // Top physical symptoms
    const psCount: Record<string, number> = {}
    filtered.forEach(e => (e.physicalSymptoms || []).forEach(s => { psCount[s] = (psCount[s] || 0) + 1 }))
    const topPhysical = Object.entries(psCount).sort((a, b) => b[1] - a[1]).slice(0, 8)

    // Top mental symptoms
    const msCount: Record<string, number> = {}
    filtered.forEach(e => (e.mentalSymptoms || []).forEach(s => { msCount[s] = (msCount[s] || 0) + 1 }))
    const topMental = Object.entries(msCount).sort((a, b) => b[1] - a[1]).slice(0, 8)

    // TRIGGER → outcome correlation. For each trigger logged ≥2×: avg anxiety level of
    // those entries + the physical symptoms that co-occurred. Co-occurrence, NOT proven
    // cause — but the doctor-useful pattern.
    const trigStats: Record<string, { count: number; intensitySum: number; syms: Record<string, number> }> = {}
    filtered.forEach(e => {
      (e.triggers || []).forEach(t => {
        if (!trigStats[t]) trigStats[t] = { count: 0, intensitySum: 0, syms: {} }
        trigStats[t].count += 1
        trigStats[t].intensitySum += (e.anxietyLevel || 0)
        ;(e.physicalSymptoms || []).forEach(s => { trigStats[t].syms[s] = (trigStats[t].syms[s] || 0) + 1 })
      })
    })
    const correlations = Object.entries(trigStats)
      .filter(([, v]) => v.count >= 2)
      .map(([trigger, v]) => ({
        trigger,
        count: v.count,
        avgSeverity: Math.round((v.intensitySum / v.count) * 10) / 10,
        top: Object.entries(v.syms)
          .map(([sym, n]) => ({ label: sym, n, pct: Math.round((n / v.count) * 100) }))
          .sort((a, b) => b.n - a.n)
          .slice(0, 3),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)

    // Time of day
    const hourBins: number[] = new Array(24).fill(0)
    filtered.forEach(e => {
      try {
        const d = e.timestamp ? new Date(e.timestamp) : new Date(`${e.date}T${e.time || '12:00'}`)
        const h = d.getHours()
        if (!isNaN(h)) hourBins[h] += 1
      } catch {}
    })

    return {
      total, avgAnx: Math.round(avgAnx * 10) / 10, avgPanic: Math.round(avgPanic * 10) / 10, peakAnx,
      siCount, shCount, crisisContactCount,
      typeCount, topTriggers, topCoping, topPhysical, topMental,
      hourBins, correlations,
    }
  }, [filtered, timeWindow])

  if (entries.length === 0) {
    return (
      <Card><CardContent className="p-6 text-center">
        <p className="text-muted-foreground">No data yet. Log an entry to see analytics.</p>
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
        <Card><CardContent className="p-6 text-center text-muted-foreground">No entries in selected window.</CardContent></Card>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card><CardContent className="p-3"><div className="text-2xl font-bold">{stats.total}</div><div className="text-xs text-muted-foreground">Entries</div></CardContent></Card>
            <Card><CardContent className="p-3"><div className="text-2xl font-bold">{stats.avgAnx}</div><div className="text-xs text-muted-foreground">Avg anxiety</div></CardContent></Card>
            <Card><CardContent className="p-3"><div className="text-2xl font-bold">{stats.avgPanic}</div><div className="text-xs text-muted-foreground">Avg panic</div></CardContent></Card>
            <Card><CardContent className="p-3"><div className="text-2xl font-bold text-red-600">{stats.peakAnx}</div><div className="text-xs text-muted-foreground">Peak anxiety</div></CardContent></Card>
            <Card><CardContent className="p-3"><div className="text-2xl font-bold text-red-600">{stats.siCount}</div><div className="text-xs text-muted-foreground">SI flagged</div></CardContent></Card>
            <Card><CardContent className="p-3"><div className="text-2xl font-bold text-red-600">{stats.shCount}</div><div className="text-xs text-muted-foreground">SH urges</div></CardContent></Card>
            <Card><CardContent className="p-3"><div className="text-2xl font-bold text-purple-600">{stats.crisisContactCount}</div><div className="text-xs text-muted-foreground">Reached out</div></CardContent></Card>
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

          {stats.topTriggers.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Top triggers</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats.topTriggers.map(([t, n]) => (
                    <div key={t} className="flex items-center justify-between text-sm">
                      <span>{t}</span><Badge variant="secondary">{n}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {stats.correlations.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Trigger → symptom patterns</CardTitle></CardHeader>
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
                  Avg anxiety level when each trigger was present, plus the physical symptoms that showed up alongside it.
                  Co-occurrence, not proof of cause — but worth raising with your doctor.
                </p>
              </CardContent>
            </Card>
          )}

          {stats.topCoping.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Most-used coping strategies</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats.topCoping.map(([c, n]) => (
                    <div key={c} className="flex items-center justify-between text-sm">
                      <span>{c}</span><Badge variant="secondary">{n}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stats.topPhysical.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base">Top physical symptoms</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {stats.topPhysical.map(([s, n]) => (
                      <div key={s} className="flex items-center justify-between text-sm">
                        <span>{s}</span><Badge variant="secondary">{n}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            {stats.topMental.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base">Top mental symptoms</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {stats.topMental.map(([s, n]) => (
                      <div key={s} className="flex items-center justify-between text-sm">
                        <span>{s}</span><Badge variant="secondary">{n}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Time of day pattern</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-12 gap-1 items-end h-32">
                {stats.hourBins.map((count, hour) => {
                  const pct = (count / maxHourCount) * 100
                  return (
                    <div key={hour} className="flex flex-col items-center justify-end h-full">
                      <div className="w-full bg-purple-400 rounded-t" style={{ height: `${pct}%`, minHeight: count > 0 ? '4px' : '0' }} title={`${hour}:00 — ${count}`} />
                      <div className="text-[0.625rem] text-muted-foreground mt-1">{hour % 6 === 0 ? hour : ''}</div>
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
