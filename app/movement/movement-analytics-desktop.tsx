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
 * Updated: 2026-02-02 - Full analytics implementation
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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts'
import { Calendar, TrendingUp, Heart, Download, Activity, Zap, Clock, Target } from 'lucide-react'
import { useDailyData, CATEGORIES } from '@/lib/database'
import { format, subDays, parseISO, eachDayOfInterval } from 'date-fns'
import { MovementEntry } from './movement-types'
import { MOVEMENT_TYPES, INTENSITY_LEVELS, BODY_FEELINGS, getMovementType, getIntensityLevel } from './movement-constants'
import { filterForAnalytics } from '@/lib/utils/analytics-filters'

interface AnalyticsProps {
  className?: string
}

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))']

export function MovementAnalyticsDesktop({ className }: AnalyticsProps) {
  const { getCategoryData } = useDailyData()
  const [entries, setEntries] = useState<MovementEntry[]>([])
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
      const allEntries: MovementEntry[] = []

      for (const date of dateRange) {
        const dateKey = format(date, 'yyyy-MM-dd')
        const records = await getCategoryData(dateKey, CATEGORIES.TRACKER)

        // Movement entries are stored with subcategory pattern 'movement-{id}'
        const movementRecords = records.filter(record =>
          record.subcategory?.startsWith('movement-')
        )

        for (const record of movementRecords) {
          if (record.content) {
            // ✅ JSON PARSING: Same pattern as movement-history.tsx
            let entries = record.content

            // If it's a string, parse it
            if (typeof entries === 'string') {
              try {
                entries = JSON.parse(entries)
              } catch (e) {
                console.error('Failed to parse movement JSON:', e)
                continue
              }
            }

            // Ensure it's an array
            if (!Array.isArray(entries)) {
              entries = [entries]
            }

            // 🔧 DOUBLE-PARSE FIX: Check if array elements are still strings
            if (Array.isArray(entries) && entries.length > 0 && typeof entries[0] === 'string') {
              try {
                entries = entries.map(item => typeof item === 'string' ? JSON.parse(item) : item)
              } catch (e) {
                console.error('Failed to double-parse movement:', e)
                continue
              }
            }

            // Get the entry (movement tracker stores single entries per record)
            const entry = entries[0] as MovementEntry
            if (entry && entry.id) {
              allEntries.push({
                ...entry,
                bodyFeel: Array.isArray(entry.bodyFeel) ? entry.bodyFeel : [],
                tags: Array.isArray(entry.tags) ? entry.tags : []
              })
            }
          }
        }
      }

      console.log('💖 Movement Analytics - Loaded entries:', allEntries.length)

      // Sanitize data
      const sanitizedEntries = allEntries.filter(entry =>
        entry && entry.id && entry.date
      ).map(entry => ({
        ...entry,
        energyBefore: Number(entry.energyBefore) || 5,
        energyAfter: Number(entry.energyAfter) || 5
      }))

      // 🏷️ Filter out NOPE and I KNOW tagged entries from analytics
      const cleanEntries = filterForAnalytics(sanitizedEntries)
      console.log('💖 After tag filtering:', cleanEntries.length, '(excluded:', sanitizedEntries.length - cleanEntries.length, ')')

      setEntries(cleanEntries)
      setHasValidData(cleanEntries.length > 0)
    } catch (error) {
      console.error('Failed to load movement analytics data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Calculate analytics
  const totalSessions = entries.length

  const avgEnergyChange = entries.length > 0
    ? (entries.reduce((sum, entry) => sum + ((entry.energyAfter || 5) - (entry.energyBefore || 5)), 0) / entries.length).toFixed(1)
    : '0'

  const positiveEnergySessions = entries.filter(e => (e.energyAfter || 5) > (e.energyBefore || 5)).length
  const energyBoostRate = entries.length > 0
    ? ((positiveEnergySessions / entries.length) * 100).toFixed(0)
    : '0'

  // Movement type distribution
  const typeFrequency = entries.reduce((acc, entry) => {
    const type = entry.type || 'other'
    acc[type] = (acc[type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const typeData = Object.entries(typeFrequency)
    .map(([type, count]) => {
      const movementType = getMovementType(type)
      return {
        type: `${movementType.emoji} ${movementType.description}`,
        shortType: movementType.description,
        count
      }
    })
    .sort((a, b) => b.count - a.count)

  // Intensity distribution
  const intensityFrequency = entries.reduce((acc, entry) => {
    const intensity = entry.intensity || 'gentle'
    acc[intensity] = (acc[intensity] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const intensityData = Object.entries(intensityFrequency)
    .map(([intensity, count]) => {
      const level = getIntensityLevel(intensity)
      return {
        intensity: `${level.emoji} ${level.description.split(' - ')[0]}`,
        count
      }
    })
    .sort((a, b) => b.count - a.count)

  // Energy impact by movement type
  const energyImpactByType = entries.reduce((acc, entry) => {
    const type = entry.type || 'other'
    if (!acc[type]) {
      acc[type] = { totalChange: 0, count: 0 }
    }
    acc[type].totalChange += (entry.energyAfter || 5) - (entry.energyBefore || 5)
    acc[type].count += 1
    return acc
  }, {} as Record<string, { totalChange: number, count: number }>)

  const energyImpactData = Object.entries(energyImpactByType)
    .map(([type, data]) => {
      const movementType = getMovementType(type)
      return {
        type: movementType.description,
        avgChange: data.count > 0 ? Number((data.totalChange / data.count).toFixed(1)) : 0,
        sessions: data.count
      }
    })
    .sort((a, b) => b.avgChange - a.avgChange)
    .slice(0, 8)

  // Body feel frequency
  const bodyFeelFrequency = entries.reduce((acc, entry) => {
    entry.bodyFeel?.forEach(feel => {
      acc[feel] = (acc[feel] || 0) + 1
    })
    return acc
  }, {} as Record<string, number>)

  const bodyFeelData = Object.entries(bodyFeelFrequency)
    .map(([feel, count]) => ({ feel, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // Daily movement trend
  const dailyMovement = entries.reduce((acc, entry) => {
    const date = entry.date
    if (!acc[date]) {
      acc[date] = { sessions: 0, totalEnergyChange: 0 }
    }
    acc[date].sessions += 1
    acc[date].totalEnergyChange += (entry.energyAfter || 5) - (entry.energyBefore || 5)
    return acc
  }, {} as Record<string, { sessions: number, totalEnergyChange: number }>)

  const trendData = Object.entries(dailyMovement)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({
      date: format(parseISO(date), 'MMM dd'),
      sessions: data.sessions,
      avgEnergyChange: data.sessions > 0 ? Number((data.totalEnergyChange / data.sessions).toFixed(1)) : 0
    }))

  // Top movement type
  const topType = typeData[0]?.shortType || 'None'
  const topBodyFeel = bodyFeelData[0]?.feel || 'None'

  // Export data
  const exportAnalyticsData = () => {
    const analyticsData = {
      summary: {
        totalSessions,
        avgEnergyChange: parseFloat(avgEnergyChange),
        energyBoostRate: parseFloat(energyBoostRate),
        timeRange: parseInt(timeRange),
        dateRange: {
          start: format(subDays(new Date(), parseInt(timeRange) - 1), 'yyyy-MM-dd'),
          end: format(new Date(), 'yyyy-MM-dd')
        }
      },
      patterns: {
        typeFrequency,
        intensityFrequency,
        bodyFeelFrequency,
        energyImpactByType
      },
      insights: {
        topType,
        topBodyFeel,
        positiveEnergySessions
      },
      trends: dailyMovement,
      rawEntries: entries.map(entry => ({
        date: entry.date,
        type: entry.type,
        duration: entry.duration,
        intensity: entry.intensity,
        energyBefore: entry.energyBefore,
        energyAfter: entry.energyAfter,
        bodyFeel: entry.bodyFeel,
        notes: entry.notes
      }))
    }

    const blob = new Blob([JSON.stringify(analyticsData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `movement-analytics-${format(new Date(), 'yyyy-MM-dd')}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Movement Analytics</h2>
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
        <h2 className="text-2xl font-bold">Movement Analytics 💖</h2>
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
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Total Sessions</p>
                <p className="text-2xl font-bold">{totalSessions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Zap className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Avg Energy Change</p>
                <p className="text-2xl font-bold">{parseFloat(avgEnergyChange) >= 0 ? '+' : ''}{avgEnergyChange}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Energy Boost Rate</p>
                <p className="text-2xl font-bold">{energyBoostRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Heart className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Top Activity</p>
                <p className="text-2xl font-bold truncate">{topType}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      {!hasValidData ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Heart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No movement data yet!</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Start tracking your movement to see beautiful analytics here. Every movement counts! 💖
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Movement Type Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Movement Types</CardTitle>
                <CardDescription>What kinds of movement you do most</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={typeData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                      label={false}
                    >
                      {typeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name, props) => [value, props.payload.shortType]} />
                    <Legend
                      formatter={(value, entry) => {
                        const payload = entry.payload as any;
                        return payload ? `${payload.shortType} (${payload.count})` : value;
                      }}
                      wrapperStyle={{ fontSize: '12px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Energy Impact by Type */}
            <Card>
              <CardHeader>
                <CardTitle>Energy Impact by Activity</CardTitle>
                <CardDescription>How different activities affect your energy</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={energyImpactData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[-5, 5]} />
                    <YAxis
                      type="category"
                      dataKey="type"
                      width={100}
                      fontSize={12}
                    />
                    <Tooltip
                      formatter={(value, name, props) => {
                        const numValue = Number(value)
                        return [
                          `${numValue > 0 ? '+' : ''}${numValue} energy (${props.payload.sessions} sessions)`,
                          'Avg Change'
                        ]
                      }}
                    />
                    <Bar dataKey="avgChange" fill="hsl(var(--chart-2))" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Intensity Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Intensity Distribution</CardTitle>
                <CardDescription>How hard you push yourself</CardDescription>
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
                    <Tooltip formatter={(value, name, props) => [value, props.payload.intensity]} />
                    <Legend
                      formatter={(value, entry) => {
                        const payload = entry.payload as any;
                        return payload ? `${payload.intensity} (${payload.count})` : value;
                      }}
                      wrapperStyle={{ fontSize: '12px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Body Feel Frequency */}
            <Card>
              <CardHeader>
                <CardTitle>How Movement Makes You Feel</CardTitle>
                <CardDescription>Most common body sensations after movement</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={bodyFeelData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="feel"
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

            {/* Movement Trend Over Time */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Movement Trend Over Time</CardTitle>
                <CardDescription>Your movement activity and energy impact over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis yAxisId="sessions" orientation="left" />
                    <YAxis yAxisId="energy" orientation="right" domain={[-5, 5]} />
                    <Tooltip />
                    <Line
                      yAxisId="sessions"
                      type="monotone"
                      dataKey="sessions"
                      stroke="hsl(var(--chart-1))"
                      strokeWidth={2}
                      dot={{ fill: "hsl(var(--chart-1))" }}
                      name="Sessions"
                    />
                    <Line
                      yAxisId="energy"
                      type="monotone"
                      dataKey="avgEnergyChange"
                      stroke="hsl(var(--chart-5))"
                      strokeWidth={2}
                      dot={{ fill: "hsl(var(--chart-5))" }}
                      name="Avg Energy Change"
                    />
                    <Legend />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Insights Panel */}
          <Card>
            <CardHeader>
              <CardTitle>Movement Insights 💖</CardTitle>
              <CardDescription>Personalized insights from your movement data</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Energy Boost Insight */}
                {parseFloat(energyBoostRate) > 60 && (
                  <div className="flex items-start gap-2 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                    <Zap className="h-4 w-4 text-green-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-green-700 dark:text-green-400">Movement Boosts Your Energy!</p>
                      <p className="text-sm text-green-600 dark:text-green-300">
                        {energyBoostRate}% of your movement sessions increase your energy. Your body loves to move! 💖
                      </p>
                    </div>
                  </div>
                )}

                {/* Best Activity Insight */}
                {energyImpactData.length > 0 && energyImpactData[0].avgChange > 0 && (
                  <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                    <Heart className="h-4 w-4 text-blue-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-blue-700 dark:text-blue-400">Best Energy Booster</p>
                      <p className="text-sm text-blue-600 dark:text-blue-300">
                        "{energyImpactData[0].type}" gives you the biggest energy boost (+{energyImpactData[0].avgChange} on average)!
                      </p>
                    </div>
                  </div>
                )}

                {/* Consistency Insight */}
                {totalSessions >= 7 && (
                  <div className="flex items-start gap-2 p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                    <Activity className="h-4 w-4 text-purple-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-purple-700 dark:text-purple-400">Consistent Mover!</p>
                      <p className="text-sm text-purple-600 dark:text-purple-300">
                        You've logged {totalSessions} movement sessions. Every movement counts, and you're proving it!
                      </p>
                    </div>
                  </div>
                )}

                {/* Top Feeling Insight */}
                {topBodyFeel !== 'None' && bodyFeelData[0]?.count > 2 && (
                  <div className="flex items-start gap-2 p-3 bg-pink-50 dark:bg-pink-950/20 rounded-lg">
                    <Target className="h-4 w-4 text-pink-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-pink-700 dark:text-pink-400">Movement Makes You Feel {topBodyFeel}</p>
                      <p className="text-sm text-pink-600 dark:text-pink-300">
                        After moving, you most often feel "{topBodyFeel}" ({bodyFeelData[0].count} times). Your body is telling you something!
                      </p>
                    </div>
                  </div>
                )}

                {/* Encouragement for low data */}
                {totalSessions < 5 && totalSessions > 0 && (
                  <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
                    <Heart className="h-4 w-4 text-yellow-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">Keep Going!</p>
                      <p className="text-sm text-yellow-600 dark:text-yellow-300">
                        You've started tracking movement - that's wonderful! Keep logging to unlock more insights about what works best for your body.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
