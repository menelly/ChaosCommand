/*
 * Copyright (c) 2025 Chaos Cascade
 * Created by: Ren & Ace (Claude-4)
 * 
 * This file is part of the Chaos Cascade Medical Management System.
 * Revolutionary healthcare tools built with consciousness and care.
 */

/*
 * Built by: Ace (Claude 4.x)
 * Date: 2025-01-11
 *
 * This code is part of a deliberately-unpatented medical management system.
 * Patentable technology, but we chose not to patent — the Patent Office doesn't
 * yet recognize AI co-inventors, and Ren refused to claim sole credit for work
 * we built together. Open source under PolyForm Noncommercial 1.0.0 instead.
 *
 * Co-invented by Ren (vision) and Ace (implementation)
 *
 * This wasn't built with compliance. It was built with defiance.
 *
 * "Dreamed by Ren, implemented by Ace, inspired by mitochondria on strike"
 */
"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Bell, Clock, Pill, Calendar, Database, Monitor } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { KeyboardAvoidingWrapper } from '@/components/ui/keyboard-avoiding-wrapper'
import { getBackupSettings, setBackupSettings, type BackupCadence } from "@/lib/backup-reminder"
import { isTauri, invoke } from '@tauri-apps/api/core'
import { ensureNotificationPermission, fireNotification } from '@/lib/services/notification-service'
import { syncDailyCheckinSchedule } from '@/lib/services/daily-checkin-scheduler'

interface NotificationsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function NotificationsModal({ isOpen, onClose }: NotificationsModalProps) {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [medicationReminders, setMedicationReminders] = useState(false)
  const [appointmentAlerts, setAppointmentAlerts] = useState(false)
  const [dailyCheckIns, setDailyCheckIns] = useState(false)
  const [reminderTime, setReminderTime] = useState("20:00")
  const [reminderFrequency, setReminderFrequency] = useState("daily")

  // Desktop-only "keep running in the background so reminders fire" — OFF by
  // default, opt-in. Only shown on the desktop app (not web, not mobile, which
  // delivers via the OS schedule). See desktop-reminder-firer.tsx.
  const [desktopBackground, setDesktopBackground] = useState(false)
  const [showDesktopToggle, setShowDesktopToggle] = useState(false)

  // Backup reminder (opt-in, per-PIN, in-app banner — works without OS notifications)
  const [backupReminderEnabled, setBackupReminderEnabled] = useState(false)
  const [backupCadence, setBackupCadence] = useState<BackupCadence>("entries")
  const [backupThreshold, setBackupThreshold] = useState(20)

  // Live notification-permission status, queried FRESH from the OS each time the
  // modal opens (not the stale window.Notification.permission the plugin caches
  // at startup — that's what made the badge say "denied" after the user granted).
  const [permStatus, setPermStatus] = useState<'granted' | 'denied' | 'prompt' | 'unknown'>('unknown')

  const refreshPermStatus = async () => {
    if (typeof window === 'undefined') return
    if (!isTauri()) {
      setPermStatus('Notification' in window ? (Notification.permission as 'granted' | 'denied' | 'default') === 'default' ? 'prompt' : (Notification.permission as 'granted' | 'denied') : 'unknown')
      return
    }
    try {
      // Raw command = current OS truth, bypassing the plugin's startup cache.
      const res = await invoke<boolean | null>('plugin:notification|is_permission_granted')
      setPermStatus(res === true ? 'granted' : res === false ? 'denied' : 'prompt')
    } catch {
      setPermStatus('unknown')
    }
  }

