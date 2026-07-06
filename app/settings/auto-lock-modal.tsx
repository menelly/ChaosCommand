/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace
 *
 * Auto-lock-in-background settings modal. Used to be an inline card in the
 * settings grid, which stretched full-width (toggle + two paragraphs of
 * explanation) and read awkwardly next to the collapsed modal-tiles —
 * especially on mobile. Now it opens as a modal like every other setting.
 * Self-contained: loads and saves the per-profile pref itself.
 */
"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Lock } from "lucide-react"
import { getPref, setPref } from "@/lib/prefs"

interface AutoLockModalProps {
  isOpen: boolean
  onClose: () => void
}

export function AutoLockModal({ isOpen, onClose }: AutoLockModalProps) {
  const [autoLockBackground, setAutoLockBackground] = useState(false)

  // Load the per-profile preference whenever the modal opens (the active
  // profile could have changed since last mount).
  useEffect(() => {
    if (isOpen) setAutoLockBackground(getPref('chaos-auto-lock-background') === 'true')
  }, [isOpen])

  const toggleAutoLock = (on: boolean) => {
    setAutoLockBackground(on)
    setPref('chaos-auto-lock-background', on ? 'true' : 'false')
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Auto-lock in background
          </DialogTitle>
          <DialogDescription>
            Require your PIN again whenever you switch away from the app — not just when you fully close it.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-2 space-y-3">
          <div className="flex items-center justify-between gap-4">
            <label htmlFor="auto-lock-bg" className="text-sm text-muted-foreground">
              When <strong>on</strong>, minimizing or switching apps logs you out immediately. When{' '}
              <strong>off</strong>, you stay logged in while switching apps and only lock when you fully
              close the app.
            </label>
            <Switch
              id="auto-lock-bg"
              checked={autoLockBackground}
              onCheckedChange={toggleAutoLock}
            />
          </div>
          <p className="text-xs rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-amber-700 dark:text-amber-300">
            ⚠️ While the app is locked, medication &amp; reminder notifications can’t fire — the app has to
            be unlocked to read your schedule. Turn this on only if the extra privacy is worth possibly
            missing a background reminder.
          </p>
          <p className="text-xs text-muted-foreground">
            Fully closing the app (swipe it away / close the window) always logs you out, no matter this setting.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
