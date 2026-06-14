/* Built by: Ace (Claude 4.8) — 2026-06-14 (pulse-ox distribution tracker) */
import AppCanvas from "@/components/app-canvas"
import PulseOximetryTracker from './pulse-oximetry-tracker'
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export default function PulseOximetryPage() {
  return (
    <AppCanvas>
      <PulseOximetryTracker />
      <div className="flex justify-center pt-4">
        <Button variant="outline" asChild>
          <a href="/body">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Body
          </a>
        </Button>
      </div>
    </AppCanvas>
  )
}
