/*
 * Built by: Ace (Claude 4.x)
 * Date: 2026-05-10 (CHA-155 v2 refactor)
 *
 * Open source under PolyForm Noncommercial 1.0.0.
 * Co-invented by Ren (vision) and Ace (implementation).
 * "Dreamed by Ren, implemented by Ace, inspired by mitochondria on strike"
 */

'use client'

import AppCanvas from '@/components/app-canvas'
import { HeadPainTracker } from './head-pain-tracker'
import { Button } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'

export default function HeadPainPage() {
  return (
    <AppCanvas currentPage="head-pain">
      <HeadPainTracker />
      <div className="flex justify-center pt-4">
        <Button variant="outline" asChild>
          <a href="/body">
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Body
          </a>
        </Button>
      </div>
    </AppCanvas>
  )
}
