/*
 * Built by: Ace (Claude 4.x)
 * Date: 2026-05-10 (CHA-158 v0.4.5 — Mind & Mood)
 *
 * Open source under PolyForm Noncommercial 1.0.0.
 * Co-invented by Ren (vision) and Ace (implementation).
 * "Dreamed by Ren, implemented by Ace, inspired by mitochondria on strike"
 */

/**
 * MIND & MOOD TRACKER (formerly Mental Health)
 * Multi-modal: mood / cognitive / energy / motivation / connection /
 * regulation / general. Renamed because "mental health" implies one is
 * better than another and that's not what we're going for. — Ren
 */

'use client'

import React, { useState, useEffect } from 'react'
import { getPref } from '@/lib/prefs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Plus, Heart, ArrowLeft, BarChart3, History, ExternalLink } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import AppCanvas from '@/components/app-canvas'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format, differenceInDays } from 'date-fns'

import { MentalHealthEntry, MindMoodEpisodeType } from './mental-health-types'
import {
  EPISODE_TYPES,
  RELATED_TRACKERS_MIND_MOOD,
  getEpisodeTypeInfo,
  getEpisodeTypeColor,
  RED_FLAG_988_CRITERIA,
  MOOD_OPTIONS,
  MENTAL_HEALTH_GOBLINISMS,
} from './mental-health-constants'
import { MindMoodHistory } from './mental-health-history'
import { MindMoodAnalytics } from './mental-health-analytics'
import { GeneralMindMoodModal } from './modals/general-mind-mood-modal'
import { EmergencyCriteriaCard } from '@/components/emergency-criteria-card'

import { useDailyData, CATEGORIES, formatDateForStorage } from '@/lib/database'
import { celebrate } from '@/lib/particle-physics-engine'
import { useUser } from '@/lib/contexts/user-context'
import { isCelebrationEnabled } from '@/lib/celebration-prefs'

