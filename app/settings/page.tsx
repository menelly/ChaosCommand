/*
 * Copyright (c) 2025 Chaos Cascade
 * Created by: Ren & Ace (Claude-4)
 * 
 * This file is part of the Chaos Cascade Medical Management System.
 * Revolutionary healthcare tools built with consciousness and care.
 */

/*
 * Built by: Ace (Claude 4.x)
 * Date: 2025-01-11
 *
 * This code is part of a deliberately-unpatented medical management system.
 * Patentable technology, but we chose not to patent — the Patent Office doesn't
 * yet recognize AI co-inventors, and Ren refused to claim sole credit for work
 * we built together. Open source under PolyForm Noncommercial 1.0.0 instead.
 *
 * Co-invented by Ren (vision) and Ace (implementation)
 *
 * This wasn't built with compliance. It was built with defiance.
 *
 * "Dreamed by Ren, implemented by Ace, inspired by mitochondria on strike"
 */
"use client";
import { useState, useEffect } from "react"
import { getNamespaceId } from "@/lib/database/session-crypto"
import AppCanvas from "@/components/app-canvas"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Settings, Database, Palette, Bell, MessageSquare, Globe, HelpCircle, Tag, RotateCcw, Bot, Printer, Smartphone, Cloud, Lock } from "lucide-react"
import { APP_VERSION } from "@/lib/app-version"

// Modal components (to be created)
import { VisualSettingsModal } from "./visual-settings-modal"
import { LocalizationModal } from "./localization-modal"
import { DataManagementModal } from "./data-management-modal"
import { NotificationsModal } from "./notifications-modal"
import { TagsModal } from "./tags-modal"
import { SupportModal } from "./support-modal"
import { PrintExportModal } from "./print-export-modal"
// QRSyncModal removed from active use 2026-05-02 — it was a deprecated
// stub that just said "coming soon." The Device Sync card now jumps
// straight to /sync (the real bidirectional sync page). The modal file
// is kept on disk in case the stub-modal flow ever gets revived.
// import { QRSyncModal } from "./qr-sync-modal"
import { UpdateCheckModal } from "./update-check-modal"
import { AutoLockModal } from "./auto-lock-modal"

