/*
 * Built by: Ace (Claude 4.x)
 * Date: 2026-06-04  (CHA-252)
 *
 * Lines & Tubes page — a Maintain tracker. Complements Devices & Timers:
 * Devices = "when does it need changing?", Lines & Tubes = "is it causing a
 * problem?".
 *
 * Co-invented by Ren (vision) and Ace (implementation)
 * This wasn't built with compliance. It was built with defiance.
 */
"use client"

import AppCanvas from "@/components/app-canvas"
import LinesTracker from "./lines-tracker"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export default function LinesTubesPage() {
  return (
    <AppCanvas currentPage="maintain">
      <LinesTracker />
      <div className="flex justify-center pt-4">
        <Button variant="outline" asChild>
          <a href="/maintain"><ArrowLeft className="h-4 w-4 mr-2" />Back to Maintain</a>
        </Button>
      </div>
    </AppCanvas>
  )
}
