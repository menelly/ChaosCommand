/* Built by: Ace (Claude 4.x) — 2026-05-10 */
'use client'
import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Bone, Edit, Trash2, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import { JointEntry } from './joint-types'
import { getEpisodeTypeInfo, getSeverityLabel, getSeverityColor } from './joint-constants'
import { useDailyData, CATEGORIES } from '@/lib/database'

export function JointHistory({ onEdit, onDelete, refreshTrigger }: { onEdit: (e: JointEntry) => void; onDelete: (e: JointEntry) => void; refreshTrigger: number }) {
  const { getDateRange } = useDailyData()
  const [historyEntries, setHistoryEntries] = useState<JointEntry[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => { load() }, [refreshTrigger])

  const load = async () => {
    setLoading(true)
    try {
      const today = format(new Date(), 'yyyy-MM-dd')
      const start = format(new Date(Date.now() - 90 * 86400000), 'yyyy-MM-dd')
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

  if (loading) return <Card><CardContent className="pt-6 text-center text-muted-foreground">Loading 90-day joint history...</CardContent></Card>
  if (historyEntries.length === 0) return <Card><CardContent className="pt-6 text-center text-muted-foreground"><Bone className="h-12 w-12 mx-auto mb-3 opacity-30" /><p>No joint events in the last 90 days.</p></CardContent></Card>

  const grouped: Record<string, JointEntry[]> = {}
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
                <Card key={entry.id} className="bg-muted/30">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-lg">{info.icon}</span>
                          <span className="font-semibold">{info.name}</span>
                          {entry.severity && <Badge variant="outline" className={getSeverityColor(entry.severity)}>{getSeverityLabel(entry.severity)} ({entry.severity}/10)</Badge>}
                          {entry.attachmentImages && entry.attachmentImages.length > 0 && <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-300">📎 {entry.attachmentImages.length}</Badge>}
                          {entry.selfReducedFlag && <Badge variant="secondary">Self-reduced</Badge>}
                          {entry.erVisitRequired && <Badge variant="destructive">ER</Badge>}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(entry.timestamp), 'h:mm a')}
                          {entry.jointAffected && entry.jointAffected.length > 0 && ` • ${entry.jointAffected.join(', ')}`}
                          {entry.musclesAffected && entry.musclesAffected.length > 0 && ` • ${entry.musclesAffected.join(', ')}`}
                          {entry.swellingPresent && ` • Swelling`}
                          {entry.bruisingPresent && ` • Bruising`}
                          {entry.romImpactedPercent !== undefined && ` • ROM ${entry.romImpactedPercent}%`}
                        </div>
                        {entry.triggerActivity && entry.triggerActivity.length > 0 && <div className="text-xs mt-2 text-muted-foreground"><strong>Trigger:</strong> {entry.triggerActivity.join(', ')}</div>}
                        {entry.treatmentApplied && entry.treatmentApplied.length > 0 && <div className="text-xs mt-1 text-muted-foreground"><strong>Treatment:</strong> {entry.treatmentApplied.join(', ')}{entry.treatmentResponse && ` (${entry.treatmentResponse}/5)`}</div>}
                        {entry.notes && <div className="text-xs mt-2 italic">{entry.notes}</div>}
                      </div>
                      <div className="flex gap-1 ml-2">
                        <Button size="sm" variant="ghost" onClick={() => onEdit(entry)}><Edit className="h-3 w-3" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => onDelete(entry)}><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
