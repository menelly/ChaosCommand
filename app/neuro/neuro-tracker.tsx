/* Built by: Ace (Claude 4.x) — 2026-06-07. Co-invented by Ren (vision) + an MS friend + Ace. */

'use client'

import React, { useState, useEffect } from 'react'
import { getPref } from '@/lib/prefs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Brain, BarChart3, History, Plus, ExternalLink } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'
import { format, addDays, subDays, differenceInDays } from 'date-fns'
import { useDailyData, CATEGORIES } from '@/lib/database'
import { EmergencyCriteriaCard } from '@/components/emergency-criteria-card'
import { celebrate } from '@/lib/particle-physics-engine'
import { useUser } from '@/lib/contexts/user-context'
import { isCelebrationEnabled } from '@/lib/celebration-prefs'

import { NeuroEntry } from './neuro-types'
import { EPISODE_TYPES, RELATED_TRACKERS, getEpisodeTypeInfo, RED_FLAG_911_CRITERIA } from './neuro-constants'
import { NeuroHistory } from './neuro-history'
import { NeuroAnalytics } from './neuro-analytics'
import { GeneralNeuroModal } from './modals/general-neuro-modal'
import { crossListSave, crossListDelete, isCrossListed } from '@/lib/cross-list'
import { neuroJointTranslate } from '@/lib/cross-list-neuro-joint'

