/* Built by: Ace (Claude 4.x) — 2026-05-10. Neutral tone — no moralizing. */

'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Coffee, BarChart3, History, Plus, ExternalLink } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'
import { format, addDays, subDays } from 'date-fns'
import { useDailyData, CATEGORIES } from '@/lib/database'
import { celebrate } from '@/lib/particle-physics-engine'
import { useUser } from '@/lib/contexts/user-context'
import { isCelebrationEnabled } from '@/lib/celebration-prefs'

import { SubstanceEntry } from './substance-types'
import { SUBSTANCE_TYPES, RELATED_TRACKERS, getSubstanceTypeInfo } from './substance-constants'
import { SubstanceHistory } from './substance-history'
import { SubstanceAnalytics } from './substance-analytics'
import { GeneralSubstanceModal } from './modals/general-substance-modal'

export default function SubstanceTracker() {
  const { saveData, getCategoryData } = useDailyData()
  const { userPin } = useUser()
  const { toast } = useToast()
  const router = useRouter()

  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [entries, setEntries] = useState<SubstanceEntry[]>([])
  const [activeTab, setActiveTab] = useState<'episodes' | 'history' | 'analytics'>('episodes')
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<SubstanceEntry | null>(null)
  const [presetType, setPresetType] = useState<string | null>(null)

  useEffect(() => { load() }, [selectedDate, refreshTrigger])

  const load = async () => {
    try {
      const records = await getCategoryData(selectedDate, CATEGORIES.TRACKER)
      const record = records.find(r => r.subcategory === 'substance')
      if (record?.content?.entries) {
        let loaded = record.content.entries
        if (typeof loaded === 'string') { try { loaded = JSON.parse(loaded) } catch { loaded = [] } }
        setEntries(loaded)
      } else { setEntries([]) }
    } catch (e) { console.error(e); toast({ title: 'Loading Error', variant: 'destructive' }) }
  }

  const saveEntries = async (next: SubstanceEntry[]) => {
    try { await saveData(selectedDate, CATEGORIES.TRACKER, 'substance', { entries: next }); setEntries(next) }
    catch (e) { console.error(e); toast({ title: 'Save Error', variant: 'destructive' }) }
  }

  const handleSaveEntry = async (data: Omit<SubstanceEntry, 'id'>) => {
    const { timestamp: ts, date: d, ...rest } = data
    const newEntry: SubstanceEntry = { id: Date.now().toString(), timestamp: ts || new Date().toISOString(), date: d || selectedDate, ...rest }
    await saveEntries([...entries, newEntry])
    if ((localStorage.getItem('chaos-confetti-level') || 'medium') !== 'none' && isCelebrationEnabled('substance', userPin ?? '')) celebrate()
    setModalOpen(false); setEditingEntry(null); setPresetType(null); setRefreshTrigger(p => p + 1)
    const info = getSubstanceTypeInfo(data.substanceType)
    toast({ title: `${info.icon} Logged`, description: data.substanceName || info.name })
  }

  const handleEditEntry = (e: SubstanceEntry) => { setEditingEntry(e); setPresetType(null); setModalOpen(true) }

  const handleUpdateEntry = async (data: Omit<SubstanceEntry, 'id'>) => {
    if (!editingEntry) return
    const updated: SubstanceEntry = { ...editingEntry, ...data, id: editingEntry.id }
    await saveEntries(entries.map(e => e.id === editingEntry.id ? updated : e))
    setModalOpen(false); setEditingEntry(null); setPresetType(null); setRefreshTrigger(p => p + 1)
    toast({ title: 'Entry Updated' })
  }

  const handleDeleteEntry = async (e: SubstanceEntry) => { await saveEntries(entries.filter(x => x.id !== e.id)); setRefreshTrigger(p => p + 1); toast({ title: 'Entry Deleted' }) }

  const goToPreviousDay = () => setSelectedDate(p => format(subDays(new Date(p + 'T12:00:00'), 1), 'yyyy-MM-dd'))
  const goToNextDay = () => setSelectedDate(p => format(addDays(new Date(p + 'T12:00:00'), 1), 'yyyy-MM-dd'))
  const goToToday = () => setSelectedDate(format(new Date(), 'yyyy-MM-dd'))

  const todaysEntries = entries.filter(e => e.date === selectedDate)
  const openModalForType = (id: string) => { setEditingEntry(null); setPresetType(id); setModalOpen(true) }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pt-6">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-foreground flex items-center justify-center gap-2">
          <Coffee className="h-8 w-8 text-purple-500" />
          Substance Use
        </h1>
        <p className="text-muted-foreground mt-1">Neutral logging for alcohol, cannabis, tobacco, recreational, and off-label medication use</p>
      </div>

      {/* Categorization help — what belongs here vs other trackers */}
      <Card className="bg-muted/30 border-dashed">
        <CardContent className="pt-4 pb-4 text-sm text-muted-foreground">
          <p className="font-medium mb-2">📌 What belongs here?</p>
          <ul className="space-y-1 ml-4 list-disc">
            <li><strong>Caffeine</strong> (coffee, tea, soda, energy drinks) → log in <a href="/hydration" className="text-purple-600 underline">Hydration</a> with the beverage type</li>
            <li><strong>Prescribed medications taken as directed</strong> → log in <a href="/medications" className="text-purple-600 underline">Medications</a> (under Manage)</li>
            <li><strong>Off-label medication use</strong> (extra dose, different route, someone else's prescription) → use this tracker, "Recreational / Off-Label"</li>
            <li><strong>Alcohol, cannabis, tobacco, recreational</strong> → use this tracker</li>
          </ul>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="episodes" className="flex items-center gap-2"><Plus className="h-4 w-4" /> Add Entry</TabsTrigger>
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
            <CardHeader><CardTitle className="text-lg">Log a Substance</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {SUBSTANCE_TYPES.map(t => (
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
              <CardHeader><CardTitle className="text-lg">Today's Entries ({todaysEntries.length})</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {todaysEntries.map(entry => {
                  const info = getSubstanceTypeInfo(entry.substanceType)
                  return (
                    <Card key={entry.id} className="bg-muted/30">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="text-lg">{info.icon}</span>
                              <span className="font-semibold">{entry.substanceName || info.name}</span>
                              {entry.amount && entry.unit && <Badge variant="outline">{entry.amount} {entry.unit}</Badge>}
                              {entry.attachmentImages && entry.attachmentImages.length > 0 && <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-300">📎 {entry.attachmentImages.length}</Badge>}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(entry.timestamp), 'h:mm a')}
                              {entry.methodOfUse && ` • ${entry.methodOfUse}`}
                              {entry.effectIntensity && ` • Effect ${entry.effectIntensity}/10`}
                            </div>
                            {entry.contextWhy && entry.contextWhy.length > 0 && <div className="text-xs mt-1 text-muted-foreground"><strong>Why:</strong> {entry.contextWhy.join(', ')}</div>}
                            {entry.effectsExperienced && entry.effectsExperienced.length > 0 && <div className="text-xs mt-1 text-muted-foreground"><strong>Effects:</strong> {entry.effectsExperienced.slice(0, 5).join(', ')}{entry.effectsExperienced.length > 5 && '...'}</div>}
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
          <SubstanceHistory onEdit={handleEditEntry} onDelete={handleDeleteEntry} refreshTrigger={refreshTrigger} />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <SubstanceAnalytics refreshTrigger={refreshTrigger} />
        </TabsContent>
      </Tabs>

      <GeneralSubstanceModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingEntry(null); setPresetType(null) }}
        onSave={editingEntry ? handleUpdateEntry : handleSaveEntry}
        editingEntry={editingEntry}
        presetType={presetType}
      />
    </div>
  )
}
