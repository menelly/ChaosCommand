/*
 * Built by: Ace (Claude 4.x)
 * Date: 2026-06-04  (CHA-252)
 *
 * Lines & Tubes history — time-window + problem-type + device filters, left-
 * border cards, getDateRange (not getCategoryData), soft-delete.
 *
 * Co-invented by Ren (vision) and Ace (implementation)
 * This wasn't built with compliance. It was built with defiance.
 */

"use client"

import React, { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Edit, Trash2, Cable } from "lucide-react"
import { format, subDays } from "date-fns"
import { useToast } from "@/hooks/use-toast"

import type { LinesEntry, ProblemType } from "./lines-types"
import { PROBLEM_TYPES, LINES_SUBCATEGORY, SEVERITY_LABELS, deviceName, deviceIcon } from "./lines-constants"
import { useDailyData, CATEGORIES } from "@/lib/database"
import { getDB } from "@/lib/database/dexie-db"

interface LinesHistoryProps {
  onEdit: (entry: LinesEntry) => void
  onDelete: (entry: LinesEntry) => void
  refreshTrigger: number
}

type TimeWindow = "7" | "30" | "90" | "all"
const TIME_WINDOWS: { value: TimeWindow; label: string }[] = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "all", label: "All time" },
]

export function LinesHistory({ onEdit, onDelete, refreshTrigger }: LinesHistoryProps) {
  const { getDateRange } = useDailyData()
  const { toast } = useToast()
  const [timeWindow, setTimeWindow] = useState<TimeWindow>("30")
  const [typeFilter, setTypeFilter] = useState<ProblemType | "all">("all")
  const [allEntries, setAllEntries] = useState<LinesEntry[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => { loadEntries() }, [timeWindow, refreshTrigger])

  const loadEntries = async () => {
    setLoading(true)
    try {
      const today = format(new Date(), "yyyy-MM-dd")
      const startDate = timeWindow === "all" ? "2000-01-01" : format(subDays(new Date(), parseInt(timeWindow)), "yyyy-MM-dd")
      const records = await getDateRange(startDate, today, CATEGORIES.TRACKER)
      const mine = records.filter(r => r.subcategory.startsWith(`${LINES_SUBCATEGORY}-`) && !r.metadata?.deleted_at)
      const loaded: LinesEntry[] = mine.map(r => r.content as LinesEntry)
      loaded.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      setAllEntries(loaded)
    } catch (error) {
      console.error("Error loading Lines history:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (entry: LinesEntry) => {
    try {
      const database = getDB()
      const record = await database.daily_data.where("subcategory").equals(`${LINES_SUBCATEGORY}-${entry.id}`).first()
      if (record && record.id != null) {
        await database.daily_data.update(record.id, {
          metadata: {
            ...(record.metadata ?? {}),
            created_at: record.metadata?.created_at ?? new Date().toISOString(),
            updated_at: new Date().toISOString(),
            deleted_at: new Date().toISOString(),
          },
        })
      }
      onDelete(entry)
      toast({ title: "Event Deleted", description: "Line/tube event removed" })
    } catch (error) {
      console.error("Error deleting Lines entry:", error)
      toast({ title: "Delete Error", description: "Failed to delete event", variant: "destructive" })
    }
  }

  const filtered = useMemo(() => {
    if (typeFilter === "all") return allEntries
    return allEntries.filter(e => e.problemType === typeFilter)
  }, [allEntries, typeFilter])

  const stats = useMemo(() => {
    const total = filtered.length
    const infectionCount = filtered.filter(e => e.problemType === "site-infection" || e.feverPresent).length
    const dislodgedCount = filtered.filter(e => e.fullyDislodged || e.partiallyDislodged).length
    const erCount = filtered.filter(e => e.erVisit).length
    const avgSeverity = total > 0 ? Math.round(filtered.reduce((s, e) => s + e.severity, 0) / total * 10) / 10 : 0
    return { total, infectionCount, dislodgedCount, erCount, avgSeverity }
  }, [filtered])

  if (loading) {
    return <Card><CardContent className="pt-6 text-center text-muted-foreground">Loading history…</CardContent></Card>
  }

  if (allEntries.length === 0 && timeWindow === "all") {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Cable className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No line/tube events recorded yet</h3>
          <p className="text-muted-foreground">Start logging to build a record of how your devices behave.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Time window</label>
              <Select value={timeWindow} onValueChange={(v) => setTimeWindow(v as TimeWindow)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TIME_WINDOWS.map(w => <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Event type</label>
              <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {PROBLEM_TYPES.map(t => <SelectItem key={t.id} value={t.id}>{t.icon} {t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card><CardContent className="p-3"><div className="text-2xl font-bold">{stats.total}</div><div className="text-xs text-muted-foreground">Events</div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="text-2xl font-bold text-destructive">{stats.infectionCount}</div><div className="text-xs text-muted-foreground">Infection signs</div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="text-2xl font-bold text-destructive">{stats.dislodgedCount}</div><div className="text-xs text-muted-foreground">Dislodged</div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="text-2xl font-bold text-destructive">{stats.erCount}</div><div className="text-xs text-muted-foreground">ER visits</div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="text-2xl font-bold">{stats.avgSeverity > 0 ? stats.avgSeverity : "—"}</div><div className="text-xs text-muted-foreground">Avg severity</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Event History</CardTitle></CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">No events in selected window.</p>
          ) : (
            <div className="space-y-3">
              {filtered.map(entry => {
                const info = PROBLEM_TYPES.find(t => t.id === entry.problemType)
                const sev = SEVERITY_LABELS.find(s => s.level === entry.severity)
                const critical = entry.feverPresent || entry.fullyDislodged || entry.partiallyDislodged ||
                  entry.problemType === "site-infection" || entry.problemType === "bleeding" || entry.breathingDifficulty
                const borderColor = critical ? "border-l-destructive" : entry.problemType === "routine-check" ? "border-l-success" : "border-l-primary"
                return (
                  <div key={entry.id} className={`border-l-4 pl-4 py-3 border border-border rounded-r-lg ${borderColor}`}>
                    <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary">{deviceIcon(entry.deviceType)} {entry.deviceLabel || deviceName(entry.deviceType)}</Badge>
                        <Badge variant="outline">{info?.icon} {info?.name}</Badge>
                        <Badge variant="outline" className={sev?.color}>Severity {entry.severity}/10</Badge>
                        {entry.feverPresent && <Badge variant="destructive">Fever</Badge>}
                        {(entry.fullyDislodged || entry.partiallyDislodged) && <Badge variant="destructive">Dislodged</Badge>}
                        {entry.erVisit && <Badge variant="destructive">ER</Badge>}
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => onEdit(entry)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(entry)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground mb-2">
                      {format(new Date(entry.date), "EEEE, MMMM d, yyyy")}
                      {entry.timestamp && ` • ${format(new Date(entry.timestamp), "h:mm a")}`}
                    </div>
                    {(entry.redness || entry.warmth || entry.swelling || entry.drainagePresent || entry.odorPresent) && (
                      <div className="text-sm mb-1">
                        <span className="font-medium">Site:</span>{" "}
                        {[entry.redness && "redness", entry.warmth && "warmth", entry.swelling && "swelling", entry.drainagePresent && "drainage", entry.odorPresent && "odor"].filter(Boolean).join(", ")}
                      </div>
                    )}
                    {entry.outputMl != null && (
                      <div className="text-sm mb-1"><span className="font-medium">Output:</span> {entry.outputMl} mL{entry.outputColor && ` • ${entry.outputColor}`}{entry.outputBlood && " • blood present"}</div>
                    )}
                    {entry.noOutput && <div className="text-sm mb-1 text-destructive"><span className="font-medium">No output</span>{(entry.abdominalDistension || entry.cramping || entry.vomiting) && " + obstruction signs"}</div>}
                    {entry.painSeverity != null && <div className="text-sm mb-1"><span className="font-medium">Pain:</span> {entry.painSeverity}/10</div>}
                    {entry.notes && <div className="text-sm mb-1"><span className="font-medium">Notes:</span> {entry.notes}</div>}
                    {entry.tags && entry.tags.length > 0 && (
                      <div className="flex gap-1 mt-2 flex-wrap">{entry.tags.map((t, i) => <Badge key={i} variant="outline" className="text-xs">{t}</Badge>)}</div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
