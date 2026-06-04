/*
 * Built by: Ace (Claude 4.x)
 * Date: 2026-06-04
 *
 * Maintain → Medications: the DAILY "taken today" view. Shows only meds the user
 * opted into their daily checklist (dailyMaintain flag, set with the friendly
 * toggle in the Manage med form). As-needed/emergency meds (EpiPen, Baqsimi)
 * live only in the Manage registry and never clutter this list.
 *
 * "Taken today" state persists per-date in PIN-scoped prefs (med-taken-<date>),
 * so it resets naturally each day. Same medication data as the registry — this
 * is just the daily-action lens (Maintain) vs the record lens (Manage).
 *
 * Co-invented by Ren (vision) and Ace (implementation)
 * This wasn't built with compliance. It was built with defiance.
 */
"use client"

import { useState, useEffect } from "react"
import AppCanvas from "@/components/app-canvas"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, Pill, CheckCircle2, AlertCircle } from "lucide-react"
import { useMedicationTracker } from "@/lib/hooks/use-medication-tracker"
import { getPref, setPref } from "@/lib/prefs"
import { formatDateForStorage } from "@/lib/database"

function takenKey(date: string) { return `med-taken-${date}` }

export default function MaintainMedicationsPage() {
  const { medications, isLoading } = useMedicationTracker()
  const today = formatDateForStorage(new Date())
  const [takenIds, setTakenIds] = useState<Set<string>>(new Set())
  const [ready, setReady] = useState(false)

  useEffect(() => {
    try {
      const saved = getPref(takenKey(today))
      if (saved) setTakenIds(new Set(JSON.parse(saved)))
    } catch { /* ignore */ }
    setReady(true)
  }, [today])

  const toggleTaken = (id: string) => {
    setTakenIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      try { setPref(takenKey(today), JSON.stringify([...next])) } catch {}
      return next
    })
  }

  // Daily meds = opted into the daily checklist AND not discontinued
  const dailyMeds = medications.filter(m => m.dailyMaintain && m.active !== false)
  const takenCount = dailyMeds.filter(m => takenIds.has(m.id)).length
  const allTaken = dailyMeds.length > 0 && takenCount === dailyMeds.length

  // Refill countdown helper
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

        {ready && dailyMeds.length > 0 && (
          <div className={`rounded-lg border p-3 text-center text-sm font-medium ${allTaken ? 'bg-success/10 border-success/20 text-success' : 'bg-muted/40 border-border text-foreground'}`}>
            {allTaken ? (
              <span className="flex items-center justify-center gap-1.5"><CheckCircle2 className="h-4 w-4" /> All {dailyMeds.length} taken today — nice. 💜</span>
            ) : (
              <>{takenCount} of {dailyMeds.length} taken today</>
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
            const taken = takenIds.has(med.id)
            const refill = refillInfo(med.refillDate)
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
                    {(med.time || med.requiresFood) && (
                      <div className="text-xs text-muted-foreground">
                        {med.time}{med.time && med.requiresFood ? ' · ' : ''}{med.requiresFood ? 'with food' : ''}
                      </div>
                    )}
                  </div>
                  {refill && (
                    <span className={`shrink-0 text-xs inline-flex items-center gap-1 ${refill.days < 0 ? 'text-destructive' : 'text-warning'}`}>
                      <AlertCircle className="h-3.5 w-3.5" /> {refill.label}
                    </span>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>

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
