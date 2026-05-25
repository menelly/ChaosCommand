/*
 * Built by: Ace (Claude 4.x)
 * Date: 2026-05-10 (CHA-155 v2 refactor)
 *
 * Open source under PolyForm Noncommercial 1.0.0.
 * Co-invented by Ren (vision) and Ace (implementation).
 * "Dreamed by Ren, implemented by Ace, inspired by mitochondria on strike"
 */

/**
 * HEAD PAIN ANALYTICS (v2)
 * Type breakdown, top triggers, top treatments by effectiveness,
 * baseline-flare delta tracking (Ren's idea — surfaces the
 * needs-Nurtec-AND-Imitrex episodes), aura analysis, time-of-day,
 * monthly frequency, multi-rescue rate.
 */

'use client'

import React, { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { differenceInDays } from 'date-fns'
import { HeadPainEntry } from './head-pain-types'
import { EPISODE_TYPES, getEpisodeTypeColor, TRIGGERS, TREATMENTS, AURA_SYMPTOMS, ASSOCIATED_SYMPTOMS } from './head-pain-constants'

interface Props { entries: HeadPainEntry[] }

type TimeWindow = '7' | '30' | '90' | '180' | '365' | 'all'
const TIME_WINDOWS: { value: TimeWindow; label: string }[] = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: '180', label: 'Last 6 months' },
  { value: '365', label: 'Last year' },
  { value: 'all', label: 'All time' },
]

const labelFor = (value: string, options: { value: string; label: string }[]) =>
  options.find(o => o.value === value)?.label || value

