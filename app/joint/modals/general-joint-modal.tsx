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
import { Bone, Plus, ChevronDown, ChevronRight } from 'lucide-react'

import { JointEntry, JointEpisodeType, JointModalProps } from '../joint-types'
import { EPISODE_TYPES, JOINTS, MUSCLES, isMuscleEpisode, TRIGGER_ACTIVITIES, TREATMENTS, getSeverityLabel, getSeverityColor } from '../joint-constants'

// Muscle symptoms that also belong in the Neuro tracker — these show the
// "⇄ also log under Neuro" checkbox. Mirror of neuro's MSK-facing set
// (neuro's 'spasticity-cramping' corresponds to joint's 'cramping').
const DUAL_LISTED: JointEpisodeType[] = ['weakness', 'cramping', 'fasciculations']
import { TagInput } from '@/components/tag-input'
import { KeyboardAvoidingWrapper } from '@/components/ui/keyboard-avoiding-wrapper'
import { AttachmentUploader } from '../components/attachment-uploader'
import { EntryDateTimePicker, todayISO, nowTime, dateTimeToISO, isoToDateTime } from '@/components/entry-datetime-picker'

export function GeneralJointModal({ isOpen, onClose, onSave, editingEntry, presetType }: JointModalProps) {
  const [entryDate, setEntryDate] = useState(todayISO())
  const [entryTime, setEntryTime] = useState(nowTime())
  const [episodeType, setEpisodeType] = useState<JointEpisodeType>('subluxation')
  const [jointAffected, setJointAffected] = useState<string[]>([])
  const [musclesAffected, setMusclesAffected] = useState<string[]>([])
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
  const [crossList, setCrossList] = useState(false)
  const [notes, setNotes] = useState('')
  const [tags, setTags] = useState<string[]>([])

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    eventType: false,
    joints: false,
    severity: false,
    selfReduced: false,
    physical: false,
    rom: false,
    trigger: false,
    treatment: false,
    treatmentResponse: false,
    duration: false,
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
      setEpisodeType(editingEntry.episodeType)
      setJointAffected(editingEntry.jointAffected || [])
      setMusclesAffected(editingEntry.musclesAffected || [])
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
      setCrossList(!!editingEntry.crossListedIn?.length)
      setNotes(editingEntry.notes || '')
      setTags(editingEntry.tags || [])
    } else if (presetType) {
      reset()
      setEpisodeType(presetType as JointEpisodeType)
    } else { reset() }
  }, [editingEntry, isOpen, presetType])

  const reset = () => {
    setEntryDate(todayISO()); setEntryTime(nowTime())
    setEpisodeType('subluxation'); setJointAffected([]); setMusclesAffected([]); setSeverity([5])
    setSelfReducedFlag(false); setSwellingPresent(false); setSwellingScale([0]); setBruisingPresent(false)
    setRomImpactedPercent([100]); setTriggerActivity([]); setTreatmentApplied([]); setTreatmentResponse([3])
    setDuration(''); setErVisitRequired(false); setAttachmentImages([]); setCrossList(false); setNotes(''); setTags([])
  }

  const toggle = (arr: string[], setter: (v: string[]) => void) => (item: string) =>
    setter(arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item])

  const handleSave = () => {
    const data: Omit<JointEntry, 'id'> = {
      date: entryDate,
      timestamp: dateTimeToISO(entryDate, entryTime),
      episodeType,
      jointAffected,
      musclesAffected: musclesAffected.length > 0 ? musclesAffected : undefined,
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
      // Intent signal — the tracker turns this into a real cross-list write.
      crossListedIn: showCrossList && crossList ? ['joint', 'neuro'] : undefined,
      notes: notes.trim() || undefined,
      tags: tags.length > 0 ? tags : undefined
    }
    onSave(data); reset()
  }

  const handleClose = () => { reset(); onClose() }

  // Muscle event types show a muscle menu instead of the joint checklist.
  const muscleMode = isMuscleEpisode(episodeType)
  // Dual-listed neuromuscular symptoms can also be sent to the Neuro tracker.
  const showCrossList = DUAL_LISTED.includes(episodeType)

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <KeyboardAvoidingWrapper>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Bone className="h-5 w-5 text-amber-500" /> 🦴 Joint / MSK Event</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <EntryDateTimePicker date={entryDate} time={entryTime} onChange={(d, t) => { setEntryDate(d); setEntryTime(t) }} />

          <Collapsible open={openSections.eventType} onOpenChange={() => toggleSection('eventType')}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between h-auto py-3">
                <span className="font-medium">Event Type</span>
                {openSections.eventType ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <Select value={episodeType} onValueChange={(v) => setEpisodeType(v as JointEpisodeType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{EPISODE_TYPES.map(t => <SelectItem key={t.id} value={t.id} textValue={t.name}>{t.icon} {t.name}</SelectItem>)}</SelectContent>
              </Select>
            </CollapsibleContent>
          </Collapsible>

          {/* ⇄ Cross-list — only for the dual-listed neuromuscular symptoms */}
          {showCrossList && (
            <div className="flex items-start space-x-2 rounded-lg border-2 border-violet-200 bg-violet-50/50 dark:bg-violet-950/20 p-3">
              <Checkbox id="crosslist" checked={crossList} onCheckedChange={(v) => setCrossList(!!v)} className="mt-0.5" />
              <Label htmlFor="crosslist" className="text-sm leading-snug">
                ⇄ Also log under <strong>Neuro / Neuromuscular</strong>
                <span className="block text-xs text-muted-foreground mt-0.5">One event, surfaced in both the MSK and Neuro views — so your rheumatologist and neurologist each see it. Editing or deleting it in either place updates both.</span>
              </Label>
            </div>
          )}

          <Collapsible open={openSections.joints} onOpenChange={() => toggleSection('joints')}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between h-auto py-3">
                <span className="font-medium">{muscleMode ? '💪 Muscle(s) Affected' : 'Joint(s) Affected'}</span>
                {openSections.joints ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-60 overflow-y-auto">
                {(muscleMode ? MUSCLES : JOINTS).map(item => {
                  const list = muscleMode ? musclesAffected : jointAffected
                  const setList = muscleMode ? setMusclesAffected : setJointAffected
                  return (
                    <div key={item} className="flex items-center space-x-2"><Checkbox id={`a-${item}`} checked={list.includes(item)} onCheckedChange={() => toggle(list, setList)(item)} /><Label htmlFor={`a-${item}`} className="text-sm">{item}</Label></div>
                  )
                })}
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

          {(episodeType === 'subluxation' || episodeType === 'dislocation') && (
            <Collapsible open={openSections.selfReduced} onOpenChange={() => toggleSection('selfReduced')}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between h-auto py-3">
                  <span className="font-medium">Self-reduced</span>
                  {openSections.selfReduced ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3">
                <div className="flex items-center space-x-2"><Checkbox id="self" checked={selfReducedFlag} onCheckedChange={(v) => setSelfReducedFlag(!!v)} /><Label htmlFor="self">Self-reduced (popped back without help)</Label></div>
              </CollapsibleContent>
            </Collapsible>
          )}

          <Collapsible open={openSections.physical} onOpenChange={() => toggleSection('physical')}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between h-auto py-3">
                <span className="font-medium">Physical Findings</span>
                {openSections.physical ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <div className="space-y-3">
                <div className="flex items-center space-x-2"><Checkbox id="swell" checked={swellingPresent} onCheckedChange={(v) => setSwellingPresent(!!v)} /><Label htmlFor="swell">Swelling present</Label></div>
                {swellingPresent && (
                  <div className="pl-6 space-y-2"><Label>Swelling severity: {swellingScale[0]}/5</Label><Slider value={swellingScale} onValueChange={setSwellingScale} max={5} min={0} step={1} /></div>
                )}
                <div className="flex items-center space-x-2"><Checkbox id="bruise" checked={bruisingPresent} onCheckedChange={(v) => setBruisingPresent(!!v)} /><Label htmlFor="bruise">Bruising present</Label></div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Collapsible open={openSections.rom} onOpenChange={() => toggleSection('rom')}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between h-auto py-3">
                <span className="font-medium">Range of Motion</span>
                {openSections.rom ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <div className="space-y-2">
                <Label>Range of Motion: {romImpactedPercent[0]}% of normal</Label>
                <Slider value={romImpactedPercent} onValueChange={setRomImpactedPercent} max={100} min={0} step={5} />
                <p className="text-xs text-muted-foreground">100% = full normal ROM, 0% = completely locked / unable to move</p>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Collapsible open={openSections.trigger} onOpenChange={() => toggleSection('trigger')}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between h-auto py-3">
                <span className="font-medium">Trigger Activity</span>
                {openSections.trigger ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                {TRIGGER_ACTIVITIES.map(t => (
                  <div key={t} className="flex items-center space-x-2"><Checkbox id={`tr-${t}`} checked={triggerActivity.includes(t)} onCheckedChange={() => toggle(triggerActivity, setTriggerActivity)(t)} /><Label htmlFor={`tr-${t}`} className="text-sm">{t}</Label></div>
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
                <div><Label>Duration</Label><Input value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="e.g., 5 min, 2 hours, 3 days" /></div>
                <div className="flex items-end pb-2"><div className="flex items-center space-x-2"><Checkbox id="er" checked={erVisitRequired} onCheckedChange={(v) => setErVisitRequired(!!v)} /><Label htmlFor="er">ER / EMS required</Label></div></div>
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
              <AttachmentUploader value={attachmentImages} onChange={setAttachmentImages} label="Attachments (Optional)" helpText="X-rays, MRI reports, photos of swelling/bruising, brace/sling photos." blobPrefix="joint" />
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
            <Button type="button" onClick={handleSave} className="flex-1" disabled={muscleMode ? musclesAffected.length === 0 : jointAffected.length === 0}><Plus className="h-4 w-4 mr-2" />{editingEntry ? 'Update Event' : 'Save Joint Event'}</Button>
          </div>
        </div>
        </KeyboardAvoidingWrapper>
      </DialogContent>
    </Dialog>
  )
}
