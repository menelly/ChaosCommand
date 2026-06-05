/*
 * Built by: Ace (Claude 4.x)
 * Date: 2026-06-04  (CHA-272)
 *
 * Medication adherence — the REAL history + analytics. Reads the durable
 * daily_data adherence records (written by the daily checklist) across a time
 * window and answers the clinically-load-bearing question: which meds am I
 * actually missing, how often, and on which dates? "Skipped Abilify 9 times
 * since February" becomes visible instead of buried — and it's the same data
 * the PDF and the Patterns correlation engine read.
 *
 * Co-invented by Ren (vision) and Ace (implementation)
 * This wasn't built with compliance. It was built with defiance.
 */
"use client"

import { useState, useEffect, useMemo } from "react"
import AppCanvas from "@/components/app-canvas"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Pill, TrendingUp, AlertTriangle } from "lucide-react"
import { format, subDays } from "date-fns"
import { useDailyData, CATEGORIES, formatDateForStorage } from "@/lib/database"
import {
  ADHERENCE_SUBCATEGORY,
  parseAdherence,
  summarizeAdherence,
  type AdherenceRecord,
} from "@/lib/medications/adherence"

type Window = "7" | "30" | "90" | "all"
const WINDOWS: { value: Window; label: string }[] = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "all", label: "All time" },
]

function rateColor(rate: number): string {
  if (rate >= 0.9) return "text-success"
  if (rate >= 0.7) return "text-warning"
  return "text-destructive"
}
function barColor(rate: number): string {
  if (rate >= 0.9) return "bg-success"
  if (rate >= 0.7) return "bg-warning"
  return "bg-destructive"
}

function prettyDate(d: string): string {
  return new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export default function MedAdherenceHistoryPage() {
  const { getDateRange } = useDailyData()
  const [window, setWindow] = useState<Window>("30")
  const [records, setRecords] = useState<AdherenceRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => { load() }, [window])

  const load = async () => {
    setLoading(true)
    try {
      const today = formatDateForStorage(new Date())
      const start = window === "all" ? "2000-01-01" : format(subDays(new Date(), parseInt(window)), "yyyy-MM-dd")
      const rows = await getDateRange(start, today, CATEGORIES.TRACKER)
      const adherence = rows
        .filter((r: any) => r.subcategory === ADHERENCE_SUBCATEGORY && !r.metadata?.deleted_at)
        .map((r: any) => parseAdherence(r.content))
        .filter(Boolean) as AdherenceRecord[]
      setRecords(adherence)
    } catch (e) {
      console.error("Error loading adherence history:", e)
      setRecords([])
    } finally {
      setLoading(false)
    }
  }

  const { perMed, overallRate, loggedDays } = useMemo(() => summarizeAdherence(records), [records])

  return (
    <AppCanvas currentPage="maintain">
      <div className="max-w-2xl mx-auto space-y-5">
        <header className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Adherence History</h1>
          </div>
          <p className="text-muted-foreground">What you're actually taking — and what's slipping</p>
        </header>

        <div className="flex justify-center">
          <Select value={window} onValueChange={(v) => setWindow(v as Window)}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>{WINDOWS.map(w => <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        {loading ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">Loading…</CardContent></Card>
        ) : loggedDays === 0 ? (
          <Card>
            <CardContent className="py-8 text-center space-y-2 text-muted-foreground">
              <Pill className="h-8 w-8 mx-auto opacity-50" />
              <p className="font-medium text-foreground">No adherence logged in this window yet</p>
              <p className="text-sm">Check meds off in <a href="/maintain/medications" className="underline text-primary">Today's Medications</a> and your history builds here.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Summary */}
            <div className="grid grid-cols-3 gap-3">
              <Card><CardContent className="p-3 text-center">
                <div className={`text-2xl font-bold ${rateColor(overallRate)}`}>{Math.round(overallRate * 100)}%</div>
                <div className="text-xs text-muted-foreground">Overall</div>
              </CardContent></Card>
              <Card><CardContent className="p-3 text-center">
                <div className="text-2xl font-bold">{loggedDays}</div>
                <div className="text-xs text-muted-foreground">Days logged</div>
              </CardContent></Card>
              <Card><CardContent className="p-3 text-center">
                <div className="text-2xl font-bold">{perMed.length}</div>
                <div className="text-xs text-muted-foreground">Meds tracked</div>
              </CardContent></Card>
            </div>

            {/* Per-med — worst adherence first (the clinically interesting end) */}
            <Card>
              <CardHeader><CardTitle className="text-base">By medication</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {perMed.map(m => {
                  const pct = Math.round(m.rate * 100)
                  const isOpen = expanded === m.id
                  return (
                    <div key={m.id} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{m.name}</span>
                        <span className={`font-semibold ${rateColor(m.rate)}`}>
                          {pct}% · {m.takenDays}/{m.expectedDays}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div className={`h-full ${barColor(m.rate)}`} style={{ width: `${pct}%` }} />
                      </div>
                      {m.missedDates.length > 0 && (
                        <button
                          type="button"
                          className="text-xs text-muted-foreground underline flex items-center gap-1"
                          onClick={() => setExpanded(isOpen ? null : m.id)}
                        >
                          <AlertTriangle className="h-3 w-3 text-warning" />
                          missed {m.missedDates.length} {m.missedDates.length === 1 ? "day" : "days"} {isOpen ? "▲" : "▼"}
                        </button>
                      )}
                      {isOpen && m.missedDates.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {[...m.missedDates].reverse().map(d => (
                            <span key={d} className="text-xs px-1.5 py-0.5 rounded bg-destructive/10 text-destructive border border-destructive/20">
                              {prettyDate(d)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </CardContent>
            </Card>

            {/* Correlation pointer — the real payoff lives in Patterns */}
            <Card className="bg-info/10 border-info/30">
              <CardContent className="p-4 text-sm">
                <p className="font-medium text-info mb-1">Want to know what a missed med does to you?</p>
                <p className="text-muted-foreground">
                  This adherence data feeds the <a href="/patterns" className="underline text-primary">Patterns</a> engine —
                  so "a skipped dose → worse symptoms the next day" can surface as a real correlation against your symptom trackers, not a hunch.
                </p>
              </CardContent>
            </Card>

            <p className="text-xs text-muted-foreground text-center px-4">
              Rates count only days you logged and only meds that were on your daily list that day — so adding a med later never retroactively dings it.
            </p>
          </>
        )}

        <div className="flex justify-center pt-2">
          <Button variant="outline" asChild>
            <a href="/maintain/medications"><ArrowLeft className="h-4 w-4 mr-2" />Back to Today's Medications</a>
          </Button>
        </div>
      </div>
    </AppCanvas>
  )
}
