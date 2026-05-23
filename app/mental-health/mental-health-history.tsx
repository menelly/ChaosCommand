/*
 * Built by: Ace (Claude 4.x)
 * Date: 2026-05-10 (CHA-158 v0.4.5 — Mind & Mood)
 *
 * Open source under PolyForm Noncommercial 1.0.0.
 * Co-invented by Ren (vision) and Ace (implementation).
 */

'use client'

import React, { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Edit, Trash2, Heart, Plus } from 'lucide-react'
import { format, differenceInDays } from 'date-fns'
import { MentalHealthEntry, MindMoodEpisodeType } from './mental-health-types'
import { EPISODE_TYPES, getEpisodeTypeInfo, getEpisodeTypeColor, MOOD_OPTIONS } from './mental-health-constants'

interface Props {
  entries: MentalHealthEntry[]
  onEdit: (entry: MentalHealthEntry) => void
  onDelete: (entry: MentalHealthEntry) => void
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

export function MindMoodHistory({ entries, onEdit, onDelete, onAddNew }: Props) {
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('30')
  const [typeFilter, setTypeFilter] = useState<MindMoodEpisodeType | 'all'>('all')

  const filtered = useMemo(() => {
    let result = [...entries]
    if (timeWindow !== 'all') {
      const days = parseInt(timeWindow)
      const now = new Date()
      result = result.filter(e => { try { return differenceInDays(now, new Date(e.date)) <= days } catch { return false } })
    }
    if (typeFilter !== 'all') result = result.filter(e => (e.episodeType || 'general') === typeFilter)
    result.sort((a, b) => new Date(b.timestamp || b.date).getTime() - new Date(a.timestamp || a.date).getTime())
    return result
  }, [entries, timeWindow, typeFilter])

  const stats = useMemo(() => {
    const total = filtered.length
    const avgDep = total > 0 ? filtered.reduce((s, e) => s + (e.depressionLevel || 0), 0) / total : 0
    const avgMania = total > 0 ? filtered.reduce((s, e) => s + (e.maniaLevel || 0), 0) / total : 0
    const avgEnergy = total > 0 ? filtered.reduce((s, e) => s + (e.energyLevel || 0), 0) / total : 0
    const meltdownCount = filtered.filter(e => e.meltdownOccurred).length
    const rapidCyclingCount = filtered.filter(e => e.moodSwingDirection === 'rapid-cycling').length
    return {
      total,
      avgDep: Math.round(avgDep * 10) / 10,
      avgMania: Math.round(avgMania * 10) / 10,
      avgEnergy: Math.round(avgEnergy * 10) / 10,
      meltdownCount, rapidCyclingCount,
    }
  }, [filtered])

  if (entries.length === 0) {
    return (
      <Card><CardContent className="p-6"><div className="text-center">
        <Heart className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">No check-ins yet</h3>
        <p className="text-muted-foreground mb-4">Track to find your patterns over time.</p>
        <Button onClick={onAddNew}><Plus className="h-4 w-4 mr-2" />Add First Check-in</Button>
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
        <Card><CardContent className="p-3"><div className="text-2xl font-bold">{stats.total}</div><div className="text-xs text-muted-foreground">Check-ins</div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="text-2xl font-bold">{stats.avgDep}</div><div className="text-xs text-muted-foreground">Avg dep</div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="text-2xl font-bold">{stats.avgMania}</div><div className="text-xs text-muted-foreground">Avg mania</div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="text-2xl font-bold">{stats.avgEnergy}</div><div className="text-xs text-muted-foreground">Avg energy</div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="text-2xl font-bold text-purple-600">{stats.meltdownCount}</div><div className="text-xs text-muted-foreground">Meltdowns</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Check-in History</CardTitle></CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">No check-ins match the filters.</p>
          ) : (
            <div className="space-y-3">
              {filtered.map(entry => {
                const info = getEpisodeTypeInfo(entry.episodeType)
                const moodInfo = MOOD_OPTIONS.find(m => m.value === entry.mood)
                return (
                  <div key={entry.id} className="border-l-4 pl-4 py-3 border border-border rounded-r-lg" style={{ borderLeftColor: getEpisodeTypeColor(entry.episodeType) }}>
                    <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" style={{ backgroundColor: getEpisodeTypeColor(entry.episodeType) + '20' }}>
                          {info.icon} {info.name}
                        </Badge>
                        {moodInfo && <Badge variant="outline">{moodInfo.emoji} {moodInfo.label}</Badge>}
                        {entry.depressionLevel >= 7 && <Badge variant="destructive">Dep {entry.depressionLevel}</Badge>}
                        {entry.maniaLevel >= 7 && <Badge variant="destructive">Mania {entry.maniaLevel}</Badge>}
                        {entry.moodSwingDirection === 'rapid-cycling' && <Badge variant="destructive">Rapid cycling</Badge>}
                        {entry.meltdownOccurred && <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300">Meltdown</Badge>}
                        {entry.brainFogSeverity >= 6 && <Badge variant="outline">Brain fog {entry.brainFogSeverity}</Badge>}
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => onEdit(entry)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => onDelete(entry)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground mb-2">
                      {format(new Date(entry.date), 'EEEE, MMMM d, yyyy')}{entry.time && ` • ${entry.time}`}
                    </div>
                    {entry.cognitiveDomains && entry.cognitiveDomains.length > 0 && (
                      <div className="text-sm mb-1"><span className="font-medium">Cognitive:</span> {entry.cognitiveDomains.join(', ')}</div>
                    )}
                    {entry.emotionalState && entry.emotionalState.length > 0 && (
                      <div className="text-sm mb-1"><span className="font-medium">Emotions:</span> {entry.emotionalState.join(', ')}</div>
                    )}
                    {entry.triggers && entry.triggers.length > 0 && (
                      <div className="text-sm mb-1"><span className="font-medium">Triggers:</span> {entry.triggers.join(', ')}</div>
                    )}
                    {entry.copingStrategies && entry.copingStrategies.length > 0 && (
                      <div className="text-sm mb-1"><span className="font-medium">Coping:</span> {entry.copingStrategies.join(', ')}</div>
                    )}
                    {entry.therapyNotes && (
                      <div className="text-sm mb-1"><span className="font-medium">Therapy:</span> {entry.therapyNotes}</div>
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
