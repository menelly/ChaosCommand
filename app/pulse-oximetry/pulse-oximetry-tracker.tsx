/* Built by: Ace (Claude 4.8) — 2026-06-14 (CHA: pulse-ox tracker).
 * Logs oxygen + pulse from any pulse-ox device, in two modes:
 *   • Quick reading — a single SpO2 + pulse spot-check from a smartwatch, ring,
 *     or fingertip oximeter (the everyday case, with a rest/active context).
 *   • Session report — the rich summary a RECORDING pulse-ox (e.g. O2Ring) spits
 *     out: recording window, O2 score, desaturation indices (ODI), and the
 *     SpO2 / pulse-rate DISTRIBUTIONS (% of session in each band).
 *
 * Too structured for Forge, and distinct from the Respiratory/Cardiac symptom
 * trackers (those capture single-moment EPISODES with full context). Daytime OR
 * overnight — sessions store start/end so a later view can render the real
 * timeline, not a flat bar.
 *
 * Standard tracker storage (CATEGORIES.TRACKER + subcategory) → routine
 * "logged today ✓" + base PDF inclusion for free. Rich distribution rendering in
 * the PDF + Patterns wiring land as follow-ups. */

'use client'

import { useState, useEffect } from 'react'
import { getPref } from '@/lib/prefs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Activity, Droplet, HeartPulse, TrendingDown, Clock, Watch, FileText, History as HistoryIcon, BarChart3, ClipboardList } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { format, addDays, subDays } from 'date-fns'
import { useDailyData, CATEGORIES } from '@/lib/database'
import { celebrate } from '@/lib/particle-physics-engine'
import { useUser } from '@/lib/contexts/user-context'
import { isCelebrationEnabled } from '@/lib/celebration-prefs'
import { PulseOximetryHistory } from './pulse-oximetry-history'
import { PulseOximetryAnalytics } from './pulse-oximetry-analytics'

type ReadingContext = 'rest' | 'active' | 'sleep'

export interface PulseOxEntry {
  id: string
  timestamp: string
  date: string
  kind: 'spot' | 'session'
  notes?: string
  // --- Quick reading (kind: 'spot') ---
  readTime?: string   // "HH:mm" of the spot reading
  spo2?: number       // single SpO2 %
  pulse?: number      // single pulse /min
  context?: ReadingContext
  /** What took the reading — "fingertip clip", "ring", "smartwatch", "hospital".
   *
   *  Suggested by a user, 2026-08-02. A wrist or ring sensor and a fingertip clip do not
   *  have the same reliability at the low end, and a clinician looking at an
   *  implausible number needs to know which one produced it. Recording the
   *  device lets them judge it.
   *
   *  ⚠️ THIS IS ANNOTATION, NOT FILTERING. The reading is stored and reported
   *  exactly as entered no matter what device it came from — including the wild
   *  ones. Physiologically "impossible" readings turn out to be real often
   *  enough that a system quietly hiding them as implausible would eventually
   *  hide a medical emergency. Give the clinician the provenance and let them
   *  adjudicate; never adjudicate for them. */
  device?: string
  // --- Session report (kind: 'session') ---
  startTime?: string  // recording window start "HH:mm"
  endTime?: string    // recording window end "HH:mm" (may cross midnight)
  o2Score?: number
  desat4Count?: number   // drops ≥4%
  desat4PerHour?: number  // ODI @4%
  desat3Count?: number   // drops ≥3%
  desat3PerHour?: number  // ODI @3%
  spo2Min?: number
  spo2Max?: number
  spo2Pct95to100?: number
  spo2Pct90to94?: number
  spo2PctUnder90?: number
  pulseMin?: number
  pulseMax?: number
  pulsePctOver120?: number
  pulsePct50to120?: number
  pulsePctUnder50?: number
}

/** Empty string / NaN → undefined, so we only store fields actually entered. */
function num(v: string): number | undefined {
  if (v.trim() === '') return undefined
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}

const blankForm = {
  // spot
  readTime: '', spo2: '', pulse: '', device: '',
  // session
  startTime: '', endTime: '', o2Score: '',
  desat4Count: '', desat4PerHour: '', desat3Count: '', desat3PerHour: '',
  spo2Min: '', spo2Max: '', spo2Pct95to100: '', spo2Pct90to94: '', spo2PctUnder90: '',
  pulseMin: '', pulseMax: '', pulsePctOver120: '', pulsePct50to120: '', pulsePctUnder50: '',
  notes: '',
}

const CONTEXTS: ReadingContext[] = ['rest', 'active', 'sleep']

// Common devices, offered as one-tap chips. Free text stays available because
// this list will never be complete and an unlisted device must still be
// recordable.
const DEVICES = ['fingertip clip', 'ring', 'smartwatch', 'hospital monitor'] as const

