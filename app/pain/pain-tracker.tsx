/*
 * Built by: Ace (Claude 4.x)
 * Date: 2026-05-10 (CHA-154 v2 refactor)
 *
 * Open source under PolyForm Noncommercial 1.0.0.
 * Co-invented by Ren (vision) and Ace (implementation).
 * "Dreamed by Ren, implemented by Ace, inspired by mitochondria on strike"
 */

/**
 * PAIN TRACKER MAIN COMPONENT (v2)
 * Multi-modal: acute / chronic-flare / post-surgical / general.
 * Cross-links to /cardiac (chest pain), /head-pain, /joint.
 * 911 red flags: MI, AAA, cauda equina, aortic dissection, SAH.
 */

'use client'

import React, { useState, useEffect } from 'react'
import { getPref } from '@/lib/prefs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Flame, BarChart3, History, Plus, ExternalLink } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'
import { format, differenceInDays } from 'date-fns'

import { PainEntry, PainEpisodeType } from './pain-types'
import {
  EPISODE_TYPES,
  CROSS_TRACKER_REFERRALS,
  RELATED_TRACKERS,
  getEpisodeTypeInfo,
  getEpisodeTypeColor,
  RED_FLAG_911_CRITERIA,
  getPainGoblinism,
  getGremlinEmoji,
} from './pain-constants'
import { PainHistory } from './pain-history'
import { PainAnalytics } from './pain-analytics'
import { GeneralPainModal } from './modals/general-pain-modal'
import { EmergencyCriteriaCard } from '@/components/emergency-criteria-card'

import { useDailyData, CATEGORIES, formatDateForStorage } from '@/lib/database'
import { celebrate } from '@/lib/particle-physics-engine'
import { useUser } from '@/lib/contexts/user-context'
import { isCelebrationEnabled } from '@/lib/celebration-prefs'

