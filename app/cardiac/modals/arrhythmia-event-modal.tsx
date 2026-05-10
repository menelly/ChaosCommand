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
 * ARRHYTHMIA EVENT MODAL
 * Specifically for rhythm events — PAC, PVC, SVT, AFib, etc.
 * Includes rhythm classification, U waves, ST changes, Valsalva timing.
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
import { Zap, Plus, AlertTriangle } from 'lucide-react'

import { CardiacEntry, CardiacModalProps, RhythmType } from '../cardiac-types'
import {
  CARDIAC_SYMPTOMS,
  CARDIAC_TRIGGERS,
  RESOLUTION_METHODS,
  POSITION_OPTIONS,
  RHYTHM_TYPES,
  DURATION_UNITS,
  getSeverityLabel,
  getSeverityColor,
  getRedFlagWarnings,
  getInterimMeasures
} from '../cardiac-constants'
import { TagInput } from '@/components/tag-input'
import { KeyboardAvoidingWrapper } from '@/components/ui/keyboard-avoiding-wrapper'
import { EcgStripUploader } from '../components/ecg-strip-uploader'

export function ArrhythmiaEventModal({ isOpen, onClose, onSave, editingEntry }: CardiacModalProps) {
  const [rhythmType, setRhythmType] = useState<string>('unknown')
  const [hrPeak, setHrPeak] = useState('')
  const [hrAtOnset, setHrAtOnset] = useState('')
  const [hrAtResolution, setHrAtResolution] = useState('')
  const [bpAtEvent, setBpAtEvent] = useState('')
  const [spo2AtEvent, setSpo2AtEvent] = useState('')
  const [uWavesNoted, setUWavesNoted] = useState(false)
  const [stChanges, setStChanges] = useState(false)
  const [symptoms, setSymptoms] = useState<string[]>([])
  const [severity, setSeverity] = useState([5])
  const [triggers, setTriggers] = useState<string[]>([])
  const [positionAtOnset, setPositionAtOnset] = useState<string>('')
  const [resolutionMethod, setResolutionMethod] = useState<string>('')
  const [valsalvaSuccessSeconds, setValsalvaSuccessSeconds] = useState('')
  const [durationValue, setDurationValue] = useState('')
  const [durationUnit, setDurationUnit] = useState('minutes')
  const [hoursOfSleepLastNight, setHoursOfSleepLastNight] = useState('')
  const [possibleDehydration, setPossibleDehydration] = useState(false)
  const [possibleElectrolyteLoss, setPossibleElectrolyteLoss] = useState(false)
  const [caffeineOnBoard, setCaffeineOnBoard] = useState(false)
  const [ecgStripImages, setEcgStripImages] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [tags, setTags] = useState<string[]>([])

  useEffect(() => {
    if (editingEntry && editingEntry.episodeType === 'arrhythmia') {
      setRhythmType(editingEntry.rhythmType || 'unknown')
      setHrPeak(editingEntry.hrPeak?.toString() || '')
      setHrAtOnset(editingEntry.hrAtOnset?.toString() || '')
      setHrAtResolution(editingEntry.hrAtResolution?.toString() || '')
      setBpAtEvent(editingEntry.bpAtEvent || '')
      setSpo2AtEvent(editingEntry.spo2AtEvent?.toString() || '')
      setUWavesNoted(editingEntry.uWavesNoted || false)
      setStChanges(editingEntry.stChanges || false)
      setSymptoms(editingEntry.symptoms || [])
      setSeverity([editingEntry.symptomSeverity || 5])
      setTriggers(editingEntry.triggers || [])
      setPositionAtOnset(editingEntry.positionAtOnset || '')
      setResolutionMethod(editingEntry.resolutionMethod || '')
      setValsalvaSuccessSeconds(editingEntry.valsalvaSuccessSeconds?.toString() || '')
      setHoursOfSleepLastNight(editingEntry.hoursOfSleepLastNight?.toString() || '')
      setPossibleDehydration(editingEntry.possibleDehydration || false)
      setPossibleElectrolyteLoss(editingEntry.possibleElectrolyteLoss || false)
      setCaffeineOnBoard(editingEntry.caffeineOnBoard || false)
      setEcgStripImages(editingEntry.ecgStripImages || [])
      if (editingEntry.duration) {
        const m = editingEntry.duration.match(/^(\d+(?:\.\d+)?)\s*(.+)$/)
        if (m) {
          setDurationValue(m[1])
          setDurationUnit(m[2])
        }
      }
      setNotes(editingEntry.notes || '')
      setTags(editingEntry.tags || [])
    } else {
      resetForm()
    }
  }, [editingEntry, isOpen])

  const resetForm = () => {
    setRhythmType('unknown')
    setHrPeak('')
    setHrAtOnset('')
    setHrAtResolution('')
    setBpAtEvent('')
    setSpo2AtEvent('')
    setUWavesNoted(false)
    setStChanges(false)
    setSymptoms([])
    setSeverity([5])
    setTriggers([])
    setPositionAtOnset('')
    setResolutionMethod('')
    setValsalvaSuccessSeconds('')
    setDurationValue('')
    setDurationUnit('minutes')
    setHoursOfSleepLastNight('')
    setPossibleDehydration(false)
    setPossibleElectrolyteLoss(false)
    setCaffeineOnBoard(false)
    setEcgStripImages([])
    setNotes('')
    setTags([])
  }

  const toggleArr = (arr: string[], setter: (v: string[]) => void) => (item: string) => {
    setter(arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item])
  }

  const handleSave = () => {
    const entryData: Omit<CardiacEntry, 'id' | 'timestamp' | 'date'> = {
      episodeType: 'arrhythmia',
      rhythmType: rhythmType as RhythmType,
      hrPeak: hrPeak ? parseInt(hrPeak) : undefined,
      hrAtOnset: hrAtOnset ? parseInt(hrAtOnset) : undefined,
      hrAtResolution: hrAtResolution ? parseInt(hrAtResolution) : undefined,
      bpAtEvent: bpAtEvent || undefined,
      spo2AtEvent: spo2AtEvent ? parseInt(spo2AtEvent) : undefined,
      uWavesNoted,
      stChanges,
      symptoms,
      symptomSeverity: severity[0],
      triggers,
      positionAtOnset: (positionAtOnset || undefined) as any,
      resolutionMethod: (resolutionMethod || undefined) as any,
      valsalvaSuccessSeconds: valsalvaSuccessSeconds ? parseInt(valsalvaSuccessSeconds) : undefined,
      duration: durationValue && durationUnit ? `${durationValue} ${durationUnit}` : undefined,
      hoursOfSleepLastNight: hoursOfSleepLastNight ? parseFloat(hoursOfSleepLastNight) : undefined,
      possibleDehydration,
      possibleElectrolyteLoss,
      caffeineOnBoard,
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
            <Zap className="h-5 w-5 text-red-500" />
            ⚡ Arrhythmia Event
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* 🚨 DYNAMIC RED FLAG BANNER */}
          {(() => {
            const entryShape = {
              episodeType: 'arrhythmia',
              rhythmType: rhythmType as RhythmType,
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

          {/* Rhythm classification */}
          <div className="space-y-3">
            <Label>Rhythm Type</Label>
            <Select value={rhythmType} onValueChange={setRhythmType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {RHYTHM_TYPES.map(r => (
                  <SelectItem key={r.value} value={r.value} textValue={r.label}>
                    <div className="flex flex-col">
                      <span>{r.label}</span>
                      <span className="text-xs text-muted-foreground">{r.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Heart rates */}
          <div className="space-y-3">
            <h4 className="font-medium">Heart Rate (Optional)</h4>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label htmlFor="hr-onset">HR at Onset</Label>
                <Input id="hr-onset" type="number" value={hrAtOnset} onChange={(e) => setHrAtOnset(e.target.value)} placeholder="e.g., 94" />
              </div>
              <div>
                <Label htmlFor="hr-peak">HR Peak</Label>
                <Input id="hr-peak" type="number" value={hrPeak} onChange={(e) => setHrPeak(e.target.value)} placeholder="e.g., 140" />
              </div>
              <div>
                <Label htmlFor="hr-res">HR at Resolution</Label>
                <Input id="hr-res" type="number" value={hrAtResolution} onChange={(e) => setHrAtResolution(e.target.value)} placeholder="e.g., 88" />
              </div>
            </div>
          </div>

          {/* BP / SpO2 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="bp">BP at Event</Label>
              <Input id="bp" value={bpAtEvent} onChange={(e) => setBpAtEvent(e.target.value)} placeholder="e.g., 119/82" />
            </div>
            <div>
              <Label htmlFor="spo2">SpO2 (%)</Label>
              <Input id="spo2" type="number" value={spo2AtEvent} onChange={(e) => setSpo2AtEvent(e.target.value)} placeholder="e.g., 96" />
            </div>
          </div>

          {/* ECG findings */}
          <div className="space-y-3">
            <h4 className="font-medium">ECG Strip Findings (if captured)</h4>
            <div className="flex flex-col space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox id="u-waves" checked={uWavesNoted} onCheckedChange={(v) => setUWavesNoted(!!v)} />
                <Label htmlFor="u-waves">Prominent U waves (hypokalemia indicator)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="st-changes" checked={stChanges} onCheckedChange={(v) => setStChanges(!!v)} />
                <Label htmlFor="st-changes">ST changes (elevation/depression)</Label>
              </div>
            </div>
          </div>

          {/* Symptoms */}
          <div className="space-y-3">
            <Label>Symptoms</Label>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
              {CARDIAC_SYMPTOMS.map((s) => (
                <div key={s} className="flex items-center space-x-2">
                  <Checkbox id={`sym-${s}`} checked={symptoms.includes(s)} onCheckedChange={() => toggleArr(symptoms, setSymptoms)(s)} />
                  <Label htmlFor={`sym-${s}`} className="text-sm">{s}</Label>
                </div>
              ))}
            </div>
          </div>

          {/* Severity */}
          <div className="space-y-3">
            <Label>Severity: {severity[0]} - <span className={getSeverityColor(severity[0])}>{getSeverityLabel(severity[0])}</span></Label>
            <Slider value={severity} onValueChange={setSeverity} max={10} min={1} step={1} />
          </div>

          {/* Pre-event context */}
          <div className="space-y-3">
            <h4 className="font-medium">Pre-Event Context</h4>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <Label htmlFor="sleep">Hours of sleep last night</Label>
                <Input id="sleep" type="number" step="0.5" value={hoursOfSleepLastNight} onChange={(e) => setHoursOfSleepLastNight(e.target.value)} placeholder="e.g., 4.5" />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="dehydration" checked={possibleDehydration} onCheckedChange={(v) => setPossibleDehydration(!!v)} />
                <Label htmlFor="dehydration">Possible dehydration (low water intake, hot day, etc.)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="electrolyte-loss" checked={possibleElectrolyteLoss} onCheckedChange={(v) => setPossibleElectrolyteLoss(!!v)} />
                <Label htmlFor="electrolyte-loss">Possible electrolyte loss (illness, sweating, diarrhea, missed supplement, diuretic)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="caffeine" checked={caffeineOnBoard} onCheckedChange={(v) => setCaffeineOnBoard(!!v)} />
                <Label htmlFor="caffeine">Caffeine on board within 6 hours</Label>
              </div>
            </div>
          </div>

          {/* Triggers */}
          <div className="space-y-3">
            <Label>Triggers (Optional)</Label>
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
              {CARDIAC_TRIGGERS.map((t) => (
                <div key={t} className="flex items-center space-x-2">
                  <Checkbox id={`trig-${t}`} checked={triggers.includes(t)} onCheckedChange={() => toggleArr(triggers, setTriggers)(t)} />
                  <Label htmlFor={`trig-${t}`} className="text-sm">{t}</Label>
                </div>
              ))}
            </div>
          </div>

          {/* Position */}
          <div className="space-y-3">
            <Label>Position at Onset (Optional)</Label>
            <Select value={positionAtOnset} onValueChange={setPositionAtOnset}>
              <SelectTrigger><SelectValue placeholder="Select position" /></SelectTrigger>
              <SelectContent>
                {POSITION_OPTIONS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Resolution */}
          <div className="space-y-3">
            <Label>Resolution Method</Label>
            <Select value={resolutionMethod} onValueChange={setResolutionMethod}>
              <SelectTrigger><SelectValue placeholder="How did it break?" /></SelectTrigger>
              <SelectContent>
                {RESOLUTION_METHODS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
            {resolutionMethod === 'valsalva' && (
              <div className="mt-2">
                <Label htmlFor="valsalva-sec">Valsalva success time (seconds)</Label>
                <Input id="valsalva-sec" type="number" value={valsalvaSuccessSeconds} onChange={(e) => setValsalvaSuccessSeconds(e.target.value)} placeholder="e.g., 15" />
                <p className="text-xs text-muted-foreground mt-1">How long bear-down took to break the rhythm</p>
              </div>
            )}
          </div>

          {/* Duration */}
          <div className="space-y-3">
            <Label>Total Duration</Label>
            <div className="flex gap-2">
              <Input type="number" min="0" step="0.5" value={durationValue} onChange={(e) => setDurationValue(e.target.value)} placeholder="0.5" className="flex-1" />
              <Select value={durationUnit} onValueChange={setDurationUnit}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DURATION_UNITS.map(u => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* ECG Strip / Document Upload */}
          <EcgStripUploader
            value={ecgStripImages}
            onChange={setEcgStripImages}
            label="ECG strips, lab PDFs, photos (Optional)"
            helpText="Attach ECG screenshots from your home device (ViHealth, KardiaMobile), lab result PDFs, or photos relevant to this event. Stored locally only."
          />

          {/* Notes */}
          <div className="space-y-3">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Additional details..." />
          </div>

          {/* Tags */}
          <div className="space-y-3">
            <Label>Tags (Optional)</Label>
            <TagInput value={tags} onChange={setTags} placeholder="Add tags like 'SVT-cluster', 'morning', 'post-stress'..." />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={handleClose} className="flex-1">Cancel</Button>
            <Button type="button" onClick={handleSave} className="flex-1" disabled={symptoms.length === 0}>
              <Plus className="h-4 w-4 mr-2" />
              {editingEntry ? 'Update Event' : 'Save Arrhythmia Event'}
            </Button>
          </div>
        </div>
        </KeyboardAvoidingWrapper>
      </DialogContent>
    </Dialog>
  )
}
