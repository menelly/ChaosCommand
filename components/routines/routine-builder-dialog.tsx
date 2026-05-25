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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Plus, ArrowUp, ArrowDown, X, ChevronDown, ChevronRight } from "lucide-react"
import { useDailyData } from "@/lib/database"
import {
  type TrackableTracker, type TrackableCategory,
  TRACKABLE_CATEGORY_ORDER, TRACKABLE_CATEGORY_LABELS,
} from "@/lib/routines/trackable-registry"
import { loadAllTrackables, indexTrackables } from "@/lib/routines/load-trackables"

const EMOJI_CHOICES = ['📋', '🌅', '🌙', '☀️', '🌧️', '💊', '🍽️', '💧', '🧠', '❤️', '💪', '⚡', '🛌', '🚿', '🦴', '✅', '🌀', '🌿']
import {
  type Routine, type RoutineTimeWindow, type RoutineTracker,
  listRoutines, createRoutine, updateRoutine, setRoutineTrackers,
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
  const { getAllCategoryData } = useDailyData()
  const [name, setName] = useState("")
  const [emoji, setEmoji] = useState("📋")
  const [timeWindow, setTimeWindow] = useState<RoutineTimeWindow>("morning")
  const [members, setMembers] = useState<RoutineTracker[]>([])
  const [trackables, setTrackables] = useState<TrackableTracker[]>([])
  const [openCats, setOpenCats] = useState<Set<TrackableCategory>>(new Set(['body']))
  const toggleCat = (c: TrackableCategory) =>
    setOpenCats(prev => { const n = new Set(prev); n.has(c) ? n.delete(c) : n.add(c); return n })
  // Existing routines you can clone trackers from when creating a new one.
  const [existing, setExisting] = useState<Routine[]>([])
  useEffect(() => {
    if (open && !routine && pin) setExisting(listRoutines(pin))
  }, [open, routine, pin])
  const copyFrom = (id: string) => {
    const src = existing.find(r => r.id === id)
    if (!src) return
    setMembers(src.trackers.map(t => ({ ...t })))
    setTimeWindow(src.timeWindow)
    if (!emoji || emoji === "📋") setEmoji(src.emoji)
  }

  // Load the user's full tracker set (built-in + custom Forge trackers) on open.
  useEffect(() => {
    if (!open) return
    let alive = true
    loadAllTrackables(getAllCategoryData).then(list => { if (alive) setTrackables(list) })
    return () => { alive = false }
  }, [open, getAllCategoryData])

  const trackableById = indexTrackables(trackables)
  const getTrackable = (id: string) => trackableById.get(id)

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
  const available = trackables.filter(t => !memberIds.has(t.id))

  const addTracker = (id: string) =>
    setMembers(prev => [...prev, { trackerId: id, autofill: false }])
  const removeTracker = (id: string) =>
    setMembers(prev => prev.filter(m => m.trackerId !== id))
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
          {/* Copy from an existing routine (create mode only) */}
          {!routine && existing.length > 0 && (
            <div>
              <Label className="text-xs">Copy trackers from (optional)</Label>
              <Select onValueChange={copyFrom}>
                <SelectTrigger><SelectValue placeholder="Start blank, or clone an existing routine…" /></SelectTrigger>
                <SelectContent>
                  {existing.map(r => (
                    <SelectItem key={r.id} value={r.id}>{r.emoji} {r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[0.6875rem] text-muted-foreground mt-1">
                Pulls in that routine's trackers + time of day — handy for making Night from Morning. You still name it.
              </p>
            </div>
          )}

          {/* Identity */}
          <div>
            <Label htmlFor="routine-name" className="text-xs">Name</Label>
            <Input
              id="routine-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Morning, Night, Pre-Meal…"
            />
          </div>
          <div>
            <Label className="text-xs">Emoji <span className="font-mono text-base">{emoji}</span></Label>
            <div className="flex flex-wrap gap-1 mt-1">
              {EMOJI_CHOICES.map(e => (
                <button key={e} type="button" onClick={() => setEmoji(e)}
                  aria-label={`Use ${e}`}
                  className={`text-xl rounded-md p-1.5 leading-none hover:bg-muted ${emoji === e ? "ring-2 ring-primary bg-muted" : ""}`}>
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs">Time of day</Label>
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
                      <button type="button" aria-label="Remove" onClick={() => removeTracker(m.trackerId)}
                        className="text-muted-foreground hover:text-destructive"><X className="h-4 w-4" /></button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Add trackers — grouped into collapsible categories */}
          {available.length > 0 && (
            <div>
              <Label className="text-xs">Add trackers</Label>
              <div className="mt-1 space-y-1">
                {TRACKABLE_CATEGORY_ORDER.map(cat => {
                  const items = available.filter(t => t.category === cat)
                  if (items.length === 0) return null
                  const isOpen = openCats.has(cat)
                  return (
                    <Collapsible key={cat} open={isOpen} onOpenChange={() => toggleCat(cat)}>
                      <CollapsibleTrigger asChild>
                        <Button type="button" variant="outline" className="w-full justify-between h-auto py-2">
                          <span className="font-medium text-sm">
                            {TRACKABLE_CATEGORY_LABELS[cat]}{" "}
                            <span className="text-muted-foreground font-normal">({items.length})</span>
                          </span>
                          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pt-1">
                        <div className="space-y-0.5 max-h-52 overflow-y-auto">
                          {items.map(t => (
                            <button key={t.id} type="button" onClick={() => addTracker(t.id)}
                              className="w-full flex items-center gap-2 rounded p-2 text-sm hover:bg-muted text-left">
                              <Plus className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span className="text-lg">{t.emoji}</span>
                              <span className="flex-1">{t.label}</span>
                              {t.statusUnsupported && (
                                <span className="text-[0.625rem] uppercase tracking-wide text-muted-foreground">log-only</span>
                              )}
                            </button>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  )
                })}
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
