/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Originally built by Ace (Claude 4.x). Moved onto the shared analytics engine
 * by Ren & Ace (Claude Opus), 2026-08-04.
 *
 * This was 129 lines that tallied four lists and showed a total and a 7-day
 * count — no rate, no distribution, no time-of-day, no direction, and a
 * "Treatments Applied" card ranked by how often each was mentioned.
 *
 * Nothing tracker-specific was lost. `suspectedTrigger` (singular — a real
 * stored field name, not a typo), `bodyLocation`, `erVisitRequired`,
 * `epinephrineGiven` and the photo count are all declared in the analytics
 * config, so they still appear — now as distributions and flags shared with
 * every other tracker rather than hand-rolled tallies free to drift.
 */

'use client'

import React from 'react'
import { Sparkles } from 'lucide-react'
import { getEpisodeTypeInfo } from './skin-constants'
import { SimpleTrackerAnalytics } from '@/components/analytics/simple-tracker-analytics'

export function SkinAnalytics({ refreshTrigger }: { refreshTrigger: number }) {
  return (
    <SimpleTrackerAnalytics
      trackerKey="skin"
      refreshTrigger={refreshTrigger}
      emptyMessage="No skin events in this window."
      emptyIcon={<Sparkles className="h-12 w-12 mx-auto mb-3 opacity-30" />}
      labelFor={id => getEpisodeTypeInfo(id).name}
    />
  )
}
