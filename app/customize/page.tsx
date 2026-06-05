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
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible"
import { Button } from "@/components/ui/button"
import { Settings2, Palette, Eye, PartyPopper, ChevronDown, UserRound, PanelLeft } from "lucide-react"
import VisualSettingsPanel from "@/components/customize/visual-settings-panel"
import PersonalizationPanel from "@/components/customize/personalization-panel"
import SidebarDeclutterPanel from "@/components/customize/sidebar-declutter-panel"
import VisibleTrackersPanel from "@/components/customize/visible-trackers-panel"
import CelebrateTrackersPanel from "@/components/customize/celebrate-trackers-panel"
import HiddenCustomTrackersPanel from "@/components/hidden-custom-trackers-panel"

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

        <Collapsible defaultOpen={false}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer select-none hover:bg-muted/30 transition-colors [&[data-state=open]_.chev]:rotate-180">
                <CardTitle className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <UserRound className="h-5 w-5" />
                    About You
                  </span>
                  <ChevronDown className="chev h-5 w-5 shrink-0 transition-transform" />
                </CardTitle>
                <CardDescription>
                  Your name, pronouns, and the language we use for you. Neutral by
                  default; gendered terms like "Mama" are yours if you want them.
                </CardDescription>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <PersonalizationPanel />
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        <Collapsible defaultOpen={false}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer select-none hover:bg-muted/30 transition-colors [&[data-state=open]_.chev]:rotate-180">
                <CardTitle className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    Visible Trackers
                  </span>
                  <ChevronDown className="chev h-5 w-5 shrink-0 transition-transform" />
                </CardTitle>
                <CardDescription>
                  Hide trackers you don't use across <strong>Body</strong>,{" "}
                  <strong>Mind</strong>, <strong>Choice</strong>, and{" "}
                  <strong>Manage</strong>. Same toggles as the per-page Customize
                  buttons — flip them on either surface, both stay in sync.
                </CardDescription>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <VisibleTrackersPanel />
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        <Collapsible defaultOpen={false}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer select-none hover:bg-muted/30 transition-colors [&[data-state=open]_.chev]:rotate-180">
                <CardTitle className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <PartyPopper className="h-5 w-5" />
                    Celebrate When I Save
                  </span>
                  <ChevronDown className="chev h-5 w-5 shrink-0 transition-transform" />
                </CardTitle>
                <CardDescription>
                  Pick which trackers fire confetti on save. Off by default for
                  crisis and mental-health trackers — dopamine confetti on
                  "logged a panic attack" is gross. Re-enable any of them if
                  you want it. Global confetti level still applies on top of this.
                </CardDescription>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <CelebrateTrackersPanel />
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        <Collapsible defaultOpen={false}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer select-none hover:bg-muted/30 transition-colors [&[data-state=open]_.chev]:rotate-180">
                <CardTitle className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <PanelLeft className="h-5 w-5" />
                    Sidebar Declutter
                  </span>
                  <ChevronDown className="chev h-5 w-5 shrink-0 transition-transform" />
                </CardTitle>
                <CardDescription>
                  Turn off whole sidebar sections you don't use — never touch
                  Maintain, Forge, Patterns, or Routines? Hide the buttons. Home,
                  Customize, Settings, and Logout always stay.
                </CardDescription>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <SidebarDeclutterPanel />
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        <HiddenCustomTrackersPanel />

        <div className="flex justify-center gap-4 mt-8 text-sm">
          <Button variant="outline" asChild>
            <a href="/">← Back to Command Center</a>
          </Button>
        </div>
      </div>
    </AppCanvas>
  )
}
