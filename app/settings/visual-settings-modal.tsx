/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace (Claude-4.7)
 *
 * Visual settings modal — thin wrapper around <VisualSettingsPanel />.
 * Same controls also rendered on /customize for the unified hub.
 */
"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Palette } from "lucide-react"
import VisualSettingsPanel from "@/components/customize/visual-settings-panel"

interface VisualSettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function VisualSettingsModal({ isOpen, onClose }: VisualSettingsModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Visual Settings
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <VisualSettingsPanel />
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
