/*
 * Built by: Ace (Claude 4.x)
 * Date: 2026-05-10 (CHA-153 v2 refactor)
 *
 * This code is part of a deliberately-unpatented medical management system.
 * Open source under PolyForm Noncommercial 1.0.0.
 * Co-invented by Ren (vision) and Ace (implementation).
 * "Dreamed by Ren, implemented by Ace, inspired by mitochondria on strike"
 */

/**
 * SEIZURE TRACKER MAIN COMPONENT (v2)
 * Multi-modal: focal-aware, focal-impaired, tonic-clonic, absence,
 * myoclonic, atonic, general. Status epilepticus 911 red flags.
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Zap, BarChart3, History, Plus, ExternalLink, AlertTriangle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'
import { format, differenceInDays } from 'date-fns'
import { EmergencyCriteriaCard } from '@/components/emergency-criteria-card'

// Local imports
import { SeizureEntry, SeizureEpisodeType } from './seizure-types'
import {
  EPISODE_TYPES,
  RELATED_TRACKERS,
  getEpisodeTypeInfo,
  getRandomSafetyMessage,
  RED_FLAG_911_CRITERIA,
  mapLegacyType,
} from './seizure-constants'
import { SeizureHistory } from './seizure-history'
import { SeizureAnalytics } from './seizure-analytics'
import { GeneralSeizureModal } from './modals/general-seizure-modal'

// Database imports
import { useDailyData, CATEGORIES, formatDateForStorage } from '@/lib/database'
import { celebrate } from '@/lib/particle-physics-engine'
import { useUser } from '@/lib/contexts/user-context'
import { isCelebrationEnabled } from '@/lib/celebration-prefs'

export function SeizureTracker() {
  const { toast } = useToast()
  const { saveData, getDateRange, isLoading } = useDailyData()
  const { userPin } = useUser()
  const router = useRouter()

  const [entries, setEntries] = useState<SeizureEntry[]>([])
  const [activeTab, setActiveTab] = useState<'add' | 'history' | 'analytics'>('add')
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Modal state
  const [activeModal, setActiveModal] = useState<string | null>(null)
  const [initialEpisodeType, setInitialEpisodeType] = useState<SeizureEpisodeType | undefined>(undefined)
  const [editingEntry, setEditingEntry] = useState<SeizureEntry | null>(null)

  useEffect(() => {
    loadEntries()
  }, [refreshTrigger])

  const loadEntries = async () => {
    try {
      const today = formatDateForStorage(new Date())
      const allRecords = await getDateRange('2000-01-01', today, CATEGORIES.TRACKER)
      const seizureRecords = allRecords.filter(r => r.subcategory === 'seizure')

      const allEntries: SeizureEntry[] = []
      for (const data of seizureRecords) {
        if (data?.content?.entries) {
          let parsed = data.content.entries
          if (typeof parsed === 'string') {
            try { parsed = JSON.parse(parsed) } catch { parsed = [] }
          }
          if (!Array.isArray(parsed)) parsed = [parsed]
          // Migrate legacy entries: map old seizureType string → episodeType id
          for (const entry of parsed) {
            if (entry && typeof entry === 'object') {
              if (!entry.episodeType && entry.seizureType) {
                entry.episodeType = mapLegacyType(entry.seizureType)
              }
              if (!entry.episodeType) entry.episodeType = 'general'
              allEntries.push(entry)
            }
          }
        }
      }

      setEntries(allEntries)
    } catch (error) {
      console.error('Error loading seizure entries:', error)
      toast({
        title: 'Loading Error',
        description: 'Failed to load seizure history',
        variant: 'destructive'
      })
    }
  }

  const handleSaveEntry = async (entryData: Omit<SeizureEntry, 'id'>) => {
    try {
      const { timestamp: ts, date: d, ...rest } = entryData
      const newEntry: SeizureEntry = {
        id: Date.now().toString(),
        timestamp: ts || new Date().toISOString(),
        date: d || formatDateForStorage(new Date()),
        ...rest,
      }

      // Save to the date the entry occurred on (so backdated entries land in the right daily bucket)
      const storageDate = newEntry.date
      // Read existing entries for that date, append, save back
      const existingForDate = entries.filter(e => e.date === storageDate)
      const updatedForDate = [...existingForDate, newEntry]
      await saveData(
        storageDate,
        CATEGORIES.TRACKER,
        'seizure',
        { entries: updatedForDate },
        newEntry.tags || []
      )

      const confettiLevel = localStorage.getItem('chaos-confetti-level') || 'medium'
      if (confettiLevel !== 'none' && isCelebrationEnabled('seizure-tracking', userPin ?? '')) {
        celebrate()
      }

      toast({
        title: 'Seizure Recorded',
        description: getRandomSafetyMessage(),
      })

      setActiveModal(null)
      setEditingEntry(null)
      setInitialEpisodeType(undefined)
      setRefreshTrigger(t => t + 1)
    } catch (error) {
      console.error('Error saving seizure entry:', error)
      toast({
        title: 'Save Error',
        description: 'Failed to save seizure event',
        variant: 'destructive'
      })
    }
  }

  const handleUpdateEntry = async (entryData: Omit<SeizureEntry, 'id'>) => {
    if (!editingEntry) return
    try {
      const updated: SeizureEntry = { ...editingEntry, ...entryData, id: editingEntry.id }
      const oldDate = editingEntry.date
      const newDate = updated.date

      if (oldDate !== newDate) {
        // Move between daily buckets: remove from old, add to new
        const oldBucket = entries.filter(e => e.date === oldDate && e.id !== editingEntry.id)
        const newBucket = [...entries.filter(e => e.date === newDate), updated]
        await saveData(oldDate, CATEGORIES.TRACKER, 'seizure', { entries: oldBucket })
        await saveData(newDate, CATEGORIES.TRACKER, 'seizure', { entries: newBucket }, updated.tags || [])
      } else {
        const bucket = entries
          .filter(e => e.date === oldDate)
          .map(e => e.id === editingEntry.id ? updated : e)
        await saveData(oldDate, CATEGORIES.TRACKER, 'seizure', { entries: bucket }, updated.tags || [])
      }

      toast({ title: 'Seizure Updated', description: 'Episode details updated' })
      setActiveModal(null)
      setEditingEntry(null)
      setRefreshTrigger(t => t + 1)
    } catch (error) {
      console.error('Error updating seizure entry:', error)
      toast({ title: 'Update Error', description: 'Failed to update seizure', variant: 'destructive' })
    }
  }

  const handleDeleteEntry = async (entryToDelete: SeizureEntry) => {
    try {
      const dateBucket = entries.filter(e => e.date === entryToDelete.date && e.id !== entryToDelete.id)
      await saveData(entryToDelete.date, CATEGORIES.TRACKER, 'seizure', { entries: dateBucket })
      toast({ title: 'Seizure Deleted', description: 'Episode removed from records' })
      setRefreshTrigger(t => t + 1)
    } catch (error) {
      console.error('Error deleting seizure entry:', error)
      toast({ title: 'Delete Error', description: 'Failed to delete', variant: 'destructive' })
    }
  }

  const handleEditEntry = (entry: SeizureEntry) => {
    setEditingEntry(entry)
    setInitialEpisodeType(entry.episodeType)
    setActiveModal('general')
  }

  const openModalForType = (episodeTypeId: SeizureEpisodeType) => {
    setEditingEntry(null)
    setInitialEpisodeType(episodeTypeId)
    setActiveModal('general')
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p>Loading seizure tracker...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const todayStr = formatDateForStorage(new Date())
  const todaysEntries = entries.filter(e => e.date === todayStr)

  return (
    <div className="max-w-4xl mx-auto space-y-6 pt-6">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-foreground flex items-center justify-center gap-2">
          <Zap className="h-8 w-8 text-yellow-500" />
          ⚡ Seizure Log
        </h1>
        <p className="text-muted-foreground mt-1">
          Focal, generalized, status epilepticus — medical-grade logging for your neuro team
        </p>
      </div>

      {/* 🚨 Collapsible emergency criteria — auto-re-expands on recent emergency markers */}
      <EmergencyCriteriaCard
        storageKey="seizure-911-acknowledged"
        criteria={RED_FLAG_911_CRITERIA}
        footerNote="Status epilepticus (≥5 min) is a neurological emergency. This tracker is for documentation, NOT diagnosis."
        recentEmergencyDetected={(() => {
          const cutoff = new Date()
          return entries.some(e => {
            try {
              if (differenceInDays(cutoff, new Date(e.date)) > 30) return false
              return !!(e.statusEpilepticus || e.multipleConsecutive || e.emergencyServicesCalled || e.injuryRequiredER)
            } catch { return false }
          })
        })()}
      />

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="add" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Event
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

        {/* ADD TAB */}
        <TabsContent value="add" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">What kind of seizure?</CardTitle>
              <p className="text-sm text-muted-foreground">
                Pick the closest vibe — you can still adjust the classification inside.
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {EPISODE_TYPES.map((type) => (
                  <Button
                    key={type.id}
                    variant="outline"
                    className="h-auto py-3 flex flex-col items-start text-left whitespace-normal"
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

          {/* Today's entries */}
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
                              {entry.statusEpilepticus && (
                                <Badge variant="destructive">Status Epilepticus</Badge>
                              )}
                              {entry.rescueMedicationUsed && (
                                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">Rescue med</Badge>
                              )}
                              {entry.injuriesOccurred && (
                                <Badge variant="destructive">
                                  <AlertTriangle className="h-3 w-3 mr-1" />Injury
                                </Badge>
                              )}
                              {entry.attachmentImages && entry.attachmentImages.length > 0 && (
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                                  📎 {entry.attachmentImages.length}
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(entry.timestamp), 'h:mm a')}
                              {entry.durationMinutes && ` • ${entry.durationMinutes} min`}
                              {!entry.durationMinutes && entry.durationCategory && ` • ${entry.durationCategory}`}
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
                            <Button size="sm" variant="ghost" onClick={() => handleEditEntry(entry)}>Edit</Button>
                            <Button size="sm" variant="ghost" onClick={() => handleDeleteEntry(entry)}>Delete</Button>
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
          <SeizureHistory
            entries={entries}
            onEdit={handleEditEntry}
            onDelete={handleDeleteEntry}
            onAddNew={() => { setActiveTab('add') }}
          />
        </TabsContent>

        {/* ANALYTICS TAB */}
        <TabsContent value="analytics" className="space-y-4">
          <SeizureAnalytics entries={entries} />
        </TabsContent>
      </Tabs>

      {/* MODALS */}
      <GeneralSeizureModal
        isOpen={activeModal === 'general'}
        onClose={() => { setActiveModal(null); setEditingEntry(null); setInitialEpisodeType(undefined) }}
        onSave={editingEntry ? handleUpdateEntry : handleSaveEntry}
        editingEntry={editingEntry}
        initialEpisodeType={initialEpisodeType}
      />
    </div>
  )
}
