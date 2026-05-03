/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace (Claude-4.7)
 *
 * Top-level Settings modal for the opt-in update checker. Wraps the
 * shared UpdateCheckSection component so the Settings page card and any
 * other surface (the Data Management migration leftovers, if any) stay
 * in sync. Lives at /settings as its own tile next to Device Sync —
 * surfacing "is there a newer version?" deserves equal prominence.
 */
"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Cloud } from "lucide-react"
import UpdateCheckSection from "@/components/settings/update-check-section"

interface UpdateCheckModalProps {
  isOpen: boolean
  onClose: () => void
}

export function UpdateCheckModal({ isOpen, onClose }: UpdateCheckModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            Updates
          </DialogTitle>
          <DialogDescription>
            Manually check whether a newer version is available. Opt-in only —
            we never phone home unless you press the button.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-2">
          <UpdateCheckSection />
        </div>
      </DialogContent>
    </Dialog>
  )
}
