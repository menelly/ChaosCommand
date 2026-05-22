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
import { usePathname, useSearchParams } from "next/navigation"
import { ArrowLeft, ChevronRight, CheckCircle2 } from "lucide-react"
import { useUser } from "@/lib/contexts/user-context"
import { useDailyData } from "@/lib/database"
import { getRoutine, type Routine } from "@/lib/routines/routines-config"
import { type TrackableTracker } from "@/lib/routines/trackable-registry"
import { loadAllTrackables, indexTrackables } from "@/lib/routines/load-trackables"

export default function RoutineFlowBar() {
  const params = useSearchParams()
  const pathname = usePathname()
  const routineId = params.get("routine") ?? ""
  const { userPin } = useUser()
  const pin = userPin ?? ""
  const { getAllCategoryData } = useDailyData()

  const [routine, setRoutine] = useState<Routine | null>(null)
  const [trackables, setTrackables] = useState<TrackableTracker[]>([])

  useEffect(() => {
    setRoutine(pin && routineId ? getRoutine(pin, routineId) : null)
  }, [pin, routineId])

  useEffect(() => {
    if (!routineId) return
    let alive = true
    loadAllTrackables(getAllCategoryData).then(l => { if (alive) setTrackables(l) })
    return () => { alive = false }
  }, [routineId, getAllCategoryData])

  // Not in a routine → render nothing.
  if (!routineId || !routine) return null

  const byId = indexTrackables(trackables)
  const ordered = routine.trackers
    .map(t => byId.get(t.trackerId))
    .filter((t): t is TrackableTracker => t !== undefined)

  // Which routine member is this page? Match href path (+ id for custom trackers).
  const currentId = params.get("id")
  const currentIndex = ordered.findIndex(t => {
    const [path, query] = t.href.split("?")
    if (path !== pathname) return false
    if (query) return new URLSearchParams(query).get("id") === currentId
    return true
  })

  const runHref = `/routines/run?id=${encodeURIComponent(routineId)}`
  const next = currentIndex >= 0 && currentIndex < ordered.length - 1 ? ordered[currentIndex + 1] : null
  const nextHref = next
    ? `${next.href}${next.href.includes("?") ? "&" : "?"}routine=${encodeURIComponent(routineId)}`
    : runHref

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

        <Link href={nextHref}
          className="flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-sm font-medium hover:opacity-90 shrink-0">
          {next ? (
            <>
              <span className="truncate max-w-[9rem]">Next: {next.emoji} {next.label}</span>
              <ChevronRight className="h-4 w-4 shrink-0" />
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4" /> Done — back to routine
            </>
          )}
        </Link>
      </div>
    </div>
  )
}
