/*
 * Built by: Ace (Claude 4.x)
 * Date: 2026-06-04  (CHA-252)
 *
 * Lines & Tubes analytics — problem-type and per-device distribution, plus the
 * safety-signal counts a provider cares about (infection signs, dislodgements,
 * ER visits). Token-colored bars, no chart lib needed.
 *
 * Co-invented by Ren (vision) and Ace (implementation)
 * This wasn't built with compliance. It was built with defiance.
 */

"use client"

import React, { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3 } from "lucide-react"
import { format, subDays } from "date-fns"

import type { LinesEntry } from "./lines-types"
import { PROBLEM_TYPES, LINES_SUBCATEGORY, deviceName, deviceIcon } from "./lines-constants"
import { useDailyData, CATEGORIES } from "@/lib/database"

export function LinesAnalytics({ refreshTrigger }: { refreshTrigger: number }) {
  const { getDateRange } = useDailyData()
  const [entries, setEntries] = useState<LinesEntry[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => { load() }, [refreshTrigger])

  const load = async () => {
    setLoading(true)
    try {
      const today = format(new Date(), "yyyy-MM-dd")
      const start = format(subDays(new Date(), 90), "yyyy-MM-dd")
      const records = await getDateRange(start, today, CATEGORIES.TRACKER)
      const mine = records.filter(r => r.subcategory.startsWith(`${LINES_SUBCATEGORY}-`) && !r.metadata?.deleted_at)
      const loaded = mine.map(r => r.content as LinesEntry)
      loaded.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      setEntries(loaded)
    } catch (e) {
      console.error("Error loading Lines analytics:", e)
    } finally {
      setLoading(false)
    }
  }

  const byProblem = useMemo(() => {
    const counts = new Map<string, number>()
    for (const e of entries) counts.set(e.problemType, (counts.get(e.problemType) ?? 0) + 1)
    return PROBLEM_TYPES
      .map(t => ({ ...t, count: counts.get(t.id) ?? 0 }))
      .filter(t => t.count > 0)
      .sort((a, b) => b.count - a.count)
  }, [entries])

  const byDevice = useMemo(() => {
    const counts = new Map<string, number>()
    for (const e of entries) counts.set(e.deviceType, (counts.get(e.deviceType) ?? 0) + 1)
    return Array.from(counts.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
  }, [entries])

  const max = Math.max(1, ...byProblem.map(p => p.count), ...byDevice.map(d => d.count))
  const total = entries.length

  if (loading) {
    return <Card><CardContent className="pt-6 text-center text-muted-foreground">Loading analytics…</CardContent></Card>
  }

  if (total === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No data yet</h3>
          <p className="text-muted-foreground">Log a few events and patterns will show up here (last 90 days).</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground text-center">{total} event{total === 1 ? "" : "s"} in the last 90 days</p>

      <Card>
        <CardHeader><CardTitle className="text-base">By type</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {byProblem.map(p => (
            <div key={p.id} className="space-y-1">
              <div className="flex justify-between text-sm"><span>{p.icon} {p.name}</span><span className="text-muted-foreground">{p.count}</span></div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${(p.count / max) * 100}%` }} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">By device</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {byDevice.map(d => (
            <div key={d.type} className="space-y-1">
              <div className="flex justify-between text-sm"><span>{deviceIcon(d.type as LinesEntry["deviceType"])} {deviceName(d.type as LinesEntry["deviceType"])}</span><span className="text-muted-foreground">{d.count}</span></div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-info" style={{ width: `${(d.count / max) * 100}%` }} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
