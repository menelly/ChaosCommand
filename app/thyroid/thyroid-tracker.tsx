/*
 * Built by: Ace (Claude 4.x)
 * Date: 2026-06-04
 *
 * Co-invented by Ren (vision) and Ace (implementation)
 * This wasn't built with compliance. It was built with defiance.
 */

/**
 * THYROID TRACKER MAIN COMPONENT
 * Hypo/hyper symptom tracking, lab values (TSH/T3/T4/antibodies), medication +
 * dose response. Safety-critical: thyroid storm, myxedema crisis, Graves' eye.
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { BarChart3, History, Plus } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'

// Local imports
import type { ThyroidEntry } from './thyroid-types'
import { EPISODE_TYPES, THYROID_SUBCATEGORY, SEVERITY_LABELS } from './thyroid-constants'
import { ThyroidHistory } from './thyroid-history'
import { ThyroidAnalytics } from './thyroid-analytics'

// Modal imports
import { GeneralThyroidModal } from './modals/general-thyroid-modal'

// Database imports
import { useDailyData, CATEGORIES } from '@/lib/database'
import { getDB } from '@/lib/database/dexie-db'
import { useUser } from '@/lib/contexts/user-context'

export default function ThyroidTracker() {
  const { saveData, searchByContent } = useDailyData()
  const { userPin } = useUser()
  const { toast } = useToast()

  const today = format(new Date(), 'yyyy-MM-dd')
  const [entries, setEntries] = useState<ThyroidEntry[]>([])
  const [activeTab, setActiveTab] = useState<'log' | 'history' | 'analytics'>('log')
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<ThyroidEntry | null>(null)

  useEffect(() => {
    loadEntries()
  }, [refreshTrigger])

  const loadEntries = async () => {
    try {
      // Pull all records with subcategory starting with 'thyroid-', filter out soft-deleted
      const records = await searchByContent(THYROID_SUBCATEGORY, CATEGORIES.TRACKER)
      const thyroidRecords = records.filter(r =>
        r.subcategory.startsWith(`${THYROID_SUBCATEGORY}-`) &&
        !r.metadata?.deleted_at
      )
      const loaded: ThyroidEntry[] = thyroidRecords.map(r => r.content as ThyroidEntry)
      // Sort newest first
      loaded.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      setEntries(loaded)
    } catch (error) {
      console.error('Error loading thyroid entries:', error)
      toast({
        title: 'Loading Error',
        description: 'Failed to load thyroid events',
        variant: 'destructive',
      })
    }
  }

  const handleSaveEntry = async (entryData: Omit<ThyroidEntry, 'id'>) => {
    const newEntry: ThyroidEntry = {
      ...entryData,
      id: Date.now().toString(),
      timestamp: entryData.timestamp || new Date().toISOString(),
      date: entryData.date || today,
    }

    try {
      await saveData(
        newEntry.date,
        CATEGORIES.TRACKER,
        `${THYROID_SUBCATEGORY}-${newEntry.id}`,
        newEntry,
        newEntry.tags ?? []
      )
      setModalOpen(false)
      setEditingEntry(null)
      setRefreshTrigger(prev => prev + 1)

      const episodeInfo = EPISODE_TYPES.find(e => e.id === newEntry.episodeType)
      toast({
        title: `${episodeInfo?.icon ?? '🦋'} Event Saved`,
        description: `${episodeInfo?.name ?? 'Thyroid event'} recorded successfully`,
      })
    } catch (error) {
      console.error('Error saving thyroid entry:', error)
      toast({
        title: 'Save Error',
        description: 'Failed to save thyroid event',
        variant: 'destructive',
      })
    }
  }

  const handleUpdateEntry = async (entryData: Omit<ThyroidEntry, 'id'>) => {
    if (!editingEntry) return
    const updated: ThyroidEntry = { ...editingEntry, ...entryData, id: editingEntry.id }

    try {
      await saveData(
        updated.date,
        CATEGORIES.TRACKER,
        `${THYROID_SUBCATEGORY}-${updated.id}`,
        updated,
        updated.tags ?? []
      )
      setModalOpen(false)
      setEditingEntry(null)
      setRefreshTrigger(prev => prev + 1)
      toast({ title: 'Event Updated', description: 'Thyroid event updated successfully' })
    } catch (error) {
      console.error('Error updating thyroid entry:', error)
      toast({ title: 'Update Error', description: 'Failed to update thyroid event', variant: 'destructive' })
    }
  }

  const handleDeleteEntry = async (entry: ThyroidEntry) => {
    try {
      const database = getDB()
      const record = await database.daily_data
        .where('subcategory')
        .equals(`${THYROID_SUBCATEGORY}-${entry.id}`)
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
      toast({ title: 'Event Deleted', description: 'Thyroid event removed' })
    } catch (error) {
      console.error('Error deleting thyroid entry:', error)
      toast({ title: 'Delete Error', description: 'Failed to delete thyroid event', variant: 'destructive' })
    }
  }

  const handleEditEntry = (entry: ThyroidEntry) => {
    setEditingEntry(entry)
    setModalOpen(true)
  }

  const todaysEntries = entries.filter(e => e.date === today)

  return (
    <div className="max-w-4xl mx-auto space-y-6 pt-6">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-foreground flex items-center justify-center gap-2">
          <span className="text-3xl">🦋</span>
          Thyroid Tracker
        </h1>
        <p className="text-muted-foreground mt-1">
          Symptoms, labs, medication — documentation, not diagnosis
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
          {/* Episode Type Picker */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">What's going on?</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {EPISODE_TYPES.map((type) => (
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
              Log New Thyroid Event
            </Button>
          </div>

          {/* Today's Entries */}
          {todaysEntries.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Today's Events ({todaysEntries.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {todaysEntries.map((entry) => {
                  const info = EPISODE_TYPES.find(e => e.id === entry.episodeType)
                  const severityLabel = SEVERITY_LABELS.find(s => s.level === entry.severity)
                  return (
                    <Card key={entry.id} className="bg-muted/30">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="text-lg">{info?.icon}</span>
                              <span className="font-semibold">{info?.name ?? entry.episodeType}</span>
                              <Badge variant="outline" className={severityLabel?.color}>
                                Severity {entry.severity}/10
                              </Badge>
                              {entry.feverPresent && entry.confusionAgitation && (
                                <Badge variant="destructive">⚠ Thyroid storm</Badge>
                              )}
                              {entry.extremeColdDrowsy && (
                                <Badge variant="destructive">⚠ Myxedema</Badge>
                              )}
                              {entry.hyperSymptoms?.includes('eye-changes') && (
                                <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
                                  👁 Graves' eye
                                </Badge>
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
          <ThyroidHistory
            onEdit={handleEditEntry}
            onDelete={handleDeleteEntry}
            refreshTrigger={refreshTrigger}
          />
        </TabsContent>

        {/* ANALYTICS TAB */}
        <TabsContent value="analytics" className="space-y-4">
          <ThyroidAnalytics refreshTrigger={refreshTrigger} />
        </TabsContent>
      </Tabs>

      {/* MODAL */}
      <GeneralThyroidModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingEntry(null) }}
        onSave={editingEntry ? handleUpdateEntry : handleSaveEntry}
        editingEntry={editingEntry}
      />
    </div>
  )
}
