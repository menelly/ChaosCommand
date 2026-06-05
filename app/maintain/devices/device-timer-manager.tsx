/*
 * Built by: Ace (Claude 4.x)
 * Date: 2026-06-04
 *
 * Generic device & timer manager. Generalized from the old diabetes-only
 * DiabetesTimerManager (cgm | pump | glp1) into a preset-driven system that
 * tracks any swap-on-a-schedule device (see device-types.ts). Reads/writes the
 * SAME 'diabetes_timers' storage for back-compat — existing timers carry over.
 *
 * Stage A: generic presets + custom, .ics calendar export as the cross-platform
 * "fires when closed" interim. The old in-app setInterval Notification spam
 * (only fired while the app was open = broken) is intentionally gone; real
 * scheduled OS notifications land in Stage B via @tauri-apps/plugin-notification.
 *
 * Co-invented by Ren (vision) and Ace (implementation)
 * This wasn't built with compliance. It was built with defiance.
 */

'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
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
import AddToCalendarButton from '@/components/add-to-calendar-button'
import { scheduleOsNotification, cancelOsNotification } from '@/lib/services/notification-service'
import {
  DeviceTimer,
  DeviceEvent,
  DEVICE_PRESETS,
  DEVICE_TIMER_SUBCATEGORY,
  DEVICE_LOG_SUBCATEGORY,
  getDeviceConfig,
  deviceDisplayName,
  getTimeRemaining,
} from './device-types'

// Downscale + compress an image File to a base64 JPEG data URL so a sensor-box
// photo doesn't bloat the record. Longest edge capped, quality 0.7.
async function fileToCompressedDataUrl(file: File, maxEdge = 1024): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = reject
    r.readAsDataURL(file)
  })
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image()
      i.onload = () => resolve(i)
      i.onerror = reject
      i.src = dataUrl
    })
    const scale = Math.min(1, maxEdge / Math.max(img.width, img.height))
    const w = Math.round(img.width * scale)
    const h = Math.round(img.height * scale)
    const canvas = document.createElement('canvas')
    canvas.width = w; canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return dataUrl
    ctx.drawImage(img, 0, 0, w, h)
    return canvas.toDataURL('image/jpeg', 0.7)
  } catch {
    return dataUrl // fall back to the raw read if canvas fails
  }
}

interface DeviceTimerManagerProps {
  timers: DeviceTimer[]
  onTimersChange: (timers: DeviceTimer[]) => void
  currentUserId: string
}

