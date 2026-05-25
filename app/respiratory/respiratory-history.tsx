/*
 * Built by: Ace (Claude 4.x) — 2026-05-10
 * Co-invented by Ren (vision) and Ace (implementation)
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Wind, Edit, Trash2, Calendar } from 'lucide-react'
import { format } from 'date-fns'

import { RespiratoryEntry } from './respiratory-types'
import { getEpisodeTypeInfo, getSeverityLabel, getSeverityColor } from './respiratory-constants'
import { useDailyData, CATEGORIES } from '@/lib/database'

interface Props { onEdit: (e: RespiratoryEntry) => void; onDelete: (e: RespiratoryEntry) => void; refreshTrigger: number }

export function RespiratoryHistory({ onEdit, onDelete, refreshTrigger }: Props) {
  const { getDateRange } = useDailyData()
  const [historyEntries, setHistoryEntries] = useState<RespiratoryEntry[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => { load() }, [refreshTrigger])

  const load = async () => {
    setLoading(true)
    try {
      const today = format(new Date(), 'yyyy-MM-dd')
      const start = format(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')
      const records = await getDateRange(start, today, CATEGORIES.TRACKER)
      const recs = records.filter(r => r.subcategory === 'respiratory')
      const all: RespiratoryEntry[] = []
      for (const rec of recs) {
        if (rec?.content?.entries) {
          let entries = rec.content.entries
          if (typeof entries === 'string') { try { entries = JSON.parse(entries) } catch { continue } }
          all.push(...entries)
        }
      }
      all.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      setHistoryEntries(all)
    } catch (e) { console.error('History load fail:', e) } finally { setLoading(false) }
  }

  if (loading) return <Card><CardContent className="pt-6 text-center text-muted-foreground">Loading 90-day respiratory history...</CardContent></Card>
  if (historyEntries.length === 0) return (
    <Card><CardContent className="pt-6 text-center text-muted-foreground">
      <Wind className="h-12 w-12 mx-auto mb-3 opacity-30" />
      <p>No respiratory events in the last 90 days.</p>
      <p className="text-sm mt-2">Log an event to start building your history.</p>
    </CardContent></Card>
  )

  const grouped: Record<string, RespiratoryEntry[]> = {}
  for (const entry of historyEntries) { if (!grouped[entry.date]) grouped[entry.date] = []; grouped[entry.date].push(entry) }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5" /> 90-Day History ({historyEntries.length} events)</CardTitle></CardHeader>
      </Card>
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
                          {entry.peakFlowZone && entry.peakFlowZone !== 'unknown' && (
                            <Badge variant="outline" className={entry.peakFlowZone === 'red' ? 'text-red-600' : entry.peakFlowZone === 'yellow' ? 'text-yellow-600' : 'text-green-600'}>
                              PF: {entry.peakFlowZone}
                            </Badge>
                          )}
                          {entry.attachmentImages && entry.attachmentImages.length > 0 && (
                            <Badge variant="outline" className="bg-info/10 text-info border-blue-300">
                              📎 {entry.attachmentImages.length} {entry.attachmentImages.length === 1 ? 'file' : 'files'}
                            </Badge>
                          )}
                          {entry.epinephrineGiven && <Badge variant="destructive">EpiPen used</Badge>}
                          {entry.erVisitRequired && <Badge variant="destructive">ER</Badge>}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(entry.timestamp), 'h:mm a')}
                          {entry.spo2Lowest && ` • Lowest SpO2 ${entry.spo2Lowest}%`}
                          {entry.peakFlowReading && ` • PF ${entry.peakFlowReading} L/min`}
                          {entry.timeToResolutionMin && ` • ${entry.timeToResolutionMin} min to resolve`}
                        </div>
                        {entry.symptoms && entry.symptoms.length > 0 && <div className="text-xs mt-2 text-muted-foreground"><strong>Symptoms:</strong> {entry.symptoms.join(', ')}</div>}
                        {entry.triggers && entry.triggers.length > 0 && <div className="text-xs mt-1 text-muted-foreground"><strong>Triggers:</strong> {entry.triggers.join(', ')}</div>}
                        {entry.inhalerUsed && entry.inhalerName && (
                          <div className="text-xs mt-1 text-muted-foreground">
                            <strong>Inhaler:</strong> {entry.inhalerName} {entry.inhalerDoses && `× ${entry.inhalerDoses} doses`}
                            {entry.inhalerResponse && ` (response ${entry.inhalerResponse}/5)`}
                          </div>
                        )}
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
