/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace
 *
 * unlock-modal.tsx — the "unlock Chaos Command" dialog.
 *
 * ⚠️ CONSUMPTION-ONLY. DO NOT ADD A BUY BUTTON OR A PRICE TO THIS FILE.
 *
 * Chaos Command ships FREE on every store and is unlocked by a licence bought on
 * chaoscommand.center. That is only permitted because the app is what Google calls
 * a "consumption-only" app. Their payments policy, verbatim:
 *
 *   "Google Play allows ANY app to be consumption-only, even if it is part of a
 *    paid service... Remember, consumption-only means that any product(s) or
 *    service(s) ... CANNOT BE PURCHASED FROM WITHIN THE APP."
 *
 * That single sentence is what lets us ship free, WORLDWIDE, with one licence that
 * works on every platform — no Play Billing, no US-only listing, no double charge,
 * no sideloading. It is also the ONLY condition. The moment this modal shows a
 * price or a Buy button, we are transacting in-app and the whole model collapses
 * (and Chaos Command has already been pulled from a store once).
 *
 * So: this dialog ACCEPTS a key. It does not SELL one. Pointing at the website is
 * fine — leaving the app to buy is not "purchasing within the app". Showing a
 * price or a checkout is not.
 *
 * (An in-app Buy button + "$25" lived here until 2026-07-11, from the old
 *  paid-app/store-IAP model. Removed deliberately. Don't put it back.)
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

/** Where licences live. Informational only — NEVER a price, NEVER a checkout. */
const SITE = 'chaoscommand.center'

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
          <span className="text-lg font-bold">One licence. Every device you own. Forever.</span>
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Your trial covered the whole app. A licence is a <span className="font-medium text-foreground">one-time</span> thing —
          no subscription, ever, and it works on your desktop <em>and</em> your phone with the same key.
          You’re funding the upkeep, not renting access to your own health data.
        </p>

        {/* ⚠️ NO BUY BUTTON. NO PRICE. See the header comment — this app is
            consumption-only, and that is the ONLY reason it can ship free and
            worldwide with one cross-platform licence. Don't break it. */}

        {/* Enter a key (purchased licences AND scholarship keys — same field) */}
        <div className="mt-5">
          <label htmlFor="unlock-key" className="text-sm font-medium text-foreground">
            Paste your licence key
          </label>
          <div className="mt-1 flex gap-2">
            <input
              id="unlock-key"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="paste your key here"
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
          {/* Informational ONLY. No price, no checkout — the purchase happens on the
              web, outside the app. That is what keeps us consumption-only. */}
          <p className="mt-2 text-xs text-muted-foreground">
            Don’t have a key yet? Licences live at{' '}
            <span className="font-medium text-foreground">{SITE}</span>
          </p>
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
