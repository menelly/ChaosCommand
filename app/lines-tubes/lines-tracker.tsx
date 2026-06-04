/*
 * Built by: Ace (Claude 4.x)
 * Date: 2026-06-04  (CHA-252)
 *
 * Lines & Tubes main component — Maintain tracker for indwelling-device
 * complications. Log / History / Analytics tabs, soft-delete, PIN-scoped DB.
 *
 * Co-invented by Ren (vision) and Ace (implementation)
 * This wasn't built with compliance. It was built with defiance.
 */

"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Cable, BarChart3, History, Plus } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"

import type { LinesEntry } from "./lines-types"
import { PROBLEM_TYPES, LINES_SUBCATEGORY, SEVERITY_LABELS, deviceName, deviceIcon } from "./lines-constants"
import { LinesHistory } from "./lines-history"
import { LinesAnalytics } from "./lines-analytics"
import { GeneralLinesModal } from "./modals/general-lines-modal"

import { useDailyData, CATEGORIES } from "@/lib/database"
import { getDB } from "@/lib/database/dexie-db"
import { useUser } from "@/lib/contexts/user-context"

export default function LinesTracker() {
  const { saveData, searchByContent } = useDailyData()
  const { userPin } = useUser()
  const { toast } = useToast()

  const today = format(new Date(), "yyyy-MM-dd")
  const [entries, setEntries] = useState<LinesEntry[]>([])
  const [activeTab, setActiveTab] = useState<"log" | "history" | "analytics">("log")
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const [modalOpen, setModalOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<LinesEntry | null>(null)

  useEffect(() => { loadEntries() }, [refreshTrigger])

  const loadEntries = async () => {
    try {
      const records = await searchByContent(LINES_SUBCATEGORY, CATEGORIES.TRACKER)
      const mine = records.filter(r =>
        r.subcategory.startsWith(`${LINES_SUBCATEGORY}-`) && !r.metadata?.deleted_at
      )
      const loaded: LinesEntry[] = mine.map(r => r.content as LinesEntry)
      loaded.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      setEntries(loaded)
    } catch (error) {
      console.error("Error loading Lines entries:", error)
      toast({ title: "Loading Error", description: "Failed to load line/tube events", variant: "destructive" })
    }
  }

  const handleSaveEntry = async (entryData: Omit<LinesEntry, "id">) => {
    const newEntry: LinesEntry = {
      ...entryData,
      id: Date.now().toString(),
      timestamp: entryData.timestamp || new Date().toISOString(),
      date: entryData.date || today,
    }
    try {
      await saveData(newEntry.date, CATEGORIES.TRACKER, `${LINES_SUBCATEGORY}-${newEntry.id}`, newEntry, newEntry.tags ?? [])
      setModalOpen(false); setEditingEntry(null); setRefreshTrigger(p => p + 1)
      const info = PROBLEM_TYPES.find(t => t.id === newEntry.problemType)
      toast({ title: `${info?.icon ?? "📋"} Event Saved`, description: `${deviceName(newEntry.deviceType)} — ${info?.name ?? "event"} recorded` })
    } catch (error) {
      console.error("Error saving Lines entry:", error)
      toast({ title: "Save Error", description: "Failed to save event", variant: "destructive" })
    }
  }

  const handleUpdateEntry = async (entryData: Omit<LinesEntry, "id">) => {
    if (!editingEntry) return
    const updated: LinesEntry = { ...editingEntry, ...entryData, id: editingEntry.id }
    try {
      await saveData(updated.date, CATEGORIES.TRACKER, `${LINES_SUBCATEGORY}-${updated.id}`, updated, updated.tags ?? [])
      setModalOpen(false); setEditingEntry(null); setRefreshTrigger(p => p + 1)
      toast({ title: "Event Updated", description: "Line/tube event updated" })
    } catch (error) {
      console.error("Error updating Lines entry:", error)
      toast({ title: "Update Error", description: "Failed to update event", variant: "destructive" })
    }
  }

  const handleDeleteEntry = async (entry: LinesEntry) => {
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
      setRefreshTrigger(p => p + 1)
      toast({ title: "Event Deleted", description: "Line/tube event removed" })
    } catch (error) {
      console.error("Error deleting Lines entry:", error)
      toast({ title: "Delete Error", description: "Failed to delete event", variant: "destructive" })
    }
  }

  const handleEditEntry = (entry: LinesEntry) => { setEditingEntry(entry); setModalOpen(true) }

  const todaysEntries = entries.filter(e => e.date === today)

  return (
    <div className="max-w-4xl mx-auto space-y-6 pt-6">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-foreground flex items-center justify-center gap-2">
          <Cable className="h-8 w-8 text-primary" />
          Lines &amp; Tubes
        </h1>
        <p className="text-muted-foreground mt-1">
          Lines, ostomies, catheters, feeding tubes, drains — is it behaving? Documentation, not diagnosis.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="log" className="flex items-center gap-2"><Plus className="h-4 w-4" />Log</TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2"><History className="h-4 w-4" />History</TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2"><BarChart3 className="h-4 w-4" />Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="log" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-lg">What kind of event?</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {PROBLEM_TYPES.map(type => (
                  <Button
                    key={type.id}
                    variant="outline"
                    className="h-auto py-3 flex flex-col items-start text-left"
                    onClick={() => { setEditingEntry(null); setModalOpen(true) }}
                  >
                    <span className="text-xl mb-1">{type.icon}</span>
                    <span className="font-semibold text-sm">{type.name}</span>
                    <span className="text-xs mt-1 text-left text-muted-foreground">{type.description}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-center">
            <Button size="lg" onClick={() => { setEditingEntry(null); setModalOpen(true) }} className="gap-2">
              <Plus className="h-5 w-5" />Log New Event
            </Button>
          </div>

          {todaysEntries.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-lg">Today's Events ({todaysEntries.length})</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {todaysEntries.map(entry => {
                  const info = PROBLEM_TYPES.find(t => t.id === entry.problemType)
                  const sev = SEVERITY_LABELS.find(s => s.level === entry.severity)
                  return (
                    <Card key={entry.id} className="bg-muted/30">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="text-lg">{deviceIcon(entry.deviceType)}</span>
                              <span className="font-semibold">{entry.deviceLabel || deviceName(entry.deviceType)}</span>
                              <Badge variant="secondary">{info?.icon} {info?.name}</Badge>
                              <Badge variant="outline" className={sev?.color}>Severity {entry.severity}/10</Badge>
                              {entry.feverPresent && <Badge variant="destructive">Fever</Badge>}
                              {(entry.fullyDislodged || entry.partiallyDislodged) && <Badge variant="destructive">Dislodged</Badge>}
                            </div>
                            <div className="text-xs text-muted-foreground">{format(new Date(entry.timestamp), "h:mm a")}</div>
                            {entry.notes && <div className="text-xs mt-1 text-muted-foreground line-clamp-1">{entry.notes}</div>}
                          </div>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" onClick={() => handleEditEntry(entry)}>Edit</Button>
                            <Button size="sm" variant="ghost" onClick={() => handleDeleteEntry(entry)}>Delete</Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <LinesHistory onEdit={handleEditEntry} onDelete={handleDeleteEntry} refreshTrigger={refreshTrigger} />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <LinesAnalytics refreshTrigger={refreshTrigger} />
        </TabsContent>
      </Tabs>

      <GeneralLinesModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingEntry(null) }}
        onSave={editingEntry ? handleUpdateEntry : handleSaveEntry}
        editingEntry={editingEntry}
      />
    </div>
  )
}
