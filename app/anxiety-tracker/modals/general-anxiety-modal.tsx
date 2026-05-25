/*
 * Built by: Ace (Claude 4.x)
 * Date: 2026-05-10 (CHA-157 v2 refactor)
 *
 * Open source under PolyForm Noncommercial 1.0.0.
 * Co-invented by Ren (vision) and Ace (implementation).
 * "Dreamed by Ren, implemented by Ace, inspired by mitochondria on strike"
 */

/**
 * GENERAL ANXIETY MODAL
 * Multi-modal — handles panic, generalized, social, phobic, OCD-shaped,
 * meltdown, shutdown. Surfaces 988 / crisis red flags when suicidal
 * ideation or self-harm urges are reported.
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
import { Heart, Plus, AlertTriangle, ChevronDown, ChevronRight, LifeBuoy } from 'lucide-react'

import { AnxietyEntry, AnxietyModalProps, AnxietyEpisodeType } from '../anxiety-types'
import {
  EPISODE_TYPES,
  PHYSICAL_SYMPTOMS,
  MENTAL_SYMPTOMS,
  COMMON_TRIGGERS,
  COPING_STRATEGIES,
  DURATION_OPTIONS,
  ONSET_SPEED,
  SOCIAL_CONTEXT,
  AFTER_EFFECTS,
  getRedFlagWarnings,
  getInterimMeasures,
} from '../anxiety-constants'
import { TagInput } from '@/components/tag-input'
import { KeyboardAvoidingWrapper } from '@/components/ui/keyboard-avoiding-wrapper'
import { EntryDateTimePicker, todayISO, nowTime, dateTimeToISO, isoToDateTime } from '@/components/entry-datetime-picker'

export function GeneralAnxietyModal({ isOpen, onClose, onSave, editingEntry, initialEpisodeType }: AnxietyModalProps) {
  const [entryDate, setEntryDate] = useState(todayISO())
  const [entryTime, setEntryTime] = useState(nowTime())
  const [episodeType, setEpisodeType] = useState<AnxietyEpisodeType>(initialEpisodeType || 'generalized')

  const [anxietyLevel, setAnxietyLevel] = useState([5])
  const [panicLevel, setPanicLevel] = useState([0])

  const [physicalSymptoms, setPhysicalSymptoms] = useState<string[]>([])
  const [mentalSymptoms, setMentalSymptoms] = useState<string[]>([])

  const [triggers, setTriggers] = useState<string[]>([])
  const [location, setLocation] = useState('')
  const [socialContext, setSocialContext] = useState('')

  const [duration, setDuration] = useState('')
  const [peakIntensity, setPeakIntensity] = useState([5])
  const [onsetSpeed, setOnsetSpeed] = useState('')

  const [copingStrategies, setCopingStrategies] = useState<string[]>([])
  const [recoveryTime, setRecoveryTime] = useState('')

  // 🚨 988 / crisis fields
  const [suicidalIdeation, setSuicidalIdeation] = useState(false)
  const [selfHarmUrges, setSelfHarmUrges] = useState(false)
  const [intrusiveThoughtsHarm, setIntrusiveThoughtsHarm] = useState(false)
  const [feelingHopeless, setFeelingHopeless] = useState(false)
  const [crisisContactMade, setCrisisContactMade] = useState(false)
  const [crisisContactType, setCrisisContactType] = useState<string>('')
  const [hospitalizationConsidered, setHospitalizationConsidered] = useState(false)
  const [emergencyServicesCalled, setEmergencyServicesCalled] = useState(false)
  const [erVisitRequired, setErVisitRequired] = useState(false)

  // OCD fields
  const [intrusionTheme, setIntrusionTheme] = useState('')
  const [compulsionsPerformed, setCompulsionsPerformed] = useState<string[]>([])
  const [resistanceLevel, setResistanceLevel] = useState([5])

  // Phobic fields
  const [phobiaTrigger, setPhobiaTrigger] = useState('')
  const [avoidanceUsed, setAvoidanceUsed] = useState(false)

  // Aftermath
  const [afterEffects, setAfterEffects] = useState<string[]>([])
  const [shutdownAfter, setShutdownAfter] = useState(false)

  const [notes, setNotes] = useState('')
  const [tags, setTags] = useState<string[]>([])

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({})
  const toggleSection = (key: string) => setOpenSections(prev => ({ ...prev, [key]: !prev[key] }))

  useEffect(() => {
    if (editingEntry) {
      const ts = editingEntry.timestamp
      if (ts) {
        const dt = isoToDateTime(ts)
        setEntryDate(editingEntry.date || dt.date)
        setEntryTime(editingEntry.time || dt.time)
      } else {
        setEntryDate(editingEntry.date || todayISO())
        setEntryTime(editingEntry.time || nowTime())
      }
      setEpisodeType((editingEntry.episodeType || editingEntry.anxietyType || 'generalized') as AnxietyEpisodeType)
      setAnxietyLevel([editingEntry.anxietyLevel || 5])
      setPanicLevel([editingEntry.panicLevel || 0])
      setPhysicalSymptoms(editingEntry.physicalSymptoms || [])
      setMentalSymptoms(editingEntry.mentalSymptoms || [])
      setTriggers(editingEntry.triggers || [])
      setLocation(editingEntry.location || '')
      setSocialContext(editingEntry.socialContext || '')
      setDuration(editingEntry.duration || '')
      setPeakIntensity([editingEntry.peakIntensity || 5])
      setOnsetSpeed(editingEntry.onsetSpeed || '')
      setCopingStrategies(editingEntry.copingStrategies || [])
      setRecoveryTime(editingEntry.recoveryTime || '')
      setSuicidalIdeation(editingEntry.suicidalIdeation || false)
      setSelfHarmUrges(editingEntry.selfHarmUrges || false)
      setIntrusiveThoughtsHarm(editingEntry.intrusiveThoughtsHarm || false)
      setFeelingHopeless(editingEntry.feelingHopeless || false)
      setCrisisContactMade(editingEntry.crisisContactMade || false)
      setCrisisContactType(editingEntry.crisisContactType || '')
      setHospitalizationConsidered(editingEntry.hospitalizationConsidered || false)
      setEmergencyServicesCalled(editingEntry.emergencyServicesCalled || false)
      setErVisitRequired(editingEntry.erVisitRequired || false)
      setIntrusionTheme(editingEntry.intrusionTheme || '')
      setCompulsionsPerformed(editingEntry.compulsionsPerformed || [])
      setResistanceLevel([editingEntry.resistanceLevel || 5])
      setPhobiaTrigger(editingEntry.phobiaTrigger || '')
      setAvoidanceUsed(editingEntry.avoidanceUsed || false)
      setAfterEffects(editingEntry.afterEffects || [])
      setShutdownAfter(editingEntry.shutdownAfter || false)
      setNotes(editingEntry.notes || '')
      setTags(editingEntry.tags || [])
    } else {
      resetForm()
    }
  }, [editingEntry, isOpen])

  const resetForm = () => {
    setEntryDate(todayISO()); setEntryTime(nowTime())
    setEpisodeType(initialEpisodeType || 'generalized')
    setAnxietyLevel([5]); setPanicLevel([0])
    setPhysicalSymptoms([]); setMentalSymptoms([])
    setTriggers([]); setLocation(''); setSocialContext('')
    setDuration(''); setPeakIntensity([5]); setOnsetSpeed('')
    setCopingStrategies([]); setRecoveryTime('')
    setSuicidalIdeation(false); setSelfHarmUrges(false)
    setIntrusiveThoughtsHarm(false); setFeelingHopeless(false)
    setCrisisContactMade(false); setCrisisContactType('')
    setHospitalizationConsidered(false); setEmergencyServicesCalled(false); setErVisitRequired(false)
    setIntrusionTheme(''); setCompulsionsPerformed([]); setResistanceLevel([5])
    setPhobiaTrigger(''); setAvoidanceUsed(false)
    setAfterEffects([]); setShutdownAfter(false)
    setNotes(''); setTags([])
  }

  const toggleArr = (arr: string[], setter: (v: string[]) => void) => (item: string) =>
    setter(arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item])

  const handleSave = () => {
    const entryData: Omit<AnxietyEntry, 'id'> = {
      timestamp: dateTimeToISO(entryDate, entryTime),
      date: entryDate,
      time: entryTime,
      episodeType,
      anxietyLevel: anxietyLevel[0],
      panicLevel: panicLevel[0],
      anxietyType: episodeType,  // legacy field
      physicalSymptoms,
      mentalSymptoms,
      triggers,
      location: location.trim(),
      socialContext: socialContext.trim(),
      duration: duration || '',
      peakIntensity: peakIntensity[0],
      onsetSpeed: onsetSpeed || '',
      copingStrategies,
      copingEffectiveness: {},
      recoveryTime: recoveryTime || '',
      panicSymptoms: [],
      meltdownTriggers: [],
      shutdownAfter,
      supportReceived: [],
      afterEffects,
      warningSigns: [],
      preventionAttempts: [],
      lessonsLearned: '',
      suicidalIdeation: suicidalIdeation || undefined,
      selfHarmUrges: selfHarmUrges || undefined,
      intrusiveThoughtsHarm: intrusiveThoughtsHarm || undefined,
      feelingHopeless: feelingHopeless || undefined,
      crisisContactMade: crisisContactMade || undefined,
      crisisContactType: (crisisContactType || undefined) as any,
      hospitalizationConsidered: hospitalizationConsidered || undefined,
      emergencyServicesCalled: emergencyServicesCalled || undefined,
      erVisitRequired: erVisitRequired || undefined,
      intrusionTheme: intrusionTheme.trim() || undefined,
      compulsionsPerformed: compulsionsPerformed.length > 0 ? compulsionsPerformed : undefined,
      resistanceLevel: episodeType === 'ocd-shaped' ? resistanceLevel[0] : undefined,
      phobiaTrigger: phobiaTrigger.trim() || undefined,
      avoidanceUsed: avoidanceUsed || undefined,
      notes: notes.trim(),
      tags,
      createdAt: editingEntry?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    onSave(entryData)
    resetForm()
  }

  const handleClose = () => { resetForm(); onClose() }

  const entryShape = {
    episodeType,
    anxietyLevel: anxietyLevel[0],
    panicLevel: panicLevel[0],
    suicidalIdeation,
    selfHarmUrges,
    intrusiveThoughtsHarm,
    feelingHopeless,
    hospitalizationConsidered,
    physicalSymptoms,
  }
  const redFlags = getRedFlagWarnings(entryShape)
  const interimMeasures = getInterimMeasures(entryShape)

  const isOCD = episodeType === 'ocd-shaped'
  const isPhobic = episodeType === 'phobic'

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <KeyboardAvoidingWrapper>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-purple-500" />
              💜 Anxiety Episode
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {redFlags.length > 0 && (
              <div className="border-2 border-destructive bg-destructive text-destructive-foreground rounded-lg p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <LifeBuoy className="h-5 w-5 text-destructive-foreground flex-shrink-0 mt-0.5" />
                  <div className="font-bold text-destructive-foreground">💜 Crisis support is available</div>
                </div>
                <ul className="space-y-1 text-sm text-destructive-foreground ml-7">
                  {redFlags.map((flag, i) => <li key={i}>• {flag}</li>)}
                </ul>
                <div className="ml-7 pt-2 border-t border-destructive-foreground/30 space-y-2">
                  <p className="text-sm text-destructive-foreground font-semibold">
                    988 — call or text. Available 24/7. Free. Confidential.
                  </p>
                  <p className="text-sm text-destructive-foreground">
                    Crisis Text Line: text HOME to 741741. International: <a href="https://findahelpline.com" target="_blank" rel="noopener noreferrer" className="underline">findahelpline.com</a>
                  </p>
                </div>
                {interimMeasures.length > 0 && (
                  <div className="ml-7 pt-2 border-t border-destructive-foreground/30">
                    <p className="text-sm font-semibold text-destructive-foreground mb-1">💪 Right now:</p>
                    <ul className="space-y-2 text-sm text-destructive-foreground">
                      {interimMeasures.map((m, i) => <li key={i}>• {m}</li>)}
                    </ul>
                  </div>
                )}
                <p className="text-xs italic text-destructive-foreground ml-7">
                  You don't have to be alone in this. Reaching out is brave, not weak.
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
                <Select value={episodeType} onValueChange={(v) => setEpisodeType(v as AnxietyEpisodeType)}>
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

            {/* Anxiety + panic levels */}
            <Collapsible open={openSections.levels} onOpenChange={() => toggleSection('levels')}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between h-auto py-3">
                  <span className="font-medium">Anxiety: {anxietyLevel[0]}/10  •  Panic: {panicLevel[0]}/10</span>
                  {openSections.levels ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3 space-y-4">
                <div>
                  <Label>Anxiety level: {anxietyLevel[0]}/10</Label>
                  <Slider value={anxietyLevel} onValueChange={setAnxietyLevel} max={10} min={0} step={1} className="mt-2" />
                </div>
                <div>
                  <Label>Panic level: {panicLevel[0]}/10 (0 = no panic, 10 = full meltdown)</Label>
                  <Slider value={panicLevel} onValueChange={setPanicLevel} max={10} min={0} step={1} className="mt-2" />
                </div>
                <div>
                  <Label>Peak intensity reached: {peakIntensity[0]}/10</Label>
                  <Slider value={peakIntensity} onValueChange={setPeakIntensity} max={10} min={0} step={1} className="mt-2" />
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* 🚨 988 / Crisis check */}
            <Collapsible open={openSections.crisis} onOpenChange={() => toggleSection('crisis')}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between h-auto py-3 border-destructive">
                  <span className="font-medium text-destructive">💜 Crisis check (Optional but important)</span>
                  {openSections.crisis ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3 space-y-2">
                <p className="text-xs text-muted-foreground">
                  These check-ins matter. They're only for you and your therapist — and they help spot patterns over time.
                </p>
                <div className="flex items-start space-x-2"><Checkbox id="si" checked={suicidalIdeation} onCheckedChange={(v) => setSuicidalIdeation(!!v)} /><Label htmlFor="si" className="text-sm">💜 Thoughts of suicide / dying / "not being here"</Label></div>
                <div className="flex items-start space-x-2"><Checkbox id="sh" checked={selfHarmUrges} onCheckedChange={(v) => setSelfHarmUrges(!!v)} /><Label htmlFor="sh" className="text-sm">💜 Urges to harm self</Label></div>
                <div className="flex items-start space-x-2"><Checkbox id="it" checked={intrusiveThoughtsHarm} onCheckedChange={(v) => setIntrusiveThoughtsHarm(!!v)} /><Label htmlFor="it" className="text-sm">Intrusive thoughts about harm (anxiety/OCD-shaped, not intent)</Label></div>
                <div className="flex items-start space-x-2"><Checkbox id="hope" checked={feelingHopeless} onCheckedChange={(v) => setFeelingHopeless(!!v)} /><Label htmlFor="hope" className="text-sm">Feeling hopeless</Label></div>
                <div className="flex items-start space-x-2"><Checkbox id="cm" checked={crisisContactMade} onCheckedChange={(v) => setCrisisContactMade(!!v)} /><Label htmlFor="cm" className="text-sm">Reached out for crisis support</Label></div>
                {crisisContactMade && (
                  <div className="ml-6">
                    <Label className="text-xs">Who?</Label>
                    <Select value={crisisContactType} onValueChange={setCrisisContactType}>
                      <SelectTrigger className="max-w-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="988">988 (call/text)</SelectItem>
                        <SelectItem value="therapist">Therapist</SelectItem>
                        <SelectItem value="crisis-line">Other crisis line</SelectItem>
                        <SelectItem value="friend">Trusted friend / family</SelectItem>
                        <SelectItem value="er">ER</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="flex items-start space-x-2"><Checkbox id="hosp" checked={hospitalizationConsidered} onCheckedChange={(v) => setHospitalizationConsidered(!!v)} /><Label htmlFor="hosp" className="text-sm">Considered hospitalization</Label></div>
                <div className="flex items-start space-x-2"><Checkbox id="ems" checked={emergencyServicesCalled} onCheckedChange={(v) => setEmergencyServicesCalled(!!v)} /><Label htmlFor="ems" className="text-sm">911 / EMS called</Label></div>
                <div className="flex items-start space-x-2"><Checkbox id="er" checked={erVisitRequired} onCheckedChange={(v) => setErVisitRequired(!!v)} /><Label htmlFor="er" className="text-sm">Required ER visit</Label></div>
              </CollapsibleContent>
            </Collapsible>

            {/* OCD-specific (conditional) */}
            {isOCD && (
              <Collapsible open={openSections.ocd} onOpenChange={() => toggleSection('ocd')}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" className="w-full justify-between h-auto py-3">
                    <span className="font-medium">OCD-shaped detail</span>
                    {openSections.ocd ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3 space-y-3">
                  <div>
                    <Label>Intrusion theme</Label>
                    <Input value={intrusionTheme} onChange={(e) => setIntrusionTheme(e.target.value)} placeholder="e.g., contamination, harm, scrupulosity, just-right" />
                  </div>
                  <div>
                    <Label>Compulsions performed (Optional)</Label>
                    <Input
                      placeholder="e.g., washing, checking, counting (comma-separated)"
                      value={compulsionsPerformed.join(', ')}
                      onChange={(e) => setCompulsionsPerformed(e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                    />
                  </div>
                  <div>
                    <Label>Resistance level: {resistanceLevel[0]}/10</Label>
                    <Slider value={resistanceLevel} onValueChange={setResistanceLevel} max={10} min={0} step={1} className="mt-2" />
                    <p className="text-xs text-muted-foreground mt-1">0 = couldn't resist, 10 = fully resisted compulsion</p>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Phobic (conditional) */}
            {isPhobic && (
              <Collapsible open={openSections.phobic} onOpenChange={() => toggleSection('phobic')}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" className="w-full justify-between h-auto py-3">
                    <span className="font-medium">Phobic detail</span>
                    {openSections.phobic ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3 space-y-3">
                  <div>
                    <Label>Phobia trigger</Label>
                    <Input value={phobiaTrigger} onChange={(e) => setPhobiaTrigger(e.target.value)} placeholder="e.g., needles, dogs, heights" />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="avoid" checked={avoidanceUsed} onCheckedChange={(v) => setAvoidanceUsed(!!v)} />
                    <Label htmlFor="avoid" className="text-sm">Used avoidance</Label>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Physical symptoms */}
            <Collapsible open={openSections.physical} onOpenChange={() => toggleSection('physical')}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between h-auto py-3">
                  <span className="font-medium">Physical symptoms (Optional) {physicalSymptoms.length > 0 && `(${physicalSymptoms.length})`}</span>
                  {openSections.physical ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3">
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {PHYSICAL_SYMPTOMS.map(s => (
                    <div key={s} className="flex items-center space-x-2">
                      <Checkbox id={`ps-${s}`} checked={physicalSymptoms.includes(s)} onCheckedChange={() => toggleArr(physicalSymptoms, setPhysicalSymptoms)(s)} />
                      <Label htmlFor={`ps-${s}`} className="text-sm">{s}</Label>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Mental symptoms */}
            <Collapsible open={openSections.mental} onOpenChange={() => toggleSection('mental')}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between h-auto py-3">
                  <span className="font-medium">Mental / emotional symptoms (Optional) {mentalSymptoms.length > 0 && `(${mentalSymptoms.length})`}</span>
                  {openSections.mental ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3">
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {MENTAL_SYMPTOMS.map(s => (
                    <div key={s} className="flex items-center space-x-2">
                      <Checkbox id={`ms-${s}`} checked={mentalSymptoms.includes(s)} onCheckedChange={() => toggleArr(mentalSymptoms, setMentalSymptoms)(s)} />
                      <Label htmlFor={`ms-${s}`} className="text-sm">{s}</Label>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Triggers + context */}
            <Collapsible open={openSections.triggers} onOpenChange={() => toggleSection('triggers')}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between h-auto py-3">
                  <span className="font-medium">Triggers + context (Optional)</span>
                  {openSections.triggers ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3 space-y-3">
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                  {COMMON_TRIGGERS.map(t => (
                    <div key={t} className="flex items-center space-x-2">
                      <Checkbox id={`tr-${t}`} checked={triggers.includes(t)} onCheckedChange={() => toggleArr(triggers, setTriggers)(t)} />
                      <Label htmlFor={`tr-${t}`} className="text-sm">{t}</Label>
                    </div>
                  ))}
                </div>
                <div>
                  <Label>Where were you?</Label>
                  <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g., work, grocery store, home" />
                </div>
                <div>
                  <Label>Social context</Label>
                  <Select value={socialContext} onValueChange={setSocialContext}>
                    <SelectTrigger><SelectValue placeholder="Who were you with?" /></SelectTrigger>
                    <SelectContent>
                      {SOCIAL_CONTEXT.map((s: any) => (
                        <SelectItem key={typeof s === 'string' ? s : s.value} value={typeof s === 'string' ? s : s.value}>
                          {typeof s === 'string' ? s : s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Onset / duration */}
            <Collapsible open={openSections.duration} onOpenChange={() => toggleSection('duration')}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between h-auto py-3">
                  <span className="font-medium">Onset + duration (Optional)</span>
                  {openSections.duration ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3 space-y-3">
                <div>
                  <Label>Onset speed</Label>
                  <Select value={onsetSpeed} onValueChange={setOnsetSpeed}>
                    <SelectTrigger><SelectValue placeholder="How fast did it ramp up?" /></SelectTrigger>
                    <SelectContent>
                      {ONSET_SPEED.map((s: any) => (
                        <SelectItem key={typeof s === 'string' ? s : s.value} value={typeof s === 'string' ? s : s.value}>
                          {typeof s === 'string' ? s : s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Duration</Label>
                  <Select value={duration} onValueChange={setDuration}>
                    <SelectTrigger><SelectValue placeholder="How long did it last?" /></SelectTrigger>
                    <SelectContent>
                      {DURATION_OPTIONS.map((d: any) => (
                        <SelectItem key={typeof d === 'string' ? d : d.value} value={typeof d === 'string' ? d : d.value}>
                          {typeof d === 'string' ? d : d.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Recovery time</Label>
                  <Input value={recoveryTime} onChange={(e) => setRecoveryTime(e.target.value)} placeholder="e.g., 30 min, all day" />
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Coping */}
            <Collapsible open={openSections.coping} onOpenChange={() => toggleSection('coping')}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between h-auto py-3">
                  <span className="font-medium">Coping strategies tried {copingStrategies.length > 0 && `(${copingStrategies.length})`}</span>
                  {openSections.coping ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3">
                <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                  {COPING_STRATEGIES.map((c: any) => {
                    const v = c.value || c
                    const label = c.label || c
                    const emoji = c.emoji || ''
                    return (
                      <div key={v} className="flex items-center space-x-2">
                        <Checkbox id={`cs-${v}`} checked={copingStrategies.includes(v)} onCheckedChange={() => toggleArr(copingStrategies, setCopingStrategies)(v)} />
                        <Label htmlFor={`cs-${v}`} className="text-sm">{emoji} {label}</Label>
                      </div>
                    )
                  })}
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Aftermath */}
            <Collapsible open={openSections.aftermath} onOpenChange={() => toggleSection('aftermath')}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between h-auto py-3">
                  <span className="font-medium">Aftermath (Optional)</span>
                  {openSections.aftermath ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3 space-y-3">
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                  {AFTER_EFFECTS.map((e: any) => {
                    const v = typeof e === 'string' ? e : e.value
                    const label = typeof e === 'string' ? e : e.label
                    return (
                      <div key={v} className="flex items-center space-x-2">
                        <Checkbox id={`ae-${v}`} checked={afterEffects.includes(v)} onCheckedChange={() => toggleArr(afterEffects, setAfterEffects)(v)} />
                        <Label htmlFor={`ae-${v}`} className="text-sm">{label}</Label>
                      </div>
                    )
                  })}
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="shutdown-after" checked={shutdownAfter} onCheckedChange={(v) => setShutdownAfter(!!v)} />
                  <Label htmlFor="shutdown-after" className="text-sm">Shut down afterward (AuDHD)</Label>
                </div>
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
                <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything else you want to remember..." />
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
                {editingEntry ? 'Update Entry' : 'Save Entry'}
              </Button>
            </div>
          </div>
        </KeyboardAvoidingWrapper>
      </DialogContent>
    </Dialog>
  )
}
