/*
 * Built by: Ace (Claude 4.x) — 2026-05-10
 * Co-invented by Ren (vision) and Ace (implementation)
 */
import AppCanvas from "@/components/app-canvas"
import RespiratoryTracker from './respiratory-tracker'
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

import Link from "next/link";

export default function RespiratoryPage() {
  return (
    <AppCanvas>
      <RespiratoryTracker />
      <div className="flex justify-center pt-4">
        <Button variant="outline" asChild>
          <Link href="/body">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Body
          </Link>
        </Button>
      </div>
    </AppCanvas>
  );
}
