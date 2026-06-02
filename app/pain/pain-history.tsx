/*
 * Built by: Ace (Claude 4.x)
 * Date: 2026-05-10 (CHA-154 v2 refactor)
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
import { Edit, Trash2, AlertTriangle, Plus, Flame } from 'lucide-react'
import { format, differenceInDays } from 'date-fns'
import { PainEntry, PainEpisodeType } from './pain-types'
import { EPISODE_TYPES, getEpisodeTypeInfo, getEpisodeTypeColor, getGremlinEmoji } from './pain-constants'

interface Props {
  entries: PainEntry[]
  onEdit: (entry: PainEntry) => void
  onDelete: (entry: PainEntry) => void
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

export function PainHistory({ entries, onEdit, onDelete, onAddNew }: Props) {
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('30')
  const [typeFilter, setTypeFilter] = useState<PainEpisodeType | 'all'>('all')
  const [minLevel, setMinLevel] = useState<string>('all')

  const filtered = useMemo(() => {
    let result = [...entries]
    if (timeWindow !== 'all') {
      const days = parseInt(timeWindow)
      const now = new Date()
      result = result.filter(e => {
        try { return differenceInDays(now, new Date(e.date)) <= days } catch { return false }
      })
    }
    if (typeFilter !== 'all') result = result.filter(e => e.episodeType === typeFilter)
    if (minLevel !== 'all') {
      const min = parseInt(minLevel)
      result = result.filter(e => (e.painLevel || 0) >= min)
    }
    result.sort((a, b) => {
      const ta = new Date(a.timestamp || a.date).getTime()
      const tb = new Date(b.timestamp || b.date).getTime()
      return tb - ta
    })
    return result
  }, [entries, timeWindow, typeFilter, minLevel])

  const stats = useMemo(() => {
    const total = filtered.length
    const avg = total > 0 ? filtered.reduce((s, e) => s + (e.painLevel || 0), 0) / total : 0
    const peak = total > 0 ? Math.max(...filtered.map(e => e.painLevel || 0)) : 0
    const erCount = filtered.filter(e => e.erVisitRequired).length
    const flagsCount = filtered.filter(e =>
      e.tearingQuality || e.thunderclapPattern || e.legWeakness ||
      e.bowelBladderChanges || e.saddleAnesthesia || e.pulsatileMass
    ).length
    return { total, avg: Math.round(avg * 10) / 10, peak, erCount, flagsCount }
  }, [filtered])

  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <Flame className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No pain episodes yet</h3>
            <p className="text-muted-foreground mb-4">Start tracking to spot patterns.</p>
            <Button onClick={onAddNew}><Plus className="h-4 w-4 mr-2" />Add First Episode</Button>
          </div>
        </CardContent>
      </Card>
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
                <SelectContent>
                  {TIME_WINDOWS.map(w => <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>)}
                </SelectContent>
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
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Min severity</label>
              <Select value={minLevel} onValueChange={setMinLevel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All levels</SelectItem>
                  <SelectItem value="4">≥ 4 (moderate)</SelectItem>
                  <SelectItem value="7">≥ 7 (severe)</SelectItem>
                  <SelectItem value="9">≥ 9 (extreme)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card><CardContent className="p-3"><div className="text-2xl font-bold">{stats.total}</div><div className="text-xs text-muted-foreground">Episodes</div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="text-2xl font-bold">{stats.avg}</div><div className="text-xs text-muted-foreground">Avg level</div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="text-2xl font-bold text-destructive">{stats.peak}</div><div className="text-xs text-muted-foreground">Peak level</div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="text-2xl font-bold text-amber-600">{stats.flagsCount}</div><div className="text-xs text-muted-foreground">Red flags</div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="text-2xl font-bold">{stats.erCount}</div><div className="text-xs text-muted-foreground">ER visits</div></CardContent></Card>
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
                return (
                  <div
                    key={entry.id}
                    className="border-l-4 pl-4 py-3 border border-border rounded-r-lg"
                    style={{ borderLeftColor: getEpisodeTypeColor(entry.episodeType) }}
                  >
                    <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" style={{ backgroundColor: getEpisodeTypeColor(entry.episodeType) + '20' }}>
                          {info.icon} {info.name}
                        </Badge>
                        <Badge variant="destructive">{getGremlinEmoji(entry.painLevel || 0)} {entry.painLevel}/10</Badge>
                        {entry.tearingQuality && <Badge variant="destructive">Tearing</Badge>}
                        {entry.thunderclapPattern && <Badge variant="destructive">Thunderclap</Badge>}
                        {entry.legWeakness && <Badge variant="destructive">Leg weakness</Badge>}
                        {entry.bowelBladderChanges && <Badge variant="destructive">Bowel/bladder</Badge>}
                        {entry.pulsatileMass && <Badge variant="destructive">Pulsatile mass</Badge>}
                        {entry.erVisitRequired && <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />ER</Badge>}
                        {entry.attachmentImages && entry.attachmentImages.length > 0 && (
                          <Badge variant="outline" className="bg-info/10 text-info border-info/30">
                            📎 {entry.attachmentImages.length}
                          </Badge>
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
                    </div>

                    {entry.painLocations && entry.painLocations.length > 0 && (
                      <div className="text-sm mb-1"><span className="font-medium">Locations:</span> {entry.painLocations.join(', ')}</div>
                    )}
                    {entry.painCharacter && entry.painCharacter.length > 0 && (
                      <div className="text-sm mb-1"><span className="font-medium">Character:</span> {entry.painCharacter.join(', ')}</div>
                    )}
                    {entry.painPattern && entry.painPattern.length > 0 && (
                      <div className="text-sm mb-1"><span className="font-medium">Pattern:</span> {entry.painPattern.join(', ')}</div>
                    )}
                    {entry.radiatesTo && entry.radiatesTo.length > 0 && (
                      <div className="text-sm mb-1"><span className="font-medium">Radiates:</span> {entry.radiatesTo.join(', ')}</div>
                    )}
                    {entry.triggers && entry.triggers.length > 0 && (
                      <div className="text-sm mb-1"><span className="font-medium">Triggers:</span> {entry.triggers.join(', ')}</div>
                    )}
                    {entry.activityAtOnset && (
                      <div className="text-sm mb-1"><span className="font-medium">Activity at onset:</span> {entry.activityAtOnset}</div>
                    )}
                    {entry.treatments && entry.treatments.length > 0 && (
                      <div className="text-sm mb-1"><span className="font-medium">Treatments:</span> {entry.treatments.join(', ')}</div>
                    )}
                    {entry.medications && entry.medications.length > 0 && (
                      <div className="text-sm mb-1"><span className="font-medium">Meds:</span> {entry.medications.join(', ')}</div>
                    )}
                    {typeof entry.effectiveness === 'number' && entry.effectiveness > 0 && (
                      <div className="text-sm mb-1"><span className="font-medium">Effectiveness:</span> {entry.effectiveness}/10</div>
                    )}
                    {entry.episodeType === 'post-surgical' && entry.daysPostSurgery !== undefined && (
                      <div className="text-sm mb-1"><span className="font-medium">Day {entry.daysPostSurgery} post-op</span>{entry.surgeryType && ` — ${entry.surgeryType}`}</div>
                    )}
                    {entry.episodeType === 'chronic-flare' && entry.baselinePainLevel !== undefined && (
                      <div className="text-sm mb-1"><span className="font-medium">Baseline:</span> {entry.baselinePainLevel}/10 (flare delta: +{(entry.painLevel || 0) - entry.baselinePainLevel})</div>
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
