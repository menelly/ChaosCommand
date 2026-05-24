/*
 * Built by: Ace (Claude 4.x)
 * Date: 2026-05-10 (CHA-154 v2 refactor)
 *
 * Open source under PolyForm Noncommercial 1.0.0.
 * Co-invented by Ren (vision) and Ace (implementation).
 * "Dreamed by Ren, implemented by Ace, inspired by mitochondria on strike"
 */

/**
 * GENERAL PAIN MODAL
 * Catch-all pain entry. Routes through episode-type field.
 * Detects MI / AAA / cauda equina / aortic dissection / SAH red flags.
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Flame, Plus, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react'

import { PainEntry, PainModalProps, PainEpisodeType } from '../pain-types'
import {
  EPISODE_TYPES,
  PAIN_LOCATIONS,
  RADIATION_SITES,
  PAIN_CHARACTERS,
  PAIN_PATTERNS,
  COMMON_TRIGGERS,
  TREATMENTS,
  MEDICATIONS,
  getSeverityLabel,
  getSeverityColor,
  getGremlinLabel,
  getGremlinEmoji,
  getRedFlagWarnings,
  getInterimMeasures,
} from '../pain-constants'
import { TagInput } from '@/components/tag-input'
import { KeyboardAvoidingWrapper } from '@/components/ui/keyboard-avoiding-wrapper'
import { EcgStripUploader } from '@/app/cardiac/components/ecg-strip-uploader'
import { EntryDateTimePicker, todayISO, nowTime, dateTimeToISO, isoToDateTime } from '@/components/entry-datetime-picker'

export function GeneralPainModal({ isOpen, onClose, onSave, editingEntry, initialEpisodeType }: PainModalProps) {
  const [entryDate, setEntryDate] = useState(todayISO())
  const [entryTime, setEntryTime] = useState(nowTime())
  const [episodeType, setEpisodeType] = useState<PainEpisodeType>(initialEpisodeType || 'general')

  const [painLevel, setPainLevel] = useState([5])
  const [painLocations, setPainLocations] = useState<string[]>([])
  const [painCharacter, setPainCharacter] = useState<string[]>([])
  const [painPattern, setPainPattern] = useState<string[]>([])
  const [painDuration, setPainDuration] = useState('')

  // Onset markers
  const [suddenOnset, setSuddenOnset] = useState(false)
  const [thunderclapPattern, setThunderclapPattern] = useState(false)
  const [tearingQuality, setTearingQuality] = useState(false)

  // Radiation
  const [radiatesTo, setRadiatesTo] = useState<string[]>([])

  // Red-flag-associated symptoms
  const [shortnessOfBreath, setShortnessOfBreath] = useState(false)
  const [sweatingNausea, setSweatingNausea] = useState(false)
  const [legWeakness, setLegWeakness] = useState(false)
  const [bowelBladderChanges, setBowelBladderChanges] = useState(false)
  const [saddleAnesthesia, setSaddleAnesthesia] = useState(false)
  const [feverPresent, setFeverPresent] = useState(false)
  const [abdominalRigidity, setAbdominalRigidity] = useState(false)
  const [pulsatileMass, setPulsatileMass] = useState(false)

  // Triggers / treatment
  const [triggers, setTriggers] = useState<string[]>([])
  const [activityAtOnset, setActivityAtOnset] = useState('')
  const [treatments, setTreatments] = useState<string[]>([])
  const [medications, setMedications] = useState<string[]>([])
  const [effectiveness, setEffectiveness] = useState([0])

  // Post-surgical context
  const [daysPostSurgery, setDaysPostSurgery] = useState('')
  const [surgeryType, setSurgeryType] = useState('')

  // Chronic flare context
  const [baselinePainLevel, setBaselinePainLevel] = useState([3])
  const [flareLikelyTrigger, setFlareLikelyTrigger] = useState('')

  // Emergency / safety
  const [erVisitRequired, setErVisitRequired] = useState(false)
  const [emergencyServicesCalled, setEmergencyServicesCalled] = useState(false)

  // Attachments / notes
  const [attachmentImages, setAttachmentImages] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [tags, setTags] = useState<string[]>([])

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    eventType: false,
    location: false,
    character: false,
    pattern: false,
    onset: false,
    radiation: false,
    associated: false,
    severity: false,
    triggers: false,
    treatment: false,
    duration: false,
    postSurgical: false,
    chronicFlare: false,
    emergency: false,
    attachments: false,
    notes: false,
    tags: false,
  })
  const toggleSection = (key: string) => setOpenSections(prev => ({ ...prev, [key]: !prev[key] }))

  useEffect(() => {
    if (editingEntry) {
      const dt = isoToDateTime(editingEntry.timestamp)
      setEntryDate(editingEntry.date || dt.date)
      setEntryTime(dt.time)
      setEpisodeType(editingEntry.episodeType || 'general')
      setPainLevel([editingEntry.painLevel || 5])
      setPainLocations(editingEntry.painLocations || [])
      // Accept legacy painType / painQuality fields
      setPainCharacter(editingEntry.painCharacter || editingEntry.painType || [])
      setPainPattern(editingEntry.painPattern || editingEntry.painQuality || [])
      setPainDuration(editingEntry.painDuration || '')
      setSuddenOnset(editingEntry.suddenOnset || false)
      setThunderclapPattern(editingEntry.thunderclapPattern || false)
      setTearingQuality(editingEntry.tearingQuality || false)
      setRadiatesTo(editingEntry.radiatesTo || [])
      setShortnessOfBreath(editingEntry.shortnessOfBreath || false)
      setSweatingNausea(editingEntry.sweatingNausea || false)
      setLegWeakness(editingEntry.legWeakness || false)
      setBowelBladderChanges(editingEntry.bowelBladderChanges || false)
      setSaddleAnesthesia(editingEntry.saddleAnesthesia || false)
      setFeverPresent(editingEntry.feverPresent || false)
      setAbdominalRigidity(editingEntry.abdominalRigidity || false)
      setPulsatileMass(editingEntry.pulsatileMass || false)
      setTriggers(editingEntry.triggers || editingEntry.painTriggers || [])
      setActivityAtOnset(editingEntry.activityAtOnset || editingEntry.activity || '')
      setTreatments(editingEntry.treatments || [])
      setMedications(editingEntry.medications || [])
      setEffectiveness([editingEntry.effectiveness || 0])
      setDaysPostSurgery(editingEntry.daysPostSurgery?.toString() || '')
      setSurgeryType(editingEntry.surgeryType || '')
      setBaselinePainLevel([editingEntry.baselinePainLevel || 3])
      setFlareLikelyTrigger(editingEntry.flareLikelyTrigger || '')
      setErVisitRequired(editingEntry.erVisitRequired || false)
      setEmergencyServicesCalled(editingEntry.emergencyServicesCalled || false)
      setAttachmentImages(editingEntry.attachmentImages || [])
      setNotes(editingEntry.notes || '')
      setTags(editingEntry.tags || [])
    } else {
      resetForm()
    }
  }, [editingEntry, isOpen])

  const resetForm = () => {
    setEntryDate(todayISO())
    setEntryTime(nowTime())
    setEpisodeType(initialEpisodeType || 'general')
    setPainLevel([5])
    setPainLocations([])
    setPainCharacter([])
    setPainPattern([])
    setPainDuration('')
    setSuddenOnset(false)
    setThunderclapPattern(false)
    setTearingQuality(false)
    setRadiatesTo([])
    setShortnessOfBreath(false)
    setSweatingNausea(false)
    setLegWeakness(false)
    setBowelBladderChanges(false)
    setSaddleAnesthesia(false)
    setFeverPresent(false)
    setAbdominalRigidity(false)
    setPulsatileMass(false)
    setTriggers([])
    setActivityAtOnset('')
    setTreatments([])
    setMedications([])
    setEffectiveness([0])
    setDaysPostSurgery('')
    setSurgeryType('')
    setBaselinePainLevel([3])
    setFlareLikelyTrigger('')
    setErVisitRequired(false)
    setEmergencyServicesCalled(false)
    setAttachmentImages([])
    setNotes('')
    setTags([])
  }

  const toggleArr = (arr: string[], setter: (v: string[]) => void) => (item: string) =>
    setter(arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item])

  // NOTE: we deliberately do NOT auto-set the dissection (tearingQuality) or SAH
  // (thunderclapPattern) red-flag fields from the descriptor word. "Tearing" describes
  // plenty of non-emergency pain (a pulled muscle, skin) — inferring a 911 emergency from
  // a casual word both nagged the user (the emergency card re-surfaced and wouldn't stay
  // collapsed) and polluted the data/reports with false emergency markers. These red flags
  // are set ONLY via their explicit checkboxes, where the user marks them on purpose.

  const handleSave = () => {
    const entryData: Omit<PainEntry, 'id'> = {
      date: entryDate,
      timestamp: dateTimeToISO(entryDate, entryTime),
      episodeType,
      painLevel: painLevel[0],
      painLocations,
      painCharacter,
      painPattern,
      painDuration: painDuration.trim() || undefined,
      suddenOnset: suddenOnset || undefined,
      thunderclapPattern: thunderclapPattern || undefined,
      tearingQuality: tearingQuality || undefined,
      radiatesTo: radiatesTo.length > 0 ? radiatesTo : undefined,
      shortnessOfBreath: shortnessOfBreath || undefined,
      sweatingNausea: sweatingNausea || undefined,
      legWeakness: legWeakness || undefined,
      bowelBladderChanges: bowelBladderChanges || undefined,
      saddleAnesthesia: saddleAnesthesia || undefined,
      feverPresent: feverPresent || undefined,
      abdominalRigidity: abdominalRigidity || undefined,
      pulsatileMass: pulsatileMass || undefined,
      triggers: triggers.length > 0 ? triggers : undefined,
      activityAtOnset: activityAtOnset.trim() || undefined,
      treatments: treatments.length > 0 ? treatments : undefined,
      medications: medications.length > 0 ? medications : undefined,
      effectiveness: effectiveness[0] > 0 ? effectiveness[0] : undefined,
      daysPostSurgery: episodeType === 'post-surgical' && daysPostSurgery ? parseInt(daysPostSurgery) : undefined,
      surgeryType: episodeType === 'post-surgical' && surgeryType.trim() ? surgeryType.trim() : undefined,
      baselinePainLevel: episodeType === 'chronic-flare' ? baselinePainLevel[0] : undefined,
      flareLikelyTrigger: episodeType === 'chronic-flare' && flareLikelyTrigger.trim() ? flareLikelyTrigger.trim() : undefined,
      erVisitRequired: erVisitRequired || undefined,
      emergencyServicesCalled: emergencyServicesCalled || undefined,
      attachmentImages: attachmentImages.length > 0 ? attachmentImages : undefined,
      notes: notes.trim() || undefined,
      tags: tags.length > 0 ? tags : undefined,
    }
    onSave(entryData)
    resetForm()
  }

  const handleClose = () => { resetForm(); onClose() }

  const entryShape = {
    episodeType,
    painLevel: painLevel[0],
    painLocations,
    painCharacter,
    painPattern,
    radiatesTo,
    suddenOnset,
    thunderclapPattern,
    tearingQuality,
    shortnessOfBreath,
    sweatingNausea,
    legWeakness,
    bowelBladderChanges,
    saddleAnesthesia,
    feverPresent,
    abdominalRigidity,
    pulsatileMass,
  }
  const redFlags = getRedFlagWarnings(entryShape)
  const interimMeasures = getInterimMeasures(entryShape)

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <KeyboardAvoidingWrapper>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-red-500" />
              🔥 Pain Episode
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* 🚨 DYNAMIC RED FLAG BANNER */}
            {redFlags.length > 0 && (
              <div className="border-2 border-red-500 bg-red-50 dark:bg-red-950/30 rounded-lg p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="font-bold text-red-700 dark:text-red-400">🚨 Red flags detected</div>
                </div>
                <ul className="space-y-1 text-sm text-red-900 dark:text-red-200 ml-7">
                  {redFlags.map((flag, i) => <li key={i}>• {flag}</li>)}
                </ul>
                <div className="ml-7 pt-2 border-t border-red-300 dark:border-red-800 space-y-2">
                  <p className="text-sm text-red-900 dark:text-red-200">
                    <strong>If this is happening RIGHT NOW:</strong> call 911. Documenting can wait.
                  </p>
                  <p className="text-sm text-red-900 dark:text-red-200">
                    <strong>If in the PAST and resolved:</strong> these patterns are emergency-level. Document carefully here for your medical team and follow up urgently.
                  </p>
                </div>
                {interimMeasures.length > 0 && (
                  <div className="ml-7 pt-2 border-t border-red-300 dark:border-red-800">
                    <p className="text-sm font-semibold text-red-900 dark:text-red-200 mb-1">💪 While waiting for EMS:</p>
                    <ul className="space-y-2 text-sm text-red-900 dark:text-red-200">
                      {interimMeasures.map((m, i) => <li key={i}>• {m}</li>)}
                    </ul>
                  </div>
                )}
                <p className="text-xs italic text-red-800 dark:text-red-300 ml-7">
                  Automated heuristic, not a diagnosis. When in doubt, call 911.
                </p>
              </div>
            )}

            <EntryDateTimePicker date={entryDate} time={entryTime} onChange={(d, t) => { setEntryDate(d); setEntryTime(t) }} />

            {/* Episode type */}
            <Collapsible open={openSections.eventType} onOpenChange={() => toggleSection('eventType')}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between h-auto py-3">
                  <span className="font-medium">Episode Type</span>
                  {openSections.eventType ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3">
                <Select value={episodeType} onValueChange={(v) => setEpisodeType(v as PainEpisodeType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EPISODE_TYPES.map(t => <SelectItem key={t.id} value={t.id}>{t.icon} {t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-2">
                  {EPISODE_TYPES.find(t => t.id === episodeType)?.description}
                </p>
              </CollapsibleContent>
            </Collapsible>

            {/* Locations */}
            <Collapsible open={openSections.location} onOpenChange={() => toggleSection('location')}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between h-auto py-3">
                  <span className="font-medium">Locations {painLocations.length > 0 && `(${painLocations.length})`}</span>
                  {openSections.location ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3">
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {PAIN_LOCATIONS.map(l => (
                    <div key={l} className="flex items-center space-x-2">
                      <Checkbox id={`loc-${l}`} checked={painLocations.includes(l)} onCheckedChange={() => toggleArr(painLocations, setPainLocations)(l)} />
                      <Label htmlFor={`loc-${l}`} className="text-sm">{l}</Label>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Character */}
            <Collapsible open={openSections.character} onOpenChange={() => toggleSection('character')}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between h-auto py-3">
                  <span className="font-medium">Character (sharp / dull / etc) {painCharacter.length > 0 && `(${painCharacter.length})`}</span>
                  {openSections.character ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3">
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                  {PAIN_CHARACTERS.map(c => (
                    <div key={c} className="flex items-center space-x-2">
                      <Checkbox id={`char-${c}`} checked={painCharacter.includes(c)} onCheckedChange={() => toggleArr(painCharacter, setPainCharacter)(c)} />
                      <Label htmlFor={`char-${c}`} className="text-sm">{c}</Label>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Pattern */}
            <Collapsible open={openSections.pattern} onOpenChange={() => toggleSection('pattern')}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between h-auto py-3">
                  <span className="font-medium">Pattern (constant / radiating / etc) {painPattern.length > 0 && `(${painPattern.length})`}</span>
                  {openSections.pattern ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3">
                <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
                  {PAIN_PATTERNS.map(p => (
                    <div key={p} className="flex items-center space-x-2">
                      <Checkbox id={`pat-${p}`} checked={painPattern.includes(p)} onCheckedChange={() => toggleArr(painPattern, setPainPattern)(p)} />
                      <Label htmlFor={`pat-${p}`} className="text-sm">{p}</Label>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Onset */}
            <Collapsible open={openSections.onset} onOpenChange={() => toggleSection('onset')}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between h-auto py-3">
                  <span className="font-medium">Onset (Optional)</span>
                  {openSections.onset ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3 space-y-3">
                <div className="flex items-start space-x-2">
                  <Checkbox id="sudden" checked={suddenOnset} onCheckedChange={(v) => setSuddenOnset(!!v)} />
                  <Label htmlFor="sudden" className="text-sm leading-tight">Came on suddenly (within seconds)</Label>
                </div>
                <div className="flex items-start space-x-2">
                  <Checkbox id="thunder" checked={thunderclapPattern} onCheckedChange={(v) => setThunderclapPattern(!!v)} />
                  <Label htmlFor="thunder" className="text-sm leading-tight">🚨 Thunderclap — peaked at max severity within 60 seconds</Label>
                </div>
                <div className="flex items-start space-x-2">
                  <Checkbox id="tear" checked={tearingQuality} onCheckedChange={(v) => setTearingQuality(!!v)} />
                  <Label htmlFor="tear" className="text-sm leading-tight">🚨 Tearing or ripping quality</Label>
                </div>
                <div>
                  <Label>What were you doing when it started?</Label>
                  <Input value={activityAtOnset} onChange={(e) => setActivityAtOnset(e.target.value)} placeholder="e.g., lifting groceries, sleeping, sitting" />
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Radiation */}
            <Collapsible open={openSections.radiation} onOpenChange={() => toggleSection('radiation')}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between h-auto py-3">
                  <span className="font-medium">Radiation (Optional) {radiatesTo.length > 0 && `(${radiatesTo.length})`}</span>
                  {openSections.radiation ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3">
                <p className="text-xs text-muted-foreground mb-2">Where does the pain travel to?</p>
                <div className="grid grid-cols-2 gap-2">
                  {RADIATION_SITES.map(r => (
                    <div key={r} className="flex items-center space-x-2">
                      <Checkbox id={`rad-${r}`} checked={radiatesTo.includes(r)} onCheckedChange={() => toggleArr(radiatesTo, setRadiatesTo)(r)} />
                      <Label htmlFor={`rad-${r}`} className="text-sm">{r}</Label>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Associated red-flag symptoms */}
            <Collapsible open={openSections.associated} onOpenChange={() => toggleSection('associated')}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between h-auto py-3">
                  <span className="font-medium">Other symptoms (Optional)</span>
                  {openSections.associated ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3 space-y-2">
                <div className="flex items-start space-x-2">
                  <Checkbox id="sob" checked={shortnessOfBreath} onCheckedChange={(v) => setShortnessOfBreath(!!v)} />
                  <Label htmlFor="sob" className="text-sm">Shortness of breath</Label>
                </div>
                <div className="flex items-start space-x-2">
                  <Checkbox id="sweat" checked={sweatingNausea} onCheckedChange={(v) => setSweatingNausea(!!v)} />
                  <Label htmlFor="sweat" className="text-sm">Sweating, nausea, or sense of doom</Label>
                </div>
                <div className="flex items-start space-x-2">
                  <Checkbox id="legweak" checked={legWeakness} onCheckedChange={(v) => setLegWeakness(!!v)} />
                  <Label htmlFor="legweak" className="text-sm">🚨 Leg weakness or numbness</Label>
                </div>
                <div className="flex items-start space-x-2">
                  <Checkbox id="bowel" checked={bowelBladderChanges} onCheckedChange={(v) => setBowelBladderChanges(!!v)} />
                  <Label htmlFor="bowel" className="text-sm">🚨 New bowel or bladder control changes</Label>
                </div>
                <div className="flex items-start space-x-2">
                  <Checkbox id="saddle" checked={saddleAnesthesia} onCheckedChange={(v) => setSaddleAnesthesia(!!v)} />
                  <Label htmlFor="saddle" className="text-sm">🚨 Numbness in groin / inner thighs / saddle area</Label>
                </div>
                <div className="flex items-start space-x-2">
                  <Checkbox id="fever" checked={feverPresent} onCheckedChange={(v) => setFeverPresent(!!v)} />
                  <Label htmlFor="fever" className="text-sm">Fever</Label>
                </div>
                <div className="flex items-start space-x-2">
                  <Checkbox id="rigid" checked={abdominalRigidity} onCheckedChange={(v) => setAbdominalRigidity(!!v)} />
                  <Label htmlFor="rigid" className="text-sm">🚨 Rigid / board-like abdomen</Label>
                </div>
                <div className="flex items-start space-x-2">
                  <Checkbox id="pulse" checked={pulsatileMass} onCheckedChange={(v) => setPulsatileMass(!!v)} />
                  <Label htmlFor="pulse" className="text-sm">🚨 Pulsating mass in abdomen</Label>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Severity */}
            <Collapsible open={openSections.severity} onOpenChange={() => toggleSection('severity')}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between h-auto py-3">
                  <span className="font-medium flex items-center gap-2 flex-wrap">
                    <span>{getGremlinEmoji(painLevel[0])} Pain level: {painLevel[0]}/10 —</span>
                    <span className={getSeverityColor(painLevel[0])}>{getGremlinLabel(painLevel[0])}</span>
                  </span>
                  {openSections.severity ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3 space-y-2">
                <Slider value={painLevel} onValueChange={setPainLevel} max={10} min={0} step={1} />
                <p className="text-xs text-muted-foreground italic">
                  Clinical: <span className={getSeverityColor(painLevel[0])}>{getSeverityLabel(painLevel[0])}</span> ({painLevel[0]}/10)
                </p>
              </CollapsibleContent>
            </Collapsible>

            {/* Triggers */}
            <Collapsible open={openSections.triggers} onOpenChange={() => toggleSection('triggers')}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between h-auto py-3">
                  <span className="font-medium">Triggers (Optional) {triggers.length > 0 && `(${triggers.length})`}</span>
                  {openSections.triggers ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3">
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                  {COMMON_TRIGGERS.map(t => (
                    <div key={t} className="flex items-center space-x-2">
                      <Checkbox id={`trig-${t}`} checked={triggers.includes(t)} onCheckedChange={() => toggleArr(triggers, setTriggers)(t)} />
                      <Label htmlFor={`trig-${t}`} className="text-sm">{t}</Label>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Treatment */}
            <Collapsible open={openSections.treatment} onOpenChange={() => toggleSection('treatment')}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between h-auto py-3">
                  <span className="font-medium">What helped? (Optional)</span>
                  {openSections.treatment ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3 space-y-3">
                <div>
                  <Label className="text-xs">Non-medication treatments</Label>
                  <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto mt-1">
                    {TREATMENTS.map(t => (
                      <div key={t} className="flex items-center space-x-2">
                        <Checkbox id={`tx-${t}`} checked={treatments.includes(t)} onCheckedChange={() => toggleArr(treatments, setTreatments)(t)} />
                        <Label htmlFor={`tx-${t}`} className="text-sm">{t}</Label>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Medications</Label>
                  <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto mt-1">
                    {MEDICATIONS.map(m => (
                      <div key={m} className="flex items-center space-x-2">
                        <Checkbox id={`med-${m}`} checked={medications.includes(m)} onCheckedChange={() => toggleArr(medications, setMedications)(m)} />
                        <Label htmlFor={`med-${m}`} className="text-sm">{m}</Label>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>Effectiveness: {effectiveness[0]}/10</Label>
                  <Slider value={effectiveness} onValueChange={setEffectiveness} max={10} min={0} step={1} className="mt-2" />
                  <p className="text-xs text-muted-foreground mt-1">0 = nothing helped, 10 = full relief</p>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Duration */}
            <Collapsible open={openSections.duration} onOpenChange={() => toggleSection('duration')}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between h-auto py-3">
                  <span className="font-medium">Duration (Optional)</span>
                  {openSections.duration ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3">
                <Input value={painDuration} onChange={(e) => setPainDuration(e.target.value)} placeholder="e.g., 2 hours, all day, ongoing" />
              </CollapsibleContent>
            </Collapsible>

            {/* Post-surgical context */}
            {episodeType === 'post-surgical' && (
              <Collapsible open={openSections.postSurgical} onOpenChange={() => toggleSection('postSurgical')}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" className="w-full justify-between h-auto py-3">
                    <span className="font-medium">Post-surgical context</span>
                    {openSections.postSurgical ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3 space-y-3">
                  <div>
                    <Label>Days since surgery</Label>
                    <Input type="number" min="0" value={daysPostSurgery} onChange={(e) => setDaysPostSurgery(e.target.value)} placeholder="e.g., 5" />
                  </div>
                  <div>
                    <Label>Surgery type</Label>
                    <Input value={surgeryType} onChange={(e) => setSurgeryType(e.target.value)} placeholder="e.g., laparoscopic gallbladder removal" />
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Chronic flare context */}
            {episodeType === 'chronic-flare' && (
              <Collapsible open={openSections.chronicFlare} onOpenChange={() => toggleSection('chronicFlare')}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" className="w-full justify-between h-auto py-3">
                    <span className="font-medium">Flare context</span>
                    {openSections.chronicFlare ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3 space-y-3">
                  <div>
                    <Label>Your normal-day baseline pain: {baselinePainLevel[0]}/10</Label>
                    <Slider value={baselinePainLevel} onValueChange={setBaselinePainLevel} max={10} min={0} step={1} className="mt-2" />
                    <p className="text-xs text-muted-foreground mt-1">Lets analytics show flare delta from baseline.</p>
                  </div>
                  <div>
                    <Label>Suspected flare trigger</Label>
                    <Input value={flareLikelyTrigger} onChange={(e) => setFlareLikelyTrigger(e.target.value)} placeholder="e.g., overexertion yesterday, weather front, stress" />
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Emergency */}
            <Collapsible open={openSections.emergency} onOpenChange={() => toggleSection('emergency')}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between h-auto py-3">
                  <span className="font-medium">Emergency / ER (Optional)</span>
                  {openSections.emergency ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3 space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox id="er" checked={erVisitRequired} onCheckedChange={(v) => setErVisitRequired(!!v)} />
                  <Label htmlFor="er" className="text-sm">Required ER visit</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="ems" checked={emergencyServicesCalled} onCheckedChange={(v) => setEmergencyServicesCalled(!!v)} />
                  <Label htmlFor="ems" className="text-sm">911 / EMS called</Label>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Attachments */}
            <Collapsible open={openSections.attachments} onOpenChange={() => toggleSection('attachments')}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between h-auto py-3">
                  <span className="font-medium">Attachments — photos, lab PDFs, imaging (Optional)</span>
                  {openSections.attachments ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3">
                <EcgStripUploader
                  value={attachmentImages}
                  onChange={setAttachmentImages}
                  label="Attachments (Optional)"
                  helpText="Photos of swelling/bruising, lab PDFs, imaging reports. Stored locally only."
                />
              </CollapsibleContent>
            </Collapsible>

            {/* Notes */}
            <Collapsible open={openSections.notes} onOpenChange={() => toggleSection('notes')}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between h-auto py-3">
                  <span className="font-medium">Notes (Optional)</span>
                  {openSections.notes ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3">
                <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional details..." />
              </CollapsibleContent>
            </Collapsible>

            {/* Tags */}
            <Collapsible open={openSections.tags} onOpenChange={() => toggleSection('tags')}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between h-auto py-3">
                  <span className="font-medium">Tags (Optional)</span>
                  {openSections.tags ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3">
                <TagInput value={tags} onChange={setTags} placeholder="Add tags..." />
              </CollapsibleContent>
            </Collapsible>

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={handleClose} className="flex-1">Cancel</Button>
              <Button type="button" onClick={handleSave} className="flex-1">
                <Plus className="h-4 w-4 mr-2" />
                {editingEntry ? 'Update Pain' : 'Save Pain Episode'}
              </Button>
            </div>
          </div>
        </KeyboardAvoidingWrapper>
      </DialogContent>
    </Dialog>
  )
}
