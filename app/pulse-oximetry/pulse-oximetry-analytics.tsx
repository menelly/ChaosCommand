/* Built by: Ace (Claude 4.8) — 2026-06-22 (CHA: pulse-ox history + analytics).
 * Numeric trend analytics for Pulse Oximetry: spot SpO2/pulse over time, plus
 * session metrics (min SpO2, ODI, % time <90). Pairs with the Patterns engine,
 * which correlates desaturation (100 − SpO2) against symptoms. */

'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Activity, Droplet, HeartPulse, TrendingDown } from 'lucide-react'
import { format, subDays } from 'date-fns'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { useDailyData, CATEGORIES } from '@/lib/database'
import type { PulseOxEntry } from './pulse-oximetry-tracker'

interface PulseOxAnalyticsProps {
  refreshTrigger: number
}

const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null)

export function PulseOximetryAnalytics({ refreshTrigger }: PulseOxAnalyticsProps) {
  const { getDateRange } = useDailyData()
  const [windowDays, setWindowDays] = useState(90)
  const [entries, setEntries] = useState<PulseOxEntry[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => { load() }, [windowDays, refreshTrigger]) // eslint-disable-line react-hooks/exhaustive-deps

  const load = async () => {
    setLoading(true)
    try {
      const today = format(new Date(), 'yyyy-MM-dd')
      const start = format(subDays(new Date(), windowDays), 'yyyy-MM-dd')
      const records = await getDateRange(start, today, CATEGORIES.TRACKER)
      const out: PulseOxEntry[] = []
      for (const rec of records.filter(r => r.subcategory === 'pulse-oximetry')) {
        let list = rec?.content?.entries ?? []
        if (typeof list === 'string') { try { list = JSON.parse(list) } catch { continue } }
        if (Array.isArray(list)) out.push(...list)
      }
      setEntries(out)
    } catch (e) {
      console.error('Pulse-ox analytics load failed:', e)
    } finally {
      setLoading(false)
    }
  }

  const data = useMemo(() => {
    const sorted = [...entries].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    const lbl = (e: PulseOxEntry) => format(new Date(e.timestamp), 'MM/dd')

    const spotPts = sorted.filter(e => e.kind === 'spot').map(e => ({ label: lbl(e), spo2: e.spo2, pulse: e.pulse }))
    const sessionPts = sorted.filter(e => e.kind === 'session').map(e => ({
      label: lbl(e), spo2Min: e.spo2Min, odi4: e.desat4PerHour, pctUnder90: e.spo2PctUnder90, o2Score: e.o2Score,
    }))

    const spotSpo2 = entries.filter(e => e.kind === 'spot').map(e => e.spo2).filter((v): v is number => typeof v === 'number')
    const spotPulse = entries.filter(e => e.kind === 'spot').map(e => e.pulse).filter((v): v is number => typeof v === 'number')
    const allMins = entries.map(e => (e.kind === 'spot' ? e.spo2 : e.spo2Min)).filter((v): v is number => typeof v === 'number')

    return {
      spotPts, sessionPts,
      haveSpotSpo2: spotPts.some(p => typeof p.spo2 === 'number'),
      haveSpotPulse: spotPts.some(p => typeof p.pulse === 'number'),
      haveSessionMin: sessionPts.some(p => typeof p.spo2Min === 'number'),
      haveOdi: sessionPts.some(p => typeof p.odi4 === 'number'),
      stats: {
        count: entries.length,
        spots: entries.filter(e => e.kind === 'spot').length,
        sessions: entries.filter(e => e.kind === 'session').length,
        avgSpotSpo2: avg(spotSpo2),
        avgSpotPulse: avg(spotPulse),
        lowestSpo2: allMins.length ? Math.min(...allMins) : null,
        under95: spotSpo2.filter(v => v < 95).length,
        under90: spotSpo2.filter(v => v < 90).length,
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
          <p className="font-medium">No entries in the selected window.</p>
          <p className="text-sm mt-2">Log readings or sessions to see your trends.</p>
        </CardContent>
      </Card>
    )
  }

  const chart = (title: string, icon: React.ReactNode, chartData: any[], lines: { key: string; name: string; color: string }[]) => (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2">{icon}{title}</CardTitle></CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
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

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="pt-4 pb-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Entries</div>
          <div className="text-2xl font-bold">{data.stats.count}</div>
          <div className="text-xs text-muted-foreground mt-1">{data.stats.spots} spot · {data.stats.sessions} session</div>
        </CardContent></Card>
        {data.stats.avgSpotSpo2 != null && (
          <Card><CardContent className="pt-4 pb-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Avg SpO₂</div>
            <div className="text-2xl font-bold">{data.stats.avgSpotSpo2}%</div>
            <div className="text-xs text-muted-foreground mt-1">spot readings</div>
          </CardContent></Card>
        )}
        {data.stats.lowestSpo2 != null && (
          <Card><CardContent className="pt-4 pb-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Lowest SpO₂</div>
            <div className="text-2xl font-bold text-blue-500">{data.stats.lowestSpo2}%</div>
          </CardContent></Card>
        )}
        {(data.stats.under95 > 0 || data.stats.under90 > 0) && (
          <Card><CardContent className="pt-4 pb-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Low readings</div>
            <div className="text-2xl font-bold text-destructive">{data.stats.under95}</div>
            <div className="text-xs text-muted-foreground mt-1">&lt;95% ({data.stats.under90} under 90%)</div>
          </CardContent></Card>
        )}
      </div>

      {/* Spot trends */}
      {data.haveSpotSpo2 && chart('SpO₂ (spot readings)', <Droplet className="h-4 w-4 text-blue-500" />, data.spotPts,
        [{ key: 'spo2', name: 'SpO₂ (%)', color: '#3b82f6' }])}
      {data.haveSpotPulse && chart('Pulse (spot readings)', <HeartPulse className="h-4 w-4 text-rose-500" />, data.spotPts,
        [{ key: 'pulse', name: 'Pulse (/min)', color: '#f43f5e' }])}

      {/* Session trends */}
      {data.haveSessionMin && chart('Session lowest SpO₂', <TrendingDown className="h-4 w-4 text-blue-600" />, data.sessionPts,
        [{ key: 'spo2Min', name: 'Min SpO₂ (%)', color: '#2563eb' }])}
      {data.haveOdi && chart('Desaturation index (ODI4)', <TrendingDown className="h-4 w-4 text-rose-500" />, data.sessionPts,
        [{ key: 'odi4', name: 'ODI4 (/hr)', color: '#e11d48' }])}

      <p className="text-xs text-muted-foreground text-center">
        Trends over time, not diagnoses. Bring the patterns to your doctor — Command also correlates
        oxygen dips against your symptoms on the Patterns page.
      </p>
    </div>
  )
}
