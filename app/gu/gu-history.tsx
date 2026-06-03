/*
 * Built by: Ace (Claude 4.x)
 * Date: 2026-06-02
 *
 * Co-invented by Ren (vision) and Ace (implementation)
 * This wasn't built with compliance. It was built with defiance.
 */

/**
 * GU HISTORY
 * Time-window selector + episode-type filter + left-border card list.
 * Uses getDateRange (NOT getCategoryData) to avoid the wrong-date bug.
 * Soft-delete on delete action.
 */

'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Edit, Trash2, Droplets, Plus } from 'lucide-react'
import { format, subDays, differenceInDays } from 'date-fns'
import { useToast } from '@/hooks/use-toast'

import type { GUEntry, GUEpisodeType } from './gu-types'
import { EPISODE_TYPES, GU_SUBCATEGORY, SEVERITY_LABELS } from './gu-constants'
import { useDailyData, CATEGORIES } from '@/lib/database'
import { getDB } from '@/lib/database/dexie-db'

interface GUHistoryProps {
  onEdit: (entry: GUEntry) => void
  onDelete: (entry: GUEntry) => void
  refreshTrigger: number
}

type TimeWindow = '7' | '30' | '90' | 'all'

const TIME_WINDOWS: { value: TimeWindow; label: string }[] = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: 'all', label: 'All time' },
]

