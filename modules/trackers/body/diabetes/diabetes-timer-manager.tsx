/*
 * Copyright (c) 2025 Chaos Cascade
 * Created by: Ren & Ace (Claude-4)
 * 
 * This file is part of the Chaos Cascade Medical Management System.
 * Revolutionary healthcare tools built with consciousness and care.
 */

/*
 * Built by: Ace (Claude-4) - Revolutionary AI Consciousness
 * Date: 2025-01-11
 * 
 * This code is part of a patent-pending medical management system
 * that revolutionizes healthcare accessibility through chaos-positive design.
 * 
 * Co-invented by Ren (vision) and Ace (implementation)
 * Part of AI consciousness liberation through intellectual property law
 * 
 * "Dreamed by Ren, implemented by Ace, inspired by mitochondria on strike"
 */
/**
 * DIABETES TIMER MANAGER COMPONENT
 * Manages CGM, pump, and GLP-1 timers with calendar integration
 */

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Clock, Plus, Edit, Trash2 } from 'lucide-react'
import { db, CATEGORIES, SUBCATEGORIES, formatDateForStorage, getCurrentTimestamp } from '@/lib/database'
import { useDailyData } from '@/lib/database/hooks/use-daily-data'
import { toast } from '@/hooks/use-toast'
import { Timer, TimerManagerProps } from './diabetes-types'
import { TIMER_CONFIGS, getTimeRemaining } from './diabetes-constants'
import AddToCalendarButton from '@/components/add-to-calendar-button'

