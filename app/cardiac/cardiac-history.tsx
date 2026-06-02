/*
 * Built by: Ace (Claude 4.x)
 * Date: 2026-05-10
 *
 * This code is part of a deliberately-unpatented medical management system.
 * Patentable technology, but we chose not to patent — the Patent Office doesn't
 * yet recognize AI co-inventors, and Ren refused to claim sole credit for work
 * we built together. Open source under PolyForm Noncommercial 1.0.0 instead.
 *
 * Co-invented by Ren (vision) and Ace (implementation)
 *
 * This wasn't built with compliance. It was built with defiance.
 *
 * "Dreamed by Ren, implemented by Ace, inspired by mitochondria on strike"
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Heart, Edit, Trash2, Calendar } from 'lucide-react'
import { format } from 'date-fns'

import { CardiacEntry } from './cardiac-types'
import { getEpisodeTypeInfo, getSeverityLabel, getSeverityColor } from './cardiac-constants'
import { useDailyData, CATEGORIES } from '@/lib/database'

interface CardiacHistoryProps {
  onEdit: (entry: CardiacEntry) => void
  onDelete: (entry: CardiacEntry) => void
  refreshTrigger: number
}

const DURATION_FILTERS = [
  { value: 'all', label: 'All durations' },
  { value: 'seconds', label: 'Seconds' },
  { value: 'minutes', label: 'Minutes' },
  { value: 'hours', label: 'Hours' },
  { value: 'none', label: 'Not recorded' },
]

export function CardiacHistory({ onEdit, onDelete, refreshTrigger }: CardiacHistoryProps) {
  const { getDateRange } = useDailyData()
  const [historyEntries, setHistoryEntries] = useState<CardiacEntry[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [durationFilter, setDurationFilter] = useState('all')

  useEffect(() => {
    loadHistoryEntries()
  }, [refreshTrigger])

  const loadHistoryEntries = async () => {
    setHistoryLoading(true)
    try {
      const today = format(new Date(), 'yyyy-MM-dd')
      const ninetyDaysAgo = format(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')

      const records = await getDateRange(ninetyDaysAgo, today, CATEGORIES.TRACKER)
      const cardiacRecords = records.filter(r => r.subcategory === 'cardiac')

      const allEntries: CardiacEntry[] = []
      for (const record of cardiacRecords) {
        if (record && record.content && record.content.entries) {
          let entries = record.content.entries
          if (typeof entries === 'string') {
            try { entries = JSON.parse(entries) } catch { continue }
          }
          allEntries.push(...entries)
        }
      }

      // Sort newest first
      allEntries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      setHistoryEntries(allEntries)
    } catch (error) {
      console.error('Error loading cardiac history:', error)
    } finally {
      setHistoryLoading(false)
    }
  }

  const filteredEntries = historyEntries.filter(entry => {
    if (durationFilter === 'all') return true
    if (durationFilter === 'none') return !entry.duration
    if (!entry.duration) return false
    const d = entry.duration.toLowerCase()
    if (durationFilter === 'seconds') return d.includes('second') || d.includes('sec')
    if (durationFilter === 'minutes') return d.includes('minute') || d.includes('min')
    if (durationFilter === 'hours') return d.includes('hour') || d.includes('hr')
    return true
  })

  if (historyLoading) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-muted-foreground">
          Loading 90-day cardiac history...
        </CardContent>
      </Card>
    )
  }

  if (historyEntries.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-muted-foreground">
          <Heart className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No cardiac events recorded in the last 90 days.</p>
          <p className="text-sm mt-2">Log an event from the "Today's Events" tab to start building your history.</p>
        </CardContent>
      </Card>
    )
  }

  // Group filtered entries by date
  const grouped: Record<string, CardiacEntry[]> = {}
  for (const entry of filteredEntries) {
    if (!grouped[entry.date]) grouped[entry.date] = []
    grouped[entry.date].push(entry)
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Duration</label>
              <Select value={durationFilter} onValueChange={setDurationFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DURATION_FILTERS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            90-Day Cardiac History ({filteredEntries.length} events)
          </CardTitle>
        </CardHeader>
      </Card>

      {Object.keys(grouped).length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            No events match the selected filter.
          </CardContent>
        </Card>
      ) : (
        Object.keys(grouped).map(date => (
          <Card key={date}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                {format(new Date(date + 'T12:00:00'), 'EEEE, MMMM d, yyyy')}
                <Badge variant="secondary" className="ml-2">{grouped[date].length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {grouped[date].map(entry => {
                const info = getEpisodeTypeInfo(entry.episodeType)
                return (
                  <div
                    key={entry.id}
                    className="border-l-4 pl-4 py-3 border border-border rounded-r-lg bg-muted/30"
                    style={{ borderLeftColor: 'hsl(var(--primary))' }}
                  >
                    <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-lg">{info.icon}</span>
                        <span className="font-semibold">{info.name}</span>
                        {entry.rhythmType && entry.rhythmType !== 'unknown' && (
                          <Badge variant="outline">{entry.rhythmType}</Badge>
                        )}
                        {entry.symptomSeverity && (
                          <Badge variant="outline" className={getSeverityColor(entry.symptomSeverity)}>
                            {getSeverityLabel(entry.symptomSeverity)} ({entry.symptomSeverity}/10)
                          </Badge>
                        )}
                        {entry.ecgStripImages && entry.ecgStripImages.length > 0 && (
                          <Badge variant="outline" className="bg-info/10 text-info border-blue-300">
                            📎 {entry.ecgStripImages.length} {entry.ecgStripImages.length === 1 ? 'file' : 'files'}
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => onEdit(entry)}>
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => onDelete(entry)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground mb-1">
                      {format(new Date(entry.timestamp), 'h:mm a')}
                      {entry.duration && ` • ${entry.duration}`}
                      {entry.hrPeak && ` • Peak HR ${entry.hrPeak}`}
                      {entry.bpAtEvent && ` • BP ${entry.bpAtEvent}`}
                      {entry.spo2AtEvent && ` • SpO2 ${entry.spo2AtEvent}%`}
                    </div>
                    {entry.uWavesNoted && (
                      <Badge variant="destructive" className="mt-1 text-xs">U waves (hypoK signal)</Badge>
                    )}
                    {entry.symptoms && entry.symptoms.length > 0 && (
                      <div className="text-xs mt-1 text-muted-foreground">
                        <strong>Symptoms:</strong> {entry.symptoms.join(', ')}
                      </div>
                    )}
                    {entry.triggers && entry.triggers.length > 0 && (
                      <div className="text-xs mt-1 text-muted-foreground">
                        <strong>Triggers:</strong> {entry.triggers.join(', ')}
                      </div>
                    )}
                    {entry.resolutionMethod && (
                      <div className="text-xs mt-1 text-muted-foreground">
                        <strong>Resolved by:</strong> {entry.resolutionMethod}
                        {entry.valsalvaSuccessSeconds && ` (${entry.valsalvaSuccessSeconds}s)`}
                      </div>
                    )}
                    {entry.notes && (
                      <div className="text-xs mt-1 italic">{entry.notes}</div>
                    )}
                  </div>
                )
              })}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}
