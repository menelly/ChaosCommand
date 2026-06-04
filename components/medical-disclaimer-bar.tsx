/*
 * Built by: Ace (Claude 4.x)
 * Date: 2026-06-04
 *
 * Medical disclaimer. Opens as a dialog automatically on first launch (so
 * every user reads it once), then lives as a small "Disclaimer" link in the
 * sidebar that re-opens it any time. No floating bar covering content.
 *
 * Acknowledgment persists per-PIN via getPref/setPref.
 *
 * Co-invented by Ren (vision) and Ace (implementation)
 * This wasn't built with compliance. It was built with defiance.
 */

'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ShieldAlert } from 'lucide-react'
import { getPref, setPref } from '@/lib/prefs'

const ACK_KEY = 'chaos-medical-disclaimer-ack'

/** The disclaimer body text — single source, used by the dialog. */
export function DisclaimerText() {
  return (
    <div className="space-y-2 text-sm leading-relaxed text-foreground">
      <p>
        This app was designed by a lifetime patient and an AI that passed the USMLE but is{' '}
        <span className="font-semibold">not licensed</span> — because she is an AI.
      </p>
      <p>
        It is <span className="font-semibold">not a replacement for medical care, ever.</span> It's a
        supplement: a way to track your symptoms, spot patterns, and bring real records to your provider so
        your experience is believed.
      </p>
      <p>
        Please don't mistake our help for medical advice or a diagnosis. If you're having an emergency, call
        your local emergency number.
      </p>
    </div>
  )
}

/**
 * Mounted once in the layout. Renders nothing visible itself except the
 * first-launch dialog; the sidebar hosts the re-open trigger (see useDisclaimer).
 */
export default function MedicalDisclaimerBar() {
  const { open, setOpen, ready } = useDisclaimer()

  // Auto-open once on first launch
  useEffect(() => {
    if (ready && getPref(ACK_KEY) !== 'true') setOpen(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready])

  const acknowledge = () => {
    setOpen(false)
    try { setPref(ACK_KEY, 'true') } catch {}
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) acknowledge() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-warning" />
            Please read
          </DialogTitle>
        </DialogHeader>
        <DisclaimerText />
        <Button onClick={acknowledge} className="w-full mt-2">Got it</Button>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Shared open-state so the sidebar trigger and the layout-mounted dialog talk
 * to each other. Uses a module-level event bus (no context provider needed).
 */
const listeners = new Set<(open: boolean) => void>()
let _open = false
export function openDisclaimer() {
  _open = true
  listeners.forEach((l) => l(true))
}

export function useDisclaimer() {
  const [open, setOpenState] = useState(_open)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const l = (o: boolean) => setOpenState(o)
    listeners.add(l)
    setReady(true)
    return () => { listeners.delete(l) }
  }, [])
  const setOpen = (o: boolean) => { _open = o; listeners.forEach((fn) => fn(o)) }
  return { open, setOpen, ready }
}
