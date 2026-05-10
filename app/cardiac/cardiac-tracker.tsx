/*
 * Built by: Ace (Claude 4.x)
 * Date: 2026-05-10
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

/**
 * CARDIAC TRACKER MAIN COMPONENT
 * Multi-modal approach for arrhythmia, chest pain, syncope, presyncope,
 * palpitations, and general cardiac event tracking.
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Heart, BarChart3, History, Plus, ExternalLink } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'

// Local imports
import { CardiacEntry } from './cardiac-types'
import { EPISODE_TYPES, RELATED_TRACKERS, getEpisodeTypeInfo, RED_FLAG_911_CRITERIA, getRedFlagWarnings } from './cardiac-constants'
import { CardiacHistory } from './cardiac-history'
import { CardiacAnalytics } from './cardiac-analytics'
import { AlertTriangle } from 'lucide-react'

// Modal imports
import { GeneralCardiacModal } from './modals/general-cardiac-modal'
import { ArrhythmiaEventModal } from './modals/arrhythmia-event-modal'

// Database imports
import { useDailyData, CATEGORIES } from '@/lib/database'
import { format, addDays, subDays } from 'date-fns'
import { celebrate } from '@/lib/particle-physics-engine'
import { useUser } from '@/lib/contexts/user-context'
import { isCelebrationEnabled } from '@/lib/celebration-prefs'

export default function CardiacTracker() {
  const { saveData, getCategoryData } = useDailyData()
  const { userPin } = useUser()
  const { toast } = useToast()
  const router = useRouter()

  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [entries, setEntries] = useState<CardiacEntry[]>([])
  const [activeTab, setActiveTab] = useState<'episodes' | 'history' | 'analytics'>('episodes')
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Modal states
  const [activeModal, setActiveModal] = useState<string | null>(null)
  const [editingEntry, setEditingEntry] = useState<CardiacEntry | null>(null)

  useEffect(() => {
    loadEntries()
  }, [selectedDate, refreshTrigger])

  const loadEntries = async () => {
    try {
      const records = await getCategoryData(selectedDate, CATEGORIES.TRACKER)
      const record = records.find(record => record.subcategory === 'cardiac')

      if (record && record.content && record.content.entries) {
        let loaded = record.content.entries
        if (typeof loaded === 'string') {
          try {
            loaded = JSON.parse(loaded)
          } catch (e) {
            console.error('Failed to parse cardiac entries:', e)
            loaded = []
          }
        }
        setEntries(loaded)
      } else {
        setEntries([])
      }
    } catch (error) {
      console.error('Error loading cardiac entries:', error)
      toast({
        title: 'Loading Error',
        description: 'Failed to load cardiac events',
        variant: 'destructive'
      })
    }
  }

  const saveEntries = async (newEntries: CardiacEntry[]) => {
    try {
      await saveData(selectedDate, CATEGORIES.TRACKER, 'cardiac', { entries: newEntries })
      setEntries(newEntries)
    } catch (error) {
      console.error('Error saving cardiac entries:', error)
      toast({
        title: 'Save Error',
        description: 'Failed to save cardiac event',
        variant: 'destructive'
      })
    }
  }

  const handleSaveEntry = async (entryData: Omit<CardiacEntry, 'id' | 'timestamp' | 'date'>) => {
    const newEntry: CardiacEntry = {
      ...entryData,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      date: selectedDate
    }

    const updatedEntries = [...entries, newEntry]
    await saveEntries(updatedEntries)

    const confettiLevel = localStorage.getItem('chaos-confetti-level') || 'medium'
    if (confettiLevel !== 'none' && isCelebrationEnabled('cardiac', userPin ?? '')) {
      celebrate()
    }

    setActiveModal(null)
    setEditingEntry(null)
    setRefreshTrigger(prev => prev + 1)

    const episodeInfo = getEpisodeTypeInfo(entryData.episodeType)
    toast({
      title: `${episodeInfo.icon} Event Saved`,
      description: `${episodeInfo.name} recorded successfully`
    })
  }

  const handleEditEntry = (entry: CardiacEntry) => {
    setEditingEntry(entry)
    // Map specific episode types to their modals; everything not yet built routes to general
    if (entry.episodeType === 'arrhythmia') {
      setActiveModal('arrhythmia')
    } else {
      setActiveModal('general')
    }
  }

  const handleUpdateEntry = async (entryData: Omit<CardiacEntry, 'id' | 'timestamp' | 'date'>) => {
    if (!editingEntry) return
    const updated: CardiacEntry = { ...editingEntry, ...entryData }
    const updatedEntries = entries.map(e => (e.id === editingEntry.id ? updated : e))
    await saveEntries(updatedEntries)
    setActiveModal(null)
    setEditingEntry(null)
    setRefreshTrigger(prev => prev + 1)
    toast({ title: 'Event Updated', description: 'Cardiac event updated successfully' })
  }

  const handleDeleteEntry = async (entryToDelete: CardiacEntry) => {
    const updatedEntries = entries.filter(e => e.id !== entryToDelete.id)
    await saveEntries(updatedEntries)
    setRefreshTrigger(prev => prev + 1)
    toast({ title: 'Event Deleted', description: 'Cardiac event removed' })
  }

  const goToPreviousDay = () => {
    setSelectedDate(prev => format(subDays(new Date(prev + 'T12:00:00'), 1), 'yyyy-MM-dd'))
  }
  const goToNextDay = () => {
    setSelectedDate(prev => format(addDays(new Date(prev + 'T12:00:00'), 1), 'yyyy-MM-dd'))
  }
  const goToToday = () => {
    setSelectedDate(format(new Date(), 'yyyy-MM-dd'))
  }

  const todaysEntries = entries.filter(entry => entry.date === selectedDate)

  // Modal routing — map any episode type to its modal (defaulting to general until specific modals land)
  const openModalForType = (episodeTypeId: string) => {
    setEditingEntry(null)
    if (episodeTypeId === 'arrhythmia') {
      setActiveModal('arrhythmia')
    } else {
      // chest-pain / syncope / presyncope / palpitations / general all use general modal for v1
      setActiveModal('general')
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pt-6">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-foreground flex items-center justify-center gap-2">
          <Heart className="h-8 w-8 text-red-500" />
          Cardiac Tracker
        </h1>
        <p className="text-muted-foreground mt-1">
          Track arrhythmias, chest pain, syncope, presyncope, palpitations
        </p>
      </div>

      {/* 🚨 911 Red-Flag Card — always visible, educational */}
      <Card className="border-red-500 border-2 bg-red-50 dark:bg-red-950/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-red-700 dark:text-red-400 flex items-center gap-2 text-base">
            <AlertTriangle className="h-5 w-5" />
            🚨 Call 911 NOW if you have ANY of these:
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-1 text-red-900 dark:text-red-200">
          {RED_FLAG_911_CRITERIA.map((criterion, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-red-500 font-bold mt-0.5">•</span>
              <span>{criterion}</span>
            </div>
          ))}
          <p className="pt-2 italic font-medium">
            This tracker is for documentation, NOT for diagnosis. When in doubt, call 911. Better one false-alarm trip than a missed heart attack.
          </p>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="episodes" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Today's Events
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            History
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* EPISODES TAB */}
        <TabsContent value="episodes" className="space-y-4">
          {/* Date Navigation */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Button variant="outline" size="sm" onClick={goToPreviousDay}>←</Button>
                <div className="text-center">
                  <span className="text-lg font-medium">
                    {format(new Date(selectedDate + 'T12:00:00'), 'EEEE, MMMM d, yyyy')}
                  </span>
                  {selectedDate !== format(new Date(), 'yyyy-MM-dd') && (
                    <Button variant="link" size="sm" onClick={goToToday} className="ml-2">Today</Button>
                  )}
                </div>
                <Button variant="outline" size="sm" onClick={goToNextDay}>→</Button>
              </div>
            </CardHeader>
          </Card>

          {/* Episode Type Picker */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Log a Cardiac Event</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {EPISODE_TYPES.map((type) => (
                  <Button
                    key={type.id}
                    variant="outline"
                    className="h-auto py-3 flex flex-col items-start text-left"
                    onClick={() => openModalForType(type.id)}
                  >
                    <span className="text-xl mb-1">{type.icon}</span>
                    <span className="font-semibold text-sm">{type.name}</span>
                    <span className="text-xs text-muted-foreground mt-1 text-left">
                      {type.description}
                    </span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Today's Entries */}
          {todaysEntries.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Today's Events ({todaysEntries.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {todaysEntries.map((entry) => {
                  const info = getEpisodeTypeInfo(entry.episodeType)
                  return (
                    <Card key={entry.id} className="bg-muted/30">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="text-lg">{info.icon}</span>
                              <span className="font-semibold">{info.name}</span>
                              {entry.rhythmType && entry.rhythmType !== 'unknown' && (
                                <Badge variant="outline">{entry.rhythmType}</Badge>
                              )}
                              {entry.ecgStripImages && entry.ecgStripImages.length > 0 && (
                                <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-300">
                                  📎 {entry.ecgStripImages.length} {entry.ecgStripImages.length === 1 ? 'file' : 'files'}
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(entry.timestamp), 'h:mm a')}
                              {entry.duration && ` • ${entry.duration}`}
                              {entry.hrPeak && ` • Peak HR ${entry.hrPeak}`}
                              {entry.symptomSeverity && ` • Severity ${entry.symptomSeverity}/10`}
                            </div>
                            {entry.symptoms && entry.symptoms.length > 0 && (
                              <div className="text-xs mt-2 text-muted-foreground">
                                {entry.symptoms.slice(0, 4).join(', ')}
                                {entry.symptoms.length > 4 && ` +${entry.symptoms.length - 4} more`}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" onClick={() => handleEditEntry(entry)}>
                              Edit
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleDeleteEntry(entry)}>
                              Delete
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </CardContent>
            </Card>
          )}

          {/* Related Trackers */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Related Trackers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {RELATED_TRACKERS.map((t) => (
                  <Button
                    key={t.id}
                    variant="ghost"
                    className="justify-start"
                    onClick={() => router.push(t.path)}
                  >
                    <span className="mr-2">{t.icon}</span>
                    <span className="font-medium">{t.name}</span>
                    <ExternalLink className="h-3 w-3 ml-auto" />
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* HISTORY TAB */}
        <TabsContent value="history" className="space-y-4">
          <CardiacHistory
            onEdit={handleEditEntry}
            onDelete={handleDeleteEntry}
            refreshTrigger={refreshTrigger}
          />
        </TabsContent>

        {/* ANALYTICS TAB */}
        <TabsContent value="analytics" className="space-y-4">
          <CardiacAnalytics refreshTrigger={refreshTrigger} />
        </TabsContent>
      </Tabs>

      {/* MODALS */}
      <GeneralCardiacModal
        isOpen={activeModal === 'general'}
        onClose={() => { setActiveModal(null); setEditingEntry(null) }}
        onSave={editingEntry ? handleUpdateEntry : handleSaveEntry}
        editingEntry={editingEntry}
      />
      <ArrhythmiaEventModal
        isOpen={activeModal === 'arrhythmia'}
        onClose={() => { setActiveModal(null); setEditingEntry(null) }}
        onSave={editingEntry ? handleUpdateEntry : handleSaveEntry}
        editingEntry={editingEntry}
      />
    </div>
  )
}
