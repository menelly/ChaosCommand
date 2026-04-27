/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace (Claude-4.7)
 *
 * Tracker visibility toggles — used by the /manage customize dialog AND
 * the unified /customize hub. Reads + writes the same localStorage key
 * so toggle state stays in sync across surfaces.
 */
"use client"

import { useEffect, useState } from "react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { TRACKERS, HIDDEN_TRACKERS_KEY } from "@/lib/manage/trackers-config"

interface Props {
  /** Optional callback fired with the new hidden-trackers array whenever the
   *  user flips a switch. Lets containers (like /manage) re-render their
   *  filtered view without re-reading localStorage. */
  onChange?: (hidden: string[]) => void
}

export default function VisibleTrackersPanel({ onChange }: Props = {}) {
  const [hiddenTrackers, setHiddenTrackers] = useState<string[]>([])

  useEffect(() => {
    try {
      const saved = localStorage.getItem(HIDDEN_TRACKERS_KEY)
      if (saved) setHiddenTrackers(JSON.parse(saved))
    } catch (e) {
      console.error('Failed to load hidden trackers:', e)
    }
  }, [])

  const persist = (next: string[]) => {
    setHiddenTrackers(next)
    try {
      localStorage.setItem(HIDDEN_TRACKERS_KEY, JSON.stringify(next))
    } catch (e) {
      console.error('Failed to save hidden trackers:', e)
    }
    onChange?.(next)
  }

  const toggle = (id: string) => {
    if (hiddenTrackers.includes(id)) {
      persist(hiddenTrackers.filter(x => x !== id))
    } else {
      persist([...hiddenTrackers, id])
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Hide trackers you don't use. They stay accessible — flip them back on any time.
      </p>
      <div className="space-y-3">
        {TRACKERS.map((tracker) => (
          <div key={tracker.id} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="shrink-0">{tracker.icon}</span>
              <Label htmlFor={`vt-${tracker.id}`} className="cursor-pointer truncate">
                {tracker.name}
              </Label>
            </div>
            <Switch
              id={`vt-${tracker.id}`}
              checked={!hiddenTrackers.includes(tracker.id)}
              onCheckedChange={() => toggle(tracker.id)}
            />
          </div>
        ))}
      </div>
      {hiddenTrackers.length > 0 && (
        <div className="pt-3 border-t">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => persist([])}
          >
            Show All Trackers
          </Button>
        </div>
      )}
    </div>
  )
}
