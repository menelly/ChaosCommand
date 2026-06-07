/* Built by: Ace (Claude 4.x) — 2026-06-07 */

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
import { Brain, Plus, ChevronDown, ChevronRight } from 'lucide-react'

import { NeuroEntry, NeuroEpisodeType, NeuroModalProps } from '../neuro-types'
import { EPISODE_TYPES, DISTRIBUTION, CHARACTER_OPTIONS, SUSPECTED_TRIGGERS, TREATMENTS, getSeverityLabel, getSeverityColor } from '../neuro-constants'
import { TagInput } from '@/components/tag-input'
import { KeyboardAvoidingWrapper } from '@/components/ui/keyboard-avoiding-wrapper'
import { EntryDateTimePicker, todayISO, nowTime, dateTimeToISO, isoToDateTime } from '@/components/entry-datetime-picker'

// Symptoms that also belong in the MSK (joint) tracker — these show the
// "⇄ also log under MSK" checkbox. Mirror of joint's neuro-facing set.
const DUAL_LISTED: NeuroEpisodeType[] = ['weakness', 'cramping', 'fasciculations']

export function GeneralNeuroModal({ isOpen, onClose, onSave, editingEntry, presetType }: NeuroModalProps) {
  const [entryDate, setEntryDate] = useState(todayISO())
  const [entryTime, setEntryTime] = useState(nowTime())
  const [episodeType, setEpisodeType] = useState<NeuroEpisodeType>('weakness')
  const [distribution, setDistribution] = useState<string[]>([])
  const [severity, setSeverity] = useState([5])
  const [character, setCharacter] = useState<string[]>([])
  const [triggers, setTriggers] = useState<string[]>([])
  const [treatments, setTreatments] = useState<string[]>([])
  const [duration, setDuration] = useState('')
  const [erVisitRequired, setErVisitRequired] = useState(false)
  const [crossList, setCrossList] = useState(false)
  const [notes, setNotes] = useState('')
  const [tags, setTags] = useState<string[]>([])

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    eventType: false,
    distribution: false,
    severity: false,
    character: false,
    triggers: false,
    treatments: false,
    duration: false,
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
      setDistribution(editingEntry.distribution || [])
      setSeverity([editingEntry.severity || 5])
      setCharacter(editingEntry.character || [])
      setTriggers(editingEntry.triggers || [])
      setTreatments(editingEntry.treatments || [])
      setDuration(editingEntry.duration || '')
      setErVisitRequired(editingEntry.erVisitRequired || false)
      setCrossList(!!editingEntry.crossListedIn?.length)
      setNotes(editingEntry.notes || '')
      setTags(editingEntry.tags || [])
    } else if (presetType) {
      reset()
      setEpisodeType(presetType as NeuroEpisodeType)
    } else { reset() }
  }, [editingEntry, isOpen, presetType])

  const reset = () => {
    setEntryDate(todayISO()); setEntryTime(nowTime())
    setEpisodeType('weakness'); setDistribution([]); setSeverity([5]); setCharacter([])
    setTriggers([]); setTreatments([]); setDuration(''); setErVisitRequired(false)
    setCrossList(false); setNotes(''); setTags([])
  }

  const toggle = (arr: string[], setter: (v: string[]) => void) => (item: string) =>
    setter(arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item])

  const showCrossList = DUAL_LISTED.includes(episodeType)

  const handleSave = () => {
    const data: Omit<NeuroEntry, 'id'> = {
      date: entryDate,
      timestamp: dateTimeToISO(entryDate, entryTime),
      episodeType,
      distribution,
      severity: severity[0],
      character,
      triggers,
      treatments,
      duration: duration || undefined,
      erVisitRequired,
      // Intent signal — keyed to the checkbox (which loads from the entry itself),
      // NOT re-derived from the type, so editing never silently drops the link.
      crossListedIn: crossList ? ['neuro', 'joint'] : undefined,
      notes: notes.trim() || undefined,
      tags: tags.length > 0 ? tags : undefined,
    }
    onSave(data); reset()
  }

  const handleClose = () => { reset(); onClose() }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <KeyboardAvoidingWrapper>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Brain className="h-5 w-5 text-violet-500" /> 🧠 Neuro / Neuromuscular Event</DialogTitle>
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
              <Select value={episodeType} onValueChange={(v) => { const t = v as NeuroEpisodeType; setEpisodeType(t); if (!DUAL_LISTED.includes(t)) setCrossList(false) }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{EPISODE_TYPES.map(t => <SelectItem key={t.id} value={t.id} textValue={t.name}>{t.icon} {t.name}</SelectItem>)}</SelectContent>
              </Select>
            </CollapsibleContent>
          </Collapsible>

          {/* ⇄ Cross-list — only for the dual-listed neuromuscular symptoms */}
          {showCrossList && (
            <div className="flex items-start space-x-2 rounded-lg border-2 border-primary/40 bg-primary/10 p-3">
              <Checkbox id="crosslist" checked={crossList} onCheckedChange={(v) => setCrossList(!!v)} className="mt-0.5" />
              <Label htmlFor="crosslist" className="text-sm leading-snug">
                ⇄ Also log under <strong>MSK / Joints &amp; Muscles</strong>
                <span className="block text-xs text-muted-foreground mt-0.5">One event, surfaced in both the Neuro and MSK views — so your neurologist and rheumatologist each see it. Editing or deleting it in either place updates both.</span>
              </Label>
            </div>
          )}

          <Collapsible open={openSections.distribution} onOpenChange={() => toggleSection('distribution')}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between h-auto py-3">
                <span className="font-medium">Distribution / Where (check all that apply)</span>
                {openSections.distribution ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-60 overflow-y-auto">
                {DISTRIBUTION.map(d => (
                  <div key={d} className="flex items-center space-x-2"><Checkbox id={`dist-${d}`} checked={distribution.includes(d)} onCheckedChange={() => toggle(distribution, setDistribution)(d)} /><Label htmlFor={`dist-${d}`} className="text-sm">{d}</Label></div>
                ))}
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

          <Collapsible open={openSections.character} onOpenChange={() => toggleSection('character')}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between h-auto py-3">
                <span className="font-medium">Character / Pattern (check all that apply)</span>
                {openSections.character ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {CHARACTER_OPTIONS.map(c => (
                  <div key={c} className="flex items-center space-x-2"><Checkbox id={`char-${c}`} checked={character.includes(c)} onCheckedChange={() => toggle(character, setCharacter)(c)} /><Label htmlFor={`char-${c}`} className="text-sm">{c}</Label></div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Collapsible open={openSections.triggers} onOpenChange={() => toggleSection('triggers')}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between h-auto py-3">
                <span className="font-medium">Suspected Triggers</span>
                {openSections.triggers ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                {SUSPECTED_TRIGGERS.map(t => (
                  <div key={t} className="flex items-center space-x-2"><Checkbox id={`tr-${t}`} checked={triggers.includes(t)} onCheckedChange={() => toggle(triggers, setTriggers)(t)} /><Label htmlFor={`tr-${t}`} className="text-sm">{t}</Label></div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Collapsible open={openSections.treatments} onOpenChange={() => toggleSection('treatments')}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between h-auto py-3">
                <span className="font-medium">Treatments / What Helped</span>
                {openSections.treatments ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                {TREATMENTS.map(t => (
                  <div key={t} className="flex items-center space-x-2"><Checkbox id={`tx-${t}`} checked={treatments.includes(t)} onCheckedChange={() => toggle(treatments, setTreatments)(t)} /><Label htmlFor={`tx-${t}`} className="text-sm">{t}</Label></div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Collapsible open={openSections.duration} onOpenChange={() => toggleSection('duration')}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between h-auto py-3">
                <span className="font-medium">Duration / ER</span>
                {openSections.duration ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Duration</Label><Input value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="e.g., 20 min, 3 days, ongoing" /></div>
                <div className="flex items-end pb-2"><div className="flex items-center space-x-2"><Checkbox id="er" checked={erVisitRequired} onCheckedChange={(v) => setErVisitRequired(!!v)} /><Label htmlFor="er">ER / EMS required</Label></div></div>
              </div>
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
            <Button type="button" onClick={handleSave} className="flex-1" disabled={distribution.length === 0}><Plus className="h-4 w-4 mr-2" />{editingEntry ? 'Update Event' : 'Save Neuro Event'}</Button>
          </div>
        </div>
        </KeyboardAvoidingWrapper>
      </DialogContent>
    </Dialog>
  )
}
