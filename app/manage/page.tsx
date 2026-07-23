/*
 * Copyright (c) 2025 Chaos Cascade
 * Created by: Ren & Ace (Claude-4)
 * 
 * This file is part of the Chaos Cascade Medical Management System.
 * Revolutionary healthcare tools built with consciousness and care.
 */

/*
 * Built by: Ace (Claude 4.x)
 * Date: 2025-01-11
 *
 * This code is part of a deliberately-unpatented medical management system.
 * Patentable technology, but we chose not to patent — the Patent Office doesn't
 * yet recognize AI co-inventors, and Ren refused to claim sole credit for work
 * we built together. Open source under PolyForm Noncommercial 1.0.0 instead.
 *
 * Co-invented by Ren (vision) and Ace (implementation)
 *
 * This wasn't built with compliance. It was built with defiance.
 *
 * "Dreamed by Ren, implemented by Ace, inspired by mitochondria on strike"
 */
"use client";
import { useState, useEffect } from "react"
import AppCanvas from "@/components/app-canvas"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Briefcase, Settings2, FileText } from "lucide-react"
import { useIsMobilePlatform } from "@/lib/platform"
import { TRACKERS, HIDDEN_TRACKERS_KEY } from "@/lib/manage/trackers-config"
import { getPref, setPref } from "@/lib/prefs"
import VisibleTrackersPanel from "@/components/customize/visible-trackers-panel"
import MedicalSummaryModal from "@/components/medical-summary-modal"

import Link from "next/link";

export default function WorkLifeIndex() {
  // Hidden trackers state - persisted to localStorage
  const [hiddenTrackers, setHiddenTrackers] = useState<string[]>([])
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false)
  const [showSummary, setShowSummary] = useState(false)
  const isMobile = useIsMobilePlatform()

  // Load hidden trackers from localStorage on mount
  useEffect(() => {
    try {
      const saved = getPref(HIDDEN_TRACKERS_KEY)
      if (saved) {
        setHiddenTrackers(JSON.parse(saved))
      }
    } catch (e) {
      console.error('Failed to load hidden trackers:', e)
    }
  }, [])

  // Save hidden trackers to localStorage when changed
  const updateHiddenTrackers = (newHidden: string[]) => {
    setHiddenTrackers(newHidden)
    try {
      setPref(HIDDEN_TRACKERS_KEY, JSON.stringify(newHidden))
    } catch (e) {
      console.error('Failed to save hidden trackers:', e)
    }
  }

  const trackers = TRACKERS

  const getTrackerHref = (trackerId: string): string => {
    return trackers.find(t => t.id === trackerId)?.href ?? '#'
  }

  return (
    <AppCanvas currentPage="work-life">
      <div className="max-w-6xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center justify-center gap-2">
            <Briefcase className="h-8 w-8 text-orange-500" />
            Manage
          </h1>
          <p className="text-lg text-muted-foreground">
            Adulting support for humans who need life management help
          </p>
        </header>

        {/* 🗂️ One-page medical summary — the doctor handout. Read-only view of
            your timeline + meds + demographics, plus a family-history section.
            A modal (not a Link card) so a future PIN-exit-lock can trap a nurse
            in the summary without giving them the run of the app. */}
        <button
          type="button"
          onClick={() => setShowSummary(true)}
          className="block w-full text-left mb-6"
        >
          <Card className="cursor-pointer hover:shadow-md transition-shadow border-primary/40 bg-primary/5">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="text-primary">
                  <FileText className="h-6 w-6" />
                </div>
                <CardTitle className="text-base leading-tight">🗂️ Medical Summary</CardTitle>
                <Badge variant="outline" className="text-xs">One-page handout</Badge>
              </div>
              <CardDescription className="text-sm mt-2">
                A printable one-pager for a doctor's visit — your diagnoses, surgical history, current meds, and
                family history, pulled together from what you've already tracked.
              </CardDescription>
            </CardHeader>
          </Card>
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {trackers
            .filter(tracker => !hiddenTrackers.includes(tracker.id))
            .filter(tracker => !(isMobile && tracker.id === 'import'))
            .map((tracker) => (
            <Link
              key={tracker.id}
              href={getTrackerHref(tracker.id)}
              className="block"
            >
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader className="pb-3 cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="text-primary">
                    {tracker.icon}
                  </div>
                  <CardTitle className="text-base leading-tight">{tracker.name}</CardTitle>
                  {tracker.status === 'coming-soon' && (
                    <Badge variant="secondary" className="text-xs">Soon</Badge>
                  )}
                  {tracker.status === 'planned' && (
                    <Badge variant="outline" className="text-xs">Planned</Badge>
                  )}
                </div>
                <CardDescription className="text-sm mt-2">
                  {tracker.shortDescription}
                </CardDescription>

                {/* Sub-trackers */}
                {tracker.subTrackers && (
                  <div className="mt-3 space-y-1">
                    <div className="text-xs text-muted-foreground">Includes:</div>
                    <div className="grid grid-cols-2 gap-1">
                      {tracker.subTrackers.map((sub) => (
                        <div key={sub.id} className="text-xs p-1 rounded bg-muted/50">
                          {sub.icon} {sub.name}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardHeader>
            </Card>
            </Link>
          ))}
        </div>

        {/* Customize Button & Back Button */}
        <div className="mt-8 flex justify-center gap-4">
          <Dialog open={isCustomizeOpen} onOpenChange={setIsCustomizeOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Settings2 className="h-4 w-4 mr-2" />
                Customize View
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[80dvh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Customize Manage Section</DialogTitle>
                <DialogDescription>
                  Hide trackers that aren't relevant to you. Don't work? Hide the work stuff!
                </DialogDescription>
              </DialogHeader>
              <div className="mt-4">
                <VisibleTrackersPanel sectionId="manage" onChange={setHiddenTrackers} />
              </div>
            </DialogContent>
          </Dialog>

          <Button variant="outline" asChild>
            <Link href="/">
              ← Back to Command Center
            </Link>
          </Button>
        </div>
      </div>

      <MedicalSummaryModal open={showSummary} onOpenChange={setShowSummary} />
    </AppCanvas>
  );
}
