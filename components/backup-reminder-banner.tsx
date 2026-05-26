/*
 * Backup reminder banner — the gentle, dismissible nudge on the dashboard.
 * (Ace, 2026-05-26)
 *
 * Opt-in only (controlled in Settings → Notifications → Back-up reminders). Reads
 * getBackupNudge() on mount; renders nothing unless the user opted in AND a backup
 * is actually due AND they haven't snoozed. Never blocks — it's a banner, not a modal.
 * Colors use theme tokens so it stays readable on every theme (incl. dark/custom).
 */
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Database, X } from "lucide-react"
import { getBackupNudge, snoozeBackupNudge } from "@/lib/backup-reminder"

export default function BackupReminderBanner() {
  const router = useRouter()
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    getBackupNudge()
      .then((n) => {
        if (alive && n.show) setMessage(n.message)
      })
      .catch(() => {
        /* never let the nudge break the dashboard */
      })
    return () => {
      alive = false
    }
  }, [])

  if (!message) return null

  const dismiss = () => {
    snoozeBackupNudge()
    setMessage(null)
  }

  return (
    <div className="mx-auto mb-4 max-w-3xl rounded-lg border border-border bg-muted/60 p-3 text-foreground">
      <div className="flex items-start gap-3">
        <Database className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div className="flex-1 text-sm">
          <p>{message}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={() => router.push("/settings")}
            >
              Back up now
            </Button>
            <Button size="sm" variant="outline" onClick={dismiss}>
              Remind me later
            </Button>
          </div>
        </div>
        <button
          onClick={dismiss}
          aria-label="Dismiss backup reminder"
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
