/*
 * Built by: Ace (Claude 4.x)
 * Date: 2026-06-04
 *
 * Maintain → Medications: the DAILY "taken today" view. Shows only meds the user
 * opted into their daily checklist (dailyMaintain flag, set with the friendly
 * toggle in the Manage med form). As-needed/emergency meds (EpiPen, Baqsimi)
 * live only in the Manage registry and never clutter this list.
 *
 * "Taken" state persists per-date in PIN-scoped prefs (med-taken-<date>). v2
 * (CHA-272) upgrades the stored shape from a bare list of ids to a map of
 * medId -> ISO timestamp, so we know WHEN each was taken — and adds a date
 * picker (log/review any day) plus a 7-day adherence strip. Old array-shaped
 * data still reads cleanly (treated as taken, no recorded time).
 *
 * Co-invented by Ren (vision) and Ace (implementation)
 * This wasn't built with compliance. It was built with defiance.
 */
"use client"

import { useState, useEffect, useMemo } from "react"
import AppCanvas from "@/components/app-canvas"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, ArrowRight, Pill, CheckCircle2, AlertCircle, Clock } from "lucide-react"
import { useMedicationTracker } from "@/lib/hooks/use-medication-tracker"
import { getPref, setPref } from "@/lib/prefs"
import { formatDateForStorage } from "@/lib/database"

function takenKey(date: string) { return `med-taken-${date}` }

// Read a date's taken-map, tolerating the old array-of-ids shape.
function readTakenMap(date: string): Record<string, string> {
  try {
    const saved = getPref(takenKey(date))
    if (!saved) return {}
    const parsed = JSON.parse(saved)
    if (Array.isArray(parsed)) {
      // Legacy: list of ids, no timestamps. Mark taken with empty time.
      const out: Record<string, string> = {}
      for (const id of parsed) out[id] = ""
      return out
    }
    return parsed && typeof parsed === "object" ? parsed : {}
  } catch {
    return {}
  }
}

function fmtTime(iso: string): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ""
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
}

function addDays(date: string, delta: number): string {
  const d = new Date(date + "T12:00:00")
  d.setDate(d.getDate() + delta)
  return formatDateForStorage(d)
}

function prettyDate(date: string, today: string): string {
  if (date === today) return "Today"
  if (date === addDays(today, -1)) return "Yesterday"
  const d = new Date(date + "T12:00:00")
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
}

