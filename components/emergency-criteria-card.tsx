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
import { getPref, setPref, removePref } from '@/lib/prefs'

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
   * @deprecated No longer used. The card is read-once-then-collapsed; live emergency
   * warning lives in the in-modal red-flag banner, not here. Kept so existing callers
   * still compile; caller plumbing removal is tracked separately.
   */
  recentEmergencyDetected?: boolean
}

export function EmergencyCriteriaCard({
  storageKey,
  criteria,
  title = '🚨 Call 911 NOW if any of these:',
  footerNote = 'This tracker is for documentation, NOT diagnosis. When in doubt, call 911.',
}: Props) {
  const [acknowledged, setAcknowledged] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const ack = getPref(storageKey)
      setAcknowledged(ack === 'true')
    } catch { /* localStorage unavailable */ }
    setHydrated(true)
  }, [storageKey])

  const handleAck = () => {
    setAcknowledged(true)
    try { setPref(storageKey, 'true') } catch { /* no-op */ }
  }

  const handleReopen = () => {
    setAcknowledged(false)
    try { removePref(storageKey) } catch { /* no-op */ }
  }

  // Read-once, then collapsed for good (until the user taps the pill to reopen it). We deliberately
  // do NOT re-surface from history: the in-MODAL live red-flag banner warns the moment an emergency
  // value is actually entered — THAT is the safety net. Re-nagging about a past event isn't safety,
  // it's not trusting the user. Warn when it's real, then respect that they navigated it.
  // (recentEmergencyDetected prop is kept but ignored — caller plumbing removal tracked separately.)
  const expanded = !hydrated ? true : !acknowledged

  // THEME-RELATIVE DANGER (2026-05-24): never hardcode red. Use --destructive as a
  // TINT (red border + red heading/bullets) with theme-foreground body text — reads
  // as unmistakably serious without a solid-red billboard beating you over the head,
  // and the criteria stay maximally legible (theme text, not white-on-loud-red).
  // Readable + correct on all 15 themes. See project_command_056_danger_colors.
  if (!expanded) {
    // Collapsed pill — subtle on the page bg, tappable to reopen.
    return (
      <Button
        variant="outline"
        onClick={handleReopen}
        className="w-full justify-between border-2 border-destructive text-destructive bg-transparent hover:bg-destructive/10"
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
    <Card className="border-destructive border-2 bg-destructive/10">
      <CardHeader className="pb-3">
        <CardTitle className="text-destructive flex items-center gap-2 text-base">
          <AlertTriangle className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm space-y-1 text-foreground">
        {criteria.map((criterion, i) => (
          <div key={i} className="flex items-start gap-2">
            <span className="text-destructive font-bold mt-0.5">•</span>
            <span>{criterion}</span>
          </div>
        ))}
        {footerNote && (
          <p className="pt-2 italic font-medium text-muted-foreground">{footerNote}</p>
        )}
        <div className="pt-3 flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={handleAck}
            className="border-destructive text-destructive bg-transparent hover:bg-destructive/10"
          >
            <ChevronUp className="h-3 w-3 mr-1" />
            Got it — collapse
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
