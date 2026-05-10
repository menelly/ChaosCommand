/*
 * Built by: Ace (Claude 4.x)
 * Date: 2026-05-10 (CHA-156 v2 refactor)
 *
 * Open source under PolyForm Noncommercial 1.0.0.
 * Co-invented by Ren (vision) and Ace (implementation).
 * "Dreamed by Ren, implemented by Ace, inspired by mitochondria on strike"
 */

/**
 * GENERAL FOOD ALLERGENS / REACTIONS MODAL
 * Anaphylaxis red flags + EpiPen guidance for IgE.
 * Celiac/autoimmune/intolerance pattern fields don't trigger
 * EpiPen logic — those use slow-burn delayed-reaction tracking.
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
import { Utensils, Plus, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react'

import { FoodAllergenEntry, FoodAllergensModalProps, FoodReactionEpisodeType, ReactionSeverity } from '../food-allergens-types'
import {
  EPISODE_TYPES,
  EXPOSURE_SOURCES,
  EXPOSURE_ROUTES,
  COMMON_TREATMENTS,
  SEVERITY_LEVELS,
  getSymptomsForEpisodeType,
  getRedFlagWarnings,
  getInterimMeasures,
} from '../food-allergens-constants'
import { TagInput } from '@/components/tag-input'
import { KeyboardAvoidingWrapper } from '@/components/ui/keyboard-avoiding-wrapper'
import { EcgStripUploader } from '@/app/cardiac/components/ecg-strip-uploader'
import { EntryDateTimePicker, todayISO, nowTime, dateTimeToISO, isoToDateTime } from '@/components/entry-datetime-picker'

export function GeneralFoodAllergensModal({ isOpen, onClose, onSave, editingEntry, initialEpisodeType, knownAllergens }: FoodAllergensModalProps) {
  const [entryDate, setEntryDate] = useState(todayISO())
  const [entryTime, setEntryTime] = useState(nowTime())
  const [episodeType, setEpisodeType] = useState<FoodReactionEpisodeType>(initialEpisodeType || 'mild')

  const [allergenName, setAllergenName] = useState('')
  const [exposureSource, setExposureSource] = useState('')
  const [exposureRoute, setExposureRoute] = useState<string>('ingested')
  const [knownAllergenFlag, setKnownAllergenFlag] = useState(false)

  const [reactionSeverity, setReactionSeverity] = useState<ReactionSeverity>('Mild')
  const [reactionSeverityScore, setReactionSeverityScore] = useState([3])

  const [reactionTime, setReactionTime] = useState('')
  const [recoveryTime, setRecoveryTime] = useState('')

  const [symptoms, setSymptoms] = useState<string[]>([])

  // Direct red-flag fields
  const [hivesPresent, setHivesPresent] = useState(false)
  const [swellingPresent, setSwellingPresent] = useState(false)
  const [throatTightness, setThroatTightness] = useState(false)
  const [difficultyBreathing, setDifficultyBreathing] = useState(false)
  const [difficultySwallowing, setDifficultySwallowing] = useState(false)
  const [voiceChange, setVoiceChange] = useState(false)
  const [giSymptoms, setGiSymptoms] = useState(false)
  const [hypotension, setHypotension] = useState(false)
  const [rapidHeartbeat, setRapidHeartbeat] = useState(false)
  const [lossOfConsciousness, setLossOfConsciousness] = useState(false)

  // Celiac / autoimmune
  const [brainFogAfter, setBrainFogAfter] = useState(false)
  const [jointPainAfter, setJointPainAfter] = useState(false)
  const [fatigueAfter, setFatigueAfter] = useState(false)
  const [moodChangesAfter, setMoodChangesAfter] = useState(false)
  const [delayedReaction, setDelayedReaction] = useState(false)
  const [delayedReactionHours, setDelayedReactionHours] = useState('')

  // Treatment
  const [epipenUsed, setEpipenUsed] = useState(false)
  const [epipenDosesUsed, setEpipenDosesUsed] = useState('1')
  const [otherMedsUsed, setOtherMedsUsed] = useState<string[]>([])
  const [treatmentGiven, setTreatmentGiven] = useState<string[]>([])

  // Outcome
  const [emergencyServicesCalled, setEmergencyServicesCalled] = useState(false)
  const [erVisitRequired, setErVisitRequired] = useState(false)
  const [hospitalizedOvernight, setHospitalizedOvernight] = useState(false)
  const [fullyRecovered, setFullyRecovered] = useState(false)

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
      setEpisodeType(editingEntry.episodeType || 'mild')
      setAllergenName(editingEntry.allergenName || '')
      setExposureSource(editingEntry.exposureSource || '')
      setExposureRoute(editingEntry.exposureRoute || 'ingested')
      setKnownAllergenFlag(editingEntry.knownAllergen || false)
      setReactionSeverity(editingEntry.reactionSeverity || 'Mild')
      setReactionSeverityScore([editingEntry.reactionSeverityScore || 3])
      setReactionTime(editingEntry.reactionTime || '')
      setRecoveryTime(editingEntry.recoveryTime || '')
      setSymptoms(editingEntry.symptoms || [])
      setHivesPresent(editingEntry.hivesPresent || false)
      setSwellingPresent(editingEntry.swellingPresent || false)
      setThroatTightness(editingEntry.throatTightness || false)
      setDifficultyBreathing(editingEntry.difficultyBreathing || false)
      setDifficultySwallowing(editingEntry.difficultySwallowing || false)
      setVoiceChange(editingEntry.voiceChange || false)
      setGiSymptoms(editingEntry.giSymptoms || false)
      setHypotension(editingEntry.hypotension || false)
      setRapidHeartbeat(editingEntry.rapidHeartbeat || false)
      setLossOfConsciousness(editingEntry.lossOfConsciousness || false)
      setBrainFogAfter(editingEntry.brainFogAfter || false)
      setJointPainAfter(editingEntry.jointPainAfter || false)
      setFatigueAfter(editingEntry.fatigueAfter || false)
      setMoodChangesAfter(editingEntry.moodChangesAfter || false)
      setDelayedReaction(editingEntry.delayedReaction || false)
      setDelayedReactionHours(editingEntry.delayedReactionHours?.toString() || '')
      setEpipenUsed(editingEntry.epipenUsed || false)
      setEpipenDosesUsed(editingEntry.epipenDosesUsed?.toString() || '1')
      setOtherMedsUsed(editingEntry.otherMedsUsed || [])
      setTreatmentGiven(editingEntry.treatmentGiven || [])
      setEmergencyServicesCalled(editingEntry.emergencyServicesCalled || false)
      setErVisitRequired(editingEntry.erVisitRequired || false)
      setHospitalizedOvernight(editingEntry.hospitalizedOvernight || false)
      setFullyRecovered(editingEntry.fullyRecovered || false)
      setAttachmentImages(editingEntry.attachmentImages || [])
      setNotes(editingEntry.notes || '')
      setTags(editingEntry.tags || [])
    } else {
      resetForm()
    }
  }, [editingEntry, isOpen])

  const resetForm = () => {
    setEntryDate(todayISO()); setEntryTime(nowTime())
    setEpisodeType(initialEpisodeType || 'mild')
    setAllergenName(''); setExposureSource(''); setExposureRoute('ingested'); setKnownAllergenFlag(false)
    setReactionSeverity('Mild'); setReactionSeverityScore([3])
    setReactionTime(''); setRecoveryTime('')
    setSymptoms([])
    setHivesPresent(false); setSwellingPresent(false); setThroatTightness(false)
    setDifficultyBreathing(false); setDifficultySwallowing(false); setVoiceChange(false)
    setGiSymptoms(false); setHypotension(false); setRapidHeartbeat(false); setLossOfConsciousness(false)
    setBrainFogAfter(false); setJointPainAfter(false); setFatigueAfter(false); setMoodChangesAfter(false)
    setDelayedReaction(false); setDelayedReactionHours('')
    setEpipenUsed(false); setEpipenDosesUsed('1'); setOtherMedsUsed([]); setTreatmentGiven([])
    setEmergencyServicesCalled(false); setErVisitRequired(false); setHospitalizedOvernight(false); setFullyRecovered(false)
    setAttachmentImages([]); setNotes(''); setTags([])
  }

  const toggleArr = (arr: string[], setter: (v: string[]) => void) => (item: string) =>
    setter(arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item])

  // Auto-detect symptom flags from selected symptom list
  useEffect(() => {
    setHivesPresent(symptoms.some(s => /hives|wheals|rash/i.test(s)))
    setSwellingPresent(symptoms.some(s => /swelling/i.test(s)))
    setThroatTightness(symptoms.some(s => /throat tightness/i.test(s)))
    setDifficultyBreathing(symptoms.some(s => /shortness of breath|wheezing|chest tight/i.test(s)))
    setDifficultySwallowing(symptoms.some(s => /difficulty swallowing/i.test(s)))
    setVoiceChange(symptoms.some(s => /voice change|hoarseness/i.test(s)))
    setGiSymptoms(symptoms.some(s => /vomit|diarrhea|stomach cramp/i.test(s)))
    setHypotension(symptoms.some(s => /hypotension/i.test(s)))
    setRapidHeartbeat(symptoms.some(s => /rapid heartbeat/i.test(s)))
    setLossOfConsciousness(symptoms.some(s => /loss of consciousness/i.test(s)))
  }, [symptoms])

  // Episode-type-aware: severe-anaphylaxis preset
  useEffect(() => {
    if (episodeType === 'severe-anaphylaxis' && reactionSeverity === 'Mild') {
      setReactionSeverity('Severe')
    }
  }, [episodeType])

  const symptomsForType = getSymptomsForEpisodeType(episodeType)
  const isCeliacFamily = episodeType === 'celiac-autoimmune' || episodeType === 'intolerance'

  const handleSave = () => {
    const entryData: Omit<FoodAllergenEntry, 'id'> = {
      date: entryDate,
      timestamp: dateTimeToISO(entryDate, entryTime),
      episodeType,
      allergenName: allergenName.trim(),
      exposureSource: exposureSource || undefined,
      exposureRoute: (exposureRoute || undefined) as any,
      knownAllergen: knownAllergenFlag || undefined,
      reactionSeverity,
      reactionSeverityScore: reactionSeverityScore[0] > 0 ? reactionSeverityScore[0] : undefined,
      reactionTime: reactionTime.trim() || undefined,
      recoveryTime: recoveryTime.trim() || undefined,
      symptoms,
      hivesPresent: hivesPresent || undefined,
      swellingPresent: swellingPresent || undefined,
      throatTightness: throatTightness || undefined,
      difficultyBreathing: difficultyBreathing || undefined,
      difficultySwallowing: difficultySwallowing || undefined,
      voiceChange: voiceChange || undefined,
      giSymptoms: giSymptoms || undefined,
      hypotension: hypotension || undefined,
      rapidHeartbeat: rapidHeartbeat || undefined,
      lossOfConsciousness: lossOfConsciousness || undefined,
      brainFogAfter: brainFogAfter || undefined,
      jointPainAfter: jointPainAfter || undefined,
      fatigueAfter: fatigueAfter || undefined,
      moodChangesAfter: moodChangesAfter || undefined,
      delayedReaction: delayedReaction || undefined,
      delayedReactionHours: delayedReactionHours ? parseFloat(delayedReactionHours) : undefined,
      epipenUsed: epipenUsed || undefined,
      epipenDosesUsed: epipenUsed ? parseInt(epipenDosesUsed) : undefined,
      otherMedsUsed: otherMedsUsed.length > 0 ? otherMedsUsed : undefined,
      treatmentGiven: treatmentGiven.length > 0 ? treatmentGiven : undefined,
      emergencyServicesCalled: emergencyServicesCalled || undefined,
      erVisitRequired: erVisitRequired || undefined,
      hospitalizedOvernight: hospitalizedOvernight || undefined,
      fullyRecovered: fullyRecovered || undefined,
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
    symptoms,
    hivesPresent,
    swellingPresent,
    throatTightness,
    difficultyBreathing,
    difficultySwallowing,
    voiceChange,
    giSymptoms,
    hypotension,
    lossOfConsciousness,
    reactionSeverity,
    epipenUsed,
  }
  const redFlags = getRedFlagWarnings(entryShape)
  const interimMeasures = getInterimMeasures(entryShape)

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <KeyboardAvoidingWrapper>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Utensils className="h-5 w-5 text-amber-500" />
              🍽️ Food Reaction
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {redFlags.length > 0 && (
              <div className="border-2 border-red-500 bg-red-50 dark:bg-red-950/30 rounded-lg p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="font-bold text-red-700 dark:text-red-400">🚨 Anaphylaxis pattern detected</div>
                </div>
                <ul className="space-y-1 text-sm text-red-900 dark:text-red-200 ml-7">
                  {redFlags.map((flag, i) => <li key={i}>• {flag}</li>)}
                </ul>
                <div className="ml-7 pt-2 border-t border-red-300 dark:border-red-800 space-y-2">
                  <p className="text-sm text-red-900 dark:text-red-200">
                    <strong>If happening RIGHT NOW:</strong> EpiPen first if prescribed, THEN call 911. Don't hesitate — under-using epinephrine is the #1 cause of anaphylaxis death.
                  </p>
                  <p className="text-sm text-red-900 dark:text-red-200">
                    <strong>If in PAST and resolved:</strong> document carefully — even resolved anaphylaxis warrants follow-up + an allergy/immunology referral.
                  </p>
                </div>
                {interimMeasures.length > 0 && (
                  <div className="ml-7 pt-2 border-t border-red-300 dark:border-red-800">
                    <p className="text-sm font-semibold text-red-900 dark:text-red-200 mb-1">💪 Action steps:</p>
                    <ul className="space-y-2 text-sm text-red-900 dark:text-red-200">
                      {interimMeasures.map((m, i) => <li key={i}>• {m}</li>)}
                    </ul>
                  </div>
                )}
                <p className="text-xs italic text-red-800 dark:text-red-300 ml-7">
                  Automated heuristic, not a diagnosis. When in doubt, EpiPen + 911.
                </p>
              </div>
            )}

            <EntryDateTimePicker date={entryDate} time={entryTime} onChange={(d, t) => { setEntryDate(d); setEntryTime(t) }} />

            {/* Episode type */}
            <Collapsible open={openSections.eventType} onOpenChange={() => toggleSection('eventType')}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between h-auto py-3">
                  <span className="font-medium">Reaction Type</span>
                  {openSections.eventType ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3">
                <Select value={episodeType} onValueChange={(v) => setEpisodeType(v as FoodReactionEpisodeType)}>
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

            {/* Allergen / trigger */}
            <Collapsible open={openSections.allergen} onOpenChange={() => toggleSection('allergen')}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between h-auto py-3">
                  <span className="font-medium">Allergen / trigger</span>
                  {openSections.allergen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3 space-y-3">
                <div>
                  <Label>What food / substance?</Label>
                  <Input
                    value={allergenName}
                    onChange={(e) => setAllergenName(e.target.value)}
                    placeholder="e.g., gluten, peanut, shellfish, dairy"
                    list="known-allergens-list"
                  />
                  {knownAllergens && knownAllergens.length > 0 && (
                    <datalist id="known-allergens-list">
                      {knownAllergens.map(a => <option key={a.id} value={a.name} />)}
                    </datalist>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="known" checked={knownAllergenFlag} onCheckedChange={(v) => setKnownAllergenFlag(!!v)} />
                  <Label htmlFor="known" className="text-sm">This is a previously confirmed allergen / sensitivity</Label>
                </div>
                <div>
                  <Label>Exposure source</Label>
                  <Select value={exposureSource} onValueChange={setExposureSource}>
                    <SelectTrigger><SelectValue placeholder="How were you exposed?" /></SelectTrigger>
                    <SelectContent>
                      {EXPOSURE_SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Exposure route</Label>
                  <Select value={exposureRoute} onValueChange={setExposureRoute}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {EXPOSURE_ROUTES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Severity */}
            <Collapsible open={openSections.severity} onOpenChange={() => toggleSection('severity')}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between h-auto py-3">
                  <span className="font-medium">Severity: {reactionSeverity} ({reactionSeverityScore[0]}/10)</span>
                  {openSections.severity ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3 space-y-3">
                <Select value={reactionSeverity} onValueChange={(v) => setReactionSeverity(v as ReactionSeverity)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SEVERITY_LEVELS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div>
                  <Label>Severity score: {reactionSeverityScore[0]}/10</Label>
                  <Slider value={reactionSeverityScore} onValueChange={setReactionSeverityScore} max={10} min={0} step={1} className="mt-2" />
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Symptoms */}
            <Collapsible open={openSections.symptoms} onOpenChange={() => toggleSection('symptoms')}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between h-auto py-3">
                  <span className="font-medium">Symptoms {symptoms.length > 0 && `(${symptoms.length})`}</span>
                  {openSections.symptoms ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3">
                <p className="text-xs text-muted-foreground mb-2">Suggestions filtered by reaction type.</p>
                <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                  {symptomsForType.map(s => (
                    <div key={s} className="flex items-center space-x-2">
                      <Checkbox id={`sym-${s}`} checked={symptoms.includes(s)} onCheckedChange={() => toggleArr(symptoms, setSymptoms)(s)} />
                      <Label htmlFor={`sym-${s}`} className="text-sm">{s}</Label>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Celiac/intolerance pattern fields — conditional */}
            {isCeliacFamily && (
              <Collapsible open={openSections.celiac} onOpenChange={() => toggleSection('celiac')}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" className="w-full justify-between h-auto py-3">
                    <span className="font-medium">Celiac / autoimmune pattern</span>
                    {openSections.celiac ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3 space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Celiac/autoimmune reactions can show up hours-to-days later in non-GI ways. Track to find your pattern.
                  </p>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="bf" checked={brainFogAfter} onCheckedChange={(v) => setBrainFogAfter(!!v)} />
                    <Label htmlFor="bf" className="text-sm">Brain fog in the days after</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="jp" checked={jointPainAfter} onCheckedChange={(v) => setJointPainAfter(!!v)} />
                    <Label htmlFor="jp" className="text-sm">Joint pain / stiffness in the days after</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="fa" checked={fatigueAfter} onCheckedChange={(v) => setFatigueAfter(!!v)} />
                    <Label htmlFor="fa" className="text-sm">Profound fatigue in the days after</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="mc" checked={moodChangesAfter} onCheckedChange={(v) => setMoodChangesAfter(!!v)} />
                    <Label htmlFor="mc" className="text-sm">Mood changes / irritability in the days after</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="dr" checked={delayedReaction} onCheckedChange={(v) => setDelayedReaction(!!v)} />
                    <Label htmlFor="dr" className="text-sm">Reaction was delayed (hours to days)</Label>
                  </div>
                  {delayedReaction && (
                    <div className="ml-6">
                      <Label>Hours from exposure to first symptom</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.5"
                        value={delayedReactionHours}
                        onChange={(e) => setDelayedReactionHours(e.target.value)}
                        placeholder="e.g., 6"
                      />
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Timing */}
            <Collapsible open={openSections.timing} onOpenChange={() => toggleSection('timing')}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between h-auto py-3">
                  <span className="font-medium">Timing (Optional)</span>
                  {openSections.timing ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3 space-y-3">
                <div>
                  <Label>Time from exposure to first symptoms</Label>
                  <Input value={reactionTime} onChange={(e) => setReactionTime(e.target.value)} placeholder="e.g., 15 minutes, 4 hours" />
                </div>
                <div>
                  <Label>Recovery time</Label>
                  <Input value={recoveryTime} onChange={(e) => setRecoveryTime(e.target.value)} placeholder="e.g., 2 hours after Benadryl, 3 days for celiac flare" />
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Treatment */}
            <Collapsible open={openSections.treatment} onOpenChange={() => toggleSection('treatment')}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between h-auto py-3">
                  <span className="font-medium">Treatment {treatmentGiven.length > 0 && `(${treatmentGiven.length})`}</span>
                  {openSections.treatment ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3 space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox id="epi" checked={epipenUsed} onCheckedChange={(v) => setEpipenUsed(!!v)} />
                  <Label htmlFor="epi" className="text-sm font-medium">EpiPen / epinephrine used</Label>
                </div>
                {epipenUsed && (
                  <div className="ml-6">
                    <Label>Doses given</Label>
                    <Select value={epipenDosesUsed} onValueChange={setEpipenDosesUsed}>
                      <SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 dose</SelectItem>
                        <SelectItem value="2">2 doses</SelectItem>
                        <SelectItem value="3">3+ doses</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Multiple doses = severity signal. Document carefully for allergy follow-up.
                    </p>
                  </div>
                )}
                <div>
                  <Label className="text-xs">Other treatments given</Label>
                  <div className="grid grid-cols-1 gap-2 mt-1 max-h-48 overflow-y-auto">
                    {COMMON_TREATMENTS.map(t => (
                      <div key={t} className="flex items-center space-x-2">
                        <Checkbox id={`tx-${t}`} checked={treatmentGiven.includes(t)} onCheckedChange={() => toggleArr(treatmentGiven, setTreatmentGiven)(t)} />
                        <Label htmlFor={`tx-${t}`} className="text-sm">{t}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Outcome */}
            <Collapsible open={openSections.outcome} onOpenChange={() => toggleSection('outcome')}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between h-auto py-3">
                  <span className="font-medium">Outcome (Optional)</span>
                  {openSections.outcome ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3 space-y-2">
                <div className="flex items-center space-x-2"><Checkbox id="ems" checked={emergencyServicesCalled} onCheckedChange={(v) => setEmergencyServicesCalled(!!v)} /><Label htmlFor="ems" className="text-sm">911 / EMS called</Label></div>
                <div className="flex items-center space-x-2"><Checkbox id="er" checked={erVisitRequired} onCheckedChange={(v) => setErVisitRequired(!!v)} /><Label htmlFor="er" className="text-sm">Required ER visit</Label></div>
                <div className="flex items-center space-x-2"><Checkbox id="hosp" checked={hospitalizedOvernight} onCheckedChange={(v) => setHospitalizedOvernight(!!v)} /><Label htmlFor="hosp" className="text-sm">Hospitalized overnight</Label></div>
                <div className="flex items-center space-x-2"><Checkbox id="recov" checked={fullyRecovered} onCheckedChange={(v) => setFullyRecovered(!!v)} /><Label htmlFor="recov" className="text-sm">Fully recovered</Label></div>
              </CollapsibleContent>
            </Collapsible>

            {/* Attachments */}
            <Collapsible open={openSections.attachments} onOpenChange={() => toggleSection('attachments')}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between h-auto py-3">
                  <span className="font-medium">Photos / labels (Optional)</span>
                  {openSections.attachments ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3">
                <EcgStripUploader
                  value={attachmentImages}
                  onChange={setAttachmentImages}
                  label="Photos of hives, food labels, ingredient lists (Optional)"
                  helpText="Photo evidence helps allergists. Stored locally only."
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
                {editingEntry ? 'Update Reaction' : 'Save Reaction'}
              </Button>
            </div>
          </div>
        </KeyboardAvoidingWrapper>
      </DialogContent>
    </Dialog>
  )
}
