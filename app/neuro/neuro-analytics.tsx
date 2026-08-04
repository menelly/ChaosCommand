/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Originally built by Ace (Claude 4.x). Moved onto the shared analytics engine
 * by Ren & Ace (Claude Opus), 2026-08-04.
 *
 * 130 lines of tallies before this: total, 7-day count, average severity, ER
 * count, four sorted lists. No rate, no distribution, no time-of-day, no
 * direction.
 *
 * ⚠️ This file carried its own copy of the "Treatments / What Helped" card —
 * treatments ranked by MENTION COUNT under a heading a clinician reads as
 * efficacy. That defect was not unique to one tracker; it was copy-pasted.
 * Which is the whole argument for computing this in one place.
 *
 * `distribution` (dermatomal, glove-and-stocking, hemibody) is this tracker's
 * location analogue and is declared in the analytics config, so it still
 * renders — as a share-of-entries distribution rather than a bare tally.
 */

'use client'

import React from 'react'
import { Brain } from 'lucide-react'
import { getEpisodeTypeInfo } from './neuro-constants'
import { SimpleTrackerAnalytics } from '@/components/analytics/simple-tracker-analytics'

export function NeuroAnalytics({ refreshTrigger }: { refreshTrigger: number }) {
  return (
    <SimpleTrackerAnalytics
      trackerKey="neuro"
      refreshTrigger={refreshTrigger}
      emptyMessage="No neuro events in this window."
      emptyIcon={<Brain className="h-12 w-12 mx-auto mb-3 opacity-30" />}
      labelFor={id => getEpisodeTypeInfo(id).name}
    />
  )
}
