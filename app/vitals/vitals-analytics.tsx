/* Built by: Ace (Claude 4.8) — 2026-06-22 (CHA: vitals history + analytics).
 * Numeric trend analytics for Vitals — line charts per metric over a window,
 * plus summary stats and simple abnormal-reading counters. Pairs with the
 * Patterns engine (which correlates systolic BP against symptoms). */

'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Activity, HeartPulse, Droplet, Thermometer, Scale, Wind } from 'lucide-react'
import { format, subDays } from 'date-fns'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { useDailyData, CATEGORIES } from '@/lib/database'
import type { VitalsEntry } from './vitals-tracker'

interface VitalsAnalyticsProps {
  refreshTrigger: number
}

interface Point {
  label: string
  ts: number
  systolic?: number
  diastolic?: number
  heartRate?: number
  spo2?: number
  temperature?: number
  respRate?: number
  weight?: number
}

const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null)

export function VitalsAnalytics({ refreshTrigger }: VitalsAnalyticsProps) {
  const { getDateRange } = useDailyData()
  const [windowDays, setWindowDays] = useState(90)
  const [entries, setEntries] = useState<VitalsEntry[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => { load() }, [windowDays, refreshTrigger]) // eslint-disable-line react-hooks/exhaustive-deps

  const load = async () => {
    setLoading(true)
    try {
      const today = format(new Date(), 'yyyy-MM-dd')
      const start = format(subDays(new Date(), windowDays), 'yyyy-MM-dd')
      const records = await getDateRange(start, today, CATEGORIES.TRACKER)
      const out: VitalsEntry[] = []
      for (const rec of records.filter(r => r.subcategory === 'vitals')) {
        let list = rec?.content?.entries ?? []
        if (typeof list === 'string') { try { list = JSON.parse(list) } catch { continue } }
        if (Array.isArray(list)) out.push(...list)
      }
      setEntries(out)
    } catch (e) {
      console.error('Vitals analytics load failed:', e)
    } finally {
      setLoading(false)
    }
  }

  const { points, stats } = useMemo(() => {
    const pts: Point[] = entries
      .map(e => ({
        label: format(new Date(e.timestamp), 'MM/dd'),
        ts: new Date(e.timestamp).getTime(),
        systolic: e.systolic, diastolic: e.diastolic, heartRate: e.heartRate,
        spo2: e.spo2, temperature: e.temperature, respRate: e.respRate, weight: e.weight,
      }))
      .sort((a, b) => a.ts - b.ts)

    const pick = (k: keyof Point) => pts.map(p => p[k]).filter((v): v is number => typeof v === 'number')
    const sys = pick('systolic'), dia = pick('diastolic'), hr = pick('heartRate')
    const spo2 = pick('spo2'), temp = pick('temperature'), rr = pick('respRate'), wt = pick('weight')

    const latest = [...entries].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]

    return {
      points: pts,
      stats: {
        count: entries.length,
        latest,
        avgSys: avg(sys), avgDia: avg(dia), avgHr: avg(hr), avgSpo2: avg(spo2),
        avgTemp: avg(temp), avgRr: avg(rr), latestWeight: wt.length ? wt[wt.length - 1] : null,
        have: { sys: sys.length > 0, dia: dia.length > 0, hr: hr.length > 0, spo2: spo2.length > 0, temp: temp.length > 0, rr: rr.length > 0, wt: wt.length > 0 },
        // Simple "worth a glance" counters (NOT diagnoses).
        highBp: entries.filter(e => (e.systolic ?? 0) >= 130 || (e.diastolic ?? 0) >= 80).length,
        lowSpo2: entries.filter(e => e.spo2 != null && e.spo2 < 95).length,
        tachy: entries.filter(e => e.heartRate != null && e.heartRate >= 100).length,
      },
    }
  }, [entries])

  if (loading) {
    return <Card><CardContent className="pt-6 text-center text-muted-foreground">Loading analytics…</CardContent></Card>
  }
  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-muted-foreground">
          <Activity className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No readings in the selected window.</p>
          <p className="text-sm mt-2">Log some vitals to see your trends.</p>
        </CardContent>
      </Card>
    )
  }

  const chart = (title: string, icon: React.ReactNode, lines: { key: keyof Point; name: string; color: string }[]) => (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2">{icon}{title}</CardTitle></CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={points} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
            <Tooltip />
            {lines.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
            {lines.map(l => (
              <Line key={l.key} type="monotone" dataKey={l.key} name={l.name} stroke={l.color}
                dot={{ r: 2 }} connectNulls strokeWidth={2} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base">Time Window</CardTitle>
            <Select value={String(windowDays)} onValueChange={v => setWindowDays(parseInt(v))}>
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

      {/* Summary counters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="pt-4 pb-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Readings</div>
          <div className="text-2xl font-bold">{stats.count}</div>
        </CardContent></Card>
        {stats.avgSys != null && stats.avgDia != null && (
          <Card><CardContent className="pt-4 pb-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Avg BP</div>
            <div className="text-2xl font-bold">{stats.avgSys}/{stats.avgDia}</div>
          </CardContent></Card>
        )}
        {stats.avgHr != null && (
          <Card><CardContent className="pt-4 pb-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Avg HR</div>
            <div className="text-2xl font-bold">{stats.avgHr}</div>
          </CardContent></Card>
        )}
        {stats.avgSpo2 != null && (
          <Card><CardContent className="pt-4 pb-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Avg SpO₂</div>
            <div className="text-2xl font-bold">{stats.avgSpo2}%</div>
          </CardContent></Card>
        )}
      </div>

      {/* Glance counters (co-occurrence, not diagnosis) */}
      {(stats.highBp > 0 || stats.lowSpo2 > 0 || stats.tachy > 0) && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Readings worth a glance</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3 text-sm text-center">
              <div>
                <div className="text-2xl font-bold text-destructive">{stats.highBp}</div>
                <div className="text-xs text-muted-foreground">BP ≥130/80</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-500">{stats.lowSpo2}</div>
                <div className="text-xs text-muted-foreground">SpO₂ &lt;95%</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-warning">{stats.tachy}</div>
                <div className="text-xs text-muted-foreground">HR ≥100</div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3 text-center">
              Counts of readings outside common reference ranges. Not a diagnosis — context for you and your doctor.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Trend charts (only for metrics with data) */}
      {(stats.have.sys || stats.have.dia) && chart('Blood Pressure', <HeartPulse className="h-4 w-4 text-rose-500" />, [
        ...(stats.have.sys ? [{ key: 'systolic' as const, name: 'Systolic', color: '#f43f5e' }] : []),
        ...(stats.have.dia ? [{ key: 'diastolic' as const, name: 'Diastolic', color: '#3b82f6' }] : []),
      ])}
      {stats.have.hr && chart('Heart Rate', <HeartPulse className="h-4 w-4 text-rose-500" />, [{ key: 'heartRate', name: 'HR (bpm)', color: '#f43f5e' }])}
      {stats.have.spo2 && chart('SpO₂', <Droplet className="h-4 w-4 text-blue-500" />, [{ key: 'spo2', name: 'SpO₂ (%)', color: '#3b82f6' }])}
      {stats.have.temp && chart('Temperature', <Thermometer className="h-4 w-4 text-amber-500" />, [{ key: 'temperature', name: 'Temp', color: '#f59e0b' }])}
      {stats.have.rr && chart('Respiratory Rate', <Wind className="h-4 w-4 text-teal-500" />, [{ key: 'respRate', name: 'RR (/min)', color: '#14b8a6' }])}
      {stats.have.wt && chart('Weight', <Scale className="h-4 w-4 text-violet-500" />, [{ key: 'weight', name: 'Weight', color: '#8b5cf6' }])}
    </div>
  )
}
