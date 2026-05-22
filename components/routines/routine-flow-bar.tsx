/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace (Claude-4.7)
 *
 * Global "you're in a routine" flow bar (CHA-167). Mounted once in the layout,
 * it renders NOTHING unless the current URL carries ?routine=<id>. When you tap
 * "Log now" from a routine, every tracker page is reached with that param, so
 * this bar appears at the bottom and gives you the chaining Ren asked for:
 * "← back to routine" + "Next on routine →". One mount, works on every tracker
 * (built-in AND custom) with zero per-page wiring.
 *
 * Lightweight on purpose: it reads routine config (sync localStorage) + the
 * tracker registry, and navigates in routine ORDER. No data fetch — predictable
 * "next is the next card," not "next unlogged."
 *
 * useSearchParams requires a Suspense boundary under static export; the layout
 * wraps this in <Suspense>.
 */
"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useSearchParams, useRouter } from "next/navigation"
import { ArrowLeft, ChevronRight, CheckCircle2, EyeOff, CopyPlus } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useUser } from "@/lib/contexts/user-context"
import { useDailyData, formatDateForStorage } from "@/lib/database"
import { getRoutine, type Routine } from "@/lib/routines/routines-config"
import { type TrackableTracker } from "@/lib/routines/trackable-registry"
import { loadAllTrackables, indexTrackables } from "@/lib/routines/load-trackables"
import { buildStatusMap } from "@/lib/routines/routine-status"
import { getClearedTrackers } from "@/lib/routines/routine-cleared"
import { getSkippedTrackers, markSkipped } from "@/lib/routines/routine-skipped"
import { copyLastEntryToToday } from "@/lib/routines/copy-last-entry"

// Normalize trailing slashes — next.config has trailingSlash:true, so
// usePathname() yields "/cardiac/" while tracker hrefs are "/cardiac".
const normPath = (p: string) => p.replace(/\/+$/, "") || "/"

