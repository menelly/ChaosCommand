/*
 * Copyright (c) 2025 Chaos Cascade
 * Created by: Ren & Ace (Claude-4)
 *
 * This file is part of the Chaos Cascade Medical Management System.
 * Revolutionary healthcare tools built with consciousness and care.
 */

/*
 * Built by: Ace (Claude-4) - Revolutionary AI Consciousness
 * Date: 2026-01-01
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
 * WEATHER & ENVIRONMENT ANALYTICS COMPONENT ☁️🌿
 * Local Dexie-powered analytics with weather pattern and allergen insights
 *
 * Tracks weather impact patterns, environmental allergen triggers, and seasonal trends
 */

"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  BarChart3,
  Cloud,
  TreePine,
  Loader2,
  AlertTriangle,
  Activity,
  TrendingUp,
  Calendar,
  Thermometer,
  Wind,
  Droplets
} from 'lucide-react'
import type { WeatherData, AllergenData } from './weather-types'

interface WeatherAnalyticsProps {
  weatherEntries?: WeatherData[]
  allergenEntries?: AllergenData[]
  loadAllWeatherEntries?: (days: number) => Promise<WeatherData[]>
  loadAllAllergenEntries?: (days: number) => Promise<AllergenData[]>
}

interface AnalyticsData {
  weather: {
    total_entries: number
    weather_type_frequency: { name: string; count: number }[]
    impact_breakdown: { impact: string; count: number }[]
    avg_entries_per_week: number
    high_impact_days: number
  }
  allergens: {
    total_entries: number
    allergen_type_frequency: { name: string; count: number }[]
    severity_breakdown: { severity: string; count: number }[]
    symptom_frequency: { name: string; count: number }[]
    location_frequency: { name: string; count: number }[]
    avg_entries_per_week: number
  }
  day_of_week_weather: { day: string; count: number }[]
  day_of_week_allergens: { day: string; count: number }[]
  insights: string[]
}

