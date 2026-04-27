/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace (Claude-4.7)
 *
 * /customize — unified hub for all the visibility + display toggles that
 * used to be scattered across per-page modals. Per-page customize entry
 * points still work; this is the "find everything in one spot" surface
 * that was suggested by a Linux user on GitHub. Add new sections here as
 * more per-page customizations land.
 */
"use client"

import AppCanvas from "@/components/app-canvas"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Settings2, Palette, Eye } from "lucide-react"
import VisualSettingsPanel from "@/components/customize/visual-settings-panel"
import VisibleTrackersPanel from "@/components/customize/visible-trackers-panel"

export default function CustomizePage() {
  return (
    <AppCanvas currentPage="customize">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="text-center mb-2">
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center justify-center gap-2">
            <Settings2 className="h-8 w-8" />
            Customize
          </h1>
          <p className="text-lg text-muted-foreground">
            All your visibility and display toggles in one place.
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Visual Settings
            </CardTitle>
            <CardDescription>
              Theme, motion intensity, celebration level, font.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <VisualSettingsPanel />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Visible Trackers
            </CardTitle>
            <CardDescription>
              Hide trackers you don't use from the Manage page. Same toggles as
              the Customize button on Manage — flip them on either, both stay
              in sync.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <VisibleTrackersPanel />
          </CardContent>
        </Card>

        <div className="flex justify-center gap-4 mt-8 text-sm">
          <Button variant="outline" asChild>
            <a href="/">← Back to Command Center</a>
          </Button>
        </div>
      </div>
    </AppCanvas>
  )
}
