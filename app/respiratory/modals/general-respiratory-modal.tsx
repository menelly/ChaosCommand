/*
 * Built by: Ace (Claude 4.x) — 2026-05-10
 * Co-invented by Ren (vision) and Ace (implementation)
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
import { Wind, Plus, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react'

import { RespiratoryEntry, RespiratoryModalProps, RespiratoryEpisodeType } from '../respiratory-types'
import { RESPIRATORY_SYMPTOMS, RESPIRATORY_TRIGGERS, EPISODE_TYPES, getSeverityLabel, getSeverityColor, getRedFlagWarnings, getInterimMeasures, BREATHING_PATTERNS } from '../respiratory-constants'
import { TagInput } from '@/components/tag-input'
import { KeyboardAvoidingWrapper } from '@/components/ui/keyboard-avoiding-wrapper'
import { AttachmentUploader } from '../components/attachment-uploader'
import { EntryDateTimePicker, todayISO, nowTime, dateTimeToISO, isoToDateTime } from '@/components/entry-datetime-picker'

export function GeneralRespiratoryModal({ isOpen, onClose, onSave, editingEntry }: RespiratoryModalProps) {
  const [entryDate, setEntryDate] = useState(todayISO())
  const [entryTime, setEntryTime] = useState(nowTime())
  const [episodeType, setEpisodeType] = useState<RespiratoryEpisodeType>('general')
  const [severity, setSeverity] = useState([5])
  const [breathingPattern, setBreathingPattern] = useState<string>('')
  const [chestTightness, setChestTightness] = useState([0])
  const [spo2Lowest, setSpo2Lowest] = useState('')
  const [hrAtEvent, setHrAtEvent] = useState('')
  const [swelling, setSwelling] = useState(false)
  const [hivesPresent, setHivesPresent] = useState(false)
  const [throatTightness, setThroatTightness] = useState(false)
  const [epinephrineGiven, setEpinephrineGiven] = useState(false)
  const [symptoms, setSymptoms] = useState<string[]>([])
  const [triggers, setTriggers] = useState<string[]>([])
  const [timeToResolutionMin, setTimeToResolutionMin] = useState('')
  const [erVisitRequired, setErVisitRequired] = useState(false)
  const [attachmentImages, setAttachmentImages] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [tags, setTags] = useState<string[]>([])

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    eventType: true,
    vitals: true,
    breathingPattern: true,
    severity: true,
    allergic: true,
    symptoms: true,
    triggers: true,
    resolution: true,
    attachments: true,
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
      setSeverity([editingEntry.severity || 5])
      setBreathingPattern(editingEntry.breathingPattern || '')
      setChestTightness([editingEntry.chestTightness || 0])
      setSpo2Lowest(editingEntry.spo2Lowest?.toString() || '')
      setHrAtEvent(editingEntry.hrAtEvent?.toString() || '')
      setSwelling(editingEntry.swelling || false)
      setHivesPresent(editingEntry.hivesPresent || false)
      setThroatTightness(editingEntry.throatTightness || false)
      setEpinephrineGiven(editingEntry.epinephrineGiven || false)
      setSymptoms(editingEntry.symptoms || [])
      setTriggers(editingEntry.triggers || [])
      setTimeToResolutionMin(editingEntry.timeToResolutionMin?.toString() || '')
      setErVisitRequired(editingEntry.erVisitRequired || false)
      setAttachmentImages(editingEntry.attachmentImages || [])
      setNotes(editingEntry.notes || '')
      setTags(editingEntry.tags || [])
    } else { reset() }
  }, [editingEntry, isOpen])

  const reset = () => {
    setEntryDate(todayISO()); setEntryTime(nowTime())
    setEpisodeType('general'); setSeverity([5]); setBreathingPattern(''); setChestTightness([0])
    setSpo2Lowest(''); setHrAtEvent(''); setSwelling(false); setHivesPresent(false)
    setThroatTightness(false); setEpinephrineGiven(false); setSymptoms([]); setTriggers([])
    setTimeToResolutionMin(''); setErVisitRequired(false); setAttachmentImages([])
    setNotes(''); setTags([])
  }

  const toggle = (arr: string[], setter: (v: string[]) => void) => (item: string) =>
    setter(arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item])

  const handleSave = () => {
    const data: Omit<RespiratoryEntry, 'id'> = {
      date: entryDate,
      timestamp: dateTimeToISO(entryDate, entryTime),
      episodeType,
      severity: severity[0],
      breathingPattern: (breathingPattern || undefined) as any,
      chestTightness: chestTightness[0] > 0 ? chestTightness[0] : undefined,
      spo2Lowest: spo2Lowest ? parseInt(spo2Lowest) : undefined,
      hrAtEvent: hrAtEvent ? parseInt(hrAtEvent) : undefined,
      swelling, hivesPresent, throatTightness, epinephrineGiven,
      symptoms,
      triggers,
      timeToResolutionMin: timeToResolutionMin ? parseInt(timeToResolutionMin) : undefined,
      erVisitRequired,
      attachmentImages: attachmentImages.length > 0 ? attachmentImages : undefined,
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
          <DialogTitle className="flex items-center gap-2"><Wind className="h-5 w-5 text-blue-500" /> 🫁 Respiratory Event</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          {/* Red flag banner */}
          {(() => {
            const shape = { episodeType, severity: severity[0], spo2Lowest: spo2Lowest ? parseInt(spo2Lowest) : undefined, symptoms, swelling, hivesPresent, throatTightness }
            const flags = getRedFlagWarnings(shape)
            const measures = getInterimMeasures(shape)
            if (flags.length === 0) return null
            return (
              <div className="border-2 border-red-500 bg-red-50 dark:bg-red-950/30 rounded-lg p-4 space-y-3">
                <div className="flex items-start gap-2"><AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" /><div className="font-bold text-red-700 dark:text-red-400">🚨 Red flags detected</div></div>
                <ul className="space-y-1 text-sm text-red-900 dark:text-red-200 ml-7">{flags.map((f, i) => <li key={i}>• {f}</li>)}</ul>
                <div className="ml-7 pt-2 border-t border-red-300 dark:border-red-800 space-y-2">
                  <p className="text-sm text-red-900 dark:text-red-200"><strong>If happening RIGHT NOW:</strong> call 911. Documenting can wait.</p>
                  <p className="text-sm text-red-900 dark:text-red-200"><strong>If this is in the PAST and resolved:</strong> these symptoms qualify as an emergency event — document carefully and follow up with your medical team.</p>
                </div>
                {measures.length > 0 && (
                  <div className="ml-7 pt-2 border-t border-red-300 dark:border-red-800">
                    <p className="text-sm font-semibold text-red-900 dark:text-red-200 mb-1">💪 While waiting for EMS:</p>
                    <ul className="space-y-2 text-sm text-red-900 dark:text-red-200">{measures.map((m, i) => <li key={i}>• {m}</li>)}</ul>
                  </div>
                )}
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
              <div className="space-y-3">
                <Select value={episodeType} onValueChange={(v) => setEpisodeType(v as RespiratoryEpisodeType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{EPISODE_TYPES.map(t => <SelectItem key={t.id} value={t.id} textValue={t.name}>{t.icon} {t.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Collapsible open={openSections.vitals} onOpenChange={() => toggleSection('vitals')}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between h-auto py-3">
                <span className="font-medium">Vitals (SpO2 / HR)</span>
                {openSections.vitals ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Lowest SpO2 (%)</Label><Input type="number" value={spo2Lowest} onChange={(e) => setSpo2Lowest(e.target.value)} placeholder="e.g., 92" /></div>
                <div><Label>HR at event (bpm)</Label><Input type="number" value={hrAtEvent} onChange={(e) => setHrAtEvent(e.target.value)} placeholder="e.g., 110" /></div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Collapsible open={openSections.breathingPattern} onOpenChange={() => toggleSection('breathingPattern')}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between h-auto py-3">
                <span className="font-medium">Breathing Pattern</span>
                {openSections.breathingPattern ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <div className="space-y-3">
                <Select value={breathingPattern} onValueChange={setBreathingPattern}>
                  <SelectTrigger><SelectValue placeholder="Select breathing pattern" /></SelectTrigger>
                  <SelectContent>{BREATHING_PATTERNS.map(p => <SelectItem key={p.value} value={p.value} textValue={p.label}>{p.label}</SelectItem>)}</SelectContent>
                </Select>
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

          <Collapsible open={openSections.allergic} onOpenChange={() => toggleSection('allergic')}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between h-auto py-3">
                <span className="font-medium">Allergic Reaction Indicators</span>
                {openSections.allergic ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <div className="space-y-3">
                <h4 className="font-medium">Allergic Reaction Indicators (check if present)</h4>
                <div className="grid grid-cols-1 gap-2">
                  <div className="flex items-center space-x-2"><Checkbox id="swelling" checked={swelling} onCheckedChange={(v) => setSwelling(!!v)} /><Label htmlFor="swelling">Face / lip / tongue swelling</Label></div>
                  <div className="flex items-center space-x-2"><Checkbox id="hives" checked={hivesPresent} onCheckedChange={(v) => setHivesPresent(!!v)} /><Label htmlFor="hives">Hives / welts</Label></div>
                  <div className="flex items-center space-x-2"><Checkbox id="throat" checked={throatTightness} onCheckedChange={(v) => setThroatTightness(!!v)} /><Label htmlFor="throat">Throat tightness / voice changes</Label></div>
                  <div className="flex items-center space-x-2"><Checkbox id="epi" checked={epinephrineGiven} onCheckedChange={(v) => setEpinephrineGiven(!!v)} /><Label htmlFor="epi">EpiPen / Epinephrine given</Label></div>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Collapsible open={openSections.symptoms} onOpenChange={() => toggleSection('symptoms')}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between h-auto py-3">
                <span className="font-medium">Symptoms</span>
                {openSections.symptoms ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {RESPIRATORY_SYMPTOMS.map(s => (
                    <div key={s} className="flex items-center space-x-2"><Checkbox id={`s-${s}`} checked={symptoms.includes(s)} onCheckedChange={() => toggle(symptoms, setSymptoms)(s)} /><Label htmlFor={`s-${s}`} className="text-sm">{s}</Label></div>
                  ))}
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Collapsible open={openSections.triggers} onOpenChange={() => toggleSection('triggers')}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between h-auto py-3">
                <span className="font-medium">Triggers</span>
                {openSections.triggers ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                  {RESPIRATORY_TRIGGERS.map(t => (
                    <div key={t} className="flex items-center space-x-2"><Checkbox id={`t-${t}`} checked={triggers.includes(t)} onCheckedChange={() => toggle(triggers, setTriggers)(t)} /><Label htmlFor={`t-${t}`} className="text-sm">{t}</Label></div>
                  ))}
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Collapsible open={openSections.resolution} onOpenChange={() => toggleSection('resolution')}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between h-auto py-3">
                <span className="font-medium">Resolution / ER Visit</span>
                {openSections.resolution ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Time to resolution (min)</Label><Input type="number" value={timeToResolutionMin} onChange={(e) => setTimeToResolutionMin(e.target.value)} placeholder="e.g., 30" /></div>
                <div className="flex items-end pb-2"><div className="flex items-center space-x-2"><Checkbox id="er" checked={erVisitRequired} onCheckedChange={(v) => setErVisitRequired(!!v)} /><Label htmlFor="er">ER / EMS visit required</Label></div></div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Collapsible open={openSections.attachments} onOpenChange={() => toggleSection('attachments')}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between h-auto py-3">
                <span className="font-medium">Attachments</span>
                {openSections.attachments ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <AttachmentUploader value={attachmentImages} onChange={setAttachmentImages} label="Attachments (Optional)" helpText="Photos of rashes, peak flow chart screenshots, lab results, etc." blobPrefix="respiratory" />
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
              <div className="space-y-3"><Label>Tags (Optional)</Label><TagInput value={tags} onChange={setTags} placeholder="Add tags..." /></div>
            </CollapsibleContent>
          </Collapsible>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={handleClose} className="flex-1">Cancel</Button>
            <Button type="button" onClick={handleSave} className="flex-1" disabled={symptoms.length === 0}><Plus className="h-4 w-4 mr-2" />{editingEntry ? 'Update Event' : 'Save Respiratory Event'}</Button>
          </div>
        </div>
        </KeyboardAvoidingWrapper>
      </DialogContent>
    </Dialog>
  )
}
