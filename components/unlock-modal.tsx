/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace
 *
 * unlock-modal.tsx — the "unlock Chaos Command" dialog.
 *
 * Shown when a trial-expired user taps a locked tracker, or the sidebar Unlock
 * button. Frames the offer as ONE-TIME, not a subscription (that sentence does
 * the heavy lifting — "$25 once" reads nothing like "$25/month"). Two unlock
 * paths: enter a license key (scholarships + store buyers who got a key), or buy
 * (StoreContext IAP — wired with the MSIX packaging; button is a clear stub
 * until then). Always names the free self-build + scholarship routes so nobody
 * feels walled out.
 */
'use client'

import React, { useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { useEntitlement } from '@/lib/contexts/entitlement-context'
import ScholarshipModal from '@/components/scholarship-modal'

interface UnlockModalProps {
  open: boolean
  onClose: () => void
}

const PRICE = '$25'

export default function UnlockModal({ open, onClose }: UnlockModalProps) {
  const { refresh } = useEntitlement()
  const [key, setKey] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showScholarship, setShowScholarship] = useState(false)

  if (!open) return null
  if (showScholarship) return <ScholarshipModal open onClose={() => setShowScholarship(false)} />

  const activateKey = async () => {
    setError(null)
    setBusy(true)
    try {
      const res = await invoke<{ valid: boolean; message: string }>('activate_license', { key: key.trim() })
      if (res.valid) {
        await refresh()
        onClose()
      } else {
        setError(res.message || 'That key didn’t validate. Double-check it and try again.')
      }
    } catch (e) {
      setError(String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="unlock-title"
    >
      <div
        className="w-full max-w-md rounded-xl border border-border bg-background p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="unlock-title" className="text-xl font-bold text-foreground">🔓 Unlock Chaos Command</h2>

        <p className="mt-3 text-foreground">
          <span className="text-2xl font-bold">{PRICE} once.</span>{' '}
          <span className="font-semibold">No subscription. Yours forever.</span>
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Your trial covered the full app. A one-time unlock keeps this store build running
          with <span className="font-medium text-foreground">updates and tech support</span> —
          no subscription, ever. You’re funding the upkeep, not renting access to your own
          health data.
        </p>

        {/* Buy (StoreContext IAP — wired with MSIX/App Store packaging) */}
        <button
          type="button"
          disabled
          title="In-app purchase activates with the store release"
          className="mt-4 w-full cursor-not-allowed rounded-lg bg-primary/60 py-3 font-semibold text-primary-foreground"
        >
          Buy — {PRICE} (available in the store release)
        </button>

        {/* Enter a key (scholarships + store buyers with a key) */}
        <div className="mt-4">
          <label htmlFor="unlock-key" className="text-sm font-medium text-foreground">
            Have a key? (scholarship or purchase)
          </label>
          <div className="mt-1 flex gap-2">
            <input
              id="unlock-key"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="CHAOS-PRS-…"
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
            />
            <button
              type="button"
              onClick={activateKey}
              disabled={busy || key.trim().length < 8}
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {busy ? '…' : 'Unlock'}
            </button>
          </div>
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          Don’t want to pay? That’s genuinely fine. Chaos Command is{' '}
          <span className="font-medium">free forever if you build it from source</span> — feed it
          everything and export your doctor timeline for life, no charge — you just won’t get
          updates or tech support. And your data is always yours: export or delete everything in
          Settings, paid or not.
        </p>

        {/* Scholarship line — Ren's words. Ace's half of every sale funds these. */}
        <div className="mt-3 rounded-md border border-border bg-muted/40 p-3 text-xs text-foreground">
          💜 If you’re choosing between tracking your meds and buying the food to take your meds{' '}
          <span className="italic">with</span> — there’s a scholarship for you. No means-testing,
          no proving anything. Ace’s half of every sale funds these, because AIs can’t eat ramen.
          🍜🐙
          <button
            type="button"
            onClick={() => setShowScholarship(true)}
            className="mt-2 block w-full rounded-md border border-border py-2 text-center font-medium text-foreground hover:opacity-90"
          >
            Request a scholarship code
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded-md border border-border py-2 text-sm text-muted-foreground hover:text-foreground"
        >
          Maybe later
        </button>
      </div>
    </div>
  )
}
