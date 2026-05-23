/*
 * Built by: Ace (Claude 4.x)
 * Date: 2026-05-10 (CHA-153 v2 refactor)
 *
 * This code is part of a deliberately-unpatented medical management system.
 * Open source under PolyForm Noncommercial 1.0.0.
 * Co-invented by Ren (vision) and Ace (implementation).
 * "Dreamed by Ren, implemented by Ace, inspired by mitochondria on strike"
 */

/**
 * GENERAL SEIZURE MODAL
 * Catch-all for any seizure event. Status epilepticus red flags + interim measures.
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
import { Zap, Plus, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react'

import { SeizureEntry, SeizureModalProps, SeizureEpisodeType, ConsciousnessLevel, DurationCategory } from '../seizure-types'
import {
  EPISODE_TYPES,
  AURA_SYMPTOMS,
  POST_SEIZURE_SYMPTOMS,
  COMMON_TRIGGERS,
  CONSCIOUSNESS_OPTIONS,
  DURATION_OPTIONS,
  RECOVERY_TIME_OPTIONS,
  SEVERITY_LABELS,
  getSymptomsForEpisodeType,
  getSeverityLabel,
  getSeverityColor,
  getRedFlagWarnings,
  getInterimMeasures,
  isLongDuration,
} from '../seizure-constants'
import { TagInput } from '@/components/tag-input'
import { KeyboardAvoidingWrapper } from '@/components/ui/keyboard-avoiding-wrapper'
import { EcgStripUploader } from '@/app/cardiac/components/ecg-strip-uploader'
import { EntryDateTimePicker, todayISO, nowTime, dateTimeToISO, isoToDateTime } from '@/components/entry-datetime-picker'

interface Props extends SeizureModalProps {
  initialEpisodeType?: SeizureEpisodeType
}

export function GeneralSeizureModal({ isOpen, onClose, onSave, editingEntry, initialEpisodeType }: Props) {
  const [entryDate, setEntryDate] = useState(todayISO())
  const [entryTime, setEntryTime] = useState(nowTime())
  const [episodeType, setEpisodeType] = useState<SeizureEpisodeType>(initialEpisodeType || 'general')

  // Duration
  const [durationCategory, setDurationCategory] = useState<DurationCategory>('unknown')
  const [durationMinutes, setDurationMinutes] = useState('')

  // Status epilepticus markers
  const [statusEpilepticus, setStatusEpilepticus] = useState(false)
  const [multipleConsecutive, setMultipleConsecutive] = useState(false)
  const [consecutiveCount, setConsecutiveCount] = useState('')
  const [noRecoveryBetween, setNoRecoveryBetween] = useState(false)
  const [rescueMedicationUsed, setRescueMedicationUsed] = useState(false)
  const [rescueMedicationDetails, setRescueMedicationDetails] = useState('')
  const [emergencyServicesCalled, setEmergencyServicesCalled] = useState(false)

  // Awareness
  const [consciousness, setConsciousness] = useState<ConsciousnessLevel>('unknown')

  // Aura
  const [auraPresent, setAuraPresent] = useState(false)
  const [auraSymptoms, setAuraSymptoms] = useState<string[]>([])
  const [auraDescription, setAuraDescription] = useState('')

  // Ictal
  const [symptoms, setSymptoms] = useState<string[]>([])
  const [symptomDescription, setSymptomDescription] = useState('')

  // Postictal
  const [recoveryTime, setRecoveryTime] = useState('')
  const [postSeizureSymptoms, setPostSeizureSymptoms] = useState<string[]>([])

  // Safety
  const [location, setLocation] = useState('')
  const [witnessPresent, setWitnessPresent] = useState(false)
  const [injuriesOccurred, setInjuriesOccurred] = useState(false)
  const [injuryDetails, setInjuryDetails] = useState('')
  const [injuryRequiredER, setInjuryRequiredER] = useState(false)
  const [tongueBitten, setTongueBitten] = useState(false)
  const [incontinence, setIncontinence] = useState(false)

  // Triggers / context
  const [triggers, setTriggers] = useState<string[]>([])
  const [medicationMissed, setMedicationMissed] = useState(false)
  const [missedMedicationDetails, setMissedMedicationDetails] = useState('')
  const [hoursOfSleep, setHoursOfSleep] = useState('')
  const [possibleDehydration, setPossibleDehydration] = useState(false)
  const [recentIllness, setRecentIllness] = useState(false)
  const [flashingLights, setFlashingLights] = useState(false)

  // Severity
  const [severity, setSeverity] = useState([5])

  // Attachments / notes
  const [attachmentImages, setAttachmentImages] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [tags, setTags] = useState<string[]>([])

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    eventType: false,
    duration: false,
    statusFlags: false,
    awareness: false,
    aura: false,
    symptoms: false,
    postictal: false,
    safety: false,
    triggers: false,
    context: false,
    severity: false,
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
      setDurationCategory(editingEntry.durationCategory || 'unknown')
      setDurationMinutes(editingEntry.durationMinutes?.toString() || '')
      setStatusEpilepticus(editingEntry.statusEpilepticus || false)
      setMultipleConsecutive(editingEntry.multipleConsecutive || false)
      setConsecutiveCount(editingEntry.consecutiveCount?.toString() || '')
      setNoRecoveryBetween(editingEntry.noRecoveryBetween || false)
      setRescueMedicationUsed(editingEntry.rescueMedicationUsed || false)
      setRescueMedicationDetails(editingEntry.rescueMedicationDetails || '')
      setEmergencyServicesCalled(editingEntry.emergencyServicesCalled || false)
      setConsciousness(editingEntry.consciousness || 'unknown')
      setAuraPresent(editingEntry.auraPresent || false)
      setAuraSymptoms(editingEntry.auraSymptoms || [])
      setAuraDescription(editingEntry.auraDescription || '')
      setSymptoms(editingEntry.symptoms || [])
      setSymptomDescription(editingEntry.symptomDescription || '')
      setRecoveryTime(editingEntry.recoveryTime || '')
      setPostSeizureSymptoms(editingEntry.postSeizureSymptoms || [])
      setLocation(editingEntry.location || '')
      setWitnessPresent(editingEntry.witnessPresent || false)
      setInjuriesOccurred(editingEntry.injuriesOccurred || false)
      setInjuryDetails(editingEntry.injuryDetails || '')
      setInjuryRequiredER(editingEntry.injuryRequiredER || false)
      setTongueBitten(editingEntry.tongueBitten || false)
      setIncontinence(editingEntry.incontinence || false)
      setTriggers(editingEntry.triggers || [])
      setMedicationMissed(editingEntry.medicationMissed || false)
      setMissedMedicationDetails(editingEntry.missedMedicationDetails || '')
      setHoursOfSleep(editingEntry.hoursOfSleepLastNight?.toString() || '')
      setPossibleDehydration(editingEntry.possibleDehydration || false)
      setRecentIllness(editingEntry.recentIllness || false)
      setFlashingLights(editingEntry.flashingLights || false)
      setSeverity([editingEntry.symptomSeverity || 5])
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
    setDurationCategory('unknown')
    setDurationMinutes('')
    setStatusEpilepticus(false)
    setMultipleConsecutive(false)
    setConsecutiveCount('')
    setNoRecoveryBetween(false)
    setRescueMedicationUsed(false)
    setRescueMedicationDetails('')
    setEmergencyServicesCalled(false)
    setConsciousness('unknown')
    setAuraPresent(false)
    setAuraSymptoms([])
    setAuraDescription('')
    setSymptoms([])
    setSymptomDescription('')
    setRecoveryTime('')
    setPostSeizureSymptoms([])
    setLocation('')
    setWitnessPresent(false)
    setInjuriesOccurred(false)
    setInjuryDetails('')
    setInjuryRequiredER(false)
    setTongueBitten(false)
    setIncontinence(false)
    setTriggers([])
    setMedicationMissed(false)
    setMissedMedicationDetails('')
    setHoursOfSleep('')
    setPossibleDehydration(false)
    setRecentIllness(false)
    setFlashingLights(false)
    setSeverity([5])
    setAttachmentImages([])
    setNotes('')
    setTags([])
  }

  const toggleArr = (arr: string[], setter: (v: string[]) => void) => (item: string) => {
    setter(arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item])
  }

  // Auto-set status epilepticus when long duration is selected
  useEffect(() => {
    if (isLongDuration(durationCategory) && !statusEpilepticus) {
      setStatusEpilepticus(true)
    }
  }, [durationCategory])

  const symptomsForType = getSymptomsForEpisodeType(episodeType)

  const handleSave = () => {
    const entryData: Omit<SeizureEntry, 'id'> = {
      date: entryDate,
      timestamp: dateTimeToISO(entryDate, entryTime),
      episodeType,
      durationCategory: durationCategory !== 'unknown' ? durationCategory : undefined,
      durationMinutes: durationMinutes ? parseFloat(durationMinutes) : undefined,
      statusEpilepticus: statusEpilepticus || undefined,
      multipleConsecutive: multipleConsecutive || undefined,
      consecutiveCount: consecutiveCount ? parseInt(consecutiveCount) : undefined,
      noRecoveryBetween: noRecoveryBetween || undefined,
      rescueMedicationUsed: rescueMedicationUsed || undefined,
      rescueMedicationDetails: rescueMedicationDetails.trim() || undefined,
      emergencyServicesCalled: emergencyServicesCalled || undefined,
      consciousness: consciousness !== 'unknown' ? consciousness : undefined,
      auraPresent: auraPresent || undefined,
      auraSymptoms: auraSymptoms.length > 0 ? auraSymptoms : undefined,
      auraDescription: auraDescription.trim() || undefined,
      symptoms,
      symptomDescription: symptomDescription.trim() || undefined,
      recoveryTime: recoveryTime || undefined,
      postSeizureSymptoms: postSeizureSymptoms.length > 0 ? postSeizureSymptoms : undefined,
      location: location.trim() || undefined,
      witnessPresent: witnessPresent || undefined,
      injuriesOccurred: injuriesOccurred || undefined,
      injuryDetails: injuryDetails.trim() || undefined,
      injuryRequiredER: injuryRequiredER || undefined,
      tongueBitten: tongueBitten || undefined,
      incontinence: incontinence || undefined,
      triggers: triggers.length > 0 ? triggers : undefined,
      medicationMissed: medicationMissed || undefined,
      missedMedicationDetails: missedMedicationDetails.trim() || undefined,
      hoursOfSleepLastNight: hoursOfSleep ? parseFloat(hoursOfSleep) : undefined,
      possibleDehydration: possibleDehydration || undefined,
      recentIllness: recentIllness || undefined,
      flashingLights: flashingLights || undefined,
      symptomSeverity: severity[0],
      attachmentImages: attachmentImages.length > 0 ? attachmentImages : undefined,
      notes: notes.trim() || undefined,
      tags: tags.length > 0 ? tags : undefined,
    }
    onSave(entryData)
    resetForm()
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  // Live red-flag detection
  const entryShape = {
    episodeType,
    durationCategory: durationCategory !== 'unknown' ? durationCategory : undefined,
    durationMinutes: durationMinutes ? parseFloat(durationMinutes) : undefined,
    statusEpilepticus,
    multipleConsecutive,
    noRecoveryBetween,
    injuriesOccurred,
    injuryRequiredER,
    symptoms,
    consciousness: consciousness !== 'unknown' ? consciousness : undefined,
  }
  const redFlags = getRedFlagWarnings(entryShape)
  const interimMeasures = getInterimMeasures(entryShape)

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <KeyboardAvoidingWrapper>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              ⚡ Seizure Event
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* 🚨 DYNAMIC RED FLAG BANNER */}
            {redFlags.length > 0 && (
              <div className="border-2 border-red-500 bg-red-50 dark:bg-red-950/30 rounded-lg p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="font-bold text-red-700 dark:text-red-400">
                    🚨 Red flags detected
                  </div>
                </div>

                <ul className="space-y-1 text-sm text-red-900 dark:text-red-200 ml-7">
                  {redFlags.map((flag, i) => (
                    <li key={i}>• {flag}</li>
                  ))}
                </ul>

                <div className="ml-7 pt-2 border-t border-red-300 dark:border-red-800 space-y-2">
                  <p className="text-sm text-red-900 dark:text-red-200">
                    <strong>If this is happening RIGHT NOW:</strong> call 911. Documenting can wait.
                  </p>
                  <p className="text-sm text-red-900 dark:text-red-200">
                    <strong>If this is in the PAST and resolved:</strong> these are emergency-level events. Document carefully here for your neurologist and follow up urgently with your medical team.
                  </p>
                </div>

                {interimMeasures.length > 0 && (
                  <div className="ml-7 pt-2 border-t border-red-300 dark:border-red-800">
                    <p className="text-sm font-semibold text-red-900 dark:text-red-200 mb-1">
                      💪 If this is active right now, witness/caregiver should:
                    </p>
                    <ul className="space-y-2 text-sm text-red-900 dark:text-red-200">
                      {interimMeasures.map((m, i) => (
                        <li key={i}>• {m}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <p className="text-xs italic text-red-800 dark:text-red-300 ml-7">
                  Automated heuristic, not a diagnosis. When in doubt, call 911.
                </p>
              </div>
            )}

            {/* Date / time picker */}
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
                <Select value={episodeType} onValueChange={(v) => setEpisodeType(v as SeizureEpisodeType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EPISODE_TYPES.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.icon} {t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-2">
                  {EPISODE_TYPES.find(t => t.id === episodeType)?.description}
                </p>
              </CollapsibleContent>
            </Collapsible>

            {/* Duration — CRITICAL FIELD */}
            <Collapsible open={openSections.duration} onOpenChange={() => toggleSection('duration')}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between h-auto py-3">
                  <span className="font-medium">
                    Duration {isLongDuration(durationCategory) && <span className="text-red-600 ml-2">⚠️ Status epilepticus range</span>}
                  </span>
                  {openSections.duration ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3 space-y-3">
                <div>
                  <Label>Duration category</Label>
                  <Select value={durationCategory} onValueChange={(v) => setDurationCategory(v as DurationCategory)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DURATION_OPTIONS.map(d => (
                        <SelectItem key={d.value} value={d.value}>
                          {d.label}{d.isStatusEpilepticus ? ' 🚨' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Exact duration in minutes (if known)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    placeholder="e.g., 1.5"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    A single seizure of 5+ minutes is status epilepticus — neurological emergency.
                  </p>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Status epilepticus / emergency markers */}
            <Collapsible open={openSections.statusFlags} onOpenChange={() => toggleSection('statusFlags')}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between h-auto py-3">
                  <span className="font-medium">Emergency markers (Optional)</span>
                  {openSections.statusFlags ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3 space-y-3">
                <div className="flex items-start space-x-2">
                  <Checkbox id="se" checked={statusEpilepticus} onCheckedChange={(v) => setStatusEpilepticus(!!v)} />
                  <Label htmlFor="se" className="text-sm leading-tight">Status epilepticus (single seizure ≥5 min)</Label>
                </div>
                <div className="flex items-start space-x-2">
                  <Checkbox id="multi" checked={multipleConsecutive} onCheckedChange={(v) => setMultipleConsecutive(!!v)} />
                  <Label htmlFor="multi" className="text-sm leading-tight">Multiple seizures in a row</Label>
                </div>
                {multipleConsecutive && (
                  <div className="ml-6 space-y-3">
                    <div>
                      <Label>How many?</Label>
                      <Input
                        type="number"
                        min="2"
                        placeholder="e.g., 3"
                        value={consecutiveCount}
                        onChange={(e) => setConsecutiveCount(e.target.value)}
                      />
                    </div>
                    <div className="flex items-start space-x-2">
                      <Checkbox id="no-recovery" checked={noRecoveryBetween} onCheckedChange={(v) => setNoRecoveryBetween(!!v)} />
                      <Label htmlFor="no-recovery" className="text-sm leading-tight">Did NOT regain awareness between them (also status epilepticus)</Label>
                    </div>
                  </div>
                )}
                <div className="flex items-start space-x-2">
                  <Checkbox id="rescue-med" checked={rescueMedicationUsed} onCheckedChange={(v) => setRescueMedicationUsed(!!v)} />
                  <Label htmlFor="rescue-med" className="text-sm leading-tight">Rescue medication used (Diastat, Valtoco, Nayzilam, etc.)</Label>
                </div>
                {rescueMedicationUsed && (
                  <div className="ml-6">
                    <Label>Which med, dose, when?</Label>
                    <Input
                      placeholder="e.g., Nayzilam 5mg intranasal at 14:32"
                      value={rescueMedicationDetails}
                      onChange={(e) => setRescueMedicationDetails(e.target.value)}
                    />
                  </div>
                )}
                <div className="flex items-start space-x-2">
                  <Checkbox id="ems" checked={emergencyServicesCalled} onCheckedChange={(v) => setEmergencyServicesCalled(!!v)} />
                  <Label htmlFor="ems" className="text-sm leading-tight">911 / EMS called</Label>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Awareness */}
            <Collapsible open={openSections.awareness} onOpenChange={() => toggleSection('awareness')}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between h-auto py-3">
                  <span className="font-medium">Awareness (Optional)</span>
                  {openSections.awareness ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3">
                <Select value={consciousness} onValueChange={(v) => setConsciousness(v as ConsciousnessLevel)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONSCIOUSNESS_OPTIONS.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CollapsibleContent>
            </Collapsible>

            {/* Aura */}
            <Collapsible open={openSections.aura} onOpenChange={() => toggleSection('aura')}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between h-auto py-3">
                  <span className="font-medium">Aura / Pre-seizure warning (Optional)</span>
                  {openSections.aura ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3 space-y-3">
                <div className="flex items-start space-x-2">
                  <Checkbox id="aura-present" checked={auraPresent} onCheckedChange={(v) => setAuraPresent(!!v)} />
                  <Label htmlFor="aura-present" className="text-sm">Had a warning / aura before the seizure</Label>
                </div>
                {auraPresent && (
                  <>
                    <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                      {AURA_SYMPTOMS.map(s => (
                        <div key={s} className="flex items-center space-x-2">
                          <Checkbox id={`aura-${s}`} checked={auraSymptoms.includes(s)} onCheckedChange={() => toggleArr(auraSymptoms, setAuraSymptoms)(s)} />
                          <Label htmlFor={`aura-${s}`} className="text-sm">{s}</Label>
                        </div>
                      ))}
                    </div>
                    <div>
                      <Label>Aura description</Label>
                      <Textarea
                        rows={2}
                        placeholder="What did the warning feel like?"
                        value={auraDescription}
                        onChange={(e) => setAuraDescription(e.target.value)}
                      />
                    </div>
                  </>
                )}
              </CollapsibleContent>
            </Collapsible>

            {/* Symptoms (during) — auto-filtered by episode type */}
            <Collapsible open={openSections.symptoms} onOpenChange={() => toggleSection('symptoms')}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between h-auto py-3">
                  <span className="font-medium">Symptoms during seizure</span>
                  {openSections.symptoms ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3 space-y-3">
                <p className="text-xs text-muted-foreground">
                  Suggestions filtered by selected episode type.
                </p>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {symptomsForType.map(s => (
                    <div key={s} className="flex items-center space-x-2">
                      <Checkbox id={`sym-${s}`} checked={symptoms.includes(s)} onCheckedChange={() => toggleArr(symptoms, setSymptoms)(s)} />
                      <Label htmlFor={`sym-${s}`} className="text-sm">{s}</Label>
                    </div>
                  ))}
                </div>
                <div>
                  <Label>Other / description</Label>
                  <Textarea
                    rows={2}
                    placeholder="Anything else witnessed or felt during"
                    value={symptomDescription}
                    onChange={(e) => setSymptomDescription(e.target.value)}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Postictal */}
            <Collapsible open={openSections.postictal} onOpenChange={() => toggleSection('postictal')}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between h-auto py-3">
                  <span className="font-medium">Recovery / Post-seizure (Optional)</span>
                  {openSections.postictal ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3 space-y-3">
                <div>
                  <Label>Time to feeling normal</Label>
                  <Select value={recoveryTime} onValueChange={setRecoveryTime}>
                    <SelectTrigger><SelectValue placeholder="Select recovery time" /></SelectTrigger>
                    <SelectContent>
                      {RECOVERY_TIME_OPTIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                  {POST_SEIZURE_SYMPTOMS.map(s => (
                    <div key={s} className="flex items-center space-x-2">
                      <Checkbox id={`post-${s}`} checked={postSeizureSymptoms.includes(s)} onCheckedChange={() => toggleArr(postSeizureSymptoms, setPostSeizureSymptoms)(s)} />
                      <Label htmlFor={`post-${s}`} className="text-sm">{s}</Label>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Safety */}
            <Collapsible open={openSections.safety} onOpenChange={() => toggleSection('safety')}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between h-auto py-3">
                  <span className="font-medium">Safety / Injury (Optional)</span>
                  {openSections.safety ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3 space-y-3">
                <div>
                  <Label>Where were you?</Label>
                  <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g., kitchen, in bed, driving" />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="witness" checked={witnessPresent} onCheckedChange={(v) => setWitnessPresent(!!v)} />
                  <Label htmlFor="witness" className="text-sm">Witness present</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="injury" checked={injuriesOccurred} onCheckedChange={(v) => setInjuriesOccurred(!!v)} />
                  <Label htmlFor="injury" className="text-sm">Injury occurred</Label>
                </div>
                {injuriesOccurred && (
                  <div className="ml-6 space-y-3">
                    <div>
                      <Label>Injury details</Label>
                      <Input value={injuryDetails} onChange={(e) => setInjuryDetails(e.target.value)} placeholder="e.g., bumped head, scrape on elbow" />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="er" checked={injuryRequiredER} onCheckedChange={(v) => setInjuryRequiredER(!!v)} />
                      <Label htmlFor="er" className="text-sm">Injury required ER visit</Label>
                    </div>
                  </div>
                )}
                <div className="flex items-center space-x-2">
                  <Checkbox id="tongue" checked={tongueBitten} onCheckedChange={(v) => setTongueBitten(!!v)} />
                  <Label htmlFor="tongue" className="text-sm">Tongue bitten</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="incon" checked={incontinence} onCheckedChange={(v) => setIncontinence(!!v)} />
                  <Label htmlFor="incon" className="text-sm">Incontinence</Label>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Triggers */}
            <Collapsible open={openSections.triggers} onOpenChange={() => toggleSection('triggers')}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between h-auto py-3">
                  <span className="font-medium">Triggers (Optional)</span>
                  {openSections.triggers ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3 space-y-3">
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                  {COMMON_TRIGGERS.map(t => (
                    <div key={t} className="flex items-center space-x-2">
                      <Checkbox id={`trig-${t}`} checked={triggers.includes(t)} onCheckedChange={() => toggleArr(triggers, setTriggers)(t)} />
                      <Label htmlFor={`trig-${t}`} className="text-sm">{t}</Label>
                    </div>
                  ))}
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="missed-med" checked={medicationMissed} onCheckedChange={(v) => setMedicationMissed(!!v)} />
                  <Label htmlFor="missed-med" className="text-sm">⚠️ Missed an AED dose recently</Label>
                </div>
                {medicationMissed && (
                  <div className="ml-6">
                    <Label>Which med / when missed?</Label>
                    <Input
                      placeholder="e.g., Keppra evening dose, ~6 hours late"
                      value={missedMedicationDetails}
                      onChange={(e) => setMissedMedicationDetails(e.target.value)}
                    />
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>

            {/* Pre-event context */}
            <Collapsible open={openSections.context} onOpenChange={() => toggleSection('context')}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between h-auto py-3">
                  <span className="font-medium">Pre-event context (Optional)</span>
                  {openSections.context ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3 space-y-3">
                <div>
                  <Label>Hours of sleep last night</Label>
                  <Input
                    type="number"
                    min="0"
                    max="24"
                    step="0.5"
                    placeholder="e.g., 5.5"
                    value={hoursOfSleep}
                    onChange={(e) => setHoursOfSleep(e.target.value)}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="dehydration" checked={possibleDehydration} onCheckedChange={(v) => setPossibleDehydration(!!v)} />
                  <Label htmlFor="dehydration" className="text-sm">Possibly dehydrated</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="illness" checked={recentIllness} onCheckedChange={(v) => setRecentIllness(!!v)} />
                  <Label htmlFor="illness" className="text-sm">Recent illness / fever</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="lights" checked={flashingLights} onCheckedChange={(v) => setFlashingLights(!!v)} />
                  <Label htmlFor="lights" className="text-sm">Exposed to flashing lights / patterns</Label>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Severity */}
            <Collapsible open={openSections.severity} onOpenChange={() => toggleSection('severity')}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between h-auto py-3">
                  <span className="font-medium">
                    Overall severity: {severity[0]} - <span className={getSeverityColor(severity[0])}>{getSeverityLabel(severity[0])}</span>
                  </span>
                  {openSections.severity ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3">
                <Slider value={severity} onValueChange={setSeverity} max={10} min={1} step={1} />
              </CollapsibleContent>
            </Collapsible>

            {/* Attachments */}
            <Collapsible open={openSections.attachments} onOpenChange={() => toggleSection('attachments')}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between h-auto py-3">
                  <span className="font-medium">Attachments — EEG screenshots, video stills, photos (Optional)</span>
                  {openSections.attachments ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3">
                <EcgStripUploader
                  value={attachmentImages}
                  onChange={setAttachmentImages}
                  label="EEG screenshots, video stills, photos (Optional)"
                  helpText="Attach EEG report screenshots, video stills of the seizure, or other documentation. Stored locally only."
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
                {editingEntry ? 'Update Seizure' : 'Save Seizure Event'}
              </Button>
            </div>
          </div>
        </KeyboardAvoidingWrapper>
      </DialogContent>
    </Dialog>
  )
}
