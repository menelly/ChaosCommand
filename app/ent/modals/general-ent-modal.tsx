/*
 * Built by: Ace (Claude 4.x)
 * Date: 2026-06-04
 *
 * ENT entry modal. Contextual fields by episode type, with real-time
 * red-flag banners for the safety-critical patterns (sudden SNHL, airway,
 * mastoiditis, pulsatile tinnitus, chronic hoarseness, stubborn nosebleed).
 *
 * Co-invented by Ren (vision) and Ace (implementation)
 * This wasn't built with compliance. It was built with defiance.
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
import { AlertTriangle, Ear } from 'lucide-react'

import type { ENTEntry, ENTEpisodeType, EarSymptom, EarSide, SinusSymptom, ThroatSymptom, VertigoType, DrainageCharacter } from '../ent-types'
import type { ENTModalProps } from '../ent-types'
import {
  EPISODE_TYPES,
  EAR_SYMPTOMS,
  SINUS_SYMPTOMS,
  THROAT_SYMPTOMS,
  VERTIGO_TYPES,
  SEVERITY_LABELS,
  SUDDEN_HEARING_LOSS_WARNING,
  HEARING_VERTIGO_TINNITUS_WARNING,
  PULSATILE_TINNITUS_WARNING,
  HOARSENESS_WARNING,
  AIRWAY_WARNING,
  MASTOIDITIS_WARNING,
  NOSEBLEED_WARNING,
  SINUS_BACTERIAL_NOTE,
} from '../ent-constants'
import { EntryDateTimePicker, todayISO, nowTime, dateTimeToISO, isoToDateTime } from '@/components/entry-datetime-picker'
import { TagInput } from '@/components/tag-input'

export function GeneralENTModal({ isOpen, onClose, onSave, editingEntry }: ENTModalProps) {
  const [entryDate, setEntryDate] = useState(todayISO())
  const [entryTime, setEntryTime] = useState(nowTime())
  const [episodeType, setEpisodeType] = useState<ENTEpisodeType>('ear')
  const [severity, setSeverity] = useState(5)

  // Ear
  const [earSide, setEarSide] = useState<EarSide | ''>('')
  const [earSymptoms, setEarSymptoms] = useState<EarSymptom[]>([])
  const [drainageCharacter, setDrainageCharacter] = useState<DrainageCharacter | ''>('')

  // Hearing
  const [hearingChanged, setHearingChanged] = useState(false)
  const [hearingSudden, setHearingSudden] = useState(false)
  const [hearingWithVertigo, setHearingWithVertigo] = useState(false)

  // Tinnitus
  const [tinnitusPresent, setTinnitusPresent] = useState(false)
  const [tinnitusPulsatile, setTinnitusPulsatile] = useState(false)

  // Vertigo
  const [vertigoType, setVertigoType] = useState<VertigoType | ''>('')
  const [vertigoWithHeadMovement, setVertigoWithHeadMovement] = useState(false)

  // Sinus
  const [sinusSymptoms, setSinusSymptoms] = useState<SinusSymptom[]>([])
  const [sinusDaysOngoing, setSinusDaysOngoing] = useState('')
  const [feverPresent, setFeverPresent] = useState(false)

  // Throat
  const [throatSymptoms, setThroatSymptoms] = useState<ThroatSymptom[]>([])
  const [hoarsenessDays, setHoarsenessDays] = useState('')

  // Nosebleed
  const [nosebleedDurationMin, setNosebleedDurationMin] = useState('')

  // Airway / mastoiditis escalation flags
  const [difficultyBreathing, setDifficultyBreathing] = useState(false)
  const [drooling, setDrooling] = useState(false)
  const [behindEarSwelling, setBehindEarSwelling] = useState(false)

  // Context
  const [recentURI, setRecentURI] = useState(false)
  const [recentSwimming, setRecentSwimming] = useState(false)
  const [recentAirTravel, setRecentAirTravel] = useState(false)
  const [erVisit, setErVisit] = useState(false)
  const [entNotified, setEntNotified] = useState(false)

  const [notes, setNotes] = useState('')
  const [tags, setTags] = useState<string[]>([])

  // ── RED FLAG DETECTION ──
  const suddenHearingLoss = hearingChanged && hearingSudden
  const innerEarCluster = hearingChanged && (hearingWithVertigo || tinnitusPresent) && !hearingSudden
  const pulsatileFlag = tinnitusPresent && tinnitusPulsatile
  const hoarsenessFlag = throatSymptoms.includes('hoarseness') && (parseInt(hoarsenessDays) || 0) >= 21
  const airwayFlag = difficultyBreathing || drooling
  const mastoiditisFlag = episodeType === 'ear' && feverPresent && behindEarSwelling
  const nosebleedFlag = episodeType === 'nosebleed' && (parseInt(nosebleedDurationMin) || 0) > 20
  const sinusBacterial = episodeType === 'sinus' && (parseInt(sinusDaysOngoing) || 0) > 10

  useEffect(() => {
    if (!isOpen) return
    if (editingEntry) {
      const { date, time } = isoToDateTime(editingEntry.timestamp)
      setEntryDate(date); setEntryTime(time)
      setEpisodeType(editingEntry.episodeType)
      setSeverity(editingEntry.severity)
      setEarSide(editingEntry.earSide ?? '')
      setEarSymptoms(editingEntry.earSymptoms ?? [])
      setDrainageCharacter(editingEntry.drainageCharacter ?? '')
      setHearingChanged(editingEntry.hearingChanged ?? false)
      setHearingSudden(editingEntry.hearingSudden ?? false)
      setHearingWithVertigo(editingEntry.hearingWithVertigo ?? false)
      setTinnitusPresent(editingEntry.tinnitusPresent ?? false)
      setTinnitusPulsatile(editingEntry.tinnitusPulsatile ?? false)
      setVertigoType(editingEntry.vertigoType ?? '')
      setVertigoWithHeadMovement(editingEntry.vertigoWithHeadMovement ?? false)
      setSinusSymptoms(editingEntry.sinusSymptoms ?? [])
      setSinusDaysOngoing(editingEntry.sinusDaysOngoing?.toString() ?? '')
      setFeverPresent(editingEntry.feverPresent ?? false)
      setThroatSymptoms(editingEntry.throatSymptoms ?? [])
      setHoarsenessDays(editingEntry.hoarsenessDays?.toString() ?? '')
      setNosebleedDurationMin(editingEntry.nosebleedDurationMin?.toString() ?? '')
      setDifficultyBreathing(editingEntry.difficultyBreathing ?? false)
      setDrooling(editingEntry.drooling ?? false)
      setBehindEarSwelling(editingEntry.neckStiffness ?? false)
      setRecentURI(editingEntry.recentURI ?? false)
      setRecentSwimming(editingEntry.recentSwimming ?? false)
      setRecentAirTravel(editingEntry.recentAirTravel ?? false)
      setErVisit(editingEntry.erVisit ?? false)
      setEntNotified(editingEntry.entNotified ?? false)
      setNotes(editingEntry.notes ?? '')
      setTags(editingEntry.tags ?? [])
    } else {
      setEntryDate(todayISO()); setEntryTime(nowTime())
      setEpisodeType('ear'); setSeverity(5)
      setEarSide(''); setEarSymptoms([]); setDrainageCharacter('')
      setHearingChanged(false); setHearingSudden(false); setHearingWithVertigo(false)
      setTinnitusPresent(false); setTinnitusPulsatile(false)
      setVertigoType(''); setVertigoWithHeadMovement(false)
      setSinusSymptoms([]); setSinusDaysOngoing(''); setFeverPresent(false)
      setThroatSymptoms([]); setHoarsenessDays('')
      setNosebleedDurationMin('')
      setDifficultyBreathing(false); setDrooling(false); setBehindEarSwelling(false)
      setRecentURI(false); setRecentSwimming(false); setRecentAirTravel(false)
      setErVisit(false); setEntNotified(false)
      setNotes(''); setTags([])
    }
  }, [isOpen, editingEntry])

  const toggle = <T,>(arr: T[], v: T, set: (a: T[]) => void) =>
    set(arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v])

  const handleSave = () => {
    const entry: Omit<ENTEntry, 'id'> = {
      timestamp: dateTimeToISO(entryDate, entryTime),
      date: entryDate,
      episodeType,
      severity,
      earSide: (earSide || undefined) as ENTEntry['earSide'],
      earSymptoms: earSymptoms.length ? earSymptoms : undefined,
      drainageCharacter: (drainageCharacter || undefined) as ENTEntry['drainageCharacter'],
      hearingChanged: hearingChanged || undefined,
      hearingSudden: hearingSudden || undefined,
      hearingWithVertigo: hearingWithVertigo || undefined,
      tinnitusPresent: tinnitusPresent || undefined,
      tinnitusPulsatile: tinnitusPulsatile || undefined,
      vertigoType: (vertigoType || undefined) as ENTEntry['vertigoType'],
      vertigoWithHeadMovement: vertigoWithHeadMovement || undefined,
      sinusSymptoms: sinusSymptoms.length ? sinusSymptoms : undefined,
      sinusDaysOngoing: sinusDaysOngoing ? parseInt(sinusDaysOngoing) : undefined,
      feverPresent: feverPresent || undefined,
      throatSymptoms: throatSymptoms.length ? throatSymptoms : undefined,
      hoarsenessDays: hoarsenessDays ? parseInt(hoarsenessDays) : undefined,
      nosebleedDurationMin: nosebleedDurationMin ? parseInt(nosebleedDurationMin) : undefined,
      difficultyBreathing: difficultyBreathing || undefined,
      drooling: drooling || undefined,
      neckStiffness: behindEarSwelling || undefined,
      recentURI: recentURI || undefined,
      recentSwimming: recentSwimming || undefined,
      recentAirTravel: recentAirTravel || undefined,
      erVisit: erVisit || undefined,
      entNotified: entNotified || undefined,
      notes: notes.trim() || undefined,
      tags,
    }
    onSave(entry)
    onClose()
  }

  const severityLabel = SEVERITY_LABELS.find(s => s.level === severity)

  const RedFlag = ({ text }: { text: string }) => (
    <div className="flex gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
      <div className="whitespace-pre-line">{text}</div>
    </div>
  )
  const CautionNote = ({ text }: { text: string }) => (
    <div className="flex gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20 text-warning text-sm">
      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
      <div className="whitespace-pre-line">{text}</div>
    </div>
  )

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ear className="h-5 w-5 text-primary" />
            Log ENT Event
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <EntryDateTimePicker date={entryDate} time={entryTime} onChange={(d, t) => { setEntryDate(d); setEntryTime(t) }} />

          {/* Episode type */}
          <div className="space-y-2">
            <Label>What type of event?</Label>
            <div className="grid grid-cols-2 gap-2">
              {EPISODE_TYPES.map(type => (
                <button key={type.id} type="button" onClick={() => setEpisodeType(type.id)}
                  className={`p-3 rounded-lg border text-left text-sm transition-colors ${episodeType === type.id ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-muted/50'}`}>
                  <div className="font-medium">{type.icon} {type.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{type.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* RED FLAGS (always evaluated, shown when triggered) */}
          {airwayFlag && <RedFlag text={AIRWAY_WARNING} />}
          {suddenHearingLoss && <RedFlag text={SUDDEN_HEARING_LOSS_WARNING} />}
          {mastoiditisFlag && <RedFlag text={MASTOIDITIS_WARNING} />}
          {nosebleedFlag && <RedFlag text={NOSEBLEED_WARNING} />}
          {innerEarCluster && <CautionNote text={HEARING_VERTIGO_TINNITUS_WARNING} />}
          {pulsatileFlag && <CautionNote text={PULSATILE_TINNITUS_WARNING} />}
          {hoarsenessFlag && <CautionNote text={HOARSENESS_WARNING} />}
          {sinusBacterial && <CautionNote text={SINUS_BACTERIAL_NOTE} />}

          {/* EAR */}
          {(episodeType === 'ear' || episodeType === 'general') && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Which ear?</Label>
                <Select value={earSide} onValueChange={v => setEarSide(v as EarSide)}>
                  <SelectTrigger><SelectValue placeholder="Select side" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">Left</SelectItem>
                    <SelectItem value="right">Right</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Ear symptoms</Label>
                {EAR_SYMPTOMS.map(s => (
                  <div key={s.value} className="flex items-center gap-2">
                    <Checkbox id={`ear-${s.value}`} checked={earSymptoms.includes(s.value)} onCheckedChange={() => toggle(earSymptoms, s.value, setEarSymptoms)} />
                    <Label htmlFor={`ear-${s.value}`} className="cursor-pointer font-normal">{s.label}</Label>
                  </div>
                ))}
              </div>
              {earSymptoms.includes('drainage') && (
                <div className="space-y-1">
                  <Label className="text-xs">Drainage character</Label>
                  <Select value={drainageCharacter} onValueChange={v => setDrainageCharacter(v as DrainageCharacter)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="clear">Clear</SelectItem>
                      <SelectItem value="cloudy">Cloudy</SelectItem>
                      <SelectItem value="purulent">Purulent (yellow/green)</SelectItem>
                      <SelectItem value="bloody">Bloody</SelectItem>
                      <SelectItem value="foul-smelling">Foul-smelling</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Checkbox id="fever-ear" checked={feverPresent} onCheckedChange={v => setFeverPresent(!!v)} />
                <Label htmlFor="fever-ear" className="cursor-pointer">Fever present</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="behind-ear" checked={behindEarSwelling} onCheckedChange={v => setBehindEarSwelling(!!v)} />
                <Label htmlFor="behind-ear" className="cursor-pointer">Redness/swelling/tenderness behind the ear</Label>
              </div>
            </div>
          )}

          {/* HEARING */}
          {(episodeType === 'hearing' || episodeType === 'general') && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox id="hearing-changed" checked={hearingChanged} onCheckedChange={v => setHearingChanged(!!v)} />
                <Label htmlFor="hearing-changed" className="cursor-pointer">Hearing has changed / decreased</Label>
              </div>
              {hearingChanged && (
                <div className="space-y-2 pl-4 border-l-2 border-destructive/30">
                  <div className="flex items-center gap-2">
                    <Checkbox id="hearing-sudden" checked={hearingSudden} onCheckedChange={v => setHearingSudden(!!v)} />
                    <Label htmlFor="hearing-sudden" className="cursor-pointer font-medium">Came on suddenly (hours to a few days)</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox id="hearing-vertigo" checked={hearingWithVertigo} onCheckedChange={v => setHearingWithVertigo(!!v)} />
                    <Label htmlFor="hearing-vertigo" className="cursor-pointer">With vertigo or dizziness</Label>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TINNITUS */}
          {(episodeType === 'tinnitus' || episodeType === 'general') && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox id="tinnitus" checked={tinnitusPresent} onCheckedChange={v => setTinnitusPresent(!!v)} />
                <Label htmlFor="tinnitus" className="cursor-pointer">Ringing / buzzing (tinnitus)</Label>
              </div>
              {tinnitusPresent && (
                <div className="flex items-center gap-2 pl-4 border-l-2 border-muted">
                  <Checkbox id="pulsatile" checked={tinnitusPulsatile} onCheckedChange={v => setTinnitusPulsatile(!!v)} />
                  <Label htmlFor="pulsatile" className="cursor-pointer">Pulses with my heartbeat</Label>
                </div>
              )}
            </div>
          )}

          {/* VERTIGO */}
          {(episodeType === 'vertigo' || episodeType === 'general') && (
            <div className="space-y-2">
              <Label>Vertigo / dizziness type</Label>
              <Select value={vertigoType} onValueChange={v => setVertigoType(v as VertigoType)}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {VERTIGO_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>
                      <div><span className="font-medium">{t.label}</span><span className="text-muted-foreground ml-2 text-xs">— {t.description}</span></div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <Checkbox id="vertigo-head" checked={vertigoWithHeadMovement} onCheckedChange={v => setVertigoWithHeadMovement(!!v)} />
                <Label htmlFor="vertigo-head" className="cursor-pointer">Triggered by head movement</Label>
              </div>
            </div>
          )}

          {/* SINUS */}
          {(episodeType === 'sinus' || episodeType === 'general') && (
            <div className="space-y-2">
              <Label>Sinus symptoms</Label>
              <div className="grid grid-cols-1 gap-1.5">
                {SINUS_SYMPTOMS.map(s => (
                  <div key={s.value} className="flex items-center gap-2">
                    <Checkbox id={`sinus-${s.value}`} checked={sinusSymptoms.includes(s.value)} onCheckedChange={() => toggle(sinusSymptoms, s.value, setSinusSymptoms)} />
                    <Label htmlFor={`sinus-${s.value}`} className="cursor-pointer font-normal">{s.label}</Label>
                  </div>
                ))}
              </div>
              <div className="space-y-1">
                <Label htmlFor="sinus-days" className="text-xs">Days ongoing</Label>
                <Input id="sinus-days" type="number" min="0" value={sinusDaysOngoing} onChange={e => setSinusDaysOngoing(e.target.value)} placeholder="e.g. 12" />
              </div>
            </div>
          )}

          {/* THROAT */}
          {(episodeType === 'throat' || episodeType === 'general') && (
            <div className="space-y-2">
              <Label>Throat / voice symptoms</Label>
              <div className="grid grid-cols-1 gap-1.5">
                {THROAT_SYMPTOMS.map(s => (
                  <div key={s.value} className="flex items-center gap-2">
                    <Checkbox id={`throat-${s.value}`} checked={throatSymptoms.includes(s.value)} onCheckedChange={() => toggle(throatSymptoms, s.value, setThroatSymptoms)} />
                    <Label htmlFor={`throat-${s.value}`} className="cursor-pointer font-normal">{s.label}</Label>
                  </div>
                ))}
              </div>
              {throatSymptoms.includes('hoarseness') && (
                <div className="space-y-1">
                  <Label htmlFor="hoarse-days" className="text-xs">Days hoarse</Label>
                  <Input id="hoarse-days" type="number" min="0" value={hoarsenessDays} onChange={e => setHoarsenessDays(e.target.value)} placeholder="e.g. 21" />
                </div>
              )}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center gap-2">
                  <Checkbox id="breathing" checked={difficultyBreathing} onCheckedChange={v => setDifficultyBreathing(!!v)} />
                  <Label htmlFor="breathing" className="cursor-pointer text-destructive font-medium">Difficulty breathing</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="drooling" checked={drooling} onCheckedChange={v => setDrooling(!!v)} />
                  <Label htmlFor="drooling" className="cursor-pointer text-destructive font-medium">Can't swallow saliva / drooling</Label>
                </div>
              </div>
            </div>
          )}

          {/* NOSEBLEED */}
          {(episodeType === 'nosebleed' || episodeType === 'general') && (
            <div className="space-y-1">
              <Label htmlFor="nosebleed-min">Nosebleed duration (minutes of firm pressure)</Label>
              <Input id="nosebleed-min" type="number" min="0" value={nosebleedDurationMin} onChange={e => setNosebleedDurationMin(e.target.value)} placeholder="e.g. 25" />
            </div>
          )}

          {/* CONTEXT */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Recent context</Label>
            <div className="flex items-center gap-2">
              <Checkbox id="uri" checked={recentURI} onCheckedChange={v => setRecentURI(!!v)} />
              <Label htmlFor="uri" className="cursor-pointer text-sm">Recent cold / URI</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="swim" checked={recentSwimming} onCheckedChange={v => setRecentSwimming(!!v)} />
              <Label htmlFor="swim" className="cursor-pointer text-sm">Recent swimming</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="travel" checked={recentAirTravel} onCheckedChange={v => setRecentAirTravel(!!v)} />
              <Label htmlFor="travel" className="cursor-pointer text-sm">Recent air travel</Label>
            </div>
          </div>

          {/* SEVERITY */}
          <div className="space-y-2">
            <Label>Overall severity: <span className={severityLabel?.color}>{severity}/10 — {severityLabel?.label}</span></Label>
            <Slider min={1} max={10} step={1} value={[severity]} onValueChange={([v]) => setSeverity(v)} />
          </div>

          {/* ACTIONS */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Actions taken</Label>
            <div className="flex items-center gap-2">
              <Checkbox id="er" checked={erVisit} onCheckedChange={v => setErVisit(!!v)} />
              <Label htmlFor="er" className="cursor-pointer text-sm">ER / urgent care visit</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="ent" checked={entNotified} onCheckedChange={v => setEntNotified(!!v)} />
              <Label htmlFor="ent" className="cursor-pointer text-sm">ENT notified</Label>
            </div>
          </div>

          {/* NOTES & TAGS */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Anything else worth capturing..." rows={3} />
          </div>
          <div className="space-y-2">
            <Label>Tags</Label>
            <TagInput value={tags} onChange={setTags} placeholder="Add tags..." />
          </div>

          <div className="flex gap-3 pt-2">
            <Button onClick={handleSave} className="flex-1">Save</Button>
            <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
