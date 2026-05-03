/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace (Claude-4.7)
 *
 * Tracker visibility toggles. Two modes:
 *   - Single section (sectionId="manage"|"body"|"mind"|"choice"):
 *       Renders just that section's switches. Used by /manage's customize
 *       dialog so it keeps showing only Manage trackers there.
 *   - All sections (no sectionId, the default):
 *       Renders Tabs across all four sections. Used by the unified
 *       /customize hub. Each tab reads/writes its own localStorage key,
 *       so toggling a Body tracker here is identical to toggling it on
 *       /body's Customize button.
 */
"use client"

import { useEffect, useState } from "react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TRACKERS } from "@/lib/manage/trackers-config"
import {
  VISIBILITY_SECTIONS,
  type SectionId,
  type VisibilitySection,
} from "@/lib/visibility-sections"

interface Props {
  /** When set, render only that section's toggles (no tabs). Used by the
   *  per-page customize dialog on /manage. Omit for the unified hub. */
  sectionId?: SectionId
  /** Optional callback fired with the new hidden-trackers array whenever the
   *  user flips a switch in the *currently active* section. Containers like
   *  /manage use this to re-render without re-reading localStorage. */
  onChange?: (hidden: string[]) => void
}

// Resolve a section's tracker list. Manage pulls from the canonical config
// to avoid duplication; other sections use the static lists in
// lib/visibility-sections.
function resolveTrackers(section: VisibilitySection) {
  if (section.id === 'manage') {
    return TRACKERS.map(t => ({ id: t.id, name: t.name }))
  }
  return section.trackers
}

interface SectionToggleListProps {
  section: VisibilitySection
  onChange?: (hidden: string[]) => void
}

function SectionToggleList({ section, onChange }: SectionToggleListProps) {
  const [hidden, setHidden] = useState<string[]>([])
  const trackers = resolveTrackers(section)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(section.storageKey)
      if (saved) setHidden(JSON.parse(saved))
      else setHidden([])
    } catch (e) {
      console.error(`Failed to load ${section.storageKey}:`, e)
    }
  }, [section.storageKey])

  const persist = (next: string[]) => {
    setHidden(next)
    try {
      localStorage.setItem(section.storageKey, JSON.stringify(next))
    } catch (e) {
      console.error(`Failed to save ${section.storageKey}:`, e)
    }
    onChange?.(next)
  }

  const toggle = (id: string) => {
    if (hidden.includes(id)) {
      persist(hidden.filter(x => x !== id))
    } else {
      persist([...hidden, id])
    }
  }

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
              <Label htmlFor={`vt-${section.id}-${tracker.id}`} className="cursor-pointer truncate">
                {tracker.name}
              </Label>
              <Switch
                id={`vt-${section.id}-${tracker.id}`}
                checked={!hidden.includes(tracker.id)}
                onCheckedChange={() => toggle(tracker.id)}
              />
            </div>
          ))}
        </div>
      )}
      {hidden.length > 0 && (
        <div className="pt-3 border-t">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => persist([])}
          >
            Show All {section.label} Trackers
          </Button>
        </div>
      )}
    </div>
  )
}

function MultiSectionPanel({ onChange }: { onChange?: Props['onChange'] }) {
  const [activeSection, setActiveSection] = useState<SectionId>('body')

  return (
    <Tabs
      value={activeSection}
      onValueChange={(v) => setActiveSection(v as SectionId)}
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
            onChange={section.id === activeSection ? onChange : undefined}
          />
        </TabsContent>
      ))}
    </Tabs>
  )
}

export default function VisibleTrackersPanel({ sectionId, onChange }: Props = {}) {
  if (sectionId) {
    const section = VISIBILITY_SECTIONS.find(s => s.id === sectionId)
    if (!section) {
      return (
        <p className="text-sm text-destructive">
          Unknown section: {sectionId}
        </p>
      )
    }
    return <SectionToggleList section={section} onChange={onChange} />
  }
  return <MultiSectionPanel onChange={onChange} />
}
