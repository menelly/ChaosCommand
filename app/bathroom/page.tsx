/*
 * Built by: Ace (Claude 4.x)
 * Date: 2026-05-10 (v0.4.5 — Tier 2 multi-modal)
 *
 * Open source under PolyForm Noncommercial 1.0.0.
 * Co-invented by Ren (vision) and Ace (implementation).
 */

'use client'

import React, { useState, useEffect, useMemo } from 'react'
import AppCanvas from '@/components/app-canvas'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Droplet, ArrowLeft, BarChart3, History, ExternalLink, Edit, Trash2, AlertTriangle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format, differenceInDays } from 'date-fns'

import { BathroomEntry, BathroomEpisodeType } from './bathroom-types'
import {
  EPISODE_TYPES, RELATED_TRACKERS, getEpisodeTypeInfo, getEpisodeTypeColor,
  RED_FLAG_911_CRITERIA, BATHROOM_GOBLINISMS,
} from './bathroom-constants'
import { GeneralBathroomModal } from './modals/general-bathroom-modal'
import { EmergencyCriteriaCard } from '@/components/emergency-criteria-card'
import { useDailyData, CATEGORIES, formatDateForStorage } from '@/lib/database'
import { celebrate } from '@/lib/particle-physics-engine'
import { useUser } from '@/lib/contexts/user-context'
import { isCelebrationEnabled } from '@/lib/celebration-prefs'