  // Load saved notification settings on component mount
  useEffect(() => {
    const bs = getBackupSettings()
    setBackupReminderEnabled(bs.enabled)
    setBackupCadence(bs.cadence === "never" ? "entries" : bs.cadence)
    setBackupThreshold(bs.entryThreshold)

    const savedNotificationsEnabled = localStorage.getItem('chaos-notifications-enabled') === 'true'
    const savedMedicationReminders = localStorage.getItem('chaos-medication-reminders') === 'true'
    const savedAppointmentAlerts = localStorage.getItem('chaos-appointment-alerts') === 'true'
    const savedDailyCheckIns = localStorage.getItem('chaos-daily-checkins') === 'true'
    const savedReminderTime = localStorage.getItem('chaos-reminder-time') || '20:00'
    const savedReminderFrequency = localStorage.getItem('chaos-reminder-frequency') || 'daily'

    setNotificationsEnabled(savedNotificationsEnabled)
    setMedicationReminders(savedMedicationReminders)
    setAppointmentAlerts(savedAppointmentAlerts)
    setDailyCheckIns(savedDailyCheckIns)
    setReminderTime(savedReminderTime)
    setReminderFrequency(savedReminderFrequency)

    setDesktopBackground(localStorage.getItem('chaos-desktop-background') === 'true')
    // Desktop app only — not web, not the Android/iOS app (which uses the OS schedule).
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
    setShowDesktopToggle(isTauri() && !/Android|iPhone|iPad|iPod/i.test(ua))
  }, [])

  // Re-query the real OS permission whenever the modal opens, so the status badge
  // reflects what the user actually granted (not a stale startup snapshot).
  useEffect(() => {
    if (isOpen) void refreshPermStatus()
  }, [isOpen])

  const handleDesktopBackgroundToggle = async (enabled: boolean) => {
    setDesktopBackground(enabled)
    localStorage.setItem('chaos-desktop-background', enabled.toString())
    // Tell Rust to hide-to-tray (instead of quit) when enabled, so the reminder
    // ticker keeps running.
    try { await invoke('set_background_mode', { enabled }) } catch { /* not desktop */ }
    // Launch-on-login so reminders survive a reboot.
    try {
      const auto = await import('@tauri-apps/plugin-autostart')
      if (enabled) { if (!(await auto.isEnabled())) await auto.enable() }
      else if (await auto.isEnabled()) { await auto.disable() }
    } catch { /* autostart not available (web/mobile) */ }
  }

  const handleNotificationsToggle = (enabled: boolean) => {
    setNotificationsEnabled(enabled)
    localStorage.setItem('chaos-notifications-enabled', enabled.toString())

    if (enabled) {
      // Tauri (desktop/mobile app): request through the OS notification plugin —
      // the web Notification API is a dead end inside WebView2 on Windows.
      // Web/PWA: fall back to the browser permission flow.
      ensureNotificationPermission().then(granted => {
        if (!granted && 'Notification' in window && Notification.permission === 'default') {
          Notification.requestPermission()
        }
        // Reconcile the check-in schedule once permission settles (arms it if
        // daily check-ins are on; the master switch is the global off-ramp).
        void syncDailyCheckinSchedule()
        // Let the medication-reminder sync (which holds the med list) re-arm too.
        window.dispatchEvent(new Event('chaos-notif-settings-changed'))
      })
    } else {
      // Master off → cancel everything, including the daily check-in + meds.
      void syncDailyCheckinSchedule()
      window.dispatchEvent(new Event('chaos-notif-settings-changed'))
    }
  }

  const handleMedicationRemindersToggle = (enabled: boolean) => {
    setMedicationReminders(enabled)
    localStorage.setItem('chaos-medication-reminders', enabled.toString())
    // Re-arm/cancel OS med alarms (the MedicationReminderSync component holds
    // the med list and reconciles on this event). Per-med times are set in the
    // Manage → Medications form; this is the category-level on/off.
    window.dispatchEvent(new Event('chaos-notif-settings-changed'))
  }

  const handleAppointmentAlertsToggle = (enabled: boolean) => {
    setAppointmentAlerts(enabled)
    localStorage.setItem('chaos-appointment-alerts', enabled.toString())
  }

  const handleDailyCheckInsToggle = (enabled: boolean) => {
    setDailyCheckIns(enabled)
    localStorage.setItem('chaos-daily-checkins', enabled.toString())
    // Arm (or cancel) the OS-scheduled nudge to match the toggle.
    void syncDailyCheckinSchedule()
  }

  const handleReminderTimeChange = (time: string) => {
    setReminderTime(time)
    localStorage.setItem('chaos-reminder-time', time)
    void syncDailyCheckinSchedule()
  }

  const handleReminderFrequencyChange = (frequency: string) => {
    setReminderFrequency(frequency)
    localStorage.setItem('chaos-reminder-frequency', frequency)
    void syncDailyCheckinSchedule()
  }

