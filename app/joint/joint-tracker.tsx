/* Built by: Ace (Claude 4.x) — 2026-05-10 */

'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Bone, BarChart3, History, Plus, ExternalLink } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'
import { format, addDays, subDays } from 'date-fns'
import { useDailyData, CATEGORIES } from '@/lib/database'
import { celebrate } from '@/lib/particle-physics-engine'
import { useUser } from '@/lib/contexts/user-context'
import { isCelebrationEnabled } from '@/lib/celebration-prefs'

import { JointEntry } from './joint-types'
import { EPISODE_TYPES, RELATED_TRACKERS, getEpisodeTypeInfo } from './joint-constants'
import { JointHistory } from './joint-history'
import { JointAnalytics } from './joint-analytics'
import { GeneralJointModal } from './modals/general-joint-modal'

export default function JointTracker() {
  const { saveData, getCategoryData } = useDailyData()
  const { userPin } = useUser()
  const { toast } = useToast()
  const router = useRouter()

  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [entries, setEntries] = useState<JointEntry[]>([])
  const [activeTab, setActiveTab] = useState<'episodes' | 'history' | 'analytics'>('episodes')
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<JointEntry | null>(null)
  const [presetType, setPresetType] = useState<string | null>(null)

  useEffect(() => { load() }, [selectedDate, refreshTrigger])

  const load = async () => {
    try {
      const records = await getCategoryData(selectedDate, CATEGORIES.TRACKER)
      const record = records.find(r => r.subcategory === 'joint')
      if (record?.content?.entries) {
        let loaded = record.content.entries
        if (typeof loaded === 'string') { try { loaded = JSON.parse(loaded) } catch { loaded = [] } }
        setEntries(loaded)
      } else { setEntries([]) }
    } catch (e) { console.error(e); toast({ title: 'Loading Error', variant: 'destructive' }) }
  }

  const saveEntries = async (next: JointEntry[]) => {
    try { await saveData(selectedDate, CATEGORIES.TRACKER, 'joint', { entries: next }); setEntries(next) }
    catch (e) { console.error(e); toast({ title: 'Save Error', variant: 'destructive' }) }
  }

  const handleSaveEntry = async (data: Omit<JointEntry, 'id'>) => {
    const { timestamp: ts, date: d, ...rest } = data
    const newEntry: JointEntry = { id: Date.now().toString(), timestamp: ts || new Date().toISOString(), date: d || selectedDate, ...rest }
    await saveEntries([...entries, newEntry])
    if ((localStorage.getItem('chaos-confetti-level') || 'medium') !== 'none' && isCelebrationEnabled('joint', userPin ?? '')) celebrate()
    setModalOpen(false); setEditingEntry(null); setPresetType(null); setRefreshTrigger(p => p + 1)
    const info = getEpisodeTypeInfo(data.episodeType)
    toast({ title: `${info.icon} Event Saved`, description: `${info.name} recorded` })
  }

  const handleEditEntry = (e: JointEntry) => { setEditingEntry(e); setPresetType(null); setModalOpen(true) }

  const handleUpdateEntry = async (data: Omit<JointEntry, 'id'>) => {
    if (!editingEntry) return
    const updated: JointEntry = { ...editingEntry, ...data, id: editingEntry.id }
    await saveEntries(entries.map(e => e.id === editingEntry.id ? updated : e))
    setModalOpen(false); setEditingEntry(null); setPresetType(null); setRefreshTrigger(p => p + 1)
    toast({ title: 'Event Updated' })
  }

  const handleDeleteEntry = async (e: JointEntry) => { await saveEntries(entries.filter(x => x.id !== e.id)); setRefreshTrigger(p => p + 1); toast({ title: 'Event Deleted' }) }

  const goToPreviousDay = () => setSelectedDate(p => format(subDays(new Date(p + 'T12:00:00'), 1), 'yyyy-MM-dd'))
  const goToNextDay = () => setSelectedDate(p => format(addDays(new Date(p + 'T12:00:00'), 1), 'yyyy-MM-dd'))
  const goToToday = () => setSelectedDate(format(new Date(), 'yyyy-MM-dd'))

  const todaysEntries = entries.filter(e => e.date === selectedDate)
  const openModalForType = (id: string) => { setEditingEntry(null); setPresetType(id); setModalOpen(true) }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pt-6">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-foreground flex items-center justify-center gap-2">
          <Bone className="h-8 w-8 text-amber-500" />
          🦴 Joint Shenanigans
        </h1>
        <p className="text-muted-foreground mt-1">Subluxations, dislocations, pain, swelling, instability, weakness, cramping, fasciculations, the "massage therapists quit" kind of tightness — EDS + neuropathy + myopathy friendly logging</p>
      </div>

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
            <CardHeader><CardTitle className="text-lg">Which joint is misbehaving?</CardTitle></CardHeader>
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
                              {entry.jointAffected && entry.jointAffected.length > 0 && <Badge variant="outline">{entry.jointAffected.slice(0, 2).join(', ')}{entry.jointAffected.length > 2 ? '...' : ''}</Badge>}
                              {entry.attachmentImages && entry.attachmentImages.length > 0 && <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-300">📎 {entry.attachmentImages.length}</Badge>}
                              {entry.selfReducedFlag && <Badge variant="secondary">Self-reduced</Badge>}
                              {entry.erVisitRequired && <Badge variant="destructive">ER</Badge>}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(entry.timestamp), 'h:mm a')}
                              {entry.severity && ` • Severity ${entry.severity}/10`}
                              {entry.romImpactedPercent !== undefined && ` • ROM ${entry.romImpactedPercent}%`}
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
          <JointHistory onEdit={handleEditEntry} onDelete={handleDeleteEntry} refreshTrigger={refreshTrigger} />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <JointAnalytics refreshTrigger={refreshTrigger} />
        </TabsContent>
      </Tabs>

      <GeneralJointModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingEntry(null); setPresetType(null) }}
        onSave={editingEntry ? handleUpdateEntry : handleSaveEntry}
        editingEntry={editingEntry}
        presetType={presetType}
      />
    </div>
  )
}
