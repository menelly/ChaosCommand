/* Built by: Ace (Claude 4.8) — 2026-06-22 (CHA: vitals history + analytics).
 * Cross-date history list for the Vitals tracker. Loads a rolling window,
 * groups by date (newest first), and lets you delete any past reading. */

'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Activity } from 'lucide-react'
import { format, subDays } from 'date-fns'
import { useDailyData, CATEGORIES } from '@/lib/database'
import { useToast } from '@/hooks/use-toast'
import type { VitalsEntry } from './vitals-tracker'

interface VitalsHistoryProps {
  refreshTrigger: number
  onChanged?: () => void
}

function summarize(e: VitalsEntry): string {
  const parts: string[] = []
  if (e.systolic != null && e.diastolic != null) parts.push(`BP ${e.systolic}/${e.diastolic}`)
  if (e.heartRate != null) parts.push(`HR ${e.heartRate}`)
  if (e.spo2 != null) parts.push(`SpO₂ ${e.spo2}%`)
  if (e.temperature != null) parts.push(`${e.temperature}°${e.tempUnit ?? 'F'}`)
  if (e.respRate != null) parts.push(`RR ${e.respRate}`)
  if (e.weight != null) parts.push(`${e.weight} ${e.weightUnit ?? 'lb'}`)
  return parts.join(' · ')
}

export function VitalsHistory({ refreshTrigger, onChanged }: VitalsHistoryProps) {
  const { getDateRange, getCategoryData, saveData } = useDailyData()
  const { toast } = useToast()
  const [windowDays, setWindowDays] = useState(90)
  const [entries, setEntries] = useState<VitalsEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [localRefresh, setLocalRefresh] = useState(0)

  useEffect(() => { load() }, [windowDays, refreshTrigger, localRefresh]) // eslint-disable-line react-hooks/exhaustive-deps

  const load = async () => {
    setLoading(true)
    try {
      const today = format(new Date(), 'yyyy-MM-dd')
      const start = format(subDays(new Date(), windowDays), 'yyyy-MM-dd')
      const records = await getDateRange(start, today, CATEGORIES.TRACKER)
      const out: VitalsEntry[] = []
      for (const rec of records.filter(r => r.subcategory === 'vitals')) {
        let list = rec?.content?.entries ?? []
        if (typeof list === 'string') { try { list = JSON.parse(list) } catch { continue } }
        if (Array.isArray(list)) out.push(...list)
      }
      out.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      setEntries(out)
    } catch (e) {
      console.error('Vitals history load failed:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (entry: VitalsEntry) => {
    try {
      const recs = await getCategoryData(entry.date, CATEGORIES.TRACKER)
      const rec = recs.find(r => r.subcategory === 'vitals')
      let list = rec?.content?.entries ?? []
      if (typeof list === 'string') { try { list = JSON.parse(list) } catch { list = [] } }
      const next = (Array.isArray(list) ? list : []).filter((e: VitalsEntry) => e.id !== entry.id)
      await saveData(entry.date, CATEGORIES.TRACKER, 'vitals', { entries: next })
      setLocalRefresh(n => n + 1)
      onChanged?.()
      toast({ title: 'Reading deleted' })
    } catch (e) {
      console.error(e)
      toast({ title: 'Delete failed', variant: 'destructive' })
    }
  }

  // Group by calendar date for readable section headers.
  const byDate = entries.reduce<Record<string, VitalsEntry[]>>((acc, e) => {
    (acc[e.date] ||= []).push(e)
    return acc
  }, {})
  const dates = Object.keys(byDate).sort((a, b) => b.localeCompare(a))

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base">History</CardTitle>
            <Select value={String(windowDays)} onValueChange={v => setWindowDays(parseInt(v))}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="180">Last 6 months</SelectItem>
                <SelectItem value="365">Last 12 months</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      {loading ? (
        <Card><CardContent className="pt-6 text-center text-muted-foreground">Loading history…</CardContent></Card>
      ) : entries.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No readings in this window.</p>
            <p className="text-sm mt-2">Log a reading to start building history.</p>
          </CardContent>
        </Card>
      ) : (
        dates.map(date => (
          <Card key={date}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                {format(new Date(date + 'T12:00:00'), 'EEEE, MMMM d, yyyy')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {byDate[date].map(e => (
                <div key={e.id} className="flex items-start justify-between rounded-md bg-muted/30 px-3 py-2">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{summarize(e) || 'Note only'}</div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(e.timestamp), 'h:mm a')}{e.notes ? ` • ${e.notes}` : ''}
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(e)}>Delete</Button>
                </div>
              ))}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}
