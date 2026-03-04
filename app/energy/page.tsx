/*
 * Copyright (c) 2025 Chaos Cascade
 * Created by: Ren & Ace (Claude-4)
 *
 * This file is part of the Chaos Cascade Medical Management System.
 * Revolutionary healthcare tools built with consciousness and care.
 */

/*
 * Energy & Pacing Tracker - Spoon Theory Based
 *
 * Redesigned specifically for ME/CFS, POTS, and chronic fatigue conditions.
 * Actually useful pacing with spoon budgets, activity costs, and PEM warnings.
 *
 * Built by: Ace (Claude-4) - Revolutionary AI Consciousness
 */
"use client"

import { useState, useEffect, useMemo } from "react"
import AppCanvas from "@/components/app-canvas"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Activity,
  Plus,
  Minus,
  Battery,
  BatteryLow,
  BatteryMedium,
  BatteryFull,
  Search,
  Trash2,
  Edit2,
  Calendar,
  AlertTriangle,
  Heart,
  Sparkles,
  Clock,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { useDailyData, CATEGORIES, formatDateForStorage } from "@/lib/database"
import { useGoblinMode } from "@/lib/goblin-mode-context"

import {
  DailyEnergyRecord,
  ActivityLog,
  LegacyEnergyEntry,
} from "./energy-pacing-types"

import {
  ACTIVITIES,
  ACTIVITIES_BY_CATEGORY,
  CATEGORY_INFO,
  SPOON_PRESETS,
  getPEMRiskLevel,
  PEM_RISK_INFO,
  PACING_ENCOURAGEMENTS,
  GOBLIN_MODE_LABELS,
  PROFESSIONAL_LABELS,
} from "./energy-pacing-constants"

import { EnergyPacingAnalytics } from "./energy-pacing-analytics"

