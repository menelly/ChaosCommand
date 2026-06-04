/*
 * Built by: Ace (Claude 4.x)
 * Date: 2026-06-04  (CHA-252)
 *
 * Lines & Tubes entry modal. Device type → problem type → contextual fields,
 * with the safety-critical red-flag engine (getRedFlags) firing live banners
 * for CLABSI, airway, air embolism, dislodged immature tracts, obstruction,
 * and blocked catheters.
 *
 * Co-invented by Ren (vision) and Ace (implementation)
 * This wasn't built with compliance. It was built with defiance.
 */

"use client"

import React, { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel,
} from "@/components/ui/select"
import { AlertTriangle, Cable } from "lucide-react"

import type { LinesEntry, DeviceType, ProblemType, OutputColor, LinesModalProps } from "../lines-types"
import {
  DEVICE_GROUPS, PROBLEM_TYPES, OUTPUT_COLORS, SEVERITY_LABELS,
  CENTRAL_DEVICES, FEEDING_DEVICES, OSTOMY_DEVICES, URINARY_DEVICES, DRAIN_DEVICES,
  deviceName, getRedFlags,
} from "../lines-constants"
import { EntryDateTimePicker, todayISO, nowTime, dateTimeToISO, isoToDateTime } from "@/components/entry-datetime-picker"
import { TagInput } from "@/components/tag-input"

