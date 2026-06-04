/*
 * Built by: Ace (Claude 4.x)
 * Date: 2026-06-04
 *
 * Co-invented by Ren (vision) and Ace (implementation)
 * This wasn't built with compliance. It was built with defiance.
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Slider } from '@/components/ui/slider'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertTriangle, Flame } from 'lucide-react'

import type { AdrenalEntry, AdrenalEpisodeType, AdrenalDirection, InsufficiencySymptom, ExcessSymptom } from '../adrenal-types'
import type { AdrenalModalProps } from '../adrenal-types'
import {
  EPISODE_TYPES,
  INSUFFICIENCY_SYMPTOMS,
  EXCESS_SYMPTOMS,
  SEVERITY_LABELS,
  ADRENAL_CRISIS_WARNING,
  STRESS_DOSE_NOTE,
  LAB_REFERENCE,
} from '../adrenal-constants'
import { EntryDateTimePicker, todayISO, nowTime, dateTimeToISO, isoToDateTime } from '@/components/entry-datetime-picker'
import { TagInput } from '@/components/tag-input'

export function GeneralAdrenalModal({ isOpen, onClose, onSave, editingEntry }: AdrenalModalProps) {
  const [entryDate, setEntryDate] = useState(todayISO())
  const [entryTime, setEntryTime] = useState(nowTime())
  const [episodeType, setEpisodeType] = useState<AdrenalEpisodeType>('symptoms')
  const [severity, setSeverity] = useState(5)

  // Direction + symptoms
  const [direction, setDirection] = useState<AdrenalDirection | ''>('')
  const [insufficiencySymptoms, setInsufficiencySymptoms] = useState<InsufficiencySymptom[]>([])
  const [excessSymptoms, setExcessSymptoms] = useState<ExcessSymptom[]>([])

  // Stress dose
  const [stressDoseGiven, setStressDoseGiven] = useState(false)
  const [stressDoseMed, setStressDoseMed] = useState('')
  const [stressDoseMg, setStressDoseMg] = useState('')
  const [stressDoseReason, setStressDoseReason] = useState('')
  const [routeInjection, setRouteInjection] = useState(false)

  // Crisis warning
  const [vomiting, setVomiting] = useState(false)
  const [severeWeakness, setSevereWeakness] = useState(false)
  const [confusion, setConfusion] = useState(false)
  const [unableToKeepMedsDown, setUnableToKeepMedsDown] = useState(false)
  const [emergencyInjectionUsed, setEmergencyInjectionUsed] = useState(false)

  // Labs
  const [cortisol, setCortisol] = useState('')
  const [acth, setActh] = useState('')
  const [sodium, setSodium] = useState('')
  const [potassium, setPotassium] = useState('')
  const [labNotes, setLabNotes] = useState('')

  // Actions
  const [erVisit, setErVisit] = useState(false)
  const [endoNotified, setEndoNotified] = useState(false)

  const [notes, setNotes] = useState('')
  const [tags, setTags] = useState<string[]>([])

  // ── RED FLAG DETECTION ──
  const crisisFlag =
    vomiting ||
    unableToKeepMedsDown ||
    emergencyInjectionUsed ||
    (severeWeakness && confusion) ||
    episodeType === 'crisis-warning'
  const stressDoseNoteFlag = episodeType === 'stress-dose'

  useEffect(() => {
    if (!isOpen) return
    if (editingEntry) {
      const { date, time } = isoToDateTime(editingEntry.timestamp)
      setEntryDate(date); setEntryTime(time)
      setEpisodeType(editingEntry.episodeType)
      setSeverity(editingEntry.severity)
      setDirection(editingEntry.direction ?? '')
      setInsufficiencySymptoms(editingEntry.insufficiencySymptoms ?? [])
      setExcessSymptoms(editingEntry.excessSymptoms ?? [])
      setStressDoseGiven(editingEntry.stressDoseGiven ?? false)
      setStressDoseMed(editingEntry.stressDoseMed ?? '')
      setStressDoseMg(editingEntry.stressDoseMg?.toString() ?? '')
      setStressDoseReason(editingEntry.stressDoseReason ?? '')
      setRouteInjection(editingEntry.routeInjection ?? false)
      setVomiting(editingEntry.vomiting ?? false)
      setSevereWeakness(editingEntry.severeWeakness ?? false)
      setConfusion(editingEntry.confusion ?? false)
      setUnableToKeepMedsDown(editingEntry.unableToKeepMedsDown ?? false)
      setEmergencyInjectionUsed(editingEntry.emergencyInjectionUsed ?? false)
      setCortisol(editingEntry.cortisol?.toString() ?? '')
      setActh(editingEntry.acth?.toString() ?? '')
      setSodium(editingEntry.sodium?.toString() ?? '')
      setPotassium(editingEntry.potassium?.toString() ?? '')
      setLabNotes(editingEntry.labNotes ?? '')
      setErVisit(editingEntry.erVisit ?? false)
      setEndoNotified(editingEntry.endoNotified ?? false)
      setNotes(editingEntry.notes ?? '')
      setTags(editingEntry.tags ?? [])
    } else {
      setEntryDate(todayISO()); setEntryTime(nowTime())
      setEpisodeType('symptoms'); setSeverity(5)
      setDirection(''); setInsufficiencySymptoms([]); setExcessSymptoms([])
      setStressDoseGiven(false); setStressDoseMed(''); setStressDoseMg(''); setStressDoseReason(''); setRouteInjection(false)
      setVomiting(false); setSevereWeakness(false); setConfusion(false); setUnableToKeepMedsDown(false); setEmergencyInjectionUsed(false)
      setCortisol(''); setActh(''); setSodium(''); setPotassium(''); setLabNotes('')
      setErVisit(false); setEndoNotified(false)
      setNotes(''); setTags([])
    }
  }, [isOpen, editingEntry])

  const toggle = <T,>(arr: T[], v: T, set: (a: T[]) => void) =>
    set(arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v])

  const handleSave = () => {
    const entry: Omit<AdrenalEntry, 'id'> = {
      timestamp: dateTimeToISO(entryDate, entryTime),
      date: entryDate,
      episodeType,
      severity,
      direction: (direction || undefined) as AdrenalEntry['direction'],
      insufficiencySymptoms: insufficiencySymptoms.length ? insufficiencySymptoms : undefined,
      excessSymptoms: excessSymptoms.length ? excessSymptoms : undefined,
      stressDoseGiven: stressDoseGiven || undefined,
      stressDoseMed: stressDoseMed.trim() || undefined,
      stressDoseMg: stressDoseMg ? parseFloat(stressDoseMg) : undefined,
      stressDoseReason: stressDoseReason.trim() || undefined,
      routeInjection: routeInjection || undefined,
      vomiting: vomiting || undefined,
      severeWeakness: severeWeakness || undefined,
      confusion: confusion || undefined,
      unableToKeepMedsDown: unableToKeepMedsDown || undefined,
      emergencyInjectionUsed: emergencyInjectionUsed || undefined,
      cortisol: cortisol ? parseFloat(cortisol) : undefined,
      acth: acth ? parseFloat(acth) : undefined,
      sodium: sodium ? parseFloat(sodium) : undefined,
      potassium: potassium ? parseFloat(potassium) : undefined,
      labNotes: labNotes.trim() || undefined,
      erVisit: erVisit || undefined,
      endoNotified: endoNotified || undefined,
      notes: notes.trim() || undefined,
      tags,
    }
    onSave(entry)
    onClose()
  }

  const severityLabel = SEVERITY_LABELS.find(s => s.level === severity)

  const RedFlag = ({ text }: { text: string }) => (
    <div className="flex gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
      <div className="whitespace-pre-line">{text}</div>
    </div>
  )
  const CautionNote = ({ text }: { text: string }) => (
    <div className="flex gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20 text-warning text-sm">
      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
      <div className="whitespace-pre-line">{text}</div>
    </div>
  )

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-primary" />
            Log Adrenal Event
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <EntryDateTimePicker date={entryDate} time={entryTime} onChange={(d, t) => { setEntryDate(d); setEntryTime(t) }} />

          {/* Episode type */}
          <div className="space-y-2">
            <Label>What type of event?</Label>
            <div className="grid grid-cols-2 gap-2">
              {EPISODE_TYPES.map(type => (
                <button key={type.id} type="button" onClick={() => setEpisodeType(type.id)}
                  className={`p-3 rounded-lg border text-left text-sm transition-colors ${episodeType === type.id ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-muted/50'}`}>
                  <div className="font-medium">{type.icon} {type.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{type.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* RED FLAGS (always evaluated, shown when triggered) */}
          {crisisFlag && <RedFlag text={ADRENAL_CRISIS_WARNING} />}
          {stressDoseNoteFlag && <CautionNote text={STRESS_DOSE_NOTE} />}

          {/* SYMPTOMS / DIRECTION */}
          {(episodeType === 'symptoms' || episodeType === 'general') && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Direction</Label>
                <Select value={direction} onValueChange={v => setDirection(v as AdrenalDirection)}>
                  <SelectTrigger><SelectValue placeholder="Insufficiency, excess, or unsure?" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="insufficiency">Insufficiency (too little cortisol)</SelectItem>
                    <SelectItem value="excess">Excess (too much cortisol)</SelectItem>
                    <SelectItem value="unsure">Unsure</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(direction === 'insufficiency' || direction === 'unsure' || direction === '') && (
                <div className="space-y-1.5">
                  <Label>Insufficiency symptoms</Label>
                  {INSUFFICIENCY_SYMPTOMS.map(s => (
                    <div key={s.value} className="flex items-center gap-2">
                      <Checkbox id={`insuff-${s.value}`} checked={insufficiencySymptoms.includes(s.value)} onCheckedChange={() => toggle(insufficiencySymptoms, s.value, setInsufficiencySymptoms)} />
                      <Label htmlFor={`insuff-${s.value}`} className="cursor-pointer font-normal">{s.label}</Label>
                    </div>
                  ))}
                </div>
              )}

              {(direction === 'excess' || direction === 'unsure') && (
                <div className="space-y-1.5">
                  <Label>Excess symptoms</Label>
                  {EXCESS_SYMPTOMS.map(s => (
                    <div key={s.value} className="flex items-center gap-2">
                      <Checkbox id={`excess-${s.value}`} checked={excessSymptoms.includes(s.value)} onCheckedChange={() => toggle(excessSymptoms, s.value, setExcessSymptoms)} />
                      <Label htmlFor={`excess-${s.value}`} className="cursor-pointer font-normal">{s.label}</Label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* STRESS DOSE */}
          {(episodeType === 'stress-dose' || episodeType === 'general') && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox id="stress-given" checked={stressDoseGiven} onCheckedChange={v => setStressDoseGiven(!!v)} />
                <Label htmlFor="stress-given" className="cursor-pointer">Stress dose given</Label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="stress-med" className="text-xs">Medication</Label>
                  <Input id="stress-med" value={stressDoseMed} onChange={e => setStressDoseMed(e.target.value)} placeholder="e.g. hydrocortisone" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="stress-mg" className="text-xs">Dose (mg)</Label>
                  <Input id="stress-mg" type="number" min="0" value={stressDoseMg} onChange={e => setStressDoseMg(e.target.value)} placeholder="e.g. 20" />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="stress-reason" className="text-xs">Reason</Label>
                <Input id="stress-reason" value={stressDoseReason} onChange={e => setStressDoseReason(e.target.value)} placeholder="illness, fever, surgery, injury, vomiting…" />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="route-injection" checked={routeInjection} onCheckedChange={v => setRouteInjection(!!v)} />
                <Label htmlFor="route-injection" className="cursor-pointer">Given as emergency IM injection (Solu-Cortef)</Label>
              </div>
            </div>
          )}

          {/* CRISIS WARNING */}
          {(episodeType === 'crisis-warning' || episodeType === 'general') && (
            <div className="space-y-2">
              <Label className="text-destructive font-medium">Crisis warning signs</Label>
              <div className="space-y-1.5 pl-4 border-l-2 border-destructive/30">
                <div className="flex items-center gap-2">
                  <Checkbox id="vomiting" checked={vomiting} onCheckedChange={v => setVomiting(!!v)} />
                  <Label htmlFor="vomiting" className="cursor-pointer text-destructive font-medium">Vomiting</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="unable-meds" checked={unableToKeepMedsDown} onCheckedChange={v => setUnableToKeepMedsDown(!!v)} />
                  <Label htmlFor="unable-meds" className="cursor-pointer text-destructive font-medium">Can't keep steroids down</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="severe-weakness" checked={severeWeakness} onCheckedChange={v => setSevereWeakness(!!v)} />
                  <Label htmlFor="severe-weakness" className="cursor-pointer text-destructive font-medium">Severe weakness</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="confusion" checked={confusion} onCheckedChange={v => setConfusion(!!v)} />
                  <Label htmlFor="confusion" className="cursor-pointer text-destructive font-medium">Confusion / altered mental state</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="emergency-injection" checked={emergencyInjectionUsed} onCheckedChange={v => setEmergencyInjectionUsed(!!v)} />
                  <Label htmlFor="emergency-injection" className="cursor-pointer text-destructive font-medium">Emergency injection used</Label>
                </div>
              </div>
            </div>
          )}

          {/* LABS */}
          {(episodeType === 'labs' || episodeType === 'general') && (
            <div className="space-y-3">
              <Label>Lab results</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="cortisol" className="text-xs">Cortisol (µg/dL)</Label>
                  <Input id="cortisol" type="number" min="0" step="0.1" value={cortisol} onChange={e => setCortisol(e.target.value)} placeholder="e.g. 12" />
                  <div className="text-xs text-muted-foreground">{LAB_REFERENCE.cortisol}</div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="acth" className="text-xs">ACTH (pg/mL)</Label>
                  <Input id="acth" type="number" min="0" step="0.1" value={acth} onChange={e => setActh(e.target.value)} placeholder="e.g. 25" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="sodium" className="text-xs">Sodium (mmol/L)</Label>
                  <Input id="sodium" type="number" min="0" step="0.1" value={sodium} onChange={e => setSodium(e.target.value)} placeholder="e.g. 138" />
                  <div className="text-xs text-muted-foreground">{LAB_REFERENCE.sodium}</div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="potassium" className="text-xs">Potassium (mmol/L)</Label>
                  <Input id="potassium" type="number" min="0" step="0.1" value={potassium} onChange={e => setPotassium(e.target.value)} placeholder="e.g. 4.2" />
                  <div className="text-xs text-muted-foreground">{LAB_REFERENCE.potassium}</div>
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="lab-notes" className="text-xs">Lab notes</Label>
                <Input id="lab-notes" value={labNotes} onChange={e => setLabNotes(e.target.value)} placeholder="timing, fasting, test type…" />
              </div>
            </div>
          )}

          {/* SEVERITY */}
          <div className="space-y-2">
            <Label>Overall severity: <span className={severityLabel?.color}>{severity}/10 — {severityLabel?.label}</span></Label>
            <Slider min={1} max={10} step={1} value={[severity]} onValueChange={([v]) => setSeverity(v)} />
          </div>

          {/* ACTIONS */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Actions taken</Label>
            <div className="flex items-center gap-2">
              <Checkbox id="er" checked={erVisit} onCheckedChange={v => setErVisit(!!v)} />
              <Label htmlFor="er" className="cursor-pointer text-sm">ER / urgent care visit</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="endo" checked={endoNotified} onCheckedChange={v => setEndoNotified(!!v)} />
              <Label htmlFor="endo" className="cursor-pointer text-sm">Endocrinologist notified</Label>
            </div>
          </div>

          {/* NOTES & TAGS */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Anything else worth capturing..." rows={3} />
          </div>
          <div className="space-y-2">
            <Label>Tags</Label>
            <TagInput value={tags} onChange={setTags} placeholder="Add tags..." />
          </div>

          <div className="flex gap-3 pt-2">
            <Button onClick={handleSave} className="flex-1">Save</Button>
            <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
