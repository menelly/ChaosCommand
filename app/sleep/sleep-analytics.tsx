/*
 * Copyright (c) 2025 Chaos Cascade
 * Created by: Ren & Ace (Claude-4)
 *
 * This file is part of the Chaos Cascade Medical Management System.
 * Revolutionary healthcare tools built with consciousness and care.
 */
"use client"

import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  BarChart3,
  TrendingUp,
  Moon,
  Calendar,
  Clock,
  AlertTriangle,
  Sparkles,
  Coffee,
  Pill
} from 'lucide-react'
import { useDailyData, CATEGORIES } from '@/lib/database'
import { SleepEntry, isLegacyEntry, migrateLegacyEntry } from './sleep-types'
import {
  QUALITY_OPTIONS,
  WAKE_FEELINGS,
  DREAM_TYPES,
  SLEEP_DISRUPTIONS,
  PRE_SLEEP_FACTORS,
  SLEEP_AIDS
} from './sleep-constants'
import { format } from 'date-fns'
import { filterForAnalytics } from '@/lib/utils/analytics-filters'

interface SleepAnalyticsProps {
  refreshTrigger: number
}

export function SleepAnalytics({ refreshTrigger }: SleepAnalyticsProps) {
  const { getCategoryData, isLoading } = useDailyData()
  const [entries, setEntries] = useState<SleepEntry[]>([])

  // Load sleep entries from multiple days
  useEffect(() => {
    const loadEntries = async () => {
      try {
        const allEntries: SleepEntry[] = []
        const today = new Date()

        // Load entries from the last 30 days
        for (let i = 0; i < 30; i++) {
          const currentDate = new Date(today)
          currentDate.setDate(today.getDate() - i)
          const dateStr = format(currentDate, 'yyyy-MM-dd')

          const records = await getCategoryData(dateStr, CATEGORIES.TRACKER)
          const sleepRecords = records.filter(record =>
            record.subcategory && record.subcategory.startsWith('sleep-')
          )

          for (const record of sleepRecords) {
            try {
              const content = typeof record.content === 'string'
                ? JSON.parse(record.content)
                : record.content

              // Handle legacy entries
              if (isLegacyEntry(content)) {
                allEntries.push(migrateLegacyEntry(content))
              } else {
                allEntries.push(content as SleepEntry)
              }
            } catch (parseError) {
              console.error('Error parsing sleep entry:', parseError, record)
            }
          }
        }

        // Sort by date descending
        allEntries.sort((a, b) => {
          const dateA = new Date(a.date).getTime()
          const dateB = new Date(b.date).getTime()
          return dateB - dateA
        })

        // Filter out NOPE and I KNOW tagged entries
        const filteredEntries = filterForAnalytics(allEntries)
        console.log('🌙 Sleep analytics - after tag filtering:', filteredEntries.length, '(excluded:', allEntries.length - filteredEntries.length, ')')

        setEntries(filteredEntries)
      } catch (error) {
        console.error('Error loading sleep entries:', error)
        setEntries([])
      }
    }

    loadEntries()
  }, [refreshTrigger, getCategoryData])

  // Calculate stats
  const stats = useMemo(() => {
    if (entries.length === 0) return null

    const totalEntries = entries.length

    // Average hours slept
    const avgHours = entries.reduce((sum, e) => sum + e.hoursSlept, 0) / totalEntries

    // Quality distribution
    const qualityCounts = entries.reduce((acc, entry) => {
      acc[entry.quality] = (acc[entry.quality] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Most common quality
    const mostCommonQuality = Object.entries(qualityCounts)
      .sort(([, a], [, b]) => b - a)[0]

    // Wake feeling distribution
    const wakeFeelingCounts = entries.reduce((acc, entry) => {
      if (entry.wakeFeeling) {
        acc[entry.wakeFeeling] = (acc[entry.wakeFeeling] || 0) + 1
      }
      return acc
    }, {} as Record<string, number>)

    // Most common disruptions
    const disruptionCounts = entries.reduce((acc, entry) => {
      (entry.disruptions || []).forEach(d => {
        if (d !== 'none') {
          acc[d] = (acc[d] || 0) + 1
        }
      })
      return acc
    }, {} as Record<string, number>)
    const topDisruptions = Object.entries(disruptionCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)

    // Most common pre-sleep factors
    const preSleepCounts = entries.reduce((acc, entry) => {
      (entry.preSleepFactors || []).forEach(f => {
        acc[f] = (acc[f] || 0) + 1
      })
      return acc
    }, {} as Record<string, number>)
    const topPreSleepFactors = Object.entries(preSleepCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)

    // Most used sleep aids
    const aidCounts = entries.reduce((acc, entry) => {
      (entry.sleepAids || []).forEach(a => {
        if (a !== 'none') {
          acc[a] = (acc[a] || 0) + 1
        }
      })
      return acc
    }, {} as Record<string, number>)
    const topSleepAids = Object.entries(aidCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)

    // Dream types distribution
    const dreamCounts = entries.reduce((acc, entry) => {
      if (entry.dreamType && entry.dreamType !== 'none') {
        acc[entry.dreamType] = (acc[entry.dreamType] || 0) + 1
      }
      return acc
    }, {} as Record<string, number>)

    // Nights with disruptions
    const nightsWithDisruptions = entries.filter(e =>
      e.disruptions && e.disruptions.some(d => d !== 'none')
    ).length

    // Nights with naps
    const daysWithNaps = entries.filter(e => e.hadNap).length
    const avgNapDuration = entries.filter(e => e.hadNap && e.napDuration)
      .reduce((sum, e) => sum + (e.napDuration || 0), 0) /
      Math.max(1, daysWithNaps)

    // Quality correlation with factors (simple analysis)
    const factorQualityCorrelation = analyzeFactorCorrelation(entries)

    return {
      totalEntries,
      avgHours: Math.round(avgHours * 10) / 10,
      qualityCounts,
      mostCommonQuality,
      wakeFeelingCounts,
      topDisruptions,
      topPreSleepFactors,
      topSleepAids,
      dreamCounts,
      nightsWithDisruptions,
      daysWithNaps,
      avgNapDuration: Math.round(avgNapDuration),
      factorQualityCorrelation
    }
  }, [entries])

  // Analyze correlation between pre-sleep factors and quality
  function analyzeFactorCorrelation(entries: SleepEntry[]) {
    const insights: string[] = []

    // Check caffeine correlation
    const caffeineEntries = entries.filter(e => e.preSleepFactors?.includes('caffeine'))
    const noCaffeineEntries = entries.filter(e => !e.preSleepFactors?.includes('caffeine'))

    if (caffeineEntries.length >= 3 && noCaffeineEntries.length >= 3) {
      const caffeineAvg = caffeineEntries.reduce((s, e) => s + e.hoursSlept, 0) / caffeineEntries.length
      const noCaffeineAvg = noCaffeineEntries.reduce((s, e) => s + e.hoursSlept, 0) / noCaffeineEntries.length

      if (noCaffeineAvg - caffeineAvg > 0.5) {
        insights.push(`You sleep ~${Math.round((noCaffeineAvg - caffeineAvg) * 10) / 10}h more without caffeine`)
      }
    }

    // Check screen time correlation
    const screenEntries = entries.filter(e => e.preSleepFactors?.includes('screen-time'))
    const noScreenEntries = entries.filter(e => !e.preSleepFactors?.includes('screen-time'))

    if (screenEntries.length >= 3 && noScreenEntries.length >= 3) {
      const screenGoodSleep = screenEntries.filter(e => e.quality === 'Great' || e.quality === 'Okay').length / screenEntries.length
      const noScreenGoodSleep = noScreenEntries.filter(e => e.quality === 'Great' || e.quality === 'Okay').length / noScreenEntries.length

      if (noScreenGoodSleep - screenGoodSleep > 0.2) {
        insights.push(`${Math.round((noScreenGoodSleep - screenGoodSleep) * 100)}% better sleep without pre-bed screens`)
      }
    }

    // Check relaxation correlation
    const relaxEntries = entries.filter(e => e.preSleepFactors?.includes('relaxation'))
    if (relaxEntries.length >= 3) {
      const relaxGoodSleep = relaxEntries.filter(e => e.quality === 'Great' || e.quality === 'Okay').length / relaxEntries.length
      if (relaxGoodSleep > 0.7) {
        insights.push(`Relaxation before bed leads to good sleep ${Math.round(relaxGoodSleep * 100)}% of the time`)
      }
    }

    return insights
  }

  // Get label for a value from a constants array
  const getLabel = (array: readonly { value: string; label: string; emoji: string }[], value: string) => {
    const item = array.find(i => i.value === value)
    return item ? `${item.emoji} ${item.label}` : value
  }

  const getQualityInfo = (value: string) => {
    const item = QUALITY_OPTIONS.find(q => q.value === value)
    return item || { emoji: '😴', value, description: '' }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            Analyzing your sleep patterns... 🌙
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!stats || entries.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <div className="text-6xl">📊</div>
            <div>
              <h3 className="text-lg font-medium">No sleep data to analyze yet</h3>
              <p className="text-muted-foreground">
                Track a few nights of sleep to see patterns and insights here.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold flex items-center justify-center gap-2">
          <BarChart3 className="h-6 w-6" />
          Your Sleep Patterns
        </h2>
        <p className="text-muted-foreground">
          Insights from your last 30 days of sleep data
        </p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Total Entries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEntries}</div>
            <p className="text-xs text-muted-foreground">
              Nights tracked
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Average Sleep
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgHours}h</div>
            <p className="text-xs text-muted-foreground">
              Per night
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Moon className="h-4 w-4" />
              Most Common
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              {getQualityInfo(stats.mostCommonQuality[0]).emoji}
              {stats.mostCommonQuality[0]}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.mostCommonQuality[1]} nights
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Disrupted Nights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.nightsWithDisruptions}</div>
            <p className="text-xs text-muted-foreground">
              {Math.round((stats.nightsWithDisruptions / stats.totalEntries) * 100)}% of nights
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quality Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Sleep Quality Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {QUALITY_OPTIONS.map((option) => {
              const count = stats.qualityCounts[option.value] || 0
              const percent = Math.round((count / stats.totalEntries) * 100)
              return (
                <div key={option.value} className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-2xl mb-1">{option.emoji}</div>
                  <div className="font-semibold">{option.value}</div>
                  <div className="text-sm text-muted-foreground">
                    {count} nights ({percent}%)
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Top Disruptions */}
      {stats.topDisruptions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Most Common Sleep Disruptions
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              What's waking you up at night
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.topDisruptions.map(([disruption, count]) => (
                <div key={disruption} className="flex items-center justify-between">
                  <span className="text-sm">
                    {getLabel(SLEEP_DISRUPTIONS, disruption)}
                  </span>
                  <Badge variant="outline">{count} times</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Pre-Sleep Factors */}
      {stats.topPreSleepFactors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Coffee className="h-5 w-5" />
              Most Common Pre-Sleep Factors
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              What you do before bed
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.topPreSleepFactors.map(([factor, count]) => (
                <div key={factor} className="flex items-center justify-between">
                  <span className="text-sm">
                    {getLabel(PRE_SLEEP_FACTORS, factor)}
                  </span>
                  <Badge variant="outline">{count} times</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Sleep Aids */}
      {stats.topSleepAids.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Pill className="h-5 w-5" />
              Most Used Sleep Aids
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              What helps you sleep
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.topSleepAids.map(([aid, count]) => (
                <div key={aid} className="flex items-center justify-between">
                  <span className="text-sm">
                    {getLabel(SLEEP_AIDS, aid)}
                  </span>
                  <Badge variant="outline">{count} times</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Insights */}
      {stats.factorQualityCorrelation.length > 0 && (
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Sleep Insights
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Patterns we've noticed in your sleep data
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.factorQualityCorrelation.map((insight, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <span className="text-xl">💡</span>
                  <span className="text-sm">{insight}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Nap Stats */}
      {stats.daysWithNaps > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Nap Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold">{stats.daysWithNaps}</div>
                <div className="text-sm text-muted-foreground">Days with naps</div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold">{stats.avgNapDuration} min</div>
                <div className="text-sm text-muted-foreground">Avg nap duration</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-primary/20">
        <CardContent className="p-6 text-center">
          <div className="text-4xl mb-2">🌙</div>
          <p className="text-sm text-muted-foreground">
            Remember: Good sleep is foundational to everything else.
            Every entry helps you understand your patterns and find what works for YOU.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
