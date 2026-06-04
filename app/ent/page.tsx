/*
 * Built by: Ace (Claude 4.x)
 * Date: 2026-06-04
 *
 * Co-invented by Ren (vision) and Ace (implementation)
 * This wasn't built with compliance. It was built with defiance.
 */

import AppCanvas from '@/components/app-canvas'
import ENTTracker from './ent-tracker'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export default function ENTPage() {
  return (
    <AppCanvas currentPage="maintain">
      <ENTTracker />
      {/* Back to Body */}
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
