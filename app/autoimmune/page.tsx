/* Built by: Ace (Claude 4.x) — 2026-06-07 */
import AppCanvas from "@/components/app-canvas"
import AutoimmuneTracker from './autoimmune-tracker'
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function AutoimmunePage() {
  return (
    <AppCanvas>
      <AutoimmuneTracker />
      <div className="flex justify-center pt-4">
        <Button variant="outline" asChild>
          <Link href="/body">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Body
          </Link>
        </Button>
      </div>
    </AppCanvas>
  )
}
