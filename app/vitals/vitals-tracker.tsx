/* Built by: Ace (Claude 4.8) — 2026-06-09. A plain vitals logger (CHA-317):
 * objective baseline measurements in one quick form. Distinct from the symptom
 * trackers (dysautonomia/cardiac capture BP/SpO2/HR as EPISODE context; this is
 * the routine baseline a doctor scans first). Standard tracker storage, so it
 * gets routine "logged today ✓" + PDF inclusion for free. */

'use client'

import { useState, useEffect } from 'react'
import { getPref } from '@/lib/prefs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Activity, HeartPulse, Wind, Thermometer, Scale, Droplet } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { format, addDays, subDays } from 'date-fns'
import { useDailyData, CATEGORIES } from '@/lib/database'
import { celebrate } from '@/lib/particle-physics-engine'
import { useUser } from '@/lib/contexts/user-context'
import { isCelebrationEnabled } from '@/lib/celebration-prefs'

interface VitalsEntry {
  id: string
  timestamp: string
  date: string
  systolic?: number
  diastolic?: number
  heartRate?: number
  spo2?: number
  temperature?: number
  tempUnit?: 'F' | 'C'
  respRate?: number
  weight?: number
  weightUnit?: 'lb' | 'kg'
  notes?: string
}

/** Empty string / NaN → undefined, so we only store fields actually measured. */
function num(v: string): number | undefined {
  if (v.trim() === '') return undefined
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}

const blankForm = {
  systolic: '', diastolic: '', heartRate: '', spo2: '',
  temperature: '', respRate: '', weight: '', notes: '',
}

