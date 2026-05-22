/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace (Claude-4.7)
 *
 * Run a routine (CHA-167) — /routines/run?id=<routineId>. Shows each tracker as
 * a card in the user's order with a "logged today ✓ 7:42 AM" / "Not logged"
 * indicator, a "Log now" button that opens the tracker (carrying ?routine=<id>
 * so the tracker can auto-open + autofill in a later phase), a "Skip for now"
 * dismiss, and an "All logged ✓" badge when the routine is complete.
 *
 * useSearchParams is wrapped in Suspense so the page is happy under static export.
 */
"use client"

import { Suspense, useCallback, useEffect, useState } from "react"
import AppCanvas from "@/components/app-canvas"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, Circle, ArrowLeft, ChevronRight, EyeOff, Eye, MinusCircle, Undo2, CopyPlus } from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { useUser } from "@/lib/contexts/user-context"
import { useDailyData, formatDateForStorage } from "@/lib/database"
import { getRoutine, type Routine } from "@/lib/routines/routines-config"
import { type TrackableTracker } from "@/lib/routines/trackable-registry"
import { loadAllTrackables, indexTrackables } from "@/lib/routines/load-trackables"
import { buildStatusMap, type TrackerLoggedStatus } from "@/lib/routines/routine-status"
import { getClearedTrackers, markNothingToLog, unmarkNothingToLog } from "@/lib/routines/routine-cleared"
import { getSkippedTrackers, markSkipped, unmarkSkipped } from "@/lib/routines/routine-skipped"
import { copyLastEntryToToday } from "@/lib/routines/copy-last-entry"