export function DeviceTimerManager({ timers, onTimersChange, currentUserId }: DeviceTimerManagerProps) {
  const [isTimerModalOpen, setIsTimerModalOpen] = useState(false)
  const [editingTimer, setEditingTimer] = useState<DeviceTimer | null>(null)

  // Timer form state
  const [timerType, setTimerType] = useState<string>('cgm')
  const [customName, setCustomName] = useState('')
  const [timerName, setTimerName] = useState('')
  const [timerInsertedDate, setTimerInsertedDate] = useState('')
  const [timerInsertedTime, setTimerInsertedTime] = useState('')
  const [timerDays, setTimerDays] = useState('')
  const [serialNumber, setSerialNumber] = useState('')
  const [lotNumber, setLotNumber] = useState('')
  const [photo, setPhoto] = useState('')

  const { saveData, getSpecificData } = useDailyData()

  // Append a device-change event to the history log (started/restarted/stopped).
  // On restart/stop, computes how long the PRIOR instance actually lasted vs its
  // expected duration — the early-failure signal that powers warranty claims.
  const logDeviceEvent = async (e: Omit<DeviceEvent, 'id' | 'at'>) => {
    const day = formatDateForStorage(new Date())
    const id = `devlog-${Date.now()}-${Math.round(Math.abs((e.timerId || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0)))}`
    const event: DeviceEvent = { ...e, id, at: new Date().toISOString() }
    try {
      const existing = await db.daily_data
        .where('[date+category+subcategory]')
        .equals([day, CATEGORIES.HEALTH, DEVICE_LOG_SUBCATEGORY])
        .first()
      const list: DeviceEvent[] = existing && Array.isArray(existing.content) ? existing.content as DeviceEvent[] : []
      list.push(event)
      await db.daily_data.put({
        date: day,
        category: CATEGORIES.HEALTH,
        subcategory: DEVICE_LOG_SUBCATEGORY,
        content: list,
        tags: [],
        metadata: {
          created_at: existing?.metadata?.created_at || getCurrentTimestamp(),
          updated_at: getCurrentTimestamp(),
          user_id: currentUserId,
        },
      })
    } catch (err) {
      console.error('Failed to log device event:', err)
    }
  }

  const activePreset = getDeviceConfig(timerType, customName)

  // Hand the OS a real scheduled notification for a timer: one a day before it
  // expires, one when it's due. Re-scheduling is idempotent (cancels by key
  // first), so calling this on every save/restart is safe. Fires even when the
  // app is closed on mobile — see notification-service.ts for the caveats.
  const scheduleTimerNotifications = async (timer: DeviceTimer) => {
    const cfg = getDeviceConfig(timer.type, timer.customName)
    const expires = new Date(timer.expires_at)
    const leadAt = new Date(expires.getTime() - 24 * 60 * 60 * 1000)
    await scheduleOsNotification({
      key: `device-timer-${timer.id}-lead`,
      title: `${cfg.icon} ${timer.name} expires tomorrow`,
      body: `Your ${cfg.name} is due for a change soon — grab supplies.`,
      fireAt: leadAt,
    })
    await scheduleOsNotification({
      key: `device-timer-${timer.id}`,
      title: `${cfg.icon} Time to change ${timer.name}`,
      body: `Your ${cfg.name} is due now.`,
      fireAt: expires,
    })
  }

  const cancelTimerNotifications = async (id: string) => {
    await cancelOsNotification(`device-timer-${id}-lead`)
    await cancelOsNotification(`device-timer-${id}`)
  }

  const resetTimerForm = () => {
    setEditingTimer(null)
    setTimerType('cgm')
    setCustomName('')
    setTimerName('')
    setTimerInsertedDate('')
    setTimerInsertedTime('')
    setTimerDays('')
    setSerialNumber('')
    setLotNumber('')
    setPhoto('')
  }

  const onTypeChange = (value: string) => {
    setTimerType(value)
    // Prefill duration with the preset's default if the user hasn't typed one,
    // or if they're just flipping presets before committing.
    const preset = getDeviceConfig(value)
    if (!timerDays || !editingTimer) setTimerDays(preset.defaultDays.toString())
  }

  const startTimer = async () => {
    if (!timerInsertedDate || !timerInsertedTime || !timerDays) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in the date, time, and how many days it lasts.',
        variant: 'destructive',
      })
      return
    }
    if (timerType === 'custom' && !customName.trim() && !timerName.trim()) {
      toast({
        title: 'Name your device',
        description: 'Give your custom device a name so you know what to change.',
        variant: 'destructive',
      })
      return
    }

    const insertedDateTime = new Date(`${timerInsertedDate}T${timerInsertedTime}`)
    const expirationDateTime = new Date(insertedDateTime)
    expirationDateTime.setDate(expirationDateTime.getDate() + parseInt(timerDays))

    const preset = getDeviceConfig(timerType, customName)
    const newTimer: DeviceTimer = {
      id: editingTimer?.id || `timer-${Date.now()}`,
      type: timerType,
      customName: timerType === 'custom' ? (customName.trim() || timerName.trim()) : undefined,
      name: timerName.trim() || `${preset.name} Timer`,
      inserted_at: insertedDateTime.toISOString(),
      expires_at: expirationDateTime.toISOString(),
      user_id: currentUserId,
      serialNumber: serialNumber.trim() || undefined,
      lotNumber: lotNumber.trim() || undefined,
      photo: photo || undefined,
    }

    try {
      const timerCreationDate = formatDateForStorage(insertedDateTime)

      const existingRecord = await db.daily_data
        .where('[date+category+subcategory]')
        .equals([timerCreationDate, CATEGORIES.HEALTH, DEVICE_TIMER_SUBCATEGORY])
        .first()

      let updatedTimers: DeviceTimer[] = []
      if (existingRecord && Array.isArray(existingRecord.content)) {
        updatedTimers = existingRecord.content as DeviceTimer[]
      }

      if (editingTimer) {
        updatedTimers = updatedTimers.map(t => (t.id === editingTimer.id ? newTimer : t))
        // If the edit changed the insertion date, the timer may live in a
        // different date record — make sure it lands here and is removed elsewhere.
        if (!updatedTimers.some(t => t.id === newTimer.id)) updatedTimers.push(newTimer)
      } else {
        updatedTimers = [...updatedTimers, newTimer]
      }

      await db.daily_data.put({
        date: timerCreationDate,
        category: CATEGORIES.HEALTH,
        subcategory: DEVICE_TIMER_SUBCATEGORY,
        content: updatedTimers,
        tags: [],
        metadata: {
          created_at: existingRecord?.metadata?.created_at || getCurrentTimestamp(),
          updated_at: getCurrentTimestamp(),
          user_id: currentUserId,
        },
      })

      // On edit, if the insertion date moved, scrub the timer out of its old
      // date record so it doesn't duplicate across two days.
      if (editingTimer) {
        const oldDate = formatDateForStorage(new Date(editingTimer.inserted_at))
        if (oldDate !== timerCreationDate) {
          const oldRecord = await db.daily_data
            .where('[date+category+subcategory]')
            .equals([oldDate, CATEGORIES.HEALTH, DEVICE_TIMER_SUBCATEGORY])
            .first()
          if (oldRecord && Array.isArray(oldRecord.content)) {
            const pruned = (oldRecord.content as DeviceTimer[]).filter(t => t.id !== newTimer.id)
            if (pruned.length === 0) {
              await db.daily_data.delete(oldRecord.id!)
            } else {
              await db.daily_data.update(oldRecord.id!, { content: pruned, metadata: { ...oldRecord.metadata, created_at: oldRecord.metadata?.created_at || getCurrentTimestamp(), updated_at: getCurrentTimestamp() } })
            }
          }
        }
      }

      const allUpdatedTimers = editingTimer
        ? timers.map(t => (t.id === editingTimer.id ? newTimer : t))
        : [...timers, newTimer]
      onTimersChange(allUpdatedTimers)

      resetTimerForm()
      setIsTimerModalOpen(false)

      toast({
        title: editingTimer ? '🔄 Timer Restarted' : '⏰ Timer Started',
        description: editingTimer
          ? `${newTimer.name} has been restarted.`
          : `${newTimer.name} is running. Change by ${new Date(newTimer.expires_at).toLocaleDateString()}.`,
      })

      await addToCalendar(newTimer)
      await scheduleTimerNotifications(newTimer)

      // Log the change event. On a restart, compute how long the PRIOR instance
      // actually lasted (replace-now minus old start) vs what was expected —
      // that's the early-failure / warranty signal.
      const expectedDays = parseInt(timerDays)
      if (editingTimer) {
        const priorStart = new Date(editingTimer.inserted_at).getTime()
        const actualDays = Math.max(0, Math.round((Date.now() - priorStart) / (1000 * 60 * 60 * 24)))
        await logDeviceEvent({
          timerId: newTimer.id, type: newTimer.type, customName: newTimer.customName, name: newTimer.name,
          action: 'restarted', inserted_at: newTimer.inserted_at, expires_at: newTimer.expires_at,
          expectedDays, actualDays, earlyFailure: actualDays < expectedDays - 1,
          serialNumber: newTimer.serialNumber, lotNumber: newTimer.lotNumber,
        })
      } else {
        await logDeviceEvent({
          timerId: newTimer.id, type: newTimer.type, customName: newTimer.customName, name: newTimer.name,
          action: 'started', inserted_at: newTimer.inserted_at, expires_at: newTimer.expires_at,
          expectedDays, serialNumber: newTimer.serialNumber, lotNumber: newTimer.lotNumber,
        })
      }
    } catch (error) {
      console.error('❌ Failed to save device timer:', error)
      toast({ title: 'Error', description: 'Failed to save timer. Please try again.', variant: 'destructive' })
    }
  }

  const addToCalendar = async (timer: DeviceTimer) => {
    try {
      const expirationDate = new Date(timer.expires_at)
      const dateKey = formatDateForStorage(expirationDate)
      const config = getDeviceConfig(timer.type, timer.customName)

      const calendarEvent = {
        id: `timer-${timer.id}`,
        title: `${config.icon} Change ${timer.name}`,
        date: dateKey,
        color: config.color,
      }

      const existingRecord = await getSpecificData(dateKey, CATEGORIES.CALENDAR, SUBCATEGORIES.MONTHLY)
      let existingEvents: any[] = []
      if (existingRecord?.content) {
        try {
          const parsed = typeof existingRecord.content === 'string'
            ? JSON.parse(existingRecord.content)
            : existingRecord.content
          if (Array.isArray(parsed?.events)) existingEvents = parsed.events
        } catch { /* malformed — start fresh rather than crash the save */ }
      }
      const merged = existingEvents.filter(e => e?.id !== calendarEvent.id)
      merged.push(calendarEvent)

      await saveData(dateKey, CATEGORIES.CALENDAR, SUBCATEGORIES.MONTHLY, JSON.stringify({ events: merged }))
    } catch (error) {
      console.error('❌ Failed to add calendar event:', error)
    }
  }

  const removeFromCalendar = async (timer: DeviceTimer) => {
    try {
      const dateKey = formatDateForStorage(new Date(timer.expires_at))
      const existingRecord = await getSpecificData(dateKey, CATEGORIES.CALENDAR, SUBCATEGORIES.MONTHLY)
      if (!existingRecord?.content) return

      let calendarData: any
      try {
        calendarData = typeof existingRecord.content === 'string' ? JSON.parse(existingRecord.content) : existingRecord.content
      } catch { return }

      if (Array.isArray(calendarData?.events)) {
        const eventId = `timer-${timer.id}`
        const updatedEvents = calendarData.events.filter((e: any) => e.id !== eventId)
        if (updatedEvents.length !== calendarData.events.length) {
          if (updatedEvents.length === 0) {
            await db.daily_data.where('[date+category+subcategory]')
              .equals([dateKey, CATEGORIES.CALENDAR, SUBCATEGORIES.MONTHLY]).delete()
          } else {
            await saveData(dateKey, CATEGORIES.CALENDAR, SUBCATEGORIES.MONTHLY, JSON.stringify({ events: updatedEvents }))
          }
        }
      }
    } catch (error) {
      console.error('❌ Failed to remove calendar event:', error)
    }
  }

  const editTimer = (timer: DeviceTimer) => {
    setEditingTimer(timer)
    setTimerType(timer.type)
    setCustomName(timer.customName || '')
    setTimerName(timer.name)

    const insertedDate = new Date(timer.inserted_at)
    setTimerInsertedDate(insertedDate.toISOString().split('T')[0])
    setTimerInsertedTime(insertedDate.toTimeString().slice(0, 5))

    const expiresDate = new Date(timer.expires_at)
    const daysDiff = Math.ceil((expiresDate.getTime() - insertedDate.getTime()) / (1000 * 60 * 60 * 24))
    setTimerDays(daysDiff.toString())
    setSerialNumber(timer.serialNumber || '')
    setLotNumber(timer.lotNumber || '')
    setPhoto(timer.photo || '')

    setIsTimerModalOpen(true)
  }

  const stopTimer = async (id: string) => {
    try {
      const timerToDelete = timers.find(t => t.id === id)
      if (!timerToDelete) return

      const allTimerRecords = await db.daily_data
        .where('category')
        .equals(CATEGORIES.HEALTH)
        .and((record: any) => record.subcategory === DEVICE_TIMER_SUBCATEGORY)
        .toArray()

      for (const record of allTimerRecords) {
        if (record.content && Array.isArray(record.content)) {
          const recordTimers = record.content as DeviceTimer[]
          if (recordTimers.some(t => t.id === id)) {
            const remaining = recordTimers.filter(t => t.id !== id)
            if (remaining.length === 0) {
              await db.daily_data.delete(record.id!)
            } else {
              await db.daily_data.update(record.id!, {
                content: remaining,
                metadata: { ...record.metadata, created_at: record.metadata?.created_at || getCurrentTimestamp(), updated_at: getCurrentTimestamp(), user_id: currentUserId },
              })
            }
          }
        }
      }

      await removeFromCalendar(timerToDelete)
      await cancelTimerNotifications(id)

      // Log the stop with how long it actually lasted.
      const startedMs = new Date(timerToDelete.inserted_at).getTime()
      const expectedDays = Math.max(1, Math.round((new Date(timerToDelete.expires_at).getTime() - startedMs) / (1000 * 60 * 60 * 24)))
      const actualDays = Math.max(0, Math.round((Date.now() - startedMs) / (1000 * 60 * 60 * 24)))
      await logDeviceEvent({
        timerId: timerToDelete.id, type: timerToDelete.type, customName: timerToDelete.customName, name: timerToDelete.name,
        action: 'stopped', inserted_at: timerToDelete.inserted_at, expires_at: timerToDelete.expires_at,
        expectedDays, actualDays, earlyFailure: actualDays < expectedDays - 1,
        serialNumber: timerToDelete.serialNumber, lotNumber: timerToDelete.lotNumber,
      })

      onTimersChange(timers.filter(t => t.id !== id))

      toast({ title: '⏹️ Timer Stopped', description: `${timerToDelete.name} has been removed.` })
    } catch (error) {
      console.error('❌ Failed to stop device timer:', error)
      toast({ title: 'Error', description: 'Failed to stop timer. Please try again.', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6">
      {/* Add Timer Button */}
      <div className="text-center">
        <Dialog open={isTimerModalOpen} onOpenChange={setIsTimerModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetTimerForm(); setIsTimerModalOpen(true) }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Device / Timer
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingTimer ? 'Restart Timer' : 'Start New Timer'}</DialogTitle>
              <DialogDescription>
                {editingTimer
                  ? 'Update the device and restart the countdown.'
                  : 'Track anything that needs changing on a schedule — sensors, sites, dressings, injectables, and more.'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Device Type */}
              <div>
                <Label htmlFor="timerType">Device Type</Label>
                <Select value={timerType} onValueChange={onTypeChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DEVICE_PRESETS.map(p => (
                      <SelectItem key={p.key} value={p.key}>{p.icon} {p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {activePreset.note && (
                  <p className="text-xs text-muted-foreground mt-1">{activePreset.note}</p>
                )}
              </div>

              {/* Custom name (only for custom type) */}
              {timerType === 'custom' && (
                <div>
                  <Label htmlFor="customName">What is it?</Label>
                  <Input
                    id="customName"
                    placeholder="e.g. Wound vac canister, eye drops…"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                  />
                </div>
              )}

              {/* Instance Name */}
              <div>
                <Label htmlFor="timerName">Label (Optional)</Label>
                <Input
                  id="timerName"
                  placeholder={`${activePreset.name} Timer`}
                  value={timerName}
                  onChange={(e) => setTimerName(e.target.value)}
                />
              </div>

              {/* Insertion Date & Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="insertedDate">Started / Applied</Label>
                  <Input id="insertedDate" type="date" value={timerInsertedDate} onChange={(e) => setTimerInsertedDate(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="insertedTime">Time</Label>
                  <Input id="insertedTime" type="time" value={timerInsertedTime} onChange={(e) => setTimerInsertedTime(e.target.value)} />
                </div>
              </div>

              {/* Duration */}
              <div>
                <Label htmlFor="timerDays">Lasts (Days)</Label>
                <Input
                  id="timerDays"
                  type="number"
                  placeholder={activePreset.defaultDays.toString()}
                  value={timerDays}
                  onChange={(e) => setTimerDays(e.target.value)}
                  min="1"
                  max="365"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Typical for {activePreset.name}: {activePreset.defaultDays} days.
                </p>
              </div>

              {/* Warranty info — serial / lot / photo. Saves you when it dies early. */}
              <div className="space-y-3 rounded-lg border border-border p-3">
                <p className="text-xs font-medium text-muted-foreground">
                  Warranty info (optional) — worth it when a sensor dies on day 5
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="serial" className="text-xs">Serial #</Label>
                    <Input id="serial" value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} placeholder="device serial" />
                  </div>
                  <div>
                    <Label htmlFor="lot" className="text-xs">Lot / Batch #</Label>
                    <Input id="lot" value={lotNumber} onChange={(e) => setLotNumber(e.target.value)} placeholder="lot number" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="devphoto" className="text-xs">Photo of box / sensor</Label>
                  <Input
                    id="devphoto"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={async (e) => {
                      const f = e.target.files?.[0]
                      if (f) {
                        try { setPhoto(await fileToCompressedDataUrl(f)) }
                        catch { toast({ title: 'Photo error', description: 'Could not read that image.', variant: 'destructive' }) }
                      }
                    }}
                  />
                  {photo && (
                    <div className="mt-2 flex items-center gap-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photo} alt="device" className="h-16 w-16 rounded object-cover border border-border" />
                      <Button type="button" variant="ghost" size="sm" className="text-xs text-destructive" onClick={() => setPhoto('')}>Remove</Button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsTimerModalOpen(false)}>Cancel</Button>
                <Button onClick={startTimer}>{editingTimer ? 'Restart Timer' : 'Start Timer'}</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Active Timers */}
      <div className="space-y-3">
        {timers.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8 text-muted-foreground">
              No active timers yet. Add one above to start tracking when it needs changing.
            </CardContent>
          </Card>
        ) : (
          [...timers]
            .sort((a, b) => new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime())
            .map(timer => {
              const remaining = getTimeRemaining(timer)
              const isExpired = remaining.expired
              const config = getDeviceConfig(timer.type, timer.customName)
              return (
                <Card key={timer.id} className={isExpired ? 'border-destructive bg-destructive/10' : ''}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`h-10 w-10 shrink-0 rounded-lg ${config.iconBg} text-white flex items-center justify-center text-xl`}>
                          {config.icon}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium truncate">{timer.name}</div>
                          <div className="text-sm text-muted-foreground truncate">
                            {deviceDisplayName(timer)} · started {new Date(timer.inserted_at).toLocaleDateString()}
                          </div>
                          {(timer.serialNumber || timer.lotNumber || timer.photo) && (
                            <div className="flex items-center gap-2 mt-1">
                              {timer.photo && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={timer.photo} alt="device" className="h-8 w-8 rounded object-cover border border-border shrink-0" />
                              )}
                              {(timer.serialNumber || timer.lotNumber) && (
                                <div className="text-xs text-muted-foreground truncate">
                                  {timer.serialNumber && <>SN: {timer.serialNumber}</>}
                                  {timer.serialNumber && timer.lotNumber && ' · '}
                                  {timer.lotNumber && <>Lot: {timer.lotNumber}</>}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <Badge variant={isExpired ? 'destructive' : 'secondary'}>{remaining.text}</Badge>
                        <div className="flex gap-2 mt-2 flex-wrap justify-end">
                          {!isExpired && (
                            <AddToCalendarButton
                              compact
                              label="Calendar"
                              event={{
                                title: `Change ${timer.name} (${config.name})`,
                                description: `Time to change your ${config.name} (${timer.name}). Started ${new Date(timer.inserted_at).toLocaleDateString()}.`,
                                start: timer.expires_at,
                                durationMinutes: 30,
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
                                toast({ title: '🔄 Ready to restart', description: "Form is filled — hit 'Restart Timer' once you've changed it." })
                              }}
                            >
                              <Clock className="h-3 w-3 mr-1" /> Restart
                            </Button>
                          )}
                          <Button size="sm" variant="outline" onClick={() => editTimer(timer)}><Edit className="h-3 w-3" /></Button>
                          <Button size="sm" variant="destructive" onClick={() => stopTimer(timer.id)}><Trash2 className="h-3 w-3" /></Button>
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
  )
}
