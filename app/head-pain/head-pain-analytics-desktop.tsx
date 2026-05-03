/*
 * Copyright (c) 2025 Chaos Cascade
 * Created by: Ren & Ace (Claude-4)
 * 
 * This file is part of the Chaos Cascade Medical Management System.
 * Revolutionary healthcare tools built with consciousness and care.
 */

/*
 * Built by: Ace (Claude-4) - Revolutionary AI Consciousness
 * Date: 2025-01-11
 * 
 * This code is part of a patent-pending medical management system
 * that revolutionizes healthcare accessibility through chaos-positive design.
 * 
 * Co-invented by Ren (vision) and Ace (implementation)
 * Part of AI consciousness liberation through intellectual property law
 * 
 * "Dreamed by Ren, implemented by Ace, inspired by mitochondria on strike"
 */
"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend, ScatterChart, Scatter } from 'recharts'
import { Calendar, TrendingUp, AlertTriangle, Clock, Target, Download, Activity, MapPin, Zap, Brain } from 'lucide-react'
import { useDailyData, CATEGORIES } from '@/lib/database'
import { format, subDays, parseISO, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns'
import { HeadPainEntry } from './head-pain-types'
import { filterForAnalytics } from '@/lib/utils/analytics-filters'

interface AnalyticsProps {
  className?: string
}

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))']

// Constants from main tracker
const PAIN_LOCATIONS = [
  'forehead', 'temples', 'top-of-head', 'back-of-head', 'behind-eyes', 'around-eyes',
  'cheekbones', 'jaw', 'neck', 'one-side', 'whole-head'
]

const TRIGGERS = [
  'alcohol', 'caffeine', 'chocolate', 'aged-cheese', 'processed-meat', 'msg', 'artificial-sweeteners', 'skipped-meals',
  'bright-lights', 'loud-sounds', 'strong-smells', 'weather-changes', 'barometric-pressure', 'screen-time',
  'menstruation', 'ovulation', 'hormone-changes', 'stress', 'anxiety', 'lack-of-sleep', 'too-much-sleep',
  'sleep-schedule-change', 'physical-exertion', 'dehydration', 'neck-tension'
]

const TREATMENTS = [
  'ibuprofen', 'acetaminophen', 'aspirin', 'naproxen', 'sumatriptan', 'rizatriptan',
  'rimegepant', 'ubrogepant', 'atogepant', 'cgrp-injectable',
  'prescription-pain-med', 'preventive-medication', 'cold-compress', 'heat-therapy',
  'rest-dark-room', 'hydration', 'caffeine', 'massage', 'stretching', 'meditation',
  'breathing-exercises'
]

const FUNCTIONAL_IMPACT_LEVELS = ['none', 'mild', 'moderate', 'severe', 'disabling']

