/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace (Claude-4.7)
 *
 * Settings -> Customize section for unhiding custom trackers that the
 * user hid from /custom. Returns null entirely when the hidden list is
 * empty so the customize page doesn't show "0 hidden trackers."
 */
"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Eye, EyeOff, Wrench, Heart, Brain, Target } from "lucide-react"
import { useUser } from "@/lib/contexts/user-context"
import { useDailyData } from "@/lib/database/hooks/use-daily-data"
import {
  getHiddenCustomTrackers,
  unhideCustomTracker,
} from "@/lib/custom-trackers-hidden"

interface CustomTrackerLite {
  id: string
  name: string
  description?: string
  category?: 'body' | 'mind' | 'custom'
}

function categoryIcon(category?: string) {
  switch (category) {
    case 'body': return <Heart className="h-4 w-4 text-red-500" />
    case 'mind': return <Brain className="h-4 w-4 text-blue-500" />
    case 'custom': return <Target className="h-4 w-4 text-orange-500" />
    default: return <Wrench className="h-4 w-4 text-muted-foreground" />
  }
}

export default function HiddenCustomTrackersPanel() {
  const { userPin } = useUser()
  const { getAllCategoryData } = useDailyData()
  const [allTrackers, setAllTrackers] = useState<CustomTrackerLite[]>([])
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)

  const refreshHidden = () => {
    if (userPin) setHiddenIds(getHiddenCustomTrackers(userPin))
    else setHiddenIds(new Set())
  }

  useEffect(() => {
    refreshHidden()
  }, [userPin])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        setIsLoading(true)
        const allRecords = await getAllCategoryData('user')
        const customRecords = (allRecords || []).filter(
          (r: any) => r.subcategory === 'custom-trackers'
        )
        const newest = customRecords.length > 0
          ? customRecords.sort((a: any, b: any) =>
              String(b.date).localeCompare(String(a.date)))[0]
          : null

        let trackers: CustomTrackerLite[] = []
        if (newest?.content?.trackers && Array.isArray(newest.content.trackers)) {
          trackers = (newest.content.trackers as any[]).map(t => ({
            id: t.id,
            name: t.name,
            description: t.description,
            category: t.category,
          }))
        } else if (newest?.content?.tracker) {
          const t = newest.content.tracker
          trackers = [{
            id: t.id,
            name: t.name,
            description: t.description,
            category: t.category,
          }]
        }
        if (!cancelled) setAllTrackers(trackers)
      } catch (err) {
        console.error('❌ Failed to load custom trackers for hidden panel:', err)
        if (!cancelled) setAllTrackers([])
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const hiddenTrackers = allTrackers.filter(t => hiddenIds.has(t.id))

  // Hide the entire section (Card included) when there's nothing to unhide.
  // Suppresses during initial load too — flashing an empty card while we
  // resolve the daily_data record is worse than waiting one beat.
  if (isLoading || hiddenTrackers.length === 0) {
    return null
  }

  const handleUnhide = (id: string) => {
    if (!userPin) return
    unhideCustomTracker(id, userPin)
    refreshHidden()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <EyeOff className="h-5 w-5" />
          Hidden Custom Trackers
        </CardTitle>
        <CardDescription>
          Custom trackers you've hidden from /custom. Data is preserved —
          unhide to bring them back.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="divide-y divide-border rounded-md border">
          {hiddenTrackers.map(tracker => (
            <li
              key={tracker.id}
              className="flex items-center justify-between gap-3 px-3 py-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                {categoryIcon(tracker.category)}
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">
                    {tracker.name}
                  </div>
                  {tracker.description && (
                    <div className="text-xs text-muted-foreground truncate">
                      {tracker.description}
                    </div>
                  )}
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleUnhide(tracker.id)}
              >
                <Eye className="h-4 w-4 mr-1" />
                Unhide
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
