/* Built by: Ace (Claude 4.x) — 2026-05-10 */

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
import { Sparkles, Plus, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react'

import { SkinEntry, SkinEpisodeType, SpreadingPattern } from '../skin-types'
import { EPISODE_TYPES, BODY_LOCATIONS, CHARACTER_OPTIONS, SUSPECTED_TRIGGERS, TREATMENTS, SPREADING_OPTIONS, getSeverityLabel, getSeverityColor, getRedFlagWarnings, getInterimMeasures } from '../skin-constants'
import { TagInput } from '@/components/tag-input'
import { KeyboardAvoidingWrapper } from '@/components/ui/keyboard-avoiding-wrapper'
import { AttachmentUploader } from '../components/attachment-uploader'
import { EntryDateTimePicker, todayISO, nowTime, dateTimeToISO, isoToDateTime } from '@/components/entry-datetime-picker'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSave: (entry: Omit<SkinEntry, 'id'>) => void
  editingEntry?: SkinEntry | null
  presetType?: string | null
}

export function GeneralSkinModal({ isOpen, onClose, onSave, editingEntry, presetType }: Props) {
  const [entryDate, setEntryDate] = useState(todayISO())
  const [entryTime, setEntryTime] = useState(nowTime())
  const [episodeType, setEpisodeType] = useState<SkinEpisodeType>('rash')
  const [bodyLocation, setBodyLocation] = useState<string[]>([])
  const [characterDescription, setCharacterDescription] = useState<string[]>([])
  const [spreadingPattern, setSpreadingPattern] = useState<string>('')
  const [sizeDescription, setSizeDescription] = useState('')
  const [severity, setSeverity] = useState([5])
  const [itchiness, setItchiness] = useState([0])
  const [pain, setPain] = useState([0])
  const [swelling, setSwelling] = useState(false)
  const [throatTightness, setThroatTightness] = useState(false)
  const [breathingDifficulty, setBreathingDifficulty] = useState(false)
  const [hivesPresent, setHivesPresent] = useState(false)
  const [epinephrineGiven, setEpinephrineGiven] = useState(false)
  const [fevePresent, setFevePresent] = useState(false)
  const [mucousMembraneInvolvement, setMucousMembraneInvolvement] = useState(false)
  const [newMedicationRecent, setNewMedicationRecent] = useState(false)
  const [suspectedTrigger, setSuspectedTrigger] = useState<string[]>([])
  const [treatmentApplied, setTreatmentApplied] = useState<string[]>([])
  const [treatmentResponse, setTreatmentResponse] = useState([3])
  const [duration, setDuration] = useState('')
  // ABCDE for moles
  const [asymmetric, setAsymmetric] = useState(false)
  const [borderIrregular, setBorderIrregular] = useState(false)
  const [colorVariable, setColorVariable] = useState(false)
  const [diameterOver6mm, setDiameterOver6mm] = useState(false)
  const [evolving, setEvolving] = useState(false)
  const [erVisitRequired, setErVisitRequired] = useState(false)
  const [photos, setPhotos] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [tags, setTags] = useState<string[]>([])

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    eventType: true,
    bodyLocation: true,
    appearance: true,
    spreading: true,
    severity: true,
    itchPain: true,
    anaphylaxis: true,
    sjs: true,
    abcde: true,
    trigger: true,
    treatment: true,
    treatmentResponse: true,
    duration: true,
    photos: true,
    notes: true,
    tags: true,
  })
  const toggleSection = (key: string) => setOpenSections(prev => ({ ...prev, [key]: !prev[key] }))

  useEffect(() => {
    if (editingEntry) {
      const dt = isoToDateTime(editingEntry.timestamp)
      setEntryDate(editingEntry.date || dt.date)
      setEntryTime(dt.time)
      setEpisodeType(editingEntry.episodeType)
      setBodyLocation(editingEntry.bodyLocation || [])
      setCharacterDescription(editingEntry.characterDescription || [])
      setSpreadingPattern(editingEntry.spreadingPattern || '')
      setSizeDescription(editingEntry.sizeDescription || '')
      setSeverity([editingEntry.severity || 5])
      setItchiness([editingEntry.itchiness || 0])
      setPain([editingEntry.pain || 0])
      setSwelling(editingEntry.swelling || false)
      setThroatTightness(editingEntry.throatTightness || false)
      setBreathingDifficulty(editingEntry.breathingDifficulty || false)
      setHivesPresent(editingEntry.hivesPresent || false)
      setEpinephrineGiven(editingEntry.epinephrineGiven || false)
      setFevePresent(editingEntry.fevePresent || false)
      setMucousMembraneInvolvement(editingEntry.mucousMembraneInvolvement || false)
      setNewMedicationRecent(editingEntry.newMedicationRecent || false)
      setSuspectedTrigger(editingEntry.suspectedTrigger || [])
      setTreatmentApplied(editingEntry.treatmentApplied || [])
      setTreatmentResponse([editingEntry.treatmentResponse || 3])
      setDuration(editingEntry.duration || '')
      setAsymmetric(editingEntry.asymmetric || false)
      setBorderIrregular(editingEntry.borderIrregular || false)
      setColorVariable(editingEntry.colorVariable || false)
      setDiameterOver6mm(editingEntry.diameterOver6mm || false)
      setEvolving(editingEntry.evolving || false)
      setErVisitRequired(editingEntry.erVisitRequired || false)
      setPhotos(editingEntry.photos || [])
      setNotes(editingEntry.notes || '')
      setTags(editingEntry.tags || [])
    } else if (presetType) {
      reset()
      setEpisodeType(presetType as SkinEpisodeType)
    } else { reset() }
  }, [editingEntry, isOpen, presetType])

  const reset = () => {
    setEntryDate(todayISO()); setEntryTime(nowTime())
    setEpisodeType('rash'); setBodyLocation([]); setCharacterDescription([]); setSpreadingPattern('')
    setSizeDescription(''); setSeverity([5]); setItchiness([0]); setPain([0])
    setSwelling(false); setThroatTightness(false); setBreathingDifficulty(false); setHivesPresent(false); setEpinephrineGiven(false)
    setFevePresent(false); setMucousMembraneInvolvement(false); setNewMedicationRecent(false)
    setSuspectedTrigger([]); setTreatmentApplied([]); setTreatmentResponse([3]); setDuration('')
    setAsymmetric(false); setBorderIrregular(false); setColorVariable(false); setDiameterOver6mm(false); setEvolving(false)
    setErVisitRequired(false); setPhotos([]); setNotes(''); setTags([])
  }

  const toggle = (arr: string[], setter: (v: string[]) => void) => (item: string) =>
    setter(arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item])

  const handleSave = () => {
    const data: Omit<SkinEntry, 'id'> = {
      date: entryDate,
      timestamp: dateTimeToISO(entryDate, entryTime),
      episodeType,
      bodyLocation,
      characterDescription,
      spreadingPattern: (spreadingPattern || undefined) as SpreadingPattern | undefined,
      sizeDescription: sizeDescription || undefined,
      severity: severity[0],
      itchiness: itchiness[0] > 0 ? itchiness[0] : undefined,
      pain: pain[0] > 0 ? pain[0] : undefined,
      swelling, throatTightness, breathingDifficulty, hivesPresent, epinephrineGiven,
      fevePresent, mucousMembraneInvolvement, newMedicationRecent,
      suspectedTrigger,
      treatmentApplied,
      treatmentResponse: treatmentApplied.length > 0 ? treatmentResponse[0] : undefined,
      duration: duration || undefined,
      asymmetric, borderIrregular, colorVariable, diameterOver6mm, evolving,
      erVisitRequired,
      photos: photos.length > 0 ? photos : undefined,
      notes: notes.trim() || undefined,
      tags: tags.length > 0 ? tags : undefined
    }
    onSave(data); reset()
  }

  const handleClose = () => { reset(); onClose() }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <KeyboardAvoidingWrapper>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-pink-500" /> 🧴 Skin Event</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          {(() => {
            const flags = getRedFlagWarnings({ episodeType, severity: severity[0], hivesPresent, swelling, throatTightness, breathingDifficulty, fevePresent, mucousMembraneInvolvement, newMedicationRecent, characterDescription, spreadingPattern, asymmetric, borderIrregular, colorVariable, diameterOver6mm, evolving })
            const measures = getInterimMeasures({ hivesPresent, swelling, throatTightness, breathingDifficulty, episodeType })
            if (flags.length === 0) return null
            return (
              <div className="border-2 border-red-500 bg-red-50 dark:bg-red-950/30 rounded-lg p-4 space-y-3">
                <div className="flex items-start gap-2"><AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" /><div className="font-bold text-red-700 dark:text-red-400">🚨 Red flags detected</div></div>
                <ul className="space-y-1 text-sm text-red-900 dark:text-red-200 ml-7">{flags.map((f, i) => <li key={i}>• {f}</li>)}</ul>
                <div className="ml-7 pt-2 border-t border-red-300 dark:border-red-800 space-y-2">
                  <p className="text-sm text-red-900 dark:text-red-200"><strong>If happening RIGHT NOW:</strong> call 911 if breathing/throat affected. Documenting can wait.</p>
                  <p className="text-sm text-red-900 dark:text-red-200"><strong>If this is in the PAST and resolved:</strong> document carefully and follow up with your medical team / dermatology.</p>
                </div>
                {measures.length > 0 && <div className="ml-7 pt-2 border-t border-red-300 dark:border-red-800"><p className="text-sm font-semibold text-red-900 dark:text-red-200 mb-1">💪 While waiting for EMS:</p><ul className="space-y-2 text-sm text-red-900 dark:text-red-200">{measures.map((m, i) => <li key={i}>• {m}</li>)}</ul></div>}
              </div>
            )
          })()}

          <EntryDateTimePicker date={entryDate} time={entryTime} onChange={(d, t) => { setEntryDate(d); setEntryTime(t) }} />

          <Collapsible open={openSections.eventType} onOpenChange={() => toggleSection('eventType')}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between h-auto py-3">
                <span className="font-medium">Event Type</span>
                {openSections.eventType ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <Select value={episodeType} onValueChange={(v) => setEpisodeType(v as SkinEpisodeType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{EPISODE_TYPES.map(t => <SelectItem key={t.id} value={t.id} textValue={t.name}>{t.icon} {t.name}</SelectItem>)}</SelectContent>
              </Select>
            </CollapsibleContent>
          </Collapsible>

          <Collapsible open={openSections.bodyLocation} onOpenChange={() => toggleSection('bodyLocation')}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between h-auto py-3">
                <span className="font-medium">Body Location(s)</span>
                {openSections.bodyLocation ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                {BODY_LOCATIONS.map(l => (
                  <div key={l} className="flex items-center space-x-2"><Checkbox id={`loc-${l}`} checked={bodyLocation.includes(l)} onCheckedChange={() => toggle(bodyLocation, setBodyLocation)(l)} /><Label htmlFor={`loc-${l}`} className="text-sm">{l}</Label></div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Collapsible open={openSections.appearance} onOpenChange={() => toggleSection('appearance')}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between h-auto py-3">
                <span className="font-medium">Appearance / Character (check all that apply)</span>
                {openSections.appearance ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {CHARACTER_OPTIONS.map(c => (
                  <div key={c} className="flex items-center space-x-2"><Checkbox id={`char-${c}`} checked={characterDescription.includes(c)} onCheckedChange={() => toggle(characterDescription, setCharacterDescription)(c)} /><Label htmlFor={`char-${c}`} className="text-sm capitalize">{c}</Label></div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Collapsible open={openSections.spreading} onOpenChange={() => toggleSection('spreading')}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between h-auto py-3">
                <span className="font-medium">Spreading / Size</span>
                {openSections.spreading ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Spreading Pattern</Label>
                  <Select value={spreadingPattern} onValueChange={setSpreadingPattern}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{SPREADING_OPTIONS.map(s => <SelectItem key={s.value} value={s.value} textValue={s.label}>{s.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Size description</Label>
                  <Input value={sizeDescription} onChange={(e) => setSizeDescription(e.target.value)} placeholder="e.g., quarter-sized, 5cm" />
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Collapsible open={openSections.severity} onOpenChange={() => toggleSection('severity')}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between h-auto py-3">
                <span className="font-medium">Severity</span>
                {openSections.severity ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <div className="space-y-3">
                <Label>Severity: {severity[0]} - <span className={getSeverityColor(severity[0])}>{getSeverityLabel(severity[0])}</span></Label>
                <Slider value={severity} onValueChange={setSeverity} max={10} min={1} step={1} />
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Collapsible open={openSections.itchPain} onOpenChange={() => toggleSection('itchPain')}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between h-auto py-3">
                <span className="font-medium">Itchiness / Pain</span>
                {openSections.itchPain ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Itchiness: {itchiness[0]}/10</Label><Slider value={itchiness} onValueChange={setItchiness} max={10} min={0} step={1} /></div>
                <div className="space-y-2"><Label>Pain: {pain[0]}/10</Label><Slider value={pain} onValueChange={setPain} max={10} min={0} step={1} /></div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Collapsible open={openSections.anaphylaxis} onOpenChange={() => toggleSection('anaphylaxis')}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between h-auto py-3">
                <span className="font-medium">Anaphylaxis / Severe Reaction Indicators</span>
                {openSections.anaphylaxis ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <div className="grid grid-cols-1 gap-2">
                <div className="flex items-center space-x-2"><Checkbox id="hives" checked={hivesPresent} onCheckedChange={(v) => setHivesPresent(!!v)} /><Label htmlFor="hives">Hives / welts present</Label></div>
                <div className="flex items-center space-x-2"><Checkbox id="swell" checked={swelling} onCheckedChange={(v) => setSwelling(!!v)} /><Label htmlFor="swell">Face / lip / tongue swelling</Label></div>
                <div className="flex items-center space-x-2"><Checkbox id="throat" checked={throatTightness} onCheckedChange={(v) => setThroatTightness(!!v)} /><Label htmlFor="throat">Throat tightness / voice changes</Label></div>
                <div className="flex items-center space-x-2"><Checkbox id="breathing" checked={breathingDifficulty} onCheckedChange={(v) => setBreathingDifficulty(!!v)} /><Label htmlFor="breathing">Breathing difficulty</Label></div>
                <div className="flex items-center space-x-2"><Checkbox id="epi" checked={epinephrineGiven} onCheckedChange={(v) => setEpinephrineGiven(!!v)} /><Label htmlFor="epi">EpiPen / Epinephrine given</Label></div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Collapsible open={openSections.sjs} onOpenChange={() => toggleSection('sjs')}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between h-auto py-3">
                <span className="font-medium">SJS / Drug Reaction Indicators (rare but serious)</span>
                {openSections.sjs ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <div className="grid grid-cols-1 gap-2">
                <div className="flex items-center space-x-2"><Checkbox id="fever" checked={fevePresent} onCheckedChange={(v) => setFevePresent(!!v)} /><Label htmlFor="fever">Fever present</Label></div>
                <div className="flex items-center space-x-2"><Checkbox id="mucous" checked={mucousMembraneInvolvement} onCheckedChange={(v) => setMucousMembraneInvolvement(!!v)} /><Label htmlFor="mucous">Mouth / eye / genital involvement</Label></div>
                <div className="flex items-center space-x-2"><Checkbox id="newmed" checked={newMedicationRecent} onCheckedChange={(v) => setNewMedicationRecent(!!v)} /><Label htmlFor="newmed">Started new medication in last 4 weeks</Label></div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {episodeType === 'mole-lesion' && (
            <Collapsible open={openSections.abcde} onOpenChange={() => toggleSection('abcde')}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between h-auto py-3">
                  <span className="font-medium">ABCDE Check (skin cancer screening)</span>
                  {openSections.abcde ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3">
                <div className="space-y-3 border-2 border-stone-200 rounded-lg p-3">
                  <div className="grid grid-cols-1 gap-2">
                    <div className="flex items-center space-x-2"><Checkbox id="a" checked={asymmetric} onCheckedChange={(v) => setAsymmetric(!!v)} /><Label htmlFor="a">A — Asymmetric (one half doesn't match the other)</Label></div>
                    <div className="flex items-center space-x-2"><Checkbox id="b" checked={borderIrregular} onCheckedChange={(v) => setBorderIrregular(!!v)} /><Label htmlFor="b">B — Border irregular, ragged, or blurred</Label></div>
                    <div className="flex items-center space-x-2"><Checkbox id="c" checked={colorVariable} onCheckedChange={(v) => setColorVariable(!!v)} /><Label htmlFor="c">C — Color varies (multiple colors, very dark)</Label></div>
                    <div className="flex items-center space-x-2"><Checkbox id="d" checked={diameterOver6mm} onCheckedChange={(v) => setDiameterOver6mm(!!v)} /><Label htmlFor="d">D — Diameter &gt; 6mm (larger than a pencil eraser)</Label></div>
                    <div className="flex items-center space-x-2"><Checkbox id="e" checked={evolving} onCheckedChange={(v) => setEvolving(!!v)} /><Label htmlFor="e">E — Evolving (changing in size, shape, color, or symptoms)</Label></div>
                  </div>
                  <p className="text-xs text-muted-foreground">2+ features = schedule a dermatologist. Photo-document for monitoring.</p>
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          <Collapsible open={openSections.trigger} onOpenChange={() => toggleSection('trigger')}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between h-auto py-3">
                <span className="font-medium">Suspected Trigger</span>
                {openSections.trigger ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                {SUSPECTED_TRIGGERS.map(t => (
                  <div key={t} className="flex items-center space-x-2"><Checkbox id={`tr-${t}`} checked={suspectedTrigger.includes(t)} onCheckedChange={() => toggle(suspectedTrigger, setSuspectedTrigger)(t)} /><Label htmlFor={`tr-${t}`} className="text-sm">{t}</Label></div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Collapsible open={openSections.treatment} onOpenChange={() => toggleSection('treatment')}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between h-auto py-3">
                <span className="font-medium">Treatment Applied</span>
                {openSections.treatment ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                {TREATMENTS.map(t => (
                  <div key={t} className="flex items-center space-x-2"><Checkbox id={`tx-${t}`} checked={treatmentApplied.includes(t)} onCheckedChange={() => toggle(treatmentApplied, setTreatmentApplied)(t)} /><Label htmlFor={`tx-${t}`} className="text-sm">{t}</Label></div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {treatmentApplied.length > 0 && (
            <Collapsible open={openSections.treatmentResponse} onOpenChange={() => toggleSection('treatmentResponse')}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between h-auto py-3">
                  <span className="font-medium">Treatment Response</span>
                  {openSections.treatmentResponse ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3">
                <div className="space-y-2"><Label>Treatment helped: {treatmentResponse[0]}/5</Label><Slider value={treatmentResponse} onValueChange={setTreatmentResponse} max={5} min={1} step={1} /></div>
              </CollapsibleContent>
            </Collapsible>
          )}

          <Collapsible open={openSections.duration} onOpenChange={() => toggleSection('duration')}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between h-auto py-3">
                <span className="font-medium">Duration / ER</span>
                {openSections.duration ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Duration</Label><Input value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="e.g., 2 hours, 3 days" /></div>
                <div className="flex items-end pb-2"><div className="flex items-center space-x-2"><Checkbox id="er" checked={erVisitRequired} onCheckedChange={(v) => setErVisitRequired(!!v)} /><Label htmlFor="er">ER / EMS required</Label></div></div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Collapsible open={openSections.photos} onOpenChange={() => toggleSection('photos')}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between h-auto py-3">
                <span className="font-medium">Photos</span>
                {openSections.photos ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <AttachmentUploader value={photos} onChange={setPhotos} label="Photos (HIGHLY RECOMMENDED for skin tracking)" helpText="Photo-over-time is invaluable for dermatology consults. Take a clear, well-lit photo with a size reference (coin, ruler) when possible." blobPrefix="skin" />
            </CollapsibleContent>
          </Collapsible>

          <Collapsible open={openSections.notes} onOpenChange={() => toggleSection('notes')}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between h-auto py-3">
                <span className="font-medium">Notes</span>
                {openSections.notes ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <div className="space-y-3"><Label htmlFor="notes">Notes (Optional)</Label><Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Additional details..." /></div>
            </CollapsibleContent>
          </Collapsible>

          <Collapsible open={openSections.tags} onOpenChange={() => toggleSection('tags')}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between h-auto py-3">
                <span className="font-medium">Tags</span>
                {openSections.tags ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <div className="space-y-3"><Label>Tags (Optional)</Label><TagInput value={tags} onChange={setTags} placeholder="Tags..." /></div>
            </CollapsibleContent>
          </Collapsible>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={handleClose} className="flex-1">Cancel</Button>
            <Button type="button" onClick={handleSave} className="flex-1" disabled={bodyLocation.length === 0}><Plus className="h-4 w-4 mr-2" />{editingEntry ? 'Update Event' : 'Save Skin Event'}</Button>
          </div>
        </div>
        </KeyboardAvoidingWrapper>
      </DialogContent>
    </Dialog>
  )
}