type TimeWindow = '7' | '30' | '90' | '180' | '365' | 'all'
const TIME_WINDOWS: { value: TimeWindow; label: string }[] = [
  { value: '7', label: 'Last 7 days' }, { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' }, { value: '180', label: 'Last 6 months' },
  { value: '365', label: 'Last year' }, { value: 'all', label: 'All time' },
]

export default function BathroomPage() {
  const { saveData, getDateRange, isLoading } = useDailyData()
  const { userPin } = useUser()
  const { toast } = useToast()
  const router = useRouter()

  const [entries, setEntries] = useState<BathroomEntry[]>([])
  const [activeTab, setActiveTab] = useState<'add' | 'history' | 'analytics'>('add')
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [activeModal, setActiveModal] = useState<string | null>(null)
  const [initialEpisodeType, setInitialEpisodeType] = useState<BathroomEpisodeType | undefined>(undefined)
  const [editingEntry, setEditingEntry] = useState<BathroomEntry | null>(null)
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('30')
  const [typeFilter, setTypeFilter] = useState<BathroomEpisodeType | 'all'>('all')

  useEffect(() => { loadEntries() }, [refreshTrigger])

  const loadEntries = async () => {
    try {
      const today = formatDateForStorage(new Date())
      const allRecords = await getDateRange('2000-01-01', today, CATEGORIES.TRACKER)
      const records = allRecords.filter(r => r.subcategory === 'bathroom')
      const all: BathroomEntry[] = []
      for (const data of records) {
        if (data?.content?.entries) {
          let parsed = data.content.entries
          if (typeof parsed === 'string') { try { parsed = JSON.parse(parsed) } catch { parsed = [] } }
          if (!Array.isArray(parsed)) parsed = [parsed]
          for (const e of parsed) {
            if (e && typeof e === 'object') {
              if (!e.episodeType) {
                // Migrate legacy: status string → episodeType
                const s = (e.status || '').toLowerCase()
                if (s.includes("didn't go") || s.includes("painful") || s.includes("strained")) e.episodeType = 'constipation'
                else if (s.includes("normal")) e.episodeType = 'normal-bm'
                else if (s.includes("too much")) e.episodeType = 'diarrhea'
                else e.episodeType = 'general'
              }
              if (!e.date) e.date = data.date
              all.push(e)
            }
          }
        }
      }
      setEntries(all)
    } catch (err) {
      console.error('Bathroom load fail:', err)
      toast({ title: 'Loading Error', variant: 'destructive' })
    }
  }

  const handleSaveEntry = async (entryData: Omit<BathroomEntry, 'id'>) => {
    try {
      const newEntry: BathroomEntry = {
        id: `bathroom-${Date.now()}`,
        ...entryData,
        date: entryData.date || formatDateForStorage(new Date()),
      }
      const storageDate = newEntry.date
      const existingForDate = entries.filter(e => e.date === storageDate)
      const updatedForDate = [...existingForDate, newEntry]
      await saveData(storageDate, CATEGORIES.TRACKER, 'bathroom', { entries: updatedForDate }, newEntry.tags || [])
      const confettiLevel = localStorage.getItem('chaos-confetti-level') || 'medium'
      if (confettiLevel !== 'none' && isCelebrationEnabled('bathroom', userPin ?? '')) celebrate()
      const goblinism = BATHROOM_GOBLINISMS[Math.floor(Date.now() / 1000) % BATHROOM_GOBLINISMS.length]
      toast({ title: '🚽 Logged', description: goblinism })
      setActiveModal(null); setEditingEntry(null); setInitialEpisodeType(undefined)
      setRefreshTrigger(t => t + 1)
    } catch (err) { console.error(err); toast({ title: 'Save Error', variant: 'destructive' }) }
  }

  const handleUpdateEntry = async (entryData: Omit<BathroomEntry, 'id'>) => {
    if (!editingEntry) return
    try {
      const updated: BathroomEntry = { ...editingEntry, ...entryData, id: editingEntry.id }
      const oldDate = editingEntry.date
      const newDate = updated.date
      if (oldDate !== newDate) {
        const oldBucket = entries.filter(e => e.date === oldDate && e.id !== editingEntry.id)
        const newBucket = [...entries.filter(e => e.date === newDate), updated]
        await saveData(oldDate, CATEGORIES.TRACKER, 'bathroom', { entries: oldBucket })
        await saveData(newDate, CATEGORIES.TRACKER, 'bathroom', { entries: newBucket }, updated.tags || [])
      } else {
        const bucket = entries.filter(e => e.date === oldDate).map(e => e.id === editingEntry.id ? updated : e)
        await saveData(oldDate, CATEGORIES.TRACKER, 'bathroom', { entries: bucket }, updated.tags || [])
      }
      toast({ title: 'Updated' })
      setActiveModal(null); setEditingEntry(null)
      setRefreshTrigger(t => t + 1)
    } catch (err) { console.error(err); toast({ title: 'Update Error', variant: 'destructive' }) }
  }

  const handleDeleteEntry = async (entry: BathroomEntry) => {
    try {
      const bucket = entries.filter(e => e.date === entry.date && e.id !== entry.id)
      await saveData(entry.date, CATEGORIES.TRACKER, 'bathroom', { entries: bucket })
      toast({ title: 'Deleted' })
      setRefreshTrigger(t => t + 1)
    } catch (err) { console.error(err); toast({ title: 'Delete Error', variant: 'destructive' }) }
  }

  const handleEditEntry = (entry: BathroomEntry) => {
    setEditingEntry(entry); setInitialEpisodeType(entry.episodeType); setActiveModal('general')
  }

  const openModalForType = (id: BathroomEpisodeType) => {
    setEditingEntry(null); setInitialEpisodeType(id); setActiveModal('general')
  }

  const filtered = useMemo(() => {
    let result = [...entries]
    if (timeWindow !== 'all') {
      const days = parseInt(timeWindow)
      const now = new Date()
      result = result.filter(e => { try { return differenceInDays(now, new Date(e.date)) <= days } catch { return false } })
    }
    if (typeFilter !== 'all') result = result.filter(e => e.episodeType === typeFilter)
    result.sort((a, b) => new Date(b.timestamp || b.date).getTime() - new Date(a.timestamp || a.date).getTime())
    return result
  }, [entries, timeWindow, typeFilter])

  const stats = useMemo(() => {
    const total = filtered.length
    const typeCount: Record<string, number> = {}
    filtered.forEach(e => { typeCount[e.episodeType] = (typeCount[e.episodeType] || 0) + 1 })
    const constipationCount = typeCount['constipation'] || 0
    const diarrheaCount = typeCount['diarrhea'] || 0
    const urinaryCount = typeCount['urinary'] || 0
    const redFlagCount = typeCount['blood-or-red-flag'] || 0
    const erCount = filtered.filter(e => e.erVisitRequired).length
    const bloodEvents = filtered.filter(e => e.bloodInStool || e.bloodInUrine).length

    // Bristol distribution
    const bristolCount: Record<string, number> = {}
    filtered.forEach(e => { if (e.bristolScale) bristolCount[e.bristolScale] = (bristolCount[e.bristolScale] || 0) + 1 })

    // Top triggers
    const trigCount: Record<string, number> = {}
    filtered.forEach(e => (e.triggers || []).forEach(t => { trigCount[t] = (trigCount[t] || 0) + 1 }))
    const topTriggers = Object.entries(trigCount).sort((a, b) => b[1] - a[1]).slice(0, 6)

    return { total, typeCount, constipationCount, diarrheaCount, urinaryCount, redFlagCount, erCount, bloodEvents, bristolCount, topTriggers }
  }, [filtered])

  if (isLoading) {
    return (
      <AppCanvas currentPage="bathroom">
        <div className="container mx-auto p-4">
          <Card><CardContent className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading...</p>
          </CardContent></Card>
        </div>
      </AppCanvas>
    )
  }

  const todayStr = formatDateForStorage(new Date())
  const todaysEntries = entries.filter(e => e.date === todayStr)

  return (
    <AppCanvas currentPage="bathroom">
      <div className="max-w-4xl mx-auto space-y-6 pt-6">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-foreground flex items-center justify-center gap-2">
            <Droplet className="h-8 w-8 text-amber-600" />
            Bathroom Tracker
          </h1>
          <p className="text-muted-foreground mt-1">Bowel + urinary patterns with red-flag detection</p>
        </div>

        <EmergencyCriteriaCard
          storageKey="bathroom-911-acknowledged"
          criteria={RED_FLAG_911_CRITERIA}
          footerNote="Bowel/urinary red flags are easy to dismiss but matter. When in doubt, get evaluated."
          recentEmergencyDetected={(() => {
            const now = new Date()
            return entries.some(e => {
              try {
                if (differenceInDays(now, new Date(e.date)) > 30) return false
                return !!(
                  e.erVisitRequired || e.emergencyServicesCalled ||
                  e.bloodColor === 'black-tarry' ||
                  (e.feverWithUrinary && e.flankPain) ||
                  (e.cantPassGas && e.vomiting) ||
                  e.episodeType === 'blood-or-red-flag'
                )
              } catch { return false }
            })
          })()}
        />

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="add"><Plus className="h-4 w-4 mr-1" /> Log</TabsTrigger>
            <TabsTrigger value="history"><History className="h-4 w-4 mr-1" /> History</TabsTrigger>
            <TabsTrigger value="analytics"><BarChart3 className="h-4 w-4 mr-1" /> Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="add" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Log a bathroom event</CardTitle>
                <CardDescription>Pick the closest type — adjustable inside.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {EPISODE_TYPES.map((type) => (
                    <Button key={type.id} variant="outline" className="h-auto py-3 flex flex-col items-start text-left whitespace-normal" onClick={() => openModalForType(type.id)}>
                      <span className="text-xl mb-1">{type.icon}</span>
                      <span className="font-semibold text-sm">{type.name}</span>
                      <span className="text-xs text-muted-foreground mt-1 text-left">{type.description}</span>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {todaysEntries.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-lg">Today ({todaysEntries.length})</CardTitle></CardHeader>
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
                                {entry.bristolScale && <Badge variant="outline">Bristol {entry.bristolScale}</Badge>}
                                {entry.bloodInStool && <Badge variant="destructive">🩸 Stool</Badge>}
                                {entry.bloodInUrine && <Badge variant="destructive">🩸 Urine</Badge>}
                                {entry.erVisitRequired && <Badge variant="destructive">ER</Badge>}
                              </div>
                              <div className="text-xs text-muted-foreground">{entry.time}</div>
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
            <Card>
              <CardContent className="pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Time window</label>
                    <Select value={timeWindow} onValueChange={(v) => setTimeWindow(v as TimeWindow)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{TIME_WINDOWS.map(w => <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Episode type</label>
                    <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All types</SelectItem>
                        {EPISODE_TYPES.map(t => <SelectItem key={t.id} value={t.id}>{t.icon} {t.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <Card><CardContent className="p-3"><div className="text-2xl font-bold">{stats.total}</div><div className="text-xs text-muted-foreground">Entries</div></CardContent></Card>
              <Card><CardContent className="p-3"><div className="text-2xl font-bold text-amber-600">{stats.constipationCount}</div><div className="text-xs text-muted-foreground">Constipation</div></CardContent></Card>
              <Card><CardContent className="p-3"><div className="text-2xl font-bold text-blue-600">{stats.diarrheaCount}</div><div className="text-xs text-muted-foreground">Diarrhea</div></CardContent></Card>
              <Card><CardContent className="p-3"><div className="text-2xl font-bold">{stats.urinaryCount}</div><div className="text-xs text-muted-foreground">Urinary</div></CardContent></Card>
              <Card><CardContent className="p-3"><div className="text-2xl font-bold text-red-600">{stats.bloodEvents}</div><div className="text-xs text-muted-foreground">Blood events</div></CardContent></Card>
            </div>

            <Card>
              <CardHeader><CardTitle>History</CardTitle></CardHeader>
              <CardContent>
                {filtered.length === 0 ? (
                  <p className="text-center text-muted-foreground py-6">No entries match the filters.</p>
                ) : (
                  <div className="space-y-3">
                    {filtered.map(entry => {
                      const info = getEpisodeTypeInfo(entry.episodeType)
                      return (
                        <div key={entry.id} className="border-l-4 pl-4 py-3 border border-border rounded-r-lg" style={{ borderLeftColor: getEpisodeTypeColor(entry.episodeType) }}>
                          <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="secondary" style={{ backgroundColor: getEpisodeTypeColor(entry.episodeType) + '20' }}>{info.icon} {info.name}</Badge>
                              {entry.bristolScale && <Badge variant="outline">Bristol {entry.bristolScale}</Badge>}
                              {entry.bowelCount && entry.bowelCount > 1 && <Badge variant="outline">×{entry.bowelCount}</Badge>}
                              {entry.bloodInStool && <Badge variant="destructive">🩸 Stool</Badge>}
                              {entry.bloodInUrine && <Badge variant="destructive">🩸 Urine</Badge>}
                              {entry.erVisitRequired && <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />ER</Badge>}
                            </div>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" onClick={() => handleEditEntry(entry)}><Edit className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDeleteEntry(entry)}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          </div>
                          <div className="text-sm text-muted-foreground mb-2">
                            {format(new Date(entry.date), 'EEEE, MMMM d, yyyy')}{entry.time && ` • ${entry.time}`}
                          </div>
                          {entry.urinaryType && entry.urinaryType !== 'normal' && (
                            <div className="text-sm mb-1"><span className="font-medium">Urinary:</span> {entry.urinaryType}{entry.feverWithUrinary && ' + fever'}{entry.flankPain && ' + flank pain'}</div>
                          )}
                          {entry.triggers && entry.triggers.length > 0 && (
                            <div className="text-sm mb-1"><span className="font-medium">Triggers:</span> {entry.triggers.join(', ')}</div>
                          )}
                          {entry.notes && <div className="text-sm mb-1"><span className="font-medium">Notes:</span> {entry.notes}</div>}
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <Card>
              <CardContent className="pt-4">
                <Select value={timeWindow} onValueChange={(v) => setTimeWindow(v as TimeWindow)}>
                  <SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{TIME_WINDOWS.map(w => <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>)}</SelectContent>
                </Select>
              </CardContent>
            </Card>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card><CardContent className="p-3"><div className="text-2xl font-bold">{stats.total}</div><div className="text-xs text-muted-foreground">Entries</div></CardContent></Card>
              <Card><CardContent className="p-3"><div className="text-2xl font-bold text-amber-600">{stats.constipationCount}</div><div className="text-xs text-muted-foreground">Constipation</div></CardContent></Card>
              <Card><CardContent className="p-3"><div className="text-2xl font-bold text-blue-600">{stats.diarrheaCount}</div><div className="text-xs text-muted-foreground">Diarrhea</div></CardContent></Card>
              <Card><CardContent className="p-3"><div className="text-2xl font-bold">{stats.urinaryCount}</div><div className="text-xs text-muted-foreground">Urinary</div></CardContent></Card>
              <Card><CardContent className="p-3"><div className="text-2xl font-bold text-red-600">{stats.redFlagCount}</div><div className="text-xs text-muted-foreground">Red flag</div></CardContent></Card>
              <Card><CardContent className="p-3"><div className="text-2xl font-bold">{stats.erCount}</div><div className="text-xs text-muted-foreground">ER visits</div></CardContent></Card>
            </div>
            {Object.keys(stats.bristolCount).length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base">Bristol scale distribution</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-1 text-sm">
                    {[1,2,3,4,5,6,7].map(t => stats.bristolCount[t.toString()] ? (
                      <div key={t} className="flex items-center justify-between"><span>Type {t}</span><Badge variant="secondary">{stats.bristolCount[t.toString()]}</Badge></div>
                    ) : null)}
                  </div>
                </CardContent>
              </Card>
            )}
            {stats.topTriggers.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base">Top triggers</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {stats.topTriggers.map(([t, n]) => (
                      <div key={t} className="flex items-center justify-between text-sm"><span>{t}</span><Badge variant="secondary">{n}</Badge></div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        <GeneralBathroomModal
          isOpen={activeModal === 'general'}
          onClose={() => { setActiveModal(null); setEditingEntry(null); setInitialEpisodeType(undefined) }}
          onSave={editingEntry ? handleUpdateEntry : handleSaveEntry}
          editingEntry={editingEntry}
          initialEpisodeType={initialEpisodeType}
        />

        <div className="flex justify-center pt-4">
          <Button variant="outline" asChild>
            <Link href="/body"><ArrowLeft className="h-4 w-4 mr-2" />Back to Body</Link>
          </Button>
        </div>
      </div>
    </AppCanvas>
  )
}