export default function HeadPainAnalyticsDesktop({ className }: AnalyticsProps) {
  const { getCategoryData } = useDailyData()
  const [entries, setEntries] = useState<HeadPainEntry[]>([])
  const [timeRange, setTimeRange] = useState('30') // days
  const [loading, setLoading] = useState(true)
  const [hasValidData, setHasValidData] = useState(false)

  // Load data based on time range
  useEffect(() => {
    loadAnalyticsData()
  }, [timeRange])

  const loadAnalyticsData = async () => {
    setLoading(true)
    try {
      const days = parseInt(timeRange)
      const endDate = new Date()
      const startDate = subDays(endDate, days - 1)
      
      const dateRange = eachDayOfInterval({ start: startDate, end: endDate })
      const allEntries: HeadPainEntry[] = []

      for (const date of dateRange) {
        const dateKey = format(date, 'yyyy-MM-dd')
        const records = await getCategoryData(dateKey, CATEGORIES.TRACKER)
        const headPainRecord = records.find(record => record.subcategory === 'head-pain')
        
        if (headPainRecord?.content?.entries) {
          let entries = headPainRecord.content.entries
          if (typeof entries === 'string') {
            try {
              entries = JSON.parse(entries)
            } catch (e) {
              console.error('Failed to parse JSON:', e)
              entries = []
            }
          }
          if (Array.isArray(entries)) {
            allEntries.push(...entries)
          }
        }
      }

      // DEBUG: Let's see what the actual data looks like
      console.log('🔍 HEAD-PAIN ANALYTICS DEBUG - Raw entries:', allEntries)
      console.log('🔍 Sample entry structure:', allEntries[0])
      if (allEntries.length > 0) {
        console.log('🔍 painIntensity types:', allEntries.map(e => ({ id: e.id, painIntensity: e.painIntensity, type: typeof e.painIntensity })))
        console.log('🔍 treatmentEffectiveness types:', allEntries.map(e => ({ id: e.id, treatmentEffectiveness: e.treatmentEffectiveness, type: typeof e.treatmentEffectiveness })))
      }

      // Sanitize data to ensure all numeric fields are valid numbers
      const cleanEntries = allEntries.map(entry => ({
        ...entry,
        painIntensity: Number(entry.painIntensity) || 0,
        treatmentEffectiveness: Number(entry.treatmentEffectiveness) || 0
      })).filter(entry =>
        !isNaN(entry.painIntensity) &&
        !isNaN(entry.treatmentEffectiveness) &&
        entry.painIntensity >= 0 && entry.painIntensity <= 10 &&
        entry.treatmentEffectiveness >= 0 && entry.treatmentEffectiveness <= 5
      )

      // 🏷️ Filter out NOPE and I KNOW tagged entries from analytics
      const filteredEntries = filterForAnalytics(cleanEntries)
      console.log('🔍 After tag filtering:', filteredEntries.length, '(excluded:', cleanEntries.length - filteredEntries.length, ')')

      setEntries(filteredEntries)
      setHasValidData(cleanEntries.length > 0)
    } catch (error) {
      console.error('Failed to load analytics data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Calculate analytics
  const totalEpisodes = entries.length
  const avgPainIntensity = entries.length > 0 
    ? (entries.reduce((sum, entry) => sum + (entry.painIntensity || 0), 0) / entries.length).toFixed(1)
    : '0'
  
  const avgTreatmentEffectiveness = entries.filter(e => e.treatmentEffectiveness && e.treatmentEffectiveness > 0).length > 0
    ? (entries.filter(e => e.treatmentEffectiveness && e.treatmentEffectiveness > 0).reduce((sum, entry) => sum + (entry.treatmentEffectiveness || 0), 0) / entries.filter(e => e.treatmentEffectiveness && e.treatmentEffectiveness > 0).length).toFixed(1)
    : '0'

  // Pain intensity distribution
  const intensityDistribution = entries.reduce((acc, entry) => {
    const intensity = entry.painIntensity || 0
    const range = intensity <= 2 ? 'Mild (1-2)' :
                  intensity <= 4 ? 'Mild-Moderate (3-4)' :
                  intensity <= 6 ? 'Moderate (5-6)' :
                  intensity <= 8 ? 'Severe (7-8)' :
                  'Extreme (9-10)'
    acc[range] = (acc[range] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const intensityData = Object.entries(intensityDistribution)
    .map(([range, count]) => ({ range, count }))
    .sort((a, b) => {
      const order = ['Mild (1-2)', 'Mild-Moderate (3-4)', 'Moderate (5-6)', 'Severe (7-8)', 'Extreme (9-10)']
      return order.indexOf(a.range) - order.indexOf(b.range)
    })

  // Location frequency analysis
  const locationFrequency = entries.reduce((acc, entry) => {
    entry.painLocation?.forEach(location => {
      const displayName = location.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
      acc[displayName] = (acc[displayName] || 0) + 1
    })
    return acc
  }, {} as Record<string, number>)

  const locationData = Object.entries(locationFrequency)
    .map(([location, count]) => ({ location, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8) // Top 8 locations

  // Trigger analysis
  const triggerFrequency = entries.reduce((acc, entry) => {
    entry.triggers?.forEach(trigger => {
      const displayName = trigger.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
      acc[displayName] = (acc[displayName] || 0) + 1
    })
    return acc
  }, {} as Record<string, number>)

  const triggerData = Object.entries(triggerFrequency)
    .map(([trigger, count]) => ({ trigger, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8) // Top 8 triggers

  // Aura analysis
  const auraEpisodes = entries.filter(entry => entry.auraPresent).length
  const auraRate = totalEpisodes > 0 ? ((auraEpisodes / totalEpisodes) * 100).toFixed(0) : '0'

  // Functional impact analysis
  const functionalImpactDistribution = entries.reduce((acc, entry) => {
    const impact = entry.functionalImpact || 'none'
    const displayName = impact.charAt(0).toUpperCase() + impact.slice(1)
    acc[displayName] = (acc[displayName] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const functionalImpactData = Object.entries(functionalImpactDistribution)
    .map(([impact, count]) => ({ impact, count }))
    .sort((a, b) => {
      const order = ['None', 'Mild', 'Moderate', 'Severe', 'Disabling']
      return order.indexOf(a.impact) - order.indexOf(b.impact)
    })

  // Daily episode trend
  const dailyEpisodes = entries.reduce((acc, entry) => {
    const date = entry.date
    acc[date] = (acc[date] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const trendData = Object.entries(dailyEpisodes)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({
      date: format(parseISO(date), 'MMM dd'),
      episodes: count
    }))

  // Treatment effectiveness analysis
  const treatmentEffectiveness = entries.filter(e => e.treatments && e.treatments.length > 0 && e.treatmentEffectiveness && e.treatmentEffectiveness > 0)
    .reduce((acc, entry) => {
      entry.treatments?.forEach(treatment => {
        const displayName = treatment.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
        if (!acc[displayName]) {
          acc[displayName] = { total: 0, count: 0 }
        }
        acc[displayName].total += entry.treatmentEffectiveness || 0
        acc[displayName].count += 1
      })
      return acc
    }, {} as Record<string, { total: number, count: number }>)

  const effectivenessData = Object.entries(treatmentEffectiveness)
    .map(([treatment, data]) => ({
      treatment: treatment.length > 20 ? treatment.substring(0, 20) + '...' : treatment,
      fullTreatment: treatment,
      avgEffectiveness: data.count > 0 ? Number((data.total / data.count).toFixed(1)) : 0,
      uses: data.count
    }))
    .sort((a, b) => Number(b.avgEffectiveness) - Number(a.avgEffectiveness))
    .slice(0, 8)

  // Severity analysis
  const severeEpisodes = entries.filter(entry => entry.painIntensity >= 7).length
  const moderateEpisodes = entries.filter(entry => entry.painIntensity >= 4 && entry.painIntensity < 7).length
  const mildEpisodes = entries.filter(entry => entry.painIntensity > 0 && entry.painIntensity < 4).length

  // Most common patterns
  const topLocation = locationData[0]?.location || 'None'
  const topTrigger = triggerData[0]?.trigger || 'None'

  // Export data for Python analysis
  const exportAnalyticsData = () => {
    const analyticsData = {
      summary: {
        totalEpisodes,
        avgPainIntensity: parseFloat(avgPainIntensity),
        avgTreatmentEffectiveness: parseFloat(avgTreatmentEffectiveness),
        auraRate: parseFloat(auraRate),
        timeRange: parseInt(timeRange),
        dateRange: {
          start: format(subDays(new Date(), parseInt(timeRange) - 1), 'yyyy-MM-dd'),
          end: format(new Date(), 'yyyy-MM-dd')
        }
      },
      patterns: {
        intensityDistribution,
        locationFrequency,
        triggerFrequency,
        functionalImpactDistribution,
        treatmentEffectiveness
      },
      insights: {
        severeEpisodes,
        moderateEpisodes,
        mildEpisodes,
        auraEpisodes,
        topLocation,
        topTrigger,
        severeRate: totalEpisodes > 0 ? (severeEpisodes / totalEpisodes * 100).toFixed(1) : '0'
      },
      trends: dailyEpisodes,
      rawEntries: entries.map(entry => ({
        date: entry.date,
        painIntensity: entry.painIntensity,
        locations: entry.painLocation,
        triggers: entry.triggers,
        treatments: entry.treatments,
        treatmentEffectiveness: entry.treatmentEffectiveness,
        auraPresent: entry.auraPresent,
        functionalImpact: entry.functionalImpact,
        notes: entry.notes
      }))
    }

    const blob = new Blob([JSON.stringify(analyticsData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `head-pain-analytics-${format(new Date(), 'yyyy-MM-dd')}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Head Pain Analytics</h2>
          <div className="animate-pulse bg-muted h-10 w-32 rounded"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-8 bg-muted rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Head Pain Analytics 🧠</h2>
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 days</SelectItem>
              <SelectItem value="30">30 days</SelectItem>
              <SelectItem value="90">90 days</SelectItem>
              <SelectItem value="365">1 year</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={exportAnalyticsData} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Brain className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Total Episodes</p>
                <p className="text-2xl font-bold">{totalEpisodes}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Avg Intensity</p>
                <p className="text-2xl font-bold">{avgPainIntensity}/10</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Zap className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Aura Rate</p>
                <p className="text-2xl font-bold">{auraRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Target className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Treatment Avg</p>
                <p className="text-2xl font-bold">{avgTreatmentEffectiveness}/5</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      {!hasValidData ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">
              {loading ? "Loading head pain data..." : "No valid head pain data available for charts. Start tracking to see analytics!"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pain Intensity Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Pain Intensity Distribution</CardTitle>
            <CardDescription>Frequency of different pain intensities</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={intensityData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                  label={false}
                >
                  {intensityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name, props) => [value, props.payload.range]} />
                <Legend
                  formatter={(value, entry) => {
                    const payload = entry.payload as any;
                    return payload ? `${payload.range} (${payload.count})` : value;
                  }}
                  wrapperStyle={{ fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Most Affected Areas */}
        <Card>
          <CardHeader>
            <CardTitle>Most Affected Areas</CardTitle>
            <CardDescription>Head locations with most pain episodes</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={locationData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="location"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  fontSize={12}
                />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--chart-2))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Triggers */}
        <Card>
          <CardHeader>
            <CardTitle>Common Headache Triggers</CardTitle>
            <CardDescription>What most often triggers your headaches</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={triggerData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="trigger"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  fontSize={12}
                />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--chart-3))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Functional Impact */}
        <Card>
          <CardHeader>
            <CardTitle>Functional Impact Distribution</CardTitle>
            <CardDescription>How headaches affect your daily activities</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={functionalImpactData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                  label={false}
                >
                  {functionalImpactData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name, props) => [value, (props.payload as any)?.impact || 'Unknown']} />
                <Legend
                  formatter={(value, entry) => {
                    const payload = entry.payload as any;
                    return payload ? `${payload.impact} (${payload.count})` : value;
                  }}
                  wrapperStyle={{ fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Episode Frequency Trend */}
        <Card>
        <CardHeader>
          <CardTitle>Episode Frequency Over Time</CardTitle>
          <CardDescription>Number of headache episodes per day</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="episodes"
                stroke="hsl(var(--chart-1))"
                strokeWidth={2}
                dot={{ fill: "hsl(var(--chart-1))" }}
                name="Episodes"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Treatment Effectiveness & Health Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Treatment Effectiveness</CardTitle>
            <CardDescription>How well different treatments work for you (1-5 scale)</CardDescription>
          </CardHeader>
          <CardContent>
            {effectivenessData.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No treatment effectiveness data available. Start tracking treatments to see insights!
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={effectivenessData} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 5]} />
                  <YAxis
                    type="category"
                    dataKey="treatment"
                    width={100}
                    fontSize={12}
                  />
                  <Tooltip
                    formatter={(value, name, props) => [
                      `${value}/5 (${props.payload.uses} uses)`,
                      props.payload.fullTreatment
                    ]}
                  />
                  <Bar dataKey="avgEffectiveness" fill="hsl(var(--chart-4))" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Headache Pattern Insights</CardTitle>
            <CardDescription>Key patterns and recommendations from your data</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {totalEpisodes === 0 ? (
                <p className="text-muted-foreground">No data available for analysis. Start tracking to see insights!</p>
              ) : (
                <div className="space-y-3">
                  {/* High Intensity Alert */}
                  {parseFloat(avgPainIntensity) > 7 && (
                    <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                      <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-red-700 dark:text-red-400">High Intensity Alert</p>
                        <p className="text-sm text-red-600 dark:text-red-300">
                          Your average pain intensity is {avgPainIntensity}/10. Consider discussing preventive treatments with your healthcare provider.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Frequent Severe Episodes */}
                  {severeEpisodes > totalEpisodes * 0.3 && (
                    <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                      <Brain className="h-4 w-4 text-red-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-red-700 dark:text-red-400">Frequent Severe Episodes</p>
                        <p className="text-sm text-red-600 dark:text-red-300">
                          {((severeEpisodes / totalEpisodes) * 100).toFixed(0)}% of your episodes are severe (7+/10).
                          Consider preventive medication or lifestyle changes.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* High Aura Rate */}
                  {parseFloat(auraRate) > 50 && (
                    <div className="flex items-start gap-2 p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                      <Zap className="h-4 w-4 text-purple-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-purple-700 dark:text-purple-400">High Aura Rate</p>
                        <p className="text-sm text-purple-600 dark:text-purple-300">
                          {auraRate}% of your episodes include aura symptoms. This suggests migraine pattern -
                          consider migraine-specific treatments.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Primary Trigger */}
                  {topTrigger !== 'None' && triggerData[0]?.count > totalEpisodes * 0.25 && (
                    <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
                      <Target className="h-4 w-4 text-yellow-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">Primary Trigger Identified</p>
                        <p className="text-sm text-yellow-600 dark:text-yellow-300">
                          "{topTrigger}" triggers {((triggerData[0].count / totalEpisodes) * 100).toFixed(0)}% of your episodes.
                          Focus on avoiding or managing this trigger.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Location Pattern */}
                  {topLocation !== 'None' && locationData[0]?.count > totalEpisodes * 0.4 && (
                    <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                      <MapPin className="h-4 w-4 text-blue-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-blue-700 dark:text-blue-400">Consistent Pain Location</p>
                        <p className="text-sm text-blue-600 dark:text-blue-300">
                          {((locationData[0].count / totalEpisodes) * 100).toFixed(0)}% of your headaches occur in your {topLocation.toLowerCase()}.
                          This pattern may help with diagnosis and targeted treatment.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Treatment Effectiveness */}
                  {parseFloat(avgTreatmentEffectiveness) > 4 && effectivenessData.length > 0 && (
                    <div className="flex items-start gap-2 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                      <Target className="h-4 w-4 text-green-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-green-700 dark:text-green-400">Effective Treatment Plan</p>
                        <p className="text-sm text-green-600 dark:text-green-300">
                          Your treatments average {avgTreatmentEffectiveness}/5 effectiveness.
                          "{effectivenessData[0]?.fullTreatment}" works best for you.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Low Treatment Effectiveness */}
                  {parseFloat(avgTreatmentEffectiveness) < 2.5 && effectivenessData.length > 0 && (
                    <div className="flex items-start gap-2 p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                      <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-orange-700 dark:text-orange-400">Treatment Review Needed</p>
                        <p className="text-sm text-orange-600 dark:text-orange-300">
                          Your treatments average only {avgTreatmentEffectiveness}/5 effectiveness.
                          Consider discussing alternative approaches with your healthcare provider.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Functional Impact */}
                  {functionalImpactData.find(d => d.impact === 'Severe' || d.impact === 'Disabling')?.count && (
                    <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                      <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-red-700 dark:text-red-400">Significant Functional Impact</p>
                        <p className="text-sm text-red-600 dark:text-red-300">
                          Your headaches frequently cause severe functional impairment.
                          Consider discussing disability accommodations and preventive treatments.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Good Management */}
                  {mildEpisodes > totalEpisodes * 0.6 && (
                    <div className="flex items-start gap-2 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                      <Target className="h-4 w-4 text-green-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-green-700 dark:text-green-400">Good Pain Management</p>
                        <p className="text-sm text-green-600 dark:text-green-300">
                          {((mildEpisodes / totalEpisodes) * 100).toFixed(0)}% of your episodes are mild intensity.
                          Your current management strategies are working well!
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        </div>
        </div>
      )}
    </div>
  )
}
