/* Built by: Ace (Claude 4.x) — 2026-05-10 */
import AppCanvas from "@/components/app-canvas"
import SubstanceTracker from './substance-tracker'
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export default function SubstancePage() {
  return (
    <AppCanvas>
      <SubstanceTracker />
      <div className="flex justify-center pt-4">
        <Button variant="outline" asChild><a href="/choice"><ArrowLeft className="h-4 w-4 mr-2" />Back to Choice</a></Button>
      </div>
    </AppCanvas>
  )
}
