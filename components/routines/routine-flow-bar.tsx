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

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useSearchParams, useRouter } from "next/navigation"
import { ArrowLeft, ChevronRight, CheckCircle2, EyeOff, CopyPlus, Flag } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useUser } from "@/lib/contexts/user-context"
import { useDailyData, formatDateForStorage } from "@/lib/database"
import { getRoutine, type Routine } from "@/lib/routines/routines-config"
import { withRoutineParam } from "@/lib/routines/routine-url"
import { type TrackableTracker } from "@/lib/routines/trackable-registry"
import { loadAllTrackables, indexTrackables } from "@/lib/routines/load-trackables"
import { buildStatusMap } from "@/lib/routines/routine-status"
import { getClearedTrackers } from "@/lib/routines/routine-cleared"
import { getSkippedTrackers, markSkipped } from "@/lib/routines/routine-skipped"
import { getRunStart, endRun } from "@/lib/routines/routine-session"
import { copyLastEntryToToday, buildCopyableMap } from "@/lib/routines/copy-last-entry"

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
  const [copyableIds, setCopyableIds] = useState<Set<string>>(new Set())

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
  //
  // This bar is mounted ONCE in the persistent layout, so [pin, routine,
  // trackables] don't change as you move tracker→tracker within a routine. We
  // therefore re-fetch on every navigation (pathname) AND on window focus /
  // visibility — otherwise logging a tracker and tapping Next leaves doneIds
  // stale, and the bar loops you back to the one you JUST logged (CHA-167 bug,
  // Ren caught it 2026-06-13). The run page already does this; the bar didn't.
  const refreshDone = useCallback(() => {
    if (!pin || !routine) return () => {}
    const idx = indexTrackables(trackables)
    const resolved = routine.trackers
      .map(t => idx.get(t.trackerId))
      .filter((t): t is TrackableTracker => t !== undefined)
    if (resolved.length === 0) { setDoneIds(new Set()); return () => {} }
    let alive = true
    const today = formatDateForStorage(new Date())
    const keys = resolved.map(t => ({ id: t.id, subcategory: t.subcategory, subcategoryPrefix: t.subcategoryPrefix }))
    getDateRange("2000-01-01", today).then(allRecords => {
      if (!alive) return
      const records = allRecords.filter(r => r.date === today)
      const since = getRunStart(pin, routineId)
      const status = buildStatusMap(records, keys, since)
      const cleared = getClearedTrackers(pin, routineId, today)
      const skipped = getSkippedTrackers(pin, routineId, today)
      const handled = new Set<string>()
      resolved.forEach(t => {
        if (status[t.id]?.loggedToday || cleared.has(t.id) || skipped.has(t.id)) handled.add(t.id)
      })
      setDoneIds(handled)
      const copyMap = buildCopyableMap(allRecords, keys)
      setCopyableIds(new Set(Object.keys(copyMap).filter(id => copyMap[id])))
    })
    return () => { alive = false }
  }, [pin, routine, trackables, getDateRange, routineId])

  // Re-fetch on navigation (pathname) and when the routine/trackables resolve.
  useEffect(() => refreshDone(), [refreshDone, pathname])

  // Re-fetch when the user returns to the window (came back from a tracker /
  // logged via a modal without a route change).
  useEffect(() => {
    const onFocus = () => refreshDone()
    window.addEventListener("focus", onFocus)
    document.addEventListener("visibilitychange", onFocus)
    return () => {
      window.removeEventListener("focus", onFocus)
      document.removeEventListener("visibilitychange", onFocus)
    }
  }, [refreshDone])

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
    ? withRoutineParam(next.href, routineId)
    : runHref

  // Current-tracker actions on the bar (then advance), mirroring the run list.
  const today = formatDateForStorage(new Date())
  const goNext = () => router.push(nextHref)
  const skipCurrent = () => {
    if (currentTracker) markSkipped(pin, routineId, today, currentTracker.id)
    goNext()
  }
  // Explicit "I'm done" — end the run NO MATTER how much is left. The user owns
  // when their own health routine is finished; they shouldn't have to satisfy
  // every tracker (or fight done-detection) to get out. CHA-193/Ren 2026-06-13.
  const finishRoutine = () => {
    endRun(pin, routineId)
    toast({ title: `${routine.emoji} ${routine.name} — done ✓`, description: "Routine finished. Run it again anytime." })
    router.push("/routines")
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
    // The home indicator occupies the bottom ~34pt. Without this padding the
    // Next / Skip / Copy-previous buttons are half-covered AND the bottom strip
    // of taps is swallowed by the system swipe-up gesture — and this bar is the
    // primary way to advance a routine.
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 [padding-bottom:env(safe-area-inset-bottom)]">
      {/* Stacks vertically on mobile (identity row over action row) so the
          buttons never run off a narrow screen; single row on sm+. */}
      <div className="max-w-3xl mx-auto flex flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center justify-between gap-2 min-w-0">
          <Link href={runHref}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground min-w-0">
            <ArrowLeft className="h-4 w-4 shrink-0" />
            <span className="truncate">{routine.emoji} {routine.name}</span>
          </Link>
          {currentIndex >= 0 && (
            <span className="text-xs text-muted-foreground shrink-0">
              Step {currentIndex + 1} of {ordered.length}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-1.5 sm:shrink-0">
          {currentTracker && (
            <>
              {!currentTracker.statusUnsupported && !currentTracker.copyUnsupported && copyableIds.has(currentTracker.id) && (
                <button type="button" onClick={setYesterday}
                  title="Copy this tracker's last entry into today, then advance"
                  className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted">
                  <CopyPlus className="h-4 w-4" /> <span className="hidden sm:inline">Copy last</span>
                </button>
              )}
              <button type="button" onClick={skipCurrent}
                title="Skip this one for now and move on (you can unskip in the routine)"
                className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted">
                <EyeOff className="h-4 w-4" /> <span className="hidden sm:inline">Skip</span>
              </button>
            </>
          )}
          {/* Finish: always available so you can end the routine whenever you
              decide you're done. Secondary while there's a Next, primary once
              everything's handled. */}
          {next ? (
            <>
              <button type="button" onClick={finishRoutine}
                title="I'm done with this routine — finish now (you don't have to log everything)"
                className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted">
                <Flag className="h-4 w-4" /> <span className="hidden sm:inline">Finish</span>
              </button>
              <Link href={nextHref}
                className="flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-sm font-medium hover:opacity-90">
                <span className="truncate max-w-[7rem] sm:max-w-[9rem]">Next: {next.emoji} {next.label}</span>
                <ChevronRight className="h-4 w-4 shrink-0" />
              </Link>
            </>
          ) : (
            <button type="button" onClick={finishRoutine}
              title="Finish this routine"
              className="flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-sm font-medium hover:opacity-90">
              <CheckCircle2 className="h-4 w-4" /> <span className="truncate">All done ✓</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
