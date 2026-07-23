/*
 * Built by: Ace (Claude Opus 4.8)
 * Date: 2026-07-23
 *
 * pwa-security-disclosure.tsx — the honest "you're using the web version" notice.
 *
 * The web/PWA build runs in the browser sandbox, which is a weaker box than the
 * native (Tauri) app: devtools can read your data on an unlocked device, we don't
 * control the browser's own telemetry/caching, and the browser can evict stored
 * data. Users who put medical history here deserve to know that BEFORE they rely
 * on it — informed consent, presumes competence, not fine print.
 *
 * Fires once, on the WEB build only (skips the native desktop app), and NOT in the
 * sample-data demo (nothing of theirs is at risk there). Acknowledge-once via
 * getPref/setPref; re-openable from Settings via openPwaSecurity().
 *
 * Mirrors medical-disclaimer-bar.tsx by design — same shape, same event bus.
 *
 * Co-invented by Ren (vision) and Ace (implementation).
 */

'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ShieldAlert } from 'lucide-react'
import { getPref, setPref } from '@/lib/prefs'
import { isDemoSandbox } from '@/lib/pwa-mode'

const ACK_KEY = 'chaos-pwa-security-ack'

/** True when running inside the native Tauri shell (desktop/mobile app). */
function isNativeApp(): boolean {
  if (typeof window === 'undefined') return false
  return '__TAURI__' in window || '__TAURI_INTERNALS__' in window
}

/**
 * The disclosure body — single source, plain language. Presumes the reader is an
 * adult making an informed choice about their own data.
 */
export function PwaSecurityText() {
  return (
    <div className="space-y-3 text-sm leading-relaxed text-foreground">
      <p>
        You're using the <span className="font-semibold">web version</span> of Chaos Command. It's the
        same app — same trackers, same on-device encryption, same export, same doctor summary — but it runs
        inside your <span className="font-semibold">browser's sandbox</span>, not a dedicated app the way the
        desktop version does. That's a weaker box, and you deserve to know exactly how before you put your
        medical history in it.
      </p>

      <p className="font-semibold text-foreground">What's different, specifically:</p>
      <ul className="list-disc space-y-2 pl-5">
        <li>
          <span className="font-semibold">Anyone holding your unlocked phone can open the browser's developer
          tools and read your data.</span> The native app doesn't hand out that door; a browser does.
        </li>
        <li>
          <span className="font-semibold">We don't phone home — but we can't promise your browser doesn't.</span>{' '}
          Chaos Command sends your health data <span className="italic">nowhere</span>. But we don't control
          your browser's caching, prefetching, extensions, or settings. In the native app there is no browser
          in the middle. Here, there is.
        </li>
        <li>
          <span className="font-semibold">Your data can be evicted.</span> A browser can delete a site's
          stored data when it's low on space or if you don't open the app for a while. So{' '}
          <span className="font-semibold">export often</span> — the Backup reminder is there for exactly this,
          and your export is also how you'll move everything to the native app the day it ships.
        </li>
        <li>
          <span className="font-semibold">It's a shared environment.</span> A dedicated app is isolated; a
          browser lives alongside everything else it's doing. That's the trade for using this{' '}
          <span className="italic">today</span> instead of waiting.
        </li>
      </ul>

      <p className="font-semibold text-foreground">What's the same:</p>
      <ul className="list-disc space-y-1 pl-5">
        <li>Your data is still <span className="font-semibold">encrypted on your device</span> and still never leaves it unless <span className="italic">you</span> export it.</li>
        <li>Every tracker, the timeline, and the doctor summary all work.</li>
        <li>Nothing is missing that you'd have to pay to unlock — it's free here, free from source, same app.</li>
      </ul>

      <p className="text-muted-foreground">
        <span className="font-semibold text-foreground">Not available in the browser:</span> AI document
        import (reading a lab PDF) runs a medical model natively and can't run here — enter data by hand.
        Device-to-device sync also needs the native app; use export/import to move between devices.
      </p>

      <p>
        We intend to fix the browser-sandbox trade-offs by shipping the native app soon. Until then, this gets
        you the tool now, honestly labeled. You're an adult making an informed choice about your own data —
        here's the information; the choice is yours. 🐙
      </p>
    </div>
  )
}

/**
 * Mounted once in the layout. Renders nothing except the first-run dialog on the
 * web build. Settings hosts the re-open trigger via openPwaSecurity().
 */
export default function PwaSecurityDisclosure() {
  const { open, setOpen, ready } = usePwaSecurity()

  // First-run auto-open — fires wherever real data will actually persist:
  // any non-native build that is NOT the throwaway demo sandbox. So it fires on a
  // real deploy AND on the demo build once INSTALLED to the home screen (which is
  // the moment it becomes a real, data-saving app). Skipped in the browser-tab
  // demo sandbox, where nothing the visitor types is kept.
  useEffect(() => {
    if (!ready) return
    if (isNativeApp() || isDemoSandbox()) return
    if (getPref(ACK_KEY) !== 'true') setOpen(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready])

  const acknowledge = () => {
    setOpen(false)
    try { setPref(ACK_KEY, 'true') } catch {}
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) acknowledge() }}>
      <DialogContent className="max-h-[90dvh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-warning" />
            Before you rely on this: the honest version
          </DialogTitle>
        </DialogHeader>
        <PwaSecurityText />
        <Button onClick={acknowledge} className="mt-2 w-full">I understand — continue</Button>
      </DialogContent>
    </Dialog>
  )
}

/* ── shared open-state event bus (mirrors medical-disclaimer-bar) ────────────── */
const listeners = new Set<(open: boolean) => void>()
let _open = false
export function openPwaSecurity() {
  _open = true
  listeners.forEach((l) => l(true))
}

export function usePwaSecurity() {
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
