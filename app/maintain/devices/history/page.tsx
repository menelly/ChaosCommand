/*
 * Built by: Ace (Claude 4.x)
 * Date: 2026-06-04  (CHA-272 devices)
 *
 * Device & Timer change-log: every start / restart / stop, with how long each
 * device ACTUALLY lasted vs expected. The clinically + financially useful bit is
 * the early-failure tally — "your Dexcoms average 7.8 days and 3 died early" —
 * which, paired with the serial/lot on the card, is exactly what you hand a
 * manufacturer to get a free replacement.
 *
 * Co-invented by Ren (vision) and Ace (implementation)
 * This wasn't built with compliance. It was built with defiance.
 */
"use client"

import { useState, useEffect, useMemo } from "react"
import AppCanvas from "@/components/app-canvas"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, History as HistoryIcon, AlertTriangle } from "lucide-react"
import { format, subDays } from "date-fns"
import { useDailyData, CATEGORIES, formatDateForStorage } from "@/lib/database"
import { DEVICE_LOG_SUBCATEGORY, getDeviceConfig, type DeviceEvent } from "../device-types"

type Window = "30" | "90" | "365" | "all"
const WINDOWS: { value: Window; label: string }[] = [
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "365", label: "Last year" },
  { value: "all", label: "All time" },
]

const ACTION_LABEL: Record<DeviceEvent["action"], string> = {
  started: "Started",
  restarted: "Changed",
  stopped: "Stopped",
}

export default function DeviceHistoryPage() {
  const { getDateRange } = useDailyData()
  const [window, setWindow] = useState<Window>("90")
  const [events, setEvents] = useState<DeviceEvent[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => { load() }, [window])

  const load = async () => {
    setLoading(true)
    try {
      const today = formatDateForStorage(new Date())
      const start = window === "all" ? "2000-01-01" : format(subDays(new Date(), parseInt(window)), "yyyy-MM-dd")
      const rows = await getDateRange(start, today, CATEGORIES.HEALTH)
      const all: DeviceEvent[] = []
      for (const r of rows as any[]) {
        if (r.subcategory === DEVICE_LOG_SUBCATEGORY && Array.isArray(r.content) && !r.metadata?.deleted_at) {
          all.push(...(r.content as DeviceEvent[]))
        }
      }
      all.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      setEvents(all)
    } catch (e) {
      console.error("Error loading device history:", e)
      setEvents([])
    } finally {
      setLoading(false)
    }
  }

  // Per-device-type stats from events that recorded an actual duration.
  const stats = useMemo(() => {
    const byType = new Map<string, { type: string; name: string; durations: number[]; early: number }>()
    for (const e of events) {
      if (e.actualDays == null) continue
      const key = e.type === "custom" ? `custom:${e.customName || e.name}` : e.type
      let s = byType.get(key)
      if (!s) { s = { type: e.type, name: getDeviceConfig(e.type, e.customName).name, durations: [], early: 0 }; byType.set(key, s) }
      s.durations.push(e.actualDays)
      if (e.earlyFailure) s.early++
    }
    return [...byType.values()].map(s => ({
      ...s,
      changes: s.durations.length,
      avg: s.durations.length ? Math.round((s.durations.reduce((a, b) => a + b, 0) / s.durations.length) * 10) / 10 : 0,
    })).sort((a, b) => b.early - a.early || b.changes - a.changes)
  }, [events])

  const earlyTotal = events.filter(e => e.earlyFailure).length

  return (
    <AppCanvas currentPage="maintain">
      <div className="max-w-2xl mx-auto space-y-5">
        <header className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <HistoryIcon className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Device History</h1>
          </div>
          <p className="text-muted-foreground">Every change, how long it lasted, and what died early</p>
        </header>

        <div className="flex justify-center">
          <Select value={window} onValueChange={(v) => setWindow(v as Window)}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>{WINDOWS.map(w => <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        {loading ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">Loading…</CardContent></Card>
        ) : events.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center space-y-2 text-muted-foreground">
              <HistoryIcon className="h-8 w-8 mx-auto opacity-50" />
              <p className="font-medium text-foreground">No device changes logged yet</p>
              <p className="text-sm">Start, restart, or stop a timer in <a href="/maintain/devices" className="underline text-primary">Devices &amp; Timers</a> and the log builds here.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {earlyTotal > 0 && (
              <Card className="bg-warning/10 border-warning/30">
                <CardContent className="p-4 text-sm flex gap-2">
                  <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                  <div>
                    <span className="font-medium text-warning">{earlyTotal} early failure{earlyTotal === 1 ? "" : "s"} in this window.</span>{" "}
                    <span className="text-muted-foreground">Those are warranty candidates — grab the serial/lot off the device card and call the manufacturer.</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Per-device stats */}
            <Card>
              <CardHeader><CardTitle className="text-base">By device</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {stats.map(s => {
                  const cfg = getDeviceConfig(s.type)
                  return (
                    <div key={s.name} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2"><span>{cfg.icon}</span> {s.name}</span>
                      <span className="text-muted-foreground">
                        {s.changes} change{s.changes === 1 ? "" : "s"} · avg {s.avg}d
                        {s.early > 0 && <span className="text-destructive"> · {s.early} early</span>}
                      </span>
                    </div>
                  )
                })}
              </CardContent>
            </Card>

            {/* Event log */}
            <Card>
              <CardHeader><CardTitle className="text-base">Change log</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {events.map(e => {
                  const cfg = getDeviceConfig(e.type, e.customName)
                  return (
                    <div key={e.id} className={`border-l-4 pl-3 py-2 border border-border rounded-r-lg ${e.earlyFailure ? "border-l-destructive" : "border-l-primary"}`}>
                      <div className="flex items-center justify-between flex-wrap gap-1">
                        <span className="font-medium text-sm flex items-center gap-1.5"><span>{cfg.icon}</span>{e.name}</span>
                        <Badge variant="outline" className="text-xs">{ACTION_LABEL[e.action]}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {new Date(e.at).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                        {e.actualDays != null && (
                          <> · lasted {e.actualDays}d{e.expectedDays ? ` (expected ${e.expectedDays}d)` : ""}</>
                        )}
                      </div>
                      {e.earlyFailure && (
                        <div className="text-xs text-destructive mt-0.5 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" /> died early — warranty candidate
                        </div>
                      )}
                      {(e.serialNumber || e.lotNumber) && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {e.serialNumber && <>SN: {e.serialNumber}</>}{e.serialNumber && e.lotNumber && " · "}{e.lotNumber && <>Lot: {e.lotNumber}</>}
                        </div>
                      )}
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          </>
        )}

        <div className="flex justify-center pt-2">
          <Button variant="outline" asChild>
            <a href="/maintain/devices"><ArrowLeft className="h-4 w-4 mr-2" />Back to Devices &amp; Timers</a>
          </Button>
        </div>
      </div>
    </AppCanvas>
  )
}
