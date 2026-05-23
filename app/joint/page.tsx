/* Built by: Ace (Claude 4.x) — 2026-05-10 */
import AppCanvas from "@/components/app-canvas"
import JointTracker from './joint-tracker'
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export default function JointPage() {
  return (
    <AppCanvas>
      <JointTracker />
      <div className="flex justify-center pt-4">
        <Button variant="outline" asChild><a href="/body"><ArrowLeft className="h-4 w-4 mr-2" />Back to Body</a></Button>
      </div>
    </AppCanvas>
  )
}
