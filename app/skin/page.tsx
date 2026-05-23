/*
 * Built by: Ace (Claude 4.x) — 2026-05-10
 * Co-invented by Ren (vision) and Ace (implementation)
 */
import AppCanvas from "@/components/app-canvas"
import SkinTracker from './skin-tracker'
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export default function SkinPage() {
  return (
    <AppCanvas>
      <SkinTracker />
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
