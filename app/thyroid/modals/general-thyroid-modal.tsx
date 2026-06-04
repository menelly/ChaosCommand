/*
 * Built by: Ace (Claude 4.x)
 * Date: 2026-06-04
 *
 * Thyroid entry modal. Contextual fields by episode type (symptoms / labs /
 * medication / general), with real-time red-flag banners for the
 * safety-critical patterns (thyroid storm, myxedema crisis, Graves' eye).
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
import { AlertTriangle } from 'lucide-react'

import type { ThyroidEntry, ThyroidEpisodeType, ThyroidDirection, HypoSymptom, HyperSymptom } from '../thyroid-types'
import type { ThyroidModalProps } from '../thyroid-types'
import {
  EPISODE_TYPES,
  HYPO_SYMPTOMS,
  HYPER_SYMPTOMS,
  SEVERITY_LABELS,
  THYROID_STORM_WARNING,
  MYXEDEMA_WARNING,
  GRAVES_EYE_NOTE,
  LAB_REFERENCE,
} from '../thyroid-constants'
import { EntryDateTimePicker, todayISO, nowTime, dateTimeToISO, isoToDateTime } from '@/components/entry-datetime-picker'
import { TagInput } from '@/components/tag-input'

export function GeneralThyroidModal({ isOpen, onClose, onSave, editingEntry }: ThyroidModalProps) {
  const [entryDate, setEntryDate] = useState(todayISO())
  const [entryTime, setEntryTime] = useState(nowTime())
  const [episodeType, setEpisodeType] = useState<ThyroidEpisodeType>('symptoms')
  const [severity, setSeverity] = useState(5)

  // Direction + symptoms
  const [direction, setDirection] = useState<ThyroidDirection | ''>('')
  const [hypoSymptoms, setHypoSymptoms] = useState<HypoSymptom[]>([])
  const [hyperSymptoms, setHyperSymptoms] = useState<HyperSymptom[]>([])

  // Labs
  const [tsh, setTsh] = useState('')
  const [freeT4, setFreeT4] = useState('')
  const [freeT3, setFreeT3] = useState('')
  const [tpoAntibodies, setTpoAntibodies] = useState('')
  const [trab, setTrab] = useState('')
  const [labNotes, setLabNotes] = useState('')

  // Medication
  const [medName, setMedName] = useState('')
  const [medDoseMcg, setMedDoseMcg] = useState('')
  const [takenFasting, setTakenFasting] = useState(false)
  const [recentDoseChange, setRecentDoseChange] = useState(false)

  // Red-flag checkboxes
  const [feverPresent, setFeverPresent] = useState(false)
  const [confusionAgitation, setConfusionAgitation] = useState(false)
  const [extremeColdDrowsy, setExtremeColdDrowsy] = useState(false)

  // Actions
  const [erVisit, setErVisit] = useState(false)
  const [endoNotified, setEndoNotified] = useState(false)

  const [notes, setNotes] = useState('')
  const [tags, setTags] = useState<string[]>([])

  // ── RED FLAG DETECTION ──
  const thyroidStorm = feverPresent && confusionAgitation
  const myxedema = extremeColdDrowsy
  const gravesEye = hyperSymptoms.includes('eye-changes')

  useEffect(() => {
    if (!isOpen) return
    if (editingEntry) {
      const { date, time } = isoToDateTime(editingEntry.timestamp)
      setEntryDate(date); setEntryTime(time)
      setEpisodeType(editingEntry.episodeType)
      setSeverity(editingEntry.severity)
      setDirection(editingEntry.direction ?? '')
      setHypoSymptoms(editingEntry.hypoSymptoms ?? [])
      setHyperSymptoms(editingEntry.hyperSymptoms ?? [])
      setTsh(editingEntry.tsh?.toString() ?? '')
      setFreeT4(editingEntry.freeT4?.toString() ?? '')
      setFreeT3(editingEntry.freeT3?.toString() ?? '')
      setTpoAntibodies(editingEntry.tpoAntibodies?.toString() ?? '')
      setTrab(editingEntry.trab?.toString() ?? '')
      setLabNotes(editingEntry.labNotes ?? '')
      setMedName(editingEntry.medName ?? '')
      setMedDoseMcg(editingEntry.medDoseMcg?.toString() ?? '')
      setTakenFasting(editingEntry.takenFasting ?? false)
      setRecentDoseChange(editingEntry.recentDoseChange ?? false)
      setFeverPresent(editingEntry.feverPresent ?? false)
      setConfusionAgitation(editingEntry.confusionAgitation ?? false)
      setExtremeColdDrowsy(editingEntry.extremeColdDrowsy ?? false)
      setErVisit(editingEntry.erVisit ?? false)
      setEndoNotified(editingEntry.endoNotified ?? false)
      setNotes(editingEntry.notes ?? '')
      setTags(editingEntry.tags ?? [])
    } else {
      setEntryDate(todayISO()); setEntryTime(nowTime())
      setEpisodeType('symptoms'); setSeverity(5)
      setDirection(''); setHypoSymptoms([]); setHyperSymptoms([])
      setTsh(''); setFreeT4(''); setFreeT3(''); setTpoAntibodies(''); setTrab(''); setLabNotes('')
      setMedName(''); setMedDoseMcg(''); setTakenFasting(false); setRecentDoseChange(false)
      setFeverPresent(false); setConfusionAgitation(false); setExtremeColdDrowsy(false)
      setErVisit(false); setEndoNotified(false)
      setNotes(''); setTags([])
    }
  }, [isOpen, editingEntry])

  const toggle = <T,>(arr: T[], v: T, set: (a: T[]) => void) =>
    set(arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v])

  const handleSave = () => {
    const entry: Omit<ThyroidEntry, 'id'> = {
      timestamp: dateTimeToISO(entryDate, entryTime),
      date: entryDate,
      episodeType,
      severity,
      direction: (direction || undefined) as ThyroidEntry['direction'],
      hypoSymptoms: hypoSymptoms.length ? hypoSymptoms : undefined,
      hyperSymptoms: hyperSymptoms.length ? hyperSymptoms : undefined,
      tsh: tsh ? parseFloat(tsh) : undefined,
      freeT4: freeT4 ? parseFloat(freeT4) : undefined,
      freeT3: freeT3 ? parseFloat(freeT3) : undefined,
      tpoAntibodies: tpoAntibodies ? parseFloat(tpoAntibodies) : undefined,
      trab: trab ? parseFloat(trab) : undefined,
      labNotes: labNotes.trim() || undefined,
      medName: medName.trim() || undefined,
      medDoseMcg: medDoseMcg ? parseFloat(medDoseMcg) : undefined,
      takenFasting: takenFasting || undefined,
      recentDoseChange: recentDoseChange || undefined,
      feverPresent: feverPresent || undefined,
      confusionAgitation: confusionAgitation || undefined,
      extremeColdDrowsy: extremeColdDrowsy || undefined,
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
            <span className="text-xl">🦋</span>
            Log Thyroid Event
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
          {thyroidStorm && <RedFlag text={THYROID_STORM_WARNING} />}
          {myxedema && <RedFlag text={MYXEDEMA_WARNING} />}
          {gravesEye && <CautionNote text={GRAVES_EYE_NOTE} />}

          {/* SYMPTOMS */}
          {(episodeType === 'symptoms' || episodeType === 'general') && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Which direction does it feel like?</Label>
                <Select value={direction} onValueChange={v => setDirection(v as ThyroidDirection)}>
                  <SelectTrigger><SelectValue placeholder="Select direction" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hypo">Hypo (under-active — slow, cold, tired)</SelectItem>
                    <SelectItem value="hyper">Hyper (over-active — racing, hot, wired)</SelectItem>
                    <SelectItem value="mixed">Mixed / swinging</SelectItem>
                    <SelectItem value="unsure">Not sure</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Hypothyroid symptoms (under-active)</Label>
                <div className="grid grid-cols-1 gap-1.5">
                  {HYPO_SYMPTOMS.map(s => (
                    <div key={s.value} className="flex items-center gap-2">
                      <Checkbox id={`hypo-${s.value}`} checked={hypoSymptoms.includes(s.value)} onCheckedChange={() => toggle(hypoSymptoms, s.value, setHypoSymptoms)} />
                      <Label htmlFor={`hypo-${s.value}`} className="cursor-pointer font-normal">{s.label}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Hyperthyroid symptoms (over-active)</Label>
                <div className="grid grid-cols-1 gap-1.5">
                  {HYPER_SYMPTOMS.map(s => (
                    <div key={s.value} className="flex items-center gap-2">
                      <Checkbox id={`hyper-${s.value}`} checked={hyperSymptoms.includes(s.value)} onCheckedChange={() => toggle(hyperSymptoms, s.value, setHyperSymptoms)} />
                      <Label htmlFor={`hyper-${s.value}`} className="cursor-pointer font-normal">{s.label}</Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* LABS */}
          {(episodeType === 'labs' || episodeType === 'general') && (
            <div className="space-y-3">
              <Label>Lab values</Label>
              <div className="space-y-1">
                <Label htmlFor="tsh" className="text-xs">TSH</Label>
                <Input id="tsh" type="number" step="any" min="0" value={tsh} onChange={e => setTsh(e.target.value)} placeholder="e.g. 2.5" />
                <p className="text-xs text-muted-foreground">{LAB_REFERENCE.tsh}</p>
              </div>
              <div className="space-y-1">
                <Label htmlFor="ft4" className="text-xs">Free T4</Label>
                <Input id="ft4" type="number" step="any" min="0" value={freeT4} onChange={e => setFreeT4(e.target.value)} placeholder="e.g. 1.2" />
                <p className="text-xs text-muted-foreground">{LAB_REFERENCE.freeT4}</p>
              </div>
              <div className="space-y-1">
                <Label htmlFor="ft3" className="text-xs">Free T3</Label>
                <Input id="ft3" type="number" step="any" min="0" value={freeT3} onChange={e => setFreeT3(e.target.value)} placeholder="e.g. 3.1" />
                <p className="text-xs text-muted-foreground">{LAB_REFERENCE.freeT3}</p>
              </div>
              <div className="space-y-1">
                <Label htmlFor="tpo" className="text-xs">TPO antibodies (Hashimoto's marker)</Label>
                <Input id="tpo" type="number" step="any" min="0" value={tpoAntibodies} onChange={e => setTpoAntibodies(e.target.value)} placeholder="e.g. 35" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="trab" className="text-xs">TRAb (TSH-receptor / Graves' marker)</Label>
                <Input id="trab" type="number" step="any" min="0" value={trab} onChange={e => setTrab(e.target.value)} placeholder="e.g. 1.2" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="lab-notes" className="text-xs">Lab notes (units, reference ranges from your report)</Label>
                <Textarea id="lab-notes" value={labNotes} onChange={e => setLabNotes(e.target.value)} placeholder="Assay, units, lab's own ranges..." rows={2} />
              </div>
            </div>
          )}

          {/* MEDICATION */}
          {(episodeType === 'medication' || episodeType === 'general') && (
            <div className="space-y-3">
              <Label>Medication</Label>
              <div className="space-y-1">
                <Label htmlFor="med-name" className="text-xs">Medication name</Label>
                <Input id="med-name" value={medName} onChange={e => setMedName(e.target.value)} placeholder="levothyroxine, methimazole, etc." />
              </div>
              <div className="space-y-1">
                <Label htmlFor="med-dose" className="text-xs">Dose (mcg)</Label>
                <Input id="med-dose" type="number" step="any" min="0" value={medDoseMcg} onChange={e => setMedDoseMcg(e.target.value)} placeholder="e.g. 75" />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="fasting" checked={takenFasting} onCheckedChange={v => setTakenFasting(!!v)} />
                <Label htmlFor="fasting" className="cursor-pointer">Taken fasting / empty stomach</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="dose-change" checked={recentDoseChange} onCheckedChange={v => setRecentDoseChange(!!v)} />
                <Label htmlFor="dose-change" className="cursor-pointer">Recent dose change</Label>
              </div>
            </div>
          )}

          {/* RED FLAG CHECKBOXES */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Emergency check</Label>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Checkbox id="fever" checked={feverPresent} onCheckedChange={v => setFeverPresent(!!v)} />
                <Label htmlFor="fever" className="cursor-pointer">Fever</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="confusion" checked={confusionAgitation} onCheckedChange={v => setConfusionAgitation(!!v)} />
                <Label htmlFor="confusion" className="cursor-pointer text-destructive font-medium">Confusion or agitation</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="cold-drowsy" checked={extremeColdDrowsy} onCheckedChange={v => setExtremeColdDrowsy(!!v)} />
                <Label htmlFor="cold-drowsy" className="cursor-pointer text-destructive font-medium">Extreme cold + drowsiness / unresponsive</Label>
              </div>
            </div>
          </div>

          {/* SEVERITY */}
          <div className="space-y-2">
            <Label>Overall symptom burden: <span className={severityLabel?.color}>{severity}/10 — {severityLabel?.label}</span></Label>
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