export default function MindMoodPage() {
  const { saveData, getDateRange, isLoading } = useDailyData()
  const { userPin } = useUser()
  const { toast } = useToast()
  const router = useRouter()

  const [entries, setEntries] = useState<MentalHealthEntry[]>([])
  const [activeTab, setActiveTab] = useState<'add' | 'history' | 'analytics'>('add')
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [activeModal, setActiveModal] = useState<string | null>(null)
  const [initialEpisodeType, setInitialEpisodeType] = useState<MindMoodEpisodeType | undefined>(undefined)
  const [editingEntry, setEditingEntry] = useState<MentalHealthEntry | null>(null)

  useEffect(() => { loadEntries() }, [refreshTrigger])

  const loadEntries = async () => {
    try {
      const today = formatDateForStorage(new Date())
      const allRecords = await getDateRange('2000-01-01', today, CATEGORIES.TRACKER)
      const records = allRecords.filter(r => r.subcategory === 'mental-health' || r.subcategory === 'mind-mood')
      const all: MentalHealthEntry[] = []
      for (const data of records) {
        if (data?.content?.entries) {
          let parsed = data.content.entries
          if (typeof parsed === 'string') { try { parsed = JSON.parse(parsed) } catch { parsed = [] } }
          if (!Array.isArray(parsed)) parsed = [parsed]
          for (const entry of parsed) {
            if (entry && typeof entry === 'object') {
              if (!entry.episodeType) entry.episodeType = 'general'
              if (!entry.date) entry.date = data.date
              all.push(entry)
            }
          }
        }
      }
      setEntries(all)
    } catch (e) {
      console.error('Mind & Mood load fail:', e)
      toast({ title: 'Loading Error', variant: 'destructive' })
    }
  }

  const handleSaveEntry = async (entryData: Omit<MentalHealthEntry, 'id'>) => {
    try {
      const newEntry: MentalHealthEntry = {
        id: `mind-mood-${Date.now()}`,
        ...entryData,
        date: entryData.date || formatDateForStorage(new Date()),
      }
      const storageDate = newEntry.date
      const existingForDate = entries.filter(e => e.date === storageDate)
      const updatedForDate = [...existingForDate, newEntry]
      await saveData(storageDate, CATEGORIES.TRACKER, 'mental-health', { entries: updatedForDate }, newEntry.tags || [])
      const confettiLevel = getPref('chaos-confetti-level') || 'medium'
      if (confettiLevel !== 'none' && isCelebrationEnabled('mental-health', userPin ?? '')) celebrate()
      const goblinism = MENTAL_HEALTH_GOBLINISMS[Math.floor(Date.now() / 1000) % MENTAL_HEALTH_GOBLINISMS.length] || 'Logged 💜'
      toast({ title: '💜 Logged', description: goblinism })
      setActiveModal(null); setEditingEntry(null); setInitialEpisodeType(undefined)
      setRefreshTrigger(t => t + 1)
    } catch (e) {
      console.error('Save fail:', e)
      toast({ title: 'Save Error', variant: 'destructive' })
    }
  }

  const handleUpdateEntry = async (entryData: Omit<MentalHealthEntry, 'id'>) => {
    if (!editingEntry) return
    try {
      const updated: MentalHealthEntry = { ...editingEntry, ...entryData, id: editingEntry.id }
      const oldDate = editingEntry.date
      const newDate = updated.date
      if (oldDate !== newDate) {
        const oldBucket = entries.filter(e => e.date === oldDate && e.id !== editingEntry.id)
        const newBucket = [...entries.filter(e => e.date === newDate), updated]
        await saveData(oldDate, CATEGORIES.TRACKER, 'mental-health', { entries: oldBucket })
        await saveData(newDate, CATEGORIES.TRACKER, 'mental-health', { entries: newBucket }, updated.tags || [])
      } else {
        const bucket = entries.filter(e => e.date === oldDate).map(e => e.id === editingEntry.id ? updated : e)
        await saveData(oldDate, CATEGORIES.TRACKER, 'mental-health', { entries: bucket }, updated.tags || [])
      }
      toast({ title: 'Entry Updated' })
      setActiveModal(null); setEditingEntry(null)
      setRefreshTrigger(t => t + 1)
    } catch (e) { console.error(e); toast({ title: 'Update Error', variant: 'destructive' }) }
  }

  const handleDeleteEntry = async (entry: MentalHealthEntry) => {
    try {
      const bucket = entries.filter(e => e.date === entry.date && e.id !== entry.id)
      await saveData(entry.date, CATEGORIES.TRACKER, 'mental-health', { entries: bucket })
      toast({ title: 'Entry Deleted' })
      setRefreshTrigger(t => t + 1)
    } catch (e) { console.error(e); toast({ title: 'Delete Error', variant: 'destructive' }) }
  }

  const handleEditEntry = (entry: MentalHealthEntry) => {
    setEditingEntry(entry)
    setInitialEpisodeType(entry.episodeType || 'general')
    setActiveModal('general')
  }

  const openModalForType = (id: MindMoodEpisodeType) => {
    setEditingEntry(null)
    setInitialEpisodeType(id)
    setActiveModal('general')
  }

  if (isLoading) {
    return (
      <AppCanvas currentPage="mental-health">
        <div className="container mx-auto p-4">
          <Card><CardContent className="p-6"><div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading Mind & Mood...</p>
          </div></CardContent></Card>
        </div>
      </AppCanvas>
    )
  }

  const todayStr = formatDateForStorage(new Date())
  const todaysEntries = entries.filter(e => e.date === todayStr)

  return (
    <AppCanvas currentPage="mental-health">
      <div className="max-w-4xl mx-auto space-y-6 pt-6">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-foreground flex items-center justify-center gap-2">
            <Heart className="h-8 w-8 text-purple-500" />
            💜 Mind & Mood
          </h1>
          <p className="text-muted-foreground mt-1">
            Mood, cognitive, energy, motivation, connection, regulation — all valid check-ins, no wrong answers
          </p>
        </div>

        <EmergencyCriteriaCard
          storageKey="mind-mood-988-acknowledged"
          criteria={RED_FLAG_988_CRITERIA}
          title="💜 Crisis support — 988 (Suicide & Crisis Lifeline)"
          footerNote="988 is free, confidential, 24/7. Call or text. Reaching out is brave, not weak."
          recentEmergencyDetected={(() => {
            const now = new Date()
            return entries.some(e => {
              try {
                if (differenceInDays(now, new Date(e.date)) > 30) return false
                const dep = e.depressionLevel || 0
                const mania = e.maniaLevel || 0
                return !!(
                  (dep >= 8 && mania >= 6) ||
                  mania >= 8 ||
                  e.moodSwingDirection === 'rapid-cycling'
                )
              } catch { return false }
            })
          })()}
        />

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="add" className="flex items-center gap-2"><Plus className="h-4 w-4" /> Add Entry</TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2"><History className="h-4 w-4" /> History</TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="add" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">How's the inner weather?</CardTitle>
                <CardDescription>Pick what's most relevant — we'll dig into details inside.</CardDescription>
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

            {todaysEntries.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-lg">Today's check-ins ({todaysEntries.length})</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {todaysEntries.map((entry) => {
                    const info = getEpisodeTypeInfo(entry.episodeType)
                    const moodInfo = MOOD_OPTIONS.find(m => m.value === entry.mood)
                    return (
                      <Card key={entry.id} className="bg-muted/30">
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className="text-lg">{info.icon}</span>
                                <span className="font-semibold">{info.name}</span>
                                {moodInfo && <Badge variant="secondary">{moodInfo.emoji} {moodInfo.label}</Badge>}
                                {entry.depressionLevel >= 7 && <Badge variant="destructive">Dep {entry.depressionLevel}</Badge>}
                                {entry.maniaLevel >= 7 && <Badge variant="destructive">Mania {entry.maniaLevel}</Badge>}
                                {entry.moodSwingDirection === 'rapid-cycling' && <Badge variant="destructive">Rapid cycling</Badge>}
                                {entry.meltdownOccurred && <Badge variant="outline" className="bg-info/10 text-info border-info/30">Meltdown</Badge>}
                              </div>
                              <div className="text-xs text-muted-foreground">{entry.time}</div>
                              {entry.notes && <div className="text-xs mt-2 text-muted-foreground">{entry.notes.substring(0, 100)}{entry.notes.length > 100 ? '...' : ''}</div>}
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

            <Card>
              <CardHeader><CardTitle className="text-lg">Related Trackers</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {RELATED_TRACKERS_MIND_MOOD.map((t) => (
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
            <MindMoodHistory entries={entries} onEdit={handleEditEntry} onDelete={handleDeleteEntry} onAddNew={() => setActiveTab('add')} />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <MindMoodAnalytics entries={entries} />
          </TabsContent>
        </Tabs>

        <GeneralMindMoodModal
          isOpen={activeModal === 'general'}
          onClose={() => { setActiveModal(null); setEditingEntry(null); setInitialEpisodeType(undefined) }}
          onSave={editingEntry ? handleUpdateEntry : handleSaveEntry}
          editingEntry={editingEntry}
          initialEpisodeType={initialEpisodeType}
        />

        <div className="flex justify-center pt-4">
          <Button variant="outline" asChild>
            <Link href="/mind"><ArrowLeft className="h-4 w-4 mr-2" />Back to Mind</Link>
          </Button>
        </div>
      </div>
    </AppCanvas>
  )
}
