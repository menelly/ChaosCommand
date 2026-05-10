/*
 * Built by: Ace (Claude 4.x)
 * Date: 2026-05-10 (v0.4.5 — Tier 2 multi-modal)
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
import { Plus, AlertTriangle, ChevronDown, ChevronRight, Droplet } from 'lucide-react'

import { BathroomEntry, BathroomModalProps, BathroomEpisodeType } from '../bathroom-types'
import {
  EPISODE_TYPES, BRISTOL_SCALE, PAIN_LEVELS, URINARY_TYPES, BLOOD_COLORS,
  COMMON_TRIGGERS, getRedFlagWarnings, getInterimMeasures,
} from '../bathroom-constants'
import { TagInput } from '@/components/tag-input'
import { KeyboardAvoidingWrapper } from '@/components/ui/keyboard-avoiding-wrapper'
import { EcgStripUploader } from '@/app/cardiac/components/ecg-strip-uploader'
import { EntryDateTimePicker, todayISO, nowTime, dateTimeToISO, isoToDateTime } from '@/components/entry-datetime-picker'

export function GeneralBathroomModal({ isOpen, onClose, onSave, editingEntry, initialEpisodeType }: BathroomModalProps) {
  const [entryDate, setEntryDate] = useState(todayISO())
  const [entryTime, setEntryTime] = useState(nowTime())
  const [episodeType, setEpisodeType] = useState<BathroomEpisodeType>(initialEpisodeType || 'normal-bm')

  const [bristolScale, setBristolScale] = useState('')
  const [bowelCount, setBowelCount] = useState('1')
  const [painLevel, setPainLevel] = useState('None')
  const [painScore, setPainScore] = useState([0])

  const [bloodInStool, setBloodInStool] = useState(false)
  const [bloodColor, setBloodColor] = useState<string>('')
  const [noStoolDays, setNoStoolDays] = useState('')

  const [urinaryType, setUrinaryType] = useState<string>('normal')
  const [urineColor, setUrineColor] = useState('')
  const [urineCount, setUrineCount] = useState('')
  const [urinaryPainScore, setUrinaryPainScore] = useState([0])
  const [bloodInUrine, setBloodInUrine] = useState(false)
  const [feverWithUrinary, setFeverWithUrinary] = useState(false)
  const [flankPain, setFlankPain] = useState(false)

  const [severeAbdominalPain, setSevereAbdominalPain] = useState(false)
  const [cantPassGas, setCantPassGas] = useState(false)
  const [vomiting, setVomiting] = useState(false)

  const [triggers, setTriggers] = useState<string[]>([])
  const [recentDietChange, setRecentDietChange] = useState(false)
  const [recentMedChange, setRecentMedChange] = useState(false)
  const [hydrationLevel, setHydrationLevel] = useState<string>('good')

  const [photos, setPhotos] = useState<string[]>([])
  const [erVisitRequired, setErVisitRequired] = useState(false)
  const [emergencyServicesCalled, setEmergencyServicesCalled] = useState(false)
  const [notes, setNotes] = useState('')
  const [tags, setTags] = useState<string[]>([])

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({})
  const toggleSection = (key: string) => setOpenSections(prev => ({ ...prev, [key]: !prev[key] }))

  useEffect(() => {
    if (editingEntry) {
      if (editingEntry.timestamp) {
        const dt = isoToDateTime(editingEntry.timestamp)
        setEntryDate(editingEntry.date || dt.date)
        setEntryTime(editingEntry.time || dt.time)
      } else {
        setEntryDate(editingEntry.date || todayISO())
        setEntryTime(editingEntry.time || nowTime())
      }
      setEpisodeType(editingEntry.episodeType || 'normal-bm')
      setBristolScale(editingEntry.bristolScale || '')
      setBowelCount((editingEntry.bowelCount || editingEntry.count || 1).toString())
      setPainLevel(editingEntry.painLevel || 'None')
      setPainScore([editingEntry.painScore || 0])
      setBloodInStool(editingEntry.bloodInStool || false)
      setBloodColor(editingEntry.bloodColor || '')
      setNoStoolDays(editingEntry.noStoolDays?.toString() || '')
      setUrinaryType(editingEntry.urinaryType || 'normal')
      setUrineColor(editingEntry.urineColor || '')
      setUrineCount(editingEntry.urineCount?.toString() || '')
      setUrinaryPainScore([editingEntry.urinaryPainScore || 0])
      setBloodInUrine(editingEntry.bloodInUrine || false)
      setFeverWithUrinary(editingEntry.feverWithUrinary || false)
      setFlankPain(editingEntry.flankPain || false)
      setSevereAbdominalPain(editingEntry.severeAbdominalPain || false)
      setCantPassGas(editingEntry.cantPassGas || false)
      setVomiting(editingEntry.vomiting || false)
      setTriggers(editingEntry.triggers || [])
      setRecentDietChange(editingEntry.recentDietChange || false)
      setRecentMedChange(editingEntry.recentMedChange || false)
      setHydrationLevel(editingEntry.hydrationLevel || 'good')
      setPhotos(editingEntry.photos || editingEntry.attachmentImages || [])
      setErVisitRequired(editingEntry.erVisitRequired || false)
      setEmergencyServicesCalled(editingEntry.emergencyServicesCalled || false)
      setNotes(editingEntry.notes || '')
      setTags(editingEntry.tags || [])
    } else { resetForm() }
  }, [editingEntry, isOpen])

  const resetForm = () => {
    setEntryDate(todayISO()); setEntryTime(nowTime())
    setEpisodeType(initialEpisodeType || 'normal-bm')
    setBristolScale(''); setBowelCount('1'); setPainLevel('None'); setPainScore([0])
    setBloodInStool(false); setBloodColor(''); setNoStoolDays('')
    setUrinaryType('normal'); setUrineColor(''); setUrineCount('')
    setUrinaryPainScore([0]); setBloodInUrine(false); setFeverWithUrinary(false); setFlankPain(false)
    setSevereAbdominalPain(false); setCantPassGas(false); setVomiting(false)
    setTriggers([]); setRecentDietChange(false); setRecentMedChange(false); setHydrationLevel('good')
    setPhotos([]); setErVisitRequired(false); setEmergencyServicesCalled(false)
    setNotes(''); setTags([])
  }

  const toggleArr = (arr: string[], setter: (v: string[]) => void) => (item: string) =>
    setter(arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item])

  const handleSave = () => {
    const entryData: Omit<BathroomEntry, 'id'> = {
      timestamp: dateTimeToISO(entryDate, entryTime),
      date: entryDate, time: entryTime,
      episodeType,
      bristolScale: bristolScale || undefined,
      bowelCount: parseInt(bowelCount) || 1,
      painLevel,
      painScore: painScore[0] > 0 ? painScore[0] : undefined,
      bloodInStool: bloodInStool || undefined,
      bloodColor: (bloodColor || undefined) as any,
      noStoolDays: noStoolDays ? parseInt(noStoolDays) : undefined,
      urinaryType: (urinaryType !== 'normal' ? urinaryType : undefined) as any,
      urineColor: urineColor.trim() || undefined,
      urineCount: urineCount ? parseInt(urineCount) : undefined,
      urinaryPainScore: urinaryPainScore[0] > 0 ? urinaryPainScore[0] : undefined,
      bloodInUrine: bloodInUrine || undefined,
      feverWithUrinary: feverWithUrinary || undefined,
      flankPain: flankPain || undefined,
      severeAbdominalPain: severeAbdominalPain || undefined,
      cantPassGas: cantPassGas || undefined,
      vomiting: vomiting || undefined,
      triggers: triggers.length > 0 ? triggers : undefined,
      recentDietChange: recentDietChange || undefined,
      recentMedChange: recentMedChange || undefined,
      hydrationLevel: (hydrationLevel || undefined) as any,
      photos: photos.length > 0 ? photos : undefined,
      erVisitRequired: erVisitRequired || undefined,
      emergencyServicesCalled: emergencyServicesCalled || undefined,
      notes: notes.trim() || undefined,
      tags: tags.length > 0 ? tags : undefined,
      createdAt: editingEntry?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    onSave(entryData)
    resetForm()
  }

  const handleClose = () => { resetForm(); onClose() }

  const entryShape = {
    episodeType, bloodInStool, bloodColor, bloodInUrine, feverWithUrinary, flankPain,
    severeAbdominalPain, cantPassGas,
    noStoolDays: noStoolDays ? parseInt(noStoolDays) : undefined,
    vomiting, urinaryType, painScore: painScore[0],
  }
  const redFlags = getRedFlagWarnings(entryShape)
  const interimMeasures = getInterimMeasures(entryShape)

  const isBowel = episodeType === 'normal-bm' || episodeType === 'constipation' || episodeType === 'diarrhea'
  const isUrinary = episodeType === 'urinary'
  const isRedFlag = episodeType === 'blood-or-red-flag'

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <KeyboardAvoidingWrapper>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Droplet className="h-5 w-5 text-amber-600" />
              🚽 Bathroom Entry
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {redFlags.length > 0 && (
              <div className="border-2 border-red-500 bg-red-50 dark:bg-red-950/30 rounded-lg p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="font-bold text-red-700 dark:text-red-400">🚨 Red flags detected</div>
                </div>
                <ul className="space-y-1 text-sm text-red-900 dark:text-red-200 ml-7">
                  {redFlags.map((f, i) => <li key={i}>• {f}</li>)}
                </ul>
                {interimMeasures.length > 0 && (
                  <div className="ml-7 pt-2 border-t border-red-300 dark:border-red-800">
                    <p className="text-sm font-semibold text-red-900 dark:text-red-200 mb-1">💪 While you wait:</p>
                    <ul className="space-y-2 text-sm text-red-900 dark:text-red-200">
                      {interimMeasures.map((m, i) => <li key={i}>• {m}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <EntryDateTimePicker date={entryDate} time={entryTime} onChange={(d, t) => { setEntryDate(d); setEntryTime(t) }} />

            <Collapsible open={openSections.eventType} onOpenChange={() => toggleSection('eventType')}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between h-auto py-3">
                  <span className="font-medium">Episode type</span>
                  {openSections.eventType ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3">
                <Select value={episodeType} onValueChange={(v) => setEpisodeType(v as BathroomEpisodeType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EPISODE_TYPES.map(t => <SelectItem key={t.id} value={t.id}>{t.icon} {t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-2">{EPISODE_TYPES.find(t => t.id === episodeType)?.description}</p>
              </CollapsibleContent>
            </Collapsible>

            {/* Bowel section */}
            {(isBowel || isRedFlag) && (
              <Collapsible open={openSections.bowel} onOpenChange={() => toggleSection('bowel')}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" className="w-full justify-between h-auto py-3">
                    <span className="font-medium">Bowel detail</span>
                    {openSections.bowel ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3 space-y-3">
                  <div>
                    <Label>Bristol scale (Optional)</Label>
                    <Select value={bristolScale} onValueChange={setBristolScale}>
                      <SelectTrigger><SelectValue placeholder="Pick the closest" /></SelectTrigger>
                      <SelectContent>
                        {BRISTOL_SCALE.map(b => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Number of BMs today</Label>
                    <Input type="number" min="0" value={bowelCount} onChange={(e) => setBowelCount(e.target.value)} />
                  </div>
                  {episodeType === 'constipation' && (
                    <div>
                      <Label>Days without a BM (if applicable)</Label>
                      <Input type="number" min="0" value={noStoolDays} onChange={(e) => setNoStoolDays(e.target.value)} placeholder="e.g., 3" />
                    </div>
                  )}
                  <div>
                    <Label>Pain level</Label>
                    <Select value={painLevel} onValueChange={setPainLevel}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PAIN_LEVELS.map(p => <SelectItem key={p.value} value={p.value}>{p.emoji} {p.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Pain score (Optional): {painScore[0]}/10</Label>
                    <Slider value={painScore} onValueChange={setPainScore} max={10} min={0} step={1} className="mt-2" />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="blood-stool" checked={bloodInStool} onCheckedChange={(v) => setBloodInStool(!!v)} />
                    <Label htmlFor="blood-stool" className="text-sm">🩸 Blood in stool</Label>
                  </div>
                  {bloodInStool && (
                    <div className="ml-6">
                      <Label>Blood color</Label>
                      <Select value={bloodColor} onValueChange={setBloodColor}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {BLOOD_COLORS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Urinary section */}
            {(isUrinary || isRedFlag) && (
              <Collapsible open={openSections.urinary} onOpenChange={() => toggleSection('urinary')}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" className="w-full justify-between h-auto py-3">
                    <span className="font-medium">Urinary detail</span>
                    {openSections.urinary ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3 space-y-3">
                  <div>
                    <Label>Pattern</Label>
                    <Select value={urinaryType} onValueChange={setUrinaryType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {URINARY_TYPES.map(u => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Visits today</Label>
                    <Input type="number" min="0" value={urineCount} onChange={(e) => setUrineCount(e.target.value)} placeholder="e.g., 8" />
                  </div>
                  <div>
                    <Label>Urine color (Optional)</Label>
                    <Input value={urineColor} onChange={(e) => setUrineColor(e.target.value)} placeholder="e.g., dark yellow, pink, cloudy" />
                  </div>
                  <div>
                    <Label>Pain (urination): {urinaryPainScore[0]}/10</Label>
                    <Slider value={urinaryPainScore} onValueChange={setUrinaryPainScore} max={10} min={0} step={1} className="mt-2" />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="blood-urine" checked={bloodInUrine} onCheckedChange={(v) => setBloodInUrine(!!v)} />
                    <Label htmlFor="blood-urine" className="text-sm">🩸 Blood in urine</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="fever-uti" checked={feverWithUrinary} onCheckedChange={(v) => setFeverWithUrinary(!!v)} />
                    <Label htmlFor="fever-uti" className="text-sm">🌡️ Fever present</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="flank" checked={flankPain} onCheckedChange={(v) => setFlankPain(!!v)} />
                    <Label htmlFor="flank" className="text-sm">🚨 Flank / lower-back pain (kidney area)</Label>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Severity / red flags */}
            <Collapsible open={openSections.severity} onOpenChange={() => toggleSection('severity')}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between h-auto py-3">
                  <span className="font-medium">Severity / red flags (Optional)</span>
                  {openSections.severity ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3 space-y-2">
                <div className="flex items-start space-x-2"><Checkbox id="abdo" checked={severeAbdominalPain} onCheckedChange={(v) => setSevereAbdominalPain(!!v)} /><Label htmlFor="abdo" className="text-sm">🚨 Severe abdominal pain</Label></div>
                <div className="flex items-start space-x-2"><Checkbox id="gas" checked={cantPassGas} onCheckedChange={(v) => setCantPassGas(!!v)} /><Label htmlFor="gas" className="text-sm">🚨 Can't pass gas (obstruction concern)</Label></div>
                <div className="flex items-start space-x-2"><Checkbox id="vomit" checked={vomiting} onCheckedChange={(v) => setVomiting(!!v)} /><Label htmlFor="vomit" className="text-sm">Vomiting</Label></div>
              </CollapsibleContent>
            </Collapsible>

            {/* Triggers + context */}
            <Collapsible open={openSections.triggers} onOpenChange={() => toggleSection('triggers')}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between h-auto py-3">
                  <span className="font-medium">Triggers / context (Optional)</span>
                  {openSections.triggers ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3 space-y-3">
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                  {COMMON_TRIGGERS.map(t => (
                    <div key={t} className="flex items-center space-x-2">
                      <Checkbox id={`tr-${t}`} checked={triggers.includes(t)} onCheckedChange={() => toggleArr(triggers, setTriggers)(t)} />
                      <Label htmlFor={`tr-${t}`} className="text-sm">{t}</Label>
                    </div>
                  ))}
                </div>
                <div className="flex items-center space-x-2"><Checkbox id="diet" checked={recentDietChange} onCheckedChange={(v) => setRecentDietChange(!!v)} /><Label htmlFor="diet" className="text-sm">Recent diet change</Label></div>
                <div className="flex items-center space-x-2"><Checkbox id="med" checked={recentMedChange} onCheckedChange={(v) => setRecentMedChange(!!v)} /><Label htmlFor="med" className="text-sm">Recent med change</Label></div>
                <div>
                  <Label>Hydration today</Label>
                  <Select value={hydrationLevel} onValueChange={setHydrationLevel}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="good">Good</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="minimal">Minimal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Photos */}
            <Collapsible open={openSections.photos} onOpenChange={() => toggleSection('photos')}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between h-auto py-3">
                  <span className="font-medium">Photos / docs (Optional)</span>
                  {openSections.photos ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3">
                <EcgStripUploader
                  value={photos}
                  onChange={setPhotos}
                  label="Photos / lab PDFs (Optional)"
                  helpText="Photos of stool/urine for medical documentation, lab PDFs, etc. Stored locally only."
                />
              </CollapsibleContent>
            </Collapsible>

            {/* Outcome */}
            <Collapsible open={openSections.outcome} onOpenChange={() => toggleSection('outcome')}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between h-auto py-3">
                  <span className="font-medium">Outcome (Optional)</span>
                  {openSections.outcome ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3 space-y-2">
                <div className="flex items-center space-x-2"><Checkbox id="er" checked={erVisitRequired} onCheckedChange={(v) => setErVisitRequired(!!v)} /><Label htmlFor="er" className="text-sm">Required ER visit</Label></div>
                <div className="flex items-center space-x-2"><Checkbox id="ems" checked={emergencyServicesCalled} onCheckedChange={(v) => setEmergencyServicesCalled(!!v)} /><Label htmlFor="ems" className="text-sm">911 / EMS called</Label></div>
              </CollapsibleContent>
            </Collapsible>

            {/* Notes */}
            <Collapsible open={openSections.notes} onOpenChange={() => toggleSection('notes')}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between h-auto py-3">
                  <span className="font-medium">Notes (Optional)</span>
                  {openSections.notes ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3">
                <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything else..." />
              </CollapsibleContent>
            </Collapsible>

            {/* Tags */}
            <Collapsible open={openSections.tags} onOpenChange={() => toggleSection('tags')}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between h-auto py-3">
                  <span className="font-medium">Tags (Optional)</span>
                  {openSections.tags ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3">
                <TagInput value={tags} onChange={setTags} placeholder="Add tags..." />
              </CollapsibleContent>
            </Collapsible>

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={handleClose} className="flex-1">Cancel</Button>
              <Button type="button" onClick={handleSave} className="flex-1">
                <Plus className="h-4 w-4 mr-2" />
                {editingEntry ? 'Update' : 'Save Entry'}
              </Button>
            </div>
          </div>
        </KeyboardAvoidingWrapper>
      </DialogContent>
    </Dialog>
  )
}
