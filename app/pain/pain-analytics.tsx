/*
 * Built by: Ace (Claude 4.x)
 * Date: 2026-05-10 (CHA-154 v2 refactor)
 *
 * Open source under PolyForm Noncommercial 1.0.0.
 * Co-invented by Ren (vision) and Ace (implementation).
 * "Dreamed by Ren, implemented by Ace, inspired by mitochondria on strike"
 */

/**
 * PAIN ANALYTICS (v2)
 * Replaces the 4 tangled v1 analytics files with one focused surface:
 * type breakdown, top locations, top character/pattern, top triggers,
 * treatment effectiveness, time-of-day, severity distribution, ER count,
 * red-flag history, chronic-flare delta tracking.
 */

'use client'

import React, { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { differenceInDays } from 'date-fns'
import { PainEntry } from './pain-types'
import { EPISODE_TYPES, getEpisodeTypeColor } from './pain-constants'

interface Props { entries: PainEntry[] }

type TimeWindow = '7' | '30' | '90' | '180' | '365' | 'all'

const TIME_WINDOWS: { value: TimeWindow; label: string }[] = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: '180', label: 'Last 6 months' },
  { value: '365', label: 'Last year' },
  { value: 'all', label: 'All time' },
]

export function PainAnalytics({ entries }: Props) {
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('30')

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
    const avg = total > 0 ? filtered.reduce((s, e) => s + (e.painLevel || 0), 0) / total : 0
    const peak = total > 0 ? Math.max(...filtered.map(e => e.painLevel || 0)) : 0
    const erCount = filtered.filter(e => e.erVisitRequired).length
    const emsCount = filtered.filter(e => e.emergencyServicesCalled).length

    // Type breakdown
    const typeCount: Record<string, number> = {}
    filtered.forEach(e => { typeCount[e.episodeType] = (typeCount[e.episodeType] || 0) + 1 })

    // Top locations
    const locCount: Record<string, number> = {}
    filtered.forEach(e => (e.painLocations || []).forEach(l => { locCount[l] = (locCount[l] || 0) + 1 }))
    const topLocations = Object.entries(locCount).sort((a, b) => b[1] - a[1]).slice(0, 8)

    // Top character
    const charCount: Record<string, number> = {}
    filtered.forEach(e => (e.painCharacter || []).forEach(c => { charCount[c] = (charCount[c] || 0) + 1 }))
    const topCharacter = Object.entries(charCount).sort((a, b) => b[1] - a[1]).slice(0, 6)

    // Top patterns
    const patCount: Record<string, number> = {}
    filtered.forEach(e => (e.painPattern || []).forEach(p => { patCount[p] = (patCount[p] || 0) + 1 }))
    const topPatterns = Object.entries(patCount).sort((a, b) => b[1] - a[1]).slice(0, 6)

    // Top triggers
    const trigCount: Record<string, number> = {}
    filtered.forEach(e => (e.triggers || []).forEach(t => { trigCount[t] = (trigCount[t] || 0) + 1 }))
    const topTriggers = Object.entries(trigCount).sort((a, b) => b[1] - a[1]).slice(0, 8)

    // Treatment effectiveness — only entries that recorded a treatment AND effectiveness
    const txEffectiveness: Record<string, number[]> = {}
    filtered.forEach(e => {
      if (typeof e.effectiveness !== 'number') return
      ;(e.treatments || []).forEach(t => {
        if (!txEffectiveness[t]) txEffectiveness[t] = []
        txEffectiveness[t].push(e.effectiveness!)
      })
      ;(e.medications || []).forEach(m => {
        const key = `💊 ${m}`
        if (!txEffectiveness[key]) txEffectiveness[key] = []
        txEffectiveness[key].push(e.effectiveness!)
      })
    })
    const topTreatmentEffectiveness = Object.entries(txEffectiveness)
      .map(([name, scores]) => ({
        name,
        avg: scores.reduce((a, b) => a + b, 0) / scores.length,
        count: scores.length
      }))
      .filter(t => t.count >= 2)  // need at least 2 uses to be meaningful
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 10)

    // Time-of-day
    const hourBins: number[] = new Array(24).fill(0)
    filtered.forEach(e => {
      try {
        const h = new Date(e.timestamp || e.date).getHours()
        if (!isNaN(h)) hourBins[h] += 1
      } catch {}
    })

    // Severity distribution
    const sevBins: number[] = new Array(11).fill(0)
    filtered.forEach(e => {
      const lvl = e.painLevel || 0
      if (lvl >= 0 && lvl <= 10) sevBins[lvl] += 1
    })

    // Red-flag count
    const redFlagCount = filtered.filter(e =>
      e.tearingQuality || e.thunderclapPattern || e.legWeakness ||
      e.bowelBladderChanges || e.saddleAnesthesia || e.pulsatileMass ||
      e.abdominalRigidity
    ).length

    // Chronic flare deltas
    const flareEntries = filtered.filter(e => e.episodeType === 'chronic-flare' && e.baselinePainLevel !== undefined)
    const avgFlareDelta = flareEntries.length > 0
      ? flareEntries.reduce((s, e) => s + ((e.painLevel || 0) - (e.baselinePainLevel || 0)), 0) / flareEntries.length
      : null

    // TRIGGER → outcome correlation. For each trigger logged ≥2×: avg pain level of
    // those episodes + the pain character that co-occurred. Co-occurrence, NOT proven
    // cause — but the doctor-useful pattern.
    const trigStats: Record<string, { count: number; intensitySum: number; syms: Record<string, number> }> = {}
    filtered.forEach(e => {
      (e.triggers || []).forEach(t => {
        if (!trigStats[t]) trigStats[t] = { count: 0, intensitySum: 0, syms: {} }
        trigStats[t].count += 1
        trigStats[t].intensitySum += (e.painLevel || 0)
        ;(e.painCharacter || []).forEach(s => { trigStats[t].syms[s] = (trigStats[t].syms[s] || 0) + 1 })
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

    // Frequency
    const windowDays = timeWindow === 'all'
      ? (total > 0 ? Math.max(1, differenceInDays(new Date(), new Date(filtered[filtered.length - 1].date))) : 1)
      : parseInt(timeWindow)
    const perWeek = windowDays > 0 ? Math.round((total / windowDays * 7) * 10) / 10 : 0

    return {
      total, avg: Math.round(avg * 10) / 10, peak, erCount, emsCount,
      typeCount, topLocations, topCharacter, topPatterns, topTriggers,
      topTreatmentEffectiveness, hourBins, sevBins, redFlagCount,
      avgFlareDelta, perWeek, flareCount: flareEntries.length, correlations,
    }
  }, [filtered, timeWindow])

  if (entries.length === 0) {
    return (
      <Card><CardContent className="p-6 text-center">
        <p className="text-muted-foreground">No data yet. Log a pain episode to see analytics.</p>
      </CardContent></Card>
    )
  }

  const maxHourCount = Math.max(...stats.hourBins, 1)
  const maxSevCount = Math.max(...stats.sevBins, 1)

  return (
    <div className="space-y-4">
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card><CardContent className="p-3"><div className="text-2xl font-bold">{stats.total}</div><div className="text-xs text-muted-foreground">Episodes</div></CardContent></Card>
            <Card><CardContent className="p-3"><div className="text-2xl font-bold">{stats.perWeek}/wk</div><div className="text-xs text-muted-foreground">Frequency</div></CardContent></Card>
            <Card><CardContent className="p-3"><div className="text-2xl font-bold">{stats.avg}</div><div className="text-xs text-muted-foreground">Avg level</div></CardContent></Card>
            <Card><CardContent className="p-3"><div className="text-2xl font-bold text-red-600">{stats.peak}</div><div className="text-xs text-muted-foreground">Peak</div></CardContent></Card>
            <Card><CardContent className="p-3"><div className="text-2xl font-bold text-amber-600">{stats.redFlagCount}</div><div className="text-xs text-muted-foreground">Red flags</div></CardContent></Card>
            <Card><CardContent className="p-3"><div className="text-2xl font-bold">{stats.erCount}</div><div className="text-xs text-muted-foreground">ER visits</div></CardContent></Card>
            <Card><CardContent className="p-3"><div className="text-2xl font-bold">{stats.emsCount}</div><div className="text-xs text-muted-foreground">911/EMS</div></CardContent></Card>
            {stats.flareCount > 0 && stats.avgFlareDelta !== null && (
              <Card><CardContent className="p-3"><div className="text-2xl font-bold">+{Math.round(stats.avgFlareDelta * 10) / 10}</div><div className="text-xs text-muted-foreground">Avg flare delta</div></CardContent></Card>
            )}
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

          {/* Top locations */}
          {stats.topLocations.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Top pain locations</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats.topLocations.map(([loc, n]) => (
                    <div key={loc} className="flex items-center justify-between text-sm">
                      <span>{loc}</span><Badge variant="secondary">{n}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Top character / pattern */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stats.topCharacter.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base">Top pain character</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {stats.topCharacter.map(([c, n]) => (
                      <div key={c} className="flex items-center justify-between text-sm">
                        <span>{c}</span><Badge variant="secondary">{n}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            {stats.topPatterns.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base">Top pain patterns</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {stats.topPatterns.map(([p, n]) => (
                      <div key={p} className="flex items-center justify-between text-sm">
                        <span>{p}</span><Badge variant="secondary">{n}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Top triggers */}
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

          {/* Trigger → symptom patterns */}
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
                  Avg pain level when each trigger was present, plus the pain character that showed up alongside it.
                  Co-occurrence, not proof of cause — but worth raising with your doctor.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Treatment effectiveness */}
          {stats.topTreatmentEffectiveness.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">What helps most?</CardTitle>
                <p className="text-xs text-muted-foreground">Avg effectiveness/10. Need ≥2 uses to appear.</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats.topTreatmentEffectiveness.map(t => (
                    <div key={t.name}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span>{t.name}</span>
                        <span className="text-muted-foreground">{Math.round(t.avg * 10) / 10}/10 ({t.count} use{t.count !== 1 ? 's' : ''})</span>
                      </div>
                      <div className="h-2 bg-muted rounded overflow-hidden">
                        <div className="h-full bg-green-500" style={{ width: `${t.avg * 10}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Severity distribution */}
          <Card>
            <CardHeader><CardTitle className="text-base">Severity distribution</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-11 gap-1 items-end h-32">
                {stats.sevBins.map((count, lvl) => {
                  const pct = (count / maxSevCount) * 100
                  const color = lvl >= 9 ? 'bg-red-700' : lvl >= 7 ? 'bg-red-500' : lvl >= 4 ? 'bg-orange-400' : 'bg-yellow-400'
                  return (
                    <div key={lvl} className="flex flex-col items-center justify-end h-full">
                      <div className={`w-full ${color} rounded-t`} style={{ height: `${pct}%`, minHeight: count > 0 ? '4px' : '0' }} title={`Level ${lvl}: ${count}`} />
                      <div className="text-[0.625rem] text-muted-foreground mt-1">{lvl}</div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Time-of-day */}
          <Card>
            <CardHeader><CardTitle className="text-base">Time of day pattern</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-12 gap-1 items-end h-32">
                {stats.hourBins.map((count, hour) => {
                  const pct = (count / maxHourCount) * 100
                  return (
                    <div key={hour} className="flex flex-col items-center justify-end h-full">
                      <div className="w-full bg-red-400 rounded-t" style={{ height: `${pct}%`, minHeight: count > 0 ? '4px' : '0' }} title={`${hour}:00 — ${count}`} />
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