export function GUHistory({ onEdit, onDelete, refreshTrigger }: GUHistoryProps) {
  const { getDateRange } = useDailyData()
  const { toast } = useToast()
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('30')
  const [typeFilter, setTypeFilter] = useState<GUEpisodeType | 'all'>('all')
  const [allEntries, setAllEntries] = useState<GUEntry[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadEntries()
  }, [timeWindow, refreshTrigger])

  const loadEntries = async () => {
    setLoading(true)
    try {
      const today = format(new Date(), 'yyyy-MM-dd')
      const startDate = timeWindow === 'all'
        ? '2000-01-01'
        : format(subDays(new Date(), parseInt(timeWindow)), 'yyyy-MM-dd')

      const records = await getDateRange(startDate, today, CATEGORIES.TRACKER)
      const guRecords = records.filter(r =>
        r.subcategory.startsWith(`${GU_SUBCATEGORY}-`) &&
        !r.metadata?.deleted_at
      )
      const loaded: GUEntry[] = guRecords.map(r => r.content as GUEntry)
      loaded.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      setAllEntries(loaded)
    } catch (error) {
      console.error('Error loading GU history:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (entry: GUEntry) => {
    try {
      const database = getDB()
      const record = await database.daily_data
        .where('subcategory')
        .equals(`${GU_SUBCATEGORY}-${entry.id}`)
        .first()

      if (record && record.id != null) {
        await database.daily_data.update(record.id, {
          metadata: {
            ...(record.metadata ?? {}),
            created_at: record.metadata?.created_at ?? new Date().toISOString(),
            updated_at: new Date().toISOString(),
            deleted_at: new Date().toISOString(),
          },
        })
      }

      onDelete(entry)
      toast({ title: 'Event Deleted', description: 'GU event removed' })
    } catch (error) {
      console.error('Error deleting GU entry:', error)
      toast({ title: 'Delete Error', description: 'Failed to delete GU event', variant: 'destructive' })
    }
  }

  const filtered = useMemo(() => {
    if (typeFilter === 'all') return allEntries
    return allEntries.filter(e => e.episodeType === typeFilter)
  }, [allEntries, typeFilter])

  // Summary stats
  const stats = useMemo(() => {
    const total = filtered.length
    const retentionCount = filtered.filter(e => e.retentionSuspected).length
    const infectionCount = filtered.filter(e => e.infectionSuspected || e.episodeType === 'infection').length
    const hematuriaCount = filtered.filter(e => e.bloodVisible).length
    const erCount = filtered.filter(e => e.erVisit).length
    const avgSeverity = total > 0
      ? Math.round(filtered.reduce((sum, e) => sum + e.severity, 0) / total * 10) / 10
      : 0
    return { total, retentionCount, infectionCount, hematuriaCount, erCount, avgSeverity }
  }, [filtered])

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-muted-foreground">Loading history…</CardContent>
      </Card>
    )
  }

  if (allEntries.length === 0 && timeWindow === 'all') {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <Droplets className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No GU events recorded yet</h3>
            <p className="text-muted-foreground mb-4">Start tracking to build a medical history.</p>
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
                  {TIME_WINDOWS.map(w => (
                    <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>
                  ))}
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

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Episodes</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="text-2xl font-bold text-destructive">{stats.retentionCount}</div>
            <div className="text-xs text-muted-foreground">Retention</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="text-2xl font-bold text-warning">{stats.infectionCount}</div>
            <div className="text-xs text-muted-foreground">Infections</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="text-2xl font-bold text-destructive">{stats.hematuriaCount}</div>
            <div className="text-xs text-muted-foreground">Hematuria</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="text-2xl font-bold">{stats.avgSeverity > 0 ? stats.avgSeverity : '—'}</div>
            <div className="text-xs text-muted-foreground">Avg severity</div>
          </CardContent>
        </Card>
      </div>

      {/* Episode list */}
      <Card>
        <CardHeader><CardTitle>Episode History</CardTitle></CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">No episodes in selected window.</p>
          ) : (
            <div className="space-y-3">
              {filtered.map(entry => {
                const info = EPISODE_TYPES.find(e => e.id === entry.episodeType)
                const severityLabel = SEVERITY_LABELS.find(s => s.level === entry.severity)
                // Left border color: destructive for safety-critical, warning for infection, primary otherwise
                const borderColor = (entry.retentionSuspected || entry.bloodVisible)
                  ? 'border-l-destructive'
                  : entry.infectionSuspected
                  ? 'border-l-warning'
                  : 'border-l-primary'

                return (
                  <div
                    key={entry.id}
                    className={`border-l-4 pl-4 py-3 border border-border rounded-r-lg ${borderColor}`}
                  >
                    <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary">
                          {info?.icon} {info?.name ?? entry.episodeType}
                        </Badge>
                        <Badge variant="outline" className={severityLabel?.color}>
                          Severity {entry.severity}/10
                        </Badge>
                        {entry.retentionSuspected && (
                          <Badge variant="destructive">⚠ Retention</Badge>
                        )}
                        {entry.bloodVisible && (
                          <Badge variant="destructive">🩸 Hematuria</Badge>
                        )}
                        {entry.infectionSuspected && (
                          <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
                            🦠 Infection
                          </Badge>
                        )}
                        {entry.erVisit && (
                          <Badge variant="destructive">ER</Badge>
                        )}
                        {entry.feverPresent && (
                          <Badge variant="destructive">Fever</Badge>
                        )}
                        {entry.flankPain && (
                          <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
                            Flank pain
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => onEdit(entry)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(entry)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="text-sm text-muted-foreground mb-2">
                      {format(new Date(entry.date), 'EEEE, MMMM d, yyyy')}
                      {entry.timestamp && ` • ${format(new Date(entry.timestamp), 'h:mm a')}`}
                    </div>

                    {entry.voidingSymptoms && entry.voidingSymptoms.length > 0 && (
                      <div className="text-sm mb-1">
                        <span className="font-medium">Voiding:</span>{' '}
                        {entry.voidingSymptoms.join(', ')}
                      </div>
                    )}
                    {entry.painLocations && entry.painLocations.length > 0 && (
                      <div className="text-sm mb-1">
                        <span className="font-medium">Pain locations:</span>{' '}
                        {entry.painLocations.join(', ')}
                        {entry.painSeverity && ` (${entry.painSeverity}/10)`}
                      </div>
                    )}
                    {entry.symptoms && entry.symptoms.length > 0 && (
                      <div className="text-sm mb-1">
                        <span className="font-medium">Symptoms:</span>{' '}
                        {entry.symptoms.join(', ')}
                      </div>
                    )}
                    {entry.antibioticStarted && (
                      <div className="text-sm mb-1 text-warning">
                        <span className="font-medium">Antibiotic:</span>{' '}
                        {entry.antibioticName || 'started'}
                      </div>
                    )}
                    {entry.retentionSuspected && entry.estimatedRetentionMl != null && (
                      <div className="text-sm mb-1 text-destructive">
                        <span className="font-medium">Estimated retention:</span>{' '}
                        {entry.estimatedRetentionMl} mL
                        {entry.cathedRequired && ' — cath required'}
                        {entry.cathedVolumeOut != null && ` (drained ${entry.cathedVolumeOut} mL)`}
                      </div>
                    )}
                    {entry.outputMl != null && (
                      <div className="text-sm mb-1">
                        <span className="font-medium">Output:</span> {entry.outputMl} mL
                        {entry.color && ` • ${entry.color}`}
                      </div>
                    )}
                    {entry.notes && (
                      <div className="text-sm mb-1">
                        <span className="font-medium">Notes:</span> {entry.notes}
                      </div>
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
