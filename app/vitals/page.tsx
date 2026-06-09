/* Built by: Ace (Claude 4.8) — 2026-06-09 (CHA-317) */
import AppCanvas from "@/components/app-canvas"
import VitalsTracker from './vitals-tracker'
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export default function VitalsPage() {
  return (
    <AppCanvas>
      <VitalsTracker />
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