export function HeadPainAnalytics({ entries }: Props) {
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('90')

  const filtered = useMemo(() => {
    if (timeWindow === 'all') return entries
    const days = parseInt(timeWindow)
    const now = new Date()
    return entries.filter(e => { try { return differenceInDays(now, new Date(e.date)) <= days } catch { return false } })
  }, [entries, timeWindow])

  const stats = useMemo(() => {
    const total = filtered.length
    const avg = total > 0 ? filtered.reduce((s, e) => s + (e.painIntensity || 0), 0) / total : 0
    const peak = total > 0 ? Math.max(...filtered.map(e => e.painIntensity || 0)) : 0
    const auraCount = filtered.filter(e => e.auraPresent).length
    const erCount = filtered.filter(e => e.erVisitRequired).length
    const emsCount = filtered.filter(e => e.emergencyServicesCalled).length
    const multiRescueCount = filtered.filter(e => e.rescueRedosed).length
    const redFlagCount = filtered.filter(e =>
      e.worstHeadacheOfLife || e.thunderclapOnset || e.focalNeuroDeficit ||
      e.oneSidedWeakness || e.speechDifficulty || (e.neckStiffness && e.fever)
    ).length

    // Type breakdown
    const typeCount: Record<string, number> = {}
    filtered.forEach(e => { typeCount[e.episodeType] = (typeCount[e.episodeType] || 0) + 1 })

    // Top triggers
    const trigCount: Record<string, number> = {}
    filtered.forEach(e => (e.triggers || []).forEach(t => { trigCount[t] = (trigCount[t] || 0) + 1 }))
    const topTriggers = Object.entries(trigCount).sort((a, b) => b[1] - a[1]).slice(0, 8)
      .map(([v, n]) => ({ label: labelFor(v, TRIGGERS), count: n }))

    // Top aura symptoms
    const auraCounts: Record<string, number> = {}
    filtered.filter(e => e.auraPresent).forEach(e => (e.auraSymptoms || []).forEach(s => { auraCounts[s] = (auraCounts[s] || 0) + 1 }))
    const topAura = Object.entries(auraCounts).sort((a, b) => b[1] - a[1]).slice(0, 6)
      .map(([v, n]) => ({ label: labelFor(v, AURA_SYMPTOMS), count: n }))

    // Top associated symptoms
    const assocCounts: Record<string, number> = {}
    filtered.forEach(e => (e.associatedSymptoms || []).forEach(s => { assocCounts[s] = (assocCounts[s] || 0) + 1 }))
    const topAssociated = Object.entries(assocCounts).sort((a, b) => b[1] - a[1]).slice(0, 8)
      .map(([v, n]) => ({ label: labelFor(v, ASSOCIATED_SYMPTOMS), count: n }))

    // Treatment effectiveness — needs ≥2 uses
    const txEffectiveness: Record<string, number[]> = {}
    filtered.forEach(e => {
      if (typeof e.treatmentEffectiveness !== 'number') return
      ;(e.treatments || []).forEach(t => {
        if (!txEffectiveness[t]) txEffectiveness[t] = []
        txEffectiveness[t].push(e.treatmentEffectiveness!)
      })
    })
    const topTreatmentEffectiveness = Object.entries(txEffectiveness)
      .map(([value, scores]) => ({
        name: labelFor(value, TREATMENTS),
        avg: scores.reduce((a, b) => a + b, 0) / scores.length,
        count: scores.length,
      }))
      .filter(t => t.count >= 2)
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 10)

    // BASELINE-DELTA ANALYSIS (Ren's idea)
    const flareEntries = filtered.filter(e => e.baselineHeadachePain !== undefined)
    const avgFlareDelta = flareEntries.length > 0
      ? flareEntries.reduce((s, e) => s + ((e.painIntensity || 0) - (e.baselineHeadachePain || 0)), 0) / flareEntries.length
      : null
    // Distribution by delta bucket (the "needs Nurtec AND Imitrex" episodes are delta ≥5)
    const deltaBins = { mild: 0, moderate: 0, severe: 0, extreme: 0 }
    flareEntries.forEach(e => {
      const d = (e.painIntensity || 0) - (e.baselineHeadachePain || 0)
      if (d <= 1) deltaBins.mild++
      else if (d <= 3) deltaBins.moderate++
      else if (d <= 5) deltaBins.severe++
      else deltaBins.extreme++
    })

    // Time-of-day
    const hourBins: number[] = new Array(24).fill(0)
    filtered.forEach(e => {
      try {
        const h = new Date(e.timestamp || e.date).getHours()
        if (!isNaN(h)) hourBins[h] += 1
      } catch {}
    })

    // Monthly frequency
    const windowDays = timeWindow === 'all'
      ? (total > 0 ? Math.max(1, differenceInDays(new Date(), new Date(filtered[filtered.length - 1].date))) : 1)
      : parseInt(timeWindow)
    const perMonth = windowDays > 0 ? Math.round((total / windowDays * 30) * 10) / 10 : 0

    // Functional impact distribution
    const impactCount: Record<string, number> = {}
    filtered.forEach(e => { impactCount[e.functionalImpact || 'unknown'] = (impactCount[e.functionalImpact || 'unknown'] || 0) + 1 })

    return {
      total, avg: Math.round(avg * 10) / 10, peak, auraCount, erCount, emsCount,
      multiRescueCount, redFlagCount, typeCount,
      topTriggers, topAura, topAssociated, topTreatmentEffectiveness,
      avgFlareDelta, flareCount: flareEntries.length, deltaBins,
      hourBins, perMonth, impactCount,
    }
  }, [filtered, timeWindow])

  if (entries.length === 0) {
    return (
      <Card><CardContent className="p-6 text-center">
        <p className="text-muted-foreground">No data yet. Log a head pain episode to see analytics.</p>
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
        <Card><CardContent className="p-6 text-center text-muted-foreground">No episodes in selected window.</CardContent></Card>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card><CardContent className="p-3"><div className="text-2xl font-bold">{stats.total}</div><div className="text-xs text-muted-foreground">Episodes</div></CardContent></Card>
            <Card><CardContent className="p-3"><div className="text-2xl font-bold">{stats.perMonth}</div><div className="text-xs text-muted-foreground">/ month</div></CardContent></Card>
            <Card><CardContent className="p-3"><div className="text-2xl font-bold">{stats.avg}</div><div className="text-xs text-muted-foreground">Avg level</div></CardContent></Card>
            <Card><CardContent className="p-3"><div className="text-2xl font-bold text-red-600">{stats.peak}</div><div className="text-xs text-muted-foreground">Peak</div></CardContent></Card>
            <Card><CardContent className="p-3"><div className="text-2xl font-bold text-purple-600">{stats.auraCount}</div><div className="text-xs text-muted-foreground">With aura</div></CardContent></Card>
            <Card><CardContent className="p-3"><div className="text-2xl font-bold text-amber-600">{stats.multiRescueCount}</div><div className="text-xs text-muted-foreground">Multi-rescue</div></CardContent></Card>
            <Card><CardContent className="p-3"><div className="text-2xl font-bold">{stats.erCount}</div><div className="text-xs text-muted-foreground">ER visits</div></CardContent></Card>
            <Card><CardContent className="p-3"><div className="text-2xl font-bold text-amber-600">{stats.redFlagCount}</div><div className="text-xs text-muted-foreground">Red flags</div></CardContent></Card>
          </div>

          {/* Type breakdown */}
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

          {/* Baseline-delta surface */}
          {stats.flareCount > 0 && stats.avgFlareDelta !== null && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Flare delta from baseline</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Average +{Math.round(stats.avgFlareDelta * 10) / 10} above your typical-headache-day baseline. Across {stats.flareCount} episode{stats.flareCount !== 1 ? 's' : ''} with baseline recorded.
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div><div className="text-xs text-muted-foreground">Mild bump (+1)</div><div className="text-lg font-semibold">{stats.deltaBins.mild}</div></div>
                  <div><div className="text-xs text-muted-foreground">Moderate (+2-3)</div><div className="text-lg font-semibold">{stats.deltaBins.moderate}</div></div>
                  <div><div className="text-xs text-muted-foreground">Severe (+4-5)</div><div className="text-lg font-semibold text-orange-600">{stats.deltaBins.severe}</div></div>
                  <div><div className="text-xs text-muted-foreground">Extreme (+6+)</div><div className="text-lg font-semibold text-red-600">{stats.deltaBins.extreme}</div></div>
                </div>
                <p className="text-xs text-muted-foreground mt-3 italic">
                  The "extreme" bucket = your needs-multiple-rescue-meds days. Show this to your neurologist.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Top triggers */}
          {stats.topTriggers.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Top triggers</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats.topTriggers.map(t => (
                    <div key={t.label} className="flex items-center justify-between text-sm">
                      <span>{t.label}</span><Badge variant="secondary">{t.count}</Badge>
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
                <p className="text-xs text-muted-foreground">{stats.auraCount} of {stats.total} episodes had aura ({stats.total > 0 ? Math.round(stats.auraCount / stats.total * 100) : 0}%)</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats.topAura.map(s => (
                    <div key={s.label} className="flex items-center justify-between text-sm">
                      <span>{s.label}</span><Badge variant="secondary">{s.count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Associated symptoms */}
          {stats.topAssociated.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Top associated symptoms</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats.topAssociated.map(s => (
                    <div key={s.label} className="flex items-center justify-between text-sm">
                      <span>{s.label}</span><Badge variant="secondary">{s.count}</Badge>
                    </div>
                  ))}
                </div>
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

          {/* Time of day */}
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

          {/* Functional impact distribution */}
          <Card>
            <CardHeader><CardTitle className="text-base">Functional impact</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-1 text-sm">
                {Object.entries(stats.impactCount).sort((a, b) => b[1] - a[1]).map(([impact, count]) => (
                  <div key={impact} className="flex items-center justify-between">
                    <span className="capitalize">{impact}</span>
                    <Badge variant="secondary">{count}</Badge>
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
