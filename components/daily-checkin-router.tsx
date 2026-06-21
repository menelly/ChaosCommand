/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace (Claude 4.8)
 *
 * DailyCheckinRouter — invisible lifecycle component that:
 *   1. Reconciles the OS check-in schedule on every app open (self-heals
 *      after a reboot / app update wipes pending alarms).
 *   2. Listens for taps on the daily check-in notification and deep-links the
 *      user straight into the Routines hub — "one tap on a bad day".
 *
 * Mount once inside the authenticated app shell (alongside ReminderTicker) so
 * it doesn't run on the login gate.
 */
"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  syncDailyCheckinSchedule,
  DAILY_CHECKIN_ACTION_TYPE,
} from '@/lib/services/daily-checkin-scheduler'

export default function DailyCheckinRouter() {
  const router = useRouter()

  useEffect(() => {
    let disposed = false
    const listeners: Array<{ unregister: () => void }> = []

    // Reconcile the schedule on open — re-arms anything the OS dropped.
    void syncDailyCheckinSchedule().then(n => {
      if (n > 0) console.log(`🔁 Daily check-in: armed ${n} schedule(s) on startup`)
    })

    // Route a tap on OUR notification to the Routines hub. We can't reliably
    // tell which action button was tapped across platforms yet (that's the
    // tested fast-follow), so any tap on the check-in → routines, which is the
    // safe, useful default.
    void (async () => {
      try {
        const mod = await import('@tauri-apps/plugin-notification')
        const isOurs = (n: { actionTypeId?: string }) =>
          n?.actionTypeId === DAILY_CHECKIN_ACTION_TYPE

        const onAction = await mod.onAction(n => {
          if (isOurs(n)) router.push('/routines')
        })
        const onReceived = await mod.onNotificationReceived(n => {
          // onNotificationReceived fires on delivery too; only navigate when
          // the app is foregrounded by a tap. Guard with document visibility
          // so a background delivery doesn't yank the user anywhere.
          if (isOurs(n) && typeof document !== 'undefined' && document.visibilityState === 'visible') {
            router.push('/routines')
          }
        })
        if (disposed) {
          onAction.unregister()
          onReceived.unregister()
        } else {
          listeners.push(onAction, onReceived)
        }
      } catch {
        /* not running under Tauri — notifications/taps are a no-op on web */
      }
    })()

    return () => {
      disposed = true
      for (const l of listeners) {
        try { l.unregister() } catch { /* already gone */ }
      }
    }
  }, [router])

  return null
}
