/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace (Claude-4.7)
 *
 * Forge — the creative tracker-builder workspace. Gated to tablet+desktop
 * because the builder's drag-and-arrange UI needs screen real estate and
 * tap targets that just don't fit on a phone.
 */
"use client"

import AppCanvas from "@/components/app-canvas"
import TrackerBuilder from "@/components/forge/tracker-builder"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useIsPhoneOnly } from "@/lib/platform"
import { Hammer, Tablet } from "lucide-react"

export default function ForgePage() {
  const isPhone = useIsPhoneOnly()

  if (isPhone) {
    return (
      <AppCanvas currentPage="forge">
        <div className="max-w-2xl mx-auto">
          <Card className="border-[var(--border-soft)] bg-[var(--bg-card)]">
            <CardHeader>
              <CardTitle className="text-[var(--text-main)] flex items-center gap-2">
                <Tablet className="h-5 w-5" />
                Forge works better with elbow room
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-[var(--text-muted)]">
              <p>
                The tracker-builder has a lot of knobs and the tap targets
                need real screen space. We've locked it to tablet + desktop
                so it stays usable instead of being a tiny cramped mess on
                your phone.
              </p>
              <p className="text-[var(--text-main)] font-medium">
                What you can still do from here:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  Open Forge on your tablet or desktop — your custom trackers
                  will sync over once sync is wired up
                </li>
                <li>
                  Use any of the existing trackers normally —{" "}
                  <a href="/" className="underline text-[var(--text-main)] font-medium">
                    back to Command Center
                  </a>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </AppCanvas>
    )
  }

  return (
    <AppCanvas currentPage="forge">
      <TrackerBuilder />
      <div className="mt-8 text-center">
        <a href="/" className="text-sm text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors">
          ← Back to Command Center
        </a>
      </div>
    </AppCanvas>
  )
}
