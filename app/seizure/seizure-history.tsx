/*
 * Built by: Ace (Claude 4.x)
 * Date: 2026-05-10 (CHA-153 v2 refactor)
 *
 * Open source under PolyForm Noncommercial 1.0.0.
 * Co-invented by Ren (vision) and Ace (implementation).
 * "Dreamed by Ren, implemented by Ace, inspired by mitochondria on strike"
 */

/**
 * SEIZURE HISTORY (v2)
 * Time-window selector + episode-type filter + grouped list with badges.
 */

'use client'

import React, { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Edit, Trash2, AlertTriangle, Shield, Plus } from 'lucide-react'
import { format, differenceInDays } from 'date-fns'
import { SeizureEntry, SeizureEpisodeType } from './seizure-types'
import { EPISODE_TYPES, getEpisodeTypeInfo, getEpisodeTypeColor, getSeverityLevel } from './seizure-constants'

interface SeizureHistoryProps {
  entries: SeizureEntry[]
  onEdit: (entry: SeizureEntry) => void
  onDelete: (entry: SeizureEntry) => void
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

export function SeizureHistory({ entries, onEdit, onDelete, onAddNew }: SeizureHistoryProps) {
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('90')
  const [typeFilter, setTypeFilter] = useState<SeizureEpisodeType | 'all'>('all')

  const filtered = useMemo(() => {
    let result = [...entries]
    // Time-window filter
    if (timeWindow !== 'all') {
      const days = parseInt(timeWindow)
      const now = new Date()
      result = result.filter(e => {
        try {
          const d = new Date(e.date)
          return differenceInDays(now, d) <= days
        } catch { return false }
      })
    }
    // Type filter
    if (typeFilter !== 'all') {
      result = result.filter(e => e.episodeType === typeFilter)
    }
    // Sort newest first
    result.sort((a, b) => new Date(b.timestamp || b.date).getTime() - new Date(a.timestamp || a.date).getTime())
    return result
  }, [entries, timeWindow, typeFilter])

  // Summary stats for the visible window
  const stats = useMemo(() => {
    const total = filtered.length
    const statusEpisCount = filtered.filter(e => e.statusEpilepticus).length
    const rescueMedCount = filtered.filter(e => e.rescueMedicationUsed).length
    const injuryCount = filtered.filter(e => e.injuriesOccurred).length
    const erVisits = filtered.filter(e => e.injuryRequiredER || e.emergencyServicesCalled).length
    const injuryRate = total > 0 ? Math.round((injuryCount / total) * 100) : 0

    const typeCount: Record<string, number> = {}
    filtered.forEach(e => { typeCount[e.episodeType] = (typeCount[e.episodeType] || 0) + 1 })
    const mostCommonType = Object.keys(typeCount).reduce(
      (a, b) => typeCount[a] > typeCount[b] ? a : b,
      Object.keys(typeCount)[0] || 'general'
    )

    return { total, statusEpisCount, rescueMedCount, injuryCount, erVisits, injuryRate, mostCommonType, typeCount }
  }, [filtered])

  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No seizures recorded yet</h3>
            <p className="text-muted-foreground mb-4">Start tracking to build a medical history.</p>
            <Button onClick={onAddNew}><Plus className="h-4 w-4 mr-2" />Add First Seizure</Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                  {EPISODE_TYPES.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.icon} {t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card><CardContent className="p-3"><div className="text-2xl font-bold">{stats.total}</div><div className="text-xs text-muted-foreground">Episodes</div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="text-2xl font-bold text-destructive">{stats.statusEpisCount}</div><div className="text-xs text-muted-foreground">Status epi.</div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="text-2xl font-bold text-amber-600">{stats.rescueMedCount}</div><div className="text-xs text-muted-foreground">Rescue med</div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="text-2xl font-bold">{stats.injuryRate}%</div><div className="text-xs text-muted-foreground">Injury rate</div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="text-2xl font-bold">{stats.erVisits}</div><div className="text-xs text-muted-foreground">ER / EMS</div></CardContent></Card>
      </div>

      {/* Most common type */}
      {stats.total > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <div className="text-xs text-muted-foreground">Most common type</div>
                <div className="font-medium">{getEpisodeTypeInfo(stats.mostCommonType).icon} {getEpisodeTypeInfo(stats.mostCommonType).name}</div>
              </div>
              <Badge variant="secondary" style={{ backgroundColor: getEpisodeTypeColor(stats.mostCommonType) + '20' }}>
                {stats.typeCount[stats.mostCommonType]} episodes
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* List */}
      <Card>
        <CardHeader><CardTitle>Episode History</CardTitle></CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">No episodes in selected window.</p>
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
                        {(entry.durationMinutes || entry.durationCategory) && (
                          <Badge variant="outline">
                            {entry.durationMinutes ? `${entry.durationMinutes} min` : entry.durationCategory}
                          </Badge>
                        )}
                        <Badge variant="outline">{getSeverityLevel(entry)}</Badge>
                        {entry.statusEpilepticus && <Badge variant="destructive">Status epi.</Badge>}
                        {entry.rescueMedicationUsed && (
                          <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">Rescue med</Badge>
                        )}
                        {entry.injuriesOccurred && (
                          <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Injury</Badge>
                        )}
                        {entry.emergencyServicesCalled && (
                          <Badge variant="destructive">EMS</Badge>
                        )}
                        {entry.attachmentImages && entry.attachmentImages.length > 0 && (
                          <Badge variant="outline" className="bg-info/10 text-info border-info/30">
                            📎 {entry.attachmentImages.length}
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => onEdit(entry)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => onDelete(entry)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="text-sm text-muted-foreground mb-2">
                      {format(new Date(entry.date), 'EEEE, MMMM d, yyyy')}
                      {entry.timestamp && ` • ${format(new Date(entry.timestamp), 'h:mm a')}`}
                      {entry.location && ` • ${entry.location}`}
                      {entry.witnessPresent && ' • Witness present'}
                    </div>

                    {entry.auraPresent && entry.auraSymptoms && entry.auraSymptoms.length > 0 && (
                      <div className="text-sm mb-1">
                        <span className="font-medium">Aura:</span> {entry.auraSymptoms.join(', ')}
                      </div>
                    )}
                    {entry.symptoms && entry.symptoms.length > 0 && (
                      <div className="text-sm mb-1">
                        <span className="font-medium">Symptoms:</span> {entry.symptoms.join(', ')}
                      </div>
                    )}
                    {entry.postSeizureSymptoms && entry.postSeizureSymptoms.length > 0 && (
                      <div className="text-sm mb-1">
                        <span className="font-medium">Postictal:</span> {entry.postSeizureSymptoms.join(', ')}
                      </div>
                    )}
                    {entry.triggers && entry.triggers.length > 0 && (
                      <div className="text-sm mb-1">
                        <span className="font-medium">Triggers:</span> {entry.triggers.join(', ')}
                      </div>
                    )}
                    {entry.recoveryTime && (
                      <div className="text-sm mb-1"><span className="font-medium">Recovery:</span> {entry.recoveryTime}</div>
                    )}
                    {entry.rescueMedicationUsed && (
                      <div className="text-sm mb-1 text-warning">
                        <span className="font-medium">Rescue med:</span>{' '}
                        {entry.rescueMedicationDetails || 'used'}
                      </div>
                    )}
                    {entry.medicationMissed && (
                      <div className="text-sm mb-1 text-destructive">
                        <span className="font-medium">⚠ AED missed:</span>{' '}
                        {entry.missedMedicationDetails || 'yes'}
                      </div>
                    )}
                    {entry.injuryDetails && (
                      <div className="text-sm mb-1 text-destructive">
                        <span className="font-medium">Injury:</span> {entry.injuryDetails}
                        {entry.injuryRequiredER && ' (ER)'}
                      </div>
                    )}
                    {entry.notes && (
                      <div className="text-sm mb-1"><span className="font-medium">Notes:</span> {entry.notes}</div>
                    )}
                    {entry.tags && entry.tags.length > 0 && (
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {entry.tags.map((tag, i) => (
                          <Badge key={i} variant="outline" className="text-xs">{tag}</Badge>
                        ))}
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
