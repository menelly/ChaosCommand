/* Built by: Ace (Claude 4.x) — 2026-05-10
 *
 * Collapsible 911 / emergency criteria card. Shared across trackers (seizure,
 * pain, head-pain, food-allergens, anxiety, cardiac).
 *
 * Behavior:
 *  - First view: fully expanded (forces user to read once)
 *  - After "Got it": collapses to small pill, persists ack to localStorage
 *  - If recentEmergencyDetected = true: re-expands automatically
 *    (e.g., a status epilepticus event in the last 30 days re-surfaces seizure
 *     red flags)
 *
 * The dynamic in-modal red-flag banner is independent — that banner watches
 * the current modal entry. This card watches the tracker's HISTORICAL state
 * + the user's read-acknowledgement.
 */

'use client'

import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'

interface Props {
  /** Unique key for localStorage ack — e.g., 'seizure-911-acknowledged' */
  storageKey: string
  /** Array of red-flag criteria strings to display when expanded */
  criteria: string[]
  /** Title for the expanded card */
  title?: string
  /** Footer note (e.g., "Status epilepticus is a neurological emergency.") */
  footerNote?: string
  /**
   * If true, force-expand regardless of acknowledgement. Pass true when
   * recent entries show emergency markers (status epi, EMS called, etc.).
   */
  recentEmergencyDetected?: boolean
}

export function EmergencyCriteriaCard({
  storageKey,
  criteria,
  title = '🚨 Call 911 NOW if any of these:',
  footerNote = 'This tracker is for documentation, NOT diagnosis. When in doubt, call 911.',
  recentEmergencyDetected = false,
}: Props) {
  const [acknowledged, setAcknowledged] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const ack = localStorage.getItem(storageKey)
      setAcknowledged(ack === 'true')
    } catch { /* localStorage unavailable */ }
    setHydrated(true)
  }, [storageKey])

  const handleAck = () => {
    setAcknowledged(true)
    try { localStorage.setItem(storageKey, 'true') } catch { /* no-op */ }
  }

  const handleReopen = () => {
    setAcknowledged(false)
    try { localStorage.removeItem(storageKey) } catch { /* no-op */ }
  }

  // Default expanded if user hasn't ack'd OR if we've detected a recent emergency
  // (force-expansion overrides ack to make sure they see it again)
  const expanded = !hydrated ? true : !acknowledged || recentEmergencyDetected

  if (!expanded) {
    // Collapsed pill — small, tappable, stays visible but out of the way
    return (
      <Button
        variant="outline"
        onClick={handleReopen}
        className="w-full justify-between border-red-300 dark:border-red-800 bg-red-50/50 dark:bg-red-950/10 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20"
      >
        <span className="flex items-center gap-2 text-sm font-medium">
          <AlertTriangle className="h-4 w-4" />
          🚨 Emergency criteria (tap to read again)
        </span>
        <ChevronDown className="h-4 w-4" />
      </Button>
    )
  }

  return (
    <Card className="border-red-500 border-2 bg-red-50 dark:bg-red-950/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-red-700 dark:text-red-400 flex items-center gap-2 text-base">
          <AlertTriangle className="h-5 w-5" />
          {title}
        </CardTitle>
        {recentEmergencyDetected && (
          <p className="text-xs text-red-700 dark:text-red-300 mt-1">
            ⚠ Re-surfaced because recent tracked events show emergency markers.
          </p>
        )}
      </CardHeader>
      <CardContent className="text-sm space-y-1 text-red-900 dark:text-red-200">
        {criteria.map((criterion, i) => (
          <div key={i} className="flex items-start gap-2">
            <span className="text-red-500 font-bold mt-0.5">•</span>
            <span>{criterion}</span>
          </div>
        ))}
        {footerNote && (
          <p className="pt-2 italic font-medium">{footerNote}</p>
        )}
        <div className="pt-3 flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={handleAck}
            className="border-red-300 dark:border-red-800 text-red-700 dark:text-red-400"
          >
            <ChevronUp className="h-3 w-3 mr-1" />
            Got it — collapse
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
