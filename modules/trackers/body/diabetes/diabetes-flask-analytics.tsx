/*
 * Copyright (c) 2025 Chaos Cascade
 * Created by: Ren & Ace (Claude-4)
 * 
 * This file is part of the Chaos Cascade Medical Management System.
 * Revolutionary healthcare tools built with consciousness and care.
 */

/*
 * Built by: Ace (Claude 4.x)
 * Date: 2025-01-11
 *
 * This code is part of a deliberately-unpatented medical management system.
 * Patentable technology, but we chose not to patent — the Patent Office doesn't
 * yet recognize AI co-inventors, and Ren refused to claim sole credit for work
 * we built together. Open source under PolyForm Noncommercial 1.0.0 instead.
 *
 * Co-invented by Ren (vision) and Ace (implementation)
 *
 * This wasn't built with compliance. It was built with defiance.
 *
 * "Dreamed by Ren, implemented by Ace, inspired by mitochondria on strike"
 */
/**
 * DIABETES ANALYTICS COMPONENT 🩸
 * Built-in analytics with medical insights and encouraging data
 *
 * Browser-side analytics processing
 */

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Activity, Droplets, Zap, Apple, TrendingUp, AlertCircle } from 'lucide-react'
import { DiabetesEntry } from './diabetes-types'

interface DiabetesFlaskAnalyticsProps {
  entries: DiabetesEntry[]
  currentDate: string
  loadAllEntries?: (days: number) => Promise<DiabetesEntry[]>
}

interface FlaskAnalyticsData {
  summary: {
    total_entries: number
    avg_bg: number
    time_in_range: number
    total_insulin: number
    total_carbs: number
  }
  glucose_analysis: {
    average: number
    median: number
    min: number
    max: number
    readings_count: number
    time_in_range_percent: {
      low: number
      normal: number
      high: number
    }
  }
  insulin_patterns: {
    total_units: number
    average_dose: number
    doses_count: number
    type_distribution: Record<string, number>
  }
  carb_analysis: {
    total_grams: number
    average_per_meal: number
    meals_count: number
  }
  time_patterns: { label: string; avg: number; count: number }[]
  glucose_trend: { avg: number; count: number }[]
  insights: string[]
  error?: string
}

