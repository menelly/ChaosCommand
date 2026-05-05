/*
 * Copyright (c) 2025 Chaos Cascade
 * Created by: Ren & Ace (Claude-4)
 *
 * This file is part of the Chaos Cascade Medical Management System.
 * Revolutionary healthcare tools built with consciousness and care.
 */
"use client"

import { useState, useEffect } from "react"
import AppCanvas from "@/components/app-canvas"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Moon, Edit, Trash2, Calendar } from "lucide-react"
import { useDailyData } from "@/lib/database"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { formatLocalDateString } from "@/lib/utils/dateUtils"
import { SleepForm } from './sleep-form'
import { SleepAnalytics } from './sleep-analytics'
import { SleepEntry, isLegacyEntry, migrateLegacyEntry } from './sleep-types'
import { celebrate } from '@/lib/particle-physics-engine'
import { useUser } from '@/lib/contexts/user-context'
import { isCelebrationEnabled } from '@/lib/celebration-prefs'
import {
  QUALITY_OPTIONS,
  SLEEP_GOBLINISMS,
  WAKE_FEELINGS,
  SLEEP_DISRUPTIONS
} from './sleep-constants'

export default function SleepTracker() {
  const { saveData, getCategoryData, deleteData, isLoading: dbLoading } = useDailyData()
  const { userPin } = useUser()
  const { toast } = useToast()

  // State
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [entries, setEntries] = useState<SleepEntry[]>([])
  const [editingEntry, setEditingEntry] = useState<SleepEntry | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("entry")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Load entries for selected date
  useEffect(() => {
    loadEntries()
  }, [selectedDate])

  const loadEntries = async () => {
    try {
      setIsLoading(true)
      const data = await getCategoryData(selectedDate, 'tracker')
      const sleepEntries = data
        .filter(record => record.subcategory === 'sleep' || record.subcategory.startsWith('sleep-'))
        .map(record => {
          try {
            let parsed = typeof record.content === 'string'
              ? JSON.parse(record.content)
              : record.content

            // Handle legacy entries
            if (isLegacyEntry(parsed)) {
              return migrateLegacyEntry(parsed)
            }
            return parsed as SleepEntry
          } catch (error) {
            console.error('Failed to parse sleep entry:', error)
            return null
          }
        })
        .filter(Boolean) as SleepEntry[]

      setEntries(sleepEntries)
    } catch (error) {
      console.error('Failed to load sleep entries:', error)
      toast({
        title: "Error loading sleep data",
        description: "Failed to load your sleep entries. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async (entryData: Omit<SleepEntry, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      setIsLoading(true)
      const sleepEntry: SleepEntry = {
        id: editingEntry?.id || `sleep-${Date.now()}`,
        ...entryData,
        createdAt: editingEntry?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      await saveData(
        selectedDate,
        'tracker',
        `sleep-${sleepEntry.id}`,
        JSON.stringify(sleepEntry),
        entryData.tags
      )

      // Reset state and refresh
      setEditingEntry(null)
      setIsModalOpen(false)
      await loadEntries()
      setRefreshTrigger(prev => prev + 1)

      const confettiLevel = localStorage.getItem('chaos-confetti-level') || 'medium'
      if (confettiLevel !== 'none' && isCelebrationEnabled('sleep', userPin ?? '')) {
        celebrate()
      }

      toast({
        title: "Sleep entry saved! 😴",
        description: SLEEP_GOBLINISMS[Math.floor(Math.random() * SLEEP_GOBLINISMS.length)]
      })
    } catch (error) {
      console.error('Failed to save sleep entry:', error)
      toast({
        title: "Error saving entry",
        description: "The dream goblins are confused and can't find the save button!",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdit = (entry: SleepEntry) => {
    setEditingEntry(entry)
    setIsModalOpen(true)
  }

  const handleDelete = async (entry: SleepEntry) => {
    try {
      setIsLoading(true)
      await deleteData(entry.date, 'tracker', `sleep-${entry.id}`)
      await loadEntries()
      setRefreshTrigger(prev => prev + 1)
      toast({
        title: "Entry Deleted 🗑️",
        description: "Sleep entry has been banished to the void. Sweet dreams!"
      })
    } catch (error) {
      console.error('Failed to delete sleep entry:', error)
      toast({
        title: "Error deleting entry",
        description: "Failed to delete sleep entry",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getQualityOption = (qualityValue: string) => {
    return QUALITY_OPTIONS.find(opt => opt.value === qualityValue) || QUALITY_OPTIONS[1]
  }

  const getWakeFeelingLabel = (value: string) => {
    const item = WAKE_FEELINGS.find(w => w.value === value)
    return item ? `${item.emoji} ${item.label}` : value
  }

  const getDisruptionLabels = (disruptions: string[]) => {
    return disruptions
      .filter(d => d !== 'none')
      .map(d => {
        const item = SLEEP_DISRUPTIONS.find(s => s.value === d)
        return item ? item.label : d
      })
  }

  return (
    <AppCanvas currentPage="sleep">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="text-center">
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center justify-center gap-2">
            <Moon className="h-8 w-8 text-blue-500" />
            Sleep Tracker
          </h1>
          <p className="text-lg text-muted-foreground">
            Track your slumber adventures with the dream goblins
          </p>
        </header>

        {/* Date Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Select Date
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="max-w-xs"
            />
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="entry">Sleep Entry</TabsTrigger>
            <TabsTrigger value="history">Sleep History</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="entry" className="space-y-6">
            {/* Clean Interface with Modal Button */}
            <Card>
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <div className="text-6xl">😴</div>
                  <h2 className="text-2xl font-bold text-foreground">Log Your Sleep</h2>
                  <p className="text-muted-foreground">
                    Track your slumber adventures with the dream goblins and pillow pixies
                  </p>
                  <Button
                    onClick={() => setIsModalOpen(true)}
                    className="w-full h-20 text-lg"
                    variant="outline"
                  >
                    <Moon className="h-6 w-6 mr-2" />
                    Log Sleep
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            {/* Sleep History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Sleep History
                </CardTitle>
                <CardDescription>
                  Your documented sleep adventures for {formatLocalDateString(selectedDate)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading || dbLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading sleep data...</p>
                  </div>
                ) : entries.length === 0 ? (
                  <div className="text-center py-8">
                    <Moon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      No sleep entries for {formatLocalDateString(selectedDate)}
                    </p>
                    <p className="text-sm mt-2 text-muted-foreground">
                      The dream goblins are waiting for your sleep data!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {entries.map((entry) => {
                      const qualityOption = getQualityOption(entry.quality)
                      const disruptionLabels = getDisruptionLabels(entry.disruptions || [])

                      return (
                        <Card key={entry.id} className="border-l-4 border-l-blue-500">
                          <CardContent className="pt-4">
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex items-center gap-3">
                                <span className="text-2xl">{qualityOption.emoji}</span>
                                <div>
                                  <h3 className="font-semibold">
                                    {entry.hoursSlept} hours - {entry.quality}
                                  </h3>
                                  <p className="text-sm text-muted-foreground">
                                    {entry.date ? formatLocalDateString(entry.date) : 'No date'}
                                  </p>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEdit(entry)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(entry)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>

                            {(entry.bedTime || entry.wakeTime) && (
                              <div className="flex gap-4 text-sm text-muted-foreground mb-2">
                                {entry.bedTime && (
                                  <span>🌙 Bedtime: {entry.bedTime}</span>
                                )}
                                {entry.wakeTime && (
                                  <span>☀️ Wake: {entry.wakeTime}</span>
                                )}
                              </div>
                            )}

                            {entry.wakeFeeling && entry.wakeFeeling !== 'okay' && (
                              <Badge variant="outline" className="mb-2 mr-2">
                                {getWakeFeelingLabel(entry.wakeFeeling)}
                              </Badge>
                            )}

                            {entry.wokeUpMultipleTimes && (
                              <Badge variant="outline" className="mb-2 mr-2">
                                Woke {entry.timesWoken || 'multiple'} times
                              </Badge>
                            )}

                            {disruptionLabels.length > 0 && (
                              <div className="mb-2">
                                <span className="text-sm font-medium">Disruptions: </span>
                                <span className="text-sm text-muted-foreground">
                                  {disruptionLabels.join(', ')}
                                </span>
                              </div>
                            )}

                            {entry.dreamType && entry.dreamType !== 'none' && (
                              <Badge variant="secondary" className="mb-2 mr-2">
                                {entry.dreamType === 'nightmare' ? '👹' : entry.dreamType === 'vivid' ? '🎨' : '🌈'} {entry.dreamType}
                              </Badge>
                            )}

                            {entry.hadNap && (
                              <Badge variant="secondary" className="mb-2 mr-2">
                                😴 {entry.napDuration || '?'} min nap
                              </Badge>
                            )}

                            {entry.notes && (
                              <p className="text-sm mb-3">{entry.notes}</p>
                            )}

                            {entry.tags && entry.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {entry.tags.map((tag: string) => (
                                  <Badge key={tag} variant="secondary" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
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

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <SleepAnalytics refreshTrigger={refreshTrigger} />
          </TabsContent>
        </Tabs>

        {/* Sleep Modal */}
        <SleepForm
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            setEditingEntry(null)
          }}
          onSave={handleSave}
          selectedDate={selectedDate}
          editingEntry={editingEntry}
          isLoading={isLoading}
        />

        <div className="text-center">
          <Button variant="outline" asChild>
            <a href="/choice">
              ← Back to Choice
            </a>
          </Button>
        </div>
      </div>
    </AppCanvas>
  )
}