export default function NeuroTracker() {
  const { saveData, getCategoryData } = useDailyData()
  const { userPin } = useUser()
  const { toast } = useToast()
  const router = useRouter()

  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [entries, setEntries] = useState<NeuroEntry[]>([])
  const [activeTab, setActiveTab] = useState<'episodes' | 'history' | 'analytics'>('episodes')
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<NeuroEntry | null>(null)
  const [presetType, setPresetType] = useState<string | null>(null)

  useEffect(() => { load() }, [selectedDate, refreshTrigger])

  const load = async () => {
    try {
      const records = await getCategoryData(selectedDate, CATEGORIES.TRACKER)
      const record = records.find(r => r.subcategory === 'neuro')
      if (record?.content?.entries) {
        let loaded = record.content.entries
        if (typeof loaded === 'string') { try { loaded = JSON.parse(loaded) } catch { loaded = [] } }
        setEntries(loaded)
      } else { setEntries([]) }
    } catch (e) { console.error(e); toast({ title: 'Loading Error', variant: 'destructive' }) }
  }

  const saveEntries = async (next: NeuroEntry[]) => {
    try { await saveData(selectedDate, CATEGORIES.TRACKER, 'neuro', { entries: next }); setEntries(next) }
    catch (e) { console.error(e); toast({ title: 'Save Error', variant: 'destructive' }) }
  }

  const handleSaveEntry = async (data: Omit<NeuroEntry, 'id'>) => {
    const { timestamp: ts, date: d, ...rest } = data
    const newEntry: NeuroEntry = { id: Date.now().toString(), timestamp: ts || new Date().toISOString(), date: d || selectedDate, ...rest }
    if (isCrossListed(newEntry)) {
      // Shared write into BOTH neuro + joint, each in its native field shape.
      await crossListSave({ saveData, getCategoryData }, 'neuro', 'joint', newEntry, neuroJointTranslate)
    } else {
      await saveEntries([...entries, newEntry])
    }
    if ((getPref('chaos-confetti-level') || 'medium') !== 'none' && isCelebrationEnabled('neuro', userPin ?? '')) celebrate()
    setModalOpen(false); setEditingEntry(null); setPresetType(null); setRefreshTrigger(p => p + 1)
    const info = getEpisodeTypeInfo(data.episodeType)
    toast({ title: `${info.icon} Event Saved`, description: isCrossListed(newEntry) ? `${info.name} recorded (⇄ also under MSK)` : `${info.name} recorded` })
  }

  const handleEditEntry = (e: NeuroEntry) => { setEditingEntry(e); setPresetType(null); setModalOpen(true) }

  const handleUpdateEntry = async (data: Omit<NeuroEntry, 'id'>) => {
    if (!editingEntry) return
    const updated: NeuroEntry = { ...editingEntry, ...data, id: editingEntry.id }
    const fns = { saveData, getCategoryData }
    if (isCrossListed(updated)) {
      // Now cross-listed (or still): upsert by id in both subcategories (native shape each).
      await crossListSave(fns, 'neuro', 'joint', updated, neuroJointTranslate)
    } else if (isCrossListed(editingEntry)) {
      // Was cross-listed, now isn't: pull from both, then re-add to neuro only.
      await crossListDelete(fns, 'neuro', 'joint', editingEntry.date, editingEntry.id)
      await saveEntries(entries.map(e => e.id === editingEntry.id ? updated : e))
    } else {
      await saveEntries(entries.map(e => e.id === editingEntry.id ? updated : e))
    }
    setModalOpen(false); setEditingEntry(null); setPresetType(null); setRefreshTrigger(p => p + 1)
    toast({ title: 'Event Updated' })
  }

  const handleDeleteEntry = async (e: NeuroEntry) => {
    if (isCrossListed(e)) {
      await crossListDelete({ saveData, getCategoryData }, 'neuro', 'joint', e.date, e.id)
    } else {
      await saveEntries(entries.filter(x => x.id !== e.id))
    }
    setRefreshTrigger(p => p + 1); toast({ title: 'Event Deleted' })
  }

  const goToPreviousDay = () => setSelectedDate(p => format(subDays(new Date(p + 'T12:00:00'), 1), 'yyyy-MM-dd'))
  const goToNextDay = () => setSelectedDate(p => format(addDays(new Date(p + 'T12:00:00'), 1), 'yyyy-MM-dd'))
  const goToToday = () => setSelectedDate(format(new Date(), 'yyyy-MM-dd'))

  const todaysEntries = entries.filter(e => e.date === selectedDate)
  const openModalForType = (id: string) => { setEditingEntry(null); setPresetType(id); setModalOpen(true) }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pt-6">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-foreground flex items-center justify-center gap-2">
          <Brain className="h-8 w-8 text-violet-500" />
          Neuro / Neuromuscular
        </h1>
        <p className="text-muted-foreground mt-1">Weakness, numbness, foot drop, falls, balance, vision, tremor, spasticity, fasciculations, speech/swallow, sensory episodes — MS &amp; neuromuscular friendly</p>
      </div>

      {/* 🚨 Collapsible emergency criteria — auto-re-expands on recent emergency markers */}
      <EmergencyCriteriaCard
        storageKey="neuro-911-acknowledged"
        criteria={RED_FLAG_911_CRITERIA}
        footerNote="Sudden one-sided weakness, facial droop, or slurred speech = stroke until proven otherwise. Note the time it started and call 911."
        recentEmergencyDetected={(() => {
          const now = new Date()
          return entries.some(e => {
            try {
              if (differenceInDays(now, new Date(e.date)) > 30) return false
              return !!e.erVisitRequired
            } catch { return false }
          })
        })()}
      />

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="episodes" className="flex items-center gap-2"><Plus className="h-4 w-4" /> Add Event</TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2"><History className="h-4 w-4" /> History</TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="episodes" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Button variant="outline" size="sm" onClick={goToPreviousDay}>←</Button>
                <div className="text-center">
                  <span className="text-lg font-medium">{format(new Date(selectedDate + 'T12:00:00'), 'EEEE, MMMM d, yyyy')}</span>
                  {selectedDate !== format(new Date(), 'yyyy-MM-dd') && <Button variant="link" size="sm" onClick={goToToday} className="ml-2">Today</Button>}
                </div>
                <Button variant="outline" size="sm" onClick={goToNextDay}>→</Button>
              </div>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">Log a Neuro Event</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {EPISODE_TYPES.map(t => (
                  <Button key={t.id} variant="outline" className="h-auto py-3 flex flex-col items-start text-left" onClick={() => openModalForType(t.id)}>
                    <span className="text-xl mb-1">{t.icon}</span>
                    <span className="font-semibold text-sm">{t.name}</span>
                    <span className="text-xs mt-1 text-left">{t.description}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {todaysEntries.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-lg">Today's Events ({todaysEntries.length})</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {todaysEntries.map(entry => {
                  const info = getEpisodeTypeInfo(entry.episodeType)
                  return (
                    <Card key={entry.id} className="bg-muted/30">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="text-lg">{info.icon}</span>
                              <span className="font-semibold">{info.name}</span>
                              {entry.distribution && entry.distribution.length > 0 && <Badge variant="outline">{entry.distribution.slice(0, 2).join(', ')}{entry.distribution.length > 2 ? '...' : ''}</Badge>}
                              {isCrossListed(entry) && <Badge variant="outline" className="border-primary/50 text-primary">⇄ MSK</Badge>}
                              {entry.erVisitRequired && <Badge variant="destructive">ER</Badge>}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(entry.timestamp), 'h:mm a')}
                              {entry.severity && ` • Severity ${entry.severity}/10`}
                            </div>
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
                {RELATED_TRACKERS.map(t => (
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
          <NeuroHistory onEdit={handleEditEntry} onDelete={handleDeleteEntry} refreshTrigger={refreshTrigger} />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <NeuroAnalytics refreshTrigger={refreshTrigger} />
        </TabsContent>
      </Tabs>

      <GeneralNeuroModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingEntry(null); setPresetType(null) }}
        onSave={editingEntry ? handleUpdateEntry : handleSaveEntry}
        editingEntry={editingEntry}
        presetType={presetType}
      />
    </div>
  )
}
