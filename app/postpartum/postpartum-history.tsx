/*
 * Built by: Ace (Claude 4.x)
 * Date: 2026-06-04
 *
 * Co-invented by Ren (vision) and Ace (implementation)
 * This wasn't built with compliance. It was built with defiance.
 */

/**
 * POSTPARTUM HISTORY
 * Time-window selector + section filter + left-border card list.
 * Uses getDateRange (NOT getCategoryData) to avoid the wrong-date bug.
 * Soft-delete on delete action.
 */

'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Edit, Trash2, Baby } from 'lucide-react'
import { format, subDays } from 'date-fns'
import { useToast } from '@/hooks/use-toast'

import type { PostpartumEntry, PostpartumSection } from './postpartum-types'
import { SECTIONS, POSTPARTUM_SUBCATEGORY, SEVERITY_LABELS } from './postpartum-constants'
import { useDailyData, CATEGORIES } from '@/lib/database'
import { getDB } from '@/lib/database/dexie-db'

interface PostpartumHistoryProps {
  onEdit: (entry: PostpartumEntry) => void
  onDelete: (entry: PostpartumEntry) => void
  refreshTrigger: number
}

type TimeWindow = '7' | '30' | '90' | 'all'

const TIME_WINDOWS: { value: TimeWindow; label: string }[] = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: 'all', label: 'All time' },
]

