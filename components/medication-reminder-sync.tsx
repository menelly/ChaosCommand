/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace (Claude 4.8)
 *
 * MedicationReminderSync — invisible lifecycle component that keeps the OS
 * medication-reminder alarms in lockstep with the medication list and the
 * notification settings:
 *   1. Re-arms whenever the medication list changes (add / edit / delete /
 *      reminder-toggle all flow through useMedicationTracker, so this just
 *      watches that list).
 *   2. Re-arms when the Notification Settings toggles change (the modal fires a
 *      `chaos-notif-settings-changed` event since it has no med list of its own).
 *   3. Routes a tap on a medication reminder to the daily "taken today" list.
 *
 * Mount once inside the authenticated app shell (alongside ReminderTicker).
 */
"use client"

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useMedicationTracker } from '@/lib/hooks/use-medication-tracker'
import {
  syncMedicationReminders,
  MED_REMINDER_ACTION_TYPE,
} from '@/lib/services/medication-reminder-scheduler'

export default function MedicationReminderSync() {
  const router = useRouter()
  const { medications } = useMedicationTracker()
  // Latest meds in a ref so the settings-change listener re-syncs against
  // current data without re-subscribing every render.
  const medsRef = useRef(medications)
  medsRef.current = medications

  // (1) Re-arm whenever the medication list changes.
  useEffect(() => {
    void syncMedicationReminders(medications).then(n => {
      if (n > 0) console.log(`💊 Medication reminders: armed ${n} alarm(s)`)
    })
  }, [medications])

  // (2) Re-arm on a settings toggle (master / medication-reminders category).
  useEffect(() => {
    const onSettings = () => { void syncMedicationReminders(medsRef.current) }
    window.addEventListener('chaos-notif-settings-changed', onSettings)
    return () => window.removeEventListener('chaos-notif-settings-changed', onSettings)
  }, [])

  // (3) Tap on a med reminder → daily checklist.
  useEffect(() => {
    let disposed = false
    const listeners: Array<{ unregister: () => void }> = []

    void (async () => {
      try {
        const mod = await import('@tauri-apps/plugin-notification')
        const isOurs = (n: { actionTypeId?: string }) =>
          n?.actionTypeId === MED_REMINDER_ACTION_TYPE

        const onAction = await mod.onAction(n => {
          if (isOurs(n)) router.push('/maintain/medications')
        })
        const onReceived = await mod.onNotificationReceived(n => {
          if (isOurs(n) && typeof document !== 'undefined' && document.visibilityState === 'visible') {
            router.push('/maintain/medications')
          }
        })
        if (disposed) { onAction.unregister(); onReceived.unregister() }
        else listeners.push(onAction, onReceived)
      } catch {
        /* not under Tauri — no-op on web */
      }
    })()

    return () => {
      disposed = true
      for (const l of listeners) { try { l.unregister() } catch { /* gone */ } }
    }
  }, [router])

  return null
}