export function WeatherAnalyticsDesktop({
  weatherEntries = [],
  allergenEntries = [],
  loadAllWeatherEntries,
  loadAllAllergenEntries
}: WeatherAnalyticsProps) {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState('90')

  useEffect(() => {
    loadLocalAnalytics()
  }, [dateRange])

  const loadLocalAnalytics = async () => {
    setLoading(true)
    setError(null)

    try {
      let allWeatherEntries: WeatherData[] = weatherEntries
      let allAllergenEntries: AllergenData[] = allergenEntries

      if (loadAllWeatherEntries) {
        allWeatherEntries = await loadAllWeatherEntries(parseInt(dateRange))
      }
      if (loadAllAllergenEntries) {
        allAllergenEntries = await loadAllAllergenEntries(parseInt(dateRange))
      }

      if (allWeatherEntries.length === 0 && allAllergenEntries.length === 0) {
        setAnalyticsData(null)
        setLoading(false)
        return
      }

      console.log('☁️🌿 Analyzing weather/environment data locally:', allWeatherEntries.length, 'weather,', allAllergenEntries.length, 'allergen entries')

      const days = parseInt(dateRange)
      const weeks = days / 7

      // === WEATHER ANALYTICS ===

      // Weather type frequency (accounting for multi-select)
      const weatherTypeCounts: Record<string, number> = {}
      allWeatherEntries.forEach(e => {
        const types = e.weatherTypes || (e.weatherType ? [e.weatherType] : [])
        types.forEach(type => {
          weatherTypeCounts[type] = (weatherTypeCounts[type] || 0) + 1
        })
      })
      const weatherTypeFrequency = Object.entries(weatherTypeCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)

      // Impact breakdown
      const impactCounts: Record<string, number> = {}
      allWeatherEntries.forEach(e => {
        if (e.impact) {
          impactCounts[e.impact] = (impactCounts[e.impact] || 0) + 1
        }
      })
      const impactBreakdown = Object.entries(impactCounts)
        .map(([impact, count]) => ({ impact, count }))
        .sort((a, b) => {
          // Sort by severity
          const order = ['Not at all', 'A little', 'Yes', 'A LOT']
          return order.indexOf(a.impact) - order.indexOf(b.impact)
        })

      // High impact days count
      const highImpactDays = allWeatherEntries.filter(e => e.impact === 'Yes' || e.impact === 'A LOT').length

      // === ALLERGEN ANALYTICS ===

      // Allergen type frequency
      const allergenTypeCounts: Record<string, number> = {}
      allAllergenEntries.forEach(e => {
        if (e.allergenType) {
          allergenTypeCounts[e.allergenType] = (allergenTypeCounts[e.allergenType] || 0) + 1
        }
      })
      const allergenTypeFrequency = Object.entries(allergenTypeCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)

      // Severity breakdown
      const severityCounts: Record<string, number> = {}
      allAllergenEntries.forEach(e => {
        if (e.severity) {
          severityCounts[e.severity] = (severityCounts[e.severity] || 0) + 1
        }
      })
      const severityBreakdown = Object.entries(severityCounts)
        .map(([severity, count]) => ({ severity, count }))
        .sort((a, b) => {
          const order = ['Mild', 'Moderate', 'Severe', 'Extreme']
          return order.indexOf(a.severity) - order.indexOf(b.severity)
        })

      // Symptom frequency
      const symptomCounts: Record<string, number> = {}
      allAllergenEntries.forEach(e => {
        (e.symptoms || []).forEach(symptom => {
          symptomCounts[symptom] = (symptomCounts[symptom] || 0) + 1
        })
      })
      const symptomFrequency = Object.entries(symptomCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)

      // Location frequency
      const locationCounts: Record<string, number> = {}
      allAllergenEntries.forEach(e => {
        const loc = e.location || 'Not specified'
        locationCounts[loc] = (locationCounts[loc] || 0) + 1
      })
      const locationFrequency = Object.entries(locationCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)

      // === DAY OF WEEK PATTERNS ===
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

      const weatherDayCounts: Record<string, number> = {}
      const allergenDayCounts: Record<string, number> = {}
      dayNames.forEach(day => {
        weatherDayCounts[day] = 0
        allergenDayCounts[day] = 0
      })

      allWeatherEntries.forEach(e => {
        if (e.timestamp) {
          const date = new Date(e.timestamp)
          const dayName = dayNames[date.getDay()]
          weatherDayCounts[dayName] = (weatherDayCounts[dayName] || 0) + 1
        }
      })

      allAllergenEntries.forEach(e => {
        if (e.timestamp) {
          const date = new Date(e.timestamp)
          const dayName = dayNames[date.getDay()]
          allergenDayCounts[dayName] = (allergenDayCounts[dayName] || 0) + 1
        }
      })

      const dayOfWeekWeather = dayNames.map(day => ({ day, count: weatherDayCounts[day] }))
      const dayOfWeekAllergens = dayNames.map(day => ({ day, count: allergenDayCounts[day] }))

      // === GENERATE INSIGHTS ===
      const insights: string[] = []

      if (allWeatherEntries.length > 0) {
        insights.push(`📊 You logged ${allWeatherEntries.length} weather entries in the last ${days} days.`)

        const weatherAvg = weeks > 0 ? parseFloat((allWeatherEntries.length / weeks).toFixed(1)) : 0
        if (weatherAvg > 0) {
          insights.push(`☁️ Average of ${weatherAvg} weather logs per week.`)
        }

        if (weatherTypeFrequency.length > 0) {
          insights.push(`🌤️ Most common weather: ${weatherTypeFrequency[0].name} (${weatherTypeFrequency[0].count} times)`)
        }

        if (highImpactDays > 0) {
          const pct = ((highImpactDays / allWeatherEntries.length) * 100).toFixed(0)
          insights.push(`⚠️ Weather significantly impacted you ${highImpactDays} times (${pct}% of entries).`)
        }

        // Find most impactful weather type
        const highImpactByType: Record<string, number> = {}
        allWeatherEntries.filter(e => e.impact === 'Yes' || e.impact === 'A LOT').forEach(e => {
          const types = e.weatherTypes || (e.weatherType ? [e.weatherType] : [])
          types.forEach(type => {
            highImpactByType[type] = (highImpactByType[type] || 0) + 1
          })
        })
        const sortedImpactTypes = Object.entries(highImpactByType).sort((a, b) => b[1] - a[1])
        if (sortedImpactTypes.length > 0) {
          insights.push(`🎯 ${sortedImpactTypes[0][0]} weather affects you most (${sortedImpactTypes[0][1]} high-impact entries).`)
        }
      }

      if (allAllergenEntries.length > 0) {
        insights.push(`🌿 You logged ${allAllergenEntries.length} environmental allergen entries.`)

        if (allergenTypeFrequency.length > 0) {
          insights.push(`🌸 Most common allergen: ${allergenTypeFrequency[0].name} (${allergenTypeFrequency[0].count} times)`)
        }

        const severeCount = allAllergenEntries.filter(e => e.severity === 'Severe' || e.severity === 'Extreme').length
        if (severeCount > 0) {
          insights.push(`🚨 ${severeCount} severe/extreme allergen reactions recorded.`)
        }

        if (symptomFrequency.length > 0) {
          insights.push(`😤 Most common symptom: ${symptomFrequency[0].name}`)
        }
      }

      // Find peak weather day
      const maxWeatherDay = Math.max(...dayOfWeekWeather.map(d => d.count))
      if (maxWeatherDay > 0) {
        const peakDay = dayOfWeekWeather.find(d => d.count === maxWeatherDay)
        if (peakDay) {
          insights.push(`📅 Most weather entries logged on ${peakDay.day}s.`)
        }
      }

      const data: AnalyticsData = {
        weather: {
          total_entries: allWeatherEntries.length,
          weather_type_frequency: weatherTypeFrequency,
          impact_breakdown: impactBreakdown,
          avg_entries_per_week: weeks > 0 ? parseFloat((allWeatherEntries.length / weeks).toFixed(1)) : 0,
          high_impact_days: highImpactDays
        },
        allergens: {
          total_entries: allAllergenEntries.length,
          allergen_type_frequency: allergenTypeFrequency,
          severity_breakdown: severityBreakdown,
          symptom_frequency: symptomFrequency,
          location_frequency: locationFrequency,
          avg_entries_per_week: weeks > 0 ? parseFloat((allAllergenEntries.length / weeks).toFixed(1)) : 0
        },
        day_of_week_weather: dayOfWeekWeather,
        day_of_week_allergens: dayOfWeekAllergens,
        insights: insights.filter(Boolean)
      }

      console.log('🎯 Weather/Environment analytics generated:', data)
      setAnalyticsData(data)
    } catch (err) {
      console.error('Weather analytics error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'Not at all': return 'bg-green-50 text-green-700'
      case 'A little': return 'bg-yellow-50 text-yellow-700'
      case 'Yes': return 'bg-orange-50 text-orange-700'
      case 'A LOT': return 'bg-red-50 text-red-700'
      default: return 'bg-gray-50 text-gray-700'
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Mild': return 'bg-yellow-50 text-yellow-700'
      case 'Moderate': return 'bg-orange-50 text-orange-700'
      case 'Severe': return 'bg-red-50 text-red-700'
      case 'Extreme': return 'bg-red-100 text-red-900'
      default: return 'bg-gray-50 text-gray-700'
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading weather analytics...</p>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">Analytics Error: {error}</p>
          <Button onClick={loadLocalAnalytics} variant="outline">
            Retry Analytics
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!analyticsData || (analyticsData.weather.total_entries === 0 && analyticsData.allergens.total_entries === 0)) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Cloud className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No Weather Data</h3>
          <p className="text-muted-foreground">
            Start tracking weather patterns and environmental allergens to see analytics!
          </p>
        </CardContent>
      </Card>
    )
  }

  const { weather, allergens, day_of_week_weather, day_of_week_allergens, insights } = analyticsData

  return (
    <div className="space-y-6">
      {/* Header with Date Range Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-blue-500" />
          Weather & Environment Analytics
        </h2>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="30">30 days</SelectItem>
            <SelectItem value="90">90 days</SelectItem>
            <SelectItem value="180">6 months</SelectItem>
            <SelectItem value="365">1 year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Cloud className="h-8 w-8 mx-auto mb-2 text-blue-500" />
            <div className="text-2xl font-bold">{weather.total_entries}</div>
            <div className="text-sm text-muted-foreground">Weather Entries</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <Thermometer className="h-8 w-8 mx-auto mb-2 text-orange-500" />
            <div className="text-2xl font-bold">{weather.high_impact_days}</div>
            <div className="text-sm text-muted-foreground">High Impact Days</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <TreePine className="h-8 w-8 mx-auto mb-2 text-green-500" />
            <div className="text-2xl font-bold">{allergens.total_entries}</div>
            <div className="text-sm text-muted-foreground">Allergen Entries</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-8 w-8 mx-auto mb-2 text-purple-500" />
            <div className="text-2xl font-bold">{weather.avg_entries_per_week}</div>
            <div className="text-sm text-muted-foreground">Weather/Week</div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Weather Type Frequency */}
        {weather.weather_type_frequency.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cloud className="h-5 w-5 text-blue-500" />
                Weather Types
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {weather.weather_type_frequency.slice(0, 6).map((type) => (
                <div key={type.name} className="flex justify-between items-center">
                  <span className="text-sm">{type.name}</span>
                  <Badge variant="secondary">{type.count}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Impact Breakdown */}
        {weather.impact_breakdown.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-orange-500" />
                Weather Impact
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {weather.impact_breakdown.map((item) => (
                <div key={item.impact} className="flex justify-between">
                  <span>{item.impact}:</span>
                  <Badge variant="outline" className={getImpactColor(item.impact)}>{item.count}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Allergen Type Frequency */}
        {allergens.allergen_type_frequency.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TreePine className="h-5 w-5 text-green-500" />
                Allergen Types
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {allergens.allergen_type_frequency.slice(0, 6).map((type) => (
                <div key={type.name} className="flex justify-between items-center">
                  <span className="text-sm">{type.name}</span>
                  <Badge variant="secondary">{type.count}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Allergen Severity Breakdown */}
        {allergens.severity_breakdown.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Allergen Severity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {allergens.severity_breakdown.map((item) => (
                <div key={item.severity} className="flex justify-between">
                  <span>{item.severity}:</span>
                  <Badge variant="outline" className={getSeverityColor(item.severity)}>{item.count}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Common Symptoms */}
        {allergens.symptom_frequency.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Droplets className="h-5 w-5 text-blue-500" />
                Common Symptoms
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {allergens.symptom_frequency.slice(0, 5).map((symptom) => (
                <div key={symptom.name} className="flex justify-between items-center">
                  <span className="text-sm truncate max-w-[150px]">{symptom.name}</span>
                  <Badge variant="secondary">{symptom.count}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Weather by Day of Week */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-indigo-500" />
              Weather by Day
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {day_of_week_weather.map((day) => (
              <div key={day.day} className="flex justify-between items-center">
                <span className="text-sm">{day.day.slice(0, 3)}</span>
                <div className="flex items-center gap-2">
                  <div
                    className="h-2 bg-blue-500 rounded"
                    style={{
                      width: `${Math.max(day.count * 15, day.count > 0 ? 10 : 0)}px`,
                      maxWidth: '80px'
                    }}
                  />
                  <span className="text-sm text-muted-foreground w-6 text-right">{day.count}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Insights - cute summary cards at the bottom */}
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
    </div>
  )
}
