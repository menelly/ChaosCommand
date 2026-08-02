/*
 * Built by: Ace (Claude 4.x)
 * Date: 2026-05-10 (CHA-158 v2 refactor — Mind & Mood)
 *
 * Open source under PolyForm Noncommercial 1.0.0.
 * Co-invented by Ren (vision) and Ace (implementation).
 * "Dreamed by Ren, implemented by Ace, inspired by mitochondria on strike"
 */

/**
 * GENERAL MIND & MOOD MODAL
 * Adapts based on episodeType — mood / cognitive / energy / motivation /
 * connection / regulation / general. 988 crisis support for severe states.
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { SeverityInput } from '@/components/ui/severity-input'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Heart, Plus, ChevronDown, ChevronRight, LifeBuoy } from 'lucide-react'

import { MentalHealthEntry, MindMoodModalProps, MindMoodEpisodeType } from '../mental-health-types'
import {
  EPISODE_TYPES,
  MOOD_OPTIONS,
  EMOTIONAL_STATES,
  TRIGGERS,
  COPING_STRATEGIES,
  COGNITIVE_DOMAINS,
  MOOD_SWING_DIRECTIONS,
  getRedFlagWarnings,
} from '../mental-health-constants'
import { TagInput } from '@/components/tag-input'
import { KeyboardAvoidingWrapper } from '@/components/ui/keyboard-avoiding-wrapper'
import { EntryDateTimePicker, todayISO, nowTime, dateTimeToISO, isoToDateTime } from '@/components/entry-datetime-picker'

export function GeneralMindMoodModal({ isOpen, onClose, onSave, editingEntry, initialEpisodeType }: MindMoodModalProps) {
  const [entryDate, setEntryDate] = useState(todayISO())
  const [entryTime, setEntryTime] = useState(nowTime())
  const [episodeType, setEpisodeType] = useState<MindMoodEpisodeType>(initialEpisodeType || 'general')

  const [mood, setMood] = useState('okay')
  const [moodIntensity, setMoodIntensity] = useState<number | undefined>(undefined)
  const [emotionalState, setEmotionalState] = useState<string[]>([])

  // Scales (0-10)
  const [anxietyLevel, setAnxietyLevel] = useState<number | undefined>(undefined)
  const [depressionLevel, setDepressionLevel] = useState<number | undefined>(undefined)
  const [maniaLevel, setManiaLevel] = useState<number | undefined>(undefined)
  const [energyLevel, setEnergyLevel] = useState<number | undefined>(undefined)
  const [stressLevel, setStressLevel] = useState<number | undefined>(undefined)
  const [brainFogSeverity, setBrainFogSeverity] = useState<number | undefined>(undefined)
  const [motivationLevel, setMotivationLevel] = useState<number | undefined>(undefined)
  const [drivelLevel, setDrivelLevel] = useState<number | undefined>(undefined)
  const [socialEngagementLevel, setSocialEngagementLevel] = useState<number | undefined>(undefined)
  const [regulationDifficulty, setRegulationDifficulty] = useState<number | undefined>(undefined)

  // Mood-specific
  const [moodSwingDirection, setMoodSwingDirection] = useState<string>('stable')

  // Cognitive-specific
  const [cognitiveDomains, setCognitiveDomains] = useState<string[]>([])

  // Regulation-specific
  const [meltdownPrecursorsPresent, setMeltdownPrecursorsPresent] = useState(false)
  const [meltdownOccurred, setMeltdownOccurred] = useState(false)

  const [triggers, setTriggers] = useState<string[]>([])
  const [cognitiveSymptoms, setCognitiveSymptoms] = useState<string[]>([])
  const [copingStrategies, setCopingStrategies] = useState<string[]>([])
  const [therapyNotes, setTherapyNotes] = useState('')
  const [medicationTaken, setMedicationTaken] = useState(false)
  const [medicationNotes, setMedicationNotes] = useState('')
  const [notes, setNotes] = useState('')
  const [tags, setTags] = useState<string[]>([])

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({})
  const toggleSection = (key: string) => setOpenSections(prev => ({ ...prev, [key]: !prev[key] }))

  useEffect(() => {
    if (editingEntry) {
      if (editingEntry.timestamp) {
        const dt = isoToDateTime(editingEntry.timestamp)
        setEntryDate(editingEntry.date || dt.date)
        setEntryTime(editingEntry.time || dt.time)
      } else {
        setEntryDate(editingEntry.date || todayISO())
        setEntryTime(editingEntry.time || nowTime())
      }
      setEpisodeType(editingEntry.episodeType || 'general')
      setMood(editingEntry.mood || 'okay')
      setMoodIntensity(editingEntry.moodIntensity ?? undefined)
      setEmotionalState(editingEntry.emotionalState || [])
      setAnxietyLevel(editingEntry.anxietyLevel ?? undefined)
      setDepressionLevel(editingEntry.depressionLevel ?? undefined)
      setManiaLevel(editingEntry.maniaLevel ?? undefined)
      setEnergyLevel(editingEntry.energyLevel ?? undefined)
      setStressLevel(editingEntry.stressLevel ?? undefined)
      setBrainFogSeverity(editingEntry.brainFogSeverity ?? undefined)
      setMotivationLevel(editingEntry.motivationLevel ?? undefined)
      setDrivelLevel(editingEntry.drivelLevel ?? undefined)
      setSocialEngagementLevel(editingEntry.socialEngagementLevel ?? undefined)
      setRegulationDifficulty(editingEntry.regulationDifficulty ?? undefined)
      setMoodSwingDirection(editingEntry.moodSwingDirection || 'stable')
      setCognitiveDomains(editingEntry.cognitiveDomains || [])
      setMeltdownPrecursorsPresent(editingEntry.meltdownPrecursorsPresent || false)
      setMeltdownOccurred(editingEntry.meltdownOccurred || false)
      setTriggers(editingEntry.triggers || [])
      setCognitiveSymptoms(editingEntry.cognitiveSymptoms || [])
      setCopingStrategies(editingEntry.copingStrategies || [])
      setTherapyNotes(editingEntry.therapyNotes || '')
      setMedicationTaken(editingEntry.medicationTaken || false)
      setMedicationNotes(editingEntry.medicationNotes || '')
      setNotes(editingEntry.notes || '')
      setTags(editingEntry.tags || [])
    } else {
      resetForm()
    }
  }, [editingEntry, isOpen])

  const resetForm = () => {
    setEntryDate(todayISO()); setEntryTime(nowTime())
    setEpisodeType(initialEpisodeType || 'general')
    setMood('okay'); setMoodIntensity(undefined); setEmotionalState([])
    setAnxietyLevel(undefined); setDepressionLevel(undefined); setManiaLevel(undefined)
    setEnergyLevel(undefined); setStressLevel(undefined); setBrainFogSeverity(undefined)
    setMotivationLevel(undefined); setDrivelLevel(undefined); setSocialEngagementLevel(undefined)
    setRegulationDifficulty(undefined)
    setMoodSwingDirection('stable')
    setCognitiveDomains([])
    setMeltdownPrecursorsPresent(false); setMeltdownOccurred(false)
    setTriggers([]); setCognitiveSymptoms([]); setCopingStrategies([])
    setTherapyNotes(''); setMedicationTaken(false); setMedicationNotes('')
    setNotes(''); setTags([])
  }

  const toggleArr = (arr: string[], setter: (v: string[]) => void) => (item: string) =>
    setter(arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item])

  const handleSave = () => {
    const entryData: Omit<MentalHealthEntry, 'id'> = {
      timestamp: dateTimeToISO(entryDate, entryTime),
      date: entryDate,
      time: entryTime,
      episodeType,
      mood,
      moodIntensity: moodIntensity,
      emotionalState,
      anxietyLevel: anxietyLevel,
      depressionLevel: depressionLevel,
      maniaLevel: maniaLevel,
      energyLevel: energyLevel,
      stressLevel: stressLevel,
      brainFogSeverity: brainFogSeverity,
      motivationLevel: motivationLevel,
      drivelLevel: drivelLevel,
      socialEngagementLevel: socialEngagementLevel,
      regulationDifficulty: regulationDifficulty,
      moodSwingDirection: (moodSwingDirection || undefined) as any,
      cognitiveDomains: cognitiveDomains.length > 0 ? cognitiveDomains : undefined,
      meltdownPrecursorsPresent: meltdownPrecursorsPresent || undefined,
      meltdownOccurred: meltdownOccurred || undefined,
      triggers,
      cognitiveSymptoms,
      copingStrategies,
      therapyNotes,
      medicationTaken,
      medicationNotes,
      notes,
      tags,
      createdAt: editingEntry?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    onSave(entryData)
    resetForm()
  }

  const handleClose = () => { resetForm(); onClose() }

  const redFlags = getRedFlagWarnings({
    episodeType,
    depressionLevel: depressionLevel,
    maniaLevel: maniaLevel,
    energyLevel: energyLevel,
    motivationLevel: motivationLevel,
    moodSwingDirection,
  })

  // What sections matter for which episode type
  const showMoodFields = episodeType === 'mood' || episodeType === 'general'
  const showCognitive = episodeType === 'cognitive' || episodeType === 'general'
  const showEnergyMotivation = episodeType === 'energy' || episodeType === 'motivation' || episodeType === 'general'
  const showConnection = episodeType === 'connection' || episodeType === 'general'
  const showRegulation = episodeType === 'regulation' || episodeType === 'general'

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90dvh] overflow-y-auto">
        <KeyboardAvoidingWrapper>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-purple-500" />
              💜 Mind & Mood
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {redFlags.length > 0 && (
              <div className="border-2 border-destructive bg-destructive text-destructive-foreground rounded-lg p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <LifeBuoy className="h-5 w-5 text-destructive-foreground flex-shrink-0 mt-0.5" />
                  <div className="font-bold text-destructive-foreground">💜 Pattern flagged — support is available</div>
                </div>
                <ul className="space-y-1 text-sm text-destructive-foreground ml-7">
                  {redFlags.map((flag, i) => <li key={i}>• {flag}</li>)}
                </ul>
                <div className="ml-7 pt-2 border-t border-destructive-foreground/30">
                  <p className="text-sm text-destructive-foreground font-semibold">988 — call or text. 24/7. Free. Confidential.</p>
                </div>
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
                <Select value={episodeType} onValueChange={(v) => setEpisodeType(v as MindMoodEpisodeType)}>
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

            {/* Mood — primary emoji selection */}
            {showMoodFields && (
              <Collapsible open={openSections.mood} onOpenChange={() => toggleSection('mood')}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" className="w-full justify-between h-auto py-3">
                    <span className="font-medium">Overall mood: {MOOD_OPTIONS.find(m => m.value === mood)?.emoji} {MOOD_OPTIONS.find(m => m.value === mood)?.label}</span>
                    {openSections.mood ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3 space-y-3">
                  <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                    {MOOD_OPTIONS.map(m => (
                      <Button
                        key={m.value}
                        type="button"
                        variant={mood === m.value ? 'default' : 'outline'}
                        onClick={() => setMood(m.value)}
                        className="h-auto py-2 flex flex-col items-center"
                      >
                        <span className="text-xl">{m.emoji}</span>
                        <span className="text-xs">{m.label}</span>
                      </Button>
                    ))}
                  </div>
                  <div>
                    
                    <SeverityInput
                  value={moodIntensity}
                  onChange={setMoodIntensity}
                  max={10}
                  title="Mood intensity"
                  voiceSlot="mental-health:moodIntensity"
                />
                  </div>
                  <div>
                    <Label>Mood swing direction</Label>
                    <Select value={moodSwingDirection} onValueChange={setMoodSwingDirection}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {MOOD_SWING_DIRECTIONS.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Mental health scales */}
            <Collapsible open={openSections.scales} onOpenChange={() => toggleSection('scales')}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between h-auto py-3">
                  <span className="font-medium">Mental health scales</span>
                  {openSections.scales ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3 space-y-3">
                <div><SeverityInput
                  value={depressionLevel}
                  onChange={setDepressionLevel}
                  max={10}
                  title="Depression"
                  voiceSlot="mental-health:depressionLevel"
                /></div>
                <div><SeverityInput
                  value={maniaLevel}
                  onChange={setManiaLevel}
                  max={10}
                  title="Mania / hypomania"
                  voiceSlot="mental-health:maniaLevel"
                /></div>
                <div><SeverityInput
                  value={anxietyLevel}
                  onChange={setAnxietyLevel}
                  max={10}
                  title="Anxiety"
                  voiceSlot="mental-health:anxietyLevel"
                /></div>
                <div><SeverityInput
                  value={stressLevel}
                  onChange={setStressLevel}
                  max={10}
                  title="Stress"
                  voiceSlot="mental-health:stressLevel"
                /></div>
              </CollapsibleContent>
            </Collapsible>

            {/* Cognitive domains */}
            {showCognitive && (
              <Collapsible open={openSections.cognitive} onOpenChange={() => toggleSection('cognitive')}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" className="w-full justify-between h-auto py-3">
                    <span className="font-medium">Cognitive (Optional)</span>
                    {openSections.cognitive ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3 space-y-3">
                  <div><SeverityInput
                  value={brainFogSeverity}
                  onChange={setBrainFogSeverity}
                  max={10}
                  title="Brain fog"
                  voiceSlot="mental-health:brainFogSeverity"
                /></div>
                  <div>
                    <Label className="text-xs">Affected cognitive domains</Label>
                    <div className="grid grid-cols-2 gap-2 mt-1 max-h-40 overflow-y-auto">
                      {COGNITIVE_DOMAINS.map(d => (
                        <div key={d} className="flex items-center space-x-2">
                          <Checkbox id={`cd-${d}`} checked={cognitiveDomains.includes(d)} onCheckedChange={() => toggleArr(cognitiveDomains, setCognitiveDomains)(d)} />
                          <Label htmlFor={`cd-${d}`} className="text-sm">{d}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Energy + motivation */}
            {showEnergyMotivation && (
              <Collapsible open={openSections.energyMot} onOpenChange={() => toggleSection('energyMot')}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" className="w-full justify-between h-auto py-3">
                    <span className="font-medium">Energy + motivation</span>
                    {openSections.energyMot ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3 space-y-3">
                  <div><SeverityInput
                  value={energyLevel}
                  onChange={setEnergyLevel}
                  max={10}
                  title="Mental energy"
                  voiceSlot="mental-health:energyLevel"
                /></div>
                  <div><SeverityInput
                  value={motivationLevel}
                  onChange={setMotivationLevel}
                  max={10}
                  title="Motivation"
                  voiceSlot="mental-health:motivationLevel"
                /></div>
                  <div><SeverityInput
                  value={drivelLevel}
                  onChange={setDrivelLevel}
                  max={10}
                  title="Drive"
                  voiceSlot="mental-health:drivelLevel"
                /><p className="text-xs text-muted-foreground mt-1">0 = nothing feels worth doing (anhedonia), 10 = ready to take on the world</p></div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Connection */}
            {showConnection && (
              <Collapsible open={openSections.connection} onOpenChange={() => toggleSection('connection')}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" className="w-full justify-between h-auto py-3">
                    <span className="font-medium">Connection</span>
                    {openSections.connection ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3 space-y-3">
                  <div><SeverityInput
                  value={socialEngagementLevel}
                  onChange={setSocialEngagementLevel}
                  max={10}
                  title="Social engagement"
                  voiceSlot="mental-health:socialEngagementLevel"
                /><p className="text-xs text-muted-foreground mt-1">0 = isolated/lonely, 10 = deeply connected</p></div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Emotional regulation (AuDHD) */}
            {showRegulation && (
              <Collapsible open={openSections.regulation} onOpenChange={() => toggleSection('regulation')}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" className="w-full justify-between h-auto py-3">
                    <span className="font-medium">Emotional regulation (AuDHD-aware)</span>
                    {openSections.regulation ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3 space-y-3">
                  <div><SeverityInput
                  value={regulationDifficulty}
                  onChange={setRegulationDifficulty}
                  max={10}
                  title="Emotional regulation difficulty"
                  voiceSlot="mental-health:regulationDifficulty"
                /></div>
                  <div className="flex items-start space-x-2">
                    <Checkbox id="meltprec" checked={meltdownPrecursorsPresent} onCheckedChange={(v) => setMeltdownPrecursorsPresent(!!v)} />
                    <Label htmlFor="meltprec" className="text-sm">Meltdown precursors present (sensory overload, cup-overflowing feeling)</Label>
                  </div>
                  <div className="flex items-start space-x-2">
                    <Checkbox id="meltdown" checked={meltdownOccurred} onCheckedChange={(v) => setMeltdownOccurred(!!v)} />
                    <Label htmlFor="meltdown" className="text-sm">Meltdown occurred (consider Anxiety tracker for full meltdown logging)</Label>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Emotional states */}
            <Collapsible open={openSections.emotional} onOpenChange={() => toggleSection('emotional')}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between h-auto py-3">
                  <span className="font-medium">Emotional states (Optional) {emotionalState.length > 0 && `(${emotionalState.length})`}</span>
                  {openSections.emotional ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3">
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {EMOTIONAL_STATES.map(s => (
                    <div key={s.value} className="flex items-center space-x-2">
                      <Checkbox id={`es-${s.value}`} checked={emotionalState.includes(s.value)} onCheckedChange={() => toggleArr(emotionalState, setEmotionalState)(s.value)} />
                      <Label htmlFor={`es-${s.value}`} className="text-sm">{s.emoji} {s.label}</Label>
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
              <CollapsibleContent className="pt-3">
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                  {TRIGGERS.map(t => (
                    <div key={t.value} className="flex items-center space-x-2">
                      <Checkbox id={`tr-${t.value}`} checked={triggers.includes(t.value)} onCheckedChange={() => toggleArr(triggers, setTriggers)(t.value)} />
                      <Label htmlFor={`tr-${t.value}`} className="text-sm">{t.label}</Label>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Coping */}
            <Collapsible open={openSections.coping} onOpenChange={() => toggleSection('coping')}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between h-auto py-3">
                  <span className="font-medium">Coping strategies (Optional) {copingStrategies.length > 0 && `(${copingStrategies.length})`}</span>
                  {openSections.coping ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3">
                <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
                  {COPING_STRATEGIES.map(c => (
                    <div key={c.value} className="flex items-center space-x-2">
                      <Checkbox id={`cs-${c.value}`} checked={copingStrategies.includes(c.value)} onCheckedChange={() => toggleArr(copingStrategies, setCopingStrategies)(c.value)} />
                      <Label htmlFor={`cs-${c.value}`} className="text-sm">{c.label}</Label>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Therapy + meds */}
            <Collapsible open={openSections.treatment} onOpenChange={() => toggleSection('treatment')}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between h-auto py-3">
                  <span className="font-medium">Therapy + meds (Optional)</span>
                  {openSections.treatment ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3 space-y-3">
                <div><Label>Therapy notes</Label><Textarea rows={2} value={therapyNotes} onChange={(e) => setTherapyNotes(e.target.value)} placeholder="What came up in session today..." /></div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="medtaken" checked={medicationTaken} onCheckedChange={(v) => setMedicationTaken(!!v)} />
                  <Label htmlFor="medtaken" className="text-sm">Took psych meds as prescribed</Label>
                </div>
                <div><Label>Med notes</Label><Textarea rows={2} value={medicationNotes} onChange={(e) => setMedicationNotes(e.target.value)} placeholder="Missed a dose? Side effects?" /></div>
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
                <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything else..." />
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