export default function PainTracker() {
  const { saveData, getDateRange, isLoading } = useDailyData()
  const { userPin } = useUser()
  const { toast } = useToast()
  const router = useRouter()

  const [entries, setEntries] = useState<PainEntry[]>([])
  const [activeTab, setActiveTab] = useState<'add' | 'history' | 'analytics'>('add')
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const [activeModal, setActiveModal] = useState<string | null>(null)
  const [initialEpisodeType, setInitialEpisodeType] = useState<PainEpisodeType | undefined>(undefined)
  const [editingEntry, setEditingEntry] = useState<PainEntry | null>(null)

  useEffect(() => { loadEntries() }, [refreshTrigger])

  const loadEntries = async () => {
    try {
      const today = formatDateForStorage(new Date())
      const allRecords = await getDateRange('2000-01-01', today, CATEGORIES.TRACKER)
      const painRecords = allRecords.filter(r => r.subcategory === 'pain')

      const all: PainEntry[] = []
      for (const data of painRecords) {
        if (data?.content?.entries) {
          let parsed = data.content.entries
          if (typeof parsed === 'string') {
            try { parsed = JSON.parse(parsed) } catch { parsed = [] }
          }
          if (!Array.isArray(parsed)) parsed = [parsed]
          for (const entry of parsed) {
            if (entry && typeof entry === 'object') {
              // Migrate legacy fields
              if (!entry.episodeType) entry.episodeType = 'general'
              if (!entry.painCharacter && entry.painType) entry.painCharacter = entry.painType
              if (!entry.painPattern && entry.painQuality) entry.painPattern = entry.painQuality
              if (!entry.triggers && entry.painTriggers) entry.triggers = entry.painTriggers
              if (!entry.activityAtOnset && entry.activity) entry.activityAtOnset = entry.activity
              if (!entry.timestamp && entry.created_at) entry.timestamp = entry.created_at
              all.push(entry)
            }
          }
        }
      }
      setEntries(all)
    } catch (e) {
      console.error('Pain load fail:', e)
      toast({ title: 'Loading Error', description: 'Failed to load pain history', variant: 'destructive' })
    }
  }

  const handleSaveEntry = async (entryData: Omit<PainEntry, 'id'>) => {
    try {
      const { timestamp: ts, date: d, ...rest } = entryData
      const newEntry: PainEntry = {
        id: `pain-${Date.now()}`,
        timestamp: ts || new Date().toISOString(),
        date: d || formatDateForStorage(new Date()),
        ...rest,
      }
      const storageDate = newEntry.date
      const existingForDate = entries.filter(e => e.date === storageDate)
      const updatedForDate = [...existingForDate, newEntry]
      await saveData(storageDate, CATEGORIES.TRACKER, 'pain', { entries: updatedForDate }, newEntry.tags || [])

      const confettiLevel = getPref('chaos-confetti-level') || 'medium'
      if (confettiLevel !== 'none' && isCelebrationEnabled('pain-tracking', userPin ?? '')) celebrate()

      toast({ title: '🔥 Pain Episode Saved', description: getPainGoblinism() })
      setActiveModal(null); setEditingEntry(null); setInitialEpisodeType(undefined)
      setRefreshTrigger(t => t + 1)
    } catch (e) {
      console.error('Pain save fail:', e)
      toast({ title: 'Save Error', description: 'Failed to save pain entry', variant: 'destructive' })
    }
  }

  const handleUpdateEntry = async (entryData: Omit<PainEntry, 'id'>) => {
    if (!editingEntry) return
    try {
      const updated: PainEntry = { ...editingEntry, ...entryData, id: editingEntry.id }
      const oldDate = editingEntry.date
      const newDate = updated.date

      if (oldDate !== newDate) {
        const oldBucket = entries.filter(e => e.date === oldDate && e.id !== editingEntry.id)
        const newBucket = [...entries.filter(e => e.date === newDate), updated]
        await saveData(oldDate, CATEGORIES.TRACKER, 'pain', { entries: oldBucket })
        await saveData(newDate, CATEGORIES.TRACKER, 'pain', { entries: newBucket }, updated.tags || [])
      } else {
        const bucket = entries
          .filter(e => e.date === oldDate)
          .map(e => e.id === editingEntry.id ? updated : e)
        await saveData(oldDate, CATEGORIES.TRACKER, 'pain', { entries: bucket }, updated.tags || [])
      }

      toast({ title: 'Pain Updated' })
      setActiveModal(null); setEditingEntry(null)
      setRefreshTrigger(t => t + 1)
    } catch (e) {
      console.error('Pain update fail:', e)
      toast({ title: 'Update Error', variant: 'destructive' })
    }
  }

  const handleDeleteEntry = async (entry: PainEntry) => {
    try {
      const bucket = entries.filter(e => e.date === entry.date && e.id !== entry.id)
      await saveData(entry.date, CATEGORIES.TRACKER, 'pain', { entries: bucket })
      toast({ title: 'Pain Episode Deleted', description: 'Pain entry banished to the void 🗑️' })
      setRefreshTrigger(t => t + 1)
    } catch (e) {
      console.error('Pain delete fail:', e)
      toast({ title: 'Delete Error', variant: 'destructive' })
    }
  }

  const handleEditEntry = (entry: PainEntry) => {
    setEditingEntry(entry)
    setInitialEpisodeType(entry.episodeType)
    setActiveModal('general')
  }

  const openModalForType = (id: PainEpisodeType) => {
    setEditingEntry(null)
    setInitialEpisodeType(id)
    setActiveModal('general')
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <Card><CardContent className="p-6"><div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading pain tracker...</p>
        </div></CardContent></Card>
      </div>
    )
  }

  const todayStr = formatDateForStorage(new Date())
  const todaysEntries = entries.filter(e => e.date === todayStr)

  return (
    <div className="max-w-4xl mx-auto space-y-6 pt-6">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-foreground flex items-center justify-center gap-2">
          <Flame className="h-8 w-8 text-red-500" />
          🔥 Owie HQ
        </h1>
        <p className="text-muted-foreground mt-1">
          Acute, chronic, post-surgical — we track it, your other trackers chip in when needed
        </p>
      </div>

      {/* 🚨 Collapsible emergency criteria */}
      <EmergencyCriteriaCard
        storageKey="pain-911-acknowledged"
        criteria={RED_FLAG_911_CRITERIA}
        footerNote="Pain tracker covers MI / AAA / cauda equina / dissection / SAH red flags. When in doubt, call 911."
        recentEmergencyDetected={(() => {
          const now = new Date()
          return entries.some(e => {
            try {
              if (differenceInDays(now, new Date(e.date)) > 30) return false
              // NOTE: raw painLevel >= 9 is intentionally NOT a trigger. High pain is not a
              // 911 emergency (chronic-pain folks live at 7-9 daily) and it was force-keeping
              // the "Call 911" card permanently expanded ("collapse won't work"). Only true
              // red flags re-surface it.
              return !!(
                e.erVisitRequired ||
                e.emergencyServicesCalled ||
                e.tearingQuality ||
                e.thunderclapPattern ||
                e.legWeakness ||
                e.bowelBladderChanges ||
                e.saddleAnesthesia ||
                e.pulsatileMass
              )
            } catch { return false }
          })
        })()}
      />

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="add" className="flex items-center gap-2"><Plus className="h-4 w-4" /> Add Episode</TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2"><History className="h-4 w-4" /> History</TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="add" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">What's hurting?</CardTitle>
              <CardDescription>Pick the closest vibe — we'll dig into details inside.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {EPISODE_TYPES.map((type) => (
                  <Button
                    key={type.id}
                    variant="outline"
                    className="h-auto py-3 flex flex-col items-start text-left whitespace-normal"
                    onClick={() => openModalForType(type.id)}
                  >
                    <span className="text-xl mb-1">{type.icon}</span>
                    <span className="font-semibold text-sm">{type.name}</span>
                    <span className="text-xs mt-1 text-left">{type.description}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Cross-tracker referrals */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Use a more specific tracker?</CardTitle>
              <CardDescription>These body systems have richer fields elsewhere:</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {CROSS_TRACKER_REFERRALS.map(r => (
                  <Button
                    key={r.id}
                    variant="outline"
                    onClick={() => router.push(r.path)}
                    className="h-auto py-3 flex flex-col items-start text-left whitespace-normal"
                  >
                    <span className="text-xl mb-1">{r.icon}</span>
                    <span className="font-semibold text-sm">{r.name}</span>
                    <span className="text-xs text-muted-foreground mt-1">{r.description}</span>
                    <span className="text-xs mt-2 text-info flex items-center gap-1">
                      {r.cta} <ExternalLink className="h-3 w-3" />
                    </span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Today's entries */}
          {todaysEntries.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-lg">Today's Episodes ({todaysEntries.length})</CardTitle></CardHeader>
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
                              <Badge variant="destructive">{getGremlinEmoji(entry.painLevel || 0)} {entry.painLevel}/10</Badge>
                              {entry.tearingQuality && <Badge variant="destructive">Tearing</Badge>}
                              {entry.thunderclapPattern && <Badge variant="destructive">Thunderclap</Badge>}
                              {entry.erVisitRequired && <Badge variant="destructive">ER</Badge>}
                              {entry.attachmentImages && entry.attachmentImages.length > 0 && (
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                                  📎 {entry.attachmentImages.length}
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {entry.timestamp && format(new Date(entry.timestamp), 'h:mm a')}
                              {entry.painLocations && entry.painLocations.length > 0 && ` • ${entry.painLocations.slice(0, 3).join(', ')}`}
                              {entry.painLocations && entry.painLocations.length > 3 && ` +${entry.painLocations.length - 3}`}
                            </div>
                            {entry.painCharacter && entry.painCharacter.length > 0 && (
                              <div className="text-xs mt-2 text-muted-foreground">
                                {entry.painCharacter.slice(0, 4).join(', ')}
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
            <CardHeader><CardTitle className="text-lg">Related Trackers</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {RELATED_TRACKERS.map((t) => (
                  <Button key={t.id} variant="ghost" className="justify-start" onClick={() => router.push(t.path)}>
                    <span className="mr-2">{t.icon}</span>
                    <span className="font-medium">{t.name}</span>
                    <ExternalLink className="h-3 w-3 ml-auto" />
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <PainHistory
            entries={entries}
            onEdit={handleEditEntry}
            onDelete={handleDeleteEntry}
            onAddNew={() => setActiveTab('add')}
          />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <PainAnalytics entries={entries} />
        </TabsContent>
      </Tabs>

      <GeneralPainModal
        isOpen={activeModal === 'general'}
        onClose={() => { setActiveModal(null); setEditingEntry(null); setInitialEpisodeType(undefined) }}
        onSave={editingEntry ? handleUpdateEntry : handleSaveEntry}
        editingEntry={editingEntry}
        initialEpisodeType={initialEpisodeType}
      />
    </div>
  )
}