export default function MaintainMedicationsPage() {
  const { medications, isLoading } = useMedicationTracker()
  const today = formatDateForStorage(new Date())
  const [selectedDate, setSelectedDate] = useState(today)
  const [takenMap, setTakenMap] = useState<Record<string, string>>({})
  const [ready, setReady] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  useEffect(() => {
    setTakenMap(readTakenMap(selectedDate))
    setReady(true)
  }, [selectedDate])

  const toggleTaken = (id: string) => {
    setTakenMap(prev => {
      const next = { ...prev }
      if (id in next) {
        delete next[id]
      } else {
        // Stamp the real time only when logging "today"; for a back-dated entry
        // we don't know the clock time, so store the date at noon as a marker.
        next[id] = selectedDate === today ? new Date().toISOString() : `${selectedDate}T12:00:00`
      }
      try { setPref(takenKey(selectedDate), JSON.stringify(next)) } catch {}
      return next
    })
  }

  // Daily meds = opted into the daily checklist AND not discontinued
  const dailyMeds = medications.filter(m => m.dailyMaintain && m.active !== false)
  const takenCount = dailyMeds.filter(m => m.id in takenMap).length
  const allTaken = dailyMeds.length > 0 && takenCount === dailyMeds.length

  // 7-day adherence strip (selectedDate going back 6 days)
  const history = useMemo(() => {
    if (dailyMeds.length === 0) return []
    const rows: { date: string; taken: number; total: number }[] = []
    for (let i = 0; i < 7; i++) {
      const d = addDays(selectedDate, -i)
      const map = readTakenMap(d)
      const taken = dailyMeds.filter(m => m.id in map).length
      rows.push({ date: d, taken, total: dailyMeds.length })
    }
    return rows
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, dailyMeds.length, showHistory])

  const refillInfo = (refillDate?: string): { days: number; label: string } | null => {
    if (!refillDate) return null
    const due = new Date(refillDate + 'T12:00:00')
    const now = new Date()
    const days = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    if (days < 0) return { days, label: 'Refill overdue' }
    if (days <= 7) return { days, label: days === 0 ? 'Refill due today' : `Refill in ${days}d` }
    return null
  }

  return (
    <AppCanvas currentPage="maintain">
      <div className="max-w-2xl mx-auto space-y-5">
        <header className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Pill className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Today's Medications</h1>
          </div>
          <p className="text-muted-foreground">Tap each one as you take it — resets every day</p>
        </header>

        {/* Date selector */}
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setSelectedDate(d => addDays(d, -1))}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-[8rem] text-center">{prettyDate(selectedDate, today)}</span>
          <Button
            variant="outline"
            size="sm"
            disabled={selectedDate >= today}
            onClick={() => setSelectedDate(d => (d < today ? addDays(d, 1) : d))}
          >
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        {ready && dailyMeds.length > 0 && (
          <div className={`rounded-lg border p-3 text-center text-sm font-medium ${allTaken ? 'bg-success/10 border-success/20 text-success' : 'bg-muted/40 border-border text-foreground'}`}>
            {allTaken ? (
              <span className="flex items-center justify-center gap-1.5"><CheckCircle2 className="h-4 w-4" /> All {dailyMeds.length} taken {selectedDate === today ? 'today' : 'this day'} — nice. 💜</span>
            ) : (
              <>{takenCount} of {dailyMeds.length} taken {selectedDate === today ? 'today' : 'this day'}</>
            )}
          </div>
        )}

        {ready && dailyMeds.length === 0 && !isLoading && (
          <Card>
            <CardContent className="py-8 text-center space-y-2 text-muted-foreground">
              <Pill className="h-8 w-8 mx-auto opacity-50" />
              <p className="font-medium text-foreground">No daily meds yet</p>
              <p className="text-sm">
                Add medications in <a href="/medications" className="underline text-primary">Manage → Medications</a> and
                flip on <span className="italic">"Add to my daily Maintain tracker"</span> for the ones you take on a schedule.
              </p>
            </CardContent>
          </Card>
        )}

        <div className="space-y-2">
          {dailyMeds.map(med => {
            const name = med.brandName || med.genericName || 'Medication'
            const takenAt = takenMap[med.id]
            const taken = med.id in takenMap
            const refill = refillInfo(med.refillDate)
            const timeStr = fmtTime(takenAt)
            return (
              <Card
                key={med.id}
                className={`cursor-pointer transition-colors ${taken ? 'bg-success/5 border-success/20' : 'hover:bg-accent/40'}`}
                onClick={() => toggleTaken(med.id)}
              >
                <CardContent className="py-3 flex items-center gap-3">
                  <Checkbox checked={taken} onCheckedChange={() => toggleTaken(med.id)} onClick={(e) => e.stopPropagation()} />
                  <div className="flex-1 min-w-0">
                    <div className={`font-medium ${taken ? 'line-through text-muted-foreground' : ''}`}>
                      {name}
                      {med.dose ? <span className="text-muted-foreground font-normal"> · {med.dose}</span> : null}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
                      {(med.time || med.requiresFood) && (
                        <span>{med.time}{med.time && med.requiresFood ? ' · ' : ''}{med.requiresFood ? 'with food' : ''}</span>
                      )}
                      {taken && timeStr && (
                        <span className="inline-flex items-center gap-1 text-success">
                          <Clock className="h-3 w-3" /> taken {timeStr}
                        </span>
                      )}
                    </div>
                  </div>
                  {refill && selectedDate === today && (
                    <span className={`shrink-0 text-xs inline-flex items-center gap-1 ${refill.days < 0 ? 'text-destructive' : 'text-warning'}`}>
                      <AlertCircle className="h-3.5 w-3.5" /> {refill.label}
                    </span>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* 7-day adherence history */}
        {ready && dailyMeds.length > 0 && (
          <div className="space-y-2">
            <button
              type="button"
              className="text-sm text-muted-foreground underline w-full text-center"
              onClick={() => setShowHistory(s => !s)}
            >
              {showHistory ? 'Hide' : 'Show'} last 7 days
            </button>
            {showHistory && (
              <Card>
                <CardContent className="py-3 space-y-1.5">
                  {history.map(row => {
                    const pct = row.total ? row.taken / row.total : 0
                    const tone = pct === 1 ? 'text-success' : pct === 0 ? 'text-muted-foreground' : 'text-warning'
                    return (
                      <div key={row.date} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{prettyDate(row.date, today)}</span>
                        <span className={`font-medium ${tone}`}>{row.taken}/{row.total}</span>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <div className="text-center">
          <a href="/medications" className="text-xs text-muted-foreground underline">Manage full medication list →</a>
        </div>

        <div className="flex justify-center pt-2">
          <Button variant="outline" asChild>
            <a href="/maintain"><ArrowLeft className="h-4 w-4 mr-2" />Back to Maintain</a>
          </Button>
        </div>
      </div>
    </AppCanvas>
  )
}