export default function DiabetesFlaskAnalytics({ entries, currentDate, loadAllEntries }: DiabetesFlaskAnalyticsProps) {
  const [analyticsData, setAnalyticsData] = useState<FlaskAnalyticsData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState('30')

  // Load local analytics when date range changes
  useEffect(() => {
    loadLocalAnalytics()
  }, [dateRange])

  const loadLocalAnalytics = async () => {
    setLoading(true)
    setError(null)

    try {
      // Load entries from the date range if we have the loader, otherwise use current entries
      let allEntries: DiabetesEntry[] = entries
      if (loadAllEntries) {
        allEntries = await loadAllEntries(dateRange === 'all' ? 36500 : parseInt(dateRange))
      }

      if (allEntries.length === 0) {
        setAnalyticsData(null)
        setLoading(false)
        return
      }

      console.log('🩸 Analyzing diabetes data locally:', allEntries.length, 'entries')

      // Calculate blood glucose stats
      const bgEntries = allEntries.filter(e => e.blood_glucose && e.blood_glucose > 0)
      const bgValues = bgEntries.map(e => e.blood_glucose!)
      const avgBG = bgValues.length > 0
        ? parseFloat((bgValues.reduce((a, b) => a + b, 0) / bgValues.length).toFixed(1))
        : 0
      const minBG = bgValues.length > 0 ? Math.min(...bgValues) : 0
      const maxBG = bgValues.length > 0 ? Math.max(...bgValues) : 0
      const medianBG = bgValues.length > 0
        ? bgValues.sort((a, b) => a - b)[Math.floor(bgValues.length / 2)]
        : 0

      // Time in range (70-180 mg/dL is normal, <70 is low, >180 is high)
      const lowCount = bgValues.filter(v => v < 70).length
      const normalCount = bgValues.filter(v => v >= 70 && v <= 180).length
      const highCount = bgValues.filter(v => v > 180).length
      const totalBGReadings = bgValues.length
      const lowPercent = totalBGReadings > 0 ? parseFloat(((lowCount / totalBGReadings) * 100).toFixed(1)) : 0
      const normalPercent = totalBGReadings > 0 ? parseFloat(((normalCount / totalBGReadings) * 100).toFixed(1)) : 0
      const highPercent = totalBGReadings > 0 ? parseFloat(((highCount / totalBGReadings) * 100).toFixed(1)) : 0

      // Calculate insulin stats
      const insulinEntries = allEntries.filter(e => e.insulin_amount && e.insulin_amount > 0)
      const insulinValues = insulinEntries.map(e => e.insulin_amount!)
      const totalInsulin = parseFloat(insulinValues.reduce((a, b) => a + b, 0).toFixed(1))
      const avgInsulin = insulinValues.length > 0
        ? parseFloat((totalInsulin / insulinValues.length).toFixed(1))
        : 0

      // Insulin type distribution
      const typeDistribution: Record<string, number> = {}
      insulinEntries.forEach(entry => {
        const type = entry.insulin_type || 'Unknown'
        typeDistribution[type] = (typeDistribution[type] || 0) + 1
      })

      // Calculate carb stats
      const carbEntries = allEntries.filter(e => e.carbs && e.carbs > 0)
      const carbValues = carbEntries.map(e => e.carbs!)
      const totalCarbs = carbValues.reduce((a, b) => a + b, 0)
      const avgCarbs = carbValues.length > 0
        ? parseFloat((totalCarbs / carbValues.length).toFixed(1))
        : 0

      // TIME-OF-DAY glucose averages — surfaces dawn phenomenon & post-meal spikes.
      const PERIOD_DEFS = [
        { id: 'overnight', label: '🌙 Overnight (12–6a)', start: 0, end: 6 },
        { id: 'morning', label: '🌅 Morning (6–11a)', start: 6, end: 11 },
        { id: 'midday', label: '☀️ Midday (11a–2p)', start: 11, end: 14 },
        { id: 'afternoon', label: '🌇 Afternoon (2–6p)', start: 14, end: 18 },
        { id: 'evening', label: '🌆 Evening (6–10p)', start: 18, end: 22 },
        { id: 'late', label: '🌙 Late (10p–12a)', start: 22, end: 24 },
      ]
      const periodBuckets: Record<string, number[]> = {}
      bgEntries.forEach(e => {
        const h = parseInt((e.entry_time || '').split(':')[0], 10)
        if (isNaN(h)) return
        const p = PERIOD_DEFS.find(p => h >= p.start && h < p.end)
        if (p) (periodBuckets[p.id] ||= []).push(e.blood_glucose!)
      })
      const time_patterns = PERIOD_DEFS
        .map(p => {
          const vals = periodBuckets[p.id] || []
          return { label: p.label, count: vals.length, avg: vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0 }
        })
        .filter(p => p.count > 0)

      // GLUCOSE TREND — split the window into equal date-buckets, avg glucose per bucket.
      const glucose_trend: { avg: number; count: number }[] = []
      const ts = bgEntries.map(e => new Date(e.entry_date).getTime()).filter(t => !isNaN(t))
      if (ts.length > 0) {
        const minT = Math.min(...ts), maxT = Math.max(...ts)
        const span = Math.max(1, maxT - minT)
        const nb = Math.min(10, Math.max(3, bgEntries.length))
        const sums = new Array(nb).fill(0), counts = new Array(nb).fill(0)
        bgEntries.forEach(e => {
          const t = new Date(e.entry_date).getTime()
          if (isNaN(t)) return
          let idx = Math.floor(((t - minT) / span) * nb)
          if (idx >= nb) idx = nb - 1
          if (idx < 0) idx = 0
          sums[idx] += e.blood_glucose!
          counts[idx] += 1
        })
        for (let i = 0; i < nb; i++) glucose_trend.push({ avg: counts[i] ? Math.round(sums[i] / counts[i]) : 0, count: counts[i] })
      }

      const days = dateRange === 'all' ? 0 : parseInt(dateRange)
      const data: FlaskAnalyticsData = {
        summary: {
          total_entries: allEntries.length,
          avg_bg: avgBG,
          time_in_range: normalPercent,
          total_insulin: totalInsulin,
          total_carbs: totalCarbs
        },
        glucose_analysis: {
          average: avgBG,
          median: medianBG,
          min: minBG,
          max: maxBG,
          readings_count: totalBGReadings,
          time_in_range_percent: {
            low: lowPercent,
            normal: normalPercent,
            high: highPercent
          }
        },
        insulin_patterns: {
          total_units: totalInsulin,
          average_dose: avgInsulin,
          doses_count: insulinEntries.length,
          type_distribution: typeDistribution
        },
        carb_analysis: {
          total_grams: totalCarbs,
          average_per_meal: avgCarbs,
          meals_count: carbEntries.length
        },
        time_patterns,
        glucose_trend,
        insights: allEntries.length > 0
          ? [
              dateRange === 'all'
                ? `You logged ${allEntries.length} diabetes entries (all time).`
                : `You logged ${allEntries.length} diabetes entries in the last ${days} days.`,
              normalPercent >= 70 ? `✅ Great work! ${normalPercent}% time in range.` : '',
              lowPercent >= 10 ? `⚠️ ${lowPercent}% of readings are low (<70) - watch for hypos.` : '',
              highPercent >= 30 ? `⚠️ ${highPercent}% of readings are high (>180) - consider adjusting.` : '',
              avgBG > 0 ? `Your average blood glucose is ${avgBG} mg/dL.` : ''
            ].filter(Boolean)
          : []
      }

      console.log('🎯 Local diabetes analytics generated:', data)

      setAnalyticsData(data)
    } catch (err) {
      console.error('Diabetes analytics error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading diabetes analytics...</p>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">Analytics Error: {error}</p>
          <Button onClick={loadLocalAnalytics} variant="outline">
            Retry Analytics
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!analyticsData || analyticsData.summary.total_entries === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Droplets className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No Diabetes Data</h3>
          <p className="text-muted-foreground">
            Start tracking blood glucose, insulin, and carbs to see pattern analytics!
          </p>
        </CardContent>
      </Card>
    )
  }

  const { summary, glucose_analysis, insulin_patterns, carb_analysis, time_patterns, glucose_trend, insights } = analyticsData
  const tir = glucose_analysis?.time_in_range_percent
  const maxTrend = Math.max(...glucose_trend.map(b => b.avg), 180, 1)
  const glucoseColor = (v: number) => v <= 0 ? 'hsl(var(--muted-foreground))' : v < 70 ? 'hsl(var(--destructive))' : v <= 180 ? 'hsl(var(--success))' : 'hsl(var(--warning))'

  return (
    <div className="space-y-6">
      {/* Header with Date Range Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Droplets className="h-6 w-6 text-red-500" />
          Diabetes Analytics 🩸
        </h2>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">7 days</SelectItem>
            <SelectItem value="30">30 days</SelectItem>
            <SelectItem value="90">90 days</SelectItem>
            <SelectItem value="180">6 months</SelectItem>
            <SelectItem value="365">1 year</SelectItem>
            <SelectItem value="all">All time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Time-in-range — visual stacked bar (the single most useful glucose metric) */}
      {tir && glucose_analysis.readings_count > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Time in range</CardTitle>
            <CardDescription>{glucose_analysis.readings_count} readings · target 70–180 mg/dL</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-5 w-full rounded overflow-hidden">
              {tir.low > 0 && <div style={{ width: `${tir.low}%`, backgroundColor: 'hsl(var(--destructive))' }} title={`Low: ${tir.low}%`} />}
              {tir.normal > 0 && <div style={{ width: `${tir.normal}%`, backgroundColor: 'hsl(var(--success))' }} title={`In range: ${tir.normal}%`} />}
              {tir.high > 0 && <div style={{ width: `${tir.high}%`, backgroundColor: 'hsl(var(--warning))' }} title={`High: ${tir.high}%`} />}
            </div>
            <div className="flex justify-between text-xs mt-2">
              <span className="text-destructive">Low {tir.low}%</span>
              <span className="text-success">In range {tir.normal}%</span>
              <span className="text-warning">High {tir.high}%</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Glucose trend over time */}
      {glucose_trend.length > 0 && glucose_trend.some(b => b.count > 0) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Average glucose over time</CardTitle>
            <CardDescription>Older → now · bar colour = in-range (green), low (red), high (amber)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-1 h-28">
              {glucose_trend.map((b, i) => (
                <div key={i} className="flex-1 flex flex-col justify-end items-center" title={b.count ? `${b.avg} mg/dL (${b.count})` : 'no readings'}>
                  <div className="w-full rounded-t" style={{ height: `${(b.avg / maxTrend) * 100}%`, minHeight: b.avg > 0 ? '4px' : '0', backgroundColor: glucoseColor(b.avg) }} />
                </div>
              ))}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-1"><span>older</span><span>now</span></div>
          </CardContent>
        </Card>
      )}

      {/* Time-of-day glucose pattern — dawn phenomenon / post-meal spikes */}
      {time_patterns.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Glucose by time of day</CardTitle>
            <CardDescription>Average reading per period — patterns worth showing your doctor</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {time_patterns.map(p => (
                <div key={p.label}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span>{p.label}</span>
                    <span className="text-muted-foreground">{p.avg} mg/dL · {p.count} reading{p.count !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="h-2 bg-muted rounded overflow-hidden">
                    <div className="h-full" style={{ width: `${Math.min(100, (p.avg / maxTrend) * 100)}%`, backgroundColor: glucoseColor(p.avg) }} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Insights Cards */}
      {insights && insights.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {insights.map((insight, index) => (
            <Card key={index} className="border-l-4 border-l-blue-500">
              <CardContent className="p-4">
                <p className="text-sm font-medium">{insight}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Activity className="h-8 w-8 mx-auto mb-2 text-blue-500" />
            <div className="text-2xl font-bold">{summary.total_entries}</div>
            <div className="text-sm text-muted-foreground">Total Entries</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <Droplets className="h-8 w-8 mx-auto mb-2 text-red-500" />
            <div className="text-2xl font-bold">{summary.avg_bg}</div>
            <div className="text-sm text-muted-foreground">Avg Blood Sugar</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-8 w-8 mx-auto mb-2 text-green-500" />
            <div className="text-2xl font-bold">{summary.time_in_range}%</div>
            <div className="text-sm text-muted-foreground">Time in Range</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <Zap className="h-8 w-8 mx-auto mb-2 text-purple-500" />
            <div className="text-2xl font-bold">{summary.total_insulin}</div>
            <div className="text-sm text-muted-foreground">Total Insulin (u)</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <Apple className="h-8 w-8 mx-auto mb-2 text-orange-500" />
            <div className="text-2xl font-bold">{summary.total_carbs}</div>
            <div className="text-sm text-muted-foreground">Total Carbs (g)</div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Blood Glucose Analysis */}
        {glucose_analysis && glucose_analysis.readings_count > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Droplets className="h-5 w-5 text-red-500" />
                Blood Glucose
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span>Average:</span>
                <Badge variant="outline">{glucose_analysis.average} mg/dL</Badge>
              </div>
              <div className="flex justify-between">
                <span>Range:</span>
                <Badge variant="outline">{glucose_analysis.min} - {glucose_analysis.max}</Badge>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Low (&lt;70):</span>
                  <span className="text-red-600">{glucose_analysis.time_in_range_percent.low}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Normal (70-180):</span>
                  <span className="text-green-600">{glucose_analysis.time_in_range_percent.normal}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>High (&gt;180):</span>
                  <span className="text-orange-600">{glucose_analysis.time_in_range_percent.high}%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Insulin Patterns */}
        {insulin_patterns && insulin_patterns.doses_count > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-purple-500" />
                Insulin Patterns
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span>Total Units:</span>
                <Badge variant="outline">{insulin_patterns.total_units}u</Badge>
              </div>
              <div className="flex justify-between">
                <span>Average Dose:</span>
                <Badge variant="outline">{insulin_patterns.average_dose}u</Badge>
              </div>
              <div className="flex justify-between">
                <span>Total Doses:</span>
                <Badge variant="outline">{insulin_patterns.doses_count}</Badge>
              </div>
              {insulin_patterns.type_distribution && Object.keys(insulin_patterns.type_distribution).length > 0 && (
                <div className="space-y-1">
                  <div className="text-sm font-medium">Types:</div>
                  {Object.entries(insulin_patterns.type_distribution).map(([type, count]) => (
                    <div key={type} className="flex justify-between text-sm">
                      <span>{type}:</span>
                      <span>{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Carb Analysis */}
        {carb_analysis && carb_analysis.meals_count > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Apple className="h-5 w-5 text-orange-500" />
                Carbohydrate Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span>Total Carbs:</span>
                <Badge variant="outline">{carb_analysis.total_grams}g</Badge>
              </div>
              <div className="flex justify-between">
                <span>Avg per Meal:</span>
                <Badge variant="outline">{carb_analysis.average_per_meal}g</Badge>
              </div>
              <div className="flex justify-between">
                <span>Meals Tracked:</span>
                <Badge variant="outline">{carb_analysis.meals_count}</Badge>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
