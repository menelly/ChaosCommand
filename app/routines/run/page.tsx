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
import { CheckCircle2, Circle, ArrowLeft, ChevronRight, EyeOff } from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useUser } from "@/lib/contexts/user-context"
import { useDailyData, CATEGORIES, formatDateForStorage } from "@/lib/database"
import { getRoutine, type Routine } from "@/lib/routines/routines-config"
import { resolveTrackables } from "@/lib/routines/trackable-registry"
import { buildStatusMap, allLogged, type TrackerLoggedStatus } from "@/lib/routines/routine-status"

function RoutineRun() {
  const router = useRouter()
  const params = useSearchParams()
  const routineId = params.get("id") ?? ""
  const { userPin } = useUser()
  const pin = userPin ?? ""
  const { getDateRange } = useDailyData()

  const [routine, setRoutine] = useState<Routine | null>(null)
  const [status, setStatus] = useState<Record<string, TrackerLoggedStatus>>({})
  const [skipped, setSkipped] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (pin && routineId) setRoutine(getRoutine(pin, routineId))
  }, [pin, routineId])

  const loadStatus = useCallback(async () => {
    if (!routine) return
    const today = formatDateForStorage(new Date())
    const records = await getDateRange(today, today, CATEGORIES.TRACKER)
    setStatus(buildStatusMap(records, routine.trackers.map(t => t.trackerId)))
  }, [routine, getDateRange])

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

  const trackers = resolveTrackables(routine.trackers.map(t => t.trackerId))
  const complete = allLogged(status)

  const logNow = (href: string) =>
    router.push(`${href}?routine=${encodeURIComponent(routine.id)}`)
  const skip = (id: string) =>
    setSkipped(prev => new Set(prev).add(id))

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
              <CheckCircle2 className="h-4 w-4" /> All logged ✓
            </Badge>
          ) : (
            <p className="text-muted-foreground">
              {Object.values(status).filter(s => s.loggedToday).length} of {trackers.length} logged today
            </p>
          )}
        </header>

        <div className="space-y-2">
          {trackers.map(t => {
            const s = status[t.id] ?? { loggedToday: false, lastLoggedLabel: null }
            const isSkipped = skipped.has(t.id)
            return (
              <Card key={t.id} className={isSkipped ? "opacity-50" : ""}>
                <CardContent className="flex items-center gap-3 py-3">
                  <span className="text-2xl shrink-0">{t.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{t.label}</div>
                    {s.loggedToday ? (
                      <div className="text-xs text-green-600 flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Logged today{s.lastLoggedLabel ? `: ${s.lastLoggedLabel}` : ""}
                      </div>
                    ) : isSkipped ? (
                      <div className="text-xs text-muted-foreground">Skipped</div>
                    ) : (
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Circle className="h-3.5 w-3.5" /> Not logged today
                      </div>
                    )}
                  </div>
                  {!s.loggedToday && !isSkipped && (
                    <>
                      <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => skip(t.id)}>
                        <EyeOff className="h-4 w-4" />
                      </Button>
                      <Button size="sm" className="gap-1" onClick={() => logNow(t.href)}>
                        Log now <ChevronRight className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  {(s.loggedToday || isSkipped) && (
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => logNow(t.href)}>
                      {s.loggedToday ? "Log again" : "Log"} <ChevronRight className="h-4 w-4" />
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