export default function VitalsTracker() {
  const { saveData, getCategoryData } = useDailyData()
  const { userPin } = useUser()
  const { toast } = useToast()

  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [entries, setEntries] = useState<VitalsEntry[]>([])
  const [form, setForm] = useState({ ...blankForm })
  const [tempUnit, setTempUnit] = useState<'F' | 'C'>('F')
  const [weightUnit, setWeightUnit] = useState<'lb' | 'kg'>('lb')

  useEffect(() => { load() }, [selectedDate]) // eslint-disable-line react-hooks/exhaustive-deps

  const load = async () => {
    try {
      const records = await getCategoryData(selectedDate, CATEGORIES.TRACKER)
      const record = records.find(r => r.subcategory === 'vitals')
      let loaded = record?.content?.entries ?? []
      if (typeof loaded === 'string') { try { loaded = JSON.parse(loaded) } catch { loaded = [] } }
      setEntries(Array.isArray(loaded) ? loaded : [])
    } catch (e) { console.error(e); toast({ title: 'Loading Error', variant: 'destructive' }) }
  }

  const saveEntries = async (next: VitalsEntry[]) => {
    try { await saveData(selectedDate, CATEGORIES.TRACKER, 'vitals', { entries: next }); setEntries(next) }
    catch (e) { console.error(e); toast({ title: 'Save Error', variant: 'destructive' }) }
  }

  const update = (k: keyof typeof blankForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSave = async () => {
    const entry: VitalsEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      date: selectedDate,
      systolic: num(form.systolic),
      diastolic: num(form.diastolic),
      heartRate: num(form.heartRate),
      spo2: num(form.spo2),
      temperature: num(form.temperature),
      tempUnit,
      respRate: num(form.respRate),
      weight: num(form.weight),
      weightUnit,
      notes: form.notes.trim() || undefined,
    }
    // require at least one measurement
    const hasAny = [entry.systolic, entry.diastolic, entry.heartRate, entry.spo2, entry.temperature, entry.respRate, entry.weight].some(v => v !== undefined)
    if (!hasAny && !entry.notes) {
      toast({ title: 'Nothing to save', description: 'Enter at least one reading.', variant: 'destructive' })
      return
    }
    await saveEntries([...entries, entry])
    setForm({ ...blankForm })
    if ((getPref('chaos-confetti-level') || 'medium') !== 'none' && isCelebrationEnabled('vitals', userPin ?? '')) celebrate()
    toast({ title: '🩺 Vitals saved' })
  }

  const handleDelete = async (id: string) => {
    await saveEntries(entries.filter(e => e.id !== id))
    toast({ title: 'Reading deleted' })
  }

  const goPrev = () => setSelectedDate(p => format(subDays(new Date(p + 'T12:00:00'), 1), 'yyyy-MM-dd'))
  const goNext = () => setSelectedDate(p => format(addDays(new Date(p + 'T12:00:00'), 1), 'yyyy-MM-dd'))
  const goToday = () => setSelectedDate(format(new Date(), 'yyyy-MM-dd'))

  const todays = entries.filter(e => e.date === selectedDate)

  const summarize = (e: VitalsEntry): string => {
    const parts: string[] = []
    if (e.systolic != null && e.diastolic != null) parts.push(`BP ${e.systolic}/${e.diastolic}`)
    if (e.heartRate != null) parts.push(`HR ${e.heartRate}`)
    if (e.spo2 != null) parts.push(`SpO₂ ${e.spo2}%`)
    if (e.temperature != null) parts.push(`${e.temperature}°${e.tempUnit ?? 'F'}`)
    if (e.respRate != null) parts.push(`RR ${e.respRate}`)
    if (e.weight != null) parts.push(`${e.weight} ${e.weightUnit ?? 'lb'}`)
    return parts.join(' · ')
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pt-6">
      <div className="text-center mb-2">
        <h1 className="text-3xl font-bold text-foreground flex items-center justify-center gap-2">
          <Activity className="h-8 w-8 text-rose-500" />
          Vitals
        </h1>
        <p className="text-muted-foreground mt-1">Your objective baseline measurements — the numbers a clinician scans first. Log whatever you measured; leave the rest blank.</p>
      </div>

      {/* Date nav */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={goPrev}>←</Button>
            <div className="text-center">
              <span className="text-lg font-medium">{format(new Date(selectedDate + 'T12:00:00'), 'EEEE, MMMM d, yyyy')}</span>
              {selectedDate !== format(new Date(), 'yyyy-MM-dd') && <Button variant="link" size="sm" onClick={goToday} className="ml-2">Today</Button>}
            </div>
            <Button variant="outline" size="sm" onClick={goNext}>→</Button>
          </div>
        </CardHeader>
      </Card>

      {/* Entry form */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Log a reading</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label className="flex items-center gap-1 text-xs"><HeartPulse className="h-3.5 w-3.5 text-rose-500" /> Blood pressure</Label>
              <div className="flex items-center gap-1">
                <Input inputMode="numeric" placeholder="sys" value={form.systolic} onChange={update('systolic')} className="text-center" />
                <span className="text-muted-foreground">/</span>
                <Input inputMode="numeric" placeholder="dia" value={form.diastolic} onChange={update('diastolic')} className="text-center" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="flex items-center gap-1 text-xs"><HeartPulse className="h-3.5 w-3.5 text-rose-500" /> Heart rate <span className="text-muted-foreground">(bpm)</span></Label>
              <Input inputMode="numeric" placeholder="—" value={form.heartRate} onChange={update('heartRate')} />
            </div>
            <div className="space-y-1">
              <Label className="flex items-center gap-1 text-xs"><Droplet className="h-3.5 w-3.5 text-blue-500" /> SpO₂ <span className="text-muted-foreground">(%)</span></Label>
              <Input inputMode="numeric" placeholder="—" value={form.spo2} onChange={update('spo2')} />
            </div>
            <div className="space-y-1">
              <Label className="flex items-center gap-1 text-xs"><Thermometer className="h-3.5 w-3.5 text-amber-500" /> Temp</Label>
              <div className="flex items-center gap-1">
                <Input inputMode="decimal" placeholder="—" value={form.temperature} onChange={update('temperature')} />
                <Button type="button" variant="outline" size="sm" className="px-2 shrink-0" onClick={() => setTempUnit(u => u === 'F' ? 'C' : 'F')}>°{tempUnit}</Button>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="flex items-center gap-1 text-xs"><Wind className="h-3.5 w-3.5 text-teal-500" /> Resp rate <span className="text-muted-foreground">(/min)</span></Label>
              <Input inputMode="numeric" placeholder="—" value={form.respRate} onChange={update('respRate')} />
            </div>
            <div className="space-y-1">
              <Label className="flex items-center gap-1 text-xs"><Scale className="h-3.5 w-3.5 text-violet-500" /> Weight</Label>
              <div className="flex items-center gap-1">
                <Input inputMode="decimal" placeholder="—" value={form.weight} onChange={update('weight')} />
                <Button type="button" variant="outline" size="sm" className="px-2 shrink-0" onClick={() => setWeightUnit(u => u === 'lb' ? 'kg' : 'lb')}>{weightUnit}</Button>
              </div>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Notes <span className="text-muted-foreground">(optional)</span></Label>
            <Input placeholder="e.g. seated, after walking, post-meds…" value={form.notes} onChange={update('notes')} />
          </div>
          <Button onClick={handleSave} className="w-full">Save reading</Button>
        </CardContent>
      </Card>

      {/* Today's readings */}
      {todays.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Today's readings ({todays.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {todays.map(e => (
              <div key={e.id} className="flex items-start justify-between rounded-md bg-muted/30 px-3 py-2">
                <div className="flex-1">
                  <div className="font-medium text-sm">{summarize(e) || 'Note only'}</div>
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(e.timestamp), 'h:mm a')}{e.notes ? ` • ${e.notes}` : ''}
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => handleDelete(e.id)}>Delete</Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <p className="text-center text-xs text-muted-foreground">
        <Badge variant="outline" className="mr-1">📄</Badge>
        These readings save to your record and appear on your doctor PDF export.
      </p>
    </div>
  )
}