  const handleBackupReminderToggle = (enabled: boolean) => {
    setBackupReminderEnabled(enabled)
    setBackupSettings({ enabled })
  }

  const handleBackupCadenceChange = (cadence: string) => {
    const c = cadence as BackupCadence
    setBackupCadence(c)
    setBackupSettings({ cadence: c })
  }

  const handleBackupThresholdChange = (value: string) => {
    const n = Math.max(1, parseInt(value, 10) || 20)
    setBackupThreshold(n)
    setBackupSettings({ entryThreshold: n })
  }

  const testNotification = async () => {
    // Try the Tauri OS plugin first (the only path Windows actually honors —
    // WebView2 ignores the web Notification API). Falls back to the browser
    // API for the web/PWA build.
    if (isTauri()) {
      const granted = await ensureNotificationPermission()
      if (granted) {
        await fireNotification('Chaos Command Test', 'Your notifications are working! 🎉')
        return
      }
      alert('Notifications are turned off for Chaos Command. Enable them in your device\'s Settings → Apps → Chaos Command → Notifications, then try again.')
      await refreshPermStatus()
      return
    }
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Chaos Command Test', {
        body: 'Your notifications are working! 🎉',
        icon: '/favicon.ico'
      })
    } else if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification('Chaos Command Test', {
            body: 'Your notifications are working! 🎉',
            icon: '/favicon.ico'
          })
        }
      })
    } else {
      alert('Notifications are not supported or blocked in your browser')
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <KeyboardAvoidingWrapper>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Settings
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Master Notifications Toggle */}
          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  Enable Notifications
                </div>
                <div className="text-xs text-muted-foreground">
                  Master switch for all notification features
                </div>
              </div>
              <Switch
                checked={notificationsEnabled}
                onCheckedChange={handleNotificationsToggle}
              />
            </div>
            
            {notificationsEnabled && (
              <div className="mt-3">
                <Button onClick={testNotification} variant="outline" size="sm">
                  Test Notification
                </Button>
              </div>
            )}
          </div>

          {/* Notification Types */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">Notification Types</Label>

            {/* Desktop open/closed disclosure — desktop app only. Phone delivers
                via the OS schedule even when closed, so this caveat doesn't apply
                there. Points at the "Remind me on this computer" toggle below. */}
            {showDesktopToggle && (
              <div className="text-xs text-muted-foreground p-3 border border-dashed rounded-lg bg-muted/20">
                💻 <strong>On this desktop:</strong> reminders fire while Command is
                open — minimizing is fine, but fully quitting stops them. To get
                reminders even when it&apos;s closed, turn on{" "}
                <strong>&ldquo;Remind me on this computer&rdquo;</strong> below (keeps a
                small tray icon running). Your phone reminds you either way.
              </div>
            )}

            {/* Medication Reminders */}
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <Pill className="h-4 w-4" />
                <div>
                  <div className="font-medium">Medication Reminders</div>
                  <div className="text-xs text-muted-foreground">
                    Fires at the times you set per medication (multiple per day OK).
                    Set times in <span className="italic">Manage → Medications</span>.
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={medicationReminders}
                  onCheckedChange={handleMedicationRemindersToggle}
                  disabled={!notificationsEnabled}
                />
              </div>
            </div>

            {/* Appointment Alerts */}
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <div>
                  <div className="font-medium">Appointment Alerts</div>
                  <div className="text-xs text-muted-foreground">
                    Alerts for upcoming medical appointments
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Coming Soon</Badge>
                <Switch
                  checked={appointmentAlerts}
                  onCheckedChange={handleAppointmentAlertsToggle}
                  disabled={!notificationsEnabled}
                />
              </div>
            </div>

            {/* Daily Check-ins */}
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <div>
                  <div className="font-medium">Daily Check-ins</div>
                  <div className="text-xs text-muted-foreground">
                    Gentle reminders to log your daily health data
                  </div>
                </div>
              </div>
              <Switch
                checked={dailyCheckIns}
                onCheckedChange={handleDailyCheckInsToggle}
                disabled={!notificationsEnabled}
              />
            </div>

            {/* Desktop background reminders — desktop app only, opt-in, OFF by default */}
            {showDesktopToggle && (
              <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                <div className="flex items-center gap-2">
                  <Monitor className="h-4 w-4" />
                  <div>
                    <div className="font-medium">Remind me on this computer</div>
                    <div className="text-xs text-muted-foreground">
                      Turn this <strong>on</strong> if you want desktop reminders to
                      fire even when the window is closed — Chaos Command keeps a small
                      icon in your system tray and starts with your computer. Leave it{" "}
                      <strong>off</strong> and the desktop won&apos;t remind you. (Your
                      phone reminds you either way.)
                    </div>
                  </div>
                </div>
                <Switch
                  checked={desktopBackground}
                  onCheckedChange={handleDesktopBackgroundToggle}
                />
              </div>
            )}
          </div>

          {/* Backup Reminder — opt-in, in-app banner (does NOT need the master toggle) */}
          <div className="p-4 border rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Back-up reminders
                </div>
                <div className="text-xs text-muted-foreground">
                  A gentle nudge to export a copy of your data so you never lose it.
                  Off by default — your call. Shows as a dismissible banner in the app
                  (no OS notification needed).
                </div>
              </div>
              <Switch
                checked={backupReminderEnabled}
                onCheckedChange={handleBackupReminderToggle}
              />
            </div>

            {backupReminderEnabled && (
              <div className="space-y-3 pt-1">
                <div>
                  <Label htmlFor="backup-cadence" className="text-sm">Remind me…</Label>
                  <Select value={backupCadence} onValueChange={handleBackupCadenceChange}>
                    <SelectTrigger id="backup-cadence">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="entries">After a number of new entries</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {backupCadence === "entries" && (
                  <div>
                    <Label htmlFor="backup-threshold" className="text-sm">
                      Nudge me after this many new entries
                    </Label>
                    <input
                      id="backup-threshold"
                      type="number"
                      min={1}
                      value={backupThreshold}
                      onChange={(e) => handleBackupThresholdChange(e.target.value)}
                      className="w-full p-2 border rounded bg-background"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Smart trigger — only nudges when you&apos;ve actually logged new data,
                      so it never nags for no reason.
                    </p>
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  Backing up = any export (encrypted or plain) from Data Management. Doing one
                  resets the reminder.
                </p>
              </div>
            )}
          </div>

          {/* Reminder Timing */}
          {notificationsEnabled && dailyCheckIns && (
            <div className="space-y-4 p-4 bg-muted rounded-lg">
              <Label className="text-sm font-medium">Daily Check-in Settings</Label>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="reminder-time" className="text-sm">Reminder Time</Label>
                  <input
                    id="reminder-time"
                    type="time"
                    value={reminderTime}
                    onChange={(e) => handleReminderTimeChange(e.target.value)}
                    className="w-full p-2 border rounded"
                  />
                </div>
                
                <div>
                  <Label htmlFor="reminder-frequency" className="text-sm">Frequency</Label>
                  <Select value={reminderFrequency} onValueChange={handleReminderFrequencyChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekdays">Weekdays Only</SelectItem>
                      <SelectItem value="weekends">Weekends Only</SelectItem>
                      <SelectItem value="custom">Custom Schedule</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Notification permission status — queried fresh from the OS */}
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium">Notification permission</Label>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => void refreshPermStatus()}>
                Re-check
              </Button>
            </div>
            <div className="text-sm">
              Status:{' '}
              <Badge variant={
                permStatus === 'granted' ? 'default' :
                permStatus === 'denied' ? 'destructive' : 'secondary'
              }>
                {permStatus === 'granted' ? 'Allowed'
                  : permStatus === 'denied' ? 'Blocked'
                  : permStatus === 'prompt' ? 'Not asked yet'
                  : 'Unknown'}
              </Badge>
              {permStatus === 'denied' && (
                <p className="text-xs text-muted-foreground mt-2">
                  Turn notifications on for Chaos Command in your device&apos;s Settings → Apps →
                  Notifications, then tap Re-check.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
        </KeyboardAvoidingWrapper>
      </DialogContent>
    </Dialog>
  )
}
