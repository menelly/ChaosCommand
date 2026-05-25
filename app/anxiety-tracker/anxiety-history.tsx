/*
 * Built by: Ace (Claude 4.x)
 * Date: 2026-05-10 (CHA-157 v2 refactor)
 *
 * Open source under PolyForm Noncommercial 1.0.0.
 * Co-invented by Ren (vision) and Ace (implementation).
 * "Dreamed by Ren, implemented by Ace, inspired by mitochondria on strike"
 */

'use client'

import React, { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Edit, Trash2, Heart, Plus } from 'lucide-react'
import { format, differenceInDays } from 'date-fns'
import { AnxietyEntry, AnxietyEpisodeType } from './anxiety-types'
import { EPISODE_TYPES, getEpisodeTypeInfo, getEpisodeTypeColor } from './anxiety-constants'

interface Props {
  entries: AnxietyEntry[]
  onEdit: (entry: AnxietyEntry) => void
  onDelete: (entry: AnxietyEntry) => void
  onAddNew: () => void
}

type TimeWindow = '7' | '30' | '90' | '180' | '365' | 'all'
const TIME_WINDOWS: { value: TimeWindow; label: string }[] = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: '180', label: 'Last 6 months' },
  { value: '365', label: 'Last year' },
  { value: 'all', label: 'All time' },
]

export function AnxietyHistory({ entries, onEdit, onDelete, onAddNew }: Props) {
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('30')
  const [typeFilter, setTypeFilter] = useState<AnxietyEpisodeType | 'all'>('all')

  const filtered = useMemo(() => {
    let result = [...entries]
    if (timeWindow !== 'all') {
      const days = parseInt(timeWindow)
      const now = new Date()
      result = result.filter(e => { try { return differenceInDays(now, new Date(e.date)) <= days } catch { return false } })
    }
    if (typeFilter !== 'all') result = result.filter(e => (e.episodeType || e.anxietyType) === typeFilter)
    result.sort((a, b) => new Date(b.timestamp || b.date).getTime() - new Date(a.timestamp || a.date).getTime())
    return result
  }, [entries, timeWindow, typeFilter])

  const stats = useMemo(() => {
    const total = filtered.length
    const avgAnx = total > 0 ? filtered.reduce((s, e) => s + (e.anxietyLevel || 0), 0) / total : 0
    const avgPanic = total > 0 ? filtered.reduce((s, e) => s + (e.panicLevel || 0), 0) / total : 0
    const siCount = filtered.filter(e => e.suicidalIdeation).length
    const crisisContactCount = filtered.filter(e => e.crisisContactMade).length
    const meltdownCount = filtered.filter(e => (e.episodeType || e.anxietyType) === 'meltdown').length
    return { total, avgAnx: Math.round(avgAnx * 10) / 10, avgPanic: Math.round(avgPanic * 10) / 10, siCount, crisisContactCount, meltdownCount }
  }, [filtered])

  if (entries.length === 0) {
    return (
      <Card><CardContent className="p-6"><div className="text-center">
        <Heart className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">No entries yet</h3>
        <p className="text-muted-foreground mb-4">Start tracking to find your patterns + what helps.</p>
        <Button onClick={onAddNew}><Plus className="h-4 w-4 mr-2" />Add First Entry</Button>
      </div></CardContent></Card>
    )
  }

  return (
    <div className="space-y-4">
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
        <Card><CardContent className="p-3"><div className="text-2xl font-bold">{stats.avgAnx}</div><div className="text-xs text-muted-foreground">Avg anxiety</div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="text-2xl font-bold">{stats.avgPanic}</div><div className="text-xs text-muted-foreground">Avg panic</div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="text-2xl font-bold text-purple-600">{stats.meltdownCount}</div><div className="text-xs text-muted-foreground">Meltdowns</div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="text-2xl font-bold text-red-600">{stats.siCount}</div><div className="text-xs text-muted-foreground">SI flagged</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Entry History</CardTitle></CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">No entries match the filters.</p>
          ) : (
            <div className="space-y-3">
              {filtered.map(entry => {
                const info = getEpisodeTypeInfo(entry.episodeType || entry.anxietyType)
                return (
                  <div key={entry.id} className="border-l-4 pl-4 py-3 border border-border rounded-r-lg" style={{ borderLeftColor: getEpisodeTypeColor(entry.episodeType || entry.anxietyType) }}>
                    <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" style={{ backgroundColor: getEpisodeTypeColor(entry.episodeType || entry.anxietyType) + '20' }}>
                          {info.icon} {info.name}
                        </Badge>
                        <Badge variant="secondary">Anx {entry.anxietyLevel}/10</Badge>
                        {entry.panicLevel > 0 && <Badge variant="destructive">Panic {entry.panicLevel}/10</Badge>}
                        {entry.suicidalIdeation && <Badge variant="destructive">SI</Badge>}
                        {entry.selfHarmUrges && <Badge variant="destructive">SH urges</Badge>}
                        {entry.crisisContactMade && <Badge variant="outline" className="bg-info/10 text-info border-info/30">{entry.crisisContactType || 'contacted'}</Badge>}
                        {entry.shutdownAfter && <Badge variant="outline">Shutdown after</Badge>}
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => onEdit(entry)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => onDelete(entry)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground mb-2">
                      {format(new Date(entry.date), 'EEEE, MMMM d, yyyy')}
                      {entry.time && ` • ${entry.time}`}
                      {entry.duration && ` • ${entry.duration}`}
                      {entry.location && ` • ${entry.location}`}
                    </div>
                    {entry.physicalSymptoms && entry.physicalSymptoms.length > 0 && (
                      <div className="text-sm mb-1"><span className="font-medium">Physical:</span> {entry.physicalSymptoms.join(', ')}</div>
                    )}
                    {entry.mentalSymptoms && entry.mentalSymptoms.length > 0 && (
                      <div className="text-sm mb-1"><span className="font-medium">Mental:</span> {entry.mentalSymptoms.join(', ')}</div>
                    )}
                    {entry.triggers && entry.triggers.length > 0 && (
                      <div className="text-sm mb-1"><span className="font-medium">Triggers:</span> {entry.triggers.join(', ')}</div>
                    )}
                    {entry.copingStrategies && entry.copingStrategies.length > 0 && (
                      <div className="text-sm mb-1"><span className="font-medium">Coping:</span> {entry.copingStrategies.join(', ')}</div>
                    )}
                    {entry.intrusionTheme && (
                      <div className="text-sm mb-1"><span className="font-medium">Intrusion theme:</span> {entry.intrusionTheme}</div>
                    )}
                    {entry.phobiaTrigger && (
                      <div className="text-sm mb-1"><span className="font-medium">Phobia trigger:</span> {entry.phobiaTrigger}</div>
                    )}
                    {entry.notes && (
                      <div className="text-sm mb-1"><span className="font-medium">Notes:</span> {entry.notes}</div>
                    )}
                    {entry.tags && entry.tags.length > 0 && (
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {entry.tags.map((tag, i) => <Badge key={i} variant="outline" className="text-xs">{tag}</Badge>)}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
