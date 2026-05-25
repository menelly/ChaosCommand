/*
 * Built by: Ace (Claude 4.x)
 * Date: 2026-05-10 (CHA-155 v2 refactor)
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
import { Edit, Trash2, AlertTriangle, Plus, Brain } from 'lucide-react'
import { format, differenceInDays } from 'date-fns'
import { HeadPainEntry, HeadPainEpisodeType } from './head-pain-types'
import { EPISODE_TYPES, getEpisodeTypeInfo, getEpisodeTypeColor, getGremlinEmoji } from './head-pain-constants'

interface Props {
  entries: HeadPainEntry[]
  onEdit: (entry: HeadPainEntry) => void
  onDelete: (entry: HeadPainEntry) => void
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

export function HeadPainHistory({ entries, onEdit, onDelete, onAddNew }: Props) {
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('30')
  const [typeFilter, setTypeFilter] = useState<HeadPainEpisodeType | 'all'>('all')

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
    const avg = total > 0 ? filtered.reduce((s, e) => s + (e.painIntensity || 0), 0) / total : 0
    const peak = total > 0 ? Math.max(...filtered.map(e => e.painIntensity || 0)) : 0
    const auraCount = filtered.filter(e => e.auraPresent).length
    const erCount = filtered.filter(e => e.erVisitRequired).length
    const flagsCount = filtered.filter(e =>
      e.worstHeadacheOfLife || e.thunderclapOnset || e.focalNeuroDeficit ||
      e.oneSidedWeakness || e.speechDifficulty || (e.neckStiffness && e.fever)
    ).length
    return { total, avg: Math.round(avg * 10) / 10, peak, auraCount, erCount, flagsCount }
  }, [filtered])

  if (entries.length === 0) {
    return (
      <Card><CardContent className="p-6"><div className="text-center">
        <Brain className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">No head pain episodes yet</h3>
        <p className="text-muted-foreground mb-4">Start tracking to spot triggers + treatment patterns.</p>
        <Button onClick={onAddNew}><Plus className="h-4 w-4 mr-2" />Add First Episode</Button>
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
        <Card><CardContent className="p-3"><div className="text-2xl font-bold">{stats.total}</div><div className="text-xs text-muted-foreground">Episodes</div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="text-2xl font-bold">{stats.avg}</div><div className="text-xs text-muted-foreground">Avg level</div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="text-2xl font-bold text-red-600">{stats.peak}</div><div className="text-xs text-muted-foreground">Peak</div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="text-2xl font-bold text-purple-600">{stats.auraCount}</div><div className="text-xs text-muted-foreground">With aura</div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="text-2xl font-bold text-amber-600">{stats.flagsCount}</div><div className="text-xs text-muted-foreground">Red flags</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Episode History</CardTitle></CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">No episodes match the filters.</p>
          ) : (
            <div className="space-y-3">
              {filtered.map(entry => {
                const info = getEpisodeTypeInfo(entry.episodeType)
                const delta = entry.baselineHeadachePain !== undefined
                  ? (entry.painIntensity || 0) - entry.baselineHeadachePain
                  : null
                return (
                  <div key={entry.id} className="border-l-4 pl-4 py-3 border border-border rounded-r-lg" style={{ borderLeftColor: getEpisodeTypeColor(entry.episodeType) }}>
                    <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" style={{ backgroundColor: getEpisodeTypeColor(entry.episodeType) + '20' }}>
                          {info.icon} {info.name}
                        </Badge>
                        <Badge variant="destructive">{getGremlinEmoji(entry.painIntensity || 0)} {entry.painIntensity}/10</Badge>
                        {delta !== null && delta > 0 && <Badge variant="outline">+{delta} flare</Badge>}
                        {entry.auraPresent && <Badge variant="outline" className="bg-info/10 text-info border-info/30">Aura</Badge>}
                        {entry.rescueRedosed && <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">Multi-rescue</Badge>}
                        {entry.worstHeadacheOfLife && <Badge variant="destructive">WHOL</Badge>}
                        {entry.thunderclapOnset && <Badge variant="destructive">Thunderclap</Badge>}
                        {entry.focalNeuroDeficit && <Badge variant="destructive">Focal deficit</Badge>}
                        {entry.erVisitRequired && <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />ER</Badge>}
                        {entry.attachmentImages && entry.attachmentImages.length > 0 && (
                          <Badge variant="outline" className="bg-info/10 text-info border-info/30">📎 {entry.attachmentImages.length}</Badge>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => onEdit(entry)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => onDelete(entry)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground mb-2">
                      {format(new Date(entry.date), 'EEEE, MMMM d, yyyy')}
                      {entry.timestamp && ` • ${format(new Date(entry.timestamp), 'h:mm a')}`}
                      {entry.duration && ` • ${entry.duration}`}
                    </div>
                    {entry.painLocation && entry.painLocation.length > 0 && (
                      <div className="text-sm mb-1"><span className="font-medium">Location:</span> {entry.painLocation.join(', ')}</div>
                    )}
                    {entry.painType && entry.painType.length > 0 && (
                      <div className="text-sm mb-1"><span className="font-medium">Type:</span> {entry.painType.join(', ')}</div>
                    )}
                    {entry.auraPresent && entry.auraSymptoms && entry.auraSymptoms.length > 0 && (
                      <div className="text-sm mb-1"><span className="font-medium">Aura:</span> {entry.auraSymptoms.join(', ')}{entry.auraDurationMinutes ? ` (${entry.auraDurationMinutes} min)` : ''}</div>
                    )}
                    {entry.associatedSymptoms && entry.associatedSymptoms.length > 0 && (
                      <div className="text-sm mb-1"><span className="font-medium">Associated:</span> {entry.associatedSymptoms.join(', ')}</div>
                    )}
                    {entry.triggers && entry.triggers.length > 0 && (
                      <div className="text-sm mb-1"><span className="font-medium">Triggers:</span> {entry.triggers.join(', ')}</div>
                    )}
                    {entry.treatments && entry.treatments.length > 0 && (
                      <div className="text-sm mb-1"><span className="font-medium">Treatments:</span> {entry.treatments.join(', ')}</div>
                    )}
                    {typeof entry.treatmentEffectiveness === 'number' && entry.treatmentEffectiveness > 0 && (
                      <div className="text-sm mb-1"><span className="font-medium">Effectiveness:</span> {entry.treatmentEffectiveness}/10</div>
                    )}
                    {entry.flareLikelyTrigger && (
                      <div className="text-sm mb-1"><span className="font-medium">Suspected flare trigger:</span> {entry.flareLikelyTrigger}</div>
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
