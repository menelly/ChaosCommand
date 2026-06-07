/* Built by: Ace (Claude 4.x) — 2026-06-07 */
'use client'
import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Brain, Edit, Trash2, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import { NeuroEntry } from './neuro-types'
import { getEpisodeTypeInfo, getSeverityLabel, getSeverityColor } from './neuro-constants'
import { useDailyData, CATEGORIES } from '@/lib/database'
import { isCrossListed } from '@/lib/cross-list'

export function NeuroHistory({ onEdit, onDelete, refreshTrigger }: { onEdit: (e: NeuroEntry) => void; onDelete: (e: NeuroEntry) => void; refreshTrigger: number }) {
  const { getDateRange } = useDailyData()
  const [historyEntries, setHistoryEntries] = useState<NeuroEntry[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => { load() }, [refreshTrigger])

  const load = async () => {
    setLoading(true)
    try {
      const today = format(new Date(), 'yyyy-MM-dd')
      const start = format(new Date(Date.now() - 90 * 86400000), 'yyyy-MM-dd')
      const records = await getDateRange(start, today, CATEGORIES.TRACKER)
      const recs = records.filter(r => r.subcategory === 'neuro')
      const all: NeuroEntry[] = []
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

  if (loading) return <Card><CardContent className="pt-6 text-center text-muted-foreground">Loading 90-day neuro history...</CardContent></Card>
  if (historyEntries.length === 0) return <Card><CardContent className="pt-6 text-center text-muted-foreground"><Brain className="h-12 w-12 mx-auto mb-3 opacity-30" /><p>No neuro events in the last 90 days.</p></CardContent></Card>

  const grouped: Record<string, NeuroEntry[]> = {}
  for (const e of historyEntries) { if (!grouped[e.date]) grouped[e.date] = []; grouped[e.date].push(e) }

  return (
    <div className="space-y-4">
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5" /> 90-Day History ({historyEntries.length} events)</CardTitle></CardHeader></Card>
      {Object.keys(grouped).map(date => (
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
                      {isCrossListed(entry) && <Badge variant="outline" className="bg-violet-100 text-violet-800 border-violet-200">⇄ MSK</Badge>}
                      {entry.erVisitRequired && <Badge variant="destructive">ER</Badge>}
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => onEdit(entry)}><Edit className="h-3 w-3" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => onDelete(entry)}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground mb-1">
                    {format(new Date(entry.timestamp), 'h:mm a')}
                    {entry.distribution && entry.distribution.length > 0 && ` • ${entry.distribution.join(', ')}`}
                    {entry.duration && ` • ${entry.duration}`}
                  </div>
                  {entry.character && entry.character.length > 0 && <div className="text-xs mt-1 text-muted-foreground"><strong>Pattern:</strong> {entry.character.join(', ')}</div>}
                  {entry.triggers && entry.triggers.length > 0 && <div className="text-xs mt-1 text-muted-foreground"><strong>Suspected trigger:</strong> {entry.triggers.join(', ')}</div>}
                  {entry.treatments && entry.treatments.length > 0 && <div className="text-xs mt-1 text-muted-foreground"><strong>Treatment:</strong> {entry.treatments.join(', ')}</div>}
                  {entry.notes && <div className="text-xs mt-1 italic">{entry.notes}</div>}
                </div>
              )
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
