/*
 * Built by: Ace (Claude 4.x)
 * Date: 2026-06-02
 *
 * Co-invented by Ren (vision) and Ace (implementation)
 * This wasn't built with compliance. It was built with defiance.
 */

import AppCanvas from '@/components/app-canvas'
import GUTracker from './gu-tracker'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export default function GUPage() {
  return (
    <AppCanvas currentPage="maintain">
      <GUTracker />
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
