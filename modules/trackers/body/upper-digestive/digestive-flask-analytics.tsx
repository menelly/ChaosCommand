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
/**
 * DIGESTIVE FLASK ANALYTICS COMPONENT 🍽️
 * Flask-powered digestive tracking, symptom analysis, and food correlation detection
 * 
 * Because digestive patterns matter for gut health! 🦠
 */

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Utensils, TrendingUp, AlertCircle, Clock, Target, Activity, Heart } from 'lucide-react'
import { useDailyData, CATEGORIES } from "@/lib/database"
import { format, subDays } from "date-fns"
import { graphService } from "@/lib/graph-service"

interface DigestiveEntry {
  entry_date: string
  entry_time: string
  symptom_type: string
  severity: number
  duration_minutes?: number
  triggers: string[]
  foods_eaten: string[]
  medications: string[]
  relief_methods: string[]
  effectiveness?: number
  notes: string
  tags?: string[]
}

interface DigestiveFlaskAnalyticsProps {
  entries: DigestiveEntry[]
  currentDate: string
}

interface FlaskAnalyticsData {
  period: {
    start: string
    end: string
    days: number
  }
  total_episodes: number
  symptom_analysis: {
    avg_severity: number
    max_severity: number
    severity_distribution: Record<string, number>
    symptom_types: Record<string, number>
    most_common_symptom: string
  }
  duration: {
    has_data: boolean
    avg_duration?: number
    total_minutes?: number
    longest_episode?: number
    shortest_episode?: number
  }
  triggers: {
    trigger_counts: Record<string, number>
    top_triggers: string[]
  }
  foods: {
    food_counts: Record<string, number>
    problematic_foods: string[]
  }
  medications: {
    medication_counts: Record<string, number>
    effectiveness_avg: Record<string, number>
    most_effective: string[]
  }
  patterns: {
    episodes_by_day: Record<string, number>
    episodes_by_hour: Record<string, number>
    weekly_average: number
    daily_average: number
  }
  relief: {
    relief_methods: Record<string, number>
    avg_effectiveness: number
  }
  insights: string[]
  charts: Record<string, string>
  error?: string
}

