/*
 * Built by: Ace (Claude 4.x)
 * Date: 2026-06-02
 *
 * GU tracker entry modal. Contextual fields by episode type.
 * Safety-critical: retention >300mL, flank+fever, visible hematuria.
 * Infection triage guidance shown based on symptoms selected.
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
import { AlertTriangle, Droplets, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

import type { GUEntry, GUEpisodeType, VoidingSymptom, PainLocation, IncontinenceType } from '../gu-types'
import type { GUModalProps } from '../gu-types'
import {
  EPISODE_TYPES,
  VOIDING_SYMPTOMS,
  PAIN_LOCATIONS,
  INCONTINENCE_TYPES,
  URINE_COLORS,
  SEVERITY_LABELS,
  RED_FLAGS,
  RETENTION_WARNING,
  FLANK_FEVER_WARNING,
  HEMATURIA_WARNING,
  getInfectionTriageLevel,
} from '../gu-constants'
import { EntryDateTimePicker, todayISO, nowTime, dateTimeToISO, isoToDateTime } from '@/components/entry-datetime-picker'
import { TagInput } from '@/components/tag-input'

export function GeneralGUModal({ isOpen, onClose, onSave, editingEntry }: GUModalProps) {
  const [entryDate, setEntryDate] = useState(todayISO())
  const [entryTime, setEntryTime] = useState(nowTime())
  const [episodeType, setEpisodeType] = useState<GUEpisodeType>('voiding')
  const [severity, setSeverity] = useState(5)

  // Voiding
  const [voidingSymptoms, setVoidingSymptoms] = useState<VoidingSymptom[]>([])
  const [voidingFrequency, setVoidingFrequency] = useState('')
  const [nocturia, setNocturia] = useState('')

  // Retention
  const [retentionSuspected, setRetentionSuspected] = useState(false)
  const [estimatedRetentionMl, setEstimatedRetentionMl] = useState('')
  const [cathedRequired, setCathedRequired] = useState(false)
  const [cathedVolumeOut, setCathedVolumeOut] = useState('')

  // Output
  const [outputMl, setOutputMl] = useState('')
  const [color, setColor] = useState<GUEntry['color']>(undefined)
  const [bloodVisible, setBloodVisible] = useState(false)

  // Incontinence
  const [incontinenceType, setIncontinenceType] = useState<IncontinenceType | ''>('')
  const [padUsed, setPadUsed] = useState(false)
  const [padsSoaked, setPadsSoaked] = useState('')

  // Pain
  const [painLocations, setPainLocations] = useState<PainLocation[]>([])
  const [painSeverity, setPainSeverity] = useState(5)
  const [dysuria, setDysuria] = useState(false)
  const [flankPain, setFlankPain] = useState(false)

  // Infection
  const [infectionSuspected, setInfectionSuspected] = useState(false)
  const [feverPresent, setFeverPresent] = useState(false)
  const [antibioticStarted, setAntibioticStarted] = useState(false)
  const [antibioticName, setAntibioticName] = useState('')

  // Sexual health
  const [dyspareunia, setDyspareunia] = useState(false)
  const [dischargePresent, setDischargePresent] = useState(false)
  const [dischargeCharacter, setDischargeCharacter] = useState<GUEntry['dischargeCharacter']>(undefined)
  const [odorPresent, setOdorPresent] = useState(false)

  // Pelvic floor
  const [prolapseSensation, setProlapseSensation] = useState(false)
  const [pelvicPressure, setPelvicPressure] = useState(false)

  // Context
  const [recentCatheterUse, setRecentCatheterUse] = useState(false)
  const [erVisit, setErVisit] = useState(false)
  const [urologyNotified, setUrologyNotified] = useState(false)

  const [notes, setNotes] = useState('')
  const [tags, setTags] = useState<string[]>([])

  // Red flag detection
  const retentionMl = parseFloat(estimatedRetentionMl) || 0
  const retentionRedFlag = retentionSuspected && retentionMl > RED_FLAGS.retention_threshold_ml
  const flankFeverRedFlag = flankPain && feverPresent
  const hematuriaRedFlag = bloodVisible

  // Infection triage
  const triageGuidance = getInfectionTriageLevel(
    feverPresent,
    flankPain,
    recentCatheterUse,
    dischargeCharacter,
    bloodVisible,
    infectionSuspected || episodeType === 'infection'
  )

  // Populate from editingEntry
  useEffect(() => {
    if (!isOpen) return
    if (editingEntry) {
      const { date, time } = isoToDateTime(editingEntry.timestamp)
      setEntryDate(date)
      setEntryTime(time)
      setEpisodeType(editingEntry.episodeType)
      setSeverity(editingEntry.severity)
      setVoidingSymptoms(editingEntry.voidingSymptoms ?? [])
      setVoidingFrequency(editingEntry.voidingFrequency?.toString() ?? '')
      setNocturia(editingEntry.nocturia?.toString() ?? '')
      setRetentionSuspected(editingEntry.retentionSuspected ?? false)
      setEstimatedRetentionMl(editingEntry.estimatedRetentionMl?.toString() ?? '')
      setCathedRequired(editingEntry.cathedRequired ?? false)
      setCathedVolumeOut(editingEntry.cathedVolumeOut?.toString() ?? '')
      setOutputMl(editingEntry.outputMl?.toString() ?? '')
      setColor(editingEntry.color)
      setBloodVisible(editingEntry.bloodVisible ?? false)
      setIncontinenceType(editingEntry.incontinenceType ?? '')
      setPadUsed(editingEntry.padUsed ?? false)
      setPadsSoaked(editingEntry.padsSoaked?.toString() ?? '')
      setPainLocations(editingEntry.painLocations ?? [])
      setPainSeverity(editingEntry.painSeverity ?? 5)
      setDysuria(editingEntry.dysuria ?? false)
      setFlankPain(editingEntry.flankPain ?? false)
      setInfectionSuspected(editingEntry.infectionSuspected ?? false)
      setFeverPresent(editingEntry.feverPresent ?? false)
      setAntibioticStarted(editingEntry.antibioticStarted ?? false)
      setAntibioticName(editingEntry.antibioticName ?? '')
      setDyspareunia(editingEntry.dyspareunia ?? false)
      setDischargePresent(editingEntry.dischargePresent ?? false)
      setDischargeCharacter(editingEntry.dischargeCharacter)
      setOdorPresent(editingEntry.odorPresent ?? false)
      setProlapseSensation(editingEntry.prolapseSensation ?? false)
      setPelvicPressure(editingEntry.pelvicPressure ?? false)
      setRecentCatheterUse(editingEntry.recentCatheterUse ?? false)
      setErVisit(editingEntry.erVisit ?? false)
      setUrologyNotified(editingEntry.urologyNotified ?? false)
      setNotes(editingEntry.notes ?? '')
      setTags(editingEntry.tags ?? [])
    } else {
      setEntryDate(todayISO())
      setEntryTime(nowTime())
      setEpisodeType('voiding')
      setSeverity(5)
      setVoidingSymptoms([])
      setVoidingFrequency('')
      setNocturia('')
      setRetentionSuspected(false)
      setEstimatedRetentionMl('')
      setCathedRequired(false)
      setCathedVolumeOut('')
      setOutputMl('')
      setColor(undefined)
      setBloodVisible(false)
      setIncontinenceType('')
      setPadUsed(false)
      setPadsSoaked('')
      setPainLocations([])
      setPainSeverity(5)
      setDysuria(false)
      setFlankPain(false)
      setInfectionSuspected(false)
      setFeverPresent(false)
      setAntibioticStarted(false)
      setAntibioticName('')
      setDyspareunia(false)
      setDischargePresent(false)
      setDischargeCharacter(undefined)
      setOdorPresent(false)
      setProlapseSensation(false)
      setPelvicPressure(false)
      setRecentCatheterUse(false)
      setErVisit(false)
      setUrologyNotified(false)
      setNotes('')
      setTags([])
    }
  }, [isOpen, editingEntry])

  const toggleVoidingSymptom = (s: VoidingSymptom) =>
    setVoidingSymptoms(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])

  const togglePainLocation = (loc: PainLocation) =>
    setPainLocations(prev => prev.includes(loc) ? prev.filter(x => x !== loc) : [...prev, loc])

  const handleSave = () => {
    const timestamp = dateTimeToISO(entryDate, entryTime)
    const entry: Omit<GUEntry, 'id'> = {
      timestamp,
      date: entryDate,
      episodeType,
      severity,
      voidingSymptoms: voidingSymptoms.length > 0 ? voidingSymptoms : undefined,
      voidingFrequency: voidingFrequency ? parseInt(voidingFrequency) : undefined,
      nocturia: nocturia ? parseInt(nocturia) : undefined,
      retentionSuspected: retentionSuspected || undefined,
      estimatedRetentionMl: estimatedRetentionMl ? parseFloat(estimatedRetentionMl) : undefined,
      cathedRequired: cathedRequired || undefined,
      cathedVolumeOut: cathedVolumeOut ? parseFloat(cathedVolumeOut) : undefined,
      outputMl: outputMl ? parseFloat(outputMl) : undefined,
      color,
      bloodVisible: bloodVisible || undefined,
      incontinenceType: (incontinenceType || undefined) as GUEntry['incontinenceType'],
      padUsed: padUsed || undefined,
      padsSoaked: padsSoaked ? parseInt(padsSoaked) : undefined,
      painLocations: painLocations.length > 0 ? painLocations : undefined,
      painSeverity: painLocations.length > 0 ? painSeverity : undefined,
      dysuria: dysuria || undefined,
      flankPain: flankPain || undefined,
      infectionSuspected: infectionSuspected || undefined,
      feverPresent: feverPresent || undefined,
      antibioticStarted: antibioticStarted || undefined,
      antibioticName: antibioticName.trim() || undefined,
      dyspareunia: dyspareunia || undefined,
      dischargePresent: dischargePresent || undefined,
      dischargeCharacter,
      odorPresent: odorPresent || undefined,
      prolapseSensation: prolapseSensation || undefined,
      pelvicPressure: pelvicPressure || undefined,
      recentCatheterUse: recentCatheterUse || undefined,
      erVisit: erVisit || undefined,
      urologyNotified: urologyNotified || undefined,
      notes: notes.trim() || undefined,
      tags,
    }
    onSave(entry)
    onClose()
  }

  const severityLabel = SEVERITY_LABELS.find(s => s.level === severity)
  const selectedEpisode = EPISODE_TYPES.find(e => e.id === episodeType)

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Droplets className="h-5 w-5 text-primary" />
            Log GU Event
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">

          {/* Date/Time */}
          <EntryDateTimePicker
            date={entryDate}
            time={entryTime}
            onChange={(d, t) => { setEntryDate(d); setEntryTime(t) }}
          />

          {/* Episode Type */}
          <div className="space-y-2">
            <Label>What type of event?</Label>
            <div className="grid grid-cols-2 gap-2">
              {EPISODE_TYPES.map(type => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setEpisodeType(type.id)}
                  className={`p-3 rounded-lg border text-left text-sm transition-colors ${
                    episodeType === type.id
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <div className="font-medium">{type.icon} {type.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{type.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* ── RED FLAG BANNERS ── */}
          {retentionRedFlag && (
            <div className="flex gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold">Retention over 300mL — seek care</div>
                <div className="mt-1 text-destructive/80">{RETENTION_WARNING}</div>
              </div>
            </div>
          )}
          {flankFeverRedFlag && (
            <div className="flex gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold">Flank pain + fever — urgent evaluation needed</div>
                <div className="mt-1 text-destructive/80">{FLANK_FEVER_WARNING}</div>
              </div>
            </div>
          )}
          {hematuriaRedFlag && (
            <div className="flex gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold">Visible blood in urine</div>
                <div className="mt-1 text-destructive/80">{HEMATURIA_WARNING}</div>
              </div>
            </div>
          )}

          {/* ── INFECTION TRIAGE GUIDANCE ── */}
          {triageGuidance && (
            <div className={`flex gap-2 p-3 rounded-lg border text-sm ${
              triageGuidance.level === 'urgent'
                ? 'bg-destructive/10 border-destructive/20 text-destructive'
                : triageGuidance.level === 'routine'
                ? 'bg-warning/10 border-warning/20 text-warning'
                : 'bg-info/10 border-info/20 text-info'
            }`}>
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="whitespace-pre-line">{triageGuidance.guidance}</div>
            </div>
          )}

          {/* ── VOIDING SYMPTOMS ── */}
          {(episodeType === 'voiding' || episodeType === 'retention' || episodeType === 'general') && (
            <div className="space-y-2">
              <Label>Voiding symptoms</Label>
              <div className="grid grid-cols-1 gap-1.5">
                {VOIDING_SYMPTOMS.map(s => (
                  <div key={s.value} className="flex items-center gap-2">
                    <Checkbox
                      id={`vs-${s.value}`}
                      checked={voidingSymptoms.includes(s.value)}
                      onCheckedChange={() => toggleVoidingSymptom(s.value)}
                    />
                    <Label htmlFor={`vs-${s.value}`} className="cursor-pointer font-normal">{s.label}</Label>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <Label htmlFor="voiding-freq" className="text-xs">Times per day</Label>
                  <Input id="voiding-freq" type="number" min="0" value={voidingFrequency} onChange={e => setVoidingFrequency(e.target.value)} placeholder="e.g. 12" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="nocturia" className="text-xs">Times per night (nocturia)</Label>
                  <Input id="nocturia" type="number" min="0" value={nocturia} onChange={e => setNocturia(e.target.value)} placeholder="e.g. 3" />
                </div>
              </div>
            </div>
          )}

          {/* ── RETENTION ── */}
          {(episodeType === 'retention' || episodeType === 'voiding') && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox id="retention" checked={retentionSuspected} onCheckedChange={v => setRetentionSuspected(!!v)} />
                <Label htmlFor="retention" className="cursor-pointer">Urinary retention suspected</Label>
              </div>
              {retentionSuspected && (
                <div className="space-y-3 pl-4 border-l-2 border-destructive/30">
                  <div className="space-y-1">
                    <Label htmlFor="retention-ml" className="text-xs">Estimated retained volume (mL)</Label>
                    <Input id="retention-ml" type="number" min="0" value={estimatedRetentionMl} onChange={e => setEstimatedRetentionMl(e.target.value)} placeholder="e.g. 350" />
                    <p className="text-xs text-muted-foreground">If measured by bladder scan or straight cath</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox id="cathed" checked={cathedRequired} onCheckedChange={v => setCathedRequired(!!v)} />
                    <Label htmlFor="cathed" className="cursor-pointer text-sm">
                      Catheterization required — <a href="/maintain" className="underline text-primary inline-flex items-center gap-0.5">manage in Maintain <ExternalLink className="h-3 w-3" /></a>
                    </Label>
                  </div>
                  {cathedRequired && (
                    <div className="space-y-1">
                      <Label htmlFor="cathed-vol" className="text-xs">Volume drained (mL)</Label>
                      <Input id="cathed-vol" type="number" min="0" value={cathedVolumeOut} onChange={e => setCathedVolumeOut(e.target.value)} placeholder="e.g. 650" />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── OUTPUT / URINE APPEARANCE ── */}
          {(episodeType === 'output' || episodeType === 'voiding' || episodeType === 'general') && (
            <div className="space-y-2">
              <Label>Urine appearance</Label>
              <Select value={color ?? ''} onValueChange={v => setColor(v as GUEntry['color'] || undefined)}>
                <SelectTrigger><SelectValue placeholder="Select color" /></SelectTrigger>
                <SelectContent>
                  {URINE_COLORS.map(c => (
                    <SelectItem key={c.value} value={c.value}>
                      <div>
                        <span className="font-medium">{c.label}</span>
                        {c.description && <span className="text-muted-foreground ml-2 text-xs">— {c.description}</span>}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <Checkbox id="blood" checked={bloodVisible} onCheckedChange={v => setBloodVisible(!!v)} />
                <Label htmlFor="blood" className="cursor-pointer text-destructive font-medium">Visible blood</Label>
              </div>
              {episodeType === 'output' && (
                <div className="space-y-1">
                  <Label htmlFor="output-ml" className="text-xs">Measured output (mL)</Label>
                  <Input id="output-ml" type="number" min="0" value={outputMl} onChange={e => setOutputMl(e.target.value)} placeholder="e.g. 300" />
                </div>
              )}
            </div>
          )}

          {/* ── INCONTINENCE ── */}
          {episodeType === 'incontinence' && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Type of incontinence</Label>
                <Select value={incontinenceType} onValueChange={v => setIncontinenceType(v as IncontinenceType)}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {INCONTINENCE_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>
                        <div>
                          <span className="font-medium">{t.label}</span>
                          {t.description && <span className="text-muted-foreground ml-2 text-xs">— {t.description}</span>}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="pad" checked={padUsed} onCheckedChange={v => setPadUsed(!!v)} />
                <Label htmlFor="pad" className="cursor-pointer">Pad or protective garment used</Label>
              </div>
              {padUsed && (
                <div className="space-y-1">
                  <Label htmlFor="pads-soaked" className="text-xs">Pads soaked in 24 hours</Label>
                  <Input id="pads-soaked" type="number" min="0" value={padsSoaked} onChange={e => setPadsSoaked(e.target.value)} placeholder="e.g. 2" />
                </div>
              )}
            </div>
          )}

          {/* ── PAIN ── */}
          {(episodeType === 'pain' || episodeType === 'general') && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Pain locations</Label>
                <div className="grid grid-cols-2 gap-1.5">
                  {PAIN_LOCATIONS.map(loc => (
                    <div key={loc.value} className="flex items-center gap-2">
                      <Checkbox
                        id={`loc-${loc.value}`}
                        checked={painLocations.includes(loc.value)}
                        onCheckedChange={() => togglePainLocation(loc.value)}
                      />
                      <Label htmlFor={`loc-${loc.value}`} className="cursor-pointer font-normal text-sm">{loc.label}</Label>
                    </div>
                  ))}
                </div>
              </div>
              {painLocations.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs">Pain severity: {painSeverity}/10</Label>
                  <Slider min={1} max={10} step={1} value={[painSeverity]} onValueChange={([v]) => setPainSeverity(v)} />
                </div>
              )}
              <div className="flex items-center gap-2">
                <Checkbox id="dysuria" checked={dysuria} onCheckedChange={v => setDysuria(!!v)} />
                <Label htmlFor="dysuria" className="cursor-pointer">Burning or pain with urination (dysuria)</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="flank" checked={flankPain} onCheckedChange={v => setFlankPain(!!v)} />
                <Label htmlFor="flank" className="cursor-pointer">Flank pain (kidney area)</Label>
              </div>
            </div>
          )}

          {/* ── INFECTION ── */}
          {(episodeType === 'infection' || episodeType === 'general') && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox id="infection" checked={infectionSuspected} onCheckedChange={v => setInfectionSuspected(!!v)} />
                <Label htmlFor="infection" className="cursor-pointer">Infection suspected</Label>
              </div>
              {(infectionSuspected || episodeType === 'infection') && (
                <div className="space-y-2 pl-4 border-l-2 border-muted">
                  <div className="flex items-center gap-2">
                    <Checkbox id="fever" checked={feverPresent} onCheckedChange={v => setFeverPresent(!!v)} />
                    <Label htmlFor="fever" className="cursor-pointer">Fever present</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox id="flank-inf" checked={flankPain} onCheckedChange={v => setFlankPain(!!v)} />
                    <Label htmlFor="flank-inf" className="cursor-pointer">Flank pain</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox id="antibiotic" checked={antibioticStarted} onCheckedChange={v => setAntibioticStarted(!!v)} />
                    <Label htmlFor="antibiotic" className="cursor-pointer">Antibiotic started</Label>
                  </div>
                  {antibioticStarted && (
                    <Input value={antibioticName} onChange={e => setAntibioticName(e.target.value)} placeholder="Antibiotic name (e.g. nitrofurantoin)" />
                  )}
                  <div className="flex items-center gap-2">
                    <Checkbox id="recent-cath" checked={recentCatheterUse} onCheckedChange={v => setRecentCatheterUse(!!v)} />
                    <Label htmlFor="recent-cath" className="cursor-pointer">Recent catheter use</Label>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── SEXUAL HEALTH ── */}
          {(episodeType === 'sexual-health' || episodeType === 'general') && (
            <Collapsible>
              <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium w-full">
                <ChevronRight className="h-4 w-4" />
                Sexual health symptoms
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 pt-2 pl-4 border-l-2 border-muted">
                <div className="flex items-center gap-2">
                  <Checkbox id="dyspareunia" checked={dyspareunia} onCheckedChange={v => setDyspareunia(!!v)} />
                  <Label htmlFor="dyspareunia" className="cursor-pointer">Pain with sexual activity (dyspareunia)</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="discharge" checked={dischargePresent} onCheckedChange={v => setDischargePresent(!!v)} />
                  <Label htmlFor="discharge" className="cursor-pointer">Discharge present</Label>
                </div>
                {dischargePresent && (
                  <Select value={dischargeCharacter ?? ''} onValueChange={v => setDischargeCharacter(v as GUEntry['dischargeCharacter'])}>
                    <SelectTrigger><SelectValue placeholder="Discharge character" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="clear">Clear</SelectItem>
                      <SelectItem value="white-milky">White/milky</SelectItem>
                      <SelectItem value="yellow-green">Yellow/green</SelectItem>
                      <SelectItem value="gray">Gray</SelectItem>
                      <SelectItem value="cottage-cheese">Cottage cheese</SelectItem>
                      <SelectItem value="bloody">Bloody</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                )}
                <div className="flex items-center gap-2">
                  <Checkbox id="odor" checked={odorPresent} onCheckedChange={v => setOdorPresent(!!v)} />
                  <Label htmlFor="odor" className="cursor-pointer">Unusual odor</Label>
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* ── PELVIC FLOOR ── */}
          {(episodeType === 'pelvic-floor' || episodeType === 'general') && (
            <div className="space-y-2">
              <Label>Pelvic floor</Label>
              <div className="flex items-center gap-2">
                <Checkbox id="prolapse" checked={prolapseSensation} onCheckedChange={v => setProlapseSensation(!!v)} />
                <Label htmlFor="prolapse" className="cursor-pointer">Sensation of something falling out (prolapse)</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="pelvic-pressure" checked={pelvicPressure} onCheckedChange={v => setPelvicPressure(!!v)} />
                <Label htmlFor="pelvic-pressure" className="cursor-pointer">Pelvic pressure or heaviness</Label>
              </div>
            </div>
          )}

          {/* ── OVERALL SEVERITY ── */}
          <div className="space-y-2">
            <Label>Overall severity: <span className={SEVERITY_LABELS.find(s => s.level === severity)?.color}>{severity}/10 — {severityLabel?.label}</span></Label>
            <Slider min={1} max={10} step={1} value={[severity]} onValueChange={([v]) => setSeverity(v)} />
          </div>

          {/* ── ACTIONS TAKEN ── */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Actions taken</Label>
            <div className="flex items-center gap-2">
              <Checkbox id="er" checked={erVisit} onCheckedChange={v => setErVisit(!!v)} />
              <Label htmlFor="er" className="cursor-pointer text-sm">ER visit</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="urology" checked={urologyNotified} onCheckedChange={v => setUrologyNotified(!!v)} />
              <Label htmlFor="urology" className="cursor-pointer text-sm">Urology notified</Label>
            </div>
          </div>

          {/* ── NOTES & TAGS ── */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Anything else worth capturing..." rows={3} />
          </div>
          <div className="space-y-2">
            <Label>Tags</Label>
            <TagInput value={tags} onChange={setTags} placeholder="Add tags..." />
          </div>

          {/* ── SAVE / CANCEL ── */}
          <div className="flex gap-3 pt-2">
            <Button onClick={handleSave} className="flex-1">Save</Button>
            <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  )
}
