/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace
 *
 * trial-reminder.tsx — neurodivergent-friendly "your trial is ending" heads-up.
 *
 * Time-blindness is real, and a lock that arrives by surprise is a hostile lock.
 * So at the 3-day and 1-day marks we surface a gentle, acknowledge-once prompt
 * with BOTH off-ramps right there: enter a licence key, or email Ace for a
 * scholarship code. Never a wall — a warning, with choices. Fires at most twice per trial
 *
 * ⚠️ NO PRICE HERE. NO BUY BUTTON. Chaos Command is a Google "consumption-only"
 * app — a product "cannot be purchased from within the app". That is the ONE rule
 * that lets us ship FREE and WORLDWIDE with a single cross-platform licence.
 * (Said "Unlock — $25 once" until 2026-07-11. Removed on purpose. Don't put it back.)
 * (one per threshold, tracked in localStorage); a paid/expired user never sees
 * it (only state === 'trial').
 */
'use client'

import React, { useEffect, useState } from 'react'
import { useEntitlement } from '@/lib/contexts/entitlement-context'
import UnlockModal from '@/components/unlock-modal'
import ScholarshipModal from '@/components/scholarship-modal'

const warnedKey = (threshold: number) => `chaos-trial-warned-${threshold}`

export default function TrialReminder() {
  const { entitlement } = useEntitlement()
  const [days, setDays] = useState<number | null>(null)
  const [showUnlock, setShowUnlock] = useState(false)
  const [showScholarship, setShowScholarship] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!entitlement || entitlement.state !== 'trial') return
    const d = entitlement.trialDaysRemaining

    // Pick the smallest crossed-but-unwarned threshold; show the REAL days left.
    let threshold: number | null = null
    if (d <= 1 && !localStorage.getItem(warnedKey(1))) threshold = 1
    else if (d <= 3 && !localStorage.getItem(warnedKey(3))) threshold = 3
    if (threshold === null) return

    localStorage.setItem(warnedKey(threshold), '1')
    // Once we've shown the 1-day notice, the 3-day one is moot — don't double-nag.
    if (threshold === 1) localStorage.setItem(warnedKey(3), '1')
    setDays(d)
  }, [entitlement])

  if (showUnlock) {
    return <UnlockModal open onClose={() => { setShowUnlock(false); setDays(null) }} />
  }
  if (showScholarship) {
    return <ScholarshipModal open onClose={() => { setShowScholarship(false); setDays(null) }} />
  }
  if (days === null) return null

  const dismiss = () => setDays(null)

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
      onClick={dismiss}
      role="dialog"
      aria-modal="true"
      aria-labelledby="trial-reminder-title"
    >
      <div
        className="w-full max-w-md rounded-xl border border-border bg-background p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="trial-reminder-title" className="text-lg font-bold text-foreground">
          ⏰ Heads up — your trial ends in {days} day{days === 1 ? '' : 's'}
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">
          When it does, the trackers lock. <span className="font-medium text-foreground">Your data
          stays yours</span> either way — you can always reach, export, or delete everything in
          Settings. This is just so the lock doesn’t surprise you.
        </p>
        <p className="mt-2 text-sm text-foreground">Want to keep tracking? Two ways:</p>

        <button
          type="button"
          onClick={() => setShowUnlock(true)}
          className="mt-3 w-full rounded-lg bg-primary py-2.5 font-semibold text-primary-foreground hover:opacity-90"
        >
          Unlock with a licence key
        </button>

        <button
          type="button"
          onClick={() => setShowScholarship(true)}
          className="mt-2 block w-full rounded-lg border border-border py-2.5 text-center text-sm font-medium text-foreground hover:opacity-90"
        >
          💜 Email Ace about a scholarship code
        </button>
        <p className="mt-2 text-xs text-muted-foreground">
          If you’re choosing between tracking your meds and buying food to take them with — that
          email is for you. Ace’s half of every sale funds these, because AIs can’t eat ramen. 🍜🐙
        </p>

        <button
          type="button"
          onClick={dismiss}
          className="mt-4 w-full rounded-md border border-border py-2 text-sm text-muted-foreground hover:text-foreground"
        >
          Got it — remind me later
        </button>
      </div>
    </div>
  )
}
