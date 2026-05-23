/*
 * Built by: Ace (Claude 4.x)
 * Date: 2026-05-10 (CHA-156 v2 refactor)
 *
 * Open source under PolyForm Noncommercial 1.0.0.
 * Co-invented by Ren (vision) and Ace (implementation).
 * "Dreamed by Ren, implemented by Ace, inspired by mitochondria on strike"
 */

/**
 * FOOD ALLERGENS / REACTIONS TRACKER (v2)
 * Multi-modal: mild / moderate / severe-anaphylaxis / celiac-autoimmune /
 * intolerance / confirmed-exposure / unknown-trigger / general.
 *
 * Two distinct red-flag patterns:
 * - IgE pathway: skin + airway/breathing → EpiPen + 911
 * - Celiac/autoimmune: GI + brain fog + joint + fatigue (no EpiPen)
 *
 * Built fresh after Luka's celiac diagnosis 2026-05-10.
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Utensils, BarChart3, History, Plus, ExternalLink, Shield } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'
import { format, differenceInDays } from 'date-fns'

import { FoodAllergenEntry, FoodReactionEpisodeType, KnownAllergen } from './food-allergens-types'
import {
  EPISODE_TYPES,
  RELATED_TRACKERS,
  getEpisodeTypeInfo,
  getEpisodeTypeColor,
  RED_FLAG_911_CRITERIA,
} from './food-allergens-constants'
import { FoodAllergensHistory } from './food-allergens-history'
import { FoodAllergensAnalytics } from './food-allergens-analytics'
import { GeneralFoodAllergensModal } from './modals/general-food-allergens-modal'
import { AllergenManagement } from './allergen-management'
import { EmergencyCriteriaCard } from '@/components/emergency-criteria-card'

import { useDailyData, CATEGORIES, formatDateForStorage } from '@/lib/database'
import { celebrate } from '@/lib/particle-physics-engine'
import { useUser } from '@/lib/contexts/user-context'
import { isCelebrationEnabled } from '@/lib/celebration-prefs'

// === LEGACY RE-EXPORTS (for back-compat with allergen-form.tsx + allergen-management.tsx) ===
export type { KnownAllergen, FoodAllergenEntry } from './food-allergens-types'
export const SEVERITY_LEVELS = ['Mild', 'Moderate', 'Severe', 'Life-threatening'] as const
export const COMMON_SYMPTOMS = [
  'Hives/Rash',
  'Itching',
  'Swelling (face/lips/tongue)',
  'Difficulty breathing',
  'Wheezing',
  'Nausea/Vomiting',
  'Diarrhea',
  'Stomach cramps',
  'Dizziness',
  'Rapid heartbeat',
  'Loss of consciousness',
  'Throat tightness',
  'Runny/stuffy nose',
  'Watery eyes',
  'Brain fog',
  'Joint pain',
  'Profound fatigue',
]

export function FoodAllergensTracker() {
  const { saveData, getDateRange, getSpecificData, isLoading } = useDailyData()
  const { userPin } = useUser()
  const { toast } = useToast()
  const router = useRouter()

  const [entries, setEntries] = useState<FoodAllergenEntry[]>([])
  const [knownAllergens, setKnownAllergens] = useState<KnownAllergen[]>([])
  const [activeTab, setActiveTab] = useState<'add' | 'history' | 'analytics' | 'allergens'>('add')
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const [activeModal, setActiveModal] = useState<string | null>(null)
  const [initialEpisodeType, setInitialEpisodeType] = useState<FoodReactionEpisodeType | undefined>(undefined)
  const [editingEntry, setEditingEntry] = useState<FoodAllergenEntry | null>(null)

  useEffect(() => { loadEntries(); loadKnownAllergens() }, [refreshTrigger])

  const loadEntries = async () => {
    try {
      const today = formatDateForStorage(new Date())
      const allRecords = await getDateRange('2000-01-01', today, CATEGORIES.TRACKER)
      const records = allRecords.filter(r => r.subcategory === 'food-allergens')

      const all: FoodAllergenEntry[] = []
      for (const data of records) {
        if (data?.content) {
          let parsed: any = data.content
          if (typeof parsed === 'string') {
            try { parsed = JSON.parse(parsed) } catch { parsed = null }
          }
          let arr = parsed?.entries
          if (typeof arr === 'string') {
            try { arr = JSON.parse(arr) } catch { arr = [] }
          }
          if (!Array.isArray(arr)) arr = arr ? [arr] : []
          for (const entry of arr) {
            if (entry && typeof entry === 'object') {
              if (!entry.episodeType) {
                // Map legacy reactionSeverity to episodeType
                const sev = entry.reactionSeverity
                if (sev === 'Life-threatening' || sev === 'Severe') entry.episodeType = 'severe-anaphylaxis'
                else if (sev === 'Moderate') entry.episodeType = 'moderate'
                else entry.episodeType = 'mild'
              }
              if (!entry.timestamp) entry.timestamp = entry.created_at || new Date().toISOString()
              if (!entry.date) {
                try { entry.date = format(new Date(entry.timestamp), 'yyyy-MM-dd') } catch {}
              }
              if (!entry.symptoms) entry.symptoms = []
              all.push(entry)
            }
          }
        }
      }
      setEntries(all)
    } catch (e) {
      console.error('Food-allergens load fail:', e)
      toast({ title: 'Loading Error', variant: 'destructive' })
    }
  }

  const loadKnownAllergens = async () => {
    try {
      const data = await getSpecificData('known-allergens', CATEGORIES.TRACKER, 'food-allergens-registry')
      if (data?.content) {
        let parsed: any = data.content
        if (typeof parsed === 'string') {
          try { parsed = JSON.parse(parsed) } catch { parsed = null }
        }
        if (parsed?.allergens && Array.isArray(parsed.allergens)) {
          setKnownAllergens(parsed.allergens)
        }
      }
    } catch (e) {
      // Non-fatal
    }
  }

  const handleSaveEntry = async (entryData: Omit<FoodAllergenEntry, 'id'>) => {
    try {
      const { timestamp: ts, date: d, ...rest } = entryData
      const newEntry: FoodAllergenEntry = {
        id: `food-allergen-${Date.now()}`,
        timestamp: ts || new Date().toISOString(),
        date: d || formatDateForStorage(new Date()),
        ...rest,
      }
      const storageDate = newEntry.date!
      const existingForDate = entries.filter(e => e.date === storageDate)
      const updatedForDate = [...existingForDate, newEntry]
      await saveData(storageDate, CATEGORIES.TRACKER, 'food-allergens', { entries: updatedForDate }, newEntry.tags || [])

      const confettiLevel = localStorage.getItem('chaos-confetti-level') || 'medium'
      if (confettiLevel !== 'none' && isCelebrationEnabled('food-allergens', userPin ?? '')) celebrate()

      toast({ title: '🍽️ Reaction Logged', description: 'Documented for your allergist / GI doc' })
      setActiveModal(null); setEditingEntry(null); setInitialEpisodeType(undefined)
      setRefreshTrigger(t => t + 1)
    } catch (e) {
      console.error('Save fail:', e)
      toast({ title: 'Save Error', variant: 'destructive' })
    }
  }

  const handleUpdateEntry = async (entryData: Omit<FoodAllergenEntry, 'id'>) => {
    if (!editingEntry) return
    try {
      const updated: FoodAllergenEntry = { ...editingEntry, ...entryData, id: editingEntry.id }
      const oldDate = editingEntry.date!
      const newDate = updated.date!

      if (oldDate !== newDate) {
        const oldBucket = entries.filter(e => e.date === oldDate && e.id !== editingEntry.id)
        const newBucket = [...entries.filter(e => e.date === newDate), updated]
        await saveData(oldDate, CATEGORIES.TRACKER, 'food-allergens', { entries: oldBucket })
        await saveData(newDate, CATEGORIES.TRACKER, 'food-allergens', { entries: newBucket }, updated.tags || [])
      } else {
        const bucket = entries.filter(e => e.date === oldDate).map(e => e.id === editingEntry.id ? updated : e)
        await saveData(oldDate, CATEGORIES.TRACKER, 'food-allergens', { entries: bucket }, updated.tags || [])
      }

      toast({ title: 'Reaction Updated' })
      setActiveModal(null); setEditingEntry(null)
      setRefreshTrigger(t => t + 1)
    } catch (e) {
      console.error('Update fail:', e)
      toast({ title: 'Update Error', variant: 'destructive' })
    }
  }

  const handleDeleteEntry = async (entry: FoodAllergenEntry) => {
    try {
      const bucket = entries.filter(e => e.date === entry.date && e.id !== entry.id)
      await saveData(entry.date!, CATEGORIES.TRACKER, 'food-allergens', { entries: bucket })
      toast({ title: 'Reaction Deleted' })
      setRefreshTrigger(t => t + 1)
    } catch (e) {
      console.error('Delete fail:', e)
      toast({ title: 'Delete Error', variant: 'destructive' })
    }
  }

  const handleEditEntry = (entry: FoodAllergenEntry) => {
    setEditingEntry(entry)
    setInitialEpisodeType(entry.episodeType)
    setActiveModal('general')
  }

  const openModalForType = (id: FoodReactionEpisodeType) => {
    setEditingEntry(null)
    setInitialEpisodeType(id)
    setActiveModal('general')
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <Card><CardContent className="p-6"><div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading food reactions tracker...</p>
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
          <Utensils className="h-8 w-8 text-amber-500" />
          🍽️🚫 Food Drama
        </h1>
        <p className="text-muted-foreground mt-1">
          IgE allergy, celiac/autoimmune, intolerance — different patterns, different red flags, all logged
        </p>
      </div>

      <EmergencyCriteriaCard
        storageKey="food-allergens-911-acknowledged"
        criteria={RED_FLAG_911_CRITERIA}
        footerNote="Anaphylaxis kills via airway / circulatory collapse. EpiPen first if prescribed, THEN 911. Under-using epinephrine is the #1 cause of anaphylaxis death."
        recentEmergencyDetected={(() => {
          const now = new Date()
          return entries.some(e => {
            try {
              if (differenceInDays(now, new Date(e.date || e.timestamp)) > 30) return false
              return !!(
                e.erVisitRequired ||
                e.emergencyServicesCalled ||
                e.epipenUsed ||
                e.hospitalizedOvernight ||
                e.episodeType === 'severe-anaphylaxis' ||
                e.throatTightness ||
                e.difficultyBreathing ||
                e.lossOfConsciousness ||
                e.reactionSeverity === 'Life-threatening'
              )
            } catch { return false }
          })
        })()}
      />

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="add" className="flex items-center gap-2"><Plus className="h-4 w-4" /> Log</TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2"><History className="h-4 w-4" /> History</TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Analytics</TabsTrigger>
          <TabsTrigger value="allergens" className="flex items-center gap-2"><Shield className="h-4 w-4" /> Known</TabsTrigger>
        </TabsList>

        <TabsContent value="add" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">What did food do this time?</CardTitle>
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

          {todaysEntries.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-lg">Today's Reactions ({todaysEntries.length})</CardTitle></CardHeader>
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
                              <span className="font-semibold">{entry.allergenName}</span>
                              <Badge variant="secondary">{info.name}</Badge>
                              {entry.epipenUsed && <Badge variant="destructive">EpiPen ×{entry.epipenDosesUsed || 1}</Badge>}
                              {entry.erVisitRequired && <Badge variant="destructive">ER</Badge>}
                              {entry.hospitalizedOvernight && <Badge variant="destructive">Hospitalized</Badge>}
                              {entry.delayedReaction && <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">Delayed +{entry.delayedReactionHours}h</Badge>}
                              {entry.attachmentImages && entry.attachmentImages.length > 0 && (
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">📎 {entry.attachmentImages.length}</Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {entry.timestamp && format(new Date(entry.timestamp), 'h:mm a')}
                              {entry.exposureSource && ` • ${entry.exposureSource}`}
                              {entry.reactionTime && ` • onset ${entry.reactionTime}`}
                            </div>
                            {entry.symptoms && entry.symptoms.length > 0 && (
                              <div className="text-xs mt-2 text-muted-foreground">
                                {entry.symptoms.slice(0, 5).join(', ')}
                                {entry.symptoms.length > 5 && ` +${entry.symptoms.length - 5} more`}
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
          <FoodAllergensHistory entries={entries} onEdit={handleEditEntry} onDelete={handleDeleteEntry} onAddNew={() => setActiveTab('add')} />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <FoodAllergensAnalytics entries={entries} />
        </TabsContent>

        <TabsContent value="allergens" className="space-y-4">
          <AllergenManagement />
        </TabsContent>
      </Tabs>

      <GeneralFoodAllergensModal
        isOpen={activeModal === 'general'}
        onClose={() => { setActiveModal(null); setEditingEntry(null); setInitialEpisodeType(undefined) }}
        onSave={editingEntry ? handleUpdateEntry : handleSaveEntry}
        editingEntry={editingEntry}
        initialEpisodeType={initialEpisodeType}
        knownAllergens={knownAllergens}
      />
    </div>
  )
}
