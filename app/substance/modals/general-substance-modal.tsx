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
import { Coffee, Plus } from 'lucide-react'

import { SubstanceEntry, SubstanceType, SubstanceModalProps } from '../substance-types'
import { SUBSTANCE_TYPES, COMMON_UNITS, METHODS, CONTEXT_WHY, COMMON_EFFECTS } from '../substance-constants'
import { TagInput } from '@/components/tag-input'
import { KeyboardAvoidingWrapper } from '@/components/ui/keyboard-avoiding-wrapper'
import { AttachmentUploader } from '../components/attachment-uploader'

export function GeneralSubstanceModal({ isOpen, onClose, onSave, editingEntry, presetType }: SubstanceModalProps) {
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

  useEffect(() => {
    if (editingEntry) {
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
    setSubstanceType('alcohol'); setSubstanceName(''); setAmount(''); setUnit('')
    setMethodOfUse(''); setContextWhy([]); setEffectsExperienced([]); setEffectIntensity([5])
    setTimeToOnsetMin(''); setDurationOfEffectMin(''); setAttachmentImages([])
    setNotes(''); setTags([])
  }

  const toggle = (arr: string[], setter: (v: string[]) => void) => (item: string) =>
    setter(arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item])

  const handleSave = () => {
    const data: Omit<SubstanceEntry, 'id' | 'timestamp' | 'date'> = {
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
          <div className="space-y-3">
            <Label>Type</Label>
            <Select value={substanceType} onValueChange={(v) => setSubstanceType(v as SubstanceType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{SUBSTANCE_TYPES.map(t => <SelectItem key={t.id} value={t.id} textValue={t.name}>{t.icon} {t.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label htmlFor="name">Specific name (Optional)</Label>
            <Input id="name" value={substanceName} onChange={(e) => setSubstanceName(e.target.value)} placeholder="e.g., espresso, Pinot Noir, edible 5mg THC, Adderall 10mg" />
          </div>

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

          <div className="space-y-3">
            <Label>Method</Label>
            <Select value={methodOfUse} onValueChange={setMethodOfUse}>
              <SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger>
              <SelectContent>{METHODS.map(m => <SelectItem key={m.value} value={m.value} textValue={m.label}>{m.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label>Context (why)</Label>
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
              {CONTEXT_WHY.map(c => (
                <div key={c} className="flex items-center space-x-2"><Checkbox id={`ctx-${c}`} checked={contextWhy.includes(c)} onCheckedChange={() => toggle(contextWhy, setContextWhy)(c)} /><Label htmlFor={`ctx-${c}`} className="text-sm">{c}</Label></div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label>Effects experienced (Optional)</Label>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
              {COMMON_EFFECTS.map(e => (
                <div key={e} className="flex items-center space-x-2"><Checkbox id={`fx-${e}`} checked={effectsExperienced.includes(e)} onCheckedChange={() => toggle(effectsExperienced, setEffectsExperienced)(e)} /><Label htmlFor={`fx-${e}`} className="text-sm">{e}</Label></div>
              ))}
            </div>
          </div>

          {effectsExperienced.length > 0 && (
            <div className="space-y-2"><Label>Effect intensity: {effectIntensity[0]}/10</Label><Slider value={effectIntensity} onValueChange={setEffectIntensity} max={10} min={1} step={1} /></div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div><Label>Time to onset (min)</Label><Input type="number" value={timeToOnsetMin} onChange={(e) => setTimeToOnsetMin(e.target.value)} placeholder="e.g., 30" /></div>
            <div><Label>Duration of effect (min)</Label><Input type="number" value={durationOfEffectMin} onChange={(e) => setDurationOfEffectMin(e.target.value)} placeholder="e.g., 240" /></div>
          </div>

          <AttachmentUploader value={attachmentImages} onChange={setAttachmentImages} label="Attachments (Optional)" helpText="Photos, labels, prescription receipts, etc." blobPrefix="substance" />

          <div className="space-y-3"><Label htmlFor="notes">Notes (Optional)</Label><Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Anything else worth noting..." /></div>

          <div className="space-y-3"><Label>Tags (Optional)</Label><TagInput value={tags} onChange={setTags} placeholder="Tags..." /></div>

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
