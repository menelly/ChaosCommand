/*
 * Built by: Ace (Claude 4.x)
 * Date: 2026-05-10 (CHA-156 v2 refactor)
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
import { Edit, Trash2, AlertTriangle, Plus, Utensils } from 'lucide-react'
import { format, differenceInDays } from 'date-fns'
import { FoodAllergenEntry, FoodReactionEpisodeType } from './food-allergens-types'
import { EPISODE_TYPES, getEpisodeTypeInfo, getEpisodeTypeColor } from './food-allergens-constants'

interface Props {
  entries: FoodAllergenEntry[]
  onEdit: (entry: FoodAllergenEntry) => void
  onDelete: (entry: FoodAllergenEntry) => void
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

export function FoodAllergensHistory({ entries, onEdit, onDelete, onAddNew }: Props) {
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('90')
  const [typeFilter, setTypeFilter] = useState<FoodReactionEpisodeType | 'all'>('all')
  const [allergenFilter, setAllergenFilter] = useState('')

  const filtered = useMemo(() => {
    let result = [...entries]
    if (timeWindow !== 'all') {
      const days = parseInt(timeWindow)
      const now = new Date()
      result = result.filter(e => { try { return differenceInDays(now, new Date(e.date || e.timestamp)) <= days } catch { return false } })
    }
    if (typeFilter !== 'all') result = result.filter(e => e.episodeType === typeFilter)
    if (allergenFilter.trim()) {
      const q = allergenFilter.trim().toLowerCase()
      result = result.filter(e => e.allergenName?.toLowerCase().includes(q))
    }
    result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    return result
  }, [entries, timeWindow, typeFilter, allergenFilter])

  const stats = useMemo(() => {
    const total = filtered.length
    const epipenCount = filtered.filter(e => e.epipenUsed).length
    const erCount = filtered.filter(e => e.erVisitRequired).length
    const anaphCount = filtered.filter(e => e.episodeType === 'severe-anaphylaxis').length
    const celiacCount = filtered.filter(e => e.episodeType === 'celiac-autoimmune').length
    return { total, epipenCount, erCount, anaphCount, celiacCount }
  }, [filtered])

  if (entries.length === 0) {
    return (
      <Card><CardContent className="p-6"><div className="text-center">
        <Utensils className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">No reactions logged yet</h3>
        <p className="text-muted-foreground mb-4">Track reactions to spot patterns + cross-contamination sources.</p>
        <Button onClick={onAddNew}><Plus className="h-4 w-4 mr-2" />Log First Reaction</Button>
      </div></CardContent></Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Time window</label>
              <Select value={timeWindow} onValueChange={(v) => setTimeWindow(v as TimeWindow)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TIME_WINDOWS.map(w => <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Reaction type</label>
              <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {EPISODE_TYPES.map(t => <SelectItem key={t.id} value={t.id}>{t.icon} {t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Filter by allergen</label>
              <input
                type="text"
                value={allergenFilter}
                onChange={(e) => setAllergenFilter(e.target.value)}
                placeholder="e.g., gluten"
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card><CardContent className="p-3"><div className="text-2xl font-bold">{stats.total}</div><div className="text-xs text-muted-foreground">Reactions</div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="text-2xl font-bold text-red-600">{stats.anaphCount}</div><div className="text-xs text-muted-foreground">Anaphylaxis</div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="text-2xl font-bold text-amber-600">{stats.epipenCount}</div><div className="text-xs text-muted-foreground">EpiPen</div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="text-2xl font-bold">{stats.erCount}</div><div className="text-xs text-muted-foreground">ER visits</div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="text-2xl font-bold text-amber-600">{stats.celiacCount}</div><div className="text-xs text-muted-foreground">Celiac flares</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Reaction History</CardTitle></CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">No reactions match the filters.</p>
          ) : (
            <div className="space-y-3">
              {filtered.map(entry => {
                const info = getEpisodeTypeInfo(entry.episodeType)
                return (
                  <div key={entry.id} className="border-l-4 pl-4 py-3 border border-border rounded-r-lg" style={{ borderLeftColor: getEpisodeTypeColor(entry.episodeType) }}>
                    <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" style={{ backgroundColor: getEpisodeTypeColor(entry.episodeType) + '20' }}>
                          {info.icon} {info.name}
                        </Badge>
                        <span className="font-medium">{entry.allergenName}</span>
                        {entry.epipenUsed && <Badge variant="destructive">EpiPen ×{entry.epipenDosesUsed || 1}</Badge>}
                        {entry.erVisitRequired && <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />ER</Badge>}
                        {entry.hospitalizedOvernight && <Badge variant="destructive">Hospitalized</Badge>}
                        {entry.delayedReaction && <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">Delayed +{entry.delayedReactionHours}h</Badge>}
                        {entry.knownAllergen && <Badge variant="outline">Known</Badge>}
                        {entry.attachmentImages && entry.attachmentImages.length > 0 && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">📎 {entry.attachmentImages.length}</Badge>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => onEdit(entry)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => onDelete(entry)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground mb-2">
                      {format(new Date(entry.date || entry.timestamp), 'EEEE, MMMM d, yyyy')}
                      {entry.timestamp && ` • ${format(new Date(entry.timestamp), 'h:mm a')}`}
                      {entry.exposureSource && ` • ${entry.exposureSource}`}
                    </div>
                    {entry.symptoms && entry.symptoms.length > 0 && (
                      <div className="text-sm mb-1"><span className="font-medium">Symptoms:</span> {entry.symptoms.join(', ')}</div>
                    )}
                    {entry.reactionTime && (
                      <div className="text-sm mb-1"><span className="font-medium">Onset:</span> {entry.reactionTime}</div>
                    )}
                    {entry.recoveryTime && (
                      <div className="text-sm mb-1"><span className="font-medium">Recovery:</span> {entry.recoveryTime}</div>
                    )}
                    {entry.treatmentGiven && entry.treatmentGiven.length > 0 && (
                      <div className="text-sm mb-1"><span className="font-medium">Treatment:</span> {entry.treatmentGiven.join(', ')}</div>
                    )}
                    {(entry.brainFogAfter || entry.jointPainAfter || entry.fatigueAfter || entry.moodChangesAfter) && (
                      <div className="text-sm mb-1 text-amber-700">
                        <span className="font-medium">Aftermath:</span>{' '}
                        {[
                          entry.brainFogAfter && 'brain fog',
                          entry.jointPainAfter && 'joint pain',
                          entry.fatigueAfter && 'fatigue',
                          entry.moodChangesAfter && 'mood changes',
                        ].filter(Boolean).join(', ')}
                      </div>
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