export default function DigestiveFlaskAnalytics({ entries, currentDate }: DigestiveFlaskAnalyticsProps) {
  const [analyticsData, setAnalyticsData] = useState<FlaskAnalyticsData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState('30')
  const { getCategoryData } = useDailyData()

  // Load Flask analytics when date range changes
  useEffect(() => {
    loadFlaskAnalytics()
  }, [dateRange, currentDate])

  const loadFlaskAnalytics = async () => {
    setLoading(true)
    setError(null)

    try {
      // Load entries from multiple dates across the date range
      const days = parseInt(dateRange)
      const endDate = new Date(currentDate)
      const allEntries: any[] = []

      // Generate date range
      const dateRangeArray = []
      for (let i = 0; i < days; i++) {
        dateRangeArray.push(subDays(endDate, i))
      }

      // Collect all entries from database
      for (const date of dateRangeArray) {
        const dateKey = format(date, 'yyyy-MM-dd')
        const records = await getCategoryData(dateKey, CATEGORIES.TRACKER)
        const upperDigestiveRecord = records.find(record => record.subcategory === 'upper-digestive')

        if (upperDigestiveRecord?.content?.entries) {
          let entries = upperDigestiveRecord.content.entries
          if (typeof entries === 'string') {
            try {
              entries = JSON.parse(entries)
            } catch (e) {
              console.error('Failed to parse JSON:', e)
              entries = []
            }
          }
          if (Array.isArray(entries)) {
            // Add the date to each entry since it's missing from the database entries
            const entriesWithDate = entries.map(entry => ({
              ...entry,
              date: entry.date || dateKey  // Use the dateKey if entry.date is missing
            }))
            allEntries.push(...entriesWithDate)
          }
        }
      }

      // Convert entries to the format expected by Flask
      const flaskEntries = allEntries.map(entry => ({
        date: entry.date,
        time: entry.time,
        symptoms: entry.symptoms || [],
        severity: entry.severity,
        triggers: entry.triggers || [],
        treatments: entry.treatments || [],
        notes: entry.notes || '',
        tags: entry.tags || []
      }))

      console.log('🍽️ Analyzing digestive data with Graph Service:', flaskEntries.length, 'entries from', days, 'days')
      console.log('📊 Sample entry:', flaskEntries[0])
      console.log('📅 Date range:', dateRangeArray.map(d => format(d, 'yyyy-MM-dd')))

      // 🚀 Use Graph Service instead of Flask for lightning-fast local analytics!
      const [symptomCorrelations, effectiveInterventions] = await Promise.all([
        graphService.findSymptomCorrelations('digestive'),
        graphService.findEffectiveInterventions('nausea')
      ])

      // Generate comprehensive analytics from Graph Service data
      const data = {
        period: {
          start: dateRangeArray[0] ? format(dateRangeArray[0], 'yyyy-MM-dd') : '',
          end: dateRangeArray[dateRangeArray.length - 1] ? format(dateRangeArray[dateRangeArray.length - 1], 'yyyy-MM-dd') : '',
          days: parseInt(dateRange)
        },
        total_episodes: flaskEntries.length,
        avg_severity: flaskEntries.length > 0 ? flaskEntries.reduce((sum, e) => sum + e.severity, 0) / flaskEntries.length : 0,
        weekly_average: (flaskEntries.length / parseInt(dateRange)) * 7,
        symptom_analysis: {
          symptom_types: flaskEntries.reduce((acc, entry) => {
            acc[entry.episodeType] = (acc[entry.episodeType] || 0) + 1
            return acc
          }, {} as Record<string, number>),
          most_common: flaskEntries.length > 0 ? flaskEntries[0].episodeType : '',
          correlations: symptomCorrelations
        },
        interventions: {
          most_effective: effectiveInterventions,
          success_rate: effectiveInterventions.length > 0 ? effectiveInterventions[0].effectiveness : 0
        }
      }

      console.log('🎯 Graph Service digestive analytics generated:', data)

      setAnalyticsData(data)
    } catch (err) {
      console.error('Flask digestive analytics error:', err)
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
          <p className="text-muted-foreground">Loading Flask-powered digestive analytics...</p>
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
          <Button onClick={loadFlaskAnalytics} variant="outline">
            Retry Analytics
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!analyticsData || entries.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Utensils className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No Digestive Data</h3>
          <p className="text-muted-foreground">
            Record digestive symptoms to see Flask-powered food correlation and trigger analytics!
          </p>
        </CardContent>
      </Card>
    )
  }

  const { symptom_analysis, duration, triggers, foods, medications, patterns, relief, insights } = analyticsData

  return (
    <div className="space-y-6">
      {/* Header with Date Range Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Utensils className="h-6 w-6 text-green-500" />
          Flask-Powered Digestive Analytics 🍽️
        </h2>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">7 days</SelectItem>
            <SelectItem value="30">30 days</SelectItem>
            <SelectItem value="90">90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Insights Cards */}
      {insights && insights.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {insights.map((insight, index) => (
            <Card key={index} className="border-l-4 border-l-green-500">
              <CardContent className="p-4">
                <p className="text-sm font-medium">{insight}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Activity className="h-8 w-8 mx-auto mb-2 text-orange-500" />
            <div className="text-2xl font-bold">{analyticsData.total_episodes}</div>
            <div className="text-sm text-muted-foreground">Total Episodes</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-8 w-8 mx-auto mb-2 text-red-500" />
            <div className="text-2xl font-bold">{symptom_analysis.avg_severity}/10</div>
            <div className="text-sm text-muted-foreground">Avg Severity</div>
          </CardContent>
        </Card>

        {duration.has_data && (
          <Card>
            <CardContent className="p-4 text-center">
              <Clock className="h-8 w-8 mx-auto mb-2 text-blue-500" />
              <div className="text-2xl font-bold">{duration.avg_duration}m</div>
              <div className="text-sm text-muted-foreground">Avg Duration</div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-4 text-center">
            <Target className="h-8 w-8 mx-auto mb-2 text-purple-500" />
            <div className="text-2xl font-bold">{patterns.weekly_average}</div>
            <div className="text-sm text-muted-foreground">Weekly Average</div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Symptom Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-orange-500" />
              Symptom Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span>Most Common:</span>
              <Badge variant="outline">{symptom_analysis.most_common_symptom}</Badge>
            </div>
            <div className="flex justify-between">
              <span>Max Severity:</span>
              <Badge variant={symptom_analysis.max_severity >= 8 ? "destructive" : "secondary"}>
                {symptom_analysis.max_severity}/10
              </Badge>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">Symptom Types:</div>
              {Object.entries(symptom_analysis.symptom_types).slice(0, 3).map(([type, count]) => (
                <div key={type} className="flex justify-between text-sm">
                  <span>{type}:</span>
                  <span className="text-muted-foreground">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Problematic Foods */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Problematic Foods 🚫
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {foods.problematic_foods.slice(0, 5).map((food, index) => (
              <div key={food} className="flex justify-between">
                <span className="text-sm">{food}</span>
                <Badge variant="destructive">{foods.food_counts[food]}</Badge>
              </div>
            ))}
            {foods.problematic_foods.length === 0 && (
              <p className="text-sm text-muted-foreground">No clear food triggers identified</p>
            )}
          </CardContent>
        </Card>

        {/* Relief Methods */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-green-500" />
              Relief Methods 💊
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(relief.relief_methods).slice(0, 5).map(([method, count]) => (
              <div key={method} className="flex justify-between">
                <span className="text-sm">{method}</span>
                <Badge variant="outline">{count}</Badge>
              </div>
            ))}
            <div className="pt-2 border-t">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Avg Effectiveness:</span>
                <Badge variant="outline">{relief.avg_effectiveness}/10</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 🧃 Symptom Type Breakdown - ALL THE DIGESTIVE CHAOS! */}
        {symptom_analysis.symptom_types && Object.keys(symptom_analysis.symptom_types).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-purple-500" />
                Symptom Type Breakdown 🤢
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(symptom_analysis.symptom_types).map(([type, count]) => {
                const percentage = ((count / analyticsData.total_episodes) * 100).toFixed(1)
                const getSymptomIcon = (symptomType: string) => {
                  switch (symptomType.toLowerCase()) {
                    case 'nausea': return '🤢'
                    case 'reflux': return '🔥'
                    case 'pain': return '😣'
                    case 'bloating': return '🎈'
                    case 'cramping': return '⚡'
                    case 'heartburn': return '💔'
                    default: return '🤮'
                  }
                }

                return (
                  <div key={type} className="flex justify-between items-center">
                    <span className="flex items-center gap-2">
                      <span>{getSymptomIcon(type)}</span>
                      <span className="capitalize">{type}</span>
                    </span>
                    <Badge variant="outline">
                      {count} ({percentage}%)
                    </Badge>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        )}

        {/* 🧃 Medication Effectiveness - What actually helps! */}
        {medications.most_effective && medications.most_effective.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-green-500" />
                Medication Effectiveness 💊
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {medications.most_effective.slice(0, 5).map((med) => (
                <div key={med} className="flex justify-between items-center">
                  <span className="text-sm">{med}</span>
                  <Badge variant="outline">
                    {medications.effectiveness_avg[med]}/10
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