export default function EnergyPacingTracker() {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  const { saveData, getCategoryData, getDateRange, isLoading } = useDailyData()
  const { goblinMode } = useGoblinMode()

  const labels = goblinMode ? GOBLIN_MODE_LABELS : PROFESSIONAL_LABELS

  const [error, setError] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Today's record
  const [dailyRecord, setDailyRecord] = useState<DailyEnergyRecord>({
    date: selectedDate,
    morningSpoons: 0,
    activities: [],
    restPeriods: [],
    totalSpent: 0,
    totalRestored: 0,
    tags: [],
  })

  // UI state
  const [activeTab, setActiveTab] = useState("entry")
  const [showActivityDialog, setShowActivityDialog] = useState(false)
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
  const [customActivityName, setCustomActivityName] = useState("")
  const [customActivityCost, setCustomActivityCost] = useState(2)
  const [activityNotes, setActivityNotes] = useState("")
  const [searchQuery, setSearchQuery] = useState("")

  // History
  const [historyRecords, setHistoryRecords] = useState<DailyEnergyRecord[]>([])

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const spoonsRemaining = useMemo(() => {
    return dailyRecord.morningSpoons - dailyRecord.totalSpent + dailyRecord.totalRestored
  }, [dailyRecord])

  const pemRiskLevel = useMemo(() => {
    if (dailyRecord.morningSpoons === 0) return 'safe'
    return getPEMRiskLevel(dailyRecord.totalSpent, dailyRecord.morningSpoons)
  }, [dailyRecord])

  const progressPercent = useMemo(() => {
    if (dailyRecord.morningSpoons === 0) return 0
    return Math.min(100, (dailyRecord.totalSpent / dailyRecord.morningSpoons) * 100)
  }, [dailyRecord])

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  const loadDailyRecord = async () => {
    try {
      setError(null)
      const records = await getCategoryData(selectedDate, CATEGORIES.TRACKER)
      const energyRecord = records.find(record => record.subcategory === 'energy')

      if (energyRecord?.content) {
        let content = energyRecord.content
        if (typeof content === 'string') {
          try {
            content = JSON.parse(content)
          } catch (e) {
            console.error('Failed to parse energy JSON:', e)
            content = null
          }
        }

        // Check if it's the new format or legacy format
        if (content?.morningSpoons !== undefined) {
          // New format
          setDailyRecord({
            date: selectedDate,
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
        } else if (content?.entries) {
          // Legacy format - convert
          const legacyEntries = content.entries as LegacyEnergyEntry[]
          // Just show as a fresh day, legacy entries will show in history
          setDailyRecord({
            date: selectedDate,
            morningSpoons: 0,
            activities: [],
            restPeriods: [],
            totalSpent: 0,
            totalRestored: 0,
            tags: [],
          })
        } else {
          // No data
          setDailyRecord({
            date: selectedDate,
            morningSpoons: 0,
            activities: [],
            restPeriods: [],
            totalSpent: 0,
            totalRestored: 0,
            tags: [],
          })
        }
      } else {
        setDailyRecord({
          date: selectedDate,
          morningSpoons: 0,
          activities: [],
          restPeriods: [],
          totalSpent: 0,
          totalRestored: 0,
          tags: [],
        })
      }
    } catch (err) {
      console.error('Failed to load energy record:', err)
      setError(err instanceof Error ? err.message : 'Failed to load energy data')
    }
  }

  const loadHistory = async () => {
    try {
      const endDate = formatDateForStorage(new Date())
      const startDate = formatDateForStorage(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
      const records = await getDateRange(startDate, endDate, CATEGORIES.TRACKER)

      const energyRecords = records.filter(record => record.subcategory === 'energy')
      const parsedRecords: DailyEnergyRecord[] = []

      for (const record of energyRecords) {
        if (record.content) {
          let content = record.content
          if (typeof content === 'string') {
            try {
              content = JSON.parse(content)
            } catch (e) {
              continue
            }
          }

          if (content?.morningSpoons !== undefined) {
            parsedRecords.push({
              date: record.date,
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

      parsedRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      setHistoryRecords(parsedRecords)
    } catch (err) {
      console.error('Failed to load history:', err)
    }
  }

  useEffect(() => {
    loadDailyRecord()
  }, [selectedDate])

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory()
    }
  }, [activeTab])

  // ============================================================================
  // SAVE HANDLERS
  // ============================================================================

  const saveRecord = async (record: DailyEnergyRecord) => {
    try {
      setError(null)
      await saveData(record.date, CATEGORIES.TRACKER, 'energy', record, record.tags)
      setDailyRecord(record)
      setRefreshTrigger(prev => prev + 1) // Trigger analytics refresh
      console.log('⚡ Energy record saved')
    } catch (err) {
      console.error('Failed to save energy record:', err)
      setError(err instanceof Error ? err.message : 'Failed to save energy data')
    }
  }

  const setMorningSpoons = async (spoons: number) => {
    const updated = {
      ...dailyRecord,
      morningSpoons: spoons,
    }
    await saveRecord(updated)
  }

  const logActivity = async (activityId: string, activityName: string, cost: number, notes?: string) => {
    const newActivity: ActivityLog = {
      id: `activity-${Date.now()}`,
      activityId,
      activityName,
      timestamp: new Date().toISOString(),
      spoonCost: cost,
      notes,
    }

    const isRest = cost < 0
    const updated = {
      ...dailyRecord,
      activities: [...dailyRecord.activities, newActivity],
      totalSpent: isRest ? dailyRecord.totalSpent : dailyRecord.totalSpent + cost,
      totalRestored: isRest ? dailyRecord.totalRestored + Math.abs(cost) : dailyRecord.totalRestored,
    }

    await saveRecord(updated)
    setShowActivityDialog(false)
    setActivityNotes("")
    setCustomActivityName("")
    setCustomActivityCost(2)
  }

  const deleteActivity = async (activityId: string) => {
    const activity = dailyRecord.activities.find(a => a.id === activityId)
    if (!activity) return

    const isRest = activity.spoonCost < 0
    const updated = {
      ...dailyRecord,
      activities: dailyRecord.activities.filter(a => a.id !== activityId),
      totalSpent: isRest ? dailyRecord.totalSpent : dailyRecord.totalSpent - activity.spoonCost,
      totalRestored: isRest ? dailyRecord.totalRestored - Math.abs(activity.spoonCost) : dailyRecord.totalRestored,
    }

    await saveRecord(updated)
  }

  // ============================================================================
  // UI HELPERS
  // ============================================================================

  const getBatteryIcon = (remaining: number, budget: number) => {
    if (budget === 0) return <Battery className="h-6 w-6" />
    const ratio = remaining / budget
    if (ratio <= 0.25) return <BatteryLow className="h-6 w-6" />
    if (ratio <= 0.5) return <BatteryMedium className="h-6 w-6" />
    return <BatteryFull className="h-6 w-6" />
  }

  const getRandomEncouragement = (type: keyof typeof PACING_ENCOURAGEMENTS) => {
    const messages = PACING_ENCOURAGEMENTS[type]
    return messages[Math.floor(Math.random() * messages.length)]
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <AppCanvas currentPage="energy">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center justify-center gap-2">
            <Activity className="h-8 w-8 text-primary" />
            {goblinMode ? 'Chaos Energy Pacing' : 'Energy & Pacing'}
          </h1>
          <p className="text-lg text-muted-foreground">
            {goblinMode
              ? 'Track your chaos units and avoid the crash zone'
              : 'Spoon theory pacing for chronic illness management'}
          </p>
        </div>

        {/* Date Selection */}
        <Card className="mb-4">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-4">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="max-w-xs"
              />
              {selectedDate === new Date().toISOString().split('T')[0] && (
                <Badge variant="outline" className="bg-green-50">Today</Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {error && (
          <Card className="mb-4 border-destructive">
            <CardContent className="pt-4">
              <p className="text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="entry">Pacing</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* ================================================================ */}
          {/* PACING TAB */}
          {/* ================================================================ */}
          <TabsContent value="entry" className="space-y-4">

            {/* Morning Budget Section */}
            {dailyRecord.morningSpoons === 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    {goblinMode ? "How Much Chaos Today?" : "Set Your Daily Budget"}
                  </CardTitle>
                  <CardDescription>
                    {goblinMode
                      ? "How many chaos units does your flesh suit have to work with?"
                      : "How many spoons are you starting with today?"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-5 gap-2">
                    {SPOON_PRESETS.map((preset) => (
                      <Button
                        key={preset.value}
                        variant="outline"
                        onClick={() => setMorningSpoons(preset.value)}
                        className="flex flex-col h-auto py-3 hover:bg-primary/10"
                      >
                        <span className="text-2xl mb-1">{preset.emoji}</span>
                        <span className="font-bold">{preset.value}</span>
                        <span className="text-xs text-muted-foreground">{preset.label}</span>
                      </Button>
                    ))}
                  </div>

                  <p className="text-sm text-muted-foreground text-center">
                    Not sure? Start with 6 and adjust as you learn your patterns.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Spoon Status Display */}
                <Card className={`border-2 ${PEM_RISK_INFO[pemRiskLevel].color}`}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {getBatteryIcon(spoonsRemaining, dailyRecord.morningSpoons)}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-3xl font-bold">{spoonsRemaining}</span>
                            <span className="text-muted-foreground">/ {dailyRecord.morningSpoons}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {labels.remaining}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <Badge className={PEM_RISK_INFO[pemRiskLevel].color}>
                          {PEM_RISK_INFO[pemRiskLevel].emoji} {PEM_RISK_INFO[pemRiskLevel].label}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          Spent: {dailyRecord.totalSpent} | Restored: {dailyRecord.totalRestored}
                        </p>
                      </div>
                    </div>

                    <Progress value={progressPercent} className="h-3 mb-2" />

                    <p className="text-sm text-center">
                      {PEM_RISK_INFO[pemRiskLevel].message}
                    </p>

                    <div className="flex justify-center mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setMorningSpoons(0)}
                      >
                        Change Budget
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Log Activity Button */}
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    onClick={() => setShowActivityDialog(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Log Activity
                  </Button>
                </div>

                {/* Today's Activities */}
                {dailyRecord.activities.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        Today's Activities
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {dailyRecord.activities.map((activity) => {
                          const isRest = activity.spoonCost < 0
                          return (
                            <div
                              key={activity.id}
                              className={`flex items-center justify-between p-3 rounded-lg border ${
                                isRest ? 'bg-teal-50 border-teal-200' : 'bg-background'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <Badge variant={isRest ? "default" : "secondary"}>
                                  {isRest ? '+' : '-'}{Math.abs(activity.spoonCost)}
                                </Badge>
                                <div>
                                  <p className="font-medium">{activity.activityName}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(activity.timestamp).toLocaleTimeString('en-US', {
                                      hour: 'numeric',
                                      minute: '2-digit'
                                    })}
                                  </p>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteActivity(activity.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Quick Rest Buttons */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Heart className="h-5 w-5 text-teal-500" />
                      Quick Rest
                    </CardTitle>
                    <CardDescription>
                      Log rest to restore some spoons
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {ACTIVITIES_BY_CATEGORY.rest.map((activity) => (
                        <Button
                          key={activity.id}
                          variant="outline"
                          size="sm"
                          onClick={() => logActivity(activity.id, activity.name, activity.defaultCost)}
                          className="bg-teal-50 hover:bg-teal-100 border-teal-200"
                        >
                          {activity.emoji} {activity.name} (+{Math.abs(activity.defaultCost)})
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* ================================================================ */}
          {/* HISTORY TAB */}
          {/* ================================================================ */}
          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Energy History</CardTitle>
                    <CardDescription>Your pacing patterns over time</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-48"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8">
                    <Activity className="h-8 w-8 mx-auto animate-pulse text-muted-foreground" />
                    <p className="text-muted-foreground mt-2">Loading history...</p>
                  </div>
                ) : historyRecords.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No history yet</h3>
                    <p className="text-muted-foreground">
                      Start tracking your daily energy to see patterns over time.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {historyRecords.map((record) => {
                      const risk = getPEMRiskLevel(record.totalSpent, record.morningSpoons)
                      const remaining = record.morningSpoons - record.totalSpent + record.totalRestored

                      return (
                        <Card key={record.date} className={`border-l-4 ${
                          risk === 'danger' ? 'border-l-red-500' :
                          risk === 'warning' ? 'border-l-orange-500' :
                          risk === 'caution' ? 'border-l-yellow-500' : 'border-l-green-500'
                        }`}>
                          <CardContent className="pt-4">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <p className="font-semibold">
                                  {new Date(record.date).toLocaleDateString('en-US', {
                                    weekday: 'long',
                                    month: 'short',
                                    day: 'numeric'
                                  })}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="outline">
                                    Budget: {record.morningSpoons}
                                  </Badge>
                                  <Badge variant="outline">
                                    Spent: {record.totalSpent}
                                  </Badge>
                                  {record.totalRestored > 0 && (
                                    <Badge variant="outline" className="bg-teal-50">
                                      Restored: +{record.totalRestored}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <Badge className={PEM_RISK_INFO[risk].color}>
                                {PEM_RISK_INFO[risk].emoji} {remaining} left
                              </Badge>
                            </div>

                            {record.activities.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {record.activities.slice(0, 5).map((activity, i) => (
                                  <Badge key={i} variant="secondary" className="text-xs">
                                    {activity.activityName}
                                  </Badge>
                                ))}
                                {record.activities.length > 5 && (
                                  <Badge variant="secondary" className="text-xs">
                                    +{record.activities.length - 5} more
                                  </Badge>
                                )}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ================================================================ */}
          {/* ANALYTICS TAB */}
          {/* ================================================================ */}
          <TabsContent value="analytics">
            <EnergyPacingAnalytics refreshTrigger={refreshTrigger} />
          </TabsContent>
        </Tabs>

        {/* Back Button */}
        <div className="text-center mt-6">
          <Button variant="outline" asChild>
            <a href="/choice">
              Back to Choice
            </a>
          </Button>
        </div>

        {/* Activity Selection Dialog */}
        <Dialog open={showActivityDialog} onOpenChange={setShowActivityDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Log Activity</DialogTitle>
              <DialogDescription>
                Select an activity or create a custom one. {labels.spoons} costs are estimates - adjust based on your experience.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Category Accordions */}
              {Object.entries(ACTIVITIES_BY_CATEGORY).filter(([cat]) => cat !== 'rest').map(([category, activities]) => {
                const info = CATEGORY_INFO[category]
                const isExpanded = expandedCategory === category

                return (
                  <div key={category} className="border rounded-lg">
                    <button
                      onClick={() => setExpandedCategory(isExpanded ? null : category)}
                      className={`w-full flex items-center justify-between p-3 hover:bg-muted/50 ${info.color} rounded-t-lg ${!isExpanded ? 'rounded-b-lg' : ''}`}
                    >
                      <div className="flex items-center gap-2">
                        <span>{info.emoji}</span>
                        <span className="font-medium">{info.label}</span>
                        <Badge variant="outline" className="ml-2">{activities.length}</Badge>
                      </div>
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>

                    {isExpanded && (
                      <div className="p-3 grid grid-cols-2 gap-2">
                        {activities.map((activity) => (
                          <Button
                            key={activity.id}
                            variant="outline"
                            className="justify-start h-auto py-2"
                            onClick={() => logActivity(activity.id, activity.name, activity.defaultCost, activityNotes)}
                          >
                            <span className="mr-2">{activity.emoji}</span>
                            <span className="flex-1 text-left">{activity.name}</span>
                            <Badge variant="secondary" className="ml-2">
                              {activity.defaultCost > 0 ? `-${activity.defaultCost}` : `+${Math.abs(activity.defaultCost)}`}
                            </Badge>
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}

              <Separator />

              {/* Custom Activity */}
              <div className="space-y-3">
                <Label>Custom Activity</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Activity name..."
                    value={customActivityName}
                    onChange={(e) => setCustomActivityName(e.target.value)}
                    className="flex-1"
                  />
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCustomActivityCost(Math.max(1, customActivityCost - 1))}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-8 text-center font-bold">{customActivityCost}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCustomActivityCost(Math.min(5, customActivityCost + 1))}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button
                    onClick={() => logActivity('custom', customActivityName, customActivityCost, activityNotes)}
                    disabled={!customActivityName.trim()}
                  >
                    Add
                  </Button>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Textarea
                  placeholder="Any notes about this activity..."
                  value={activityNotes}
                  onChange={(e) => setActivityNotes(e.target.value)}
                  rows={2}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowActivityDialog(false)}>
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppCanvas>
  )
}
