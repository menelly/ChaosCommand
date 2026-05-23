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
import { CheckCircle2, Circle, ArrowLeft, ChevronRight, EyeOff, Eye, MinusCircle, Undo2, CopyPlus, NotebookPen } from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { useUser } from "@/lib/contexts/user-context"
import { useDailyData, formatDateForStorage } from "@/lib/database"
import { getRoutine, type Routine } from "@/lib/routines/routines-config"
import { type TrackableTracker } from "@/lib/routines/trackable-registry"
import { loadAllTrackables, indexTrackables } from "@/lib/routines/load-trackables"
import { buildStatusMap, buildLastLoggedMap, type TrackerLoggedStatus } from "@/lib/routines/routine-status"
import { getClearedTrackers, markNothingToLog, unmarkNothingToLog } from "@/lib/routines/routine-cleared"
import { getSkippedTrackers, markSkipped, unmarkSkipped } from "@/lib/routines/routine-skipped"
import { getRunStart } from "@/lib/routines/routine-session"
import { copyLastEntryToToday, buildCopyableMap } from "@/lib/routines/copy-last-entry"

/** "today 3:14 PM" / "yesterday 9:02 AM" / "May 20, 3:14 PM" */
function formatLastLogged(ms: number): string {
  const d = new Date(ms)
  const now = new Date()
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
  if (d.toDateString() === now.toDateString()) return `today ${time}`
  const yest = new Date(now); yest.setDate(now.getDate() - 1)
  if (d.toDateString() === yest.toDateString()) return `yesterday ${time}`
  return `${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}, ${time}`
}

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
  const [lastLogged, setLastLogged] = useState<Record<string, number | null>>({}) // most-recent-ever per tracker
  const [copyable, setCopyable] = useState<Record<string, boolean>>({}) // has a clone-able prior entry

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
    // Fetch all history (no category filter — custom trackers store under
    // body/mind/custom, not 'tracker'). today's slice drives status; the full
    // set drives the "last logged …" hint.
    const allRecords = await getDateRange("2000-01-01", today)
    const records = allRecords.filter(r => r.date === today)
    const trackerKeys = resolved.map(t => ({ id: t.id, subcategory: t.subcategory, subcategoryPrefix: t.subcategoryPrefix }))
    // Scope "done" to the current run (since you tapped Run) so a routine can be
    // run multiple times a day. No run stamped (direct nav) → null → today-view.
    const since = getRunStart(pin, routineId)
    setStatus(buildStatusMap(records, trackerKeys, since))
    setLastLogged(buildLastLoggedMap(allRecords, trackerKeys))
    setCopyable(buildCopyableMap(allRecords, trackerKeys))
    setCleared(getClearedTrackers(pin, routineId, today))
    setSkipped(getSkippedTrackers(pin, routineId, today))
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
    // href may already carry a query (custom trackers: /custom-tracker?id=X) —
    // use & not ? so we don't make an invalid double-? URL ("Tracker Not Found").
    router.push(`${href}${href.includes("?") ? "&" : "?"}routine=${encodeURIComponent(routine.id)}`)
  const skip = (id: string) => {
    markSkipped(pin, routineId, today, id)
    setSkipped(prev => new Set(prev).add(id))
  }
  const unskip = (id: string) => {
    unmarkSkipped(pin, routineId, today, id)
    setSkipped(prev => { const n = new Set(prev); n.delete(id); return n })
  }
  const nothingToLog = (id: string) => {
    markNothingToLog(pin, routineId, today, id)
    setCleared(prev => new Set(prev).add(id))
    unmarkSkipped(pin, routineId, today, id)
    setSkipped(prev => { const n = new Set(prev); n.delete(id); return n })
  }
  const undoNothing = (id: string) => {
    unmarkNothingToLog(pin, routineId, today, id)
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
                <CardContent className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:gap-3">
                  <div className="flex items-center gap-3 min-w-0 sm:flex-1">
                    <span className="text-2xl shrink-0">{t.emoji}</span>
                    <div className="min-w-0">
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
                          <Circle className="h-3.5 w-3.5" />
                          {lastLogged[t.id]
                            ? `Last logged ${formatLastLogged(lastLogged[t.id]!)}`
                            : "Not logged yet"}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions — wrap full-width below the name on mobile, sit to the right on desktop */}
                  <div className="flex flex-wrap items-center gap-1.5 sm:justify-end sm:shrink-0">
                    {/* Pending: copy yesterday, log it, mark nothing-to-log, or skip */}
                    {isPending && (
                      <>
                        {!t.statusUnsupported && !t.copyUnsupported && copyable[t.id] && (
                          <Button size="sm" variant="ghost" className="gap-1 text-muted-foreground"
                            title="Copy your last entry into today — then tweak/remove it via the tracker's Edit/Delete"
                            onClick={() => copyYesterday(t)}>
                            <CopyPlus className="h-4 w-4" /> Copy last
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
                      </>
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

                    {/* Skipped: bring it back */}
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
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* End-of-routine: hop to the journal if you want to write it out */}
        <div className="mt-6 flex justify-center">
          <Button variant={complete ? "default" : "outline"} className="gap-2"
            onClick={() => router.push("/journal")}>
            <NotebookPen className="h-4 w-4" />
            {complete ? "All done — open Journal" : "Open Journal"}
          </Button>
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
