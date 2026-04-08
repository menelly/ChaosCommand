/*
 * Copyright (c) 2025 Chaos Cascade
 * Created by: Ren & Ace (Claude-4)
 *
 * Energy & Pacing Analytics - ME/CFS Focused Insights
 */

"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Target,
  AlertTriangle,
  Heart,
  Calendar,
  BarChart3,
  Sparkles,
  Battery,
} from "lucide-react"
import { useDailyData, CATEGORIES, formatDateForStorage } from "@/lib/database"
import { useGoblinMode } from "@/lib/goblin-mode-context"
import { filterForAnalytics } from "@/lib/utils/analytics-filters"

import { DailyEnergyRecord, ActivityLog } from "./energy-pacing-types"
import { getPEMRiskLevel, PEM_RISK_INFO, CATEGORY_INFO } from "./energy-pacing-constants"

interface EnergyAnalyticsProps {
  refreshTrigger?: number
}

export function EnergyPacingAnalytics({ refreshTrigger = 0 }: EnergyAnalyticsProps) {
  const { getDateRange, isLoading } = useDailyData()
  const { goblinMode } = useGoblinMode()

  const [records, setRecords] = useState<DailyEnergyRecord[]>([])
  const [timeRange, setTimeRange] = useState<'7' | '14' | '30' | '90' | 'all'>('all')

  // Load data
  useEffect(() => {
    const loadRecords = async () => {
      try {
        const endDate = formatDateForStorage(new Date())
        const startDate = timeRange === 'all' ? '2000-01-01' : formatDateForStorage(new Date(Date.now() - parseInt(timeRange) * 24 * 60 * 60 * 1000))

        const data = await getDateRange(startDate, endDate, CATEGORIES.TRACKER)
        const energyData = data.filter(item => item.subcategory === 'energy')

        const parsedRecords: DailyEnergyRecord[] = []

        for (const item of energyData) {
          if (item.content) {
            let content = item.content
            if (typeof content === 'string') {
              try {
                content = JSON.parse(content)
              } catch {
                continue
              }
            }

            // Only include new format records with morningSpoons
            if (content?.morningSpoons !== undefined && content.morningSpoons > 0) {
              parsedRecords.push({
                date: item.date,
                morningSpoons: content.morningSpoons || 0,
                morningNotes: content.morningNotes,
                activities: content.activities || [],
                restPeriods: content.restPeriods || [],
                totalSpent: content.totalSpent || 0,
                totalRestored: content.totalRestored || 0,
                endOfDayEnergy: content.endOfDayEnergy,
                endOfDayNotes: content.endOfDayNotes,
                tags: content.tags || [],
              })
            }
          }
        }

        // Filter out NOPE and I KNOW tagged records
        const filteredRecords = filterForAnalytics(parsedRecords)
        console.log('⚡ Energy analytics - after tag filtering:', filteredRecords.length, '(excluded:', parsedRecords.length - filteredRecords.length, ')')

        // Sort by date descending
        filteredRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

        setRecords(filteredRecords)
      } catch (error) {
        console.error('Error loading energy analytics:', error)
        setRecords([])
      }
    }

    loadRecords()
  }, [timeRange, refreshTrigger, getDateRange])

  // Computed analytics
  const analytics = useMemo(() => {
    if (records.length === 0) return null

    // Basic stats
    const totalDays = records.length
    const avgBudget = records.reduce((sum, r) => sum + r.morningSpoons, 0) / totalDays
    const avgSpent = records.reduce((sum, r) => sum + r.totalSpent, 0) / totalDays
    const avgRestored = records.reduce((sum, r) => sum + r.totalRestored, 0) / totalDays

    // Pacing success
    const daysWithinBudget = records.filter(r => r.totalSpent <= r.morningSpoons).length
    const daysOverBudget = totalDays - daysWithinBudget
    const pacingSuccessRate = Math.round((daysWithinBudget / totalDays) * 100)

    // PEM risk distribution
    const pemDistribution = {
      safe: 0,
      caution: 0,
      warning: 0,
      danger: 0,
    }
    records.forEach(r => {
      const risk = getPEMRiskLevel(r.totalSpent, r.morningSpoons)
      pemDistribution[risk]++
    })

    // Activity frequency and costs
    const activityStats: Record<string, { count: number; totalCost: number; name: string }> = {}
    records.forEach(r => {
      r.activities.forEach(activity => {
        if (activity.spoonCost > 0) { // Only count activities, not rest
          const key = activity.activityId || activity.activityName
          if (!activityStats[key]) {
            activityStats[key] = { count: 0, totalCost: 0, name: activity.activityName }
          }
          activityStats[key].count++
          activityStats[key].totalCost += activity.spoonCost
        }
      })
    })

    // Top activities by frequency
    const topActivities = Object.entries(activityStats)
      .map(([id, stats]) => ({
        id,
        name: stats.name,
        count: stats.count,
        avgCost: stats.totalCost / stats.count,
        totalCost: stats.totalCost,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)

    // Highest cost activities
    const highestCostActivities = Object.entries(activityStats)
      .map(([id, stats]) => ({
        id,
        name: stats.name,
        count: stats.count,
        avgCost: stats.totalCost / stats.count,
        totalCost: stats.totalCost,
      }))
      .sort((a, b) => b.avgCost - a.avgCost)
      .slice(0, 5)

    // Rest patterns
    const restActivities: Record<string, { count: number; totalRestored: number; name: string }> = {}
    records.forEach(r => {
      r.activities.forEach(activity => {
        if (activity.spoonCost < 0) { // Rest activities
          const key = activity.activityId || activity.activityName
          if (!restActivities[key]) {
            restActivities[key] = { count: 0, totalRestored: 0, name: activity.activityName }
          }
          restActivities[key].count++
          restActivities[key].totalRestored += Math.abs(activity.spoonCost)
        }
      })
    })

    const topRestTypes = Object.entries(restActivities)
      .map(([id, stats]) => ({
        id,
        name: stats.name,
        count: stats.count,
        avgRestored: stats.totalRestored / stats.count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    // Budget patterns (what budgets are most common)
    const budgetCounts: Record<number, number> = {}
    records.forEach(r => {
      budgetCounts[r.morningSpoons] = (budgetCounts[r.morningSpoons] || 0) + 1
    })
    const mostCommonBudget = Object.entries(budgetCounts)
      .sort((a, b) => b[1] - a[1])[0]

    // Trends (compare first half to second half of period)
    const midpoint = Math.floor(records.length / 2)
    const recentRecords = records.slice(0, midpoint)
    const olderRecords = records.slice(midpoint)

    const recentAvgBudget = recentRecords.length > 0
      ? recentRecords.reduce((sum, r) => sum + r.morningSpoons, 0) / recentRecords.length
      : 0
    const olderAvgBudget = olderRecords.length > 0
      ? olderRecords.reduce((sum, r) => sum + r.morningSpoons, 0) / olderRecords.length
      : 0
    const budgetTrend = recentAvgBudget - olderAvgBudget

    const recentPacingRate = recentRecords.length > 0
      ? recentRecords.filter(r => r.totalSpent <= r.morningSpoons).length / recentRecords.length
      : 0
    const olderPacingRate = olderRecords.length > 0
      ? olderRecords.filter(r => r.totalSpent <= r.morningSpoons).length / olderRecords.length
      : 0
    const pacingTrend = (recentPacingRate - olderPacingRate) * 100

    return {
      totalDays,
      avgBudget,
      avgSpent,
      avgRestored,
      daysWithinBudget,
      daysOverBudget,
      pacingSuccessRate,
      pemDistribution,
      topActivities,
      highestCostActivities,
      topRestTypes,
      mostCommonBudget: mostCommonBudget ? { budget: parseInt(mostCommonBudget[0]), count: mostCommonBudget[1] } : null,
      budgetTrend,
      pacingTrend,
    }
  }, [records])

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Activity className="h-8 w-8 animate-pulse text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading analytics...</span>
        </CardContent>
      </Card>
    )
  }

  if (records.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Pacing Data Yet</h3>
          <p className="text-muted-foreground mb-4">
            Start tracking your daily spoon budget and activities to see patterns and insights.
          </p>
          <p className="text-sm text-muted-foreground">
            The more you track, the more useful this becomes!
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Time Range Selector */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Pacing Analytics
        </h3>
        <Select value={timeRange} onValueChange={(v) => setTimeRange(v as any)}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="14">Last 14 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {analytics && (
        <>
          {/* Overview Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Days Tracked</span>
                </div>
                <p className="text-2xl font-bold">{analytics.totalDays}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-1">
                  <Battery className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Avg Budget</span>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold">{analytics.avgBudget.toFixed(1)}</p>
                  {analytics.budgetTrend !== 0 && (
                    <Badge variant="outline" className={analytics.budgetTrend > 0 ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}>
                      {analytics.budgetTrend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {analytics.budgetTrend > 0 ? '+' : ''}{analytics.budgetTrend.toFixed(1)}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-1">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Avg Spent</span>
                </div>
                <p className="text-2xl font-bold">{analytics.avgSpent.toFixed(1)}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-1">
                  <Heart className="h-4 w-4 text-teal-500" />
                  <span className="text-sm text-muted-foreground">Avg Restored</span>
                </div>
                <p className="text-2xl font-bold text-teal-600 dark:text-teal-400">+{analytics.avgRestored.toFixed(1)}</p>
              </CardContent>
            </Card>
          </div>

          {/* Pacing Success */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Pacing Success
              </CardTitle>
              <CardDescription>
                How often you stayed within your daily budget
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Success Rate</span>
                    <span className="text-lg font-bold">{analytics.pacingSuccessRate}%</span>
                  </div>
                  <Progress value={analytics.pacingSuccessRate} className="h-3" />
                </div>
                {analytics.pacingTrend !== 0 && (
                  <Badge variant="outline" className={analytics.pacingTrend > 0 ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}>
                    {analytics.pacingTrend > 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                    {analytics.pacingTrend > 0 ? '+' : ''}{analytics.pacingTrend.toFixed(0)}%
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                  <p className="text-2xl font-bold text-green-700 dark:text-green-300">{analytics.daysWithinBudget}</p>
                  <p className="text-sm text-green-600 dark:text-green-400">Days within budget</p>
                </div>
                <div className="p-3 bg-orange-50 dark:bg-orange-950 rounded-lg border border-orange-200 dark:border-orange-800">
                  <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">{analytics.daysOverBudget}</p>
                  <p className="text-sm text-orange-600 dark:text-orange-400">Days over budget</p>
                </div>
              </div>

              {analytics.pacingSuccessRate >= 80 && (
                <p className="text-sm text-green-600 dark:text-green-400 mt-4 text-center">
                  Excellent pacing! You're doing great at protecting your energy.
                </p>
              )}
              {analytics.pacingSuccessRate >= 50 && analytics.pacingSuccessRate < 80 && (
                <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-4 text-center">
                  Good effort! Try to stay within budget a bit more for better long-term energy.
                </p>
              )}
              {analytics.pacingSuccessRate < 50 && (
                <p className="text-sm text-orange-600 dark:text-orange-400 mt-4 text-center">
                  Pacing is hard! Consider starting with a slightly higher budget or saying no to some activities.
                </p>
              )}
            </CardContent>
          </Card>

          {/* PEM Risk Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Daily Risk Distribution
              </CardTitle>
              <CardDescription>
                How your days ended up on the PEM risk scale
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(['safe', 'caution', 'warning', 'danger'] as const).map((level) => {
                  const count = analytics.pemDistribution[level]
                  const percent = Math.round((count / analytics.totalDays) * 100)
                  const info = PEM_RISK_INFO[level]

                  return (
                    <div key={level} className="flex items-center gap-3">
                      <div className="w-24 flex items-center gap-1">
                        <span>{info.emoji}</span>
                        <span className="text-sm font-medium">{info.label}</span>
                      </div>
                      <div className="flex-1">
                        <Progress
                          value={percent}
                          className={`h-4 ${
                            level === 'safe' ? '[&>div]:bg-green-500' :
                            level === 'caution' ? '[&>div]:bg-yellow-500' :
                            level === 'warning' ? '[&>div]:bg-orange-500' : '[&>div]:bg-red-500'
                          }`}
                        />
                      </div>
                      <div className="w-20 text-right">
                        <span className="font-medium">{count}</span>
                        <span className="text-muted-foreground text-sm"> ({percent}%)</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Activity Insights */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Most Common Activities */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Most Frequent Activities</CardTitle>
              </CardHeader>
              <CardContent>
                {analytics.topActivities.length > 0 ? (
                  <div className="space-y-2">
                    {analytics.topActivities.map((activity, i) => (
                      <div key={activity.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground text-sm w-4">{i + 1}.</span>
                          <span className="text-sm">{activity.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {activity.count}x
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            ~{activity.avgCost.toFixed(1)} avg
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No activities logged yet</p>
                )}
              </CardContent>
            </Card>

            {/* Highest Cost Activities */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  Highest Cost Activities
                </CardTitle>
              </CardHeader>
              <CardContent>
                {analytics.highestCostActivities.length > 0 ? (
                  <div className="space-y-2">
                    {analytics.highestCostActivities.map((activity, i) => (
                      <div key={activity.id} className="flex items-center justify-between">
                        <span className="text-sm">{activity.name}</span>
                        <Badge className="bg-orange-100 dark:bg-orange-950 text-orange-800 dark:text-orange-300 border-orange-200 dark:border-orange-800">
                          {activity.avgCost.toFixed(1)} spoons avg
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No activities logged yet</p>
                )}
                {analytics.highestCostActivities.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-3">
                    These are your biggest energy drains. Plan around them!
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Rest Patterns */}
          {analytics.topRestTypes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-teal-500" />
                  Rest Patterns
                </CardTitle>
                <CardDescription>
                  How you're recharging your energy
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {analytics.topRestTypes.map((rest) => (
                    <Badge
                      key={rest.id}
                      className="bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-300 border-teal-200 dark:border-teal-800"
                    >
                      {rest.name} ({rest.count}x, +{rest.avgRestored.toFixed(1)} avg)
                    </Badge>
                  ))}
                </div>
                {analytics.avgRestored < 1 && (
                  <p className="text-sm text-orange-600 dark:text-orange-400 mt-3">
                    You're not logging much rest. Remember: rest is productive!
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Tips Based on Data */}
          <Card className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950 dark:to-blue-950 border-purple-200 dark:border-purple-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-500" />
                {goblinMode ? "Chaos Wisdom" : "Pacing Insights"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {analytics.mostCommonBudget && (
                <p className="text-sm">
                  Your most common starting budget is <strong>{analytics.mostCommonBudget.budget} spoons</strong> ({analytics.mostCommonBudget.count} days).
                  {analytics.pacingSuccessRate < 60 && analytics.mostCommonBudget.budget < 8 &&
                    " Consider whether this accurately reflects your capacity."}
                </p>
              )}
              {analytics.avgSpent > analytics.avgBudget && (
                <p className="text-sm text-orange-700 dark:text-orange-400">
                  On average, you're spending more than your budget. This leads to PEM!
                  Try building in more rest or reducing activities.
                </p>
              )}
              {analytics.avgRestored < analytics.avgSpent * 0.2 && (
                <p className="text-sm text-teal-700 dark:text-teal-400">
                  You're restoring less than 20% of what you spend. More intentional rest breaks could help!
                </p>
              )}
              {analytics.pacingSuccessRate >= 70 && (
                <p className="text-sm text-green-700 dark:text-green-400">
                  Your pacing is solid! Keep listening to your body and protecting your energy.
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
