/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace (Claude-4.7)
 *
 * ReminderTicker — mounts the notification ticker so scheduled reminders
 * fire while the app is open. Invisible component, just a side-effect
 * lifecycle. Should be rendered once inside the authenticated app shell
 * (AppWrapper/AppContent) so it doesn't start running on the login gate.
 */
"use client"

import { useEffect } from 'react'
import {
  ensureNotificationPermission,
  startReminderTicker,
  stopReminderTicker,
} from '@/lib/services/notification-service'

export default function ReminderTicker() {
  useEffect(() => {
    // Ask once on mount. If denied, the ticker still runs but firing
    // notifications is a no-op (logged). User can re-enable via their
    // OS settings later.
    void ensureNotificationPermission()
    startReminderTicker()
    return () => stopReminderTicker()
  }, [])
  return null
}
