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
import { Bone, Plus } from 'lucide-react'

import { JointEntry, JointEpisodeType, JointModalProps } from '../joint-types'
import { EPISODE_TYPES, JOINTS, TRIGGER_ACTIVITIES, TREATMENTS, getSeverityLabel, getSeverityColor } from '../joint-constants'
import { TagInput } from '@/components/tag-input'
import { KeyboardAvoidingWrapper } from '@/components/ui/keyboard-avoiding-wrapper'
import { AttachmentUploader } from '../components/attachment-uploader'
import { EntryDateTimePicker, todayISO, nowTime, dateTimeToISO, isoToDateTime } from '@/components/entry-datetime-picker'

export function GeneralJointModal({ isOpen, onClose, onSave, editingEntry, presetType }: JointModalProps) {
  const [entryDate, setEntryDate] = useState(todayISO())
  const [entryTime, setEntryTime] = useState(nowTime())
  const [episodeType, setEpisodeType] = useState<JointEpisodeType>('subluxation')
  const [jointAffected, setJointAffected] = useState<string[]>([])
  const [severity, setSeverity] = useState([5])
  const [selfReducedFlag, setSelfReducedFlag] = useState(false)
  const [swellingPresent, setSwellingPresent] = useState(false)
  const [swellingScale, setSwellingScale] = useState([0])
  const [bruisingPresent, setBruisingPresent] = useState(false)
  const [romImpactedPercent, setRomImpactedPercent] = useState([100])
  const [triggerActivity, setTriggerActivity] = useState<string[]>([])
  const [treatmentApplied, setTreatmentApplied] = useState<string[]>([])
  const [treatmentResponse, setTreatmentResponse] = useState([3])
  const [duration, setDuration] = useState('')
  const [erVisitRequired, setErVisitRequired] = useState(false)
  const [attachmentImages, setAttachmentImages] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [tags, setTags] = useState<string[]>([])

  useEffect(() => {
    if (editingEntry) {
      const dt = isoToDateTime(editingEntry.timestamp)
      setEntryDate(editingEntry.date || dt.date)
      setEntryTime(dt.time)
      setEpisodeType(editingEntry.episodeType)
      setJointAffected(editingEntry.jointAffected || [])
      setSeverity([editingEntry.severity || 5])
      setSelfReducedFlag(editingEntry.selfReducedFlag || false)
      setSwellingPresent(editingEntry.swellingPresent || false)
      setSwellingScale([editingEntry.swellingScale || 0])
      setBruisingPresent(editingEntry.bruisingPresent || false)
      setRomImpactedPercent([editingEntry.romImpactedPercent ?? 100])
      setTriggerActivity(editingEntry.triggerActivity || [])
      setTreatmentApplied(editingEntry.treatmentApplied || [])
      setTreatmentResponse([editingEntry.treatmentResponse || 3])
      setDuration(editingEntry.duration || '')
      setErVisitRequired(editingEntry.erVisitRequired || false)
      setAttachmentImages(editingEntry.attachmentImages || [])
      setNotes(editingEntry.notes || '')
      setTags(editingEntry.tags || [])
    } else if (presetType) {
      reset()
      setEpisodeType(presetType as JointEpisodeType)
    } else { reset() }
  }, [editingEntry, isOpen, presetType])

  const reset = () => {
    setEntryDate(todayISO()); setEntryTime(nowTime())
    setEpisodeType('subluxation'); setJointAffected([]); setSeverity([5])
    setSelfReducedFlag(false); setSwellingPresent(false); setSwellingScale([0]); setBruisingPresent(false)
    setRomImpactedPercent([100]); setTriggerActivity([]); setTreatmentApplied([]); setTreatmentResponse([3])
    setDuration(''); setErVisitRequired(false); setAttachmentImages([]); setNotes(''); setTags([])
  }

  const toggle = (arr: string[], setter: (v: string[]) => void) => (item: string) =>
    setter(arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item])

  const handleSave = () => {
    const data: Omit<JointEntry, 'id'> = {
      date: entryDate,
      timestamp: dateTimeToISO(entryDate, entryTime),
      episodeType,
      jointAffected,
      severity: severity[0],
      selfReducedFlag,
      swellingPresent,
      swellingScale: swellingPresent && swellingScale[0] > 0 ? swellingScale[0] : undefined,
      bruisingPresent,
      romImpactedPercent: romImpactedPercent[0] !== 100 ? romImpactedPercent[0] : undefined,
      triggerActivity,
      treatmentApplied,
      treatmentResponse: treatmentApplied.length > 0 ? treatmentResponse[0] : undefined,
      duration: duration || undefined,
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
          <DialogTitle className="flex items-center gap-2"><Bone className="h-5 w-5 text-amber-500" /> 🦴 Joint / MSK Event</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <EntryDateTimePicker date={entryDate} time={entryTime} onChange={(d, t) => { setEntryDate(d); setEntryTime(t) }} />

          <div className="space-y-3">
            <Label>Event Type</Label>
            <Select value={episodeType} onValueChange={(v) => setEpisodeType(v as JointEpisodeType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{EPISODE_TYPES.map(t => <SelectItem key={t.id} value={t.id} textValue={t.name}>{t.icon} {t.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label>Joint(s) Affected</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-60 overflow-y-auto">
              {JOINTS.map(j => (
                <div key={j} className="flex items-center space-x-2"><Checkbox id={`j-${j}`} checked={jointAffected.includes(j)} onCheckedChange={() => toggle(jointAffected, setJointAffected)(j)} /><Label htmlFor={`j-${j}`} className="text-sm">{j}</Label></div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label>Severity: {severity[0]} - <span className={getSeverityColor(severity[0])}>{getSeverityLabel(severity[0])}</span></Label>
            <Slider value={severity} onValueChange={setSeverity} max={10} min={1} step={1} />
          </div>

          {(episodeType === 'subluxation' || episodeType === 'dislocation') && (
            <div className="flex items-center space-x-2"><Checkbox id="self" checked={selfReducedFlag} onCheckedChange={(v) => setSelfReducedFlag(!!v)} /><Label htmlFor="self">Self-reduced (popped back without help)</Label></div>
          )}

          <div className="space-y-3">
            <h4 className="font-medium">Physical Findings</h4>
            <div className="flex items-center space-x-2"><Checkbox id="swell" checked={swellingPresent} onCheckedChange={(v) => setSwellingPresent(!!v)} /><Label htmlFor="swell">Swelling present</Label></div>
            {swellingPresent && (
              <div className="pl-6 space-y-2"><Label>Swelling severity: {swellingScale[0]}/5</Label><Slider value={swellingScale} onValueChange={setSwellingScale} max={5} min={0} step={1} /></div>
            )}
            <div className="flex items-center space-x-2"><Checkbox id="bruise" checked={bruisingPresent} onCheckedChange={(v) => setBruisingPresent(!!v)} /><Label htmlFor="bruise">Bruising present</Label></div>
          </div>

          <div className="space-y-2">
            <Label>Range of Motion: {romImpactedPercent[0]}% of normal</Label>
            <Slider value={romImpactedPercent} onValueChange={setRomImpactedPercent} max={100} min={0} step={5} />
            <p className="text-xs text-muted-foreground">100% = full normal ROM, 0% = completely locked / unable to move</p>
          </div>

          <div className="space-y-3">
            <Label>What was the triggering activity?</Label>
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
              {TRIGGER_ACTIVITIES.map(t => (
                <div key={t} className="flex items-center space-x-2"><Checkbox id={`tr-${t}`} checked={triggerActivity.includes(t)} onCheckedChange={() => toggle(triggerActivity, setTriggerActivity)(t)} /><Label htmlFor={`tr-${t}`} className="text-sm">{t}</Label></div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label>Treatment Applied</Label>
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
              {TREATMENTS.map(t => (
                <div key={t} className="flex items-center space-x-2"><Checkbox id={`tx-${t}`} checked={treatmentApplied.includes(t)} onCheckedChange={() => toggle(treatmentApplied, setTreatmentApplied)(t)} /><Label htmlFor={`tx-${t}`} className="text-sm">{t}</Label></div>
              ))}
            </div>
          </div>

          {treatmentApplied.length > 0 && <div className="space-y-2"><Label>Treatment helped: {treatmentResponse[0]}/5</Label><Slider value={treatmentResponse} onValueChange={setTreatmentResponse} max={5} min={1} step={1} /></div>}

          <div className="grid grid-cols-2 gap-3">
            <div><Label>Duration</Label><Input value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="e.g., 5 min, 2 hours, 3 days" /></div>
            <div className="flex items-end pb-2"><div className="flex items-center space-x-2"><Checkbox id="er" checked={erVisitRequired} onCheckedChange={(v) => setErVisitRequired(!!v)} /><Label htmlFor="er">ER / EMS required</Label></div></div>
          </div>

          <AttachmentUploader value={attachmentImages} onChange={setAttachmentImages} label="Attachments (Optional)" helpText="X-rays, MRI reports, photos of swelling/bruising, brace/sling photos." blobPrefix="joint" />

          <div className="space-y-3"><Label htmlFor="notes">Notes (Optional)</Label><Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Additional details..." /></div>

          <div className="space-y-3"><Label>Tags (Optional)</Label><TagInput value={tags} onChange={setTags} placeholder="Tags..." /></div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={handleClose} className="flex-1">Cancel</Button>
            <Button type="button" onClick={handleSave} className="flex-1" disabled={jointAffected.length === 0}><Plus className="h-4 w-4 mr-2" />{editingEntry ? 'Update Event' : 'Save Joint Event'}</Button>
          </div>
        </div>
        </KeyboardAvoidingWrapper>
      </DialogContent>
    </Dialog>
  )
}
