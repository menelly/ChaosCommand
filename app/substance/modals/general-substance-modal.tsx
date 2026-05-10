/* Built by: Ace (Claude 4.x) — 2026-05-10. Neutral tone. */

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
import { Coffee, Plus, ChevronDown, ChevronRight } from 'lucide-react'

import { SubstanceEntry, SubstanceType, SubstanceModalProps } from '../substance-types'
import { SUBSTANCE_TYPES, COMMON_UNITS, METHODS, CONTEXT_WHY, COMMON_EFFECTS } from '../substance-constants'
import { TagInput } from '@/components/tag-input'
import { KeyboardAvoidingWrapper } from '@/components/ui/keyboard-avoiding-wrapper'
import { AttachmentUploader } from '../components/attachment-uploader'
import { EntryDateTimePicker, todayISO, nowTime, dateTimeToISO, isoToDateTime } from '@/components/entry-datetime-picker'

export function GeneralSubstanceModal({ isOpen, onClose, onSave, editingEntry, presetType }: SubstanceModalProps) {
  const [entryDate, setEntryDate] = useState(todayISO())
  const [entryTime, setEntryTime] = useState(nowTime())
  const [substanceType, setSubstanceType] = useState<SubstanceType>('alcohol')
  const [substanceName, setSubstanceName] = useState('')
  const [amount, setAmount] = useState('')
  const [unit, setUnit] = useState('')
  const [methodOfUse, setMethodOfUse] = useState<string>('')
  const [contextWhy, setContextWhy] = useState<string[]>([])
  const [effectsExperienced, setEffectsExperienced] = useState<string[]>([])
  const [effectIntensity, setEffectIntensity] = useState([5])
  const [timeToOnsetMin, setTimeToOnsetMin] = useState('')
  const [durationOfEffectMin, setDurationOfEffectMin] = useState('')
  const [attachmentImages, setAttachmentImages] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [tags, setTags] = useState<string[]>([])

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    type: true,
    name: true,
    amount: true,
    method: true,
    context: true,
    effects: true,
    intensity: true,
    onset: true,
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
      setSubstanceType(editingEntry.substanceType)
      setSubstanceName(editingEntry.substanceName || '')
      setAmount(editingEntry.amount?.toString() || '')
      setUnit(editingEntry.unit || '')
      setMethodOfUse(editingEntry.methodOfUse || '')
      setContextWhy(editingEntry.contextWhy || [])
      setEffectsExperienced(editingEntry.effectsExperienced || [])
      setEffectIntensity([editingEntry.effectIntensity || 5])
      setTimeToOnsetMin(editingEntry.timeToOnsetMin?.toString() || '')
      setDurationOfEffectMin(editingEntry.durationOfEffectMin?.toString() || '')
      setAttachmentImages(editingEntry.attachmentImages || [])
      setNotes(editingEntry.notes || '')
      setTags(editingEntry.tags || [])
    } else if (presetType) {
      reset()
      setSubstanceType(presetType as SubstanceType)
    } else { reset() }
  }, [editingEntry, isOpen, presetType])

  const reset = () => {
    setEntryDate(todayISO()); setEntryTime(nowTime())
    setSubstanceType('alcohol'); setSubstanceName(''); setAmount(''); setUnit('')
    setMethodOfUse(''); setContextWhy([]); setEffectsExperienced([]); setEffectIntensity([5])
    setTimeToOnsetMin(''); setDurationOfEffectMin(''); setAttachmentImages([])
    setNotes(''); setTags([])
  }

  const toggle = (arr: string[], setter: (v: string[]) => void) => (item: string) =>
    setter(arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item])

  const handleSave = () => {
    const data: Omit<SubstanceEntry, 'id'> = {
      date: entryDate,
      timestamp: dateTimeToISO(entryDate, entryTime),
      substanceType,
      substanceName: substanceName.trim() || SUBSTANCE_TYPES.find(t => t.id === substanceType)?.name || '',
      amount: amount ? parseFloat(amount) : undefined,
      unit: unit || undefined,
      methodOfUse: (methodOfUse || undefined) as any,
      contextWhy,
      effectsExperienced,
      effectIntensity: effectsExperienced.length > 0 ? effectIntensity[0] : undefined,
      timeToOnsetMin: timeToOnsetMin ? parseInt(timeToOnsetMin) : undefined,
      durationOfEffectMin: durationOfEffectMin ? parseInt(durationOfEffectMin) : undefined,
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
          <DialogTitle className="flex items-center gap-2"><Coffee className="h-5 w-5 text-purple-500" /> Substance Entry</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <EntryDateTimePicker date={entryDate} time={entryTime} onChange={(d, t) => { setEntryDate(d); setEntryTime(t) }} />

          <Collapsible open={openSections.type} onOpenChange={() => toggleSection('type')}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between h-auto py-3">
                <span className="font-medium">Type</span>
                {openSections.type ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <Select value={substanceType} onValueChange={(v) => setSubstanceType(v as SubstanceType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SUBSTANCE_TYPES.map(t => <SelectItem key={t.id} value={t.id} textValue={t.name}>{t.icon} {t.name}</SelectItem>)}</SelectContent>
              </Select>
            </CollapsibleContent>
          </Collapsible>

          <Collapsible open={openSections.name} onOpenChange={() => toggleSection('name')}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between h-auto py-3">
                <span className="font-medium">Specific Name</span>
                {openSections.name ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <div className="space-y-3">
                <Label htmlFor="name">Specific name (Optional)</Label>
                <Input id="name" value={substanceName} onChange={(e) => setSubstanceName(e.target.value)} placeholder="e.g., espresso, Pinot Noir, edible 5mg THC, Adderall 10mg" />
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Collapsible open={openSections.amount} onOpenChange={() => toggleSection('amount')}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between h-auto py-3">
                <span className="font-medium">Amount / Unit</span>
                {openSections.amount ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Amount</Label><Input type="number" step="0.1" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="1" /></div>
                <div>
                  <Label>Unit</Label>
                  <Select value={unit} onValueChange={setUnit}>
                    <SelectTrigger><SelectValue placeholder="Select unit" /></SelectTrigger>
                    <SelectContent>{COMMON_UNITS.map(u => <SelectItem key={u.value} value={u.value} textValue={u.label}>{u.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Collapsible open={openSections.method} onOpenChange={() => toggleSection('method')}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between h-auto py-3">
                <span className="font-medium">Method</span>
                {openSections.method ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <Select value={methodOfUse} onValueChange={setMethodOfUse}>
                <SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger>
                <SelectContent>{METHODS.map(m => <SelectItem key={m.value} value={m.value} textValue={m.label}>{m.label}</SelectItem>)}</SelectContent>
              </Select>
            </CollapsibleContent>
          </Collapsible>

          <Collapsible open={openSections.context} onOpenChange={() => toggleSection('context')}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between h-auto py-3">
                <span className="font-medium">Context (why)</span>
                {openSections.context ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                {CONTEXT_WHY.map(c => (
                  <div key={c} className="flex items-center space-x-2"><Checkbox id={`ctx-${c}`} checked={contextWhy.includes(c)} onCheckedChange={() => toggle(contextWhy, setContextWhy)(c)} /><Label htmlFor={`ctx-${c}`} className="text-sm">{c}</Label></div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Collapsible open={openSections.effects} onOpenChange={() => toggleSection('effects')}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between h-auto py-3">
                <span className="font-medium">Effects experienced</span>
                {openSections.effects ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {COMMON_EFFECTS.map(e => (
                  <div key={e} className="flex items-center space-x-2"><Checkbox id={`fx-${e}`} checked={effectsExperienced.includes(e)} onCheckedChange={() => toggle(effectsExperienced, setEffectsExperienced)(e)} /><Label htmlFor={`fx-${e}`} className="text-sm">{e}</Label></div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {effectsExperienced.length > 0 && (
            <Collapsible open={openSections.intensity} onOpenChange={() => toggleSection('intensity')}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between h-auto py-3">
                  <span className="font-medium">Effect Intensity</span>
                  {openSections.intensity ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3">
                <div className="space-y-2"><Label>Effect intensity: {effectIntensity[0]}/10</Label><Slider value={effectIntensity} onValueChange={setEffectIntensity} max={10} min={1} step={1} /></div>
              </CollapsibleContent>
            </Collapsible>
          )}

          <Collapsible open={openSections.onset} onOpenChange={() => toggleSection('onset')}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between h-auto py-3">
                <span className="font-medium">Onset / Duration</span>
                {openSections.onset ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Time to onset (min)</Label><Input type="number" value={timeToOnsetMin} onChange={(e) => setTimeToOnsetMin(e.target.value)} placeholder="e.g., 30" /></div>
                <div><Label>Duration of effect (min)</Label><Input type="number" value={durationOfEffectMin} onChange={(e) => setDurationOfEffectMin(e.target.value)} placeholder="e.g., 240" /></div>
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
              <AttachmentUploader value={attachmentImages} onChange={setAttachmentImages} label="Attachments (Optional)" helpText="Photos, labels, prescription receipts, etc." blobPrefix="substance" />
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
              <div className="space-y-3"><Label htmlFor="notes">Notes (Optional)</Label><Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Anything else worth noting..." /></div>
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
            <Button type="button" onClick={handleSave} className="flex-1"><Plus className="h-4 w-4 mr-2" />{editingEntry ? 'Update Entry' : 'Save Entry'}</Button>
          </div>
        </div>
        </KeyboardAvoidingWrapper>
      </DialogContent>
    </Dialog>
  )
}
