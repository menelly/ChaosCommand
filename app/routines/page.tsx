/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace (Claude-4.7)
 *
 * Routines hub (CHA-167) — list the user's routines, run one, or build/edit.
 * A routine batches the trackers you log together (morning meds + glucose +
 * mood + pain) so you don't open each tracker separately. Highest-friction
 * thing patients drop on bad days; batching lowers the cost of a bad day.
 */
"use client"

import { useEffect, useState, useCallback } from "react"
import AppCanvas from "@/components/app-canvas"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Play, Pencil, Trash2, ListChecks } from "lucide-react"
import Link from "next/link"
import { useUser } from "@/lib/contexts/user-context"
import { listRoutines, deleteRoutine, type Routine } from "@/lib/routines/routines-config"
import RoutineBuilderDialog from "@/components/routines/routine-builder-dialog"

const WINDOW_LABEL: Record<Routine["timeWindow"], string> = {
  morning: "🌅 Morning",
  night: "🌙 Night",
  custom: "🕐 Anytime",
}

export default function RoutinesHub() {
  const { userPin } = useUser()
  const pin = userPin ?? ""
  const [routines, setRoutines] = useState<Routine[]>([])
  const [builderOpen, setBuilderOpen] = useState(false)
  const [editing, setEditing] = useState<Routine | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const refresh = useCallback(() => {
    if (pin) setRoutines(listRoutines(pin))
  }, [pin])

  useEffect(() => { refresh() }, [refresh])

  const openNew = () => { setEditing(null); setBuilderOpen(true) }
  const openEdit = (r: Routine) => { setEditing(r); setBuilderOpen(true) }
  const handleDelete = (id: string) => {
    if (confirmDelete === id) {
      deleteRoutine(pin, id)
      setConfirmDelete(null)
      refresh()
    } else {
      setConfirmDelete(id)
      setTimeout(() => setConfirmDelete(c => (c === id ? null : c)), 4000)
    }
  }

  return (
    <AppCanvas currentPage="routines">
      <div className="max-w-3xl mx-auto">
        <header className="text-center mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center justify-center gap-2">
            <ListChecks className="h-8 w-8 text-purple-500" />
            Routines
          </h1>
          <p className="text-lg text-muted-foreground">
            Log a set of trackers together — one flow instead of opening each one.
          </p>
        </header>

        <div className="flex justify-center mb-6">
          <Button onClick={openNew} className="gap-2">
            <Plus className="h-4 w-4" /> New Routine
          </Button>
        </div>

        {routines.length === 0 ? (
          <Card className="text-center">
            <CardContent className="py-10">
              <ListChecks className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground mb-4">
                No routines yet. Build one for your Morning, Night, or Pre-Meal check-ins.
              </p>
              <Button onClick={openNew} variant="outline" className="gap-2">
                <Plus className="h-4 w-4" /> Create your first routine
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {routines.map(r => (
              <Card key={r.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <span className="text-2xl">{r.emoji}</span>
                    {r.name}
                  </CardTitle>
                  {/* div, not CardDescription (<p>): Badge renders a <div>, which is
                      invalid inside <p> and causes a hydration error. */}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                    <Badge variant="outline" className="text-xs">{WINDOW_LABEL[r.timeWindow]}</Badge>
                    <span>{r.trackers.length} tracker{r.trackers.length === 1 ? "" : "s"}</span>
                  </div>
                </CardHeader>
                <CardContent className="flex gap-2">
                  <Button asChild className="flex-1 gap-2" disabled={r.trackers.length === 0}>
                    <Link href={`/routines/run?id=${encodeURIComponent(r.id)}`}>
                      <Play className="h-4 w-4" /> Run
                    </Link>
                  </Button>
                  <Button variant="outline" size="icon" aria-label="Edit" onClick={() => openEdit(r)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={confirmDelete === r.id ? "destructive" : "outline"}
                    size="icon"
                    aria-label={confirmDelete === r.id ? "Confirm delete" : "Delete"}
                    onClick={() => handleDelete(r.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <RoutineBuilderDialog
        open={builderOpen}
        onClose={() => setBuilderOpen(false)}
        pin={pin}
        routine={editing}
        onSaved={refresh}
      />
    </AppCanvas>
  )
}