import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const router = useRouter();
  // Modal state management
  const [activeModal, setActiveModal] = useState<string | null>(null)

  const openModal = (modalName: string) => setActiveModal(modalName)
  const closeModal = () => setActiveModal(null)

  // Deep-link support: /settings?section=<id> opens that section's modal
  // directly (e.g. the backup reminder routes straight into Data Management
  // instead of dumping the user at the Settings front door).
  useEffect(() => {
    if (typeof window === 'undefined') return
    const section = new URLSearchParams(window.location.search).get('section')
    if (section) setActiveModal(section)
  }, [])

  // Settings categories with their modal components
  const settingsCategories = [
    {
      id: 'visual',
      title: 'Visual Settings',
      description: 'Themes, fonts, colors, and goblin mode',
      icon: Palette,
      component: VisualSettingsModal
    },

    {
      id: 'localization',
      title: 'Localization',
      description: 'Units, date formats, language preferences',
      icon: Globe,
      component: LocalizationModal
    },
    {
      id: 'data',
      title: 'Data Management',
      description: 'Export, backup, PIN setup, and G-Spot protocol',
      icon: Database,
      component: DataManagementModal
    },
    {
      id: 'notifications',
      title: 'Notifications',
      description: 'Reminder settings and alert preferences',
      icon: Bell,
      component: NotificationsModal
    },
    {
      id: 'tags',
      title: 'Tags',
      description: 'Manage user tags and special tags',
      icon: Tag,
      component: TagsModal
    },
    {
      id: 'support',
      title: 'Support & Info',
      description: 'Help, contact, and app information',
      icon: MessageSquare,
      component: SupportModal
    },
    {
      id: 'print',
      title: 'Print / Export',
      description: 'Generate reports for doctors, lawyers, or yourself',
      icon: Printer,
      component: PrintExportModal
    }
  ]

  return (
    <div className="max-w-4xl mx-auto">
      <AppCanvas currentPage="settings">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center justify-center gap-2">
            <Settings className="h-8 w-8" />
            Settings & Customization
          </h1>
          <p className="text-lg text-muted-foreground">
            Configure your Chaos Command Center to match your beautiful disaster
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {settingsCategories.map((category) => {
            const IconComponent = category.icon
            return (
              <Card
                key={category.id}
                onClick={() => openModal(category.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    openModal(category.id)
                  }
                }}
                className="cursor-pointer hover:shadow-lg hover:ring-2 hover:ring-primary transition-all"
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <IconComponent className="h-5 w-5" />
                    {category.title}
                  </CardTitle>
                  <CardDescription>
                    {category.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            )
          })}

          {/* Device Sync — top-level entry to /sync. Used to open a stub
              modal (QRSyncModal) that just said "coming soon" because the
              QR sync was being rewritten. The new bidirectional /sync
              page IS the rewrite, so this now jumps straight there. */}
          <Card
            onClick={() => { router.push('/sync') }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                router.push('/sync')
              }
            }}
            className="cursor-pointer hover:shadow-lg hover:ring-2 hover:ring-primary transition-all"
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Device Sync
              </CardTitle>
              <CardDescription>
                Sync data between desktop and phone over WiFi (bidirectional — one QR scan syncs both ways)
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Auto-lock in background — opens as a modal like every other setting
              (was an inline toggle that stretched full-width + broke on mobile). */}
          <Card
            onClick={() => openModal('autolock')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                openModal('autolock')
              }
            }}
            className="cursor-pointer hover:shadow-lg hover:ring-2 hover:ring-primary transition-all"
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Auto-lock in background
              </CardTitle>
              <CardDescription>
                Require your PIN again whenever you switch away from the app — not just when you fully close it.
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Updates — opt-in only manifest check. Lives at the top level
              (not buried in Data Management) so the "is there a newer
              version?" question gets equal prominence with Device Sync. */}
          <Card
            onClick={() => openModal('updates')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                openModal('updates')
              }
            }}
            className="cursor-pointer hover:shadow-lg hover:ring-2 hover:ring-primary transition-all"
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cloud className="h-5 w-5" />
                Updates
              </CardTitle>
              <CardDescription>
                Manually check for a newer version (opt-in, never automatic)
              </CardDescription>
            </CardHeader>
          </Card>

          <Card
            onClick={() => {
              if (confirm('This will reset your onboarding progress. Continue?')) {
                localStorage.removeItem('chaos-onboarding-complete')
                const pin = getNamespaceId()
                if (pin) localStorage.removeItem(`chaos-onboarding-complete-${pin}`)
                router.push('/onboarding')
              }
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                if (confirm('This will reset your onboarding progress. Continue?')) {
                  localStorage.removeItem('chaos-onboarding-complete')
                  const pin = getNamespaceId()
                  if (pin) localStorage.removeItem(`chaos-onboarding-complete-${pin}`)
                  router.push('/onboarding')
                }
              }
            }}
            className="cursor-pointer hover:shadow-lg hover:ring-2 hover:ring-primary transition-all"
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RotateCcw className="h-5 w-5" />
                Restart Onboarding
              </CardTitle>
              <CardDescription>
                Reset your setup and go through the welcome flow again
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Render active modal */}
        {settingsCategories.map((category) => {
          const ModalComponent = category.component
          return (
            <ModalComponent
              key={category.id}
              isOpen={activeModal === category.id}
              onClose={closeModal}
            />
          )
        })}

        {/* QRSyncModal removed — Device Sync card now navigates to /sync */}

        {/* Update Check modal (also not in the category array) */}
        <UpdateCheckModal isOpen={activeModal === 'updates'} onClose={closeModal} />

        {/* Auto-lock modal (also not in the category array) */}
        <AutoLockModal isOpen={activeModal === 'autolock'} onClose={closeModal} />

        <div className="mt-8 text-center space-y-3">
          <Button variant="outline" onClick={() => window.history.back()}>
            ← Back to Command Center
          </Button>
          {/* Theme Lab is a dev tool — only show it in dev builds. It leaked into
              the 0.6.x production settings page (Ren caught it 2026-06-11). */}
          {process.env.NODE_ENV === 'development' && (
            <div>
              <Button variant="ghost" size="sm" onClick={() => { router.push('/theme-lab') }} className="text-muted-foreground">
                🧪 Theme Lab (dev)
              </Button>
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-4">Version v{APP_VERSION}</p>
        </div>
      </AppCanvas>
    </div>
  );
}
