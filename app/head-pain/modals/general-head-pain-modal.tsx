/*
 * Built by: Ace (Claude 4.x)
 * Date: 2026-05-10 (CHA-155 v2 refactor)
 *
 * Open source under PolyForm Noncommercial 1.0.0.
 * Co-invented by Ren (vision) and Ace (implementation).
 * "Dreamed by Ren, implemented by Ace, inspired by mitochondria on strike"
 */

/**
 * GENERAL HEAD PAIN MODAL
 * Catch-all for any head pain episode. SAH/stroke/meningitis red flags.
 * Baseline-delta tracking — your typical headache day vs the
 * needs-Nurtec-AND-Imitrex day.
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
import { Brain, Plus, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react'

import { HeadPainEntry, HeadPainModalProps, HeadPainEpisodeType, FunctionalImpact } from '../head-pain-types'
import {
  EPISODE_TYPES,
  PAIN_LOCATIONS,
  PAIN_TYPES,
  AURA_SYMPTOMS,
  ASSOCIATED_SYMPTOMS,
  TRIGGERS,
  TREATMENTS,
  FUNCTIONAL_IMPACT_OPTIONS,
  RESIDUAL_SYMPTOMS,
  getGremlinLabel,
  getGremlinEmoji,
  getPainIntensityLabel,
  getRedFlagWarnings,
  getInterimMeasures,
} from '../head-pain-constants'
import { TagInput } from '@/components/tag-input'
import { KeyboardAvoidingWrapper } from '@/components/ui/keyboard-avoiding-wrapper'
import { EcgStripUploader } from '@/app/cardiac/components/ecg-strip-uploader'
import { EntryDateTimePicker, todayISO, nowTime, dateTimeToISO, isoToDateTime } from '@/components/entry-datetime-picker'

export function GeneralHeadPainModal({ isOpen, onClose, onSave, editingEntry, initialEpisodeType }: HeadPainModalProps) {
  const [entryDate, setEntryDate] = useState(todayISO())
  const [entryTime, setEntryTime] = useState(nowTime())
  const [episodeType, setEpisodeType] = useState<HeadPainEpisodeType>(initialEpisodeType || 'general')

  const [painIntensity, setPainIntensity] = useState([5])
  const [painLocation, setPainLocation] = useState<string[]>([])
  const [painType, setPainType] = useState<string[]>([])
  const [duration, setDuration] = useState('')

  // Baseline delta (Ren's ask)
  const [baselineHeadachePain, setBaselineHeadachePain] = useState([3])
  const [flareLikelyTrigger, setFlareLikelyTrigger] = useState('')

  // 🚨 Red-flag markers
  const [worstHeadacheOfLife, setWorstHeadacheOfLife] = useState(false)
  const [thunderclapOnset, setThunderclapOnset] = useState(false)
  const [suddenOnset, setSuddenOnset] = useState(false)
  const [neckStiffness, setNeckStiffness] = useState(false)
  const [fever, setFever] = useState(false)
  const [focalNeuroDeficit, setFocalNeuroDeficit] = useState(false)
  const [oneSidedWeakness, setOneSidedWeakness] = useState(false)
  const [speechDifficulty, setSpeechDifficulty] = useState(false)
  const [visionLoss, setVisionLoss] = useState(false)
  const [newAfterAge50, setNewAfterAge50] = useState(false)
  const [headInjuryRecent, setHeadInjuryRecent] = useState(false)
  const [pregnancyOrPostpartum, setPregnancyOrPostpartum] = useState(false)

  // Aura
  const [auraPresent, setAuraPresent] = useState(false)
  const [auraSymptoms, setAuraSymptoms] = useState<string[]>([])
  const [auraDescription, setAuraDescription] = useState('')
  const [auraDurationMinutes, setAuraDurationMinutes] = useState('')

  // Associated symptoms
  const [associatedSymptoms, setAssociatedSymptoms] = useState<string[]>([])

  // Triggers
  const [triggers, setTriggers] = useState<string[]>([])
  const [weather, setWeather] = useState('')

  // Treatments
  const [treatments, setTreatments] = useState<string[]>([])
  const [treatmentEffectiveness, setTreatmentEffectiveness] = useState([0])
  const [rescueMedicationsTaken, setRescueMedicationsTaken] = useState<string[]>([])
  const [rescueRedosed, setRescueRedosed] = useState(false)

  // Recovery
  const [recoveryTime, setRecoveryTime] = useState('')
  const [residualSymptoms, setResidualSymptoms] = useState<string[]>([])

  // Functional impact
  const [functionalImpact, setFunctionalImpact] = useState<FunctionalImpact>('mild')
  const [workImpact, setWorkImpact] = useState('')

  // Emergency
  const [erVisitRequired, setErVisitRequired] = useState(false)
  const [emergencyServicesCalled, setEmergencyServicesCalled] = useState(false)

  // Attachments / notes
  const [attachmentImages, setAttachmentImages] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [tags, setTags] = useState<string[]>([])

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({})
  const toggleSection = (key: string) => setOpenSections(prev => ({ ...prev, [key]: !prev[key] }))

  useEffect(() => {
    if (editingEntry) {
      const dt = isoToDateTime(editingEntry.timestamp)
      setEntryDate(editingEntry.date || dt.date)
      setEntryTime(dt.time)
      setEpisodeType(editingEntry.episodeType || 'general')
      setPainIntensity([editingEntry.painIntensity || 5])
      setPainLocation(editingEntry.painLocation || [])
      setPainType(editingEntry.painType || [])
      setDuration(editingEntry.duration || '')
      setBaselineHeadachePain([editingEntry.baselineHeadachePain || 3])
      setFlareLikelyTrigger(editingEntry.flareLikelyTrigger || '')
      setWorstHeadacheOfLife(editingEntry.worstHeadacheOfLife || false)
      setThunderclapOnset(editingEntry.thunderclapOnset || false)
      setSuddenOnset(editingEntry.suddenOnset || false)
      setNeckStiffness(editingEntry.neckStiffness || false)
      setFever(editingEntry.fever || false)
      setFocalNeuroDeficit(editingEntry.focalNeuroDeficit || false)
      setOneSidedWeakness(editingEntry.oneSidedWeakness || false)
      setSpeechDifficulty(editingEntry.speechDifficulty || false)
      setVisionLoss(editingEntry.visionLoss || false)
      setNewAfterAge50(editingEntry.newAfterAge50 || false)
      setHeadInjuryRecent(editingEntry.headInjuryRecent || false)
      setPregnancyOrPostpartum(editingEntry.pregnancyOrPostpartum || false)
      setAuraPresent(editingEntry.auraPresent || false)
      setAuraSymptoms(editingEntry.auraSymptoms || [])
      setAuraDescription(editingEntry.auraDescription || '')
      setAuraDurationMinutes(editingEntry.auraDurationMinutes?.toString() || '')
      setAssociatedSymptoms(editingEntry.associatedSymptoms || [])
      setTriggers(editingEntry.triggers || [])
      setWeather(editingEntry.weather || '')
      setTreatments(editingEntry.treatments || [])
      setTreatmentEffectiveness([editingEntry.treatmentEffectiveness || 0])
      setRescueMedicationsTaken(editingEntry.rescueMedicationsTaken || [])
      setRescueRedosed(editingEntry.rescueRedosed || false)
      setRecoveryTime(editingEntry.recoveryTime || '')
      setResidualSymptoms(editingEntry.residualSymptoms || [])
      setFunctionalImpact(editingEntry.functionalImpact || 'mild')
      setWorkImpact(editingEntry.workImpact || '')
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
    setEntryDate(todayISO()); setEntryTime(nowTime())
    setEpisodeType(initialEpisodeType || 'general')
    setPainIntensity([5]); setPainLocation([]); setPainType([]); setDuration('')
    setBaselineHeadachePain([3]); setFlareLikelyTrigger('')
    setWorstHeadacheOfLife(false); setThunderclapOnset(false); setSuddenOnset(false)
    setNeckStiffness(false); setFever(false); setFocalNeuroDeficit(false)
    setOneSidedWeakness(false); setSpeechDifficulty(false); setVisionLoss(false)
    setNewAfterAge50(false); setHeadInjuryRecent(false); setPregnancyOrPostpartum(false)
    setAuraPresent(false); setAuraSymptoms([]); setAuraDescription(''); setAuraDurationMinutes('')
    setAssociatedSymptoms([]); setTriggers([]); setWeather('')
    setTreatments([]); setTreatmentEffectiveness([0]); setRescueMedicationsTaken([]); setRescueRedosed(false)
    setRecoveryTime(''); setResidualSymptoms([])
    setFunctionalImpact('mild'); setWorkImpact('')
    setErVisitRequired(false); setEmergencyServicesCalled(false)
    setAttachmentImages([]); setNotes(''); setTags([])
  }

  const toggleArr = (arr: string[], setter: (v: string[]) => void) => (item: string) =>
    setter(arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item])

  // Auto-flag: worst-of-life episode type implies WHOL
  useEffect(() => {
    if (episodeType === 'worst-of-life' && !worstHeadacheOfLife) setWorstHeadacheOfLife(true)
  }, [episodeType])

  // Auto-flag: rescue meds list grows = redosed
  useEffect(() => {
    if (rescueMedicationsTaken.length >= 2 && !rescueRedosed) setRescueRedosed(true)
  }, [rescueMedicationsTaken])

  const handleSave = () => {
    const entryData: Omit<HeadPainEntry, 'id'> = {
      date: entryDate,
      timestamp: dateTimeToISO(entryDate, entryTime),
      episodeType,
      painIntensity: painIntensity[0],
      painLocation,
      painType,
      duration: duration.trim() || undefined,
      baselineHeadachePain: baselineHeadachePain[0],
      flareLikelyTrigger: flareLikelyTrigger.trim() || undefined,
      worstHeadacheOfLife: worstHeadacheOfLife || undefined,
      thunderclapOnset: thunderclapOnset || undefined,
      suddenOnset: suddenOnset || undefined,
      neckStiffness: neckStiffness || undefined,
      fever: fever || undefined,
      focalNeuroDeficit: focalNeuroDeficit || undefined,
      oneSidedWeakness: oneSidedWeakness || undefined,
      speechDifficulty: speechDifficulty || undefined,
      visionLoss: visionLoss || undefined,
      newAfterAge50: newAfterAge50 || undefined,
      headInjuryRecent: headInjuryRecent || undefined,
      pregnancyOrPostpartum: pregnancyOrPostpartum || undefined,
      auraPresent,
      auraSymptoms,
      auraDescription: auraDescription.trim() || undefined,
      auraDurationMinutes: auraDurationMinutes ? parseInt(auraDurationMinutes) : undefined,
      associatedSymptoms,
      triggers,
      weather: weather.trim() || undefined,
      treatments,
      treatmentEffectiveness: treatmentEffectiveness[0] > 0 ? treatmentEffectiveness[0] : undefined,
      rescueMedicationsTaken: rescueMedicationsTaken.length > 0 ? rescueMedicationsTaken : undefined,
      rescueRedosed: rescueRedosed || undefined,
      recoveryTime: recoveryTime.trim() || undefined,
      residualSymptoms,
      functionalImpact,
      workImpact: workImpact.trim() || undefined,
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
    painIntensity: painIntensity[0],
    worstHeadacheOfLife,
    thunderclapOnset,
    suddenOnset,
    neckStiffness,
    fever,
    focalNeuroDeficit,
    oneSidedWeakness,
    speechDifficulty,
    visionLoss,
    newAfterAge50,
    headInjuryRecent,
    pregnancyOrPostpartum,
  }
  const redFlags = getRedFlagWarnings(entryShape)
  const interimMeasures = getInterimMeasures(entryShape)

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <KeyboardAvoidingWrapper>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-500" />
              🧠 Head Pain Episode
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* 🚨 DYNAMIC RED FLAG BANNER */}
            {redFlags.length > 0 && (
              <div className="border-2 border-destructive bg-destructive text-destructive-foreground rounded-lg p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive-foreground flex-shrink-0 mt-0.5" />
                  <div className="font-bold text-destructive-foreground">🚨 Red flags detected</div>
                </div>
                <ul className="space-y-1 text-sm text-destructive-foreground ml-7">
                  {redFlags.map((flag, i) => <li key={i}>• {flag}</li>)}
                </ul>
                <div className="ml-7 pt-2 border-t border-destructive-foreground/30 space-y-2">
                  <p className="text-sm text-destructive-foreground">
                    <strong>If this is happening RIGHT NOW:</strong> call 911. Documenting can wait.
                  </p>
                  <p className="text-sm text-destructive-foreground">
                    <strong>If in the PAST and resolved:</strong> these are emergency-level patterns. Document carefully here for your neurologist and follow up urgently.
                  </p>
                </div>
                {interimMeasures.length > 0 && (
                  <div className="ml-7 pt-2 border-t border-destructive-foreground/30">
                    <p className="text-sm font-semibold text-destructive-foreground mb-1">💪 While waiting for help:</p>
                    <ul className="space-y-2 text-sm text-destructive-foreground">
                      {interimMeasures.map((m, i) => <li key={i}>• {m}</li>)}
                    </ul>
                  </div>
                )}
                <p className="text-xs italic text-destructive-foreground ml-7">
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
                <Select value={episodeType} onValueChange={(v) => setEpisodeType(v as HeadPainEpisodeType)}>
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

            {/* Pain intensity (gremlin slider) */}
            <Collapsible open={openSections.intensity} onOpenChange={() => toggleSection('intensity')}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between h-auto py-3">
                  <span className="font-medium flex items-center gap-2 flex-wrap">
                    <span>{getGremlinEmoji(painIntensity[0])} Pain: {painIntensity[0]}/10 —</span>
                    <span>{getGremlinLabel(painIntensity[0])}</span>
                  </span>
                  {openSections.intensity ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3 space-y-2">
                <Slider value={painIntensity} onValueChange={setPainIntensity} max={10} min={0} step={1} />
                <p className="text-xs text-muted-foreground italic">
                  Clinical: {getPainIntensityLabel(painIntensity[0])} ({painIntensity[0]}/10)
                </p>
              </CollapsibleContent>
            </Collapsible>

            {/* BASELINE DELTA — Ren's ask */}
            <Collapsible open={openSections.baseline} onOpenChange={() => toggleSection('baseline')}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between h-auto py-3">
                  <span className="font-medium">Baseline & flare context</span>
                  {openSections.baseline ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3 space-y-3">
                <div>
                  <Label>Your typical-headache-day pain: {baselineHeadachePain[0]}/10</Label>
                  <Slider value={baselineHeadachePain} onValueChange={setBaselineHeadachePain} max={10} min={0} step={1} className="mt-2" />
                  <p className="text-xs text-muted-foreground mt-1">
                    Lets analytics surface "tension HA at 4" vs "needs Nurtec AND Imitrex at 8" — the delta is what your neurologist wants to see.
                  </p>
                </div>
                <div>
                  <Label>Suspected flare trigger</Label>
                  <Input value={flareLikelyTrigger} onChange={(e) => setFlareLikelyTrigger(e.target.value)} placeholder="e.g., barometric drop, period, missed sleep" />
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Location */}
            <Collapsible open={openSections.location} onOpenChange={() => toggleSection('location')}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between h-auto py-3">
                  <span className="font-medium">Location {painLocation.length > 0 && `(${painLocation.length})`}</span>
                  {openSections.location ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3">
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {PAIN_LOCATIONS.map(l => (
                    <div key={l.value} className="flex items-center space-x-2">
                      <Checkbox id={`loc-${l.value}`} checked={painLocation.includes(l.value)} onCheckedChange={() => toggleArr(painLocation, setPainLocation)(l.value)} />
                      <Label htmlFor={`loc-${l.value}`} className="text-sm">{l.label}</Label>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Pain type / character */}
            <Collapsible open={openSections.character} onOpenChange={() => toggleSection('character')}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between h-auto py-3">
                  <span className="font-medium">Pain type {painType.length > 0 && `(${painType.length})`}</span>
                  {openSections.character ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3">
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                  {PAIN_TYPES.map(p => (
                    <div key={p.value} className="flex items-center space-x-2">
                      <Checkbox id={`pt-${p.value}`} checked={painType.includes(p.value)} onCheckedChange={() => toggleArr(painType, setPainType)(p.value)} />
                      <Label htmlFor={`pt-${p.value}`} className="text-sm">{p.label}</Label>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* 🚨 Red flag markers */}
            <Collapsible open={openSections.redFlags} onOpenChange={() => toggleSection('redFlags')}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between h-auto py-3">
                  <span className="font-medium">🚨 Red flag check</span>
                  {openSections.redFlags ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3 space-y-2">
                <div className="flex items-start space-x-2"><Checkbox id="whol" checked={worstHeadacheOfLife} onCheckedChange={(v) => setWorstHeadacheOfLife(!!v)} /><Label htmlFor="whol" className="text-sm">🚨 "Worst headache of my life"</Label></div>
                <div className="flex items-start space-x-2"><Checkbox id="thunder" checked={thunderclapOnset} onCheckedChange={(v) => setThunderclapOnset(!!v)} /><Label htmlFor="thunder" className="text-sm">🚨 Thunderclap onset (peaked in &lt;60 sec)</Label></div>
                <div className="flex items-start space-x-2"><Checkbox id="sudden" checked={suddenOnset} onCheckedChange={(v) => setSuddenOnset(!!v)} /><Label htmlFor="sudden" className="text-sm">Sudden onset (within minutes)</Label></div>
                <div className="flex items-start space-x-2"><Checkbox id="stiff" checked={neckStiffness} onCheckedChange={(v) => setNeckStiffness(!!v)} /><Label htmlFor="stiff" className="text-sm">Neck stiffness</Label></div>
                <div className="flex items-start space-x-2"><Checkbox id="fever" checked={fever} onCheckedChange={(v) => setFever(!!v)} /><Label htmlFor="fever" className="text-sm">Fever</Label></div>
                <div className="flex items-start space-x-2"><Checkbox id="focal" checked={focalNeuroDeficit} onCheckedChange={(v) => setFocalNeuroDeficit(!!v)} /><Label htmlFor="focal" className="text-sm">🚨 Focal neurological deficit</Label></div>
                <div className="flex items-start space-x-2"><Checkbox id="weak" checked={oneSidedWeakness} onCheckedChange={(v) => setOneSidedWeakness(!!v)} /><Label htmlFor="weak" className="text-sm">🚨 One-sided weakness or numbness</Label></div>
                <div className="flex items-start space-x-2"><Checkbox id="speech" checked={speechDifficulty} onCheckedChange={(v) => setSpeechDifficulty(!!v)} /><Label htmlFor="speech" className="text-sm">🚨 Speech difficulty</Label></div>
                <div className="flex items-start space-x-2"><Checkbox id="vision" checked={visionLoss} onCheckedChange={(v) => setVisionLoss(!!v)} /><Label htmlFor="vision" className="text-sm">🚨 Vision loss</Label></div>
                <div className="flex items-start space-x-2"><Checkbox id="age50" checked={newAfterAge50} onCheckedChange={(v) => setNewAfterAge50(!!v)} /><Label htmlFor="age50" className="text-sm">New headache pattern after age 50</Label></div>
                <div className="flex items-start space-x-2"><Checkbox id="headinj" checked={headInjuryRecent} onCheckedChange={(v) => setHeadInjuryRecent(!!v)} /><Label htmlFor="headinj" className="text-sm">Recent head injury</Label></div>
                <div className="flex items-start space-x-2"><Checkbox id="preg" checked={pregnancyOrPostpartum} onCheckedChange={(v) => setPregnancyOrPostpartum(!!v)} /><Label htmlFor="preg" className="text-sm">Pregnant or postpartum</Label></div>
              </CollapsibleContent>
            </Collapsible>

            {/* Aura */}
            <Collapsible open={openSections.aura} onOpenChange={() => toggleSection('aura')}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between h-auto py-3">
                  <span className="font-medium">Aura (Optional)</span>
                  {openSections.aura ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3 space-y-3">
                <div className="flex items-start space-x-2">
                  <Checkbox id="aurap" checked={auraPresent} onCheckedChange={(v) => setAuraPresent(!!v)} />
                  <Label htmlFor="aurap" className="text-sm">Had aura before pain</Label>
                </div>
                {auraPresent && (
                  <>
                    <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                      {AURA_SYMPTOMS.map(s => (
                        <div key={s.value} className="flex items-center space-x-2">
                          <Checkbox id={`aura-${s.value}`} checked={auraSymptoms.includes(s.value)} onCheckedChange={() => toggleArr(auraSymptoms, setAuraSymptoms)(s.value)} />
                          <Label htmlFor={`aura-${s.value}`} className="text-sm">{s.label}</Label>
                        </div>
                      ))}
                    </div>
                    <div>
                      <Label>Aura duration (minutes)</Label>
                      <Input type="number" min="0" value={auraDurationMinutes} onChange={(e) => setAuraDurationMinutes(e.target.value)} placeholder="e.g., 20" />
                    </div>
                    <div>
                      <Label>Aura description</Label>
                      <Textarea rows={2} value={auraDescription} onChange={(e) => setAuraDescription(e.target.value)} placeholder="What did the aura look/feel like?" />
                    </div>
                  </>
                )}
              </CollapsibleContent>
            </Collapsible>

            {/* Associated symptoms */}
            <Collapsible open={openSections.associated} onOpenChange={() => toggleSection('associated')}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between h-auto py-3">
                  <span className="font-medium">Associated symptoms (Optional) {associatedSymptoms.length > 0 && `(${associatedSymptoms.length})`}</span>
                  {openSections.associated ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3">
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {ASSOCIATED_SYMPTOMS.map(s => (
                    <div key={s.value} className="flex items-center space-x-2">
                      <Checkbox id={`as-${s.value}`} checked={associatedSymptoms.includes(s.value)} onCheckedChange={() => toggleArr(associatedSymptoms, setAssociatedSymptoms)(s.value)} />
                      <Label htmlFor={`as-${s.value}`} className="text-sm">{s.label}</Label>
                    </div>
                  ))}
                </div>
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
              <CollapsibleContent className="pt-3 space-y-3">
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {TRIGGERS.map(t => (
                    <div key={t.value} className="flex items-center space-x-2">
                      <Checkbox id={`tr-${t.value}`} checked={triggers.includes(t.value)} onCheckedChange={() => toggleArr(triggers, setTriggers)(t.value)} />
                      <Label htmlFor={`tr-${t.value}`} className="text-sm">{t.label}</Label>
                    </div>
                  ))}
                </div>
                <div>
                  <Label>Weather (Optional)</Label>
                  <Input value={weather} onChange={(e) => setWeather(e.target.value)} placeholder="e.g., barometric drop, hot/humid" />
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Treatments */}
            <Collapsible open={openSections.treatment} onOpenChange={() => toggleSection('treatment')}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between h-auto py-3">
                  <span className="font-medium">Treatments {treatments.length > 0 && `(${treatments.length})`}</span>
                  {openSections.treatment ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3 space-y-3">
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {TREATMENTS.map(t => (
                    <div key={t.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`tx-${t.value}`}
                        checked={treatments.includes(t.value)}
                        onCheckedChange={() => {
                          toggleArr(treatments, setTreatments)(t.value)
                          // Also track meds in rescueMedicationsTaken when category=medication
                          if (t.category === 'medication') {
                            toggleArr(rescueMedicationsTaken, setRescueMedicationsTaken)(t.value)
                          }
                        }}
                      />
                      <Label htmlFor={`tx-${t.value}`} className="text-sm">{t.label}</Label>
                    </div>
                  ))}
                </div>
                <div>
                  <Label>Effectiveness: {treatmentEffectiveness[0]}/10</Label>
                  <Slider value={treatmentEffectiveness} onValueChange={setTreatmentEffectiveness} max={10} min={0} step={1} className="mt-2" />
                </div>
                {rescueMedicationsTaken.length >= 2 && (
                  <div className="flex items-start space-x-2">
                    <Checkbox id="redose" checked={rescueRedosed} onCheckedChange={(v) => setRescueRedosed(!!v)} />
                    <Label htmlFor="redose" className="text-sm">Multiple rescue meds needed (e.g., Nurtec + Imitrex)</Label>
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>

            {/* Recovery */}
            <Collapsible open={openSections.recovery} onOpenChange={() => toggleSection('recovery')}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between h-auto py-3">
                  <span className="font-medium">Duration & recovery (Optional)</span>
                  {openSections.recovery ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3 space-y-3">
                <div>
                  <Label>How long did the headache last?</Label>
                  <Input value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="e.g., 4 hours, 2 days, ongoing" />
                </div>
                <div>
                  <Label>Recovery time after pain ended</Label>
                  <Input value={recoveryTime} onChange={(e) => setRecoveryTime(e.target.value)} placeholder="e.g., postdrome 24 hours" />
                </div>
                <div>
                  <Label className="text-xs">Residual symptoms</Label>
                  <div className="grid grid-cols-2 gap-2 mt-1 max-h-32 overflow-y-auto">
                    {RESIDUAL_SYMPTOMS.map(r => (
                      <div key={r.value} className="flex items-center space-x-2">
                        <Checkbox id={`res-${r.value}`} checked={residualSymptoms.includes(r.value)} onCheckedChange={() => toggleArr(residualSymptoms, setResidualSymptoms)(r.value)} />
                        <Label htmlFor={`res-${r.value}`} className="text-sm">{r.label}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Functional impact */}
            <Collapsible open={openSections.impact} onOpenChange={() => toggleSection('impact')}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between h-auto py-3">
                  <span className="font-medium">Functional impact</span>
                  {openSections.impact ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3 space-y-3">
                <Select value={functionalImpact} onValueChange={(v) => setFunctionalImpact(v as FunctionalImpact)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FUNCTIONAL_IMPACT_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div>
                  <Label>Work / activity impact (Optional)</Label>
                  <Input value={workImpact} onChange={(e) => setWorkImpact(e.target.value)} placeholder="e.g., missed work, canceled plans, lay in dark room" />
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Emergency */}
            <Collapsible open={openSections.emergency} onOpenChange={() => toggleSection('emergency')}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between h-auto py-3">
                  <span className="font-medium">ER / 911 (Optional)</span>
                  {openSections.emergency ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3 space-y-2">
                <div className="flex items-center space-x-2"><Checkbox id="er" checked={erVisitRequired} onCheckedChange={(v) => setErVisitRequired(!!v)} /><Label htmlFor="er" className="text-sm">Required ER visit</Label></div>
                <div className="flex items-center space-x-2"><Checkbox id="ems" checked={emergencyServicesCalled} onCheckedChange={(v) => setEmergencyServicesCalled(!!v)} /><Label htmlFor="ems" className="text-sm">911 / EMS called</Label></div>
              </CollapsibleContent>
            </Collapsible>

            {/* Attachments */}
            <Collapsible open={openSections.attachments} onOpenChange={() => toggleSection('attachments')}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between h-auto py-3">
                  <span className="font-medium">Attachments (Optional)</span>
                  {openSections.attachments ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3">
                <EcgStripUploader
                  value={attachmentImages}
                  onChange={setAttachmentImages}
                  label="MRI/CT reports, lab PDFs, photos (Optional)"
                  helpText="Imaging reports, photos of aura drawings, anything relevant. Stored locally only."
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
                {editingEntry ? 'Update Episode' : 'Save Head Pain Episode'}
              </Button>
            </div>
          </div>
        </KeyboardAvoidingWrapper>
      </DialogContent>
    </Dialog>
  )
}