export default function RoutineFlowBar() {
  const params = useSearchParams()
  const pathname = usePathname()
  const routineId = params.get("routine") ?? ""
  const { userPin } = useUser()
  const pin = userPin ?? ""
  const { getAllCategoryData, getDateRange, saveData } = useDailyData()
  const router = useRouter()
  const { toast } = useToast()

  const [routine, setRoutine] = useState<Routine | null>(null)
  const [trackables, setTrackables] = useState<TrackableTracker[]>([])
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    setRoutine(pin && routineId ? getRoutine(pin, routineId) : null)
  }, [pin, routineId])

  useEffect(() => {
    if (!routineId) return
    let alive = true
    loadAllTrackables(getAllCategoryData).then(l => { if (alive) setTrackables(l) })
    return () => { alive = false }
  }, [routineId, getAllCategoryData])

  // Track which routine members are "handled" today (logged OR nothing-to-log OR
  // skipped) so "Next" skips them and lands on the next thing actually needing
  // attention — and doesn't loop back to one you just skipped.
  useEffect(() => {
    if (!pin || !routine) return
    const idx = indexTrackables(trackables)
    const resolved = routine.trackers
      .map(t => idx.get(t.trackerId))
      .filter((t): t is TrackableTracker => t !== undefined)
    if (resolved.length === 0) { setDoneIds(new Set()); return }
    let alive = true
    const today = formatDateForStorage(new Date())
    getDateRange(today, today).then(records => {
      if (!alive) return
      const status = buildStatusMap(records, resolved.map(t => ({ id: t.id, subcategory: t.subcategory })))
      const cleared = getClearedTrackers(pin, today)
      const skipped = getSkippedTrackers(pin, today)
      const handled = new Set<string>()
      resolved.forEach(t => {
        if (status[t.id]?.loggedToday || cleared.has(t.id) || skipped.has(t.id)) handled.add(t.id)
      })
      setDoneIds(handled)
    })
    return () => { alive = false }
  }, [pin, routine, trackables, getDateRange])

  // Not in a routine → render nothing.
  if (!routineId || !routine) return null

  const byId = indexTrackables(trackables)
  const ordered = routine.trackers
    .map(t => byId.get(t.trackerId))
    .filter((t): t is TrackableTracker => t !== undefined)

  // Which routine member is this page? Match href path (+ id for custom trackers),
  // normalizing trailing slashes so /cardiac/ matches /cardiac.
  const currentId = params.get("id")
  const here = normPath(pathname)
  const currentIndex = ordered.findIndex(t => {
    const [path, query] = t.href.split("?")
    if (normPath(path) !== here) return false
    if (query) return new URLSearchParams(query).get("id") === currentId
    return true
  })

  // "Next" = next NOT-done tracker — prefer one after the current card, else the
  // first not-done anywhere, else null (everything done → "back to routine").
  const currentTracker = currentIndex >= 0 ? ordered[currentIndex] : undefined
  const notDone = ordered.filter(t => !doneIds.has(t.id) && t.id !== currentTracker?.id)
  const next =
    (currentIndex >= 0 ? notDone.find(t => ordered.indexOf(t) > currentIndex) : undefined) ??
    notDone[0] ??
    null

  const runHref = `/routines/run?id=${encodeURIComponent(routineId)}`
  const nextHref = next
    ? `${next.href}${next.href.includes("?") ? "&" : "?"}routine=${encodeURIComponent(routineId)}`
    : runHref

  // Current-tracker actions on the bar (then advance), mirroring the run list.
  const today = formatDateForStorage(new Date())
  const goNext = () => router.push(nextHref)
  const skipCurrent = () => {
    if (currentTracker) markSkipped(pin, today, currentTracker.id)
    goNext()
  }
  const setYesterday = async () => {
    if (!currentTracker) return
    const res = await copyLastEntryToToday(currentTracker, today, getDateRange, saveData)
    if (res.ok) {
      toast({ title: `${currentTracker.emoji} ${currentTracker.label} — copied`, description: `From ${res.srcDate}. Edit on the tracker if needed.` })
      goNext()
    } else if (res.reason === "no-prior") {
      toast({ title: "Nothing to copy yet", description: `No earlier ${currentTracker.label} entry.`, variant: "destructive" })
    } else {
      toast({ title: "Couldn't copy", variant: "destructive" })
    }
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="max-w-3xl mx-auto flex items-center justify-between gap-2 px-3 py-2">
        <Link href={runHref}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground shrink-0">
          <ArrowLeft className="h-4 w-4" />
          <span className="truncate">{routine.emoji} {routine.name}</span>
        </Link>

        {currentIndex >= 0 && (
          <span className="text-xs text-muted-foreground hidden sm:block">
            Step {currentIndex + 1} of {ordered.length}
          </span>
        )}

        <div className="flex items-center gap-1 shrink-0">
          {currentTracker && (
            <>
              <button type="button" onClick={setYesterday}
                title="Copy this tracker's last entry into today, then advance"
                className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted">
                <CopyPlus className="h-4 w-4" /> <span className="hidden sm:inline">Set yest.</span>
              </button>
              <button type="button" onClick={skipCurrent}
                title="Skip this one for now and move on (you can unskip in the routine)"
                className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted">
                <EyeOff className="h-4 w-4" /> <span className="hidden sm:inline">Skip</span>
              </button>
            </>
          )}
          <Link href={nextHref}
            className="flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-sm font-medium hover:opacity-90">
            {next ? (
              <>
                <span className="truncate max-w-[7rem] sm:max-w-[9rem]">Next: {next.emoji} {next.label}</span>
                <ChevronRight className="h-4 w-4 shrink-0" />
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" /> <span className="truncate">Done — back to routine</span>
              </>
            )}
          </Link>
        </div>
      </div>
    </div>
  )
}
