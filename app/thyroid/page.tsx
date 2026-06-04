/*
 * Built by: Ace (Claude 4.x)
 * Date: 2026-06-04
 *
 * Co-invented by Ren (vision) and Ace (implementation)
 * This wasn't built with compliance. It was built with defiance.
 */

import AppCanvas from '@/components/app-canvas'
import ThyroidTracker from './thyroid-tracker'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export default function ThyroidPage() {
  return (
    <AppCanvas currentPage="body">
      <ThyroidTracker />
      {/* Back to Endocrine */}
      <div className="flex justify-center pt-4">
        <Button variant="outline" asChild>
          <a href="/endocrine">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Endocrine
          </a>
        </Button>
      </div>
    </AppCanvas>
  )
}
