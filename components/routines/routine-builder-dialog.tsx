/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace (Claude-4.7)
 *
 * Create / edit a Routine (CHA-167). Pick a name + emoji + time-of-day window,
 * choose which trackers belong (ordered), and per-tracker flip the opt-in
 * "autofill from last entry" toggle (default OFF — convenience is asked for
 * explicitly, never assumed). Reorder with up/down so we carry no drag-drop dep.
 */
"use client"

import { useEffect, useState } from "react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, ArrowUp, ArrowDown, X, Info } from "lucide-react"
import { TRACKABLE_TRACKERS, getTrackable } from "@/lib/routines/trackable-registry"
import {
  type Routine, type RoutineTimeWindow, type RoutineTracker,
  createRoutine, updateRoutine, setRoutineTrackers,
} from "@/lib/routines/routines-config"

interface Props {
  open: boolean
  onClose: () => void
  pin: string
  /** When editing an existing routine; omit to create a new one. */
  routine?: Routine | null
  onSaved: () => void
}

export default function RoutineBuilderDialog({ open, onClose, pin, routine, onSaved }: Props) {
  const [name, setName] = useState("")
  const [emoji, setEmoji] = useState("📋")
  const [timeWindow, setTimeWindow] = useState<RoutineTimeWindow>("morning")
  const [members, setMembers] = useState<RoutineTracker[]>([])

  // Hydrate from the routine being edited (or reset for a fresh create).
  useEffect(() => {
    if (!open) return
    if (routine) {
      setName(routine.name)
      setEmoji(routine.emoji)
      setTimeWindow(routine.timeWindow)
      setMembers(routine.trackers)
    } else {
      setName("")
      setEmoji("📋")
      setTimeWindow("morning")
      setMembers([])
    }
  }, [open, routine])

  const memberIds = new Set(members.map(m => m.trackerId))
  const available = TRACKABLE_TRACKERS.filter(t => !memberIds.has(t.id))

  const addTracker = (id: string) =>
    setMembers(prev => [...prev, { trackerId: id, autofill: false }])
  const removeTracker = (id: string) =>
    setMembers(prev => prev.filter(m => m.trackerId !== id))
  const toggleAutofill = (id: string, autofill: boolean) =>
    setMembers(prev => prev.map(m => (m.trackerId === id ? { ...m, autofill } : m)))
  const move = (index: number, dir: -1 | 1) =>
    setMembers(prev => {
      const next = [...prev]
      const j = index + dir
      if (j < 0 || j >= next.length) return prev
      ;[next[index], next[j]] = [next[j], next[index]]
      return next
    })

  const canSave = name.trim().length > 0 && members.length > 0

  const handleSave = () => {
    if (!pin || !canSave) return
    if (routine) {
      updateRoutine(pin, routine.id, { name: name.trim(), emoji: emoji.trim() || "📋", timeWindow })
      setRoutineTrackers(pin, routine.id, members)
    } else {
      const created = createRoutine(pin, { name: name.trim(), emoji: emoji.trim() || "📋", timeWindow })
      if (created) setRoutineTrackers(pin, created.id, members)
    }
    onSaved()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{routine ? "Edit Routine" : "New Routine"}</DialogTitle>
          <DialogDescription>
            A routine batches the trackers you log together so you don't open each one separately.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Identity */}
          <div className="flex gap-2">
            <div className="w-16">
              <Label htmlFor="routine-emoji" className="text-xs">Emoji</Label>
              <Input
                id="routine-emoji"
                value={emoji}
                onChange={(e) => setEmoji(e.target.value)}
                className="text-center text-lg"
                maxLength={4}
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="routine-name" className="text-xs">Name</Label>
              <Input
                id="routine-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Morning, Night, Pre-Meal…"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs">Time of day (used for autofill matching)</Label>
            <Select value={timeWindow} onValueChange={(v) => setTimeWindow(v as RoutineTimeWindow)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="morning">🌅 Morning (5am–noon)</SelectItem>
                <SelectItem value="night">🌙 Night (5pm–2am)</SelectItem>
                <SelectItem value="custom">🕐 Anytime (around when I created it)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Members (ordered) */}
          <div>
            <Label className="text-xs">In this routine ({members.length})</Label>
            {members.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">Add trackers from the list below.</p>
            ) : (
              <div className="space-y-1 mt-1">
                {members.map((m, i) => {
                  const t = getTrackable(m.trackerId)
                  if (!t) return null
                  return (
                    <div key={m.trackerId} className="flex items-center gap-2 rounded border border-border p-2">
                      <div className="flex flex-col">
                        <button type="button" aria-label="Move up" onClick={() => move(i, -1)} disabled={i === 0}
                          className="disabled:opacity-30 hover:text-primary"><ArrowUp className="h-3.5 w-3.5" /></button>
                        <button type="button" aria-label="Move down" onClick={() => move(i, 1)} disabled={i === members.length - 1}
                          className="disabled:opacity-30 hover:text-primary"><ArrowDown className="h-3.5 w-3.5" /></button>
                      </div>
                      <span className="text-lg">{t.emoji}</span>
                      <span className="flex-1 text-sm">{t.label}</span>
                      <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer" title="Pre-fill this tracker's form from your last entry in this time window. Off by default.">
                        autofill
                        <Switch checked={m.autofill} onCheckedChange={(c) => toggleAutofill(m.trackerId, c)} />
                      </label>
                      <button type="button" aria-label="Remove" onClick={() => removeTracker(m.trackerId)}
                        className="text-muted-foreground hover:text-destructive"><X className="h-4 w-4" /></button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Autofill explainer */}
          <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            Autofill is great for stable values (same daily meds, hydration goal). It never
            pre-fills pain, mood, or free-text symptoms — those are always fresh, and you
            always hit Save yourself.
          </p>

          {/* Add */}
          {available.length > 0 && (
            <div>
              <Label className="text-xs">Add trackers</Label>
              <div className="h-40 mt-1 rounded border border-border overflow-y-auto">
                <div className="p-1 space-y-0.5">
                  {available.map(t => (
                    <button key={t.id} type="button" onClick={() => addTracker(t.id)}
                      className="w-full flex items-center gap-2 rounded p-2 text-sm hover:bg-muted text-left">
                      <Plus className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-lg">{t.emoji}</span>
                      <span>{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!canSave}>
            {routine ? "Save changes" : "Create routine"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
