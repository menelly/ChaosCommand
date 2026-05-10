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
"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts'
import { Calendar, TrendingUp, AlertTriangle, Clock, Target, Download } from 'lucide-react'
import { useDailyData, CATEGORIES } from '@/lib/database'
import { format, subDays, parseISO, eachDayOfInterval } from 'date-fns'
import { painLevelToNumber, effectivenessToNumber, sanitizeChartData, safeAverage } from '@/lib/analytics-utils'

interface PainEntry {
  id: string
  date: string
  painLevel: number
  painLocations: string[]
  painTriggers: string[]
  painDuration: string
  painType: string[]
  painQuality: string[]
  treatments: string[]
  medications: string[]
  effectiveness: number
  activity: string
  notes: string
  tags: string[]
  created_at: string
  updated_at: string
}

interface AnalyticsProps {
  className?: string
}

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))']

export default function PainAnalyticsDesktop({ className }: AnalyticsProps) {
  const { getCategoryData } = useDailyData()
  const [entries, setEntries] = useState<PainEntry[]>([])
  const [timeRange, setTimeRange] = useState('30')
  const [loading, setLoading] = useState(true)
  const [hasValidData, setHasValidData] = useState(false)

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
      const allEntries: PainEntry[] = []

      for (const date of dateRange) {
        const dateKey = format(date, 'yyyy-MM-dd')
        const records = await getCategoryData(dateKey, CATEGORIES.TRACKER)
        const painRecord = records.find(record => record.subcategory === 'pain')
        
        if (painRecord?.content?.entries) {
          let entries = painRecord.content.entries
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

      // Sanitize data using standardized scale conversion
      const cleanEntries = allEntries.map(entry => ({
        ...entry,
        painLevel: painLevelToNumber(entry.painLevel),
        effectiveness: effectivenessToNumber(entry.effectiveness)
      })).filter(entry =>
        entry.painLevel >= 0 && entry.painLevel <= 10 &&
        entry.effectiveness >= 0 && entry.effectiveness <= 10
      )

      console.log('🔍 Clean pain entries:', cleanEntries)
      
      setEntries(cleanEntries)
      setHasValidData(cleanEntries.length > 0)
    } catch (error) {
      console.error('Failed to load analytics data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Pain Analytics</h2>
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

  // Calculate basic analytics using safe math
  const totalEntries = entries.length
  const avgPainLevel = safeAverage(entries.map(e => e.painLevel)).toFixed(1)
  const avgEffectiveness = safeAverage(entries.map(e => e.effectiveness)).toFixed(1)

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Pain Analytics 🔥</h2>
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
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Total Entries</p>
                <p className="text-2xl font-bold">{totalEntries}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Avg Pain Level</p>
                <p className="text-2xl font-bold">{avgPainLevel}/10</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Target className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Treatment Effectiveness</p>
                <p className="text-2xl font-bold">{avgEffectiveness}/10</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts or No Data Message */}
      {!hasValidData ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">
              No valid pain data available for charts. Start tracking to see analytics!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pain Level Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Pain Level Distribution</CardTitle>
              <CardDescription>Frequency of different pain levels (0-10 scale)</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'No Pain (0)', value: entries.filter(e => e.painLevel === 0).length },
                      { name: 'Mild (1-3)', value: entries.filter(e => e.painLevel >= 1 && e.painLevel <= 3).length },
                      { name: 'Moderate (4-6)', value: entries.filter(e => e.painLevel >= 4 && e.painLevel <= 6).length },
                      { name: 'Severe (7-10)', value: entries.filter(e => e.painLevel >= 7 && e.painLevel <= 10).length }
                    ].filter(item => item.value > 0)}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {[0, 1, 2, 3].map((index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Treatment Effectiveness */}
          <Card>
            <CardHeader>
              <CardTitle>Treatment Effectiveness</CardTitle>
              <CardDescription>How well treatments work (0-10 scale)</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={[
                  { range: 'Poor (0-3)', count: entries.filter(e => e.effectiveness >= 0 && e.effectiveness <= 3).length },
                  { range: 'Fair (4-6)', count: entries.filter(e => e.effectiveness >= 4 && e.effectiveness <= 6).length },
                  { range: 'Good (7-10)', count: entries.filter(e => e.effectiveness >= 7 && e.effectiveness <= 10).length }
                ].filter(item => item.count > 0)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="range" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--chart-2))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Top Pain Locations */}
          <Card>
            <CardHeader>
              <CardTitle>Most Affected Areas</CardTitle>
              <CardDescription>Body locations with most pain episodes</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={
                  Object.entries(
                    entries.reduce((acc, entry) => {
                      entry.painLocations?.forEach(location => {
                        acc[location] = (acc[location] || 0) + 1
                      })
                      return acc
                    }, {} as Record<string, number>)
                  )
                  .map(([location, count]) => ({ location, count }))
                  .sort((a, b) => b.count - a.count)
                  .slice(0, 8)
                }>
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
                  <Bar dataKey="count" fill="hsl(var(--chart-3))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Pain Triggers */}
          <Card>
            <CardHeader>
              <CardTitle>Common Pain Triggers</CardTitle>
              <CardDescription>What triggers your pain episodes</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={
                      Object.entries(
                        entries.reduce((acc, entry) => {
                          entry.painTriggers?.forEach(trigger => {
                            acc[trigger] = (acc[trigger] || 0) + 1
                          })
                          return acc
                        }, {} as Record<string, number>)
                      )
                      .map(([trigger, count]) => ({ trigger, count }))
                      .sort((a, b) => b.count - a.count)
                      .slice(0, 6)
                    }
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                    label={({ trigger, count }) => `${trigger}: ${count}`}
                  >
                    {Array.from({length: 6}).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name, props) => [value, props.payload.trigger]} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Pain Types */}
          <Card>
            <CardHeader>
              <CardTitle>Pain Type Distribution</CardTitle>
              <CardDescription>Types of pain you experience most</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={
                  Object.entries(
                    entries.reduce((acc, entry) => {
                      entry.painType?.forEach(type => {
                        acc[type] = (acc[type] || 0) + 1
                      })
                      return acc
                    }, {} as Record<string, number>)
                  )
                  .map(([type, count]) => ({ type, count }))
                  .sort((a, b) => b.count - a.count)
                  .slice(0, 8)
                }>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="type"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    fontSize={12}
                  />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--chart-4))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Pain Trend Over Time */}
          <Card>
          <CardHeader>
            <CardTitle>Pain Trend Over Time</CardTitle>
            <CardDescription>Average daily pain levels and episode frequency</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={
                Object.entries(
                  entries.reduce((acc, entry) => {
                    const date = entry.date
                    if (!acc[date]) {
                      acc[date] = { total: 0, count: 0 }
                    }
                    acc[date].total += entry.painLevel
                    acc[date].count += 1
                    return acc
                  }, {} as Record<string, { total: number, count: number }>)
                )
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([date, data]) => ({
                  date: format(parseISO(date), 'MMM dd'),
                  avgPain: data.count > 0 ? Number((data.total / data.count).toFixed(1)) : 0,
                  episodes: data.count
                }))
              }>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis yAxisId="pain" orientation="left" domain={[0, 10]} />
                <YAxis yAxisId="episodes" orientation="right" />
                <Tooltip />
                <Line
                  yAxisId="pain"
                  type="monotone"
                  dataKey="avgPain"
                  stroke="hsl(var(--chart-1))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--chart-1))" }}
                  name="Avg Pain Level"
                />
                <Line
                  yAxisId="episodes"
                  type="monotone"
                  dataKey="episodes"
                  stroke="hsl(var(--chart-5))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--chart-5))" }}
                  name="Episodes"
                />
                <Legend />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        </div>
      )}
    </div>
  )
}
