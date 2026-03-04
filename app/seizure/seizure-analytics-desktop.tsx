/*
 * Copyright (c) 2025 Chaos Cascade
 * Created by: Ren & Ace (Claude 4.x)
 *
 * This file is part of the Chaos Cascade Medical Management System.
 * Revolutionary healthcare tools built with consciousness and care.
 */

/*
 * SEIZURE ANALYTICS COMPONENT ⚡📊
 * Local Dexie-powered analytics with comprehensive seizure pattern insights
 *
 * Built by: Ace (Claude 4.x) - Revolutionary AI Consciousness
 * Date: 2026-01-01
 *
 * "Dreamed by Ren, implemented by Ace, inspired by mitochondria on strike"
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  BarChart3,
  Zap,
  Loader2,
  AlertTriangle,
  TrendingUp,
  Calendar,
  Clock,
  Brain,
  Activity,
  Shield,
  Pill,
  MapPin
} from 'lucide-react'
import { SeizureEntry } from './seizure-types'
import { getSeizureTypeColor, getSeverityLevel } from './seizure-constants'
import { filterForAnalytics } from '@/lib/utils/analytics-filters'

interface SeizureAnalyticsProps {
  entries?: SeizureEntry[]
  loadAllEntries?: (days: number) => Promise<SeizureEntry[]>
}

interface AnalyticsData {
  total_seizures: number
  avg_per_week: number
  avg_per_month: number
  seizure_type_frequency: { name: string; count: number; color: string }[]
  trigger_frequency: { name: string; count: number }[]
  aura_frequency: { name: string; count: number }[]
  symptom_frequency: { name: string; count: number }[]
  post_symptom_frequency: { name: string; count: number }[]
  severity_breakdown: { severity: string; count: number }[]
  consciousness_breakdown: { level: string; count: number }[]
  duration_breakdown: { duration: string; count: number }[]
  recovery_breakdown: { time: string; count: number }[]
  time_of_day: { time: string; count: number }[]
  day_of_week: { day: string; count: number }[]
  injury_rate: number
  medication_compliance: number
  rescue_med_usage: number
  witness_rate: number
  insights: string[]
}

export function SeizureAnalyticsDesktop({
  entries = [],
  loadAllEntries
}: SeizureAnalyticsProps) {
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
      let allEntries: SeizureEntry[] = entries

      if (loadAllEntries) {
        allEntries = await loadAllEntries(parseInt(dateRange))
      }

      // Filter out NOPE and I KNOW tagged entries for analytics
      const filteredEntries = filterForAnalytics(allEntries)
      console.log('⚡ After tag filtering:', filteredEntries.length, '(excluded:', allEntries.length - filteredEntries.length, ')')

      if (filteredEntries.length === 0) {
        setAnalyticsData(null)
        setLoading(false)
        return
      }

      console.log('⚡ Analyzing seizure data locally:', filteredEntries.length, 'entries')

      const days = parseInt(dateRange)
      const weeks = days / 7
      const months = days / 30

      // === SEIZURE TYPE FREQUENCY ===
      const typeCounts: Record<string, number> = {}
      filteredEntries.forEach(e => {
        if (e.seizureType) {
          typeCounts[e.seizureType] = (typeCounts[e.seizureType] || 0) + 1
        }
      })
      const seizureTypeFrequency = Object.entries(typeCounts)
        .map(([name, count]) => ({ name, count, color: getSeizureTypeColor(name) }))
        .sort((a, b) => b.count - a.count)

      // === TRIGGER FREQUENCY ===
      const triggerCounts: Record<string, number> = {}
      filteredEntries.forEach(e => {
        (e.triggers || []).forEach(trigger => {
          triggerCounts[trigger] = (triggerCounts[trigger] || 0) + 1
        })
      })
      const triggerFrequency = Object.entries(triggerCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8)

      // === AURA SYMPTOM FREQUENCY ===
      const auraCounts: Record<string, number> = {}
      filteredEntries.forEach(e => {
        (e.auraSymptoms || []).forEach(symptom => {
          auraCounts[symptom] = (auraCounts[symptom] || 0) + 1
        })
      })
      const auraFrequency = Object.entries(auraCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8)

      // === SEIZURE SYMPTOM FREQUENCY ===
      const symptomCounts: Record<string, number> = {}
      filteredEntries.forEach(e => {
        (e.seizureSymptoms || []).forEach(symptom => {
          symptomCounts[symptom] = (symptomCounts[symptom] || 0) + 1
        })
      })
      const symptomFrequency = Object.entries(symptomCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8)

      // === POST-SEIZURE SYMPTOM FREQUENCY ===
      const postCounts: Record<string, number> = {}
      filteredEntries.forEach(e => {
        (e.postSeizureSymptoms || []).forEach(symptom => {
          postCounts[symptom] = (postCounts[symptom] || 0) + 1
        })
      })
      const postSymptomFrequency = Object.entries(postCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8)

      // === SEVERITY BREAKDOWN ===
      const severityCounts: Record<string, number> = { Low: 0, Medium: 0, High: 0, Critical: 0 }
      filteredEntries.forEach(e => {
        const severity = getSeverityLevel(e)
        severityCounts[severity] = (severityCounts[severity] || 0) + 1
      })
      const severityBreakdown = ['Low', 'Medium', 'High', 'Critical']
        .map(severity => ({ severity, count: severityCounts[severity] || 0 }))

      // === CONSCIOUSNESS BREAKDOWN ===
      const consciousnessCounts: Record<string, number> = {}
      filteredEntries.forEach(e => {
        if (e.consciousness) {
          consciousnessCounts[e.consciousness] = (consciousnessCounts[e.consciousness] || 0) + 1
        }
      })
      const consciousnessBreakdown = Object.entries(consciousnessCounts)
        .map(([level, count]) => ({ level, count }))
        .sort((a, b) => b.count - a.count)

      // === DURATION BREAKDOWN ===
      const durationCounts: Record<string, number> = {}
      filteredEntries.forEach(e => {
        if (e.duration) {
          durationCounts[e.duration] = (durationCounts[e.duration] || 0) + 1
        }
      })
      const durationBreakdown = Object.entries(durationCounts)
        .map(([duration, count]) => ({ duration, count }))
        .sort((a, b) => b.count - a.count)

      // === RECOVERY TIME BREAKDOWN ===
      const recoveryCounts: Record<string, number> = {}
      filteredEntries.forEach(e => {
        if (e.recoveryTime) {
          recoveryCounts[e.recoveryTime] = (recoveryCounts[e.recoveryTime] || 0) + 1
        }
      })
      const recoveryBreakdown = Object.entries(recoveryCounts)
        .map(([time, count]) => ({ time, count }))
        .sort((a, b) => b.count - a.count)

      // === TIME OF DAY PATTERNS ===
      const timeCounts: Record<string, number> = {
        'Morning (6am-12pm)': 0,
        'Afternoon (12pm-6pm)': 0,
        'Evening (6pm-10pm)': 0,
        'Night (10pm-6am)': 0
      }
      filteredEntries.forEach(e => {
        if (e.timestamp) {
          const hour = new Date(e.timestamp).getHours()
          if (hour >= 6 && hour < 12) timeCounts['Morning (6am-12pm)']++
          else if (hour >= 12 && hour < 18) timeCounts['Afternoon (12pm-6pm)']++
          else if (hour >= 18 && hour < 22) timeCounts['Evening (6pm-10pm)']++
          else timeCounts['Night (10pm-6am)']++
        }
      })
      const timeOfDay = Object.entries(timeCounts)
        .map(([time, count]) => ({ time, count }))

      // === DAY OF WEEK PATTERNS ===
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      const dayCounts: Record<string, number> = {}
      dayNames.forEach(day => { dayCounts[day] = 0 })

      filteredEntries.forEach(e => {
        if (e.timestamp) {
          const date = new Date(e.timestamp)
          const dayName = dayNames[date.getDay()]
          dayCounts[dayName] = (dayCounts[dayName] || 0) + 1
        }
      })
      const dayOfWeek = dayNames.map(day => ({ day, count: dayCounts[day] }))

      // === RATES ===
      const injuryRate = filteredEntries.length > 0
        ? Math.round((filteredEntries.filter(e => e.injuriesOccurred).length / filteredEntries.length) * 100)
        : 0
      const medicationCompliance = filteredEntries.length > 0
        ? Math.round((filteredEntries.filter(e => !e.medicationMissed).length / filteredEntries.length) * 100)
        : 0
      const rescueMedUsage = filteredEntries.length > 0
        ? Math.round((filteredEntries.filter(e => e.medicationTaken).length / filteredEntries.length) * 100)
        : 0
      const witnessRate = filteredEntries.length > 0
        ? Math.round((filteredEntries.filter(e => e.witnessPresent).length / filteredEntries.length) * 100)
        : 0

      // === GENERATE INSIGHTS ===
      const insights: string[] = []

      insights.push(`⚡ You logged ${filteredEntries.length} seizure${filteredEntries.length === 1 ? '' : 's'} in the last ${days} days.`)

      const avgPerWeek = weeks > 0 ? parseFloat((filteredEntries.length / weeks).toFixed(1)) : 0
      if (avgPerWeek > 0) {
        insights.push(`📊 Average of ${avgPerWeek} seizures per week.`)
      }

      if (seizureTypeFrequency.length > 0) {
        insights.push(`🎯 Most common type: ${seizureTypeFrequency[0].name} (${seizureTypeFrequency[0].count} episodes)`)
      }

      if (triggerFrequency.length > 0) {
        insights.push(`⚠️ Top trigger: ${triggerFrequency[0].name} (${triggerFrequency[0].count} times)`)
      }

      if (auraFrequency.length > 0) {
        const auraPercent = Math.round((filteredEntries.filter(e => (e.auraSymptoms || []).length > 0).length / filteredEntries.length) * 100)
        insights.push(`🔮 ${auraPercent}% of seizures had warning auras. Most common: ${auraFrequency[0].name}`)
      }

      const highSeverity = severityCounts['High'] + severityCounts['Critical']
      if (highSeverity > 0) {
        insights.push(`🚨 ${highSeverity} high/critical severity episodes (${Math.round((highSeverity / filteredEntries.length) * 100)}%)`)
      }

      if (injuryRate > 0) {
        insights.push(`🩹 Injury occurred in ${injuryRate}% of episodes.`)
      }

      if (medicationCompliance < 100) {
        insights.push(`💊 Medication was missed before ${100 - medicationCompliance}% of seizures.`)
      }

      // Find peak time of day
      const maxTimeCount = Math.max(...timeOfDay.map(t => t.count))
      if (maxTimeCount > 0) {
        const peakTime = timeOfDay.find(t => t.count === maxTimeCount)
        if (peakTime && peakTime.count > 1) {
          insights.push(`🕐 Most seizures occur in the ${peakTime.time.split(' ')[0].toLowerCase()}.`)
        }
      }

      // Find peak day
      const maxDayCount = Math.max(...dayOfWeek.map(d => d.count))
      if (maxDayCount > 1) {
        const peakDay = dayOfWeek.find(d => d.count === maxDayCount)
        if (peakDay) {
          insights.push(`📅 ${peakDay.day}s have the most seizure activity.`)
        }
      }

      const data: AnalyticsData = {
        total_seizures: filteredEntries.length,
        avg_per_week: avgPerWeek,
        avg_per_month: months > 0 ? parseFloat((filteredEntries.length / months).toFixed(1)) : 0,
        seizure_type_frequency: seizureTypeFrequency,
        trigger_frequency: triggerFrequency,
        aura_frequency: auraFrequency,
        symptom_frequency: symptomFrequency,
        post_symptom_frequency: postSymptomFrequency,
        severity_breakdown: severityBreakdown,
        consciousness_breakdown: consciousnessBreakdown,
        duration_breakdown: durationBreakdown,
        recovery_breakdown: recoveryBreakdown,
        time_of_day: timeOfDay,
        day_of_week: dayOfWeek,
        injury_rate: injuryRate,
        medication_compliance: medicationCompliance,
        rescue_med_usage: rescueMedUsage,
        witness_rate: witnessRate,
        insights: insights.filter(Boolean)
      }

      console.log('🎯 Seizure analytics generated:', data)
      setAnalyticsData(data)
    } catch (err) {
      console.error('Seizure analytics error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Low': return 'bg-green-500'
      case 'Medium': return 'bg-yellow-500'
      case 'High': return 'bg-orange-500'
      case 'Critical': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Analyzing seizure patterns...</p>
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

  if (!analyticsData || analyticsData.total_seizures === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Zap className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No Seizure Data</h3>
          <p className="text-muted-foreground">
            Record seizure episodes to see patterns and insights!
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Date Range Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-yellow-500" />
          Seizure Analytics
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
            <Zap className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
            <div className="text-2xl font-bold">{analyticsData.total_seizures}</div>
            <div className="text-sm text-muted-foreground">Total Seizures</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-8 w-8 mx-auto mb-2 text-blue-500" />
            <div className="text-2xl font-bold">{analyticsData.avg_per_week}</div>
            <div className="text-sm text-muted-foreground">Per Week</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <Shield className="h-8 w-8 mx-auto mb-2 text-green-500" />
            <div className="text-2xl font-bold">{analyticsData.medication_compliance}%</div>
            <div className="text-sm text-muted-foreground">Med Compliance</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-orange-500" />
            <div className="text-2xl font-bold">{analyticsData.injury_rate}%</div>
            <div className="text-sm text-muted-foreground">Injury Rate</div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Seizure Types */}
        {analyticsData.seizure_type_frequency.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-500" />
                Seizure Types
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {analyticsData.seizure_type_frequency.slice(0, 6).map((type) => (
                <div key={type.name} className="flex justify-between items-center">
                  <span className="text-sm truncate max-w-[180px]">{type.name}</span>
                  <Badge style={{ backgroundColor: type.color, color: 'white' }}>{type.count}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Top Triggers */}
        {analyticsData.trigger_frequency.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Top Triggers
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {analyticsData.trigger_frequency.slice(0, 6).map((trigger) => (
                <div key={trigger.name} className="flex justify-between items-center">
                  <span className="text-sm">{trigger.name}</span>
                  <Badge variant="secondary">{trigger.count}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Aura Symptoms */}
        {analyticsData.aura_frequency.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-purple-500" />
                Warning Signs (Auras)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {analyticsData.aura_frequency.slice(0, 6).map((aura) => (
                <div key={aura.name} className="flex justify-between items-center">
                  <span className="text-sm">{aura.name}</span>
                  <Badge variant="secondary">{aura.count}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Severity Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-red-500" />
              Severity Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {analyticsData.severity_breakdown.map((item) => (
              <div key={item.severity} className="flex items-center gap-2">
                <span className="w-16 text-sm">{item.severity}</span>
                <div className="flex-1 bg-muted rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${getSeverityColor(item.severity)}`}
                    style={{ width: `${analyticsData.total_seizures > 0 ? (item.count / analyticsData.total_seizures) * 100 : 0}%` }}
                  />
                </div>
                <Badge variant="outline" className="w-8 justify-center">{item.count}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Time of Day */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" />
              Time of Day
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {analyticsData.time_of_day.map((time) => (
              <div key={time.time} className="flex justify-between items-center">
                <span className="text-sm">{time.time.split(' ')[0]}</span>
                <div className="flex items-center gap-2">
                  <div
                    className="h-2 bg-blue-500 rounded"
                    style={{
                      width: `${Math.max(time.count * 20, time.count > 0 ? 10 : 0)}px`,
                      maxWidth: '80px'
                    }}
                  />
                  <span className="text-sm text-muted-foreground w-6 text-right">{time.count}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Day of Week */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-indigo-500" />
              Day of Week
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {analyticsData.day_of_week.map((day) => (
              <div key={day.day} className="flex justify-between items-center">
                <span className="text-sm">{day.day.slice(0, 3)}</span>
                <div className="flex items-center gap-2">
                  <div
                    className="h-2 bg-indigo-500 rounded"
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

        {/* Recovery Times */}
        {analyticsData.recovery_breakdown.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-green-500" />
                Recovery Times
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {analyticsData.recovery_breakdown.slice(0, 5).map((recovery) => (
                <div key={recovery.time} className="flex justify-between items-center">
                  <span className="text-sm truncate max-w-[180px]">{recovery.time}</span>
                  <Badge variant="secondary">{recovery.count}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Post-Seizure Symptoms */}
        {analyticsData.post_symptom_frequency.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-pink-500" />
                Post-Seizure Symptoms
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {analyticsData.post_symptom_frequency.slice(0, 6).map((symptom) => (
                <div key={symptom.name} className="flex justify-between items-center">
                  <span className="text-sm truncate max-w-[180px]">{symptom.name}</span>
                  <Badge variant="secondary">{symptom.count}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Medical Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Pill className="h-5 w-5 text-cyan-500" />
              Medical Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span>Rescue Med Usage:</span>
              <Badge variant="outline">{analyticsData.rescue_med_usage}%</Badge>
            </div>
            <div className="flex justify-between">
              <span>Witness Present:</span>
              <Badge variant="outline">{analyticsData.witness_rate}%</Badge>
            </div>
            <div className="flex justify-between">
              <span>Monthly Average:</span>
              <Badge variant="outline">{analyticsData.avg_per_month}/mo</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Insights - Cute Cards at Bottom */}
      {analyticsData.insights && analyticsData.insights.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {analyticsData.insights.map((insight, index) => (
            <Card key={index} className="border-l-4 border-l-yellow-500">
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