export function PostpartumHistory({ onEdit, onDelete, refreshTrigger }: PostpartumHistoryProps) {
  const { getDateRange } = useDailyData()
  const { toast } = useToast()
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('30')
  const [typeFilter, setTypeFilter] = useState<PostpartumSection | 'all'>('all')
  const [allEntries, setAllEntries] = useState<PostpartumEntry[]>([])
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
      const ppRecords = records.filter(r =>
        r.subcategory.startsWith(`${POSTPARTUM_SUBCATEGORY}-`) &&
        !r.metadata?.deleted_at
      )
      const loaded: PostpartumEntry[] = ppRecords.map(r => r.content as PostpartumEntry)
      loaded.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      setAllEntries(loaded)
    } catch (error) {
      console.error('Error loading postpartum history:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (entry: PostpartumEntry) => {
    try {
      const database = getDB()
      const record = await database.daily_data
        .where('subcategory')
        .equals(`${POSTPARTUM_SUBCATEGORY}-${entry.id}`)
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
      toast({ title: 'Entry Deleted', description: 'Postpartum entry removed' })
    } catch (error) {
      console.error('Error deleting postpartum entry:', error)
      toast({ title: 'Delete Error', description: 'Failed to delete postpartum event', variant: 'destructive' })
    }
  }

  const filtered = useMemo(() => {
    if (typeFilter === 'all') return allEntries
    return allEntries.filter(e => e.section === typeFilter)
  }, [allEntries, typeFilter])

  // Summary stats
  const stats = useMemo(() => {
    const total = filtered.length
    const recoveryCount = filtered.filter(e => e.section === 'recovery').length
    const feedingCount = filtered.filter(e => e.section === 'feeding').length
    const infantCount = filtered.filter(e => e.section === 'infant').length
    const redFlagCount = filtered.filter(e =>
      e.fundusFirmness === 'boggy' || e.largeClots || ((e.padsSoakedPerHour ?? 0) >= 1) ||
      e.thoughtsOfHarm || e.intrusiveThoughts || ((e.infantFeverTempF ?? 0) >= 100.4)
    ).length
    return { total, recoveryCount, feedingCount, infantCount, redFlagCount }
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
            <Baby className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No postpartum entries recorded yet</h3>
            <p className="text-muted-foreground mb-4">Start tracking to build a record.</p>
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
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Section</label>
              <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sections</SelectItem>
                  {SECTIONS.map(t => (
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
            <div className="text-xs text-muted-foreground">Entries</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="text-2xl font-bold">{stats.recoveryCount}</div>
            <div className="text-xs text-muted-foreground">Recovery</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="text-2xl font-bold">{stats.feedingCount}</div>
            <div className="text-xs text-muted-foreground">Feeding</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="text-2xl font-bold">{stats.infantCount}</div>
            <div className="text-xs text-muted-foreground">Baby</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="text-2xl font-bold text-destructive">{stats.redFlagCount}</div>
            <div className="text-xs text-muted-foreground">Red flags</div>
          </CardContent>
        </Card>
      </div>

      {/* Entry list */}
      <Card>
        <CardHeader><CardTitle>Entry History</CardTitle></CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">No entries in selected window.</p>
          ) : (
            <div className="space-y-3">
              {filtered.map(entry => {
                const info = SECTIONS.find(s => s.id === entry.section)
                const severityLabel = SEVERITY_LABELS.find(s => s.level === entry.severity)
                // Left border color: destructive for safety-critical, warning for cautions, primary otherwise
                const hemorrhage = entry.fundusFirmness === 'boggy' || entry.largeClots || ((entry.padsSoakedPerHour ?? 0) >= 1)
                const moodCrisis = entry.thoughtsOfHarm || entry.intrusiveThoughts
                const newbornFever = (entry.infantFeverTempF ?? 0) >= 100.4
                const mastitis = (entry.recoverySymptoms?.includes('mastitis-signs') && entry.feverPresent)
                const jaundice = entry.jaundiceSpreading
                const borderColor = (hemorrhage || moodCrisis || newbornFever)
                  ? 'border-l-destructive'
                  : (mastitis || jaundice)
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
                          {info?.icon} {info?.name ?? entry.section}
                        </Badge>
                        {entry.severity != null && (
                          <Badge variant="outline" className={severityLabel?.color}>
                            Severity {entry.severity}/10
                          </Badge>
                        )}
                        {hemorrhage && (
                          <Badge variant="destructive">⚠ Hemorrhage</Badge>
                        )}
                        {moodCrisis && (
                          <Badge variant="destructive">⚠ Mood crisis</Badge>
                        )}
                        {newbornFever && (
                          <Badge variant="destructive">⚠ Newborn fever</Badge>
                        )}
                        {mastitis && (
                          <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
                            Mastitis flag
                          </Badge>
                        )}
                        {jaundice && (
                          <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
                            Jaundice spreading
                          </Badge>
                        )}
                        {entry.feverPresent && (
                          <Badge variant="destructive">Fever</Badge>
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

                    {/* RECOVERY */}
                    {entry.section === 'recovery' && (
                      <>
                        {entry.lochiaFlow && (
                          <div className="text-sm mb-1">
                            <span className="font-medium">Bleeding (lochia):</span> {entry.lochiaFlow}
                            {entry.padsSoakedPerHour != null && ` — ${entry.padsSoakedPerHour} pad/hr`}
                          </div>
                        )}
                        {entry.fundusFirmness && (
                          <div className={`text-sm mb-1 ${entry.fundusFirmness === 'boggy' ? 'text-destructive' : ''}`}>
                            <span className="font-medium">Fundus:</span> {entry.fundusFirmness}
                          </div>
                        )}
                        {(entry.moodLow || entry.moodAnxious || entry.intrusiveThoughts || entry.thoughtsOfHarm) && (
                          <div className="text-sm mb-1">
                            <span className="font-medium">Mood:</span>{' '}
                            {[
                              entry.moodLow && 'low',
                              entry.moodAnxious && 'anxious',
                              entry.intrusiveThoughts && 'intrusive thoughts',
                              entry.thoughtsOfHarm && 'thoughts of harm',
                            ].filter(Boolean).join(', ')}
                          </div>
                        )}
                        {entry.recoverySymptoms && entry.recoverySymptoms.length > 0 && (
                          <div className="text-sm mb-1">
                            <span className="font-medium">Symptoms:</span> {entry.recoverySymptoms.join(', ')}
                          </div>
                        )}
                      </>
                    )}

                    {/* FEEDING */}
                    {entry.section === 'feeding' && (
                      <>
                        {entry.feedMethod && (
                          <div className="text-sm mb-1">
                            <span className="font-medium">Method:</span> {entry.feedMethod}
                            {entry.feedSideStarted && ` — started ${entry.feedSideStarted}`}
                          </div>
                        )}
                        {(entry.feedDurationLeftMin != null || entry.feedDurationRightMin != null) && (
                          <div className="text-sm mb-1">
                            <span className="font-medium">Duration:</span>{' '}
                            {entry.feedDurationLeftMin != null && `L ${entry.feedDurationLeftMin} min`}
                            {entry.feedDurationLeftMin != null && entry.feedDurationRightMin != null && ' · '}
                            {entry.feedDurationRightMin != null && `R ${entry.feedDurationRightMin} min`}
                          </div>
                        )}
                        {(entry.bottleAmountMl != null || entry.pumpedAmountMl != null) && (
                          <div className="text-sm mb-1">
                            {entry.bottleAmountMl != null && (
                              <span><span className="font-medium">Bottle:</span> {entry.bottleAmountMl} mL </span>
                            )}
                            {entry.pumpedAmountMl != null && (
                              <span><span className="font-medium">Pumped:</span> {entry.pumpedAmountMl} mL</span>
                            )}
                          </div>
                        )}
                      </>
                    )}

                    {/* INFANT */}
                    {entry.section === 'infant' && (
                      <>
                        {entry.diaperType && (
                          <div className="text-sm mb-1">
                            <span className="font-medium">Diaper:</span> {entry.diaperType}
                            {entry.wetDiapers24h != null && ` — ${entry.wetDiapers24h} wet/24h`}
                          </div>
                        )}
                        {entry.infantWeightG != null && (
                          <div className="text-sm mb-1">
                            <span className="font-medium">Weight:</span> {entry.infantWeightG} g
                          </div>
                        )}
                        {(entry.jaundiceNoted || entry.jaundiceSpreading) && (
                          <div className={`text-sm mb-1 ${entry.jaundiceSpreading ? 'text-warning' : ''}`}>
                            <span className="font-medium">Jaundice:</span>{' '}
                            {entry.jaundiceSpreading ? 'spreading' : 'noted'}
                          </div>
                        )}
                        {entry.infantFeverTempF != null && (
                          <div className={`text-sm mb-1 ${newbornFever ? 'text-destructive' : ''}`}>
                            <span className="font-medium">Temp:</span> {entry.infantFeverTempF}°F
                          </div>
                        )}
                      </>
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
