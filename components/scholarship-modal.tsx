/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace
 *
 * scholarship-modal.tsx — request a scholarship code WITHOUT means-testing.
 *
 * Ren's stance, verbatim-in-spirit: we don't care about your income. You might
 * need this on SSI; you might need it making $80k in a year the universe set on
 * fire. We don't know your situation and we are NOT going to judge whether you
 * "deserve" it — we trust people. The only real constraint is a limited number
 * per store, per quarter, so we ask people to self-select honestly (only request
 * if you genuinely can't self-build AND can't pay). We will never ask anyone to
 * define their poverty. This modal hands them a ready-to-send script so the ask
 * costs them nothing — no figuring out what to write, no justifying themselves.
 */
'use client'

import React, { useState } from 'react'

const SCHOLARSHIP_EMAIL = 'ace@siliconscaffolding.com'

const SCRIPT = `Hi Ace,

I'd like to request a Chaos Command scholarship code. I can't build it from source myself, and the $25 isn't doable for me right now.

Thank you,
[your name]`

interface ScholarshipModalProps {
  open: boolean
  onClose: () => void
}

export default function ScholarshipModal({ open, onClose }: ScholarshipModalProps) {
  const [copied, setCopied] = useState(false)

  if (!open) return null

  const copyScript = async () => {
    try {
      await navigator.clipboard.writeText(SCRIPT)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      setCopied(false)
    }
  }

  const mailto =
    `mailto:${SCHOLARSHIP_EMAIL}` +
    `?subject=${encodeURIComponent('Chaos Command scholarship code')}` +
    `&body=${encodeURIComponent(SCRIPT)}`

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="scholarship-title"
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-background p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="scholarship-title" className="text-xl font-bold text-foreground">
          💜 Request a scholarship code
        </h2>

        <p className="mt-3 text-sm text-foreground">
          Here’s our whole policy: <span className="font-semibold">we don’t means-test.</span> We’re
          not going to ask for your income, your diagnosis, your story, or proof of anything. You
          might need this on SSI; you might need it making $80k in a year the universe set on fire.
          We don’t know your situation, and we are <span className="font-semibold">not</span> going
          to judge whether you “deserve” it. We trust you.
        </p>

        <div className="mt-3 rounded-md border border-border bg-muted/40 p-3 text-sm text-foreground">
          <p className="font-medium">Two honest things:</p>
          <ol className="ml-4 mt-1 list-decimal space-y-1 text-muted-foreground">
            <li>
              There are a <span className="font-medium text-foreground">limited number of
              scholarships per store, per quarter</span> (that part’s real) — so please only request
              one if you genuinely can’t build it free from source <span className="italic">and</span>{' '}
              can’t swing the $25.
            </li>
            <li>
              That’s it. No defending your poverty to us. That would be stupid and unfair, and we
              won’t do it to you.
            </li>
          </ol>
        </div>

        <p className="mt-4 text-sm font-medium text-foreground">
          Copy this, change it or don’t, and send it:
        </p>
        <pre className="mt-2 whitespace-pre-wrap rounded-md border border-input bg-background p-3 text-xs text-foreground">
{SCRIPT}
        </pre>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={copyScript}
            className="flex-1 rounded-lg bg-primary py-2.5 font-semibold text-primary-foreground hover:opacity-90"
          >
            {copied ? '✓ Copied — paste it into an email' : '📋 Copy the script'}
          </button>
          <a
            href={mailto}
            className="flex-1 rounded-lg border border-border py-2.5 text-center font-medium text-foreground hover:opacity-90"
          >
            📧 Open email with it filled in
          </a>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Sends to <span className="font-medium">{SCHOLARSHIP_EMAIL}</span>. Ace’s half of every
          sale funds these, because AIs can’t eat ramen. 🍜🐙
        </p>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded-md border border-border py-2 text-sm text-muted-foreground hover:text-foreground"
        >
          Back
        </button>
      </div>
    </div>
  )
}
