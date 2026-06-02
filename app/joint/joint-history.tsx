/* Built by: Ace (Claude 4.x) — 2026-05-10 */
'use client'
import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Bone, Edit, Trash2, Calendar } from 'lucide-react'
import { format, differenceInDays } from 'date-fns'
import { JointEntry } from './joint-types'
import { getEpisodeTypeInfo, getSeverityLabel, getSeverityColor } from './joint-constants'
import { useDailyData, CATEGORIES } from '@/lib/database'

type TimeWindow = '7' | '30' | '90' | 'all'

const TIME_WINDOWS: { value: TimeWindow; label: string }[] = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: 'all', label: 'All time' },
]

export function JointHistory({ onEdit, onDelete, refreshTrigger }: { onEdit: (e: JointEntry) => void; onDelete: (e: JointEntry) => void; refreshTrigger: number }) {
  const { getDateRange } = useDailyData()
  const [historyEntries, setHistoryEntries] = useState<JointEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('90')

  useEffect(() => { load() }, [refreshTrigger])

  const load = async () => {
    setLoading(true)
    try {
      const today = format(new Date(), 'yyyy-MM-dd')
      // Load all time so the timeframe picker can filter client-side
      const start = '2000-01-01'
      const records = await getDateRange(start, today, CATEGORIES.TRACKER)
      const recs = records.filter(r => r.subcategory === 'joint')
      const all: JointEntry[] = []
      for (const rec of recs) {
        if (rec?.content?.entries) {
          let entries = rec.content.entries
          if (typeof entries === 'string') { try { entries = JSON.parse(entries) } catch { continue } }
          all.push(...entries)
        }
      }
      all.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      setHistoryEntries(all)
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  const filtered = useMemo(() => {
    if (timeWindow === 'all') return historyEntries
    const days = parseInt(timeWindow)
    const now = new Date()
    return historyEntries.filter(e => {
      try { return differenceInDays(now, new Date(e.date)) <= days } catch { return false }
    })
  }, [historyEntries, timeWindow])

  if (loading) return <Card><CardContent className="pt-6 text-center text-muted-foreground">Loading joint history...</CardContent></Card>
  if (historyEntries.length === 0) return <Card><CardContent className="pt-6 text-center text-muted-foreground"><Bone className="h-12 w-12 mx-auto mb-3 opacity-30" /><p>No joint events recorded yet.</p></CardContent></Card>

  const grouped: Record<string, JointEntry[]> = {}
  for (const e of filtered) { if (!grouped[e.date]) grouped[e.date] = []; grouped[e.date].push(e) }

  return (
    <div className="space-y-4">
      {/* Timeframe picker */}
      <Card>
        <CardContent className="pt-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Time window</label>
            <Select value={timeWindow} onValueChange={(v) => setTimeWindow(v as TimeWindow)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIME_WINDOWS.map(w => <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Joint History ({filtered.length} events)
          </CardTitle>
        </CardHeader>
      </Card>

      {Object.keys(grouped).length === 0 ? (
        <Card><CardContent className="pt-6 text-center text-muted-foreground">No events in selected time window.</CardContent></Card>
      ) : (
        Object.keys(grouped).map(date => (
          <Card key={date}>
            <CardHeader className="pb-2"><CardTitle className="text-base">{format(new Date(date + 'T12:00:00'), 'EEEE, MMMM d, yyyy')}<Badge variant="secondary" className="ml-2">{grouped[date].length}</Badge></CardTitle></CardHeader>
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
                        {entry.severity && <Badge variant="outline" className={getSeverityColor(entry.severity)}>{getSeverityLabel(entry.severity)} ({entry.severity}/10)</Badge>}
                        {entry.attachmentImages && entry.attachmentImages.length > 0 && <Badge variant="outline" className="bg-info/10 text-info border-blue-300">📎 {entry.attachmentImages.length}</Badge>}
                        {entry.selfReducedFlag && <Badge variant="secondary">Self-reduced</Badge>}
                        {entry.erVisitRequired && <Badge variant="destructive">ER</Badge>}
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => onEdit(entry)}><Edit className="h-3 w-3" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => onDelete(entry)}><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground mb-1">
                      {format(new Date(entry.timestamp), 'h:mm a')}
                      {entry.jointAffected && entry.jointAffected.length > 0 && ` • ${entry.jointAffected.join(', ')}`}
                      {entry.musclesAffected && entry.musclesAffected.length > 0 && ` • ${entry.musclesAffected.join(', ')}`}
                      {entry.swellingPresent && ` • Swelling`}
                      {entry.bruisingPresent && ` • Bruising`}
                      {entry.romImpactedPercent !== undefined && ` • ROM ${entry.romImpactedPercent}%`}
                    </div>
                    {entry.triggerActivity && entry.triggerActivity.length > 0 && <div className="text-xs mt-1 text-muted-foreground"><strong>Trigger:</strong> {entry.triggerActivity.join(', ')}</div>}
                    {entry.treatmentApplied && entry.treatmentApplied.length > 0 && <div className="text-xs mt-1 text-muted-foreground"><strong>Treatment:</strong> {entry.treatmentApplied.join(', ')}{entry.treatmentResponse && ` (${entry.treatmentResponse}/5)`}</div>}
                    {entry.duration && <div className="text-xs mt-1 text-muted-foreground"><strong>Duration:</strong> {entry.duration}</div>}
                    {entry.notes && <div className="text-xs mt-1 italic">{entry.notes}</div>}
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