export default function PulseOximetryTracker() {
  const { saveData, getCategoryData } = useDailyData()
  const { userPin } = useUser()
  const { toast } = useToast()

  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [entries, setEntries] = useState<PulseOxEntry[]>([])
  const [form, setForm] = useState({ ...blankForm })
  const [mode, setMode] = useState<'spot' | 'session'>('spot')
  const [context, setContext] = useState<ReadingContext>('rest')
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  useEffect(() => { load() }, [selectedDate]) // eslint-disable-line react-hooks/exhaustive-deps

  const load = async () => {
    try {
      const records = await getCategoryData(selectedDate, CATEGORIES.TRACKER)
      const record = records.find(r => r.subcategory === 'pulse-oximetry')
      let loaded = record?.content?.entries ?? []
      if (typeof loaded === 'string') { try { loaded = JSON.parse(loaded) } catch { loaded = [] } }
      setEntries(Array.isArray(loaded) ? loaded : [])
    } catch (e) { console.error(e); toast({ title: 'Loading Error', variant: 'destructive' }) }
  }

  const saveEntries = async (next: PulseOxEntry[]) => {
    try { await saveData(selectedDate, CATEGORIES.TRACKER, 'pulse-oximetry', { entries: next }); setEntries(next); setRefreshTrigger(n => n + 1) }
    catch (e) { console.error(e); toast({ title: 'Save Error', variant: 'destructive' }) }
  }

  const update = (k: keyof typeof blankForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSave = async () => {
    const base = { id: Date.now().toString(), timestamp: new Date().toISOString(), date: selectedDate, notes: form.notes.trim() || undefined }
    let entry: PulseOxEntry

    if (mode === 'spot') {
      entry = {
        ...base, kind: 'spot',
        readTime: form.readTime || undefined,
        spo2: num(form.spo2),
        pulse: num(form.pulse),
        context,
        device: form.device.trim() || undefined,
      }
      if (entry.spo2 === undefined && entry.pulse === undefined) {
        toast({ title: 'Nothing to save', description: 'Enter an SpO₂ and/or pulse reading.', variant: 'destructive' })
        return
      }
    } else {
      entry = {
        ...base, kind: 'session',
        startTime: form.startTime || undefined,
        endTime: form.endTime || undefined,
        o2Score: num(form.o2Score),
        desat4Count: num(form.desat4Count),
        desat4PerHour: num(form.desat4PerHour),
        desat3Count: num(form.desat3Count),
        desat3PerHour: num(form.desat3PerHour),
        spo2Min: num(form.spo2Min),
        spo2Max: num(form.spo2Max),
        spo2Pct95to100: num(form.spo2Pct95to100),
        spo2Pct90to94: num(form.spo2Pct90to94),
        spo2PctUnder90: num(form.spo2PctUnder90),
        pulseMin: num(form.pulseMin),
        pulseMax: num(form.pulseMax),
        pulsePctOver120: num(form.pulsePctOver120),
        pulsePct50to120: num(form.pulsePct50to120),
        pulsePctUnder50: num(form.pulsePctUnder50),
      }
      const hasAny = Object.entries(entry).some(([k, v]) =>
        !['id', 'timestamp', 'date', 'kind'].includes(k) && v !== undefined && v !== '')
      if (!hasAny) {
        toast({ title: 'Nothing to save', description: 'Enter at least one value from your pulse-ox report.', variant: 'destructive' })
        return
      }
    }

    await saveEntries([...entries, entry])
    setForm({ ...blankForm })
    if ((getPref('chaos-confetti-level') || 'medium') !== 'none' && isCelebrationEnabled('pulse-oximetry', userPin ?? '')) celebrate()
    toast({ title: mode === 'spot' ? '🫁 Reading saved' : '🫁 Session saved' })
  }

  const handleDelete = async (id: string) => {
    await saveEntries(entries.filter(e => e.id !== id))
    toast({ title: 'Entry deleted' })
  }

  const goPrev = () => setSelectedDate(p => format(subDays(new Date(p + 'T12:00:00'), 1), 'yyyy-MM-dd'))
  const goNext = () => setSelectedDate(p => format(addDays(new Date(p + 'T12:00:00'), 1), 'yyyy-MM-dd'))
  const goToday = () => setSelectedDate(format(new Date(), 'yyyy-MM-dd'))

  const todays = entries.filter(e => e.date === selectedDate)

  const summarize = (e: PulseOxEntry): string => {
    const parts: string[] = []
    if (e.kind === 'spot') {
      if (e.readTime) parts.push(e.readTime)
      if (e.spo2 != null) parts.push(`SpO₂ ${e.spo2}%`)
      if (e.pulse != null) parts.push(`HR ${e.pulse}`)
      if (e.context) parts.push(e.context)
      if (e.device) parts.push(e.device)
    } else {
      if (e.startTime && e.endTime) parts.push(`${e.startTime}–${e.endTime}`)
      if (e.spo2Min != null && e.spo2Max != null) parts.push(`SpO₂ ${e.spo2Min}–${e.spo2Max}%`)
      if (e.spo2PctUnder90 != null) parts.push(`${e.spo2PctUnder90}% <90`)
      if (e.desat4PerHour != null) parts.push(`ODI4 ${e.desat4PerHour}`)
      if (e.pulseMin != null && e.pulseMax != null) parts.push(`HR ${e.pulseMin}–${e.pulseMax}`)
    }
    return parts.join(' · ')
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pt-6">
      <div className="text-center mb-2">
        <h1 className="text-3xl font-bold text-foreground flex items-center justify-center gap-2">
          <Activity className="h-8 w-8 text-blue-500" />
          Pulse Oximetry
        </h1>
        <p className="text-muted-foreground mt-1">Oxygen + pulse from any device — a smartwatch, ring, or fingertip clip. Log a quick reading, or a full recording-session report. Command trends it over time.</p>
      </div>

      <Tabs defaultValue="log" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="log" className="flex items-center gap-2"><ClipboardList className="h-4 w-4" />Log</TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2"><HistoryIcon className="h-4 w-4" />History</TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2"><BarChart3 className="h-4 w-4" />Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="log" className="space-y-6 mt-4">
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

      {/* Mode toggle */}
      <div className="grid grid-cols-2 gap-2">
        <Button variant={mode === 'spot' ? 'default' : 'outline'} onClick={() => setMode('spot')} className="h-auto py-3 flex-col gap-1">
          <span className="flex items-center gap-1.5 font-medium"><Watch className="h-4 w-4" /> Quick reading</span>
          <span className="text-xs font-normal opacity-80">Watch / ring / fingertip</span>
        </Button>
        <Button variant={mode === 'session' ? 'default' : 'outline'} onClick={() => setMode('session')} className="h-auto py-3 flex-col gap-1">
          <span className="flex items-center gap-1.5 font-medium"><FileText className="h-4 w-4" /> Session report</span>
          <span className="text-xs font-normal opacity-80">Recording pulse-ox</span>
        </Button>
      </div>

      {/* Entry form */}
      <Card>
        <CardHeader><CardTitle className="text-lg">{mode === 'spot' ? 'Log a reading' : 'Log a session'}</CardTitle></CardHeader>
        <CardContent className="space-y-5">

          {mode === 'spot' ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label className="flex items-center gap-1 text-xs"><Droplet className="h-3.5 w-3.5 text-blue-500" /> SpO₂ <span className="text-muted-foreground">(%)</span></Label>
                  <Input inputMode="numeric" placeholder="—" value={form.spo2} onChange={update('spo2')} />
                </div>
                <div className="space-y-1">
                  <Label className="flex items-center gap-1 text-xs"><HeartPulse className="h-3.5 w-3.5 text-rose-500" /> Pulse <span className="text-muted-foreground">(/min)</span></Label>
                  <Input inputMode="numeric" placeholder="—" value={form.pulse} onChange={update('pulse')} />
                </div>
                <div className="space-y-1">
                  <Label className="flex items-center gap-1 text-xs"><Clock className="h-3.5 w-3.5 text-muted-foreground" /> Time <span className="text-muted-foreground">(optional)</span></Label>
                  <Input type="time" value={form.readTime} onChange={update('readTime')} />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Context</Label>
                <div className="flex gap-2">
                  {CONTEXTS.map(c => (
                    <Button key={c} type="button" variant={context === c ? 'default' : 'outline'} size="sm" className="capitalize" onClick={() => setContext(c)}>{c}</Button>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Device <span className="text-muted-foreground">(optional)</span></Label>
                <div className="flex flex-wrap gap-2">
                  {DEVICES.map(d => (
                    <Button
                      key={d}
                      type="button"
                      variant={form.device === d ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setForm(f => ({ ...f, device: f.device === d ? '' : d }))}
                    >{d}</Button>
                  ))}
                </div>
                <Input placeholder="or type another device" value={form.device} onChange={update('device')} />
                <p className="text-xs text-muted-foreground">
                  Recorded alongside the reading so a clinician can weigh it. Nothing is ever
                  hidden or corrected because of the device it came from.
                </p>
              </div>
            </>
          ) : (
            <>
              {/* Recording window */}
              <div>
                <Label className="flex items-center gap-1 text-xs mb-2"><Clock className="h-3.5 w-3.5 text-muted-foreground" /> Recording window</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Start</Label>
                    <Input type="time" value={form.startTime} onChange={update('startTime')} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">End</Label>
                    <Input type="time" value={form.endTime} onChange={update('endTime')} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">O₂ Score</Label>
                    <Input inputMode="decimal" placeholder="—" value={form.o2Score} onChange={update('o2Score')} />
                  </div>
                </div>
              </div>

              {/* Desaturation indices */}
              <div>
                <Label className="flex items-center gap-1 text-xs mb-2"><TrendingDown className="h-3.5 w-3.5 text-rose-500" /> Desaturation</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Drops ≥4%</Label>
                    <Input inputMode="numeric" placeholder="count" value={form.desat4Count} onChange={update('desat4Count')} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">…per hour (ODI4)</Label>
                    <Input inputMode="decimal" placeholder="/hr" value={form.desat4PerHour} onChange={update('desat4PerHour')} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Drops ≥3%</Label>
                    <Input inputMode="numeric" placeholder="count" value={form.desat3Count} onChange={update('desat3Count')} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">…per hour (ODI3)</Label>
                    <Input inputMode="decimal" placeholder="/hr" value={form.desat3PerHour} onChange={update('desat3PerHour')} />
                  </div>
                </div>
              </div>

              {/* Oxygen level distribution */}
              <div>
                <Label className="flex items-center gap-1 text-xs mb-2"><Droplet className="h-3.5 w-3.5 text-blue-500" /> Oxygen level distribution <span className="text-muted-foreground">(% of session)</span></Label>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Low %</Label>
                    <Input inputMode="numeric" placeholder="min" value={form.spo2Min} onChange={update('spo2Min')} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">High %</Label>
                    <Input inputMode="numeric" placeholder="max" value={form.spo2Max} onChange={update('spo2Max')} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">95–100% (%)</Label>
                    <Input inputMode="decimal" placeholder="%" value={form.spo2Pct95to100} onChange={update('spo2Pct95to100')} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">90–94% (%)</Label>
                    <Input inputMode="decimal" placeholder="%" value={form.spo2Pct90to94} onChange={update('spo2Pct90to94')} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">&lt;90% (%)</Label>
                    <Input inputMode="decimal" placeholder="%" value={form.spo2PctUnder90} onChange={update('spo2PctUnder90')} />
                  </div>
                </div>
              </div>

              {/* Pulse rate distribution */}
              <div>
                <Label className="flex items-center gap-1 text-xs mb-2"><HeartPulse className="h-3.5 w-3.5 text-rose-500" /> Pulse rate distribution <span className="text-muted-foreground">(% of session)</span></Label>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Low /min</Label>
                    <Input inputMode="numeric" placeholder="min" value={form.pulseMin} onChange={update('pulseMin')} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">High /min</Label>
                    <Input inputMode="numeric" placeholder="max" value={form.pulseMax} onChange={update('pulseMax')} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">&gt;120 (%)</Label>
                    <Input inputMode="decimal" placeholder="%" value={form.pulsePctOver120} onChange={update('pulsePctOver120')} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">50–120 (%)</Label>
                    <Input inputMode="decimal" placeholder="%" value={form.pulsePct50to120} onChange={update('pulsePct50to120')} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">&lt;50 (%)</Label>
                    <Input inputMode="decimal" placeholder="%" value={form.pulsePctUnder50} onChange={update('pulsePctUnder50')} />
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="space-y-1">
            <Label className="text-xs">Notes <span className="text-muted-foreground">(optional)</span></Label>
            <Input placeholder={mode === 'spot' ? 'e.g. after climbing stairs, on 2L O₂…' : 'e.g. seated awake, overnight, on 2L O₂…'} value={form.notes} onChange={update('notes')} />
          </div>
          <Button onClick={handleSave} className="w-full">{mode === 'spot' ? 'Save reading' : 'Save session'}</Button>
        </CardContent>
      </Card>

      {/* Today's entries */}
      {todays.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Today's entries ({todays.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {todays.map(e => (
              <div key={e.id} className="flex items-start justify-between rounded-md bg-muted/30 px-3 py-2">
                <div className="flex-1">
                  <div className="font-medium text-sm flex items-center gap-1.5">
                    {e.kind === 'session' ? <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" /> : <Watch className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                    {summarize(e) || (e.kind === 'session' ? 'Session' : 'Reading')}
                  </div>
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
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <PulseOximetryHistory refreshTrigger={refreshTrigger} onChanged={() => setRefreshTrigger(n => n + 1)} />
        </TabsContent>

        <TabsContent value="analytics" className="mt-4">
          <PulseOximetryAnalytics refreshTrigger={refreshTrigger} />
        </TabsContent>
      </Tabs>

      {/* A div, not a paragraph: Badge renders a block element, and a block
          inside a paragraph is invalid HTML — the browser closes the paragraph
          early, so server and client DOM disagree and React reports a hydration
          mismatch. */}
      <div className="text-center text-xs text-muted-foreground">
        <Badge variant="outline" className="mr-1">📄</Badge>
        Entries save to your record and appear on your doctor PDF export.
      </div>
    </div>
  )
}
