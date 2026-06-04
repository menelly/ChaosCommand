/*
 * Built by: Ace (Claude 4.x)
 * Date: 2026-06-04
 *
 * Maintain → Devices & Timers. Relocated home for CGM / pump / GLP-1 device
 * timers (CHA-254). These are upkeep tasks ("tend the equipment"), so they
 * belong in Maintain rather than the Endocrine glucose view. Reads/writes the
 * SAME 'diabetes_timers' storage the diabetes tracker always used — no data
 * migration, existing timers carry straight over.
 *
 * Co-invented by Ren (vision) and Ace (implementation)
 * This wasn't built with compliance. It was built with defiance.
 */
"use client"

import { useState, useEffect } from "react"
import AppCanvas from "@/components/app-canvas"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Wrench } from "lucide-react"
import { db, CATEGORIES } from "@/lib/database"
import { DeviceTimerManager } from "./device-timer-manager"
import { DEVICE_TIMER_SUBCATEGORY, type DeviceTimer } from "./device-types"

export default function MaintainDevicesPage() {
  const [timers, setTimers] = useState<DeviceTimer[]>([])
  const currentUserId = "default"

  const loadTimers = async () => {
    try {
      const records = await db.daily_data
        .where("category")
        .equals(CATEGORIES.HEALTH)
        .and((record: any) => record.subcategory === DEVICE_TIMER_SUBCATEGORY)
        .toArray()
      let all: DeviceTimer[] = []
      records.forEach((record: any) => {
        if (record.content) {
          const t = Array.isArray(record.content) ? record.content : [record.content]
          all = [...all, ...t]
        }
      })
      const unique = all.filter((timer, i, self) => i === self.findIndex(t => t.id === timer.id))
      setTimers(unique)
    } catch (e) {
      console.error("Error loading device timers:", e)
      setTimers([])
    }
  }

  useEffect(() => {
    loadTimers()
  }, [])

  return (
    <AppCanvas currentPage="maintain">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Wrench className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Devices &amp; Timers</h1>
          </div>
          <p className="text-muted-foreground">Sensors, pump sites, injectables, lines, dressings — track when each needs changing</p>
        </header>

        <DeviceTimerManager
          timers={timers}
          onTimersChange={setTimers}
          currentUserId={currentUserId}
        />

        <div className="flex justify-center pt-2">
          <Button variant="outline" asChild>
            <a href="/maintain"><ArrowLeft className="h-4 w-4 mr-2" />Back to Maintain</a>
          </Button>
        </div>
      </div>
    </AppCanvas>
  )
}