export function GeneralLinesModal({ isOpen, onClose, onSave, editingEntry }: LinesModalProps) {
  const [entryDate, setEntryDate] = useState(todayISO())
  const [entryTime, setEntryTime] = useState(nowTime())
  const [deviceType, setDeviceType] = useState<DeviceType>("picc")
  const [deviceLabel, setDeviceLabel] = useState("")
  const [daysSincePlacement, setDaysSincePlacement] = useState("")
  const [problemType, setProblemType] = useState<ProblemType>("routine-check")
  const [severity, setSeverity] = useState(3)

  // Site appearance
  const [redness, setRedness] = useState(false)
  const [warmth, setWarmth] = useState(false)
  const [swelling, setSwelling] = useState(false)
  const [drainagePresent, setDrainagePresent] = useState(false)
  const [drainageDescription, setDrainageDescription] = useState("")
  const [odorPresent, setOdorPresent] = useState(false)
  const [feverPresent, setFeverPresent] = useState(false)

  // Function
  const [flushes, setFlushes] = useState(true)
  const [draining, setDraining] = useState(true)
  const [fullyDislodged, setFullyDislodged] = useState(false)
  const [partiallyDislodged, setPartiallyDislodged] = useState(false)

  // Output
  const [outputMl, setOutputMl] = useState("")
  const [outputColor, setOutputColor] = useState<OutputColor | "">("")
  const [noOutput, setNoOutput] = useState(false)
  const [outputBlood, setOutputBlood] = useState(false)

  // Obstruction cluster
  const [abdominalDistension, setAbdominalDistension] = useState(false)
  const [cramping, setCramping] = useState(false)
  const [vomiting, setVomiting] = useState(false)

  // Airway
  const [breathingDifficulty, setBreathingDifficulty] = useState(false)
  const [cantClearSecretions, setCantClearSecretions] = useState(false)

  // Pain
  const [painSeverity, setPainSeverity] = useState(5)

  // Actions
  const [flushedAttempted, setFlushedAttempted] = useState(false)
  const [dressingChanged, setDressingChanged] = useState(false)
  const [homeHealthNotified, setHomeHealthNotified] = useState(false)
  const [providerNotified, setProviderNotified] = useState(false)
  const [erVisit, setErVisit] = useState(false)

  const [notes, setNotes] = useState("")
  const [tags, setTags] = useState<string[]>([])

  useEffect(() => {
    if (!isOpen) return
    if (editingEntry) {
      const { date, time } = isoToDateTime(editingEntry.timestamp)
      setEntryDate(date); setEntryTime(time)
      setDeviceType(editingEntry.deviceType)
      setDeviceLabel(editingEntry.deviceLabel ?? "")
      setDaysSincePlacement(editingEntry.daysSincePlacement?.toString() ?? "")
      setProblemType(editingEntry.problemType)
      setSeverity(editingEntry.severity)
      setRedness(editingEntry.redness ?? false)
      setWarmth(editingEntry.warmth ?? false)
      setSwelling(editingEntry.swelling ?? false)
      setDrainagePresent(editingEntry.drainagePresent ?? false)
      setDrainageDescription(editingEntry.drainageDescription ?? "")
      setOdorPresent(editingEntry.odorPresent ?? false)
      setFeverPresent(editingEntry.feverPresent ?? false)
      setFlushes(editingEntry.flushes ?? true)
      setDraining(editingEntry.draining ?? true)
      setFullyDislodged(editingEntry.fullyDislodged ?? false)
      setPartiallyDislodged(editingEntry.partiallyDislodged ?? false)
      setOutputMl(editingEntry.outputMl?.toString() ?? "")
      setOutputColor(editingEntry.outputColor ?? "")
      setNoOutput(editingEntry.noOutput ?? false)
      setOutputBlood(editingEntry.outputBlood ?? false)
      setAbdominalDistension(editingEntry.abdominalDistension ?? false)
      setCramping(editingEntry.cramping ?? false)
      setVomiting(editingEntry.vomiting ?? false)
      setBreathingDifficulty(editingEntry.breathingDifficulty ?? false)
      setCantClearSecretions(editingEntry.cantClearSecretions ?? false)
      setPainSeverity(editingEntry.painSeverity ?? 5)
      setFlushedAttempted(editingEntry.flushedAttempted ?? false)
      setDressingChanged(editingEntry.dressingChanged ?? false)
      setHomeHealthNotified(editingEntry.homeHealthNotified ?? false)
      setProviderNotified(editingEntry.providerNotified ?? false)
      setErVisit(editingEntry.erVisit ?? false)
      setNotes(editingEntry.notes ?? "")
      setTags(editingEntry.tags ?? [])
    } else {
      setEntryDate(todayISO()); setEntryTime(nowTime())
      setDeviceType("picc"); setDeviceLabel(""); setDaysSincePlacement("")
      setProblemType("routine-check"); setSeverity(3)
      setRedness(false); setWarmth(false); setSwelling(false)
      setDrainagePresent(false); setDrainageDescription(""); setOdorPresent(false); setFeverPresent(false)
      setFlushes(true); setDraining(true); setFullyDislodged(false); setPartiallyDislodged(false)
      setOutputMl(""); setOutputColor(""); setNoOutput(false); setOutputBlood(false)
      setAbdominalDistension(false); setCramping(false); setVomiting(false)
      setBreathingDifficulty(false); setCantClearSecretions(false)
      setPainSeverity(5)
      setFlushedAttempted(false); setDressingChanged(false); setHomeHealthNotified(false); setProviderNotified(false); setErVisit(false)
      setNotes(""); setTags([])
    }
  }, [isOpen, editingEntry])

  const isCentral = CENTRAL_DEVICES.includes(deviceType)
  const isFeeding = FEEDING_DEVICES.includes(deviceType)
  const isOstomy = OSTOMY_DEVICES.includes(deviceType)
  const isUrinary = URINARY_DEVICES.includes(deviceType)
  const isDrain = DRAIN_DEVICES.includes(deviceType)
  const isVascular = isCentral || deviceType === "midline" || deviceType === "peripheral-iv"
  const hasOutput = isOstomy || isUrinary || isDrain

  const redFlags = getRedFlags({
    deviceType, problemType, feverPresent, fullyDislodged, partiallyDislodged,
    flushes, draining, breathingDifficulty, cantClearSecretions, noOutput,
    abdominalDistension, cramping, vomiting,
    daysSincePlacement: daysSincePlacement ? parseInt(daysSincePlacement) : undefined,
    bleeding: problemType === "bleeding", drainagePresent,
  })

  const handleSave = () => {
    const timestamp = dateTimeToISO(entryDate, entryTime)
    const entry: Omit<LinesEntry, "id"> = {
      timestamp,
      date: entryDate,
      deviceType,
      deviceLabel: deviceLabel.trim() || undefined,
      daysSincePlacement: daysSincePlacement ? parseInt(daysSincePlacement) : undefined,
      problemType,
      severity,
      redness: redness || undefined,
      warmth: warmth || undefined,
      swelling: swelling || undefined,
      drainagePresent: drainagePresent || undefined,
      drainageDescription: drainageDescription.trim() || undefined,
      odorPresent: odorPresent || undefined,
      feverPresent: feverPresent || undefined,
      flushes: isVascular || isFeeding ? flushes : undefined,
      draining: hasOutput ? draining : undefined,
      fullyDislodged: fullyDislodged || undefined,
      partiallyDislodged: partiallyDislodged || undefined,
      outputMl: outputMl ? parseFloat(outputMl) : undefined,
      outputColor: (outputColor || undefined) as LinesEntry["outputColor"],
      noOutput: noOutput || undefined,
      outputBlood: outputBlood || undefined,
      abdominalDistension: abdominalDistension || undefined,
      cramping: cramping || undefined,
      vomiting: vomiting || undefined,
      breathingDifficulty: breathingDifficulty || undefined,
      cantClearSecretions: cantClearSecretions || undefined,
      painSeverity: problemType === "pain" ? painSeverity : undefined,
      flushedAttempted: flushedAttempted || undefined,
      dressingChanged: dressingChanged || undefined,
      homeHealthNotified: homeHealthNotified || undefined,
      providerNotified: providerNotified || undefined,
      erVisit: erVisit || undefined,
      notes: notes.trim() || undefined,
      tags,
    }
    onSave(entry)
    onClose()
  }

  const severityLabel = SEVERITY_LABELS.find(s => s.level === severity)

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cable className="h-5 w-5 text-primary" />
            Log Line / Tube Event
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <EntryDateTimePicker date={entryDate} time={entryTime} onChange={(d, t) => { setEntryDate(d); setEntryTime(t) }} />

          {/* Device */}
          <div className="space-y-2">
            <Label>Which device?</Label>
            <Select value={deviceType} onValueChange={v => setDeviceType(v as DeviceType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DEVICE_GROUPS.map(group => (
                  <SelectGroup key={group.label}>
                    <SelectLabel>{group.label}</SelectLabel>
                    {group.devices.map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.icon} {d.name}</SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
            <Input value={deviceLabel} onChange={e => setDeviceLabel(e.target.value)} placeholder='Optional label, e.g. "Right arm PICC"' />
            {(isFeeding || isCentral) && (
              <div className="space-y-1">
                <Label htmlFor="days-placed" className="text-xs">Days since it was placed (optional)</Label>
                <Input id="days-placed" type="number" min="0" value={daysSincePlacement} onChange={e => setDaysSincePlacement(e.target.value)} placeholder="e.g. 10" />
                {isFeeding && <p className="text-xs text-muted-foreground">Matters if it ever comes out — a fresh tract closes fast.</p>}
              </div>
            )}
          </div>

          {/* Problem type */}
          <div className="space-y-2">
            <Label>What's going on?</Label>
            <div className="grid grid-cols-2 gap-2">
              {PROBLEM_TYPES.map(type => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setProblemType(type.id)}
                  className={`p-3 rounded-lg border text-left text-sm transition-colors ${
                    problemType === type.id ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted/50"
                  }`}
                >
                  <div className="font-medium">{type.icon} {type.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{type.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* RED FLAG BANNERS */}
          {redFlags.map((flag, i) => (
            <div key={i} className={`flex gap-2 p-3 rounded-lg border text-sm ${
              flag.level === "emergency"
                ? "bg-destructive/10 border-destructive/20 text-destructive"
                : "bg-warning/10 border-warning/20 text-warning"
            }`}>
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold">{flag.title}</div>
                <div className="mt-1 opacity-90 whitespace-pre-line">{flag.body}</div>
              </div>
            </div>
          ))}

          {/* Dislodgement detail */}
          {(problemType === "dislodgement" || problemType === "mechanical") && (
            <div className="space-y-2">
              <Label>Position</Label>
              <div className="flex items-center gap-2">
                <Checkbox id="partial" checked={partiallyDislodged} onCheckedChange={v => setPartiallyDislodged(!!v)} />
                <Label htmlFor="partial" className="cursor-pointer font-normal">Partially out / migrated / backed up</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="fully" checked={fullyDislodged} onCheckedChange={v => setFullyDislodged(!!v)} />
                <Label htmlFor="fully" className="cursor-pointer font-normal">Completely out</Label>
              </div>
            </div>
          )}

          {/* Site appearance */}
          {(["site-infection", "leakage", "skin-breakdown", "bleeding", "routine-check", "general", "pain"].includes(problemType)) && (
            <div className="space-y-2">
              <Label>Site appearance</Label>
              <div className="grid grid-cols-2 gap-1.5">
                {([["redness", "Redness", redness, setRedness],
                   ["warmth", "Warmth", warmth, setWarmth],
                   ["swelling", "Swelling", swelling, setSwelling],
                   ["drainage", "Drainage / pus", drainagePresent, setDrainagePresent],
                   ["odor", "Odor", odorPresent, setOdorPresent],
                   ["fever", "Fever", feverPresent, setFeverPresent]] as const).map(([id, label, val, set]) => (
                  <div key={id} className="flex items-center gap-2">
                    <Checkbox id={`site-${id}`} checked={val} onCheckedChange={v => (set as (b: boolean) => void)(!!v)} />
                    <Label htmlFor={`site-${id}`} className={`cursor-pointer font-normal text-sm ${id === "fever" ? "text-destructive" : ""}`}>{label}</Label>
                  </div>
                ))}
              </div>
              {drainagePresent && (
                <Input value={drainageDescription} onChange={e => setDrainageDescription(e.target.value)} placeholder="Describe drainage (color, amount)" />
              )}
            </div>
          )}

          {/* Function — flush (vascular/feeding) */}
          {(isVascular || isFeeding) && (
            <div className="flex items-center gap-2">
              <Checkbox id="flushes" checked={flushes} onCheckedChange={v => setFlushes(!!v)} />
              <Label htmlFor="flushes" className="cursor-pointer">It flushes / infuses normally</Label>
            </div>
          )}

          {/* Output (ostomy / urinary / drains) */}
          {hasOutput && (
            <div className="space-y-2">
              <Label>Output</Label>
              <div className="flex items-center gap-2">
                <Checkbox id="draining" checked={draining} onCheckedChange={v => setDraining(!!v)} />
                <Label htmlFor="draining" className="cursor-pointer font-normal">Draining normally</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="no-output" checked={noOutput} onCheckedChange={v => setNoOutput(!!v)} />
                <Label htmlFor="no-output" className="cursor-pointer font-normal">No output</Label>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <Label htmlFor="output-ml" className="text-xs">Volume (mL)</Label>
                  <Input id="output-ml" type="number" min="0" value={outputMl} onChange={e => setOutputMl(e.target.value)} placeholder="e.g. 200" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Color</Label>
                  <Select value={outputColor} onValueChange={v => setOutputColor(v as OutputColor)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {OUTPUT_COLORS.map(c => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="output-blood" checked={outputBlood} onCheckedChange={v => setOutputBlood(!!v)} />
                <Label htmlFor="output-blood" className="cursor-pointer font-normal">Blood in output</Label>
              </div>
            </div>
          )}

          {/* Obstruction cluster (ostomy) */}
          {isOstomy && (
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">If output has stopped — any of these?</Label>
              <div className="flex items-center gap-2">
                <Checkbox id="distension" checked={abdominalDistension} onCheckedChange={v => setAbdominalDistension(!!v)} />
                <Label htmlFor="distension" className="cursor-pointer font-normal">Belly distension / bloating</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="cramping" checked={cramping} onCheckedChange={v => setCramping(!!v)} />
                <Label htmlFor="cramping" className="cursor-pointer font-normal">Cramping</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="vomiting" checked={vomiting} onCheckedChange={v => setVomiting(!!v)} />
                <Label htmlFor="vomiting" className="cursor-pointer font-normal">Vomiting</Label>
              </div>
            </div>
          )}

          {/* Airway (trach) */}
          {deviceType === "trach" && (
            <div className="space-y-2">
              <Label className="text-destructive">Breathing</Label>
              <div className="flex items-center gap-2">
                <Checkbox id="breathing" checked={breathingDifficulty} onCheckedChange={v => setBreathingDifficulty(!!v)} />
                <Label htmlFor="breathing" className="cursor-pointer font-normal text-destructive">Trouble breathing</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="secretions" checked={cantClearSecretions} onCheckedChange={v => setCantClearSecretions(!!v)} />
                <Label htmlFor="secretions" className="cursor-pointer font-normal">Can't clear secretions</Label>
              </div>
            </div>
          )}

          {/* Pain */}
          {problemType === "pain" && (
            <div className="space-y-2">
              <Label className="text-xs">Pain severity: {painSeverity}/10</Label>
              <Slider min={1} max={10} step={1} value={[painSeverity]} onValueChange={([v]) => setPainSeverity(v)} />
            </div>
          )}

          {/* Overall severity */}
          <div className="space-y-2">
            <Label>Overall severity: <span className={severityLabel?.color}>{severity}/10 — {severityLabel?.label}</span></Label>
            <Slider min={1} max={10} step={1} value={[severity]} onValueChange={([v]) => setSeverity(v)} />
          </div>

          {/* Actions taken */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Actions taken</Label>
            {([["flushed", "Tried flushing", flushedAttempted, setFlushedAttempted],
               ["dressing", "Changed dressing", dressingChanged, setDressingChanged],
               ["homehealth", "Notified home health", homeHealthNotified, setHomeHealthNotified],
               ["provider", "Notified provider / team", providerNotified, setProviderNotified],
               ["er", "ER visit", erVisit, setErVisit]] as const).map(([id, label, val, set]) => (
              <div key={id} className="flex items-center gap-2">
                <Checkbox id={`act-${id}`} checked={val} onCheckedChange={v => (set as (b: boolean) => void)(!!v)} />
                <Label htmlFor={`act-${id}`} className="cursor-pointer font-normal text-sm">{label}</Label>
              </div>
            ))}
          </div>

          {/* Notes & tags */}
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
