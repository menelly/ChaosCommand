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
import { Bell, Clock, Pill, Calendar, Database } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { KeyboardAvoidingWrapper } from '@/components/ui/keyboard-avoiding-wrapper'
import { getBackupSettings, setBackupSettings, type BackupCadence } from "@/lib/backup-reminder"

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

  // Backup reminder (opt-in, per-PIN, in-app banner — works without OS notifications)
  const [backupReminderEnabled, setBackupReminderEnabled] = useState(false)
  const [backupCadence, setBackupCadence] = useState<BackupCadence>("entries")
  const [backupThreshold, setBackupThreshold] = useState(20)

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
  }, [])

  const handleNotificationsToggle = (enabled: boolean) => {
    setNotificationsEnabled(enabled)
    localStorage.setItem('chaos-notifications-enabled', enabled.toString())
    
    if (enabled) {
      // Request notification permission
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission()
      }
    }
  }

  const handleMedicationRemindersToggle = (enabled: boolean) => {
    setMedicationReminders(enabled)
    localStorage.setItem('chaos-medication-reminders', enabled.toString())
  }

  const handleAppointmentAlertsToggle = (enabled: boolean) => {
    setAppointmentAlerts(enabled)
    localStorage.setItem('chaos-appointment-alerts', enabled.toString())
  }

  const handleDailyCheckInsToggle = (enabled: boolean) => {
    setDailyCheckIns(enabled)
    localStorage.setItem('chaos-daily-checkins', enabled.toString())
  }

  const handleReminderTimeChange = (time: string) => {
    setReminderTime(time)
    localStorage.setItem('chaos-reminder-time', time)
  }

  const handleReminderFrequencyChange = (frequency: string) => {
    setReminderFrequency(frequency)
    localStorage.setItem('chaos-reminder-frequency', frequency)
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

  const testNotification = () => {
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
            
            {/* Medication Reminders */}
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <Pill className="h-4 w-4" />
                <div>
                  <div className="font-medium">Medication Reminders</div>
                  <div className="text-xs text-muted-foreground">
                    Remind you to take medications and supplements
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Coming Soon</Badge>
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

          {/* Browser Notification Status */}
          <div className="p-3 bg-muted rounded-lg">
            <Label className="text-sm font-medium mb-2 block">Browser Status</Label>
            <div className="text-sm">
              {typeof window !== 'undefined' && 'Notification' in window ? (
                <>
                  Permission: <Badge variant={
                    Notification.permission === 'granted' ? 'default' : 
                    Notification.permission === 'denied' ? 'destructive' : 'secondary'
                  }>
                    {Notification.permission}
                  </Badge>
                </>
              ) : (
                <Badge variant="destructive">Not Supported</Badge>
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