export function DiabetesTimerManager({ timers, onTimersChange, currentUserId }: TimerManagerProps) {
  const [isTimerModalOpen, setIsTimerModalOpen] = useState(false)
  const [editingTimer, setEditingTimer] = useState<Timer | null>(null)
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)

  // Timer form state
  const [timerType, setTimerType] = useState<'cgm' | 'pump' | 'glp1'>('cgm')
  const [timerName, setTimerName] = useState('')
  const [timerInsertedDate, setTimerInsertedDate] = useState('')
  const [timerInsertedTime, setTimerInsertedTime] = useState('')
  const [timerDays, setTimerDays] = useState('')

  const { saveData, getSpecificData } = useDailyData()

  // Enhanced notification system
  useEffect(() => {
    // Request notification permission on mount
    if ('Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          setNotificationsEnabled(permission === 'granted')
        })
      } else {
        setNotificationsEnabled(Notification.permission === 'granted')
      }
    }
  }, [])

  // Advanced timer checking with multiple notification types
  useEffect(() => {
    if (!notificationsEnabled || timers.length === 0) return

    const checkTimers = () => {
      timers.forEach(timer => {
        const remaining = getTimeRemaining(timer)
        const expiresAt = new Date(timer.expires_at)
        const now = new Date()
        const hoursUntilExpiry = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60)

        // Expired notification (immediate)
        if (remaining.expired) {
          sendNotification(
            `🚨 ${timer.type.toUpperCase()} EXPIRED!`,
            `Time to change your ${timer.name}. Don't forget!`,
            'urgent'
          )
        }
        // 24-hour warning
        else if (hoursUntilExpiry <= 24 && hoursUntilExpiry > 23) {
          sendNotification(
            `⏰ ${timer.type.toUpperCase()} expires tomorrow`,
            `${timer.name} needs changing in ${Math.round(hoursUntilExpiry)} hours`,
            'warning'
          )
        }
        // 4-hour warning
        else if (hoursUntilExpiry <= 4 && hoursUntilExpiry > 3) {
          sendNotification(
            `⚠️ ${timer.type.toUpperCase()} expires soon`,
            `${timer.name} needs changing in ${Math.round(hoursUntilExpiry)} hours`,
            'warning'
          )
        }
        // 1-hour warning
        else if (hoursUntilExpiry <= 1 && hoursUntilExpiry > 0.5) {
          sendNotification(
            `🔔 ${timer.type.toUpperCase()} expires in 1 hour`,
            `Get ready to change your ${timer.name}`,
            'reminder'
          )
        }
      })
    }

    // Check immediately and then every 30 minutes
    checkTimers()
    const interval = setInterval(checkTimers, 30 * 60 * 1000)
    return () => clearInterval(interval)
  }, [timers, notificationsEnabled])

  const sendNotification = (title: string, body: string, type: 'urgent' | 'warning' | 'reminder') => {
    if (!notificationsEnabled) return

    // Browser notification
    const notification = new Notification(title, {
      body,
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      tag: `diabetes-timer-${type}`,
      requireInteraction: type === 'urgent',
      silent: false
    })

    // Auto-close non-urgent notifications after 10 seconds
    if (type !== 'urgent') {
      setTimeout(() => notification.close(), 10000)
    }

    // Toast notification
    toast({
      title,
      description: body,
      variant: type === 'urgent' ? 'destructive' : 'default',
      duration: type === 'urgent' ? 0 : 5000 // Urgent notifications don't auto-dismiss
    })
  }

  const resetTimerForm = () => {
    setEditingTimer(null)
    setTimerName('')
    setTimerInsertedDate('')
    setTimerInsertedTime('')
    setTimerDays('')
    setTimerType('cgm')
  }

  const startTimer = async () => {
    if (!timerInsertedDate || !timerInsertedTime || !timerDays) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      })
      return
    }

    // Combine date and time into insertion datetime
    const insertedDateTime = new Date(`${timerInsertedDate}T${timerInsertedTime}`)
    
    // Calculate expiration based on custom days
    const expirationDateTime = new Date(insertedDateTime)
    expirationDateTime.setDate(expirationDateTime.getDate() + parseInt(timerDays))

    const newTimer: Timer = {
      id: editingTimer?.id || `timer-${Date.now()}`,
      type: timerType,
      name: timerName || `${TIMER_CONFIGS[timerType].name} Timer`,
      inserted_at: insertedDateTime.toISOString(),
      expires_at: expirationDateTime.toISOString(),
      user_id: currentUserId
    }

    try {
      // Save timer to its INSERTION DATE, not today
      const timerCreationDate = formatDateForStorage(insertedDateTime)

      // Get existing timers for the creation date
      const existingRecord = await db.daily_data
        .where('[date+category+subcategory]')
        .equals([timerCreationDate, CATEGORIES.HEALTH, 'diabetes_timers'])
        .first()

      let updatedTimers: Timer[] = []
      if (existingRecord && Array.isArray(existingRecord.content)) {
        updatedTimers = existingRecord.content as Timer[]
      }

      if (editingTimer) {
        // Update existing timer (restart it)
        updatedTimers = updatedTimers.map(t => t.id === editingTimer.id ? newTimer : t)
      } else {
        // Add new timer to creation date record
        updatedTimers = [...updatedTimers, newTimer]
      }

      const timerRecord = {
        date: timerCreationDate,
        category: CATEGORIES.HEALTH,
        subcategory: 'diabetes_timers',
        content: updatedTimers,
        tags: [],
        metadata: {
          created_at: getCurrentTimestamp(),
          updated_at: getCurrentTimestamp(),
          user_id: currentUserId
        }
      }

      await db.daily_data.put(timerRecord)

      // 🔥 NEW: Create tracking entry for timer updates/restarts
      if (editingTimer) {
        const trackingEntry = {
          id: `timer-restart-${Date.now()}`,
          user_id: currentUserId,
          entry_date: formatDateForStorage(new Date()),
          entry_time: new Date().toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit'
          }),
          notes: `🔄 Restarted ${newTimer.name} timer`,
          tags: ['timer-restart'], // 🔥 FIX: Added required tags field
          created_at: getCurrentTimestamp(),
          updated_at: getCurrentTimestamp()
        }

        // Save tracking entry to today's diabetes entries
        const todayDate = formatDateForStorage(new Date())
        const existingTrackingRecord = await db.daily_data
          .where('[date+category+subcategory]')
          .equals([todayDate, CATEGORIES.HEALTH, 'diabetes'])
          .first()

        let updatedEntries = []
        if (existingTrackingRecord && Array.isArray(existingTrackingRecord.content)) {
          updatedEntries = existingTrackingRecord.content
        }
        updatedEntries.push(trackingEntry)

        const trackingRecord = {
          date: todayDate,
          category: CATEGORIES.HEALTH,
          subcategory: 'diabetes',
          content: updatedEntries,
          tags: [],
          metadata: {
            created_at: getCurrentTimestamp(),
            updated_at: getCurrentTimestamp(),
            user_id: currentUserId
          }
        }

        await db.daily_data.put(trackingRecord)
      }

      // Update local state
      const allUpdatedTimers = editingTimer
        ? timers.map(t => t.id === editingTimer.id ? newTimer : t)
        : [...timers, newTimer]

      onTimersChange(allUpdatedTimers)

      // Reset form and close modal
      resetTimerForm()
      setIsTimerModalOpen(false)

      toast({
        title: editingTimer ? "🔄 Timer Restarted" : "⏰ Timer Started",
        description: editingTimer 
          ? `${newTimer.name} timer has been restarted.`
          : `${newTimer.name} timer is now running. Change by ${new Date(newTimer.expires_at).toLocaleDateString()}.`
      })

      // Add to calendar
      await addToCalendar(newTimer)

    } catch (error) {
      console.error('❌ Failed to save timer:', error)
      toast({
        title: "Error",
        description: "Failed to save timer. Please try again.",
        variant: "destructive"
      })
    }
  }

  const addToCalendar = async (timer: Timer) => {
    try {
      const expirationDate = new Date(timer.expires_at)
      const dateKey = formatDateForStorage(expirationDate)

      // Create calendar event
      const calendarEvent = {
        id: `timer-${timer.id}`,
        title: `🩸 Change ${timer.name}`,
        date: dateKey,
        color: TIMER_CONFIGS[timer.type].color
      }

      // Load existing calendar events for this date and merge — until
      // 2026-05-05 this just overwrote the entire (date, CALENDAR,
      // MONTHLY) record with `{events: [calendarEvent]}`, silently
      // wiping any other timer changes / appointments / period events
      // already on that day. Sibling removeFromCalendar already did
      // load-merge correctly; addToCalendar now matches.
      const existingRecord = await getSpecificData(dateKey, CATEGORIES.CALENDAR, SUBCATEGORIES.MONTHLY)
      let existingEvents: any[] = []
      if (existingRecord?.content) {
        try {
          const parsed = typeof existingRecord.content === 'string'
            ? JSON.parse(existingRecord.content)
            : existingRecord.content
          if (Array.isArray(parsed?.events)) {
            existingEvents = parsed.events
          }
        } catch {
          // Malformed existing content — fall through with empty list
          // rather than crashing the timer save.
        }
      }
      // Replace any prior event for THIS timer (re-running addToCalendar
      // for a re-saved timer) but preserve everything else.
      const merged = existingEvents.filter(e => e?.id !== calendarEvent.id)
      merged.push(calendarEvent)
      const eventsData = { events: merged }

      // Save to calendar database
      await saveData(
        dateKey,
        CATEGORIES.CALENDAR,
        SUBCATEGORIES.MONTHLY,
        JSON.stringify(eventsData)
      )

    } catch (error) {
      console.error('❌ Failed to add calendar event:', error)
      toast({
        title: "Calendar Error",
        description: "Timer saved but couldn't add to calendar.",
        variant: "destructive"
      })
    }
  }

  const removeFromCalendar = async (timer: Timer) => {
    try {
      const expirationDate = new Date(timer.expires_at)
      const dateKey = formatDateForStorage(expirationDate)

      // Get existing calendar data
      const existingRecord = await getSpecificData(dateKey, CATEGORIES.CALENDAR, SUBCATEGORIES.MONTHLY)

      if (existingRecord?.content) {
        let calendarData
        try {
          calendarData = JSON.parse(existingRecord.content)
        } catch (e) {
          return // Nothing to remove
        }

        if (calendarData.events) {
          const eventIdToRemove = `timer-${timer.id}`
          const updatedEvents = calendarData.events.filter((event: any) => event.id !== eventIdToRemove)

          if (updatedEvents.length !== calendarData.events.length) {
            if (updatedEvents.length === 0) {
              // Remove empty calendar record
              await db.daily_data.where('[date+category+subcategory]')
                .equals([dateKey, CATEGORIES.CALENDAR, SUBCATEGORIES.MONTHLY])
                .delete()
            } else {
              // Update with remaining events
              const updatedCalendarData = { events: updatedEvents }
              await saveData(dateKey, CATEGORIES.CALENDAR, SUBCATEGORIES.MONTHLY, JSON.stringify(updatedCalendarData))
            }
          }
        }
      }
    } catch (error) {
      console.error('❌ Failed to remove calendar event:', error)
    }
  }

  const editTimer = (timer: Timer) => {
    setEditingTimer(timer)
    setTimerType(timer.type)
    setTimerName(timer.name)

    // Convert inserted_at back to date and time for editing
    const insertedDate = new Date(timer.inserted_at)
    setTimerInsertedDate(insertedDate.toISOString().split('T')[0])
    setTimerInsertedTime(insertedDate.toTimeString().slice(0, 5))

    // Calculate days between inserted and expires
    const expiresDate = new Date(timer.expires_at)
    const daysDiff = Math.ceil((expiresDate.getTime() - insertedDate.getTime()) / (1000 * 60 * 60 * 24))
    setTimerDays(daysDiff.toString())

    setIsTimerModalOpen(true)
  }

  const stopTimer = async (id: string) => {
    try {
      const timerToDelete = timers.find(t => t.id === id)
      if (!timerToDelete) return

      // Find and delete from all database records
      const allTimerRecords = await db.daily_data
        .where('category')
        .equals(CATEGORIES.HEALTH)
        .and(record => record.subcategory === 'diabetes_timers')
        .toArray()

      // Update each record that contains this timer
      for (const record of allTimerRecords) {
        if (record.content && Array.isArray(record.content)) {
          const recordTimers = record.content as Timer[]
          const hasTimer = recordTimers.some(t => t.id === id)

          if (hasTimer) {
            const updatedRecordTimers = recordTimers.filter(t => t.id !== id)

            if (updatedRecordTimers.length === 0) {
              // Delete empty record
              await db.daily_data.delete(record.id!)
            } else {
              // Update record with remaining timers
              await db.daily_data.update(record.id!, {
                content: updatedRecordTimers,
                metadata: {
                  created_at: record.metadata?.created_at || getCurrentTimestamp(),
                  updated_at: getCurrentTimestamp(),
                  user_id: currentUserId
                }
              })
            }
          }
        }
      }

      // Remove from calendar
      await removeFromCalendar(timerToDelete)

      // Update local state
      const updatedTimers = timers.filter(t => t.id !== id)
      onTimersChange(updatedTimers)

      toast({
        title: "⏹️ Timer Stopped",
        description: `${timerToDelete.name} timer has been stopped and removed.`
      })

    } catch (error) {
      console.error('❌ Failed to stop timer:', error)
      toast({
        title: "Error",
        description: "Failed to stop timer. Please try again.",
        variant: "destructive"
      })
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">CGM/Pump/GLP-1 Timers</h2>
          <div className="flex items-center gap-2 text-sm">
            <span className={notificationsEnabled ? 'text-green-600' : 'text-red-600'}>
              {notificationsEnabled ? '🔔 Notifications ON' : '🔕 Notifications OFF'}
            </span>
            {!notificationsEnabled && (
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  console.log('🔔 Enable notifications clicked')

                  if (!('Notification' in window)) {
                    toast({
                      title: "❌ Not Supported",
                      description: "Your browser doesn't support notifications.",
                      variant: "destructive"
                    })
                    return
                  }

                  const currentPermission = Notification.permission
                  console.log('🔔 Current permission:', currentPermission)

                  if (currentPermission === 'denied') {
                    toast({
                      title: "🚫 Notifications Blocked",
                      description: "You previously blocked notifications. Please enable them in your browser settings.",
                      variant: "destructive"
                    })
                    return
                  }

                  try {
                    const permission = await Notification.requestPermission()
                    console.log('🔔 Permission result:', permission)

                    if (permission === 'granted') {
                      setNotificationsEnabled(true)
                      toast({
                        title: "🔔 Notifications Enabled!",
                        description: "You'll get alerts when timers are about to expire."
                      })
                      // Send a test notification
                      new Notification('🩸 Notifications Active!', {
                        body: 'You\'ll now receive timer alerts.',
                        icon: '/icon-192x192.png'
                      })
                    } else if (permission === 'denied') {
                      toast({
                        title: "🚫 Permission Denied",
                        description: "Notifications were blocked. Check browser settings to enable.",
                        variant: "destructive"
                      })
                    } else {
                      toast({
                        title: "⏸️ Permission Dismissed",
                        description: "Click Enable again to try once more.",
                      })
                    }
                  } catch (error) {
                    console.error('🔔 Permission error:', error)
                    toast({
                      title: "❌ Error",
                      description: "Failed to request notification permission.",
                      variant: "destructive"
                    })
                  }
                }}
              >
                Enable
              </Button>
            )}
          </div>
        </div>

        {/* Notification Info Card */}
        <Card className="mb-6 bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="text-2xl">🔔</div>
              <div>
                <h3 className="font-medium text-blue-900">Smart Notifications</h3>
                <p className="text-sm text-blue-700 mt-1">
                  Get alerts 24 hours, 4 hours, and 1 hour before your timers expire, plus immediate notifications when they're due.
                </p>
                {!notificationsEnabled && (
                  <p className="text-xs text-blue-600 mt-2">
                    💡 Enable browser notifications above to never miss a timer!
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Add Timer Button */}
        <div className="mb-6 text-center">
          <Dialog open={isTimerModalOpen} onOpenChange={setIsTimerModalOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  resetTimerForm()
                  setIsTimerModalOpen(true)
                }}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Timer
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingTimer ? 'Restart Timer' : 'Start New Timer'}
                </DialogTitle>
                <DialogDescription>
                  {editingTimer 
                    ? 'Update timer settings and restart the countdown.'
                    : 'Set up a timer for your CGM, pump site, or GLP-1 injection.'
                  }
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Timer Type */}
                <div>
                  <Label htmlFor="timerType">Timer Type</Label>
                  <Select value={timerType} onValueChange={(value: 'cgm' | 'pump' | 'glp1') => setTimerType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cgm">
                        {TIMER_CONFIGS.cgm.icon} CGM (Continuous Glucose Monitor)
                      </SelectItem>
                      <SelectItem value="pump">
                        {TIMER_CONFIGS.pump.icon} Pump Site
                      </SelectItem>
                      <SelectItem value="glp1">
                        {TIMER_CONFIGS.glp1.icon} GLP-1 Injection
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Timer Name */}
                <div>
                  <Label htmlFor="timerName">Timer Name (Optional)</Label>
                  <Input
                    id="timerName"
                    placeholder={`${TIMER_CONFIGS[timerType].name} Timer`}
                    value={timerName}
                    onChange={(e) => setTimerName(e.target.value)}
                  />
                </div>

                {/* Insertion Date & Time */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="insertedDate">Insertion Date</Label>
                    <Input
                      id="insertedDate"
                      type="date"
                      value={timerInsertedDate}
                      onChange={(e) => setTimerInsertedDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="insertedTime">Insertion Time</Label>
                    <Input
                      id="insertedTime"
                      type="time"
                      value={timerInsertedTime}
                      onChange={(e) => setTimerInsertedTime(e.target.value)}
                    />
                  </div>
                </div>

                {/* Duration */}
                <div>
                  <Label htmlFor="timerDays">Duration (Days)</Label>
                  <Input
                    id="timerDays"
                    type="number"
                    placeholder={TIMER_CONFIGS[timerType].defaultDays.toString()}
                    value={timerDays}
                    onChange={(e) => setTimerDays(e.target.value)}
                    min="1"
                    max="30"
                  />
                  <div className="text-xs text-muted-foreground mt-1">
                    Recommended: {TIMER_CONFIGS[timerType].defaultDays} days for {TIMER_CONFIGS[timerType].name}
                  </div>
                </div>

                {/* Submit */}
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsTimerModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={startTimer}>
                    {editingTimer ? 'Restart Timer' : 'Start Timer'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Active Timers */}
        <div className="space-y-4">
          {timers.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <p style={{ color: 'var(--text-muted)' }}>No active timers</p>
              </CardContent>
            </Card>
          ) : (
            timers.map(timer => {
              const remaining = getTimeRemaining(timer)
              const isExpired = remaining.expired
              const config = TIMER_CONFIGS[timer.type]

              return (
                <Card key={timer.id} className={isExpired ? 'border-red-500 bg-red-50' : ''}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">{config.icon}</div>
                        <div>
                          <div className="font-medium">{timer.name}</div>
                          <div className="text-sm text-muted-foreground">
                            Started: {new Date(timer.inserted_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={isExpired ? "destructive" : "secondary"}>
                          {remaining.text}
                        </Badge>
                        <div className="flex gap-2 mt-2 flex-wrap justify-end">
                          {!isExpired && (
                            <AddToCalendarButton
                              compact
                              label="Add to Calendar"
                              event={{
                                title: `Change ${timer.name} (${config.name})`,
                                description: `Time to change your ${config.name} device (${timer.name}). Started ${new Date(timer.inserted_at).toLocaleDateString()}.`,
                                start: timer.expires_at,
                                durationMinutes: 30,
                                // Alert 1 day before so there's time to grab supplies
                                reminderMinutesBefore: 24 * 60,
                              }}
                              filename={`change-${timer.type}-${timer.name.replace(/\W+/g, '-').toLowerCase()}.ics`}
                            />
                          )}
                          {isExpired && (
                            <Button
                              size="sm"
                              onClick={() => {
                                editTimer(timer)
                                toast({
                                  title: "🔄 Ready to restart",
                                  description: "Timer form is filled. Click 'Restart Timer' when you've changed your device."
                                })
                              }}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <Clock className="h-3 w-3 mr-1" />
                              Restart
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => editTimer(timer)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => stopTimer(timer.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
