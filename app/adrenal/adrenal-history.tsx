/*
 * Built by: Ace (Claude 4.x)
 * Date: 2026-06-04
 *
 * Co-invented by Ren (vision) and Ace (implementation)
 * This wasn't built with compliance. It was built with defiance.
 */

/**
 * ADRENAL HISTORY
 * Time-window selector + episode-type filter + left-border card list.
 * Uses getDateRange (NOT getCategoryData) to avoid the wrong-date bug.
 * Crisis-warning entries get a destructive left-border; stress-dose entries
 * are visually distinct. Soft-delete on delete action.
 */

'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Edit, Trash2, Flame } from 'lucide-react'
import { format, subDays } from 'date-fns'
import { useToast } from '@/hooks/use-toast'

import type { AdrenalEntry, AdrenalEpisodeType } from './adrenal-types'
import { EPISODE_TYPES, ADRENAL_SUBCATEGORY, SEVERITY_LABELS } from './adrenal-constants'
import { useDailyData, CATEGORIES } from '@/lib/database'
import { getDB } from '@/lib/database/dexie-db'

interface AdrenalHistoryProps {
  onEdit: (entry: AdrenalEntry) => void
  onDelete: (entry: AdrenalEntry) => void
  refreshTrigger: number
}

type TimeWindow = '7' | '30' | '90' | 'all'

const TIME_WINDOWS: { value: TimeWindow; label: string }[] = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: 'all', label: 'All time' },
]

function isCrisis(entry: AdrenalEntry): boolean {
  return !!(
    entry.vomiting ||
    entry.unableToKeepMedsDown ||
    entry.emergencyInjectionUsed ||
    (entry.severeWeakness && entry.confusion) ||
    entry.episodeType === 'crisis-warning'
  )
}

export function AdrenalHistory({ onEdit, onDelete, refreshTrigger }: AdrenalHistoryProps) {
  const { getDateRange } = useDailyData()
  const { toast } = useToast()
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('30')
  const [typeFilter, setTypeFilter] = useState<AdrenalEpisodeType | 'all'>('all')
  const [allEntries, setAllEntries] = useState<AdrenalEntry[]>([])
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
      const adrenalRecords = records.filter(r =>
        r.subcategory.startsWith(`${ADRENAL_SUBCATEGORY}-`) &&
        !r.metadata?.deleted_at
      )
      const loaded: AdrenalEntry[] = adrenalRecords.map(r => r.content as AdrenalEntry)
      loaded.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      setAllEntries(loaded)
    } catch (error) {
      console.error('Error loading adrenal history:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (entry: AdrenalEntry) => {
    try {
      const database = getDB()
      const record = await database.daily_data
        .where('subcategory')
        .equals(`${ADRENAL_SUBCATEGORY}-${entry.id}`)
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
      toast({ title: 'Event Deleted', description: 'Adrenal event removed' })
    } catch (error) {
      console.error('Error deleting adrenal entry:', error)
      toast({ title: 'Delete Error', description: 'Failed to delete adrenal event', variant: 'destructive' })
    }
  }

  const filtered = useMemo(() => {
    if (typeFilter === 'all') return allEntries
    return allEntries.filter(e => e.episodeType === typeFilter)
  }, [allEntries, typeFilter])

  // Summary stats
  const stats = useMemo(() => {
    const total = filtered.length
    const crisisCount = filtered.filter(isCrisis).length
    const stressDoseCount = filtered.filter(e => e.stressDoseGiven || e.episodeType === 'stress-dose').length
    const erCount = filtered.filter(e => e.erVisit).length
    const avgSeverity = total > 0
      ? Math.round(filtered.reduce((sum, e) => sum + e.severity, 0) / total * 10) / 10
      : 0
    return { total, crisisCount, stressDoseCount, erCount, avgSeverity }
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
            <Flame className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No adrenal events recorded yet</h3>
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
            <div className="text-2xl font-bold text-destructive">{stats.crisisCount}</div>
            <div className="text-xs text-muted-foreground">Crisis warnings</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="text-2xl font-bold text-warning">{stats.stressDoseCount}</div>
            <div className="text-xs text-muted-foreground">Stress doses</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="text-2xl font-bold text-destructive">{stats.erCount}</div>
            <div className="text-xs text-muted-foreground">ER visits</div>
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
                // Left border color: destructive for crisis, warning for stress-dose, primary otherwise
                const crisis = isCrisis(entry)
                const stressDose = entry.stressDoseGiven || entry.episodeType === 'stress-dose'
                const borderColor = crisis
                  ? 'border-l-destructive'
                  : stressDose
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
                        {crisis && (
                          <Badge variant="destructive">🚨 Crisis warning</Badge>
                        )}
                        {stressDose && (
                          <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
                            💉 Stress dose
                          </Badge>
                        )}
                        {entry.emergencyInjectionUsed && (
                          <Badge variant="destructive">Injection used</Badge>
                        )}
                        {entry.erVisit && (
                          <Badge variant="destructive">ER</Badge>
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

                    {entry.direction && (
                      <div className="text-sm mb-1">
                        <span className="font-medium">Direction:</span> {entry.direction}
                      </div>
                    )}
                    {entry.insufficiencySymptoms && entry.insufficiencySymptoms.length > 0 && (
                      <div className="text-sm mb-1">
                        <span className="font-medium">Insufficiency:</span>{' '}
                        {entry.insufficiencySymptoms.join(', ')}
                      </div>
                    )}
                    {entry.excessSymptoms && entry.excessSymptoms.length > 0 && (
                      <div className="text-sm mb-1">
                        <span className="font-medium">Excess:</span>{' '}
                        {entry.excessSymptoms.join(', ')}
                      </div>
                    )}
                    {entry.stressDoseGiven && (
                      <div className="text-sm mb-1">
                        <span className="font-medium">Stress dose:</span>{' '}
                        {entry.stressDoseMed ?? 'steroid'}
                        {entry.stressDoseMg != null && ` ${entry.stressDoseMg} mg`}
                        {entry.routeInjection && ' (IM injection)'}
                        {entry.stressDoseReason && ` — ${entry.stressDoseReason}`}
                      </div>
                    )}
                    {crisis && (
                      <div className="text-sm mb-1 text-destructive">
                        <span className="font-medium">Crisis signs:</span>{' '}
                        {[
                          entry.vomiting && 'vomiting',
                          entry.unableToKeepMedsDown && "can't keep meds down",
                          entry.severeWeakness && 'severe weakness',
                          entry.confusion && 'confusion',
                          entry.emergencyInjectionUsed && 'emergency injection',
                        ].filter(Boolean).join(', ') || 'present'}
                      </div>
                    )}
                    {(entry.cortisol != null || entry.acth != null || entry.sodium != null || entry.potassium != null) && (
                      <div className="text-sm mb-1">
                        <span className="font-medium">Labs:</span>{' '}
                        {[
                          entry.cortisol != null && `cortisol ${entry.cortisol}`,
                          entry.acth != null && `ACTH ${entry.acth}`,
                          entry.sodium != null && `Na ${entry.sodium}`,
                          entry.potassium != null && `K ${entry.potassium}`,
                        ].filter(Boolean).join(', ')}
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
