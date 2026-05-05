/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace (Claude-4.7)
 *
 * "Celebrate When I Save" panel. Mirrors the structure of the Visible
 * Trackers panel — same Body/Mind/Choice/Manage tabs, same per-tracker
 * switch — but writes to a different localStorage key (the per-PIN
 * celebration opt-out set in lib/celebration-prefs).
 *
 * Storage shape uses an opt-OUT set rather than per-section keys: a single
 * chaos-celebration-disabled-${pin} list covers every tracker on every tab,
 * so a master "Disable all visible trackers" button can flip them all in
 * one write. Per-section quick-disable buttons stay scoped to that tab's
 * tracker list.
 */
"use client"

import { useEffect, useState, useCallback } from "react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TRACKERS } from "@/lib/manage/trackers-config"
import {
  VISIBILITY_SECTIONS,
  type VisibilitySection,
} from "@/lib/visibility-sections"
import { useUser } from "@/lib/contexts/user-context"
import {
  getCelebrationDisabled,
  setCelebrationDisabled,
  setCelebrationForTracker,
} from "@/lib/celebration-prefs"

function resolveTrackers(section: VisibilitySection) {
  if (section.id === 'manage') {
    return TRACKERS.map(t => ({ id: t.id, name: t.name }))
  }
  return section.trackers
}

function allTrackerIds(): string[] {
  const ids: string[] = []
  for (const section of VISIBILITY_SECTIONS) {
    for (const t of resolveTrackers(section)) ids.push(t.id)
  }
  return ids
}

interface SectionToggleListProps {
  section: VisibilitySection
  disabled: Set<string>
  onToggle: (trackerId: string, enabled: boolean) => void
  onBulkSet: (ids: string[], enabled: boolean) => void
}

function SectionToggleList({ section, disabled, onToggle, onBulkSet }: SectionToggleListProps) {
  const trackers = resolveTrackers(section)
  const sectionIds = trackers.map(t => t.id)
  const anyEnabledHere = sectionIds.some(id => !disabled.has(id))
  const anyDisabledHere = sectionIds.some(id => disabled.has(id))

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{section.description}</p>
      {trackers.length === 0 ? (
        <p className="text-sm italic text-muted-foreground">
          No trackers registered for this section yet.
        </p>
      ) : (
        <div className="space-y-3">
          {trackers.map(tracker => (
            <div key={tracker.id} className="flex items-center justify-between gap-3">
              <Label htmlFor={`celebrate-${section.id}-${tracker.id}`} className="cursor-pointer truncate">
                {tracker.name}
              </Label>
              <Switch
                id={`celebrate-${section.id}-${tracker.id}`}
                checked={!disabled.has(tracker.id)}
                onCheckedChange={(checked) => onToggle(tracker.id, checked)}
              />
            </div>
          ))}
        </div>
      )}
      {trackers.length > 0 && (
        <div className="pt-3 border-t flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            disabled={!anyEnabledHere}
            onClick={() => onBulkSet(sectionIds, false)}
          >
            Disable {section.label}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            disabled={!anyDisabledHere}
            onClick={() => onBulkSet(sectionIds, true)}
          >
            Enable {section.label}
          </Button>
        </div>
      )}
    </div>
  )
}

export default function CelebrateTrackersPanel() {
  const { userPin } = useUser()
  const [disabled, setDisabledState] = useState<Set<string>>(new Set())
  const [activeSection, setActiveSection] = useState<VisibilitySection['id']>('body')
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    if (!userPin) {
      setDisabledState(new Set())
      setHydrated(true)
      return
    }
    setDisabledState(getCelebrationDisabled(userPin))
    setHydrated(true)
  }, [userPin])

  const persist = useCallback((next: Set<string>) => {
    setDisabledState(new Set(next))
    if (userPin) setCelebrationDisabled(userPin, next)
  }, [userPin])

  const handleToggle = useCallback((trackerId: string, enabled: boolean) => {
    if (!userPin) return
    setCelebrationForTracker(trackerId, userPin, enabled)
    setDisabledState(getCelebrationDisabled(userPin))
  }, [userPin])

  const handleBulkSet = useCallback((ids: string[], enabled: boolean) => {
    const next = new Set(disabled)
    if (enabled) {
      for (const id of ids) next.delete(id)
    } else {
      for (const id of ids) next.add(id)
    }
    persist(next)
  }, [disabled, persist])

  const handleDisableAll = useCallback(() => {
    handleBulkSet(allTrackerIds(), false)
  }, [handleBulkSet])

  const handleEnableAll = useCallback(() => {
    handleBulkSet(allTrackerIds(), true)
  }, [handleBulkSet])

  if (!hydrated) {
    return <p className="text-sm text-muted-foreground">Loading…</p>
  }

  if (!userPin) {
    return (
      <p className="text-sm italic text-muted-foreground">
        Sign in to manage per-tracker celebration preferences.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <Button variant="outline" size="sm" className="flex-1" onClick={handleDisableAll}>
          Disable all
        </Button>
        <Button variant="outline" size="sm" className="flex-1" onClick={handleEnableAll}>
          Enable all
        </Button>
      </div>
      <Tabs
        value={activeSection}
        onValueChange={(v) => setActiveSection(v as VisibilitySection['id'])}
        className="w-full"
      >
        <TabsList className="grid grid-cols-4 w-full">
          {VISIBILITY_SECTIONS.map(section => (
            <TabsTrigger key={section.id} value={section.id} className="text-xs sm:text-sm">
              <span className="mr-1">{section.emoji}</span>
              {section.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {VISIBILITY_SECTIONS.map(section => (
          <TabsContent key={section.id} value={section.id} className="mt-4">
            <SectionToggleList
              section={section}
              disabled={disabled}
              onToggle={handleToggle}
              onBulkSet={handleBulkSet}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