function RoutineRun() {
  const router = useRouter()
  const params = useSearchParams()
  const routineId = params.get("id") ?? ""
  const { userPin } = useUser()
  const pin = userPin ?? ""
  const { getDateRange, getAllCategoryData, saveData } = useDailyData()
  const { toast } = useToast()

  const today = formatDateForStorage(new Date())
  const [routine, setRoutine] = useState<Routine | null>(null)
  const [trackables, setTrackables] = useState<TrackableTracker[]>([])
  const [status, setStatus] = useState<Record<string, TrackerLoggedStatus>>({})
  const [cleared, setCleared] = useState<Set<string>>(new Set()) // "nothing to log today" — persisted
  const [skipped, setSkipped] = useState<Set<string>>(new Set())  // "hide for now" — session only

  useEffect(() => {
    if (pin && routineId) setRoutine(getRoutine(pin, routineId))
  }, [pin, routineId])

  // Load the full tracker set (built-in + custom) so custom routine members resolve.
  useEffect(() => {
    let alive = true
    loadAllTrackables(getAllCategoryData).then(list => { if (alive) setTrackables(list) })
    return () => { alive = false }
  }, [getAllCategoryData])

  // Resolve this routine's members (preserving order, dropping unknowns).
  const trackableById = indexTrackables(trackables)
  const resolved = routine
    ? routine.trackers
        .map(t => trackableById.get(t.trackerId))
        .filter((t): t is TrackableTracker => t !== undefined)
    : []

  const loadStatus = useCallback(async () => {
    if (!routine || resolved.length === 0) return
    // No category filter — custom trackers store under body/mind/custom, not 'tracker'.
    const records = await getDateRange(today, today)
    setStatus(buildStatusMap(records, resolved.map(t => ({ id: t.id, subcategory: t.subcategory }))))
    setCleared(getClearedTrackers(pin, today))
    setSkipped(getSkippedTrackers(pin, today))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routine, trackables, getDateRange, pin, today])

  useEffect(() => { loadStatus() }, [loadStatus])

  // Refresh "logged today" when the user comes back from a tracker page.
  useEffect(() => {
    const onFocus = () => loadStatus()
    window.addEventListener("focus", onFocus)
    document.addEventListener("visibilitychange", onFocus)
    return () => {
      window.removeEventListener("focus", onFocus)
      document.removeEventListener("visibilitychange", onFocus)
    }
  }, [loadStatus])

  if (!routine) {
    return (
      <AppCanvas currentPage="routines">
        <div className="max-w-2xl mx-auto text-center py-16">
          <p className="text-muted-foreground mb-4">Routine not found.</p>
          <Button asChild variant="outline"><Link href="/routines"><ArrowLeft className="h-4 w-4 mr-2" />Back to Routines</Link></Button>
        </div>
      </AppCanvas>
    )
  }

  const trackers = resolved
  // "Done" = either logged real data OR consciously marked "nothing to log today".
  const doneCount = trackers.filter(t => status[t.id]?.loggedToday || cleared.has(t.id)).length
  const complete = trackers.length > 0 && doneCount === trackers.length

  const logNow = (href: string) =>
    router.push(`${href}?routine=${encodeURIComponent(routine.id)}`)
  const skip = (id: string) => {
    markSkipped(pin, today, id)
    setSkipped(prev => new Set(prev).add(id))
  }
  const unskip = (id: string) => {
    unmarkSkipped(pin, today, id)
    setSkipped(prev => { const n = new Set(prev); n.delete(id); return n })
  }
  const nothingToLog = (id: string) => {
    markNothingToLog(pin, today, id)
    setCleared(prev => new Set(prev).add(id))
    unmarkSkipped(pin, today, id)
    setSkipped(prev => { const n = new Set(prev); n.delete(id); return n })
  }
  const undoNothing = (id: string) => {
    unmarkNothingToLog(pin, today, id)
    setCleared(prev => { const n = new Set(prev); n.delete(id); return n })
  }
  const copyYesterday = async (t: TrackableTracker) => {
    const res = await copyLastEntryToToday(t, today, getDateRange, saveData)
    if (res.ok) {
      toast({ title: `${t.emoji} ${t.label} — copied`, description: `Cloned your entry from ${res.srcDate}. Tweak or remove it on the tracker's Edit/Delete.` })
      loadStatus()
    } else if (res.reason === "no-prior") {
      toast({ title: "Nothing to copy yet", description: `No earlier ${t.label} entry to copy from.`, variant: "destructive" })
    } else {
      toast({ title: "Couldn't copy", description: `Open ${t.label} and log it directly.`, variant: "destructive" })
    }
  }

  return (
    <AppCanvas currentPage="routines">
      <div className="max-w-2xl mx-auto">
        <div className="mb-4">
          <Button asChild variant="ghost" size="sm" className="gap-1 -ml-2">
            <Link href="/routines"><ArrowLeft className="h-4 w-4" /> Routines</Link>
          </Button>
        </div>

        <header className="text-center mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-1 flex items-center justify-center gap-2">
            <span className="text-3xl">{routine.emoji}</span> {routine.name}
          </h1>
          {complete ? (
            <Badge className="bg-green-600 hover:bg-green-600 gap-1 mt-2">
              <CheckCircle2 className="h-4 w-4" /> All done ✓
            </Badge>
          ) : (
            <p className="text-muted-foreground">{doneCount} of {trackers.length} done today</p>
          )}
        </header>

        <div className="space-y-2">
          {trackers.map(t => {
            const s = status[t.id] ?? { loggedToday: false, lastLoggedLabel: null }
            const isNothing = cleared.has(t.id)
            const isSkipped = !s.loggedToday && !isNothing && skipped.has(t.id)
            const isPending = !s.loggedToday && !isNothing && !isSkipped
            return (
              <Card key={t.id} className={isSkipped ? "opacity-60" : ""}>
                <CardContent className="flex items-center gap-3 py-3">
                  <span className="text-2xl shrink-0">{t.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{t.label}</div>
                    {s.loggedToday ? (
                      <div className="text-xs text-green-600 flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Logged today{s.lastLoggedLabel ? `: ${s.lastLoggedLabel}` : ""}
                      </div>
                    ) : isNothing ? (
                      <div className="text-xs text-green-600 flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Nothing to log today
                      </div>
                    ) : isSkipped ? (
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <EyeOff className="h-3.5 w-3.5" /> Skipped — hidden for now
                      </div>
                    ) : t.statusUnsupported ? (
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Circle className="h-3.5 w-3.5" /> Log on the tracker · ✓ status coming soon
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Circle className="h-3.5 w-3.5" /> Not logged today
                      </div>
                    )}
                  </div>

                  {/* Pending: copy yesterday, log it, mark nothing-to-log, or skip */}
                  {isPending && (
                    <div className="flex flex-wrap items-center justify-end gap-1.5 shrink-0">
                      {!t.statusUnsupported && (
                        <Button size="sm" variant="ghost" className="gap-1 text-muted-foreground"
                          title="Copy your last entry into today — then tweak/remove it via the tracker's Edit/Delete"
                          onClick={() => copyYesterday(t)}>
                          <CopyPlus className="h-4 w-4" /> Copy yest.
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="gap-1 text-muted-foreground"
                        title="I checked — nothing to report today. Counts as done."
                        onClick={() => nothingToLog(t.id)}>
                        <MinusCircle className="h-4 w-4" /> Nothing today
                      </Button>
                      <Button size="sm" variant="ghost" className="text-muted-foreground"
                        title="Hide for now — doesn't count, you can unskip" onClick={() => skip(t.id)}>
                        <EyeOff className="h-4 w-4" />
                      </Button>
                      <Button size="sm" className="gap-1" onClick={() => logNow(t.href)}>
                        Log now <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}

                  {/* Nothing-to-log: undo, or log after all */}
                  {isNothing && (
                    <>
                      <Button size="sm" variant="ghost" className="gap-1 text-muted-foreground"
                        title="Undo — I do have something to log" onClick={() => undoNothing(t.id)}>
                        <Undo2 className="h-4 w-4" /> Undo
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1" onClick={() => logNow(t.href)}>
                        Log <ChevronRight className="h-4 w-4" />
                      </Button>
                    </>
                  )}

                  {/* Skipped: clear, undo-skip, or log */}
                  {isSkipped && (
                    <Button size="sm" variant="outline" className="gap-1"
                      title="Bring this back" onClick={() => unskip(t.id)}>
                      <Eye className="h-4 w-4" /> Unskip
                    </Button>
                  )}

                  {/* Logged: log again */}
                  {s.loggedToday && (
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => logNow(t.href)}>
                      Log again <ChevronRight className="h-4 w-4" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </AppCanvas>
  )
}

export default function RoutineRunPage() {
  return (
    <Suspense fallback={null}>
      <RoutineRun />
    </Suspense>
  )
}
