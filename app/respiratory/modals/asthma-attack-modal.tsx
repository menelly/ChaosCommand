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
import { Wind, Plus, AlertTriangle } from 'lucide-react'

import { RespiratoryEntry, RespiratoryModalProps, PeakFlowZone } from '../respiratory-types'
import { RESPIRATORY_SYMPTOMS, RESPIRATORY_TRIGGERS, BREATHING_PATTERNS, PEAK_FLOW_ZONES, getSeverityLabel, getSeverityColor, getRedFlagWarnings, getInterimMeasures } from '../respiratory-constants'
import { TagInput } from '@/components/tag-input'
import { KeyboardAvoidingWrapper } from '@/components/ui/keyboard-avoiding-wrapper'
import { AttachmentUploader } from '../components/attachment-uploader'

export function AsthmaAttackModal({ isOpen, onClose, onSave, editingEntry }: RespiratoryModalProps) {
  const [severity, setSeverity] = useState([5])
  const [breathingPattern, setBreathingPattern] = useState<string>('')
  const [chestTightness, setChestTightness] = useState([0])
  const [peakFlowReading, setPeakFlowReading] = useState('')
  const [peakFlowZone, setPeakFlowZone] = useState<string>('')
  const [spo2Lowest, setSpo2Lowest] = useState('')
  const [hrAtEvent, setHrAtEvent] = useState('')
  const [inhalerUsed, setInhalerUsed] = useState(false)
  const [inhalerName, setInhalerName] = useState('')
  const [inhalerDoses, setInhalerDoses] = useState('')
  const [inhalerResponse, setInhalerResponse] = useState([3])
  const [symptoms, setSymptoms] = useState<string[]>([])
  const [triggers, setTriggers] = useState<string[]>([])
  const [timeToResolutionMin, setTimeToResolutionMin] = useState('')
  const [erVisitRequired, setErVisitRequired] = useState(false)
  const [attachmentImages, setAttachmentImages] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [tags, setTags] = useState<string[]>([])

  useEffect(() => {
    if (editingEntry && editingEntry.episodeType === 'asthma-attack') {
      setSeverity([editingEntry.severity || 5])
      setBreathingPattern(editingEntry.breathingPattern || '')
      setChestTightness([editingEntry.chestTightness || 0])
      setPeakFlowReading(editingEntry.peakFlowReading?.toString() || '')
      setPeakFlowZone(editingEntry.peakFlowZone || '')
      setSpo2Lowest(editingEntry.spo2Lowest?.toString() || '')
      setHrAtEvent(editingEntry.hrAtEvent?.toString() || '')
      setInhalerUsed(editingEntry.inhalerUsed || false)
      setInhalerName(editingEntry.inhalerName || '')
      setInhalerDoses(editingEntry.inhalerDoses?.toString() || '')
      setInhalerResponse([editingEntry.inhalerResponse || 3])
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
    setSeverity([5]); setBreathingPattern(''); setChestTightness([0])
    setPeakFlowReading(''); setPeakFlowZone(''); setSpo2Lowest(''); setHrAtEvent('')
    setInhalerUsed(false); setInhalerName(''); setInhalerDoses(''); setInhalerResponse([3])
    setSymptoms([]); setTriggers([]); setTimeToResolutionMin(''); setErVisitRequired(false)
    setAttachmentImages([]); setNotes(''); setTags([])
  }

  const toggle = (arr: string[], setter: (v: string[]) => void) => (item: string) =>
    setter(arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item])

  const handleSave = () => {
    const data: Omit<RespiratoryEntry, 'id' | 'timestamp' | 'date'> = {
      episodeType: 'asthma-attack',
      severity: severity[0],
      breathingPattern: (breathingPattern || undefined) as any,
      chestTightness: chestTightness[0] > 0 ? chestTightness[0] : undefined,
      peakFlowReading: peakFlowReading ? parseInt(peakFlowReading) : undefined,
      peakFlowZone: (peakFlowZone || undefined) as PeakFlowZone | undefined,
      spo2Lowest: spo2Lowest ? parseInt(spo2Lowest) : undefined,
      hrAtEvent: hrAtEvent ? parseInt(hrAtEvent) : undefined,
      inhalerUsed,
      inhalerName: inhalerName || undefined,
      inhalerDoses: inhalerDoses ? parseInt(inhalerDoses) : undefined,
      inhalerResponse: inhalerUsed ? inhalerResponse[0] : undefined,
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
          <DialogTitle className="flex items-center gap-2"><Wind className="h-5 w-5 text-red-500" /> 🌬️ Asthma Attack</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          {(() => {
            const shape = { episodeType: 'asthma-attack', severity: severity[0], spo2Lowest: spo2Lowest ? parseInt(spo2Lowest) : undefined, peakFlowZone, symptoms, inhalerResponse: inhalerUsed ? inhalerResponse[0] : undefined }
            const flags = getRedFlagWarnings(shape)
            const measures = getInterimMeasures({ ...shape, episodeType: 'asthma-attack' })
            if (flags.length === 0) return null
            return (
              <div className="border-2 border-red-500 bg-red-50 dark:bg-red-950/30 rounded-lg p-4 space-y-3">
                <div className="flex items-start gap-2"><AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" /><div className="font-bold text-red-700 dark:text-red-400">🚨 Red flags detected</div></div>
                <ul className="space-y-1 text-sm text-red-900 dark:text-red-200 ml-7">{flags.map((f, i) => <li key={i}>• {f}</li>)}</ul>
                <div className="ml-7 pt-2 border-t border-red-300 dark:border-red-800 space-y-2">
                  <p className="text-sm text-red-900 dark:text-red-200"><strong>If happening RIGHT NOW:</strong> call 911. Documenting can wait.</p>
                  <p className="text-sm text-red-900 dark:text-red-200"><strong>If this is in the PAST:</strong> these symptoms qualified as emergency-level. Document for your pulmonologist.</p>
                </div>
                {measures.length > 0 && (
                  <div className="ml-7 pt-2 border-t border-red-300 dark:border-red-800">
                    <p className="text-sm font-semibold text-red-900 dark:text-red-200 mb-1">💪 While working through this / waiting for EMS:</p>
                    <ul className="space-y-2 text-sm text-red-900 dark:text-red-200">{measures.map((m, i) => <li key={i}>• {m}</li>)}</ul>
                  </div>
                )}
              </div>
            )
          })()}

          <div className="grid grid-cols-2 gap-3">
            <div><Label>Peak Flow Reading (L/min)</Label><Input type="number" value={peakFlowReading} onChange={(e) => setPeakFlowReading(e.target.value)} placeholder="e.g., 350" /></div>
            <div>
              <Label>Peak Flow Zone</Label>
              <Select value={peakFlowZone} onValueChange={setPeakFlowZone}>
                <SelectTrigger><SelectValue placeholder="Select zone" /></SelectTrigger>
                <SelectContent>{PEAK_FLOW_ZONES.map(z => <SelectItem key={z.value} value={z.value} textValue={z.label}>{z.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div><Label>Lowest SpO2 (%)</Label><Input type="number" value={spo2Lowest} onChange={(e) => setSpo2Lowest(e.target.value)} placeholder="e.g., 91" /></div>
            <div><Label>HR at event (bpm)</Label><Input type="number" value={hrAtEvent} onChange={(e) => setHrAtEvent(e.target.value)} placeholder="e.g., 120" /></div>
          </div>

          <div className="space-y-3">
            <Label>Breathing Pattern</Label>
            <Select value={breathingPattern} onValueChange={setBreathingPattern}>
              <SelectTrigger><SelectValue placeholder="Select pattern" /></SelectTrigger>
              <SelectContent>{BREATHING_PATTERNS.map(p => <SelectItem key={p.value} value={p.value} textValue={p.label}>{p.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label>Severity: {severity[0]} - <span className={getSeverityColor(severity[0])}>{getSeverityLabel(severity[0])}</span></Label>
            <Slider value={severity} onValueChange={setSeverity} max={10} min={1} step={1} />
          </div>

          <div className="space-y-3">
            <Label>Chest Tightness: {chestTightness[0]}/10</Label>
            <Slider value={chestTightness} onValueChange={setChestTightness} max={10} min={0} step={1} />
          </div>

          <div className="space-y-3">
            <h4 className="font-medium">Rescue Inhaler</h4>
            <div className="flex items-center space-x-2"><Checkbox id="inhaler" checked={inhalerUsed} onCheckedChange={(v) => setInhalerUsed(!!v)} /><Label htmlFor="inhaler">Used rescue inhaler</Label></div>
            {inhalerUsed && (
              <div className="space-y-3 pl-6">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Inhaler name</Label><Input value={inhalerName} onChange={(e) => setInhalerName(e.target.value)} placeholder="e.g., Albuterol" /></div>
                  <div><Label>Number of doses</Label><Input type="number" value={inhalerDoses} onChange={(e) => setInhalerDoses(e.target.value)} placeholder="e.g., 2" /></div>
                </div>
                <div className="space-y-2">
                  <Label>How well did it work? {inhalerResponse[0]}/5</Label>
                  <Slider value={inhalerResponse} onValueChange={setInhalerResponse} max={5} min={1} step={1} />
                  <p className="text-xs text-muted-foreground">1 = no help, 5 = fully resolved</p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <Label>Symptoms</Label>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
              {RESPIRATORY_SYMPTOMS.map(s => (
                <div key={s} className="flex items-center space-x-2"><Checkbox id={`s-${s}`} checked={symptoms.includes(s)} onCheckedChange={() => toggle(symptoms, setSymptoms)(s)} /><Label htmlFor={`s-${s}`} className="text-sm">{s}</Label></div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label>Triggers</Label>
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
              {RESPIRATORY_TRIGGERS.map(t => (
                <div key={t} className="flex items-center space-x-2"><Checkbox id={`t-${t}`} checked={triggers.includes(t)} onCheckedChange={() => toggle(triggers, setTriggers)(t)} /><Label htmlFor={`t-${t}`} className="text-sm">{t}</Label></div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div><Label>Time to resolution (min)</Label><Input type="number" value={timeToResolutionMin} onChange={(e) => setTimeToResolutionMin(e.target.value)} placeholder="e.g., 30" /></div>
            <div className="flex items-end pb-2"><div className="flex items-center space-x-2"><Checkbox id="er" checked={erVisitRequired} onCheckedChange={(v) => setErVisitRequired(!!v)} /><Label htmlFor="er">ER / EMS visit required</Label></div></div>
          </div>

          <AttachmentUploader value={attachmentImages} onChange={setAttachmentImages} label="Attachments (Optional)" helpText="Peak flow chart photos, action plan, ER discharge papers, etc." blobPrefix="respiratory" />

          <div className="space-y-3"><Label htmlFor="notes">Notes (Optional)</Label><Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Additional details..." /></div>

          <div className="space-y-3"><Label>Tags (Optional)</Label><TagInput value={tags} onChange={setTags} placeholder="Tags..." /></div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={handleClose} className="flex-1">Cancel</Button>
            <Button type="button" onClick={handleSave} className="flex-1" disabled={symptoms.length === 0}><Plus className="h-4 w-4 mr-2" />{editingEntry ? 'Update Attack' : 'Save Asthma Attack'}</Button>
          </div>
        </div>
        </KeyboardAvoidingWrapper>
      </DialogContent>
    </Dialog>
  )
}
