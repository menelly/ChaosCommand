/*
 * Built by: Ace (Claude 4.x)
 * Date: 2026-05-10
 *
 * This code is part of a deliberately-unpatented medical management system.
 * Patentable technology, but we chose not to patent — the Patent Office doesn't
 * yet recognize AI co-inventors, and Ren refused to claim sole credit for work
 * we built together. Open source under PolyForm Noncommercial 1.0.0 instead.
 *
 * Co-invented by Ren (vision) and Ace (implementation)
 *
 * This wasn't built with compliance. It was built with defiance.
 *
 * "Dreamed by Ren, implemented by Ace, inspired by mitochondria on strike"
 */

/**
 * GENERAL CARDIAC EVENT MODAL
 * Catch-all for any cardiac event. Used for chest-pain, syncope, presyncope,
 * palpitations, and 'general' until specific modals are built.
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
import { Heart, Plus, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react'

import { CardiacEntry, CardiacModalProps, CardiacEpisodeType } from '../cardiac-types'
import {
  CARDIAC_SYMPTOMS,
  CARDIAC_TRIGGERS,
  RESOLUTION_METHODS,
  POSITION_OPTIONS,
  EPISODE_TYPES,
  DURATION_UNITS,
  getSeverityLabel,
  getSeverityColor,
  getRedFlagWarnings,
  getInterimMeasures
} from '../cardiac-constants'
import { TagInput } from '@/components/tag-input'
import { KeyboardAvoidingWrapper } from '@/components/ui/keyboard-avoiding-wrapper'
import { EcgStripUploader } from '../components/ecg-strip-uploader'
import { EntryDateTimePicker, todayISO, nowTime, dateTimeToISO, isoToDateTime } from '@/components/entry-datetime-picker'

export function GeneralCardiacModal({ isOpen, onClose, onSave, editingEntry }: CardiacModalProps) {
  const [entryDate, setEntryDate] = useState(todayISO())
  const [entryTime, setEntryTime] = useState(nowTime())
  const [episodeType, setEpisodeType] = useState<CardiacEpisodeType>('general')
  const [hrPeak, setHrPeak] = useState('')
  const [bpAtEvent, setBpAtEvent] = useState('')
  const [spo2AtEvent, setSpo2AtEvent] = useState('')
  const [symptoms, setSymptoms] = useState<string[]>([])
  const [severity, setSeverity] = useState([5])
  const [triggers, setTriggers] = useState<string[]>([])
  const [positionAtOnset, setPositionAtOnset] = useState<string>('')
  const [resolutionMethod, setResolutionMethod] = useState<string>('')
  const [durationValue, setDurationValue] = useState('')
  const [durationUnit, setDurationUnit] = useState('minutes')
  const [erVisitRequired, setErVisitRequired] = useState(false)
  const [ecgStripImages, setEcgStripImages] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [tags, setTags] = useState<string[]>([])

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    eventType: false,
    vitals: false,
    symptoms: false,
    severity: false,
    triggers: false,
    position: false,
    resolution: false,
    duration: false,
    er: false,
    ecg: false,
    notes: false,
    tags: false,
  })
  const toggleSection = (key: string) => setOpenSections(prev => ({ ...prev, [key]: !prev[key] }))

  useEffect(() => {
    if (editingEntry) {
      const dt = isoToDateTime(editingEntry.timestamp)
      setEntryDate(editingEntry.date || dt.date)
      setEntryTime(dt.time)
      setEpisodeType(editingEntry.episodeType)
      setHrPeak(editingEntry.hrPeak?.toString() || '')
      setBpAtEvent(editingEntry.bpAtEvent || '')
      setSpo2AtEvent(editingEntry.spo2AtEvent?.toString() || '')
      setSymptoms(editingEntry.symptoms || [])
      setSeverity([editingEntry.symptomSeverity || 5])
      setTriggers(editingEntry.triggers || [])
      setPositionAtOnset(editingEntry.positionAtOnset || '')
      setResolutionMethod(editingEntry.resolutionMethod || '')
      setErVisitRequired(editingEntry.erVisitRequired || false)
      setEcgStripImages(editingEntry.ecgStripImages || [])
      if (editingEntry.duration) {
        const m = editingEntry.duration.match(/^(\d+(?:\.\d+)?)\s*(.+)$/)
        if (m) {
          setDurationValue(m[1])
          setDurationUnit(m[2])
        }
      } else {
        setDurationValue('')
        setDurationUnit('minutes')
      }
      setNotes(editingEntry.notes || '')
      setTags(editingEntry.tags || [])
    } else {
      resetForm()
    }
  }, [editingEntry, isOpen])

  const resetForm = () => {
    setEntryDate(todayISO())
    setEntryTime(nowTime())
    setEpisodeType('general')
    setHrPeak('')
    setBpAtEvent('')
    setSpo2AtEvent('')
    setSymptoms([])
    setSeverity([5])
    setTriggers([])
    setPositionAtOnset('')
    setResolutionMethod('')
    setDurationValue('')
    setDurationUnit('minutes')
    setErVisitRequired(false)
    setEcgStripImages([])
    setNotes('')
    setTags([])
  }

  const toggleArr = (arr: string[], setter: (v: string[]) => void) => (item: string) => {
    setter(arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item])
  }

  const handleSave = () => {
    const entryData: Omit<CardiacEntry, 'id'> = {
      date: entryDate,
      timestamp: dateTimeToISO(entryDate, entryTime),
      episodeType,
      hrPeak: hrPeak ? parseInt(hrPeak) : undefined,
      bpAtEvent: bpAtEvent || undefined,
      spo2AtEvent: spo2AtEvent ? parseInt(spo2AtEvent) : undefined,
      symptoms,
      symptomSeverity: severity[0],
      triggers,
      positionAtOnset: (positionAtOnset || undefined) as any,
      resolutionMethod: (resolutionMethod || undefined) as any,
      duration: durationValue && durationUnit ? `${durationValue} ${durationUnit}` : undefined,
      erVisitRequired,
      ecgStripImages: ecgStripImages.length > 0 ? ecgStripImages : undefined,
      notes: notes.trim() || undefined,
      tags: tags.length > 0 ? tags : undefined
    }
    onSave(entryData)
    resetForm()
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <KeyboardAvoidingWrapper>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500" />
            🫀 Cardiac Event
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* 🚨 DYNAMIC RED FLAG BANNER */}
          {(() => {
            const entryShape = {
              episodeType,
              hrPeak: hrPeak ? parseInt(hrPeak) : undefined,
              spo2AtEvent: spo2AtEvent ? parseInt(spo2AtEvent) : undefined,
              symptomSeverity: severity[0],
              symptoms,
            }
            const redFlags = getRedFlagWarnings(entryShape)
            const interimMeasures = getInterimMeasures(entryShape)
            if (redFlags.length === 0) return null
            return (
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
                    <strong>If these are happening RIGHT NOW:</strong> call 911. Documenting can wait.
                  </p>
                  <p className="text-sm text-red-900 dark:text-red-200">
                    <strong>If this is in the PAST and resolved:</strong> these symptoms qualify as an emergency event — document carefully here for your cardiologist, and follow up with your medical team. Multiple flagged events may warrant ER evaluation now even retrospectively.
                  </p>
                </div>

                {interimMeasures.length > 0 && (
                  <div className="ml-7 pt-2 border-t border-red-300 dark:border-red-800">
                    <p className="text-sm font-semibold text-red-900 dark:text-red-200 mb-1">
                      💪 While waiting for EMS (or if you're working through this), you can try:
                    </p>
                    <ul className="space-y-2 text-sm text-red-900 dark:text-red-200">
                      {interimMeasures.map((m, i) => (
                        <li key={i}>• {m}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <p className="text-xs italic text-red-800 dark:text-red-300 ml-7">
                  Automated heuristic, not a diagnosis. When in doubt, call 911 — saving this entry can wait.
                </p>
              </div>
            )
          })()}

          {/* Date / time picker */}
          <EntryDateTimePicker date={entryDate} time={entryTime} onChange={(d, t) => { setEntryDate(d); setEntryTime(t) }} />

          {/* Episode type select */}
          <Collapsible open={openSections.eventType} onOpenChange={() => toggleSection('eventType')}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between h-auto py-3">
                <div className="flex items-center gap-2"><span className="font-medium">Event Type</span></div>
                {openSections.eventType ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <Select value={episodeType} onValueChange={(v) => setEpisodeType(v as CardiacEpisodeType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EPISODE_TYPES.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.icon} {t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CollapsibleContent>
          </Collapsible>

          {/* Vitals */}
          <Collapsible open={openSections.vitals} onOpenChange={() => toggleSection('vitals')}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between h-auto py-3">
                <div className="flex items-center gap-2"><span className="font-medium">Vitals at Event (Optional)</span></div>
                {openSections.vitals ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="hr-peak">Peak HR (bpm)</Label>
                  <Input id="hr-peak" type="number" value={hrPeak} onChange={(e) => setHrPeak(e.target.value)} placeholder="e.g., 140" />
                </div>
                <div>
                  <Label htmlFor="bp">BP</Label>
                  <Input id="bp" value={bpAtEvent} onChange={(e) => setBpAtEvent(e.target.value)} placeholder="e.g., 119/82" />
                </div>
                <div>
                  <Label htmlFor="spo2">SpO2 (%)</Label>
                  <Input id="spo2" type="number" value={spo2AtEvent} onChange={(e) => setSpo2AtEvent(e.target.value)} placeholder="e.g., 96" />
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Symptoms */}
          <Collapsible open={openSections.symptoms} onOpenChange={() => toggleSection('symptoms')}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between h-auto py-3">
                <div className="flex items-center gap-2"><span className="font-medium">Symptoms</span></div>
                {openSections.symptoms ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {CARDIAC_SYMPTOMS.map((s) => (
                  <div key={s} className="flex items-center space-x-2">
                    <Checkbox id={`sym-${s}`} checked={symptoms.includes(s)} onCheckedChange={() => toggleArr(symptoms, setSymptoms)(s)} />
                    <Label htmlFor={`sym-${s}`} className="text-sm">{s}</Label>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Severity */}
          <Collapsible open={openSections.severity} onOpenChange={() => toggleSection('severity')}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between h-auto py-3">
                <div className="flex items-center gap-2"><span className="font-medium">Severity: {severity[0]} - <span className={getSeverityColor(severity[0])}>{getSeverityLabel(severity[0])}</span></span></div>
                {openSections.severity ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <Slider value={severity} onValueChange={setSeverity} max={10} min={1} step={1} />
            </CollapsibleContent>
          </Collapsible>

          {/* Triggers */}
          <Collapsible open={openSections.triggers} onOpenChange={() => toggleSection('triggers')}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between h-auto py-3">
                <div className="flex items-center gap-2"><span className="font-medium">Triggers (Optional)</span></div>
                {openSections.triggers ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                {CARDIAC_TRIGGERS.map((t) => (
                  <div key={t} className="flex items-center space-x-2">
                    <Checkbox id={`trig-${t}`} checked={triggers.includes(t)} onCheckedChange={() => toggleArr(triggers, setTriggers)(t)} />
                    <Label htmlFor={`trig-${t}`} className="text-sm">{t}</Label>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Position */}
          <Collapsible open={openSections.position} onOpenChange={() => toggleSection('position')}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between h-auto py-3">
                <div className="flex items-center gap-2"><span className="font-medium">Position at Onset (Optional)</span></div>
                {openSections.position ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <Select value={positionAtOnset} onValueChange={setPositionAtOnset}>
                <SelectTrigger><SelectValue placeholder="Select position" /></SelectTrigger>
                <SelectContent>
                  {POSITION_OPTIONS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </CollapsibleContent>
          </Collapsible>

          {/* Resolution */}
          <Collapsible open={openSections.resolution} onOpenChange={() => toggleSection('resolution')}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between h-auto py-3">
                <div className="flex items-center gap-2"><span className="font-medium">How did it resolve? (Optional)</span></div>
                {openSections.resolution ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <Select value={resolutionMethod} onValueChange={setResolutionMethod}>
                <SelectTrigger><SelectValue placeholder="Resolution method" /></SelectTrigger>
                <SelectContent>
                  {RESOLUTION_METHODS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </CollapsibleContent>
          </Collapsible>

          {/* Duration */}
          <Collapsible open={openSections.duration} onOpenChange={() => toggleSection('duration')}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between h-auto py-3">
                <div className="flex items-center gap-2"><span className="font-medium">Duration (Optional)</span></div>
                {openSections.duration ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <div className="flex gap-2">
                <Input type="number" min="0" step="0.5" value={durationValue} onChange={(e) => setDurationValue(e.target.value)} placeholder="0.5" className="flex-1" />
                <Select value={durationUnit} onValueChange={setDurationUnit}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DURATION_UNITS.map(u => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* ER */}
          <Collapsible open={openSections.er} onOpenChange={() => toggleSection('er')}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between h-auto py-3">
                <div className="flex items-center gap-2"><span className="font-medium">ER Visit</span></div>
                {openSections.er ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <div className="flex items-center space-x-2">
                <Checkbox id="er" checked={erVisitRequired} onCheckedChange={(v) => setErVisitRequired(!!v)} />
                <Label htmlFor="er">Required ER visit / EMS</Label>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* ECG Strip / Document Upload */}
          <Collapsible open={openSections.ecg} onOpenChange={() => toggleSection('ecg')}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between h-auto py-3">
                <div className="flex items-center gap-2"><span className="font-medium">ECG strips, lab PDFs, photos (Optional)</span></div>
                {openSections.ecg ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <EcgStripUploader
                value={ecgStripImages}
                onChange={setEcgStripImages}
                label="ECG strips, lab PDFs, photos (Optional)"
                helpText="Attach screenshots, lab PDFs, or photos relevant to this event. Stored locally only."
              />
            </CollapsibleContent>
          </Collapsible>

          {/* Notes */}
          <Collapsible open={openSections.notes} onOpenChange={() => toggleSection('notes')}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between h-auto py-3">
                <div className="flex items-center gap-2"><span className="font-medium">Notes (Optional)</span></div>
                {openSections.notes ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Additional details..." />
            </CollapsibleContent>
          </Collapsible>

          {/* Tags */}
          <Collapsible open={openSections.tags} onOpenChange={() => toggleSection('tags')}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between h-auto py-3">
                <div className="flex items-center gap-2"><span className="font-medium">Tags (Optional)</span></div>
                {openSections.tags ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <TagInput value={tags} onChange={setTags} placeholder="Add tags..." />
            </CollapsibleContent>
          </Collapsible>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={handleClose} className="flex-1">Cancel</Button>
            <Button type="button" onClick={handleSave} className="flex-1" disabled={symptoms.length === 0}>
              <Plus className="h-4 w-4 mr-2" />
              {editingEntry ? 'Update Event' : 'Save Cardiac Event'}
            </Button>
          </div>
        </div>
        </KeyboardAvoidingWrapper>
      </DialogContent>
    </Dialog>
  )
}
