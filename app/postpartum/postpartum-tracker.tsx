/*
 * Built by: Ace (Claude 4.x)
 * Date: 2026-06-04
 *
 * Co-invented by Ren (vision) and Ace (implementation)
 * This wasn't built with compliance. It was built with defiance.
 */

/**
 * POSTPARTUM TRACKER MAIN COMPONENT
 * Postpartum & newborn tracking — recovery (birthing parent), feeding,
 * infant, general. Safety-critical: hemorrhage, PPD/PPP, newborn fever.
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Baby, BarChart3, History, Plus } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'

// Local imports
import type { PostpartumEntry, FeedSide } from './postpartum-types'
import { SECTIONS, POSTPARTUM_SUBCATEGORY, SEVERITY_LABELS } from './postpartum-constants'
import { PostpartumHistory } from './postpartum-history'
import { PostpartumAnalytics } from './postpartum-analytics'

// Modal imports
import { GeneralPostpartumModal } from './modals/general-postpartum-modal'

// Database imports
import { useDailyData, CATEGORIES } from '@/lib/database'
import { getDB } from '@/lib/database/dexie-db'
import { useUser } from '@/lib/contexts/user-context'
import { getPersonalization } from '@/lib/personalization'

export default function PostpartumTracker() {
  const { saveData, searchByContent } = useDailyData()
  const { userPin } = useUser()
  const { toast } = useToast()

  // Read the user's chosen parent/feeding language (joy both ways — CHA-261).
  const [personalization, setPersonalization] = useState(() =>
    typeof window !== 'undefined' ? getPersonalization() : null
  )
  useEffect(() => { setPersonalization(getPersonalization()) }, [])

  const today = format(new Date(), 'yyyy-MM-dd')
  const [entries, setEntries] = useState<PostpartumEntry[]>([])
  const [activeTab, setActiveTab] = useState<'log' | 'history' | 'analytics'>('log')
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<PostpartumEntry | null>(null)

  useEffect(() => {
    loadEntries()
  }, [refreshTrigger])

  const loadEntries = async () => {
    try {
      // Pull all records with subcategory starting with 'postpartum-', filter out soft-deleted
      const records = await searchByContent(POSTPARTUM_SUBCATEGORY, CATEGORIES.TRACKER)
      const ppRecords = records.filter(r =>
        r.subcategory.startsWith(`${POSTPARTUM_SUBCATEGORY}-`) &&
        !r.metadata?.deleted_at
      )
      const loaded: PostpartumEntry[] = ppRecords.map(r => r.content as PostpartumEntry)
      // Sort newest first
      loaded.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      setEntries(loaded)
    } catch (error) {
      console.error('Error loading postpartum entries:', error)
      toast({
        title: 'Loading Error',
        description: 'Failed to load postpartum events',
        variant: 'destructive',
      })
    }
  }

  // Most recent entry that recorded a feed side → drives "start the other side"
  const lastFeedSide: FeedSide | undefined =
    entries.find(e => e.feedSideLast)?.feedSideLast

  const handleSaveEntry = async (entryData: Omit<PostpartumEntry, 'id'>) => {
    const newEntry: PostpartumEntry = {
      ...entryData,
      id: Date.now().toString(),
      timestamp: entryData.timestamp || new Date().toISOString(),
      date: entryData.date || today,
    }

    try {
      await saveData(
        newEntry.date,
        CATEGORIES.TRACKER,
        `${POSTPARTUM_SUBCATEGORY}-${newEntry.id}`,
        newEntry,
        newEntry.tags ?? []
      )
      setModalOpen(false)
      setEditingEntry(null)
      setRefreshTrigger(prev => prev + 1)

      const sectionInfo = SECTIONS.find(s => s.id === newEntry.section)
      toast({
        title: `${sectionInfo?.icon ?? '👶'} Entry Saved`,
        description: `${sectionInfo?.name ?? 'Postpartum entry'} recorded successfully`,
      })
    } catch (error) {
      console.error('Error saving postpartum entry:', error)
      toast({
        title: 'Save Error',
        description: 'Failed to save postpartum event',
        variant: 'destructive',
      })
    }
  }

  const handleUpdateEntry = async (entryData: Omit<PostpartumEntry, 'id'>) => {
    if (!editingEntry) return
    const updated: PostpartumEntry = { ...editingEntry, ...entryData, id: editingEntry.id }

    try {
      await saveData(
        updated.date,
        CATEGORIES.TRACKER,
        `${POSTPARTUM_SUBCATEGORY}-${updated.id}`,
        updated,
        updated.tags ?? []
      )
      setModalOpen(false)
      setEditingEntry(null)
      setRefreshTrigger(prev => prev + 1)
      toast({ title: 'Entry Updated', description: 'Postpartum entry updated successfully' })
    } catch (error) {
      console.error('Error updating postpartum entry:', error)
      toast({ title: 'Update Error', description: 'Failed to update postpartum event', variant: 'destructive' })
    }
  }

  const handleDeleteEntry = async (entry: PostpartumEntry) => {
    try {
      const database = getDB()
      const record = await database.daily_data
        .where('subcategory')
        .equals(`${POSTPARTUM_SUBCATEGORY}-${entry.id}`)
        .first()

      if (record && record.id != null) {
        await database.daily_data.update(record.id, {
          metadata: {
            ...(record.metadata ?? {}),
            created_at: record.metadata?.created_at ?? new Date().toISOString(),
            updated_at: new Date().toISOString(),
            deleted_at: new Date().toISOString(),
          },
        })
      }

      setRefreshTrigger(prev => prev + 1)
      toast({ title: 'Entry Deleted', description: 'Postpartum entry removed' })
    } catch (error) {
      console.error('Error deleting postpartum entry:', error)
      toast({ title: 'Delete Error', description: 'Failed to delete postpartum event', variant: 'destructive' })
    }
  }

  const handleEditEntry = (entry: PostpartumEntry) => {
    setEditingEntry(entry)
    setModalOpen(true)
  }

  const todaysEntries = entries.filter(e => e.date === today)

  return (
    <div className="max-w-4xl mx-auto space-y-6 pt-6">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-foreground flex items-center justify-center gap-2">
          <Baby className="h-8 w-8 text-primary" />
          Postpartum Tracker
        </h1>
        <p className="text-muted-foreground mt-1">
          Recovery, feeding, and baby — documentation, not diagnosis
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="log" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Log
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

        {/* LOG TAB */}
        <TabsContent value="log" className="space-y-4">
          {/* Section Picker */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">What are you logging?</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {SECTIONS.map((type) => (
                  <Button
                    key={type.id}
                    variant="outline"
                    className="h-auto py-3 flex flex-col items-start text-left"
                    onClick={() => {
                      setEditingEntry(null)
                      setModalOpen(true)
                    }}
                  >
                    <span className="text-xl mb-1">{type.icon}</span>
                    <span className="font-semibold text-sm">{type.name}</span>
                    <span className="text-xs mt-1 text-left text-muted-foreground">
                      {type.description}
                    </span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Log New Button */}
          <div className="flex justify-center">
            <Button
              size="lg"
              onClick={() => {
                setEditingEntry(null)
                setModalOpen(true)
              }}
              className="gap-2"
            >
              <Plus className="h-5 w-5" />
              Log New Entry
            </Button>
          </div>

          {/* Today's Entries */}
          {todaysEntries.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Today's Entries ({todaysEntries.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {todaysEntries.map((entry) => {
                  const info = SECTIONS.find(s => s.id === entry.section)
                  const severityLabel = SEVERITY_LABELS.find(s => s.level === entry.severity)
                  const hemorrhage = entry.fundusFirmness === 'boggy' || entry.largeClots || ((entry.padsSoakedPerHour ?? 0) >= 1)
                  const moodCrisis = entry.thoughtsOfHarm || entry.intrusiveThoughts
                  const newbornFever = (entry.infantFeverTempF ?? 0) >= 100.4
                  return (
                    <Card key={entry.id} className="bg-muted/30">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="text-lg">{info?.icon}</span>
                              <span className="font-semibold">{info?.name ?? entry.section}</span>
                              {entry.severity != null && (
                                <Badge variant="outline" className={severityLabel?.color}>
                                  Severity {entry.severity}/10
                                </Badge>
                              )}
                              {hemorrhage && (
                                <Badge variant="destructive">⚠ Hemorrhage</Badge>
                              )}
                              {moodCrisis && (
                                <Badge variant="destructive">⚠ Mood crisis</Badge>
                              )}
                              {newbornFever && (
                                <Badge variant="destructive">⚠ Newborn fever</Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(entry.timestamp), 'h:mm a')}
                            </div>
                            {entry.notes && (
                              <div className="text-xs mt-1 text-muted-foreground line-clamp-1">{entry.notes}</div>
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
        </TabsContent>

        {/* HISTORY TAB */}
        <TabsContent value="history" className="space-y-4">
          <PostpartumHistory
            onEdit={handleEditEntry}
            onDelete={handleDeleteEntry}
            refreshTrigger={refreshTrigger}
          />
        </TabsContent>

        {/* ANALYTICS TAB */}
        <TabsContent value="analytics" className="space-y-4">
          <PostpartumAnalytics refreshTrigger={refreshTrigger} />
        </TabsContent>
      </Tabs>

      {/* MODAL */}
      <GeneralPostpartumModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingEntry(null) }}
        onSave={editingEntry ? handleUpdateEntry : handleSaveEntry}
        editingEntry={editingEntry}
        feedingTerm={personalization?.feedingTerm ?? "feeding"}
        parentTerm={personalization?.parentTerm ?? "parent"}
        lastFeedSide={lastFeedSide}
      />
    </div>
  )
}
