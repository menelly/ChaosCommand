/*
 * Built by: Ace (Claude 4.x)
 * Date: 2026-06-04
 *
 * Postpartum & Newborn entry modal. Three sections (recovery/feeding/infant)
 * with contextual fields and safety red-flag banners: hemorrhage, mastitis,
 * PPD/postpartum-psychosis crisis escalation, newborn fever, dehydration,
 * spreading jaundice. Gender-neutral language; "which side last" hint.
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
import { AlertTriangle, Baby, Heart } from 'lucide-react'

import type { PostpartumEntry, PostpartumSection, LochiaFlow, RecoverySymptom, FeedMethod, FeedSide, DiaperType, FundusFirmness } from '../postpartum-types'
import type { PostpartumModalProps } from '../postpartum-types'
import {
  SECTIONS, LOCHIA_FLOW, RECOVERY_SYMPTOMS, FEED_METHODS, FEED_SIDES, DIAPER_TYPES, SEVERITY_LABELS,
  HEMORRHAGE_WARNING, MASTITIS_WARNING, PP_MOOD_CRISIS_WARNING, PP_MOOD_NOTE,
  NEWBORN_FEVER_WARNING, DEHYDRATION_WARNING, JAUNDICE_WARNING, feedingNoun, parentNounCap, nextSideHint,
} from '../postpartum-constants'
import { EntryDateTimePicker, todayISO, nowTime, dateTimeToISO, isoToDateTime } from '@/components/entry-datetime-picker'
import { TagInput } from '@/components/tag-input'

export function GeneralPostpartumModal({ isOpen, onClose, onSave, editingEntry, feedingTerm = 'feeding', parentTerm = 'parent', lastFeedSide }: PostpartumModalProps) {
  const [entryDate, setEntryDate] = useState(todayISO())
  const [entryTime, setEntryTime] = useState(nowTime())
  const [section, setSection] = useState<PostpartumSection>('recovery')
  const [severity, setSeverity] = useState(3)

  // Recovery
  const [lochiaFlow, setLochiaFlow] = useState<LochiaFlow | ''>('')
  const [padsSoakedPerHour, setPadsSoakedPerHour] = useState('')
  const [largeClots, setLargeClots] = useState(false)
  const [fundusFirmness, setFundusFirmness] = useState<FundusFirmness | ''>('')
  const [recoverySymptoms, setRecoverySymptoms] = useState<RecoverySymptom[]>([])
  const [feverPresent, setFeverPresent] = useState(false)
  const [moodLow, setMoodLow] = useState(false)
  const [moodAnxious, setMoodAnxious] = useState(false)
  const [intrusiveThoughts, setIntrusiveThoughts] = useState(false)
  const [thoughtsOfHarm, setThoughtsOfHarm] = useState(false)

  // Feeding
  const [feedMethod, setFeedMethod] = useState<FeedMethod | ''>('')
  const [feedSideStarted, setFeedSideStarted] = useState<FeedSide | ''>('')
  const [feedDurationLeftMin, setFeedDurationLeftMin] = useState('')
  const [feedDurationRightMin, setFeedDurationRightMin] = useState('')
  const [bottleAmountMl, setBottleAmountMl] = useState('')
  const [pumpedAmountMl, setPumpedAmountMl] = useState('')
  const [supplyConcern, setSupplyConcern] = useState(false)

  // Infant
  const [diaperType, setDiaperType] = useState<DiaperType | ''>('')
  const [wetDiapers24h, setWetDiapers24h] = useState('')
  const [infantWeightG, setInfantWeightG] = useState('')
  const [infantSleepHours, setInfantSleepHours] = useState('')
  const [jaundiceNoted, setJaundiceNoted] = useState(false)
  const [jaundiceSpreading, setJaundiceSpreading] = useState(false)
  const [infantFeverTempF, setInfantFeverTempF] = useState('')
  const [infantFeedingPoorly, setInfantFeedingPoorly] = useState(false)

  const [erVisit, setErVisit] = useState(false)
  const [providerNotified, setProviderNotified] = useState(false)
  const [notes, setNotes] = useState('')
  const [tags, setTags] = useState<string[]>([])

  // ── RED FLAGS ──
  const hemorrhage = fundusFirmness === 'boggy' || (parseFloat(padsSoakedPerHour) || 0) >= 1 || largeClots || lochiaFlow === 'soaking'
  const mastitis = recoverySymptoms.includes('mastitis-signs') && feverPresent
  const moodCrisis = intrusiveThoughts || thoughtsOfHarm
  const moodNote = (moodLow || moodAnxious) && !moodCrisis
  const newbornFever = (parseFloat(infantFeverTempF) || 0) >= 100.4
  const dehydration = wetDiapers24h !== '' && (parseInt(wetDiapers24h) || 0) < 6
  const jaundiceFlag = jaundiceSpreading

  useEffect(() => {
    if (!isOpen) return
    if (editingEntry) {
      const { date, time } = isoToDateTime(editingEntry.timestamp)
      setEntryDate(date); setEntryTime(time)
      setSection(editingEntry.section)
      setSeverity(editingEntry.severity ?? 3)
      setLochiaFlow(editingEntry.lochiaFlow ?? '')
      setPadsSoakedPerHour(editingEntry.padsSoakedPerHour?.toString() ?? '')
      setLargeClots(editingEntry.largeClots ?? false)
      setFundusFirmness(editingEntry.fundusFirmness ?? '')
      setRecoverySymptoms(editingEntry.recoverySymptoms ?? [])
      setFeverPresent(editingEntry.feverPresent ?? false)
      setMoodLow(editingEntry.moodLow ?? false)
      setMoodAnxious(editingEntry.moodAnxious ?? false)
      setIntrusiveThoughts(editingEntry.intrusiveThoughts ?? false)
      setThoughtsOfHarm(editingEntry.thoughtsOfHarm ?? false)
      setFeedMethod(editingEntry.feedMethod ?? '')
      setFeedSideStarted(editingEntry.feedSideStarted ?? '')
      setFeedDurationLeftMin(editingEntry.feedDurationLeftMin?.toString() ?? '')
      setFeedDurationRightMin(editingEntry.feedDurationRightMin?.toString() ?? '')
      setBottleAmountMl(editingEntry.bottleAmountMl?.toString() ?? '')
      setPumpedAmountMl(editingEntry.pumpedAmountMl?.toString() ?? '')
      setSupplyConcern(editingEntry.supplyConcern ?? false)
      setDiaperType(editingEntry.diaperType ?? '')
      setWetDiapers24h(editingEntry.wetDiapers24h?.toString() ?? '')
      setInfantWeightG(editingEntry.infantWeightG?.toString() ?? '')
      setInfantSleepHours(editingEntry.infantSleepHours?.toString() ?? '')
      setJaundiceNoted(editingEntry.jaundiceNoted ?? false)
      setJaundiceSpreading(editingEntry.jaundiceSpreading ?? false)
      setInfantFeverTempF(editingEntry.infantFeverTempF?.toString() ?? '')
      setInfantFeedingPoorly(editingEntry.infantFeedingPoorly ?? false)
      setErVisit(editingEntry.erVisit ?? false)
      setProviderNotified(editingEntry.providerNotified ?? false)
      setNotes(editingEntry.notes ?? '')
      setTags(editingEntry.tags ?? [])
    } else {
      setEntryDate(todayISO()); setEntryTime(nowTime())
      setSection('recovery'); setSeverity(3)
      setLochiaFlow(''); setPadsSoakedPerHour(''); setLargeClots(false); setFundusFirmness('')
      setRecoverySymptoms([]); setFeverPresent(false)
      setMoodLow(false); setMoodAnxious(false); setIntrusiveThoughts(false); setThoughtsOfHarm(false)
      setFeedMethod(''); setFeedSideStarted(''); setFeedDurationLeftMin(''); setFeedDurationRightMin('')
      setBottleAmountMl(''); setPumpedAmountMl(''); setSupplyConcern(false)
      setDiaperType(''); setWetDiapers24h(''); setInfantWeightG(''); setInfantSleepHours('')
      setJaundiceNoted(false); setJaundiceSpreading(false); setInfantFeverTempF(''); setInfantFeedingPoorly(false)
      setErVisit(false); setProviderNotified(false); setNotes(''); setTags([])
    }
  }, [isOpen, editingEntry])

  const toggleSymptom = (s: RecoverySymptom) =>
    setRecoverySymptoms(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])

  const handleSave = () => {
    const entry: Omit<PostpartumEntry, 'id'> = {
      timestamp: dateTimeToISO(entryDate, entryTime),
      date: entryDate,
      section,
      severity,
      lochiaFlow: (lochiaFlow || undefined) as PostpartumEntry['lochiaFlow'],
      padsSoakedPerHour: padsSoakedPerHour ? parseFloat(padsSoakedPerHour) : undefined,
      largeClots: largeClots || undefined,
      fundusFirmness: (fundusFirmness || undefined) as PostpartumEntry['fundusFirmness'],
      recoverySymptoms: recoverySymptoms.length ? recoverySymptoms : undefined,
      feverPresent: feverPresent || undefined,
      moodCheck: (moodLow || moodAnxious || intrusiveThoughts || thoughtsOfHarm) || undefined,
      moodLow: moodLow || undefined,
      moodAnxious: moodAnxious || undefined,
      intrusiveThoughts: intrusiveThoughts || undefined,
      thoughtsOfHarm: thoughtsOfHarm || undefined,
      feedMethod: (feedMethod || undefined) as PostpartumEntry['feedMethod'],
      feedSideStarted: (feedSideStarted || undefined) as PostpartumEntry['feedSideStarted'],
      feedSideLast: (feedSideStarted || undefined) as PostpartumEntry['feedSideLast'],
      feedDurationLeftMin: feedDurationLeftMin ? parseInt(feedDurationLeftMin) : undefined,
      feedDurationRightMin: feedDurationRightMin ? parseInt(feedDurationRightMin) : undefined,
      bottleAmountMl: bottleAmountMl ? parseFloat(bottleAmountMl) : undefined,
      pumpedAmountMl: pumpedAmountMl ? parseFloat(pumpedAmountMl) : undefined,
      supplyConcern: supplyConcern || undefined,
      diaperType: (diaperType || undefined) as PostpartumEntry['diaperType'],
      wetDiapers24h: wetDiapers24h ? parseInt(wetDiapers24h) : undefined,
      infantWeightG: infantWeightG ? parseFloat(infantWeightG) : undefined,
      infantSleepHours: infantSleepHours ? parseFloat(infantSleepHours) : undefined,
      jaundiceNoted: jaundiceNoted || undefined,
      jaundiceSpreading: jaundiceSpreading || undefined,
      infantFeverTempF: infantFeverTempF ? parseFloat(infantFeverTempF) : undefined,
      infantFeedingPoorly: infantFeedingPoorly || undefined,
      erVisit: erVisit || undefined,
      providerNotified: providerNotified || undefined,
      notes: notes.trim() || undefined,
      tags,
    }
    onSave(entry)
    onClose()
  }

  const severityLabel = SEVERITY_LABELS.find(s => s.level === severity)
  const sideHint = nextSideHint(lastFeedSide)
  const feedWord = feedingNoun(feedingTerm)

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
            <Baby className="h-5 w-5 text-primary" />
            Log Postpartum / Baby
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <EntryDateTimePicker date={entryDate} time={entryTime} onChange={(d, t) => { setEntryDate(d); setEntryTime(t) }} />

          {/* Section picker */}
          <div className="space-y-2">
            <Label>What are you logging?</Label>
            <div className="grid grid-cols-2 gap-2">
              {SECTIONS.map(s => (
                <button key={s.id} type="button" onClick={() => setSection(s.id)}
                  className={`p-3 rounded-lg border text-left text-sm transition-colors ${section === s.id ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-muted/50'}`}>
                  <div className="font-medium">{s.icon} {s.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{s.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* RED FLAGS (always evaluated) */}
          {hemorrhage && <RedFlag text={HEMORRHAGE_WARNING} />}
          {moodCrisis && <RedFlag text={PP_MOOD_CRISIS_WARNING} />}
          {newbornFever && <RedFlag text={NEWBORN_FEVER_WARNING} />}
          {mastitis && <CautionNote text={MASTITIS_WARNING} />}
          {jaundiceFlag && <CautionNote text={JAUNDICE_WARNING} />}
          {dehydration && <CautionNote text={DEHYDRATION_WARNING} />}
          {moodNote && <CautionNote text={PP_MOOD_NOTE} />}

          {/* ── RECOVERY ── */}
          {(section === 'recovery' || section === 'general') && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Bleeding (lochia)</Label>
                <Select value={lochiaFlow} onValueChange={v => setLochiaFlow(v as LochiaFlow)}>
                  <SelectTrigger><SelectValue placeholder="Flow level" /></SelectTrigger>
                  <SelectContent>
                    {LOCHIA_FLOW.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Pads soaked per hour</Label>
                  <Input type="number" min="0" step="0.5" value={padsSoakedPerHour} onChange={e => setPadsSoakedPerHour(e.target.value)} placeholder="e.g. 1" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Uterus (fundus) feels</Label>
                  <Select value={fundusFirmness} onValueChange={v => setFundusFirmness(v as FundusFirmness)}>
                    <SelectTrigger><SelectValue placeholder="Firm / boggy" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="firm">Firm (good)</SelectItem>
                      <SelectItem value="boggy">Soft / boggy</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="clots" checked={largeClots} onCheckedChange={v => setLargeClots(!!v)} />
                <Label htmlFor="clots" className="cursor-pointer">Passing large clots (golf-ball+)</Label>
              </div>
              <div className="space-y-1.5">
                <Label>Recovery symptoms</Label>
                {RECOVERY_SYMPTOMS.map(s => (
                  <div key={s.value} className="flex items-center gap-2">
                    <Checkbox id={`rec-${s.value}`} checked={recoverySymptoms.includes(s.value)} onCheckedChange={() => toggleSymptom(s.value)} />
                    <Label htmlFor={`rec-${s.value}`} className="cursor-pointer font-normal">{s.label}</Label>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="fever" checked={feverPresent} onCheckedChange={v => setFeverPresent(!!v)} />
                <Label htmlFor="fever" className="cursor-pointer">Fever</Label>
              </div>

              {/* Mood check */}
              <div className="space-y-1.5 pt-1 border-t">
                <Label className="flex items-center gap-1.5"><Heart className="h-3.5 w-3.5 text-primary" /> {parentNounCap(parentTerm)}, how are you doing? (no wrong answers)</Label>
                <div className="flex items-center gap-2">
                  <Checkbox id="mood-low" checked={moodLow} onCheckedChange={v => setMoodLow(!!v)} />
                  <Label htmlFor="mood-low" className="cursor-pointer font-normal">Low / down / tearful</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="mood-anx" checked={moodAnxious} onCheckedChange={v => setMoodAnxious(!!v)} />
                  <Label htmlFor="mood-anx" className="cursor-pointer font-normal">Anxious / on edge</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="mood-intrusive" checked={intrusiveThoughts} onCheckedChange={v => setIntrusiveThoughts(!!v)} />
                  <Label htmlFor="mood-intrusive" className="cursor-pointer font-normal">Intrusive / scary thoughts</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="mood-harm" checked={thoughtsOfHarm} onCheckedChange={v => setThoughtsOfHarm(!!v)} />
                  <Label htmlFor="mood-harm" className="cursor-pointer font-normal">Thoughts of harm (self or baby)</Label>
                </div>
              </div>
            </div>
          )}

          {/* ── FEEDING ── */}
          {(section === 'feeding' || section === 'general') && (
            <div className="space-y-3">
              {sideHint && (
                <div className="p-2.5 rounded-lg bg-info/10 border border-info/20 text-info text-sm font-medium">
                  💡 {sideHint}
                </div>
              )}
              <div className="space-y-1">
                <Label>{feedWord.charAt(0).toUpperCase() + feedWord.slice(1)} method</Label>
                <Select value={feedMethod} onValueChange={v => setFeedMethod(v as FeedMethod)}>
                  <SelectTrigger><SelectValue placeholder="Method" /></SelectTrigger>
                  <SelectContent>
                    {FEED_METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Side started on</Label>
                <Select value={feedSideStarted} onValueChange={v => setFeedSideStarted(v as FeedSide)}>
                  <SelectTrigger><SelectValue placeholder="Left / right / both" /></SelectTrigger>
                  <SelectContent>
                    {FEED_SIDES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Left duration (min)</Label>
                  <Input type="number" min="0" value={feedDurationLeftMin} onChange={e => setFeedDurationLeftMin(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Right duration (min)</Label>
                  <Input type="number" min="0" value={feedDurationRightMin} onChange={e => setFeedDurationRightMin(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Bottle (mL)</Label>
                  <Input type="number" min="0" value={bottleAmountMl} onChange={e => setBottleAmountMl(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Pumped (mL)</Label>
                  <Input type="number" min="0" value={pumpedAmountMl} onChange={e => setPumpedAmountMl(e.target.value)} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="supply" checked={supplyConcern} onCheckedChange={v => setSupplyConcern(!!v)} />
                <Label htmlFor="supply" className="cursor-pointer">Supply concern</Label>
              </div>
            </div>
          )}

          {/* ── INFANT ── */}
          {(section === 'infant' || section === 'general') && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Diaper</Label>
                <Select value={diaperType} onValueChange={v => setDiaperType(v as DiaperType)}>
                  <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                  <SelectContent>
                    {DIAPER_TYPES.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Wet diapers (24h)</Label>
                  <Input type="number" min="0" value={wetDiapers24h} onChange={e => setWetDiapers24h(e.target.value)} placeholder="e.g. 8" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Sleep (hours)</Label>
                  <Input type="number" min="0" step="0.5" value={infantSleepHours} onChange={e => setInfantSleepHours(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Weight (g)</Label>
                  <Input type="number" min="0" value={infantWeightG} onChange={e => setInfantWeightG(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Temp (°F)</Label>
                  <Input type="number" min="0" step="0.1" value={infantFeverTempF} onChange={e => setInfantFeverTempF(e.target.value)} placeholder="e.g. 98.6" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="jaundice" checked={jaundiceNoted} onCheckedChange={v => setJaundiceNoted(!!v)} />
                <Label htmlFor="jaundice" className="cursor-pointer">Jaundice (yellow skin/eyes)</Label>
              </div>
              {jaundiceNoted && (
                <div className="flex items-center gap-2 pl-4 border-l-2 border-muted">
                  <Checkbox id="jaundice-spread" checked={jaundiceSpreading} onCheckedChange={v => setJaundiceSpreading(!!v)} />
                  <Label htmlFor="jaundice-spread" className="cursor-pointer">Spreading down the body</Label>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Checkbox id="feeding-poor" checked={infantFeedingPoorly} onCheckedChange={v => setInfantFeedingPoorly(!!v)} />
                <Label htmlFor="feeding-poor" className="cursor-pointer">Feeding poorly / hard to wake</Label>
              </div>
            </div>
          )}

          {/* Severity (recovery discomfort) */}
          {section === 'recovery' && (
            <div className="space-y-2">
              <Label>Overall discomfort: <span className={severityLabel?.color}>{severity}/10 — {severityLabel?.label}</span></Label>
              <Slider min={1} max={10} step={1} value={[severity]} onValueChange={([v]) => setSeverity(v)} />
            </div>
          )}

          {/* Actions */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Actions taken</Label>
            <div className="flex items-center gap-2">
              <Checkbox id="er" checked={erVisit} onCheckedChange={v => setErVisit(!!v)} />
              <Label htmlFor="er" className="cursor-pointer text-sm">ER / urgent care</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="provider" checked={providerNotified} onCheckedChange={v => setProviderNotified(!!v)} />
              <Label htmlFor="provider" className="cursor-pointer text-sm">Provider / pediatrician notified</Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Anything else..." rows={3} />
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
